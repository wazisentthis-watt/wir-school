// WIR: Connected — unified open-world prototype (HTML/JS per Coach's decisions; Godot later).
// Sources: [S1] Metal InDa RIFFT, [S3] Valence Life, [S4] Retro Bowl, [S5] Stay On Page, attunement packet.
// Anything not stated in those sources is labelled PROPOSAL. Code is original; libs MIT, assets CC0.
import * as THREE from 'three';
import {makeGalliumLimb,galliumLiquidMat,GU} from './gallium_limb.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const $=id=>document.getElementById(id);
const VIOLET=0x9b5cff, GUN=0x4a4f57;
const LITE=/lite/.test(location.search);
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(isTouch)document.body.classList.add('touch');
window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));

// ---------- WIR Valence Profile (shared, localStorage). Logs only; never refills meters. ----------
const PKEY='wir_valence_profile_v1';
const profile=JSON.parse(localStorage.getItem(PKEY)||'null')||{created:Date.now(),decisions:[],achievements:[],discoveries:[],log:[]};
function plog(kind,text){const arr=profile[kind]||profile.log; if(kind!=='log'&&arr.includes(text))return; arr.push(text); profile.log.push(new Date().toLocaleTimeString()+' · '+text); if(profile.log.length>200)profile.log.shift(); localStorage.setItem(PKEY,JSON.stringify(profile)); if(kind!=='log')toast(text);}
let toastT=0;function toast(t){$('toast').innerHTML=t;$('toast').style.opacity=1;toastT=2.6;}

// ---------- renderer / scene ----------
const renderer=new THREE.WebGLRenderer({antialias:!isTouch,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.5:2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!LITE;if(LITE)renderer.setPixelRatio(1);renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x9fb6c8,60,260);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.1,600);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.55,0.5,0.86);composer.addPass(bloom);composer.addPass(new OutputPass());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
const hemi=new THREE.HemisphereLight(0xcfe6ff,0x3a3020,0.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:300});sun.shadow.bias=-0.0005;scene.add(sun,sun.target);

const tl=new THREE.TextureLoader(),gl=new GLTFLoader();
const loadG=u=>new Promise((res,rej)=>gl.load(u,res,undefined,rej));
function rep(t,r){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(r,r);t.colorSpace=THREE.SRGBColorSpace;return t;}

// ---------- city layout: Savannah [S3 start city]. Grid streets PROPOSAL. ----------
const BLOCK=44,ROAD=12,N=3; // blocks -N..N
const colliders=[];const anchors=[];
const SPOTS={ // special lots (PROPOSAL placements)
 skate:{bx:-1,by:0,name:'Skatepark',src:'[S1] Metal skate + grapple'},
 field:{bx:1,by:0,name:'Pickup Field',src:'[S4] Retro Bowl'},
 fight:{bx:0,by:1,name:'Fight Lot',src:'[S5] Stay On Page'},
 dojo:{bx:0,by:-1,name:'Dojo Plaza',src:'Attunement strings'},
 forge:{bx:-1,by:1,name:'The Forge',src:'[S2] Game Forge recipes'},
 pluto:{bx:1,by:-1,name:'Pluto Hub',src:'[S5] travel point → map'},
 home:{bx:0,by:0,name:'Forsyth Commons (home block)',src:'[S3] Valence Life'},
};
const lotCenter=(bx,by)=>new THREE.Vector3(bx*(BLOCK+ROAD),0,by*(BLOCK+ROAD));

async function buildWorld(setMsg){
 setMsg('Lighting (Poly Haven HDRI)…');
 try{const hdr=await new RGBELoader().loadAsync('assets/hdri/venice_sunset_1k.hdr');hdr.mapping=THREE.EquirectangularReflectionMapping;scene.environment=hdr;scene.background=hdr;scene.backgroundBlurriness=0.25;}catch(e){scene.background=new THREE.Color(0x8fb0d0);}
 const asphalt=rep(tl.load('assets/tex/asphalt_diff.jpg'),60);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({map:asphalt,roughness:.95}));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const walkM=new THREE.MeshStandardMaterial({color:0xb8b2a6,roughness:.9}), grassM=new THREE.MeshStandardMaterial({color:0x4f7a3a,roughness:1});
 const lineM=new THREE.MeshBasicMaterial({color:0xe8d27a});
 for(let i=-N;i<=N;i++){ // road lines
  for(const v of [0,1]){const l=new THREE.Mesh(new THREE.PlaneGeometry(v?0.3:400,v?400:0.3),lineM);l.rotation.x=-Math.PI/2;l.position.set(v?(i+.5)*(BLOCK+ROAD):0,0.02,v?0:(i+.5)*(BLOCK+ROAD));scene.add(l);}
 }
 setMsg('Kenney city kit…');
 const names='abcdefghij'.split('').map(c=>'building-'+c).concat(['building-skyscraper-a','building-skyscraper-b','building-skyscraper-c']);
 const bmods=await Promise.all(names.map(n=>loadG('assets/models/city/'+n+'.glb').then(g=>g.scene).catch(()=>null)));
 const special=Object.values(SPOTS);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let bx=-N;bx<=N;bx++)for(let by=-N;by<=N;by++){
  const c=lotCenter(bx,by);
  const slab=new THREE.Mesh(new THREE.BoxGeometry(BLOCK,0.25,BLOCK),walkM);slab.position.set(c.x,0.12,c.z);slab.receiveShadow=true;scene.add(slab);
  const sp=special.find(s=>s.bx===bx&&s.by===by);
  if(sp){sp.c=c;continue;}
  // 4 buildings per block
  for(const [ox,oz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
   const m=bmods[Math.floor(rnd()*bmods.length)];if(!m)continue;
   const b=m.clone();const s=7+rnd()*3;b.scale.setScalar(s);
   b.position.set(c.x+ox*BLOCK/4.3,0.25,c.z+oz*BLOCK/4.3);b.rotation.y=Math.floor(rnd()*4)*Math.PI/2;
   b.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});scene.add(b);
   const box=new THREE.Box3().setFromObject(b);colliders.push(box);
   for(const [x,z] of [[box.min.x,box.min.z],[box.max.x,box.max.z],[box.min.x,box.max.z],[box.max.x,box.min.z]])anchors.push(new THREE.Vector3(x,box.max.y,z));
  }
 }
 // street lamps (night hook) + grapple anchors on lamps
 lamps.length=0;
 const lampXZ=[];for(let i=-N;i<=N;i++)for(let j=-N;j<=N;j++)lampXZ.push([(i+.5)*(BLOCK+ROAD)-ROAD/2+0.8,j*(BLOCK+ROAD)]);
 for(const sp of special)if(sp.c){const e=BLOCK/2-1.2;for(const [ox,oz] of [[-1,-1],[1,-1],[-1,1],[1,1]])lampXZ.push([sp.c.x+ox*e,sp.c.z+oz*e]);} // grapple anchors around open lots (fix: none in range at spawn)
 for(const [x,z] of lampXZ){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,7),new THREE.MeshStandardMaterial({color:0x333,metalness:.8,roughness:.4}));pole.position.set(x,3.5,z);pole.castShadow=true;scene.add(pole);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.35),new THREE.MeshStandardMaterial({color:0x222,emissive:0xffd28a,emissiveIntensity:0}));bulb.position.set(x,7.1,z);scene.add(bulb);lamps.push(bulb);anchors.push(new THREE.Vector3(x,7.1,z));}
 buildSkatepark(SPOTS.skate.c);buildField(SPOTS.field.c);buildFight(SPOTS.fight.c);buildDojo(SPOTS.dojo.c);buildForge(SPOTS.forge.c);buildPluto(SPOTS.pluto.c);buildHome(SPOTS.home.c);
 // trees
 const trunkM=new THREE.MeshStandardMaterial({color:0x5a3d22}),leafM=new THREE.MeshStandardMaterial({color:0x3c6b2c,roughness:1});
 for(let k=0;k<40;k++){const x=(rnd()-.5)*360,z=(rnd()-.5)*360; if(Math.abs(((x%56)+56)%56-28)<8)continue;
  const t=new THREE.Group();const tr=new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,3),trunkM);tr.position.y=1.5;const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8,1),leafM);lf.position.y=3.8;t.add(tr,lf);
  t.traverse(o=>o.castShadow=true);t.position.set(x,0.25,z);if(!colliders.some(b=>b.containsPoint(new THREE.Vector3(x,1,z))))scene.add(t);}
}
const lamps=[];
function label(text,pos,color='#d6c2ff'){const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');g.fillStyle='rgba(10,8,20,.75)';g.roundRect(0,0,512,96,20);g.fill();g.fillStyle=color;g.font='bold 44px system-ui';g.textAlign='center';g.fillText(text,256,62);
 const s=new THREE.Mesh(new THREE.PlaneGeometry(8,1.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,side:THREE.DoubleSide}));s.position.copy(pos);scene.add(s);return s;}
const signs=[];
function sign(spot,y=6){const s=label(spot.name,spot.c.clone().add(new THREE.Vector3(0,y,-BLOCK/2+1)));signs.push(s);}
const ramps=[];// {box, type}
function buildSkatepark(c){sign(SPOTS.skate);const m=new THREE.MeshStandardMaterial({color:0x9a9a9e,roughness:.6});
 // kicker ramps (airs only from lips/kickers [S1])
 for(const [x,z,r] of [[-10,-8,0],[10,8,Math.PI],[-12,10,Math.PI/2],[12,-10,-Math.PI/2]]){const g=new THREE.Mesh(new THREE.BoxGeometry(6,0.4,7),m);g.position.set(c.x+x,1,c.z+z);g.rotation.set(-0.32,r,0,'YXZ');g.castShadow=g.receiveShadow=true;scene.add(g);ramps.push({p:new THREE.Vector3(c.x+x,0,c.z+z),r:3.6,kick:9});}
 // rail
 const rail=new THREE.Mesh(new THREE.BoxGeometry(14,.12,.12),new THREE.MeshStandardMaterial({color:GUN,metalness:1,roughness:.3}));rail.position.set(c.x,0.9,c.z);rail.castShadow=true;scene.add(rail);
 rails.push({a:new THREE.Vector3(c.x-7,0.9,c.z),b:new THREE.Vector3(c.x+7,0.9,c.z)});
 const bowl=new THREE.Mesh(new THREE.TorusGeometry(6,1.2,8,32,Math.PI*2),m);bowl.rotation.x=Math.PI/2;bowl.position.set(c.x+12,0.3,c.z+12);bowl.receiveShadow=true;scene.add(bowl);
}
const rails=[];
let ball,fieldC;const defenders=[];
function buildField(c){sign(SPOTS.field);fieldC=c;const turf=new THREE.Mesh(new THREE.PlaneGeometry(36,22),new THREE.MeshStandardMaterial({color:0x2f7d32,roughness:1}));turf.rotation.x=-Math.PI/2;turf.position.set(c.x,0.26,c.z);turf.receiveShadow=true;scene.add(turf);
 for(let i=-3;i<=3;i++){const l=new THREE.Mesh(new THREE.PlaneGeometry(.2,22),new THREE.MeshBasicMaterial({color:0xffffff}));l.rotation.x=-Math.PI/2;l.position.set(c.x+i*6,0.27,c.z);scene.add(l);}
 for(const s of [-1,1]){const ez=new THREE.Mesh(new THREE.PlaneGeometry(4,22),new THREE.MeshStandardMaterial({color:s<0?0x6a2bd1:0xb02a3a}));ez.rotation.x=-Math.PI/2;ez.position.set(c.x+s*20,0.265,c.z);scene.add(ez);}
 ball=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),new THREE.MeshStandardMaterial({color:0x7a3b16,roughness:.7}));ball.scale.set(1,.65,.65);ball.castShadow=true;ball.position.set(c.x,0.5,c.z);scene.add(ball);}
let fightC;function buildFight(c){sign(SPOTS.fight);fightC=c;const ring=new THREE.Mesh(new THREE.CylinderGeometry(8,8,.3,40),new THREE.MeshStandardMaterial({color:0x222233,roughness:.5}));ring.position.set(c.x,0.4,c.z);ring.receiveShadow=true;scene.add(ring);
 const edge=new THREE.Mesh(new THREE.TorusGeometry(8,.1,8,64),new THREE.MeshStandardMaterial({color:0xff5050,emissive:0xff2020,emissiveIntensity:1.5}));edge.rotation.x=Math.PI/2;edge.position.set(c.x,0.56,c.z);scene.add(edge);}
let dojoC;const slabs=[];function buildDojo(c){sign(SPOTS.dojo);dojoC=c;const floor=new THREE.Mesh(new THREE.CylinderGeometry(10,10,.2,6),new THREE.MeshStandardMaterial({color:0x8a7a62,roughness:.8}));floor.position.set(c.x,0.35,c.z);floor.receiveShadow=true;scene.add(floor);
 const pond=new THREE.Mesh(new THREE.CircleGeometry(3,32),new THREE.MeshStandardMaterial({color:0x2a6fb0,roughness:.1,metalness:.3}));pond.rotation.x=-Math.PI/2;pond.position.set(c.x+12,0.3,c.z);scene.add(pond);}
let forgeC;function buildForge(c){sign(SPOTS.forge);forgeC=c;const anv=new THREE.Mesh(new THREE.BoxGeometry(3,2,2),new THREE.MeshStandardMaterial({color:0x3a3a40,metalness:.9,roughness:.35}));anv.position.set(c.x,1.2,c.z);anv.castShadow=true;scene.add(anv);
 const fire=new THREE.Mesh(new THREE.SphereGeometry(.7),new THREE.MeshStandardMaterial({color:0x000,emissive:0xff7a20,emissiveIntensity:3}));fire.position.set(c.x+3,1,c.z);scene.add(fire);}
let plutoC,plutoRing;function buildPluto(c){sign(SPOTS.pluto);plutoC=c;plutoRing=new THREE.Mesh(new THREE.TorusGeometry(3,.25,12,64),new THREE.MeshStandardMaterial({color:0x111,emissive:0x6fb7ff,emissiveIntensity:2}));plutoRing.position.set(c.x,3.4,c.z);scene.add(plutoRing);}
let cartPos,benchPos;function buildHome(c){sign(SPOTS.home);
 const fount=new THREE.Mesh(new THREE.CylinderGeometry(3,3.4,1,24),new THREE.MeshStandardMaterial({color:0xd8d2c4}));fount.position.set(c.x,0.6,c.z);fount.castShadow=true;scene.add(fount);colliders.push(new THREE.Box3().setFromObject(fount));
 cartPos=new THREE.Vector3(c.x+10,0,c.z+8);const cart=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.4,1.4),new THREE.MeshStandardMaterial({color:0xd84a2a}));cart.position.copy(cartPos).setY(1);cart.castShadow=true;scene.add(cart);label('Food cart',cartPos.clone().setY(3),'#ffd28a').scale.setScalar(.5);
 benchPos=new THREE.Vector3(c.x-10,0,c.z+8);const bench=new THREE.Mesh(new THREE.BoxGeometry(3,.5,1),new THREE.MeshStandardMaterial({color:0x6b4a2a}));bench.position.copy(benchPos).setY(.6);bench.castShadow=true;scene.add(bench);label('Bench · rest',benchPos.clone().setY(2.4),'#bfe').scale.setScalar(.5);}

// ---------- characters (Quaternius CC0 rigged robot, recoloured) ----------
let robotGLTF;const mixers=[];
function makeChar(tint,metal=false){const o=SkeletonUtils.clone(robotGLTF.scene);const mats={};
 o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.material=m.material.clone();const mt=m.material;
  if(metal){mt.color.set(/Main|Grey/i.test(mt.name)?0x2a2d33:GUN);mt.metalness=.85;mt.roughness=.35;mt.emissive=new THREE.Color(VIOLET);mt.emissiveIntensity=0;}
  else if(/Main/i.test(mt.name))mt.color.set(tint);mats[mt.name]=mt;}});
 o.scale.setScalar(.42);const mixer=new THREE.AnimationMixer(o);mixers.push(mixer);const acts={};for(const c of robotGLTF.animations)acts[c.name]=mixer.clipAction(c);
 const ch={o,mixer,acts,cur:null,mats};play(ch,'Idle');return ch;}
function play(ch,name,once=false,fade=.18){const a=ch.acts[name];if(!a||ch.cur===a&&!once)return;if(once){a.reset();a.setLoop(THREE.LoopOnce);a.clampWhenFinished=true;}if(ch.cur&&ch.cur!==a)ch.cur.fadeOut(fade);a.reset().fadeIn(fade).play();ch.cur=a;ch.curName=name;}

// ---------- 3D Metal (rigged PLACEHOLDER model from wir-assets) ----------
let metalGLTF,boardGLTF,seamMats=[];const MASKS=['none','HeavyCrown','KITO'];let maskI=0;
const PMAP={Idle:'Idle_Loop',Walking:'Walk_Loop',Running:'Sprint_Loop',Jump:'Jump_Loop',Punch:'Punch_Jab',Cross:'Punch_Cross',Kick:'Kick_Front_PROPOSAL',Standing:'Idle_Loop',Skate:'Idle_Loop',Block:'Crouch_Idle_Loop',ThumbsUp:'Interact',Dance:'Dance_Loop',No:'Hit_Chest',Charge:'Spell_Simple_Idle_Loop',Blast:'Spell_Simple_Shoot',Swing:'Jump_Loop'};
function makeMetal(){const root=new THREE.Group();const o=metalGLTF.scene;root.add(o);
 o.traverse(m=>{if(!m.isMesh)return;m.castShadow=true;m.frustumCulled=false;const ms=Array.isArray(m.material)?m.material:[m.material];
  ms.forEach(mt=>{if(!mt.emissive)return;if(/Seam_Violet/i.test(mt.name)){mt.emissive=new THREE.Color(VIOLET);mt.emissiveIntensity=0;mt.color.set(0x3a2a55);seamMats.push(mt);}else if(!/Eye/i.test(mt.name)){mt.emissiveIntensity=0;}});});
 const mixer=new THREE.AnimationMixer(o);mixers.push(mixer);const acts={};for(const c of metalGLTF.animations)acts[c.name]=mixer.clipAction(c);
 for(const [k,v] of Object.entries(PMAP))if(acts[v])acts[k]=acts[v];
 for(const [k,v] of Object.entries(P6MAP))if(!acts[k]&&acts[v])acts[k]=acts[v];
 const ch={o:root,model:o,mixer,acts,cur:null,mats:{},footY:0};play(ch,'Idle');mixer.update(0.01);root.updateMatrixWorld(true);
 const bb=new THREE.Box3().setFromObject(o,true);ch.footY=-bb.min.y;o.position.y=ch.footY; // feet at y=0 of the root
 const h=bb.max.y-bb.min.y;if(h>0.5){o.scale.setScalar(1.78/h);o.position.y=ch.footY*1.78/h;ch.footY=o.position.y;} // 1.78 m PLACEHOLDER height
 ch.feet=[];o.traverse(b=>{if(b.isBone&&/^(DEF-?(toe|foot)|Foot)\.?_?[LR]$/i.test(b.name))ch.feet.push(b);});root.updateMatrixWorld(true);
 ch.soleGap=Math.min(...ch.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y))-root.position.y; // foot-bone height above sole in idle
 setMask(0,ch);return ch;}

// ---------- Metal S1–S4 forms (rigged by Metal's Bot, PROPOSAL; compressed for web) ----------
const FORM_FILES=['S1','S2','S3','S4'].map(s=>'assets/models/metal/forms/metal_'+s+'_PROPOSAL.glb');FORM_FILES[0]='assets/models/metal/metal_phase6_rig.glb'; /* S1 = Phase 6 game rig (metal_placeholder.glb from metal_inda_rifft phase 6) */const formGLTF=[];
const FORM_LABEL=['S1 · Phase 6 game rig, black spiky crown (PLACEHOLDER mesh)','S2 · violet seams','S3 · braided mane · bandaged right hand · Merkaba on back','S4 · the Lion · bandaged right hand · Merkaba carryover PROPOSAL'];
// Phase 6 rig clip names (33 clips: stand walk run cruise push carve ollie air land grind manual slide bail wallride swing flight punch_l/r kick_l/r block charge blast transform …)
const P6MAP={Idle:'stand',Standing:'stand',Walking:'walk',Running:'run',Jump:'air',Air:'air',Punch:'punch_l',Cross:'punch_r',Kick:'kick_r',Block:'block',ThumbsUp:'transform',Dance:'stand',No:'stand',Charge:'charge',Blast:'blast',Swing:'swing',Grind:'grind',Carve:'carve',Sitting:'stand',Skate:'cruise',BoardIdle:'idle',Push:'push',Ollie:'ollie',Land:'land',Manual:'manual',Bail:'bail',Flight:'flight',Wallride:'wallride',Slide:'slide',Slam:'slam'};
const traceMats=[];
const FMAP={Idle:'idle',Standing:'idle',Walking:'cruise',Running:'skate_push',Skate:'cruise',Jump:'ollie',Punch:'punch',Cross:'punch',Kick:'slam',Block:'idle',ThumbsUp:'idle',Dance:'idle',No:'idle',Charge:'flight_stance',Blast:'punch',Swing:'swing',Grind:'grind',Carve:'carve',Sitting:'idle'};
function buildFormModel(gltf,i){const o=gltf.scene;o.traverse(m=>{if(!m.isMesh)return;m.castShadow=true;m.frustumCulled=false;
  const ms=Array.isArray(m.material)?m.material:[m.material];ms.forEach(mt=>{if(/Bandage/i.test(mt.name||m.name)){mt.emissiveIntensity=.35;mt.userData.bandage=true;bandMats.push(mt);}});});
 const mixer=new THREE.AnimationMixer(o);const acts={};for(const c of gltf.animations)acts[c.name]=mixer.clipAction(c);for(const [k,v] of Object.entries(FMAP))if(acts[v])acts[k]=acts[v];
 if(i===0){for(const [k,v] of Object.entries(P6MAP))if(acts[v])acts[k]=acts[v];
  o.traverse(m=>{if(!m.isMesh)return;const mt=m.material;if(mt.name==='seam'){mt.emissive=new THREE.Color(VIOLET);mt.emissiveIntensity=0;seamMats.push(mt);}if(mt.name==='trace')traceMats.push(mt);});} // canon: violet only on active seams; the trace flashes through the denim on load/land
 return {model:o,mixer,acts};}
const bandMats=[];
async function setForm(i){if(!P||i<0||i>3)return;let g=formGLTF[i];if(!g){try{g=formGLTF[i]=await loadG(FORM_FILES[i]);}catch(e){toast('Form load failed');return;}}
 if(!g.__built)g.__built=buildFormModel(g,i);const f=g.__built;
 P.o.remove(P.model);const mi=mixers.indexOf(P.mixer);if(mi>=0)mixers.splice(mi,1);
 P.o.add(f.model);P.model=f.model;P.mixer=f.mixer;P.acts=f.acts;P.cur=null;mixers.push(f.mixer);f.model.scale.setScalar(1);f.model.position.set(0,0,0);
 play(P,'Idle');f.mixer.update(.01);P.o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(f.model,true);const h=bb.max.y-bb.min.y;const sc=h>.3?1.78/h:1;
 f.model.scale.setScalar(sc);P.o.updateMatrixWorld(true);const b2=new THREE.Box3().setFromObject(f.model,true);f.model.position.y=-(b2.min.y-P.o.position.y);P.footY=f.model.position.y;
 P.feet=[];f.model.traverse(b=>{if(b.isBone&&(/^(DEF-?(toe|foot)|Foot)\.?_?[LR]$/i.test(b.name)||/^(Left|Right)Foot$/.test(b.name)))P.feet.push(b);});P.o.updateMatrixWorld(true);
 P.soleGap=P.feet.length?Math.min(...P.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y))-(P.o.position.y):0;
 P.footL=f.model.getObjectByName('FootL')||f.model.getObjectByName('Foot.L')||f.model.getObjectByName('LeftFoot');P.handBone=f.model.getObjectByName('HandR')||f.model.getObjectByName('Hand.R')||f.model.getObjectByName('LowerArmR')||f.model.getObjectByName('RightHand');
 P.p6=i===0;P.rotWalk=P.p6?Math.PI:0;P.rotBoard=P.p6?Math.PI/2:-1.35;P.legs=P.p6?{hips:f.model.getObjectByName('Hips'),chest:f.model.getObjectByName('Chest'),L:['LeftUpperLeg','LeftLowerLeg','LeftFoot'].map(n=>f.model.getObjectByName(n)),R:['RightUpperLeg','RightLowerLeg','RightFoot'].map(n=>f.model.getObjectByName(n))}:null;
 st.metalForm=i+1;st.form=i+1;st.season='S'+(i+1);window.__badge&&window.__badge('S'+(i+1)+' · '+FORM_LABEL[i]+' · PROPOSAL');window.__realForms=true;const fb=document.getElementById('formBtn');if(fb)fb.textContent='FORM S'+(i+1);
 toast('Form '+FORM_LABEL[i]+' — PROPOSAL');dispatchEvent(new Event('wir-form'));}
window.__setForm=setForm;
// keep soles exactly on the surface (deck top when skating) regardless of pose blend
const _fv=new THREE.Vector3();function seatFeet(dt){if(!P.feet.length)return;P.o.updateMatrixWorld(true);let mb=1e9;const ft=(st.board&&P.p6&&P.footL)?[P.footL]:P.feet;for(const b of ft)mb=Math.min(mb,b.getWorldPosition(_fv).y);
 const surf=P.o.position.y+(st.board?DECK_TOP:0);const err=(surf+P.soleGap)-mb;if(onGround||st.board)P.model.position.y+=THREE.MathUtils.clamp(err,-.5,.5)*Math.min(1,dt*20);}
function setMask(i,ch=P){maskI=i;ch.model.traverse(m=>{const n=m.name||'';const mm=n.match(/Mask_(HeavyCrown|KITO)/i);if(mm)m.visible=MASKS[maskI].toLowerCase()===mm[1].toLowerCase();});}
// player = Metal [S1]: gunmetal, violet only on active moves; left leg covered (PROPOSAL: robot proxy until 3D Metal model lands)
let P;const vel=new THREE.Vector3();let onGround=true,yaw=0,camYaw=0,camPitch=.35;
const st={mode:'walk',board:false,gal:1,ori:1,charge:0,root:0,flying:false,swing:null,combo:0,comboPend:0,carry:false,hp:1,form:1,
 needs:{hunger:.8,energy:.8,social:.6},orbitals:{work:.5,body:.6,bonds:.5,mind:.5,money:.4}, score:[0,0], team:.5};
let board;function makeBoard(){const g=new THREE.Group();const deck=new THREE.Mesh(new THREE.BoxGeometry(.28,.04,.95),new THREE.MeshStandardMaterial({color:0x15151a,roughness:.6}));deck.position.y=.12;g.add(deck);
 const wm=new THREE.MeshStandardMaterial({color:0xC9A979,roughness:.55});// TAN wheels (canon)
 for(const [x,z] of [[-.13,-.33],[.13,-.33],[-.13,.33],[.13,.33]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.05,14),wm);w.rotation.z=Math.PI/2;w.position.set(x,.06,z);g.add(w);} // FOUR wheels, never a hoverboard
 g.traverse(o=>o.castShadow=true);return g;}
// PROPOSAL: thin violet line replaced by Galaxy Gallium LIMB (see gallium_limb.js); tether kept as an invisible stub so physics/control code is unchanged
const _bu=new THREE.Vector3(),_bf=new THREE.Vector3();const tether=new THREE.Group();tether.visible=false;let galLimb=null;const _hand=new THREE.Vector3();
const merkaba=new THREE.Mesh(new THREE.OctahedronGeometry(.9,0),new THREE.MeshStandardMaterial({color:0x000,emissive:VIOLET,emissiveIntensity:2,wireframe:true}));merkaba.visible=false;

// NPCs with routines [S3 living city]; traffic (Kenney cars)
const npcs=[];const cars=[];let rival,rivalSt;
function wp(){const i=Math.floor(Math.random()*7)-3,j=Math.floor(Math.random()*7)-3;const c=lotCenter(i,j);const e=BLOCK/2+2;return new THREE.Vector3(c.x+(Math.random()<.5?-e:e),0.25,c.z+(Math.random()-.5)*BLOCK);}
async function spawnLife(){const tints=[0xd9a066,0x5ea1d6,0xc85a5a,0x7bc47f,0xe0c35a,0xa07ad6,0xeeeeee,0x444444];

 const n=isTouch?10:18;for(let i=0;i<n;i++){const ch=makeChar(tints[i%tints.length]);ch.o.position.copy(wp());ch.target=wp();ch.speed=1.3+Math.random()*.6;ch.wait=0;ch.role=['commuter','vendor','student','jogger'][i%4];scene.add(ch.o);play(ch,'Walking');npcs.push(ch);}
 rival=makeChar(0xff5050);rival.o.position.copy(fightC).add(new THREE.Vector3(3,0.55,0));scene.add(rival.o);rivalSt={stance:1,charge:0,cd:0,active:false};
 for(let i=0;i<3;i++){const d=makeChar(0xb02a3a);d.o.position.copy(fieldC).add(new THREE.Vector3(8+i*3,0.26,(i-1)*5));d.home=d.o.position.clone();scene.add(d.o);defenders.push(d);}
 const cm=['taxi','sedan','suv','van','police','delivery','truck'];const mods=await Promise.all(cm.map(n=>loadG('assets/models/cars/'+n+'.glb').then(g=>g.scene).catch(()=>null)));
 for(let i=0;i<(isTouch?8:14);i++){const m=mods[i%mods.length];if(!m)continue;const c=m.clone();c.scale.setScalar(2.2);c.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  const axis=i%2,lane=(Math.floor(Math.random()*6)-3+.5)*(BLOCK+ROAD),dir=Math.random()<.5?1:-1;c.userData={axis,lane:lane+dir*2.8,dir,t:(Math.random()-.5)*400,spd:9+Math.random()*5};scene.add(c);cars.push(c);}
}

// ---------- input: keyboard, touch, gamepad (one scheme for the whole world) ----------
const keys={},pressed={};
addEventListener('keydown',e=>{if(/^F[1-4]$/.test(e.code))e.preventDefault();if(!keys[e.code])pressed[e.code]=true;keys[e.code]=true;if(e.code.startsWith('Numpad')||e.code==='Space')e.preventDefault();});
addEventListener('keyup',e=>keys[e.code]=false);
let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2){pressed.KeyQ=true;return;}drag={x:e.clientX,y:e.clientY,id:e.pointerId};});
addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){camYaw-=(e.clientX-drag.x)*.005;camPitch=THREE.MathUtils.clamp(camPitch+(e.clientY-drag.y)*.004,-.1,1.1);drag.x=e.clientX;drag.y=e.clientY;}});
addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId)drag=null;});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
const stick={x:0,y:0};{const s=$('stick'),n=$('nub');let id=null;const mv=e=>{const r=s.getBoundingClientRect();let x=(e.clientX-r.left-65)/55,y=(e.clientY-r.top-65)/55;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}stick.x=x;stick.y=y;n.style.left=40+x*45+'px';n.style.top=40+y*45+'px';};
 s.addEventListener('pointerdown',e=>{id=e.pointerId;s.setPointerCapture(id);mv(e);});s.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e);});s.addEventListener('pointerup',()=>{id=null;stick.x=stick.y=0;n.style.left=n.style.top='40px';});}
document.querySelectorAll('#tbtn button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();pressed[b.dataset.k]=true;keys[b.dataset.k]=true;});b.addEventListener('pointerup',()=>{keys[b.dataset.k]=false;if(b.dataset.k==='KeyX')xRel=true;});});
// Xbox layout [S5]: A jump, B board, X 4-hand, Y 6-hand, LB grapple, RB fly, LT block, RT charge, Back map, Start profile, dpad interact
const padMap={0:'Space',1:'KeyB',2:'Numpad4',3:'Numpad6',4:'KeyQ',5:'KeyF',6:'Numpad2',7:'Numpad5',8:'KeyM',9:'KeyP',12:'KeyE',13:'KeyX',14:'Numpad1',15:'Numpad3'};const padPrev={};
function pollPad(){const gp=navigator.getGamepads?[...navigator.getGamepads()].find(g=>g):null;if(!gp)return null;
 for(const [i,k] of Object.entries(padMap)){const v=gp.buttons[i]&&gp.buttons[i].pressed;if(v&&!padPrev[i])pressed[k]=true;keys[k]=v||keys[k]&&!padPrev[i]?v:keys[k];padPrev[i]=v;}
 const dz=v=>Math.abs(v)<.15?0:v;if(gp.axes.length>=4){camYaw-=dz(gp.axes[2])*.04;camPitch=THREE.MathUtils.clamp(camPitch+dz(gp.axes[3])*.03,-.1,1.1);}return {x:dz(gp.axes[0]),y:dz(gp.axes[1])};}
const tap=c=>{const v=pressed[c];pressed[c]=false;return v;};
const ALT={KeyU:'Numpad7',KeyI:'Numpad8',KeyY:'Numpad9',KeyJ:'Numpad4',KeyK:'Numpad5',KeyL:'Numpad6',KeyM_:'Numpad1',Comma:'Numpad2',Period:'Numpad3'}; // laptop fallback [S5]

// ---------- audio hook (Web Audio; song picks need Coach's yes [S4]) ----------
let actx;function beep(f=440,d=.08,type='square',v=.05){try{actx=actx||new AudioContext();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+d);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+d);}catch(e){}}

// ---------- systems ----------
let tod=8,weather='clear',weatherT=60;const rain=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xaaccff,size:.12,transparent:true,opacity:.6}));
{const a=new Float32Array(3000*3);for(let i=0;i<a.length;i++)a[i]=(Math.random()-.5)*80;rain.geometry.setAttribute('position',new THREE.BufferAttribute(a,3));rain.visible=false;scene.add(rain);}
const groundY=0.25;const BOARD_S=1.15,DECK_TOP=0.099*BOARD_S; // deck top of the 4-wheel GLB
let lastHit=null;function collide(p){lastHit=null;for(const b of colliders){if(p.x>b.min.x-.4&&p.x<b.max.x+.4&&p.z>b.min.z-.4&&p.z<b.max.z+.4&&p.y<b.max.y-.2){
 const dx1=p.x-(b.min.x-.4),dx2=(b.max.x+.4)-p.x,dz1=p.z-(b.min.z-.4),dz2=(b.max.z+.4)-p.z;const m=Math.min(dx1,dx2,dz1,dz2);
 const n=m===dx1?new THREE.Vector3(-1,0,0):m===dx2?new THREE.Vector3(1,0,0):m===dz1?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,0,1);lastHit={b,n,into:-vel.dot(n),hv:new THREE.Vector3(vel.x,0,vel.z)};
 if(m===dx1){p.x=b.min.x-.4;vel.x=Math.min(vel.x,0);}else if(m===dx2){p.x=b.max.x+.4;vel.x=Math.max(vel.x,0);}else if(m===dz1){p.z=b.min.z-.4;vel.z=Math.min(vel.z,0);}else{p.z=b.max.z+.4;vel.z=Math.max(vel.z,0);}
 if(st.flying){st.ori-=.25;toast('Collision — orientation shaken');} return true;}}return false;}
// ---------- WALL RIDE (gravity reorients to the wall face; four wheels stay on the surface; no teleport, no hover) ----------
// All numbers PROPOSAL tuning — Coach to correct.
const WR={rampCost:.06,rampMinSpeed:5,minSpeed:7.5,minInto:3,climbShare:.85,decay:.06,wallGrav:4.5,steer:9,maxSpeed:17,jumpOff:9,jumpUp:6,minRide:1.6,roofPop:1.2}; // PROPOSAL
// Wheels read the wall material: adhesion holds him on, rolling friction drops so he stays fast. PROPOSAL numbers.
const WALLMAT={brick:{stick:.75,roll:.55},concrete:{stick:.7,roll:.6},glass:{stick:.5,roll:.35},metal:{stick:1,roll:.25}}; // PROPOSAL
function matOf(b){if(!b.userData)b.userData={};if(!b.userData.mat){const k=['brick','concrete','glass','metal'];const h=Math.abs(Math.floor(b.min.x*7.13+b.min.z*3.71+b.max.y*1.9));b.userData.mat=k[h%4];}return b.userData.mat;} // PLACEHOLDER material tags until buildings carry real ones
const ramps3=[];let shimmer=null;
function galliumRamp(pos,n){ // short curved liquid-metal ramp at the wall base; dissolves after
 const sh=new THREE.Shape();const R=1.6;sh.moveTo(0,0);for(let i=0;i<=12;i++){const a=i/12*Math.PI/2;sh.lineTo(R-Math.cos(a)*R,R-Math.sin(a)*R+0);}sh.lineTo(R,0);sh.lineTo(0,0);
 const g=new THREE.ExtrudeGeometry(sh,{depth:1.4,steps:8,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:3,curveSegments:12});g.translate(-R,0,-.7);
 const m=galliumLiquidMat({emissive:0x9b5cff,emissiveIntensity:.25,opacity:.95});{const ob=m.onBeforeCompile;m.onBeforeCompile=sh=>{ob(sh);sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed+=normal*0.06*sin(position.x*6.0+position.z*4.0-uT*9.0)+vec3(0.0,0.04*sin(position.x*9.0-uT*12.0),0.0);').replace('void main() {','uniform float uT;\nvoid main() {');};} // liquid ramp ripples (PROPOSAL)
 const mesh=new THREE.Mesh(g,m);mesh.position.set(pos.x,.25,pos.z);mesh.rotation.y=Math.atan2(n.x,n.z)+Math.PI/2;
 // orient so curve rises toward the wall: local +x points into the wall
 const into=n.clone().negate();mesh.rotation.y=Math.atan2(-into.z,into.x);mesh.position.addScaledVector(n,-.4);
 scene.add(mesh);ramps3.push({mesh,t:0});}
function tickRamps(dt){for(let i=ramps3.length-1;i>=0;i--){const r=ramps3[i];r.t+=dt;const m=r.mesh.material;if(r.t>.5){m.opacity=Math.max(0,.95-(r.t-.5)*1.2);r.mesh.scale.y=Math.max(.05,1-(r.t-.5)*.9);m.emissiveIntensity=.25+Math.sin(r.t*20)*.15;}GU.value=performance.now()/1000;
 if(r.t>1.3){scene.remove(r.mesh);r.mesh.geometry.dispose();m.dispose();ramps3.splice(i,1);}}
 if(!shimmer){shimmer=new THREE.Mesh(new THREE.RingGeometry(.12,.38,24),new THREE.MeshBasicMaterial({color:0xd8c8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));scene.add(shimmer);}
 const el=document.getElementById('wallmat');
 if(st.wall){const w=st.wall;shimmer.position.copy(P.o.position).addScaledVector(w.n,-.38);shimmer.lookAt(shimmer.position.clone().add(w.n));shimmer.material.opacity=.25+Math.sin(performance.now()*.02)*.12;shimmer.scale.setScalar(1+Math.sin(performance.now()*.013)*.15);
  if(el){el.style.display='block';el.textContent='WALL · '+w.mat.toUpperCase()+' · stick '+WALLMAT[w.mat].stick.toFixed(2)+' (PROPOSAL)';}}
 else{shimmer.material.opacity=0;if(el)el.style.display='none';}}
function floorAt(p){let y=groundY;for(const b of colliders){if(p.x>b.min.x-.3&&p.x<b.max.x+.3&&p.z>b.min.z-.3&&p.z<b.max.z+.3&&p.y>=b.max.y-.35&&b.max.y>y)y=b.max.y;}return y;} // rooftops are real floors
function startWall(h){const n=h.n,t=new THREE.Vector3(-n.z,0,n.x);const s=Math.min(WR.maxSpeed,h.hv.length());const along=h.hv.dot(t);
 const mat=matOf(h.b);st.wall={b:h.b,n:n.clone(),t,mat,up:Math.max(4,s*WR.climbShare)*(h.ramp?1.15:1),side:along*.9,time:0};if(h.ramp){st.gal=Math.max(0,st.gal-WR.rampCost);galliumRamp(P.o.position,n);setViolet(.8);}vel.set(0,0,0);onGround=false;st.comboPend++;
 plog('discoveries','Wall ride — gravity point locked to the wall');toast((h.ramp?'Gallium ramp → ':'')+'WALL RIDE — '+mat+' grip');beep(520,.12,'triangle');}
function wallRide(dt,wish,pp){const w=st.wall,b=w.b,n=w.n,t=w.t;w.time+=dt;
 // steer across the wall (camera-relative A/D/W/S projected onto the wall plane)
 w.side+=wish.dot(t)*WR.steer*dt;w.up+=(-wish.dot(n))*WR.steer*.6*dt;
 // speed decays slowly; a little residual world pull keeps it a ride, not a hover
 const M=WALLMAT[w.mat];const k=1-WR.decay*M.roll*2*dt;w.side*=k;w.up=w.up*k-WR.wallGrav*(1.5-M.stick)*dt;
 const sp=Math.hypot(w.side,w.up);if(sp>WR.maxSpeed){w.side*=WR.maxSpeed/sp;w.up*=WR.maxSpeed/sp;}
 pp.addScaledVector(t,w.side*dt);pp.y+=w.up*dt;
 // pin wheels to the wall face
 if(n.x)pp.x=n.x>0?b.max.x+.4:b.min.x-.4;else pp.z=n.z>0?b.max.z+.4:b.min.z-.4;
 vel.copy(t).multiplyScalar(w.side).setY(w.up);setViolet(.35); // subtle seam glow while riding
 const exit=(v,msg)=>{st.wall=null;vel.copy(v);onGround=false;if(msg)toast(msg);};
 if(tap('Space')){st.boardFree=.35;exit(n.clone().multiplyScalar(WR.jumpOff).addScaledVector(t,w.side).setY(Math.max(w.up,0)+WR.jumpUp),'Kick off!');st.comboPend++;play(P,'Jump',true);return;}
 if(st.swing){st.wall=null;return;} // chained into grapple
 if(pp.y>=b.max.y-.15){ // crest the top onto the roof
  pp.y=b.max.y+.05;pp.addScaledVector(n,-WR.roofPop);st.wall=null;vel.copy(n).multiplyScalar(-Math.max(5,w.up*.6)).addScaledVector(t,w.side);vel.y=0;onGround=true;bank();toast('Roof transfer');plog('discoveries','Wall ride → rooftop');return;}
 const off=n.x?(pp.z<b.min.z-.2||pp.z>b.max.z+.2):(pp.x<b.min.x-.2||pp.x>b.max.x+.2);
 if(off){exit(vel.clone(),'Off the edge');return;}
 if(pp.y<=groundY+.05&&w.up<0){pp.y=groundY;exit(vel.clone().setY(0));onGround=true;bank();return;}
 if(w.time>WR.minRide&&sp<2.2)exit(n.clone().multiplyScalar(3),'Lost the wall — gravity back to ground');}
const _wq=new THREE.Quaternion(),_wm=new THREE.Matrix4();
function nearest(arr,p,max){let best=null,bd=max;for(const a of arr){const d=a.distanceTo(p);if(d<bd){bd=d;best=a;}}return best;}
function where(p){for(const s of Object.values(SPOTS)){if(s.c&&Math.abs(p.x-s.c.x)<BLOCK/2&&Math.abs(p.z-s.c.z)<BLOCK/2)return s;}return null;}
let lastSpot=null;

function bank(){if(st.comboPend>0){const g=Math.min(.25,st.comboPend*.04);st.gal=Math.min(1,st.gal+g);toast('Combo banked ×'+st.comboPend+' → Gallium +');if(st.comboPend>=5)plog('achievements','5-trick combo banked');}st.comboPend=0;}
function bail(){if(st.comboPend>0)toast('Bail — pending combo lost');st.comboPend=0;} // [S1] bail drops pending combo

function fightInput(){let k=null;for(const c of ['Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6','Numpad7','Numpad8','Numpad9'])if(tap(c))k=c;
 for(const [a,b] of Object.entries(ALT))if(a!=='KeyM_'&&tap(a))k=b;return k;}
const MOVES={Numpad4:{n:'Left hand',a:'Punch',dmg:.07,r:1.8},Numpad6:{n:'Right hand',a:'Cross',dmg:.08,r:1.8},Numpad1:{n:'Left leg',a:'Kick',dmg:.1,r:2.1},Numpad3:{n:'Right leg',a:'Kick',dmg:.11,r:2.1},
 Numpad7:{n:'Blast (1 e⁻)',a:'Blast',dmg:.12,r:7,cost:.2},Numpad9:{n:'Special',a:'Jump',dmg:0,r:3,special:true},Numpad8:{n:'Transform',a:'ThumbsUp'},Numpad2:{n:'Block',a:'Block'},Numpad5:{n:'Charge',a:'Idle'}};
let blocking=false,actT=0;
function doFight(dt){const k=fightInput();blocking=keys.Numpad2||keys.Comma;
 if(keys.Numpad5||keys.KeyK){st.charge=Math.min(1,st.charge+dt*.35);P.mats&&setViolet(.6);} // hold 5 = charge [S5]
 if(!k||k==='Numpad5'||k==='Numpad2'||actT>0)return;const m=MOVES[k];actT=.35;
 if(k==='Numpad8'){st.form=st.form%4+1;toast('Season form '+st.form+' (placeholder stats)');plog('discoveries','Seasonal form switching (free roam)');return;}
 if(m.cost){if(st.charge<m.cost){toast('Need charge — hold 5');return;}st.charge-=m.cost;}
 let dmg=m.dmg;if(m.special){dmg=.06+st.charge*.25;st.charge=0;} // 9 = special/heavy by charge level [S5]
 play(P,m.a,true);setViolet(1);beep(220+Math.random()*80,.06,'sawtooth');
 const d=rival.o.position.distanceTo(P.o.position);if(rivalSt.active&&d<m.r+.4){const wind=rivalSt.cd>0&&rivalSt.cd<.5;const hit=dmg*(wind?1.5:1)*(rivalSt.block?0.25:1);rivalSt.stance=Math.max(0,rivalSt.stance-hit);
  rival.o.position.add(rival.o.position.clone().sub(P.o.position).setY(0).normalize().multiplyScalar(hit*6));if(wind)toast('Counter!');if(rivalSt.stance<=0)endSpar(true);}}
function endSpar(win){rivalSt.active=false;$('foe').style.display='none';play(rival,win?'No':'Dance');toast(win?'Stance broken — you win (nonlethal spar)':'Your stance broke — rematch anytime');if(win)plog('achievements','Won a Fight Lot spar');rivalSt.stance=1;}
function rivalAI(dt){if(!rivalSt.active)return;const to=P.o.position.clone().sub(rival.o.position).setY(0);const d=to.length();rival.o.rotation.y=Math.atan2(to.x,to.z);
 rivalSt.block=Math.random()<.01?!rivalSt.block:rivalSt.block;
 if(d>1.6){rival.o.position.add(to.normalize().multiplyScalar(dt*2.2));play(rival,'Running');}else{rivalSt.cd-=dt;if(rivalSt.cd<=0){play(rival,'Punch',true);rivalSt.cd=1.3+Math.random();const hit=blocking?.015:.07;st.hp=Math.max(0,st.hp-hit);if(st.hp<=0){st.hp=1;endSpar(false);}}else if(rival.curName!=='Punch'||!rival.cur.isRunning())play(rival,'Idle');}
 if(rival.o.position.distanceTo(fightC)>8.2)endSpar(true); // ring-out
}
function setViolet(v){for(const mt of seamMats)mt.emissiveIntensity=Math.max(mt.emissiveIntensity,v*2.2);} // seams only, active moves only

// Attunement strings (canon packet LOCKED: shape existing matter only; Recovery Rule). Key mapping = PROPOSAL.
let lockout=0,xRel=false,xDown=0;const strings=[];addEventListener('keyup',e=>{if(e.code==='KeyX')xRel=true;});
function doStrings(dt){if(lockout>0){lockout-=dt;if(keys.KeyZ)lockout-=dt*2;return;}
 if(keys.KeyZ||(keys.KeyX&&onGround&&!st.board)){st.root=Math.min(1,st.root+dt*1.2);if(keys.KeyX)setViolet(.3);}else st.root=Math.max(0,st.root-dt*.15);
 if(xRel){xRel=false;if(st.root<.35){toast('Not rooted — clean abort (scored)');profile.cleanAborts=(profile.cleanAborts||0)+1;plog('log','Clean abort');return;}
  if(!onGround||st.board){lockout=2;toast('Balance broke — recover: root (Z)');plog('log','Recovery triggered');return;}
  // raise a slab FROM the ground (existing matter)
  const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));const s=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,.5),new THREE.MeshStandardMaterial({color:0x7a7066,roughness:1}));
  s.position.copy(P.o.position).addScaledVector(f,2.2).setY(-.8);s.rotation.y=yaw;s.castShadow=true;scene.add(s);slabs.push({m:s,t:0,vy:3});strings.push({t:.5});st.root-=.35;play(P,'Blast',true);actT=.6;setViolet(1);beep(90,.25,'sine',.1);plog('discoveries','Attunement: raised a slab from existing ground');
  if(rivalSt.active&&rival.o.position.distanceTo(s.position)<2.5){rivalSt.stance-=.15;if(rivalSt.stance<=0)endSpar(true);}}
 if(tap('KeyC')){if(st.root<.25){toast('Clean abort');profile.cleanAborts=(profile.cleanAborts||0)+1;return;}st.root-=.25;setViolet(.6);beep(600,.2,'triangle');
  const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));for(const n of [...npcs,rival,...defenders]){const v=n.o.position.clone().sub(P.o.position);if(v.length()<6&&v.normalize().dot(f)>.6){n.o.position.addScaledVector(f,1.5);if(n===rival&&rivalSt.active){rivalSt.stance-=.08;if(rivalSt.stance<=0)endSpar(true);}}}
  if(ball&&ball.position.distanceTo(P.o.position)<6&&!st.carry)ball.position.addScaledVector(f,4);}}

// Retro Bowl pickup: carry the ball into the violet end zone; defenders chase. Team meter +12 / -20 [S4].
function doFootball(dt){const pp=P.o.position;if(!st.carry&&ball.position.distanceTo(pp)<1.6&&tap('KeyE')){st.carry=true;toast('Ball up — run it to the far (red) end zone!');plog('discoveries','Pickup football field');}
 if(st.carry){ball.position.copy(pp).add(new THREE.Vector3(0,1.1,0));
  for(const d of defenders){const to=pp.clone().sub(d.o.position).setY(0);const l=to.length();d.o.rotation.y=Math.atan2(to.x,to.z);d.o.position.addScaledVector(to.normalize(),dt*(st.board?4.2:3.6));play(d,'Running');
   if(l<1.0){st.carry=false;st.team=Math.max(0,st.team-.2);st.score[1]+=0;toast('Tackled — turnover (team valence −20)');ball.position.copy(fieldC).setY(.5);defenders.forEach(x=>x.o.position.copy(x.home));bail();return;}}
  if(pp.x>fieldC.x+18&&Math.abs(pp.z-fieldC.z)<11){st.carry=false;st.score[0]+=7;st.team=Math.min(1,st.team+.12);toast('TOUCHDOWN! +7 (team valence +12)');plog('achievements','Scored a pickup touchdown');ball.position.copy(fieldC).setY(.5);defenders.forEach(x=>x.o.position.copy(x.home));beep(880,.3,'square',.08);}
  if(Math.abs(pp.x-fieldC.x)>24||Math.abs(pp.z-fieldC.z)>14){st.carry=false;ball.position.copy(fieldC).setY(.5);toast('Out of bounds');}}
 else defenders.forEach(d=>{if(d.o.position.distanceTo(d.home)>.3){const v=d.home.clone().sub(d.o.position);d.o.position.addScaledVector(v.normalize(),dt*2);play(d,'Walking');}else play(d,'Idle');});}

// Forge recipes [S2 Who/Where/Game type]; challenges are generated in-world (PROPOSAL)
const WHO=['Metal'],WHERE=['Skatepark','Fight Lot','Pickup Field','Dojo Plaza','Forsyth Commons'],TYPE=['Score race','Survive 30 s','Rail chain','Stance break','Delivery run'];
let challenge=null;function forgeRecipe(){challenge={who:WHO[0],where:WHERE[Math.floor(Math.random()*WHERE.length)],type:TYPE[Math.floor(Math.random()*TYPE.length)],t:60};toast('Forge recipe: '+challenge.who+' · '+challenge.where+' · '+challenge.type+'<br><small>PROPOSAL recipe — 60 s</small>');plog('decisions','Forged: '+challenge.where+' / '+challenge.type);}

// ---------- map (zoom: Street → City → Region → Planet → Multiverse) ----------
const ZOOMS=['Street','City','Region','Planet','Multiverse'];let zoom=0;
function drawMap(){const c=$('mapc'),g=c.getContext('2d');g.fillStyle='#0c0a16';g.fillRect(0,0,640,420);g.textAlign='center';g.font='13px system-ui';$('mapT').textContent='Map · '+ZOOMS[zoom];
 if(zoom<=1){const s=zoom?1.3:2.6,cx=320-P.o.position.x*s*(zoom?0:1),cz=210-P.o.position.z*s*(zoom?0:1);
  for(let i=-N;i<=N;i++)for(let j=-N;j<=N;j++){const c2=lotCenter(i,j);g.fillStyle='#262237';g.fillRect(cx+(c2.x-BLOCK/2)*s,cz+(c2.z-BLOCK/2)*s,BLOCK*s,BLOCK*s);}
  for(const sp of Object.values(SPOTS)){g.fillStyle='#9b5cff';g.fillRect(cx+(sp.c.x-BLOCK/2)*s,cz+(sp.c.z-BLOCK/2)*s,BLOCK*s,BLOCK*s);g.fillStyle='#fff';g.fillText(sp.name,cx+sp.c.x*s,cz+sp.c.z*s);}
  g.fillStyle='#ffd23a';g.beginPath();g.arc(cx+P.o.position.x*s,cz+P.o.position.z*s,6,0,7);g.fill();$('mapNote').textContent='Savannah (start city, [S3]). You are the gold dot.';}
 else if(zoom===2){const cities=[['Savannah',470,190],['Jacksonville',460,260],['New Orleans',300,250],['Houston',220,270],['Los Angeles',60,200]];g.strokeStyle='#9b5cff';g.beginPath();cities.forEach(([n,x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();cities.forEach(([n,x,y])=>{g.fillStyle=n==='Savannah'?'#ffd23a':'#fff';g.beginPath();g.arc(x,y,6,0,7);g.fill();g.fillText(n,x,y-12);});$('mapNote').textContent='Five cities linked by R-I-F-F-T rides [S3]. Only Savannah is built in this prototype.';}
 else if(zoom===3){g.fillStyle='#1d3d6e';g.beginPath();g.arc(320,210,150,0,7);g.fill();g.fillStyle='#ffd23a';g.beginPath();g.arc(250,170,5,0,7);g.fill();g.fillStyle='#fff';g.fillText('Earth — Savannah',250,155);g.fillStyle='#6fb7ff';g.fillText('Pluto Hub (cross-world travel point [S5])',320,400);$('mapNote').textContent='Planet layer.';}
 else{g.fillStyle='#2a1f40';g.beginPath();g.moveTo(300,40);g.bezierCurveTo(420,40,470,120,450,200);g.bezierCurveTo(430,300,360,390,330,400);g.bezierCurveTo(300,330,240,240,200,200);g.bezierCurveTo(170,140,220,60,300,40);g.fill();g.fillStyle='#fff';g.fillText('Africa Multiverse Map [S4] — larger navigation layer',320,24);$('mapNote').textContent='Multiverse layer: placeholder outline, divisions not placed (not invented).';}}
function toggle(id,on){const e=$(id);e.style.display=(on??e.style.display!=='block')?'block':'none';return e.style.display==='block';}
function renderProfile(){const p=profile;$('profBody').innerHTML=`<b>Achievements</b>: ${p.achievements.join(' · ')||'—'}<br><b>Discoveries</b>: ${p.discoveries.join(' · ')||'—'}<br><b>Decisions</b>: ${p.decisions.join(' · ')||'—'}<br><b>Clean aborts</b>: ${p.cleanAborts||0}<br><br><b>Meters (separate, never cross-refill)</b>: Gallium ${(st.gal*100|0)}% · e⁻ charge ${(st.charge*100|0)}% · Root ${(st.root*100|0)}% · Team valence ${(st.team*100|0)}%<br><small>${p.log.slice(-12).reverse().join('<br>')}</small>`;}
$('mapc').addEventListener('pointerdown',()=>{zoom=(zoom+1)%5;drawMap();});

// ---------- METAL SKATE CORE ----------
// Port of the approved v7 feel (metal_inda_rifft scripts/player/metal.gd ground(): carve toward the stick, pull back =
// powerslide brake, pump/carve-pump, manual from pump, v7 friction + drag, v7 ollie). PROPOSAL on top: the push is a real
// STROKE — the LEFT prosthetic stays locked on the nose and loads (front knee bends), the RIGHT biological leg reaches,
// plants on the toe side, drives back past the tail, lifts and returns. Speed is added only while that foot is driving.
// Stroke cadence 0.62 s is tuned so hold-to-push still lands on the v7 parity curve (~5.8 m/s at 1 s, ~8.2 m/s at 2 s).
const MSK={CRUISE:8.5,TOP:16,PUSH:4.1,STROKE:.62,DRIVE:[.18,.52],ROLL:.35,DRAG:.1,BRAKE:13,STEER:3.4,OLLIE:5.875,POP:.12,COMP:1.125,CARVE_PUMP:1.6,WALL_BAIL:7.5};
const sk={h:0,s:0,stroke:-1,pw:0,comp:0,manual:null,slide:false,landT:9,airT:0,carve:0,bailT:0,pushes:0,flash:0,rail:false};
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
function plA(n,fb){play(P,P.acts[n]?n:fb);}
function skateGround(dt,wish,il){
 let s=Math.hypot(vel.x,vel.z);if(s>.1)sk.h=Math.atan2(vel.x,vel.z);
 const pump=!!(keys.ShiftLeft||keys.ShiftRight);
 sk.slide=false;sk.carve=0;
 if(il>.2&&!sk.manual){
  const ad=Math.atan2(wish.x,wish.z);
  if(s<.55)sk.h=ad;
  else{const diff=angDiff(sk.h,ad);
   if(Math.abs(diff)>2.45){s=Math.max(0,s-MSK.BRAKE*dt);sk.slide=s>1;}                 // pull back = powerslide brake
   else{const rate=MSK.STEER*(1-Math.min(s/25,.5))*dt;const turn=THREE.MathUtils.clamp(diff,-rate,rate);
    sk.h+=turn;s*=1-Math.abs(turn)*.05;sk.carve=turn/dt;
    if(pump&&s>2&&s<MSK.CRUISE)s=Math.min(MSK.CRUISE,s+MSK.CARVE_PUMP*Math.abs(turn));}}   // S-carves keep speed alive
 }
 const hx=Math.sin(sk.h),hz=Math.cos(sk.h),fwdIn=wish.x*hx+wish.z*hz;
 const canPush=!sk.slide&&!pump&&!sk.manual&&!sk.rail;
 if(sk.stroke<0&&canPush&&il>.2&&(fwdIn>.3||s<.55)&&s<MSK.CRUISE*.97){sk.stroke=0;sk.pushes++;}
 if(sk.stroke>=0){
  if(!canPush){sk.stroke=-1;}
  else{const a=sk.stroke,b=a+dt/MSK.STROKE,[D0,D1]=MSK.DRIVE;const ov=Math.max(0,Math.min(b,D1)-Math.max(a,D0))/(D1-D0);
   if(ov>0&&s<MSK.CRUISE)s=Math.min(MSK.CRUISE,s+MSK.PUSH*(1-.45*s/MSK.CRUISE)*ov);
   sk.stroke=b>=1?-1:b;}
 }
 if(pump){sk.comp=Math.min(1,sk.comp+dt/.35);
  if(!sk.manual&&s>2.25&&(st.comboPend>0||sk.landT<.5))sk.manual={t:0,bal:(Math.random()-.5)*.3,v:0};}
 else{if(sk.manual)endManual();sk.comp=0;}
 if(sk.manual){const m=sk.manual;m.t+=dt;const fb=il>.2?fwdIn*il:0;
  m.v+=(m.bal*2.1+(Math.random()-.5)*2.2)*dt-fb*3.4*dt;m.bal+=m.v*dt;
  if(Math.abs(m.bal)>1){sk.manual=null;skBail('MANUAL BAIL');return;}}
 const dec=(MSK.ROLL+MSK.DRAG*s)*dt*(sk.manual?.6:1);s=Math.min(Math.max(0,s-dec),MSK.TOP);
 sk.s=s;vel.x=Math.sin(sk.h)*s;vel.z=Math.cos(sk.h)*s;sk.landT+=dt;
}
function endManual(){const t=sk.manual.t;sk.manual=null;if(t>.35){st.comboPend++;toast('Manual '+t.toFixed(1)+' s');}}
function skOllie(){const s=Math.hypot(vel.x,vel.z);vel.y=MSK.OLLIE+s*MSK.POP+sk.comp*MSK.COMP;if(sk.manual)endManual();
 sk.comp=0;sk.stroke=-1;sk.airT=0;onGround=false;st.comboPend++;play(P,P.acts.Ollie?'Ollie':'Jump',true);}
function skBail(why){bail();toast(why);sk.stroke=-1;sk.manual=null;vel.x*=.2;vel.z*=.2;sk.bailT=.9;if(P.acts.Bail){play(P,'Bail',true);actT=.6;}}
function skateAnim(gnd){
 if(sk.bailT>0)return;
 if(!gnd){plA('Air','Jump');return;}
 if(st.grinding){plA('Grind','Skate');return;}
 if(sk.manual){plA('Manual','Skate');return;}
 if(sk.slide){plA('Slide','Skate');return;}
 const s=Math.hypot(vel.x,vel.z);
 if(s<.35&&sk.stroke<0){plA('BoardIdle','Skate');return;}
 if(Math.abs(sk.carve)>1.1&&sk.stroke<0){plA('Carve','Skate');return;}
 plA('Skate','Idle');
}
// --- stroke pose on the Phase 6 rig: two-bone IK on top of the cruise clip (world-space delta rotations, any rest pose)
const _iA=new THREE.Vector3(),_iB=new THREE.Vector3(),_iC=new THREE.Vector3(),_iT=new THREE.Vector3(),_iK=new THREE.Vector3(),_iU=new THREE.Vector3(),_iV=new THREE.Vector3(),_iP=new THREE.Vector3();
const _q1=new THREE.Quaternion(),_q2=new THREE.Quaternion(),_q3=new THREE.Quaternion(),_qf=new THREE.Quaternion();
function turnBone(bone,from,to){_q1.setFromUnitVectors(from.normalize(),to.normalize());bone.getWorldQuaternion(_q2);_q2.premultiply(_q1);
 bone.parent.getWorldQuaternion(_q3);bone.quaternion.copy(_q3.invert().multiply(_q2));bone.updateMatrixWorld(true);}
function legIK(L,target,pole){const [up,lo,ft]=L;if(!up||!lo||!ft)return;
 ft.getWorldQuaternion(_qf);up.getWorldPosition(_iA);lo.getWorldPosition(_iB);ft.getWorldPosition(_iC);
 const l1=_iA.distanceTo(_iB),l2=_iB.distanceTo(_iC);_iT.copy(target);
 const dir=_iU.subVectors(_iT,_iA);const d=THREE.MathUtils.clamp(dir.length(),.02,l1+l2-.002);dir.normalize();
 const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
 _iP.copy(pole).addScaledVector(dir,-pole.dot(dir)).normalize();
 _iK.copy(_iA).addScaledVector(dir,a).addScaledVector(_iP,h);
 turnBone(up,_iV.subVectors(_iB,_iA),_iU.copy(_iK).sub(_iA));
 lo.getWorldPosition(_iB);ft.getWorldPosition(_iC);
 turnBone(lo,_iV.subVectors(_iC,_iB),_iU.copy(_iA.copy(_iT)).sub(_iB));
 ft.parent.getWorldQuaternion(_q3);ft.quaternion.copy(_q3.invert().multiply(_qf));ft.updateMatrixWorld(true);}  // foot keeps its flat-on-deck angle
// stroke path for the RIGHT ankle in the rider frame (x = heel(+)/toe(-) side, y up from the ground, z = nose(+)/tail(-))
const STROKE_KEYS=[[0,0,1,-.18],[.09,-.16,1,-.04],[.18,-.27,0,.12],[.52,-.25,0,-.56],[.7,-.15,.55,-.46],[1,0,1,-.18]]; // y: 0 = sole on ground, 1 = sole on deck (+ lift)
const _sp=new THREE.Vector3(),_pole=new THREE.Vector3();
function strokePoint(u,out){let i=0;while(i<STROKE_KEYS.length-2&&u>STROKE_KEYS[i+1][0])i++;const A=STROKE_KEYS[i],B=STROKE_KEYS[i+1];
 let t=(u-A[0])/(B[0]-A[0]);t=t*t*(3-2*t);const lift=(i===0||i===4)?Math.sin(t*Math.PI)*.1:0;
 return out.set(A[1]+(B[1]-A[1])*t,(A[2]+(B[2]-A[2])*t)*DECK_TOP+lift,A[3]+(B[3]-A[3])*t);}
function p6Pose(dt){
 for(const m of traceMats)m.emissiveIntensity=sk.flash*1.6;
 sk.flash=Math.max(sk.flash*Math.exp(-5*dt),st.board&&sk.comp>.3?.8:0);
 if(!P.p6||!P.legs||!st.board||st.wall||!onGround||st.flying||st.swing){sk.pw=0;return;}
 const active=sk.stroke>=0;sk.pw+=((active?1:0)-sk.pw)*Math.min(1,dt*14);
 if(sk.pw<.01)return;
 const u=active?sk.stroke:1,load=Math.sin(Math.PI*THREE.MathUtils.clamp((u-.08)/.55,0,1))*sk.pw;
 const g=Math.max(.04,P.soleGap||.08);
 P.model.position.y-=.12*load;P.o.updateMatrixWorld(true);                        // THOOM: the prosthetic knee loads
 const ch=P.legs.chest;if(ch){ch.getWorldQuaternion(_q2);_q1.setFromAxisAngle(_up0,.32*load);_q2.premultiply(_q1);_q1.setFromAxisAngle(_iV.set(0,0,1).transformDirection(P.o.matrixWorld),.2*load);_q2.premultiply(_q1);ch.parent.getWorldQuaternion(_q3);ch.quaternion.copy(_q3.invert().multiply(_q2));ch.updateMatrixWorld(true);}
 // LEFT (front, prosthetic) foot stays planted on the nose
 legIK(P.legs.L,_iT.set(.02,DECK_TOP+g,.19).applyMatrix4(P.o.matrixWorld).clone(),_pole.set(-1,0,.2).transformDirection(P.o.matrixWorld));
 // RIGHT (back, biological) foot strokes
 const R=P.legs.R;if(!R[2])return;R[2].getWorldPosition(_iC);
 strokePoint(u,_sp);_sp.y+=g;_sp.applyMatrix4(P.o.matrixWorld);_iC.lerp(_sp,sk.pw);
 legIK(R,_iC.clone(),_pole.set(-1,.15,-.1).transformDirection(P.o.matrixWorld));
}
const _up0=new THREE.Vector3(0,1,0);

// ---------- main loop ----------
const clock=new THREE.Clock();let camPos=new THREE.Vector3();
function update(dt){
 st.grinding=false;
 const pad=pollPad();let ix=(keys.KeyD?1:0)-(keys.KeyA?1:0)+stick.x+(pad?pad.x:0),iz=(keys.KeyS?1:0)-(keys.KeyW?1:0)+stick.y+(pad?pad.y:0);
 const il=Math.min(1,Math.hypot(ix,iz));
 if(tap('KeyM')){const on=toggle('map');if(on){zoom=0;drawMap();}}
 if(tap('KeyP')){if(toggle('prof'))renderProfile();}
 if(tap('Escape')){toggle('map',false);toggle('prof',false);}
 for(let k=0;k<4;k++)if(tap('Digit'+(k+1))||tap('F'+(k+1)))setForm(k);
 if(tap('KeyO')){setMask((maskI+1)%MASKS.length);toast('Mask: '+({none:'none',HeavyCrown:'Heavy Crown (PLACEHOLDER)',KITO:'KITO Mask (PLACEHOLDER)'})[MASKS[maskI]]);}
 if(tap('KeyH'))$('help').style.display=$('help').style.display==='none'?'block':'none';
 const pp=P.o.position;
 // camera-relative movement
 const fwd=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw)),right=new THREE.Vector3(-fwd.z,0,fwd.x);
 const wish=new THREE.Vector3().addScaledVector(right,ix).addScaledVector(fwd,-iz);if(wish.lengthSq()>1)wish.normalize();
 if(st.wall&&st.board&&tap('KeyB')){st.wall=null;onGround=false;st.board=false;board.visible=false;toast('Bail (B) — board released');}
 if(tap('KeyB')&&onGround&&!st.swing){st.board=!st.board;board.visible=st.board;toast(st.board?'Board down — four wheels':'Board up');if(st.board)plog('discoveries','Skating on the four-wheel board');}
 // grapple [S1]: tap to attach nearest anchor in front; tendril costs Gallium only while out, refunds on release
 if(tap('KeyQ')){if(st.swing){st.gal=Math.min(1,st.gal+st.swing.spent*.5);st.swing=null;tether.visible=false;toast('Release');st.comboPend++;}
  else{const fw=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));let a=null,bs=-1e9;for(const an of anchors){const v=an.clone().sub(pp);const d=v.length();if(d>28||d<2||an.y<pp.y+2)continue;const sc=v.clone().setY(0).normalize().dot(fw)*10-d*.4;if(sc>bs){bs=sc;a=an;}}
   if(a&&st.gal>.04){st.swing={a:a.clone(),len:a.distanceTo(pp)*.8,spent:0};play(P,'Swing');tether.visible=true;onGround=false;vel.y=Math.max(vel.y,4);plog('discoveries','Grapple swing');setViolet(1);beep(330,.1,'triangle');}else toast(st.gal<=.04?'Out of Gallium — bank combos to refill':'No anchor in range');}}
 // flight: Merkaba propulsion, limited only by orientation to gravity point [decision #3]. No charge meter.
 if(tap('KeyF')){if(st.flying){st.flying=false;}else if(!onGround&&st.ori>.2){st.flying=true;st.swing=null;tether.visible=false;plog('discoveries','Star Merkaba flight');}else toast(onGround?'Get airborne first (ollie, kicker or swing)':'Orientation unstable — cannot lock gravity point');}
 merkaba.visible=st.metalForm>=3; if(merkaba.visible&&!st.flying){P.model.updateMatrixWorld(true);const ch=P.model.getObjectByName('Chest');const bk=new THREE.Vector3(0,0,-1).transformDirection(P.model.matrixWorld);if(ch)ch.getWorldPosition(merkaba.position);else merkaba.position.copy(P.o.position).setY(P.o.position.y+1.35);merkaba.position.addScaledVector(bk,.28);merkaba.scale.setScalar(.22);}else merkaba.scale.setScalar(1); // canon: Merkaba only from S3, on his back
 const run=keys.ShiftLeft||keys.ShiftRight||il>.95&&isTouch;
if(st.wall){wallRide(dt,wish,pp);}else{
 const SK={cruise:8.5,boost:16,acc:5,coast:.15,grav:17.5,ollie:6.8}; // v7 parity port (html_v7_parity.json: CRUISE_MAX 340px*.025, GRAV 700px*.025, coast 8.42->6.26 m/s in 2 s, ollie peak 1.31 m / air .775 s)
 let maxS=st.board?(run?SK.boost:SK.cruise):(run?7:3.2);if(st.form===2)maxS*=1.05; // form stats placeholder
 if(st.flying){const up=(keys.Space?1:0)-(keys.KeyC&&!keys.KeyZ?0:0);const turn=Math.abs(wish.clone().normalize().dot(new THREE.Vector3(vel.x,0,vel.z).normalize()||0));
  vel.lerp(wish.clone().multiplyScalar(20).setY(up*8-(keys.ControlLeft?8:0)),dt*1.6);
  // sharp direction changes destabilise orientation; steady flight restores it
  const sharp=wish.lengthSq()>.1&&new THREE.Vector3(vel.x,0,vel.z).length()>5&&turn<.3;st.ori=THREE.MathUtils.clamp(st.ori+(sharp?-.5:.12)*dt,0,1);
  if(st.ori<.08){st.flying=false;toast('Lost the gravity orientation point — falling!');}
  if(st.ori<.4)vel.y-=9*(.4-st.ori)*dt*4; merkaba.position.copy(pp).setY(pp.y+1);merkaba.rotation.y+=dt*3;setViolet(.9);
 } else if(st.swing){const s=st.swing;s.spent+=dt*.03;st.gal=Math.max(0,st.gal-dt*.03);if(st.gal<=0){st.swing=null;tether.visible=false;}
  vel.y-=22*dt;vel.addScaledVector(wish,dt*14);pp.addScaledVector(vel,dt);if(pp.y<groundY){pp.y=groundY;if(vel.y<0)vel.y=0;}const d=pp.clone().sub(s.a);if(d.length()>s.len){d.setLength(s.len);pp.copy(s.a).add(d);const n=d.clone().normalize();vel.addScaledVector(n,-vel.dot(n));}
  if(tap('Space')){st.swing=null;tether.visible=false;vel.y+=6;st.comboPend++;}
  setViolet(1);st.ori=Math.min(1,st.ori+dt*.2);
 } else {
  let hv;
  if(st.board&&onGround){ // METAL SKATE CORE (v7 feel port): heading-based board, stroke pushes, carve, powerslide, pump, manual
   if(sk.bailT>0){sk.bailT-=dt;vel.x*=Math.exp(-3*dt);vel.z*=Math.exp(-3*dt);sk.stroke=-1;}else skateGround(dt,wish,il);
   vel.y-=SK.grav*dt;st.ori=Math.min(1,st.ori+dt*.3);hv=new THREE.Vector3(vel.x,0,vel.z);
   if(tap('Space')&&sk.bailT<=0)skOllie();
  } else {
  const acc=st.board?(onGround?SK.acc:2):(onGround?18:4);hv=new THREE.Vector3(vel.x,0,vel.z);const target=wish.clone().multiplyScalar((st.board?SK.cruise:maxS)*il);
  hv.lerp(target,Math.min(1,acc*dt/Math.max(1,maxS)*2));
  vel.x=hv.x;vel.z=hv.z;vel.y-=(st.board?SK.grav:24)*dt;st.ori=Math.min(1,st.ori+dt*.3);
  if(onGround&&tap('Space')){vel.y=st.board?SK.ollie:6.2;onGround=false;if(st.board)st.comboPend++;play(P,'Jump',true);}
  }
  if(!onGround)sk.airT+=dt;
  // kickers launch airs [S1]
  if(st.board&&onGround){for(const r of ramps)if(r.p.distanceTo(new THREE.Vector3(pp.x,0,pp.z))<r.r&&hv.length()>6){vel.y=r.kick;onGround=false;st.comboPend+=2;toast('Air!');plog('discoveries','Skatepark kicker air');}
   for(const r of rails){const ab=r.b.clone().sub(r.a);const t=THREE.MathUtils.clamp(pp.clone().sub(r.a).dot(ab)/ab.lengthSq(),0,1);const cp=r.a.clone().addScaledVector(ab,t);if(new THREE.Vector2(cp.x-pp.x,cp.z-pp.z).length()<.6&&vel.y<=0&&pp.y<1.3){pp.y=cp.y;vel.y=0;st.comboPend+=dt*3;setViolet(.7);st.grinding=true;}}}
 }
 // Gallium brace (S1: 1/3 bar) — Shift+Space while flying/swinging cancels momentum
 if(!st.flying&&!st.swing)pp.addScaledVector(vel,dt);else if(st.flying)pp.addScaledVector(vel,dt);
 const preHit=collide(pp);if(preHit&&lastHit&&st.board&&!st.flying&&!st.swing&&lastHit.into>=WR.minInto&&lastHit.b.max.y>3){const sp=lastHit.hv.length();if(st.gal>=WR.rampCost&&sp>=WR.rampMinSpeed){lastHit.ramp=true;startWall(lastHit);}else if(sp>=WR.minSpeed)startWall(lastHit);}
 if(preHit&&lastHit&&st.board&&onGround&&!st.wall&&!st.flying&&!st.swing&&lastHit.into>MSK.WALL_BAIL)skBail('SLAMMED A WALL');
 const gY=floorAt(pp);const wasAir=!onGround;
 if(!st.wall&&pp.y<=gY&&!st.swing){if(wasAir&&!st.flying){if(vel.y<-17&&!st.board){toast('Hard landing');}if(st.board){if(Math.abs(vel.y)>18)skBail('HARD LANDING');else{bank();sk.landT=0;sk.flash=1;if(P.acts.Land){play(P,'Land',true);actT=.16;}}}}pp.y=gY;if(vel.y<0)vel.y=0;onGround=true;if(st.flying)st.flying=false;}
 else if(!st.wall&&pp.y>gY+.05&&!st.swing&&!st.flying){if(!st.board||pp.y>gY+1.15)onGround=false;}
 }
 pp.x=THREE.MathUtils.clamp(pp.x,-200,200);pp.z=THREE.MathUtils.clamp(pp.z,-200,200);
 const hs=Math.hypot(vel.x,vel.z);if(hs>.3&&!st.swing)yaw=Math.atan2(vel.x,vel.z);P.o.rotation.set(0,yaw,0);
 if(st.wall){const w=st.wall;const f=new THREE.Vector3().copy(w.t).multiplyScalar(w.side).setY(w.up);if(f.lengthSq()<.01)f.set(0,1,0);f.normalize();const x=new THREE.Vector3().crossVectors(w.n,f).normalize();f.crossVectors(x,w.n);_wm.makeBasis(x,w.n,f);_wq.setFromRotationMatrix(_wm);P.o.quaternion.slerp(_wq,1);}
 // animation select
 actT-=dt;if(actT<=0&&(P.cur.loop!==THREE.LoopOnce||!P.cur.isRunning())){
  if(st.flying)plA('Flight','Jump');else if(st.swing)plA('Swing','Jump');else if(st.board&&st.wall)plA('Wallride','Skate');else if(st.board)skateAnim(onGround);else if(!onGround)plA('Air','Jump');else if(hs>4.5)play(P,'Running');else if(hs>.4)play(P,'Walking');else play(P,blocking?'Standing':'Idle');}
 if(st.board){if(st.boardFree>0){st.boardFree-=dt;}else{ // BOARD LOCK: board stays attached under the LEFT (prosthetic) foot while riding; only bail (B) or kick-off (Space) separates. Mechanism (Gallium film / magnetic) = OPEN
  if(st.wall)board.quaternion.copy(P.o.quaternion);else board.rotation.set(0,yaw,0);
  const up=_bu.set(0,1,0).applyQuaternion(board.quaternion);const fl=P.footL;
  if(fl){P.o.updateMatrixWorld(true);fl.getWorldPosition(_bf);const rel=_bf.sub(pp);const along=rel.dot(up);rel.addScaledVector(up,-along);rel.multiplyScalar(.5);board.position.copy(pp).add(rel);}else board.position.copy(pp);
  st.boardGap=fl?fl.getWorldPosition(_bf).distanceTo(board.position):0;}}
 // violet decays (only on active moves)
 for(const mt of seamMats)mt.emissiveIntensity=Math.max(0,mt.emissiveIntensity-dt*3);
 if(galLimb){const hb=P.handBone;if(hb){hb.updateMatrixWorld(true);hb.getWorldPosition(_hand);}else _hand.copy(P.o.position).setY(P.o.position.y+1.2);galLimb.tick(dt,{swing:st.swing,hand:_hand,model:P.model,st,groundY,playerPos:P.o.position});} // PROPOSAL Gallium limb visuals
 // systems
 doFight(dt);doStrings(dt);doFootball(dt);rivalAI(dt);
 for(const s of slabs){if(s.t<1){s.t+=dt;s.m.position.y=Math.min(.8,s.m.position.y+s.vy*dt);}else if(s.t<6)s.t+=dt;else{s.m.position.y-=dt;if(s.m.position.y<-1){scene.remove(s.m);s.dead=true;}}}
 for(let i=slabs.length-1;i>=0;i--)if(slabs[i].dead)slabs.splice(i,1);
 // interact prompts
 const spot=where(pp);let prompt='';
 if(spot!==lastSpot){lastSpot=spot;if(spot){$('place').textContent='Savannah · '+spot.name;plog('discoveries','Found '+spot.name);toast(spot.name+'<br><small>'+spot.src+'</small>');}else $('place').textContent='Savannah · Street';}
 if(spot===SPOTS.fight&&!rivalSt.active){prompt='E — challenge the rival to a nonlethal spar';if(tap('KeyE')){rivalSt.active=true;rivalSt.stance=1;$('foe').style.display='block';toast('SPAR! Break their stance or ring them out');plog('decisions','Accepted a spar');}}
 if(spot===SPOTS.field&&!st.carry&&ball.position.distanceTo(pp)<1.6)prompt='E — pick up the ball';
 if(spot===SPOTS.forge){prompt='E — forge a quick game recipe';if(tap('KeyE'))forgeRecipe();}
 if(spot===SPOTS.pluto&&pp.distanceTo(plutoC)<6){prompt='E — Pluto Hub travel console (opens zoom map)';if(tap('KeyE')){toggle('map',true);zoom=2;drawMap();plog('discoveries','Pluto Hub travel console');}}
 if(spot===SPOTS.dojo)prompt='Hold Z to root · X raise slab · C push air (strings shape existing matter only)';
 if(cartPos&&pp.distanceTo(cartPos)<3){prompt='E — buy food ($)';if(tap('KeyE')){st.needs.hunger=Math.min(1,st.needs.hunger+.4);st.orbitals.money=Math.max(0,st.orbitals.money-.05);st.orbitals.body+=.03;toast('Ate at the food cart');plog('log','Ate');}}
 if(benchPos&&pp.distanceTo(benchPos)<3){prompt='E — rest';if(tap('KeyE')){st.needs.energy=Math.min(1,st.needs.energy+.5);play(P,'Sitting',true);actT=2;}}
 for(const n of npcs)if(n.o.position.distanceTo(pp)<2&&!prompt){prompt='E — talk ('+n.role+')';if(tap('KeyE')){n.wait=3;n.o.lookAt(pp.x,n.o.position.y,pp.z);play(n,'Wave',true);st.needs.social=Math.min(1,st.needs.social+.15);st.orbitals.bonds=Math.min(1,st.orbitals.bonds+.04);beep(520,.1,'sine');}break;}
 tap('KeyE');$('prompt').style.display=prompt?'block':'none';$('prompt').textContent=prompt;
 // life sim [S3]: needs decay; orbitals = life domains
 st.needs.hunger=Math.max(0,st.needs.hunger-dt*.004);st.needs.energy=Math.max(0,st.needs.energy-dt*(st.board?.005:.003));st.needs.social=Math.max(0,st.needs.social-dt*.002);
 if(st.board&&hs>3)st.orbitals.body=Math.min(1,st.orbitals.body+dt*.002);
 // NPC routines
 for(const n of npcs){if(n.wait>0){n.wait-=dt;if(n.wait<=0)play(n,'Walking');continue;}const to=n.target.clone().sub(n.o.position).setY(0);if(to.length()<1){n.target=wp();if(Math.random()<.3){n.wait=2+Math.random()*3;play(n,'Idle');}continue;}
  const sp=n.speed*(weather==='rain'?1.4:1);n.o.position.addScaledVector(to.normalize(),dt*sp);n.o.rotation.y=Math.atan2(to.x,to.z);
  const nb=n.o.position.clone();for(const b of colliders)if(b.containsPoint(nb.setY(1))){n.target=wp();break;}}
 // traffic
 for(const c of cars){const u=c.userData;u.t+=u.dir*u.spd*dt;if(u.t>220)u.t=-220;if(u.t<-220)u.t=220;
  if(u.axis){c.position.set(u.lane,0.05,u.t);c.rotation.y=u.dir>0?0:Math.PI;}else{c.position.set(u.t,0.05,u.lane);c.rotation.y=u.dir>0?Math.PI/2:-Math.PI/2;}
  if(c.position.distanceTo(pp)<2.4&&pp.y<1.5){vel.add(pp.clone().sub(c.position).setY(0).normalize().multiplyScalar(8));vel.y=5;onGround=false;bail();toast('Clipped by traffic!');}}
 // day/night + weather
 tod=(tod+dt*24/600)%24; // 10-minute day (PROPOSAL)
 const sunA=(tod-6)/12*Math.PI;const day=Math.max(0,Math.sin(sunA));sun.position.set(pp.x+Math.cos(sunA)*80,Math.max(8,Math.sin(sunA)*100),pp.z+30);sun.target.position.copy(pp);
 sun.intensity=.15+day*2.3*(weather==='rain'?.45:1);hemi.intensity=.12+day*.5;renderer.toneMappingExposure=.45+day*.6;scene.backgroundIntensity=.15+day*.85;scene.environmentIntensity=.25+day*.75;
 const night=day<.15;lamps.forEach(l=>l.material.emissiveIntensity=night?3:0);bloom.strength=night?.9:.45;
 const fogC=new THREE.Color(0x0b0c18).lerp(new THREE.Color(weather==='rain'?0x7d8894:0xa9bccb),day);scene.fog.color.copy(fogC);scene.fog.far=weather==='rain'?140:260;
 weatherT-=dt;if(weatherT<=0){weather=weather==='rain'?'clear':(Math.random()<.5?'rain':'clear');weatherT=50+Math.random()*60;if(weather==='rain')plog('log','Rain started');}
 rain.visible=weather==='rain';if(rain.visible){rain.position.set(pp.x,0,pp.z);const a=rain.geometry.attributes.position;for(let i=1;i<a.array.length;i+=3){a.array[i]-=dt*30;if(a.array[i]<0)a.array[i]=40;}a.needsUpdate=true;}
 const hh=Math.floor(tod),mm=Math.floor((tod%1)*60);$('clock').textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${night?'🌙':'☀'} · ${weather}`;
 if(challenge){challenge.t-=dt;if(challenge.t<=0){toast('Forge recipe ended');challenge=null;}}
 // state + HUD
 st.state=st.flying?'FLIGHT · MERKABA':st.swing?'SWING':st.wall?'WALL RIDE':st.board?(onGround?'SKATE':'AIR'):(rivalSt.active?'SPAR':(lockout>0?'RECOVER':(onGround?'WALK':'AIR')));
 $('state').textContent=st.state+' · Season '+st.form+(st.comboPend>0?' · combo ×'+Math.floor(st.comboPend):'')+(challenge?` · ⏱${challenge.t|0}s ${challenge.type}`:'');
 $('mGal').style.width=st.gal*100+'%';$('mOri').style.width=st.ori*100+'%';$('mChg').style.width=st.charge*100+'%';$('mRoot').style.width=st.root*100+'%';$('mTeam').style.width=st.team*100+'%';$('mFoe').style.width=rivalSt.stance*100+'%';
 const ob=st.orbitals;const shell=(ob.work+ob.body+ob.bonds+ob.mind+ob.money)/5;$('orbs').innerHTML=Object.entries(ob).map(([k,v])=>`<b title="${k}" style="background:rgba(155,92,255,${v})"></b>`).join('')+` <small>${(shell*100|0)}% ${shell<.12?'ION':shell>.62?'NOBLE':''}</small>`;
 $('needs').textContent=`Hunger ${(st.needs.hunger*100|0)} · Energy ${(st.needs.energy*100|0)} · Social ${(st.needs.social*100|0)}`;$('score').textContent=`Pickup: ${st.score[0]} – ${st.score[1]}`;
 if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0;}
 // camera
 if(st.board&&onGround&&!st.wall&&!drag&&Math.hypot(vel.x,vel.z)>2.5)camYaw+=angDiff(camYaw,sk.h+Math.PI)*Math.min(1,dt*2.2); // PROPOSAL: chase cam on the board
 const dist=st.flying?9:st.swing?4.6:st.board?7:5.5;/* PROPOSAL: camera pulls in during Gallium swing */const tgt=pp.clone().add(new THREE.Vector3(0,1.6,0));
 const want=tgt.clone().add(new THREE.Vector3(Math.sin(camYaw)*Math.cos(camPitch)*dist,Math.sin(camPitch)*dist+.5,Math.cos(camYaw)*Math.cos(camPitch)*dist));
 if(!drag&&hs>2&&!isTouch===false){}if(st.wall){want.copy(tgt).addScaledVector(st.wall.n,dist*1.1).add(new THREE.Vector3(0,-1.2,0));} camPos.lerp(want,1-Math.pow(.001,dt));camera.position.copy(camPos);const upW=st.wall?new THREE.Vector3(0,1,0).lerp(st.wall.n,.45).normalize():new THREE.Vector3(0,1,0);camera.up.lerp(upW,Math.min(1,dt*4)).normalize();camera.lookAt(tgt);
 tickRamps(dt);signs.forEach(s=>s.lookAt(camera.position));if(plutoRing)plutoRing.rotation.y+=dt;
 for(const m of mixers)m.update(dt);
 P.model.rotation.y+=((st.board&&!st.flying?(P.rotBoard??-1.35):(P.rotWalk??0))-P.model.rotation.y)*Math.min(1,dt*10); // sideways skate stance on the deck
 if(st.board&&st.wall&&P.footL&&!(st.boardFree>0)){P.o.updateMatrixWorld(true);P.footL.getWorldPosition(_bf);_bu.set(0,1,0).applyQuaternion(board.quaternion);const h=_bf.sub(board.position).dot(_bu);P.model.position.y+=THREE.MathUtils.clamp(DECK_TOP+Math.max(0,P.soleGap)-h,-2,2);P.o.updateMatrixWorld(true);st.boardGap=P.footL.getWorldPosition(_bf).distanceTo(board.position);} else if(onGround||st.board)seatFeet(dt);else P.model.position.y+=(P.footY+(st.board?DECK_TOP:0)-P.model.position.y)*Math.min(1,dt*8);
 p6Pose(dt);sk.rail=st.grinding;
}
let fails=0;function loop(){requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta());if(window.__testHold){if(LITE)renderer.render(scene,camera);else composer.render();return;}try{update(dt);window.__seasonPost&&window.__seasonPost(dt);}catch(e){if(fails++<3){console.error(e);window.__errors.push(String(e));}}if(LITE)renderer.render(scene,camera);else composer.render();}

(async()=>{const msg=t=>$('loadmsg').textContent=t;
 try{await buildWorld(msg);msg('Characters (Quaternius CC0)…');robotGLTF=await loadG('assets/models/RobotExpressive.glb');msg('3D Metal…');metalGLTF=await loadG('assets/models/metal/metal_phase6_rig.glb');boardGLTF=await loadG('assets/models/metal/metal_skateboard_4wheel_PLACEHOLDER.glb');
  P=makeMetal();scene.add(P.o);P.o.position.copy(SPOTS.home.c).add(new THREE.Vector3(0,groundY,8));camPos.copy(P.o.position).add(new THREE.Vector3(0,4,8));
  board=new THREE.Group();board.add(boardGLTF.scene);boardGLTF.scene.traverse(m=>{if(m.isMesh){m.castShadow=true;if(/Wheel/i.test(m.material.name)){m.material.color=new THREE.Color(0xC9A979);if(m.material.emissive)m.material.emissiveIntensity=0;m.material.map=null;m.material.needsUpdate=true;}}});board.visible=false;board.scale.setScalar(BOARD_S);scene.add(board,tether,merkaba);galLimb=makeGalliumLimb(scene);P.handBone=P.o.getObjectByName('DEF-handR')||P.o.getObjectByName('DEF-hand.R')||P.o.getObjectByName('DEF-forearmR');/* three.js strips '.' from node names */
  // stand on the board: lift player
  msg('Traffic & residents…');await spawnLife();
  plog('log','Session started in Savannah');$('load').style.display='none';window.__ready=true;
  window.__game={galLimb:()=>galLimb,WR,colliders,vel,camera,P,st,board,seamMats,setMask,anchors,slabs,SPOTS,profile,keys,pressed,teleportForTest:(v)=>{P.o.position.copy(v);},startWallForTest:startWall};// test harness only (not a gameplay teleport)
  window.__game.setForm=setForm;window.__game.sk=sk;window.__game.stepForTest=(n,dt)=>{for(let i=0;i<n;i++){update(dt);window.__seasonPost&&window.__seasonPost(dt);}};/* test harness only */window.__game.MSK=MSK;window.__game.ground=()=>onGround;loop();await setForm(0);}catch(e){msg('Load error: '+e.message);window.__errors.push(String(e));}})();
