'use strict';
const { app, BrowserWindow, session, ipcMain, Menu, clipboard, safeStorage, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { isTracker } = require('./src/blocklist');
const { createPhoneLink, PHONE_PORT } = require('./src/phone-link');

app.setName('PriestSurf');
// Developer option: run with a separate profile folder (settings, bookmarks, pairing).
if (process.env.PRIESTSURF_PROFILE) app.setPath('userData', process.env.PRIESTSURF_PROFILE);

// The browsing partition has no "persist:" prefix, so cookies, cache, storage and
// history live only in memory and vanish when PriestSurf closes.
const PARTITION = 'priestsurf';

// Never leak the real local IP through WebRTC.
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');
app.commandLine.appendSwitch('disable-features', 'InterestFeedContentSuggestions,PrivacySandboxAdsAPIs,FedCm,MediaRouter' +
  // Self-test screenshots must render even when the window is covered by other windows.
  (process.env.PRIESTSURF_SELFTEST ? ',CalculateNativeWinOcclusion' : ''));
if (process.env.PRIESTSURF_SELFTEST) app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// A single, common user agent so every PriestSurf user looks the same.
const CHROME_MAJOR = (process.versions.chrome || '130').split('.')[0];
const UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_MAJOR}.0.0.0 Safari/537.36`;

// ---------------------------------------------------------------- settings
const DEFAULTS = {
  searchEngine: 'duckduckgo',
  httpsOnly: true,
  blockTrackers: true,
  fingerprintProtection: true,
  stripTrackingParams: true,
  blockThirdPartyCookies: true,
  sendGPC: true,
  torMode: false,
  torPort: 9150,
  torPath: '',
  aiEnabled: false,
  claudeApiKeyEnc: '',
  phoneLink: false,
  phoneToken: '',
  theme: 'dark',
  shieldsDownSites: [],
  bookmarks: [
    { title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { title: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { title: 'Tor Check', url: 'https://check.torproject.org' },
    { title: 'EFF Cover Your Tracks', url: 'https://coveryourtracks.eff.org' }
  ]
};
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = { ...DEFAULTS };
function loadSettings() {
  try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; } catch { settings = { ...DEFAULTS }; }
}
function saveSettings() {
  try { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch (e) { console.error(e); }
}
function publicSettings() {
  const { claudeApiKeyEnc, phoneToken, ...rest } = settings;
  return { ...rest, hasApiKey: !!claudeApiKeyEnc };
}
function getApiKey() {
  if (!settings.claudeApiKeyEnc) return '';
  try { return safeStorage.decryptString(Buffer.from(settings.claudeApiKeyEnc, 'base64')); } catch { return ''; }
}

// ---------------------------------------------------------------- state
let win = null;
let torProcess = null;
let fpSeed = crypto.randomInt(1, 2 ** 31);
const insecureAllowed = new Set();      // hosts the user allowed over plain http this session
const sitePerms = new Map();            // "origin|permission" -> boolean, session only
const pendingPerms = new Map();
let permSeq = 0;
const stats = new Map();                // webContentsId -> { trackers: Map, upgraded, cookies, params }
let sessionBlocked = 0;
const statTimers = new Map();

const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); };

function getStats(id) {
  if (!stats.has(id)) stats.set(id, { trackers: new Map(), upgraded: 0, cookies: 0, params: 0 });
  return stats.get(id);
}
function statsPayload(id) {
  const s = getStats(id);
  let total = 0; for (const n of s.trackers.values()) total += n;
  return {
    wcId: id, total, upgraded: s.upgraded, cookies: s.cookies, params: s.params, sessionBlocked,
    trackers: [...s.trackers.entries()].sort((a, b) => b[1] - a[1]).map(([domain, count]) => ({ domain, count }))
  };
}
function bump(id, field, domain) {
  if (id == null) return;
  const s = getStats(id);
  if (field === 'trackers') { s.trackers.set(domain, (s.trackers.get(domain) || 0) + 1); sessionBlocked++; } else s[field]++;
  if (!statTimers.has(id)) statTimers.set(id, setTimeout(() => { statTimers.delete(id); send('stats', statsPayload(id)); }, 250));
}

// ---------------------------------------------------------------- helpers
const TWO_PART_TLDS = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu', 'ne', 'or', 'go']);
function baseDomain(host) {
  const p = (host || '').toLowerCase().split('.');
  if (p.length <= 2 || /^\d+$/.test(p[p.length - 1])) return p.join('.');
  if (p[p.length - 1].length === 2 && TWO_PART_TLDS.has(p[p.length - 2])) return p.slice(-3).join('.');
  return p.slice(-2).join('.');
}
const isLocal = h => h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.onion') ||
  /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^\[?::1\]?$/.test(h);
function topUrlOf(details) {
  try {
    if (details.webContentsId == null) return null;
    const wc = webContents.fromId(details.webContentsId);
    return wc ? new URL(wc.getURL()) : null;
  } catch { return null; }
}
const shieldsUpFor = host => !host || !settings.shieldsDownSites.includes(host);
function headerKey(headers, name) {
  name = name.toLowerCase();
  return Object.keys(headers).find(k => k.toLowerCase() === name);
}

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|mc_cid|mc_eid|yclid|_hsenc|_hsmi|mkt_tok|igshid|si|twclid|ttclid|li_fat_id|vero_id|oly_anon_id|oly_enc_id|rb_clickid|s_cid|ref_src|__s|_openstat|wickedid)$/i;
function stripParams(u) {
  let changed = false;
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) { u.searchParams.delete(key); changed = true; }
  }
  return changed;
}

// ---------------------------------------------------------------- Tor
function probePort(port) {
  return new Promise(resolve => {
    const s = net.connect({ host: '127.0.0.1', port });
    const done = ok => { s.destroy(); resolve(ok); };
    s.setTimeout(800);
    s.on('connect', () => done(true));
    s.on('error', () => done(false));
    s.on('timeout', () => done(false));
  });
}
async function torStatus() {
  const running = await probePort(settings.torPort);
  return { enabled: settings.torMode, port: settings.torPort, running, managed: !!torProcess };
}
function startTorProcess() {
  if (torProcess || !settings.torPath || !fs.existsSync(settings.torPath)) return;
  try {
    const dataDir = path.join(app.getPath('temp'), 'priestsurf-tor');
    torProcess = spawn(settings.torPath, ['--SocksPort', String(settings.torPort), '--DataDirectory', dataDir], { windowsHide: true });
    torProcess.on('exit', () => { torProcess = null; torStatus().then(s => send('tor-changed', s)); });
  } catch (e) { console.error('Failed to start tor:', e); torProcess = null; }
}
async function applyProxy() {
  const ses = session.fromPartition(PARTITION);
  if (settings.torMode) {
    startTorProcess();
    // Fail closed: if Tor is not reachable, requests fail instead of going out directly.
    // Chromium's socks5 proxy resolves hostnames on the proxy side, so DNS doesn't leak.
    await ses.setProxy({ proxyRules: `socks5://127.0.0.1:${settings.torPort}` });
  } else {
    await ses.setProxy({ mode: 'direct' });
  }
  await ses.closeAllConnections();
  await ses.clearHostResolverCache();
}

// ---------------------------------------------------------------- browsing session
function setupBrowsingSession() {
  const ses = session.fromPartition(PARTITION);
  ses.setUserAgent(UA, 'en-US,en');
  ses.setSpellCheckerEnabled(false); // spell-check dictionaries are downloaded from Google

  ses.webRequest.onBeforeRequest((d, cb) => {
    let url;
    try { url = new URL(d.url); } catch { return cb({}); }
    const proto = url.protocol;
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(proto)) return cb({});
    const isMain = d.resourceType === 'mainFrame';
    const top = isMain ? url : topUrlOf(d);
    const shields = shieldsUpFor(top && top.hostname);
    const wcId = d.webContentsId;

    // 1. HTTPS-only
    if (settings.httpsOnly && (proto === 'http:' || proto === 'ws:') && !isLocal(url.hostname) && !insecureAllowed.has(url.hostname)) {
      url.protocol = proto === 'http:' ? 'https:' : 'wss:';
      bump(wcId, 'upgraded');
      return cb({ redirectURL: url.toString() });
    }
    // 2. Tracker blocking (never on the page the user navigated to)
    if (shields && settings.blockTrackers && !isMain) {
      const hit = isTracker(url.hostname);
      if (hit && (!top || baseDomain(url.hostname) !== baseDomain(top.hostname))) {
        bump(wcId, 'trackers', hit);
        return cb({ cancel: true });
      }
    }
    // 3. Strip tracking parameters from navigations
    if (shields && settings.stripTrackingParams && (isMain || d.resourceType === 'subFrame') && stripParams(url)) {
      bump(wcId, 'params');
      return cb({ redirectURL: url.toString() });
    }
    cb({});
  });

  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    const h = d.requestHeaders;
    for (const k of Object.keys(h)) {
      const lk = k.toLowerCase();
      if (lk === 'user-agent' || lk === 'accept-language' || lk.startsWith('sec-ch-ua-')) delete h[k];
    }
    h['User-Agent'] = UA;
    h['Accept-Language'] = 'en-US,en;q=0.9';
    if (settings.sendGPC) { h['Sec-GPC'] = '1'; h['DNT'] = '1'; }

    let url, top;
    try { url = new URL(d.url); } catch { return cb({ requestHeaders: h }); }
    top = d.resourceType === 'mainFrame' ? null : topUrlOf(d);
    if (top && /^https?:$/.test(top.protocol) && baseDomain(top.hostname) !== baseDomain(url.hostname)) {
      // Third-party request: drop cookies, trim referrer to origin
      if (settings.blockThirdPartyCookies && shieldsUpFor(top.hostname)) {
        const ck = headerKey(h, 'cookie');
        if (ck) { delete h[ck]; bump(d.webContentsId, 'cookies'); }
      }
      const rk = headerKey(h, 'referer');
      if (rk) { try { h[rk] = new URL(h[rk]).origin + '/'; } catch { delete h[rk]; } }
    }
    cb({ requestHeaders: h });
  });

  ses.webRequest.onHeadersReceived((d, cb) => {
    const top = d.resourceType === 'mainFrame' ? null : topUrlOf(d);
    if (!top || !settings.blockThirdPartyCookies || !shieldsUpFor(top.hostname)) return cb({});
    let host; try { host = new URL(d.url).hostname; } catch { return cb({}); }
    if (baseDomain(host) === baseDomain(top.hostname)) return cb({});
    const headers = { ...d.responseHeaders };
    const sk = headerKey(headers, 'set-cookie');
    if (!sk) return cb({});
    delete headers[sk];
    bump(d.webContentsId, 'cookies');
    cb({ responseHeaders: headers });
  });

  // Permissions: deny by default, ask the user, remember only for this session.
  const ALWAYS = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (ALWAYS.has(permission)) return callback(true);
    let origin = '';
    try { origin = new URL(details.requestingUrl || wc.getURL()).origin; } catch {}
    const key = `${origin}|${permission}`;
    if (sitePerms.has(key)) return callback(sitePerms.get(key));
    const id = ++permSeq;
    pendingPerms.set(id, { callback, key });
    send('permission-request', { id, origin, permission, wcId: wc.id });
  });
  ses.setPermissionCheckHandler((_wc, permission, origin) =>
    ALWAYS.has(permission) || sitePerms.get(`${origin}|${permission}`) === true);

  ses.on('will-download', (_e, item) => {
    send('toast', `Downloading ${item.getFilename()}`);
    item.once('done', (_ev, state) => send('toast', state === 'completed' ? `Downloaded ${item.getFilename()}` : `Download ${state}: ${item.getFilename()}`));
  });
}

async function newIdentity() {
  const ses = session.fromPartition(PARTITION);
  await ses.clearStorageData();
  await ses.clearCache();
  await ses.clearAuthCache();
  await ses.clearHostResolverCache();
  await ses.closeAllConnections();
  sitePerms.clear();
  insecureAllowed.clear();
  stats.clear();
  sessionBlocked = 0;
  fpSeed = crypto.randomInt(1, 2 ** 31);
  return true;
}

// ---------------------------------------------------------------- shortcuts & web contents
function shortcutFor(input) {
  if (input.type !== 'keyDown') return null;
  const ctrl = input.control || input.meta;
  const k = (input.key || '').toLowerCase();
  if (ctrl && input.shift) {
    if (k === 't') return 'reopen-tab';
    if (k === 'u') return 'new-identity';
    if (k === 'tab') return 'prev-tab';
    if (k === 'r') return 'hard-reload';
    if (k === 'b') return 'bookmarks';
    if (k === 'p') return 'privacy';
    if (k === 'm') return 'phone';
    return null;
  }
  if (ctrl) {
    const map = { t: 'new-tab', w: 'close-tab', l: 'focus-omnibox', r: 'reload', f: 'find', d: 'bookmark', tab: 'next-tab', '=': 'zoom-in', '+': 'zoom-in', '-': 'zoom-out', '0': 'zoom-reset', j: 'assistant', ',': 'settings' };
    if (map[k]) return map[k];
    if (/^[1-9]$/.test(k)) return 'tab-' + k;
    return null;
  }
  if (input.alt && k === 'arrowleft') return 'back';
  if (input.alt && k === 'arrowright') return 'forward';
  if (input.alt && k === 'r') return 'reader';
  if (k === 'f5') return 'reload';
  if (k === 'f11') return 'fullscreen';
  return null;
}

function contextMenuFor(contents, p) {
  const items = [];
  if (p.linkURL) {
    items.push({ label: 'Open link in new tab', click: () => send('open-tab', { url: p.linkURL, background: true }) });
    items.push({ label: 'Copy link (cleaned)', click: () => { try { const u = new URL(p.linkURL); stripParams(u); clipboard.writeText(u.toString()); } catch { clipboard.writeText(p.linkURL); } } });
    if (settings.phoneLink) items.push({ label: 'Send link to phone', click: () => { phoneLink.pushToPhone({ title: p.linkText || p.linkURL, url: p.linkURL }); send('toast', 'Sent to your phone'); } });
    items.push({ type: 'separator' });
  }
  if (p.hasImageContents && p.srcURL) {
    items.push({ label: 'Open image in new tab', click: () => send('open-tab', { url: p.srcURL, background: true }) });
    items.push({ label: 'Save image as…', click: () => contents.downloadURL(p.srcURL) });
    items.push({ type: 'separator' });
  }
  if (p.selectionText) {
    const sel = p.selectionText.trim().slice(0, 300);
    items.push({ label: 'Copy', role: 'copy' });
    items.push({ label: `Search privately for “${sel.length > 30 ? sel.slice(0, 30) + '…' : sel}”`, click: () => send('search-selection', sel) });
    items.push({ label: 'Ask the assistant about this', click: () => send('assistant-ask', sel) });
    items.push({ type: 'separator' });
  }
  if (p.isEditable) {
    items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' });
  }
  items.push({ label: 'Back', enabled: contents.navigationHistory?.canGoBack?.() ?? contents.canGoBack(), click: () => contents.goBack() });
  items.push({ label: 'Reload', click: () => contents.reload() });
  items.push({ label: 'Reader mode', click: () => send('shortcut', 'reader') });
  items.push({ label: 'Summarize page', click: () => send('shortcut', 'summarize') });
  items.push({ type: 'separator' });
  items.push({ label: 'Inspect element', click: () => contents.inspectElement(p.x, p.y) });
  Menu.buildFromTemplate(items).popup();
}

app.on('web-contents-created', (_e, contents) => {
  try { contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp'); } catch {}

  contents.on('before-input-event', (event, input) => {
    const s = shortcutFor(input);
    if (s) { event.preventDefault(); send('shortcut', s); }
  });

  contents.on('will-attach-webview', (_ev, wp, params) => {
    wp.preload = path.join(__dirname, 'src', 'protect.js');
    wp.nodeIntegration = false;
    wp.nodeIntegrationInSubFrames = true; // run fingerprint protection in iframes too
    wp.contextIsolation = false;          // protection must patch the page's own world before page scripts run
    wp.sandbox = true;
    wp.webSecurity = true;
    wp.spellcheck = false;
    params.partition = PARTITION;
    if (!/^(https?:|file:|about:blank)/.test(params.src || '')) params.src = 'about:blank';
  });

  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url, disposition }) => {
      if (/^https?:/.test(url)) send('open-tab', { url, background: disposition === 'background-tab' });
      return { action: 'deny' };
    });
    contents.on('context-menu', (_ev, p) => contextMenuFor(contents, p));
    contents.on('did-start-navigation', (ev, url, isInPlace, isMainFrame) => {
      const main = ev.isMainFrame ?? isMainFrame;
      const same = ev.isSameDocument ?? isInPlace;
      if (main && !same) { stats.delete(contents.id); send('stats', statsPayload(contents.id)); }
    });
    contents.on('destroyed', () => stats.delete(contents.id));
  }
});

// ---------------------------------------------------------------- IPC
ipcMain.on('fp-config', (e, host) => {
  e.returnValue = { enabled: settings.fingerprintProtection && shieldsUpFor(host), seed: fpSeed };
});
ipcMain.handle('settings-get', () => publicSettings());
ipcMain.handle('settings-set', async (_e, patch) => {
  const p = { ...patch };
  if ('claudeApiKey' in p) {
    const key = String(p.claudeApiKey || '').trim();
    settings.claudeApiKeyEnc = key && safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key).toString('base64') : '';
    delete p.claudeApiKey;
  }
  delete p.claudeApiKeyEnc; delete p.hasApiKey; delete p.phoneToken; delete p.phoneLink;
  const torChanged = ('torMode' in p && p.torMode !== settings.torMode) || ('torPort' in p && p.torPort !== settings.torPort);
  Object.assign(settings, p);
  saveSettings();
  if (torChanged) { await applyProxy(); send('tor-changed', await torStatus()); }
  return publicSettings();
});
ipcMain.handle('tor-status', () => torStatus());
async function setTorMode(on) {
  settings.torMode = !!on; saveSettings();
  await applyProxy();
  if (on) for (let i = 0; i < 20 && !(await probePort(settings.torPort)); i++) await new Promise(r => setTimeout(r, 500));
  const s = await torStatus(); send('tor-changed', s); return s;
}
ipcMain.handle('tor-set', (_e, on) => setTorMode(on));

// ---- Phone Link
const MOBILE_DIR = path.join(__dirname, 'src', 'mobile');
const phoneLink = createPhoneLink({
  settings: () => settings,
  saveSettings,
  send,
  torStatus,
  setTor: setTorMode,
  sessionBlocked: () => sessionBlocked,
  files: {
    '/index.html': path.join(MOBILE_DIR, 'index.html'),
    '/app.js': path.join(MOBILE_DIR, 'app.js'),
    '/style.css': path.join(MOBILE_DIR, 'style.css'),
    '/manifest.webmanifest': path.join(MOBILE_DIR, 'manifest.webmanifest'),
    '/smart.js': path.join(__dirname, 'src', 'ui', 'smart.js'),
    '/icon.png': path.join(__dirname, 'build', 'icon.png')
  }
});
ipcMain.handle('phone-status', () => phoneLink.status());
ipcMain.handle('phone-set', async (_e, on) => {
  settings.phoneLink = !!on; saveSettings();
  if (on) { if (!(await phoneLink.start())) { settings.phoneLink = false; saveSettings(); throw new Error(`Port ${PHONE_PORT} is in use by another program.`); } }
  else phoneLink.stop();
  return phoneLink.status();
});
ipcMain.handle('phone-unpair', () => { phoneLink.unpairAll(); return phoneLink.status(); });
ipcMain.handle('phone-push', (_e, item) => phoneLink.pushToPhone(item));
ipcMain.on('phone-tabs', (_e, list) => phoneLink.setTabs(list));
ipcMain.handle('new-identity', () => newIdentity());
ipcMain.handle('stats-get', (_e, id) => statsPayload(id));
ipcMain.handle('shields-toggle', (_e, host) => {
  const list = settings.shieldsDownSites;
  const i = list.indexOf(host);
  if (i >= 0) list.splice(i, 1); else list.push(host);
  saveSettings();
  return i >= 0; // true => shields are now up
});
// Runs reader/summary scripts immediately, even while a heavy page is still loading
// (webview.executeJavaScript waits for the load to finish).
ipcMain.handle('page-exec', (e, wcId, code) => {
  if (!win || e.sender !== win.webContents) throw new Error('Not allowed');
  const wc = webContents.fromId(wcId);
  if (!wc || wc.getType() !== 'webview') throw new Error('Tab not found');
  return wc.mainFrame.executeJavaScript(code);
});
ipcMain.handle('allow-insecure', (_e, host) => { insecureAllowed.add(host); return true; });
ipcMain.handle('permission-respond', (_e, id, allow) => {
  const p = pendingPerms.get(id);
  if (!p) return false;
  pendingPerms.delete(id);
  sitePerms.set(p.key, !!allow);
  p.callback(!!allow);
  return true;
});
ipcMain.handle('ai-ask', async (_e, { prompt, context }) => {
  if (!settings.aiEnabled) throw new Error('The AI assistant is turned off in Settings.');
  const key = getApiKey();
  if (!key) throw new Error('Add your Claude API key in Settings to use the AI assistant.');
  const ses = session.fromPartition(PARTITION); // goes through Tor when Tor mode is on
  const res = await ses.fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-5-5',
      max_tokens: 1200,
      system: 'You are the built-in assistant of PriestSurf, a privacy-first web browser. Answer concisely and accurately using the provided page content when relevant. Use short paragraphs or bullet points.',
      messages: [{ role: 'user', content: `${context ? `Current page content:\n"""\n${String(context).slice(0, 60000)}\n"""\n\n` : ''}${prompt}` }]
    })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Request failed (${res.status})`);
  return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
});

// ---------------------------------------------------------------- app
function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 860, minWidth: 640, minHeight: 420,
    backgroundColor: settings.theme === 'light' ? '#f6f5fb' : '#0f0e17',
    title: 'PriestSurf',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'ui-preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'ui', 'index.html'));
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  loadSettings();
  Menu.setApplicationMenu(null);
  // The browser UI itself never touches the network: block everything but local files.
  session.defaultSession.setSpellCheckerEnabled(false);
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(file|devtools|data|blob|chrome|chrome-extension):/.test(d.url) }));
  setupBrowsingSession();
  if (process.env.PRIESTSURF_DEMO_DIR) serveDemoSite(process.env.PRIESTSURF_DEMO_DIR);
  await applyProxy();
  createWindow();
  if (settings.phoneLink) phoneLink.start();
  if (process.env.PRIESTSURF_SELFTEST) selfTest(process.env.PRIESTSURF_SELFTEST);
});

// Developer option for marketing screenshots: serves PRIESTSURF_DEMO_DIR/index.html at
// https://www.theopenledger.example (a reserved, fictional domain). Everything else passes through.
function serveDemoSite(dir) {
  const { net } = require('electron');
  const { pathToFileURL } = require('url');
  session.fromPartition(PARTITION).protocol.handle('https', req => {
    const host = new URL(req.url).hostname;
    if (host === 'www.theopenledger.example') return net.fetch(pathToFileURL(path.join(dir, 'index.html')).toString());
    // Intercepted requests lose their tab id, so count blocked trackers against the open tab here.
    const hit = settings.blockTrackers && isTracker(host);
    if (hit) {
      const tab = webContents.getAllWebContents().find(w => w.getType() === 'webview');
      if (tab) bump(tab.id, 'trackers', hit);
      return new Response(null, { status: 204 });
    }
    return net.fetch(req, { bypassCustomProtocolHandlers: true });
  });
}

// Developer self-test: `PRIESTSURF_SELFTEST=<url> npm start` loads a page, saves a
// screenshot and the privacy stats next to the app, then quits.
async function selfTest(url) {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(2500);
  const wv = webContents.getAllWebContents().find(w => w.getType() === 'webview');
  if (!wv) { console.log('SELFTEST: no webview'); return app.quit(); }
  console.log('SELFTEST loading', url);
  await Promise.race([wv.loadURL(url).catch(e => console.log('SELFTEST load error', e.message)), wait(15000)]);
  await wait(4000);
  console.log('SELFTEST now at', wv.getURL(), 'loading:', wv.isLoading());
  const fp = await Promise.race([wait(5000).then(() => 'executeJavaScript timed out'), wv.executeJavaScript('({ua:navigator.userAgent,cores:navigator.hardwareConcurrency,screen:screen.width+"x"+screen.height,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,gpc:navigator.globalPrivacyControl,toStr:HTMLCanvasElement.prototype.toDataURL.toString()})').catch(e => e.message)]);
  console.log('SELFTEST url:', wv.getURL());
  console.log('SELFTEST fingerprint:', JSON.stringify(fp));
  console.log('SELFTEST stats:', JSON.stringify(statsPayload(wv.id)));
  send('shortcut', process.env.PRIESTSURF_SELFTEST_SHORTCUT || 'summarize');
  await wait(3000);
  const panel = await win.webContents.executeJavaScript(`({ open: !document.querySelector('#panel').hidden, title: document.querySelector('#panelTitle').textContent, images: document.querySelectorAll('#panelBody img').length, text: document.querySelector('#panelBody').innerText.replace(/\\s+/g, ' ').slice(0, 400) })`).catch(e => e.message);
  console.log('SELFTEST panel:', JSON.stringify(panel));
  const img = await win.webContents.capturePage();
  // A packaged app's folder is a read-only archive, so save the screenshot to temp there.
  const shot = path.join(app.isPackaged ? app.getPath('temp') : __dirname, 'selftest.png');
  fs.writeFileSync(shot, img.toPNG());
  console.log('SELFTEST screenshot saved', shot);
  app.quit();
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { if (torProcess) torProcess.kill(); phoneLink.stop(); });
