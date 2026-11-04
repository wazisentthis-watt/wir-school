import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M05_SCHEMA,M05_KEY,M05_STAGES,createMission05,mission05Transition,
 tickMission05,validPosition,readMission05,saveMission05} from '../assets/metal_rooftop_pursuit_core.mjs';
import {createRooftopDuel,duelAction,stepRooftopDuel} from '../assets/metal_aerial_duel_core.mjs';
const skate={x:-56,y:.25,z:0},roof={x:0,y:11.8,z:56},home={x:0,y:.25,z:0};
const at=(x,y,z)=>({x,y,z});
const start=()=>{const s=createMission05();assert.equal(mission05Transition(s,'start',{position:home}).ok,true);return s};
const toTrick=s=>assert.equal(mission05Transition(s,'at-skatepark',{position:skate,skate}).ok,true);
const toRoof=s=>{toTrick(s);assert.equal(mission05Transition(s,'land-flip',
 {position:skate,skate,board:true,landed:true,names:['Kickflip'],points:150}).ok,true)};
const toDuel=s=>{toRoof(s);assert.equal(mission05Transition(s,'at-roof',
 {position:roof,roof,grounded:true}).ok,true)};
test('Mission 05 starts as a separate opt-in story state with five real objectives',()=>{
 const m=createMission05();assert.equal(m.stage,'INTRO');assert.equal(m.schema,M05_SCHEMA);
 assert.equal(M05_STAGES.length,7);assert.equal(m.checkpoint,null);
 const started=mission05Transition(m,'start',{position:home});
 assert.equal(started.stage,'SKATEPARK');assert.deepEqual(m.checkpoint,home);
});
test('cannot skip physical journey to skatepark',()=>{
 const m=start();assert.equal(mission05Transition(m,'at-skatepark',{position:home,skate}).ok,false);
 assert.equal(m.stage,'SKATEPARK');toTrick(m);assert.equal(m.stage,'TRICK');
});
test('only landed original-board flip near Skatepark advances',()=>{
 const m=start();toTrick(m);
 const claim={position:skate,skate,board:true,landed:true,names:['Kickflip'],points:150};
 for(const patch of [
  {board:false},{landed:false},{names:['Ollie']},{position:home},
  {points:0},{names:[]},{points:Infinity}
 ]){assert.equal(mission05Transition(m,'land-flip',{...claim,...patch}).ok,false);
    assert.equal(m.stage,'TRICK');}
 assert.equal(mission05Transition(m,'land-flip',claim).ok,true);
 assert.equal(m.stage,'ROOFTOP');assert.equal(m.flip,'Kickflip');assert.equal(m.points,150);
});
test('physical roof entry must be landed, finite and above floor',()=>{
 const m=start();toRoof(m);
 for(const patch of [
  {grounded:false},{position:at(0,.25,56)},{position:at(17,11.8,56)},
  {position:at(0,10.9,56)},{position:at(0,Infinity,56)}
 ]){
  const claim={position:roof,roof,grounded:true,...patch};
  assert.equal(mission05Transition(m,'at-roof',claim).ok,false);
 }
 assert.equal(mission05Transition(m,'at-roof',{position:roof,roof,grounded:true}).stage,'DUEL');
});
test('trick press or enemy defeat alone cannot skip validated aerial impact',()=>{
 const m=start();toDuel(m);
 const p={position:roof,duel:{mode:'VICTORY',outcome:'reframer-contained',finisherLanded:true,roofImpacts:1}};
 for(const d of [{mode:'ACTIVE'},{outcome:'enemy-gone'},{finisherLanded:false},{roofImpacts:0},
 {roofImpacts:-1},{roofImpacts:Infinity}]){
  assert.equal(mission05Transition(m,'duel-victory',{...p,duel:{...p.duel,...d}}).ok,false);
 }
 assert.equal(mission05Transition(m,'duel-attempt').ok,true);
 assert.equal(m.duelAttempts,1);
 assert.equal(mission05Transition(m,'duel-victory',p).stage,'RETURN');
});
test('mission finishes only on physically returning home outside active duel',()=>{
 const m=start();toDuel(m);
 assert.equal(mission05Transition(m,'duel-victory',{position:roof,
 duel:{mode:'VICTORY',outcome:'reframer-contained',finisherLanded:true,roofImpacts:2}}).ok,true);
 assert.equal(mission05Transition(m,'at-home',{position:roof,home,grounded:true}).ok,false);
 assert.equal(mission05Transition(m,'at-home',{position:home,home,grounded:false}).ok,false);
 assert.equal(mission05Transition(m,'at-home',{position:home,home,grounded:true,duelActive:true}).ok,false);
 assert.equal(mission05Transition(m,'at-home',{position:home,home,grounded:true,duelActive:false}).stage,'COMPLETE');
 assert.equal(m.completed,true);
});
test('replay resets only isolated mission state, not external Metal checkpoint',()=>{
 const s=start();toDuel(s);
 mission05Transition(s,'duel-victory',{position:roof,duel:{mode:'VICTORY',outcome:'reframer-contained',finisherLanded:true,roofImpacts:1}});
 mission05Transition(s,'at-home',{position:home,home,grounded:true,duelActive:false});
 assert.equal(s.completed,true);
 const replay=mission05Transition(s,'start',{position:home});
 assert.equal(replay.stage,'SKATEPARK');assert.equal(s.points,0);assert.equal(s.completed,false);assert.equal(s.duelAttempts,0);
});
test('checkpoint save only writes its own strict M05 key and restores progress',()=>{
 const items=new Map([['wir_metal_story_v1','preserve-canonical-story'],['wir_valence_profile_v1','preserve-profile']]);
 const storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)};
 const m=start();toRoof(m);m.elapsed=7.25;
 assert.equal(saveMission05(storage,m),true);
 assert.equal(items.get('wir_metal_story_v1'),'preserve-canonical-story');
 assert.equal(items.get('wir_valence_profile_v1'),'preserve-profile');
 assert.deepEqual(readMission05(storage),m);
 assert.equal(JSON.parse(items.get(M05_KEY)).stage,'ROOFTOP');
});
test('corrupt, impossible or overlarge checkpoints fail closed',()=>{
 for(const p of [null,{},at(Infinity,1,0),at(1000,1,0),at(0,-2,0),at(0,181,0)])
  assert.equal(validPosition(p),false);
 const storage={getItem:()=>'{broken'};
 assert.equal(readMission05(storage).stage,'INTRO');
 assert.equal(createMission05({...start(),checkpoint:{x:Infinity,y:0,z:0}}).stage,'INTRO');
 assert.equal(saveMission05({setItem:()=>{throw Error('quota exceeded')}},start()),false);
});
test('elapsed time is finite and bounded; no event accepts unknown jumps',()=>{
 const s=start();tickMission05(s,Infinity);assert.equal(s.elapsed,0);
 tickMission05(s,.03);tickMission05(s,3);assert.equal(Number(s.elapsed.toFixed(2)),.11);
 assert.equal(mission05Transition(s,'jump-stages').ok,false);
});
test('reuse REAL PR34 duel core: grounded two hit chain, aerial finisher, roof impact',()=>{
 const s=createRooftopDuel();
 assert.ok(duelAction(s,'light').ok);
 for(let i=0;i<13;i++)stepRooftopDuel(s,.02);
 assert.ok(duelAction(s,'light').ok);
 for(let i=0;i<13;i++)stepRooftopDuel(s,.02);
 assert.ok(duelAction(s,'launch').ok);
 for(let i=0;i<10;i++)stepRooftopDuel(s,.02);
 assert.ok(duelAction(s,'pursue').ok);
 for(let i=0;i<20;i++)stepRooftopDuel(s,.02);
 assert.ok(duelAction(s,'finisher').ok);
 for(let i=0;i<250&&s.mode==='ACTIVE';i++)stepRooftopDuel(s,.02);
 assert.equal(s.mode,'VICTORY');assert.ok(s.roofImpacts>=1);assert.equal(s.outcome,'reframer-contained');
});
test('actual Connected code keeps original first mission, board, swing, powers and fight logic',()=>{
 const code=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 for(const fragment of [
  "get('mission05')==='1'",'function skateGround(dt,wish,il)','function skOllie()',
  'function swingStep(dt,wish,pp)','function fightTick(dt)','function updateMetalStory(dt)',
  'function saveMetalStory(reason=', 'createTestYardSkateAdapter()','new RooftopPursuitMission',
  'new MetalRooftopDuelPilot','mission05?.land(', 'mission05?.duelFrame(',
  'mission05?.tick(dt)','if(MISSION05)initMission05()'
 ])assert.ok(code.includes(fragment),'missing '+fragment);
 assert.ok(!code.includes('const MISSION05=true'));
});
test('duel lifecycle requires opt-in and validates exact roof position before start',()=>{
 const code=readFileSync(new URL('../assets/metal_aerial_duel_pilot.js',import.meta.url),'utf8');
 assert.match(code,/useWorldEntry/);assert.match(code,/hideEntry/);
 assert.match(code,/Math\.abs\(position\.y-this\.origin\.y\)>\.9/);
 assert.match(code,/this\.state\.player\.x=position\.x-this\.origin\.x/);
 assert.doesNotMatch(code,/window\.localStorage|indexedDB/);
});

test('physical rooftop and ledges update parent world matrix before collision volumes',()=>{
 const src=readFileSync(new URL('../assets/metal_rooftop_pursuit.js',import.meta.url),'utf8');
 assert.match(src,/this\.group\.add\(deck\);[\s\S]{0,500}this\.group\.updateMatrixWorld\(true\);[\s\S]{0,130}this\.colliders\.push\(new THREE\.Box3\(\)\.setFromObject\(deck\)\)/);
 assert.match(src,/this\.group\.add\(step\);[\s\S]{0,130}this\.group\.updateMatrixWorld\(true\);[\s\S]{0,140}this\.colliders\.push\(new THREE\.Box3\(\)\.setFromObject\(step\)\)/);
});
