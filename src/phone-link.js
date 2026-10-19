'use strict';
// PriestSurf Phone Link: a small HTTP server on the local Wi-Fi network that serves the
// phone app (src/mobile) and a token-protected API for controlling the desktop browser.
// Off by default. Pairing = scanning a QR code that carries a random 32-byte token.
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');

const PORT = 47823;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function lanAddress() {
  const candidates = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (/vEthernet|VirtualBox|VMware|WSL|Hyper-V|Loopback|vpn|tap|tun/i.test(name)) continue;
      const score = a.address.startsWith('192.168.') ? 3 : a.address.startsWith('10.') ? 2 : /^172\.(1[6-9]|2\d|3[01])\./.test(a.address) ? 1 : 0;
      if (score) candidates.push({ address: a.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ? candidates[0].address : null;
}

function createPhoneLink(opts) {
  const { settings, saveSettings, files } = opts;
  let server = null;
  let tabs = [];
  const inbox = [];      // links sent from the computer to the phone (memory only)
  const devices = new Map(); // short device label -> last seen
  let failures = 0, lockedUntil = 0;

  const token = () => {
    if (!settings().phoneToken) { settings().phoneToken = crypto.randomBytes(32).toString('base64url'); saveSettings(); }
    return settings().phoneToken;
  };
  const pairUrl = () => {
    const ip = lanAddress();
    return ip ? `http://${ip}:${PORT}/#pair=${token()}` : null;
  };

  function authorized(req) {
    if (Date.now() < lockedUntil) return false;
    const h = req.headers.authorization || '';
    const given = Buffer.from(h.startsWith('Bearer ') ? h.slice(7) : '');
    const expected = Buffer.from(token());
    const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
    if (!ok && ++failures >= 20) { lockedUntil = Date.now() + 60_000; failures = 0; }
    if (ok) failures = 0;
    return ok;
  }

  function deviceLabel(req) {
    const ua = req.headers['user-agent'] || '';
    const m = ua.match(/iPhone|iPad|Android[^;)]*|Windows|Mac OS X|Linux/);
    return (m ? m[0].replace('Mac OS X', 'Mac').trim() : 'Phone') + ' · ' + (req.socket.remoteAddress || '').replace('::ffff:', '');
  }

  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(body));
  };
  const readBody = req => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 64 * 1024) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });
  const validUrl = u => { try { const p = new URL(u); return /^https?:$/.test(p.protocol) ? p.toString() : null; } catch { return null; } };

  async function api(req, res, route) {
    if (!authorized(req)) return json(res, 401, { error: 'Not paired. Scan the QR code in PriestSurf on your computer.' });
    devices.set(deviceLabel(req), Date.now());
    const body = req.method === 'POST' ? await readBody(req).catch(() => null) : {};
    if (body === null) return json(res, 400, { error: 'Bad request' });

    switch (`${req.method} ${route}`) {
      case 'GET /api/state': {
        const s = settings();
        return json(res, 200, {
          computer: os.hostname(),
          tabs, inbox,
          bookmarks: s.bookmarks,
          searchEngine: s.searchEngine,
          tor: await opts.torStatus(),
          blocked: opts.sessionBlocked()
        });
      }
      case 'POST /api/open': {
        const url = validUrl(body.url);
        if (!url) return json(res, 400, { error: 'Only http(s) links can be opened' });
        opts.send('phone-command', { type: 'open', url });
        return json(res, 200, { ok: true });
      }
      case 'POST /api/tab/activate':
        opts.send('phone-command', { type: 'activate', id: Number(body.id) });
        return json(res, 200, { ok: true });
      case 'POST /api/tab/close':
        opts.send('phone-command', { type: 'close', id: Number(body.id) });
        return json(res, 200, { ok: true });
      case 'POST /api/tor':
        return json(res, 200, { tor: await opts.setTor(!!body.on) });
      case 'POST /api/new-identity':
        opts.send('phone-command', { type: 'new-identity' });
        return json(res, 200, { ok: true });
      case 'POST /api/bookmark': {
        const url = validUrl(body.url);
        if (!url) return json(res, 400, { error: 'Invalid link' });
        const s = settings();
        if (!s.bookmarks.some(b => b.url === url)) s.bookmarks.unshift({ title: String(body.title || new URL(url).hostname).slice(0, 200), url });
        saveSettings();
        opts.send('phone-command', { type: 'bookmarks-changed' });
        return json(res, 200, { ok: true });
      }
      case 'POST /api/inbox/clear':
        inbox.length = 0;
        return json(res, 200, { ok: true });
      default:
        return json(res, 404, { error: 'Unknown endpoint' });
    }
  }

  function serveStatic(req, res, route) {
    if (route === '/' ) route = '/index.html';
    const file = files[route];
    if (!file) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(500); return res.end(); }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        // 'unsafe-eval' is only for the calculator in smart.js, which whitelists digits and operators first
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
      });
      res.end(data);
    });
  }

  function handler(req, res) {
    let route;
    try { route = new URL(req.url, 'http://x').pathname; } catch { res.writeHead(400); return res.end(); }
    if (route.startsWith('/api/')) return api(req, res, route).catch(() => json(res, 500, { error: 'Server error' }));
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    serveStatic(req, res, route);
  }

  return {
    start() {
      if (server) return Promise.resolve(true);
      return new Promise(resolve => {
        server = http.createServer(handler);
        server.on('error', err => { console.error('Phone link:', err.message); server = null; resolve(false); });
        server.listen(PORT, '0.0.0.0', () => resolve(true));
      });
    },
    stop() {
      if (!server) return;
      server.close(); server.closeAllConnections?.(); server = null;
    },
    async status() {
      const url = server ? pairUrl() : null;
      return {
        running: !!server,
        port: PORT,
        url,
        qr: url ? await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#14121c', light: '#ffffff' } }) : null,
        devices: [...devices.entries()].map(([name, seen]) => ({ name, seen })).sort((a, b) => b.seen - a.seen),
        inbox: inbox.length
      };
    },
    unpairAll() {
      settings().phoneToken = crypto.randomBytes(32).toString('base64url');
      saveSettings();
      devices.clear();
    },
    setTabs(list) { tabs = Array.isArray(list) ? list.slice(0, 200) : []; },
    pushToPhone(item) {
      const url = validUrl(item && item.url);
      if (!url) return false;
      inbox.unshift({ title: String(item.title || url).slice(0, 200), url, at: Date.now() });
      inbox.length = Math.min(inbox.length, 50);
      return true;
    }
  };
}

module.exports = { createPhoneLink, PHONE_PORT: PORT };
