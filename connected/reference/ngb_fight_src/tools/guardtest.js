// Guard styles: controller/keyboard selection, real hand positions per shell, the craft (what rolls off / gets in), AI shells + AI reading yours.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  const out = await p.evaluate(() => {
    const G = window.__game; G.loop = () => {}; let T = 1000; performance.now = () => T; const out = []; const ok = (n, pass, ...i) => out.push([pass ? 'PASS' : 'FAIL', n, ...i]);
    const step = n => { for (let i = 0; i < n; i++) { T += 1000 / 60; G.pollPads(); G.update(1 / 60); } };
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.stance = 'orthodox'; G.settings.guardStyle = 'high'; G.start(); step(175);
    const P = G.player, O = G.f[1]; window.__calm = () => { for (const f of G.f) { f.offBalance = 0; if (f.bal) { f.bal.inst = 0; f.bal.stumbleT = 0; } } }; /* isolate the craft being tested from the balance engine */ const ctrl1 = G.ctrl[1]; G.ctrl[1] = null; P.pos.set(0, 0, -0.5); O.pos.set(0, 0, 0.5);
    ok('opponents bring their own shell (Graham → Cross-Arm)', O.guardStyle === 'cross', O.guardStyle);
    // keyboard V cycles, saved as your default
    const seq = []; for (let i = 0; i < 5; i++) { G.press('v'); G.release('v'); seq.push(P.guardStyle); }
    ok('V cycles your guard style', seq.join(',') === 'peek,philly,long,cross,high', seq.join(','), 'saved', G.settings.guardStyle);
    // hand positions per shell (hold the guard key)
    const lg = (hi) => { const h = P.toLocal(P.vol.head.a.clone()); return P.toLocal(P.gloveNow[hi].clone()).sub(h); };
    const pose = {}; for (const k of ['high', 'peek', 'philly', 'long', 'cross']) { P.guardStyle = k; G.keys['8'] = true; step(40); pose[k] = [lg(0), lg(1)].map(v => v.toArray().map(x => +x.toFixed(2))); }
    G.keys['8'] = false; step(20);
    ok('Peek-a-Boo: gloves tight together in front of the face (closer than high guard)', pose.peek[0][0] - pose.peek[1][0] < pose.high[0][0] - pose.high[1][0] - 0.03 && pose.peek[0][2] > 0, pose.peek, pose.high);
    ok('Philly Shell: lead glove down at the belly, rear on the chin', pose.philly[0][1] < -0.35 && pose.philly[1][1] > -0.2, pose.philly);
    ok('Long Guard: lead glove out in front', pose.long[0][2] > pose.high[0][2] + 0.2, pose.long[0], pose.high[0]);
    ok('Cross-Arm: gloves crossed over the centre line', pose.cross[0][0] < 0 && pose.cross[1][0] > 0, pose.cross);
    // the craft: same clean punch into each shell
    const hitInto = (style, name, part) => { P.pos.set(0, 0, -0.5); O.pos.set(0, 0, 0.5); P.sig = O.sig = null; P.guardStyle = style; G.keys['8'] = style !== 'high'; step(30); O.strike = null; O.state = 'idle'; O.requestStrike(name); const s = O.strike; const d = (window.__calm(), G.ss).modifyHit(O, P, { dmg: 10, part, kind: 'clean', strike: s }); O.strike = null; O.state = 'idle'; G.keys['8'] = false; return +d.toFixed(2); };
    const base = { cross: hitInto('high', 'crossR', 'head'), hookL: hitInto('high', 'hookL', 'head'), upper: hitInto('high', 'upperR', 'head'), body: hitInto('high', 'bodyL', 'body'), jab: hitInto('high', 'jabL', 'head') };
    const r = (k, v) => +(v / base[k]).toFixed(2);
    ok('Philly: his right hand rolls off your lead shoulder', r('cross', hitInto('philly', 'crossR', 'head')) < 0.4, r('cross', hitInto('philly', 'crossR', 'head')), 'counter window', +(P.counterWindow || 0).toFixed(2));
    ok('Philly: his lead hook over the rear side gets in', r('hookL', hitInto('philly', 'hookL', 'head')) > 1.05, r('hookL', hitInto('philly', 'hookL', 'head')));
    ok('Peek-a-Boo: uppercut splits it, elbows eat body hooks', r('upper', hitInto('peek', 'upperR', 'head')) > 1.1 && r('body', hitInto('peek', 'bodyL', 'body')) < 0.7);
    ok('Long Guard: smothers straights, body is open', r('jab', hitInto('long', 'jabL', 'head')) < 0.7 && r('body', hitInto('long', 'bodyL', 'body')) > 1.1);
    ok('Cross-Arm: straights die on the arms, uppercut up the middle', r('cross', hitInto('cross', 'crossR', 'head')) < 0.4 && r('upper', hitInto('cross', 'upperR', 'head')) > 1.1);
    ok('guard style only counts while the guard is UP', (() => { P.guardStyle = 'cross'; G.keys['8'] = false; step(30); P.pos.set(0, 0, -0.5); O.pos.set(0, 0, 0.5); P.sig = O.sig = null; O.stamina = 100; O.strike = null; O.state = 'idle'; O.requestStrike('crossR'); const d = (window.__calm(), G.ss).modifyHit(O, P, { dmg: 10, part: 'head', kind: 'clean', strike: O.strike }); O.strike = null; O.state = 'idle'; return Math.abs(d / base.cross - 1) < 0.05; })());
    // Cross-Arm recovers stamina inside it
    const stam = k => { P.guardStyle = k; G.keys['8'] = true; P.stamina = 40; step(60); const v = P.stamina; G.keys['8'] = false; return v; };
    const sH = stam('high'), sC = stam('cross'); ok('Cross-Arm: you breathe inside it (more stamina back than a high guard)', sC > sH + 1, +sH.toFixed(1), +sC.toFixed(1));
    // ===== signature moves =====
    G.keys['8'] = false; P.guardStyle = 'high'; O.guardStyle = 'high'; step(30);
    const hitBy = (att, def, name, part = 'head', prep = () => {}) => { att.sig = null; def.sig = null; att.strike = null; att.state = 'idle'; def.strike = null; def.state = 'idle'; def.vel.set(0, 0, 0); att.stamina = def.stamina = 100; prep(); att.requestStrike(name); const s = att.strike; const d = (window.__calm(), G.ss).modifyHit(att, def, { dmg: 10, part, kind: 'clean', strike: s }); att.strike = null; att.state = 'idle'; return d; };
    const b0 = { hook: hitBy(P, O, 'hookL'), cross: hitBy(P, O, 'crossR'), rhook: hitBy(P, O, 'hookR') };
    const ch = hitBy(P, O, 'hookL', 'head', () => { P.lastPivotT = G.time; }); ok('CHECK HOOK: lead hook while pivoting', ch / b0.hook > 1.3 && O.offBalance > 0.4, +(ch / b0.hook).toFixed(2), O.offBalance);
    const ch2 = hitBy(P, O, 'hookL', 'head', () => { O.vel.copy(P.forward).multiplyScalar(-1.0); }); ok('CHECK HOOK: lead hook as he walks in', ch2 / b0.hook > 1.3, +(ch2 / b0.hook).toFixed(2));
    const nr = hitBy(P, O, 'hookR', 'head', () => { P.lastPivotT = G.time; P.lastRollT = -9; }); ok('rear hook while pivoting is NOT a check hook', Math.abs(nr / b0.rhook - 1) < 0.05, +(nr / b0.rhook).toFixed(2));
    const dr = hitBy(P, O, 'hookR', 'head', () => { P.lastRollT = G.time; }); ok('DEMPSEY ROLL: hook out of a roll', dr / b0.rhook > 1.25, +(dr / b0.rhook).toFixed(2));
    const y0 = O.yaw; const an = hitBy(P, O, 'crossR', 'head', () => { O.yaw = y0 + 1.1; }); O.yaw = y0;
    ok('ON THE ANGLE: land while he is not square to you', an / b0.cross > 1.15, +(an / b0.cross).toFixed(2));
    { P.sig = O.sig = null; const ks = []; for (const nm of ['jabL', 'crossR', 'hookL', 'crossR', 'hookL']) { P.strike = null; P.state = 'idle'; P.stamina = 100; O.vel.set(0, 0, 0); P.requestStrike(nm); ks.push(+(window.__calm(), G.ss).modifyHit(P, O, { dmg: 10, part: 'head', kind: 'clean', strike: P.strike }).toFixed(2)); T += 300; G.time += 0.3; P.strike = null; P.state = 'idle'; }
      ok('SUGAR RAY: alternating hands in rhythm hit harder and harder', P.sig.chain === 5 && ks[3] > ks[1] && ks[4] > ks[2], ks, 'chain', P.sig.chain); }
    { // rope-a-dope: you on the ropes, guard up, Graham punching
      P.pos.set(2.45, 0, 0); O.pos.set(1.6, 0, 0); G.keys['8'] = true; step(30); const r1 = hitBy(O, P, 'crossR', 'head'); const st0 = O.stamina; P.sig = { chain: 0, chainT: -9, chainHi: -1, ropeN: 0, ropeArm: -9 };
      for (let i = 0; i < 3; i++) { O.strike = null; O.state = 'idle'; O.stamina = 100; O.requestStrike('jabL'); (window.__calm(), G.ss).modifyHit(O, P, { dmg: 10, part: 'head', kind: 'clean', strike: O.strike }); O.strike = null; O.state = 'idle'; }
      const armed = P.sig.ropeArm > G.time; G.keys['8'] = false; step(1); P.strike = null; P.state = 'idle'; P.stamina = 100; P.requestStrike('crossR'); const pay = (window.__calm(), G.ss).modifyHit(P, O, { dmg: 10, part: 'head', kind: 'clean', strike: P.strike }); P.strike = null; P.state = 'idle';
      P.pos.set(0, 0, -0.5); O.pos.set(0, 0, 0.5); O.sig = null; const ref = hitBy(O, P, 'crossR', 'head'); const stRef = O.stamina;
      ok('ROPE-A-DOPE: ropes soak it, he pays stamina', r1 / ref < 0.7 && st0 < stRef - 2, +(r1 / ref).toFixed(2), 'his stamina after the shot: ropes', +st0.toFixed(1), 'open ring', +stRef.toFixed(1));
      ok('ROPE-A-DOPE: after 3, your right hand off the ropes', armed && pay / b0.cross > 1.4, armed, +(pay / b0.cross).toFixed(2)); }
    // AI reads your shell: count uppercuts vs high guard and vs cross-arm
    G.ctrl[1] = ctrl1; const ups = k => { P.guardStyle = k; let n = 0, prev = null; for (let i = 0; i < 60 * 40; i++) { G.keys['8'] = true; P.health = 100; P.stamina = 100; O.stamina = 100; P.pos.set(0, 0, -0.45); step(1); const s = O.strike && O.strike.name; if (s && s !== prev && /^upper/.test(s)) n++; prev = s; } G.keys['8'] = false; return n; };
    const uH = ups('high'), uC = ups('cross'); ok('AI reads your Cross-Arm and goes up the middle', uC > uH, 'uppercuts vs high', uH, 'vs cross', uC);
    return out;
  });
  let pass = 0, fail = 0; for (const l of out) { if (l[0] === 'PASS') pass++; else fail++; console.log(JSON.stringify(l)); }
  console.log(`${pass} pass / ${fail} fail`); console.log(errs.join('\n')); await b.close();
})();
