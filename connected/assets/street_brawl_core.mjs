// STREET BRAWL — people on the street fight back once you swing on them. PROPOSAL / HOLD (2026-11-12)
// Nobody starts a fight on a button press. A bystander who sees a swing alarms; a swing that reaches them,
// or a second swing while they are alarmed, turns them into a fighter. Timing is borrowed from NGB's strike
// model (windup → impact → end; daze builds to a stun; body hits stagger). Each fighter carries one power.
// Pure state machine: main.js owns bodies, animation and damage. Nonlethal: a street fighter that is stunned
// long enough is put down (main.js) and can be restrained with Gallium Bind.

export const SB = {
  WITNESS_R: 6, ALARM_T: 3, FLEE_SPEED: 3.4, FIGHT_SPEED: 2.6, STRIKE_R: 1.7,
  WINDUP: 0.12, IMPACT: 0.25, END: 0.55, STRIKE_CD: 1.1, DAMAGE: 0.05,
  DAZE_PER_HIT: 18, DAZE_DECAY: 10, STUN_DAZE: 68, STUN_T: 1.5, STAGGER_T: 0.3,
  POWER_CD: 6, POWER_TELL: 0.6, POWER_MIN_R: 2.5, THROW_DAMAGE: 0.06,
  GUARD_T: 2, GUARD_MUL: 0.5, SURGE_T: 1, SURGE_MUL: 1.8,
};
// each street fighter gets one power; the role picks it so the crowd is not all identical
export const POWER_FOR = { vendor: 'guard', commuter: 'throw', brawler: 'surge', lookout: 'throw' };
export const FLEE_ROLES = new Set(['vendor', 'commuter']);

export function createStreet(id, role = 'commuter', flees = FLEE_ROLES.has(role)) {
  return { id, role, power: POWER_FOR[role] || 'surge', flees, state: 'walk', alarmT: 0,
    daze: 0, stun: 0, stagger: 0, cd: 0, strike: null, powerCd: SB.POWER_CD * 0.5,
    powerTell: null, guardT: 0, surgeT: 0, hits: 0 };
}

// Metal is close and swinging: bystanders alarm, and a swing at them turns them into a fighter.
export function witness(S, dist, swinging) {
  if (S.state === 'fight' || S.state === 'down') return null;
  if (dist > SB.WITNESS_R) return null;
  if (swinging && dist < SB.STRIKE_R + 0.6) return fight(S, 'swung on');
  if (S.state === 'walk') { S.state = 'alarm'; S.alarmT = 0; return { type: 'alarm', id: S.id }; }
  return null;
}

// a blow landed on them (heavy or body hits count for more)
export function hitStreet(S, { heavy = false, body = false } = {}) {
  S.hits++;
  if (S.state !== 'fight') fight(S, 'hit');
  S.daze += SB.DAZE_PER_HIT * (heavy ? 1.5 : 1);
  if (S.daze >= SB.STUN_DAZE) S.stun = Math.max(S.stun, SB.STUN_T);
  if (body) S.stagger = SB.STAGGER_T;
  return { stunned: S.stun > 0, hits: S.hits };
}

function fight(S, why) {
  if (S.state === 'fight') return null;
  S.state = 'fight'; S.cd = 0.3;
  return { type: 'fight', id: S.id, why };
}

// one frame. metalDist: metres to Metal. Returns { events[], move?:{x,z,speed}|null, anim }.
// move is a unit-free direction: { dir:{x,z}, speed }. main.js converts it to a position step.
export function stepStreet(S, dt, metalDist) {
  const out = { events: [], dir: null, speed: 0, anim: 'walk', strike: null, power: null };
  S.daze = Math.max(0, S.daze - SB.DAZE_DECAY * dt);
  S.stun = Math.max(0, S.stun - dt); S.stagger = Math.max(0, S.stagger - dt);
  S.guardT = Math.max(0, S.guardT - dt); S.surgeT = Math.max(0, S.surgeT - dt);
  S.cd = Math.max(0, S.cd - dt); S.powerCd = Math.max(0, S.powerCd - dt);
  if (S.state === 'walk') { out.anim = 'walk'; return out; }
  if (S.state === 'alarm') {
    S.alarmT += dt;
    if (S.flees) { out.dir = { x: 0, z: 0, away: true }; out.speed = SB.FLEE_SPEED; out.anim = 'run'; }
    else { out.anim = 'idle'; }
    if (S.alarmT > SB.ALARM_T) { S.state = 'walk'; out.events.push({ type: 'calm', id: S.id }); }
    return out;
  }
  if (S.state !== 'fight') { out.anim = 'idle'; return out; }
  if (S.stun > 0) { out.anim = 'stunned'; return out; }
  if (S.stagger > 0) { out.anim = 'stagger'; return out; }
  // close in, then strike on a fixed windup→impact→end cycle with a cooldown
  if (metalDist > SB.STRIKE_R && !S.strike) { out.dir = { toMetal: true }; out.speed = SB.FIGHT_SPEED; out.anim = 'walk'; }
  else { out.anim = 'guard'; }
  if (S.strike) {
    S.strike.t += dt; out.strike = 'windup';
    if (S.strike.t >= SB.IMPACT && !S.strike.landed) {
      S.strike.landed = true;
      if (metalDist <= SB.STRIKE_R) out.events.push({ type: 'impact', id: S.id, dmg: SB.DAMAGE });
      out.strike = 'impact';
    }
    if (S.strike.t >= SB.END) { S.strike = null; S.cd = SB.STRIKE_CD; out.strike = 'end'; }
  } else if (S.cd <= 0 && metalDist <= SB.STRIKE_R && !S.powerTell) {
    S.strike = { t: 0, landed: false }; out.strike = 'windup';
  }
  // power: telegraphed, then it happens; powers never start while a strike is in the air
  if (S.powerTell) {
    S.powerTell.t += dt; out.anim = 'guard';
    if (S.powerTell.t >= SB.POWER_TELL) { const p = S.power; S.powerTell = null; S.powerCd = SB.POWER_CD; out.power = p; out.events.push({ type: 'power', id: S.id, power: p });
      if (p === 'throw') out.events.push({ type: 'throw', id: S.id, dmg: SB.THROW_DAMAGE });
      if (p === 'guard') S.guardT = SB.GUARD_T;
      if (p === 'surge') S.surgeT = SB.SURGE_T; }
  } else if (S.powerCd <= 0 && !S.strike && metalDist > SB.POWER_MIN_R) {
    S.powerTell = { t: 0 }; out.power = 'tell';
  }
  return out;
}

// how the incoming blow is scaled by their current power (used by main.js hitFoe)
export function incomingMul(S) { return S.guardT > 0 ? SB.GUARD_MUL : 1; }
export function outgoingMul(S) { return S.surgeT > 0 ? SB.SURGE_MUL : 1; }
