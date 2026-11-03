import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseGripTarget,stepStructureOffset,gripHeldPosition} from '../assets/gallium_grip_core.js';
test('L1 selects a nearby person over a building that intersects the aim ray',()=>{
 const building={type:'structure',along:5,score:0};
 const person={type:'citizen',along:7,score:.25};
 assert.equal(chooseGripTarget([building,person]),person);
});
test('L1 rejects out-of-range people, then selects the nearest registered structure',()=>{
 const far={type:'actor',along:34,score:0};
 const near={type:'structure',along:9,score:0};
 assert.equal(chooseGripTarget([far,near]),near);
 assert.equal(chooseGripTarget([far]),null);
});
test('L1 movement clamps to safe structure offsets and ignores stick jitter',()=>{
 assert.deepEqual(stepStructureOffset({x:0,y:0},.1,-.05,.05),{x:0,y:0});
 let pos={x:0,y:0};for(let i=0;i<200;i++)pos=stepStructureOffset(pos,1,-1,1/60);
 assert.deepEqual(pos,{x:5,y:4});
});
test('held target moves with right stick without touching the input player location',()=>{
 const player={x:10,y:0,z:10};
 const before={...player};
 const neutral=gripHeldPosition(player,0,0,0,0);
 const moved=gripHeldPosition(player,0,1,-1,0);
 assert.ok(moved.x>neutral.x);assert.ok(moved.y>neutral.y);
 assert.deepEqual(player,before);
});
