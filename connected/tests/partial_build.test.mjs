import test from 'node:test';
import assert from 'node:assert/strict';
import {KIT,MOVES,STAGE_ORDER,movesFor,interrupt,totalParts,clampParts} from '../assets/partial_build_core.mjs';

test('a complete build has every move', () => {
  assert.deepEqual(movesFor(KIT), MOVES.map(m => m.id));
});

test('a missing wheel or chassis removes the moves that need them (real reduced move set)', () => {
  assert.ok(!movesFor({ ...KIT, chassis: 0 }).includes('drive'));
  assert.ok(!movesFor({ ...KIT, chassis: 0 }).includes('ram'));
  assert.ok(movesFor({ ...KIT, wheels: 1 }).includes('grab'), 'arms still grab');
  assert.ok(!movesFor({ ...KIT, wheels: 1 }).includes('drive'), 'one wheel cannot drive');
});

test('moves are monotonic: removing parts never adds a move (property over all part subsets)', () => {
  const full = movesFor(KIT);
  for (let w = 0; w <= KIT.wheels; w++) for (let c = 0; c <= 1; c++) for (let e = 0; e <= 1; e++) for (let a = 0; a <= KIT.arms; a++) {
    const m = movesFor({ wheels: w, chassis: c, engine: e, arms: a });
    assert.ok(m.every(id => full.includes(id)));
    const mOne = movesFor({ wheels: Math.max(0, w - 1), chassis: c, engine: e, arms: a });
    assert.ok(mOne.every(id => m.includes(id)), 'fewer parts, fewer moves');
  }
});

test('interrupting before attachment leaves parts loose, not attached', () => {
  const r = interrupt(KIT, 'read');
  assert.equal(r.attached.chassis, 0);
  assert.equal(r.loose.chassis, 1, 'the chassis falls loose and stays recoverable');
  assert.ok(!r.moves.includes('drive'));
});

test('mass-like count is conserved: attached + loose equals the full build', () => {
  for (const stage of STAGE_ORDER) {
    const r = interrupt(KIT, stage);
    for (const k of Object.keys(KIT)) assert.equal(r.attached[k] + r.loose[k], KIT[k], stage + ' ' + k);
    assert.equal(totalParts(r.attached) + totalParts(r.loose), totalParts(KIT));
  }
});

test('a later interruption keeps more parts than an earlier one', () => {
  const early = interrupt(KIT, 'anchor'), late = interrupt(KIT, 'reframe');
  assert.ok(totalParts(late.attached) >= totalParts(early.attached));
  assert.ok(late.attached.engine === 1 && early.attached.engine === 0);
});

test('an interrupted build gets a reduced but real move set; an unknown stage is rejected', () => {
  const r = interrupt(KIT, 'release');
  assert.ok(r.moves.length < movesFor(KIT).length);
  assert.equal(interrupt(KIT, 'nope').reason, 'unknown-stage');
  assert.deepEqual(clampParts({ wheels: 99, chassis: -2 }).wheels, KIT.wheels);
});
