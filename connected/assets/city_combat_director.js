// WIR Morrow City combat director v0.1. Original prototype, PROPOSAL/HOLD.
// Pure JS, deterministic given random() injection; no dependencies.
const PRESETS={relaxed:{cooldown:420,check:45,chance:.25},balanced:{cooldown:210,check:35,chance:.5},aggressive:{cooldown:90,check:25,chance:.85}};
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function createDirector(mode='balanced',random=Math.random){const cfg=PRESETS[mode]||PRESETS.balanced;return {mode,cfg,random,time:0,next:30,active:null,heat:0,trust:.5,history:[],damage:[],cooldowns:{slotta:0,reframer:0},sequence:0};}
export function tickDirector(d,dt,player={x:0,z:0,speed:0},canSpawn=()=>true){
 dt=clamp(dt,0,.1);d.time+=dt;d.heat=clamp(d.heat-dt*.003);
 if(d.active){d.active.age+=dt;if(d.active.age>150){finishEncounter(d,'expired');}return null;}
 if(d.time<d.next)return null;
 d.next=d.time+d.cfg.check;
 if(d.random()>d.cfg.chance)return null;
 const types=['framebreaker','rescue','framebreaker','framekeeper','slotta','reframer'];
 const available=types.filter(t=>d.time>=(d.cooldowns[t]||0));
 if(!available.length)return null;
 const type=available[Math.floor(d.random()*available.length)];
 // World is compact: position ahead of movement, not hundreds of meters away.
 const angle=d.random()*Math.PI*2,radius=24+d.random()*26+Math.min(18,player.speed*1.5);
 const pos={x:player.x+Math.cos(angle)*radius,z:player.z+Math.sin(angle)*radius};
 if(!canSpawn(pos,type))return null;
 d.active={id:++d.sequence,type,pos,age:0,status:'reported',severity:type==='reframer'?3:type==='slotta'?2:1};
 d.history.push({at:d.time,event:'spawn',type});if(d.history.length>100)d.history.shift();
 return d.active;
}
export function finishEncounter(d,outcome='resolved'){if(!d.active)return;const t=d.active.type;
 d.history.push({at:d.time,event:outcome,type:t});d.cooldowns[t]=d.time+(t==='slotta'?900:t==='reframer'?1200:120);
 d.active=null;d.next=d.time+d.cfg.cooldown;
}
export function witness(d,{collateral=0,rescues=0,force=0}={}){d.heat=clamp(d.heat+collateral*.18+force*.04-rescues*.08);d.trust=clamp(d.trust+rescues*.07-collateral*.11);}
export function createImpactState(){return {mode:'stable',depth:0,stun:0,energy:0,integrity:1,recovery:0};}
export function impactStructure(impact,{mass=170,speed=0,brace=0,material='ordinary',thickness=1}={}){
 const energy=.5*mass*speed*speed;impact.energy=energy;
 const resistance=(material==='reinforced'?18000:material==='ordinary'?6500:Infinity)*Math.max(.2,thickness);
 const excess=Math.max(0,energy*(1-clamp(brace)*.75)-resistance);
 impact.integrity=clamp(impact.integrity-excess/35000);
 if(excess>0){impact.mode='embedded';impact.depth=clamp(excess/18000,0,2.5);impact.stun=clamp(.6+excess/22000,.6,2.4);impact.recovery=0;}
 else {impact.mode='staggered';impact.stun=.35;}
 return {energy,breached:excess>0,damage:excess,depth:impact.depth};
}
export function stepImpact(impact,dt,action='wait',gallium=0){dt=clamp(dt,0,.1);if(impact.stun>0){impact.stun=Math.max(0,impact.stun-dt);return impact;}
 if(impact.mode==='embedded'){if(action==='pull'||action==='brace')impact.recovery+=dt*(action==='pull'?1.3:.65)+(gallium>.1?.1*dt:0);
 if(impact.recovery>=1){impact.mode='recovering';impact.stun=.45;impact.depth=0;}}
 else if(impact.mode==='recovering'&&impact.stun<=0)impact.mode='stable';
 else if(impact.mode==='staggered')impact.mode='stable';
 return impact;
}
export const canManipulate=(faction,material)=>faction==='reframer'&&material==='structural_metal';
