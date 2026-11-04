/**
 * WIR Connected · Mission 05 Rooftop Pursuit · pure mission rules.
 * Dedicated save namespace; NO mutations to canonical Metal story, powers or movement.
 * All locations/tunings are a noncanon, player-testable PROPOSAL. PUBLISH HOLD.
 */
export const M05_SCHEMA='wir.metal.rooftop-pursuit.v1';
export const M05_KEY='wir_metal_rooftop_pursuit_v1';
export const M05_STAGES=Object.freeze(['INTRO','SKATEPARK','TRICK','ROOFTOP','DUEL','RETURN','COMPLETE']);
export const M05_OBJECTIVES=Object.freeze({
 INTRO:'Mission 05 · activate Rooftop Pursuit',
 SKATEPARK:'Reach the Savannah Skatepark using the original movement system',
 TRICK:'Forge Metal’s four-wheel board and LAND a directional flip at the Skatepark',
 ROOFTOP:'Skate, swing, wall-ride or fly to the Fight Lot rooftop; land without teleporting',
 DUEL:'Dissolve the board, defeat the ReFramer through an aerial rooftop impact',
 RETURN:'Travel back to Forsyth Commons; bring the evidence home',
 COMPLETE:'Mission 05 complete · checkpoint and rooftop encounter recorded'
});
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
export function validPosition(p){
 return !!p&&typeof p==='object'&&!Array.isArray(p)&&
 ['x','y','z'].every(k=>finite(p[k]))&&Math.abs(p.x)<=200&&Math.abs(p.z)<=200&&p.y>=.0&&p.y<=180;
}
const loc=p=>({x:p.x,y:p.y,z:p.z});
export const flatDistance=(a,b)=>!a||!b?Infinity:Math.hypot(a.x-b.x,a.z-b.z);
export function createMission05(saved=null){
 const blank=()=>({schema:M05_SCHEMA,stage:'INTRO',checkpoint:null,flip:null,points:0,
  roofImpacts:0,duelAttempts:0,completed:false,elapsed:0,revision:0});
 if(!saved||saved.schema!==M05_SCHEMA||!M05_STAGES.includes(saved.stage))return blank();
 if(saved.stage!=='INTRO'&&!validPosition(saved.checkpoint))return blank();
 if(!integer(saved.revision,0,1000000)||!integer(saved.duelAttempts,0,10000)||
    !finite(saved.elapsed)||saved.elapsed<0||saved.elapsed>200000||!integer(saved.points,0,100000)||
    !integer(saved.roofImpacts,0,10000)||typeof saved.completed!=='boolean')return blank();
 if(saved.completed!==(saved.stage==='COMPLETE'))return blank();
 if(saved.flip!==null&&(typeof saved.flip!=='string'||saved.flip.length>80))return blank();
 return {schema:M05_SCHEMA,stage:saved.stage,checkpoint:saved.checkpoint?loc(saved.checkpoint):null,
  flip:saved.flip,points:saved.points,roofImpacts:saved.roofImpacts,duelAttempts:saved.duelAttempts,
  completed:saved.completed,elapsed:saved.elapsed,revision:saved.revision};
}
export function mission05Transition(state,event,facts={}){
 if(!state||!M05_STAGES.includes(state.stage))return {ok:false,why:'invalid-state'};
 const p=facts.position;
 const stage=state.stage;
 const gate=(yes,why)=>yes?null:{ok:false,why};
 let to=null;
 switch(event){
  case 'start':
   if(stage!=='INTRO'&&stage!=='COMPLETE')return {ok:false,why:'already-started'};
   if(!validPosition(p))return {ok:false,why:'invalid-start'};
   if(stage==='COMPLETE'){const fresh=createMission05();Object.assign(state,fresh);}
   to='SKATEPARK';break;
  case 'at-skatepark':
   if(stage!=='SKATEPARK')return {ok:false,why:'wrong-stage'};
   {const fail=gate(validPosition(p)&&flatDistance(p,facts.skate)<=14,'reach-skatepark');if(fail)return fail;}
   to='TRICK';break;
  case 'land-flip':
   if(stage!=='TRICK')return {ok:false,why:'wrong-stage'};
   if(!validPosition(p)||flatDistance(p,facts.skate)>22||facts.board!==true||facts.landed!==true)
    return {ok:false,why:'land-original-board-near-skatepark'};
   if(!Array.isArray(facts.names)||!facts.names.some(n=>typeof n==='string'&&/flip|impossible|shove/i.test(n)))
    return {ok:false,why:'requires-completed-flip'};
   if(!integer(facts.points,1,100000))return {ok:false,why:'invalid-trick-score'};
   state.flip=facts.names.filter(n=>typeof n==='string').slice(0,3).join(' + ').slice(0,80);
   state.points=Math.min(100000,state.points+facts.points);
   to='ROOFTOP';break;
  case 'at-roof':
   if(stage!=='ROOFTOP')return {ok:false,why:'wrong-stage'};
   if(!validPosition(p)||!validPosition(facts.roof)||
    flatDistance(p,facts.roof)>9||Math.abs(p.y-facts.roof.y)>.65||facts.grounded!==true)
    return {ok:false,why:'reach-real-rooftop-floor'};
   to='DUEL';break;
  case 'duel-attempt':
   if(stage!=='DUEL')return {ok:false,why:'wrong-stage'};
   state.duelAttempts=Math.min(10000,state.duelAttempts+1);state.revision++;
   return {ok:true,stage,checkpoint:false};
  case 'duel-victory':
   if(stage!=='DUEL')return {ok:false,why:'wrong-stage'};
   if(!facts.duel||facts.duel.mode!=='VICTORY'||facts.duel.outcome!=='reframer-contained'||
      !facts.duel.finisherLanded||!integer(facts.duel.roofImpacts,1,10000))
    return {ok:false,why:'requires-real-physical-reframer-impact'};
   if(!validPosition(p))return {ok:false,why:'invalid-roof-checkpoint'};
   state.roofImpacts=facts.duel.roofImpacts;to='RETURN';break;
  case 'at-home':
   if(stage!=='RETURN')return {ok:false,why:'wrong-stage'};
   if(!validPosition(p)||flatDistance(p,facts.home)>12||facts.grounded!==true||facts.duelActive===true)
    return {ok:false,why:'return-home-outside-duel'};
   to='COMPLETE';state.completed=true;break;
  default:return {ok:false,why:'unsupported-event'};
 }
 state.stage=to;state.revision++;
 if(validPosition(p))state.checkpoint=loc(p);
 return {ok:true,stage:to,checkpoint:true};
}
export function tickMission05(state,dt){
 if(!state||state.stage==='INTRO'||state.completed||!finite(dt)||dt<=0)return state;
 state.elapsed=Math.min(200000,state.elapsed+Math.min(.08,dt));return state;
}
export function saveMission05(storage,state){
 if(!storage||typeof storage.setItem!=='function'||!state||state.stage==='INTRO')return false;
 const data=createMission05(state);
 if(data.stage!==state.stage)return false;
 try{storage.setItem(M05_KEY,JSON.stringify(data));return true;}catch{return false;}
}
export function readMission05(storage){
 try{return createMission05(JSON.parse(storage?.getItem(M05_KEY)||'null'));}
 catch{return createMission05();}
}
