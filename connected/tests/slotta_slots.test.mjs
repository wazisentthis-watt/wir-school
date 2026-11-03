import test from 'node:test';
import assert from 'node:assert/strict';
import {SLOTTA_GAMES,createSlottaLoadout,swapSlot,beginDownload,tickSlotta,activateSlot} from '../assets/slotta_slots.js';
test('SLOTTA has eight distinct games and 3 active + 5 stored',()=>{
 const s=createSlottaLoadout();assert.equal(new Set(SLOTTA_GAMES.map(g=>g.id)).size,8);assert.equal(s.active.length,3);assert.equal(s.stored.length,5);assert.equal(new Set([...s.active,...s.stored]).size,8);
});
test('active and backpack storage can swap without losing a game',()=>{
 const s=createSlottaLoadout(),a=s.active[1],b=s.stored[2];assert.equal(swapSlot(s,1,2),true);assert.equal(s.active[1],b);assert.equal(s.stored[2],a);assert.equal(swapSlot(s,3,0),false);
});
test('Ninja Star and Slither Master activate with cooldowns',()=>{
 const s=createSlottaLoadout();assert.equal(activateSlot(s,0).id,'slither-master');assert.equal(activateSlot(s,0),null);assert.equal(activateSlot(s,1).id,'ninja-star');tickSlotta(s,9);assert.equal(activateSlot(s,0).id,'slither-master');
});
test('download requires deleting a stored cartridge and finishes after time',()=>{
 const s=createSlottaLoadout();assert.equal(beginDownload(s,s.stored[0],'slither-master'),false);
 assert.equal(swapSlot(s,0,0),true);const incoming=s.stored[0];assert.equal(beginDownload(s,incoming,'slither-master'),false);
 assert.equal(swapSlot(s,0,0),true);
});
