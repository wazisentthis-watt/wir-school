// WIR Connected · SLOTTA minion combat choreography, v2.
// Deterministic, renderer-independent choreography; visual design PROPOSAL/HOLD.
// Movement is owned here, damage/health/collision resolution remains in main.js.
const SETTINGS=Object.freeze({
 serpent:Object.freeze({spawn:.27,approach:4.7,orbit:.57,orbitSpeed:3.6,radius:2.20,lunge:7.9,lungeTime:.55,recover:.47,reach:1.42,turn:2.7}),
 clone:Object.freeze({spawn:.39,approach:3.4,orbit:.94,orbitSpeed:2.15,radius:3.00,lunge:7.1,lungeTime:.62,recover:.65,reach:1.55,turn:1.2})
});
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function normal(x,z){const d=Math.hypot(x,z);return d>1e-6?[x/d,z/d]:[0,0];}
export function createSlottaMinionMotion(kind,index=0){
 if(!SETTINGS[kind])throw Error('Unsupported SLOTTA minion '+kind);
 return {kind,index,stage:'spawn',stageTime:0,age:0,angle:(index%6)*(Math.PI/3),
  side:index%2===0?1:-1,attackX:0,attackZ:1,telegraphed:false,hits:0};
}
export function minionChoreographyStep(motion,dt,position,target,blocked=()=>false){
 const cfg=SETTINGS[motion.kind],step=Number.isFinite(dt)?clamp(dt,0,.06):0;
 const now={x:Number(position?.x)||0,z:Number(position?.z)||0},
  player={x:Number(target?.x)||0,z:Number(target?.z)||0};
 if(!step)return {x:now.x,z:now.z,stage:motion.stage,yaw:0,telegraph:false,impact:false};
 motion.age+=step;motion.stageTime+=step;
 let telegraph=false,impact=false,dx=0,dz=0;
 const targetDist=Math.hypot(player.x-now.x,player.z-now.z);
 if(motion.stage==='spawn'&&motion.stageTime>=cfg.spawn){
  motion.stage='approach';motion.stageTime=0;
 }
 if(motion.stage==='approach'){
  if(targetDist<=cfg.radius+.35){
   motion.stage='orbit';motion.stageTime=0;motion.telegraphed=false;
  }else{
   [dx,dz]=normal(player.x-now.x,player.z-now.z);
   dx*=cfg.approach*step;dz*=cfg.approach*step;
  }
 }
 if(motion.stage==='orbit'){
  const theta=motion.angle+motion.side*motion.stageTime*cfg.orbitSpeed;
  const ringX=player.x+cfg.radius*Math.cos(theta),ringZ=player.z+cfg.radius*Math.sin(theta);
  [dx,dz]=normal(ringX-now.x,ringZ-now.z);
  const d=Math.min(cfg.approach*step,Math.hypot(ringX-now.x,ringZ-now.z));
  dx*=d;dz*=d;
  if(!motion.telegraphed&&motion.stageTime>=cfg.orbit-.24){
   telegraph=true;motion.telegraphed=true;
  }
  if(motion.stageTime>=cfg.orbit){
   motion.stage='lunge';motion.stageTime=0;
   [motion.attackX,motion.attackZ]=normal(player.x-now.x,player.z-now.z);
  }
 }
 if(motion.stage==='lunge'){
  // Serpents can curve slightly; clone lunges deliberately lock aim at startup.
  if(motion.kind==='serpent'){
   const [nx,nz]=normal(player.x-now.x,player.z-now.z),blend=clamp(step*cfg.turn,0,1);
   [motion.attackX,motion.attackZ]=normal(motion.attackX*(1-blend)+nx*blend,motion.attackZ*(1-blend)+nz*blend);
  }
  dx=motion.attackX*cfg.lunge*step;dz=motion.attackZ*cfg.lunge*step;
  const striking=motion.stageTime>=.12&&motion.stageTime<=cfg.lungeTime;
  if(striking&&Math.hypot(player.x-(now.x+dx),player.z-(now.z+dz))<=cfg.reach)impact=true;
  if(motion.stageTime>=cfg.lungeTime){motion.stage='recover';motion.stageTime=0;}
 }
 if(motion.stage==='recover'){
  // Cool-down separation gives Metal a readable response window.
  const [ux,uz]=normal(now.x-player.x,now.z-player.z);
  dx=ux*step*1.5;dz=uz*step*1.5;
  if(motion.stageTime>=cfg.recover){motion.stage='approach';motion.stageTime=0;motion.angle+=motion.side*.9;}
 }
 let x=now.x+dx,z=now.z+dz;
 // Optional world collision callback: move along the free axis, never tunnel.
 if(blocked(x,z)){
  if(!blocked(x,now.z))z=now.z;
  else if(!blocked(now.x,z))x=now.x;
  else{x=now.x;z=now.z;}
 }
 if(impact)motion.hits++;
 return {x,z,stage:motion.stage,yaw:Math.atan2(dx,dz),telegraph,impact,
  elevation:motion.stage==='lunge'?.22:motion.stage==='spawn'?.10:0,age:motion.age};
}
export function slottaDashSweep(start,direction,distance,blocked,{step=.20,maxDistance=10}={}){
 // Distance is capped; sample center and shoulder footprint in caller's blocked callback.
 const sx=Number(start?.x)||0,sz=Number(start?.z)||0;
 const [ux,uz]=normal(Number(direction?.x)||0,Number(direction?.z)||0);
 const total=clamp(Number(distance)||0,0,maxDistance),stride=clamp(step,.04,.35);
 if(total<=0||(!ux&&!uz))return {x:sx,z:sz,travelled:0,blocked:false};
 let x=sx,z=sz,travelled=0,stopped=false;
 const count=Math.ceil(total/stride);
 for(let i=0;i<count;i++){
  const d=Math.min(stride,total-travelled),nx=x+ux*d,nz=z+uz*d;
  if(blocked(nx,nz)){stopped=true;break;}
  x=nx;z=nz;travelled+=d;
 }
 return {x,z,travelled,blocked:stopped};
}
export function slottaDashTarget(from,target,{min=4,max=8.5}={}){
 const [dx,dz]=normal((Number(target?.x)||0)-(Number(from?.x)||0),
  (Number(target?.z)||0)-(Number(from?.z)||0));
 return {x:dx,z:dz,length:clamp(Math.hypot((target?.x||0)-(from?.x||0),(target?.z||0)-(from?.z||0)),min,max)};
}
