// Dash interception maths for two fighters in 3D. Pure functions, no DOM or three.js.
// Clean-room: written for WIR Connected from the mechanic, not copied from any other build.

export const v3 = (x, y, z) => ({ x, y, z });
export const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a, s) => v3(a.x * s, a.y * s, a.z * s);
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a) => Math.hypot(a.x, a.y, a.z);
export const unit = (a) => { const l = len(a) || 1; return v3(a.x / l, a.y / l, a.z / l); };
export const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));

// Smallest positive time T where |r + v*T| = s*T (a shot of speed s meets a target that is
// at offset r and moving at v). Falls back to straight-line time when there is no solution.
export function interceptTime(r, v, s, maxT = 1.2) {
  const a = dot(v, v) - s * s;
  const b = 2 * dot(r, v);
  const c = dot(r, r);
  let T = NaN;
  if (Math.abs(a) < 1e-6) {
    if (b < 0) T = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const q = Math.sqrt(disc);
      const roots = [(-b - q) / (2 * a), (-b + q) / (2 * a)].filter((t) => t > 1e-4);
      if (roots.length) T = Math.min(...roots);
    }
  }
  if (!Number.isFinite(T) || T <= 0) T = len(r) / Math.max(1, s);
  return Math.min(T, maxT);
}

// Turn unit direction `dir` toward `target` by at most maxAng radians (a steering clamp).
export function turnToward(dir, target, maxAng) {
  const a = unit(dir), b = unit(target);
  const th = angleBetween(a, b);
  if (th <= maxAng || th < 1e-6) return b;
  // rotate a toward the component of b perpendicular to a
  const perpRaw = sub(b, scale(a, dot(a, b)));
  const pl = len(perpRaw);
  if (pl < 1e-9) return b;
  const p = scale(perpRaw, 1 / pl);
  return unit(add(scale(a, Math.cos(maxAng)), scale(p, Math.sin(maxAng))));
}

// Where a target will be after T seconds, given its velocity and an optional dash.
// A dash keeps its velocity for the rest of the dash, then bleeds speed (x0.35) and brakes.
export function predictDisplacement(vel, T, dash = null) {
  if (!dash || dash.remaining == null) return scale(vel, T);
  const rem = Math.max(0, dash.remaining);
  if (T <= rem) return scale(vel, T);
  const k = 5;
  const tail = (0.35 / k) * (1 - Math.exp(-k * (T - rem)));
  return scale(vel, rem + tail);
}

// Lead point for a shot from `from` (chest position) at a target (chest position + velocity).
// For a dashing target the time is refined a few times, because its path is not a straight line.
export function leadPoint(from, target, speed, dash = null) {
  const r = sub(target.pos, from);
  let T = interceptTime(r, target.vel, speed);
  if (dash) {
    for (let i = 0; i < 8; i++) {
      const d = predictDisplacement(target.vel, T, dash);
      T = Math.min(1.2, len(add(r, d)) / Math.max(1, speed));
    }
  }
  const d = predictDisplacement(target.vel, T, dash);
  return { T, point: add(target.pos, d), dir: unit(add(r, d)) };
}

// Does a dash lock onto a target? Needs to be within range and inside the aim cone.
export function locksOn(dist, angleRad, { range = 18, cone = (75 * Math.PI) / 180 } = {}) {
  return dist < range && angleRad < cone;
}
