import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPrivateGLB,MAX_LOCAL_GLB_BYTES} from '../gorillium-lab/local_glb_guard.mjs';

const makeGLB=(doc,{bin=null,prefix=null,extra=null}={})=>{
 const utf8=new TextEncoder().encode(JSON.stringify(doc));
 const jsonPadded=(utf8.byteLength+3)&~3;
 const binary=bin===null?null:new Uint8Array(bin);
 const binaryPadded=binary===null?0:(binary.byteLength+3)&~3;
 const extraSize=extra?8+extra.byteLength:0;
 const total=12+8+jsonPadded+(binary===null?0:8+binaryPadded)+extraSize;
 const b=new Uint8Array(total);const dv=new DataView(b.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);
 dv.setUint32(12,jsonPadded,true);dv.setUint32(16,0x4e4f534a,true);
 b.fill(32,20,20+jsonPadded);b.set(utf8,20);
 if(binary!==null){
  const pos=20+jsonPadded;
  dv.setUint32(pos,binaryPadded,true);dv.setUint32(pos+4,0x004e4942,true);
  b.set(binary,pos+8);
 }
 if(extra){
  const pos=total-extraSize;dv.setUint32(pos,extra.byteLength,true);
  dv.setUint32(pos+4,prefix??0x00544944,true);
  b.set(extra,pos+8);
 }
 return b;
};
const basic={asset:{version:'2.0'},meshes:[{primitives:[]}],nodes:[],skins:[],animations:[]};
const badUri=uri=>({...basic,images:[{uri}]});
test('accepts self-contained JSON GLB and reports no external requests',()=>{
 const r=inspectPrivateGLB(makeGLB(basic));
 assert.equal(r.safeForLocalParse,true);
 assert.equal(r.externalRequestsPermitted,false);
 assert.equal(r.meshCount,1);
 assert.equal(r.embeddedDataUris,0);
});
test('accepts packed internal binary and DataView slice without leaking adjacent bytes',()=>{
 const b=makeGLB({...basic,buffers:[{byteLength:5}]},{bin:Uint8Array.from([1,2,3,4,5])});
 const padded=new Uint8Array(b.length+8);padded.set(b,4);
 const sliced=new Uint8Array(padded.buffer,4,b.length);
 const r=inspectPrivateGLB(sliced);
 assert.equal(r.binChunkBytes,8);
 assert.equal(r.sizeBytes,b.length);
});
test('permits inline data URI textures without external fetches',()=>{
 const r=inspectPrivateGLB(makeGLB(badUri('data:image/png;base64,AA==')));
 assert.equal(r.embeddedDataUris,1);
 assert.equal(r.externalRequestsPermitted,false);
});
test('blocks HTTP remote textures before GLTFLoader',()=>{
 assert.throws(()=>inspectPrivateGLB(makeGLB(badUri('https://attacker.example/log?save=secret'))),
  {message:'EXTERNAL_RESOURCE_BLOCKED'});
});
test('blocks relative binary buffers, file URLs and blob URLs',()=>{
 for(const uri of ['../textures/t.png','/remote.bin','file:///etc/passwd','blob:https://example.com/a','//attacker.example/a']){
  assert.throws(()=>inspectPrivateGLB(makeGLB({...basic,buffers:[{byteLength:0,uri}]})),
   {message:'EXTERNAL_RESOURCE_BLOCKED'});
 }
});
test('blocks nested extension URL fields; errors do not echo private URL contents',()=>{
 try{inspectPrivateGLB(makeGLB({...basic,extensions:{thirdParty:{url:'https://private.example/token=xyz'}}}));assert.fail();}
 catch(e){assert.equal(e.message,'EXTERNAL_RESOURCE_BLOCKED');assert.doesNotMatch(e.message,/xyz/);}
});
test('rejects corrupt headers, inconsistent length, invalid version and undersized bodies',()=>{
 const b=makeGLB(basic);
 assert.throws(()=>inspectPrivateGLB(Uint8Array.from([1,2,3])),{message:'INVALID_GLB_HEADER'});
 const magic=b.slice();magic[0]=1;
 assert.throws(()=>inspectPrivateGLB(magic),{message:'INVALID_GLB_MAGIC'});
 const old=b.slice();new DataView(old.buffer).setUint32(4,1,true);
 assert.throws(()=>inspectPrivateGLB(old),{message:'UNSUPPORTED_GLB_VERSION'});
 const truncated=b.slice(0,b.length-1);
 assert.throws(()=>inspectPrivateGLB(truncated),{message:'GLB_LENGTH_MISMATCH'});
});
test('rejects wrong JSON first chunk and invalid JSON chunk bounds',()=>{
 const b=makeGLB(basic);
 const badOrder=b.slice();new DataView(badOrder.buffer).setUint32(16,0x004e4942,true);
 assert.throws(()=>inspectPrivateGLB(badOrder),{message:'GLB_JSON_MUST_BE_FIRST'});
 const malformed=b.slice();new DataView(malformed.buffer).setUint32(12,100000,true);
 assert.throws(()=>inspectPrivateGLB(malformed),{message:'INVALID_GLB_CHUNK_SIZE'});
});
test('enforces capped size independent of caller maxBytes',()=>{
 const b=makeGLB(basic);
 assert.throws(()=>inspectPrivateGLB(b,{maxBytes:b.length-1}),{message:'GLB_OVER_SIZE_LIMIT'});
 assert.equal(MAX_LOCAL_GLB_BYTES,80*1024*1024);
});
test('rejects missing declared embedded bytes and duplicate internal buffers',()=>{
 const noBin=makeGLB({...basic,buffers:[{byteLength:5}]});
 assert.throws(()=>inspectPrivateGLB(noBin),{message:'INTERNAL_BIN_LENGTH_MISMATCH'});
 const twice=makeGLB({...basic,buffers:[{byteLength:1},{byteLength:2}]},{bin:[1,2,3,4]});
 assert.throws(()=>inspectPrivateGLB(twice),{message:'MULTIPLE_INTERNAL_BUFFERS'});
});
test('rejects unsupported GLTF major version and malformed skin metadata',()=>{
 assert.throws(()=>inspectPrivateGLB(makeGLB({...basic,asset:{version:'1.0'}})),
  {message:'GLTF_VERSION_NOT_2'});
 assert.throws(()=>inspectPrivateGLB(makeGLB({...basic,skins:{broken:true}})),
  {message:'INVALID_SKIN_LIST'});
});
test('rejects non-binary values rather than making network requests',()=>{
 assert.throws(()=>inspectPrivateGLB({uri:'https://example.com'}),{message:'GLB_INPUT_NOT_BINARY'});
});
