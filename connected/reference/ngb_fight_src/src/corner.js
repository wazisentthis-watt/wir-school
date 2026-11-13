// THE CORNER — 10 seconds on the stool, played like its own mini-game.
// Close-up of your fighter's face. Dig your finger into the Vaseline jar (top-down; the jelly grooves where you drag), smear it on his
// brows and cheekbones exactly where your finger goes (scored on coverage, grease in the eye costs you). Pour water in his mouth, hold the
// bucket under him to spit, rub the cold enswell on a swelling, and TALK to him: hold the mic, tell him what you saw — the right words
// (what really happened this round + what to do + belief) become +1…+3 attributes and a read on that punch next round.
import * as THREE from 'three';
import { analyzeTalk, suggestions } from './coach.js';
import { STRIKES } from './combat.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
const CORNER_TIME = 10;
// face landmarks in the fighter's head frame (m): x = his own left, y up, z out of the face
const FACE = {
  brow: [[0.036, 0.012, 0.092], [-0.036, 0.012, 0.092]], cheek: [[0.04, -0.034, 0.086], [-0.04, -0.034, 0.086]],
  eye: [[0.036, -0.017, 0.092], [-0.036, -0.017, 0.092]], mouth: [0, -0.062, 0.086],
};
const FAMS = ['jab', 'cross', 'hook', 'upper', 'body', 'over'];
export function famOf(f, s) { // which punch family a strike is, from the thrower's point of view
  const d = s.def || s; if (d.target === 'body') return 'body'; if (d.path === 'straight') return s.hi === (f.stance === 'southpaw' ? 1 : 0) ? 'jab' : 'cross'; if (d.path === 'body') return 'body'; return d.path === 'over' ? 'over' : d.path;
}

export class Corner {
  constructor(game) { this.g = game; this.active = false; this.fam0 = null; }
  get P() { return this.g.player; }
  // ---------- what happened this round (for the talk) ----------
  report() {
    const g = this.g, P = this.P, O = g.opponentOf(P);
    const cnt = f => { const out = {}; FAMS.forEach(k => out[k] = 0); for (const [nm, v] of Object.entries(f.stats.byStrike || {})) { const d = STRIKES[nm]; if (!d) continue; out[famOf(f, { def: d, hi: d.hand === 'L' ? 0 : 1 })] += v.l || 0; } return out; };
    const now = { they: cnt(O), you: cnt(P) }; const prev = this.prevCounts || { they: {}, you: {} }; this.prevCounts = now;
    const d = (a, b) => Object.fromEntries(FAMS.map(k => [k, (a[k] || 0) - (b[k] || 0)]));
    return { theyLanded: d(now.they, prev.they), youLanded: d(now.you, prev.you), theirName: O.spec.short };
  }
  // ---------- open / close ----------
  open() {
    const g = this.g, P = this.P; if (!P) return; this.active = true; this.t = CORNER_TIME; this.rep = this.report(); this.T = g.ss.init(P);
    this.load = 0; this.sip = 0; this.spat = false; this.rub = [0, 0]; this.talk = null; this.drag = null; this.drops = []; this.spitT = 0; this.waterBefore = false; this.grooves = 0; this.log = [];
    P.cornerRest = true; if (g.pmk) g.pmk.demo = true; document.body.classList.add('cornerOn');
    this.build(); this.resize(); g.fx.audio.tone && g.fx.audio.tone(330, 0.12, 0.2, 'triangle');
  }
  close(why = 'time') {
    if (!this.active) return; const g = this.g, P = this.P, T = this.T; this.active = false; this.unbind();
    try { this.rec && this.rec.stop(); } catch (e) {}
    const res = this.score(); // vaseline & medical effects
    const lines = [];
    if (res.grease) lines.push(`Vaseline L ${Math.round(res.grease[0] * 100)}% · R ${Math.round(res.grease[1] * 100)}%${res.eye ? ' · grease in his eye!' : ''}`);
    if (this.sip > 0) { const gain = Math.min(25, this.sip * 40) * (this.sip > 1.4 ? 0.4 : 1); P.stamina = Math.min(100, P.stamina + gain); lines.push(this.sip > 1.4 ? 'Too much water — he’s sloshing' : `Water +${Math.round(gain)} stamina`); }
    if (this.spat) lines.push(this.waterBefore ? 'Rinsed & spat — mouthpiece clean' : 'Spat — mouthpiece back in');
    if (this.rub[0] + this.rub[1] > 0) lines.push(`Enswell: swelling L ${Math.round(T.swell[0])} · R ${Math.round(T.swell[1])}`);
    if (this.talk && this.talk.buffs.length) lines.push('Talk: ' + this.talk.buffs.map(b => `+${b.n} ${b.attr.toUpperCase()}`).join(' · '));
    if (!lines.length) lines.push('Nothing done in the corner');
    P.cornerRest = false; if (g.pmk) g.pmk.demo = false; document.body.classList.remove('cornerOn');
    const el = $('ssCorner'); el.classList.add('hidden'); el.classList.remove('cnLive'); el.innerHTML = ''; g.ss.cornerOpen = false;
    for (const l of lines) g.feed('Corner: ' + l, 'cook'); g.announce('SECONDS OUT', lines.slice(0, 2).join(' · '), 2.2);
    this.lastResult = { lines, ...res, sip: this.sip, spat: this.spat, talk: this.talk };
  }
  // ---------- the close-up camera ----------
  camPose() {
    const P = this.P; const head = P.vol.head.a.clone(); const fw = P.forward; const portrait = innerWidth < innerHeight;
    return { pos: head.clone().addScaledVector(fw, portrait ? 0.85 : 0.68).add(new THREE.Vector3(0, 0.015, 0)), look: head.clone().add(new THREE.Vector3(0, portrait ? -0.1 : -0.07, 0)), fov: portrait ? 44 : 34 };
  }
  // project a face point (head frame) to screen px
  scr(p) {
    const P = this.P, g = this.g; const w = P.vol.head.a.clone().add(P.dirWorld(new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(P.scale || 1))); const v = w.project(g.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }
  zones() {
    const s = this.scr.bind(this); const c = s([0, 0, 0.09]), r = s([0.1, 0, 0.09]); const ppm = Math.max(40, Math.hypot(r.x - c.x, r.y - c.y) / 0.1); this.ppm = ppm;
    return { ppm, brow: FACE.brow.map(s), cheek: FACE.cheek.map(s), eye: FACE.eye.map(s), mouth: s(FACE.mouth), rb: [0.028 * ppm, 0.011 * ppm], rc: [0.022 * ppm, 0.014 * ppm], re: [0.017 * ppm, 0.009 * ppm], rm: 0.03 * ppm };
  }
  // ---------- DOM ----------
  build() {
    const el = $('ssCorner'), T = this.T, sug = suggestions(this.rep); el.classList.remove('hidden'); el.classList.add('cnLive');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; this.SR = SR;
    el.innerHTML = `<canvas id="cnSmear"></canvas><canvas id="cnFx"></canvas>
      <div class="cn-top"><div><span class="cn-eb">ROUND ${this.g.round} · YOUR CORNER</span><b>Work fast.</b><em>${this.med()}</em></div><div class="cn-clock"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/><circle id="cnRing" cx="22" cy="22" r="19"/></svg><span id="cnT">10</span></div></div>
      <div class="cn-jar"><canvas id="cnJar" width="340" height="340"></canvas><span>VASELINE · dig in, then smear his brows</span><i id="cnLoad"></i></div>
      <div class="cn-tools"><div class="cn-tool" data-tool="water" title="Water — drag to his mouth and hold">${ICON.water}<span>WATER</span></div><div class="cn-tool" data-tool="bucket" title="Bucket — hold under his mouth">${ICON.bucket}<span>SPIT</span></div><div class="cn-tool" data-tool="enswell" title="Enswell — rub on a swelling">${ICON.enswell}<span>ENSWELL</span></div></div>
      <div class="cn-talk"><div id="cnSaid" class="cn-said">${SR ? 'Hold the mic and tell him what you saw.' : 'Type what you’d tell him — or tap a line.'}</div><div id="cnReply" class="cn-reply hidden"></div>
        <div class="cn-row"><button class="cn-mic" id="cnMic" data-nav="1">${ICON.mic}<span>${SR ? 'HOLD TO TALK' : 'TALK'}</span></button>${SR ? '' : '<input id="cnType" placeholder="He keeps landing the jab — slip left…" enterkeyhint="send">'}</div>
        <div class="cn-row cn-sug">${sug.map((x, i) => `<button class="pill" data-sug="${i}">${x}</button>`).join('')}</div></div>
      <div class="cn-bar"><button class="pill" id="cnQuick">QUICK GREASE</button><button class="pill" id="cnQWater">SIP</button><button class="pill" id="cnQSpit">SPIT</button><button class="go" id="cnUp">STAND UP</button></div>`;
    this.cvS = $('cnSmear'); this.cvF = $('cnFx'); this.cvJ = $('cnJar'); this.cxS = this.cvS.getContext('2d'); this.cxF = this.cvF.getContext('2d'); this.cxJ = this.cvJ.getContext('2d');
    this.drawJar(true); this.bind(sug);
  }
  med() { const T = this.T, r = Math.round; const bits = []; if (T.cut[0] + T.cut[1] > 0) bits.push(`cut L${r(T.cut[0])}/R${r(T.cut[1])}`); if (T.swell[0] + T.swell[1] > 8) bits.push(`swelling L${r(T.swell[0])}/R${r(T.swell[1])}`); if (!T.mouthpiece) bits.push('MOUTHPIECE OUT'); bits.push(`stamina ${r(this.P.stamina)}`); return bits.join(' · '); }
  resize() { const d = Math.min(2, devicePixelRatio || 1); for (const c of [this.cvS, this.cvF]) { c.width = innerWidth * d; c.height = innerHeight * d; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; } this.dpr = d; this.cxS.setTransform(d, 0, 0, d, 0, 0); this.cxF.setTransform(d, 0, 0, d, 0, 0); }
  bind(sug) {
    const fx = this.cvF, jar = this.cvJ; const pt = e => ({ x: e.clientX, y: e.clientY });
    const inJar = p => { const r = jar.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return Math.hypot(p.x - cx, p.y - cy) < r.width * 0.43 ? { x: (p.x - r.left) / r.width * 340, y: (p.y - r.top) / r.height * 340 } : null; };
    const down = e => { if (!this.active) return; if (e.target.closest && e.target.closest('button, input')) return; const p = pt(e); const tool = e.target.closest && e.target.closest('[data-tool]');
      if (tool) { this.drag = { tool: tool.dataset.tool, p, last: p, held: 0 }; e.preventDefault(); return; }
      this.finger = { p, last: p, jar: !!inJar(p) }; e.preventDefault(); };
    const move = e => { if (!this.active) return; const p = pt(e); if (this.drag) { this.drag.last = this.drag.p; this.drag.p = p; if (this.drag.tool === 'enswell') this.enswellRub(this.drag.last, p); e.preventDefault(); return; }
      if (!this.finger) { this.hover = p; return; } const f = this.finger; const j = inJar(p);
      if (j) { const lj = inJar(f.last) || j; this.groove(lj, j); const dist = Math.hypot(j.x - lj.x, j.y - lj.y); this.load = Math.min(1, this.load + dist / 340 * 1.6); f.jar = true; }
      else if (this.load > 0.02) this.smear(f.last, p);
      f.last = p; f.p = p; e.preventDefault(); };
    const up = () => { if (this.drag && this.drag.tool === 'water' && this.sip > 0) this.waterBefore = true; this.drag = null; this.finger = null; };
    const el = $('ssCorner'); el.addEventListener('pointerdown', down, { passive: false }); addEventListener('pointermove', this._mv = move, { passive: false }); addEventListener('pointerup', this._up = up); addEventListener('pointercancel', this._up);
    addEventListener('resize', this._rs = () => this.active && this.resize());
    // mic
    const mic = $('cnMic');
    if (this.SR) { mic.addEventListener('pointerdown', e => { e.stopPropagation(); this.listen(true); }); mic.addEventListener('pointerup', () => this.listen(false)); mic.addEventListener('pointerleave', () => this.listening && this.listen(false)); mic.onclick = () => { if (!this.listening && !this.heardAny) this.listen(true); }; }
    else { const ti = $('cnType'); mic.onclick = () => ti && ti.focus(); if (ti) ti.addEventListener('keydown', e => { if (e.key === 'Enter') { this.hear(ti.value, 1); ti.blur(); } }); }
    el.querySelectorAll('[data-sug]').forEach(b => b.onclick = () => this.hear(sug[+b.dataset.sug], 0.75));
    $('cnQuick').onclick = () => this.quickGrease(); $('cnQWater').onclick = () => { this.sip = Math.max(this.sip, 0.6); this.waterBefore = true; this.pour(0.6); }; $('cnQSpit').onclick = () => this.doSpit();
    $('cnUp').onclick = () => this.close('stand');
  }
  unbind() { removeEventListener('pointermove', this._mv); removeEventListener('pointerup', this._up); removeEventListener('pointercancel', this._up); removeEventListener('resize', this._rs); }
  // ---------- talk ----------
  listen(on) {
    if (!this.SR) return;
    if (on && !this.listening) {
      try { const r = this.rec = new this.SR(); r.lang = 'en-US'; r.interimResults = true; r.continuous = true; this.said = ''; this.listening = true; $('cnMic').classList.add('on');
        r.onresult = ev => { let fin = '', tmp = ''; for (let i = 0; i < ev.results.length; i++) { const x = ev.results[i]; if (x.isFinal) fin += x[0].transcript + ' '; else tmp += x[0].transcript; } this.said = (fin + tmp).trim(); this.heardAny = true; $('cnSaid').textContent = '“' + this.said + '”'; };
        r.onerror = ev => { this.listening = false; $('cnMic').classList.remove('on'); if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') $('cnSaid').textContent = 'Mic blocked here — tap a line below (or open the game in its own tab).'; };
        r.onend = () => { this.listening = false; $('cnMic') && $('cnMic').classList.remove('on'); if (this.said) this.hear(this.said, 1); };
        r.start(); this.g.fx.audio.tone && this.g.fx.audio.tone(880, 0.05, 0.12, 'sine'); } catch (e) { this.listening = false; }
    } else if (!on && this.listening) { try { this.rec.stop(); } catch (e) {} }
  }
  hear(text, weight) {
    const g = this.g, P = this.P; if (!text || !text.trim()) return; const r = analyzeTalk(text, this.rep);
    if (weight < 1) r.buffs.forEach(b => b.n = Math.max(1, Math.round(b.n * weight)));
    // undo a previous talk this corner (only your best one counts)
    if (this.talk) { for (const b of this.talk.buffs) P.attr[b.attr] -= b.n; if (r.score <= this.talk.score) { for (const b of this.talk.buffs) P.attr[b.attr] += b.n; return; } }
    for (const b of r.buffs) P.attr[b.attr] = (P.attr[b.attr] || 70) + b.n; if (r.read) P.cornerRead = r.read; P.focus = clamp(P.focus + r.focus, 0, 100); P.stamina = clamp(P.stamina + r.stamina, 0, 100);
    P.cornerBuffs = r.buffs; this.talk = r; const el = $('cnReply'); if (!el) return;
    el.innerHTML = `<b>${P.spec.short}:</b> “${r.reply}”${r.buffs.length ? '<div>' + r.buffs.map(b => `<i>+${b.n} ${b.attr.toUpperCase()}</i> <small>${b.why}</small>`).join(' ') + '</div>' : ''}`; el.classList.remove('hidden');
    $('cnSaid').textContent = '“' + text + '”';
    try { if (window.speechSynthesis && weight >= 1) { const u = new SpeechSynthesisUtterance(r.reply.replace(/[—…]/g, ' ')); u.rate = 1.15; u.pitch = 0.8; u.volume = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {}
    g.fx.audio.tone && g.fx.audio.tone(r.buffs.length ? 990 : 300, 0.08, 0.18, 'sine');
  }
  // ---------- vaseline ----------
  drawJar(fresh) {
    const c = this.cxJ, W = 340, R = 150; if (fresh) {
      c.clearRect(0, 0, W, W);
      const rim = c.createRadialGradient(W / 2, W / 2, R - 6, W / 2, W / 2, R + 12); rim.addColorStop(0, '#9aa7b3'); rim.addColorStop(0.5, '#e9f1f6'); rim.addColorStop(1, '#5b6772'); c.fillStyle = rim; c.beginPath(); c.arc(W / 2, W / 2, R + 12, 0, 7); c.fill();
      const jel = c.createRadialGradient(W / 2 - 30, W / 2 - 35, 10, W / 2, W / 2, R); jel.addColorStop(0, '#fffbe6'); jel.addColorStop(0.55, '#f3e7b4'); jel.addColorStop(1, '#d9c27a'); c.fillStyle = jel; c.beginPath(); c.arc(W / 2, W / 2, R, 0, 7); c.fill();
      c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, W / 2, R - 22, 3.6, 4.6); c.stroke(); c.globalAlpha = 1;
    }
  }
  groove(a, b) { // the jelly moves where your finger drags: a dented trough with a bright ridge pushed up beside it
    const c = this.cxJ; c.save(); c.beginPath(); c.arc(170, 170, 150, 0, 7); c.clip(); c.lineCap = 'round';
    c.strokeStyle = 'rgba(176,146,70,.55)'; c.lineWidth = 26; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.strokeStyle = 'rgba(120,96,40,.35)'; c.lineWidth = 12; c.beginPath(); c.moveTo(a.x + 2, a.y + 3); c.lineTo(b.x + 2, b.y + 3); c.stroke();
    c.strokeStyle = 'rgba(255,255,240,.8)'; c.lineWidth = 5; c.beginPath(); c.moveTo(a.x - 12, a.y - 10); c.lineTo(b.x - 12, b.y - 10); c.stroke(); c.restore();
    this.grooves++; if (this.grooves % 6 === 0) this.g.fx.audio.noise && this.g.fx.audio.noise(0.05, 700, 300, 1, 0.05);
  }
  smear(a, b) { // exactly where your finger goes; thick and glossy while the finger is loaded, thinning as it runs out
    const c = this.cxS, L = this.load, dist = Math.hypot(b.x - a.x, b.y - a.y); if (dist < 0.5) return; const w = (5 + 11 * L) * (this.ppm || 400) / 400;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = `rgba(255,248,214,${0.12 + 0.22 * L})`; c.lineWidth = w; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${0.18 + 0.3 * L})`; c.lineWidth = Math.max(1.5, w * 0.22); c.beginPath(); c.moveTo(a.x - w * 0.15, a.y - w * 0.2); c.lineTo(b.x - w * 0.15, b.y - w * 0.2); c.stroke();
    this.load = Math.max(0, L - dist / (this.ppm || 400) * 3.2);
  }
  quickGrease() { // controller: the cutman does a rough job for you
    const z = this.zones(); this.load = 1; for (const i of [0, 1]) { const b = z.brow[i]; for (let k = 0; k < 3; k++) { this.load = 1; this.smear({ x: b.x - z.rb[0] * 0.9, y: b.y + (k - 1) * z.rb[1] * 0.7 }, { x: b.x + z.rb[0] * 0.9, y: b.y + (k - 1) * z.rb[1] * 0.7 }); } } this.load = 0;
  }
  coverage(cx, cy, rx, ry) { // fraction of an ellipse covered with grease
    const d = this.dpr, n = 18; let hit = 0, tot = 0; const img = this.cxS.getImageData(Math.max(0, (cx - rx) * d) | 0, Math.max(0, (cy - ry) * d) | 0, Math.max(1, rx * 2 * d) | 0, Math.max(1, ry * 2 * d) | 0); const W = img.width, H = img.height;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const u = (i + 0.5) / n * 2 - 1, v = (j + 0.5) / n * 2 - 1; if (u * u + v * v > 1) continue; tot++; const x = ((u + 1) / 2 * (W - 1)) | 0, y = ((v + 1) / 2 * (H - 1)) | 0; if (img.data[(y * W + x) * 4 + 3] > 40) hit++; }
    return tot ? hit / tot : 0;
  }
  score() {
    const T = this.T, z = this.zones(); const out = {};
    const cov = [0, 1].map(i => ({ brow: this.coverage(z.brow[i].x, z.brow[i].y, z.rb[0], z.rb[1]), cheek: this.coverage(z.cheek[i].x, z.cheek[i].y, z.rc[0], z.rc[1]), eye: this.coverage(z.eye[i].x, z.eye[i].y, z.re[0], z.re[1]) }));
    if (cov.some(c => c.brow + c.cheek > 0.05)) {
      out.grease = cov.map(c => clamp(c.brow * 0.75 + c.cheek * 0.25, 0, 1)); out.cov = cov;
      out.grease.forEach((q, i) => { T.vaseline[i] = Math.max(T.vaseline[i] * 0.5, q * 0.95); });
      out.eye = cov.some(c => c.eye > 0.3); cov.forEach((c, i) => { if (c.eye > 0.3) T.blood[i] = Math.min(100, T.blood[i] + 30 * c.eye); });
    }
    if (this.spat) { T.mouthpiece = true; if (this.waterBefore) T.jaw = Math.max(0, T.jaw - 10); }
    return out;
  }
  // ---------- water / spit / enswell ----------
  pour(dt) { this.sip += dt; if (Math.random() < 0.3) this.g.fx.audio.noise && this.g.fx.audio.noise(0.06, 1800, 900, 1, 0.04); }
  doSpit() { if (this.spat) return; this.spat = true; this.spitT = 0.6; this.g.fx.audio.noise && this.g.fx.audio.noise(0.25, 1200, 300, 1, 0.12); const z = this.zones(); for (let i = 0; i < 26; i++) this.drops.push({ x: z.mouth.x, y: z.mouth.y, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 160, t: 0.7, c: this.waterBefore ? '#cfe9ff' : '#f2dfe6' }); }
  enswellRub(a, b) {
    const z = this.zones(), T = this.T; for (const i of [0, 1]) { const e = z.eye[i], br = z.brow[i]; const cx = (e.x + br.x) / 2, cy = (e.y + br.y) / 2 + z.re[1];
      if (Math.hypot(b.x - cx, b.y - cy) < z.rb[0] * 1.2) { const d = Math.hypot(b.x - a.x, b.y - a.y) / z.ppm; this.rub[i] += d; T.swell[i] = Math.max(0, T.swell[i] - d * 140); T.cut[i] = Math.max(0, T.cut[i] - d * 70); T.blood[i] = Math.max(0, T.blood[i] - d * 200); } }
  }
  // ---------- per frame ----------
  tick(dt) {
    if (!this.active) return; this.t -= dt; const ring = $('cnRing'), tl = $('cnT'); if (tl) tl.textContent = Math.max(0, Math.ceil(this.t)); if (ring) { ring.style.strokeDashoffset = (119.4 * (1 - clamp(this.t / CORNER_TIME, 0, 1))).toFixed(1); ring.classList.toggle('low', this.t < 3.5); }
    if (this.t <= 0) { if (this.listening) this.listen(false); return this.close('time'); }
    const z = this.zones(), c = this.cxF; c.clearRect(0, 0, innerWidth, innerHeight);
    // target guides: where the grease goes (fade once covered)
    c.setLineDash([5, 6]); c.lineWidth = 1.5;
    for (const i of [0, 1]) { const b = z.brow[i]; c.strokeStyle = 'rgba(255,214,120,.45)'; c.beginPath(); c.ellipse(b.x, b.y, z.rb[0], z.rb[1], 0, 0, 7); c.stroke(); const k = z.cheek[i]; c.strokeStyle = 'rgba(255,214,120,.25)'; c.beginPath(); c.ellipse(k.x, k.y, z.rc[0], z.rc[1], 0, 0, 7); c.stroke(); }
    c.setLineDash([]);
    if (this.T.swell[0] + this.T.swell[1] > 8) for (const i of [0, 1]) if (this.T.swell[i] > 8) { const e = z.eye[i]; c.fillStyle = `rgba(150,40,90,${clamp(this.T.swell[i] / 120, 0.1, 0.45)})`; c.beginPath(); c.ellipse(e.x, e.y + z.re[1] * 0.6, z.re[0] * 1.5, z.re[1] * 1.8, 0, 0, 7); c.fill(); }
    // your fingertip with whatever it picked up
    const fp = this.finger ? this.finger.p : this.hover; if (fp) { c.fillStyle = `rgba(255,246,205,${0.25 + 0.6 * this.load})`; c.beginPath(); c.arc(fp.x, fp.y, 7 + 14 * this.load, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.stroke(); }
    const ld = $('cnLoad'); if (ld) ld.style.width = Math.round(this.load * 100) + '%';
    // tools in hand
    if (this.drag) { const d = this.drag, p = d.p; const m = z.mouth; const near = Math.hypot(p.x - m.x, p.y - m.y) < z.rm * 2.4;
      if (d.tool === 'water') { this.drawIcon(c, 'water', p); if (near) { this.pour(dt); c.strokeStyle = 'rgba(160,215,255,.85)'; c.lineWidth = 4; c.beginPath(); c.moveTo(p.x - 18, p.y - 30); c.quadraticCurveTo((p.x + m.x) / 2, Math.min(p.y, m.y) - 20, m.x, m.y); c.stroke(); } }
      else if (d.tool === 'bucket') { this.drawIcon(c, 'bucket', p); const under = p.y > m.y + z.rm * 0.5 && Math.abs(p.x - m.x) < z.rm * 3 && p.y < m.y + z.rm * 9; d.held = under ? d.held + dt : 0; if (d.held > 0.35) this.doSpit(); }
      else this.drawIcon(c, 'enswell', p); }
    // spit / water droplets
    for (const q of this.drops) { q.t -= dt; q.vy += 600 * dt; q.x += q.vx * dt; q.y += q.vy * dt; c.fillStyle = q.c; c.globalAlpha = clamp(q.t / 0.7, 0, 1); c.beginPath(); c.arc(q.x, q.y, 3, 0, 7); c.fill(); } c.globalAlpha = 1; this.drops = this.drops.filter(q => q.t > 0);
    if (window.__cornerDebug) { c.fillStyle = '#0f0'; for (const k of ['brow', 'cheek', 'eye']) z[k].forEach(p => { c.fillRect(p.x - 3, p.y - 3, 6, 6); c.fillText(k, p.x + 5, p.y); }); c.fillRect(z.mouth.x - 3, z.mouth.y - 3, 6, 6); }
  }
  drawIcon(c, k, p) { c.save(); c.translate(p.x, p.y); c.font = '44px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText({ water: '🧴', bucket: '🪣', enswell: '🧊' }[k], 0, 0); c.restore(); }
}
const ICON = {
  water: '<svg viewBox="0 0 40 60"><rect x="12" y="2" width="16" height="8" rx="2" fill="#2bb3ff"/><path d="M10 12h20l3 8v34a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4V20z" fill="#bfe6ff" stroke="#7cc6f0" stroke-width="2"/><rect x="9" y="30" width="22" height="14" fill="#ff2f86" opacity=".7"/></svg>',
  bucket: '<svg viewBox="0 0 60 56"><path d="M6 16h48l-6 36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#c9d3dc" stroke="#7f8b96" stroke-width="2"/><path d="M8 16 Q30 -6 52 16" fill="none" stroke="#7f8b96" stroke-width="3"/><ellipse cx="30" cy="16" rx="24" ry="5" fill="#9fb0bd"/></svg>',
  enswell: '<svg viewBox="0 0 60 60"><rect x="24" y="4" width="12" height="28" rx="4" fill="#3a2a1d"/><path d="M10 34h40l-4 20H14z" fill="#d4dde5" stroke="#8994a0" stroke-width="2"/><path d="M14 40h32" stroke="#fff" stroke-width="2" opacity=".7"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
};
