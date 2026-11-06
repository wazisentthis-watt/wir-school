// WIR Connected Build 04 · original procedural visual and hit-volume rules.
// PROPOSAL / PUBLISH HOLD. Pure, deterministic and independent of Three.js.
export const BOSS_STYLES=Object.freeze({
  Ballast:      {palette:0x748293,accent:0x94c4e8,geometry:'plates',attack:'cone',reach:8,angle:Math.PI/2.7,seed:11},
  Kiln:         {palette:0x5f2430,accent:0xff7d32,geometry:'vents',attack:'ring',reach:9,inner:3.4,seed:23},
  Glassjaw:     {palette:0x3a5878,accent:0xbfe6ff,geometry:'shards',attack:'cone',reach:10,angle:Math.PI/3,seed:37},
  Patchwork:    {palette:0x433069,accent:0xb66bff,geometry:'coils',attack:'circle',reach:7,seed:41},
  'Load Shark': {palette:0x3f1a2c,accent:0xff477f,geometry:'fins',attack:'line',reach:13,width:2.4,seed:53},
  'The Foreman':{palette:0x4c4535,accent:0xffcf6b,geometry:'machine',attack:'circle',reach:10,seed:61},
  'Brine Broker':{palette:0x214a62,accent:0x4ce1e7,geometry:'tanks',attack:'cone',reach:9,angle:Math.PI/2.6,seed:73},
  'Ledger Wraith':{palette:0x3d1a4a,accent:0xea7aff,geometry:'glyphs',attack:'line',reach:14,width:2.8,seed:89}
});
export const visualWorld=(chapter)=>{
 if(!chapter)return 'morrow';
 return chapter.id==='river'?'riverfront':chapter.id==='marsh'?'marsh':'morrow';
};
export const visualBudget=lite=>({tentacleSamples:lite?10:16,tentacleSides:lite?5:8,props:lite?8:21,shards:lite?5:11,shadow:!lite});
export const cinematicBeat=t=>t<0?'off':t<1.1?'wind-up':t<2.2?'tension':t<3.3?'initiation':'done';
export const clamp01=v=>Math.max(0,Math.min(1,v));
export function hitVolume(style,boss,player,facing={x:0,z:1}){
 if(!style||!boss||!player)return false;
 const dx=player.x-boss.x,dz=player.z-boss.z,d=Math.hypot(dx,dz);
 if(!Number.isFinite(d)||d>.000001+style.reach)return false;
 const f=Math.hypot(facing.x,facing.z);if(f<.0001)return false;
 const fx=facing.x/f,fz=facing.z/f,front=(dx*fx+dz*fz),side=Math.abs(dx*fz-dz*fx);
 switch(style.attack){
  case 'circle':return d<=style.reach;
  case 'ring':return d>=(style.inner??0)&&d<=style.reach;
  case 'line':return front>=0&&front<=style.reach&&side<=style.width/2;
  case 'cone':return d<=style.reach&&front>=0&&(d<.0001||front/d>=Math.cos((style.angle??Math.PI/2)/2));
  default:return false;
 }
}
// Segment-vs-expanded AABB; used to stop visual tentacle claws passing through real world structures.
// Returns first contact along [0,1] or null.
export function sweptSphereAABB(a,b,radius,box){
 if(!a||!b||!box||!Number.isFinite(radius)||radius<0)return null;
 let near=0,far=1,normal=null;
 for(const axis of ['x','y','z']){
  const p=a[axis],v=b[axis]-p,lo=box.min[axis]-radius,hi=box.max[axis]+radius;
  if(![p,v,lo,hi].every(Number.isFinite))return null;
  if(Math.abs(v)<1e-9){if(p<lo||p>hi)return null;continue;}
  const t1=(lo-p)/v,t2=(hi-p)/v,min=Math.min(t1,t2),max=Math.max(t1,t2);
  if(min>near){near=min;normal={x:0,y:0,z:0};normal[axis]=t1<t2?-1:1;}
  far=Math.min(far,max);
  if(near>far)return null;
 }
 if(far<0||near>1)return null;
 return {t:Math.max(0,near),normal:normal||{x:0,y:1,z:0}};
}
export function closestCollision(a,b,radius,boxes){
 let first=null;
 for(const box of boxes||[]){const h=sweptSphereAABB(a,b,radius,box);if(h&&(!first||h.t<first.t))first=h;}
 return first;
}
export function sceneSeed(seed,n){let x=(seed+1)*73856093+n*19349663;x=(x^(x>>>13))*1274126177;return ((x>>>0)%1000000)/1000000;}
