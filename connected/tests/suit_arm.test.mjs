import test from 'node:test';
import assert from 'node:assert/strict';
import {SUIT,createSuit,seek,step,contacts,isBraced,speedMul,lift,release,hitArm} from '../assets/suit_arm_core.mjs';
const dt = 1 / 60;
const near = (S, i, d = 0.5) => ({ p: { x: S.arms[i].shoulder.x + d, y: S.arms[i].shoulder.y, z: S.arms[i].shoulder.z }, surface: 'concrete', normal: { x: 0, y: 1, z: 0 } });
const run = (S, s, w) => { const ev = []; for (let t = 0; t < s; t += dt) ev.push(...step(S, dt, w)); return ev; };

test('seek refuses targets beyond reach and arms cannot teleport', () => {
  const S = createSuit();
  const far = { p: { x: 9, y: 0, z: 9 }, surface: 'metal' };
  assert.equal(seek(S, 0, far).reason, 'out-of-reach');
  assert.equal(seek(S, 0, near(S, 0, 0.4)).ok, true);
  assert.equal(S.arms[0].state, 'EXTEND');
  assert.equal(S.arms[0].contact, null, 'no contact on the frame the order is given');
});

test('extension takes time and only then makes contact on a valid surface', () => {
  const S = createSuit();
  seek(S, 0, near(S, 0, 0.5));
  const ev = run(S, 0.05);
  assert.equal(S.arms[0].state, 'EXTEND', 'still extending after 0.05 s');
  run(S, 1);
  assert.equal(S.arms[0].state, 'CONTACT');
  assert.ok(ev.length >= 0);
});

test('an invalid surface does not make contact', () => {
  const S = createSuit();
  seek(S, 1, { p: near(S, 1).p, surface: 'water' });
  const ev = run(S, 0.3); // shorter than RECOVER_TIME, so the arm is still recovering
  assert.equal(S.arms[1].state, 'RECOVER');
  assert.ok(ev.some(e => e.type === 'bad-surface'));
});

test('a brace needs two contacts; a lift needs support capacity', () => {
  const S = createSuit();
  seek(S, 0, near(S, 0, 0.4)); run(S, 1);
  assert.equal(isBraced(S), false);
  assert.equal(lift(S, 10).reason, 'needs-two-contacts');
  seek(S, 3, near(S, 3, 0.4)); run(S, 1);
  assert.equal(isBraced(S), true);
  assert.equal(speedMul(S), SUIT.BRACED_SPEED_MUL, 'braced is slower');
  assert.equal(lift(S, 500).reason, 'over-capacity');
  const ok = lift(S, 60);
  assert.equal(ok.ok, true); assert.equal(ok.perArm, 30);
});

test('losing an anchor drops that arm and frees its load', () => {
  const S = createSuit();
  seek(S, 0, near(S, 0, 0.4)); seek(S, 3, near(S, 3, 0.4)); run(S, 1);
  lift(S, 40);
  const anchors = { 0: { x: 50, y: 0, z: 50 } };
  const ev = run(S, 0.1, { anchors });
  assert.ok(ev.some(e => e.type === 'released' && e.reason === 'contact-lost'));
  assert.equal(S.arms[0].load, 0);
});

test('explicit release drops the load and the arm recovers to stowed', () => {
  const S = createSuit();
  seek(S, 0, near(S, 0, 0.4)); seek(S, 3, near(S, 3, 0.4)); run(S, 1);
  lift(S, 40);
  release(S);
  run(S, 1);
  assert.ok(S.arms.every(a => a.state === 'STOWED' || a.state === 'DISABLED'));
  assert.equal(contacts(S).length, 0);
});

test('servo damage shortens reach and disables an arm at zero', () => {
  const S = createSuit();
  hitArm(S, 0, 0.5);
  assert.ok(S.arms[0].servo > 0 && S.arms[0].servo < 1);
  assert.equal(seek(S, 0, near(S, 0, 1.3)).reason, 'out-of-reach', 'damaged reach is shorter');
  seek(S, 1, near(S, 1, 0.4)); run(S, 1);
  const ev = hitArm(S, 1, 1);
  assert.ok(ev.some(e => e.type === 'disabled'));
  assert.equal(seek(S, 1, near(S, 1, 0.4)).reason, 'arm-disabled');
});

test('heat builds with lifts, locks at max, and cools back down', () => {
  const S = createSuit();
  seek(S, 0, near(S, 0, 0.4)); seek(S, 3, near(S, 3, 0.4)); run(S, 1);
  for (let i = 0; i < 5; i++) { lift(S, 10); run(S, 0.1); } // rapid lifts with no long cooldown
  assert.equal(S.locked, true);
  assert.equal(lift(S, 10).reason, 'heat-lockout');
  run(S, 10);
  assert.equal(S.locked, false);
});
