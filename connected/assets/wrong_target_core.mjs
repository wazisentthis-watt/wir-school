// WRONG TARGET — PROPOSAL / PUBLISH HOLD (owner's "Morrow City: The Machine Wars" + v0.3 mission reducer, 2026-11-06)
// Foundry Steps: an eight-limbed ReFramer harvests an occupied civic shuttle. Metal braces the shuttle, extracts and walks
// two riders to a real safe zone, takes out the machine's load-bearing legs, while two pressure-cage officers decide —
// from what they actually witness — whether he is the threat. A Framekeeper drone repairs limbs from finite stock.
// Re-cut in metres for Connected from WIRMorrowSystems v0.3 (owner's original). Pure: main.js owns meshes, input, physics.
// Rules that must not lie (owner's test list): extracted ≠ safe · witnessed evidence only, once per officer · finite repair
// stock · support loss changes stance · gravity anomaly is bounded and local · donor parts accounted for · save round-trips.

export const WT = {
  SIGNAL_R: 16, BRACE_R: 6, BRACE_HOLD: 1.0, BRACE_COST: 18, DOOR_R: 3.2, FOLLOW: 1.6, WALK: 2.4, LEASH: 22,
  SAFE_R: 3.6, WITNESS_R: 32, OFFICER_DELAY: 6, REPAIR_EVERY: 9, REPAIR_HP: 45, KEEPER_STOCK: 2, KEEPER_HP: 1,
  LIFT_RATE: 0.035, LIFT_ARM: 0.012, TILT_MAX: 1, GRAV_T: 11, GRAV_R: 7, GRAV_A: 6, SNARE_T: 1.6, SNARE_R: 1.5,
  STOMP_CD: 2.4, DIVERT_T: 12, STOMP_R: 2.2, STOMP_DMG: 0.12,
};

// legs 1–4 support the body; arms 5–8 are on the shuttle. 1 and 2 stand on the shuttle side.
const limb = (id) => ({ id, hp: 100, support: id <= 4, busSide: id === 1 || id === 2, repairs: 0, hits: 0 });

export function createWT(site) {
  return {
    v: 1, mission: 'APPROACH', t: 0, finished: false,
    site: JSON.parse(JSON.stringify(site)),              // {signal, bus, door, safe, nest, field, officerSpawn}
    bus: { braced: false, braceHold: 0, tilt: 0.15, integrity: 82, braceMat: 0, parts: { doors: 2, wheels: 4, roof: 1 } },
    people: [{ id: 'A', name: 'Commuter A', phase: 'TRAPPED', x: 0, z: 0 }, { id: 'B', name: 'Commuter B', phase: 'TRAPPED', x: 0, z: 0 }],
    boss: { active: false, limbs: Array.from({ length: 8 }, (_, i) => limb(i + 1)), supports: 4, mode: 'DORMANT', stagger: 0, stompCd: 0, harvested: 0 },
    keeper: { hp: WT.KEEPER_HP, stock: WT.KEEPER_STOCK, timer: 0, mode: 'PATROL', diverted: false, target: null, log: [] },
    officers: [{ id: 'MC-01', suspicion: 68, evidence: [], mode: 'OFFDUTY', snare: 0 }, { id: 'MC-02', suspicion: 77, evidence: [], mode: 'OFFDUTY', snare: 0 }],
    grav: { on: false, t: 0 },
    after: { rescued: 0, busSaved: false, trust: 0, routeOpen: false, repairsPending: 1, jointsDown: 0, collateral: 0, shaken: 0 },
    stats: { gal: 0, limbHits: 0, extractions: 0, braces: 0 }, journal: [],
  };
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function log(S, type, msg, extra) { const e = { t: +S.t.toFixed(2), type, msg, ...(extra || {}) }; S.journal.push(e); if (S.journal.length > 120) S.journal.shift(); return e; }
function supports(S) { return S.boss.limbs.filter(l => l.support && l.hp > 0).length; }

// an officer only learns from what they saw: in range, not occluded, once per evidence id
export function observe(S, officerIdx, evId, kind, { dist = 0, occluded = false } = {}) {
  const o = S.officers[officerIdx]; if (!o || o.mode === 'OFFDUTY' || occluded || dist > WT.WITNESS_R || o.evidence.includes(evId)) return null;
  o.evidence.push(evId);
  o.suspicion = clamp(o.suspicion + (kind === 'rescue' ? -20 : kind === 'support' ? -13 : kind === 'collateral' ? 24 : kind === 'lilheavy' ? -10 : 0), 0, 100);
  o.mode = o.suspicion <= 47 ? 'ASSIST' : o.suspicion >= 86 ? 'PURSUE' : 'INVESTIGATE';
  return { type: 'police', officer: o.id, kind, suspicion: o.suspicion, mode: o.mode };
}

// every officer within sight of `pos` witnesses
function witness(S, w, evId, kind, pos, out) {
  S.officers.forEach((o, i) => { const op = w.officers && w.officers[i]; if (!op) return; const e = observe(S, i, evId, kind, { dist: d2(op, pos), occluded: !!(w.occluded && w.occluded[i]) }); if (e) out.events.push(e); });
}

export function activate(S) {
  if (S.mission !== 'APPROACH') return false;
  S.mission = 'DEFEND'; S.t = 0; S.boss.active = true; S.boss.mode = 'HARVEST'; S.grav.on = true; S.grav.t = WT.GRAV_T; S.keeper.mode = 'ASSESS';
  log(S, 'alert', 'ReFramer on an occupied shuttle'); return true;
}

// hit a limb (Metal strike / glob). power 0..1. Returns event or null.
export function hitLimb(S, id, power, w = {}) {
  const L = S.boss.limbs[id - 1]; if (!S.boss.active || S.finished || !L || L.hp <= 0) return null;
  const dmg = Math.round(25 + 50 * clamp(power, 0, 1)); L.hp = Math.max(0, L.hp - dmg); L.hits++; S.stats.limbHits++;
  const out = { type: 'limbHit', id, hp: L.hp, down: L.hp === 0 };
  if (L.hp === 0) {
    S.boss.supports = supports(S); S.after.jointsDown = S.boss.limbs.filter(l => l.hp === 0).length;
    // taking a shuttle-side leg while the shuttle is loose and occupied dumps the load onto it
    if (L.busSide && !S.bus.braced && S.people.some(p => p.phase === 'TRAPPED')) { S.bus.tilt = Math.min(WT.TILT_MAX, S.bus.tilt + 0.25); S.bus.integrity -= 10; out.shift = true; }
    if (S.boss.supports <= 2) { S.boss.mode = 'RECOVER_STANCE'; S.boss.stagger = 3.2; out.stance = true; }
  }
  return out;
}
export function hitKeeper(S, power) { const K = S.keeper; if (K.hp <= 0) return null; K.hp = Math.max(0, K.hp - power); if (K.hp <= 0) { K.mode = 'DOWN'; K.target = null; return { type: 'keeperDown' }; } K.mode = 'EVADE'; return { type: 'keeperHit' }; }

// world each frame: { metal:{x,z}, drawing, interact (edge), officers:[{x,z}], occluded:[bool], lilHeavyScan (edge), metalHp }
export function step(S, w, dt) {
  const out = { events: [], grav: null, snare: 0, stomp: 0 };
  S.t += dt; const m = w.metal;
  if (S.mission === 'APPROACH') { if (d2(m, S.site.signal) < WT.SIGNAL_R) { activate(S); out.events.push({ type: 'activate' }); } return out; }
  if (S.mission !== 'DEFEND') return out;
  const B = S.boss, bus = S.bus;
  // officers arrive
  if (S.t >= WT.OFFICER_DELAY && S.officers[0].mode === 'OFFDUTY') { for (const o of S.officers) o.mode = 'INVESTIGATE'; out.events.push({ type: 'policeArrive' }); }
  // brace: hold Metal Draw beside the shuttle, costs finite Gallium once
  if (!bus.braced && w.drawing && d2(m, S.site.bus) < WT.BRACE_R) {
    bus.braceHold += dt;
    if (bus.braceHold >= WT.BRACE_HOLD) {
      if ((w.gal ?? 100) >= WT.BRACE_COST) { bus.braced = true; bus.braceMat = WT.BRACE_COST; S.stats.gal += WT.BRACE_COST; S.stats.braces++; bus.integrity = Math.min(100, bus.integrity + 14);
        out.events.push({ type: 'braced', cost: WT.BRACE_COST }); witness(S, w, 'BRACE', 'support', S.site.bus, out); }
      else { bus.braceHold = 0; out.events.push({ type: 'blocked', why: 'gallium' }); }
    }
  } else if (!w.drawing) bus.braceHold = 0;
  // shuttle lift: harvesting arms raise one side unless braced; disabled arms lift less
  const arms = B.limbs.filter(l => !l.support && l.hp > 0).length;
  if (B.mode === 'HARVEST' && !bus.braced) bus.tilt = Math.min(WT.TILT_MAX, bus.tilt + (WT.LIFT_RATE * (arms / 4) + WT.LIFT_ARM) * dt * (arms ? 1 : 0));
  else if (bus.braced) bus.tilt = Math.max(0.05, bus.tilt - 0.2 * dt);
  if (bus.tilt >= WT.TILT_MAX && !bus.swung) { bus.swung = true; bus.integrity -= 25; bus.parts.wheels--; B.harvested++; out.events.push({ type: 'busSwing' }); for (const p of S.people) if (p.phase === 'TRAPPED') p.shaken = true; }
  // extraction at the door once the shuttle is braced; extracted is NOT safe
  if (w.interact && bus.braced && d2(m, S.site.door) < WT.DOOR_R) {
    const p = S.people.find(q => q.phase === 'TRAPPED');
    if (p) { p.phase = 'EXTRACTED'; p.x = S.site.door.x; p.z = S.site.door.z; S.stats.extractions++; out.events.push({ type: 'extracted', id: p.id }); }
  } else if (w.interact && !bus.braced && d2(m, S.site.door) < WT.DOOR_R) out.events.push({ type: 'blocked', why: 'brace' });
  // escort: people walk after Metal (they wait if he leaves them), safe only inside the zone
  for (const p of S.people) {
    if (p.phase === 'EXTRACTED' && d2(m, p) < 4) { p.phase = 'ESCORTING'; out.events.push({ type: 'escorting', id: p.id }); }
    if (p.phase === 'ESCORTING' || p.phase === 'WAITING') {
      const dm = d2(m, p);
      if (dm > WT.LEASH) { if (p.phase !== 'WAITING') { p.phase = 'WAITING'; out.events.push({ type: 'waiting', id: p.id }); } }
      else { if (p.phase === 'WAITING') p.phase = 'ESCORTING';
        if (dm > WT.FOLLOW) { const k = Math.min(dm - WT.FOLLOW, WT.WALK * (p.shaken ? 0.6 : 1) * dt) / dm; p.x += (m.x - p.x) * k; p.z += (m.z - p.z) * k; } }
      if (d2(p, S.site.safe) <= WT.SAFE_R) { p.phase = 'SAFE'; S.after.rescued++; if (p.shaken) S.after.shaken++; out.events.push({ type: 'safe', id: p.id }); witness(S, w, 'WITNESS-' + p.id, 'rescue', p, out); }
    }
  }
  // officers: pursue → snare when close; assist → they escort/guard
  S.officers.forEach((o, i) => { const op = w.officers && w.officers[i]; if (!op) return; o.snare = Math.max(0, o.snare - dt);
    if (o.mode === 'PURSUE' && d2(op, m) < WT.SNARE_R && o.snare <= 0) { o.snare = 4; out.snare = Math.max(out.snare, WT.SNARE_T); out.events.push({ type: 'snare', officer: o.id }); } });
  // Lil Heavy films it: independent evidence + diverts the repair drone
  if (w.lilHeavyScan) { S.keeper.divertT = WT.DIVERT_T; S.keeper.diverted = true; witness(S, w, 'LILHEAVY-CAM', 'lilheavy', m, out); out.events.push({ type: 'lilHeavyScan' }); }
  // Framekeeper: repairs a damaged support from finite stock unless diverted / down; stabilises once everyone is out
  const K = S.keeper; K.divertT = Math.max(0, (K.divertT || 0) - dt); K.diverted = K.divertT > 0;
  if (S.after.rescued === S.people.length && K.mode !== 'DOWN') { K.diverted = true; K.mode = 'STABILIZE'; }
  if (K.mode !== 'DOWN') { K.timer += dt;
    if (K.timer >= WT.REPAIR_EVERY) { K.timer = 0;
      const tgt = B.limbs.find(l => l.support && l.hp > 0 && l.hp < 100) || B.limbs.find(l => l.support && l.hp === 0);
      if (tgt && K.stock > 0 && !K.diverted) { const before = tgt.hp; tgt.hp = Math.min(100, tgt.hp + WT.REPAIR_HP); tgt.repairs++; K.stock--; K.mode = 'REPAIR'; K.target = tgt.id;
        K.log.push({ t: S.t, limb: tgt.id, from: before, to: tgt.hp }); B.supports = supports(S); if (B.supports > 2 && B.mode === 'RECOVER_STANCE') B.mode = 'HARVEST';
        out.events.push({ type: 'repair', id: tgt.id, stock: K.stock }); }
      else if (K.mode === 'REPAIR') { K.mode = K.diverted ? 'STABILIZE' : 'ASSESS'; K.target = null; } } }
  // boss: stance, stomps when Metal is under it
  B.stagger = Math.max(0, B.stagger - dt); B.stompCd -= dt;
  if (B.mode !== 'RECOVER_STANCE' && d2(m, S.site.nest) < 5 && B.stompCd <= 0) { B.stompCd = WT.STOMP_CD; out.stomp = WT.STOMP_DMG; out.events.push({ type: 'stomp' }); }
  // bounded gravity anomaly
  if (S.grav.on) { S.grav.t -= dt; if (S.grav.t <= 0) { S.grav.on = false; out.events.push({ type: 'gravOff' }); } }
  out.grav = forceAt(S, m.x, m.z);
  // trust
  S.after.trust = Math.round(100 - S.officers.reduce((a, o) => a + o.suspicion, 0) / S.officers.length);
  // done: everybody physically safe and the machine can't stand
  if (S.after.rescued === S.people.length && B.supports <= 2) {
    S.mission = 'COMPLETE'; S.finished = true; B.mode = 'COLLAPSED'; S.after.busSaved = bus.integrity > 0; S.after.routeOpen = true; S.after.repairsPending = bus.braced ? 0 : 1;
    out.events.push({ type: 'complete', rescued: S.after.rescued, shaken: S.after.shaken, trust: S.after.trust, braced: bus.braced, parts: { ...bus.parts } });
  }
  return out;
}

export function forceAt(S, x, z) {
  if (!S.grav.on) return { ax: 0, az: 0 }; const f = S.site.field, d = Math.hypot(x - f.x, z - f.z); if (d > WT.GRAV_R) return { ax: 0, az: 0 };
  const k = 1 - d / WT.GRAV_R; return { ax: WT.GRAV_A * k * f.dx, az: WT.GRAV_A * k * f.dz };
}

export function checks(S) {
  return {
    eightLimbs: S.boss.limbs.length === 8,
    hpFinite: S.boss.limbs.every(l => Number.isFinite(l.hp) && l.hp >= 0 && l.hp <= 100),
    rescuedMatches: S.after.rescued === S.people.filter(p => p.phase === 'SAFE').length,
    stock: S.keeper.stock >= 0 && S.keeper.stock <= WT.KEEPER_STOCK,
    noFreeMatter: S.bus.braceMat === 0 || S.stats.gal >= S.bus.braceMat,
    uniqueEvidence: S.officers.every(o => new Set(o.evidence).size === o.evidence.length),
    partsAccounted: S.bus.parts.doors + S.bus.parts.wheels + S.bus.parts.roof + S.boss.harvested === 7,
  };
}
export function serialize(S) { return JSON.stringify({ ...S, journal: S.journal.slice(-30) }); }
export function restore(txt, site) {
  let S; try { S = JSON.parse(txt); } catch (e) { return createWT(site); }
  if (!S || S.v !== 1 || !S.boss || S.boss.limbs?.length !== 8 || S.people?.length !== 2 || !Object.values(checks(S)).every(Boolean)) return createWT(site);
  // a reload mid-incident restarts the incident (people back in the shuttle) but keeps completed outcomes
  if (S.mission === 'DEFEND') { const fresh = createWT(site); return fresh; }
  return S;
}
