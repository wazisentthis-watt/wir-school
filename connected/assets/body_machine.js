// WIR Body Machine v0.1. PROPOSAL: standalone physics core, not yet wired to Metal.
// Coordinates: Y up; feet at position.y. Fixed timestep recommended (1/60 s).
export class BodyMachine {
  constructor({gravity=9.81,groundY=0,mass=78}={}) {
    this.gravity=gravity; this.groundY=groundY; this.mass=mass;
    this.position={x:0,y:groundY,z:0};
    this.velocity={x:0,y:0,z:0};
    this.mode='grounded'; this.balance=1; this.impact=0; this.recovery=0;
    this.bodyLean=0; this.fallDirection={x:0,z:1};
  }
  impulse(x,y,z) {
    this.velocity.x+=x/this.mass;
    this.velocity.y+=y/this.mass;
    this.velocity.z+=z/this.mass;
    const horizontal=Math.hypot(x,z)/this.mass;
    this.balance=Math.max(0,this.balance-horizontal/6);
    if(this.mode==='grounded' && (horizontal>3.2 || this.balance<0.25)) this.fall(x,z);
  }
  fall(x=this.velocity.x,z=this.velocity.z) {
    if(this.mode==='fallen'||this.mode==='recovering')return;
    const len=Math.hypot(x,z)||1;
    this.fallDirection={x:x/len,z:z/len};
    this.mode='falling';this.recovery=0;
  }
  step(dt,groundY=this.groundY) {
    if(!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,1/30);
    this.groundY=groundY;
    if(this.mode==='recovering'){
      this.recovery+=dt;
      if(this.recovery>=0.8){this.mode='grounded';this.balance=0.7;this.recovery=0;}
      return;
    }
    if(this.mode==='fallen'){
      const drag=Math.exp(-6*dt);
      this.velocity.x*=drag;this.velocity.z*=drag;
      this.position.x+=this.velocity.x*dt;this.position.z+=this.velocity.z*dt;
      return;
    }
    this.velocity.y-=this.gravity*dt;
    this.position.x+=this.velocity.x*dt;
    this.position.y+=this.velocity.y*dt;
    this.position.z+=this.velocity.z*dt;
    if(this.position.y<=groundY){
      const landingSpeed=Math.max(0,-this.velocity.y);
      this.position.y=groundY;this.velocity.y=0;
      this.impact=landingSpeed;
      if(this.mode==='falling'||landingSpeed>8.5){
        this.mode='fallen';this.balance=0;
      }else{
        this.mode='grounded';
        this.balance=Math.min(1,this.balance+dt*0.6);
      }
      const drag=Math.exp(-4*dt);
      this.velocity.x*=drag;this.velocity.z*=drag;
    }else if(this.mode==='grounded'){this.mode='airborne';}
  }
  recover(){
    if(this.mode!=='fallen')return false;
    if(Math.hypot(this.velocity.x,this.velocity.z)>0.5)return false;
    this.mode='recovering';this.recovery=0;return true;
  }
  snapshot(){return {position:{...this.position},velocity:{...this.velocity},mode:this.mode,balance:this.balance,impact:this.impact};}
}