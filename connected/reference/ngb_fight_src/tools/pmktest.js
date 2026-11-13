// PMK body-control end-to-end test: a synthetic boxer's 33 MediaPipe landmarks → the real tracker → the real fighter,
// IK, swept-glove collision and combat rules in the rendered game. Usage: node pmktest.js [mirrored]
const { chromium } = require('playwright');
const MIRROR = process.argv.includes('mirrored'); const SHOT = process.argv.includes('shot'); const SIDE = process.argv.includes('side') ? 1.35 : 0; const SYNC = process.argv.includes('sync'); // side: camera off to your side, like your bag videos
async function shots(p) {
  const poses = [
    ['guard', `body.wr=[guardW(0),guardW(1)];`],
    ['jab_extended', `body.wr=[__T.jabT(0, V(-0.2,0.1,1)), guardW(1)];`],
    ['cross_extended', `body.wr=[guardW(0), __T.jabT(1, V(-0.3,0.1,1))];`],
    ['lead_hook', `body.wr=[V(-0.1,0.6,0.42), guardW(1)];`],
    ['rear_uppercut', `body.wr=[guardW(0), V(-0.04,0.6,0.38)];`],
    ['slip_left_guard_up', `body.wr=[guardW(0),guardW(1)]; body.lean=1;`],
    ['duck', `body.lean=0; body.squat=1;`],
  ];
  for (const [n, js] of poses) {
    await p.evaluate(`(() => { const {body, step, guardW, V, G, P} = window.__T; ${js} G.f[1].pos.set(0,0,0.9); P.pos.set(0,0,-0.5); step(24); G.camera.position.set(2.3, 1.5, -0.1); G.camera.lookAt(0, 1.2, 0.1); G.camera.fov = 42; G.camera.updateProjectionMatrix(); document.getElementById('hud').style.display='none'; for (const id of ['pmkChip','pmkPrev']) { const e=document.getElementById(id); if (e) e.style.display='none'; } G.render(); })()`);
    await p.screenshot({ path: '/tmp/claude-0/plots/pmk_' + n + '.png', clip: { x: 340, y: 60, width: 600, height: 560 } });
  }
}
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 4).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  const log = await p.evaluate(([MIRROR, SHOT, SIDE, SYNC]) => {
    const G = window.__game; G.loop = () => {};
    let T = 1000; performance.now = () => T;
    // ---------- synthetic boxer (true body frame: X = own left, Y up, Z toward camera; origin = hip centre) ----------
    const V = (x, y, z) => ({ x, y, z }); const add = (a, b) => V(a.x + b.x, a.y + b.y, a.z + b.z); const sub = (a, b) => V(a.x - b.x, a.y - b.y, a.z - b.z); const mul = (a, k) => V(a.x * k, a.y * k, a.z * k);
    const len = a => Math.hypot(a.x, a.y, a.z); const nrm = a => mul(a, 1 / (len(a) || 1)); const lerp = (a, b, t) => add(a, mul(sub(b, a), t)); const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    const U1 = 0.28, U2 = 0.27;
    const body = { lean: 0, squat: 0, back: 0, yaw: 0, stepX: 0, dist: 2.5, wr: [null, null], vis: [1, 1], gone: false, sw: 0.38, ank: [V(0.12, -0.9, 0), V(-0.12, -0.9, 0)], feetVis: 1, root: V(0, 0, 0) };
    const guardW = hi => { const s = hi === 0 ? 1 : -1; return V(0.09 * s, 0.6, 0.2); };
    body.wr = [guardW(0), guardW(1)];
    // the four shells, as real hand positions (orthodox: left = lead)
    const SHELL = { peek: () => [V(0.06, 0.63, 0.16), V(-0.06, 0.63, 0.16)], philly: () => [V(-0.02, 0.22, 0.2), V(-0.05, 0.6, 0.15)], long: () => [V(0.12, 0.56, 0.5), guardW(1)], cross: () => [V(-0.1, 0.4, 0.22), V(0.1, 0.58, 0.2)] };
    const shellTo = (k, n0 = 22) => { const n = k === 'long' ? Math.max(n0, 45) : n0; const tg = k === 'high' ? [guardW(0), guardW(1)] : SHELL[k](); const a = body.wr.slice(); for (let i = 1; i <= n; i++) { body.wr = [lerp(a[0], tg[0], i / n), lerp(a[1], tg[1], i / n)]; step(1); } };
    const elbowFor = (S, W, hi) => { const d = sub(W, S); const L = Math.min(len(d), U1 + U2 - 1e-3); const dir = nrm(d); const a = (U1 * U1 + L * L - U2 * U2) / (2 * U1 * L); const h = Math.sqrt(Math.max(0, 1 - a * a)) * U1; let pole = V((hi === 0 ? 1 : -1) * 0.4, -1, 0); pole = sub(pole, mul(dir, pole.x * dir.x + pole.y * dir.y + pole.z * dir.z)); return add(add(S, mul(dir, a * U1)), mul(nrm(pole), h)); };
    function frame() {
      const c = Math.cos(body.yaw), s = Math.sin(body.yaw); const rot = v => V(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
      const top = V(body.lean * 0.16, -body.squat * 0.0, -body.back * 0.12); // shoulders relative to hips
      const P = new Array(33).fill(null).map(() => V(0, 0, 0));
      const sh = [add(rot(V(body.sw / 2, 0.5, 0)), top), add(rot(V(-body.sw / 2, 0.5, 0)), top)];
      P[11] = sh[0]; P[12] = sh[1]; P[23] = rot(V(0.12, 0, 0)); P[24] = rot(V(-0.12, 0, 0)); P[0] = add(V(0, 0.68, 0.08), top);
      P[7] = add(P[0], V(0.07, 0, -0.06)); P[8] = add(P[0], V(-0.07, 0, -0.06));
      for (let hi = 0; hi < 2; hi++) { const W = add(body.wr[hi], top); const S = sh[hi]; const dW = sub(W, S); const W2 = len(dW) > U1 + U2 ? add(S, mul(nrm(dW), U1 + U2 - 0.002)) : W; P[15 + hi] = W2; P[13 + hi] = elbowFor(S, W2, hi); }
      for (let f = 0; f < 2; f++) { const A = body.ank[f]; P[27 + f] = rot(A); P[25 + f] = rot(V(A.x, -0.45, A.z * 0.5 + 0.02)); }
      for (const i of [1, 2, 3, 4, 5, 6, 9, 10, 17, 18, 19, 20, 21, 22, 29, 30, 31, 32]) P[i] = P[i] && len(P[i]) ? P[i] : add(P[0], V(0, 0, 0));
      // MediaPipe-style: selfie-mirrored world (x = −own left), y down, z away from camera; labels anatomically correct unless MIRROR
      const cS = Math.cos(SIDE), sS = Math.sin(SIDE); const side = q => SIDE ? V(q.x * cS + q.z * sS, q.y, -q.x * sS + q.z * cS) : q; // whole body turned relative to the camera
      const world = P.map(q => { const r = side(q); return { x: -r.x, y: -r.y, z: -r.z, visibility: 0.99 }; });
      const k = 0.3 * 2.5 / body.dist; const img = P.map(q => ({ x: 0.5 + (-side(add(q, body.root)).x - body.stepX) * k, y: 0.62 - q.y * k + body.squat * 0.12, z: 0, visibility: 0.99 }));
      if (body.feetVis < 0.5) for (const i of [25, 26, 27, 28]) { world[i].visibility = 0.2; img[i].visibility = 0.2; }
      for (let hi = 0; hi < 2; hi++) if (body.vis[hi] < 0.5) for (const i of [13 + hi, 15 + hi]) { world[i].visibility = body.vis[hi]; img[i].visibility = body.vis[hi]; }
      if (MIRROR) for (const [a, b] of [[11, 12], [13, 14], [15, 16], [23, 24], [25, 26], [27, 28], [7, 8]]) { [world[a], world[b]] = [world[b], world[a]]; [img[a], img[b]] = [img[b], img[a]]; }
      return body.gone ? { lm: null, world: null, t: T } : { lm: img, world, t: T };
    }
    let fr = 0; const step = (n = 1) => { for (let i = 0; i < n; i++) { T += 1000 / 60; if (++fr % 2 === 0 && G.pmk.active) G.pmk.feed(frame()); G.pollPads(); if (G.f.length && !G.paused) G.update(1 / 60); } };
    const out = []; const ok = (name, pass, ...info) => out.push([pass ? 'PASS' : 'FAIL', name, ...info]);
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.stance = 'orthodox'; G.start(); G.ctrl[1] = null; step(175);
    const P = G.player, O = G.f[1];
    // camera "on" without hardware: same code path from feed() onward
    G.pmk.active = true; G.pmk.state = 'calibrating'; G.pmk.tracker = new (G.pmk.tracker.constructor)({ swap: false }); G.pmk.lastRes = T;
    const tr = () => G.pmk.tracker;
    if (SYNC) {
      // ================= BODY SYNC: the whole tutorial driven by a synthetic boxer =================
      const ORTH = [V(0.12, -0.9, 0.17), V(-0.12, -0.9, -0.17)], SOUTH = [V(0.12, -0.9, -0.17), V(-0.12, -0.9, 0.17)];
      body.ank = ORTH.slice(); localStorage.removeItem('ngb_sync_profile'); G.pmk.profile = null;
      G.startSync(); step(20); const S = G.pmk.sync;
      ok('sync: BODY SYNC starts a session + overlay', S.active && G.mode === 'training' && !document.getElementById('sync').classList.contains('hidden'), S.active, G.mode);
      const wrTo = (hi, target, frames) => { const a = body.wr[hi]; for (let i = 1; i <= frames; i++) { body.wr[hi] = lerp(a, target, i / frames); step(1); } };
      const jabT = (hi, dir = V(0, 0.08, 1), r = 0.53) => { const s = hi === 0 ? 1 : -1; const Sh = V(s * body.sw / 2, 0.5, 0); return add(Sh, mul(nrm(V(dir.x * s, dir.y, dir.z)), r)); };
      const own = (hi, x, y, z) => V((hi === 0 ? 1 : -1) * x, y, z); // x toward own side of THAT hand
      const PATH = { // [via, end] for each punch, per hand (x mirrored per side)
        straight: hi => [[jabT(hi, V(-0.25, 0.05, 1)), 6]],
        hook: hi => [[own(hi, 0.24, 0.55, 0.16), 4], [own(hi, -0.12, 0.6, 0.42), 6]],
        upper: hi => [[own(hi, 0.06, 0.32, 0.22), 5], [own(hi, -0.03, 0.62, 0.4), 6]],
        bodyStraight: hi => [[own(hi, 0.02, 0.18, 0.46), 6]],
      };
      const sid = () => S.step() && S.step().id; const waitFor = (id, max = 400) => { for (let i = 0; i < max && sid() !== id && S.active; i++) step(1); return sid() === id; };
      const rep = (hi, type) => { for (const [tg, n] of PATH[type](hi)) wrTo(hi, tg, n); step(3); if (type === 'bodyStraight') body.squat = 0.5; wrTo(hi, guardW(hi), 8); step(14); };
      step(60); ok('sync: frame step passed (feet seen)', sid() !== 'frame' && S.feetOK, sid(), S.feetOK);
      step(110); ok('sync: guard captured', waitFor('left', 10), sid(), tr().cal.stance0);
      const steps = [['left', 0, 'straight'], ['jab', 0, 'straight'], ['cross', 1, 'straight'], ['hookL', 0, 'hook'], ['hookR', 1, 'hook'], ['upL', 0, 'upper'], ['upR', 1, 'upper'], ['bodyL', 0, 'bodyStraight'], ['bodyR', 1, 'bodyStraight']];
      for (const [id, hi0, type] of steps) {
        const okIn = waitFor(id); const hi = MIRROR ? hi0 : hi0; step(130); // watch the demo
        const n0 = S.reps.length; let k = 0; if (type === 'bodyStraight') body.squat = 0.5;
        while (sid() === id && k < 7) { rep(hi, type); k++; }
        body.squat = 0;
        const got = S.reps.filter(r => r.step === id).length;
        ok(`sync: ${id} — ${id === 'left' ? 1 : 3} reps counted on the ${hi ? 'right' : 'left'} hand`, okIn && got === (id === 'left' ? 1 : 3), 'got', got, 'tries', k, 'fb', S.fb.slice(0, 60), sid());
      }
      ok('sync: stance from feet (after left-hand check)', tr().cal.stance0 === 'orthodox', tr().cal.stance0, 'swap', tr().swap); waitFor('gBody'); body.wr = [own(0, 0.08, 0.25, 0.14), own(1, 0.08, 0.25, 0.14)]; step(100); ok('sync: body guard learned', !!S.bodyGuard && sid() !== 'gBody', sid());
      body.wr = [guardW(0), guardW(1)]; step(20);
      for (const [id, k] of [['sPeek', 'peek'], ['sPhilly', 'philly'], ['sLong', 'long'], ['sCross', 'cross']]) { waitFor(id); step(110); shellTo(k); step(90); ok(`sync: ${k} shell learned`, S.styles && S.styles[k] && sid() !== id, sid()); shellTo('high'); step(10); }
      for (const [id, set] of [['slipL', () => body.lean = 1], ['slipR', () => body.lean = -1], ['duck', () => body.squat = 1], ['pull', () => body.back = 1]]) {
        waitFor(id); let k = 0; while (sid() === id && k < 5) { set(); step(24); body.lean = body.squat = body.back = 0; step(24); k++; }
        ok(`sync: ${id} ×2`, sid() !== id, sid(), 'range', +(S.torso[id] || 0).toFixed(2));
      }
      waitFor('switch'); body.ank = SOUTH.slice(); step(120); ok('sync: southpaw learned', !!S.stance.other && S.stance.other.sig < 0, S.stance.other && +S.stance.other.sig.toFixed(3));
      body.ank = ORTH.slice(); step(120); ok('sync: back to orthodox', !!S.stance.main && S.stance.main.sig > 0, S.stance.main && +S.stance.main.sig.toFixed(3));
      step(10); const pr = G.pmk.profile;
      ok('sync: profile saved (templates per hand, guards, torso, stance)', !S.active || /COMPLETE/.test(document.getElementById('sync').textContent), !!pr && pr.templates[0].length, pr && pr.templates[1].length, pr && !!pr.guard.body, pr && pr.stance.thr, pr && pr.vMin);
      ok('sync: profile persisted', !!localStorage.getItem('ngb_sync_profile'));
      document.getElementById('syPlay') && document.getElementById('syPlay').click(); step(30);
      // ---- after sync: your own templates drive classification ----
      const P = G.player, O = G.f[1]; const commits = []; const oe = G.pmk.onEvent.bind(G.pmk); G.pmk.onEvent = e => { if (e.type === 'commit' || e.type === 'reclass') commits.push(e.type + ':' + e.strike + ':' + (tr().hands[e.hi].clsBy || '')); return oe(e); };
      const play = (hi, type) => { commits.length = 0; for (const f of G.f) { f.strike = null; f.state = 'idle'; f.stamina = 100; } if (type === 'bodyStraight') body.squat = 0.5; rep(hi, type); body.squat = 0; step(20); return commits.slice(); };
      O.pos.set(0, 0, 0.5); P.pos.set(0, 0, -0.5);
      const exp = { straight: ['straight', 'straight'], hook: ['hook', 'hook'], upper: ['upper', 'upper'], bodyStraight: ['bodyStraight', 'bodyStraight'] };
      for (const type of Object.keys(exp)) for (const hi of [0, 1]) { const c = play(hi, type); const last = c.length ? c[c.length - 1].split(':') : []; ok(`after sync: ${type} ${hi ? 'R' : 'L'} → ${exp[type][hi]} (your template)`, last[1] === exp[type][hi] && last[2] === 'you', c.join(' ')); }
      // ---- guard per hand: face vs body ----
      { const seen = {}; for (const k of ['cross', 'long', 'philly', 'peek', 'high']) { shellTo(k); step(30); seen[k] = tr().style; } ok('after sync: your shells recognised', ['cross', 'long', 'philly', 'peek', 'high'].every(k => seen[k] === k), seen, 'templates', Object.keys(pr.guard.styles || {})); }
      body.wr = [guardW(0), guardW(1)]; step(30); let gk = tr().hands.map(h => h.guardKind); ok('guard: both gloves at face → face/face', gk[0] === 'face' && gk[1] === 'face', gk);
      body.wr = [own(0, 0.08, 0.25, 0.14), guardW(1)]; step(30); gk = tr().hands.map(h => h.guardKind); ok('guard: left elbow down → L body, R face', gk[0] === 'body' && gk[1] === 'face', gk, document.getElementById('pmkChip').textContent);
      body.wr = [guardW(0), own(1, 0.08, 0.25, 0.14)]; step(30); gk = tr().hands.map(h => h.guardKind); ok('guard: right elbow down → L face, R body', gk[0] === 'face' && gk[1] === 'body', gk, 'game', P.intent && P.intent.guardLow);
      body.wr = [guardW(0), guardW(1)]; step(30);
      // ---- stance both ways from the feet ----
      body.ank = SOUTH.slice(); step(60); ok('stance: switch to southpaw (feet) → fighter southpaw', P.stance === 'southpaw', P.stance, tr().feet.lead, +(tr().feet.sig || 0).toFixed(3));
      body.ank = ORTH.slice(); step(60); ok('stance: back to orthodox', P.stance === 'orthodox', P.stance, tr().feet.lead);
      // ---- latency: your hand starts moving → the game's glove reacts ----
      const lat = []; for (const hi of [0, 1]) for (let r = 0; r < 3; r++) {
        for (const f of G.f) { f.strike = null; f.state = 'idle'; f.stamina = 100; } body.wr = [guardW(0), guardW(1)]; step(30);
        const g0 = P.toLocal(P.gloveNow[hi].clone()); const tgt = jabT(hi, V(-0.25, 0.05, 1)); const a = body.wr[hi]; let tStrike = null, t5 = null, t80 = null; const T0 = T;
        let full = 0; for (let i = 1; i <= 40; i++) { if (i <= 6) body.wr[hi] = lerp(a, tgt, i / 6); step(1); const d = P.toLocal(P.gloveNow[hi].clone()).distanceTo(g0); full = Math.max(full, d);
          if (tStrike == null && P.strike && P.strike.hi === hi) tStrike = T - T0; if (t5 == null && d > 0.05) t5 = T - T0; }
        // second pass for 80 %: re-run identically, now that we know the full travel
        for (const f of G.f) { f.strike = null; f.state = 'idle'; } body.wr = [guardW(0), guardW(1)]; step(30); const g1 = P.toLocal(P.gloveNow[hi].clone()); const T1 = T;
        for (let i = 1; i <= 40; i++) { if (i <= 6) body.wr[hi] = lerp(a, tgt, i / 6); step(1); if (t80 == null && P.toLocal(P.gloveNow[hi].clone()).distanceTo(g1) > 0.8 * full) t80 = T - T1; }
        lat.push({ hi, strike: tStrike && Math.round(tStrike), move5cm: t5 && Math.round(t5), glove80: t80 && Math.round(t80), handAt80: Math.round(4.8 * 1000 / 60) });
        body.wr[hi] = guardW(hi); step(20);
      }
      const med = k => { const v = lat.map(l => l[k]).filter(x => x != null).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
      ok('latency: glove visibly moves within 70 ms of your hand starting (+ camera/model time)', med('move5cm') <= 70, 'median ms: strike', med('strike'), 'glove 5cm', med('move5cm'), 'glove 80%', med('glove80'), 'your hand hits 80% at', lat[0].handAt80);
      window.__LAT = lat;
      return out;
    }
    // -- calibration
    step(10); ok('calibration: frame step passes', tr().calStep !== 'frame', tr().calStep);
    step(80); ok('calibration: guard captured', tr().calStep === 'jabL', tr().calStep, tr().calMsg);
    const wrTo = (hi, target, frames) => { const a = body.wr[hi]; for (let i = 1; i <= frames; i++) { body.wr[hi] = lerp(a, target, i / frames); step(1); } };
    const jabT = (hi, dir = V(0, 0.08, 1)) => { const s = hi === 0 ? 1 : -1; const S = V(s * body.sw / 2, 0.5, 0); return add(S, mul(nrm(V(dir.x * s, dir.y, dir.z)), 0.53)); };
    wrTo(0, jabT(0, V(-0.25, 0.05, 1)), 7); step(4); wrTo(0, guardW(0), 9); step(16);
    ok('calibration: left jab ' + (MIRROR ? '(mirrored labels → auto swap)' : ''), tr().calStep === 'jabR', tr().calStep, 'swap', tr().swap);
    wrTo(1, jabT(1, V(-0.25, 0.05, 1)), 6); step(4); wrTo(1, guardW(1), 9); step(16);
    ok('calibration: right hand → live', G.pmk.state === 'live', G.pmk.state, 'peak', +tr().cal.peak.toFixed(2), 'vMin', +tr().cal.vMin.toFixed(2), 'zGain', +tr().cal.zGain.toFixed(2));
    window.__T = { body, step, guardW, jabT: (hi, d) => jabT(hi, d), V, lerp, G, P: G.player };
    if (SHOT) return out;
    const reset = () => { body.wr = [guardW(0), guardW(1)]; body.lean = body.squat = body.back = body.yaw = 0; body.vis = [1, 1]; body.gone = false; step(30); for (const f of G.f) { f.strike = null; f.state = 'idle'; f.stamina = 100; f.offBalance = 0; f.stagger = 0; f.queued = null; f.queuedAnalog = null; f.stunT = 0; f.clinch = null; f.powerRecover = 0; f.clinchCD = 0; f.hp = f.maxHp || 100; } P.pos.set(0, 0, -0.5); O.pos.set(0, 0, 0.5); O.intent.move.set(0, 0); step(20); };
    const gw = hi => P.gloveNow[hi].clone(); const lw = hi => P.toLocal(P.gloveNow[hi].clone());
    // -- the glove follows your hand
    const lws = hi => lw(hi).sub(P.toLocal(P.B[hi ? 'RightArm' : 'LeftArm'].getWorldPosition(P.gloveNow[hi].clone())));
    reset(); const g0 = lws(0); body.wr[0] = add(guardW(0), V(0, 0.1, 0)); step(14); const g1 = lws(0);
    ok('glove follows hand (raise 10 cm → glove rises)', g1.y - g0.y > 0.05, +(g1.y - g0.y).toFixed(3));
    body.wr[0] = add(guardW(0), V(0.08, 0, 0)); step(14); const g2 = lws(0); ok('glove follows hand (move to own left → glove +x)', g2.x - g0.x > 0.04, +(g2.x - g0.x).toFixed(3));
    body.wr[0] = guardW(0); step(14);
    const camNeutral = lw(0).sub(P.toLocal(P.restGuard(0)));
    ok('guard flagged from real hands', P.intent.handGuard[0] && P.intent.handGuard[1], P.intent.handGuard);
    // -- jab lands through collision
    reset(); let hp0 = O.hp, land0 = P.stats.landed, thrown0 = P.stats.thrown; let name = null;
    const watch = (frames) => { for (let i = 0; i < frames; i++) { step(1); if (P.strike && (!name || P.strike.t < P.strike.def.impact + 0.05)) name = P.strike.name + (P.strike.body ? '' : '(NOT BODY)'); } };
    name = null; const tgt = jabT(0, V(-0.2, 0.12, 1)); const a = body.wr[0]; for (let i = 1; i <= 6; i++) { body.wr[0] = lerp(a, tgt, i / 6); watch(1); } watch(6); body.wr[0] = guardW(0); watch(20);
    ok('jab → jabL body strike', name === 'jabL', name); ok('jab lands via glove collision', P.stats.landed > land0 || P.stats.blocked > 0 || O.hp < hp0, 'landed', P.stats.landed - land0, 'blocked', P.stats.blocked, 'oppHP', +(hp0 - O.hp).toFixed(1));
    ok('one throw counted', P.stats.thrown - thrown0 === 1, P.stats.thrown - thrown0);
    // -- feint: start then stop short
    reset(); thrown0 = P.stats.thrown; wrTo(1, lerp(guardW(1), jabT(1), 0.22), 3); step(10); wrTo(1, guardW(1), 6); step(20); ok('feint (stops short) throws nothing', P.stats.thrown === thrown0, P.stats.thrown - thrown0);
    // -- hold extended: no re-scoring, exposed; returning to guard is not a second punch
    reset(); thrown0 = P.stats.thrown; land0 = P.stats.landed; O.pos.set(0, 0, 1.6); step(2); wrTo(1, jabT(1), 6); step(40);
    ok('held extended → strike frozen & exposed', P.strike && P.strike.hold && P.strike.t >= P.strike.def.impact - 1e-3, P.strike && P.strike.hold, P.strike && P.strike.name);
    O.pos.set(0, 0, 0.5); step(30); ok('extended stationary glove does not score when opponent walks in', P.stats.landed === land0, P.stats.landed - land0);
    wrTo(1, guardW(1), 8); step(30); ok('returning to guard does not throw again', P.stats.thrown - thrown0 === 1 && !P.strike, P.stats.thrown - thrown0, !!P.strike);
    // -- punch types
    const throwPath = (hi, pts, settle = 24) => { name = null; for (const [q, n] of pts) { const a2 = body.wr[hi]; for (let i = 1; i <= n; i++) { body.wr[hi] = lerp(a2, q, i / n); watch(1); } } watch(4); body.wr[hi] = guardW(hi); watch(settle); return name; };
    reset(); ok('cross (right straight)', throwPath(1, [[jabT(1, V(-0.3, 0.1, 1)), 6]]) === 'crossR', name);
    reset(); { const s0 = V(0.2, 0.52, 0.14); body.wr[0] = s0; step(12); const nm = throwPath(0, [[V(-0.12, 0.6, 0.42), 6]]); ok('lead hook (arc across)', nm === 'hookL', nm); }
    reset(); { const evs = []; const oe = G.pmk.onEvent.bind(G.pmk); G.pmk.onEvent = e => { if (e.type !== 'handFound') evs.push(e.type + ':' + (e.strike || '') + (e.hi ?? '')); oe(e); }; body.wr[1] = V(-0.12, 0.2, 0.18); step(14); const nm = throwPath(1, [[V(-0.04, 0.62, 0.4), 6]]); G.pmk.onEvent = oe; ok('rear uppercut (rises from below)', nm === 'upperR', nm, evs.join(' '), JSON.stringify(G.pmk.tracker.hands[1].cls)); }
    reset(); { const evs = []; const oe = G.pmk.onEvent.bind(G.pmk); G.pmk.onEvent = e => { if (e.type !== 'handFound') evs.push(e.type + ':' + (e.strike || '') + (e.hi ?? '')); oe(e); }; body.wr[0] = V(0.1, 0.2, 0.18); step(14); const nm = throwPath(0, [[V(0.0, 0.18, 0.54), 6]]); G.pmk.onEvent = oe; ok('body jab (low straight)', /body/i.test(nm || ''), nm, evs.join(' '), JSON.stringify(G.pmk.tracker.hands[0].cls)); }
    // -- torso: slip, duck, pull, twist feeds the real kinetic chain
    reset(); body.lean = 1; step(20); ok('slip: lean left → weave +', P.weaveX > 0.4, +P.weaveX.toFixed(2)); body.lean = -1; step(25); ok('slip right → weave −', P.weaveX < -0.4, +P.weaveX.toFixed(2)); body.lean = 0;
    body.squat = 1; step(25); ok('duck: knees bend → duck', P.duckK > 0.4, +P.duckK.toFixed(2)); body.squat = 0; body.back = 1; step(25); ok('pull back → pull', P.pullK > 0.4, +P.pullK.toFixed(2)); body.back = 0; step(10);
    body.yaw = -0.5; step(20); ok('shoulder turn → fighter twist', Math.abs(P.camBody.torso.twist) > 0.3, +P.camBody.torso.twist.toFixed(2)); body.yaw = 0; step(20);
    // -- tracking loss while extended: no phantom hit, no snap; re-acquire needs the hand home first
    reset(); land0 = P.stats.landed; thrown0 = P.stats.thrown; O.pos.set(0, 0, 1.7); wrTo(1, jabT(1), 6); step(20); body.vis[1] = 0.1; let maxJump = 0, prev = gw(1); O.pos.set(0, 0, 0.5);
    const jl = []; for (let i = 0; i < 40; i++) { step(1); const g = gw(1); const j = g.distanceTo(prev); jl.push(+j.toFixed(3) + (P.strike ? 's' + P.strike.t.toFixed(2) : '-')); maxJump = Math.max(maxJump, j); prev = g; }
    ok('arm lost → hand released to controller/rest', P.camBody.own[1] < 0.1, +P.camBody.own[1].toFixed(2)); ok('no phantom hit on loss', P.stats.landed === land0, P.stats.landed - land0); ok('no glove snap (max move per frame < 10 cm — no teleport)', maxJump < 0.1, +maxJump.toFixed(3));
    ok('other arm unaffected', P.camBody.own[0] > 0.9, +P.camBody.own[0].toFixed(2));
    body.vis[1] = 1; step(30); ok('re-acquired arm blends back', P.camBody.own[1] > 0.8, +P.camBody.own[1].toFixed(2)); thrown0 = P.stats.thrown;
    ok('re-acquired extended hand is not a punch', P.stats.thrown === thrown0 && !(P.strike && P.strike.hi === 1 && P.strike.bodyPhase === 'out'));
    wrTo(1, guardW(1), 8); step(15); wrTo(1, jabT(1), 6); step(6); ok('after coming home it can throw again', P.stats.thrown === thrown0 + 1, P.stats.thrown - thrown0); wrTo(1, guardW(1), 8); step(20);
    // -- whole body out of frame: torso fades, controller takes over
    reset(); body.lean = 1; step(20); body.gone = true; step(40); ok('full loss → torso & hands released', P.camBody.torsoOwn < 0.1 && P.camBody.own[0] < 0.1, +P.camBody.torsoOwn.toFixed(2)); body.gone = false; body.lean = 0; step(40); ok('body back → owned again', P.camBody.torsoOwn > 0.8, +P.camBody.torsoOwn.toFixed(2));
    // -- clinch from the body, release one hand, dirty box with the freed hand
    reset(); P.pos.set(0, 0, -0.4); O.pos.set(0, 0, 0.4); step(2); { const reachL = V(0.05, 0.62, 0.5), reachR = V(-0.05, 0.62, 0.5); for (let i = 1; i <= 24; i++) { body.wr[0] = lerp(guardW(0), reachL, i / 24); body.wr[1] = lerp(guardW(1), reachR, i / 24); step(1); } step(20); }
    ok('clinch: slow two-hand reach', P.clinch && P.clinch.role === 'holder', P.clinch && P.clinch.role);
    wrTo(0, guardW(0), 10); step(10); ok('pull left hand back → left hand free, right still holding', P.clinch && P.clinch.holds && !P.clinch.holds[0] && P.clinch.holds[1], P.clinch && P.clinch.holds);
    thrown0 = P.stats.thrown; name = null; { const a3 = body.wr[0], q = V(-0.05, 0.25, 0.42); body.wr[0] = V(0.1, 0.2, 0.15); step(12); for (let i = 1; i <= 5; i++) { body.wr[0] = lerp(V(0.1, 0.2, 0.15), q, i / 5); watch(1); } watch(5); }
    ok('free hand dirty-boxes', P.stats.thrown > thrown0 && P.strike && P.strike.dirty !== undefined ? true : P.stats.thrown > thrown0, name, 'fouls', P.fouls || 0);
    body.wr = [guardW(0), guardW(1)]; step(40);
    // -- direct footwork: your steps move the fighter (velocity), the way YOU moved (in your own body frame, whatever the camera angle),
    //    stop when you stop; fast hip turn = pivot even with feet out of view
    { reset(); body.feetVis = 0; O.pos.set(0, 0, 0.9); P.pos.set(0, 0, -0.5); step(40);
      const cS = Math.cos(SIDE), sS = Math.sin(SIDE); const eDepth = V(-sS, 0, cS), eLat = V(cS, 0, sS); // true body-frame direction of "toward the camera" / "to the picture's left"
      const moved = (fn, e, name) => { const y0 = P.yaw, p0 = P.pos.clone(); fn(); step(24); const d = P.pos.clone().sub(p0).applyAxisAngle(new p0.constructor(0, 1, 0), -y0); const n = Math.hypot(d.x, d.z); const dot = n > 1e-3 ? (d.x * e.x + d.z * e.z) / n : 0;
        ok(name, n > 0.1 && dot > 0.6, 'moved', +n.toFixed(2), 'direction match', +dot.toFixed(2)); return P.pos.clone(); };
      moved(() => { for (let i = 1; i <= 18; i++) { body.dist = 2.5 - 0.3 * i / 18; step(1); } }, eDepth, 'step toward the camera → fighter steps the same way (in your body frame)');
      const pS = P.pos.clone(); step(40); ok('…and stops when you stop', P.pos.distanceTo(pS) < 0.06, +P.pos.distanceTo(pS).toFixed(3));
      moved(() => { for (let i = 1; i <= 18; i++) { body.dist = 2.2 + 0.3 * i / 18; step(1); } }, V(-eDepth.x, 0, -eDepth.z), 'step back → fighter steps back the same way'); step(30);
      moved(() => { for (let i = 1; i <= 18; i++) { body.stepX = 0.3 * i / 18; step(1); } }, eLat, 'step sideways → fighter moves sideways the same way');
      for (let i = 1; i <= 18; i++) { body.stepX = 0.3 - 0.3 * i / 18; step(1); } step(40);
      let saw = null; for (let i = 1; i <= 10; i++) { body.yaw = -0.6 * i / 10; step(1); if (P.pivotStep && !saw) saw = P.pivotStep.dir < 0 ? 'left' : 'right'; } for (let i = 0; i < 12; i++) { step(1); if (P.pivotStep && !saw) saw = P.pivotStep.dir < 0 ? 'left' : 'right'; }
      ok('fast hip turn (feet NOT in view) → pivot step', saw === 'left', saw); body.yaw = 0; step(60); body.feetVis = 1; body.dist = 2.5; step(30); }
    // -- aim: a jab thrown ~25° wide (camera angle / tracking error) still goes down his line with AIM: ASSIST; RAW keeps it 1:1
    { const wide = aim => { reset(); G.settings.aim = aim; O.pos.set(0, 0, 0.45); P.pos.set(0, 0, -0.45); step(30); let best = 9; const tg = jabT(0, V(0.5, 0.06, 1));
        const a = body.wr[0]; for (let i = 1; i <= 6; i++) { body.wr[0] = lerp(a, tg, i / 6); step(1); best = Math.min(best, P.gloveNow[0].distanceTo(O.vol.head.a)); } for (let i = 0; i < 8; i++) { step(1); best = Math.min(best, P.gloveNow[0].distanceTo(O.vol.head.a)); }
        wrTo(0, guardW(0), 9); step(20); return best; };
      const raw = wide(0), assist = wide(0.6); G.settings.aim = 0.6;
      ok('aim assist: a wide jab is pulled onto his head (raw stays 1:1)', assist < raw - 0.04, 'closest glove-to-head: raw', +raw.toFixed(3), 'assist', +assist.toFixed(3)); }
    // -- guard styles read from your hands (no sync: shape rules)
    { reset(); const thrown0 = P.stats.thrown; const seen = {};
      for (const k of ['peek', 'philly', 'long', 'cross', 'high']) { shellTo(k); step(30); seen[k] = [tr().style, P.camStyle]; }
      for (const k of ['peek', 'philly', 'long', 'cross']) ok(`guard style from your hands: ${k}`, seen[k][0] === k && seen[k][1] === k, seen[k]);
      ok('back to a normal guard → high', seen.high[0] === 'high', seen.high); ok('getting into shells throws nothing', P.stats.thrown === thrown0, P.stats.thrown - thrown0);
      body.wr = [guardW(0), guardW(1)]; step(20); }
    // -- feet: stance, scoots, pivot, switch stance (knees + ankles in view)
    reset(); body.ank = [V(0.12, -0.9, 0.17), V(-0.12, -0.9, -0.17)]; step(90);
    ok('feet: orthodox stance read from your feet', tr().feet.lead === 'orthodox' && P.camBody.feet === 1, tr().feet.lead, 'base', !!tr().feet.base.orthodox);
    const fo0 = P.footOffset.slice(); body.ank[1] = V(-0.12, -0.9, -0.33); step(50);
    ok('feet: lengthen stance → rear foot scoots back (A)', P.footOffset[1] < fo0[1] - 0.05, P.footOffset.map(v => +v.toFixed(2)), tr().feet.scoot);
    body.ank[1] = V(-0.12, -0.9, -0.17); step(60); body.ank[1] = V(-0.12, -0.9, -0.03); step(40);
    ok('feet: right foot up → B', tr().feet.scoot[1] === 1 && P.footOffset[1] > -0.02, tr().feet.scoot, P.footOffset.map(v => +v.toFixed(2)));
    body.ank[1] = V(-0.12, -0.9, -0.17); step(60);
    { // pivot: whole body turns clockwise (from above) on the planted left foot
      const Lw0 = add(body.root, body.ank[0]); const yaw0 = P.yaw, p0 = P.pos.clone(); let sawPivot = null;
      for (let i = 1; i <= 24; i++) { body.yaw = -0.55 * i / 24; const c = Math.cos(body.yaw), s = Math.sin(body.yaw); const A = body.ank[0]; body.root = sub(Lw0, V(A.x * c + A.z * s, 0, -A.x * s + A.z * c)); step(1); if (P.pivot) sawPivot = P.pivot; }
      step(6); ok('feet: turn on planted left foot → pivot (X, clockwise)', sawPivot === 'left' && P.pos.distanceTo(p0) > 0.02, sawPivot, +P.pos.distanceTo(p0).toFixed(3));
      for (let i = 1; i <= 30; i++) { body.yaw = -0.55 * (1 - i / 30); step(1); } body.root = V(0, 0, 0); body.yaw = 0; step(30);
      let back = null; for (let i = 0; i < 20; i++) { step(1); if (P.pivot) back = P.pivot; } ok('feet: squaring back up is not a pivot', !back, back);
    }
    { // Y: counter-clockwise on the planted right foot
      const Rw0 = add(body.root, body.ank[1]); const p0 = P.pos.clone(); let saw = null;
      for (let i = 1; i <= 24; i++) { body.yaw = 0.55 * i / 24; const c = Math.cos(body.yaw), s = Math.sin(body.yaw); const A = body.ank[1]; body.root = sub(Rw0, V(A.x * c + A.z * s, 0, -A.x * s + A.z * c)); step(1); if (P.pivot) saw = P.pivot; }
      step(6); ok('feet: turn on planted right foot → pivot (Y, counter-clockwise)', saw === 'right' && P.pos.distanceTo(p0) > 0.02, saw, +P.pos.distanceTo(p0).toFixed(3));
      for (let i = 1; i <= 30; i++) { body.yaw = 0.55 * (1 - i / 30); step(1); } body.root = V(0, 0, 0); body.yaw = 0; step(40);
    }
    body.ank = [V(0.12, -0.9, -0.17), V(-0.12, -0.9, 0.17)]; step(90);
    ok('feet: swap your lead foot → switch stance', P.stance === 'southpaw', P.stance, tr().feet.lead);
    body.feetVis = 0; step(30); ok('feet out of view → feet back to controller', P.camBody.feet === 0 && !P.pivot && !P.scoot[0] && !P.scoot[1]);
    body.feetVis = 1; body.ank = [V(0.12, -0.9, 0.17), V(-0.12, -0.9, -0.17)]; step(90); ok('feet back: orthodox again', P.stance === 'orthodox', P.stance);
    body.ank = [V(0.12, -0.9, 0), V(-0.12, -0.9, 0)];
    // -- lab overlay renders
    G.pmk.cfg.lab = true; G.pmk.ui(); step(6); ok('lab overlay shows tracker state', /reach/.test(document.getElementById('pmkLab').textContent), document.getElementById('pmkLab').textContent.split('\n')[0]); G.pmk.cfg.lab = false; G.pmk.ui();
    // -- hybrid: Nimbus connected + camera. Camera owns the hands it sees; the pad keeps feet; a lost arm goes to the pad
    { const BT = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7 }; const pad = { index: 0, id: 'SteelSeries Nimbus+', connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
      const set = (held, ax) => { pad.buttons.forEach(x => { x.pressed = false; x.value = 0; }); for (const k of held) { pad.buttons[BT[k]].pressed = true; pad.buttons[BT[k]].value = 1; } pad.axes = ax; };
      window.__fakePads = [pad]; reset(); set([], [0, 0, 0, 0]); step(10); thrown0 = P.stats.thrown;
      set(['R1'], [0, 0, 0, 0]); step(3); set(['R1'], [0, 0, 0, -1]); step(4); set([], [0, 0, 0, 0]); step(30);
      ok('hybrid: R1+stick ignored while the camera owns your right hand', P.stats.thrown === thrown0, P.stats.thrown - thrown0);
      const z0 = P.toLocal(O.pos.clone()).z; set([], [0, -1, 0, 0]); step(40); set([], [0, 0, 0, 0]); step(5);
      ok('hybrid: left stick still walks you in', P.toLocal(O.pos.clone()).z < z0 - 0.1, +(z0 - P.toLocal(O.pos.clone()).z).toFixed(2));
      reset(); body.vis[1] = 0.1; step(40); thrown0 = P.stats.thrown; set(['R1'], [0, 0, 0, 0]); step(3); set(['R1'], [0, 0, 0, -1]); step(4); const nm = P.strike && P.strike.name; set([], [0, 0, 0, 0]); step(40);
      ok('hybrid: camera loses your right arm → R1+stick throws it', P.stats.thrown === thrown0 + 1 && nm === 'crossR', nm);
      body.vis[1] = 1; step(30); ok('hybrid: arm seen again → camera owns it again', P.camBody.own[1] > 0.8, +P.camBody.own[1].toFixed(2));
      window.__fakePads = []; step(5); }
    // -- Body Camp: Training Camp switches to body cues and checks them off from your movement
    G.settings.mode = 'training'; G.start(); step(60); const PT = G.player; PT.pos.set(0, 0, -0.5); G.f[1].pos.set(0, 0, 0.5); G.ctrl[1] = null; body.wr = [guardW(0), guardW(1)]; step(30);
    const hint0 = document.getElementById('hint').textContent; const i0 = G.trainIdx;
    { const a4 = body.wr[0], q = jabT(0, V(-0.2, 0.1, 1)); for (let i = 1; i <= 6; i++) { body.wr[0] = lerp(a4, q, i / 6); step(1); } step(4); body.wr[0] = guardW(0); step(30); }
    ok('Body Camp: guard + jab cues checked off by your body', G.training.length >= 14 && G.trainIdx >= 2 && /hook/i.test(document.getElementById('hint').textContent), hint0.slice(0, 40), 'step', G.trainIdx, document.getElementById('hint').textContent.slice(0, 40));
    // -- camera off: controller has everything back
    G.pmk.stop(); const PX = G.player; PX.analogRest = true; step(30); { const d = PX.toLocal(PX.gloveNow[0].clone()).sub(PX.toLocal(PX.restGuard(0))).distanceTo(camNeutral); ok('your neutral guard ≈ the controller rest guard (within 9 cm)', d < 0.09, +d.toFixed(3)); }
    ok('camera off → no camera ownership', !PX.camBody || (PX.camBody.own[0] === 0 && PX.camBody.own[1] === 0), PX.camBody && PX.camBody.own);
    return out;
  }, [MIRROR, SHOT, SIDE, SYNC]);
  if (SHOT) await shots(p);
  let pass = 0, fail = 0; for (const l of log) { if (l[0] === 'PASS') pass++; else fail++; console.log(JSON.stringify(l)); }
  console.log(`${pass} pass / ${fail} fail`); console.log(errs.join('\n')); await b.close();
})();
