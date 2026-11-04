// ReFramer Animation Pack 01 | verified WIR GLB rig; no imported or redistributed media.
// Stacked on WIR Connected rooftop-duel PR #34; PROPOSAL / PUBLISH HOLD.
export const REFRAMER_ASSET=Object.freeze({
 path:'connected/assets/models/rival_sparring_hero.glb',
 gitBlob:'9471879c0fdbaf2aed65d8c239228b07cafcd354',
 boneCount:65,skinnedMeshes:3,uniqueClips:21,source:'2026-11-04 real local Chromium rig inspection',
 importantBones:['spine_02','spine_03','clavicle_l','clavicle_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r','thigh_r','calf_r','pelvis']
});
export const REFRAMER_SOURCE_CLIPS=Object.freeze({
 Idle:'Idle_Loop',Jab:'Punch_Jab',Cross:'Punch_Cross',Hook:'Melee_Hook',
 Guard:'Idle_Shield_Loop',Dash:'Shield_Dash',Knock:'Hit_Knockback',
 Roll:'Roll',GetUp:'LayToIdle',KickR:'m_kick_r',KickL:'m_kick_l',
 HitChest:'Hit_Chest'
});
export const REFRAMER_PACK01=Object.freeze({
 combat_idle:{label:'Combat Idle',duration:2.5,loop:true,stages:[[0,'Idle',1]],authored:'breathing and guard-microposes',pending:'reactive eye tracking and dedicated ReFramer stance',
  bones:{spine_02:[.05,0,.025],upperarm_l:[-.07,0,.05],upperarm_r:[-.07,0,-.05],hand_l:[-.12,0,0],hand_r:[-.12,0,0]}},
 melee_three:{label:'Three-Hit Combination',duration:1.26,stages:[[0,'Jab',2.25],[.40,'Cross',2.35],[.84,'Hook',1.6]],authored:'original cross-fade choreography and torso torque',pending:'fully authored three-hit contact and synced opponent reactions',
  bones:{spine_02:[-.13,.3,0],spine_03:[-.12,-.15,0],clavicle_r:[-.18,0,.08],clavicle_l:[-.1,0,-.08]}},
 uppercut_launcher:{label:'Uppercut Launcher',duration:.83,stages:[[0,'Cross',1.85]],authored:'new upperarm, forearm, spine and clavicle quaternion keyframes',pending:'full-body uppercut with planted feet, hip drive and contact',
  bones:{spine_02:[-.26,0,.09],spine_03:[-.17,0,0],upperarm_r:[-.96,.24,-.10],lowerarm_r:[-.55,0,.08],clavicle_r:[-.2,0,-.12],thigh_r:[.18,0,0]}},
 aerial_pursuit:{label:'High-Speed Air Pursuit',duration:.92,stages:[[0,'Dash',1.6]],authored:'original aerodynamic upper-body motion and teal afterimages',pending:'authored takeoff, air braking, directional flight turns and full-body blend',
  bones:{spine_02:[.34,0,0],spine_03:[.17,0,0],upperarm_r:[.65,0,-.25],upperarm_l:[.65,0,.25],thigh_r:[-.15,0,0]}},
 airborne_tumble:{label:'Airborne Stagger & Tumble',duration:1.45,stages:[[0,'Knock',1.2],[.60,'Roll',1.8]],authored:'spine, pelvis, shoulder and thigh keyframes plus real knockback and roll clips',pending:'root-motion 360-degree aerial tumble with center-of-mass and impact alignment',
  bones:{pelvis:[.42,0,.23],spine_02:[.52,.16,.40],spine_03:[.34,.20,.33],upperarm_l:[.4,0,-.42],upperarm_r:[.4,0,.42],thigh_r:[.35,0,0]}},
 rooftop_recovery:{label:'Rooftop Collision & Recovery',duration:2.2,stages:[[0,'Knock',1.45],[.55,'GetUp',1.15]],authored:'collision recoil, guarded recovery and transient roof impact ring',pending:'foot-locked recovery, custom concrete-contact hand/shoulder frames',
  bones:{spine_02:[.35,0,-.12],upperarm_l:[.4,0,-.22],upperarm_r:[.4,0,.22],calf_r:[-.26,0,0]}},
 shield_formation:{label:'Structural-Metal Shield Formation',duration:1.45,stages:[[0,'Guard',1]],authored:'hand/clavicle formation keys and five detachable steel plates',pending:'finger-grasp IK, construct-to-hand binding and defended hitbox timing',
  bones:{spine_02:[-.1,0,0],upperarm_l:[-.45,.10,-.16],upperarm_r:[-.45,-.10,.16],lowerarm_l:[-.38,0,-.15],lowerarm_r:[-.38,0,.15],hand_l:[-.25,0,0],hand_r:[-.25,0,0]}},
 aerial_counter:{label:'Aerial Counterattack',duration:1.08,stages:[[0,'Dash',2],[.40,'KickR',1.65]],authored:'dash-to-strike timing, turn and original leg/arm keyframes',pending:'enemy air-counter hit detection, authored anticipation and recovery',
  bones:{pelvis:[0,.36,.15],spine_02:[-.2,-.45,.10],upperarm_r:[-.42,0,.24],upperarm_l:[.42,0,-.22],thigh_r:[-.8,0,.15],calf_r:[.5,0,0]}}
});
export const REFRAMER_PACK_IDS=Object.freeze(Object.keys(REFRAMER_PACK01));
export function pack01Timing(id,elapsed){
 const spec=REFRAMER_PACK01[id];if(!spec)throw Error('Unknown ReFramer motion '+id);
 const t=Math.max(0,Number.isFinite(elapsed)?elapsed:0),d=spec.duration;
 return {progress:Math.min(1,t/d),stage:spec.stages.reduce((last,stage)=>t>=stage[0]?stage:last,spec.stages[0]),
   finished:!spec.loop&&t>=d};
}
export function selectReframerEventMotion(event){
 return ({'reframer-telegraph':'shield_formation','reframer-strike':'melee_three',
  'launch':'airborne_tumble','aerial-finisher':'airborne_tumble',
  'roof-floor-impact':'rooftop_recovery','roof-wall-impact':'rooftop_recovery',
  'perfect-evade':'aerial_counter'})[event]||null;
}
