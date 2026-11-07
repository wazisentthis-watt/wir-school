// GALAXY GALLIUM KIT v1 — PROPOSAL / PUBLISH HOLD (owner direction 2026-11-06)
// Galaxy Gallium is finite liquid metal, heated and cooled with particles from the vacuum of space: liquid while Metal
// shapes it, it sets into black galaxy crystal when it cools. Nothing is created or destroyed — it moves between Metal's
// reserve (st.gal 0..1), the board, things in his hand, and puddles on the ground (which stay until he pulls them back).
//   B tap  : board lost nearby → recall it · board gone / too far → forge a new one (the far one melts where it lies)
//   B hold : melt what he's holding (sword / shield) → puddle · else the board (under him or where it lies) → puddle
//   L2+R2  : PULL — liquid metal streams in from the world, the Star Merkaba spins up around him, purple plasma arcs
//            + X sword · + B shield · + Y plasma blast (scales with charge) · a full pull = Heavy Hands for a while
// Pure: main.js owns meshes, input and physics.

export const KIT = {
  RECALL_R: 45, HOLD_B: 0.55, BOARD: 0.08,          // board material (= FORGE_COST, conserved)
  SWORD: 0.12, SHIELD: 0.15, SHIELD_HITS: 5, SHIELD_BLOCK: 0.15,
  CHARGE_RATE: 0.32, CHARGE_GAL_K: 2.2, CHARGE_DECAY: 0.5, ARCS_AT: 0.35,
  BLAST_MIN: 0.25, BLAST_COST: 0.14, HEAVY_AT: 0.85, HEAVY_T: 8,
  SWORD_MOD: { dmg: 1.6, kb: 1.2, reach: 1.1 }, HEAVY_MOD: { dmg: 1.5, kb: 1.8 },
  PUDDLE_MERGE: 1.0, PUDDLE_CAP: 40,
};

export function createKit() { return { hand: null, handCost: 0, handHits: 0, charge: 0, pulling: false, heavyT: 0, heavyUsed: false, puddles: [] }; }

// what B does. ctx: { hold, riding, fight, loose:{x,z}|null, metal:{x,z}, gal }
export function bAction(K, ctx) {
  if (ctx.fight && !ctx.hold) return { act: 'dodge' };
  if (!ctx.hold) {
    if (ctx.riding) return { act: 'brake' };
    if (ctx.loose) {
      const d = Math.hypot(ctx.loose.x - ctx.metal.x, ctx.loose.z - ctx.metal.z);
      if (d <= KIT.RECALL_R) return { act: 'recall', d };
      return ctx.gal >= KIT.BOARD ? { act: 'forgeFar', meltAt: { ...ctx.loose } } : { act: 'noMaterial' };
    }
    return ctx.gal >= KIT.BOARD ? { act: 'forge' } : { act: 'noMaterial' };
  }
  if (K.hand) return { act: 'meltHand', kind: K.hand };
  if (ctx.riding) return { act: 'dismantleBoard' };
  if (ctx.loose && Math.hypot(ctx.loose.x - ctx.metal.x, ctx.loose.z - ctx.metal.z) <= KIT.RECALL_R) return { act: 'dismantleLoose' };
  return { act: 'none' };
}

// puddles: material is conserved; nearby puddles merge; the count is capped by merging the smallest
export function addPuddle(K, x, y, z, amount) {
  if (amount <= 0) return null;
  const near = K.puddles.find(p => Math.hypot(p.x - x, p.z - z) < KIT.PUDDLE_MERGE);
  if (near) { near.amount += amount; return near; }
  const p = { id: 'pd' + Math.random().toString(36).slice(2, 8), x, y, z, amount };
  K.puddles.push(p);
  while (K.puddles.length > KIT.PUDDLE_CAP) {
    K.puddles.sort((a, b) => a.amount - b.amount); const s = K.puddles.shift();
    const t = K.puddles.reduce((b, q) => (!b || Math.hypot(q.x - s.x, q.z - s.z) < Math.hypot(b.x - s.x, b.z - s.z)) ? q : b, null); t.amount += s.amount;
  }
  return p;
}
export function takeFromPuddle(K, id, amt) { const p = K.puddles.find(q => q.id === id); if (!p) return 0; const got = Math.min(amt, p.amount); p.amount -= got; if (p.amount <= 1e-4) K.puddles.splice(K.puddles.indexOf(p), 1); return got; }
export function puddleTotal(K) { return K.puddles.reduce((a, p) => a + p.amount, 0); }

// L2+R2 held on foot. got = Gallium drawn this frame. Returns what to show.
export function pullStep(K, { l2, r2, onFoot }, got, dt) {
  const was = K.pulling; K.pulling = !!(l2 && r2 && onFoot);
  const ev = [];
  if (K.pulling) { K.charge = Math.min(1, K.charge + KIT.CHARGE_RATE * dt + got * KIT.CHARGE_GAL_K); if (!was) ev.push('pullStart'); }
  else { if (was) { ev.push('pullEnd'); if (K.charge >= KIT.HEAVY_AT && !K.heavyUsed) { K.heavyT = KIT.HEAVY_T; ev.push('heavy'); } K.heavyUsed = false; } K.charge = Math.max(0, K.charge - KIT.CHARGE_DECAY * dt); }
  K.heavyT = Math.max(0, K.heavyT - dt);
  return { pulling: K.pulling, merkaba: K.charge, arcs: K.charge >= KIT.ARCS_AT, ev };
}

// shape something in the hand while pulling: returns cost taken from the reserve (a swap melts the old one back first)
export function form(K, kind, gal) {
  if (!K.pulling) return { ok: false, why: 'pull' };
  const cost = kind === 'sword' ? KIT.SWORD : KIT.SHIELD;
  const refund = K.hand ? K.handCost : 0;
  if (K.hand === kind) return { ok: false, why: 'same' };
  if (gal + refund < cost) return { ok: false, why: 'material' };
  K.hand = kind; K.handCost = cost; K.handHits = kind === 'shield' ? KIT.SHIELD_HITS : 0;
  return { ok: true, kind, cost, refund, net: cost - refund };
}
export function meltHand(K) { if (!K.hand) return null; const r = { kind: K.hand, amount: K.handCost }; K.hand = null; K.handCost = 0; K.handHits = 0; return r; }

// Y while pulling: liquid-metal plasma blast, power = charge
export function blast(K, gal) {
  if (!K.pulling || K.charge < KIT.BLAST_MIN) return { ok: false, why: 'charge' };
  const cost = KIT.BLAST_COST * K.charge; if (gal < cost) return { ok: false, why: 'material' };
  const power = K.charge; K.charge = 0; K.heavyUsed = true; return { ok: true, power, cost };
}

// incoming hit on Metal: a raised shield in front takes most of it and wears down; when it breaks it falls as a puddle
export function shieldHit(K, dmg, frontal) {
  if (K.hand !== 'shield' || !frontal) return { dmg, blocked: false };
  K.handHits--; const out = { dmg: dmg * KIT.SHIELD_BLOCK, blocked: true };
  if (K.handHits <= 0) { out.broke = meltHand(K); }
  return out;
}
export function strikeMods(K) {
  let dmg = 1, kb = 1, reach = 0;
  if (K.hand === 'sword') { dmg *= KIT.SWORD_MOD.dmg; kb *= KIT.SWORD_MOD.kb; reach += KIT.SWORD_MOD.reach; }
  if (K.heavyT > 0) { dmg *= KIT.HEAVY_MOD.dmg; kb *= KIT.HEAVY_MOD.kb; }
  return { dmg, kb, reach };
}
export function serializePuddles(K) { return JSON.stringify(K.puddles.map(p => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.amount.toFixed(4)])); }
export function loadPuddles(K, txt) { try { const a = JSON.parse(txt); if (!Array.isArray(a)) return 0; K.puddles = []; for (const [x, y, z, m] of a) if ([x, y, z, m].every(Number.isFinite) && m > 0) addPuddle(K, x, y, z, m); return K.puddles.length; } catch (e) { return 0; } }
