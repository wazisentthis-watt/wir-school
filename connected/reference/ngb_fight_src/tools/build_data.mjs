// Build compact animation + rig data for the runtime.
import fs from 'fs';
import { retarget, getBase, KEEP } from './retarget.mjs';
const S = '../src_fbx/';
const BASE = S + '7cc9be34-Boxing.fbx';
const C = S + 'combat/Combat/';
const CLIPS = [
  // name, file, t0, t1, loop, label
  ['idle', S + '4b79a003-Bouncing_Fight_Idle.fbx', 0, null, true, 'Bouncing Fight Idle'],
  ['jabL', S + '676a5152-Punching.fbx', 0.2, 1.05, false, 'Lead Jab'],
  ['crossR', S + 'dbb38987-Punching_1.fbx', 0, 0.87, false, 'Rear Straight'],
  ['stepJab', S + '7cc9be34-Boxing.fbx', 0.1, 1.2, false, 'Step-In Jab'],
  ['powerCross', S + 'beeac7d2-Cross_Punch.fbx', 0.5, 1.7, false, 'Loaded Cross'],
  ['bodyR', S + 'e9890bd0-Boxing_1.fbx', 0.15, 1.3, false, 'Rear Dip to Body'],
  ['bag', S + 'ba8f1e81-Punching_Bag.fbx', 0, null, true, 'Heavy Bag Rhythm'],
  ['dodge', S + '02b4deb7-Dodging.fbx', 0, null, false, 'Dodging'],
  ['block', S + '2fae4a5b-Block.fbx', 0, null, false, 'High Block'],
  ['bodyBlock', S + '5485b217-Body_Block.fbx', 0, null, false, 'Body Block'],
  ['hitHead', S + '8fb1e0e5-Taking_Punch.fbx', 0, 1.7, false, 'Taking Punch'],
  ['hitHeadLong', S + '8fb1e0e5-Taking_Punch.fbx', 0, null, false, 'Taking Punch (full)'],
  ['hitUpper', S + 'e16020f3-Receive_Uppercut_To_The_Face.fbx', 0, null, false, 'Receive Uppercut'],
  ['pivot', S + '82103517-Pivot.fbx', 0, null, true, 'Pivot Footwork'],
  ['koFall', C + 'KnockOut_Loser_mixamo.fbx', 9.0, 12.4, false, 'Knockout Fall'],
  ['koLie', C + 'KnockOut_Loser_mixamo.fbx', 12.4, 16.9, false, 'Down on Canvas'],
  ['getUp', C + 'KnockOut_Loser_mixamo.fbx', 16.9, 20.4, false, 'Beat the Count'],
  ['winUpper', C + 'KnockOut_Winner_mixamo.fbx', 8.9, 10.2, false, 'Finishing Uppercut'],
  ['celebrate', C + 'KnockOut_Winner_mixamo.fbx', 10.2, 20.0, false, 'Victory'],
  ['shadow', C + 'ShadowBoxing_mixamo.fbx', 0, null, true, 'Shadowboxing (Combat pack)'],
  ['fightIdle2', C + 'FightingIdle_mixamo.fbx', 0, 12, true, 'Fighting Idle (Combat pack)'],
  ['boxing2', C + 'Boxing_mixamo.fbx', 0, null, true, 'Boxing Session (Combat pack)'],
];
const B = await getBase(BASE);
const rig = KEEP.map(n => ({ n, p: B.rest[n].parent, pos: B.rest[n].pos.toArray().map(v => +v.toFixed(3)), q: B.rest[n].quat.toArray().map(v => +v.toFixed(6)) }));
const out = { rig, bones: KEEP, clips: {} };
const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
for (const [name, file, t0, t1, loop, label] of CLIPS) {
  if (filter && !filter.test(name)) continue;
  const r = await retarget(file, BASE, { fps: 30, t0, t1 });
  const nF = r.frames.length, nB = KEEP.length;
  const q = new Int16Array(nF * nB * 4), h = new Int16Array(nF * 3);
  r.frames.forEach((fr, i) => {
    KEEP.forEach((n, j) => { let a = fr.q[n]; // keep hemisphere continuity
      if (i > 0) { const k = ((i - 1) * nB + j) * 4; const dot = a[0]*q[k]+a[1]*q[k+1]+a[2]*q[k+2]+a[3]*q[k+3]; if (dot < 0) a = a.map(v => -v); }
      for (let c = 0; c < 4; c++) q[(i * nB + j) * 4 + c] = Math.round(a[c] * 32767); });
    for (let c = 0; c < 3; c++) h[i * 3 + c] = Math.round(fr.hips[c] * 10);
  });
  out.clips[name] = { label, loop, fps: 30, n: nF, q: Buffer.from(q.buffer).toString('base64'), h: Buffer.from(h.buffer).toString('base64') };
  console.log(name, nF, 'frames');
}
fs.mkdirSync('../src/data', { recursive: true });
fs.writeFileSync('../src/data/anims.json', JSON.stringify(out));
console.log('bytes', fs.statSync('../src/data/anims.json').size);
