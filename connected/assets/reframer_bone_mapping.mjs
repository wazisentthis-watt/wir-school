// WIR private asset-input pilot | source-to-ReFramer bones | PROPOSAL/HOLD.
// Maps only animation rotation deltas; never target root translation, original clips or saves.
export const SOURCE_TARGET_BONES=Object.freeze([
 ['Hips','pelvis'],['Abdomen','spine_01'],['Torso','spine_02'],['Chest','spine_03'],
 ['Neck','neck_01'],['Head','Head'],['ShoulderL','clavicle_l'],['ShoulderR','clavicle_r'],
 ['UpperArmL','upperarm_l'],['UpperArmR','upperarm_r'],
 ['LowerArmL','lowerarm_l'],['LowerArmR','lowerarm_r'],
 ['WristL','hand_l'],['WristR','hand_r'],['HandL','hand_l'],['HandR','hand_r'],
 ['UpperLegL','thigh_l'],['UpperLegR','thigh_r'],
 ['LowerLegL','calf_l'],['LowerLegR','calf_r'],
 ['FootL','foot_l'],['FootR','foot_r']
]);
export const UPLOADED_SOURCE_MANIFEST=Object.freeze({
 Soldier:{filename:'Soldier.glb',bytes:2802536,sha256:'8b3ecad9edfe10bc663cb9f8317603d9fc7952c6f95b90a9be92752aa0a37e0f',skins:11,joints:62,clips:24},
 Character:{filename:'Character.glb',bytes:1241016,sha256:'cefe2ff8b8e49607bb7e7349862a10e29a63c69eeabc1c939330cb8cb8f90301',skins:10,joints:25,clips:22}
});
export const SUPPORTED_CLIPS=Object.freeze(['Punch_Left','Punch_Right','Kick_Left','Kick_Right','Roll','HitRecieve','HitRecieve_2','Idle_Neutral']);
export function normalizeSourceNames(names){
 return Object.fromEntries((names||[]).map(n=>[String(n).toLowerCase(),String(n)]));
}
export function compatibleBonePairs(sourceNames,targetNames){
 const src=normalizeSourceNames(sourceNames),dest=normalizeSourceNames(targetNames),targets=new Set(),list=[];
 for(const [from,to] of SOURCE_TARGET_BONES){
  const a=src[from.toLowerCase()],b=dest[to.toLowerCase()];
  if(!a||!b||targets.has(b))continue;
  targets.add(b);list.push({source:a,target:b});
 }
 return list;
}
export function evaluateRetargetCoverage(sourceNames,targetNames,animations){
 const pairs=compatibleBonePairs(sourceNames,targetNames),names=new Set((animations||[]).map(a=>a.name));
 const essential=['pelvis','spine_02','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','thigh_l','thigh_r','calf_l','calf_r'];
 const missing=essential.filter(name=>!pairs.some(p=>p.target===name));
 const available=SUPPORTED_CLIPS.filter(name=>names.has(name));
 return {pairs,missing,available,ok:missing.length===0&&available.length>=4,
  coverage:Math.round(pairs.length/SOURCE_TARGET_BONES.length*100)};
}
export function safeRetargetBlend(v){return Math.max(0,Math.min(.65,Number.isFinite(v)?v:0));}
