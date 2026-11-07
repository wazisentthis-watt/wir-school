// WIR Gorillium private GLB intake guard.
// Pure JavaScript, usable in browsers and Node. No network calls, no storage writes.
// A device-selected GLB may include JSON references to remote files: forbid those
// BEFORE calling Three.js GLTFLoader. PROPOSAL / PUBLISH HOLD.
export const MAX_LOCAL_GLB_BYTES=80*1024*1024;
const JSON_TAG=0x4e4f534a, BIN_TAG=0x004e4942;
const supportedDataUri=/^data:(?:image\/(?:png|jpeg|jpg|webp|ktx2)|application\/(?:octet-stream|gltf-buffer));base64,[A-Za-z0-9+/=\r\n]+$/i;
function problem(code){throw new Error(code);}
function bytesOf(input){
 if(input instanceof ArrayBuffer)return new Uint8Array(input);
 if(ArrayBuffer.isView(input))return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
 problem('GLB_INPUT_NOT_BINARY');
}
function verifyExternalReferences(value){
 const stack=[value];let visited=0,embedded=0;
 while(stack.length){
  const obj=stack.pop();
  if(!obj||typeof obj!=='object')continue;
  if(++visited>200000)problem('GLB_JSON_TOO_COMPLEX');
  for(const [key,v] of Object.entries(obj)){
   if(/^(uri|url)$/i.test(key)){
    if(typeof v!=='string'||!supportedDataUri.test(v))problem('EXTERNAL_RESOURCE_BLOCKED');
    embedded++;
   }else if(v&&typeof v==='object')stack.push(v);
  }
 }
 return embedded;
}
export function inspectPrivateGLB(input,{maxBytes=MAX_LOCAL_GLB_BYTES}={}){
 const bytes=bytesOf(input),n=bytes.byteLength;
 if(n>Math.min(MAX_LOCAL_GLB_BYTES,Number.isFinite(maxBytes)?maxBytes:MAX_LOCAL_GLB_BYTES))
  problem('GLB_OVER_SIZE_LIMIT');
 if(n<20)problem('INVALID_GLB_HEADER');
 const view=new DataView(bytes.buffer,bytes.byteOffset,n);
 if(view.getUint32(0,true)!==0x46546c67)problem('INVALID_GLB_MAGIC');
 if(view.getUint32(4,true)!==2)problem('UNSUPPORTED_GLB_VERSION');
 if(view.getUint32(8,true)!==n)problem('GLB_LENGTH_MISMATCH');
 let offset=12,json=null,binSize=0,sawBin=false,jsonSize=0,first=true;
 while(offset<n){
  if(offset+8>n)problem('TRUNCATED_GLB_CHUNK');
  const size=view.getUint32(offset,true),tag=view.getUint32(offset+4,true);offset+=8;
  if(size%4!==0||size>n-offset)problem('INVALID_GLB_CHUNK_SIZE');
  if(first&&tag!==JSON_TAG)problem('GLB_JSON_MUST_BE_FIRST');
  first=false;
  if(tag===JSON_TAG){
   if(json!==null)problem('DUPLICATE_JSON_CHUNK');
   if(size>12*1024*1024)problem('GLB_JSON_TOO_LARGE');
   jsonSize=size;
   try{
    json=JSON.parse(new TextDecoder('utf-8',{fatal:true})
      .decode(bytes.subarray(offset,offset+size)).trimEnd());
   }catch{problem('INVALID_GLB_JSON');}
  }else if(tag===BIN_TAG){
   if(sawBin)problem('DUPLICATE_BIN_CHUNK');
   sawBin=true;binSize=size;
  }else problem('UNSUPPORTED_GLB_CHUNK');
  offset+=size;
 }
 if(!json||typeof json!=='object'||Array.isArray(json))problem('GLB_JSON_NOT_OBJECT');
 if(!/^2(?:\.|$)/.test(json.asset?.version||''))problem('GLTF_VERSION_NOT_2');
 const embeddedDataUris=verifyExternalReferences(json);
 const buffers=json.buffers||[];
 if(!Array.isArray(buffers))problem('GLB_BUFFERS_MALFORMED');
 // A GLB can embed only one URI-less buffer. Others must be data URIs.
 const internal=buffers.filter(v=>v&&!Object.hasOwn(v,'uri'));
 if(internal.length>1)problem('MULTIPLE_INTERNAL_BUFFERS');
 if(internal.length){
  const len=internal[0].byteLength;
  if(!Number.isSafeInteger(len)||len<0)problem('BAD_INTERNAL_BUFFER_LENGTH');
  if(len>0&&(!sawBin||len>binSize||binSize-len>3))
   problem('INTERNAL_BIN_LENGTH_MISMATCH');
 }
 if(json.meshes!==undefined&&!Array.isArray(json.meshes))problem('INVALID_MESH_LIST');
 if(json.skins!==undefined&&!Array.isArray(json.skins))problem('INVALID_SKIN_LIST');
 if(json.animations!==undefined&&!Array.isArray(json.animations))problem('INVALID_ANIMATION_LIST');
 return {
  safeForLocalParse:true,externalRequestsPermitted:false,
  sizeBytes:n,jsonChunkBytes:jsonSize,binChunkBytes:binSize,
  meshCount:json.meshes?.length||0,skinCount:json.skins?.length||0,
  animationCount:json.animations?.length||0,embeddedDataUris
 };
}
