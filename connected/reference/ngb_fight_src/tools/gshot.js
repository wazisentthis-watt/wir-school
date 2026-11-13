// node gshot.js mode p0 p1 out_prefix times(comma) [setupJS] [w h]
const { chromium } = require('playwright');
(async () => {
  const [mode, p0, p1, out, times, setup = '', w = 1280, h = 720] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate(([mode, p0, p1, setup]) => { const g = window.__game; Object.assign(g.settings, { mode, p0, p1, rounds: 3, roundLen: 90 }); g.start(); g.paused = true; g.__t = 0; if (setup) eval(setup); }, [mode, p0, p1, setup]);
  for (const tt of times.split(',').map(Number)) {
    await p.evaluate((tt) => { const g = window.__game; const dt = 1 / 60; while (g.__t < tt) { g.update(dt); g.__t += dt; g.updateCamera(dt); if (g.__step) g.__step(g); } for (let i = 0; i < 30; i++) g.updateCamera(1/60); g.updateHUD(); g.render(); }, tt);
    await p.screenshot({ path: `${out}_${tt}.png` });
  }
  if (errs.length) console.error(errs.join('\n'));
  await b.close();
})();
