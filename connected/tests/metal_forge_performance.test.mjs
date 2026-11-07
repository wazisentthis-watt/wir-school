import {test} from 'node:test';import assert from 'node:assert/strict';import {forgePerformancePose,cue,smooth01} from '../assets/metal_forge_pose.mjs';import {readFileSync} from 'node:fs';
test('smooth curves are finite, 0..1 and vanish outside timeline',()=>{
 for(const t of [-1,0,.2,.7,1.3,1.9,2.4,2.8,3.31,99,NaN]){
  const p=forgePerformancePose('COMPRESSION',t);
  assert.ok(Object.entries(p).every(([k,v])=>v>=0&&v<=1),JSON.stringify(p));
 }
 assert.equal(smooth01(NaN),0);
 assert.equal(cue(.3,.4,.5,.6),0);
});
test('original authored phases cause reach/gather/compress/seal/mount',()=>{
 assert.ok(forgePerformancePose('DETECTING',.2).scan>.1);
 assert.ok(forgePerformancePose('EXTRACTION',.72).reach>.9);
 assert.ok(forgePerformancePose('GATHERING',1.3).gather>.9);
 assert.ok(forgePerformancePose('COMPRESSION',1.93).press>.9);
 assert.ok(forgePerformancePose('ACTIVATED',2.39).seal>.9);
 assert.ok(forgePerformancePose('MOUNTING',2.87).mount>.9);
 assert.equal(forgePerformancePose('SKATING',4).weight,0);
 assert.equal(forgePerformancePose('IDLE',0).weight,0);
 assert.ok(forgePerformancePose('DISSOLVING',.18).weight>.3);
});
test('overlay preserves original mixer, no leg/knee transforms or new saved keys',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const code=readFileSync(new URL('../assets/metal_forge_performance.js',import.meta.url),'utf8');
 assert.match(main,/forgePerformance\.beforeMixer\(\)/);
 assert.match(main,/forgePerformance\.afterMixer\(P\?\.model,forgeController\?\.state\)/);
 assert.ok(main.indexOf('forgePerformance.beforeMixer()')<main.indexOf('for(const m of mixers)m.update(dt);'));
 assert.ok(main.indexOf('forgePerformance.afterMixer(P?.model,forgeController?.state)')>main.indexOf('for(const m of mixers)m.update(dt);'));
 assert.ok(code.includes('this.restore()'));
 assert.ok(code.includes('if(!node.isBone)return'));
 assert.ok(!/new THREE.AnimationMixer/.test(code));
 assert.ok(!/(?:left|right)(?:knee|lowerleg|leg)/i.test(code),'No unverified knee-axis edits');
 assert.ok(!code.includes('localStorage'));
});
