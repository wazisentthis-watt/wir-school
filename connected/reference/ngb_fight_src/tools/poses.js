const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate(() => {
    const B = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7 };
    const pad = { index: 0, id: 'Nimbus', connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
    window.__fakePads = [pad]; const G = window.__game; G.loop = () => {}; let T = 1000; performance.now = () => T;
    window.held = {}; window.ax = [0, 0, 0, 0];
    window.step = (n = 1) => { for (let i = 0; i < n; i++) { T += 1000 / 60; pad.buttons.forEach(x => { x.pressed = false; x.value = 0; }); for (const k in held) if (held[k]) { pad.buttons[B[k]].pressed = true; pad.buttons[B[k]].value = 1; } pad.axes = ax.slice(); G.pollPads(); G.update(1 / 60); } };
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.padScheme = 'analog'; G.start(); G.ctrl[1] = null; G.ref.root.visible = false; step(175);
    G.player.pos.set(0, 0, -0.55); G.f[1].pos.set(0, 0, 0.55); step(10);
    window.shot = () => { const P = G.player; G.camera.position.set(2.4, 1.45, 0.1); G.camera.lookAt(0, 1.2, 0); G.camera.fov = 42; G.camera.updateProjectionMatrix(); document.getElementById('hud').style.display = 'none'; G.render(); };
  });
  const seq = [
    ['rest', `held={}; ax=[0,0,0,0]; step(30);`],
    ['hold_straight', `held={R1:1}; step(2); ax=[0,0,0,-1]; step(40);`],
    ['guard_low', `held={}; ax=[0,0,0,0]; step(40); held={L2:1,R2:1}; ax=[0,0,0,1]; step(30);`],
    ['hook', `held={}; ax=[0,0,0,0]; step(30); held={L1:1}; step(2); ax=[0,0,1,0]; step(16);`],
    ['upper', `held={}; ax=[0,0,0,0]; step(40); held={R1:1}; step(2); ax=[0,0,0,1]; step(3); ax=[0,0,0,-1]; step(18);`],
    ['clinch', `held={}; ax=[0,0,0,0]; step(40); window.__game.player.pos.set(0,0,-0.4); window.__game.f[1].pos.set(0,0,0.4); held={L1:1,R1:1}; step(12); held={R1:1}; step(3); ax=[0,0,0,-1]; step(14);`],
  ];
  for (const [n, js] of seq) { await p.evaluate(js + ' shot();'); await p.screenshot({ path: `/tmp/claude-0/plots/pose_${n}.png` }); }
  console.log(errs.join('\n')); await b.close();
})();
