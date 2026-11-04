// WIR METAL · original-rig hand-to-actor procedural pose alignment.
// This is CONTACT CONSTRAINTS, not a promise of uploaded paired FBX mocap.
// Designed for actual Phase 6 LeftHand/RightHand bones when present, safe fallback
// to the existing Gallium hold point on other rigs. Never mutates physics or saves.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vec3=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
const lerp=(a,b,t)=>a+(b-a)*t;
export function alignHeldTarget({base,current,rightHand,leftHand,forward,groundY=.25,load=0,dt=1/60}={}){
 if(!vec3(base))return null;
 const r=vec3(rightHand)?rightHand:null,l=vec3(leftHand)?leftHand:null;
 const w=clamp(Number.isFinite(load)?load:0,0,1);
 dt=clamp(Number.isFinite(dt)?dt:0,0,.065);
 let target={x:base.x,y:base.y,z:base.z},mode='fallback';
 if(r||l){
  let center=r&&l?{x:(r.x+l.x)*.5,y:(r.y+l.y)*.5,z:(r.z+l.z)*.5}:r||l;
  const direct=vec3(forward)?forward:{x:0,y:0,z:1};
  const length=Math.hypot(direct.x,direct.z)||1;
  const goal={x:center.x+direct.x/length*.58,
   y:Math.max(groundY+.25,center.y-.68),z:center.z+direct.z/length*.58};
  const dx=goal.x-base.x,dy=goal.y-base.y,dz=goal.z-base.z;
  if(Math.hypot(dx,dy,dz)<=2.7){
   const t=(r&&l?.5:.3)+.45*w;
   target={x:lerp(base.x,goal.x,t),y:lerp(base.y,goal.y,t),z:lerp(base.z,goal.z,t)};
   mode=r&&l?'two-hand':'one-hand';
  }
 }
 // A low-pass and a speed cap prevent a new bone-frame from teleporting the held target.
 const start=vec3(current)?current:base;
 const dx=target.x-start.x,dy=target.y-start.y,dz=target.z-start.z,d=Math.hypot(dx,dy,dz);
 const response=1-Math.exp(-dt*12),allowed=Math.min(d*response,dt*26);
 if(d>.000001)target={x:start.x+dx/d*allowed,y:start.y+dy/d*allowed,z:start.z+dz/d*allowed};
 else target={...start};
 target.y=Math.max(groundY+.08,target.y);
 return {position:target,mode,constrained:mode!=='fallback',
  travel:Math.hypot(target.x-start.x,target.y-start.y,target.z-start.z)};
}
export function approachActorFacing(currentYaw,from,target,dt,maxSpeed=6){
 if(!Number.isFinite(currentYaw)||!vec3(from)||!vec3(target))return Number.isFinite(currentYaw)?currentYaw:0;
 const goal=Math.atan2(target.x-from.x,target.z-from.z);
 let difference=(goal-currentYaw+Math.PI)%(2*Math.PI);
 if(difference<0)difference+=2*Math.PI;
 difference-=Math.PI;
 return currentYaw+clamp(difference,-clamp(dt,0,.065)*maxSpeed,clamp(dt,0,.065)*maxSpeed);
}
