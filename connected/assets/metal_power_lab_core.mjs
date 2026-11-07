// Metal • Prototype district power progression / material accounting.
// Pure deterministic rules. The live Savannah story save is never read/written.
// Owner registry is not a claim that all 73 abilities have game implementations.
export const POWER_LAB_SAVE_KEY='wir_metal_power_lab_v1';
export const POWER_LAB_VERSION=1;
export const POWER_LAB_PICKUP_IDS=Object.freeze(['salvage-a','salvage-b','salvage-c','salvage-d','salvage-e']);
export const POWER_LAB_COST=Object.freeze({build:.10,reinforce:.04,scan:.04,step:.25});
const sane=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const validPoint=p=>p&&sane(p.x)&&sane(p.z)&&Math.abs(p.x)<280&&Math.abs(p.z)<280;
const fail=reason=>({ok:false,reason,spentGal:0,returnedGal:0});

export function makePowerLab(data=null){
 const s={version:1,stage:0,scrap:0,collected:[],supportIntegrity:.35,structures:[],builtOnce:false,galLost:0,
  focus:1,clock:0,cooldownStep:0,cooldownScan:0,lastAction:null,nextId:1};
 if(data&&data.version===POWER_LAB_VERSION){
  const ids=Array.isArray(data.collected)?data.collected.filter(x=>POWER_LAB_PICKUP_IDS.includes(x)).slice(0,5):[];
  s.collected=[...new Set(ids)];
  s.stage=Number.isInteger(data.stage)?clamp(data.stage,0,4):0;
  // Stage must be consistent with physical evidence to fail closed on corrupt saves.
  if(s.collected.length<2)s.stage=0;
  s.supportIntegrity=s.stage>=2?clamp(sane(data.supportIntegrity)?data.supportIntegrity:.9,.8,1):.35;
  const seen=new Set();
  if(Array.isArray(data.structures))for(const o of data.structures.slice(0,12)){
   if(!o||!Number.isInteger(o.id)||o.id<1||o.id>10000||seen.has(o.id)||!validPoint(o.pos))continue;
   if(o.type!=='panel'||!sane(o.integrity)||o.integrity<0||o.integrity>1)continue;
   seen.add(o.id);
   s.structures.push({id:o.id,type:'panel',pos:{x:o.pos.x,z:o.pos.z},
    integrity:clamp(o.integrity,0,1),spentGal:POWER_LAB_COST.build});
  }
  s.builtOnce=data.builtOnce===true||s.structures.length>0;
  if(s.stage>=3&&!s.builtOnce)s.stage=2; // only construction evidence can unlock Snap Step
  s.nextId=Math.max(1,...s.structures.map(o=>o.id+1));
  s.scrap=clamp(Number.isInteger(data.scrap)?data.scrap:0,0,POWER_LAB_PICKUP_IDS.length);
  s.focus=clamp(sane(data.focus)?data.focus:1,0,1);
  s.galLost=clamp(sane(data.galLost)?data.galLost:0,0,1);
  // Timer clock and cooldowns never persist: no time manipulation on reload.
 }
 return s;
}
export function powerLabSave(s){
 return {version:1,stage:s.stage,scrap:s.scrap,collected:[...s.collected],builtOnce:s.builtOnce,galLost:s.galLost,
  supportIntegrity:s.supportIntegrity,structures:s.structures.map(o=>({
   id:o.id,type:o.type,pos:{...o.pos},integrity:o.integrity,spentGal:o.spentGal
  })),focus:s.focus};
}
export function powerLabSnapshot(s){
 return {stage:s.stage,stageTitle:['Find two pieces of safe salvage','Reinforce the failing support',
   'Construct a physical Gallium panel','Master Snap Step','Morrow district training complete'][s.stage],
  scrap:s.scrap,collected:[...s.collected],builtOnce:s.builtOnce,galLost:s.galLost,supportIntegrity:s.supportIntegrity,
  structures:s.structures.map(o=>({...o,pos:{...o.pos}})),
  focus:s.focus,clock:s.clock,cooldownStep:s.cooldownStep,cooldownScan:s.cooldownScan,
  lastAction:s.lastAction,unlocks:{
   scan:true,collect:true,reinforce:s.stage>=1,build:s.stage>=2,
   snapStep:s.stage>=3,reclaim:true,impact:s.stage>=2
  }};
}
export function stepPowerLab(s,dt){
 if(!s||!sane(dt)||dt<=0)return s;
 const step=clamp(dt,0,.1);
 s.clock+=step;s.focus=clamp(s.focus+step*.035,0,1);
 s.cooldownScan=Math.max(0,s.cooldownScan-step);
 s.cooldownStep=Math.max(0,s.cooldownStep-step);
 return s;
}
const near=distance=>sane(distance)&&distance>=0&&distance<=4.0;
export function applyPowerLab(s,action,opts={}){
 if(!s)return fail('invalid-state');
 const {gallium=0,distance=Infinity,id,point,grounded=false,dir}=opts;
 if(action==='collect'){
  if(!POWER_LAB_PICKUP_IDS.includes(id))return fail('invalid-source');
  if(!near(distance))return fail('too-far');
  if(s.collected.includes(id))return fail('already-collected');
  s.collected.push(id);s.scrap=Math.min(5,s.scrap+1);
  if(s.stage===0&&s.collected.length>=2)s.stage=1;
  s.lastAction='collect';
  return {ok:true,action,spentGal:0,returnedGal:0,id};
 }
 if(action==='scan'){
  if(s.focus<POWER_LAB_COST.scan)return fail('focus');
  if(s.cooldownScan>0)return fail('cooldown');
  s.focus-=POWER_LAB_COST.scan;s.cooldownScan=3;s.lastAction='scan';
  return {ok:true,action,spentGal:0,returnedGal:0,seconds:5};
 }
 if(action==='reinforce'){
  if(s.stage<1)return fail('not-unlocked');
  if(!near(distance))return fail('too-far');
  if(id!=='district-support'&&!s.structures.some(x=>x.id===id))return fail('no-structure');
  if(s.scrap<1)return fail('need-salvage');
  if(!sane(gallium)||gallium<POWER_LAB_COST.reinforce)return fail('need-gallium');
  s.scrap--;let item=null;
  if(id==='district-support'){
   s.supportIntegrity=clamp(s.supportIntegrity+.6,0,1);
   if(s.stage===1)s.stage=2;
  }else{
   item=s.structures.find(x=>x.id===id);item.integrity=clamp(item.integrity+.6,0,1);
  }
  s.galLost=clamp(s.galLost+POWER_LAB_COST.reinforce,0,1);
  s.lastAction='reinforce';return {ok:true,action,spentGal:POWER_LAB_COST.reinforce,returnedGal:0,id};
 }
 if(action==='build'){
  if(s.stage<2)return fail('not-unlocked');
  if(!grounded)return fail('must-be-grounded');
  if(!validPoint(point))return fail('invalid-placement');
  if(s.structures.length>=8)return fail('max-structures');
  if(s.scrap<1)return fail('need-salvage');
  if(!sane(gallium)||gallium<POWER_LAB_COST.build)return fail('need-gallium');
  if(!sane(distance)||distance<2||distance>7)return fail('bad-placement-range');
  const obj={id:s.nextId++,type:'panel',pos:{x:point.x,z:point.z},
   integrity:1,spentGal:POWER_LAB_COST.build};
  s.structures.push(obj);s.scrap--;s.builtOnce=true;if(s.stage===2)s.stage=3;
  s.lastAction='build';return {ok:true,action,spentGal:POWER_LAB_COST.build,returnedGal:0,object:{...obj}};
 }
 if(action==='impact'){
  if(s.stage<2)return fail('not-unlocked');
  const obj=s.structures.find(x=>x.id===id);
  if(!obj)return fail('no-structure');
  if(!near(distance))return fail('too-far');
  obj.integrity=clamp(obj.integrity-.32,0,1);
  s.lastAction='impact';
  return {ok:true,action,spentGal:0,returnedGal:0,id,integrity:obj.integrity};
 }
 if(action==='reclaim'){
  const idx=s.structures.findIndex(x=>x.id===id);
  if(idx<0)return fail('no-structure');
  if(!near(distance))return fail('too-far');
  const obj=s.structures.splice(idx,1)[0];
  const recovered=obj.spentGal*.8*obj.integrity;
  s.galLost=clamp(s.galLost+obj.spentGal-recovered,0,1);
  s.lastAction='reclaim';
  // Physical material is lost on damage; 80% of surviving matter returns.
  return {ok:true,action,spentGal:0,returnedGal:recovered,id};
 }
 if(action==='snap-step'){
  if(s.stage<3)return fail('not-unlocked');
  if(!grounded)return fail('must-be-grounded');
  if(!dir||!sane(dir.x)||!sane(dir.z))return fail('invalid-direction');
  const len=Math.hypot(dir.x,dir.z);
  if(len<.2)return fail('invalid-direction');
  if(s.focus<POWER_LAB_COST.step)return fail('focus');
  if(s.cooldownStep>0)return fail('cooldown');
  s.focus-=POWER_LAB_COST.step;s.cooldownStep=2.2;
  s.lastAction='snap-step';if(s.stage===3)s.stage=4;
  return {ok:true,action,spentGal:0,returnedGal:0,impulse:{x:dir.x/len*5,z:dir.z/len*5}};
 }
 return fail('unknown-action');
}
