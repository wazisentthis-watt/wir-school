// WIR: Connected — TOP 33 narrative data foundation (PROPOSAL).
// Slot 01 is SLOTTA; other 32 identities intentionally remain unassigned until canon is approved.
export const TOP33_COUNT=33;
export const TOP33_ROSTER=Object.freeze(Array.from({length:TOP33_COUNT},(_,i)=>Object.freeze({
 id:`top33-${String(i+1).padStart(2,'0')}`,
 name:i===0?'SLOTTA':null,
 revealed:i===0,
 status:'unconfirmed',
 evidence:[],
 powerFamilies:i===0?['phantom-engine','game-cartridges']:[],
 faction:null
})));
export const METAL_LIFE_TRACKS=Object.freeze({
 investigation:{label:'Top 33',skills:['observation','evidence','analysis']},
 music:{label:'Music',skills:['composition','performance','production']},
 athletics:{label:'Skateboarding',skills:['balance','tricks','competition']},
 finances:{label:'Valence Life',skills:['budgeting','planning','earning']},
 education:{label:'Science Classes',skills:['chemistry','physics','laboratory']}
});
export const METAL_DETECTOR_EVIDENCE_TYPES=Object.freeze(['signal','witness','material','experiment','location','document']);
export function createTop33State(){
 return {version:1,caseFiles:{},life:{money:0,reputation:0,schoolCredits:0,skateRank:0,musicReputation:0},companion:{lilHeavy:{unlocked:false,trust:0}},flags:{}};
}
export function addTop33Evidence(state,subjectId,evidence){
 if(!TOP33_ROSTER.some(p=>p.id===subjectId))return false;
 if(!evidence||!METAL_DETECTOR_EVIDENCE_TYPES.includes(evidence.type)||typeof evidence.note!=='string'||!evidence.note.trim())return false;
 const file=state.caseFiles[subjectId]||(state.caseFiles[subjectId]={evidence:[],status:'unconfirmed'});
 if(file.evidence.some(e=>e.id===evidence.id))return false;
 file.evidence.push({id:String(evidence.id||`entry-${file.evidence.length+1}`),type:evidence.type,note:evidence.note.slice(0,400)});
 return true;
}
export function caseProgress(state,subjectId){const f=state.caseFiles[subjectId];return f?Math.min(1,f.evidence.length/3):0;}
