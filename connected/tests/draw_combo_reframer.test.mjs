import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DRAW,createDraw,stepDraw} from '../assets/metal_draw_core.mjs';
import {COMBOS,createCombos,feed} from '../assets/power_combo_core.mjs';
import {RF,createReframers,wake,hit,rescue,step} from '../assets/reframer_core.mjs';
import {createVillainState,stepVillain,damageMul,douseZone} from '../assets/villain_core.mjs';
const dt=1/60;

test('metal draw: near metal you charge fast, far away nothing, objects run dry so you move',()=>{
  const D=createDraw(),car={kind:'car',x:2,y:1,z:0},lamp={kind:'lamp',x:30,y:3,z:0};let g=0;
  for(let i=0;i<120;i++)g+=stepDraw(D,true,{x:0,y:1,z:0},[car,lamp],g,dt).gal;
  assert.ok(g>.3,'2 s next to a car: +'+g.toFixed(2));assert.ok(lamp.reserve===DRAW.RESERVE.lamp,'30 m lamp untouched');
  let g2=0;const D2=createDraw(),c2={kind:'car',x:2,y:1,z:0};for(let i=0;i<600;i++)g2+=stepDraw(D2,true,{x:0,y:1,z:0},[c2],0,dt).gal;assert.ok(g2<=DRAW.RESERVE.car+1e-9,'a car only holds so much');
  const F=createDraw();let gf=0;for(let i=0;i<60;i++)gf+=stepDraw(F,true,{x:0,y:1,z:0},[{kind:'car',x:20,y:1,z:0}],0,dt).gal;assert.equal(gf,0,'out of range');
  const full=createDraw();const r=stepDraw(full,true,{x:0,y:1,z:0},[{kind:'car',x:1,y:1,z:0}],1,.5);assert.equal(r.gal,0);assert.ok(r.charge>0,'full suit → extra becomes charge');
});

test('power combos chain from what the powers do, and chains multiply',()=>{
  const C=createCombos();assert.equal(feed(C,'strike',0),null);feed(C,'strike',.2);const f=feed(C,'globThrow',.7);assert.equal(f.id,'galliumFist');
  assert.equal(feed(C,'drawLong',1),null);const m=feed(C,'pulse',1.5);assert.equal(m.id,'magnetStorm');assert.ok(m.mult>1,'chained');
  const late=createCombos();feed(late,'globThrow',0);assert.equal(feed(late,'blast',2),null,'outside the window');
  assert.ok(COMBOS.every(c=>c.what&&c.seq.length>=2));
});

test('ReFramer: wakes near Metal, drops on a car, jam the scan twice and it aborts',()=>{
  const W=createReframers([{x:0,y:12,z:0}]),donors=[{id:'c1',x:5,z:0,occupied:true}];
  assert.ok(wake(W,{x:10,z:0},donors));for(let i=0;i<50;i++)step(W,{x:10,z:0},{x:5,z:0},dt);assert.equal(W.enc.stage,'read');
  assert.equal(hit(W,'pulse').type,'jam');assert.equal(W.enc.stage,'read');const e=hit(W,'glob');assert.equal(e.outcome,'aborted');assert.equal(W.enc,null);
});

test('ReFramer: tip it during the clamp, rescue the driver, break it before it rebuilds',()=>{
  const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:10,z:0},[{id:'c1',x:5,z:0,occupied:true}]);
  for(let i=0;i<60*3.2;i++)step(W,{x:10,z:0},{x:5,z:0},dt);assert.equal(W.enc.stage,'anchor');
  assert.equal(rescue(W),true,'driver pulled out');assert.equal(hit(W,'glob',.9).type,'tipped');
  hit(W,'strike',.6);const r=hit(W,'strike',.8);assert.equal(r.outcome,'clean');assert.ok(r.residue>0);assert.equal(W.stats.rescued,1);
});

test('ReFramer left alone rebuilds the car into a Roadframe that rams you; break it for residue',()=>{
  const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:10,z:0},[{id:'c1',x:5,z:0,occupied:true}]);let shaken=false,road=false,ram=0,m={x:10,z:0};
  for(let i=0;i<60*14;i++){const o=step(W,m,null,dt);shaken||=o.events.some(e=>e.type==='occupantShaken');road||=o.events.some(e=>e.type==='roadframe');ram+=o.ram;}
  assert.ok(shaken,'nobody pulled the driver: shaken (never hurt)');assert.ok(road);assert.ok(ram>0,'rams Metal');
  let end=null;for(let i=0;i<5&&!end;i++){const h=hit(W,'glob',1);if(h.type==='end')end=h;}assert.equal(end.outcome,'roadframeDown');assert.equal(end.carLost,true);
});

test('villain second powers: Ballast throws cars, Slipline transfers hits / intercept, Glassjaw regrows, Kiln lance + zones, Echo Nail echoes back',()=>{
  const B=createVillainState('ballast');let thr=0;for(let i=0;i<60*12;i++)thr+=stepVillain(B,{dist:9,active:true,self:{x:0,z:0},metal:{x:9,z:0}},dt).events.filter(e=>e.type==='throwCar').length;assert.ok(thr>=1);
  const S=createVillainState('slipline');S.cd=0;stepVillain(S,{dist:4,active:true,self:{x:0,z:0},metal:{x:4,z:0}},dt);assert.equal(damageMul('slipline',S,{src:'strike'}),2,'mid-dash');
  for(let i=0;i<30;i++)stepVillain(S,{dist:4,active:true,self:{x:0,z:0},metal:{x:4,z:0}},dt);assert.equal(damageMul('slipline',S,{src:'strike'}),.3,'charged slide eats strikes');
  const G=createVillainState('glassjaw');for(let i=0;i<4;i++)damageMul('glassjaw',G,{});assert.equal(G.plates,0);let regrow=false;for(let i=0;i<60*10;i++)regrow||=stepVillain(G,{dist:20,active:true,self:{x:0,z:0},metal:{x:20,z:0}},dt).events.some(e=>e.type==='plateRegrow');assert.ok(regrow&&G.plates>0);
  const K=createVillainState('kiln');let lance=0,zone=0,burn=0;for(let i=0;i<60*7;i++){const o=stepVillain(K,{dist:8,active:true,self:{x:0,z:0},metal:{x:8,z:0}},dt);lance+=o.events.filter(e=>e.type==='lance').length;zone+=o.events.filter(e=>e.type==='hotZone').length;burn+=o.metalDmg;}
  assert.ok(lance>=1&&zone>=1&&burn>0);assert.ok(douseZone(K,8,0)>=1,'glob puts the zone out');
  const E=createVillainState('echonail');damageMul('echonail',E,{});damageMul('echonail',E,{});let back=null;for(let i=0;i<60*7.2;i++){const o=stepVillain(E,{dist:2,active:true,self:{x:0,z:0},metal:{x:2,z:0}},dt);back=back||o.events.find(e=>e.type==='echoBack');}
  assert.ok(back&&back.n===2,'two stored hits come back');
});
