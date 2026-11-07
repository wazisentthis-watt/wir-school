// GALLIUM GALLOP — PROPOSAL / PUBLISH HOLD (2026-11-07)
// Canon (S1E9, ARC L414-420): THOOM-tik strides — compress, anchor, release across road, wall, pipe brace, tram side.
// Every stride lands on all four wheels. A stride needs a foothold (ground or rail), never a mid-air step.
// On-beat strides chain; a hard direction change breaks the rhythm and costs more. Costs Galaxy Gallium.
// Connected rule (Galaxy Gallium is finite and conserved): the Gallium a stride spends is the anchor it leaves behind —
// main.js drops it as a puddle at the foothold, and Metal can pull it back with L2+R2.
// Game timing and numbers are PROPOSAL. Pure: main.js owns the ride, meshes and input.

export const GALLOP = {
  COST: 0.03, TURN_COST: 1.5, TURN_BREAK: 0.85,   // stick lean past this = hard turn
  COMPRESS_T: 0.12,                               // THOOM: load before the release
  BEAT0: 0.1, BEAT1: 0.6,                         // tik → next press inside this window = on beat
  DV: 2.0, DV_BEAT: 1.2, CHAIN_MAX: 8, HOP_VY: 2.6, STEER: 0.35,
};

export function createGallop() {
  return { phase: 'idle', t: 0, now: 0, chain: 0, landedAt: null, strides: 0, spent: 0, pend: null, best: 0 };
}

// ctx: { mode: 'ground'|'grind'|'air', gal, lean (-1..1, stick) }
export function press(G, ctx) {
  if (ctx.mode === 'air') return { ok: false, why: 'air' };          // never a mid-air step
  if (G.phase !== 'idle') return { ok: false, why: 'busy' };
  const lean = Math.max(-1, Math.min(1, ctx.lean || 0)), turnBreak = Math.abs(lean) > GALLOP.TURN_BREAK;
  const since = G.landedAt == null ? Infinity : G.now - G.landedAt;
  const onBeat = !turnBreak && G.chain > 0 && since >= GALLOP.BEAT0 && since <= GALLOP.BEAT1;
  const cost = GALLOP.COST * (turnBreak ? GALLOP.TURN_COST : 1);
  if ((ctx.gal || 0) + 1e-9 < cost) { G.chain = 0; return { ok: false, why: 'material', cost }; }
  if (!onBeat) G.chain = 0;
  G.phase = 'compress'; G.t = 0; G.pend = { onBeat, turnBreak, cost, steer: lean * GALLOP.STEER };
  return { ok: true, cost, onBeat, turnBreak };
}

// advance the clock. mode = the ride's current mode. Returns null | {type:'compress',k} | {type:'release',…} | {type:'cancel'}
export function step(G, dt, mode) {
  G.now += dt;
  if (G.phase !== 'compress') return null;
  G.t += dt;
  if (mode === 'air') { G.phase = 'idle'; G.pend = null; G.chain = 0; return { type: 'cancel' }; } // rolled off mid-load: nothing spent
  if (G.t < GALLOP.COMPRESS_T) return { type: 'compress', k: G.t / GALLOP.COMPRESS_T };
  const p = G.pend; G.pend = null; G.phase = 'stride';
  G.chain = Math.min(GALLOP.CHAIN_MAX, G.chain + 1); G.best = Math.max(G.best, G.chain); G.strides++; G.spent += p.cost;
  const dv = GALLOP.DV + (p.onBeat ? GALLOP.DV_BEAT * Math.min(G.chain, 4) / 4 : 0);
  return { type: 'release', dv, vy: GALLOP.HOP_VY, steer: p.steer, cost: p.cost, onBeat: p.onBeat, turnBreak: p.turnBreak, chain: G.chain };
}

// the ride reports the landing of a stride. ok=false (bail) breaks the chain.
export function landed(G, ok = true) {
  if (G.phase !== 'stride') return null;
  G.phase = 'idle'; G.landedAt = G.now; if (!ok) G.chain = 0;
  return { type: 'tik', chain: G.chain, ok };
}
export function breakChain(G) { G.chain = 0; if (G.phase === 'stride') G.phase = 'idle'; }

// speed after a release (signed speed in, signed speed out, capped at top)
export function strideSpeed(speed, dv, top) {
  const s = Math.sign(speed) || 1; return s * Math.min(top, Math.abs(speed) + dv);
}
