const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  const run = (secs) => p.evaluate((secs) => { const g = window.__game; g.paused = true; let t = 0; const dt = 1/60; while (t < secs) { g.update(dt); t += dt; g.updateCamera(dt); if (g.mode === 'forge') g.forgeUpdate(dt); } g.updateHUD(); g.render(); }, secs);
  // forge
  await p.evaluate(() => { const g = window.__game; g.settings.mode = 'forge'; g.start(); });
  await p.evaluate(() => { const g = window.__game; g.paused = true; g.timeScale = 1; document.querySelector('[data-st="hookL"]').click(); });
  await p.evaluate(() => { const g = window.__game; let t = 0; const dt = 1/60 * 0.25; while (t < 0.26) { g.update(dt); t += dt; g.updateCamera(1/60); g.forgeUpdate(dt); } g.render(); });
  await p.screenshot({ path: '/tmp/claude-0/plots/m_forge.png' });
  // training, with simulated presses
  await p.evaluate(() => { const g = window.__game; g.toMenu(); g.settings.mode = 'training'; g.start(); g.paused = true; });
  await p.evaluate(() => { const g = window.__game; const dt = 1/60; for (const k of ['7','9']) { g.press(k); for (let i=0;i<50;i++) g.update(dt); g.release(k); } g.keys['8'] = true; g.press('8'); for (let i=0;i<30;i++) g.update(dt); g.keys['8'] = false; });
  await run(2); await p.screenshot({ path: '/tmp/claude-0/plots/m_train.png' });
  // kitchen
  await p.evaluate(() => { const g = window.__game; g.toMenu(); g.openKitchen(); });
  await p.screenshot({ path: '/tmp/claude-0/plots/m_kitchen.png' });
  // quick fight vs skillet, player idle; also exercise recipes via keys
  await p.evaluate(() => { const g = window.__game; g.settings.mode = 'quick'; g.settings.p1 = 'skillet'; g.start(); g.paused = true; });
  await p.evaluate(() => { const g = window.__game; const dt = 1/60; for (let i=0;i<200;i++) g.update(dt); g.press('.'); g.press('0', true); g.press('.'); for (let i=0;i<60;i++) g.update(dt); for (let k=0;k<20;k++){ g.press(['7','9','4','6','5','1','3'][k%7]); for (let i=0;i<20;i++){ g.keys.w = true; g.update(dt);} } g.keys.w=false; });
  await run(3); await p.screenshot({ path: '/tmp/claude-0/plots/m_quick.png' });
  // run a full fight with the player standing still to make sure report shows
  const rep = await p.evaluate(() => { const g = window.__game; g.settings.roundLen = 30; g.setupMatch('quick'); g.paused = true; g.showReport = g.constructor.prototype.showReport.bind(g); let t=0; const dt=1/60; while (t < 200 && g.phase !== 'end') { g.update(dt); t += dt; } g.showReport(); return { phase: g.phase, res: g.result && g.result.how, t }; });
  await p.screenshot({ path: '/tmp/claude-0/plots/m_report.png' }); await p.evaluate(() => { const g = window.__game; g.toMenu(); g.openLog(); }); await p.screenshot({ path: '/tmp/claude-0/plots/m_log.png' });
  console.log(JSON.stringify(rep)); console.log(errs.join('\n')); await b.close();
})();
