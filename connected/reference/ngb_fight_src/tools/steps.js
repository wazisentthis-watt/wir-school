const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate(() => { const G = window.__game; G.loop = () => {}; G.settings.mode = 'quick'; G.settings.p1 = 'pop'; G.start(); G.ctrl[1] = null; G.ref.root.visible = false; for (let i = 0; i < 175; i++) G.update(1 / 60);
    const A = G.player; A.pos.set(0, 0, -2.2); G.f[1].pos.set(0.2, 0, 1.6); for (let i = 0; i < 30; i++) G.update(1 / 60);
    window.shot = () => { const P = A.pos; G.camera.position.set(P.x + 2.6, 0.75, P.z); G.camera.lookAt(P.x, 0.55, P.z); G.camera.fov = 40; G.camera.updateProjectionMatrix(); document.getElementById('hud').style.display = 'none'; G.render(); };
    window.run = (n) => { for (let i = 0; i < n; i++) G.update(1 / 60); };
    // feet trace while advancing
    window.trace = []; G.keys.w = true; for (let i = 0; i < 70; i++) { G.update(1 / 60); window.trace.push(A.footSys ? A.footSys.map(f => f.step ? 'S' : '.').join('') : '--'); }
  });
  const tr = await p.evaluate(() => window.trace.join(' ')); console.log('advance L/R foot (S=stepping):', tr);
  for (let i = 0; i < 6; i++) { await p.evaluate(() => { const G = window.__game; G.keys.w = false; G.keys.a = true; run(4); shot(); }); await p.screenshot({ path: `/tmp/claude-0/plots/st_${i}.png` }); }
  console.log(errs.join('\n')); await b.close();
})();
