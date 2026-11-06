// BOARD BODY — PROPOSAL / PUBLISH HOLD (Skate Phase 1, RB1 2026-11-06)
// The deck is its own object: mass, inertia per axis, angular velocity, torque impulses from the feet,
// damping from the air and from feet touching it. Flip speed, under/over-rotation and early/late catches emerge
// from these numbers; nothing plays a canned flip.
// Axes (board frame): roll = around the long axis (kickflip/heelflip), yaw = around the vertical (shove-its),
// pitch = around the width axis (impossible / wraps, pop tilt).
// Rotation is integrated per axis (small coupling ignored) so tricks can be named from what actually turned.

export const BB = {
  MASS: 2.2,                                   // kg, 8.25" deck + trucks + wheels
  L: 0.81, W: 0.21, T: 0.012,
  I: { roll: 0.0105, pitch: 0.125, yaw: 0.132 }, // kg·m², deck slab + truck/wheel mass at the ends
  AIR_DAMP: 0.25,                               // 1/s
  FOOT_DAMP: 14,                               // 1/s per foot in contact (grip tape + shoe friction)
  J_FLICK: 0.16, J_FLICK_PITCH: 0.35,           // N·m·s per unit flick strength
  J_SCOOP: 1.12, J_WRAP: 1.75,
  REACH: 0.9,                                  // s after a kick the feet can still get back to the deck
  BOLT_FRONT: 0.19, BOLT_BACK: -0.19, TOE: 0.085,
};

export function createBoard() {
  return { rot: { roll: 0, pitch: 0, yaw: 0 }, w: { roll: 0, pitch: 0, yaw: 0 }, contacts: { L: true, R: true },
    place: { L: { x: 0, z: BB.BOLT_FRONT }, R: { x: 0, z: BB.BOLT_BACK } }, kickT: null, impulses: [] };
}

export function impulse(b, axis, J, t = 0) {
  b.w[axis] += J / BB.I[axis];
  b.impulses.push({ axis, J, t });
}

export function stepBoard(b, dt) {
  const n = (b.contacts.L ? 1 : 0) + (b.contacts.R ? 1 : 0);
  const k = Math.exp(-(BB.AIR_DAMP + BB.FOOT_DAMP * n) * dt);
  for (const a of ['roll', 'pitch', 'yaw']) { b.w[a] *= k; b.rot[a] += b.w[a] * dt; }
}

export const spinning = (b) => Math.abs(b.w.roll) > 1 || Math.abs(b.w.yaw) > 1 || Math.abs(b.w.pitch) > 1;

// foot placement on the deck (board coords, metres). stick (-1..1) moves the foot around its bolt.
export function placeFoot(b, foot, role, sx, sy, dt) {
  const home = role === 'front' ? BB.BOLT_FRONT : BB.BOLT_BACK;
  const p = b.place[foot], k = Math.min(1, dt * 10);
  p.x += (sx * BB.TOE - p.x) * k; p.z += (home - sy * 0.19 - p.z) * k;
}
// 0 = both feet on the bolts, 1 = at the deck edge / way off
export function placementError(b, F) {
  const e = (foot, home) => Math.max(Math.abs(b.place[foot].x) / BB.TOE, Math.abs(b.place[foot].z - home) / 0.19);
  return { front: e(F.front, BB.BOLT_FRONT), back: e(F.back, BB.BOLT_BACK),
    along: ((b.place[F.front].z - BB.BOLT_FRONT) + (b.place[F.back].z - BB.BOLT_BACK)) / 0.38,   // + nose-heavy, − tail-heavy
    side: (b.place.L.x + b.place.R.x) / (2 * BB.TOE) };                                         // + toe-heavy (regular), − heel
}

const TAU = Math.PI * 2;
const near = (a, s) => a - Math.round(a / s) * s;
export function residual(b) {
  return { roll: Math.abs(near(b.rot.roll, TAU)), yaw: Math.abs(near(b.rot.yaw, Math.PI)), pitch: Math.abs(near(b.rot.pitch, TAU)) };
}

// name a trick from what the board actually did + which feet did it
export function recognize(b, { kind = 'Ollie', bodyYaw = 0, late = false, goofy = false } = {}) {
  const rollT = Math.round(b.rot.roll / TAU), yawH = Math.round(b.rot.yaw / Math.PI), pitchT = Math.round(b.rot.pitch / TAU);
  const body = Math.round(Math.abs(bodyYaw) / Math.PI);
  const kick = rollT > 0 !== goofy, n = Math.abs(rollT), bs = yawH > 0, y = Math.abs(yawH);
  const mult = n === 2 ? 'Double ' : n === 3 ? 'Triple ' : n > 3 ? n + 'x ' : '';
  let core = null, pts = 0;
  if (pitchT && !rollT) { core = 'Impossible'; pts = 320; }
  else if (n && y === 0) { core = mult + (kick ? 'Kickflip' : 'Heelflip'); pts = 150 * n; }
  else if (n && y === 1) {
    if (kick) core = bs ? 'Varial Kickflip' : 'Hardflip'; else core = bs ? 'Inward Heelflip' : 'Varial Heelflip';
    if (mult) core = mult + core; pts = 250 + 120 * (n - 1) + (core.includes('Hard') || core.includes('Inward') ? 60 : 0);
  } else if (n && y === 2) { core = kick ? (bs ? 'Tre Flip' : '360 Hardflip') : (bs ? '360 Inward Heelflip' : 'Laser Flip'); pts = 420 + 120 * (n - 1); }
  else if (!n && y) { core = (y === 2 ? '360 ' : y === 3 ? '540 ' : '') + (bs ? 'BS Pop Shove-It' : 'FS Pop Shove-It'); pts = 100 * y + (y >= 2 ? 80 : 0); }
  else if (n || y) { core = (n ? mult + (kick ? 'Kickflip ' : 'Heelflip ') : '') + y * 180 + ' Shove'; pts = 150 * n + 110 * y; }
  else { core = kind; pts = kind === 'Nollie' ? 80 : kind === 'Ollie' ? 50 : 0; }
  if (late && core !== kind) { core = 'Late ' + core; pts = Math.round(pts * 1.4); }
  const spin = body ? (bodyYaw > 0 ? 'FS ' : 'BS ') + body * 180 + ' ' : '';
  return { name: (spin + core).trim(), pts: pts + body * 180 * (body > 1 ? 1.6 : 1), rollT, yawH, pitchT, body };
}

// ---------------------------------------------------------------- loose board (after a bail)
// The board keeps its own momentum: it rolls on its wheels, slides on its side, bounces, flips.
export function createLoose(p, v, spin = { roll: 0, yaw: 0 }, upright = true) {
  return { p: { ...p }, v: { ...v }, yaw: Math.atan2(v.x, v.z) || 0, roll: upright ? 0 : Math.PI, wRoll: spin.roll || 0, wYaw: spin.yaw || 0, t: 0, rest: false };
}
export function stepLoose(L, floorY, dt, G = 9.8) {
  L.t += dt;
  L.v.y -= G * dt; L.p.x += L.v.x * dt; L.p.y += L.v.y * dt; L.p.z += L.v.z * dt;
  L.roll += L.wRoll * dt; L.yaw += L.wYaw * dt;
  const f = floorY(L.p.x, L.p.z);
  if (L.p.y <= f) {
    L.p.y = f;
    if (L.v.y < -1.2) { L.v.y = -L.v.y * 0.32; L.wRoll *= 0.6; L.wYaw += (L.v.x * 0.02); }    // bounce
    else L.v.y = 0;
    // on its wheels it rolls far; on its side / grip it scrapes to a stop
    const up = Math.cos(L.roll), onWheels = up > 0.7;
    const hs = Math.hypot(L.v.x, L.v.z), dec = (onWheels ? 0.35 : 4.5) * dt;
    if (hs > 0) { const k = Math.max(0, hs - dec) / hs; L.v.x *= k; L.v.z *= k; }
    L.wRoll *= Math.exp(-6 * dt); L.wYaw *= Math.exp(-3 * dt);
    if (Math.abs(L.wRoll) < 0.8) { const rest = Math.round(L.roll / Math.PI) * Math.PI; L.roll += (rest - L.roll) * Math.min(1, dt * 8); } // settles wheels-down or grip-down
    L.rest = hs < 0.15 && Math.abs(L.v.y) < 0.2;
  }
  return L;
}
