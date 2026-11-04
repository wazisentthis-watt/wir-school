// Isolated test scene: not imported by WIR Connected production bootstrap.
// Original Mini Morrow GLB + texture are read from this lab's assets directory.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRider,createMission,stepRider,advanceMission,savedProgress,STAGES,
 SAVE_KEY,RENDEZVOUS} from './physics.mjs';
const $=id=>document.getElementById(id);
const DEBUG=new URLSearchParams(location.search).has('qa');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x17162f);
scene.fog=new THREE.Fog(0x17162f,24,90);
const camera=new THREE.PerspectiveCamera(62,1,.05,150);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
$('view').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xcdbbff,0x393357,2));
const sun=new THREE.DirectionalLight(0xffdeb4,3.4);sun.position.set(-11,18,9);scene.add(sun);
const grid=new THREE.GridHelper(100,50,0x645488,0x393454);grid.position.y=.012;scene.add(grid);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(110,110),
 new THREE.MeshStandardMaterial({color:0x29283c,roughness:.9,metalness:.02}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.025;scene.add(floor);
const rider=createRider();
let restored=null;try{restored=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
const mission=createMission(restored);
const loader=new GLTFLoader();
let ramp=null,metal=null,board=null,rampTexture=false,loaded=false;
const errors=[];
const raycaster=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
function surfaceAt(x,z){
 if(!ramp)return {height:0,ramp:false};
 raycaster.set(new THREE.Vector3(x,20,z),down);
 const hits=raycaster.intersectObject(ramp,true);
 for(const hit of hits){if(hit.point.y>=-.015 && hit.point.y<=8){
  return {height:Math.max(0,hit.point.y),ramp:true};
 }}
 return {height:0,ramp:false};
}
const material=new THREE.MeshStandardMaterial({color:0xb599ff,metalness:.35,roughness:.38});
const avatar=new THREE.Group();scene.add(avatar);
function updateErrors(){$('errors').textContent=errors.slice(-2).join(' | ');}
function debugFallback(reason){
 const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.37,.8,4,8),material);
 mesh.position.y=1;avatar.add(mesh);
 errors.push('Original METAL model unavailable; DEBUG silhouette only: '+reason);
 updateErrors();
}
function normalizeModel(obj,height){
 const bbox=new THREE.Box3().setFromObject(obj);
 const size=new THREE.Vector3();bbox.getSize(size);
 if(size.y>.0001){const k=height/size.y;obj.scale.multiplyScalar(k);}
 const b2=new THREE.Box3().setFromObject(obj);const c=new THREE.Vector3();
 b2.getCenter(c);obj.position.x-=c.x;obj.position.z-=c.z;obj.position.y-=b2.min.y;
 return obj;
}
const beacon=new THREE.Group();beacon.position.set(RENDEZVOUS.x,.03,RENDEZVOUS.z);scene.add(beacon);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.65,.08,10,70),
 new THREE.MeshBasicMaterial({color:0x9ef9df}));ring.rotation.x=Math.PI/2;beacon.add(ring);
const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,2.4,8),
 new THREE.MeshBasicMaterial({color:0x7ad9ff,transparent:true,opacity:.65}));
pole.position.y=1.2;beacon.add(pole);
const pointer=new THREE.Mesh(new THREE.OctahedronGeometry(.38),
 new THREE.MeshStandardMaterial({color:0x9ef9df,emissive:0x356e6e}));
pointer.position.y=2.45;beacon.add(pointer);
// This is a rendezvous marker, NOT a canonical Lil Heavy character asset.
function showStatus(){
 $('mission').textContent='Mission '+Math.min(4,mission.stage+1)+'/4 · '+STAGES[mission.stage];
 $('status').textContent='Speed '+(rider.speed*3.6).toFixed(1)+' km/h · '+
 (rider.grounded?(rider.onRamp?'ON THE REAL RAMP':'ON THE STREET'):'AIRBORNE')+
 ' · '+(mission.completed?'COMPLETE':'ACTIVE');
 $('saveStatus').textContent='Lab checkpoint: '+(mission.checkpoint||'fresh')+
 ' · production saves untouched';
}
function saveLab(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(savedProgress(mission)));}catch(e){
  errors.push('Lab-only checkpoint unavailable: '+e.message);updateErrors();
 }
}
$('reset').onclick=()=>{
 try{localStorage.removeItem(SAVE_KEY);}catch{}
 Object.assign(rider,createRider());Object.assign(mission,createMission());
 showStatus();
};
const keys=new Set(),buttons=new Set();
addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);
});addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();buttons.clear();});
for(const b of document.querySelectorAll('[data-key]')){
 const id=b.dataset.key;
 b.addEventListener('pointerdown',e=>{e.preventDefault();buttons.add(id);b.setPointerCapture(e.pointerId);});
 const off=e=>{e.preventDefault();buttons.delete(id);};
 b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);
 b.addEventListener('lostpointercapture',()=>buttons.delete(id));
}
let jumpHeld=false;
function inputFromDevices(){
 const gamepad=navigator.getGamepads?.()?.find(Boolean);
 const joy=gamepad?.axes||[];
 const kbSteer=(keys.has('KeyD')||keys.has('ArrowRight')||buttons.has('right')?1:0)-
 (keys.has('KeyA')||keys.has('ArrowLeft')||buttons.has('left')?1:0);
 let steer=Math.abs(joy[0]||0)>.14?joy[0]:kbSteer;
 let throttle=(keys.has('KeyW')||keys.has('ArrowUp')||buttons.has('forward')?1:0)-
 (keys.has('KeyS')||keys.has('ArrowDown')||buttons.has('brake')?1:0);
 if(Math.abs(joy[1]||0)>.19)throttle=-joy[1];
 if(gamepad?.buttons?.[7]?.pressed&&throttle<.1)throttle=gamepad.buttons[7].value;
 const wantsJump=keys.has('Space')||buttons.has('jump')||!!gamepad?.buttons?.[0]?.pressed;
 const jump=wantsJump&&!jumpHeld;jumpHeld=wantsJump;
 return {throttle,steer,jump,pump:keys.has('ShiftLeft')||keys.has('ShiftRight')||
 buttons.has('pump')||!!gamepad?.buttons?.[4]?.pressed};
}
function tick(input,dt){
 if(!loaded)return null;
 const event=stepRider(rider,input,dt,surfaceAt);
 if(advanceMission(mission,rider,event))saveLab();
 avatar.position.set(rider.x,rider.y,rider.z);
 avatar.rotation.y=rider.heading;
 avatar.rotation.z=input.steer*.08;
 // Visual movement feedback comes from position, turning and board tilt;
 // original animation retargeting is a later, separate milestone.
 if(board)board.rotation.z=-input.steer*.14;
 return event;
}
function render(){
 requestAnimationFrame(render);
 const now=performance.now(),dt=Math.min((now-render.last)/1000,1/30);
 render.last=now;
 const input=inputFromDevices();tick(input,dt);
 beacon.rotation.y+=dt*.6;pointer.position.y=2.45+Math.sin(now*.002)*.18;
 const desired=new THREE.Vector3(rider.x-6*Math.sin(rider.heading),rider.y+5.6,
 rider.z+10*Math.cos(rider.heading));
 camera.position.lerp(desired,.045);camera.lookAt(rider.x,rider.y+1,rider.z);
 showStatus();renderer.render(scene,camera);
}
render.last=performance.now();
function resize(){
 const w=innerWidth,h=innerHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
 renderer.setSize(w,h);
}
addEventListener('resize',resize);resize();
Promise.all([
 new Promise(resolve=>loader.load('./assets/ramp.glb',g=>{
  ramp=g.scene;ramp.scale.setScalar(8);
  ramp.traverse(obj=>{if(obj.isMesh){
    obj.castShadow=true;obj.receiveShadow=true;
    if(obj.material?.map){rampTexture=true;obj.material.map.colorSpace=THREE.SRGBColorSpace;}
  }});
  scene.add(ramp);resolve(true);
 },undefined,e=>{errors.push('Recovered ramp GLB could not load: '+(e.message||e));updateErrors();resolve(false);})),
 new Promise(resolve=>loader.load('../../assets/models/metal/metal_phase6_fight.glb',g=>{
  const obj=normalizeModel(g.scene,1.9);avatar.add(obj);metal=obj;resolve(true);
 },undefined,e=>{debugFallback(e.message||e);resolve(false);})),
 new Promise(resolve=>loader.load('../../assets/models/metal/metal_skateboard_4wheel_PLACEHOLDER.glb',g=>{
  board=normalizeModel(g.scene,.22);
  board.position.y=.045;avatar.add(board);resolve(true);
 },undefined,e=>{errors.push('Board model missing: '+(e.message||e));updateErrors();resolve(false);}))
]).then(([actualRamp])=>{
 if(!actualRamp){$('modelStatus').textContent='BLOCKED: original ramp missing. No substitute scene mesh.';return;}
 loaded=true;
 $('modelStatus').textContent='Original v18 ramp '+(rampTexture?'TEXTURED':'texture pending')+
 ' · WIR METAL '+(metal?'MODEL':'debug fallback')+
 ' · board '+(board?'MODEL':'unavailable');
 showStatus();
}).catch(e=>{errors.push('Lab initialization: '+e.message);updateErrors();});
render();
window.__motionLab={
 snapshot:()=>({ready:loaded,rampLoaded:!!ramp,textureLoaded:rampTexture,metalLoaded:!!metal,
  boardLoaded:!!board,mission:{...mission},rider:{...rider},
  errors:[...errors],canvas:!!renderer.domElement}),
 ...(DEBUG?{qaDrive(frames,input){
  for(let i=0;i<Math.min(1000,frames);i++)tick({...input,jump:i===0&&!!input.jump},1/60);
  return this.snapshot();
 }}:{})
};
