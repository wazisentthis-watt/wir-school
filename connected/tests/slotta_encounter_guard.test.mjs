import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSlottaLoadout,peekReadySlot,tickSlotta} from '../assets/slotta_slots.js';
import {createSlottaAnimator,startSlottaAction,tickSlottaAnimator} from '../assets/slotta_animation_machine.js';
import {queueSlottaAttack,advanceSlottaAttackEvent,slottaCombatEligible,slottaAttackTelemetry}
 from '../assets/slotta_encounter_guard.js';

function runUntil(animator,stop,dt=.05){
 for(let i=0;i<100;i++){
  const events=tickSlottaAnimator(animator,dt);
  for(const event of events)if(stop(event))return event;
 }
 throw Error('Expected event was not emitted');
}
test('cartridge selection previews a ready power without spending cooldown',()=>{
 const loadout=createSlottaLoadout(),animator=createSlottaAnimator();
 assert.equal(peekReadySlot(loadout,0).game.id,'slither-master');
 const pending=queueSlottaAttack(loadout,animator,0);
 assert.equal(pending.id,'slither-master');
 assert.equal(pending.index,0);
 assert.equal(animator.state,'select');
 assert.equal(loadout.cooldowns[pending.id],undefined);
});
test('cooldown commits only on CAST, never during cartridge selection or telegraph',()=>{
 const loadout=createSlottaLoadout(),animator=createSlottaAnimator();
 let pending=queueSlottaAttack(loadout,animator,0);
 const selected=runUntil(animator,e=>e.type==='complete'&&e.state==='select');
 ({pending}=advanceSlottaAttackEvent(loadout,animator,pending,selected));
 assert.equal(animator.state,'slitherCast');
 assert.equal(loadout.cooldowns['slither-master'],undefined);
 const tell=runUntil(animator,e=>e.type==='telegraph');
 ({pending}=advanceSlottaAttackEvent(loadout,animator,pending,tell));
 assert.equal(loadout.cooldowns['slither-master'],undefined);
 const castMarker=runUntil(animator,e=>e.type==='cast');
 const delivered=advanceSlottaAttackEvent(loadout,animator,pending,castMarker);
 assert.equal(delivered.cast.id,'slither-master');
 assert.equal(delivered.pending,null);
 assert.equal(loadout.cooldowns['slither-master'],9);
});
test('interrupting a queued cast does not spend the cartridge and stale markers cannot execute it',()=>{
 const loadout=createSlottaLoadout(),animator=createSlottaAnimator();
 const pending=queueSlottaAttack(loadout,animator,1);
 startSlottaAction(animator,'hitHeavy',{force:true});
 // Boss event handler drops pending on hit; revision guard rejects any stale selection complete.
 const result=advanceSlottaAttackEvent(loadout,animator,pending,
  {type:'complete',state:'select',revision:pending.selectRevision-1});
 assert.equal(result.cast,null);
 assert.equal(result.pending,pending);
 assert.equal(loadout.cooldowns[pending.id],undefined);
});
test('target fleeing combat radius cancels cast without cooldown or damage',()=>{
 const loadout=createSlottaLoadout(),animator=createSlottaAnimator();
 let pending=queueSlottaAttack(loadout,animator,2);
 const selected=runUntil(animator,e=>e.type==='complete'&&e.state==='select');
 ({pending}=advanceSlottaAttackEvent(loadout,animator,pending,selected));
 const cast=runUntil(animator,e=>e.type==='cast');
 const result=advanceSlottaAttackEvent(loadout,animator,pending,cast,
  {canCast:slottaCombatEligible({range:26})});
 assert.equal(result.pending,null);assert.equal(result.cast,null);
 assert.equal(loadout.cooldowns['phantom-racer'],undefined);
});
test('held, dead, captured, escaped and out-of-range states block attacks',()=>{
 assert.equal(slottaCombatEligible({range:2,held:true}),false);
 assert.equal(slottaCombatEligible({range:2,resolved:true}),false);
 assert.equal(slottaCombatEligible({range:25}),false);
 assert.equal(slottaCombatEligible({range:24.99}),true);
 assert.equal(slottaCombatEligible({range:NaN}),false);
});
test('cooldown and round-robin avoid selecting a cartridge still charging',()=>{
 const loadout=createSlottaLoadout(),animator=createSlottaAnimator();
 loadout.cooldowns['slither-master']=5;
 let pending=queueSlottaAttack(loadout,animator,0);
 assert.equal(pending.id,'ninja-star');
 assert.equal(pending.index,1);
 assert.equal(loadout.cooldowns['slither-master'],5);
 tickSlotta(loadout,5);
 assert.equal(peekReadySlot(loadout,0).game.id,'slither-master');
});
test('attack telemetry supplies passive diagnostics without modifying timers',()=>{
 const loadout=createSlottaLoadout(),animator=createSlottaAnimator(),pending=queueSlottaAttack(loadout,animator,0);
 const sample=slottaAttackTelemetry({animator,pending,loadout});
 assert.equal(sample.queued,'slither-master');
 assert.equal(sample.selectedSlot,0);
 assert.equal(sample.state,'select');
 assert.equal(loadout.cooldowns['slither-master'],undefined);
});
test('game source gates resolution before ticking frame events and fixes prior comment leak',()=>{
 const source=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const resolved=source.indexOf('if(resolved){',source.indexOf('function updateSlottaBoss(dt){'));
 const tick=source.indexOf('const events=tickSlottaAnimator',source.indexOf('function updateSlottaBoss(dt){'));
 assert.ok(resolved>0&&resolved<tick,'resolved boss returns before frame events');
 assert.match(source,/queueSlottaAttack\(slottaConsole,slottaAnimator,slottaTurn\)/);
 assert.match(source,/advanceSlottaAttackEvent\(slottaConsole,slottaAnimator,slottaPendingGame,event/);
 assert.match(source,/window\.__game\.slottaAttack=/);
 assert.ok(!source.includes('bob.\\nconst slottaSteady'));
 assert.match(source,/const slottaSteady=a\.kind==='slotta'/);
});
