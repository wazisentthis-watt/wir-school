// Original additive rig performance for Galaxy Gallium board forging.
// PROPOSAL/PUBLISH HOLD. No imported FBX, new mixer, transform saving or knee constraints.
// Applied AFTER game's existing AnimationMixer evaluation; restored BEFORE next evaluation.
import * as THREE from 'three';
import {forgePerformancePose} from './metal_forge_pose.mjs';
const SIDE_L=/(?:left|(?:upperarm|lowerarm|forearm|arm|hand|shoulder)l$|\.l$|_l$)/;
const SIDE_R=/(?:right|(?:upperarm|lowerarm|forearm|arm|hand|shoulder)r$|\.r$|_r$)/;
function boneRole(name){
 const normal=String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const side=SIDE_L.test(normal)?'left':SIDE_R.test(normal)?'right':null;
 if((normal.includes('forearm')||normal.includes('lowerarm'))&&side)return side+'Forearm';
 if((normal.includes('upperarm')||/arm[lr]$/.test(normal))&&side)return side+'Upperarm';
 if(normal.includes('chest')||/spine[23]?$/.test(normal))return 'chest';
 if(normal.includes('neck')||/head$/.test(normal))return 'head';
 return null;
}
const ROTATIONS=Object.freeze({
 chest:{x:p=>.08*p.scan+.21*p.reach+.06*p.gather-.06*p.seal, z:p=>.025*p.gather},
 head:{x:p=>.10*p.scan+.06*p.reach-.04*p.seal,z:()=>0},
 leftUpperarm:{x:p=>-.19*p.reach-.31*p.gather-.23*p.press+.08*p.mount,z:p=>-.12*p.gather+.04*p.seal},
 rightUpperarm:{x:p=>-.30*p.reach-.39*p.gather-.35*p.press-.16*p.seal,z:p=>.14*p.gather-.06*p.seal},
 leftForearm:{x:p=>-.10*p.reach-.20*p.press,z:()=>0},
 rightForearm:{x:p=>-.10*p.reach-.21*p.press-.08*p.seal,z:()=>0}
});
const X=new THREE.Vector3(1,0,0),Z=new THREE.Vector3(0,0,1);
export class ForgePerformanceOverlay{
 constructor(){this.model=null;this.nodes=new Map();this.saved=[];this.last={phase:'IDLE',elapsed:0,active:false,appliedBones:0,availableBones:0,roles:[]};}
 bind(model){
  this.restore();this.model=model||null;this.nodes.clear();
  if(!model)return;
  model.traverse(node=>{
   if(!node.isBone)return;
   const role=boneRole(node.name);
   if(role&&!this.nodes.has(role))this.nodes.set(role,node);
  });
 }
 restore(){
  for(const entry of this.saved)entry.bone.quaternion.copy(entry.base);
  this.saved.length=0;
 }
 beforeMixer(){this.restore();}
 afterMixer(model,state){
  if(model!==this.model)this.bind(model);
  const phase=state?.phase||'IDLE',elapsed=Number(state?.elapsed)||0;
  const pose=forgePerformancePose(phase,elapsed);
  let applied=0;
  if(pose.weight>.001){
   for(const [role,bone] of this.nodes){
    const cfg=ROTATIONS[role];if(!cfg)continue;
    const ax=cfg.x(pose),az=cfg.z(pose);
    if(Math.abs(ax)+Math.abs(az)<.001)continue;
    this.saved.push({bone,base:bone.quaternion.clone()});
    bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(X,ax));
    if(Math.abs(az)>.001)bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Z,az));
    applied++;
   }
  }
  this.last={phase,elapsed,active:applied>0,appliedBones:applied,availableBones:this.nodes.size,
    roles:[...this.nodes.keys()],cues:{scan:pose.scan,reach:pose.reach,gather:pose.gather,press:pose.press,seal:pose.seal,mount:pose.mount}};
 }
 snapshot(){return {...this.last};}
}
