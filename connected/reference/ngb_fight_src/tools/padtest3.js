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
    let T = 1000; performance.now = () => T;
    let held = {}, ax = [0, 0, 0, 0];
    const apply = () => { pad.buttons.forEach(x => { x.pressed = false; x.value = 0; }); for (const k in held) if (held[k]) { pad.buttons[B[k]].pressed = true; pad.buttons[B[k]].value = 1; } pad.axes = ax.slice(); };
    const step = (n = 1) => { for (let i = 0; i < n; i++) { T += 1000 / 60; apply(); G.loop2(); } };
    G.loop2 = () => { G.pollPads(); if (G.f.length && !G.paused) G.update(1 / 60); };
    const out = []; G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.padScheme = 'analog'; G.settings.stance = 'orthodox'; G.start(); G.ctrl[1] = null; step(175);
    const P = G.player, O = G.f[1];
    const reset = () => { held = {}; ax = [0, 0, 0, 0]; step(3); for (const f of G.f) { f.strike = null; f.state = 'idle'; f.stamina = 100; f.offBalance = 0; f.stagger = 0; f.queued = null; f.queuedAnalog = null; f.stunT = 0; f.clinch = null; f.powerRecover = 0; f.clinchCD = 0; } P.pos.set(0, 0, -0.55); O.pos.set(0, 0, 0.55); step(4); };
    const nm = () => P.strike ? P.strike.name + (P.strike.heavy ? '(POWER)' : '') : null;
    // straight + hold + release
    reset(); held.R1 = 1; step(2); ax = [0, 0, 0, -1]; step(3); out.push(['R1 + ↑', nm()]); step(30); out.push(['holding: t frozen at impact', P.strike && +(P.strike.t - P.strike.def.impact).toFixed(3), 'hold', P.strike && P.strike.hold]);
    ax = [0, 0, 0, 0]; step(40); out.push(['released → retracted & done', P.strike === null]);
    reset(); held.L1 = 1; step(2); ax = [0, 0, 1, 0]; step(3); out.push(['L1 + →', nm()]); ax = [0, 0, 0, 0]; step(45);
    reset(); held.R1 = 1; step(2); ax = [0, 0, 0, 1]; step(4); out.push(['R1 + ↓ (dip, <chamber)', nm()]); step(6); out.push(['R1 + ↓ held → body', nm()]); ax = [0, 0, 0, 0]; step(45);
    reset(); held.R1 = 1; step(2); ax = [0, 0, 0, 1]; step(3); ax = [0, 0, 0, -1]; step(3); out.push(['R1 dip ↓ then rip ↑', nm()]); ax = [0, 0, 0, 0]; step(45);
    reset(); held.R1 = 1; step(2); ax = [0, 0, -0.7, -0.7]; step(3); out.push(['R1 + ↖', nm()]); ax = [0, 0, 0, 0]; step(50);
    // power: tap, release, press-hold, flick
    reset(); held.R1 = 1; step(5); held.R1 = 0; step(5); held.R1 = 1; step(2); ax = [0, 0, 0, -1]; step(3); out.push(['tap + hold R1 + ↑', nm(), 'recover', +P.powerRecover.toFixed(2)]); ax = [0, 0, 0, 0]; step(3);
    held.R1 = 0; step(2); held.L1 = 1; step(4); held.L1 = 0; step(4); held.L1 = 1; step(2); ax = [0, 0, 0, -1]; step(30); out.push(['immediate L power → unbalanced?', P.strike ? P.strike.unbalanced : 'finished', 'queued', !!P.queuedAnalog]); ax = [0, 0, 0, 0]; step(60); out.push(['offBalance after', +P.offBalance.toFixed(2), 'lastStrike unbalanced flag seen']);
    // guards
    reset(); held.L2 = 1; step(20); const gy0 = P.gloveNow[0].y; out.push(['L2 guard', +P.handGuardAmt[0].toFixed(2), 'R', +P.handGuardAmt[1].toFixed(2)]); ax = [0, 0, 0, 1]; step(20); out.push(['L2 + stick ↓ drags guard down', +(P.gloveNow[0].y - gy0).toFixed(3), 'duck stays', +P.duckK.toFixed(2)]); ax = [0, 0, -1, 0]; step(15); out.push(['L2 + ← still slips', +P.weaveX.toFixed(2)]);
    // lean latch
    reset(); ax = [0, 0, -1, 0]; step(20); held.R1 = 1; ax = [0, 0, 0, 0]; step(20); out.push(['lean latched after R1', +P.weaveX.toFixed(2)]);
    // pivot
    reset(); const p0 = P.pos.clone(); held.X = 1; step(40); held.X = 0; step(2); out.push(['X pivot moved', +P.pos.distanceTo(p0).toFixed(2)]);
    // scoot
    reset(); held.A = 1; step(30); held.A = 0; step(2); out.push(['A rear foot offset', P.footOffset.map(v => +v.toFixed(2))]);
    // switch stance
    reset(); held.A = 1; held.B = 1; step(2); held = {}; step(5); out.push(['A+B stance', P.stance]); held.R1 = 1; step(2); ax = [0, 0, 0, -1]; step(3); out.push(['southpaw R1 ↑', nm(), 'hand', P.strike && P.strike.def.hand]); ax = [0, 0, 0, 0]; held = {}; step(40);
    held.A = 1; held.B = 1; step(2); held = {}; step(5);
    // clinch + dirty boxing
    reset(); P.pos.set(0, 0, -0.4); O.pos.set(0, 0, 0.4); held.L1 = 1; held.R1 = 1; step(10); out.push(['L1+R1 clinch', P.clinch && P.clinch.role]);
    held.L1 = 0; step(3); out.push(['release L1: holds', P.clinch && P.clinch.holds]); ax = [0, 0, 0, -1]; step(4); out.push(['free left hand punches', nm(), 'dirty', P.strike && P.strike.dirty]); ax = [0, 0, 0, 0]; step(40);
    for (let k = 0; k < 4; k++) { ax = [0, 0, 1, 0]; step(4); ax = [0, 0, 0, 0]; step(36); }
    out.push(['fouls', P.fouls, 'warnings', P.stats.warnings || 0, 'still clinched', !!P.clinch]);
    return out;
  });
  for (const l of log) console.log(JSON.stringify(l));
  console.log(errs.join('\n')); await b.close();
})();
