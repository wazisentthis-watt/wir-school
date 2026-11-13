// Strike definitions + collision helpers.
import * as THREE from 'three';

// times in seconds (at speed 1). impact = when the glove should arrive.
export const STRIKES = {
  jabL:   { key: '7', label: 'Left Jab',      hand: 'L', path: 'straight', target: 'head', clip: 'jabL',   clipT: 0.40, windup: 0.07, impact: 0.19, end: 0.40, power: 2.4, stam: 3.0, twist: -0.20, lunge: 0.20, drop: 0.00, lean: 0.06 },
  crossR: { key: '9', label: 'Right Straight', hand: 'R', path: 'straight', target: 'head', clip: 'crossR', clipT: 0.38, windup: 0.09, impact: 0.26, end: 0.55, power: 4.3,  stam: 6.0, twist: 0.55, lunge: 0.16, drop: 0.02, lean: 0.10 },
  hookL:  { key: '4', label: 'Left Hook',     hand: 'L', path: 'hook',     target: 'head', clip: null,     windup: 0.11, impact: 0.28, end: 0.58, power: 5.2,  stam: 7.0, twist: -0.85, lunge: 0.14, drop: 0.03, lean: 0.04 },
  hookR:  { key: '6', label: 'Right Hook',    hand: 'R', path: 'hook',     target: 'head', clip: null,     windup: 0.13, impact: 0.31, end: 0.62, power: 5.8, stam: 8.0, twist: 0.85, lunge: 0.14, drop: 0.03, lean: 0.04 },
  upperR: { key: '5', label: 'Right Uppercut', hand: 'R', path: 'upper',   target: 'head', clip: null,     windup: 0.15, impact: 0.33, end: 0.66, power: 6.5,  stam: 9.0, twist: 0.55, lunge: 0.10, drop: 0.10, lean: -0.05, rise: true },
  upperL: { key: '5', label: 'Left Uppercut', hand: 'L', path: 'upper',    target: 'head', clip: null,     windup: 0.14, impact: 0.31, end: 0.62, power: 5.8,  stam: 8.0, twist: -0.5, lunge: 0.08, drop: 0.09, lean: -0.05, rise: true },
  bodyL:  { key: '1', label: 'Left Body',     hand: 'L', path: 'body',     target: 'body', clip: null,     windup: 0.10, impact: 0.27, end: 0.56, power: 3.7, stam: 5.5, twist: -0.6, lunge: 0.10, drop: 0.16, lean: 0.20, bodyHit: true },
  bodyR:  { key: '3', label: 'Right Body',    hand: 'R', path: 'body',     target: 'body', clip: 'bodyR',  clipT: 0.55, windup: 0.12, impact: 0.30, end: 0.62, power: 4.5, stam: 6.5, twist: 0.7, lunge: 0.10, drop: 0.17, lean: 0.22, bodyHit: true },
  overL:   { key: '',  label: 'Left Overhand',  hand: 'L', path: 'over',     target: 'head', clip: null,     windup: 0.15, impact: 0.34, end: 0.66, power: 6.0, stam: 8.0, twist: -0.8, lunge: 0.18, drop: 0.06, lean: 0.16 },
  overR:   { key: '',  label: 'Right Overhand', hand: 'R', path: 'over',     target: 'head', clip: null,     windup: 0.17, impact: 0.37, end: 0.72, power: 7.4, stam: 9.5, twist: 0.95, lunge: 0.2, drop: 0.07, lean: 0.2 },
  bodyJabL:{ key: '',  label: 'Left Body Jab',  hand: 'L', path: 'straight', target: 'body', clip: null,     windup: 0.08, impact: 0.22, end: 0.46, power: 2.4, stam: 3.5, twist: -0.25, lunge: 0.2, drop: 0.2, lean: 0.16, bodyHit: true },
  bodyJabR:{ key: '',  label: 'Right Body Straight', hand: 'R', path: 'straight', target: 'body', clip: null, windup: 0.1, impact: 0.28, end: 0.58, power: 4.2, stam: 6.0, twist: 0.55, lunge: 0.16, drop: 0.22, lean: 0.2, bodyHit: true },
  bodyUpL: { key: '',  label: 'Left Body Uppercut', hand: 'L', path: 'upper', target: 'body', clip: null,   windup: 0.13, impact: 0.3, end: 0.6, power: 4.6, stam: 7.0, twist: -0.5, lunge: 0.08, drop: 0.14, lean: 0.05, rise: true, bodyHit: true },
  bodyUpR: { key: '',  label: 'Right Body Uppercut', hand: 'R', path: 'upper', target: 'body', clip: null,  windup: 0.14, impact: 0.32, end: 0.64, power: 5.2, stam: 8.0, twist: 0.55, lunge: 0.1, drop: 0.15, lean: 0.05, rise: true, bodyHit: true },
};
for (const k in STRIKES) STRIKES[k].power *= 0.9;
// southpaw: every orthodox strike mirrored onto the other hand (clips swap to their mirrored takes)
for (const k of Object.keys(STRIKES)) { const d = STRIKES[k]; STRIKES[k + '_S'] = Object.assign({}, d, { hand: d.hand === 'L' ? 'R' : 'L', twist: -d.twist, clip: d.clip ? d.clip + 'M' : null, label: d.label.replace(/^Left|^Right/, m => m === 'Left' ? 'Right' : 'Left') + ' (southpaw)' }); }
const ORTH = { straight: ['jabL', 'crossR'], hook: ['hookL', 'hookR'], upper: ['upperL', 'upperR'], over: ['overL', 'overR'], bodyHook: ['bodyL', 'bodyR'], bodyStraight: ['bodyJabL', 'bodyJabR'], bodyUp: ['bodyUpL', 'bodyUpR'] };
export function strikeFor(hand, type, stance) { const t = ORTH[type] || ORTH.straight; return stance === 'southpaw' ? t[1 - hand] + '_S' : t[hand]; }
// controller: button (or chord) + modifiers -> strike
const PICK = { X: ['jabL', 'bodyJabL', 'overL'], Y: ['crossR', 'bodyJabR', 'overR'], A: ['hookL', 'bodyL', 'hookL'], B: ['hookR', 'bodyR', 'hookR'], XA: ['upperL', 'bodyUpL', 'upperL'], YB: ['upperR', 'bodyUpR', 'upperR'] };
export function pickStrike(b, body, heavy) { const r = PICK[b]; if (!r) return null; return body ? r[1] : heavy ? r[2] : r[0]; }
export function heavyDef(d, balK = 0) {
  const W = d.windup * 1.5 * (1 - 0.15 * balK), I = W + (d.impact - d.windup) * 1.12, E = I + (d.end - d.impact) * 1.3;
  return Object.assign({}, d, { windup: W, impact: I, end: E, power: d.power * 1.5, stam: d.stam * 1.8, lunge: d.lunge + 0.1, twist: d.twist * 1.25, drop: d.drop + 0.03, lean: d.lean + 0.05, heavy: true, label: 'Heavy ' + d.label });
}
export const KEY_TO_STRIKE = { '7': 'jabL', '9': 'crossR', '4': 'hookL', '6': 'hookR', '5': 'upper', '1': 'bodyL', '3': 'bodyR' };

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
export function distPointSegment(p, a, b) {
  _v.subVectors(b, a); const l2 = _v.lengthSq();
  let t = l2 > 0 ? _w.subVectors(p, a).dot(_v) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return p.distanceTo(_w.copy(a).addScaledVector(_v, t));
}

// sweep a sphere (radius r) from p0 to p1 against defender volumes. returns earliest contact or null
export function sweepGlove(p0, p1, r, vols, steps = 6) {
  const p = new THREE.Vector3();
  for (let i = 1; i <= steps; i++) {
    p.lerpVectors(p0, p1, i / steps);
    let best = null;
    for (const v of vols) {
      const d = v.b ? distPointSegment(p, v.a, v.b) : p.distanceTo(v.a);
      const pen = r + v.r - d;
      if (pen > 0) { const pri = v.block ? 0 : 1; if (!best || pri < best.pri || (pri === best.pri && pen > best.pen)) best = { vol: v, pen, pri, point: p.clone(), u: i / steps }; }
    }
    if (best) return best;
  }
  return null;
}
