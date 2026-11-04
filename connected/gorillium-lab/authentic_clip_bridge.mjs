// Exact-source Gorillium animation routing. No generated anatomy or hit claims.
// This module is independent of Three.js and all live-game saves.
import {CLIPS,TENTACLE_CHAINS} from './gorillium_animation_contract.mjs';
export const ORIGINAL_GORILLIUM_SHA256='8495a8c5e727bf64244a1235e58fb655c4c4cae91ac46e18206e668ae154cd81';
export const ORIGINAL_GORILLIUM_JOINT_COUNT=70;
export const ORIGINAL_GORILLIUM_CLIP_COUNT=31;
export const GORILLIUM_CAST_CLIPS=Object.freeze({
 'tentacle-lash':'Gallium_Whip',
 'galaxy-tether':'Ability_21_Galactic_Tether',
 'octo-shield':'Ability_13_Octo_Shield',
 'crystal-barrage':'Ability_22_Crystal_Barrage',
 'pressure-slam':'Ability_20_Pressure_Reactor',
 'cataclysm':'Ability_24_Galaxy_Gallium_Cataclysm'
});
export const GORILLIUM_TIP_BONES=Object.freeze(TENTACLE_CHAINS.map(c=>c[c.length-1]));
function names(xs){return new Set(Array.isArray(xs)?xs:[]);}
export function verifyOriginalGorillium({sha256,clipNames,boneNames,skinJointNames}={}){
 const c=names(clipNames),b=names(boneNames),j=names(skinJointNames);
 const missingClips=CLIPS.filter(name=>!c.has(name));
 const missingJoints=TENTACLE_CHAINS.flat().filter(name=>!j.has(name));
 const missingTips=GORILLIUM_TIP_BONES.filter(name=>!j.has(name));
 const issues=[];
 if(sha256!==ORIGINAL_GORILLIUM_SHA256)issues.push('source-sha256-mismatch');
 if(c.size!==ORIGINAL_GORILLIUM_CLIP_COUNT||missingClips.length)
  issues.push('31-original-clips-required');
 if(j.size!==ORIGINAL_GORILLIUM_JOINT_COUNT)issues.push('70-skinned-joints-required');
 if(missingJoints.length||missingTips.length)issues.push('eight-five-joint-chains-required');
 if(GORILLIUM_TIP_BONES.some(name=>!b.has(name)))issues.push('missing-tentacle-nodes');
 return {compatible:issues.length===0,issues,sourceVerified:sha256===ORIGINAL_GORILLIUM_SHA256,
  clipsFound:ORIGINAL_GORILLIUM_CLIP_COUNT-missingClips.length,
  jointCount:j.size,completeChains:TENTACLE_CHAINS.filter(chain=>chain.every(n=>j.has(n))).length,
  missingClips,missingJoints,missingTips};
}
export function mapGorilliumCast(event,validation){
 if(!validation?.compatible)return {ok:false,reason:'unverified-original-rig'};
 const clip=GORILLIUM_CAST_CLIPS[event?.ability];
 if(!clip)return {ok:false,reason:'unmapped-ability'};
 if(!Array.isArray(event?.limbIds)||event.limbIds.some(i=>!Number.isInteger(i)||i<0||i>7))
  return {ok:false,reason:'invalid-limb-ids'};
 return {ok:true,clip,ability:event.ability,limbIds:[...event.limbIds],
  targetId:event.targetId??null,
  // markers are preview cues only, not collision or damage proof.
  cues:Object.freeze([{phase:'windup',at:0},{phase:'focus',at:.4},{phase:'recover',at:.82}])};
}
