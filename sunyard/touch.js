// PROPOSAL - Sun Yard touch controls v0 (2026-10-22). Own Pointer Events code, no library. Feeds the same input object as pad/keys.
// Left half: floating stick (x = steer, push up = RT push, pull down = LT brake/pump). Right half: tap = pop, swipe = right-stick flick
// (THPS/True Skate style: up pop, left/right flip or rail side pop, down shove-it). Buttons: X interact/wallride, LB grab, A recover, B dismount.
// Numbers are PROPOSAL from research/3D_2026-10-22.md: dead zone 0.15, flick = over 40 px inside 150 ms.
export const T = { on: false, lx: 0, ly: 0, rx: 0, ry: 0, flickUntil: 0, btn: { x: 0, lb: 0, a: 0, b: 0 } };
const STICK_R = 60, DEAD = 0.15, FLICK_PX = 40, FLICK_MS = 150, HOLD_MS = 90;
export function initTouch(force) {
  const want = force || (matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;
  if (!want) return T;
  T.on = true; document.body.classList.add('touch');
  const ui = document.createElement('div'); ui.id = 'touchui';
  ui.innerHTML = '<div id="tz-l"><div id="t-base"><div id="t-knob"></div></div></div><div id="tz-r"><span>tap = pop · swipe = flick</span></div>' +
    '<div id="t-btns"><button data-b="x">X</button><button data-b="lb">GRAB</button><button data-b="a">A</button><button data-b="b">B</button></div>';
  document.body.appendChild(ui);
  const base = ui.querySelector('#t-base'), knob = ui.querySelector('#t-knob'), zl = ui.querySelector('#tz-l'), zr = ui.querySelector('#tz-r');
  let stickId = null, sx = 0, sy = 0; const fl = new Map();
  const stop = e => { e.preventDefault(); };
  zl.addEventListener('pointerdown', e => { stop(e); if (stickId !== null) return; stickId = e.pointerId; zl.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY;
    base.style.left = `${sx}px`; base.style.top = `${sy}px`; base.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)'; }, { passive: false });
  zl.addEventListener('pointermove', e => { if (e.pointerId !== stickId) return; stop(e); let dx = (e.clientX - sx) / STICK_R, dy = (e.clientY - sy) / STICK_R; const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; } const dz = v => Math.abs(v) < DEAD ? 0 : v; T.lx = dz(dx); T.ly = dz(dy);
    knob.style.transform = `translate(calc(-50% + ${dx * STICK_R}px), calc(-50% + ${dy * STICK_R}px))`; }, { passive: false });
  const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; T.lx = T.ly = 0; base.classList.remove('on'); };
  zl.addEventListener('pointerup', endStick); zl.addEventListener('pointercancel', endStick);
  const fire = (rx, ry) => { T.rx = rx; T.ry = ry; T.gap = true; T.flickUntil = performance.now() + HOLD_MS; }; // gap: one neutral tick so back-to-back flicks are separate edges
  zr.addEventListener('pointerdown', e => { stop(e); zr.setPointerCapture(e.pointerId); fl.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), done: false }); }, { passive: false });
  const flick = (e, end) => { const f = fl.get(e.pointerId); if (!f || f.done) return; const dx = e.clientX - f.x, dy = e.clientY - f.y, dt = performance.now() - f.t, d = Math.hypot(dx, dy);
    if (d > FLICK_PX && dt < FLICK_MS) { f.done = true; if (Math.abs(dx) > Math.abs(dy)) fire(Math.sign(dx), 0); else fire(0, Math.sign(dy)); }
    else if (end && d <= FLICK_PX) { f.done = true; fire(0, -1); } }; // a tap pops (same as right stick up)
  zr.addEventListener('pointermove', e => { stop(e); flick(e, false); }, { passive: false });
  zr.addEventListener('pointerup', e => { flick(e, true); fl.delete(e.pointerId); }); zr.addEventListener('pointercancel', e => fl.delete(e.pointerId));
  ui.querySelectorAll('#t-btns button').forEach(bt => { const n = bt.dataset.b;
    bt.addEventListener('pointerdown', e => { stop(e); bt.setPointerCapture(e.pointerId); T.btn[n] = 1; bt.classList.add('on'); }, { passive: false });
    const up = () => { T.btn[n] = 0; bt.classList.remove('on'); }; bt.addEventListener('pointerup', up); bt.addEventListener('pointercancel', up); });
  return T; }
// merge touch into an input object (same fields the pad/keys fill)
export function applyTouch(i) { if (!T.on) return i;
  i.lx = Math.max(-1, Math.min(1, i.lx + T.lx)); i.rt = Math.max(i.rt, -T.ly > 0 ? -T.ly : 0); i.lt = Math.max(i.lt, T.ly > 0 ? T.ly : 0);
  if (T.gap) { T.gap = false; T.flickUntil += 1000 / 120; } else if (performance.now() < T.flickUntil) { i.rx = T.rx; i.ry = T.ry; }
  for (const k in T.btn) i[k] = Math.max(i[k], T.btn[k]); return i; }
