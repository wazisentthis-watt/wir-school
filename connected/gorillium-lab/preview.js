// Browser-only original model laboratory. Never alters Metal, localStorage,
// gameplay state or the public launcher. PROPOSAL / PUBLISH HOLD.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {inspectRig} from '../assets/rig_diagnostics.js';
import {createGorilliumState,setGorilliumForm,castGorilliumAbility,
 stepGorillium,gorilliumStatus} from '../assets/gorillium_ability_core.js';

const get=id=>document.getElementById(id);
const stage=get('stage'),report=get('report'),msg=get('status'),sourceLabel=get('stageLabel');
const button=id=>get(id),MAX_FILE_BYTES=80*1024*1024;
const scene=new THREE.Scene();scene.background=new THREE.Color('#151729');
const camera=new THREE.PerspectiveCamera(50,1,.1,200);
camera.position.set(5,3.4,6);
const ambient=new THREE.HemisphereLight(0xd4cbff,0x27232c,2);scene.add(ambient);
const lamp=new THREE.DirectionalLight(0xffffff,2.1);lamp.position.set(2,8,4);scene.add(lamp);
const grid=new THREE.GridHelper(20,20,0x5b477f,0x353344);scene.add(grid);
const aim=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,1),
 new THREE.MeshBasicMaterial({color:0xffc778,wireframe:true}));
aim.position.set(2,1.5,0);aim.name='QA_TARGET_NOT_CHARACTER';scene.add(aim);
let renderer=null;
try{
 renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 stage.append(renderer.domElement);
}catch(e){msg.textContent='WebGL unavailable: '+String(e.message||e);}
const state={source:null,gltf:null,rig:null,sha256:null,identityVerified:false,
 skinBones:[],mapped:[],neutral:[],game:null,mixer:null,activeEvent:null,
 renderReady:!!renderer,loadError:null};
const loader=new GLTFLoader();
const setStatus=s=>{msg.textContent=s;};
const setActions=active=>{button('lash').disabled=!active;button('tether').disabled=!active;};
function clearModel(){
 setActions(false);button('bind').disabled=true;button('playClip').disabled=true;
 if(state.mixer)state.mixer.stopAllAction();
 if(state.gltf?.scene)scene.remove(state.gltf.scene);
 Object.assign(state,{source:null,gltf:null,rig:null,sha256:null,skinBones:[],
  mapped:[],neutral:[],game:null,mixer:null,activeEvent:null,loadError:null});
 get('limbMap').textContent='';get('counter').textContent='Charge: n/a | Free limbs: n/a';
}
function activeJointBones(root){
 const map=new Map();
 root.traverse(o=>{if(o.isSkinnedMesh)for(const b of o.skeleton.bones)map.set(b.uuid,b);});
 return [...map.values()];
}
function buildMapOptions(){
 const wrap=get('limbMap');wrap.textContent='';
 const candidates=state.skinBones.filter(b=>/(?:tentacle|octo|appendage|sucker)/i.test(b.name));
 for(let limb=0;limb<8;limb++){
  const label=document.createElement('label');label.textContent='Limb '+(limb+1);
  const sel=document.createElement('select');sel.dataset.limb=String(limb);
  const empty=document.createElement('option');empty.value='';empty.textContent='Choose real bone';sel.append(empty);
  for(const bone of state.skinBones){
   const option=document.createElement('option');
   option.value=bone.uuid;option.textContent=bone.name||'(unnamed joint)';
   sel.append(option);
  }
  // Naming is a suggestion, not proof. Manual review remains required.
  if(candidates[limb])sel.value=candidates[limb].uuid;
  label.append(sel);wrap.append(label);
 }
 button('bind').disabled=state.source!=='device-glb'||state.skinBones.length<8;
}
function showRig(){
 if(!state.rig)return;
 report.textContent=JSON.stringify({
  source:state.source,identityVerified:false,sha256:state.sha256,
  skinJoints:state.skinBones.length,bones:state.rig.bones.length,skins:state.rig.skins.length,
  skinned:state.rig.hasSkinnedMesh,clips:state.rig.clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks})),
  mapped:state.rig.mapped,
  candidateTentacleBones:state.skinBones.filter(b=>/(?:tentacle|octo|appendage|sucker)/i.test(b.name)).map(b=>b.name)
 },null,2);
}
function placeModel(gltf){
 const box=new THREE.Box3().setFromObject(gltf.scene);
 const center=box.getCenter(new THREE.Vector3());
 const height=Math.max(.0001,box.max.y-box.min.y);
 const scale=Math.min(5,3.1/height);
 gltf.scene.scale.multiplyScalar(scale);
 gltf.scene.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
 scene.add(gltf.scene);
}
async function hashBytes(buf){
 if(!crypto?.subtle)return null;
 const digest=await crypto.subtle.digest('SHA-256',buf);
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
async function loadParsedGLB(bytes,{source,name}){
 if(!renderer)throw Error('WebGL context is not available');
 const data=bytes instanceof ArrayBuffer?bytes:bytes.buffer;
 if(data.byteLength>MAX_FILE_BYTES)throw Error('GLB exceeds 80 MB preview safety limit');
 clearModel();setStatus('Decoding '+name+'…');
 const gltf=await new Promise((resolve,reject)=>loader.parse(data,'',resolve,reject));
 const hash=await hashBytes(data);
 state.source=source;state.gltf=gltf;state.sha256=hash;
 placeModel(gltf);
 state.rig=inspectRig(gltf);
 state.skinBones=activeJointBones(gltf.scene);
 state.mixer=gltf.animations.length?new THREE.AnimationMixer(gltf.scene):null;
 button('playClip').disabled=!state.mixer;
 sourceLabel.textContent=source==='device-glb'
  ?'Selected original candidate: '+name+' · Provenance unverified'
  :'Live Metal S1 comparison rig. NOT a Gorillium model.';
 showRig();buildMapOptions();
 setStatus(source==='device-glb'
  ?'Candidate decoded. Verify bones, then bind eight real tentacle joints.'
  :'Baseline inspected. This is Metal S1, NOT Gorillium; attack mapping disabled.');
 return {source,sha256:hash,rig:state.rig,skinJointCount:state.skinBones.length};
}
async function loadBaseline(){
 try{
  clearModel();setStatus('Loading existing Metal S1 rig from repository…');
  const response=await fetch('../assets/models/metal/metal_phase6_fight.glb',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await loadParsedGLB(await response.arrayBuffer(),{
   source:'baseline-metal-s1',name:'metal_phase6_fight.glb'});
 }catch(e){state.loadError=String(e);setStatus('Baseline load failed: '+String(e.message||e));throw e;}
}
button('baseline').addEventListener('click',()=>{loadBaseline().catch(console.error)});
get('glbUpload').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!/\.glb$/i.test(file.name)){setStatus('Only a self-contained .glb file can be inspected.');return;}
 if(file.size>MAX_FILE_BYTES){setStatus('File exceeds 80 MB preview safety limit.');return;}
 try{await loadParsedGLB(await file.arrayBuffer(),{source:'device-glb',name:file.name});}
 catch(error){state.loadError=String(error);setStatus('Model rejected: '+String(error.message||error));}
});
button('playClip').addEventListener('click',()=>{
 if(!state.mixer||!state.gltf?.animations?.length)return;
 if(state.activeEvent)return;
 state.mixer.stopAllAction();
 const clip=state.gltf.animations[0];
 state.mixer.clipAction(clip).reset().play();
 setStatus('Playing embedded original clip: '+clip.name+' (not guaranteed to be a tentacle move)');
});
function bind(){
 if(state.source!=='device-glb')return {ok:false,reason:'baseline-not-gorillium'};
 const ids=[...get('limbMap').querySelectorAll('select')].map(s=>s.value);
 if(ids.length!==8||ids.some(id=>!id)||new Set(ids).size!==8)
  return {ok:false,reason:'eight-distinct-real-joints-required'};
 const byId=new Map(state.skinBones.map(b=>[b.uuid,b]));
 if(ids.some(id=>!byId.has(id)))return {ok:false,reason:'not-skinned-joint'};
 state.mapped=ids.map(id=>byId.get(id));
 state.neutral=state.mapped.map(b=>b.quaternion.clone());
 state.game=createGorilliumState();setGorilliumForm(state.game,true);
 state.mixer?.stopAllAction();
 setActions(true);
 setStatus('Eight existing skinned joints bound. Experimental pose preview ready. Anatomy remains unapproved.');
 return {ok:true,source:state.source,names:state.mapped.map(b=>b.name)};
}
button('bind').addEventListener('click',()=>{
 const result=bind();if(!result.ok)setStatus('Binding blocked: '+result.reason);
});
function cast(move){
 if(state.mapped.length!==8||state.source!=='device-glb')
  return {ok:false,reason:'authentic-model-binding-required'};
 const result=castGorilliumAbility(state.game,move,{
  source:{x:0,y:0,z:0},target:{id:'qa-target',x:2,y:0,z:0}});
 if(!result.ok){setStatus('Cast blocked: '+result.reason);return result;}
 state.activeEvent=result.event;
 setStatus(move+' visual pose event on actual bound bones. No enemy hit/damage is claimed.');
 return result;
}
button('lash').addEventListener('click',()=>cast('tentacle-lash'));
button('tether').addEventListener('click',()=>cast('galaxy-tether'));
function updatePose(){
 if(!state.game||state.mapped.length!==8)return;
 const evt=state.activeEvent;
 const duration=evt?Math.max(.001,evt.holdSeconds):1;
 const progress=evt?Math.min(1,(state.game.clock-evt.at)/duration):1;
 const envelope=evt?Math.sin(Math.PI*progress):0;
 for(let i=0;i<8;i++){
  const bone=state.mapped[i],base=state.neutral[i];
  if(!bone||!base)continue;
  bone.quaternion.copy(base);
  if(evt?.limbIds.includes(i)){
   const theta=(evt.ability==='galaxy-tether'?.33:.68)*envelope*(i%2?-1:1);
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(theta,-theta*.5,theta*.3));
   bone.quaternion.multiply(q);
  }
 }
 if(evt&&progress>=1)state.activeEvent=null;
 const s=gorilliumStatus(state.game);
 get('counter').textContent='Charge: '+(s.charge*100).toFixed(1)+'% | Free limbs: '+s.freeLimbs+'/8';
}
function resize(){
 if(!renderer)return;
 const w=stage.clientWidth,h=stage.clientHeight;
 camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
let orbit=0,pitch=.28,radius=7.5,pointer=null,last=performance.now();
function updateCamera(){
 const y=1.55;
 camera.position.set(Math.sin(orbit)*Math.cos(pitch)*radius,
  y+Math.sin(pitch)*radius,Math.cos(orbit)*Math.cos(pitch)*radius);
 camera.lookAt(0,y,0);
}
stage.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;
 orbit+=(e.clientX-pointer.x)*.008;
 pitch=THREE.MathUtils.clamp(pitch-(e.clientY-pointer.y)*.006,-.4,1.25);
 pointer.x=e.clientX;pointer.y=e.clientY;});
stage.addEventListener('pointerup',()=>pointer=null);
stage.addEventListener('wheel',e=>{radius=THREE.MathUtils.clamp(radius+Math.sign(e.deltaY)*.6,3,20);e.preventDefault()},{passive:false});
function frame(now){
 if(!renderer)return;
 requestAnimationFrame(frame);
 const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 resize();updateCamera();
 if(state.mixer)state.mixer.update(dt);
 if(state.game){stepGorillium(state.game,dt);updatePose();}
 renderer.render(scene,camera);
}
if(renderer)requestAnimationFrame(frame);
window.__gorilliumLab={ready:!!renderer,loadBaseline,bind,cast,
 getSnapshot:()=>({source:state.source,sha256:state.sha256,renderReady:state.renderReady,
  clipCount:state.rig?.clips?.length??null,boneCount:state.rig?.bones?.length??null,
  skinJointCount:state.skinBones.length,boundCount:state.mapped.length,
  poseDeltaRadians:state.mapped.length?Math.max(...state.mapped.map((bone,i)=>bone.quaternion.angleTo(state.neutral[i]))):0,
  lastAbility:state.game?.lastEvent?.ability||null,error:state.loadError})};
