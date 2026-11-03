// METAL combat impulse solver v0.1. Gravity always applies; no air-combo bounce.
// Coordinates in metres, velocity m/s. Independent of renderer.
export const combatClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createCombatBody({mass=85,x=0,y=0,z=0}={}){return {mass,position:{x,y,z},velocity:{x:0,y:0,z:0},state:'standing',stun:0};}
export function applyCombatHit(body,{direction={x:0,y:0,z:1},impulse=400,vertical=0}={}){
 const len=Math.hypot(direction.x,direction.y,direction.z)||1;
 body.velocity.x+=direction.x/len*impulse/body.mass;
 body.velocity.z+=direction.z/len*impulse/body.mass;
 body.velocity.y+=vertical/body.mass;
 body.state='ragdoll-proxy';body.stun=.4;
 return body;
}
export function stepCombatBody(body,dt,ground=.25){dt=combatClamp(dt,0,.05);if(body.state==='standing')return body;
 body.stun=Math.max(0,body.stun-dt);body.velocity.y-=24*dt;
 const friction=Math.exp(-.8*dt);body.velocity.x*=friction;body.velocity.z*=friction;
 body.position.x+=body.velocity.x*dt;body.position.y+=body.velocity.y*dt;body.position.z+=body.velocity.z*dt;
 if(body.position.y<=ground){body.position.y=ground;body.velocity.y=Math.abs(body.velocity.y)>.9?-body.velocity.y*.12:0;
 body.velocity.x*=Math.exp(-4*dt);body.velocity.z*=Math.exp(-4*dt);
 if(Math.hypot(body.velocity.x,body.velocity.z)<.25&&body.velocity.y===0&&body.stun===0)body.state='standing';}
 return body;
}
export function blastDirection(yaw,pitch=0){return {x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)};}
