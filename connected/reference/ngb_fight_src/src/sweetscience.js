// Sweet Science layer — trauma, body-shot physiology, ring craft and the corner between rounds.
// Ported (de-minified, re-wired to the real engine) from the working parts of the Gemini "Sweet Science" pack:
// cuts & swelling by side, blood in the eye, blind-side shots, broken nose / jaw / mouthguard, liver-shot delayed fold,
// solar-plexus lock, rolling with the punch, pull-counter, closing-speed impact, jab cadence, hand fractures
// (overhands to the skull, body shots into an elbow), doctor checks, open scoring, 10-second clapper, heart surge,
// era rules and the cutman corner. Nothing here invents a hit — it only shapes hits the glove collision already decided.
import * as THREE from 'three';
import { guardHit } from './guards.js';
import { sigHit } from './signature.js';
import { famOf } from './corner.js';
import { hitWhileUnstable } from './balance.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
export const ERAS = {
  modern: { label: 'MODERN · 10 oz', dmg: 1, cut: 1, hand: 1 },
  golden: { label: '1920s · 5 oz horsehair', dmg: 1.18, cut: 1.35, hand: 1.4 },
  bare: { label: 'BARE KNUCKLE', dmg: 1.32, cut: 1.9, hand: 2.4 },
};
const CORNER = [
  { id: 'enswell', cost: 15, name: 'Enswell', desc: 'Cold steel on the swelling — opens the eye back up.' },
  { id: 'adrenaline', cost: 20, name: 'Adrenaline 1:1000', desc: 'Packs the cut. Stops the blood running into the eye.' },
  { id: 'vaseline', cost: 10, name: 'Vaseline the brows', desc: 'Hooks slide off instead of tearing skin.' },
  { id: 'ice', cost: 15, name: 'Ice on the neck', desc: 'Clears the cobwebs and brings the legs back.' },
  { id: 'breathe', cost: 10, name: 'Breathe — big belly breaths', desc: 'Resets the body-shot tax, refills the tank.' },
  { id: 'rinse', cost: 10, name: 'Rinse & seat the mouthpiece', desc: 'Jaw protected again.' },
];

export class SweetScience {
  constructor(game) { this.game = game; this.cornerOpen = false; this.budget = 0; }
  era() { return ERAS[this.game.settings.era] || ERAS.modern; }
  init(f) {
    if (f.tr) return f.tr;
    return (f.tr = { swell: [0, 0], cut: [0, 0], blood: [0, 0], nose: 0, jaw: 0, mouthpiece: true, hand: [0, 0], vaseline: [0, 0],
      liverT: 0, liverFold: false, plexusT: 0, wobbleT: 0, cadence: 0, lastJabT: -9, pullT: -9, doctor: 0, heart: false, bodyTax: 0, clashCD: 0 });
  }
  side(att, s) { return s.hi === 1 ? 0 : 1; } // a right hand lands on the left side of the face, a left hand on the right (squared up)

  // ---------- before takeHit: shape the force of a hit the collision already decided ----------
  modifyHit(att, def, h) {
    const g = this.game, s = h.strike; if (!s) return h.dmg; const A = this.init(att), D = this.init(def); let dmg = h.dmg; const d = s.def;
    const tags = [];
    // rolling with the punch: head already moving the same way the hook travels
    if (d.path === 'hook' && h.part === 'head') { const travel = s.hi === 0 ? -1 : 1; if (def.weaveX * travel > 0.25) { dmg *= 0.6; tags.push('ROLLED WITH IT'); } }
    // pull-counter: lean back, then fire the straight as they fall short
    if (d.path === 'straight' && g.time - A.pullT < 0.6 && h.kind === 'clean') { dmg *= 1.3; tags.push('PULL COUNTER'); }
    // walking onto it: closing speed adds to the impact
    const close = -def.vel.dot(att.forward); if (close > 0.35) dmg *= 1 + Math.min(0.4, close * 0.35);
    // jab cadence: doubles and triples come faster and land heavier
    if (/^jab|bodyJab/.test(s.name)) { A.cadence = g.time - A.lastJabT < 0.65 ? Math.min(3, A.cadence + 1) : 0; A.lastJabT = g.time; dmg *= 1 + A.cadence * 0.08; }
    // blind side: the shot comes from the side of the closed / bloody eye
    const sd = this.side(att, s); if (h.part === 'head' && (D.swell[sd] + D.blood[sd] * 0.8) > 60) { dmg *= 1.3; def.daze += 8; tags.push('BLIND SIDE'); }
    // a broken hand can't throw full force (the brain won't let it)
    if (A.hand[s.hi] > 35) dmg *= 0.72;
    // vaseline: a greased brow lets a hook glance
    if (d.path === 'hook' && h.part === 'head' && Math.random() < D.vaseline[sd] * 0.35) { D.vaseline[sd] = Math.max(0, D.vaseline[sd] - 0.15); dmg *= 0.6; }
    // the shell it went into (Peek-a-Boo, Philly Shell, Long Guard, Cross-Arm)
    dmg *= guardHit(def, att, d, h.part === 'head' ? 'head' : 'body', sd, tags);
    // signature moves: check hook, the angle, Dempsey roll, Sugar Ray rhythm, rope-a-dope
    dmg *= sigHit(g, att, def, s, h.part, tags);
    // caught narrow, on one foot, mid-switch, feet crossed: the shot moves you more and lands harder
    dmg *= hitWhileUnstable(def, att, s, tags);
    // your corner told you what to watch for: that punch is read
    if (def.cornerRead && famOf(att, s) === def.cornerRead) { dmg *= 0.8; tags.push('READ IT'); }
    dmg *= this.era().dmg;
    if (tags.length && (att === g.player || def === g.player)) g.hitInfo(tags.join(' · '), att === g.player ? '#00e5ff' : '#ffb000');
    return dmg;
  }

  // ---------- after takeHit: what the punch did to the body ----------
  afterHit(att, def, h, region, real) {
    const g = this.game, s = h.strike; if (!s || h.kind === 'block') return; const A = this.init(att), D = this.init(def), d = s.def, era = this.era();
    const clean = h.kind === 'clean', sd = this.side(att, s);
    if (region === 'head' && clean) {
      D.swell[sd] = Math.min(100, D.swell[sd] + real * 1.4);
      if (real > 6.2 && Math.random() < 0.22 * era.cut) { D.cut[sd] = Math.min(100, D.cut[sd] + 35); g.feed(`${def.spec.short} is cut over the ${sd ? 'right' : 'left'} eye`, 'bad'); }
      if (d.path === 'straight' && real > 5.5) D.nose = Math.min(100, D.nose + real * 1.6);
      if (d.path === 'upper' && real > 6) { D.jaw = Math.min(100, D.jaw + real * 1.8); if (real > 7.5 && D.mouthpiece && Math.random() < 0.25) { D.mouthpiece = false; g.feed(`${def.spec.short}'s MOUTHPIECE is knocked out`, 'bad'); } }
      if (!D.mouthpiece && real > 7) def.daze += 6; // open jaw takes it worse
      if (real > 6.5) D.wobbleT = Math.max(D.wobbleT, 1.6);
      if (s.heavy && Math.random() < 0.16 * era.hand) A.hand[s.hi] = Math.min(100, A.hand[s.hi] + 18); // knuckles on skull
    }
    if (region === 'body' && clean) {
      D.bodyTax = Math.min(50, D.bodyTax + real * 0.45);
      const leftHand = s.hi === (att.stance === 'southpaw' ? 1 : 0); // the lead-side hook digs under the ribs into the liver
      if (leftHand && (d.path === 'hook' || d.path === 'body') && real > 5) { D.liverT = 1.15; D.liverFold = D.liverFold || real > 6.6 || def.bodyDmg > 55; if (def === g.player || att === g.player) g.hitInfo('LIVER', '#ff2f86', true); }
      else if (d.path === 'straight' && real > 5) { D.plexusT = 4; } // solar plexus: the wind goes out
    }
    // body shot into a low elbow hurts the hand that threw it
    if (region === 'body' && def.guardLow > 0.6) A.hand[s.hi] = Math.min(100, A.hand[s.hi] + 14 * era.hand);
    if (A.hand[s.hi] > 45 && !A['handMsg' + s.hi]) { A['handMsg' + s.hi] = 1; g.feed(`${att.spec.short} hurt the ${s.hi ? 'right' : 'left'} hand`, 'bad'); }
    // ringside doctor
    if ((D.cut[0] > 85 || D.cut[1] > 85 || D.swell[0] > 90 || D.swell[1] > 90) && D.doctor < 2 && g.phase === 'fight') {
      D.doctor++; g.announce('DOCTOR CHECK', `ringside physician looks at ${def.spec.short}'s eye`, 1.6);
      if (Math.max(D.cut[0], D.cut[1], D.swell[0], D.swell[1]) > 96) g.finish(att, 'TKO', 'doctor stoppage');
    }
  }

  // ---------- every frame ----------
  update(dt) {
    const g = this.game; if (!g.f || g.f.length < 2) return; const fight = g.phase === 'fight';
    for (const f of g.f) {
      const T = this.init(f), o = g.opponentOf(f);
      if (f.pullK > 0.3) T.pullT = g.time;
      for (let i = 0; i < 2; i++) { if (T.cut[i] > 10) T.blood[i] = Math.min(100, T.blood[i] + dt * T.cut[i] * 0.06); }
      if (!fight) continue;
      if (T.liverT > 0) { T.liverT -= dt; if (T.liverT <= 0 && T.liverFold) { T.liverFold = false; if (f.state === 'idle' || f.state === 'strike') { g.feed(`${f.spec.short}'s legs go — delayed LIVER SHOT`, 'bad'); f.health = Math.max(1, f.health - 10); g.checkKnockdown(f, 'body', 15, { def: { path: 'body', label: 'Liver shot' }, name: 'liver' }, 'kneel'); } } }
      if (T.plexusT > 0) { T.plexusT -= dt; f.stamina = Math.min(f.stamina, 20); }
      if (T.wobbleT > 0) { T.wobbleT -= dt; f.vel.x += Math.sin(g.time * 11) * dt * 0.5; f.vel.z += Math.cos(g.time * 9) * dt * 0.5; }
      if (T.bodyTax > 0) f.stamina -= T.bodyTax * 0.004 * dt * 60 * 0.05;
      // heart: once a fight, hurt and nearly gone, the body finds one more surge
      if (!T.heart && f.health < 20 && f.health > 0 && f.daze > 60) { T.heart = true; f.stamina = Math.min(100, f.stamina + 35); f.daze = Math.max(20, f.daze - 30); g.feed(`${f.spec.short} digs deep — refuses to go`, 'cook'); }
      // accidental head clash when both duck into each other in the pocket
      T.clashCD = Math.max(0, T.clashCD - dt);
      if (f === g.f[0] && !T.clashCD && f.pos.distanceTo(o.pos) < 0.72 && f.duckK > 0.5 && o.duckK > 0.5 && Math.random() < dt * 0.3) {
        T.clashCD = 20; const O = this.init(o); T.cut[0] = Math.min(100, T.cut[0] + 22); O.cut[1] = Math.min(100, O.cut[1] + 22); g.feed('Accidental HEAD CLASH — a cut opens', 'bad'); g.fx.audio.thud && g.fx.audio.thud(); }
    }
    // 10-second clapper
    if (fight && g.roundT < 10 && (this.clapRound !== g.round)) { this.clapRound = g.round; const a = g.fx.audio; if (a && a.tone) { a.tone(820, 0.05, 0.22, 'square'); setTimeout(() => a.tone(820, 0.05, 0.22, 'square'), 120); setTimeout(() => a.tone(820, 0.05, 0.22, 'square'), 240); } }
    this.vision(dt);
  }
  // your eyes: swelling closes that side of the screen, blood tints it
  vision() {
    const g = this.game, p = g.player, el = $('ssVision'); if (!el) return; if (!p || !p.tr || !g.f.length) { el.style.cssText = ''; return; }
    const T = p.tr; const L = clamp((T.swell[0] + T.blood[0] * 0.8) / 100, 0, 1), R = clamp((T.swell[1] + T.blood[1] * 0.8) / 100, 0, 1), red = clamp((T.blood[0] + T.blood[1]) / 160, 0, 0.5);
    el.style.boxShadow = L > 0.12 || R > 0.12 ? `inset ${Math.round(L * 200)}px 0 120px rgba(12,0,8,${0.9 * L}), inset -${Math.round(R * 200)}px 0 120px rgba(12,0,8,${0.9 * R})` : 'none';
    el.style.background = red > 0.06 ? `radial-gradient(circle, transparent 48%, rgba(170,10,30,${red}) 100%)` : 'transparent';
  }

  // ---------- between rounds ----------
  roundEnded(round, totals) {
    const g = this.game;
    if ((round === 4 || round === 8) && g.settings.rounds > round) g.feed(`OPEN SCORING after ${round}: ${g.f[0].spec.short} ${totals[0]} – ${totals[1]} ${g.f[1].spec.short}`, 'cook');
    for (const f of g.f) { const T = this.init(f); T.swell = T.swell.map(v => Math.max(0, v - 4)); T.blood = [0, 0]; T.plexusT = 0; T.wobbleT = 0; T.liverT = 0; T.liverFold = false; }
    for (const f of g.f) if (!g.isHuman(f)) this.aiCorner(f);
    if (g.player && g.mode !== 'forge' && g.mode !== 'training' && round < g.settings.rounds) this.openCorner();
  }
  aiCorner(f) { const T = this.init(f); let b = 60; const want = []; if (Math.max(...T.cut) > 20) want.push('adrenaline'); if (Math.max(...T.swell) > 30) want.push('enswell'); if (!T.mouthpiece) want.push('rinse'); want.push('ice', 'breathe', 'vaseline'); for (const a of want) { const c = CORNER.find(x => x.id === a); if (b >= c.cost) { b -= c.cost; this.apply(f, a); } } }
  apply(f, act) {
    const T = this.init(f);
    if (act === 'enswell') T.swell = T.swell.map(v => Math.max(0, v - 45));
    if (act === 'adrenaline') { T.cut = T.cut.map(v => Math.max(0, v - 60)); T.blood = [0, 0]; }
    if (act === 'vaseline') T.vaseline = [0.85, 0.85];
    if (act === 'ice') { f.daze = Math.max(0, f.daze - 30); f.stamina = Math.min(100, f.stamina + 25); }
    if (act === 'breathe') { T.bodyTax = Math.max(0, T.bodyTax - 25); f.stamina = 100; f.bodyDmg *= 0.85; }
    if (act === 'rinse') T.mouthpiece = true;
  }
  advice() {
    const g = this.game, p = g.player, o = g.opponentOf(p), T = this.init(p), O = this.init(o);
    if (p.bodyDmg > 35) return "He's digging to your liver — elbows down when he's close, turn your body shots back on him.";
    if (Math.max(T.cut[0], T.swell[0]) > 35) return "Your left eye's going — watch the right hand from that side. Move to your right.";
    if (Math.max(T.cut[1], T.swell[1]) > 35) return "Your right eye's going — watch his hook. Circle left, keep the right hand high.";
    if (Math.max(O.cut[0], O.cut[1], O.swell[0], O.swell[1]) > 35) return "He's bleeding — go to that eye. Double the jab, then the right hand.";
    if (o.bodyDmg > 30) return "He's hurt downstairs. Go to the body — the head will come.";
    return 'Win the lead-foot battle. Step outside his front foot and line up the right hand.';
  }
  openCorner() {
    const g = this.game; this.cornerOpen = true; g.corner.open(); // the 10-second hands-on corner (corner.js)
  }
  renderCorner() {
    const g = this.game, p = g.player, T = this.init(p), el = $('ssCorner'); const pct = v => Math.round(v);
    el.innerHTML = `<div class="ss-box"><div class="eb">ROUND ${g.round} DONE · YOUR CORNER</div><h2>Stool time — <span>${this.budget}s</span> left</h2>
      <div class="ss-advice">Trainer: “${this.advice()}”</div>
      <div class="ss-med">Swelling L/R <b>${pct(T.swell[0])}/${pct(T.swell[1])}</b> · Cuts L/R <b>${pct(T.cut[0])}/${pct(T.cut[1])}</b> · Nose <b>${pct(T.nose)}</b> · Jaw <b>${pct(T.jaw)}</b> · Hands <b>${pct(100 - T.hand[0])}/${pct(100 - T.hand[1])}</b>${T.mouthpiece ? '' : ' · <b>MOUTHPIECE OUT</b>'}</div>
      <div class="ss-grid">${CORNER.map(c => `<button class="ss-card${c.cost > this.budget ? ' off' : ''}" data-nav="1" data-ss="${c.id}"><b>${c.name} <i>−${c.cost}s</i></b><span>${c.desc}</span></button>`).join('')}</div>
      <div class="row"><button class="go" id="ssDone">STAND UP — NEXT ROUND</button><button class="go alt" id="ssTowel">THROW IN THE TOWEL</button></div></div>`;
    el.querySelectorAll('[data-ss]').forEach(b => b.onclick = () => { const c = CORNER.find(x => x.id === b.dataset.ss); if (this.budget < c.cost) return; this.budget -= c.cost; this.apply(p, c.id); g.fx.audio.tone && g.fx.audio.tone(520, 0.05, 0.15, 'sine'); this.renderCorner(); });
    $('ssDone').onclick = () => this.closeCorner(); $('ssTowel').onclick = () => { this.closeCorner(); g.finish(g.opponentOf(p), 'TKO', 'corner stoppage'); };
  }
  closeCorner() { if (this.game.corner && this.game.corner.active) return this.game.corner.close('stand'); this.cornerOpen = false; $('ssCorner').classList.add('hidden'); }
}
