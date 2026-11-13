const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate(() => { const G = window.__game; G.loop = () => {}; G.settings.mode = 'watch'; G.settings.p0 = 'savannah'; G.settings.p1 = 'skillet'; G.start(); G.camMode = 1;
    let t = 0; let n = 0; const orig = G.marker.bind(G); G.marker = (...a) => { n++; orig(...a); };
    while (t < 40 && n < 8) { G.update(1 / 60); G.updateCamera(1 / 60); t += 1 / 60; }
    for (let i = 0; i < 4; i++) { G.update(1 / 60); G.updateCamera(1 / 60); }
    const [A, B] = G.f; G.marker(B.vol.head.a, 'heavy', 1.6); G.marker(A.vol.abdo.b, 'body', 1); G.marker(B.vol.gloveL.a, 'block', 1); G.marker(A.vol.head.a.clone().setY(A.vol.head.a.y + 0.2), 'slip', 1);
    G.updateHUD(); G.render(); window.__n = n; });
  await p.waitForTimeout(140);
  await p.screenshot({ path: '/tmp/claude-0/plots/markers.png' });
  console.log('markers fired in sim:', await p.evaluate(() => window.__n), errs.join('\n')); await b.close();
})();
