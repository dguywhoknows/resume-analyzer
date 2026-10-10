/* dom.js — DOM helpers, toasts, downloads, namespaced storage and a tiny markdown renderer. */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function toast(msg, kind = '') {
    let box = $('.toasts');
    if (!box) { box = h('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
    const t = h('div', { class: 'toast ' + kind }, msg);
    box.append(t);
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4300);
  }

  /* Run an async action with a button spinner + error toast. */
  async function busy(btn, fn) {
    if (btn) { btn.disabled = true; btn.classList.add('loading'); }
    try { return await fn(); }
    catch (e) { console.error(e); toast(e.message || String(e), 'err'); }
    finally { if (btn) { btn.disabled = false; btn.classList.remove('loading'); } }
  }

  function download(name, content, type = 'text/plain') {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* localStorage wrapper namespaced to this app (first URL path segment), so apps on the same origin never collide. */
  const NS = (location.pathname.split('/').filter(Boolean)[0] || 'app') + ':';
  const store = {
    ns: NS,
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch {} },
    remove(k) { try { localStorage.removeItem(NS + k); } catch {} },
    keys() { try { return Object.keys(localStorage).filter((k) => k.startsWith(NS)).map((k) => k.slice(NS.length)); } catch { return []; } },
    dump() { const o = {}; store.keys().forEach((k) => { o[k] = store.get(k); }); return o; },
    clear() { store.keys().forEach((k) => store.remove(k)); },
  };

  /* Minimal, safe markdown -> HTML (headings, bold, italics, code, lists, links). */
  function md(src) {
    const lines = esc(src).split('\n');
    let out = '', list = null, code = false;
    const inline = (s) => s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
    for (const l of lines) {
      if (l.trim().startsWith('```')) { closeList(); out += code ? '</code></pre>' : '<pre><code>'; code = !code; continue; }
      if (code) { out += l + '\n'; continue; }
      let m;
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { closeList(); const n = Math.min(m[1].length + 2, 6); out += `<h${n}>${inline(m[2])}</h${n}>`; }
      else if ((m = l.match(/^\s*[-*]\s+(.*)/))) { if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
      else if (!l.trim()) closeList();
      else { closeList(); out += `<p>${inline(l)}</p>`; }
    }
    closeList();
    if (code) out += '</code></pre>';
    return out;
  }

  /* Seeded PRNG (mulberry32) for reproducible demos/simulations. */
  function rng(seed = 1) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.Kit = { $, $$, h, esc, toast, busy, download, store, md, rng };
})();
