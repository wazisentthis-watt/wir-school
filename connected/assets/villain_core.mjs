// MORROW VILLAINS — PROPOSAL / PUBLISH HOLD
// Signature rules for the Season One villains from the owner's free-roam mission blueprint (2026-11-06).
// Pure module: the main game draws the effects and owns the fighters.
//   Ballast   — armored heavy. Front hits barely land; the environment (globs, cars, slams) cracks him.
//   Slipline  — dashes in slides and leaves slick lanes that make you slide too.
//   Glassjaw  — "strong is not tough": fake reinforcement plates absorb hits until they crack, then he folds.
//   Kiln      — heat aura that cooks you up close; Gallium globs cool him and he seizes up.
//   Echo Nail — drives spikes that repeat the impact seven seconds later. Move people (and yourself) off the marks.
// Second powers (2026-11-06 "the villains should have all their powers"):
//   Ballast throws cars (driver out first) · Slipline's charged slide transfers your hits away (intercept her mid-dash)
//   Glassjaw regrows a plate when you back off + throws glass shards · Kiln heat lance + hot zones (globs put them out)
//   Echo Nail stores the hits he takes and releases them seven seconds later as a shockwave

export const VILLAINS = {
  ballast:  { name: 'Ballast',   ep: 1, color: 0x6b5a3c, h: 2.25, frontMul: 0.25, envMul: 1.8, slamR: 4.2, slamCd: 6, throwCd: 9 },
  slipline: { name: 'Slipline',  ep: 2, color: 0x2e8fb0, h: 1.78, dashCd: 3.2, slickLife: 6, slickR: 1.1, dashT: 0.35, chargeT: 1.2 },
  glassjaw: { name: 'Glassjaw',  ep: 3, color: 0x9fb8c8, h: 1.95, plates: 4, regrow: 8, shardCd: 5, shardR: 7 },
  kiln:     { name: 'Kiln',      ep: 4, color: 0xd8561e, h: 1.9, heatR: 3.4, heatDps: 0.06, coolT: 2.4, lanceCd: 4, zoneCd: 6, zoneLife: 6, zoneR: 1.8, zoneDps: 0.05 },
  echonail: { name: 'Echo Nail', ep: 5, color: 0x5e3a8c, h: 1.82, delay: 7, spikeCd: 3.5, spikeR: 1.6, warn: 1.5, backR: 3.2 },
};

const front = (facingYaw, fromX, fromZ) => {
  const fx = Math.sin(facingYaw), fz = Math.cos(facingYaw), n = Math.hypot(fromX, fromZ) || 1;
  return (fx * fromX + fz * fromZ) / n > 0.35; // attacker is in front of him
};

// damage multiplier for a hit on a villain. src: 'strike' | 'glob' | 'car' | 'blast' | 'slam'
export function damageMul(id, V, { facingYaw = 0, fromX = 0, fromZ = 1, src = 'strike' } = {}) {
  const cfg = VILLAINS[id]; if (!cfg) return 1;
  if (id === 'ballast') {
    if (src === 'glob' || src === 'car' || src === 'slam') return cfg.envMul;
    return front(facingYaw, fromX, fromZ) ? cfg.frontMul : 0.8;
  }
  if (id === 'slipline') {
    if (V.dashing > 0) return 2;                 // intercept her mid-dash
    if (V.charged > 0 && src === 'strike') { V.transfers = (V.transfers || 0) + 1; return 0.3; } // the hit's force goes into the street
    return 1;
  }
  if (id === 'echonail') { V.stored = (V.stored || 0) + 1; V.storeT = 0; return 1; }
  if (id === 'glassjaw') {
    V.lastHit = V.t;
    if (V.plates > 0) { V.plates--; V.cracked = V.plates === 0; return 0.05; }
    return 1.6; // once the fake reinforcement is gone he folds
  }
  if (id === 'kiln' && (src === 'glob')) { V.cool = cfg.coolT; return 1.4; }
  return 1;
}

export function createVillainState(id) {
  const cfg = VILLAINS[id] || {};
  return { id, t: 0, cd: 2, cd2: 4, plates: cfg.plates || 0, cracked: false, cool: 0, slick: [], echoes: [], heat: 0, zones: [], dashing: 0, charged: 0, stored: 0, storeT: 0, lastHit: -9 };
}

// per-frame ability step. env: { dist (to Metal), metal:{x,z}, self:{x,z}, active }
// returns { metalDmg, slide (bool: Metal on a slick lane), events:[] }
export function stepVillain(V, env, dt) {
  const cfg = VILLAINS[V.id], out = { metalDmg: 0, slide: false, events: [] };
  if (!cfg || !env.active) return out;
  V.t += dt; V.cd -= dt; V.cd2 -= dt; if (V.cool > 0) V.cool -= dt; if (V.dashing > 0) V.dashing -= dt; if (V.charged > 0) V.charged -= dt;
  const frozen = V.cool > 0;
  // ---- second powers
  if (V.id === 'ballast' && V.cd2 <= 0 && env.dist > 5 && env.dist < 15 && !frozen) { V.cd2 = cfg.throwCd; out.events.push({ type: 'throwCar', x: env.self.x, z: env.self.z }); }
  if (V.id === 'glassjaw') {
    if (V.plates < cfg.plates && V.t - V.lastHit > cfg.regrow && V.t % cfg.regrow < dt) { V.plates++; V.cracked = false; out.events.push({ type: 'plateRegrow', plates: V.plates }); }
    if (V.cd2 <= 0 && env.dist < cfg.shardR && !frozen) { V.cd2 = cfg.shardCd; out.events.push({ type: 'shards', x: env.self.x, z: env.self.z }); }
  }
  if (V.id === 'kiln' && !frozen) {
    if (V.cd2 <= 0 && env.dist < 14) { V.cd2 = cfg.lanceCd; out.events.push({ type: 'lance', x: env.self.x, z: env.self.z, tx: env.metal.x, tz: env.metal.z }); }
    if (V.t % cfg.zoneCd < dt && env.dist < 12) { V.zones.push({ x: env.metal.x, z: env.metal.z, t: 0 }); out.events.push({ type: 'hotZone', x: env.metal.x, z: env.metal.z }); }
  }
  if (V.id === 'kiln') { for (const z of V.zones) { z.t += dt; if (!z.out && Math.hypot(z.x - env.metal.x, z.z - env.metal.z) < cfg.zoneR) out.metalDmg += cfg.zoneDps * dt; } V.zones = V.zones.filter(z => z.t < cfg.zoneLife && !z.out); }
  if (V.id === 'echonail' && V.stored > 0) { V.storeT += dt; if (V.storeT >= cfg.delay) { const n = V.stored; V.stored = 0; V.storeT = 0; out.events.push({ type: 'echoBack', x: env.self.x, z: env.self.z, r: cfg.backR, n }); if (env.dist < cfg.backR) out.metalDmg += 0.05 * Math.min(4, n); } }
  if (V.id === 'ballast' && V.cd <= 0 && env.dist < cfg.slamR + 1.5 && !frozen) {
    V.cd = cfg.slamCd; out.events.push({ type: 'slam', x: env.self.x, z: env.self.z, r: cfg.slamR, warn: 0.6 });
  }
  if (V.id === 'slipline') {
    if (V.cd <= 0 && env.dist < 9 && !frozen) { V.cd = cfg.dashCd; V.dashing = cfg.dashT; V.charged = cfg.dashT + cfg.chargeT; out.events.push({ type: 'dash' }); V.slick.push({ x: env.self.x, z: env.self.z, t: 0 }); }
    if (V.t % 0.25 < dt) V.slick.push({ x: env.self.x, z: env.self.z, t: 0 });
    for (const s of V.slick) s.t += dt;
    V.slick = V.slick.filter(s => s.t < cfg.slickLife);
    out.slide = V.slick.some(s => Math.hypot(s.x - env.metal.x, s.z - env.metal.z) < cfg.slickR);
  }
  if (V.id === 'kiln') {
    V.heat = frozen ? 0 : Math.max(0, 1 - env.dist / cfg.heatR);
    out.metalDmg += cfg.heatDps * V.heat * dt;
  }
  if (V.id === 'echonail') {
    if (V.cd <= 0 && env.dist < 10 && !frozen) {
      V.cd = cfg.spikeCd;
      // spike lands where Metal is standing; the same impact repeats `delay` seconds later
      V.echoes.push({ x: env.metal.x, z: env.metal.z, t: 0, hit1: false, hit2: false });
      out.events.push({ type: 'spike', x: env.metal.x, z: env.metal.z });
    }
    for (const e of V.echoes) {
      e.t += dt;
      const inside = Math.hypot(e.x - env.metal.x, e.z - env.metal.z) < cfg.spikeR;
      if (!e.hit1 && e.t >= 0.45) { e.hit1 = true; if (inside) out.metalDmg += 0.08; out.events.push({ type: 'echoHit', first: true, x: e.x, z: e.z }); }
      if (!e.hit2 && e.t >= cfg.delay) { e.hit2 = true; if (inside) out.metalDmg += 0.14; out.events.push({ type: 'echoHit', first: false, x: e.x, z: e.z }); }
    }
    V.echoes = V.echoes.filter(e => !e.hit2 && !e.pulled);
  }
  return out;
}

// echo marks about to repeat (for the warning ring), seconds left
export function echoWarnings(V) {
  const cfg = VILLAINS.echonail; if (V.id !== 'echonail') return [];
  return V.echoes.filter(e => e.hit1 && cfg.delay - e.t < cfg.warn).map(e => ({ x: e.x, z: e.z, left: cfg.delay - e.t }));
}
// pull a spike out (stand on it and press E / interact) — the blueprint's "extract the spikes"
export function pullSpike(V, x, z, r = 1.2) {
  for (const e of V.echoes) if (!e.pulled && Math.hypot(e.x - x, e.z - z) < r) { e.pulled = true; return true; }
  return false;
}

// a Gallium glob landing on a Kiln hot zone puts it out
export function douseZone(V, x, z, r = 1.6) { let n = 0; for (const zn of V.zones || []) if (!zn.out && Math.hypot(zn.x - x, zn.z - z) < r + 1) { zn.out = true; n++; } return n; }
