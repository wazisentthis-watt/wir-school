import test from 'node:test';
import assert from 'node:assert/strict';
import {createStructureLedger,extractMetal,restoreMetal,stepStructureLedger,ledgerSnapshot} from '../assets/structure_conservation.js';
test('material is conserved across extraction and return',()=>{
 const l=createStructureLedger([{id:'tower',metal:10},{id:'bridge',metal:5}]);
 assert.equal(extractMetal(l,4,['tower']),4);
 assert.equal(l.carried,4);assert.equal(l.structures[0].stored,6);
 assert.equal(restoreMetal(l,4),4);assert.equal(l.structures[0].stored,10);
 assert.equal(l.carried,0);assert.equal(l.extracted,l.returned);
});
test('critical support recalls metal automatically and blocks new extraction',()=>{
 const l=createStructureLedger([{id:'tower',metal:10,criticalRatio:.4}]);
 assert.equal(extractMetal(l,7,['tower']),7);assert.equal(l.emergency,true);
 assert.equal(extractMetal(l,2,['tower']),0);
 let events=[];for(let i=0;i<20;i++)events.push(...stepStructureLedger(l,.1,{recallRate:10}));
 assert.equal(l.emergency,false);assert.ok(l.structures[0].integrity>=.4);
 assert.ok(events.some(e=>e.type==='koda-recall'));
});
test('emergency restoration prioritizes weakest structure',()=>{
 const l=createStructureLedger([{id:'a',metal:10},{id:'b',metal:10}]);
 extractMetal(l,8,['a']);restoreMetal(l,2);
 assert.equal(l.structures[0].stored,4);assert.equal(l.structures[1].stored,10);
});
test('cannot extract material from unlisted or depleted structures',()=>{
 const l=createStructureLedger([{id:'a',metal:2}]);assert.equal(extractMetal(l,5,['b']),0);assert.equal(extractMetal(l,5,['a']),2);
 assert.equal(l.carried+l.structures[0].stored,2);assert.equal(ledgerSnapshot(l).structures.length,1);
});
