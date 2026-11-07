// CROWN POINTS + MAGNETIC SNAPLINE — PROPOSAL / PUBLISH HOLD (2026-11-07)
// Canon (S1E11, ARC L446): mark Crown points (anchor relationships), then commit to a visible arc between them.
// No cancel mid-arc. Never a teleport: he travels every metre of the arc, and it never passes through solids.
// Connected rule (finite, conserved Galaxy Gallium): each Crown point parks Gallium at its anchor. When the arc is
// done — or the points are left too long — that Gallium drips to the floor under each anchor as a puddle.
// Numbers are PROPOSAL. Pure: main.js owns meshes, input and the ride.

export const SNAP = {
  MAX: 3, COST: 0.04, MARK_R: 48, MARK_MIN: 6, CONE: 0.8, HOLD_T: 14,
  SPEED: 20, MAX_STEP: 0.6,          // metres per frame, whatever the frame time
  ABOVE: 0.8, CLEAR: 1.4, NEAR: 1.5, NEAR_CLEAR: 0.3, LIFT_STEP: 0.75, LIFT_MAX: 60, SAMPLES: 40,
  LAND_AHEAD: 5, LAND_MAX: 24, ARC_RES: 0.4,
};
const wrap = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

export function createSnap() { return { points: [], state: 'idle', path: null, cum: null, s: 0, len: 0, idle: 0, arcs: 0, nodes: null }; }

// metal: {x,y,z}; heading: radians (sin, cos convention: forward = (sin h, cos h)); anchors: [{x,y,z}]
export function mark(S, metal, heading, anchors, gal) {
  if (S.state === 'arc') return { ok: false, why: 'arc' };
  if (S.points.length >= SNAP.MAX) return { ok: false, why: 'max' };
  if (gal + 1e-9 < SNAP.COST) return { ok: false, why: 'material' };
  const from = S.points.length ? S.points[S.points.length - 1] : metal;
  let best = null, bs = -1e9;
  for (const a of anchors) {
    const dx = a.x - from.x, dz = a.z - from.z, hl = Math.hypot(dx, dz);
    if (hl < SNAP.MARK_MIN || hl > SNAP.MARK_R) continue;
    if (Math.abs(wrap(Math.atan2(dx, dz) - heading)) > SNAP.CONE) continue;
    const mx = a.x - metal.x, mz = a.z - metal.z; if (mx * Math.sin(heading) + mz * Math.cos(heading) <= 0) continue; // always ahead of Metal
    if (S.points.some(p => Math.hypot(p.x - a.x, p.z - a.z) < 3)) continue;
    const ang = Math.abs(wrap(Math.atan2(dx, dz) - heading));
    const sc = -ang * 8 - hl * 0.12 - Math.max(0, a.y - from.y - 12) * 0.3;   // the next anchor along the line, not the farthest
    if (sc > bs) { bs = sc; best = a; }
  }
  if (!best) return { ok: false, why: 'none' };
  const p = { x: best.x, y: best.y, z: best.z, amount: SNAP.COST };
  S.points.push(p); S.idle = 0;
  return { ok: true, point: p, cost: SNAP.COST, n: S.points.length };
}

const bez = (a, c, b, t) => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y, z: u * u * a.z + 2 * u * t * c.z + t * t * b.z }; };

// one segment: lift the control point until every sample clears the solids under it
function segment(a, b, heightAt) {
  const mid = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y), z: (a.z + b.z) / 2 };
  const N = Math.max(SNAP.SAMPLES, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2)); // dense enough that no roof corner slips between samples
  for (let lift = 0.5; lift <= SNAP.LIFT_MAX; lift += SNAP.LIFT_STEP) {
    const c = { x: mid.x, y: mid.y + lift, z: mid.z };
    let ok = true;
    for (let i = 1; i < N; i++) {
      const t = i / N, q = bez(a, c, b, t);
      const nearA = Math.hypot(q.x - a.x, q.z - a.z) < SNAP.NEAR, nearB = Math.hypot(q.x - b.x, q.z - b.z) < SNAP.NEAR;
      const need = heightAt(q.x, q.z) + (nearA || nearB ? SNAP.NEAR_CLEAR : SNAP.CLEAR);
      if (q.y < need) { ok = false; break; }
    }
    if (ok) return c;
  }
  return null;
}

// commit to the arc. heightAt(x,z) = top of whatever is there (ground if nothing). Returns {ok, len, landing}
export function commit(S, metal, heightAt) {
  if (S.state === 'arc') return { ok: false, why: 'arc' };
  if (!S.points.length) return { ok: false, why: 'points' };
  const nodes = [{ x: metal.x, y: metal.y, z: metal.z }, ...S.points.map(p => ({ x: p.x, y: p.y + SNAP.ABOVE, z: p.z }))];
  // landing: carry on past the last Crown point to the first floor that is lower than the anchor
  const a = nodes[nodes.length - 2], b = nodes[nodes.length - 1];
  let dx = b.x - a.x, dz = b.z - a.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  const ctrl = [];
  for (let i = 0; i < nodes.length - 1; i++) { const c = segment(nodes[i], nodes[i + 1], heightAt); if (!c) return { ok: false, why: 'blocked', seg: i }; ctrl.push(c); }
  // the first floor past the last point that is lower than the anchor AND reachable by a clean descent
  let land = null, lc = null;
  for (let d = SNAP.LAND_AHEAD; d <= SNAP.LAND_MAX && !land; d += 1) {
    const x = b.x + dx * d, z = b.z + dz * d, y = heightAt(x, z);
    if (y > b.y - 0.5) continue;
    const c = segment(b, { x, y, z }, heightAt); if (c) { land = { x, y, z }; lc = c; }
  }
  if (!land) return { ok: false, why: 'landing' };
  nodes.push(land); ctrl.push(lc);
  const pts = [nodes[0]];
  for (let i = 0; i < nodes.length - 1; i++) {
    const c = ctrl[i];
    const segL = Math.hypot(nodes[i + 1].x - nodes[i].x, nodes[i + 1].y - nodes[i].y, nodes[i + 1].z - nodes[i].z) + Math.abs(c.y - nodes[i].y);
    const n = Math.max(4, Math.ceil(segL / SNAP.ARC_RES));
    for (let k = 1; k <= n; k++) pts.push(bez(nodes[i], c, nodes[i + 1], k / n));
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
  S.state = 'arc'; S.path = pts; S.cum = cum; S.len = cum[cum.length - 1]; S.s = 0; S.nodes = nodes; S.arcs++;
  return { ok: true, len: S.len, landing: land, points: S.points.length };
}

export function posAt(S, s) {
  const P = S.path, C = S.cum; if (!P) return null;
  if (s <= 0) return { ...P[0] }; if (s >= S.len) return { ...P[P.length - 1] };
  let lo = 0, hi = C.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (C[m] <= s) lo = m; else hi = m; }
  const t = (s - C[lo]) / ((C[hi] - C[lo]) || 1), a = P[lo], b = P[hi];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

// advance. Input is ignored during the arc (no cancel). Returns null | {type:'arc'|'land'|'expire', …}
export function step(S, dt) {
  if (S.state !== 'arc') {
    if (!S.points.length) return null;
    S.idle += dt; if (S.idle < SNAP.HOLD_T) return null;
    const drop = S.points; S.points = []; S.idle = 0; return { type: 'expire', drop };
  }
  const prev = posAt(S, S.s);
  S.s = Math.min(S.len, S.s + Math.min(SNAP.SPEED * dt, SNAP.MAX_STEP));
  const pos = posAt(S, S.s);
  const dx = pos.x - prev.x, dy = pos.y - prev.y, dz = pos.z - prev.z, d = Math.hypot(dx, dy, dz) || 1;
  const tan = { x: dx / d, y: dy / d, z: dz / d };
  if (S.s >= S.len) {
    const drop = S.points; S.points = []; S.state = 'idle'; S.path = null; S.cum = null;
    return { type: 'land', pos, tan, disp: d, drop };
  }
  return { type: 'arc', pos, tan, disp: d, k: S.s / S.len };
}
