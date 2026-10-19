'use strict';
// Functions that are serialized and run inside web pages via webview.executeJavaScript.
(function () {
  // Finds the main content of a page and returns its readable text.
  function extract() {
    const pick = () => {
      const cand = document.querySelector('article, main, [role=main], #content, .post, .article');
      if (cand && cand.innerText && cand.innerText.length > 600) return cand;
      let best = document.body, bestScore = 0;
      document.querySelectorAll('div, section, td').forEach(el => {
        let s = 0;
        for (const p of el.children) if (p.tagName === 'P') s += p.innerText.length;
        if (s > bestScore) { bestScore = s; best = el; }
      });
      return best;
    };
    const root = pick() || document.body;
    const desc = document.querySelector('meta[name=description], meta[property="og:description"]');
    // Prefer real prose (paragraphs, list items, quotes) over menus and toolbars inside the content area.
    const prose = [...root.querySelectorAll('p, li, blockquote, h2, h3')]
      .filter(el => !el.closest('nav, header, footer, aside, form, [role=navigation], [aria-hidden=true], .navbox, .infobox, .toc, .mw-editsection'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 40)
      .join('\n');
    return {
      title: document.title,
      url: location.href,
      description: desc ? desc.content : '',
      text: (prose.length > 400 ? prose : (root.innerText || '')).slice(0, 200000),
      fullText: (document.body ? document.body.innerText : '').slice(0, 200000)
    };
  }

  // Toggles a clean, distraction-free reader overlay.
  function reader(opts) {
    const existing = document.getElementById('__priestsurf_reader');
    if (existing) { existing.remove(); document.documentElement.style.overflow = ''; return false; }
    const cand = document.querySelector('article, main, [role=main]');
    let root = cand && cand.innerText.length > 600 ? cand : null;
    if (!root) {
      let bestScore = 0; root = document.body;
      document.querySelectorAll('div, section, td').forEach(el => {
        let s = 0; for (const p of el.children) if (p.tagName === 'P') s += p.innerText.length;
        if (s > bestScore) { bestScore = s; root = el; }
      });
    }
    const dark = opts.theme !== 'light';
    const host = document.createElement('div');
    host.id = '__priestsurf_reader';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:' + (dark ? '#14131c' : '#fbf8f1');
    const sh = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial}
      .wrap{max-width:720px;margin:0 auto;padding:56px 24px 120px;font:19px/1.75 Georgia,'Iowan Old Style',serif;color:${dark ? '#e6e3f0' : '#2b2622'}}
      h1{font:700 34px/1.25 system-ui,sans-serif;margin:0 0 8px} h2,h3,h4{font-family:system-ui,sans-serif;line-height:1.3;margin:1.6em 0 .4em}
      .meta{font:14px system-ui,sans-serif;opacity:.65;margin-bottom:32px} img{max-width:100%;height:auto;border-radius:8px;margin:12px 0}
      blockquote{border-left:3px solid #b08cff;margin:1em 0;padding-left:16px;opacity:.9} pre{white-space:pre-wrap;font-size:15px;background:${dark ? '#201e2c' : '#efe9dc'};padding:12px;border-radius:8px}
      li{margin:.3em 0} .close{position:fixed;top:16px;right:20px;font:600 14px system-ui;padding:8px 14px;border-radius:999px;border:0;cursor:pointer;background:#b08cff;color:#14131c}`;
    sh.appendChild(style);
    const wrap = document.createElement('div'); wrap.className = 'wrap';
    const h1 = document.createElement('h1'); h1.textContent = document.title; wrap.appendChild(h1);
    const words = (root.innerText.match(/\S+/g) || []).length;
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = location.hostname + ' · ' + Math.max(1, Math.round(words / 230)) + ' min read';
    wrap.appendChild(meta);
    const seen = new Set();
    root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre,img').forEach(el => {
      if (el.closest('nav,footer,aside,form,[role=navigation],[aria-hidden=true]')) return;
      if (el.tagName === 'IMG') {
        const src = el.currentSrc || el.src;
        if (!src || el.naturalWidth < 200 || seen.has(src)) return;
        seen.add(src);
        const img = document.createElement('img'); img.src = src; img.alt = el.alt || ''; wrap.appendChild(img);
        return;
      }
      if (el.tagName === 'LI' && el.querySelector('p')) return;
      const t = el.innerText.trim();
      if (!t || (el.tagName === 'P' && t.length < 25) || seen.has(t)) return;
      seen.add(t);
      const n = document.createElement(el.tagName === 'H1' ? 'h2' : el.tagName.toLowerCase());
      n.textContent = t; wrap.appendChild(n);
    });
    const close = document.createElement('button'); close.className = 'close'; close.textContent = 'Exit reader';
    close.onclick = () => { host.remove(); document.documentElement.style.overflow = ''; };
    sh.appendChild(wrap); sh.appendChild(close);
    document.documentElement.appendChild(host);
    document.documentElement.style.overflow = 'hidden';
    return true;
  }

  window.PageTools = {
    extract: () => '(' + extract.toString() + ')()',
    reader: opts => '(' + reader.toString() + ')(' + JSON.stringify(opts || {}) + ')'
  };
})();
