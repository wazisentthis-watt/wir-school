// SCRAP CREW — the prologue's street opponents — PROPOSAL / PUBLISH HOLD (2026-11-07)
// Three people stripping a parked car. Each one teaches a different thing:
//   brawler  — stands and fights (the fight system owns him): strike, dodge, break the stance
//   thrower  — keeps 7–12 m away and throws bricks with a visible wind-up: dodge (B), close in, or glob him
//   lookout  — grabs the wheel and runs a real road route: chase him on the board; catch him and he gives up
// They read the room: when two are out, the last one gives up (hands up). Someone who gave up is never hit — you
// restrain them with Gallium instead. Nonlethal: out → bound → picked up by the police.
// Pure: main.js owns the bodies, the fight system and the bricks.

export const SC = {
  ALERT_R: 14, KEEP0: 7, KEEP1: 12, BACK_SPEED: 3.2, CLOSE_SPEED: 2.8, THROW_CD: 2.8, TELL: 0.7, THROW_R: 16,
  FLEE_SPEED: 4.6, WINDED_T: 22, WINDED_SPEED: 2.4, CATCH_R: 2.3, KEEP_RUNNING_R: 12, ROUTE_R: 1.2,
  STANCE: { brawler: 0.6, thrower: 0.35, lookout: 0.3 },
};
export const ROLES = ['brawler', 'thrower', 'lookout'];
const DOWN = new Set(['out', 'surrender', 'bound', 'taken']);

export function createCrew() {
  return { members: ROLES.map((role, i) => ({ id: 'SC-' + (i + 1), role, state: 'work', throwCd: 1.6 + i * 0.5, tell: 0, fleeT: 0, route: null, ri: 0 })), alerted: false };
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function alert(C, metal, routes = []) {
  if (C.alerted) return null;
  C.alerted = true;
  for (const m of C.members) {
    if (m.state !== 'work') continue;
    m.state = m.role === 'brawler' ? 'fight' : m.role === 'thrower' ? 'throw' : 'flee';
    if (m.role === 'lookout' && routes.length) {     // the route whose end is farthest from Metal
      let best = null, bd = -1; for (const r of routes) { const e = r[r.length - 1], d = d2(e, metal); if (d > bd) { bd = d; best = r; } }
      m.route = best; m.ri = 0;
    }
  }
  return { type: 'alert' };
}

// w: { metal:{x,z}, members:[{x,z}], routes:[[{x,z}…]] }. Returns { events, intents[] }
export function step(C, w, dt) {
  const out = { events: [], intents: C.members.map(() => null) };
  if (!C.alerted && w.members.some((p, i) => p && !DOWN.has(C.members[i].state) && d2(p, w.metal) < SC.ALERT_R)) { const e = alert(C, w.metal, w.routes); if (e) out.events.push(e); }
  C.members.forEach((m, i) => {
    const p = w.members[i]; if (!p) return;
    const d = d2(p, w.metal), toM = { x: (w.metal.x - p.x) / (d || 1), z: (w.metal.z - p.z) / (d || 1) };
    if (m.state === 'work') { out.intents[i] = { anim: 'work' }; return; }
    if (m.state === 'surrender') { out.intents[i] = { anim: 'handsUp', face: w.metal }; return; }
    if (DOWN.has(m.state)) return;
    if (m.state === 'throw') {
      let move = null;
      if (d < SC.KEEP0) move = { x: p.x - toM.x * 3, z: p.z - toM.z * 3, speed: SC.BACK_SPEED };
      else if (d > SC.KEEP1) move = { x: w.metal.x, z: w.metal.z, speed: SC.CLOSE_SPEED };
      m.throwCd -= dt;
      if (m.tell > 0) { m.tell -= dt; move = null; if (m.tell <= 0) { m.throwCd = SC.THROW_CD; out.events.push({ type: 'throw', i, at: { ...w.metal } }); } }
      else if (m.throwCd <= 0 && d < SC.THROW_R) { m.tell = SC.TELL; out.events.push({ type: 'tell', i }); move = null; }
      out.intents[i] = { move, face: w.metal, anim: m.tell > 0 ? 'windup' : move ? 'walk' : 'guard' };
      return;
    }
    if (m.state === 'flee') {
      m.fleeT += dt;
      if (d < SC.CATCH_R) { m.state = 'surrender'; out.events.push({ type: 'surrender', i, why: 'caught' }); out.intents[i] = { anim: 'handsUp', face: w.metal }; return; }
      const r = m.route; let tgt = null;
      if (r && m.ri < r.length) { tgt = r[m.ri]; if (d2(p, tgt) < SC.ROUTE_R) { m.ri++; tgt = r[m.ri] || null; } }
      const speed = m.fleeT > SC.WINDED_T ? SC.WINDED_SPEED : SC.FLEE_SPEED;
      if (m.fleeT > SC.WINDED_T && !m.windedSaid) { m.windedSaid = true; out.events.push({ type: 'winded', i }); }
      out.intents[i] = tgt ? { move: { x: tgt.x, z: tgt.z, speed }, anim: 'run' } : { anim: 'winded', face: w.metal };
      return;
    }
    if (m.state === 'fight') out.intents[i] = { anim: 'fight' };
  });
  // the last one standing reads the room and gives up — unless he is the lookout and still well clear
  const up = C.members.filter(m => !DOWN.has(m.state));
  if (C.alerted && up.length === 1) {
    const m = up[0], i = C.members.indexOf(m), p = w.members[i];
    if (!(m.state === 'flee' && p && d2(p, w.metal) > SC.KEEP_RUNNING_R)) { m.state = 'surrender'; out.events.push({ type: 'surrender', i, why: 'last' }); }
  }
  return out;
}

export function markOut(C, i) { const m = C.members[i]; if (!m || DOWN.has(m.state)) return null; m.state = 'out'; return { type: 'out', i }; }
export function canBind(C, i) { const m = C.members[i]; return !!m && (m.state === 'out' || m.state === 'surrender'); }
export function bind(C, i) { if (!canBind(C, i)) return null; C.members[i].state = 'bound'; return { type: 'bound', i }; }
export function take(C, i) { const m = C.members[i]; if (!m || m.state !== 'bound') return null; m.state = 'taken'; return { type: 'taken', i }; }
export function boundCount(C) { return C.members.filter(m => m.state === 'bound' || m.state === 'taken').length; }
export function isSurrendered(C, i) { return C.members[i]?.state === 'surrender'; }
export function resetCrew(C) { const n = createCrew(); C.members = n.members; C.alerted = false; }
