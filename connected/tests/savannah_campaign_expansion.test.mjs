import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,CAMPAIGN_ORDER,createSavannahState,beginSavannah,damageBoss,repairNode,scanBoss,bossPressure,collectCitizen,evacuateCitizen,tickSavannah} from '../assets/savannah_native_core.mjs';
function mission(index){const s=createSavannahState();assert.equal(beginSavannah(s,index),true);return s;}
test('Eight chapters play in chronological order without changing original 07 and 08 IDs',()=>{
 assert.equal(CHAPTERS.length,8);assert.deepEqual(CAMPAIGN_ORDER,[2,3,4,5,6,7,0,1]);
 assert.deepEqual(CAMPAIGN_ORDER.map(i=>CHAPTERS[i].title.slice(0,2)),['01','02','03','04','05','06','07','08']);
});
test('Every named antagonist has unique mission identity',()=>{
 assert.equal(new Set(CHAPTERS.map(c=>c.boss)).size,8);
 for(const i of CAMPAIGN_ORDER)assert.match(CHAPTERS[i].title,/^0[1-8] · /);
});
test('Foreman mission has a longer evacuation and more repair sites',()=>{
 const s=mission(7);assert.equal(s.citizens.length,4);assert.equal(s.repairs.length,3);assert.equal(s.bossHp,185);
});
test('Ballast brace armor is meaningfully weaker when scanned',()=>{
 const s=mission(2);damageBoss(s,20);assert.equal(s.bossHp,103);
 assert.equal(scanBoss(s),true);damageBoss(s,20);assert.ok(s.bossHp<72);
});
test('Kiln heats city during an attack; repairs mitigate pressure',()=>{
 const s=mission(3);bossPressure(s,false,false);const before=s.city;repairNode(s,0,1);bossPressure(s,false,false);assert.ok(s.city<before+12);});
test('Glassjaw coatings respond to scan, not a free permanent weakness',()=>{
 const s=mission(4);damageBoss(s,10);const a=s.bossHp;scanBoss(s);damageBoss(s,10);const b=s.bossHp;
 assert.ok(a-b>10);tickSavannah(s,8);assert.equal(s.weak,0);
});
test('Patchwork jams repair controls during his attack window',()=>{
 const s=mission(5);bossPressure(s,true,false);assert.equal(s.jammed,3);tickSavannah(s,2);assert.equal(s.jammed,1);
});
test('Load Shark returns reckless force to the city, scan avoids backlash',()=>{
 const s=mission(6);damageBoss(s,15);const city=s.city;assert.ok(city<100);
 scanBoss(s);damageBoss(s,15);assert.equal(s.city,city);
});
test('Foreman armored until structures repaired',()=>{
 const s=mission(7);damageBoss(s,30);const first=185-s.bossHp;
 for(let i=0;i<3;i++)repairNode(s,i,1);damageBoss(s,30);const second=185-first-s.bossHp;assert.ok(second>first);
});
test('Boss telegraph is zeroed on mission reset',()=>{const s=mission(5);s.bossTelegraph=2;beginSavannah(s,6);assert.equal(s.bossTelegraph,0);});
test('Original 07/08 Savannah still let allies rescue citizens',()=>{const s=mission(0);collectCitizen(s,0);evacuateCitizen(s,0);assert.equal(s.citizens[0].mode,'safe');assert.deepEqual(CHAPTERS[0].allies,['Ayo','Sana']);});
test('All eight missions can satisfy rescue, repair and boss requirements',()=>{
 for(const i of CAMPAIGN_ORDER){const s=mission(i);for(const c of s.citizens){collectCitizen(s,c.id);evacuateCitizen(s,c.id);}for(const r of s.repairs)repairNode(s,r.id,1);damageBoss(s,1e6);assert.equal(s.phase,'complete',CHAPTERS[i].title);}
});
