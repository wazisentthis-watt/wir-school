// WIR REFRAMER COMMAND: physical evacuation (#43). PROPOSAL / PUBLISH HOLD.
// An evacuee is rescued only when they physically arrive inside the safe zone.
// Requesting rescue, or pressing a button, only sets them walking. Pure state, no THREE.
export const EVAC = Object.freeze({ ESCORT_R: 3, WALK_SPEED: 1.6, CARRY_SPEED: 1.1 });

export function createEvacuee(id, x, z) {
  return { id, x, z, state: 'waiting', hp: 100 };
}

// Ask an evacuee to follow. This never completes anything.
export function requestRescue(E, id) {
  const e = E.find(v => v.id === id);
  if (!e) return { ok: false, reason: 'unknown-evacuee' };
  if (e.state === 'safe') return { ok: false, reason: 'already-safe' };
  if (e.state === 'lost') return { ok: false, reason: 'lost' };
  e.state = 'walking';
  return { ok: true, id, state: 'walking' };
}

// Per frame. escorts: [{id,x,z,carrying?}] squad members. zone: {x,z,r}. blockers: [{x,z,r}].
export function step(E, dt, { escorts = [], zone, blockers = [] } = {}) {
  const events = [];
  for (const e of E) {
    if (e.state === 'safe' || e.state === 'lost') continue;
    if (e.state !== 'walking' && e.state !== 'carried' && e.state !== 'blocked') continue;
    const near = escorts.filter(s => Math.hypot(s.x - e.x, s.z - e.z) <= EVAC.ESCORT_R);
    if (near.length === 0) {
      if (e.state !== 'waiting') { e.state = 'waiting'; events.push({ type: 'left-behind', id: e.id }); }
      continue;
    }
    const carried = near.some(s => s.carrying === e.id);
    const speed = (carried ? EVAC.CARRY_SPEED : EVAC.WALK_SPEED) * dt;
    const d = Math.hypot(zone.x - e.x, zone.z - e.z);
    if (d <= zone.r) {
      e.state = 'safe';
      events.push({ type: 'evacuated', id: e.id });
      continue;
    }
    const k = Math.min(1, speed / d);
    const nx = e.x + (zone.x - e.x) * k, nz = e.z + (zone.z - e.z) * k;
    const hit = blockers.find(b => Math.hypot(nx - b.x, nz - b.z) < b.r);
    if (hit) {
      if (e.state !== 'blocked') events.push({ type: 'route-blocked', id: e.id, by: { x: hit.x, z: hit.z } });
      e.state = 'blocked';
      continue;
    }
    e.x = nx; e.z = nz;
    e.state = carried ? 'carried' : 'walking';
  }
  return events;
}

export function damage(E, id, amount) {
  const e = E.find(v => v.id === id);
  if (!e || e.state === 'safe') return null;
  e.hp = Math.max(0, e.hp - amount);
  if (e.hp === 0) { e.state = 'lost'; return { type: 'lost', id }; }
  return { type: 'hurt', id, hp: e.hp };
}

// Mission gate: complete only when every evacuee is physically safe.
export function missionGate(E) {
  const missing = E.filter(e => e.state !== 'safe').map(e => ({ id: e.id, state: e.state }));
  const lost = E.filter(e => e.state === 'lost').map(e => e.id);
  return { complete: missing.length === 0 && E.length > 0, missing, lost };
}
