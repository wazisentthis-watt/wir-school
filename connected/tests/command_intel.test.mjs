import test from 'node:test';
import assert from 'node:assert/strict';
import {MARK,createMarkers,scanMark,stepMarkers,usableBy,PHASE,CUE,cueFor,interruptOutcome} from '../assets/command_intel_core.mjs';
import {readFileSync} from 'node:fs';

test('#20 only Thread can create a marker, and only with line of sight in scan range', () => {
  const M = createMarkers();
  assert.equal(scanMark(M, {x:0,z:0}, {x:5,z:0}, {los:false}).reason, 'no-line-of-sight', 'no wall-through reveal');
  assert.equal(scanMark(M, {x:0,z:0}, {x:5,z:0}, {los:true, scanner:'FOUNDRY'}).reason, 'only-thread-scans');
  assert.equal(scanMark(M, {x:0,z:0}, {x:99,z:0}, {los:true}).reason, 'out-of-scan-range');
  assert.equal(scanMark(M, {x:0,z:0}, {x:5,z:0}, {los:true}).ok, true);
});

test('#20 markers expire and are not permanent', () => {
  const M = createMarkers();
  scanMark(M, {x:0,z:0}, {x:5,z:0}, {los:true});
  let ev = [];
  for (let t = 0; t < MARK.TTL + 0.5; t += 0.1) ev.push(...stepMarkers(M, 0.1));
  assert.equal(M.list.length, 0);
  assert.ok(ev.some(e => e.type === 'expired'));
});

test('#20 a fresh scan refreshes a nearby marker rather than stacking duplicates', () => {
  const M = createMarkers();
  scanMark(M, {x:0,z:0}, {x:5,z:0}, {los:true});
  stepMarkers(M, 4);
  const r = scanMark(M, {x:0,z:0}, {x:5.5,z:0}, {los:true});
  assert.equal(r.refreshed, true);
  assert.equal(M.list.length, 1);
  assert.equal(M.list[0].ttl, MARK.TTL);
});

test('#20 only Bulwark and Foundry use markers, and only in use range and while live', () => {
  const M = createMarkers();
  scanMark(M, {x:0,z:0}, {x:5,z:0}, {los:true});
  assert.equal(usableBy(M, 'BULWARK', {x:0,z:0}).length, 1);
  assert.equal(usableBy(M, 'FOUNDRY', {x:0,z:0}).length, 1);
  assert.equal(usableBy(M, 'THREAD', {x:0,z:0}).length, 0, 'the scout does not consume its own marker');
  assert.equal(usableBy(M, 'BULWARK', {x:200,z:0}).length, 0, 'out of use range');
  stepMarkers(M, MARK.TTL + 1);
  assert.equal(usableBy(M, 'FOUNDRY', {x:0,z:0}).length, 0, 'expired markers are not usable');
});

test('#32 the cue table covers exactly the real encounter stages', () => {
  assert.deepEqual(Object.keys(CUE).sort(), [...PHASE].sort());
  // the real stage names appear as lowercase literals in the encounter core
  const src = readFileSync(new URL('../assets/reframer_core.mjs', import.meta.url), 'utf8');
  for (const s of ['read', 'anchor', 'release', 'reframe', 'chase', 'stagger', 'stun']) assert.ok(src.includes("'" + s + "'"), 'core has stage ' + s);
});

test('#32 every stage has visual, audio and caption so a muted or low-effects player still gets the cue', () => {
  for (const s of PHASE) {
    const c = cueFor(s);
    assert.ok(c.visual && c.audio && c.caption && c.label, s);
  }
});

test('#32 interrupts work differently per stage and give distinct observable outcomes', () => {
  assert.match(interruptOutcome('read', {kind:'pulse'}), /read-broken/);
  assert.match(interruptOutcome('anchor', {kind:'glob'}), /anchor-broken/);
  assert.match(interruptOutcome('anchor', {kind:'tip'}), /tipped/);
  assert.match(interruptOutcome('release', {kind:'strike', power:0.9}), /fled-with-parts/);
  assert.equal(interruptOutcome('read', {kind:'strike', power:0.9}), null, 'a strike does not break a read');
  assert.equal(interruptOutcome('chase', {kind:'glob'}), null);
  const outcomes = ['read', 'anchor', 'tip'].map(s => interruptOutcome(s, {kind: s === 'anchor' ? 'glob' : s === 'read' ? 'pulse' : 'tip'}));
  assert.equal(new Set(outcomes).size, 3, 'each interruption is distinct');
});
