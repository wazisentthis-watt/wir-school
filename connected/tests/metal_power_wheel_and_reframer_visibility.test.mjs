import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POWER_FAMILIES,wheelAbilities,wheelAvailability,wheelAction,normalizedChoice}
 from '../assets/metal_power_wheel_core.mjs';
import {METAL_POWER_REGISTRY} from '../assets/metal_power_registry_73.mjs';
const a=id=>METAL_POWER_REGISTRY[id-1];
const snapshot=stage=>({stage,unlocks:{scan:true,collect:true,
  reinforce:stage>=1,build:stage>=2,snapStep:stage>=3,reclaim:true,impact:stage>=2}});
test('eight wheel families cover each of 73 owner catalog entries exactly once',()=>{
 assert.equal(POWER_FAMILIES.length,8);
 const ids=POWER_FAMILIES.flatMap(f=>wheelAbilities(f.id).map(x=>x.id));
 assert.equal(ids.length,73);
 assert.equal(new Set(ids).size,73);
 assert.deepEqual(ids.slice().sort((x,y)=>x-y),Array.from({length:73},(_,i)=>i+1));
});
test('GTA wheel uses real source ability names, not 73 fake cast buttons',()=>{
 assert.equal(wheelAbilities('forms').some(x=>x.id===57),true);
 assert.equal(wheelAbilities('rifft').some(x=>x.id===59),true);
 assert.equal(wheelAbilities('forge').some(x=>x.id===23),true);
 assert.equal(wheelAbilities('neural').some(x=>x.id===2),true);
 assert.equal(wheelAbilities('missing').length,0);
});
test('power selector routes exact real material, armor, scan and impulse actions',()=>{
 assert.equal(wheelAction(a(2).action),'snap-step');
 assert.equal(wheelAction(a(4).action),'scan');
 assert.equal(wheelAction(a(11).action),'build');
 assert.equal(wheelAction(a(12).action),'armor');
 assert.equal(wheelAction(a(18).action),'reinforce');
 assert.equal(wheelAction(a(23).action),'reclaim');
 assert.equal(wheelAction('teleport-the-city'),null);
});
test('mission progression gates armor, construction, reinforcement and Snap Step',()=>{
 assert.equal(wheelAvailability(a(2),snapshot(0)).state,'locked');
 assert.equal(wheelAvailability(a(12),snapshot(0)).state,'locked');
 assert.equal(wheelAvailability(a(18),snapshot(0)).state,'locked');
 assert.equal(wheelAvailability(a(4),snapshot(0)).action,'scan');
 assert.equal(wheelAvailability(a(18),snapshot(1)).action,'reinforce');
 assert.equal(wheelAvailability(a(12),snapshot(2)).action,'armor');
 assert.equal(wheelAvailability(a(11),snapshot(2)).action,'build');
 assert.equal(wheelAvailability(a(2),snapshot(3)).action,'snap-step');
});
test('unimplemented Gorillium, Lion Metal and invented flight remain disabled',()=>{
 for(const id of [57,58,60,63,68,73]){
  const st=wheelAvailability(a(id),snapshot(4));
  assert.equal(st.action,null);assert.equal(st.state,'future');
 }
 assert.equal(wheelAvailability(a(40),snapshot(4)).state,'partial');
 assert.equal(wheelAvailability(a(40),snapshot(4)).action,null);
});
test('selector fails closed when experimental lab is absent',()=>{
 assert.equal(wheelAvailability(a(2),null).state,'unavailable');
 assert.equal(wheelAvailability(a(12),null).action,null);
 assert.deepEqual(normalizedChoice(-1,-1),{familyIndex:7,abilityIndex:9});
 assert.deepEqual(normalizedChoice(8,20),{familyIndex:0,abilityIndex:0});
});
test('touch/control adapter and visibility affordances are gated, while ordinary Savannah remains intact',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../assets/reframer_squad_world.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../assets/metal_power_wheel.mjs',import.meta.url),'utf8');
 assert.match(main,/metalPowerWheel=mountMetalPowerWheel/);
 assert.match(main,/metalPowerWheel\?\.pollGamepad\(gp,dt\)/);
 assert.match(main,/onShortBack:\(\)=>\{pressed\.KeyM=true;\}/);
 assert.match(main,/window\.__game\.startReframerSighting=/);
 assert.match(world,/function startSighting\(\)/);
 assert.match(world,/reframerSightingButton/);
 assert.match(world,/status\.textContent=enc\.length/);
 assert.match(world,/colliders\.some\(b=>/);
 assert.match(world,/c\.userData\?\.reframed/);
 assert.match(world,/createReframers\(\[/);
 assert.match(ui,/metalPowerWheelDialog/);
 assert.match(ui,/overlay\.style\.display=open\?'flex':'none'/);
 assert.match(ui,/window\.addEventListener\('keydown',keydown,true\)/);
 assert.match(ui,/function pollGamepad\(gp,dt=1\/60\)/);
 assert.doesNotMatch(ui,/wir_metal_story_v1/);
});
