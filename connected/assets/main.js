import {createCharge,stepCharge} from './merkabah_charge.js';
import {createSavannahMetalController,shouldGripWorld} from './metal_skylab_v3_bridge.mjs';
import {loadMissionAsset,createMissionFallback,MISSION_ASSET_TIMEOUTS} from './mission_asset_recovery.js';
import {readMetalCheckpoint,writeMetalCheckpoint,advanceMetalStory,metalStoryChapter} from './metal_story_engine.js';
import {createCombatBody,applyCombatHit,stepCombatBody,blastDirection} from './metal_combat_physics.js';
import {MetalRooftopDuelPilot} from './metal_aerial_duel_pilot.js';
import {RooftopPursuitMission} from './metal_rooftop_pursuit.js';
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
import {RS,createRealSkate,padToInput,goAirborne} from './real_skate_core.mjs'; // PROPOSAL / PUBLISH HOLD (?real_skate=1)
import {GALLOP,createGallop,press as gallopPress,step as gallopStep,landed as gallopLanded,breakChain as gallopBreak,strideSpeed} from './gallium_gallop_core.mjs'; // PROPOSAL / HOLD
import {SNAP,createSnap,mark as snapMark,commit as snapCommit,step as snapStep} from './snapline_core.mjs'; // PROPOSAL / HOLD
import {PRO,createPro,feed as proPFeed,step as proPStep,serialize as proSerialize,deserialize as proDeserialize} from './prologue_core.mjs'; // Prologue PROPOSAL / HOLD
import {SC,ROLES,createCrew,alert as scAlert,step as scStep,markOut as scMarkOut,bind as scBind,take as scTake,boundCount as scBoundCount,resetCrew as scReset} from './scrap_crew_core.mjs'; // PROPOSAL / HOLD
import {createRide,stepRide,boardPose,bodyHeading,bankLine,stepLooseBoard} from './real_skate_ride.mjs';
import {createSkateYard,buildSkateYardMeshes} from './skate_yard_world.mjs';
import {createTestYardSession} from './testyard_session_score.mjs';
import {analyzePhysics} from './physics_analysis.js';
import {makeGalliumLimb,galliumLiquidMat,galaxyCrystalMat,GU} from './gallium_limb.js';
import {GLOB,createGlob,formGlob,launchGlob,stepGlob,globRadius,carImpulse,foeImpact,createTumble,stepTumble,tumbleResult,splat} from './gallium_glob_core.mjs'; // PROPOSAL / HOLD
import {VILLAINS,createVillainState,stepVillain,damageMul,echoWarnings,pullSpike,douseZone} from './villain_core.mjs';
import {DRAW,createDraw,stepDraw} from './metal_draw_core.mjs'; // PROPOSAL / HOLD
import {COMBOS,createCombos,feed} from './power_combo_core.mjs';
import {RF,createReframers,wake,hit,rescue,step,hitArm,hitWheel,react,repairPart,coolNests,loseReframerTarget} from './reframer_core.mjs';
import {vehicle,step as driveStepPhys,deadzone} from './drive_physics.mjs';
import {KIT,createKit,bAction as kitBAction,addPuddle as kitAddPuddle,pullStep as kitPullStep,form as kitForm,meltHand as kitMeltHand,blast as kitBlast,shieldHit as kitShieldHit,strikeMods as kitStrikeMods,serializePuddles as kitSerializePuddles,loadPuddles as kitLoadPuddles} from './gallium_kit_core.mjs'; // PROPOSAL / HOLD
import {FB,createSquad as fbCreateSquad,hitUnit as fbHitUnit,hitDrone as fbHitDrone,step as fbStep,allDown as fbAllDown,platesOn as fbPlatesOn} from './framebreaker_core.mjs'; // PROPOSAL / HOLD
import {createLoose} from './board_body.mjs';
import {WT,createWT,step as wtStep,hitLimb,hitKeeper,observe as wtObserve,serialize as wtSave,restore as wtRestore} from './wrong_target_core.mjs'; // Wrong Target PROPOSAL / HOLD
import {EP1,createEp1,step as ep1Step,feed as ep1Feed,fightAbandoned as ep1Abandon,replay as ep1Replay,serialize as ep1Save,deserialize as ep1Load} from './ep1_mission_core.mjs'; // Ep.1 PROPOSAL / HOLD // ReFramer Rush drive model (owner source)
import {MAT,build,constructHeight,constructRails,reclaim,damageConstruct,railFrom,railSegments,bendRail,straightenRail,createWall,hitWall,wallState,repairWall,createWorldState,currentJob,checkJobs,serialize,deserialize} from './malleable_world_core.mjs'; // PROPOSAL / HOLD
import {HUNT,createReframerHunt,stepReframerHunt,hitReframerArm,reframerHuntSnapshot} from './reframer_hunt_core.mjs';
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
// Explicit opt-in training arena; inactive normal Savannah remains fully unchanged.
const MISSION05=new URLSearchParams(location.search).get('mission05')==='1'; // PUBLISH HOLD
const AERIAL_DUEL_PILOT=new URLSearchParams(location.search).get('aerial_duel')==='1'&&!MISSION05;
// Asset IK probe is opt-in and never runs during Mission 05 or the ordinary Savannah loop.
const REFRAMER_IK_PROBE=AERIAL_DUEL_PILOT&&new URLSearchParams(location.search).get('reframer_ik')==='1';
const REFRAMER_SQUAD=new URLSearchParams(location.search).get('reframer_squad')==='1'&&!MISSION05&&!AERIAL_DUEL_PILOT; // extra independent ReFramers, source-preserving and opt-in
const REFRAMER_HUNT=(new URLSearchParams(location.search).get('reframer_hunt')==='1'||REFRAMER_SQUAD)&&!MISSION05&&!AERIAL_DUEL_PILOT; // original ReFramer bodies; optional search/tether
const TEST_YARD_SKATE=new URLSearchParams(location.search).get('skate_yard')==='1'||MISSION05;
const REAL_SKATE=new URLSearchParams(location.search).get('real_skate')!=='0'&&!MISSION05; // ON by default since 2026-11-06 (RB1); ?real_skate=0 restores the old skate + box kickers
const METAL_POWER_LAB=new URLSearchParams(location.search).get('metal_abilities')==='1'&&!MISSION05&&!AERIAL_DUEL_PILOT; // strictly opt-in training / HOLD
const METAL_STORY_MOLD=new URLSearchParams(location.search).get('metal_campaign')==='1'&&!MISSION05&&!AERIAL_DUEL_PILOT; // end-backward canon story preview, opt-in PUBLISH HOLD
let skYard=null; // real-skate park heightfield (only with ?real_skate=1) // fix missing flag from merged PR34; preserve default
let metalPowerLab=null; // never mounted during ordinary Savannah or Mission05
let reframerSquad=null; // no extra AI or meshes in baseline; dynamic source adapter only on explicit opt-in
let metalPowerWheel=null; // opt-in actual ability selection, never owns Metal locomotion
let metalStoryMold=null; // source 30-episode narrative + physically demonstrated first rhythm
function armorDamage(dmg){return metalPowerLab?.absorbDamage(dmg)??dmg;} // opt-in only; ordinary baseline unchanged
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
 foundry:{bx:1,by:1,name:'Foundry Steps · civic shuttle stop',src:'Wrong Target (PROPOSAL placement)'},
 morrow:{bx:-1,by:-1,name:'Morrow Block · Field Studio · Depot · Market',src:'Ep.1 Concrete Has a Tempo (PROPOSAL placement)'},
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
 buildSkatepark(SPOTS.skate.c);buildField(SPOTS.field.c);buildFight(SPOTS.fight.c);buildDojo(SPOTS.dojo.c);buildForge(SPOTS.forge.c);buildPluto(SPOTS.pluto.c);buildHome(SPOTS.home.c);setMsg('Morrow block (Quaternius CC0 kits)…');await buildMorrowBlock(SPOTS.morrow.c);setMsg('Foundry Steps…');await buildFoundry(SPOTS.foundry.c);
 // trees
 const trunkM=new THREE.MeshStandardMaterial({color:0x5a3d22}),leafM=new THREE.MeshStandardMaterial({color:0x3c6b2c,roughness:1});
 for(let k=0;k<(LITE?16:40);k++){const x=(rnd()-.5)*360,z=(rnd()-.5)*360; if(Math.abs(((x%56)+56)%56-28)<8)continue;
  const t=new THREE.Group();const tr=new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,3),trunkM);tr.position.y=1.5;const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8,1),leafM);lf.position.y=3.8;t.add(tr,lf);
  t.traverse(o=>o.castShadow=true);t.position.set(x,0.25,z);if(!colliders.some(b=>b.containsPoint(new THREE.Vector3(x,1,z))))scene.add(t);}
}
const lamps=[];
const worldLabels=[];function label(text,pos,color){const sp=label0(text,pos,color);if(sp){worldLabels.push(sp);sp.visible=HELP.on;}return sp;} // in-world words hide with help off
function label0(text,pos,color='#d6c2ff'){const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');g.fillStyle='rgba(10,8,20,.75)';g.roundRect(0,0,512,96,20);g.fill();g.fillStyle=color;g.font='bold 44px system-ui';g.textAlign='center';g.fillText(text,256,62);
 const s=new THREE.Mesh(new THREE.PlaneGeometry(8,1.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,side:THREE.DoubleSide}));s.position.copy(pos);scene.add(s);return s;}
const signs=[];
function sign(spot,y=6){const s=label(spot.name,spot.c.clone().add(new THREE.Vector3(0,y,-BLOCK/2+1)));signs.push(s);}
const ramps=[];// {box, type}
function buildSkatepark(c){sign(SPOTS.skate);
 if(REAL_SKATE){skYard=createSkateYard({cx:c.x,cz:c.z,base:0.25});buildSkateYardMeshes(THREE,scene,skYard);return;} // replaces the four box kickers, rail and torus with real surfaces
 const m=new THREE.MeshStandardMaterial({color:0x9a9a9e,roughness:.6});
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
const merkaba=starTetra(.9,new THREE.MeshStandardMaterial({color:0x000,emissive:VIOLET,emissiveIntensity:2,wireframe:true})); // Star Merkaba: two interlocked tetrahedramerkaba.visible=false;

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
 // View long-hold opens wheel; short tap still opens the original map.
 // While the wheel is open, never synthesize conflicting grapple/swing/board inputs.
 if(metalPowerWheel?.pollGamepad(gp,dt)){RSK.gp=gp||null;return {x:0,y:0};}
 const v3=metalPadV3.poll(gp,dt);
 RSK.gp=gp||null;
 if(typeof DRV!=='undefined'&&DRV.active){for(const [i,k] of Object.entries(padMap)){if(padPrev[i])keys[k]=false;padPrev[i]=false;}return {x:0,y:0};}
 if(RSK.active&&gp){ // REAL SKATE owns A, L2, R2 and both sticks while riding; B still dissolves / bails, Menu still pauses
  for(const [i,k] of Object.entries(padMap)){if(padPrev[i])keys[k]=false;padPrev[i]=false;}
  if(v3.paused)return {x:0,y:0};
  const b=!!gp.buttons[1]?.pressed;if(b){RSK.bHeld=(RSK.bHeld||0)+dt;if(RSK.bHeld>.55&&!RSK.bFired){RSK.bFired=true;pressed.KeyB=true;}}else{RSK.bHeld=0;RSK.bFired=false;}RSK.prevB=b; // tap/hold B = foot brake · hold 0.55 s = step off + dissolve
  const rb=!!gp.buttons[5]?.pressed;if(rb&&!RSK.prevRB){pressed.KeyQ=true;keys.KeyQ=true;}if(!rb&&RSK.prevRB)keys.KeyQ=false;RSK.prevRB=rb; // R1 still throws the Gallium line
  return {x:0,y:0};
 }
 if(metalPadV3.mode==='skylab'){
  // Switching modes releases only keys previously synthesized by Classic.
  for(const [i,k] of Object.entries(padMap)){if(padPrev[i])keys[k]=false;padPrev[i]=false;}
  if(!v3.connected){if(v3PrevFlight&&st.flying)pressed.KeyF=true;v3PrevFlight=false;v3GrabHeld=false;return null;}
  const held=new Set(v3.held||[]),edges=new Set(v3.edges||[]),combo={...(v3.combo||{})};if(KITV.K.pulling){for(const k in combo)combo[k]=false;edges.delete('roar');edges.delete('slam');edges.delete('dash');} // the pull owns X / Y / B
  if(v3.paused)return {x:0,y:0};
  if(edges.has('jump'))pressed.Space=true;
  if(edges.has('dash')){
   // SkyLab B forges/dissolves on grounded non-combat streets; B remains dodge in combat/air.
   // One controller edge = one request, never repeat while B stays held.
   if(GAL_FORGE_ENABLED&&forgeController?.busy){/* ignore B while the forge is forming */}
   else if(GAL_FORGE_ENABLED&&!FG.inFight&&onGround&&!st.flying&&!st.swing){if(!KITV.on)pressed.KeyB=true;} // Gallium kit owns B tap/hold
   else pressed.Semicolon=true;
  }
  if(edges.has('roar')){if(KITV.K.pulling)KITV.formReq='sword';else pressed.Numpad4=true;}
  if(edges.has('slam')){if(!onGround)v3SpinTime=.75;} // Y on the ground = hold for a Gallium glob
  if(edges.has('grapple'))pressed.KeyQ=true;
  // L1 (tentacle): tap = pulse/blast on release, hold = draw metal (see drawTick)
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
function floorAt(p){let y=groundY;for(const b of colliders){if(p.x>b.min.x-.3&&p.x<b.max.x+.3&&p.z>b.min.z-.3&&p.z<b.max.z+.3&&p.y>=b.max.y-.35&&b.max.y>y)y=b.max.y;}if(skYard){const f=skYard.walkFloor(p.x,p.z,p.y,.45);if(f!=null&&f>y)y=f;}if(typeof MWB!=='undefined'&&MWB.S){const c=mwFloor(p.x,p.z);if(c>y&&c<=p.y+.45)y=c;}return y;} // rooftops are real floors
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
function endSpar(win){bell();const R=rivalSt;R.active=false;$('foe').style.display='none';R.act=null;R.queue=[];R.guard=false;if(R.kb)R.kb.set(0,0,0);R.sm=null;if(rivalMat)rivalMat.emissiveIntensity=0;play(rival,win?'No':'Dance');toast(win?'Stance broken — you win (nonlethal spar)':'Your stance broke — rematch anytime');if(win){plog('achievements','Won a Fight Lot spar');R.level=Math.min(5,(R.level||1)+1);}R.stance=1;FG.act=null;FG.stun=0;st.hp=1;}
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
const yardSession=yard&&new URLSearchParams(location.search).get('skate_yard')==='1'?createTestYardSession():null;
let renderYardSession=()=>{};
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
 // Only an explicitly requested skate_yard=1 session gets score UI. Mission05 alone does not.
 if(yardSession){
 const score=document.createElement('section');score.id='testyardScoreboard';score.setAttribute('aria-label','Test Yard practice session');
 score.style.cssText='display:flex;gap:5px;flex-wrap:wrap;align-items:center;width:100%;background:#171326e8;color:#f6e8ff;border:1px solid #977ed4a9;border-radius:9px;padding:7px;font:700 11px system-ui';
 const readout=document.createElement('span');readout.id='testyardScoreReadout';readout.style.cssText='flex:1;min-width:135px;font-variant-numeric:tabular-nums';
 for(const [mode,label] of [['run','120s RUN'],['free','FREE SKATE']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.setAttribute('aria-label','Start Test Yard '+label);
  b.style.cssText='font:700 10px system-ui;color:#eee7ff;border:1px solid #a68fe0;border-radius:7px;background:#33214f;padding:7px 8px;touch-action:manipulation';
  b.addEventListener('click',()=>{yardSession.start(mode);renderYardSession();});
  score.appendChild(b);
 }
 score.appendChild(readout);ui.appendChild(score);
 renderYardSession=()=>{
  const x=yardSession.snapshot();
  const clock=x.mode==='run'?(x.finished?'FINISHED':Math.ceil(x.remaining)+'s'):'FREE';
  readout.textContent='METAL TEST YARD · '+clock+' · '+x.score+' pts'+
   (x.comboMultiplier?' · LINE ×'+x.comboMultiplier+' '+x.pending+' pending':'');
 };
 renderYardSession();
 }
 document.body.append(ui);
}
function finishYardAir(){
 if(!yard)return true;
 const landed=yard.land();
 if(landed.failed){skBail(landed.reason);bodyMachine.fall(vel.x,vel.z);return false;}
 if(landed.points>0){yardSession?.addTricks(landed.names,landed.points);st.comboPend+=Math.min(4,landed.points/120);toast(landed.names.join(' + ')+' · LANDED');mission05?.land({names:landed.names,points:landed.points,position:P.o.position,board:st.board});}
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
function endManual(){const t=sk.manual.t;sk.manual=null;if(t>.35){st.comboPend++;yardSession?.addTricks(['Manual'],Math.round(160*t));toast('Manual '+t.toFixed(1)+' s');}}
function skOllie(){const s=Math.hypot(vel.x,vel.z);vel.y=MSK.OLLIE+s*MSK.POP+sk.comp*MSK.COMP;if(sk.manual)endManual();
 sk.comp=0;sk.stroke=-1;sk.airT=0;onGround=false;st.comboPend++;play(P,P.acts.Ollie?'Ollie':'Jump',true);}
function skBail(why){
 if(yard&&sk.bailT>0)return;
 bail();yardSession?.bail();toast(why);sk.stroke=-1;sk.manual=null;vel.x*=.2;vel.z*=.2;
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

// ---------- REAL SKATE (PROPOSAL / PUBLISH HOLD, opt-in ?real_skate=1) ----------
// Controller-first skateboarding: A = one push stroke · left stick = LEAN (trucks, grip, powerslide) + weight (manual, brake)
// L2+R2 = bend the knees · snap the back-foot trigger = pop · ease the front one off = slide · squeeze both again = feet on the bolts.
// A foot whose trigger is off can flick its stick to kick the board (regular: left stick = front foot flips, right stick = back foot scoops).
// Physics + rules: real_skate_core.mjs / real_skate_ride.mjs (node-tested). Keyboard is an assist, not the design target.
const RSK_STANCE=new URLSearchParams(location.search).get('stance')==='goofy'?'goofy':'regular';
const RSK={active:false,R:null,gp:null,prevI:{},prevB:false,prevRB:false,yaw:0,tilt:null,kb:{lean:0,spaceT:-1,relT:-1,flick:null},quiet:0,shown:0,hud:null,lastName:'',perfects:0};
function goAirborneRide(R){goAirborne(R.core,'Air',0);}
function realRideOk(){return !!(REAL_SKATE&&P&&st.board&&!st.wall&&!st.swing&&!st.flying&&!aerialDuel?.active&&!forgeController?.busy&&bodyMachine.mode!=='fallen'&&bodyMachine.mode!=='recovering');}
const _rskW={ // world adapter for the ride: Skatepark heightfield + rooftops, flat elsewhere
 floorY:(x,z)=>{const y=RSK.R?RSK.R.p.y:groundY;let f=floorAt({x,y:y+.3,z});if(skYard&&skYard.inside(x,z))f=Math.max(f,skYard.floorY(x,z));const c=mwFloor(x,z);if(c>f)f=c;return f;},
 grad:(x,z)=>{if(mwFloor(x,z)>=0||mwFloor(x+.05,z)>=0||mwFloor(x,z+.05)>=0||mwFloor(x-.05,z)>=0||mwFloor(x,z-.05)>=0){const e=.03,h0=_rskW.floorY(x,z),pk=(a,b)=>{const wa=Math.abs(a)>.25,wb=Math.abs(b)>.25;return wa&&!wb?b/e:wb&&!wa?a/e:wa&&wb?0:(a+b)/(2*e);};return [pk(_rskW.floorY(x+e,z)-h0,h0-_rskW.floorY(x-e,z)),pk(_rskW.floorY(x,z+e)-h0,h0-_rskW.floorY(x,z-e))];}return skYard&&skYard.inside(x,z)?skYard.grad(x,z):[0,0];},
 normal:(x,z)=>{const [gx,gz]=_rskW.grad(x,z);const n=Math.hypot(gx,1,gz);return {x:-gx/n,y:1/n,z:-gz/n};},
 nearestRail:p=>skYard?skYard.nearestRail(p):null,
 railPoint:(r,t)=>skYard.railPoint(r,t),
};
function realKeyboardInput(dt){ // assist mapping (W push · A/D lean · S weight back · Space knees/pop · arrows flick)
 const K=RSK.kb,I={lx:0,ly:0,rx:0,ry:0,l2:0,r2:0,a:false,aEdge:false};
 I.aEdge=tap('KeyW');I.a=!!keys.KeyW;
 const want=(keys.KeyD?1:0)-(keys.KeyA?1:0);K.lean+=THREE.MathUtils.clamp(want-K.lean,-dt*4,dt*4);I.lx=K.lean;
 if(isTouch&&(stick.x||stick.y)){I.lx=THREE.MathUtils.clamp(stick.x,-1,1);const fwd=stick.y<-.6;if(fwd&&!K.tFwd)I.aEdge=true;K.tFwd=fwd;if(stick.y>.55)I.ly=.58;} // touch: stick = lean, flick it forward = push
 I.ly=keys.KeyS?(keys.ShiftLeft||keys.ShiftRight?.9:.58):(keys.KeyX?-.58:0);I.grab=!!keys.KeyC;
 const t=performance.now()/1000;
 if(keys.Space){if(K.spaceT<0)K.spaceT=t;K.relT=-1;I.l2=I.r2=1;}
 else{if(K.spaceT>=0){K.relT=t;K.spaceT=-1;}if(K.relT>=0){const e=t-K.relT;I.r2=0;I.l2=e<.1?1:0;if(e>.4)K.relT=-1;}} // release Space = snap back foot, slide front 0.1 s later
 for(const [code,foot,x,y] of [['ArrowLeft','L',-1,0],['ArrowRight','L',1,0],['ArrowUp','R',0,-1],['ArrowDown','R',0,1]])if(tap(code))K.flick={foot,x,y,n:5,z:2};
 if(K.flick){const f=K.flick;if(f.z>0)f.z--;else{if(f.foot==='L'){I.lx=f.x;I.ly=f.y;}else{I.rx=f.x;I.ry=f.y;}if(--f.n<=0)K.flick=null;}}
 return I;
}
function realSkateHud(){
 if(!RSK.hud){const d=document.createElement('div');d.id='realSkateHud';d.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:30;pointer-events:none;font:600 12px/1.35 system-ui;color:#e9e4ff;background:rgba(12,10,22,.62);border-radius:10px;padding:7px 12px;min-width:260px;text-align:center;';
  d.innerHTML='<div id="rskTrick" style="font-size:15px;min-height:19px"></div><div style="display:flex;gap:8px;align-items:center;justify-content:center;margin:4px 0"><span>L2</span><span style="width:70px;height:6px;background:#333;border-radius:3px;overflow:hidden"><i id="rskL" style="display:block;height:100%;width:0;background:#b9a6ff"></i></span><span id="rskBal" style="width:60px;height:6px;background:#333;border-radius:3px;position:relative"><i id="rskBalDot" style="position:absolute;top:-2px;left:28px;width:4px;height:10px;background:#ffb11f"></i></span><span style="width:70px;height:6px;background:#333;border-radius:3px;overflow:hidden"><i id="rskR" style="display:block;height:100%;width:0;background:#b9a6ff"></i></span><span>R2</span></div><div id="rskHint" style="opacity:.8;font-weight:500"></div>';
  document.body.appendChild(d);RSK.hud=d;}
 const d=RSK.hud;d.style.display=RSK.active?'block':'none';if(!RSK.active||!RSK.R)return;
 const S=RSK.R.core,I=RSK.prevI;$('rskL').style.width=(100*(I.l2||0))+'%';$('rskR').style.width=(100*(I.r2||0))+'%';
 const bal=S.mode==='grind'&&S.grind?S.grind.b:S.manual?(S.manual.e||0)/.3:S.lean/.42;$('rskBalDot').style.left=(28+THREE.MathUtils.clamp(bal,-1,1)*28)+'px';
 const pad=!!RSK.gp;let h;
 if(S.mode==='grind')h=pad?'Left stick: tiny corrections keep you on · weight fwd/back = nosegrind/5-0 · L2+R2 then snap = pop out':'A/D small taps balance · Space then release = pop out';
 else if(S.mode==='air')h=S.air&&S.air.freed&&!S.air.caught?(pad?'Watch the deck — squeeze L2+R2 a beat before it comes grip-up':'Space a beat before it comes around = catch'):(pad?'Squeeze both = feet on the bolts · hold X + stick = grab (let go before landing)':'Space = realign · hold C = grab');
 else if(S.loadT>0)h=pad?'Snap R2 (back foot) to pop · ease L2 off = slide · flick a free foot\'s stick to flip':'Release Space = pop · arrows right after = flip';
 else h=pad?'Tap A = push · left stick = lean, not steer · squeeze L2+R2 = knees':'Tap W = push · A/D lean · S manual · hold Space = knees';
 $('rskHint').textContent=RSK.shown>12?'':h;$('rskTrick').textContent=RSK.lastName;
}
// ---------- GALLIUM GALLOP + CROWN POINTS / MAGNETIC SNAPLINE (PROPOSAL / HOLD, 2026-11-07) ----------
// Gallop (S1E9): X on the ground while riding (C on keys) = THOOM-tik stride off the foothold; tap again on the beat after
// each landing to chain. The Gallium a stride spends stays behind as the anchor — a puddle you can pull back.
// Crown points (S1E11): D-pad ◀ (1 on keys) marks the next anchor ahead (up to 3); D-pad ▶ (2) commits the Snapline —
// a visible arc that clears every roof, can't be cancelled, and never teleports. Anchors drip down as puddles after.
const GLP=createGallop();
const SNP={S:createSnap(),dlPrev:false,drPrev:false,marks:[],line:null,arcLine:null};
const snapHeight=(x,z)=>Math.max(floorAt({x,y:1e4,z}),mwFloor(x,z));
function gallopTick(dt,R,S,I,prevGrab){
 if(I.grab&&!prevGrab&&S.mode!=='air'&&R.bailT<=0){const r=gallopPress(GLP,{mode:S.mode,gal:st.gal,lean:I.lx});
  if(!r.ok&&r.why==='material')toast('Galaxy Gallium low — pull some back (L2+R2 on foot)');}
 if(GLP.phase!=='idle')I.grab=false; // a stride is not a grab
 const r=gallopStep(GLP,dt,S.mode);if(!r)return;
 if(r.type==='compress'){setViolet(.4+.4*r.k);return;}
 if(r.type!=='release')return;
 if(st.gal+1e-9<r.cost){gallopBreak(GLP);return;}
 st.gal=Math.max(0,st.gal-r.cost);kitPuddleAdd(R.p.x,R.p.y,R.p.z,r.cost); // THOOM: the anchor stays on the foothold
 const h=S.heading+r.steer;S.heading=h;S.speed=strideSpeed(S.speed,r.dv,RS.TOP);
 if(S.mode==='grind'){S.grind=null;R.rail=null;}
 R.v={x:Math.sin(h)*S.speed,y:r.vy,z:Math.cos(h)*S.speed};R.airMax=R.p.y;goAirborne(S,'Gallop');
 setViolet(1);beep(r.onBeat?95:78,.09,'square',.05);burst(_fv2.set(R.p.x,R.p.y+.15,R.p.z),r.onBeat?18:10,3);RSK.quiet=0;
 if(r.turnBreak)whisper('Hard turn','it broke the rhythm');}
function snapClearMarks(){for(const m of SNP.marks)scene.remove(m);SNP.marks=[];}
function snapDrop(drop){for(const p of drop||[])kitPuddleAdd(p.x,snapHeight(p.x,p.z),p.z,p.amount);snapClearMarks();} // the anchors drip down — nothing is lost
function snapInput(R,S){
 const gp=RSK.gp,dl=!!(gp&&gp.buttons[14]&&gp.buttons[14].pressed),dr=!!(gp&&gp.buttons[15]&&gp.buttons[15].pressed);
 const markE=(dl&&!SNP.dlPrev)||tap('Digit1'),goE=(dr&&!SNP.drPrev)||tap('Digit2');SNP.dlPrev=dl;SNP.drPrev=dr;
 if(SNP.S.state==='arc')return; // no cancel mid-arc
 if(markE){if(!swingAnchors)buildSwingAnchors();const h=S.speed<-.3?S.heading+Math.PI:S.heading;
  const r=snapMark(SNP.S,R.p,h,swingAnchors,st.gal);
  if(r.ok){st.gal=Math.max(0,st.gal-r.cost);const m=new THREE.Mesh(new THREE.TorusGeometry(.55,.07,8,20),new THREE.MeshBasicMaterial({color:0xb983ff}));m.position.set(r.point.x,r.point.y+.35,r.point.z);m.rotation.x=Math.PI/2;scene.add(m);SNP.marks.push(m);
   beep(520+r.n*120,.06,'triangle',.04);whisper('Crown point '+r.n+'/'+SNAP.MAX,r.n<SNAP.MAX?'mark another or commit the Snapline':'commit the Snapline');}
  else toast(r.why==='material'?'Galaxy Gallium low':r.why==='max'?'Three Crown points — commit the Snapline':'No anchor ahead');}
 if(goE){const r=snapCommit(SNP.S,{x:R.p.x,y:R.p.y+.1,z:R.p.z},snapHeight);
  if(r.ok){gallopBreak(GLP);beep(220,.12,'sawtooth',.04);whisper('SNAPLINE','committed — no way off the arc');}
  else toast(r.why==='points'?'Mark a Crown point first':r.why==='landing'?'No floor to land on past that point':'No clear arc over that');}
}
function snapVis(){
 const S=SNP.S,show=S.state==='arc'||S.points.length>0;
 if(!SNP.line){SNP.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xb983ff,transparent:true,opacity:.85}));SNP.line.frustumCulled=false;scene.add(SNP.line);}
 SNP.line.visible=show;if(!show)return;
 let pts;
 if(S.state==='arc'){pts=[];for(let i=0;i<S.path.length;i+=2)pts.push(S.path[i]);pts.push(S.path[S.path.length-1]);}
 else{const p=P.o.position;pts=[{x:p.x,y:p.y+.4,z:p.z},...S.points.map(q=>({x:q.x,y:q.y+.35,z:q.z}))];}
 const a=new Float32Array(pts.length*3);pts.forEach((q,i)=>{a[i*3]=q.x;a[i*3+1]=q.y;a[i*3+2]=q.z;});
 SNP.line.geometry.setAttribute('position',new THREE.BufferAttribute(a,3));SNP.line.geometry.computeBoundingSphere();
 for(const m of SNP.marks)m.rotation.z+=.03;}
function snapIdleTick(dt){ // Crown points left too long drip down; a ride knocked off mid-arc drops the arc where it is
 const S=SNP.S;
 if(S.state==='arc'&&!RSK.active){const drop=S.points;S.points=[];S.state='idle';S.path=null;S.cum=null;snapDrop(drop);}
 if(S.state!=='arc'){const r=snapStep(S,dt);if(r&&r.type==='expire'){snapDrop(r.drop);whisper('Crown points dripped down','the Gallium is on the floor — pull it back');}}
 snapVis();}
function snapArcStep(dt,R,S,pp){ // the ride is carried along the committed arc
 const r=snapStep(SNP.S,dt);if(!r)return;
 R.p={x:r.pos.x,y:r.pos.y,z:r.pos.z};pp.set(r.pos.x,r.pos.y,r.pos.z);
 if(r.type==='land'){const h=Math.atan2(r.tan.x,r.tan.z);S.mode='ground';S.air=null;S.grind=null;S.manual=null;R.rail=null;S.heading=h;S.speed=Math.min(RS.TOP,SNAP.SPEED*.6);
  R.v={x:Math.sin(h)*S.speed,y:0,z:Math.cos(h)*S.speed};vel.set(R.v.x,0,R.v.z);onGround=true;RSK.yaw=h;sk.h=h;sk.s=S.speed;
  snapDrop(r.drop);proFeed('snap');proHook('power','snapline');RSK.lastName='SNAPLINE';st.comboPend+=2;beep(1250,.04,'triangle',.04);whisper('Snapline','four wheels down');return;}
 const sp=SNAP.SPEED;R.v={x:r.tan.x*sp,y:r.tan.y*sp,z:r.tan.z*sp};vel.set(R.v.x,R.v.y,R.v.z);onGround=false;
 RSK.yaw=Math.atan2(r.tan.x,r.tan.z);S.heading=RSK.yaw;RSK.tilt=null;setViolet(1);}
function realSkateStep(dt,pp){
 if(!RSK.R){ // board just went down: start the ride from Metal's current motion
  if(bodyMachine.mode==='grounded')sk.bailT=0; // a finished bail never carries into a fresh ride
  const core=createRealSkate({stance:RSK_STANCE}); // canon: Metal rides regular (prosthetic left foot forward); ?stance=goofy = PROPOSAL player option
  const hs=Math.hypot(vel.x,vel.z),h=hs>.3?Math.atan2(vel.x,vel.z):yaw;
  RSK.R=createRide(core,_rskW,{x:pp.x,z:pp.z,heading:h});RSK.R.p.y=Math.max(pp.y,RSK.R.p.y);core.speed=hs;RSK.yaw=h;
  if(!onGround){RSK.R.v={x:vel.x,y:vel.y,z:vel.z};goAirborneRide(RSK.R);}
 }
 const R=RSK.R,S=R.core;
 R.bailT=Math.max(R.bailT,sk.bailT); // fight/traffic bails from the main game stop the ride too
 snapInput(R,S);
 if(SNP.S.state==='arc'){snapArcStep(dt,R,S,pp);realSkateHud();return;} // committed: the arc carries him, input can't cancel it
 const prevGrab=!!(RSK.prevI&&RSK.prevI.grab);
 const I=RSK.gp?padToInput(RSK.gp,RSK.prevI):realKeyboardInput(dt);RSK.prevI=I;
 gallopTick(dt,R,S,I,prevGrab);
 const ev=stepRide(R,I,dt);
 if(mwFloor(R.p.x,R.p.z)>=0&&S.mode==='ground')MWB.lastRampT=performance.now()/1000;
 pp.set(R.p.x,R.p.y,R.p.z);
 const preHit=collide(pp); // buildings, parked structures
 if(preHit&&lastHit){R.p.x=pp.x;R.p.z=pp.z;if(S.mode==='ground'&&Math.abs(S.speed)>MSK.WALL_BAIL){ev.push({type:'bail',why:'SLAMMED A WALL'});R.bailT=.9;S.speed*=.2;}else S.speed*=-.2;}
 vel.set(R.v.x,R.v.y,R.v.z);onGround=S.mode!=='air';st.grinding=S.mode==='grind';
 // mirror into the shared skate state so the stroke IK, clips, chase cam and HUD keep working
 sk.h=S.heading;sk.s=Math.abs(S.speed);sk.stroke=S.stroke;sk.manual=S.manual;sk.slide=!!S.sliding;sk.comp=S.crouch||0;sk.carve=0;
 const n=R.n||{x:0,y:1,z:0};
 RSK.yaw=S.mode==='air'?bodyHeading(R):S.mode==='grind'&&R.rail?S.heading+(R.rail.slide?Math.PI/2:0):S.heading+(S.slide||0); // powerslide: board + body swing sideways while travel carries on
 if(S.mode==='ground'||S.mode==='grind'){RSK.tilt=RSK.tilt||new THREE.Quaternion();RSK.tilt.setFromUnitVectors(_up0,_iV.set(n.x,n.y,n.z));
  // the rider leans with the board (toe/heel edge) — lean is the steering, so you should see it
  const lean=S.mode==='grind'&&S.grind?S.grind.b*.35:(S.lean||0)*.75;_rlq.setFromAxisAngle(_iV.set(Math.sin(RSK.yaw),0,Math.cos(RSK.yaw)),lean);RSK.tilt.multiply(_rlq);}
 else RSK.tilt=null;
 RSK.quiet+=dt;
 for(const e of ev){
  if(e.type==='pop'){proFeed('pop');play(P,P.acts.Ollie?'Ollie':'Jump',true);st.comboPend++;sk.airT=0;RSK.quiet=0;beep(180,.05,'triangle',.03);}
  else if(e.type==='perfectPop'){RSK.lastName='PERFECT POP';beep(660,.05,'triangle',.03);}
  else if(e.type==='kick'){beep(e.role==='front'?520:380,.04,'square',.025);}
  else if(e.type==='catch'||e.type==='realign'){beep(300,.03,'triangle',.03);}
  else if(e.type==='land'){if(GLP.phase==='stride'){const g=gallopLanded(GLP,e.ok);if(g&&e.ok){proFeed('gallop',g.chain);proHook('power','gallop');RSK.lastName='GALLOP ×'+g.chain;beep(1500,.025,'triangle',.03);}}mariOnLand(e);RSK.quiet=0;if(e.ok&&e.airT>=.5&&MWB.S&&performance.now()/1000-MWB.lastRampT<e.airT+.4){MWB.S.stats.rampAirs++;mwSave();}if(e.pts>0&&/flip|Shove|Impossible|Varial|Tre|Laser|Heel|Kick/i.test(e.name))comboFeed('trick');if(e.pts>0){RSK.shown++;RSK.lastName=e.name+(e.quality==='perfect'?' · PERFECT':e.quality==='sketchy'?' · sketchy':'');if(e.quality==='perfect')RSK.perfects++;st.comboPend+=Math.max(1,Math.round(e.pts/150));yardSession?.addTricks([e.name],e.pts);toast(RSK.lastName);}
   sk.landT=0;sk.flash=e.quality==='perfect'?1:.5;if(P.acts.Land){play(P,'Land',true);actT=.16;}if(e.impact>9)bodyMachine.impact=e.impact;}
  else if(e.type==='grindStart'){if(/^Bent /.test(e.rail||'')&&MWB.S){MWB.S.stats.bentGrinds++;mwSave();}RSK.quiet=0;RSK.lastName=e.name;setViolet(.7);toast(e.name);beep(240,.06,'sawtooth',.02);}
  else if(e.type==='grindEnd'){RSK.quiet=0;if(e.pts){st.comboPend+=Math.max(1,Math.round(e.pts/150));yardSession?.addTricks([e.name],e.pts);}}
  else if(e.type==='powerslide'){RSK.lastName='Powerslide';}
  else if(e.type==='manualStart'){RSK.lastName=e.nose?'Nose Manual':'Manual';}
  else if(e.type==='bail'){gallopBreak(GLP);mariOnLand({ok:false,name:'',pts:0});RSK.lastName=e.why;RSK.loose=e.loose;RSK.looseR=R;RSK.looseT=0;
   if(e.fall){sk.bailT=0;skBail(e.why);bodyMachine.fall(vel.x,vel.z);}else toast(e.why);
   vel.set(e.metalV.x,vel.y,e.metalV.z);st.board=false;board.visible=true;toast('Board got away — go get it');}
 }
 // bank the line once you have rolled away clean
 if(S.mode==='ground'&&R.bailT<=0&&R.line.length&&RSK.quiet>1.4){const L=bankLine(R);if(L.names.length>1)toast(L.names.join(' + ')+' · '+L.pts);bank();}
 if(sk.bailT>0)sk.bailT=Math.max(0,sk.bailT-dt);
 realSkateHud();
}
const _rbq=new THREE.Quaternion(),_rbe=new THREE.Euler(),_rlq=new THREE.Quaternion();
function realBoardPose(pp){
 const bp=boardPose(RSK.R),S=RSK.R.core;
 // board yaw = its own heading (+ shove-it spin); pitch = pop / manual; roll = lean or flip
 const h=RSK.yaw+(S.mode==='air'?bp.yaw:0);
 _rbe.set(bp.pitch,h,S.mode==='air'?bp.roll:0,'YXZ');board.quaternion.setFromEuler(_rbe);if(RSK.tilt)board.quaternion.premultiply(RSK.tilt);
 if(bp.freed||S.mode==='air'){board.position.set(pp.x,pp.y+(bp.freed?bp.lift:0),pp.z);}
}
function realLooseTick(dt,pp){ // the board after a bail: own momentum, Metal walks over to get it
 const L=RSK.loose;if(st.board){RSK.loose=null;RSK.looseR=null;return;} // a forge/other path gave him a board
 RSK.looseT+=dt;if(RSK.looseR)stepLooseBoard(RSK.looseR,dt);
 board.visible=true;board.position.set(L.p.x,L.p.y+.06,L.p.z);_rbe.set(0,L.yaw,L.roll,'YXZ');board.quaternion.setFromEuler(_rbe);
 const d=Math.hypot(pp.x-L.p.x,pp.z-L.p.z);
 if(RSK.looseT>.6&&d<1.15&&Math.abs(pp.y-L.p.y)<1&&bodyMachine.mode!=='fallen'&&bodyMachine.mode!=='recovering'){
  st.board=true;RSK.loose=null;RSK.looseR=null;yaw=L.yaw;sk.bailT=0;vel.multiplyScalar(.3);toast('Board back under your feet');beep(330,.05,'triangle',.03);}
}
function p6Crouch(dt){ // knees follow the triggers: L2 = front (left, prosthetic) knee, R2 = back knee
 if(!P.p6||!P.legs||!RSK.R)return;const I=RSK.prevI,S=RSK.R.core,A=S.air;
 const c=THREE.MathUtils.clamp(((I.l2||0)+(I.r2||0))/2,0,1)*(S.mode==='air'?.7:1);if(c<.03&&!(A&&A.freed))return;
 P.model.position.y-=.24*c;P.o.updateMatrixWorld(true);const g=Math.max(.04,P.soleGap||.08);
 const lift=A&&A.freed&&!A.caught?.16:0; // feet off the board while it flips
 if(sk.stroke<0){legIK(P.legs.L,_iT.set(.02,DECK_TOP+g+lift,.19).applyMatrix4(P.o.matrixWorld).clone(),_pole.set(-1,0,.2).transformDirection(P.o.matrixWorld));
  legIK(P.legs.R,_iT.set(.02,DECK_TOP+g+lift,-.2).applyMatrix4(P.o.matrixWorld).clone(),_pole.set(-1,.15,-.1).transformDirection(P.o.matrixWorld));}
}

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
 const sites=['fight','skate','dojo','forge','field','home','pluto','forge','home'];
 STORY_ENEMIES.forEach((entry,i)=>{const sp=SPOTS[sites[i]];if(!sp?.c)return;
  const home=sp.c.clone().add(i>=7?new THREE.Vector3(-24,groundY,8):new THREE.Vector3(24,groundY,-8)); // on the sidewalk outside the lot, so the lot prompt never hides the villain prompt
  const VC=VILLAINS[entry.id];if(i>=sites.length)return;
  const ch=rivalGLTF?makeFighter(rivalGLTF,{top:VC?VC.color:[0x373b46,0x283c49,0x596275,0x414154,0x232933,0x4e403b,0x272238][i%7],bot:VC?0x15151b:0x171923,shoe:VC?VC.color:0x1b1b1b,h:VC?VC.h:(entry.style==='heavy'||entry.style==='boss'?2.05:1.82)}):makeChar(VC?VC.color:0x666688);
  const tag=nameTag(entry.name+(entry.ep?' · Ep.'+entry.ep:''),VC?VC.color:0xc9ccd4);tag.position.y=(VC?VC.h:1.9)+.45;ch.o.add(tag);
  ch.o.position.copy(home);scene.add(ch.o);
  const c={name:entry.name,home,state:'idle',level:i+1,members:[],story:true,entry};
  const R={kind:'crew',crew:c,label:entry.name,style:entry.style,active:false,stance:1,level:Math.min(5,i+1),out:false,slot:0,kb:new THREE.Vector3()};
  if(VC)R.vil=createVillainState(entry.id);
  const foe={ch,R};foe.tag=tag;c.members.push(foe);FOES.push(foe);STORY_FIGHTS.push(c);
 });}
function activeFoes(){return FOES.filter(f=>f.R.active&&!f.R.out);}
function crewPrompt(pp){if(FG.inFight)return null;for(const c of [...STORY_FIGHTS,...CREWS]){if(!c.home||c.state!=='idle')continue;if(pp.distanceTo(c.home)<6.5)return {text:'E — '+c.name+(c.story?(c.entry&&c.entry.ep?' · Ep.'+c.entry.ep+' '+c.entry.title+' — '+c.entry.weakness:' · story encounter (PROPOSAL)'):' wants a street spar (nonlethal)'),go:()=>startCrew(c)};}return null;}
function startCrew(c){bell();c.state='fight';for(const f of c.members){Object.assign(f.R,{active:true,stance:.55,max:.55,out:false,sm:null,act:null,queue:[],guard:false});}$('foe').style.display='block';
 toast(c.name+' — street spar! Break every stance');plog('decisions','Accepted a street spar ('+c.name+')');}
function endCrew(c,win){if(c.ep1Ctl){ep1FightOver(c,win);return;}if(c.fbCtl){fbFightOver(c,win);return;}if(c.prCtl){proFightOver(c,win);return;}bell();c.state='cool';c.cool=win?30:8;for(const f of c.members){const R=f.R;R.active=false;R.act=null;R.queue=[];R.guard=false;R.sm=null;if(f.ch.body)f.ch.body.emissiveIntensity=0;if(R.out&&!R.bound){R.getup=1.3;playT(f.ch,'GetUp',1.3);}else play(f.ch,win?'No':'Dance');}
 if(!activeFoes().length)$('foe').style.display='none';FG.act=null;FG.stun=0;st.hp=1;
 for(const f of c.members)if(f.R.vil){const id=f.R.vil.id;f.R.vil=createVillainState(id);}
 if(win&&c.entry&&c.entry.ep){FG.crewWins++;st.gal=Math.min(1,st.gal+.3);toast('Ep.'+c.entry.ep+' '+c.entry.title+' — '+c.name+' down · recording stem earned');plog('achievements','Beat '+c.name+' (Ep.'+c.entry.ep+')');}
 else if(win){FG.crewWins++;st.gal=Math.min(1,st.gal+.2);toast(c.name+' tapped out — street respect · Gallium +');plog('achievements','Won a street spar ('+c.name+')');c.level=Math.min(5,c.level+1);}
 else toast(c.name+' got you — run it back later');}
function crewTick(dt){for(const c of [...CREWS,...STORY_FIGHTS]){if(!c.home)continue;if((c.ep1Ctl||c.fbCtl)&&c.state!=='fight')continue;
 if(c.state==='cool'){c.cool-=dt;if(c.cool<=0&&!c.members.some(f=>f.R.bound&&!f.R.taken)){c.state='idle';for(const f of c.members){f.R.out=false;f.R.stance=1;f.R.bound=false;f.R.taken=false;f.R.bindSaid=false;f.ch.o.visible=true;}}}
 if(c.state==='fight'){if(c.members.every(f=>f.R.out)){endCrew(c,true);continue;}if(P.o.position.distanceTo(c.home)>28){toast('You left — '+c.name+' calls it');endCrew(c,false);continue;}}
 if(c.state!=='fight')for(const f of c.members){if(f.R.getup>0){f.R.getup-=dt;continue;}const o=f.ch.o,want=_fv2.copy(c.home).add(new THREE.Vector3(Math.cos(f.R.slot)*1.6,0,Math.sin(f.R.slot)*1.6));const v=want.sub(o.position).setY(0);const d=v.length();
  if(d>.25){o.position.addScaledVector(v.normalize(),Math.min(d,dt*1.6));o.rotation.y+=angDiff(o.rotation.y,Math.atan2(v.x,v.z))*Math.min(1,dt*6);play(f.ch,'Walking');}
  else{const near=P.o.position.distanceTo(o.position)<9,lk=near?Math.atan2(P.o.position.x-o.position.x,P.o.position.z-o.position.z):Math.atan2(c.home.x-o.position.x,c.home.z-o.position.z);o.rotation.y+=angDiff(o.rotation.y,lk)*Math.min(1,dt*4);
   if(c.state==='idle'&&f.ch.curName!=='Idle'&&f.ch.curName!=='Guard')play(f.ch,near?'Guard':'Idle');}}}}

// ---------- GALAXY GALLIUM GLOBS + MORROW VILLAIN ABILITIES (PROPOSAL / PUBLISH HOLD, RB1 2026-11-06) ----------
// Hold G (keyboard) or Y (controller, on the ground or riding) — Metal pulls Gallium out of the suit and bends it into a
// black galaxy-crystal glob between his hands; it grows while held (finite Gallium). Release to throw it: it slams fighters,
// cracks armored villains, and knocks cars over (driver always gets out first). It splats into a puddle — walk over it to
// pull 80 % back. Villain rules live in villain_core.mjs; the numbers in gallium_glob_core.mjs (both node-tested).
const GLB={g:createGlob(),mesh:null,base:null,stream:null,projs:[],puddles:[],prevY:false};
const _gq=new THREE.Quaternion(),_ga=new THREE.Vector3();
function globMesh(){const geo=new THREE.IcosahedronGeometry(1,3);const m=new THREE.Mesh(geo,galaxyCrystalMat({}));m.castShadow=true;m.userData.base=geo.attributes.position.array.slice();scene.add(m);return m;}
function wobble(m,size,t){const a=m.geometry.attributes.position,b=m.userData.base;for(let i=0;i<a.count;i++){const x=b[i*3],y=b[i*3+1],z=b[i*3+2];
  const n=1+.16*Math.sin(x*4.1+t*6.3)*Math.cos(y*3.7-t*5.1)+.1*Math.sin(z*5.3+t*8.2)+(size>.6?.08*Math.sin((x+y)*9+t*12):0);a.setXYZ(i,x*n,y*n,z*n);}
 a.needsUpdate=true;m.geometry.computeVertexNormals();}
function globAimAssist(){ // soft-lock the nearest bendable / breakable / mechanical target in front of Metal
 const h=_globHand(),f=new THREE.Vector3(Math.sin(RSK.active?RSK.yaw:yaw),0,Math.cos(RSK.active?RSK.yaw:yaw));const cands=[];
 if(MWB.S){const bp=MWB.rails.bar.pts;for(let k=0;k<bp.length-1;k++){const a=bp[k],b=bp[k+1];for(let t=.15;t<.9;t+=.15)cands.push(new THREE.Vector3(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t));}
  for(const w of MWB.wallMeshes)if(w.p.hp>0)cands.push(w.mesh.position.clone());}
 if(EP.latchM&&EP.M&&EP.M.stage==='platform'&&EP.M.plat.state==='up')cands.push(EP.latchM.position.clone());
 if(WTV.S&&WTV.S.mission==='DEFEND'){WTV.limbs.forEach((l,i)=>{if(WTV.S.boss.limbs[i].hp>0)cands.push(l.knee.clone().lerp(l.foot,.4));});if(WTV.S.keeper.hp>0)cands.push(WTV.kp.clone());}
 const E=RFR.W&&RFR.W.enc;if(E){if(E.stage==='chase')RFR.wheels.forEach((w,i)=>{if(E.wheels[i]>0)cands.push(w.position.clone());});else RFR.arms.forEach((a,i)=>{if(E.arms[i]>0&&a.g.visible)cands.push(a.cl.position.clone());});}
 let best=null,bs=1e9;for(const c of cands){const v=c.clone().sub(h),d=v.length();if(d>11||d<.5)continue;const ang=Math.acos(Math.max(-1,Math.min(1,v.clone().setY(0).normalize().dot(f))));if(ang>.6)continue;const sc=d+ang*6;if(sc<bs){bs=sc;best=v.normalize();}}
 return best;}
function globAim(){const la=ep1LatchAim();if(la)return la;if(!(FG.target&&FG.target.ch)){const a=globAimAssist();if(a)return a;}if(FG.target&&FG.target.ch){const v=FG.target.ch.o.position.clone().setY(FG.target.ch.o.position.y+1.1).sub(_globHand());return v.normalize();}
 if(RSK.active&&RSK.R)return new THREE.Vector3(Math.sin(RSK.yaw),.02,Math.cos(RSK.yaw));
 return new THREE.Vector3(-Math.sin(camYaw),-.02,-Math.cos(camYaw));}
const _gh=new THREE.Vector3();
function _globHand(){const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));return _gh.copy(P.o.position).add(new THREE.Vector3(0,1.3,0)).addScaledVector(f,.75);}
function globHolding(){if(KITV.K.pulling)return false;if(!P||st.swing||st.flying||st.wall||forgeController?.busy)return false;const padY=!!(RSK.gp&&(RSK.gp.buttons[3]?.pressed)&&(onGround||RSK.active));return !!keys.KeyG||padY;}
function globTick(dt){
 const holding=globHolding(),g=GLB.g;
 const used=formGlob(g,holding,st.gal,dt);st.gal=Math.max(0,st.gal-used);
 if(holding&&g.size>0){if(!GLB.mesh)GLB.mesh=globMesh();const m=GLB.mesh;m.visible=true;const r=globRadius(g.size);m.scale.setScalar(r);
  const t=performance.now()/1000;m.position.copy(_globHand()).add(new THREE.Vector3(Math.sin(t*2.3)*.06,Math.sin(t*3.1)*.05,0));m.rotation.y+=dt*2.2;m.rotation.x+=dt*1.3;wobble(m,g.size,t);
  // metal-bending: matter streams from both forearms into the glob
  if(Math.random()<.9){const side=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));for(const s of [-1,1]){const a=P.o.position.clone().add(new THREE.Vector3(0,1.15,0)).addScaledVector(side,s*.32);burst(a.lerp(m.position,Math.random()*.7),1,.6);}}
  if(used>0&&!actT){playT(P,P.acts.Blast?'Blast':'Idle',.9);actT=.12;}setViolet(.35+.4*g.size);
  if(st.gal<=0.001&&g.size<GLOB.MIN&&!GLB.warn){GLB.warn=true;toast('No Gallium left to bend — pick up puddles or win a spar');}}
 if(GLB.suppress>0){GLB.suppress-=dt;GLB.prevHold=false;}
 if(!holding&&GLB.prevHold){const pr=launchGlob(g,_globHand().clone(),globAim());proHook('power','glob');if(GLB.mesh)GLB.mesh.visible=false;GLB.warn=false;
  if(pr.refund){st.gal=Math.min(1,st.gal+pr.refund);}
  else{if(!onGround&&!RSK.active||RSK.R&&RSK.R.core.mode==='air')comboFeed('airborne');if(RSK.R&&RSK.R.core.mode==='grind')comboFeed('grind');
   const cb=comboFeed('globThrow');pr.mul=1;
   if(cb){if(cb.id==='galliumFist')pr.mul=1.6;if(cb.id==='meteor'){pr.v.y=-16;pr.v.x*=.4;pr.v.z*=.4;pr.meteor=true;pr.mul=1.4;}if(cb.id==='railRifle'){pr.v.x*=1.5;pr.v.z*=1.5;pr.pierce=true;pr.mul=1.3;}if(cb.id==='styleCannon'){pr.v.x*=1.25;pr.v.z*=1.25;pr.mul=1.25;}}
   const m=globMesh();m.scale.setScalar(pr.r);m.position.set(pr.p.x,pr.p.y,pr.p.z);GLB.projs.push({pr,m,hit:new Set()});beep(90,.12,'sawtooth',.05);FG.shake=Math.max(FG.shake,.08+.15*pr.size);if(P.acts.GlobThrow&&!RSK.active&&!st.board){playT(P,'GlobThrow',.75);actT=.55;}else if(P.acts.Blast){playT(P,'Blast',.5);actT=.35;}}}
 GLB.prevHold=holding;
 for(let i=GLB.projs.length-1;i>=0;i--){const it=GLB.projs[i],pr=it.pr;const alive=stepGlob(pr,dt);it.m.position.set(pr.p.x,pr.p.y,pr.p.z);it.m.rotation.x+=dt*6;wobble(it.m,pr.size,performance.now()/1000);
  const pos=it.m.position;let hit=null;
  for(const foe of activeFoes()){if(it.hit&&it.hit.has(foe))continue;const c=_fv2.copy(foe.ch.o.position);c.y+=1.1;if(pos.distanceTo(c)<pr.r+.7){const im=foeImpact(pr);const dir=new THREE.Vector3(pr.v.x,0,pr.v.z).normalize();
    hitFoe(foe,{...STRK.blast,dmg:im.dmg*(pr.mul||1),kb:im.kb*(pr.mul||1),stun:im.stun,down:im.down,react:im.down?'Knock':'HitChest',src:'glob'},0,dir);if(pr.pierce){it.hit&&it.hit.add(foe);continue;}hit='foe';break;}}
  if(!hit&&reframerHit('glob',Math.min(1,pr.size*(pr.mul||1)),pos))hit='reframer';
  if(!hit&&ep1LatchHit(pos,pr.r,Math.min(1,pr.size*(pr.mul||1)*1.4)))hit='latch';
  if(!hit&&MWB.S&&mwHitWall(pos,Math.min(1,pr.size*(pr.mul||1))*1.2,'glob'))hit='panel';
  if(!hit&&MWB.S){const bp=MWB.rails.bar.pts;for(let k=0;k<bp.length-1&&!hit;k++){const a=bp[k],bb=bp[k+1],dx=bb.x-a.x,dy=bb.y-a.y,dz=bb.z-a.z,L2=dx*dx+dy*dy+dz*dz||1,t=Math.max(0,Math.min(1,((pos.x-a.x)*dx+(pos.y-a.y)*dy+(pos.z-a.z)*dz)/L2));if(Math.hypot(pos.x-a.x-dx*t,pos.y-a.y-dy*t,pos.z-a.z-dz*t)<pr.r+.15)hit='bar';}}
  if(!hit)for(const c of cars){if(c===heldCar)continue;const cp=_fv2.copy(c.position);cp.y+=.9;if(pos.distanceTo(cp)<pr.r+2.1){hit='car';globHitCar(c,pr);break;}}
  if(!hit){const f=floorAt(pos);if(pos.y<=f+pr.r*.5)hit='ground';else for(const b of colliders)if(b.containsPoint(pos)){hit='wall';break;}}
  if(hit||!alive){burst(pos,20+Math.round(30*pr.size),5+4*pr.size);
   for(const sc of STORY_FIGHTS)for(const f of sc.members)if(f.R.vil&&f.R.vil.id==='kiln'&&douseZone(f.R.vil,pos.x,pos.z))whisper('Hot zone out','');
   const gpow=Math.min(1,pr.size*(pr.mul||1));if(hit!=='panel')mwHitWall(pos,gpow*1.2,'glob');
   if(MWB.S&&bendRail(MWB.rails.bar,{x:pos.x,z:pos.z},{x:pr.v.x,y:pr.v.y/(Math.hypot(pr.v.x,pr.v.y,pr.v.z)||1),z:pr.v.z},gpow)){mwRailsSync();mwBarMesh();mwSave();whisper('Bar bent','grind its new shape');FG.shake=.3;beep(50,.15,'square',.05);}
   if(pr.meteor){vRing(pos.x,pos.z,3.5,.5,0xb48cff);FG.shake=.4;for(const foe of activeFoes())if(foe.ch.o.position.distanceTo(pos)<3.5)hitFoe(foe,{...STRK.blast,dmg:.18,kb:7,down:true,react:'Knock',src:'glob'},0,foe.ch.o.position.clone().sub(pos).setY(0).normalize());reframerHit('glob',.9,pos);}FG.shake=Math.max(FG.shake,.1+.25*pr.size);beep(55,.12,'square',.05);
   const sp=splat(pr);kitPuddleAdd(pos.x,floorAt(pos),pos.z,sp.amount); // puddles stay until pulled back
   scene.remove(it.m);it.m.geometry.dispose();GLB.projs.splice(i,1);}}
 for(let i=GLB.puddles.length-1;i>=0;i--){const pd=GLB.puddles[i];pd.t+=dt;
  if(P.o.position.distanceTo(pd.m.position)<1.4&&P.o.position.y-pd.m.position.y<1.2){st.gal=Math.min(1,st.gal+pd.amount);toast('Gallium recovered +'+Math.round(pd.amount*100)+'%');scene.remove(pd.m);GLB.puddles.splice(i,1);continue;}
  if(pd.t>25){pd.m.scale.multiplyScalar(Math.exp(-dt*2));if(pd.t>27){scene.remove(pd.m);GLB.puddles.splice(i,1);}}}
 // tumbling cars: roll around the hit axis, settle on wheels / side / roof, and bowl over fighters in their way
 for(const c of thrownCars){const u=c.userData;if(!u.tumble)continue;const b=u.worldBody;stepTumble(u.tumble,dt,b.position.y<=.08);
  c.quaternion.copy(u.baseQ).premultiply(_gq.setFromAxisAngle(_ga.set(u.tAxis.x,0,u.tAxis.z),u.tumble.roll));c.position.y=b.position.y+Math.abs(Math.sin(u.tumble.roll))*.9+(Math.abs(Math.cos(u.tumble.roll))>.5&&Math.cos(u.tumble.roll)<0?1.6:0);
  const sp=Math.hypot(b.velocity.x,b.velocity.z);if(sp>3.5)for(const foe of activeFoes()){if(foe.ch.o.position.distanceTo(c.position)<2.6&&!(foe.R.inv>0)){hitFoe(foe,{...STRK.hook,dmg:.22,kb:9,down:true,react:'Knock',src:'car'},0,new THREE.Vector3(b.velocity.x,0,b.velocity.z).normalize());foe.R.inv=.6;}}
  if(sp>5&&!u.wallHit&&mwHitWall(_fv2.copy(c.position).setY(c.position.y+.8),1,'car'))u.wallHit=true;
  if(u.byVillain&&sp>3&&c.position.distanceTo(P.o.position)<2.6){metalHurt(.15,c.position,null);u.byVillain=0;}
  if(u.tumble.settled&&!u.tSaid){u.tSaid=true;const r=tumbleResult(u.tumble);if(r!=='wheels')toast('Car on its '+r);}}
}
function blastCombo(){const cb=comboFeed('blast');if(!cb||cb.id!=='shatter')return;const it=GLB.projs[GLB.projs.length-1];if(!it)return;const pos=it.m.position.clone();
 burst(pos,70,9);vRing(pos.x,pos.z,4,.45,0xd8c8ff);FG.shake=.35;for(const foe of activeFoes())if(foe.ch.o.position.distanceTo(pos)<4)hitFoe(foe,{...STRK.blast,dmg:.16+.2*it.pr.size,kb:6,down:it.pr.size>.4,react:'Knock',src:'glob'},0,foe.ch.o.position.clone().sub(pos).setY(0).normalize());
 reframerHit('glob',.8,pos);scene.remove(it.m);GLB.projs.pop();}
const VPROJ=[];
function villainProj(from,to,speed,dmg,color,kind){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(kind==='lance'?.28:.12,0),new THREE.MeshBasicMaterial({color}));m.position.copy(from);scene.add(m);const v=to.clone().sub(from).normalize().multiplyScalar(speed);VPROJ.push({m,v,dmg,t:0,kind});}
function villainProjTick(dt){for(let i=VPROJ.length-1;i>=0;i--){const q=VPROJ[i];q.t+=dt;q.m.position.addScaledVector(q.v,dt);const me=_fv2.copy(P.o.position);me.y+=1.1;
 if(q.m.position.distanceTo(me)<.9){metalHurt(q.dmg,q.m.position,null);burst(q.m.position,12,4);q.t=9;}
 if(q.t>2.2){scene.remove(q.m);VPROJ.splice(i,1);}}
 for(const sc of STORY_FIGHTS)for(const f of sc.members){const V=f.R.vil;if(!V||V.id!=='kiln')continue;V.zMesh=V.zMesh||[];while(V.zMesh.length<V.zones.length){const d=new THREE.Mesh(new THREE.CircleGeometry(VILLAINS.kiln.zoneR,20),new THREE.MeshBasicMaterial({color:0xff5a1f,transparent:true,opacity:.45,depthWrite:false}));d.rotation.x=-Math.PI/2;scene.add(d);V.zMesh.push(d);}
  V.zMesh.forEach((d,k)=>{const z=V.zones[k];d.visible=!!z;if(z){d.position.set(z.x,groundY+.05,z.z);d.material.opacity=.45*(1-z.t/VILLAINS.kiln.zoneLife)*(.8+.2*Math.sin(performance.now()/80));}});}}
function villainPower(foe,e){const rp=foe.ch.o.position,me=P.o.position;
 if(e.type==='throwCar'){const car=cars.filter(c=>c!==heldCar&&!c.userData.reframed&&c.position.distanceTo(rp)<16).sort((a,b)=>a.position.distanceTo(rp)-b.position.distanceTo(rp))[0];
  playT(foe.ch,'Hook',.8);foe.R.animLock=.8;
  if(car){const u=car.userData;if(!u.occupantExited){u.occupantExited=true;u.occupantCount=0;const pz=makeChar(0xd6aa7d);pz.o.position.copy(car.position).add(new THREE.Vector3(2.6,.3,0));scene.add(pz.o);pz.target=pz.o.position.clone().add(new THREE.Vector3(9,0,9));pz.speed=3.6;pz.wait=0;pz.role='evacuating driver';npcs.push(pz);}
   if(!u.worldBody)u.worldBody=new WorldBody({mass:1450,radius:2.3});const b=u.worldBody;b.position={x:car.position.x,y:Math.max(.05,car.position.y),z:car.position.z};b.state='held';
   const d=me.clone().sub(car.position).setY(0),dist=d.length();d.normalize();const tFly=Math.max(.6,dist/16);b.throw(d.x*dist/tFly,9.8*tFly/2,d.z*dist/tFly);if(!thrownCars.includes(car))thrownCars.push(car);u.baseQ=car.quaternion.clone();u.tAxis={x:d.z,z:-d.x};u.tumble=createTumble(3.5);u.tSaid=false;u.byVillain=1.6;
   whisper('Ballast threw a car','move — or catch it with a glob');}}
 if(e.type==='shards'){playT(foe.ch,'Cross',.5);const fy=foe.ch.o.rotation.y;for(let k=-3;k<=3;k++){const a=fy+k*.12;villainProj(rp.clone().setY(rp.y+1.3),rp.clone().add(new THREE.Vector3(Math.sin(a)*9,1.2,Math.cos(a)*9)),18,.04,0xcfe6ff,'shard');}}
 if(e.type==='lance'){playT(foe.ch,'Cross',.5);villainProj(rp.clone().setY(rp.y+1.4),me.clone().setY(me.y+1.1),15,.1,0xff6a1f,'lance');}
 if(e.type==='plateRegrow'){burst(rp.clone().setY(rp.y+1.3),16,3);whisper('Glassjaw regrew a plate','keep the pressure on');}
 if(e.type==='echoBack'){vRing(e.x,e.z,e.r,.5,0x8a4dff);burst(new THREE.Vector3(e.x,groundY+.5,e.z),30+e.n*10,7);FG.shake=.3;whisper('Echo Nail sent your hits back','step out of his ring 7 s after you hit him');}
}
function globHitCar(c,pr){const u=c.userData;
 if(!u.occupantExited){u.occupantExited=true;u.occupantCount=0;const pz=makeChar(0xd6aa7d);pz.o.position.copy(c.position).add(new THREE.Vector3(2.8,.3,0));scene.add(pz.o);pz.target=pz.o.position.clone().add(new THREE.Vector3(10,0,10));pz.speed=3.4;pz.wait=0;pz.role='evacuating driver';npcs.push(pz);}
 const im=carImpulse(pr,c.position);
 if(!u.worldBody)u.worldBody=new WorldBody({mass:GLOB.CAR_MASS,radius:2.3});const b=u.worldBody;b.position={x:c.position.x,y:Math.max(.05,c.position.y),z:c.position.z};b.state='held';
 const v0=b.velocity||{x:0,y:0,z:0};b.throw(v0.x+im.v.x,im.v.y,v0.z+im.v.z);if(!thrownCars.includes(c))thrownCars.push(c);
 if(im.tips){u.baseQ=c.quaternion.clone();u.tAxis=im.axis;u.tumble=createTumble(im.spin);u.tSaid=false;}
 toast(im.rolls?'GALLIUM GLOB · car sent rolling (driver out)':im.tips?'GALLIUM GLOB · car knocked over (driver out)':'GALLIUM GLOB · car shoved');}
// ---- villain abilities (Season One blueprint) ----
const VFX={rings:[],spikes:[],slick:[],heat:null};
function vRing(x,z,r,life,color){const m=new THREE.Mesh(new THREE.RingGeometry(r*.92,r,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,groundY+.06,z);scene.add(m);VFX.rings.push({m,t:0,life});return m;}
function metalHurt(dmg,from,why){if(FG.iframe>0||dmg<=0)return;dmg=kitShieldBlock(dmg,from);st.hp=Math.max(0,st.hp-armorDamage(dmg));if(from){const d=P.o.position.clone().sub(from).setY(0).normalize();FG.kb.addScaledVector(d,6);}FG.shake=Math.max(FG.shake,.2);if(why)toast(why);

 if(st.hp<=0){st.hp=1;for(const c of STORY_FIGHTS)if(c.state==='fight')endCrew(c,false);}}
function villainAbility(foe,dt){const R=foe.R,V=R.vil,rp=foe.ch.o.position,mp=P.o.position;
 const o=stepVillain(V,{dist:R.d,active:R.active&&!R.out,self:{x:rp.x,z:rp.z},metal:{x:mp.x,z:mp.z}},dt);
 if(o.metalDmg>0)st.hp=Math.max(.02,st.hp-armorDamage(o.metalDmg));
 for(const e of o.events){
  if(e.type==='slam'){const ring=vRing(e.x,e.z,e.r,e.warn+.25,0xffb11f);playT(foe.ch,'Hook',.6);R.animLock=.6;
   setTimeout(()=>{if(!R.active)return;burst(new THREE.Vector3(e.x,groundY+.3,e.z),40,7);FG.shake=.35;if(P.o.position.distanceTo(new THREE.Vector3(e.x,P.o.position.y,e.z))<e.r&&onGround&&!st.board)metalHurt(.14,rp,'Ballast slam — jump or roll out of the ring');},e.warn*1000);}
  if(e.type==='dash'){R.kb.addScaledVector(R.dir,9);playT(foe.ch,'Dash',.5);}
  if(['throwCar','shards','lance','plateRegrow','echoBack','hotZone'].includes(e.type))villainPower(foe,e);
  if(e.type==='spike'){const s=new THREE.Mesh(new THREE.ConeGeometry(.12,.7,5),galaxyCrystalMat({}));s.position.set(e.x,groundY+.3,e.z);scene.add(s);VFX.spikes.push({m:s,V,x:e.x,z:e.z});toast('Echo Nail spike — it hits again in 7 s. Move off it or pull it (E)');}
  if(e.type==='echoHit'){burst(new THREE.Vector3(e.x,groundY+.4,e.z),e.first?14:34,e.first?4:7);if(!e.first){FG.shake=.3;const sp=VFX.spikes.findIndex(s=>s.x===e.x&&s.z===e.z);if(sp>=0){scene.remove(VFX.spikes[sp].m);VFX.spikes.splice(sp,1);}}}}
 if(V.id==='echonail'){
  if(pressed.KeyE&&V.echoes.some(e=>Math.hypot(e.x-mp.x,e.z-mp.z)<1.3)){pressed.KeyE=false;if(pullSpike(V,mp.x,mp.z)){toast('Spike pulled');const sp=VFX.spikes.findIndex(s=>Math.hypot(s.x-mp.x,s.z-mp.z)<1.3);if(sp>=0){scene.remove(VFX.spikes[sp].m);VFX.spikes.splice(sp,1);}}}}
 if(V.id==='slipline'&&o.slide&&!st.board&&onGround){vel.x*=1.02;vel.z*=1.02;if(!R.slideSaid){R.slideSaid=true;toast('Slick lane — you can\'t plant your feet');}}
 if(V.id==='kiln'){if(!VFX.heat){VFX.heat=new THREE.PointLight(0xff5a1f,0,7);scene.add(VFX.heat);}VFX.heat.position.copy(rp).setY(rp.y+1.2);VFX.heat.intensity=V.cool>0?0:2.5+Math.sin(performance.now()/90);if(foe.ch.body)foe.ch.body.emissiveIntensity=V.cool>0?0:.25+.5*V.heat;
  if(V.cool>0&&!R.coolSaid){R.coolSaid=true;toast('Gallium cooled Kiln — he seized up');R.stun=Math.max(R.stun||0,1.2);setTimeout(()=>R.coolSaid=false,2500);}}
}
function villainFx(dt){for(let i=VFX.rings.length-1;i>=0;i--){const r=VFX.rings[i];r.t+=dt;r.m.material.opacity=.8*(1-r.t/r.life);r.m.scale.setScalar(1+.15*Math.sin(r.t*20));if(r.t>=r.life){scene.remove(r.m);VFX.rings.splice(i,1);}}
 for(const s of VFX.spikes){const e=s.V.echoes.find(x=>x.x===s.x&&x.z===s.z);if(!e){s.dead=true;continue;}const left=VILLAINS.echonail.delay-e.t;s.m.material.emissive=new THREE.Color(0x8a4dff);s.m.material.emissiveIntensity=left<1.5?1.2+Math.sin(e.t*30):.1;if(left<1.5&&!s.warned){s.warned=true;vRing(s.x,s.z,VILLAINS.echonail.spikeR,left+.1,0xb48cff);}}
 for(let i=VFX.spikes.length-1;i>=0;i--)if(VFX.spikes[i].dead){scene.remove(VFX.spikes[i].m);VFX.spikes.splice(i,1);}
 // slick lanes
 for(const f of STORY_FIGHTS)for(const m of f.members){const V=m.R.vil;if(!V||V.id!=='slipline')continue;while(VFX.slick.length<V.slick.length){const d=new THREE.Mesh(new THREE.CircleGeometry(VILLAINS.slipline.slickR,12),new THREE.MeshBasicMaterial({color:0x4fc3e8,transparent:true,opacity:.35,depthWrite:false}));d.rotation.x=-Math.PI/2;scene.add(d);VFX.slick.push(d);}
  VFX.slick.forEach((d,k)=>{const s=V.slick[k];d.visible=!!s;if(s){d.position.set(s.x,groundY+.04,s.z);d.material.opacity=.35*(1-s.t/VILLAINS.slipline.slickLife);}});}
 // name tags + radio calls (natural mission discovery)
 for(const c of STORY_FIGHTS){const f=c.members[0];if(!f)continue;const d=P.o.position.distanceTo(f.ch.o.position);if(f.tag)f.tag.visible=HELP.on&&d<55&&!f.R.out;
  if(!c.radio&&d<45&&c.state==='idle'){c.radio=true;toast('📻 Morrow radio: '+c.name+' spotted nearby'+(c.entry.ep?' — Ep.'+c.entry.ep+' '+c.entry.title:''));}}
}
function nameTag(text,color){const cv=document.createElement('canvas');cv.width=256;cv.height=64;const g=cv.getContext('2d');g.font='800 30px system-ui';g.textAlign='center';g.lineWidth=6;g.strokeStyle='#000';g.strokeText(text,128,42);g.fillStyle='#'+new THREE.Color(color).getHexString();g.fillText(text,128,42);
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),depthWrite:false,transparent:true}));sp.scale.set(2.4,.6,1);sp.renderOrder=5;return sp;}


// ---------- CLEAN SCREEN / HELP MODE (RB1 2026-11-06: "no words on the screen" + toggle help) ----------
// Help OFF (default): no words anywhere — no panels, toasts, prompts, name tags. Feedback is light, sound and motion.
// Help ON: everything shows, plus a whisper that names each button the moment you press it.
// Toggle: H (keyboard) · tap Menu (controller; hold Menu still pauses) · ?help=1 starts with help on.
const HELP={on:(()=>{try{const q=new URLSearchParams(location.search).get('help');if(q!=null)return q==='1';return localStorage.getItem('wirHelpMode')==='1';}catch(e){return false;}})(),whisperT:0,menuT:0,prevBtn:[]};
(function initHelpCss(){const s=document.createElement('style');s.textContent=`body.wir-clean>*:not(canvas):not(#touch):not(#map):not(#prof):not(#powers):not(#brickc):not(#metalV3ControllerPanel):not(#load):not(#liteEmergency):not(script):not(style):not(.wir-keep){display:none!important}
 #wirWhisper{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:31;pointer-events:none;font:700 15px/1.3 system-ui;color:#f3efff;background:rgba(10,8,22,.72);border:1px solid #8a4dff55;border-radius:10px;padding:6px 14px;opacity:0;transition:opacity .15s;text-align:center;white-space:nowrap}
 #wirWhisper small{display:block;font-weight:500;font-size:11px;opacity:.75}`;document.head.appendChild(s);
 const w=document.createElement('div');w.id='wirWhisper';document.body.appendChild(w);applyHelp();})();
function applyHelp(){document.body.classList.toggle('wir-clean',!HELP.on);try{localStorage.setItem('wirHelpMode',HELP.on?'1':'0');}catch(e){}
 for(const c of (typeof STORY_FIGHTS!=='undefined'?STORY_FIGHTS:[]))for(const f of c.members)if(f.tag)f.tag.userData.hide=!HELP.on;
 for(const l of worldLabels)l.visible=HELP.on;const hp=document.getElementById('help');if(hp)hp.style.display='none';}
function toggleHelp(){HELP.on=!HELP.on;applyHelp();beep(HELP.on?660:330,.06,'triangle',.04);if(HELP.on)whisper('HELP ON','Every button you press is named here · H / tap Menu to hide everything');}
function whisper(title,sub){if(!HELP.on)return;const w=$('wirWhisper');if(!w)return;w.innerHTML=title+(sub?'<small>'+sub+'</small>':'');w.style.opacity=1;HELP.whisperT=1.6;}
const PAD_NAMES=['A','B','X','Y','L1','R1','L2','R2','View','Menu','L3','R3','D-up','D-down','D-left','D-right'];
function helpContext(){if(RSK.active)return RSK.R&&RSK.R.core.mode==='air'?'air':RSK.R&&RSK.R.core.mode==='grind'?'grind':'ride';if(st.swing)return 'swing';if(!onGround)return 'jump';if(FG.inFight)return 'fight';return 'walk';}
const HELP_PAD={
 ride:{A:['Push','one stroke per tap'],B:['Foot brake','hold ½ s = step off'],Y:['Gallium glob','hold to bend it, let go to throw'],L1:['Draw metal','hold near cars, lamps, rails'],R1:['Gallium line','swing'],L2:['Left foot / knee','squeeze both to load · snap the back one to pop'],R2:['Right foot / knee','back foot for Metal (regular)'],X:['Gallium Gallop','THOOM-tik stride · tap again on the beat after each landing · in the air X = grab'],'D-left':['Crown point','marks the next anchor ahead (up to 3)'],'D-right':['Magnetic Snapline','commit the arc · no cancel']},
 air:{L2:['Catch / front foot','squeeze a beat before the deck comes around'],R2:['Catch / back foot','both down = feet on the bolts'],X:['Grab','stick: Indy · Melon · Nose · Tail'],Y:['Glob from the air','= METEOR combo'],A:['—','no push in the air']},
 grind:{L2:['Knees','load both, snap to pop out'],R2:['Knees','load both, snap to pop out'],Y:['Glob off the rail','= RAIL RIFLE combo']},
 walk:{A:['Jump'],B:['Tap: call the board back / forge one','hold: melt board · sword · shield → puddle'],X:['Strike (roar)'],Y:['Gallium glob','hold to bend, release to throw'],L1:['Pulse · hold = draw metal','hold near metal to charge'],R1:['Gallium line'],L2:['Sprint · L2+R2 = PULL metal','+X galaxy sword · +B shield · +Y plasma blast'],R2:['Glide · L2+R2 = PULL'],View:['Mode'],Menu:['Help on/off','hold = pause'],'D-up':['Interact (E)']},
 fight:{X:['Strike'],Y:['Gallium glob','two hits then throw = GALLIUM FIST'],L1:['Pulse · hold = draw','draw 1 s then pulse = MAGNET STORM'],B:['Dodge'],A:['Jump']},
 jump:{X:['Strike'],Y:['Aerial spin / glob','glob from the air = METEOR'],R2:['Glide'],A:['Jump']},
 swing:{R1:['Let go','strike right after = SWING BREAKER'],A:['Jump off']}};
const HELP_KEYS={KeyW:['Move / push'],KeyA:['Move / lean'],KeyD:['Move / lean'],KeyS:['Back / manual'],Space:['Jump · on the board: knees + pop'],KeyG:['Gallium glob','hold to bend, release to throw'],Numpad5:['Charge · draw metal','hold near cars, lamps, rails'],KeyK:['Charge · draw metal'],KeyC:['Grab (air, on the board)'],KeyQ:['Gallium line'],KeyF:['Flight'],KeyB:['Board: tap = call back / forge · hold = melt'],KeyY:['Pull metal (L2+R2)','+Num4 sword · +B shield · +G plasma blast'],KeyE:['Interact'],
 Numpad4:['Jab / hook'],Numpad6:['Cross'],Numpad1:['Left kick'],Numpad3:['Right kick'],Numpad2:['Block','tap right before a hit = parry'],Numpad7:['Blast · Shift = pulse'],Numpad8:['Transform'],Numpad9:['Dash strike'],KeyH:['Help on/off'],KeyM:['Map'],ArrowLeft:['Kickflip flick (after the pop)'],ArrowRight:['Heelflip flick'],ArrowUp:['Back-foot scoop'],ArrowDown:['Back-foot scoop']};
addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='KeyH'){toggleHelp();return;}const h=HELP_KEYS[e.code];if(h)whisper(e.code.replace('Key','').replace('Numpad','Num ')+' · '+h[0],h[1]);});
function helpTick(dt,gp){
 if(HELP.whisperT>0){HELP.whisperT-=dt;if(HELP.whisperT<=0){const w=$('wirWhisper');if(w)w.style.opacity=0;}}
 if(!gp)return;const ctx=helpContext();
 for(let i=0;i<16;i++){const b=!!(gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>.5));
  if(i===9){if(b)HELP.menuT+=dt;else{if(HELP.prevBtn[9]&&HELP.menuT<.4)toggleHelp();HELP.menuT=0;}}
  else if(b&&!HELP.prevBtn[i]){const n=PAD_NAMES[i],h=(HELP_PAD[ctx]&&HELP_PAD[ctx][n])||(HELP_PAD.walk[n]);if(h)whisper(n+' · '+h[0],h[1]);}
  HELP.prevBtn[i]=b;}
}

// ---------- METAL DRAW: pull metal from everything around you (charge-up) ----------
const DRW={D:createDraw(),srcT:0,srcs:[],scrap:[],pts:null,pos:null,life:null,from:null,i:0,N:360,l1T:0,l1Prev:false,drawing:false,longFed:false};
function drawSources(){const p=P.o.position,R2=DRAW.RANGE+4,out=[];
 for(const c of cars){if(c===heldCar)continue;if(c.position.distanceTo(p)<R2){c.userData.drawSrc=c.userData.drawSrc||{kind:'car',id:c.uuid};const s=c.userData.drawSrc;s.x=c.position.x;s.y=c.position.y+.8;s.z=c.position.z;s.obj=c;out.push(s);}}
 for(const l of lamps){if(Math.abs(l.position.x-p.x)>R2||Math.abs(l.position.z-p.z)>R2)continue;l.userData.drawSrc=l.userData.drawSrc||{kind:'lamp',x:l.position.x,y:3.4,z:l.position.z,obj:l};out.push(l.userData.drawSrc);}
 if(skYard)for(const r of skYard.rails){const t=.5,q=skYard.railPoint(r,t);if(Math.hypot(q.x-p.x,q.z-p.z)<R2+r.len/2){r.drawSrc=r.drawSrc||{kind:r.kind==='coping'?'coping':'rail',x:q.x,y:q.y,z:q.z};out.push(r.drawSrc);}}
 for(const kp of KITV.K.puddles)out.push({kind:'puddle',x:kp.x,y:kp.y+.1,z:kp.z,reserve:kp.amount,kp});
 for(const s of DRW.scrap)out.push(s);
 return out;}
function drawStreamsInit(){const g=new THREE.BufferGeometry();DRW.pos=new Float32Array(DRW.N*3);DRW.life=new Float32Array(DRW.N);DRW.from=new Float32Array(DRW.N*3);g.setAttribute('position',new THREE.BufferAttribute(DRW.pos,3));
 DRW.pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xb9b2ff,size:.09,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));DRW.pts.frustumCulled=false;scene.add(DRW.pts);}
function drawTick(dt){
 if(!P)return;const gp=RSK.gp;const l1=!!(gp&&gp.buttons[4]&&gp.buttons[4].pressed);
 const sky=metalPadV3.mode==='skylab'||RSK.active;
 if(l1&&sky)DRW.l1T+=dt;else{if(DRW.l1Prev&&DRW.l1T<.25&&sky){if(onGround||RSK.active)pressed.Numpad7=true;}DRW.l1T=0;} // tap L1 = pulse, hold = draw
 DRW.l1Prev=l1;
 const holding=!st.swing&&!st.flying&&(keys.Numpad5||keys.KeyK||DRW.l1T>.25||KITV.K.pulling);
 DRW.srcT-=dt;if(DRW.srcT<=0){DRW.srcT=.25;DRW.srcs=drawSources();}
 const r=stepDraw(DRW.D,holding,{x:P.o.position.x,y:P.o.position.y+1.1,z:P.o.position.z},DRW.srcs,st.gal,dt);
 st.gal=Math.min(1,st.gal+r.gal);st.charge=Math.min(1,st.charge+r.charge);DRW.lastGot=r.streams.filter(x=>!x.src.con).reduce((a,x)=>a+x.amount,0);
 if(holding&&!DRW.drawing){DRW.drawing=true;DRW.longFed=false;}
 if(!holding&&DRW.drawing){DRW.drawing=false;}
 if(holding&&DRW.D.held>1&&!DRW.longFed&&DRW.D.total>.02){DRW.longFed=true;comboFeed('drawLong');}
 if(!DRW.pts)drawStreamsInit();
 const me=_fv2.copy(P.o.position);me.y+=1.15;
 for(const s of r.streams){ // spawn matter flecks along each stream, more for closer/heavier sources
  const n=Math.min(4,1+Math.floor(s.amount*900));for(let k=0;k<n;k++){const i=DRW.i++%DRW.N;DRW.from[i*3]=s.src.x+(Math.random()-.5)*.6;DRW.from[i*3+1]=s.src.y+(Math.random()-.5)*.6;DRW.from[i*3+2]=s.src.z+(Math.random()-.5)*.6;DRW.life[i]=1;}
  if(s.src.mesh&&s.src.reserve<=0.001){scene.remove(s.src.mesh);const k=DRW.scrap.indexOf(s.src);if(k>=0)DRW.scrap.splice(k,1);}
  if(s.src.kp){s.src.kp.amount=s.src.reserve;if(s.src.kp.amount<=0.001){const k=KITV.K.puddles.indexOf(s.src.kp);if(k>=0)KITV.K.puddles.splice(k,1);}KITV.dirty=true;kitPuddleSync();}
 }
 for(let i=0;i<DRW.N;i++){if(DRW.life[i]<=0){DRW.pos[i*3+1]=-999;continue;}DRW.life[i]-=dt*2.2;const t=1-Math.max(0,DRW.life[i]),e=t*t*(3-2*t);const sw=Math.sin(t*9+i)*.25*(1-t);
  DRW.pos[i*3]=DRW.from[i*3]+(me.x-DRW.from[i*3])*e+sw;DRW.pos[i*3+1]=DRW.from[i*3+1]+(me.y-DRW.from[i*3+1])*e+Math.sin(t*Math.PI)*.6;DRW.pos[i*3+2]=DRW.from[i*3+2]+(me.z-DRW.from[i*3+2])*e-sw;}
 DRW.pts.geometry.attributes.position.needsUpdate=true;
 if(holding){setViolet(.5+Math.min(.5,r.streams.length*.1));if(r.streams.length&&Math.random()<.2)beep(140+Math.random()*60,.03,'sine',.012);
  if(!RSK.active&&!actT){playT(P,P.acts.Blast?'Blast':'Idle',1.2);actT=.1;}
  if(r.streams.length===0&&!DRW.noneSaid){DRW.noneSaid=true;whisper('No metal in reach','move closer to cars, lamp posts, rails');}}
 else DRW.noneSaid=false;
}

// ---------- POWER COMBOS ----------
const CMB=createCombos();
function comboFeed(type){const c=feed(CMB,type,performance.now()/1000);if(!c)return null;
 FG.shake=Math.max(FG.shake,.3);beep(520,.07,'triangle',.05);setTimeout(()=>beep(780,.09,'triangle',.05),70);burst(_fv2.copy(P.o.position).setY(P.o.position.y+1.3),40,6);
 whisper(c.name+(c.chain>1?' ×'+c.chain:''),c.what);if(HELP.on)toast(c.name+' +'+Math.round(c.pts*c.mult));st.comboPend+=2;
 CMB.last=c;return c;}

// ---------- REFRAMERS (from ReFramer Rush): wake on rooftops, take a real car apart, rebuild it into a Roadframe ----------
const RFR={W:null,mesh:null,arms:[],scan:null,car:null,wheels:[],wheelHome:[],said:{},t:0,parts:[],reactT:0,
 hunt:null,escapeButton:null,escapeTouch:false,escapePadPrev:false};
function reframerInit(){if(RFR.W||!colliders.length)return;
 const tall=colliders.filter(b=>b.max.y>7&&b.max.y<40).map(b=>({x:(b.min.x+b.max.x)/2,y:b.max.y,z:(b.min.z+b.max.z)/2}));
 const pick=[];for(const sp of [SPOTS.home,SPOTS.skate,SPOTS.field,SPOTS.fight,SPOTS.forge]){if(!sp||!sp.c)continue;let best=null,bd=1e9;for(const t of tall){const d=Math.hypot(t.x-sp.c.x,t.z-sp.c.z);if(d>25&&d<bd&&!pick.includes(t)){bd=d;best=t;}}if(best)pick.push(best);}
 RFR.W=createReframers(pick);
 const g=new THREE.Group();const gm=new THREE.MeshStandardMaterial({color:0x23272e,metalness:.85,roughness:.35}),em=new THREE.MeshStandardMaterial({color:0x111,emissive:0xff6a1f,emissiveIntensity:2});
 const core=new THREE.Mesh(new THREE.DodecahedronGeometry(.9,0),gm);core.castShadow=true;g.add(core);const eye=new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),em);eye.position.set(0,-.2,.75);g.add(eye);RFR.eye=eye;
 for(let i=0;i<8;i++){const a=new THREE.Group();const s1=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,1,6),gm),s2=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,1,6),gm),cl=new THREE.Mesh(new THREE.ConeGeometry(.12,.3,5),em);
  s1.castShadow=s2.castShadow=true;a.add(s1,s2,cl);scene.add(a);RFR.arms.push({g:a,s1,s2,cl,ang:i/8*Math.PI*2});}
 RFR.scan=new THREE.Mesh(new THREE.ConeGeometry(2.6,3.2,24,1,true),new THREE.MeshBasicMaterial({color:0xff7a2a,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));scene.add(RFR.scan);
 g.visible=false;for(const a of RFR.arms)a.g.visible=false;RFR.scan.visible=false;scene.add(g);RFR.mesh=g;
 if(REFRAMER_HUNT){
  RFR.hunt=createReframerHunt();
  const btn=document.createElement('button');btn.id='reframerBreakFree';btn.type='button';
  btn.textContent='BREAK FREE · E / A';btn.setAttribute('aria-label','Struggle free of ReFramer tentacle');
  btn.classList.add('wir-keep');btn.hidden=true;
  btn.style.cssText='position:fixed;bottom:calc(92px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:65;touch-action:manipulation;border-radius:14px;padding:13px 18px;background:#822b32;color:#fff;border:2px solid #f3ae9d;font:bold 13px system-ui';
  btn.addEventListener('click',()=>{RFR.escapeTouch=true;});document.body.append(btn);RFR.escapeButton=btn;
  if(window.__game)window.__game.reframerHunt=()=>({enabled:true,active:!!RFR.W?.enc,stage:RFR.W?.enc?.stage??'idle',
    ...reframerHuntSnapshot(RFR.hunt),arms:RFR.arms.length,nests:RFR.W?.nests?.length??0,stats:{...RFR.W.stats}});
  // QA-only: deliberately place ONE EXISTING loaded car by ONE EXISTING roof nest.
  // This cannot run in the user's actual game or write a save/checkpoint.
  if(window.__game&&new URLSearchParams(location.search).get('reframer_qa')==='1')
   window.__game.reframerQA=Object.freeze({begin:()=>{
    if(RFR.W.enc)return {ok:true,alreadyActive:true,stage:RFR.W.enc.stage};
    const nest=RFR.W.nests.find(n=>n.cool<=0);
    const donor=cars.find(c=>!c.userData.worldBody&&!c.userData.reframed);
    if(!nest||!donor)return {ok:false,reason:'missing-original-nest-or-car'};
    donor.userData.spd=0;donor.userData.occupantExited=false;
    donor.position.set(nest.x+8,.05,nest.z+3);P.o.position.set(nest.x+14,groundY,nest.z+3);
    let carMeshes=0;donor.traverse(o=>{if(o.isMesh)carMeshes++;});
    return {ok:true,carMeshes,nestId:nest.id,donorId:donor.uuid};
   }});
 }
}
const _ra=new THREE.Vector3(),_rb=new THREE.Vector3(),_rc=new THREE.Vector3(),_rup=new THREE.Vector3(0,1,0);
function limb(m,a,b){const d=_rc.copy(b).sub(a),L=d.length();m.position.copy(a).addScaledVector(d,.5);m.scale.set(1,L,1);m.quaternion.setFromUnitVectors(_rup,d.normalize());}
function reframerSay(k,title,sub){if(RFR.said[k])return;RFR.said[k]=true;whisper(title,sub);if(HELP.on)toast(title);}
function reframerHit(kind,power,pos){if(REFRAMER_SQUAD&&reframerSquad?.hit(kind,power,pos))return true;const E=RFR.W&&RFR.W.enc;if(!E)return false;const c=E.stage==='chase'||E.stage==='reframe'?_ra.set(E.target.x,1,E.target.z):_ra.set(E.pos.x,E.pos.y,E.pos.z);
 const arm=RFR.arms[0];
 const weakPos=arm?.cl?.getWorldPosition(_rb);
 const armHit=REFRAMER_HUNT&&E.stage==='chase'&&!RFR.hunt?.armBroken&&pos&&weakPos&&pos.distanceTo(weakPos)<1.35;
 if(pos&&pos.distanceTo(c)>3.2&&!armHit)return false;
 if(armHit){
  const weak=hitReframerArm(RFR.hunt,kind,power);
  if(weak.ok){
   burst(weakPos,20,6);beep(550,.10,'triangle',.04);
   if(weak.broken){
    // Physically detachable mechanical attachment, copied from the existing
    // claw mesh; Metal can draw its finite metal mass into Galaxy Gallium.
    const shard=arm.cl.clone();shard.position.copy(weakPos);shard.scale.setScalar(1.8);scene.add(shard);
    DRW.scrap.push({kind:'scrap',id:'reframer-arm-'+E.id,x:shard.position.x,y:shard.position.y,z:shard.position.z,
      reserve:weak.salvage,mesh:shard});
    arm.g.visible=false;
    reframerSay('armBreak','TENTACLE ATTACHMENT SEVERED','draw the recovered metal into Galaxy Gallium');
   }
   return true;
  }
 }
 const r=hit(RFR.W,kind,power);if(!r)return false;burst(c,24,6);beep(70,.08,'square',.05);
 if(r.type==='jam')reframerSay('jam'+E.jams,'SCAN JAMMED','one more and it aborts');if(r.type==='tipped')reframerSay('tip','TIPPED','hit it while it\'s down');
 if(r.type==='end')reframerEnd(r);return true;}
function reframerEnd(r){const car=RFR.car;
 if(r.outcome==='roadframeDown'||r.outcome==='escaped'||r.outcome==='lostTarget'){ // shell-car material remains scrap when abandoned
  if(car){scene.remove(car);const i=cars.indexOf(car);if(i>=0)cars.splice(i,1);for(const w of RFR.wheels){w.position.set(car.position.x+(Math.random()-.5)*4,.45,car.position.z+(Math.random()-.5)*4);w.rotation.set(0,Math.random()*6,Math.PI/2);DRW.scrap.push({kind:'scrap',x:w.position.x,y:.45,z:w.position.z,mesh:w});}}
 }else if(car){car.position.y=.05;car.rotation.x=car.rotation.z=0;let out=0;
  for(let k=0;k<RFR.wheels.length;k++){const w=RFR.wheels[k];if(!w)continue;
   if(w.parent===car){continue;}
   if(r.outcome==='fledWithParts'){scene.remove(w);out++;continue;} // it carried them off
   if(r.scatter){w.position.set(car.position.x+(Math.random()-.5)*7,.45,car.position.z+(Math.random()-.5)*7);w.rotation.set(0,Math.random()*6,Math.PI/2);RFR.parts.push({w,home:RFR.wheelHome[k],car,enc:r.id,t:-1});out++;}
   else{car.add(w);w.position.copy(RFR.wheelHome[k].p);w.quaternion.copy(RFR.wheelHome[k].q);}}
  if(r.outcome==='fledWithParts'){whisper('It fled with the wheels','');}
  else if(!out){car.userData.reframed=false;car.userData.spd=car.userData.spd0||car.userData.spd;}else if(r.scatter)whisper('Parts on the ground','hold draw near the car to guide them back');}
 if(r.residue){st.gal=Math.min(1,st.gal+r.residue);}
 st.comboPend+=3;whisper(r.outcome==='aborted'?'REFRAMER FLED':r.outcome==='clean'?'REFRAMER DOWN — car saved':r.outcome==='roadframeDown'?'ROADFRAME DOWN — salvage the scrap':r.outcome==='lostTarget'?'ROADFRAME LOST THE TRAIL — Metal escaped':'ROADFRAME GOT AWAY','');if(HELP.on)toast('ReFramer: '+r.outcome);
 RFR.car=null;RFR.wheels=[];RFR.mesh.visible=false;for(const a of RFR.arms)a.g.visible=false;RFR.scan.visible=false;RFR.said={};
 if(RFR.escapeButton)RFR.escapeButton.hidden=true;
 RFR.hunt=REFRAMER_HUNT?createReframerHunt():null;RFR.escapeTouch=false;RFR.escapePadPrev=false;}
function reframerTick(dt){if(!P)return;reframerInit();if(!RFR.W)return;const W=RFR.W,p=P.o.position;
 if(!W.enc){const donors=cars.filter(c=>!c.userData.worldBody&&c!==heldCar&&!c.userData.reframed).map(c=>({id:c.uuid,x:c.position.x,z:c.position.z,occupied:!c.userData.occupantExited,c}));
  const E=wake(W,{x:p.x,z:p.z},donors);if(E){if(REFRAMER_HUNT)RFR.hunt=createReframerHunt();RFR.car=donors.find(d=>d.id===E.donor).c;const u=RFR.car.userData;u.reframed=true;u.spd0=u.spd;u.spd=0;RFR.mesh.visible=true;if(REFRAMER_HUNT)RFR.mesh.scale.setScalar(1.45); // original disc-like machine is taller beside cars
   RFR.wheels=[];RFR.wheelHome=[];RFR.car.traverse(o=>{if(/wheel/i.test(o.name)&&o.parent&&!RFR.wheels.includes(o)){RFR.wheels.push(o);RFR.wheelHome.push({p:o.position.clone(),q:o.quaternion.clone()});}});
   reframerSay('wake','REFRAMER WAKING','it\'s dropping on a car — hit the scan to jam it');beep(120,.3,'sawtooth',.04);}
  return;}
 const E=W.enc,car=RFR.car;
 let hunted=null;
 if(REFRAMER_HUNT&&E.stage==='chase'&&RFR.hunt){
  const padDown=!!RSK.gp?.buttons?.[0]?.pressed;
  const padTap=padDown&&!RFR.escapePadPrev;RFR.escapePadPrev=padDown;
  const struggle=(RFR.hunt.tether==='hold')&&(!!pressed.KeyE||padTap||RFR.escapeTouch);
  if(struggle)pressed.KeyE=false;
  RFR.escapeTouch=false;
  const dist=Math.hypot(E.target.x-p.x,E.target.z-p.z);
  hunted=stepReframerHunt(RFR.hunt,{
    metal:{x:p.x,z:p.z},robot:{x:E.target.x,z:E.target.z},
    visible:dist<=HUNT.SIGHT,escapeTap:struggle},dt);
  if(RFR.escapeButton)RFR.escapeButton.hidden=!hunted.held;
  if(hunted.lost){
   const out=loseReframerTarget(W);if(out)reframerEnd(out);
   return; // Robot lost Metal; no teleporting to current player position.
  }
  for(const ev of hunted.events){
   if(ev.type==='tether-warn')reframerSay('tetherWarn','REFRAMER TENTACLE CHARGING','move out of its reach or break the attachment');
   if(ev.type==='tether-caught')reframerSay('tetherCaught','TENTACLE LOCK · STRUGGLE','tap E, A, or the red touch button three times');
   if(ev.type==='tether-escaped'||ev.type==='tether-dodged'){
    RFR.said.tetherWarn=false;RFR.said.tetherCaught=false;
    whisper('ESCAPED THE TENTACLE','');
   }
  }
  if(hunted.held){
   // Pull on the real player's velocity, never replace Metal's movement owner.
   vel.x=vel.x*Math.exp(-2*dt)+(E.target.x-p.x)*.85*dt;
   vel.z=vel.z*Math.exp(-2*dt)+(E.target.z-p.z)*.85*dt;
  }
  if(hunted.damage>0)metalHurt(hunted.damage,_ra.set(E.target.x,p.y,E.target.z),HELP.on?'ReFramer grapple impact':null);
 }else if(RFR.escapeButton)RFR.escapeButton.hidden=true;
 const o=step(W,{x:p.x,z:p.z},car&&E.stage!=='chase'?{x:car.position.x,z:car.position.z}:null,dt,hunted);
 for(const e of o.events){if(e.type==='stage'){if(e.stage==='anchor')reframerSay('anchor','CLAMPING','tip it: big glob or throw a car · E at the car = pull the driver');if(e.stage==='release')reframerSay('release','PULLING IT APART','');if(e.stage==='chase')reframerSay('chase','ROADFRAME','it hunts you — globs and cars break it');}
  if(e.type==='end')reframerEnd(e);if(e.type==='occupantShaken'&&car){const pz=makeChar(0xd6aa7d);pz.o.position.copy(car.position).add(new THREE.Vector3(2.6,.3,0));scene.add(pz.o);pz.target=pz.o.position.clone().add(new THREE.Vector3(9,0,9));pz.speed=3.6;pz.wait=0;pz.role='shaken driver';npcs.push(pz);car.userData.occupantExited=true;}}
 if(o.ram>0)metalHurt(o.ram,_ra.set(E.target.x,p.y,E.target.z),HELP.on?'Roadframe ram':null);
 if(!RFR.W.enc)return;
 // rescue the driver
 if(car&&E.occupied&&!E.rescued&&p.distanceTo(car.position)<3.6&&pressed.KeyE){pressed.KeyE=false;if(rescue(W)){const pz=makeChar(0xd6aa7d);pz.o.position.copy(car.position).add(new THREE.Vector3(2.6,.3,0));scene.add(pz.o);pz.target=pz.o.position.clone().add(new THREE.Vector3(9,0,9));pz.speed=3.6;pz.wait=0;pz.role='rescued driver';npcs.push(pz);car.userData.occupantExited=true;whisper('DRIVER OUT','');beep(660,.06,'triangle',.04);}}
 // visuals
 const T=performance.now()/1000,m=RFR.mesh;RFR.eye.material.emissiveIntensity=E.stage==='read'?2+Math.sin(T*20):E.stage==='stun'||E.stage==='stagger'?.2:1.4;
 if(E.stage==='chase'||E.stage==='reframe'){const k=E.stage==='reframe'?Math.min(1,E.t/3.6):1;
  if(car){car.position.set(E.target.x,.05+.9*k,E.target.z);car.rotation.y=E.heading??car.rotation.y;car.rotation.z=Math.sin(T*6)*.05*k;}
  m.position.set(E.target.x,2+1.1*k,E.target.z);m.rotation.y+=dt*3;
  RFR.wheels.forEach((w,i)=>{if(w.parent!==scene){scene.attach(w);}const a=i/RFR.wheels.length*Math.PI*2+T*4;const cx=E.target.x,cz=E.target.z;w.position.set(cx+Math.cos(a)*1.9*k+(1-k)*w.position.x*0,.5+.6*k,cz+Math.sin(a)*1.9*k);w.rotation.x+=dt*12;});}
 else{m.position.set(E.pos.x,E.pos.y+(E.stage==='stagger'||E.stage==='stun'?-.9:0),E.pos.z);m.rotation.z=E.stage==='stagger'||E.stage==='stun'?1.1:0;m.rotation.y+=dt*(E.stage==='read'?2:.6);
  if(E.stage==='release'&&car){RFR.wheels.forEach((w,i)=>{if(i<E.parts+1){if(w.parent!==scene)scene.attach(w);w.position.y=Math.min(4,w.position.y+dt*2.4);w.rotation.x+=dt*8;}});}}
 RFR.scan.visible=E.stage==='read'&&!!car;if(car){RFR.scan.position.set(car.position.x,2.2,car.position.z);RFR.scan.rotation.y+=dt*4;}
 const clamp=E.stage==='anchor'||E.stage==='release'||E.stage==='stagger'||E.stage==='stun';
 for(const [index,a] of RFR.arms.entries()){
  a.g.visible=E.stage!=='drop'&&!(REFRAMER_HUNT&&E.stage==='chase'&&RFR.hunt?.armBroken&&index===0);
  if(!a.g.visible)continue;
  const ang=a.ang+(clamp?0:Math.sin(T*3+a.ang)*.4);
  const base=_ra.copy(m.position);const tip=clamp&&car?_rb.set(car.position.x+Math.cos(ang)*1.4,car.position.y+.5,car.position.z+Math.sin(ang)*2.2):_rb.set(m.position.x+Math.cos(ang)*2.4,m.position.y-1.6+Math.sin(T*4+a.ang)*.3,m.position.z+Math.sin(ang)*2.4);
  if(REFRAMER_HUNT&&index===0&&hunted&&(hunted.tether==='windup'||hunted.tether==='hold'))
    tip.set(p.x,p.y+1.05,p.z); // first existing mechanical arm is a real extending player grabber
   const mid=_rc.copy(base).lerp(tip,.5);mid.y+=1.1;const midV=mid.clone();limb(a.s1,base,midV);limb(a.s2,midV,tip);a.cl.position.copy(tip);}
}


// ---------- MALLEABLE MORROW BLOCK v0.1 (RB1 "One Game, Every Power": first playable milestone) ----------
// Skatepark block: material pickups, Gallium constructs you actually ride, a bar you bend and grind, a wall that breaks and
// gets repaired, Osei's job board, and a saved world. Rules in malleable_world_core.mjs (node-tested).
// Build: hold the glob (G / Y) and flick the right stick (or arrows): ↑ ramp · ←/→ rail · ↓ shield. Reclaim: Metal Draw on it.
var MWB={S:null,rails:{},wall:null,wallMeshes:[],wallCols:[],conMesh:new Map(),barMesh:null,osei:null,saveT:0,dirty:false,flickPrev:false,repairT:0,straightT:0,lastRampT:-9,restoredOnce:false};
const MW_KEY='wirWorldV1';
function mwUnitsIn(){if(MWB.S)MWB.S.units=Math.round(st.gal*1000)/10;}
function mwUnitsOut(){if(MWB.S)st.gal=Math.max(0,Math.min(1,MWB.S.units/100));}
function mwSave(){MWB.dirty=true;}
function mwInit(){if(MWB.S||!skYard)return;const cx=skYard.cx,cz=skYard.cz,b=skYard.base;
 const fb=skYard.rails.find(r=>r.name==='Flat bar');
 MWB.rails.bar=railFrom(fb?fb.a:{x:cx-9,y:b+.55,z:cz+4.2},fb?fb.b:{x:cx+6,y:b+.55,z:cz+4.2},'Flat bar');
 MWB.wall=createWall(4,3);
 let txt=null;try{if(new URLSearchParams(location.search).get('world')==='reset')localStorage.removeItem(MW_KEY);txt=localStorage.getItem(MW_KEY);}catch(e){}
 MWB.S=txt?deserialize(txt,MWB.rails,MWB.wall):createWorldState();
 if(!txt)MWB.S.units=Math.round(st.gal*100);else mwUnitsOut();
 // hide the yard's own flat-bar meshes; the bendable bar draws itself
 scene.traverse(o=>{if(o.userData&&o.userData.rail==='Flat bar')o.visible=false;});
 mwRailsSync();mwBarMesh();mwWallBuild();for(const c of MWB.S.constructs)mwConMesh(c);
 // Osei — engineer from the season bible (Gyre Lesson). Mission giver, PROPOSAL placement
 const o=makeChar(0x3c6e8f);o.o.position.set(cx-16,b,cz+7);scene.add(o.o);o.target=o.o.position.clone();o.speed=0;o.wait=1e9;o.role='Osei';npcs.push(o);MWB.osei=o;
 const tag=nameTag('Osei',0x9bd3ff);tag.position.y=2.25;o.o.add(tag);worldLabels.push(tag);tag.visible=HELP.on;
}
function toRail(seg){const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,len=Math.hypot(dx,seg.b.y-seg.a.y,dz);return {...seg,len,yaw:Math.atan2(dx,dz)};}
function mwRailsSync(){if(!skYard)return;const R=skYard.rails;for(let i=R.length-1;i>=0;i--)if(R[i].name==='Flat bar'||R[i].bendable||R[i].construct)R.splice(i,1);
 for(const sgm of railSegments(MWB.rails.bar))R.push(toRail(sgm));
 for(const c of MWB.S.constructs)for(const sgm of constructRails(c))R.push(toRail(sgm));}
function mwBarMesh(){if(MWB.barMesh){scene.remove(MWB.barMesh);MWB.barMesh.traverse(m=>m.geometry&&m.geometry.dispose());}
 const g=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0xb8c6d0,metalness:.85,roughness:.32}),up=new THREE.Vector3(0,1,0);
 const pts=MWB.rails.bar.pts;for(let i=0;i<pts.length-1;i++){const A=new THREE.Vector3(pts[i].x,pts[i].y,pts[i].z),B=new THREE.Vector3(pts[i+1].x,pts[i+1].y,pts[i+1].z),d=B.clone().sub(A);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,d.length(),10),steel);m.position.copy(A).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(up,d.normalize());m.castShadow=true;g.add(m);}
 for(const q of pts){const gh=skYard.base;if(q.y-gh>.05){const m=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,q.y-gh,8),steel);m.position.set(q.x,(q.y+gh)/2,q.z);g.add(m);}}
 scene.add(g);MWB.barMesh=g;}
function mwWallBuild(){const cx=skYard.cx,cz=skYard.cz,b=skYard.base;MWB.wallOrigin={x:cx-19,y:b,z:cz+12};
 for(const m of MWB.wallMeshes)scene.remove(m.mesh);MWB.wallMeshes=[];
 const conc=new THREE.MeshStandardMaterial({color:0xa79d90,roughness:.95});
 for(const p of MWB.wall.panels){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1.48,.98,.35),p.patched?galaxyCrystalMat({}):conc.clone());mesh.castShadow=mesh.receiveShadow=true;
  mesh.position.set(MWB.wallOrigin.x+.75+p.c*1.5,b+.5+p.r,MWB.wallOrigin.z);scene.add(mesh);const box=new THREE.Box3().setFromObject(mesh);MWB.wallMeshes.push({p,mesh,box,fall:null});}
 mwWallSync();}
function mwWallSync(){for(const w of MWB.wallMeshes){const alive=w.p.hp>0;const i=colliders.indexOf(w.box);
  if(alive&&i<0&&!w.fall){colliders.push(w.box);}if(!alive&&i>=0)colliders.splice(i,1);
  if(alive){w.mesh.visible=true;w.fall=null;w.mesh.position.set(MWB.wallOrigin.x+.75+w.p.c*1.5,skYard.base+.5+w.p.r,MWB.wallOrigin.z);w.mesh.rotation.set(0,0,0);
   if(w.mesh.material.color&&!w.p.patched)w.mesh.material.color.setHex(w.p.hp<.5?0x7f776c:0xa79d90);}
  else if(!w.fall&&w.mesh.visible&&!w.rubble){w.fall={v:new THREE.Vector3((Math.random()-.5)*2,1,1.5+Math.random()*2),w:new THREE.Vector3(Math.random()*3,0,Math.random()*3)};}}}
function mwWallTick(dt){for(const w of MWB.wallMeshes){if(!w.fall)continue;const f=w.fall;f.v.y-=9.8*dt;w.mesh.position.addScaledVector(f.v,dt);w.mesh.rotation.x+=f.w.x*dt;w.mesh.rotation.z+=f.w.z*dt;
  if(w.mesh.position.y<skYard.base+.2){w.mesh.position.y=skYard.base+.2;f.v.multiplyScalar(.3);f.v.y=0;f.w.multiplyScalar(.2);if(f.v.length()<.2){w.fall=null;w.rubble=true;DRW.scrap.push({kind:'scrap',x:w.mesh.position.x,y:w.mesh.position.y,z:w.mesh.position.z,reserve:.08,rubbleOf:w});}}}}
function mwHitWall(pos,force,src){if(!MWB.wall)return false;let hitAny=false;
 for(const w of MWB.wallMeshes){if(w.p.hp<=0)continue;const bb=w.box.clone().expandByScalar(.35+(src==='glob'?.2:0));if(!bb.containsPoint(pos))continue;
  const fell=hitWall(MWB.wall,w.p.c,w.p.r,force);hitAny=true;burst(pos,16+fell.length*12,5);FG.shake=Math.max(FG.shake,.15+.08*fell.length);beep(60,.1,'square',.05);
  if(fell.length)whisper('Wall broke ('+fell.length+')','Osei: hold draw at the wall to patch it with Gallium');break;}
 if(hitAny){mwWallSync();mwSave();MWB.restoredOnce=false;}return hitAny;}
function mwConMesh(c){const b=c.base,grp=new THREE.Group(),mat=galaxyCrystalMat({});
 if(c.kind==='ramp'){const sh=new THREE.Shape();sh.moveTo(0,0);for(let i=0;i<=12;i++){const u=i/12*3.2,k=u/3.2;sh.lineTo(u,1.1*k*k);}sh.lineTo(3.2,0);sh.lineTo(0,0);
  const g=new THREE.ExtrudeGeometry(sh,{depth:2.4,bevelEnabled:false});g.translate(0,0,-1.2);const m=new THREE.Mesh(g,mat);m.rotation.y=c.h-Math.PI/2;grp.add(m);}
 else if(c.kind==='rail'){const L=6,m=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,L,10),mat);m.rotation.x=Math.PI/2;m.position.y=.55;grp.add(m);for(const k of [-2.6,0,2.6]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.55,8),mat);p.position.set(0,.275,k);grp.add(p);}grp.rotation.y=c.h;}
 else{const m=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.2,.3),mat);m.position.y=1.1;grp.add(m);grp.rotation.y=c.h;const box=new THREE.Box3();grp.userData.box=box;}
 grp.position.set(c.x,b,c.z);grp.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(grp);
 if(c.kind==='shield'){grp.updateMatrixWorld(true);grp.userData.box.setFromObject(grp);colliders.push(grp.userData.box);}
 MWB.conMesh.set(c.id,grp);}
function mwConRemove(cid){const g=MWB.conMesh.get(cid);if(!g)return;if(g.userData.box){const i=colliders.indexOf(g.userData.box);if(i>=0)colliders.splice(i,1);}scene.remove(g);MWB.conMesh.delete(cid);mwRailsSync();}
function mwBuild(kind){if(!MWB.S)return;
 st.gal=Math.min(1,st.gal+GLB.g.spent);GLB.g.size=0;GLB.g.spent=0;if(GLB.mesh)GLB.mesh.visible=false;GLB.prevHold=false;GLB.suppress=.4; // the held glob becomes the construct's matter
 mwUnitsIn();const f={x:Math.sin(yaw),z:Math.cos(yaw)},d=kind==='ramp'?1.2:2.6;
 const r=build(MWB.S,kind,P.o.position.x+f.x*d,P.o.position.z+f.z*d,kind==='shield'?yaw:yaw,floorAt(P.o.position));
 if(!r.ok){beep(110,.12,'square',.04);whisper(r.why==='locked'?'Not learned yet':'Not enough Gallium',r.why==='locked'?(kind==='rail'?'Osei: finish The Missing Span':'Osei: finish Don\'t Let It Fall'):'Metal Draw to gather more ('+MAT.COST[kind]+' units)');return;}
 mwUnitsOut();mwConMesh(r.c);mwRailsSync();mwSave();burst(new THREE.Vector3(r.c.x,r.c.base+.6,r.c.z),50,6);beep(240,.09,'triangle',.05);setViolet(1);
 whisper('Gallium '+kind+' · −'+MAT.COST[kind],'ride it · Metal Draw on it to take the material back');}
function mwInput(){if(!MWB.S||!GLB.g.held||GLB.g.size<=0)return;const gp=RSK.gp;let dir=null;
 if(gp){const x=gp.axes[2]||0,y=gp.axes[3]||0,m=Math.hypot(x,y);if(m>.8&&!MWB.flickPrev){dir=Math.abs(y)>Math.abs(x)?(y<0?'up':'down'):(x<0?'left':'right');}MWB.flickPrev=m>.5;}
 if(tap('ArrowUp'))dir='up';else if(tap('ArrowDown'))dir='down';else if(tap('ArrowLeft'))dir='left';else if(tap('ArrowRight'))dir='right';
 if(dir)mwBuild(dir==='up'?'ramp':dir==='down'?'shield':'rail');}
function mwFloor(x,z){if(!MWB.S)return -1;let h=-1;for(const c of MWB.S.constructs){const v=constructHeight(c,x,z);if(v>h)h=v;}return h;}
function mwTick(dt){if(!skYard||!P)return;mwInit();if(!MWB.S)return;mwInput();mwWallTick(dt);
 const p=P.o.position;
 // construct sources for Metal Draw (reclaim), and constructs drained → removed
 for(const c of MWB.S.constructs){c.drawSrc=c.drawSrc||{kind:'scrap',x:c.x,y:c.base+.6,z:c.z,reserve:c.cost/100*Math.max(.2,c.hp),con:c.id};if(!DRW.scrap.includes(c.drawSrc))DRW.scrap.push(c.drawSrc);
  if(c.drawSrc.reserve<=.001){const i=DRW.scrap.indexOf(c.drawSrc);if(i>=0)DRW.scrap.splice(i,1);MWB.S.constructs.splice(MWB.S.constructs.indexOf(c),1);MWB.S.stats.reclaimed++;mwConRemove(c.id);mwSave();whisper('Reclaimed','');break;}}
 // drawing near the wall patches it; near the bent bar straightens it
 const drawing=DRW.drawing;
 if(drawing&&MWB.wallOrigin&&Math.hypot(p.x-(MWB.wallOrigin.x+3),p.z-MWB.wallOrigin.z)<4.5){MWB.repairT+=dt;if(MWB.repairT>.6){MWB.repairT=0;mwUnitsIn();const r=repairWall(MWB.S,MWB.wall);if(r&&r.ok){mwUnitsOut();const w=MWB.wallMeshes.find(m=>m.p===r.panel);if(w){w.rubble=false;w.mesh.material=galaxyCrystalMat({});const i=DRW.scrap.findIndex(s=>s.rubbleOf===w);if(i>=0)DRW.scrap.splice(i,1);}mwWallSync();mwSave();burst(w?w.mesh.position:p,24,4);beep(300,.06,'triangle',.04);}
   else if(r&&!r.ok)whisper('Not enough Gallium to patch','10 units a panel');}}
 else MWB.repairT=0;
 const ws=wallState(MWB.wall);if(ws.broken===0&&ws.cracked===0&&MWB.wall.panels.some(q=>q.patched)&&!MWB.restoredOnce){MWB.restoredOnce=true;MWB.S.stats.wallRestored++;mwSave();}
 if(drawing&&MWB.rails.bar.bent&&MWB.rails.bar.pts.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<2.5)){MWB.straightT+=dt;if(MWB.straightT>1.5){MWB.straightT=0;mwUnitsIn();if(MWB.S.units>=MAT.COST.straighten){MWB.S.units-=MAT.COST.straighten;mwUnitsOut();straightenRail(MWB.rails.bar);mwRailsSync();mwBarMesh();mwSave();whisper('Bar straightened','');}}}else MWB.straightT=0;
 // jobs (mastery-based unlocks)
 MWB.jobT=(MWB.jobT||0)+dt;if(MWB.jobT>.5){MWB.jobT=0;const j=checkJobs(MWB.S);if(j){mwSave();st.gal=Math.min(1,st.gal+.2);burst(_fv2.copy(p).setY(p.y+1.4),60,6);beep(520,.1,'triangle',.05);setTimeout(()=>beep(780,.14,'triangle',.05),110);
   whisper('Job done · '+j.title,j.unlock?'Learned: Gallium '+j.unlock:'');if(HELP.on)toast('Osei: '+j.title+' done'+(j.unlock?' — Gallium '+j.unlock+' learned':''));}}
 if(MWB.osei){const d=MWB.osei.o.position.distanceTo(p);if(d<9){MWB.osei.o.rotation.y=Math.atan2(p.x-MWB.osei.o.position.x,p.z-MWB.osei.o.position.z);}
  if(d<3&&pressed.KeyE){pressed.KeyE=false;const j=currentJob(MWB.S);play(MWB.osei,'Wave',true);beep(400,.05,'triangle',.03);whisper(j?'Osei · '+j.title:'Osei · all jobs done',j?j.ask:'the block remembers what you fixed');}}
 // save (debounced)
 MWB.saveT-=dt;if(MWB.dirty&&MWB.saveT<=0){MWB.saveT=2;MWB.dirty=false;mwUnitsIn();try{localStorage.setItem(MW_KEY,serialize(MWB.S,MWB.rails,MWB.wall));}catch(e){}}
 MWB.S.stats.drawn+=(DRW.lastGot||0)*100;
}


// ---------- MILESTONE A: Metal lives here — get in a car, drive the same live city, get out (ReFramer Rush DrivePhysics) ----------
// E / D-up near Metal's own car (parked by the Commons) or any empty car: the board is stowed, Rush's drive model takes over.
// Pad: R2 gas · L2 brake/reverse · left stick steer · B handbrake drift · A nitro · Y or D-up get out.
// Keys: W/↑ gas · S/↓ brake · A/D steer · Space drift · Shift nitro · E get out. PROPOSAL / HOLD.
const DRV={active:false,car:null,c:null,U:0.094,keys:{},mine:null,hadBoard:false,prevUp:false,prevY:false,hitCd:0};
addEventListener('keydown',e=>{DRV.keys[e.code]=true;});addEventListener('keyup',e=>{DRV.keys[e.code]=false;});
function driveInit(){bikeInit();if(DRV.mine||!cars.length||!SPOTS.home||!SPOTS.home.c)return;
 const base=cars.find(c=>c.children.length&&!c.userData.bike)||cars[0];const m=base.clone(true);m.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();if(!/wheel/i.test(o.parent&&o.parent.name||'')&&o.material.color)o.material.color.setHex(0x15151b);}});
 const h=SPOTS.home.c;m.position.set(h.x+BLOCK/2+2.2,.05,h.z-6);m.rotation.y=0;m.userData={axis:1,lane:m.position.x,dir:1,t:m.position.z,spd:0,parked:true,mine:true,occupantExited:true,occupantCount:0};scene.add(m);cars.push(m);DRV.mine=m;}
function canDrive(c){const u=c.userData;return c!==heldCar&&!u.worldBody&&!u.reframed&&(u.mine||u.occupantExited);}
function driveEnter(car){const u=car.userData;DRV.active=true;DRV.car=car;u.driven=true;u.parked=false;DRV.hadBoard=st.board;if(st.board){st.board=false;}
 const h=car.rotation.y;DRV.c=vehicle(car.position.x/DRV.U,car.position.z/DRV.U,Math.PI/2-h);DRV.isBike=!!u.bike;P.o.visible=DRV.isBike;board.visible=false;vel.set(0,0,0);if(DRV.isBike)bikePose();
 beep(180,.08,'triangle',.04);setTimeout(()=>beep(90,.25,'sawtooth',.03),90);whisper(DRV.isBike?'Riding the Morrow prototype':'Driving','R2 gas · L2 brake · B drift · A nitro · Y off');}
function driveExit(){const car=DRV.car,u=car.userData;DRV.active=false;u.driven=false;u.parked=true;u.spd=0;P.o.visible=true;if(DRV.isBike){P.o.rotation.set(0,P.o.rotation.y,0);if(u.body)u.body.rotation.z=0;DRV.isBike=false;const a=P.acts.u_Walk_Carry_Loop;if(a)a.setEffectiveTimeScale(1);play(P,'Idle');}
 const h=car.rotation.y,left=new THREE.Vector3(Math.cos(h),0,-Math.sin(h));const out=car.position.clone().addScaledVector(left,2.2);out.y=floorAt(out)+.02;P.o.position.copy(out);vel.set(0,0,0);yaw=h;
 if(DRV.hadBoard){st.board=true;board.visible=true;}DRV.car=null;DRV.c=null;beep(140,.06,'triangle',.04);}
function driveTick(dt){driveInit();const gp=RSK.gp;
 const up=!!(gp&&gp.buttons[12]&&gp.buttons[12].pressed);if(up&&!DRV.prevUp)pressed.KeyE=true;DRV.prevUp=up; // D-up = interact everywhere
 if(pressed.KeyE&&!DRV.active&&bindTry())pressed.KeyE=false; // Gallium Bind gets first say when someone is down next to you
 if(!DRV.active){if(!P||st.swing||st.flying)return;if(pressed.KeyE){const near=cars.filter(canDrive).map(c=>({c,d:c.position.distanceTo(P.o.position)})).filter(o=>o.d<3.4).sort((a,b)=>a.d-b.d)[0];if(near){pressed.KeyE=false;driveEnter(near.c);}}return;}
 const K=DRV.keys,car=DRV.car,c=DRV.c;
 const yb=!!(gp&&gp.buttons[3]&&gp.buttons[3].pressed);const exit=pressed.KeyE||(yb&&!DRV.prevY);DRV.prevY=yb;if(exit&&Math.hypot(c.vx,c.vy)*DRV.U<6){pressed.KeyE=false;driveExit();return;}
 const a={throttle:Math.max(gp?gp.buttons[7]?.value||0:0,K.KeyW||K.ArrowUp?1:0),brake:Math.max(gp?gp.buttons[6]?.value||0:0,K.KeyS||K.ArrowDown?1:0),
  steer:Math.max(-1,Math.min(1,((gp?deadzone(gp.axes[0]||0,.13):0)+(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0))*(DRV.isBike?1.13:1))),drift:!!(K.Space||gp&&gp.buttons[1]?.pressed),nitro:!!(K.ShiftLeft||gp&&gp.buttons[0]?.pressed)};
 // drafting behind traffic refills nitro (Rush slipstream)
 let draft=0;const fw=new THREE.Vector3(Math.cos(c.angle),0,Math.sin(c.angle));for(const t of cars){if(t===car)continue;const v=t.position.clone().sub(car.position).setY(0),d=v.length();if(d>3&&d<14&&v.normalize().dot(fw)>.9)draft=Math.max(draft,1-d/14);}
 const ox=c.x,oy=c.y;for(let s=0;s<2;s++)driveStepPhys(c,a,{road:true,draft,assist:'street'},dt/2);
 // world collisions (buildings, shields, wall panels): bounce off, no clipping
 const wp=new THREE.Vector3(c.x*DRV.U,1,c.y*DRV.U);let hitB=false;for(const b of colliders){if(b.max.y<.6)continue;const rr=DRV.isBike?.55:1.1;if(wp.x>b.min.x-rr&&wp.x<b.max.x+rr&&wp.z>b.min.z-rr&&wp.z<b.max.z+rr){hitB=true;break;}}
 if(hitB){const sp=Math.hypot(c.vx,c.vy)*DRV.U;c.x=ox;c.y=oy;c.vx*=-.25;c.vy*=-.25;c.yawRate*=.3;if(sp>6&&DRV.hitCd<=0){DRV.hitCd=.6;FG.shake=Math.min(.5,.1+sp*.02);beep(55,.12,'square',.05);mwHitWall&&mwHitWall(wp.clone().setY(1),Math.min(1,sp/20),'car');}}
 DRV.hitCd-=dt;
 for(const t of cars){if(t===car||t.userData.worldBody)continue;const d=Math.hypot(t.position.x-c.x*DRV.U,t.position.z-c.y*DRV.U);if(d<2.6){c.vx*=.55;c.vy*=.55;if(DRV.hitCd<=0){DRV.hitCd=.5;FG.shake=.25;beep(70,.1,'square',.05);}}}
 const E=RFR.W&&RFR.W.enc;if(E&&E.stage==='chase'){const d=Math.hypot(E.target.x-c.x*DRV.U,E.target.z-c.y*DRV.U),sp=Math.hypot(c.vx,c.vy)*DRV.U;if(d<3&&sp>7&&DRV.hitCd<=0){DRV.hitCd=.8;c.vx*=.3;c.vy*=.3;reframerHit('car',Math.min(1,sp/22),new THREE.Vector3(E.target.x,1,E.target.z));}}
 car.position.set(c.x*DRV.U,.05,c.y*DRV.U);car.rotation.y=Math.PI/2-c.angle;car.rotation.z=-c.roll*.05;
 const wsp=Math.hypot(c.vx,c.vy)*DRV.U;car.traverse(o=>{if(/wheel/i.test(o.name))o.rotation.x+=wsp*dt*2.4;});
 if(DRV.isBike){const bd=car.userData.body,lean=Math.max(-.5,Math.min(.5,-(c.yawRate||0)*wsp*.012));car.rotation.z=0;bd.rotation.z+=(lean-bd.rotation.z)*Math.min(1,dt*6);P.o.position.copy(car.position).setY(car.position.y+.42);P.o.rotation.set(0,car.rotation.y,bd.rotation.z*.8);yaw=car.rotation.y;bikePose();}
 else P.o.position.copy(car.position).setY(.3);vel.set(0,0,0);onGround=true;
 camYaw+=angDiff(camYaw,car.rotation.y+Math.PI)*Math.min(1,dt*4);camPitch+=(.22-camPitch)*Math.min(1,dt*3);
 if(Math.abs(c.driftAngle)>12&&wsp>14&&Math.random()<.3)burst(car.position.clone().setY(.2),2,1.5);
}
// stop the on-foot / skate input while driving (keys copied into DRV.keys above)
function driveSwallowInput(){if(!DRV.active)return;for(const k of ['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyG','KeyQ','KeyF','KeyB']){keys[k]=false;pressed[k]=false;}}

// ---------- LIL HEAVY (Milestone C) — scouts ahead, warns of machines, rolls Metal's board back after a bail ----------
// Look is a PROPOSAL placeholder (small board-bodied buddy) pending Metal's Bot canon on Lil Heavy's design.
const LH={o:null,v:new THREE.Vector3(),mode:'follow',warned:new Set(),beepT:0};
function lilHeavyInit(){if(LH.o||!P)return;const g=new THREE.Group();g.name='LIL HEAVY | independent living miniature board prototype';
 const M=(c,r=.6)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
 const deck=new THREE.Mesh(new THREE.BoxGeometry(.23,.065,.53),M(0x0a0715,.6));deck.position.y=.12;g.add(deck); // owner v0.2 design
 const strip=new THREE.Mesh(new THREE.BoxGeometry(.09,.025,.25),new THREE.MeshStandardMaterial({color:0x9966ce,roughness:.4,emissive:0x9966ce,emissiveIntensity:0}));strip.position.y=.16;g.add(strip);LH.eye=strip; // lights only when he's active
 for(const x of [-.12,.12])for(const z of [-.18,.18]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.07,8),M(0xb4a6aa));w.rotation.z=Math.PI/2;w.position.set(x,.045,z);g.add(w);}
 LH.legs=[];for(let i=0;i<4;i++){const piv=new THREE.Group();piv.position.set((i%2?1:-1)*.15,.10,(i<2?-1:1)*.15);piv.rotation.y=(i%2?1:-1)*.6;const t=new THREE.Mesh(new THREE.BoxGeometry(.035,.03,.25),M(0x8d67a8,.45));piv.add(t);g.add(piv);LH.legs.push(piv);}
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.position.copy(P.o.position).add(new THREE.Vector3(1.2,0,-1));scene.add(g);LH.o=g;}
function lilHeavyTick(dt){lilHeavyInit();if(!LH.o)return;const o=LH.o,p=P.o.position;o.visible=!DRV.active;if(DRV.active){o.position.copy(p);return;}
 let target=null,speed=6;LH.mode='follow';
 if(RSK.loose&&!st.board){target=new THREE.Vector3(RSK.loose.p.x,0,RSK.loose.p.z);LH.mode='fetch';speed=8;
  if(o.position.distanceTo(target.clone().setY(o.position.y))<.9){const L=RSK.loose,d=new THREE.Vector3(p.x-L.p.x,0,p.z-L.p.z);if(d.length()>1.3){d.normalize();L.v.x+=(d.x*2.6-L.v.x)*Math.min(1,dt*3);L.v.z+=(d.z*2.6-L.v.z)*Math.min(1,dt*3);L.roll*=.9;}}}
 if(!target){ // scout: a machine or villain close by → roll toward it and chirp a warning once
  const threats=[];const E=RFR.W&&RFR.W.enc;if(E)threats.push({id:'rf'+E.id,x:E.target.x,z:E.target.z});if(WTV.S&&WTV.S.mission==='DEFEND')threats.push({id:'rfWT',x:WTV.core.position.x,z:WTV.core.position.z});for(const c of STORY_FIGHTS)if(c.state!=='cool'&&c.members[0]&&c.members[0].ch.o.visible&&!c.members[0].R.out)threats.push({id:c.name,x:c.members[0].ch.o.position.x,z:c.members[0].ch.o.position.z});
  const th=threats.map(t=>({...t,d:Math.hypot(t.x-p.x,t.z-p.z)})).filter(t=>t.d<40).sort((a,b)=>a.d-b.d)[0];
  if(th&&!LH.warned.has(th.id)){LH.mode='scout';const dir=new THREE.Vector3(th.x-p.x,0,th.z-p.z).normalize();target=p.clone().addScaledVector(dir,4);if(o.position.distanceTo(target)<1.2){LH.warned.add(th.id);for(let k=0;k<3;k++)setTimeout(()=>beep(1250-k*180,.05,'square',.03),k*110);whisper('Lil Heavy: heads up',th.id.startsWith('rf')?'machine nearby':th.id+' nearby');}}
  if(!target){const side=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),back=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));target=p.clone().addScaledVector(side,1).addScaledVector(back,1.4);speed=Math.max(3,Math.hypot(vel.x,vel.z)+2);}}
 const d=target.clone().sub(o.position).setY(0),dist=d.length();
 if(dist>40){o.position.copy(p).add(new THREE.Vector3(1,0,-1));} // caught a ride / took a shortcut
 else if(dist>.3){const want=d.normalize().multiplyScalar(Math.min(speed,dist*3));LH.v.lerp(want,Math.min(1,dt*5));o.position.addScaledVector(LH.v,dt);o.rotation.y=Math.atan2(LH.v.x,LH.v.z);}
 else LH.v.multiplyScalar(Math.exp(-6*dt));
 o.position.y=floorAt(o.position.clone().setY(o.position.y+.5))+(Math.hypot(LH.v.x,LH.v.z)>.5?Math.abs(Math.sin(performance.now()/90))*.03:0);
 LH.eye.material.emissiveIntensity=LH.mode==='scout'?1.2+Math.sin(performance.now()/60):LH.mode==='fetch'?.6:0;
 const sp=Math.hypot(LH.v.x,LH.v.z),tt=performance.now()/1000;LH.legs.forEach((l,i)=>{l.rotation.x=sp>.4?Math.sin(tt*14+i*1.7)*.35:0;l.rotation.z=(i%2?-1:1)*(sp>.4?.25:.1);});}

// ---------- MARI · game of S.K.A.T.E. (Milestone C skate competition; Season One Ep.21 "Side B") ----------
const MARI={o:null,state:'idle',set:null,setter:'mari',letters:{metal:0,mari:0},t:0,skill:.8,said:''};
const SKATE_POOL=['Ollie','Nollie','Kickflip','Heelflip','BS Pop Shove-It','FS Pop Shove-It','Varial Kickflip','Hardflip','Tre Flip','Impossible'];
const TRICK_DIFF={Ollie:.05,Nollie:.12,Kickflip:.2,Heelflip:.22,'BS Pop Shove-It':.15,'FS Pop Shove-It':.17,'Varial Kickflip':.35,Hardflip:.45,'Tre Flip':.55,Impossible:.5};
function mariInit(){if(MARI.o||!skYard)return;const fit={top:0xd9822b,bot:0x2a2d33,shoe:0xe8e4da,f:1,h:1.66};const ch=(crewFemGLTF||rivalGLTF)?makeFighter(crewFemGLTF||rivalGLTF,fit):makeChar(0xd9822b);
 ch.o.position.set(skYard.cx+10,skYard.base,skYard.cz-16);scene.add(ch.o);MARI.o=ch;const tag=nameTag('Mari · S.K.A.T.E.',0xffb36b);tag.position.y=2.1;ch.o.add(tag);worldLabels.push(tag);tag.visible=HELP.on;}
const SKATE_WORD='SKATE';
function mariSay(t,s){MARI.said=t;whisper(t,s);}
function mariLetters(){return 'Metal '+SKATE_WORD.slice(0,MARI.letters.metal).padEnd(5,'·')+' · Mari '+SKATE_WORD.slice(0,MARI.letters.mari).padEnd(5,'·');}
function mariSet(){MARI.setter='mari';const pool=SKATE_POOL.filter(n=>TRICK_DIFF[n]<=MARI.skill*.7+.05);const pick=pool[Math.floor(Math.random()*pool.length)];
 const lands=Math.random()<MARI.skill+.12-TRICK_DIFF[pick];playT(MARI.o,'Jump',.7);setTimeout(()=>beep(lands?520:160,.08,'triangle',.04),700);
 if(lands){MARI.set=pick;MARI.state='match';MARI.t=15;mariSay('Mari set: '+pick,'land it within 15 s · '+mariLetters());}
 else{MARI.state='metalSets';MARI.t=20;mariSay('Mari missed her set','your turn to set · '+mariLetters());}}
function mariStart(){MARI.letters={metal:0,mari:0};MARI.skill=Math.min(.95,.7+.05*(+(localStorage.getItem('wirMariWins')||0)));mariSay('Game of S.K.A.T.E. with Mari','she sets first');setTimeout(mariSet,1200);MARI.state='wait';}
function mariLetter(who){MARI.letters[who]++;beep(who==='metal'?140:600,.12,'triangle',.04);
 if(MARI.letters[who]>=5){const won=who==='mari'?'metal':'mari';MARI.state='idle';mariSay(won==='metal'?'You beat Mari':'Mari wins — S.K.A.T.E.',won==='metal'?'she\'ll come back sharper':'run it back');if(won==='metal'){try{localStorage.setItem('wirMariWins',String(+(localStorage.getItem('wirMariWins')||0)+1));}catch(e){}st.comboPend+=4;}
  else playT(MARI.o,'Dance',1.2);return true;}return false;}
function mariOnLand(e){if(!MARI.o||MARI.o.o.position.distanceTo(P.o.position)>45)return;
 if(MARI.state==='match'){if(e.ok&&e.name&&e.name.replace(/^(Fakie |FS \d+ |BS \d+ )/,'').startsWith(MARI.set)){mariSay('Matched '+MARI.set,mariLetters());MARI.state='metalSets';MARI.t=20;beep(660,.08,'triangle',.04);}else if(!e.ok||e.pts>0){if(!mariLetter('metal')){mariSay('Missed — letter',mariLetters());setTimeout(mariSet,1200);MARI.state='wait';}}}
 else if(MARI.state==='metalSets'&&e.ok&&e.pts>0){const nm=SKATE_POOL.find(n=>e.name.includes(n))||e.name;const diff=TRICK_DIFF[nm]??.3;MARI.state='wait';mariSay('You set: '+nm,'Mari\'s turn');
  setTimeout(()=>{playT(MARI.o,'Jump',.7);const lands=Math.random()<MARI.skill+.1-diff;setTimeout(()=>{if(lands){mariSay('Mari matched it',mariLetters());setTimeout(mariSet,1000);}else if(!mariLetter('mari')){mariSay('Mari missed — letter',mariLetters());MARI.state='metalSets';MARI.t=20;}},700);},900);}}
function mariTick(dt){mariInit();if(!MARI.o)return;const o=MARI.o.o,p=P.o.position,d=o.position.distanceTo(p);
 if(d<12)o.rotation.y=Math.atan2(p.x-o.position.x,p.z-o.position.z);
 if(MARI.state==='idle'&&d<3&&pressed.KeyE){pressed.KeyE=false;mariStart();}
 if(MARI.state==='match'||MARI.state==='metalSets'){MARI.t-=dt;if(d>45){MARI.state='idle';mariSay('Mari: game over — you left','');}
  else if(MARI.t<=0){if(MARI.state==='match'){if(!mariLetter('metal')){mariSay('Time — letter',mariLetters());setTimeout(mariSet,1000);MARI.state='wait';}}else{mariSay('Too slow — Mari sets','');setTimeout(mariSet,600);MARI.state='wait';}}}}

// ---------- PROLOGUE · LEARN THE CITY + GALLIUM BIND + POWER CARDS (PROPOSAL / HOLD, 2026-11-07) ----------
// The first mission. Starts by itself on a fresh save (?prologue=0 = off · =reset = start over · =1 = replay).
// Teaches: where you are → move + jump → board → push → gates → ollie → Gallop → Gallium line → Snapline →
// a street fight with three different people (brawler · thrower · lookout) → restrain them (Gallium Bind) →
// police pickup → cycle every power (D-pad ▼) → head to Morrow Block for Ep.1.
// Gallium Bind works everywhere: D-pad ▲ / E next to someone tapped out or giving up. Nonlethal: cuffs hold until
// the police take them, then the cuff Gallium drips back to the street as a puddle.
const RF_GAP=75; // seconds between ReFramer encounters (PROPOSAL)
const PRQ=new URLSearchParams(location.search).get('prologue'),PRO_KEY='wirPrologueV1',BIND_COST=.04;
const POWER_CARDS=[
 {id:'glob',name:'Gallium Glob',pad:'Y — hold to bend it, let go to throw',keys:'G — hold, release to throw'},
 {id:'blast',name:'Blast',pad:'L1 tap (needs charge — hold L1 near metal first)',keys:'U / Numpad 7 (charge: hold K)'},
 {id:'draw',name:'Metal Draw',pad:'hold L1 near cars, lamps, rails',keys:'hold K / Numpad 5'},
 {id:'line',name:'Gallium Line',pad:'R1 — swing from lamps and rooftops',keys:'Q'},
 {id:'board',name:'Board — forge · call back · melt',pad:'B tap = call back / forge · hold B = melt to a puddle',keys:'B tap · hold B'},
 {id:'pull',name:'PULL — Star Merkaba',pad:'L2 + R2 on foot — metal streams in',keys:'hold Y'},
 {id:'sword',name:'Galaxy Sword',pad:'PULL + X',keys:'hold Y + J'},
 {id:'shield',name:'Liquid Shield',pad:'PULL + B',keys:'hold Y + B'},
 {id:'plasma',name:'Plasma Blast',pad:'PULL + Y',keys:'hold Y + G'},
 {id:'gallop',name:'Gallium Gallop',pad:'X on the board — again right after each landing',keys:'C on the board'},
 {id:'snapline',name:'Crown points + Snapline',pad:'on the board: D-pad ◀ mark · ▶ commit',keys:'1 mark · 2 commit'},
 {id:'bind',name:'Gallium Bind',pad:'D-pad ▲ next to someone down or giving up',keys:'E'},
 {id:'flight',name:'Star Merkaba Flight',pad:'hold R2 in the air',keys:'F in the air'},
 {id:'form',name:'Season form',pad:'— (keys only for now)',keys:'I / Numpad 8'}];
const PR={M:null,on:false,ready:false,el:null,pillar:null,gates:[],gi:0,crew:null,C:null,foes:[],site:null,routes:null,intents:null,bricks:[],clips:false,police:null,
 prev:{yaw:null,pos:null,ground:true,swings:0,board:false,hand:null,form:null}};
const PCARD={i:0,T:0,prev:false,el:null,used:new Set()};
const CUFFS=new Map();
function proSave(){try{if(PR.M)localStorage.setItem(PRO_KEY,proSerialize(PR.M));}catch(e){}}
function proFeed(kind,v){if(!PR.on||!PR.M)return;const e=proPFeed(PR.M,kind,v);if(e)proEvent(e);}
function proHook(kind,v){if(kind==='power'){PCARD.used.add(v);proFeed('power',v);}else proFeed(kind,v);}
function proInit(){if(PR.ready||!P||!rivalGLTF||!SPOTS.home||!SPOTS.home.c)return;PR.ready=true;
 if(PRQ==='reset'){try{localStorage.removeItem(PRO_KEY);}catch(e){}}
 if(PRQ==='0')return;
 let M=null;try{const t=localStorage.getItem(PRO_KEY);if(t)M=proDeserialize(t);}catch(e){}
 if(!M||PRQ==='1'&&M.step==='done')M=createPro();if(M.step==='done')return;
 try{proBuild();}catch(e){console.error(e);window.__errors&&window.__errors.push('prologue build: '+e.message);return;}PR.M=M;PR.on=true;proSave();proEnter(M.step);whisper('PROLOGUE · LEARN THE CITY','you are Metal — this is where it starts');}
function proBuild(){const y=groundY;PR.site=new THREE.Vector3(-(BLOCK+ROAD)/2,y,12);const sx=PR.site.x;
 PR.routes=[[{x:sx,z:40},{x:sx,z:84}],[{x:sx,z:-28},{x:-84,z:-28}],[{x:sx,z:28},{x:-84,z:28}]]; // real roads, away from the car
 const src=cars.find(c=>!c.userData.mine&&!c.userData.bike&&!c.userData.worldBody);
 if(src){const ud=[];src.traverse(o=>{ud.push([o,o.userData]);o.userData={};});const car=src.clone(true);for(const [o,u] of ud)o.userData=u;/* userData holds live links (draw sources) that clone() can't copy */car.position.set(sx+1.6,.05,PR.site.z+3);car.rotation.set(0,0,.05);scene.add(car);PR.car=car;let wh=null;car.traverse(o=>{if(!wh&&/wheel/i.test(o.name))wh=o;});if(wh)wh.visible=false;}
 PR.C=createCrew();const c={name:'Scrap crew',home:PR.site.clone(),state:'pr',level:1,members:[],story:true,prCtl:true};PR.crew=c;
 const fits=[{top:0x5b3b2a,bot:0x22252b,shoe:0x111111,h:1.92},{top:0x2f4a3a,bot:0x1d1f24,shoe:0x222222,h:1.8},{top:0x3a3550,bot:0x202227,shoe:0x151515,h:1.76}];
 ROLES.forEach((role,i)=>{const ch=makeFighter(rivalGLTF,fits[i]);ch.o.position.set(sx-1.4+i*1.5,y,PR.site.z+(i===1?-1.2:1.2));ch.o.rotation.y=Math.PI/2;scene.add(ch.o);
  const t=nameTag('Scrap crew · '+role,0xc9ccd4);t.position.y=2.35;ch.o.add(t);worldLabels.push(t);t.visible=HELP.on;
  const R={kind:'crew',crew:c,label:'Scrap crew · '+role,style:'street',active:false,stance:1,level:1,out:false,slot:i*2,kb:new THREE.Vector3(),pr:i};
  if(role!=='brawler')R.custom=proBrain;const foe={ch,R};c.members.push(foe);FOES.push(foe);PR.foes.push(foe);});
 const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.22,16),new THREE.MeshStandardMaterial({color:0x151515,roughness:.8}));wheel.rotation.z=Math.PI/2;wheel.position.set(0,1.05,.42);PR.foes[2].ch.o.add(wheel);PR.wheel=wheel;
 PR.pillar=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,36,16,1,true),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));PR.pillar.visible=false;scene.add(PR.pillar);
 const el=document.createElement('div');el.id='prologueCard';el.className='wir-keep';el.style.cssText='position:fixed;left:12px;top:64px;z-index:31;max-width:340px;padding:8px 11px;background:rgba(12,10,22,.72);color:#efe9ff;border-left:3px solid #ffb347;border-radius:8px;font:500 12.5px/1.4 system-ui;pointer-events:none';document.body.appendChild(el);PR.el=el;}
const PRO_TEXT={
 where:['Where you are',()=>'You\'re Metal. This is Savannah — WIR: Connected. You\'re standing in Forsyth Commons, your home block. Around it: Skatepark · Pickup Field · Fight Lot · Dojo Plaza · The Forge · Pluto Hub · Foundry Steps · Morrow Block. The amber light always shows where to go next.',p=>p?'Look around — right stick':'Look around — drag the mouse'],
 walk:['Move',()=>'Get your feet under you.',p=>p?'Left stick to move · A to jump':'WASD to move · Space to jump'],
 board:['Your board',()=>'Galaxy Gallium is finite liquid metal. It sets into a real four-wheel board under you.',p=>p?'Tap B — forge the board':'Tap B — forge the board'],
 push:['Push',()=>'One stroke per tap. Lean is how you steer.',p=>p?'Tap A to push · left stick to lean':'Tap W to push · A / D to lean'],
 gates:['Ride the line',()=>'Three amber gates on the road south of the Commons.',p=>'Ride through all three'],
 pop:['Ollie',()=>'Knees first, then the snap.',p=>p?'Squeeze L2 + R2, then snap R2 to pop':'Hold Space, release to pop'],
 gallop:['Gallium Gallop',()=>'THOOM — tik. Compress, anchor, release, four wheels down. The Gallium you spend stays on the street as a puddle.',p=>p?'X on the ground · tap X again right after each landing · chain 3':'C on the ground · again right after each landing · chain 3'],
 swing:['Gallium Line',()=>'Your Gallium limb catches lamps and rooftop edges.',p=>p?'R1 to swing · R1 again to let go':'Q to swing · Q again to let go'],
 snapline:['Crown points + Snapline',()=>'Mark where you\'re going, then commit. The arc clears the roofs. No cancel.',p=>p?'On the board: D-pad ◀ marks the next anchor (up to 3) · D-pad ▶ commits':'On the board: 1 marks the next anchor · 2 commits'],
 toCrew:['Something\'s wrong',()=>'Somebody\'s stripping a parked car on the street west of the Commons.',p=>'Follow the amber light'],
 fight:['Three of them',()=>'Brawler: strike and dodge. Thrower: he winds up, then dodge the brick as it comes. Lookout: he\'s running with the wheel — once he\'s clear of the fight, tap B for your board and run him down; catch him and he gives up. Nobody dies: anyone down or giving up, you restrain.',p=>p?'X strike · B dodge · Y glob · D-pad ▲ Gallium Bind':'Numpad 4/6 strike · ; dodge · G glob · E Gallium Bind'],
 pickup:['Police pickup',()=>'The cuffs hold until the police arrive. Then the cuff Gallium drips back to the street.',p=>'Hold on…'],
 powers:['Every power you have',()=>'Cycle the power cards and try them. Pull the cuff puddles back, then shape the metal.',p=>p?'D-pad ▼ next card':'3 = next card'],
 next:['That\'s the city',()=>'Ep.1 "Concrete Has a Tempo" starts at Morrow Block — Nia\'s Field Studio. Free roam is yours too.',p=>'Follow the amber light to Morrow Block'],
 done:['Prologue complete',()=>'',p=>'']};
function proEnter(s){const p=P.o.position;
 if(s==='gates')proGates();
 if(s==='pickup'){if(!PR.police){PR.police=new THREE.PointLight(0xff2222,0,26);scene.add(PR.police);}PR.police.position.set(PR.site.x,4,PR.site.z);beep(700,.25,'sine',.04);setTimeout(()=>beep(560,.25,'sine',.04),280);}
 if(s==='fight'&&PR.C&&!PR.C.alerted){const e=scAlert(PR.C,{x:p.x,z:p.z},PR.routes);if(e)proCrewEvent(e);}
 if(s==='next'){whisper('PROLOGUE COMPLETE','Ep.1 waits at Morrow Block');beep(660,.12,'triangle',.05);setTimeout(()=>beep(990,.16,'triangle',.05),140);}
 if(s==='done'){PR.on=false;if(PR.el)PR.el.style.display='none';if(PR.pillar)PR.pillar.visible=false;plog('achievements','Prologue · Learn the City');}}
function proEvent(e){
 if(e.type==='step'){proEnter(e.step);proSave();if(e.why==='wiped')whisper('They got you','get up — run it back');else beep(520,.06,'triangle',.04);}
 else if(e.type==='skipped'){whisper('Moving on','you can practice that any time');}
 else if(e.type==='gate'){beep(660+e.n*90,.06,'triangle',.04);}
 else if(e.type==='card'||e.type==='power'){if(PR.M&&PR.M.step==='powers')beep(e.type==='power'?880:440,.04,'triangle',.03);}
 else if(e.type==='complete'){proSave();}}
function proGates(){for(const g of PR.gates)scene.remove(g);PR.gates=[];PR.gi=0;const z=(BLOCK+ROAD)/2;
 for(const x of [-8,6,20]){const g=new THREE.Mesh(new THREE.TorusGeometry(2.1,.12,10,32),new THREE.MeshBasicMaterial({color:0xffb347}));g.position.set(x,groundY+2.1,z);g.rotation.y=Math.PI/2;scene.add(g);PR.gates.push(g);}}
function proStartFight(){const c=PR.crew;$('foe').style.display='block';bell();
 PR.foes.forEach((f,i)=>{const st0=SC.STANCE[ROLES[i]];Object.assign(f.R,{active:true,stance:st0,max:st0,out:false,sm:null,act:null,queue:[],guard:false,surrender:false});});}
function proCrewEvent(e){const f=e.i!=null?PR.foes[e.i]:null;
 if(e.type==='alert'){proStartFight();whisper('They saw you','the lookout\'s running with the wheel');}
 else if(e.type==='tell'&&f){playT(f.ch,'OverhandThrow',.95)||playT(f.ch,'Punch',.6);f.R.animLock=.75;if(f.ch.body)f.ch.body.emissiveIntensity=.6;beep(240,.08,'sawtooth',.03);}
 else if(e.type==='throw'&&f){if(f.ch.body)f.ch.body.emissiveIntensity=0;proBrick(f,e.at);}
 else if(e.type==='surrender'&&f){const R=f.R;R.active=false;R.act=null;R.sm=null;R.surrender=true;play(f.ch,'Idle');whisper(e.why==='caught'?'Caught him — he gives up':'The last one gives up','don\'t hit someone who gave up · D-pad ▲ / E: Gallium Bind');
  if(f===PR.foes[2]&&PR.wheel&&PR.wheel.parent===f.ch.o){f.ch.o.remove(PR.wheel);PR.wheel.position.copy(f.ch.o.position).setY(groundY+.33);PR.wheel.rotation.set(0,0,Math.PI/2);scene.add(PR.wheel);}}
 else if(e.type==='winded'){whisper('He\'s winded','catch him')}
 if(!activeFoes().length)$('foe').style.display='none';}
function proBrick(f,at){const from=f.ch.o.position.clone().setY(groundY+1.7);const to=new THREE.Vector3(at.x,groundY+1.1,at.z);
 const T=Math.max(.45,from.distanceTo(to)/13),v=to.clone().sub(from).divideScalar(T);v.y+=.5*9.8*T;
 const m=new THREE.Mesh(new THREE.BoxGeometry(.24,.1,.12),new THREE.MeshStandardMaterial({color:0x8a3b2a,roughness:.9}));m.position.copy(from);scene.add(m);PR.bricks.push({m,v,from,t:0,done:false});}
function proBricks(dt){const p=P.o.position;for(let i=PR.bricks.length-1;i>=0;i--){const b=PR.bricks[i];b.t+=dt;
 if(b.m.position.y>groundY+.06){b.v.y-=9.8*dt;b.m.position.addScaledVector(b.v,dt);b.m.rotation.x+=dt*9;b.m.rotation.z+=dt*5;}
 if(!b.done&&b.m.position.distanceTo(_fv2.set(p.x,p.y+1,p.z))<1.05){b.done=true;if(FG.iframe>0){proFeed('dodge');toast('Dodged');}else metalHurt(.07,b.from,null);b.v.multiplyScalar(-.2);}
 if(b.m.position.y<=groundY+.06)b.done=true;
 if(b.t>5){scene.remove(b.m);PR.bricks.splice(i,1);}}}
function proBrain(foe,dt){const R=foe.R,o=foe.ch.o,it=PR.intents&&PR.intents[R.pr];
 if(R.kb.lengthSq()>.0004){o.position.addScaledVector(R.kb,dt);R.kb.multiplyScalar(Math.exp(-6*dt));}
 if(R.stun>0||!it)return;let mv=null;
 if(it.move){const dx=it.move.x-o.position.x,dz=it.move.z-o.position.z,d=Math.hypot(dx,dz);if(d>.15){const s=Math.min(d,it.move.speed*dt);o.position.x+=dx/d*s;o.position.z+=dz/d*s;mv=Math.atan2(dx,dz);}}
 const f=it.face?Math.atan2(it.face.x-o.position.x,it.face.z-o.position.z):mv;if(f!=null)o.rotation.y+=angDiff(o.rotation.y,f)*Math.min(1,dt*8);
 if(R.animLock>0){R.animLock-=dt;return;}
 const a=it.anim==='run'?'Running':mv!=null?'Walking':it.anim==='guard'||it.anim==='windup'?'Guard':'Idle';if(foe.ch.acts[a]&&foe.ch.cur!==foe.ch.acts[a])play(foe.ch,a);}
function proFightOver(c,win){if(!win)proWipe();}
function proWipe(){st.hp=1;FG.stun=0;proFeed('wiped');if(!PR.C)return;scReset(PR.C);
 PR.foes.forEach((f,i)=>{const R=f.R;Object.assign(R,{active:false,out:false,stance:1,act:null,sm:null,queue:[],surrender:false,bound:false,taken:false,stun:0,animLock:0});R.kb.set(0,0,0);
  const c=CUFFS.get(f);if(c){scene.remove(c);CUFFS.delete(f);}f.ch.o.visible=true;f.ch.o.position.set(PR.site.x-1.4+i*1.5,groundY,PR.site.z+(i===1?-1.2:1.2));play(f.ch,'Idle');});
 if(PR.wheel&&PR.wheel.parent!==PR.foes[2].ch.o){scene.remove(PR.wheel);PR.wheel.rotation.set(0,0,Math.PI/2);PR.wheel.position.set(0,1.05,.42);PR.foes[2].ch.o.add(PR.wheel);}
 $('foe').style.display=activeFoes().length?'block':'none';}
function proWatch(){const pv=PR.prev,p=P.o.position;
 if(pv.yaw!=null)proFeed('look',Math.abs(angDiff(pv.yaw,camYaw)));pv.yaw=camYaw;
 if(pv.pos&&!st.board&&onGround){const d=Math.hypot(p.x-pv.pos.x,p.z-pv.pos.z);if(d<1)proFeed('walk',d);}pv.pos=p.clone();
 if(pv.ground&&!onGround&&!st.board&&vel.y>2.5)proFeed('jump');pv.ground=onGround;
 if(SWS.swings>pv.swings){proFeed('swing');proHook('power','line');}pv.swings=SWS.swings;
 if(st.board&&!pv.board)proHook('power','board');pv.board=st.board;
 if(KITV.K.pulling)proHook('power','pull');
 const h=KITV.K.hand;if(h&&h!==pv.hand)proHook('power',h);pv.hand=h;
 if(st.flying)proHook('power','flight');if(DRW.drawing)proHook('power','draw');
 if(pv.form!=null&&st.form!==pv.form)proHook('power','form');pv.form=st.form;}
function proTick(dt){proInit();powerCardTick(dt);bindTick(dt);if(!PR.on||!PR.M||!P)return;const M=PR.M,p=P.o.position;
 if(!PR.clips&&EP.clips.npc&&EP.clips.npc.length){PR.clips=true;for(const f of PR.foes)addClips(f.ch,EP.clips.npc);}
 proWatch();proBricks(dt);
 // the crew
 const C=PR.C;let crewDist=99;
 PR.foes.forEach((f,i)=>{if(f.R.out&&C.members[i].state!=='out'&&!['bound','taken','surrender'].includes(C.members[i].state)){scMarkOut(C,i);proFeed('down');
  if(i===2&&PR.wheel&&PR.wheel.parent===f.ch.o){f.ch.o.remove(PR.wheel);PR.wheel.position.copy(f.ch.o.position).setY(groundY+.33);scene.add(PR.wheel);}}});
 if(M.step==='fight'||M.step==='pickup'){const o=scStep(C,{metal:{x:p.x,z:p.z},members:PR.foes.map(f=>({x:f.ch.o.position.x,z:f.ch.o.position.z})),routes:PR.routes},dt);PR.intents=o.intents;for(const e of o.events)proCrewEvent(e);}
 else if(!C.alerted)PR.foes.forEach(f=>{if(!f.R.active&&f.ch.acts.Chest_Open&&f.ch.cur!==f.ch.acts.Chest_Open&&f!==PR.foes[1])play(f.ch,'Chest_Open');}); // working on the car
 crewDist=Math.min(...PR.foes.map(f=>f.ch.o.position.distanceTo(p)));
 {const lo=PR.foes[2],m=C.members[2];if(m.state==='flee'){const near=lo.ch.o.position.distanceTo(p)<14;if(lo.R.active!==near){lo.R.active=near;if(!activeFoes().length)$('foe').style.display='none';else $('foe').style.display='block';}if(!near)proBrain(lo,dt);}}
 if(M.step==='fight'&&st.hp<=.001)proWipe();
 // gates
 if(M.step==='gates'&&PR.gi<PR.gates.length){const g=PR.gates[PR.gi];g.rotation.z+=dt;if(Math.hypot(g.position.x-p.x,g.position.z-p.z)<2.4&&Math.abs(p.y+1-g.position.y)<3){g.material.color.set(0xb983ff);const gg=g;setTimeout(()=>scene.remove(gg),400);PR.gi++;proFeed('gate');}}
 if(PR.police){PR.police.intensity=M.step==='pickup'?(Math.sin(performance.now()/90)>0?40:0):0;PR.police.color.set(Math.sin(performance.now()/180)>0?0xff2222:0x2255ff);}
 const tgt=PR.site,studio=EP.studioPt?new THREE.Vector3(EP.studioPt.x,0,EP.studioPt.z):(SPOTS.morrow&&SPOTS.morrow.c);
 const out=proPStep(M,{riding:RSK.active||st.board,speed:RSK.R?Math.abs(RSK.R.core.speed):Math.hypot(vel.x,vel.z),crewDist,crewBound:scBoundCount(C),crewTotal:C.members.length,cardsTotal:POWER_CARDS.length,nextDist:studio?Math.hypot(studio.x-p.x,studio.z-p.z):99},dt);
 for(const e of out.events){proEvent(e);if(e.type==='pickup')proPickup();}
 // the amber light: where to go
 let at=null;if(M.step==='gates'&&PR.gates[PR.gi])at=PR.gates[PR.gi].position;else if(M.step==='toCrew')at=tgt;else if(M.step==='next')at=studio;
 PR.pillar.visible=!!at;if(at)PR.pillar.position.set(at.x,18,at.z);
 proCard();}
function proPickup(){PR.foes.forEach((f,i)=>{if(scTake(PR.C,i)){f.ch.o.visible=false;f.R.taken=true;const c=CUFFS.get(f);if(c){scene.remove(c);CUFFS.delete(f);}kitPuddleAdd(f.ch.o.position.x,groundY,f.ch.o.position.z,BIND_COST);}});
 if(PR.wheel&&PR.car){scene.remove(PR.wheel);}whisper('Police took them','the cuff Gallium dripped back — pull it in');}
function proCard(){const el=PR.el;if(!el)return;const M=PR.M,T=PRO_TEXT[M.step];if(!T){el.style.display='none';return;}el.style.display='block';const pad=!!RSK.gp,n=M.n;
 let prog='';
 if(M.step==='where')prog=Math.min(100,Math.round(n.look/PRO.LOOK*100))+'%';
 else if(M.step==='walk')prog=Math.min(PRO.WALK,Math.round(n.walk))+' / '+PRO.WALK+' m · jump '+(n.jumps?'✓':'—');
 else if(M.step==='push')prog=(RSK.R?Math.abs(RSK.R.core.speed):0).toFixed(1)+' / '+PRO.PUSH_SPEED+' m/s';
 else if(M.step==='gates')prog=PR.gi+' / '+PRO.GATES;else if(M.step==='gallop')prog='best chain '+n.gallop+' / '+PRO.GALLOP;
 else if(M.step==='fight')prog='restrained '+scBoundCount(PR.C)+' / 3';
 else if(M.step==='powers')prog='cards '+M.seen.length+' / '+POWER_CARDS.length+' · '+['glob','blast','pull'].map(k=>k+(M.used.includes(k)?' ✓':' —')).join(' · ')+' · form '+(PRO.FORMS.some(k=>M.used.includes(k))?'✓':'—');
 const left=PRO.GRACE-M.t;const skip=['fight','toCrew','pickup','next'].includes(M.step)?'':left<20?' · moving on in '+Math.ceil(left)+' s':'';
 el.innerHTML='<div style="font-size:10px;letter-spacing:2px;color:#ffcf8a">PROLOGUE · LEARN THE CITY</div><div style="font-weight:700;font-size:14px;margin:2px 0">'+T[0]+'</div>'+(T[1]()?'<div style="opacity:.85;margin-bottom:4px">'+T[1]()+'</div>':'')+'<div style="color:#ffcf8a">'+T[2](pad)+'</div>'+(prog||skip?'<div style="opacity:.75;font-size:11px;margin-top:3px">'+prog+skip+'</div>':'');}
// POWER PINWHEEL: tap D-pad ▼ / 3 = next card · hold it = a ring of all 14 powers. Stick (or ←/→) picks, release equips.
// Equipping only chooses the power the card shows; each power still fires from its own buttons.
const PW={open:false,hold:0,sel:0,el:null,prevDown:false};
function pwBuild(){const N=POWER_CARDS.length,d=document.createElement('div');d.id='powerWheel';d.className='wir-keep';
 d.style.cssText='position:fixed;left:50%;top:50%;width:330px;height:330px;margin:-165px 0 0 -165px;z-index:32;display:none;pointer-events:none;border-radius:50%;background:radial-gradient(circle,rgba(12,10,22,.82) 40%,rgba(12,10,22,.35) 72%,transparent 73%)';
 POWER_CARDS.forEach((c,i)=>{const th=i/N*Math.PI*2,a=th-Math.PI/2,r=128;const s=document.createElement('div');s.dataset.i=i;
  s.style.cssText='position:absolute;left:50%;top:50%;width:92px;text-align:center;padding:3px 4px;border-radius:6px;font:600 10.5px/1.15 system-ui;color:#efe9ff;transform:translate(-50%,-50%) translate('+(Math.cos(a)*r).toFixed(1)+'px,'+(Math.sin(a)*r).toFixed(1)+'px)';
  s.textContent=c.name;d.appendChild(s);});
 const ctr=document.createElement('div');ctr.id='powerWheelCenter';ctr.style.cssText='position:absolute;left:50%;top:50%;width:150px;margin-left:-75px;margin-top:-42px;text-align:center;font:500 11px/1.35 system-ui;color:#efe9ff';d.appendChild(ctr);
 document.body.appendChild(d);PW.el=d;}
function powerCardTick(dt){const N=POWER_CARDS.length,gp=RSK.gp,dd=!!(gp&&gp.buttons[13]&&gp.buttons[13].pressed),down=dd||!!keys.Digit3;
 if(!PW.el)pwBuild();
 if(down&&!PW.prevDown){PW.hold=0;PW.open=false;}
 if(down){PW.hold+=dt;if(!PW.open&&PW.hold>=.25){PW.open=true;PW.sel=PCARD.i;beep(300,.05,'triangle',.03);}}
 if(PW.open){
  if(gp&&gp.axes){const x=gp.axes[0]||0,y=gp.axes[1]||0;if(Math.hypot(x,y)>.55){let th=Math.atan2(x,-y);if(th<0)th+=Math.PI*2;PW.sel=Math.round(th/(Math.PI*2/N))%N;}}
  if(tap('ArrowRight'))PW.sel=(PW.sel+1)%N;if(tap('ArrowLeft'))PW.sel=(PW.sel+N-1)%N;
 }
 if(!down&&PW.prevDown){
  if(PW.open){PCARD.i=PW.sel;beep(520,.05,'triangle',.04);}
  else{PCARD.i=(PCARD.i+1)%N;beep(420+PCARD.i*20,.04,'triangle',.03);}
  PCARD.T=6;proFeed('card',POWER_CARDS[PCARD.i].id);PW.open=false;
 }
 PW.prevDown=down;
 PW.el.style.display=PW.open?'block':'none';
 if(PW.open){const c=POWER_CARDS[PW.sel],pad=!!gp;
  [...PW.el.children].forEach(ch=>{if(ch.dataset&&ch.dataset.i!==undefined){const on=+ch.dataset.i===PW.sel;ch.style.background=on?'#b983ff':'rgba(12,10,22,.7)';ch.style.color=on?'#0c0a16':'#efe9ff';ch.style.fontWeight=on?'800':'600';}});
  document.getElementById('powerWheelCenter').innerHTML='<div style="font-weight:700;font-size:13px">'+c.name+'</div><div>'+(pad?c.pad:c.keys)+'</div><div style="opacity:.6;font-size:10px;margin-top:3px">'+(pad?'release to equip':'release to equip · ← → to pick')+'</div>';}
 PCARD.T-=dt;const show=PCARD.T>0||PR.on&&PR.M&&PR.M.step==='powers';
 if(!PCARD.el){const d=document.createElement('div');d.id='powerCard';d.className='wir-keep';d.style.cssText='position:fixed;right:12px;bottom:84px;z-index:31;width:250px;padding:8px 11px;background:rgba(12,10,22,.78);color:#efe9ff;border-right:3px solid #b983ff;border-radius:8px;font:500 12px/1.4 system-ui;pointer-events:none';document.body.appendChild(d);PCARD.el=d;}
 PCARD.el.style.display=show?'block':'none';if(!show)return;const c=POWER_CARDS[PCARD.i],pad=!!RSK.gp;
 PCARD.el.innerHTML='<div style="font-size:10px;letter-spacing:2px;color:#cdb5ff">POWER '+(PCARD.i+1)+' / '+POWER_CARDS.length+(PCARD.used.has(c.id)?' · USED ✓':'')+'</div><div style="font-weight:700;font-size:14px">'+c.name+'</div><div>'+(pad?c.pad:c.keys)+'</div><div style="opacity:.6;font-size:10.5px;margin-top:3px">'+(pad?'D-pad ▼':'3')+' — next power</div>';}
// ---- Gallium Bind (everywhere): restrain someone tapped out or giving up. Nonlethal.
function bindTarget(){const p=P.o.position;let best=null,bd=2.4;for(const f of FOES){const R=f.R;if(R.bound||R.taken||!f.ch.o.visible)continue;if(!(R.out||R.surrender))continue;if(R.ep1||R.fb!=null||R.kind==='rival')continue;const d=f.ch.o.position.distanceTo(p);if(d<bd){bd=d;best=f;}}return best;}
function bindTry(){if(!P||st.board||st.flying||st.swing)return false;const f=bindTarget();if(!f)return false;
 if(st.gal<BIND_COST){toast('Not enough Galaxy Gallium for cuffs — pull some back (L2+R2)');return true;}
 st.gal-=BIND_COST;const R=f.R,stand=!!R.surrender;R.bound=true;R.boundT=0;R.active=false;R.act=null;R.sm=null;R.surrender=false;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(stand?.3:.48,.055,8,22),galaxyCrystalMat({}));ring.userData.stand=stand;scene.add(ring);CUFFS.set(f,ring);
 if(stand){if(!playT(f.ch,'Idle_FoldArms_Loop'))play(f.ch,'Idle');if(f.ch.acts.Idle_FoldArms_Loop)play(f.ch,'Idle_FoldArms_Loop');}
 beep(330,.08,'triangle',.05);setTimeout(()=>beep(495,.1,'triangle',.05),90);burst(f.ch.o.position.clone().setY(groundY+(stand?1.1:.3)),22,2.5);setViolet(.8);
 whisper('Gallium Bind','the cuffs hold until the police take them — the Gallium comes back to you');proHook('power','bind');
 if(R.pr!=null&&PR.C&&scBind(PR.C,R.pr))proFeed('bind');
 if(!activeFoes().length)$('foe').style.display='none';return true;}
function bindTick(dt){if(!P)return;
 for(const [f,ring] of CUFFS){const o=f.ch.o;ring.position.set(o.position.x,groundY+(ring.userData.stand?1.08:.28),o.position.z);ring.rotation.x=Math.PI/2;ring.rotation.z+=dt*.6;
  const R=f.R;if(R.pr!=null||R.taken)continue;R.boundT=(R.boundT||0)+dt;
  if(R.boundT>12){R.taken=true;o.visible=false;scene.remove(ring);CUFFS.delete(f);kitPuddleAdd(o.position.x,groundY,o.position.z,BIND_COST);whisper('Police took '+(R.label||'them'),'the cuff Gallium dripped back');}}
 const t=bindTarget();if(t&&!t.R.bindSaid){t.R.bindSaid=true;whisper((RSK.gp?'D-pad ▲':'E')+' — Gallium Bind',t.R.surrender?'he gave up — restrain him':'restrain them');}}
// ---------- THE REFRAMER SIGNAL (idea 30): you hear them before you see them ----------
const RSIG={t:0,beat:0};
function reframerSignal(dt){const W=RFR.W;if(!W||W.enc||!P){RSIG.t=0;return true;}
 if(PR.on&&PR.M&&!['next','done'].includes(PR.M.step)){RSIG.t=0;return false;} /* no ReFramers during the prologue lessons */
 if((RSIG.gap||0)>0){RSIG.gap-=dt;RSIG.t=0;return false;} /* city-wide wake, but a breather between encounters */
const p=P.o.position;let best=1e9;for(const n of W.nests)if(n.cool<=0){const d=Math.hypot(n.x-p.x,n.z-p.z);if(d<best)best=d;}
 if(best>RF.WAKE){RSIG.t=0;return false;}
 RSIG.t+=dt;RSIG.beat-=dt;if(RSIG.beat<=0){RSIG.beat=.42;const v=.012+.03*Math.max(0,1-best/RF.SIGNAL_R);const k=Math.floor(RSIG.t/.42)%4;beep([82,82,110,164][k],k===3?.14:.06,k===3?'sawtooth':'square',v);}
 return RSIG.t>=3.2&&best<RF.WAKE;} // three bars of the machine rhythm before it drops


// ---------- SOUND (owner audio, 2026-11-06): ring bell, crowd, ring music, ring ambience, machine phase-in ----------
// Bell = every spar / story fight starts and ends · crowd + ring music under fights · ring ambience by the Fight Lot ·
// phase-in = a ReFramer dropping onto a car (machines only — Metal never teleports).
const SFX={buf:{},loops:{},loading:false};
const SFX_FILES={bell:'assets/audio/bell.mp3',phase:'assets/audio/phase_in.mp3',crowd:'assets/audio/crowd.mp3',ring:'assets/audio/ring_music.mp3',amb:'assets/audio/ring_ambience.mp3'};
function sfxLoad(){if(SFX.loading)return;SFX.loading=true;try{actx=actx||new AudioContext();}catch(e){return;}
 for(const [k,u] of Object.entries(SFX_FILES))fetch(u).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(b=>actx.decodeAudioData(b)).then(d=>{SFX.buf[k]=d;}).catch(e=>{SFX.err=String(e&&e.message||e);});}
for(const ev of ['pointerdown','keydown','touchstart'])addEventListener(ev,()=>{sfxLoad();try{actx&&actx.state==='suspended'&&actx.resume();}catch(e){}},{passive:true});
addEventListener('gamepadconnected',()=>sfxLoad());
function sfx(k,v=.6,rate=1){const b=SFX.buf[k];if(!b||!actx)return;try{const s=actx.createBufferSource();s.buffer=b;s.playbackRate.value=rate;const g=actx.createGain();g.gain.value=v;s.connect(g).connect(actx.destination);s.start();}catch(e){}}
function sfxLoop(k,target,dt){let L=SFX.loops[k];
 if(!L){if(target<=.003||!SFX.buf[k]||!actx)return;try{const s=actx.createBufferSource();s.buffer=SFX.buf[k];s.loop=true;const g=actx.createGain();g.gain.value=0;s.connect(g).connect(actx.destination);s.start(0,Math.random()*SFX.buf[k].duration*.8);L=SFX.loops[k]={s,g,v:0};}catch(e){return;}}
 L.v+=(target-L.v)*Math.min(1,dt*(target>L.v?1.2:.8));L.g.gain.value=L.v;if(L.v<.003&&target<=.003){try{L.s.stop();}catch(e){}delete SFX.loops[k];}}
function bell(){sfx('bell',.55);}
function audioTick(dt){if(!P)return;const p=P.o.position;
 const dLot=fightC?Math.hypot(p.x-fightC.x,p.z-fightC.z):1e9;
 const lotFight=rivalSt&&rivalSt.active||[...CREWS,...STORY_FIGHTS].some(c=>c.state==='fight'&&c.home&&fightC&&c.home.distanceTo(fightC)<30);
 const epFight=typeof EP!=='undefined'&&EP.M&&(EP.M.stage==='clash'||EP.M.stage==='platform');
 sfxLoop('amb',dLot<40?.2*(1-dLot/40):0,dt);
 sfxLoop('crowd',lotFight?.42:epFight?.26:0,dt);
 sfxLoop('ring',FG.inFight&&!DRV.active?(lotFight?.3:.22):0,dt);}

// ---------- EP.1 "CONCRETE HAS A TEMPO" — the Morrow block (owner's Season One blueprint, 2026-11-06) PROPOSAL / HOLD ----------
// Nia's Field Studio · the Morrow depot with its delivery platform · the corner market and its awning. Rules in
// ep1_mission_core.mjs (node-tested). Kit: Quaternius Downtown City + Sci-Fi Essentials (CC0). Clips: UAL2 (CC0).
var EP={M:null,B:null,c:null,foe:null,kit:null,clips:{npc:[],metal:[]},nia:null,civs:[],crate:null,tosses:[],clock:0,lastBeat:-1,lastHalf:-1,aPrev:false,
 path:[],pi:0,awnSag:0,AWN_TILT:.12,brace:null,beacon:null,siren:0,saveKey:'wirEp1V1',latchM:null,plat:null,platY:1,haulCrates:[],ready:false,lastStage:null};
function kitPiece(key){if(!EP.kit)return null;const n=EP.kit.scene.children.find(o=>o.name.split('|')[0]===key);if(!n)return null;const g=n.clone(true);g.position.set(0,0,0);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;}
// place a kit piece by its footprint: centred on (x,z), feet on y, rotated, scaled
function placeKit(key,x,y,z,rot=0,s=1,collide=false){const g=kitPiece(key);if(!g)return null;const w=new THREE.Group();w.add(g);w.rotation.y=rot;w.scale.multiplyScalar(s);scene.add(w);w.updateMatrixWorld(true);
 const bb=new THREE.Box3().setFromObject(w);w.position.set(x-(bb.min.x+bb.max.x)/2,y-bb.min.y,z-(bb.min.z+bb.max.z)/2);w.updateMatrixWorld(true);if(collide)registerGrippableStructure(w);return w;}
function kitBoxFallback(x,y,z,sx,sy,sz,color,collide=true){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y+sy/2,z);m.castShadow=m.receiveShadow=true;scene.add(m);if(collide)registerGrippableStructure(m);return m;}
async function buildMorrowBlock(c){sign(SPOTS.morrow);const y=groundY,L=(x,z)=>new THREE.Vector3(c.x+x,y,c.z+z);EP.c=c;
 try{EP.kit=await loadMissionAsset(loadG,'assets/models/morrow/morrow_kit.glb',{timeout:MISSION_ASSET_TIMEOUTS.optional,fallback:()=>null,onWarning:w=>boot.warning(w)});}catch(e){EP.kit=null;}
 const S=L(-10,-14),D=L(11,-15);
 // Nia | Field Studio (Building_Small_1) + rooftop signal dish + AC
 const st0=placeKit('studio',S.x,y,S.z,0,.72,true)||kitBoxFallback(S.x,y,S.z,9,10,10,0x6f5a4c);
 const sb=new THREE.Box3().setFromObject(st0);placeKit('dish',sb.max.x-1.6,sb.max.y,sb.min.z+2.2,Math.PI*.8,.45);placeKit('ac',sb.min.x+1.4,sb.max.y,sb.min.z+2,0,1.4);
 // Morrow depot (Building_Medium_2) + loading dock + delivery platform gantry
 const dp=placeKit('depot',D.x,y,D.z,0,.62,true)||kitBoxFallback(D.x,y,D.z,9.5,14,8,0x4d5460);
 const db=new THREE.Box3().setFromObject(dp);EP.depotDoor=L(11,db.max.z-c.z+.8);
 kitBoxFallback(c.x+11,y,db.max.z+1.6,8.5,.9,3.2,0x6d6a66); // dock (walkable)
 const steel=new THREE.MeshStandardMaterial({color:0x3a3f47,metalness:.75,roughness:.4}),pz=db.max.z+6.2;EP.platPt={x:c.x+11,z:pz};EP.postPt={x:c.x+15.1,z:pz};
 for(const px of [7.2,14.8]){const p=new THREE.Mesh(new THREE.BoxGeometry(.3,6,.3),steel);p.position.set(c.x+px,y+3,pz);p.castShadow=true;scene.add(p);registerGrippableStructure(p);}
 const beam=new THREE.Mesh(new THREE.BoxGeometry(7.9,.35,.35),steel);beam.position.set(c.x+11,y+6.1,pz);scene.add(beam);
 const lever=new THREE.Mesh(new THREE.BoxGeometry(.18,.7,.18),new THREE.MeshStandardMaterial({color:0xc9a24a,metalness:.6,roughness:.35,emissive:0xffb347,emissiveIntensity:0}));lever.position.set(c.x+15.15,y+1.4,pz+.3);scene.add(lever);EP.lever=lever;
 const plat=new THREE.Group(),deck=new THREE.Mesh(new THREE.BoxGeometry(3.4,.28,3.4),new THREE.MeshStandardMaterial({color:0x5b5f66,metalness:.6,roughness:.45}));deck.castShadow=deck.receiveShadow=true;plat.add(deck);
 for(const [x,z] of [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]]){const k=placeKit(['crate','barrel','tarp','crateL'][(x>0)+(z>0)*2],0,0,0,0,.55);if(k){scene.remove(k);k.position.x+=x*.6;k.position.z+=z*.6;k.position.y+=.14;plat.add(k);}}
 plat.position.set(EP.platPt.x,y+4.6,pz);scene.add(plat);EP.plat=plat;
 EP.chains=[];for(const [x,z] of [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]]){const ch=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1,6),steel);scene.add(ch);EP.chains.push({m:ch,x,z});}
 EP.latchM=new THREE.Mesh(new THREE.BoxGeometry(.5,.4,.5),new THREE.MeshStandardMaterial({color:0x9a8a5a,metalness:.7,roughness:.3,emissive:0xffb347,emissiveIntensity:0}));EP.latchM.position.set(EP.platPt.x,y+5.75,pz);scene.add(EP.latchM);
 // depot yard: crates, barrels, lockers, shelves (Sci-Fi Essentials)
 for(const [k,x,z,r,s] of [['crateL',5.5,-8,0,.8],['crate',4.5,-5.5,.4,.7],['barrel',17.5,-8,0,1],['barrel2',18.2,-7.2,0,1],['barrel',18,-6,0,1],['locker',3.8,-9.2,0,.8],['shelves',18.4,-4,Math.PI/2,.8],['tarp',6,-2.5,.2,.8],['crate',16.5,1.5,.8,.7]])placeKit(k,c.x+x,y,c.z+z,r,s,true);
 // corner market + awning (v0.2 booth colours)
 EP.marketPt={x:c.x-4,z:c.z+14};const ax=c.x-4,az=c.z+14;
 for(let n=0;n<3;n++){const bx=ax-4+n*4,bo=new THREE.Group();const b1=new THREE.Mesh(new THREE.BoxGeometry(2.4,.95,1.2),new THREE.MeshStandardMaterial({color:n%2?0x203341:0x493345,roughness:.8}));b1.position.y=.48;bo.add(b1);
  const b2=new THREE.Mesh(new THREE.BoxGeometry(2.6,.12,1.4),new THREE.MeshStandardMaterial({color:n%2?0x7d6580:0x2c6571,roughness:.7}));b2.position.y=1.0;bo.add(b2);bo.position.set(bx,y,az-.9);bo.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});scene.add(bo);}
 const awn=new THREE.Group();awn.position.set(ax,y+3.05,az-2.4);const canvas=new THREE.Mesh(new THREE.BoxGeometry(13,.08,4.6),new THREE.MeshStandardMaterial({color:0xb3452f,roughness:.9,side:THREE.DoubleSide}));canvas.position.set(0,0,2.3);canvas.castShadow=true;awn.add(canvas);
 for(let s=-6;s<=6;s+=1.3){const st=new THREE.Mesh(new THREE.BoxGeometry(.55,.085,4.62),new THREE.MeshStandardMaterial({color:0xe9e1cf,roughness:.9}));st.position.set(s,.005,2.3);awn.add(st);}
 const val=new THREE.Mesh(new THREE.BoxGeometry(13,.45,.05),new THREE.MeshStandardMaterial({color:0xe9e1cf,roughness:.9}));val.position.set(0,-.22,4.6);awn.add(val); // scalloped front valance
 scene.add(awn);EP.awn=awn;awn.rotation.x=EP.AWN_TILT;EP.posts=[];const fh=3.05-4.6*Math.sin(EP.AWN_TILT);for(const [x,z,h] of [[-6.4,2.2,fh],[6.4,2.2,fh],[-6.4,-2.4,3.05],[6.4,-2.4,3.05]]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,h,8),steel);p.position.set(ax+x,y+h/2,az+z);scene.add(p);EP.posts.push(p);}
 EP.frontPost=EP.posts[0];EP.frontPostY=EP.frontPost.position.y;
 // street furniture
 for(const [x,z] of [[-14,6],[-12,6],[-10,6],[2,6],[4,6]])placeKit('bollard',c.x+x,y,c.z+z,0,1.3);
 for(const [x,z] of [[-18,8],[-18,20],[20,20]])placeKit('planter',c.x+x,y,c.z+z,0,.8,true);
 // Midnight Garage (v0.2) — the prototype motorcycle lives here
 kitBoxFallback(c.x-18,y,c.z-1,5,3.4,5.2,0x2a2730);placeKit('door',c.x-15.45,y,c.z-1,Math.PI/2,1);
 // signs (help-only words)
 label('NIA | FIELD STUDIO',L(-10,-5.6).setY(y+4.6),'#b0f1e8');label('MORROW DEPOT',new THREE.Vector3(D.x,y+7.2,db.max.z+.3),'#cfd6e0');label('CORNER MARKET',L(-4,18).setY(y+4.4),'#ffd39b');label('MIDNIGHT GARAGE',L(-18,1.8).setY(y+4.2),'#eecb83');
 // where Metal walks in for the session, and the robbery run (depot door → round the block → the market)
 EP.studioPt={x:c.x-10,z:c.z-5.2};
 EP.path=[[11,-5],[20,-1],[20.5,11],[11,19.5],[1,18.5]].map(([x,z])=>new THREE.Vector3(c.x+x,y,c.z+z));
 // beacon for the next place to go (amber; violet stays on Metal's seams)
 const bc=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,26,16,1,true),new THREE.MeshBasicMaterial({color:0xffc36b,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));bc.position.y=13;const bl=new THREE.PointLight(0xffb35a,0,9);bl.position.y=1.6;const bg=new THREE.Group();bg.add(bc,bl);scene.add(bg);EP.beacon={g:bg,l:bl,m:bc};
 EP.sirenL=new THREE.PointLight(0xff2a1a,0,18);EP.sirenL.position.set(c.x+11,y+4.2,db.max.z+.6);scene.add(EP.sirenL);
 // UAL2 clips (Metal glob throw · neighbourhood idles · Ballast's carry)
 Promise.all(['assets/anim/npc_ual2.json','assets/anim/metal_ual2.json'].map(u=>fetch(u).then(r=>r.json()).catch(()=>[]))).then(([n,m])=>{EP.clips.npc=n.map(j=>THREE.AnimationClip.parse(j));EP.clips.metal=m.map(j=>THREE.AnimationClip.parse(j));if(P)addMetalClips();});
}
function addClips(ch,list){if(!ch||!ch.mixer)return;for(const c of list)if(!ch.acts[c.name])ch.acts[c.name]=ch.mixer.clipAction(c);}
function addMetalClips(){if(!P||P.metalClips===P.mixer||!EP.clips.metal.length)return;P.metalClips=P.mixer;addClips(P,EP.clips.metal);if(P.acts.u_OverhandThrow)P.acts.GlobThrow=P.acts.u_OverhandThrow;}
function ep1Person(fit,pos,name,color){const g=fit.f&&crewFemGLTF?crewFemGLTF:rivalGLTF;const ch=g?makeFighter(g,fit):makeChar(fit.top);ch.o.position.copy(pos);scene.add(ch.o);addClips(ch,EP.clips.npc);
 if(name){const t=nameTag(name,color);t.position.y=(fit.h||1.8)+.35;ch.o.add(t);worldLabels.push(t);t.visible=HELP.on;}return ch;}
function ep1Init(){if(EP.ready||!EP.c||!P||!STORY_FIGHTS.length)return;EP.ready=true;addMetalClips();
 let txt=null;try{if(new URLSearchParams(location.search).get('ep1')==='reset')localStorage.removeItem(EP.saveKey);txt=localStorage.getItem(EP.saveKey);}catch(e){}
 EP.M=txt?ep1Load(txt):createEp1();
 const c=STORY_FIGHTS.find(s=>s.entry&&s.entry.id==='ballast');if(c){EP.B=c;EP.foe=c.members[0];c.home0=c.home.clone();addClips(EP.foe.ch,EP.clips.npc);EP.foe.R.ep1=true;}
 EP.nia=ep1Person({top:0x2c6571,bot:0x1d1f26,shoe:0xe8e4da,f:1,h:1.66},new THREE.Vector3(EP.studioPt.x+2.2,groundY,EP.studioPt.z-.6),'Nia · Field Studio',0xb0f1e8);
 EP.nia.o.rotation.y=Math.PI;const fits=[{top:0xd2a53c,bot:0x2a2d33,f:1,h:1.64},{top:0x1f6f78,bot:0xb9a77f,h:1.78},{top:0xe9e4da,bot:0x3a4250,f:1,h:1.6},{top:0x8a3b2e,bot:0x111216,h:1.8}];
 const m=EP.marketPt;EP.civs=fits.map((f,i)=>{const ch=ep1Person(f,new THREE.Vector3(m.x-4.5+i*3,groundY,m.z+.5+(i%2)*.8),null);ch.o.rotation.y=(i%2?1:-1)*.6;play(ch,ch.acts.Idle_TalkingPhone_Loop&&i%2?'Idle_TalkingPhone_Loop':ch.acts.Idle_FoldArms_Loop?'Idle_FoldArms_Loop':'Idle');return {ch,state:'shop',i};});
 ep1Place(true);}
// put the world in the state the saved checkpoint expects
function ep1Place(first){const M=EP.M,c=EP.B,f=EP.foe;if(!c||!f)return;const s=M.stage;
 c.ep1Ctl=s!=='done';if(s==='done'){f.ch.o.visible=true;return;}
 c.state='ep1';f.R.active=false;f.R.out=false;
 if(s==='toStudio'||s==='session'){f.ch.o.visible=false;f.ch.o.position.copy(EP.depotDoor).add(new THREE.Vector3(0,0,-3));}
 else if(s==='chase'){f.ch.o.visible=true;f.ch.o.position.copy(EP.depotDoor);EP.pi=0;ep1Carry(true);}
 else if(s==='platform'){f.ch.o.visible=true;f.ch.o.position.set(EP.platPt.x,groundY,EP.platPt.z);EP.awnSag=1;for(const v of EP.civs){v.state='gone';v.ch.o.visible=false;}}
 else if(s==='return'){f.ch.o.visible=false;}
 if(!first)return;}
function ep1Carry(on){const f=EP.foe;if(!f)return;if(on&&!EP.crate){EP.crate=placeKit('crate',0,0,0,0,.42);if(EP.crate){scene.remove(EP.crate);EP.crate.position.set(-.33,1.05,.55);f.ch.o.add(EP.crate);}}
 if(!on&&EP.crate){f.ch.o.remove(EP.crate);EP.crate=null;}}
function ep1SaveNow(){try{localStorage.setItem(EP.saveKey,ep1Save(EP.M));}catch(e){}}
function ep1EndFight(c){c.state='ep1';for(const f of c.members){const R=f.R;R.active=false;R.act=null;R.queue=[];R.guard=false;R.sm=null;R.haul=null;R.minStance=0;if(f.ch.body)f.ch.body.emissiveIntensity=0;}
 if(!activeFoes().length)$('foe').style.display='none';FG.act=null;bell();}
function ep1FightOver(c,win){ep1EndFight(c);st.hp=1;const back=ep1Abandon(EP.M);whisper(back==='chase'?'Ballast got away':'Ballast is back at his haul',back==='chase'?'catch him again':'come back at him');}
function ep1StartFight(round){const c=EP.B,f=EP.foe;if(!c||!f)return;ep1Carry(false);
 c.home=round===2?new THREE.Vector3(EP.platPt.x,groundY,EP.platPt.z):f.ch.o.position.clone();startCrew(c);
 f.R.minStance=round===2?EP1.PLAT.minStance:EP1.CLASH_MIN_STANCE;f.R.haul=round===2?{x:EP.platPt.x,z:EP.platPt.z,r:8}:null;}
function ep1Walk(target,speed,anim,dt){const o=EP.foe.ch.o,v=target.clone().sub(o.position).setY(0),d=v.length();if(d<.15)return true;
 o.position.addScaledVector(v.normalize(),Math.min(d,speed*dt));o.rotation.y+=angDiff(o.rotation.y,Math.atan2(v.x,v.z))*Math.min(1,dt*7);
 const a=EP.foe.ch.acts[anim]?anim:'Running';play(EP.foe.ch,a);if(EP.foe.ch.acts[a])EP.foe.ch.acts[a].setEffectiveTimeScale(anim==='Walk_Carry_Loop'?Math.max(1,speed/1.5):1);return false;}
function ep1Knockdown(){const f=EP.foe,p=P.o.position;const d=p.clone().sub(f.ch.o.position).setY(0).normalize();FG.kb.addScaledVector(d,9);FG.shake=.55;FG.stun=1.4;st.hp=Math.max(.25,st.hp);
 burst(p.clone().setY(p.y+1),40,7);beep(48,.3,'square',.07);if(!st.board&&P.acts.Knock){playT(P,'Knock',.7);actT=1.4;setTimeout(()=>{if(P.acts.GetUp)playT(P,'GetUp',1.2);},900);}playT(f.ch,'Hook',.7);}
function ep1Toss(){const f=EP.foe,from=f.ch.o.position.clone().setY(groundY+1.6),to=P.o.position.clone().setY(P.o.position.y+.8);const k=placeKit('crate',0,0,0,0,.5);if(!k)return;
 k.position.copy(from);const d=to.clone().sub(from),T=Math.max(.6,d.length()/14);EP.tosses.push({m:k,v:new THREE.Vector3(d.x/T,d.y/T+4.9*T,d.z/T),t:0,w:new THREE.Vector3(Math.random()*6,Math.random()*4,Math.random()*6)});playT(f.ch,f.ch.acts.OverhandThrow?'OverhandThrow':'Hook',.6);}
function ep1Tosses(dt){for(let i=EP.tosses.length-1;i>=0;i--){const q=EP.tosses[i];q.t+=dt;if(q.t<3){q.v.y-=9.8*dt;q.m.position.addScaledVector(q.v,dt);q.m.rotation.x+=q.w.x*dt;q.m.rotation.y+=q.w.y*dt;
  const me=_fv2.copy(P.o.position);me.y+=1;if(!q.hit&&q.m.position.distanceTo(me)<1.1){q.hit=true;metalHurt(.07,q.m.position,null);burst(q.m.position,24,5);q.t=3;}
  const fl=floorAt(q.m.position);if(q.m.position.y<fl+.3){q.m.position.y=fl+.3;q.v.multiplyScalar(.3);q.v.y=Math.abs(q.v.y)*.2;q.w.multiplyScalar(.5);if(!q.thud){q.thud=true;beep(70,.08,'square',.05);burst(q.m.position,10,3);}}}
  else if(q.t>7){scene.remove(q.m);EP.tosses.splice(i,1);}}}
// what Metal did this frame that the session listens for: any push / A / Space / tap on Nia's beat
function ep1Beats(dt){const M=EP.M;if(M.stage!=='session'){EP.clock=0;EP.lastBeat=-1;return;}
 EP.clock+=dt;const pb=60/EP1.BPM,k=Math.floor(EP.clock/pb),h=Math.floor(EP.clock/(pb/2));
 if(k!==EP.lastBeat){EP.lastBeat=k;beep(52,.16,'sine',.16);beep(104,.04,'triangle',.05);vRing(EP.studioPt.x,EP.studioPt.z,2.4,.35,0xffc36b);if(EP.nia)EP.nia.o.position.y=groundY+.04;}
 else if(h!==EP.lastHalf){beep(7400,.025,'square',.012);if(EP.nia)EP.nia.o.position.y=groundY;}EP.lastHalf=h;
 const a=!!(keys.Space||pressed.Space||RSK.gp&&RSK.gp.buttons[0]&&RSK.gp.buttons[0].pressed);
 if(a&&!EP.aPrev){const e=ep1Feed(M,'push',{time:EP.clock});if(e&&e.type==='onBeat'){beep(880,.06,'triangle',.05);setTimeout(()=>beep(1320,.05,'triangle',.04),60);burst(P.o.position.clone().setY(P.o.position.y+.3),10,2.5);
   whisper('On the beat · '+e.beats+'/'+EP1.BEATS_NEEDED,'Nia is recording the board on concrete');}else whisper('Off the beat','push on the kick');}
 EP.aPrev=a;}
// glob on the latch (from globTick)
function ep1LatchHit(pos,r,power){if(!EP.M||EP.M.stage!=='platform'||!EP.latchM)return false;if(pos.distanceTo(EP.latchM.position)>r+1.1)return false;
 const e=ep1Feed(EP.M,'latch',{power});if(e)ep1Event(e);return true;}
function ep1LatchAim(){if(!EP.latchM||!EP.M||EP.M.stage!=='platform'||EP.M.plat.state!=='up')return null; // Ep.1: the platform latch outranks Ballast as a glob target
 const v=EP.latchM.position.clone().sub(_globHand()),d=v.length();if(d>17||d<1)return null;const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
 if(Math.acos(Math.max(-1,Math.min(1,v.clone().setY(0).normalize().dot(f))))>.8)return null;return v.normalize();}
function ep1OnHit(foe,s){if(!EP.M||foe!==EP.foe)return;if(s&&(s.src==='glob'||s.src==='car'))return;const e=ep1Feed(EP.M,'punch');if(e)ep1Event(e);}
function ep1Event(e){const M=EP.M,f=EP.foe,p=P.o.position;
 switch(e.type){
  case 'stage':if(['chase','platform','return','done','toStudio'].includes(e.stage))ep1SaveNow();break;
  case 'sessionStart':play(EP.nia,EP.nia.acts.Idle_FoldArms_Loop?'Idle_FoldArms_Loop':'Idle');whisper('Session with Nia','push on her beat — A / Space / tap');beep(330,.08,'triangle',.04);break;
  case 'take':playT(EP.nia,'Wave',1.2);for(const [k,fq] of [[0,523],[1,659],[2,784]])setTimeout(()=>beep(fq,.12,'triangle',.04),k*90);whisper(e.beats>=EP1.BEATS_NEEDED?'That\'s the take':'Nia: we\'ll fix it in the mix','');break;
  case 'depotAlarm':f.ch.o.visible=true;f.ch.o.position.copy(EP.depotDoor);EP.pi=0;ep1Carry(true);EP.siren=4.5;burst(EP.depotDoor.clone().setY(groundY+1.5),50,7);FG.shake=.3;
   whisper('Depot alarm · Ballast','chase him down');plog('discoveries','Ep.1 Concrete Has a Tempo — Ballast robbed the Morrow depot');break;
  case 'tossCrate':ep1Toss();break;
  case 'fight':ep1StartFight(e.round);whisper(e.round===1?'Ballast':'Round two — at the depot',e.round===1?'front is armored':'');break;
  case 'scriptedLoss':ep1EndFight(EP.B);ep1Knockdown();whisper('He didn\'t even move','hitting harder won\'t work on Ballast');break;
  case 'awningBreak':{const fp=EP.frontPost;burst(fp.position.clone(),40,6);beep(60,.3,'sawtooth',.06);FG.shake=.4;fp.rotation.x=-1.1;fp.position.y=groundY+.5;fp.position.z+=.9;
   for(const v of EP.civs){if(v.state!=='shop')continue;v.state='trapped';play(v.ch,v.ch.acts.Guard?'Guard':'Idle');}
   whisper('The awning is coming down','hold Metal Draw by the market to brace it');ep1Carry(true);break;}
  case 'civOut':{const v=EP.civs.find(q=>q.state==='trapped');if(v){v.state='out';v.go=new THREE.Vector3(EP.marketPt.x-6+v.i*4,groundY,EP.marketPt.z+9);}beep(700,.06,'triangle',.04);whisper('Out safe · '+(EP1.AWN.civs-e.left)+'/'+EP1.AWN.civs,'');break;}
  case 'awningDown':for(const v of EP.civs)if(v.state==='trapped'){v.state='shaken';v.go=new THREE.Vector3(EP.marketPt.x-6+v.i*4,groundY,EP.marketPt.z+9);}
   burst(new THREE.Vector3(EP.marketPt.x,groundY+.8,EP.marketPt.z),80,8);FG.shake=.6;beep(42,.4,'square',.08);whisper('The awning came down','they crawled out shaken');break;
  case 'hint':whisper('Bigger punches won\'t move him','back off · he loads his haul under the platform · drop it on him');break;
  case 'latchHit':beep(420,.06,'square',.04);burst(EP.latchM.position,14,3);break;
  case 'platformRelease':beep(180,.08,'sawtooth',.05);setTimeout(()=>beep(120,.12,'sawtooth',.05),120);whisper('Platform released','');break;
  case 'platformMiss':FG.shake=.5;beep(40,.35,'square',.08);burst(new THREE.Vector3(EP.platPt.x,groundY+.4,EP.platPt.z),60,7);if(e.metalUnder)metalHurt(.22,EP.plat.position,null);whisper('Missed him','it hoists back up — lure him under');break;
  case 'rehoisted':beep(300,.05,'square',.03);break;
  case 'pinned':{FG.shake=.75;beep(36,.5,'square',.09);burst(new THREE.Vector3(EP.platPt.x,groundY+1,EP.platPt.z),110,9);ep1EndFight(EP.B);f.R.out=true;playT(f.ch,'Knock',.6);
   whisper('Pinned under his own haul','the platform did what punches couldn\'t');sfx('crowd',.5,1.1);break;}
  case 'ballastDown':plog('achievements','Ep.1 — Ballast pinned under the delivery platform');whisper('Ballast is down','back to the session with Nia');break;
  case 'complete':{st.gal=Math.min(1,st.gal+.3);FG.crewWins++;playT(EP.nia,'Wave',1.4);for(const [k,fq] of [[0,392],[1,523],[2,659],[3,784]])setTimeout(()=>beep(fq,.16,'triangle',.05),k*120);
   burst(p.clone().setY(p.y+1.4),80,7);toast('Ep.1 Concrete Has a Tempo · stem '+e.stems+'/'+e.of+(e.civsShaken?' · '+e.civsShaken+' shaken':' · everyone out clean'));plog('achievements','Ep.1 Concrete Has a Tempo complete — stem 1/6');
   const c=EP.B;c.ep1Ctl=false;c.home=c.home0.clone();f.R.out=false;f.R.minStance=0;f.R.haul=null;f.ch.o.position.copy(c.home0);f.ch.o.visible=true;c.state='cool';c.cool=60;ep1SaveNow();break;}
 }}
function ep1Tick(dt){if(!EP.c||!P)return;ep1Init();addMetalClips();if(!EP.M||!EP.foe)return;const M=EP.M,f=EP.foe,o=f.ch.o,p=P.o.position,c=EP.B;
 ep1Beats(dt);ep1Tosses(dt);
 const w={metal:{x:p.x,z:p.z},studio:EP.studioPt,ballast:{x:o.position.x,z:o.position.z},market:EP.marketPt,platform:EP.platPt,post:EP.postPt,metalHp:st.hp,braced:DRW.drawing,drawing:DRW.drawing};
 const out=ep1Step(M,w,dt);for(const e of out.events)ep1Event(e);
 f.R.minStance=c.state==='fight'?out.minStance:0;
 // Ballast between rounds (the fight system owns him during rounds)
 if(c.state!=='fight'&&M.stage!=='done'){const mode=out.ballastMode;
  if(mode==='run'){const t=EP.path[EP.pi];if(t){if(ep1Walk(t,EP1.BALLAST_RUN,'Walk_Carry_Loop',dt))EP.pi++;}else{o.rotation.y+=angDiff(o.rotation.y,Math.atan2(p.x-o.position.x,p.z-o.position.z))*Math.min(1,dt*4);play(f.ch,f.ch.acts.Idle_FoldArms_Loop?'Idle_FoldArms_Loop':'Idle');}}
  else if(mode==='wreck'){const fp=EP.frontPost.position;ep1Walk(new THREE.Vector3(fp.x+.3,groundY,fp.z+1.1),5.5,'Running',dt);}
  else if(mode==='toDock'){ep1Walk(new THREE.Vector3(EP.platPt.x,groundY,EP.platPt.z),2.6,'Walk_Carry_Loop',dt);}
  else if(mode==='fight'&&M.stage==='platform'&&Math.hypot(p.x-o.position.x,p.z-o.position.z)<12&&o.visible)ep1StartFight(2);
  else if(mode==='pinned'){}}
 // the awning: sags unless braced; Metal props it with a Galaxy Gallium column
 if(out.sag!=null)EP.awnSag=out.sag;const sag=Math.min(1,EP.awnSag);if(EP.awn){EP.awn.rotation.x=EP.AWN_TILT+sag*.5;}
 if(out.braced){if(!EP.brace){EP.brace=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,1,7),galaxyCrystalMat({}));scene.add(EP.brace);}const fx=EP.marketPt.x-6.1,fz=EP.marketPt.z+2.0,h=Math.max(.3,3.05-4.4*Math.sin(EP.AWN_TILT+sag*.5));
  EP.brace.visible=true;EP.brace.scale.set(1,h,1);EP.brace.position.set(fx,groundY+h/2,fz);setViolet(.5);if(Math.random()<.8){const a=p.clone().setY(p.y+1.2);burst(a.lerp(EP.brace.position,Math.random()),1,.6);}}
 else if(EP.brace)EP.brace.visible=false;
 if(M.stage==='awning'&&Math.random()<dt*2*sag)beep(90+Math.random()*40,.05,'sawtooth',.02); // creak
 // civilians
 for(const v of EP.civs){if(v.state==='out'||v.state==='shaken'){const d=v.go.clone().sub(v.ch.o.position).setY(0),L=d.length();if(L>.3){v.ch.o.position.addScaledVector(d.normalize(),Math.min(L,dt*(v.state==='out'?4:1.4)));v.ch.o.rotation.y=Math.atan2(d.x,d.z);play(v.ch,v.state==='out'?'Running':'Walking');if(v.state==='shaken'&&v.ch.acts.Walking)v.ch.acts.Walking.setEffectiveTimeScale(.6);}
   else{v.state='safe';v.ch.o.rotation.y=Math.atan2(p.x-v.ch.o.position.x,p.z-v.ch.o.position.z);playT(v.ch,'Wave',1.2);}}}
 // delivery platform
 if(EP.plat){const Y=out.platY!=null?out.platY:(M.stage==='pinned'||M.stage==='return'?-1:1);EP.platY+=((Y<0?.3:Y)-EP.platY)*(Y<EP.platY?1:Math.min(1,dt*6));
  const py=Y<0?groundY+.72:groundY+.14+EP.platY*4.46;EP.plat.position.y=py;
  for(const ch of EP.chains){const top=groundY+6.0,len=Math.max(.05,top-py);ch.m.scale.y=len;ch.m.position.set(EP.platPt.x+ch.x*(Y<0?1.2:1),py+len/2,EP.platPt.z+ch.z*(Y<0?1.2:1));}
  const live=M.stage==='platform'&&M.plat.state==='up';EP.latchM.material.emissiveIntensity=live?.35+.25*Math.sin(performance.now()/160):0;EP.lever.material.emissiveIntensity=live?.3:0;
  if(live&&DRW.drawing&&Math.hypot(p.x-EP.postPt.x,p.z-EP.postPt.z)<3){EP.lever.rotation.z=Math.min(1,(M.plat.pull||0)/EP1.PLAT.pullT)*1.2;burst(EP.lever.position,1,.8);}else EP.lever.rotation.z*=.9;
  if(M.stage==='pinned'||M.stage==='return'){o.position.y=groundY;}}
 // siren + beacon
 EP.siren-=dt;if(EP.sirenL)EP.sirenL.intensity=EP.siren>0?(Math.sin(performance.now()/90)>0?14:0):0;if(EP.siren>0&&Math.floor(EP.siren/.38)!==EP.sirenK){EP.sirenK=Math.floor(EP.siren/.38);beep(EP.sirenK%2?740:560,.3,'sawtooth',.025);}
 const go=M.stage==='toStudio'||M.stage==='return'?EP.studioPt:M.stage==='awning'?EP.marketPt:M.stage==='platform'&&c.state!=='fight'?EP.platPt:null;
 EP.beacon.g.visible=!!go;if(go){EP.beacon.g.position.set(go.x,groundY,go.z);const k=.08+.05*Math.sin(performance.now()/400);EP.beacon.m.material.opacity=Math.hypot(p.x-go.x,p.z-go.z)<6?k*.4:k;EP.beacon.l.intensity=3+Math.sin(performance.now()/300);}
 // Nia: watches Metal, run it back after the episode
 if(EP.nia){const n=EP.nia.o,d=n.position.distanceTo(p);if(d<14)n.rotation.y+=angDiff(n.rotation.y,Math.atan2(p.x-n.position.x,p.z-n.position.z))*Math.min(1,dt*4);
  if(d<3&&pressed.KeyE&&!FG.inFight){pressed.KeyE=false;if(M.stage==='done'){ep1Replay(M);for(const v of EP.civs){v.state='shop';v.ch.o.visible=true;v.ch.o.position.set(EP.marketPt.x-4.5+v.i*3,groundY,EP.marketPt.z+.5+(v.i%2)*.8);play(v.ch,'Idle');}
    EP.awnSag=0;EP.frontPost.rotation.x=0;EP.frontPost.position.set(EP.marketPt.x-6.4,EP.frontPostY,EP.marketPt.z+2.2);EP.platY=1;ep1Place();ep1SaveNow();whisper('Nia · run the session back','Ep.1 replay');}
   else whisper('Nia · Field Studio',M.stage==='done'?'':'Ep.1 Concrete Has a Tempo');playT(EP.nia,'Wave',1);}}
}

// ---------- MORROW prototype motorcycle (owner's v0.2 PROPOSAL design) — parked at the Midnight Garage; same Rush drive model, steer ×1.13 ----------
function makeBike(){const bike=new THREE.Group(),body=new THREE.Group();body.rotation.y=Math.PI;bike.add(body);
 const M=(c,r=.5,m=.2)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});const box=(x,y,z,w,h,d,c,r)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,r));m.position.set(x,y,z);m.castShadow=true;body.add(m);return m;};
 for(const z of [-.83,.83]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.18,16),M(0x090c11,.9,.1));wh.rotation.z=Math.PI/2;wh.position.set(0,.42,z);body.add(wh);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.19,10),M(0xcad6dc,.3,.72));hub.rotation.z=Math.PI/2;hub.position.set(0,.42,z);body.add(hub);}
 box(0,.65,0,.46,.20,1.5,0x4b2f6c,.5);box(0,.84,-.20,.48,.24,.52,0x141d27,.16);box(0,.90,.38,.29,.12,.55,0x101014,.14);box(0,1.05,-.86,.90,.08,.08,0xbec1de,.5);
 const hl=box(0,.62,-.91,.52,.16,.08,0xe4eeff,.14);hl.material.emissive=new THREE.Color(0xe4eeff);hl.material.emissiveIntensity=.6;
 for(const x of [-.22,.22])box(x,.57,-.45,.10,.20,.45,0x868eab,.54);bike.userData.body=body;return bike;}
function bikePose(){const a=P.acts.u_Walk_Carry_Loop;if(!a)return;if(P.cur!==a){play(P,'u_Walk_Carry_Loop',false,.15);a.time=.05;}a.setEffectiveTimeScale(0);}
function bikeInit(){if(DRV.bike||!EP.c||!cars)return;const b=makeBike();b.position.set(EP.c.x-13.6,.05,EP.c.z-1);b.rotation.y=Math.PI/2;
 b.userData={axis:1,lane:b.position.x,dir:1,t:b.position.z,spd:0,parked:true,mine:true,bike:true,occupantExited:true,occupantCount:0,body:b.userData.body};scene.add(b);cars.push(b);DRV.bike=b;}


// ---------- WRONG TARGET — Foundry Steps (owner's "Machine Wars" brief + v0.3 reducer) PROPOSAL / PUBLISH HOLD ----------
// Rules in wrong_target_core.mjs (node-tested). Machines: owner-supplied MagicaVoxel bots (Arachnodroid body = ReFramer core,
// ReconBot = Framekeeper drone, MobileStorageBot = scavenger) — licence not in the zips, confirm before publishing.
var WTV={S:null,c:null,site:null,kit:null,ready:false,saveKey:'wirWrongTargetV1',bus:null,heads:[],limbs:[],core:null,coreY:4.2,keeper:null,kp:new THREE.Vector3(),
 offs:[],people:[],field:null,signal:null,scav:null,snareT:0,snareLine:null,coll:0,ePrev:false,lhSeen:false,lastMode:null};
async function buildFoundry(c){sign(SPOTS.foundry);WTV.c=c;const y=groundY,L=(x,z)=>({x:c.x+x,z:c.z+z});
 try{WTV.kit=await loadMissionAsset(loadG,'assets/models/machines/wt_machines.glb',{timeout:MISSION_ASSET_TIMEOUTS.optional,fallback:()=>null,onWarning:w=>boot.warning(w)});}catch(e){WTV.kit=null;}
 WTV.site={signal:L(-6,-14),bus:L(-4,2),door:L(-5,4.2),safe:L(-15,15),nest:L(5,-4),field:{...L(6,8),dx:-.6,dz:.8},officerSpawn:L(22,21)};
 // Foundry Steps: terraced concrete with a handrail (rideable ledges)
 const conc=new THREE.MeshStandardMaterial({color:0x8d8a84,roughness:.92});
 for(let k=0;k<4;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(14-k*2.5,.32*(k+1),2.2),conc);s.position.set(c.x+12,y+.16*(k+1),c.z-17+k*2.2);s.castShadow=s.receiveShadow=true;scene.add(s);registerGrippableStructure(s);}
 // civic shuttle (pivots on the door-side bottom edge; the far side lifts)
 const bus=new THREE.Group(),body=new THREE.Group();bus.position.set(WTV.site.bus.x,y,WTV.site.bus.z+1.3);body.position.z=-1.3;bus.add(body);
 const M=(col,r=.6,m=.2)=>new THREE.MeshStandardMaterial({color:col,roughness:r,metalness:m});
 const hull=new THREE.Mesh(new THREE.BoxGeometry(8.4,2.5,2.6),M(0x457e87));hull.position.y=1.65;body.add(hull);
 const glass=new THREE.Mesh(new THREE.BoxGeometry(7.6,.75,2.64),M(0xb9d6de,.2,.4));glass.position.y=2.2;body.add(glass);
 const roof=new THREE.Mesh(new THREE.BoxGeometry(8.2,.18,2.4),M(0xcad0c7));roof.position.y=2.98;body.add(roof);
 const door=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.1,.06),new THREE.MeshStandardMaterial({color:0x84a7bb,roughness:.3,emissive:0xffb347,emissiveIntensity:0}));door.position.set(-1,1.45,1.32);body.add(door);WTV.door=door;
 WTV.wheels=[];for(const [x,z] of [[-2.9,-1.2],[2.9,-1.2],[-2.9,1.2],[2.9,1.2]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.32,14),M(0x111923,.9));w.rotation.x=Math.PI/2;w.position.set(x,.48,z);body.add(w);WTV.wheels.push(w);}
 WTV.heads=[];for(const x of [-2.2,1.4]){const h=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),M(0x6b4a3a));h.position.set(x,2.25,.4);body.add(h);WTV.heads.push(h);}
 bus.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(bus);WTV.bus=bus;WTV.busBody=body;
 // safe zone (teal) — the only place a rider counts as safe
 const sz=new THREE.Mesh(new THREE.RingGeometry(3.3,3.6,40),new THREE.MeshBasicMaterial({color:0x6fe8c1,transparent:true,opacity:.6,side:THREE.DoubleSide}));sz.rotation.x=-Math.PI/2;sz.position.set(WTV.site.safe.x,y+.03,WTV.site.safe.z);scene.add(sz);WTV.safeRing=sz;
 for(let k=0;k<6;k++){const a=k/6*Math.PI*2,p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.9,6),M(0xe8e4da));p.position.set(WTV.site.safe.x+Math.cos(a)*3.9,y+.45,WTV.site.safe.z+Math.sin(a)*3.9);scene.add(p);}
 // the ReFramer: voxel core + eight jointed limbs (procedural so each joint has its own state)
 const core=new THREE.Group();const kc=wtVox('rfCore',1.35);if(kc)core.add(kc);else{const b=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.6,2.4),M(0x232f42,.5,.6));core.add(b);}
 const eye=new THREE.PointLight(0xff3a5a,0,10);eye.position.set(0,.9,1.4);core.add(eye);WTV.eye=eye;core.visible=false;scene.add(core);WTV.core=core;
 const steel=M(0x9fb4cb,.45,.7),steel2=M(0x6c7c90,.5,.7);
 for(let i=0;i<8;i++){const up=new THREE.Mesh(new THREE.BoxGeometry(.32,.32,1),steel.clone()),lo=new THREE.Mesh(new THREE.BoxGeometry(.26,.26,1),steel2.clone()),kn=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),M(0x9b88ca,.4,.5));
  for(const m of [up,lo,kn]){m.castShadow=true;m.visible=false;scene.add(m);}WTV.limbs.push({up,lo,kn,knee:new THREE.Vector3(),foot:new THREE.Vector3(),sh:new THREE.Vector3(),down:0});}
 // Framekeeper drone (ReconBot) with eight tool arms
 const kp=new THREE.Group();const kv=wtVox('keeper',.17);if(kv){kv.position.y=-.5;kp.add(kv);}else kp.add(new THREE.Mesh(new THREE.SphereGeometry(.4,10,8),M(0x5a8090)));
 WTV.kArms=[];for(let k=0;k<8;k++){const a=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.55),M(0x8caaa9,.4,.6));kp.add(a);WTV.kArms.push(a);}
 kp.visible=false;scene.add(kp);WTV.keeper=kp;
 // bounded gravity anomaly: a slanted shimmer column + debris that falls the wrong way
 const fc=new THREE.Mesh(new THREE.CylinderGeometry(7,7,6,32,1,true),new THREE.MeshBasicMaterial({color:0xa3b5fa,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}));fc.position.set(WTV.site.field.x,y+3,WTV.site.field.z);fc.visible=false;scene.add(fc);WTV.field=fc;
 WTV.debris=[];for(let k=0;k<10;k++){const d=new THREE.Mesh(new THREE.BoxGeometry(.25,.12,.3),M(0x777777));d.visible=false;scene.add(d);WTV.debris.push({m:d,a:Math.random()*6.3,r:1+Math.random()*5,h:Math.random()*3});}
 // the signal (ReFramer sensor red — violet stays Metal's)
 const sg=new THREE.PointLight(0xff3a5a,0,14);sg.position.set(WTV.site.signal.x,y+2,WTV.site.signal.z);scene.add(sg);WTV.signal=sg;
 label('FOUNDRY STEPS',new THREE.Vector3(c.x+12,y+3.4,c.z-18),'#cfd6e0');label('SAFE ZONE',new THREE.Vector3(WTV.site.safe.x,y+2.4,WTV.site.safe.z),'#a9f6cb');label('CIVIC SHUTTLE',new THREE.Vector3(WTV.site.bus.x,y+4,WTV.site.bus.z),'#def8eb');}
function wtVox(name,s){if(!WTV.kit)return null;const n=WTV.kit.scene.children.find(o=>o.name===name);if(!n)return null;const g=n.clone(true);g.position.set(0,0,0);g.scale.setScalar(s);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.material=o.material.clone();o.material.vertexColors=true;}});const w=new THREE.Group();w.add(g);g.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(g);g.position.x-=(bb.min.x+bb.max.x)/2;g.position.z-=(bb.min.z+bb.max.z)/2;g.position.y-=bb.min.y;return w;}
function wtSeg(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);m.scale.z=Math.max(.05,a.distanceTo(b));m.lookAt(b);}
function wtOfficer(i){const sp=WTV.site.officerSpawn,fit={top:0x1d2a44,bot:0x141a26,shoe:0x0c0f14,h:1.84};const ch=rivalGLTF?makeFighter(rivalGLTF,fit):makeChar(0x1d2a44);
 ch.o.position.set(sp.x+i*1.6,groundY,sp.z);scene.add(ch.o);addClips(ch,EP.clips.npc);
 // pressure-cage helmet: visor + external load-bearing struts down to a shoulder ring (WIR design, PROPOSAL)
 const hb=ch.o.getObjectByName('head')||ch.o.getObjectByName('Head');const cage=new THREE.Group();const st=new THREE.MeshStandardMaterial({color:0xb8c0c8,metalness:.8,roughness:.3});
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.2,.025,6,16),st);ring.rotation.x=Math.PI/2;cage.add(ring);
 for(let k=0;k<4;k++){const a=k/4*Math.PI*2+Math.PI/4,s=new THREE.Mesh(new THREE.BoxGeometry(.03,.42,.03),st);s.position.set(Math.cos(a)*.19,-.12,Math.sin(a)*.19);cage.add(s);}
 const vis=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8,0,Math.PI*2,0,Math.PI*.6),new THREE.MeshStandardMaterial({color:0xaee6ff,transparent:true,opacity:.28,roughness:.1}));vis.position.y=.02;cage.add(vis);
 const gauge=new THREE.Mesh(new THREE.BoxGeometry(.06,.04,.02),new THREE.MeshStandardMaterial({color:0x222,emissive:0x6fe8c1,emissiveIntensity:.8}));gauge.position.set(.16,-.05,.12);cage.add(gauge);WTV.gauges=(WTV.gauges||[]).concat(gauge);
 if(hb){cage.position.y=.12;hb.add(cage);}else{cage.position.y=1.75;ch.o.add(cage);}
 const t=nameTag(i?'MC-02':'MC-01',0xcbd9fb);t.position.y=2.25;ch.o.add(t);worldLabels.push(t);t.visible=HELP.on;ch.o.visible=false;return ch;}
function wtInit(){if(WTV.ready||!WTV.c||!P)return;WTV.ready=true;let txt=null;try{if(new URLSearchParams(location.search).get('wt')==='reset')localStorage.removeItem(WTV.saveKey);txt=localStorage.getItem(WTV.saveKey);}catch(e){}
 WTV.S=txt?wtRestore(txt,WTV.site):createWT(WTV.site);WTV.offs=[wtOfficer(0),wtOfficer(1)];
 const fits=[{top:0xd9a14a,bot:0x2a2d33,f:1,h:1.62},{top:0x2e5e8a,bot:0x9a8f7a,h:1.76}];WTV.people=fits.map(f=>{const ch=ep1Person(f,new THREE.Vector3(WTV.site.door.x,groundY,WTV.site.door.z),null);ch.o.visible=false;return ch;});
 if(WTV.S.mission==='COMPLETE')wtAftermath();}
function wtAftermath(){const S=WTV.S;WTV.signal.intensity=0;WTV.core.visible=false;for(const l of WTV.limbs){l.up.visible=l.lo.visible=l.kn.visible=false;}WTV.keeper.visible=false;
 for(const h of WTV.heads)h.visible=false;if(!WTV.brace&&S.bus.braced)wtBraceMesh();}
function wtBraceMesh(){const m=new THREE.Mesh(new THREE.BoxGeometry(7.6,.3,.35),galaxyCrystalMat({}));m.position.set(0,.5,-1.45);WTV.busBody.add(m);
 for(const x of [-3.2,0,3.2]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,2.4,7),galaxyCrystalMat({}));p.position.set(x,1.4,-1.62);p.rotation.x=.25;WTV.busBody.add(p);}WTV.brace=m;}
// glob / strike / pulse from Metal (called first inside reframerHit)
function wtHit(kind,power,pos){const S=WTV.S;if(!S||S.mission!=='DEFEND')return false;const p=P.o.position;
 if(kind==='pulse'){if(WTV.keeper.visible&&WTV.kp.distanceTo(p)<7){wtEv(hitKeeper(S,.6));return true;}return false;}
 if(!pos)return false;
 if(WTV.keeper.visible&&S.keeper.hp>0&&pos.distanceTo(WTV.kp)<(kind==='glob'?1.6:1.4)){wtEv(hitKeeper(S,kind==='glob'?1:.5));return true;}
 let best=null,bd=kind==='glob'?1.9:1.5;const q=new THREE.Vector3(),seg=new THREE.Line3();
 WTV.limbs.forEach((l,i)=>{if(S.boss.limbs[i].hp<=0)return;for(const [a,b] of [[l.sh,l.knee],[l.knee,l.foot]]){seg.set(a,b);seg.closestPointToPoint(pos,true,q);const d=q.distanceTo(pos);if(d<bd){bd=d;best=i;}}});
 if(best!=null){const e=hitLimb(S,best+1,power);wtEv(e);burst(pos,22,4);beep(220,.07,'square',.04);return true;}
 // a glob into the occupied shuttle is collateral — and the officers see it
 if(kind==='glob'){const bp=WTV.site.bus;if(Math.hypot(pos.x-bp.x,pos.z-bp.z)<4.5&&pos.y<groundY+3.6&&S.t-(WTV.collT??-9)>1.2){WTV.collT=S.t;WTV.coll++;S.after.collateral++;wtWitness('COLL-'+WTV.coll,'collateral',pos);S.bus.integrity-=6;return false;}}
 return false;}
function wtLOS(a,b){const ray=new THREE.Ray(a.clone(),b.clone().sub(a).normalize()),L=a.distanceTo(b),hit=new THREE.Vector3();for(const bx of colliders){if(ray.intersectBox(bx,hit)&&hit.distanceTo(a)<L-.3)return false;}return true;}
function wtWitness(id,kind,pos){const S=WTV.S;WTV.offs.forEach((o,i)=>{const eye=o.o.position.clone().setY(o.o.position.y+1.7),tp=new THREE.Vector3(pos.x,(pos.y||groundY)+1,pos.z);
 wtEv(wtObserve(S,i,id,kind,{dist:Math.hypot(eye.x-pos.x,eye.z-pos.z),occluded:!o.o.visible||!wtLOS(eye,tp)}));});}
function wtEv(e){if(!e)return;const S=WTV.S,p=P.o.position;
 switch(e.type){
  case 'activate':{WTV.core.visible=true;WTV.dropT=0;sfx('phase',.6);FG.shake=.35;whisper('ReFramer on an occupied shuttle','brace it · get them out · take its legs');plog('discoveries','Wrong Target — a ReFramer is harvesting a civic shuttle at Foundry Steps');WTV.keeper.visible=true;WTV.kp.copy(WTV.core.position).add(new THREE.Vector3(2,1,0));break;}
  case 'policeArrive':for(const o of WTV.offs)o.o.visible=true;beep(660,.12,'square',.03);setTimeout(()=>beep(880,.12,'square',.03),160);whisper('Armored police on scene','they decide from what they see');break;
  case 'braced':st.gal=Math.max(0,st.gal-e.cost/100);wtBraceMesh();setViolet(.6);burst(WTV.bus.position.clone().setY(groundY+1.5),60,6);whisper('Shuttle braced · '+e.cost+' Gallium','the door is clear');break;
  case 'blocked':whisper(e.why==='brace'?'Too risky to open':'Not enough Gallium',e.why==='brace'?'brace the shuttle first — hold Metal Draw beside it':'draw more metal');break;
  case 'busSwing':FG.shake=.5;beep(70,.35,'sawtooth',.06);whisper('It ripped a wheel off','the riders are shaken');WTV.wheels[0].visible=false;break;
  case 'extracted':{const ch=WTV.people[e.id==='A'?0:1];ch.o.visible=true;ch.o.position.set(WTV.site.door.x,groundY,WTV.site.door.z+.6);WTV.heads[e.id==='A'?0:1].visible=false;playT(ch,'Wave',.8);whisper('Out of the shuttle','not safe yet — walk them to the safe zone');break;}
  case 'waiting':whisper('They stopped','they won\'t follow from that far');break;
  case 'safe':beep(700,.08,'triangle',.05);setTimeout(()=>beep(1050,.1,'triangle',.05),90);burst(new THREE.Vector3(WTV.site.safe.x,groundY+1,WTV.site.safe.z),30,4);whisper('Safe · '+S.after.rescued+'/2','');break;
  case 'police':if(e.mode==='ASSIST')whisper(e.officer+' stands down','they\'re helping now');else if(e.mode==='PURSUE')whisper(e.officer+' is coming for you','keep moving — a snare only slows you');break;
  case 'snare':WTV.snareT=WT.SNARE_T;WTV.snareFrom=WTV.offs[e.officer==='MC-01'?0:1];beep(300,.2,'square',.04);break;
  case 'limbHit':if(e.down){burst(WTV.limbs[e.id-1].knee,40,6);FG.shake=.3;beep(90,.25,'sawtooth',.05);whisper(e.id<=4?'Support leg down':'Harvest arm down',e.shift?'that leg was carrying the shuttle — it dropped onto it':e.stance?'it can\'t hold its stance':'');}break;
  case 'repair':whisper('Framekeeper is welding leg '+e.id,'stock '+e.stock+' · stop the drone, not the armor');break;
  case 'keeperDown':burst(WTV.kp,40,5);beep(160,.2,'square',.05);whisper('Repair drone down','');break;
  case 'keeperHit':burst(WTV.kp,12,3);break;
  case 'lilHeavyScan':whisper('Lil Heavy filmed it','independent footage · the drone backs off');break;
  case 'stomp':metalHurt(WT.STOMP_DMG,WTV.core.position,'stomp');vRing(p.x,p.z,2.2,.4,0xff6a6a);break;
  case 'gravOff':whisper('The field collapsed','');break;
  case 'complete':{FG.shake=.6;beep(40,.5,'square',.08);burst(WTV.core.position,120,9);st.gal=Math.min(1,st.gal+.25);
   toast('Wrong Target · '+e.rescued+'/2 safe'+(e.shaken?' ('+e.shaken+' shaken)':'')+' · police trust '+e.trust);plog('achievements','Wrong Target — both riders safe, Roadframe down, trust '+e.trust);
   whisper('The machine is down','everyone out · the stop reopens');for(const o of WTV.offs)playT(o,'Wave',1.2);try{localStorage.setItem(WTV.saveKey,wtSave(S));}catch(_){}break;}
 }}
function wtTick(dt){if(!WTV.c||!P)return;wtInit();const S=WTV.S;if(!S)return;const p=P.o.position,y=groundY;
 const ePress=!!pressed.KeyE&&Math.hypot(p.x-WTV.site.door.x,p.z-WTV.site.door.z)<WT.DOOR_R;if(ePress)pressed.KeyE=false;
 let lhScan=false;if(S.mission==='DEFEND'&&!WTV.lhSeen&&LH.o&&LH.o.position.distanceTo(WTV.core.position.clone().setY(y))<14&&LH.mode==='scout'){WTV.lhSeen=true;lhScan=true;}
 const w={metal:{x:p.x,z:p.z},drawing:DRW.drawing,interact:ePress,gal:st.gal*100,officers:WTV.offs.map(o=>({x:o.o.position.x,z:o.o.position.z})),
  occluded:WTV.offs.map(o=>!o.o.visible||!wtLOS(o.o.position.clone().setY(y+1.7),p.clone().setY(p.y+1))),lilHeavyScan:lhScan};
 const prevM=S.mission;const out=wtStep(S,w,dt);for(const e of out.events)wtEv(e);
 // signal before it starts
 WTV.signal.intensity=S.mission==='APPROACH'?6+5*Math.sin(performance.now()/180):0;
 if(S.mission==='APPROACH'||S.mission==='COMPLETE'&&prevM==='COMPLETE'){return;}
 // gravity anomaly (bounded): pushes Metal and loose debris sideways
 WTV.field.visible=S.grav.on;if(S.grav.on){if(!DRV.active&&out.grav){vel.x+=out.grav.ax*dt;vel.z+=out.grav.az*dt;}for(const d of WTV.debris){d.m.visible=true;d.a+=dt*.6;d.h=(d.h+dt*.5)%3;d.m.position.set(WTV.site.field.x+Math.cos(d.a)*d.r+S.site.field.dx*d.h,y+.3+d.h,WTV.site.field.z+Math.sin(d.a)*d.r+S.site.field.dz*d.h);d.m.rotation.x+=dt*2;}}
 else for(const d of WTV.debris)d.m.visible=false;
 // snare: a cable from the officer slows Metal, he can drag through it
 if(out.snare)WTV.snareT=out.snare;WTV.snareT-=dt;if(WTV.snareT>0&&WTV.snareFrom){vel.multiplyScalar(Math.exp(-4*dt));if(!WTV.snareLine){WTV.snareLine=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1,5),new THREE.MeshBasicMaterial({color:0xcfe8ff}));WTV.snareLine.rotation.order='YXZ';scene.add(WTV.snareLine);}
  const a=WTV.snareFrom.o.position.clone().setY(y+1.2),b=p.clone().setY(p.y+1);WTV.snareLine.visible=true;WTV.snareLine.position.copy(a).add(b).multiplyScalar(.5);WTV.snareLine.scale.y=a.distanceTo(b);WTV.snareLine.lookAt(b);WTV.snareLine.rotateX(Math.PI/2);}
 else if(WTV.snareLine)WTV.snareLine.visible=false;
 // shuttle tilt + door cue
 WTV.bus.rotation.x=S.bus.tilt*.5;WTV.door.material.emissiveIntensity=S.bus.braced&&S.people.some(q=>q.phase==='TRAPPED')?.5+.3*Math.sin(performance.now()/200):0;
 // ReFramer pose
 const B=S.boss,cp=WTV.site.nest,target=B.mode==='COLLAPSED'?.9:B.mode==='RECOVER_STANCE'?2.1:4.2;WTV.dropT=(WTV.dropT||0)+dt;
 WTV.coreY+=(target-WTV.coreY)*Math.min(1,dt*(WTV.dropT<1?8:2));const drop=WTV.dropT<.7?(1-WTV.dropT/.7)*14:0;
 WTV.core.position.set(cp.x,y+WTV.coreY+drop,cp.z);WTV.core.rotation.z=B.mode==='RECOVER_STANCE'?.18:B.mode==='COLLAPSED'?.35:Math.sin(S.t*1.3)*.03;WTV.core.rotation.y=-.3;
 WTV.eye.intensity=B.mode==='COLLAPSED'?0:3+Math.sin(S.t*6);
 const bp=WTV.site.bus,legFeet=[[-2.6,3.6],[2.6,3.6],[-4.2,-3.6],[4.2,-3.6]],armX=[-3,-1,1,3];const t=S.t;
 WTV.limbs.forEach((l,i)=>{const Ld=B.limbs[i],dead=Ld.hp<=0,ang=i/8*Math.PI*2;for(const m of [l.up,l.lo,l.kn])m.visible=true;
  l.sh.set(WTV.core.position.x+Math.cos(ang)*1.3,WTV.core.position.y+.6,WTV.core.position.z+Math.sin(ang)*1.0);
  if(Ld.support){const [fx,fz]=legFeet[i];l.foot.set(cp.x+fx*(dead?.6:1),y+(dead?.3:0),cp.z+fz*(dead?.6:1));}
  else{const lift=S.bus.tilt*.5,bx=bp.x+armX[i-4],bz=bp.z-1.3*Math.cos(lift),by=y+2.9*(1)+Math.sin(lift)*2.6;l.foot.set(bx,dead?y+.4:by+Math.sin(t*3+i)*.08,dead?bz-2:bz);}
  l.knee.copy(l.sh).lerp(l.foot,.5);l.knee.y+=dead?-.6:Ld.support?2.0:1.2;wtSeg(l.up,l.sh,l.knee);wtSeg(l.lo,l.knee,l.foot);l.kn.position.copy(l.knee);
  const col=dead?0x5a2f38:Ld.hp<100?0xc08a7a:0x9fb4cb;l.up.material.color.setHex(col);l.lo.material.color.setHex(dead?0x3c2328:0x6c7c90);l.kn.material.color.setHex(dead?0x964f61:0x9b88ca);
  if(dead&&Math.random()<dt*3)burst(l.knee,2,1.2);});
 // Framekeeper drone
 const K=S.keeper;WTV.keeper.visible=true;let kt;
 if(K.mode==='DOWN'){kt=WTV.kp.clone().setY(y+.35);}else if(K.mode==='REPAIR'&&K.target){kt=WTV.limbs[K.target-1].knee.clone().add(new THREE.Vector3(.6,.4,0));if(WTV.kp.distanceTo(kt)<1.2&&Math.random()<.6)burst(WTV.limbs[K.target-1].knee,2,1.5);}
 else if(K.mode==='STABILIZE')kt=new THREE.Vector3(bp.x,y+4.2,bp.z);else if(K.mode==='EVADE')kt=WTV.core.position.clone().add(new THREE.Vector3(0,2.5,-2));else kt=WTV.core.position.clone().add(new THREE.Vector3(Math.cos(t*.7)*3,1.4,Math.sin(t*.7)*3));
 WTV.kp.lerp(kt,Math.min(1,dt*(K.mode==='DOWN'?6:2)));WTV.keeper.position.copy(WTV.kp);if(K.mode!=='DOWN')WTV.keeper.position.y+=Math.sin(t*4)*.08;WTV.keeper.rotation.z=K.mode==='DOWN'?1.2:0;
 WTV.kArms.forEach((a,k)=>{const an=k/8*Math.PI*2+t*(K.mode==='REPAIR'?3:.6);a.position.set(Math.cos(an)*.42,-.1+Math.sin(t*5+k)*.05,Math.sin(an)*.42);a.rotation.y=-an;});
 // riders
 S.people.forEach((q,i)=>{const ch=WTV.people[i];if(q.phase==='TRAPPED')return;ch.o.visible=true;const tp=new THREE.Vector3(q.x,y,q.z),d=tp.clone().sub(ch.o.position).setY(0);
  if(d.length()>.02){ch.o.position.copy(tp);ch.o.rotation.y=Math.atan2(d.x,d.z);play(ch,'Walking');if(q.shaken&&ch.acts.Walking)ch.acts.Walking.setEffectiveTimeScale(.6);}
  else{play(ch,q.phase==='SAFE'?(ch.acts.Idle_TalkingPhone_Loop?'Idle_TalkingPhone_Loop':'Idle'):'Idle');if(q.phase!=='SAFE')ch.o.rotation.y+=angDiff(ch.o.rotation.y,Math.atan2(p.x-ch.o.position.x,p.z-ch.o.position.z))*Math.min(1,dt*3);}});
 // officers act on their assessment
 S.officers.forEach((o,i)=>{const ch=WTV.offs[i];if(o.mode==='OFFDUTY'||!ch.o.visible)return;const op=ch.o.position;let goal=null,run=false;
  if(o.mode==='PURSUE'){goal=p.clone();run=true;}
  else if(o.mode==='ASSIST'){const esc=S.people.find(q=>q.phase==='ESCORTING'||q.phase==='WAITING');goal=esc?new THREE.Vector3(esc.x+1.2,y,esc.z+.8):new THREE.Vector3(WTV.site.safe.x+2.5+i*1.5,y,WTV.site.safe.z-2.5);}
  else{const dir=op.clone().sub(p).setY(0);if(dir.length()<.1)dir.set(1,0,0);goal=p.clone().addScaledVector(dir.normalize(),8+i*1.5);}
  const v=goal.sub(op).setY(0),dd=v.length();if(dd>14)run=true;const sp=run?5.2:2.2;
  if(dd>.4){op.addScaledVector(v.normalize(),Math.min(dd,sp*dt));ch.o.rotation.y=Math.atan2(v.x,v.z);play(ch,run?'Running':'Walking');}
  else{ch.o.rotation.y+=angDiff(ch.o.rotation.y,Math.atan2(p.x-op.x,p.z-op.z))*Math.min(1,dt*4);play(ch,o.mode==='INVESTIGATE'&&ch.acts.Idle_TalkingPhone_Loop?'Idle_TalkingPhone_Loop':'Idle');}
  if(WTV.gauges&&WTV.gauges[i])WTV.gauges[i].material.emissive.setHex(o.mode==='PURSUE'?0xff5a6a:o.mode==='ASSIST'?0x6fe8c1:0xffd36b);});
 if(S.mission==='COMPLETE'&&prevM!=='COMPLETE'){for(const h of WTV.heads)h.visible=false;}
}


// ---------- GALAXY GALLIUM KIT v1 (owner direction 2026-11-06) PROPOSAL / PUBLISH HOLD — rules in gallium_kit_core.mjs ----------
// Liquid metal heated and cooled with particles from the vacuum of space: hot (liquid, flowing) while Metal shapes it,
// set into black galaxy crystal when it cools. Finite: board ⇄ puddles ⇄ reserve ⇄ sword / shield / blast.
var KITV={on:true,K:createKit(),bT:0,bPrev:false,bFired:false,forgeReq:false,formReq:null,recall:null,meshes:new Map(),merk:null,arcs:null,sword:null,shield:null,beams:[],yPrev:false,saveT:0,dirty:false,loaded:false,saveKey:'wirPuddlesV1'};
function starTetra(r,mat){const g=new THREE.Group(),a=new THREE.Mesh(new THREE.TetrahedronGeometry(r,0),mat),b=a.clone();b.scale.set(-1,-1,-1);g.add(a,b);g.userData.a=a;g.userData.b=b;g.rotation.set(Math.atan(Math.SQRT1_2),0,Math.PI/4);return g;}
function liquidMat(cool=0,o={}){const m=galaxyCrystalMat({cool,...o});m.side=THREE.DoubleSide;return m;}
function kitPuddleAdd(x,y,z,amt){const p=kitAddPuddle(KITV.K,x,y,z,amt);KITV.dirty=true;kitPuddleSync();return p;}
function kitPuddleSync(){const live=new Set();
 for(const p of KITV.K.puddles){live.add(p.id);let m=KITV.meshes.get(p.id);if(!m){m=new THREE.Mesh(new THREE.CircleGeometry(1,14),liquidMat(.3));m.rotation.x=-Math.PI/2;m.receiveShadow=true;scene.add(m);KITV.meshes.set(p.id,m);}
  const r=.3+1.9*Math.sqrt(Math.max(0,p.amount));m.scale.set(r,r,1);m.position.set(p.x,p.y+.03,p.z);}
 for(const [id,m] of KITV.meshes)if(!live.has(id)){scene.remove(m);KITV.meshes.delete(id);}}
function kitInit(){if(KITV.loaded||!P)return;KITV.loaded=true;
 try{if(new URLSearchParams(location.search).get('world')==='reset')localStorage.removeItem(KITV.saveKey);const t=localStorage.getItem(KITV.saveKey);if(t)kitLoadPuddles(KITV.K,t);}catch(e){}kitPuddleSync();
 KITV.merk=starTetra(.95,liquidMat(0,{transparent:true,opacity:.7}));KITV.merk.visible=false;scene.add(KITV.merk);
 const g=new THREE.BufferGeometry();KITV.arcPos=new Float32Array(8*7*2*3);g.setAttribute('position',new THREE.BufferAttribute(KITV.arcPos,3));
 KITV.arcs=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb46bff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));KITV.arcs.frustumCulled=false;KITV.arcs.visible=false;scene.add(KITV.arcs);}
// the sword lives in the right hand, the shield on the left forearm (rebuilt if the rig changes)
function kitHandMeshes(){if(!P||!P.model)return;const want=KITV.K.hand;
 const rh=P.model.getObjectByName('RightHand')||P.model.getObjectByName('hand_r'),la=P.model.getObjectByName('LeftLowerArm')||P.model.getObjectByName('lowerarm_l');
 if(!KITV.sword&&rh){const s=new THREE.Group(),blade=new THREE.Mesh(new THREE.BoxGeometry(.06,1.05,.022),liquidMat(.35,{emissive:0x7b4dff,emissiveIntensity:.1}));blade.position.y=.62;
  const edge=new THREE.Mesh(new THREE.BoxGeometry(.012,1.0,.026),new THREE.MeshBasicMaterial({color:0xcdb8ff}));edge.position.set(.032,.62,0);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(.22,.04,.06),liquidMat(.8));guard.position.y=.08;s.add(blade,edge,guard);s.scale.setScalar(1/(rh.getWorldScale(new THREE.Vector3()).x||1));rh.add(s);KITV.sword=s;}
 if(!KITV.shield&&la){const s=new THREE.Group(),disc=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.05,24),liquidMat(.4));disc.rotation.z=Math.PI/2;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.52,.03,6,24),liquidMat(.9));rim.rotation.y=Math.PI/2;s.add(disc,rim);s.position.x=.08;s.scale.setScalar(1/(la.getWorldScale(new THREE.Vector3()).x||1));la.add(s);KITV.shield=s;}
 if(KITV.sword)KITV.sword.visible=want==='sword';if(KITV.shield)KITV.shield.visible=want==='shield';}
function kitDoB(hold){const L=RSK.loose,p=P.o.position;
 const a=kitBAction(KITV.K,{hold,riding:!!st.board,fight:FG.inFight,loose:L?{x:L.p.x,z:L.p.z}:null,metal:{x:p.x,z:p.z},gal:st.gal});
 switch(a.act){
  case 'recall':KITV.recall={L,t:0,dur:.3+a.d/70,from:{...L.p}};RSK.looseR=null;beep(520,.08,'triangle',.04);setViolet(.6);whisper('Board — come back','B tap');break;
  case 'forgeFar':kitPuddleAdd(L.p.x,L.p.y,L.p.z,FORGE_COST);RSK.loose=null;RSK.looseR=null;board.visible=false;KITV.forgeReq=true;whisper('Too far to call back','it melted where it lay · forging a new one');break;
  case 'forge':KITV.forgeReq=true;break;
  case 'noMaterial':whisper('Not enough Gallium for a board','L2 + R2 pulls puddles and metal back');break;
  case 'dismantleBoard':st.board=false;board.visible=false;try{forgeController?.dissolve?.();}catch(e){}kitPuddleAdd(p.x,floorAt(p),p.z,FORGE_COST);vel.multiplyScalar(.4);burst(p.clone().setY(p.y+.2),30,3);beep(160,.2,'sine',.05);whisper('Board melted','a puddle — it stays · pull it back any time');break;
  case 'dismantleLoose':kitPuddleAdd(L.p.x,L.p.y,L.p.z,FORGE_COST);RSK.loose=null;RSK.looseR=null;board.visible=false;burst(new THREE.Vector3(L.p.x,L.p.y+.2,L.p.z),24,3);whisper('Board melted where it lay','');break;
  case 'meltHand':{const r=kitMeltHand(KITV.K);kitPuddleAdd(p.x,floorAt(p),p.z,r.amount);kitHandMeshes();burst(p.clone().setY(p.y+1),20,2);whisper((r.kind==='sword'?'Sword':'Shield')+' melted','');break;}
 }}
function kitBeam(power){const dir=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),o=P.o.position.clone().setY(P.o.position.y+1.25).addScaledVector(dir,.7),L=24;
 const g=new THREE.Group(),r=.28+.5*power,outer=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.8,L,18,1,true),liquidMat(0,{transparent:true,opacity:.92})),
  core=new THREE.Mesh(new THREE.CylinderGeometry(r*.45,r*.4,L,12,1,true),new THREE.MeshBasicMaterial({color:0xc9a6ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
 g.add(outer,core);g.position.copy(o).addScaledVector(dir,L/2);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(g);KITV.beams.push({g,t:0,power});
 FG.shake=Math.max(FG.shake,.35+.4*power);setViolet(1);vRing(o.x,o.z,1.5+power*2,.4,0xb46bff);if(P.acts.Blast){playT(P,'Blast',.4);actT=.5;}
 for(let k=0;k<6;k++)setTimeout(()=>beep(900-k*120,.07,'sawtooth',.04),k*35);beep(55,.5,'square',.08);
 const seg=new THREE.Line3(o,o.clone().addScaledVector(dir,L)),q=new THREE.Vector3();
 for(const f of FOES){if(!f.R.active||f.R.out)continue;seg.closestPointToPoint(f.ch.o.position.clone().setY(f.ch.o.position.y+1),true,q);if(q.distanceTo(f.ch.o.position.clone().setY(f.ch.o.position.y+1))<1.1+power)hitFoe(f,{...STRK.blast,dmg:.18+.34*power,kb:5+10*power,down:power>.6,react:'Knock',src:'glob'},0,dir);}
 let hits=0;for(let s=1;s<L&&hits<3;s+=1.5){const pt=o.clone().addScaledVector(dir,s);if(reframerHit('blast',Math.min(1,.5+power*.6),pt))hits++;}
 for(const c of cars){if(c.userData.driven||c.userData.bike)continue;seg.closestPointToPoint(c.position,true,q);if(q.distanceTo(c.position)<1.6+power){const imp=dir.clone().multiplyScalar(9*power);c.userData.kick=imp;burst(c.position.clone().setY(1),18,4);}}}
function kitTick(dt){if(!P)return;kitInit();const K=KITV.K,p=P.o.position,gp=RSK.gp;
 // B: tap / hold (while pulling: B = shield)
 const bDown=!!(keys.KeyB||(gp&&gp.buttons[1]&&gp.buttons[1].pressed));
 if(K.pulling){if(bDown&&!KITV.bPrev)KITV.formReq='shield';KITV.bFired=true;KITV.bT=0;}
 else if(bDown){KITV.bT+=dt;if(KITV.bT>=KIT.HOLD_B&&!KITV.bFired){KITV.bFired=true;kitDoB(true);}}
 else{if(KITV.bPrev&&!KITV.bFired&&KITV.bT<KIT.HOLD_B&&!st.wall)kitDoB(false);KITV.bT=0;KITV.bFired=false;}
 KITV.bPrev=bDown;
 // recall flight: the board arcs home trailing liquid metal, Metal steps on when it lands
 if(KITV.recall){const R=KITV.recall,L=R.L;if(RSK.loose!==L)KITV.recall=null;else{R.t+=dt;const k=Math.min(1,R.t/R.dur),e=k*k*(3-2*k);
  L.p.x=R.from.x+(p.x-R.from.x)*e;L.p.z=R.from.z+(p.z-R.from.z)*e;L.p.y=R.from.y+(floorAt(p)-R.from.y)*e+Math.sin(k*Math.PI)*2.4;L.roll+=dt*16;
  if(Math.random()<.8)burst(new THREE.Vector3(L.p.x,L.p.y+.1,L.p.z),1,.4);if(k>=1){L.roll=0;L.p.y=floorAt(p);RSK.looseT=1;KITV.recall=null;beep(330,.05,'triangle',.03);}}}
 // L2 + R2 on foot (keyboard: hold Y) = PULL
 const l2=!!(keys.KeyY||gp&&gp.buttons[6]&&gp.buttons[6].value>.5),r2=!!(keys.KeyY||gp&&gp.buttons[7]&&gp.buttons[7].value>.5);
 const onFoot=!st.board&&!DRV.active&&!st.swing&&!st.flying&&!RSK.active&&!KITV.recall;
 const o=kitPullStep(K,{l2,r2,onFoot},K.pulling?(DRW.lastGot||0):0,dt);
 for(const e of o.ev){if(e==='pullStart'){whisper('Pulling metal','+ X sword · + B shield · + Y plasma blast');beep(110,.25,'sine',.04);}
  if(e==='heavy'){whisper('Heavy Hands','strikes hit like a truck for a while');beep(70,.3,'square',.06);FG.shake=.25;}}
 const xb=!!(gp&&gp.buttons[2]&&gp.buttons[2].pressed);if(o.pulling){vel.x*=Math.exp(-6*dt);vel.z*=Math.exp(-6*dt);if(pressed.Numpad4||xb&&!KITV.xPrev){pressed.Numpad4=false;KITV.formReq='sword';}}KITV.xPrev=xb;
 if(KITV.formReq){const r=kitForm(K,KITV.formReq,st.gal);KITV.formReq=null;
  if(r.ok){st.gal=Math.max(0,st.gal-r.net);kitHandMeshes();burst(p.clone().setY(p.y+1.2),30,3);beep(r.kind==='sword'?880:440,.12,'triangle',.05);whisper(r.kind==='sword'?'Galaxy sword':'Liquid-metal shield','hold B to melt it back');}
  else if(r.why==='material')whisper('Not enough Gallium','');}
 const y=!!(gp&&gp.buttons[3]&&gp.buttons[3].pressed)||!!keys.KeyG;if(o.pulling&&y&&!KITV.yPrev){const b=kitBlast(K,st.gal);if(b.ok){st.gal=Math.max(0,st.gal-b.cost);kitBeam(b.power);proHook('power','plasma');}else whisper(b.why==='charge'?'Keep pulling':'Not enough Gallium','');}KITV.yPrev=y;
 // Merkaba + purple plasma arcs
 const M=KITV.merk,c=o.merkaba;M.visible=c>.02;if(M.visible){M.position.copy(p).setY(p.y+1.15);const s=.35+1.05*c;M.scale.setScalar(s);M.userData.a.rotation.y+=dt*(1.5+4*c);M.userData.b.rotation.y-=dt*(1.5+4*c);M.userData.a.material.opacity=.35+.5*c;if(o.pulling)setViolet(.4+.6*c);}
 KITV.arcs.visible=o.arcs&&o.pulling;if(KITV.arcs.visible){const A=KITV.arcPos,R0=.95*(.35+1.05*c);let n=0;
  for(let b=0;b<8;b++){const th=Math.random()*6.283,ph=Math.random()*3.1416,tx=p.x+Math.sin(ph)*Math.cos(th)*R0*1.3,ty=p.y+1.15+Math.cos(ph)*R0*1.3,tz=p.z+Math.sin(ph)*Math.sin(th)*R0*1.3;
   let ax=p.x+(b%2?.3:-.3),ay=p.y+1.1,az=p.z;for(let k=1;k<=7;k++){const f=k/7,j=(1-Math.abs(f-.5)*2)*.28;const bx=ax+(tx-ax)/(8-k)+(Math.random()-.5)*j,by=ay+(ty-ay)/(8-k)+(Math.random()-.5)*j,bz=az+(tz-az)/(8-k)+(Math.random()-.5)*j;
    A[n++]=ax;A[n++]=ay;A[n++]=az;A[n++]=bx;A[n++]=by;A[n++]=bz;ax=bx;ay=by;az=bz;}}
  KITV.arcs.geometry.attributes.position.needsUpdate=true;if(Math.random()<.25)beep(2400+Math.random()*1800,.02,'square',.012);}
 // beams fade; cars kicked by a beam roll
 for(let i=KITV.beams.length-1;i>=0;i--){const B=KITV.beams[i];B.t+=dt;const k=B.t/.75;B.g.scale.set(1+k*.6*(1-k),1,1+k*.6*(1-k));B.g.children[0].material.opacity=Math.max(0,.92*(1-k));B.g.children[1].material.opacity=Math.max(0,.9*(1-k));if(k>=1){scene.remove(B.g);KITV.beams.splice(i,1);}}
 for(const c of cars){const kk=c.userData.kick;if(!kk)continue;c.position.addScaledVector(kk,dt);kk.multiplyScalar(Math.exp(-2.5*dt));c.rotation.y+=kk.length()*dt*.15;if(kk.length()<.2)c.userData.kick=null;}
 kitHandMeshes();
 // the puddles stay — save them
 KITV.saveT-=dt;if(KITV.dirty&&KITV.saveT<=0){KITV.saveT=3;KITV.dirty=false;try{localStorage.setItem(KITV.saveKey,kitSerializePuddles(KITV.K));}catch(e){}}}
function kitShieldBlock(dmg,from){if(KITV.K.hand!=='shield'||!from||!P)return dmg;const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),d=from.clone().sub(P.o.position).setY(0);if(d.lengthSq()<1e-4)return dmg;d.normalize();
 const r=kitShieldHit(KITV.K,dmg,f.dot(d)>.2);if(r.blocked){burst(P.o.position.clone().setY(P.o.position.y+1.2).addScaledVector(f,.5),14,3);beep(1200,.05,'triangle',.04);
  if(r.broke){kitPuddleAdd(P.o.position.x,floorAt(P.o.position),P.o.position.z,r.broke.amount);kitHandMeshes();whisper('Shield broke','it fell as a puddle');}}return r.dmg;}

// ---------- FRAMEBREAKERS + FRAMEKEEPER PIT CREW (Machine Wars) PROPOSAL / PUBLISH HOLD — rules in framebreaker_core.mjs ----------
var FBV={S:null,c:null,units:[],drones:[],plates:[],patrol:null,pi:[0,0],snareT:0,snareFrom:null,snareLine:null,ready:false,lockFx:[]};
function fbInit(){if(FBV.ready||!rivalGLTF||!SPOTS.foundry||!SPOTS.foundry.c||!WTV.kit&&!WTV.c)return;FBV.ready=true;const C=SPOTS.foundry.c,y=groundY;
 FBV.S=fbCreateSquad(2,2);FBV.patrol=[new THREE.Vector3(C.x-14,y,C.z-23),new THREE.Vector3(C.x+14,y,C.z-23)];
 const c={name:'Framebreakers',home:FBV.patrol[0].clone(),state:'fb',level:4,members:[],story:true,fbCtl:true};FBV.c=c;
 const steel=new THREE.MeshStandardMaterial({color:0x50565f,metalness:.85,roughness:.35}),hazard=new THREE.MeshStandardMaterial({color:0xd98a2b,metalness:.5,roughness:.5});
 for(let i=0;i<2;i++){const ch=makeFighter(rivalGLTF,{top:0x2b2f36,bot:0x1d2026,shoe:0x0d0f12,h:1.98});ch.o.position.copy(FBV.patrol[0]).add(new THREE.Vector3(i*1.8,0,0));scene.add(ch.o);
  const bone=n=>ch.o.getObjectByName(n);const sp=bone('spine_03'),ul=bone('upperarm_l'),ur=bone('upperarm_r'),hd=bone('Head');const P2={};
  const plate=(parent,w,h,d,x,yy,z,mat)=>{if(!parent)return null;const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);const sc=1/(parent.getWorldScale(new THREE.Vector3()).x||1);m.scale.setScalar(sc);m.position.set(x*sc,yy*sc,z*sc);m.castShadow=true;parent.add(m);m.userData.home={parent,pos:m.position.clone(),q:m.quaternion.clone()};return m;};
  P2.chest=plate(sp,.44,.34,.12,0,.05,.16,steel);P2.back=plate(sp,.42,.36,.1,0,.05,-.16,steel);P2.shoulderL=plate(ul,.2,.14,.26,0,.04,0,hazard);P2.shoulderR=plate(ur,.2,.14,.26,0,.04,0,hazard);
  if(hd){const sc=1/(hd.getWorldScale(new THREE.Vector3()).x||1),hm=new THREE.Group();const shell=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.32),steel);const vis=new THREE.Mesh(new THREE.BoxGeometry(.26,.1,.02),new THREE.MeshStandardMaterial({color:0x111,emissive:0xd98a2b,emissiveIntensity:1}));vis.position.set(0,.02,.165);hm.add(shell,vis);hm.scale.setScalar(sc);hm.position.set(0,.1*sc,.02*sc);hd.add(hm);FBV.visors=(FBV.visors||[]).concat(vis);}
  const t=nameTag('Framebreaker FB-'+(i+1),0xd98a2b);t.position.y=2.4;ch.o.add(t);worldLabels.push(t);t.visible=HELP.on;
  const R={kind:'crew',crew:c,label:'Framebreaker',style:'heavy',active:false,stance:1,level:4,out:false,slot:i*3,kb:new THREE.Vector3(),fb:i};const foe={ch,R};c.members.push(foe);FOES.push(foe);FBV.units.push({ch,R,plates:P2});
  const lock=new THREE.Mesh(new THREE.RingGeometry(.35,.6,16),new THREE.MeshBasicMaterial({color:0xd98a2b,transparent:true,opacity:.8,side:THREE.DoubleSide}));lock.rotation.x=-Math.PI/2;lock.visible=false;scene.add(lock);FBV.lockFx.push(lock);}
 STORY_FIGHTS.push(c);
 for(let j=0;j<2;j++){const d=new THREE.Group();const v=wtVox('keeper',.075);if(v){v.position.y=-.22;d.add(v);}else d.add(new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshStandardMaterial({color:0x5a8090})));
  for(let k=0;k<8;k++){const a=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,.24),new THREE.MeshStandardMaterial({color:0x8caaa9,metalness:.6}));const an=k/8*Math.PI*2;a.position.set(Math.cos(an)*.2,-.05,Math.sin(an)*.2);a.rotation.y=-an;d.add(a);}
  d.position.copy(FBV.patrol[0]).add(new THREE.Vector3(j,2.6,-1));scene.add(d);FBV.drones.push({m:d,carry:null,fall:0});}}
function fbOnHit(foe,s,dir){const i=foe.R.fb;if(i==null||!FBV.S)return s;const u=FBV.units[i],fw=new THREE.Vector3(Math.sin(u.ch.o.rotation.y),0,Math.cos(u.ch.o.rotation.y));
 const fromFront=dir?fw.dot(dir)<0:true,power=Math.min(1,(s.dmg||.1)*3.2*((s.kb||0)>6?1.25:1)),kind=s.src==='glob'?'glob':'strike';
 const h=fbHitUnit(FBV.S,i,power,{fromFront,kind});if(!h)return s;
 if(h.plateOff)fbDropPlate(i,h.plateOff);if(h.lockBroken){whisper('Ground lock broken','');beep(300,.1,'square',.04);}
 foe.R.minStance=fbPlatesOn(FBV.S.units[i])>0?.15:0;
 return {...s,dmg:s.dmg*h.dmgMul,kb:(s.kb||0)*h.kbMul};}
function fbDropPlate(i,name){const m=FBV.units[i].plates[name];if(!m)return;const wp=m.getWorldPosition(new THREE.Vector3()),wq=m.getWorldQuaternion(new THREE.Quaternion()),ws=m.getWorldScale(new THREE.Vector3());
 m.removeFromParent();m.position.copy(wp);m.quaternion.copy(wq);m.scale.copy(ws);scene.add(m);FBV.plates.push({m,i,name,v:new THREE.Vector3((Math.random()-.5)*3,3.5,(Math.random()-.5)*3),w:new THREE.Vector3(Math.random()*6,Math.random()*6,0),held:false});
 burst(wp,22,4);beep(240,.08,'square',.05);whisper('Plate knocked loose','stop the little drones or it goes right back on');}
function fbTick(dt){fbInit();const S=FBV.S;if(!S)return;const p=P.o.position,y=groundY,c=FBV.c;
 const trust=WTV.S&&WTV.S.mission==='COMPLETE'?WTV.S.after.trust:0;const E=RFR.W&&RFR.W.enc;
 const rfPos=E?{x:E.target.x,z:E.target.z}:(WTV.S&&WTV.S.mission==='DEFEND'?{x:WTV.core.position.x,z:WTV.core.position.z}:null);
 const near=rfPos&&FBV.units.some(u=>Math.hypot(u.ch.o.position.x-rfPos.x,u.ch.o.position.z-rfPos.z)<40);
 FBV.units.forEach((u,i)=>{if(u.R.out&&S.units[i].state!=='surrender'){S.units[i].state='surrender';whisper('FB-'+(i+1)+' surrenders','the operator climbs out · nonlethal');}});
 const out=fbStep(S,{metal:{x:p.x,z:p.z},riding:!!st.board&&RSK.active,trust,reframerNear:!!near,units:FBV.units.map(u=>({x:u.ch.o.position.x,z:u.ch.o.position.z}))},dt);
 for(const e of out.events){const u=FBV.units[e.i];
  if(e.type==='state'){if(e.state==='confront'&&c.state!=='fight'){c.home=u.ch.o.position.clone();startCrew(c);for(const f of c.members)f.R.minStance=.15;whisper('Framebreakers','plates, not health — knock them loose, stop the drones');}
   if((e.state==='standdown'||e.state==='ally')&&c.state==='fight'&&!S.units.some(q=>q.state==='confront'))fbEndFight();
   if(e.state==='standdown'){whisper('FB-'+(e.i+1)+' stands down','they heard what you did at Foundry Steps');playT(u.ch,'Wave',1);}}
  if(e.type==='alliance'){whisper('Emergency alliance','the Framebreakers turn on the machine');if(c.state==='fight')fbEndFight();}
  if(e.type==='groundLock'){FBV.lockFx[e.i].visible=true;FBV.lockFx[e.i].userData.t=2.5;beep(180,.12,'square',.04);}
  if(e.type==='frameShear'&&st.board&&RSK.active){fbShear(u);}
  if(e.type==='snare'){FBV.snareT=1.6;FBV.snareFrom=u;beep(300,.2,'square',.04);}
  if(e.type==='droneCatch'){const pl=FBV.plates.find(q=>q.i===e.i&&q.name===e.plate&&!q.held);if(pl){pl.held=true;FBV.drones[e.j].carry=pl;}}
  if(e.type==='plateRepaired'){const pl=FBV.plates.find(q=>q.i===e.i&&q.name===e.plate);if(pl){const h=pl.m.userData.home;h.parent.add(pl.m);pl.m.position.copy(h.pos);pl.m.quaternion.copy(h.q);pl.m.scale.setScalar(1/(h.parent.getWorldScale(new THREE.Vector3()).x||1));FBV.plates.splice(FBV.plates.indexOf(pl),1);}
   FBV.drones[e.j].carry=null;burst(u.ch.o.position.clone().setY(y+1.4),10,2);beep(1400,.04,'square',.03);u.R.minStance=.15;}}
 // units between fights: patrol / stand / walk on the machine
 FBV.units.forEach((u,i)=>{const su=S.units[i],o=u.ch.o;const lk=FBV.lockFx[i];if(lk.visible){lk.userData.t-=dt;lk.position.set(o.position.x,y+.04,o.position.z);if(lk.userData.t<=0)lk.visible=false;}
  if(c.state==='fight'||u.R.out)return;let goal=null,run=false;
  if(su.state==='patrol'){goal=FBV.patrol[FBV.pi[i]];if(o.position.distanceTo(goal)<1)FBV.pi[i]^=1;}
  else if(su.state==='ally'&&rfPos){goal=new THREE.Vector3(rfPos.x+(i?3:-3),y,rfPos.z+4);run=true;if(o.position.distanceTo(goal)<2&&Math.random()<dt*.8){const at=new THREE.Vector3(rfPos.x,y+1.5,rfPos.z);reframerHit('strike',.6,at);burst(at,14,3);playT(u.ch,'Melee_Hook',.6);}}
  else if(su.state==='standdown'){o.rotation.y+=angDiff(o.rotation.y,Math.atan2(p.x-o.position.x,p.z-o.position.z))*Math.min(1,dt*3);play(u.ch,'Idle');}
  if(goal){const v=goal.clone().sub(o.position).setY(0),d=v.length();if(d>.3){o.position.addScaledVector(v.normalize(),Math.min(d,(run?5:1.8)*dt));o.rotation.y=Math.atan2(v.x,v.z);play(u.ch,run?'Running':'Walking');}}});
 if(FBV.visors)FBV.visors.forEach((v,i)=>v.material.emissive.setHex(S.units[i].state==='confront'?0xff5a3a:S.units[i].state==='surrender'?0x6fe8c1:0xd98a2b));
 // loose plates fall; drones fly to them and carry them home
 for(const pl of FBV.plates){if(pl.held)continue;pl.v.y-=9.8*dt;pl.m.position.addScaledVector(pl.v,dt);pl.m.rotation.x+=pl.w.x*dt;pl.m.rotation.y+=pl.w.y*dt;const fl=floorAt(pl.m.position)+.08;if(pl.m.position.y<fl){pl.m.position.y=fl;pl.v.set(0,0,0);pl.w.multiplyScalar(0);}}
 FBV.drones.forEach((d,j)=>{const sd=S.drones[j];if(sd.hp<=0){d.fall+=dt;d.m.position.y=Math.max(y+.2,d.m.position.y-dt*6);d.m.rotation.z=1.2;if(d.carry){d.carry.held=false;d.carry=null;}return;}
  let tgt;const pl=d.carry;if(pl){const task=S.loose.find(L=>L.drone===j);const tt=task?task.t/FB.REPAIR_T:1;const u=FBV.units[pl.i].ch.o.position;
   tgt=tt<.45?pl.m.position.clone().setY(pl.m.position.y+.3):new THREE.Vector3(u.x,y+1.5,u.z);if(tt>=.45){pl.m.position.lerp(d.m.position.clone().setY(d.m.position.y-.25),Math.min(1,dt*10));}}
  else{const u=FBV.units[j%2].ch.o.position;tgt=new THREE.Vector3(u.x+(j?-.8:.8),y+2.5+Math.sin(performance.now()/400+j)*.15,u.z-.8);}
  d.m.position.lerp(tgt,Math.min(1,dt*FB.DRONE_SPEED*.5));d.m.rotation.y+=dt*(pl?6:1.5);});
 // inertia snare
 FBV.snareT-=dt;if(FBV.snareT>0&&FBV.snareFrom){vel.multiplyScalar(Math.exp(-4*dt));if(!FBV.snareLine){FBV.snareLine=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1,5),new THREE.MeshBasicMaterial({color:0xffc070}));scene.add(FBV.snareLine);}
  const a=FBV.snareFrom.ch.o.position.clone().setY(y+1.2),b=p.clone().setY(p.y+1);FBV.snareLine.visible=true;FBV.snareLine.position.copy(a).add(b).multiplyScalar(.5);FBV.snareLine.scale.y=a.distanceTo(b);FBV.snareLine.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());}
 else if(FBV.snareLine)FBV.snareLine.visible=false;
 if(fbAllDown(S)&&c.state==='fight'){fbEndFight();toast('Framebreakers down — both operators surrendered');plog('achievements','Beat a Framebreaker squad and its pit crew (nonlethal)');}}
// glob / strike / pulse near a pit-crew drone (checked first inside reframerHit)
function fbDroneHit(kind,pos){if(!FBV.S)return false;const p=P.o.position;let best=-1,bd=kind==='pulse'?7:1.5;
 FBV.drones.forEach((d,j)=>{if(FBV.S.drones[j].hp<=0)return;const dd=pos?d.m.position.distanceTo(pos):(kind==='pulse'?d.m.position.distanceTo(p):1e9);if(dd<bd){bd=dd;best=j;}});
 if(best<0)return false;const d=FBV.drones[best];fbHitDrone(FBV.S,best);burst(d.m.position,24,4);beep(160,.2,'square',.05);whisper('Pit-crew drone down','that plate stays off');return true;}
function fbEndFight(){const c=FBV.c;c.state='fb';for(const f of c.members){const R=f.R;R.active=false;R.act=null;R.queue=[];R.guard=false;R.sm=null;R.minStance=0;}if(!activeFoes().length)$('foe').style.display='none';FG.act=null;bell();}
function fbFightOver(c,win){fbEndFight();if(!win){for(const u of FBV.S.units)if(u.state==='confront')u.state='patrol';whisper('The Framebreakers let you go','');}}
// Frame Shear: they go for the trucks — the board gets knocked loose and lost
function fbShear(u){const R=RSK.R;if(!R)return;const p=P.o.position,dir=p.clone().sub(u.ch.o.position).setY(0).normalize();
 const L=createLoose({x:p.x,y:p.y+.2,z:p.z},{x:dir.x*6+vel.x*.5,y:3.5,z:dir.z*6+vel.z*.5},{roll:9,yaw:4},true);
 RSK.loose=L;RSK.looseR={loose:L,world:R.world};RSK.looseT=0;st.board=false;board.visible=true;sk.bailT=0;skBail('Frame Shear');bodyMachine.fall(vel.x,vel.z);
 playT(u.ch,'Melee_Hook',.6);burst(p.clone().setY(p.y+.3),30,4);beep(120,.2,'sawtooth',.06);whisper('Frame Shear — board knocked loose','tap B to call it back');}

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
 else if(k==='Numpad7'){const pulse=!!(keys.ShiftLeft||keys.ShiftRight);const cost=pulse?.4:.2;if(st.charge<cost){toast('Need '+Math.round(cost*100)+'% charge — hold 5');return;}if(pulse&&!onGround){toast('Gallium Pulse needs grounded contact');return;}st.charge-=cost;id='blast';proHook('power','blast');if(pulse)FG.pulseQueued=true;}
 if(!id)return;const s=STRK[id];
 FG.chain=FG.lastT<.55?FG.chain+1:1;if(id==='hook')FG.chain=0;
 let amt=0;if(id!=='blast'&&st.charge>.25){amt=st.charge;st.charge=0;}
 if(FG.lock){const v=toTarget();yaw=Math.atan2(v.x,v.z);P.o.rotation.y=yaw;}
 FG.act={id,s,t:0,hits:new Set(),amt,fired:false};
 if(id!=='blast'){const cb=comboFeed('strike');if(cb&&cb.id==='swingBreaker')FG.breakerT=.8;const fwd=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));const at=P.o.position.clone().addScaledVector(fwd,1.6).setY(P.o.position.y+1);setTimeout(()=>{reframerHit('strike',id==='hook'||id==='dash'?.8:.5,at);if(id==='hook'||id==='dash'||id==='kickR')mwHitWall(at,.35,'strike');},180);}
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
 const cb=comboFeed('pulse'),storm=cb&&cb.id==='magnetStorm';
 const origin=P.o.position.clone();const radius=storm?8.4:4.2;let hits=0;reframerHit('pulse',storm?.9:.6,null);
 if(storm){for(const foe of activeFoes()){const v=origin.clone().sub(foe.ch.o.position).setY(0);if(v.length()<radius)foe.ch.o.position.addScaledVector(v,.45);}vRing(origin.x,origin.z,radius,.6,0xb48cff);}
 for(const foe of activeFoes()){const delta=foe.ch.o.position.clone().sub(origin).setY(0),d=delta.length();
  if(d>radius||d<.01)continue;const falloff=Math.max(.25,1-d/radius);
  hitFoe(foe,{...STRK.blast,dmg:STRK.blast.dmg*falloff,kb:STRK.blast.kb*falloff},0,delta.normalize());hits++;}
 burst(origin.clone().add(new THREE.Vector3(0,.35,0)),38,5);FG.stun=Math.max(FG.stun,.18);FG.shake=Math.max(FG.shake,.2);
 toast(hits?'GALLIUM PULSE · '+hits+' contact'+(hits===1?'':'s'):'GALLIUM PULSE · no contact');
}
// blast: a slug of Galaxy Gallium (gunmetal), not a beam
const blasts=[];function fireBlast(){blastCombo();const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,1),galaxyCrystalMat({}));
 const f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));m.position.copy(P.o.position).add(new THREE.Vector3(0,1.35,0)).addScaledVector(f,.7);scene.add(m);blasts.push({m,v:f.multiplyScalar(22),t:0});}
function blastTick(dt){for(let i=blasts.length-1;i>=0;i--){const b=blasts[i];b.t+=dt;b.m.position.addScaledVector(b.v,dt);
 let hit=false;for(const foe of activeFoes()){const c=_fv2.copy(foe.ch.o.position);c.y+=1.2;if(b.m.position.distanceTo(c)<.85){hit=true;hitFoe(foe,STRK.blast,0,b.v.clone().setY(0).normalize());break;}}
 if(hit||b.t>.7){scene.remove(b.m);b.m.geometry.dispose();blasts.splice(i,1);if(hit)burst(b.m.position,18,4);}}}
function hitFoe(foe,s,amt,dir){const R=foe.R,ch=foe.ch;if(R.inv>0||R.out)return;if(R.ep1)ep1OnHit(foe,s);if(R.fb!=null)s=fbOnHit(foe,s,dir);if(!s.src||s.src==='strike'){const md=kitStrikeMods(KITV.K);if(md.dmg!==1||md.kb!==1)s={...s,dmg:s.dmg*md.dmg,kb:(s.kb||0)*md.kb};}
 if(FG.breakerT>0&&!s.src){s={...s,dmg:s.dmg*2,kb:s.kb*2,down:true};FG.breakerT=0;}
 if(R.vil){const mul=damageMul(R.vil.id,R.vil,{facingYaw:ch.o.rotation.y,fromX:-dir.x,fromZ:-dir.z,src:s.src||'strike'});s={...s,dmg:s.dmg*mul,kb:s.kb*Math.max(.3,mul)};
  if(mul<.3&&!R.armSaid){R.armSaid=true;toast(R.vil.id==='glassjaw'?'Plate cracked — keep breaking the fake reinforcement':'Armored front — use the environment: Gallium globs, cars');setTimeout(()=>R.armSaid=false,3000);}
  if(R.vil.id==='glassjaw'&&R.vil.cracked&&!R.crackSaid){R.crackSaid=true;toast('Glassjaw\'s plates are gone — strong is not tough');}}
 const c=_fv2.copy(ch.o.position);c.y+=1.25;const face=Math.abs(angDiff(ch.o.rotation.y,Math.atan2(-dir.x,-dir.z)))<1.2;
 const brk=amt>.5;
 if(R.guard&&face&&!brk){R.stance=Math.max(0,R.stance-s.dmg*.2);R.kb.addScaledVector(dir,s.kb*.6);burst(c,6,2.5);FG.hitstop=.045;beep(90,.05,'square',.04);toast('Blocked');return;}
 let mult=1+1.5*amt;if(R.act&&R.act.t<R.act.s.t0){mult*=1.5;toast('COUNTER');}
 if(R.guard&&brk)toast('GUARD BREAK');
 R.stance=Math.max(R.minStance||0,R.stance-s.dmg*mult);R.kb.addScaledVector(dir,s.kb*(1+amt)*1.6);R.act=null;R.queue=[];
 FG.combo=FG.comboT<1.2?FG.combo+1:1;FG.comboT=0;FG.hits++;
 const heavy=s.down||amt>.4;FG.hitstop=heavy?.11:.065;FG.shake=heavy?.28:.12;burst(c,heavy?26:14,heavy?6:4);setViolet(1);beep(heavy?70:110,.07,'square',.06);
 if(R.stance<=0){if(R.kind==='rival'){R.sm&&R.sm.changeTo('down');endSpar(true);}else{R.out=true;R.active=false;R.act=null;R.sm=null;if(ch.body)ch.body.emissiveIntensity=0;playT(ch,'Knock',.7);toast('Tapped out');}return;}
 if(R.custom){R.stun=Math.max(.25,s.stun||.3);playT(ch,s.react||'HitChest',R.stun+.12);R.animLock=R.stun;return;}
 ensureAI(foe);if(s.down||(R.guard&&brk)){R.sm.changeTo('down');}else{R.stun=s.stun;playT(ch,s.react,s.stun+.12);R.animLock=s.stun;R.sm.changeTo('stagger');}}
function hitMetal(s,foe){const R=foe.R,v=toFoe(foe);const dir=v.clone().normalize().multiplyScalar(-1); // from the opponent toward Metal
 if(FG.iframe>0){if(FG.dodge&&FG.perfectArm!==R.act){FG.perfectArm=R.act;FG.slow=.45;FG.perfect++;toast('PERFECT DODGE');}return;}
 const facing=Math.abs(angDiff(yaw,Math.atan2(v.x,v.z)))<1.3;
 if(blocking&&facing){if(FG.guardT<.18){FG.parries++;toast('PARRY');FG.hitstop=.12;FG.slow=.3;R.stun=.9;R.act=null;R.queue=[];playT(foe.ch,'GuardBreak',.9);R.animLock=.9;R.sm.changeTo('stagger');
   burst(_fv2.copy(P.o.position).setY(P.o.position.y+1.3).addScaledVector(dir,-.5),20,5);beep(880,.08,'triangle',.06);return;}
  st.hp=Math.max(.02,st.hp-armorDamage(s.dmg*.15));FG.kb.addScaledVector(dir,s.kb*.8);FG.hitstop=.04;burst(_fv2.copy(P.o.position).setY(P.o.position.y+1.3),6,2.5);beep(95,.05,'square',.04);return;}
 st.hp=Math.max(0,st.hp-armorDamage(s.dmg));FG.act=null;FG.buf=null;FG.kb.addScaledVector(dir,s.kb*1.8);FG.shake=.22;FG.hitstop=.07;
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
 approach:{run(R){const m=P.o.position;if(R.haul&&R.d>R.haul.r){const hp=R.ch.o.position;goTo(R,R.haul.x,R.haul.z,2.6);if(Math.hypot(hp.x-R.haul.x,hp.z-R.haul.z)<1.1&&R.animLock<=0){playT(R.ch,R.ch.acts.Chest_Open?'Chest_Open':'Idle',1.6);R.animLock=1.6;}return;}goTo(R,m.x-R.dir.x*2.0,m.z-R.dir.z*2.0,3.2+.25*lvl(R));if(R.d<2.7)R.sm.changeTo('circle');}},
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
 if(R.custom){R.inv=(R.inv||0)-dt;if(R.stun>0)R.stun-=dt;R.custom(foe,dt);return;} // prologue crew: their own brains, still hittable
 ensureAI(foe);R.dt=dt;R.inv-=dt;if(R.stun>0)R.stun-=dt;
 const rp=ch.o.position,mp=P.o.position;R.agent.position.set(rp.x,0,rp.z);
 R.dir.set(mp.x-rp.x,0,mp.z-rp.z);R.d=R.dir.length();R.dir.normalize();
 R.sm.update();if(!R.active||!R.sm)return;
 if(R.vil)villainAbility(foe,dt);
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
function releaseSwing(why,landed){const s=st.swing;if(!s)return;comboFeed('swingRelease');st.gal=Math.min(1,st.gal+s.spent*.5);st.swing=null;tether.visible=false;st.comboPend++;
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
// M05 isolated from original story, saves and movement except opt-in event observers.
let mission05=null,missionDuel=null,missionDuelRestore=null;
function initMission05(){
 if(!MISSION05||!P||!SPOTS.fight.c)return;
 mission05=new RooftopPursuitMission({
  scene,colliders,anchors,skate:SPOTS.skate.c,home:SPOTS.home.c,fight:SPOTS.fight.c,
  storage:safeStorage,
  readWorld:()=>({position:P.o.position,grounded:onGround,board:st.board,
   flying:st.flying,swinging:!!st.swing,forgeBusy:!!forgeController?.busy,storyChapter:metalStory.chapter}),
  onEngage:()=>!!missionDuel?.start(),
  onNotice:message=>toast(message)
 });
 const actPlayer=name=>{
  const labels={Punch:['punch_l','Punch'],Kick:['kick_r','Kick'],Flight:['flight','Flight'],
   Blast:['blast','Blast'],Block:['dodge','Block'],Idle:['idle','Idle']};
  const key=(labels[name]||[name]).find(k=>P.acts[k]);if(key)play(P,key,true,.12);
 };
 missionDuel=new MetalRooftopDuelPilot({
  scene,camera,player:P,origin:mission05.roof.clone(),useWorldEntry:true,hideEntry:true,
  makeOpponent:()=>rivalGLTF?makeFighter(rivalGLTF,{top:0x2b5665,bot:0x1a1c24,shoe:0x252a2f,h:1.95}):makeChar(0x597e9a),
  playPlayer:actPlayer,
  playOpponent:(ch,name)=>{
   const map={HitChest:['hit','HitChest','No'],Knock:['slam','Knock','Fall'],
    Guard:['block','Guard'],Jab:['punch_l','Jab','Punch'],GetUp:['stand','GetUp','Idle']};
   const key=(map[name]||[name]).find(k=>ch.acts[k]);if(key)play(ch,key,true,.12);
  },
  advanceMixers:dt=>{for(const mixer of mixers)mixer.update(dt);},
  onEnter:()=>{
   if(mission05.stage!=='DUEL'||!onGround||st.board||st.wall||st.flying||st.swing||
    forgeController?.busy||FG.inFight||bodyMachine.mode==='fallen'||gripTarget||
    heldCar||heldCitizen||heldActor){
    toast('Dismount on the roof and release held items before the duel');return false;
   }
   missionDuelRestore={pos:P.o.position.clone(),rot:P.o.quaternion.clone(),vel:vel.clone(),
    ground:onGround,flying:st.flying,swing:st.swing,cam:camera.position.clone(),
    up:camera.up.clone(),fov:camera.fov,yaw:camYaw,pitch:camPitch};
   vel.set(0,0,0);onGround=false;FG.act=null;return true;
  },
  onExit:()=>{
   if(!missionDuelRestore)return;const s=missionDuelRestore;
   P.o.position.copy(s.pos);P.o.quaternion.copy(s.rot);vel.copy(s.vel);
   onGround=s.ground;st.flying=s.flying;st.swing=s.swing;
   camera.position.copy(s.cam);camera.up.copy(s.up);camera.fov=s.fov;
   camera.updateProjectionMatrix();camPos.copy(s.cam);camYaw=s.yaw;camPitch=s.pitch;
   FG.act=null;FG.stun=0;missionDuelRestore=null;
   mission05?.refresh();toast('Back on the Savannah rooftop · Metal movement restored');
  }
 });
 mission05.attachDuel(missionDuel);
 mission05.restore(P.o.position); // explicit mission route only, startup-only checkpoint
 window.__mission05={snapshot:()=>mission05.snapshot(),duel:missionDuel};
}


let aerialDuel=null,aerialDuelRestore=null;
// Lifecycle in a self-contained training instance, with full return to original free-roam state.
function initAerialDuelPilot(){
 if(!AERIAL_DUEL_PILOT||!SPOTS.fight.c||!P)return;
 const arenaOrigin=SPOTS.fight.c.clone().add(new THREE.Vector3(0,14.5,0));
 aerialDuel=new MetalRooftopDuelPilot({
  scene,camera,player:P,origin:arenaOrigin,
  makeOpponent:()=>rivalGLTF?makeFighter(rivalGLTF,{top:0x2b5665,bot:0x1a1c24,shoe:0x252a2f,h:1.95}):makeChar(0x597e9a),
  playPlayer:name=>{if(P.acts[name])play(P,name,true,.12);else if(P.acts.Punch)play(P,'Punch',true,.12);},
  playOpponent:(enemy,name)=>{if(enemy.acts[name])play(enemy,name,true,.12);else if(enemy.acts.Idle)play(enemy,'Idle');},
  advanceMixers:dt=>{for(const mixer of mixers)mixer.update(dt);},
  onEnter:()=>{
   if(st.board||st.swing||st.flying||forgeController?.busy||FG.inFight){
    toast('Duel training requires grounded METAL on foot and out of combat');return false;
   }
   aerialDuelRestore={pos:P.o.position.clone(),rot:P.o.quaternion.clone(),vel:vel.clone(),
    ground:onGround,flying:st.flying,swing:st.swing,cam:camera.position.clone(),yaw:camYaw,pitch:camPitch};
   vel.set(0,0,0);onGround=false;st.flying=false;st.swing=null;board.visible=false;FG.act=null;
   return true;
  },
  onExit:()=>{
   if(!aerialDuelRestore)return;
   P.o.position.copy(aerialDuelRestore.pos);P.o.quaternion.copy(aerialDuelRestore.rot);
   vel.copy(aerialDuelRestore.vel);onGround=aerialDuelRestore.ground;
   st.flying=aerialDuelRestore.flying;st.swing=aerialDuelRestore.swing;
   camera.position.copy(aerialDuelRestore.cam);camPos.copy(aerialDuelRestore.cam);
   camYaw=aerialDuelRestore.yaw;camPitch=aerialDuelRestore.pitch;
   FG.act=null;FG.stun=0;FG.inFight=false;aerialDuelRestore=null;
   toast('Returned to Savannah · rooftop duel training ended');
  }
 });
}

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

function fireMetalBlast(){if(!P||st.gal<.12)return;st.gal-=.12;blastCombo();const d=blastDirection(camYaw+Math.PI,Math.max(-.3,Math.min(.3,-camPitch*.35)));const p=P.o.position.clone().add(new THREE.Vector3(0,1.3,0));const ball=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),new THREE.MeshStandardMaterial({color:0xc5a3ff,emissive:0x873aff,emissiveIntensity:2,metalness:.9}));ball.position.copy(p);scene.add(ball);metalBlasts.push({mesh:ball,dir:new THREE.Vector3(d.x,d.y,d.z),life:1.3});toast('GALAXY GALLIUM · plasma-core discharge');}
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
 else if(rm.visible&&p.distanceTo(cm.position)<11&&tap('KeyG')){if(st.gal>=.18){action='disrupt';st.gal-=.18;}else toast('Need Gallium to disrupt the ReFramer construct');} // G elsewhere = Gallium glob
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
 metalPowerLab?.tick(dt); // bounded optional district effects; never owns the player's movement solver
 metalStoryMold?.tick(dt); // tiny story HUD update, no physical or legacy-save writes
 if(missionDuel?.active){
  missionDuel.update(dt);
  mission05?.duelFrame(missionDuel.state);
  return;
 }
 // A dedicated, opted-in training arena owns input/physics only while the duel is active.
 if(aerialDuel?.active){aerialDuel.update(dt);return;}
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
 RSK.active=realRideOk();if(!RSK.active){RSK.R=null;RSK.tilt=null;if(RSK.hud)RSK.hud.style.display='none';}
 const pad=pollPad(dt);driveTick(dt);driveSwallowInput();kitTick(dt);snapIdleTick(dt);
 if(pad&&!controllerSeen){controllerSeen=true;/* guide available on H, not forced over gameplay */}
 tickCitySystems(dt);updateMorrow(dt);updateFactionActors(dt);updateMetalBlasts(dt);updateGalliumPhysics(dt);updateSlottaBoss(dt);updateMetalStory(dt);
 // Controller contract: LB grabs, RB swings, LT charges, RT RIFFT Steps; LB+RT throws a held car.
 const gpWorld=metalPadV3.mode==='skylab'?null:(navigator.getGamepads?[...navigator.getGamepads()].find(g=>g):null);
 const lt=!RSK.active&&!!(gpWorld?.buttons[6]?.pressed||gpWorld?.buttons[6]?.value>.35||gpWorld?.axes?.[4]>.35),lb=!!gpWorld?.buttons[4]?.pressed,rb=!!gpWorld?.buttons[5]?.pressed,rt=!RSK.active&&!!(gpWorld?.buttons[7]?.pressed||gpWorld?.buttons[7]?.value>.35);
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
 if(tap('KeyH')){/* H = help mode toggle (see HELP); the old help panel shows with help on */}
 const pp=P.o.position;
 // camera-relative movement
 const fwd=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw)),right=new THREE.Vector3(-fwd.z,0,fwd.x);
 const wish=new THREE.Vector3().addScaledVector(right,ix).addScaledVector(fwd,-iz);if(wish.lengthSq()>1)wish.normalize();
 const bPressed=(KITV.on&&!st.wall)?((pressed.KeyB=false),(KITV.forgeReq&&!st.board?((KITV.forgeReq=false),true):false)):tap('KeyB');
  // Classic X/Y have no foot-combat effect while riding; opt-in board-only mapping.
  const yardEligible=!!(yard&&st.board&&!st.wall&&!st.swing&&!st.flying&&sk.bailT<=0&&bodyMachine.mode!=='fallen'&&bodyMachine.mode!=='recovering');
  const yardFlipPulse=yardEligible?(tap('BracketLeft')||tap('Numpad4')):false;
  const yardDir=yard?trickDirection(ix,iz):'N'; // W/forward = nose, S/back = tail
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
 } else if(RSK.active){realSkateStep(dt,pp);
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
 if(yard&&st.board&&!st.swing&&!st.wall&&!st.flying&&!RSK.active){
   if(!onGround)yard.onAir(dt,{grabHeld:yardGrabHeld,dir:yardDir});
   const line=yard.grind(dt,{active:st.grinding,dir:yardDir,speed:Math.hypot(vel.x,vel.z)});
   if(line&&line.points){yardSession?.addTricks([line.name],line.points);st.comboPend+=Math.min(2.5,line.points/150);toast(line.name+' · GRIND LINE');}
  }
  // Gallium brace (S1: 1/3 bar) — Shift+Space while flying/swinging cancels momentum
 if(!RSK.active){const _px=pp.x,_pz=pp.z;
 if(!st.flying&&!st.swing)pp.addScaledVector(vel,dt);else if(st.flying)pp.addScaledVector(vel,dt);
 if(skYard&&!st.flying&&!st.swing&&skYard.blocked(pp.x,pp.z,pp.y,.45)){pp.x=_px;pp.z=_pz;} // ramp backs / ledge sides block walking
 const preHit=collide(pp);if(preHit&&lastHit&&st.swing&&st.board&&lastHit.b.max.y>3&&lastHit.into>3){releaseSwing('wall');startWall(lastHit);}if(preHit&&lastHit&&!st.board&&!onGround&&!st.flying&&!st.swing&&!st.wall)tryClimb(lastHit,wish);if(preHit&&lastHit&&st.board&&!st.flying&&!st.swing&&lastHit.into>=WR.minInto&&lastHit.b.max.y>3){const sp=lastHit.hv.length();if(st.gal>=WR.rampCost&&sp>=WR.rampMinSpeed){lastHit.ramp=true;startWall(lastHit);}else if(sp>=WR.minSpeed)startWall(lastHit);}
 if(preHit&&lastHit&&st.board&&onGround&&!st.wall&&!st.flying&&!st.swing&&lastHit.into>MSK.WALL_BAIL){skBail('SLAMMED A WALL');bodyMachine.fall(vel.x,vel.z);bodyMachine.impact=Math.max(bodyMachine.impact,lastHit.into);}
 if(preHit&&lastHit&&st.board&&onGround&&!st.wall&&!st.flying&&!st.swing&&lastHit.into>MSK.WALL_BAIL){skBail('SLAMMED A WALL');bodyMachine.impact=lastHit.into;bodyMachine.fall(vel.x,vel.z);}
 const gY=floorAt(pp);const wasAir=!onGround;
 if(!st.wall&&pp.y<=gY&&!st.swing){if(wasAir&&!st.flying){if(!st.board){bodyMachine.impact=Math.max(0,-vel.y);footLand(vel.y);}if(st.board){if(Math.abs(vel.y)>(SWS.air>0?28:18)){skBail('HARD LANDING');bodyMachine.impact=Math.max(0,-vel.y);bodyMachine.fall(vel.x,vel.z);}else if(finishYardAir()){bank();sk.landT=0;sk.flash=1;if(P.acts.Land){play(P,'Land',true);actT=.16;}}}}pp.y=gY;if(vel.y<0)vel.y=0;onGround=true;if(st.flying)st.flying=false;}
 else if(!st.wall&&pp.y>gY+.05&&!st.swing&&!st.flying){if(!st.board||pp.y>gY+1.15)onGround=false;}
 } // end !RSK.active
 }
 pp.x=THREE.MathUtils.clamp(pp.x,-200,200);pp.z=THREE.MathUtils.clamp(pp.z,-200,200);
 const hs=Math.hypot(vel.x,vel.z);yaw=faceYaw(dt,hs,yaw);if(RSK.active&&RSK.R)yaw=RSK.yaw;P.o.rotation.set(0,yaw,0);if(RSK.active&&RSK.tilt)P.o.quaternion.premultiply(RSK.tilt);
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
 if(RSK.active&&RSK.R)realBoardPose(pp);
 if(!st.board)board.visible=false; // Walking/swinging never displays the board
 if(RSK.loose)realLooseTick(dt,pp);
  if(yard&&!st.board)yard.resetRide();
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
 fightTick(dt);blastTick(dt);globTick(dt);villainFx(dt);villainProjTick(dt);if(FG.breakerT>0)FG.breakerT-=dt;drawTick(dt);reframerTick(dt);reframerSquad?.tick(dt);mwTick(dt);lilHeavyTick(dt);mariTick(dt);ep1Tick(dt);proTick(dt);wtTick(dt);fbTick(dt);audioTick(dt);helpTick(dt,RSK.gp);doStrings(dt);doFootball(dt);
 for(const s of slabs){if(s.t<1){s.t+=dt;s.m.position.y=Math.min(.8,s.m.position.y+s.vy*dt);}else if(s.t<6)s.t+=dt;else{s.m.position.y-=dt;if(s.m.position.y<-1){scene.remove(s.m);s.dead=true;}}}
 for(let i=slabs.length-1;i>=0;i--)if(slabs[i].dead)slabs.splice(i,1);
 // interact prompts
 const spot=where(pp);let prompt='';
 if(spot!==lastSpot){lastSpot=spot;if(spot){$('place').textContent='Savannah · '+spot.name;plog('discoveries','Found '+spot.name);toast(spot.name+'<br><small>'+spot.src+'</small>');}else $('place').textContent='Savannah · Street';}
 if(spot===SPOTS.fight&&!rivalSt.active){prompt='E — challenge the rival to a nonlethal spar';if(tap('KeyE')){bell();rivalSt.active=true;rivalSt.stance=1;$('foe').style.display='block';toast('SPAR! Break their stance or ring them out');plog('decisions','Accepted a spar');}}
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
 for(const c of cars){if(c.userData.worldBody||c.userData.parked||c.userData.driven||(REFRAMER_SQUAD&&c.userData.reframed))continue;const u=c.userData;u.t+=u.dir*u.spd*dt;if(u.t>220)u.t=-220;if(u.t<-220)u.t=220;
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
 p6Pose(dt);if(RSK.active)p6Crouch(dt);sk.rail=st.grinding;
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
 if(yardSession){yardSession.tick(dt,{grounded:!!(onGround&&st.board&&!st.wall&&!st.swing&&!st.flying)});renderYardSession();}
 physicsTime+=dt;
 physicsTelemetry.sample({time:physicsTime,dt,position:P.o.position,velocity:vel,grounded:onGround,board:st.board,wall:st.wall,swing:st.swing,flying:st.flying,body:bodyMachine});
 mission05?.tick(dt);
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
  if(AERIAL_DUEL_PILOT){
    initAerialDuelPilot();
    if(REFRAMER_IK_PROBE&&aerialDuel){
      import('./reframer_asset_ik_pilot.mjs').then(({attachReframerAssetIKPilot})=>{
        window.__reframerAssetPilot=attachReframerAssetIKPilot(aerialDuel);
      }).catch(err=>console.warn('[WIR ReFramer IK pilot]',err));
    }
  } // legacy pilot stays isolated from Mission05 by flag
  plog('log','Session started in Savannah');$('load').style.display='none';window.__ready=true;
  boot.ready();sfxLoad();
  if(boot.getStatus().warnings.length)toast('Mission running with '+boot.getStatus().warnings.length+' art fallbacks · PROPOSAL');
  window.__game={galLimb:()=>galLimb,forge:()=>forgeController,forgePerformance:()=>forgePerformance.snapshot(),WR,colliders,vel,camera,P,st,board,seamMats,setMask,anchors,slabs,SPOTS,profile,keys,pressed,teleportForTest:(v)=>{P.o.position.copy(v);},startWallForTest:startWall};// test harness only (not a gameplay teleport)
  if(AERIAL_DUEL_PILOT)window.__aerialPilot=aerialDuel; // query-flagged browser QA and training entry only
  window.__game.setForm=setForm;window.__game.sk=sk;if(yard){window.__game.testYard=()=>yard.snapshot();if(yardSession)window.__game.testYardSession=()=>yardSession.snapshot();}window.__game.FG=FG;window.__game.FOES=FOES;window.__game.CREWS=CREWS;window.__game.SWS=SWS;window.__game.startCrew=startCrew;window.__game.ground=()=>onGround;window.__game.rivalSt=rivalSt;window.__game.rival=()=>rival;window.__game.STRK=STRK;window.__game.stepForTest=(n,dt)=>{for(let i=0;i<n;i++){update(dt);window.__seasonPost&&window.__seasonPost(dt);}};/* test harness only */window.__game.cityDirector=cityDirector;window.__game.structureImpact=structureImpact;window.__game.grabCar=grabCar;window.__game.slingCar=slingCar;window.__game.thrownCars=thrownCars;window.__game.bodyMachine=bodyMachine;window.__game.fireMetalBlast=fireMetalBlast;window.__game.riffStep=riffStep;window.__game.crownCharge=crownCharge;window.__game.galliumRibbons=galliumRibbons;window.__game.structureGrip=()=>structureGrip;window.__game.riftMarks=riftMarks;window.__game.galliumGrabWorld=galliumGrabWorld;window.__game.gripState=()=>({active:worldGripActive,type:structureGrip?'structure':heldCar?'car':heldCitizen?'citizen':heldActor?'actor':null,hasLimbTarget:!!gripTarget,metal:{x:P.o.position.x,y:P.o.position.y,z:P.o.position.z}});window.__game.factionActors=factionActors;window.__game.slottaAnimation=()=>slottaAnimationSnapshot(slottaAnimator);window.__game.slottaAttack=()=>slottaAttackTelemetry({animator:slottaAnimator,pending:slottaPendingGame,loadout:slottaConsole});window.__game.slottaLoadout=()=>({active:[...slottaConsole.active],stored:[...slottaConsole.stored],archive:[...(slottaConsole.archive||[])]});window.__game.metalBlasts=metalBlasts;window.__game.slottaCombat=slottaCombat;window.__game.metalStory=metalStory;window.__game.metalControllerV3=metalPadV3;window.__game.saveMetalStory=saveMetalStory;window.__game.metalStoryChapter=()=>metalStoryChapter(metalStory);window.__game.controllerSnapshot=()=>{const g=navigator.getGamepads?.()?.find(Boolean);return {connected:!!g,axes:g?.axes?.slice(0,4),buttons:g?.buttons?.map(b=>b.pressed),bodyMode:bodyMachine.mode,impactMode:structureImpact.mode,heldCar:!!heldCar,blastCount:metalBlasts.length,actors:factionActors.length,errors:window.__errors.slice(-5)}};window.__game.physicsTelemetry=physicsTelemetry;window.__game.physicsReport=()=>analyzePhysics(physicsTelemetry.export());window.__game.MSK=MSK;window.__game.RSK=RSK;window.__game.GLB=GLB;window.__game.DRV=DRV;window.__game.LH=LH;window.__game.MARI=MARI;window.__game.EP=EP;window.__game.KITV=KITV;window.__game.GLP=GLP;window.__game.PR=PR;window.__game.PCARD=PCARD;window.__game.CUFFS=CUFFS;window.__game.POWER_CARDS=POWER_CARDS;window.__game.snapHeight=snapHeight;window.__game.SNP=SNP;window.__game.RSK=RSK;window.__game.FBV=FBV;window.__game.kitDoB=h=>kitDoB(h);window.__game.fbShear=()=>fbShear(FBV.units[0]);window.__game.reframerHitForTest=(k,p,pos)=>reframerHit(k,p,pos);window.__game.WTV=WTV;window.__game.wtHit=(k,p,pos)=>wtHit(k,p,pos);window.__game.hitLimb=hitLimb;window.__game.ep1Feed=ep1Feed;window.__game.SFX=SFX;window.__game.actx=()=>actx;window.__game.ep1Event=e=>ep1Event(e);window.__game.driveEnter=driveEnter;window.__game.driveExit=driveExit;window.__game.MWB=MWB;window.__game.mwBuild=mwBuild;window.__game.HELP=HELP;window.__game.toggleHelp=toggleHelp;window.__game.DRW=DRW;window.__game.CMB=CMB;window.__game.RFR=RFR;window.__game.comboFeed=comboFeed;window.__game.lamps=lamps;window.__game.cars=cars;window.__game.STORY_FIGHTS=STORY_FIGHTS;window.__game.hitFoe=hitFoe;window.__game.tumbleResult=tumbleResult;window.__game.setCamYaw=v=>{camYaw=v;};window.__game.setYaw=v=>{yaw=v;};window.__game.endCrewForTest=(c,w=false)=>endCrew(c,w);window.__game.skYard=()=>skYard;window.__game.ground=()=>onGround;window.__game.bootReport=()=>boot.getStatus();initMetalStory();
if(METAL_STORY_MOLD){
   import('./metal_story_mold_world.mjs').then(({mountMetalStoryMold})=>{
    metalStoryMold=mountMetalStoryMold({
     P,st,vel,skatepark:SPOTS.skate.c,safeStorage,
     storage:safeStorage,grounded:()=>onGround&&!st.wall&&!st.flying,
     legacyStory:()=>metalStoryChapter(metalStory)
    });
    window.__game.metalStoryMold=()=>metalStoryMold.snapshot();
   }).catch(err=>{console.warn('[METAL story mold]',err);window.__errors.push(String(err));});
  }
  if(MISSION05)initMission05();
  if(REFRAMER_SQUAD){
   // Reuse loaded original Kenney car GLBs, rooftop nests, combat and Gallium Draw.
   // No second player control loop, no automatic publish, no story-save mutation.
   reframerInit();
   Promise.all([import('./reframer_kit_v1.js'),import('./reframer_squad_world.mjs')]).then(([, {mountReframerSquad}])=>{
    // The complete original owner kit is present, checksumable, and tested by the bridge.
    // We reuse its rig and donor physics canon; do not step a competing 2D simulation.
    const kit=window.ReframerKit;
    if(!kit)throw Error('Owner ReFramer Kit v1 did not mount');
    reframerSquad=mountReframerSquad({
     THREE,scene,cars,player:P,vel,leaderNests:RFR.W.nests,
     leaderInfo:()=>{const e=RFR.W?.enc;
      return {stage:e?.stage??'idle',position:e?e.stage==='chase'?e.target:e.pos:null};},
     heldCar:()=>heldCar,gamepad:()=>RSK.gp,keys,pressed,colliders,
     onHurt:(damage,pos)=>metalHurt(damage,pos,HELP.on?'Coordinated ReFramer attack':null),
     onAlert:(message)=>whisper(message,''),
     onRescue:(car,saved)=>{
      if(car.userData.occupantExited)return;
      car.userData.occupantExited=true;car.userData.occupantCount=0;
      const civilian=makeChar(0xd6aa7d);
      civilian.o.position.copy(car.position).add(new THREE.Vector3(2.6,.3,0));
      scene.add(civilian.o);
      civilian.target=civilian.o.position.clone().add(new THREE.Vector3(9,0,9));
      civilian.speed=3.6;civilian.wait=0;civilian.role=saved?'rescued driver':'shaken driver';
      npcs.push(civilian);
     },
     drawScrap:DRW.scrap,isTouch,kit,
     qa:new URLSearchParams(location.search).get('reframer_squad_qa')==='1'
    });
    window.__game.reframerSquad=()=>reframerSquad.snapshot();
    window.__game.startReframerSighting=()=>reframerSquad.startSighting();
    window.__game.reframerKit=()=>({version:kit.DATA.meta.version,parts:kit.DATA.donor.parts.length,
     tested:reframerSquad.snapshot().kit?.passed,source:kit.DATA.meta.source});
    if(new URLSearchParams(location.search).get('reframer_squad_qa')==='1')
     window.__game.reframerSquadQA=Object.freeze({begin:()=>reframerSquad.qaStart(),advance:(n,dt)=>reframerSquad.qaAdvance(n,dt),attack:(id,kind)=>reframerSquad.qaAttack(id,kind)});
   }).catch(err=>{console.warn('[WIR ReFramer Squad]',err);window.__errors.push(String(err));});
  }
  if(METAL_POWER_LAB){
   import('./metal_power_lab_world.mjs').then(({mountMetalPowerLab})=>{
    // Shares actual Gallium, scene collision bounds and velocity.
    // Never replaces Metal movement, checkpoints or normal game startup.
    metalPowerLab=mountMetalPowerLab({THREE,scene,P,st,vel,colliders,camera,
     grounded:()=>onGround&&!st.wall&&!st.swing&&!st.flying,storage:safeStorage});
    window.__game.metalPowerLab=()=>metalPowerLab.snapshot();
    // Actual 73-entry wheel, action calls are delegated to real mission rules.
    import('./metal_power_wheel.mjs').then(({mountMetalPowerWheel})=>{
     metalPowerWheel=mountMetalPowerWheel({
      getLab:()=>metalPowerLab,
      onShortBack:()=>{pressed.KeyM=true;},storage:safeStorage
     });
     window.__game.metalPowerWheel=()=>metalPowerWheel.snapshot();
    }).catch(err=>{console.warn('[METAL power wheel]',err);window.__errors.push(String(err));});
   }).catch(e=>{console.warn('METAL ability lab unavailable',e);window.__errors.push(String(e));});
  }
  if(SLOTTA_BROWSER_QA)installSlottaBrowserQA();loop();await setForm(0);
 }catch(e){boot.failed(e);window.__errors.push(String(e));}})();
