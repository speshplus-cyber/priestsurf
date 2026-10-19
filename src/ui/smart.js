'use strict';
// PriestSurf on-device intelligence: smart address bar, calculator, unit conversion,
// !bang shortcuts, page summarization and page Q&A. Nothing here touches the network.
(function () {
  const ENGINES = {
    duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=' },
    startpage: { name: 'Startpage', url: 'https://www.startpage.com/do/search?q=' },
    mojeek: { name: 'Mojeek', url: 'https://www.mojeek.com/search?q=' },
    qwant: { name: 'Qwant', url: 'https://www.qwant.com/?q=' },
    ddgonion: { name: 'DuckDuckGo (.onion, Tor only)', url: 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/?q=' },
    google: { name: 'Google (not private)', url: 'https://www.google.com/search?q=' }
  };

  const BANGS = {
    w: ['Wikipedia', 'https://en.wikipedia.org/wiki/Special:Search?search='],
    yt: ['YouTube', 'https://www.youtube.com/results?search_query='],
    gh: ['GitHub', 'https://github.com/search?q='],
    so: ['Stack Overflow', 'https://stackoverflow.com/search?q='],
    r: ['Reddit', 'https://www.reddit.com/search/?q='],
    a: ['Amazon', 'https://www.amazon.com/s?k='],
    maps: ['OpenStreetMap', 'https://www.openstreetmap.org/search?query='],
    img: ['Image search', 'https://duckduckgo.com/?ia=images&iax=images&q='],
    news: ['News', 'https://duckduckgo.com/?ia=news&iar=news&q='],
    tr: ['Translate', 'https://translate.google.com/?sl=auto&tl=en&text='],
    def: ['Dictionary', 'https://en.wiktionary.org/wiki/Special:Search?search='],
    npm: ['npm', 'https://www.npmjs.com/search?q='],
    mdn: ['MDN', 'https://developer.mozilla.org/en-US/search?q='],
    arxiv: ['arXiv', 'https://arxiv.org/a/search?query='],
    b: ['Brave Search', 'https://search.brave.com/search?q='],
    ddg: ['DuckDuckGo', 'https://duckduckgo.com/?q='],
    sp: ['Startpage', 'https://www.startpage.com/do/search?q=']
  };

  // ---------- URL detection
  function asUrl(text) {
    const t = text.trim();
    if (!t || /\s/.test(t)) return null;
    if (/^(https?|file):\/\//i.test(t)) return t;
    if (/^about:blank$/i.test(t)) return t;
    if (/^localhost(:\d+)?(\/.*)?$/i.test(t) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(t)) return 'http://' + t;
    if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(t)) return 'https://' + t;
    return null;
  }

  // ---------- Calculator (whitelisted characters only)
  function calc(text) {
    let t = text.trim().replace(/^=/, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
    if (!/[\d)]\s*([+\-*/%]|\*\*)\s*[\d(.]/.test(t) && !/^(sqrt|sin|cos|tan|log|ln|abs|round|pi)\b/i.test(t)) return null;
    if (!/^[\d\s+\-*/%().,]*$/.test(t.replace(/\b(sqrt|sin|cos|tan|log|ln|abs|round|pi|e)\b/gi, ''))) return null;
    t = t.replace(/,/g, '')
      .replace(/\bpi\b/gi, 'Math.PI').replace(/\be\b/g, 'Math.E')
      .replace(/\bln\b/gi, 'Math.log').replace(/\blog\b/gi, 'Math.log10')
      .replace(/\b(sqrt|sin|cos|tan|abs|round)\b/gi, m => 'Math.' + m.toLowerCase());
    try {
      const v = Function('"use strict";return (' + t + ')')();
      if (typeof v !== 'number' || !isFinite(v)) return null;
      return +v.toPrecision(12);
    } catch { return null; }
  }

  // ---------- Unit conversion
  const UNITS = {
    length: { m: 1, meter: 1, meters: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, mile: 1609.344, miles: 1609.344, ft: 0.3048, feet: 0.3048, foot: 0.3048, in: 0.0254, inch: 0.0254, inches: 0.0254, yd: 0.9144, yard: 0.9144, yards: 0.9144 },
    mass: { kg: 1, g: 0.001, gram: 0.001, grams: 0.001, mg: 1e-6, lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237, oz: 0.0283495, ounce: 0.0283495, ounces: 0.0283495, t: 1000, ton: 1000, tonnes: 1000 },
    volume: { l: 1, liter: 1, liters: 1, litre: 1, ml: 0.001, gal: 3.78541, gallon: 3.78541, gallons: 3.78541, cup: 0.236588, cups: 0.236588, floz: 0.0295735, pt: 0.473176, qt: 0.946353 },
    speed: { kmh: 1, 'km/h': 1, kph: 1, mph: 1.609344, 'm/s': 3.6, ms: 3.6, knot: 1.852, knots: 1.852 },
    data: { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1048576, gib: 1073741824 },
    time: { s: 1, sec: 1, seconds: 1, min: 60, minutes: 60, h: 3600, hr: 3600, hours: 3600, day: 86400, days: 86400, week: 604800, weeks: 604800, year: 31557600, years: 31557600 }
  };
  const TEMP = { c: 'C', celsius: 'C', f: 'F', fahrenheit: 'F', k: 'K', kelvin: 'K' };
  function convert(text) {
    const m = text.trim().toLowerCase().match(/^(-?[\d.,]+)\s*([a-z/°]+)\s+(?:to|in|into|=)\s+([a-z/°]+)$/);
    if (!m) return null;
    const v = parseFloat(m[1].replace(/,/g, ''));
    const from = m[2].replace('°', ''), to = m[3].replace('°', '');
    if (TEMP[from] && TEMP[to]) {
      const a = TEMP[from], b = TEMP[to];
      const c = a === 'C' ? v : a === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
      const out = b === 'C' ? c : b === 'F' ? c * 9 / 5 + 32 : c + 273.15;
      return `${v}°${a} = ${+out.toFixed(2)}°${b}`;
    }
    for (const table of Object.values(UNITS)) {
      if (table[from] && table[to]) return `${v} ${m[2]} = ${+(v * table[from] / table[to]).toPrecision(8)} ${m[3]}`;
    }
    return null;
  }

  function searchUrl(q, engine) { return (ENGINES[engine] || ENGINES.duckduckgo).url + encodeURIComponent(q); }

  function bang(text) {
    const m = text.trim().match(/^!(\w+)\s+(.+)$|^(.+?)\s+!(\w+)$/);
    if (!m) return null;
    const key = (m[1] || m[4]).toLowerCase(), q = m[2] || m[3];
    if (!BANGS[key]) return null;
    return { name: BANGS[key][0], url: BANGS[key][1] + encodeURIComponent(q), q };
  }

  // Resolve what Enter should do with the typed text.
  function resolve(text, settings) {
    const b = bang(text); if (b) return { url: b.url };
    const u = asUrl(text); if (u) return { url: u };
    return { url: searchUrl(text.trim(), settings.searchEngine) };
  }

  // Suggestions for the dropdown (all computed locally — nothing is sent to a search engine while typing).
  function suggest(text, { settings, tabs, bookmarks, activeId }) {
    const t = text.trim();
    if (!t) return [];
    const out = [];
    const c = calc(t); if (c !== null) out.push({ kind: 'calc', label: `= ${c.toLocaleString('en-US', { maximumFractionDigits: 10 })}`, sub: 'Calculator · Enter to copy', copy: String(c) });
    const cv = convert(t); if (cv) out.push({ kind: 'calc', label: cv, sub: 'Unit conversion · Enter to copy', copy: cv.split('= ')[1] });
    const b = bang(t); if (b) out.push({ kind: 'bang', label: `Search ${b.name} for “${b.q}”`, sub: 'Bang shortcut', url: b.url });
    const u = asUrl(t); if (u) out.push({ kind: 'url', label: u, sub: 'Go to site', url: u });
    if (!b) out.push({ kind: 'search', label: t, sub: `Search privately with ${(ENGINES[settings.searchEngine] || ENGINES.duckduckgo).name}`, url: searchUrl(t, settings.searchEngine) });
    const lower = t.toLowerCase();
    for (const tab of tabs) {
      if (tab.id === activeId || !tab.url || tab.isNewTab) continue;
      if ((tab.title || '').toLowerCase().includes(lower) || tab.url.toLowerCase().includes(lower)) out.push({ kind: 'tab', label: tab.title || tab.url, sub: 'Switch to open tab', tabId: tab.id });
    }
    for (const bm of bookmarks) {
      if (bm.title.toLowerCase().includes(lower) || bm.url.toLowerCase().includes(lower)) out.push({ kind: 'bookmark', label: bm.title, sub: bm.url, url: bm.url });
    }
    if (t.length > 1 && !t.startsWith('!')) {
      for (const [k, [name]] of Object.entries(BANGS)) if (k.startsWith(lower) && lower.length >= 1 && out.length < 9 && k.length > 1) out.push({ kind: 'hint', label: `!${k} — ${name}`, sub: 'Bang shortcut (type “!' + k + ' your search”)', fill: '!' + k + ' ' });
    }
    return out.slice(0, 9);
  }

  // ---------- Text intelligence
  const STOP = new Set('a about above after again against all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours yourself yourselves also may might must one two new like get got said says use used using many much make made way well even back still however within without across per via de la le et des les du un une'.split(' '));
  const words = s => (s.toLowerCase().match(/[a-z0-9À-ɏ']+/g) || []).filter(w => w.length > 2 && !STOP.has(w));
  const sentencesOf = text => (text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [])
    .map(s => s.trim()).filter(s => s.length > 40 && s.length < 600 && s.split(' ').length > 6);

  function summarize(text, n) {
    const sents = sentencesOf(text);
    const wc = (text.match(/\S+/g) || []).length;
    const freq = new Map();
    for (const w of words(text)) freq.set(w, (freq.get(w) || 0) + 1);
    const maxF = Math.max(1, ...freq.values());
    const scored = sents.map((s, i) => {
      const ws = words(s);
      const sc = ws.reduce((a, w) => a + (freq.get(w) || 0) / maxF, 0) / Math.pow(ws.length || 1, 0.6);
      return { s, i, sc: sc * (i < 3 ? 1.25 : 1) };
    });
    const k = n || Math.min(7, Math.max(3, Math.round(sents.length / 12)));
    const picked = [...scored].sort((a, b) => b.sc - a.sc).slice(0, k).sort((a, b) => a.i - b.i).map(x => x.s);
    const keywords = [...freq.entries()].filter(([w]) => !/^\d+$/.test(w)).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
    return { points: picked, keywords, words: wc, minutes: Math.max(1, Math.round(wc / 230)) };
  }

  function answer(question, text) {
    const q = words(question);
    if (!q.length) return [];
    const sents = sentencesOf(text);
    return sents.map((s, i) => {
      const ws = new Set(words(s));
      let hit = 0; for (const w of q) if (ws.has(w) || [...ws].some(x => x.startsWith(w.slice(0, 5)) && w.length > 4)) hit++;
      return { s, i, sc: hit / q.length + hit * 0.05 };
    }).filter(x => x.sc > 0.3).sort((a, b) => b.sc - a.sc).slice(0, 3).map(x => x.s);
  }

  window.Smart = { ENGINES, BANGS, resolve, suggest, summarize, answer, asUrl, searchUrl };
})();
