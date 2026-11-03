// WIR Connected · resilient first mission assets.
// Optional/proposal art may fail independently without blocking Metal mission play.
// All generated meshes are intentionally simple, original geometry and labelled fallback.
// PROPOSAL/HOLD; the source assets stay untouched.
export const MISSION_ASSET_TIMEOUTS=Object.freeze({optional:14000,critical:18000});

export async function loadMissionAsset(loader,url,{timeout=MISSION_ASSET_TIMEOUTS.optional,
 fallback=null,onWarning=()=>{},schedule=setTimeout,cancel=clearTimeout}={}){
 let timer;
 try{
  const resource=await Promise.race([
   Promise.resolve().then(()=>loader(url)),
   new Promise((_,reject)=>{timer=schedule(()=>reject(new Error('load deadline exceeded')),timeout);})
  ]);
  if(!resource?.scene)throw Error('asset has no usable scene');
  return resource;
 }catch(e){
  onWarning({asset:url,reason:String(e?.message||e),fallback:!!fallback});
  if(!fallback)throw new Error('Required mission asset unavailable: '+url+': '+String(e?.message||e));
  return fallback();
 }finally{if(timer!==undefined)cancel(timer);}
}

export function createMissionFallback(THREE,type){
 const root=new THREE.Group();root.name='WIR_'+type+'_FALLBACK_PROPOSAL';root.userData.missionFallback=type;
 const basic=(c,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:.84,metalness:metal});
 const add=(geometry,material,x,y,z,parent=root)=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 if(type==='metal'||type==='robot'){
  const metal=type==='metal',scale=metal?1:2.35;
  const shirt=basic(metal?0x282b39:0x647aa2,metal?.55:.05);
  const limbs=basic(metal?0x50545e:0x343945,.3);
  add(new THREE.BoxGeometry(.52*scale,.74*scale,.28*scale),shirt,0,1.18*scale,0);
  add(new THREE.SphereGeometry(.19*scale,10,8),basic(0x9c8170),0,1.73*scale,0);
  for(const side of [-1,1]){
   add(new THREE.BoxGeometry(.17*scale,.71*scale,.22*scale),limbs,side*.41*scale,1.18*scale,0);
   add(new THREE.BoxGeometry(.2*scale,.8*scale,.25*scale),limbs,side*.16*scale,.43*scale,0);
  }
  if(metal) add(new THREE.BoxGeometry(.45,.05,.31),basic(0x8b59da,.3),0,1.42,.16);
 }else if(type==='board'){
  const deck=basic(0x141921),wheel=basic(0xc9a979);
  add(new THREE.BoxGeometry(.3,.055,.96),deck,0,.15,0);
  for(const x of [-.145,.145])for(const z of [-.35,.35]){
   const w=add(new THREE.CylinderGeometry(.067,.067,.06,10),wheel,x,.071,z);w.rotation.z=Math.PI/2;
  }
 }else if(type==='car'){
  const body=basic(0x56758a),wheel=basic(0x1a1d23);
  add(new THREE.BoxGeometry(1.45,.45,2.9),body,0,.58,0);
  add(new THREE.BoxGeometry(1.22,.48,1.25),basic(0x415467),0,1,.1);
  for(const x of [-.67,.67])for(const z of [-.95,.95]){
   const w=add(new THREE.CylinderGeometry(.28,.28,.13,10),wheel,x,.3,z);w.rotation.z=Math.PI/2;
  }
 }else if(type==='city'){
  add(new THREE.BoxGeometry(1.35,2.2,1.35),basic(0x697e90),0,1.1,0);
  add(new THREE.BoxGeometry(1.5,.2,1.5),basic(0x313b49),0,2.25,0);
 }else throw Error('Unknown fallback type '+type);
 return {scene:root,animations:[],userData:{missionFallback:type}};
}
