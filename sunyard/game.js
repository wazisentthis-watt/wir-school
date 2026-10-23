// PROPOSAL - Sun Yard V0.1 items 1-4 (item 4 momentum: timed pump, landing bump, speed cam): skater + momentum, bowl + halfpipe, wall colliders + wallride/wallie, RAILS[] grinds. Private test build.
import * as THREE from './vendor/three.module.min.js';
import { T as TOUCH, initTouch, applyTouch } from './touch.js';

const MPH = 2.23694, G = 9.81;
const BOWL_R = 8, BOWL_H = 3.5;             // bowl radius / depth (m)
const YARD = 30;
// item 2: sunken halfpipe beside the bowl. Channel runs along x; walls face +/-z. Ends taper into roll-in ramps.
const HP = { xc: 0, zc: -19, W: 7, L: 18, T: 6, H: 3.5 }; // centre, half-width, half-length, end taper length, depth (m)
const PUSH_CAP = 6;                          // m/s (~13 mph) push alone; more needs pumping
const MAX_SPEED = 25;                        // ~56 mph
// item 4 momentum (2026-10-23, PROPOSAL from research/3D_2026-10-23.md). Skate 3 timed pump: hold LT (crouch) dropping into a transition to
// charge, release once you're climbing the other side ("past the bend") to cash it in. Holding forever, releasing early or pumping on flat gives nothing.
export const PUMP = { charge: 1.4, gain: 3.0, minSlope: 0.08, good: [0.2, 1.6], late: 2.6, ok: 0.6, lateQ: 0.3, kick: 3 };
// THPS-style clean-landing bump: small, capped by MAX_SPEED, bigger with a trick, none on a bail or a tiny hop.
export const LAND = { plain: 0.4, trick: 1.0, minAir: 0.35 };
// speed camera: FOV + follow distance grow with speed; pump release kicks the FOV. Phone (touch) gets a smaller cap. ?speedcam=0 or V turns it off.
export const SPEEDCAM = { baseFov: 65, range: 12, phoneRange: 7, kickDecay: 4, baseDist: 7, distRange: 2, on: true };
// item 3a: ONE wall list drives both the instanced ledge mesh and physics. Axis-aligned boxes: centre x,z, size w (x) d (z), height h.
// rideable walls (sun-tinted) accept a wallride; the rest just bounce you. PROPOSAL numbers from research/3D_2026-10-21.md.
export const WALLS = [
  { x: 0, z: YARD + 0.4, w: 60, d: 0.8, h: 0.9 }, { x: 0, z: -YARD - 0.4, w: 60, d: 0.8, h: 0.9 },
  { x: YARD + 0.4, z: 0, w: 0.8, d: 60, h: 0.9 }, { x: -YARD - 0.4, z: 0, w: 0.8, d: 60, h: 0.9 },
  { x: 18, z: 6, w: 4, d: 1.2, h: 0.45 }, { x: -18, z: 6, w: 4, d: 1.2, h: 0.45 },
  { x: 20, z: 22, w: 1.2, d: 5, h: 0.45 }, { x: -20, z: 22, w: 1.2, d: 5, h: 0.45 },
  { x: 27, z: 8, w: 0.6, d: 10, h: 2.4, rideable: true }, { x: -27, z: 8, w: 0.6, d: 10, h: 2.4, rideable: true }];
// item 3b: RAILS[] (2026-10-22). Each rail is a polyline [x,y,z] points; every straight piece is its own segment, so a kink counts as a new rail
// (THPS rule). Closest-point math uses three.js Line3 (MIT, vendored). GRIND numbers are PROPOSAL from research/3D_2026-10-22.md, tune by play.
export const GRIND = { snap: 0.5, snapX: 1.5, link: 1.0, linkY: 1.2, angleTol: 45, recentre: 0.5, comboWindow: 1.0, friction: 0.6, popUp: 4.0, popSide: 2.0 };
export const GRIND_SNAP = GRIND.snap; // landing snap tolerance (m, horizontal distance to the rail)
export const RAILS = [
  { name: 'deck rail', pts: [[-6, 0.5, 14], [6, 0.5, 14]] },                       // the original rail, kept as RAILS[0]
  { name: 'down rail', pts: [[-10, 1.2, 22], [-15, 0.4, 17]] },                     // sloped + diagonal: 1.2 m -> 0.4 m over 7.1 m
  { name: 'kink rail', pts: [[8, 0.5, 18], [13, 0.5, 21], [17.5, 0.5, 21]] },       // one kink = two segments
  { name: 'wall link rail', pts: [[26, 1.3, 12], [26, 0.7, 20]] }];                // runs off the end of the +x rideable wall (wallride -> rail)
export const SEGS = [];
RAILS.forEach((r, ri) => { for (let k = 0; k < r.pts.length - 1; k++) {
  const line = new THREE.Line3(new THREE.Vector3(...r.pts[k]), new THREE.Vector3(...r.pts[k + 1])), dir = line.delta(new THREE.Vector3()), len = dir.length(); dir.divideScalar(len);
  const h = Math.hypot(dir.x, dir.z) || 1; SEGS.push({ id: SEGS.length, rail: ri, k, line, dir, len, hdir: new THREE.Vector2(dir.x / h, dir.z / h) }); } });
const _cp = new THREE.Vector3();
// nearest rail segment to pos within maxXZ (horizontal) and dyMin..dyMax (pos above rail). hv = horizontal velocity for the angle check.
function railNear(pos, maxXZ, dyMin, dyMax, hv, skipRail = -1) {
  let best = null; const cosTol = Math.cos(GRIND.angleTol * Math.PI / 180);
  for (const sg of SEGS) { if (sg.rail === skipRail) continue;
    const t = sg.line.closestPointToPointParameter(pos, false); if (t < 0 || t > 1) continue; sg.line.at(t, _cp);
    const dxz = Math.hypot(pos.x - _cp.x, pos.z - _cp.z), dy = pos.y - _cp.y;
    if (dxz > maxXZ || dy < dyMin || dy > dyMax) continue;
    if (hv) { const hs = hv.length(); if (hs > 0.3 && Math.abs(hv.dot(sg.hdir)) / hs < cosTol) continue; } // more than 45 deg off the rail: no lock
    if (!best || dxz < best.dxz) best = { seg: sg, t, dxz, dy }; }
  return best; }
const SK_R = 0.3;                                            // skater collision radius (m)
const WR = { reach: 0.5, minSpeed: 4, minAng: 15, maxAng: 60, buffer: 0.3, grav: 0.3, decay: 1.5, maxT: 1.2 };
// circle (x,z,r) vs wall boxes the skater is below the top of. Pushes out; returns the hit wall + outward normal.
function hitWall(x, z, y, r = SK_R) {
  for (const w of WALLS) { if (y >= w.h) continue; const hx = w.w / 2, hz = w.d / 2;
    const cx = Math.max(w.x - hx, Math.min(w.x + hx, x)), cz = Math.max(w.z - hz, Math.min(w.z + hz, z)); let dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    let nx, nz, push;
    if (d > 1e-6) { nx = dx / d; nz = dz / d; push = r - d; }
    else { const px = hx - Math.abs(x - w.x), pz = hz - Math.abs(z - w.z); // centre inside the box: leave by the shallow side
      if (px < pz) { nx = Math.sign(x - w.x) || 1; nz = 0; push = px + r; } else { nx = 0; nz = Math.sign(z - w.z) || 1; push = pz + r; } }
    if (Math.abs(nx) >= Math.abs(nz)) { nx = Math.sign(nx); nz = 0; } else { nz = Math.sign(nz); nx = 0; } // face normals only (corners read as the nearer face)
    return { w, n: new THREE.Vector2(nx, nz), push }; }
  return null; }

const smooth = s => s * s * (3 - 2 * s);
function hpEnd(x) { const a = Math.abs(x - HP.xc); return a >= HP.L ? 0 : a > HP.L - HP.T ? smooth((HP.L - a) / HP.T) : 1; }
export function hpHeight(x, z) { const u = Math.abs(z - HP.zc) / HP.W, e = hpEnd(x); if (u >= 1 || e <= 0) return 0; return -HP.H * (1 - u ** 4) * e; }
export function height(x, z) { const r = Math.hypot(x, z); if (r >= BOWL_R) return hpHeight(x, z); const u = r / BOWL_R; return -BOWL_H * (1 - u ** 4); }
export function grad(x, z) { const r = Math.hypot(x, z);
  if (r >= BOWL_R) { if (hpHeight(x, z) >= 0) return [0, 0]; const e = 1e-4; // halfpipe: central difference
    return [(hpHeight(x + e, z) - hpHeight(x - e, z)) / (2 * e), (hpHeight(x, z + e) - hpHeight(x, z - e)) / (2 * e)]; }
  if (r < 1e-6) return [0, 0];
  const d = BOWL_H * 4 * r ** 3 / BOWL_R ** 4; return [d * x / r, d * z / r]; }
const inPit = (x, z) => Math.hypot(x, z) < BOWL_R || hpHeight(x, z) < 0;
// crossing a coping edge this step? returns the wall normal (outward), lip slope and a snap-back
function lipCross(x0, z0, x1, z1) {
  const r0 = Math.hypot(x0, z0), r1 = Math.hypot(x1, z1);
  if (r0 < BOWL_R && r1 >= BOWL_R) { const n = new THREE.Vector2(x1 / r1, z1 / r1);
    return { name: 'coping', n, slope: 4 * BOWL_H / BOWL_R, back: d => { S.pos.x = n.x * (BOWL_R - d); S.pos.z = n.y * (BOWL_R - d); } }; }
  const e = hpEnd(x1);
  if (Math.abs(z0 - HP.zc) < HP.W && Math.abs(z1 - HP.zc) >= HP.W && e > 0.3) { const sg = Math.sign(z1 - HP.zc);
    return { name: `halfpipe ${sg > 0 ? '+z' : '-z'} coping`, n: new THREE.Vector2(0, sg), slope: 4 * HP.H / HP.W * e, back: d => { S.pos.z = HP.zc + sg * (HP.W - d); } }; }
  return null;
}

const S = { pos: new THREE.Vector3(0, 0, 18), vel: new THREE.Vector3(0, 0, 0), heading: Math.PI, state: 'Ground',
  stance: 'Regular', grab: false, trick: '', bailed: 0, balance: 0, grindDir: 1, t: 0, log: [], states: [], xAt: -9, wall: null, grind: null, gs: 0, lastRail: -1, lastGrindExit: -9,
  crouch: false, pumpCharge: 0, pumps: [], lastPump: null, fovKick: 0, airStartT: 0, lastLand: null };
const log = (m) => { S.log.push(`${S.t.toFixed(2)} ${m}`); if (S.log.length > 400) S.log.shift(); };
function setState(s) { if (S.state !== s) { if (s === 'Air') S.airStartT = S.t; if (s !== 'Ground' && s !== 'Vert') { S.crouch = false; S.pumpCharge = 0; } S.states.push(s); log(`state ${S.state}->${s}`); S.state = s; } }
const speed = () => S.state === 'Grind' ? S.gs : S.vel.length();

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', e => keys.add(e.code)); addEventListener('keyup', e => keys.delete(e.code));
const prevBtn = {};
let testInput = null; // set by tests: {lx,ly,rx,ry,rt,lt,lb,rb,a,b,x,y}
function readInput() {
  if (testInput) return { ...{ lx: 0, ly: 0, rx: 0, ry: 0, rt: 0, lt: 0, lb: 0, rb: 0, a: 0, b: 0, x: 0, y: 0 }, ...testInput };
  const i = { lx: 0, ly: 0, rx: 0, ry: 0, rt: 0, lt: 0, lb: 0, rb: 0, a: 0, b: 0, x: 0, y: 0 };
  const gp = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(g => g);
  if (gp) { const dz = v => Math.abs(v) < 0.15 ? 0 : v, B = n => gp.buttons[n] ? gp.buttons[n].value : 0;
    Object.assign(i, { lx: dz(gp.axes[0]), ly: dz(gp.axes[1]), rx: dz(gp.axes[2] || 0), ry: dz(gp.axes[3] || 0),
      a: B(0), b: B(1), x: B(2), y: B(3), lb: B(4), rb: B(5), lt: B(6), rt: B(7) }); }
  const k = c => keys.has(c) ? 1 : 0;
  i.lx += k('KeyD') - k('KeyA'); i.rt = Math.max(i.rt, k('KeyW')); i.lt = Math.max(i.lt, k('KeyS'), k('ShiftLeft'));
  i.rx += k('ArrowRight') - k('ArrowLeft'); i.ry += k('ArrowDown') - k('ArrowUp') - k('Space');
  i.lb = Math.max(i.lb, k('KeyQ')); i.rb = Math.max(i.rb, k('KeyE')); i.a = Math.max(i.a, k('KeyR'));
  i.x = Math.max(i.x, k('KeyF')); i.y = Math.max(i.y, k('KeyC')); i.b = Math.max(i.b, k('KeyB'));
  return applyTouch(i); // touch v0 feeds the same input object
}
const pressed = (i, n) => { const p = !prevBtn[n] && i[n] > 0.5; return p; };

// ---------- physics ----------
function step(dt, inp) {
  S.t += dt;
  const P = {}; for (const n of ['a', 'b', 'x', 'y', 'lb']) P[n] = pressed(inp, n);
  const rsUp = inp.ry < -0.6 && !(prevBtn.ry < -0.6), rsDir = Math.hypot(inp.rx, inp.ry) > 0.6 && !(Math.hypot(prevBtn.rx || 0, prevBtn.ry || 0) > 0.6);
  // buttons that work in any state
  if (P.y) { S.stance = S.stance === 'Regular' ? 'Goofy' : 'Regular'; log(`Y stance -> ${S.stance}`); }
  if (inp.rb > 0.5 && rsDir) log(`RB+RS power shape (${inp.rx.toFixed(1)},${inp.ry.toFixed(1)}): stub - powers not in this step`);
  if (P.a) { if (S.bailed > 0) { S.bailed = 0; log('A quick recovery: back on board'); } else log('A quick recovery: nothing to recover'); }
  if (S.bailed > 0) { S.bailed -= dt; S.vel.multiplyScalar(Math.max(0, 1 - 4 * dt)); if (S.bailed <= 0) log('auto recovery'); return; }

  const fwd = new THREE.Vector2(Math.sin(S.heading), Math.cos(S.heading));
  if (S.state === 'Ground' || S.state === 'Vert') {
    // steer/carve: rotate heading and velocity together (carving keeps speed)
    const turn = -inp.lx * 2.2 * dt; S.heading += turn;
    const v = new THREE.Vector2(S.vel.x, S.vel.z).rotateAround(new THREE.Vector2(), -turn);
    const sp = v.length(); if (sp > 0.3) { const f = v.dot(fwd) >= 0 ? 1 : -1; S.heading = Math.atan2(v.x * f, v.y * f); }
    const [gx, gz] = grad(S.pos.x, S.pos.z), g2 = gx * gx + gz * gz;
    // gravity along slope
    v.x += -G * gx / (1 + g2) * dt; v.y += -G * gz / (1 + g2) * dt;
    const dir = sp > 0.01 ? v.clone().normalize() : fwd.clone();
    // RT push (flat only, capped)
    if (inp.rt > 0.1 && S.state === 'Ground' && sp < PUSH_CAP) v.addScaledVector(fwd, 3.0 * inp.rt * dt);
    // LT: pump on transitions (adds speed while dropping in), brake on flat
    const slope = Math.sqrt(g2), downhill = -(dir.x * gx + dir.y * gz);
    const pit = inPit(S.pos.x, S.pos.z);
    if (inp.lt > 0.1) {
      if (pit) { S.crouch = true; if (downhill > 0.02) S.pumpCharge = Math.min(1, S.pumpCharge + PUMP.charge * Math.min(1, slope * 2) * dt); }
      else { S.crouch = false; S.pumpCharge = 0; const s = v.length(), ns = Math.max(0, s - 6 * inp.lt * dt); v.multiplyScalar(s > 0 ? ns / s : 0); }
    } else if (S.crouch) { // LT released: grade the timing
      S.crouch = false; const ch = S.pumpCharge; S.pumpCharge = 0; let q = 0, grade;
      if (!pit) grade = 'flat';
      else if (ch <= 0.01) grade = 'no charge';
      else if (downhill > 0.02) grade = 'too early';
      else if (slope < PUMP.minSlope) grade = 'too early';
      else if (slope > PUMP.late) { grade = 'LATE'; q = PUMP.lateQ; }
      else if (slope >= PUMP.good[0] && slope <= PUMP.good[1]) { grade = 'PERFECT'; q = 1; }
      else { grade = 'OK'; q = PUMP.ok; }
      const gain = PUMP.gain * ch * q; if (gain > 0 && sp > 0.3) { v.addScaledVector(dir, gain); S.fovKick = PUMP.kick * q; }
      S.pumps.push(grade); if (S.pumps.length > 200) S.pumps.shift(); S.lastPump = { grade, gain: +gain.toFixed(2), t: S.t }; log(`pump ${grade} charge=${ch.toFixed(2)} slope=${slope.toFixed(2)} +${gain.toFixed(2)} m/s`);
    }
    // rolling friction + air drag (coasting decays)
    { const s = v.length(), ns = Math.max(0, s - (0.18 + 0.0025 * s * s) * dt); v.multiplyScalar(s > 0 ? ns / s : 0); }
    if (v.length() > MAX_SPEED) v.setLength(MAX_SPEED);
    const x0 = S.pos.x, z0 = S.pos.z;
    S.pos.x += v.x * dt; S.pos.z += v.y * dt;
    // launch off the coping (bowl or halfpipe walls)
    const lip = lipCross(x0, z0, S.pos.x, S.pos.z);
    if (lip) {
      const n = lip.n, vr = v.dot(n);
      if (vr * lip.slope < 1.5) { v.addScaledVector(n, -2 * vr); lip.back(0.02); log(`stall at ${lip.name}`); }
      else {
      const tan = v.clone().addScaledVector(n, -vr), vy = vr * lip.slope;
      const h = tan.addScaledVector(n, -0.05 * vr);
      lip.back(0.05);
      S.vel.set(h.x, vy, h.y); S.pos.y = 0; S.trick = ''; S.grab = false; setState('Air'); log(`launch off ${lip.name} vy=${vy.toFixed(1)}`); return; }
    }
    // pop (ollie)
    if (rsUp) { S.vel.set(v.x, 4.5, v.y); S.pos.y = height(S.pos.x, S.pos.z) + 0.05; S.trick = ''; S.grab = false; setState('Air'); log('RS pop: ollie'); return; }
    // X interact: snap to nearby rail
    if (P.x) { const h = v.length() > 1 && railNear(S.pos, GRIND.snapX, -1.5, 0.3, v); if (h) { enterGrind(h, new THREE.Vector3(v.x, 0, v.y), 'X interact'); return; } log('X interact: nothing in reach'); }
    if (P.b) { v.set(0, 0); log('B dismount/recall board: stopped'); }
    if (P.lb) log('LB grab: only in air');
    // walls (item 3a): real colliders from WALLS, incl. the yard edge and inner ledges
    for (let k = 0; k < 3; k++) { const hw = hitWall(S.pos.x, S.pos.z, height(S.pos.x, S.pos.z)); if (!hw) break;
      S.pos.x += hw.n.x * hw.push; S.pos.z += hw.n.y * hw.push; const vn = v.dot(hw.n); if (vn < 0) { v.addScaledVector(hw.n, -1.4 * vn); if (vn < -1) log(`bump wall (${hw.w.x},${hw.w.z})`); } }
    S.pos.y = height(S.pos.x, S.pos.z);
    S.vel.set(v.x, v.x * gx + v.y * gz, v.y);
    setState(Math.hypot(...grad(S.pos.x, S.pos.z)) > 0.6 ? 'Vert' : 'Ground');
  } else if (S.state === 'Air') {
    S.vel.y -= G * dt;
    S.vel.x += -inp.lx * 0.5 * dt * Math.cos(S.heading); S.vel.z += inp.lx * 0.5 * dt * Math.sin(S.heading); // tiny air control
    S.heading += -inp.lx * 3 * dt;
    if (rsDir) { const t = Math.abs(inp.rx) > Math.abs(inp.ry) ? (inp.rx < 0 ? 'Kickflip' : 'Heelflip') : (inp.ry > 0 ? 'Shove-it' : 'Varial'); S.trick = t; log(`RS trick: ${t}`); }
    if (inp.lb > 0.5 && !S.grab) { S.grab = true; log('LB grab'); }
    if (inp.lb < 0.5) S.grab = false;
    if (P.b) log('B recall board (air): stub, no effect');
    if (P.x) { S.xAt = S.t; log('X (air): wallride buffered'); }
    S.pos.addScaledVector(S.vel, dt);
    // walls in the air: rideable wall + X (held or pressed within 0.3 s) + speed + 15-60 deg from parallel -> Wallride, else bounce
    { const wantX = (S.t - S.xAt < WR.buffer) || inp.x > 0.5, hw = hitWall(S.pos.x, S.pos.z, S.pos.y, wantX ? WR.reach : SK_R);
      if (hw) { const hv = new THREE.Vector2(S.vel.x, S.vel.z), hs = hv.length(), vn = hv.dot(hw.n);
        const ang = hs > 1e-6 ? Math.asin(Math.min(1, Math.abs(vn) / hs)) * 180 / Math.PI : 0;
        if (vn < 0 && hw.w.rideable && wantX && hs > WR.minSpeed && ang >= WR.minAng && ang <= WR.maxAng && S.pos.y > 0.15 && S.pos.y < hw.w.h - 0.3) {
          const tan = new THREE.Vector2(-hw.n.y, hw.n.x); if (hv.dot(tan) < 0) tan.negate(); const along = Math.max(3, hv.dot(tan));
          S.wall = { w: hw.w, n: hw.n, tan, ang: ang * Math.PI / 180, t: 0 }; S.xAt = -9;
          const f = hw.w; if (hw.n.x) S.pos.x = f.x + hw.n.x * (f.w / 2 + SK_R); else S.pos.z = f.z + hw.n.y * (f.d / 2 + SK_R);
          S.vel.set(tan.x * along, Math.max(0, S.vel.y) * 0.5 + 1.5, tan.y * along); S.heading = Math.atan2(tan.x, tan.y);
          setState('Wallride'); log(`wallride start ang=${ang.toFixed(0)} along=${along.toFixed(1)}`); return; }
        const real = hitWall(S.pos.x, S.pos.z, S.pos.y);
        if (real) { S.pos.x += real.n.x * real.push; S.pos.z += real.n.y * real.push; const rn = S.vel.x * real.n.x + S.vel.z * real.n.y;
          if (rn < 0) { S.vel.x -= 1.4 * rn * real.n.x; S.vel.z -= 1.4 * rn * real.n.y; log(`air bounce off wall ang=${ang.toFixed(0)}${real.w.rideable ? (wantX ? ' (outside wallride window)' : ' (no X)') : ''}`); } } } }
    if (S.vel.y < 0) { const h = railNear(S.pos, GRIND.snap, -0.2, 0.4, new THREE.Vector2(S.vel.x, S.vel.z), S.t < (S.noGrindUntil || 0) ? S.lastRail : -1); if (h) { enterGrind(h, S.vel, 'landed on rail'); return; } }
    const h = height(S.pos.x, S.pos.z);
    if (S.pos.y <= h) {
      S.pos.y = h; const [gx, gz] = grad(S.pos.x, S.pos.z);
      const v = new THREE.Vector2(S.vel.x, S.vel.z);
      // keep horizontal speed; on walls convert part of fall into roll-in
      if (gx || gz) { const n = new THREE.Vector2(gx, gz).normalize(); v.addScaledVector(n, Math.min(0, S.vel.y) * 0.5 * Math.min(1, Math.hypot(gx, gz))); }
      if (S.grab && S.trick) { S.bailed = 1.5; log('bail: landed in grab+flip'); }
      // item 4: clean-landing speed bump (THPS), capped by MAX_SPEED
      const airT = S.t - S.airStartT; let bump = 0;
      if (S.bailed <= 0 && airT >= LAND.minAir && v.length() > 0.5) { const s0 = v.length(), s1 = Math.min(MAX_SPEED, s0 + (S.trick ? LAND.trick : LAND.plain)); bump = s1 - s0; v.multiplyScalar(s1 / s0); }
      S.lastLand = { bump: +bump.toFixed(2), airT: +airT.toFixed(2), trick: S.trick, bailed: S.bailed > 0 };
      log(`land${S.trick ? ' ' + S.trick : ''}${bump > 0 ? ` +${bump.toFixed(2)} m/s` : ''}`);
      S.vel.set(v.x, 0, v.y); setState(Math.hypot(gx, gz) > 0.6 ? 'Vert' : 'Ground');
    }
  } else if (S.state === 'Wallride') {
    const W = S.wall, f = W.w; W.t += dt;
    S.vel.y -= G * WR.grav * dt;
    const along = Math.max(0, Math.hypot(S.vel.x, S.vel.z) - WR.decay * dt); S.vel.x = W.tan.x * along; S.vel.z = W.tan.y * along;
    S.pos.addScaledVector(S.vel, dt);
    if (W.n.x) S.pos.x = f.x + W.n.x * (f.w / 2 + SK_R); else S.pos.z = f.z + W.n.y * (f.d / 2 + SK_R);
    if (S.pos.y > f.h - 0.15) { S.pos.y = f.h - 0.15; S.vel.y = Math.min(0, S.vel.y); }
    const off = (why, vy, push) => { S.vel.set(S.vel.x + W.n.x * push, vy, S.vel.z + W.n.y * push); S.pos.x += W.n.x * 0.05; S.pos.z += W.n.y * 0.05; S.wall = null; S.trick = ''; S.grab = false; setState('Air'); log(`wallride exit: ${why}`); };
    if (rsUp) { const k = 1 - W.t / WR.maxT, up = 3 + 4 * k * Math.sin(W.ang); S.vel.x *= Math.cos(W.ang); S.vel.z *= Math.cos(W.ang);
      off(`wallie vy=${up.toFixed(2)} ang=${(W.ang * 180 / Math.PI).toFixed(0)} t=${W.t.toFixed(2)}`, up, 1.5); S.wallieVy = up; return; }
    if (P.b) return off('B dismount', 0, 1.0);
    // wallride -> rail link: X (held or tapped) with a rail within GRIND.link of the wall line, running the same way (<45 deg)
    if (inp.x > 0.5 || P.x) { const h = railNear(S.pos, GRIND.link, -0.6, GRIND.linkY, new THREE.Vector2(S.vel.x, S.vel.z)); if (h) { S.wall = null; enterGrind(h, S.vel, 'wallride link'); return; } }
    const endT = W.n.x ? Math.abs(S.pos.z - f.z) > f.d / 2 : Math.abs(S.pos.x - f.x) > f.w / 2;
    if (endT) return off('end of wall', Math.max(S.vel.y, 0.5), 0.3);
    if (W.t >= WR.maxT) return off('time up (1.2 s)', Math.min(S.vel.y, 0), 0.8);
    if (S.pos.y <= 0.05) { S.pos.y = 0; S.wall = null; S.vel.set(S.vel.x + W.n.x * 0.5, 0, S.vel.z + W.n.y * 0.5); setState('Ground'); log('wallride exit: touched down'); return; }
  } else if (S.state === 'Grind') {
    const g = S.grind, sg = g.seg;
    S.gs += -G * sg.dir.y * g.dir * dt;                 // gravity along the rail: downhill speeds up, uphill slows
    S.gs -= GRIND.friction * dt;                        // rail friction
    S.balance += (Math.sin(S.t * 1.7) * 0.7 + S.balance * 0.9) * dt + inp.lx * 1.6 * dt;
    const f = new THREE.Vector2(sg.hdir.x * g.dir, sg.hdir.y * g.dir), right = new THREE.Vector2(-f.y, f.x);
    const exit = (why, vy, side = 0) => { S.noGrindUntil = S.t + 0.5; S.lastRail = sg.rail; S.lastGrindExit = S.t;
      S.vel.copy(sg.dir).multiplyScalar(g.dir * S.gs); S.vel.y += vy; S.vel.x += right.x * side; S.vel.z += right.y * side;
      S.pos.y += 0.05; S.grind = null; S.trick = ''; S.grab = false; setState('Air'); log(`grind exit: ${why}`); };
    if (Math.abs(S.balance) > 1) { log('grind: lost balance, bail'); const sd = Math.sign(S.balance) || 1; S.pos.x += right.x * sd; S.pos.z += right.y * sd; S.pos.y = height(S.pos.x, S.pos.z);
      S.vel.set(0, 0, 0); S.grind = null; S.lastRail = sg.rail; S.lastGrindExit = -9; S.bailed = 1.5; setState('Ground'); return; }
    // side pop (Session-style): RS left/right flick exits to that side; RS up = straight pop
    if (rsDir && Math.abs(inp.rx) > Math.abs(inp.ry)) { const sd = Math.sign(inp.rx); return exit(`side pop ${sd > 0 ? 'right' : 'left'}`, GRIND.popUp, sd * GRIND.popSide); }
    if (rsUp) return exit('RS pop off rail', GRIND.popUp);
    if (P.b) return exit('B dismount', 0.5);
    if (S.gs < 0.5) return exit('too slow', 0.3);
    let tn = g.t + g.dir * S.gs * dt / sg.len;
    if (tn > 1 || tn < 0) { // end of this segment: next segment of the same rail (kink = new rail, balance recentres 50%) or the rail ends
      const fw = tn > 1, nx = SEGS.find(q => q.rail === sg.rail && q.k === sg.k + (fw ? 1 : -1));
      if (!nx) { g.t = fw ? 1 : 0; placeOnSeg(); return exit('end of rail', 1.0); }
      const over = (fw ? tn - 1 : -tn) * sg.len, pb = S.balance; S.balance *= GRIND.recentre;
      g.seg = nx; g.dir = fw ? 1 : -1; tn = fw ? over / nx.len : 1 - over / nx.len;
      log(`grind kink -> rail ${nx.rail} seg ${nx.k}: balance ${pb.toFixed(3)} -> ${S.balance.toFixed(3)}`); }
    g.t = tn; placeOnSeg();
  }
}
// enter a grind on segment hit.seg from velocity v (3D). Grind direction follows the rail, whichever way you were going along it.
function enterGrind(hit, v, why) { const sg = hit.seg, along = v.x * sg.dir.x + v.y * sg.dir.y + v.z * sg.dir.z;
  S.grind = { seg: sg, t: Math.min(1, Math.max(0, hit.t)), dir: Math.sign(along) || 1 }; S.grindDir = S.grind.dir; S.gs = Math.max(Math.abs(along), 1.5);
  const combo = S.t - S.lastGrindExit < GRIND.comboWindow, pb = S.balance; S.balance = combo ? pb * GRIND.recentre : 0; // new rail inside a combo: 50% recentre
  placeOnSeg(); setState('Grind'); log(`grind start rail ${sg.rail} seg ${sg.k} (${why})${combo ? ` recentre ${pb.toFixed(3)} -> ${S.balance.toFixed(3)}` : ''}`); }
function placeOnSeg() { const g = S.grind, sg = g.seg; sg.line.at(g.t, S.pos); S.vel.copy(sg.dir).multiplyScalar(g.dir * S.gs); S.heading = Math.atan2(sg.dir.x * g.dir, sg.dir.z * g.dir); }

// ---------- visual-only bookkeeping (v0.2 visual pass; does not touch step()/physics) ----------
const FX = { trail: [], parts: [], prevState: 'Ground', airStart: 0, k: 0, events: [] };
const NP = 260; for (let i = 0; i < NP; i++) FX.parts.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: 0 });
function burst(n, pos, spd, up, c) { let k = 0; for (const q of FX.parts) { if (q.life > 0) continue; if (k++ >= n) break;
  const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.6); q.p.copy(pos); q.p.y += 0.05;
  q.v.set(Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s); q.life = 0.6 + Math.random() * 0.6; q.c = c; } }
function tick(dt) { const inp = readInput(); step(dt, inp); Object.assign(prevBtn, inp);
  // visual effects only, read S after the physics step
  const st = S.state; if (st !== FX.prevState) {
    if (st === 'Air') { FX.airStart = S.t; FX.events.push('pop'); }
    if (FX.prevState === 'Air' && (st === 'Ground' || st === 'Vert')) { burst(S.bailed > 0 ? 40 : 28, S.pos, 2.2, 1.6, 0); burst(14, S.pos, 3.5, 2.4, 1); FX.events.push('land'); }
    if (st === 'Grind') FX.events.push('grind');
    FX.prevState = st; }
  if (S.state === 'Grind' && Math.random() < 0.5) burst(1, S.pos, 1.5, 2, 2);
  if (++FX.k % 3 === 0) { const lt = FX.trail[FX.trail.length - 1]; if (lt && Math.hypot(lt[0] - S.pos.x, lt[1] - S.pos.y, lt[2] - S.pos.z) > 2) FX.trail.length = 0; FX.trail.push([S.pos.x, S.pos.y, S.pos.z, speed()]); if (FX.trail.length > 48) FX.trail.shift(); }
  for (const q of FX.parts) if (q.life > 0) { q.life -= dt; q.v.y -= 6 * dt; q.v.multiplyScalar(1 - 1.5 * dt); q.p.addScaledVector(q.v, dt); if (q.p.y < height(q.p.x, q.p.z)) { q.p.y = height(q.p.x, q.p.z); q.v.y *= -0.3; } }
}

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); // phone: cap pixel ratio
renderer.setSize(innerWidth, innerHeight); document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); const FOG = 0xf2a774; scene.fog = new THREE.Fog(FOG, 38, 125); scene.background = new THREE.Color(FOG);
const cam = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 400);
const SUN_DIR = new THREE.Vector3(-0.55, 0.52, -0.62).normalize();
// sky dome: sunset gradient + sun disc (procedural shader)
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sunDir: { value: SUN_DIR } },
  vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec3 vW; uniform vec3 sunDir;
  void main(){ float h = vW.y; vec3 top = vec3(0.16,0.20,0.46), mid = vec3(0.98,0.52,0.36), hor = vec3(1.0,0.80,0.52), low = vec3(0.95,0.62,0.45);
    vec3 c = h > 0.0 ? mix(mix(hor, mid, smoothstep(0.0,0.18,h)), top, smoothstep(0.15,0.75,h)) : low;
    float d = max(dot(normalize(vW), sunDir), 0.0);
    c += vec3(1.0,0.62,0.30) * pow(d, 8.0) * 0.55 + vec3(1.0,0.85,0.55) * pow(d, 64.0) * 0.8;
    c = mix(c, vec3(1.0,0.97,0.86), smoothstep(0.9985, 0.9992, d));
    // a few soft cloud bands
    float b = sin(vW.x*9.0+vW.z*3.0)*0.5+0.5; c = mix(c, vec3(1.0,0.72,0.62), 0.18*smoothstep(0.55,1.0,b)*smoothstep(0.06,0.14,h)*(1.0-smoothstep(0.14,0.3,h)));
    gl_FragColor = vec4(c,1.0); }` });
const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat); scene.add(sky);
{ const pm = new THREE.PMREMGenerator(renderer), ss = new THREE.Scene(); ss.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), skyMat));
  scene.environment = pm.fromScene(ss, 0.04).texture; pm.dispose(); }
scene.add(new THREE.HemisphereLight(0xffd9b0, 0x8a5a44, 1.0));
const sun = new THREE.DirectionalLight(0xffc98a, 3.0); sun.position.copy(SUN_DIR).multiplyScalar(60); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4;
scene.add(sun);
// procedural textures (canvas, generated here: no third-party assets)
function canvasTex(w, h, draw, rep = 1) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const concrete = (base, joints) => canvasTex(512, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const g = rnd(); x.fillStyle = `rgba(${g > .5 ? '255,255,255' : '60,45,35'},${rnd() * 0.07})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
  for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(rnd() * w, rnd() * h, 0, rnd() * w, rnd() * h, 30 + rnd() * 70); g.addColorStop(0, 'rgba(90,60,40,0.06)'); g.addColorStop(1, 'rgba(90,60,40,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  if (joints) { x.strokeStyle = 'rgba(70,50,40,0.45)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 1); x.lineTo(w, 1); x.moveTo(1, 0); x.lineTo(1, h); x.stroke(); }
  x.strokeStyle = 'rgba(60,40,30,0.18)'; x.lineWidth = 1; for (let i = 0; i < 4; i++) { x.beginPath(); let px = rnd() * w, py = rnd() * h; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd() - .5) * 40; py += (rnd() - .5) * 40; x.lineTo(px, py); } x.stroke(); } });
const deckTex = concrete('#d8c3a5', true); deckTex.repeat.set(1 / 4, 1 / 4);
const deck = new THREE.Group(); scene.add(deck);
const shape = new THREE.Shape(); shape.moveTo(-YARD, -YARD); shape.lineTo(YARD, -YARD); shape.lineTo(YARD, YARD); shape.lineTo(-YARD, YARD);
const hole = new THREE.Path(); hole.absarc(0, 0, BOWL_R, 0, Math.PI * 2, true); shape.holes.push(hole);
const hpHole = new THREE.Path(); // shape y = -world z
hpHole.moveTo(HP.xc - HP.L, -(HP.zc + HP.W)); hpHole.lineTo(HP.xc - HP.L, -(HP.zc - HP.W)); hpHole.lineTo(HP.xc + HP.L, -(HP.zc - HP.W)); hpHole.lineTo(HP.xc + HP.L, -(HP.zc + HP.W)); hpHole.closePath(); shape.holes.push(hpHole);
const deckMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.92 })); deckMesh.rotation.x = -Math.PI / 2; deckMesh.receiveShadow = true; scene.add(deckMesh);
const street = new THREE.Mesh(new THREE.RingGeometry(YARD * 1.43, 260, 4, 1, Math.PI / 4), new THREE.MeshStandardMaterial({ map: concrete('#8a6f62', false), roughness: 1 }));
street.material.map.repeat.set(0.25, 0.25); street.rotation.x = -Math.PI / 2; street.position.y = -0.03; street.receiveShadow = true; scene.add(street);
const poolTex = concrete('#c9cdd2', false); poolTex.repeat.set(6, 1);
const prof = []; for (let i = 0; i <= 40; i++) { const r = BOWL_R * i / 40; prof.push(new THREE.Vector2(r, height(r, 0))); }
const bowlGeo = new THREE.LatheGeometry(prof, 72);
const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({ map: poolTex, roughness: 0.85, side: THREE.DoubleSide })); bowl.receiveShadow = true; scene.add(bowl);
// pool-tile band just under the bowl coping
const tileTex = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#1f8fa8' : '#2aa9c2'; x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); } });
tileTex.repeat.set(24, 1);
{ const tp = []; for (let i = 0; i <= 6; i++) { const r = BOWL_R * (0.93 + 0.07 * i / 6) - 0.01; tp.push(new THREE.Vector2(r, height(r, 0) + 0.012)); }
  const tb = new THREE.Mesh(new THREE.LatheGeometry(tp, 72), new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.35, side: THREE.DoubleSide })); tb.receiveShadow = true; scene.add(tb); }
const hpTex = concrete('#cdbfae', false); hpTex.repeat.set(5, 2);
const hpGeo = new THREE.PlaneGeometry(HP.L * 2, HP.W * 2, 72, 40); hpGeo.rotateX(-Math.PI / 2); hpGeo.translate(HP.xc, 0, HP.zc);
{ const a = hpGeo.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, hpHeight(a.getX(i), a.getZ(i))); hpGeo.computeVertexNormals(); }
const halfpipe = new THREE.Mesh(hpGeo, new THREE.MeshStandardMaterial({ map: hpTex, roughness: 0.88, side: THREE.DoubleSide })); halfpipe.receiveShadow = true; scene.add(halfpipe);
const steelMat = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 0.55, roughness: 0.25, envMapIntensity: 1.5 });
const copeGeo = new THREE.CylinderGeometry(0.07, 0.07, (HP.L - HP.T * 0.6) * 2, 10); copeGeo.rotateZ(Math.PI / 2);
const copes = new THREE.InstancedMesh(copeGeo, steelMat, 2); { const m = new THREE.Matrix4(); [-1, 1].forEach((sg, i) => copes.setMatrixAt(i, m.makeTranslation(HP.xc, 0.03, HP.zc + sg * HP.W))); } copes.castShadow = true; scene.add(copes);
const coping = new THREE.Mesh(new THREE.TorusGeometry(BOWL_R, 0.07, 10, 128), steelMat); coping.rotation.x = Math.PI / 2; coping.position.y = 0.01; scene.add(coping);
// rails: polished round bars on painted square posts, built from RAILS/SEGS (same data as physics). One InstancedMesh each = 2 draw calls for all rails.
const PST = []; SEGS.forEach(sg => { const n = Math.max(1, Math.ceil(sg.len / 3)); for (let i = (sg.k === 0 ? 0 : 1); i <= n; i++) { const t = i / n, q = sg.line.at(t, new THREE.Vector3()); if (i === 0 || i === n) q.addScaledVector(sg.dir, i === 0 ? 0.1 : -0.1); PST.push(q); } });
const railGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 16);
const rails = new THREE.InstancedMesh(railGeo, steelMat, SEGS.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  SEGS.forEach((sg, i) => { q.setFromUnitVectors(up, sg.dir); m.compose(sg.line.getCenter(new THREE.Vector3()), q, new THREE.Vector3(1, sg.len + 0.05, 1)); rails.setMatrixAt(i, m); }); }
rails.castShadow = true; scene.add(rails);
const postGeo = new THREE.BoxGeometry(0.09, 1, 0.09); postGeo.translate(0, 0.5, 0);
const posts = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: 0x2b2f3a, metalness: 0.6, roughness: 0.45 }), PST.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(); PST.forEach((p, i) => { const gy = height(p.x, p.z); m.compose(new THREE.Vector3(p.x, gy, p.z), q, new THREE.Vector3(1, Math.max(0.05, p.y - gy), 1)); posts.setMatrixAt(i, m); }); }
posts.castShadow = true; scene.add(posts);
// geometry merge helper (non-indexed concat) for instanced props
function merge(geos) { const gs = geos.map(g => g.index ? g.toNonIndexed() : g); const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) { const arrs = gs.map(g => g.attributes[k].array), n = arrs.reduce((s, a) => s + a.length, 0), f = new Float32Array(n); let o = 0; for (const a of arrs) { f.set(a, o); o += a.length; } out.setAttribute(k, new THREE.BufferAttribute(f, k === 'uv' ? 2 : 3)); }
  return out; }
// Sun City skyline: instanced low-poly buildings with lit windows
const winTex = canvasTex(128, 256, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); for (let r = 0; r < 12; r++) for (let c = 0; c < 4; c++) { x.fillStyle = rnd() < 0.35 ? '#ffd27a' : '#5d4a5a'; x.fillRect(c * 32 + 7, r * 21 + 6, 18, 12); } });
winTex.colorSpace = THREE.SRGBColorSpace;
const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
const bMat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.8, emissive: 0xffb050, emissiveIntensity: 0.0 });
const bMatLit = bMat; // windows lit by map colour + sunset light
const pal = [0xe9a27a, 0xf1d0a8, 0xd96f5a, 0x8fb8b0, 0xf3e3c3, 0xc9806a, 0xe6b77e, 0x9c7fa6];
const B = []; seed = 11;
for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2 + rnd() * 0.08, r = 48 + rnd() * 26; const x = Math.cos(a) * r, z = Math.sin(a) * r;
  B.push({ x, z, w: 6 + rnd() * 7, d: 6 + rnd() * 7, h: 6 + rnd() * 22 * (rnd() < 0.2 ? 1.8 : 1), ry: -a, c: pal[i % pal.length] }); }
const blds = new THREE.InstancedMesh(bGeo, bMatLit, B.length), roofs = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ color: 0x7c6a66, roughness: 0.9 }), B.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  B.forEach((b, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.ry); m.compose(new THREE.Vector3(b.x, 0, b.z), q, new THREE.Vector3(b.w, b.h, b.d)); blds.setMatrixAt(i, m); blds.setColorAt(i, col.setHex(b.c));
    m.compose(new THREE.Vector3(b.x + 1, b.h, b.z), q, new THREE.Vector3(b.w * 0.35, 1.4, b.d * 0.3)); roofs.setMatrixAt(i, m); }); }
blds.receiveShadow = true; scene.add(blds, roofs);
// palms: tapered trunk + merged frond crown, instanced
const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 1, 7, 6, true); trunkGeo.translate(0, 0.5, 0);
{ const a = trunkGeo.attributes.position; for (let i = 0; i < a.count; i++) a.setX(i, a.getX(i) + Math.sin(a.getY(i) * 1.6) * 0.35 * a.getY(i)); trunkGeo.computeVertexNormals(); }
const fronds = []; for (let k = 0; k < 9; k++) { const g = new THREE.PlaneGeometry(0.9, 3.4, 1, 4); g.translate(0, 1.7, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 3.4; p.setZ(i, -t * t * 1.6); p.setX(i, p.getX(i) * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05))); }
  g.rotateX(-1.15); g.rotateY(k / 9 * Math.PI * 2); fronds.push(g); }
const crownGeo = merge(fronds); crownGeo.computeVertexNormals();
const P = []; seed = 23; for (let i = 0; i < 28; i++) { const t = i / 28 * 4, side = Math.floor(t), f = t - side - 0.5; const R = YARD + 3.5 + rnd() * 3;
  const xy = [[f * 2 * YARD, R], [R, f * 2 * YARD], [-f * 2 * YARD, -R], [-R, -f * 2 * YARD]][side]; P.push({ x: xy[0], z: xy[1], h: 6 + rnd() * 4, ry: rnd() * 6.28 }); }
const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }), P.length);
const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.8, side: THREE.DoubleSide }), P.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  P.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry); m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1, p.h, 1)); trunks.setMatrixAt(i, m);
    const top = new THREE.Vector3(Math.sin(1.6) * 0.35, 1, 0).applyQuaternion(q); m.compose(new THREE.Vector3(p.x + top.x, p.h, p.z + top.z), q, new THREE.Vector3(1.7, 1.7, 1.7)); crowns.setMatrixAt(i, m); }); }
trunks.castShadow = crowns.castShadow = true; scene.add(trunks, crowns);
// low yard walls / ledges (instanced)
const ledges = new THREE.InstancedMesh(bGeo, new THREE.MeshStandardMaterial({ map: concrete('#e2cdb0', false), roughness: 0.9 }), WALLS.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); // built from WALLS (same data as physics)
  WALLS.forEach((w, i) => { m.compose(new THREE.Vector3(w.x, 0, w.z), q, new THREE.Vector3(w.w, w.h, w.d)); ledges.setMatrixAt(i, m); ledges.setColorAt(i, col.setHex(w.rideable ? 0xff9a4a : 0xffffff)); }); }
ledges.castShadow = ledges.receiveShadow = true; scene.add(ledges);

// ---------- skater: procedural low-poly rig + board ----------
const M = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const skin = M(0x6b3f26, 0.6), shirt = M(0xffb21e, 0.75), pants = M(0x2f3b5c, 0.85), shoe = M(0xf2efe8, 0.6), capM = M(0xd8402a, 0.6);
const skater = new THREE.Group(); scene.add(skater); const rig = new THREE.Group(); skater.add(rig);
const limb = (len, r, mat) => { const g = new THREE.CapsuleGeometry(r, len - 2 * r, 3, 8); g.translate(0, -len / 2, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
const boardG = new THREE.Group(); boardG.position.y = 0.1; rig.add(boardG);
{ const dk = new THREE.BoxGeometry(0.24, 0.03, 0.62), t1 = new THREE.BoxGeometry(0.24, 0.03, 0.16), t2 = t1.clone();
  t1.rotateX(-0.35); t1.translate(0, 0.025, 0.38); t2.rotateX(0.35); t2.translate(0, 0.025, -0.38);
  const deckM = new THREE.Mesh(merge([dk, t1, t2]), [M(0x1d1d22, 0.9)][0]); deckM.castShadow = true; boardG.add(deckM);
  const wl = []; for (const z of [-0.26, 0.26]) for (const x of [-0.11, 0.11]) { const w = new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10); w.rotateZ(Math.PI / 2); w.translate(x, -0.055, z); wl.push(w); }
  for (const z of [-0.26, 0.26]) { const t = new THREE.BoxGeometry(0.2, 0.03, 0.04); t.translate(0, -0.03, z); wl.push(t); }
  const wm = new THREE.Mesh(merge(wl), new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.4, metalness: 0.3 })); wm.castShadow = true; boardG.add(wm); }
const hips = new THREE.Group(); rig.add(hips);
const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), pants); pelvis.castShadow = true; hips.add(pelvis);
const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
{ const tg = new THREE.CapsuleGeometry(0.15, 0.32, 3, 10); tg.scale(1, 1, 1.35); tg.translate(0, 0.3, 0); const t = new THREE.Mesh(tg, shirt); t.castShadow = true; torso.add(t); }
const headG = new THREE.Group(); headG.position.y = 0.68; torso.add(headG);
{ const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), skin); h.position.y = 0.06; h.castShadow = true; headG.add(h);
  const cg = merge([new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), (() => { const b = new THREE.CylinderGeometry(0.11, 0.11, 0.015, 12); b.scale(1.1, 1, 0.8); b.translate(0.1, 0, 0); return b; })()]);
  const c = new THREE.Mesh(cg, capM); c.position.y = 0.09; headG.add(c); }
function makeLeg(z) { const thigh = new THREE.Group(); thigh.position.set(0, -0.04, z); hips.add(thigh); thigh.add(limb(0.44, 0.075, pants));
  const knee = new THREE.Group(); knee.position.y = -0.44; thigh.add(knee); knee.add(limb(0.44, 0.065, pants));
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), shoe); foot.position.set(0.0, -0.46, 0); foot.castShadow = true; knee.add(foot); return { thigh, knee, foot }; }
function makeArm(z) { const sh = new THREE.Group(); sh.position.set(0, 0.52, z); torso.add(sh); sh.add(limb(0.3, 0.055, shirt));
  const el = new THREE.Group(); el.position.y = -0.3; sh.add(el); el.add(limb(0.29, 0.045, skin)); return { sh, el }; }
const legF = makeLeg(0.11), legB = makeLeg(-0.11), armF = makeArm(0.2), armB = makeArm(-0.2);
function poseLeg(L, bend, spread, swing = 0) { L.thigh.rotation.set(spread + swing, 0, bend); L.knee.rotation.set(0, 0, -2 * bend); L.foot.rotation.set(0, Math.PI / 2 * 0, bend); }
// SOL Energy glow trail (additive ribbon) + landing/grind particles
const TN = 48, trailGeo = new THREE.BufferGeometry(), tPos = new Float32Array(TN * 2 * 3), tCol = new Float32Array(TN * 2 * 3), tIdx = [];
for (let i = 0; i < TN - 1; i++) { const a = i * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
trailGeo.setIndex(tIdx); trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
trail.frustumCulled = false; scene.add(trail);
const pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const spark = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const parts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.22, map: spark, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
parts.frustumCulled = false; scene.add(parts);
const PC = [[0.9, 0.75, 0.55], [1.0, 0.75, 0.25], [1.0, 0.9, 0.5]];
function updateFX() {
  const n = FX.trail.length;
  for (let i = 0; i < TN; i++) { const s = FX.trail[Math.max(0, n - TN + i)] || [S.pos.x, S.pos.y, S.pos.z, 0], f = i / (TN - 1), k = 0.7 * Math.min(1, s[3] / 10) * Math.sin(Math.PI * Math.min(1, f * 1.15)) ** 0.7 * f;
    const h0 = 0.1, h1 = 0.1 + 0.8 * f; tPos.set([s[0], s[1] + h0, s[2], s[0], s[1] + h1, s[2]], i * 6);
    tCol.set([1.0 * k, 0.55 * k, 0.12 * k, 1.0 * k * 0.9, 0.85 * k * 0.9, 0.35 * k * 0.9], i * 6); }
  trailGeo.attributes.position.needsUpdate = trailGeo.attributes.color.needsUpdate = true; trailGeo.computeBoundingSphere();
  FX.parts.forEach((q, i) => { const a = Math.max(0, Math.min(1, q.life)); pPos.set(q.life > 0 ? [q.p.x, q.p.y, q.p.z] : [0, -99, 0], i * 3); const c = PC[q.c]; pCol.set([c[0] * a, c[1] * a, c[2] * a], i * 3); });
  pGeo.attributes.position.needsUpdate = pGeo.attributes.color.needsUpdate = true;
}
// ---------- audio: generated with WebAudio (no files) ----------
const AU = {}; function initAudio() { if (AU.ctx || TEST) return; try {
  const c = AU.ctx = new AudioContext(), buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = () => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
  const chain = (src, type, f, q, g) => { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gn = c.createGain(); gn.gain.value = g; src.connect(fl).connect(gn).connect(c.destination); return gn; };
  AU.roll = chain(noise(), 'lowpass', 520, 0.8, 0); AU.grind = chain(noise(), 'bandpass', 2600, 9, 0); chain(noise(), 'lowpass', 260, 0.5, 0.035);
  [110, 138.6, 164.8, 220].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.012; const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.008; l.connect(lg).connect(g.gain); l.start(); o.connect(g).connect(c.destination); o.start(); });
  AU.blip = (f0, f1, dur, vol, type = 'sine') => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur); };
} catch (e) { AU.ctx = null; } }
addEventListener('keydown', initAudio); addEventListener('pointerdown', initAudio);
function updateAudio() { if (!AU.ctx) { FX.events.length = 0; return; } const t = AU.ctx.currentTime, sp = speed();
  AU.roll.gain.setTargetAtTime((S.state === 'Ground' || S.state === 'Vert') ? Math.min(0.32, sp / 20) : 0, t, 0.05);
  AU.grind.gain.setTargetAtTime(S.state === 'Grind' ? 0.12 : 0, t, 0.03);
  for (const e of FX.events) { if (e === 'pop') AU.blip(900, 200, 0.07, 0.25, 'triangle'); if (e === 'land') { AU.blip(140, 45, 0.22, 0.5); AU.blip(2400, 600, 0.05, 0.08, 'square'); } if (e === 'grind') AU.blip(3000, 1800, 0.12, 0.1, 'sawtooth'); }
  FX.events.length = 0; }

const hud = document.getElementById('hud'), balBar = document.getElementById('balbar'), balMark = balBar.querySelector('i'); let camOverride = null, camFov = SPEEDCAM.baseFov;
function render(snap) {
  skater.position.copy(S.pos); skater.rotation.set(0, S.heading + (S.stance === 'Goofy' ? 0.35 : 0), 0);
  skater.rotation.z = S.bailed > 0 ? 1.3 : 0;
  if (S.state === 'Wallride' && S.wall) { const n = S.wall.n, tl = S.wall.tan; skater.rotation.z = -0.5 * (n.x * tl.y - n.y * tl.x); } // lean board onto the wall
  // pose by state (visual only)
  const sp = speed(), air = S.state === 'Air', grind = S.state === 'Grind', pushing = !air && !grind && S.bailed <= 0 && sp < PUSH_CAP - 0.2 && sp > 0.3;
  let bend = 0.28, armOut = 0.9, armBend = -0.4, lean = 0, swing = 0, bendB = null;
  if (air) { bend = S.grab ? 1.05 : 0.8; armOut = 1.3; armBend = -0.9; }
  else if (grind) { bend = 0.5; armOut = 1.45; armBend = -0.2; lean = S.balance * 0.5; }
  else if (S.state === 'Vert') { bend = 0.55; armOut = 1.1; }
  else if (S.state === 'Wallride') { bend = 0.6; armOut = 1.4; armBend = -0.3; }
  else if (pushing) { bend = 0.38; swing = Math.sin(S.t * 6) * 0.55 - 0.25; bendB = 0.05; armOut = 0.5; }
  hips.position.y = 0.17 + 0.88 * Math.cos(bend) + 0.02; hips.rotation.set(0, Math.PI / 2 * 0, 0);
  poseLeg(legF, bend, 0.12, 0); poseLeg(legB, bendB ?? bend, -0.12, swing);
  if (bendB !== null) { legB.thigh.position.y = -0.04; }
  torso.rotation.set(lean, 0, air ? -0.35 : -0.15 - bend * 0.25);
  armF.sh.rotation.set(-armOut, 0, S.grab ? -1.6 : 0.2); armF.el.rotation.set(0, 0, armBend);
  armB.sh.rotation.set(armOut, 0, 0.3); armB.el.rotation.set(0, 0, armBend);
  rig.rotation.x = grind && S.grind ? -Math.asin(S.grind.seg.dir.y * S.grind.dir) : 0; // pitch with a sloped rail
  // board flips in air for the chosen trick
  boardG.rotation.set(0, 0, 0); boardG.position.y = 0.1;
  if (air) { const ta = Math.min(1, (S.t - FX.airStart) / 0.45), a = ta * Math.PI * 2;
    if (S.trick === 'Kickflip') boardG.rotation.z = a; else if (S.trick === 'Heelflip') boardG.rotation.z = -a; else if (S.trick === 'Shove-it') boardG.rotation.y = a / 2; else if (S.trick === 'Varial') { boardG.rotation.y = a / 2; boardG.rotation.z = a; }
    boardG.position.y = 0.1 + 0.15 * Math.sin(ta * Math.PI) * (S.trick ? 1 : 0.3); }
  updateFX(); updateAudio();
  // item 4 speed camera: FOV + follow distance from speed, pump kick on top, capped (smaller on phone)
  const sf = SPEEDCAM.on ? Math.min(1, speed() / MAX_SPEED) : 0, rng = TOUCH.on ? SPEEDCAM.phoneRange : SPEEDCAM.range;
  S.fovKick = Math.max(0, S.fovKick - SPEEDCAM.kickDecay * (1 / 60)); const kick = SPEEDCAM.on ? S.fovKick * (rng / SPEEDCAM.range) : 0;
  const fovT = SPEEDCAM.baseFov + Math.min(rng, rng * sf + kick); camFov += (fovT - camFov) * (snap === true ? 1 : 0.1);
  if (Math.abs(cam.fov - camFov) > 0.01) { cam.fov = camFov; cam.updateProjectionMatrix(); }
  const dist = SPEEDCAM.baseDist + SPEEDCAM.distRange * sf;
  const back = new THREE.Vector3(-Math.sin(S.heading) * dist, 3.2, -Math.cos(S.heading) * dist);
  if (camOverride) { cam.position.fromArray(camOverride); cam.lookAt(S.pos.x, S.pos.y + 0.8, S.pos.z); } // test-only side view
  else { cam.position.lerp(S.pos.clone().add(back), snap === true ? 1 : 0.12); cam.lookAt(S.pos.x, S.pos.y + 1, S.pos.z); }
  const mph = speed() * MPH;
  hud.innerHTML = `<div class="ttl"><b>PROPOSAL</b> · S☀️L Sun Yard v0.2 test</div><div class="spd">${mph.toFixed(1)}<small> mph</small></div>
    <div class="row"><span class="st st-${S.state}">${S.state}</span><span>${S.stance}</span></div>${S.bailed > 0 ? '<div class="warn">bailed – A to recover</div>' : ''}${S.crouch ? `<div>PUMP <b>${'▮'.repeat(Math.round(S.pumpCharge * 5)).padEnd(5, '▯')}</b></div>` : ''}${S.lastPump && S.t - S.lastPump.t < 1.2 ? `<div class="pump">Pump <b>${S.lastPump.grade}</b>${S.lastPump.gain ? ` +${(S.lastPump.gain * MPH).toFixed(1)} mph` : ''}</div>` : ''}${S.state === 'Air' ? `<div>Trick: <b>${S.trick || '-'}${S.grab ? ' + Grab' : ''}</b></div>` : ''}${S.state === 'Wallride' && S.wall ? `<div>Wall <b>${(WR.maxT - S.wall.t).toFixed(1)}s</b> · RS up = wallie</div>` : ''}${S.state === 'Grind' && S.grind ? `<div>Rail: <b>${RAILS[S.grind.seg.rail].name}</b>${RAILS[S.grind.seg.rail].pts.length > 2 ? ` · seg ${S.grind.seg.k + 1}` : ''}</div>` : ''}`;
  // big balance bar (DOM, no draw calls): shown only while grinding; marker = S.balance (-1..1), red near the edges
  balBar.classList.toggle('on', S.state === 'Grind'); const bv = Math.max(-1, Math.min(1, S.balance)); balMark.style.left = `${50 + bv * 50}%`; balMark.classList.toggle('hot', Math.abs(bv) > 0.7);
  renderer.render(scene, cam);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });

const TEST = new URLSearchParams(location.search).has('test');
initTouch(new URLSearchParams(location.search).has('touch'));
if (new URLSearchParams(location.search).get('speedcam') === '0') SPEEDCAM.on = false;
addEventListener('keydown', e => { if (e.code === 'KeyV') SPEEDCAM.on = !SPEEDCAM.on; });
let last = performance.now(), acc = 0;
function loop(now) { acc += Math.min(0.1, (now - last) / 1000); last = now; while (acc >= 1 / 120) { tick(1 / 120); acc -= 1 / 120; } render(); requestAnimationFrame(loop); }
if (!TEST) requestAnimationFrame(loop); else render();
// test hooks (deterministic stepping)
// timed-pump helper for tests: hold LT while dropping in / across the bottom, release once climbing a real transition
function pumpBot(extra = {}) { const [gx, gz] = grad(S.pos.x, S.pos.z), sl = Math.hypot(gx, gz), h = Math.hypot(S.vel.x, S.vel.z) || 1, dh = -(S.vel.x * gx + S.vel.z * gz) / h;
  const climbing = dh < -0.02 && sl >= 0.25; return { ...extra, lt: inPit(S.pos.x, S.pos.z) && !climbing ? 1 : 0 }; }
window.__sy = { S, render: () => render(true), PUMP, LAND, SPEEDCAM, MAX_SPEED, cam: () => ({ fov: cam.fov, dist: Math.hypot(cam.position.x - S.pos.x, cam.position.z - S.pos.z) }),
  pumpRun(sec) { const n = Math.round(sec * 120); for (let k = 0; k < n; k++) { testInput = pumpBot(); tick(1 / 120); } return speed() * MPH; }, height, grad, BOWL_R, RAILS, SEGS, GRIND, GRIND_SNAP, HP, MPH, WALLS, WR,
  info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio() }), speed, setInput: i => { testInput = i; }, view: (p) => { camOverride = p || null; },
  touch: TOUCH, touchRun(sec) { testInput = null; const n = Math.round(sec * 120); for (let k = 0; k < n; k++) tick(1 / 120); return speed() * MPH; },
  run(sec, inp) { testInput = inp || {}; const n = Math.round(sec * 120); for (let k = 0; k < n; k++) tick(1 / 120); return speed() * MPH; },
  place(x, z, vx, vz, state = 'Ground') { S.pos.set(x, height(x, z), z); S.vel.set(vx, 0, vz); S.heading = Math.atan2(vx, vz); S.bailed = 0; S.noGrindUntil = 0; S.grind = null; S.lastRail = -1; S.lastGrindExit = -9; S.balance = 0; S.trick = ''; S.grab = false; S.wall = null; S.xAt = -9; S.state = state; S.crouch = false; S.pumpCharge = 0; S.fovKick = 0; S.lastPump = null; S.lastLand = null; S.airStartT = S.t; render(); } };
