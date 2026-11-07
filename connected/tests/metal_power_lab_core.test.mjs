import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METAL_POWER_REGISTRY,METAL_POWER_GROUPS,abilityById,registryCounts} from '../assets/metal_power_registry_73.mjs';
import {makePowerLab,powerLabSave,powerLabSnapshot,stepPowerLab,applyPowerLab,
 POWER_LAB_PICKUP_IDS,POWER_LAB_COST,POWER_LAB_SAVE_KEY} from '../assets/metal_power_lab_core.mjs';

const cast=(s,action,x={})=>applyPowerLab(s,action,x);
function ready(){const s=makePowerLab();
 for(const id of POWER_LAB_PICKUP_IDS.slice(0,2))assert.equal(cast(s,'collect',{id,distance:2}).ok,true);
 assert.equal(s.stage,1);
 assert.equal(cast(s,'reinforce',{id:'district-support',distance:2,gallium:1}).ok,true);
 assert.equal(s.stage,2);
 assert.equal(cast(s,'build',{distance:4.5,grounded:true,point:{x:4,z:5},gallium:1}).ok,true);
 assert.equal(s.stage,3);return s;
}
test('73 unique indexed owner powers, stable family bounds, no fabricated "all playable"',()=>{
 assert.equal(METAL_POWER_REGISTRY.length,73);
 assert.deepEqual(METAL_POWER_GROUPS.map(g=>g.end),[10,30,45,56,73]);
 assert.deepEqual(METAL_POWER_REGISTRY.map(x=>x.id),Array.from({length:73},(_,i)=>i+1));
 assert.equal(new Set(METAL_POWER_REGISTRY.map(x=>x.name)).size,73);
 assert.equal(abilityById(57).name,'Gorillium / Galaxy RIFFT Beast');
 assert.equal(abilityById(73).name,'Advanced RIFFT Flight');
 assert.equal(abilityById(74),null);assert.equal(abilityById('1'),null);
 assert.equal(registryCounts().total,73);
 assert.ok(registryCounts()['design-only']>35);
 assert.ok(METAL_POWER_REGISTRY.filter(x=>x.status==='opt-in-lab').every(x=>!!x.action));
});
test('salvage requires original source ID and distance; cannot duplicate or fabricate',()=>{
 const s=makePowerLab();
 assert.equal(cast(s,'collect',{id:'random',distance:0}).reason,'invalid-source');
 assert.equal(cast(s,'collect',{id:'salvage-a',distance:12}).reason,'too-far');
 assert.equal(cast(s,'collect',{id:'salvage-a',distance:2}).ok,true);
 assert.equal(cast(s,'collect',{id:'salvage-a',distance:2}).reason,'already-collected');
 assert.equal(s.scrap,1);assert.equal(s.stage,0);
});
test('mission progression requires salvage -> structural repair -> construction -> movement',()=>{
 const s=makePowerLab();
 assert.equal(cast(s,'reinforce',{id:'district-support',distance:1,gallium:1}).reason,'not-unlocked');
 assert.equal(cast(s,'build',{distance:4,grounded:true,point:{x:2,z:2},gallium:1}).reason,'not-unlocked');
 const readyS=ready();
 assert.equal(readyS.scrap,0);
 const result=cast(readyS,'snap-step',{grounded:true,dir:{x:1,z:0}});
 assert.equal(result.ok,true);assert.equal(result.impulse.x,5);
 assert.equal(readyS.stage,4);
 assert.equal(readyS.focus,1-POWER_LAB_COST.step);
});
test('finite real Gallium spending, repeat impacts and damaged material reclamation',()=>{
 const s=ready(),id=s.structures[0].id;
 assert.equal(cast(s,'impact',{id,distance:2}).ok,true);
 assert.equal(cast(s,'impact',{id,distance:2}).ok,true);
 const remain=s.structures[0].integrity;assert.ok(remain>.3&&remain<.4);
 const reclaim=cast(s,'reclaim',{id,distance:2});
 assert.equal(reclaim.ok,true);
 assert.ok(Math.abs(reclaim.returnedGal-(POWER_LAB_COST.build*.8*remain))<1e-10);
 assert.equal(s.structures.length,0);
 assert.equal(cast(s,'reclaim',{id,distance:2}).reason,'no-structure');
});
test('negative, malformed and insufficient balances fail without side effects',()=>{
 const s=ready();const prev=JSON.stringify(powerLabSave(s));
 assert.equal(cast(s,'build',{grounded:true,distance:4,point:{x:20,z:10},gallium:0}).reason,'need-salvage');
 assert.equal(cast(s,'snap-step',{grounded:false,dir:{x:1,z:1}}).reason,'must-be-grounded');
 assert.equal(cast(s,'snap-step',{grounded:true,dir:{x:NaN,z:1}}).reason,'invalid-direction');
 assert.equal(cast(s,'impact',{id:-1,distance:0}).reason,'no-structure');
 assert.equal(cast(s,'unknown',{}).reason,'unknown-action');
 assert.equal(JSON.stringify(powerLabSave(s)),prev);
});
test('Focus drain, regen and cooldowns use clamped physics steps',()=>{
 const s=ready();
 assert.equal(cast(s,'scan',{}).ok,true);
 assert.equal(cast(s,'scan',{}).reason,'cooldown');
 assert.equal(cast(s,'snap-step',{grounded:true,dir:{x:1,z:0}}).ok,true);
 assert.equal(cast(s,'snap-step',{grounded:true,dir:{x:1,z:0}}).reason,'cooldown');
 const before=s.focus;stepPowerLab(s,Infinity);assert.equal(s.focus,before);
 stepPowerLab(s,5);assert.ok(s.focus>before&&s.focus-before<.004);
 for(let i=0;i<32;i++)stepPowerLab(s,.1);
 assert.equal(s.cooldownScan,0);
 assert.equal(s.cooldownStep,0);
});
test('legitimate mission completion survives reclaiming the finished physical construction',()=>{
 const s=ready();cast(s,'snap-step',{grounded:true,dir:{x:0,z:1}});
 assert.equal(s.stage,4);
 cast(s,'reclaim',{id:s.structures[0].id,distance:1});
 const z=makePowerLab(JSON.parse(JSON.stringify(powerLabSave(s))));
 assert.equal(z.stage,4);
 assert.equal(z.builtOnce,true);
 assert.equal(z.structures.length,0);
});
test('round-trip saves are private, bounded, and preserve distinct material state',()=>{
 const s=ready(),s2=makePowerLab(powerLabSave(s));
 assert.equal(POWER_LAB_SAVE_KEY,'wir_metal_power_lab_v1');
 assert.deepEqual(powerLabSave(s2),powerLabSave(s));
 assert.equal(powerLabSnapshot(s2).unlocks.snapStep,true);
 assert.equal(powerLabSnapshot(s2).structures[0].integrity,1);
});
test('corrupt saves ignore unknown source IDs and invalid collision coordinates',()=>{
 const s=makePowerLab({version:1,stage:4,collected:['salvage-a','salvage-a','fake'],
  scrap:999,structures:[{id:1,type:'panel',pos:{x:Infinity,z:4},integrity:1},
  {id:2,type:'panel',pos:{x:2,z:2},integrity:.45}],builtOnce:true,
  supportIntegrity:NaN,focus:-100});
 assert.equal(s.stage,0);assert.equal(s.scrap,5);
 assert.deepEqual(s.collected,['salvage-a']);
 assert.equal(s.structures.length,1);assert.equal(s.focus,0);
});
test('structure spawn range and physically grounded rules cannot be bypassed',()=>{
 const s=makePowerLab({version:1,collected:['salvage-a','salvage-b','salvage-c','salvage-d','salvage-e'],stage:2,scrap:5,supportIntegrity:1});
 assert.equal(cast(s,'build',{gallium:1,distance:4,grounded:false,point:{x:1,z:2}}).reason,'must-be-grounded');
 assert.equal(cast(s,'build',{gallium:1,distance:4,grounded:true,point:{x:900,z:2}}).reason,'invalid-placement');
 assert.equal(cast(s,'build',{gallium:.09,distance:4,grounded:true,point:{x:3,z:3}}).reason,'need-gallium');
 assert.equal(cast(s,'build',{gallium:1,distance:1,grounded:true,point:{x:3,z:3}}).reason,'bad-placement-range');
});
test('irrecoverable Gallium accounting survives reload and prevents free material',()=>{
 const s=ready();
 assert.equal(s.galLost,POWER_LAB_COST.reinforce);
 const source=s.structures[0];
 const recover=cast(s,'reclaim',{id:source.id,distance:2});
 assert.equal(recover.ok,true);
 const loss=POWER_LAB_COST.reinforce+POWER_LAB_COST.build-recover.returnedGal;
 assert.ok(Math.abs(s.galLost-loss)<1e-10);
 const restored=makePowerLab(powerLabSave(s));
 assert.ok(Math.abs(restored.galLost-loss)<1e-10);
 assert.equal(restored.structures.length,0);
 assert.equal(restored.builtOnce,true);
});
test('separate lab module remains opt-in; no default UI, movement solver or save replacement',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../assets/metal_power_lab_world.mjs',import.meta.url),'utf8');
 assert.match(main,/get\('metal_abilities'\)==='1'/);
 assert.match(main,/metalPowerLab=mountMetalPowerLab/);
 assert.match(main,/metalPowerLab\?\.tick\(dt\)/);
 assert.match(main,/function updateMetalStory\(dt\)/);
 assert.match(main,/function skateGround\(dt,wish,il\)/);
 assert.match(main,/function floorAt\(p\)/);
 assert.match(world,/colliders\.push\(box\)/);
 assert.match(world,/storage\?\.setItem\(POWER_LAB_SAVE_KEY/);
 assert.doesNotMatch(world,/['"]wir_metal_story_v1['"]/);
});
