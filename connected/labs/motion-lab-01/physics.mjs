// METAL Morrow City Motion Lab 01. Standalone, deterministic skate physics.
// This module deliberately does not import the live WIR Connected save system.
// PROPOSAL / PUBLISH HOLD.
export const SAVE_KEY='wir_motion_lab01_progress_v1';
export const STAGES=[
  'Find the recovered Mini Morrow ramp',
  'Skate up the real 3D ramp',
  'Ollie off the ramp and land',
  'Return to Lil Heavy’s rendezvous pad',
  'Mission complete'
];
export const RAMP_CENTER={x:0,z:0};
export const RENDEZVOUS={x:0,z:10.5};
const limit=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:0));
export function createRider(){
 return {x:0,y:0,z:10.5,vx:0,vz:0,vy:0,heading:0,grounded:true,
  onRamp:false,speed:0,elapsed:0,wallHits:0};
}
export function createMission(saved){
 const stage=Number.isInteger(saved?.stage)?limit(saved.stage,0,4):0;
 return {stage,armed:stage>2,completed:stage===4||saved?.completed===true,
  lastEvent:'Ride to the ramp',checkpoint:stage>0?'lab-stage-'+stage:null};
}
export function getSurface(groundAt,x,z){
 const v=groundAt(x,z);
 return {height:Math.max(0,Number(v?.height)||0),ramp:!!v?.ramp};
}
export function stepRider(r,input,seconds,groundAt){
 const dt=limit(seconds,0,1/30),steer=limit(input.steer||0,-1,1);
 const throttle=limit(input.throttle||0,-1,1),pump=!!input.pump;
 r.elapsed+=dt;
 r.heading+=steer*(r.grounded?2.35:1.05)*dt;
 const directionX=Math.sin(r.heading), directionZ=-Math.cos(r.heading);
 const accel=r.grounded?(pump?18:12):2.1;
 r.vx+=directionX*throttle*accel*dt;
 r.vz+=directionZ*throttle*accel*dt;
 const drag=Math.exp(-(r.grounded?(Math.abs(throttle)<0.06?1.9:.45):.10)*dt);
 r.vx*=drag;r.vz*=drag;
 const max=pump?18:14,speed=Math.hypot(r.vx,r.vz);
 if(speed>max){r.vx*=max/speed;r.vz*=max/speed;}
 const previous=getSurface(groundAt,r.x,r.z);
 const startedOnRamp=r.grounded&&previous.ramp;
 const jump=!!input.jump&&r.grounded;
 if(jump){r.grounded=false;r.vy=6.5+(pump?.65:0);}
 let nx=r.x+r.vx*dt,nz=r.z+r.vz*dt;
 let landing=getSurface(groundAt,nx,nz);
 let blocked=false;
 // Sidewalls and steep ledges cannot be ghosted through just by skating.
 if(!jump&&r.grounded&&landing.height-previous.height>.48){
  blocked=true;nx=r.x;nz=r.z;r.vx=0;r.vz=0;r.wallHits++;
  landing=previous;
 }
 r.x=nx;r.z=nz;
 const wasAirborne=!r.grounded;
 if(!r.grounded){r.vy-=17.8*dt;r.y+=r.vy*dt;}
 let landed=false;
 if(r.y<=landing.height && r.vy<=0){
  landed=wasAirborne;
  r.y=landing.height;r.vy=0;r.grounded=true;
 }else if(r.grounded){r.y=landing.height;}
 r.onRamp=r.grounded&&landing.ramp;
 r.speed=Math.hypot(r.vx,r.vz);
 // A false jump state never claims an ollie occurred.
 return {jumped:jump,jumpedFromRamp:jump&&startedOnRamp,
  landed,onRamp:r.onRamp,blocked,speed:r.speed,
  position:{x:r.x,y:r.y,z:r.z}};
}
export function distance2(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
export function advanceMission(m,r,event){
 const prior=m.stage;
 if(m.completed)return false;
 if(m.stage===0&&distance2(r,RAMP_CENTER)<5.9&&r.speed>.7){
  m.stage=1;m.lastEvent='Approaching the ramp';
 }else if(m.stage===1&&event.onRamp){
  m.stage=2;m.lastEvent='Ramp contact verified';
 }else if(m.stage===2){
  if(event.jumpedFromRamp)m.armed=true;
  if(m.armed&&event.landed){m.stage=3;m.lastEvent='Ollie landed';}
 }else if(m.stage===3&&distance2(r,RENDEZVOUS)<2.2&&r.speed<3.5){
  m.stage=4;m.completed=true;m.lastEvent='Lil Heavy rendezvous complete';
 }
 if(m.stage!==prior)m.checkpoint='lab-stage-'+m.stage;
 return m.stage!==prior;
}
export function savedProgress(m){return {version:1,stage:m.stage,completed:m.completed};}
