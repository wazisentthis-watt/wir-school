import test from 'node:test';
import assert from 'node:assert/strict';
import {createCinderPass,requestMedic,order,tick,status,interruptHostile,hitHostile,invariants,saveCinderPass} from '../assets/cinder_pass_core.mjs';

const zone = { x: 30, z: 0, r: 2 };
const fresh = () => createCinderPass({
  squadStarts: { GENERAL: { x: 0, z: 0 }, BULWARK: { x: 4, z: 0 }, FOUNDRY: { x: 0, z: 4 }, THREAD: { x: 0, z: -4 } },
  medics: [{ id: 'MEDIC-1', x: 6, z: 0 }, { id: 'MEDIC-2', x: 6, z: 2 }],
  zone, hostile: { x: 50, z: 50, hp: 100 },
});

// Test driver: Bulwark re-issues a MOVE to the medic it guards, as a player or squad order would.
function escortLoop(C, secs, { blockers = [] } = {}) {
  const dt = 1 / 20;
  for (let t = 0; t < secs; t += dt) {
    const walking = C.evac.filter(e => e.state === 'walking' || e.state === 'carried');
    if (walking.length) order(C, 'BULWARK', 'MOVE', { at: { x: walking[0].x, z: walking[0].z } });
    tick(C, dt, { blockers });
  }
}

test('a medic cannot be rescued by request alone', () => {
  const C = fresh();
  requestMedic(C, 'MEDIC-1');
  tick(C, 1);
  assert.equal(status(C).complete, false);
  assert.equal(C.evac.find(e => e.id === 'MEDIC-1').state, 'waiting', 'no escort in range, so it is not moving');
});

test('a full win needs both medics physically safe and the hostile neutralized', () => {
  const C = fresh();
  requestMedic(C, 'MEDIC-1'); requestMedic(C, 'MEDIC-2');
  escortLoop(C, 5);
  assert.equal(status(C).medicsSafe, false, 'after 5 s they are still on the way');
  assert.equal(status(C).complete, false);
  escortLoop(C, 40); // they keep walking with the escort until they physically arrive
  assert.equal(status(C).medicsSafe, true, 'they arrived by walking');
  assert.equal(status(C).complete, false, 'medics safe alone is not a win');
  hitHostile(C, 100);
  assert.equal(status(C).complete, true);
  assert.deepEqual(invariants(C), []);
});

test('a lost medic fails the mission, even with the hostile down', () => {
  const C = fresh();
  requestMedic(C, 'MEDIC-1');
  C.evac[0].hp = 0; C.evac[0].state = 'lost';
  hitHostile(C, 100);
  const s = status(C);
  assert.equal(s.failed, true);
  assert.equal(s.complete, false);
});

test('interrupting the hostile build (#35) leaves it with a reduced move set', () => {
  const C = fresh();
  const before = status(C).hostileNeutral;
  interruptHostile(C, 'read');
  assert.equal(before, false);
  assert.equal(status(C).hostileNeutral, true, 'a hostile that only read has no attached drive parts left, so it cannot move or attack');
  const loose = C.log.find(e => e.type === 'hostile-interrupted').loose;
  assert.ok(loose.chassis === 1, 'its chassis fell loose and is recoverable');
});

test('a refused order changes nothing and is logged with a reason', () => {
  const C = fresh();
  const before = JSON.stringify(C.squad.units.FOUNDRY);
  const r = order(C, 'FOUNDRY', 'HARVEST', {});
  assert.equal(r.reason, 'not-implemented');
  assert.equal(JSON.stringify(C.squad.units.FOUNDRY), before);
  assert.equal(C.log.at(-1).ok, false);
});

test('a blocker on the route is reported, the medic does not pass through it, and the mission stays open', () => {
  const C = fresh();
  requestMedic(C, 'MEDIC-1');
  escortLoop(C, 15, { blockers: [{ x: 14, z: 0, r: 2 }] });
  assert.equal(C.evac[0].state, 'blocked');
  assert.ok(C.evac[0].x < 12);
  assert.ok(C.log.some(e => e.type === 'route-blocked'));
  assert.equal(status(C).complete, false);
});

test('invariants stay clean through a full mission and the save is a valid JSON snapshot', () => {
  const C = fresh();
  requestMedic(C, 'MEDIC-1'); requestMedic(C, 'MEDIC-2');
  for (let i = 0; i < 40; i++) { escortLoop(C, 1); assert.deepEqual(invariants(C), [], 'tick ' + i); }
  const save = JSON.parse(saveCinderPass(C));
  assert.equal(save.v, 1);
  assert.equal(save.evac.length, 2);
});

test('the four squad units start where placed and none is teleported by switching', () => {
  const C = fresh();
  assert.deepEqual({ x: C.squad.units.BULWARK.x, z: C.squad.units.BULWARK.z }, { x: 4, z: 0 });
});
