import assert from 'node:assert/strict';
import {test} from 'node:test';
import {KIT,createKit,bAction,addPuddle,takeFromPuddle,puddleTotal,pullStep,form,meltHand,blast,shieldHit,strikeMods,serializePuddles,loadPuddles} from '../assets/gallium_kit_core.mjs';
import {FB,createSquad,hitUnit,hitDrone,step,allDown,platesOn} from '../assets/framebreaker_core.mjs';
const dt=1/60,M={x:0,z:0};

test('B: tap brakes on the board, recalls a nearby lost board, forges when it is gone or too far; hold melts hand first, then the board',()=>{
  const K=createKit();
  assert.equal(bAction(K,{riding:true,metal:M,gal:1}).act,'brake');
  assert.equal(bAction(K,{loose:{x:20,z:0},metal:M,gal:1}).act,'recall');
  const far=bAction(K,{loose:{x:80,z:0},metal:M,gal:1});assert.equal(far.act,'forgeFar');assert.equal(far.meltAt.x,80);
  assert.equal(bAction(K,{metal:M,gal:1}).act,'forge');assert.equal(bAction(K,{metal:M,gal:.05}).act,'noMaterial');
  assert.equal(bAction(K,{fight:true,metal:M,gal:1}).act,'dodge');
  assert.equal(bAction(K,{hold:true,riding:true,metal:M}).act,'dismantleBoard');assert.equal(bAction(K,{hold:true,loose:{x:5,z:0},metal:M}).act,'dismantleLoose');
  K.pulling=true;form(K,'sword',1);assert.equal(bAction(K,{hold:true,riding:true,metal:M}).act,'meltHand');
});

test('puddles stay, merge, cap without losing a drop, and save/load',()=>{
  const K=createKit();addPuddle(K,0,0,0,.2);addPuddle(K,.5,0,0,.1);assert.equal(K.puddles.length,1);assert.ok(Math.abs(K.puddles[0].amount-.3)<1e-9);
  for(let i=0;i<60;i++)addPuddle(K,i*3,0,10,.01);assert.ok(K.puddles.length<=KIT.PUDDLE_CAP);assert.ok(Math.abs(puddleTotal(K)-.9)<1e-9,'conserved');
  const got=takeFromPuddle(K,K.puddles[0].id,5);assert.ok(got>0);assert.ok(Math.abs(puddleTotal(K)-(.9-got))<1e-9);
  const K2=createKit();assert.ok(loadPuddles(K2,serializePuddles(K))>0);assert.ok(Math.abs(puddleTotal(K2)-puddleTotal(K))<1e-3);assert.equal(loadPuddles(K2,'{x'),0);
});

test('L2+R2 pull charges the Merkaba (faster with metal flowing in), arcs at a third, a full pull gives Heavy Hands on release',()=>{
  const K=createKit();let o;for(let i=0;i<60;i++)o=pullStep(K,{l2:1,r2:1,onFoot:true},0,dt);assert.ok(o.pulling);const slow=K.charge;
  const K2=createKit();for(let i=0;i<60;i++)pullStep(K2,{l2:1,r2:1,onFoot:true},.003,dt);assert.ok(K2.charge>slow);
  assert.equal(pullStep(createKit(),{l2:1,r2:0,onFoot:true},0,dt).pulling,false,'one trigger is not a pull');assert.equal(pullStep(createKit(),{l2:1,r2:1,onFoot:false},0,dt).pulling,false,'not on the board');
  for(let i=0;i<60*3;i++)o=pullStep(K,{l2:1,r2:1,onFoot:true},0,dt);assert.ok(o.arcs);const r=pullStep(K,{},0,dt);assert.ok(r.ev.includes('heavy'));assert.ok(strikeMods(K).dmg>1.4);
});

test('sword and shield cost Gallium once, swap refunds, shield wears and breaks into a puddle; blast scales with charge',()=>{
  const K=createKit();assert.equal(form(K,'sword',1).why,'pull');K.pulling=true;
  const s=form(K,'sword',1);assert.equal(s.net,KIT.SWORD);assert.equal(strikeMods(K).reach,KIT.SWORD_MOD.reach);
  const sh=form(K,'shield',.05);assert.ok(sh.ok,'swap uses the sword material');assert.ok(Math.abs(sh.net-(KIT.SHIELD-KIT.SWORD))<1e-9);
  assert.equal(shieldHit(K,.2,false).dmg,.2,'only from the front');let r;for(let k=0;k<KIT.SHIELD_HITS;k++)r=shieldHit(K,.2,true);assert.ok(r.broke);assert.equal(K.hand,null);
  K.charge=.1;assert.equal(blast(K,1).why,'charge');K.charge=.8;const b=blast(K,1);assert.ok(b.ok);assert.ok(Math.abs(b.cost-KIT.BLAST_COST*.8)<1e-9);assert.equal(K.charge,0);
  assert.equal(meltHand(K),null);
});

test('Framebreakers: plates absorb and come off; the pit crew bolts them back unless the drones go down; lock eats knockback; surrender is the end',()=>{
  const S=createSquad(1,1);const h=hitUnit(S,0,.6);assert.equal(h.plateOff,'chest');assert.equal(h.dmgMul,FB.ARMOR_DMG);assert.equal(platesOn(S.units[0]),3);
  const w={metal:{x:5,z:0},trust:0,units:[{x:0,z:0}]};let ev=[];for(let i=0;i<60*(FB.REPAIR_T+.2);i++)ev.push(...step(S,w,dt).events);
  assert.ok(ev.some(e=>e.type==='droneCatch'));assert.ok(ev.some(e=>e.type==='plateRepaired'));assert.equal(platesOn(S.units[0]),4);
  hitUnit(S,0,.6);step(S,w,dt);assert.equal(hitDrone(S,0).type,'droneDown');for(let i=0;i<60*3;i++)step(S,w,dt);assert.equal(platesOn(S.units[0]),3,'no drone, no repair');
  const L=createSquad(1,0);L.units[0].lock=2;assert.equal(hitUnit(L,0,.3).kbMul,0);assert.equal(hitUnit(L,0,.3,{kind:'glob'}).lockBroken,true);
  const Z=createSquad(1,0);let r;for(let k=0;k<40&&!(r&&r.surrender);k++)r=hitUnit(Z,0,1,{fromFront:k%2===0});assert.ok(r.surrender);assert.ok(allDown(Z));assert.equal(hitUnit(Z,0,1),null);
});

test('Framebreakers judge: trust → stand down, attacked → confront, ReFramer → alliance; shear only on a rider, snare at range',()=>{
  const S=createSquad(2,1);const w={metal:{x:6,z:0},trust:70,units:[{x:0,z:0},{x:1,z:0}]};let ev=step(S,w,dt).events;assert.equal(S.units[0].state,'standdown');
  hitUnit(S,0,.2);step(S,w,dt);assert.equal(S.units[0].state,'confront');assert.equal(S.units[1].state,'standdown');
  w.reframerNear=true;ev=step(S,w,dt).events;assert.ok(ev.some(e=>e.type==='alliance'));assert.equal(S.units[0].state,'ally');
  const C=createSquad(1,0);const cw={metal:{x:2,z:0},trust:0,units:[{x:0,z:0}],riding:true};ev=[];for(let i=0;i<60*3;i++)ev.push(...step(C,cw,dt).events);assert.ok(ev.some(e=>e.type==='frameShear'));
  const N=createSquad(1,0);const nw={metal:{x:7,z:0},trust:0,units:[{x:0,z:0}]};ev=[];for(let i=0;i<60*5;i++)ev.push(...step(N,nw,dt).events);assert.ok(ev.some(e=>e.type==='snare'));assert.ok(!ev.some(e=>e.type==='frameShear'),'no board, no shear');
});
