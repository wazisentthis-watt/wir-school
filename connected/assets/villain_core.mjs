// MORROW VILLAINS — PROPOSAL / PUBLISH HOLD
// Signature rules for the Season One villains from the owner's free-roam mission blueprint (2026-11-06).
// Pure module: the main game draws the effects and owns the fighters.
//   Ballast   — armored heavy. Front hits barely land; the environment (globs, cars, slams) cracks him.
//   Slipline  — dashes in slides and leaves slick lanes that make you slide too.
//   Glassjaw  — "strong is not tough": fake reinforcement plates absorb hits until they crack, then he folds.
//   Kiln      — heat aura that cooks you up close; Gallium globs cool him and he seizes up.
//   Echo Nail — drives spikes that repeat the impact seven seconds later. Move people (and yourself) off the marks.

export const VILLAINS = {
  ballast:  { name: 'Ballast',   ep: 1, color: 0x6b5a3c, h: 2.25, frontMul: 0.25, envMul: 1.8, slamR: 4.2, slamCd: 6 },
  slipline: { name: 'Slipline',  ep: 2, color: 0x2e8fb0, h: 1.78, dashCd: 3.2, slickLife: 6, slickR: 1.1 },
  glassjaw: { name: 'Glassjaw',  ep: 3, color: 0x9fb8c8, h: 1.95, plates: 4 },
  kiln:     { name: 'Kiln',      ep: 4, color: 0xd8561e, h: 1.9, heatR: 3.4, heatDps: 0.06, coolT: 2.4 },
  echonail: { name: 'Echo Nail', ep: 5, color: 0x5e3a8c, h: 1.82, delay: 7, spikeCd: 3.5, spikeR: 1.6, warn: 1.5 },
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
  if (id === 'glassjaw') {
    if (V.plates > 0) { V.plates--; V.cracked = V.plates === 0; return 0.05; }
    return 1.6; // once the fake reinforcement is gone he folds
  }
  if (id === 'kiln' && (src === 'glob')) { V.cool = cfg.coolT; return 1.4; }
  return 1;
}

export function createVillainState(id) {
  const cfg = VILLAINS[id] || {};
  return { id, t: 0, cd: 2, plates: cfg.plates || 0, cracked: false, cool: 0, slick: [], echoes: [], heat: 0 };
}

// per-frame ability step. env: { dist (to Metal), metal:{x,z}, self:{x,z}, active }
// returns { metalDmg, slide (bool: Metal on a slick lane), events:[] }
export function stepVillain(V, env, dt) {
  const cfg = VILLAINS[V.id], out = { metalDmg: 0, slide: false, events: [] };
  if (!cfg || !env.active) return out;
  V.t += dt; V.cd -= dt; if (V.cool > 0) V.cool -= dt;
  const frozen = V.cool > 0;
  if (V.id === 'ballast' && V.cd <= 0 && env.dist < cfg.slamR + 1.5 && !frozen) {
    V.cd = cfg.slamCd; out.events.push({ type: 'slam', x: env.self.x, z: env.self.z, r: cfg.slamR, warn: 0.6 });
  }
  if (V.id === 'slipline') {
    if (V.cd <= 0 && env.dist < 9 && !frozen) { V.cd = cfg.dashCd; out.events.push({ type: 'dash' }); V.slick.push({ x: env.self.x, z: env.self.z, t: 0 }); }
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
