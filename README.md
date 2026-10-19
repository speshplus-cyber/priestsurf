# PriestSurf

A privacy-first, intelligent web browser. Private by default. Smart by design.

## Run it

```
npm install
npm start
```

## Build the Windows installer

```
npm run dist
```

This creates two files in `dist/`:
- `PriestSurf-Setup-1.0.0.exe`: an installer with Start menu and desktop shortcuts
- `PriestSurf-Portable-1.0.0.exe`: a single file that runs without installing

`npm run icon` regenerates `build/icon.png` and `build/icon.ico` from `build/icon.svg`.

Two Windows gotchas:
- The installer tool (NSIS) fails if the project path is longer than about 250 characters. Build from a short path, or map one with `subst P: <project folder>`.
- electron-builder's code-signing tools archive contains macOS symlinks that Windows can't create without admin rights or Developer Mode. If extraction fails, rename the extracted folder in `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign` to `winCodeSign-2.6.0`.

## Website

The download and marketing site lives in `website/`. It's plain HTML, CSS and JS with no trackers, cookies or external requests.

- Preview it locally with `npm run site`, then open http://localhost:8080.
- The download buttons point to `releases/latest/download/` on GitHub. After `npm run dist`, create a GitHub Release and attach both `.exe` files from `dist/`.
- The SHA-256 checksums in `website/index.html` must match the files you upload. Recompute them with `Get-FileHash <file> -Algorithm SHA256` whenever you rebuild.
- To host it on GitHub Pages, go to Settings → Pages, then deploy from the `main` branch and the `/website` folder (or copy `website/` to any static host).

## Privacy (on by default)
- **Tor mode:** one click sends all traffic through Tor. This needs Tor Browser running (port 9150), or tor.exe set in Settings. DNS goes through Tor too. If Tor can't be reached, PriestSurf blocks traffic instead of leaking it.
- **Tracker & ad blocking:** about 190 major tracking and ad networks are blocked, and the shield shows exactly what was blocked on each page. You can turn shields off for a single site.
- **HTTPS-only:** every connection is upgraded to HTTPS. If a site doesn't support it, you can load it over HTTP once.
- **Fingerprint protection (like Tor Browser):** every user reports the same user agent, CPU count, memory, screen size, language and UTC timezone. The GPU is hidden. Canvas and audio readouts get per-session noise.
- **No WebRTC IP leaks**, **third-party cookies blocked**, cross-site referrers trimmed, and tracking parameters (utm_, fbclid, gclid…) removed from links.
- **Nothing is saved:** cookies, cache and history live only in memory and are erased when you close the browser. Only bookmarks and settings are kept.
- **New identity** (Ctrl+Shift+U) erases everything right away and rotates your fingerprint.
- Permissions (location, camera, notifications…) are blocked by default. Sites have to ask, and your answer lasts only for the session.
- The browser's own interface never connects to the internet. There's no telemetry, no favicon fetching and no spell-check downloads.

## Intelligence
- **Smart address bar:** calculator (`(24*7)/3`), unit conversion (`72 f to c`, `5 miles to km`), !bangs (`!w`, `!yt`, `!gh`, `!r`, `!maps`…) and switch-to-open-tab. Suggestions are computed on your device, so nothing you type is sent anywhere until you press Enter.
- **Assistant (Ctrl+J):** summarize any page and ask questions about it. It works on your device by default. You can turn on Claude AI in Settings with your own API key (stored encrypted). Page text is sent only when you ask, and it goes through Tor when Tor is on.
- **Reader mode (Alt+R):** a clean view without distractions, with reading time.
- **Tab tools:** tabs are colored by site, you can group tabs and close duplicates in one click, and you can reopen closed tabs.

## Phone app (Phone Link)
Click the phone button in the toolbar (Ctrl+Shift+M), turn on **Connect my phone**, and scan the QR code with your phone's camera. Then use "Add to Home Screen" on your phone to install the app. It works on Android and iPhone, and you don't need an app store.

From the phone you can:
- search privately (calculator, unit conversion and !bangs work too)
- open a link on the computer
- see, switch and close the computer's tabs
- receive links sent from the computer (right-click a link and choose "Send link to phone")
- add and open bookmarks
- turn Tor on or off, and trigger New identity

How it works: PriestSurf serves the phone app from port 47823 on your Wi-Fi network only. Every request has to carry the 256-bit secret key from the QR code, and 20 wrong attempts lock the server for one minute. **Unpair all phones** replaces the key. Phone Link is off by default.

Limits:
- The connection is plain HTTP inside your own Wi-Fi. Anyone on the same network who can watch its traffic could see the key, so only use Phone Link on networks you trust.
- Links you open on the phone use the phone's own browser. PriestSurf's tracker blocking and Tor only protect pages opened on the computer.
- If your phone can't connect, allow PriestSurf in Windows Firewall, set the Wi-Fi to **Private** (not Public), and turn on "Allow LAN traffic" in any VPN you use.

## Honest limits
PriestSurf is built on Chromium (Electron). Tor Browser is a hardened Firefox maintained by the Tor Project, so its anonymity has been audited much more deeply. Fingerprint protection here is best-effort. For high-risk situations (journalism, activism), use Tor Browser itself.
