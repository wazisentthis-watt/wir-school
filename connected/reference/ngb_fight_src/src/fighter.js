// Fighter: mocap layers + procedural body layer + foot/arm IK + skeleton-driven strike paths.
import * as THREE from 'three';
import { buildSkeleton, createFighterMesh } from './rig.js';
import { solveTwoBone, rotateBoneWorld, aimBone } from './anim.js';
import { guardPose, activeGuard } from './guards.js';
import { balanceUpdate, pivotQuality, switchQuality, stumble, skill } from './balance.js';
import { STRIKES, heavyDef, strikeFor } from './combat.js';
import { GloveState, RECIPES } from './gloves.js';

const UP = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _ax = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));

export const FORMS = { light: { name: 'LIGHT', move: 1.15, speed: 1.1, power: 0.87, taken: 1.1, regen: 1.06 }, mid: { name: 'MIDDLE', move: 1, speed: 1, power: 1, taken: 1, regen: 1 }, dense: { name: 'DENSE', move: 0.86, speed: 0.93, power: 1.16, taken: 0.86, regen: 0.9 } };

class Spring3 { constructor(k = 140, c = 13) { this.x = new THREE.Vector3(); this.v = new THREE.Vector3(); this.k = k; this.c = c; }
  step(dt) { const a = this.x.clone().multiplyScalar(-this.k).addScaledVector(this.v, -this.c); this.v.addScaledVector(a, dt); this.x.addScaledVector(this.v, dt); const m = this.x.length(); if (m > 0.9) this.x.multiplyScalar(0.9 / m); }
  kick(v) { this.v.add(v); } }

export class Fighter {
  constructor(game, spec, opts = {}) {
    this.game = game; this.spec = spec; this.lib = game.lib; this.id = opts.id || spec.id; this.side = opts.side || 0;
    this.scale = opts.scale || 1;
    this.skel = buildSkeleton(game.data, this.scale);
    this.mesh = createFighterMesh(this.skel, spec);
    this.root = this.skel.root; this.root.add(this.mesh.group);
    this.B = this.skel.bones;
    this.pos = new THREE.Vector3(opts.x || 0, 0, opts.z || 0); this.yaw = opts.yaw || 0; this.vel = new THREE.Vector3();
    this.pose = this.lib.newPose(); this.pose2 = this.lib.newPose();
    this.baseT = Math.random() * 2.5;
    this.loadout = opts.loadout || [['glaze', 'caramel', 'pressure'], ['steam', 'crema', 'roux']];
    this.prep = opts.prep || [0.8, 0.8];
    this.gloves = [new GloveState('L', this.loadout[0], this.prep[0]), new GloveState('R', this.loadout[1], this.prep[1])];
    this.cfgGlove = 0;
    this.headSpring = new Spring3(150, 12); this.spineSpring = new Spring3(110, 12); this.armKick = [new Spring3(160, 16), new Spring3(160, 16)];
    // glove centre offsets in hand-local space
    this.gloveLocal = {};
    for (const s of ['Left', 'Right']) {
      const h = this.B[s + 'Hand']; const sx = s === 'Left' ? 1 : -1;
      const wq = h.getWorldQuaternion(new THREE.Quaternion());
      this.gloveLocal[s] = new THREE.Vector3(0.095 * sx * this.scale, -0.004, 0.008).applyQuaternion(wq.invert());
      const fa = this.B[s + 'ForeArm']; const hp = h.position; const ax = Math.abs(hp.x) > Math.abs(hp.y) ? (Math.abs(hp.x) > Math.abs(hp.z) ? 'x' : 'z') : (Math.abs(hp.y) > Math.abs(hp.z) ? 'y' : 'z');
      this.gloveLocal[s + 'Axis'] = ax;
    }
    this.armLen = this.B.LeftArm.position.length() * 0 + (this.B.LeftForeArm.position.length() + this.B.LeftHand.position.length()) + 0.095 * this.scale;
    this.vol = { head: { a: new THREE.Vector3(), r: 0.118 * this.scale, part: 'head' }, chest: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.155 * this.scale, part: 'chest' }, abdo: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.15 * this.scale, part: 'body' },
      gloveL: { a: new THREE.Vector3(), r: 0.09, block: true, part: 'gloveL' }, gloveR: { a: new THREE.Vector3(), r: 0.09, block: true, part: 'gloveR' },
      armL: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.052, block: true, part: 'armL' }, armR: { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.052, block: true, part: 'armR' } };
    this.glovePrev = [new THREE.Vector3(), new THREE.Vector3()]; this.gloveNow = [new THREE.Vector3(), new THREE.Vector3()];
    this.reset(true);
  }

  reset(full) {
    if (full) { this.health = 100; this.knockdowns = 0; this.stats = { thrown: 0, landed: 0, clean: 0, blocked: 0, missed: 0, counters: 0, headLanded: 0, bodyLanded: 0, dmgDealt: 0, recipes: 0, recipeFails: 0, reactions: 0, byStrike: {} }; this.roundStats = { landed: 0, dmg: 0, kd: 0 }; }
    this.stamina = 100; this.daze = 0; this.bodyDmg = full ? 0 : this.bodyDmg * 0.7; this.roundKD = 0;
    this.state = 'idle'; this.stateT = 0; this.action = null; this.strike = null; this.queued = null; this.roll = null;
    this.intent = { move: new THREE.Vector2(), weave: 0, guard: null, duck: 0, pull: 0, clinch: false, handGuard: [false, false], guardAim: [0, 0] };
    this.stance = this.stance || this.baseStance || 'orthodox'; this.footOffset = [0, 0]; this.scoot = [0, 0]; this.pivot = null; this.handGuardAmt = [0, 0]; this.powerRecover = 0; this.queuedAnalog = null; this.hipYawRate = 0; this._hipYaw = null; this.fouls = this.fouls || 0;
    this.stunT = 0; this.duckK = 0; this.pullK = 0; this.clinch = null; this.footSys = null; this.dashT = 0; this.snareT = 0; this.flashT = 0; this.escape = 0; if (full) this.attrXP = {};
    this.weaveX = 0; this.guardHigh = 0; this.guardLow = 0; this.guardHeld = null; this.guardPressedAt = -9; this.camStyle = null; this.guardStyle = this.guardStyle || 'high'; this.switching = null; this.pivotStep = null; this.bal = null; this.reSquareT = 0;
    this.breathPause = 0; this.stagger = 0; this.offBalance = 0; this.coatT = 0; this.obscured = 0; this.counterWindow = 0; this.slip = 0;
    this.kneel = 0; this.kneelTarget = 0; this.prone = 0; this.proneTarget = 0; this.winning = false; this.winPose = 0; this.shiftFx = 0; if (full) { this.focus = 30; this.form = this.baseForm || 0; this.formK = this.form; } else this.focus = Math.max(this.focus || 0, 30); this.hipsBias = new THREE.Vector2(); this.feint = 0; this.lastHitT = -9; this.downInfo = null; this.focusT = 0; this.stretch = [0, 0];
    this.pp = { hx: 0, hy: 0, hz: 0, side: 0, fwd: 0, twist: 0, hipTwist: 0 };
    this.headSpring.x.set(0, 0, 0); this.headSpring.v.set(0, 0, 0); this.spineSpring.x.set(0, 0, 0); this.spineSpring.v.set(0, 0, 0);
  }

  get opp() { return this.game.opponentOf(this); }
  attrK(n) { const r = this.attr ? this.attr[n] : 70; return Math.max(0, Math.min(1, ((r ?? 70) - 50) / 49)); }
  xp(n, v) { if (this.trackXP) this.attrXP[n] = (this.attrXP[n] || 0) + v; }
  get stunK() { return Math.min(1, this.stunT / 0.7); }
  get canAct() { return (this.state === 'idle' || this.state === 'strike') && this.stagger <= 0 && this.offBalance <= 0 && !this.game.frozen; }
  get forward() { return _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).clone(); }
  toWorld(local, out = new THREE.Vector3()) { return out.copy(local).applyAxisAngle(UP, this.yaw).add(this.pos); }
  toLocal(world, out = new THREE.Vector3()) { return out.copy(world).sub(this.pos).applyAxisAngle(UP, -this.yaw); }
  dirWorld(local, out = new THREE.Vector3()) { return out.copy(local).applyAxisAngle(UP, this.yaw); }

  // ---------- commands ----------
  requestStrike(name, heavy = false) {
    if (this.state !== 'idle' && this.state !== 'strike') return false;
    if (this.clinch) { const hi0 = STRIKES[name] && STRIKES[name].hand === 'L' ? 0 : 1; if (this.clinch.role === 'holder' && (!this.clinch.holds || this.clinch.holds[hi0])) return false; heavy = false; this.game.foulCheck(this, 'holding'); }
    if (name === 'upper') name = (this.lastHand === 'R' && this.game.time - (this.lastStrikeT || -9) < 0.9) ? 'upperL' : 'upperR';
    const def = STRIKES[name]; if (!def) return false;
    if (this.strike) { // buffer for combos once past impact
      const s = this.strike; if (s.t > s.def.impact * 0.75 || s.contact) { this.queued = name; this.queuedHeavy = heavy; return true; } return false; }
    if (!this.canAct) { if (this.state === 'idle' && this.stagger < 0.15 && this.offBalance < 0.15) { this.queued = name; this.queuedHeavy = heavy; return true; } return false; }
    if (this.stamina < def.stam * (heavy ? 0.9 : 0.5)) { this.game.onEvent(this, 'gassed'); return false; }
    this.startStrike(name, heavy); return true;
  }
  startStrike(name, heavy = false, opts = {}) {
    const def = heavy ? heavyDef(STRIKES[name], this.attrK('balance')) : STRIKES[name]; const hand = def.hand; const hi = hand === 'L' ? 0 : 1; const g = this.gloves[hi];
    const s = { name, heavy, def, t: 0, hand, hi, sx: hand === 'L' ? 1 : -1, contact: null, checked: false, target: null, startLocal: this.toLocal(this.gloveNow[hi]), endW: new THREE.Vector3(), cur: new THREE.Vector3(), lunged: 0, speed: 1, reachBonus: 0, powerMul: 1, recipe: null, wasMiss: false };
    // stamina & modifiers
    const tired = this.stamina < 25 ? 0.82 : 1;
    s.speed = this.fm.speed * (1 + 0.1 * this.attrK('hands')) * (this.stunT > 0 ? 0.8 : 1) * (this.focusT > 0 ? 1.18 : 1) * (this.coatT > 0 ? 0.8 : 1) * tired * (g.caramelSet > 0 ? 0.9 : 1) * (this.game.speedMul ? this.game.speedMul(this) : 1);
    s.powerMul = this.fm.power * (1 + 0.06 * this.attrK('power') + (heavy ? 0.25 * this.attrK('power') : 0)) * (this.clinch ? 0.5 : 1) * (this.stamina < 20 ? 0.7 : 1) * (g.caramelSet > 0 ? 1.25 : 1) * (this.game.powerMul ? this.game.powerMul(this) : 1);
    if (g.primed) { s.recipe = g.primed; if (g.primed === 'pressure') { if (g.stability < 25) { s.backfire = true; } else { s.reachBonus = 0.2; s.powerMul *= 1.45; } } }
    this.stamina -= def.stam * (this.perks ? this.perks.stamCost : 1); this.stats.thrown++; this.stats.byStrike[name] = this.stats.byStrike[name] || { t: 0, l: 0 }; this.stats.byStrike[name].t++;
    g.heat = Math.min(100, g.heat + 2.2);
    this.strike = s; this.state = 'strike'; this.lastHand = hand; this.lastStrikeT = this.game.time; this.queued = null;
    if (def.clip && !opts.noClip) { const k = def.clipT / def.impact; this.playAction(def.clip, { speed: k * s.speed, w: 0.8, fadeIn: 0.05, fadeOut: 0.15, maxT: def.end * k }); }
    this.game.onEvent(this, 'throw', s);
    if (s.backfire) { this.game.onEvent(this, 'backfire', s); }
  }
  setGuard(g) { if (g && g !== this.guardHeld) this.guardPressedAt = this.game.time; this.guardHeld = g; }
  startPivot(side) {
    // pivot point: the planted foot on that side (lead foot for a normal pivot), or just in front of you if the feet aren't planted yet
    // you turn on the front foot and swing the body around it — measured from him, that walks you off his centre line onto his flank
    // how good is it? weight on the pivot foot, balance margin, what your hands are doing, momentum, legs, skill (see balance.js)
    if (this.switching || (this.bal && this.bal.stumbleT > 0)) return false;
    const pq = pivotQuality(this, side); const clean = pq.q >= 0.66, ok = pq.q >= 0.42; const sk = skill(this);
    const o0 = this.opp; const c = o0 ? this.pos.clone().lerp(o0.pos, 0.6).setY(0) : this.pos.clone().add(this.forward.multiplyScalar(0.3));
    const total = clean ? 1.3 : ok ? 0.8 : 0.45, dur = (clean ? 0.24 : ok ? 0.31 : 0.28) * (1.1 - 0.2 * sk);
    this.pivotStep = { t: 0, dur, dir: side === 'left' ? -1 : 1, total, c, clean, ok, why: pq.why }; this.pivotEndT = this.game.time + dur; this.stamina -= clean ? 1 : 1.6; this.lastPivotT = this.game.time;
    const o = this.opp; if (o) o.lostYouT = Math.max(o.lostYouT || 0, clean ? 0.55 * (1 + 0.4 * this.attrK('agility')) : ok ? 0.2 : 0);
    if (!ok) { const tan = this.forward.clone().applyAxisAngle(UP, side === 'left' ? Math.PI / 2 : -Math.PI / 2).setY(0).normalize(); this.pivotStep.fail = tan; }
    else if (!clean) this.offBalance = Math.max(this.offBalance, 0.1);
    this.xp('agility', clean ? 2 : 0.7); this.xp('balance', clean ? 1.5 : 0.5);
    this.game.onEvent && this.game.onEvent(this, 'pivot', { side, q: pq.q, clean, ok, why: pq.why }); return true;
  }
  startRoll(dir) { if (!this.canAct || this.strike || this.roll) return false; if (this.stamina < 3) return false; this.roll = { t: 0, dir, dur: 0.52 * (1 - 0.2 * this.attrK('agility')) }; this.lastRollT = this.game.time; this.stamina -= 3.5; this.game.onEvent(this, 'roll', dir); return true; }
  playAction(clip, o = {}) { const c = this.lib.clips[clip]; this.action = { clip: c, t: o.start || 0, speed: o.speed || 1, w: 0, wMax: o.w ?? 1, fadeIn: o.fadeIn ?? 0.12, fadeOut: o.fadeOut ?? 0.2, rm: o.rm || 0, maxT: o.maxT || null, age: 0, hold: !!o.hold, onEnd: o.onEnd || null }; }

  // ---------- analog boxing ----------
  strikeName(hand, type) { return strikeFor(hand, type, this.stance); }
  throwAnalog(hand, type, power, stick, flick) {
    if (this.camBody && this.camBody.own[hand] > 0.5) return false; // that hand belongs to your body right now
    if (this.state !== 'idle' && this.state !== 'strike') return false;
    if (this.clinch && this.clinch.role === 'holder' && (!this.clinch.holds || this.clinch.holds[hand])) return false;
    if (this.clinch) power = false;
    const name = this.strikeName(hand, type);
    if (this.strike) { const s = this.strike; if (s.t > s.def.impact * 0.75 || s.contact) { if (s.analog && s.hi === hand) s.hold = false; this.queuedAnalog = { hand, type, power, stick, flick }; return true; } return false; }
    if (!this.canAct) return false;
    const def0 = STRIKES[name]; if (this.stamina < def0.stam * (power ? 0.9 : 0.4)) { this.game.onEvent(this, 'gassed'); return false; }
    this.startStrike(name, power); const s = this.strike; if (!s) return false;
    s.analog = true; s.hold = true; s.stick = stick.slice(); s.holdT = 0; s.type = type;
    s.aimLocal = this.game.analogAim(this, s, stick);
    s.speed *= 0.9 + 0.035 * Math.min(flick, 6);
    if (power) { if (this.powerRecover > 0) { s.powerMul *= 0.65; s.unbalanced = true; } this.powerRecover = 0.55 * (1 - 0.35 * this.attrK('balance')) + s.def.end / s.speed; }
    if (this.clinch) { s.dirty = true; s.powerMul *= 0.55; s.speed *= 1.1; this.game.foulCheck(this, 'holding'); }
    return true;
  }
  // camera body strike: your real glove path, your real speed. The game still decides contact.
  throwBody(hand, type, heavy, kin = 0.8) {
    if (this.state !== 'idle' && this.state !== 'strike') return false;
    if (this.clinch && this.clinch.role === 'holder' && (!this.clinch.holds || this.clinch.holds[hand])) return false;
    if (this.clinch) heavy = false;
    if (this.strike) { const s = this.strike; const cbo = this.camBody && this.camBody.hands[s.hi];
      const done = s.body && (s.bodyPhase === 'back' || s.contact || (cbo && cbo.phase !== 'out') || s.t >= s.def.impact - 1e-3 && s.hi !== hand);
      if (done || (!s.body && (s.t > s.def.impact * 0.75 || s.contact))) this.finishStrike(); else return false; }
    if (!this.canAct) return false;
    const name = this.strikeName(hand, type); const def0 = STRIKES[name];
    if (this.stamina < def0.stam * (heavy ? 0.9 : 0.4)) { this.game.onEvent(this, 'gassed'); return false; }
    this.startStrike(name, heavy, { noClip: true }); const s = this.strike; if (!s) return false;
    s.body = true; s.analog = true; s.hold = false; s.holdT = 0; s.type = type; s.bodyPhase = 'out'; s.stick = [0, 0]; s.live = true; s.camSpeed = 0;
    s.aimLocal = this.game.analogAim(this, s, [0, -1]);
    s.powerMul *= clamp(0.72 + 0.32 * kin, 0.7, 1.16);
    if (heavy) { if (this.powerRecover > 0) { s.powerMul *= 0.65; s.unbalanced = true; } this.powerRecover = 0.55 * (1 - 0.35 * this.attrK('balance')) + s.def.end / s.speed; }
    if (this.clinch) { s.dirty = true; s.powerMul *= 0.55; this.game.foulCheck(this, 'holding'); }
    return true;
  }
  // the camera saw more of the path: same punch, better name (only before it lands)
  reclassBody(hand, type) {
    const s = this.strike; if (!s || !s.body || s.hi !== hand || s.contact) return false;
    const name = this.strikeName(hand, type); if (name === s.name) return false;
    const st = this.stats.byStrike; if (st[s.name]) st[s.name].t = Math.max(0, st[s.name].t - 1); st[name] = st[name] || { t: 0, l: 0 }; st[name].t++;
    const keepMul = s.powerMul / (s.def.power ? 1 : 1); s.name = name; s.def = s.heavy ? heavyDef(STRIKES[name], this.attrK('balance')) : STRIKES[name]; s.type = type; s.powerMul = keepMul; s.aimLocal = this.game.analogAim(this, s, [0, -1]);
    return true;
  }
  finishStrike() {
    const s = this.strike; if (!s) return; const game = this.game, d = s.def;
    if (!s.contact) { this.stats.missed++; s.wasMiss = true; game.onEvent(this, 'miss', s); const bal = this.attrK('balance'); if (s.unbalanced) { this.offBalance = 0.85; this.vel.addScaledVector(this.forward, 1.2); game.onEvent(this, 'overextend', s); } else if (s.heavy) { this.offBalance = (0.55 + (s.lunged > 0.1 ? 0.25 : 0)) * (1 - 0.6 * bal); this.vel.addScaledVector(this.forward, 0.9 * (1 - bal)); game.onEvent(this, 'overextend', s); } else if (d.path === 'over' || (d.path === 'hook' && s.lunged > 0.12)) { this.offBalance = 0.18 * (1 - 0.6 * bal); } }
    if (s.heavy && this.offBalance <= 0) this.xp('balance', 3);
    this.stretch[s.hi] = 0; this.strike = null; this.state = 'idle';
  }
  // a real switch-step: 'through' = rear foot steps forward past the lead (moves you in), 'drop' = lead foot steps back (moves you out),
  // 'shuffle' = quick hop in place. Default: from where your left stick / steps are going. The stance flips halfway, when the feet pass.
  switchStance(kind) {
    if ((this.state !== 'idle' && this.state !== 'strike') || this.strike || this.clinch || this.switching || this.pivotStep || (this.bal && this.bal.stumbleT > 0)) return false;
    if (!kind) { const m = this.intent.move; kind = m.y > 0.35 ? 'through' : m.y < -0.35 ? 'drop' : 'shuffle'; }
    const sq = switchQuality(this, kind); const sk = skill(this);
    const dur = { through: 0.36, drop: 0.32, shuffle: 0.24 }[kind] * (1.15 - 0.3 * sk) * (sq.q < 0.45 ? 1.25 : 1);
    this.switching = { kind, t: 0, dur, q: sq.q, why: sq.why, flipped: false }; this.stamina -= 1.5;
    this.game.onEvent(this, 'switchStart', this.switching); return true;
  }
  updateSwitch(dt) {
    const sw = this.switching; if (!sw) return; sw.t += dt;
    if (!sw.flipped && sw.t >= sw.dur * 0.5) { sw.flipped = true; this.stance = this.stance === 'southpaw' ? 'orthodox' : 'southpaw'; this.footOffset = [0, 0]; this.switchFx = 0.35; this.game.onEvent(this, 'switchStance', this.stance); }
    if (sw.t >= sw.dur) { this.switching = null; const clean = sw.q >= 0.62, ok = sw.q >= 0.42;
      if (!ok) stumble(this, this.forward.clone().multiplyScalar(sw.kind === 'drop' ? -1 : 1).setY(0).normalize(), 0.5, sw.why[0] ? 'switch: ' + sw.why[0] : 'tangled the switch');
      else if (!clean) this.offBalance = Math.max(this.offBalance, 0.14);
      this.xp('balance', clean ? 2 : ok ? 1 : 0.5); this.game.onEvent(this, 'switchDone', { q: sw.q, clean, ok, why: sw.why, kind: sw.kind }); }
  }
  restGuard(hi) { const sx = hi === 0 ? 1 : -1; const hc = this.vol.head.a; return hc.clone().add(this.dirWorld(new THREE.Vector3(0.1 * sx, -0.09, 0.2))); }
  // ---------- Weightshift (Savannah's evolving recipe) ----------
  get fm() { return this.form < 0 ? FORMS.light : this.form > 0 ? FORMS.dense : FORMS.mid; }
  get canShift() { return !!this.spec.weightshift && this.game.settings.rules === 'exhibition' && this.game.mode !== 'forge'; }
  weightShift(dir) {
    if (!this.canShift) { this.game.onEvent(this, 'shiftDenied'); return false; }
    const t = Math.max(-1, Math.min(1, this.form + dir)); if (t === this.form) return false;
    if (this.state !== 'idle' || this.strike) return false;
    if (this.focus < 30 || this.stamina < 12) { this.game.onEvent(this, 'shiftCost'); return false; }
    this.focus -= 30; this.stamina -= 12; this.form = t; this.shiftFx = 0.7; this.stats.shifts = (this.stats.shifts || 0) + 1;
    this.game.onEvent(this, 'weightshift', t); return true;
  }
  // ---------- recipes ----------
  cycleRecipe() { const g = this.gloves[this.cfgGlove]; if (g.cooking) return; g.cycle(); this.game.onEvent(this, 'recipeSel', g); }
  switchGlove() { this.cfgGlove = 1 - this.cfgGlove; this.game.onEvent(this, 'gloveSel', this.gloves[this.cfgGlove]); }
  activateRecipe(hi = this.cfgGlove) {
    const g = this.gloves[hi]; const r = g.recipe; if (g.cooking || (g.primed && r.mode === 'prime')) return false;
    if (this.state !== 'idle' && this.state !== 'strike') return false;
    g.cooking = { id: r.id, t: 0 }; this.game.onEvent(this, 'cookStart', { g, r });
    if (r.mode === 'instant') this.finishCook(g);
    return true;
  }
  finishCook(g) {
    const r = RECIPES[g.cooking.id]; g.cooking = null; const game = this.game;
    const fail = (why) => { g.stability = Math.max(0, g.stability - 12); this.stats.recipeFails++; game.onEvent(this, 'recipeFail', { g, r, why }); };
    const q = g.prep; // prep quality from the kitchen
    if (r.heat && (g.heat < r.heat[0] || g.heat > r.heat[1])) { return fail(g.heat < r.heat[0] ? 'too cold — it never sets' : 'scorched — sugars burnt'); }
    if (r.needMoist && g.moisture < r.needMoist) return fail('chamber too dry');
    if (r.needPressure && g.pressure < r.needPressure) return fail('not enough pressure');
    if (g.stability < 18 && Math.random() > q) return fail('unstable chamber');
    g.lastUse = game.time; this.stats.recipes++; g.flash = 0.6;
    if (r.mode === 'prime') { g.primed = r.id; g.moisture = Math.max(0, g.moisture - (r.moisture || 0)); if (r.id === 'pressure') g.pressure = Math.max(0, g.pressure - 35); }
    else if (r.id === 'steam') { g.moisture -= 25; g.heat = Math.min(100, g.heat + 15); g.stability -= 10; this.opp.obscured = 2.5 * (0.7 + q * 0.4); g.buffs.steam = 3; game.fx.steamBurst(this.gloveNow[g.side === 'L' ? 0 : 1], 1.4); }
    else if (r.id === 'crema') { g.moisture -= 10; g.heat = Math.min(100, g.heat + 10); this.focusT = 4 * (0.7 + q * 0.4); g.buffs.crema = this.focusT; }
    else if (r.id === 'roux') { g.moisture -= 15; g.buffs.roux = 4 * (0.7 + q * 0.4); }
    else if (r.id === 'trail') { g.moisture -= 8; g.heat = Math.min(100, g.heat + 8); const m = this.intent.move; let dir = m.lengthSq() > 0.05 ? new THREE.Vector3(m.x, 0, m.y).normalize() : new THREE.Vector3(Math.random() > 0.5 ? 1 : -1, 0, 0); this.vel.add(this.dirWorld(dir).multiplyScalar(3.6 * (0.8 + q * 0.3))); this.dashT = 0.32; game.fx.dashTrail && game.fx.dashTrail(this); }
    else if (r.id === 'burner') { g.heat = Math.max(0, g.heat - 30); const o = this.opp; game.addBurner(o.pos.x, o.pos.z, this); }
    else if (r.id === 'syrup') { g.moisture -= 15; const o = this.opp; const d = o.pos.distanceTo(this.pos); game.fx.syrupStrand && game.fx.syrupStrand(this.gloveNow[g.side === 'L' ? 0 : 1], o.vol.chest.a); if (d < 2.4) { o.vel.add(this.pos.clone().sub(o.pos).setY(0).normalize().multiplyScalar(1.5)); o.snareT = 2.5 * (0.7 + q * 0.4); } }
    game.onEvent(this, 'recipeOk', { g, r });
    game.checkReactions(this, g, r.id);
  }

  // ---------- hits ----------
  takeHit(h) {
    // h: {dmg, part, dir(world), kind:'clean'|'glance'|'block', strike, counter, attacker}
    const dl = this.toLocal(_v.copy(this.pos).add(h.dir)).normalize();
    this.lastHitT = this.game.time;
    const s = h.dmg * this.fm.taken * (this.perks ? this.perks.taken : 1);
    if (h.kind === 'block') {
      const hi = h.part === 'gloveL' || h.part === 'armL' ? 0 : 1;
      this.armKick[hi].kick(new THREE.Vector3(dl.x * 0.8, 0.2, dl.z * 1.6).multiplyScalar(s * 0.12));
      this.headSpring.kick(_ax.crossVectors(UP, dl).multiplyScalar(s * 0.05));
      this.vel.addScaledVector(h.dir, 0.08 * s);
      this.stamina -= s * 0.35; this.health -= h.chip; return;
    }
    const mult = h.kind === 'glance' ? 0.45 : 1;
    if (h.part === 'head') {
      const ax = _ax.crossVectors(UP, dl).normalize();
      this.headSpring.kick(ax.clone().multiplyScalar(s * 0.30 * mult));
      if (h.strike && h.strike.def.path === 'upper') this.headSpring.kick(new THREE.Vector3(-s * 0.22, 0, 0));
      this.spineSpring.kick(ax.multiplyScalar(s * 0.07 * mult));
      const d0 = this.daze; this.daze += s * 1.45 * mult * (1 - 0.3 * this.attrK('chin')) * (this.stamina < 30 ? 1.3 : 1) * (h.counter ? 1.4 : 1) * (this.health < 40 ? 1.3 : 1);
      if (this.daze > 68 && d0 <= 68) this.stunT = Math.max(this.stunT, 1.5 + (this.daze - 68) / 25);
      if (h.kind === 'clean' && h.strike && h.strike.heavy) this.stunT += 0.75;
      this.xp('chin', s * 0.4 * mult);
    } else {
      this.spineSpring.kick(new THREE.Vector3(s * 0.11 * mult, 0, 0)); // fold forward
      this.bodyDmg += s * 1.1 * mult; this.stamina -= s * 1.3 * mult; this.breathPause = 1.3;
      this.guardHigh *= 0.6;
      this.daze += s * 0.6 * mult;
    }
    this.vel.addScaledVector(h.dir, (0.12 + 0.03 * s) * mult * (1 - 0.3 * this.attrK('balance')) * (h.strike && h.strike.heavy ? 1.6 : 1));
    this.health -= s * mult; this.flashT = 0.16 * mult + 0.02;
    if (this.strike && h.kind === 'clean' && s > 7) { this.strike = null; this.state = 'idle'; this.queued = null; } // interrupted
    // heavy reactions
    if (h.kind === 'clean' && (s > 11 || (h.counter && s > 7))) {
      if (h.part === 'head') { const up = h.strike && h.strike.def.path === 'upper'; this.playAction(up ? 'hitUpper' : 'hitHead', { w: 0.75, speed: up ? 1.1 : 1.35, fadeIn: 0.04, fadeOut: 0.3, maxT: up ? 0.9 : 0.85 }); this.stagger = 0.35 + s * 0.012; }
      else { this.stagger = 0.3 + s * 0.01; }
    }
  }

  // ---------- update ----------
  update(dt) {
    const game = this.game, lib = this.lib, B = this.B;
    this.stateT += dt;
    // timers
    this.stagger = Math.max(0, this.stagger - dt); this.offBalance = Math.max(0, this.offBalance - dt); this.breathPause = Math.max(0, this.breathPause - dt);
    this.coatT = Math.max(0, this.coatT - dt); this.obscured = Math.max(0, this.obscured - dt); this.counterWindow = Math.max(0, this.counterWindow - dt); this.focusT = Math.max(0, this.focusT - dt);
    this.slip = Math.max(0, this.slip - dt); this.feint = Math.max(0, this.feint - dt); this.dashT = Math.max(0, this.dashT - dt); this.clinchCD = Math.max(0, (this.clinchCD || 0) - dt); this.powerRecover = Math.max(0, this.powerRecover - dt); this.switchFx = Math.max(0, (this.switchFx || 0) - dt); this.snareT = Math.max(0, this.snareT - dt); this.flashT = Math.max(0, this.flashT - dt);
    this.stunT = Math.max(0, this.stunT - dt * (this.clinch && this.clinch.role === 'holder' ? 3 : 1) * (this.daze < 40 ? 2 : 1));
    if (this.clinch && this.clinch.role === 'holder') { this.daze = Math.max(0, this.daze - dt * 14); this.stamina = Math.min(100, this.stamina + dt * 10); }
    if (this.reaction) { this.reaction.t -= dt; if (this.reaction.t <= 0) this.reaction = null; }
    if (game.time - this.lastHitT > 1.4) this.daze = Math.max(0, this.daze - dt * (5 + this.stamina * 0.05));
    if (this.state === 'idle' || this.state === 'strike') {
      const moving = this.intent.move.lengthSq() > 0.01;
      const regen = this.breathPause > 0 ? 0 : this.fm.regen * (1 + 0.25 * this.attrK('engine')) * (this.strike ? 2 : moving ? 6 : 9) * (1 - Math.min(0.6, this.bodyDmg / 160)) * (activeGuard(this) === 'cross' ? 1.4 : this.guardHeld ? 0.6 : 1); // Archie Moore rested inside the crossed arms
      this.stamina = Math.min(100 - Math.min(35, this.bodyDmg * 0.25), this.stamina + regen * dt);
    }
    this.stamina = Math.max(0, this.stamina);
    // gloves
    const env = game.gloveEnv(this);
    this.gloves.forEach((g, i) => { g.update(dt, env); g.caramelSet = Math.max(0, g.caramelSet); if (g.cooking && g.cooking.t >= RECIPES[g.cooking.id].cook) this.finishCook(g); });

    // ---------- locomotion ----------
    const opp = this.opp;
    const toOpp = _v2.copy(opp.pos).sub(this.pos); toOpp.y = 0; const dist = toOpp.length();
    const wantYaw = Math.atan2(toOpp.x, toOpp.z);
    let dy = wantYaw - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    this.lostYouT = Math.max(0, (this.lostYouT || 0) - dt);
    if (this.state !== 'down' && this.state !== 'ko' && !this.pivotStep) { const ad = Math.abs(dy);
      this.reSquareT = ad > 0.45 ? this.reSquareT + dt : 0;
      if (ad <= 0.45) this.yaw += dy * (1 - Math.exp(-(this.lostYouT > 0 ? 2 : this.strike ? 5 : 8) * dt));
      else { const react = 0.12 + 0.16 * (1 - this.attrK('agility')) + (this.daze > 50 ? 0.15 : 0) + (this.lostYouT > 0 ? 0.15 : 0);
        const w = this.reSquareT < react ? 0.8 : (3.0 + 3.0 * this.attrK('agility')) * (this.strike ? 0.35 : 1) * (this.lostYouT > 0 ? 0.4 : 1) * (this.stamina < 20 ? 0.7 : 1) * (this.offBalance > 0 ? 0.5 : 1);
        this.yaw += Math.sign(dy) * Math.min(ad - 0.4, w * dt); } }
    let mv = new THREE.Vector3();
    const traction = game.traction(this);
    { // A/B stance shaping and X/Y pivots (analog controller)
      const rear = this.stance === 'southpaw' ? 0 : 1; const fo = this.footOffset;
      if (this.scoot[0]) fo[rear] = Math.max(-0.2, fo[rear] - 0.35 * dt);
      if (this.scoot[1]) fo[1] = Math.min(0.16, fo[1] + 0.35 * dt);
      if (!this.scoot[0] && !this.scoot[1]) { fo[0] *= Math.exp(-0.25 * dt); fo[1] *= Math.exp(-0.25 * dt); }
      // pivots: a PRESS is a real pivot step — about 70° around your planted front foot in a quarter second, and he loses you for a beat
      // (that's the angle); HOLDING keeps turning slowly after the step
      const canPiv = (this.state === 'idle' || this.state === 'strike') && !this.clinch && this.stagger <= 0;
      if (this.pivot && !this.pivPrev && canPiv && !this.pivotStep) this.startPivot(this.pivot);
      this.pivPrev = this.pivot;
      if (this.pivotStep) { const ps = this.pivotStep; const u0 = Math.min(1, ps.t / ps.dur); ps.t += dt; const u1 = Math.min(1, ps.t / ps.dur); const ease = u => u * u * (3 - 2 * u);
        const ang = ps.dir * ps.total * (ease(u1) - ease(u0)); const rel = this.pos.clone().sub(ps.c).setY(0).applyAxisAngle(UP, ang); this.pos.set(ps.c.x + rel.x, 0, ps.c.z + rel.z); this.yaw += ang; this.lastPivotT = game.time;
        if (u1 >= 1) { const f0 = ps.fail; this.pivotStep = null; if (f0) stumble(this, f0, 0.55, ps.why[0] ? 'pivot: ' + ps.why[0] : 'tangled feet'); } }
      else if (this.pivot && canPiv && game.time - (this.pivotEndT || -9) > 0.15) { this.lastPivotT = game.time; const fs = this.footSys && this.footSys[this.pivot === 'left' ? 0 : 1];
        const c = fs ? fs.planted : this.pos.clone().add(this.forward.multiplyScalar(0.3)); const ang = (this.pivot === 'left' ? -1 : 1) * 1.6 * dt;
        const rel = this.pos.clone().sub(c).setY(0).applyAxisAngle(UP, ang); this.pos.set(c.x + rel.x, 0, c.z + rel.z); this.yaw += ang; this.stamina -= dt * 0.5; }
    }
    if (this.clinch) { mv.set(0, 0, 0); }
    else if ((this.state === 'idle' || this.state === 'strike') && this.stagger <= 0) {
      const m = this.intent.move; const spd = (this.stunT > 0 ? 0.55 : 1) * (this.snareT > 0 ? 0.45 : 1) * this.fm.move * (this.perks ? this.perks.move : 1) * (this.strike ? 0.45 : 1) * (this.stamina < 15 ? 0.7 : 1) * traction * (this.guardHeld ? 0.75 : 1);
      // forward/back along facing, lateral = circle around opponent
      mv.set(m.x * 1.35, 0, m.y * (m.y > 0 ? 1.55 : 1.45)).multiplyScalar(spd);
      if (this.switching) { const sw = this.switching; const u = sw.t / sw.dur; mv.z += (sw.kind === 'through' ? 1.05 : sw.kind === 'drop' ? -0.95 : 0) * Math.sin(Math.PI * clamp(u, 0, 1)) * 1.4; }
      mv = this.dirWorld(mv);
      if (this.stunT > 0) { this.lurchT = (this.lurchT || 0) - dt; if (this.lurchT <= 0) { this.lurchT = 0.35 + Math.random() * 0.5; const a = Math.random() * Math.PI * 2; this.lurch = new THREE.Vector3(Math.cos(a), 0, Math.sin(a) - 0.4).multiplyScalar(0.5 + this.stunK * 0.6); } mv.add(this.dirWorld(this.lurch.clone())); }
    } else if (this.stagger > 0) {
      mv = this.dirWorld(new THREE.Vector3(Math.sin(game.time * 9) * 0.3, 0, -0.5));
    }
    this.mvTarget = mv.clone();
    const accel = this.dashT > 0 ? 1 - Math.exp(-1.5 * dt) : 1 - Math.exp(-(10 * traction + 2) * dt);
    this.vel.x += (mv.x - this.vel.x) * accel; this.vel.z += (mv.z - this.vel.z) * accel;
    if (this.state === 'down' || this.state === 'ko') this.vel.multiplyScalar(Math.exp(-6 * dt));
    this.vel.y = 0; this.pos.addScaledVector(this.vel, dt); this.pos.y = 0;

    // ---------- strike timeline ----------
    const s = this.strike; const pp = { hx: 0, hy: 0, hz: 0, side: 0, fwd: 0, twist: 0, hipTwist: 0 };
    if (s) {
      const d = s.def; const W = d.windup, I = d.impact, E = d.end;
      if (s.body) { // clocked by your real arm: out = windup→impact as you extend; held = frozen at impact; back = recovery runs
        const cb = this.camBody && this.camBody.hands[s.hi];
        if (s.bodyPhase === 'out' && cb && cb.blend > 0.3) { s.t = Math.min(I, Math.max(s.t + dt * 0.6, W + (I - W) * cb.prog)); s.hold = !!cb.extended; if (s.hold) { s.holdT += dt; this.stamina -= dt * 2.5; if (s.holdT > 0.9) this.offBalance = Math.max(this.offBalance, 0.05); } }
        else { s.hold = false; s.t = Math.max(s.t, I) + dt * s.speed * 1.3; }
        s.target = this.toWorld(s.aimLocal); if (s.lungeWant == null) s.lungeWant = d.path === 'straight' ? 0.03 * traction : 0;
      } else s.t += dt * s.speed;
      if (s.analog && !s.body) { // stick-aimed: the target lives in your own body frame — no tracking of the opponent
        s.target = this.toWorld(s.aimLocal); if (s.lungeWant == null) s.lungeWant = (s.heavy ? 0.1 : 0.03) * traction;
        if (s.hold && s.t >= I) { s.t = I; s.holdT += dt; this.stamina -= dt * 2.5; const st = s.stick; s.aimLocal.x += clamp(-st[0], -1, 1) * 0.25 * dt; s.aimLocal.y += clamp(-st[1], -1, 1) * 0.2 * dt; if (s.holdT > 0.9) this.offBalance = Math.max(this.offBalance, 0.05); }
      }
      if (!s.target && s.t >= W * 0.6) {
        s.target = game.strikeTarget(this, s);
        const sh = this.B[s.hand === 'L' ? 'LeftArm' : 'RightArm'].getWorldPosition(new THREE.Vector3());
        const reachK = d.path === 'straight' ? 0.93 : d.path === 'hook' ? 0.86 : d.path === 'over' ? 0.88 : 0.84;
        s.lungeWant = clamp(sh.distanceTo(s.target) - (this.armLen + s.reachBonus) * reachK + 0.04, 0, d.lunge + 0.16) * traction;
      }
      if (s.target && !s.contact && s.t < I) { const live = game.liveTarget(this, s); s.target.lerp(live, 1 - Math.exp(-dt * (this.obscured > 0 ? 1.2 : 3.2))); }
      // lunge (root step)
      if (s.t > W && s.t < I && !s.contact) {
        const want = s.lungeWant || 0; const prog = sm((s.t - W) / (I - W)); const dl = want * prog - s.lunged;
        if (dl > 0) { this.pos.addScaledVector(this.forward, dl); s.lunged += dl; }
      }
      // body envelopes — kinetic chain: hips lead, trunk follows, arm last
      const load = s.t < W ? Math.sin(Math.PI * 0.5 * s.t / W) : 1 - sm((s.t - W) / (I - W));
      const drive = s.t < W ? 0 : s.t < I ? sm((s.t - W) / (I - W)) : 1 - sm((s.t - I) / (E - I));
      const hipDrive = s.t < W ? 0 : s.t < I ? sm((s.t - W) / ((I - W) * 0.7)) : 1 - sm((s.t - I) / (E - I) * 1.2);
      const envK = s.body ? 0.25 : 1;
      pp.hipTwist += envK * d.twist * 0.55 * hipDrive - d.twist * 0.18 * load * (s.t < W ? 1 : 0);
      pp.twist += envK * d.twist * 0.6 * drive - d.twist * 0.22 * (s.t < W ? load : 0);
      if (d.rise) { pp.hy += -d.drop * (s.t < I ? Math.sin(Math.PI * clamp(s.t / I, 0, 1) * 0.9) : 0) + 0.03 * drive; pp.fwd += d.lean * drive; }
      else { pp.hy -= d.drop * Math.max(drive, s.t < W ? load * 0.5 : 0); pp.fwd += d.lean * drive; }
      pp.hz += 0.05 * drive * (d.path === 'straight' ? 1 : 0.5);
      // stretch (noodle snap)
      this.stretch[s.hi] = s.reachBonus > 0 ? s.reachBonus * (s.t < I ? sm((s.t - W) / (I - W)) : 1 - sm((s.t - I) / (E - I))) : 0;
      if (s.t >= E) {
        this.finishStrike();
        if (this.queued && this.canAct) { const q = this.queued, qh = this.queuedHeavy; this.queued = null; this.requestStrike(q, qh); }
      }
    } else if (this.queuedAnalog && this.canAct) { const q = this.queuedAnalog; this.queuedAnalog = null; this.throwAnalog(q.hand, q.type, q.power, q.stick, q.flick); }
    else if (this.queued && this.canAct) { const q = this.queued, qh = this.queuedHeavy; this.queued = null; this.requestStrike(q, qh); }

    // weave / roll
    const wt = this.canAct || this.state === 'strike' ? this.intent.weave : 0;
    this.weaveX = damp(this.weaveX, wt, 11 * (1 + 0.7 * this.attrK('agility')) * (this.stunT > 0 ? 0.6 : 1) * (activeGuard(this) === 'peek' ? 1.35 : 1), dt);
    const agiW = 1 + 0.15 * this.attrK('agility'); pp.hx += 0.11 * agiW * this.weaveX; pp.hy -= 0.07 * Math.abs(this.weaveX); pp.side += 0.34 * agiW * this.weaveX; pp.fwd += 0.10 * Math.abs(this.weaveX);
    if (Math.abs(wt) > 0.5 && this.state === 'idle') this.stamina -= dt * 1.2;
    if (this.roll) {
      const r = this.roll; r.t += dt; const u = clamp(r.t / r.dur, 0, 1); const depth = Math.sin(Math.PI * u); const x = r.dir * (-0.7 + 1.4 * sm(u));
      pp.hy -= 0.24 * depth; pp.fwd += 0.38 * depth; pp.side += 0.24 * x; pp.hx += 0.1 * x;
      if (u >= 1) { this.roll = null; this.weaveX = r.dir * 0.7; }
    }
    // duck (right stick down) and pull (right stick up) — agility sets how fast and deep
    const agi = this.attrK('agility'); const free = this.canAct || this.state === 'strike';
    this.duckK = damp(this.duckK, free ? this.intent.duck || 0 : 0, 10 * (1 + 0.7 * agi), dt); this.pullK = damp(this.pullK, free ? this.intent.pull || 0 : 0, 10 * (1 + 0.7 * agi), dt);
    pp.hy -= (0.2 + 0.04 * agi) * this.duckK; pp.fwd += 0.24 * this.duckK; pp.hz -= 0.11 * this.pullK; pp.fwd -= 0.24 * this.pullK; pp.hy -= 0.02 * this.pullK;
    if (this.duckK + this.pullK > 0.5 && this.state === 'idle') this.stamina -= dt * 1.0;
    // stunned: knees buckle, torso sways, head lolls
    if (this.stunT > 0) { const k = this.stunK, t = game.time; pp.hy -= (0.05 + 0.07 * Math.pow(Math.sin(t * 2.3), 2)) * k; pp.side += 0.14 * Math.sin(t * 1.7) * k; pp.fwd += (0.06 + 0.05 * Math.sin(t * 2.9)) * k; if (Math.random() < dt * 3) this.headSpring.kick(new THREE.Vector3((Math.random() - .5) * 1.4, 0, (Math.random() - .5) * 1.6).multiplyScalar(k)); }
    // over-committed: lurch over the front foot
    if (this.offBalance > 0) { const k = Math.min(1, this.offBalance / 0.3); pp.fwd += 0.22 * k; pp.hy -= 0.05 * k; pp.side += 0.08 * k * Math.sin(this.stateT * 9); }
    // clinch posture: holder leans in, head on the shoulder
    if (this.clinch) { pp.fwd += this.clinch.role === 'holder' ? 0.28 : 0.12; pp.hz += 0.06; pp.side += this.clinch.role === 'holder' ? 0.12 : -0.08; }
    // feint shoulder twitch
    if (this.feint > 0) { const f = Math.sin(Math.PI * this.feint / 0.25); pp.twist += 0.18 * f * this.feintDir; pp.hy -= 0.03 * f; }
    // movement lean
    const lv = this.toLocal(_v.copy(this.pos).add(this.vel)); pp.fwd += lv.z * 0.06; pp.side += lv.x * 0.05;
    // body-shot fold / fatigue
    pp.fwd += Math.min(0.12, this.bodyDmg * 0.0012) + (this.breathPause > 0 ? 0.06 : 0);
    if (this.stamina < 20) pp.hy -= 0.03;
    // kneel (body-shot collapse)
    this.kneel = damp(this.kneel, this.kneelTarget, 3.2, dt); this.winPose = damp(this.winPose || 0, this.winning ? 1 : 0, 4, dt);
    if (this.downInfo && this.downInfo.kind === 'forward' && !this.downInfo.rising && this.stateT > 0.28) this.proneTarget = 1;
    this.prone = damp(this.prone, this.proneTarget, 2.6, dt);
    if (this.kneel > 0.001) { pp.hy -= 0.46 * this.kneel; pp.fwd += 0.55 * this.kneel; pp.hz -= 0.12 * this.kneel; }
    if (this.prone > 0.001) { pp.hy -= 0.36 * this.prone; pp.fwd += 0.3 * this.prone; pp.hz += 0.28 * this.prone; pp.hipPitch = 1.15 * this.prone; }
    this.formK = damp(this.formK ?? 0, this.form || 0, 3.5, dt); this.shiftFx = Math.max(0, this.shiftFx - dt);
    if (this.spec.weightshift) for (const m of Object.values(this.mesh.meshes)) if (m.morphTargetInfluences) { m.morphTargetInfluences[0] = Math.max(0, -this.formK); m.morphTargetInfluences[1] = Math.max(0, this.formK); }
    // your real shoulders and hips (camera): this is what makes the hipYawRate / kinetic chain honest
    if (this.camBody && this.camBody.torsoOwn > 0.01 && (this.canAct || this.state === 'strike')) { pp.twist += this.camBody.torso.twist; pp.hipTwist += this.camBody.torso.hipTwist; }
    this.headSpring.step(dt); this.spineSpring.step(dt); this.armKick.forEach(a => a.step(dt));
    this.pp = pp;

    // ---------- animation layers ----------
    const bounce = (this.state === 'idle' || this.state === 'strike') ? 1 + Math.min(0.5, this.vel.length() * 0.3) - (this.stamina < 25 ? 0.25 : 0) : 1;
    this.baseT += dt * bounce;
    lib.sample(this.stance === 'southpaw' ? 'idleM' : 'idle', this.baseT, this.pose, 0);
    if (this.action) {
      const a = this.action; a.age += dt; a.t += dt * a.speed;
      const dur = a.clip.duration; const lim = a.maxT ? Math.min(a.maxT, dur) : dur;
      const ending = !a.hold && !a.clip.loop && a.age > (lim - (a.start || 0)) / Math.max(0.01, a.speed) - a.fadeOut;
      a.w = ending ? Math.max(0, a.w - dt / a.fadeOut * a.wMax) : Math.min(a.wMax, a.w + dt / a.fadeIn * a.wMax);
      if (a.hold && a.t > dur) a.t = dur;
      lib.sample(a.clip, a.t, this.pose2, a.rm);
      if (a.rm) { this.pose2.h[0] += this.hipsBias.x; this.pose2.h[2] += this.hipsBias.y; }
      lib.blend(this.pose, this.pose2, a.w);
      if (ending && a.w <= 0) { const cb = a.onEnd; this.action = null; if (cb) cb(); }
    }
    // ---------- apply to skeleton ----------
    this.root.position.copy(this.pos); this.root.rotation.set(0, this.yaw, 0);
    lib.apply(this.pose, this.skel, this.scale);
    this.root.updateMatrixWorld(true);
    // capture planted feet
    const feet = ['Left', 'Right'].map(sd => ({ sd, p: B[sd + 'Foot'].getWorldPosition(new THREE.Vector3()), q: B[sd + 'Foot'].getWorldQuaternion(new THREE.Quaternion()) }));
    const canStep = (this.state === 'idle' || this.state === 'strike') && this.kneel < 0.01 && !(this.action && this.action.rm) && this.winPose < 0.3;
    if (canStep) this.stepFeet(feet, dt); else this.footSys = null;
    this.updateSwitch(dt);
    if (this.state === 'idle' || this.state === 'strike') balanceUpdate(this, dt, this.mvTarget);
    if (this.kneel > 0.01) { // procedural kneel targets: lead foot forward, rear knee to canvas
      const lf = this.toWorld(new THREE.Vector3(0.12, 0.09, 0.35)); const rf = this.toWorld(new THREE.Vector3(-0.12, 0.06, -0.42));
      feet[0].p.lerp(lf, this.kneel); feet[1].p.lerp(rf, this.kneel);
      if (this.prone > 0.01) { feet[0].p.lerp(this.toWorld(new THREE.Vector3(0.14, 0.07, -0.78)), this.prone); feet[1].p.lerp(this.toWorld(new THREE.Vector3(-0.14, 0.07, -0.8)), this.prone); }
    }
    // ---------- procedural body layer ----------
    const hipsB = B.Hips;
    hipsB.position.x += pp.hx * this.scale; hipsB.position.y += pp.hy * this.scale; hipsB.position.z += pp.hz * this.scale;
    hipsB.updateMatrixWorld(true);
    const wAxis = (loc) => this.dirWorld(loc, new THREE.Vector3()).normalize();
    const axY = UP, axZ = wAxis(Z), axX = wAxis(X);
    if (pp.hipTwist) rotateBoneWorld(hipsB, _q.setFromAxisAngle(axY, pp.hipTwist));
    if (pp.hipPitch) rotateBoneWorld(hipsB, _q.setFromAxisAngle(axX, pp.hipPitch));
    const sp = this.spineSpring.x, hs = this.headSpring.x;
    const spines = [B.Spine, B.Spine1, B.Spine2];
    spines.forEach((b, i) => {
      const k = i === 2 ? 0.4 : 0.3;
      _q.setFromAxisAngle(axZ, -(pp.side) * k); rotateBoneWorld(b, _q);
      _q.setFromAxisAngle(axX, pp.fwd * k); rotateBoneWorld(b, _q);
      _q.setFromAxisAngle(axY, (pp.twist - pp.hipTwist * 0.5) * k); rotateBoneWorld(b, _q);
    });
    // spring reactions (local rotation vectors)
    if (sp.lengthSq() > 1e-6) { const a = this.dirWorld(sp.clone()); const ang = a.length(); rotateBoneWorld(B.Spine2, _q.setFromAxisAngle(a.normalize(), ang)); }
    if (hs.lengthSq() > 1e-6) { const a = this.dirWorld(hs.clone()); const ang = a.length(); a.normalize(); rotateBoneWorld(B.Neck, _q.setFromAxisAngle(a, ang * 0.4)); rotateBoneWorld(B.Head, _q.setFromAxisAngle(a, ang * 0.6)); }
    // daze wobble
    if (this.daze > 40 || this.stagger > 0) { const w = Math.min(1, (this.daze - 40) / 60 + this.stagger); rotateBoneWorld(B.Head, _q.setFromAxisAngle(axZ, Math.sin(game.time * 3.1) * 0.08 * w)); }
    // ---------- leg IK (keep feet planted) ----------
    for (const f of feet) {
      const up = B[f.sd + 'UpLeg'], lo = B[f.sd + 'Leg'], ft = B[f.sd + 'Foot'];
      const knee = lo.getWorldPosition(new THREE.Vector3()); const pole = knee.addScaledVector(this.forward, 0.4).addScaledVector(UP, 0.05);
      if (f.p.y < 0.05 * this.scale) f.p.y = 0.05 * this.scale;
      solveTwoBone(up, lo, ft, f.p, pole, 1);
      const lq = lo.getWorldQuaternion(new THREE.Quaternion()); ft.quaternion.copy(lq.invert().multiply(f.q)); ft.updateMatrixWorld(true);
    }
    // ---------- arms ----------
    { const able = this.canAct || this.state === 'idle' || this.state === 'strike';
      const gh = this.guardHeld === 'high' && able ? 1 : 0, gl = this.guardHeld === 'low' && able ? 1 : 0;
      const rate = (this.coatT > 0 ? 5 : 13) * (this.bodyDmg > 60 ? 0.75 : 1);
      this.guardHigh = damp(this.guardHigh, gh, rate, dt); this.guardLow = damp(this.guardLow, gl, rate, dt);
      const hg = this.intent.handGuard || [false, false]; for (let i = 0; i < 2; i++) this.handGuardAmt[i] = damp(this.handGuardAmt[i], hg[i] && able ? 1 : 0, rate, dt); }
    for (let hi = 0; hi < 2; hi++) {
      const sd = hi === 0 ? 'Left' : 'Right'; const sx = hi === 0 ? 1 : -1;
      const sh = B[sd + 'Arm'], el = B[sd + 'ForeArm'], hd = B[sd + 'Hand'];
      // stretch (forearm elasticity)
      const st = this.stretch[hi]; const ax = this.gloveLocal[sd + 'Axis'];
      el.scale.set(1, 1, 1); hd.scale.set(1, 1, 1);
      if (st > 0.001) { const k = 1 + st / 0.28; el.scale[ax] = k; hd.scale[ax] = 1 / k; el.updateMatrixWorld(true); }
      const mocapGlove = this.gloveWorld(hi, new THREE.Vector3());
      const shoulder = sh.getWorldPosition(new THREE.Vector3());
      let target = null, w = 0, pole = null;
      const strikeHere = s && s.hi === hi;
      // guard targets (relative to the head)
      const head = B.Head.getWorldPosition(new THREE.Vector3());
      if (!strikeHere) {
        const kick = this.dirWorld(this.armKick[hi].x.clone());
        if (this.guardHigh > 0.02) { const hc = this.vol.head.a.lengthSq() > 0 ? this.vol.head.a : head; const gp = guardPose(this.guardStyle, hi, this.stance === 'southpaw' ? 1 : 0); target = hc.clone().add(this.dirWorld(gp.off)).add(kick); w = this.guardHigh; pole = shoulder.clone().add(this.dirWorld(gp.pole)); }
        else if (this.guardLow > 0.02) { const sp1 = B.Spine1.getWorldPosition(new THREE.Vector3()); target = sp1.add(this.dirWorld(new THREE.Vector3(0.11 * sx, 0.06, 0.24))).add(kick); w = this.guardLow; pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.25 * sx, -0.5, -0.1))); }
        else if (kick.lengthSq() > 1e-5) { target = mocapGlove.clone().add(kick); w = 1; }
        const bothUp = this.handGuardAmt[0] > 0.02 && this.handGuardAmt[1] > 0.02 && this.guardStyle !== 'high' && (Math.abs((this.intent.guardAim || [0, 0])[0]) + Math.abs((this.intent.guardAim || [0, 0])[1])) < 0.35;
        if (bothUp) { const hc = this.vol.head.a.lengthSq() > 0 ? this.vol.head.a : head; const gp = guardPose(this.guardStyle, hi, this.stance === 'southpaw' ? 1 : 0); target = hc.clone().add(this.dirWorld(gp.off)); w = this.handGuardAmt[hi]; pole = shoulder.clone().add(this.dirWorld(gp.pole)); }
        else if (this.handGuardAmt[hi] > 0.02) { const ga = this.intent.guardAim || [0, 0]; const hc = this.vol.head.a.lengthSq() > 0 ? this.vol.head.a : head; const down = Math.max(0, ga[1]);
          target = hc.clone().add(this.dirWorld(new THREE.Vector3(0.075 * sx - ga[0] * 0.1, -0.03 - down * 0.44 + Math.max(0, -ga[1]) * 0.04, 0.16 - down * 0.03))); w = this.handGuardAmt[hi]; pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.24 * sx, -0.34 - down * 0.1, 0.1))); }
        else if (this.analogRest && !target && this.state === 'idle' || (this.analogRest && !target && this.state === 'strike')) { target = this.restGuard(hi); w = 0.88; pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.22 * sx, -0.45, 0.05))); }
        if (this.stunT > 0 && this.guardHigh < 0.3 && this.guardLow < 0.3) { const sp2 = B.Spine2.getWorldPosition(new THREE.Vector3()); const sag = this.dirWorld(new THREE.Vector3((0.2 + 0.04 * Math.sin(game.time * 2 + hi)) * sx, -0.12, 0.2)); target = (target || mocapGlove.clone()).lerp(sp2.add(sag), 0.75); w = Math.max(w, this.stunK * 0.85); pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.3 * sx, -0.5, -0.1))); }
        if (this.clinch && !(this.clinch.role === 'holder' && this.clinch.holds && !this.clinch.holds[hi])) { const o = this.clinch.other; if (this.clinch.role === 'holder') { target = o.vol.chest.a.clone().add(o.dirWorld(new THREE.Vector3(-0.19 * sx, 0.12, -0.13))); pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.5 * sx, -0.1, 0.1))); } else { const sp2 = B.Spine2.getWorldPosition(new THREE.Vector3()); target = sp2.add(this.dirWorld(new THREE.Vector3(0.2 * sx, -0.14, 0.14))); pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.35 * sx, -0.5, 0))); } w = 1; }
        if (this.winPose > 0.01) { const hc = this.vol.head.a; target = hc.clone().add(this.dirWorld(new THREE.Vector3(0.24 * sx, 0.40 + 0.04 * Math.sin(game.time * 6 + hi * 2), 0.06))); w = this.winPose; pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.6 * sx, 0.1, -0.15))); }
        if (this.cornerRest) { target = this.toWorld(new THREE.Vector3(0.24 * sx, 0.78 * (this.scale || 1), 0.16)); w = 1; pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.35 * sx, -0.2, -0.15))); } // on the stool: gloves resting on the thighs, face open for the cutman
        if (this.kneel > 0.2) { target = this.toWorld(new THREE.Vector3((0.2 + 0.08 * this.prone) * sx, 0.06, 0.45 + 0.25 * this.prone)); w = this.kneel * (hi === 0 ? 1 : 0.4 + 0.6 * this.prone); pole = shoulder.clone().add(this.dirWorld(new THREE.Vector3(0.3 * sx, 0, -0.2))); }
      } else {
        const r = this.strikeGlovePath(s, mocapGlove, shoulder); target = r.p; w = r.w; pole = r.pole;
      }
      const cbh = this.camBody && this.camBody.hands[hi];
      const gripping = this.clinch && !(this.clinch.role === 'holder' && this.clinch.holds && !this.clinch.holds[hi]);
      if (cbh && cbh.blend > 0.001 && !gripping && this.kneel < 0.2 && !(this.winPose > 0.01) && (this.state === 'idle' || this.state === 'strike')) {
        // neutral camera guard maps exactly onto this fighter's own rest guard; the offset fades as the arm extends (1:1 reach)
        const off = this.toLocal(this.restGuard(hi)).sub(this.toLocal(shoulder.clone())).sub(cbh.calG).multiplyScalar(cbh.fade);
        const ct = shoulder.clone().add(this.dirWorld(cbh.relGs.clone().add(off)));
        // aim: once your real punch is on its way, its line bends toward his head / body (camera angle and tracker error never send a straight
        // punch wide). Reach stays yours; only the last part of the path is steered, at most ~35°, never on a feint-length push.
        if (strikeHere && s.body && !s.contact && (this.game.settings.aim ?? 0.6) > 0) { const o = this.opp; const aimP = o && (s.def.target === 'body' ? o.vol.abdo.a : o.vol.head.a);
          if (aimP && aimP.lengthSq() > 0) { const v = ct.clone().sub(shoulder), len = v.length(), e = len / (this.armLen + 1e-3); const da = aimP.clone().sub(shoulder).normalize(), dc = v.clone().normalize();
            const ang = Math.acos(clamp(dc.dot(da), -1, 1)); const k = (this.game.settings.aim ?? 0.6) * (s.def.path === 'straight' ? 1 : 0.7) * clamp((e - 0.45) / 0.35, 0, 1) * (ang > 0.61 ? Math.max(0, 1 - (ang - 0.61) / 0.35) : 1);
            if (k > 0.01) ct.copy(shoulder).addScaledVector(dc.lerp(da, k).normalize(), len); } }
        if (strikeHere && cbh.blend > 0.5 && !s.contact) s.apex = ct.clone(); // if tracking drops, recovery starts from where the glove really is
        if (strikeHere && s.contactPos && s.t <= s.def.impact + 0.06) ct.lerp(s.contactPos, 0.85); // the glove stops on what it hit
        const b = cbh.blend; target = target ? target.clone().lerp(ct, b) : (b < 1 ? mocapGlove.clone().lerp(ct, b) : ct); w = Math.max(w, 0.98 * b);
        const pc = shoulder.clone().add(this.dirWorld(cbh.elbowG.clone().addScaledVector(off, 0.5).multiplyScalar(1.6))).addScaledVector(UP, -0.06); // your real elbow line
        pole = pole ? pole.clone().lerp(pc, b * 0.85) : pc;
      }
      if (target && w > 0.001) {
        // shoulder girdle: on a long reach the shoulder comes forward and up (protects the chin, adds the last few cm) — no rubber arm
        const clav = B[sd + 'Shoulder'];
        if (clav) { const reachK = shoulder.distanceTo(target) / (this.armLen + 1e-3); const k = 0.26 * clamp((reachK - 0.62) / 0.38, 0, 1) * w;
          if (k > 0.005) { aimBone(clav, sh, target, k); sh.getWorldPosition(shoulder); } }
        // camera hands: the elbow line is smoothed so tracker noise never makes it flicker
        if (cbh && cbh.blend > 0.001 && !gripping && pole) { this.poleS = this.poleS || [null, null]; const pl = this.toLocal(pole.clone()); if (!this.poleS[hi]) this.poleS[hi] = pl; else this.poleS[hi].lerp(pl, 1 - Math.exp(-(this.game.dt || 0.016) * 16)); pole = this.toWorld(this.poleS[hi].clone()); }
        else if (this.poleS) this.poleS[hi] = null;
        const glovePos = target; const dirH = glovePos.clone().sub(shoulder).normalize();
        const wrist = glovePos.clone().addScaledVector(dirH, -0.095 * this.scale);
        solveTwoBone(sh, el, hd, wrist, pole || el.getWorldPosition(new THREE.Vector3()).addScaledVector(UP, -0.2), w);
        // keep the wrist straight with the forearm during strikes
        const camW = cbh && cbh.blend > 0.001 && !gripping ? cbh.blend : 0; // camera hands: fist in line with the forearm, like a real punch/guard
        this.wristK = this.wristK || [0, 0]; const wk = Math.max(strikeHere ? w * 0.8 : 0, camW * 0.85); this.wristK[hi] += (wk - this.wristK[hi]) * (1 - Math.exp(-this.game.dt * 10 || 0)); if (wk > this.wristK[hi] && strikeHere) this.wristK[hi] = wk;
        if (this.wristK[hi] > 0.002) { hd.quaternion.slerp(hd.userData.restQuat, this.wristK[hi]); hd.updateMatrixWorld(true); }
      }
    }
    this.root.updateMatrixWorld(true);
    this.updateVolumes();
    { const q = B.Hips.getWorldQuaternion(new THREE.Quaternion()); const fv = new THREE.Vector3(0, 0, 1).applyQuaternion(q); const yw = Math.atan2(fv.x, fv.z); if (this._hipYaw != null && dt > 0) { let d = yw - this._hipYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; this.hipYawRate += (d / dt - this.hipYawRate) * 0.5; } this._hipYaw = yw; }
  }

  // procedural footwork: each foot stays planted on the canvas until the body has carried it too far, then steps (lead foot first going forward, rear foot first going back)
  stepFeet(feet, dt) {
    if (!this.footSys) this.footSys = feet.map(f => ({ planted: f.p.clone(), step: null }));
    const v = this.vel, spd = Math.hypot(v.x, v.z), agi = this.attrK('agility'), stun = this.stunK;
    const lead = 0.12 + 0.05 * Math.min(1, spd);
    const mvLocal = this.toLocal(this.pos.clone().add(v));
    let stepping = 0, best = -1, bestScore = 0;
    feet.forEach((f, i) => {
      const fs = this.footSys[i]; f.p.add(this.dirWorld(new THREE.Vector3(0, 0, this.footOffset[i]))); const desired = f.p.clone().addScaledVector(v, lead);
      if (fs.step) {
        const st = fs.step; st.t += dt / st.dur; st.to.lerp(desired.clone().addScaledVector(v, st.dur * 0.4), 0.25); const u = Math.min(1, st.t); const e = u * u * (3 - 2 * u);
        const p = st.from.clone().lerp(st.to, e); p.y = f.p.y + Math.sin(Math.PI * u) * st.h;
        f.p.copy(p); if (u >= 1) { fs.planted.copy(st.to); fs.step = null; this.game.onFootstep && this.game.onFootstep(this, fs.planted, spd); } else stepping++;
        return;
      }
      const err = Math.hypot(fs.planted.x - desired.x, fs.planted.z - desired.z);
      const thr = (spd > 0.25 ? 0.075 : 0.11) * (stun > 0 ? 0.7 : 1);
      if (err > thr) { const fl = this.toLocal(fs.planted); const score = err + (Math.sign(fl.z) === Math.sign(mvLocal.z) ? 0.03 : 0) + (err > 0.3 ? 1 : 0); if (score > bestScore) { bestScore = score; best = i; } }
      f.p.set(fs.planted.x, f.p.y, fs.planted.z);
    });
    if (best >= 0 && (stepping === 0 || bestScore > 1)) {
      const fs = this.footSys[best]; const desired = feet[best].p.clone(); desired.copy(this.footDesired(best) || desired);
      const dur = Math.max(0.11, Math.min(0.21, 0.2 - spd * 0.025)) * (1 - 0.2 * agi) * (1 + 0.35 * stun);
      fs.step = { from: fs.planted.clone(), to: desired.addScaledVector(v, lead + dur * 0.5), t: 0, dur, h: 0.035 + Math.min(0.05, spd * 0.025) + stun * 0.02 * Math.random() };
    }
  }
  footDesired(i) { const B = this.B; const f = B[i === 0 ? 'LeftFoot' : 'RightFoot']; return f.getWorldPosition(new THREE.Vector3()).add(this.dirWorld(new THREE.Vector3(0, 0, this.footOffset[i]))); }

  gloveWorld(hi, out) { const h = this.B[hi === 0 ? 'LeftHand' : 'RightHand']; return out.copy(this.gloveLocal[hi === 0 ? 'Left' : 'Right']).applyMatrix4(h.matrixWorld); }

  strikeGlovePath(s, mocapGlove, shoulder) {
    const d = s.def, W = d.windup, I = d.impact, E = d.end, sx = s.sx; const t = s.t;
    const S = this.toWorld(s.startLocal);
    // aim point
    let T = s.target ? s.target.clone() : this.game.strikeTarget(this, s);
    const dirT = T.clone().sub(shoulder); const reach = (this.armLen + s.reachBonus) * 0.98;
    const overshoot = T.clone().addScaledVector(dirT.clone().normalize(), d.path === 'hook' ? 0.06 : 0.12);
    const Ed = overshoot.clone().sub(shoulder); if (Ed.length() > reach) Ed.setLength(reach);
    const Ew = shoulder.clone().add(Ed);
    let P, pole;
    const loc = v => this.dirWorld(v, new THREE.Vector3());
    if (t < W) { // chamber / load
      const u = Math.sin(Math.PI * 0.5 * t / W);
      const lowStraight = d.path === 'straight' && d.target === 'body';
      const ch = lowStraight ? new THREE.Vector3(0.03 * sx, -0.14, -0.03) : d.path === 'over' ? new THREE.Vector3(0.05 * sx, 0.07, -0.07) : d.path === 'hook' ? new THREE.Vector3(0.06 * sx, 0.03, -0.04) : d.path === 'upper' ? new THREE.Vector3(0.0, -0.14, -0.02) : d.path === 'body' ? new THREE.Vector3(0.05 * sx, -0.14, -0.03) : new THREE.Vector3(0, -0.01, -0.035);
      P = S.clone().add(loc(ch).multiplyScalar(u));
    } else if (t < I || (!s.contact && t < I + 0.02)) {
      const u = Math.pow(clamp((t - W) / (I - W), 0, 1), 1.45);
      const lowStraight = d.path === 'straight' && d.target === 'body';
      const S2 = S.clone().add(loc(lowStraight ? new THREE.Vector3(0.03 * sx, -0.14, -0.03) : d.path === 'over' ? new THREE.Vector3(0.05 * sx, 0.07, -0.07) : d.path === 'hook' ? new THREE.Vector3(0.06 * sx, 0.03, -0.04) : d.path === 'upper' ? new THREE.Vector3(0, -0.14, -0.02) : d.path === 'body' ? new THREE.Vector3(0.05 * sx, -0.14, -0.03) : new THREE.Vector3(0, -0.01, -0.035)));
      let C;
      if (lowStraight) C = S2.clone().lerp(Ew, 0.5).add(loc(new THREE.Vector3(0.1 * sx, -0.14, 0)));
      else if (d.path === 'over') C = S2.clone().lerp(Ew, 0.5).add(loc(new THREE.Vector3(0.2 * sx, 0.32, 0.0)));
      else if (d.path === 'hook') C = S2.clone().add(loc(new THREE.Vector3(0.42 * sx, 0.06, 0.34)));
      else if (d.path === 'upper') C = S2.clone().lerp(Ew, 0.5).add(loc(new THREE.Vector3(0, -0.24, -0.02)));
      else if (d.path === 'body') C = S2.clone().lerp(Ew, 0.5).add(loc(new THREE.Vector3(0.24 * sx, -0.16, -0.02)));
      else C = S2.clone().lerp(Ew, 0.5).add(loc(new THREE.Vector3(0, 0.02, 0)));
      P = new THREE.Vector3().copy(S2).multiplyScalar((1 - u) * (1 - u)).addScaledVector(C, 2 * u * (1 - u)).addScaledVector(Ew, u * u);
      s.apex = P.clone();
    } else {
      const from = s.contactPos || s.apex || Ew; const u = sm((t - I) / (E - I));
      P = from.clone().lerp(this.analogRest ? this.restGuard(s.hi) : mocapGlove, u);
      if (s.analog && s.hold && t <= I + 1e-3) P = s.contactPos ? s.contactPos.clone() : Ew.clone();
    }
    if (s.contactPos && t < I) P = s.contactPos.clone();
    if (d.path === 'over') pole = shoulder.clone().add(loc(new THREE.Vector3(0.5 * sx, 0.4, -0.15)));
    else if (d.path === 'hook') pole = shoulder.clone().add(loc(new THREE.Vector3(0.5 * sx, 0.12, -0.25)));
    else if (d.path === 'upper') pole = shoulder.clone().add(loc(new THREE.Vector3(0.12 * sx, -0.55, 0.15)));
    else if (d.path === 'body') pole = shoulder.clone().add(loc(new THREE.Vector3(0.45 * sx, -0.35, -0.1)));
    else pole = shoulder.clone().add(loc(new THREE.Vector3(0.28 * sx, -0.42, -0.05)));
    let w = t < E * 0.7 ? 1 : 1 - sm((t - E * 0.7) / (E * 0.3)); if (this.analogRest) w = Math.max(w, 0.88); // returns to the same guard the rest pose holds: no pop
    s.cur.copy(P);
    return { p: P, w, pole };
  }

  updateVolumes() {
    const B = this.B, v = this.vol;
    // head centre: head bone + along neck->head direction
    const hp = B.Head.getWorldPosition(new THREE.Vector3()), np = B.Neck.getWorldPosition(new THREE.Vector3()), top = B.HeadTop_End.getWorldPosition(new THREE.Vector3());
    v.head.a.copy(hp).lerp(top, 0.45).addScaledVector(this.forward, 0.012);
    B.Spine2.getWorldPosition(v.chest.a); v.chest.b.copy(np).lerp(v.chest.a, 0.3);
    B.Hips.getWorldPosition(v.abdo.a).addScaledVector(UP, 0.06 * this.scale); B.Spine1.getWorldPosition(v.abdo.b);
    v.chest.a.addScaledVector(this.forward, 0.02); v.abdo.a.addScaledVector(this.forward, 0.02); v.abdo.b.addScaledVector(this.forward, 0.02);
    this.glovePrev[0].copy(this.gloveNow[0]); this.glovePrev[1].copy(this.gloveNow[1]);
    this.gloveWorld(0, this.gloveNow[0]); this.gloveWorld(1, this.gloveNow[1]);
    v.gloveL.a.copy(this.gloveNow[0]); v.gloveR.a.copy(this.gloveNow[1]);
    const gr = 0.088 + 0.02 * Math.max(this.guardHigh, this.guardLow);
    v.gloveL.r = gr * (this.gloves[0].buffs.roux ? 1.25 : 1); v.gloveR.r = gr * (this.gloves[1].buffs.roux ? 1.25 : 1);
    B.LeftForeArm.getWorldPosition(v.armL.a); B.LeftHand.getWorldPosition(v.armL.b); B.RightForeArm.getWorldPosition(v.armR.a); B.RightHand.getWorldPosition(v.armR.b);
    this.volList = [v.gloveL, v.gloveR, v.armL, v.armR, v.head, v.chest, v.abdo];
  }

  // ---------- knockdown ----------
  knockDown(kind) {
    this.state = 'down'; this.stateT = 0; this.strike = null; this.queued = null; this.roll = null; this.knockdowns++; this.roundKD++;
    this.downInfo = { kind, rising: false };
    this.guardHeld = null; this.intent.weave = 0;
    if (kind === 'kneel' || kind === 'forward') { this.kneelTarget = 1; this.proneTarget = 0; this.action = null; if (kind === 'forward') this.playAction('hitHead', { w: 0.6, speed: 1.4, fadeIn: 0.04, fadeOut: 0.3, maxT: 0.6 }); }
    else { this.hipsBias.set(0, 0); this.playAction('koFall', { rm: 1, w: 1, fadeIn: 0.06, hold: true, speed: 1.0, start: 0.25 }); }
  }
  rise(onDone) {
    if (!this.downInfo) return; this.downInfo.rising = true;
    if (this.downInfo.kind === 'kneel') { this.kneelTarget = 0; this.riseTimer = 1.1; this.onRise = onDone; return; }
    if (this.downInfo.kind === 'forward') { this.proneTarget = 0; this.riseTimer = 1.9; this.onRise = onDone; this._kneelOff = 0.8; return; }
    this.playAction('getUp', { rm: 1, w: 1, fadeIn: 0.25, speed: 1.25, start: 0.4, fadeOut: 0.35, onEnd: () => {} });
    this.riseTimer = (this.lib.clips.getUp.duration - 0.4) / 1.25 - 0.3; this.onRise = onDone;
  }
  lieDown() { if (this.downInfo && this.downInfo.kind !== 'kneel') this.playAction('koLie', { rm: 1, w: 1, fadeIn: 0.4, hold: true, speed: 0.8 }); }
  postUpdate(dt) {
    if (this._kneelOff != null) { this._kneelOff -= dt; if (this._kneelOff <= 0) { this._kneelOff = null; this.kneelTarget = 0; } }
    if (this.riseTimer != null) { this.riseTimer -= dt; if (this.riseTimer <= 0) { this.riseTimer = null; this.bakeRootMotion(); this.state = 'idle'; this.downInfo = null; this.stagger = 0.3; const cb = this.onRise; this.onRise = null; if (cb) cb(); } }
  }
  bakeRootMotion() {
    // move root to where the hips ended up so blending back to idle doesn't snap
    const hips = this.B.Hips.getWorldPosition(new THREE.Vector3()); const loc = this.toLocal(hips);
    const off = new THREE.Vector3(loc.x - this.lib.idleXZ[0] * this.scale, 0, loc.z - this.lib.idleXZ[1] * this.scale);
    this.pos.add(this.dirWorld(off));
    this.hipsBias.set(-off.x / this.scale, -off.z / this.scale);
    if (this.action) { const a = this.action; a.hold = false; a.maxT = a.t + a.fadeOut * a.speed; a.age = 0; a.start = a.t - 0.0001; }
  }
}
