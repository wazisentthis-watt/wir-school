import test from 'node:test';
import assert from 'node:assert/strict';
import {SB,createStreet,witness,hitStreet,stepStreet,incomingMul,outgoingMul} from '../assets/street_brawl_core.mjs';
const dt = 1 / 60;
test('bystanders do not fight on their own: a near passer-by alarms, and only a swing turns them into a fighter', () => {
  const S = createStreet('p1', 'brawler', false);
  assert.equal(witness(S, 4, false).type, 'alarm'); assert.equal(S.state, 'alarm');
  assert.equal(witness(S, 20, false), null, 'far away: nothing');
  assert.equal(witness(S, 1.2, true).type, 'fight', 'swing within reach: they fight back');
});
test('an alarmed commuter runs; the alarm settles back to walking after ALARM_T', () => {
  const S = createStreet('p2', 'commuter');
  witness(S, 4, false); const o = stepStreet(S, dt, 4);
  assert.equal(o.anim, 'run'); assert.equal(o.speed, SB.FLEE_SPEED);
  let calm = null; for (let t = 0; t < SB.ALARM_T + 0.1 && !calm; t += dt) calm = stepStreet(S, dt, 4).events.find(e => e.type === 'calm');
  assert.ok(calm); assert.equal(S.state, 'walk');
});
test('a fighter runs the NGB cycle: windup, impact lands once in reach, then a cooldown', () => {
  const S = createStreet('p3', 'brawler'); witness(S, 1, true);
  let impacts = 0, saw = new Set();
  for (let t = 0; t < 3; t += dt) { const o = stepStreet(S, dt, 1); if (o.strike) saw.add(o.strike); impacts += o.events.filter(e => e.type === 'impact').length; }
  assert.ok(saw.has('windup') && saw.has('impact') && saw.has('end'));
  assert.equal(impacts, 2, 'one impact per cycle over 3 s (cycle ≈ END + cd ≈ 1.65 s)');
});
test('daze builds with hits and stuns at the threshold; body hits stagger; daze decays back', () => {
  const S = createStreet('p4', 'brawler'); let r;
  for (let i = 0; i < 3; i++) r = hitStreet(S, { heavy: true });
  assert.equal(r.stunned, true, 'three heavy hits stun'); assert.ok(S.stun > 0);
  assert.equal(stepStreet(S, dt, 1).anim, 'stunned');
  const T = createStreet('p5', 'brawler'); hitStreet(T, { body: true }); assert.equal(stepStreet(T, dt, 1).anim, 'stagger');
  for (let t = 0; t < 10; t += dt) stepStreet(T, dt, 1); assert.ok(T.daze < 1, 'daze drains off');
});
test('each fighter carries one power: a vendor guards, a commuter throws a telegraphed part, a brawler surges', () => {
  const V = createStreet('v', 'vendor'); witness(V, 1, true);
  let guardMul = 1; for (let t = 0; t < 8; t += dt) { const o = stepStreet(V, dt, 4); if (o.events.some(e => e.type === 'power' && e.power === 'guard')) guardMul = incomingMul(V); }
  assert.equal(guardMul, SB.GUARD_MUL, 'guard cuts incoming damage while it lasts');
  const C = createStreet('c', 'commuter'); witness(C, 1, true);
  let tell = false, thrown = null; for (let t = 0; t < 10 && !thrown; t += dt) { const o = stepStreet(C, dt, 4); if (o.power === 'tell') tell = true; thrown = o.events.find(e => e.type === 'throw'); }
  assert.ok(tell, 'telegraphed first'); assert.ok(thrown, 'then the thrown part'); assert.equal(thrown.dmg, SB.THROW_DAMAGE);
  const B = createStreet('b', 'brawler'); witness(B, 1, true);
  for (let t = 0; t < 10; t += dt) stepStreet(B, dt, 4);
  assert.equal(outgoingMul(B), 1, 'surge is only active after it is cast');
});
