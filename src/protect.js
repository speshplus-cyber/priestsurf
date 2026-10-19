'use strict';
// PriestSurf fingerprint protection. Runs in every page and iframe before page scripts.
// Goal (like Tor Browser): make every PriestSurf user report the same values, and add
// per-session noise to readouts that can't be made uniform (canvas, audio).
(function () {
  let cfg;
  try { cfg = require('electron').ipcRenderer.sendSync('fp-config', location.hostname); } catch { cfg = { enabled: true, seed: 1337 }; }
  if (!cfg || !cfg.enabled) return;
  const seed = cfg.seed >>> 0;

  // Deterministic per-session hash so repeated reads give the same (noisy) answer.
  const hash = n => {
    let x = (n ^ seed) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  // Make patched functions look native to Function.prototype.toString checks.
  const nativeToString = Function.prototype.toString;
  const disguised = new WeakMap();
  const toString = function toString() {
    return disguised.has(this) ? `function ${disguised.get(this)}() { [native code] }` : nativeToString.call(this);
  };
  disguised.set(toString, 'toString');
  Object.defineProperty(Function.prototype, 'toString', { value: toString, writable: true, configurable: true });

  const getter = (obj, prop, fn) => {
    try {
      disguised.set(fn, 'get ' + prop);
      Object.defineProperty(obj, prop, { get: fn, configurable: true, enumerable: true });
    } catch {}
  };
  const method = (obj, name, fn) => {
    try {
      disguised.set(fn, name);
      Object.defineProperty(fn, 'name', { value: name });
      Object.defineProperty(obj, name, { value: fn, writable: true, configurable: true });
    } catch {}
  };

  // ---- Navigator: uniform hardware/locale values
  const N = Navigator.prototype;
  getter(N, 'hardwareConcurrency', () => 4);
  getter(N, 'deviceMemory', () => 8);
  getter(N, 'platform', () => 'Win32');
  const langs = Object.freeze(['en-US', 'en']);
  getter(N, 'languages', () => langs);
  getter(N, 'language', () => 'en-US');
  getter(N, 'maxTouchPoints', () => 0);
  getter(N, 'webdriver', () => false);
  getter(N, 'doNotTrack', () => '1');
  getter(N, 'globalPrivacyControl', () => true);
  getter(N, 'connection', () => undefined);
  if ('getBattery' in N) method(N, 'getBattery', function getBattery() { return Promise.reject(new DOMException('Not allowed', 'NotAllowedError')); });
  if (typeof MediaDevices !== 'undefined') {
    method(MediaDevices.prototype, 'enumerateDevices', function enumerateDevices() { return Promise.resolve([]); });
  }

  // ---- Screen: report a common resolution
  const S = Screen.prototype;
  getter(S, 'width', () => 1920);
  getter(S, 'height', () => 1080);
  getter(S, 'availWidth', () => 1920);
  getter(S, 'availHeight', () => 1040);
  getter(S, 'availLeft', () => 0);
  getter(S, 'availTop', () => 0);
  getter(S, 'colorDepth', () => 24);
  getter(S, 'pixelDepth', () => 24);

  // ---- Timezone: everyone is in UTC (as in Tor Browser)
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  method(Intl.DateTimeFormat.prototype, 'resolvedOptions', function resolvedOptions_() {
    const r = resolvedOptions.call(this); r.timeZone = 'UTC'; return r;
  });
  disguised.set(Intl.DateTimeFormat.prototype.resolvedOptions, 'resolvedOptions');
  method(Date.prototype, 'getTimezoneOffset', function getTimezoneOffset() { return 0; });

  // ---- Canvas: per-session noise on readback
  const MAX_PIXELS = 4e6;
  const perturb = data => {
    for (let i = 0; i < data.length; i += 4) {
      const r = hash(i);
      if (r < 0.1) data[i + Math.floor(r * 30)] ^= 1; // flip the lowest bit of one channel in ~10% of pixels
    }
  };
  const C2D = CanvasRenderingContext2D.prototype;
  const getImageData = C2D.getImageData;
  method(C2D, 'getImageData', function getImageData_(...args) {
    const img = getImageData.apply(this, args);
    if (img.data.length / 4 <= MAX_PIXELS) perturb(img.data);
    return img;
  });
  disguised.set(C2D.getImageData, 'getImageData');

  const noisyCopy = canvas => {
    const w = canvas.width, h = canvas.height;
    if (!w || !h || w * h > MAX_PIXELS) return canvas;
    try {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      const img = getImageData.call(ctx, 0, 0, w, h);
      perturb(img.data);
      ctx.putImageData(img, 0, 0);
      return c;
    } catch { return canvas; }
  };
  const HC = HTMLCanvasElement.prototype;
  const toDataURL = HC.toDataURL, toBlob = HC.toBlob;
  method(HC, 'toDataURL', function toDataURL_(...args) { return toDataURL.apply(noisyCopy(this), args); });
  disguised.set(HC.toDataURL, 'toDataURL');
  method(HC, 'toBlob', function toBlob_(...args) { return toBlob.apply(noisyCopy(this), args); });
  disguised.set(HC.toBlob, 'toBlob');

  // ---- WebGL: hide the real GPU
  for (const Ctor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Ctor) continue;
    const getParameter = Ctor.prototype.getParameter;
    method(Ctor.prototype, 'getParameter', function getParameter_(p) {
      if (p === 0x9245) return 'Google Inc.';             // UNMASKED_VENDOR_WEBGL
      if (p === 0x9246) return 'ANGLE (Generic Renderer)'; // UNMASKED_RENDERER_WEBGL
      return getParameter.call(this, p);
    });
    disguised.set(Ctor.prototype.getParameter, 'getParameter');
  }

  // ---- Audio: tiny per-session noise defeats audio fingerprinting
  if (window.AudioBuffer) {
    const getChannelData = AudioBuffer.prototype.getChannelData;
    const touched = new WeakSet();
    method(AudioBuffer.prototype, 'getChannelData', function getChannelData_(ch) {
      const d = getChannelData.call(this, ch);
      if (!touched.has(d)) {
        touched.add(d);
        for (let i = 0; i < d.length; i += 97) d[i] += (hash(i) - 0.5) * 1e-7;
      }
      return d;
    });
    disguised.set(AudioBuffer.prototype.getChannelData, 'getChannelData');
  }
  if (window.AnalyserNode) {
    const gffd = AnalyserNode.prototype.getFloatFrequencyData;
    method(AnalyserNode.prototype, 'getFloatFrequencyData', function getFloatFrequencyData(arr) {
      gffd.call(this, arr);
      for (let i = 0; i < arr.length; i += 7) arr[i] += (hash(i) - 0.5) * 1e-4;
    });
  }
})();
