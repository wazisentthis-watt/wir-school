// GALAXY GALLIUM GLOBS — PROPOSAL / PUBLISH HOLD (RB1 voice 2026-11-06)
// "Gallium type globs, he almost looks like he's metal bending, can blast things and even knock cars over."
// Pure module (no DOM / Three): sizing, finite cost, launch, impact impulses, car tumble, puddle recovery.
// Canon kept: Gallium is finite (st.gal 0..1), no teleport, 80 % of spent matter is recoverable as a puddle,
// occupied cars are never thrown — the driver gets out first (see main.js).

export const GLOB = {
  GROW: 0.85,          // size units per second while held (size 0..1)
  COST: 0.16,          // Gallium per size unit pulled out of the suit
  MIN: 0.18,           // smallest launchable glob
  R0: 0.22, R1: 0.75,  // visual radius at size 0 / 1 (m)
  V0: 30, V1: 19,      // launch speed small → big (heavier = slower)
  LIFT: 2.2,           // slight upward arc at launch (m/s)
  G: 6.5,              // globs are dense: they drop a little in flight
  LIFE: 1.6,
  DENSITY: 1100,       // effective kg per size unit once it hardens on impact (Heavy-Crown weight, PROPOSAL)
  CAR_MASS: 1450,
  TIP: 0.42,           // size where a hit tips a parked/moving car onto its side
  RETURN: 0.8,
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createGlob() { return { size: 0, held: false, spent: 0, t: 0 }; }

// while the button is held: pull matter out of the suit. Returns Gallium used this frame.
export function formGlob(g, holding, gallium, dt) {
  if (!holding) { g.held = false; return 0; }
  g.held = true; g.t += dt;
  const want = Math.min(1 - g.size, GLOB.GROW * dt), afford = Math.max(0, gallium) / GLOB.COST;
  const grow = Math.max(0, Math.min(want, afford));
  g.size += grow; const used = grow * GLOB.COST; g.spent += used;
  return used;
}

export const globRadius = (size) => GLOB.R0 + (GLOB.R1 - GLOB.R0) * clamp(size, 0, 1);

// release: returns a projectile or null (too small = it flows back into the suit, refund)
export function launchGlob(g, origin, dir) {
  const s = g.size, spent = g.spent; g.size = 0; g.spent = 0; g.held = false; g.t = 0;
  if (s < GLOB.MIN) return { refund: spent };
  const n = Math.hypot(dir.x, dir.y || 0, dir.z) || 1, sp = GLOB.V0 + (GLOB.V1 - GLOB.V0) * s;
  return { p: { ...origin }, v: { x: dir.x / n * sp, y: (dir.y || 0) / n * sp + GLOB.LIFT, z: dir.z / n * sp }, size: s, r: globRadius(s), t: 0, spent };
}

export function stepGlob(pr, dt) {
  pr.t += dt; pr.v.y -= GLOB.G * dt;
  pr.p.x += pr.v.x * dt; pr.p.y += pr.v.y * dt; pr.p.z += pr.v.z * dt;
  return pr.t < GLOB.LIFE;
}

// momentum transfer into a car (car at rest or rolling). Returns linear Δv and a tumble spin.
export function carImpulse(pr, carPos) {
  const m = GLOB.DENSITY * pr.size, M = GLOB.CAR_MASS;
  const hs = Math.hypot(pr.v.x, pr.v.z) || 1, k = (m / (m + M)) * 0.8; // hardens on contact: mostly inelastic shove
  const dvx = pr.v.x * k, dvz = pr.v.z * k;
  const tips = pr.size >= GLOB.TIP;
  // hit above the centre of mass → roll about the horizontal axis perpendicular to the hit
  const ax = { x: pr.v.z / hs, y: 0, z: -pr.v.x / hs };
  const spin = tips ? 2.2 + 5.5 * (pr.size - GLOB.TIP) / (1 - GLOB.TIP) : 0.8 * pr.size;
  return { v: { x: dvx, y: tips ? 3 + 5 * pr.size : 0.6, z: dvz }, axis: ax, spin, tips, rolls: spin > 5 };
}

export function foeImpact(pr) {
  return { dmg: 0.1 + 0.32 * pr.size, kb: 3 + 9 * pr.size, down: pr.size >= 0.5, stun: 0.4 + 0.6 * pr.size };
}

// car tumble: integrate a roll angle around the impact axis and settle on wheels / side / roof
export function createTumble(spin) { return { roll: 0, w: spin, settled: false }; }
export function stepTumble(T, dt, onGround) {
  if (T.settled) return T;
  T.roll += T.w * dt;
  if (onGround) {
    T.w *= Math.exp(-2.4 * dt);
    const rest = Math.round(T.roll / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(T.w) < 0.6) { T.roll += (rest - T.roll) * Math.min(1, dt * 6); if (Math.abs(rest - T.roll) < 0.01) { T.roll = rest; T.w = 0; T.settled = true; } }
  }
  return T;
}
export function tumbleResult(T) {
  const q = ((Math.round(T.roll / (Math.PI / 2)) % 4) + 4) % 4;
  return ['wheels', 'side', 'roof', 'side'][q];
}

// puddle the glob leaves behind: walk over it to pull it back (80 %)
export function splat(pr) { return { amount: pr.spent * GLOB.RETURN, t: 0 }; }
