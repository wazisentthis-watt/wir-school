// Pure, browser-independent rules for L1 Galaxy Gallium grip.
// Rendering stays in gallium_limb.js; this module never changes Metal's velocity.
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
const axis=n=>Number.isFinite(n)&&Math.abs(n)>.15?clamp(n,-1,1):0;
export function chooseGripTarget(choices,{maxRange=28,maxMiss=3}={}){
 const inRange=c=>Number.isFinite(c.along)&&c.along>0&&c.along<=maxRange;
 const movable=choices.filter(c=>c.type!=='structure'&&inRange(c)&&Number.isFinite(c.score)&&c.score<=maxMiss)
  .sort((a,b)=>a.score-b.score||a.along-b.along);
 if(movable.length)return movable[0];
 return choices.filter(c=>c.type==='structure'&&inRange(c))
  .sort((a,b)=>a.along-b.along)[0]||null;
}
export function stepStructureOffset(offset,stickX,stickY,dt,{speed=4,maxSide=5,maxUp=4}={}){
 const step=Number.isFinite(dt)?clamp(dt,0,.05):0;
 return {x:clamp(offset.x+axis(stickX)*speed*step,-maxSide,maxSide),
         y:clamp(offset.y-axis(stickY)*speed*step,-maxUp,maxUp)};
}
export function gripHeldPosition(player,yaw,stickX,stickY,groundY,{distance=3.5,lateral=3,height=1.6}={}){
 const fx=-Math.sin(yaw),fz=-Math.cos(yaw),sx=-fz,sz=fx;
 const x=axis(stickX),y=axis(stickY);
 return {x:player.x+fx*distance+sx*x*lateral,
         y:Math.max(groundY+.3,player.y+height-y*2),
         z:player.z+fz*distance+sz*x*lateral};
}
