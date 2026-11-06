// REAL SKATE RIDE — PROPOSAL / PUBLISH HOLD (opt-in: ?real_skate=1)
// Runs real_skate_core on actual surfaces: slopes, transitions, vert lips, ledges, kicker lips, stairs, rails.
// Pure: the world is any object with floorY(x,z), grad(x,z), normal(x,z), nearestRail(p), railPoint(r,t).
// The main game copies ride.p / ride.v into Metal and handles buildings, cars and animation.
import { RS, stepGround, stepAir, stepGrind, land, enterGrind, goAirborne, makeAir, wrap, nameAir } from './real_skate_core.mjs';

export const RIDE = { STEP_UP: 0.2, ROLL_OFF: 0.08, VERT: 1.12, VERT_PULL: 0.3, WALL_BAIL: 4.5, GRIND_MIN: 2.2, BAIL_T: 0.9, LOCK_T: 0.1 };

export function createRide(core, world, { x = 0, z = 0, heading = 0 } = {}) {
  core.heading = heading;
  return { core, world, p: { x, y: world.floorY(x, z), z }, v: { x: 0, y: 0, z: 0 }, n: { x: 0, y: 1, z: 0 }, slope: 0, bailT: 0, rail: null, line: [], linePts: 0, airMax: 0 };
}

const fwd = (h) => ({ x: Math.sin(h), z: Math.cos(h) });

export function bodyHeading(R) {
  const S = R.core, A = S.air;
  if (S.mode === 'air' && A) return wrap(A.takeoffHeading + A.bodyYaw);
  return S.heading;
}

// board pose relative to the rider for rendering: yaw offset, roll (flip), pitch (pop / manual), freed
export function boardPose(R) {
  const S = R.core, A = S.air;
  if (S.mode === 'air' && A) return { yaw: A.freed ? A.board.yaw : 0, roll: A.freed ? A.board.roll : 0, pitch: A.board.pitch, freed: A.freed && !A.caught, lift: A.freed && !A.caught ? 0.18 : 0 };
  if (S.mode === 'grind' && S.grind) { const g = S.grind; return { yaw: 0, roll: g.b * 0.35, pitch: g.name === '5-0' ? -0.18 : g.name === 'Nosegrind' ? 0.18 : 0, freed: false, lift: 0 }; }
  const m = S.manual; return { yaw: S.slide, roll: S.lean, pitch: m ? (m.dir > 0 ? -0.2 : 0.2) : 0, freed: false, lift: 0 };
}

export function stepRide(R, I, dt = 1 / 60) {
  const S = R.core, W = R.world, ev = [];
  if (R.bailT > 0) {
    R.bailT -= dt; S.speed *= Math.exp(-3 * dt); S.mode = 'ground'; S.air = null; S.grind = null; S.stroke = -1;
    const f = fwd(S.heading); R.p.x += f.x * S.speed * dt; R.p.z += f.z * S.speed * dt; R.p.y = W.floorY(R.p.x, R.p.z);
    R.v = { x: f.x * S.speed, y: 0, z: f.z * S.speed }; S.needReset = true;
    return ev;
  }
  if (S.mode === 'grind') stepGrindRide(R, I, dt, ev);
  else if (S.mode === 'air') stepAirRide(R, I, dt, ev);
  else stepGroundRide(R, I, dt, ev);
  return ev;
}

function bail(R, ev, why) {
  ev.push({ type: 'bail', why, line: R.line.slice(), lost: R.linePts });
  R.bailT = RIDE.BAIL_T; R.line = []; R.linePts = 0; R.rail = null;
  R.core.mode = 'ground'; R.core.air = null; R.core.grind = null; R.core.manual = null; R.core.speed *= 0.25;
}

function stepGroundRide(R, I, dt, ev) {
  const S = R.core, W = R.world, p = R.p;
  const [gx, gz] = W.grad(p.x, p.z);
  const f = fwd(S.heading);
  const rise = gx * f.x + gz * f.z, ang = Math.atan(rise);   // slope along the board, + = nose uphill
  R.slope = ang; R.n = W.normal(p.x, p.z);
  const hcOld = RS.COM - RS.CROUCH * (S.crouch || 0);
  const r = stepGround(S, I, { gAlong: -RS.G * Math.sin(ang), cosA: Math.cos(ang), noManual: Math.abs(ang) > 0.25, noPush: Math.abs(ang) > 0.18 }, dt);
  // PUMP (angular momentum about the transition's centre): standing up through a concave curve speeds you up,
  // crouching through it slows you. Squeeze into the bottom, ease off the triggers as you ride up = pump.
  const angT = ang * Math.sign(S.speed || 1), ds = Math.abs(S.speed) * dt;
  if (R.prevAngT != null && ds > 1e-4) R.kap = (R.kap || 0) * 0.7 + 0.3 * (angT - R.prevAngT) / ds;
  R.prevAngT = angT;
  const hcNew = RS.COM - RS.CROUCH * (S.crouch || 0);
  if ((R.kap || 0) > 0.08 && hcNew !== hcOld) { const Rt = 1 / R.kap, a = Math.max(0.5, Rt - hcOld), b = Math.max(0.5, Rt - hcNew); S.speed *= a / b; if (hcNew > hcOld) R.pumpGain = (R.pumpGain || 0) + (a / b - 1); }
  for (const e of r.events) {
    if (e.type === 'manualEnd' && e.t > 0.35) { const pts = Math.round(160 * e.t); R.line.push((e.nose ? 'Nose Manual ' : 'Manual ') + e.t.toFixed(1) + 's'); R.linePts += pts; }
    if (e.type === 'bail') { bail(R, ev, e.why); return; }
    ev.push(e);
  }
  const ff = fwd(S.heading), hs = S.speed * Math.cos(ang);
  if (r.pop) {
    // pop is a push off the surface normal; the roll keeps its 3-D direction
    const n = R.n, vs = S.speed;
    R.v = { x: ff.x * vs * Math.cos(ang) + n.x * r.pop.vy, y: vs * Math.sin(ang) + n.y * r.pop.vy, z: ff.z * vs * Math.cos(ang) + n.z * r.pop.vy };
    R.airMax = p.y; ev.push({ type: 'pop', ...r.pop });
    return;
  }
  const nx = p.x + ff.x * hs * dt, nz = p.z + ff.z * hs * dt, nf = W.floorY(nx, nz);
  const predicted = p.y + S.speed * Math.sin(ang) * dt;
  if (nf > Math.max(p.y, predicted) + RIDE.STEP_UP) {
    // a vertical face: ledge side, box, back of a ramp
    if (Math.abs(S.speed) > RIDE.WALL_BAIL) { bail(R, ev, 'Slammed into the ledge — ollie onto it'); return; }
    S.speed = -S.speed * 0.2; R.v = { x: 0, y: 0, z: 0 }; ev.push({ type: 'bump' }); return;
  }
  // vert: on a steep transition, reaching the lip (deck ahead) throws you straight up.
  // Lean in over the coping (left stick forward) to carry onto the deck / lock a coping grind; otherwise you come back in.
  const [ngx, ngz] = W.grad(nx, nz), nAng = Math.atan(ngx * ff.x + ngz * ff.z);
  const goingUp = ang > RIDE.VERT && S.speed > 0.5 || ang < -RIDE.VERT && S.speed < -0.5;
  if (goingUp) R.steep = { t: S.t, ang: Math.abs(ang), gx, gz };
  else if (R.steep && S.t - R.steep.t > 0.15) R.steep = null;
  if (R.steep && Math.abs(nAng) < 0.45 && Math.abs(S.speed) > 0.3) {
    const st = R.steep; R.steep = null;
    const sp = Math.abs(S.speed), up = sp * Math.sin(st.ang), gl = Math.hypot(st.gx, st.gz) || 1;
    const uhx = st.gx / gl, uhz = st.gz / gl;                 // horizontal uphill direction of the wall
    const mv = Math.sign(S.speed) || 1, vhx = ff.x * mv * sp, vhz = ff.z * mv * sp, along = vhx * uhx + vhz * uhz;
    const lat = { x: (vhx - along * uhx) * Math.cos(st.ang), z: (vhz - along * uhz) * Math.cos(st.ang) };
    const pull = I.ly < -0.35 ? 0.9 : -RIDE.VERT_PULL;
    R.v = { x: lat.x + uhx * pull, y: up, z: lat.z + uhz * pull };
    R.prevAngT = null; R.kap = 0;
    goAirborne(S, 'Air', 0); S.air.vert = true; ev.push({ type: 'vert', over: pull > 0, vy: up }); R.airMax = p.y; return;
  }
  if (nf < predicted - RIDE.ROLL_OFF) {
    // rolled off an edge (kicker lip, ledge end, stairs, funbox top): keep the 3-D velocity
    R.v = { x: ff.x * hs, y: S.speed * Math.sin(ang), z: ff.z * hs };
    p.x = nx; p.z = nz; p.y = predicted;
    goAirborne(S, 'Air', r.yawRate || 0); ev.push({ type: 'rollOff' }); R.airMax = p.y; return;
  }
  const vy = (nf - p.y) / dt;
  p.x = nx; p.z = nz; p.y = nf;
  R.v = { x: ff.x * hs, y: vy, z: ff.z * hs };
}

function stepAirRide(R, I, dt, ev) {
  const S = R.core, W = R.world, p = R.p, v = R.v, A = S.air;
  const r = stepAir(S, I, dt);
  v.y += r.dvy; for (const e of r.events) ev.push(e);
  v.y -= RS.G * dt;
  const ox = p.x, oz = p.z;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt; R.airMax = Math.max(R.airMax, p.y);
  // rails: ollie onto them, board must be under your feet
  if (A && A.t > RIDE.LOCK_T && (!A.freed || A.caught) && v.y < 1.2) {
    const hit = W.nearestRail(p);
    // coping only locks when you have carried over it (deck under you), not on the way back into the ramp
    if (hit && (hit.r.kind !== 'coping' || W.floorY(p.x, p.z) >= hit.r.a.y - 0.05)) {
      const rr = hit.r, dx = rr.b.x - rr.a.x, dy = rr.b.y - rr.a.y, dz = rr.b.z - rr.a.z, L = rr.len;
      const boardH = wrap(bodyHeading(R) + (A.freed ? A.board.yaw : 0));
      const g = enterGrind(S, rr.yaw, boardH, rr.kind === 'rail' ? 'rail' : 'ledge');
      if (rr.kind === 'coping') g.name = 'Coping ' + g.name;
      let sp = (v.x * dx + v.y * dy + v.z * dz) / L;
      if (Math.abs(sp) < RIDE.GRIND_MIN) sp = RIDE.GRIND_MIN * (sp !== 0 ? Math.sign(sp) : 1);
      R.rail = { r: rr, t: hit.t, sp, slide: g.type !== 'truck' };
      Object.assign(p, hit.q); R.v = { x: dx / L * sp, y: dy / L * sp, z: dz / L * sp };
      ev.push({ type: 'grindStart', name: g.name, rail: rr.name, kind: rr.kind });
      return;
    }
  }
  const nf = W.floorY(p.x, p.z);
  if (nf > p.y + 0.35 && W.floorY(ox, oz) <= p.y + 0.35) {
    // flew into the side of something: stop horizontally, keep falling
    p.x = ox; p.z = oz; v.x *= -0.15; v.z *= -0.15; ev.push({ type: 'bump' });
    return;
  }
  if (p.y <= nf) {
    const n = W.normal(p.x, p.z), vn = v.x * n.x + v.y * n.y + v.z * n.z;
    const vt = { x: v.x - vn * n.x, y: v.y - vn * n.y, z: v.z - vn * n.z };
    const th = Math.hypot(vt.x, vt.z) > 0.5 ? Math.atan2(vt.x, vt.z) : (A ? A.takeoffHeading : S.heading);
    const speed = Math.hypot(vt.x, vt.y, vt.z);
    const res = land(S, { travelHeading: th, impact: -vn, speed });
    p.y = nf; R.n = n;
    if (!res.ok) { bail(R, ev, res.why); return; }
    const ff = fwd(S.heading), [gx, gz] = W.grad(p.x, p.z), ang = Math.atan(gx * ff.x + gz * ff.z);
    R.v = { x: ff.x * S.speed * Math.cos(ang), y: S.speed * Math.sin(ang), z: ff.z * S.speed * Math.cos(ang) };
    if (res.pts > 0) { R.line.push(res.name); R.linePts += res.pts; }
    ev.push({ type: 'land', ...res, impact: -vn, height: R.airMax - nf });
  }
}

function stepGrindRide(R, I, dt, ev) {
  const S = R.core, W = R.world, G = R.rail;
  const r = stepGrind(S, I, dt);
  for (const e of r.events) if (e.type !== 'bail' && e.type !== 'grindEnd') ev.push(e);
  const rr = G.r, L = rr.len, dx = (rr.b.x - rr.a.x) / L, dy = (rr.b.y - rr.a.y) / L, dz = (rr.b.z - rr.a.z) / L;
  if (r.fall) { const g = r.events.find(e => e.type === 'bail'); bail(R, ev, g ? g.why : 'Slipped off'); return; }
  const finish = (how) => {
    const t = S.grind ? S.grind.t : 0, name = (S.grind && S.grind.name) || G.name || 'Grind';
    const pts = Math.round((G.slide ? 140 : 100) + 220 * (S.grind ? S.grind.t : t));
    R.line.push(name); R.linePts += pts; ev.push({ type: 'grindEnd', name, how, pts });
  };
  if (r.pop) {
    const name = r.events.find(e => e.type === 'grindEnd');
    R.line.push(name ? name.name : 'Grind'); R.linePts += Math.round((G.slide ? 140 : 100) + 220 * (name ? name.t : 0));
    ev.push({ type: 'grindEnd', name: name && name.name, how: 'pop', pts: 0 });
    R.v = { x: dx * G.sp, y: dy * G.sp + r.pop.vy, z: dz * G.sp }; R.rail = null; R.airMax = R.p.y;
    S.air.takeoffHeading = S.heading = Math.atan2(dx * Math.sign(G.sp), dz * Math.sign(G.sp));
    ev.push({ type: 'pop', ...r.pop });
    return;
  }
  // gravity along the rail + friction (slides scrub more than truck grinds)
  G.sp += -RS.G * dy * dt;
  const fr = RS.GR_FRICTION * (G.slide ? 2.2 : 1) * dt; G.sp = Math.abs(G.sp) <= fr ? 0 : G.sp - Math.sign(G.sp) * fr;
  G.t += G.sp * dt / L;
  if (G.t <= 0 || G.t >= 1 || Math.abs(G.sp) < 0.4) {
    if (S.grind) S.grind.t = S.grind.t; finish('end');
    G.t = Math.max(0, Math.min(1, G.t));
    Object.assign(R.p, W.railPoint(rr, G.t));
    R.v = { x: dx * G.sp, y: dy * G.sp, z: dz * G.sp };
    const h = Math.abs(G.sp) > 0.1 ? Math.atan2(dx * Math.sign(G.sp), dz * Math.sign(G.sp)) : S.heading;
    S.heading = h; S.speed = Math.abs(G.sp); S.grind = null; R.rail = null;
    goAirborne(S, 'Air', 0); S.air.slide = 'good'; R.airMax = R.p.y;
    if (Math.abs(R.v.x) + Math.abs(R.v.z) < 0.5) { R.v.x += Math.sin(h) * 0.8; R.v.z += Math.cos(h) * 0.8; }
    return;
  }
  Object.assign(R.p, W.railPoint(rr, G.t));
  R.v = { x: dx * G.sp, y: dy * G.sp, z: dz * G.sp };
  S.heading = Math.atan2(dx * Math.sign(G.sp || 1), dz * Math.sign(G.sp || 1));
}

// line bookkeeping for the HUD: call after a clean landing back on flat ground with no trick for a while
export function bankLine(R) { const out = { names: R.line.slice(), pts: R.linePts }; R.line = []; R.linePts = 0; return out; }
export { nameAir, makeAir };
