import * as THREE from '../../connected/assets/lib/three.module.min.js';
// WIR School 3D campus module (map + AR only). Class/login/grades are owned by Domawaye's system.
const $=s=>document.querySelector(s);const Q=new URLSearchParams(location.search);const FOLLOW=Q.get('follow')!=='0';
// ---------- 3D campus
const renderer=new THREE.WebGLRenderer({canvas:$('#c'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.xr.enabled=true;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x87b8e8);const cam=new THREE.PerspectiveCamera(65,1,0.05,300);
scene.add(new THREE.HemisphereLight(0xffffff,0x445533,1.1));const sun=new THREE.DirectionalLight(0xffffff,1.2);sun.position.set(10,20,8);scene.add(sun);
const campus=new THREE.Group();scene.add(campus);
const M=c=>new THREE.MeshStandardMaterial({color:c});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,90),M(0x4f8a3c));ground.rotation.x=-Math.PI/2;campus.add(ground);
const path=new THREE.Mesh(new THREE.PlaneGeometry(4,50),M(0xb9a27a));path.rotation.x=-Math.PI/2;path.position.y=.01;campus.add(path);
const path2=path.clone();path2.rotation.z=Math.PI/2;campus.add(path2);
function label(t,col){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const x=cv.getContext('2d');x.fillStyle='#000c';x.fillRect(0,0,512,128);x.fillStyle=col;let fs=54;do{x.font='bold '+fs+'px sans-serif';fs-=2}while(x.measureText(t).width>490&&fs>14);x.textAlign='center';x.fillText(t,256,82);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv)}));s.scale.set(6,1.5,1);return s}
const doors=[];const DOORS=[];const SLOTS=[[-14,-10],[14,-10],[-14,12],[14,12],[-14,34],[14,34],[-30,0],[30,0]];
function addBuilding(c){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(9,5,7),M(c.color));b.position.y=2.5;g.add(b);
 const r=new THREE.Mesh(new THREE.ConeGeometry(6.5,2.5,4),M(0x333344));r.position.y=6.2;r.rotation.y=Math.PI/4;g.add(r);
 const dz=c.pos[1]<0?3.51:-3.51;const d=new THREE.Mesh(new THREE.BoxGeometry(1.8,3,.1),M(0x2a1a0a));d.position.set(0,1.5,dz);g.add(d);
 const l=label(c.name,'#fff');l.position.y=8.4;g.add(l);g.position.set(c.pos[0],0,c.pos[1]);campus.add(g);
 doors.push({c,x:c.pos[0],z:c.pos[1]+dz*1.3})}

const hall=label('WIR School — Main Yard','#fd5');hall.position.set(0,4,0);campus.add(hall);
// tiny trees
for(let i=0;i<24;i++){const a=i/24*Math.PI*2,R=28+(i%3);const t=new THREE.Mesh(new THREE.ConeGeometry(1.2,3.5,6),M(0x2d6a2d));t.position.set(Math.cos(a)*R,1.75,Math.sin(a)*R);campus.add(t)}
const player={x:0,z:22,yaw:Math.PI};const keys={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key.toLowerCase()==='e')tryEnter()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
document.querySelectorAll('#pad button').forEach(b=>{const k=b.dataset.k;const on=e=>{e.preventDefault();if(k==='e')tryEnter();else keys['pad'+k]=1},off=()=>keys['pad'+k]=0;
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off)});
let near=null;function tryEnter(){if(!near)return;const ev=new CustomEvent('wir-campus-door',{detail:{id:near.c.id,url:near.c.url,name:near.c.name,building:near.c.building},cancelable:true});
 if(window.dispatchEvent(ev)&&near.c.url&&FOLLOW)location.href=near.c.url}
function resize(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener('resize',resize);resize();
let last=performance.now();
renderer.setAnimationLoop(t=>{const dt=Math.min(.05,(t-last)/1000);last=t;
 if(!renderer.xr.isPresenting){const busy=false;const f=(keys.w||keys.arrowup||keys.padf?1:0)-(keys.s||keys.arrowdown||keys.padb?1:0),tr=(keys.a||keys.arrowleft||keys.padl?1:0)-(keys.d||keys.arrowright||keys.padr?1:0);
  if(!busy){player.yaw+=tr*2.2*dt;let nx=player.x+Math.sin(player.yaw)*f*7*dt,nz=player.z+Math.cos(player.yaw)*f*7*dt;
   const hit=DOORS.some(c=>Math.abs(nx-c.pos[0])<5&&Math.abs(nz-c.pos[1])<4);if(!hit&&Math.abs(nx)<34&&Math.abs(nz)<40){player.x=nx;player.z=nz}}
  cam.position.set(player.x,1.7,player.z);cam.lookAt(player.x+Math.sin(player.yaw),1.6,player.z+Math.cos(player.yaw));
  near=doors.find(d=>Math.hypot(d.x-player.x,d.z-player.z)<3.2)||null;const p=$('#prompt');if(near){p.style.display='block';p.textContent=`${near.c.name} — press E / Enter`}else p.style.display='none'}
 renderer.render(scene,cam)});
// ---------- AR
$('#bAR').onclick=async()=>{const ok=navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar').catch(()=>false);
 if(!ok){alert('AR mode needs a phone/browser with WebXR AR (e.g. Chrome on Android with ARCore). Not supported here — the 3D campus still works.');return}
 const s=await navigator.xr.requestSession('immersive-ar',{optionalFeatures:['local-floor']});
 scene.background=null;ground.visible=false;campus.scale.setScalar(.02);campus.position.set(0,-.4,-1.2);renderer.xr.setReferenceSpaceType('local');await renderer.xr.setSession(s);
 s.addEventListener('end',()=>{scene.background=new THREE.Color(0x87b8e8);ground.visible=true;campus.scale.setScalar(1);campus.position.set(0,0,0)})};
const COLORS=[0x2fa36b,0x3d7bff,0xe0a030,0x9a4cff,0xd04a6a,0x2ab0b8,0x8a7a3a,0x5a6a9a];
window.campus={registerDoor({id,name,url='',building,placeholder=false,color}){if(!id||DOORS.find(d=>d.id===id))return false;const pos=SLOTS[DOORS.length];if(!pos)return false;
 const c={id,name:name||id,url,building:building||name||id,ph:placeholder,color:color??COLORS[DOORS.length%8],pos};DOORS.push(c);addBuilding(c);return true},
 goTo(id){const d=doors.find(x=>x.c.id===id);if(!d)return false;player.x=d.x;player.z=d.z;player.yaw=d.z>d.c.pos[1]?Math.PI:0;return true},
 doors:()=>DOORS.map(({id,name,url,building})=>({id,name,url,building})),};
// Example doors only so the map isn't empty (PLACEHOLDER; replace via campus.registerDoor). Skip with ?empty=1
if(Q.get('empty')!=='1'){[['science','Science (PLACEHOLDER)'],['math','Math (PLACEHOLDER)'],['reading','Reading (PLACEHOLDER)'],['wir-lore','WIR Lore (PLACEHOLDER — not canon)']].forEach(([id,name])=>window.campus.registerDoor({id,name,placeholder:true}))}
Q.getAll('door').forEach(r=>{const[id,name,url]=r.split("|");window.campus.registerDoor({id,name,url})});
window.dispatchEvent(new Event('wir-campus-ready'));
