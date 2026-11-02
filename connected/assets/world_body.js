// World-body solver for Metal's super-strength interactions.
// Uses semi-implicit Euler and substeps; no dependency on rendering or Three.js.
export class WorldBody {
 constructor({mass=1200,radius=1.8,restitution=.25,drag=.16}={}){
  this.mass=mass;this.radius=radius;this.restitution=restitution;this.drag=drag;
  this.position={x:0,y:0,z:0};this.velocity={x:0,y:0,z:0};this.state='free';
 }
 grab(){this.state='held';this.velocity={x:0,y:0,z:0};}
 hold(x,y,z){if(this.state!=='held')return;this.position={x,y,z};}
 throw(x,y,z){if(this.state!=='held')return false;this.velocity={x,y,z};this.state='thrown';return true;}
 step(dt,ground=0){
  if(this.state==='held'||!Number.isFinite(dt)||dt<=0)return;
  const n=Math.max(1,Math.ceil(Math.min(dt,.1)/(1/120))),h=Math.min(dt,.1)/n;
  for(let i=0;i<n;i++){
   this.velocity.y-=24*h;
   const friction=Math.exp(-this.drag*h);
   this.velocity.x*=friction;this.velocity.z*=friction;
   this.position.x+=this.velocity.x*h;this.position.y+=this.velocity.y*h;this.position.z+=this.velocity.z*h;
   if(this.position.y<ground){this.position.y=ground;if(this.velocity.y<0)this.velocity.y=-this.velocity.y*this.restitution;
    const slide=Math.exp(-2*h);this.velocity.x*=slide;this.velocity.z*=slide;
    if(Math.abs(this.velocity.y)<.4)this.velocity.y=0;
    if(Math.hypot(this.velocity.x,this.velocity.z)<.3&&this.velocity.y===0){this.velocity.x=0;this.velocity.z=0;this.state='resting';}
   }
  }
 }
}
