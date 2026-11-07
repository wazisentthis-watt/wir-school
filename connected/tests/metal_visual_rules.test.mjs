import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_STYLES,visualWorld,visualBudget,cinematicBeat,hitVolume,sweptSphereAABB,closestCollision,sceneSeed} from '../assets/metal_visual_rules.mjs';
import {CHAPTERS} from '../assets/savannah_native_core.mjs';
const O={x:0,y:0,z:0},F={x:0,z:1};
test('all eight mission bosses have original and distinct visual profiles',()=>{
 assert.equal(Object.keys(BOSS_STYLES).length,8);
 assert.equal(new Set(Object.values(BOSS_STYLES).map(v=>v.geometry)).size,8);
 for(const c of CHAPTERS)assert.ok(BOSS_STYLES[c.boss],c.boss);
});
test('city atmospheres distinguish Morrow, Savannah Riverfront and Marsh',()=>{
 assert.equal(visualWorld(CHAPTERS[2]),'morrow');
 assert.equal(visualWorld(CHAPTERS[0]),'riverfront');
 assert.equal(visualWorld(CHAPTERS[1]),'marsh');
});
test('lite visual budget retains six limbs but reduces geometry',()=>{
 const a=visualBudget(false),b=visualBudget(true);
 assert.ok(b.props<a.props);assert.ok(b.tentacleSamples<a.tentacleSamples);
 assert.ok(b.tentacleSides<a.tentacleSides);assert.equal(b.shadow,false);
});
test('cinematic beats honor wind-up, tension, initiation and end',()=>{
 assert.deepEqual([-.1,.1,1.4,2.8,4].map(cinematicBeat),['off','wind-up','tension','initiation','done']);
});
test('forward cone hits only inside the visible aim sector',()=>{
 const s=BOSS_STYLES.Ballast;
 assert.equal(hitVolume(s,O,{x:0,z:6},F),true);
 assert.equal(hitVolume(s,O,{x:0,z:-3},F),false);
 assert.equal(hitVolume(s,O,{x:7,z:0},F),false);
});
test('heat ring has a genuine safe center and dangerous outer band',()=>{
 const s=BOSS_STYLES.Kiln;
 assert.equal(hitVolume(s,O,{x:0,z:1},F),false);
 assert.equal(hitVolume(s,O,{x:0,z:6},F),true);
 assert.equal(hitVolume(s,O,{x:0,z:10},F),false);
});
test('line attack checks width and forward direction instead of spherical proximity',()=>{
 const s=BOSS_STYLES['Load Shark'];
 assert.equal(hitVolume(s,O,{x:1,z:12},F),true);
 assert.equal(hitVolume(s,O,{x:2,z:12},F),false);
 assert.equal(hitVolume(s,O,{x:0,z:-4},F),false);
});
test('radial attack checks actual Euclidean distance',()=>{
 const s=BOSS_STYLES.Patchwork;
 assert.equal(hitVolume(s,O,{x:3,z:4},F),true);
 assert.equal(hitVolume(s,O,{x:5,z:6},F),false);
});
test('swept sphere against world AABB stops before entering the building',()=>{
 const box={min:{x:5,y:0,z:-2},max:{x:8,y:6,z:2}};
 const hit=sweptSphereAABB({x:0,y:2,z:0},{x:10,y:2,z:0},.2,box);
 assert.ok(hit);assert.ok(Math.abs(hit.t-.48)<1e-9);
 assert.deepEqual(hit.normal,{x:-1,y:0,z:0});
});
test('sweep misses disjoint vertical structures and reports invalid vectors safely',()=>{
 const box={min:{x:5,y:0,z:0},max:{x:8,y:6,z:2}};
 assert.equal(sweptSphereAABB({x:0,y:12,z:0},{x:10,y:12,z:0},.1,box),null);
 assert.equal(sweptSphereAABB({x:NaN,y:1,z:0},{x:2,y:1,z:0},.2,box),null);
});
test('closest collision chooses the first object along the ray',()=>{
 const box=n=>({min:{x:n,y:0,z:-1},max:{x:n+2,y:6,z:1}});
 const h=closestCollision({x:0,y:2,z:0},{x:20,y:2,z:0},.1,[box(12),box(4)]);
 assert.ok(h);assert.ok(h.t<.25);
});
test('scene placement noise is repeatable, bounded and offline',()=>{
 assert.equal(sceneSeed(13,8),sceneSeed(13,8));
 for(let i=0;i<100;i++){const value=sceneSeed(44,i);assert.ok(value>=0&&value<=1);}
});
