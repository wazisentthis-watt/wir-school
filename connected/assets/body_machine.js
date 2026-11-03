// WIR Connected: physics-only impact/balance state machine.
// Root movement stays owned by the existing skate, foot, swing and flight solvers.
export class BodyMachine {
 constructor({gravity=24,groundY=0,mass=78}={}) {
  this.gravity=gravity;this.groundY=groundY;this.mass=mass;
  this.position={x:0,y:groundY,z:0};this.velocity={x:0,y:0,z:0};
  this.mode='grounded';this.balance=1;this.impact=0;this.recovery=0;
  this.bodyLean=0;this.fallDirection={x:0,z:1};this.fallTime=0;
  this.bodyLean=0;this.fallDirection={x:0,z:1};this.fallTime=0;this.downTime=0;
 }
 impulse(x,y,z){
  if(![x,y,z].every(Number.isFinite))return;
  this.velocity.x+=x/this.mass;this.velocity.y+=y/this.mass;this.velocity.z+=z/this.mass;
  const horizontal=Math.hypot(x,z)/this.mass;
  this.balance=Math.max(0,this.balance-horizontal/6);
  if(this.mode==='grounded'&&(horizontal>3.2||this.balance<.25))this.fall(x,z);
 }
 fall(x=this.velocity.x,z=this.velocity.z){
  if(this.mode==='fallen'||this.mode==='recovering'||this.mode==='falling')return false;
  const length=Math.hypot(x,z);
  this.fallDirection=length>1e-5?{x:x/length,z:z/length}:{x:0,z:1};
  this.mode='falling';this.fallTime=0;this.recovery=0;this.balance=0;
  return true;
 }
 step(dt,groundY=this.groundY){
  this.mode='falling';this.fallTime=0;this.downTime=0;this.recovery=0;this.balance=0;
  return true;
 }
 step(dt,groundY=this.groundY,externalRoot=false){
  if(!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,1/30);this.groundY=groundY;
  if(this.mode==='recovering'){
   this.recovery+=dt;
   if(this.recovery>=.8){this.mode='grounded';this.balance=.7;this.recovery=0;this.velocity.x=0;this.velocity.z=0;}
   return;
  }
  if(this.mode==='fallen'){
   this.downTime+=dt;
   if(externalRoot&&this.downTime>=1.25){this.velocity.x=0;this.velocity.z=0;this.recover();return;}
   const drag=Math.exp(-6*dt);this.velocity.x*=drag;this.velocity.z*=drag;
   this.position.x+=this.velocity.x*dt;this.position.z+=this.velocity.z*dt;return;
  }
  if(this.mode==='falling'){
   // Give the body a visible fall interval even if its proxy starts at floor height.
   this.fallTime+=dt;this.velocity.x*=Math.exp(-3*dt);this.velocity.z*=Math.exp(-3*dt);
   if(this.fallTime>=.3){this.mode='fallen';this.fallTime=0;}
   return;
  }
  if(externalRoot){this.balance=Math.min(1,this.balance+dt*.6);return;}
  this.velocity.y-=this.gravity*dt;
  this.position.x+=this.velocity.x*dt;this.position.y+=this.velocity.y*dt;this.position.z+=this.velocity.z*dt;
  if(this.position.y<=groundY){
   const landingSpeed=Math.max(0,-this.velocity.y);
   this.position.y=groundY;this.velocity.y=0;this.impact=landingSpeed;
   if(landingSpeed>8.5){this.fall(this.velocity.x,this.velocity.z);}
   else{this.mode='grounded';this.balance=Math.min(1,this.balance+dt*.6);}
   const drag=Math.exp(-4*dt);this.velocity.x*=drag;this.velocity.z*=drag;
  }else if(this.mode==='grounded')this.mode='airborne';
 }
 recover(){
  if(this.mode!=='fallen'||Math.hypot(this.velocity.x,this.velocity.z)>.5)return false;
  this.mode='recovering';this.recovery=0;return true;
 }
 snapshot(){return {position:{...this.position},velocity:{...this.velocity},mode:this.mode,balance:this.balance,impact:this.impact,fallTime:this.fallTime};}
}
