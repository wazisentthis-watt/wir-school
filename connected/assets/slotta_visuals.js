// SLOTTA Asset Pack v1: original, modular low-poly boss geometry for WIR Connected.
// STATUS: PROPOSAL visual design. PHATOM = 3 active ports + 5 storage bays.
// Static GLBs and transparent FX sprite sheets are provided in the separate pack ZIP.
// This runtime model is jointed with Object3D pivots, NOT a skinned skeletal GLB.
import * as THREE from 'three';
import {applySlottaPose,slottaPoseName} from './slotta_pose.js';

const PALETTE=Object.freeze({coat:0x365778,armor:0x365778,gun:0x26394f,
 hoodie:0x9c2632,boots:0xad8553,hair:0x16151b,
 skin:0x80523e,purple:0x9b5cff,purpleDim:0x51267b,cyan:0x48d6ef,
 orange:0xf37e39,silver:0xb4c2d0,gold:0xdab361});
const materials=()=>{
 const mat=(color,{metalness=.42,roughness=.48,emissive=0,emissiveIntensity=0}={})=>
  new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
 return {coat:mat(PALETTE.coat,{roughness:.89}),armor:mat(PALETTE.armor,{metalness:.46}),
  hoodie:mat(PALETTE.hoodie,{roughness:.91}),boots:mat(PALETTE.boots,{roughness:.84}),hair:mat(PALETTE.hair,{roughness:.96}),
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
 box(body,'red_hoodie',.79,.99,.44,m.hoodie,0,1.42,-.04);
 box(body,'denim_back_panel',.77,.94,.10,m.coat,0,1.42,-.31);
 for(const side of [-1,1])box(body,'denim_jacket_front_'+side,.17,.87,.10,m.coat,side*.32,1.46,.215);
 box(body,'red_hoodie_chest',.36,.48,.13,m.hoodie,0,1.65,.238);
 box(body,'hoodie_front_pocket',.38,.15,.04,m.hoodie,0,1.18,.233);
 box(body,'hip_belt',.83,.13,.5,m.gun,0,.99,.025);
 const coatTails=[];
 for(const side of [-1,1])coatTails.push(box(body,'coat_tail_'+side,.3,.66,.18,m.coat,
  side*.31,.61,-.17));
 const neck=box(body,'neck',.18,.16,.18,m.skin,0,2.04,.01);
 const head=new THREE.Group();head.name='head_pivot';head.position.y=2.13;body.add(head);
 const skull=sphere(head,'face',.265,m.skin,0,.035,.034);skull.scale.set(.82,1,.91);
 const visor=box(head,'eyes_and_brow',.36,.045,.045,m.gun,0,.07,.249);
 box(head,'mouth',.22,.025,.03,m.gun,0,-.135,.259);
 // High-top fade blockout, matching the latest owner reference sheet.
 const locs=[];const fade=box(head,'high_top_fade',.39,.25,.35,m.hair,0,.28,-.015);
 box(head,'fade_left_temple',.08,.08,.25,m.hair,-.18,.18,.015);
 box(head,'fade_right_temple',.08,.08,.25,m.hair,.18,.18,.015);
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
  box(hip,'tan_work_boot_'+side,.34,.24,.45,m.boots,0,-.84,.085);
  legs.push(hip);
 }
 const pack=backpack(body,m);
 const socket=(parent,name,x,y,z)=>{const n=new THREE.Object3D();n.name=name;n.position.set(x,y,z);parent.add(n);return n;};
 const sockets={
  leftHand:socket(arms[0],'SLOTTA_LEFT_HAND',0,-.75,.10),
  rightHand:socket(arms[1],'SLOTTA_RIGHT_HAND',0,-.75,.10),
  phatomRoot:socket(pack,'PHATOM_socket',0,0,-.32),
  serpentSpawn:socket(arms[1],'SLOTTA_SERPENT_SPAWN',0,-.75,.25),
  cloneSpawn:socket(root,'SLOTTA_CLONE_SPAWN',0,.10,-.65),
  dashTrail:socket(root,'SLOTTA_DASH_TRAIL',0,.92,-.35)
 };
 root.userData.slottaRig={body,head,arms,legs,coatTails,pack,locs,sockets,clock:0,selectedSlot:0};
 return root;
}
export function animateSlottaBossAsset(root,dt,mode='idle'){
 const rig=root?.userData?.slottaRig;if(!rig)return;
 rig.clock+=Math.max(0,Math.min(Number(dt)||0,.05));
 const state=slottaPoseName(mode),t=rig.clock,walk=state==='walking'?1:.5;
 rig.body.rotation.z=Math.sin(t*1.1)*.035;
 rig.head.rotation.y=Math.sin(t*.77)*.19;
 rig.arms[0].rotation.x=Math.sin(t*3.5)*.19*walk-.11;
 rig.arms[1].rotation.x=-Math.sin(t*3.5)*.19*walk+.14;
 rig.legs[0].rotation.x=Math.sin(t*3.5)*.20*walk;
 rig.legs[1].rotation.x=-Math.sin(t*3.5)*.20*walk;
 rig.coatTails.forEach((p,i)=>{p.rotation.x=Math.sin(t*2.2+i*2)*.06;});
 rig.pack.rotation.z=Math.sin(t*1.6)*.024;
 applySlottaPose(rig,typeof mode==='string'?{state,progress:0}:mode);
}
// Minions have independent combat poses. No external rig or imported textures required.
export function createSlottaMinionAsset(kind){
 const m=materials(),root=new THREE.Group();root.name=kind==='serpent'?'Circuit Serpent':'Cyborg Clone';
 const rig={kind,parts:[],arms:[],legs:[],head:null,torso:null,clock:0};
 if(kind==='serpent'){
  // Nine articulated segments make a long, readable arcade serpent silhouette.
  for(let i=0;i<9;i++){
   const r=Math.max(.075,.235-i*.019);
   const body=sphere(root,'serpent_link_'+i,r,i%3===0?m.cyan:m.purple);
   body.scale.set(1,.83,1.13);rig.parts.push(body);
  }
  const head=rig.parts[0];rig.head=head;head.scale.set(1.13,.95,1.32);
  sphere(head,'serpent_eye_L',.043,m.orange,-.105,.09,.12);
  sphere(head,'serpent_eye_R',.043,m.orange,.105,.09,.12);
  const fangL=add(head,'serpent_fang_L',new THREE.ConeGeometry(.034,.14,5),m.silver,-.11,-.12,.17);
  const fangR=add(head,'serpent_fang_R',new THREE.ConeGeometry(.034,.14,5),m.silver,.11,-.12,.17);
  fangL.rotation.x=fangR.rotation.x=Math.PI;
  rig.tongue=box(head,'serpent_circuit_tongue',.025,.018,.18,m.orange,0,-.06,.26);
 }else{
  rig.torso=new THREE.Group();rig.torso.name='clone_chest_joint';root.add(rig.torso);
  box(rig.torso,'clone_torso',.56,.72,.33,m.armor,0,1.16,0);
  box(rig.torso,'clone_core',.18,.17,.055,m.orange,0,1.20,.19);
  const head=new THREE.Group();head.name='clone_head_joint';head.position.set(0,1.71,0);rig.torso.add(head);rig.head=head;
  sphere(head,'clone_skull',.22,m.silver);
  box(head,'clone_visor',.35,.074,.06,m.cyan,0,.03,.205);
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.name='clone_arm_joint_'+side;
   arm.position.set(side*.39,1.41,0);rig.torso.add(arm);
   box(arm,'clone_upper_arm_'+side,.185,.52,.19,m.gun,0,-.24,0);
   box(arm,'clone_gauntlet_'+side,.20,.17,.21,m.purple,0,-.54,.035);
   rig.arms.push(arm);
   const leg=new THREE.Group();leg.name='clone_leg_joint_'+side;
   leg.position.set(side*.18,.83,0);root.add(leg);
   box(leg,'clone_pants_'+side,.23,.67,.25,m.gun,0,-.34,0);
   box(leg,'clone_boot_'+side,.24,.20,.39,m.armor,0,-.73,.07);
   rig.legs.push(leg);
  }
 }
 root.userData.slottaMinionRig=rig;
 return root;
}
export function animateSlottaMinionAsset(root,phase,stage='approach',side=1){
 const rig=root?.userData?.slottaMinionRig;if(!rig)return;
 const t=Number.isFinite(phase)?phase:0,flank=stage==='orbit',lunge=stage==='lunge';
 if(rig.kind==='serpent'){
  const stiffness=lunge?.29:flank?.23:.17,headZ=lunge?.15:.44;
  rig.parts.forEach((p,i)=>{
   const a=i/Math.max(1,rig.parts.length-1);
   p.position.set(Math.sin(t*1.36-i*.81)*stiffness*(.4+a),
    .29+Math.sin(t*1.55-i*.52)*.11+(lunge?Math.sin(a*Math.PI)*.19:0),
    headZ-i*.18);
   p.rotation.y=Math.cos(t*1.36-i*.72)*.30;
   const taper=i===0?1:Math.max(.42,1-a*.65);
   p.scale.set((i===0?1.13:1)*taper,(i===0?.95:.83)*taper,(i===0?1.32:1.13)*taper);
  });
  rig.tongue.scale.z=lunge?1.9:flank?1.3:.8;
  root.rotation.z=flank?Math.sin(t*1.1)*.10:0;
 }else{
  const run=lunge?1.8:flank?1.1:.85;
  rig.arms[0].rotation.x=Math.sin(t*1.4)*.68*run;
  rig.arms[1].rotation.x=-Math.sin(t*1.4)*.68*run;
  rig.arms[0].rotation.z=flank?-.34:0;rig.arms[1].rotation.z=flank?.34:0;
  rig.legs[0].rotation.x=Math.sin(t*1.4)*.65*run;
  rig.legs[1].rotation.x=-Math.sin(t*1.4)*.65*run;
  rig.torso.rotation.x=lunge?.33:stage==='recover'?-.15:0;
  rig.head.rotation.y=flank?side*.32:Math.sin(t*.29)*.11;
  root.rotation.z=flank?side*.09:0;
  root.scale.setScalar(stage==='spawn'?Math.max(.45,Math.min(1,.45+t*.14)):1);
 }
}
