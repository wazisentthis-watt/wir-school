const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/claude-0/plots/ph_menu.png' });
  await p.evaluate(() => { const g = window.__game; Object.assign(g.settings, { mode: 'quick', p1: 'pop' }); g.start(); g.paused = true; g.__t = 0; const dt = 1/60; while (g.__t < 5) { g.update(dt); g.__t += dt; g.updateCamera(dt); } g.updateHUD(); g.render(); });
  await p.screenshot({ path: '/tmp/claude-0/plots/ph_fight.png' });
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => { const g = window.__game; dispatchEvent(new Event('resize')); const dt = 1/60; for (let i=0;i<60;i++){ g.update(dt); g.updateCamera(dt);} g.updateHUD(); g.render(); });
  await p.screenshot({ path: '/tmp/claude-0/plots/ph_land.png' });
  console.log(errs.join('\n')); await b.close();
})();
