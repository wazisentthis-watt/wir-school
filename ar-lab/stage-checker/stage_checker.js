'use strict';
/* Stage-order checker -- PROPOSAL / SIMULATED data only. Not canon. Never wire to a live camera
 * until Coach says yes in the 1:1. Aligned to AMU spec v0.2 (SPEC_v0.1.md sec. 12):
 *  Gate -> Root -> Hips -> Torso -> Arms -> calm Settle; 30 fps tolerant; seated / hands-only
 *  variants; left-hand mirror. Scores ORDER + SMOOTHNESS + TIMING + HOLD, never force.
 *  Weights 0.45 / 0.25 / 0.20 / 0.10 (AMU sec. 4).
 *
 * Input: frames = [{ t:seconds, lm:{ ankleL,ankleR,kneeL,kneeR,hipL,hipR,shoulderL,shoulderR,wristL,wristR : {x,y,v} } }]
 *        x,y normalized image coords (0..1), v visibility 0..1.
 * Everything is measured in shoulder-widths and in time relative to the chain span, so the
 * score is invariant to camera distance and to move speed (slow movers are not penalized).
 */
const CFG = {
  weights: { order: 0.45, smooth: 0.25, timing: 0.20, hold: 0.10 },
  visMin: 0.5, maxMissingFrac: 0.3, smoothWin: 5,
  minShoulderW: 0.06, frameMargin: 0.01,
  minDispSW: 0.12,        // a link "took part" if its path range >= this many shoulder-widths (amplitude gate, not force)
  minGapFrames: 0.5,      // pair counts as ordered if next peak is >= this many frames after previous (30 fps tolerant)
  tolMode: 'fixed',       // DEFAULT 'fixed' = spec +-150 ms. 'relative' (opt-in, PROPOSAL) = max(tolFrames*dt, tolFrac*span)
  tolFixedSec: 0.15, tolFrac: 0.12, tolFrames: 1.5,
  torsoMode: 'shoulderLine', // 'shoulderLine' (angle of the shoulder line) | 'lean' (hip-to-shoulder lean); per spec v0.2, not the hips/shoulders midpoint
  turnSoftDeg: 60, turnMaxPenalty: 0.5, // over-rotation: soft cap on how far the shoulder line turns; penalty grows past the cap, capped at turnMaxPenalty
  spinScoreCap: 0.3,      // a full spin (shoulder line flips side) is never rewarded: score capped here and flagged
  gapFullLo: 0.08, gapFullHi: 0.45, gapZeroHi: 0.75, // gap as fraction of chain span: full credit inside [lo,hi]
  calmFrac: 0.10, calmFloorSWps: 0.05, holdMinSec: 0.3, holdMinFrac: 0.25, driftSW: 0.15,
  jumpRiseSW: 0.5,        // BOTH ankles rising this far = jump: never rewarded, score 0
  njRef: 1e3, njSpan: 2.0 // smoothness: S = clamp(1 - log10(NJ/njRef)/njSpan)  (starting guess)
};
const LINKS_FULL = ['root', 'hips', 'torso', 'shoulders', 'hands'];
const LINKS_UPPER = ['torso', 'shoulders', 'hands'];
const SAY = { root: 'feet/root', hips: 'hips', torso: 'torso', shoulders: 'shoulders', hands: 'hands' };
const JOINTS = ['ankleL', 'ankleR', 'kneeL', 'kneeR', 'hipL', 'hipR', 'shoulderL', 'shoulderR', 'wristL', 'wristR'];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

function ma(arr, w) { // centered moving average, edge-shrinking
  const h = w >> 1; return arr.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - h); j <= Math.min(arr.length - 1, i + h); j++) { s += arr[j]; n++; } return s / n; });
}
function series(frames, name, cfg) { // -> {x,y,missing} with interpolation of low-visibility frames
  const n = frames.length, x = new Array(n), y = new Array(n), ok = new Array(n);
  let miss = 0;
  for (let i = 0; i < n; i++) { const p = frames[i].lm && frames[i].lm[name]; ok[i] = !!p && (p.v == null || p.v >= cfg.visMin) && isFinite(p.x) && isFinite(p.y); if (ok[i]) { x[i] = p.x; y[i] = p.y; } else miss++; }
  if (miss / n > cfg.maxMissingFrac) return { missing: true, frac: miss / n };
  for (let i = 0; i < n; i++) if (!ok[i]) { let a = i - 1, b = i + 1; while (a >= 0 && !ok[a]) a--; while (b < n && !ok[b]) b++;
    if (a < 0) { x[i] = x[b]; y[i] = y[b]; } else if (b >= n) { x[i] = x[a]; y[i] = y[a]; } else { const f = (i - a) / (b - a); x[i] = x[a] + f * (x[b] - x[a]); y[i] = y[a] + f * (y[b] - y[a]); } }
  return { x: ma(x, cfg.smoothWin), y: ma(y, cfg.smoothWin), missing: false };
}
const mid = (...s) => ({ x: s[0].x.map((_, i) => mean(s.map(q => q.x[i]))), y: s[0].y.map((_, i) => mean(s.map(q => q.y[i]))) });
function speed(p, t) { const n = t.length, v = new Array(n).fill(0); for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); v[i] = Math.hypot(p.x[b] - p.x[a], p.y[b] - p.y[a]) / (t[b] - t[a]); } return v; }
const range = p => Math.hypot(Math.max(...p.x) - Math.min(...p.x), Math.max(...p.y) - Math.min(...p.y));
function argmax(a) { let k = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[k]) k = i; return k; }

function normJerk(p, t, sp) { // dimensionless (T^5/L^2) * int |jerk|^2 over the active window
  const peak = Math.max(...sp); let i0 = 0, i1 = sp.length - 1;
  while (i0 < i1 && sp[i0] < 0.05 * peak) i0++; while (i1 > i0 && sp[i1] < 0.05 * peak) i1--;
  if (i1 - i0 < 6) return null;
  // extra smoothing proportional to move duration (not a fixed frame count) so slow moves are not judged noisier
  let w = Math.max(5, Math.round((i1 - i0) * 0.1)); if (w % 2 === 0) w++;
  p = { x: ma(ma(p.x, w), w), y: ma(ma(p.y, w), w) };
  const dt = (t[i1] - t[i0]) / (i1 - i0), T = t[i1] - t[i0]; let L = 0, J = 0;
  for (let i = i0 + 1; i <= i1; i++) L += Math.hypot(p.x[i] - p.x[i - 1], p.y[i] - p.y[i - 1]);
  for (let i = i0 + 2; i < i1 - 1; i++) for (const c of ['x', 'y']) { const j = (p[c][i + 2] - 2 * p[c][i + 1] + 2 * p[c][i - 1] - p[c][i - 2]) / (2 * dt * dt * dt); J += j * j * dt; }
  return L < 1e-9 ? null : Math.pow(T, 5) / (L * L) * J;
}

function gate(frames, S, cfg, variant, spaceClear) {
  const reasons = [];
  if (!frames || frames.length < 10) reasons.push('too few frames');
  if (spaceClear === false) reasons.push('space not clear');
  const need = variant === 'full' ? JOINTS : ['hipL', 'hipR', 'shoulderL', 'shoulderR', 'wristL', 'wristR'];
  for (const j of need) { if (!S[j] || S[j].missing) { reasons.push('joint not visible: ' + j); continue; }
    if (Math.min(...S[j].x, ...S[j].y) < cfg.frameMargin || Math.max(...S[j].x, ...S[j].y) > 1 - cfg.frameMargin) reasons.push('touching frame edge: ' + j); }
  return reasons;
}

function scoreMove(frames, opts = {}) {
  const cfg = Object.assign({}, CFG, opts.cfg || {}); cfg.weights = Object.assign({}, CFG.weights, (opts.cfg || {}).weights);
  const variant = opts.variant || 'full'; // 'full' | 'seated' | 'handsOnly' (seated/handsOnly: stages Torso, Arms, Settle only)
  const out = { label: 'Simulated / PROPOSAL', variant, gate: { ok: false, reasons: [] }, score: null };
  if (!frames || frames.length < 10) { out.gate.reasons = ['too few frames']; return out; }
  const t = frames.map(f => f.t), dt = (t[t.length - 1] - t[0]) / (t.length - 1);
  const S = {}; for (const j of JOINTS) S[j] = series(frames, j, cfg);
  out.gate.reasons = gate(frames, S, cfg, variant, opts.spaceClear);
  const swArr = S.shoulderL.missing || S.shoulderR.missing ? [0] : S.shoulderL.x.map((_, i) => Math.hypot(S.shoulderL.x[i] - S.shoulderR.x[i], S.shoulderL.y[i] - S.shoulderR.y[i]));
  const sw = median(swArr);
  if (sw < cfg.minShoulderW) out.gate.reasons.push('step closer: shoulders too small in frame');
  if (out.gate.reasons.length) return out;
  out.gate.ok = true;
  // unit: shoulder-widths (scale-invariant to camera distance)
  const sc = p => ({ x: p.x.map(v => v / sw), y: p.y.map(v => v / sw) });
  const lead = opts.lead === 'left' ? 'wristL' : opts.lead === 'auto' ? (range(S.wristL) > range(S.wristR) ? 'wristL' : 'wristR') : 'wristR';
  out.leadHand = lead;
  const P = {
    hips: sc(mid(S.hipL, S.hipR)), shoulders: sc(mid(S.shoulderL, S.shoulderR)), hands: sc(S[lead])
  };
  // torso link = shoulder-line angle (default) or hip-to-shoulder lean; NOT the hips/shoulders midpoint (AMU v0.2)
  P.torso = cfg.torsoMode === 'lean'
    ? { x: P.shoulders.x.map((v, i) => v - P.hips.x[i]), y: P.shoulders.y.map((v, i) => v - P.hips.y[i]) }
    : { x: S.shoulderR.x.map((v, i) => (v - S.shoulderL.x[i]) / sw), y: S.shoulderR.y.map((v, i) => (v - S.shoulderL.y[i]) / sw) };
  if (variant === 'full') P.root = sc(mid(S.ankleL, S.ankleR, S.kneeL, S.kneeR));
  // jump check: both ankles rising together -> never rewarded
  if (variant === 'full') { const n0 = Math.max(3, Math.round(0.3 / dt)), base = k => median(S[k].y.slice(0, n0));
    const bl = base('ankleL'), br = base('ankleR'); out.jump = S.ankleL.y.some((_, i) => (bl - S.ankleL.y[i]) / sw > cfg.jumpRiseSW && (br - S.ankleR.y[i]) / sw > cfg.jumpRiseSW);
    if (out.jump) { out.score = 0; out.weakest = { link: 'root', message: 'jump ignored: keep one foot on the floor' }; out.flags = ['jump-ignored']; return out; } }
  const links = variant === 'full' ? LINKS_FULL : LINKS_UPPER;
  const sp = {}, tp = {}, took = {}, pk = {};
  for (const l of links) { sp[l] = speed(P[l], t); const k = argmax(sp[l]); tp[l] = t[k]; pk[l] = sp[l][k]; took[l] = range(P[l]) >= cfg.minDispSW; }
  const span = Math.max(tp[links[links.length - 1]] - tp[links[0]], 2 * dt);
  out.peaks = Object.fromEntries(links.map(l => [l, { t: +tp[l].toFixed(3), tookPart: took[l] }]));
  // ---- ORDER + TIMING over consecutive pairs
  const tol = cfg.tolMode === 'relative' ? Math.max(cfg.tolFrames * dt, cfg.tolFrac * Math.abs(tp[links[links.length - 1]] - tp[links[0]])) : cfg.tolFixedSec;
  out.tolMode = cfg.tolMode; out.tolSec = +tol.toFixed(3);
  const minGap = cfg.minGapFrames * dt, pairs = [];
  for (let i = 0; i < links.length - 1; i++) { const a = links[i], b = links[i + 1], g = tp[b] - tp[a];
    let o, tm;
    if (!took[a] || !took[b]) { o = 0; tm = 0; }
    else { o = g >= minGap ? 1 : g <= -tol ? 0 : (g + tol) / (minGap + tol);
      const f = g / span; tm = g <= 0 ? 0 : f < cfg.gapFullLo ? f / cfg.gapFullLo : f <= cfg.gapFullHi ? 1 : clamp(1 - (f - cfg.gapFullHi) / (cfg.gapZeroHi - cfg.gapFullHi)); }
    pairs.push({ a, b, gapMs: Math.round(g * 1000), order: +o.toFixed(3), timing: +tm.toFixed(3) }); }
  const O = mean(pairs.map(p => p.order)), T = mean(pairs.map(p => p.timing));
  // ---- SMOOTHNESS (hips + hands paths; torso+hands in upper variants)
  const sl = variant === 'full' ? ['hips', 'hands'] : ['torso', 'hands'], nj = sl.map(l => normJerk(P[l], t, sp[l])).filter(v => v != null);
  const Sm = nj.length ? mean(nj.map(v => clamp(1 - Math.log10(Math.max(v, 1e-9) / cfg.njRef) / cfg.njSpan))) : 0; out.normJerk = nj.map(v => +v.toFixed(1));
  // ---- SETTLE / HOLD: every link calm after the hands peak, for a minimum hold (relative to chain span)
  const kh = Math.max(...links.map(l => argmax(sp[l]))); let ks = -1;
  for (let i = kh; i < t.length; i++) if (links.every(l => sp[l][i] < Math.max(cfg.calmFrac * pk[l], cfg.calmFloorSWps))) { ks = i; break; }
  let H = 0, settled = false;
  if (ks >= 0) { const held = t[t.length - 1] - t[ks], need = Math.max(cfg.holdMinSec, cfg.holdMinFrac * span);
    let calmOk = true; for (let i = ks; i < t.length; i++) if (!links.every(l => sp[l][i] < Math.max(1.5 * cfg.calmFrac * pk[l], cfg.calmFloorSWps))) { calmOk = false; break; }
    let drift = 0; for (const l of ['hips', 'shoulders']) drift = Math.max(drift, range({ x: P[l].x.slice(ks), y: P[l].y.slice(ks) }));
    settled = held >= need && calmOk; H = clamp(held / need) * (1 - clamp(drift / cfg.driftSW)) * (calmOk ? 1 : 0.3); }
  const W = cfg.weights, raw = W.order * O + W.smooth * Sm + W.timing * T + W.hold * H;
  out.parts = { order: +O.toFixed(3), smooth: +Sm.toFixed(3), timing: +T.toFixed(3), hold: +H.toFixed(3) };
  out.pairs = pairs; out.settled = settled;
  let fin = settled ? raw : Math.min(raw, 0.6); // calm settle is required to score fully; low score is never a hard fail
  // ---- OVER-ROTATION (spec sec. 10): soft cap on shoulder-line turn; full spin never rewarded
  const dx = S.shoulderR.x.map((v, i) => (v - S.shoulderL.x[i]) / sw), dmax = Math.max(...dx.map(Math.abs)) || 1, flags = [];
  const turn = Math.max(...dx.map(v => Math.acos(clamp(Math.abs(v) / dmax)) * 180 / Math.PI)); // 0 = square to camera, 90 = side-on
  const spun = dx[0] * dx[dx.length - 1] < 0 || Math.min(...dx) * Math.max(...dx) < 0 && Math.min(...dx.map(Math.abs)) < 0.1 * dmax && turn > 80 && Math.abs(dx[0]) > 0.5 * dmax;
  out.turnDeg = +turn.toFixed(1);
  if (spun) { fin = Math.min(fin, cfg.spinScoreCap); flags.push('spin-ignored'); }
  else if (turn > cfg.turnSoftDeg) { fin *= 1 - cfg.turnMaxPenalty * clamp((turn - cfg.turnSoftDeg) / 30); flags.push('over-rotation'); }
  if (flags.length) out.flags = flags;
  out.score = +fin.toFixed(3);
  out.stages = { plant: 'still before first motion', load: 'to ' + SAY[links[0]] + ' peak', drive: SAY[links[0]] + ' -> ' + SAY[links[1]], transfer: SAY[links[1]] + ' -> ' + SAY[links[links.length - 2]], release: 'hands peak @' + tp.hands.toFixed(2) + 's', hold: settled ? 'settled' : 'no calm settle' };
  // ---- WEAKEST LINK
  const late = {}; links.forEach((a, i) => { late[a] = links.slice(i + 1).filter(b => took[a] && took[b] && tp[b] < tp[a] - minGap).length; });
  const idle = links.filter(l => !took[l]);
  let weak;
  if (idle.length) weak = { link: idle[0], message: `${SAY[idle[0]]} barely moved` };
  else { const worstLate = links.reduce((m, l) => late[l] > late[m] ? l : m, links[0]);
    if (late[worstLate] > 0 && O < 0.999) weak = { link: worstLate, message: `${SAY[worstLate]} came late` };
    else { const i = pairs.reduce((m, p, k) => p.timing < pairs[m].timing ? k : m, 0), p = pairs[i];
      if (p.timing < 0.999) { const tight = p.gapMs / 1000 / span < cfg.gapFullLo; weak = { link: p.b, message: `${SAY[p.a]} to ${SAY[p.b]} ${tight ? 'too bunched together' : 'too far apart'}` }; }
      else if (!settled) weak = { link: 'settle', message: 'no calm settle: finish still' };
      else if (Sm < 0.6) weak = { link: 'smooth', message: 'motion was jerky: smooth it out' };
      else weak = { link: null, message: 'clean chain' }; } }
  if (flags.includes('spin-ignored')) weak = { link: 'shoulders', message: 'spin ignored: turn only part way' };
  else if (flags.includes('over-rotation') && weak.link === null) weak = { link: 'shoulders', message: 'turned too far: ease the shoulder turn' };
  out.weakest = weak; return out;
}
module.exports = { scoreMove, CFG, LINKS_FULL, LINKS_UPPER, JOINTS };
