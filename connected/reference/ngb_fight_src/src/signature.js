// Signature moves — the greats' tricks, earned by DOING them (camera body, controller or AI alike), never by a hotkey:
//  · CHECK HOOK (Mayweather): lead hook thrown while you pivot, or as he walks in on you
//  · ON THE ANGLE (Lomachenko): land from outside his line of sight after stepping/pivoting off the centre
//  · DEMPSEY ROLL: hook loaded from a roll / from the side your head just weaved to
//  · SUGAR RAY SYMPHONY: alternating hands landing in rhythm — every shot in the run hits harder
//  · ROPE-A-DOPE (Ali): back on the ropes, guard up, let him punch himself tired — then the right hand off the ropes
import { RING } from './arena.js';
import { leadHand } from './guards.js';

export const SIGNATURES = [
  ['CHECK HOOK · Mayweather', 'Throw your LEAD hook while you pivot (camera: turn on your front foot; pad: hold X/Y) or right as he rushes in. +35%, knocks him off balance.'],
  ['ON THE ANGLE · Lomachenko', 'Step or pivot off his centre line so he is not square to you, then land. +20% — he never saw it.'],
  ['DEMPSEY ROLL', 'Weave or roll to one side and throw the hook from that side as you come through. +30%; the figure-8 chains it.'],
  ['SUGAR RAY SYMPHONY', 'Land alternating hands in rhythm (each within ~0.75 s). From the 3rd shot every punch hits harder; the 5th rocks him.'],
  ['ROPE-A-DOPE · Ali', 'Back on the ropes with your guard up: the ropes soak 40% and every shot he throws costs him extra. After 3, your rear straight off the ropes hits +50%.'],
];
const guardUp = f => Math.max(f.guardHigh || 0, f.guardLow || 0, f.handGuardAmt ? Math.min(f.handGuardAmt[0], f.handGuardAmt[1]) : 0) > 0.45 || !!(f.intent && f.intent.handGuard && f.intent.handGuard[0] && f.intent.handGuard[1]);
export const onRopes = f => Math.max(Math.abs(f.pos.x), Math.abs(f.pos.z)) > RING - 0.5;

export function sigState(f) { return f.sig || (f.sig = { chain: 0, chainT: -9, chainHi: -1, ropeN: 0, ropeArm: -9 }); }

// a blocked shot (full or partial) on the ropes still counts for the rope-a-dope
export function sigBlocked(g, att, def) {
  if (!onRopes(def) || !guardUp(def) || def.strike) return; const D = sigState(def);
  att.stamina = Math.max(0, att.stamina - 2.5); D.ropeN++; if (D.ropeN >= 3) { D.ropeArm = g.time + 1.6; if (def === g.player && D.ropeN === 3) g.hitInfo('ROPE-A-DOPE — HE\'S PUNCHING HIMSELF OUT', '#00e5ff'); }
}

// clean hit: returns the damage multiplier, pushes the tags
export function sigHit(g, att, def, s, part, tags) {
  const d = s.def, A = sigState(att), D = sigState(def), lead = leadHand(att); let k = 1;
  // ROPE-A-DOPE: defender on the ropes, guard up, not punching — the ropes soak it, the puncher pays
  if (onRopes(def) && guardUp(def) && !def.strike) { k *= 0.6; att.stamina = Math.max(0, att.stamina - 2.5); D.ropeN++; if (D.ropeN >= 3) D.ropeArm = g.time + 1.6; tags.push('ROPE-A-DOPE'); }
  // ...and the payback: rear straight off the ropes while it's armed
  if (A.ropeArm > g.time && d.path === 'straight' && s.hi !== lead) { k *= 1.5; A.ropeArm = -9; A.ropeN = 0; def.daze += 8; tags.push('OFF THE ROPES'); }
  if (!onRopes(att) && A.ropeN && g.time > A.ropeArm) A.ropeN = 0;
  // CHECK HOOK: lead hook while pivoting, or into a man walking in
  const closing = -def.vel.dot(att.forward);
  if (d.path === 'hook' && s.hi === lead && (g.time - (att.lastPivotT ?? -9) < 0.4 || closing > 0.6)) { k *= 1.35; def.offBalance = Math.max(def.offBalance || 0, 0.45); tags.push('CHECK HOOK'); }
  // DEMPSEY ROLL: hook loaded by a roll, or from the side the head just weaved to
  else if (d.path === 'hook' && (att.roll || g.time - (att.lastRollT ?? -9) < 0.4 || (s.hi === 0 ? att.weaveX > 0.3 : att.weaveX < -0.3))) { k *= 1.3; tags.push('DEMPSEY ROLL'); }
  // ON THE ANGLE: he isn't square to you
  const to = att.pos.clone().sub(def.pos); to.y = 0; const fw = def.forward.clone(); fw.y = 0;
  if (to.lengthSq() > 1e-4 && fw.lengthSq() > 1e-4) { const ang = Math.acos(Math.max(-1, Math.min(1, to.normalize().dot(fw.normalize())))); if (ang > 0.55) { k *= 1.2; tags.push('ON THE ANGLE'); } }
  // SUGAR RAY: alternating hands landing in rhythm
  if (g.time - A.chainT < 0.75 && s.hi !== A.chainHi) A.chain = Math.min(6, A.chain + 1); else A.chain = 1;
  A.chainT = g.time; A.chainHi = s.hi;
  if (A.chain >= 3) { k *= 1 + 0.1 * (A.chain - 2); if (A.chain >= 4) tags.push('SUGAR RAY ×' + A.chain); if (A.chain === 5) def.daze += 10; }
  return k;
}
