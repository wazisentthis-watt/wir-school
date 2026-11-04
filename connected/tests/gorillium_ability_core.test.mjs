import test from 'node:test';
import assert from 'node:assert/strict';
import {createGorilliumState,setGorilliumForm,castGorilliumAbility,
 checkGorilliumCast,stepGorillium,gorilliumStatus,GORILLIUM_TUNING,GORILLIUM_LIMB_COUNT}
 from '../assets/gorillium_ability_core.js';
const source={x:0,y:0,z:0},target={id:'reframer',x:3,y:0,z:0};
const ctx={source,target};
const state=()=>{const s=createGorilliumState();setGorilliumForm(s,true);return s;};
test('eight distinct limbs and six provisional combat abilities',()=>{
 const s=createGorilliumState();assert.equal(s.limbs.length,GORILLIUM_LIMB_COUNT);
 assert.deepEqual(s.limbs.map(l=>l.id),[0,1,2,3,4,5,6,7]);
 assert.equal(Object.keys(GORILLIUM_TUNING).length,6);
});
test('cannot cast without activating the Gorillium form',()=>{
 const s=createGorilliumState();
 assert.deepEqual(checkGorilliumCast(s,'tentacle-lash',ctx),{ok:false,reason:'wrong-form'});
 assert.equal(s.charge,1);
});
test('a lash reserves exactly one limb and debits charge once',()=>{
 const s=state(),r=castGorilliumAbility(s,'tentacle-lash',ctx);
 assert.equal(r.ok,true);assert.deepEqual(r.event.limbIds,[0]);
 assert.equal(s.charge,.92);assert.equal(gorilliumStatus(s).freeLimbs,7);
 assert.equal(castGorilliumAbility(s,'tentacle-lash',ctx).reason,'cooldown');
 assert.equal(s.charge,.92);
});
test('targeted moves reject invalid coordinates, distance and identities without mutation',()=>{
 const s=state(),original=JSON.stringify(s);
 assert.equal(castGorilliumAbility(s,'galaxy-tether',{source,target:{...target,x:100}}).reason,'out-of-range');
 assert.equal(castGorilliumAbility(s,'galaxy-tether',{source,target:{...target,x:NaN}}).reason,'invalid-target');
 assert.equal(castGorilliumAbility(s,'galaxy-tether',{source,target:{...target,id:''}}).reason,'invalid-target');
 assert.equal(castGorilliumAbility(s,'not-real',ctx).reason,'unknown-ability');
 assert.equal(JSON.stringify(s),original);
});
test('Octo-Shield needs no target and holds four limbs',()=>{
 const s=state(),r=castGorilliumAbility(s,'octo-shield');
 assert.equal(r.ok,true);assert.equal(r.event.role,'guard');assert.equal(r.event.limbIds.length,4);
 assert.equal(r.event.targetId,null);
});
test('eight-limb Cataclysm requires a clear full set',()=>{
 const s=state();assert.equal(castGorilliumAbility(s,'octo-shield').ok,true);
 assert.equal(castGorilliumAbility(s,'cataclysm',ctx).reason,'limbs-busy');
 assert.ok(Math.abs(s.charge-.82)<1e-9);
 for(let i=0;i<20;i++)stepGorillium(s,.1);
 assert.equal(gorilliumStatus(s).freeLimbs,8);
 assert.equal(castGorilliumAbility(s,'cataclysm',ctx).ok,true);
 assert.equal(gorilliumStatus(s).freeLimbs,0);
});
test('insufficient charge blocks an ultimate without overdrafting',()=>{
 const s=createGorilliumState({charge:.5});setGorilliumForm(s,true);
 assert.equal(castGorilliumAbility(s,'cataclysm',ctx).reason,'charge');
 assert.equal(s.charge,.5);
});
test('two-arm tether targets and holds then releases',()=>{
 const s=state(),r=castGorilliumAbility(s,'galaxy-tether',ctx);
 assert.deepEqual(r.event.limbIds,[0,1]);assert.equal(r.event.targetId,'reframer');
 for(let i=0;i<17;i++)stepGorillium(s,.1);
 assert.equal(gorilliumStatus(s).freeLimbs,8);
 assert.equal(s.limbs[0].targetId,null);
});
test('switching back to Metal releases limbs, not saves or cooldowns',()=>{
 const s=state();castGorilliumAbility(s,'octo-shield');const cd=s.cooldowns['octo-shield'];
 setGorilliumForm(s,false);assert.equal(gorilliumStatus(s).freeLimbs,8);
 assert.equal(s.cooldowns['octo-shield'],cd);
 assert.equal(castGorilliumAbility(s,'octo-shield').reason,'wrong-form');
});
test('invalid elapsed time is a no-op and long background dt stays bounded',()=>{
 const s=state(),before=JSON.stringify(s);
 for(const dt of [NaN,Infinity,-1,0])stepGorillium(s,dt);
 assert.equal(JSON.stringify(s),before);stepGorillium(s,10000);
 assert.equal(s.clock,.1);
});
test('ability readouts are safe and never claim actual rendered hits',()=>{
 const s=state(),r=castGorilliumAbility(s,'crystal-barrage',ctx);
 assert.equal(r.event.role,'projectile');
 const v=gorilliumStatus(s);assert.equal(v.active.length,4);
 assert.equal(Object.hasOwn(r.event,'damage'),false);
});
test('core does not require a browser, WebGL or live game state',()=>{
 const s=state();assert.ok(s.limbs.every(l=>l.ability===null));
 assert.equal(typeof window,'undefined');
});
