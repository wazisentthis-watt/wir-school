// WIR METAL • Complete 73-entry source registry, not 73 fabricated gameplay claims.
// Source: owner-supplied "METAL IN DA RIFFT: Complete Power Registry" (Nov 2026).
// Never confuse catalog presence, implemented mechanics, and approved story canon.
const GROUPS=[
 {id:'neural',label:'Neurological and Human',end:10},
 {id:'gallium',label:'Galaxy Gallium Engineering',end:30},
 {id:'skate',label:'Skating and Momentum',end:45},
 {id:'combat',label:'Combat and Energy',end:56},
 {id:'forms',label:'Forms and Experimental Chemistry',end:73}
];
const NAMES=[
'Snap','Snap Step','Snap Storm','Pressure Reading','Structural Intelligence','Resonance Recognition',
'Advanced Reflex Coordination','Rhythm-Based Movement','Engineering Intelligence','Elite Human Athletics',
'Liquid-to-Solid Phase Shifting','Adaptive Armor','RIFFT Up','Heavy Crown','Gallium Tendrils',
'Octo Brace','Adaptive Alloy','Structural Reinforcement','Gallium Shields','Gallium Tools',
'Gallium Ramps','Gallium Rails','Material Reclamation','Conductive Networks','Electromagnetic Interaction',
'Thermal Response','Expansion and Contraction','Material Memory','Gallium Sensory Structures','Board Integration',
'G-Lift','Galaxy Ollie','Heavy Halo','Gallium Gallop','Heavy Metal Route','Snapline','Load Anchors',
'Skyrails','Wall Riding','Gallium Tether','Pendulum Swinging','Octopus Drive','Crown Route Marking',
'Controlled Recoil','RIFFT-Up Stomp / Heavy Drop',
'Gallium Grappling','Material Reshaping','Heavy Impact','Starflash Counter','Resonance Rail',
'Electrical Charge Manipulation','Merkaba Charge-Up','Metal Stream','Combat Adaptation','RIFFT Interface',
'Advanced Route Compression',
'Gorillium / Galaxy RIFFT Beast','Lion Metal','Star Merkaba','Crown Shift','External Merkaba Lion',
'Six-Arm Octopus Combat','Gorilla Load Strength','Lion Crown Instinct','Broken Chord Resonance',
'Galaxy Tendril Network','Gallium Reconstruction','Crown Dominion',
'Nitrogen-linked Chemistry','Phosphorus-linked Chemistry','Stellar/Photonic Signatures',
'Closed Palm Route','Advanced RIFFT Flight'
];
if(NAMES.length!==73)throw Error('Power registry incomplete');
// Source-verified mechanics implemented in this opt-in laboratory only.
// Similar named features elsewhere in WIR Connected are not treated as complete
// without specific scene-level, rig, save and hardware evidence.
const LAB=new Map([[2,'snap-step'],[4,'pressure-read'],[5,'pressure-read'],[12,'adaptive-armor'],
  [11,'build-panel'],[18,'reinforce'],[20,'build-panel'],[23,'reclaim'],
  [29,'pressure-read']]);
const EXISTING=new Map([[13,'form-switch-prototype'],[15,'existing-grapple'],
  [21,'temporary-wall-ramp'],[30,'board-forge'],[32,'skate-ollie'],
  [39,'wall-ride'],[40,'swing'],[41,'swing'],[46,'combat-grab'],
  [48,'combat-strike'],[52,'charge'],[53,'charged-blast'],[59,'merkaba-model']]);
export const METAL_POWER_GROUPS=Object.freeze(GROUPS.map(g=>Object.freeze({...g})));
export const METAL_POWER_REGISTRY=Object.freeze(NAMES.map((name,i)=>{
 const id=i+1,group=GROUPS.find(g=>id<=g.end);
 const lab=LAB.get(id),existing=EXISTING.get(id);
 return Object.freeze({
  id,name,group:group.id,
  status:lab?'opt-in-lab':existing?'existing-partial':'design-only',
  action:lab||null,existingEvidence:existing||null,
  canon:id>=57?'experimental-or-review':'review-source'
 });
}));
export function abilityById(id){return Number.isInteger(id)&&id>=1&&id<=73?METAL_POWER_REGISTRY[id-1]:null;}
export function registryCounts(){
 const counts={total:METAL_POWER_REGISTRY.length,'opt-in-lab':0,'existing-partial':0,'design-only':0};
 for(const item of METAL_POWER_REGISTRY)counts[item.status]++;
 return Object.freeze(counts);
}
