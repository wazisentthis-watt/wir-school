// MALLEABLE MORROW v0.1 — PROPOSAL / PUBLISH HOLD (RB1 "One Game, Every Power" brief, 2026-11-06)
// First playable milestone: one block with material pickups, Gallium constructs you physically ride, a rail you can
// bend and grind in its new shape, a wall that cracks / breaks / gets repaired, a mission giver, and a saved world.
// Pure (no DOM / Three): material ledger, construct geometry (heightfield + rails), rail bending, wall panels,
// progression unlocks and save/load. Numbers are game-balancing proposals, not canon quantities.

export const MAT = {
  UNITS: 100,                                   // st.gal 0..1 ↔ 0..100 units
  COST: { ramp: 30, rail: 15, shield: 20, patch: 10, straighten: 8 },
  RECLAIM: 1,                                   // perfect reclamation of intact constructs (damage loses some)
  DAMAGE_LOSS: 0.2,
};

let NEXT = 1;
const id = (k) => k + (NEXT++);

// ---------------------------------------------------------------- constructs
// ramp: kicker 3.2 m long, 1.1 m high, 2.4 m wide, facing `heading` (rider rolls up it going forward)
// rail: 6 m flat bar at 0.55 m along heading · shield: 2.6 × 2.2 m wall (blocks), 0.3 m thick
export function build(state, kind, x, z, heading, base = 0) {
  if (!state.unlocked[kind]) return { ok: false, why: 'locked' };
  const cost = MAT.COST[kind]; if (state.units < cost) return { ok: false, why: 'material' };
  state.units -= cost;
  const c = { id: id(kind), kind, x, z, h: heading, base, hp: 1, cost };
  state.constructs.push(c); state.stats.built++;
  return { ok: true, c };
}
function local(c, x, z) { const dx = x - c.x, dz = z - c.z, s = Math.sin(c.h), co = Math.cos(c.h); return { u: dx * s + dz * co, w: dx * co - dz * s }; }
export function constructHeight(c, x, z) {
  const { u, w } = local(c, x, z);
  if (c.kind === 'ramp') { if (u < 0 || u > 3.2 || Math.abs(w) > 1.2) return -1; const k = u / 3.2; return c.base + 1.1 * k * k * (c.hp > 0.5 ? 1 : 0.6); } // curved kicker
  if (c.kind === 'shield') { if (Math.abs(u) > 0.15 || Math.abs(w) > 1.3) return -1; return c.base + 2.2; }
  return -1;
}
export function constructRails(c) {
  if (c.kind !== 'rail') return [];
  const s = Math.sin(c.h), co = Math.cos(c.h), L = 3, y = c.base + 0.55;
  return [{ a: { x: c.x - s * L, y, z: c.z - co * L }, b: { x: c.x + s * L, y, z: c.z + co * L }, kind: 'rail', name: 'Gallium rail', construct: c.id }];
}
// reclaim (Metal Draw on it): returns units back. damaged constructs lose part of their matter
export function reclaim(state, cid) {
  const i = state.constructs.findIndex(c => c.id === cid); if (i < 0) return 0;
  const c = state.constructs[i]; state.constructs.splice(i, 1);
  const back = Math.round(c.cost * MAT.RECLAIM * (1 - (1 - c.hp) * MAT.DAMAGE_LOSS * 5) * 10) / 10;
  state.units = Math.min(MAT.UNITS, state.units + Math.max(0, back)); state.stats.reclaimed++;
  return back;
}
export function damageConstruct(state, cid, amt) {
  const c = state.constructs.find(k => k.id === cid); if (!c) return null;
  c.hp -= amt; if (c.hp <= 0) { state.constructs.splice(state.constructs.indexOf(c), 1); state.stats.lostConstructs++; return { destroyed: true, lost: c.cost }; }
  return { destroyed: false, hp: c.hp };
}

// ---------------------------------------------------------------- bendable rails
// a rail is a polyline of points; a heavy hit bends it at the hit point (direction of the hit, down if from above)
export function railFrom(a, b, name) { return { id: id('br'), name, pts: [{ ...a }, { ...b }], bent: 0, orig: [{ ...a }, { ...b }] }; }
export function railSegments(r) { const out = []; for (let i = 0; i < r.pts.length - 1; i++) out.push({ a: r.pts[i], b: r.pts[i + 1], kind: 'rail', name: r.bent ? 'Bent ' + r.name : r.name, bendable: r.id }); return out; }
export function bendRail(r, hit, dir, power) {
  if (power < 0.35) return false;
  // nearest point on the polyline
  let best = null;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0.12, Math.min(0.88, ((hit.x - a.x) * dx + (hit.z - a.z) * dz) / L2));
    const q = { x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t }, d = Math.hypot(hit.x - q.x, hit.z - q.z);
    if (!best || d < best.d) best = { i, t, q, d };
  }
  if (!best || best.d > 1.6 || r.pts.length > 6) return false;
  const n = Math.hypot(dir.x, dir.z) || 1, k = Math.min(1, power);
  const p = { x: best.q.x + dir.x / n * 0.7 * k, y: Math.max(0.15, best.q.y + (dir.y < -0.3 ? -0.3 : -0.12) * k), z: best.q.z + dir.z / n * 0.7 * k };
  r.pts.splice(best.i + 1, 0, p); r.bent++;
  return p;
}
export function straightenRail(r) { r.pts = r.orig.map(p => ({ ...p })); r.bent = 0; }

// ---------------------------------------------------------------- breakable / repairable wall
// panels in a grid; each panel: hp 0..1 (1 intact, <0.5 cracked, 0 broken). Breaking a bottom panel under intact ones
// leaves them hanging only if a neighbour supports them — otherwise they fall (simple support graph).
export function createWall(cols = 4, rows = 3) { const p = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) p.push({ c, r, hp: 1, patched: false }); return { cols, rows, panels: p }; }
const at = (W, c, r) => W.panels.find(p => p.c === c && p.r === r);
function supported(W, p) {
  if (p.r === 0) return true;
  const below = at(W, p.c, p.r - 1), l = at(W, p.c - 1, p.r), rt = at(W, p.c + 1, p.r);
  const carried = (q) => q && q.hp > 0 && (q.r === 0 || (at(W, q.c, q.r - 1) && at(W, q.c, q.r - 1).hp > 0));
  return (below && below.hp > 0) || (carried(l) && carried(rt)); // carried from below, or bridged between two carried neighbours
}
// hit panel (c,r) with force 0..1 → returns list of panels that broke/fell
export function hitWall(W, c, r, force) {
  const p = at(W, c, r); if (!p || p.hp <= 0) return [];
  p.hp = Math.max(0, p.hp - force * (p.patched ? 0.6 : 1));
  const out = []; if (p.hp <= 0) out.push(p);
  // collapse what is no longer supported (top-down cascade)
  let changed = true;
  while (changed) { changed = false; for (const q of W.panels) if (q.hp > 0 && !supported(W, q)) { q.hp = 0; out.push(q); changed = true; } }
  return out;
}
export function wallState(W) { const n = W.panels.length; return { intact: W.panels.filter(p => p.hp >= 0.5).length, cracked: W.panels.filter(p => p.hp > 0 && p.hp < 0.5).length, broken: W.panels.filter(p => p.hp <= 0).length, n }; }
// repair one panel (bottom-up order so new panels are supported); costs MAT.COST.patch units
export function repairWall(state, W) {
  const need = W.panels.filter(p => p.hp < 1).sort((a, b) => a.r - b.r || a.hp - b.hp)[0];
  if (!need) return null; if (state.units < MAT.COST.patch) return { ok: false, why: 'material' };
  state.units -= MAT.COST.patch; need.hp = 1; need.patched = true; state.stats.repaired++;
  return { ok: true, panel: need };
}

// ---------------------------------------------------------------- progression (Knowledge · Mastery · Resources)
export const JOBS = [
  { id: 'gather', title: 'Material run', ask: 'Draw 40 units of metal from the block', check: s => s.stats.drawn >= 40, unlock: null },
  { id: 'span', title: 'The Missing Span', ask: 'Build a Gallium ramp and get 0.5 s of air off it', check: s => s.stats.rampAirs >= 1, unlock: 'rail' },
  { id: 'bend', title: 'Reshape the line', ask: 'Bend the bar with a heavy glob, then grind its new shape', check: s => s.stats.bentGrinds >= 1, unlock: null },
  { id: 'fall', title: "Don't Let It Fall", ask: 'Repair the broken wall back to full', check: s => s.stats.wallRestored >= 1, unlock: 'shield' },
];
export function createWorldState() {
  return { v: 1, units: 60, unlocked: { ramp: true, rail: false, shield: false }, constructs: [], jobs: {}, rails: {}, wall: null,
    stats: { built: 0, reclaimed: 0, lostConstructs: 0, repaired: 0, drawn: 0, rampAirs: 0, bentGrinds: 0, wallRestored: 0 } };
}
export function currentJob(s) { return JOBS.find(j => !s.jobs[j.id]) || null; }
export function checkJobs(s) {
  const j = currentJob(s); if (!j || !j.check(s)) return null;
  s.jobs[j.id] = true; if (j.unlock) s.unlocked[j.unlock] = true;
  return j;
}

// ---------------------------------------------------------------- persistence (compact changes, not the whole city)
export function serialize(s, rails, wall) {
  return JSON.stringify({ v: 1, units: s.units, unlocked: s.unlocked, jobs: s.jobs, stats: s.stats,
    constructs: s.constructs.map(c => ({ kind: c.kind, x: +c.x.toFixed(2), z: +c.z.toFixed(2), h: +c.h.toFixed(3), base: c.base, hp: c.hp, cost: c.cost })),
    rails: Object.fromEntries(Object.entries(rails).map(([k, r]) => [k, r.pts.map(p => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)])])),
    wall: wall ? wall.panels.map(p => [p.c, p.r, +p.hp.toFixed(2), p.patched ? 1 : 0]) : null });
}
export function deserialize(txt, rails, wall) {
  const s = createWorldState(); let d; try { d = JSON.parse(txt); } catch (e) { return s; }
  if (!d || d.v !== 1) return s;
  s.units = d.units ?? s.units; Object.assign(s.unlocked, d.unlocked || {}); s.jobs = d.jobs || {}; Object.assign(s.stats, d.stats || {});
  s.constructs = (d.constructs || []).map(c => ({ ...c, id: id(c.kind) }));
  for (const [k, pts] of Object.entries(d.rails || {})) if (rails[k]) { rails[k].pts = pts.map(([x, y, z]) => ({ x, y, z })); rails[k].bent = Math.max(0, pts.length - 2); }
  if (wall && d.wall) for (const [c, r, hp, pt] of d.wall) { const p = at(wall, c, r); if (p) { p.hp = hp; p.patched = !!pt; } }
  return s;
}
