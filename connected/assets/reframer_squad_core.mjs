// METAL × ReFramer Rush: coordinated PHATOM-like scavenger species core.
// Deterministic source of truth for independent IDs, salvaged PART identities,
// claimed donor vehicles, police-style last-known target dispatch, and grapples.
// No models fabricated here. World adapter uses existing car GLBs + ReFramer art.
// PUBLISH HOLD. Not a flight or construction-machine transformation.
export const SQUAD=Object.freeze({
 MAX_WINGS:2, SIGHT:32, RADIO_TTL:7, CLAIM_LIMIT:1,
 MAX_PARTS:8, FLANK:5, MAX_ACTIVE_GRABS:1, ENCOUNTER_RANGE:55
});
const safe=n=>typeof n==='number'&&Number.isFinite(n);
const pos=p=>p&&safe(p.x)&&safe(p.z);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const cleanId=id=>typeof id==='string'&&id.length>0&&id.length<100;
const clone=p=>({x:p.x,z:p.z});

export function createReframerSquad(wingCount=2){
 const n=Math.min(SQUAD.MAX_WINGS,Math.max(0,Number.isInteger(wingCount)?wingCount:2));
 const wings=Array.from({length:n},(_,i)=>({
  id:'RF-W'+(i+1),role:i===0?'interceptor':'salvager',
  donor:null,parts:[],seenParts:new Set(),active:false,searching:false,
  encounters:0,captures:0,escapes:0,downs:0
 }));
 return {clock:0,wings,vehicleClaims:new Map(),contact:null,contactAge:Infinity,
  activeGrabber:null,radioMessages:0,ledger:[]};
}
export function reserveVehicle(S,agentId,donorId){
 const a=S?.wings.find(x=>x.id===agentId);
 if(!a||!cleanId(donorId)||a.donor!==null)return {ok:false,reason:'invalid-or-busy'};
 if(S.vehicleClaims.has(donorId))return {ok:false,reason:'donor-claimed'};
 S.vehicleClaims.set(donorId,agentId);a.donor=donorId;a.active=true;a.encounters++;
 return {ok:true,agentId,donorId};
}
export function attachVehiclePart(S,agentId,part){
 const a=S?.wings.find(x=>x.id===agentId);
 if(!a?.donor||!part||!cleanId(part.id)||!cleanId(part.kind))return {ok:false,reason:'no-donor-or-part'};
 // Physical source provenance is compulsory, each part must come from the
 // EXACT single claimed source vehicle (not from a magic robotic inventory).
 if(part.vehicleId!==a.donor)return {ok:false,reason:'not-claimed-donor'};
 if(a.seenParts.has(part.id)||a.parts.length>=SQUAD.MAX_PARTS)return {ok:false,reason:'duplicate-or-full'};
 const item={id:part.id,kind:part.kind,vehicleId:a.donor,integrity:1};
 a.parts.push(item);a.seenParts.add(item.id);
 return {ok:true,part:{...item},used:a.parts.length};
}
export function damageVehiclePart(S,agentId,partId,amount){
 const a=S?.wings.find(x=>x.id===agentId),o=a?.parts.find(x=>x.id===partId);
 if(!o||!safe(amount)||amount<=0)return {ok:false,reason:'invalid-hit'};
 o.integrity=Math.max(0,o.integrity-Math.min(amount,1));
 if(o.integrity<=0){a.parts.splice(a.parts.indexOf(o),1);return {ok:true,broken:true,part:{...o}}}
 return {ok:true,broken:false,part:{...o}};
}
export function releaseVehicle(S,agentId,outcome){
 const a=S?.wings.find(x=>x.id===agentId);
 if(!a||!a.donor)return {ok:false,reason:'none'};
 const donor=a.donor,parts=a.parts.map(p=>({...p}));
 S.vehicleClaims.delete(donor);a.donor=null;a.active=false;
 a.parts=[];a.seenParts.clear();
 if(outcome==='roadframeDown'||outcome==='clean')a.downs++;
 S.ledger.push({agentId,donor,outcome,parts:parts.map(p=>({id:p.id,integrity:p.integrity}))});
 // Returns part identities so the world can detach original meshes exactly once,
 // restore on abort or publish the remaining matter as finite drawable scrap.
 return {ok:true,agentId,donor,outcome,parts};
}
export function reserveTentacle(S,id){
 if(!S?.wings.some(x=>x.id===id))return false;
 if(S.activeGrabber&&S.activeGrabber!==id)return false;
 S.activeGrabber=id;const a=S.wings.find(x=>x.id===id);a.captures++;return true;
}
export function releaseTentacle(S,id,escaped=false){
 if(S?.activeGrabber!==id)return false;
 S.activeGrabber=null;
 if(escaped){const a=S.wings.find(x=>x.id===id);if(a)a.escapes++}
 return true;
}
export function squadOrders(S,{metal,units=[],dt=1/60}={}){
 if(!S||!pos(metal)||!safe(dt)||dt<=0)return [];
 const step=Math.min(.1,dt);S.clock+=step;
 // Sensing comes from independently positioned scene agents. A contact from
 // any agent shares a last-known position, never continuous omniscience.
 const sensors=units.filter(x=>cleanId(x.id)&&pos(x.position));
 const visible=sensors.filter(x=>x.sees===true&&dist(x.position,metal)<=SQUAD.SIGHT);
 if(visible.length){
  S.contact=clone(metal);S.contactAge=0;
  if(!S._radioActive){S.radioMessages++;S._radioActive=true;}
 }else{S.contactAge+=step;if(S.contactAge>SQUAD.RADIO_TTL){S.contact=null;S._radioActive=false;}}
 const orders=[];
 for(const a of S.wings){
  const u=sensors.find(x=>x.id===a.id);
  if(!u){orders.push({id:a.id,mode:'offline',goal:null,canRam:false,allowTether:false});continue;}
  const personallySees=u.sees===true&&dist(u.position,metal)<=SQUAD.SIGHT;
  const contact=S.contact;
  let goal=personallySees?clone(metal):contact?clone(contact):null;
  if(goal&&contact&&a.role==='interceptor'){
   // Only the interceptor flanks; the salvage unit approaches last-known point.
   const dx=metal.x-u.position.x,dz=metal.z-u.position.z,
    len=Math.max(1,Math.hypot(dx,dz));
   if(personallySees){goal.x+=-dz/len*SQUAD.FLANK;goal.z+=dx/len*SQUAD.FLANK;}
  }
  const radio=!!contact&&!personallySees;
  a.searching=radio;
  orders.push({id:a.id,role:a.role,mode:personallySees?'pursue':radio?'search':'patrol',
   goal,personallySees,canRam:personallySees,allowTether:personallySees&&
    (!S.activeGrabber||S.activeGrabber===a.id)});
 }
 return orders;
}
export function squadSnapshot(S){
 return {wings:S.wings.map(a=>({id:a.id,role:a.role,donor:a.donor,parts:a.parts.map(p=>({...p})),
   active:a.active,searching:a.searching,encounters:a.encounters,captures:a.captures,
   escapes:a.escapes,downs:a.downs})),
  activeGrabber:S.activeGrabber,contact:S.contact?clone(S.contact):null,
  contactAge:S.contactAge,radioMessages:S.radioMessages,
  vehicleClaims:[...S.vehicleClaims.entries()],
  ledger:S.ledger.slice(-12).map(x=>({...x,parts:x.parts.map(p=>({...p}))}))};
}
