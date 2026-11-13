// SKATE YARD WORLD — PROPOSAL / PUBLISH HOLD (opt-in: ?real_skate=1)
// Test-Yard-style park for the Connected Skatepark lot: halfpipe, wall quarter, funbox with rail + ledges,
// kicker, flat bar, long ledge, manual pad, three-stair with handrail.
// Ported from the owner's METAL Test Yard 3D layout (profile/box heightfield), compacted to fit one 44 m lot.
// Every surface is a height profile or a box, so physics and meshes come from the same numbers.
// Pure geometry (createSkateYard) has no Three.js dependency and is unit-tested; buildSkateYardMeshes takes THREE.

const AX = { 'x+': [1, 0], 'x-': [-1, 0], 'z+': [0, 1], 'z-': [0, -1] };

function qpPts(R, deg, deck) {
  const a = deg * Math.PI / 180, N = 24, pts = [[0, 0]];
  for (let i = 1; i <= N; i++) { const t = a * i / N; pts.push([R * Math.sin(t), R - R * Math.cos(t)]); }
  const uM = R * Math.sin(a), H = R - R * Math.cos(a);
  pts.push([uM + deck, H], [uM + deck, 0]);
  return { pts, uM, H };
}

// layout in lot-local metres (lot is 44 × 44, centre = 0,0). y = height above the lot floor.
export function yardLayout() {
  const L = { els: [], rails: [] };
  const profile = (o) => {
    const [dx, dz] = AX[o.ax];
    Object.assign(o, { type: 'profile', dx, dz, lx: -dz, lz: dx, uMin: o.pts[0][0], uMax: o.pts[o.pts.length - 1][0] });
    const c = [[o.uMin, -o.W / 2], [o.uMax, -o.W / 2], [o.uMin, o.W / 2], [o.uMax, o.W / 2]].map(([u, w]) => [o.x + dx * u + o.lx * w, o.z + dz * u + o.lz * w]);
    o.bx0 = Math.min(...c.map(p => p[0])); o.bx1 = Math.max(...c.map(p => p[0]));
    o.bz0 = Math.min(...c.map(p => p[1])); o.bz1 = Math.max(...c.map(p => p[1]));
    L.els.push(o); return o;
  };
  const box = (o) => { Object.assign(o, { type: 'box', bx0: o.x0, bx1: o.x1, bz0: o.z0, bz1: o.z1 }); L.els.push(o); return o; };
  const rail = (a, b, kind, name) => L.rails.push({ a, b, kind, name });
  const coping = (el, uM, H) => { const p = w => [el.x + el.dx * uM + el.lx * w, H, el.z + el.dz * uM + el.lz * w]; rail(p(-el.W / 2 + 0.2), p(el.W / 2 - 0.2), 'coping', 'Coping'); };

  // Halfpipe across x (two quarters facing each other, 8 m flat bottom), back of the lot
  const HP = qpPts(3.6, 80, 1.8);
  const a = profile({ x: 4, z: 13, ax: 'x+', W: 10, pts: HP.pts, mat: 'ramp', name: 'Halfpipe' });
  const b = profile({ x: -4, z: 13, ax: 'x-', W: 10, pts: HP.pts, mat: 'ramp', name: 'Halfpipe' });
  coping(a, HP.uM, HP.H); coping(b, HP.uM, HP.H);
  // Wall quarter pipe along the front edge
  const WQ = qpPts(3, 72, 1.4);
  const w = profile({ x: 0, z: -14, ax: 'z-', W: 22, pts: WQ.pts, mat: 'ramp', name: 'Wall QP' });
  coping(w, WQ.uM, WQ.H);
  // Funbox (up-flat-down along x) with a top rail and two edge ledges
  profile({ x: -6, z: -4, ax: 'x+', W: 4.6, pts: [[0, 0], [3, 1.0], [9, 1.0], [12, 0]], mat: 'ramp', name: 'Funbox' });
  rail([-2.6, 1.42, -4], [2.6, 1.42, -4], 'rail', 'Funbox rail');
  rail([-3, 1.0, -6.3], [3, 1.0, -6.3], 'ledge', 'Funbox ledge');
  rail([-3, 1.0, -1.7], [3, 1.0, -1.7], 'ledge', 'Funbox ledge');
  // Kicker launch (approach from -z)
  profile({ x: 12, z: 1.5, ax: 'z+', W: 3.2, pts: [[0, 0], [2.4, 0.85], [2.4, 0]], mat: 'ramp', name: 'Kicker' });
  // Long ledge + manual pad
  box({ x0: 17.6, x1: 18.8, z0: -6, z1: 9, h: 0.5, mat: 'block', name: 'Ledge' });
  rail([17.6, 0.5, -6], [17.6, 0.5, 9], 'ledge', 'Ledge'); rail([18.8, 0.5, -6], [18.8, 0.5, 9], 'ledge', 'Ledge');
  box({ x0: -18, x1: -11, z0: -1.5, z1: 1.5, h: 0.3, mat: 'block', name: 'Manual pad' });
  rail([-18, 0.3, -1.5], [-11, 0.3, -1.5], 'ledge', 'Pad'); rail([-18, 0.3, 1.5], [-11, 0.3, 1.5], 'ledge', 'Pad');
  // Flat bar through the middle line
  rail([-9, 0.55, 4.2], [6, 0.55, 4.2], 'rail', 'Flat bar');
  // Three-stair with platform bank and handrail (roll up the bank, drop the stairs toward +x)
  profile({ x: -20, z: -12, ax: 'x+', W: 4, pts: [[0, 0], [4.5, 0.9], [7, 0.9], [7, 0.6], [7.45, 0.6], [7.45, 0.3], [7.9, 0.3], [7.9, 0]], mat: 'block', name: 'Three-stair' });
  rail([-14.2, 1.75, -9.7], [-13, 1.75, -9.7], 'rail', 'Handrail');
  rail([-13, 1.75, -9.7], [-11.65, 0.85, -9.7], 'rail', 'Handrail');
  L.HP = HP; L.WQ = WQ;
  return L;
}

function hEl(el, x, z) {
  if (x < el.bx0 || x > el.bx1 || z < el.bz0 || z > el.bz1) return -1;
  if (el.type === 'box') return el.h;
  const rx = x - el.x, rz = z - el.z;
  const u = rx * el.dx + rz * el.dz, w = rx * el.lx + rz * el.lz;
  if (w < -el.W / 2 || w > el.W / 2 || u < el.uMin || u > el.uMax) return -1;
  const p = el.pts;
  for (let i = 0; i < p.length - 1; i++) {
    const A = p[i], B = p[i + 1];
    if (B[0] <= A[0]) continue;
    if (u >= A[0] && u <= B[0]) return A[1] + (B[1] - A[1]) * (u - A[0]) / (B[0] - A[0]);
  }
  return -1;
}

// cx, cz = lot centre in world space; base = lot floor height (Connected groundY)
export function createSkateYard({ cx = 0, cz = 0, base = 0 } = {}) {
  const L = yardLayout();
  const rails = L.rails.map(r => {
    const a = { x: r.a[0] + cx, y: r.a[1] + base, z: r.a[2] + cz }, b = { x: r.b[0] + cx, y: r.b[1] + base, z: r.b[2] + cz };
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, b.y - a.y, dz);
    return { ...r, a, b, len, yaw: Math.atan2(dx, dz) };
  });
  const half = 22;
  const inside = (x, z) => Math.abs(x - cx) <= half && Math.abs(z - cz) <= half;
  // height above the lot floor (0 = flat)
  const h = (x, z) => { if (!inside(x, z)) return 0; const lx = x - cx, lz = z - cz; let v = 0; for (const el of L.els) { const e = hEl(el, lx, lz); if (e > v) v = e; } return v; };
  const GE = 0.03;
  const pick = (dF, dB) => { const wF = Math.abs(dF) > 0.25, wB = Math.abs(dB) > 0.25; if (wF && !wB) return dB / GE; if (wB && !wF) return dF / GE; if (wF && wB) return 0; return (dF + dB) / (2 * GE); };
  const grad = (x, z) => { const h0 = h(x, z); return [pick(h(x + GE, z) - h0, h0 - h(x - GE, z)), pick(h(x, z + GE) - h0, h0 - h(x, z - GE))]; };
  return {
    layout: L, rails, cx, cz, base, inside,
    height: h, grad,
    // world floor (absolute y)
    floorY: (x, z) => base + h(x, z),
    // walking floor: step-up tolerance so the on-foot controller can climb ramps but not teleport onto walls
    walkFloor: (x, z, y, step = 0.4) => { const f = base + h(x, z); return f <= y + step ? f : null; },
    // a vertical face taller than `step` between the rider and this point
    blocked: (x, z, y, step = 0.4) => base + h(x, z) > y + step,
    normal: (x, z) => { const [gx, gz] = grad(x, z); const n = Math.hypot(gx, 1, gz); return { x: -gx / n, y: 1 / n, z: -gz / n }; },
    // nearest rail candidate for a lock (horizontal + vertical windows)
    nearestRail(p, { dh = 0.45, dyLo = -0.25, dyHi = 0.4 } = {}) {
      let best = null, bs = 1e9;
      for (const r of rails) {
        const ax = r.a.x, az = r.a.z, bx = r.b.x - ax, bz = r.b.z - az, L2 = bx * bx + bz * bz;
        const t = Math.max(0, Math.min(1, ((p.x - ax) * bx + (p.z - az) * bz) / L2));
        if (t <= 0.02 || t >= 0.98) continue;
        const qx = ax + bx * t, qz = az + bz * t, qy = r.a.y + (r.b.y - r.a.y) * t;
        const d = Math.hypot(p.x - qx, p.z - qz), dy = p.y - qy;
        if (d < dh && dy > dyLo && dy < dyHi) { const sc = d + Math.abs(dy) * 0.5; if (sc < bs) { bs = sc; best = { r, t, q: { x: qx, y: qy, z: qz } }; } }
      }
      return best;
    },
    railPoint(r, t) { return { x: r.a.x + (r.b.x - r.a.x) * t, y: r.a.y + (r.b.y - r.a.y) * t, z: r.a.z + (r.b.z - r.a.z) * t }; },
  };
}

// Meshes (Three.js passed in so this file stays importable from node tests)
export function buildSkateYardMeshes(THREE, scene, yard, { gun = 0x3a3d44 } = {}) {
  const L = yard.layout, cx = yard.cx, cz = yard.cz, base = yard.base, group = new THREE.Group();
  group.name = 'RealSkateYard';
  const MAT = {
    ramp: new THREE.MeshStandardMaterial({ color: 0xbdb5a8, roughness: 0.82 }),
    block: new THREE.MeshStandardMaterial({ color: 0xa9a093, roughness: 0.9 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb8c6d0, metalness: 0.85, roughness: 0.32 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xffb11f, roughness: 0.6 }),
    pad: new THREE.MeshStandardMaterial({ color: 0x8e8a84, roughness: 0.95 }),
  };
  const slab = new THREE.Mesh(new THREE.BoxGeometry(44, 0.04, 44), MAT.pad);
  slab.position.set(cx, base + 0.005, cz); slab.receiveShadow = true; group.add(slab);
  for (const el of L.els) {
    let mesh;
    if (el.type === 'profile') {
      const s = new THREE.Shape(); s.moveTo(el.pts[0][0], 0);
      for (const [u, hh] of el.pts) s.lineTo(u, hh);
      s.lineTo(el.uMax, 0); s.lineTo(el.uMin, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: el.W, bevelEnabled: false, curveSegments: 1 });
      g.translate(0, 0, -el.W / 2);
      mesh = new THREE.Mesh(g, MAT[el.mat]);
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(el.dx, 0, el.dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(el.lx, 0, el.lz));
      mesh.quaternion.setFromRotationMatrix(m); mesh.position.set(cx + el.x, base, cz + el.z);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(el.x1 - el.x0, el.h, el.z1 - el.z0), MAT[el.mat]);
      mesh.position.set(cx + (el.x0 + el.x1) / 2, base + el.h / 2, cz + (el.z0 + el.z1) / 2);
    }
    mesh.castShadow = mesh.receiveShadow = true; mesh.userData.skateYard = el.name; group.add(mesh);
  }
  const up = new THREE.Vector3(0, 1, 0);
  const rod = (a, b, r, mat) => {
    const A = new THREE.Vector3(a.x, a.y, a.z), d = new THREE.Vector3(b.x, b.y, b.z).sub(A), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
    m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(up, d.normalize()); m.castShadow = true; group.add(m); return m;
  };
  for (const r of yard.rails) {
    if (r.kind === 'rail' || r.kind === 'coping') {
      rod(r.a, r.b, r.kind === 'coping' ? 0.045 : 0.035, MAT.steel).userData.rail = r.name;
      if (r.kind === 'rail') {
        const n = Math.max(2, Math.ceil(r.len / 4));
        for (let i = 0; i <= n; i++) {
          const p = yard.railPoint(r, i / n), gh = yard.floorY(p.x, p.z);
          if (p.y - gh > 0.05) rod({ x: p.x, y: gh, z: p.z }, p, 0.03, MAT.steel).userData.rail = r.name;
        }
      }
    } else {
      const A = new THREE.Vector3(r.a.x, r.a.y, r.a.z), d = new THREE.Vector3(r.b.x, r.b.y, r.b.z).sub(A), len = d.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, len), MAT.paint);
      m.position.copy(A).addScaledVector(d, 0.5); m.position.y -= 0.01; m.rotation.y = Math.atan2(d.x, d.z); group.add(m);
    }
  }
  scene.add(group);
  return group;
}
