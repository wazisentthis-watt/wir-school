// PHATOM PMK × NGB — Body control. Your body is the controller.
// Camera → MediaPipe Pose (on-device) → filtered 3D skeleton → per-body-part ownership → the fighter.
//
// The chain (nothing skips a step):
//   pose suggests an intention → this module authorizes a punch (commit rules) → the game moves a constrained arm (IK)
//   → the rendered glove follows that arm → swept-sphere collision decides contact → combat rules decide the outcome.
// No camera event ever writes damage, a landed punch, or a hit.
//
// Ownership (one owner per body part at a time):
//   torso (slip / duck / pull / twist) ........ camera while tracked
//   each hand (guard, placement, punches) ..... camera while that arm is tracked; controller/rest guard otherwise
//   feet / walking ............................ controller if one is connected, else camera steps (+ keyboard)
//   cooking, pause, camera, HUD ............... controller / keyboard
//   clinch ..................................... shared game state: either source can ask, the game decides
import * as THREE from 'three';
import './pmk-camera.js';
import { BodySync } from './bodysync.js';
import { GUARDS } from './guards.js';

const POSE_VER = '0.5.1675469404';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${POSE_VER}/`;
const LOCAL = './vendor/mediapipe-pose/';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

// ---------- One-Euro filter: steady when still, near-zero lag when fast ----------
class OneEuro {
  constructor(minCut = 1.6, beta = 1.2, dCut = 1.2) { this.minCut = minCut; this.beta = beta; this.dCut = dCut; this.x = null; this.dx = 0; this.t = null; }
  static a(cut, dt) { const r = 2 * Math.PI * cut * dt; return r / (r + 1); }
  f(x, t) {
    if (this.x === null) { this.x = x; this.t = t; this.dx = 0; return x; }
    const dt = Math.max(1e-3, Math.min(0.2, t - this.t)); this.t = t;
    const dx = (x - this.x) / dt; this.dx += OneEuro.a(this.dCut, dt) * (dx - this.dx);
    const cut = this.minCut + this.beta * Math.abs(this.dx);
    this.x += OneEuro.a(cut, dt) * (x - this.x); return this.x;
  }
  reset() { this.x = null; this.t = null; this.dx = 0; }
}

// MediaPipe landmark ids
const NOSE = 0, LSH = 11, RSH = 12, LEL = 13, REL = 14, LWR = 15, RWR = 16, LHP = 23, RHP = 24;
const SWAP = { 11: 12, 12: 11, 13: 14, 14: 13, 15: 16, 16: 15, 23: 24, 24: 23, 7: 8, 8: 7, 25: 26, 26: 25, 27: 28, 28: 27, 29: 30, 30: 29, 31: 32, 32: 31 };
const LKN = 25, RKN = 26, LAN = 27, RAN = 28;
const ARM = [[LSH, LEL, LWR], [RSH, REL, RWR]];


// ===================== the tracker: pure math, no DOM — {lm, world, t} in, body state out =====================
export class BodyTracker {
  constructor(opts = {}) {
    this.swap = !!opts.swap; this.cal = opts.cal || null; this.calStep = this.cal ? 'done' : 'frame';
    this.fil = []; for (let i = 0; i < 33 * 3; i++) { const arm = Math.floor(i / 3) >= 13 && Math.floor(i / 3) <= 22; this.fil.push(arm ? new OneEuro(2.2, 3.0, 1.6) : new OneEuro(1.6, 1.4, 1.2)); }
    this.profile = opts.profile || null; this.rawHist = [];
    this.imgFil = []; for (let i = 0; i < 33 * 2; i++) this.imgFil.push(new OneEuro(1.2, 0.8, 1));
    this.P = []; for (let i = 0; i < 33; i++) this.P.push(new THREE.Vector3());
    this.prevP = null; this.prevT = null; this.vis = new Float32Array(33); this.img = [];
    this.hands = [0, 1].map(hi => ({ hi, conf: 0, lostT: 0, tracked: false, rel: new THREE.Vector3(), elbowRel: new THREE.Vector3(), vel: new THREE.Vector3(), r: 0, vr: 0, ext: 0,
      guard: false, armed: true, launch: null, state: 'free', phase: 'none', prog: 0, extended: false, extT: 0, live: false, commitT: -9, speed: 0, pending: null, holdT: 0, hold: false }));
    this.torso = { weave: 0, duck: 0, pull: 0, twist: 0, hipTwist: 0, vx: 0 };
    this.step = { x: 0, y: 0 }; this.tracked = false; this.lostT = 9; this.t = 0; this.lastFrameT = -9;
    this.events = []; this.calProg = 0; this.calMsg = 'Step into the picture — head, both hands and hips'; this.calT = null; this.calSamples = []; this.jabPeak = [0, 0]; this.jabReach = [0, 0];
    this.handsUpT = 0; this.clinchT = 0; this.prevDuck = 0; this.rollCD = 0; this.identityT = 0;
    this.feet = { seen: 0, acc: [], calT: 0, lead: null, leadCand: null, leadT: 0, base: {}, baseT: 0, scoot: [0, 0], pivot: null, pivotT: 0, prevImg: null, hy: 0, hyRate: 0 };
    this.tune = Object.assign({ reach: 1, trigger: 1 }, opts.tune || {});
    this.setFrame(1, 0); this.raw = null; this.jabRaw = [null, null]; this.heading = 0;
  }
  L(i) { return this.swap && SWAP[i] != null ? SWAP[i] : i; }
  // body frame: +x = your own left, +y up, +z = the way you punch (toward the opponent). Works from ANY camera angle:
  // facing the camera, side-on to a bag, anything in between — the jabs at calibration tell us which way "forward" is.
  // The frame is a full 3D rotation (+ mirror): up comes from your torso (a phone tilted up at you is not "gravity"),
  // forward from your punches, left = up × forward.
  toLocal(w, out) { const m = this.frame.m, x = w.x * this.frame.sx, y = -w.y, z = -w.z; return out.set(m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z); }
  setFrame(sx, a, U) { // U, F given in the (mirrored) pre frame; a = yaw of forward if U is vertical
    U = (U || new THREE.Vector3(0, 1, 0)).clone().normalize(); const F0 = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const F = F0.addScaledVector(U, -F0.dot(U)).normalize(); const Lf = new THREE.Vector3().crossVectors(U, F).normalize();
    this.frame = { sx, a, up: U.toArray().map(v => +v.toFixed(3)), m: [Lf.x, Lf.y, Lf.z, U.x, U.y, U.z, F.x, F.y, F.z] }; }

  // ---------- one camera frame ----------
  feed({ lm, world, t }) {
    t = t / 1000; this.events.length = 0;
    if (this.lastFrameT > 0 && t <= this.lastFrameT) return this; // out-of-order or duplicate frame: drop
    const dtF = this.lastFrameT > 0 ? Math.min(0.25, t - this.lastFrameT) : 1 / 30; this.lastFrameT = t; this.t = t;
    if (!lm || !world || world.length < 33) { this.noPose(dtF); return this; }
    for (let i = 0; i < 33; i++) this.vis[i] = lm[this.L(i)].visibility ?? 1;
    this.raw = { world, lm }; this.rawHist.push({ t, world, lm }); if (this.rawHist.length > 40) this.rawHist.shift();
    const core = [LSH, RSH, LHP, RHP].every(i => this.vis[i] > 0.5);
    if (!core) { this.noPose(dtF); return this; }
    this.tracked = true; this.lostT = 0;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < 33; i++) {
      const w = world[this.L(i)]; this.toLocal(w, tmp);
      this.P[i].set(this.fil[i * 3].f(tmp.x, t), this.fil[i * 3 + 1].f(tmp.y, t), this.fil[i * 3 + 2].f(tmp.z, t));
      const m = lm[this.L(i)]; this.img[i] = { x: this.imgFil[i * 2].f(m.x, t), y: this.imgFil[i * 2 + 1].f(m.y, t) };
    }
    if (this.calStep === 'done' && !this.noHeading) this.followHeading(dtF);
    if (this.calStep !== 'done') this.calibrate(t, dtF);
    else { this.updateTorso(t, dtF); this.updateHands(t, dtF); this.updateFeet(t, dtF); this.updateStyle(dtF); this.checkIdentity(dtF); }
    this.prevP = this.P.map(p => p.clone()); this.prevT = t;
    return this;
  }
  // Your punches go where your hips face — not where the camera is. The frame slowly follows your hip line (≈0.9 s),
  // so stepping or circling around a bag keeps "forward" right, while a fast hip snap inside a punch still shows as twist.
  followHeading(dt) {
    const P = this.P, c = this.cal; const hy = Math.atan2(P[LHP].z - P[RHP].z, P[LHP].x - P[RHP].x);
    let d = hy - this.hipYaw0() - this.heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    this.heading += d * (1 - Math.exp(-dt / (Math.abs(d) > 1.1 ? 0.25 : 0.9)));
    const ca = Math.cos(this.heading), sa = Math.sin(this.heading);
    for (const q of P) { const x = q.x, z = q.z; q.x = x * ca + z * sa; q.z = -x * sa + z * ca; }
  }
  // your hips sit at a different angle in each stance (mirror images), so "square" depends on which foot leads
  hipYaw0() { const c = this.cal, st = this.feet.lead || c.stance0 || 'orthodox'; return st === (c.stance0 || 'orthodox') ? c.hipYaw0 : (c.hipYaw0S != null ? c.hipYaw0S : -c.hipYaw0); }
  yaw0() { const c = this.cal, st = this.feet.lead || c.stance0 || 'orthodox'; return st === (c.stance0 || 'orthodox') ? c.yaw0 : (c.yaw0S != null ? c.yaw0S : -c.yaw0); }
  noPose(dt) {
    if (this.calStep !== 'done') { this.calMsg = 'Step into the picture — head, both hands and hips (2–3 m back)'; this.calProg = 0; if (this.calStep === 'guard') { this.calT = null; this.calSamples = []; } }
    this.lostT += dt; if (this.lostT > 0.3) this.tracked = false;
    for (const H of this.hands) { H.lostT += dt; H.live = false; if (H.lostT > 0.2) { H.tracked = false; H.armed = false; H.launch = null; if (H.phase === 'out') H.phase = 'back'; } }
    if (this.lostT > 0.3) { const k = Math.exp(-dt * 6); for (const key of ['weave', 'duck', 'pull', 'twist', 'hipTwist']) this.torso[key] *= k; this.step.x = this.step.y = 0; }
  }

  // ---------- calibration: frame → guard (hold still) → left jab → right jab ----------
  calibrate(t, dt) {
    const P = this.P, vis = this.vis;
    const armsSeen = [LSH, RSH, LEL, REL, LWR, RWR, NOSE].every(i => vis[i] > 0.33);
    if (this.calStep === 'frame') { this.calMsg = 'Step back until your head, both hands and your hips are in the picture'; this.calProg = armsSeen ? 1 : 0; if (armsSeen) { this.calStep = 'guard'; this.calT = null; this.calSamples = []; } return; }
    if (this.calStep === 'guard') {
      this.calMsg = 'Hands up in your boxing guard — hold still';
      const sp = this.prevP ? Math.max(P[LWR].distanceTo(this.prevP[LWR]), P[RWR].distanceTo(this.prevP[RWR])) / Math.max(dt, 1e-3) : 9;
      const up = P[LWR].y > P[LSH].y - 0.22 && P[RWR].y > P[RSH].y - 0.22;
      if (!armsSeen || sp > 0.45 || !up) { if (!up && armsSeen) this.calMsg = 'Bring both gloves up by your chin — hold still'; this.calT = null; this.calSamples = []; this.calProg = 0; return; }
      if (this.calT == null) this.calT = t;
      this.calSamples.push({ P: P.map(p => p.clone()), img: this.img.map(m => ({ ...m })), raw: this.raw.world }); this.calProg = clamp((t - this.calT) / 1.0, 0, 1);
      if (this.calProg >= 1) { this.guessFrame(); this.finishGuard(); this.calStep = 'jabL'; this.calT = t; this.calProg = 0; }
      return;
    }
    if (this.syncHold && this.calStep === 'jabL') return; // Body Sync takes over after the guard
    if (this.calStep === 'jabL' || this.calStep === 'jabR') {
      const want = this.calStep === 'jabL' ? 0 : 1; this.calMsg = want === 0 ? 'Jab with your LEFT hand — full speed' : 'Now throw your RIGHT hand — full speed';
      this.updateHands(t, dt, true);
      for (const H of this.hands) {
        if (H.rExt > 0.55 && H.vrad > 0.9 && !H.calHit) {
          if (want === 0 && H.hi === 1 && !this.swapChecked) { // the camera's left/right labels are the wrong way round here: swap once
            const v = H.vrad; this.swapChecked = true; this.swap = !this.swap; this.jabRaw = [this.raw.world, null]; this.jabDir = null; this.jabPeak = [v, 0]; this.hands[0].calHit = true; this.hands[0].peakR = H.rExt;
            this.solveFrame(); this.events.push({ type: 'swapped' }); return; }
          if (H.hi === want) { H.calHit = true; this.swapChecked = true; }
        }
        if (H.hi === want) { this.jabPeak[want] = Math.max(this.jabPeak[want], H.vrad); if (H.rExt > (H.peakR || 0)) { H.peakR = H.rExt; this.jabRaw[want] = this.raw.world; }
          if (H.rExt > 0.45) { const [S, , W] = ARM[want]; const d = this.pre(this.raw.world, W).sub(this.pre(this.raw.world, S)).sub(this.avgPre(W).sub(this.avgPre(S))); d.y = 0; this.jabDir = (this.jabDir || new THREE.Vector3()).addScaledVector(d, d.length()); } }
      }
      const H = this.hands[want]; this.calProg = H.calHit ? 1 : clamp(this.jabPeak[want] / 2.5, 0, 0.9);
      if (H.calHit && H.rExt < 0.35) { this.solveFrame(); this.calStep = want === 0 ? 'jabR' : 'done'; this.calT = t; if (this.calStep === 'done') this.finishCal(); }
      return;
    }
  }
  // the camera's left/right labels were the wrong way round: swap them and re-express the calibration in the corrected frame
  mirrorCal() { this.swap = !this.swap; this.jabRaw.reverse(); this.jabPeak.reverse(); if (this.calSamples.length) { this.solveFrame(); if (this.cal) this.finishGuard(true); } } // relabelled: per-hand guard + stance re-read // jabDir is a direction, unchanged by relabelling
  // ---------- which way is forward? (pure geometry on the raw camera skeleton) ----------
  pre(w, i) { const q = w[this.L(i)]; return new THREE.Vector3(q.x, -q.y, -q.z); }
  avgPre(i) { const S = this.calSamples; const v = new THREE.Vector3(); for (const s of S) v.add(this.pre(s.raw, i)); return v.multiplyScalar(1 / Math.max(1, S.length)); }
  torsoUp(sx) { const sc = this.avgPre(LSH).add(this.avgPre(RSH)).multiplyScalar(0.5), hc = this.avgPre(LHP).add(this.avgPre(RHP)).multiplyScalar(0.5); const U = sc.sub(hc); U.x *= sx; return U.lengthSq() > 1e-4 ? U.normalize() : new THREE.Vector3(0, 1, 0); }
  guessFrame() { // before any jab: assume you face the camera; pick the mirror so your left shoulder is on your left
    const sx = this.mirrorSign(); this.setFrame(sx, 0, this.torsoUp(sx)); }
  // Which way is your left? Your gloves always sit in front of your chest, whatever the camera angle (square, bladed, side-on),
  // so front = gloves − shoulders, and left = up × front. If the labelled left shoulder is on the other side, the picture is mirrored.
  mirrorSign() {
    const sc = this.avgPre(LSH).add(this.avgPre(RSH)).multiplyScalar(0.5), front = this.avgPre(LWR).add(this.avgPre(RWR)).multiplyScalar(0.5).sub(sc); const U = this.torsoUp(1);
    front.addScaledVector(U, -front.dot(U)); const left = new THREE.Vector3().crossVectors(U, front); const sh = this.avgPre(LSH).sub(this.avgPre(RSH));
    return sh.dot(left) >= 0 ? 1 : -1;
  }
  solveFrame() {
    let F = new THREE.Vector3(), n = 0;
    if (this.jabDir && this.jabDir.length() > 0.2) { F.copy(this.jabDir).setY(0); n = 1; }
    else for (let h = 0; h < 2; h++) { const J = this.jabRaw[h]; if (!J) continue; const [S, , W] = ARM[h];
      const d = this.pre(J, W).sub(this.pre(J, S)).sub(this.avgPre(W).sub(this.avgPre(S))); d.y = 0; if (d.length() < 0.08) continue; F.add(d.normalize()); n++; }
    if (!n) { this.guessFrame(); } else {
      F.normalize(); const sx = this.mirrorSign(); const fx = F.x * sx, fz = F.z; this.setFrame(sx, Math.atan2(fx, fz), this.torsoUp(sx));
    }
    this.resetFilters(); this.finishGuard(true); this.feet.base = {}; this.feet.lead = null; this.feet.acc = [];
    for (const H of this.hands) { H.armed = false; H.launch = null; H.vel.set(0, 0, 0); H.noVel = 2; }
  }
  // ---------- calibrate from a recording (LAB / replay): find your guard, your longest reach with each hand, and which way you punch ----------
  autoCalibrate(frames) {
    const R = frames.filter(f => f.lm && f.world && [LSH, RSH, LHP, RHP].every(i => (f.lm[this.L(i)].visibility ?? 1) > 0.5));
    if (R.length < 20) return false;
    const geo = R.map(f => { const P = i => this.pre(f.world, i); const hv = P(LHP).sub(P(RHP)); return { f, t: f.t / 1000, w: [P(LWR).sub(P(LSH)), P(RWR).sub(P(RSH))], hy: Math.atan2(hv.z, hv.x), up: P(LWR).y > P(LSH).y - 0.22 && P(RWR).y > P(RSH).y - 0.22 }; });
    // guard: the quietest half-second with both hands up
    let best = null; const win = 15;
    for (let i = 0; i + win < geo.length; i++) { let m = 0, ok = true; for (let j = i + 1; j <= i + win; j++) { if (!geo[j].up) { ok = false; break; } const dt = Math.max(1e-3, geo[j].t - geo[j - 1].t); m = Math.max(m, geo[j].w[0].distanceTo(geo[j - 1].w[0]) / dt, geo[j].w[1].distanceTo(geo[j - 1].w[1]) / dt); } if (ok && (!best || m < best.m)) best = { i, m }; }
    if (!best) return false;
    this.calSamples = geo.slice(best.i, best.i + win).map(g => ({ raw: g.f.world, img: g.f.lm.map((_, i) => ({ x: g.f.lm[this.L(i)].x, y: g.f.lm[this.L(i)].y })) }));
    // punches: each hand's furthest reach from its guard, and the fastest outward drive anywhere in the clip
    const g0 = [0, 1].map(h => this.calSamples.reduce((a, s) => { const P = i => this.pre(s.raw, i); return a.add(P(ARM[h][2]).sub(P(ARM[h][0]))); }, new THREE.Vector3()).multiplyScalar(1 / win));
    this.jabRaw = [null, null]; this.jabPeak = [0, 0]; this.jabDir = new THREE.Vector3(); const speeds = [];
    const hy0 = geo.slice(best.i, best.i + win).reduce((a, g) => a + g.hy, 0) / win;
    const unturn = (v, g) => { let dd = g.hy - hy0; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; const ca = Math.cos(dd), sa = Math.sin(dd); return new THREE.Vector3(v.x * ca + v.z * sa, v.y, -v.x * sa + v.z * ca); };
    const cands = [];
    for (let h = 0; h < 2; h++) { let bd = 0; const dvs = geo.map(g => unturn(g.w[h], g).sub(g0[h])); const vrs = geo.map((g, i) => i ? geo[i].w[h].clone().sub(geo[i - 1].w[h]).dot(geo[i].w[h].clone().normalize()) / Math.max(1e-3, geo[i].t - geo[i - 1].t) : 0);
      for (let i = 1; i < geo.length; i++) { const dv = dvs[i], d = dv.length(); if (d > bd) { bd = d; this.jabRaw[h] = geo[i].f.world; }
        // a real punch: far from the guard, the furthest point of its own move, and it got there fast
        const peak = d > 0.22 && d >= dvs[i - 1].length() && (i + 1 >= dvs.length || d >= dvs[i + 1].length()); const fast = Math.max(...vrs.slice(Math.max(1, i - 4), i + 1)) > 1.2;
        if (peak && fast) { const v = dv.clone().setY(0); cands.push({ a: Math.atan2(v.x, v.z), w: v.length() }); }
        if (vrs[i] > 1 && vrs[i] < 12) speeds.push(vrs[i]); } }
    if (cands.length) { // circular median, then the mean of the punches within 50° of it
      const ang = cands.map(c => c.a).sort((a, b) => a - b); const med = ang[Math.floor(ang.length / 2)]; const dw = a => { let x = a - med; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };
      for (const c of cands) if (Math.abs(dw(c.a)) < 0.87) this.jabDir.add(new THREE.Vector3(Math.sin(c.a), 0, Math.cos(c.a)).multiplyScalar(c.w)); this.punchCount = cands.length; }
    speeds.sort((a, b) => a - b); const pk = speeds.length ? speeds[Math.floor(speeds.length * 0.9)] : 3.4; this.jabPeak = [pk, pk];
    this.guessFrame(); this.solveFrame(); this.calStep = 'done'; this.finishCal(); this.resetFilters(); this.lastFrameT = -9;
    return { guardAt: best.i, frame: { ...this.frame }, peak: this.cal.peak, vMin: this.cal.vMin, zGain: this.cal.zGain };
  }
  skipJabs() { if (!this.cal) return; this.calStep = 'done'; this.finishCal(); }
  finishGuard(keep) {
    const S = this.calSamples, n = S.length; const tmp = new THREE.Vector3(); const avg = i => S.reduce((a, s) => a.add(this.toLocal(s.raw[this.L(i)], tmp)), new THREE.Vector3()).multiplyScalar(1 / n);
    const avgI = (i, k) => S.reduce((a, s) => a + s.img[i][k], 0) / n;
    const P = {}; for (const i of [NOSE, LSH, RSH, LEL, REL, LWR, RWR, LHP, RHP, LAN, RAN]) P[i] = avg(i);
    // which stance you calibrated in (feet vs chest), so the other stance's hip angle can be mirrored
    const fr = P[LWR].clone().add(P[RWR]).multiplyScalar(0.5).sub(P[LSH].clone().add(P[RSH]).multiplyScalar(0.5)); fr.y = 0; const uu = P[LAN].clone().sub(P[RAN]); uu.y = 0;
    const sig = fr.lengthSq() > 1e-4 ? uu.dot(fr.normalize()) : 0; const feetOK = S.every(q => (q.raw[this.L(LAN)].visibility ?? 1) > 0.5 && (q.raw[this.L(RAN)].visibility ?? 1) > 0.5);
    const stance0 = feetOK && Math.abs(sig) > 0.04 ? (sig > 0 ? 'orthodox' : 'southpaw') : (this.profile && this.profile.stance && this.profile.stance.main) || 'orthodox';
    const arms = ARM.map(([s, e, w]) => ({ upper: P[s].distanceTo(P[e]), fore: P[e].distanceTo(P[w]), rel: P[w].clone().sub(P[s]), elbow: P[e].clone().sub(P[s]) }));
    arms.forEach(a => { a.len = a.upper + a.fore; a.r = a.rel.length(); });
    const sc = P[LSH].clone().add(P[RSH]).multiplyScalar(0.5), hc = P[LHP].clone().add(P[RHP]).multiplyScalar(0.5);
    const shImg = { x: (avgI(LSH, 'x') + avgI(RSH, 'x')) / 2, y: (avgI(LSH, 'y') + avgI(RSH, 'y')) / 2 }, hipImg = { x: (avgI(LHP, 'x') + avgI(RHP, 'x')) / 2, y: (avgI(LHP, 'y') + avgI(RHP, 'y')) / 2 };
    const keepK = keep && this.cal ? { peak: this.cal.peak, zGain: this.cal.zGain, vMin: this.cal.vMin } : {};
    this.cal = Object.assign(this.cal || {}, {
      arms, torsoLen: sc.distanceTo(hc), sw: P[LSH].distanceTo(P[RSH]), lean0: sc.x - hc.x, pull0: sc.z - hc.z,
      yaw0: Math.atan2(P[LSH].z - P[RSH].z, P[LSH].x - P[RSH].x), hipYaw0: Math.atan2(P[LHP].z - P[RHP].z, P[LHP].x - P[RHP].x),
      shImg, hipImg, torsoImg: Math.max(0.05, Math.hypot(shImg.x - hipImg.x, shImg.y - hipImg.y)), swImg: Math.max(0.03, Math.abs(avgI(LSH, 'x') - avgI(RSH, 'x'))),
      gHead: [P[LWR].distanceTo(P[NOSE]), P[RWR].distanceTo(P[NOSE])], peak: 3.4, zGain: 1.25, vMin: 1.3, version: 4, frame: { ...this.frame }, stance0, stanceSig0: sig,
    }, keepK);
  }
  finishCal() {
    const c = this.cal; const pk = Math.max(this.jabPeak[0], this.jabPeak[1]);
    if (pk > 1.2) c.peak = clamp(pk, 1.8, 7);
    c.vMin = clamp(c.peak * 0.27, 0.8, 1.6);
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    for (let h = 0; h < 2; h++) { const J = this.jabRaw[h]; if (!J) continue; const [S, , W] = ARM[h]; this.jabReach[h] = this.toLocal(J[this.L(W)], tmp).sub(this.toLocal(J[this.L(S)], tmp2)).z - c.arms[h].rel.z; }
    const reach = Math.max(this.jabReach[0], this.jabReach[1]); const want = (c.arms[0].len + c.arms[1].len) / 2 * 0.8;
    if (reach > 0.12) c.zGain = clamp(want / reach, 1, 2.2);
    this.calMsg = ''; this.events.push({ type: 'calibrated', cal: c });
    for (const H of this.hands) { H.armed = false; H.calHit = false; }
  }
  resetFilters() { this.fil.forEach(f => f.reset()); this.imgFil.forEach(f => f.reset()); this.prevP = null; }

  // ---------- torso: slip, duck, pull back, shoulder/hip twist, steps ----------
  updateTorso(t, dt) {
    const P = this.P, c = this.cal, T = this.torso;
    const sc = P[LSH].clone().add(P[RSH]).multiplyScalar(0.5), hc = P[LHP].clone().add(P[RHP]).multiplyScalar(0.5);
    const pr = this.profile && this.profile.torso || {};
    const lean = (sc.x - hc.x - c.lean0) / (0.42 * c.sw); const dz = v => Math.sign(v) * Math.max(0, Math.abs(v) - 0.12) / 0.88;
    const lr = lean > 0 ? (pr.slipL || 1) : (pr.slipR || 1); T.leanRaw = lean; // your own full slip = 1
    T.weave = clamp(dz(lean / Math.max(0.4, lr * 0.85)), -1, 1);
    const shY = (this.img[LSH].y + this.img[RSH].y) / 2; const drop = (shY - c.shImg.y) / c.torsoImg; T.duckRaw = drop;
    T.duck = clamp((drop - 0.07) / Math.max(0.15, (pr.duck || 0.4) * 0.8 - 0.07), 0, 1);
    const back = c.pull0 - (sc.z - hc.z); T.pullRaw = back;
    T.pull = clamp((back - 0.035) / Math.max(0.06, (pr.pull || 0.145) * 0.8 - 0.035), 0, 1);
    const yaw = Math.atan2(P[LSH].z - P[RSH].z, P[LSH].x - P[RSH].x), hy = Math.atan2(P[LHP].z - P[RHP].z, P[LHP].x - P[RHP].x);
    const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    T.twist = clamp(-wrap(yaw - this.yaw0()), -0.9, 0.9); T.hipTwist = clamp(-wrap(hy - this.hipYaw0()) * 0.9, -0.6, 0.6); T.yawRaw = yaw; T.hipRaw = hy;
    if (this.prevP) { const psc = this.prevP[LSH].clone().add(this.prevP[RSH]).multiplyScalar(0.5); T.vx = (sc.x - psc.x) / Math.max(dt, 1e-3); }
    // a roll: drop down while moving under, side to side
    this.rollCD = Math.max(0, this.rollCD - dt);
    if (T.duck > 0.55 && this.prevDuck <= 0.55 && Math.abs(T.vx) > 0.55 && !this.rollCD) { this.events.push({ type: 'roll', dir: Math.sign(T.vx) }); this.rollCD = 0.7; }
    this.prevDuck = T.duck;
    // steps: hips sideways in the picture, or the body growing/shrinking (stepping toward/away from the camera)
    const hipX = (this.img[LHP].x + this.img[RHP].x) / 2, shIx = (this.img[LSH].x + this.img[RSH].x) / 2, shIy = (this.img[LSH].y + this.img[RSH].y) / 2, hipIy = (this.img[LHP].y + this.img[RHP].y) / 2;
    const torsoImg = Math.max(0.03, Math.hypot(shIx - hipX, shIy - hipIy)); const mPer = (c.torsoLen || 0.5) / c.torsoImg;
    // how big you are in the picture = how close you are. Torso length shrinks when you duck/lean, widths shrink when you turn — use both, and
    // ignore depth while you're ducking or turned hard
    const wImg = Math.abs(this.img[LSH].x - this.img[RSH].x) + Math.abs(this.img[LHP].x - this.img[RHP].x); if (!c.wImg) c.wImg = wImg;
    const ratio = Math.sqrt((torsoImg / c.torsoImg) * (wImg / c.wImg)); const depthOK = T.duck < 0.3 && Math.abs(T.twist) < 0.35;
    const dxPre = (hipX - c.hipImg.x) * mPer, dzPre = depthOK ? (ratio - 1) * 2.5 : (this.mv ? this.mv.zPre : 0); // sideways in the picture; bigger = closer
    const fm = this.frame.m, x = dxPre * this.frame.sx, pxB = fm[0] * x + fm[2] * dzPre, pzB = fm[6] * x + fm[8] * dzPre; // your offset from home, in your body frame (m) — same rotation as every landmark
    // DIRECT footwork: your step speed IS the fighter's step (velocity), and staying off your spot keeps pressing that way (offset)
    if (!isFinite(pxB) || !isFinite(pzB)) { this.step.x = this.step.y = 0; return; }
    if (this.mv && !isFinite(this.mv.x + this.mv.z + this.mv.vx + this.mv.vz)) this.mv = null;
    const M = this.mv || (this.mv = { x: pxB, z: pzB, vx: 0, vz: 0, zPre: 0 }); M.zPre = dzPre; const a = 1 - Math.exp(-dt / 0.07), av = 1 - Math.exp(-dt / 0.09);
    const nx = M.x + (pxB - M.x) * a, nz = M.z + (pzB - M.z) * a; if (dt > 0) { M.vx += ((nx - M.x) / dt - M.vx) * av; M.vz += ((nz - M.z) / dt - M.vz) * av; } M.x = nx; M.z = nz;
    const dead = (v, d) => Math.abs(v) < d ? 0 : (Math.abs(v) - d) * Math.sign(v);
    const hyst = (v, cur, on, off) => Math.abs(v) > on ? clamp((Math.abs(v) - off) / (on * 1.6), 0, 1) * Math.sign(v) : Math.abs(v) < off ? 0 : cur;
    this.offX = hyst(M.x, this.offX || 0, 0.42, 0.28); this.offZ = hyst(M.z, this.offZ || 0, 0.45, 0.3); // a big step held = keep pressing that way
    this.step.x = clamp(dead(M.vx, 0.12) / 0.55 + this.offX * 0.6, -1, 1); this.step.y = clamp(dead(M.vz, 0.12) / 0.55 + this.offZ * 0.6, -1, 1);
  }

  // ---------- hands: guard / placement / commit / extend / recover, each with its own tracking ----------
  updateHands(t, dt, calMode = false) {
    const P = this.P, c = this.cal;
    const head = P[NOSE];
    for (const H of this.hands) {
      const [s, e, w] = ARM[H.hi]; const A = c.arms[H.hi];
      const conf = Math.min(this.vis[s], this.vis[e], this.vis[w]); H.conf = conf;
      if (conf < 0.18) { H.lostT += dt; H.live = false; if (H.lostT > 0.2) { if (H.tracked) this.events.push({ type: 'handLost', hi: H.hi }); H.tracked = false; H.armed = false; H.launch = null; if (H.phase === 'out') H.phase = 'back'; } continue; }
      if (!H.tracked) { H.tracked = true; H.armed = false; this.events.push({ type: 'handFound', hi: H.hi }); } // re-acquired: no attack until the hand comes home
      H.lostT = 0;
      const rel = P[w].clone().sub(P[s]); const elb = P[e].clone().sub(P[s]);
      const prev = H.rel.clone(); H.rel.copy(rel); H.elbowRel.copy(elb);
      if (H.noVel > 0) { H.noVel--; H.vel.set(0, 0, 0); } else if (this.prevT != null && dt > 0) { const v = rel.clone().sub(prev).multiplyScalar(1 / dt); H.vel.lerp(v, 0.7); }
      H.r = rel.length(); H.speed = H.vel.length();
      // drive = how hard the fist travels toward the target (uppercuts and hooks are not radial, so not |r|'),
      // reach = how far out in front of you it is (a dropped hand by your hip is still "home")
      const vradNow = H.r > 0.05 ? H.vel.dot(rel.clone().normalize()) : 0;
      // drive: speed away from your shoulder (turning can't fake it), or — for uppercuts/hooks that don't lengthen the arm much — most of your fist speed when it's heading forward
      H.vr = Math.max(vradNow, H.vel.z > 0.22 * H.speed ? H.speed * 0.8 : H.vel.z);
      const reach = A.len * 0.92; const zExt = (rel.z - A.rel.z) / Math.max(0.1, reach - A.rel.z); const rExt = (H.r - A.r) / Math.max(0.1, A.len * 0.95 - A.r);
      // reach: how far the fist is from YOUR shoulder (rotation-proof); forward depth may add a little, never invent extension on its own
      H.ext = clamp(Math.max(rExt, Math.min(zExt, rExt + 0.2)), 0, 1.2); H.rExt = rExt; H.vrad = vradNow;
      H.guardKind = this.guardKind(H, rel, P[w].distanceTo(head), A); H.guard = !!H.guardKind;
      if (calMode) continue;
      // short history (≈0.25 s): at 30 fps a snapped jab can peak in ONE frame, so we look back for where the punch started
      (H.hist = H.hist || []).push({ t, ext: H.ext, vr: H.vr, rel: rel.clone() }); while (H.hist.length && t - H.hist[0].t > 0.26) H.hist.shift();
      // arm: the hand has to come home (near your body, any posture) or pull well back from its last punch
      const nearBody = H.r < 0.7 * A.len && H.vr < 0.4; const pulledBack = H.phase === 'back' && H.ext < (H.peakExt || 1) - 0.3 && H.vr > -0.3;
      if (!H.armed && H.phase !== 'out' && (H.ext < 0.3 || nearBody || pulledBack)) { H.armed = true; H.launch = null; if (H.phase === 'back') H.phase = 'none'; }
      // a punch = fast outward drive (peak in the last 0.2 s) that actually got the fist out there (reach gained since the start)
      let lo = H.hist[0], vPk = 0; for (const q of H.hist) { if (q.ext < lo.ext) lo = q; if (t - q.t < 0.2) vPk = Math.max(vPk, q.vr); }
      const vMin = (this.profile && this.profile.vMin || c.vMin) * this.tune.trigger;
      // the path starts where the fist began driving (walk back while it was moving out), not just the closest point
      let b0 = H.hist.length - 1; while (b0 > 0 && H.hist[b0 - 1].vr > 0.25) b0--; if (b0 > 0) b0--; const st = H.hist[b0];
      const tv = rel.clone().sub(st.rel).multiplyScalar(0.55 / Math.max(0.2, A.len)); // travel, in 0.55 m-arm units
      const toward = tv.z > 0.06 || (tv.y > 0.1 && tv.z > 0); // a punch goes at the target (or up into it) — a hand dropping to your side is not a punch
      const quick = vPk > vMin * 1.25 && H.ext > 0.26 && H.ext - lo.ext > 0.09; // a fast one is obvious sooner — fire it now
      if (H.armed && (quick || (H.ext > 0.32 && H.ext - lo.ext > 0.12)) && H.vr > -0.2 && vPk > vMin && toward) {
        H.launch = { p: st.rel.clone(), t: st.t, ext: st.ext };
        const type = this.classify(H, rel); const kin = clamp(vPk / c.peak, 0, 1.4);
        const heavy = kin > 0.92 && Math.abs(this.torso.twist) > 0.22;
        H.pending = { type, heavy, kin, t }; H.cls = { p: st.rel.clone(), type }; H.peakExt = H.ext; H.armed = false; H.launch = null; H.burst = null; H.phase = 'out'; H.commitT = t; H.extended = false; H.extT = 0;
        this.events.push({ type: 'commit', hi: H.hi, strike: type, heavy, kin });
      } else if (H.armed) { // feint: a real burst outward that stopped short and came back — nothing is thrown
        if (!H.burst && H.vr > 0.8) H.burst = { t, ext0: lo.ext, peak: H.ext };
        if (H.burst) { H.burst.peak = Math.max(H.burst.peak, H.ext); if (H.ext < H.burst.ext0 + 0.06 && H.vr < 0.2) { if (H.burst.peak - H.burst.ext0 > 0.08) this.events.push({ type: 'feint', hi: H.hi }); H.burst = null; } else if (t - H.burst.t > 0.6) H.burst = null; }
      }
      // the first ~150 ms of the path can still change what the punch is (an uppercut starts like a low straight)
      if (H.phase === 'out' && H.cls && t - H.commitT < 0.15 && t > H.commitT && H.vr > 0.2 && H.ext >= (H.peakExt || 0) - 0.02) { /* only while still driving OUT: a fast jab's return trip must not rename it */ H.launch = { p: H.cls.p }; const ty = this.classify(H, rel, t - H.commitT > 0.08 ? 'full' : 'early'); H.launch = null; if (ty !== H.cls.type) { H.cls.type = ty; this.events.push({ type: 'reclass', hi: H.hi, strike: ty }); } }
      if (H.phase === 'out') {
        H.prog = clamp(H.ext / 0.85, 0, 1); H.peakExt = Math.max(H.peakExt || 0, H.ext);
        if (H.ext > 0.68 && H.speed < 0.7) { H.extT += dt; if (H.extT > 0.12) H.extended = true; } else if (H.speed > 1.2) { H.extended = false; H.extT = 0; }
        H.live = !H.extended && (H.vr > 0.45 || t - H.commitT < 0.1) && H.ext > 0.22;
        if (H.vel.z < -0.7 || H.ext < 0.25 && t - H.commitT > 0.12 || t - H.commitT > 2.5) { H.phase = 'back'; H.live = false; H.extended = false; }
      } else { H.live = false; H.extended = false; H.prog = 0; if (H.phase === 'back' && H.ext < 0.3) H.phase = 'none'; }
      // a slow reach out at head height = a hand that can grab (clinch)
      H.hold = H.phase !== 'out' && H.ext > 0.42 && rel.y > -0.3 && H.speed < 1.4;
    }
    if (calMode) return;
    // clinch request: both hands reach forward, close together, slowly
    const [L, R] = this.hands; const close = L.tracked && R.tracked && P[LWR].distanceTo(P[RWR]) < 1.35 * c.sw;
    if (L.hold && R.hold && close) this.clinchT += dt; else this.clinchT = Math.max(0, this.clinchT - dt * 2);
    // both gloves high above the head for a second = pause
    if (P[LWR].y > head.y + 0.12 && P[RWR].y > head.y + 0.12) { this.handsUpT += dt; if (this.handsUpT > 1.1) { this.events.push({ type: 'pause' }); this.handsUpT = -2; } } else this.handsUpT = Math.min(0, this.handsUpT + dt);
  }
  // ---------- feet: stance (which foot leads), scoots (A rear foot back / B right foot forward), pivots (X / Y), switch stance ----------
  // Only when knees + ankles are clearly in the picture; otherwise the controller keeps the feet.
  updateFeet(t, dt) {
    const P = this.P, v = this.vis, F = this.feet, c = this.cal;
    const seen = [LKN, RKN, LAN, RAN].every(i => v[i] > 0.6);
    F.seen = clamp(F.seen + (seen ? 4 : -4) * dt, 0, 1);
    const hy = Math.atan2(P[LHP].z - P[RHP].z, P[LHP].x - P[RHP].x); let dh = hy - F.hy; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    F.hyRate += ((dt > 0 ? dh / dt : 0) - F.hyRate) * 0.5; F.hy = hy;
    if (!seen) { // no feet in view: a fast hip turn away from square is still a pivot (clockwise = on the left foot)
      F.scoot = [0, 0]; F.prevImg = null; let off = hy - this.hipYaw0(); while (off > Math.PI) off -= 2 * Math.PI; while (off < -Math.PI) off += 2 * Math.PI;
      const quiet = this.hands.every(H => H.phase !== 'out'); const pv = quiet && Math.abs(F.hyRate) > 1.6 && Math.sign(F.hyRate) === Math.sign(off) && Math.abs(off) > 0.3 ? (F.hyRate > 0 ? 'left' : 'right') : null;
      if (pv) { F.pivot = pv; F.pivotT = 0.12; } else { F.pivotT -= dt; if (F.pivotT <= 0) F.pivot = null; }
      // stance from the HIPS when the feet aren't in the picture: a bladed stance turns the hips one way; switch stance and they turn the
      // other way (mirror). Only when your stance is clearly bladed (≥ ~12°) and the flip is held a beat with no punch out.
      const y0 = this.hipYaw0(); const cur = F.hipLead || F.lead || c.stance0 || 'orthodox';
      if (Math.abs(c.hipYaw0 || 0) > 0.2 && quiet && Math.sign(hy) === -Math.sign(y0) && Math.abs(hy) > 0.6 * Math.abs(y0)) { F.hipFlipT = (F.hipFlipT || 0) + dt; if (F.hipFlipT > 0.25) { F.hipLead = cur === 'orthodox' ? 'southpaw' : 'orthodox'; F.lead = F.hipLead; F.hipFlipT = 0; } }
      else F.hipFlipT = 0;
      return; }
    const L = P[LAN], R = P[RAN];
    const still = this.prevP && L.distanceTo(this.prevP[LAN]) / dt < 0.3 && R.distanceTo(this.prevP[RAN]) / dt < 0.3;
    // stance = which foot is in front of the other, measured along the way your chest faces (hands not mid-punch)
    const ps = this.profile && this.profile.stance; const thr = ps && ps.thr || 0.06; let cand = F.leadCand;
    if (this.hands.every(H => H.phase !== 'out')) { const sg = this.stanceSignal(); F.sig = sg; cand = sg > thr ? 'orthodox' : sg < -thr ? 'southpaw' : null; }
    if (cand && cand === F.leadCand) F.leadT += dt; else { F.leadCand = cand; F.leadT = 0; }
    if (cand && F.leadT > 0.4 && F.lead !== cand) { const was = F.lead; F.lead = cand; F.baseT = 0; if (was) this.events.push({ type: 'stance', stance: cand }); else this.events.push({ type: 'feetLocked', stance: cand }); }
    if (!F.lead) return;
    // the feet's home position for this stance (re-taken after every stance change, once you settle)
    if (!F.base[F.lead]) { if (still) { F.baseT += dt; F.acc.push([L.z, R.z]); if (F.baseT > 0.6) { const n = F.acc.length; F.base[F.lead] = { L: F.acc.reduce((a, q) => a + q[0], 0) / n, R: F.acc.reduce((a, q) => a + q[1], 0) / n }; F.acc = []; } } else { F.baseT = 0; F.acc = []; } F.scoot = [0, 0]; }
    else {
      const b = F.base[F.lead], dL = L.z - b.L, dR = R.z - b.R, diff = dR - dL; let A = 0, B = 0;
      if (F.lead === 'orthodox') { if (diff < -0.1) A = 1; else if (diff > 0.1) B = 1; }
      else if (diff > 0.1) { if (Math.abs(dL) > Math.abs(dR)) A = 1; else B = 1; }
      F.scoot = [A, B];
    }
    // pivots: hips turning AWAY from square while one foot stays planted (picture-space, so a planted foot is really still)
    const img = this.img, sw = (c.torsoImg || 0.3) * 0.6; let vL = 0, vR = 0;
    if (F.prevImg) { vL = Math.hypot(img[LAN].x - F.prevImg[0].x, img[LAN].y - F.prevImg[0].y) / dt / sw; vR = Math.hypot(img[RAN].x - F.prevImg[1].x, img[RAN].y - F.prevImg[1].y) / dt / sw; }
    F.prevImg = [{ ...img[LAN] }, { ...img[RAN] }];
    let off = hy - this.hipYaw0(); while (off > Math.PI) off -= 2 * Math.PI; while (off < -Math.PI) off += 2 * Math.PI;
    const turning = Math.abs(F.hyRate) > 0.9 && Math.sign(F.hyRate) === Math.sign(off) && Math.abs(off) > 0.12;
    const cw = F.hyRate > 0; // +hip-yaw rate in this frame = clockwise seen from above
    let pv = null;
    if (turning && cw && vL < 0.6 && vR > vL + 0.3) pv = 'left';
    else if (turning && !cw && vR < 0.6 && vL > vR + 0.3) pv = 'right';
    if (pv) { F.pivot = pv; F.pivotT = 0.12; } else { F.pivotT -= dt; if (F.pivotT <= 0) F.pivot = null; }
  }
  // ---------- guard: FACE (gloves by the head) or BODY (elbows down over the ribs), per hand, with hysteresis ----------
  guardKind(H, rel, dHead, A) {
    if (H.phase === 'out' || H.speed > 1.4) return null;
    const pg = this.profile && this.profile.guard, was = H.guardKind, k = was ? 1.3 : 1;
    if (pg && pg.face && pg.face[H.hi] && pg.body && pg.body[H.hi]) { // learned in Body Sync
      const gF = new THREE.Vector3().fromArray(pg.face[H.hi]), gB = new THREE.Vector3().fromArray(pg.body[H.hi]); const sep = Math.max(0.1, gF.distanceTo(gB));
      const dF = rel.distanceTo(gF), dB = rel.distanceTo(gB), rad = Math.max(0.09, 0.45 * sep) * k;
      if (dF < rad && dF <= dB) return 'face'; if (dB < rad && dB < dF) return 'body'; return null;
    }
    const gr = Math.max(this.cal.sw, 0.3);
    if (dHead < 0.62 * gr * k && H.ext < 0.3 * k) return 'face';
    const torsoDrop = -rel.y / Math.max(0.3, this.cal.torsoLen || 0.5); // how far below the shoulder, in torso lengths
    if (torsoDrop > 0.22 && torsoDrop < 0.85 && H.r < 0.62 * A.len * k && H.ext < 0.3 * k) return 'body';
    return null;
  }
  // ---------- guard STYLE from where both hands are: Peek-a-Boo, Philly Shell, Long Guard, Cross-Arm (or plain high guard) ----------
  styleNow() {
    const Hs = this.hands, c = this.cal, P = this.P; if (!Hs[0].tracked || !Hs[1].tracked) return null;
    if (Hs.some(h => h.phase === 'out' || h.speed > 1.3)) return null;
    const lead = (this.feet.lead || c.stance0 || 'orthodox') === 'southpaw' ? 1 : 0, rear = 1 - lead;
    const pg = this.profile && this.profile.guard && this.profile.guard.styles;
    if (pg) { // learned in Body Sync: nearest of YOUR shells
      let best = null, bd = 9, sd = 9;
      for (const k in pg) { const q = pg[k]; if (!q) continue; const d = Hs[0].rel.distanceTo(new THREE.Vector3().fromArray(q[0])) + Hs[1].rel.distanceTo(new THREE.Vector3().fromArray(q[1])); if (d < bd) { sd = bd; bd = d; best = k; } else if (d < sd) sd = d; }
      if (best && bd < 0.2 * (this.style === best ? 1.35 : 1) && bd < 0.8 * sd) return best;
    }
    const sw = Math.max(c.sw, 0.3), tl = Math.max(0.3, c.torsoLen || 0.5); const mid = P[LSH].clone().add(P[RSH]).multiplyScalar(0.5);
    const W = [P[LWR].clone().sub(mid), P[RWR].clone().sub(mid)], E = [P[LEL].clone().sub(mid), P[REL].clone().sub(mid)];
    // crossed: each wrist over the centre line onto the other side, forearms out in front between face and belly
    if (W[0].x < -0.04 && W[1].x > 0.04 && W[0].z > 0.06 && W[1].z > 0.06 && W[0].y > -0.8 * tl && W[1].y > -0.8 * tl) return 'cross';
    const face = Hs.map(h => h.guardKind === 'face');
    // philly: lead arm dropped across the belly, rear glove up by the chin
    if (W[lead].y < -0.32 * tl && W[lead].z < 0.3 && (face[rear] || W[rear].y > -0.2 * tl) && Hs[rear].ext < 0.3) return 'philly';
    // long guard: lead arm out in front at face height and STILL (not a punch), rear glove home
    if (Hs[lead].ext > 0.5 && W[lead].z > 0.3 && W[lead].y > -0.3 * tl && Hs[lead].speed < 0.7 && Hs[rear].ext < 0.3 && W[rear].y > -0.45 * tl) return 'long';
    if (face[0] && face[1]) { // peek-a-boo: tighter to the face than your normal guard, elbows tucked in front of the ribs
      const gh = c.gHead || [0.25, 0.25]; const tight = [0, 1].every(i => P[i ? RWR : LWR].distanceTo(P[NOSE]) < 0.78 * gh[i]); const tuck = Math.abs(E[0].x - E[1].x) < 0.95 * sw;
      return tight && tuck ? 'peek' : 'high';
    }
    return null;
  }
  updateStyle(dt) {
    const cand = this.styleNow();
    if (cand === this.styleCand) this.styleT = (this.styleT || 0) + dt; else { this.styleCand = cand; this.styleT = 0; }
    if (cand !== this.style && this.styleT > (cand === 'long' ? 0.3 : 0.18)) { this.style = cand; if (cand && cand !== 'high') this.events.push({ type: 'style', style: cand }); }
  }
  // ---------- stance from your FEET against where your chest faces (gloves in front of chest) — needs no camera angle ----------
  stanceSignal() {
    const P = this.P; const front = P[LWR].clone().add(P[RWR]).multiplyScalar(0.5).sub(P[LSH].clone().add(P[RSH]).multiplyScalar(0.5)); front.y = 0;
    if (front.lengthSq() < 1e-4) return 0; front.normalize(); const u = P[LAN].clone().sub(P[RAN]); u.y = 0; return u.dot(front); // + = left foot in front = orthodox
  }
  // punch features (0.55 m-arm units): which way it travelled, where it started and finished, the elbow shape
  feat(hi, rel, start, elbow) {
    const A = this.cal.arms[hi], k = 0.55 / Math.max(0.2, A.len); const d = rel.clone().sub(start).multiplyScalar(k), r = rel.clone().multiplyScalar(k), st = start.clone().multiplyScalar(k), el = elbow.clone().multiplyScalar(k);
    const sgn = hi === 0 ? -1 : 1; const n = Math.max(0.05, d.length());
    return [sgn * d.x / n * 1.6, d.y / n * 1.6, d.z / n * 1.6, st.y, r.y, -sgn * el.x, el.y - r.y, Math.min(1, n * 2)];
  }
  knn(hi, f, stage) {
    const T = this.profile && this.profile.templates && this.profile.templates[hi]; if (!T) return null; const pool = T.filter(q => q.stage === stage); if (pool.length < 4) return null;
    const dist = q => q.f.reduce((a, v, i) => a + (v - f[i]) ** 2, 0); const near = pool.map(q => [dist(q), q.type]).sort((a, b) => a[0] - b[0]).slice(0, 3);
    const vote = {}; for (const [dd, ty] of near) vote[ty] = (vote[ty] || 0) + 1 / (0.05 + dd); return Object.entries(vote).sort((a, b) => b[1] - a[1])[0][0];
  }
  // what kind of punch, from how the glove travelled since the launch began
  classify(H, rel, stage = 'early') { // your own Body Sync reps first; generic boxing rules if you haven't synced
    const own = this.knn(H.hi, this.feat(H.hi, rel, H.launch.p, H.elbowRel), stage); if (own) { H.clsBy = 'you'; return own; }
    H.clsBy = 'rules'; return this.classifyRules(H, rel);
  }
  classifyRules(H, rel) { // everything in "0.55 m arm" units, so a long or short reach (or the tracker's own scale) reads the same
    const A = this.cal.arms[H.hi], k = 0.55 / Math.max(0.2, A.len);
    const d = rel.clone().sub(H.launch.p).multiplyScalar(k), start = H.launch.p.clone().multiplyScalar(k), r = rel.clone().multiplyScalar(k), el = H.elbowRel.clone().multiplyScalar(k);
    const inward = H.hi === 0 ? -d.x : d.x, elbowOut = H.hi === 0 ? el.x : -el.x;
    const hookShape = el.y > -0.1 && Math.abs(r.y - el.y) < 0.12 && elbowOut > 0.1; // elbow up and out, forearm level
    const low = r.y < -0.26 || start.y < -0.32 && r.y < -0.16; // belly height, not chest
    const fwd = Math.max(0.02, d.z), up = d.y;
    const horiz = Math.hypot(d.x, d.z);
    if (up > 0.14 && up > horiz * 1.1 && start.y < -0.2) return low || r.y < -0.05 ? 'bodyUp' : 'upper'; // rises from low, mostly vertical
    if ((inward > 0.12 && inward > fwd * 0.9) || (hookShape && inward > 0.08 && inward > fwd * 0.5)) return low ? 'bodyHook' : 'hook';
    if (start.y > -0.02 && up < -0.05 && inward > 0.03 && !low) return 'over';
    return low ? 'bodyStraight' : 'straight';
  }
  checkIdentity(dt) { // a different person stepping in shows up as a very different shoulder width
    const sw = this.P[LSH].distanceTo(this.P[RSH]); const r = sw / this.cal.sw;
    if (r < 0.62 || r > 1.55) { this.identityT += dt; if (this.identityT > 1.2) { this.events.push({ type: 'stranger' }); this.identityT = -5; } } else this.identityT = Math.max(0, this.identityT - dt);
  }
  get clinchWant() { return this.clinchT > 0.2; }
}

// ===================== the controller: camera, tracker model, UI, and hand-off to the fighter =====================
export class PMKBody {
  constructor(game) {
    this.game = game; this.active = false; this.state = 'off'; this.cfg = Object.assign({ swap: false, accuracy: 0, preview: true, feet: 'auto', reach: 1, trigger: 1, snap: 1, lab: false }, store.get('ngb_pmk', {}));
    this.profile = store.get('ngb_sync_profile', null); // what Body Sync learned about YOUR punches, guards, slips and stances
    this.tracker = new BodyTracker({ swap: this.cfg.swap, cal: null, profile: this.profile }); this.sync = new BodySync(this);
    this.video = null; this.pose = null; this.busy = false; this.fps = 0; this.lat = 0; this.frames = 0; this.fpsT = 0; this.lastRes = 0;
    this.own = new WeakMap(); this.out = [this.handOut(), this.handOut()]; this.pausedByBody = 0;
  }
  handOut() { return { fade: 1, calG: new THREE.Vector3(), blend: 0, relG: new THREE.Vector3(), relGs: new THREE.Vector3(), velG: new THREE.Vector3(), elbowG: new THREE.Vector3(), guard: false, phase: 'none', live: false, extended: false, prog: 0, gameSpeed: 0, hold: false, init: false }; }
  saveCfg() { store.set('ngb_pmk', this.cfg); }
  setProfile(pr) { this.profile = pr; store.set('ngb_sync_profile', pr); this.tracker.profile = pr; }

  // ---------- start / stop ----------
  async start() {
    if (this.state === 'starting' || this.active) { this.showPanel(true); return; }
    this.state = 'starting'; this.ui(); this.status('Opening camera…');
    const C = window.PMKCamera;
    try {
      if (!this.video) { this.video = document.createElement('video'); this.video.setAttribute('playsinline', ''); this.video.muted = true; this.video.id = 'pmkVideo'; $('pmkPrev').prepend(this.video); }
      this.stream = await C.open(this.video, { facing: 'user', width: 640, height: 480, fps: 30, onEnded: () => this.stop('Camera disconnected') });
      this.status('Loading the body tracker (first time ~5 s)…');
      await this.loadPose();
      this.active = true; this.state = 'calibrating'; this.tracker = new BodyTracker({ swap: this.cfg.swap, tune: this.cfg, profile: this.profile }); this.loopT = 0; this.tick();
      this.showPanel(false); this.ui();
    } catch (e) {
      this.state = 'off'; this.active = false; try { C.stop(this.video, this.stream); } catch (x) {} this.ui();
      const err = C.normalize(e.pmkTracker ? e : e); if (/tracker/i.test(e && e.message || '') || e.pmkTracker) err.code = 'TRACKER_LOAD';
      C.showHelp(err, { onRetry: () => this.start(), onFallback: () => {}, fallbackLabel: 'Play with controller' });
    }
  }
  loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(Object.assign(new Error('tracker script failed: ' + src), { pmkTracker: true })); document.head.appendChild(s); }); }
  async loadPose() {
    if (!window.Pose) { try { await this.loadScript(LOCAL + 'pose.js'); this.base = LOCAL; } catch (e) { await this.loadScript(CDN + 'pose.js'); this.base = CDN; } }
    else this.base = this.base || LOCAL;
    const make = base => { const p = new window.Pose({ locateFile: f => base + f }); p.setOptions({ modelComplexity: this.cfg.accuracy, smoothLandmarks: false, enableSegmentation: false, selfieMode: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 }); p.onResults(r => this.onResults(r)); return p; };
    this.pose = make(this.base);
    try { await this.pose.initialize(); }
    catch (e) { if (this.base === CDN) throw Object.assign(e, { pmkTracker: true }); try { this.pose.close(); } catch (x) {} this.base = CDN; if (!window.Pose) await this.loadScript(CDN + 'pose.js'); this.pose = make(CDN); await this.pose.initialize().catch(er => { throw Object.assign(er, { pmkTracker: true }); }); }
  }
  stop(msg) {
    this.active = false; this.state = 'off'; try { this.video && this.video.cancelVideoFrameCallback ? this.video.cancelVideoFrameCallback(this.raf) : cancelAnimationFrame(this.raf); } catch (e) {}
    try { this.pose && this.pose.close(); } catch (e) {} this.pose = null;
    try { window.PMKCamera.stop(this.video, this.stream); } catch (e) {} this.stream = null;
    for (const o of this.out) o.blend = 0; const f = this.game.player; if (f) { f.camBody = null; }
    this.ui(); if (msg) this.status(msg);
  }
  recalibrate() { if (!this.active) return this.start(); this.tracker = new BodyTracker({ swap: this.cfg.swap, tune: this.cfg, profile: this.profile }); this.state = 'calibrating'; this.ui(); }
  tick = () => {
    if (!this.active) return; const v = this.video;
    // requestVideoFrameCallback fires the moment a new camera frame exists (no waiting for the next screen refresh)
    if (v && v.requestVideoFrameCallback) this.raf = v.requestVideoFrameCallback(() => this.tick()); else this.raf = requestAnimationFrame(this.tick);
    if (this.busy) { this.missed = (this.missed || 0) + 1; return; }
    if (!v || v.readyState < 2 || v.currentTime === this.lastVT) return;
    this.lastVT = v.currentTime; this.busy = true; this.sendT = performance.now();
    this.pose.send({ image: v }).catch(e => this.status('Tracking hiccup: ' + (e.message || e))).finally(() => { this.busy = false; if (this.missed) { this.missed = 0; if (!v.requestVideoFrameCallback) return; this.tick(); } });
  };
  onResults(r) {
    const now = performance.now(); this.lat = this.lat * 0.85 + (now - this.sendT) * 0.15; this.frames++; if (now - this.fpsT > 1000) { this.fps = this.frames * 1000 / (now - this.fpsT); this.frames = 0; this.fpsT = now; }
    this.feed({ lm: r.poseLandmarks || null, world: r.poseWorldLandmarks || null, t: this.sendT });
    if (this.cfg.preview) this.drawPreview(r.poseLandmarks);
  }
  // also the test entry point: synthetic {lm, world, t} frames go through exactly the same path
  feed(frame) {
    this.lastRes = performance.now(); const T = this.tracker; T.syncHold = this.sync.active; T.feed(frame);
    for (const e of T.events) this.onEvent(e);
    if (this.state === 'calibrating' && T.calStep === 'done') { this.state = 'live'; this.cfg.swap = T.swap; this.saveCfg(); this.ui(); }
    if (this.cfg.lab) this.labUI();
    if (this.sync.active) { const now = performance.now(); this.sync.onFrame(Math.min(0.25, (now - (this._sy || now)) / 1000) || 1 / 30); this._sy = now; }
    if (this.state === 'calibrating' && !this.sync.active) this.calUI();
    this.pushHands();
  }
  onEvent(e) {
    const g = this.game, f = g.player;
    if (e.type === 'commit' && f && this.out[e.hi].blend > 0.5 && this.fightOn()) {
      const ok = f.throwBody(e.hi, e.strike, e.heavy, e.kin); this.lastCommit = { ...e, ok, t: performance.now() };
      if (!ok) this.pending = { ...e, t: performance.now() };
      if (ok && g.mode === 'training') { g.trainCheck('body', e.strike); if (e.heavy) g.trainCheck('bodyPower'); }
    }
    if (e.type === 'reclass' && f) { if (f.reclassBody(e.hi, e.strike) && this.lastCommit && this.lastCommit.hi === e.hi) this.lastCommit.strike = e.strike; if (this.pending && this.pending.hi === e.hi) this.pending.strike = e.strike; }
    if (e.type === 'roll' && f && this.fightOn()) f.startRoll(e.dir);
    if (e.type === 'pause' && g.f.length && g.mode !== 'menu') g.togglePause();
    if (e.type === 'swapped') this.flash('Camera was mirrored — hands swapped ✓');
    if (e.type === 'calibrated') { this.flash('Body locked in ✓  Throw!'); if (g.mode === 'training' && !this.sync.active && g.startBodyCamp) g.startBodyCamp(); }
    if (e.type === 'style') { const G = GUARDS[e.style]; if (G) this.flash(G.name + (G.who ? ' · ' + G.who : '')); if (g.mode === 'training') g.trainCheck('guardStyle', e.style); }
    if (e.type === 'feint') { if (g.mode === 'training' && this.fightOn()) g.trainCheck('feint'); }
    if (e.type === 'feetLocked') this.flash('Feet tracked ✓ — your stance: ' + e.stance);
    if (e.type === 'stranger') this.flash('Different body in frame — tap RECALIBRATE if that is you');
    if (e.type === 'handLost') this.flash((e.hi === 0 ? 'Left' : 'Right') + ' hand out of view');
  }
  fightOn() { const g = this.game; return !!(g.player && !g.paused && (g.inFightPhase ? g.inFightPhase() : g.phase === 'fight')); }
  // convert the tracker's hands into game-scale targets (fighter-local, from that fighter's shoulder)
  pushHands() {
    const T = this.tracker, f = this.game.player; if (!f || !T.cal) return;
    const k = f.armLen / ((T.cal.arms[0].len + T.cal.arms[1].len) / 2), zg = T.cal.zGain * (this.cfg.reach || 1);
    for (let hi = 0; hi < 2; hi++) {
      const H = T.hands[hi], o = this.out[hi], A = T.cal.arms[hi];
      const ky = 1 + (k - 1) * 0.4; // reach scales fully; height only partly (your hand rising 10 cm shouldn't throw the glove over the head)
      const m = v => new THREE.Vector3(v.x * k, v.y * ky, v.z * k * zg);
      o.fade = 1 - 0.3 * sm(H.ext); o.calG = m(A.rel);
      o.relG.copy(m(H.rel)); o.velG.copy(m(H.vel)); o.elbowG.copy(m(H.elbowRel));
      if (!o.init) { o.relGs.copy(o.relG); o.init = true; }
      o.guard = H.guard; o.guardKind = H.guardKind; o.phase = H.phase; o.live = H.live; o.extended = H.extended; o.prog = H.prog; o.hold = H.hold; o.tracked = H.tracked && T.tracked;
      o.gameSpeed = clamp(H.speed / T.cal.peak * 8.6, 0, 12);
    }
  }

  // ---------- every game frame: hand the body to the fighter ----------
  apply(dt) {
    const g = this.game, f = g.player; if (!f) return;
    const T = this.tracker; const live = this.active && this.state === 'live' && T.cal;
    const stale = performance.now() - this.lastRes > 350; // frames stopped arriving
    const bodyOn = live && T.tracked && !stale;
    f.analogRest = f.analogRest || !!live;
    const cb = f.camBody || (f.camBody = { hands: this.out, torso: { twist: 0, hipTwist: 0 }, own: [0, 0], torsoOwn: 0 });
    cb.torsoOwn += ((bodyOn ? 1 : 0) - cb.torsoOwn) * (1 - Math.exp(-dt * 6));
    for (let hi = 0; hi < 2; hi++) {
      const o = this.out[hi]; const want = bodyOn && o.tracked && !this.demo ? 1 : 0;
      o.blend += (want - o.blend) * (1 - Math.exp(-dt * (want ? 5 : 7))); if (o.blend < 0.002) o.blend = 0;
      // render-rate glove target: chase the latest camera sample with a little velocity lead (hides tracker latency)
      const sn = this.cfg.snap || 1; // SMOOTH 0.6 · NORMAL 1 · SNAPPY 1.5
      const lead = o.relG.clone().addScaledVector(o.velG, (o.phase === 'out' ? 0.06 : 0.03) * sn);
      const spd = o.velG.length(); const rate = o.phase === 'out' ? 60 : 8 + 40 * clamp(spd / 1.4, 0, 1);
      o.relGs.lerp(lead, 1 - Math.exp(-dt * rate * (0.6 + 0.4 * sn)));
      cb.own[hi] = o.blend;
    }
    if (cb.torsoOwn < 0.01 && !live) return;
    const I = f.intent, tw = T.torso, k = cb.torsoOwn;
    // torso: camera owns it while tracked — slips stay slips, even with your gloves up
    if (k > 0.01) {
      I.weave = I.weave * (1 - k) + tw.weave * k; I.duck = (I.duck || 0) * (1 - k) + tw.duck * k; I.pull = (I.pull || 0) * (1 - k) + tw.pull * k;
      cb.torso.twist = tw.twist * k; cb.torso.hipTwist = tw.hipTwist * k;
    } else { cb.torso.twist = cb.torso.hipTwist = 0; }
    // guards: each camera-owned hand guards where your real hand is
    const hg = I.handGuard ? I.handGuard.slice() : [false, false];
    for (let hi = 0; hi < 2; hi++) if (this.out[hi].blend > 0.5) hg[hi] = this.out[hi].guard;
    I.handGuard = hg; if (k > 0.5 && !g.analogDriven.has(f)) f.setGuard(null);
    f.camStyle = this.out[0].blend > 0.5 && this.out[1].blend > 0.5 ? T.style || null : null;
    // feet: controller owns walking when one drives this fighter; otherwise your steps do
    const padFeet = g.analogDriven.has(f) || this.cfg.feet === 'pad';
    if (!padFeet && bodyOn && this.cfg.feet !== 'off') { const K = g.keys || {}; if (!(K.w || K.s || K.a || K.d)) I.move.set(clamp(T.step.x, -1, 1), clamp(T.step.y, -1, 1)); }
    // your real feet (when knees + ankles are in the picture): scoots and pivots add to the controller's A/B/X/Y, never fight them
    const F = T.feet; const feetOn = bodyOn && this.cfg.feet !== 'pad' && this.cfg.feet !== 'off' && F.seen > 0.5 && F.lead;
    if (!feetOn && bodyOn && F.hipLead && F.hipLead !== f.stance && this.cfg.feet !== 'off' && f.state === 'idle' && !f.strike && !f.clinch && this.fightOn()) { if (f.switchStance()) this.flash(F.hipLead === 'southpaw' ? 'Southpaw ⇄ (hips)' : 'Orthodox ⇄ (hips)'); }
    if (feetOn) {
      const pad = g.analogDriven.has(f) ? f.scoot.slice() : [0, 0]; f.scoot = [pad[0] || F.scoot[0], pad[1] || F.scoot[1]];
      if (!(g.analogDriven.has(f) && f.pivot)) f.pivot = F.pivot;
      if (F.lead !== f.stance && f.state === 'idle' && !f.strike && !f.clinch && this.fightOn()) { if (f.switchStance()) this.flash(F.lead === 'southpaw' ? 'Southpaw ⇄' : 'Orthodox ⇄'); }
    } else if (!g.analogDriven.has(f)) { f.scoot = [0, 0]; f.pivot = bodyOn && this.cfg.feet !== 'off' && this.cfg.feet !== 'pad' ? F.pivot : null; }
    cb.feet = feetOn ? 1 : 0;
    // Training Camp reads your body, not buttons
    if (g.mode === 'training' && bodyOn && this.fightOn()) { if (Math.abs(tw.weave) > 0.55) g.trainCheck('weave'); if (tw.duck > 0.6) g.trainCheck('duck'); if (tw.pull > 0.55) g.trainCheck('pull'); if (hg[0] || hg[1]) g.trainCheck('guard', '8');
      if (f.strike && f.strike.body && f.strike.hold) g.trainCheck('bodyHold'); if (f.pivot) g.trainCheck('pivot'); if (f.scoot[0] || f.scoot[1]) g.trainCheck('scoot'); if (f.clinch && f.clinch.holds && (f.clinch.holds[0] !== f.clinch.holds[1])) g.trainCheck('oneHand'); }
    // clinch: shared game state — camera can ask, controller can ask, the game decides
    const c = f.clinch; const camHold = [this.out[0].blend > 0.5 && this.out[0].hold, this.out[1].blend > 0.5 && this.out[1].hold];
    if (bodyOn) {
      if (c && c.role === 'holder') { const pad = c.holds || [false, false]; c.holds = [camHold[0] || (this.out[0].blend < 0.5 && pad[0]), camHold[1] || (this.out[1].blend < 0.5 && pad[1])]; I.clinch = I.clinch || c.holds[0] || c.holds[1]; }
      else I.clinch = I.clinch || T.clinchWant;
    }
    // a punch that had to wait for the other hand (combos): fire it as soon as the engine can, if your hand is still going out
    if (this.pending) { const pe = this.pending, o = this.out[pe.hi]; if (performance.now() - pe.t > 220 || o.phase !== 'out') this.pending = null; else if (f.throwBody(pe.hi, pe.strike, pe.heavy, pe.kin)) { this.lastCommit = { ...pe, ok: true, t: performance.now(), late: true }; this.pending = null; } }
    // the live strike reads its window and speed from your real glove
    const s = f.strike; if (s && s.body) { const o = this.out[s.hi]; if (o.blend < 0.3 || !o.tracked) { s.live = false; s.bodyPhase = 'back'; } else { s.live = o.live; s.camSpeed = o.gameSpeed; if (o.phase !== 'out') s.bodyPhase = 'back'; } }
    this.hud();
  }

  // ---------- PMK lab: what the tracker thinks, live (and how old the frame is) ----------
  labUI() {
    const el = $('pmkLab'); if (!el) return; const T = this.tracker; if (!T.cal) { el.textContent = 'calibrating: ' + T.calStep; return; }
    const h = H => `${H.hi ? 'R' : 'L'} ${H.tracked ? '' : 'LOST '}${H.phase.padEnd(4)} ${H.guardKind ? H.guardKind.toUpperCase() + '-GUARD ' : ''}${H.extended ? 'HELD ' : ''}reach ${H.ext.toFixed(2)} drive ${H.vr.toFixed(1)}m/s conf ${H.conf.toFixed(2)}${H.armed ? ' ·armed' : ''}`;
    const F = T.feet, tw = T.torso; const age = Math.round(performance.now() - this.sendT);
    el.textContent = [h(T.hands[0]), h(T.hands[1]), `torso weave ${tw.weave.toFixed(2)} duck ${tw.duck.toFixed(2)} pull ${tw.pull.toFixed(2)} twist ${tw.twist.toFixed(2)} hips ${tw.hipTwist.toFixed(2)}`,
      `feet ${F.seen > 0.5 ? (F.lead || 'reading…') + ' sig ' + (F.sig || 0).toFixed(2) : 'not in view'}${F.scoot[0] ? ' A' : ''}${F.scoot[1] ? ' B' : ''}${F.pivot ? ' pivot-' + F.pivot : ''}  step ${T.step.x.toFixed(2)},${T.step.y.toFixed(2)}`,
      `trigger ${(T.cal.vMin * T.tune.trigger).toFixed(2)}m/s  pose ${Math.round(this.lat)}ms  frame age ${age}ms  ${Math.round(this.fps)}fps  last: ${this.lastCommit ? this.lastCommit.strike + (this.lastCommit.ok ? '' : ' (refused)') : '—'}`].join('\n');
  }
  // ---------- UI ----------
  ui() {
    const el = $('pmk'); if (!el) return; el.dataset.state = this.state;
    const b = $('pmkGo'); if (b) b.textContent = this.active ? 'STOP CAMERA' : 'START BODY CONTROL';
    const sw = $('pmkSwap'); if (sw) sw.textContent = 'SWAP HANDS' + (this.cfg.swap ? ' ✓' : '');
    const ac = $('pmkAcc'); if (ac) ac.textContent = 'TRACKER: ' + (this.cfg.accuracy ? 'SHARP' : 'FAST');
    const pv = $('pmkPv'); if (pv) pv.textContent = 'PREVIEW: ' + (this.cfg.preview ? 'ON' : 'OFF');
    const am = $('pmkAim'); if (am) { const v = this.game.settings.aim ?? 0.6; am.textContent = 'AIM: ' + (v >= 0.85 ? 'STRONG' : v > 0 ? 'ASSIST' : 'RAW (1:1)'); }
    const ft = $('pmkFeet'); if (ft) ft.textContent = 'FEET: ' + ({ auto: 'BODY + CONTROLLER', pad: 'CONTROLLER ONLY', off: 'OFF' })[this.cfg.feet];
    const rc = $('pmkReach'); if (rc) rc.textContent = 'REACH: ' + Math.round(this.cfg.reach * 100) + '%';
    const tg = $('pmkTrig'); if (tg) tg.textContent = 'TRIGGER: ' + ({ 0.75: 'EASY', 1: 'NORMAL', 1.25: 'FIRM' })[this.cfg.trigger];
    const sn = $('pmkSnap'); if (sn) sn.textContent = 'FEEL: ' + ({ 0.6: 'SMOOTH', 1: 'NORMAL', 1.5: 'SNAPPY' })[this.cfg.snap];
    const lb = $('pmkLabBtn'); if (lb) lb.textContent = 'LAB: ' + (this.cfg.lab ? 'ON' : 'OFF'); const lo = $('pmkLab'); if (lo) lo.classList.toggle('hidden', !(this.cfg.lab && this.active));
    $('pmkPrev').classList.toggle('hidden', !(this.active && this.cfg.preview));
    const chip = $('pmkChip'); if (chip) chip.classList.toggle('hidden', !this.active);
    $('pmkCal').classList.toggle('hidden', this.state !== 'calibrating' || this.sync.active);
    if (this.game.menuPmk) this.game.menuPmk();
  }
  showPanel(v) { const g = this.game; if (v && g.f && g.f.length && g.mode !== 'menu' && !g.paused && g.phase !== 'end') g.togglePause(); $('pmk').classList.toggle('hidden', !v); if (v) this.ui(); }
  status(msg) { const s = $('pmkStatus'); if (s) s.textContent = msg; }
  flash(msg) { const el = $('pmkFlash'); if (!el) return; el.textContent = msg; el.classList.remove('hidden'); clearTimeout(this._fl); this._fl = setTimeout(() => el.classList.add('hidden'), 2200); }
  calUI() {
    const T = this.tracker; const steps = ['frame', 'guard', 'jabL', 'jabR']; const i = steps.indexOf(T.calStep);
    $('pmkCalMsg').textContent = T.calMsg; $('pmkCalStep').textContent = `STEP ${i + 1} / 4`;
    $('pmkCalBar').style.width = Math.round(T.calProg * 100) + '%'; $('pmkCalSkip').classList.toggle('hidden', i < 2);
  }
  hud() {
    const chip = $('pmkChip'); if (!chip || !this.active) return; const T = this.tracker;
    const st = this.state === 'calibrating' ? 'CALIBRATING' : !T.tracked ? 'STEP INTO FRAME' : 'BODY';
    const hand = o => o.blend < 0.3 ? '·' : o.phase === 'out' ? (o.extended ? '▬' : '➤') : o.guardKind === 'face' ? '■' : o.guardKind === 'body' ? '▼' : '○';
    const stn = T.feet.lead ? (T.feet.lead === 'orthodox' ? 'ORTH' : 'SOUTH') : ''; const sty = T.style && T.style !== 'high' ? T.style.toUpperCase() : '';
    chip.innerHTML = `<i class="${T.tracked ? 'on' : ''}"></i>${st} <b title="left · right hand">L${hand(this.out[0])} R${hand(this.out[1])}</b>${stn ? `<em>${stn}</em>` : ''}${sty ? `<em>${sty}</em>` : ''}${this.profile ? '<em>SYNCED</em>' : ''}<span>${Math.round(this.fps)}fps · ${Math.round(this.lat)}ms</span>`;
  }
  drawPreview(lm) {
    const cv = $('pmkCanvas'); if (!cv || !this.video) return; const v = this.video; const W = cv.width = 160, H = cv.height = 120;
    const x = cv.getContext('2d'); x.clearRect(0, 0, W, H); if (!lm) return;
    const E = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28]];
    x.lineWidth = 3; x.lineCap = 'round';
    const col = i => { const L = this.tracker.L.bind(this.tracker); if ([L(13), L(15)].includes(i)) return '#00e5ff'; if ([L(14), L(16)].includes(i)) return '#ff8c3a'; return '#ffffffcc'; };
    for (const [a, b] of E) { const p = lm[a], q = lm[b]; if (!p || !q || (p.visibility ?? 1) < 0.4 || (q.visibility ?? 1) < 0.4) continue; x.strokeStyle = col(b); x.beginPath(); x.moveTo(p.x * W, p.y * H); x.lineTo(q.x * W, q.y * H); x.stroke(); }
  }
  bindUI() {
    $('pmkGo').onclick = () => { this.game.fx && this.game.fx.audio.init(); this.active ? this.stop('Camera off — controller and keyboard have everything') : this.start(); };
    $('pmkRecal').onclick = () => this.recalibrate();
    $('pmkSync').onclick = () => { this.showPanel(false); this.game.startSync(); };
    $('pmkSwap').onclick = () => { this.cfg.swap = !this.cfg.swap; this.saveCfg(); this.tracker.mirrorCal(); this.ui(); };
    $('pmkAcc').onclick = () => { this.cfg.accuracy = this.cfg.accuracy ? 0 : 1; this.saveCfg(); try { this.pose && this.pose.setOptions({ modelComplexity: this.cfg.accuracy }); } catch (e) {} this.ui(); };
    $('pmkPv').onclick = () => { this.cfg.preview = !this.cfg.preview; this.saveCfg(); this.ui(); };
    $('pmkAim').onclick = () => { const g = this.game, o = [0.6, 0.9, 0]; const cur = g.settings.aim ?? 0.6; g.settings.aim = o[(o.indexOf(cur) + 1) % 3]; g.saveSettings(); this.ui(); };
    $('pmkFeet').onclick = () => { const o = ['auto', 'pad', 'off']; this.cfg.feet = o[(o.indexOf(this.cfg.feet) + 1) % 3]; this.saveCfg(); this.ui(); };
    $('pmkClose').onclick = () => this.showPanel(false);
    const cyc = (key, vals) => () => { const i = vals.indexOf(this.cfg[key]); this.cfg[key] = vals[(i + 1) % vals.length]; this.saveCfg(); this.tracker.tune = this.cfg; this.ui(); };
    $('pmkReach').onclick = cyc('reach', [0.85, 1, 1.15, 1.3]); $('pmkTrig').onclick = cyc('trigger', [0.75, 1, 1.25]); $('pmkSnap').onclick = cyc('snap', [0.6, 1, 1.5]);
    $('pmkLabBtn').onclick = () => { this.cfg.lab = !this.cfg.lab; this.saveCfg(); this.ui(); };
    $('pmkCalSkip').onclick = () => { this.tracker.skipJabs(); this.feed({ lm: null, world: null, t: performance.now() + 1 }); };
    $('pmkChip').onclick = () => this.showPanel(true);
  }
}
const $ = id => document.getElementById(id);
