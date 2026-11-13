import test from 'node:test';
import assert from 'node:assert/strict';
import {UNITS,createCommandSquad,select,cycle,giveOrder,step,snapshot,serialize,deserialize,CMD} from '../assets/command_squad_core.mjs';
const dt = 1 / 30;
const run = (S, secs, opts) => { const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...step(S, dt, opts)); return ev; };

test('four units exist, cycle wraps, unknown unit rejected', () => {
  const S = createCommandSquad();
  assert.deepEqual(UNITS, ['GENERAL', 'BULWARK', 'FOUNDRY', 'THREAD']);
  assert.equal(S.controlled, 'GENERAL');
  cycle(S, -1); assert.equal(S.controlled, 'THREAD');
  assert.equal(select(S, 'METAL').ok, false);
});

test('switching control does not move, heal, or reset any unit', () => {
  const S = createCommandSquad();
  S.units.BULWARK.hp = 40; S.units.FOUNDRY.cooldowns.ram = 3;
  const before = snapshot(S.units);
  select(S, 'BULWARK'); select(S, 'FOUNDRY'); select(S, 'THREAD'); select(S, 'GENERAL');
  assert.deepEqual(snapshot(S.units), before);
});

test('unselected units keep following their order while the General is driven', () => {
  const S = createCommandSquad();
  giveOrder(S, 'THREAD', 'MOVE', { at: { x: 30, z: 0 } });
  const start = { ...S.units.THREAD };
  run(S, 2, { movePlayer: { x: 0.1, z: 0 } });
  assert.ok(S.units.THREAD.x > start.x + 5, 'Thread made verifiable progress without player input');
});

test('HOLD keeps a unit at its point while the General walks away', () => {
  const S = createCommandSquad();
  giveOrder(S, 'BULWARK', 'HOLD', { at: { x: 5, z: 5 } });
  run(S, 0.5);
  const held = { x: S.units.BULWARK.x, z: S.units.BULWARK.z };
  S.units.GENERAL.x = 60; S.units.GENERAL.z = 60;
  run(S, 3);
  assert.deepEqual({ x: S.units.BULWARK.x, z: S.units.BULWARK.z }, held);
});

test('FOLLOW tracks the General', () => {
  const S = createCommandSquad();
  S.units.GENERAL.x = 40; S.units.GENERAL.z = 0;
  run(S, 10);
  assert.ok(Math.hypot(S.units.FOUNDRY.x - 40, S.units.FOUNDRY.z) < 3);
});

test('MOVE reports arrival and REGROUP returns the unit to follow', () => {
  const S = createCommandSquad();
  giveOrder(S, 'THREAD', 'MOVE', { at: { x: 8, z: 0 } });
  run(S, 5);
  assert.equal(S.units.THREAD.status, 'arrived');
  S.units.THREAD.x = 30; S.units.THREAD.z = 0;
  giveOrder(S, 'THREAD', 'REGROUP');
  const ev = run(S, 15);
  assert.equal(S.units.THREAD.order.type, 'FOLLOW');
  assert.ok(ev.some(e => e.type === 'regrouped'));
});

test('blocked movement stops at the blocker and reports it (no fake pathing)', () => {
  const S = createCommandSquad();
  const wall = [{ x: 6, z: 0, r: 2 }];
  giveOrder(S, 'FOUNDRY', 'MOVE', { at: { x: 20, z: 0 } }, []);
  const ev = run(S, 8, { blockers: wall });
  assert.equal(S.units.FOUNDRY.status, 'blocked');
  assert.ok(ev.some(e => e.type === 'blocked' && e.id === 'FOUNDRY'));
  assert.ok(S.units.FOUNDRY.x < 4 + 1e-6, 'never entered the blocker');
});

test('orders with missing prerequisites fail with a reason and change nothing', () => {
  const S = createCommandSquad();
  const before = snapshot(S.units.FOUNDRY.order);
  assert.equal(giveOrder(S, 'FOUNDRY', 'MOVE', {}).reason, 'missing-position');
  assert.equal(giveOrder(S, 'FOUNDRY', 'MOVE', { at: { x: 1, z: 1 } }, [{ x: 1, z: 1, r: 2 }]).reason, 'target-blocked');
  assert.equal(giveOrder(S, 'FOUNDRY', 'HARVEST', {}).reason, 'not-implemented');
  assert.deepEqual(snapshot(S.units.FOUNDRY.order), before);
});

test('DEFEND reports engagement when an enemy enters its radius', () => {
  const S = createCommandSquad();
  giveOrder(S, 'BULWARK', 'DEFEND', { at: { x: 0, z: 0 }, r: CMD.DEFEND_R });
  const ev = run(S, 0.2, { enemies: [{ x: 4, z: 0 }] });
  assert.ok(ev.some(e => e.type === 'engaged' && e.id === 'BULWARK'));
});

test('save round-trips exactly and rejects unknown versions', () => {
  const S = createCommandSquad();
  giveOrder(S, 'THREAD', 'MOVE', { at: { x: 9, z: 9 } });
  run(S, 1); S.units.BULWARK.hp = 55;
  const back = deserialize(serialize(S));
  assert.deepEqual(back.units, S.units);
  assert.equal(back.controlled, S.controlled);
  assert.throws(() => deserialize(JSON.stringify({ v: 2, units: {} })));
});
