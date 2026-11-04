/** WIR Connected: exact clip/bone contract for user-uploaded Gorillium GLB.
 * Uploaded asset SHA256: 8495a8c5e727bf64244a1235e58fb655c4c4cae91ac46e18206e668ae154cd81
 * 70 skinned joints, 31 clips, 8x5 tentacle chains. PROPOSAL / PUBLISH HOLD.
 * Pure module, no changes to live mission loading, animation mixer, or saves.
 */
export const CLIPS=Object.freeze([
 'Idle_Gallium_Breath','Silverback_Walk','Lion_Roar','Gorilla_Ground_Slam',
 'Eight_Tentacle_Bloom','Gallium_Whip','Rage_Stance',
 'Ability_01_Kings_Roar','Ability_02_Predator_Vision','Ability_03_Crystalline_Mane',
 'Ability_04_Lions_Pounce','Ability_05_Sonic_Fang','Ability_06_Titan_Knuckles',
 'Ability_07_Groundbreaker','Ability_08_Wallbreaker_Charge',
 'Ability_09_Quadrupedal_Pursuit','Ability_10_Colossus_Grip',
 'Ability_11_Eightfold_Assault','Ability_12_Living_Grapples',
 'Ability_13_Octo_Shield','Ability_14_Eight_Armed_Outlaw',
 'Ability_15_Tentacle_Locomotion','Ability_16_Distributed_Awareness',
 'Ability_17_Liquid_Metal_Morph','Ability_18_Density_Shift',
 'Ability_19_Gallium_Regeneration','Ability_20_Pressure_Reactor',
 'Ability_21_Galactic_Tether','Ability_22_Crystal_Barrage',
 'Ability_23_Primal_Overdrive','Ability_24_Galaxy_Gallium_Cataclysm'
]);
export const ABILITIES=Object.freeze(CLIPS.slice(7));
export const TENTACLE_CHAINS=Object.freeze(Array.from({length:8},(_,i)=>
 Object.freeze(Array.from({length:5},(_,j)=>`Tentacle_${String(i+1).padStart(2,'0')}_${String(j).padStart(2,'0')}`))));
export const REQUIRED_BONES=Object.freeze(['Root','Hips','Spine','Chest','Head',
 'LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot',
 ...TENTACLE_CHAINS.flat()]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function inspectSourceRig(clipNames,boneNames){
 const c=new Set(clipNames),b=new Set(boneNames);
 const missingClips=CLIPS.filter(x=>!c.has(x)),missingBones=REQUIRED_BONES.filter(x=>!b.has(x));
 return {compatible:missingClips.length===0&&missingBones.length===0,
  foundClips:CLIPS.length-missingClips.length,expectedClips:CLIPS.length,
  completeTentacles:TENTACLE_CHAINS.filter(chain=>chain.every(n=>b.has(n))).length,
  missingClips,missingBones};
}
/** Independent animation INTENT, not a physics engine or a retargeted skin. */
export class MotionIntent{
 constructor(){this.speed=0;this.walk=0;this.turn=0;this.landing=0;
  this.grounded=true;this.action=null;this.actionAge=0;this.elapsed=0;this.mode='flow';}
 trigger(clip){if(!CLIPS.includes(clip))return false;this.action=clip;this.actionAge=0;return true;}
 tentacleMode(mode){if(!['flow','reach','brace'].includes(mode))return false;this.mode=mode;return true;}
 step(dt,{speed=0,grounded=true,turnRate=0,landingSpeed=0}={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.06);speed=Math.max(0,Number.isFinite(speed)?speed:0);
  this.elapsed+=dt;const e=1-Math.exp(-8*dt);this.speed+=(speed-this.speed)*e;
  this.walk+=(clamp(this.speed/3.4,0,1)-this.walk)*e;
  this.turn+=(clamp(turnRate,-3,3)-this.turn)*(1-Math.exp(-5*dt));
  if(!this.grounded&&grounded)this.landing=clamp(landingSpeed/15,.15,1);
  this.landing=Math.max(0,this.landing-dt*2.3);this.grounded=grounded;
  if(this.action){this.actionAge+=dt;if(this.actionAge>1.5){this.action=null;this.actionAge=0;}}
  return {active:this.action||(!grounded?'Ability_04_Lions_Pounce':this.walk>.18?'Silverback_Walk':'Idle_Gallium_Breath'),
   walkWeight:this.walk,turn:this.turn,landing:this.landing,tentacleMode:this.mode,actionLocked:!!this.action};
 }
}
