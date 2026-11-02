import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsTelemetry} from '../assets/physics_telemetry.js';
const frame=(x=0)=>({time:x,dt:1/60,position:{x,y:0,z:0},velocity:{x,y:0,z:0},grounded:true,board:false});
test('records speed and acceleration without mutating inputs',()=>{
 const t=new PhysicsTelemetry(3),a=frame(0);t.sample(a);const b=frame(1);t.sample(b);
 assert.equal(t.snapshot().speed,1);
 assert.ok(t.snapshot().acceleration>0);
 assert.deepEqual(a.position,{x:0,y:0,z:0});
});
test('caps history and returns defensive snapshots',()=>{
 const t=new PhysicsTelemetry(2);[0,1,2].forEach(x=>t.sample(frame(x)));
 assert.equal(t.export().length,2);
 const snap=t.snapshot();snap.position.x=999;
 assert.equal(t.snapshot().position.x,2);
 t.clear();assert.equal(t.snapshot(),null);
});
