// Analog boxing: bumpers select a hand, the right stick throws it; triggers raise each hand's guard.
// No bumper = the right stick moves the body (slip / duck / pull / roll). Lean is latched when you switch to punching.
import * as THREE from 'three';
import { BTN } from './input.js';

const DEAD = 0.2, LAUNCH = 0.55, REARM = 0.3, DOUBLE_TAP = 0.3, CHAMBER = 0.12, SWITCH_WINDOW = 0.22;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function newPadState() {
  return { pressAt: [-9, -9], releaseAt: [-9, -9], lastPressLen: [9, 9], power: [false, false], armed: true, mag: 0, magHist: [], chamber: null,
    lean: [0, 0, 0], rollArmed: true, leftAt: null, abAt: [-9, -9], handGuardAim: [0, 0] };
}

// One controller frame for one fighter. Returns list of menu-ish actions (pause/cam/hud/cook...).
export function analogFrame(game, f, st, ps, now, dt) {
  const v = st.v, b = st.b, down = st.down, up = st.up;
  const held = [(v[BTN.L1] || 0) > 0.4, (v[BTN.R1] || 0) > 0.4];
  const guardT = [(v[BTN.L2] || 0) > 0.3, (v[BTN.R2] || 0) > 0.3];
  const acts = [];
  // --- double-tap-and-hold for power ---
  [BTN.L1, BTN.R1].forEach((btn, h) => {
    if (down.has(btn)) { ps.power[h] = now - ps.releaseAt[h] <= DOUBLE_TAP && ps.lastPressLen[h] <= DOUBLE_TAP; ps.pressAt[h] = now; }
    if (up.has(btn)) { ps.releaseAt[h] = now; ps.lastPressLen[h] = now - ps.pressAt[h]; ps.power[h] = false; }
  });
  // --- buttons that are not punches ---
  const P = (btn, a) => { if (down.has(btn)) acts.push(a); };
  P(BTN.UP, 'cycleL'); P(BTN.DOWN, 'cycleR'); P(BTN.LEFT, 'cookL'); P(BTN.RIGHT, 'cookR');
  P(BTN.OPT, 'cam'); P(BTN.R3, 'switch'); P(BTN.L3, guardT[0] && guardT[1] ? 'guardCycle' : 'wsCycle'); // both triggers held + L3 = next guard style P(BTN.MENU, 'pause');
  // knocked down: any face button helps you up
  if (game.phase === 'down' && game.count && game.count.f === f && [BTN.A, BTN.B, BTN.X, BTN.Y].some(x => down.has(x))) game.count.mash += 0.075;
  const x = st.ax[2], y = st.ax[3], mag = Math.hypot(x, y);
  ps.magHist.push([now, mag]); while (ps.magHist.length && now - ps.magHist[0][0] > 0.15) ps.magHist.shift();
  const I = f.intent;
  // --- clinch ownership: both bumpers start it; keep at least one held to stay in it ---
  let sel = -1;
  const c = f.clinch;
  if (c && c.role === 'holder') { c.holds = held.slice(); I.clinch = held[0] || held[1]; sel = held[0] && !held[1] ? 1 : held[1] && !held[0] ? 0 : -1; }
  else if (c) { I.clinch = false; sel = held[0] !== held[1] ? (held[0] ? 0 : 1) : -1; }
  else { I.clinch = held[0] && held[1]; sel = held[0] !== held[1] ? (held[0] ? 0 : 1) : -1; }
  if (sel >= 0 && guardT[sel]) sel = -1; // that hand is busy guarding
  // guards: a gripping hand can't guard
  const grip = c && c.role === 'holder' && c.holds ? c.holds : [false, false];
  I.handGuard = [guardT[0] && !grip[0], guardT[1] && !grip[1]];
  if (sel >= 0) {
    // ===== punch mode: the stick drives the selected hand; body lean stays where it was =====
    [I.weave, I.duck, I.pull] = ps.lean;
    const s = f.strike;
    if (s && s.analog && s.hi === sel) { s.hold = mag > REARM; s.stick = [x, y]; }
    if (mag < REARM) { ps.armed = true; ps.chamber = null; }
    const u = -y;
    if (ps.armed && mag > LAUNCH && game.inFightPhase()) {
      const across = sel === 1 ? -x : x; let type = null;
      if (y > 0.45) { // dipping: wait a beat to see if it rips up into an uppercut
        if (!ps.chamber) ps.chamber = { t: now, x }; else if (now - ps.chamber.t > CHAMBER) type = Math.abs(x) > 0.45 ? 'bodyHook' : 'bodyStraight';
      } else if (ps.chamber && u > 0.35) type = u > 0.65 ? 'upper' : 'bodyUp';
      else if (u > 0.42 && across > 0.4) type = 'over';
      else if (Math.abs(x) > 0.6 && Math.abs(x) > u * 0.9) type = 'hook';
      else if (u > 0.45) type = 'straight';
      if (type) {
        const m0 = ps.magHist.length ? ps.magHist[0][1] : 0; const flick = clamp((mag - m0) / 0.15, 0, 8);
        if (f.throwAnalog(sel, type, ps.power[sel], [x, y], flick)) { ps.armed = false; ps.chamber = null; if (game.mode === 'training') { game.trainCheck('analog', type); if (ps.power[sel]) game.trainCheck('analogPower'); } }
      }
    }
    if (ps.chamber && y < 0.2 && u < 0.35 && now - ps.chamber.t > 0.3) ps.chamber = null; // dipped and came back: a feint
  } else {
    // ===== body mode: slip / duck / pull / roll; with a guard up, the stick's vertical moves the guard instead =====
    if (f.strike && f.strike.analog) f.strike.hold = false;
    ps.armed = mag < REARM ? true : ps.armed;
    const guarding = I.handGuard[0] || I.handGuard[1];
    if (mag < 0.25) { ps.leftAt = null; ps.rollArmed = true; } else if (ps.leftAt == null) ps.leftAt = now;
    if (ps.rollArmed && y > 0.5 && Math.abs(x) > 0.45 && ps.leftAt != null && now - ps.leftAt < 0.16) { acts.push(x < 0 ? 'rollL' : 'rollR'); ps.rollArmed = false; }
    if (!ps.rollArmed) ps.lean = [0, 0, 0];
    else if (guarding) { ps.lean = [-x, 0, 0]; ps.handGuardAim = [x, y]; }
    else ps.lean = [-x, Math.max(0, y), Math.max(0, -y)];
    [I.weave, I.duck, I.pull] = ps.lean;
  }
  I.guardAim = ps.handGuardAim;
  if (!(I.handGuard[0] || I.handGuard[1]) && sel < 0) ps.handGuardAim = [ps.handGuardAim[0] * 0.9, ps.handGuardAim[1] * 0.9];
  // --- feet: A rear foot back, B right foot forward, A+B together = switch stance, X/Y pivots ---
  if (down.has(BTN.A)) ps.abAt[0] = now; if (down.has(BTN.B)) ps.abAt[1] = now;
  const switchStep = (down.has(BTN.A) || down.has(BTN.B)) && Math.abs(ps.abAt[0] - ps.abAt[1]) < SWITCH_WINDOW;
  if (switchStep) { f.switchStance(); ps.abAt = [-9, -9]; }
  else { f.scoot = [b[BTN.A] ? 1 : 0, b[BTN.B] ? 1 : 0]; }
  f.pivot = b[BTN.X] ? 'left' : b[BTN.Y] ? 'right' : null;
  I.move.set(-st.ax[0], -st.ax[1]);
  ps.mag = mag;
  return acts;
}
