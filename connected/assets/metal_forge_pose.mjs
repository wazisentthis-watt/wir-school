// WIR METAL, original procedural upper-body forge performance.
// All curves pure, deterministic, rig-independent; never alter left knee or game state.
export const smooth01=v=>{const x=Math.max(0,Math.min(1,Number.isFinite(v)?v:0));return x*x*(3-2*x);};
export function cue(t,start,peak,end){
 if(!Number.isFinite(t))return 0;
 if(t<=start||t>=end)return 0;
 return t<peak?smooth01((t-start)/(peak-start)):smooth01((end-t)/(end-peak));
}
export function forgePerformancePose(phase,t){
 if(phase==='DISSOLVING'){
  const w=cue(t,0,.18,.55);
  return {scan:0,reach:0,gather:0,press:0,seal:w*.55,mount:0,weight:w*.55};
 }
 if(['IDLE','SKATING'].includes(phase)||!Number.isFinite(t))return {scan:0,reach:0,gather:0,press:0,seal:0,mount:0,weight:0};
 const p={
  scan:cue(t,0,.22,.48),
  reach:cue(t,.25,.72,1.15),
  gather:cue(t,.75,1.30,1.82),
  press:cue(t,1.40,1.93,2.40),
  seal:cue(t,2.08,2.39,2.78),
  mount:cue(t,2.48,2.87,3.30)
 };
 p.weight=Math.max(p.scan,p.reach,p.gather,p.press,p.seal,p.mount);
 return p;
}
