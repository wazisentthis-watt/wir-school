// Adaptive opponent: perceives with a reaction delay, remembers your habits, sets traps.
import { activeGuard, BEATS } from './guards.js';
import { pivotQuality } from './balance.js';
import { onRopes } from './signature.js';
import * as THREE from 'three';
import { RING } from './arena.js';
import { STRIKES } from './combat.js';
import { RECIPES } from './gloves.js';

export const STYLES = {
  counter:  { range: 1.02, aggr: 0.55, guard: 0.45, slip: 0.65, counter: 0.8, move: 0.7, body: 0.3, feint: 0.4, heavy: 0.15, clinch: 0.4, combos: [['jabL'], ['jabL', 'crossR'], ['crossR', 'hookL'], ['jabL', 'bodyR'], ['jabL', 'jabL', 'crossR'], ['bodyJabL', 'overR!'], ['jabL', 'upperR', 'hookL']] },
  defense:  { range: 1.0, aggr: 0.45, guard: 0.85, slip: 0.35, counter: 0.65, move: 0.4, body: 0.35, feint: 0.2, heavy: 0.1, clinch: 0.7, combos: [['jabL'], ['jabL', 'crossR'], ['crossR', 'hookL'], ['bodyL', 'hookL'], ['jabL', 'upper'], ['bodyJabR', 'hookL']] },
  movement: { range: 1.18, aggr: 0.55, guard: 0.4, slip: 0.7, counter: 0.55, move: 1.0, body: 0.25, feint: 0.5, heavy: 0.08, clinch: 0.3, combos: [['jabL'], ['jabL', 'jabL'], ['jabL', 'crossR'], ['crossR', 'hookL'], ['jabL', 'crossR', 'hookL'], ['bodyJabL', 'jabL', 'overR']] },
  pressure: { range: 0.86, aggr: 0.85, guard: 0.55, slip: 0.4, counter: 0.4, move: 0.55, body: 0.5, feint: 0.25, heavy: 0.3, clinch: 0.5, combos: [['jabL', 'crossR', 'hookL'], ['bodyL', 'hookL'], ['hookL', 'bodyR', 'hookL'], ['crossR', 'upper'], ['bodyR', 'upper', 'hookL'], ['jabL', 'overR!'], ['bodyUpR', 'hookL!'], ['bodyJabR', 'bodyL', 'overR!']] },
  dummy:    { range: 1.0, aggr: 0.0, heavy: 0, clinch: 0, guard: 0.6, slip: 0.3, counter: 0, move: 0.2, body: 0, feint: 0, combos: [] },
};
export const DIFF = { easy: { react: 0.34, skill: 0.45, aggr: 0.65 }, normal: { react: 0.23, skill: 0.7, aggr: 0.9 }, hard: { react: 0.15, skill: 0.9, aggr: 1.1 } };

export class AIController {
  constructor(game, me, style, diff = 'normal') {
    this.game = game; this.me = me; this.st = STYLES[style] || STYLES.counter; this.d = DIFF[diff] || DIFF.normal; this.styleName = style;
    this.hist = []; this.next = 0; this.plan = []; this.handled = new Set(); this.circleDir = Math.random() > .5 ? 1 : -1; this.circleT = 0;
    this.defT = 0; this.mem = { weave: { L: 0, R: 0 }, roll: { L: 0, R: 0 }, after: [], guardHighT: 0, guardLowT: 0, strikes: {}, lastWeaves: [], jabStreak: 0 };
    this.reads = new Set(); this.trap = null; this.lastOppWeave = 0; this.lastOppRoll = null; this.recipeT = 3 + Math.random() * 4;
  }
  observe() {
    const o = this.me.opp, g = this.game;
    const snap = { t: g.time, strike: o.strike ? { name: o.strike.name, t: o.strike.t, id: o.strike.id || (o.strike.id = Math.random()), def: o.strike.def } : null, weave: o.intent.weave, roll: o.roll ? o.roll.dir : 0, guard: o.guardHeld, head: o.vol.head.a.clone(), pos: o.pos.clone() };
    this.hist.push(snap); while (this.hist.length > 90) this.hist.shift();
    // habit memory (immediate bookkeeping; reactions still use delayed perception)
    if (snap.weave !== 0 && this.lastOppWeave === 0) { const side = snap.weave > 0 ? 'L' : 'R'; this.mem.weave[side]++; this.mem.lastWeaves.push(side); if (this.mem.lastWeaves.length > 10) this.mem.lastWeaves.shift(); }
    this.lastOppWeave = snap.weave;
    if (snap.roll && !this.lastOppRoll) { this.mem.roll[snap.roll > 0 ? 'L' : 'R']++; }
    this.lastOppRoll = snap.roll;
    if (snap.guard === 'high') this.mem.guardHighT += g.dt; if (snap.guard === 'low') this.mem.guardLowT += g.dt;
    if (snap.strike && !this.handled.has('m' + snap.strike.id)) { this.handled.add('m' + snap.strike.id); this.mem.strikes[snap.strike.name] = (this.mem.strikes[snap.strike.name] || 0) + 1; this.mem.jabStreak = snap.strike.name === 'jabL' ? this.mem.jabStreak + 1 : 0; if (snap.strike.def.target === 'body') this.bodyFear = Math.min(0.6, (this.bodyFear || 0) + 0.06); else this.bodyFear = Math.max(0, (this.bodyFear || 0) - 0.015); }
  }
  perceived() { const delay = this.d.react * (this.me.obscured > 0 ? 1.7 : 1) * (this.me.daze > 50 ? 1.4 : 1); const t = this.game.time - delay; let s = this.hist[0]; for (const h of this.hist) { if (h.t <= t) s = h; else break; } return s; }
  habitReads() {
    const m = this.mem, name = this.me.spec.short, out = [];
    const wl = m.lastWeaves.filter(x => x === 'L').length, wn = m.lastWeaves.length;
    if (wn >= 5) { const pl = wl / wn; if (pl >= 0.7) out.push({ key: 'weaveL', text: `${name} read: you weave LEFT ${Math.round(pl * 100)}% — setting an uppercut trap`, trap: 'L' }); else if (pl <= 0.3) out.push({ key: 'weaveR', text: `${name} read: you weave RIGHT ${Math.round((1 - pl) * 100)}% — waiting with the hook`, trap: 'R' }); }
    const tot = m.guardHighT + m.guardLowT; if (m.guardHighT > 6 && m.guardHighT / Math.max(1, tot) > 0.75) out.push({ key: 'highGuard', text: `${name} read: your high guard is a habit — going downstairs`, body: true });
    if (m.jabStreak >= 4) out.push({ key: 'jabSpam', text: `${name} read: you're pawing the same jab — timing the slip-counter`, jab: true });
    const total = Object.values(m.strikes).reduce((a, b) => a + b, 0);
    if (total > 12) { const fav = Object.entries(m.strikes).sort((a, b) => b[1] - a[1])[0]; if (fav[1] / total > 0.45) out.push({ key: 'fav_' + fav[0], text: `${name} read: ${STRIKES[fav[0]].label} is your go-to (${Math.round(fav[1] / total * 100)}%)` }); }
    return out;
  }
  throw(nm) { let heavy = nm.endsWith('!'); nm = nm.replace('!', ''); if (!heavy && this.st.heavy && Math.random() < this.st.heavy * 0.35 && /hook|cross|upper/.test(nm)) heavy = true; this.me.requestStrike(nm, heavy); }
  update(dt) {
    const me = this.me, o = me.opp, g = this.game; const I = me.intent;
    this.observe();
    if (me.state === 'down' || me.state === 'ko' || g.frozen || o.state === 'down') { I.move.set(0, 0); I.weave = 0; me.setGuard(null); return; }
    const P = this.perceived(); const st = this.st, d = this.d;
    const dist = me.pos.distanceTo(o.pos);
    // reads
    for (const r of this.habitReads()) if (!this.reads.has(r.key)) { this.reads.add(r.key); g.onEvent(me, 'read', r); if (r.trap) this.trap = r.trap; if (r.body) this.bodyBias = 0.35; if (r.jab) this.jabRead = true; }
    // ---- defense ----
    this.defT -= dt;
    if (P.strike && !this.handled.has(P.strike.id) && me.state !== 'strike' || (P.strike && me.strike && me.strike.t < me.strike.def.windup * 0.5 && !this.handled.has(P.strike.id))) {
      const s = P.strike; const tLeft = (s.def.impact - s.t) ; this.handled.add(P.strike.id);
      if (tLeft > -0.02) {
        const skill = d.skill * (me.daze > 60 ? 0.6 : 1) * (this.jabRead && s.name === 'jabL' ? 1.25 : 1);
        const r = Math.random();
        const body = s.def.target === 'body';
        if (r < st.guard * skill) { this.defense = { kind: 'guard', g: body ? 'low' : 'high', t: 0.32 + Math.random() * 0.2 }; }
        else if (r < (st.guard + st.slip) * skill && !body) {
          const fromLeft = s.def.hand === 'L'; // attacker's left hand arrives on my right side
          if (s.def.path === 'hook' || s.def.path === 'over') { if (Math.random() < 0.5) this.defense = { kind: 'duck', t: 0.42 }; else if (me.startRoll(fromLeft ? 1 : -1)) this.defense = { kind: 'roll', t: 0.5 }; }
          else if (s.def.path === 'upper' || Math.random() < 0.25) this.defense = { kind: 'pull', t: 0.32 };
          else this.defense = { kind: 'weave', w: (fromLeft ? -1 : 1) * (Math.random() > 0.25 ? 1 : -1), t: 0.28 + Math.random() * 0.12 };
          if (Math.random() < st.counter * skill) this.counterAt = g.time + 0.16 + Math.random() * 0.08;
        }
        if (me.strike && me.strike.t < me.strike.def.windup * 0.5 && Math.random() < skill * 0.5) { me.strike = null; me.state = 'idle'; me.action = null; }
      }
    }
    if (this.defense) { this.defense.t -= dt; if (this.defense.t <= 0) this.defense = null; }
    // footwork craft: a good fighter takes the angle with a pivot when his weight is right for it (and uses it to get off the ropes);
    // he doesn't try it when it would tangle him up
    me.pivot = null; this.pivT = (this.pivT ?? 2.5) - dt;
    if (this.pivT <= 0 && dist < 1.3 && !me.strike && !me.switching && !this.defense) { this.pivT = (1.6 + Math.random() * 3) / (0.5 + d.skill);
      const side = Math.random() < 0.5 ? 'left' : 'right'; const want = onRopes(me) || Math.random() < 0.3 * d.skill + (o.offBalance > 0 ? 0.3 : 0);
      if (want && pivotQuality(me, side, false).q > 0.6 + 0.1 * (1 - d.skill)) me.pivot = side; }
    I.weave = this.defense && this.defense.kind === 'weave' ? this.defense.w : 0; I.duck = this.defense && this.defense.kind === 'duck' ? 1 : 0; I.pull = this.defense && this.defense.kind === 'pull' ? 1 : 0;
    if (!I.weave && dist < st.range + 0.4 && !me.strike && !this.shell) { this.bobPh = (this.bobPh || Math.random() * 6) + dt * (1.6 + st.slip); I.weave = Math.sin(this.bobPh) * 0.45 * st.slip * d.skill; }
    let guard = this.defense && this.defense.kind === 'guard' ? this.defense.g : null;
    // anticipatory shell: in range you can't react to a jab, so you keep the hands home part of the time
    this.shellT = (this.shellT || 0) - dt;
    if (this.shellT <= 0) { this.shellT = 0.5 + Math.random() * 0.9; const inRange = dist < st.range + 0.35; const pb = (this.bodyFear || 0);
      const r = Math.random(); this.shell = !inRange ? null : r < st.guard * 0.75 * d.skill + (this.jabRead ? 0.15 : 0) ? (Math.random() < pb ? 'low' : 'high') : null; }
    if (!guard && this.shell && !me.strike && !this.plan.length) guard = this.shell;
    if (!guard && this.styleName === 'dummy') guard = Math.sin(g.time * 0.7) > 0 ? 'high' : 'low';
    me.setGuard(guard);
    // ---- clinch: tie up when hurt; fight out when held ----
    if (me.clinch && me.clinch.role === 'held') { I.move.set((Math.random() - .5) * 0.4, me.clinch.t > 0.4 + Math.random() * 0.4 ? -1 : 0); I.clinch = false; return; }
    if (me.clinch && me.clinch.role === 'holder') { this.clinchT = (this.clinchT ?? (1.2 + Math.random() * 1.6)) - dt; I.clinch = this.clinchT > 0; if (!I.clinch) this.clinchT = null; I.move.set(0, 0);
      if (!me.strike) me.clinch.holds = [true, true]; if (!me.strike && Math.random() < dt * 1.1 * (st.clinch || 0.4)) { me.clinch.holds = [true, false]; me.requestStrike(Math.random() < 0.6 ? 'bodyR' : 'upperR'); } return; }
    I.clinch = false;
    if ((me.stunT > 0 || me.daze > 55 || me.health < 22) && dist < 1.0 && Math.random() < (st.clinch || 0) * dt * 3) I.clinch = true;
    // ---- counters ----
    if (this.counterAt && g.time >= this.counterAt) { this.counterAt = null; const opts = this.trap ? ['upper', 'hookL'] : ['crossR', 'hookL', 'upper', 'bodyR']; this.plan = [opts[(Math.random() * opts.length) | 0]]; this.next = 0; }
    // ---- trap: opponent starts weaving to the read side -> intercept with an uppercut aimed at where the head is going
    if (this.trap && P.weave !== 0 && !me.strike && dist < st.range + 0.35 && (P.weave > 0 ? 'L' : 'R') === this.trap && Math.random() < d.skill * 0.08) {
      me.aimBias = o.dirWorld(new THREE.Vector3(0.22 * (this.trap === 'L' ? 1 : -1), -0.08, 0)); this.plan = ['upper']; this.next = 0; g.onEvent(me, 'trapSprung');
    }
    // ---- offense ----
    this.next -= dt;
    const canStrike = me.canAct && !me.strike && !this.defense && me.stamina > 12;
    if (this.plan.length && canStrike && this.next <= 0) { const nm = this.plan.shift(); if (dist < st.range + 0.55) this.throw(nm); this.next = 0.05; }
    else if (this.plan.length && me.strike && me.strike.t > me.strike.def.impact * 0.8) { const nm = this.plan.shift(); this.throw(nm); }
    if (!this.plan.length && canStrike && dist < st.range + 0.25 && this.next <= 0) {
      const rate = st.aggr * d.aggr * (me.stamina > 40 ? 1 : 0.5) * (o.state === 'idle' && o.stagger > 0 ? 3 : 1) * (o.offBalance > 0 ? 4 : 1);
      if (Math.random() < rate * dt * 2.2) {
        let combos = st.combos.slice();
        if (this.bodyBias || o.guardHeld === 'high') combos = combos.concat([['bodyL', 'hookL'], ['jabL', 'bodyR'], ['bodyR', 'hookL']]);
        const shell = activeGuard(o); if (BEATS[shell] && Math.random() < 0.35 + 0.45 * d.skill) combos = combos.concat(BEATS[shell], BEATS[shell]); // read your shell, go where it's open
        this.plan = combos[(Math.random() * combos.length) | 0].slice(); this.next = 0;
        if (Math.random() < st.feint * 0.4) { me.feint = 0.25; me.feintDir = Math.random() > .5 ? 1 : -1; this.next = 0.22; }
      }
    }
    // ---- footwork ----
    this.circleT -= dt; if (this.circleT <= 0) { this.circleDir = Math.random() > 0.5 ? 1 : -1; this.circleT = 1 + Math.random() * 2.5; if (Math.random() < 0.3) this.circleDir = 0; }
    let fwd = 0; const want = st.range + (me.stamina < 30 ? 0.35 : 0) + (me.daze > 60 ? 0.4 : 0);
    if (dist > want + 0.18) fwd = 1; else if (dist < want - 0.15) fwd = -1;
    if (st.move > 0.8 && Math.random() < 0.01) fwd = -fwd || -1; // movement style: in and out
    let lat = this.circleDir * st.move;
    const r = Math.max(Math.abs(me.pos.x), Math.abs(me.pos.z));
    if (r > RING - 0.55) { // off the ropes: circle toward centre
      const toC = me.toLocal(new THREE.Vector3(0, 0, 0)); lat = Math.sign(toC.x) * 1; if (fwd < 0) fwd = 0;
    }
    if (this.styleName === 'pressure' && o.pos.length() > RING - 0.8) lat *= 0.3; // cut off the ring
    I.move.set(lat * 0.8, fwd);
    if (this.styleName === 'dummy') I.move.set(0, dist > 1.2 ? 1 : 0);
    // ---- recipes ----
    this.recipeT -= dt;
    if (this.recipeT <= 0 && me.canAct && !me.strike) {
      this.recipeT = 5 + Math.random() * 6;
      for (let k = 0; k < 4; k++) {
        const hi = Math.random() > 0.5 ? 1 : 0; const gl = me.gloves[hi]; gl.sel = (Math.random() * gl.loadout.length) | 0; const rc = gl.recipe;
        if (gl.primed || gl.cooking) continue;
        if (rc.heat && (gl.heat < rc.heat[0] + 3 || gl.heat > rc.heat[1] - 3)) continue;
        if (rc.needMoist && gl.moisture < rc.needMoist + 2) continue; if (rc.needPressure && gl.pressure < rc.needPressure) continue;
        me.activateRecipe(hi); break;
      }
    }
  }
}
