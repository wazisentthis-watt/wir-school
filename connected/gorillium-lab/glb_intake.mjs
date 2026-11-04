// GLB binary intake without graphics or third-party dependencies.
// Reports actual file bytes; never invents a Gorillium identity or skeleton.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const BONE_RX=/(?:tentacle|octo|appendage|sucker|arm[_-]?[0-9]{1,2})/i;
export function inspectGlbBuffer(bytes,{name='unknown.glb',claimedIdentity=null}={}){
 const b=Buffer.from(bytes);
 if(b.length<20||b.toString('ascii',0,4)!=='glTF')throw Error('NOT_GLB_MAGIC');
 const version=b.readUInt32LE(4),length=b.readUInt32LE(8);
 if(version!==2)throw Error('UNSUPPORTED_GLB_VERSION');
 if(length!==b.length)throw Error('GLB_LENGTH_MISMATCH');
 let pos=12,json=null;const chunks=[];
 while(pos+8<=b.length){
  const size=b.readUInt32LE(pos),tag=b.toString('ascii',pos+4,pos+8);pos+=8;
  if(size%4||pos+size>length)throw Error('INVALID_GLB_CHUNK');
  chunks.push({tag,bytes:size});
  if(tag==='JSON'){if(json!==null)throw Error('DUPLICATE_JSON_CHUNK');
   try{json=JSON.parse(b.toString('utf8',pos,pos+size).trimEnd())}
   catch{throw Error('BAD_GLB_JSON');}}
  pos+=size;
 }
 if(pos!==length)throw Error('TRAILING_INVALID_BYTES');
 if(!json||json.asset?.version?.split('.')[0]!=='2')throw Error('MISSING_GLTF_JSON');
 const nodes=json.nodes||[],skins=json.skins||[],animations=json.animations||[];
 const jointIndices=new Set(skins.flatMap(s=>s.joints||[]));
 const matches=nodes.map((n,i)=>({index:i,name:n.name||''})).filter(n=>BONE_RX.test(n.name));
 const clips=animations.map((a,i)=>({index:i,name:a.name||'unnamed-'+i,channels:(a.channels||[]).length}));
 const jointNames=[...jointIndices].map(i=>nodes[i]?.name||'unnamed-'+i);
 return {
  filename:name,claimedIdentity,identityVerified:false,
  sha256:createHash('sha256').update(b).digest('hex'),
  sizeBytes:b.length,gltfVersion:json.asset.version,
  nodeCount:nodes.length,meshCount:(json.meshes||[]).length,
  skinCount:skins.length,jointCount:jointIndices.size,
  animationCount:animations.length,animations:clips,
  possibleTentacleNodes:matches,
  jointNames,renderable:(json.meshes||[]).length>0,
  eightTentacleEffectorsProven:matches.filter(n=>jointIndices.has(n.index)).length>=8,
  warning:'Names and counts are only hints; animation playback and provenance require actual browser/rig QA.'
 };
}
export function inspectGlbFile(path,{claimedIdentity=null}={}){
 const b=readFileSync(path);
 return inspectGlbBuffer(b,{name:path,claimedIdentity});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const files=process.argv.slice(2);
 if(files.length===0){console.error('Usage: node glb_intake.mjs path/to/model.glb [...other.glb]');process.exitCode=2;}
 else for(const file of files){try{const report=inspectGlbFile(file);console.log(JSON.stringify(report));}
  catch(e){console.error(JSON.stringify({filename:file,error:String(e.message||e)}));process.exitCode=1;}}
}
