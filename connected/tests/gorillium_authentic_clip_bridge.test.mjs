import test from 'node:test';
import assert from 'node:assert/strict';
import {CLIPS,TENTACLE_CHAINS} from '../gorillium-lab/gorillium_animation_contract.mjs';
import {ORIGINAL_GORILLIUM_SHA256,ORIGINAL_GORILLIUM_CLIP_COUNT,
 ORIGINAL_GORILLIUM_JOINT_COUNT,GORILLIUM_CAST_CLIPS,GORILLIUM_TIP_BONES,
 verifyOriginalGorillium,mapGorilliumCast} from '../gorillium-lab/authentic_clip_bridge.mjs';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../gorillium-lab/rig_intake_manifest_v2.json',import.meta.url),'utf8'));
const joints=[...TENTACLE_CHAINS.flat(),...Array.from({length:30},(_,i)=>'OTHER_'+i)];
const valid=()=>({sha256:ORIGINAL_GORILLIUM_SHA256,clipNames:CLIPS,boneNames:joints,skinJointNames:joints});
test('authentic fingerprint matches source intake, with 31 original clips and 70 joints',()=>{
 assert.equal(ORIGINAL_GORILLIUM_SHA256,manifest.sha256);
 assert.equal(ORIGINAL_GORILLIUM_CLIP_COUNT,31);
 assert.equal(ORIGINAL_GORILLIUM_JOINT_COUNT,manifest.geometry.skinnedJointCount);
 assert.deepEqual(manifest.animation.originalClipNames,CLIPS);
});
test('mapping preserves six actual source clip names rather than invented animations',()=>{
 assert.equal(Object.keys(GORILLIUM_CAST_CLIPS).length,6);
 for(const clip of Object.values(GORILLIUM_CAST_CLIPS))assert.ok(CLIPS.includes(clip));
});
test('eight tip bones are distinct real terminal bones',()=>{
 assert.equal(GORILLIUM_TIP_BONES.length,8);
 assert.equal(new Set(GORILLIUM_TIP_BONES).size,8);
 for(let i=0;i<8;i++)assert.equal(GORILLIUM_TIP_BONES[i],TENTACLE_CHAINS[i].at(-1));
});
test('complete exact source manifest passes all structural gates',()=>{
 const r=verifyOriginalGorillium(valid());
 assert.equal(r.compatible,true);assert.equal(r.completeChains,8);
 assert.equal(r.clipsFound,31);assert.equal(r.jointCount,70);
});
test('looks-like-a-gorilla model with wrong hash is rejected',()=>{
 const r=verifyOriginalGorillium({...valid(),sha256:'0'.repeat(64)});
 assert.equal(r.compatible,false);assert.ok(r.issues.includes('source-sha256-mismatch'));
});
test('right hash with one missing clip refuses compatible',()=>{
 const v=valid();v.clipNames=v.clipNames.slice(0,30);
 assert.equal(verifyOriginalGorillium(v).compatible,false);
});
test('right hash with unskinned tentacle chain is rejected',()=>{
 const v=valid();v.skinJointNames=v.skinJointNames.filter(x=>x!=='Tentacle_05_02');
 const r=verifyOriginalGorillium(v);
 assert.equal(r.compatible,false);assert.equal(r.completeChains,7);
});
test('right hash but incomplete total skinned joint count rejected',()=>{
 const v=valid();v.skinJointNames=v.skinJointNames.slice(0,40);
 assert.ok(verifyOriginalGorillium(v).issues.includes('70-skinned-joints-required'));
});
test('right hash and skin joints but missing scene node rejected',()=>{
 const v=valid();v.boneNames=v.boneNames.filter(x=>x!==GORILLIUM_TIP_BONES[2]);
 assert.ok(verifyOriginalGorillium(v).issues.includes('missing-tentacle-nodes'));
});
test('missing metadata fails safely',()=>{
 const r=verifyOriginalGorillium();
 assert.equal(r.compatible,false);assert.equal(r.sourceVerified,false);
});
test('each valid cast maps to original animation with retained limbs and target',()=>{
 const ready=verifyOriginalGorillium(valid());
 for(const ability of Object.keys(GORILLIUM_CAST_CLIPS)){
  const r=mapGorilliumCast({ability,limbIds:[0,2],targetId:'target'},ready);
  assert.equal(r.ok,true);assert.equal(r.clip,GORILLIUM_CAST_CLIPS[ability]);
  assert.deepEqual(r.limbIds,[0,2]);assert.equal(r.targetId,'target');
  assert.ok(r.cues.every(x=>x.at>=0&&x.at<=1));
 }
});
test('unverified rig cannot issue animation commands even if event valid',()=>{
 assert.equal(mapGorilliumCast({ability:'tentacle-lash',limbIds:[1]},null).reason,'unverified-original-rig');
 assert.equal(mapGorilliumCast({ability:'tentacle-lash',limbIds:[1]},verifyOriginalGorillium({...valid(),sha256:'no'})).ok,false);
});
test('unknown abilities and invalid limb IDs fail without side effects',()=>{
 const ready=verifyOriginalGorillium(valid());
 assert.equal(mapGorilliumCast({ability:'fake',limbIds:[0]},ready).reason,'unmapped-ability');
 assert.equal(mapGorilliumCast({ability:'octo-shield',limbIds:[8]},ready).reason,'invalid-limb-ids');
 assert.equal(mapGorilliumCast({ability:'octo-shield'},ready).reason,'invalid-limb-ids');
});
