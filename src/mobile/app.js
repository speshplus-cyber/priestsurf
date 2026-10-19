'use strict';
// PriestSurf phone app: talks to the PriestSurf desktop browser over the local network.
(function () {
  const $ = s => document.querySelector(s);
  const KEY = 'priestsurf.token';

  // ---- pairing: the QR code opens  http://<computer>:47823/#pair=<token>
  const store = {
    get() { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} }
  };
  let token = '';
  function readPairing() {
    const m = location.hash.match(/pair=([\w-]+)/);
    if (m) { store.set(m[1]); history.replaceState(null, '', location.pathname); }
    token = store.get();
  }
  readPairing();
  window.addEventListener('hashchange', () => { readPairing(); refresh(); });

  let state = null;
  let view = 'home';
  let online = false;

  // ---- api
  async function api(path, body) {
    const res = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { token = ''; store.clear(); render(); throw new Error(data.error || 'Not paired'); }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---- helpers
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const color = host => { let h = 0; for (const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 60% 50%)`; };
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }
  const openHere = url => window.open(url, '_blank', 'noopener,noreferrer');
  async function openOnPc(url) {
    try { await api('/api/open', { url }); toast('Opened on your computer'); } catch (e) { toast(e.message); }
  }

  // ---- search
  const q = $('#q');
  function resolved() {
    const text = q.value.trim();
    if (!text) return null;
    return Smart.resolve(text, { searchEngine: state ? state.searchEngine : 'duckduckgo' }).url;
  }
  q.addEventListener('input', () => {
    const s = Smart.suggest(q.value, { settings: { searchEngine: state ? state.searchEngine : 'duckduckgo' }, tabs: [], bookmarks: [], activeId: null });
    const calc = s.find(x => x.kind === 'calc');
    $('#instant').hidden = !calc;
    if (calc) $('#instant').textContent = calc.label;
  });
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); const u = resolved(); if (u) openHere(u); q.blur(); });
  $('#openHere').onclick = () => { const u = resolved(); if (u) openHere(u); else q.focus(); };
  $('#openPc').onclick = () => { const u = resolved(); if (u) { openOnPc(u); q.value = ''; $('#instant').hidden = true; } else q.focus(); };

  // ---- controls
  $('#torSw').onchange = async e => {
    const on = e.target.checked;
    $('#torText').textContent = on ? 'Connecting…' : 'Turning off…';
    try { const r = await api('/api/tor', { on }); state.tor = r.tor; renderHome(); toast(on ? (r.tor.running ? 'Computer is now using Tor' : 'Tor is not running on the computer') : 'Tor turned off'); }
    catch (err) { toast(err.message); e.target.checked = !on; }
  };
  $('#newIdBtn').onclick = async () => {
    if (!confirm('Close all tabs on your computer and erase cookies, cache and history?')) return;
    try { await api('/api/new-identity', {}); toast('New identity: everything erased'); refresh(); } catch (e) { toast(e.message); }
  };
  $('#clearInbox').onclick = async () => { try { await api('/api/inbox/clear', {}); refresh(); } catch (e) { toast(e.message); } };
  $('#addBm').addEventListener('submit', async e => {
    e.preventDefault();
    let url = $('#bmUrl').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { await api('/api/bookmark', { url, title: hostOf(url) }); $('#bmUrl').value = ''; toast('Saved to your bookmarks'); refresh(); } catch (err) { toast(err.message); }
  });

  // ---- action sheet
  function sheet(title, url, actions) {
    $('#sheetTitle').textContent = title || hostOf(url);
    $('#sheetUrl').textContent = url;
    const box = $('#sheetActions'); box.textContent = '';
    for (const [label, fn, cls] of actions) {
      const b = document.createElement('button');
      b.className = 'btn block ' + (cls || ''); b.type = 'button'; b.textContent = label;
      b.onclick = () => { $('#sheet').hidden = true; fn(); };
      box.appendChild(b);
    }
    $('#sheet').hidden = false;
  }
  $('#sheetCancel').onclick = () => { $('#sheet').hidden = true; };
  $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') $('#sheet').hidden = true; });

  // ---- rendering
  function itemHtml(x, i, extra = '') {
    const host = hostOf(x.url);
    return `<button class="item ${extra}" data-i="${i}" type="button"><span class="av" style="background:${color(host)}">${esc((host[0] || '•').toUpperCase())}</span><span class="t"><div>${esc(x.title || host)}</div><div class="u">${esc(host)}</div></span></button>`;
  }
  // Rebuild a list only when its data changed, so taps aren't lost to a refresh.
  const lastRender = {};
  function changed(key, data) {
    const sig = JSON.stringify(data);
    if (lastRender[key] === sig) return false;
    lastRender[key] = sig;
    return true;
  }
  function bindList(el, items, onTap) {
    el.querySelectorAll('.item').forEach(b => { b.onclick = () => onTap(items[+b.dataset.i]); });
  }
  function renderHome() {
    $('#blocked').textContent = (state.blocked || 0).toLocaleString();
    $('#tabCount').textContent = state.tabs.length;
    const t = state.tor || {};
    $('#torSw').checked = !!t.enabled;
    $('#torText').textContent = !t.enabled ? 'Off: the computer connects directly' : t.running ? 'On: computer traffic is anonymized' : 'Waiting: Tor isn\'t running on the computer';
  }
  function renderTabs() {
    const el = $('#tabList');
    if (!changed('tabs', state.tabs)) return;
    if (!state.tabs.length) { el.innerHTML = '<div class="empty">No tabs open on your computer.</div>'; return; }
    el.innerHTML = state.tabs.map((t, i) => itemHtml(t, i, t.active ? 'active' : '')).join('');
    bindList(el, state.tabs, t => sheet(t.title, t.url, [
      ['Open on this phone', () => openHere(t.url), 'primary'],
      ['Show on computer', () => api('/api/tab/activate', { id: t.id }).then(() => toast('Switched tab on computer')).catch(e => toast(e.message))],
      ['Close on computer', () => api('/api/tab/close', { id: t.id }).then(refresh).catch(e => toast(e.message)), 'danger']
    ]));
  }
  function renderInbox() {
    const el = $('#inboxList');
    $('#clearInbox').hidden = !state.inbox.length;
    if (!changed('inbox', state.inbox)) return;
    if (!state.inbox.length) { el.innerHTML = '<div class="empty">Nothing yet. On your computer, right-click a link and choose “Send link to phone”, or use “Send this tab to my phone” in the phone panel.</div>'; return; }
    el.innerHTML = state.inbox.map((x, i) => itemHtml(x, i)).join('');
    bindList(el, state.inbox, x => sheet(x.title, x.url, [['Open on this phone', () => openHere(x.url), 'primary']]));
  }
  function renderBookmarks() {
    const el = $('#bmList');
    if (!changed('bookmarks', state.bookmarks)) return;
    if (!state.bookmarks.length) { el.innerHTML = '<div class="empty">No bookmarks yet.</div>'; return; }
    el.innerHTML = state.bookmarks.map((x, i) => itemHtml(x, i)).join('');
    bindList(el, state.bookmarks, x => sheet(x.title, x.url, [
      ['Open on this phone', () => openHere(x.url), 'primary'],
      ['Open on computer', () => openOnPc(x.url)]
    ]));
  }

  let seenInbox = -1;
  function render() {
    const paired = !!token;
    $('#unpaired').hidden = paired;
    $('#tabbar').hidden = !paired;
    for (const v of ['home', 'tabs', 'inbox', 'bookmarks']) $('#' + v).hidden = !paired || !state || v !== view;
    document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
    $('#dot').className = paired ? (online ? 'ok' : 'bad') : '';
    $('#connText').textContent = !paired ? 'Not paired' : online && state ? 'Connected to ' + state.computer : 'Can\'t reach your computer';
    if (!paired || !state) return;
    document.querySelectorAll('.pcname').forEach(e => { e.textContent = state.computer; });
    renderHome(); renderTabs(); renderInbox(); renderBookmarks();
    const n = state.inbox.length;
    if (view === 'inbox') seenInbox = n;
    const unseen = seenInbox < 0 ? 0 : Math.max(0, n - seenInbox);
    $('#inboxBadge').hidden = !unseen;
    $('#inboxBadge').textContent = unseen;
  }
  document.querySelectorAll('.tabbar button').forEach(b => b.onclick = () => { view = b.dataset.view; render(); window.scrollTo(0, 0); });

  // ---- polling
  let timer;
  async function refresh() {
    clearTimeout(timer);
    if (!token) return render();
    try {
      state = await api('/api/state');
      if (seenInbox < 0) seenInbox = state.inbox.length;
      online = true;
    } catch { online = false; }
    render();
    if (!document.hidden) timer = setTimeout(refresh, 3000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh();
})();
