// WIR experimental local ReFramer retarget + CCDIK + BVH comparison.
// Opt-in ?aerial_duel=1&reframer_ik=1; NEVER used in normal Savannah.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CCDIKSolver} from './lib/addons/animation/CCDIKSolver.js';
import {SOURCE_TARGET_BONES,compatibleBonePairs,evaluateRetargetCoverage} from './reframer_bone_mapping.mjs';
const pos=o=>o.getWorldPosition(new THREE.Vector3());
const rot=o=>o.getWorldQuaternion(new THREE.Quaternion());
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function boneMap(root){const map=new Map();root.traverse(o=>{if(o.isBone)map.set(o.name,o);});return map;}
function createChain(upper,effector){
 const lower=effector?.parent;
 if(!upper?.isBone||!lower?.isBone||lower.parent!==upper)return null;
 const root=new THREE.Group(),anchor=new THREE.Bone(),a=new THREE.Bone(),b=new THREE.Bone(),c=new THREE.Bone(),target=new THREE.Bone();
 root.add(anchor,target);anchor.add(a);a.add(b);b.add(c);
 const solver=new CCDIKSolver({skeleton:{bones:[target,c,b,a]}},[
  {target:0,effector:1,links:[{index:2},{index:3}],iteration:3,maxAngle:.075}
 ]);
 return {root,anchor,a,b,c,target,solver,upper,lower,effector};
}
function applyIK(ch,goal,weight){
 const {root,anchor,a,b,c,target,solver,upper,lower,effector}=ch;
 upper.parent.updateWorldMatrix(true,false);
 upper.parent.matrixWorld.decompose(anchor.position,anchor.quaternion,anchor.scale);
 for(const [clone,bone] of [[a,upper],[b,lower],[c,effector]]){
  clone.position.copy(bone.position);clone.quaternion.copy(bone.quaternion);clone.scale.copy(bone.scale);
 }
 target.position.copy(goal);root.updateMatrixWorld(true);
 solver.update();
 upper.quaternion.slerp(a.quaternion,weight);lower.quaternion.slerp(b.quaternion,weight);
 upper.updateWorldMatrix(true,true);
}
export class ReframerAssetIKPilot{
 constructor(duel){
  this.duel=duel;this.live=false;this.footIK=true;this.handIK=false;
  this.source=null;this.sourceBones=new Map();this.targetBones=new Map();this.pairs=[];
  this.sourceMixer=null;this.actions=new Map();this.clip='';
  this.loaded=null;this.ui=null;this.error='';this.sourceFrameCount=0;this.footFrames=0;this.handFrames=0;
  this.bvhReport=null;this.bvhStatus='not installed';this.savedRaycast=null;
  this.chains=new Map();
  const start=duel.start.bind(duel),stop=duel.stop.bind(duel),update=duel.update.bind(duel);
  duel.start=(...args)=>{const ok=start(...args);if(ok)this.enter();return ok;};
  duel.stop=(...args)=>{this.exit();return stop(...args);};
  duel.update=dt=>{update(dt);if(duel.active)this.tick(dt);};
 }
 makeUI(){
  const container=document.createElement('section');container.id='wirReframerAssetPilot';
  const heading=document.createElement('strong');heading.textContent='REFRAMER · PRIVATE MOTION / IK / BVH';container.append(heading);
  const input=document.createElement('input');input.id='wirReframerLocalGLB';input.type='file';input.accept='.glb';input.setAttribute('aria-label','Select local Soldier or Character GLB');container.append(input);
  const select=document.createElement('select');select.id='wirReframerSourceClip';select.setAttribute('aria-label','Source motion clip');container.append(select);
  const actions=document.createElement('div');actions.className='wir-ik-actions';
  const options=[['foot','FOOT IK',()=>{this.footIK=!this.footIK;}],['hand','HAND CONTACT',()=>{this.handIK=!this.handIK;}],['bvh','BVH COMPARE',()=>this.compareBVH()],['reset','CLEAR MOTION',()=>this.clearMotion()]];
  for(const [id,label,fn] of options){const btn=document.createElement('button');btn.type='button';btn.id='wirIk'+id;btn.textContent=label;btn.onclick=()=>{fn();this.status();};actions.append(btn);}
  container.append(actions);
  const output=document.createElement('output');output.id='wirReframerIKResult';output.setAttribute('aria-live','polite');container.append(output);
  this.duel.panel.append(container);this.ui={container,input,select,output};
  input.addEventListener('change',async()=>{try{if(input.files?.[0])await this.ingestFile(input.files[0]);}catch(err){this.error=String(err);this.status();}});
  select.onchange=()=>this.chooseClip(select.value);this.status();
 }
 enter(){this.live=true;this.targetBones=boneMap(this.duel.enemy.model);this.chains.clear();
  if(!this.ui)this.makeUI();this.ui.container.hidden=false;if(this.source)this.linkBones();this.status();
 }
 exit(){this.live=false;this.clearMotion();this.restoreBVH();if(this.ui)this.ui.container.hidden=true;}
 clearMotion(){this.sourceMixer?.stopAllAction();this.clip='';this.chains.clear();this.status();}
 async ingestFile(file){
  if(!file?.name?.toLowerCase().endsWith('.glb')||file.size>16*1024*1024)throw Error('Choose an offline GLB under 16 MB');
  const contents=await file.arrayBuffer(),gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(contents,'',resolve,reject));
  const bones=boneMap(gltf.scene),coverage=evaluateRetargetCoverage([...bones.keys()],[...this.targetBones.keys()],gltf.animations);
  if(!coverage.ok)throw Error('Rig incompatible: missing '+coverage.missing.join(', '));
  this.sourceMixer?.stopAllAction();this.source=gltf;this.sourceBones=bones;this.sourceMixer=new THREE.AnimationMixer(gltf.scene);
  this.actions=new Map(gltf.animations.map(c=>[c.name,this.sourceMixer.clipAction(c)]));
  this.loaded={name:file.name,bytes:file.size,sourceBones:bones.size,sourceClips:gltf.animations.length,mappedBones:coverage.pairs.length,available:coverage.available};
  this.linkBones();this.ui.select.replaceChildren();
  for(const name of coverage.available){const o=document.createElement('option');o.textContent=name;o.value=name;this.ui.select.append(o);}
  this.chooseClip(coverage.available[0]);this.error='';this.status();return this.loaded;
 }
 linkBones(){
  this.source.scene.updateMatrixWorld(true);this.duel.enemy.model.updateMatrixWorld(true);
  this.pairs=compatibleBonePairs([...this.sourceBones.keys()],[...this.targetBones.keys()]).map(p=>{
   const s=this.sourceBones.get(p.source),t=this.targetBones.get(p.target);
   return {s,t,sRest:s.quaternion.clone(),sParent:rot(s.parent),tParent:rot(t.parent)};
  });
 }
 // Source-pose diagnostic only, using small rotation samples extracted from the user's
 // actual uploads. This cannot replace full File-based motion playback.
 applyUploadedSample(channels){
  if(!this.live||!channels)return {applied:0,meanAngle:0};
  let applied=0,sum=0;
  for(const [src,frame] of Object.entries(channels)){
   const mapping=SOURCE_TARGET_BONES.find(pair=>pair[0]===src);
   const target=mapping&&this.targetBones.get(mapping[1]);if(!target)continue;
   if(frame.rest?.length!==4||frame.key?.length!==4)continue;
   const q0=new THREE.Quaternion().fromArray(frame.rest).normalize();
   const q1=new THREE.Quaternion().fromArray(frame.key).normalize();
   const delta=q1.multiply(q0.invert()).normalize();
   const angle=2*Math.acos(clamp(Math.abs(delta.w),0,1));
   if(!Number.isFinite(angle))continue;
   const before=target.quaternion.clone(),desired=delta.multiply(before.clone());
   target.quaternion.slerp(desired,.23);
   sum+=before.angleTo(target.quaternion);applied++;
  }
  return {applied,meanAngle:applied?sum/applied:0,diagnosticOnly:true};
 }
 chooseClip(name){const action=this.actions.get(name);if(!action)return false;
  this.sourceMixer.stopAllAction();action.reset().play();this.clip=name;this.status();return true;}
 transfer(dt){
  if(!this.sourceMixer||!this.clip)return;
  this.sourceMixer.update(dt);
  const inv=new THREE.Quaternion(),local=new THREE.Quaternion(),converted=new THREE.Quaternion();
  for(const p of this.pairs){
   local.copy(p.s.quaternion).multiply(inv.copy(p.sRest).invert());
   converted.copy(p.sParent).multiply(local).multiply(inv.copy(p.sParent).invert());
   converted.premultiply(inv.copy(p.tParent).invert()).multiply(p.tParent);
   p.t.quaternion.slerp(converted.multiply(p.t.quaternion.clone()),.23);
  }
  this.sourceFrameCount++;
 }
 runIK(){
  const enemy=this.duel.enemy;if(!enemy?.model)return;enemy.o.updateWorldMatrix(true,true);
  if(this.footIK&&this.duel.state?.enemy.y<.08){
   for(const side of ['l','r']){
    const upper=this.targetBones.get('thigh_'+side),foot=this.targetBones.get('foot_'+side);
    const id='foot_'+side,chain=this.chains.get(id)||createChain(upper,foot);if(!chain)continue;
    this.chains.set(id,chain);
    const footWorld=pos(foot),y=this.duel.origin.y;if(Math.abs(y-footWorld.y)>.55)continue;
    const goal=footWorld.clone();goal.y+=clamp(y+.02-footWorld.y,-.20,.20);
    applyIK(chain,goal,.2);this.footFrames++;
   }
  }
  if(this.handIK){
   for(const side of ['l','r']){
    const upper=this.targetBones.get('upperarm_'+side),hand=this.targetBones.get('hand_'+side);
    const id='hand_'+side,chain=this.chains.get(id)||createChain(upper,hand);if(!chain)continue;
    this.chains.set(id,chain);
    const current=pos(hand),goal=enemy.o.localToWorld(new THREE.Vector3(side==='l'?.48:-.48,1.32,.74));
    goal.sub(current).clampLength(0,.23).add(current);
    applyIK(chain,goal,.17);this.handFrames++;
   }
  }
 }
 async compareBVH(){
  const floor=this.duel.roof?.children.find(x=>x.isMesh);
  if(!floor||!this.live){this.bvhStatus='enter training first';this.status();return null;}
  try{
   const {MeshBVH,acceleratedRaycast}=await import('./experimental/three-mesh-bvh.module.js');
   floor.geometry.boundsTree=new MeshBVH(floor.geometry);this.savedRaycast=floor.raycast;
   this.duel.roof.updateMatrixWorld(true,true);
   const ray=new THREE.Raycaster(new THREE.Vector3(this.duel.origin.x,this.duel.origin.y+8,this.duel.origin.z),new THREE.Vector3(0,-1,0));
   const bench=(fn)=>{floor.raycast=fn;const start=performance.now();let intersections=[];
    for(let i=0;i<120;i++)intersections=ray.intersectObject(floor,false);
    return {milliseconds:performance.now()-start,distance:intersections[0]?.distance??null};};
   const baseline=bench(this.savedRaycast),bvh=bench(acceleratedRaycast);
   floor.raycast=this.savedRaycast;
   const equivalent=baseline.distance!==null&&bvh.distance!==null&&Math.abs(baseline.distance-bvh.distance)<.0001;
   this.bvhStatus=equivalent?'PASS':'mismatched intersections';
   this.bvhReport={baseline,bvh,equivalent,samples:120,physicsModified:false};
  }catch(err){this.bvhStatus='fallback: '+String(err).slice(0,90);this.bvhReport=null;}
  this.status();return this.bvhReport;
 }
 restoreBVH(){const floor=this.duel.roof?.children.find(x=>x.isMesh);
  if(floor&&this.savedRaycast){floor.raycast=this.savedRaycast;delete floor.geometry.boundsTree;}
  this.savedRaycast=null;
 }
 tick(dt){if(!this.live)return;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
  this.transfer(dt);this.runIK();}
 status(){if(!this.ui)return;
  this.ui.output.textContent=(this.loaded?.name||'No local GLB')+
   ' | foot IK '+(this.footIK?'on':'off')+' | hand IK '+(this.handIK?'on':'off')+
   ' | BVH '+this.bvhStatus+(this.error?' | '+this.error:'');
 }
 snapshot(){return {active:this.live,localSource:this.loaded,clip:this.clip,mapped:this.pairs.length,
  footIK:this.footIK,handIK:this.handIK,footFrames:this.footFrames,handFrames:this.handFrames,sourceFrames:this.sourceFrameCount,
  bvhStatus:this.bvhStatus,bvhReport:this.bvhReport,duelPhysics:this.duel.state?.enemy?{
   x:this.duel.state.enemy.x,y:this.duel.state.enemy.y,z:this.duel.state.enemy.z}:null};}
}
export function attachReframerAssetIKPilot(duel){
 const pilot=new ReframerAssetIKPilot(duel);
 // Keep private GLB bytes local to File input; do not send to repository.
 return pilot;
}