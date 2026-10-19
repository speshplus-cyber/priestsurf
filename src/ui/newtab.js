'use strict';
// The search box hands the query back to the browser UI through the URL hash.
document.getElementById('f').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('q').value.trim();
  if (q) location.hash = 'q=' + encodeURIComponent(q);
});

window.psInit = function (d) {
  document.documentElement.classList.toggle('light', d.theme === 'light');
  document.getElementById('blocked').textContent = (d.blocked || 0).toLocaleString();
  document.getElementById('tor').textContent = d.tor ? 'On' : 'Off';
  document.getElementById('torStat').classList.toggle('tor', !!d.tor);
  document.getElementById('q').placeholder = 'Search privately with ' + d.engine + '…';
  const tiles = document.getElementById('tiles');
  tiles.textContent = '';
  for (const b of d.bookmarks || []) {
    let host = '';
    try { host = new URL(b.url).hostname.replace(/^www\./, ''); } catch {}
    let h = 0; for (const c of host) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = document.createElement('a');
    a.className = 'tile'; a.href = b.url;
    const av = document.createElement('div');
    av.className = 'av'; av.style.background = `hsl(${h % 360} 60% 52%)`; av.textContent = (host[0] || '•').toUpperCase();
    const t = document.createElement('div'); t.className = 't'; t.textContent = b.title;
    a.append(av, t);
    tiles.appendChild(a);
  }
};
