// WIR Connected · Gorillium Octopus · gameplay-independent ability core v0.1.
// PROPOSAL / PUBLISH HOLD. Tuning is provisional, not locked canon.
// No art, saved-game mutations, damage simulation or live-game overrides.
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const vector3=v=>v&&finite(v.x)&&finite(v.y)&&finite(v.z);
export const GORILLIUM_LIMB_COUNT=8;
export const GORILLIUM_TUNING=Object.freeze({
 'tentacle-lash':Object.freeze({cost:.08,cooldown:.8,hold:.42,limbs:1,range:12,needsTarget:true,role:'strike'}),
 'galaxy-tether':Object.freeze({cost:.16,cooldown:2.8,hold:1.5,limbs:2,range:25,needsTarget:true,role:'grapple'}),
 'octo-shield':Object.freeze({cost:.18,cooldown:3.6,hold:1.6,limbs:4,range:0,needsTarget:false,role:'guard'}),
 'crystal-barrage':Object.freeze({cost:.24,cooldown:4.6,hold:1.2,limbs:4,range:18,needsTarget:true,role:'projectile'}),
 'pressure-slam':Object.freeze({cost:.26,cooldown:5,hold:.9,limbs:2,range:6,needsTarget:true,role:'impact'}),
 'cataclysm':Object.freeze({cost:.72,cooldown:18,hold:2.4,limbs:8,range:16,needsTarget:true,role:'ultimate'})
});
const arm=id=>({id,busy:0,ability:null,targetId:null});
export function createGorilliumState({charge=1}={}){
 return {version:1,form:'metal',charge:finite(charge)?clamp(charge,0,1):1,
  heat:0,clock:0,cooldowns:Object.fromEntries(Object.keys(GORILLIUM_TUNING).map(id=>[id,0])),
  limbs:Array.from({length:GORILLIUM_LIMB_COUNT},(_,id)=>arm(id)),lastEvent:null};
}
export function setGorilliumForm(state,enabled){
 if(!state||!Array.isArray(state.limbs)||state.limbs.length!==GORILLIUM_LIMB_COUNT)return false;
 state.form=enabled?'gorillium':'metal';
 if(!enabled)for(const limb of state.limbs)Object.assign(limb,arm(limb.id));
 return true;
}
export function checkGorilliumCast(state,id,{source,target}={}){
 const move=GORILLIUM_TUNING[id];
 if(!move)return {ok:false,reason:'unknown-ability'};
 if(!state||state.form!=='gorillium')return {ok:false,reason:'wrong-form'};
 if(!finite(state.charge)||state.charge+1e-9<move.cost)return {ok:false,reason:'charge'};
 if((state.cooldowns?.[id]||0)>0)return {ok:false,reason:'cooldown'};
 if(!Array.isArray(state.limbs)||state.limbs.length!==GORILLIUM_LIMB_COUNT)return {ok:false,reason:'limb-state'};
 const available=state.limbs.filter(l=>l.busy===0);
 if(available.length<move.limbs)return {ok:false,reason:'limbs-busy'};
 if(move.needsTarget){
  if(!vector3(source)||!vector3(target)||typeof target.id!=='string'||!target.id.trim())
   return {ok:false,reason:'invalid-target'};
  const distance=Math.hypot(target.x-source.x,target.y-source.y,target.z-source.z);
  if(distance>move.range)return {ok:false,reason:'out-of-range'};
 }
 return {ok:true,reason:'ready',limbIds:available.slice(0,move.limbs).map(l=>l.id),move};
}
export function castGorilliumAbility(state,id,context={}){
 const check=checkGorilliumCast(state,id,context);
 if(!check.ok)return check;
 const {move,limbIds}=check;
 state.charge=clamp(state.charge-move.cost,0,1);
 state.heat=clamp(state.heat+move.cost*.35,0,1);
 state.cooldowns[id]=move.cooldown;
 for(const lid of limbIds)Object.assign(state.limbs[lid],{
  busy:move.hold,ability:id,targetId:move.needsTarget?context.target.id:null});
 const event={ability:id,role:move.role,limbIds:[...limbIds],
  targetId:move.needsTarget?context.target.id:null,at:state.clock,holdSeconds:move.hold};
 state.lastEvent=event;
 return {ok:true,reason:'cast',event};
}
export function stepGorillium(state,dt){
 if(!state||!finite(dt)||dt<=0)return state;
 // Bound each integration step after backgrounding iOS Safari.
 const step=clamp(dt,0,.1);
 state.clock+=step;
 state.heat=clamp(state.heat-.04*step,0,1);
 if(state.form==='gorillium')state.charge=clamp(state.charge+.025*step,0,1);
 for(const id of Object.keys(GORILLIUM_TUNING))state.cooldowns[id]=Math.max(0,state.cooldowns[id]-step);
 for(const limb of state.limbs){
  limb.busy=Math.max(0,limb.busy-step);
  if(limb.busy===0){limb.ability=null;limb.targetId=null;}
 }
 return state;
}
export function gorilliumStatus(state){
 return {form:state.form,charge:state.charge,heat:state.heat,
  freeLimbs:state.limbs.filter(l=>!l.busy).length,
  active:state.limbs.filter(l=>l.busy>0).map(({id,ability,targetId})=>({id,ability,targetId})),
  ready:Object.keys(GORILLIUM_TUNING).filter(id=>checkGorilliumCast(state,id,
   GORILLIUM_TUNING[id].needsTarget?{source:{x:0,y:0,z:0},target:{id:'preview',x:0,y:0,z:0}}:{}).ok)};
}
