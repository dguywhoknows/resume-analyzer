/*
 * ai.js — tiny browser AI client for this app.
 *
 * Providers (all free, bring-your-own-key, key stays in this browser's localStorage):
 *   - Groq        https://console.groq.com/keys
 *   - OpenRouter  https://openrouter.ai/keys   (free ":free" models)
 *   - Demo        no key; plays back sample output supplied by each app
 *
 * API:
 *   await AI.chat(messages, { json, temperature, maxTokens, onToken, demo })
 *     -> string, or parsed object when json:true
 *   AI.mode()          -> 'demo' | 'groq' | 'openrouter'
 *   AI.openSettings()
 *   window 'ai:change' event fires when settings change
 */
(function () {
  // Settings are namespaced per app, so this app never reads keys saved by any other site on the same origin.
  const LS = 'aiKit.v1:' + (location.pathname.split('/').filter(Boolean)[0] || 'app');
  const PROVIDERS = {
    groq: {
      name: 'Groq',
      base: 'https://api.groq.com/openai/v1',
      keyUrl: 'https://console.groq.com/keys',
      prefer: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'qwen/qwen3-32b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
    },
    openrouter: {
      name: 'OpenRouter',
      base: 'https://openrouter.ai/api/v1',
      keyUrl: 'https://openrouter.ai/keys',
      prefer: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-4-26b-a4b-it:free'],
    },
  };
  const SKIP_MODEL = /whisper|guard|tts|embed|orpheus|compound|safety|playai|distil/i;

  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch {} }
  const state = Object.assign({ provider: 'groq', keys: {}, models: {} }, load());

  const mode = () => (state.provider in PROVIDERS && state.keys[state.provider] ? state.provider : 'demo');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function pickModel(p) {
    if (state.models[p]) return state.models[p];
    const cfg = PROVIDERS[p];
    let ids = [];
    try {
      const r = await fetch(cfg.base + '/models', { headers: { Authorization: 'Bearer ' + state.keys[p] } });
      if (r.ok) ids = ((await r.json()).data || []).map((m) => m.id);
    } catch {}
    let pick = cfg.prefer.find((m) => ids.includes(m));
    if (!pick && p === 'openrouter') pick = ids.find((m) => m.endsWith(':free') && !SKIP_MODEL.test(m));
    if (!pick) pick = ids.find((m) => !SKIP_MODEL.test(m)) || cfg.prefer[0];
    state.models[p] = pick;
    save();
    return pick;
  }

  function parseJSON(text) {
    if (typeof text !== 'string') return text;
    let t = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) t = fence[1].trim();
    try { return JSON.parse(t); } catch {}
    const starts = [t.indexOf('{'), t.indexOf('[')].filter((i) => i >= 0);
    if (!starts.length) throw new Error('AI did not return JSON');
    const s = Math.min(...starts);
    const close = t[s] === '{' ? '}' : ']';
    const e = t.lastIndexOf(close);
    return JSON.parse(t.slice(s, e + 1));
  }

  async function demoChat(messages, opts) {
    if (opts.demo === undefined) {
      const err = new Error('This action needs a model provider. Open Settings to connect one.');
      err.code = 'NO_KEY';
      openSettings();
      throw err;
    }
    let out = typeof opts.demo === 'function' ? await opts.demo(messages) : opts.demo;
    if (opts.json) {
      await sleep(500 + Math.random() * 700);
      return typeof out === 'string' ? parseJSON(out) : JSON.parse(JSON.stringify(out));
    }
    out = String(out);
    if (opts.onToken) {
      const parts = out.match(/\S+\s*/g) || [];
      let acc = '';
      for (const w of parts) { acc += w; opts.onToken(w, acc); await sleep(18 + Math.random() * 30); }
    } else await sleep(500 + Math.random() * 700);
    return out;
  }

  async function liveChat(messages, opts, p, attempt = 0) {
    const cfg = PROVIDERS[p];
    const model = await pickModel(p);
    const msgs = messages.map((m) => ({ ...m }));
    if (opts.json && !msgs.some((m) => /json/i.test(m.content))) {
      msgs.unshift({ role: 'system', content: 'Respond with valid JSON only.' });
    }
    const stream = !!opts.onToken;
    const body = {
      model,
      messages: msgs,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream,
    };
    if (opts.json && !opts.noFormat) body.response_format = { type: 'json_object' };
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.keys[p] };
    if (p === 'openrouter') { headers['HTTP-Referer'] = location.origin; headers['X-Title'] = document.title; }

    let r;
    try {
      r = await fetch(cfg.base + '/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
    } catch (e) {
      if (attempt < 2) { await sleep(1200 * (attempt + 1)); return liveChat(messages, opts, p, attempt + 1); }
      throw new Error(cfg.name + ' unreachable (network/VPN/region block?). Try the other provider in AI settings.');
    }
    if (!r.ok) {
      const txt = await r.text();
      if ((r.status === 429 || r.status >= 500) && attempt < 3) {
        const wait = Number(r.headers.get('retry-after')) * 1000 || 1500 * 2 ** attempt;
        await sleep(Math.min(wait, 15000));
        return liveChat(messages, opts, p, attempt + 1);
      }
      if (r.status === 400 && body.response_format && /response_format|json_object|json mode/i.test(txt) && attempt < 2) {
        return liveChat(messages, { ...opts, noFormat: true }, p, attempt + 1);
      }
      if ((r.status === 404 || /model/i.test(txt)) && attempt < 1) {
        delete state.models[p]; save();
        return liveChat(messages, opts, p, attempt + 1);
      }
      if (r.status === 401) throw new Error(cfg.name + ' rejected the API key. Check it in AI settings.');
      let msg = txt;
      try { msg = JSON.parse(txt).error.message; } catch {}
      throw new Error(cfg.name + ' error ' + r.status + ': ' + String(msg).slice(0, 200));
    }

    let text = '';
    if (stream) {
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const data = l.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const tok = JSON.parse(data).choices?.[0]?.delta?.content || '';
            if (tok) { text += tok; opts.onToken(tok, text); }
          } catch {}
        }
      }
    } else {
      const d = await r.json();
      text = d.choices?.[0]?.message?.content || '';
    }
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!opts.json) return text;
    try { return parseJSON(text); } catch (e) {
      if (attempt < 2) return liveChat(messages, { ...opts, temperature: 0.3 }, p, attempt + 1);
      throw e;
    }
  }

  async function chat(messages, opts = {}) {
    if (typeof messages === 'string') messages = [{ role: 'user', content: messages }];
    if (opts.system) messages = [{ role: 'system', content: opts.system }, ...messages];
    const m = mode();
    setBusy(1);
    try {
      return m === 'demo' ? await demoChat(messages, opts) : await liveChat(messages, opts, m);
    } finally { setBusy(-1); }
  }

  /* ---------- UI: badge + settings modal ---------- */
  let busy = 0;
  function setBusy(d) {
    busy += d;
    document.querySelectorAll('.ai-badge').forEach((b) => b.classList.toggle('busy', busy > 0));
  }

  function renderBadges() {
    const m = mode();
    document.querySelectorAll('[data-ai-badge]').forEach((slot) => {
      slot.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'ai-badge ' + (m === 'demo' ? 'demo' : 'live');
      b.type = 'button';
      b.title = 'Model provider settings';
      b.innerHTML = '<span class="dot"></span>' + (m === 'demo' ? 'Demo mode' : PROVIDERS[m].name);
      b.onclick = openSettings;
      slot.appendChild(b);
    });
    let banner = document.querySelector('.ai-demo-banner');
    if (m === 'demo' && !sessionStorage.getItem('aiKit.hideBanner')) {
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'ai-demo-banner';
        banner.innerHTML = '<span><b>Demo mode.</b> Model responses are sample output. Connect a provider to run the model on your own input.</span><span class="row"><button class="btn sm" data-k="set">Connect provider</button><button class="btn ghost sm" data-k="x" aria-label="Dismiss">✕</button></span>';
        banner.querySelector('[data-k=set]').onclick = openSettings;
        banner.querySelector('[data-k=x]').onclick = () => { try { sessionStorage.setItem('aiKit.hideBanner', '1'); } catch {} banner.remove(); };
        const top = document.querySelector('.topbar');
        top ? top.after(banner) : document.body.prepend(banner);
      }
    } else if (banner) banner.remove();
  }

  function openSettings() {
    if (document.querySelector('.ai-modal')) return;
    const wrap = document.createElement('div');
    wrap.className = 'ai-modal';
    const p0 = state.provider in PROVIDERS ? state.provider : 'groq';
    wrap.innerHTML = `
      <div class="ai-modal-card" role="dialog" aria-modal="true" aria-label="AI settings">
        <h2>Model provider</h2>
        <p class="muted">Keys are free and stay in <b>this browser only</b> (localStorage). They are sent directly to the provider, never anywhere else.</p>
        <label>Provider
          <select class="input" data-f="provider">
            <option value="groq">Groq (fast, free tier)</option>
            <option value="openrouter">OpenRouter (free models)</option>
            <option value="demo">Demo mode (no key, sample output)</option>
          </select>
        </label>
        <label data-row="key">API key <a data-f="keylink" target="_blank" rel="noopener">get a free key ↗</a>
          <input class="input" data-f="key" type="password" autocomplete="off" spellcheck="false" placeholder="paste key">
        </label>
        <label data-row="model">Model <span class="muted">(blank = auto-pick)</span>
          <input class="input" data-f="model" spellcheck="false" placeholder="auto">
        </label>
        <div class="ai-modal-status muted" data-f="status"></div>
        <div class="row end">
          <button class="btn ghost" data-f="test">Test</button>
          <button class="btn ghost" data-f="cancel">Cancel</button>
          <button class="btn primary" data-f="save">Save</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const f = (k) => wrap.querySelector(`[data-f=${k}]`);
    const sel = f('provider');
    sel.value = state.provider === 'demo' ? 'demo' : p0;
    const sync = () => {
      const p = sel.value;
      const live = p in PROVIDERS;
      wrap.querySelector('[data-row=key]').style.display = live ? '' : 'none';
      wrap.querySelector('[data-row=model]').style.display = live ? '' : 'none';
      if (live) {
        f('keylink').href = PROVIDERS[p].keyUrl;
        f('key').value = state.keys[p] || '';
        f('model').value = state.models[p] || '';
      }
    };
    sel.onchange = sync; sync();
    const close = () => wrap.remove();
    const apply = () => {
      const p = sel.value;
      state.provider = p;
      if (p in PROVIDERS) {
        const k = f('key').value.trim();
        if (k !== (state.keys[p] || '')) delete state.models[p];
        if (k) state.keys[p] = k; else delete state.keys[p];
        const mdl = f('model').value.trim();
        if (mdl) state.models[p] = mdl; else if (f('model').value === '') delete state.models[p];
      }
      save();
    };
    f('cancel').onclick = close;
    wrap.onclick = (e) => { if (e.target === wrap) close(); };
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    f('save').onclick = () => { apply(); close(); renderBadges(); window.dispatchEvent(new Event('ai:change')); };
    f('test').onclick = async () => {
      apply(); renderBadges();
      const st = f('status');
      if (mode() === 'demo') { st.textContent = sel.value === 'demo' ? 'Demo mode needs no test.' : 'Paste a key first.'; return; }
      st.textContent = 'Testing…';
      try {
        const out = await chat([{ role: 'user', content: 'Reply with exactly: OK' }], { maxTokens: 10, temperature: 0 });
        st.textContent = '✓ Working — model ' + state.models[mode()] + ' replied "' + out.slice(0, 30) + '"';
        f('model').value = state.models[mode()] || '';
      } catch (e) { st.textContent = '✗ ' + e.message; }
    };
    setTimeout(() => (mode() === 'demo' && sel.value !== 'demo' ? f('key') : sel).focus(), 30);
  }

  window.AI = { chat, mode, openSettings, parseJSON, providers: PROVIDERS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderBadges);
  else renderBadges();
  window.addEventListener('storage', (e) => { if (e.key === LS) { Object.assign(state, load()); renderBadges(); } });
})();
