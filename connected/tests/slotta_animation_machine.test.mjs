import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLOTTA_GAMES,createSlottaLoadout,availableSlottaLibrary,normalizeSlottaLoadout,beginDownload,tickSlotta} from '../assets/slotta_slots.js';
import {SLOTTA_ACTIONS,SLOTTA_SLOT_ACTIONS,SLOTTA_RIG_CLIPS,createSlottaAnimator,startSlottaAction,
 canStartSlottaAction,tickSlottaAnimator,slottaAnimationSnapshot,slottaAnimationForGame} from '../assets/slotta_animation_machine.js';
import {inspectSlottaRig,createSlottaGLBAdapter} from '../assets/slotta_rig_adapter.js';

test('signature games are three active ports, with five stored and three archived legacy cartridges',()=>{
 const l=createSlottaLoadout();
 assert.deepEqual(l.active,['slither-master','ninja-star','phantom-racer']);
 assert.equal(l.stored.length,5);
 assert.deepEqual(new Set(l.archive),new Set(['zero-sector','nanoforge','gravity-children']));
 assert.equal(SLOTTA_GAMES.length,11);
 assert.deepEqual(new Set([...l.active,...l.stored,...l.archive]),new Set(SLOTTA_GAMES.map(g=>g.id)));
 assert.equal(availableSlottaLibrary(l).length,3);
 assert.ok(normalizeSlottaLoadout({active:l.active,stored:l.stored}).archive.includes('nanoforge'));
});
test('archived cartridge downloads replace stored cartridge without discarding its definition',()=>{
 const l=createSlottaLoadout(),old=l.stored[0];
 assert.equal(beginDownload(l,old,'zero-sector',2),true);
 assert.ok(l.archive.includes(old));assert.ok(!l.archive.includes('zero-sector'));
 tickSlotta(l,2.5);
 assert.equal(l.stored[0],'zero-sector');assert.equal(l.download,null);
 assert.equal(new Set([...l.active,...l.stored,...l.archive]).size,11);
});
test('three slot abilities map to cast/summon/dash timelines and GLB clip names',()=>{
 assert.deepEqual(['slither-master','ninja-star','phantom-racer'].map(slottaAnimationForGame),
  ['slitherCast','ninjaSummon','phantomDash']);
 for(const state of Object.values(SLOTTA_SLOT_ACTIONS))assert.ok(SLOTTA_RIG_CLIPS[state]);
});
test('cast marker occurs exactly once and before state completion',()=>{
 const a=createSlottaAnimator();
 assert.equal(startSlottaAction(a,'slitherCast'),true);
 assert.deepEqual(tickSlottaAnimator(a,.19).map(e=>e.type),['telegraph']);
 assert.deepEqual(tickSlottaAnimator(a,.25).map(e=>e.type),[]);
 assert.deepEqual(tickSlottaAnimator(a,.14).map(e=>e.type),['cast']);
 assert.deepEqual(tickSlottaAnimator(a,.1),[]);
 for(let i=0;i<10;i++)tickSlottaAnimator(a,.1);
 assert.equal(a.state,'idle');
});
test('higher priority damage interrupts casts, cancelling unspent cast marker',()=>{
 const a=createSlottaAnimator();
 startSlottaAction(a,'ninjaSummon');tickSlottaAnimator(a,.25);
 assert.equal(startSlottaAction(a,'hitHeavy'),true);
 const events=[];for(let i=0;i<7;i++)events.push(...tickSlottaAnimator(a,.1));
 assert.ok(!events.some(e=>e.type==='cast'));
 assert.equal(a.state,'idle');
});
test('Gallium grab blocks any lower priority cast until released',()=>{
 const a=createSlottaAnimator();
 assert.equal(startSlottaAction(a,'galliumHeld'),true);
 assert.equal(canStartSlottaAction(a,'select'),false);
 assert.equal(startSlottaAction(a,'getUp'),false);
 assert.equal(startSlottaAction(a,'getUp',{force:true}),true);
 assert.equal(slottaAnimationSnapshot(a).state,'getUp');
});
test('invalid durations never cause undefined animation progress',()=>{
 const a=createSlottaAnimator('idle');
 assert.deepEqual(tickSlottaAnimator(a,-1),[]);
 assert.equal(slottaAnimationSnapshot(a).progress,0);
 assert.ok(SLOTTA_ACTIONS.phantomDash.duration>.25);
});
test('future rig adapter fails safely with no skinned mesh and describes sockets',()=>{
 const root={name:'Root',isMesh:false,children:[],traverse(cb){cb(this);}};
 const info=inspectSlottaRig(root);
 assert.equal(info.ready,false);assert.equal(info.skinnedMeshCount,0);
 const adapter=createSlottaGLBAdapter({scene:root,animations:[]},{});
 assert.equal(adapter.ok,false);assert.ok(adapter.reason);
});
test('real boss JS dispatches attack effects on timeline markers, not animation selection',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 assert.match(main,/tickSlottaAnimator\(slottaAnimator,dt\)/);
 assert.match(main,/advanceSlottaAttackEvent\(slottaConsole,slottaAnimator,slottaPendingGame,event/);
 assert.match(main,/if\(out\.cast\)slottaUseGame\(out\.cast/);
 assert.match(main,/updateSlottaDash\(dt,boss\)/);
 assert.match(main,/startSlottaAction\(slottaAnimator,heavy\?'hitHeavy'/);
});

test('same-priority selects do not interrupt a boss intro',()=>{
 const a=createSlottaAnimator();
 startSlottaAction(a,'intro');
 assert.equal(startSlottaAction(a,'select'),false);
 for(let i=0;i<7;i++)tickSlottaAnimator(a,.2);
 assert.equal(a.state,'idle');
 assert.equal(startSlottaAction(a,'select'),true);
});
test('rig adapter provisions optional PHATOM sockets when uploaded skeleton has essential bones',()=>{
 class Node {
  constructor(name){this.name=name;this.children=[];this.position={set(...xyz){this.xyz=xyz}};}
  add(n){this.children.push(n);}
  traverse(cb){cb(this);for(const c of this.children)c.traverse(cb);}
 }
 const root=new Node('root');
 for(const name of ['Hips','Spine','Head','LeftHand','RightHand'])root.add(new Node(name));
 const skin=new Node('skin');skin.isSkinnedMesh=true;skin.isMesh=true;root.add(skin);
 class MockMixer {constructor(r){this.root=r;}clipAction(){return {}}}
 const a=createSlottaGLBAdapter({scene:root,animations:[]},{Object3D:Node,AnimationMixer:MockMixer});
 assert.equal(a.ok,true);assert.equal(a.inspection.ready,true);
 for(const key of ['phatomRoot','serpentSpawn','cloneSpawn','dashTrail'])assert.ok(a.socket(key));
});
