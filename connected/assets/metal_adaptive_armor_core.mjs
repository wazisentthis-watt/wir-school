// METAL • Adaptive Armor v0.1. Pure finite-reserve defensive rules.
// This is one real opt-in combat mechanic, NOT all 73 catalogue powers.
// PUBLISH HOLD: the host owns real health, damage, Gallium, model and saves.
export const ARMOR_COST=.08;
export const ARMOR_DURATION=12;
export const ARMOR_COOLDOWN=4;
export const ARMOR_CAPACITY=.30;
export const ARMOR_FRACTION=.70;
const sane=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fail=reason=>({ok:false,reason,spentGal:0});

export function createMetalArmor(){
 return {time:0,capacity:0,cooldown:0,activations:0,blocked:0};
}
export function metalArmorSnapshot(s){
 return Object.freeze({
  active:s.time>0&&s.capacity>0,time:s.time,capacity:s.capacity,
  cooldown:s.cooldown,activations:s.activations,damageBlocked:s.blocked
 });
}
export function activateMetalArmor(s,{unlocked=false,gallium=0}={}){
 if(!s)return fail('no-state');
 if(!unlocked)return fail('not-unlocked');
 if(s.time>0&&s.capacity>0)return fail('already-active');
 if(s.cooldown>0)return fail('cooldown');
 if(!sane(gallium)||gallium<ARMOR_COST)return fail('need-gallium');
 s.time=ARMOR_DURATION;s.capacity=ARMOR_CAPACITY;s.cooldown=0;s.activations++;
 return {ok:true,spentGal:ARMOR_COST,duration:s.time,capacity:s.capacity};
}
export function stepMetalArmor(s,dt){
 if(!s||!sane(dt)||dt<=0)return;
 const step=clamp(dt,0,.1);
 if(s.time>0){
  s.time=Math.max(0,s.time-step);
  if(s.time===0){s.capacity=0;s.cooldown=ARMOR_COOLDOWN;}
 }else if(s.cooldown>0)s.cooldown=Math.max(0,s.cooldown-step);
}
export function absorbMetalDamage(s,raw){
 const hit=sane(raw)?Math.max(0,raw):0;
 if(!s||hit===0)return {remaining:hit,blocked:0,active:false};
 if(s.time<=0||s.capacity<=0)return {remaining:hit,blocked:0,active:false};
 const blocked=Math.min(hit*ARMOR_FRACTION,s.capacity);
 s.capacity=Math.max(0,s.capacity-blocked);
 s.blocked+=blocked;
 if(s.capacity<=1e-9){s.capacity=0;s.time=0;s.cooldown=ARMOR_COOLDOWN;}
 return {remaining:hit-blocked,blocked,active:s.time>0&&s.capacity>0};
}
