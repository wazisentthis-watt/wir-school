// REFRAMER POWERS — physical logic only. PROPOSAL / HOLD (2026-11-13, from the owner's ReFramer powers doc).
// ReFramers do not cast spells. Every ability answers the three questions in the doc:
//   1. what material / energy makes it possible   2. what it costs   3. how the player can counter it
// Pure state machine: main.js owns bodies, hits and VFX. Implemented here: Kinetic Storage (slam),
// Component Theft and Mechanical Regeneration (both need parts, so they cost reserve).
export const RP = {
  STORE_PER_HIT: .25, STORE_MAX: 1, STORE_DECAY: .04,           // kinetic storage: energy from being hit
  SLAM_MIN: .5, SLAM_R: 7, SLAM_WINDUP: .9, SLAM_DMG: .1,        // slam: needs charge, telegraphed, cancelled by a hit
  AIR_MUL: .5,                                                    // jumping during the slam halves it
  THEFT_T: 6, THEFT_SPEED_MUL: 1.35, THEFT_ARMOR_MUL: .7, THEFT_COST: .12,
  REGEN_T: 2.5, REGEN_COST: .18,                                  // regen: a traffic-pole part, 2.5 s, broken by a hit
};
// ability -> class, from the doc's class table
export const CLASS_OF = { slam: 'Guardian', theft: 'Dismantler', regen: 'Guardian' };

export function createPowers() {
  return { store: 0, slam: null, theft: null, regen: null, lastStolen: null };
}

// Energy comes from being hit (the doc: absorb movement energy, release it later).
export function absorb(P, amount = RP.STORE_PER_HIT) {
  P.store = Math.min(RP.STORE_MAX, P.store + Math.max(0, amount));
  return { type: 'stored', store: P.store };
}

// A hit on the ReFramer during its slam windup cancels the slam: the counter the doc asks for.
export function interrupt(P) {
  if (!P.slam) return null;
  P.slam = null;
  return { type: 'slam-cancelled' };
}

// Start a theft: a part leaves another machine and visibly changes the ReFramer (speed or armour).
export function steal(P, kind, reserve) {
  if (P.theft) return null;
  if (reserve < RP.THEFT_COST) return { type: 'no-parts', need: RP.THEFT_COST };
  P.theft = { kind, t: 0 }; P.lastStolen = kind;
  return { type: 'stolen', kind, cost: RP.THEFT_COST };
}

// Metal's pull (gallium) counters a theft: the part goes back to its machine.
export function counterSteal(P) {
  if (!P.theft) return null;
  const kind = P.theft.kind; P.theft = null;
  return { type: 'part-returned', kind };
}

export function startRegen(P, arm, reserve) {
  if (P.regen) return null;
  if (reserve < RP.REGEN_COST) return { type: 'no-parts', need: RP.REGEN_COST };
  P.regen = { arm, t: 0 };
  return { type: 'regen-start', arm, cost: RP.REGEN_COST };
}

// Metal hitting the arm that is being rebuilt breaks the repair.
export function breakRegen(P) {
  if (!P.regen) return null;
  const arm = P.regen.arm; P.regen = null;
  return { type: 'regen-broken', arm };
}

// Per-frame. ctx: { dist (to Metal), airborne, metalPulling, reserve }.
export function stepPowers(P, dt, ctx = {}) {
  const ev = [];
  P.store = Math.max(0, P.store - RP.STORE_DECAY * dt);
  if (P.theft) {
    P.theft.t += dt;
    if (ctx.metalPulling) { const r = counterSteal(P); if (r) ev.push(r); }
    else if (P.theft.t >= RP.THEFT_T) { ev.push({ type: 'theft-over', kind: P.theft.kind }); P.theft = null; }
  }
  if (P.regen) {
    P.regen.t += dt;
    if (P.regen.t >= RP.REGEN_T) { ev.push({ type: 'regen-done', arm: P.regen.arm }); P.regen = null; }
  }
  if (P.slam) {
    P.slam.t += dt;
    if (P.slam.t >= RP.SLAM_WINDUP) {
      const dmg = RP.SLAM_DMG * P.store * (ctx.airborne ? RP.AIR_MUL : 1);
      ev.push({ type: 'slam', dmg, radius: RP.SLAM_R, charge: P.store });
      P.store = 0; P.slam = null;
    }
  } else if (P.store >= RP.SLAM_MIN && typeof ctx.dist === 'number' && ctx.dist <= RP.SLAM_R) {
    P.slam = { t: 0 };
    ev.push({ type: 'slam-tell', charge: P.store, windup: RP.SLAM_WINDUP });
  }
  return ev;
}

// Speed and armour the ReFramer currently has from a theft.
export function theftSpeedMul(P) { return P.theft && P.theft.kind === 'wheel' ? RP.THEFT_SPEED_MUL : 1; }
export function theftArmorMul(P) { return P.theft && P.theft.kind === 'armor' ? RP.THEFT_ARMOR_MUL : 1; }
