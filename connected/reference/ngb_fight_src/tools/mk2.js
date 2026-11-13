const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  console.log(await p.evaluate(() => { const G = window.__game; G.loop = () => {}; G.settings.mode = 'watch'; G.start(); for (let i = 0; i < 200; i++) { G.update(1/60); G.updateCamera(1/60); } G.render();
    const B = G.f[1]; G.marker(B.vol.head.a, 'heavy', 1.6); const m = document.getElementById('markers'); const el = m.lastChild;
    return JSON.stringify({ exists: !!m, n: m.children.length, cls: el && el.className, style: el && el.getAttribute('style'), rect: el && JSON.stringify(el.getBoundingClientRect()), mz: getComputedStyle(m).zIndex, inFight: G.inFight(), hudmode: G.hudMode }); }));
  await p.waitForTimeout(120); await p.screenshot({ path: '/tmp/claude-0/plots/mk_a.png', clip: { x: 380, y: 180, width: 220, height: 220 } }); await p.evaluate(() => { const G = window.__game; G.marker(G.f[1].vol.head.a, 'clean', 1); }); await p.waitForTimeout(60); await p.screenshot({ path: '/tmp/claude-0/plots/mk_b.png', clip: { x: 380, y: 180, width: 220, height: 220 } });
  await b.close();
})();
