// Procedural Forge V1, cosmetic environmental particles plus original GLB handoff.
// Character animation plays through the host's EXISTING rig mixer, never a second mixer.
import * as THREE from 'three';
import {galliumLiquidMat} from './gallium_limb.js';
import {ForgeState,FORGE_COST,FORGE_REFUND} from './metal_forge_state.mjs';
import {partFormation} from './metal_forge_choreography.mjs';
export {FORGE_COST,FORGE_REFUND};
const clamp=x=>Math.max(0,Math.min(1,x));
export class MetalForgeController{
 constructor({character,board,scene,onPhase=()=>{}}){
  if(!character||!board?.isGroup||!scene)throw Error('Require real METAL root, Group-wrapped original board GLB, scene');
  this.character=character;this.board=board;this.scene=scene;this.onPhase=onPhase;
  this.state=new ForgeState();this.previous='IDLE';this.origin=new THREE.Vector3();this.floor=0;
  this.preview=new THREE.Group();this.preview.visible=false;scene.add(this.preview);this.parts=[];
  const alloy=galliumLiquidMat({transmission:0,transparent:false,opacity:1,roughness:.16,color:0x777985});
  const tan=new THREE.MeshStandardMaterial({color:0xc9a979,metalness:.5,roughness:.4});
  const deck=new THREE.Mesh(new THREE.BoxGeometry(.30,.05,.96),alloy);deck.position.y=.12;deck.name='ForgeDeck';this.preview.add(deck);
  this.parts.push({kind:'deck',mesh:deck,rest:deck.position.clone(),away:new THREE.Vector3(0,.55,.3)});
  for(const z of [-.32,.32]){
   const axle=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.32,9),alloy);
   axle.rotation.z=Math.PI/2;axle.position.set(0,.08,z);axle.name='ForgeTruck';this.preview.add(axle);
   this.parts.push({kind:'truck',mesh:axle,rest:axle.position.clone(),away:new THREE.Vector3(z*1.5,.55,z*1.6)});
   for(const x of [-.15,.15]){
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.05,12),tan);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.065,z);wheel.name='ForgeWheel';this.preview.add(wheel);
    this.parts.push({kind:'wheel',mesh:wheel,rest:wheel.position.clone(),away:new THREE.Vector3(x*3.5,.6,z*1.8)});
   }
  }
  const pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(96*3),3));
  this.dust=new THREE.Points(pg,new THREE.PointsMaterial({size:.066,color:0xbca2ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  this.dust.visible=false;this.dust.frustumCulled=false;scene.add(this.dust);
  const sg=new THREE.TetrahedronGeometry(.085),sm=new THREE.MeshStandardMaterial({color:0x626875,metalness:.8,roughness:.32});
  this.shards=new THREE.InstancedMesh(sg,sm,16);this.shards.visible=false;this.shards.frustumCulled=false;scene.add(this.shards);
  this._dummy=new THREE.Object3D();this.board.visible=false;
 }
 get busy(){return this.state.busy;}
 snapshot(){return {phase:this.state.phase,elapsed:this.state.elapsed,
  deck:partFormation('deck',this.state.elapsed,this.state.phase==='DISSOLVING'),
  truck:partFormation('truck',this.state.elapsed,this.state.phase==='DISSOLVING'),
  wheel:partFormation('wheel',this.state.elapsed,this.state.phase==='DISSOLVING'),
  wheels:this.parts.filter(p=>p.kind==='wheel').length,originalBoardVisible:this.board.visible};}
 begin(checks,point,floor){
  if(!this.state.begin(checks))return false;
  this.origin.copy(point);this.floor=floor;this.preview.visible=true;this.dust.visible=true;this.shards.visible=true;this.board.visible=false;
  this.previous='DETECTING';this.onPhase('DETECTING');return true;
 }
 dissolve(){
  if(!this.state.dissolve())return false;
  this.origin.copy(this.character.position);this.board.visible=false;
  this.preview.visible=true;this.dust.visible=true;this.shards.visible=true;this.previous='DISSOLVING';this.onPhase('DISSOLVING');return true;
 }
 update(dt,point,floor){
  const before=this.state.phase,phase=this.state.tick(dt);
  if(phase!==this.previous){this.previous=phase;this.onPhase(phase);}
  if(phase==='IDLE'){this.preview.visible=false;this.dust.visible=false;this.shards.visible=false;return false;}
  if(phase==='SKATING'){
   this.preview.visible=false;this.dust.visible=false;this.shards.visible=false;
   if(before!=='SKATING'){this.board.visible=true;return true;}return false;
  }
  if(point)this.origin.copy(point);if(Number.isFinite(floor))this.floor=floor;
  const out=phase==='DISSOLVING',t=this.state.elapsed,progress=clamp((t-1.50)/1.10);
  this.preview.visible=out||phase==='COMPRESSION'||phase==='ACTIVATED'||phase==='MOUNTING';
  this.preview.position.set(this.origin.x,this.floor+.14+(out?0:1.1*(1-progress)),this.origin.z+.4*(1-progress));
  this.preview.quaternion.copy(this.character.quaternion);
  this.preview.scale.setScalar(1.15);
  // Seven mechanically separate pieces, built in order; not one instantly-scaled board.
  for(const p of this.parts){
   const k=partFormation(p.kind,t,out);p.mesh.visible=k>.001;
   p.mesh.scale.setScalar(Math.max(.001,k));
   p.mesh.position.copy(p.rest).addScaledVector(p.away,1-k);
  }
  this.dust.material.opacity=out?clamp(1-t/.55)*.8:Math.min(.85,Math.max(0,t-.25)*.8);
  this.dust.visible=this.dust.material.opacity>.01;
  const attr=this.dust.geometry.attributes.position;
  const p=out?1-clamp(t/.55):clamp(t/2.65);
  for(let i=0;i<96;i++){
   const a=i*2.399963,r=.45+(i%11)*.11,orbit=.15+.13*Math.sin(i*1.31);
   const sx=this.origin.x+Math.cos(a)*r,sz=this.origin.z+Math.sin(a)*r;
   attr.setXYZ(i,sx*(1-p)+(this.origin.x+Math.cos(a+t*3)*orbit)*p,
    this.floor+.02+(p*.2)+Math.sin(a+t*11)*.09*p,
    sz*(1-p)+(this.origin.z+.25+Math.sin(a+t*3)*orbit)*p);
  }attr.needsUpdate=true;
  this.shards.visible=this.dust.visible;
  if(this.shards.visible){
   const dummy=this._dummy;
   for(let i=0;i<16;i++){
    const a=i*Math.PI*2/16,r=.55+(i%4)*.32,q=p;
    dummy.position.set(this.origin.x+Math.cos(a)*r*(1-q),
      this.floor+.025+q*(.16+.08*Math.sin(a*3+t*9)),
      this.origin.z+Math.sin(a)*r*(1-q));
    dummy.rotation.set(t*(.4+i%3),a+t*1.2,t*.7);
    dummy.scale.setScalar(Math.max(.001,(1-q)*(.65+.12*(i%4))));
    dummy.updateMatrix();this.shards.setMatrixAt(i,dummy.matrix);
   }this.shards.instanceMatrix.needsUpdate=true;
  }
  return false;
 }
}

// All original model/board GLB materials and rig animations are owned by the live game.
