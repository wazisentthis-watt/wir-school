// SLOTTA attack delivery contract. Deterministic, independent of Three.js.
// Picking/animating a cartridge does NOT consume its cooldown. The cooldown
// begins only when the animation reaches its uninterruptible cast marker.
// Status: combat logic proposal, character visuals PROPOSAL/HOLD.
import {peekReadySlot,activateSlot} from './slotta_slots.js';
import {startSlottaAction,slottaAnimationForGame} from './slotta_animation_machine.js';

export function queueSlottaAttack(loadout,animator,startIndex=0){
 const selected=peekReadySlot(loadout,startIndex);
 if(!selected||!startSlottaAction(animator,'select'))return null;
 return {id:selected.game.id,index:selected.index,selectRevision:animator.revision,castRevision:null};
}
export function advanceSlottaAttackEvent(loadout,animator,pending,event,{canCast=true}={}){
 if(!pending||!event)return {pending:pending||null,cast:null};
 // Revision prevents stale "complete" and "cast" events from a previous
 // interrupted animation from launching an entirely different cartridge.
 if(event.type==='complete'&&event.state==='select'&&event.revision===pending.selectRevision){
  const action=slottaAnimationForGame(pending.id);
  if(!startSlottaAction(animator,action,{force:true}))return {pending:null,cast:null};
  return {pending:{...pending,castRevision:animator.revision},cast:null};
 }
 if(event.type==='cast'&&pending.castRevision===event.revision&&
    event.state===slottaAnimationForGame(pending.id)){
  // If Metal escaped, grappled the boss, or ended the mission, the cast is
  // cancelled without burning the selected power's cooldown.
  if(!canCast)return {pending:null,cast:null};
  if(loadout.active[pending.index]!==pending.id)return {pending:null,cast:null};
  const cast=activateSlot(loadout,pending.index);
  return {pending:null,cast:cast?.id===pending.id?cast:null};
 }
 return {pending,cast:null};
}
export function slottaCombatEligible({resolved=false,held=false,range=Infinity,limit=25}={}){
 return !resolved&&!held&&Number.isFinite(range)&&range<limit;
}
export function slottaAttackTelemetry({animator,pending,loadout}){
 return {state:animator?.state||'idle',queued:pending?.id||null,
  selectedSlot:pending?.index??null,active:[...(loadout?.active||[])],
  cooldowns:{...(loadout?.cooldowns||{})}};
}
