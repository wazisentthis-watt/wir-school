'use strict';
// ALL DATA SIMULATED (synthetic generators). PROPOSAL / PLACEHOLDER. No camera, no real person.
const test = require('node:test'), assert = require('node:assert/strict');
const { scoreMove } = require('../stage_checker'), G = require('../synth_poses');
const near = (a, b, e, m) => assert.ok(Math.abs(a - b) <= e, `${m || ''} ${a} vs ${b} (+-${e})`);

test('data label is Simulated', () => { assert.equal(G.LABEL, 'Simulated'); assert.match(scoreMove(G.clean()).label, /Simulated/); });
test('clean stomp-to-hold chain: perfect order, high score, clean weakest link', () => {
  const r = scoreMove(G.clean()); assert.equal(r.gate.ok, true); assert.equal(r.parts.order, 1); assert.ok(r.score >= 0.9, r.score); assert.equal(r.settled, true);
  assert.equal(r.weakest.message, 'clean chain'); });
test('clean chain peak order is feet -> hips -> torso -> shoulders -> hands', () => {
  const p = scoreMove(G.clean()).peaks, ts = ['root', 'hips', 'torso', 'shoulders', 'hands'].map(k => p[k].t);
  for (let i = 1; i < ts.length; i++) assert.ok(ts[i] > ts[i - 1], ts.join()); });
test('arms-only flail scores low (order 0, weakest = body did not move)', () => {
  const r = scoreMove(G.armsOnlyFlail()); assert.ok(r.score < 0.2, r.score); assert.equal(r.parts.order, 0); assert.match(r.weakest.message, /barely moved/); });
test('hips-late case: order and score drop, weakest link says hips came late', () => {
  const c = scoreMove(G.clean()), r = scoreMove(G.hipsLate()); assert.ok(r.score < c.score - 0.2); assert.ok(r.parts.order < 0.8); assert.ok(r.score > 0.3, 'still fires a small effect'); assert.equal(r.weakest.message, 'hips came late'); assert.equal(r.weakest.link, 'hips'); });
test('reversed chain scores low and names the feet as late', () => { const r = scoreMove(G.reversed()); assert.ok(r.score < 0.5, r.score); assert.equal(r.weakest.message, 'feet/root came late'); });
test('slow clean case has the same ORDER score as the fast clean case (and same timing, same total within 0.02)', () => {
  const f = scoreMove(G.clean()), s = scoreMove(G.slowClean()); assert.equal(s.parts.order, f.parts.order); assert.equal(s.parts.timing, f.parts.timing); near(s.score, f.score, 0.02, 'total');
  assert.equal(s.weakest.message, 'clean chain'); });
test('slower still (x4) and faster (x0.6) keep order = 1', () => { for (const tempo of [0.6, 1.5, 4]) assert.equal(scoreMove(G.clean({ tempo })).parts.order, 1, 'tempo ' + tempo); });
test('speed-invariant: slow hips-late is still flagged hips-late', () => { const r = scoreMove(G.hipsLate({ tempo: 2.5 })); assert.equal(r.weakest.message, 'hips came late'); assert.ok(r.parts.order < 0.8); });
test('camera distance invariant (subject at 0.6x and 1.0x size)', () => { const a = scoreMove(G.clean({ scale: 0.6 })), b = scoreMove(G.clean()); assert.equal(a.parts.order, b.parts.order); near(a.score, b.score, 0.03); });
test('30 fps tolerant: 60 fps and 30 fps both order 1; 24 fps too', () => { for (const fps of [24, 30, 60]) assert.equal(scoreMove(G.clean({ fps })).parts.order, 1, 'fps ' + fps); });
test('timing tolerance: hips ~1 frame (33 ms) off the ideal still gets full order; 400 ms late does not', () => {
  assert.equal(scoreMove(G.clean({ peaks: { hips: 2.15 } })).parts.order, 1); assert.ok(scoreMove(G.clean({ peaks: { hips: 4.5 } })).parts.order < 1); });
test('timestamp jitter (+-0.4 frame) keeps order >= 0.9 (known: not exactly 1, finite differences get noisy)', () => {
  const f = G.clean(), R = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const j = f.map(x => ({ ...x, t: x.t + (R() - 0.5) * 2 / 30 * 0.4 })); for (let i = 1; i < j.length; i++) if (j[i].t <= j[i - 1].t) j[i].t = j[i - 1].t + 1e-4;
  assert.ok(scoreMove(j).parts.order >= 0.9, scoreMove(j).parts.order); });
test('smoothness: jittery hips/wrists score lower smoothness than clean, order unaffected', () => {
  const c = scoreMove(G.clean()), j = scoreMove(G.clean({ jitter: 0.004 })); assert.ok(j.parts.smooth < c.parts.smooth - 0.2); assert.equal(j.parts.order, 1); });
test('no jump reward: a jump scores 0, is flagged, and no effect', () => { const r = scoreMove(G.jumpFrames()); assert.equal(r.score, 0); assert.deepEqual(r.flags, ['jump-ignored']); assert.ok(r.jump); });
test('a clean stomp (one foot) is not mistaken for a jump', () => assert.ok(!scoreMove(G.clean()).jump));
test('weights are 45/25/20/10 and the total is their sum when settled', () => {
  const r = scoreMove(G.clean()), p = r.parts; near(r.score, 0.45 * p.order + 0.25 * p.smooth + 0.2 * p.timing + 0.1 * p.hold, 0.002); });
test('calm settle is required: no hold at the end caps the score and flags it', () => {
  const r = scoreMove(G.clean({ hold: 0.05 })); assert.equal(r.settled, false); assert.ok(r.score <= 0.6); });
test('gate: feet out of frame fails with a reason, no score', () => { const f = G.clean(); f.forEach(x => { x.lm.ankleL.y = 1.02; }); const r = scoreMove(f); assert.equal(r.gate.ok, false); assert.equal(r.score, null); assert.ok(r.gate.reasons.some(s => /frame edge: ankleL/.test(s))); });
test('gate: space not clear, too-small subject, too few frames', () => {
  assert.equal(scoreMove(G.clean(), { spaceClear: false }).gate.ok, false); assert.ok(scoreMove(G.clean({ scale: 0.2 })).gate.reasons.some(s => /step closer/.test(s))); assert.equal(scoreMove(G.clean().slice(0, 4)).gate.ok, false); });
test('missing joints: 10% dropped frames are interpolated; a joint missing 60% fails the gate', () => {
  const a = G.clean(); a.forEach((x, i) => { if (i % 10 === 5) x.lm.hipL.v = 0.1; }); assert.equal(scoreMove(a).parts.order, 1);
  const b = G.clean(); b.forEach((x, i) => { if (i % 5 < 3) x.lm.wristR.v = 0.1; }); const r = scoreMove(b); assert.equal(r.gate.ok, false); assert.ok(r.gate.reasons.some(s => /wristR/.test(s))); });
test('seated variant (torso, shoulders, hands only): no ankles needed, clean scores high, hands-only flail low', () => {
  const f = G.clean({ only: ['torso', 'shoulders', 'hands'] }); f.forEach(x => { delete x.lm.ankleL; delete x.lm.ankleR; delete x.lm.kneeL; delete x.lm.kneeR; });
  const r = scoreMove(f, { variant: 'seated' }); assert.equal(r.gate.ok, true); assert.equal(r.parts.order, 1); assert.ok(r.score > 0.9);
  const fl = G.armsOnlyFlail(); assert.ok(scoreMove(fl, { variant: 'seated' }).score < 0.4); assert.equal(scoreMove(G.clean(), { variant: 'handsOnly' }).gate.ok, true); });
test('seated hips-late (hips after shoulders and hands) is flagged', () => { const f = G.clean({ only: ['torso', 'shoulders', 'hands'], peaks: { torso: 5.5 } }); const r = scoreMove(f, { variant: 'seated' }); assert.ok(r.parts.order < 0.8); assert.match(r.weakest.message, /came late/); });
test('left-hand mirror: lead left scores the same as lead right; auto picks the moving hand', () => {
  const R = scoreMove(G.clean()), L = scoreMove(G.clean({ lead: 'left' }), { lead: 'left' }); assert.equal(L.leadHand, 'wristL'); assert.equal(L.parts.order, R.parts.order); near(L.score, R.score, 0.03);
  assert.equal(scoreMove(G.clean({ lead: 'left' }), { lead: 'auto' }).leadHand, 'wristL'); });
test('wrong lead hand (left selected, right moved) does not take credit', () => assert.ok(scoreMove(G.clean(), { lead: 'left' }).score < 0.6));
test('output exposes debug stages and per-pair gaps (debug view)', () => { const r = scoreMove(G.clean()); assert.equal(r.pairs.length, 4); for (const k of ['plant', 'load', 'drive', 'transfer', 'release', 'hold']) assert.ok(k in r.stages, k); });
test('deterministic: same input twice gives identical output', () => assert.deepEqual(scoreMove(G.clean()), scoreMove(G.clean())));
test('different noise seeds keep order score 1 (robustness)', () => { for (const seed of [1, 2, 3, 4, 5, 6]) assert.equal(scoreMove(G.clean({ seed })).parts.order, 1, 'seed ' + seed); });

// ---- revisions requested by AMU (PROPOSAL, Simulated; thresholds untested)
test('default tolerance is the spec fixed +-150 ms; relative tolerance is opt-in only', () => {
  const d = scoreMove(G.clean()), r = scoreMove(G.clean(), { cfg: { tolMode: 'relative' } });
  assert.equal(d.tolMode, 'fixed'); assert.equal(d.tolSec, 0.15); assert.equal(r.tolMode, 'relative'); });
test('fixed vs relative on the same clips: both keep clean = 1 and flag hips-late', () => {
  for (const mode of ['fixed', 'relative']) { const o = { cfg: { tolMode: mode } };
    assert.equal(scoreMove(G.clean(), o).parts.order, 1, mode); assert.ok(scoreMove(G.hipsLate(), o).parts.order < 0.8, mode); } });
test('torso is the shoulder-line angle: tilting the shoulder line alone moves the torso link, not hips', () => {
  const p = scoreMove(G.clean()).peaks; assert.equal(p.torso.tookPart, true); assert.ok(p.hips.t < p.torso.t && p.torso.t < p.shoulders.t); });
test('torso lean mode (hip-to-shoulder lean) is selectable and still scores', () => { const r = scoreMove(G.clean(), { cfg: { torsoMode: 'lean' } }); assert.equal(r.gate.ok, true); assert.ok(r.score >= 0); });
test('over-rotation: with a 60 degree cap set, a ~75 degree shoulder turn is softly penalized, not zeroed, and flagged', () => {
  const c = scoreMove(G.clean()), r = scoreMove(G.overTurn(), { cfg: { turnSoftDeg: 60 } }); assert.ok(r.turnDeg > 60); assert.ok(r.flags.includes('over-rotation')); assert.ok(r.score < c.score && r.score > 0.3, r.score); });
test('a full spin (shoulder line flips side) is never rewarded: capped low and flagged', () => {
  const r = scoreMove(G.fullSpin()); assert.ok(r.flags.includes('spin-ignored')); assert.ok(r.score <= 0.3, r.score); assert.match(r.weakest.message, /spin ignored/); });
test('normal clean motion has no turn flag', () => assert.equal(scoreMove(G.clean()).flags, undefined));

test('with the cap set to 90, a ~75 degree turn is inside it: not flagged, not penalised', () => { const r = scoreMove(G.overTurn(), { cfg: { turnSoftDeg: 90 } }); assert.ok(!(r.flags || []).includes('over-rotation')); });

test('past side-on (90 degrees) the shoulder line flips: read as a spin, capped, never rewarded', () => { const r = scoreMove(G.overTurn({ turnDeg: 105 })); assert.ok(r.flags.includes('spin-ignored')); assert.ok(r.score <= 0.3); });
