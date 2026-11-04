import {createCharge,stepCharge} from './merkabah_charge.js';
import {createSavannahMetalController,shouldGripWorld} from './metal_skylab_v3_bridge.mjs';
import {loadMissionAsset,createMissionFallback,MISSION_ASSET_TIMEOUTS} from './mission_asset_recovery.js';
import {readMetalCheckpoint,writeMetalCheckpoint,advanceMetalStory,metalStoryChapter} from './metal_story_engine.js';
import {createCombatBody,applyCombatHit,stepCombatBody,blastDirection} from './metal_combat_physics.js';
// WIR: Connected — unified open-world prototype (HTML/JS per Coach's decisions; Godot later).
// Sources: [S1] Metal InDa RIFFT, [S3] Valence Life, [S4] Retro Bowl, [S5] Stay On Page, attunement packet.
// Anything not stated in those sources is labelled PROPOSAL. Code is original; libs MIT, assets CC0.
import * as THREE from 'three';
import {STORY_ENEMIES} from './story_enemies.js';
import {createEncounter,stepEncounter} from './morrow_encounters.js';
import {createSlottaLoadout,tickSlotta,swapSlot,SLOTTA_GAMES} from './slotta_slots.js';
import {queueSlottaAttack,advanceSlottaAttackEvent,slottaCombatEligible,slottaAttackTelemetry} from './slotta_encounter_guard.js';
import {createSlottaAnimator,startSlottaAction,canStartSlottaAction,tickSlottaAnimator,slottaAnimationSnapshot,slottaAnimationForGame,SLOTTA_ACTIONS} from './slotta_animation_machine.js';
import {createSlottaMinionMotion,minionChoreographyStep,slottaDashSweep,slottaDashTarget} from './slotta_choreography.js';
import {createSlottaBossAsset,animateSlottaBossAsset,createSlottaMinionAsset,animateSlottaMinionAsset} from './slotta_visuals.js';
import {createDirector,tickDirector,finishEncounter,witness,createImpactState,impactStructure,stepImpact} from './city_combat_director.js';
import {BodyMachine} from './body_machine.js';
import {WorldBody} from './world_body.js';
import {chooseGripTarget,stepStructureOffset,gripHeldPosition} from './gallium_grip_core.js';
import {PhysicsTelemetry} from './physics_telemetry.js';
import {createTestYardSkateAdapter,trickDirection,fightClipHint} from './testyard_skate_adapter.mjs';
import {analyzePhysics} from './physics_analysis.js';
import {makeGalliumLimb,galliumLiquidMat,GU} from './gallium_limb.js';
import {MetalForgeController,FORGE_COST,FORGE_REFUND} from './metal_forge_controller.js';
import {selectForgePose} from './metal_forge_choreography.mjs';
import {ForgePerformanceOverlay} from './metal_forge_performance.js';
import {createPointerLatch,touchStickVector} from './metal_touch_input.mjs';
import {forgeDisplay} from './metal_forge_hud.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as YUKA from './lib/yuka.module.js'; // Yuka game AI (MIT) — rival brain
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const $=id=>document.getElementById(id);
const VIOLET=0x9b5cff, GUN=0x4a4f57;
const LITE=new URLSearchParams(location.search).get('lite')==='1';
// Opt-in, isolated browser QA only. Normal gameplay never exposes this interface.
const SLOTTA_BROWSER_QA=new URLSearchParams(location.search).get('slotta_qa')==='1';
const TEST_YARD_SKATE=new URLSearchParams(location.search).get('skate_yard')==='1'; // HOLD; existing default remains unchanged
if(SLOTTA_BROWSER_QA)window.__testHold=true;
const boot=window.__bootRecovery||{stage:()=>{},warning:()=>{},failed:()=>{},ready:()=>{},getStatus:()=>({warnings:[]})};
const safeStorage=(()=>{try{return window.localStorage}catch(e){boot.warning({asset:'localStorage',reason:String(e)});return {getItem:()=>null,setItem:()=>{throw Error('Storage is unavailable')}};}})();
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
if(isTouch)document.body.classList.add('touch');
window.__errors=[];window.addEventListener('error',e=>window.__errors.push(String(e.message)));

// ---------- WIR Valence Profile (shared, localStorage). Logs only; never refills meters. ----------
const PKEY='wir_valence_profile_v1';
const profile=(()=>{try{return JSON.parse(safeStorage.getItem(PKEY)||'null')}catch(e){boot.warning({asset:PKEY,reason:'Unreadable previous profile: '+String(e)});return null;}})()||{created:Date.now(),decisions:[],achievements:[],discoveries:[],log:[]};
function plog(kind,text){const arr=profile[kind]||profile.log; if(kind!=='log'&&arr.includes(text))return; arr.push(text); profile.log.push(new Date().toLocaleTimeString()+' · '+text); if(profile.log.length>200)profile.log.shift(); if(!SLOTTA_BROWSER_QA){try{safeStorage.setItem(PKEY,JSON.stringify(profile))}catch(e){boot.warning({asset:PKEY,reason:'Profile save unavailable: '+String(e)})}} if(kind!=='log')toast(text);}
let toastT=0;function toast(t){$('toast').innerHTML=t;$('toast').style.opacity=1;toastT=2.6;}

// ---------- renderer / scene ----------
const renderer=new THREE.WebGLRenderer({antialias:!isTouch,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,isTouch?1.5:2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!LITE;if(LITE)renderer.setPixelRatio(1);renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x9fb6c8,60,260);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.1,600);
// Lite skips post-processing render targets entirely to reduce iPhone GPU memory.
const composer=LITE?null:new EffectComposer(renderer);if(composer)composer.addPass(new RenderPass(scene,camera));
const bloom=LITE?null:new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.55,0.5,0.86);if(composer){composer.addPass(bloom);composer.addPass(new OutputPass());}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(composer)composer.setSize(innerWidth,innerHeight);});
const hemi=new THREE.HemisphereLight(0xcfe6ff,0x3a3020,0.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:300});sun.shadow.bias=-0.0005;scene.add(sun,sun.target);

const tl=new THREE.TextureLoader(),gl=new GLTFLoader();
const loadG=u=>new Promise((res,rej)=>gl.load(u,res,undefined,rej));
const missionAsset=(u,type,critical=false)=>loadMissionAsset(loadG,u,{
 timeout:critical?MISSION_ASSET_TIMEOUTS.critical:MISSION_ASSET_TIMEOUTS.optional,
 fallback:()=>createMissionFallback(THREE,type),
 onWarning:w=>boot.warning(w)
});
function rep(t,r){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(r,r);t.colorSpace=THREE.SRGBColorSpace;return t;}

// ---------- city layout: Savannah [S3 start city]. Grid streets PROPOSAL. ----------
const BLOCK=44,ROAD=12,N=LITE?2:3; // Lite keeps all special lots while reducing surrounding city memory
const colliders=[];const anchors=[];const structureBodies=new Map();
function registerGrippableStructure(mesh){
 const box=new THREE.Box3().setFromObject(mesh);
 colliders.push(box);
 const corners=[[box.min.x,box.min.z],[box.max.x,box.max.z],[box.min.x,box.max.z],[box.max.x,box.min.z]];
 const anchorRefs=corners.map(([x,z])=>new THREE.Vector3(x,box.max.y,z));anchors.push(...anchorRefs);
 const body={mesh,box,anchorRefs};structureBodies.set(box,body);return body;
}
function syncGrippableStructure(body){
 body.box.setFromObject(body.mesh);
 const b=body.box;const corners=[[b.min.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z],[b.max.x,b.min.z]];
 body.anchorRefs.forEach((a,i)=>a.set(corners[i][0],b.max.y,corners[i][1]));
 swingAnchors=null; // rope attachment points must follow moved collision geometry
}
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
 if(LITE){scene.background=new THREE.Color(0x8fb0d0);}else try{const hdr=await new RGBELoader().loadAsync('assets/hdri/venice_sunset_1k.hdr');hdr.mapping=THREE.EquirectangularReflectionMapping;scene.environment=hdr;scene.background=hdr;scene.backgroundBlurriness=0.25;}catch(e){scene.background=new THREE.Color(0x8fb0d0);}
 const asphalt=rep(tl.load('assets/tex/asphalt_diff.jpg'),60);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshStandardMaterial({map:asphalt,roughness:.95}));
 ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const walkM=new THREE.MeshStandardMaterial({color:0xb8b2a6,roughness:.9}), grassM=new THREE.MeshStandardMaterial({color:0x4f7a3a,roughness:1});
 const lineM=new THREE.MeshBasicMaterial({color:0xe8d27a});
 for(let i=-N;i<=N;i++){ // road lines
  for(const v of [0,1]){const l=new THREE.Mesh(new THREE.PlaneGeometry(v?0.3:400,v?400:0.3),lineM);l.rotation.x=-Math.PI/2;l.position.set(v?(i+.5)*(BLOCK+ROAD):0,0.02,v?0:(i+.5)*(BLOCK+ROAD));scene.add(l);}
 }
 setMsg('Kenney city kit…');
 const names=(LITE?'abcd':'abcdefghij').split('').map(c=>'building-'+c).concat(LITE?[]:['building-skyscraper-a','building-skyscraper-b','building-skyscraper-c']);
 const bmods=await Promise.all(names.map(n=>missionAsset('assets/models/city/'+n+'.glb','city').then(g=>g.scene)));
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
   registerGrippableStructure(b);
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
 for(let k=0;k<(LITE?16:40);k++){const x=(rnd()-.5)*360,z=(rnd()-.5)*360; if(Math.abs(((x%56)+56)%56-28)<8)continue;
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
 benchPos=new THREE.Vector3(c.x-10,0,c.z+8);const bench=new THREE.Mesh(new THREE.BoxGeometry(3,.5,1),new THREE.MeshStandardMaterial({color:0x6b4a2a}));bench.position.copy(benchPos).setY(.6);bench.castShadow=true;scene.add(bench);label('Bench · rest',benchPos.clone().setY(2.4),'#bfe').scale.setScalar(.5);
 // A real, grippable construction frame near Metal's spawn, with live geometry and collider.
 const frame=new THREE.Group(),metal=new THREE.MeshStandardMaterial({color:0xb4c6cf,metalness:.87,roughness:.23});
 const beam=(w,h,d,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),metal);m.position.set(x,y,z);m.castShadow=true;frame.add(m);};
 for(const x of [-1.2,1.2])for(const z of [-.55,.55])beam(.17,2.8,.17,x,1.4,z);
 for(const y of [.2,2.65]){beam(2.6,.18,.18,0,y,-.55);beam(2.6,.18,.18,0,y,.55);}
 frame.position.set(c.x+4,0.1,c.z+3);scene.add(frame);registerGrippableStructure(frame);
 label('L1 · GALLIUM FRAME',frame.position.clone().add(new THREE.Vector3(0,3.5,0)),'#d4e6ff').scale.setScalar(.5);
}

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
 const ch={o:root,model:o,mixer,acts,cur:null,mats:{},footY:0,p6:false,rotWalk:0,rotBoard:-1.35,legs:null};play(ch,'Idle');mixer.update(0.01);root.updateMatrixWorld(true);
 const bb=new THREE.Box3().setFromObject(o,true);ch.footY=-bb.min.y;o.position.y=ch.footY; // feet at y=0 of the root
 const h=bb.max.y-bb.min.y;if(h>0.5){o.scale.setScalar(1.78/h);o.position.y=ch.footY*1.78/h;ch.footY=o.position.y;} // 1.78 m PLACEHOLDER height
 ch.feet=[];o.traverse(b=>{if(b.isBone&&/^(DEF-?(toe|foot)|Foot)\.?_?[LR]$/i.test(b.name))ch.feet.push(b);});root.updateMatrixWorld(true);
 ch.soleGap=ch.feet.length?Math.min(...ch.feet.map(b=>b.getWorldPosition(new THREE.Vector3()).y))-root.position.y:0; // foot-bone height above sole in idle
 setMask(0,ch);return ch;}

// ---------- Metal S1–S4 forms (rigged by Metal's Bot, PROPOSAL; compressed for web) ----------
const FORM_FILES=['S1','S2','S3','S4'].map(s=>'assets/models/metal/forms/metal_'+s+'_PROPOSAL.glb');FORM_FILES[0]='assets/models/metal/metal_phase6_fight.glb'; /* S1 = Phase 6 game rig (metal_placeholder.glb from metal_inda_rifft phase 6) */const formGLTF=[];
const FORM_LABEL=['S1 · Phase 6 game rig, black spiky crown (PLACEHOLDER mesh)','S2 · violet seams','S3 · braided mane · bandaged right hand · Merkaba on back','S4 · the Lion · bandaged right hand · Merkaba carryover PROPOSAL'];
// Phase 6 rig clip names (33 clips: stand walk run cruise push carve ollie air land grind manual slide bail wallride swing flight punch_l/r kick_l/r block charge blast transform …)
const P6MAP={Idle:'u_Idle_Loop',Standing:'stand',Walking:'u_Walk_Loop',Jog:'u_Jog_Fwd_Loop',Running:'u_Sprint_Loop',Jump:'air',Air:'air',FootAir:'u_Jump_Loop',JumpStart:'u_Jump_Start',JumpLand:'u_Jump_Land',Roll:'u_Roll',Climb:'u_ClimbUp_1m',Punch:'u_Punch_Jab',Jab:'u_Punch_Jab',Cross:'u_Punch_Cross',Hook:'u_Melee_Hook',KickL:'kick_l',KickR:'kick_r',Dash:'u_Shield_Dash',Guard:'block',HitHead:'u_Hit_Head',HitChest:'u_Hit_Chest',Knock:'u_Hit_Knockback',GetUp:'u_LayToIdle',Kick:'kick_r',Block:'block',ThumbsUp:'transform',Dance:'stand',No:'stand',Charge:'charge',Blast:'u_Spell_Simple_Shoot',Swing:'swing',Grind:'grind',Carve:'carve',Sitting:'stand',Skate:'cruise',BoardIdle:'idle',Push:'push',Ollie:'ollie',Land:'land',Manual:'manual',Bail:'bail',Flight:'flight',Wallride:'wallride',Slide:'slide',Slam:'slam'};
const traceMats=[];
const FMAP={Idle:'idle',Standing:'idle',Walking:'cruise',Running:'skate_push',Skate:'cruise',Jump:'ollie',Punch:'punch',Cross:'punch',Kick:'slam',Block:'idle',ThumbsUp:'idle',Dance:'idle',No:'idle',Charge:'flight_stance',Blast:'punch',Swing:'swing',Grind:'grind',Carve:'carve',Sitting:'idle'};
function buildFormModel(gltf,i){const o=gltf.scene;o.traverse(m=>{if(!m.isMesh)return;m.castShadow=true;m.frustumCulled=false;
  const ms=Array.isArray(m.material)?m.material:[m.material];ms.forEach(mt=>{if(/Bandage/i.test(mt.name||m.name)){mt.emissiveIntensity=.35;mt.userData.bandage=true;bandMats.push(mt);}});});
 const mixer=new THREE.AnimationMixer(o);const acts={};for(const c of gltf.animations)acts[c.name]=mixer.clipAction(c);for(const [k,v] of Object.entries(FMAP))if(acts[v])acts[k]=acts[v];
 if(i===0){for(const [k,v] of Object.entries(P6MAP))if(acts[v])acts[k]=acts[v];
  o.traverse(m=>{if(!m.isMesh)return;const mt=m.material;if(mt.name==='seam'){mt.emissive=new THREE.Color(VIOLET);mt.emissiveIntensity=0;seamMats.push(mt);}if(mt.name==='trace')traceMats.push(mt);});} // canon: violet only on active seams; the trace flashes through the denim on load/land
 return {model:o,mixer,acts};}
const bandMats=[];
async function setForm(i){if(!P||i<0||i>3)return;
 if(GAL_FORGE_ENABLED&&forgeController?.busy){toast('Finish forging before switching METAL forms');return;}
 if(i===0&&metalGLTF?.userData?.missionFallback){toast('Metal fallback active · original rig still available when restored');return;}
 let g=formGLTF[i];if(!g){try{
  g=formGLTF[i]=await loadMissionAsset(loadG,FORM_FILES[i],{timeout:MISSION_ASSET_TIMEOUTS.critical,onWarning:w=>boot.warning(w)});
 }catch(e){toast('Form unavailable · original form retained');return;}}
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
const bodyMachine=new BodyMachine();let bodyTilt=0;
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
let heldCar=null;const thrownCars=[];let heldCitizen=null,heldActor=null;
function grabCar(selectedCar=null){if(heldCar)return;const aim=new THREE.Vector3(-Math.sin(camYaw+gripAxisX*.7),0,-Math.cos(camYaw+gripAxisX*.7));const car=selectedCar||cars.filter(c=>!c.userData.worldBody).map(c=>({c,d:c.position.distanceTo(P.o.position),dot:c.position.clone().sub(P.o.position).setY(0).normalize().dot(aim)})).filter(v=>v.d<18).sort((a,b)=>((b.dot-a.dot)*2+a.d-b.d))[0]?.c;if(!car||car.position.distanceTo(P.o.position)>18){if(!worldGripWarned){toast('L2 detected · no car targeted (move closer)');worldGripWarned=true;}return;}worldGripWarned=false;const u=car.userData;if(u.worldBody){u.worldBody.grab();const i=thrownCars.indexOf(car);if(i>=0)thrownCars.splice(i,1);heldCar=car;toast('CAR GRAPPLED');return;}u.worldBody=new WorldBody({mass:1500,radius:2.3});u.worldBody.grab();u.worldBody.hold(car.position.x,car.position.y,car.position.z);heldCar=car;u.occupantExited=true;u.occupantCount=0;const passenger=makeChar(0xd6aa7d);passenger.o.position.copy(car.position).add(new THREE.Vector3(2.5,.3,0));scene.add(passenger.o);passenger.target=passenger.o.position.clone().add(new THREE.Vector3(8,0,8));passenger.speed=3;passenger.wait=0;passenger.role='evacuating driver';npcs.push(passenger);toast('Driver evacuated · CAR GRAPPLED');}
function releaseCar(){if(!heldCar)return;const car=heldCar,b=car.userData.worldBody;b.release();if(!thrownCars.includes(car))thrownCars.push(car);heldCar=null;}
function slingCar(){if(!heldCar)return;const car=heldCar,b=car.userData.worldBody;if(!car.userData.occupantExited||car.userData.occupantCount>0){toast('Cannot throw an occupied vehicle');return;}const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));b.hold(car.position.x,car.position.y,car.position.z);b.throw(f.x*24,12,f.z*24);thrownCars.push(car);heldCar=null;toast('CAR SLING');}
function updateCarBodies(dt){if(heldCar){const target=gripHeldPosition(P.o.position,camYaw,gripAxisX,gripAxisY,groundY,{distance:3.5,lateral:4,height:2.8});heldCar.userData.worldBody.hold(target.x,target.y,target.z);heldCar.position.set(target.x,target.y,target.z);heldCar.rotation.y+=dt*.6;}for(const c of thrownCars){const b=c.userData.worldBody;if(!b)continue;b.step(dt,.05);c.position.set(b.position.x,b.position.y,b.position.z);c.rotation.z+=dt*Math.hypot(b.velocity.x,b.velocity.z)*.045;}}
function wp(){const i=Math.floor(Math.random()*7)-3,j=Math.floor(Math.random()*7)-3;const c=lotCenter(i,j);const e=BLOCK/2+2;return new THREE.Vector3(c.x+(Math.random()<.5?-e:e),0.25,c.z+(Math.random()-.5)*BLOCK);}
async function spawnLife(){const tints=[0xd9a066,0x5ea1d6,0xc85a5a,0x7bc47f,0xe0c35a,0xa07ad6,0xeeeeee,0x444444];

 const n=isTouch?10:18;for(let i=0;i<n;i++){const ch=makeChar(tints[i%tints.length]);ch.o.position.copy(wp());ch.target=wp();ch.speed=1.3+Math.random()*.6;ch.wait=0;ch.role=['commuter','vendor','student','jogger'][i%4];scene.add(ch.o);play(ch,'Walking');npcs.push(ch);}
 rival=makeRival();rival.o.position.copy(fightC).add(new THREE.Vector3(3,0.55,0));scene.add(rival.o);rivalSt={stance:1,charge:0,cd:0,active:false};
 for(let i=0;i<3;i++){const d=makeChar(0xb02a3a);d.o.position.copy(fieldC).add(new THREE.Vector3(8+i*3,0.26,(i-1)*5));d.home=d.o.position.clone();scene.add(d.o);defenders.push(d);}
 const cm=['taxi','sedan','suv','van','police','delivery','truck'];const mods=await Promise.all(cm.map(n=>missionAsset('assets/models/cars/'+n+'.glb','car').then(g=>g.scene)));
 for(let i=0;i<(isTouch?8:14);i++){const m=mods[i%mods.length];if(!m)continue;const c=m.clone();c.scale.setScalar(2.2);c.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  const axis=i%2,lane=(Math.floor(Math.random()*6)-3+.5)*(BLOCK+ROAD),dir=Math.random()<.5?1:-1;c.userData={axis,lane:lane+dir*2.8,dir,t:(Math.random()-.5)*400,spd:9+Math.random()*5,occupantCount:1,occupantExited:false};scene.add(c);cars.push(c);}
}

// ---------- input: keyboard, touch, gamepad (one scheme for the whole world) ----------
const keys={},pressed={};
// SkyLab V3 gamepad controls are optional and do not write Metal mission saves.
const metalPadV3=createSavannahMetalController({onMessage:m=>toast(String(m).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'))});
let v3PrevFlight=false,v3GrabHeld=false,v3SpinTime=0,v3KickflipTime=0;
addEventListener('keydown',e=>{if(/^F[1-4]$/.test(e.code))e.preventDefault();if(!keys[e.code])pressed[e.code]=true;keys[e.code]=true;if(e.code.startsWith('Numpad')||e.code==='Space')e.preventDefault();});
addEventListener('keyup',e=>keys[e.code]=false);
let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2){pressed.KeyQ=true;return;}drag={x:e.clientX,y:e.clientY,id:e.pointerId};});
addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){camYaw-=(e.clientX-drag.x)*.005;camPitch=THREE.MathUtils.clamp(camPitch+(e.clientY-drag.y)*.004,-.1,1.1);drag.x=e.clientX;drag.y=e.clientY;}});
addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId)drag=null;});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
const stick={x:0,y:0};
const touchButtonLatches=[];
{const s=$('stick'),n=$('nub');let activeId=null;
 const center=()=>{n.style.left=((s.clientWidth-n.offsetWidth)/2)+'px';n.style.top=((s.clientHeight-n.offsetHeight)/2)+'px';};
 const move=e=>{
  const v=touchStickVector(s.getBoundingClientRect(),e.clientX,e.clientY);stick.x=v.x;stick.y=v.y;
  const travel=Math.max(0,(Math.min(s.clientWidth-n.offsetWidth,s.clientHeight-n.offsetHeight))/2-7);
  n.style.left=((s.clientWidth-n.offsetWidth)/2+v.x*travel)+'px';
  n.style.top=((s.clientHeight-n.offsetHeight)/2+v.y*travel)+'px';
 };
 const reset=()=>{activeId=null;stick.x=stick.y=0;center();};
 s.addEventListener('pointerdown',e=>{if(activeId!==null)return;e.preventDefault();activeId=e.pointerId;try{s.setPointerCapture(activeId);}catch{}move(e);});
 s.addEventListener('pointermove',e=>{if(e.pointerId===activeId)move(e);});
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])s.addEventListener(kind,e=>{if(e.pointerId===activeId)reset();});
 addEventListener('blur',reset);addEventListener('pagehide',reset);
 center();
}
document.querySelectorAll('#tbtn button').forEach(b=>{
 const code=b.dataset.k,latch=createPointerLatch();touchButtonLatches.push({code,latch});
 b.addEventListener('pointerdown',e=>{
  e.preventDefault();
  if(latch.down(e.pointerId)){pressed[code]=true;keys[code]=true;}
  try{b.setPointerCapture(e.pointerId);}catch{}
 });
 const release=e=>{if(latch.up(e.pointerId)){keys[code]=false;if(code==='KeyX')xRel=true;}};
 for(const kind of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(kind,release);
 b.addEventListener('contextmenu',e=>e.preventDefault());
});
const clearTouchKeys=()=>{for(const {code,latch} of touchButtonLatches)if(latch.clear())keys[code]=false;};
addEventListener('blur',clearTouchKeys);addEventListener('pagehide',clearTouchKeys);
// Xbox layout [S5]: A jump, B board, X 4-hand, Y 6-hand, LB grapple, RB fly, LT block, RT charge, Back map, Start profile, dpad interact
// Controller legend is intentionally visible on first connection and can be toggled with H.
let controllerLegend=null,controllerSeen=false;
function showControllerLegend(){
 if(!controllerLegend){controllerLegend=document.createElement('div');controllerLegend.id='controllerLegend';
 controllerLegend.style.cssText='position:fixed;right:12px;top:62px;z-index:20;max-width:240px;background:#10131fee;color:#f4f1ff;border:1px solid #9876e8;border-radius:12px;padding:12px;font:12px/1.6 system-ui;box-shadow:0 4px 20px #0008';
 controllerLegend.innerHTML='<b>🎮 METAL · CONTROLLER</b><br>Left stick: move · Right stick: camera<br>A: jump / recover · B: forge on ground / dodge in combat or air<br>X: left combat action · Y: right combat action<br>LB: Gallium grab · RB: Gallium swing<br>LT: valence charge · RT: RIFFT Step<br><b>LB + right stick:</b> move suspended car<br><b>LB + RT:</b> throw held car<br>D-pad: actions · Menu: profile<br><small>H: hide/show this guide · Keyboard U/I: car grab/throw</small>';
 document.body.append(controllerLegend);}
 controllerLegend.style.display=controllerLegend.style.display==='none'?'block':'none';
}
const padMap={0:'Space',1:'KeyB',2:'Numpad4',3:'Numpad6',4:'KeyQ',5:'KeyF',6:'Numpad2',7:'Numpad5',8:'KeyM',9:'KeyP',12:'KeyE',13:'KeyX',14:'Numpad1',15:'Numpad3'};const padPrev={};
function pollPad(dt=1/60){
 const gp=navigator.getGamepads?[...navigator.getGamepads()].find(g=>g&&g.connected):null;
 const v3=metalPadV3.poll(gp,dt);
 if(metalPadV3.mode==='skylab'){
  // Switching modes releases only keys previously synthesized by Classic.
  for(const [i,k] of Object.entries(padMap)){if(padPrev[i])keys[k]=false;padPrev[i]=false;}
  if(!v3.connected){if(v3PrevFlight&&st.flying)pressed.KeyF=true;v3PrevFlight=false;v3GrabHeld=false;return null;}
  const held=new Set(v3.held||[]),edges=new Set(v3.edges||[]),combo=v3.combo||{};
  if(v3.paused)return {x:0,y:0};
  if(edges.has('jump'))pressed.Space=true;
  if(edges.has('dash')){
   // SkyLab B forges/dissolves on grounded non-combat streets; B remains dodge in combat/air.
   // One controller edge = one request, never repeat while B stays held.
   if(GAL_FORGE_ENABLED&&forgeController?.busy){/* ignore B while the forge is forming */}
   else if(GAL_FORGE_ENABLED&&!FG.inFight&&onGround&&!st.flying&&!st.swing)pressed.KeyB=true;
   else pressed.Semicolon=true;
  }
  if(edges.has('roar'))pressed.Numpad4=true;
  if(edges.has('slam')){if(!onGround)v3SpinTime=.75;else toast('Jump or swing before a 360 aerial spin');}
  if(edges.has('grapple'))pressed.KeyQ=true;
  if(edges.has('tentacle')){if(onGround)pressed.Numpad7=true;else toast('Gallium pulse requires contact; midair platform is not yet in this build');}
  if(combo.kickflip){pressed.Space=true;v3KickflipTime=.75;}
  if(combo.pressure)pressed.Numpad7=true;
  if(combo.gorillium){setViolet(1);toast('GORILLIUM: transformation animation preview pending. No unverified rig applied.');}
  v3GrabHeld=!!combo.grab;
  if(combo.sling){if(st.swing){releaseSwing('SkyLab aerial sling');const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));vel.addScaledVector(f,8);vel.y=Math.max(vel.y,5);}else toast('Sling requires an attached Gallium tether');}
  if(edges.has('footIK')){camYaw=yaw+Math.PI;camPitch=.35;}
  if(edges.has('tentIK')){
   const move=v3.move?.id;
   if(move==='grapple')pressed.KeyQ=true;
   else if(move==='pulse')pressed.Numpad7=true;
   else if(move==='flight')pressed.KeyF=true;
   else if(move==='board')pressed.KeyB=true;
   else if(move==='riff')riffStep();
   else if(move==='blast')pressed.KeyZ=true;
  }
  const heldFlight=held.has('glide')&&!held.has('sprint');
  if(heldFlight&&!st.flying&&!onGround&&st.ori>.2&&!st.wall)pressed.KeyF=true;
  if(v3PrevFlight&&!heldFlight&&st.flying)pressed.KeyF=true;
  v3PrevFlight=heldFlight;
  if(held.has('dash')){const braking=Math.exp(-5*dt);vel.x*=braking;vel.z*=braking;}
  if(!held.has('sprint')){camYaw-=v3.lookX*dt*2.6;camPitch=THREE.MathUtils.clamp(camPitch+v3.lookY*dt*2,-.1,1.1);}
  return {x:v3.x,y:v3.y};
 }
 // Original Classic mapping is fully preserved.
 if(!gp){for(const [i,k] of Object.entries(padMap)){if(padPrev[i])keys[k]=false;padPrev[i]=false;}return null;}
 for(const [i,k] of Object.entries(padMap)){const chord=(i==='4'||i==='5'||i==='6'||i==='7');const v=!!(!chord&&gp.buttons[i]&&gp.buttons[i].pressed);if(v&&!padPrev[i])pressed[k]=true;if(v)keys[k]=true;else if(padPrev[i])keys[k]=false;padPrev[i]=v;}
 const dz=v=>Math.abs(v)<.15?0:v;if(gp.axes.length>=4&&!worldGripActive){camYaw-=dz(gp.axes[2])*.04;camPitch=THREE.MathUtils.clamp(camPitch+dz(gp.axes[3])*.03,-.1,1.1);}return {x:dz(gp.axes[0]),y:dz(gp.axes[1])};
}
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
function endSpar(win){const R=rivalSt;R.active=false;$('foe').style.display='none';R.act=null;R.queue=[];R.guard=false;if(R.kb)R.kb.set(0,0,0);R.sm=null;if(rivalMat)rivalMat.emissiveIntensity=0;play(rival,win?'No':'Dance');toast(win?'Stance broken — you win (nonlethal spar)':'Your stance broke — rematch anytime');if(win){plog('achievements','Won a Fight Lot spar');R.level=Math.min(5,(R.level||1)+1);}R.stance=1;FG.act=null;FG.stun=0;st.hp=1;}
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
// The Test Yard is a visual/trick sidecar. Existing movement and powers own the scene.
const yard=TEST_YARD_SKATE?createTestYardSkateAdapter():null;
if(yard){
 const ui=document.createElement('div');ui.id='testyardSkateActions';
 ui.style.cssText='position:fixed;z-index:24;left:max(8px,env(safe-area-inset-left));bottom:calc(108px + env(safe-area-inset-bottom));display:flex;gap:5px;flex-wrap:wrap;max-width:min(78vw,410px);pointer-events:auto';
 for(const [code,label] of [['BracketLeft','FLIP'],['BracketRight','GRAB'],['Quote','MANUAL']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.setAttribute('aria-label','Test Yard '+label);
  b.style.cssText='font:700 12px system-ui;background:#271c40e8;color:#f0e6ff;border:1px solid #aa90db;border-radius:10px;padding:12px 14px;touch-action:none;user-select:none';
  const ids=new Set();
  b.addEventListener('pointerdown',e=>{e.preventDefault();ids.add(e.pointerId);keys[code]=true;pressed[code]=true;try{b.setPointerCapture(e.pointerId);}catch{}});
  const done=e=>{ids.delete(e.pointerId);if(ids.size===0)keys[code]=false;};
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,done);
  addEventListener('blur',()=>{ids.clear();keys[code]=false;});
  ui.appendChild(b);
 }
 document.body.append(ui);
}
function finishYardAir(){
 if(!yard)return true;
 const landed=yard.land();
 if(landed.failed){skBail(landed.reason);bodyMachine.fall(vel.x,vel.z);return false;}
 if(landed.points>0){st.comboPend+=Math.min(4,landed.points/120);toast(landed.names.join(' + ')+' · LANDED');}
 return true;
}

function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
function plA(n,fb){play(P,P.acts[n]?n:fb);}
function skateGround(dt,wish,il){
 let s=Math.hypot(vel.x,vel.z);if(s>.1)sk.h=Math.atan2(vel.x,vel.z);
 const pump=!!(keys.ShiftLeft||keys.ShiftRight||(yard&&keys.Quote));
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
  if(!sk.manual&&s>2.25&&(st.comboPend>0||sk.landT<.5||(yard&&keys.Quote)))sk.manual={t:0,bal:(Math.random()-.5)*.3,v:0};}
 else{if(sk.manual)endManual();sk.comp=0;}
 if(sk.manual){const m=sk.manual;m.t+=dt;const fb=il>.2?fwdIn*il:0;
  if(yard){const next=yard.manualBalance(m.bal,m.v,dt,fb);m.v=next.velocity;m.bal=next.balance;}else{m.v+=(m.bal*2.1+(Math.random()-.5)*2.2)*dt-fb*3.4*dt;m.bal+=m.v*dt;}
  if(Math.abs(m.bal)>1){sk.manual=null;skBail('MANUAL BAIL');return;}}
 const dec=(MSK.ROLL+MSK.DRAG*s)*dt*(sk.manual?.6:1);s=Math.min(Math.max(0,s-dec),MSK.TOP);
 sk.s=s;vel.x=Math.sin(sk.h)*s;vel.z=Math.cos(sk.h)*s;sk.landT+=dt;
}
function endManual(){const t=sk.manual.t;sk.manual=null;if(t>.35){st.comboPend++;toast('Manual '+t.toFixed(1)+' s');}}
function skOllie(){const s=Math.hypot(vel.x,vel.z);vel.y=MSK.OLLIE+s*MSK.POP+sk.comp*MSK.COMP;if(sk.manual)endManual();
 sk.comp=0;sk.stroke=-1;sk.airT=0;onGround=false;st.comboPend++;play(P,P.acts.Ollie?'Ollie':'Jump',true);}
function skBail(why){
 if(yard&&sk.bailT>0)return;
 bail();toast(why);sk.stroke=-1;sk.manual=null;vel.x*=.2;vel.z*=.2;
 const fall=yard?.startFall(why);sk.bailT=fall?.duration??.9;
 const clip=fall?.clip&&P.acts[fall.clip]?fall.clip:P.acts.Bail?'Bail':null;
 if(clip){play(P,clip,true);actT=fall?Math.min(fall.duration*.75,1.4):.6;}
}
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

// ---------- MOVEMENT v2 + FIGHT v3 (several opponents) + GALLIUM SWING v2 ----------
// Canon kept: numpad layout 4/6 hands · 1/3 legs · 2 block · 5 charge · 8 transform · 7 blast · 9 special; fights are
// nonlethal spars; gunmetal at rest, violet ONLY on active seams; real four-wheel board; swings use Galaxy Gallium (finite).
// Everything else (timings, combos, parry, dodge, crews, swing tuning) = PROPOSAL.
// Animation: Quaternius Universal Animation Library 1+2 (CC0) retargeted onto the Phase 6 rig. Opponents: Quaternius Universal
// Base Characters (CC0) with the same library + Metal's kicks retargeted. Opponent brains: Yuka (MIT) steering + state machines.
const MV={WALK:1.7,JOG:4.6,SPRINT:7.6,ACC:22,DEC:28,AIR:6,TURN:16,JUMP:6.4,JUMP_RUN:.5,CUT:.5,COYOTE:.12,BUF:.13,GRAV:24,
 DODGE_D:3.5,DODGE_T:.42,DODGE_I:.3,DODGE_CD:.3,CLIMB_T:1.0}; // DODGE_D = v7 DODGE_DIST 140 px × 0.025
const FG={act:null,buf:null,bufT:0,lastS:null,lastT:9,chain:0,combo:0,comboT:9,hitstop:0,slow:0,shake:0,stun:0,guardT:9,gHeld:false,
 dodge:null,dodgeCD:0,iframe:0,coyote:0,jumpBuf:0,jumped:false,airT:0,climb:null,lock:false,target:null,inFight:false,fov:62,kb:new THREE.Vector3(),il:0,wantDodge:false,auraT:0,hits:0,parries:0,perfect:0,crewWins:0};
const STRK={
 jab:{a:'Jab',t0:.07,t1:.16,end:.34,r:1.75,dmg:.06,kb:.7,stun:.3,react:'HitHead',step:.35},
 cross:{a:'Cross',t0:.12,t1:.21,end:.42,r:1.85,dmg:.085,kb:1.1,stun:.36,react:'HitHead',step:.45},
 hook:{a:'Hook',t0:.17,t1:.28,end:.58,r:1.8,dmg:.13,kb:3.4,stun:.7,react:'Knock',step:.4,down:true},
 kickL:{a:'KickL',t0:.17,t1:.29,end:.52,r:2.15,dmg:.10,kb:1.8,stun:.42,react:'HitChest',step:.2},
 kickR:{a:'KickR',t0:.19,t1:.31,end:.56,r:2.25,dmg:.115,kb:2.2,stun:.48,react:'HitChest',step:.2},
 dash:{a:'Dash',t0:.12,t1:.36,end:.62,r:2.0,dmg:.12,kb:3.0,stun:.6,react:'Knock',lunge:8,down:true},
 blast:{a:'Blast',t0:.24,t1:.25,end:.55,r:0,dmg:.12,kb:2.4,stun:.45,react:'HitChest'}};
const RMAP={Idle:'Idle_Loop',Walking:'Walk_Loop',Running:'Jog_Fwd_Loop',Jab:'Punch_Jab',Cross:'Punch_Cross',Hook:'Melee_Hook',KickL:'m_kick_l',KickR:'m_kick_r',
 Dash:'Shield_Dash',Guard:'Idle_Shield_Loop',GuardBreak:'Idle_Shield_Break',HitHead:'Hit_Head',HitChest:'Hit_Chest',Knock:'Hit_Knockback',GetUp:'LayToIdle',Roll:'Roll',No:'Idle_No_Loop',Dance:'Yes',Punch:'Punch_Jab',Wave:'Yes'};
let rivalGLTF=null,crewFemGLTF=null,rivalMat=null;
function playT(ch,name,dur,fade=.08){const a=ch.acts[name];if(!a)return false;play(ch,name,true,fade);if(dur)a.setEffectiveTimeScale(a.getClip().duration/dur);return true;}
// clothes for the CC0 base bodies: a shader paints a top / bottoms / shoes by bind-pose region (head, hands stay skin)
function outfitMat(src,geo,c){const m=src.clone();geo.computeBoundingBox();const bb=geo.boundingBox;
 const U={uMin:{value:bb.min.clone()},uMax:{value:bb.max.clone()},uTop:{value:new THREE.Color(c.top)},uBot:{value:new THREE.Color(c.bot)},uShoe:{value:new THREE.Color(c.shoe??0x141414)},uSleeve:{value:c.sleeve?1:0}};
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBind;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBind=position;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vBind;uniform vec3 uMin,uMax,uTop,uBot,uShoe;uniform float uSleeve;')
  .replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 q=(vBind-uMin)/max(uMax-uMin,vec3(1e-4));float ax=abs(q.x-0.5)*2.0;
   bool skin=q.y>0.835||ax>0.72||(uSleeve>0.5&&ax>0.45&&q.y>0.6);
   if(!skin){vec3 c=q.y<0.05?uShoe:(q.y<0.54?uBot:uTop);float l=dot(diffuseColor.rgb,vec3(.299,.587,.114));diffuseColor.rgb=c*(0.45+1.1*l);}}`);};
 m.customProgramCacheKey=()=>'wir-outfit';return m;}
function makeFighter(gltf,outfit){const o=SkeletonUtils.clone(gltf.scene);let body=null;
 o.traverse(m=>{if(!m.isMesh)return;m.castShadow=true;m.frustumCulled=false;if(m.material&&/Superhero/.test(m.material.name)){m.material=outfit?outfitMat(m.material,m.geometry,outfit):m.material.clone();body=m.material;body.emissive=new THREE.Color(0xff2a10);body.emissiveIntensity=0;}});
 const root=new THREE.Group();root.add(o);const mixer=new THREE.AnimationMixer(o);mixers.push(mixer);const acts={};for(const c of gltf.animations)acts[c.name]=mixer.clipAction(c);
 for(const [k,v] of Object.entries(RMAP))if(acts[v])acts[k]=acts[v];
 mixer.update(0);root.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o,true);const h=bb.max.y-bb.min.y;if(h>.5)o.scale.setScalar((outfit&&outfit.h||1.84)/h);
 root.updateMatrixWorld(true);const b2=new THREE.Box3().setFromObject(o,true);o.position.y=-b2.min.y;
 const ch={o:root,model:o,mixer,acts,cur:null,mats:{},body};play(ch,'Idle');return ch;}
function makeRival(){if(!rivalGLTF)return makeChar(0xff5050);const ch=makeFighter(rivalGLTF,{top:0x8a1f24,bot:0x111216,shoe:0x1b1b1b});rivalMat=ch.body;
 const foe=$('foe');if(foe&&!$('mMe')){foe.insertAdjacentHTML('beforeend','<small style="display:block;margin-top:6px">Metal</small><div class="bar"><i id="mMe" style="background:#c9ccd4"></i></div>');}
 if(!$('fgCombo')){const d=document.createElement('div');d.id='fgCombo';d.style.cssText='position:fixed;right:max(16px,env(safe-area-inset-right,0px));top:42%;font:800 28px system-ui;color:#f1f2f6;text-shadow:0 2px 0 #000,0 0 12px #000;opacity:0;transition:opacity .15s;pointer-events:none;z-index:20;text-align:right';document.body.appendChild(d);}
 return ch;}
// ---------- opponents: the Fight Lot rival + street crews (PROPOSAL placements, names and looks) ----------
const FOES=[];const CREWS=[
 {name:'Skatepark crew',spot:'skate',off:[15,-15],level:1,fits:[{top:0x1f6f78,bot:0xb9a77f},{top:0x2a2d33,bot:0xb9a77f,f:1},{top:0x1f6f78,bot:0x3a4250}]},
 {name:'Pickup crew',spot:'field',off:[-16,16],level:2,fits:[{top:0xc8382e,bot:0xe9e4da,sleeve:1},{top:0xe9e4da,bot:0xc8382e,sleeve:1,f:1}]},
 {name:'Commons crew',spot:'home',off:[-15,-15],level:2,fits:[{top:0x111216,bot:0xd2a53c},{top:0xd2a53c,bot:0x111216,f:1},{top:0x3b2a52,bot:0x111216}]}];
const STORY_FIGHTS=[];
function initFoes(){if(FOES.length||!rival)return;rivalSt.kind='rival';rivalSt.label='Sparring rival';FOES.push({ch:rival,R:rivalSt});
 if(!rivalGLTF)return;for(const c of CREWS){const sp=SPOTS[c.spot];if(!sp||!sp.c)continue;c.home=sp.c.clone().add(new THREE.Vector3(c.off[0],groundY,c.off[1]));c.state='idle';c.members=[];
  c.fits.forEach((fit,i)=>{const g=fit.f&&crewFemGLTF?crewFemGLTF:rivalGLTF;const ch=makeFighter(g,{...fit,h:fit.f?1.72:1.82});
   const a=i/c.fits.length*Math.PI*2;ch.o.position.copy(c.home).add(new THREE.Vector3(Math.cos(a)*1.6,0,Math.sin(a)*1.6));ch.o.rotation.y=Math.atan2(c.home.x-ch.o.position.x,c.home.z-ch.o.position.z);scene.add(ch.o);
   const R={kind:'crew',crew:c,label:c.name,active:false,stance:1,level:c.level,out:false,slot:a,kb:new THREE.Vector3()};const foe={ch,R};c.members.push(foe);FOES.push(foe);});}
 // Story opponents are optional, nonlethal prototype encounters near existing arenas.
 // No new lore is asserted by their locations or outfits.
 const sites=['fight','skate','dojo','forge','field','home','pluto'];
 STORY_ENEMIES.forEach((entry,i)=>{const sp=SPOTS[sites[i]];if(!sp?.c)return;
  const home=sp.c.clone().add(new THREE.Vector3(11,groundY,10));
  const ch=rivalGLTF?makeFighter(rivalGLTF,{top:[0x373b46,0x283c49,0x596275,0x414154,0x232933,0x4e403b,0x272238][i],bot:0x171923,h:entry.style==='heavy'||entry.style==='boss'?2.05:1.82}):makeChar(0x666688);
  ch.o.position.copy(home);scene.add(ch.o);
  const c={name:entry.name,home,state:'idle',level:i+1,members:[],story:true,entry};
  const R={kind:'crew',crew:c,label:entry.name,style:entry.style,active:false,stance:1,level:Math.min(5,i+1),out:false,slot:0,kb:new THREE.Vector3()};
  const foe={ch,R};c.members.push(foe);FOES.push(foe);STORY_FIGHTS.push(c);
 });}
function activeFoes(){return FOES.filter(f=>f.R.active&&!f.R.out);}
function crewPrompt(pp){if(FG.inFight)return null;for(const c of [...STORY_FIGHTS,...CREWS]){if(!c.home||c.state!=='idle')continue;if(pp.distanceTo(c.home)<6.5)return {text:'E — '+c.name+(c.story?' · story encounter (PROPOSAL)':' wants a street spar (nonlethal)'),go:()=>startCrew(c)};}return null;}
function startCrew(c){c.state='fight';for(const f of c.members){Object.assign(f.R,{active:true,stance:.55,max:.55,out:false,sm:null,act:null,queue:[],guard:false});}$('foe').style.display='block';
 toast(c.name+' — street spar! Break every stance');plog('decisions','Accepted a street spar ('+c.name+')');}
function endCrew(c,win){c.state='cool';c.cool=win?30:8;for(const f of c.members){const R=f.R;R.active=false;R.act=null;R.queue=[];R.guard=false;R.sm=null;if(f.ch.body)f.ch.body.emissiveIntensity=0;if(R.out){R.getup=1.3;playT(f.ch,'GetUp',1.3);}else play(f.ch,win?'No':'Dance');}
 if(!activeFoes().length)$('foe').style.display='none';FG.act=null;FG.stun=0;st.hp=1;
 if(win){FG.crewWins++;st.gal=Math.min(1,st.gal+.2);toast(c.name+' tapped out — street respect · Gallium +');plog('achievements','Won a street spar ('+c.name+')');c.level=Math.min(5,c.level+1);}
 else toast(c.name+' got you — run it back later');}
function crewTick(dt){for(const c of [...CREWS,...STORY_FIGHTS]){if(!c.home)continue;
 if(c.state==='cool'){c.cool-=dt;if(c.cool<=0){c.state='idle';for(const f of c.members){f.R.out=false;f.R.stance=1;}}}
 if(c.state==='fight'){if(c.members.every(f=>f.R.out)){endCrew(c,true);continue;}if(P.o.position.distanceTo(c.home)>28){toast('You left — '+c.name+' calls it');endCrew(c,false);continue;}}
 if(c.state!=='fight')for(const f of c.members){if(f.R.getup>0){f.R.getup-=dt;continue;}const o=f.ch.o,want=_fv2.copy(c.home).add(new THREE.Vector3(Math.cos(f.R.slot)*1.6,0,Math.sin(f.R.slot)*1.6));const v=want.sub(o.position).setY(0);const d=v.length();
  if(d>.25){o.position.addScaledVector(v.normalize(),Math.min(d,dt*1.6));o.rotation.y+=angDiff(o.rotation.y,Math.atan2(v.x,v.z))*Math.min(1,dt*6);play(f.ch,'Walking');}
  else{const near=P.o.position.distanceTo(o.position)<9,lk=near?Math.atan2(P.o.position.x-o.position.x,P.o.position.z-o.position.z):Math.atan2(c.home.x-o.position.x,c.home.z-o.position.z);o.rotation.y+=angDiff(o.rotation.y,lk)*Math.min(1,dt*4);
   if(c.state==='idle'&&f.ch.curName!=='Idle'&&f.ch.curName!=='Guard')play(f.ch,near?'Guard':'Idle');}}}}
// ---- sparks (contact bursts + charge aura; silver-white so violet stays on the seams) ----
const SPK={n:220,i:0};
function initSparks(){const g=new THREE.BufferGeometry();SPK.pos=new Float32Array(SPK.n*3).fill(-999);SPK.vel=new Float32Array(SPK.n*3);SPK.life=new Float32Array(SPK.n);
 g.setAttribute('position',new THREE.BufferAttribute(SPK.pos,3));SPK.pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xe8ecff,size:.08,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
 SPK.pts.frustumCulled=false;scene.add(SPK.pts);}
function burst(p,count,speed,up=0){if(!SPK.pts)initSparks();for(let k=0;k<count;k++){const i=SPK.i++%SPK.n;SPK.pos[i*3]=p.x;SPK.pos[i*3+1]=p.y;SPK.pos[i*3+2]=p.z;
 const a=Math.random()*Math.PI*2,b=Math.random()*2-1,s=speed*(.4+Math.random()*.6);SPK.vel[i*3]=Math.cos(a)*Math.sqrt(1-b*b)*s;SPK.vel[i*3+1]=b*s+up;SPK.vel[i*3+2]=Math.sin(a)*Math.sqrt(1-b*b)*s;SPK.life[i]=.18+Math.random()*.3;}}
function sparksTick(dt){if(!SPK.pts)return;for(let i=0;i<SPK.n;i++){if(SPK.life[i]<=0)continue;SPK.life[i]-=dt;SPK.vel[i*3+1]-=6*dt;
 SPK.pos[i*3]+=SPK.vel[i*3]*dt;SPK.pos[i*3+1]+=SPK.vel[i*3+1]*dt;SPK.pos[i*3+2]+=SPK.vel[i*3+2]*dt;if(SPK.life[i]<=0)SPK.pos[i*3+1]=-999;}SPK.pts.geometry.attributes.position.needsUpdate=true;}
const _fv1=new THREE.Vector3(),_fv2=new THREE.Vector3(),_fv3=new THREE.Vector3();
function fgTime(dt){if(FG.hitstop>0){FG.hitstop-=dt;return dt*.03;}if(FG.slow>0){FG.slow-=dt;return dt*.35;}return dt;}
function toFoe(f){return _fv1.set(f.ch.o.position.x-P.o.position.x,0,f.ch.o.position.z-P.o.position.z);}
function toTarget(){return FG.target?toFoe(FG.target):_fv1.set(0,0,1);}
// ---------- MOVEMENT (on foot) ----------
function footMove(dt,wish,il,run){
 const pp=P.o.position;FG.dodgeCD-=dt;FG.iframe-=dt;FG.il=il;
 if(FG.climb){const c=FG.climb;c.t+=dt;const u=Math.min(1,c.t/MV.CLIMB_T),up=Math.min(1,u/.62),e=up*up*(3-2*up),fw=Math.max(0,(u-.5)/.5);
  pp.set(c.from.x+(c.to.x-c.from.x)*fw,c.from.y+(c.to.y-c.from.y)*e,c.from.z+(c.to.z-c.from.z)*fw);vel.set(0,0,0);if(u>=1){FG.climb=null;onGround=true;}return;}
 if(FG.dodge){const d=FG.dodge;d.t+=dt;const sp=MV.DODGE_D/MV.DODGE_T*(1.15-.6*Math.min(1,d.t/MV.DODGE_T));vel.x=d.dir.x*sp;vel.z=d.dir.z*sp;vel.y-=MV.GRAV*dt;
  if(d.t>=MV.DODGE_T){FG.dodge=null;FG.dodgeCD=MV.DODGE_CD;}return;}
 const stunned=FG.stun>0;if(stunned){FG.stun-=dt;il=0;wish.set(0,0,0);}
 if((tap('Semicolon')||tap('Numpad0')||FG.wantDodge)&&onGround&&FG.dodgeCD<=0&&!stunned&&!FG.act){
  let dir;if(il>.2)dir=wish.clone().setY(0).normalize();else if(FG.lock)dir=toTarget().clone().normalize().multiplyScalar(-1);else dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  FG.dodge={t:0,dir};FG.iframe=MV.DODGE_I;yaw=Math.atan2(dir.x,dir.z);playT(P,'Roll',MV.DODGE_T*1.2);actT=MV.DODGE_T;beep(140,.08,'triangle',.04);FG.wantDodge=false;return;}
 FG.wantDodge=false;
 const striking=!!FG.act,charging=keys.Numpad5||keys.KeyK;
 let target=0;if(il>.15)target=run?MV.SPRINT:(il<.6?MV.WALK+(MV.JOG-MV.WALK)*(il-.15)/.45:MV.JOG);
 if(st.form===2)target*=1.05;                                   // form stats placeholder (kept)
 if(striking)target=Math.min(target,.8);if(blocking||charging)target=Math.min(target,MV.WALK*.6);if(FG.lock&&!run)target=Math.min(target,MV.JOG*.8);
 const hv=_fv2.set(vel.x,0,vel.z),tv=wish.clone().setY(0);if(tv.lengthSq()>1e-6)tv.normalize();tv.multiplyScalar(target);
 const sp=hv.length(),pivot=sp>3&&tv.lengthSq()>.01&&hv.dot(tv)<-.3*sp*tv.length();
 const rate=(onGround?(tv.length()>sp&&!pivot?MV.ACC:MV.DEC):MV.AIR)*dt;const dv=tv.sub(hv);if(dv.length()>rate)dv.setLength(rate);hv.add(dv);
 vel.x=hv.x;vel.z=hv.z;vel.y-=MV.GRAV*dt;
 if(FG.kb.lengthSq()>.001){pp.addScaledVector(FG.kb,dt);FG.kb.multiplyScalar(Math.exp(-7*dt));}
 FG.coyote=onGround?MV.COYOTE:FG.coyote-dt;if(tap('Space'))FG.jumpBuf=MV.BUF;else FG.jumpBuf-=dt;
 if(FG.jumpBuf>0&&FG.coyote>0&&!striking&&!stunned){vel.y=MV.JUMP+(sp>6?MV.JUMP_RUN:0);onGround=false;FG.coyote=0;FG.jumpBuf=0;FG.jumped=true;FG.airT=0;
  if(!playT(P,'JumpStart',.32))play(P,'Jump',true);actT=.16;}
 if(FG.jumped&&!keys.Space&&vel.y>2){vel.y*=MV.CUT;FG.jumped=false;}   // short hop when Space / A is released early
 if(!onGround)FG.airT+=dt;
}
function footLand(vy){FG.jumped=false;if(vy<-14&&FG.il>.3){playT(P,'Roll',.5);actT=.4;toast('Roll landing');}else if(FG.airT>.35){playT(P,'JumpLand',.32);actT=.14;}FG.airT=0;}
function tryClimb(h,wish){if(FG.climb||FG.dodge)return;const pp=P.o.position,top=h.b.max.y,up=top-pp.y;if(up<.35||up>2.3)return;
 if(wish.dot(h.n)>-.4)return;FG.climb={t:0,from:pp.clone(),to:pp.clone().addScaledVector(h.n,-.7).setY(top)};yaw=Math.atan2(-h.n.x,-h.n.z);
 if(!playT(P,'Climb',MV.CLIMB_T))play(P,'Jump',true);actT=MV.CLIMB_T;plog('discoveries','Ledge climb (physical route, no teleport)');}
function faceYaw(dt,hs,y){if(st.swing)return y;const onFoot=!st.board&&!st.flying&&!st.wall;
 if(onFoot&&(FG.dodge||FG.climb))return y;
 if(onFoot&&FG.lock&&FG.target&&(FG.act||hs<4.8||blocking)){const v=toTarget();return y+angDiff(y,Math.atan2(v.x,v.z))*Math.min(1,dt*14);}
 if(hs>.3){const t=Math.atan2(vel.x,vel.z);if(onFoot&&onGround)return y+THREE.MathUtils.clamp(angDiff(y,t),-MV.TURN*dt,MV.TURN*dt);return t;}return y;}
function footAnim(hs){if(FG.climb||FG.dodge||FG.stun>0)return;
 if(!onGround){plA('FootAir','Jump');return;}
 if(blocking){plA('Guard','Standing');return;}
 if(keys.Numpad5||keys.KeyK){plA('Charge','Idle');return;}
 let n='Idle',ref=0;if(hs>6.2){n='Running';ref=MV.SPRINT;}else if(hs>2.4){n=P.acts.Jog?'Jog':'Running';ref=MV.JOG;}else if(hs>.35){n='Walking';ref=MV.WALK;}
 plA(n,'Idle');if(ref&&P.cur)P.cur.setEffectiveTimeScale(THREE.MathUtils.clamp(hs/ref,.65,1.4));else if(P.cur&&P.cur.loop!==THREE.LoopOnce)P.cur.setEffectiveTimeScale(1);}
// ---------- FIGHT: Metal ----------
function fightTick(dt){initFoes();
 const k=fightInput();blocking=(keys.Numpad2||keys.Comma)&&!st.board&&FG.stun<=0&&!FG.act;
 if(blocking&&!FG.gHeld)FG.guardT=0;FG.gHeld=blocking;FG.guardT+=dt;FG.lastT+=dt;FG.comboT+=dt;
 if(keys.Numpad5||keys.KeyK){st.charge=Math.min(1,st.charge+dt*.35);setViolet(.6);FG.auraT-=dt;if(FG.auraT<=0){FG.auraT=.035;
  const p=P.o.position;burst(_fv2.set(p.x+(Math.random()-.5)*.7,p.y+.2+Math.random()*1.5,p.z+(Math.random()-.5)*.7),1,.6,1.6+st.charge*2);}}
 const act=activeFoes();FG.inFight=act.length>0;let best=null,bd=12;for(const f of act){const d=toFoe(f).length();if(d<bd){bd=d;best=f;}}
 FG.target=best;FG.lock=!!(best&&!st.board&&!st.flying&&!st.swing);
 if(FG.act)tickStrike(dt);
 if(FG.bufT>0)FG.bufT-=dt;else FG.buf=null;
 if(k)fightKey(k);
 for(const f of FOES)foeTick(f,dt);crewTick(dt);sparksTick(dt);
 const t=FG.target;if(t){const fn=$('foeName');if(fn)fn.textContent=t.R.label+' · Lv '+(t.R.level||1)+(t.R.kind==='crew'?' · '+t.R.crew.members.filter(m=>!m.R.out).length+' left':'');}
 const me=$('mMe');if(me)me.style.width=(st.hp*100)+'%';
 const cb=$('fgCombo');if(cb){const on=FG.combo>=2&&FG.comboT<1.2;cb.style.opacity=on?1:0;if(on)cb.textContent=FG.combo+' HIT';}
}
function fightKey(k){
 if(k==='Numpad8'){st.form=st.form%4+1;toast('Season form '+st.form+' (placeholder stats)');plog('discoveries','Seasonal form switching (free roam)');return;}
 if(k==='Numpad2'||k==='Numpad5')return;
 if(st.board||st.flying||st.swing||FG.stun>0||FG.dodge||FG.climb)return;
 if(FG.act){FG.buf=k;FG.bufT=.35;return;}
 startStrike(k);}
function startStrike(k){
 let id=null;
 if(k==='Numpad4')id=((FG.lastS==='cross'||(FG.lastS==='jab'&&FG.chain>=2))&&FG.lastT<.55)?'hook':'jab';
 else if(k==='Numpad6')id='cross';else if(k==='Numpad1')id='kickL';else if(k==='Numpad3')id='kickR';else if(k==='Numpad9')id='dash';
 else if(k==='Numpad7'){const pulse=!!(keys.ShiftLeft||keys.ShiftRight);const cost=pulse?.4:.2;if(st.charge<cost){toast('Need '+Math.round(cost*100)+'% charge — hold 5');return;}if(pulse&&!onGround){toast('Gallium Pulse needs grounded contact');return;}st.charge-=cost;id='blast';if(pulse)FG.pulseQueued=true;}
 if(!id)return;const s=STRK[id];
 FG.chain=FG.lastT<.55?FG.chain+1:1;if(id==='hook')FG.chain=0;
 let amt=0;if(id!=='blast'&&st.charge>.25){amt=st.charge;st.charge=0;}
 if(FG.lock){const v=toTarget();yaw=Math.atan2(v.x,v.z);P.o.rotation.y=yaw;}
 FG.act={id,s,t:0,hits:new Set(),amt,fired:false};
 const visualClip=yard&&P.p6?fightClipHint(id):null;
 if(!(visualClip&&P.acts[visualClip]&&playT(P,visualClip,s.end))&&!playT(P,s.a,s.end))play(P,'Punch',true);
 actT=s.end;setViolet(1);
 beep(id==='blast'?120:200+Math.random()*90,.05,'sawtooth',.04);}
function tickStrike(dt){const a=FG.act,s=a.s;a.t+=dt;const pp=P.o.position,f=_fv3.set(Math.sin(yaw),0,Math.cos(yaw));
 if(a.t<s.t0&&s.step)pp.addScaledVector(f,s.step/s.t0*dt);
 if(s.lunge&&a.t<s.t1)pp.addScaledVector(f,s.lunge*(1+a.amt)*dt);
 if(a.id==='blast'&&!a.fired&&a.t>=s.t0){a.fired=true;if(FG.pulseQueued){FG.pulseQueued=false;firePulse();}else fireBlast();}
 if(a.id!=='blast'&&a.t>=s.t0&&a.t<=s.t1+.02)for(const foe of activeFoes()){if(a.hits.has(foe))continue;const v=toFoe(foe),d=v.length();
  if(d<s.r+.35&&Math.abs(angDiff(yaw,Math.atan2(v.x,v.z)))<1.3){a.hits.add(foe);hitFoe(foe,s,a.amt,v.clone().normalize());}}
 if(FG.buf&&a.t>=s.t1){const b=FG.buf;FG.buf=null;FG.lastS=a.id;FG.lastT=0;FG.act=null;startStrike(b);return;}
 if(a.t>=s.end){if(a.id!=='blast'&&a.hits.size===0&&FG.inFight){const target=FG.target;if(target){const distance=toFoe(target).length();toast(distance>s.r+.35?'OUT OF RANGE · move closer':'MISSED · face your opponent');}}FG.lastS=a.id;FG.lastT=0;FG.act=null;}}
// PROPOSAL combat variant: grounded Gallium Pulse (Shift + 7).
// Uses the same nonlethal stance system, with radial falloff and a visible recovery cost.
function firePulse(){if(!onGround){toast('Pulse aborted: no ground contact');return;}
 const origin=P.o.position.clone();const radius=4.2;let hits=0;
 for(const foe of activeFoes()){const delta=foe.ch.o.position.clone().sub(origin).setY(0),d=delta.length();
  if(d>radius||d<.01)continue;const falloff=Math.max(.25,1-d/radius);
  hitFoe(foe,{...STRK.blast,dmg:STRK.blast.dmg*falloff,kb:STRK.blast.kb*falloff},0,delta.normalize());hits++;}
 burst(origin.clone().add(new THREE.Vector3(0,.35,0)),38,5);FG.stun=Math.max(FG.stun,.18);FG.shake=Math.max(FG.shake,.2);
 toast(hits?'GALLIUM PULSE · '+hits+' contact'+(hits===1?'':'s'):'GALLIUM PULSE · no contact');
}
// blast: a slug of Galaxy Gallium (gunmetal), not a beam
const blasts=[];function fireBlast(){const m=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),new THREE.MeshStandardMaterial({color:0x9aa1ad,metalness:1,roughness:.18,emissive:0xd8deff,emissiveIntensity:.35}));
 const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));m.position.copy(P.o.position).add(new THREE.Vector3(0,1.35,0)).addScaledVector(f,.7);scene.add(m);blasts.push({m,v:f.multiplyScalar(22),t:0});}
function blastTick(dt){for(let i=blasts.length-1;i>=0;i--){const b=blasts[i];b.t+=dt;b.m.position.addScaledVector(b.v,dt);
 let hit=false;for(const foe of activeFoes()){const c=_fv2.copy(foe.ch.o.position);c.y+=1.2;if(b.m.position.distanceTo(c)<.85){hit=true;hitFoe(foe,STRK.blast,0,b.v.clone().setY(0).normalize());break;}}
 if(hit||b.t>.7){scene.remove(b.m);b.m.geometry.dispose();blasts.splice(i,1);if(hit)burst(b.m.position,18,4);}}}
function hitFoe(foe,s,amt,dir){const R=foe.R,ch=foe.ch;if(R.inv>0||R.out)return;
 const c=_fv2.copy(ch.o.position);c.y+=1.25;const face=Math.abs(angDiff(ch.o.rotation.y,Math.atan2(-dir.x,-dir.z)))<1.2;
 const brk=amt>.5;
 if(R.guard&&face&&!brk){R.stance=Math.max(0,R.stance-s.dmg*.2);R.kb.addScaledVector(dir,s.kb*.6);burst(c,6,2.5);FG.hitstop=.045;beep(90,.05,'square',.04);toast('Blocked');return;}
 let mult=1+1.5*amt;if(R.act&&R.act.t<R.act.s.t0){mult*=1.5;toast('COUNTER');}
 if(R.guard&&brk)toast('GUARD BREAK');
 R.stance=Math.max(0,R.stance-s.dmg*mult);R.kb.addScaledVector(dir,s.kb*(1+amt)*1.6);R.act=null;R.queue=[];
 FG.combo=FG.comboT<1.2?FG.combo+1:1;FG.comboT=0;FG.hits++;
 const heavy=s.down||amt>.4;FG.hitstop=heavy?.11:.065;FG.shake=heavy?.28:.12;burst(c,heavy?26:14,heavy?6:4);setViolet(1);beep(heavy?70:110,.07,'square',.06);
 if(R.stance<=0){if(R.kind==='rival'){R.sm&&R.sm.changeTo('down');endSpar(true);}else{R.out=true;R.active=false;R.act=null;R.sm=null;if(ch.body)ch.body.emissiveIntensity=0;playT(ch,'Knock',.7);toast('Tapped out');}return;}
 ensureAI(foe);if(s.down||(R.guard&&brk)){R.sm.changeTo('down');}else{R.stun=s.stun;playT(ch,s.react,s.stun+.12);R.animLock=s.stun;R.sm.changeTo('stagger');}}
function hitMetal(s,foe){const R=foe.R,v=toFoe(foe);const dir=v.clone().normalize().multiplyScalar(-1); // from the opponent toward Metal
 if(FG.iframe>0){if(FG.dodge&&FG.perfectArm!==R.act){FG.perfectArm=R.act;FG.slow=.45;FG.perfect++;toast('PERFECT DODGE');}return;}
 const facing=Math.abs(angDiff(yaw,Math.atan2(v.x,v.z)))<1.3;
 if(blocking&&facing){if(FG.guardT<.18){FG.parries++;toast('PARRY');FG.hitstop=.12;FG.slow=.3;R.stun=.9;R.act=null;R.queue=[];playT(foe.ch,'GuardBreak',.9);R.animLock=.9;R.sm.changeTo('stagger');
   burst(_fv2.copy(P.o.position).setY(P.o.position.y+1.3).addScaledVector(dir,-.5),20,5);beep(880,.08,'triangle',.06);return;}
  st.hp=Math.max(.02,st.hp-s.dmg*.15);FG.kb.addScaledVector(dir,s.kb*.8);FG.hitstop=.04;burst(_fv2.copy(P.o.position).setY(P.o.position.y+1.3),6,2.5);beep(95,.05,'square',.04);return;}
 st.hp=Math.max(0,st.hp-s.dmg);FG.act=null;FG.buf=null;FG.kb.addScaledVector(dir,s.kb*1.8);FG.shake=.22;FG.hitstop=.07;
 burst(_fv2.copy(P.o.position).setY(P.o.position.y+1.3),14,4);beep(60,.08,'square',.06);
 if(s.down){FG.stun=1.6;if(playT(P,'Knock',.7)){setTimeout(()=>{if(FG.stun>0)playT(P,'GetUp',.9);},700);}actT=1.6;}else{FG.stun=s.stun;playT(P,s.react,s.stun+.1);actT=s.stun;}
 if(st.hp<=0){st.hp=1;if(R.kind==='rival')endSpar(false);else endCrew(R.crew,false);}}
// ---------- FIGHT: opponent brains (Yuka Vehicle + ArriveBehavior + StateMachine), attack tokens so crews take turns ----------
class AIState extends YUKA.State{constructor(o){super();Object.assign(this,o);}enter(R){R.stT=0;this.on&&this.on(R);}execute(R){R.stT+=R.dt;this.run(R);}exit(R){this.off&&this.off(R);}}
function goTo(R,x,z,cap){R.arrive.target.set(x,0,z);R.speedCap=cap;}
function lvl(R){return R.level||1;}
function attackers(){let n=0;for(const f of activeFoes())if(f.R.act||(f.R.sm&&f.R.state==='attack'))n++;return n;}
function maxAttackers(){return activeFoes().length>=3?2:1;}
const AI={
 approach:{run(R){const m=P.o.position;goTo(R,m.x-R.dir.x*2.0,m.z-R.dir.z*2.0,3.2+.25*lvl(R));if(R.d<2.7)R.sm.changeTo('circle');}},
 circle:{on(R){R.state='circle';R.side=Math.random()<.5?-1:1;R.dur=.45+Math.random()*Math.max(.3,1.2-.12*lvl(R));R.ring=R.kind==='crew'&&attackers()>=maxAttackers()?3.3:2.35;},
  run(R){const m=P.o.position,a=Math.atan2(-R.dir.x,-R.dir.z)+R.side*.85*R.stT;goTo(R,m.x+Math.sin(a)*R.ring,m.z+Math.cos(a)*R.ring,2.2);
   if(FG.act&&FG.act.t<FG.act.s.t0+.04&&R.d<2.9&&R.reactedTo!==FG.act){R.reactedTo=FG.act;if(Math.random()<Math.min(.7,.18+.1*lvl(R))){R.sm.changeTo(Math.random()<.55?'guard':'evade');return;}}
   if(R.d>R.ring+1.4){R.sm.changeTo('approach');return;}
   if(R.stT>R.dur){if(attackers()<maxAttackers()&&Math.random()<.45+.08*lvl(R))R.sm.changeTo('attack');else R.sm.changeTo('circle');}}},
 attack:{on(R){R.state='attack';const L=lvl(R);const pool=R.style==='heavy'||R.style==='boss'?[['kickR'],['dash'],['cross','kickL']]:R.style==='evasive'?[['jab','cross'],['dash'],['kickL']]:R.style==='counter'?[['cross','jab'],['hook'],['kickR']]:[['jab'],['jab','cross'],['kickR'],['cross','kickL']];if(L>=2)pool.push(['jab','jab','hook']);if(L>=3)pool.push(['dash']);
   R.queue=pool[Math.floor(Math.random()*pool.length)].slice();foeStrike(R,R.queue.shift(),Math.max(.08,.3-.04*L));},
  run(R){const m=P.o.position;goTo(R,m.x-R.dir.x*1.4,m.z-R.dir.z*1.4,.9);
   if(!R.act){if(R.queue.length&&R.d<3.1)foeStrike(R,R.queue.shift(),.06);else R.sm.changeTo(Math.random()<.3?'retreat':'circle');}},off(R){R.state='';}},
 guard:{on(R){R.guard=true;play(R.ch,'Guard');R.animLock=0;R.dur=.45+Math.random()*.5;},run(R){goTo(R,R.ch.o.position.x,R.ch.o.position.z,.5);if(R.stT>R.dur)R.sm.changeTo(Math.random()<.45&&attackers()<maxAttackers()?'attack':'circle');},off(R){R.guard=false;}},
 evade:{on(R){R.inv=.35;R.kb.copy(R.dir).multiplyScalar(-7.5);R.noFace=true;R.ch.o.rotation.y=Math.atan2(-R.dir.x,-R.dir.z);playT(R.ch,'Roll',.55);R.animLock=.55;},
  run(R){goTo(R,R.ch.o.position.x,R.ch.o.position.z,.2);if(R.stT>.55)R.sm.changeTo('circle');},off(R){R.noFace=false;}},
 stagger:{run(R){goTo(R,R.ch.o.position.x,R.ch.o.position.z,.2);if(R.stun<=0)R.sm.changeTo(R.stance<.3?'retreat':'circle');}},
 down:{on(R){R.inv=99;R.act=null;R.queue=[];R.guard=false;playT(R.ch,'Knock',.7);R.animLock=1.0;R.phase=0;},
  run(R){goTo(R,R.ch.o.position.x,R.ch.o.position.z,.1);if(R.phase===0&&R.stT>1.0){R.phase=1;playT(R.ch,'GetUp',1.3);R.animLock=1.3;}if(R.phase===1&&R.stT>2.3)R.sm.changeTo('circle');},off(R){R.inv=.3;}},
 retreat:{run(R){const m=P.o.position;goTo(R,m.x-R.dir.x*4.6,m.z-R.dir.z*4.6,3);if(R.stT>1.3)R.sm.changeTo('approach');}}};
function ensureAI(foe){const R=foe.R;if(R.sm)return;R.ch=foe.ch;R.agent=new YUKA.Vehicle();R.agent.position.set(foe.ch.o.position.x,0,foe.ch.o.position.z);R.agent.maxSpeed=3.4;R.agent.updateOrientation=false;
 R.arrive=new YUKA.ArriveBehavior(new YUKA.Vector3(),1.4,.12);R.agent.steering.add(R.arrive);R.em=new YUKA.EntityManager();R.em.add(R.agent);
 R.kb=R.kb||new THREE.Vector3();R.sm=new YUKA.StateMachine(R);for(const [n,s] of Object.entries(AI))R.sm.add(n,new AIState(s));R.inv=0;R.stun=0;R.animLock=0;R.speedCap=3;R.dt=0;R.d=9;R.dir=new THREE.Vector3(1,0,0);R.state='';R.sm.changeTo('approach');}
function foeStrike(R,id,tele){const s=STRK[id];R.act={id,s,t:-tele,hit:false};playT(R.ch,s.a,s.end+tele);R.animLock=s.end+tele;}
function foeTick(foe,dt){const R=foe.R,ch=foe.ch;
 if(!R.active){if(ch.body)ch.body.emissiveIntensity=0;return;}
 ensureAI(foe);R.dt=dt;R.inv-=dt;if(R.stun>0)R.stun-=dt;
 const rp=ch.o.position,mp=P.o.position;R.agent.position.set(rp.x,0,rp.z);
 R.dir.set(mp.x-rp.x,0,mp.z-rp.z);R.d=R.dir.length();R.dir.normalize();
 R.sm.update();if(!R.active||!R.sm)return;
 if(R.act){const a=R.act,s=a.s;a.t+=dt;if(a.t>0&&a.t<s.t0&&s.step)R.kb.addScaledVector(R.dir,s.step*6*dt);if(s.lunge&&a.t>0&&a.t<s.t1)rp.addScaledVector(R.dir,s.lunge*.8*dt);
  if(!a.hit&&a.t>=s.t0&&a.t<=s.t1+.02&&R.d<s.r+.3&&Math.abs(angDiff(ch.o.rotation.y,Math.atan2(R.dir.x,R.dir.z)))<1.2){a.hit=true;hitMetal(s,foe);}
  if(R.act&&a.t>=s.end)R.act=null;}
 if(!R.sm)return;
 R.agent.maxSpeed=R.speedCap;R.em.update(dt);rp.x=R.agent.position.x;rp.z=R.agent.position.z;
 // crews keep a little personal space from each other
 if(R.kind==='crew')for(const o of R.crew.members){if(o===foe||o.R.out)continue;const dx=rp.x-o.ch.o.position.x,dz=rp.z-o.ch.o.position.z,dd=Math.hypot(dx,dz);if(dd<1.1&&dd>1e-3){rp.x+=dx/dd*(1.1-dd)*.5;rp.z+=dz/dd*(1.1-dd)*.5;}}
 if(R.kb.lengthSq()>.0004){rp.addScaledVector(R.kb,dt);R.kb.multiplyScalar(Math.exp(-6*dt));}
 if(!R.noFace){const want=Math.atan2(R.dir.x,R.dir.z);ch.o.rotation.y+=angDiff(ch.o.rotation.y,want)*Math.min(1,dt*(R.act?6:10));}
 if(R.animLock>0)R.animLock-=dt;else if(!R.guard){const v=R.agent.velocity.length();play(ch,v>2.3?'Running':v>.35?'Walking':'Guard');}
 if(ch.body)ch.body.emissiveIntensity=R.act&&R.act.t<R.act.s.t0?.55:0;   // telegraph: the wind-up glows
 if(R.kind==='rival'){if(rp.distanceTo(fightC)>8.2)endSpar(true);   // ring-out
  else if(P.o.position.distanceTo(fightC)>9.5&&R.active){toast('Ring-out — you left the ring');endSpar(false);}}}
// ---------- GALLIUM SWING v2 (Metal swings on his board; the line is his Galaxy Gallium limb) ----------
// Mechanics after the Unity swing reference (springy line pulled to 80% of the shot length, FOV kick), retuned: no snap,
// hold-to-swing (tap still toggles), arc pumping, street clearance, release boost + flip, swing → wall ride chain.
const SW={REEL:.8,MIN_D:6,MAX_D:32,G:22,PUMP:5,AIR:8,MAX_V:26,CLEAR:1.5,COST:.03,REL_UP:6,REL_FWD:3,FLIP_T:.55,SPRING:28};
const SWS={q:new THREE.Quaternion(),blend:0,flip:0,air:0,swings:0,flips:0};
const _sw1=new THREE.Vector3(),_sw2=new THREE.Vector3(),_sw3=new THREE.Vector3(),_swm=new THREE.Matrix4(),_swq=new THREE.Quaternion(),_swq2=new THREE.Quaternion();
let swingAnchors=null;
function buildSwingAnchors(){swingAnchors=anchors.slice();for(const b of colliders){if(b.max.y<6)continue;const y=b.max.y;
 for(let x=b.min.x;x<=b.max.x;x+=5)swingAnchors.push(new THREE.Vector3(x,y,b.min.z),new THREE.Vector3(x,y,b.max.z));
 for(let z=b.min.z;z<=b.max.z;z+=5)swingAnchors.push(new THREE.Vector3(b.min.x,y,z),new THREE.Vector3(b.max.x,y,z));}}
function pickAnchor(pp){if(!swingAnchors)buildSwingAnchors();const hv=_sw1.set(vel.x,0,vel.z);const dir=hv.length()>3?hv.normalize():_sw1.set(-Math.sin(camYaw),0,-Math.cos(camYaw));
 let a=null,bs=-1e9;for(const an of swingAnchors){const vx=an.x-pp.x,vy=an.y-pp.y,vz=an.z-pp.z;const hl=Math.hypot(vx,vz);const d=Math.hypot(hl,vy);
  if(d<SW.MIN_D||d>SW.MAX_D||vy<2.5||hl<1)continue;const ahead=(vx*dir.x+vz*dir.z)/hl;if(ahead<.15)continue;
  const sc=ahead*6-Math.abs(Math.atan2(vy,hl)-.85)*4-Math.abs(d-17)*.25;if(sc>bs){bs=sc;a=an;}}
 if(!a)for(const an of swingAnchors){const d=an.distanceTo(pp);if(d<SW.MIN_D||d>SW.MAX_D||an.y-pp.y<2.5)continue;const sc=-Math.abs(d-15);if(sc>bs){bs=sc;a=an;}} /* nothing ahead: best line in any direction */
 return a;}
function startSwing(pp){const a=pickAnchor(pp);if(!a||st.gal<=.04){toast(st.gal<=.04?'Out of Gallium — bank combos to refill':'No anchor in range');return;}
 // Swing stays anchored to real surfaces; no carried skateboard.
 if(forgeController?.busy){toast('Finish the Galaxy Gallium forge before swinging');return;}
 const d=a.distanceTo(pp);st.swing={a:a.clone(),len:d*SW.REEL,len0:d,spent:0,t:0,held:!!keys.KeyQ};SWS.q.copy(P.o.quaternion);SWS.flip=0;SWS.swings++;
 play(P,'Swing');tether.visible=true;onGround=false;vel.y=Math.max(vel.y,4);plog('discoveries','Grapple swing');setViolet(1);beep(330,.1,'triangle');}
function releaseSwing(why,landed){const s=st.swing;if(!s)return;st.gal=Math.min(1,st.gal+s.spent*.5);st.swing=null;tether.visible=false;st.comboPend++;
 const hs=Math.hypot(vel.x,vel.z);if(hs>.5)yaw=Math.atan2(vel.x,vel.z);SWS.blend=.35;SWS.air=3;
 if(!landed&&why!=='wall'&&why!=='gallium'){vel.y=Math.max(vel.y,0)+SW.REL_UP*(why==='jump'?1:.6);if(hs>1){_sw1.set(vel.x,0,vel.z).normalize();vel.addScaledVector(_sw1,SW.REL_FWD);}
  if(Math.hypot(vel.x,vel.z)>10){SWS.flip=SW.FLIP_T;SWS.flips++;st.comboPend++;toast('Gallium flip');}}
 if(landed)bank();}
function swingStep(dt,wish,pp){const s=st.swing;s.t+=dt;
 const cost=dt*SW.COST;s.spent+=cost;st.gal=Math.max(0,st.gal-cost);if(st.gal<=0){releaseSwing('gallium');toast('Out of Gallium');return;}
 if(s.held&&!keys.KeyQ){if(s.t<.25)s.held=false;else{releaseSwing('let go');return;}}   // hold to swing, let go to fly
 if(tap('Space')){releaseSwing('jump');return;}
 if(s.a.y-s.len<groundY+SW.CLEAR)s.len=Math.max(3,s.a.y-groundY-SW.CLEAR);   // the line shortens so the arc clears the street
 vel.y-=SW.G*dt;
 const r=_sw1.copy(pp).sub(s.a);let dist=r.length();const rn=_sw2.copy(r).divideScalar(dist||1);
 const tang=_sw3.copy(wish).addScaledVector(rn,-wish.dot(rn));vel.addScaledVector(tang,SW.AIR*dt);
 const vl=vel.length();if(vl>1){const al=vel.clone().divideScalar(vl);const pin=Math.max(0,wish.dot(al));vel.addScaledVector(al,SW.PUMP*pin*dt*(al.y<0?1.4:.6));}
 if(vel.length()>SW.MAX_V)vel.setLength(SW.MAX_V);
 pp.addScaledVector(vel,dt);
 r.copy(pp).sub(s.a);dist=r.length();rn.copy(r).divideScalar(dist||1);
 if(dist>s.len){const ex=dist-s.len;const vr=vel.dot(rn);if(vr>0)vel.addScaledVector(rn,-vr);vel.addScaledVector(rn,-ex*SW.SPRING*dt);pp.addScaledVector(rn,-Math.min(ex,ex*12*dt));}
 if(pp.y<groundY){pp.y=groundY;if(vel.y<0)vel.y=0;releaseSwing('landed',true);onGround=true;return;}
 if(pp.y>s.a.y-.4&&vel.y>0&&s.t>.4){releaseSwing('apex');return;}   // over the top of the arc: let go with a flourish
 setViolet(1);st.ori=Math.min(1,st.ori+dt*.2);}
// body follows the line: up = toward the anchor, forward = along the arc; board stays locked under his shoes
function swingOrient(dt){const pp=P.o.position;if(SWS.air>0)SWS.air-=dt;
 if(st.swing){const up=_sw1.copy(st.swing.a).sub(pp).normalize();const fw=_sw2.copy(vel);fw.addScaledVector(up,-fw.dot(up));if(fw.lengthSq()<.01)fw.set(Math.sin(yaw),0,Math.cos(yaw)).addScaledVector(up,-up.dot(fw));fw.normalize();
  const x=_sw3.crossVectors(up,fw).normalize();fw.crossVectors(x,up);_swm.makeBasis(x,up,fw);_swq.setFromRotationMatrix(_swm);SWS.q.slerp(_swq,Math.min(1,dt*9));P.o.quaternion.copy(SWS.q);return;}
 if(SWS.blend>0){SWS.blend-=dt;_swq2.copy(P.o.quaternion);SWS.q.slerp(_swq2,Math.min(1,dt*8));P.o.quaternion.copy(SWS.q);}else SWS.q.copy(P.o.quaternion);
 if(SWS.flip>0){SWS.flip-=dt;if(onGround)SWS.flip=0;const a=Math.PI*2*(1-Math.max(0,SWS.flip)/SW.FLIP_T);P.o.quaternion.multiply(_swq.setFromAxisAngle(_sw1.set(1,0,0),-a));}}  // backflip on release
function swingTilted(){return !!(st.swing||SWS.flip>0||SWS.blend>0);}
// Forge-only board: NEVER mounted to Metal's back or chest.
// Board Forge is now the normal B action. Reversible emergency fallback: ?gal_forge=0.
// Explicit opt-out retains the old instant-board toggle without displaying a carried board.
const GAL_FORGE_ENABLED=new URLSearchParams(location.search).get('gal_forge')!=='0';
let forgeController=null;
const forgePerformance=new ForgePerformanceOverlay();
// Accessible compact Forge progress status. Read-only; cannot advance missions.
const forgeHud=$('forgeHud'),forgeStage=$('forgeStage'),forgeTrack=$('forgeTrack'),forgeFill=$('forgeFill');
let lastForgePercent=-1;
function updateForgeHud(){
 const d=forgeDisplay(forgeController?.state);forgeHud.hidden=!d.visible;
 if(!d.visible){lastForgePercent=-1;return;}
 if(forgeStage.textContent!==d.label)forgeStage.textContent=d.label;
 if(lastForgePercent!==d.percent){
  forgeFill.style.width=d.percent+'%';forgeTrack.setAttribute('aria-valuenow',String(d.percent));
  lastForgePercent=d.percent;
 }
}


// ---------- main loop ----------
const clock=new THREE.Clock();let camPos=new THREE.Vector3();
// Morrow prototype encounter: visual pursuit and timed ReFramer counter.
// PUBLISH HOLD: training encounter only; no story canon or police behavior implied.
const physicsTelemetry=new PhysicsTelemetry();let physicsTime=0;
// Morrow prototype encounter: visual pursuit and timed ReFramer counter.
// PUBLISH HOLD: training encounter only; no story canon or police behavior implied.

const crownCharge=createCharge();let chargeLeftPrev=false,chargeRightPrev=false,chargeChordPrev=false;
const crownOrbits=[];const crownStreams=[];let crownPanel=null,crownStructureBase=null;
function initCrownVisual(){if(crownOrbits.length)return;const mat=new THREE.MeshStandardMaterial({color:0xcbb5ff,emissive:0x873cff,emissiveIntensity:2,metalness:.75});for(let i=0;i<18;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.09+(i%3)*.035,6,6),mat);scene.add(m);crownOrbits.push(m);}for(let i=0;i<24;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.055,5,5),new THREE.MeshStandardMaterial({color:0xc2c7df,emissive:0x8145cf,emissiveIntensity:1.4,metalness:1}));scene.add(p);crownStreams.push(p);}crownPanel=document.createElement('div');crownPanel.style.cssText='position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:19;pointer-events:none;text-align:center;background:#120e20d9;color:#e7d9ff;border:1px solid #8f64d0;border-radius:8px;padding:7px 12px;font:12px/1.5 system-ui;display:none';document.body.append(crownPanel);}
function crownMetalSupply(){if(!P)return 0;let total=0;for(const b of colliders){const x=(b.min.x+b.max.x)*.5,z=(b.min.z+b.max.z)*.5;if(Math.hypot(x-P.o.position.x,z-P.o.position.z)<48)total+=.12;}for(const car of cars){if(car.position.distanceTo(P.o.position)<25)total+=.22;}return Math.min(4,total);}
function updateCrownCharge(dt,gp){initCrownVisual();const lt=!!(gp?.buttons?.[6]?.pressed||gp?.buttons?.[6]?.value>.35),rt=!!(gp?.buttons?.[7]?.pressed||gp?.buttons?.[7]?.value>.35),chord=lt&&rt;const left=false,right=false;const events=stepCharge(crownCharge,dt,{charging:chord,left:chord&&left&&!chargeLeftPrev,right:chord&&right&&!chargeRightPrev,metalNearby:crownMetalSupply()});chargeLeftPrev=left;chargeRightPrev=right;chargeChordPrev=chord;
 if(chord&&crownCharge.time<.07)toast('KODA · CHARGING · DRAWING NEARBY METAL');
 for(const e of events)if(e==='STRUCTURES RESTORED'||e==='CROWN OVERLOAD · FIVE STAR RESPONSE')toast('KODA · '+e);
 const show=crownCharge.active||crownCharge.metal>.03;
 crownPanel.style.display=show?'block':'none';if(show){const c=crownCharge;const instruction=c.emergency?'KODA: STRUCTURES FAILING · METAL RETURNING':c.unstable?'KODA: CROWN UNSTABLE · REINFORCEMENTS INBOUND':c.balance<-.35?'KODA: STRUCTURAL LOAD HIGH':c.balance>.35?'KODA: CROWN LOAD HIGH':'KODA: METAL FLOW STABILIZING';crownPanel.textContent=instruction+' | METAL '+c.metal.toFixed(1)+' | BALANCE '+c.balance.toFixed(2)+' | STRESS '+Math.round(c.stress*100)+'%';}
 for(let i=0;i<crownOrbits.length;i++){const m=crownOrbits[i];m.visible=show;if(!show)continue;const t=crownCharge.time*(2+crownCharge.stage)+i*2.399963;const rad=1.1+(i%4)*.22+crownCharge.metal*.12;const theta=i*Math.PI/9;m.position.set(P.o.position.x+Math.cos(t)*rad*Math.cos(theta),P.o.position.y+1.5+Math.sin(t)*rad,P.o.position.z+Math.cos(t)*rad*Math.sin(theta));m.scale.setScalar(.7+crownCharge.metal*.15);}
 for(let i=0;i<crownStreams.length;i++){const m=crownStreams[i];m.visible=show&&crownCharge.active;if(!m.visible)continue;const a=i*2.399963,rad=8+(i%5)*3;const source=new THREE.Vector3(P.o.position.x+Math.cos(a)*rad,P.o.position.y+1+(i%4)*2,P.o.position.z+Math.sin(a)*rad);const t=(crownCharge.time*(.7+crownCharge.stage*.3)+i*.137)%1;m.position.lerpVectors(source,P.o.position.clone().add(new THREE.Vector3(0,1.3,0)),t);m.scale.setScalar(.6+t*2);} 
 if(P?.o){P.o.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive&&o.userData.crownTint){o.material.emissiveIntensity=show?Math.min(1,crownCharge.metal*.2):0;}});}
 if(crownCharge.emergency&&crownCharge.metal===0){crownCharge.unstable=false;}
}

const morrow=createEncounter();let morrowClock=0,morrowStatus='';
const metalStory=readMetalCheckpoint(safeStorage);
let metalStoryReady=false,metalStoryClock=0,metalStoryMessage='';
function saveMetalStory(reason='manual'){
 if(SLOTTA_BROWSER_QA||!P||!metalStoryReady)return false;
 const ok=writeMetalCheckpoint(safeStorage,metalStory,P.o.position,reason);
 toast(ok?'CHECKPOINT SAVED · '+metalStoryChapter(metalStory).title:'SAVE UNAVAILABLE · storage blocked');
 return ok;
}
function updateMetalStory(dt){
 if(!P||!metalStoryReady)return;
 metalStoryClock+=dt;if(metalStoryClock<.35)return;metalStoryClock=0;
 const p=P.o.position;
 const skate=SPOTS.skate.c,home=SPOTS.home.c;
 const near=(v,r)=>v&&Math.hypot(p.x-v.x,p.z-v.z)<r;
 let event=null,reason='';
 if(metalStory.chapter===0&&near(skate,15)){event='skate_reached';reason='Skatepark arrival';}
 else if(metalStory.chapter===1&&(slottaCombat.defeated||morrow.slotta.captured)){event='slotta_resolved';reason='SLOTTA encounter resolved';}
 else if(metalStory.chapter===2&&near(home,12)){event='home_returned';reason='Safehouse return';}
 if(event&&advanceMetalStory(metalStory,event)){saveMetalStory(reason);toast('STORY · '+metalStoryChapter(metalStory).title+' · '+metalStoryChapter(metalStory).objective);}
 if(morrow.panel)morrow.panel.dataset.story=metalStoryChapter(metalStory).title+' · '+metalStoryChapter(metalStory).objective;
}
function initMetalStory(){
 if(metalStory.checkpoint?.position){const q=metalStory.checkpoint.position;if([q.x,q.y,q.z].every(Number.isFinite)){P.o.position.set(q.x,q.y,q.z);vel.set(0,0,0);toast('CHECKPOINT RESTORED · '+metalStoryChapter(metalStory).title);}}
 metalStoryReady=true;
 const button=document.createElement('button');button.type='button';button.textContent='SAVE · METAL';button.title='Save Metal story checkpoint';
 Object.assign(button.style,{position:'fixed',bottom:'76px',right:'12px',zIndex:'9999',padding:'10px 13px',borderRadius:'10px',border:'1px solid #ad91ee',background:'#221b36',color:'#f5eaff',fontWeight:'bold',fontSize:'12px',opacity:'.86'});
 button.addEventListener('click',()=>saveMetalStory('manual'));document.body.append(button);
 document.addEventListener('keydown',e=>{if(e.code==='F9'){e.preventDefault();saveMetalStory('manual');}});
}


// R1 and L1 share the fluid-metal renderer, with entirely separate physics.
const galliumRibbons=[];let gripTarget=null,gripFollow=null,gripHeight=0,riftCooldown=0,riftPressTime=0;
let structureGrip=null;const riftMarks=[];
function clearGripVisual(){structureGrip=null;gripFollow=null;gripTarget=null;}
function showGalliumHand(target,height=0){
 clearGripVisual();if(!target)return;
 gripFollow=target;gripHeight=height;
 gripTarget={position:target.position.clone().add(new THREE.Vector3(0,height,0))};
}
function releaseGrip(){
 if(heldCar)releaseCar();
 if(heldCitizen){heldCitizen.o.position.y=groundY+.25;heldCitizen.wait=.4;heldCitizen.target=wp();heldCitizen=null;}
 if(heldActor){
  const a=heldActor;a.root.position.y=groundY;a.home.copy(a.root.position);
  Object.assign(a.body.position,{x:a.root.position.x,y:groundY,z:a.root.position.z});
  Object.assign(a.body.velocity,{x:0,y:0,z:0});a.body.state='standing';a.attackCooldown=1;if(a.kind==='slotta')startSlottaAction(slottaAnimator,'getUp',{force:true});heldActor=null;
 }
 clearGripVisual();
}
function leaveGalliumTrail(){/* Liquid Gallium extension and retraction are rendered by makeGalliumLimb. */}
function riffStep(){if(!P||riftCooldown>0)return;riftCooldown=.65;const dir=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw));const launch=36;vel.x+=dir.x*launch;vel.z+=dir.z*launch;vel.y=Math.max(vel.y,6);const pos=P.o.position.clone();const crater=new THREE.Mesh(new THREE.CylinderGeometry(1.4,.9,.14,12),new THREE.MeshStandardMaterial({color:0x342847,emissive:0x4a1e80,emissiveIntensity:.6}));crater.position.set(pos.x,groundY-.08,pos.z);scene.add(crater);riftMarks.push({mesh:crater,life:3.5});toast('RIFFT STEP · RIGHT FOOT');}
function updateGalliumPhysics(dt){
 for(let i=riftMarks.length-1;i>=0;i--){
  const mark=riftMarks[i];mark.life-=dt;
  if(mark.life<=0){scene.remove(mark.mesh);mark.mesh.geometry.dispose();mark.mesh.material.dispose();riftMarks.splice(i,1);}
 }
 if(structureGrip){
  const g=structureGrip,next=stepStructureOffset(g.offset,gripAxisX,gripAxisY,dt);
  if(next.x!==g.offset.x||next.y!==g.offset.y){
   g.offset=next;g.body.mesh.position.copy(g.base).add(new THREE.Vector3(next.x,next.y,0));
   syncGrippableStructure(g.body);g.marker.position.copy(g.point).add(new THREE.Vector3(next.x,next.y,0));
  }
 }
 if(heldCitizen){
  const n=heldCitizen;
  if(!n.o.parent)heldCitizen=null;
  else{const p=gripHeldPosition(P.o.position,camYaw,gripAxisX,gripAxisY,groundY);n.o.position.set(p.x,p.y,p.z);n.wait=.3;}
 }
 if(heldActor){
  const a=heldActor,p=gripHeldPosition(P.o.position,camYaw,gripAxisX,gripAxisY,groundY);
  a.root.position.set(p.x,p.y,p.z);a.home.copy(a.root.position);
  Object.assign(a.body.position,{x:p.x,y:p.y,z:p.z});
  Object.assign(a.body.velocity,{x:0,y:0,z:0});
 }
 if(gripFollow&&gripTarget){gripTarget.position.copy(gripFollow.position);gripTarget.position.y+=gripHeight;}
}
function galliumGrabWorld(){if(!P)return;
 const origin=P.o.position.clone().add(new THREE.Vector3(0,1.3,0));
 const direction=new THREE.Vector3(-Math.sin(camYaw+gripAxisX*.65),Math.max(-.6,Math.min(.6,-gripAxisY*.5)),-Math.cos(camYaw+gripAxisX*.65)).normalize();
 const ray=new THREE.Ray(origin,direction);const choices=[];
 for(const c of cars){if(c.userData.worldBody&&c.userData.worldBody.state!=='resting')continue;const v=c.position.clone().add(new THREE.Vector3(0,.7,0));const along=v.clone().sub(origin).dot(direction);if(along>0&&along<18){const miss=ray.distanceSqToPoint(v);choices.push({object:c,point:v,along,score:miss/(1+along*.02),type:'car'});}}
 for(const n of npcs){if(!n.o.visible)continue;const v=n.o.position.clone().add(new THREE.Vector3(0,.8,0)),along=v.clone().sub(origin).dot(direction);if(along>0)choices.push({object:n.o,point:v,along,score:ray.distanceSqToPoint(v)/(1+along*.02),type:'citizen'});}
 for(const a of factionActors){if(!a.root.visible)continue;const v=a.root.position.clone().add(new THREE.Vector3(0,1.2,0));const along=v.clone().sub(origin).dot(direction);if(along>0)choices.push({object:a.root,point:v,along,score:ray.distanceSqToPoint(v)/(1+along*.02),type:'actor'});}
 // Every registered solid building collider is an eligible Gallium anchor, not just cars.
 for(const b of colliders){const body=structureBodies.get(b);if(!body)continue;const hit=ray.intersectBox(b,new THREE.Vector3());if(hit){const along=hit.distanceTo(origin);if(along>0)choices.push({object:body.mesh,body,point:hit.clone(),along,score:0,type:'structure'});}}
 const chosen=chooseGripTarget(choices);
 if(!chosen){const far=origin.clone().addScaledVector(direction,42);leaveGalliumTrail(origin,far);toast('GALAXY GALLIUM · FREEFORM ANCHOR');return;}
 if(chosen.type==='structure'){
  const marker={position:chosen.point.clone()};showGalliumHand(marker);
  structureGrip={body:chosen.body,marker,point:chosen.point.clone(),base:chosen.body.mesh.position.clone(),offset:{x:0,y:0}};
  toast('GALAXY GALLIUM · REAL STRUCTURE HELD · RIGHT STICK TO MOVE');return;
 }
 showGalliumHand(chosen.object,chosen.type==='citizen'?.8:chosen.type==='actor'?1.2:.7);leaveGalliumTrail(origin,chosen.point);
 if(chosen.type==='car')grabCar(chosen.object);
 else if(chosen.type==='citizen'){heldCitizen=npcs.find(n=>n.o===chosen.object)||null;if(heldCitizen){heldCitizen.wait=1;toast('GALAXY GALLIUM · PERSON HELD · RIGHT STICK TO MOVE');}}
 else{const actor=factionActors.find(a=>a.root===chosen.object);if(actor){heldActor=actor;actor.attackCooldown=1;if(actor.kind==='slotta'){slottaPendingGame=null;slottaDash=null;startSlottaAction(slottaAnimator,'galliumHeld',{force:true});}toast('GALAXY GALLIUM · ENEMY HELD · RIGHT STICK TO MOVE');}}
}

const morrowMeshes=[];const factionActors=[];const metalBlasts=[];let combatBlastLatch=false;
// SLOTTA combat integrity: blast damage is independent of the existing tether/capture mission.
const slottaCombat={maxHealth:100,health:100,defeated:false,hitCooldown:0,impactWindow:0,impactCount:0};
function hitSlotta(damage){if(!morrow.slottaMesh||slottaCombat.defeated||morrow.slotta.captured||morrow.slotta.escaped||slottaPhase>0||slottaCombat.hitCooldown>0)return false;slottaCombat.health=Math.max(0,slottaCombat.health-damage*(slottaArmor>0?.5:1));slottaCombat.hitCooldown=.18;slottaPendingGame=null;slottaDash=null;
 if(slottaCombat.impactWindow<=0)slottaCombat.impactCount=0;
 slottaCombat.impactCount=Math.min(3,slottaCombat.impactCount+1);
 slottaCombat.impactWindow=2.2;
 const heavy=damage>=18||slottaCombat.impactCount>=3;
 slottaHitSpark(morrow.slottaMesh,heavy);
 if(slottaCombat.health<=0){slottaCombat.defeated=true;startSlottaAction(slottaAnimator,'knockdown',{force:true});morrow.slottaMesh.visible=false;toast('SLOTTA DEFEATED · PHATOM ENGINE DISABLED');}else{startSlottaAction(slottaAnimator,heavy?'hitHeavy':'hitLight',{force:true});toast('SLOTTA · '+Math.ceil(slottaCombat.health)+'% CORE');}return true;}

function fireMetalBlast(){if(!P||st.gal<.12)return;st.gal-=.12;const d=blastDirection(camYaw+Math.PI,Math.max(-.3,Math.min(.3,-camPitch*.35)));const p=P.o.position.clone().add(new THREE.Vector3(0,1.3,0));const ball=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),new THREE.MeshStandardMaterial({color:0xc5a3ff,emissive:0x873aff,emissiveIntensity:2,metalness:.9}));ball.position.copy(p);scene.add(ball);metalBlasts.push({mesh:ball,dir:new THREE.Vector3(d.x,d.y,d.z),life:1.3});toast('GALAXY GALLIUM · plasma-core discharge');}
function updateMetalBlasts(dt){for(let i=metalBlasts.length-1;i>=0;i--){const b=metalBlasts[i];b.life-=dt;b.mesh.position.addScaledVector(b.dir,dt*28);b.mesh.scale.setScalar(.65+Math.sin(b.life*25)*.18);if(morrow.slottaMesh&&!slottaCombat.defeated&&morrow.slottaMesh.visible&&b.mesh.position.distanceTo(morrow.slottaMesh.position.clone().add(new THREE.Vector3(0,1.2,0)))<2){if(hitSlotta(12))b.life=0;}if(b.life>0)for(const a of factionActors){if(a.root===morrow.slottaMesh||!a.root.visible)continue;if(b.mesh.position.distanceTo(a.root.position.clone().add(new THREE.Vector3(0,1.2,0)))<2){if(!a.body)a.body=createCombatBody({x:a.root.position.x,y:a.root.position.y,z:a.root.position.z});applyCombatHit(a.body,{direction:b.dir,impulse:520,vertical:160});b.life=0;break;}}if(b.life<=0){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();metalBlasts.splice(i,1);}}}

function factionActor(label,color,x,z,kind){
 const root=kind==='slotta'?createSlottaBossAsset():new THREE.Group();root.name=label;
 if(kind!=='slotta'){
  const mat=new THREE.MeshStandardMaterial({color,metalness:kind==='reframer'?.85:.25,roughness:.4});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.43,.9,4,8),mat);torso.position.y=1.15;root.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),mat);head.position.y=2.08;root.add(head);
  if(kind==='reframer'){for(let j=0;j<6;j++){const a=j*Math.PI/3;
   const arm=new THREE.Mesh(new THREE.CylinderGeometry(.09,.16,2.4,6),mat);
   arm.position.set(Math.cos(a)*.95,1.2,Math.sin(a)*.95);
   arm.rotation.z=Math.cos(a)*.8;arm.rotation.x=Math.sin(a)*.8;root.add(arm);
  }}
 }
 root.position.set(x,groundY,z);scene.add(root);
 factionActors.push({root,label,kind,home:root.position.clone(),phase:Math.random()*6.28,
  attackCooldown:1.2+Math.random()*1.5,body:createCombatBody({x,y:groundY,z})});
 return root;
}
function updateFactionActors(dt){if(!P)return;for(const a of factionActors){if(a.kind==='slotta'&&(slottaCombat.defeated||morrow.slotta.captured||morrow.slotta.escaped)){a.root.visible=false;continue;}if(a===heldActor){a.attackCooldown=1;if(a.kind==='slotta')animateSlottaBossAsset(a.root,dt,slottaAnimationSnapshot(slottaAnimator));continue;}a.attackCooldown=Math.max(0,(a.attackCooldown||0)-dt);const hostile=a.kind==='framebreaker'||a.kind==='reframer'||a.kind==='slotta';const delta=P.o.position.clone().sub(a.root.position).setY(0);const range=delta.length();const aiMoveAllowed=a.kind!=='slotta'||(SLOTTA_ACTIONS[slottaAnimator.state].loop&&!slottaDash);if(hostile&&aiMoveAllowed&&a.root.visible&&range<17&&a.body.state==='standing'){if(range>3&&range>0.01){a.home.addScaledVector(delta.normalize(),dt*(a.kind==='reframer'?1.8:2.5));}else if(a.attackCooldown<=0){const dir=delta.lengthSq()>.01?delta.normalize():new THREE.Vector3(0,0,1);vel.addScaledVector(dir,5);vel.y=Math.max(vel.y,1.8);a.attackCooldown=a.kind==='reframer'?2.8:1.8;toast(a.kind==='reframer'?'REFRAMER · kinetic strike':'FRAMEBREAKER · counterattack');}}a.phase+=dt*(a.kind==='reframer'?1.4:.7);if(a.kind==='slotta'){const locomotion=range<17?'walking':'idle';if(SLOTTA_ACTIONS[slottaAnimator.state].loop)startSlottaAction(slottaAnimator,locomotion);animateSlottaBossAsset(a.root,dt,slottaAnimationSnapshot(slottaAnimator));}if(a.body.state!=='standing'){stepCombatBody(a.body,dt,groundY);a.root.position.set(a.body.position.x,a.body.position.y,a.body.position.z);a.root.rotation.z=Math.min(1.1,Math.hypot(a.body.velocity.x,a.body.velocity.z)*.07);if(a.body.state==='standing'){a.home.copy(a.root.position);a.root.rotation.z=0;}}else{
 // SLOTTA keeps a stable home/world transform between attacks; the other factions retain their patrol bob.
 const slottaSteady=a.kind==='slotta';a.root.position.x=a.home.x+(slottaSteady?0:Math.sin(a.phase)*2);a.root.position.z=a.home.z+(slottaSteady?0:Math.cos(a.phase)*2);a.root.rotation.y+=dt*.3;a.body.position.x=a.root.position.x;a.body.position.z=a.root.position.z;}}}

// SLOTTA's backpack console: autonomous first-boss combat encounter.
const slottaConsole=createSlottaLoadout(),slottaMinions=[];let slottaSummonSerial=0;const slottaAnimator=createSlottaAnimator();let slottaPendingGame=null,slottaSelectedSlot=0,slottaDash=null,slottaDashGhostClock=0;let slottaAttackClock=2,slottaSnare=0,slottaAnnounced=false,slottaTurn=0,slottaSwapClock=0;const slottaEffects=[];
function spawnSlottaMinion(kind,origin){
 // Summons are budgeted for mobile and flank on opposite sides of the player.
 const limit=kind==='serpent'?8:6;
 if(slottaMinions.filter(m=>m.kind===kind).length>=limit)return false;
 const index=slottaSummonSerial++,side=index%2===0?-1:1;
 const root=createSlottaMinionAsset(kind);
 root.position.copy(origin).add(new THREE.Vector3(side*(1.0+.17*(index%3)),0,-.65));
 scene.add(root);
 slottaMinions.push({root,kind,life:kind==='serpent'?11:18,hit:false,phase:index*.65,
  motion:createSlottaMinionMotion(kind,index)});
 return true;
}
// Box3 footprint check; keeps the same world colliders but avoids point-only tunnelling.
function slottaBlockedAt(x,z,radius=.42){
 for(const c of colliders){
  if(!c?.min||!c?.max)continue;
  if(c.max.y<=groundY+.35||c.min.y>=groundY+2.25)continue;
  if(x+radius>c.min.x&&x-radius<c.max.x&&z+radius>c.min.z&&z-radius<c.max.z)return true;
 }
 return false;
}
function slottaEffect(kind,pos,radius=3,life=1.1){
 const colors={pulse:0x7b75ff,shield:0x47d3e5,jam:0xd448ed,strike:0xff8a49,
  serpent:0xa15bff,clone:0x5cd7ff,dash:0x77c7ff,select:0xf6a14e,telegraph:0xeebeff};
 const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,.09,6,32),
  new THREE.MeshBasicMaterial({color:colors[kind]||0xffffff,transparent:true,opacity:.8,depthWrite:false}));
 mesh.rotation.x=Math.PI/2;mesh.position.copy(pos);mesh.position.y=groundY+.16;scene.add(mesh);
 slottaEffects.push({mesh,life,max:life});
}
function slottaHitSpark(boss,heavy){
 // The damage event, not the render frame, owns this flash.
 const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(heavy?.48:.31,1),
  new THREE.MeshBasicMaterial({color:heavy?0xffbe89:0xb6baff,transparent:true,opacity:.82,depthWrite:false}));
 mesh.position.copy(boss.position).add(new THREE.Vector3(0,1.35,0));
 scene.add(mesh);slottaEffects.push({mesh,life:heavy?.38:.27,max:heavy?.38:.27});
 slottaEffect(heavy?'strike':'shield',boss.position,heavy?1.85:1.15,heavy?.44:.28);
}
function slottaAfterimage(pos){
 const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.39,1.25,3,7),
  new THREE.MeshBasicMaterial({color:0x886aff,transparent:true,opacity:.54,depthWrite:false}));
 mesh.position.copy(pos).add(new THREE.Vector3(0,1.18,0));scene.add(mesh);
 slottaEffects.push({mesh,life:.43,max:.43});
}
function updateSlottaDash(dt,boss){
 if(!slottaDash||!boss)return;
 const actor=factionActors.find(a=>a.root===boss);
 if(!actor){slottaDash=null;return;}
 const distance=Math.min(slottaDash.remaining,Math.max(0,Math.min(dt,.05))*25);
 const move=slottaDashSweep({x:boss.position.x,z:boss.position.z},
  {x:slottaDash.direction.x,z:slottaDash.direction.z},distance,
  (x,z)=>slottaBlockedAt(x,z,.52));
 boss.position.x=move.x;boss.position.z=move.z;
 actor.home.copy(boss.position);actor.body.position.x=move.x;actor.body.position.z=move.z;
 slottaDash.remaining=Math.max(0,slottaDash.remaining-move.travelled);
 slottaDashGhostClock-=dt;
 if(move.travelled>.001&&slottaDashGhostClock<=0){
  slottaAfterimage(boss.position);slottaDashGhostClock=.085;
 }
 if(!slottaDash.hit&&boss.position.distanceTo(P.o.position)<1.7){
  const d=slottaDash.direction;vel.x+=d.x*6;vel.z+=d.z*6;vel.y=Math.max(vel.y,1.1);
  slottaDash.hit=true;slottaEffect('dash',boss.position,1.5,.5);
 }
 if(move.blocked){slottaEffect('dash',boss.position,1.1,.4);}
 if(move.blocked||slottaDash.remaining<=.001)slottaDash=null;
}
let slottaPhase=0,slottaArmor=0,slottaArena=0,slottaGravity=0;
function slottaUseGame(game,boss,range){
 const toward=P.o.position.clone().sub(boss.position).setY(0);if(toward.lengthSq()>.001)toward.normalize();
 switch(game.id){
 case 'slither-master':
  slottaEffect('serpent',boss.position,3,1);
  for(let i=0;i<2;i++)spawnSlottaMinion('serpent',boss.position);break;
 case 'ninja-star':
  slottaEffect('clone',boss.position,3.2,1.2);
  for(let i=0;i<2;i++)spawnSlottaMinion('clone',boss.position);break;
 case 'phantom-racer':
  if(toward.lengthSq()>.001){
   const path=slottaDashTarget(boss.position,P.o.position,{min:4,max:8.5});
   slottaDash={direction:new THREE.Vector3(path.x,0,path.z),remaining:path.length,hit:false};
   slottaDashGhostClock=0;
   slottaEffect('dash',boss.position,2,.6);
  }break;
 case 'zero-sector':slottaArena=6;slottaEffect('jam',boss.position,9,6);break;
 case 'fleshcode':slottaArmor=4;slottaEffect('strike',boss.position,4);if(range<5){vel.addScaledVector(toward,7);vel.y=Math.max(vel.y,2);}break;
 case 'phasebound':slottaPhase=3;slottaEffect('shield',boss.position,2,3);break;
 case 'shifting-department':slottaEffect('pulse',P.o.position,3);if(range<16){vel.addScaledVector(toward,10);vel.y=Math.max(vel.y,3);}break;
 case 'nanoforge':for(let j=0;j<2;j++)spawnSlottaMinion('clone',boss.position);break;
 case 'gravity-children':slottaGravity=4;slottaEffect('pulse',P.o.position,7,4);break;
 case 'tenfold':slottaArmor=7;slottaEffect('shield',boss.position,3,7);spawnSlottaMinion('serpent',boss.position);break;
 case 'elemental-outlaw':slottaEffect('strike',boss.position,7);if(range<8){vel.addScaledVector(toward,9);slottaSnare=Math.max(slottaSnare,1.2);}break;
 }
 toast('SLOTTA · '+game.name.toUpperCase()+' · '+game.move.toUpperCase());
}
function updateSlottaBoss(dt){
 if(!P||!morrow.slottaMesh)return;
 // Resolve before ticking animation events: no post-defeat summons or phantom casts.
 const resolved=slottaCombat.defeated||morrow.slotta.captured||morrow.slotta.escaped;
 if(resolved){
  slottaPendingGame=null;slottaDash=null;
  for(const m of slottaMinions.splice(0)){
   scene.remove(m.root);m.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  }
  for(const fx of slottaEffects.splice(0)){
   scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();
  }
  return;
 }
 const boss=morrow.slottaMesh;
 const events=tickSlottaAnimator(slottaAnimator,dt);
 for(const event of events){
  if(event.type==='telegraph')slottaEffect('telegraph',boss.position,1.2,.42);
  if(event.type==='cartridge-select')slottaEffect('select',boss.position,1.05,.52);
  if(slottaPendingGame){
   const allowed=slottaCombatEligible({held:heldActor?.root===boss,
    range:boss.position.distanceTo(P.o.position)});
   const out=advanceSlottaAttackEvent(slottaConsole,slottaAnimator,slottaPendingGame,event,{canCast:allowed});
   slottaPendingGame=out.pending;
   if(out.cast)slottaUseGame(out.cast,boss,boss.position.distanceTo(P.o.position));
  }
 }
 slottaCombat.hitCooldown=Math.max(0,slottaCombat.hitCooldown-dt);
 slottaCombat.impactWindow=Math.max(0,slottaCombat.impactWindow-dt);tickSlotta(slottaConsole,dt);slottaSnare=Math.max(0,slottaSnare-dt);slottaPhase=Math.max(0,slottaPhase-dt);slottaArmor=Math.max(0,slottaArmor-dt);slottaArena=Math.max(0,slottaArena-dt);slottaGravity=Math.max(0,slottaGravity-dt);if(slottaGravity>0&&P.o.position.distanceTo(morrow.slottaMesh.position)<18){vel.x*=Math.max(.2,1-dt*2);vel.z*=Math.max(.2,1-dt*2);}morrow.slottaMesh.traverse(o=>{if(o.isMesh&&o.material){o.material.transparent=slottaPhase>0;o.material.opacity=slottaPhase>0?.35:1;}});
 const range=boss.position.distanceTo(P.o.position);
 updateSlottaDash(dt,boss);
 if(range<24&&!slottaAnnounced){slottaAnnounced=true;startSlottaAction(slottaAnimator,'intro');toast('BOSS: SLOTTA · PHATOM ENGINE · 3 ACTIVE / 5 STORED');}
 for(let i=slottaEffects.length-1;i>=0;i--){const fx=slottaEffects[i];fx.life-=dt;fx.mesh.material.opacity=Math.max(0,fx.life/fx.max)*.8;fx.mesh.scale.setScalar(1+(1-fx.life/fx.max)*.45);if(fx.life<=0){scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();slottaEffects.splice(i,1);}}
 if(range<25&&!morrow.slotta.captured&&!morrow.slotta.escaped){
  slottaAttackClock-=dt;slottaSwapClock-=dt;
  const ready=!slottaPendingGame&&slottaCombatEligible({held:heldActor?.root===boss,range})&&canStartSlottaAction(slottaAnimator,'select');
  if(slottaAttackClock<=0&&ready){
   const pending=queueSlottaAttack(slottaConsole,slottaAnimator,slottaTurn);
   if(pending){
    const actor=factionActors.find(a=>a.root===boss);if(actor)actor.home.copy(boss.position);
    slottaPendingGame=pending;slottaSelectedSlot=pending.index;slottaTurn=(pending.index+1)%3;
    const visual=boss.userData.slottaRig;if(visual)visual.selectedSlot=pending.index;
    slottaEffect('select',boss.position,1.7,.65);
    slottaAttackClock=2.8;
   }else if(slottaSwapClock<=0){
    const stored=slottaConsole.stored.findIndex(id=>id&&SLOTTA_GAMES.some(g=>g.id===id));
    if(stored>=0&&swapSlot(slottaConsole,slottaTurn,stored)){
     const visual=boss.userData.slottaRig;if(visual){visual.selectedSlot=slottaTurn;visual.selectedStorageSlot=stored;}
     slottaSwapClock=2.5;
     startSlottaAction(slottaAnimator,'swap');
     toast('SLOTTA · PHATOM BACKPACK · SWITCHING GAME');
    }
    slottaAttackClock=1.1;
   }
  }
 }
 for(let i=slottaMinions.length-1;i>=0;i--){
  const m=slottaMinions[i];m.life-=dt;m.phase+=dt*(m.kind==='serpent'?8:5);
  const move=minionChoreographyStep(m.motion,dt,m.root.position,P.o.position,
   (x,z)=>slottaBlockedAt(x,z,m.kind==='serpent'?.25:.38));
  m.root.position.set(move.x,groundY+move.elevation+Math.sin(m.phase)*.07,move.z);
  m.root.rotation.y=move.yaw;
  animateSlottaMinionAsset(m.root,m.phase,move.stage,m.motion.side);
  if(move.telegraph)slottaEffect(m.kind==='serpent'?'serpent':'clone',m.root.position,
   m.kind==='serpent'?1.3:1.65,.36);
  if(move.impact&&!m.hit){
   m.hit=true;
   if(m.kind==='serpent'){slottaSnare=Math.max(slottaSnare,4);toast('CIRCUIT SERPENT · Gallium jammed for 4s');}
   else{vel.x*=.45;vel.z*=.45;toast('CYBORG CLONE · impact');}
   slottaEffect(m.kind==='serpent'?'serpent':'clone',m.root.position,1.2,.35);
  }
  if(m.life<=0||m.hit){
   scene.remove(m.root);m.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
   slottaMinions.splice(i,1);
  }
 }
}
function initMorrow(){
 const home=SPOTS.home.c;const mk=(color,x,z,h=1.7)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(.85,h,.85),new THREE.MeshStandardMaterial({color,metalness:.55,roughness:.38}));o.position.set(home.x+x,groundY+h/2,home.z+z);scene.add(o);morrowMeshes.push(o);return o;};
 morrow.slottaMesh=factionActor('SLOTTA',0xd65d36,home.x+10,home.z+3,'slotta');morrow.reframerMesh=factionActor('ReFramer',0x546b81,home.x+17,home.z+3,'reframer');morrow.constructMesh=mk(0x858a99,14,3,2.4);
 factionActor('Framekeeper Patrol',0x4778d5,home.x-11,home.z+7,'framekeeper');factionActor('Framebreaker',0xc34c62,home.x-15,home.z-6,'framebreaker');factionActor('Framebreaker Scout',0xa64b5d,home.x+5,home.z-16,'framebreaker');
 factionActor('Framebreaker Striker',0xb54251,home.x+20,home.z-12,'framebreaker');factionActor('Framebreaker Enforcer',0x912c4a,home.x-22,home.z+14,'framebreaker');factionActor('Framekeeper Sentinel',0x3b84c9,home.x-19,home.z-12,'framekeeper');factionActor('ReFramer Hunter',0x5e8299,home.x+26,home.z+12,'reframer');
 factionActor('Framebreaker Enforcer',0x9d364e,home.x-21,home.z-11,'framebreaker');factionActor('Framebreaker Vanguard',0x9d364e,home.x+24,home.z-15,'framebreaker');factionActor('Framekeeper Sentinel',0x367fcb,home.x-20,home.z+17,'framekeeper');factionActor('Framekeeper Guardian',0x367fcb,home.x+22,home.z+18,'framekeeper');factionActor('ReFramer Hunter',0x637887,home.x+27,home.z+8,'reframer');factionActor('ReFramer Pursuer',0x637887,home.x-25,home.z-20,'reframer');
 morrow.reframerMesh.visible=false;morrow.constructMesh.visible=false;
 const panel=document.createElement('div');panel.id='morrowMission';panel.style.cssText='position:fixed;left:12px;bottom:72px;z-index:12;max-width:190px;padding:5px 8px;background:#10141da6;color:#f1f2ff;border:1px solid #a978f066;border-radius:7px;font:10px system-ui;pointer-events:none';document.body.append(panel);morrow.panel=panel;
}
function updateMorrow(dt){if(!morrow.slottaMesh)return;
 const p=P.o.position,sm=morrow.slottaMesh,rm=morrow.reframerMesh,cm=morrow.constructMesh;
 const distance=p.distanceTo(sm.position);let action='wait';
 if(tap('KeyR')){if(distance<8&&st.gal>=.12){action='tether';st.gal-=.12;}else toast('Wrangle: get within 8m and keep Gallium reserve');}
 else if(tap('KeyT')){if(distance<7&&st.gal>=.08){action='anchor';st.gal-=.08;}else toast('Anchor: move closer and reserve Gallium');}
 else if(tap('KeyG')){if(rm.visible&&p.distanceTo(cm.position)<11&&st.gal>=.18){action='disrupt';st.gal-=.18;}else toast('Get near ReFramer construct with Gallium');}
 else if(tap('KeyV'))action='brace';
 const old=morrow.events.length;stepEncounter(morrow,action,dt);
 if(morrow.events.length!==old&&action!=='wait')toast(morrow.events[morrow.events.length-1]);
 if(!slottaCombat.defeated&&!morrow.slotta.captured&&!morrow.slotta.escaped){const away=sm.position.clone().sub(p).setY(0);if(away.lengthSq()<100&&away.lengthSq()>.01){sm.position.addScaledVector(away.normalize(),dt*2.6);const actor=factionActors.find(a=>a.root===sm);if(actor)actor.home.copy(sm.position);}}
 sm.visible=!slottaCombat.defeated&&!morrow.slotta.captured&&!morrow.slotta.escaped;
 rm.visible=morrow.reframer.active;cm.visible=rm.visible&&morrow.reframer.construct>.05;
 cm.scale.y=Math.max(.08,morrow.reframer.construct);cm.material.emissive.setHex(morrow.reframer.windup>.55&&morrow.reframer.windup<.85?0xa34c24:0x000000);
 morrowClock+=dt;if(morrowClock>.15){morrowClock=0;morrow.panel.textContent='SLOTTA '+(slottaCombat.defeated?'DEFEATED':morrow.slotta.captured?'CAPTURED':morrow.slotta.escaped?'ESCAPED':Math.round(distance)+'m'+' · HP '+Math.ceil(slottaCombat.health))+' · ReFramer '+(morrow.reframer.active?'ACTIVE':'dormant');}
}
// Morrow City encounter pacing and structural impact test harness (PROPOSAL).
const cityDirector=createDirector('balanced');const structureImpact=createImpactState();let directorHudClock=0;
function tickCitySystems(dt){if(!P)return;const p=P.o.position;
 const event=tickDirector(cityDirector,dt,{x:p.x,z:p.z,speed:Math.hypot(vel.x,vel.z)},pos=>Math.hypot(pos.x-p.x,pos.z-p.z)>18);
 if(event)toast('MORROW DISPATCH: '+event.type.toUpperCase()+' · '+Math.round(Math.hypot(event.pos.x-p.x,event.pos.z-p.z))+'m away');
 if(cityDirector.active&&Math.hypot(cityDirector.active.pos.x-p.x,cityDirector.active.pos.z-p.z)<8&&tap('KeyN')){witness(cityDirector,{rescues:1});finishEncounter(cityDirector,'resolved');toast('Incident resolved · public trust improved');}
 if(tap('KeyJ')&&structureImpact.mode==='stable'){
  const speed=Math.max(9,Math.hypot(vel.x,vel.z));const hit=impactStructure(structureImpact,{mass:170,speed,material:'ordinary',thickness:.5});
  if(hit.breached){vel.multiplyScalar(.1);toast('STRUCTURE BREACH · Metal embedded · press K to pull free');}else toast('Impact absorbed · staggered');
 }
 const pull=keys.KeyK?'pull':keys.KeyV?'brace':'wait';const oldMode=structureImpact.mode;
 stepImpact(structureImpact,dt,pull,st.gal);if(oldMode==='embedded'&&structureImpact.mode==='recovering')toast('Metal pulled free · recovery');
 if(structureImpact.mode==='embedded'||structureImpact.mode==='recovering'){vel.multiplyScalar(Math.exp(-10*dt));}
 directorHudClock+=dt;if(directorHudClock>.3){directorHudClock=0;if(morrow.panel){const detail=cityDirector.active?cityDirector.active.type+' '+Math.round(Math.hypot(cityDirector.active.pos.x-p.x,cityDirector.active.pos.z-p.z))+'m':'quiet';morrow.panel.dataset.director='MORROW '+detail+' · HEAT '+Math.round(cityDirector.heat*100)+'% · IMPACT '+structureImpact.mode;}}
}
let worldGripWarned=false,worldGripRetry=0,worldSwingLatch=false,worldGrabLatch=false,worldThrowLatch=false,worldGripActive=false,gripAxisX=0,gripAxisY=0;
function update(dt){
 // Poll the Menu hold while paused; never suspend the browser loop or mission loader.
 if(metalPadV3.paused){pollPad(dt);return;}
 st.grinding=false;
 if(forgeController?.update(dt,P.o.position,floorAt(P.o.position))){st.board=true;board.visible=true;toast('FORGE COMPLETE · FOUR WHEELS');}
 updateForgeHud();
 // Single external-root physics step. The actual movement solver owns Metal's position.
 bodyMachine.step(dt,0,true);
 bodyMachine.position.x=P.o.position.x;bodyMachine.position.z=P.o.position.z;
 bodyMachine.position.y=Math.max(0,P.o.position.y-floorAt(P.o.position));
 if(FG.inFight&&!st.board&&pressed.KeyB){pressed.KeyB=false;FG.wantDodge=true;}
 const pad=pollPad(dt);
 if(pad&&!controllerSeen){controllerSeen=true;/* guide available on H, not forced over gameplay */}
 tickCitySystems(dt);updateMorrow(dt);updateFactionActors(dt);updateMetalBlasts(dt);updateGalliumPhysics(dt);updateSlottaBoss(dt);updateMetalStory(dt);
 // Controller contract: LB grabs, RB swings, LT charges, RT RIFFT Steps; LB+RT throws a held car.
 const gpWorld=metalPadV3.mode==='skylab'?null:(navigator.getGamepads?[...navigator.getGamepads()].find(g=>g):null);
 const lt=!!(gpWorld?.buttons[6]?.pressed||gpWorld?.buttons[6]?.value>.35||gpWorld?.axes?.[4]>.35),lb=!!gpWorld?.buttons[4]?.pressed,rb=!!gpWorld?.buttons[5]?.pressed,rt=!!(gpWorld?.buttons[7]?.pressed||gpWorld?.buttons[7]?.value>.35);
 updateCrownCharge(dt,gpWorld);const gripDown=shouldGripWorld({mode:metalPadV3.mode,lb,keyboard:!!keys.KeyU,v3Held:v3GrabHeld});worldGripActive=gripDown;gripAxisX=gpWorld?.axes?.[2]||0;gripAxisY=gpWorld?.axes?.[3]||0;
 if(rt&&!lt&&!gripDown){riftPressTime+=dt;if(riftPressTime>=.16&&!combatBlastLatch){riffStep();combatBlastLatch=true;}}else{riftPressTime=0;combatBlastLatch=false;}if(tap('KeyZ'))fireMetalBlast();riftCooldown=Math.max(0,riftCooldown-dt);
 if(rb&&!gripDown&&!worldSwingLatch){if(slottaSnare>0)toast('Circuit Serpents: swing disabled');else{pressed.KeyQ=true;keys.KeyQ=true;}}if(!rb||gripDown||slottaSnare>0)keys.KeyQ=false;worldSwingLatch=rb&&!gripDown&&slottaSnare<=0;
 if(gripDown&&!heldCar&&!heldCitizen&&!heldActor&&!gripTarget&&worldGripRetry<=0){if(slottaSnare>0)toast('Circuit Serpents disrupting Galaxy Gallium');else galliumGrabWorld();worldGripRetry=.4;}else worldGripRetry=Math.max(0,worldGripRetry-dt);
 if((gripDown&&rt&&!worldThrowLatch)||tap('KeyI')){slingCar();releaseGrip();}
 if(!gripDown){worldGripWarned=false;worldGripRetry=0;if(gripTarget||heldCar||heldCitizen||heldActor||structureGrip)releaseGrip();}worldGrabLatch=gripDown;worldThrowLatch=gripDown&&rt;
 let ix=(keys.KeyD?1:0)-(keys.KeyA?1:0)+stick.x+(pad?pad.x:0),iz=(keys.KeyS?1:0)-(keys.KeyW?1:0)+stick.y+(pad?pad.y:0);
 if(forgeController?.busy){ix=0;iz=0;vel.x=0;vel.z=0;}
 if(bodyMachine.mode==='fallen'&&(pressed.Space||pressed.KeyE)){bodyMachine.velocity.x=0;bodyMachine.velocity.z=0;bodyMachine.recover();pressed.Space=false;pressed.KeyE=false;}
 if(bodyMachine.mode==='fallen'||bodyMachine.mode==='recovering'){ix=0;iz=0;vel.x*=Math.exp(-8*dt);vel.z*=Math.exp(-8*dt);}
 const il=Math.min(1,Math.hypot(ix,iz));
 if(tap('KeyM')){const on=toggle('map');if(on){zoom=0;drawMap();}}
 if(tap('KeyP')){if(toggle('prof'))renderProfile();}
 if(tap('Escape')){toggle('map',false);toggle('prof',false);}
 for(let k=0;k<4;k++)if(tap('Digit'+(k+1))||tap('F'+(k+1)))setForm(k);
 if(tap('KeyO')){setMask((maskI+1)%MASKS.length);toast('Mask: '+({none:'none',HeavyCrown:'Heavy Crown (PLACEHOLDER)',KITO:'KITO Mask (PLACEHOLDER)'})[MASKS[maskI]]);}
 if(tap('KeyH')){showControllerLegend();$('help').style.display=$('help').style.display==='none'?'block':'none';}
 const pp=P.o.position;
 // camera-relative movement
 const fwd=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw)),right=new THREE.Vector3(-fwd.z,0,fwd.x);
 const wish=new THREE.Vector3().addScaledVector(right,ix).addScaledVector(fwd,-iz);if(wish.lengthSq()>1)wish.normalize();
 const bPressed=tap('KeyB');
  // Classic X/Y have no foot-combat effect while riding; opt-in board-only mapping.
  const yardEligible=!!(yard&&st.board&&!st.wall&&!st.swing&&!st.flying&&sk.bailT<=0&&bodyMachine.mode!=='fallen'&&bodyMachine.mode!=='recovering');
  const yardFlipPulse=yardEligible?(tap('BracketLeft')||tap('Numpad4')):false;
  const yardDir=yard?trickDirection(ix,-iz):'N';
  const yardGrabHeld=!!(yardEligible&&(keys.BracketRight||keys.Numpad6));
  if(yardFlipPulse)yard.queueFlip(yardDir);
 if(st.wall&&st.board&&bPressed){st.wall=null;onGround=false;st.board=false;board.visible=false;if(GAL_FORGE_ENABLED&&forgeController?.dissolve())st.gal=Math.min(1,st.gal+FORGE_REFUND);toast('Bail (B) · board released');}
 else if(bPressed&&onGround&&!st.swing){
  if(st.board){st.board=false;board.visible=false;if(GAL_FORGE_ENABLED&&forgeController?.dissolve())st.gal=Math.min(1,st.gal+FORGE_REFUND);toast(GAL_FORGE_ENABLED?'GALAXY GALLIUM · BOARD DISSOLVING':'Board up');}
  else if(GAL_FORGE_ENABLED){
   const sourceFloor=floorAt(pp);
   if(forgeController?.begin({grounded:onGround&&!st.flying&&!st.wall,hasMaterial:Number.isFinite(sourceFloor),gallium:st.gal},pp,sourceFloor)){
    st.gal=Math.max(0,st.gal-FORGE_COST);vel.x=vel.z=0;toast('GALAXY GALLIUM · FORGING FOUR WHEELS');setViolet(.75);
   }else toast('Forge unavailable: '+(forgeController?.state.error||'unknown'));
  }else{st.board=true;board.visible=true;toast('Board down — four wheels');plog('discoveries','Skating on the four-wheel board');}
 }
 // grapple [S1]: tap to attach nearest anchor in front; tendril costs Gallium only while out, refunds on release
 if(tap('KeyQ')){if(st.swing)releaseSwing('tap');else startSwing(pp);}
 // flight: Merkaba propulsion, limited only by orientation to gravity point [decision #3]. No charge meter.
 if(tap('KeyF')){if(st.flying){st.flying=false;}else if(!onGround&&st.ori>.2){st.flying=true;st.swing=null;tether.visible=false;plog('discoveries','Star Merkaba flight');}else toast(onGround?'Get airborne first (ollie, kicker or swing)':'Orientation unstable — cannot lock gravity point');}
 merkaba.visible=st.metalForm>=3; if(merkaba.visible&&!st.flying){P.model.updateMatrixWorld(true);const ch=P.model.getObjectByName('Chest');const bk=new THREE.Vector3(0,0,-1).transformDirection(P.model.matrixWorld);if(ch)ch.getWorldPosition(merkaba.position);else merkaba.position.copy(P.o.position).setY(P.o.position.y+1.35);merkaba.position.addScaledVector(bk,.28);merkaba.scale.setScalar(.22);}else merkaba.scale.setScalar(1); // canon: Merkaba only from S3, on his back
 const run=keys.ShiftLeft||keys.ShiftRight||il>.95&&isTouch;
if(st.wall){wallRide(dt,wish,pp);}else{
 const SK={cruise:8.5,boost:16,acc:5,coast:.15,grav:17.5,ollie:6.8}; // v7 parity port (html_v7_parity.json: CRUISE_MAX 340px*.025, GRAV 700px*.025, coast 8.42->6.26 m/s in 2 s, ollie peak 1.31 m / air .775 s)
 let maxS=st.board?(run?SK.boost:SK.cruise):(run?7:3.2);if(st.form===2)maxS*=1.05; // form stats placeholder
 if(st.flying){const up=((keys.Space||(metalPadV3.mode==='skylab'&&v3PrevFlight))?1:0)-(keys.KeyC&&!keys.KeyZ?0:0);const turn=Math.abs(wish.clone().normalize().dot(new THREE.Vector3(vel.x,0,vel.z).normalize()||0));
  vel.lerp(wish.clone().multiplyScalar(20).setY(up*8-(keys.ControlLeft?8:0)),dt*1.6);
  // sharp direction changes destabilise orientation; steady flight restores it
  const sharp=wish.lengthSq()>.1&&new THREE.Vector3(vel.x,0,vel.z).length()>5&&turn<.3;st.ori=THREE.MathUtils.clamp(st.ori+(sharp?-.5:.12)*dt,0,1);
  if(st.ori<.08){st.flying=false;toast('Lost the gravity orientation point — falling!');}
  if(st.ori<.4)vel.y-=9*(.4-st.ori)*dt*4; merkaba.position.copy(pp).setY(pp.y+1);merkaba.rotation.y+=dt*3;setViolet(.9);
 } else if(st.swing){swingStep(dt,wish,pp);
 } else {
  let hv;
  if(st.board&&onGround){ // METAL SKATE CORE (v7 feel port): heading-based board, stroke pushes, carve, powerslide, pump, manual
   if(sk.bailT>0){sk.bailT-=dt;vel.x*=Math.exp(-3*dt);vel.z*=Math.exp(-3*dt);sk.stroke=-1;}else skateGround(dt,wish,il);
   vel.y-=SK.grav*dt;st.ori=Math.min(1,st.ori+dt*.3);hv=new THREE.Vector3(vel.x,0,vel.z);
   if((tap('Space')||(yardEligible&&yardFlipPulse))&&sk.bailT<=0)skOllie();
  } else if(!st.board){ footMove(dt,wish,il,run);hv=new THREE.Vector3(vel.x,0,vel.z);st.ori=Math.min(1,st.ori+dt*.3);
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
 if(yard&&st.board&&!st.swing&&!st.wall&&!st.flying){
   if(!onGround)yard.onAir(dt,{grabHeld:yardGrabHeld,dir:yardDir});
   const line=yard.grind(dt,{active:st.grinding,dir:yardDir,speed:Math.hypot(vel.x,vel.z)});
   if(line&&line.points){st.comboPend+=Math.min(2.5,line.points/150);toast(line.name+' · GRIND LINE');}
  }
  // Gallium brace (S1: 1/3 bar) — Shift+Space while flying/swinging cancels momentum
 if(!st.flying&&!st.swing)pp.addScaledVector(vel,dt);else if(st.flying)pp.addScaledVector(vel,dt);
 const preHit=collide(pp);if(preHit&&lastHit&&st.swing&&st.board&&lastHit.b.max.y>3&&lastHit.into>3){releaseSwing('wall');startWall(lastHit);}if(preHit&&lastHit&&!st.board&&!onGround&&!st.flying&&!st.swing&&!st.wall)tryClimb(lastHit,wish);if(preHit&&lastHit&&st.board&&!st.flying&&!st.swing&&lastHit.into>=WR.minInto&&lastHit.b.max.y>3){const sp=lastHit.hv.length();if(st.gal>=WR.rampCost&&sp>=WR.rampMinSpeed){lastHit.ramp=true;startWall(lastHit);}else if(sp>=WR.minSpeed)startWall(lastHit);}
 if(preHit&&lastHit&&st.board&&onGround&&!st.wall&&!st.flying&&!st.swing&&lastHit.into>MSK.WALL_BAIL){skBail('SLAMMED A WALL');bodyMachine.fall(vel.x,vel.z);bodyMachine.impact=Math.max(bodyMachine.impact,lastHit.into);}
 if(preHit&&lastHit&&st.board&&onGround&&!st.wall&&!st.flying&&!st.swing&&lastHit.into>MSK.WALL_BAIL){skBail('SLAMMED A WALL');bodyMachine.impact=lastHit.into;bodyMachine.fall(vel.x,vel.z);}
 const gY=floorAt(pp);const wasAir=!onGround;
 if(!st.wall&&pp.y<=gY&&!st.swing){if(wasAir&&!st.flying){if(!st.board){bodyMachine.impact=Math.max(0,-vel.y);footLand(vel.y);}if(st.board){if(Math.abs(vel.y)>(SWS.air>0?28:18)){skBail('HARD LANDING');bodyMachine.impact=Math.max(0,-vel.y);bodyMachine.fall(vel.x,vel.z);}else if(finishYardAir()){bank();sk.landT=0;sk.flash=1;if(P.acts.Land){play(P,'Land',true);actT=.16;}}}}pp.y=gY;if(vel.y<0)vel.y=0;onGround=true;if(st.flying)st.flying=false;}
 else if(!st.wall&&pp.y>gY+.05&&!st.swing&&!st.flying){if(!st.board||pp.y>gY+1.15)onGround=false;}
 }
 pp.x=THREE.MathUtils.clamp(pp.x,-200,200);pp.z=THREE.MathUtils.clamp(pp.z,-200,200);
 const hs=Math.hypot(vel.x,vel.z);yaw=faceYaw(dt,hs,yaw);P.o.rotation.set(0,yaw,0);
 if(st.wall){const w=st.wall;const f=new THREE.Vector3().copy(w.t).multiplyScalar(w.side).setY(w.up);if(f.lengthSq()<.01)f.set(0,1,0);f.normalize();const x=new THREE.Vector3().crossVectors(w.n,f).normalize();f.crossVectors(x,w.n);_wm.makeBasis(x,w.n,f);_wq.setFromRotationMatrix(_wm);P.o.quaternion.slerp(_wq,1);}
 swingOrient(dt);
 // The existing character rig performs one pose per forge phase; no duplicate mixer.
 // Suppress generic walk/idle animation selection until the forge sequence finishes.
 const forgePoseActive=GAL_FORGE_ENABLED&&forgeController?.busy;
 // animation select
 actT-=dt;if(!forgePoseActive&&actT<=0&&(!P.cur||P.cur.loop!==THREE.LoopOnce||!P.cur.isRunning())){
  if(st.flying)plA('Flight','Jump');else if(st.swing)plA('Swing','Jump');else if(st.board&&st.wall)plA('Wallride','Skate');else if(st.board)skateAnim(onGround);else footAnim(hs);}
 if(st.board){if(st.boardFree>0){st.boardFree-=dt;}else{ // BOARD LOCK: board stays attached under the LEFT (prosthetic) foot while riding; only bail (B) or kick-off (Space) separates. Mechanism (Gallium film / magnetic) = OPEN
  if(st.wall||swingTilted())board.quaternion.copy(P.o.quaternion);else board.rotation.set(0,yaw,0);
  const up=_bu.set(0,1,0).applyQuaternion(board.quaternion);const fl=P.footL;
  if(fl){P.o.updateMatrixWorld(true);fl.getWorldPosition(_bf);const rel=_bf.sub(pp);const along=rel.dot(up);rel.addScaledVector(up,-along);rel.multiplyScalar(.5);board.position.copy(pp).add(rel);}else board.position.copy(pp);
  st.boardGap=fl?fl.getWorldPosition(_bf).distanceTo(board.position):0;}}
 if(!st.board){board.visible=false;if(yard)yard.resetRide();} // Walking/swinging never displays the board
 // Model-space aerial turn (visual only); original physics and true X/Y/Z are unchanged.
 if(v3SpinTime>0){
  if(onGround)v3SpinTime=0;
  else{
   v3SpinTime=Math.max(0,v3SpinTime-dt);
   const a=(1-v3SpinTime/.75)*Math.PI*2;
   P.o.rotateY(a);
   if(st.board&&st.boardFree<=0)board.rotateY(a);
  }
 }
 // Independent board trick; the existing 4-wheel board never becomes a hoverboard.
 if(v3KickflipTime>0){
  v3KickflipTime=Math.max(0,v3KickflipTime-dt);
  if(st.board&&!onGround){const a=(1-v3KickflipTime/.75)*Math.PI*2;board.rotateZ(a);}
 }
 // Test Yard deck-only flip visuals: no new root or wheel-body physics.
  if(yard&&(st.wall||st.flying||st.swing))yard.resetRide();
  if(yard&&st.board&&!onGround&&!st.wall&&!st.flying&&!st.swing){
   const flip=yard.visual();if(flip){const a=Math.PI*2*flip.progress;board.rotateX(a*flip.rx);board.rotateY(a*flip.ry);board.rotateZ(a*flip.rz);}
  }
  // violet decays (only on active moves)
 for(const mt of seamMats)mt.emissiveIntensity=Math.max(0,mt.emissiveIntensity-dt*3);
 if(galLimb){const hb=P.handBone;if(hb){hb.updateMatrixWorld(true);hb.getWorldPosition(_hand);}else _hand.copy(P.o.position).setY(P.o.position.y+1.2);galLimb.tick(dt,{swing:st.swing,grip:worldGripActive&&gripTarget?gripTarget:null,hand:_hand,model:P.model,st,groundY,playerPos:P.o.position});} // PROPOSAL Gallium limb visuals
 // systems
 fightTick(dt);blastTick(dt);doStrings(dt);doFootball(dt);
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
 if(!prompt){const cp=crewPrompt(pp);if(cp){prompt=cp.text;if(tap('KeyE'))cp.go();}}
 tap('KeyE');$('prompt').style.display=prompt?'block':'none';$('prompt').textContent=prompt;
 // life sim [S3]: needs decay; orbitals = life domains
 st.needs.hunger=Math.max(0,st.needs.hunger-dt*.004);st.needs.energy=Math.max(0,st.needs.energy-dt*(st.board?.005:.003));st.needs.social=Math.max(0,st.needs.social-dt*.002);
 if(st.board&&hs>3)st.orbitals.body=Math.min(1,st.orbitals.body+dt*.002);
 // NPC routines
 for(const n of npcs){if(n.wait>0){n.wait-=dt;if(n.wait<=0)play(n,'Walking');continue;}const to=n.target.clone().sub(n.o.position).setY(0);if(to.length()<1){n.target=wp();if(Math.random()<.3){n.wait=2+Math.random()*3;play(n,'Idle');}continue;}
  const sp=n.speed*(weather==='rain'?1.4:1);n.o.position.addScaledVector(to.normalize(),dt*sp);n.o.rotation.y=Math.atan2(to.x,to.z);
  const nb=n.o.position.clone();for(const b of colliders)if(b.containsPoint(nb.setY(1))){n.target=wp();break;}}
 // traffic
 updateCarBodies(dt);
 for(const c of cars){if(c.userData.worldBody)continue;const u=c.userData;u.t+=u.dir*u.spd*dt;if(u.t>220)u.t=-220;if(u.t<-220)u.t=220;
  if(u.axis){c.position.set(u.lane,0.05,u.t);c.rotation.y=u.dir>0?0:Math.PI;}else{c.position.set(u.t,0.05,u.lane);c.rotation.y=u.dir>0?Math.PI/2:-Math.PI/2;}
  if(c.position.distanceTo(pp)<2.4&&pp.y<1.5){vel.add(pp.clone().sub(c.position).setY(0).normalize().multiplyScalar(8));vel.y=5;onGround=false;if(yard&&st.board)skBail('SIDEWAYS TRAFFIC SLIDE');else bail();bodyMachine.fall(vel.x,vel.z);bodyMachine.impact=Math.hypot(vel.x,vel.z);toast('Clipped by traffic!');}}
 // day/night + weather
 tod=(tod+dt*24/600)%24; // 10-minute day (PROPOSAL)
 const sunA=(tod-6)/12*Math.PI;const day=Math.max(0,Math.sin(sunA));sun.position.set(pp.x+Math.cos(sunA)*80,Math.max(8,Math.sin(sunA)*100),pp.z+30);sun.target.position.copy(pp);
 sun.intensity=.15+day*2.3*(weather==='rain'?.45:1);hemi.intensity=.12+day*.5;renderer.toneMappingExposure=.45+day*.6;scene.backgroundIntensity=.15+day*.85;scene.environmentIntensity=.25+day*.75;
 const night=day<.15;lamps.forEach(l=>l.material.emissiveIntensity=night?3:0);if(bloom)bloom.strength=night?.9:.45;
 const fogC=new THREE.Color(0x0b0c18).lerp(new THREE.Color(weather==='rain'?0x7d8894:0xa9bccb),day);scene.fog.color.copy(fogC);scene.fog.far=weather==='rain'?140:260;
 weatherT-=dt;if(weatherT<=0){weather=weather==='rain'?'clear':(Math.random()<.5?'rain':'clear');weatherT=50+Math.random()*60;if(weather==='rain')plog('log','Rain started');}
 rain.visible=weather==='rain';if(rain.visible){rain.position.set(pp.x,0,pp.z);const a=rain.geometry.attributes.position;for(let i=1;i<a.array.length;i+=3){a.array[i]-=dt*30;if(a.array[i]<0)a.array[i]=40;}a.needsUpdate=true;}
 const hh=Math.floor(tod),mm=Math.floor((tod%1)*60);$('clock').textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')} ${night?'🌙':'☀'} · ${weather}`;
 if(challenge){challenge.t-=dt;if(challenge.t<=0){toast('Forge recipe ended');challenge=null;}}
 // state + HUD
 st.state=st.flying?'FLIGHT · MERKABA':st.swing?'SWING':st.wall?'WALL RIDE':st.board?(onGround?'SKATE':'AIR'):(rivalSt.active?'SPAR':(lockout>0?'RECOVER':(onGround?'WALK':'AIR')));
 if(yard&&st.board&&!st.wall&&!st.swing&&!st.flying){const motion=yard.snapshot();const move=motion.flip||motion.grab||motion.grindLabel;if(move)st.state+=' · '+move;}
  $('state').textContent=st.state+' · Season '+st.form+(st.comboPend>0?' · combo ×'+Math.floor(st.comboPend):'')+(challenge?` · ⏱${challenge.t|0}s ${challenge.type}`:'');
 $('mGal').style.width=st.gal*100+'%';$('mOri').style.width=st.ori*100+'%';$('mChg').style.width=st.charge*100+'%';$('mRoot').style.width=st.root*100+'%';$('mTeam').style.width=st.team*100+'%';$('mFoe').style.width=((FG.target?FG.target.R.stance/(FG.target.R.max||1):rivalSt.stance)*100)+'%';
 const ob=st.orbitals;const shell=(ob.work+ob.body+ob.bonds+ob.mind+ob.money)/5;$('orbs').innerHTML=Object.entries(ob).map(([k,v])=>`<b title="${k}" style="background:rgba(155,92,255,${v})"></b>`).join('')+` <small>${(shell*100|0)}% ${shell<.12?'ION':shell>.62?'NOBLE':''}</small>`;
 $('needs').textContent=`Hunger ${(st.needs.hunger*100|0)} · Energy ${(st.needs.energy*100|0)} · Social ${(st.needs.social*100|0)}`;$('score').textContent=`Pickup: ${st.score[0]} – ${st.score[1]}`;
 if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').style.opacity=0;}
 // camera
 if(FG.lock&&!drag&&rival){const dx=rival.o.position.x-pp.x,dz=rival.o.position.z-pp.z;camYaw+=angDiff(camYaw,Math.atan2(-dx,-dz)+.38)*Math.min(1,dt*3);} // PROPOSAL lock-on: keep the opponent in frame
 if(st.swing&&!drag&&vel.x*vel.x+vel.z*vel.z>4)camYaw+=angDiff(camYaw,Math.atan2(-vel.x,-vel.z))*Math.min(1,dt*2.4);
 {const f=62+(!st.board&&hs>6?8:0)+(st.board&&hs>8.2&&!st.swing?6:0)+(st.swing?Math.min(18,vel.length()*.7):0);FG.fov+=(f-FG.fov)*Math.min(1,dt*4);if(Math.abs(camera.fov-FG.fov)>.05){camera.fov=FG.fov;camera.updateProjectionMatrix();}}
 if(st.board&&onGround&&!st.wall&&!drag&&Math.hypot(vel.x,vel.z)>2.5)camYaw+=angDiff(camYaw,sk.h+Math.PI)*Math.min(1,dt*2.2); // PROPOSAL: chase cam on the board
 const dist=st.flying?9:st.swing?6.6:st.board?7:5.5;/* PROPOSAL: camera pulls in during Gallium swing */const tgt=pp.clone().add(new THREE.Vector3(0,1.6,0));
 const want=tgt.clone().add(new THREE.Vector3(Math.sin(camYaw)*Math.cos(camPitch)*dist,Math.sin(camPitch)*dist+.5,Math.cos(camYaw)*Math.cos(camPitch)*dist));
 if(!drag&&hs>2&&!isTouch===false){}if(st.wall){want.copy(tgt).addScaledVector(st.wall.n,dist*1.1).add(new THREE.Vector3(0,-1.2,0));} camPos.lerp(want,1-Math.pow(.001,dt));camera.position.copy(camPos);const upW=st.wall?new THREE.Vector3(0,1,0).lerp(st.wall.n,.45).normalize():new THREE.Vector3(0,1,0);camera.up.lerp(upW,Math.min(1,dt*4)).normalize();camera.lookAt(tgt);if(FG.shake>0){camera.position.x+=(Math.random()-.5)*FG.shake;camera.position.y+=(Math.random()-.5)*FG.shake;FG.shake=Math.max(0,FG.shake-dt*1.4);}
 tickRamps(dt);signs.forEach(s=>s.lookAt(camera.position));if(plutoRing)plutoRing.rotation.y+=dt;
 if(GAL_FORGE_ENABLED)forgePerformance.beforeMixer();
 for(const m of mixers)m.update(dt);
 if(GAL_FORGE_ENABLED)forgePerformance.afterMixer(P?.model,forgeController?.state);
 P.model.rotation.y+=((st.board&&!st.flying?(P.rotBoard??-1.35):(P.rotWalk??0))-P.model.rotation.y)*Math.min(1,dt*10); // sideways skate stance on the deck
 if(st.board&&(st.wall||swingTilted())&&P.footL&&!(st.boardFree>0)){P.o.updateMatrixWorld(true);P.footL.getWorldPosition(_bf);_bu.set(0,1,0).applyQuaternion(board.quaternion);const h=_bf.sub(board.position).dot(_bu);P.model.position.y+=THREE.MathUtils.clamp(DECK_TOP+Math.max(0,P.soleGap)-h,-2,2);P.o.updateMatrixWorld(true);st.boardGap=P.footL.getWorldPosition(_bf).distanceTo(board.position);} else if(onGround||st.board)seatFeet(dt);else P.model.position.y+=(P.footY+(st.board?DECK_TOP:0)-P.model.position.y)*Math.min(1,dt*8);
 p6Pose(dt);sk.rail=st.grinding;
 // Fall is a visual overlay, never a replacement for the root position controller.
 const tiltGoal=bodyMachine.mode==='fallen'?1.05:bodyMachine.mode==='falling'?.45:bodyMachine.mode==='recovering'?.3:0;
 bodyTilt+=(tiltGoal-bodyTilt)*Math.min(1,dt*8);
 P.model.rotation.x=bodyTilt*bodyMachine.fallDirection.z;
 P.model.rotation.z=bodyTilt*bodyMachine.fallDirection.x;
  // Supplemental body tilt/recovery only, never a second physics solver.
  if(yard){const pose=yard.stepFall(dt);
   if(pose.active){P.model.rotation.x+=pose.pitch*.58;P.model.rotation.z+=pose.roll*.52;}
   if(pose.recover){const clip=P.acts[pose.recover]?pose.recover:P.acts.GetUp?'GetUp':null;
    if(clip){play(P,clip,true);actT=.65;}}
  }
 physicsTime+=dt;
 physicsTelemetry.sample({time:physicsTime,dt,position:P.o.position,velocity:vel,grounded:onGround,board:st.board,wall:st.wall,swing:st.swing,flying:st.flying,body:bodyMachine});
}
// Private-in-query browser QA. Operates on actual loaded entities and combat methods,
// not mocked DOM values; state is restored after each test. PROPOSAL/HOLD.
function installSlottaBrowserQA(){
 const boss=morrow.slottaMesh,actor=factionActors.find(a=>a.root===boss);
 const assert=(value,reason)=>{if(!value)throw Error(reason);};
 const caseNames=[
  ['mission','First-mission and 3D boss loading'],
  ['serpent','Slither Master cast and live summons'],
  ['clone','Ninja Star cast and live summons'],
  ['cooldown','Interrupt before cast conserves cooldown'],
  ['reactions','Light and heavy damage animations'],
  ['grip','Real Gallium target grab and release'],
  ['dash','Phantom Racer swept building collision'],
  ['errors','No captured runtime exceptions']
 ];
 function snapshot(){
  return {ready:!!window.__ready,mission:metalStoryChapter(metalStory)?.title||null,
   bossPresent:!!boss&&boss.parent===scene,bossVisible:!!boss?.visible,
   bossHealth:slottaCombat.health,bossState:slottaAnimator.state,
   active:[...slottaConsole.active],stored:[...slottaConsole.stored],
   queued:slottaPendingGame?.id||null,minions:slottaMinions.length,
   effects:slottaEffects.length,errors:[...(window.__errors||[])],
   canvas:!!renderer?.domElement?.isConnected,holdingSlotta:heldActor?.root===boss};
 }
 function begin(){
  const old={player:P.o.position.clone(),boss:boss.position.clone(),home:actor.home.clone(),
   body:{...actor.body.position},yaw:camYaw,pitch:camPitch,vel:vel.clone(),
   anim:{...slottaAnimator},combat:{...slottaCombat},cooldowns:{...slottaConsole.cooldowns},
   pending:slottaPendingGame,dash:slottaDash,attackClock:slottaAttackClock,
   swapClock:slottaSwapClock,turn:slottaTurn,announced:slottaAnnounced,
   snare:slottaSnare,phase:slottaPhase,armor:slottaArmor,arena:slottaArena,
   gravity:slottaGravity,held:heldActor,fx:new Set(slottaEffects),summons:new Set(slottaMinions),
   selected:boss.userData.slottaRig?.selectedSlot,previousGrip:gripTarget};
  if(heldActor)releaseGrip();
  boss.position.set(10000,groundY,10000);actor.home.copy(boss.position);
  actor.body.position.x=boss.position.x;actor.body.position.y=groundY;actor.body.position.z=boss.position.z;
  P.o.position.set(10000,groundY,10006);
  vel.set(0,0,0);camYaw=0;camPitch=0;slottaPhase=0;slottaArmor=0;
  slottaAnnounced=true;slottaAttackClock=1000;slottaSwapClock=1000;slottaTurn=0;
  slottaPendingGame=null;slottaDash=null;slottaSnare=0;slottaArena=0;slottaGravity=0;
  slottaAnimator.state='idle';slottaAnimator.time=0;slottaAnimator.revision++;
  slottaCombat.health=100;slottaCombat.hitCooldown=0;slottaCombat.impactCount=0;
  slottaCombat.impactWindow=0;slottaCombat.defeated=false;slottaConsole.cooldowns={};
  return old;
 }
 function end(old){
  if(heldActor&&heldActor!==old.held)releaseGrip();
  for(let i=slottaMinions.length-1;i>=0;i--){
   const m=slottaMinions[i];if(old.summons.has(m))continue;
   scene.remove(m.root);m.root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
   slottaMinions.splice(i,1);
  }
  for(let i=slottaEffects.length-1;i>=0;i--){
   const fx=slottaEffects[i];if(old.fx.has(fx))continue;
   scene.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();
   slottaEffects.splice(i,1);
  }
  P.o.position.copy(old.player);boss.position.copy(old.boss);actor.home.copy(old.home);
  Object.assign(actor.body.position,old.body);vel.copy(old.vel);camYaw=old.yaw;camPitch=old.pitch;
  Object.assign(slottaAnimator,old.anim);Object.assign(slottaCombat,old.combat);
  slottaConsole.cooldowns=old.cooldowns;slottaPendingGame=old.pending;slottaDash=old.dash;
  slottaAttackClock=old.attackClock;slottaSwapClock=old.swapClock;slottaTurn=old.turn;
  slottaAnnounced=old.announced;slottaSnare=old.snare;slottaPhase=old.phase;
  slottaArmor=old.armor;slottaArena=old.arena;slottaGravity=old.gravity;
  if(boss.userData.slottaRig)boss.userData.slottaRig.selectedSlot=old.selected;
  heldActor=old.held;clearGripVisual();
 }
 function start(index){
  const pending=queueSlottaAttack(slottaConsole,slottaAnimator,index);
  assert(!!pending,'PHATOM could not select active cartridge '+index);
  slottaPendingGame=pending;
  if(boss.userData.slottaRig)boss.userData.slottaRig.selectedSlot=index;
  return pending;
 }
 function step(n=35){
  for(let i=0;i<n;i++)updateSlottaBoss(.05);
 }
 const tests={
  mission(){
   assert(window.__ready&&P?.o&&boss,'Mission actors missing');
   assert(boss.parent===scene&&boss.visible,'SLOTTA missing from active 3D scene');
   assert(actor&&factionActors.length>=3,'Faction actors missing');
   assert(slottaConsole.active.join(',')==='slither-master,ninja-star,phantom-racer','Wrong starting games');
   assert(slottaConsole.stored.length===5,'PHATOM storage size mismatch');
   assert(renderer?.domElement?.isConnected,'WebGL canvas missing');
   assert($('load')?.style.display==='none','Load overlay still shown');
   return {mission:metalStoryChapter(metalStory)?.title,actors:factionActors.length,
    meshCount:(()=>{let n=0;boss.traverse(o=>{if(o.isMesh)n++;});return n;})()};
  },
  serpent(){
   start(0);assert(!slottaConsole.cooldowns['slither-master'],'Cooldown started at selection');
   step(35);
   assert((slottaConsole.cooldowns['slither-master']||0)>0,'Slither Master never cast');
   assert(slottaMinions.some(m=>m.kind==='serpent'),'No Circuit Serpent actually spawned');
   return {serpents:slottaMinions.filter(m=>m.kind==='serpent').length,
    cooldown:slottaConsole.cooldowns['slither-master']};
  },
  clone(){
   start(1);step(38);
   assert((slottaConsole.cooldowns['ninja-star']||0)>0,'Ninja Star never cast');
   assert(slottaMinions.some(m=>m.kind==='clone'),'No Cyborg Clone actually spawned');
   return {clones:slottaMinions.filter(m=>m.kind==='clone').length,
    cooldown:slottaConsole.cooldowns['ninja-star']};
  },
  cooldown(){
   start(0);step(5);
   assert(!slottaConsole.cooldowns['slither-master'],'Spent cooldown before cast');
   assert(hitSlotta(5),'Real hit handler rejected interrupt');
   assert(slottaPendingGame===null,'Interrupted queued attack survived');
   step(34);
   assert(!slottaConsole.cooldowns['slither-master'],'Interrupted cast spent cooldown');
   assert(!slottaMinions.some(m=>m.kind==='serpent'),'Interrupted cast spawned a serpent');
   return {hitAnimation:slottaAnimator.state,cooldown:0};
  },
  reactions(){
   assert(hitSlotta(5),'Light hit not registered');
   assert(slottaAnimator.state==='hitLight','Light hit animation not triggered');
   slottaCombat.hitCooldown=0;
   assert(hitSlotta(20),'Heavy hit not registered');
   assert(slottaAnimator.state==='hitHeavy','Heavy stagger animation not triggered');
   assert(slottaCombat.health===75,'Boss health did not reflect both hits');
   return {health:slottaCombat.health,animation:slottaAnimator.state};
  },
  grip(){
   // Empty isolated arena ensures the REAL Gallium ray selects SLOTTA, not nearby cars.
   P.o.position.set(10000,groundY,10005);camYaw=0;gripAxisX=0;gripAxisY=0;
   galliumGrabWorld();
   assert(heldActor?.root===boss,'Actual Gallium ray did not grab SLOTTA');
   assert(slottaAnimator.state==='galliumHeld','Held animation not triggered');
   releaseGrip();
   assert(!heldActor&&slottaAnimator.state==='getUp','Release did not start recovery');
   return {grabbed:true,recovery:slottaAnimator.state};
  },
  dash(){
   const blocker=new THREE.Box3(new THREE.Vector3(10002.5,groundY-.5,9998),
     new THREE.Vector3(10004,groundY+3,10002));
   colliders.push(blocker);
   try{
    slottaDash={direction:new THREE.Vector3(1,0,0),remaining:8.5,hit:false};
    let frames=0;
    while(slottaDash&&frames++<12)updateSlottaDash(.05,boss);
    assert(boss.position.x>10000.1,'Dash failed to advance at all');
    assert(boss.position.x<=10002.5-.52+.02,'Dash penetrated the test wall');
    assert(!slottaDash,'Dash did not stop after collider contact');
    return {advanced:+(boss.position.x-10000).toFixed(3),stoppedBeforeWall:true,frames};
   }finally{const i=colliders.indexOf(blocker);if(i>=0)colliders.splice(i,1);}
  },
  errors(){
   assert((window.__errors||[]).length===0,'Runtime errors: '+window.__errors.join('; ').slice(0,230));
   return {capturedErrors:0};
  }
 };
 const runOne=id=>{
  const started=performance.now();
  if(!tests[id])return {id,ok:false,message:'Unknown browser QA case'};
  let old=null;try{
   if(id!=='mission'&&id!=='errors')old=begin();
   const details=tests[id]();
   return {id,ok:true,label:caseNames.find(x=>x[0]===id)?.[1],details,
    elapsedMs:Math.round(performance.now()-started)};
  }catch(e){return {id,ok:false,label:caseNames.find(x=>x[0]===id)?.[1],
   message:String(e.message||e),elapsedMs:Math.round(performance.now()-started)};
  }finally{if(old)end(old);}
 };
 window.__slottaQA={version:'1.0.0',mode:'TEST ONLY • PROPOSAL/HOLD',
  names:caseNames,snapshot,runOne,runAll:()=>{const cases=caseNames.map(([id])=>runOne(id));
   return {allPassed:cases.every(c=>c.ok),cases,build:'SLOTTA browser encounter QA',status:'PROPOSAL/HOLD',
    gameReady:!!window.__ready,time:new Date().toISOString()};}};
}

let fails=0;function loop(){requestAnimationFrame(loop);const dt=Math.min(.05,clock.getDelta());if(window.__testHold){if(LITE)renderer.render(scene,camera);else composer.render();return;}try{update(fgTime(dt));window.__seasonPost&&window.__seasonPost(dt);}catch(e){if(fails++<12){console.error(e);window.__errors.push(String(e));toast('Runtime error: '+String(e.message||e).slice(0,80));}}if(LITE)renderer.render(scene,camera);else composer.render();}

(async()=>{const msg=t=>{boot.stage(t);$('loadmsg').textContent=t;};
 try{
  await buildWorld(msg);
  msg('Characters (Quaternius CC0)…');
  robotGLTF=await missionAsset('assets/models/RobotExpressive.glb','robot',true);
  msg('Sparring rival…');
  const optionalCharacter=u=>loadMissionAsset(loadG,u,{
   timeout:MISSION_ASSET_TIMEOUTS.optional,fallback:()=>null,onWarning:w=>boot.warning(w)});
  [rivalGLTF,crewFemGLTF]=await Promise.all([
   optionalCharacter('assets/models/rival_sparring_hero.glb'),
   optionalCharacter('assets/models/crew_female.glb')
  ]);
  msg('3D Metal & four-wheel board…');
  [metalGLTF,boardGLTF]=await Promise.all([
   missionAsset('assets/models/metal/metal_phase6_fight.glb','metal',true),
   missionAsset('assets/models/metal/metal_skateboard_4wheel_PLACEHOLDER.glb','board',true)
  ]);
  P=makeMetal();scene.add(P.o);initMorrow();P.o.position.copy(SPOTS.home.c).add(new THREE.Vector3(0,groundY,8));camPos.copy(P.o.position).add(new THREE.Vector3(0,4,8));
  board=new THREE.Group();board.add(boardGLTF.scene);boardGLTF.scene.traverse(m=>{if(m.isMesh){m.castShadow=true;if(/Wheel/i.test(m.material.name)){m.material.color=new THREE.Color(0xC9A979);if(m.material.emissive)m.material.emissiveIntensity=0;m.material.map=null;m.material.needsUpdate=true;}}});board.visible=false;board.scale.setScalar(BOARD_S);scene.add(board,tether,merkaba);galLimb=makeGalliumLimb(scene);
  forgeController=new MetalForgeController({character:P.o,board,scene,onPhase:phase=>{
   if(!GAL_FORGE_ENABLED||!P)return;
   const pose=selectForgePose(phase,P.acts);
   if(pose)play(P,pose,false,.16); // real rig action, no unverified FBX names
  }});P.handBone=P.o.getObjectByName('DEF-handR')||P.o.getObjectByName('DEF-hand.R')||P.o.getObjectByName('DEF-forearmR');/* three.js strips '.' from node names */
  // stand on the board: lift player
  msg('Traffic & residents…');await spawnLife();
  plog('log','Session started in Savannah');$('load').style.display='none';window.__ready=true;
  boot.ready();
  if(boot.getStatus().warnings.length)toast('Mission running with '+boot.getStatus().warnings.length+' art fallbacks · PROPOSAL');
  window.__game={galLimb:()=>galLimb,forge:()=>forgeController,forgePerformance:()=>forgePerformance.snapshot(),WR,colliders,vel,camera,P,st,board,seamMats,setMask,anchors,slabs,SPOTS,profile,keys,pressed,teleportForTest:(v)=>{P.o.position.copy(v);},startWallForTest:startWall};// test harness only (not a gameplay teleport)
  window.__game.setForm=setForm;window.__game.sk=sk;if(yard)window.__game.testYard=()=>yard.snapshot();window.__game.FG=FG;window.__game.FOES=FOES;window.__game.CREWS=CREWS;window.__game.SWS=SWS;window.__game.startCrew=startCrew;window.__game.ground=()=>onGround;window.__game.rivalSt=rivalSt;window.__game.rival=()=>rival;window.__game.STRK=STRK;window.__game.stepForTest=(n,dt)=>{for(let i=0;i<n;i++){update(dt);window.__seasonPost&&window.__seasonPost(dt);}};/* test harness only */window.__game.cityDirector=cityDirector;window.__game.structureImpact=structureImpact;window.__game.grabCar=grabCar;window.__game.slingCar=slingCar;window.__game.thrownCars=thrownCars;window.__game.bodyMachine=bodyMachine;window.__game.fireMetalBlast=fireMetalBlast;window.__game.riffStep=riffStep;window.__game.crownCharge=crownCharge;window.__game.galliumRibbons=galliumRibbons;window.__game.structureGrip=()=>structureGrip;window.__game.riftMarks=riftMarks;window.__game.galliumGrabWorld=galliumGrabWorld;window.__game.gripState=()=>({active:worldGripActive,type:structureGrip?'structure':heldCar?'car':heldCitizen?'citizen':heldActor?'actor':null,hasLimbTarget:!!gripTarget,metal:{x:P.o.position.x,y:P.o.position.y,z:P.o.position.z}});window.__game.factionActors=factionActors;window.__game.slottaAnimation=()=>slottaAnimationSnapshot(slottaAnimator);window.__game.slottaAttack=()=>slottaAttackTelemetry({animator:slottaAnimator,pending:slottaPendingGame,loadout:slottaConsole});window.__game.slottaLoadout=()=>({active:[...slottaConsole.active],stored:[...slottaConsole.stored],archive:[...(slottaConsole.archive||[])]});window.__game.metalBlasts=metalBlasts;window.__game.slottaCombat=slottaCombat;window.__game.metalStory=metalStory;window.__game.metalControllerV3=metalPadV3;window.__game.saveMetalStory=saveMetalStory;window.__game.metalStoryChapter=()=>metalStoryChapter(metalStory);window.__game.controllerSnapshot=()=>{const g=navigator.getGamepads?.()?.find(Boolean);return {connected:!!g,axes:g?.axes?.slice(0,4),buttons:g?.buttons?.map(b=>b.pressed),bodyMode:bodyMachine.mode,impactMode:structureImpact.mode,heldCar:!!heldCar,blastCount:metalBlasts.length,actors:factionActors.length,errors:window.__errors.slice(-5)}};window.__game.physicsTelemetry=physicsTelemetry;window.__game.physicsReport=()=>analyzePhysics(physicsTelemetry.export());window.__game.MSK=MSK;window.__game.ground=()=>onGround;window.__game.bootReport=()=>boot.getStatus();initMetalStory();
  if(SLOTTA_BROWSER_QA)installSlottaBrowserQA();loop();await setForm(0);
 }catch(e){boot.failed(e);window.__errors.push(String(e));}})();
