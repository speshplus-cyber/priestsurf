'use strict';
(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NEWTAB = new URL('newtab.html', location.href).href;
  const isNewTab = url => !url || url.startsWith(NEWTAB) || url === 'about:blank';

  const ICONS = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    shieldOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M4 4l16 16"/></svg>',
    reader: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    starOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    bm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    onion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2"/><path d="M12 5V2"/></svg>'
  };
  for (const [id, ic] of [['backBtn', 'back'], ['fwdBtn', 'fwd'], ['reloadBtn', 'reload'], ['readerBtn', 'reader'], ['aiBtn', 'ai'], ['starBtn', 'star'], ['phoneBtn', 'phone'], ['bmBtn', 'bm'], ['menuBtn', 'menu']]) $('#' + id).innerHTML = ICONS[ic];
  $('#shieldBtn').insertAdjacentHTML('afterbegin', ICONS.shield);

  let settings = await priest.getSettings();
  let tor = await priest.torStatus();
  document.documentElement.dataset.theme = settings.theme;

  const tabs = [];
  const closedTabs = [];
  let active = null;
  let seq = 0;
  let panel = null;

  // ------------------------------------------------------------ helpers
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }
  const hostOf = url => { try { return new URL(url).hostname; } catch { return ''; } };
  const baseOf = host => host.split('.').slice(-2).join('.');
  function groupColor(host) {
    if (!host) return 'var(--accent)';
    let h = 0; for (const c of baseOf(host)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360} 60% 52%)`;
  }

  // ------------------------------------------------------------ tabs
  function createTab(url = NEWTAB, { background = false, index } = {}) {
    const tab = { id: ++seq, url, title: 'New Tab', loading: false, ready: false, wcId: null, zoom: 0, stats: null, isNewTab: isNewTab(url), failedUpgrade: null };
    const wv = document.createElement('webview');
    wv.setAttribute('partition', 'priestsurf');
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', url);
    tab.wv = wv;

    const el = document.createElement('div');
    el.className = 'tab';
    el.setAttribute('role', 'tab');
    el.innerHTML = '<span class="avatar">•</span><span class="title">New Tab</span><span class="audio" hidden>🔊</span><button class="close" title="Close tab (Ctrl+W)">×</button>';
    el.addEventListener('mousedown', e => { if (e.button === 1) { e.preventDefault(); closeTab(tab); } });
    el.addEventListener('click', e => { if (e.target.closest('.close')) closeTab(tab); else activate(tab); });
    el.querySelector('.audio').addEventListener('click', e => { e.stopPropagation(); wv.setAudioMuted(!wv.isAudioMuted()); renderTab(tab); });
    tab.el = el;

    wv.addEventListener('dom-ready', () => {
      if (!tab.ready) { tab.ready = true; tab.wcId = wv.getWebContentsId(); }
      if (tab.isNewTab) initNewTab(tab);
      if (tab.zoom) wv.setZoomLevel(tab.zoom);
    });
    wv.addEventListener('did-start-loading', () => { tab.loading = true; renderTab(tab); if (tab === active) updateToolbar(); });
    wv.addEventListener('did-stop-loading', () => { tab.loading = false; renderTab(tab); if (tab === active) updateToolbar(); });
    wv.addEventListener('page-title-updated', e => { tab.title = e.title; renderTab(tab); });
    wv.addEventListener('did-navigate', e => onNavigate(tab, e.url));
    wv.addEventListener('did-navigate-in-page', e => { if (e.isMainFrame) onNavigate(tab, e.url); });
    wv.addEventListener('media-started-playing', () => { tab.audio = true; renderTab(tab); });
    wv.addEventListener('media-paused', () => { tab.audio = false; renderTab(tab); });
    wv.addEventListener('enter-html-full-screen', () => document.body.classList.add('fullscreen'));
    wv.addEventListener('leave-html-full-screen', () => document.body.classList.remove('fullscreen'));
    wv.addEventListener('found-in-page', e => { if (tab === active) $('#findCount').textContent = e.result.matches ? `${e.result.activeMatchOrdinal}/${e.result.matches}` : 'No results'; });
    wv.addEventListener('did-fail-load', e => {
      if (!e.isMainFrame || e.errorCode === -3) return; // -3 = aborted (normal)
      tab.error = { code: e.errorCode, desc: e.errorDescription, url: e.validatedURL };
      if (tab === active) showError(tab);
    });

    if (index != null && index < tabs.length) { tabs.splice(index, 0, tab); $('#tabs').insertBefore(el, tabs[index + 1].el); }
    else { tabs.push(tab); $('#tabs').appendChild(el); }
    $('#views').appendChild(wv);
    renderTab(tab);
    if (!background || !active) activate(tab);
    return tab;
  }

  function renderTab(tab) {
    const host = tab.isNewTab ? '' : hostOf(tab.url);
    tab.el.style.setProperty('--group', groupColor(host));
    tab.el.querySelector('.avatar').textContent = tab.isNewTab ? '✦' : (baseOf(host)[0] || '•').toUpperCase();
    const title = tab.isNewTab ? 'New Tab' : (tab.title || host || tab.url);
    tab.el.querySelector('.title').textContent = title;
    tab.el.title = title + (host ? `\n${host}` : '');
    tab.el.classList.toggle('loading', tab.loading);
    tab.el.classList.toggle('active', tab === active);
    const audio = tab.el.querySelector('.audio');
    audio.hidden = !tab.audio;
    if (tab.ready) audio.textContent = tab.wv.isAudioMuted() ? '🔇' : '🔊';
    publishTabs();
  }

  function onNavigate(tab, url) {
    tab.url = url;
    tab.isNewTab = isNewTab(url);
    tab.error = null;
    // Search typed into the new tab page arrives as "#q=..."
    if (url.startsWith(NEWTAB) && url.includes('#q=')) {
      const q = decodeURIComponent(url.split('#q=')[1] || '').trim();
      if (q) return navigate(q, tab);
    }
    renderTab(tab);
    if (tab === active && $('#suggest').hidden) $('#omniInput').value = tab.isNewTab ? '' : url;
    if (tab === active) { updateToolbar(); hideError(); if (panel === 'privacy' || panel === 'assistant') renderPanel(); }
  }

  function activate(tab) {
    if (!tab) return;
    active = tab;
    for (const t of tabs) { t.wv.classList.toggle('active', t === tab); renderTab(t); }
    tab.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    updateToolbar();
    if (tab.error) showError(tab); else hideError();
    if (tab.isNewTab) setTimeout(() => $('#omniInput').focus(), 30); else tab.wv.focus();
    if (panel) renderPanel();
    closeFind();
  }

  function closeTab(tab) {
    const i = tabs.indexOf(tab);
    if (i < 0) return;
    if (!tab.isNewTab) closedTabs.push({ url: tab.url, index: i });
    tabs.splice(i, 1);
    tab.el.remove(); tab.wv.remove();
    publishTabs();
    if (!tabs.length) return createTab();
    if (tab === active) activate(tabs[Math.min(i, tabs.length - 1)]);
  }

  function navigate(text, tab = active) {
    const t = text.trim();
    if (!t) return;
    const { url } = Smart.resolve(t, settings);
    load(tab, url);
  }
  function load(tab, url) {
    tab.url = url; tab.isNewTab = isNewTab(url);
    if (tab.ready) tab.wv.loadURL(url).catch(() => {}); else tab.wv.src = url;
    if (tab === active) { updateToolbar(); tab.wv.focus(); }
  }

  function organizeTabs() {
    const order = [...tabs].sort((a, b) => {
      const ha = a.isNewTab ? '~' : baseOf(hostOf(a.url)), hb = b.isNewTab ? '~' : baseOf(hostOf(b.url));
      return ha.localeCompare(hb);
    });
    tabs.splice(0, tabs.length, ...order);
    for (const t of tabs) $('#tabs').appendChild(t.el);
    // Close duplicate tabs (same URL)
    const seen = new Set(); let dupes = 0;
    for (const t of [...tabs]) { const k = t.isNewTab ? null : t.url; if (k && seen.has(k)) { closeTab(t); dupes++; } else if (k) seen.add(k); }
    toast(`Tabs grouped by site${dupes ? ` · closed ${dupes} duplicate${dupes > 1 ? 's' : ''}` : ''}`);
  }

  // ------------------------------------------------------------ new tab page
  function initNewTab(tab) {
    const data = {
      bookmarks: settings.bookmarks.slice(0, 12),
      blocked: tab.stats?.sessionBlocked ?? lastSessionBlocked,
      tor: tor.enabled && tor.running,
      engine: (Smart.ENGINES[settings.searchEngine] || Smart.ENGINES.duckduckgo).name,
      theme: settings.theme
    };
    tab.wv.executeJavaScript(`window.psInit && window.psInit(${JSON.stringify(data)})`).catch(() => {});
  }

  // ------------------------------------------------------------ toolbar
  const omni = $('#omniInput');
  function updateToolbar() {
    const t = active; if (!t) return;
    const ready = t.ready;
    $('#backBtn').disabled = !(ready && t.wv.canGoBack());
    $('#fwdBtn').disabled = !(ready && t.wv.canGoForward());
    $('#reloadBtn').innerHTML = t.loading ? ICONS.stop : ICONS.reload;
    $('#reloadBtn').title = t.loading ? 'Stop' : 'Reload (Ctrl+R)';
    if (document.activeElement !== omni) omni.value = t.isNewTab ? '' : t.url;
    const sec = $('#secIcon');
    sec.className = '';
    if (t.isNewTab) { sec.innerHTML = ICONS.search; sec.title = 'Private search'; }
    else if (tor.enabled) { sec.innerHTML = ICONS.onion; sec.className = 'tor'; sec.title = 'Routed through Tor'; }
    else if (t.url.startsWith('https:')) { sec.innerHTML = ICONS.lock; sec.className = 'secure'; sec.title = 'Encrypted connection (HTTPS)'; }
    else if (t.url.startsWith('http:')) { sec.innerHTML = ICONS.unlock; sec.className = 'insecure'; sec.title = 'Not encrypted'; }
    else { sec.innerHTML = ICONS.search; }
    const bookmarked = settings.bookmarks.some(b => b.url === t.url);
    $('#starBtn').innerHTML = bookmarked ? ICONS.starOn : ICONS.star;
    $('#starBtn').classList.toggle('on', bookmarked);
    $('#starBtn').hidden = t.isNewTab;
    const host = hostOf(t.url);
    const shieldsDown = host && settings.shieldsDownSites.includes(host);
    $('#shieldBtn').firstElementChild.outerHTML = shieldsDown ? ICONS.shieldOff : ICONS.shield;
    $('#shieldBtn').classList.toggle('on', !shieldsDown && !t.isNewTab);
    const n = t.stats?.total || 0;
    $('#shieldCount').hidden = !n || shieldsDown;
    $('#shieldCount').textContent = n > 99 ? '99+' : n;
    renderTor();
  }
  function renderTor() {
    const b = $('#torBtn');
    b.classList.remove('tor-on', 'tor-wait');
    if (!tor.enabled) { b.textContent = 'Tor: off'; b.title = 'Click to route all traffic through Tor'; }
    else if (tor.running) { b.textContent = 'Tor: on'; b.classList.add('tor-on'); b.title = `All traffic goes through Tor (127.0.0.1:${tor.port})`; }
    else { b.textContent = 'Tor: waiting'; b.classList.add('tor-wait'); b.title = `Tor is not running on 127.0.0.1:${tor.port}. Traffic is blocked until it is (fail-closed).`; }
  }

  $('#backBtn').onclick = () => active.wv.goBack();
  $('#fwdBtn').onclick = () => active.wv.goForward();
  $('#reloadBtn').onclick = () => active.loading ? active.wv.stop() : active.wv.reload();
  $('#newTabBtn').onclick = () => createTab();
  $('#starBtn').onclick = toggleBookmark;
  $('#shieldBtn').onclick = () => togglePanel('privacy');
  $('#aiBtn').onclick = () => togglePanel('assistant');
  $('#bmBtn').onclick = () => togglePanel('bookmarks');
  $('#phoneBtn').onclick = () => togglePanel('phone');
  $('#menuBtn').onclick = () => togglePanel('settings');
  $('#readerBtn').onclick = toggleReader;
  $('#panelClose').onclick = () => togglePanel(null);
  $('#torBtn').onclick = toggleTor;

  async function toggleTor() {
    const turningOn = !tor.enabled;
    $('#torBtn').textContent = turningOn ? 'Tor: connecting…' : 'Tor: off';
    tor = await priest.setTor(turningOn);
    renderTor(); updateToolbar();
    if (turningOn && !tor.running) {
      toast(`Tor isn't running on port ${tor.port}. Start Tor Browser (or set tor.exe in Settings). Traffic is blocked until Tor is reachable.`);
      togglePanel('privacy');
    } else toast(turningOn ? 'Connected to Tor — all traffic is now anonymized' : 'Tor off — connecting directly');
    if (turningOn && tor.running) for (const t of tabs) if (!t.isNewTab) t.wv.reload();
  }

  function toggleBookmark() {
    const t = active; if (!t || t.isNewTab) return;
    const i = settings.bookmarks.findIndex(b => b.url === t.url);
    if (i >= 0) settings.bookmarks.splice(i, 1);
    else settings.bookmarks.unshift({ title: t.title || hostOf(t.url), url: t.url });
    priest.setSettings({ bookmarks: settings.bookmarks });
    toast(i >= 0 ? 'Bookmark removed' : 'Bookmarked');
    updateToolbar();
    if (panel === 'bookmarks') renderPanel();
  }

  async function toggleReader() {
    if (!active || active.isNewTab) return;
    try {
      const on = await priest.execInPage(active.wcId, PageTools.reader({ theme: settings.theme }));
      $('#readerBtn').classList.toggle('on', !!on);
    } catch { toast('Reader mode is not available on this page'); }
  }

  // ------------------------------------------------------------ omnibox
  const sugBox = $('#suggest');
  let sugs = [], sel = 0;
  function renderSuggest() {
    sugs = Smart.suggest(omni.value, { settings, tabs, bookmarks: settings.bookmarks, activeId: active?.id });
    sel = 0;
    if (!sugs.length) { sugBox.hidden = true; return; }
    const KIND = { calc: '=', url: '↗', search: '⌕', tab: '⧉', bookmark: '★', bang: '!', hint: '!' };
    sugBox.innerHTML = sugs.map((s, i) => `<div class="sg ${s.kind} ${i === sel ? 'sel' : ''}" data-i="${i}"><span class="k">${KIND[s.kind] || '•'}</span><span class="l">${esc(s.label)}</span><span class="s">${esc(s.sub)}</span></div>`).join('');
    sugBox.hidden = false;
  }
  function pickSuggest(s) {
    sugBox.hidden = true;
    if (!s) return navigate(omni.value);
    if (s.copy) { navigator.clipboard.writeText(s.copy).catch(() => {}); toast(`Copied ${s.copy}`); return; }
    if (s.fill) { omni.value = s.fill; omni.focus(); renderSuggest(); return; }
    if (s.tabId) { const t = tabs.find(x => x.id === s.tabId); if (t) activate(t); return; }
    if (s.url) { load(active, s.url); omni.blur(); }
  }
  omni.addEventListener('input', renderSuggest);
  omni.addEventListener('focus', () => setTimeout(() => omni.select(), 0));
  omni.addEventListener('blur', () => setTimeout(() => { sugBox.hidden = true; updateToolbar(); }, 150));
  omni.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (sugBox.hidden || !sugs.length) return;
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + sugs.length) % sugs.length;
      [...sugBox.children].forEach((c, i) => c.classList.toggle('sel', i === sel));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickSuggest(sugBox.hidden ? null : sugs[sel]);
    } else if (e.key === 'Escape') {
      sugBox.hidden = true; omni.value = active.isNewTab ? '' : active.url; active.wv.focus();
    }
  });
  sugBox.addEventListener('mousedown', e => { const r = e.target.closest('.sg'); if (r) { e.preventDefault(); pickSuggest(sugs[+r.dataset.i]); } });

  // ------------------------------------------------------------ errors (HTTPS-only fallback)
  function showError(tab) {
    const er = tab.error; if (!er) return hideError();
    const bar = $('#errbar');
    const httpsFail = er.url.startsWith('https:') && settings.httpsOnly && [-100, -101, -102, -105, -107, -109, -118, -200, -201, -202, -310].includes(er.code);
    const torFail = tor.enabled && !tor.running;
    bar.innerHTML = `<span class="grow"><b>Couldn't load ${esc(hostOf(er.url))}</b> — ${esc(er.desc)}${torFail ? ' · Tor is not running, so all traffic is blocked.' : ''}${httpsFail ? ' · This site may not support a secure (HTTPS) connection.' : ''}</span>
      ${httpsFail ? '<button class="btn" id="insecureBtn">Load insecure (HTTP) once</button>' : ''}
      <button class="btn" id="retryBtn">Retry</button>`;
    bar.hidden = false;
    $('#retryBtn').onclick = () => { hideError(); tab.wv.reload(); };
    if (httpsFail) $('#insecureBtn').onclick = async () => {
      const host = hostOf(er.url);
      await priest.allowInsecure(host);
      hideError(); load(tab, er.url.replace(/^https:/, 'http:'));
    };
  }
  function hideError() { $('#errbar').hidden = true; }

  // ------------------------------------------------------------ permissions
  const permQueue = [];
  const PERM_LABEL = { geolocation: 'know your location', notifications: 'show notifications', media: 'use your camera/microphone', midi: 'use MIDI devices', midiSysex: 'use MIDI devices', 'clipboard-read': 'read your clipboard', 'display-capture': 'capture your screen', openExternal: 'open an external app', hid: 'access HID devices', serial: 'access serial ports', usb: 'access USB devices', 'idle-detection': 'detect when you are idle', 'window-management': 'manage your windows', 'storage-access': 'access cookies across sites' };
  function showPerm() {
    const bar = $('#permbar');
    const p = permQueue[0];
    if (!p) { bar.hidden = true; return; }
    bar.innerHTML = `<span class="grow">🔐 <b>${esc(hostOf(p.origin) || p.origin)}</b> wants to ${esc(PERM_LABEL[p.permission] || p.permission)}. <span class="muted">(Remembered until you close PriestSurf)</span></span>
      <button class="btn" id="permDeny">Block</button><button class="btn primary" id="permAllow">Allow</button>`;
    bar.hidden = false;
    const respond = allow => { priest.respondPermission(p.id, allow); permQueue.shift(); showPerm(); };
    $('#permDeny').onclick = () => respond(false);
    $('#permAllow').onclick = () => respond(true);
  }
  priest.onPermission(p => { permQueue.push(p); showPerm(); });

  // ------------------------------------------------------------ find in page
  function openFind() {
    if (!active || active.isNewTab) return;
    $('#findbar').hidden = false; $('#findInput').focus(); $('#findInput').select();
  }
  function closeFind() {
    if ($('#findbar').hidden) return;
    $('#findbar').hidden = true; $('#findCount').textContent = '';
    try { active.wv.stopFindInPage('clearSelection'); } catch {}
  }
  function findStep(forward) {
    const q = $('#findInput').value; if (!q) return;
    active.wv.findInPage(q, { forward, findNext: true });
  }
  $('#findInput').addEventListener('input', e => { const q = e.target.value; if (q) active.wv.findInPage(q); else { active.wv.stopFindInPage('clearSelection'); $('#findCount').textContent = ''; } });
  $('#findInput').addEventListener('keydown', e => { if (e.key === 'Enter') findStep(!e.shiftKey); if (e.key === 'Escape') closeFind(); });
  $('#findNext').onclick = () => findStep(true);
  $('#findPrev').onclick = () => findStep(false);
  $('#findClose').onclick = closeFind;

  // ------------------------------------------------------------ panels
  function togglePanel(name) {
    panel = panel === name ? null : name;
    $('#panel').hidden = !panel;
    for (const [btn, n] of [['#aiBtn', 'assistant'], ['#phoneBtn', 'phone'], ['#bmBtn', 'bookmarks'], ['#menuBtn', 'settings']]) $(btn).classList.toggle('on', panel === n);
    if (panel) renderPanel();
    updateToolbar();
  }
  function setPanel(title, html) { $('#panelTitle').textContent = title; $('#panelBody').innerHTML = html; }
  const sw = (id, checked) => `<label class="switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span></span></label>`;

  async function renderPanel() {
    if (panel === 'privacy') return renderPrivacy();
    if (panel === 'assistant') return renderAssistant();
    if (panel === 'bookmarks') return renderBookmarks();
    if (panel === 'settings') return renderSettings();
    if (panel === 'phone') return renderPhone();
  }

  // ---- phone link
  let phoneTimer = null;
  async function renderPhone() {
    clearTimeout(phoneTimer);
    const st = await priest.phoneStatus();
    if (panel !== 'phone') return;
    const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'connected now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; };
    setPanel('Phone link', `
      <div class="card"><div class="row"><span><b>Connect my phone</b><div class="muted">Over your Wi-Fi only, never the internet</div></span>${sw('phoneSw', st.running)}</div></div>
      ${st.running ? (st.url ? `
        <div class="card" style="text-align:center">
          <h3>Scan with your phone's camera</h3>
          <img src="${st.qr}" alt="Pairing QR code" style="width:200px;height:200px;border-radius:10px;background:#fff;padding:6px">
          <p class="muted" style="margin:8px 0 0">Your phone must be on the same Wi-Fi.<br>Then use “Add to Home Screen” to install the PriestSurf app.</p>
        </div>
        <div class="card"><h3>Phone can't connect?</h3><div class="muted">
          • Make sure Windows Firewall allows PriestSurf. If your Wi-Fi is set to <b>Public</b>, switch it to <b>Private</b> in Windows Settings → Network → Wi-Fi.<br>
          • If you use a VPN, turn on its “Allow LAN traffic” option.<br>
          • Address: ${esc(st.url.split('#')[0])}</div></div>
        <div class="card"><h3>Paired phones</h3>
          ${st.devices.length ? st.devices.map(d => `<div class="row"><span>${esc(d.name)}</span><span class="${Date.now() - d.seen < 15000 ? 'ok' : 'muted'}">${ago(d.seen)}</span></div>`).join('') : '<div class="muted">No phone has connected yet.</div>'}
          <button class="btn primary block" id="sendTabBtn" ${active.isNewTab ? 'disabled' : ''}>Send this tab to my phone</button>
          <button class="btn danger block" id="unpairBtn">Unpair all phones</button>
          <p class="muted" style="margin:8px 0 0">The QR code holds a secret key. Only show it to phones you own. Unpairing makes the old code stop working.</p>
        </div>` : '<div class="card no">Not connected to a Wi-Fi network, so your phone can’t reach this computer.</div>')
      : `<div class="card muted">Turn this on to control PriestSurf from your phone:
          <ul class="points"><li>see and switch your computer's tabs</li><li>send links from phone to computer and back</li><li>toggle Tor and New identity remotely</li><li>private search with your bookmarks</li></ul>
          Windows may ask to allow PriestSurf on private networks. Choose <b>Allow</b>.</div>`}`);
    $('#phoneSw').onchange = async e => {
      try { await priest.setPhoneLink(e.target.checked); } catch (err) { toast(String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); }
      renderPhone();
    };
    const sendBtn = $('#sendTabBtn');
    if (sendBtn) sendBtn.onclick = async () => { await priest.sendToPhone({ title: active.title, url: active.url }); toast('Sent to your phone'); };
    const unpair = $('#unpairBtn');
    if (unpair) unpair.onclick = async () => { await priest.unpairPhones(); toast('All phones unpaired, so scan the new code to reconnect'); renderPhone(); };
    if (st.running) phoneTimer = setTimeout(() => panel === 'phone' && renderPhone(), 5000);
  }

  let tabsTimer = null;
  function publishTabs() {
    clearTimeout(tabsTimer);
    tabsTimer = setTimeout(() => priest.publishTabs(tabs.filter(t => !t.isNewTab).map(t => ({ id: t.id, title: t.title || hostOf(t.url), url: t.url, active: t === active }))), 300);
  }

  async function renderPrivacy() {
    const t = active;
    const host = t.isNewTab ? '' : hostOf(t.url);
    const st = t.wcId ? await priest.getStats(t.wcId) : null;
    if (st) t.stats = st;
    tor = await priest.torStatus();
    const s = st || { total: 0, trackers: [], upgraded: 0, cookies: 0, params: 0, sessionBlocked: lastSessionBlocked };
    const shieldsUp = !host || !settings.shieldsDownSites.includes(host);
    const secure = t.url.startsWith('https:');
    setPanel('Privacy shield', `
      <div class="card">
        <div class="row"><div><div class="muted">${host ? esc(host) : 'New tab'}</div><div class="big">${s.total}</div><div class="muted">trackers blocked on this page</div></div>
        ${host ? `<div style="text-align:center">${sw('shieldSw', shieldsUp)}<div class="muted" style="font-size:11px;margin-top:4px">Shields ${shieldsUp ? 'up' : 'down'}</div></div>` : ''}</div>
      </div>
      ${s.trackers.length ? `<div class="card"><h3>Blocked on this page</h3><div class="tracker-list">${s.trackers.map(x => `<div class="row"><span>${esc(x.domain)}</span><span class="muted">${x.count}</span></div>`).join('')}</div></div>` : ''}
      <div class="card"><h3>This page</h3>
        <div class="row"><span>Connection</span>${t.isNewTab ? '<span class="muted">—</span>' : secure ? '<span class="ok">Encrypted (HTTPS)</span>' : '<span class="no">Not encrypted</span>'}</div>
        <div class="row"><span>Upgraded to HTTPS</span><span>${s.upgraded}</span></div>
        <div class="row"><span>3rd-party cookies stripped</span><span>${s.cookies}</span></div>
        <div class="row"><span>Tracking parameters removed</span><span>${s.params}</span></div>
      </div>
      <div class="card"><h3>Anonymity</h3>
        <div class="row"><span>Tor network</span>${!tor.enabled ? '<span class="meh">Off</span>' : tor.running ? '<span class="ok">Connected</span>' : '<span class="no">Not reachable</span>'}</div>
        <div class="row"><span>Fingerprint protection</span>${settings.fingerprintProtection && shieldsUp ? '<span class="ok">On</span>' : '<span class="meh">Off</span>'}</div>
        <div class="row"><span>WebRTC IP leak</span><span class="ok">Blocked</span></div>
        <div class="row"><span>History & cookies</span><span class="ok">Wiped on exit</span></div>
        <div class="row"><span>Global Privacy Control</span>${settings.sendGPC ? '<span class="ok">Sent</span>' : '<span class="meh">Off</span>'}</div>
        ${tor.enabled && !tor.running ? `<p class="muted">Tor isn't reachable on 127.0.0.1:${tor.port}. Open Tor Browser (port 9150) or install the Tor Expert Bundle and set the path to tor.exe in Settings. Until Tor is reachable, PriestSurf blocks all traffic so nothing leaks.</p>` : ''}
        <button class="btn block" id="checkTorBtn">Check my connection</button>
      </div>
      <div class="card"><div class="row"><span>Trackers blocked this session</span><b>${s.sessionBlocked}</b></div>
        <button class="btn primary block" id="newIdBtn">New identity (Ctrl+Shift+U)</button>
        <p class="muted" style="margin:8px 0 0">Closes all tabs and erases cookies, cache, storage and permissions, and rotates your fingerprint.</p>
      </div>`);
    const shieldSw = $('#shieldSw');
    if (shieldSw) shieldSw.onchange = async () => {
      const up = await priest.toggleShields(host);
      settings = await priest.getSettings();
      toast(up ? `Shields up for ${host}` : `Shields down for ${host}`);
      t.wv.reload(); renderPanel(); updateToolbar();
    };
    $('#checkTorBtn').onclick = () => createTab('https://check.torproject.org');
    $('#newIdBtn').onclick = newIdentity;
  }

  let lastSessionBlocked = 0;
  async function newIdentity() {
    await priest.newIdentity();
    for (const t of [...tabs]) { t.el.remove(); t.wv.remove(); }
    tabs.length = 0; closedTabs.length = 0; lastSessionBlocked = 0;
    createTab();
    toast('New identity — everything erased');
    if (panel) renderPanel();
  }

  // ---- assistant
  let assistantCache = { url: null, page: null, summary: null };
  async function getPage() {
    if (assistantCache.url === active.url && assistantCache.page) return assistantCache.page;
    const page = await priest.execInPage(active.wcId, PageTools.extract());
    assistantCache = { url: active.url, page, summary: null };
    return page;
  }
  function renderAssistant(prefill) {
    const ai = settings.aiEnabled && settings.hasApiKey;
    setPanel('Assistant', `
      <div class="card"><div class="muted">${ai ? '✦ Claude AI is on. Page text is sent to Anthropic only when you ask.' : '✦ On-device mode: summaries and answers are computed locally — nothing leaves your computer. Turn on Claude AI in Settings for deeper answers.'}</div></div>
      <button class="btn primary block" id="sumBtn" ${active.isNewTab ? 'disabled' : ''}>Summarize this page</button>
      <div id="sumOut"></div>
      <label class="field" for="askIn">Ask ${active.isNewTab ? '' : 'about this page'}</label>
      <textarea id="askIn" placeholder="${active.isNewTab ? 'Ask anything…' : 'e.g. What is the main argument? What does it cost?'}"></textarea>
      <button class="btn block" id="askBtn">Ask</button>
      <div id="askOut"></div>`);
    $('#sumBtn').onclick = summarizePage;
    $('#askBtn').onclick = askPage;
    $('#askIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askPage(); } });
    if (prefill) { $('#askIn').value = prefill; }
    if (assistantCache.url === active.url && assistantCache.summary) $('#sumOut').innerHTML = assistantCache.summary;
  }
  async function summarizePage() {
    const out = $('#sumOut');
    out.innerHTML = '<div class="card muted">Reading the page…</div>';
    try {
      const page = await getPage();
      const text = page.text.length > 800 ? page.text : page.fullText;
      let html;
      if (settings.aiEnabled && settings.hasApiKey) {
        const r = await priest.askAI('Summarize this page in 5 concise bullet points, then one line on who it is useful for.', `Title: ${page.title}\nURL: ${page.url}\n\n${text}`);
        html = `<div class="card"><h3>${esc(page.title)}</h3><div class="ai-out">${esc(r)}</div></div>`;
      } else {
        const s = Smart.summarize(text);
        if (!s.points.length) throw new Error('Not enough readable text on this page.');
        html = `<div class="card"><h3>${esc(page.title)}</h3><div class="muted">${s.words.toLocaleString()} words · ${s.minutes} min read</div>
          <ul class="points">${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
          <div class="chips">${s.keywords.map(k => `<span class="chip" data-k="${esc(k)}">${esc(k)}</span>`).join('')}</div></div>`;
      }
      assistantCache.summary = html;
      out.innerHTML = html;
      out.querySelectorAll('.chip').forEach(c => c.onclick = () => { openFind(); $('#findInput').value = c.dataset.k; active.wv.findInPage(c.dataset.k); });
    } catch (e) { out.innerHTML = `<div class="card no">${esc(e.message || e)}</div>`; }
  }
  async function askPage() {
    const q = $('#askIn').value.trim(); if (!q) return;
    const out = $('#askOut');
    out.innerHTML = '<div class="card muted">Thinking…</div>';
    try {
      const page = active.isNewTab ? null : await getPage();
      if (settings.aiEnabled && settings.hasApiKey) {
        const r = await priest.askAI(q, page ? `Title: ${page.title}\nURL: ${page.url}\n\n${page.text.length > 800 ? page.text : page.fullText}` : '');
        out.innerHTML = `<div class="card"><div class="ai-out">${esc(r)}</div></div>`;
      } else if (page) {
        const hits = Smart.answer(q, page.fullText);
        out.innerHTML = hits.length
          ? `<div class="card"><h3>Most relevant passages</h3><ul class="points">${hits.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>`
          : `<div class="card muted">No matching passage found on this page. <a href="#" id="searchQ">Search the web privately</a></div>`;
        const sq = $('#searchQ'); if (sq) sq.onclick = e => { e.preventDefault(); createTab(Smart.searchUrl(q, settings.searchEngine)); };
      } else {
        createTab(Smart.searchUrl(q, settings.searchEngine));
        out.innerHTML = '<div class="card muted">Searched privately in a new tab. Turn on Claude AI in Settings to get direct answers.</div>';
      }
    } catch (e) { out.innerHTML = `<div class="card no">${esc(e.message || e)}</div>`; }
  }

  // ---- bookmarks
  function renderBookmarks() {
    setPanel('Bookmarks', `
      ${settings.bookmarks.length ? settings.bookmarks.map((b, i) => `<div class="bm" data-i="${i}"><span class="t">${esc(b.title)}<span class="u">${esc(b.url)}</span></span><button class="icon-btn small" data-del="${i}" title="Remove">×</button></div>`).join('') : '<p class="muted">No bookmarks yet. Press Ctrl+D on any page.</p>'}
      <div class="card"><h3>Open tabs (${tabs.length})</h3><button class="btn block" id="orgBtn">Group tabs by site & close duplicates</button>
      ${closedTabs.length ? `<button class="btn block" id="reopenBtn">Reopen closed tab (Ctrl+Shift+T)</button>` : ''}</div>`);
    $('#panelBody').querySelectorAll('.bm').forEach(el => el.onclick = e => {
      const del = e.target.closest('[data-del]');
      if (del) { settings.bookmarks.splice(+del.dataset.del, 1); priest.setSettings({ bookmarks: settings.bookmarks }); renderBookmarks(); updateToolbar(); return; }
      load(active, settings.bookmarks[+el.dataset.i].url);
    });
    $('#orgBtn').onclick = () => { organizeTabs(); renderBookmarks(); };
    const rb = $('#reopenBtn'); if (rb) rb.onclick = () => { reopenTab(); renderBookmarks(); };
  }

  // ---- settings
  function renderSettings() {
    const eng = Object.entries(Smart.ENGINES).map(([k, v]) => `<option value="${k}" ${settings.searchEngine === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
    const toggles = [
      ['blockTrackers', 'Block trackers & ads'],
      ['httpsOnly', 'HTTPS-only mode'],
      ['fingerprintProtection', 'Fingerprint protection'],
      ['blockThirdPartyCookies', 'Block third-party cookies'],
      ['stripTrackingParams', 'Remove tracking parameters from links'],
      ['sendGPC', 'Send Global Privacy Control / Do Not Track']
    ];
    setPanel('Settings', `
      <label class="field" for="engSel">Search engine</label><select id="engSel">${eng}</select>
      <div class="card"><h3>Privacy</h3>${toggles.map(([k, l]) => `<div class="row"><span>${l}</span>${sw('set_' + k, settings[k])}</div>`).join('')}</div>
      <div class="card"><h3>Tor</h3>
        <div class="row"><span>Route all traffic through Tor</span>${sw('set_torMode', settings.torMode)}</div>
        <label class="field" for="torPort">Tor SOCKS port</label><input class="text" id="torPort" type="number" value="${settings.torPort}">
        <div class="muted" style="margin-top:4px">9150 = Tor Browser running in the background · 9050 = Tor service / Expert Bundle</div>
        <label class="field" for="torPath">Path to tor.exe (optional — PriestSurf starts it for you)</label><input class="text" id="torPath" placeholder="C:\\Tor\\tor\\tor.exe" value="${esc(settings.torPath)}">
      </div>
      <div class="card"><h3>Claude AI assistant (optional)</h3>
        <div class="row"><span>Enable AI answers & summaries</span>${sw('set_aiEnabled', settings.aiEnabled)}</div>
        <label class="field" for="apiKey">Claude API key ${settings.hasApiKey ? '<span class="ok">(saved, encrypted)</span>' : ''}</label>
        <input class="text" id="apiKey" type="password" placeholder="${settings.hasApiKey ? '•••••••• (leave blank to keep)' : 'sk-ant-…'}">
        <div class="muted" style="margin-top:4px">Off by default. Page text is sent to Anthropic only when you press Summarize or Ask — through Tor when Tor is on.</div>
      </div>
      <div class="card"><h3>Appearance</h3><div class="row"><span>Dark theme</span>${sw('themeSw', settings.theme === 'dark')}</div></div>
      <div class="card"><h3>Keyboard shortcuts</h3><div class="muted" style="line-height:1.8">Ctrl+T new tab · Ctrl+W close · Ctrl+Shift+T reopen · Ctrl+L address bar · Ctrl+F find · Ctrl+D bookmark · Alt+R reader · Ctrl+J assistant · Ctrl+Shift+P privacy · Ctrl+Shift+U new identity · Ctrl +/−/0 zoom</div></div>`);
    $('#engSel').onchange = e => save({ searchEngine: e.target.value });
    for (const [k] of [...toggles, ['aiEnabled']]) $('#set_' + k).onchange = e => save({ [k]: e.target.checked });
    $('#set_torMode').onchange = async e => { if (e.target.checked !== tor.enabled) await toggleTor(); };
    $('#torPort').onchange = e => save({ torPort: parseInt(e.target.value, 10) || 9150 }).then(async () => { tor = await priest.torStatus(); renderTor(); });
    $('#torPath').onchange = e => save({ torPath: e.target.value.trim() });
    $('#apiKey').onchange = e => { if (e.target.value.trim()) save({ claudeApiKey: e.target.value.trim() }).then(() => { toast('API key saved (encrypted)'); renderSettings(); }); };
    $('#themeSw').onchange = e => { save({ theme: e.target.checked ? 'dark' : 'light' }); document.documentElement.dataset.theme = e.target.checked ? 'dark' : 'light'; for (const t of tabs) if (t.isNewTab) initNewTab(t); };
  }
  async function save(patch) {
    settings = await priest.setSettings(patch);
    updateToolbar();
    return settings;
  }

  function reopenTab() {
    const c = closedTabs.pop();
    if (c) createTab(c.url, { index: c.index });
  }

  // ------------------------------------------------------------ events from main
  priest.onOpenTab(({ url, background }) => {
    const idx = active ? tabs.indexOf(active) + 1 : undefined;
    createTab(url, { background, index: idx });
  });
  priest.onStats(st => {
    lastSessionBlocked = st.sessionBlocked;
    const t = tabs.find(x => x.wcId === st.wcId);
    if (!t) return;
    t.stats = st;
    if (t === active) { updateToolbar(); if (panel === 'privacy') renderPanel(); }
  });
  priest.onTor(s => { tor = s; renderTor(); updateToolbar(); });
  priest.onPhoneCommand(async cmd => {
    const tab = tabs.find(t => t.id === cmd.id);
    switch (cmd.type) {
      case 'open': createTab(cmd.url); return toast('Opened from your phone');
      case 'activate': return tab && activate(tab);
      case 'close': return tab && closeTab(tab);
      case 'new-identity': return newIdentity();
      case 'bookmarks-changed':
        settings = await priest.getSettings(); updateToolbar();
        if (panel === 'bookmarks') renderPanel();
        return toast('Bookmark added from your phone');
    }
  });
  priest.onToast(toast);
  priest.onSearchSelection(q => createTab(Smart.searchUrl(q, settings.searchEngine), { index: tabs.indexOf(active) + 1 }));
  priest.onAssistantAsk(sel => { panel = null; togglePanel('assistant'); renderAssistant(`Explain this: "${sel}"`); });

  priest.onShortcut(s => {
    const idx = tabs.indexOf(active);
    switch (s) {
      case 'new-tab': return createTab();
      case 'close-tab': return closeTab(active);
      case 'reopen-tab': return reopenTab();
      case 'focus-omnibox': omni.focus(); return omni.select();
      case 'reload': return active.wv.reload();
      case 'hard-reload': return active.wv.reloadIgnoringCache();
      case 'find': return openFind();
      case 'bookmark': return toggleBookmark();
      case 'next-tab': return activate(tabs[(idx + 1) % tabs.length]);
      case 'prev-tab': return activate(tabs[(idx - 1 + tabs.length) % tabs.length]);
      case 'back': return active.wv.canGoBack() && active.wv.goBack();
      case 'forward': return active.wv.canGoForward() && active.wv.goForward();
      case 'zoom-in': active.zoom = Math.min(5, active.zoom + 0.5); active.wv.setZoomLevel(active.zoom); return toast(`Zoom ${Math.round(Math.pow(1.2, active.zoom) * 100)}%`);
      case 'zoom-out': active.zoom = Math.max(-4, active.zoom - 0.5); active.wv.setZoomLevel(active.zoom); return toast(`Zoom ${Math.round(Math.pow(1.2, active.zoom) * 100)}%`);
      case 'zoom-reset': active.zoom = 0; active.wv.setZoomLevel(0); return toast('Zoom 100%');
      case 'reader': return toggleReader();
      case 'summarize': if (panel !== 'assistant') togglePanel('assistant'); return summarizePage();
      case 'assistant': return togglePanel('assistant');
      case 'privacy': return togglePanel('privacy');
      case 'bookmarks': return togglePanel('bookmarks');
      case 'phone': return togglePanel('phone');
      case 'settings': return togglePanel('settings');
      case 'new-identity': return newIdentity();
      case 'fullscreen': return document.body.classList.toggle('fullscreen');
      default:
        if (s.startsWith('tab-')) { const n = +s.slice(4); activate(n === 9 ? tabs[tabs.length - 1] : tabs[n - 1]); }
    }
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeFind(); } });

  createTab();
})();
