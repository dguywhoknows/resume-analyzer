/* Hash router for multi-page apps.
 * Every <div class="page" data-page="id" data-title="Title" data-icon="…"> becomes a page; the nav
 * ([data-nav]) is generated from them. Pages are shown with `display: contents`, so each page keeps the
 * layout it would have as a direct child of <body>. A standard Settings page is rendered automatically.
 *
 *   Router.on('library', () => renderLibrary());   // run whenever the page is opened
 *   Router.go('library');                          // navigate
 */
(function () {
  const pages = {};
  const hooks = {};
  let current = null;

  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(Kit.store.get('theme', 'system'));

  function buildNav() {
    const nav = document.querySelector('[data-nav]');
    if (!nav) return;
    nav.innerHTML = '';
    Object.values(pages).forEach((s) => {
      const a = document.createElement('a');
      a.href = '#/' + s.dataset.page;
      a.dataset.to = s.dataset.page;
      a.innerHTML = `<span class="ico" aria-hidden="true">${s.dataset.icon || ''}</span><span class="lbl">${s.dataset.title || s.dataset.page}</span>`;
      nav.append(a);
    });
  }

  function route() {
    let id = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
    if (!pages[id]) id = Object.keys(pages)[0];
    const changed = id !== current;
    current = id;
    Object.entries(pages).forEach(([k, s]) => s.classList.toggle('active', k === id));
    document.querySelectorAll('[data-nav] a').forEach((a) => {
      const on = a.dataset.to === id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const base = document.title.split(' · ').pop();
    document.title = (id === Object.keys(pages)[0] ? '' : (pages[id].dataset.title || id) + ' · ') + base;
    if (changed) {
      window.scrollTo(0, 0);
      (hooks[id] || []).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); // let maps/canvases re-measure
    }
  }

  /* ---------- standard Settings page ---------- */
  function fmtBytes(n) { return n > 1024 * 1024 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B'; }
  function renderSettings(sec) {
    const { h, store, toast, download } = Kit;
    const repo = document.querySelector('meta[name="app-repo"]')?.content;
    const version = document.querySelector('meta[name="app-version"]')?.content || '1.0.0';
    const main = h('main', { class: 'settings stack' });
    const aiState = h('div', { class: 'small muted' });
    const syncAI = () => { const m = window.AI ? AI.mode() : 'demo'; aiState.textContent = (m === 'demo' ? 'Demo mode: AI features use built-in sample output.' : `Live AI via ${AI.providers[m].name}.`) + (window.AI && AI.instructions() ? ' Your standing instructions are on.' : ''); };
    const account = window.Auth && Auth.enabled ? h('section', { class: 'card stack' }, h('h3', {}, 'Account'), h('div', { class: 'small' }, Auth.user ? `Signed in as ${Auth.user.email}` : 'Not signed in'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => Auth.signOut() }, 'Sign out')), h('p', { class: 'small muted' }, 'Your account works across every app on this site. Data you create is stored in this browser.')) : null;
    window.addEventListener('ai:change', syncAI);
    const theme = h('select', { 'aria-label': 'Theme', onchange: (e) => { store.set('theme', e.target.value); applyTheme(e.target.value); } },
      ['system', 'light', 'dark'].map((t) => h('option', { value: t, selected: store.get('theme', 'system') === t }, t[0].toUpperCase() + t.slice(1))));
    const usage = h('div', { class: 'small muted' });
    const syncUsage = () => {
      const keys = store.keys().filter((k) => k !== 'theme');
      const bytes = keys.reduce((a, k) => a + (localStorage.getItem(store.ns + k) || '').length, 0);
      usage.textContent = keys.length ? `${keys.length} saved item${keys.length > 1 ? 's' : ''} · ${fmtBytes(bytes)} in this browser` : 'Nothing saved yet.';
    };
    const file = h('input', { type: 'file', accept: '.json', hidden: true, onchange: async (e) => {
      try {
        const data = JSON.parse(await e.target.files[0].text());
        if (!data || data.app !== store.ns.slice(0, -1) || typeof data.items !== 'object') throw new Error('This file is not a backup of this app.');
        Object.entries(data.items).forEach(([k, v]) => store.set(k, v));
        toast('Backup restored. Reloading…');
        setTimeout(() => location.reload(), 800);
      } catch (err) { toast(err.message, 'err'); }
      e.target.value = '';
    } });
    main.append(
      h('h2', {}, 'Settings'),
      ...(account ? [account] : []),
      h('section', { class: 'card stack' }, h('h3', {}, 'AI'), aiState, h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => AI.openSettings() }, 'Model provider…'), window.Copilot ? h('button', { class: 'btn', onclick: () => { Copilot.open(); document.querySelector('.copilot [data-t=prefs]')?.click(); } }, 'Standing instructions…') : null),
        h('p', { class: 'small muted' }, 'Your own API keys, if you add any, are stored only in this browser and sent only to the provider you choose.')),
      h('section', { class: 'card stack' }, h('h3', {}, 'Appearance'), h('label', {}, 'Theme', theme)),
      h('section', { class: 'card stack' }, h('h3', {}, 'Your data'), usage,
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: () => { const items = store.dump(); delete items.theme; download(`${store.ns.slice(0, -1)}-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: store.ns.slice(0, -1), version, exported: new Date().toISOString(), items }, null, 2), 'application/json'); } }, 'Export backup'),
          h('label', { class: 'btn', style: 'color:var(--text)' }, 'Import backup', file),
          h('button', { class: 'btn danger', onclick: () => { if (confirm('Delete all data this app has saved in this browser? This cannot be undone.')) { store.clear(); toast('All data deleted. Reloading…'); setTimeout(() => location.reload(), 800); } } }, 'Delete all data'))),
      h('section', { class: 'card stack' }, h('h3', {}, 'About'),
        h('div', { class: 'small' }, `Version ${version}`),
        h('div', { class: 'row small' }, repo ? h('a', { href: repo, target: '_blank', rel: 'noopener' }, 'Source code') : null, h('a', { href: 'tests/' }, 'Run the test suite'), repo ? h('a', { href: repo + '/issues', target: '_blank', rel: 'noopener' }, 'Report an issue') : null)));
    sec.append(main);
    syncAI(); syncUsage();
    Router.on('settings', () => { syncAI(); syncUsage(); });
  }

  function init() {
    document.querySelectorAll('.page[data-page]').forEach((s) => { pages[s.dataset.page] = s; });
    const st = pages.settings;
    if (st && !st.children.length) renderSettings(st);
    buildNav();
    window.addEventListener('hashchange', route);
    route();
  }

  window.Router = {
    on(id, fn) { (hooks[id] ||= []).push(fn); if (id === current) fn(); },
    go(id) { if (location.hash === '#/' + id) route(); else location.hash = '#/' + id; },
    get current() { return current; },
    init,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
