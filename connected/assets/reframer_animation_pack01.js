// Eight true 3D performances for the existing 65-bone WIR rival rig.
// Source clips are reused, and missing upper-body gestures are authored as
// additive THREE.QuaternionKeyframeTrack animations on the ORIGINAL character mixer.
// All new structural steel parts are visual-only (never Galaxy Gallium).
import * as THREE from 'three';
import {REFRAMER_ASSET,REFRAMER_PACK01,REFRAMER_PACK_IDS,pack01Timing,selectReframerEventMotion} from './reframer_animation_timeline.mjs';
import {installReframerPack02,resetReframerPack02Pose,syncReframerPack02Pose} from './reframer_animation_pack02.js';
const clamp01=x=>Math.min(1,Math.max(0,Number.isFinite(x)?x:0));
const EASE=x=>{const t=clamp01(x);return t*t*(3-2*t)};
export class ReframerAnimationPack01{
 constructor({enemy,playSource,scene,phase2=false}){
  if(!enemy?.model||!enemy.mixer||!enemy.acts)throw Error('Real ReFramer 3D fighter, acts and original mixer required');
  this.enemy=enemy;this.playSource=playSource;this.scene=scene;this.phase2Enabled=!!phase2;this.phase2Data=null;
  this.current=null;this.elapsed=0;this.stageIndex=-1;this.preview=false;
  this.history=[];this.ownedActions=new Map();this.ownedClips=new Map();this.lastSources=new Set();
  this.rigBones={};enemy.model.traverse(o=>{if(o.isBone)this.rigBones[o.name]=o});
  this.boneMatches=REFRAMER_ASSET.importantBones.filter(k=>!!this.rigBones[k]);
  this.sourceClips=new Set(Object.values(enemy.acts).map(a=>a?.getClip?.()?.name).filter(Boolean));
  this.shield=this.createShield();
  this.trails=this.createTrails();
  this.ring=this.createRing();
  this.ui=null;this.menu=null;this.launch=null;
  this.provenance={source:REFRAMER_ASSET.path,bones:Object.keys(this.rigBones).length,
   verifiedImportantBones:this.boneMatches.slice(),sourceClips:[...this.sourceClips].sort(),
   skinnedMeshes:(()=>{let n=0;enemy.model.traverse(o=>{if(o.isSkinnedMesh)n++;});return n;})()};
  this.buildAdditiveClips();
  if(this.phase2Enabled)this.phase2Data=installReframerPack02(this);
 }
 buildAdditiveClips(){
  const shape=[0,.16,.4,.7,1];
  for(const id of REFRAMER_PACK_IDS){
   const spec=REFRAMER_PACK01[id],tracks=[];
   for(const [name,offset] of Object.entries(spec.bones)){
    if(!this.rigBones[name])continue;const values=[],times=shape.map(x=>x*spec.duration);
    const phases=[0,.35,1,-.28,0];
    for(const k of phases){
     const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(offset[0]*k,offset[1]*k,offset[2]*k,'XYZ'));
     values.push(q.x,q.y,q.z,q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(name+'.quaternion',times,values));
   }
   const clip=new THREE.AnimationClip('WIR_REFRAMER_PACK01_'+id,spec.duration,tracks);
   const action=this.enemy.mixer.clipAction(clip,this.enemy.model,THREE.AdditiveAnimationBlendMode);
   action.blendMode=THREE.AdditiveAnimationBlendMode;
   action.setEffectiveWeight(.75);action.setLoop(THREE.LoopOnce,1);
   action.clampWhenFinished=false;
   this.ownedActions.set(id,action);this.ownedClips.set(id,clip);
  }
 }
 createShield(){
  const holder=new THREE.Group();holder.visible=false;this.enemy.o.add(holder);
  const mat=new THREE.MeshStandardMaterial({color:0x405665,metalness:.86,roughness:.27,emissive:0x0d6074,emissiveIntensity:.75,transparent:true,opacity:.9,depthWrite:true});
  for(let i=0;i<5;i++){
   const piece=new THREE.Mesh(new THREE.BoxGeometry(.38,.70,.065),mat);
   piece.position.set((i-2)*.40,1.42,.90+(Math.abs(i-2)*-.09));
   piece.rotation.y=(i-2)*-.16;holder.add(piece);
  }
  return holder;
 }
 createTrails(){
  const group=new THREE.Group();group.visible=false;this.enemy.o.add(group);
  const mat=new THREE.MeshBasicMaterial({color:0x65d9ef,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending});
  for(let i=0;i<4;i++){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(.08,.07,.86),mat);
   mesh.position.set((i-1.5)*.32,1.25,-.85-i*.25);group.add(mesh);
  }
  return group;
 }
 createRing(){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.05,6,28),
   new THREE.MeshBasicMaterial({color:0x889aaa,transparent:true,opacity:.75,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.07;ring.visible=false;this.enemy.o.add(ring);return ring;
 }
 play(id,{preview=false,source='game'}={}){
  const spec=REFRAMER_PACK01[id];if(!spec)return false;
  this.stopMotion();
  this.current=id;this.elapsed=0;this.stageIndex=-1;this.preview=preview;
  const additive=this.ownedActions.get(id);
  if(additive){additive.reset();additive.setEffectiveWeight(.75);additive.play();}
  this._playStage(0);
  this.history.push({name:id,source});if(this.history.length>40)this.history.shift();
  return true;
 }
 _playStage(index){
  if(!this.current)return;
  const stage=REFRAMER_PACK01[this.current].stages[index];
  if(!stage||!this.enemy.acts[stage[1]])return;
  this.stageIndex=index;
  this.playSource(this.enemy,stage[1]);
  const a=this.enemy.acts[stage[1]];
  a.setEffectiveTimeScale(stage[2]);this.lastSources.add(a);
 }
 onEvent(event){
  if(this.preview)return false;
  const id=selectReframerEventMotion(event);
  return id?this.play(id,{source:'event:'+event}):false;
 }
 stopMotion(){
  for(const a of this.ownedActions.values())a.stop();
  for(const a of this.lastSources)a.setEffectiveTimeScale(1);
  this.lastSources.clear();
  this.shield.visible=false;this.trails.visible=false;this.ring.visible=false;
  resetReframerPack02Pose(this);
 }
 syncPhysicalPresentation(enemyBody){syncReframerPack02Pose(this,enemyBody);}
 update(dt){
  if(!this.current)return;
  const spec=REFRAMER_PACK01[this.current];dt=Math.max(0,Math.min(.06,Number.isFinite(dt)?dt:0));
  this.elapsed+=dt;
  if(spec.loop&&this.elapsed>=spec.duration){this.elapsed%=spec.duration;
   this.stageIndex=-1;this.ownedActions.get(this.current)?.reset().play();}
  const {progress,stage,finished}=pack01Timing(this.current,this.elapsed);
  const stageIndex=spec.stages.indexOf(stage);
  if(stageIndex>this.stageIndex)this._playStage(stageIndex);
  this.shield.visible=this.current==='shield_formation';
  if(this.shield.visible){
   const spread=EASE(Math.min(progress/.42,(1-progress)/.21,1));
   this.shield.scale.setScalar(Math.max(.001,spread));this.shield.position.y=Math.sin(progress*Math.PI)*.06;
   this.shield.rotation.y=Math.sin(progress*Math.PI*2)*.05;
  }
  this.trails.visible=this.current==='aerial_pursuit'||this.current==='aerial_counter';
  if(this.trails.visible){this.trails.scale.z=1+.8*Math.sin(progress*Math.PI);
   this.trails.children.forEach((ch,i)=>ch.material.opacity=.50);this.trails.rotation.y=Math.sin(progress*Math.PI)*.08;}
  this.ring.visible=this.current==='rooftop_recovery'&&progress<.58;
  if(this.ring.visible){this.ring.scale.setScalar(.3+EASE(progress/.58)*2.7);this.ring.material.opacity=.8*(1-EASE(progress/.58));}
  if(finished){
   const preview=this.preview;
   this.play('combat_idle',{source:preview?'preview-end':'recovery-idle'});
   this.preview=false;
  }
 }
 attachUI(panel){
  if(this.ui)return;
  const launch=document.createElement('button');launch.id='reframerAnimLabToggle';
  launch.type='button';launch.textContent=this.phase2Enabled?'REFRAMER · PACK 02':'REFRAMER · 8 MOTIONS';launch.setAttribute('aria-label','Open ReFramer Animation Pack 01');
  launch.className='ad-reframer-toggle';panel.append(launch);this.launch=launch;
  const ui=document.createElement('aside');ui.id='reframerAnimLab';ui.hidden=true;ui.setAttribute('aria-label','ReFramer motion preview');
  const title=document.createElement('div');title.className='ad-rf-title';title.textContent=this.phase2Enabled?'REFRAMER · ANIMATION PACK 02':'REFRAMER · ANIMATION PACK 01';ui.append(title);
  const list=document.createElement('div');list.className='ad-rf-grid';
  for(const id of REFRAMER_PACK_IDS){
   const b=document.createElement('button');b.type='button';b.dataset.refmotion=id;
   b.textContent=REFRAMER_PACK01[id].label;
   b.addEventListener('click',()=>{this.play(id,{preview:true,source:'preview-button'});});
   list.append(b);
  }
  ui.append(list);panel.append(ui);this.ui=ui;this.menu=ui;
  launch.addEventListener('click',()=>this.toggleUI());
 }
 toggleUI(force){
  if(!this.ui)return;
  const show=typeof force==='boolean'?force:this.ui.hidden;
  this.ui.hidden=!show;this.launch.setAttribute('aria-expanded',String(show));
  if(!show&&this.preview){this.play('combat_idle');this.preview=false;}
 }
 reset(){
  this.preview=false;this.current=null;this.elapsed=0;this.stageIndex=-1;
  this.stopMotion();if(this.ui)this.ui.hidden=true;
 }
 snapshot(){
  return {current:this.current,elapsed:+this.elapsed.toFixed(3),preview:this.preview,
   sourceClipCount:this.sourceClips.size,rigBoneCount:Object.keys(this.rigBones).length,
   authoredClipCount:this.ownedClips.size,authoredTracks:[...this.ownedClips.values()].reduce((n,c)=>n+c.tracks.length,0),
   shieldVisible:this.shield.visible,trailVisible:this.trails.visible,impactVisible:this.ring.visible,
   history:this.history.slice(),missingImportantBones:REFRAMER_ASSET.importantBones.filter(x=>!this.rigBones[x]),
   phase2Enabled:this.phase2Enabled,upgraded:this.phase2Data?.upgraded||null,
   tumbleAngle:this.phase2Data?.tumbleAngle||0,tumbleOffsetY:this.phase2Data?.tumbleOffsetY||0};
 }
}