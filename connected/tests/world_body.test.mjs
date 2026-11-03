import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldBody} from '../assets/world_body.js';
test('held cars stay put until thrown',()=>{
 const b=new WorldBody();b.grab();b.hold(5,3,2);b.step(1/30);
 assert.deepEqual(b.position,{x:5,y:3,z:2});assert.equal(b.state,'held');
 assert.equal(b.throw(20,12,0),true);b.step(1/60);
 assert.ok(b.position.x>5);assert.ok(b.position.y>3);
});
test('gravity and ground collision do not tunnel through ground',()=>{
 const b=new WorldBody();b.grab();b.hold(0,4,0);b.throw(0,-20,0);
 for(let i=0;i<180;i++)b.step(1/60,0);
 assert.ok(b.position.y>=0);assert.ok(Math.abs(b.velocity.y)<.5);
});
test('cannot throw a free body',()=>{const b=new WorldBody();assert.equal(b.throw(5,5,5),false);});

test('L1 release drops an unthrown car and lets it settle',()=>{
 const b=new WorldBody();b.grab();b.hold(2,4,1);
 assert.equal(b.release(),true);assert.equal(b.state,'free');
 assert.equal(b.release(),false);
 for(let i=0;i<180;i++)b.step(1/60,0);
 assert.equal(b.state,'resting');assert.equal(b.position.y,0);
});
