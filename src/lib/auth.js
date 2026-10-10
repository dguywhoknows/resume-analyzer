/*
 * auth.js — accounts via Supabase Auth.
 *
 * Load right after config.js in <head>. On the app page it redirects to login.html when nobody is signed in
 * (unless accounts are not configured yet, or the page is embedded as a demo with ?embed=1).
 *
 *   Auth.enabled         -> true when a Supabase project is configured
 *   Auth.user            -> { id, email } or null
 *   Auth.token()         -> current access token (string) or null
 *   await Auth.client()  -> the supabase-js client (loaded on demand)
 *   await Auth.signOut()
 *   window 'auth:change' event fires when the user signs in or out
 */
(function () {
  const C = window.APP_CONFIG || {};
  const enabled = !!(C.supabaseUrl && C.supabaseAnonKey);
  const embed = /[?&]embed=1\b/.test(location.search);
  const ref = enabled ? (C.supabaseUrl.match(/https?:\/\/([^.]+)\./) || [])[1] : null;
  const KEY = ref ? `sb-${ref}-auth-token` : null;

  function stored() {
    if (!KEY) return null;
    try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.access_token ? s : null; } catch { return null; }
  }
  let session = stored();

  const isApp = document.documentElement.dataset.gate === 'app';
  if (enabled && isApp && !embed && !session) {
    location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.hash));
  }

  let clientPromise = null;
  function client() {
    if (!enabled) return Promise.reject(new Error('Accounts are not configured.'));
    if (!clientPromise) {
      clientPromise = new Promise((resolve, reject) => {
        const done = () => {
          const c = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: KEY } });
          c.auth.onAuthStateChange((_e, s) => { session = s; Auth.user = s ? { id: s.user.id, email: s.user.email } : null; window.dispatchEvent(new Event('auth:change')); });
          resolve(c);
        };
        if (window.supabase && window.supabase.createClient) return done();
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.onload = done;
        s.onerror = () => reject(new Error('Could not load the sign-in library.'));
        document.head.appendChild(s);
      });
    }
    return clientPromise;
  }

  function chip() {
    const box = document.querySelector('.top-actions');
    if (!box || box.querySelector('.account') || !enabled || embed) return;
    const el = document.createElement('div');
    el.className = 'account';
    el.innerHTML = `<button class="btn ghost sm" type="button" aria-haspopup="true"></button><div class="account-menu hidden"><div class="small muted"></div><a class="btn ghost sm" href="index.html">Home page</a><button class="btn sm" type="button" data-out>Sign out</button></div>`;
    const btn = el.querySelector('button'), menu = el.querySelector('.account-menu');
    const sync = () => { btn.textContent = Auth.user ? Auth.user.email.split('@')[0] : 'Account'; menu.querySelector('.small').textContent = Auth.user ? Auth.user.email : ''; };
    btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); };
    document.addEventListener('click', () => menu.classList.add('hidden'));
    menu.querySelector('[data-out]').onclick = () => Auth.signOut();
    window.addEventListener('auth:change', sync);
    sync();
    box.prepend(el);
  }

  const Auth = {
    enabled, embed,
    user: session ? { id: session.user && session.user.id, email: session.user && session.user.email } : null,
    token: () => (session && session.access_token) || null,
    client,
    async signOut() {
      try { const c = await client(); await c.auth.signOut(); } catch {}
      if (KEY) localStorage.removeItem(KEY);
      location.href = 'index.html';
    },
  };
  window.Auth = Auth;

  if (enabled && session) client().then((c) => c.auth.getSession()).then(({ data }) => {
    session = data.session;
    if (!session && isApp && !embed) location.replace('login.html');
  }).catch(() => {});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', chip); else chip();
})();
