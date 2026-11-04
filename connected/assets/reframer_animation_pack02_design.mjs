// ReFramer Animation Pack 02: ORIGINAL keyed poses on the verified 65-bone rival rig.
// Angular channels are Euler degrees relative to each bone's additive identity.
// No copied mocap, alternate skeleton, destructible geometry or story-state storage.
export const PACK02_SCENES=Object.freeze({
 uppercut_launcher:{
  duration:.83,phases:[0,.11,.27,.51,.76,1],
  purpose:'coil, hip preload, shoulder drive, rising fist, controlled follow-through, settle',
  channels:{
   pelvis:[[0,-.42,-1,.95,.20,0],[-8,4,3]],
   spine_01:[[0,-.65,-1,.75,.15,0],[-12,2,3]],
   spine_02:[[0,-.7,-1,1,.25,0],[-18,-2,3]],
   spine_03:[[0,-.3,-.8,.95,.30,0],[-11,4,-3]],
   clavicle_r:[[0,-.2,-.5,1,.45,0],[-20,10,-12]],
   clavicle_l:[[0,.5,.6,-.2,-.1,0],[9,-9,8]],
   upperarm_r:[[0,.12,.3,1,.62,0],[-72,12,-18]],
   lowerarm_r:[[0,-.20,-.52,1,.30,0],[-49,-3,7]],
   hand_r:[[0,-.5,-.2,.75,.45,0],[-24,0,0]],
   upperarm_l:[[0,.45,.7,-.6,-.1,0],[-19,-12,10]],
   thigh_l:[[0,.6,1,-.58,-.2,0],[22,-3,0]],
   thigh_r:[[0,.5,.94,-.65,-.25,0],[18,2,0]],
   calf_l:[[0,-.3,-.68,.27,.1,0],[21,0,0]],
   calf_r:[[0,-.6,-1,.4,.14,0],[24,0,0]],
   foot_l:[[0,.2,.65,-.35,-.1,0],[-9,0,0]],
   foot_r:[[0,.2,.65,-.42,-.1,0],[-10,0,0]],
   neck_01:[[0,-.18,-.42,.55,.22,0],[-9,0,0]]
  }
 },
 airborne_tumble:{
  duration:1.45,phases:[0,.13,.34,.55,.78,1],
  purpose:'impact, guard tuck, hip/torso roll, leg recovery, open limbs, neutral',
  channels:{
   pelvis:[[0,.20,.66,1,.58,0],[17,-10,22]],
   spine_01:[[0,.42,.86,1,.44,0],[27,11,22]],
   spine_02:[[0,.48,1,.87,.36,0],[35,-14,24]],
   spine_03:[[0,.36,.92,.68,.2,0],[22,18,29]],
   neck_01:[[0,-.25,-.62,.1,.12,0],[18,0,-6]],
   clavicle_l:[[0,-.35,-1,.62,.22,0],[19,8,-25]],
   clavicle_r:[[0,-.4,-1,.56,.2,0],[21,-8,27]],
   upperarm_l:[[0,.35,.86,-.43,-.35,0],[37,-8,-32]],
   upperarm_r:[[0,.37,.9,-.48,-.3,0],[39,8,31]],
   lowerarm_l:[[0,.50,1,-.44,-.25,0],[28,0,-6]],
   lowerarm_r:[[0,.53,1,-.41,-.23,0],[31,0,6]],
   thigh_l:[[0,.5,1,-.58,-.12,0],[38,-6,14]],
   thigh_r:[[0,.42,1,-.62,-.18,0],[44,6,-13]],
   calf_l:[[0,-.2,-.85,.35,.17,0],[42,0,0]],
   calf_r:[[0,-.25,-.90,.4,.2,0],[47,0,0]],
   hand_l:[[0,.22,.72,-.34,-.1,0],[14,0,8]],
   hand_r:[[0,.22,.72,-.34,-.1,0],[14,0,-8]]
  }
 },
 aerial_counter:{
  duration:1.08,phases:[0,.15,.36,.57,.76,1],
  purpose:'read attack, shoulder guard, pivot, kick/forearm contact, brake, neutral',
  channels:{
   pelvis:[[0,.20,.45,1,.58,0],[5,28,13]],
   spine_01:[[0,-.24,-.62,1,.38,0],[-10,-22,7]],
   spine_02:[[0,-.38,-.75,1,.26,0],[-16,-29,12]],
   spine_03:[[0,-.30,-.72,.96,.2,0],[-12,-13,-8]],
   neck_01:[[0,-.26,-.50,.72,.3,0],[4,12,-7]],
   clavicle_r:[[0,.54,.82,-.55,-.3,0],[-14,4,-16]],
   upperarm_r:[[0,.5,.90,-.6,-.2,0],[-30,4,28]],
   lowerarm_r:[[0,.34,.85,-.54,-.17,0],[-48,0,10]],
   clavicle_l:[[0,.16,.51,-.35,-.2,0],[-10,1,12]],
   upperarm_l:[[0,.35,.73,-.4,-.15,0],[24,-5,-17]],
   thigh_r:[[0,.31,.60,1,.57,0],[-74,10,16]],
   calf_r:[[0,-.18,-.55,1,.40,0],[44,0,-5]],
   foot_r:[[0,-.17,-.55,.98,.42,0],[-19,0,0]],
   thigh_l:[[0,.48,.78,-.38,-.18,0],[21,0,-8]],
   calf_l:[[0,-.25,-.62,.24,.1,0],[14,0,0]],
   hand_r:[[0,.24,.65,-.5,-.2,0],[15,-3,0]]
  }
 }
});
export const PACK02_MOTION_IDS=Object.freeze(Object.keys(PACK02_SCENES));
export const PACK02_COUNTER=Object.freeze({windup:.48,range:3.35,damage:.105,knockback:6,stun:.28});
export function pack02Timing(id,t){
 const spec=PACK02_SCENES[id];
 if(!spec)throw Error('Unknown ReFramer Pack 02 motion: '+id);
 const elapsed=Number.isFinite(t)?Math.max(0,t):0;
 return {progress:Math.min(1,elapsed/spec.duration),finished:elapsed>=spec.duration};
}
export function smooth01(t){const x=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));return x*x*(3-2*x);}
export function tumbleAngle(progress){return smooth01(progress)*Math.PI*2;}
export function pack02PoseFrames(id,bone){
 const spec=PACK02_SCENES[id],ch=spec?.channels[bone];
 if(!ch)throw Error('Missing authored bone channel: '+id+' '+bone);
 const [weights,angles]=ch;
 return {times:spec.phases.map(t=>t*spec.duration),eulers:weights.map(w=>angles.map(a=>a*w*Math.PI/180))};
}
