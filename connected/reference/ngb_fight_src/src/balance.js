// BALANCE ENGINE — real stance physics for every fighter, every frame.
//
// Model (biomechanics, simplified to what a fight needs):
//  · Base of support = the two planted feet (a capsule from rear foot to lead foot, ~a foot-width wide). A foot in the air is NOT base:
//    mid-step, mid-switch and mid-pivot you stand on one foot.
//  · Centre of mass (COM) = hips + chest + head, ground-projected.
//  · Extrapolated COM (Hof 2005): XCoM = COM + v_unplanned / ω0, ω0 = √(g / leg length). Momentum you didn't choose (a miss that carries you,
//    a shot that moves you, a bad pivot) pushes it out of the base. Walking where you meant to go is "planned" and doesn't count.
//  · Margin = how far XCoM is inside the base. Below zero you MUST step to catch yourself; if no foot is free to step, or the step needed
//    is longer than your legs can make in time, you stumble.
//  · Weight distribution = where the COM sits between rear and lead foot (boxers live ~45/55 to 60/40 back-weighted; a cross drives it
//    onto the lead foot; pulling back loads the rear).
//  · Stance width = sideways gap between the feet across the line to him. Narrow = "on a tightrope"; feet crossed = no base at all.
//
// What it decides: whether a pivot is clean, sloppy or a stumble; whether a switch-step works; how badly a punch moves you when you're
// caught narrow / on one foot / mid-switch; and everything goes through your BALANCE + AGILITY attributes, which grow with clean reps.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const W0 = Math.sqrt(9.81 / 1.0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

export function skill(f) { return 0.5 * f.attrK('balance') + 0.5 * f.attrK('agility'); } // 0 … 1
const leadIdx = f => (f.stance === 'southpaw' ? 1 : 0);

// distance from point p to segment ab on the ground, and the param t (0 = a, 1 = b)
function segDist(p, a, b) { const abx = b.x - a.x, abz = b.z - a.z; const L2 = abx * abx + abz * abz || 1e-6; const t = clamp(((p.x - a.x) * abx + (p.z - a.z) * abz) / L2, 0, 1); const x = a.x + abx * t, z = a.z + abz * t; return { d: Math.hypot(p.x - x, p.z - z), t }; }

export function balanceUpdate(f, dt, mvTarget) {
  const B = f.B; const bal = f.bal || (f.bal = { margin: 0.1, front: 0.45, width: 0.2, crossed: false, air: -1, low: 0, stumbleT: 0, inst: 0 });
  bal.stumbleT = Math.max(0, bal.stumbleT - dt);
  // feet: planted positions (a stepping foot is in the air)
  const fs = f.footSys; let feet, air = -1;
  // a boxer's bounce and small adjustment steps keep both feet as base (the foot barely leaves the canvas); only a real step (>18 cm),
  // in its middle, leaves you on one foot
  let stepping = false;
  if (fs) { feet = fs.map(x => x.planted); fs.forEach((x, i) => { const st = x.step; if (!st) return; stepping = true; const len = Math.hypot(st.to.x - st.from.x, st.to.z - st.from.z); if (len > 0.18 && st.t > 0.2 && st.t < 0.8) air = i; }); }
  else feet = [B.LeftFoot.getWorldPosition(_a).clone(), B.RightFoot.getWorldPosition(_b).clone()];
  if (f.switching && f.switching.t < f.switching.dur * 0.8) air = air >= 0 ? air : (f.switching.kind === 'drop' ? leadIdx(f) ^ 1 : leadIdx(f)); // the passing foot
  bal.air = air;
  // centre of mass
  const hips = B.Hips.getWorldPosition(_a), chest = B.Spine2.getWorldPosition(_b), head = B.Head.getWorldPosition(_c);
  const com = new THREE.Vector3(hips.x * 0.55 + chest.x * 0.3 + head.x * 0.15, 0, hips.z * 0.55 + chest.z * 0.3 + head.z * 0.15);
  // posture the procedural layer adds on top of the mocap: leaning back loads the rear foot, ducking/slipping moves the weight, a rear-hand
  // power shot drives it over the lead foot
  { const st = f.strike; let fwd = -0.16 * (f.pullK || 0) + 0.04 * (f.duckK || 0); if (st && st.def) { const u = Math.min(1, st.t / (st.def.impact || 0.2)); const rearHand = st.hi !== leadIdx(f); fwd += (st.def.path === 'straight' ? (rearHand ? 0.1 : 0.04) : st.def.path === 'hook' ? 0.03 : 0.02) * u * (st.heavy ? 1.4 : 1); }
    com.add(f.dirWorld(new THREE.Vector3((f.weaveX || 0) * 0.08, 0, fwd))); }
  const vu = f.vel.clone(); if (mvTarget) vu.sub(mvTarget); vu.y = 0; // unplanned momentum only
  const xcom = com.clone().addScaledVector(vu, 1 / W0);
  const r = 0.085 + 0.025 * f.attrK('balance'); // effective half-width of the base (foot + control)
  const li = leadIdx(f), lead = feet[li], rear = feet[li ^ 1];
  let margin, front;
  if (air >= 0) { const st = feet[air ^ 1]; margin = r - Math.hypot(xcom.x - st.x, xcom.z - st.z); front = air === li ? 0 : 1; }
  else { const sd = segDist(xcom, rear, lead); margin = r - sd.d; front = segDist(com, rear, lead).t; }
  // stance width across the line to him (+ = proper, − = crossed)
  const fl = f.toLocal(lead.clone()), fr = f.toLocal(rear.clone()); const side = li === 0 ? 1 : -1; const width = (fl.x - fr.x) * side;
  bal.margin = margin; bal.front = front; bal.width = width; bal.crossT = width < -0.05 ? (bal.crossT || 0) + dt : 0; bal.crossed = bal.crossT > 0.1; bal.narrow = width < 0.06; // the bounce can briefly line the feet up — crossed has to really happen bal.com = com; bal.xcom = xcom; bal.feet = feet;
  // instability 0…1: how much a shot right now would move you
  bal.inst = clamp((0.05 - margin) / 0.15, 0, 1) * 0.6 + (air >= 0 ? 0.35 : 0) + (bal.crossed ? 0.5 : bal.narrow ? 0.2 : 0) + (f.switching ? 0.3 : 0);
  bal.inst = clamp(bal.inst, 0, 1);
  // can you catch it with a step? (a foot must be free, the step must be reachable in time)
  // a step already on its way IS the catch (that's how walking works); pivots and switches judge themselves
  const busy = stepping || f.pivotStep || f.switching || f.game.time - (f.pivotEndT || -9) < 0.2;
  if (margin < -0.02 && !busy && (f.state === 'idle' || f.state === 'strike') && bal.stumbleT <= 0) {
    bal.low += dt; const reach = 0.22 + 0.18 * f.attrK('agility'); const footFree = !(f.strike && f.strike.heavy && f.strike.t < f.strike.def.impact + 0.05);
    if (bal.low > 0.08 && (!footFree || -margin > reach)) stumble(f, vu.lengthSq() > 0.01 ? vu.clone().normalize() : xcom.clone().sub(com).setY(0).normalize(), clamp(-margin / 0.25, 0.25, 1), bal.crossed ? 'feet crossed' : air >= 0 ? 'caught on one foot' : 'overcommitted');
  } else bal.low = 0;
  // crossing your feet while moving is a stumble waiting to happen
  if (bal.crossed && f.vel.lengthSq() > 0.25 && bal.stumbleT <= 0 && (f.state === 'idle' || f.state === 'strike') && Math.random() < dt * 4 * (1 - 0.6 * skill(f))) stumble(f, f.vel.clone().setY(0).normalize(), 0.45, 'feet crossed');
}

export function stumble(f, dir, sev, why) {
  const bal = f.bal || {}; if (bal.stumbleT > 0) return; bal.stumbleT = 0.6 + 0.6 * sev;
  f.offBalance = Math.max(f.offBalance, 0.25 + 0.55 * sev); f.vel.addScaledVector(dir, 0.5 + 0.9 * sev); f.stamina = Math.max(0, f.stamina - 3 * sev);
  if (f.strike && sev > 0.5) { f.strike = null; f.state = 'idle'; f.queued = null; }
  f.pivotStep = null; f.stats.stumbles = (f.stats.stumbles || 0) + 1; f.lastStumble = { why, sev, t: f.game.time };
  f.game.onEvent(f, 'stumble', { why, sev });
}

// ---------------- pivots ----------------
// side 'left' = turning on the LEFT foot. The pivot foot must carry the weight (you turn on the ball of a loaded foot).
export function pivotQuality(f, side, noise = true) {
  const bal = f.bal || { front: 0.45, margin: 0.08, width: 0.2 }; const li = leadIdx(f); const pf = side === 'left' ? 0 : 1; const onLead = pf === li;
  const wOn = onLead ? bal.front : 1 - bal.front; // weight on the pivot foot
  const sk = skill(f); const why = [];
  let q = 0.62 + 0.3 * sk;
  q += 0.55 * (wOn - 0.5); if (wOn < 0.35) why.push('weight on the wrong foot');
  if (!onLead) { q -= 0.08; }
  q += clamp(bal.margin * 1.5, -0.3, 0.06); if (bal.margin < 0) why.push('already off balance');
  if (bal.crossed) { q -= 0.35; why.push('feet crossed'); } else if (bal.narrow) q -= 0.08;
  const s = f.strike; if (s) { const d = s.def, leadHand = s.hi === li;
    if (d.path === 'hook' && leadHand && onLead) q += 0.08; // the check hook: lead hook turns you on the lead foot — that IS the pivot
    else if (s.heavy || d.path === 'straight' && !leadHand) { q -= onLead ? 0.12 : 0.3; why.push('mid-punch'); }
    else q -= 0.06; }
  const v = f.vel.clone(); v.y = 0; const sp = v.length(); if (sp > 0.6) { const tang = f.toLocal(f.pos.clone().add(v)).x * (side === 'left' ? -1 : 1); if (tang < -0.3) { q -= 0.2; why.push('moving the other way'); } else q -= 0.05; }
  if (f.stamina < 25) { q -= 0.12; why.push('legs are gone'); } if (f.stunT > 0 || f.daze > 55) { q -= 0.2; why.push('hurt'); }
  if (f.switching) { q -= 0.4; why.push('mid-switch'); }
  if (noise) q += (Math.random() - 0.5) * (0.22 - 0.14 * sk); // the less skilled, the less consistent
  return { q: clamp(q, 0, 1), why, onLead, wOn };
}

// ---------------- switching stance ----------------
// kinds: 'through' (rear foot steps forward past the lead — moves you IN), 'drop' (lead foot steps back — moves you OUT), 'shuffle' (quick
// little hop in place). For a moment the feet pass each other: base is narrow and one foot is in the air. That's when you get caught.
export function switchQuality(f, kind, noise = true) {
  const bal = f.bal || { front: 0.45, margin: 0.08 }; const sk = skill(f); const why = []; let q = 0.66 + 0.28 * sk;
  if (kind === 'through' && bal.front < 0.35) { q -= 0.15; why.push('weight on the back foot'); }
  if (kind === 'drop' && bal.front > 0.7) { q -= 0.15; why.push('weight on the front foot'); }
  if (kind === 'shuffle') q -= 0.05;
  q += clamp(bal.margin * 1.5, -0.3, 0.05); if (bal.margin < 0) why.push('off balance');
  const v = f.toLocal(f.pos.clone().add(f.vel)); const back = -v.z, fwd = v.z;
  if (kind === 'through' && back > 0.5) { q -= 0.25; why.push('moving backwards'); } if (kind === 'drop' && fwd > 0.6) { q -= 0.25; why.push('moving forward'); }
  if (Math.abs(v.x) > 0.7) { q -= 0.15; why.push('moving sideways'); }
  if (f.strike) { q -= 0.3; why.push('mid-punch'); } if (f.stamina < 20) { q -= 0.12; why.push('legs are gone'); } if (f.stunT > 0 || f.daze > 55) { q -= 0.25; why.push('hurt'); }
  if (noise) q += (Math.random() - 0.5) * (0.2 - 0.12 * sk);
  return { q: clamp(q, 0, 1), why };
}

// ---------------- getting hit while unstable ----------------
// returns the damage multiplier, and moves you more (knock & stagger) the less base you had
export function hitWhileUnstable(def, att, s, tags) {
  const bal = def.bal; if (!bal) return 1; const inst = bal.inst || 0; if (inst < 0.25) return 1;
  def.offBalance = Math.max(def.offBalance, 0.15 + 0.35 * inst); def.vel.addScaledVector(att.forward, 0.3 + 0.6 * inst);
  if (inst > 0.7 && s.heavy) stumble(def, att.forward.clone().setY(0).normalize(), 0.7, def.switching ? 'caught switching' : bal.air >= 0 ? 'caught on one foot' : 'caught off balance');
  tags.push(def.switching ? 'CAUGHT SWITCHING' : bal.air >= 0 ? 'CAUGHT ON ONE FOOT' : bal.crossed ? 'FEET CROSSED' : 'OFF BALANCE');
  return 1 + 0.25 * inst;
}
