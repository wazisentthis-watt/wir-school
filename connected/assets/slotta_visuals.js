// SLOTTA Asset Pack v1: original, modular low-poly boss geometry for WIR Connected.
// STATUS: PROPOSAL visual design. PHATOM = 3 active ports + 5 storage bays.
// Static GLBs and transparent FX sprite sheets are provided in the separate pack ZIP.
// This runtime model is jointed with Object3D pivots, NOT a skinned skeletal GLB.
import * as THREE from 'three';

const PALETTE=Object.freeze({coat:0x221b37,armor:0x353c4f,gun:0x151b29,
 skin:0x80523e,purple:0x9b5cff,purpleDim:0x51267b,cyan:0x48d6ef,
 orange:0xf37e39,silver:0xb4c2d0,gold:0xdab361});
const materials=()=>{
 const mat=(color,{metalness=.42,roughness=.48,emissive=0,emissiveIntensity=0}={})=>
  new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
 return {coat:mat(PALETTE.coat,{roughness:.83}),armor:mat(PALETTE.armor,{metalness:.8}),
  gun:mat(PALETTE.gun,{metalness:.82}),skin:mat(PALETTE.skin,{roughness:.82}),
  purple:mat(PALETTE.purple,{metalness:.45,emissive:PALETTE.purple,emissiveIntensity:.52}),
  purpleDim:mat(PALETTE.purpleDim,{metalness:.52,emissiveIntensity:.15,emissive:PALETTE.purple}),
  cyan:mat(PALETTE.cyan,{metalness:.33,emissive:PALETTE.cyan,emissiveIntensity:.64}),
  orange:mat(PALETTE.orange,{metalness:.46,emissive:PALETTE.orange,emissiveIntensity:.47}),
  silver:mat(PALETTE.silver,{metalness:.86}),gold:mat(PALETTE.gold,{metalness:.76})};
};
function add(parent,name,geo,material,x=0,y=0,z=0){
 const mesh=new THREE.Mesh(geo,material);mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const box=(p,n,w,h,d,m,x=0,y=0,z=0)=>add(p,n,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const sphere=(p,n,r,m,x=0,y=0,z=0)=>add(p,n,new THREE.SphereGeometry(r,10,8),m,x,y,z);
function tube(parent,name,points,r,material){
 const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x,y,z)));
 return add(parent,name,new THREE.TubeGeometry(curve,12,r,5,false),material);
}
function backpack(parent,m){
 const pack=new THREE.Group();pack.name='PHATOM_BACK';pack.position.set(0,1.60,-.38);parent.add(pack);
 box(pack,'PHATOM_housing',1.01,1.06,.31,m.gun,0,0,-.13);
 box(pack,'PHATOM_service_plate',.87,.93,.07,m.armor,0,0,-.31);
 box(pack,'PHATOM_orange_retrieval_port',.46,.085,.06,m.orange,0,-.39,-.369);
 // Active triple-slot row, independent from the FIVE stored cartridges.
 const active=[],stored=[];
 for(let i=0;i<3;i++){
  const p=box(pack,'PHATOM_active_'+(i+1),.21,.22,.075,m.purple,(i-1)*.278,.28,-.37);
  box(p,'active_light',.07,.11,.012,m.cyan,0,0,-.047);active.push(p);
 }
 for(let i=0;i<5;i++)stored.push(box(pack,'PHATOM_storage_'+(i+1),.13,.18,.07,
  i<2?m.cyan:m.purpleDim,(i-2)*.169,-.12,-.374));
 for(const x of [-.37,.37])tube(parent,'PHATOM_load_strap_'+x,
  [[x*.8,2.04,-.19],[x,1.73,-.12],[x*.9,1.18,-.18]],.052,m.gold);
 pack.userData={active,stored};
 return pack;
}
export function createSlottaBossAsset(){
 const m=materials(),root=new THREE.Group();root.name='SLOTTA';
 root.userData.slottaAssetVersion='1.0.0';
 // Feet at Y=0, chest at ~1.4, head top ~2.45.
 const body=new THREE.Group();body.name='torso_pivot';root.add(body);
 box(body,'long_coat',.84,1.02,.47,m.coat,0,1.42,-.05);
 box(body,'breastplate',.71,.49,.14,m.armor,0,1.64,.232);
 box(body,'retrieval_chest_lock',.32,.21,.077,m.orange,0,1.58,.338);
 box(body,'hip_belt',.83,.13,.5,m.gun,0,.99,.025);
 const coatTails=[];
 for(const side of [-1,1])coatTails.push(box(body,'coat_tail_'+side,.3,.66,.18,m.coat,
  side*.31,.61,-.17));
 const neck=box(body,'neck',.18,.16,.18,m.skin,0,2.04,.01);
 const head=new THREE.Group();head.name='head_pivot';head.position.y=2.13;body.add(head);
 const skull=sphere(head,'face',.265,m.skin,0,.035,.034);skull.scale.set(.82,1,.91);
 const visor=box(head,'signal_visor',.42,.083,.08,m.purple,0,.09,.248);
 box(head,'jaw_plate',.28,.09,.11,m.gun,0,-.16,.18);
 const locs=[];
 for(let i=0;i<9;i++){
  const x=(i-4)*.049;
  locs.push(tube(head,'circuit_loc_'+(i+1),[[x,.28,-.04],[x+Math.sin(i*2)*.022,.14,-.08],
   [x+.03*Math.cos(i),-.10-.06*(i%3),-.14]],.032,i%3===0?m.purpleDim:m.gun));
 }
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.name='arm_joint_'+side;
  shoulder.position.set(side*.56,1.79,0);body.add(shoulder);
  box(shoulder,'armored_sleeve_'+side,.245,.65,.3,m.armor,0,-.32,0);
  box(shoulder,'glove_'+side,.205,.21,.22,m.skin,side*.02,-.69,.045);
  box(shoulder,'signal_wrist_'+side,.24,.083,.25,side>0?m.cyan:m.orange,0,-.59,.05);
  arms.push(shoulder);
  const hip=new THREE.Group();hip.name='leg_joint_'+side;hip.position.set(side*.235,.98,0);root.add(hip);
  box(hip,'trouser_leg_'+side,.285,.78,.3,m.gun,0,-.42,0);
  box(hip,'boot_'+side,.34,.24,.45,m.armor,0,-.84,.085);
  legs.push(hip);
 }
 const pack=backpack(body,m);
 root.userData.slottaRig={body,head,arms,legs,coatTails,pack,locs,clock:0};
 return root;
}
export function animateSlottaBossAsset(root,dt,mode='idle'){
 const rig=root?.userData?.slottaRig;if(!rig)return;
 rig.clock+=Math.max(0,Math.min(Number(dt)||0,.05));
 const t=rig.clock,walk=mode==='walking'?1:.5;
 rig.body.rotation.z=Math.sin(t*1.1)*.035;
 rig.head.rotation.y=Math.sin(t*.77)*.19;
 rig.arms[0].rotation.x=Math.sin(t*3.5)*.19*walk-.11;
 rig.arms[1].rotation.x=-Math.sin(t*3.5)*.19*walk+.14;
 rig.legs[0].rotation.x=Math.sin(t*3.5)*.20*walk;
 rig.legs[1].rotation.x=-Math.sin(t*3.5)*.20*walk;
 rig.coatTails.forEach((p,i)=>{p.rotation.x=Math.sin(t*2.2+i*2)*.06;});
 rig.pack.rotation.z=Math.sin(t*1.6)*.024;
}
export function createSlottaMinionAsset(kind){
 const m=materials(),root=new THREE.Group();root.name=kind==='serpent'?'Circuit Serpent':'Cyborg Clone';
 const parts=[];
 if(kind==='serpent'){
  for(let i=0;i<8;i++){
   const part=sphere(root,'serpent_link_'+i,i===7?.17:.13,i%3===0?m.cyan:m.purple);
   part.scale.set(.94,.77,1.14);parts.push(part);
  }
  sphere(root,'serpent_eye_L',.045,m.orange,-.065,.09,.14);
  sphere(root,'serpent_eye_R',.045,m.orange,.065,.09,.14);
 }else{
  box(root,'clone_torso',.55,.7,.3,m.armor,0,1.16,0);
  sphere(root,'clone_head',.21,m.silver,0,1.72,0);
  box(root,'clone_visor',.33,.07,.04,m.cyan,0,1.72,.21);
  for(const side of [-1,1]){
   box(root,'clone_arm_'+side,.16,.57,.18,m.gun,side*.39,1.13,0);
   box(root,'clone_leg_'+side,.22,.72,.25,m.gun,side*.17,.43,0);
  }
 }
 root.userData.slottaMinionRig={kind,parts};
 return root;
}
export function animateSlottaMinionAsset(root,phase){
 const rig=root?.userData?.slottaMinionRig;if(!rig)return;
 if(rig.kind==='serpent'){
  rig.parts.forEach((p,i)=>{const a=i/Math.max(1,rig.parts.length-1);
   p.position.set(Math.sin(phase*1.6-a*7)*.22,.2+a*.85,Math.cos(phase*1.3-a*7)*.2);
   p.scale.setScalar(.82+Math.sin(phase*2+a*5)*.06);
  });
 }else{root.rotation.z=Math.sin(phase*.7)*.05;}
}
