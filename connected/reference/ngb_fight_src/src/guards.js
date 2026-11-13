// Guard styles — the real shells of the sweet science. Each is a different place for the hands (so the glove/forearm
// collision blocks different shots on its own) plus the craft that goes with it (what rolls off, what gets through).
// With the camera, YOUR hand positions pick the style; with a controller, the style is what your full guard becomes.
import * as THREE from 'three';

export const GUARDS = {
  high:   { name: 'HIGH GUARD',  who: '',               key: 'HIGH',   desc: 'Both gloves at the temples. Solid all-round, no tricks.' },
  peek:   { name: 'PEEK-A-BOO',  who: "Cus D'Amato",    key: 'PEEK',   desc: 'Gloves on the cheekbones, elbows on the ribs. Head movement is quicker, slips load a counter, elbows eat body hooks. Uppercuts split the gloves.' },
  philly: { name: 'PHILLY SHELL', who: 'George Benton',  key: 'PHILLY', desc: 'Lead arm across the belly, rear glove on the chin, lead shoulder up. Straights and hooks on the lead side roll off the shoulder into a counter. Hooks over the rear side get in.' },
  long:   { name: 'LONG GUARD',  who: 'George Foreman', key: 'LONG',   desc: 'Lead arm out, open glove in his face. Smothers his straights before they start. The body is open underneath.' },
  cross:  { name: 'CROSS-ARM',   who: 'Archie Moore',   key: 'CROSS',  desc: 'Forearms stacked across face and chest. Straights die on the arms and you recover stamina in it. Uppercuts come up the middle, hooks around the side.' },
};
export const GUARD_ORDER = ['high', 'peek', 'philly', 'long', 'cross'];
// the fighters' own shells
export const ROSTER_GUARD = { savannah: 'philly', graham: 'cross', pop: 'long', skillet: 'peek' };

export const leadHand = f => (f.stance === 'southpaw' ? 1 : 0);
// is a style actually up right now (not just selected)?
export function activeGuard(f) {
  if (f.camStyle && f.camBody && f.camBody.own[0] > 0.5 && f.camBody.own[1] > 0.5) return f.camStyle; // the camera sees it on your body
  const st = f.guardStyle || 'high'; if (st === 'high') return 'high';
  const both = f.handGuardAmt ? Math.min(f.handGuardAmt[0], f.handGuardAmt[1]) : 0;
  return Math.max(f.guardHigh || 0, both) > 0.45 ? st : 'high';
}

// hand target relative to the head centre in the fighter's frame (x = own left, y up, z forward), and the elbow pole
// relative to the shoulder. s = +1 for the left hand, −1 for the right.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export function guardPose(style, hi, lead) {
  const s = hi === 0 ? 1 : -1, isLead = hi === lead;
  switch (style) {
    case 'peek': return { off: V(-0.01 * s, -0.07, 0.15), pole: V(0.06 * s, -0.5, 0.22) };
    case 'philly': return isLead ? { off: V(-0.06 * s, -0.5, 0.2), pole: V(0.22 * s, -0.25, 0.02) } : { off: V(0.02 * s, -0.11, 0.12), pole: V(0.2 * s, -0.42, 0.12) };
    case 'long': return isLead ? { off: V(0.03 * s, -0.08, 0.47), pole: V(0.2 * s, -0.3, 0.1) } : { off: V(0.05 * s, -0.08, 0.13), pole: V(0.22 * s, -0.4, 0.1) };
    case 'cross': return isLead ? { off: V(-0.13 * s, -0.33, 0.22), pole: V(0.38 * s, -0.12, 0.14) } : { off: V(-0.11 * s, -0.1, 0.19), pole: V(0.36 * s, -0.05, 0.14) };
    default: return { off: V(0.075 * s, -0.03, 0.16), pole: V(0.26 * s, -0.32, 0.12) };
  }
}

// the craft: a clean hit that got past the arms, shaped by the shell it went into. Returns the damage multiplier.
// side = which side of the defender's face/body the punch lands on (0 = their left).
export function guardHit(def, att, d, part, side, tags) {
  const st = activeGuard(def); if (st === 'high') return 1;
  const leadSide = leadHand(def) === 0 ? 0 : 1, onLead = side === leadSide, head = part === 'head';
  switch (st) {
    case 'peek':
      if (head && d.path === 'upper') { tags.push('SPLIT THE PEEK-A-BOO'); return 1.25; }
      if (!head && (d.path === 'body' || d.path === 'hook')) { tags.push('ELBOW BLOCK'); return 0.55; }
      if (head && d.path === 'straight') return 0.85;
      return 1;
    case 'philly':
      if (head && onLead && (d.path === 'straight' || d.path === 'hook' || d.path === 'over')) { tags.push('SHOULDER ROLL'); def.counterWindow = Math.max(def.counterWindow || 0, 0.6); return 0.25; }
      if (!head && onLead) { tags.push('LEAD ARM CATCHES IT'); return 0.5; }
      if (head && !onLead && d.path === 'hook') { tags.push('OVER THE SHELL'); return 1.15; }
      return 1;
    case 'long':
      if (head && d.path === 'straight') { tags.push('SMOTHERED'); return 0.55; }
      if (!head) { tags.push('UNDER THE LONG ARM'); return 1.2; }
      return 1;
    case 'cross':
      if (d.path === 'straight' || d.path === 'over') { tags.push('ON THE CROSSED ARMS'); return head ? 0.3 : 0.5; }
      if (head && d.path === 'upper') { tags.push('UP THE MIDDLE'); return 1.25; }
      if (head && d.path === 'hook') return 1.1;
      return 1;
  }
  return 1;
}
// which shots beat a shell (the AI reads your guard)
export const BEATS = {
  peek: [['upper', 'crossR'], ['jabL', 'upper'], ['upper', 'hookL']],
  philly: [['hookL', 'hookL'], ['jabL', 'hookL'], ['bodyR', 'hookL']],
  long: [['bodyL', 'bodyR'], ['bodyR', 'hookL'], ['jabL', 'bodyR']],
  cross: [['upper', 'hookL'], ['hookR', 'upper'], ['upper', 'upper']],
};
