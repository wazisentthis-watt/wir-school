/* PMK Camera — one camera boot for every WIR game. Drop-in, no dependencies.
 *
 * Use as an ES module side-effect import:   import './pmk-camera.js'; const C = window.PMKCamera;
 * Or paste/load it as a classic <script> in any single-file game: window.PMKCamera is the same object.
 *
 *   const stream = await PMKCamera.open(videoEl, { facing: 'user' });   // throws PMKCameraError
 *   PMKCamera.showHelp(err, { onRetry, onFallback });                     // standard fix-it panel
 *   const report = PMKCamera.check();                                     // environment, no prompt
 *
 * Why camera mode kept failing: browsers only expose the camera in a "secure context"
 * (https:// or http://localhost). A game opened as a file, over a LAN http:// address, inside a
 * chat/preview frame that doesn't grant camera, or inside an in-app browser (Instagram, TikTok…)
 * never gets the camera, no matter how good the tracker is. This module detects each of those
 * BEFORE asking, tries fallback constraints, confirms real frames arrive, and says exactly what to do.
 */
(function (root) {
  'use strict';
  if (root.PMKCamera) return;

  const ua = (root.navigator && navigator.userAgent) || '';
  const isIOS = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  const isAndroid = /Android/.test(ua);
  const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|Twitter|LinkedInApp|Pinterest|GSA\/|Discord|wv\)/;

  class PMKCameraError extends Error {
    constructor(code, info = {}) {
      super(info.message || code); this.name = 'PMKCameraError'; this.code = code;
      Object.assign(this, info);
    }
  }

  function framed() { try { return root.self !== root.top; } catch { return true; } }
  function localHost(h) { return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h); }

  // Environment check. Never prompts.
  function check() {
    const L = root.location || {};
    const r = {
      url: L.href, protocol: L.protocol, host: L.hostname,
      secure: !!root.isSecureContext, framed: framed(),
      ios: isIOS, android: isAndroid, inApp: IN_APP.test(ua),
      api: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      policyAllows: null, userAgent: ua,
    };
    try { const fp = document.featurePolicy || document.permissionsPolicy; if (fp && fp.allowsFeature) r.policyAllows = fp.allowsFeature('camera'); } catch {}
    r.blocker = blockerFor(r);
    return r;
  }

  function blockerFor(r) {
    if (r.inApp) return 'IN_APP_BROWSER';
    if (!r.secure) return r.protocol === 'file:' ? 'OPENED_AS_FILE' : 'NOT_HTTPS';
    if (r.policyAllows === false) return 'FRAME_BLOCKED';
    if (!r.api) return 'NO_CAMERA_API';
    return null;
  }

  // Plain-language explanation + fix steps for every failure code.
  function explain(code, env = check()) {
    const httpsUrl = env.url && env.protocol === 'http:' && !localHost(env.host) ? env.url.replace(/^http:/, 'https:') : null;
    const settings = env.ios
      ? ['Tap "aA" in Safari\'s address bar → Website Settings → Camera → Allow.', 'Or iPhone Settings → Safari → Camera → Ask or Allow, then reload.']
      : env.android
        ? ['Tap the lock/tune icon next to the address → Permissions → Camera → Allow.', 'Or Android Settings → Apps → Chrome → Permissions → Camera → Allow.']
        : ['Click the camera or lock icon in the address bar → Allow camera.', 'Then reload the page.'];
    const T = {
      OPENED_AS_FILE: { title: 'Opened as a file — camera is locked', why: 'Browsers never give the camera to a page opened straight from Files/Downloads (file://).', steps: ['Open the game from its https:// link instead.', 'On a computer you can also run a local server and open http://localhost.'], action: null },
      NOT_HTTPS: { title: 'This link isn\'t HTTPS — camera is locked', why: 'The camera only works on https:// pages (or localhost on the same computer). A plain http:// address, including a 192.168… LAN address, is blocked.', steps: [httpsUrl ? 'Try the https:// version of this link.' : 'Open the game from its https:// link.', 'Hosted on Netlify / GitHub Pages / Cloudflare Pages, it gets HTTPS automatically.'], action: httpsUrl ? { label: 'Open the HTTPS link', href: httpsUrl } : null },
      FRAME_BLOCKED: { title: 'The window around this game blocks the camera', why: 'The game is running inside another page (a chat preview, an embed) that doesn\'t pass camera permission through.', steps: ['Open the game in its own tab.'], action: { label: 'Open in its own tab', href: env.url, newTab: true } },
      IN_APP_BROWSER: { title: 'This in-app browser can\'t use the camera', why: 'Links opened inside Instagram, TikTok, Facebook, Snapchat and similar apps run in a stripped-down browser.', steps: [env.ios ? 'Tap ••• or the share icon → "Open in Safari".' : 'Tap ⋮ → "Open in Chrome" / "Open in browser".', 'Or copy the link and paste it into Safari/Chrome.'], action: { label: 'Copy link', copy: env.url } },
      NO_CAMERA_API: { title: 'This browser has no camera support', why: 'The browser doesn\'t offer the camera API at all.', steps: [env.ios ? 'Use Safari on iOS 14.3 or newer.' : 'Use a current Chrome, Edge, Firefox or Safari.'], action: null },
      DENIED: { title: 'Camera permission is off for this site', why: 'The browser (or you) said no to the camera for this site. Browsers remember that, so it won\'t ask again by itself.', steps: settings, action: { label: 'Try again', retry: true } },
      DENIED_IN_FRAME: { title: 'Camera blocked by the page around the game', why: 'The game is inside another page that didn\'t grant camera access.', steps: ['Open the game in its own tab.'], action: { label: 'Open in its own tab', href: env.url, newTab: true } },
      NO_CAMERA: { title: 'No camera found', why: 'The browser can\'t find a camera on this device.', steps: ['Check that no privacy cover/switch is blocking it.', 'On a computer, plug in a webcam and reload.'], action: { label: 'Try again', retry: true } },
      BUSY: { title: 'The camera is busy', why: 'Another app or tab is already using the camera (FaceTime, Zoom, another game tab…).', steps: ['Close the other app or tab using the camera.', 'Then tap Try again.'], action: { label: 'Try again', retry: true } },
      NO_FRAMES: { title: 'Camera opened but sent no picture', why: 'The camera started but no video frames arrived — usually a stuck camera or low-power mode.', steps: ['Tap Try again.', 'If it repeats: close other camera apps, turn off Low Power Mode, reload.'], action: { label: 'Try again', retry: true } },
      TRACKER_LOAD: { title: 'Camera works — the tracker didn\'t load', why: 'The camera is fine, but the hand/body tracking files couldn\'t be downloaded.', steps: ['Check your internet connection and reload.', 'If on a work/school network, it may block the model files.'], action: { label: 'Try again', retry: true } },
      UNKNOWN: { title: 'The camera could not start', why: 'Unexpected camera error.', steps: ['Reload the page and try again.', 'Open Camera Check to see exactly which step fails.'], action: { label: 'Try again', retry: true } },
    };
    return T[code] || T.UNKNOWN;
  }

  function fail(code, cause, env) {
    const x = explain(code, env);
    return new PMKCameraError(code, { message: x.title + '. ' + x.why, title: x.title, why: x.why, steps: x.steps, action: x.action, cause, env });
  }

  function mapGumError(e, env) {
    const n = e && e.name;
    if (n === 'NotAllowedError' || n === 'PermissionDeniedError' || n === 'SecurityError') return fail(env.framed ? 'DENIED_IN_FRAME' : 'DENIED', e, env);
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return fail('NO_CAMERA', e, env);
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return fail('BUSY', e, env);
    if (n === 'TypeError' && !env.secure) return fail('NOT_HTTPS', e, env);
    if (n === 'NotSupportedError') return fail(env.secure ? 'NO_CAMERA_API' : 'NOT_HTTPS', e, env);
    return fail('UNKNOWN', e, env);
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  // video.play() can stay pending forever on a dead stream; never let it hang the game.
  const playSoft = v => Promise.race([Promise.resolve().then(() => v.play()).catch(() => {}), wait(2500)]);

  async function permissionState() {
    try { const p = await navigator.permissions.query({ name: 'camera' }); return p.state; } catch { return 'unknown'; }
  }

  // Wait until real frames arrive (videoWidth > 0 and time moving).
  async function framesArrive(video, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (video.videoWidth > 0 && video.readyState >= 2) return true;
      await wait(60);
    }
    return false;
  }

  /** Open the camera into `video`. Resolves the MediaStream or throws PMKCameraError.
   *  opts: facing 'user'|'environment', width, height, fps, frameTimeout ms */
  async function open(video, opts = {}) {
    const env = check();
    if (env.blocker) throw fail(env.blocker, null, env);
    const facing = opts.facing || 'user', w = opts.width || 640, h = opts.height || 480, fps = opts.fps || 30;
    // Most specific first; each fallback drops something a picky camera might reject.
    const ladder = [
      { facingMode: facing, width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: fps, max: 30 } },
      { facingMode: facing, width: { ideal: w }, height: { ideal: h } },
      { facingMode: facing },
      true,
    ];
    let stream = null, last = null;
    for (const video_ of ladder) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: video_ }); break; }
      catch (e) {
        last = e;
        // permission / security / busy problems won't be fixed by looser constraints
        if (!['OverconstrainedError', 'NotFoundError', 'ConstraintNotSatisfiedError', 'TypeError'].includes(e && e.name)) break;
      }
    }
    if (!stream) {
      let err = mapGumError(last, env);
      // Some browsers report a remembered "no" as NotSupported/unknown: ask the permission API before guessing.
      if (['NO_CAMERA_API', 'UNKNOWN'].includes(err.code) && (await permissionState()) === 'denied') err = fail(env.framed ? 'DENIED_IN_FRAME' : 'DENIED', last, env);
      throw err;
    }

    // iOS needs these set BEFORE srcObject or the video stays black / goes fullscreen.
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.autoplay = true;
    video.srcObject = stream;
    await playSoft(video); // autoplay hiccups are fine: the frames check below decides
    if (!(await framesArrive(video, opts.frameTimeout || 5000))) {
      // one restart attempt: some phones hand back a dead first stream
      stream.getTracks().forEach(t => t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing } });
        video.srcObject = stream; await playSoft(video);
        if (!(await framesArrive(video, 4000))) { stream.getTracks().forEach(t => t.stop()); video.srcObject = null; throw fail('NO_FRAMES', null, env); }
      } catch (e) { if (e instanceof PMKCameraError) throw e; throw mapGumError(e, env); }
    }
    // Release the camera if the track dies (unplugged, taken by another app).
    stream.getVideoTracks().forEach(t => t.addEventListener('ended', () => { try { opts.onEnded && opts.onEnded(); } catch {} }));
    return stream;
  }

  function stop(video, stream) {
    try { (stream || (video && video.srcObject))?.getTracks().forEach(t => t.stop()); } catch {}
    if (video) video.srcObject = null;
  }

  /** Normalize anything thrown during camera/tracker start into a PMKCameraError. */
  function normalize(e) {
    if (e instanceof PMKCameraError || (e && e.name === 'PMKCameraError')) return e;
    if (e && e.pmkTracker) return fail('TRACKER_LOAD', e);
    if (e && /NotAllowed|NotFound|NotReadable|Overconstrained|Security|Abort/.test(e.name || '')) return mapGumError(e, check());
    return fail('UNKNOWN', e);
  }

  // ---------- standard fix-it panel (works in any game, self-styled) ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /** Render the help panel. Returns the element. opts: container, onRetry, onFallback, fallbackLabel, onClose, checkUrl */
  function showHelp(err, opts = {}) {
    err = normalize(err);
    const host = opts.container || document.body;
    let el = document.getElementById('pmk-cam-help'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'pmk-cam-help'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', err.title);
    const a = err.action;
    el.innerHTML = `<style>#pmk-cam-help{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:#05070cd0;font:15px/1.45 system-ui,-apple-system,sans-serif;color:#f3f6fa}
#pmk-cam-help .k{background:#141a24;border:1px solid #ffffff22;border-radius:16px;padding:20px;max-width:460px;width:100%;max-height:90vh;overflow:auto}
#pmk-cam-help .e{font:700 11px system-ui;letter-spacing:.18em;color:#ff6b6b;margin:0}#pmk-cam-help h2{font-size:22px;line-height:1.15;margin:6px 0 8px}
#pmk-cam-help p{color:#b9c3d0;margin:0 0 10px}#pmk-cam-help ol{margin:0 0 12px;padding-left:20px}#pmk-cam-help li{margin:4px 0}
#pmk-cam-help .r{display:flex;flex-wrap:wrap;gap:8px}#pmk-cam-help button,#pmk-cam-help a.b{appearance:none;border:0;border-radius:10px;padding:11px 14px;font:700 15px system-ui;cursor:pointer;text-decoration:none;color:#fff;background:#2563eb}
#pmk-cam-help .s{background:#253041!important;color:#e6ebf2!important}#pmk-cam-help small{display:block;color:#7f8a99;margin-top:10px;font-size:12px}#pmk-cam-help code{font-size:11px;color:#9fb1c7}</style>
<div class="k"><p class="e">CAMERA · ${esc(err.code)}</p><h2>${esc(err.title)}</h2><p>${esc(err.why)}</p><ol>${(err.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
<div class="r">${a ? (a.href ? `<a class="b" id="pch-act" href="${esc(a.href)}" ${a.newTab ? 'target="_blank" rel="noopener"' : ''}>${esc(a.label)}</a>` : `<button id="pch-act">${esc(a.label)}</button>`) : ''}
${opts.onFallback ? `<button class="s" id="pch-fb">${esc(opts.fallbackLabel || 'Play without camera')}</button>` : ''}
${opts.checkUrl ? `<a class="b s" href="${esc(opts.checkUrl)}" target="_blank" rel="noopener">Camera Check</a>` : ''}
<button class="s" id="pch-x">Close</button></div>
<small>Camera frames stay on this device. <code>${esc((err.env && err.env.protocol) || location.protocol)} · secure=${err.env ? err.env.secure : isSecureContext} · framed=${err.env ? err.env.framed : framed()}</code></small></div>`;
    host.appendChild(el);
    const close = () => { el.remove(); opts.onClose && opts.onClose(); };
    const act = el.querySelector('#pch-act');
    if (act && a && a.retry) act.onclick = () => { el.remove(); opts.onRetry && opts.onRetry(); };
    if (act && a && a.copy) act.onclick = async () => { try { await navigator.clipboard.writeText(a.copy); act.textContent = 'Copied ✓'; } catch { prompt('Copy this link:', a.copy); } };
    const fb = el.querySelector('#pch-fb'); if (fb) fb.onclick = () => { el.remove(); opts.onFallback(); };
    el.querySelector('#pch-x').onclick = close;
    return el;
  }

  root.PMKCamera = { open, stop, check, explain, normalize, showHelp, permissionState, PMKCameraError, version: '0.6.0' };
})(typeof window !== 'undefined' ? window : globalThis);
