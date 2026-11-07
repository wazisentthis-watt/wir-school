import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HUNT,createReframerHunt,stepReframerHunt,hitReframerArm,reframerHuntSnapshot} from '../assets/reframer_hunt_core.mjs';
import {createReframers,wake,step,loseReframerTarget} from '../assets/reframer_core.mjs';

const metal={x:5,z:0},robot={x:0,z:0};
const tick=(h,more={},dt=.1)=>stepReframerHunt(h,{metal,robot,visible:true,...more},dt);
const toCapture=()=>{
 const h=createReframerHunt();let r;
 for(let i=0;i<11;i++)r=tick(h);
 assert.equal(h.tether,'hold','original eight-arm ReFramer never completed telegraph to capture');
 assert.equal(r.held,true);return h;
};
test('existing ReFramer remains intact, now searches last known position instead of omniscient teleport',()=>{
 const s=createReframerHunt();
 let r=tick(s);
 assert.equal(r.mode,'pursue');
 assert.deepEqual(r.goal,metal);
 for(let i=0;i<4;i++)r=stepReframerHunt(s,{metal:{x:100,z:100},robot,visible:false},.1);
 assert.equal(r.mode,'search');assert.deepEqual(r.goal,metal);
 assert.equal(r.canRam,false,'invisible Metal cannot be rammed');
 assert.ok(s.unseen>.3);
});
test('a ReFramer loses its trail after eight seconds and ends with a real lost-target outcome',()=>{
 const h=createReframerHunt();tick(h);
 let r;
 for(let i=0;i<81;i++)r=stepReframerHunt(h,{metal:{x:100,z:100},robot,visible:false},.1);
 assert.equal(r.lost,true);assert.equal(r.canRam,false);
 const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:5,z:0},[{id:'car-a',x:5,z:0,occupied:false}]);
 W.enc.stage='chase';
 const ended=loseReframerTarget(W);
 assert.equal(ended.outcome,'lostTarget');assert.equal(ended.carLost,true);
 assert.equal(W.enc,null);assert.equal(W.ledger.at(-1).carLost,true);
 assert.equal(loseReframerTarget(W),null);
});
test('tether warns before it ever grabs and existing dodge can avoid it',()=>{
 const h=createReframerHunt();
 const first=tick(h);
 assert.equal(h.tether,'windup');assert.equal(first.events[0].type,'tether-warn');assert.equal(first.held,false);
 const escaped=stepReframerHunt(h,{metal:{x:20,z:0},robot,visible:true},.1);
 assert.equal(h.tether,'idle');assert.equal(escaped.events[0].type,'tether-dodged');
 assert.ok(h.tetherCooldown>=HUNT.TETHER_COOLDOWN-.1);
});
test('three deliberate button pulses or touch taps break a real tentacle grip',()=>{
 const h=toCapture();
 for(let i=0;i<2;i++){
  const r=tick(h,{escapeTap:true});
  assert.equal(r.held,true);assert.equal(h.struggle,i+1);
 }
 const last=tick(h,{escapeTap:true});
 assert.equal(last.held,false);assert.equal(h.tether,'idle');assert.equal(h.struggle,0);
 assert.ok(last.events.some(e=>e.type==='tether-escaped'));
 assert.equal(h.escapes,1);
 assert.ok(h.tetherCooldown>0);
});
test('failing the timed struggle applies finite harm, not infinite stun or instant loss',()=>{
 const h=toCapture();
 let total=0,release=0;for(let i=0;i<38;i++){
  const r=tick(h);total+=r.damage;
  release+=r.events.filter(e=>e.type==='tether-release').length;
 }
 assert.equal(release,1);assert.equal(total,HUNT.GRAB_DAMAGE);
 assert.equal(h.tether,'idle');assert.ok(h.tetherCooldown>0);
});
test('claw must receive mechanical weakpoint hits; broken attachment cannot grab again',()=>{
 const h=toCapture();
 assert.equal(hitReframerArm(h,'strike',.1).ok,false,'weak incidental contact should not break attachment');
 const one=hitReframerArm(h,'glob',1);
 assert.equal(one.ok,true);assert.equal(one.broken,false);assert.ok(h.armHP>0);
 const two=hitReframerArm(h,'glob',1);
 assert.equal(two.ok,true);assert.equal(two.broken,true);assert.equal(two.released,true);
 assert.equal(two.salvage,HUNT.PART_RESERVE);
 assert.equal(h.armBreaks,1);assert.equal(h.tether,'idle');
 assert.equal(hitReframerArm(h,'glob',1).ok,false,'one part cannot duplicate salvage');
 for(let i=0;i<400;i++)tick(h);
 assert.equal(h.captures,1,'broken claw regained the ability to grab');
});
test('no invisible roadframe rams during search, but original default pursuit remains identical',()=>{
 const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:10,z:0},[{id:'c1',x:4,z:0,occupied:false}]);
 W.enc.stage='chase';W.enc.t=0;W.enc.target={x:0,z:0};W.enc.ramCd=0;
 const out=step(W,{x:0,z:0},null,.016,{goal:{x:30,z:0},canRam:false});
 assert.equal(out.ram,0);
 assert.ok(W.enc.target.x>0,'search target did not steer original Roadframe physics');
 W.enc.target={x:0,z:0};W.enc.ramCd=0;
 const original=step(W,{x:0,z:0},null,.016);
 assert.equal(original.ram,HUNT?0.16:0.16,'legacy state lost existing ram behavior');
});
test('new optional route does not replace original car disassembly, identity, draw or HUD contracts',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const classic=readFileSync(new URL('../assets/reframer_core.mjs',import.meta.url),'utf8');
 assert.match(main,/get\('reframer_hunt'\)==='1'/);
 assert.match(main,/REFRAMER_HUNT&&E\.stage==='chase'/);
 assert.match(main,/RFR\.wheels\.push\(o\)/);
 assert.match(main,/scene\.attach\(w\)/);
 assert.match(main,/DRW\.scrap\.push\(\{kind:'scrap',id:'reframer-arm-'/);
 assert.match(main,/reframerBreakFree/);
 assert.match(main,/reframerSay\('tetherWarn'/);
 assert.match(main,/metalHurt\(hunted\.damage/);
 assert.match(main,/RFR\.mesh\.scale\.setScalar\(1\.45\)/);
 assert.match(classic,/function rescue\(W\)/);
 assert.match(classic,/export function loseReframerTarget/);
 assert.match(classic,/function end\(W, outcome\)/);
 assert.doesNotMatch(main,/get\('reframer_hunt'\)!=='0'/);
});
test('invalid frames and invalid damage cannot produce an attack or corrupt state',()=>{
 const h=createReframerHunt();
 const first=stepReframerHunt(h,{metal:{x:NaN,z:1},robot,visible:true},.1);
 assert.equal(first.lost,false);assert.equal(first.damage,0);assert.equal(first.goal,null);
 assert.equal(stepReframerHunt(h,{metal,robot,visible:true},Infinity).damage,0);
 assert.equal(h.warnings,0);
 const weak=hitReframerArm(h,'glob',NaN);assert.equal(weak.ok,false);
 assert.deepEqual(reframerHuntSnapshot(h).lastKnown,null);
});
