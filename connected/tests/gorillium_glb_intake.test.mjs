import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGlbBuffer} from '../gorillium-lab/glb_intake.mjs';
const fixture=(json,extra=Buffer.alloc(0))=>{
 const data=Buffer.from(JSON.stringify(json)),pad=Buffer.alloc((4-data.length%4)%4,32);
 const size=20+data.length+pad.length+extra.length;
 const b=Buffer.alloc(size);b.write('glTF',0,'ascii');b.writeUInt32LE(2,4);b.writeUInt32LE(size,8);
 b.writeUInt32LE(data.length+pad.length,12);b.write('JSON',16,'ascii');
 data.copy(b,20);pad.copy(b,20+data.length);extra.copy(b,20+data.length+pad.length);
 return b;
};
const base={asset:{version:'2.0'},nodes:[{name:'Hips'},{name:'Tentacle_01'},{name:'Tentacle_02'}],
 skins:[{joints:[0,1,2]}],meshes:[{}],animations:[{name:'Attack',channels:[{},{}]}]};
test('reports actual GLB properties and a valid SHA256 without asserting identity',()=>{
 const report=inspectGlbBuffer(fixture(base),{name:'unknown.glb',claimedIdentity:'Gorillium'});
 assert.equal(report.sizeBytes,fixture(base).length);
 assert.equal(report.sha256.length,64);assert.equal(report.animationCount,1);
 assert.equal(report.animations[0].channels,2);
 assert.equal(report.jointCount,3);assert.equal(report.skinCount,1);
 assert.equal(report.identityVerified,false);
 assert.equal(report.eightTentacleEffectorsProven,false);
 assert.equal(report.possibleTentacleNodes.length,2);
});
test('eight named tentacles all mapped to real skin joints counts as structural evidence, not identity',()=>{
 const nodes=Array.from({length:8},(_,i)=>({name:'octo_'+(i+1)}));
 const report=inspectGlbBuffer(fixture({...base,nodes,skins:[{joints:[0,1,2,3,4,5,6,7]}]}));
 assert.equal(report.eightTentacleEffectorsProven,true);
 assert.equal(report.identityVerified,false);
});
test('eight unskinned octopus-looking nodes do not pass effector proof',()=>{
 const nodes=Array.from({length:8},(_,i)=>({name:'tentacle'+i}));
 const report=inspectGlbBuffer(fixture({...base,nodes,skins:[]}));
 assert.equal(report.eightTentacleEffectorsProven,false);
});
test('rejects fake GLB, missing JSON and truncated length',()=>{
 assert.throws(()=>inspectGlbBuffer(Buffer.from('fake')),/NOT_GLB_MAGIC/);
 const b=fixture(base);b.writeUInt32LE(b.length+100,8);
 assert.throws(()=>inspectGlbBuffer(b),/LENGTH_MISMATCH/);
});
test('declines broken JSON and unverifiable 3D scenes',()=>{
 const bad={asset:{version:'2.0'},nodes:[],meshes:[],skins:[],animations:[]};
 const r=inspectGlbBuffer(fixture(bad));assert.equal(r.renderable,false);assert.equal(r.animationCount,0);
 assert.throws(()=>inspectGlbBuffer(fixture({asset:{version:'1.0'}})),/MISSING_GLTF_JSON/);
});
