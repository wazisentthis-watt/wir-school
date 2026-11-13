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
  assert.throws(() => deserialize(JSON.stringify({ v: 9, units: {} })));
});

import {preview,queueOrder,deserialize as des2} from '../assets/command_squad_core.mjs';


test('#11 an invalid preview says why, and the order is not applied', () => {
  const S = createCommandSquad();
  assert.equal(preview(S, 'FOUNDRY', 'MOVE', {}).reason, 'missing-position');
  assert.equal(preview(S, 'FOUNDRY', 'HARVEST', {}).reason, 'not-implemented');
  giveOrder(S, 'FOUNDRY', 'MOVE', {});
  assert.equal(S.units.FOUNDRY.order.type, 'FOLLOW', 'refused order never silently becomes FOLLOW or changes order');
});

test('#12 second order starts only after the first arrives', () => {
  const S = createCommandSquad();
  giveOrder(S, 'THREAD', 'MOVE', { at: { x: 4, z: 0 } });
  assert.equal(queueOrder(S, 'THREAD', 'HOLD', { at: { x: 4, z: 0 } }).ok, true);
  run(S, 0.2);
  assert.equal(S.units.THREAD.order.type, 'MOVE', 'still on the first order');
  const ev = run(S, 5);
  assert.equal(S.units.THREAD.order.type, 'HOLD');
  assert.ok(ev.some(e => e.type === 'queue-started' && e.order === 'HOLD' && e.ok));
});


test('#12 queue depth is capped and primaries that never resolve cannot be queued behind', () => {
  const S = createCommandSquad();
  giveOrder(S, 'BULWARK', 'MOVE', { at: { x: 9, z: 0 } });
  assert.equal(queueOrder(S, 'BULWARK', 'HOLD', { at: { x: 9, z: 0 } }).ok, true);
  assert.equal(queueOrder(S, 'BULWARK', 'HOLD', { at: { x: 9, z: 0 } }).reason, 'queue-full');
  giveOrder(S, 'THREAD', 'HOLD', { at: { x: 1, z: 1 } });
  assert.equal(queueOrder(S, 'THREAD', 'MOVE', { at: { x: 5, z: 5 } }).reason, 'primary-never-resolves');
});

test('queue survives save and loads back; v1 saves migrate with an empty queue', () => {
  const S = createCommandSquad();
  giveOrder(S, 'THREAD', 'MOVE', { at: { x: 9, z: 0 } });
  queueOrder(S, 'THREAD', 'HOLD', { at: { x: 9, z: 0 } });
  const back = deserialize(serialize(S));
  assert.equal(back.units.THREAD.queue.length, 1);
  const v1 = JSON.stringify({ v: 1, controlled: 'GENERAL', units: { GENERAL: { id: 'GENERAL', x: 0, z: 0, hp: 100, cooldowns: {}, inventory: [], order: { type: 'FOLLOW' }, status: 'idle' } } });
  assert.deepEqual(des2(v1).units.GENERAL.queue, []);
});

// Routing (addendum batch: real pathing around obstacles)
const ring = (cx, cz, R = 3.5, r = 2, n = 12) => Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos(i / n * Math.PI * 2) * R, z: cz + Math.sin(i / n * Math.PI * 2) * R, r }));

test('a unit routes around a pillar and arrives instead of stopping at it', () => {
  const S = createCommandSquad();
  const wall = [{ x: 6, z: 0, r: 2 }];
  giveOrder(S, 'FOUNDRY', 'MOVE', { at: { x: 20, z: 0 } });
  run(S, 10, { blockers: wall });
  assert.equal(S.units.FOUNDRY.status, 'arrived');
  assert.ok(Math.hypot(S.units.FOUNDRY.x - 20, S.units.FOUNDRY.z) < 1);
});

test('no route when the target is enclosed: visible block, the unit never enters the ring', () => {
  const S = createCommandSquad();
  const fence = ring(20, 0);
  giveOrder(S, 'THREAD', 'MOVE', { at: { x: 20, z: 0 } }, []);
  const ev = run(S, 10, { blockers: fence });
  assert.equal(S.units.THREAD.status, 'blocked');
  assert.ok(ev.some(e => e.type === 'blocked' && e.reason === 'no-route'));
  for (const c of fence) assert.ok(Math.hypot(S.units.THREAD.x - c.x, S.units.THREAD.z - c.z) >= c.r, 'never inside a fence post');
});

test('#11 preview shows the detour and ETA without changing state', () => {
  const S = createCommandSquad();
  const before = snapshot(S);
  const p = preview(S, 'THREAD', 'MOVE', { at: { x: 20, z: 0 } }, [{ x: 10, z: 0, r: 2 }]);
  assert.equal(p.ok, true);
  assert.equal(p.detour, true, 'the route goes around the blocker');
  assert.ok(p.path.length === 3 && p.etaSec > 0);
  assert.deepEqual(snapshot(S), before, 'preview is read-only');
});

test('#11 preview refuses an enclosed target with no-route', () => {
  const S = createCommandSquad();
  const r = preview(S, 'THREAD', 'MOVE', { at: { x: 20, z: 0 } }, ring(20, 0));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-route');
});

test('#12 a queued order is dropped visibly when the first order has no route', () => {
  const S = createCommandSquad();
  giveOrder(S, 'FOUNDRY', 'MOVE', { at: { x: 20, z: 0 } });
  queueOrder(S, 'FOUNDRY', 'HOLD', { at: { x: 2, z: 0 } });
  const ev = run(S, 10, { blockers: ring(20, 0) });
  assert.equal(S.units.FOUNDRY.order.type, 'MOVE', 'the queued HOLD never started');
  assert.equal(S.units.FOUNDRY.queue.length, 0);
  assert.ok(ev.some(e => e.type === 'queue-dropped' && e.count === 1));
});
