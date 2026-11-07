// Rig-safe forge animation and seven-piece board assembly timing. PROPOSAL/PUBLISH HOLD.
export const FORGE_PART_TIMES=Object.freeze({deck:[1.55,2.12],truck:[1.88,2.43],wheel:[2.08,2.62]});
export const FORGE_POSE_PRIORITY=Object.freeze({
 DETECTING:['Block','Idle'],EXTRACTION:['Block','Charge','Idle'],
 GATHERING:['Charge','Idle'],COMPRESSION:['Charge','Blast','Idle'],
 ACTIVATED:['Blast','Charge','Idle'],MOUNTING:['Land','JumpLand','Idle']
});
export const smooth=x=>{const t=Math.max(0,Math.min(1,Number.isFinite(x)?x:0));return t*t*(3-2*t);};
export function partFormation(kind,t,dissolve=false){
 const lim=FORGE_PART_TIMES[kind];if(!lim)throw Error('Unknown forge part: '+kind);
 return dissolve?smooth(1-t/.55):smooth((t-lim[0])/(lim[1]-lim[0]));
}
export function selectForgePose(phase,actions={}){return (FORGE_POSE_PRIORITY[phase]||[]).find(k=>!!actions[k])||null;}
