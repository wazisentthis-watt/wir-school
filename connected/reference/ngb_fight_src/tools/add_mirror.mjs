// Append mirrored (southpaw) versions of key takes to anims.json
import fs from 'fs';
import { retarget, KEEP } from './retarget.mjs';
const S = '../src_fbx/';
const BASE = S + '7cc9be34-Boxing.fbx';
const out = JSON.parse(fs.readFileSync('../src/data/anims.json', 'utf8'));
const CLIPS = [
  ['idleM', S + '4b79a003-Bouncing_Fight_Idle.fbx', 0, null, true, 'Bouncing Fight Idle (southpaw)'],
  ['jabLM', S + '676a5152-Punching.fbx', 0.2, 1.05, false, 'Lead Jab (southpaw)'],
  ['crossRM', S + 'dbb38987-Punching_1.fbx', 0, 0.87, false, 'Rear Straight (southpaw)'],
  ['bodyRM', S + 'e9890bd0-Boxing_1.fbx', 0.15, 1.3, false, 'Rear Dip to Body (southpaw)'],
];
for (const [name, file, t0, t1, loop, label] of CLIPS) {
  const r = await retarget(file, BASE, { fps: 30, t0, t1, mirror: true });
  const nF = r.frames.length, nB = KEEP.length; const q = new Int16Array(nF * nB * 4), h = new Int16Array(nF * 3);
  r.frames.forEach((fr, i) => { KEEP.forEach((n, j) => { let a = fr.q[n]; if (i > 0) { const k = ((i - 1) * nB + j) * 4; if (a[0]*q[k]+a[1]*q[k+1]+a[2]*q[k+2]+a[3]*q[k+3] < 0) a = a.map(v => -v); } for (let c = 0; c < 4; c++) q[(i * nB + j) * 4 + c] = Math.round(a[c] * 32767); }); for (let c = 0; c < 3; c++) h[i * 3 + c] = Math.round(fr.hips[c] * 10); });
  out.clips[name] = { label, loop, fps: 30, n: nF, q: Buffer.from(q.buffer).toString('base64'), h: Buffer.from(h.buffer).toString('base64') };
  console.log(name, nF);
}
fs.writeFileSync('../src/data/anims.json', JSON.stringify(out));
