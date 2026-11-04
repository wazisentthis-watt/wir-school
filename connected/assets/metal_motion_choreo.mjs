// METAL: pressure-synchronized skate stroke + paired enemy throw
// Deterministic procedural animation intent. No new asset, no save mutation.
// PROPOSAL / PUBLISH HOLD: not an FBX retarget, ragdoll solver or final visual mocap.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export class SkateStrokeChoreo {
 constructor(){this.reset();}
 reset(){this.phase='idle';this.age=0;this.hold=0;this.wasDown=false;this.kind=null;this.strokes=0;}
 step(dt,{down=false,onBoard=false,grounded=true,impulse=null}={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.065);
  const release=!!impulse&&['push','riff-board'].includes(impulse);
  if(!onBoard||(!grounded&&!release)){
   this.reset();return this.pose();
  }
  if(down){
   if(!this.wasDown){this.phase='load';this.age=0;this.hold=0;}
   this.hold=Math.min(1.4,this.hold+dt);
  }else if(this.wasDown){
   if(release){this.phase='drive';this.age=0;this.kind=impulse;this.strokes++;}
   else{this.phase='recover';this.age=0;this.kind=null;}
  }else if(this.phase==='drive'||this.phase==='recover'){
   this.age+=dt;
   if(this.age>=(this.phase==='drive'?.36:.19)){this.phase='idle';this.age=0;this.kind=null;}
  }
  this.wasDown=!!down;
  return this.pose();
 }
 pose(){
  if(this.phase==='idle')return {phase:'idle',u:1,weight:0,load:0,drive:0,planted:false,kind:null};
  if(this.phase==='load'){
   const load=smooth(this.hold/.4);
   return {phase:'load',u:.08+.24*load,weight:Math.max(.25,load),
    load,drive:0,planted:this.hold>.07,kind:null};
  }
  if(this.phase==='drive'){
   const t=clamp(this.age/.36,0,1),push=smooth(t);
   const u=.32+.68*push;
   const power=this.kind==='riff-board'?1:.7;
   return {phase:'drive',u,weight:Math.max(0,1-smooth((t-.72)/.28)),
    load:power*(1-smooth(t*2)),drive:power*Math.sin(Math.PI*t),
    planted:t<.43,kind:this.kind};
  }
  const t=clamp(this.age/.19,0,1);
  return {phase:'recover',u:.72+.28*smooth(t),weight:1-smooth(t),
   load:0,drive:0,planted:false,kind:null};
 }
}
export class PairedThrowChoreo{
 constructor({releaseS=.32,recoverS=.68}={}){this.releaseS=releaseS;this.recoverS=recoverS;this.reset();}
 reset(){this.phase='idle';this.age=0;this.active=false;this.released=false;this.target=null;this.completed=0;}
 start(target){
  if(this.active||!target)return false;
  this.active=true;this.released=false;this.age=0;this.phase='load';this.target=target;return true;
 }
 cancel(){this.reset();}
 step(dt,{targetPresent=true}={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.065);
  if(!this.active)return this.pose(false);
  if(!targetPresent&&!this.released){this.cancel();return this.pose(false);}
  this.age+=dt;let releaseNow=false;
  if(!this.released&&this.age>=this.releaseS){
   this.released=true;this.phase='release';releaseNow=true;
  }else if(!this.released)this.phase='load';
  else this.phase='recover';
  if(this.age>=this.recoverS){this.completed++;this.active=false;this.phase='idle';}
  return this.pose(releaseNow);
 }
 pose(releaseNow=false){
  if(!this.active)return {active:false,phase:'idle',releaseNow:false,load:0,twist:0,lift:0,targetHeld:false,age:this.age};
  const load=smooth(this.age/this.releaseS);
  const tail=smooth((this.age-this.releaseS)/(this.recoverS-this.releaseS));
  return {active:true,phase:this.phase,releaseNow,load:this.released?1-tail:load,
   twist:(this.released?1-tail:load)*.38,
   lift:this.released?(.36*(1-tail)):(.28*load),
   targetHeld:!this.released,age:this.age};
 }
}
export const REQUIRED_MOTIONS=Object.freeze({
 skate:['board-neutral','right-leg-reach','right-toe-contact','right-foot-drive','right-foot-recover',
  'left-prosthetic-nose-lock','lean-load','riff-step-spring','landing-compression'],
 grabThrow:['reach-contact','two-hand-catch','attach-and-brace','weight-load','torso-rotation',
  'target-recoil','release-marker','physics-flight','impact','get-up'],
 gallery:['stance-idle','light-heavy-pose-variants','enemy-specific-defense','terrain-knee-bend']
});
