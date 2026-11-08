// WIR ReFramer Rush -> METAL Savannah pursuit / tentacle encounter, phase 1.
// Pure deterministic rules. Uses the EXISTING eight-armed ReFramer Roadframe,
// real vehicle donor and real Metal health / Gallium systems in main.js.
// PROPOSAL / PUBLISH HOLD: one encounter at a time. No production justice-unit rig.
export const HUNT=Object.freeze({
 SIGHT:32, LOST_AFTER:8, TETHER_MIN:2.2, TETHER_MAX:7.5,
 TETHER_WINDUP:.8, TETHER_HOLD:3, TETHER_COOLDOWN:7,
 STRUGGLE_TAPS:3, GRAB_DAMAGE:.12, ARM_HP:1, PART_RESERVE:.18
});
const num=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>p&&num(p.x)&&num(p.z);
const validDt=dt=>num(dt)&&dt>0?Math.min(.1,dt):0;
const clip=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function createReframerHunt(){
 return {mode:'search',lastKnown:null,unseen:0,tether:'idle',tetherT:0,
  tetherCooldown:0,struggle:0,armHP:HUNT.ARM_HP,armBroken:false,
  warnings:0,captures:0,escapes:0,losses:0,armBreaks:0};
}
export function hitReframerArm(H,kind,power=.5){
 if(!H||H.armBroken||!['glob','blast','pulse','car','strike'].includes(kind))
  return {ok:false,reason:H?.armBroken?'already-broken':'unaffected'};
 const effort=num(power)?clip(power):0;
 if(effort<.45&&kind!=='car')return {ok:false,reason:'weak-hit'};
 const damage=kind==='car'?1:kind==='glob'?.55:kind==='blast'?.43:kind==='pulse'?.35:.27;
 H.armHP=clip(H.armHP-damage*(.75+effort*.5));
 if(H.armHP>0)return {ok:true,broken:false,hp:H.armHP};
 H.armHP=0;H.armBroken=true;H.armBreaks++;
 const brokeGrip=H.tether==='hold'||H.tether==='windup';
 H.tether='idle';H.tetherT=0;H.struggle=0;H.tetherCooldown=HUNT.TETHER_COOLDOWN;
 return {ok:true,broken:true,hp:0,released:brokeGrip,salvage:HUNT.PART_RESERVE};
}
function release(H,why,events){
 H.tether='idle';H.tetherT=0;H.struggle=0;H.tetherCooldown=HUNT.TETHER_COOLDOWN;
 events.push({type:why});
}
export function stepReframerHunt(H,context={},dt=1/60){
 const t=validDt(dt),events=[];
 if(!H||!point(context.metal)||!point(context.robot)||!t)
  return {goal:null,canRam:false,held:false,pull:0,damage:0,lost:false,events};
 H.tetherCooldown=Math.max(0,H.tetherCooldown-t);
 const dist=distance(context.metal,context.robot);
 const seen=context.visible===true&&dist<=HUNT.SIGHT;
 if(seen){
  H.mode='pursue';H.unseen=0;H.lastKnown={x:context.metal.x,z:context.metal.z};
 }else{
  H.unseen+=t;
  H.mode=H.unseen>=HUNT.LOST_AFTER?'lost':'search';
 }
 const lost=H.mode==='lost';
 if(lost){
  H.losses++;
  if(H.tether!=='idle')release(H,'tether-lost',events);
  events.push({type:'lost-target'});
  return {goal:H.lastKnown,canRam:false,held:false,pull:0,damage:0,lost:true,events};
 }
 if(H.armBroken&&H.tether!=='idle')release(H,'tether-arm-broken',events);
 // A roadframe cannot instantly grapple Metal. First it projects a
 // visible attachment, allowing a real jump/dodge/power interruption.
 if(H.tether==='idle'&&!H.armBroken&&H.tetherCooldown===0&&seen&&context.allowTether!==false&&
    dist>=HUNT.TETHER_MIN&&dist<=HUNT.TETHER_MAX){
   H.tether='windup';H.tetherT=0;H.warnings++;
   events.push({type:'tether-warn'});
 }
 if(H.tether==='windup'){
  H.tetherT+=t;
  if(!seen||dist>HUNT.TETHER_MAX+1.5){
   release(H,'tether-dodged',events);
  }else if(H.tetherT>=HUNT.TETHER_WINDUP){
   H.tether='hold';H.tetherT=0;H.struggle=0;H.captures++;
   events.push({type:'tether-caught'});
  }
 }else if(H.tether==='hold'){
  H.tetherT+=t;
  if(context.escapeTap===true)H.struggle++;
  if(H.struggle>=HUNT.STRUGGLE_TAPS){
   H.escapes++;release(H,'tether-escaped',events);
  }else if(H.tetherT>=HUNT.TETHER_HOLD||dist>11){
   release(H,'tether-release',events);
   if(dist<=11)return {goal:H.lastKnown,canRam:false,held:false,pull:0,
    damage:HUNT.GRAB_DAMAGE,lost:false,events};
  }
 }
 const held=H.tether==='hold';
 return {goal:H.mode==='pursue'?{x:context.metal.x,z:context.metal.z}:H.lastKnown,
  canRam:seen&&!held&&H.tether==='idle',
  held,pull:held?0.85:0,damage:0,lost:false,events,
  tether:H.tether,armBroken:H.armBroken,mode:H.mode};
}
export function reframerHuntSnapshot(H){
 if(!H)return null;
 return {mode:H.mode,unseen:H.unseen,tether:H.tether,struggle:H.struggle,
  cooldown:H.tetherCooldown,armHP:H.armHP,armBroken:H.armBroken,
  warnings:H.warnings,captures:H.captures,escapes:H.escapes,
  losses:H.losses,armBreaks:H.armBreaks,lastKnown:H.lastKnown?{...H.lastKnown}:null};
}
