import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {verifyReframerKit,kitWheelSpec,makeSavannahRigProxy,updateSavannahKitRig,
 kitJointVector,KIT_METERS_PER_PIXEL} from '../assets/reframer_kit_savannah_bridge.mjs';
const src=readFileSync(new URL('../assets/reframer_kit_v1.js',import.meta.url),'utf8');
const env={module:{exports:{}},window:{}};runInNewContext(src,env,{timeout:4000});
const kit=env.module.exports;
const ref=()=>verifyReframerKit(kit);
test('owner-uploaded whole ReFramer Kit v1 passes all its 16 canonical simulation checks',()=>{
 const proof=kit.selfTest();
 assert.equal(proof.total,16);assert.equal(proof.passed,16);
 assert.ok(proof.rows.every(x=>x.pass),JSON.stringify(proof.rows.filter(x=>!x.pass)));
 assert.equal(ref().proof.passed,16);
});
test('all source donor masses sum to 878 kg and wheel mass is exactly 88 kg',()=>{
 const p=ref();assert.equal(p.massKg,878);
 assert.deepEqual(p.wheelSpecs.map(x=>x.key),['wheelFL','wheelFR','wheelRL','wheelRR']);
 assert.deepEqual(p.wheelSpecs.map(x=>x.mass),[22,22,22,22]);
 assert.equal(p.wheelSpecs.reduce((s,p)=>s+p.mass,0),88);
 assert.equal(kit.DATA.donor.parts.filter(x=>x.kind==='glass')[0].mass,14);
});
test('kit blueprint preserves 8 arms and authentic 3-piece articulated chains',()=>{
 const p=ref();assert.equal(p.kit.DATA.rig.arms,8);
 assert.equal(p.kit.DATA.rig.scout.segLen.length,3);
 assert.equal(p.kit.DATA.rig.roadframe.segLen.length,3);
 assert.equal(KIT_METERS_PER_PIXEL,1/40);
});
test('scene adapter maps only actual original donor wheel meshes without creating fake panels',()=>{
 const p=ref(), wheels=Array.from({length:4},(_,i)=>({
  uuid:'wheel'+i,position:{x:i,y:.2,z:i+1},rotation:{y:0}
 }));
 const u={id:'RF-W1',W:{enc:{id:'E1',stage:'chase',t:4,heading:0,target:{x:4,z:5},pos:{x:2,z:3,y:1}}},
  donor:{uuid:'car-original-glb',position:{x:4,z:5},rotation:{y:0}},
  wheels,claimedMesh:new Set(wheels.map(w=>w.uuid)),brokenParts:new Set(),kitRig:null};
 const proxy=makeSavannahRigProxy(p,u,{x:7,z:9});
 assert.equal(proxy.parts.length,4);
 assert.equal(proxy.parts.reduce((m,x)=>m+x.mass,0),88);
 assert.ok(proxy.parts.every(x=>x.state==='frame'));
 assert.equal(proxy.bot.x,160);assert.equal(proxy.donor.y,200);
 assert.equal(proxy.parts[0].slot.x,kit.DATA.donor.parts.find(x=>x.key==='wheelFL').slot[0]);
 const rig=updateSavannahKitRig(p,u,{x:7,z:9},1/60,5);
 assert.equal(rig.arms.length,8);
 assert.ok(rig.arms.every(a=>a.j.length===4));
 assert.ok(rig.arms.flatMap(x=>x.j).every(j=>[j.x,j.y,j.z].every(Number.isFinite)));
 assert.equal(u.kitRig,rig);
});
test('world coordinate mapping uses x -> x, height -> y, donor y -> world z',()=>{
 class Vec{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}}
 const P=kitJointVector({Vector3:Vec},{x:40,y:80,z:120});
 assert.deepEqual([P.x,P.y,P.z],[1,3,2]);
 assert.equal(kitJointVector({Vector3:Vec},{x:NaN,y:0,z:0}),null);
});
test('fails safe on truncated/corrupted kit; never mounts a duplicate world simulation',()=>{
 assert.throws(()=>verifyReframerKit(null),/MISSING_OR_INVALID/);
 const fake={...kit,selfTest:()=>({passed:15,total:16})};
 assert.throws(()=>verifyReframerKit(fake),/SELF_TEST_FAILED/);
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../assets/reframer_squad_world.mjs',import.meta.url),'utf8');
 assert.match(main,/Promise\.all\(\[import\('\.\/reframer_kit_v1\.js'\),import\('\.\/reframer_squad_world\.mjs'\)\]\)/);
 assert.match(world,/updateSavannahKitRig/);
 assert.match(world,/kitWheelSpec\(bound,index\)\.mass/);
 assert.doesNotMatch(world,/kit\.Engine\.step/);
 assert.doesNotMatch(main,/window\.ReframerKit\.Engine\.step/);
 assert.doesNotMatch(world,/wir_metal_story_v1/);
});
