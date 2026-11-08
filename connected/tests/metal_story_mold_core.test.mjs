import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METAL_MOLD_KEY,METAL_MOLD_VERSION,METAL_SEASON_ARCS,METAL_SEASON_30,
 METAL_SERIES_LOCKS,FIRST_PUSH,FINAL_BEATS,finaleGate,createMetalMold,
 metalMoldSnapshot,attemptFirstPush,saveMetalMold,loadMetalMold}
 from '../assets/metal_story_mold_core.mjs';

test('story spine preserves September 30-episode season, ordered as 5 six-episode arcs',()=>{
 assert.equal(METAL_MOLD_VERSION,1);
 assert.equal(METAL_SEASON_30.length,30);
 assert.equal(new Set(METAL_SEASON_30.map(x=>x.id)).size,30);
 assert.deepEqual(METAL_SEASON_ARCS.map(x=>x.last-x.first+1),[6,6,6,6,6]);
 assert.equal(METAL_SEASON_30[0].title,'Concrete Has a Tempo');
 assert.equal(METAL_SEASON_30[0].albumStem,'First Push');
 assert.equal(METAL_SEASON_30[11].title,'Socket Weather');
 assert.equal(METAL_SEASON_30[17].title,'Every Floor Becomes a Ceiling');
 assert.equal(METAL_SEASON_30[28].title,'Return Integrity');
 assert.equal(METAL_SEASON_30[29].title,'Everybody Out');
 assert.equal(METAL_SEASON_30[29].albumStem,'City Under My Wheels');
 assert.equal(METAL_SEASON_30[29].opposition,'The Foreman');
});
test('never rewrite Second Thought or before-Gallium prosthetic/choice canon',()=>{
 assert.match(METAL_SERIES_LOCKS.prosthetic,/LEFT.*16.*predates/);
 assert.match(METAL_SERIES_LOCKS.origin,/chooses life BEFORE Gallium/);
 assert.match(METAL_SERIES_LOCKS.board,/Four actual wheels/);
 assert.match(METAL_SERIES_LOCKS.movement,/not teleportation/);
 assert.match(METAL_SERIES_LOCKS.character,/autonomous/);
});
test('exact finale requires people evacuated, team agency, physical Return and the catch, not boss health',()=>{
 assert.equal(FINAL_BEATS.length,7);
 const none=finaleGate({});
 assert.equal(none.ok,false);assert.equal(none.missing.length,9);
 const proof=Object.fromEntries(none.required.map(x=>[x,true]));
 assert.equal(finaleGate(proof).ok,true);
 for(const k of none.required){
  const bad={...proof,[k]:false};assert.equal(finaleGate(bad).ok,false,'Missing real evidence '+k);
  assert.ok(finaleGate(bad).missing.includes(k));
 }
 assert.equal(finaleGate({bossHp:0}).ok,false);
});
test('first playable First Push beat needs proximity, real board, ground, genuine roll',()=>{
 const s=createMetalMold(),skatepark={x:-70,z:0};
 const facts={position:{x:-66,z:2},skatepark,board:true,grounded:true,speed:2.1};
 assert.equal(attemptFirstPush(s,{...facts,position:{x:0,z:0}}).reason,'reach-the-skatepark');
 assert.equal(attemptFirstPush(s,{...facts,board:false}).reason,'equip-the-real-four-wheel-board');
 assert.equal(attemptFirstPush(s,{...facts,grounded:false}).reason,'land-your-board');
 assert.equal(attemptFirstPush(s,{...facts,speed:.1}).reason,'roll-across-a-seam');
 const success=attemptFirstPush(s,facts);
 assert.equal(success.ok,true);assert.equal(success.track,'First Push');
 assert.equal(success.completedEpisode,false);
 assert.deepEqual(success.unlockedAbilityIds,[]);
 assert.equal(s.firstPush,true);assert.equal(s.epoch,1);
 assert.equal(attemptFirstPush(s,facts).reason,'already-recorded');
 assert.equal(metalMoldSnapshot(s).finaleUnlocked,false);
});
test('new story mold cannot manufacture completed season one episodes or finale',()=>{
 const saved={version:1,firstPush:true,recordedStems:['First Push','City Under My Wheels'],
  episodeProgress:{s1e30:'COMPLETE'},finaleUnlocked:true};
 const s=createMetalMold(saved);
 assert.deepEqual(s.recordedStems,['First Push']);
 const view=metalMoldSnapshot(s);
 assert.equal(view.episodeProgress.s1e30,undefined);
 assert.equal(view.finaleUnlocked,false);
 assert.equal(view.finaleStatus,'planned-and-gated-not-playable');
 assert.equal(METAL_SEASON_30.filter(x=>x.playableStatus!=='design-only').length,1);
});
test('saves isolate existing story v1 and recover safely from malformed storage',()=>{
 const store=new Map([['wir_metal_story_v1','DO_NOT_TOUCH_OR_MIGRATE']]);
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const s=createMetalMold();const near={position:{x:2,z:1},skatepark:{x:0,z:0},board:true,grounded:true,speed:1};
 assert.equal(attemptFirstPush(s,near).ok,true);
 assert.equal(saveMetalMold(storage,s),true);
 assert.equal(store.get('wir_metal_story_v1'),'DO_NOT_TOUCH_OR_MIGRATE');
 const got=loadMetalMold(storage);
 assert.equal(got.firstPush,true);assert.deepEqual(got.recordedStems,['First Push']);
 assert.equal(JSON.parse(store.get(METAL_MOLD_KEY)).version,1);
 store.set(METAL_MOLD_KEY,'not json');
 assert.equal(loadMetalMold(storage).firstPush,false);
 assert.equal(saveMetalMold({setItem:()=>{throw Error('quota')}},s),false);
});
test('Game adapter mounts only behind explicit campaign query and retains original player/physics owner',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../assets/metal_story_mold_world.mjs',import.meta.url),'utf8');
 assert.match(main,/get\('metal_campaign'\)==='1'/);
 assert.match(main,/metalStoryMold=mountMetalStoryMold/);
 assert.match(main,/metalStoryMold\?\.tick\(dt\)/);
 assert.match(main,/legacyStory:\(\)=>metalStoryChapter\(metalStory\)/);
 assert.match(ui,/FIRST_PUSH/);
 assert.match(ui,/attemptFirstPush\(S,state\(\)\)/);
 assert.match(ui,/metalStoryMoldToggle/);
 assert.match(ui,/metalStoryFinalePreview/);
 assert.match(ui,/classList\.add\('wir-keep'\)/);
 assert.doesNotMatch(ui,/writeMetalCheckpoint\(/);
 assert.doesNotMatch(ui,/advanceMetalStory\(/);
 assert.doesNotMatch(ui,/get\('metal_abilities'\)/);
});
