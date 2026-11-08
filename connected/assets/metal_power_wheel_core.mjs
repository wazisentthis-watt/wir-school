// METAL 73-ability selection groups. No invented playable powers.
import {METAL_POWER_REGISTRY} from './metal_power_registry_73.mjs';
export const POWER_FAMILIES=Object.freeze([
 {id:'neural',name:'Neural',icon:'🧠',ids:[1,2,3,4,5,6,7,8,9,10]},
 {id:'forge',name:'Construction',icon:'🔧',ids:[11,16,17,18,20,21,22,23,27,28,29]},
 {id:'defense',name:'Defense',icon:'🛡️',ids:[12,14,19,25,26]},
 {id:'tendrils',name:'Tendrils',icon:'🐙',ids:[15,37,40,41,42,46,66]},
 {id:'movement',name:'Movement',icon:'🛹',ids:[30,31,32,33,34,35,36,38,39,43,44,45]},
 {id:'combat',name:'Combat',icon:'⚡',ids:[24,47,48,49,50,51,52,53,54,56]},
 {id:'forms',name:'Forms',icon:'🦍',ids:[13,57,58,60,61,62,63,64]},
 {id:'rifft',name:'RIFFT & Merkaba',icon:'✨',ids:[55,59,65,67,68,69,70,71,72,73]}
]);
const assigned=new Set(POWER_FAMILIES.flatMap(f=>f.ids));
if(assigned.size!==73||POWER_FAMILIES.flatMap(f=>f.ids).length!==73
 ||METAL_POWER_REGISTRY.some(x=>!assigned.has(x.id)))throw Error('POWER_WHEEL_73_MAPPING_INCOMPLETE');
const allowed=new Set(['adaptive-armor','snap-step','pressure-read','build-panel','reinforce','reclaim','collect','impact']);
const aliases=Object.freeze({'build-panel':'build','pressure-read':'scan','snap-step':'step'});
export function wheelAction(a){return allowed.has(a)?(aliases[a]||a):null;}
export function wheelAbilities(family){
 const f=POWER_FAMILIES.find(x=>x.id===family);
 return f?f.ids.map(id=>METAL_POWER_REGISTRY[id-1]):[];
}
export function wheelAvailability(ability,snapshot){
 if(!ability)return {state:'unknown',why:'Unknown ability',action:null};
 if(ability.status==='design-only')return {state:'future',why:'Design-only · gameplay not implemented',action:null};
 if(ability.status==='existing-partial')return {state:'partial',why:'Existing controls · no Power Wheel action yet',action:null};
 const action=wheelAction(ability.action);
 if(!action)return {state:'future',why:'Ability has no valid gameplay action',action:null};
 if(!snapshot)return {state:'unavailable',why:'Ability laboratory not loaded',action:null};
 const unlocks=snapshot.unlocks||{};
 const requirements={build:'build',reinforce:'reinforce',step:'snapStep',armor:'build',impact:'impact'};
 const check=requirements[action];
 if(check&&!unlocks[check])return {state:'locked',why:'Complete the district salvage/repair mission to unlock',action:null};
 return {state:'ready',why:'Ready · uses real world/energy rules',action};
}
export function normalizedChoice(familyIndex=0,abilityIndex=0){
 const f=(Number.isInteger(familyIndex)?familyIndex:0);
 const i=((f%POWER_FAMILIES.length)+POWER_FAMILIES.length)%POWER_FAMILIES.length;
 const a=wheelAbilities(POWER_FAMILIES[i].id);
 return {familyIndex:i,abilityIndex:a.length?((Number.isInteger(abilityIndex)?abilityIndex:0)%a.length+a.length)%a.length:0};
}
