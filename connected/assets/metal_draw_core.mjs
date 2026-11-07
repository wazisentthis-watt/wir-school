// METAL DRAW — PROPOSAL / PUBLISH HOLD (RB1 2026-11-06)
// "Everywhere you're standing, as long as you're near metal, you can draw it to you. The charge-up has to be better."
// Hold the draw input: every metal thing in range (cars, lamp posts, rails, coping, ReFramer scrap, puddles) streams
// matter into Metal's suit. Closer and heavier = faster. Each object holds a finite amount, so you move to keep charging.
// Pure: main.js supplies the source list and draws the streams.

export const DRAW = {
  RANGE: 14,          // m
  RATE: 0.55,         // Gallium per second at 1 m from a 1-mass source
  CAP_PER_S: 0.6,     // suit intake limit per second
  CHARGE_K: 1.4,      // e⁻ charge gained per Gallium drawn once the suit is full
  RESERVE: { car: 0.45, lamp: 0.22, rail: 0.3, coping: 0.25, scrap: 0.35, puddle: 1, sign: 0.15, building: 0.6 },
  MASS: { car: 1.6, lamp: 0.7, rail: 0.8, coping: 0.8, scrap: 1.2, puddle: 2, sign: 0.4, building: 1.1 },
  RAMP: 0.45,         // seconds to reach full pull (the drag builds up)
};

export function createDraw() { return { held: 0, total: 0, chargeGain: 0, streams: [] }; }

// sources: [{id, kind, x, y, z, reserve (optional, mutated)}]; returns { gal, charge, streams:[{src, amount, d}] }
export function stepDraw(D, holding, pos, sources, gal, dt) {
  D.streams = [];
  if (!holding) { D.held = 0; return { gal: 0, charge: 0, streams: D.streams }; }
  D.held += dt;
  const ramp = Math.min(1, D.held / DRAW.RAMP);
  let want = 0;
  const cands = [];
  for (const s of sources) {
    if (s.reserve == null) s.reserve = DRAW.RESERVE[s.kind] ?? 0.2;
    if (s.reserve <= 0) continue;
    const d = Math.hypot(s.x - pos.x, (s.y ?? pos.y) - pos.y, s.z - pos.z);
    if (d > DRAW.RANGE) continue;
    const pull = DRAW.RATE * (DRAW.MASS[s.kind] ?? 0.6) / Math.max(1, d * d * 0.18 + 1) * ramp;
    cands.push({ s, d, pull }); want += pull;
  }
  const cap = DRAW.CAP_PER_S * dt, scale = want * dt > cap ? cap / (want * dt) : 1;
  let got = 0;
  for (const c of cands) {
    const a = Math.min(c.s.reserve, c.pull * dt * scale);
    c.s.reserve -= a; got += a;
    D.streams.push({ src: c.s, amount: a, d: c.d });
  }
  const room = Math.max(0, 1 - gal), toGal = Math.min(room, got), over = got - toGal;
  D.total += got; D.chargeGain += over * DRAW.CHARGE_K;
  return { gal: toGal, charge: over * DRAW.CHARGE_K, streams: D.streams };
}
