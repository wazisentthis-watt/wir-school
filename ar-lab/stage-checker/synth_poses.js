'use strict';
/* SIMULATED pose generators -- no real person, no camera data. PROPOSAL / PLACEHOLDER. */
const LABEL = 'Simulated';
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function erf(x) { const a = Math.abs(x), t = 1 / (1 + 0.3275911 * a), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a); return x < 0 ? -y : y; }
// smooth displacement 0..1 whose speed is a Gaussian bell centered at tau=0 (tau in units of sigma)
const mj = tau => 0.5 * (1 + erf(tau / Math.SQRT2));
const BASE = { ankleL: [0.44, 0.90], ankleR: [0.56, 0.90], kneeL: [0.45, 0.72], kneeR: [0.55, 0.72], hipL: [0.45, 0.55], hipR: [0.55, 0.55],
  shoulderL: [0.40, 0.35], shoulderR: [0.60, 0.35], wristL: [0.38, 0.55], wristR: [0.62, 0.55] }; // shoulder width 0.20
// each chain stage: which joints move and by how much (image units), by stage
const MOVES = { root: { joints: ['ankleL', 'ankleR', 'kneeL', 'kneeR'], d: [0.00, 0.05] },
  hips: { joints: ['hipL', 'hipR'], d: [0.03, 0.05] }, shoulders: { joints: ['shoulderL', 'shoulderR'], d: [0.03, 0.05] },
  hands: { joints: ['wristR'], d: [0.15, -0.20] } };
// torso stage = shoulder-line tilt (left shoulder down, right shoulder up); the shoulders stage moves both together so the tilt is independent of it
const TORSO_D = 0.04;
/* opts: tempo (time scale), peaks {root,hips,shoulders,hands} in units of gap g, noise, seed, fps, scale (camera distance), hold (s),
 *       only ['hands'] for arms-only, jitter (extra high-freq noise on hips+wrist), dur (bell duration in g), lead 'right'|'left' */
function makeChain(o = {}) {
  const fps = o.fps || 30, tempo = o.tempo || 1, g = 0.2 * tempo, noise = o.noise == null ? 0.0004 : o.noise, R = rng(o.seed || 7);
  const peaks = Object.assign({ root: 1, hips: 2, torso: 3, shoulders: 4, hands: 5 }, o.peaks), dur = (o.dur || 1.2) * g, pre = 3 * g;
  const active = o.only || ['root', 'hips', 'torso', 'shoulders', 'hands'], tEnd = pre + 6 * g + (o.hold == null ? 0.6 * 6 * g + 0.6 : o.hold) * (o.hold == null ? 1 : 1);
  const frames = [], n = Math.round(tEnd * fps), sc = o.scale || 1, flip = o.lead === 'left' ? -1 : 1;
  for (let i = 0; i < n; i++) { const t = i / fps, lm = {};
    for (const [k, [x, y]] of Object.entries(BASE)) lm[k] = { x, y, v: 1 };
    for (const st of active) { if (st === 'torso') { const c = mj((t - (pre + peaks.torso * g)) / dur); lm.shoulderL.y += TORSO_D * c; lm.shoulderR.y -= TORSO_D * c; continue; }
      const m = MOVES[st], c = mj((t - (pre + peaks[st] * g)) / dur);
      for (const j of m.joints) { lm[j].x += m.d[0] * c * (st === 'hands' ? flip : 1); lm[j].y += m.d[1] * c; } }
    if (o.turnDeg) { const c = mj((t - (pre + peaks.shoulders * g)) / dur), w = 0.1 * (o.spin ? Math.cos(c * Math.PI) : Math.cos(c * o.turnDeg * Math.PI / 180)); lm.shoulderL.x = 0.5 - w + 0.03 * 0; lm.shoulderR.x = 0.5 + w; }
    if (o.lead === 'left') { lm.wristL.x = BASE.wristL[0] + (lm.wristR.x - BASE.wristR[0]) * 1; lm.wristL.y = lm.wristR.y; lm.wristR.x = BASE.wristR[0]; lm.wristR.y = BASE.wristR[1]; }
    if (o.jitter) for (const j of ['hipL', 'hipR', 'wristR']) { lm[j].x += (R() - .5) * o.jitter; lm[j].y += (R() - .5) * o.jitter; }
    if (o.flail) { const ph = t * 2 * Math.PI * 3.1; lm.wristR.x += 0.12 * Math.sin(ph); lm.wristR.y += 0.15 * Math.sin(ph * 1.7 + 1); lm.wristL.x += 0.1 * Math.sin(ph * 1.3 + 2); lm.wristL.y += 0.14 * Math.sin(ph * 0.9); }
    for (const k in lm) { lm[k].x = 0.5 + (lm[k].x - 0.5) * sc + (R() - .5) * noise * sc; lm[k].y = 0.5 + (lm[k].y - 0.5) * sc + (R() - .5) * noise * sc; }
    frames.push({ t, lm }); }
  return frames;
}
const clean = o => makeChain(o);
const armsOnlyFlail = o => makeChain(Object.assign({ only: [], flail: true, hold: 0 }, o));       // arms flail, body still
const hipsLate = o => makeChain(Object.assign({ peaks: { hips: 5.5 } }, o));                       // hips peak after the hands
const reversed = o => makeChain(Object.assign({ peaks: { root: 5, hips: 4, shoulders: 2, hands: 1 } }, o));
const overTurn = o => makeChain(Object.assign({ turnDeg: 75 }, o));      // shoulder line turns ~75 deg: soft penalty
const fullSpin = o => makeChain(Object.assign({ turnDeg: 1, spin: true }, o));  // shoulder line flips side: never rewarded
const slowClean = o => makeChain(Object.assign({ tempo: 2.5 }, o));
const jumpFrames = o => { const f = makeChain(o); const k0 = Math.round(0.8 * 30); for (let i = k0; i < k0 + 12; i++) for (const j of ['ankleL', 'ankleR']) f[i].lm[j].y -= 0.25 * Math.sin((i - k0) / 11 * Math.PI); return f; };
module.exports = { LABEL, makeChain, clean, armsOnlyFlail, hipsLate, overTurn, fullSpin, reversed, slowClean, jumpFrames, BASE };
