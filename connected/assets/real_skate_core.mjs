// REAL SKATE CORE — PROPOSAL / PUBLISH HOLD (opt-in: ?real_skate=1)
// Controller-first skateboard physics for Metal. Pure module: no DOM, no Three.js, no storage, no network.
//
// The idea (RB1 voice brief, 2026-11-05): the controller should teach you how to skate.
//   A (tap)          one push stroke. Tap a rhythm to keep pushing; nothing happens if you hold it.
//   Left stick X     LEAN, not steer. Board lean → trucks turn → carve radius from real truck geometry.
//                    Lean hard at speed and the wheels lose grip → powerslide (nearly a boardslide).
//   Left stick Y     weight. Back = manual / kick-turn pivot, hard back = foot brake, forward = nose manual.
//   L2 + R2 (hold)   bend both knees — loads the ollie (deeper squeeze = more load).
//   Release the BACK-foot trigger fast   = POP (snap the tail).   Front-foot trigger release instead = nollie.
//   Then release the FRONT-foot trigger  = slide the front foot up and level the board.
//                    Right in the window (~0.06–0.16 s after the pop) = perfect ollie, extra height.
//                    Both at once = weak hop. Never = tail-down board, scrape on landing.
//   Flick a foot's stick right after the pop (that foot's trigger already let off) = KICK the board:
//                    front foot (left stick for regular): flick left = kickflip, right = heelflip
//                    back foot  (right stick for regular): scoop down = backside shove-it, up = frontside,
//                    a hard long scoop = 360 shove; scoop + front flick together = varial / tre flip.
//   Squeeze L2 + R2 again = feet back on the board (catch / realign). Catch it grip-up and lined up, or bail.
//   Spin comes from how you pop: lean / stick at the moment of the pop sets the rotation. In the air you
//   only get a little body English — you can't ollie straight and then decide to turn.
//   Rails: ollie onto them, no grind button. Board angle to the rail decides the grind; left stick X
//   balances (super sensitive), left stick Y moves weight between trucks (5-0 / 50-50 / nosegrind).
//
// Stance: Metal rides REGULAR (Coach Phase 5): left foot (prosthetic) front, right foot back.
//   regular → front = L2 + left stick, back = R2 + right stick.  goofy mirrors it.
// Units: metres, seconds, radians. Heading convention matches Connected: forward = (sin h, 0, cos h);
//   turning right lowers h.

export const RS = {
  G: 9.8,
  // pushing (v7 parity curve kept from the Connected skate core: ~5.8 m/s after 1 s of steady strokes)
  CRUISE: 8.5, TOP: 16, PUSH: 4.1, STROKE: 0.62, DRIVE0: 0.18, DRIVE1: 0.52, ROLL: 0.22, DRAG_Q: 0.004, // real: urethane μrr≈0.022·g, aero ½ρCdA/m≈0.004 (v7 arcade used 0.35 + 0.1·v)
  // trucks + lean
  LEAN_MAX: 0.42, LEAN_K: 70, LEAN_C: 13, TRUCK: 0.55, WHEELBASE: 0.42, MU: 0.72, SCRUB: 0.6,
  SLIDE_EVENT: 0.45, PIVOT: 2.6, BRAKE: 5,
  // ollie
  POP_BASE: 3.2, POP_LOAD: 1.9, POP_SPEED: 0.06, LOAD_FULL_T: 0.14, SLIDE_OK0: 0.03, SLIDE_OK1: 0.24,
  PERFECT0: 0.06, PERFECT1: 0.16, PERFECT_DVY: 0.5, WEAK_H: 0.72, NOSLIDE_H: 0.6,
  TRIG_DOWN: 0.55, TRIG_UP: 0.2, LOADED: 0.35, SNAP: 0.1, COM: 0.9, CROUCH: 0.36,
  // spin + air
  SPIN_MAX: 5.2, AIR_CTRL: 0.9, FLICK_T: 0.13, FLICK_MAG: 0.75, FLICK_WINDOW: 0.75, LATE_T: 0.34,
  FLIP_W: (2 * Math.PI) / 0.42, SHOVE_W: Math.PI / 0.36,
  CATCH_TRIG: 0.6, CLEAN: 0.6, SKETCHY: 1.05, ALIGN: 0.7, TRAVEL_OK: 0.96, IMPACT_BAIL: 14.5,
  // manual
  MAN_IN: 0.4, MAN_SET: 0.58, MAN_LOOP: 0.3, MAN_DOWN: -0.26, MAN_DRIFT: 0.55,
  // grind
  GR_UNSTABLE: 2.8, GR_NOISE: 1.6, GR_GAIN: 5.5, GR_LAG: 0.14, GR_FRICTION: 0.45,
};

import { BB, createBoard, impulse, stepBoard, placeFoot, placementError, residual, recognize } from './board_body.mjs';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const nearest = (a, step) => a - Math.round(a / step) * step;

export function createRealSkate({ stance = 'regular', rng = Math.random } = {}) {
  return {
    stance, rng, heading: 0, speed: 0, lean: 0, leanV: 0, slide: 0, sliding: false,
    stroke: -1, strokeQ: 0, pushes: 0, mode: 'ground',
    trig: { L: 0, R: 0 }, rel: { L: null, R: null }, loadT: 0, loadPeak: 0, needReset: false,
    manual: null, air: null, grind: null, hist: [], t: 0, lastPop: null, stats: { pops: 0, perfect: 0, slides: 0 },
  };
}

// Gamepad → input. Standard mapping (SteelSeries Nimbus / Xbox / DualSense in browsers):
// axes 0,1 = left stick, 2,3 = right stick; buttons 0 = A, 6 = L2, 7 = R2, 10 = L3, 11 = R3.
export function padToInput(gp, prev = {}) {
  const ax = (i) => { const v = gp && gp.axes && gp.axes[i] || 0; return Math.abs(v) < 0.08 ? 0 : v; };
  const bv = (i) => { const b = gp && gp.buttons && gp.buttons[i]; return b ? (typeof b.value === 'number' ? b.value : (b.pressed ? 1 : 0)) : 0; };
  const pr = (i) => { const b = gp && gp.buttons && gp.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); };
  const a = pr(0);
  return { lx: ax(0), ly: ax(1), rx: ax(2), ry: ax(3), l2: bv(6), r2: bv(7), a, aEdge: a && !prev.a, grab: pr(2), brake: pr(1), l3: pr(10), r3: pr(11) };
}

function feet(S) { return S.stance === 'goofy' ? { front: 'R', back: 'L' } : { front: 'L', back: 'R' }; }
function stickOf(I, foot) { return foot === 'L' ? { x: I.lx, y: I.ly } : { x: I.rx, y: I.ry }; }

// trigger edge tracking (shared by ground + air): records when each trigger is let off and how fast
function trackTriggers(S, I, dt) {
  const ev = [];
  for (const f of ['L', 'R']) {
    const v = f === 'L' ? I.l2 : I.r2, p = S.trig[f];
    const r = S.rel[f] || (S.rel[f] = { downT: 0, dropStart: null, released: false });
    if (v >= RS.TRIG_DOWN) { r.downT += dt; r.dropStart = null; r.released = false; }
    if (p >= 0.5 && v < 0.5 && r.dropStart == null) r.dropStart = S.t;
    if (!r.released && p > RS.TRIG_UP && v <= RS.TRIG_UP) {
      const dur = r.dropStart == null ? dt : Math.max(dt, S.t - r.dropStart);
      r.released = true; ev.push({ foot: f, dur, held: r.downT }); r.downT = 0;
    }
    if (v < RS.TRIG_UP) r.downT = 0;
    S.trig[f] = v;
  }
  return ev;
}

// air state shared by pops, roll-offs (ledges, kickers, vert lips) and grind exits
export function makeAir(S, kind, { strength = 0, slide = 'good', bodyW = 0, pitch = 0 } = {}) {
  S.air = {
    t: 0, kind, strength, slide, slideDt: null, level: slide === 'both' ? 0.6 : slide === 'pending' ? 0 : 1,
    bodyYaw: 0, bodyW, takeoffHeading: S.heading, takeoffSpeed: S.speed,
    board: Object.assign(createBoard(), { roll: 0, yaw: 0, pitch }), tilt: pitch, freed: false, kicked: { L: false, R: false }, grab: null, grabs: [], late: false, missed: false,
    feetOn: { L: true, R: true }, caught: true, catchT: null, flicks: [], perfect: false,
  };
  S.mode = 'air'; S.manual = null; S.stroke = -1; S.strokeQ = 0; S.grind = null;
  return S.air;
}
// rolled off an edge / launched off a lip without popping. Spin = whatever yaw the board already had.
export function goAirborne(S, kind = 'Air', yawRate = 0) {
  S.loadT = 0; S.loadPeak = 0; S.wasLoading = false;
  return makeAir(S, kind, { bodyW: yawRate * 0.6 });
}

// ---------------------------------------------------------------- ground
// env: { gAlong: gravity accel along the heading (m/s², + speeds up), grounded: true }
// returns { pop } when the rider pops, plus events[]
export function stepGround(S, I, env = {}, dt = 1 / 60) {
  S.t += dt; S.mode = 'ground';
  const out = { events: [] }, F = feet(S);
  const rels = trackTriggers(S, I, dt);
  const front = F.front === 'L' ? I.l2 : I.r2, back = F.back === 'L' ? I.l2 : I.r2;
  if (S.needReset && I.l2 < RS.TRIG_UP + 0.05 && I.r2 < RS.TRIG_UP + 0.05) S.needReset = false;
  const loading = !S.needReset && I.l2 > RS.LOADED && I.r2 > RS.LOADED;
  if (loading) { S.loadT += dt; S.loadPeak = Math.max(S.loadPeak, (I.l2 + I.r2) / 2); S.lastLoaded = S.t; }
  // analog triggers cross the thresholds on different frames: stay armed briefly after the squeeze drops
  const armed = !S.needReset && S.loadT > 0.05 && S.t - (S.lastLoaded ?? -9) < 0.3;

  // POP: the first trigger let off fast while both were loaded
  // a slow release is just standing up (that is how you pump a transition); only a snap pops
  if (armed && rels.length && rels[0].dur > RS.SNAP) { S.loadT = 0; S.loadPeak = 0; S.wasLoading = false; out.events.push({ type: 'standUp' }); }
  else if (armed && rels.length) {
    const r = rels[0], byBack = r.foot === F.back;
    const loadAmt = clamp(S.loadPeak, 0, 1) * clamp(S.loadT / RS.LOAD_FULL_T, 0.35, 1);
    const snap = clamp(0.08 / Math.max(0.02, r.dur), 0.5, 1);
    const strength = clamp(loadAmt * snap, 0, 1);
    const otherHeld = (byBack ? front : back) > RS.TRIG_UP;
    const spinIn = clamp(I.lx * 0.65 + (S.lean / RS.LEAN_MAX) * 0.35, -1, 1);
    const bodyW = -spinIn * RS.SPIN_MAX * (0.55 + 0.45 * strength);
    let vy = RS.POP_BASE + RS.POP_LOAD * strength + RS.POP_SPEED * Math.abs(S.speed);
    let slide = 'pending';
    if (!otherHeld) { slide = 'both'; vy *= RS.WEAK_H; }
    makeAir(S, byBack ? 'Ollie' : 'Nollie', { strength, slide, bodyW, pitch: byBack ? -0.45 : 0.45 });
    S.mode = 'air'; S.loadT = 0; S.loadPeak = 0; S.wasLoading = false; S.manual = null; S.stroke = -1; S.strokeQ = 0;
    S.stats.pops++; S.lastPop = { strength, kind: S.air.kind };
    out.pop = { vy, strength, kind: S.air.kind, bodyW };
    return out;
  }
  S.wasLoading = loading;
  S.crouch = clamp((I.l2 + I.r2) / 2, 0, 1);
  if (!loading && !armed) { S.loadT = 0; S.loadPeak = 0; }

  // pushing: each A tap = one stroke; a tap during a stroke queues the next one
  const canPush = !loading && !S.manual && !S.sliding && !env.noPush; // no pushing up a transition
  if (I.aEdge) { if (S.stroke < 0 && canPush && Math.abs(S.speed) < RS.CRUISE * 0.98) { S.stroke = 0; S.pushes++; } else if (S.stroke >= 0) S.strokeQ = 1; }
  if (S.stroke >= 0) {
    if (!canPush) S.stroke = -1;
    else {
      const a = S.stroke, b = a + dt / RS.STROKE;
      const ov = Math.max(0, Math.min(b, RS.DRIVE1) - Math.max(a, RS.DRIVE0)) / (RS.DRIVE1 - RS.DRIVE0);
      const sg = S.speed < -0.3 ? -1 : 1, sp = Math.abs(S.speed);
      if (ov > 0 && sp < RS.CRUISE) S.speed = sg * Math.min(RS.CRUISE, sp + RS.PUSH * (1 - 0.45 * sp / RS.CRUISE) * ov);
      S.stroke = b;
      if (S.stroke >= 1) { S.stroke = -1; if (S.strokeQ && Math.abs(S.speed) < RS.CRUISE * 0.98) { S.strokeQ = 0; S.stroke = 0; S.pushes++; } }
    }
  }

  // lean (bushing spring-damper): the board follows your lean with real lag
  const leanT = clamp(I.lx, -1, 1) * RS.LEAN_MAX * (S.stroke >= 0 ? 0.5 : 1);
  S.leanV += (RS.LEAN_K * (leanT - S.lean) - RS.LEAN_C * S.leanV) * dt; S.lean += S.leanV * dt;

  // trucks: lean → wheel steer → curvature. Grip limit decides carve vs powerslide.
  const v = S.speed, av = Math.abs(v), delta = RS.TRUCK * S.lean, kappa = Math.tan(delta) / RS.WHEELBASE;
  const aLat = v * v * Math.abs(kappa), grip = RS.MU * RS.G;
  let yawRate = -v * kappa;
  if (aLat > grip && av > 2) {
    const kEff = grip / (v * v) * Math.sign(kappa); yawRate = -v * kEff;
    S.slide = clamp(S.slide + Math.sign(kappa) * (aLat - grip) / Math.max(av, 1) * dt * 2.2, -1.45, 1.45);
    const sc = RS.SCRUB * (aLat - grip) * dt + 1.2 * dt; S.speed = v > 0 ? Math.max(0, v - sc) : Math.min(0, v + sc);
  } else S.slide *= Math.exp(-4 * dt);
  const nowSliding = Math.abs(S.slide) > RS.SLIDE_EVENT;
  if (nowSliding && !S.sliding) { out.events.push({ type: 'powerslide', dir: Math.sign(S.slide) }); S.stats.slides++; }
  S.sliding = nowSliding;

  // weight (left stick Y, down = back): manual, kick-turn pivot at low speed, foot brake when pulled hard
  const w = I.ly;
  if (!loading && Math.abs(S.speed) < 1.3 && Math.abs(w) > 0.45) yawRate += -I.lx * RS.PIVOT;
  if (!S.manual && !loading && !env.noManual && Math.abs(S.speed) > 1.8 && Math.abs(w) > RS.MAN_IN && Math.abs(w) < 0.78) {
    S.manual = { dir: Math.sign(w), d: 0, t: 0 }; out.events.push({ type: 'manualStart', nose: w < 0 });
  }
  if (S.manual) {
    const M = S.manual; M.t += dt;
    M.d += (S.rng() - 0.5) * RS.MAN_DRIFT * Math.sqrt(dt) * (1 + M.t * 0.25);
    const e = Math.abs(w) - RS.MAN_SET + M.d;
    M.e = e;
    if (e > RS.MAN_LOOP) { out.events.push({ type: 'bail', why: M.dir > 0 ? 'Looped out of the manual' : 'Nose dove' }); S.manual = null; }
    else if (e < RS.MAN_DOWN || Math.sign(w) !== M.dir) { out.events.push({ type: 'manualEnd', t: M.t, nose: M.dir < 0 }); S.manual = null; }
  } else if (!loading && (w > 0.78 || I.brake) && Math.abs(S.speed) > 0.5) S.speed -= Math.sign(S.speed) * Math.min(Math.abs(S.speed), RS.BRAKE * dt); // stick hard back or B = foot brake

  // slope, rolling resistance, drag
  S.speed += (env.gAlong || 0) * dt;
  const dec = (RS.ROLL * (env.cosA ?? 1) * (S.manual ? 0.6 : 1) + RS.DRAG_Q * S.speed * S.speed) * dt;
  S.speed = S.speed > 0 ? Math.max(0, S.speed - dec) : Math.min(0, S.speed + dec);
  S.speed = clamp(S.speed, -RS.TOP, RS.TOP);
  S.heading = wrap(S.heading + yawRate * dt);
  out.yawRate = yawRate;
  return out;
}

// ---------------------------------------------------------------- air
function flickDetect(S, I, dt) {
  const now = S.t, F = feet(S);
  S.hist.push({ t: now, L: { x: I.lx, y: I.ly }, R: { x: I.rx, y: I.ry } });
  while (S.hist.length && now - S.hist[0].t > RS.FLICK_T + 0.02) S.hist.shift();
  const res = [];
  for (const foot of ['L', 'R']) {
    const st = stickOf(I, foot), mag = Math.hypot(st.x, st.y);
    if (mag < RS.FLICK_MAG) continue;
    let minMag = 9, minT = now;
    for (const h of S.hist) { const m = Math.hypot(h[foot].x, h[foot].y); if (m < minMag) { minMag = m; minT = h.t; } }
    if (minMag > 0.35) continue;
    const el = Math.max(dt, now - minT), speed = clamp(1.25 - 0.7 * (el - 1 / 60) / (RS.FLICK_T - 1 / 60), 0.55, 1.25); // snappier flick = more torque
    res.push({ foot, role: foot === F.front ? 'front' : 'back', x: st.x / mag, y: st.y / mag, strength: clamp(mag * speed, 0.5, 1.25) });
  }
  return res;
}

export function stepAir(S, I, dt = 1 / 60) {
  S.t += dt; const A = S.air, out = { events: [], dvy: 0 };
  if (!A) return out;
  A.t += dt;
  const F = feet(S), rels = trackTriggers(S, I, dt), B = A.board;
  const front = F.front === 'L' ? I.l2 : I.r2;
  // the slide: other foot's trigger let off after the pop levels the board
  if (A.slide === 'pending') {
    if (front <= RS.TRIG_UP || rels.some(r => r.foot === F.front)) {
      A.slideDt = A.t;
      if (A.t >= RS.SLIDE_OK0 && A.t <= RS.SLIDE_OK1) {
        A.slide = 'good'; A.level = 1;
        if (A.t >= RS.PERFECT0 && A.t <= RS.PERFECT1) { A.perfect = true; out.dvy = RS.PERFECT_DVY * (0.6 + 0.4 * A.strength); S.stats.perfect++; out.events.push({ type: 'perfectPop' }); }
      } else { A.slide = 'late'; A.level = 0.55; }
    } else if (A.t > 0.32) { A.slide = 'none'; A.level = 0.3; out.dvy = -1.2; out.events.push({ type: 'noSlide' }); }
  }
  A.tilt += ((A.slide === 'pending' ? A.tilt : -(1 - A.level) * 0.45) - A.tilt) * Math.min(1, dt * 12);

  // body spin: committed at the pop, small body English in the air (less once the board is loose under you)
  A.bodyW += -I.lx * RS.AIR_CTRL * dt * (A.freed && !A.caught ? 0.3 : 1);
  A.bodyYaw += A.bodyW * dt;

  // kicks: a foot whose trigger is off can flick its stick → torque on the deck (direction, size, timing all count)
  if (A.t < RS.FLICK_WINDOW && !A.grab && !I.grab) { // reaching for a grab is not a flick
    for (const fl of flickDetect(S, I, dt)) {
      const trig = fl.foot === 'L' ? I.l2 : I.r2;
      if (trig > 0.35 || A.kicked[fl.foot]) continue;
      A.kicked[fl.foot] = true; A.freed = true; A.caught = false; B.contacts.L = B.contacts.R = false; B.kickT = A.t;
      const g = S.stance === 'goofy' ? -1 : 1;
      if (fl.role === 'front') {
        impulse(B, 'roll', -Math.sign(fl.x || 1e-6) * g * BB.J_FLICK * fl.strength * Math.max(0.35, Math.abs(fl.x)), A.t);
        if (Math.abs(fl.y) > 0.35) impulse(B, 'pitch', -fl.y * BB.J_FLICK_PITCH * fl.strength, A.t);   // flicking off the nose instead of the side = wobble
      } else if (Math.abs(fl.y) >= Math.abs(fl.x)) {
        impulse(B, 'yaw', Math.sign(fl.y) * BB.J_SCOOP * fl.strength, A.t); // harder scoop = faster spin (360 when the air allows)
      } else {
        impulse(B, 'pitch', Math.sign(fl.x) * BB.J_WRAP * fl.strength, A.t);                          // back foot sideways = wrap (impossible)
      }
      if (A.t > RS.LATE_T) A.late = true;
      A.flicks.push({ ...fl, t: A.t }); out.events.push({ type: 'kick', foot: fl.foot, role: fl.role, late: A.t > RS.LATE_T });
    }
  }

  // feet back on the deck: each trigger squeezed = that foot touches it (and its friction damps the spin)
  if (A.freed) {
    const reach = B.kickT == null || A.t - B.kickT < BB.REACH;
    for (const f of ['L', 'R']) {
      const want = (f === 'L' ? I.l2 : I.r2) >= RS.CATCH_TRIG;
      if (want && !B.contacts[f]) {
        if (!reach) { if (!A.missed) { A.missed = true; out.events.push({ type: 'missed' }); } continue; }
        B.contacts[f] = true; A.feetOn[f] = true;
        if (A.catchT == null) { A.catchT = A.t; A.firstFoot = f; }
        out.events.push({ type: 'footDown', foot: f, residual: residual(B) });
      }
    }
    if (!A.caught && B.contacts.L && B.contacts.R) { A.caught = true; A.realign = true; out.events.push({ type: 'catch', both: true, first: A.firstFoot, residual: residual(B) }); }
  }
  stepBoard(B, dt);

  // feet keep working on the deck once they are on it: the sticks shift each foot around its bolt
  if (!A.freed || A.caught) for (const f of ['L', 'R']) if (B.contacts[f]) { const s = stickOf(I, f); placeFoot(B, f, f === F.front ? 'front' : 'back', A.grab ? 0 : s.x * 0.95, A.grab ? 0 : s.y * 0.95, dt); }

  // grab: X (keyboard C) — reach down and secure the deck. Needs the board under your feet.
  if (I.grab && !A.grab && (!A.freed || A.caught) && A.t > 0.12) {
    const gx = I.lx, gy = I.ly, regular = S.stance !== 'goofy';
    const nm = Math.abs(gy) > Math.abs(gx) && Math.abs(gy) > 0.4 ? (gy < 0 ? 'Nosegrab' : 'Tailgrab') : (gx < -0.4 ? (regular ? 'Melon' : 'Indy') : (regular ? 'Indy' : 'Melon'));
    A.grab = { name: nm, t: 0 }; out.events.push({ type: 'grab', name: nm });
  }
  if (A.grab) {
    if (I.grab) { A.grab.t += dt; B.w.roll *= Math.exp(-12 * dt); B.w.yaw *= Math.exp(-12 * dt); B.w.pitch *= Math.exp(-12 * dt); }
    else if (!A.grab.done) { A.grab.done = true; A.grabs.push({ name: A.grab.name, t: A.grab.t }); out.events.push({ type: 'grabEnd', name: A.grab.name, t: A.grab.t }); }
    if (A.grab.done && I.grab === false) A.grab = A.grab.done ? null : A.grab;
  }

  // realign (plain ollie): after the slide, squeeze both again = feet back over the bolts (needed for a perfect ollie)
  if (!A.freed && !A.realign && A.slide !== 'pending' && A.t > 0.08 && I.l2 >= RS.CATCH_TRIG && I.r2 >= RS.CATCH_TRIG) { A.realign = true; out.events.push({ type: 'realign' }); }
  // compatibility view for renderers / grind entry
  B.roll = B.rot.roll; B.yaw = B.rot.yaw; B.pitch = A.tilt + B.rot.pitch;
  return out;
}

export function nameAir(A, stance = 'regular') {
  const r = recognize(A.board, { kind: A.kind, bodyYaw: A.bodyYaw, late: A.late, goofy: stance === 'goofy' });
  const gr = (A.grabs || []).filter(g => g.t > 0.15);
  if (gr.length) { r.name += ' ' + gr.map(g => g.name).join(' to '); r.pts += gr.reduce((a, g) => a + 60 + 140 * Math.min(1.2, g.t), 0); }
  return r;
}

// landing check. env: { travelHeading, impact (m/s into the surface), speed }
// returns { ok, why, fail, name, pts, quality, heading, speedMul, fakie }
// fail kinds drive what the board and Metal do next: runOut | shotOut | noseDive | washout | slam | missed | upsideDown | sideways
export function land(S, env = {}) {
  const A = S.air; S.mode = 'ground'; S.air = null; S.needReset = true;
  if (!A) return { ok: true, quality: 'clean', name: '', pts: 0, heading: S.heading, speedMul: 1 };
  const B = A.board, F = feet(S), res = residual(B), pe = placementError(B, F);
  const body = wrap(A.takeoffHeading + A.bodyYaw);
  const imp = env.impact || 0, feetDown = (B.contacts.L ? 1 : 0) + (B.contacts.R ? 1 : 0);
  let why = null, fail = null;
  if (imp > RS.IMPACT_BAIL) { why = 'Too big a drop'; fail = 'slam'; }
  else if (A.freed && feetDown === 0) { why = A.missed ? 'Feet missed the board' : 'Never caught the board'; fail = 'missed'; }
  else if (res.roll > RS.SKETCHY || res.pitch > RS.SKETCHY) { why = 'Landed on the grip — board upside down'; fail = 'upsideDown'; }
  else if (res.yaw > RS.SKETCHY) { why = 'Board was sideways under you'; fail = 'sideways'; }
  else if (A.freed && feetDown === 1) {
    if (imp > 5 || res.roll > RS.CLEAN || res.yaw > RS.CLEAN) { why = 'One foot on — ran it out'; fail = 'runOut'; }
  }
  if (!why && pe.along < -0.8) { why = 'Too far back — the board shot out'; fail = 'shotOut'; }
  if (!why && pe.along > 0.85) { why = 'Too far forward — nose dove'; fail = 'noseDive'; }
  if (!why && Math.abs(pe.side) > 0.85) { why = (pe.side > 0 ? 'Toe' : 'Heel') + '-heavy — rolled off the edge'; fail = 'washout'; }
  const trav = env.travelHeading ?? A.takeoffHeading;
  const dF = Math.abs(wrap(body - trav)), dB = Math.abs(wrap(body + Math.PI - trav));
  if (!why && Math.min(dF, dB) > RS.TRAVEL_OK) { why = 'Landed sideways to the roll'; fail = 'washout'; }
  if (!why && A.grab && !A.grab.done && imp > 5) { why = 'Still holding the grab'; fail = 'slam'; }
  const nm = nameAir(A, S.stance);
  if (why) return { ok: false, why, fail, name: nm.name, pts: 0, travel: trav, body, impact: imp };
  const offBolts = Math.max(pe.front, pe.back);
  const sketchy = res.roll > RS.CLEAN * 0.55 || res.yaw > RS.CLEAN * 0.55 || res.pitch > RS.CLEAN * 0.55 || (A.freed && feetDown < 2) || A.slide === 'none' || offBolts > 0.75 || (A.grab && !A.grab.done);
  const quality = !sketchy && A.perfect && A.realign && offBolts < 0.45 && (!A.freed || res.roll < 0.25) ? 'perfect' : sketchy ? 'sketchy' : 'clean';
  const fakie = dB < dF;
  const speedMul = (quality === 'sketchy' ? 0.85 : 1) * (A.slide === 'none' ? 0.8 : 1);
  S.heading = body; // board nose = where the rider faces; fakie = rolling tail-first
  S.speed = (fakie ? -1 : 1) * Math.abs(env.speed ?? S.speed) * speedMul;
  const name = (fakie && nm.body === 0 ? 'Fakie ' : '') + nm.name;
  const base = A.kind === 'Air' && nm.name === 'Air' ? (A.t > 0.45 ? 40 : 0) : nm.pts;
  return { ok: true, quality, name, pts: Math.round(base * (quality === 'perfect' ? 1.5 : quality === 'sketchy' ? 0.6 : 1)), heading: S.heading, speedMul, fakie, airT: A.t, kind: A.kind, oneFoot: A.freed && feetDown === 1 };
}

// ---------------------------------------------------------------- rails
// railYaw: heading of the rail direction (same convention). boardHeading: the board's heading at contact.
export function enterGrind(S, railYaw, boardHeading, kind = 'rail') {
  const d = wrap(boardHeading - railYaw), a = Math.abs(nearest(d, Math.PI));
  let type;
  if (a < 0.44) type = 'truck';
  else if (a < 1.13) type = nearest(d, Math.PI) > 0 ? 'Crooked' : 'Smith';
  else type = kind === 'rail' ? 'Boardslide' : 'Lipslide';
  S.mode = 'grind'; S.air = null; S.needReset = true;
  S.grind = { type, name: type === 'truck' ? '50-50' : type, b: (S.rng() - 0.5) * 0.25, bv: 0, t: 0, dir: Math.abs(wrap(boardHeading - railYaw)) < Math.PI / 2 ? 1 : -1 };
  return S.grind;
}
// returns { fall, pop, name } — the main game moves the rider along the rail
export function stepGrind(S, I, dt = 1 / 60) {
  S.t += dt; const g = S.grind, out = { events: [] };
  if (!g) return out;
  g.t += dt;
  const rels = trackTriggers(S, I, dt);
  if (S.needReset && I.l2 < 0.25 && I.r2 < 0.25) S.needReset = false;
  if (g.type === 'truck') { const nm = I.ly > 0.4 ? '5-0' : I.ly < -0.4 ? 'Nosegrind' : '50-50'; if (nm !== g.name) { g.name = nm; out.events.push({ type: 'grindSwitch', name: nm }); } }
  // your weight follows the thumb with body lag (~0.14 s): over-correct and you overshoot the other way
  g.u = (g.u || 0) + (clamp(I.lx, -1, 1) - (g.u || 0)) * Math.min(1, dt / RS.GR_LAG);
  g.bv += (g.b * RS.GR_UNSTABLE + (S.rng() - 0.5) * RS.GR_NOISE) * dt + g.u * RS.GR_GAIN * dt;
  g.bv *= Math.exp(-0.8 * dt); g.b += g.bv * dt;
  if (Math.abs(g.b) > 1) { out.fall = true; out.events.push({ type: 'bail', why: 'Slipped off the rail' }); S.grind = null; S.mode = 'ground'; return out; }
  // pop off: load both triggers, let the back one off — same ollie motion
  if (!S.needReset && I.l2 > RS.LOADED && I.r2 > RS.LOADED) g.loaded = (g.loaded || 0) + dt;
  if (g.loaded > 0.05 && rels.length) {
    const strength = clamp(g.loaded / RS.LOAD_FULL_T, 0, 1);
    out.pop = { vy: 3.0 + 1.2 * strength, strength, kind: 'Ollie' };
    out.events.push({ type: 'grindEnd', name: g.name, t: g.t, how: 'pop' });
    makeAir(S, 'Ollie', { strength, bodyW: -clamp(I.lx, -1, 1) * RS.SPIN_MAX * 0.5 });
  }
  return out;
}

// convenience for tests: integrate a run of identical inputs
export function simulate(S, inputs, env = {}, dt = 1 / 60) {
  const log = [];
  for (const I of inputs) {
    const r = S.mode === 'air' ? stepAir(S, I, dt) : S.mode === 'grind' ? stepGrind(S, I, dt) : stepGround(S, I, env, dt);
    log.push(r);
  }
  return log;
}
