// Gallium Gallop + Crown points / Magnetic Snapline — PROPOSAL / HOLD (2026-11-07)
import test from 'node:test';
import assert from 'node:assert/strict';
import {GALLOP,createGallop,press,step as gStep,landed,strideSpeed} from '../assets/gallium_gallop_core.mjs';
import {SNAP,createSnap,mark,commit,step as sStep,posAt} from '../assets/snapline_core.mjs';
const dt = 1 / 60;

// run one stride: press, load, release, land after a short hop
function stride(G, gal, wait = 0.3, lean = 0) {
  for (let t = 0; t < wait; t += dt) gStep(G, dt, 'ground');
  const p = press(G, { mode: 'ground', gal, lean }); if (!p.ok) return { p };
  let r = null; while (!r || r.type === 'compress') r = gStep(G, dt, 'ground');
  for (let t = 0; t < 0.4; t += dt) gStep(G, dt, 'air');
  return { p, r, l: landed(G, true) };
}

test('Gallop: a stride needs a foothold, never a mid-air step', () => {
  const G = createGallop();
  assert.equal(press(G, { mode: 'air', gal: 1 }).why, 'air');
  const s = stride(G, 1); assert.equal(s.r.type, 'release'); assert.equal(s.l.type, 'tik');
});

test('Gallop: on-beat strides chain and push harder; off-beat resets the chain', () => {
  const G = createGallop(); let gal = 1; const dvs = [];
  for (let i = 0; i < 5; i++) { const s = stride(G, gal, 0.2); gal -= s.r.cost; dvs.push(s.r.dv); }
  assert.equal(G.chain, 5, 'five on-beat strides chain');
  assert.ok(dvs[4] > dvs[0], 'chained strides push harder');
  assert.ok(Math.abs(gal - (1 - 5 * GALLOP.COST)) < 1e-9, 'each stride costs Gallium');
  const late = stride(G, gal, 1.2); assert.equal(late.r.onBeat, false); assert.equal(G.chain, 1, 'late press starts a new chain');
});

test('Gallop: a hard turn breaks the rhythm and costs more', () => {
  const G = createGallop(); stride(G, 1, 0.2);
  const s = stride(G, 1, 0.2, 1);
  assert.equal(s.r.turnBreak, true); assert.equal(s.r.onBeat, false);
  assert.ok(Math.abs(s.r.cost - GALLOP.COST * GALLOP.TURN_COST) < 1e-9);
});

test('Gallop: finite Gallium — no material, no stride; rolling off mid-load spends nothing', () => {
  const G = createGallop();
  assert.equal(press(G, { mode: 'ground', gal: GALLOP.COST / 2 }).why, 'material');
  assert.equal(press(G, { mode: 'ground', gal: 1 }).ok, true);
  assert.equal(gStep(G, dt, 'air').type, 'cancel'); assert.equal(G.spent, 0);
});

test('Gallop: stride speed is capped at top speed', () => {
  assert.equal(strideSpeed(15, 3, 16), 16); assert.equal(strideSpeed(-4, 2, 16), -6); assert.equal(strideSpeed(0, 2, 16), 2);
});

// a flat city: one tall block between Metal and the far anchors
const block = { min: { x: 10, z: -6 }, max: { x: 22, z: 6 }, top: 14 };
const heightAt = (x, z) => (x > block.min.x && x < block.max.x && z > block.min.z && z < block.max.z) ? block.top : 0;
const anchors = [{ x: 8, y: 7, z: 0 }, { x: 28, y: 7, z: 0 }, { x: 0, y: 7, z: 30 }, { x: -12, y: 7, z: 0 }];

test('Crown points: mark up to three anchors ahead, each parks Gallium', () => {
  const S = createSnap(); const m = { x: 0, y: 0, z: 0 }, h = Math.PI / 2; // heading +x
  const a = mark(S, m, h, anchors, 1); assert.equal(a.ok, true); assert.equal(a.point.x, 8);
  const b = mark(S, m, h, anchors, 1); assert.equal(b.ok, true); assert.equal(b.point.x, 28);
  assert.equal(mark(S, m, h, anchors, 1).why, 'none', 'nothing else ahead (the anchor behind him is never picked)');
  assert.equal(mark(createSnap(), m, h, anchors, SNAP.COST / 2).why, 'material');
});

test('Snapline: committed arc clears the building, never teleports, cannot be cancelled, lands on the floor', () => {
  const S = createSnap(); const m = { x: 0, y: 0, z: 0 }, h = Math.PI / 2;
  mark(S, m, h, anchors, 1); mark(S, m, h, anchors, 1);
  const c = commit(S, m, heightAt); assert.equal(c.ok, true, JSON.stringify(c));
  let r, maxDisp = 0, clipped = false, frames = 0;
  do {
    r = sStep(S, frames % 7 === 0 ? 0.25 : dt); frames++;   // includes long frames: still no jump
    maxDisp = Math.max(maxDisp, r.disp);
    const nearEnds = [m, ...S.nodes || []].some(n => n && Math.hypot(r.pos.x - n.x, r.pos.z - n.z) < SNAP.NEAR);
    if (!nearEnds && r.pos.y < heightAt(r.pos.x, r.pos.z) + 0.05) clipped = true;
  } while (r.type === 'arc' && frames < 5000);
  assert.equal(r.type, 'land');
  assert.ok(maxDisp <= SNAP.MAX_STEP + 1e-6, 'per-frame move capped: ' + maxDisp);
  assert.equal(clipped, false, 'never passes through the block');
  assert.ok(r.pos.x > 28 && r.pos.y === 0, 'lands past the last Crown point on the floor');
  assert.equal(r.drop.length, 2, 'both anchors drip down as puddles');
});

test('Snapline: unused Crown points drip down after a while (nothing is lost)', () => {
  const S = createSnap(); mark(S, { x: 0, y: 0, z: 0 }, Math.PI / 2, anchors, 1);
  let r = null; for (let t = 0; t < SNAP.HOLD_T + 0.1 && !r; t += dt) r = sStep(S, dt);
  assert.equal(r.type, 'expire'); assert.equal(r.drop.length, 1); assert.equal(r.drop[0].amount, SNAP.COST);
});

test('Snapline: posAt walks the whole path', () => {
  const S = createSnap(); const m = { x: 0, y: 0, z: 0 }; mark(S, m, Math.PI / 2, anchors, 1); commit(S, m, heightAt);
  const a = posAt(S, 0), b = posAt(S, S.len); assert.deepEqual([a.x, a.z], [0, 0]); assert.ok(b.x > 8);
});
