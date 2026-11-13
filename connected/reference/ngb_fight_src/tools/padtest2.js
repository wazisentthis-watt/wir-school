const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 4).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  const log = await p.evaluate(() => {
    const B = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7, OPT: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
    const pad = { index: 0, id: 'SteelSeries Nimbus+', connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
    window.__fakePads = [pad]; const G = window.__game; G.loop = () => {};
    let T = 1000; const realNow = performance.now.bind(performance); performance.now = () => T;
    const set = (btns = {}, axes = [0, 0, 0, 0]) => { pad.buttons.forEach(x => { x.pressed = false; x.value = 0; }); for (const k in btns) { pad.buttons[B[k]].pressed = true; pad.buttons[B[k]].value = 1; } pad.axes = axes; };
    const step = (n = 1) => { for (let i = 0; i < n; i++) { T += 1000 / 60; G.pollPads(); if (G.f.length && !G.paused) G.update(1 / 60); } };
    const out = []; const P = () => G.player;
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.start(); G.ctrl[1] = null; step(175);
    const reset = () => { for (const f of G.f) { f.strike = null; f.state = 'idle'; f.stamina = 100; f.offBalance = 0; f.stagger = 0; f.queued = null; f.stunT = 0; f.clinch = null; } step(2); };
    const name = () => P().strike ? P().strike.name + (P().strike.heavy ? '(HEAVY)' : '') : null;
    reset(); set({ X: 1 }); step(1); set({ X: 1, A: 1 }); step(1); set(); step(1); out.push(['X then A within 1 frame → ', name()]); step(50);
    reset(); set({ Y: 1, B: 1 }); step(1); set(); step(2); out.push(['Y+B →', name()]); step(50);
    reset(); set({ L1: 1 }); step(2); set({ L1: 1, Y: 1 }); step(1); set({ L1: 1 }); step(5); out.push(['L1+Y →', name(), 'windup', P().strike && +P().strike.def.windup.toFixed(3)]); set(); step(60);
    reset(); set({ L1: 1, A: 1 }); step(1); set({ L1: 1 }); step(5); out.push(['L1+A →', name()]); set(); step(60);
    reset(); set({ L2: 1, X: 1 }); step(1); set({ L2: 1 }); step(5); out.push(['L2+X →', name()]); set(); step(50);
    reset(); set({ L2: 1, B: 1 }); step(1); set({ L2: 1 }); step(5); out.push(['L2+B →', name()]); set(); step(50);
    reset(); set({ L2: 1, X: 1, A: 1 }); step(1); set({ L2: 1 }); step(5); out.push(['L2+X+A →', name()]); set(); step(50);
    reset(); set({}, [0, 0, 0, 0.9]); step(15); out.push(['RS down duck', +P().duckK.toFixed(2)]); set({}, [0, 0, 0, -0.9]); step(15); out.push(['RS up pull', +P().pullK.toFixed(2)]); set(); step(15);
    reset(); set({}, [0, 0, -0.75, 0.75]); step(2); out.push(['fast flick ↙ roll', !!P().roll, P().roll && P().roll.dir]); set(); step(40);
    reset(); set({}, [0, 0, -0.3, 0.1]); step(6); set({}, [0, 0, -0.6, 0.6]); step(3); out.push(['slow diagonal (no roll)', !!P().roll, 'weave', +P().weaveX.toFixed(2), 'duck', +P().duckK.toFixed(2)]); set(); step(30);
    reset(); P().gloves[0].sel = P().gloves[0].loadout.indexOf('glaze'); P().gloves[0].heat = 50; set({ LEFT: 1 }); step(1); set(); step(40); out.push(['D◀ cook left', P().gloves[0].primed]);
    reset(); const s0 = P().gloves[1].recipe.id; set({ DOWN: 1 }); step(1); set(); step(1); out.push(['D▼ cycle right', s0, '→', P().gloves[1].recipe.id]);
    reset(); P().gloves[1].sel = P().gloves[1].loadout.indexOf('burner'); P().gloves[1].heat = 70; set({ RIGHT: 1 }); step(1); set(); step(30); out.push(['D▶ burner zones', G.bs.zones.length, G.bs.zones[0] && +G.bs.zones[0].k.toFixed(2)]);
    reset(); P().gloves[0].sel = P().gloves[0].loadout.indexOf('trail'); P().gloves[0].moisture = 60; const x0 = P().pos.x; set({ LEFT: 1 }, [-1, 0, 0, 0]); step(1); set({}, [-1, 0, 0, 0]); step(20); set(); out.push(['NeonGlaze dash moved', +Math.abs(P().pos.x - x0).toFixed(2), 'pos', P().pos.toArray().map(v=>+v.toFixed(2)), 'recipes', P().stats.recipes, P().stats.recipeFails, G.phase]); step(30);
    // clinch
    reset(); const [A, Bf] = G.f; A.pos.set(0, 0, -0.4); Bf.pos.set(0, 0, 0.4); step(1); set({ R1: 1 }); step(30); out.push(['R1 clinch', A.clinch && A.clinch.role, Bf.clinch && Bf.clinch.role, 'dist', +A.pos.distanceTo(Bf.pos).toFixed(2)]);
    A.daze = 60; step(60); out.push(['daze while holding', +A.daze.toFixed(0)]); step(150); out.push(['ref broke it (t>3.2s)', !!A.clinch]); set(); step(30);
    // stun + haze
    reset(); A.daze = 66; Bf.pos.set(0, 0, A.pos.z + 1.0); A.takeHit({ dmg: 6, part: 'head', dir: A.forward.clone().negate(), kind: 'clean' }); step(10); out.push(['stunT', +A.stunT.toFixed(2)]);
    return out;
  });
  for (const l of log) console.log(JSON.stringify(l));
  await p.evaluate(() => { const G = window.__game; for (let i = 0; i < 40; i++) { G.update(1/60); G.updateCamera(1 / 60); } G.hazeK = G.player.stunK; document.getElementById('haze').style.opacity = G.hazeK; G.renderer.domElement.style.filter = `blur(${G.hazeK*2.4}px) saturate(1.5)`; G.updateHUD(); G.render(); });
  await p.screenshot({ path: '/tmp/claude-0/plots/stun.png' });
  console.log(errs.join('\n')); await b.close();
})();
