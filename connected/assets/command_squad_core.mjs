// WIR REFRAMER COMMAND: four-unit squad state. PROPOSAL / PUBLISH HOLD.
// Pure, deterministic, no THREE. Owns identity, position, HP, cooldowns, orders and inventory per unit.
// Switching the controlled unit never moves, heals or resets anyone. Units without direct control
// carry their last order forward.
// Not yet: path planning (straight-line + blocker report only), ATTACK/HARVEST/REPAIR (rejected honestly).
export const UNITS = Object.freeze(['GENERAL', 'BULWARK', 'FOUNDRY', 'THREAD']);
export const ORDERS = Object.freeze(['FOLLOW', 'MOVE', 'HOLD', 'DEFEND', 'REGROUP', 'ATTACK', 'HARVEST', 'REPAIR']);
export const IMPLEMENTED_ORDERS = Object.freeze(['FOLLOW', 'MOVE', 'HOLD', 'DEFEND', 'REGROUP']);
export const CMD = Object.freeze({ SPEED: { GENERAL: 4.5, BULWARK: 2.4, FOUNDRY: 3.4, THREAD: 6.5 }, ARRIVE: 0.6, REGROUP_R: 3, DEFEND_R: 10 });

const finite = n => typeof n === 'number' && Number.isFinite(n);
const at = p => p && finite(p.x) && finite(p.z) ? { x: p.x, z: p.z } : null;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createCommandSquad(start = {}) {
  const units = {};
  UNITS.forEach((id, i) => {
    const p = at(start[id]) || { x: i * 2, z: 0 };
    units[id] = { id, x: p.x, z: p.z, hp: 100, cooldowns: {}, inventory: [], order: { type: 'FOLLOW' }, queue: [], status: 'idle' };
  });
  return { controlled: 'GENERAL', units, log: [] };
}

export function select(S, id) {
  if (!UNITS.includes(id)) return { ok: false, reason: 'unknown-unit' };
  S.controlled = id;
  return { ok: true, controlled: id };
}

export function cycle(S, dir = 1) {
  const i = UNITS.indexOf(S.controlled);
  return select(S, UNITS[(i + dir + UNITS.length) % UNITS.length]);
}

export function giveOrder(S, id, type, args = {}, blockers = []) {
  const u = S.units[id];
  if (!u) return { ok: false, reason: 'unknown-unit' };
  if (!ORDERS.includes(type)) return { ok: false, reason: 'unknown-order' };
  if (!IMPLEMENTED_ORDERS.includes(type)) return { ok: false, reason: 'not-implemented', order: type };
  if (type === 'MOVE' || type === 'HOLD' || type === 'DEFEND') {
    const p = at(args.at);
    if (!p) return { ok: false, reason: 'missing-position' };
    if (blockers.some(b => dist(p, b) < b.r)) return { ok: false, reason: 'target-blocked' };
    u.order = { type, at: p, r: type === 'DEFEND' ? (finite(args.r) ? args.r : CMD.DEFEND_R) : 0 };
  } else if (type === 'FOLLOW') {
    u.order = { type: 'FOLLOW', target: args.target || 'GENERAL' };
  } else if (type === 'REGROUP') {
    u.order = { type: 'REGROUP' };
  }
  u.status = 'moving';
  return { ok: true, id, order: u.order.type };
}

// Advance every unit one step. Controlled unit is driven by the player (movePlayer), others follow orders.
// blockers: [{x,z,r}] circles. A unit that would enter a blocker stops and reports 'blocked'.
export function step(S, dt, { blockers = [], enemies = [], movePlayer = null } = {}) {
  const events = [];
  const G = S.units.GENERAL;
  for (const id of UNITS) {
    const u = S.units[id];
    if (id === S.controlled && movePlayer) {
      moveToward(u, { x: u.x + movePlayer.x, z: u.z + movePlayer.z }, Math.hypot(movePlayer.x, movePlayer.z) > 0 ? CMD.SPEED[id] * dt : 0, blockers, events, id, true);
      continue;
    }
    const o = u.order;
    if (o.type === 'HOLD') { u.status = 'holding'; continue; }
    if (o.type === 'FOLLOW') {
      const t = S.units[o.target] || G;
      if (dist(u, t) > 2.5) moveToward(u, t, CMD.SPEED[id] * dt, blockers, events, id);
      else u.status = 'following';
      continue;
    }
    if (o.type === 'REGROUP') {
      if (dist(u, G) > CMD.REGROUP_R) moveToward(u, G, CMD.SPEED[id] * dt, blockers, events, id);
      else { u.status = 'regrouped'; u.order = { type: 'FOLLOW', target: 'GENERAL' }; events.push({ type: 'regrouped', id }); promote(u, events, id); }
      continue;
    }
    if (o.type === 'MOVE' || o.type === 'DEFEND') {
      if (dist(u, o.at) > CMD.ARRIVE) moveToward(u, o.at, CMD.SPEED[id] * dt, blockers, events, id);
      else if (o.type === 'MOVE') { u.status = 'arrived'; promote(u, events, id); }
      else u.status = 'defending';
      if (o.type === 'DEFEND' && enemies.some(e => dist(e, u) <= o.r)) events.push({ type: 'engaged', id });
      continue;
    }
  }
  return events;
}

function moveToward(u, to, speed, blockers, events, id, player = false) {
  const d = dist(u, to);
  if (d <= 1e-9 || speed <= 0) { u.status = u.status === 'blocked' ? 'blocked' : u.status; return; }
  const k = Math.min(1, speed / d);
  const nx = u.x + (to.x - u.x) * k, nz = u.z + (to.z - u.z) * k;
  const hit = blockers.find(b => Math.hypot(nx - b.x, nz - b.z) < b.r);
  if (hit) {
    u.status = 'blocked';
    events.push({ type: 'blocked', id, by: { x: hit.x, z: hit.z } });
    if (u.queue.length) { events.push({ type: 'queue-dropped', id, count: u.queue.length, reason: 'primary-blocked' }); u.queue = []; }
    return;
  }
  u.x = nx; u.z = nz;
  if (!player && u.status !== 'moving') u.status = 'moving';
}

// Switching units must not change anything except which unit receives direct input.
export function snapshot(S) {
  return JSON.parse(JSON.stringify(S));
}

export function serialize(S) {
  return JSON.stringify({ v: 2, controlled: S.controlled, units: S.units });
}

export function deserialize(txt) {
  const d = JSON.parse(txt);
  if (d.v !== 1 && d.v !== 2) throw new Error('unsupported-save-version');
  // v1 saves predate the queue: migrate by giving every unit an empty queue (#94)
  for (const u of Object.values(d.units)) if (!Array.isArray(u.queue)) u.queue = [];
  return { controlled: d.controlled, units: d.units, log: [] };
}

// #12: one conditional follow-up per unit. Only orders that resolve (MOVE, REGROUP) can be queued behind.
const QUEUEABLE_PRIMARY = new Set(['MOVE', 'REGROUP']);
export const QUEUE_MAX = 1;

export function queueOrder(S, id, type, args = {}, blockers = []) {
  const u = S.units[id];
  if (!u) return { ok: false, reason: 'unknown-unit' };
  if (!QUEUEABLE_PRIMARY.has(u.order.type) || u.status === 'idle' && u.order.type !== 'MOVE') return { ok: false, reason: 'primary-never-resolves', primary: u.order.type };
  if (u.queue.length >= QUEUE_MAX) return { ok: false, reason: 'queue-full' };
  const check = preview(S, id, type, args, blockers);
  if (!check.ok) return check;
  u.queue.push({ type, args: { ...args } });
  return { ok: true, queued: type, depth: u.queue.length };
}

function promote(u, events, id) {
  if (!u.queue.length) return;
  const next = u.queue.shift();
  const r = giveOrder({ units: { [id]: u } }, id, next.type, next.args, []);
  events.push({ type: 'queue-started', id, order: next.type, ok: r.ok, reason: r.reason || null });
}

// #11: describe an order without committing it. Never changes state.
export function preview(S, id, type, args = {}, blockers = []) {
  const u = S.units[id];
  if (!u) return { ok: false, reason: 'unknown-unit' };
  if (!ORDERS.includes(type)) return { ok: false, reason: 'unknown-order' };
  if (!IMPLEMENTED_ORDERS.includes(type)) return { ok: false, reason: 'not-implemented', order: type };
  let dest = null;
  if (type === 'MOVE' || type === 'HOLD' || type === 'DEFEND') {
    dest = at(args.at);
    if (!dest) return { ok: false, reason: 'missing-position' };
    if (blockers.some(b => dist(dest, b) < b.r)) return { ok: false, reason: 'target-blocked' };
  } else if (type === 'FOLLOW') {
    dest = S.units[args.target || 'GENERAL'] ? { x: S.units[args.target || 'GENERAL'].x, z: S.units[args.target || 'GENERAL'].z } : null;
    if (!dest) return { ok: false, reason: 'missing-target' };
  } else if (type === 'REGROUP') {
    dest = { x: S.units.GENERAL.x, z: S.units.GENERAL.z };
  }
  const len = dist(u, dest);
  const speed = CMD.SPEED[id];
  const crossesBlocker = blockers.some(b => segmentHits(u, dest, b));
  return {
    ok: true, unit: id, order: type, target: dest,
    path: [{ x: u.x, z: u.z }, dest],
    etaSec: +(len / speed).toFixed(2),
    willBlock: crossesBlocker,
    refusal: null,
  };
}

function segmentHits(a, b, c) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(a.x + dx * t - c.x, a.z + dz * t - c.z) < c.r;
}
