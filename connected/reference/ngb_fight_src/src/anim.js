// Clip decoding, sampling, blending, and IK helpers.
import * as THREE from 'three';

export class ClipLib {
  constructor(data) {
    this.bones = data.bones; this.nB = data.bones.length; this.clips = {};
    const hipsIdx = 0;
    for (const [name, c] of Object.entries(data.clips)) {
      const qb = Uint8Array.from(atob(c.q), ch => ch.charCodeAt(0));
      const hb = Uint8Array.from(atob(c.h), ch => ch.charCodeAt(0));
      const qi = new Int16Array(qb.buffer), hi = new Int16Array(hb.buffer);
      const q = new Float32Array(qi.length); for (let i = 0; i < qi.length; i++) q[i] = qi[i] / 32767;
      const h = new Float32Array(hi.length); for (let i = 0; i < hi.length; i++) h[i] = hi[i] / 1000; // mm*? (cm*10) -> m
      this.clips[name] = { name, label: c.label, loop: c.loop, fps: c.fps, n: c.n, q, h, duration: (c.n - 1) / c.fps };
    }
    // reference hips for root-motion: idle mean xz
    const idle = this.clips.idle; let mx = 0, mz = 0; for (let i = 0; i < idle.n; i++) { mx += idle.h[i * 3]; mz += idle.h[i * 3 + 2]; }
    this.idleXZ = [mx / idle.n, mz / idle.n];
    for (const c of Object.values(this.clips)) { c.h0 = [c.h[0], c.h[2]]; }
    // KO chain shares the koFall origin
    if (this.clips.koFall) for (const k of ['koLie', 'getUp']) if (this.clips[k]) this.clips[k].h0 = this.clips.koFall.h0;
  }
  newPose() { return { q: new Float32Array(this.nB * 4), h: new Float32Array(3) }; }
  // sample clip at time t into pose; rootMotion: 0..1 keeps XZ travel
  sample(clip, t, out, rootMotion = 0) {
    const c = typeof clip === 'string' ? this.clips[clip] : clip;
    let f = t * c.fps;
    if (c.loop) { f = ((f % (c.n - 1)) + (c.n - 1)) % (c.n - 1); } else f = Math.max(0, Math.min(c.n - 1, f));
    const i0 = Math.floor(f), i1 = Math.min(c.n - 1, i0 + 1), a = f - i0;
    const nB = this.nB, q = c.q, o = out.q;
    for (let j = 0; j < nB; j++) {
      const k0 = (i0 * nB + j) * 4, k1 = (i1 * nB + j) * 4;
      let x = q[k0] * (1 - a) + q[k1] * a, y = q[k0 + 1] * (1 - a) + q[k1 + 1] * a, z = q[k0 + 2] * (1 - a) + q[k1 + 2] * a, w = q[k0 + 3] * (1 - a) + q[k1 + 3] * a;
      const l = Math.hypot(x, y, z, w) || 1; o[j * 4] = x / l; o[j * 4 + 1] = y / l; o[j * 4 + 2] = z / l; o[j * 4 + 3] = w / l;
    }
    const h = c.h;
    const hx = h[i0 * 3] * (1 - a) + h[i1 * 3] * a, hy = h[i0 * 3 + 1] * (1 - a) + h[i1 * 3 + 1] * a, hz = h[i0 * 3 + 2] * (1 - a) + h[i1 * 3 + 2] * a;
    out.h[0] = this.idleXZ[0] + (hx - c.h0[0]) * rootMotion + (c.name === 'idle' || c.name === 'idleM' ? hx - this.idleXZ[0] : 0) * (1 - rootMotion);
    out.h[1] = hy;
    out.h[2] = this.idleXZ[1] + (hz - c.h0[1]) * rootMotion + (c.name === 'idle' || c.name === 'idleM' ? hz - this.idleXZ[1] : 0) * (1 - rootMotion);
    return out;
  }
  // blend b into a by weight w (in place on a)
  blend(a, b, w) {
    if (w <= 0) return a; const n = this.nB;
    for (let j = 0; j < n; j++) {
      const k = j * 4; let d = a.q[k] * b.q[k] + a.q[k + 1] * b.q[k + 1] + a.q[k + 2] * b.q[k + 2] + a.q[k + 3] * b.q[k + 3]; const s = d < 0 ? -1 : 1;
      let x = a.q[k] * (1 - w) + b.q[k] * w * s, y = a.q[k + 1] * (1 - w) + b.q[k + 1] * w * s, z = a.q[k + 2] * (1 - w) + b.q[k + 2] * w * s, ww = a.q[k + 3] * (1 - w) + b.q[k + 3] * w * s;
      const l = Math.hypot(x, y, z, ww) || 1; a.q[k] = x / l; a.q[k + 1] = y / l; a.q[k + 2] = z / l; a.q[k + 3] = ww / l;
    }
    for (let i = 0; i < 3; i++) a.h[i] = a.h[i] * (1 - w) + b.h[i] * w;
    return a;
  }
  copy(a, b) { a.q.set(b.q); a.h.set(b.h); return a; }
  apply(pose, skel, scale = 1) {
    const list = skel.list;
    for (let j = 0; j < this.nB; j++) list[j].quaternion.set(pose.q[j * 4], pose.q[j * 4 + 1], pose.q[j * 4 + 2], pose.q[j * 4 + 3]);
    list[0].position.set(pose.h[0] * scale, pose.h[1] * scale, pose.h[2] * scale);
  }
}

// ---------- IK ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();

export function rotateBoneWorld(bone, deltaWorld) {
  // bone.world = delta * bone.world  -> local = parentWorld^-1 * delta * parentWorld * local
  bone.parent.getWorldQuaternion(_pq);
  _q2.copy(_pq).invert().multiply(deltaWorld).multiply(_pq);
  bone.quaternion.premultiply(_q2);
  bone.updateMatrixWorld(true);
}

export function aimBone(bone, child, target, weight = 1) {
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  const from = _b.sub(_a).normalize(); const to = _t.copy(target).sub(_a).normalize();
  _q.setFromUnitVectors(from, to);
  if (weight < 1) _q.slerp(new THREE.Quaternion(), 1 - weight);
  rotateBoneWorld(bone, _q);
}

// Two-bone IK. Returns reach ratio (dist/maxLen).
export function solveTwoBone(upper, lower, end, target, pole, weight = 1) {
  if (weight <= 0.001) return 0;
  upper.getWorldPosition(_a); lower.getWorldPosition(_b); end.getWorldPosition(_c);
  const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
  const tgt = new THREE.Vector3().copy(_c).lerp(target, weight);
  const toT = tgt.clone().sub(_a); let d = toT.length();
  const reach = d / (l1 + l2);
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999);
  const dir = toT.normalize();
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d); const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const pv = pole.clone().sub(_a); pv.addScaledVector(dir, -pv.dot(dir));
  if (pv.lengthSq() < 1e-8) { pv.copy(_b).sub(_a); pv.addScaledVector(dir, -pv.dot(dir)); }
  pv.normalize();
  const elbow = _a.clone().addScaledVector(dir, cosA * l1).addScaledVector(pv, sinA * l1);
  aimBone(upper, lower, elbow);
  const endT = _a.clone().addScaledVector(dir, d);
  aimBone(lower, end, endT);
  return reach;
}
