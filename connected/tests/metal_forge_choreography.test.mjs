import {test} from 'node:test';import assert from 'node:assert/strict';
import {partFormation,selectForgePose,FORGE_PART_TIMES} from '../assets/metal_forge_choreography.mjs';
import {readFileSync} from 'node:fs';
test('deck, trucks and wheels stagger in a physically ordered sequence',()=>{
 assert.ok(FORGE_PART_TIMES.deck[0]<FORGE_PART_TIMES.truck[0]);assert.ok(FORGE_PART_TIMES.truck[0]<FORGE_PART_TIMES.wheel[0]);
 assert.equal(partFormation('deck',1),0);assert.equal(partFormation('truck',1.8),0);assert.equal(partFormation('wheel',2.0),0);
 assert.equal(partFormation('deck',2.2),1);assert.equal(partFormation('truck',2.5),1);assert.equal(partFormation('wheel',2.65),1);
});
test('formation progress is bounded, monotonic and reversible',()=>{for(const kind of ['deck','truck','wheel']){let last=0;for(let i=0;i<=100;i++){const k=partFormation(kind,i*.033);assert.ok(k>=last-.00001&&k<=1);last=k;}assert.equal(partFormation(kind,0,true),1);assert.equal(partFormation(kind,.55,true),0);}});
test('only present original rig actions may be selected',()=>{
 assert.equal(selectForgePose('DETECTING',{Block:{}}),'Block');assert.equal(selectForgePose('DETECTING',{Idle:{}}),'Idle');
 assert.equal(selectForgePose('COMPRESSION',{Charge:{}}),'Charge');assert.equal(selectForgePose('MOUNTING',{Land:{}}),'Land');
 assert.equal(selectForgePose('ACTIVATED',{}),null);assert.equal(selectForgePose('SKATING',{Idle:{}}),null);
});
test('game preserves control and animation ownership while forging',()=>{
 const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 const fx=readFileSync(new URL('../assets/metal_forge_controller.js',import.meta.url),'utf8');
 assert.match(main,/forgeController\?\.busy\)\{toast\('Finish forging before switching METAL forms'/);
 assert.match(main,/if\(!forgePoseActive&&actT<=0/);
 assert.match(main,/selectForgePose\(phase,P\.acts\)/);
 assert.ok(!main.includes('function boardOnBack(){'));
 assert.ok(!fx.includes('new THREE.AnimationMixer'));
 assert.ok(fx.includes('this.parts.filter(p=>p.kind===\'wheel\').length'));
 assert.ok(fx.includes("name='ForgeWheel'"));
});
