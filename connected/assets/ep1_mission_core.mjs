// EP.1 "CONCRETE HAS A TEMPO" — PROPOSAL / PUBLISH HOLD (owner's Season One free-roam mission blueprint, 2026-11-06)
// 1 skate to the neighborhood recording session · 2 chase Ballast after the depot robbery · 3 lose the first confrontation
// 4 save the civilians under the collapsing market awning · 5 beat Ballast with the delivery platform, not bigger punches
// 6 return to the session, save, keep free-roaming.
// Pure state machine (no DOM / Three). main.js owns meshes, the fight system, audio and input; it calls step() with what
// it sees and reacts to the events it gets back. Timings and counts are game-balancing proposals, not canon.

export const EP1 = {
  id: 'ep1', ep: 1, title: 'Concrete Has a Tempo', STEMS: 6,
  STUDIO_R: 4.5,
  BPM: 96, BEAT_WIN: 0.13, BEATS_NEEDED: 6, SESSION_MAX: 40,  // land / push / pop on Nia's beat; the session always finishes
  ALARM_T: 2.2,
  CATCH_R: 5.5, TOSS_R: 16, TOSS_CD: 3.6, BALLAST_RUN: 4.2,     // chase
  CLASH_T: 16, CLASH_HP: 0.32, CLASH_MIN_STANCE: 0.25,          // scripted first loss: he can't go down here
  DOWN_T: 3.2,
  AWN: { civs: 4, sag0: 0.12, sagRate: 0.055, braceRate: 0.09, outT: 1.4, braceR: 6.5 },
  PLAT: { dropT: 0.55, shadowR: 2.3, rehoist: 6, pullT: 0.8, punchHint: 4, minStance: 0.2 },
  PIN_T: 2.6,
};

export const STAGES = ['toStudio', 'session', 'alarm', 'chase', 'clash', 'down', 'awning', 'platform', 'pinned', 'return', 'done'];
const CHECKPOINT = { toStudio: 'toStudio', session: 'toStudio', alarm: 'chase', chase: 'chase', clash: 'chase', down: 'chase',
  awning: 'platform', platform: 'platform', pinned: 'return', return: 'return', done: 'done' };

export function createEp1() {
  return { v: 1, stage: 'toStudio', t: 0, beats: 0, beatMiss: 0, tossCd: 0, clashHp0: null, punches: 0,
    awn: null, plat: { state: 'up', t: 0, latch: 1, drops: 0, misses: 0 },
    ledger: { civsClean: 0, civsShaken: 0, platformMisses: 0, losses: 0, stems: 0, completions: 0, bestTime: null }, runT: 0 };
}

const to = (M, s, out) => { M.stage = s; M.t = 0; out.events.push({ type: 'stage', stage: s }); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// beat phase: distance in seconds from the nearest beat of Nia's loop
export function beatError(time, bpm = EP1.BPM) { const p = 60 / bpm, k = time / p; return Math.abs(k - Math.round(k)) * p; }

// discrete things Metal did — feed() from main.js; returns an event or null
// kinds: 'push' 'land' 'pop' 'stomp' (session) · 'punch' (direct hit on Ballast) · 'latch' (glob / draw on the platform latch, power 0..1)
export function feed(M, kind, { time = 0, power = 1 } = {}) {
  if (M.stage === 'session' && (kind === 'push' || kind === 'land' || kind === 'pop' || kind === 'stomp')) {
    if (beatError(time) <= EP1.BEAT_WIN) { M.beats++; return { type: 'onBeat', beats: M.beats }; }
    M.beatMiss++; return { type: 'offBeat' };
  }
  if ((M.stage === 'clash' || M.stage === 'platform') && kind === 'punch') {
    M.punches++;
    if (M.stage === 'platform' && M.punches === EP1.PLAT.punchHint) return { type: 'hint', hint: 'platform' };
    return null;
  }
  if (M.stage === 'platform' && kind === 'latch' && M.plat.state === 'up') {
    M.plat.latch -= Math.max(0.35, power);
    if (M.plat.latch <= 0.05) { M.plat.state = 'dropping'; M.plat.t = 0; M.plat.drops++; return { type: 'platformRelease' }; }
    return { type: 'latchHit', latch: M.plat.latch };
  }
  return null;
}

// world each frame: { metal:{x,z}, studio:{x,z}, ballast:{x,z}, market:{x,z}, platform:{x,z}, metalHp, braced, drawing,
//   ballastAtPath (true once the robbery run reached the market) }
export function step(M, w, dt) {
  const out = { events: [], minStance: 0, ballastMode: null };
  M.t += dt; if (M.stage !== 'done' && M.stage !== 'toStudio') M.runT += dt;
  switch (M.stage) {
    case 'toStudio':
      if (dist(w.metal, w.studio) < EP1.STUDIO_R) { to(M, 'session', out); M.beats = 0; M.beatMiss = 0; out.events.push({ type: 'sessionStart', bpm: EP1.BPM }); }
      break;
    case 'session':
      if (dist(w.metal, w.studio) > 30) { to(M, 'toStudio', out); break; }                // walked out of the session
      if (M.beats >= EP1.BEATS_NEEDED || M.t >= EP1.SESSION_MAX) { out.events.push({ type: 'take', beats: M.beats }); to(M, 'alarm', out); out.events.push({ type: 'depotAlarm' }); }
      break;
    case 'alarm': out.ballastMode = 'rob'; if (M.t >= EP1.ALARM_T) to(M, 'chase', out); break;
    case 'chase': {
      out.ballastMode = 'run';
      const d = dist(w.metal, w.ballast);
      M.tossCd -= dt; if (d < EP1.TOSS_R && d > EP1.CATCH_R && M.tossCd <= 0) { M.tossCd = EP1.TOSS_CD; out.events.push({ type: 'tossCrate' }); }
      if (d < EP1.CATCH_R) { to(M, 'clash', out); M.clashHp0 = w.metalHp; M.punches = 0; out.events.push({ type: 'fight', round: 1 }); }
      break;
    }
    case 'clash': {
      out.ballastMode = 'fight'; out.minStance = EP1.CLASH_MIN_STANCE;
      const lost = M.clashHp0 - w.metalHp;
      if (M.t >= EP1.CLASH_T || lost >= EP1.CLASH_HP) { M.ledger.losses++; out.events.push({ type: 'scriptedLoss' }); to(M, 'down', out); }
      break;
    }
    case 'down':
      out.ballastMode = 'wreck';
      if (M.t >= EP1.DOWN_T) { M.awn = { sag: EP1.AWN.sag0, civs: EP1.AWN.civs, out: 0, shaken: 0, braceT: 0, fell: false };
        out.events.push({ type: 'awningBreak', civs: EP1.AWN.civs }); to(M, 'awning', out); }
      break;
    case 'awning': {
      out.ballastMode = 'toDock';
      const A = M.awn, A0 = EP1.AWN;
      const braced = !!w.braced && dist(w.metal, w.market) < A0.braceR;
      if (braced) { A.sag = Math.max(0.05, A.sag - A0.braceRate * dt); A.braceT += dt;
        if (A.braceT >= A0.outT && A.civs > 0) { A.braceT = 0; A.civs--; A.out++; M.ledger.civsClean++; out.events.push({ type: 'civOut', left: A.civs }); } }
      else { A.sag += A0.sagRate * dt; }
      if (A.sag >= 1 && !A.fell) { A.fell = true; A.shaken = A.civs; M.ledger.civsShaken += A.civs; A.civs = 0; out.events.push({ type: 'awningDown', shaken: A.shaken }); } // canon: people always get out; unbraced = shaken
      out.sag = A.sag; out.braced = braced;
      if (A.civs === 0) { to(M, 'platform', out); M.punches = 0; M.plat = { state: 'up', t: 0, latch: 1, drops: 0, misses: 0 }; out.events.push({ type: 'fight', round: 2 }); }
      break;
    }
    case 'platform': {
      out.ballastMode = 'fight'; out.minStance = EP1.PLAT.minStance;
      const Pl = M.plat;
      if (Pl.state === 'dropping') { Pl.t += dt; out.platY = Math.max(0, 1 - Pl.t / EP1.PLAT.dropT);
        if (Pl.t >= EP1.PLAT.dropT) {
          if (dist(w.ballast, w.platform) < EP1.PLAT.shadowR) { out.events.push({ type: 'pinned' }); to(M, 'pinned', out); }
          else { Pl.state = 'down'; Pl.t = 0; Pl.misses++; M.ledger.platformMisses++; out.events.push({ type: 'platformMiss', metalUnder: dist(w.metal, w.platform) < EP1.PLAT.shadowR }); }
        } }
      else if (Pl.state === 'down') { Pl.t += dt; out.platY = Math.min(1, Pl.t / EP1.PLAT.rehoist); if (Pl.t >= EP1.PLAT.rehoist) { Pl.state = 'up'; Pl.latch = 1; out.events.push({ type: 'rehoisted' }); } }
      else out.platY = 1;
      // drawing at the gantry post pulls the pin out
      if (Pl.state === 'up' && w.drawing && w.post && dist(w.metal, w.post) < 3) { Pl.pull = (Pl.pull || 0) + dt; if (Pl.pull >= EP1.PLAT.pullT) { Pl.pull = 0; const e = feed(M, 'latch', { power: 1 }); if (e) out.events.push(e); } }
      else Pl.pull = 0;
      break;
    }
    case 'pinned':
      out.ballastMode = 'pinned';
      if (M.t >= EP1.PIN_T) { out.events.push({ type: 'ballastDown' }); to(M, 'return', out); }
      break;
    case 'return':
      if (dist(w.metal, w.studio) < EP1.STUDIO_R) { M.ledger.stems = Math.max(M.ledger.stems, 1); M.ledger.completions++;
        if (M.ledger.bestTime == null || M.runT < M.ledger.bestTime) M.ledger.bestTime = Math.round(M.runT);
        out.events.push({ type: 'complete', stems: M.ledger.stems, of: EP1.STEMS, civsClean: M.ledger.civsClean, civsShaken: M.ledger.civsShaken }); to(M, 'done', out); }
      break;
  }
  return out;
}

// a fight that ended in the fight system (Metal knocked out / walked off) puts the mission back to where Ballast waits
export function fightAbandoned(M) {
  if (M.stage === 'clash') { M.stage = 'chase'; M.t = 0; return 'chase'; }
  if (M.stage === 'platform') { M.t = 0; return 'platform'; }
  return M.stage;
}
// replay from the studio after completion (free roam keeps the stem)
export function replay(M) { if (M.stage !== 'done') return false; const L = M.ledger; Object.assign(M, createEp1(), { ledger: L }); return true; }

export function serialize(M) { return JSON.stringify({ v: 1, stage: CHECKPOINT[M.stage] || 'toStudio', ledger: M.ledger }); }
export function deserialize(txt) {
  const M = createEp1(); let d; try { d = JSON.parse(txt); } catch (e) { return M; }
  if (!d || d.v !== 1) return M;
  Object.assign(M.ledger, d.ledger || {});
  M.stage = STAGES.includes(d.stage) ? d.stage : 'toStudio';
  if (M.stage === 'platform') { M.awn = { sag: 0, civs: 0, out: EP1.AWN.civs, shaken: 0, braceT: 0, fell: false }; }
  return M;
}
