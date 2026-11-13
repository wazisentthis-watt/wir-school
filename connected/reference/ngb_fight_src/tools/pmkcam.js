// Real tracker pipeline: fake camera → vendored MediaPipe Pose (no CDN) → onResults → PMK body module. node pmkcam.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, permissions: ['camera'] }); const p = await ctx.newPage();
  const errs = [], reqs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  p.on('request', r => { const u = r.url(); if (!u.startsWith('http://localhost')) reqs.push(u); });
  await p.route(/fonts\.g/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction('window.__ready', null, { timeout: 60000 });
  await p.evaluate(() => window.__game.pmk.showPanel(true)); await p.click('#pmkGo');
  const t0 = Date.now(); let st;
  for (let i = 0; i < 90; i++) { await p.waitForTimeout(1000); st = await p.evaluate(() => { const m = window.__game.pmk; return { state: m.state, active: m.active, base: m.base, fps: +m.fps.toFixed(1), lat: Math.round(m.lat), frames: m.frames, lastRes: m.lastRes > 0, cal: m.tracker.calStep, msg: m.tracker.calMsg, help: !!document.getElementById('pmk-cam-help') }; }); if (st.lastRes && st.fps > 0) break; if (st.help) break; }
  st.secs = Math.round((Date.now() - t0) / 1000);
  console.log(JSON.stringify(st)); console.log('off-origin requests:', reqs.filter(u => !/fonts\.g/.test(u)).length, reqs.slice(0, 5));
  await p.screenshot({ path: '/home/claude/ngb/dist/pmkcam.png' });
  console.log(errs.slice(0, 8).join('\n')); await b.close();
})();
