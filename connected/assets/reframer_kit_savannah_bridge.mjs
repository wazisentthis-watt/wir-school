// Bridge the owner's whole WIR ReFramer Kit v1 to existing Savannah squad.
// The kit's DATA (finite part mass) and Rig (three-link eight-arm FABRIK gait)
// are used directly; its separate 2D encounter simulation must NOT also step
// on top of Savannah's live original ReFramer Rush FSM or donor car GLBs.
export const KIT_METERS_PER_PIXEL=1/40;
const wheelKeys=['wheelFL','wheelFR','wheelRL','wheelRR'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function verifyReframerKit(kit){
 if(!kit||typeof kit.selfTest!=='function'||typeof kit.Rig?.update!=='function'||
    !Array.isArray(kit.DATA?.donor?.parts)||typeof kit.Engine?.massCheck!=='function')
  throw Error('REFRAMER_KIT_V1_MISSING_OR_INVALID');
 const proof=kit.selfTest();
 if(proof.total!==16||proof.passed!==16)
  throw Error('REFRAMER_KIT_SELF_TEST_FAILED '+proof.passed+'/'+proof.total);
 const wheelSpecs=wheelKeys.map(key=>{
  const entry=kit.DATA.donor.parts.find(x=>x.key===key&&x.kind==='wheel');
  if(!entry||!finite(entry.mass)||entry.mass<=0||!Array.isArray(entry.slot)||entry.slot.length!==3)
   throw Error('REFRAMER_KIT_WHEEL_PART_MISSING '+key);
  return Object.freeze({...entry,slot:entry.slot.slice()});
 });
 const actualTotal=kit.DATA.donor.parts.reduce((n,p)=>n+(finite(p.mass)?p.mass:0),0);
 if(actualTotal!==kit.DATA.donor.totalKg)throw Error('REFRAMER_KIT_MASS_SCHEMA_MISMATCH');
 return Object.freeze({kit,version:kit.DATA.meta.version,massKg:actualTotal,
  wheelSpecs:Object.freeze(wheelSpecs),proof:{passed:proof.passed,total:proof.total},
  supportedForm:'roadframe',notYetSupported:['sky','constructor','aquatic']});
}
export function kitWheelSpec(bound,index){
 return bound.wheelSpecs[Math.max(0,Math.min(bound.wheelSpecs.length-1,index|0))];
}
// Derived solely from live, already-owned scene objects; does not materialize
// missing chassis/doors, invent a vehicle, or spend/refund Galaxy Gallium.
export function makeSavannahRigProxy(bound,u,player){
 if(!u?.W?.enc||!u.donor||!player)return null;
 const E=u.W.enc,moving=E.stage==='chase'||E.stage==='reframe';
 const p=moving?E.target:E.pos;
 if(!finite(p?.x)||!finite(p?.z))return null;
 const bot={x:p.x*40,y:p.z*40,h:finite(E.heading)?E.heading:0,
  mode:E.stage,t:E.t||0,lift:E.stage==='drop'?1-Math.min(1,(E.t||0)/.7):0,
  outriggers:[],roll:false};
 const donor={id:u.donor.uuid,x:u.donor.position.x*40,y:u.donor.position.z*40,
  angle:u.donor.rotation.y,skin:0};
 const parts=u.wheels.map((wheel,i)=>{
  const spec=kitWheelSpec(bound,i);
  const state=u.claimedMesh.has(wheel.uuid)&&!u.brokenParts?.has(wheel.uuid)?'frame':'car';
  return {id:wheel.uuid,key:spec.key,kind:'wheel',mass:spec.mass,
   slot:{x:spec.slot[0],y:spec.slot[1],r:spec.slot[2]},state,
   x:wheel.position.x*40,y:wheel.position.z*40,z:0,r:wheel.rotation.y||0,open:0};
 });
 return {id:E.id,bot,donor,parts,stage:bot.mode,released:false};
}
export function updateSavannahKitRig(bound,u,player,dt,time){
 const proxy=makeSavannahRigProxy(bound,u,player);
 if(!proxy||!finite(dt)||dt<=0)return null;
 u.kitRig=bound.kit.Rig.update(u.kitRig,proxy,Math.min(.05,dt),
  {time,player:{x:player.x*40,y:player.z*40},groundZ:()=>0});
 return u.kitRig;
}
export function kitJointVector(THREE,point){
 if(!point||![point.x,point.y,point.z].every(finite))return null;
 return new THREE.Vector3(point.x*KIT_METERS_PER_PIXEL,
  point.z*KIT_METERS_PER_PIXEL,point.y*KIT_METERS_PER_PIXEL);
}
