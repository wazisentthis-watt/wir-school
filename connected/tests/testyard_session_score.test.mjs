import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTestYardSession,TESTYARD_SCORE_SCHEMA} from '../assets/testyard_session_score.mjs';

test('free skate starts unbounded and never writes user saves',()=>{
 const s=createTestYardSession(),z=s.snapshot();
 assert.equal(z.mode,'free');assert.equal(z.remaining,null);
 assert.equal(z.writesSaves,false);assert.equal(z.schema,TESTYARD_SCORE_SCHEMA);
});
test('real kickflip landing is pending until clean ground combo bank',()=>{
 const s=createTestYardSession();s.addTricks(['Kickflip'],150);
 assert.equal(s.snapshot().score,0);
 for(let i=0;i<35;i++)s.tick(1/60,{grounded:true});
 assert.equal(s.snapshot().score,150);assert.equal(s.snapshot().banks,1);
});
test('two landed tricks chain into a multiplier before banking',()=>{
 const s=createTestYardSession();
 s.addTricks(['Kickflip'],150);s.tick(.1,{grounded:true});
 s.addTricks(['Heelflip'],150);
 for(let i=0;i<30;i++)s.tick(.02,{grounded:true});
 assert.equal(s.snapshot().score,600);
});
test('duplicate trick repeats receive the Test Yard half-value penalty',()=>{
 const s=createTestYardSession();
 s.addTricks(['Kickflip'],150);s.addTricks(['Kickflip'],150);
 for(let i=0;i<30;i++)s.tick(.02,{grounded:true});
 assert.equal(s.snapshot().score,450);
});
test('multiple tricks from one real landing share the earned points',()=>{
 const s=createTestYardSession();
 s.addTricks(['Tre Flip','Indy'],480);
 assert.equal(s.snapshot().comboMultiplier,2);
 s.bank();assert.equal(s.snapshot().score,960);
});
test('rail trick and completed manual can form one chain',()=>{
 const s=createTestYardSession();
 s.addTricks(['Crooked'],120);s.addTricks(['Manual'],200);
 s.bank();assert.equal(s.snapshot().score,640);
});
test('bail never credits unlanded tricks and clears repetition penalty',()=>{
 const s=createTestYardSession();s.addTricks(['Kickflip'],150);s.bail();
 assert.equal(s.snapshot().pending,0);assert.equal(s.snapshot().score,0);
 s.addTricks(['Kickflip'],150);s.bank();assert.equal(s.snapshot().score,150);
});
test('countdown is finite and auto-finishes without carrying airborne tricks',()=>{
 const s=createTestYardSession({duration:1});s.start('run');
 s.addTricks(['Kickflip'],150);
 for(let i=0;i<20;i++)s.tick(.08,{grounded:false});
 assert.equal(s.snapshot().finished,true);
 assert.equal(s.snapshot().score,0);assert.equal(s.snapshot().pending,0);
 assert.equal(s.addTricks(['Heelflip'],150),0);
});
test('countdown can bank a landed chain at the boundary',()=>{
 const s=createTestYardSession({duration:1});s.start('run');s.addTricks(['Indy'],130);
 for(let i=0;i<20;i++)s.tick(.08,{grounded:true});
 assert.equal(s.snapshot().finished,true);assert.equal(s.snapshot().score,130);
});
test('rejects invalid time, points and arbitrary injected names',()=>{
 const s=createTestYardSession({duration:NaN});
 s.start('run');assert.equal(s.snapshot().remaining,120);
 assert.equal(s.addTricks(['Kickflip'],Infinity),0);
 assert.equal(s.addTricks([''],100),0);
 assert.equal(s.addTricks(null,100),0);
 const a=s.snapshot();s.tick(NaN,{grounded:true});assert.equal(s.snapshot().remaining,a.remaining);
 assert.equal(s.start('unknown'),false);
});
test('Connected wiring is opt-in and preserves first-mission/controller/physics authority',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const source=readFileSync(new URL('../assets/testyard_session_score.mjs',import.meta.url),'utf8');
 assert.match(main,/TEST_YARD_SKATE=/);
 assert.match(main,/yardSession\?\.addTricks/);
 assert.match(main,/yardSession\?\.bail/);
 assert.match(main,/yardSession\.tick\(dt/);
 assert.match(main,/function skateGround\(dt,wish,il\)/);
 assert.match(main,/function skOllie\(\)/);
 assert.match(main,/function updateMetalStory/);
 assert.match(main,/writeMetalCheckpoint/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|document\.|window\.|requestAnimationFrame|setInterval/);
});
