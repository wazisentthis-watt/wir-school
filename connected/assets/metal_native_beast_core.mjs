// WIR Connected · Native METAL Beast power-state logic.
// Experimental gameplay, PROPOSAL / PUBLISH HOLD. No localStorage, DOM, rendering or external I/O.
export const ARM_ROLES=Object.freeze(['Guard','Counter','Anchor','Grapple','Mobility','Rescue']);
export const THERMAL_MODES=Object.freeze(['Cold Lock','Hot Line']);
export const LIL_MODES=Object.freeze(['Scout','Recover','Repair']);
export const FORMS=Object.freeze(['Shield','Brace','Ramp']);
export function createBeastState(){return {
 arms:['Guard','Counter','Anchor','Anchor','Grapple','Mobility'], selected:0,
 focus:100,heat:15,resonance:0,snap:0,snapStorm:0,snapExposure:0,
 thermal:'Cold Lock',shape:'Shield',lil:'Scout',
 rift:{source:null,destination:null,integrity:100,travel:0,cooldown:0},
 constructs:[],held:false,anchorPoints:[],dominionCooldown:0,message:'Six limbs ready',time:0
};}
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function selectBeastArm(s,n){if(!Number.isInteger(n)||n<0||n>5)return false;s.selected=n;return true;}
export function setBeastRole(s,n,role){if(!Number.isInteger(n)||n<0||n>=6||!ARM_ROLES.includes(role))return false;s.arms[n]=role;return true;}
export function cycleBeastRole(s,n=s.selected){if(!Number.isInteger(n)||n<0||n>=6)return null;const role=ARM_ROLES[(ARM_ROLES.indexOf(s.arms[n])+1)%ARM_ROLES.length];s.arms[n]=role;return role;}
export function spendGallium(current,amount){if(!Number.isFinite(current)||!Number.isFinite(amount)||amount<=0||current<amount)return null;return clamp(current-amount,0,1);}
export function reclaimGallium(current,amount,ratio=.8){if(!Number.isFinite(amount)||amount<0||!Number.isFinite(ratio)||ratio<0||ratio>1)return null;return {remaining:clamp(current+amount*ratio,0,1),lost:amount*(1-ratio)};}
export function buildConstruct(s,gal,{type=s.shape,position=null}={}){
 if(!FORMS.includes(type))return {ok:false,reason:'Unknown construct type'};
 const cost={Shield:.11,Brace:.075,Ramp:.095}[type];
 const next=spendGallium(gal,cost);if(next===null)return {ok:false,reason:'Insufficient Galaxy Gallium'};
 const id=(s.constructs.at(-1)?.id||0)+1;s.constructs.push({id,type,cost,position,active:true});
 s.heat=clamp(s.heat+4,0,100);return {ok:true,id,cost,gallium:next};
}
export function recoverConstruct(s,gal,id){const found=s.constructs.find(x=>x.id===id&&x.active);if(!found)return {ok:false};
 found.active=false;const got=reclaimGallium(gal,found.cost,.8);return {ok:true,gallium:got.remaining,lost:got.lost};}
export function addBeastResonance(s,points){if(!Number.isFinite(points)||points<=0)return s.resonance;s.resonance=clamp(s.resonance+points,0,100);return s.resonance;}
export function activateSnap(s){if(s.snap>0||s.snapStorm>0||s.focus<24||s.heat>=86)return false;s.snap=3.2;s.snapExposure=0;s.message='SNAP · precision window';return true;}
export function cycleThermal(s){s.thermal=s.thermal===THERMAL_MODES[0]?THERMAL_MODES[1]:THERMAL_MODES[0];s.heat=clamp(s.heat+(s.thermal==='Hot Line'?8:0),0,100);return s.thermal;}
export function cycleLil(s){s.lil=LIL_MODES[(LIL_MODES.indexOf(s.lil)+1)%LIL_MODES.length];return s.lil;}
export function cycleShape(s){s.shape=FORMS[(FORMS.indexOf(s.shape)+1)%FORMS.length];return s.shape;}
export function markRifft(s,point,{valid=false,quality=0}={}){
 if(!valid||quality<.6||!point||!['x','y','z'].every(k=>Number.isFinite(point[k])))return {ok:false,reason:'No supported anchor'};
 if(s.rift.travel>0||s.rift.cooldown>0)return {ok:false,reason:'RIFFT busy'};
 if(!s.rift.source||s.rift.destination){s.rift.source={...point};s.rift.destination=null;return {ok:true,step:'source'};}
 const dx=s.rift.source.x-point.x,dz=s.rift.source.z-point.z,dist=Math.hypot(dx,dz);
 if(dist<8||dist>32)return {ok:false,reason:'Route must be 8–32 m'};
 s.rift.destination={...point};return {ok:true,step:'destination',distance:dist};
}
export function beginRifftTravel(s,{clear=false,grounded=false}={}){
 const r=s.rift;if(!r.source||!r.destination||r.travel>0||r.cooldown>0||r.integrity<35||!clear||!grounded)return false;
 if(s.focus<18||s.heat>82)return false;
 r.travel=1;r.integrity=clamp(r.integrity-12,0,100);s.focus-=18;s.heat=clamp(s.heat+12,0,100);s.message='RIFFT · anchored passage';return true;
}
export function finishRifft(s,success=true){s.rift.travel=0;s.rift.cooldown=3;
 if(!success){s.rift.integrity=clamp(s.rift.integrity-25,0,100);s.message='RIFFT RETURN corrupted · stop and re-anchor';}
 return success;}
export function resetRifft(s){if(s.rift.travel>0)return false;s.rift.source=null;s.rift.destination=null;s.rift.integrity=Math.max(s.rift.integrity,55);return true;}
export function canDominion(s,{anchored=0,scanned=false,gallium=1}={}){return s.arms.length===6&&anchored>=2&&scanned&&s.focus>=35&&s.resonance>=100&&s.heat<=60&&s.dominionCooldown===0&&gallium>=.08&&!s.held;}
export function useDominion(s,ctx){if(!canDominion(s,ctx))return false;s.focus-=35;s.resonance=0;s.heat=clamp(s.heat+35,0,100);s.dominionCooldown=28;s.message='CROWN DOMINION · sixfold controlled release';return true;}
export function tickBeast(s,dt){if(!Number.isFinite(dt)||dt<=0)return;s.time+=dt;
 s.snapStorm=Math.max(0,s.snapStorm-dt);s.dominionCooldown=Math.max(0,s.dominionCooldown-dt);
 s.rift.cooldown=Math.max(0,s.rift.cooldown-dt);
 if(s.snap>0){s.snap=Math.max(0,s.snap-dt);s.snapExposure+=dt;s.focus=clamp(s.focus-11*dt,0,100);s.heat=clamp(s.heat+8*dt,0,100);
 if(s.snapExposure>=3||s.focus<=0||s.heat>=96){s.snap=0;s.snapStorm=8;s.message='SNAP STORM · neural overload';}}
 else{s.focus=clamp(s.focus+6*dt,0,100);s.heat=clamp(s.heat-(s.thermal==='Cold Lock'?7:3)*dt,0,100);}
 if(s.rift.integrity<100&&!s.rift.travel)s.rift.integrity=clamp(s.rift.integrity+.35*dt,0,100);
}
