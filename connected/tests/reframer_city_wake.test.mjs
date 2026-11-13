// City-wide ReFramer wake + residue back to Metal's reserve (owner decision 2026-11-07)
import test from 'node:test';
import assert from 'node:assert/strict';
import {RF,createReframers,wake,step,hit} from '../assets/reframer_core.mjs';
const dt = 1 / 60;

test('ReFramer wakes city-wide: from 200 m away a cool nest still drops on a car', () => {
  const W = createReframers([{ x: 0, y: 12, z: 0 }]);
  const E = wake(W, { x: 200, z: 0 }, [{ id: 'c1', x: 20, z: 0, occupied: false }]);
  assert.ok(E, 'wakes from the city range');
  assert.equal(E.donor, 'c1');
});

test('ReFramer does not wake beyond the city range', () => {
  const W = createReframers([{ x: 0, y: 12, z: 0 }]);
  assert.equal(wake(W, { x: RF.WAKE + 25, z: 0 }, [{ id: 'c1', x: 20, z: 0 }]), null);
});

test('the donor must be near the nest (DONOR_R), not just near Metal', () => {
  const W = createReframers([{ x: 0, y: 12, z: 0 }]);
  assert.equal(wake(W, { x: 200, z: 0 }, [{ id: 'far', x: 200, z: 0 }]), null);
});

test('a Roadframe broken in the chase returns the fixed residue to the reserve', () => {
  const W = createReframers([{ x: 0, y: 12, z: 0 }]);
  wake(W, { x: 10, z: 0 }, [{ id: 'c1', x: 5, z: 0, occupied: false }]);
  for (let i = 0; i < 60 * 14; i++) step(W, { x: 10, z: 0 }, null, dt);
  let end = null;
  for (let i = 0; i < 5 && !end; i++) { const h = hit(W, 'glob', 1); if (h && h.type === 'end') end = h; }
  assert.ok(end, 'the Roadframe went down');
  assert.equal(end.residue, RF.RESIDUE);
});
