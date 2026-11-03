// SLOTTA pre-rig action timeline. Pure deterministic state transitions and animation markers.
// No Three.js dependencies. Visual design and new combat timings: PROPOSAL / HOLD.
export const SLOTTA_ACTIONS=Object.freeze({
 idle:{duration:Infinity,loop:true,priority:0,markers:[]},
 walking:{duration:Infinity,loop:true,priority:0,markers:[]},
 strafe:{duration:Infinity,loop:true,priority:0,markers:[]},
 intro:{duration:1.40,priority:2,markers:[{at:.44,type:'phatom-open'}]},
 select:{duration:.65,priority:2,markers:[{at:.28,type:'cartridge-select'}]},
 swap:{duration:.86,priority:2,markers:[{at:.42,type:'cartridge-swap'}]},
 slitherCast:{duration:1.05,priority:4,markers:[{at:.19,type:'telegraph'},{at:.58,type:'cast'}]},
 ninjaSummon:{duration:1.13,priority:4,markers:[{at:.19,type:'telegraph'},{at:.65,type:'cast'}]},
 phantomDash:{duration:.94,priority:5,markers:[{at:.16,type:'telegraph'},{at:.52,type:'cast'},{at:.76,type:'dash-end'}]},
 legacyCast:{duration:.78,priority:3,markers:[{at:.2,type:'telegraph'},{at:.47,type:'cast'}]},
 hitLight:{duration:.37,priority:7,markers:[]},
 hitHeavy:{duration:.70,priority:8,markers:[]},
 galliumHeld:{duration:Infinity,priority:10,markers:[]},
 knockdown:{duration:1.00,priority:9,markers:[{at:.85,type:'land'}]},
 getUp:{duration:.85,priority:9,markers:[]},
 taunt:{duration:1.25,priority:1,markers:[]},
 victory:{duration:Infinity,priority:20,markers:[]}
});
export const SLOTTA_SLOT_ACTIONS=Object.freeze({
 'slither-master':'slitherCast','ninja-star':'ninjaSummon','phantom-racer':'phantomDash'
});
export const SLOTTA_RIG_CLIPS=Object.freeze({
 idle:'Idle',walking:'Walk',strafe:'Strafe',intro:'BossIntro',select:'CartridgeSelect',swap:'CartridgeSwap',
 slitherCast:'SlitherCast',ninjaSummon:'NinjaSummon',phantomDash:'PhantomDash',legacyCast:'LegacyCast',
 hitLight:'HitLight',hitHeavy:'HitHeavy',galliumHeld:'GalliumHeld',knockdown:'Knockdown',
 getUp:'GetUp',taunt:'Taunt',victory:'Victory'
});
export function createSlottaAnimator(initial='idle'){
 if(!SLOTTA_ACTIONS[initial])throw new Error('Invalid SLOTTA animation '+initial);
 return {state:initial,time:0,revision:0,completed:0};
}
export function canStartSlottaAction(controller,name,{force=false}={}){
 if(!SLOTTA_ACTIONS[name])return false;
 if(force)return true;
 const prev=SLOTTA_ACTIONS[controller.state];
 if(controller.state==='victory')return false;
 if(name===controller.state)return false;
 return prev.loop||SLOTTA_ACTIONS[name].priority>prev.priority;
}
export function startSlottaAction(controller,name,opts={}){
 if(!canStartSlottaAction(controller,name,opts))return false;
 controller.state=name;controller.time=0;controller.revision++;
 return true;
}
export function tickSlottaAnimator(controller,dt){
 if(!Number.isFinite(dt)||dt<=0)return [];
 const cfg=SLOTTA_ACTIONS[controller.state];
 if(!Number.isFinite(cfg.duration))return [];
 const before=controller.time,after=Math.min(cfg.duration,before+Math.min(dt,.25));
 const events=cfg.markers.filter(m=>m.at>before&&m.at<=after).map(m=>({...m,state:controller.state,revision:controller.revision}));
 controller.time=after;
 if(controller.time>=cfg.duration){
  const ended=controller.state;controller.completed++;
  controller.state='idle';controller.time=0;controller.revision++;
  events.push({type:'complete',state:ended,revision:controller.revision-1});
 }
 return events;
}
export function slottaAnimationSnapshot(controller){
 const cfg=SLOTTA_ACTIONS[controller.state];
 return {state:controller.state,progress:Number.isFinite(cfg.duration)?Math.min(1,controller.time/cfg.duration):0,
  time:controller.time,locked:!cfg.loop,revision:controller.revision};
}
export function slottaAnimationForGame(id){return SLOTTA_SLOT_ACTIONS[id]||'legacyCast';}
