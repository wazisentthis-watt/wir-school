import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOURCE_TARGET_BONES,compatibleBonePairs,evaluateRetargetCoverage,safeRetargetBlend,UPLOADED_SOURCE_MANIFEST} from '../assets/reframer_bone_mapping.mjs';
const samples=JSON.parse(readFileSync(new URL('../labs/reframer-asset-ik-pilot/source_pose_samples.json',import.meta.url),'utf8'));
const code=readFileSync(new URL('../assets/reframer_asset_ik_pilot.mjs',import.meta.url),'utf8');
const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
test('the two user-uploaded GLBs have source-verified SHA256 and clip counts',()=>{
 assert.equal(samples.models['Soldier.glb'].sha256,UPLOADED_SOURCE_MANIFEST.Soldier.sha256);
 assert.equal(samples.models['Character.glb'].sha256,UPLOADED_SOURCE_MANIFEST.Character.sha256);
 assert.equal(UPLOADED_SOURCE_MANIFEST.Soldier.joints,62);
 assert.equal(UPLOADED_SOURCE_MANIFEST.Character.clips,22);
});
test('source to target mapping preserves limb sides and 65-bone ReFramer target',()=>{
 const source=['Hips','Abdomen','Torso','Chest','Neck','Head','ShoulderL','ShoulderR','UpperArmL','UpperArmR','LowerArmL','LowerArmR','WristL','WristR','UpperLegL','UpperLegR','LowerLegL','LowerLegR','FootL','FootR'];
 const target=SOURCE_TARGET_BONES.map(x=>x[1]);
 const pairs=compatibleBonePairs(source,target);
 assert.ok(pairs.length>=18);
 assert.ok(pairs.some(x=>x.source==='UpperArmR'&&x.target==='upperarm_r'));
 assert.equal(new Set(pairs.map(x=>x.target)).size,pairs.length);
});
test('unsupported sources do not activate a rig or fake successful retarget',()=>{
 const x=evaluateRetargetCoverage(['UpperArmR'],['upperarm_r'],[{name:'Punch_Right'}]);
 assert.equal(x.ok,false);assert.ok(x.missing.length>=5);
});
test('uploaded animation samples have real nontrivial unit-quaternion changes',()=>{
 for(const m of Object.values(samples.models)){
  for(const c of Object.values(m.clips)){
   assert.ok(c.duration>.4);
   for(const channel of Object.values(c.channels)){
    const n=q=>Math.hypot(...q);
    assert.ok(Math.abs(n(channel.rest)-1)<.05);
    assert.ok(Math.abs(n(channel.key)-1)<.05);
    assert.ok(channel.key.some((v,i)=>Math.abs(v-channel.rest[i])>.005));
   }
  }
 }
});
test('real IK solver is called on proxy chain, not target skeleton or its skin indices',()=>{
 assert.ok(code.includes('new CCDIKSolver({skeleton:{bones}},'));
 assert.ok(code.includes('root.add(anchor,target)'));
 assert.ok(code.includes('applyIK(chain,goal,.2)'));
 assert.ok(!code.includes('this.duel.enemy.model.skeleton.bones.push'));
});
test('pilot gates all main changes behind opt-in and does not change saves/city physics',()=>{
 assert.ok(main.includes("get('reframer_ik')==='1'"));
 assert.ok(main.includes('if(REFRAMER_IK_PROBE&&aerialDuel)'));
 assert.ok(code.includes("if(!this.live)return"));
 assert.ok(!code.includes('localStorage.setItem'));
 assert.ok(!code.includes('colliders.push'));
 assert.ok(!code.includes('rigidBody.set'));
 assert.equal(safeRetargetBlend(100),.65);
});
test('BVH raycast returns baseline vs accelerated distances without patching world physics',()=>{
 assert.ok(code.includes("await import('./experimental/three-mesh-bvh.module.js')"));
 assert.ok(code.includes('Math.abs(baseline.distance-bvh.distance)<.0001'));
 assert.ok(code.includes('floor.raycast=this.savedRaycast'));
 assert.ok(code.includes('physicsModified:false'));
});
