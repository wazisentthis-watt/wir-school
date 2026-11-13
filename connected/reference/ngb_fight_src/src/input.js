// Gamepad layer (SteelSeries Nimbus / Nimbus+ / any standard-mapping pad) + controller menu navigation.
// Standard mapping: 0 A, 1 B, 2 X, 3 Y, 4 L1, 5 R1, 6 L2, 7 R2, 8 Options/Back, 9 Menu, 10 L3, 11 R3, 12-15 D-pad U/D/L/R, 16 Home
export const BTN = { A: 0, B: 1, X: 2, Y: 3, L1: 4, R1: 5, L2: 6, R2: 7, OPT: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.2;

export class Pads {
  constructor() {
    this.prev = {}; this.state = []; this.blocked = false; this.lastUse = -1;
    try { if (document.featurePolicy && document.featurePolicy.allowsFeature && !document.featurePolicy.allowsFeature('gamepad')) this.blocked = true; } catch (e) {}
    this.supported = typeof navigator.getGamepads === 'function';
  }
  raw() {
    if (!this.supported || this.blocked) return [];
    let list;
    try { list = navigator.getGamepads(); } catch (e) { this.blocked = true; return []; }
    return Array.from(list || []).filter(g => g && g.connected !== false);
  }
  poll(now) {
    const out = [];
    for (const gp of (window.__fakePads || this.raw())) {
      const b = gp.buttons.map(x => typeof x === 'object' ? (x.pressed || x.value > 0.5) : x > 0.5);
      const v = gp.buttons.map(x => typeof x === 'object' ? x.value : x);
      const prev = this.prev[gp.index] || { b: [], ax: [0, 0, 0, 0] };
      const ax = gp.axes.slice(0, 4).map(a => Math.abs(a) < DEAD ? 0 : (a - Math.sign(a) * DEAD) / (1 - DEAD));
      while (ax.length < 4) ax.push(0);
      const down = new Set(), up = new Set();
      b.forEach((x, i) => { if (x && !prev.b[i]) down.add(i); if (!x && prev.b[i]) up.add(i); });
      // left stick as a d-pad for menus (edge)
      const stickDir = (x, y) => Math.hypot(x, y) < 0.6 ? null : Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
      const sd = stickDir(ax[0], ax[1]), psd = stickDir(prev.ax[0], prev.ax[1]);
      const st = { index: gp.index, id: gp.id || 'Controller', gp, b, v, ax, down, up, stickEdge: sd && sd !== psd ? sd : null, prevAx: prev.ax };
      if (down.size || Math.hypot(ax[0], ax[1]) > 0.3 || Math.hypot(ax[2], ax[3]) > 0.3) this.lastUse = now;
      this.prev[gp.index] = { b, ax };
      out.push(st);
    }
    this.state = out; return out;
  }
  rumble(index, strong, weak, ms) {
    const st = this.state.find(s => s.index === index); if (!st || !st.gp) return;
    try { const a = st.gp.vibrationActuator; if (a && a.playEffect) a.playEffect(a.type || 'dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {}); } catch (e) {}
  }
}

// Map one pad's frame onto a fighter: returns {actions:[...], move:[lat,fwd], weave, duck, pull, guard, clinch}
// Face buttons: X jab · Y straight · A left hook · B right hook · X+A left uppercut · Y+B right uppercut (chord within 60ms)
// Hold L1 = heavy (X/Y become overhands) · hold L2 = to the body · hold R1 = clinch · R2 = guard
// D-pad: ◀ cook left glove · ▶ cook right glove · ▲ cycle left recipe · ▼ cycle right recipe · L2+▲/▼ Weightshift
const CHORD = 0.06;
export function padFight(st, ps, now) {
  const L1 = (st.v[BTN.L1] || 0) > 0.4, L2 = (st.v[BTN.L2] || 0) > 0.35, R1 = (st.v[BTN.R1] || 0) > 0.4, R2 = (st.v[BTN.R2] || 0) > 0.3;
  const acts = []; const d = st.down;
  const emit = (combo) => acts.push({ a: 'strike', combo, body: L2, heavy: L1 });
  const faces = [['X', BTN.X], ['Y', BTN.Y], ['A', BTN.A], ['B', BTN.B]];
  const pair = { X: 'A', A: 'X', Y: 'B', B: 'Y' };
  for (const [n, b] of faces) {
    if (!d.has(b)) continue;
    if (ps.pending && ps.pending.n === pair[n] && now - ps.pending.t <= CHORD) { emit(n === 'X' || n === 'A' ? 'XA' : 'YB'); ps.pending = null; continue; }
    if (ps.pending) { emit(ps.pending.n); ps.pending = null; }
    ps.pending = { n, t: now, body: L2, heavy: L1 };
  }
  if (ps.pending && now - ps.pending.t > CHORD) { acts.push({ a: 'strike', combo: ps.pending.n, body: ps.pending.body || L2, heavy: ps.pending.heavy || L1 }); ps.pending = null; }
  const P = (b, a) => { if (d.has(b)) acts.push({ a }); };
  if (L2) { P(BTN.UP, 'wsUp'); P(BTN.DOWN, 'wsDown'); P(BTN.LEFT, 'cookL'); P(BTN.RIGHT, 'cookR'); }
  else { P(BTN.UP, 'cycleL'); P(BTN.DOWN, 'cycleR'); P(BTN.LEFT, 'cookL'); P(BTN.RIGHT, 'cookR'); }
  P(BTN.OPT, 'cam'); P(BTN.L3, 'wsCycle'); P(BTN.R3, 'switch'); P(BTN.MENU, 'pause');
  // right stick = all head movement: ← → weave (analog), ↓ duck, ↑ pull back, fast flick into ↙/↘ = roll
  const rx = st.ax[2], ry = st.ax[3], mag = Math.hypot(rx, ry);
  if (mag < 0.25) { ps.leftAt = null; ps.armed = false; } else if (ps.leftAt == null) ps.leftAt = now;
  let roll = false;
  if (!ps.armed && ry > 0.5 && Math.abs(rx) > 0.45 && ps.leftAt != null && now - ps.leftAt < 0.16) { acts.push({ a: rx < 0 ? 'rollL' : 'rollR' }); ps.armed = true; roll = true; }
  if (ps.armed) roll = true;
  return { actions: acts, move: [-st.ax[0], -st.ax[1]], weave: roll ? 0 : -rx, duck: roll ? 0 : Math.max(0, ry), pull: Math.max(0, -ry), guard: R2 ? (L2 ? 'low' : 'high') : null, clinch: R1 };
}

// ---------- spatial menu navigation ----------
export class MenuNav {
  constructor(game) { this.game = game; this.el = null; this.key = null; }
  screen() { for (const id of ['pmk', 'pmkCal', 'ssCorner', 'pause', 'report', 'kitchen', 'log', 'menu']) { const s = document.getElementById(id); if (s && !s.classList.contains('hidden')) return s; } return null; }
  targets(scr) { return Array.from(scr.querySelectorAll('.card, .pill, .go, .chip[data-r], [data-prep], [data-nav]')).filter(e => e.offsetParent !== null && !e.closest('.hidden')); }
  keyOf(e) { if (e.id) return '#' + e.id; const host = e.closest('[id]'); for (const a of ['m', 'f', 'd', 'r', 'l', 'g', 'prep', 'rules', 'wc', 'lt', 'nav']) if (e.dataset[a] !== undefined) return (host ? '#' + host.id + ' ' : '') + `[data-${a}="${e.dataset[a]}"]` + (e.dataset.g !== undefined && a !== 'g' ? `[data-g="${e.dataset.g}"]` : ''); return null; }
  restore(scr) { if (this.el && this.el.isConnected && scr.contains(this.el)) return this.el; if (this.key) { try { const e = scr.querySelector(this.key); if (e) return this.set(e); } catch (x) {} } return null; }
  set(e) { document.querySelectorAll('.padfocus').forEach(x => x.classList.remove('padfocus')); this.el = e; if (e) { e.classList.add('padfocus'); this.key = this.keyOf(e); try { e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) {} } return e; }
  move(dir) {
    const scr = this.screen(); if (!scr) return; const T = this.targets(scr); if (!T.length) return;
    const cur = this.restore(scr);
    if (!cur) { this.set(scr.querySelector('.card.on') || T[0]); return; }
    const r0 = cur.getBoundingClientRect(); const c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
    const dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    let best = null, bs = Infinity;
    for (const e of T) { if (e === cur) continue; const r = e.getBoundingClientRect(); const c = [r.left + r.width / 2, r.top + r.height / 2]; const dx = c[0] - c0[0], dy = c[1] - c0[1];
      const along = dx * dv[0] + dy * dv[1]; if (along <= 4) continue; const across = Math.abs(dx * dv[1] - dy * dv[0]); const s = along + across * 2.4; if (s < bs) { bs = s; best = e; } }
    if (best) this.set(best);
  }
  activate() { const g = this.game; if (g.prepActive) { g.prepLock(); return; } const scr = this.screen(); if (!scr) return; const cur = this.restore(scr); if (cur) { const k = this.key; cur.click(); setTimeout(() => { const s2 = this.screen(); if (s2 && k) { try { const e = s2.querySelector(k); if (e) this.set(e); } catch (x) {} } }, 0); } else this.move('down'); }
  back() { const g = this.game; const scr = this.screen(); if (!scr) return; if (scr.id === 'pmk') { g.pmk.showPanel(false); } else if (scr.id === 'ssCorner') { g.ss.closeCorner(); } else if (scr.id === 'pmkCal') {} else if (scr.id === 'pause') g.togglePause(); else if (scr.id === 'kitchen') { const b = document.getElementById('kBack'); if (b) b.click(); } else if (scr.id === 'log') { const b = document.getElementById('logBack'); if (b) b.click(); } else if (scr.id === 'report') { const b = document.getElementById('menuB'); if (b) b.click(); } else { const c = document.getElementById('ctrls'); if (c && !c.classList.contains('hidden')) c.classList.add('hidden'); } }
}
