// Fast loop: run a recorded clip's landmarks through the real BodyTracker (no rendering). node trackonly.mjs 1093 [verbose]
import { build } from 'esbuild'; import fs from 'fs';
await build({ entryPoints: ['../src/pmkbody.js'], bundle: true, format: 'esm', platform: 'node', outfile: '/tmp/claude-0/pmkbody.node.mjs', logLevel: 'error', nodePaths: ['/home/claude/ngb/tools/node_modules'] });
const { BodyTracker } = await import('/tmp/claude-0/pmkbody.node.mjs?' + Date.now());
const clip = process.argv[2], verbose = process.argv.includes('verbose');
const d = JSON.parse(fs.readFileSync(`/home/claude/vid/pose_${clip}_c0.json`));
const obj = a => a ? a.map(([x, y, z, v]) => ({ x, y, z, visibility: v })) : null;
const frames = d.frames.map((f, k) => ({ lm: obj(f.lm), world: obj(f.world), t: 1000 + k * 1000 / d.fps }));
const T = new BodyTracker({}); const cal = T.autoCalibrate(frames);
const ev = [];
frames.forEach((f, k) => { T.feed(f); for (const e of T.events) if (e.type === 'commit' || e.type === 'feint') ev.push([k, e.type === 'commit' ? 'LR'[e.hi] + ':' + e.strike + (e.heavy ? '!' : '') : 'feint' + 'LR'[e.hi]]);
  if (verbose) { const h = T.hands; console.log(k, h.map(x => `${'LR'[x.hi]} ${x.phase.padEnd(4)} ext ${x.ext.toFixed(2)} vr ${x.vr.toFixed(1)} a${+x.armed} l${x.launch ? 1 : 0} r ${x.r.toFixed(2)}`).join(' | ')); } });
console.log(clip, 'frame', cal && cal.frame.a.toFixed(2), 'sx', cal && cal.frame.sx, 'vMin', T.cal.vMin.toFixed(2), 'arm', T.cal.arms.map(a => a.len.toFixed(2)).join('/'), 'commits', ev.filter(e => !e[1].startsWith('feint')).length);
console.log(ev.map(e => e.join(' ')).join('  '));
