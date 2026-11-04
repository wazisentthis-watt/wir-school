/**
 * WIR Connected · Test Yard skating adapter v0.1.
 * Opt-in (skate_yard=1), purely local, NO save/inventory/mission/world mutation.
 * Original Connected's real physics, controller, combat and Gallium remain authoritative.
 * PROPOSAL / PUBLISH HOLD.
 */
export const TESTYARD_SKATE_SCHEMA='wir.connected.testyard-skate.v1';
export const FLIPS=Object.freeze({
 N:{name:'Kickflip',points:150,duration:.42,rz:1},
 L:{name:'Heelflip',points:150,duration:.42,rz:-1},
 R:{name:'Tre Flip',points:380,duration:.55,rz:1,ry:1},
 B:{name:'Pop Shove-It',points:120,duration:.38,ry:.5},
 F:{name:'Impossible',points:300,duration:.50,rx:1}
});
export const GRABS=Object.freeze({
 N:'Indy',L:'Melon',R:'Stalefish',F:'Nosegrab',B:'Tailgrab'
});
export const FALLS=Object.freeze({
 wall:{name:'Wall rebound',clip:'slam',recovery:'step',duration:1.8,roll:.85,pitch:-.7},
 slam:{name:'Heavy impact',clip:'slam',recovery:'stand',duration:2.1,roll:.65,pitch:1.25},
 slide:{name:'Sideways pavement slide',clip:'slide',recovery:'stand',duration:1.85,roll:1.5,pitch:.16},
 nose:{name:'Nose-first tumble',clip:'bail',recovery:'step',duration:1.65,roll:1,pitch:1.6},
 backward:{name:'Backward roll-out',clip:'bail',recovery:'stand',duration:1.72,roll:-1.6,pitch:-.8},
 rail:{name:'Rail spill',clip:'slide',recovery:'step',duration:1.9,roll:1.8,pitch:.3},
 board:{name:'Board-loss scramble',clip:'bail',recovery:'stand',duration:1.67,roll:1.15,pitch:.52},
 grab:{name:'Grab-and-roll recovery',clip:'dodge',recovery:'step',duration:1.64,roll:-1,pitch:.47}
});
const isFiniteNumber=n=>typeof n==='number'&&Number.isFinite(n);
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
export function trickDirection(x=0,y=0){
 if(!isFiniteNumber(x)||!isFiniteNumber(y))return 'N';
 if(y<-.52)return 'F';if(y>.52)return 'B';
 if(x<-.52)return 'L';if(x>.52)return 'R';
 return 'N';
}
export function classifyFall(reason=''){
 const r=String(reason).toLowerCase();
 const kind=r.includes('wall')?'wall':r.includes('hard')||r.includes('slam')||r.includes('big a drop')?'slam':
 r.includes('side')||r.includes('powerslide')?'slide':r.includes('nose')||r.includes('flip')?'nose':
 r.includes('back')||r.includes('loop')?'backward':r.includes('rail')||r.includes('grind')||r.includes('ledge')?'rail':
 r.includes('grab')?'grab':'board';
 return Object.freeze({kind,...FALLS[kind]});
}
export function fightClipHint(id){
 return ({jab:'punch_l',cross:'punch_r',hook:'punch_r',kickL:'kick_l',kickR:'kick_r',
 dash:'dodge',blast:'blast'})[id]||null;
}
export function createTestYardSkateAdapter(){
 let queued=null,flip=null,grab=null,airTime=0,lastFlip=null,airPoints=0,airNames=[];
 let grindTime=0,grindLabel=null,manualPhase=0,fall=null,fallClock=0,recoverySent=false;
 let flipCount=0,landedTricks=0,fallCount=0;
 const event=(kind,name,points=0)=>Object.freeze({kind,name,points});
 function queueFlip(dir='N'){
  if(!Object.hasOwn(FLIPS,dir)||queued||flip||fall)return false;
  queued=dir;return true;
 }
 function onAir(dt,{grabHeld=false,dir='N'}={}){
  const events=[];if(!isFiniteNumber(dt)||dt<=0)return events;
  if(fall)return events;
  airTime+=limit(dt,0,.08);
  if(queued&&!flip&&airTime>=.035){
   const type=FLIPS[queued];
   const doubled=lastFlip===type.name;
   flip={...type,name:(doubled?'Double ':'')+type.name,points:Math.round(type.points*(doubled?1.6:1)),elapsed:0};
   lastFlip=type.name;queued=null;flipCount++;
  }
  if(flip&&!flip.done){
   flip.elapsed+=limit(dt,0,.08);
   if(flip.elapsed>=flip.duration){flip.done=true;airPoints+=flip.points;airNames.push(flip.name);}
  }
  if((!flip||flip.done)&&!queued&&grabHeld){
   if(!grab)grab={name:GRABS[dir]||GRABS.N,elapsed:0};
   grab.elapsed+=limit(dt,0,.08);
  }else if(grab&&!grabHeld){
   if(grab.elapsed>.12){const points=100+Math.round(grab.elapsed*500);airPoints+=points;airNames.push(grab.name);}
   grab=null;
  }
  return events;
 }
 function land(){
  // The existing game controls the actual landing collision and root state.
  if(grab){if(grab.elapsed>.12){airPoints+=100+Math.round(grab.elapsed*500);airNames.push(grab.name);}grab=null;}
  if(flip&&!flip.done&&airTime>.14){
   const failed={failed:true,reason:flip.ry?'BACKWARD ROLL-OUT':flip.rx?'NOSE FIRST TUMBLE':'SIDEWAYS FLIP LANDING'};
   clearAir();return Object.freeze(failed);
  }
  const points=airPoints,names=airNames.slice();
  if(points>0)landedTricks++;
  clearAir();return Object.freeze({failed:false,points,names});
 }
 function clearAir(){queued=null;flip=null;grab=null;airTime=0;airPoints=0;airNames=[];}
 function resetRide(){clearAir();grindTime=0;grindLabel=null;manualPhase=0;}
 function grind(dt,{active=false,dir='N',speed=0}={}){
  if(!isFiniteNumber(dt)||dt<0)return null;
  if(!active){const result=grindTime>=.28?event('grind',grindLabel||'50-50',Math.round(grindTime*150)):null;
   grindTime=0;grindLabel=null;return result;}
  grindTime+=Math.min(dt,.08);
  const labels={N:'50-50',B:'5-0',F:'Nosegrind',L:'Crooked',R:'Smith'};
  grindLabel=labels[dir]||'50-50';
  if(speed<.35){const r=grindTime>.28?event('grind',grindLabel,Math.round(grindTime*150)):null;grindTime=0;grindLabel=null;return r;}
  return null;
 }
 function manualBalance(balance,velocity,dt,steer=0){
  if(![balance,velocity,dt,steer].every(isFiniteNumber))return {balance:0,velocity:0};
  dt=limit(dt,0,1/25);manualPhase+=dt;
  const v=(velocity+(balance*2.1+Math.sin(manualPhase*8.2)*.4-limit(steer,-1,1)*3.4)*dt)*Math.exp(-.35*dt);
  return {balance:balance+v*dt,velocity:v};
 }
 function startFall(reason){
  const kind=classifyFall(reason);fall={...kind};fallClock=0;recoverySent=false;fallCount++;clearAir();grindTime=0;grindLabel=null;
  return Object.freeze({...kind});
 }
 function stepFall(dt){
  if(!fall)return Object.freeze({active:false,pitch:0,roll:0,recover:null});
  if(!isFiniteNumber(dt)||dt<=0)return Object.freeze({active:true,pitch:0,roll:0,recover:null});
  fallClock+=Math.min(.08,dt);
  const t=limit(fallClock/fall.duration,0,1);
  const intensity=t<.2?t/.2:t>.82?(1-t)/.18:1;
  const recover=!recoverySent&&t>=.7?fall.recovery:null;
  if(recover)recoverySent=true;
  const out=Object.freeze({active:true,pitch:fall.pitch*intensity,roll:fall.roll*intensity,recover,kind:fall.kind});
  if(t>=1)fall=null;
  return out;
 }
 function visual(){
  if(!flip)return null;
  const progress=limit(flip.elapsed/flip.duration,0,1);
  return Object.freeze({rx:flip.rx||0,ry:flip.ry||0,rz:flip.rz||0,progress});
 }
 function snapshot(){return Object.freeze({
  schema:TESTYARD_SKATE_SCHEMA,queued,flip:flip?.name||null,grab:grab?.name||null,airTime,
  grindLabel,grindTime,fall:fall?.kind||null,flipCount,landedTricks,fallCount,
  authority:'VISUAL_AND_TRICK_INTENT_ONLY',writesSaves:false
 });}
 return Object.freeze({queueFlip,onAir,land,resetRide,grind,manualBalance,startFall,stepFall,visual,snapshot});
}
