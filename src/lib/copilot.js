/*
 * copilot.js — "tell the app what to do". A command box that turns a plain-language request into calls to the
 * app's own functions, plus standing instructions that shape every AI feature in the app.
 *
 *   Copilot.register({
 *     actions: [{ name: 'add_stop', description: 'Add a place to a day', params: { name: 'place name', day: 'day number (1-based)' },
 *                 run: async ({ name, day }) => 'Added X to day 2' }],
 *     context: () => 'Trip to Lisbon, 2 days, 13 stops …',   // short live state the model can see
 *     examples: ['Move the museum to day 2 and keep each day under 6 stops'],
 *   });
 *
 * Actions marked query: true return information; their results are sent back to the model for a final answer.
 * Open with the floating button or Ctrl/Cmd+K.
 */
(function () {
  const { h, esc, toast } = Kit;
  const C = window.APP_CONFIG || {};
  let spec = { actions: [], context: () => '', examples: [] };
  let open = false, history = [];

  const pages = () => [...document.querySelectorAll('.page[data-page]')].map((p) => ({ id: p.dataset.page, title: p.dataset.title || p.dataset.page }));
  const builtins = () => [
    { name: 'open_page', description: 'Open one of the app pages', params: { page: 'page id, one of: ' + pages().map((p) => p.id).join(', ') }, run: ({ page }) => { const p = pages().find((x) => x.id === page || x.title.toLowerCase() === String(page).toLowerCase()); if (!p) throw new Error('No page "' + page + '"'); Router.go(p.id); return 'Opened ' + p.title; } },
    { name: 'set_preferences', description: 'Save standing instructions that every AI feature in this app will follow (tone, length, diet, level, units, focus…). Replaces the previous preferences.', params: { text: 'the preferences, written as short instructions' }, run: ({ text }) => { AI.setInstructions(text); renderPrefs(); return 'Saved your preferences'; } },
  ];
  const allActions = () => builtins().concat(spec.actions);
  const describe = () => allActions().map((a) => ({ name: a.name, description: a.description, params: a.params || {}, ...(a.query ? { returns: 'information' } : {}) }));

  async function plan(prompt) {
    const sys = `You operate the web app "${C.name || document.title}" on the user's behalf by calling its functions.
Available actions (JSON): ${JSON.stringify(describe())}
Current page: ${Router.current}. Current state: ${String(spec.context() || 'n/a').slice(0, 6000)}
${AI.instructions() ? 'User preferences: ' + AI.instructions() + '\n' : ''}Return JSON {"reply":"one or two friendly sentences saying what you are doing, or a question if you need more information","actions":[{"name":"","args":{}}]}.
Rules: use only the listed actions and their arguments; chain several actions when the request needs it; never invent personal data the user did not give; if nothing fits, explain what the app can do and return no actions.`;
    const recent = history.slice(-4).flatMap((x) => [{ role: 'user', content: x.prompt }, { role: 'assistant', content: JSON.stringify({ reply: x.reply }) }]);
    return AI.chat([{ role: 'system', content: sys }, ...recent, { role: 'user', content: prompt }], { json: true, temperature: 0.2, maxTokens: 1500, raw: true, demo: () => demoPlan(prompt) });
  }
  function demoPlan(prompt) {
    const t = prompt.toLowerCase(), p = pages().find((x) => t.includes(x.title.toLowerCase()) || t.includes(x.id));
    return { reply: `Commands run on the live AI${C.supabaseUrl ? ', which is available after you sign in' : ''}. In demo mode I can only open pages${p ? ', so here is ' + p.title : ''}.`, actions: p ? [{ name: 'open_page', args: { page: p.id } }] : [] };
  }
  async function exec(calls, log = []) {
    const results = [];
    for (const call of calls.slice(0, 12)) {
      const a = allActions().find((x) => x.name === call.name);
      if (!a) { log.push({ ok: false, text: 'Unknown action ' + call.name }); continue; }
      try {
        const res = await a.run(call.args || {});
        const text = typeof res === 'string' ? res : res == null ? 'Done' : JSON.stringify(res).slice(0, 2000);
        log.push({ ok: true, text: a.query ? `${a.name}: looked it up` : text });
        if (a.query) results.push({ action: a.name, args: call.args, result: text });
      } catch (e) { log.push({ ok: false, text: `${a.name}: ${e.message}` }); }
      renderLog();
    }
    results.log = log;
    return results;
  }
  async function run(prompt) {
    const entry = { prompt, reply: '', log: [], pending: true };
    history.push(entry); renderLog();
    try {
      const out = await plan(prompt);
      entry.reply = out.reply || '';
      const results = await exec(out.actions || [], entry.log);
      if (results.length) {
        const ans = await AI.chat([{ role: 'system', content: 'Answer the user\'s request in at most 4 sentences using only these results from the app. Plain text.' }, { role: 'user', content: `Request: ${prompt}\nResults: ${JSON.stringify(results).slice(0, 8000)}` }], { temperature: 0.2, maxTokens: 600, raw: true, demo: () => results.map((r) => r.result).join(' ') });
        entry.reply = ans;
      }
    } catch (e) { entry.reply = e.message; entry.error = true; }
    entry.pending = false;
    renderLog();
  }

  /* ---------- UI ---------- */
  let panel, logEl, input, prefsEl;
  function build() {
    if (panel) return;
    const fab = h('button', { class: 'copilot-fab', type: 'button', title: 'Tell the app what to do (Ctrl+K)', onclick: () => toggle(true) }, h('span', { class: 'copilot-dot' }), 'Ask AI');
    input = h('textarea', { rows: 2, placeholder: 'Tell it what you want, in your own words', 'aria-label': 'Request', onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } } });
    logEl = h('div', { class: 'copilot-log' });
    prefsEl = h('textarea', { rows: 5, 'aria-label': 'Standing instructions', placeholder: 'e.g. Keep answers short. I am a beginner. Use metric units.' });
    const tabs = h('div', { class: 'tabs' }, h('button', { class: 'on', 'data-t': 'cmd', onclick: () => tab('cmd') }, 'Command'), h('button', { 'data-t': 'prefs', onclick: () => tab('prefs') }, 'Instructions'));
    panel = h('section', { class: 'copilot hidden', role: 'dialog', 'aria-label': 'AI command box' },
      h('div', { class: 'row between' }, h('b', {}, 'Tell ' + (C.name || 'the app') + ' what to do'), h('button', { class: 'btn ghost sm', 'aria-label': 'Close', onclick: () => toggle(false) }, '×')),
      tabs,
      h('div', { 'data-pane': 'cmd', class: 'stack' }, logEl, h('div', { class: 'copilot-ex' }, (spec.examples || []).map((x) => h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { input.value = x; input.focus(); } }, x))), h('div', { class: 'row' }, input, h('button', { class: 'btn primary', type: 'button', onclick: submit }, 'Run'))),
      h('div', { 'data-pane': 'prefs', class: 'stack hidden' }, h('p', { class: 'small muted', style: 'margin:0' }, 'Standing instructions apply to every AI feature in this app, every time.'), prefsEl,
        h('div', { class: 'row' }, h('button', { class: 'btn primary sm', type: 'button', onclick: () => { AI.setInstructions(prefsEl.value); toast(prefsEl.value.trim() ? 'Instructions saved' : 'Instructions cleared'); } }, 'Save'), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { prefsEl.value = ''; AI.setInstructions(''); } }, 'Clear'))));
    document.body.append(fab, panel);
    renderPrefs(); renderLog();
  }
  function tab(t) { panel.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); panel.querySelectorAll('[data-pane]').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== t)); }
  function renderPrefs() { if (prefsEl) prefsEl.value = AI.instructions(); }
  function renderLog() {
    if (!logEl) return;
    logEl.innerHTML = history.length ? '' : `<p class="small muted">Describe what you want and the AI will use this app's own tools to do it.${AI.mode() === 'demo' ? ' Live AI is needed for most commands.' : ''}</p>`;
    history.slice(-6).forEach((x) => {
      logEl.append(h('div', { class: 'copilot-me' }, x.prompt));
      const r = h('div', { class: 'copilot-ai' + (x.error ? ' err' : '') }, x.pending && !x.reply ? h('span', { class: 'spinner' }) : x.reply);
      x.log.forEach((l) => r.append(h('div', { class: 'copilot-step ' + (l.ok ? 'ok' : 'bad') }, l.text)));
      logEl.append(r);
    });
    logEl.scrollTop = 1e9;
  }
  function submit() { const v = input.value.trim(); if (!v) return; input.value = ''; run(v); }
  function toggle(v) { build(); open = v == null ? !open : v; panel.classList.toggle('hidden', !open); if (open) setTimeout(() => input.focus(), 30); }
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); } if (e.key === 'Escape' && open) toggle(false); });

  window.Copilot = {
    register(s) { spec = Object.assign({ actions: [], context: () => '', examples: (C.prompts || []).map((p) => p.say || p) }, s); if (panel) { panel.remove(); document.querySelector('.copilot-fab')?.remove(); panel = null; } build(); },
    run, exec, actions: () => describe(), open: () => toggle(true),
  };
  window.addEventListener('ai:change', renderLog);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
