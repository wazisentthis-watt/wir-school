import test from 'node:test';
import assert from 'node:assert/strict';
import {createSavannahState,beginSavannah,recruitAlly,collectCitizen,evacuateCitizen,repairNode,damageBoss,damageCity,damagePlayer,citizenHit,reviveCitizen,useAlly,tickSavannah,missionCounts} from '../assets/savannah_native_core.mjs';
function setup(n=0){const s=createSavannahState();assert.equal(beginSavannah(s,n),true);return s;}
test('opt-in only: no automatic mission start',()=>{const s=createSavannahState();assert.equal(s.phase,'idle');assert.equal(beginSavannah(s,9),false);});
test('chapter 7 has 3 citizens, 2 nodes and a boss',()=>{const s=setup();assert.equal(s.bossHp,110);assert.equal(s.citizens.length,3);assert.equal(s.repairs.length,2);});
test('mission allies must match chapter and cannot be duplicated',()=>{const s=setup();assert.equal(recruitAlly(s,'Binta'),false);assert.equal(recruitAlly(s,'Ayo'),true);assert.equal(recruitAlly(s,'Ayo'),false);});
test('citizen must follow before evacuation',()=>{const s=setup();assert.equal(evacuateCitizen(s,0),false);assert.equal(collectCitizen(s,0),true);assert.equal(evacuateCitizen(s,0),true);assert.equal(evacuateCitizen(s,0),false);});
test('repairs need accumulated work',()=>{const s=setup();repairNode(s,0,.4);assert.equal(s.repairs[0].done,false);repairNode(s,0,.6);assert.equal(s.repairs[0].done,true);assert.equal(repairNode(s,0,.2),false);});
test('Binta scan enhances combat but does not bypass objectives',()=>{const s=setup();damageBoss(s,10);assert.equal(s.bossHp,100);s.weak=4;damageBoss(s,10);assert.equal(s.bossHp,84);});
test('boss alone does not complete rescue mission',()=>{const s=setup();damageBoss(s,1000);assert.equal(s.phase,'playing');for(let i=0;i<3;i++){collectCitizen(s,i);evacuateCitizen(s,i);}repairNode(s,0,1);assert.equal(s.phase,'playing');repairNode(s,1,1);assert.equal(s.phase,'complete');assert.deepEqual(s.completed,[0]);});
test('chapter 8 is separately balanced',()=>{const s=setup(1);assert.equal(s.bossHp,135);assert.equal(recruitAlly(s,'Sana'),false);assert.equal(recruitAlly(s,'Binta'),true);});
test('ally cooldown applies and expires',()=>{const s=setup();recruitAlly(s,'Sana');assert.equal(useAlly(s,'Sana'),true);assert.equal(useAlly(s,'Sana'),false);tickSavannah(s,13);assert.equal(useAlly(s,'Sana'),true);});
test('wounded citizens are recoverable',()=>{const s=setup();citizenHit(s,1,200);assert.equal(s.citizens[1].mode,'injured');assert.equal(reviveCitizen(s,1),true);assert.equal(evacuateCitizen(s,1),true);});
test('failed city can retry without stale mission meters',()=>{const s=setup();damageCity(s,999);assert.equal(s.phase,'failed');beginSavannah(s,0);assert.equal(s.city,100);damagePlayer(s,101);assert.equal(s.phase,'failed');});
test('invalid combat/repair values are rejected',()=>{const s=setup();assert.equal(damageBoss(s,NaN),false);assert.equal(repairNode(s,0,-1),false);assert.equal(damageCity(s,-12),false);});
