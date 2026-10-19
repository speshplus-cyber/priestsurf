'use strict';
// Renders build/icon.svg to build/icon.png (256px) and build/icon.ico (16–256px).
// Run with: npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 24, 32, 48, 64, 128, 256];

function toIco(pngs) {
  // ICO container with PNG-compressed entries (supported since Windows Vista).
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map(p => p.data)]);
}

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'), 'utf8');
  const html = `<html><body style="margin:0;background:transparent">${svg}</body></html>`;
  const win = new BrowserWindow({
    width: 256, height: 256, show: false, transparent: true, frame: false, useContentSize: true,
    webPreferences: { offscreen: true }
  });
  win.webContents.setFrameRate(5);
  const frame = new Promise(resolve => {
    let n = 0;
    win.webContents.on('paint', (_e, _dirty, image) => { if (++n >= 2) resolve(image); });
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const image = await frame;
  const base = image.getSize().width === 256 ? image : image.resize({ width: 256, height: 256, quality: 'best' });
  fs.writeFileSync(path.join(__dirname, 'icon.png'), base.toPNG());
  const pngs = SIZES.map(size => ({ size, data: (size === 256 ? base : base.resize({ width: size, height: size, quality: 'best' })).toPNG() }));
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), toIco(pngs));
  console.log('icon.png and icon.ico written');
  app.quit();
});
