import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alignHeldTarget,approachActorFacing} from '../assets/metal_paired_contact.mjs';
const base={x:0,y:1,z:1},current={x:0,y:1,z:1},right={x:.45,y:1.6,z:.3},left={x:-.45,y:1.6,z:.3};
const run=more=>alignHeldTarget({base,current,rightHand:right,leftHand:left,forward:{x:0,y:0,z:1},groundY:.25,load:.8,dt:.016,...more});
test('actual two hands are distinguished from one hand',()=>assert.equal(run().mode,'two-hand'));
test('one hand still provides a usable grip',()=>assert.equal(run({leftHand:null}).mode,'one-hand'));
test('no source bones uses authored Gallium hold point',()=>assert.equal(run({rightHand:null,leftHand:null}).mode,'fallback'));
test('malformed right-hand coordinates do not contaminate target',()=>assert.equal(run({rightHand:{x:NaN,y:1,z:1},leftHand:null}).mode,'fallback'));
test('paired target is always finite',()=>assert.ok(Object.values(run().position).every(Number.isFinite)));
test('existing 3.5-meter Gallium hold can approach real player hands',()=>{
 const x=run({base:{x:0,y:1,z:-3.5},current:{x:0,y:1,z:-3.5},
  forward:{x:0,y:0,z:-1},load:.8,dt:.016});
 assert.equal(x.mode,'two-hand');assert.ok(x.travel>0&&x.travel<=.416001);
});
test('limited reach prevents hand snap from distant unrelated rig',()=>assert.equal(run({rightHand:{x:200,y:1,z:0},leftHand:null}).mode,'fallback'));
test('no hand positional teleporting on sudden pose change',()=>assert.ok(run().travel<=26*.016+.00001));
test('hand alignment makes a real movement toward contact',()=>assert.ok(run().travel>0));
test('an already-aligned target can stay still',()=>{const a=run({dt:0});assert.equal(a.travel,0)});
test('first contact never goes under street',()=>assert.ok(run({current:{x:0,y:.05,z:1}}).position.y>=.33));
test('tighter windup increases hand influence',()=>{
 const a=run({load:0,dt:.05}).position,b=run({load:1,dt:.05}).position;
 assert.ok(Math.abs(b.x-a.x)+Math.abs(b.y-a.y)+Math.abs(b.z-a.z)>0);
});
test('contact without current state defaults to given hold point',()=>assert.ok(run({current:null}).position));
test('actor yaw cannot instantly snap 180 degrees',()=>{
 const x=approachActorFacing(0,{x:0,y:0,z:0},{x:0,y:0,z:-2},.016,6);
 assert.ok(Math.abs(x)<=.09600001);
});
test('actor yaw rotates smoothly toward target',()=>{
 const x=approachActorFacing(0,{x:0,y:0,z:0},{x:2,y:0,z:0},.016,6);
 assert.ok(x>0&&x<=.09600001);
});
test('invalid actor positions preserve the existing yaw',()=>assert.equal(approachActorFacing(.7,null,null,.016),.7));
test('bad dt cannot cause rotation explosion',()=>assert.ok(Number.isFinite(approachActorFacing(0,{x:0,y:0,z:0},{x:2,y:0,z:0},Infinity))));
