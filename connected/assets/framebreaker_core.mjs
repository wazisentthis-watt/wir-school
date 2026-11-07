// FRAMEBREAKERS + their Framekeeper pit crew — PROPOSAL / PUBLISH HOLD ("Morrow City: The Machine Wars", 2026-11-06)
// Human operators in armored frames. Their armor is plates, not a health bar: a hard hit knocks a plate loose, and the
// little Framekeeper drones catch it and bolt it back on unless Metal stops the drones. Ground Lock plants them (no
// knockback), Frame Shear goes for the board (it gets knocked loose — lost), Inertia Snare slows him from range.
// They are people: they read the situation. High police trust → they stand down; a ReFramer nearby → emergency
// alliance against the machine; with every plate off and their stance broken they surrender. Nonlethal.
// Pure: main.js owns meshes, the melee system and input.

export const FB = {
  PLATES: ['chest', 'back', 'shoulderL', 'shoulderR'], KNOCK: 0.45, ARMOR_DMG: 0.25,
  REPAIR_T: 2.4, DRONE_SPEED: 7,
  LOCK_EVERY: 7, LOCK_T: 2.5, SHEAR_CD: 6, SHEAR_R: 3.2, SNARE_CD: 8, SNARE_MIN: 4, SNARE_R: 10,
  CONFRONT_R: 14, TRUST_STANDDOWN: 60, LOSE_R: 30,
};

export function createSquad(n = 2, drones = 2) {
  return {
    units: Array.from({ length: n }, (_, i) => ({ id: 'FB-' + (i + 1), plates: Object.fromEntries(FB.PLATES.map(p => [p, 1])), stance: 1, state: 'patrol',
      lock: 0, lockCd: 3 + i * 2, shearCd: 2, snareCd: 4 + i * 3, attacked: false })),
    drones: Array.from({ length: drones }, (_, i) => ({ id: 'FK-' + (i + 1), hp: 1, task: null })),
    loose: [], ally: false, log: [],
  };
}
const platesOn = (u) => FB.PLATES.filter(p => u.plates[p] > 0).length;
export { platesOn };

// Metal hits unit i. fromFront: the hit lands on the front (chest / shoulders) vs the back plate.
export function hitUnit(S, i, power, { fromFront = true, kind = 'strike' } = {}) {
  const u = S.units[i]; if (!u || u.state === 'surrender') return null;
  u.attacked = true; if (u.state === 'standdown' || u.state === 'patrol') u.state = 'confront';
  const out = { type: 'fbHit', id: u.id, kbMul: u.lock > 0 && kind !== 'glob' ? 0 : 1, dmgMul: 1 };
  const order = fromFront ? ['chest', power > 0.7 ? 'shoulderL' : 'shoulderR', 'shoulderL', 'shoulderR'] : ['back', 'shoulderR', 'shoulderL'];
  const plate = order.find(p => u.plates[p] > 0);
  if (plate) {
    out.dmgMul = FB.ARMOR_DMG;
    if (power >= FB.KNOCK || kind === 'glob') { u.plates[plate] = 0; out.plateOff = plate; S.loose.push({ unit: i, plate, t: 0, drone: null }); }
  }
  if (kind === 'glob' && u.lock > 0) { u.lock = 0; out.lockBroken = true; }   // a heavy glob breaks the planted frame
  u.stance = Math.max(0, u.stance - power * 0.3 * out.dmgMul);
  if (u.stance <= 0 && platesOn(u) === 0) { u.state = 'surrender'; out.surrender = true; }
  return out;
}
export function hitDrone(S, j) { const d = S.drones[j]; if (!d || d.hp <= 0) return null; d.hp = 0; if (d.task) { d.task.drone = null; d.task = null; } return { type: 'droneDown', id: d.id }; }

// w: { metal:{x,z}, riding, trust, reframerNear, units:[{x,z}] }
export function step(S, w, dt) {
  const out = { events: [] }; const m = w.metal;
  if (w.reframerNear && !S.ally && S.units.some(u => u.state !== 'surrender')) { S.ally = true; out.events.push({ type: 'alliance' }); }
  if (!w.reframerNear && S.ally) { S.ally = false; out.events.push({ type: 'allianceOver' }); }
  S.units.forEach((u, i) => {
    const p = w.units[i]; if (!p || u.state === 'surrender') return;
    const d = Math.hypot(p.x - m.x, p.z - m.z);
    // judgment
    let want = u.state;
    if (S.ally) want = 'ally';
    else if (!u.attacked && w.trust >= FB.TRUST_STANDDOWN) want = d < FB.CONFRONT_R ? 'standdown' : 'patrol';
    else if (d < FB.CONFRONT_R) want = 'confront';
    else if (d > FB.LOSE_R) want = 'patrol';
    if (want !== u.state) { u.state = want; out.events.push({ type: 'state', id: u.id, state: want, i }); }
    u.lock = Math.max(0, u.lock - dt); u.lockCd -= dt; u.shearCd -= dt; u.snareCd -= dt;
    if (u.state !== 'confront') return;
    if (u.lockCd <= 0) { u.lockCd = FB.LOCK_EVERY; u.lock = FB.LOCK_T; out.events.push({ type: 'groundLock', id: u.id, i }); }
    if (w.riding && d < FB.SHEAR_R && u.shearCd <= 0) { u.shearCd = FB.SHEAR_CD; out.events.push({ type: 'frameShear', id: u.id, i }); }
    if (d > FB.SNARE_MIN && d < FB.SNARE_R && u.snareCd <= 0) { u.snareCd = FB.SNARE_CD; out.events.push({ type: 'snare', id: u.id, i }); }
  });
  // the pit crew: a free drone takes each loose plate, carries it back, bolts it on
  for (const L of S.loose) {
    if (L.drone == null) { const j = S.drones.findIndex(d => d.hp > 0 && !d.task); if (j >= 0) { L.drone = j; S.drones[j].task = L; L.t = 0; out.events.push({ type: 'droneCatch', drone: S.drones[j].id, plate: L.plate, i: L.unit, j }); } }
    if (L.drone != null) { L.t += dt; if (L.t >= FB.REPAIR_T) { const u = S.units[L.unit];
      if (u.state !== 'surrender') { u.plates[L.plate] = 1; out.events.push({ type: 'plateRepaired', id: u.id, plate: L.plate, i: L.unit, j: L.drone }); }
      S.drones[L.drone].task = null; L.done = true; } }
  }
  S.loose = S.loose.filter(L => !L.done);
  return out;
}
export function allDown(S) { return S.units.every(u => u.state === 'surrender'); }
