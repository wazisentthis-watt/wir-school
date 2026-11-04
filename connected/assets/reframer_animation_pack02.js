// ReFramer Pack 02: keyed full-body performance upgrades and physics-coupled visual tumble.
// Uses the *existing* SkeletonUtils.clone, bone names and original AnimationMixer.
// Purely local rig presentation; never mutates the rooftop collision body or global saves.
import * as THREE from 'three';
import {PACK02_SCENES,PACK02_MOTION_IDS,pack02PoseFrames,tumbleAngle,smooth01} from './reframer_animation_pack02_design.mjs';
const AXIS=new THREE.Vector3(1,0,0);
const qtmp=new THREE.Quaternion();
export function installReframerPack02(pack){
 if(!pack?.enemy?.mixer||!pack.enemy.model)throw Error('Pack 01 authentic model and mixer required');
 const model=pack.enemy.model;
 const rest={position:model.position.clone(),quaternion:model.quaternion.clone()};
 const upgraded={};const missingBones={};
 for(const id of PACK02_MOTION_IDS){
  const clips=[],missing=[];
  for(const bone of Object.keys(PACK02_SCENES[id].channels)){
   if(!pack.rigBones[bone]){missing.push(bone);continue;}
   const frames=pack02PoseFrames(id,bone);const values=[];
   for(const [x,y,z] of frames.eulers){
    const quat=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'));
    values.push(quat.x,quat.y,quat.z,quat.w);
   }
   clips.push(new THREE.QuaternionKeyframeTrack(bone+'.quaternion',frames.times,values));
  }
  if(clips.length<12)throw Error('ReFramer Pack 02 cannot target the verified skeleton: '+id);
  const former=pack.ownedClips.get(id);
  if(former){pack.ownedActions.get(id)?.stop();pack.enemy.mixer.uncacheAction(former,model);}
  const anim=new THREE.AnimationClip('WIR_REFRAMER_PACK02_'+id,PACK02_SCENES[id].duration,clips);
  const action=pack.enemy.mixer.clipAction(anim,model,THREE.AdditiveAnimationBlendMode);
  action.blendMode=THREE.AdditiveAnimationBlendMode;
  action.setEffectiveWeight(.78);
  action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=false;
  pack.ownedClips.set(id,anim);pack.ownedActions.set(id,action);
  upgraded[id]={tracks:clips.length,keyframes:clips[0].times.length};
  missingBones[id]=missing;
 }
 return {rest,upgraded,missingBones,tumbleAngle:0,tumbleOffsetY:0,source:'original-WIR-authored-6-pose-quaternion-keys'};
}
export function resetReframerPack02Pose(pack){
 if(!pack?.phase2Data)return;
 pack.enemy.model.position.copy(pack.phase2Data.rest.position);
 pack.enemy.model.quaternion.copy(pack.phase2Data.rest.quaternion);
 pack.phase2Data.tumbleAngle=0;pack.phase2Data.tumbleOffsetY=0;
}
export function syncReframerPack02Pose(pack,enemyBody){
 if(!pack?.phase2Data)return;
 const body=pack.enemy.model,meta=pack.phase2Data;
 if(pack.current!=='airborne_tumble'){resetReframerPack02Pose(pack);return;}
 const elapsed=pack.elapsed,period=PACK02_SCENES.airborne_tumble.duration;
 const progress=Math.min(1,Math.max(0,elapsed/period));
 // Preview can show full tumble at a safely raised visual altitude. During gameplay
 // the effect is eased out near actual roof contact to avoid underground meshes.
 const visibility=pack.preview?1:smooth01(Math.min(1,Math.max(0,(enemyBody?.y||0)/.8)));
 const angle=tumbleAngle(progress)*visibility;
 body.quaternion.copy(meta.rest.quaternion).multiply(qtmp.setFromAxisAngle(AXIS,angle));
 // Rotate around an approximate waist pivot so the visible mesh does not swing
 // its feet far under the roof. Physics owns the true center-of-mass trajectory.
 const pivot=.91;
 const lift=pivot*(1-Math.cos(angle));
 body.position.copy(meta.rest.position);
 body.position.y+=lift;
 body.position.z+=pivot*Math.sin(angle);
 meta.tumbleAngle=angle;meta.tumbleOffsetY=lift;
}
