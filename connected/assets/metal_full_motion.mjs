// Metal 3D movement / combat staging core. Pure deterministic JS.
// PROPOSAL / PUBLISH HOLD. Canon limits: real anchor/load paths, finite Gallium,
// four-wheel board, left prosthetic, no free hover or teleport.
export const MOTION_RULES=Object.freeze({
 strokeHoldS:.40,maxHoldS:1.35,cooldownS:2.5,
 massKg:78,minStrokeNs:70,maxStrokeNs:220,
 minRiffNs:390,maxRiffNs:630,
 coastBoardCap:15.5,boardRiffCap:23,footRiffCap:20
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class PressureStep {
 constructor(cfg=MOTION_RULES){this.cfg={...MOTION_RULES,...cfg};this.reset();}
 reset(){this.down=false;this.duration=0;this.peak=0;this.cooldown=0;this.count=0;}
 cancel(){this.down=false;this.duration=0;this.peak=0;}
 step({dt=1/60,down=false,pressure=1,onGround=true,onBoard=false,intercepted=false}={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.065);pressure=clamp(Number.isFinite(pressure)?pressure:0,0,1);
  this.cooldown=Math.max(0,this.cooldown-dt);
  if(intercepted){this.cancel();return {kind:'intercepted',delta:0,cooldown:this.cooldown,loading:false};}
  const old=this.down;this.down=!!down;
  if(this.down){if(!old){this.duration=0;this.peak=0;}
   this.duration=Math.min(this.cfg.maxHoldS,this.duration+dt);
   this.peak=Math.max(this.peak,pressure);
   return {kind:null,delta:0,loading:true,charge:clamp(this.duration/this.cfg.strokeHoldS,0,1),cooldown:this.cooldown};
  }
  if(!old)return {kind:null,delta:0,loading:false,cooldown:this.cooldown};
  const hold=this.duration,peak=this.peak;this.cancel();
  if(!onGround||peak<.1)return {kind:'no-anchor',delta:0,cooldown:this.cooldown,loading:false};
  let kind=null,impulse=0;
  if(hold>=this.cfg.strokeHoldS){
   if(this.cooldown>0)return {kind:'recover',delta:0,cooldown:this.cooldown,loading:false};
   const q=clamp((hold-this.cfg.strokeHoldS)/(this.cfg.maxHoldS-this.cfg.strokeHoldS),0,1);
   impulse=this.cfg.minRiffNs+(this.cfg.maxRiffNs-this.cfg.minRiffNs)*q;
   kind=onBoard?'riff-board':'riff-ground';this.cooldown=this.cfg.cooldownS;
  }else if(onBoard){
   const load=clamp(hold/.18,.25,1);
   impulse=(this.cfg.minStrokeNs+(this.cfg.maxStrokeNs-this.cfg.minStrokeNs)*peak)*load;
   kind='push';
  }else{
   kind='foot-step';impulse=Math.min(55,55*peak);
  }
  this.count++;return {kind,delta:impulse/this.cfg.massKg,impulse,loading:false,
   cap:kind==='riff-ground'?this.cfg.footRiffCap:kind==='riff-board'?this.cfg.boardRiffCap:this.cfg.coastBoardCap,
   cooldown:this.cooldown};
 }
}
export const PAD=Object.freeze({A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,SELECT:8,START:9,UP:12,DOWN:13,LEFT:14,RIGHT:15});
export const POWER_BANKS=Object.freeze(['Movement','Gallium','Combat','Gorillium','RIFFT']);
export class ComboInput {
 constructor(){this.prev=new Set();this.presses=[];this.time=0;this.bank=0;this.selected=0;this.lastChord=new Set();}
 step(buttons=[],dt=1/60,{hasHeldTarget=false,board=false,airborne=false}={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.065);this.time+=dt;
  const now=new Set(buttons),edge=new Set([...now].filter(i=>!this.prev.has(i)));
  const held=n=>now.has(PAD[n]),hit=n=>edge.has(PAD[n]);
  const events=[],chords=new Set();
  const chord=(name,condition,event)=>{if(condition){chords.add(name);if(!this.lastChord.has(name))events.push(event);}};
  chord('throw',held('LB')&&hit('Y')&&hasHeldTarget,'throw-person');
  chord('counter',held('LT')&&hit('B'),'parry');
  chord('bind',held('LT')&&hit('X'),'gallium-bind');
  chord('charge',held('LT')&&held('RT'),'charge');
  chord('world-throw',held('LB')&&hit('RT')&&hasHeldTarget,'throw-world');
  if(hit('LEFT')){this.selected=(this.selected+30)%31;events.push('power-prev');}
  if(hit('RIGHT')){this.selected=(this.selected+1)%31;events.push('power-next');}
  if(hit('DOWN')){this.bank=(this.bank+1)%POWER_BANKS.length;events.push('bank-next');}
  if(hit('UP'))events.push('power-activate');
  this.presses=this.presses.filter(p=>this.time-p.t<.60);
  if(hit('X')&&!held('LT'))this.presses.push({key:'X',t:this.time});
  if(hit('Y')&&!held('LB')&&!held('LT'))this.presses.push({key:'Y',t:this.time});
  if(this.presses.slice(-3).map(x=>x.key).join('')==='XXY'){events.push('knuckle-combo');this.presses=[];}
  this.prev=now;this.lastChord=chords;
  return {events,bank:POWER_BANKS[this.bank],selected:this.selected,
   pressureEligible:!held('LB')&&!held('LT'),rtDown:held('RT'),rtValue:held('RT')?1:0};
 }
}
export function safeThrow({yaw=0,up=.35,power=1,targetMass=85,playerMass=78}={}){
 const mass=clamp(Number(targetMass)||85,25,300),impulse=clamp(Number(power)||1,.15,1)*700;
 const v=clamp(impulse/mass,0,11),lift=clamp(v*(.35+up),1.4,6);
 return {x:-Math.sin(yaw)*v,y:lift,z:-Math.cos(yaw)*v,knockback:v};
}
export function chargePose(t=0,level=0){
 t=Math.max(0,Number.isFinite(t)?t:0);const gain=clamp(level,0,1);
 // Crump vocabulary: torso shunts, chest strikes, heel/toe turns, asymmetrical recovery.
 const beat=Math.sin(2*Math.PI*t*2.4),off=Math.sin(2*Math.PI*t*1.3+1.2);
 return {twist:gain*(.08*beat+.045*off),lean:gain*(.06*Math.sin(2*Math.PI*t*1.1)),
  lower:gain*(.04+.035*Math.max(0,Math.sin(2*Math.PI*t*2.4))),
  side:gain*.055*Math.sin(2*Math.PI*t*.83),
  pulse:gain>.2&&Math.floor(t*3)!==Math.floor((t-.016)*3)};
}
export const ENEMY_KIND=Object.freeze({
 ballast:{name:'Ballast',cooldown:4.4,range:9,telegraph:.5},
 slipline:{name:'Slipline',cooldown:3.8,range:11,telegraph:.3},
 glassjaw:{name:'Glassjaw',cooldown:4.8,range:12,telegraph:.45},
 kiln:{name:'Kiln',cooldown:4.7,range:9,telegraph:.6},
 framekeeper:{name:'Framekeeper',cooldown:5.5,range:12,telegraph:.8}
});
export function enemyAbilityTick(kind,state,dt,range){
 const cfg=ENEMY_KIND[kind];if(!cfg)return {event:null,state};
 const next={cooldown:Math.max(0,(state?.cooldown??cfg.cooldown)-clamp(dt,0,.1)),
   telegraph:Math.max(0,(state?.telegraph??0)-clamp(dt,0,.1)),kind};
 if(range>cfg.range)return {event:null,state:next};
 if(state?.telegraph>0&&next.telegraph<=0)return {event:'attack-'+kind,state:next};
 if(next.telegraph>0)return {event:null,state:next};
 if(next.cooldown<=0){next.cooldown=cfg.cooldown;next.telegraph=cfg.telegraph;
  return {event:'telegraph-'+kind,state:next};}
 return {event:null,state:next};
}
