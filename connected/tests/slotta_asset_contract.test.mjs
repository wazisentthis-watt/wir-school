import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLOTTA_GAMES,createSlottaLoadout,swapSlot,activateSlot} from '../assets/slotta_slots.js';

test('SLOTTA PHATOM backpack contract has three active and five stored games',()=>{
 const loadout=createSlottaLoadout();
 assert.equal(loadout.active.length,3);
 assert.equal(loadout.stored.length,5);
 assert.equal(SLOTTA_GAMES.length,8);
 assert.equal(new Set([...loadout.active,...loadout.stored]).size,8);
 assert.deepEqual(new Set([...loadout.active,...loadout.stored]),new Set(SLOTTA_GAMES.map(game=>game.id)));
});

test('PHATOM swap retains all eight game IDs and can activate its new cartridge',()=>{
 const loadout=createSlottaLoadout(),before=[...loadout.active,...loadout.stored].sort();
 assert.equal(swapSlot(loadout,0,2),true);
 assert.deepEqual([...loadout.active,...loadout.stored].sort(),before);
 const game=activateSlot(loadout,0);
 assert.ok(game&&game.id===loadout.active[0]);
});

test('boss visuals preserve named active and storage ports and animation hooks',()=>{
 const src=readFileSync(new URL('../assets/slotta_visuals.js',import.meta.url),'utf8');
 assert.match(src,/PHATOM_active_/);
 assert.match(src,/PHATOM_storage_/);
 assert.match(src,/PHATOM_orange_retrieval_port/);
 for(const api of ['createSlottaBossAsset','animateSlottaBossAsset','createSlottaMinionAsset','animateSlottaMinionAsset'])
  assert.match(src,new RegExp('export function '+api+'\\('));
});

test('cartridge atlas has all eight exact game IDs',()=>{
 const src=readFileSync(new URL('../assets/slotta_assets/cartridge_atlas.svg',import.meta.url),'utf8');
 for(const game of SLOTTA_GAMES)assert.ok(src.includes('id="'+game.id+'"'),game.id);
});

test('game uses live SLOTTA visual module while keeping boss attacks',()=>{
 const src=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 assert.match(src,/from '\.\/slotta_visuals\.js'/);
 assert.match(src,/kind==='slotta'\?createSlottaBossAsset\(\)/);
 assert.match(src,/animateSlottaMinionAsset\(m\.root,m\.phase\)/);
 assert.match(src,/function slottaUseGame\(/);
 assert.match(src,/function updateSlottaBoss\(/);
});
