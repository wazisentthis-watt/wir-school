// Original real-anchor selection for Metal. No teleportation or synthetic air anchor.
// PROPOSAL/HOLD: selector only, existing swing spring physics stays authoritative.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.x*b.x+a.z*b.z;
function unit(v){const n=Math.hypot(v?.x||0,v?.z||0);return n>1e-5?{x:v.x/n,z:v.z/n}:{x:0,z:-1};}
export function chooseGrappleAnchor(anchors,player,look,travel,{minDistance=6,maxDistance=32,minHeight=2.5,preferredDistance=17}={}){
 if(!Array.isArray(anchors)||!player)return null;
 const facing=unit(look),motion=unit(travel||look);
 let picked=null,best=-Infinity,backup=null,backScore=-Infinity;
 for(const a of anchors){
  if(!a||!['x','y','z'].every(k=>Number.isFinite(a[k])))continue;
  const dx=a.x-player.x,dy=a.y-player.y,dz=a.z-player.z;
  const d=Math.hypot(dx,dy,dz),horizontal=Math.hypot(dx,dz);
  if(d<minDistance||d>maxDistance||dy<minHeight||horizontal<1)continue;
  const aim=(dx*facing.x+dz*facing.z)/horizontal;
  const momentum=(dx*motion.x+dz*motion.z)/horizontal;
  const heightPenalty=Math.abs(Math.atan2(dy,horizontal)-.77);
  const score=aim*9+momentum*1.2-heightPenalty*2-Math.abs(d-preferredDistance)*.22;
  if(score>backScore){backup=a;backScore=score;}
  // only use behind-the-camera anchor when no viable forward/sideline support exists
  if(aim<.18)continue;
  if(score>best){best=score;picked=a;}
 }
 return picked||backup;
}
