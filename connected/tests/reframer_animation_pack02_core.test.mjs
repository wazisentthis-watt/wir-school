import {test} from 'node:test';import assert from 'node:assert/strict';
import {PACK02_SCENES,PACK02_MOTION_IDS,PACK02_COUNTER,pack02Timing,pack02PoseFrames,tumbleAngle} from '../assets/reframer_animation_pack02_design.mjs';
import {createRooftopDuel,stepRooftopDuel,duelAction} from '../assets/metal_aerial_duel_core.mjs';
const step=(s,n=1,dt=.02)=>{for(let i=0;i<n;i++)stepRooftopDuel(s,dt);};
test('three original full-body action plans refer to actual 65-bone GLB names',()=>{
 assert.deepEqual(PACK02_MOTION_IDS,['uppercut_launcher','airborne_tumble','aerial_counter']);
 for(const id of PACK02_MOTION_IDS){
  const p=PACK02_SCENES[id];assert.equal(p.phases.length,6);assert.ok(Object.keys(p.channels).length>=16);
  for(const bone of Object.keys(p.channels)){
   const f=pack02PoseFrames(id,bone);assert.equal(f.times.length,6);assert.equal(f.eulers.length,6);
   assert.ok(f.eulers.every(x=>x.length===3&&x.every(Number.isFinite)));
   assert.ok(f.eulers[0].every(x=>x===0));assert.ok(f.eulers[5].every(x=>x===0));
  }
  assert.equal(pack02Timing(id,0).progress,0);assert.equal(pack02Timing(id,99).progress,1);
 }
});
test('root tumble is continuous and completes exactly one visual revolution',()=>{
 assert.equal(tumbleAngle(0),0);assert.ok(Math.abs(tumbleAngle(1)-2*Math.PI)<1e-9);
 let last=0;for(let i=0;i<=100;i++){const t=tumbleAngle(i/100);assert.ok(t>=last);last=t;}
});
test('base game has zero aerial-counter logic unless explicitly enabled',()=>{
 const s=createRooftopDuel();assert.equal(s.airCounterEnabled,false);
 s.player.y=2;s.enemy.y=2;s.airChase=1;s.enemy.stun=0;
 step(s,50);assert.equal(s.airCounterCount,0);
 assert.ok(!s.events.some(x=>x.type.startsWith('reframer-air-counter')));
});
function armed(){const s=createRooftopDuel({airCounter:true});s.player.y=2.6;s.enemy.y=3.0;
 s.player.x=0;s.enemy.x=1.5;s.player.vy=0;s.enemy.vy=0;s.airChase=1.5;
 return s;}
test('real airborne enemy signals a dodgeable telegraph, then one bounded counter-hit',()=>{
 const s=armed();
 step(s,1);assert.ok(s.airCounterWindup>0);assert.ok(s.events.some(e=>e.type==='reframer-air-counter-telegraph'));
 const prior=s.player.hp;step(s,28);
 assert.equal(s.airCounterCount,1);assert.ok(s.player.hp<prior);
 assert.ok(s.player.hp>=prior-PACK02_COUNTER.damage-.001);
 assert.ok(s.events.some(x=>x.type==='reframer-air-counter-hit'));
 step(s,40);assert.equal(s.airCounterCount,1,'no repeated strikes per chase');
});
test('METAL B dodge inside telegraph avoids damage',()=>{
 const s=armed();step(s,1);step(s,9);
 assert.ok(duelAction(s,'dodge').ok);const hp=s.player.hp;
 step(s,20);
 assert.equal(s.player.hp,hp);
 assert.ok(s.events.some(e=>e.type==='reframer-air-counter-evaded'));
});
test('enemy counter misses if pursuit is out of range',()=>{
 const s=armed();step(s,1);s.player.x=12;s.enemy.x=0;s.airChase=0;
 step(s,27);assert.equal(s.airCounterCount,1);
 assert.ok(s.events.some(e=>e.type==='reframer-air-counter-missed'));assert.equal(s.player.hp,1);
});
test('finisher cancels a pending counter without phantom damage',()=>{
 const s=armed();step(s,1);s.cooldown=0;
 const f=duelAction(s,'finisher');assert.ok(f.ok,JSON.stringify(f));
 assert.equal(s.airCounterWindup,0);const hp=s.player.hp;step(s,22);assert.equal(s.player.hp,hp);
});
