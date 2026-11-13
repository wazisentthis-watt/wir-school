import fs from 'fs';
import { retarget, getBase, fk, KEEP } from './retarget.mjs';
const BASE = '../src_fbx/7cc9be34-Boxing.fbx';
const files = process.argv.slice(2);
const B = await getBase(BASE);
const all = {};
for (const f of files) {
  const r = await retarget(f, BASE, { fps: 30 });
  const joints = r.frames.map(fr => { const { pos } = fk(B, fr); const o = {}; for (const n of KEEP) o[n] = pos[n].toArray().map(v => +v.toFixed(1)); return o; });
  all[f.split('/').pop().replace(/^[0-9a-f]{8}-/,'').replace('.fbx','')] = joints;
}
fs.writeFileSync('/tmp/claude-0/joints.json', JSON.stringify(all));
console.log(Object.keys(all).map(k=>k+':'+all[k].length).join(' '));
