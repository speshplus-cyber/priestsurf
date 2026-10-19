'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const root = document.documentElement;

  // Theme: follow the system unless the visitor picked one (kept only in this browser).
  const saved = (() => { try { return localStorage.getItem('ps-theme'); } catch { return null; } })();
  const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  root.dataset.theme = saved || (systemLight ? 'light' : 'dark');
  $('#themeBtn').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('ps-theme', root.dataset.theme); } catch {}
  });

  // Mobile menu
  const menuBtn = $('#menuBtn'), links = $('#links');
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', e => { if (e.target.closest('a')) { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); } });

  // Let non-Windows visitors know before they download a Windows file.
  const ua = navigator.userAgent;
  const isWindows = /Windows/i.test(ua);
  const isPhone = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isWindows) {
    const note = $('#osNote');
    note.hidden = false;
    note.textContent = isPhone
      ? 'You\'re on a phone. Download PriestSurf on your Windows PC, then pair this phone using the phone button in PriestSurf.'
      : 'PriestSurf currently runs on Windows 10 and 11. Mac and Linux versions aren\'t available yet.';
  }

  // Toast
  const toast = $('#toast');
  let t;
  const show = msg => { toast.textContent = msg; toast.hidden = false; clearTimeout(t); t = setTimeout(() => { toast.hidden = true; }, 2400); };

  // Copy checksum
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const text = document.getElementById(btn.dataset.copy).textContent.trim();
    try { await navigator.clipboard.writeText(text); show('Checksum copied'); } catch { show('Select the checksum and copy it manually'); }
  }));

  // Friendly hint after a download starts
  document.querySelectorAll('[data-dl]').forEach(a => a.addEventListener('click', () => {
    show(a.dataset.dl === 'setup' ? 'Downloading… open the file when it finishes to install PriestSurf' : 'Downloading the portable version…');
  }));
})();
