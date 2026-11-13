// WIR REFRAMER COMMAND: Foundry salvage and construction. PROPOSAL / PUBLISH HOLD.
// Addendum #21 (material scan), #23 (condition inheritance), #30 (donor identity), #27 (damaged scrap roles),
// #54 (provenance-aware repair). Pure state, no THREE.
// Invariants: every part has exactly one owner; mass is conserved across harvest/build/dismantle;
// a donor cannot be rebuilt twice; failures change nothing.
export const MATERIALS = Object.freeze({
  steel: { density: 7850 }, aluminum: { density: 2700 }, copper: { density: 8960 },
  rubber: { density: 1100 }, glass: { density: 2500 }, composite: { density: 1600 },
});
export const BARRICADE = Object.freeze({ MIN_PARTS: 3, MIN_MASS_KG: 120, MIN_CONDITION: 0.4, COVER_ROLE_CONDITION: 0.1 });

export function createSalvage() {
  return { parts: new Map(), donors: new Map(), constructs: new Map(), nextId: 1 };
}

// Register a donor vehicle and its parts. Parts keep their origin donor forever.
export function registerDonor(S, donorId, parts) {
  if (S.donors.has(donorId)) return { ok: false, reason: 'donor-exists' };
  S.donors.set(donorId, { id: donorId, state: 'intact', partIds: [] });
  for (const p of parts) {
    if (S.parts.has(p.id)) return { ok: false, reason: 'duplicate-part', id: p.id };
    S.parts.set(p.id, { id: p.id, donorId, kind: p.kind, material: p.material, massKg: p.massKg,
      condition: p.condition ?? 1, owner: 'world', x: p.x ?? 0, z: p.z ?? 0 });
    S.donors.get(donorId).partIds.push(p.id);
  }
  return { ok: true, donorId, parts: parts.length };
}

// #21: label every part. Unknown material is reported as unknown with no invented mass.
export function scan(S, ids) {
  return ids.map(id => {
    const p = S.parts.get(id);
    if (!p) return { id, label: 'missing' };
    const known = !!MATERIALS[p.material];
    return { id, label: known ? p.material : 'unknown', massKg: known ? p.massKg : null, kind: p.kind, condition: p.condition, donorId: p.donorId };
  });
}

// Foundry picks up a world part within reach. Condition travels with the part.
export function harvest(S, id, { reachOk = true } = {}) {
  const p = S.parts.get(id);
  if (!p) return { ok: false, reason: 'missing-part' };
  if (p.owner !== 'world') return { ok: false, reason: 'already-owned', owner: p.owner };
  if (!reachOk) return { ok: false, reason: 'out-of-reach' };
  p.owner = 'FOUNDRY';
  return { ok: true, id, condition: p.condition };
}

// Build a barricade from owned parts. All-or-nothing: on failure nothing changes.
export function buildBarricade(S, ids) {
  const parts = ids.map(id => S.parts.get(id));
  const missing = ids.filter((id, i) => !parts[i] || parts[i].owner !== 'FOUNDRY');
  if (missing.length) return { ok: false, reason: 'not-carried', missing };
  if (ids.length < BARRICADE.MIN_PARTS) return { ok: false, reason: 'too-few-parts', need: BARRICADE.MIN_PARTS };
  const mass = parts.reduce((s, p) => s + p.massKg, 0);
  if (mass < BARRICADE.MIN_MASS_KG) return { ok: false, reason: 'too-light', massKg: mass, need: BARRICADE.MIN_MASS_KG };
  const structural = parts.filter(p => p.condition >= BARRICADE.MIN_CONDITION).length;
  if (structural < 2) return { ok: false, reason: 'needs-two-sound-parts', sound: structural };
  const cid = 'BARR-' + S.nextId++;
  for (const p of parts) p.owner = cid;
  S.constructs.set(cid, { id: cid, kind: 'barricade', partIds: [...ids], massKg: mass });
  return { ok: true, id: cid, massKg: mass, parts: ids.length };
}

// #27: damaged scrap may only serve as cover (below MIN_CONDITION), never as structure.
export function coverFromScrap(S, ids) {
  const parts = ids.map(id => S.parts.get(id));
  if (parts.some(p => !p || p.owner !== 'FOUNDRY')) return { ok: false, reason: 'not-carried' };
  if (parts.some(p => p.condition > BARRICADE.MIN_CONDITION)) return { ok: false, reason: 'sound-part-not-scrap' };
  const cid = 'COVER-' + S.nextId++;
  for (const p of parts) p.owner = cid;
  S.constructs.set(cid, { id: cid, kind: 'cover', partIds: [...ids], massKg: parts.reduce((s, p) => s + p.massKg, 0) });
  return { ok: true, id: cid };
}

// #54: dismantling returns parts to the world at their current condition. Nothing is created.
export function dismantle(S, cid, dropX = 0, dropZ = 0) {
  const c = S.constructs.get(cid);
  if (!c) return { ok: false, reason: 'no-construct' };
  for (const id of c.partIds) { const p = S.parts.get(id); p.owner = 'world'; p.x = dropX; p.z = dropZ; }
  S.constructs.delete(cid);
  return { ok: true, returned: c.partIds.length };
}

// #30: rebuilding a donor needs all its parts, from that donor only, none owned elsewhere, and only once.
export function rebuildDonor(S, donorId) {
  const d = S.donors.get(donorId);
  if (!d) return { ok: false, reason: 'unknown-donor' };
  if (d.state === 'rebuilt') return { ok: false, reason: 'already-rebuilt' };
  const parts = d.partIds.map(id => S.parts.get(id));
  if (parts.some(p => p.owner !== 'FOUNDRY')) return { ok: false, reason: 'incomplete', missing: parts.filter(p => p.owner !== 'FOUNDRY').map(p => p.id) };
  for (const p of parts) p.owner = 'donor:' + donorId;
  d.state = 'rebuilt';
  return { ok: true, donorId, parts: parts.length };
}

// Invariants for a dev-mode checker (#93). Returns [] when healthy.
export function invariants(S) {
  const bad = [];
  const massIn = [...S.parts.values()].reduce((s, p) => s + p.massKg, 0);
  for (const p of S.parts.values()) {
    if (!(p.massKg >= 0)) bad.push({ type: 'negative-mass', id: p.id });
    if (!(p.condition >= 0 && p.condition <= 1)) bad.push({ type: 'bad-condition', id: p.id });
    if (p.owner.startsWith('BARR-') || p.owner.startsWith('COVER-')) {
      if (!S.constructs.has(p.owner)) bad.push({ type: 'orphan-owner', id: p.id, owner: p.owner });
    }
  }
  for (const d of S.donors.values()) {
    if (d.state === 'rebuilt' && !d.partIds.every(id => S.parts.get(id).owner === 'donor:' + d.id)) bad.push({ type: 'rebuilt-donor-mismatch', donorId: d.id });
  }
  if (!Number.isFinite(massIn)) bad.push({ type: 'mass-not-finite' });
  return bad;
}

export function totalMass(S) {
  return [...S.parts.values()].reduce((s, p) => s + p.massKg, 0);
}
