import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REFRAMER_ASSET,REFRAMER_SOURCE_CLIPS,REFRAMER_PACK01,REFRAMER_PACK_IDS,pack01Timing,selectReframerEventMotion} from '../assets/reframer_animation_timeline.mjs';
test('rig audit is grounded in real GLB, 65 bones, 21 clips, 3 meshes',()=>{
 assert.equal(REFRAMER_ASSET.boneCount,65);assert.equal(REFRAMER_ASSET.uniqueClips,21);
 assert.equal(REFRAMER_ASSET.skinnedMeshes,3);
 assert.equal(REFRAMER_SOURCE_CLIPS.Knock,'Hit_Knockback');
});
test('all 8 requested motions have grounded base aliases, lengths and separate authored bone directives',()=>{
 assert.equal(REFRAMER_PACK_IDS.length,8);
 const expected=['combat_idle','melee_three','uppercut_launcher','aerial_pursuit','airborne_tumble','rooftop_recovery','shield_formation','aerial_counter'];
 assert.deepEqual(REFRAMER_PACK_IDS,expected);
 for(const id of REFRAMER_PACK_IDS){
  const p=REFRAMER_PACK01[id];assert.ok(p.duration>.4&&p.duration<3);
  assert.ok(p.stages.length>0&&p.authored&&p.pending);
  assert.ok(Object.keys(p.bones).length>=4);
  for(const [t,a,rate] of p.stages){
   assert.ok(REFRAMER_SOURCE_CLIPS[a],id+' refers to unknown clip '+a);
   assert.ok(t<p.duration&&t>=0&&rate>.3&&rate<=3);
  }
 }
});
test('3-hit combination is jab, cross and hook, not a claim of three game hits',()=>{
 assert.deepEqual(REFRAMER_PACK01.melee_three.stages.map(x=>x[1]),['Jab','Cross','Hook']);
 const p=REFRAMER_PACK01.melee_three;
 assert.deepEqual([pack01Timing('melee_three',.2).stage[1],pack01Timing('melee_three',.6).stage[1],pack01Timing('melee_three',1.1).stage[1]],['Jab','Cross','Hook']);
});
test('timelines clamp erroneous elapsed time and complete predictably',()=>{
 for(const id of REFRAMER_PACK_IDS){
  assert.equal(pack01Timing(id,NaN).progress,0);
  assert.equal(pack01Timing(id,999).progress,1);
  assert.equal(pack01Timing(id,.1).stage[0],0);
  assert.equal(pack01Timing(id,999).finished,!REFRAMER_PACK01[id].loop);
 }
 assert.throws(()=>pack01Timing('unknown',0));
});
test('incoming gameplay events select correct ReFramer motions without changing combat math',()=>{
 assert.equal(selectReframerEventMotion('reframer-telegraph'),'shield_formation');
 assert.equal(selectReframerEventMotion('reframer-strike'),'melee_three');
 assert.equal(selectReframerEventMotion('launch'),'airborne_tumble');
 assert.equal(selectReframerEventMotion('roof-floor-impact'),'rooftop_recovery');
 assert.equal(selectReframerEventMotion('light-hit'),null);
});
test('new Three.js module builds actual QuaternionKeyframeTrack on original mixer, never second rig',()=>{
 const s=readFileSync(new URL('../assets/reframer_animation_pack01.js',import.meta.url),'utf8');
 assert.ok(s.includes('new THREE.QuaternionKeyframeTrack'));
 assert.ok(s.includes('this.enemy.mixer.clipAction'));
 assert.ok(s.includes('THREE.AdditiveAnimationBlendMode'));
 assert.ok(!s.includes('new THREE.AnimationMixer'));
 assert.ok(!s.includes('localStorage'));
 assert.ok(!s.includes('city.colliders'));
});
