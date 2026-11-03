// Rigged SLOTTA integration adapter for future GLB uploads.
// No hard dependency on a specific third-party skeleton or clip naming.
// This module is not wired into the live game until a skinned, reviewed GLB is supplied.
// Expected model orientation: +Y up, +Z forward, feet at Y=0, meter-ish units.
export const SLOTTA_REQUIRED_SOCKETS=Object.freeze(['hips','spine','head','leftHand','rightHand','phatomRoot','serpentSpawn','cloneSpawn','dashTrail']);
export const SLOTTA_BONE_ALIASES=Object.freeze({
 hips:['Hips','hips','pelvis','mixamorigHips','mixamorig:Hips'],
 spine:['Spine','spine','Chest','mixamorigSpine','mixamorig:Spine'],
 head:['Head','head','DEF-head','mixamorigHead','mixamorig:Head'],
 leftHand:['LeftHand','hand.L','DEF-hand.L','mixamorigLeftHand','mixamorig:LeftHand'],
 rightHand:['RightHand','hand.R','DEF-hand.R','mixamorigRightHand','mixamorig:RightHand'],
 phatomRoot:['PHATOM_BACK','PHATOM_socket','backpackSocket','BackAttachment'],
 serpentSpawn:['SLOTTA_SERPENT_SPAWN','serpentSpawn','RightHand','mixamorigRightHand'],
 cloneSpawn:['SLOTTA_CLONE_SPAWN','cloneSpawn','Hips','mixamorigHips'],
 dashTrail:['SLOTTA_DASH_TRAIL','dashTrail','Hips','mixamorigHips']
});
export function inspectSlottaRig(root){
 if(!root?.traverse)return {ready:false,sockets:{},missing:[...SLOTTA_REQUIRED_SOCKETS],meshCount:0,boneCount:0,skinnedMeshCount:0};
 const byName=new Map();let meshCount=0,boneCount=0,skinnedMeshCount=0;
 root.traverse(o=>{if(o.name)byName.set(o.name.toLowerCase(),o);if(o.isMesh)meshCount++;if(o.isBone)boneCount++;if(o.isSkinnedMesh)skinnedMeshCount++;});
 const sockets={};for(const [key,aliases]of Object.entries(SLOTTA_BONE_ALIASES)){
  const found=aliases.map(n=>byName.get(n.toLowerCase())).find(Boolean);
  if(found)sockets[key]=found;
 }
 const missing=SLOTTA_REQUIRED_SOCKETS.filter(key=>!sockets[key]);
 return {ready:!!skinnedMeshCount&&missing.length===0,sockets,missing,meshCount,boneCount,skinnedMeshCount};
}
export function createSlottaGLBAdapter(gltf,THREE){
 const inspection=inspectSlottaRig(gltf?.scene);
 if(!inspection.skinnedMeshCount)return {ok:false,reason:'Model lacks a skinned mesh; use procedural fallback',inspection};
 if(!THREE?.AnimationMixer)return {ok:false,reason:'Three.js AnimationMixer unavailable',inspection};
 const mixer=new THREE.AnimationMixer(gltf.scene),actions=new Map();
 for(const clip of gltf.animations||[]){if(clip?.name)actions.set(clip.name.toLowerCase(),mixer.clipAction(clip));}
 let active=null;
 return {ok:true,root:gltf.scene,inspection,mixer,availableClips:[...actions.keys()],
  update(dt){if(Number.isFinite(dt)&&dt>0)mixer.update(Math.min(dt,.05));},
  play(clipName,{fade=.16,loop=false}={}){
   const next=actions.get(String(clipName).toLowerCase());if(!next)return false;
   if(next===active)return true;
   if(active)active.fadeOut(fade);
   next.reset().setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce).fadeIn(fade).play();
   active=next;return true;
  },
  socket(name){return inspection.sockets[name]||null;}
 };
}
