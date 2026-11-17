// Regression tests for the Roadframe chase: no omniscient chase, no overshoot, rams need a real goal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RF, createReframers, wake, step } from '../assets/reframer_core.mjs';
const dt = 1 / 60;

function chasing(target = { x: 5, z: 0 }) {
  const W = createReframers([{ x: 0, y: 12, z: 0 }]);
  wake(W, { x: 10, z: 0 }, [{ id: 'c1', x: target.x, z: target.z, occupied: false }]);
  W.enc.stage = 'chase';
  W.enc.t = 0;
  W.enc.target = { x: target.x, z: target.z };
  return W;
}

test('legacy callers with no hunt state still chase Metal directly', () => {
  const W = chasing({ x: 5, z: 0 });
  step(W, { x: 30, z: 0 }, null, dt);
  step(W, { x: 30, z: 0 }, null, dt);
  assert.ok(W.enc.target.x > 5, 'moves toward Metal at x=30');
});

test('with a hunt state that has no goal yet, the Roadframe does not chase Metal', () => {
  const W = chasing({ x: 5, z: 0 });
  for (let i = 0; i < 180; i++) step(W, { x: 30, z: 0 }, null, dt, { goal: null, canRam: false });
  assert.equal(W.enc.target.x, 5, 'it cannot know where Metal is until its hunt has seen him');
});

test('with a hunt goal, the Roadframe chases the goal, not Metal', () => {
  const W = chasing({ x: 5, z: 0 });
  step(W, { x: 30, z: 0 }, null, dt, { goal: { x: -20, z: 0 }, canRam: false });
  assert.ok(W.enc.target.x < 5, 'moves toward the goal at x=-20');
});

test('the Roadframe stops on its goal instead of overshooting it', () => {
  const W = chasing({ x: 0, z: 0 });
  step(W, { x: 0.01, z: 0 }, null, 1, { goal: { x: 0.01, z: 0 }, canRam: false });
  assert.ok(Math.abs(W.enc.target.x - 0.01) < 1e-9, `expected to stop on 0.01, got ${W.enc.target.x}`);
});

test('a ram needs a real goal and canRam; no goal means no ram', () => {
  const noGoal = chasing({ x: 5, z: 0 });
  let rams = 0;
  for (let i = 0; i < 60; i++) rams += step(noGoal, { x: 5, z: 0 }, null, dt, { goal: null, canRam: true }).ram > 0 ? 1 : 0;
  assert.equal(rams, 0);

  const withGoal = chasing({ x: 5, z: 0 });
  const out = step(withGoal, { x: 5, z: 0 }, null, dt, { goal: { x: 5, z: 0 }, canRam: true });
  assert.equal(out.ram, RF.RAM_DMG);
});

test('a ram is refused when the hunt says it cannot ram', () => {
  const W = chasing({ x: 5, z: 0 });
  const out = step(W, { x: 5, z: 0 }, null, dt, { goal: { x: 5, z: 0 }, canRam: false });
  assert.equal(out.ram, 0);
});
