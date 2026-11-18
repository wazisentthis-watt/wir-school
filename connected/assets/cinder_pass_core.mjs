// WIR REFRAMER COMMAND: CINDER PASS mission director (headless slice). PROPOSAL / PUBLISH HOLD.
// Composes the squad, evacuation, partial-build, marker and invariant cores into one mission.
// Win: both medics physically safe AND the hostile can no longer move or attack.
// Fail: a medic is lost. Pure state, no THREE, no main.js. Not yet wired into the 3D game.
import {createCommandSquad,step as squadStep,giveOrder,serialize as squadSave} from './command_squad_core.mjs';
import {createEvacuee,requestRescue,step as evacStep,missionGate,damage as evacDamage} from './evacuation_core.mjs';
import {KIT,interrupt,movesFor,clampParts} from './partial_build_core.mjs';
import {createMarkers,stepMarkers} from './command_intel_core.mjs';

export function createCinderPass({ squadStarts = {}, medics = [], zone, hostile }) {
  const hp = hostile?.hp ?? 100;
  return {
    squad: createCommandSquad(squadStarts),
    evac: medics.map(m => createEvacuee(m.id, m.x, m.z)),
    zone,
    markers: createMarkers(),
    hostile: { id: hostile?.id || 'HOSTILE-1', x: hostile?.x ?? 0, z: hostile?.z ?? 0, hp, parts: clampParts(hostile?.parts || KIT), stage: 'complete' },
    log: [],
    elapsed: 0,
  };
}

// The real hostile build after an interruption: only attached parts remain (#35).
export function interruptHostile(C, stage) {
  const r = interrupt(C.hostile.parts, stage);
  if (!r.ok) return r;
  C.hostile.parts = r.attached;
  C.hostile.stage = stage;
  C.log.push({ t: C.elapsed, type: 'hostile-interrupted', stage, loose: r.loose });
  return r;
}

export function hitHostile(C, dmg) {
  if (!(dmg > 0)) return { ok: false, reason: 'bad-damage' };
  C.hostile.hp = Math.max(0, C.hostile.hp - dmg);
  C.log.push({ t: C.elapsed, type: 'hostile-hit', hp: C.hostile.hp });
  return { ok: true, hp: C.hostile.hp };
}

export function neutralized(C) {
  return C.hostile.hp <= 0 || movesFor(C.hostile.parts).length === 0;
}

export function requestMedic(C, id) {
  const r = requestRescue(C.evac, id);
  C.log.push({ t: C.elapsed, type: 'rescue-requested', id, ok: r.ok });
  return r;
}

export function order(C, unit, type, args) {
  const r = giveOrder(C.squad, unit, type, args, []);
  C.log.push({ t: C.elapsed, type: 'order', unit, order: type, ok: r.ok, reason: r.reason || null });
  return r;
}

export function tick(C, dt, { blockers = [], movePlayer = null } = {}) {
  C.elapsed += dt;
  const ev = [];
  ev.push(...squadStep(C.squad, dt, { blockers, movePlayer, enemies: [{ x: C.hostile.x, z: C.hostile.z }] }));
  const escorts = Object.values(C.squad.units).map(u => ({ id: u.id, x: u.x, z: u.z }));
  ev.push(...evacStep(C.evac, dt, { escorts, zone: C.zone, blockers }));
  ev.push(...stepMarkers(C.markers, dt));
  for (const e of ev) C.log.push({ t: C.elapsed, ...e });
  return ev;
}

export function status(C) {
  const gate = missionGate(C.evac);
  const failed = gate.lost.length > 0;
  const hostileDown = neutralized(C);
  return {
    complete: !failed && gate.complete && hostileDown,
    failed,
    medicsSafe: gate.complete,
    missing: gate.missing,
    hostileNeutral: hostileDown,
    objectives: [
      { id: 'escort-medics', done: gate.complete, text: gate.complete ? 'Both medics reached the safe zone' : 'Escort the medics to the safe zone: ' + gate.missing.map(m => m.id + ' (' + m.state + ')').join(', ') },
      { id: 'neutralize-hostile', done: hostileDown, text: hostileDown ? 'Hostile can no longer move or attack' : 'Stop the hostile reconstruction' },
    ],
  };
}

// Dev-mode invariants (#93). Empty array means healthy.
export function invariants(C) {
  const bad = [];
  for (const u of Object.values(C.squad.units)) {
    if (!(u.hp >= 0 && u.hp <= 100)) bad.push({ type: 'unit-hp', id: u.id, hp: u.hp });
    if (!Number.isFinite(u.x) || !Number.isFinite(u.z)) bad.push({ type: 'unit-position', id: u.id });
  }
  for (const e of C.evac) {
    if (!(e.hp >= 0)) bad.push({ type: 'evac-hp', id: e.id });
    if (e.state === 'safe' && Math.hypot(e.x - C.zone.x, e.z - C.zone.z) > C.zone.r + 1e-6) bad.push({ type: 'false-rescue', id: e.id });
  }
  for (const k of Object.keys(KIT)) if (C.hostile.parts[k] < 0 || C.hostile.parts[k] > KIT[k]) bad.push({ type: 'hostile-part-count', part: k });
  return bad;
}

export function saveCinderPass(C) {
  return JSON.stringify({ v: 1, squad: JSON.parse(squadSave(C.squad)), evac: C.evac, hostile: C.hostile, elapsed: C.elapsed });
}
