import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSlottaMinionMotion,minionChoreographyStep,slottaDashSweep,slottaDashTarget}
 from '../assets/slotta_choreography.js';

test('signature summons begin with materialization, then a readable flank/orbit and lunge',()=>{
 for(const kind of ['serpent','clone']){
  const m=createSlottaMinionMotion(kind,kind==='clone'?1:0);
  let pos={x:0,z:1.3},player={x:0,z:0},telegraphs=0,lunge=false,firstImpactStage=null;
  for(let i=0;i<100;i++){
   const e=minionChoreographyStep(m,.05,pos,player);
   pos={x:e.x,z:e.z};
   assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.z));
   if(e.telegraph)telegraphs++;
   if(e.stage==='lunge')lunge=true;
   if(e.impact&&firstImpactStage===null)firstImpactStage=e.stage;
  }
  assert.ok(lunge,kind+' reached lunge');
  assert.ok(telegraphs>=1,kind+' telegraphs attack');
  assert.ok(['lunge','recover',null].includes(firstImpactStage),kind+' only lands during attack');
 }
});
test('serpents and clones have distinct timings and deterministic left/right formation',()=>{
 const s=createSlottaMinionMotion('serpent',0);
 const c=createSlottaMinionMotion('clone',1);
 assert.equal(s.side,1);assert.equal(c.side,-1);
 for(let i=0;i<6;i++){minionChoreographyStep(s,.05,{x:0,z:1},{x:0,z:0});minionChoreographyStep(c,.05,{x:0,z:1},{x:0,z:0});}
 assert.equal(s.stage,'orbit');assert.equal(c.stage,'spawn');
});
test('minions honor blocked geometry and slide along an open axis',()=>{
 const m=createSlottaMinionMotion('serpent',0);
 for(let i=0;i<6;i++)minionChoreographyStep(m,.05,{x:0,z:4},{x:0,z:0});
 const e=minionChoreographyStep(m,.05,{x:0,z:4},{x:0,z:0},(x,z)=>z<3.95);
 assert.equal(e.z,4,'collision stops forward movement');
});
test('dash sweep stops in front of an obstacle without tunnelling over it',()=>{
 const c=(x,z)=>x>.91&&x<1.5&&Math.abs(z)<.5;
 const e=slottaDashSweep({x:0,z:0},{x:1,z:0},8,c);
 assert.equal(e.blocked,true);assert.ok(e.x<=.92);assert.ok(e.travelled<1.3);
});
test('dash movement is frame-rate independent at matching travelled distance',()=>{
 const p={x:0,z:0},direction={x:1,z:0};
 const whole=slottaDashSweep(p,direction,2,()=>false);
 let at=p;for(let i=0;i<10;i++){const e=slottaDashSweep(at,direction,.2,()=>false);at={x:e.x,z:e.z};}
 assert.ok(Math.abs(whole.x-at.x)<1e-10);
 assert.ok(Math.abs(whole.z-at.z)<1e-10);
});
test('dash clamps to finite distance and aims toward target',()=>{
 const d=slottaDashTarget({x:0,z:0},{x:100,z:0});
 assert.equal(d.length,8.5);assert.equal(d.x,1);assert.equal(d.z,0);
 const zero=slottaDashSweep({x:0,z:0},{x:0,z:0},10,()=>false);
 assert.equal(zero.travelled,0);assert.equal(zero.blocked,false);
});
test('serpent and clone model animations include distinct attack poses and segmented anatomy',()=>{
 const src=readFileSync(new URL('../assets/slotta_visuals.js',import.meta.url),'utf8');
 assert.match(src,/serpent_link_/);assert.match(src,/clone_arm_joint_/);
 assert.match(src,/clone_leg_joint_/);assert.match(src,/stage==='lunge'/);
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 assert.match(main,/minionChoreographyStep\(m\.motion,dt/);
 assert.match(main,/slottaDashSweep\(/);
 assert.match(main,/slottaBlockedAt\(x,z/);
});
