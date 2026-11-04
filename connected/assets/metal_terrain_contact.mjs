// WIR METAL · bounded terrain support samples from the four ACTUAL skatepark kicker meshes.
// Proposal only. Pure math: no renderer, no per-frame allocations required by consumers.
// Cannot invent a ramp: only registered surfaces qualify. Original colliders remain authoritative.
const safe=n=>Number.isFinite(n)?n:0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const valid3=v=>v&&['x','y','z'].every(k=>Number.isFinite(v[k]));
const dot=(v,w)=>v.x*w.x+v.y*w.y+v.z*w.z;
const minus=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const length=v=>Math.hypot(v.x,v.y,v.z);
const unit=v=>{const n=length(v)||1;return {x:v.x/n,y:v.y/n,z:v.z/n}};
/** Surface is the upper face of an actual 3D ramp box, expressed in world space. */
export function makeRampSurface({id,origin,normal,right,forward,width=6,depth=7}={}){
 if(!valid3(origin)||!valid3(normal)||!valid3(right)||!valid3(forward))return null;
 if(normal.y<.30||width<=.2||depth<=.2||!Number.isFinite(width)||!Number.isFinite(depth))return null;
 const n=unit(normal),r=unit(right),f=unit(forward);
 if(Math.abs(dot(n,r))>.03||Math.abs(dot(n,f))>.03||Math.abs(dot(r,f))>.03)return null;
 return Object.freeze({id:String(id||'ramp'),origin:{...origin},normal:n,right:r,forward:f,
  halfWidth:width/2,halfDepth:depth/2});
}
/** Solve tilted plane y at world (x,z), then verify point lies INSIDE true ramp top. */
export function sampleRampTop(s,x,z){
 if(!s||!Number.isFinite(x)||!Number.isFinite(z)||s.normal.y<.3)return null;
 const dx=x-s.origin.x,dz=z-s.origin.z;
 const y=s.origin.y-(s.normal.x*dx+s.normal.z*dz)/s.normal.y;
 const displacement={x:dx,y:y-s.origin.y,z:dz};
 const u=dot(displacement,s.right),v=dot(displacement,s.forward);
 if(Math.abs(u)>s.halfWidth+.002||Math.abs(v)>s.halfDepth+.002)return null;
 return {id:s.id,y,normal:s.normal,within:true};
}
/** Reject unreachable/underside step-ups; preserve the normal flat-ground or roof solver. */
export function pickRampSupport(surfaces,x,z,characterY,{maxStep=.55,maxDrop=.9,minHeight=.25}={}){
 if(!Number.isFinite(characterY)||!Array.isArray(surfaces))return null;
 let best=null;
 for(const s of surfaces){
  const hit=sampleRampTop(s,x,z);if(!hit)continue;
  if(hit.y<minHeight-.001||hit.y>characterY+maxStep||hit.y<characterY-maxDrop)continue;
  if(!best||hit.y>best.y)best=hit;
 }
 return best;
}
/** Used for board lean and optional visual alignment, independent of simulation. */
export function blendTerrainNormal(previous,target,dt,rate=10){
 const from=valid3(previous)?unit(previous):{x:0,y:1,z:0};
 const dest=valid3(target)?unit(target):{x:0,y:1,z:0};
 const alpha=1-Math.exp(-clamp(safe(dt),0,.065)*clamp(rate,1,35));
 const mixed=unit({x:from.x+(dest.x-from.x)*alpha,y:from.y+(dest.y-from.y)*alpha,
  z:from.z+(dest.z-from.z)*alpha});
 return mixed.y>.30?mixed:{x:0,y:1,z:0};
}
/** Move the planted foot's vertical contact toward the actual slope, never the floating swing leg. */
export function correctedFootHeight(worldY,playerRootY,rampHeight,footDeckFraction,weight=1){
 if(![worldY,playerRootY,rampHeight,footDeckFraction,weight].every(Number.isFinite))return worldY;
 const contact=clamp(1-clamp(footDeckFraction,0,1),0,1)*clamp(weight,0,1);
 return worldY+clamp(rampHeight-playerRootY,-.35,.35)*contact;
}
