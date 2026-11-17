import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPO, createTempo, onHuntEvents, tickTempo, registerHit, moveSpeedMul } from '../assets/fight_tempo_core.mjs';
// the core clamps each step to 0.1 s (like the hunt core), so tests advance time in frame-sized steps
const passTime = (T, secs) => { for (let t = 0; t < secs - 1e-9; t += 1 / 60) tickTempo(T, 1 / 60); };

test('dodging a tether opens a riposte that multiplies the next hit once', () => {
  const T = createTempo();
  const ev = onHuntEvents(T, [{ type: 'tether-dodged' }]);
  assert.equal(ev[0].type, 'riposte-open');
  const first = registerHit(T);
  assert.ok(first.parts.includes('riposte'));
  assert.ok(first.mul >= TEMPO.RIPOSTE_MUL);
  assert.equal(T.counters, 1);
  const second = registerHit(T);
  assert.ok(!second.parts.includes('riposte'), 'the counter is spent after one hit');
});

test('the riposte window expires if Metal does not follow up', () => {
  const T = createTempo();
  onHuntEvents(T, [{ type: 'tether-dodged' }]);
  passTime(T, TEMPO.RIPOSTE_T + 0.1);
  const h = registerHit(T);
  assert.ok(!h.parts.includes('riposte'));
});

test('a chain builds damage with each hit inside the window, then resets', () => {
  const T = createTempo();
  const a = registerHit(T), b = registerHit(T), c = registerHit(T);
  assert.equal(a.chain, 1);
  assert.equal(b.chain, 2);
  assert.equal(c.chain, 3);
  assert.ok(c.mul > b.mul && b.mul > a.mul - 1e-9, 'damage climbs with the chain');
  passTime(T, TEMPO.CHAIN_WINDOW + 0.1);
  assert.equal(registerHit(T).chain, 1, 'the chain resets after the window');
});

test('the chain bonus is capped', () => {
  const T = createTempo();
  let h;
  for (let i = 0; i < 60; i++) { h = registerHit(T); passTime(T, 0.01); }
  assert.ok(h.mul <= 1 + TEMPO.CHAIN_CAP + 1e-9);
});

test('being caught breaks the combo', () => {
  const T = createTempo();
  registerHit(T); registerHit(T);
  onHuntEvents(T, [{ type: 'tether-caught' }]);
  assert.equal(registerHit(T).chain, 1);
});

test('breaking free gives a speed burst that wears off', () => {
  const T = createTempo();
  onHuntEvents(T, [{ type: 'tether-escaped' }]);
  assert.equal(moveSpeedMul(T), TEMPO.BURST_SPEED);
  assert.equal(T.breakFrees, 1);
  passTime(T, TEMPO.BURST_T + 0.1);
  assert.equal(moveSpeedMul(T), 1);
});

test('events it does not know are ignored, and bad dt is safe', () => {
  const T = createTempo();
  assert.deepEqual(onHuntEvents(T, [{ type: 'tether-warn' }, null, {}]), []);
  tickTempo(T, NaN);
  assert.equal(T.riposte, 0);
});
