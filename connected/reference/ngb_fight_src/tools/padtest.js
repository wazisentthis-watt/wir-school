const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 4).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate(() => {
    const B = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7, OPT: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
    const mk = (i) => ({ index: i, id: 'SteelSeries Nimbus+ (STANDARD GAMEPAD Vendor: 0111 Product: 1420)', connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
    window.__fakePads = [mk(0)];
    window.pad = (i, btns = {}, axes = [0, 0, 0, 0]) => { const g = window.__fakePads[i]; g.buttons.forEach((x, j) => { x.pressed = false; x.value = 0; }); for (const k in btns) { g.buttons[B[k]].pressed = true; g.buttons[B[k]].value = 1; } g.axes = axes; };
    const G = window.__game; G.loop = () => {};
    window.step = (n = 1) => { for (let i = 0; i < n; i++) { G.pollPads(); if (G.f.length && !G.paused) G.update(1 / 60); } };
    window.tap = (i, btns, axes, hold = 1) => { pad(i, btns, axes); step(hold); pad(i, {}, [0, 0, 0, 0]); step(1); };
  });
  await p.waitForTimeout(100);
  const log = await p.evaluate(() => {
    const G = window.__game; const out = [];
    // --- menu navigation ---
    tap(0, {}, [0, 0, 0, 0]); // connect
    out.push(['padmode', document.body.classList.contains('padmode'), 'focus', G.nav.el && (G.nav.el.dataset.m || G.nav.el.id)]);
    tap(0, { RIGHT: 1 }); out.push(['after right', G.nav.el && (G.nav.el.dataset.m || G.nav.el.id || G.nav.el.textContent.slice(0, 20))]);
    tap(0, { A: 1 }); out.push(['mode after A', G.settings.mode, 'focus kept', G.nav.el && G.nav.el.dataset.m]);
    // pick quick, exhibition rules via clicks (nav activation path tested above)
    G.settings.mode = 'quick'; G.settings.rules = 'exhibition'; G.settings.p1 = 'skillet'; G.buildMenu();
    tap(0, { MENU: 1 }); out.push(['started', G.mode, G.phase, 'player', G.player && G.player.spec.short]);
    step(170); out.push(['phase', G.phase]);
    // --- fight inputs ---
    const P = G.player; const z0 = P.pos.clone();
    pad(0, {}, [0, -1, 0, 0]); step(40); out.push(['advance moved', +P.pos.distanceTo(z0).toFixed(2), 'intent', P.intent.move.toArray()]);
    pad(0, {}, [0, 0, 0, 0]); step(5);
    const thrown0 = P.stats.thrown; tap(0, { X: 1 }); out.push(['X → strike', P.strike && P.strike.name]); step(30);
    tap(0, { L2: 1, Y: 1 }); out.push(['L2+Y → strike', P.strike && P.strike.name]); step(40);
    tap(0, { A: 1 }); out.push(['A →', P.strike && P.strike.name]); step(40);
    tap(0, { B: 1 }); out.push(['B →', P.strike && P.strike.name]); step(40);
    tap(0, { R1: 1 }); out.push(['R1 →', P.strike && P.strike.name]); step(45);
    pad(0, { R2: 1 }); step(10); out.push(['R2 guard', P.guardHeld, +P.guardHigh.toFixed(2)]);
    pad(0, { R2: 1, L2: 1 }); step(10); out.push(['L2+R2 guard', P.guardHeld]); pad(0, {}); step(5);
    pad(0, {}, [0, 0, -0.9, 0]); step(15); out.push(['RS left weave', +P.weaveX.toFixed(2)]); pad(0, {}); step(15);
    pad(0, {}, [0, 0, -0.7, 0.8]); step(2); out.push(['RS ↙ roll', !!P.roll, P.roll && P.roll.dir]); pad(0, {}); step(40);
    tap(0, { DOWN: 1 }); out.push(['dpad down recipe', P.gloves[0].recipe.id]); tap(0, { RIGHT: 1 }); out.push(['dpad right glove', P.cfgGlove]);
    tap(0, { LEFT: 1 }); P.gloves[0].sel = 0; P.gloves[0].heat = 50; tap(0, { L1: 1 }); step(40); out.push(['L1 cook glaze', P.gloves[0].primed, P.stats.recipes]);
    P.focus = 60; P.stamina = 80; tap(0, { L2: 1, UP: 1 }); out.push(['L2+up weightshift', P.form, +P.focus.toFixed(0)]); step(60); out.push(['morph', P.mesh.meshes.skin.morphTargetInfluences && P.mesh.meshes.skin.morphTargetInfluences.map(v => +v.toFixed(2))]);
    P.focus = 60; P.stamina = 80; tap(0, { L2: 1, DOWN: 1 }); step(5); P.focus = 60; tap(0, { L2: 1, DOWN: 1 }); step(60); out.push(['dense', P.form, P.mesh.meshes.skin.morphTargetInfluences.map(v => +v.toFixed(2))]);
    tap(0, { MENU: 1 }); out.push(['paused', G.paused]); tap(0, { B: 1 }); out.push(['B resumes', G.paused]);
    out.push(['thrown', P.stats.thrown - thrown0, 'errors?']);
    // --- versus with two pads ---
    window.__fakePads.push(JSON.parse(JSON.stringify(window.__fakePads[0]))); window.__fakePads[1].index = 1; window.__fakePads[1].buttons.forEach(x => { x.pressed = false; x.value = 0; });
    G.settings.mode = 'versus'; G.settings.p0 = 'savannah'; G.settings.p1 = 'pop'; G.start(); step(170);
    const own = G.padOwners(G.pads.state); out.push(['versus owners', Object.entries(own).map(([k, f]) => k + ':' + f.spec.short).join(','), 'ctrl', G.ctrl.map(c => !!c)]);
    tap(1, { Y: 1 }); out.push(['P2 Y →', G.f[1].strike && G.f[1].strike.name, 'P1', G.f[0].strike && G.f[0].strike.name]);
    return out;
  });
  for (const l of log) console.log(JSON.stringify(l));
  await p.evaluate(() => { const G = window.__game; for (let i = 0; i < 30; i++) G.updateCamera(1 / 60); G.updateHUD(); G.render(); });
  await p.screenshot({ path: '/tmp/claude-0/plots/pad_versus.png' });
  console.log(errs.join('\n')); await b.close();
})();
