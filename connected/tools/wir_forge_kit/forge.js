// WIR FORGE — turn a JSON "recipe" into a rigged, skinned, textured three.js character (and export it as .glb).
// Same technique as the NGB: The Glazed Ring fighters, generalised: any skeleton (humanoid, quadruped, or your own bone chains),
// lofted superellipse bodies, muscle-shaped limbs, blobs, scattered detail (locs, popcorn, spikes, scales), procedural PBR textures,
// automatic skin weights for any body plan. An AI writes the recipe; this file builds it.
//
//   import * as THREE from 'three';
//   import { forge, validate, animate } from './forge.js';
//   const model = forge(recipe, THREE);      // { group, skeleton, bones, meshes, rest, recipe }
//   scene.add(model.group);  ...  animate(model, t);   // idle / guard / walk / wave preview motion
//
// Conventions: metres. The character faces +Z, Y is up, +X is the character's OWN LEFT. Rest positions are world positions.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
function rnd(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mirName = n => n.replace(/Left|Right/g, m => (m === 'Left' ? 'Right' : 'Left'));

// ---------------------------------------------------------------- skeletons
// Humanoid uses Mixamo bone names, so Mixamo / mocap clips retarget straight onto it (world-space rest-delta retargeting, as in NGB).
function humanoid(sk) {
  const H = (sk.height || 1.8) / 1.8, p = Object.assign({ shoulders: 1, arms: 1, legs: 1, torso: 1, neck: 1, head: 1, hips: 1 }, sk.proportions || {});
  const legY = 100 * p.legs, torsoK = p.torso, armK = p.arms;
  const sp = y => legY + (y - 100) * torsoK; // torso heights from the leg length up
  const J = {
    Hips: [0, legY, 0, null], Spine: [0, sp(108), 0, 'Hips'], Spine1: [0, sp(118), 0, 'Spine'], Spine2: [0, sp(130), -1, 'Spine1'],
    Neck: [0, sp(148), -3, 'Spine2'], Head: [0, sp(148) + 9 * p.neck, -2, 'Neck'], HeadTop_End: [0, sp(148) + 9 * p.neck + 21 * p.head, 0, 'Head'],
  };
  for (const [S, s] of [['Left', 1], ['Right', -1]]) {
    const shY = sp(142), sw = 17 * p.shoulders;
    Object.assign(J, {
      [S + 'Shoulder']: [5 * s, sp(143), -3, 'Spine2'], [S + 'Arm']: [sw * s, shY, -4, S + 'Shoulder'], [S + 'ForeArm']: [(sw + 27 * armK) * s, shY, -4, S + 'Arm'],
      [S + 'Hand']: [(sw + 53 * armK) * s, shY, -3, S + 'ForeArm'], [S + 'HandEnd']: [(sw + 63 * armK) * s, shY, -2, S + 'Hand'],
      [S + 'UpLeg']: [9 * p.hips * s, legY - 5, 0, 'Hips'], [S + 'Leg']: [9 * p.hips * s, legY * 0.52, 1, S + 'UpLeg'], [S + 'Foot']: [9 * p.hips * s, legY * 0.09, -1, S + 'Leg'],
      [S + 'ToeBase']: [9 * p.hips * s, 2, 12, S + 'Foot'], [S + 'Toe_End']: [9 * p.hips * s, 2, 20, S + 'ToeBase'],
    });
  }
  return Object.entries(J).map(([n, [x, y, z, par]]) => ({ name: n, parent: par, pos: [x * 0.01 * H, y * 0.01 * H, z * 0.01 * H] }));
}
function quadruped(sk) {
  const H = (sk.height || 1.0) / 1.0, L = (sk.length || 1.4) / 1.4, p = Object.assign({ legs: 1, neck: 1, head: 1, tail: 1 }, sk.proportions || {});
  const legY = 0.9 * p.legs, J = {
    Hips: [0, legY, -0.45 * L, null], Spine: [0, legY + 0.03, -0.2 * L, 'Hips'], Spine1: [0, legY + 0.05, 0.05 * L, 'Spine'], Spine2: [0, legY + 0.07, 0.3 * L, 'Spine1'],
    Neck: [0, legY + 0.17 * p.neck, 0.48 * L, 'Spine2'], Head: [0, legY + 0.3 * p.neck, 0.6 * L + 0.05 * p.neck, 'Neck'], HeadTop_End: [0, legY + 0.3 * p.neck, 0.6 * L + 0.05 * p.neck + 0.28 * p.head, 'Head'],
  };
  for (const [S, s] of [['Left', 1], ['Right', -1]]) for (const [E, z, par] of [['Front', 0.35 * L, 'Spine2'], ['Back', -0.45 * L, 'Hips']]) {
    const x = 0.14 * s; Object.assign(J, { [E + S + 'UpLeg']: [x, legY - 0.02, z, par], [E + S + 'Leg']: [x, legY * 0.58, z + (E === 'Back' ? 0.05 : 0.02), E + S + 'UpLeg'],
      [E + S + 'Foot']: [x, legY * 0.13, z - (E === 'Back' ? 0.03 : 0), E + S + 'Leg'], [E + S + 'Toe']: [x, 0.0, z + 0.09, E + S + 'Foot'] });
  }
  let prev = 'Hips', tz = -0.45 * L, ty = legY + 0.02; const n = 5;
  for (let i = 1; i <= n; i++) { tz -= 0.14 * p.tail * L; ty -= 0.05; J['Tail' + i] = [0, ty, tz, prev]; prev = 'Tail' + i; }
  return Object.entries(J).map(([nm, [x, y, z, par]]) => ({ name: nm, parent: par, pos: [x * H, y * H, z * H] }));
}
function chains(list, have) { // extra bone chains: tails, tentacles, wings, antennae… {name, count, from, to, parent, curl:[x,y,z], mirror}
  const out = [];
  const add = (c, flip) => {
    const nm = flip ? mirName(c.name).replace(/^(?!Left|Right)/, 'R_') : c.name; const f = c.from.slice(), t = c.to.slice(); if (flip) { f[0] = -f[0]; t[0] = -t[0]; }
    const curl = c.curl || [0, 0, 0]; let par = flip ? mirName(c.parent || 'Hips') : (c.parent || 'Hips');
    for (let i = 0; i <= c.count; i++) { const u = i / c.count, b = Math.sin(Math.PI * u);
      const pos = [f[0] + (t[0] - f[0]) * u + curl[0] * b * (flip ? -1 : 1), f[1] + (t[1] - f[1]) * u + curl[1] * b, f[2] + (t[2] - f[2]) * u + curl[2] * b];
      const name = `${nm}${i + 1}`; out.push({ name, parent: par, pos }); par = name; }
  };
  for (const c of list || []) { add(c, false); if (c.mirror) add(c, true); }
  return out;
}
export function skeletonDef(sk = {}) {
  let bones = sk.preset === 'quadruped' ? quadruped(sk) : sk.preset === 'none' ? [{ name: 'Root', parent: null, pos: [0, 0, 0] }] : humanoid(sk);
  bones = bones.concat(chains(sk.chains, bones)).concat(sk.bones || []);
  return bones;
}
function buildSkeleton(THREE, defs) {
  const root = new THREE.Group(), bones = {}, list = [], rest = {};
  for (const d of defs) {
    const b = new THREE.Bone(); b.name = d.name; const P = new THREE.Vector3().fromArray(d.pos); rest[d.name] = P;
    const par = d.parent && bones[d.parent]; b.position.copy(par ? P.clone().sub(rest[d.parent]) : P); (par || root).add(b);
    b.userData.rest = { p: b.position.clone(), q: b.quaternion.clone() }; bones[d.name] = b; list.push(b);
  }
  const children = {}; for (const d of defs) if (d.parent) (children[d.parent] = children[d.parent] || []).push(d.name);
  root.updateMatrixWorld(true);
  return { root, bones, list, rest, children, skeleton: new THREE.Skeleton(list), index: Object.fromEntries(list.map((b, i) => [b.name, i])) };
}

// ---------------------------------------------------------------- mesh builder with skin weights
class MB {
  constructor(THREE, S) { this.T = THREE; this.S = S; this.p = []; this.uv = []; this.si = []; this.sw = []; this.ix = []; this.seams = []; }
  // weights: {bone: 'Head'} rigid, or {cands: [...names]} automatic among candidates (distance to bone segments, falloff ^4)
  weightsAt(p, W) {
    const S = this.S, T = this.T; if (W.bone) return [[S.index[W.bone] ?? 0, 1]];
    const out = [];
    for (const n of W.cands) { const a = S.rest[n]; if (!a) continue; const kids = S.children[n]; const b = kids && kids.length ? S.rest[kids[0]] : a;
      const ab = b.clone().sub(a), L2 = ab.lengthSq(); const t = L2 > 1e-8 ? clamp(p.clone().sub(a).dot(ab) / L2, 0, 1) : 0; const d = p.distanceTo(a.clone().addScaledVector(ab, t));
      out.push([S.index[n], 1 / Math.pow(d + 0.012, 4)]); }
    out.sort((x, y) => y[1] - x[1]); return out.slice(0, 4);
  }
  v(p, u, v, W) {
    const ws = this.weightsAt(p, W); const s = ws.reduce((a, b) => a + b[1], 0) || 1;
    this.p.push(p.x, p.y, p.z); this.uv.push(u, v);
    for (let i = 0; i < 4; i++) { this.si.push(ws[i] ? ws[i][0] : 0); this.sw.push(ws[i] ? ws[i][1] / s : 0); }
    return this.p.length / 3 - 1;
  }
  loft(rings, W, { capStart = false, capEnd = false, flip = false } = {}) { // rings: [{pts:[V3...], v}]
    const n = rings[0].pts.length, ids = [];
    // winding from geometry, not from how the frame happened to turn: faces must point away from the ring centre
    { const m = Math.max(1, Math.min(rings.length - 2, Math.floor(rings.length / 2))); const A = rings[m].pts, B = rings[m + 1].pts; const c = new this.T.Vector3(); A.forEach(p => c.add(p)); c.divideScalar(n);
      let s = 0; for (let j = 0; j < n; j += Math.max(1, n >> 2)) { const a0 = A[j], a1 = A[(j + 1) % n], b0 = B[j]; const nrm = new this.T.Vector3().crossVectors(b0.clone().sub(a0), a1.clone().sub(a0)); s += nrm.dot(a0.clone().sub(c)); }
      flip = s < 0; }
    rings.forEach(r => { const row = []; for (let j = 0; j <= n; j++) row.push(this.v(r.pts[j % n], j / n, r.v, W)); ids.push(row); this.seams.push([row[0], row[n]]); });
    for (let i = 0; i < ids.length - 1; i++) for (let j = 0; j < n; j++) { const a = ids[i][j], b = ids[i][j + 1], c = ids[i + 1][j], d = ids[i + 1][j + 1]; if (flip) this.ix.push(a, b, c, b, d, c); else this.ix.push(a, c, b, b, c, d); }
    const cap = (row, r, inv) => { const c = new this.T.Vector3(); r.pts.forEach(p => c.add(p)); c.divideScalar(n); const ci = this.v(c, 0.5, r.v, W); for (let j = 0; j < n; j++) { if (inv !== flip) this.ix.push(ci, row[j], row[j + 1]); else this.ix.push(ci, row[j + 1], row[j]); } };
    if (capStart) cap(ids[0], rings[0], false); if (capEnd) cap(ids[ids.length - 1], rings[rings.length - 1], true);
  }
  geometry() {
    const T = this.T, g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.ix); g.computeVertexNormals(); const nr = g.attributes.normal;
    for (const [a, b] of this.seams) { const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b); const l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
    g.computeBoundingSphere(); return g;
  }
}

// ---------------------------------------------------------------- shapes
function frameOf(T, t, prevE1) { t = t.clone().normalize(); let e1;
  if (prevE1) { e1 = prevE1.clone().addScaledVector(t, -prevE1.dot(t)); if (e1.lengthSq() < 1e-6) e1 = null; else e1.normalize(); }
  if (!e1) { const ref = Math.abs(t.y) > 0.85 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0); e1 = new T.Vector3().crossVectors(ref, t).normalize(); if (Math.abs(t.y) > 0.85) e1 = new T.Vector3(1, 0, 0).addScaledVector(t, -t.x).normalize(); }
  return { t, e1, e2: new T.Vector3().crossVectors(t, e1).normalize() }; }
// superellipse ring: exponent 2 = ellipse, 3–4 = squarer (torsos), 1.5 = pinched
function ring(T, c, f, rx, rz, n, ex = 2, shape) { const pts = [];
  for (let j = 0; j < n; j++) { const th = j / n * Math.PI * 2; const co = Math.cos(th), si = Math.sin(th); let k = shape ? shape(th) : 1;
    const x = Math.sign(co) * Math.pow(Math.abs(co), 2 / ex) * rx * k, z = Math.sign(si) * Math.pow(Math.abs(si), 2 / ex) * rz * k;
    pts.push(c.clone().addScaledVector(f.e1, x).addScaledVector(f.e2, z)); } return pts; }
// path loft through anchor points with per-point [rx, rz] (catmull-rom resampled)
function loftPath(T, mb, pts, radii, W, o = {}) {
  const curve = new T.CatmullRomCurve3(pts, false, 'centripetal'); const N = Math.max(6, Math.round((o.segments || pts.length * 5) * (o.detail || 1))); const n = Math.round((o.ring || 18) * (o.detail || 1));
  const rings = []; let prev = o.e1 ? new T.Vector3().fromArray(o.e1) : null;
  for (let i = 0; i <= N; i++) { const u = i / N; const c = curve.getPointAt(u); const t = curve.getTangentAt(u); const f = frameOf(T, t, prev); prev = f.e1;
    const x = u * (radii.length - 1), k = Math.min(radii.length - 2, Math.floor(x)), fr = x - k; const r0 = [].concat(radii[k]), r1 = [].concat(radii[k + 1] ?? radii[k]);
    const rx = (r0[0] + ((r1[0]) - r0[0]) * smooth(fr)), rz = ((r0[1] ?? r0[0]) + ((r1[1] ?? r1[0]) - (r0[1] ?? r0[0])) * smooth(fr));
    const muscle = o.muscle || 0; const shape = muscle ? th => 1 + muscle * Math.max(0, Math.sin(th)) * Math.sin(Math.PI * u) * 0.25 + muscle * 0.12 * Math.max(0, -Math.sin(th)) * Math.sin(Math.PI * clamp(u * 1.4, 0, 1)) : null;
    rings.push({ pts: ring(T, c, f, rx, rz, n, o.squareness || 2, shape), v: u * (o.vScale || 1) }); }
  mb.loft(rings, W, { capStart: o.caps !== false && o.capStart !== false, capEnd: o.caps !== false && o.capEnd !== false });
}
function blob(T, mb, C, size, W, o = {}) {
  const [rx, ry, rz] = size; const lat = Math.round((o.lat || 12) * (o.detail || 1)), lon = Math.round((o.lon || 18) * (o.detail || 1)); const R = o.rot || [0, 0, 0];
  const q = new T.Quaternion().setFromEuler(new T.Euler(R[0] * Math.PI / 180, R[1] * Math.PI / 180, R[2] * Math.PI / 180)); const rg = rnd(o.seed || 1); const lumps = o.lumps || 0; const ph0 = rg() * 9, ph1 = rg() * 9;
  const rings = [];
  for (let i = 0; i <= lat; i++) { const phi = -Math.PI / 2 + Math.PI * i / lat; const pts = [];
    for (let j = 0; j < lon; j++) { const th = j / lon * Math.PI * 2; let k = 1 + lumps * (Math.sin(th * 3 + ph0) * Math.cos(phi * 2 + ph1) * 0.6 + Math.sin(th * 7 + phi * 5) * 0.4);
      if (o.flatBottom && phi < -0.2) k *= 1 - 0.5 * (-phi - 0.2); if (o.taper) k *= 1 - o.taper * (Math.sin(phi) * 0.5 + 0.5) * 0;
      let y = Math.sin(phi) * ry; if (o.taper) { const tp = 1 - o.taper * (Math.sin(phi) * 0.5 + 0.5); k *= tp; }
      const v = new T.Vector3(Math.cos(phi) * Math.cos(th) * rx * k, y, Math.cos(phi) * Math.sin(th) * rz * k).applyQuaternion(q); pts.push(C.clone().add(v)); }
    rings.push({ pts, v: i / lat }); }
  mb.loft(rings, W, { flip: true });
}

// ---------------------------------------------------------------- procedural textures (canvas → PBR maps)
function canvasTex(T, w, h, draw, rep) { const c = (typeof document !== 'undefined' ? document.createElement('canvas') : new OffscreenCanvas(w, h)); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; }
export const PATTERNS = ['plain', 'noise', 'fibers', 'dots', 'bubbles', 'cracks', 'scales', 'stripes', 'spots', 'plates', 'grain', 'knit'];
function textures(T, m, seed) {
  const r = rnd(seed); const col = new T.Color(m.color || '#888'), c2 = new T.Color(m.color2 || m.color || '#aaa'); const css = c => '#' + c.getHexString();
  const rgba = (c, a) => `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},${a})`; const rep = [].concat(m.scale ?? 3); const R = [rep[0], rep[1] ?? rep[0] * 0.7];
  const pat = m.pattern || 'plain'; let draw = null, bump = null, glow = null;
  const fill = (g, w, h, c) => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
  switch (pat) {
    case 'noise': case 'grain': draw = (g, w, h) => { fill(g, w, h, css(col)); for (let i = 0; i < (pat === 'grain' ? 7000 : 2500); i++) { g.fillStyle = r() > 0.5 ? rgba(c2, r() * 0.18) : `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, pat === 'grain' ? 1 : 2, pat === 'grain' ? 3 : 2); } };
      bump = (g, w, h) => { fill(g, w, h, '#808080'); for (let i = 0; i < 3000; i++) { const v = 90 + r() * 90 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 2, 2); } }; break;
    case 'fibers': case 'knit': draw = (g, w, h) => { fill(g, w, h, css(col)); for (let i = 0; i < 110; i++) { const x = r() * w; g.strokeStyle = rgba(c2, 0.05 + r() * 0.12); g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * (pat === 'knit' ? 5 : 3), y); g.stroke(); } };
      bump = (g, w, h) => { fill(g, w, h, '#808080'); for (let i = 0; i < 80; i++) { const x = r() * w; const lg = g.createLinearGradient(x - 3, 0, x + 3, 0); lg.addColorStop(0, '#606060'); lg.addColorStop(0.5, '#d0d0d0'); lg.addColorStop(1, '#606060'); g.fillStyle = lg; g.fillRect(x - 3, 0, 6, h); } }; break;
    case 'dots': draw = (g, w, h) => { fill(g, w, h, css(col)); for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.fillStyle = rgba(c2, 0.8); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } };
      bump = (g, w, h) => { fill(g, w, h, '#909090'); for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.fillStyle = '#303030'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }; break;
    case 'bubbles': case 'spots': draw = (g, w, h) => { fill(g, w, h, css(col)); for (let i = 0; i < (pat === 'spots' ? 40 : 140); i++) { const x = r() * w, y = r() * h, s = pat === 'spots' ? 8 + r() * 22 : 6 + r() * 14; const rg = g.createRadialGradient(x, y, 1, x, y, s); rg.addColorStop(0, rgba(c2, 0.9)); rg.addColorStop(1, rgba(c2, 0)); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } };
      bump = (g, w, h) => { fill(g, w, h, '#707070'); for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, s = 5 + r() * 12; const rg = g.createRadialGradient(x, y, 1, x, y, s); rg.addColorStop(0, '#e0e0e0'); rg.addColorStop(1, '#707070'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } }; break;
    case 'cracks': { const cr = []; for (let i = 0; i < 16; i++) { let x = r() * 256, y = r() * 256; const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 44; y += (r() - 0.5) * 44; pts.push([x, y]); } cr.push(pts); }
      const lines = (g, c, wdt) => { g.strokeStyle = c; for (const p of cr) { g.lineWidth = wdt; g.beginPath(); g.moveTo(...p[0]); p.slice(1).forEach(q => g.lineTo(...q)); g.stroke(); } };
      draw = (g, w, h) => { fill(g, w, h, css(col)); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.07})`; g.fillRect(r() * w, r() * h, 2, 2); } lines(g, 'rgba(0,0,0,.6)', 2); };
      glow = (g, w, h) => { fill(g, w, h, '#000'); g.shadowColor = css(c2); g.shadowBlur = 6; lines(g, css(c2), 1.4); };
      bump = (g, w, h) => { fill(g, w, h, '#909090'); lines(g, '#202020', 3); }; break; }
    case 'scales': case 'plates': draw = (g, w, h) => { fill(g, w, h, css(col)); const s = pat === 'plates' ? 64 : 24; for (let y = 0; y < h + s; y += s * 0.6) for (let x = ((y / (s * 0.6)) % 2) * s / 2 - s; x < w + s; x += s) { const rg = g.createRadialGradient(x, y, 1, x, y + s * 0.3, s * 0.7); rg.addColorStop(0, rgba(c2, 0.95)); rg.addColorStop(1, rgba(col, 1)); g.fillStyle = rg; g.beginPath(); if (pat === 'plates') g.rect(x - s / 2 + 2, y - s * 0.3 + 2, s - 4, s * 0.6 - 4); else g.arc(x, y, s * 0.55, 0, Math.PI); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke(); } };
      bump = (g, w, h) => { fill(g, w, h, '#606060'); const s = pat === 'plates' ? 64 : 24; for (let y = 0; y < h + s; y += s * 0.6) for (let x = ((y / (s * 0.6)) % 2) * s / 2 - s; x < w + s; x += s) { g.fillStyle = '#d8d8d8'; g.beginPath(); if (pat === 'plates') g.rect(x - s / 2 + 3, y - s * 0.3 + 3, s - 6, s * 0.6 - 6); else g.arc(x, y, s * 0.5, 0, Math.PI); g.fill(); } }; break;
    case 'stripes': draw = (g, w, h) => { fill(g, w, h, css(col)); g.fillStyle = css(c2); for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, h); }; break;
    default: draw = (g, w, h) => fill(g, w, h, css(col));
  }
  const S = pat === 'plain' ? 32 : 256;
  return { map: canvasTex(T, S, S, draw, R), bump: bump && canvasTex(T, 256, 256, bump, R), glow: glow && canvasTex(T, 256, 256, glow, R) };
}
function material(T, m = {}, seed) {
  const tx = textures(T, m, seed); const isBasic = m.type === 'basic' || m.unlit;
  if (isBasic) return new T.MeshBasicMaterial({ color: m.color || '#fff' });
  return new T.MeshPhysicalMaterial({ color: 0xffffff, map: tx.map, bumpMap: tx.bump || null, bumpScale: m.bump ?? 1, roughness: m.rough ?? 0.55, metalness: m.metal ?? 0,
    clearcoat: m.clearcoat ?? 0.1, clearcoatRoughness: 0.25, sheen: m.sheen ?? 0, sheenColor: new T.Color(m.color2 || m.color || '#fff'), sheenRoughness: 0.6,
    emissive: new T.Color(m.glowColor || m.color2 || m.color || '#000'), emissiveMap: tx.glow || null, emissiveIntensity: m.glow ?? 0, transparent: (m.opacity ?? 1) < 1, opacity: m.opacity ?? 1, flatShading: !!m.flat });
}

// ---------------------------------------------------------------- anchors
// an anchor is [x,y,z]  |  {bone, offset:[x,y,z]}  |  {between:[A,B], t, offset}
function anchor(T, S, a, mirror) {
  const flipB = n => (mirror ? mirName(n) : n); let p;
  if (Array.isArray(a)) p = new T.Vector3().fromArray(a);
  else if (a && a.bone) { const r = S.rest[flipB(a.bone)]; if (!r) throw new Error(`unknown bone "${flipB(a.bone)}"`); p = r.clone(); if (a.offset) p.add(new T.Vector3().fromArray(a.offset).multiply(new T.Vector3(mirror ? -1 : 1, 1, 1))); return p; }
  else if (a && a.between) { const [A, B] = a.between.map(flipB); if (!S.rest[A] || !S.rest[B]) throw new Error(`unknown bone in between: ${A}, ${B}`); p = S.rest[A].clone().lerp(S.rest[B], a.t ?? 0.5); if (a.offset) p.add(new T.Vector3().fromArray(a.offset).multiply(new T.Vector3(mirror ? -1 : 1, 1, 1))); return p; }
  else throw new Error('bad anchor ' + JSON.stringify(a));
  if (mirror) p.x = -p.x; return p;
}
function weightsFor(S, part, mirror, near) {
  const fl = n => (mirror ? mirName(n) : n);
  if (part.bone) return { bone: fl(part.bone) };
  if (part.bones) return { cands: part.bones.map(fl).filter(n => S.rest[n]) };
  // nearest bones to the part (auto): the 6 closest joints
  const all = Object.keys(S.rest).map(n => [n, S.rest[n].distanceTo(near)]).sort((a, b) => a[1] - b[1]).slice(0, 6).map(x => x[0]); return { cands: all };
}

// ---------------------------------------------------------------- part builders
function buildPart(T, S, mb, part, mirror, detail) {
  const A = a => anchor(T, S, a, mirror); const fl = n => (mirror ? mirName(n) : n);
  switch (part.type) {
    case 'torso': { // humanoid torso from sections [heightFrac 0..1 between Hips and Neck, halfWidth, halfDepth, zOffset] (metres)
      const h0 = S.rest.Hips.y - 0.14 * (part.down ?? 1), h1 = S.rest.Neck.y + 0.03; const n = Math.round(24 * detail);
      const secs = part.sections || [[0, 0.15, 0.11, 0], [0.18, 0.16, 0.11, 0], [0.38, 0.135, 0.1, 0.005], [0.58, 0.155, 0.112, -0.006], [0.75, 0.18, 0.12, -0.016], [0.88, 0.17, 0.104, -0.03], [1, 0.07, 0.06, -0.04]];
      const rings = secs.map(([u, hw, hd, zo], i) => { const y = h0 + (h1 - h0) * u; const c = new T.Vector3(0, y, zo); const f = { e1: new T.Vector3(1, 0, 0), e2: new T.Vector3(0, 0, 1) };
        const bulge = part.chest ?? 0.02; return { pts: ring(T, c, f, hw * (part.width ?? 1), hd * (part.depth ?? 1), n, part.squareness || 2.6, th => 1 + (Math.sin(th) > 0 && u > 0.5 && u < 0.92 ? bulge * 4 * Math.pow(Math.sin(th), 2) : 0)), v: u * 2 }; });
      mb.loft(rings, { cands: ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'LeftUpLeg', 'RightUpLeg', 'LeftShoulder', 'RightShoulder'].filter(n => S.rest[n]) }, { capStart: true, capEnd: true }); return; }
    case 'limb': { // along a bone chain, radii per joint [[rx,rz], …] or numbers; muscle 0..1
      const ch = part.chain.map(fl); for (const n of ch) if (!S.rest[n]) throw new Error(`unknown bone "${n}"`);
      const pts = ch.map(n => S.rest[n].clone()); if (part.extend) { const d = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize().multiplyScalar(part.extend); pts[pts.length - 1].add(d); }
      if (part.startExtend) { const d = pts[0].clone().sub(pts[1]).normalize().multiplyScalar(part.startExtend); pts[0].add(d); }
      const radii = part.radius.length === pts.length ? part.radius : pts.map((_, i) => part.radius[Math.min(i, part.radius.length - 1)]);
      loftPath(T, mb, pts, radii, { cands: part.weightBones ? part.weightBones.map(fl) : ch }, { ...part, detail, segments: part.segments || ch.length * 8 }); return; }
    case 'loft': case 'tube': { const pts = (part.path || [part.from, part.to]).map(A); const radii = part.radius.length ? part.radius : [part.radius];
      loftPath(T, mb, pts, radii.length >= 2 ? radii : [radii[0], radii[0]], weightsFor(S, part, mirror, pts[0].clone().lerp(pts[pts.length - 1], 0.5)), { ...part, detail }); return; }
    case 'blob': { const C = A(part.at); const rot = part.rot ? [part.rot[0], mirror ? -(part.rot[1] || 0) : part.rot[1] || 0, mirror ? -(part.rot[2] || 0) : part.rot[2] || 0] : null;
      blob(T, mb, C, part.size, weightsFor(S, part, mirror, C), { ...part, rot, detail }); return; }
    case 'scatter': { // detail spread over a sphere around an anchor: shape blob | spike | strand | scale
      const C = A(part.at); const r = rnd((part.seed || 5) + (mirror ? 99 : 0)); const R = [].concat(part.radius); const Rx = R[0], Ry = R[1] ?? R[0], Rz = R[2] ?? R[0];
      const el = part.elevation || [-0.2, 1.5], az = part.azimuth || [0, 360]; const W = weightsFor(S, part, mirror, C); const sz = [].concat(part.size || [0.02, 0.04]);
      for (let i = 0; i < (part.count || 30); i++) { const ph = el[0] + r() * (el[1] - el[0]); const th = (az[0] + r() * (az[1] - az[0])) * Math.PI / 180;
        const dir = new T.Vector3(Math.cos(ph) * Math.sin(th), Math.sin(ph), Math.cos(ph) * Math.cos(th)); if (mirror) dir.x = -dir.x;
        const base = C.clone().add(new T.Vector3(dir.x * Rx, dir.y * Ry, dir.z * Rz)); const s = sz[0] + r() * ((sz[1] ?? sz[0]) - sz[0]);
        if (part.shape === 'spike') { const tip = base.clone().addScaledVector(dir, (part.length || s * 3) * (0.7 + r() * 0.6)); loftPath(T, mb, [base, base.clone().lerp(tip, 0.5), tip], [s, s * 0.55, s * 0.05], W, { ring: 8, segments: 4, detail, caps: true }); }
        else if (part.shape === 'strand') { const len = (part.length || 0.2) * (0.7 + r() * 0.6); const out = dir.clone().setY(0).normalize(); const g = new T.Vector3().fromArray(part.gravity || [0, -1, 0]);
          const p1 = base.clone().addScaledVector(out, len * 0.25).addScaledVector(g, len * 0.2), p2 = base.clone().addScaledVector(out, len * 0.35).addScaledVector(g, len * 0.6), p3 = base.clone().addScaledVector(out, len * 0.4).addScaledVector(g, len);
          loftPath(T, mb, [base, p1, p2, p3], [s, s, s * 0.9, s * 0.65], W, { ring: 7, segments: 8, detail, caps: true }); }
        else if (part.shape === 'scale') { blob(T, mb, base, [s, s * 0.3, s * 0.8], W, { lat: 4, lon: 8, detail, rot: [0, Math.atan2(dir.x, dir.z) * 180 / Math.PI, 0] }); }
        else blob(T, mb, base, [s, s * 0.9, s], W, { lat: 6, lon: 9, detail, lumps: part.lumps ?? 0.15, seed: i + 3 }); }
      return; }
    default: throw new Error('unknown part type ' + part.type);
  }
}

// ---------------------------------------------------------------- main
export function forge(recipe, THREE) {
  const T = THREE; const detail = clamp(recipe.detail ?? 1, 0.5, 2.5);
  const defs = skeletonDef(recipe.skeleton || {}); const S = buildSkeleton(T, defs);
  const mats = {}; const mbs = {}; const errors = []; let seed = recipe.seed || 7;
  const mdef = Object.assign({ skin: { color: '#8a5a3c', color2: '#c99a6a', pattern: 'noise' }, eyes: { color: '#ffe8b0', unlit: true } }, recipe.materials || {});
  for (const [k, m] of Object.entries(mdef)) { mats[k] = material(T, m, seed++); mbs[k] = new MB(T, S); }
  for (const part of recipe.parts || []) {
    const key = part.material || 'skin'; if (!mbs[key]) { errors.push(`part uses unknown material "${key}" — using skin`); }
    const mb = mbs[key] || mbs.skin;
    for (const mir of part.mirror ? [false, true] : [false]) { try { buildPart(T, S, mb, part, mir, detail * (part.detail || 1)); } catch (e) { errors.push(`${part.type}${part.name ? ' "' + part.name + '"' : ''}: ${e.message}`); } }
  }
  const group = new T.Group(); group.name = recipe.name || 'forged'; group.add(S.root); const meshes = {};
  for (const k in mbs) { if (!mbs[k].p.length) continue; const m = new T.SkinnedMesh(mbs[k].geometry(), mats[k]); m.name = k; m.bind(S.skeleton, new T.Matrix4()); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; group.add(m); meshes[k] = m; }
  return { group, skeleton: S.skeleton, bones: S.bones, rest: S.rest, meshes, mats, recipe, errors, preset: (recipe.skeleton || {}).preset || 'humanoid', stats: { bones: S.list.length, verts: Object.values(mbs).reduce((a, b) => a + b.p.length / 3, 0), tris: Object.values(mbs).reduce((a, b) => a + b.ix.length / 3, 0) } };
}

// ---------------------------------------------------------------- recipe check (feed errors back to the AI)
export function validate(recipe) {
  const errs = []; if (!recipe || typeof recipe !== 'object') return ['recipe must be a JSON object'];
  let names; try { names = new Set(skeletonDef(recipe.skeleton || {}).map(b => b.name)); } catch (e) { return ['skeleton: ' + e.message]; }
  const mats = new Set(Object.keys(Object.assign({ skin: 1, eyes: 1 }, recipe.materials || {})));
  const chk = (a, where) => { if (!a || Array.isArray(a)) return; const bs = a.bone ? [a.bone] : a.between || []; for (const b of bs) if (!names.has(b)) errs.push(`${where}: unknown bone "${b}"`); };
  (recipe.parts || []).forEach((p, i) => { const w = `parts[${i}] (${p.type})`;
    if (!['torso', 'limb', 'loft', 'tube', 'blob', 'scatter'].includes(p.type)) errs.push(`${w}: unknown type`);
    if (p.material && !mats.has(p.material)) errs.push(`${w}: material "${p.material}" is not defined in materials`);
    if (p.chain) p.chain.forEach(b => { if (!names.has(b)) errs.push(`${w}: unknown bone "${b}" in chain`); });
    [p.at, p.from, p.to, ...(p.path || [])].forEach(a => chk(a, w)); if (p.bone && !names.has(p.bone)) errs.push(`${w}: unknown bone "${p.bone}"`);
    if ((p.type === 'limb' || p.type === 'loft' || p.type === 'tube') && !p.radius) errs.push(`${w}: needs radius`); if (p.type === 'blob' && !p.size) errs.push(`${w}: needs size`); });
  return errs;
}

// ---------------------------------------------------------------- preview motion (procedural; real mocap retargets onto Mixamo names)
export function animate(model, t, mode) {
  const B = model.bones; const rs = n => { if (!B[n]) return; B[n].quaternion.copy(B[n].userData.rest.q); B[n].position.copy(B[n].userData.rest.p); }; for (const n in B) rs(n);
  if (mode === 'rest') return; // bind pose (what the .glb exports)
  const T = model._T || (model._T = Object.getPrototypeOf(B[Object.keys(B)[0]].quaternion).constructor); const Q = (x, y, z) => { const e = { x, y, z }; const q = new T(); const c = Math.cos, s = Math.sin; const cx = c(x / 2), sx = s(x / 2), cy = c(y / 2), sy = s(y / 2), cz = c(z / 2), sz = s(z / 2); q.set(sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz); return q; };
  const rot = (n, x, y, z) => { if (B[n]) B[n].quaternion.multiply(Q(x, y, z)); };
  const pre = model.preset; mode = mode || (pre === 'quadruped' ? 'walk' : pre === 'none' ? 'wave' : 'guard');
  if (pre !== 'quadruped' && pre !== 'none' && B.LeftArm) {
    const b = Math.sin(t * 5.5) * 0.5 + 0.5; if (B.Hips) B.Hips.position.y = B.Hips.userData.rest.p.y - 0.03 - 0.025 * b;
    if (mode === 'guard') { for (const [S, s] of [['Left', 1], ['Right', -1]]) { rot(S + 'Arm', 0, -0.55 * s, -1.1 * s); rot(S + 'ForeArm', 0, -2.1 * s, 0); rot(S + 'Hand', 0, 0, -0.3 * s); rot(S + 'UpLeg', -0.25, 0, 0.06 * s); rot(S + 'Leg', 0.45, 0, 0); rot(S + 'Foot', -0.2, 0, 0); }
      rot('Spine1', 0.12 + 0.03 * b, 0, 0); rot('Neck', -0.08, 0, 0); }
    else for (const [S, s] of [['Left', 1], ['Right', -1]]) { rot(S + 'Arm', 0, 0, -1.25 * s); rot(S + 'ForeArm', 0, -0.2 * s, 0); }
  }
  if (pre === 'quadruped') { const ph = t * 6; for (const [E, o] of [['FrontLeft', 0], ['FrontRight', Math.PI], ['BackLeft', Math.PI], ['BackRight', 0]]) { rot(E + 'UpLeg', Math.sin(ph + o) * 0.45, 0, 0); rot(E + 'Leg', Math.max(0, -Math.cos(ph + o)) * 0.6 * (E.startsWith('Back') ? -1 : 1), 0, 0); }
    if (B.Hips) B.Hips.position.y = B.Hips.userData.rest.p.y + Math.abs(Math.sin(ph)) * 0.02; rot('Neck', Math.sin(ph * 2) * 0.05, 0, 0); }
  // any chain bones (tails, tentacles, wings) wave
  for (const n in B) { const m = n.match(/^(.*?)(\d+)$/); if (!m || /Spine/.test(n)) continue; const k = +m[2]; const ph = (m[1].length % 7) * 0.9; rot(n, Math.sin(t * 2.2 + k * 0.7 + ph) * 0.12, Math.cos(t * 1.7 + k * 0.6 + ph) * 0.14, 0); }
}
