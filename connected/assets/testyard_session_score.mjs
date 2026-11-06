/**
 * METAL Test Yard 3D -> WIR Connected Savannah: opt-in, in-memory scoring.
 * Preserves the original game's physics, rig, controls, Galaxy Gallium and saves.
 * 120-second run/free-skate combo rules follow the uploaded Test Yard, but
 * scoring is awarded only by Connected's own completed land/grind/manual events.
 * PROPOSAL / PUBLISH HOLD. No DOM, storage, or network dependencies.
 */
export const TESTYARD_SCORE_SCHEMA='wir.connected.testyard-session.v1';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const MAX_EVENT_POINTS=100000;

export function createTestYardSession({duration=120}={}){
 const length=Number.isFinite(duration)&&duration>0?clamp(duration,1,3600):120;
 let mode='free',remaining=null,finished=false,total=0,banks=0;
 let names=[],base=0,multiplier=0,grace=0,repeat=new Map(),lastBank=0;
 const resetCombo=()=>{names=[];base=0;multiplier=0;grace=0;repeat.clear();};
 function start(next='free'){
  if(next!=='free'&&next!=='run')return false;
  mode=next;remaining=next==='run'?length:null;finished=false;total=0;banks=0;lastBank=0;
  resetCombo();return true;
 }
 function addTricks(input,rawPoints){
  if(finished||!Array.isArray(input)||input.length<1||!Number.isFinite(rawPoints)||rawPoints<=0)return 0;
  const tricks=input.filter(x=>typeof x==='string'&&x.trim().length>0).slice(0,12).map(x=>x.trim().slice(0,60));
  if(!tricks.length)return 0;
  const capped=clamp(rawPoints,0,MAX_EVENT_POINTS);
  let awarded=0;
  tricks.forEach((name,i)=>{
   const before=repeat.get(name)||0;
   const fraction=capped/tricks.length;
   const points=Math.round(fraction*Math.pow(.5,Math.min(before,8)));
   repeat.set(name,before+1);
   names.push(before?name+' ×'+(before+1):name);
   multiplier++;base+=points;awarded+=points;
  });
  grace=.42;return awarded;
 }
 function bank(){
  if(finished||!names.length)return 0;
  const points=Math.round(base*Math.max(1,multiplier));
  total+=points;lastBank=points;banks++;
  resetCombo();return points;
 }
 function bail(){resetCombo();return snapshot();}
 function tick(dt,{grounded=false}={}){
  if(!Number.isFinite(dt)||dt<=0)return snapshot();
  const step=clamp(dt,0,.1);
  if(finished)return snapshot();
  if(grounded&&names.length){
   grace-=step;
   if(grace<=0)bank();
  }
  if(mode==='run'){
   remaining=Math.max(0,remaining-step);
   if(remaining===0){
    if(grounded)bank();
    else resetCombo(); // do not bank unfinished airborne trick chains
    finished=true;
   }
  }
  return snapshot();
 }
 function snapshot(){
  return Object.freeze({
   schema:TESTYARD_SCORE_SCHEMA,mode,remaining,finished,
   score:total,lastBank,banks,comboPoints:Math.round(base),
   comboMultiplier:multiplier,comboNames:Object.freeze(names.slice(-6)),
   pending:Math.round(base*Math.max(1,multiplier)),
   writesSaves:false,authority:'CONNECTED_CONFIRMED_TRICKS_ONLY'
  });
 }
 return Object.freeze({start,addTricks,bank,bail,tick,snapshot});
}