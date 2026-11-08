// Prologue · Learn the City + Scrap crew — PROPOSAL / HOLD (2026-11-07)
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRO,STEPS,createPro,feed,step,powersDone,serialize,deserialize} from '../assets/prologue_core.mjs';
import {SC,createCrew,step as cStep,markOut,bind,take,boundCount,canBind,isSurrendered} from '../assets/scrap_crew_core.mjs';
const dt = 1 / 60;
const W = (o = {}) => ({ riding: false, speed: 0, crewDist: 99, crewBound: 0, crewTotal: 3, cardsTotal: 4, nextDist: 99, ...o });

test('prologue: the whole run, step by step, in order', () => {
  const M = createPro(); const seen = [M.step]; const tick = (w, n = 2) => { for (let i = 0; i < n; i++) for (const e of step(M, W(w), dt).events) if (e.type === 'step') seen.push(e.step); };
  feed(M, 'look', 2.5); tick();
  feed(M, 'walk', 11); feed(M, 'jump'); tick();
  tick({ riding: true }); tick({ riding: true, speed: 6 });
  for (let i = 0; i < 3; i++) feed(M, 'gate'); tick({ riding: true });
  feed(M, 'pop'); tick({ riding: true });
  feed(M, 'gallop', 3); tick({ riding: true });
  feed(M, 'swing'); tick(); feed(M, 'snap'); tick();
  tick({ crewDist: 10 });
  feed(M, 'down'); feed(M, 'bind'); tick({ crewBound: 3 });
  for (let t = 0; t < PRO.PICKUP_T + 0.1; t += dt) step(M, W(), dt); seen.push(M.step);
  for (const c of ['glob', 'blast', 'pull', 'gallop']) feed(M, 'card', c);
  for (const p of ['glob', 'blast', 'pull', 'sword']) feed(M, 'power', p);
  tick(); assert.equal(M.ledger.completed, true, 'completing the power cycle completes the mission');
  tick({ nextDist: 5 });
  assert.deepEqual(seen, STEPS);
});

test('prologue: teaching steps never block you — they pass after a grace period and are logged', () => {
  const M = createPro();
  for (let t = 0; t < PRO.GRACE + 0.1; t += dt) step(M, W(), dt);
  assert.equal(M.step, 'walk'); assert.deepEqual(M.skipped, ['where']);
});

test('prologue: the fight is not skippable; a wipe sends you back to the crew', () => {
  const M = createPro(); M.step = 'fight';
  for (let t = 0; t < PRO.GRACE * 2; t += 0.5) step(M, W(), 0.5);
  assert.equal(M.step, 'fight');
  feed(M, 'wiped'); assert.equal(M.step, 'toCrew'); assert.equal(M.ledger.wipes, 1);
});

test('prologue: the power cycle needs every card seen, glob + blast + pull, and one form', () => {
  const M = createPro(); M.step = 'powers';
  for (const c of ['a', 'b', 'c']) feed(M, 'card', c);
  for (const p of ['glob', 'blast', 'pull']) feed(M, 'power', p);
  assert.equal(powersDone(M, 3), false, 'no form yet'); feed(M, 'power', 'shield'); assert.equal(powersDone(M, 3), true);
  assert.equal(powersDone(M, 4), false, 'one card not seen');
});

test('prologue: save keeps a checkpoint — mid-fight reloads at the crew', () => {
  const M = createPro(); M.step = 'fight'; M.used = ['glob'];
  const R = deserialize(serialize(M)); assert.equal(R.step, 'toCrew'); assert.deepEqual(R.used, ['glob']);
  assert.equal(deserialize('{"v":9}'), null); assert.equal(deserialize('nope'), null);
});

// --- Scrap crew ---
const routes = [[{ x: 0, z: 10 }, { x: 0, z: 60 }], [{ x: 0, z: -10 }, { x: 0, z: -60 }]];
test('crew: Metal coming close alerts them; the lookout runs the route that leads away from Metal', () => {
  const C = createCrew(); const mem = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }];
  const o = cStep(C, { metal: { x: 0, z: 12 }, members: mem, routes }, dt);
  assert.ok(o.events.some(e => e.type === 'alert'));
  assert.deepEqual(C.members.map(m => m.state), ['fight', 'throw', 'flee']);
  assert.equal(C.members[2].route[1].z, -60, 'runs away, not into him');
});

test('crew: the thrower keeps his distance, winds up visibly, then throws', () => {
  const C = createCrew(); C.alerted = true; C.members[1].state = 'throw'; C.members[1].throwCd = 0;
  let o = cStep(C, { metal: { x: 0, z: 3 }, members: [null, { x: 0, z: 0 }, null], routes }, dt);
  assert.ok(o.events.some(e => e.type === 'tell'), 'wind-up first');
  let thrown = null; for (let t = 0; t < SC.TELL + 0.1 && !thrown; t += dt) { o = cStep(C, { metal: { x: 0, z: 9 }, members: [null, { x: 0, z: 0 }, null], routes }, dt); thrown = o.events.find(e => e.type === 'throw'); }
  assert.ok(thrown, 'then the brick');
  o = cStep(C, { metal: { x: 0, z: 3 }, members: [null, { x: 0, z: 0 }, null], routes }, dt);
  assert.ok(o.intents[1].move && o.intents[1].move.z < 0, 'too close: he backs off');
});

test('crew: catch the lookout and he gives up; he tires out so he can always be caught', () => {
  const C = createCrew(); C.alerted = true; const L = C.members[2]; L.state = 'flee'; L.route = routes[0]; L.ri = 0;
  let o = cStep(C, { metal: { x: 0, z: 30 }, members: [null, null, { x: 0, z: 5 }], routes }, dt);
  assert.equal(o.intents[2].move.speed, SC.FLEE_SPEED);
  L.fleeT = SC.WINDED_T + 1; o = cStep(C, { metal: { x: 0, z: 30 }, members: [null, null, { x: 0, z: 5 }], routes }, dt);
  assert.equal(o.intents[2].move.speed, SC.WINDED_SPEED);
  o = cStep(C, { metal: { x: 0, z: 6 }, members: [null, null, { x: 0, z: 5 }], routes }, dt);
  assert.ok(o.events.some(e => e.type === 'surrender' && e.why === 'caught'));
});

test('crew: with two out, the last one gives up; out or surrendered can be bound, then taken by police', () => {
  const C = createCrew(); C.alerted = true; C.members[0].state = 'fight'; C.members[1].state = 'throw'; C.members[2].state = 'flee';
  markOut(C, 0); markOut(C, 2);
  const o = cStep(C, { metal: { x: 0, z: 9 }, members: [{ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, z: 2 }], routes }, dt);
  assert.ok(o.events.some(e => e.type === 'surrender' && e.why === 'last')); assert.equal(isSurrendered(C, 1), true);
  assert.equal(canBind(C, 0), true); bind(C, 0); bind(C, 1); bind(C, 2);
  assert.equal(boundCount(C), 3); assert.ok(take(C, 0)); assert.equal(boundCount(C), 3, 'taken still counts as restrained');
  assert.equal(bind(C, 0), null, 'cannot bind twice');
});
