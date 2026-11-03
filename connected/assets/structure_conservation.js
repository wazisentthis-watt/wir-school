// WIR Merkabah structural conservation physics.
// Pure simulation; scene meshes and animation remain owned by the rendering workstream.
// Units are normalized game material and stress, not engineering measurements.
export function createStructureLedger(structures=[]){
 const entries=structures.map(s=>({id:s.id,capacity:Math.max(0,s.metal||0),stored:Math.max(0,s.metal||0),criticalRatio:Math.max(0,Math.min(1,s.criticalRatio??.35)),stress:0,integrity:1,state:'stable',countdown:0}));
 if(new Set(entries.map(s=>s.id)).size!==entries.length)throw Error('Structure ids must be unique');
 return {structures:entries,carried:0,returned:0,extracted:0,emergency:false};
}
export function extractMetal(ledger,amount,nearbyIds=[]){
 if(ledger.emergency||!Number.isFinite(amount)||amount<=0)return 0;
 const allowed=new Set(nearbyIds);let remaining=amount,got=0;
 for(const s of ledger.structures){if(!allowed.has(s.id)||remaining<=0)continue;
  const take=Math.min(s.stored,remaining);s.stored-=take;got+=take;remaining-=take;
 }
 ledger.carried+=got;ledger.extracted+=got;refresh(ledger,0);return got;
}
function refresh(ledger,dt){
 for(const s of ledger.structures){const missing=s.capacity?s.capacity-s.stored:0,ratio=s.capacity?s.stored/s.capacity:1;
  s.stress=Math.min(1,Math.max(0,missing/(s.capacity||1)));
  s.integrity=Math.max(0,Math.min(1,ratio));
  if(ratio<s.criticalRatio){s.state='critical';s.countdown=Math.max(0,s.countdown+(dt||0));}
  else if(ratio<.8){s.state='weakened';s.countdown=0;}
  else{s.state='stable';s.countdown=0;}
 }
 ledger.emergency=ledger.structures.some(s=>s.state==='critical');
}
export function restoreMetal(ledger,amount=Infinity){
 if(Number.isNaN(amount)||amount<=0)return 0;
 let remaining=Math.min(ledger.carried,amount),restored=0;
 // Critical structures are restored first, even when Metal is in combat.
 const targets=[...ledger.structures].sort((a,b)=>a.integrity-b.integrity);
 for(const s of targets){const need=s.capacity-s.stored,take=Math.min(need,remaining);s.stored+=take;remaining-=take;restored+=take;if(remaining<=0)break;}
 ledger.carried=Math.max(0,ledger.carried-restored);ledger.returned+=restored;refresh(ledger,0);return restored;
}
export function stepStructureLedger(ledger,dt,{recallRate=8,criticalTime=2.5}={}){
 if(!Number.isFinite(dt)||dt<=0)return [];
 dt=Math.min(dt,.1);refresh(ledger,dt);const events=[];
 if(ledger.emergency){const restored=restoreMetal(ledger,recallRate*dt);if(restored>0)events.push({type:'koda-recall',amount:restored});
  if(ledger.structures.some(s=>s.state==='critical'&&s.countdown>=criticalTime))events.push({type:'structure-failure-imminent'});
  if(!ledger.emergency)events.push({type:'structures-stabilized'});
 }
 return events;
}
export function ledgerSnapshot(ledger){
 return {carried:ledger.carried,extracted:ledger.extracted,returned:ledger.returned,emergency:ledger.emergency,
 structures:ledger.structures.map(s=>({id:s.id,integrity:s.integrity,stress:s.stress,state:s.state,countdown:s.countdown}))};
}
