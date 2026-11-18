// WIR REFRAMER COMMAND: shared markers (#20) and enemy phase cues (#32). PROPOSAL / PUBLISH HOLD.
// Pure state, no THREE.

// ---- #20 Thread's scans leave short-lived markers that Bulwark and Foundry can use.
export const MARK = Object.freeze({ TTL: 6, SCAN_RANGE: 30, USE_RANGE: 25, MERGE_R: 2, USERS: ['BULWARK', 'FOUNDRY'] });

export function createMarkers() { return { list: [], nextId: 1 }; }

// Only a scan with line of sight can mark. No wall-through reveals.
export function scanMark(M, from, target, { los = false, scanner = 'THREAD' } = {}) {
  if (scanner !== 'THREAD') return { ok: false, reason: 'only-thread-scans' };
  if (!los) return { ok: false, reason: 'no-line-of-sight' };
  if (Math.hypot(from.x - target.x, from.z - target.z) > MARK.SCAN_RANGE) return { ok: false, reason: 'out-of-scan-range' };
  const near = M.list.find(m => Math.hypot(m.x - target.x, m.z - target.z) < MARK.MERGE_R);
  if (near) { near.ttl = MARK.TTL; return { ok: true, id: near.id, refreshed: true }; }
  const id = 'MK' + M.nextId++;
  M.list.push({ id, x: target.x, z: target.z, ttl: MARK.TTL, by: scanner });
  return { ok: true, id, refreshed: false };
}

export function stepMarkers(M, dt) {
  const events = [];
  for (const m of M.list) m.ttl -= dt;
  M.list = M.list.filter(m => {
    if (m.ttl > 0) return true;
    events.push({ type: 'expired', id: m.id });
    return false;
  });
  return events;
}

// Markers a unit may act on: live, in use range, and only for the users the doc names.
export function usableBy(M, unitId, unitPos) {
  if (!MARK.USERS.includes(unitId)) return [];
  return M.list.filter(m => m.ttl > 0 && Math.hypot(m.x - unitPos.x, m.z - unitPos.z) <= MARK.USE_RANGE);
}

// ---- #32 Readable phase cues. Stage names and interrupt rules mirror reframer_core.mjs.
export const PHASE = Object.freeze(['drop', 'read', 'anchor', 'release', 'reframe', 'chase', 'stagger', 'stun']);

export const CUE = Object.freeze({
  drop:    { label: 'DROP',    visual: 'donor falls onto the target',       audio: 'heavy landing thud', caption: 'ReFramer dropping in',       interrupts: [] },
  read:    { label: 'READ',    visual: 'scan light sweeps the donor',       audio: 'high scan tone',     caption: 'Reading donor',              interrupts: [
    { when: h => ['pulse', 'blast', 'glob'].includes(h.kind), outcome: 'read-broken: no anchor, donor not tagged' } ] },
  anchor:  { label: 'ANCHOR',  visual: 'legs plant on the donor',           audio: 'clamp clunk',        caption: 'Anchoring to the donor',     interrupts: [
    { when: h => h.kind === 'glob' || h.kind === 'car' || h.power >= 0.55, outcome: 'anchor-broken: no parts detached' },
    { when: h => h.kind === 'tip', outcome: 'tipped: staggered, parts still attached' } ] },
  release: { label: 'RELEASE', visual: 'bolts snap, parts swing loose',     audio: 'bolt snap',          caption: 'Releasing parts',            interrupts: [
    { when: h => h.power >= 0.85, outcome: 'fled-with-parts: ReFramer escapes carrying parts' } ] },
  reframe: { label: 'REFRAME', visual: 'arms assemble the chase frame',     audio: 'ratchet build',      caption: 'Reframing into a chase body', interrupts: [
    { when: h => h.power >= 0.85, outcome: 'fled-with-parts: ReFramer escapes carrying parts' } ] },
  chase:   { label: 'CHASE',   visual: 'roadframe moving, wheels spinning', audio: 'engine rev',         caption: 'Chasing',                    interrupts: [] },
  stagger: { label: 'STAGGER', visual: 'loses balance, limbs flail',        audio: 'metal groan',        caption: 'Off balance',                interrupts: [] },
  stun:    { label: 'STUN',    visual: 'sparks, limbs twitch',              audio: 'electric buzz',      caption: 'Stunned: strike now',        interrupts: [] },
});

// What the player sees and hears for a stage. Visual, audio and text are all present so
// the cue survives muted audio or reduced visual effects (#86).
export function cueFor(stage) {
  const c = CUE[stage];
  if (!c) return null;
  return { stage, label: c.label, visual: c.visual, audio: c.audio, caption: c.caption, controllerRumble: c.interrupts.length > 0 };
}

// Does this hit interrupt the stage, and what does the interruption cause?
export function interruptOutcome(stage, hit) {
  const c = CUE[stage];
  if (!c) return null;
  const rule = c.interrupts.find(r => r.when(hit));
  return rule ? rule.outcome : null;
}
