// BODY SYNC — the tutorial where the game learns YOUR movements (and you sharpen your boxing).
// The fighter shows each move, you throw it 3× (each side), the game records exactly how you throw it:
// punch paths (→ your own punch templates), speed (→ your trigger), reach (→ your glove range), face & body guard
// positions, slip / duck / lean-back range, and your stance in both orthodox and southpaw.
import * as THREE from 'three';
import { strikeFor } from './combat.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
const LSH = 11, RSH = 12, LEL = 13, REL = 14, LWR = 15, RWR = 16, LAN = 27, RAN = 28;
const ARM = [[LSH, LEL, LWR], [RSH, REL, RWR]];

// side: 'lead' | 'rear' (resolved from YOUR stance), reps per side
const STEPS = [
  { id: 'frame', title: 'Get in the picture', say: 'Stand 2–3 m back. Head, both gloves, hips AND feet in the shot.', kind: 'frame' },
  { id: 'guard', title: 'Your guard', say: 'Hands up by your face, your normal fighting stance. Hold still.', kind: 'hold', tip: 'Chin down, elbows in, eyes over the gloves.' },
  { id: 'left', title: 'LEFT HAND CHECK', side: 'left', type: 'straight', n: 1, say: 'Throw ONE straight punch with your LEFT hand.', tip: 'Some phones flip the picture — this one punch tells the game which hand is which.' },
  { id: 'jab', title: 'JAB', side: 'lead', type: 'straight', n: 3, say: 'Snap the jab straight out — and straight back to your face.', tip: 'Turn the fist over at the end, shoulder up to cover the chin. The return is half the punch.' },
  { id: 'cross', title: 'CROSS', side: 'rear', type: 'straight', n: 3, say: 'Rear hand straight down the middle.', tip: 'Pivot the back foot and turn the hip through it — power comes from the floor.' },
  { id: 'hookL', title: 'LEAD HOOK', side: 'lead', type: 'hook', n: 3, say: 'Elbow up level with the fist, swing across.', tip: 'Turn the lead foot and hip with it. Short — not a wide loop.' },
  { id: 'hookR', title: 'REAR HOOK', side: 'rear', type: 'hook', n: 3, say: 'Rear hook — elbow up, swing across.', tip: 'Rear heel turns out, the body throws it, not the arm.' },
  { id: 'upL', title: 'LEAD UPPERCUT', side: 'lead', type: 'upper', n: 3, say: 'Dip a little, drive the lead hand UP.', tip: 'Elbow stays bent and close; push up from the legs.' },
  { id: 'upR', title: 'REAR UPPERCUT', side: 'rear', type: 'upper', n: 3, say: 'Dip, rear hand drives UP through the middle.', tip: 'Don\'t drop the hand to wind up — the legs load it.' },
  { id: 'bodyL', title: 'LEAD TO THE BODY', side: 'lead', type: 'bodyStraight', n: 3, say: 'Bend your knees and punch at belly height.', tip: 'Change levels with the legs, not by reaching down with the arm. Head off the centre line.' },
  { id: 'bodyR', title: 'REAR TO THE BODY', side: 'rear', type: 'bodyStraight', n: 3, say: 'Knees bent, rear hand to the belly.', tip: 'Eyes up, other glove stays on your chin.' },
  { id: 'gBody', title: 'BODY GUARD', say: 'Drop your elbows to cover your ribs. Gloves stay up by your chest. Hold.', kind: 'holdBody', tip: 'Elbows glued to the ribs, a little crunch in the abs.' },
  { id: 'sPeek', title: 'PEEK-A-BOO', kind: 'holdStyle', style: 'peek', say: 'Gloves tight on your cheekbones, elbows tucked on your ribs, chin down. Hold.', tip: "Cus D'Amato's shell — look at him between the gloves and keep the head moving. Elbows eat the body hooks." },
  { id: 'sPhilly', title: 'PHILLY SHELL', kind: 'holdStyle', style: 'philly', say: 'Lead arm down across your belly, rear glove on your chin, lead shoulder up to your cheek. Hold.', tip: 'Turn a little side-on. His right hand rolls off your shoulder — then fire yours straight back.' },
  { id: 'sLong', title: 'LONG GUARD', kind: 'holdStyle', style: 'long', say: 'Push your lead arm SLOWLY out toward his face, open glove. Rear glove stays home. Hold.', tip: 'Foreman pawed and pushed with it. Slow — a fast push is a jab.' },
  { id: 'sCross', title: 'CROSS-ARM', kind: 'holdStyle', style: 'cross', say: 'Forearms stacked across your face and chest, each glove toward the other elbow. Hold.', tip: "Archie Moore's shell: breathe inside it, peek over the top. Watch for the uppercut up the middle." },
  { id: 'slipL', title: 'SLIP LEFT', say: 'Slip your head to the LEFT — and back. Twice.', kind: 'torso', axis: 'slipL', n: 2, tip: 'Bend at the knees and waist, just outside the punch — not a lean back.' },
  { id: 'slipR', title: 'SLIP RIGHT', say: 'Slip to the RIGHT — and back. Twice.', kind: 'torso', axis: 'slipR', n: 2, tip: 'Eyes stay on him while you slip.' },
  { id: 'duck', title: 'DUCK', say: 'Bend your knees and duck under — and up. Twice.', kind: 'torso', axis: 'duck', n: 2, tip: 'Back straight, legs do the work, gloves stay up.' },
  { id: 'pull', title: 'LEAN BACK', say: 'Pull your head back away from a shot — and return. Twice.', kind: 'torso', axis: 'pull', n: 2, tip: 'Small pull, weight to the back foot, ready to fire back.' },
  { id: 'switch', title: 'SWITCH STANCE', say: 'Switch to your OTHER stance (other foot in front). Gloves up. Hold.', kind: 'stance', tip: 'Feet shoulder-width, never cross them.' },
  { id: 'switchBack', title: 'SWITCH BACK', say: 'Back to your normal stance. Hold.', kind: 'stanceBack' },
];

export class BodySync {
  constructor(pmk) { this.pmk = pmk; this.active = false; }
  get g() { return this.pmk.game; }
  get T() { return this.pmk.tracker; }
  begin() {
    this.active = true; this.i = 0; this.reps = []; this.torso = { slipL: 0, slipR: 0, duck: 0, pull: 0 }; this.stance = {}; this.bodyGuard = null; this.styles = null; this.log = [];
    const pmk = this.pmk; pmk.syncMode = true;
    $('sync').classList.remove('hidden'); this.enter();
    if (!pmk.active) pmk.start(); else pmk.recalibrate();
  }
  exit(saved) {
    this.active = false; this.pmk.syncMode = false; this.pmk.demo = false; if (this.T) this.T.noHeading = false; $('sync').classList.add('hidden');
    if (!saved) this.pmk.flash('Body Sync stopped — nothing saved');
  }
  step() { return STEPS[this.i]; }
  stance0() { return (this.T.cal && this.T.cal.stance0) || 'orthodox'; }
  handFor(side) { if (side === 'left') return 0; const lead = this.stance0() === 'orthodox' ? 0 : 1; return side === 'lead' ? lead : 1 - lead; }
  enter() {
    const st = this.step(); if (!st) return this.finish();
    this.count = 0; this.holdT = 0; this.waitT = 0; this.demoQ = []; this.det = [{ s: 'idle' }, { s: 'idle' }]; this.tor = { s: 'idle', pk: 0 }; this.msg = ''; this.fb = '';
    if ((st.type || st.style) && this.T.calStep === 'done' && this.g.player) this.demo(st); else this.demoT = 0;
    this.render();
  }
  // the fighter shows you the move first (your camera hands step back while it does)
  demo(st) {
    if (st.style) { const f = this.g.player, keep = f.guardStyle; this.pmk.demo = true; this.demoT = 1.6; f.guardStyle = st.style; f.setGuard('high');
      this.demoQ = [{ at: 0.05, fn: () => { f.guardStyle = keep; f.setGuard(null); } }]; return; }
    const f = this.g.player, hi = this.handFor(st.side), name = strikeFor(hi, st.type, f.stance); this.pmk.demo = true; this.demoT = 1.9;
    const go = () => { if (this.active && this.pmk.demo) { f.strike = null; f.state = 'idle'; f.requestStrike(name); } };
    this.demoQ = [{ at: 1.65, fn: go }, { at: 0.85, fn: go }];
  }
  next() { this.i++; this.enter(); }
  skip() { this.log.push({ step: this.step().id, skipped: true }); this.next(); }
  redo() { const st = this.step(); this.reps = this.reps.filter(r => r.step !== st.id); this.enter(); }

  // ---------- every tracker frame (after the tracker has updated) ----------
  onFrame(dt) {
    if (!this.active) return; const T = this.T, st = this.step(); if (!st) return;
    if (this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) this.next(); return; }
    if (this.demoT > 0) { this.demoT -= dt; while (this.demoQ.length && this.demoT <= this.demoQ[0].at) this.demoQ.shift().fn(); if (this.demoT <= 0) { this.pmk.demo = false; this.det = [{ s: 'idle' }, { s: 'idle' }]; this.render(); } return; }
    // frame + guard use the tracker's own calibration steps; we just read the progress
    if (st.kind === 'frame') {
      const v = T.vis, feet = v[LAN] > 0.5 && v[RAN] > 0.5; const ok = T.tracked && T.calStep !== 'frame';
      this.msg = !T.tracked ? 'Looking for you…' : feet ? 'Got you — feet in view ✓' : 'Got you — but tilt the phone down / step back so your FEET are in the shot (stance needs them)';
      this.holdT = ok ? this.holdT + dt : 0; if (this.holdT > (feet ? 0.8 : 4)) { this.feetOK = feet; this.next(); } else this.render(); return;
    }
    if (st.kind === 'hold') { // guard: the tracker's calibration captures it
      this.msg = T.calMsg || ''; if (T.calStep === 'jabL' || T.calStep === 'done') { if (T.calStep !== 'done') { T.calStep = 'done'; T.finishCal(); } T.noHeading = true; this.flashOk('Guard locked ✓'); this.next(); } else this.render(); return;
    }
    if (T.calStep !== 'done' || !T.cal) return;
    if (st.type) return this.punchFrame(st, dt);
    if (st.kind === 'holdBody') return this.bodyGuardFrame(dt);
    if (st.kind === 'holdStyle') return this.styleFrame(st, dt);
    if (st.kind === 'torso') return this.torsoFrame(st, dt);
    if (st.kind === 'stance' || st.kind === 'stanceBack') return this.stanceFrame(st, dt);
  }
  // ---------- punches: direction-free rep detector on each hand ----------
  punchFrame(st, dt) {
    const T = this.T, want = this.handFor(st.side);
    for (const H of T.hands) {
      const d = this.det[H.hi];
      if (d.s === 'idle' && H.vrad > 0.9 && H.rExt > 0.12) { d.s = 'out'; d.t0 = T.t; d.pk = H.rExt; d.v = H.vrad; d.start = Math.max(0, T.rawHist.length - 3); d.raw = T.rawHist.slice(-3); }
      else if (d.s === 'out') {
        d.raw.push(T.rawHist[T.rawHist.length - 1]); d.v = Math.max(d.v, H.vrad);
        if (H.rExt >= d.pk) { d.pk = H.rExt; d.pkI = d.raw.length - 1; }
        if (H.rExt < d.pk - 0.12 || T.t - d.t0 > 0.9) { // the punch turned around: one rep
          d.s = 'back'; d.tb = T.t;
          if (d.pk > 0.42) this.gotRep(st, H.hi, want, d); else if (H.hi === want) this.feedback(`Too short — reach ${Math.round(d.pk * 100)}%. Extend all the way.`);
        }
      } else if (d.s === 'back') {
        if (H.rExt < 0.3) { d.s = 'idle'; if (H.hi === want && this.lastRep && !this.lastRep.back) { this.lastRep.back = T.t - d.tb; if (this.lastRep.back < 0.45) this.feedback(this.fb + '  ·  back to the chin ✓'); } if (this.count >= st.n) this.doneStep(); }
        else if (T.t - d.tb > 1.6) { d.s = 'idle'; if (H.hi === want) this.feedback('Bring it back to your face after every punch.'); if (this.count >= st.n) this.doneStep(); }
      }
    }
  }
  gotRep(st, hi, want, d) {
    const T = this.T;
    if (hi !== want) {
      if (st.id !== 'left') return this.feedback(`That was your ${hi ? 'RIGHT' : 'LEFT'} hand — this one's the ${want ? 'RIGHT' : 'LEFT'}.`);
      // you threw your LEFT and the camera called it right: its labels are mirrored. Relabel everything (guard, stance) and keep the rep.
      T.mirrorCal(); this.pmk.cfg.swap = T.swap; this.pmk.saveCfg(); this.pmk.flash('Camera was mirrored — hands swapped ✓');
      this.det = [{ s: 'idle' }, { s: 'idle' }]; this.det[want] = { s: 'back', tb: T.t }; hi = want;
    }
    const rep = { step: st.id, type: st.type, hi, raw: d.raw.filter(Boolean), pkI: d.pkI ?? d.raw.length - 1, v: d.v, reach: d.pk, back: null };
    this.reps.push(rep); this.lastRep = rep; this.count++;
    const rules = this.ruleCheck(rep, st); const sp = `${d.v.toFixed(1)} m/s`;
    this.feedback(`${this.count}/${st.n} ✓  ${sp} · reach ${Math.round(Math.min(1, d.pk) * 100)}%${rules ? '  ·  ' + rules : ''}`);
    this.g.fx && this.g.fx.audio.tone && this.g.fx.audio.tone(660 + this.count * 110, 0.06, 0.2, 'sine');
    if (st.type === 'straight') this.solve(); // every straight sharpens "which way is forward"
  }
  // boxing feedback from the generic rules (before your templates exist)
  ruleCheck(rep, st) {
    const f = this.featOf(rep, 'full'); if (!f) return '';
    const [inX, up, fz, sy] = [f[0], f[1], f[2], f[3]];
    if (st.type === 'hook' && inX < 0.6) return 'more ACROSS — elbow up, swing through the side';
    if (st.type === 'upper' && up < 0.6) return 'more UP — dip first, drive from the legs';
    if (st.type === 'straight' && Math.abs(inX) > 1.1) return 'keep it straighter down the middle';
    if (st.type === 'bodyStraight' && f[4] > -0.15) return 'lower — bend your knees to get to the body';
    return '';
  }
  // ---------- which way is forward: the average direction of your straights ----------
  solve() {
    const T = this.T, D = new THREE.Vector3(); let n = 0;
    for (const r of this.reps) if (r.type === 'straight') { const [S, , W] = ARM[r.hi]; const J = r.raw[r.pkI]?.world, J0 = r.raw[0]?.world; if (!J || !J0) continue;
      const d = T.pre(J, W).sub(T.pre(J, S)).sub(T.pre(J0, W).sub(T.pre(J0, S))); d.y = 0; if (d.length() < 0.08) continue; D.add(d.normalize()); n++; }
    if (n) { T.jabDir = D.multiplyScalar(1 / n); T.solveFrame(); T.calStep = 'done'; }
  }
  // features of a recorded rep, recomputed in the CURRENT (final) body frame
  featOf(rep, stage) {
    const T = this.T, raw = rep.raw; if (raw.length < 2) return null; const [S, E, W] = ARM[rep.hi]; const a = new THREE.Vector3(), b = new THREE.Vector3();
    const relAt = k => T.toLocal(raw[k].world[T.L(W)], a.clone()).sub(T.toLocal(raw[k].world[T.L(S)], b.clone()));
    const elbAt = k => T.toLocal(raw[k].world[T.L(E)], a.clone()).sub(T.toLocal(raw[k].world[T.L(S)], b.clone()));
    const k = stage === 'early' ? Math.max(1, Math.round(rep.pkI * 0.5)) : rep.pkI; return T.feat(rep.hi, relAt(k), relAt(0), elbAt(k));
  }
  // ---------- body guard ----------
  bodyGuardFrame(dt) {
    const T = this.T, H = T.hands; const still = H.every(h => h.speed < 0.5), low = H.every(h => h.rel.y < -0.06);
    this.msg = !low ? 'Lower — elbows down over the ribs, gloves at chest height' : !still ? 'Hold still…' : 'Holding…';
    if (still && low) { this.holdT += dt; this.acc = this.acc || [[], []]; H.forEach(h => this.acc[h.hi].push(h.rel.toArray())); } else { this.holdT = 0; this.acc = null; }
    if (this.holdT > 1) { this.bodyGuard = this.acc.map(a => a[0].map((_, j) => a.reduce((s, q) => s + q[j], 0) / a.length)); this.acc = null; this.flashOk('Body guard learned ✓'); this.next(); } else this.render();
  }
  // ---------- guard styles: hold the shell, the game stores where YOUR hands are in it ----------
  styleFrame(st, dt) {
    const T = this.T, H = T.hands, face = this.T.cal.arms.map(a => a.rel); const still = H.every(h => h.speed < 0.5 && h.phase !== 'out');
    const moved = H.reduce((a, h) => a + h.rel.distanceTo(face[h.hi]), 0) > (st.style === 'peek' ? 0.05 : 0.14);
    this.msg = !moved ? 'Get into the shell…' : !still ? 'Hold still…' : 'Holding…';
    if (still && moved) { this.holdT += dt; (this.acc = this.acc || [[], []]); H.forEach(h => this.acc[h.hi].push(h.rel.toArray())); } else { this.holdT = 0; this.acc = null; }
    if (this.holdT > 1) { (this.styles = this.styles || {})[st.style] = this.acc.map(a => a[0].map((_, j) => +(a.reduce((s, q) => s + q[j], 0) / a.length).toFixed(3))); this.acc = null; this.flashOk(st.title + ' learned ✓'); this.next(); } else this.render();
  }
  // ---------- slips / duck / lean back: your own range ----------
  torsoFrame(st, dt) {
    const T = this.T.torso, ax = st.axis; const v = ax === 'slipL' ? T.leanRaw : ax === 'slipR' ? -T.leanRaw : ax === 'duck' ? T.duckRaw : T.pullRaw;
    const on = ax === 'duck' ? 0.14 : ax === 'pull' ? 0.06 : 0.45, off = on * 0.45; const t = this.tor;
    if (t.s === 'idle' && v > on) { t.s = 'out'; t.pk = v; }
    else if (t.s === 'out') { t.pk = Math.max(t.pk, v); if (v < off) { t.s = 'idle'; this.count++; this.torso[ax] = Math.max(this.torso[ax], t.pk); this.feedback(`${this.count}/${st.n} ✓`); this.g.fx.audio.tone && this.g.fx.audio.tone(660 + this.count * 110, 0.06, 0.2, 'sine'); if (this.count >= st.n) this.doneStep(); } }
    this.msg = `${st.say}`; this.render();
  }
  // ---------- stance: feet vs chest, in both stances ----------
  stanceFrame(st, dt) {
    const T = this.T; const v = T.vis; if (!(v[LAN] > 0.5 && v[RAN] > 0.5)) { this.msg = 'I can\'t see your feet — tilt the phone down or step back (or SKIP)'; this.holdT = 0; return this.render(); }
    const sig = T.stanceSignal(), main = this.stance0(), mainSign = main === 'orthodox' ? 1 : -1; const other = st.kind === 'stance';
    const ok = other ? sig * mainSign < -0.04 : sig * mainSign > 0.04; const still = T.hands.every(h => h.speed < 0.6);
    this.msg = ok ? (still ? 'Holding…' : 'Hands still…') : other ? 'Other foot in front…' : 'Back to your normal stance…';
    if (ok && still) { this.holdT += dt; (this.sAcc = this.sAcc || []).push([sig, T.torso.hipRaw, T.torso.yawRaw]); } else { this.holdT = 0; this.sAcc = null; }
    if (this.holdT > 1) {
      const a = this.sAcc, m = j => a.reduce((s, q) => s + q[j], 0) / a.length; this.sAcc = null;
      if (other) { this.stance.other = { sig: m(0), hip: m(1), yaw: m(2) }; this.flashOk((main === 'orthodox' ? 'Southpaw' : 'Orthodox') + ' learned ✓'); }
      else { this.stance.main = { sig: m(0), hip: m(1), yaw: m(2) }; this.flashOk(main[0].toUpperCase() + main.slice(1) + ' ✓'); }
      this.next();
    } else this.render();
  }
  doneStep() { this.flashOk(this.step().title + ' ✓'); this.waitT = 0.5; }

  // ---------- build the profile ----------
  finish() {
    const T = this.T, c = T.cal; this.solve();
    const templates = { 0: [], 1: [] };
    for (const r of this.reps) for (const stage of ['early', 'full']) { const f = this.featOf(r, stage); if (f) templates[r.hi].push({ type: r.type, stage, f: f.map(v => +v.toFixed(3)) }); }
    const vs = this.reps.map(r => r.v).sort((a, b) => a - b); const med = vs.length ? vs[Math.floor(vs.length / 2)] : 3;
    const face = c.arms.map(a => a.rel.toArray().map(v => +v.toFixed(3)));
    const so = this.stance.other, sm = this.stance.main; const main = this.stance0();
    const prof = {
      v: 1, date: new Date().toISOString(), reps: this.reps.length, templates,
      vMin: +clamp(0.42 * med, 0.75, 1.8).toFixed(2), peak: +clamp(med * 1.1, 1.8, 7).toFixed(2),
      guard: { face, body: this.bodyGuard ? this.bodyGuard.map(a => a.map(v => +v.toFixed(3))) : null, styles: this.styles ? Object.assign({ high: face }, this.styles) : null },
      torso: { slipL: +(this.torso.slipL || 1).toFixed(2), slipR: +(this.torso.slipR || 1).toFixed(2), duck: +(this.torso.duck || 0.4).toFixed(2), pull: +(this.torso.pull || 0.145).toFixed(3) },
      stance: { main, thr: so && sm ? +clamp(0.35 * Math.min(Math.abs(so.sig), Math.abs(sm.sig)), 0.03, 0.12).toFixed(3) : 0.06, sigMain: sm ? +sm.sig.toFixed(3) : null, sigOther: so ? +so.sig.toFixed(3) : null },
      summary: this.summary(),
    };
    if (so) { c.hipYaw0S = so.hip; c.yaw0S = so.yaw; } if (sm) { c.hipYaw0 = sm.hip; c.yaw0 = sm.yaw; }
    this.prof = prof; this.pmk.setProfile(prof); c.vMin = prof.vMin; c.peak = prof.peak; T.noHeading = false;
    this.renderDone();
  }
  summary() {
    const by = {}; for (const r of this.reps) { const k = r.step; (by[k] = by[k] || []).push(r); }
    return Object.entries(by).map(([k, rs]) => ({ step: k, n: rs.length, speed: +(rs.reduce((a, r) => a + r.v, 0) / rs.length).toFixed(1), reach: Math.round(100 * Math.min(1, rs.reduce((a, r) => a + r.reach, 0) / rs.length)), back: rs.filter(r => r.back != null && r.back < 0.45).length }));
  }
  download() {
    const data = { profile: this.prof, reps: this.reps.map(r => ({ step: r.step, hi: r.hi, v: r.v, reach: r.reach, frames: r.raw.map(q => ({ t: q.t, w: q.world.map(p => [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +(p.visibility ?? 1).toFixed(2)]) })) })), cal: this.T.cal && { frame: this.T.frame, stance0: this.T.cal.stance0 } };
    const json = JSON.stringify(data);
    // inside the claude.ai viewer, files go through its save dialog; everywhere else a normal download
    if (window.claude && window.claude.use) { window.claude.use('downloads').then(dl => dl ? dl.save({ filename: 'NGB_body_sync.json', data: json }).catch(() => {}) : this.plainDownload(json)); return; }
    this.plainDownload(json);
  }
  plainDownload(json) {
    const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'NGB_body_sync.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- UI ----------
  feedback(t) { this.fb = t; this.render(); }
  flashOk(t) { this.pmk.flash(t); }
  render() {
    const st = this.step(), el = $('sync'); if (!st || !el) return; const n = STEPS.length;
    const hand = st.side ? (this.handFor(st.side) === 0 ? 'LEFT hand' : 'RIGHT hand') : '';
    const dots = st.n ? Array.from({ length: st.n }, (_, k) => `<i class="${k < this.count ? 'on' : ''}"></i>`).join('') : '';
    el.innerHTML = `<div class="sy-top"><span class="sy-eb">BODY SYNC · ${this.i + 1}/${n}</span><b>${st.title}</b>${hand ? `<em>${hand}</em>` : ''}${dots ? `<span class="sy-dots">${dots}</span>` : ''}</div>
      <div class="sy-say">${this.demoT > 0 ? 'WATCH — then your turn' : st.say}</div>${this.msg && !st.type ? `<div class="sy-msg">${this.msg}</div>` : ''}
      ${this.fb ? `<div class="sy-fb">${this.fb}</div>` : ''}${st.tip ? `<div class="sy-tip">Coach: ${st.tip}</div>` : ''}
      <div class="sy-row"><button class="pill" id="syRedo">REDO</button><button class="pill" id="sySkip">SKIP</button><button class="pill" id="syExit">EXIT</button></div>`;
    $('syRedo').onclick = () => this.redo(); $('sySkip').onclick = () => this.skip(); $('syExit').onclick = () => this.exit(false);
  }
  renderDone() {
    const el = $('sync'), p = this.prof; const nm = id => { const q = STEPS.find(x => x.id === id); return q ? q.title.toLowerCase() : id; }; const rows = p.summary.map(s => `<tr><td>${nm(s.step)}</td><td>${s.n}</td><td>${s.speed} m/s</td><td>${s.reach}%</td><td>${s.back}/${s.n}</td></tr>`).join('');
    el.innerHTML = `<div class="sy-top"><span class="sy-eb">BODY SYNC COMPLETE</span><b>The game knows your hands now</b></div>
      <div class="sy-say">${p.reps} punches learned · your trigger speed ${p.vMin} m/s · stance ${p.stance.main}${p.stance.sigOther != null ? ' + switch' : ''} · guard: face${p.guard.body ? ' + body' : ''}${p.guard.styles ? ' + ' + (Object.keys(p.guard.styles).length - 1) + ' shells' : ''}</div>
      <table class="sy-tab"><tr><th>move</th><th>reps</th><th>speed</th><th>reach</th><th>back to chin fast</th></tr>${rows}</table>
      <div class="sy-tip">Coach: the punches that didn't come back fast are the ones you get countered on. Re-sync any time your camera spot changes a lot.</div>
      <div class="sy-row"><button class="go" id="syPlay">SAVE & SPAR</button><button class="pill" id="syDl">DOWNLOAD MY SYNC DATA</button><button class="pill" id="syAgain">DO IT AGAIN</button></div>`;
    $('syPlay').onclick = () => { this.exit(true); this.g.startBodyCamp && this.g.startBodyCamp(); };
    $('syDl').onclick = () => this.download(); $('syAgain').onclick = () => { this.exit(true); this.begin(); };
  }
}
