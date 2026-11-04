import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRider,createMission,stepRider,advanceMission,RENDEZVOUS,SAVE_KEY,savedProgress} from '../labs/motion-lab-01/physics.mjs';
const flat=()=>({height:0,ramp:false});
const slope=(x,z)=>({height:Math.abs(x)<4&&z<4&&z>-4?Math.max(0,(4-z)*.31):0,
 ramp:Math.abs(x)<4&&z<4&&z>-4});
test('exact recovered Mini Morrow GLB and texture bytes, not invented geometry',()=>{
 const base=new URL('../labs/motion-lab-01/assets/',import.meta.url);
 const assets=[
  ['ramp.glb','87a373eb956a746cf7bc2b6355f73942edbbe2c4ac2a68864f6d5576f1b615e0'],
  ['Textures/colormap.png','806ff16fd46a2a259485672edfdc71c3d1bce255db71c01abda9a095b5e661d2']
 ];
 for(const [path,expected] of assets){
  const raw=readFileSync(fileURLToPath(new URL(path,base)));
  assert.equal(createHash('sha256').update(raw).digest('hex'),expected);
 }
 const header=readFileSync(fileURLToPath(new URL('ramp.glb',base)));
 assert.equal(header.toString('utf8',0,4),'glTF');
});
test('rider accelerates, carves and brakes deterministically',()=>{
 const a=createRider();
 for(let i=0;i<120;i++)stepRider(a,{throttle:1,steer:i>60?.4:0},1/60,flat);
 assert.ok(a.speed>2);assert.ok(a.heading>.5);assert.ok(a.x>0);
 const before=a.speed;
 for(let i=0;i<100;i++)stepRider(a,{throttle:0},1/60,flat);
 assert.ok(a.speed<before);
});
test('real-height collision adapter: ramp rises; vertical ledge blocks',()=>{
 const a=createRider();a.z=5;a.vz=-3;
 for(let i=0;i<35;i++)stepRider(a,{throttle:1},1/60,slope);
 assert.equal(a.onRamp,true);assert.ok(a.y>.1);
 const b=createRider();b.z=3;b.vz=-10;b.grounded=true;
 const wall=(x,z)=>({height:z<2?3:0,ramp:z<2});
 for(let i=0;i<20;i++)stepRider(b,{throttle:1},1/60,wall);
 assert.ok(b.wallHits>0);
 assert.ok(b.z>=2,'blocked by sidewall, not teleported to the top');
});
test('ollie requires a ramp takeoff and reports landing',()=>{
 const a=createRider();a.z=0;a.y=1.24;a.vz=0;
 const from=stepRider(a,{jump:true},1/60,slope);
 assert.equal(from.jumpedFromRamp,true);assert.equal(a.grounded,false);
 let land=false;
 for(let i=0;i<160;i++){const ev=stepRider(a,{},1/60,slope);if(ev.landed)land=true;}
 assert.equal(land,true);assert.equal(a.grounded,true);
});
test('five-stage mission needs ramp contact, actual jump landing and slow return',()=>{
 const m=createMission();const r=createRider();r.z=5;r.speed=2;
 assert.equal(advanceMission(m,r,{}),true);assert.equal(m.stage,1);
 r.z=2;r.y=.6;
 assert.equal(advanceMission(m,r,{onRamp:true}),true);assert.equal(m.stage,2);
 advanceMission(m,r,{landed:true});assert.equal(m.stage,2,'landing without jump does not count');
 advanceMission(m,r,{jumpedFromRamp:true});
 advanceMission(m,r,{landed:true});assert.equal(m.stage,3);
 r.x=RENDEZVOUS.x;r.z=RENDEZVOUS.z;r.speed=1;
 advanceMission(m,r,{});assert.equal(m.stage,4);
 assert.equal(m.completed,true);
 assert.deepEqual(savedProgress(m),{version:1,stage:4,completed:true});
});
test('lab save key is isolated from existing story and valence profile keys',()=>{
 assert.equal(SAVE_KEY,'wir_motion_lab01_progress_v1');
 assert.notEqual(SAVE_KEY,'wir_metal_story_v1');
 assert.notEqual(SAVE_KEY,'wir_valence_profile_v1');
 assert.equal(createMission({stage:7,completed:false}).stage,4);
});
