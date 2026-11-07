// WIR Connected · Mission 05 Rooftop Pursuit, opt-in. PROPOSAL / PUBLISH HOLD.
import * as THREE from 'three';
import {M05_OBJECTIVES,M05_STAGES,readMission05,saveMission05,mission05Transition,
 tickMission05,flatDistance,validPosition} from './metal_rooftop_pursuit_core.mjs';
const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.3});
function block(w,h,d,x,y,z,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;return m;}
export class RooftopPursuitMission{
 constructor({scene,colliders,anchors,skate,home,fight,storage,readWorld,onEngage,onNotice}){
  Object.assign(this,{scene,colliders,anchors,storage,readWorld,onEngage,onNotice});
  this.skate=skate.clone();this.home=home.clone();this.fight=fight.clone();
  this.state=readMission05(storage);this.duel=null;this.duelEntry=null;
  this.lastChord=false;this.uiTime=0;
  this.group=new THREE.Group();this.group.position.set(fight.x,0,fight.z);
  scene.add(this.group);this.buildWorld();this.buildHUD();this.beacon=null;this.setBeacon();
 }
 buildWorld(){
  const deck=block(30,.7,24,0,11.45,0,0x373f50);deck.name='M05 REAL ROOFTOP';
  this.group.add(deck);this.roofY=11.8;
  this.roof=new THREE.Vector3(this.fight.x,this.roofY,this.fight.z);
  this.colliders.push(new THREE.Box3().setFromObject(deck));
  for(const [x,z,w,d] of [[0,-11.8,30,.4],[0,11.8,30,.4],[-14.8,0,.4,24],[14.8,0,.4,24]])
   this.group.add(block(w,.4,d,x,12.12,z,0x8190a1));
  for(const x of [-13,13])for(const z of [-10,10]){
   this.group.add(block(.2,3,.2,x,13.2,z,0x8896a7));
   this.anchors.push(new THREE.Vector3(this.fight.x+x,14.75,this.fight.z+z));
  }
  // Solid intermediate surfaces support original wall ride, landing and swing.
  for(const [x,y,z] of [[-17,3.2,-4],[-17,7.4,4]]){
   const step=block(7,.7,7,x,y,z,0x555b69);this.group.add(step);
   this.colliders.push(new THREE.Box3().setFromObject(step));
   this.anchors.push(new THREE.Vector3(this.fight.x+x,y+1.55,this.fight.z+z));
  }
  this.group.add(block(6,.7,.4,0,13,-11.7,0x7955a7));
 }
 buildHUD(){
  const el=document.createElement('section');el.id='mission05Hud';
  el.setAttribute('aria-label','Metal Mission 05 Rooftop Pursuit');
  el.innerHTML='<b>05 · ROOFTOP PURSUIT</b> <span id="m05Stage">HOLD</span>'+
   '<p id="m05Objective" role="status" aria-live="polite"></p>'+
   '<div><button type="button" id="m05Action">BEGIN</button> <button type="button" id="m05Save">SAVE 05</button></div>'+
   '<small id="m05Hint">Original controls remain · F10 / D-pad Up + Y</small>';
  document.body.append(el);this.hud=el;
  this.action=el.querySelector('#m05Action');this.saveButton=el.querySelector('#m05Save');
  this.action.onclick=()=>this.act();this.saveButton.onclick=()=>this.save();
  addEventListener('keydown',e=>{if(e.code==='F10'&&!e.repeat&&!this.duel?.active){e.preventDefault();this.act();}});
  this.refresh();
 }
 get stage(){return this.state.stage}
 attachDuel(duel){this.duel=duel;duel.startButton.hidden=true;}
 ctx(){const data=this.readWorld()||{};return {...data,position:data.position||null};}
 onRoof(c){return validPosition(c.position)&&flatDistance(c.position,this.roof)<=9&&
  Math.abs(c.position.y-this.roofY)<.65&&c.grounded===true;}
 act(){
  if(this.duel?.active)return false;
  const c=this.ctx();
  if(this.stage==='INTRO'||this.stage==='COMPLETE'){
   const r=mission05Transition(this.state,'start',{position:c.position});
   if(r.ok){this.persist();this.setBeacon();this.refresh();this.onNotice('MISSION 05 · REFRAMER SIGNAL ABOVE THE FIGHT LOT');}
   return r.ok;
  }
  if(this.stage==='DUEL'){
   if(!this.onRoof(c)||c.board||c.flying||c.swinging||c.forgeBusy){
    this.onNotice('Reach the roof grounded on foot; dissolve the board first');return false;
   }
   this.duelEntry={x:c.position.x,y:c.position.y,z:c.position.z};
   const ok=!!this.onEngage();
   if(ok){mission05Transition(this.state,'duel-attempt');this.persist();this.refresh();}
   else this.duelEntry=null;
   return ok;
  }
  return false;
 }
 land({names=[],points=0,position,board}){
  if(this.stage!=='TRICK')return false;
  const r=mission05Transition(this.state,'land-flip',{names,points:Math.floor(points),position,
   board,landed:true,skate:this.skate});
  if(r.ok){this.persist();this.setBeacon();this.refresh();this.onNotice('TRICK LANDED · FOLLOW THE ROOFTOP SIGNAL');}
  return r.ok;
 }
 duelFrame(duel){
  if(!this.duel?.active||this.stage!=='DUEL')return;
  const r=mission05Transition(this.state,'duel-victory',{position:this.duelEntry,duel});
  if(r.ok){this.persist();this.setBeacon();this.refresh();this.onNotice('REFRAMER CONTAINED · RETURN HOME');}
 }
 changed(event,facts){
  const r=mission05Transition(this.state,event,facts);
  if(r.ok){this.persist();this.setBeacon();this.refresh();this.onNotice(M05_OBJECTIVES[this.stage]);}
  return r.ok;
 }
 tick(dt){
  tickMission05(this.state,dt);
  const c=this.ctx();
  if(this.stage==='SKATEPARK')this.changed('at-skatepark',{position:c.position,skate:this.skate});
  if(this.stage==='ROOFTOP'&&this.onRoof(c))
   this.changed('at-roof',{position:c.position,roof:this.roof,grounded:true});
  if(this.stage==='RETURN'&&!this.duel?.active)
   this.changed('at-home',{position:c.position,home:this.home,grounded:c.grounded,duelActive:false});
  this.pad();this.hud.hidden=!!this.duel?.active;
  if(this.beacon){this.beacon.position.y=this.beaconY+.2*Math.sin(this.state.elapsed*2);}
  this.uiTime-=dt;if(this.uiTime<=0){this.uiTime=.3;this.refresh(c);}
 }
 pad(){
  if(!['INTRO','DUEL','COMPLETE'].includes(this.stage)||this.duel?.active){this.lastChord=false;return;}
  const gp=Array.from(navigator.getGamepads?.()||[]).find(g=>g?.connected);
  const on=i=>!!(gp?.buttons?.[i]?.pressed||gp?.buttons?.[i]?.value>.55);
  const chord=on(12)&&on(3);if(chord&&!this.lastChord)this.act();this.lastChord=chord;
 }
 save(){
  const c=this.ctx();
  if(this.stage==='INTRO'||this.duel?.active||!validPosition(c.position)){this.onNotice('Save unavailable until mission begins and duel ends');return false;}
  this.state.checkpoint={x:c.position.x,y:c.position.y,z:c.position.z};
  this.state.revision++;const ok=this.persist();
  this.onNotice(ok?'MISSION 05 CHECKPOINT SAVED':'Mission 05 storage unavailable');return ok;
 }
 persist(){return saveMission05(this.storage,this.state);}
 restore(p){
  if(this.stage==='INTRO'||this.stage==='COMPLETE'||!validPosition(this.state.checkpoint))return false;
  p.set(this.state.checkpoint.x,this.state.checkpoint.y,this.state.checkpoint.z);
  this.onNotice('MISSION 05 CHECKPOINT RESTORED');return true;
 }
 setBeacon(){
  if(this.beacon){this.scene.remove(this.beacon);this.beacon.geometry.dispose();this.beacon.material.dispose();}
  const dest=this.stage==='SKATEPARK'||this.stage==='TRICK'?this.skate:
   this.stage==='ROOFTOP'||this.stage==='DUEL'?this.roof:this.stage==='RETURN'?this.home:null;
  if(!dest){this.beacon=null;return;}
  this.beacon=new THREE.Mesh(new THREE.TorusGeometry(1.4,.08,8,32),
   new THREE.MeshBasicMaterial({color:this.stage==='DUEL'?0xffba87:0x92ccff,transparent:true,opacity:.86}));
  this.beacon.rotation.x=-Math.PI/2;this.beaconY=dest.y+1.5;this.beacon.position.set(dest.x,this.beaconY,dest.z);
  this.scene.add(this.beacon);
 }
 refresh(c=this.ctx()){
  this.hud.querySelector('#m05Stage').textContent=(this.stage==='COMPLETE'?'COMPLETE':'STAGE '+Math.max(1,M05_STAGES.indexOf(this.stage))+' / 5')+' · HOLD';
  let msg=M05_OBJECTIVES[this.stage];
  const dest=this.stage==='SKATEPARK'||this.stage==='TRICK'?this.skate:
   this.stage==='ROOFTOP'||this.stage==='DUEL'?this.roof:this.stage==='RETURN'?this.home:null;
  if(dest&&validPosition(c.position))msg+=' · '+Math.round(flatDistance(c.position,dest))+'m';
  if(this.stage==='INTRO'&&c.storyChapter<3)msg+=' · early-chapter preview; story unchanged';
  this.hud.querySelector('#m05Objective').textContent=msg;
  this.action.hidden=!['INTRO','DUEL','COMPLETE'].includes(this.stage);
  this.action.textContent=this.stage==='DUEL'?'ENGAGE REFRAMER':this.stage==='COMPLETE'?'REPLAY M05':'BEGIN M05';
  this.saveButton.hidden=this.stage==='INTRO'||this.stage==='COMPLETE';
  this.hud.querySelector('#m05Hint').textContent=this.stage==='DUEL'?
   'Dismount on rooftop · F10 / D-pad Up + Y · aerial combat uses separate inputs':
   'All classic Metal powers preserved · F10 / D-pad Up + Y';
 }
 snapshot(){return Object.freeze({stage:this.stage,objective:M05_OBJECTIVES[this.stage],
  flip:this.state.flip,points:this.state.points,roofImpacts:this.state.roofImpacts,
  attempts:this.state.duelAttempts,complete:this.state.completed,
  checkpoint:this.state.checkpoint?{...this.state.checkpoint}:null,
  roof:{x:this.roof.x,y:this.roof.y,z:this.roof.z},
  duelActive:!!this.duel?.active,saveKey:'wir_metal_rooftop_pursuit_v1'});}
}