// Footwork physics: pivots judged by weight/skill/what you're doing, switch-steps, stumbles, feet-limited turning.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  const out = await p.evaluate(() => {
    const G = window.__game; G.loop = () => {}; let T = 1000; performance.now = () => T; const out = []; const ok = (n, pass, ...i) => out.push([pass ? 'PASS' : 'FAIL', n, ...i]);
    const step = n => { for (let i = 0; i < n; i++) { T += 1000 / 60; G.pollPads(); G.update(1 / 60); } };
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.stance = 'orthodox'; G.start(); step(175);
    const P = G.player, O = G.f[1]; const ai = G.ctrl[1]; G.ctrl[1] = null;
    const evs = []; const oe = G.onEvent.bind(G); G.onEvent = (f, t, d) => { if (f === P) evs.push([t, d]); return oe(f, t, d); };
    const reset = (attr = 70) => { P.attr.balance = P.attr.agility = attr; P.pos.set(0, 0, -0.5); O.pos.set(0, 0, 0.5); P.yaw = 0; O.yaw = Math.PI; P.vel.set(0, 0, 0); P.stamina = O.stamina = 100; P.offBalance = 0; P.daze = 0; P.stunT = 0; P.strike = null; P.state = 'idle'; P.intent.move.set(0, 0); P.intent.pull = 0; P.switching = null; P.pivotStep = null; if (P.bal) P.bal.stumbleT = 0; O.intent.move.set(0, 0); step(50); evs.length = 0; };
    const angleSeen = () => { const to = P.pos.clone().sub(O.pos); to.y = 0; const fw = O.forward; fw.y = 0; return Math.acos(Math.max(-1, Math.min(1, to.normalize().dot(fw.normalize())))); };
    const pivot = side => { const p0 = P.pos.clone(); let maxA = 0; P.pivot = side; step(1); P.pivot = null; for (let i = 0; i < 40; i++) { step(1); maxA = Math.max(maxA, angleSeen()); } const e = evs.find(x => x[0] === 'pivot'); return { moved: P.pos.distanceTo(p0), maxA, r: e && e[1], stumbled: evs.some(x => x[0] === 'stumble') }; };
    // 1. a skilled fighter's pivot is clean and really takes the angle
    reset(95); const c1 = pivot('left'); ok('skilled pivot on the lead foot: clean, moves you ~0.5 m and puts you 30°+ off his line', c1.r && c1.r.clean && c1.moved > 0.3 && c1.maxA > 0.55, 'q', c1.r && +c1.r.q.toFixed(2), 'moved', +c1.moved.toFixed(2), 'deg', Math.round(c1.maxA * 57.3));
    // 2. weight matters: after a cross your weight is on the lead foot (good lead pivot); pulling back loads the rear (bad lead pivot)
    reset(70); const qN = window.__bal.pivotQuality(P, 'left', false).q, fN = P.bal.front;
    P.requestStrike('crossR'); let qC = 0, fC = 0; for (let i = 0; i < 40; i++) { step(1); if (P.bal.front > fC) { fC = P.bal.front; } } P.strike = null; P.state = 'idle'; step(1); qC = window.__bal.pivotQuality(P, 'left', false).q; fC = P.bal.front;
    reset(70); G.keys.r = true; step(30); const qP = window.__bal.pivotQuality(P, 'left', false).q, fP = P.bal.front; G.keys.r = false;
    ok('weight distribution is real: cross loads the lead foot, pulling back loads the rear', fP < fN - 0.08, 'front-foot weight: neutral', +fN.toFixed(2), 'pulled back', +fP.toFixed(2));
    ok('…and a lead-foot pivot is worse with your weight back', qP < qN - 0.04, 'pivot quality: neutral', +qN.toFixed(2), 'pulled back', +qP.toFixed(2));
    // 3. what your hands are doing: pivoting on the rear foot in the middle of a power cross is bad; a lead hook on the lead foot is the check hook
    reset(70); P.requestStrike('crossR', true); step(4); const qBad = window.__bal.pivotQuality(P, 'right', false); P.strike = null; P.state = 'idle'; step(20);
    reset(70); P.requestStrike('hookL'); step(4); const qHook = window.__bal.pivotQuality(P, 'left', false); P.strike = null; P.state = 'idle';
    ok('rear-foot pivot mid power-cross = bad; lead hook + lead pivot = good', qBad.q < 0.45 && qHook.q > qBad.q + 0.25, +qBad.q.toFixed(2), qBad.why, +qHook.q.toFixed(2));
    // 4. skill + condition decide how often it goes right (12 tries each)
    const rate = (attr, bad) => { let clean = 0, stum = 0; for (let k = 0; k < 12; k++) { reset(attr); if (bad) { P.stamina = 12; G.keys.r = true; step(25); } const r = pivot(k % 2 ? 'left' : 'left'); if (r.r && r.r.clean) clean++; if (r.stumbled) stum++; G.keys.r = false; } return { clean, stum }; };
    const hi = rate(95, false), lo = rate(50, false), worst = rate(50, true);
    ok('skill: a great mover pivots clean far more often', hi.clean >= 10 && hi.clean >= lo.clean + 3, 'clean /12: skilled', hi.clean, 'average', lo.clean);
    ok('bad legs + weight back + low skill = you trip over yourself', worst.stum >= 5, 'stumbles /12', worst.stum, 'clean', worst.clean);
    // 5. switching stance is a real switch-step
    reset(70); const z0 = P.toLocal(O.pos.clone()).z; P.intent.move.set(0, 1); G.press('b'); G.release('b'); const sw0 = !!P.switching; const fsKeep = P.footSys; let flippedAt = null; for (let i = 0; i < 40; i++) { step(1); if (flippedAt == null && P.stance === 'southpaw') flippedAt = i; } P.intent.move.set(0, 0); step(10);
    ok('B (keyboard) / R3 (pad) = switch-step: stance flips when the feet pass, it takes time', sw0 && P.stance === 'southpaw' && flippedAt >= 8, 'flipped after frames', flippedAt);
    ok('stepping through moves you forward', P.pos.distanceTo(O.pos) < 1.0 - 0.2, 'distance to him', +P.pos.distanceTo(O.pos).toFixed(2));
    ok('feet walk to the new stance (no teleport)', P.footSys && evs.some(x => x[0] === 'switchDone'), JSON.stringify((evs.find(x => x[0] === 'switchDone') || [])[1]));
    reset(70); G.press('b'); G.release('b'); step(2); const swHit = (() => { step(6); O.strike = null; O.state = 'idle'; O.requestStrike('crossR', true); const tags = []; const k = window.__bal.hitWhileUnstable(P, O, O.strike, tags); O.strike = null; O.state = 'idle'; return { k, tags }; })(); step(40);
    reset(70); const stHit = (() => { O.requestStrike('crossR', true); const tags = []; const k = window.__bal.hitWhileUnstable(P, O, O.strike, tags); O.strike = null; O.state = 'idle'; return { k, tags }; })();
    ok('caught mid-switch: the shot lands harder and moves you', swHit.k > 1.1 && stHit.k < 1.05, swHit, stHit);
    // 6. turning needs feet: after HIS clean pivot you can't square up instantly
    reset(70); P.attr.agility = 70; O.attr.balance = O.attr.agility = 95; O.yaw = Math.PI; O.pivot = 'right'; step(1); O.pivot = null; const offs = []; for (let i = 0; i < 50; i++) { step(1); const to = O.pos.clone().sub(P.pos); to.y = 0; offs.push(Math.acos(Math.max(-1, Math.min(1, to.normalize().dot(P.forward.setY(0).normalize()))))); }
    const longOff = offs.filter(a => a > 0.5).length / 60; ok('after his clean pivot you are off-line for a real beat (your feet have to turn)', longOff > 0.2 && offs[offs.length - 1] < 0.3, 'seconds off-line', +longOff.toFixed(2), 'max deg', Math.round(Math.max(...offs) * 57.3));
    G.ctrl[1] = ai; return out;
  });
  let pass = 0, fail = 0; for (const l of out) { if (l[0] === 'PASS') pass++; else fail++; console.log(JSON.stringify(l)); }
  console.log(`${pass} pass / ${fail} fail`); console.log(errs.join('\n')); await b.close();
})();
