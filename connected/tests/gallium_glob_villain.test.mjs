import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GLOB,createGlob,formGlob,launchGlob,stepGlob,carImpulse,foeImpact,createTumble,stepTumble,tumbleResult,splat,globRadius} from '../assets/gallium_glob_core.mjs';
import {VILLAINS,createVillainState,stepVillain,damageMul,echoWarnings,pullSpike} from '../assets/villain_core.mjs';
const dt=1/60;
const hold=(g,sec,gal=1)=>{let used=0;for(let t=0;t<sec;t+=dt){used+=formGlob(g,true,gal-used,dt);}return used;};

test('holding grows the glob from the suit and spends finite Gallium; empty suit = no glob',()=>{
  const g=createGlob();const used=hold(g,.6);assert.ok(g.size>.45&&g.size<.6,'size '+g.size.toFixed(2));assert.ok(Math.abs(used-g.size*GLOB.COST)<1e-9);
  const e=createGlob();hold(e,1,0);assert.equal(e.size,0);
  const f=createGlob();hold(f,3);assert.ok(f.size<=1);
});

test('tiny glob flows back (refund); real glob launches, heavier = slower, arcs down',()=>{
  const g=createGlob();hold(g,.1);const r=launchGlob(g,{x:0,y:1.3,z:0},{x:0,y:0,z:1});assert.ok(r.refund>0&&!r.v);
  const s=createGlob();hold(s,.3);const a=launchGlob(s,{x:0,y:1.3,z:0},{x:0,y:0,z:1});
  const b0=createGlob();hold(b0,1.5);const b=launchGlob(b0,{x:0,y:1.3,z:0},{x:0,y:0,z:1});
  assert.ok(a.v.z>b.v.z,'small is faster');assert.ok(b.r>a.r&&b.r<=GLOB.R1);
  let y0=a.p.y;for(let i=0;i<40;i++)stepGlob(a,dt);assert.ok(a.p.z>12,'flew '+a.p.z.toFixed(1)+' m');assert.ok(a.p.y<y0+1.5);
});

test('small glob nudges a car; past the tip size it flips it; a full glob rolls it',()=>{
  const mk=s=>{const g=createGlob();hold(g,s/GLOB.GROW);return launchGlob(g,{x:0,y:1.3,z:0},{x:1,y:0,z:0});};
  const n=carImpulse(mk(.25),{x:5,y:0,z:0});assert.equal(n.tips,false);assert.ok(n.v.x>0&&n.v.x<4);
  const t=carImpulse(mk(.5),{x:5,y:0,z:0});assert.equal(t.tips,true);
  const f=carImpulse(mk(1),{x:5,y:0,z:0});assert.ok(f.rolls,'full glob rolls the car');assert.ok(f.v.x>t.v.x);
  // the tumble settles on a stable face
  const T=createTumble(t.spin);for(let i=0;i<400;i++)stepTumble(T,dt,i>30);assert.ok(T.settled);assert.notEqual(tumbleResult(T),undefined);
  const T0=createTumble(n.spin);for(let i=0;i<400;i++)stepTumble(T0,dt,true);assert.equal(tumbleResult(T0),'wheels','a nudge never tips it');
});

test('glob hits on fighters scale with size; puddle returns 80 %',()=>{
  const g=createGlob();hold(g,1.2);const p=launchGlob(g,{x:0,y:1,z:0},{x:0,y:0,z:1});
  const i=foeImpact(p);assert.ok(i.down&&i.dmg>.3);assert.ok(Math.abs(splat(p).amount-p.spent*.8)<1e-9);
  assert.equal(globRadius(0),GLOB.R0);
});

test('Ballast: front strikes barely land, globs/cars crack him',()=>{
  const V=createVillainState('ballast');
  assert.equal(damageMul('ballast',V,{facingYaw:0,fromX:0,fromZ:1,src:'strike'}),VILLAINS.ballast.frontMul);
  assert.equal(damageMul('ballast',V,{facingYaw:0,fromX:0,fromZ:-1,src:'strike'}),.8,'from behind');
  assert.equal(damageMul('ballast',V,{src:'glob'}),VILLAINS.ballast.envMul);
  let slam=0;for(let i=0;i<600;i++)slam+=stepVillain(V,{dist:3,active:true,self:{x:0,z:0},metal:{x:0,z:3}},dt).events.filter(e=>e.type==='slam').length;
  assert.ok(slam>=1&&slam<=2,'slams on a cooldown: '+slam);
});

test('Glassjaw: plates absorb the first hits, then he folds',()=>{
  const V=createVillainState('glassjaw');const m=[];for(let i=0;i<6;i++)m.push(damageMul('glassjaw',V,{}));
  assert.deepEqual(m.slice(0,4),[.05,.05,.05,.05]);assert.equal(m[4],1.6);assert.equal(V.cracked,true);
});

test('Kiln cooks you up close; a glob cools him and the heat stops',()=>{
  const V=createVillainState('kiln');let d=0;for(let i=0;i<60;i++)d+=stepVillain(V,{dist:.5,active:true,self:{x:0,z:0},metal:{x:0,z:.5}},dt).metalDmg;
  assert.ok(d>.04,'1 s close = '+d.toFixed(3));damageMul('kiln',V,{src:'glob'});
  let d2=0;for(let i=0;i<60;i++)d2+=stepVillain(V,{dist:.5,active:true,self:{x:0,z:0},metal:{x:0,z:.5}},dt).metalDmg;assert.equal(d2,0);
});

test('Echo Nail: the spike repeats 7 s later — warned first, dodgeable, pullable',()=>{
  const V=createVillainState('echonail');V.cd=0;const env=(x)=>({dist:5,active:true,self:{x:0,z:0},metal:{x,z:5}});
  stepVillain(V,env(0),dt);assert.equal(V.echoes.length,1);
  let warned=false,dmgStay=0;for(let t=0;t<7.2;t+=dt){const o=stepVillain(V,{...env(0),dist:20},dt);dmgStay+=o.metalDmg;if(echoWarnings(V).length)warned=true;}
  assert.ok(warned);assert.ok(dmgStay>=.2,'stayed on the mark: both hits');
  const W=createVillainState('echonail');W.cd=0;stepVillain(W,env(0),dt);let dmgMove=0;for(let t=0;t<7.2;t+=dt)dmgMove+=stepVillain(W,{...env(t>.2?4:0),dist:20},dt).metalDmg;
  assert.ok(dmgMove<.01,'stepped off the mark in time');
  const P=createVillainState('echonail');P.cd=0;stepVillain(P,env(0),dt);assert.equal(pullSpike(P,0,5),true);stepVillain(P,{...env(0),dist:20},dt);assert.equal(P.echoes.length,0);
});

test('Slipline leaves slick lanes that make you slide',()=>{
  const V=createVillainState('slipline');let slid=false;for(let i=0;i<60;i++){const o=stepVillain(V,{dist:4,active:true,self:{x:i*.05,z:0},metal:{x:1,z:0}},dt);slid||=o.slide;}assert.ok(slid);
});
