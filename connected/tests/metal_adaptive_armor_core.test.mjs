import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARMOR_COST,ARMOR_DURATION,ARMOR_CAPACITY,ARMOR_FRACTION,
 createMetalArmor,activateMetalArmor,stepMetalArmor,absorbMetalDamage,metalArmorSnapshot}
 from '../assets/metal_adaptive_armor_core.mjs';

test('armor activates only after real mission unlock and finite Gallium payment',()=>{
 const s=createMetalArmor();
 assert.equal(activateMetalArmor(s,{unlocked:false,gallium:1}).reason,'not-unlocked');
 assert.equal(activateMetalArmor(s,{unlocked:true,gallium:ARMOR_COST-.001}).reason,'need-gallium');
 const x=activateMetalArmor(s,{unlocked:true,gallium:1});
 assert.equal(x.ok,true);assert.equal(x.spentGal,ARMOR_COST);
 assert.equal(s.time,ARMOR_DURATION);
 assert.equal(s.capacity,ARMOR_CAPACITY);
 assert.equal(activateMetalArmor(s,{unlocked:true,gallium:1}).reason,'already-active');
});
test('70% ordinary hit protection reduces actual HP damage and consumes armor energy',()=>{
 const s=createMetalArmor();activateMetalArmor(s,{unlocked:true,gallium:1});
 const p=absorbMetalDamage(s,.2);
 assert.ok(Math.abs(p.blocked-.2*ARMOR_FRACTION)<1e-9);
 assert.ok(Math.abs(p.remaining-.06)<1e-9);
 assert.ok(Math.abs(s.capacity-(ARMOR_CAPACITY-.14))<1e-9);
});
test('armor breaks at capacity and cannot invent negative incoming damage',()=>{
 const s=createMetalArmor();activateMetalArmor(s,{unlocked:true,gallium:1});
 const first=absorbMetalDamage(s,1);
 assert.ok(first.blocked<=ARMOR_CAPACITY);
 assert.ok(Math.abs(first.remaining-(1-ARMOR_CAPACITY))<1e-9);
 assert.equal(s.time,0);assert.ok(s.cooldown>0);
 assert.equal(absorbMetalDamage(s,.1).remaining,.1);
 assert.equal(absorbMetalDamage(s,-1).remaining,0);
 assert.equal(absorbMetalDamage(s,Infinity).remaining,0);
});
test('unarmored damage is untouched, no hidden invulnerability in baseline',()=>{
 const s=createMetalArmor();
 for(const hit of [.01,.05,.25,1]){
  const x=absorbMetalDamage(s,hit);
  assert.equal(x.remaining,hit);assert.equal(x.blocked,0);
 }
});
test('duration expires and a cooldown prevents permanent shell activation',()=>{
 const s=createMetalArmor();
 activateMetalArmor(s,{unlocked:true,gallium:1});
 for(let i=0;i<ARMOR_DURATION*12;i++)stepMetalArmor(s,.1);
 assert.equal(metalArmorSnapshot(s).active,false);
 assert.ok(s.cooldown>0);
 assert.equal(activateMetalArmor(s,{unlocked:true,gallium:1}).reason,'cooldown');
 for(let i=0;i<70;i++)stepMetalArmor(s,.1);
 assert.equal(activateMetalArmor(s,{unlocked:true,gallium:1}).ok,true);
});
test('invalid delta cannot advance or reset cooldown',()=>{
 const s=createMetalArmor();activateMetalArmor(s,{unlocked:true,gallium:1});
 const before=JSON.stringify(metalArmorSnapshot(s));
 for(const dt of [NaN,Infinity,-1,0])stepMetalArmor(s,dt);
 assert.equal(JSON.stringify(metalArmorSnapshot(s)),before);
});
test('real game routes all four health-loss paths through opt-in armor interceptor',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const world=readFileSync(new URL('../assets/metal_power_lab_world.mjs',import.meta.url),'utf8');
 assert.match(main,/function armorDamage\(dmg\)\{return metalPowerLab\?\.absorbDamage\(dmg\)\?\?dmg;\}/);
 assert.match(main,/st\.hp=Math\.max\(0,st\.hp-armorDamage\(dmg\)\)/);
 assert.match(main,/st\.hp=Math\.max\(\.02,st\.hp-armorDamage\(o\.metalDmg\)\)/);
 assert.match(main,/st\.hp=Math\.max\(\.02,st\.hp-armorDamage\(s\.dmg\*\.15\)\)/);
 assert.match(main,/st\.hp=Math\.max\(0,st\.hp-armorDamage\(s\.dmg\)\)/);
 assert.match(world,/P\.o\.add\(armorShell\)/);
 assert.match(world,/S\.galLost=Math\.min\(1,S\.galLost\+result\.spentGal\)/);
 assert.match(world,/function absorbDamage\(dmg\)/);
 assert.match(world,/armorShell\.geometry\.dispose\(\)/);
 assert.doesNotMatch(world,/wir_metal_story_v1/);
});
