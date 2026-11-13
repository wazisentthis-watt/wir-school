import test from 'node:test';
import assert from 'node:assert/strict';
import {createSalvage,registerDonor,scan,harvest,buildBarricade,coverFromScrap,dismantle,rebuildDonor,invariants,totalMass,BARRICADE} from '../assets/foundry_salvage_core.mjs';
const car = (id, cond = 1) => [
  { id: id+'-w1', kind: 'wheel', material: 'rubber', massKg: 25, condition: cond },
  { id: id+'-w2', kind: 'wheel', material: 'rubber', massKg: 25, condition: 1 },
  { id: id+'-door', kind: 'door', material: 'steel', massKg: 40, condition: 1 },
  { id: id+'-eng', kind: 'engine', material: 'aluminum', massKg: 90, condition: 1 },
  { id: id+'-mystery', kind: 'panel', material: 'unobtainium', massKg: 15, condition: 1 },
];
const setup = () => { const S = createSalvage(); registerDonor(S, 'CAR-1', car('CAR-1', 0.2)); return S; };

test('scanner labels materials and reports unknown with no invented mass (#21)', () => {
  const S = setup();
  const r = scan(S, ['CAR-1-door', 'CAR-1-mystery']);
  assert.equal(r[0].label, 'steel'); assert.equal(r[0].massKg, 40);
  assert.equal(r[1].label, 'unknown'); assert.equal(r[1].massKg, null);
});

test('harvest is single-owner and keeps condition (#23)', () => {
  const S = setup();
  assert.equal(harvest(S, 'CAR-1-w1').condition, 0.2, 'damaged wheel keeps its condition');
  assert.equal(harvest(S, 'CAR-1-w1').reason, 'already-owned');
  assert.equal(harvest(S, 'CAR-1-w2', { reachOk: false }).reason, 'out-of-reach');
});

test('failed barricade changes nothing: no deduction, no construct, reason given', () => {
  const S = setup();
  harvest(S, 'CAR-1-door'); harvest(S, 'CAR-1-w2');
  const before = JSON.stringify([...S.parts.values()]);
  const r = buildBarricade(S, ['CAR-1-door', 'CAR-1-w2']);
  assert.equal(r.reason, 'too-few-parts');
  assert.equal(S.constructs.size, 0);
  assert.equal(JSON.stringify([...S.parts.values()]), before);
});

test('barricade needs carried parts, mass, and two sound parts; success deducts exactly', () => {
  const S = setup();
  ['CAR-1-door', 'CAR-1-eng', 'CAR-1-w2'].forEach(id => harvest(S, id));
  const m0 = totalMass(S);
  const ok = buildBarricade(S, ['CAR-1-door', 'CAR-1-eng', 'CAR-1-w2']);
  assert.equal(ok.ok, true); assert.equal(ok.massKg, 155);
  assert.equal(totalMass(S), m0, 'mass conserved, nothing created');
  assert.deepEqual(invariants(S), []);
});

test('damaged scrap is allowed only as cover (#27)', () => {
  const S = setup();
  harvest(S, 'CAR-1-w1');
  assert.equal(coverFromScrap(S, ['CAR-1-w1']).ok, true);
  const S2 = setup(); harvest(S2, 'CAR-1-door');
  assert.equal(coverFromScrap(S2, ['CAR-1-door']).reason, 'sound-part-not-scrap');
});

test('dismantle returns parts to the world at their condition (#54)', () => {
  const S = setup();
  ['CAR-1-door', 'CAR-1-eng', 'CAR-1-w2'].forEach(id => harvest(S, id));
  const { id } = buildBarricade(S, ['CAR-1-door', 'CAR-1-eng', 'CAR-1-w2']);
  const r = dismantle(S, id);
  assert.equal(r.returned, 3);
  assert.equal(S.parts.get('CAR-1-w1').condition, 0.2);
  assert.deepEqual(invariants(S), []);
});

test('a donor rebuilds only from its own complete parts, and only once (#30)', () => {
  const S = setup();
  assert.equal(rebuildDonor(S, 'CAR-1').reason, 'incomplete');
  for (const p of S.donors.get('CAR-1').partIds) harvest(S, p);
  const r = rebuildDonor(S, 'CAR-1');
  assert.equal(r.ok, true);
  assert.equal(rebuildDonor(S, 'CAR-1').reason, 'already-rebuilt', 'no duplicate intact car');
  assert.deepEqual(invariants(S), []);
});

test('duplicate part ids and duplicate donors are refused', () => {
  const S = setup();
  assert.equal(registerDonor(S, 'CAR-1', []).reason, 'donor-exists');
  assert.equal(registerDonor(S, 'CAR-2', [{ id: 'CAR-1-door', kind: 'door', material: 'steel', massKg: 40 }]).reason, 'duplicate-part');
});
