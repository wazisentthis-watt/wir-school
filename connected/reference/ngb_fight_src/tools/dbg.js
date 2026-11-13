const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 } }); await p.route(/fonts\.g/, r => r.abort());
  p.on('pageerror', e => console.log('PAGEERR ' + e.message + (e.stack||'').split('\n').slice(0,4).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  console.log(await p.evaluate(() => { const g = window.__game; g.settings.mode = 'training'; g.start(); g.paused = true; const dt = 1/60; const A = g.player; const out = [];
    for (let i=0;i<30;i++) g.update(dt);
    out.push([g.phase, g.mode, A.state, A.canAct, A.stamina, g.frozen, g.trainIdx]);
    const r = A.requestStrike('jabL'); out.push(['req', r, A.state, g.trainIdx]);
    g.press('9'); for (let i=0;i<40;i++) g.update(dt); out.push([A.state, g.trainIdx, A.stats.thrown, JSON.stringify(A.stats.byStrike), A.stagger, A.offBalance, A.stamina]); g.press('9'); out.push([A.state, A.strike && A.strike.name, g.training[1].text]); for (let i=0;i<40;i++) g.update(dt); out.push([A.state, g.trainIdx]);
    return JSON.stringify(out); }));
  await b.close();
})();
