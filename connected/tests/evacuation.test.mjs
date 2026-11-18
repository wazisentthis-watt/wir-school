import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvacuee,requestRescue,step,damage,missionGate,EVAC} from '../assets/evacuation_core.mjs';
const zone = { x: 30, z: 0, r: 2 };
// escort walks alongside the first evacuee, as a real squad member would
const follow = (E, secs, blockers = []) => { const ev = []; for (let t = 0; t < secs; t += 1/30) ev.push(...step(E, 1/30, { zone, escorts: [{ id: 'BULWARK', x: E[0].x, z: E[0].z }], blockers })); return ev; };
const run = (E, secs, opts) => { const ev = []; for (let t = 0; t < secs; t += 1/30) ev.push(...step(E, 1/30, { zone, ...opts })); return ev; };

test('requesting rescue never completes it; the evacuee is only walking', () => {
  const E = [createEvacuee('MEDIC-1', 5, 0)];
  assert.equal(requestRescue(E, 'MEDIC-1').state, 'walking');
  assert.equal(E[0].state, 'walking');
  assert.equal(missionGate(E).complete, false);
});

test('an escorted evacuee travels the real distance and only then counts as safe', () => {
  const E = [createEvacuee('MEDIC-1', 5, 0)];
  requestRescue(E, 'MEDIC-1');
  const start = E[0].x;
  follow(E, 2);
  assert.ok(E[0].x > start + 1, 'it walked');
  assert.notEqual(E[0].state, 'safe', 'not yet');
  const ev = follow(E, 30);
  assert.equal(E[0].state, 'safe');
  assert.ok(ev.some(e => e.type === 'evacuated'));
  assert.equal(missionGate(E).complete, true);
});

test('without an escort nearby the evacuee is left behind, not rescued', () => {
  const E = [createEvacuee('MEDIC-1', 5, 0)];
  requestRescue(E, 'MEDIC-1');
  const ev = run(E, 3, { escorts: [{ id: 'FOUNDRY', x: 60, z: 60 }] });
  assert.equal(E[0].state, 'waiting');
  assert.ok(ev.some(e => e.type === 'left-behind'));
  assert.equal(missionGate(E).complete, false);
});

test('a blocker on the route stops the evacuee and reports it; it cannot pass through', () => {
  const E = [createEvacuee('MEDIC-1', 5, 0)];
  requestRescue(E, 'MEDIC-1');
  const ev = follow(E, 10, [{ x: 15, z: 0, r: 2 }]);
  assert.equal(E[0].state, 'blocked');
  assert.ok(E[0].x < 13, 'never entered the blocker');
  assert.ok(ev.some(e => e.type === 'route-blocked'));
  assert.equal(missionGate(E).complete, false);
});

test('carrying is slower than walking, and a carried evacuee still has to arrive', () => {
  assert.ok(EVAC.CARRY_SPEED < EVAC.WALK_SPEED);
  const E = [createEvacuee('MEDIC-2', 5, 0)];
  requestRescue(E, 'MEDIC-2');
  run(E, 2, { escorts: [{ id: 'THREAD', x: 5, z: 0, carrying: 'MEDIC-2' }] });
  assert.equal(E[0].state, 'carried');
});

test('mission gate lists the missing evacuee; a lost medic blocks completion', () => {
  const E = [createEvacuee('MEDIC-1', 30, 0), createEvacuee('MEDIC-2', 5, 0)];
  E[0].state = 'safe';
  const gate = missionGate(E);
  assert.equal(gate.complete, false);
  assert.deepEqual(gate.missing.map(m => m.id), ['MEDIC-2']);
  damage(E, 'MEDIC-2', 150);
  assert.deepEqual(missionGate(E).lost, ['MEDIC-2']);
  assert.equal(missionGate(E).complete, false, 'defeating enemies is not enough while a medic is missing');
});

test('a safe evacuee cannot be requested again or damaged back out of safety', () => {
  const E = [createEvacuee('MEDIC-1', 30, 0)];
  E[0].state = 'safe';
  assert.equal(requestRescue(E, 'MEDIC-1').reason, 'already-safe');
  assert.equal(damage(E, 'MEDIC-1', 50), null);
});

test('a medic left behind resumes walking when an escort returns (regression)', () => {
  const E = [createEvacuee('MEDIC-1', 5, 0)];
  requestRescue(E, 'MEDIC-1');
  run(E, 1, { escorts: [{ id: 'FOUNDRY', x: 60, z: 60 }] });
  assert.equal(E[0].state, 'waiting');
  follow(E, 30);
  assert.equal(E[0].state, 'safe', 'it walked in once the escort came back');
});
