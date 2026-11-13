import test from 'node:test';
import assert from 'node:assert/strict';
import {RP,createPowers,absorb,interrupt,steal,counterSteal,startRegen,breakRegen,stepPowers,theftSpeedMul,theftArmorMul} from '../assets/reframer_powers_core.mjs';
const dt = 1 / 60;
test('kinetic storage: energy comes only from being hit, and decays when nothing happens', () => {
  const P = createPowers(); absorb(P); absorb(P); assert.equal(P.store, 2 * RP.STORE_PER_HIT);
  for (let t = 0; t < 30; t += dt) stepPowers(P, dt, { dist: 99 }); assert.equal(P.store, 0);
});
test('slam: needs charge, telegraphs first, and a hit during windup cancels it', () => {
  const P = createPowers(); absorb(P, 0.6);
  const ev = stepPowers(P, dt, { dist: 4 }); assert.ok(ev.some(e => e.type === 'slam-tell'), 'telegraphed');
  assert.equal(interrupt(P).type, 'slam-cancelled'); assert.equal(P.slam, null);
  const again = stepPowers(P, dt, { dist: 4 }); assert.ok(again.some(e => e.type === 'slam-tell'), 'charge kept, so it can start again');
});
test('slam: lands after the windup with damage scaled by charge, halved while Metal is airborne', () => {
  const grounded = createPowers(); absorb(grounded, 1);
  const air = createPowers(); absorb(air, 1);
  let hit = null, hitAir = null;
  for (let t = 0; t < RP.SLAM_WINDUP + 0.1 && !hit; t += dt) hit = stepPowers(grounded, dt, { dist: 3 }).find(e => e.type === 'slam');
  for (let t = 0; t < RP.SLAM_WINDUP + 0.1 && !hitAir; t += dt) hitAir = stepPowers(air, dt, { dist: 3, airborne: true }).find(e => e.type === 'slam');
  assert.ok(hit && hitAir);
  // charge bleeds off during the windup, so compare against the charge recorded at impact
  assert.ok(hit.charge > 0.9 && hit.charge <= 1, 'charge is high at impact');
  assert.ok(Math.abs(hit.dmg - RP.SLAM_DMG * hit.charge) < 1e-9, 'damage scales with charge, grounded');
  assert.ok(Math.abs(hitAir.dmg - RP.SLAM_DMG * hitAir.charge * RP.AIR_MUL) < 1e-9, 'airborne halves it');
  assert.equal(grounded.store, 0, 'the charge is spent');
});
test('theft: a wheel makes it faster while it lasts; Metal pulling with gallium gives the part back', () => {
  const P = createPowers();
  assert.equal(steal(P, 'wheel', 0.01).type, 'no-parts', 'needs reserve');
  assert.equal(steal(P, 'wheel', 1).type, 'stolen'); assert.equal(theftSpeedMul(P), RP.THEFT_SPEED_MUL);
  const ev = stepPowers(P, dt, { metalPulling: true }); assert.ok(ev.some(e => e.type === 'part-returned'));
  assert.equal(theftSpeedMul(P), 1);
});
test('theft: armour theft cuts damage taken until it runs out', () => {
  const P = createPowers(); steal(P, 'armor', 1); assert.equal(theftArmorMul(P), RP.THEFT_ARMOR_MUL);
  let over = null; for (let t = 0; t < RP.THEFT_T + 0.1 && !over; t += dt) over = stepPowers(P, dt, {}).find(e => e.type === 'theft-over');
  assert.ok(over); assert.equal(theftArmorMul(P), 1);
});
test('regeneration: spends a part, takes time, and a hit on the arm being rebuilt breaks it', () => {
  const P = createPowers();
  assert.equal(startRegen(P, 2, 0.01).type, 'no-parts');
  assert.equal(startRegen(P, 2, 1).type, 'regen-start');
  assert.equal(breakRegen(P).type, 'regen-broken'); assert.equal(P.regen, null);
  startRegen(P, 2, 1); let done = null; for (let t = 0; t < RP.REGEN_T + 0.1 && !done; t += dt) done = stepPowers(P, dt, {}).find(e => e.type === 'regen-done');
  assert.ok(done); assert.equal(done.arm, 2);
});
