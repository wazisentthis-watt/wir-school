import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeRampSurface,sampleRampTop,pickRampSupport,blendTerrainNormal,correctedFootHeight} from '../assets/metal_terrain_contact.mjs';
const almost=(a,b,epsilon=.0001)=>assert.ok(Math.abs(a-b)<epsilon,'numbers differ: '+a+' versus '+b);
const flat=makeRampSurface({id:'flat',origin:{x:10,y:2,z:10},normal:{x:0,y:1,z:0},
 right:{x:1,y:0,z:0},forward:{x:0,y:0,z:1},width:6,depth:7});
const slope=makeRampSurface({id:'kicker',origin:{x:0,y:1,z:0},normal:{x:0,y:.8,z:-.6},
 right:{x:1,y:0,z:0},forward:{x:0,y:.6,z:.8},width:6,depth:8});
test('actual ramp top supports local center',()=>almost(sampleRampTop(flat,10,10).y,2));
test('no support beyond actual ramp footprint',()=>assert.equal(sampleRampTop(flat,20,10),null));
test('no support past finite slope endpoint',()=>assert.equal(sampleRampTop(slope,0,10),null));
test('slope height increases according to its normal',()=>{almost(sampleRampTop(slope,0,0).y,1);almost(sampleRampTop(slope,0,2).y,2.5)});
test('same tilted plane works for side-to-side 90 degree kicker',()=>{
 const side=makeRampSurface({origin:{x:0,y:1,z:0},normal:{x:-.6,y:.8,z:0},
  right:{x:0,y:0,z:-1},forward:{x:.8,y:.6,z:0},width:6,depth:8});
 almost(sampleRampTop(side,2,0).y,2.5);
 assert.equal(sampleRampTop(side,12,0),null);
});
test('support never invents surfaces',()=>assert.equal(pickRampSupport([],0,0,1),null));
test('support refuses below-ground mesh tops',()=>assert.equal(pickRampSupport([flat],10,10,2,{minHeight:3}),null));
test('support cannot leap more than maximum step',()=>assert.equal(pickRampSupport([flat],10,10,.5,{maxStep:.55}),null));
test('support permits reachable ground step',()=>assert.equal(pickRampSupport([flat],10,10,1.6,{maxStep:.5}).id,'flat'));
test('support refuses surface too far below falling character',()=>assert.equal(pickRampSupport([flat],10,10,5,{maxDrop:.9}),null));
test('support uses highest in-reach overlapping platform',()=>{
 const low=makeRampSurface({id:'low',origin:{x:10,y:1.5,z:10},normal:{x:0,y:1,z:0},
  right:{x:1,y:0,z:0},forward:{x:0,y:0,z:1}});
 assert.equal(pickRampSupport([low,flat],10,10,1.9,{maxStep:.5}).id,'flat');
});
test('vertical walls are never floor',()=>assert.equal(makeRampSurface({origin:{x:0,y:0,z:0},normal:{x:1,y:0,z:0},right:{x:0,y:1,z:0},forward:{x:0,y:0,z:1}}),null));
test('malformed orthogonal basis is refused',()=>assert.equal(makeRampSurface({origin:{x:0,y:0,z:0},normal:{x:0,y:1,z:0},right:{x:0,y:1,z:0},forward:{x:0,y:0,z:1}}),null));
test('invalid values are refused',()=>assert.equal(makeRampSurface({origin:{x:NaN,y:0,z:0},normal:{x:0,y:1,z:0},right:{x:1,y:0,z:0},forward:{x:0,y:0,z:1}}),null));
test('normal relaxation stays normalized and does not snap',()=>{const n=blendTerrainNormal({x:0,y:1,z:0},{x:0,y:.8,z:-.6},.016);assert.ok(n.y<1&&n.y>.8);almost(Math.hypot(n.x,n.y,n.z),1)});
test('no target normal relaxes safely toward horizontal',()=>{const n=blendTerrainNormal({x:0,y:.8,z:-.6},null,.016);assert.ok(n.y>.8)});
test('planted foot takes full slope delta',()=>almost(correctedFootHeight(.3,1,1.2,0,1),.5));
test('rising swing leg keeps original arc height',()=>almost(correctedFootHeight(.3,1,1.2,1,1),.3));
test('partial recovery reduces slope correction',()=>almost(correctedFootHeight(.3,1,1.2,.5,.5),.35));
test('extreme step difference is clamped',()=>almost(correctedFootHeight(0,1,5,0,1),.35));
test('invalid input cannot poison joint target',()=>almost(correctedFootHeight(1,1,Infinity,0,1),1));
