// Skeleton construction + procedural skinned "living recipe" bodies.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);

export function buildSkeleton(data, scale = 1) {
  const root = new THREE.Group();
  const bones = {}, list = [];
  for (const b of data.rig) {
    const bone = new THREE.Bone();
    bone.name = b.n;
    bone.position.fromArray(b.pos).multiplyScalar(0.01 * scale);
    bone.quaternion.fromArray(b.q);
    bone.userData.restPos = bone.position.clone();
    bone.userData.restQuat = bone.quaternion.clone();
    bones[b.n] = bone; list.push(bone);
    (b.p ? bones[b.p] : root).add(bone);
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list);
  const index = {}; list.forEach((b, i) => index[b.name] = i);
  const rest = {}; for (const b of list) rest[b.name] = b.getWorldPosition(new THREE.Vector3());
  return { root, bones, list, skeleton, index, rest, scale };
}

// ---------- mesh builder ----------
class MB {
  constructor(index) { this.index = index; this.p = []; this.uv = []; this.si = []; this.sw = []; this.ix = []; this.seams = []; }
  v(p, u, v, w) {
    const ws = Object.entries(w).map(([n, x]) => [this.index[n], x]).filter(a => a[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = ws.reduce((a, b) => a + b[1], 0) || 1;
    this.p.push(p.x, p.y, p.z); this.uv.push(u, v);
    for (let i = 0; i < 4; i++) { this.si.push(ws[i] ? ws[i][0] : 0); this.sw.push(ws[i] ? ws[i][1] / s : 0); }
    return this.p.length / 3 - 1;
  }
  // rings: [{pts:[Vector3...] (n), w: weights obj or fn(j)->weights, v}]
  loft(rings, { capStart = false, capEnd = false, flip = false } = {}) {
    const n = rings[0].pts.length; const ids = [];
    rings.forEach(r => { const row = []; for (let j = 0; j <= n; j++) { const jj = j % n; const w = typeof r.w === 'function' ? r.w(jj, r.pts[jj]) : r.w; row.push(this.v(r.pts[jj], j / n, r.v, w)); } ids.push(row); this.seams.push([row[0], row[n]]); });
    for (let i = 0; i < ids.length - 1; i++) for (let j = 0; j < n; j++) {
      const a = ids[i][j], b = ids[i][j + 1], c = ids[i + 1][j], d = ids[i + 1][j + 1];
      if (flip) this.ix.push(a, b, c, b, d, c); else this.ix.push(a, c, b, b, c, d);
    }
    const cap = (row, r, inv) => { const c = new THREE.Vector3(); r.pts.forEach(p => c.add(p)); c.divideScalar(n); const w = typeof r.w === 'function' ? r.w(0, r.pts[0]) : r.w; const ci = this.v(c, 0.5, r.v, w); for (let j = 0; j < n; j++) { if (inv !== flip) this.ix.push(ci, row[j], row[j + 1]); else this.ix.push(ci, row[j + 1], row[j]); } };
    if (capStart) cap(ids[0], rings[0], false);
    if (capEnd) cap(ids[ids.length - 1], rings[rings.length - 1], true);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.ix);
    g.computeVertexNormals();
    const nr = g.attributes.normal;
    for (const [a, b] of this.seams) { const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b); const l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
    return g;
  }
}

function frame(t) {
  t = t.clone().normalize();
  const ref = Math.abs(t.y) > 0.8 ? V(0, 0, 1) : V(0, 1, 0);
  const e1 = new THREE.Vector3().crossVectors(t, ref).normalize();
  const e2 = new THREE.Vector3().crossVectors(e1, t).normalize();
  return { t, e1, e2 };
}

// tube from A to B, rfn(s, th) -> radius, wfn(s) -> weights
function tube(mb, A, B, rfn, wfn, { segs = 10, rad = 18, v0 = 0, v1 = 1, capStart = false, capEnd = false, e1, e2, ext0 = 0, ext1 = 0 } = {}) {
  const d = B.clone().sub(A); const L = d.length(); const f = frame(d);
  if (e1) { f.e1 = e1.clone(); f.e2 = e2.clone(); }
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs; const along = -ext0 + s * (L + ext0 + ext1);
    const c = A.clone().addScaledVector(f.t, along);
    const pts = [];
    for (let j = 0; j < rad; j++) { const th = j / rad * Math.PI * 2; const r = rfn(s, th); const rr = Array.isArray(r) ? r : [r, r];
      pts.push(c.clone().addScaledVector(f.e1, Math.cos(th) * rr[0]).addScaledVector(f.e2, Math.sin(th) * rr[1])); }
    rings.push({ pts, w: wfn(s), v: v0 + (v1 - v0) * s });
  }
  mb.loft(rings, { capStart, capEnd });
}

// continuous two-segment limb (no gap at the joint): rings follow A->B->C, weights blend across B
function limb(mb, A, B, C, r1, r2, w1, w2, { segs1 = 10, segs2 = 10, rad = 18, e1, e2, blend = 0.14, w0 = null, w0span = 0.15, ext0 = 0, v0 = 0 } = {}) {
  const rings = [];
  const add = (P0, P1, rf, n, first, isSecond) => {
    const d = P1.clone().sub(P0); const L = d.length(); const t = d.normalize();
    const a1 = e1.clone().addScaledVector(t, -e1.dot(t)).normalize(); const a2 = new THREE.Vector3().crossVectors(t, a1).normalize();
    const sgn = a2.dot(e2) < 0 ? -1 : 1;
    for (let i = first; i <= n; i++) {
      const sv = i / n; const c = P0.clone().addScaledVector(t, (isSecond ? 0 : -ext0) + sv * (L + (isSecond ? 0 : ext0)));
      const u = isSecond ? 1 + sv : sv; // global param 0..2
      let w;
      if (Math.abs(u - 1) < blend) w = lerpW(w1, w2, smooth((u - (1 - blend)) / (2 * blend)));
      else w = u < 1 ? w1 : w2;
      if (w0 && u < w0span) w = lerpW(w0, w, 0.5 + 0.5 * u / w0span);
      const pts = [];
      for (let j = 0; j < rad; j++) { const th = j / rad * Math.PI * 2; const r = rf(sv, th); const rr = Array.isArray(r) ? r : [r, r];
        pts.push(c.clone().addScaledVector(a1, Math.cos(th) * rr[0]).addScaledVector(a2, sgn * Math.sin(th) * rr[1])); }
      rings.push({ pts, w, v: v0 + u });
    }
  };
  add(A, B, r1, segs1, 0, false); add(B, C, r2, segs2, 1, true);
  mb.loft(rings, {});
}

function ellipsoid(mb, C, rx, ry, rz, w, { lat = 12, lon = 18, axes, shape } = {}) {
  const ax = axes || [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
  const rings = [];
  for (let i = 0; i <= lat; i++) {
    const phi = -Math.PI / 2 + Math.PI * i / lat; const pts = [];
    for (let j = 0; j < lon; j++) { const th = j / lon * Math.PI * 2; let k = shape ? shape(phi, th) : 1;
      const x = Math.cos(phi) * Math.cos(th) * rx * k, z = Math.cos(phi) * Math.sin(th) * rz * k, y = Math.sin(phi) * ry * (shape ? shape(phi, th, true) : 1);
      pts.push(C.clone().addScaledVector(ax[0], x).addScaledVector(ax[1], y).addScaledVector(ax[2], z)); }
    rings.push({ pts, w, v: i / lat });
  }
  mb.loft(rings, { flip: true });
}

const lerpW = (a, b, t) => { const o = {}; for (const k in a) o[k] = (o[k] || 0) + a[k] * (1 - t); for (const k in b) o[k] = (o[k] || 0) + b[k] * t; return o; };
const one = n => ({ [n]: 1 });

// ---------- textures ----------
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function skinTextures(kind, base, accent, seed = 7) {
  const r = rnd(seed);
  const col = new THREE.Color(base), acc = new THREE.Color(accent);
  const css = c => '#' + c.getHexString();
  let map, bump, emissive = null;
  if (kind === 'noodle') { // cocoa-ramen noodle fibre musculature
    map = canvasTex(256, 256, (g, w, h) => { g.fillStyle = css(col); g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { const x = r() * w; g.strokeStyle = `rgba(${acc.r * 255 | 0},${acc.g * 255 | 0},${acc.b * 255 | 0},${0.02 + r() * 0.05})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 3, y); g.stroke(); }
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 2, 2); } }, [3, 2]);
    bump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { const x = r() * w; const lg = g.createLinearGradient(x - 3, 0, x + 3, 0); lg.addColorStop(0, '#606060'); lg.addColorStop(.5, '#c0c0c0'); lg.addColorStop(1, '#606060'); g.fillStyle = lg; g.fillRect(x - 3, 0, 6, h); } }, [3, 2]);
  } else if (kind === 'graham') {
    map = canvasTex(256, 256, (g, w, h) => { g.fillStyle = css(col); g.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(90,50,20,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 2); } for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.fillStyle = 'rgba(80,40,10,.45)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } }, [4, 3]);
    bump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.fillStyle = '#303030'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }, [4, 3]);
  } else if (kind === 'popcorn') {
    map = canvasTex(256, 256, (g, w, h) => { g.fillStyle = css(col); g.fillRect(0, 0, w, h); for (let i = 0; i < 140; i++) { const x = r() * w, y = r() * h, s = 6 + r() * 14; const rg = g.createRadialGradient(x, y, 1, x, y, s); rg.addColorStop(0, 'rgba(255,250,225,.55)'); rg.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } }, [3, 2]);
    bump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#707070'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, s = 5 + r() * 12; const rg = g.createRadialGradient(x, y, 1, x, y, s); rg.addColorStop(0, '#e0e0e0'); rg.addColorStop(1, '#707070'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } }, [3, 2]);
  } else if (kind === 'iron') {
    const cracks = []; for (let i = 0; i < 14; i++) { let x = r() * 256, y = r() * 256; const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += (r() - .5) * 40; y += (r() - .5) * 40; pts.push([x, y]); } cracks.push(pts); }
    map = canvasTex(256, 256, (g, w, h) => { g.fillStyle = css(col); g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); } }, [3, 2]);
    emissive = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = css(acc); g.shadowColor = css(acc); g.shadowBlur = 6; for (const c of cracks) { g.lineWidth = 0.8 + r() * 1.2; g.beginPath(); g.moveTo(...c[0]); c.forEach(p => g.lineTo(...p)); g.stroke(); } }, [3, 2]);
    bump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { const v = 100 + r() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 3, 3); } g.strokeStyle = '#202020'; for (const c of cracks) { g.lineWidth = 2; g.beginPath(); g.moveTo(...c[0]); c.forEach(p => g.lineTo(...p)); g.stroke(); } }, [3, 2]);
  } else {
    map = canvasTex(64, 64, (g, w, h) => { g.fillStyle = css(col); g.fillRect(0, 0, w, h); });
  }
  return { map, bump, emissive };
}

// ---------- body generator ----------
export function buildBody(skel, spec) {
  const { rest, index } = skel; const s = skel.scale * 0.01; // cm->m in rest already (rest positions in metres)
  const P = n => rest[n].clone();
  const b = Object.assign({ shoulder: 1, chest: 1, waist: 1, arm: 1, leg: 1, head: 1, glove: 1, neck: 1 }, spec.build || {});
  const cm = x => x * s; // cm -> m (scaled)
  const skin = new MB(index), shorts = new MB(index), shoes = new MB(index), gloveL = new MB(index), gloveR = new MB(index), hair = new MB(index), accent = new MB(index), eyes = new MB(index), guard = new MB(index), shirt = new MB(index);
  const isRef = spec.outfit === 'ref';

  // --- torso loft (cross sections by height in cm, in rest space) ---
  const hipsY = rest.Hips.y / s;
  const secs = [ // y(cm), halfWidth, halfDepth, zOffset, front bulge
    [86, 14.5, 10.5, 0, 0], [92, 15.5, 11, 0, 0], [99, 15.8 * b.waist, 11, 0, 0], [106, 13.2 * b.waist, 10.2, 0.5, 0.5], [114, 13.6 * b.waist, 10.6, 0.3, 0.8],
    [122, 15.2 * b.chest, 11.2, -0.6, 1.2], [130, 17.2 * b.chest, 12.2, -1.4, 2.4 * b.chest], [137, 18.6 * b.shoulder, 12.0, -2.4, 2.6 * b.chest], [143, 17.0 * b.shoulder, 10.4, -3.6, 1.2],
    [148, 11.5 * b.neck, 8.2, -4.4, 0], [151, 6.4 * b.neck, 6.0, -4.6, 0]];
  const yScale = rest.Head.y / s / 159.9; // in case of rig scaling
  const torsoW = (yc, x) => { // weights by height with leg blend
    const ys = [[rest.Hips.y / s, 'Hips'], [rest.Spine.y / s, 'Spine'], [rest.Spine1.y / s, 'Spine1'], [rest.Spine2.y / s + 4, 'Spine2'], [rest.Neck.y / s, 'Neck']];
    let w;
    if (yc <= ys[0][0]) w = one('Hips');
    else if (yc >= ys[4][0]) w = one('Neck');
    else { for (let i = 0; i < 4; i++) if (yc >= ys[i][0] && yc <= ys[i + 1][0]) { const t = smooth((yc - ys[i][0]) / (ys[i + 1][0] - ys[i][0])); w = lerpW(one(ys[i][1]), one(ys[i + 1][1]), t); } }
    if (yc < 96) { const t = clamp((96 - yc) / 12, 0, 1) * 0.55; w = lerpW(w, one(x > 0 ? 'LeftUpLeg' : 'RightUpLeg'), t * clamp(Math.abs(x) / 6, 0, 1)); }
    if (yc > 138) { const t = clamp((yc - 138) / 8, 0, 1) * clamp((Math.abs(x) - 7) / 8, 0, 1) * 0.45; if (t > 0) w = lerpW(w, one(x > 0 ? 'LeftShoulder' : 'RightShoulder'), t); }
    return w;
  };
  const RAD = 24;
  const torsoRing = (sec, grow = 1) => {
    const [y0, hw, hd, zo, bulge] = sec; const y = y0 * yScale; const pts = [];
    for (let j = 0; j < RAD; j++) { const th = j / RAD * Math.PI * 2; const c = Math.cos(th), sn = Math.sin(th);
      const e = 2.6; const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * hw * grow; let pz = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e) * hd * grow;
      if (sn > 0) pz += bulge * Math.pow(sn, 2) * Math.pow(Math.abs(Math.cos(th * 2)), 0.5) * 0.9; // pec / ab shaping
      if (sn < 0 && y0 > 120) pz -= 1.2 * Math.pow(-sn, 3); // lats/back
      pts.push(V(cm(px), cm(y), cm(pz + zo))); }
    return { pts, w: (jj, p) => torsoW(y, p.x / s), v: y0 / 60 };
  };
  skin.loft(secs.map(sc => torsoRing(sc)), { capStart: true });

  // abs definition / chest line via accent? keep skin
  // --- neck & head ---
  tube(skin, P('Neck').add(V(0, cm(-3), 0)), P('Head').add(V(0, cm(2), cm(0.5))), (sv) => cm(6.8 * b.neck - sv * 0.9), sv => lerpW(one('Neck'), one('Head'), smooth(sv)), { segs: 4, rad: 16 });
  const headC = P('Head').add(V(0, cm(10.5 * b.head), cm(1.6)));
  const hs = 1 * b.head;
  ellipsoid(skin, headC, cm(9.2 * hs), cm(11.6 * hs), cm(10.4 * hs), one('Head'), { lat: 14, lon: 20, shape: (phi, th, isY) => { if (isY) return 1; const jaw = phi < -0.2 ? 1 - 0.18 * Math.min(1, (-phi - 0.2) * 1.4) : 1; const back = Math.sin(th) < 0 ? 1.04 : 1; return jaw * back; } });
  // ears
  for (const sx of [1, -1]) ellipsoid(skin, headC.clone().add(V(cm(9 * sx * hs), cm(-1), cm(-0.5))), cm(1.4), cm(3.0), cm(2.2), one('Head'), { lat: 6, lon: 8 });
  // eyes (glow) & brow
  for (const sx of [1, -1]) ellipsoid(eyes, headC.clone().add(V(cm(3.4 * sx * hs), cm(1.2), cm(9.2 * hs))), cm(1.6), cm(0.9), cm(0.8), one('Head'), { lat: 6, lon: 10 });
  ellipsoid(skin, headC.clone().add(V(0, cm(2.8), cm(8.6 * hs))), cm(6.4 * hs), cm(1.3), cm(2.0), one('Head'), { lat: 6, lon: 12 });
  ellipsoid(skin, headC.clone().add(V(0, cm(-1.5), cm(10.0 * hs))), cm(1.3), cm(2.6), cm(1.6), one('Head'), { lat: 6, lon: 10 }); // nose
  if (!isRef) ellipsoid(guard, headC.clone().add(V(0, cm(-6.0), cm(8.6 * hs))), cm(3.8), cm(1.1), cm(1.4), one('Head'), { lat: 6, lon: 12 }); // mouthguard
  else ellipsoid(shoes, headC.clone().add(V(0, cm(-6.0), cm(9.0 * hs))), cm(2.6), cm(0.45), cm(0.8), one('Head'), { lat: 4, lon: 10 }); // mouth line
  for (const sx of [1, -1]) { // brows + pupils give the face a read
    const bc = headC.clone().add(V(cm(3.6 * sx * hs), cm(3.6), cm(9.0 * hs)));
    ellipsoid(hair, bc, cm(2.3), cm(0.55), cm(0.9), one('Head'), { lat: 4, lon: 10, axes: [V(1, -0.18 * sx, 0).normalize(), V(0.18 * sx, 1, 0).normalize(), V(0, 0, 1)] });
    ellipsoid(hair, headC.clone().add(V(cm(3.4 * sx * hs), cm(1.2), cm(9.85 * hs))), cm(0.62), cm(0.62), cm(0.3), one('Head'), { lat: 4, lon: 8 });
    ellipsoid(skin, headC.clone().add(V(cm(4.6 * sx * hs), cm(-2.2), cm(7.6 * hs))), cm(2.2), cm(1.4), cm(1.6), one('Head'), { lat: 5, lon: 8 }); // cheekbone
  }

  // --- hair styles ---
  const r = rnd(spec.seed || 11);
  if (spec.hair === 'locs') { // noodle locs (cocoa-ramen)
    ellipsoid(hair, headC.clone().add(V(0, cm(3.2), cm(-1.0))), cm(9.8 * hs), cm(9.6 * hs), cm(10.6 * hs), one('Head'), { lat: 10, lon: 18, shape: (phi, th, y) => (phi < -0.1 ? 0.0001 + 0 : 1) });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 1.6 - Math.PI * 0.8 + Math.PI; // around back/sides
      const top = headC.clone().add(V(cm(Math.sin(a) * 9.2 * hs), cm(5 + r() * 3), cm(Math.cos(a) * 9.8 * hs - 1)));
      const len = 14 + r() * 12; const end = top.clone().add(V(cm(Math.sin(a) * 6), cm(-len), cm(Math.cos(a) * 6 - 2)));
      const mid = top.clone().lerp(end, 0.5).add(V(cm(Math.sin(a) * 3), 0, cm(Math.cos(a) * 3)));
      tube(hair, top, mid, sv => cm(1.25), sv => one('Head'), { segs: 2, rad: 6, capStart: true });
      tube(hair, mid, end, sv => cm(1.25 - sv * 0.35), sv => lerpW(one('Head'), one('Neck'), sv * 0.5), { segs: 3, rad: 6, capEnd: true });
    }
  } else if (spec.hair === 'popcorn') {
    for (let i = 0; i < 46; i++) { const th = r() * Math.PI * 2, ph = r() * 1.2 + 0.05; const R = 10.5 * hs;
      const c = headC.clone().add(V(cm(Math.cos(ph) * Math.sin(th) * R), cm(Math.sin(ph) * R + 3), cm(Math.cos(ph) * Math.cos(th) * R - 1.5)));
      if (c.z - headC.z > cm(6) && c.y - headC.y < cm(9)) continue;
      const k = 2.6 + r() * 2.6; ellipsoid(hair, c, cm(k), cm(k * 0.9), cm(k), one('Head'), { lat: 6, lon: 8, shape: (phi, th) => 1 + 0.18 * Math.sin(th * 3 + i) * Math.cos(phi * 2) }); }
  } else if (spec.hair === 'crown') { // skillet crown ridge
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const base = headC.clone().add(V(cm(Math.sin(a) * 7.5 * hs), cm(9.5 * hs), cm(Math.cos(a) * 8 * hs)));
      tube(hair, base, base.clone().add(V(cm(Math.sin(a) * 2), cm(6), cm(Math.cos(a) * 2))), sv => cm(2.2 * (1 - sv * 0.85)), () => one('Head'), { segs: 3, rad: 8, capStart: true, capEnd: true }); }
    tube(hair, headC.clone().add(V(0, cm(8.2 * hs), cm(-9 * hs))), headC.clone().add(V(0, cm(8.2 * hs), cm(9 * hs))), () => cm(0.1), () => one('Head'), { segs: 1, rad: 4 });
    ellipsoid(hair, headC.clone().add(V(0, cm(9.4 * hs), 0)), cm(8.6 * hs), cm(1.6), cm(9.2 * hs), one('Head'), { lat: 4, lon: 18 });
  } else if (spec.hair === 'short') {
    ellipsoid(hair, headC.clone().add(V(0, cm(2.6), cm(-0.9))), cm(9.7 * hs), cm(9.9 * hs), cm(10.7 * hs), one('Head'), { lat: 10, lon: 18, shape: (phi, th, y) => (phi < 0.05 ? 0.0001 : 1) });
  } else if (spec.hair === 'flattop') {
    ellipsoid(hair, headC.clone().add(V(0, cm(6.5), cm(-0.6))), cm(9.6 * hs), cm(6.2), cm(10.6 * hs), one('Head'), { lat: 8, lon: 18, shape: (phi, th, y) => y ? (phi > 0.35 ? 0.62 + 0.38 * 0.35 / phi : 1) : 1 });
  }

  // --- arms ---
  for (const side of ['Left', 'Right']) {
    const sx = side === 'Left' ? 1 : -1;
    const sh = P(side + 'Arm'), el = P(side + 'ForeArm'), wr = P(side + 'Hand');
    const up = V(0, 1, 0), fw = V(0, 0, 1);
    // deltoid
    ellipsoid(skin, sh.clone().add(V(cm(1.6 * sx), cm(0.6), cm(0.4))), cm(8.4 * b.shoulder), cm(7.4 * b.shoulder), cm(7.8 * b.shoulder), lerpW(one(side + 'Arm'), one(side + 'Shoulder'), 0.35), { lat: 10, lon: 16 });
    // upper arm + forearm as one continuous skinned limb (biceps/triceps, forearm flexors)
    limb(skin, sh, el, wr,
      (sv, th) => { const base = 6.8 - 1.4 * sv; const bi = 1.25 * Math.max(0, Math.sin(th)) * Math.sin(Math.PI * clamp((sv - 0.15) / 0.75, 0, 1)); const tri = 0.9 * Math.max(0, -Math.sin(th)) * Math.sin(Math.PI * clamp(sv / 0.8, 0, 1)); return cm((base + bi + tri) * b.arm); },
      (sv, th) => { const base = 5.4 - 1.8 * sv; const m = 1.0 * Math.sin(Math.PI * clamp(sv / 0.6, 0, 1)); return [cm((base + m) * b.arm), cm((base * 0.88 + m * 0.7) * b.arm)]; },
      one(side + 'Arm'), one(side + 'ForeArm'), { e1: up, e2: fw, w0: one(side + 'Shoulder'), w0span: 0.15, ext0: cm(2), blend: 0.12 });
    if (isRef) { // bare fists + short shirt sleeves
      ellipsoid(skin, wr.clone().add(V(cm(4.2 * sx), cm(-0.5), cm(0.6))), cm(4.6), cm(3.4), cm(3.9), one(side + 'Hand'), { lat: 8, lon: 12, axes: [V(sx, 0, 0), up, fw] });
      tube(shirt, sh.clone().add(V(cm(-3 * sx), 0, 0)), sh.clone().lerp(el, 0.5), sv => cm(8.4 - sv * 1.0), sv => sv < 0.3 ? lerpW(one(side + 'Shoulder'), one(side + 'Arm'), 0.5 + sv * 1.6) : one(side + 'Arm'), { segs: 4, rad: 18, e1: up, e2: fw });
      continue;
    }
    // glove (rigid on hand) — big rounded mitt + thumb + cuff
    const gm = side === 'Left' ? gloveL : gloveR; const G = b.glove;
    const dir = V(sx, 0, 0);
    const gc = wr.clone().add(V(cm(9.5 * sx * G), cm(-0.4), cm(0.8)));
    tube(gm, wr.clone().add(V(cm(-6 * sx), 0, 0)), wr.clone().add(V(cm(2 * sx), 0, 0)), sv => [cm((5.0 + sv * 1.6) * G), cm((5.2 + sv * 1.4) * G)], () => one(side + 'Hand'), { segs: 3, rad: 16, e1: up, e2: fw });
    ellipsoid(gm, gc, cm(9.6 * G), cm(7.4 * G), cm(7.0 * G), one(side + 'Hand'), { lat: 12, lon: 18, axes: [dir, up, fw], shape: (phi, th, y) => y ? 1 : 1 + 0.12 * Math.max(0, Math.cos(th)) });
    ellipsoid(gm, wr.clone().add(V(cm(6.5 * sx * G), cm(-1), cm(6.4 * G))), cm(5.0 * G), cm(2.9 * G), cm(2.6 * G), one(side + 'Hand'), { lat: 8, lon: 10, axes: [V(sx * 0.8, 0, 0.6).normalize(), up, V(-0.6 * sx, 0, 0.8).normalize()] });
    // glaze chamber ring at the cuff (accent glow)
    tube(accent, wr.clone().add(V(cm(-3.5 * sx), 0, 0)), wr.clone().add(V(cm(-1.5 * sx), 0, 0)), () => [cm(5.7 * G), cm(5.9 * G)], () => one(side + 'Hand'), { segs: 1, rad: 16, e1: up, e2: fw });
  }

  // --- legs ---
  for (const side of ['Left', 'Right']) {
    const sx = side === 'Left' ? 1 : -1;
    const hip = P(side + 'UpLeg'), kn = P(side + 'Leg'), an = P(side + 'Foot'), toe = P(side + 'ToeBase'), toeE = P(side + 'Toe_End');
    const e1 = V(1, 0, 0), e2 = V(0, 0, 1);
    limb(skin, hip.clone().add(V(0, cm(4), 0)), kn, an,
      (sv, th) => { const base = 10.6 - 4.3 * sv; const quad = 1.5 * Math.max(0, Math.sin(th)) * Math.sin(Math.PI * clamp(sv / 0.9, 0, 1)); const inner = 0.9 * Math.max(0, -Math.cos(th) * sx) * (1 - sv); return cm((base + quad + inner) * b.leg); },
      (sv, th) => { const base = 6.3 - 2.6 * sv; const calf = 2.1 * Math.max(0, -Math.sin(th)) * Math.sin(Math.PI * clamp((sv - 0.05) / 0.55, 0, 1)); return cm((base + calf) * b.leg); },
      one(side + 'UpLeg'), one(side + 'Leg'), { e1, e2, w0: one('Hips'), w0span: 0.12, blend: 0.1 });
    // boots (boxing shoes)
    tube(shoes, kn.clone().lerp(an, 0.6), an.clone().add(V(0, cm(-2), 0)), sv => cm(5.0 - sv * 0.5), sv => sv < 0.85 ? one(side + 'Leg') : lerpW(one(side + 'Leg'), one(side + 'Foot'), 0.5), { segs: 4, rad: 14, e1, e2 });
    const heel = an.clone().add(V(0, cm(-4.5), cm(-3))); const footEnd = toeE.clone().add(V(0, cm(3), cm(0)));
    tube(shoes, heel, footEnd, (sv, th) => [cm(4.4 - sv * 0.6), cm(4.0 - sv * 1.4 + Math.max(0, Math.sin(th)) * (1 - sv) * 2.5)], sv => sv < 0.55 ? one(side + 'Foot') : lerpW(one(side + 'Foot'), one(side + 'ToeBase'), (sv - 0.55) / 0.45), { segs: 8, rad: 14, e1, e2: V(0, 1, 0), capStart: true, capEnd: true });
    // shorts leg (referee: full trousers)
    if (isRef) { limb(shorts, hip.clone().add(V(0, cm(7), 0)), kn, an.clone().add(V(0, cm(4), 0)), (sv) => cm(12.0 - 3.6 * sv), (sv) => cm(8.2 - 1.6 * sv), one(side + 'UpLeg'), one(side + 'Leg'), { e1, e2, w0: one('Hips'), w0span: 0.2, blend: 0.1, segs1: 6, segs2: 6 }); continue; }
    tube(shorts, hip.clone().add(V(0, cm(7), 0)), hip.clone().lerp(kn, 0.42), sv => cm((12.6 - 1.6 * sv) * Math.max(1, b.leg)), sv => sv < 0.25 ? lerpW(one('Hips'), one(side + 'UpLeg'), 0.5 + sv * 2) : one(side + 'UpLeg'), { segs: 5, rad: 18, e1, e2 });
  }
  // shorts waist
  const wsecs = [[86, 15.5, 11.5, 0, 0], [92, 16.6, 12, 0, 0], [99, 17.0 * b.waist, 12, 0, 0], [105, 15.2 * b.waist, 11.6, 0.5, 0.4], [107.5, 15.0 * b.waist, 11.5, 0.5, 0.4]];
  shorts.loft(wsecs.map(sc => torsoRing(sc, 1.07)), {});
  if (isRef) {
    shirt.loft(secs.slice(2, 10).map(sc => torsoRing(sc, 1.07)), {});
    for (const sx of [1, -1]) ellipsoid(shoes, P('Neck').add(V(cm(2.4 * sx), cm(-2.5), cm(5.4))), cm(2.2), cm(1.4), cm(0.9), one('Neck'), { lat: 5, lon: 8 });
  }
  // waistband (accent)
  accent.loft([[103.6, 15.0 * b.waist, 11.4, 0.5, 0.4], [107.8, 15.0 * b.waist, 11.5, 0.5, 0.4]].map(sc => torsoRing(sc, 1.1)), {});

  return { skin, shorts, shoes, gloveL, gloveR, hair, accent, eyes, guard, shirt };
}

const LIGHT = { shoulder: 0.85, chest: 0.8, waist: 0.83, arm: 0.76, leg: 0.85, neck: 0.85 }, DENSE = { shoulder: 1.2, chest: 1.26, waist: 1.24, arm: 1.3, leg: 1.17, neck: 1.25 };
export function createFighterMesh(skel, spec) {
  const parts = buildBody(skel, spec);
  let morph = null;
  if (spec.weightshift) {
    const mk = mul => { const bb = Object.assign({}, spec.build || {}); for (const k in mul) bb[k] = (bb[k] || 1) * mul[k]; return buildBody(skel, Object.assign({}, spec, { build: bb })); };
    morph = [mk(LIGHT), mk(DENSE)];
  }
  const tex = skinTextures(spec.skinKind, spec.skin, spec.skin2, spec.seed || 3);
  const mats = {
    skin: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: tex.map, bumpMap: tex.bump, bumpScale: spec.skinKind === 'noodle' ? 0.45 : 1.0, roughness: spec.skinRough ?? 0.55, sheen: 0.3, sheenColor: new THREE.Color(spec.skin2), sheenRoughness: 0.6, clearcoat: spec.skinCoat ?? 0.15, clearcoatRoughness: 0.4, emissiveMap: tex.emissive || null, emissive: tex.emissive ? new THREE.Color(spec.skin2) : new THREE.Color(0), emissiveIntensity: tex.emissive ? 0.7 : 0 }),
    shorts: new THREE.MeshPhysicalMaterial({ color: spec.shorts, roughness: 0.32, sheen: 1, sheenColor: new THREE.Color(spec.shortsSheen || 0xffffff), clearcoat: 0.5 }),
    shoes: new THREE.MeshStandardMaterial({ color: spec.shoes || 0x111111, roughness: 0.35, metalness: 0.1 }),
    gloveL: new THREE.MeshPhysicalMaterial({ color: spec.gloveL, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(spec.gloveL), emissiveIntensity: 0.08 }),
    gloveR: new THREE.MeshPhysicalMaterial({ color: spec.gloveR, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: new THREE.Color(spec.gloveR), emissiveIntensity: 0.08 }),
    hair: new THREE.MeshPhysicalMaterial({ color: spec.hairColor || 0x2a160c, roughness: 0.45, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color(spec.skin2) , emissive: new THREE.Color(spec.hairGlow || 0), emissiveIntensity: spec.hairGlow ? 0.8 : 0 }),
    accent: new THREE.MeshStandardMaterial({ color: spec.accent, emissive: new THREE.Color(spec.accent), emissiveIntensity: 1.2, roughness: 0.3 }),
    eyes: new THREE.MeshBasicMaterial({ color: spec.eyes || 0xffe0a0 }),
    guard: new THREE.MeshPhysicalMaterial({ color: spec.guard || spec.shorts, roughness: 0.2, clearcoat: 1 }),
    shirt: new THREE.MeshStandardMaterial({ color: spec.shirt || 0xf2f2f4, roughness: 0.75 }),
  };
  const group = new THREE.Group(); const meshes = {};
  for (const k in parts) {
    if (!parts[k].p.length) continue;
    const geo = parts[k].geometry();
    if (morph && morph[0][k].p.length === parts[k].p.length && morph[1][k].p.length === parts[k].p.length && parts[k].p.some((v, i) => v !== morph[1][k].p[i])) {
      geo.morphAttributes.position = morph.map(mp => new THREE.Float32BufferAttribute(mp[k].p, 3));
    }
    const m = new THREE.SkinnedMesh(geo, mats[k]);
    m.bind(skel.skeleton, new THREE.Matrix4());
    m.castShadow = true; m.receiveShadow = k !== 'eyes'; m.frustumCulled = false;
    group.add(m); meshes[k] = m;
  }
  return { group, meshes, mats };
}

// ---------- roster ----------
export const ROSTER = {
  savannah: { id: 'savannah', attrs: { power: 72, balance: 70, agility: 76, hands: 74, chin: 70, engine: 72 }, name: 'SAVANNAH PRESSURE', short: 'Savannah', title: 'Cocoa-Ramen · Espresso-Crema · Caramelized PB', skinKind: 'noodle', skin: 0x5b3220, skin2: 0xd9a35c, shorts: 0x00c8c8, shortsSheen: 0xffe28a, accent: 0xffb000, gloveL: 0xff8a1e, gloveR: 0xff2f86, hair: 'locs', hairColor: 0x2b170b, eyes: 0xffd27a, build: { shoulder: 1.04, chest: 1.04, arm: 1.04 }, style: 'counter', seed: 21, weightshift: true,
    blurb: 'Patient, analytical counter-puncher. Noodle-fibre elasticity, crema-sharp read on rhythm.' },
  graham: { id: 'graham', attrs: { power: 68, balance: 82, agility: 60, hands: 66, chin: 84, engine: 74 }, name: 'GRAHAM GUARD', short: 'Graham', title: 'Honey-Graham · Cinnamon · Toasted Marshmallow', skinKind: 'graham', skin: 0xb07a3e, skin2: 0xe8c08a, shorts: 0x7a1530, shortsSheen: 0xffc0c0, accent: 0xfff2e0, gloveL: 0xf3e6d0, gloveR: 0xf3e6d0, hair: 'flattop', hairColor: 0x8a5a2a, eyes: 0xfff6dc, build: { shoulder: 1.12, chest: 1.1, arm: 1.1, waist: 1.08, neck: 1.15, glove: 1.06 }, style: 'defense', seed: 5,
    blurb: 'Defense and redirection. High guard, shoulder roll, makes you pay for lazy jabs.' },
  pop: { id: 'pop', attrs: { power: 62, balance: 70, agility: 88, hands: 82, chin: 62, engine: 78 }, name: 'LADY POP GREASE', short: 'Pop Grease', title: 'Butter-Popcorn · Sea Salt · Kettle Sugar', skinKind: 'popcorn', skin: 0xe8b44a, skin2: 0xfff3c8, shorts: 0xe02030, shortsSheen: 0xffffff, accent: 0xffffff, gloveL: 0xffe066, gloveR: 0xffe066, hair: 'popcorn', hairColor: 0xfff4d0, eyes: 0xffffff, build: { shoulder: 0.94, chest: 0.94, waist: 0.88, arm: 0.94, leg: 0.96, head: 0.97, neck: 0.9 }, style: 'movement', seed: 9,
    blurb: 'Footwork and leverage. Pops in, pops out — chases angles, punishes flat feet.' },
  skillet: { id: 'skillet', attrs: { power: 88, balance: 64, agility: 56, hands: 64, chin: 80, engine: 68 }, name: 'CROWN SKILLET', short: 'Skillet', title: 'Cast-Iron · Ember Pepper · Smoked Salt', skinKind: 'iron', skin: 0x2a2a2e, skin2: 0xff5a10, shorts: 0x111111, shortsSheen: 0xff7a20, accent: 0xff6a00, gloveL: 0x1c1c1f, gloveR: 0x1c1c1f, hair: 'crown', hairColor: 0x1a1a1c, hairGlow: 0x401000, eyes: 0xff7a20, skinRough: 0.6, skinCoat: 0.1, build: { shoulder: 1.1, chest: 1.12, waist: 1.12, arm: 1.12, leg: 1.06, neck: 1.2, glove: 1.04 }, style: 'pressure', seed: 13,
    blurb: 'Burner control and pressure. Gets stronger on heat zones; walks you into the fire.' },
};

export const REF_SPEC = { id: 'ref', name: 'REFEREE', short: 'Ref', skinKind: 'plain', skin: 0x7a4e30, skin2: 0xc89a6a, shorts: 0x1a1a1f, shortsSheen: 0x333344, accent: 0x18181c, shoes: 0x0c0c0e, gloveL: 0, gloveR: 0, hair: 'short', hairColor: 0x1b1410, eyes: 0xf0e6dc, outfit: 'ref', build: { shoulder: 0.96, chest: 0.98, arm: 0.92, waist: 1.04 }, seed: 31 };
