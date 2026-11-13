import test from 'node:test';
import assert from 'node:assert/strict';
import { v3, len, interceptTime, turnToward, predictDisplacement, leadPoint, locksOn } from '../assets/intercept_core.mjs';

const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('intercept time against a still target is distance over speed', () => {
  assert.ok(near(interceptTime(v3(10, 0, 0), v3(0, 0, 0), 10), 1));
});

test('intercept time against a target moving away', () => {
  // |10 + 5t| = 10t  ->  t = 2
  assert.ok(near(interceptTime(v3(10, 0, 0), v3(5, 0, 0), 10, 10), 2));
});

test('intercept time head on', () => {
  // |10 - 5t| = 10t  ->  t = 2/3
  assert.ok(near(interceptTime(v3(10, 0, 0), v3(-5, 0, 0), 10), 2 / 3));
});

test('turnToward is capped per call and keeps unit length', () => {
  const out = turnToward(v3(1, 0, 0), v3(0, 1, 0), Math.PI / 4);
  assert.ok(near(len(out), 1));
  assert.ok(near(Math.acos(out.x), Math.PI / 4));
});

test('turnToward snaps when the target is within the cap', () => {
  const out = turnToward(v3(1, 0, 0), v3(1, 0.01, 0), Math.PI / 4);
  assert.ok(near(out.y, len(v3(0, 0.01, 0)) / Math.hypot(1, 0.01), 1e-6) || Math.abs(out.y - 0.01 / Math.hypot(1, 0.01)) < 1e-6);
});

test('a dashing target is predicted along its dash, then bleeds speed', () => {
  const vel = v3(10, 0, 0);
  const onDash = predictDisplacement(vel, 0.2, { remaining: 0.5 });
  assert.ok(near(onDash.x, 2));
  const afterDash = predictDisplacement(vel, 2, { remaining: 0.5 });
  assert.ok(afterDash.x < 10 * 2, 'speed bleeds after the dash, so it overshoots less');
});

test('lead point lands on a moving target path, not where it was', () => {
  const shooter = { pos: v3(0, 0, 0) };
  const target = { pos: v3(10, 0, 0), vel: v3(0, 0, 5) };
  const lp = leadPoint(shooter.pos, target, 10);
  assert.ok(lp.point.z > 0, 'leads the target along its motion');
  // the lead point is reached at the same time as the shot
  const arrive = len(lp.point) / 10;
  assert.ok(Math.abs(arrive - lp.T) < 0.05);
});

test('lock only inside range and cone', () => {
  assert.equal(locksOn(10, 0.2), true);
  assert.equal(locksOn(25, 0.2), false);
  assert.equal(locksOn(10, Math.PI / 2), false);
});
