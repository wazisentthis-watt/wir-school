// Retarget Mixamo clips (any T-posed Mixamo rig) onto the base rig via world-space rest deltas.
import { load, THREE } from './inspect.mjs';

export const KEEP = ['Hips','Spine','Spine1','Spine2','Neck','Head','HeadTop_End',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','LeftToe_End','RightUpLeg','RightLeg','RightFoot','RightToeBase','RightToe_End'];
const strip = n => n.replace(/^mixamorig:?/, '');
const mirrorName = n => n.startsWith('Left') ? 'Right' + n.slice(4) : n.startsWith('Right') ? 'Left' + n.slice(5) : n;

function boneMap(obj) { const m = {}; obj.traverse(b => { if (b.isBone) { const s = strip(b.name); if (!m[s]) m[s] = b; } }); return m; }

let base = null;
export async function getBase(file) {
  if (base) return base;
  const o = await load(file); o.updateMatrixWorld(true);
  const bones = boneMap(o);
  const rest = {};
  for (const n of KEEP) {
    const b = bones[n];
    rest[n] = { parent: n === 'Hips' ? null : strip(b.parent.name), pos: b.position.clone(), quat: b.quaternion.clone(),
      wq: b.getWorldQuaternion(new THREE.Quaternion()), wp: b.getWorldPosition(new THREE.Vector3()) };
  }
  base = { obj: o, bones, rest };
  return base;
}

// returns {fps, frames:[{hips:[x,y,z], q:{name:[x,y,z,w]}}]}
export async function retarget(file, baseFile, { fps = 30, t0 = 0, t1 = null, mirror = false } = {}) {
  const B = await getBase(baseFile);
  const src = await load(file);
  src.updateMatrixWorld(true);
  const sb = boneMap(src);
  const srcRest = {};
  for (const n of KEEP) { const b = sb[n]; srcRest[n] = { wq: b.getWorldQuaternion(new THREE.Quaternion()), wp: b.getWorldPosition(new THREE.Vector3()) }; }
  const clip = src.animations[0];
  // drop scale tracks to avoid odd scaling
  clip.tracks = clip.tracks.filter(t => !t.name.endsWith('.scale'));
  const mixer = new THREE.AnimationMixer(src);
  const action = mixer.clipAction(clip); action.play();
  const end = t1 == null ? clip.duration : Math.min(t1, clip.duration);
  const hipRatio = B.rest.Hips.wp.y / srcRest.Hips.wp.y;
  const frames = [];
  const qTmp = new THREE.Quaternion(), d = new THREE.Quaternion(), wt = {}, pv = new THREE.Vector3();
  for (let t = t0; t <= end + 1e-6; t += 1 / fps) {
    mixer.setTime(t); src.updateMatrixWorld(true);
    const deltas = {};
    for (const n of KEEP) {
      const ws = sb[n].getWorldQuaternion(new THREE.Quaternion());
      deltas[n] = ws.multiply(srcRest[n].wq.clone().invert());
    }
    const fr = { q: {} };
    for (const n of KEEP) {
      let dl = deltas[mirror ? mirrorName(n) : n].clone();
      if (mirror) dl.set(dl.x, -dl.y, -dl.z, dl.w);
      const w = dl.multiply(B.rest[n].wq);
      wt[n] = w;
      const par = B.rest[n].parent;
      const local = par ? wt[par].clone().invert().multiply(w) : w.clone();
      fr.q[n] = local.toArray();
    }
    sb.Hips.getWorldPosition(pv);
    const dp = pv.clone().sub(srcRest.Hips.wp).multiplyScalar(hipRatio);
    if (mirror) dp.x = -dp.x;
    fr.hips = dp.add(B.rest.Hips.wp).toArray();
    frames.push(fr);
  }
  return { fps, frames, duration: end - t0 };
}

// Forward kinematics on base rig: world positions per frame
export function fk(B, frame) {
  const out = {}, wq = {};
  for (const n of KEEP) {
    const r = B.rest[n];
    const q = new THREE.Quaternion().fromArray(frame.q[n]);
    if (!r.parent) { out[n] = new THREE.Vector3().fromArray(frame.hips); wq[n] = q; }
    else { out[n] = r.pos.clone().applyQuaternion(wq[r.parent]).add(out[r.parent]); wq[n] = wq[r.parent].clone().multiply(q); }
  }
  return { pos: out, wq };
}
