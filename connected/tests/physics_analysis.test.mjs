import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePhysics} from '../assets/physics_analysis.js';
const s=(time,y,grounded,verticalSpeed,speed=0)=>({time,dt:.1,position:{x:0,y,z:0},grounded,verticalSpeed,speed,board:false,wall:false,swing:false,flying:false});
test('measures a complete jump',()=>{
 const r=analyzePhysics([s(0,0,true,0),s(.1,.4,false,4),s(.2,.8,false,0),s(.3,.5,false,-3),s(.4,0,true,0)]);
 assert.equal(r.summary.jumps,1);assert.equal(r.summary.landings,1);
 assert.ok(Math.abs(r.events[0].height-.8)<1e-9);
 assert.ok(Math.abs(r.events[0].airtime-.3)<1e-9);
 assert.equal(r.issues.length,0);
});
test('flags unsafe landings and impossible jump height',()=>{
 const r=analyzePhysics([s(0,0,true,0),s(.1,.1,false,2),s(.2,.2,false,-35),s(.3,0,true,0)]);
 assert.deepEqual(r.issues.map(x=>x.kind),['jump-height','hard-landing']);
});
test('ignores swing transitions as jumps',()=>{
 const a=s(0,0,true,0),b={...s(.1,2,false,4),swing:true},c=s(.2,0,true,0);
 assert.equal(analyzePhysics([a,b,c]).summary.jumps,0);
});
test('flags ground speed spikes',()=>{
 const r=analyzePhysics([s(0,0,true,0),s(.1,0,true,0,4)]);
 assert.equal(r.issues[0].kind,'ground-velocity-spike');
});
