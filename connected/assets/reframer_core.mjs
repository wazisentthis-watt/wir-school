// REFRAMERS on foot — PROPOSAL / PUBLISH HOLD
// Ported from the owner's "WIR ReFramer Rush 3D v0.1" ReframerEngine (seek → read → anchor → release → reframe → chase),
// re-cut for Metal on foot / on the board in Connected. Eight-armed machines wake on rooftops, drop on a real car,
// scan it, clamp it, pull its wheels off and rebuild it into a Roadframe that hunts Metal.
// Counters (from Rush): jam the scan (Gallium hit during READ), tip it over (heavy hit / glob / thrown car during ANCHOR),
// rescue the occupant (E at the car before RELEASE), break the Roadframe and salvage its Gallium residue.
// Pure: main.js owns meshes, cars and damage.

export const RF = {
  DUR: { drop: 0.7, read: 2.4, anchor: 2.6, release: 2.4, reframe: 3.6, stagger: 2.4, stun: 3.0 },
  WAKE: 55, NEST_COOL: 25, JAMS_TO_ABORT: 2, TIP_HITS: 2, ROAD_HP: 1, ROAD_SPEED: 7.5, RAM_DMG: 0.16, RAM_CD: 1.6,
  RESIDUE: 0.35,
};

export function createReframers(nests) {
  return { nests: nests.map((n, i) => ({ id: 'N' + (i + 1), x: n.x, y: n.y ?? 10, z: n.z, cool: i * 6 })), enc: null, ledger: [],
    stats: { encounters: 0, clean: 0, aborted: 0, rescued: 0, shaken: 0, lost: 0, roadframesDown: 0, jams: 0, tips: 0 } };
}

// donors: [{id, x, z, occupied}] ; metal: {x,z}
export function wake(W, metal, donors) {
  if (W.enc) return null;
  let nest = null, bd = 1e9;
  for (const n of W.nests) { if (n.cool > 0) continue; const d = Math.hypot(n.x - metal.x, n.z - metal.z); if (d < RF.WAKE && d < bd) { bd = d; nest = n; } }
  if (!nest) return null;
  let donor = null, best = 1e9;
  for (const c of donors) { const d = Math.hypot(c.x - nest.x, c.z - nest.z); if (d < 40 && d < best) { best = d; donor = c; } }
  if (!donor) { nest.cool = 8; return null; }
  W.stats.encounters++;
  W.enc = { id: 'E' + W.stats.encounters, nest, donor: donor.id, stage: 'drop', t: 0, jams: 0, tipHits: 0, occupied: !!donor.occupied, rescued: false,
    hp: RF.ROAD_HP, ramCd: 0, pos: { x: nest.x, y: nest.y, z: nest.z }, target: { x: donor.x, z: donor.z }, parts: 0 };
  return W.enc;
}

// hit on the ReFramer / Roadframe: kind 'glob' | 'blast' | 'pulse' | 'strike' | 'car'; power 0..1
export function hit(W, kind, power = 0.5) {
  const E = W.enc; if (!E) return null;
  if (E.stage === 'read' && (kind === 'pulse' || kind === 'blast' || kind === 'glob')) {
    E.jams++; W.stats.jams++;
    if (E.jams >= RF.JAMS_TO_ABORT) return end(W, 'aborted');
    E.t = 0; return { type: 'jam', jams: E.jams };
  }
  if (E.stage === 'anchor' && (kind === 'glob' || kind === 'car' || power >= 0.55)) {
    E.tipHits++;
    if (E.tipHits >= RF.TIP_HITS || kind === 'car' || power >= 0.85) { E.stage = 'stagger'; E.t = 0; W.stats.tips++; return { type: 'tipped' }; }
    return { type: 'rocked' };
  }
  if (E.stage === 'stagger' || E.stage === 'stun') { E.stage = 'stun'; E.t = 0; E.hp -= 0.5 * (0.5 + power); if (E.hp <= 0) return end(W, 'clean'); return { type: 'stunHit' }; }
  if (E.stage === 'chase') { E.hp -= (kind === 'glob' ? 0.34 : kind === 'car' ? 0.5 : kind === 'blast' ? 0.2 : 0.1) * (0.6 + power); if (E.hp <= 0) return end(W, 'roadframeDown'); return { type: 'roadHit', hp: E.hp }; }
  return { type: 'clang' };
}

export function rescue(W) {
  const E = W.enc; if (!E || !E.occupied || E.rescued) return false;
  if (E.stage === 'read' || E.stage === 'anchor' || E.stage === 'stagger' || E.stage === 'stun' || E.stage === 'drop') { E.rescued = true; W.stats.rescued++; return true; }
  return false;
}

function end(W, outcome) {
  const E = W.enc; W.enc = null; E.nest.cool = RF.NEST_COOL;
  if (outcome === 'clean') W.stats.clean++; if (outcome === 'aborted') W.stats.aborted++; if (outcome === 'roadframeDown') W.stats.roadframesDown++;
  const lostCar = outcome === 'roadframeDown' || outcome === 'escaped';
  W.ledger.push({ id: E.id, outcome, rescued: E.rescued, occupied: E.occupied, jams: E.jams, carLost: lostCar });
  return { type: 'end', outcome, residue: outcome === 'roadframeDown' || outcome === 'clean' ? RF.RESIDUE : 0, donor: E.donor, carLost: lostCar };
}

// metal: {x,z}; donorPos: {x,z} (live car position). returns { events[], ram: dmg }
export function step(W, metal, donorPos, dt) {
  const out = { events: [], ram: 0 };
  for (const n of W.nests) if (n.cool > 0) n.cool -= dt;
  const E = W.enc; if (!E) return out;
  E.t += dt; const D = RF.DUR;
  if (donorPos) E.target = { x: donorPos.x, z: donorPos.z };
  const at = (s) => { E.stage = s; E.t = 0; out.events.push({ type: 'stage', stage: s }); };
  switch (E.stage) {
    case 'drop': { const k = Math.min(1, E.t / D.drop); E.pos.x += (E.target.x - E.pos.x) * k; E.pos.z += (E.target.z - E.pos.z) * k; E.pos.y = E.nest.y * (1 - k) + 2.2 * k; if (E.t >= D.drop) at('read'); break; }
    case 'read': if (E.t >= D.read) at('anchor'); break;
    case 'anchor': if (E.t >= D.anchor) at('release'); break;
    case 'stagger': if (E.t >= D.stagger) at('anchor'); break;
    case 'stun': if (E.t >= D.stun) at('anchor'); break;
    case 'release':
      if (E.occupied && !E.rescued && !E.shook) { E.shook = true; W.stats.shaken++; out.events.push({ type: 'occupantShaken' }); } // canon: people always get out; unrescued = shaken
      E.parts = Math.min(4, Math.floor(E.t / D.release * 5)); if (E.t >= D.release) at('reframe'); break;
    case 'reframe': if (E.t >= D.reframe) { at('chase'); out.events.push({ type: 'roadframe' }); } break;
    case 'chase': {
      const dx = metal.x - E.target.x, dz = metal.z - E.target.z, d = Math.hypot(dx, dz) || 1;
      E.target.x += dx / d * RF.ROAD_SPEED * dt; E.target.z += dz / d * RF.ROAD_SPEED * dt; E.heading = Math.atan2(dx, dz);
      E.ramCd -= dt; if (d < 2.4 && E.ramCd <= 0) { E.ramCd = RF.RAM_CD; out.ram = RF.RAM_DMG; out.events.push({ type: 'ram' }); }
      if (E.t > 45) { out.events.push(end(W, 'escaped')); return out; }
      break;
    }
  }
  if (E && E.stage !== 'drop') { E.pos.x = E.target.x; E.pos.z = E.target.z; }
  return out;
}
