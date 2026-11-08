// PROLOGUE · LEARN THE CITY — PROPOSAL / PUBLISH HOLD (owner direction 2026-11-07)
// The first mission of the game: where you are and what there is to do, then traversal, the board, Gallop, the
// Gallium line, the Snapline, a real street fight with three different opponents, restraining them with Gallium
// (nonlethal — nobody dies), the police pickup, and cycling through every power. It hands off to Ep.1 at Morrow Block.
// No canon story is invented: the title, the order and the numbers are gameplay PROPOSALS.
// Pure state machine (no DOM / Three). main.js feeds what Metal does and reacts to the events.

export const PRO = {
  id: 'prologue', title: 'Prologue · Learn the City',
  LOOK: 2.4, WALK: 10, JUMPS: 1, PUSH_SPEED: 5.5, GATES: 3, POPS: 1, GALLOP: 3, SWINGS: 1, SNAPS: 1,
  CREW_R: 16, PICKUP_T: 6, GRACE: 60, NEXT_R: 26,
  REQUIRED: ['glob', 'blast', 'pull'], FORMS: ['sword', 'shield', 'plasma'],   // + any one form while pulling
};

export const STEPS = ['where', 'walk', 'board', 'push', 'gates', 'pop', 'gallop', 'swing', 'snapline', 'toCrew', 'fight', 'pickup', 'powers', 'next', 'done'];
const TEACH = new Set(['where', 'walk', 'board', 'push', 'gates', 'pop', 'gallop', 'swing', 'snapline', 'powers']); // teaching steps never block you
const CHECKPOINT = { fight: 'toCrew', pickup: 'powers' };

export function createPro() {
  return { v: 1, step: 'where', t: 0, runT: 0,
    n: { look: 0, walk: 0, jumps: 0, gates: 0, pops: 0, gallop: 0, swings: 0, snaps: 0 },
    seen: [], used: [], skipped: [], downs: 0, binds: 0,
    ledger: { completed: false, completions: 0, bestTime: null, dodges: 0, hitSurrendered: 0, wipes: 0 } };
}

const to = (M, s, out, why) => { M.step = s; M.t = 0; out.events.push({ type: 'step', step: s, why }); };
const add = (arr, v) => { if (!arr.includes(v)) { arr.push(v); return true; } return false; };

// discrete things Metal did. Returns an event or null.
export function feed(M, kind, v = 1) {
  const s = M.step, n = M.n;
  switch (kind) {
    case 'look': if (s === 'where') n.look += Math.abs(v); return null;
    case 'walk': if (s === 'walk') n.walk += v; return null;
    case 'jump': if (s === 'walk') { n.jumps++; return { type: 'progress' }; } return null;
    case 'gate': if (s === 'gates') { n.gates++; return { type: 'gate', n: n.gates }; } return null;
    case 'pop': if (s === 'pop') { n.pops++; return { type: 'progress' }; } return null;
    case 'gallop': if (s === 'gallop') { n.gallop = Math.max(n.gallop, v); return { type: 'gallop', chain: v }; } return null;
    case 'swing': if (s === 'swing') { n.swings++; return { type: 'progress' }; } return null;
    case 'snap': if (s === 'snapline') { n.snaps++; return { type: 'progress' }; } return null;
    case 'down': if (s === 'fight') { M.downs++; return { type: 'down', downs: M.downs }; } return null;
    case 'bind': if (s === 'fight') { M.binds++; return { type: 'bind', binds: M.binds }; } return null;
    case 'dodge': M.ledger.dodges++; return null;
    case 'hitSurrendered': M.ledger.hitSurrendered++; return { type: 'warn', why: 'surrendered' };
    case 'card': return add(M.seen, v) ? { type: 'card', id: v, seen: M.seen.length } : null;
    case 'power': return add(M.used, v) ? { type: 'power', id: v } : null;
    case 'wiped': if (s === 'fight') { M.ledger.wipes++; M.downs = 0; M.binds = 0; M.step = 'toCrew'; M.t = 0; return { type: 'step', step: 'toCrew', why: 'wiped' }; } return null;
  }
  return null;
}

export function powersDone(M, cardsTotal) {
  return M.seen.length >= cardsTotal && PRO.REQUIRED.every(p => M.used.includes(p)) && PRO.FORMS.some(p => M.used.includes(p));
}

// w: { riding, speed, crewDist, crewBound, crewTotal, cardsTotal, nextDist }
export function step(M, w, dt) {
  const out = { events: [] };
  if (M.step === 'done') return out;
  M.t += dt; M.runT += dt;
  const n = M.n, s = M.step;
  let next = null;
  if (s === 'where' && n.look >= PRO.LOOK) next = 'walk';
  else if (s === 'walk' && n.walk >= PRO.WALK && n.jumps >= PRO.JUMPS) next = 'board';
  else if (s === 'board' && w.riding) next = 'push';
  else if (s === 'push' && w.riding && w.speed >= PRO.PUSH_SPEED) next = 'gates';
  else if (s === 'gates' && n.gates >= PRO.GATES) next = 'pop';
  else if (s === 'pop' && n.pops >= PRO.POPS) next = 'gallop';
  else if (s === 'gallop' && n.gallop >= PRO.GALLOP) next = 'swing';
  else if (s === 'swing' && n.swings >= PRO.SWINGS) next = 'snapline';
  else if (s === 'snapline' && n.snaps >= PRO.SNAPS) next = 'toCrew';
  else if (s === 'toCrew' && w.crewDist < PRO.CREW_R) { next = 'fight'; out.events.push({ type: 'crewAlert' }); }
  else if (s === 'fight' && w.crewTotal > 0 && w.crewBound >= w.crewTotal) next = 'pickup';
  else if (s === 'pickup' && M.t >= PRO.PICKUP_T) { next = 'powers'; out.events.push({ type: 'pickup' }); }
  else if (s === 'powers' && powersDone(M, w.cardsTotal)) next = 'next';
  else if (s === 'next' && w.nextDist < PRO.NEXT_R) next = 'done';
  if (!next && TEACH.has(s) && M.t >= PRO.GRACE) { next = STEPS[STEPS.indexOf(s) + 1]; M.skipped.push(s); out.events.push({ type: 'skipped', step: s }); }
  if (next) {
    if (next === 'next' && !M.ledger.completed) {
      M.ledger.completed = true; M.ledger.completions++;
      M.ledger.bestTime = M.ledger.bestTime == null ? M.runT : Math.min(M.ledger.bestTime, M.runT);
      out.events.push({ type: 'complete', time: M.runT });
    }
    to(M, next, out);
  }
  return out;
}

export function checkpoint(step) { return CHECKPOINT[step] || step; }
export function serialize(M) {
  return JSON.stringify({ v: 1, step: checkpoint(M.step), seen: M.seen, used: M.used, skipped: M.skipped, ledger: M.ledger, runT: +M.runT.toFixed(1) });
}
export function deserialize(txt) {
  try {
    const o = JSON.parse(txt); if (!o || o.v !== 1 || !STEPS.includes(o.step)) return null;
    const M = createPro(); M.step = o.step; M.runT = +o.runT || 0;
    for (const k of ['seen', 'used', 'skipped']) if (Array.isArray(o[k])) M[k] = o[k].filter(x => typeof x === 'string');
    if (o.ledger && typeof o.ledger === 'object') Object.assign(M.ledger, o.ledger);
    return M;
  } catch (e) { return null; }
}
