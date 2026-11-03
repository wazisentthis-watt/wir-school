import test from 'node:test';
import assert from 'node:assert/strict';
import {BodyMachine} from '../assets/body_machine.js';
test('fall direction normalizes and does not instantly finish',()=>{
 const b=new BodyMachine();assert.equal(b.fall(3,4),true);assert.equal(b.mode,'falling');
 assert.ok(Math.abs(b.fallDirection.x-.6)<1e-8);
 for(let i=0;i<5;i++)b.step(1/60);
 assert.equal(b.mode,'falling');
 for(let i=0;i<20;i++)b.step(1/60);
 assert.equal(b.mode,'fallen');
});
test('recovery requires fall completion and restores grounded state',()=>{
 const b=new BodyMachine();b.fall(1,0);assert.equal(b.recover(),false);
 for(let i=0;i<25;i++)b.step(1/60);
 assert.equal(b.recover(),true);assert.equal(b.mode,'recovering');
 for(let i=0;i<55;i++)b.step(1/60);
 assert.equal(b.mode,'grounded');
});
test('large impulse loses balance and invalid impulse is ignored',()=>{
 const b=new BodyMachine();b.impulse(NaN,0,0);assert.equal(b.mode,'grounded');
 b.impulse(300,0,0);assert.equal(b.mode,'falling');
});
test('high vertical landing triggers a fall',()=>{
 const b=new BodyMachine();b.position.y=3;b.velocity.y=-12;b.step(1/60);
 for(let i=0;i<30&&b.mode!=='falling';i++)b.step(1/60);
 assert.equal(b.mode,'falling');
});
