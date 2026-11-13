// REFRAMER COMMAND 3D mode (Cinder Pass). PROPOSAL / PUBLISH HOLD. Separate page: command.html.
// Metal's game (index.html / main.js) is not loaded and not changed. Geometry is placeholder.
import * as THREE from 'three';
import {UNITS,select,giveOrder,cycle} from './command_squad_core.mjs';
import {createCinderPass,requestMedic,order,tick,status,hitHostile,invariants} from './cinder_pass_core.mjs';

const ZONE = { x: 30, z: 0, r: 2 };
const BLOCKERS = [{ x: 15, z: -3.2, r: 1.2 }, { x: 15, z: 3.2, r: 1.2 }];
const COLORS = { GENERAL: 0xf1efff, BULWARK: 0x4f8bff, FOUNDRY: 0xff9a3c, THREAD: 0x6fe39a };
const STRIKE = { range: 5, dmg: 25, cool: 0.6 };
const ESCORT_EVERY = 0.5;

const C = createCinderPass({
  squadStarts: { GENERAL: { x: -4, z: 0 }, BULWARK: { x: 2, z: -2 }, FOUNDRY: { x: 2, z: 2 }, THREAD: { x: -2, z: 0 } },
  medics: [{ id: 'MEDIC-1', x: 6, z: -1 }, { id: 'MEDIC-2', x: 6, z: 1 }],
  zone: ZONE, hostile: { x: 40, z: -6, hp: 100 },
});
const state = { keys: new Set(), escortUnit: 'BULWARK', escortT: 0, strikeCool: 0, lastBtn: {}, ui: 0, paused: false, requested: new Set() };

// ---------- renderer and placeholder scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x0c0f1a, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0c0f1a, 60, 140);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xcfc8ff, 0x332244, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(10, 30, 15); scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), new THREE.MeshStandardMaterial({ color: 0x2b2a33, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const grid = new THREE.GridHelper(140, 70, 0x3d3560, 0x26223d); grid.position.y = 0.01; scene.add(grid);

for (const b of BLOCKERS) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(b.r, b.r, 3, 16), new THREE.MeshStandardMaterial({ color: 0x6a6378 }));
  m.position.set(b.x, 1.5, b.z); scene.add(m);
}
const ring = new THREE.Mesh(new THREE.RingGeometry(ZONE.r - 0.15, ZONE.r, 48), new THREE.MeshBasicMaterial({ color: 0x9be38f, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.set(ZONE.x, 0.05, ZONE.z); scene.add(ring);

function body(color, scale = 1) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * scale, 0.45 * scale, 1.3 * scale, 12), new THREE.MeshStandardMaterial({ color }));
  torso.position.y = 1.0 * scale; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 12, 10), new THREE.MeshStandardMaterial({ color }));
  head.position.y = 1.9 * scale; g.add(head);
  return g;
}
const unitMesh = {};
for (const id of UNITS) { unitMesh[id] = body(COLORS[id], id === 'GENERAL' ? 1.05 : 0.95); scene.add(unitMesh[id]); }
const medicMesh = {};
for (const e of C.evac) { medicMesh[e.id] = body(0xff6b8a, 0.95); scene.add(medicMesh[e.id]); }
const selRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 32), new THREE.MeshBasicMaterial({ color: 0xffcf7a, side: THREE.DoubleSide }));
selRing.rotation.x = -Math.PI / 2; scene.add(selRing);

// Hostile reconstruction: placeholder cluster that shrinks as it loses hp.
const hostileGroup = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x7a3fb0 }));
  b.position.set((i % 3 - 1) * 0.9, 0.5 + Math.floor(i / 3) * 0.9, 0); hostileGroup.add(b);
}
hostileGroup.position.set(C.hostile.x, 0, C.hostile.z); scene.add(hostileGroup);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ---------- input ----------
const DIGITS = { Digit0: 0, Digit1: 1, Digit2: 2, Digit3: 3 };
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  state.keys.add(e.code);
  if (e.code in DIGITS) select(C.squad, UNITS[DIGITS[e.code]]);
  if (e.code === 'Tab') { e.preventDefault(); cycle(C.squad, 1); }
  if (e.code === 'Space') { e.preventDefault(); strike(); }
  if (e.code === 'KeyR') requestNearestMedic();
  if (e.code === 'KeyE') setEscort();
  if (e.code === 'KeyH') holdSelected();
  if (e.code === 'KeyG') regroupOthers();
});
window.addEventListener('keyup', e => state.keys.delete(e.code));
window.addEventListener('blur', () => state.keys.clear());

function gamepadInput() {
  const pad = (navigator.getGamepads ? navigator.getGamepads() : [])[0];
  if (!pad) return { x: 0, z: 0 };
  const edge = (i) => { const down = !!pad.buttons[i]?.pressed; const was = state.lastBtn[i]; state.lastBtn[i] = down; return down && !was; };
  if (edge(0)) strike();
  if (edge(1)) requestNearestMedic();
  if (edge(2)) holdSelected();
  if (edge(3)) setEscort();
  const dead = v => Math.abs(v) < 0.2 ? 0 : v;
  return { x: dead(pad.axes[0] || 0), z: dead(pad.axes[1] || 0) };
}

function keyMove() {
  const k = state.keys;
  return { x: (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0), z: (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0) };
}

// ---------- commands ----------
function nearestWaiting() {
  const g = C.squad.units.GENERAL;
  // only medics not yet requested: a requested medic left behind is still waiting, and must not be picked again
  const cands = C.evac.filter(e => !state.requested.has(e.id) && e.state !== 'safe' && e.state !== 'lost');
  cands.sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z));
  return cands[0] || null;
}
function requestNearestMedic() { const m = nearestWaiting(); if (m && requestMedic(C, m.id).ok) state.requested.add(m.id); }
function setEscort() {
  const u = C.squad.controlled === 'GENERAL' ? state.escortUnit : C.squad.controlled;
  state.escortUnit = u; state.escortT = 0;
  C.log.push({ t: C.elapsed, type: 'escort-set', unit: u });
}
function holdSelected() { const u = C.squad.units[C.squad.controlled]; order(C, u.id, 'HOLD', { at: { x: u.x, z: u.z } }); }
function regroupOthers() { for (const id of UNITS) if (id !== C.squad.controlled && id !== 'GENERAL') order(C, id, 'REGROUP'); }
function strike() {
  if (state.strikeCool > 0 || C.squad.controlled !== 'GENERAL') return;
  const g = C.squad.units.GENERAL;
  if (Math.hypot(g.x - C.hostile.x, g.z - C.hostile.z) > STRIKE.range) { C.log.push({ t: C.elapsed, type: 'strike-refused', reason: 'out-of-range' }); return; }
  state.strikeCool = STRIKE.cool;
  hitHostile(C, STRIKE.dmg);
}
// Escort: the chosen unit re-issues MOVE to the nearest walking medic. This is a real order each tick.
function escortTick(dt) {
  state.escortT -= dt; if (state.escortT > 0) return;
  state.escortT = ESCORT_EVERY;
  // Any requested medic who has not arrived, including one the escort left behind for a while.
  const walking = C.evac.filter(e => state.requested.has(e.id) && e.state !== 'safe' && e.state !== 'lost');
  if (!walking.length) return;
  const g = C.squad.units[state.escortUnit]; const m = walking[0];
  if (g) order(C, state.escortUnit, 'MOVE', { at: { x: m.x, z: m.z } });
}

// ---------- loop ----------
function stepOnce(dt) {
  if (state.strikeCool > 0) state.strikeCool = Math.max(0, state.strikeCool - dt);
  escortTick(dt);
  const mv = gamepadInput();
  const km = keyMove();
  const x = km.x || mv.x, z = km.z || mv.z;
  const speed = 4.5 * dt;
  const len = Math.hypot(x, z);
  const move = len > 0 ? { x: x / Math.max(1, len) * speed, z: z / Math.max(1, len) * speed } : null;
  tick(C, dt, { blockers: BLOCKERS, movePlayer: move });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!state.paused) stepOnce(dt);
  draw();
  requestAnimationFrame(frame);
}

function draw() {
  for (const id of UNITS) { const u = C.squad.units[id]; unitMesh[id].position.set(u.x, 0, u.z); }
  for (const e of C.evac) { const m = medicMesh[e.id]; m.position.set(e.x, 0, e.z); m.visible = e.state !== 'lost'; }
  const sel = C.squad.units[C.squad.controlled]; selRing.position.set(sel.x, 0.06, sel.z);
  const frac = Math.max(0, C.hostile.hp / 100);
  hostileGroup.scale.setScalar(Math.max(0.05, frac));
  hostileGroup.visible = frac > 0;
  const g = C.squad.units.GENERAL;
  camera.position.set(g.x + 6, 20, g.z + 20);
  camera.lookAt(g.x + 6, 0, g.z);
  renderer.render(scene, camera);
  if (performance.now() - state.ui > 200) { state.ui = performance.now(); paintHud(); }
}

function paintHud() {
  const s = status(C);
  const u = C.squad.units[C.squad.controlled];
  document.getElementById('unit').textContent = 'Controlled: ' + C.squad.controlled + ' · ' + u.status + ' · escort: ' + state.escortUnit;
  document.getElementById('obj').innerHTML = s.objectives.map(o => '<div class="' + (o.done ? 'done' : '') + '">' + (o.done ? '✓ ' : '· ') + o.text + '</div>').join('');
  document.getElementById('log').textContent = C.log.slice(-6).map(e => e.type + (e.reason ? ' (' + e.reason + ')' : '')).join('\n');
  document.getElementById('verdict').textContent = s.complete ? 'CINDER PASS: COMPLETE' : s.failed ? 'FAILED: a medic was lost' : 'IN PROGRESS · invariants ' + invariants(C).length;
}

// Test hooks (read-only views plus a deterministic stepper). Not used by the game itself.
window.__command = {
  C, status: () => status(C), invariants: () => invariants(C),
  stepForTest(n, dt = 1 / 20) { for (let i = 0; i < n; i++) stepOnce(dt); draw(); },
  placeGeneralNearHostileForTest() { C.squad.units.GENERAL.x = C.hostile.x - 2; C.squad.units.GENERAL.z = C.hostile.z; },
  pause(v) { state.paused = !!v; },
};

requestAnimationFrame(frame);
