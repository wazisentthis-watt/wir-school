// METAL Rooftop Duel Pilot 01: opt-in live Three.js training arena.
// Uses the existing METAL and ReFramer-capable opponent rigs. No save or story writes.
// Render and locomotion of the rest of Savannah are unchanged when this is inactive.
import * as THREE from 'three';
import {createRooftopDuel,duelAction,stepRooftopDuel,duelSnapshot,DUEL_ROOF} from './metal_aerial_duel_core.mjs';
const keyActions=Object.freeze({KeyJ:'light',KeyK:'launch',KeyF:'pursue',Space:'pursue',KeyQ:'finisher',KeyB:'dodge'});
const motion={light:'Punch',launch:'Kick',pursue:'Flight',finisher:'Blast',dodge:'Block'};
export class MetalRooftopDuelPilot{
 constructor({scene,camera,player,origin,makeOpponent,playPlayer,playOpponent,advanceMixers,onEnter=()=>true,onExit=()=>{}}){
  this.scene=scene;this.camera=camera;this.player=player;this.origin=origin.clone();
  this.makeOpponent=makeOpponent;this.playPlayer=playPlayer;this.playOpponent=playOpponent;
  this.advanceMixers=advanceMixers;this.onEnter=onEnter;this.onExit=onExit;
  this.active=false;this.state=null;this.lastEventId=0;this.actions=[];this.held=new Set();
  this.previousButtons={};this.effects=[];this.enemy=null;this.uiTick=0;
  this.roof=new THREE.Group();this.roof.position.copy(this.origin);this.roof.visible=false;
  scene.add(this.roof);this.buildRoof();this.buildControls();
  this.keydown=e=>{
   if(!this.active)return;
   if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.stop();return;}
   if(keyActions[e.code]){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.actions.push(keyActions[e.code]);return;}
   if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
    e.preventDefault();e.stopImmediatePropagation();this.held.add(e.code);
   }
  };
  this.keyup=e=>{
   if(!this.active)return;
   if(keyActions[e.code]||['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
    e.preventDefault();e.stopImmediatePropagation();this.held.delete(e.code);
   }
  };
  addEventListener('keydown',this.keydown,true);addEventListener('keyup',this.keyup,true);
  addEventListener('blur',()=>this.held.clear());
 }
 buildRoof(){
  const floor=new THREE.Mesh(new THREE.BoxGeometry(30,.9,24),new THREE.MeshStandardMaterial({color:0x343a45,roughness:.88,metalness:.12}));
  floor.position.y=-.51;floor.receiveShadow=true;this.roof.add(floor);
  const trim=new THREE.MeshStandardMaterial({color:0x7d8da1,metalness:.72,roughness:.27,emissive:0x302244,emissiveIntensity:.15});
  const pieces=[
   [0,.6,-12,30,.9,.45],[0,.6,12,30,.9,.45],[-15,.6,0,.45,.9,24],[15,.6,0,.45,.9,24]
  ];
  for(const [x,y,z,w,h,d] of pieces){
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),trim);m.position.set(x,y,z);m.castShadow=true;this.roof.add(m);
  }
  const gridM=new THREE.MeshBasicMaterial({color:0x71548e,transparent:true,opacity:.35});
  for(let x=-12;x<=12;x+=4){const m=new THREE.Mesh(new THREE.BoxGeometry(.035,.012,21),gridM);m.position.set(x,.015,0);this.roof.add(m);}
  for(let z=-8;z<=8;z+=4){const m=new THREE.Mesh(new THREE.BoxGeometry(27,.012,.035),gridM);m.position.set(0,.017,z);this.roof.add(m);}
  for(const x of [-12,12])for(const z of [-8,8]){
   const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.14,.21,1.3,8),
     new THREE.MeshStandardMaterial({color:0x656475,emissive:0x693bd1,emissiveIntensity:1.3}));
   beacon.position.set(x,.67,z);this.roof.add(beacon);
  }
 }
 buildControls(){
  const start=document.createElement('button');start.id='aerialDuelStart';
  start.textContent='⚡ REFRAMER ROOFTOP DUEL · TRAINING';start.type='button';
  start.setAttribute('aria-label','Enter METAL rooftop aerial combat training');
  start.onclick=()=>this.start();document.body.append(start);this.startButton=start;
  const panel=document.createElement('section');panel.id='aerialDuelPanel';panel.hidden=true;panel.setAttribute('aria-label','METAL ReFramer Rooftop Duel');
  panel.innerHTML='<div class="ad-head"><b>METAL ⚡ REFRAMER</b><span id="adPhase">ROOFTOP SPAR · PROPOSAL</span><button id="adExit" type="button">EXIT</button></div>'+
   '<div class="ad-bars"><span>METAL <b id="adMe">100%</b></span><span>REFRAMER <b id="adThem">78%</b></span></div>'+
   '<div class="ad-meter"><i id="adMeBar"></i></div><div class="ad-meter enemy"><i id="adThemBar"></i></div>'+
   '<p id="adMessage" role="status">Chain 2 hits, launch, pursue, finish with Galaxy Gallium.</p>'+
   '<div class="ad-controls" aria-label="Duel attack controls">'+
   '<button data-duel="light" type="button">X · STRIKE</button><button data-duel="launch" type="button">Y · LAUNCH</button>'+
   '<button data-duel="pursue" type="button">A/RT · CHASE</button><button data-duel="finisher" type="button">LT+RT · GALLIUM</button>'+
   '<button data-duel="dodge" type="button">B · DODGE</button></div>'+
   '<div class="ad-dpad" aria-label="Touch movement"><button data-move="KeyW">▲</button><div><button data-move="KeyA">◀</button><button data-move="KeyS">▼</button><button data-move="KeyD">▶</button></div></div>'+
   '<small class="ad-legend">Keyboard J strike · K launch · Space/F chase · Q finisher · B dodge · WASD move · Esc exit</small>';
  document.body.append(panel);this.panel=panel;
  panel.querySelector('#adExit').onclick=()=>this.stop();
  for(const b of panel.querySelectorAll('[data-duel]')){
   b.addEventListener('pointerdown',e=>{e.preventDefault();this.actions.push(b.dataset.duel);});
   b.addEventListener('click',e=>{if(e.detail===0)this.actions.push(b.dataset.duel);});
  }
  for(const b of panel.querySelectorAll('[data-move]')){
   const name=b.dataset.move;
   b.addEventListener('pointerdown',e=>{e.preventDefault();this.held.add(name);try{b.setPointerCapture(e.pointerId);}catch{}});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>this.held.delete(name));
  }
 }
 start(){
  if(this.active)return false;
  if(!this.onEnter())return false;
  this.state=createRooftopDuel();this.actions.length=0;this.held.clear();this.previousButtons={};this.lastEventId=0;
  if(!this.enemy){this.enemy=this.makeOpponent();this.scene.add(this.enemy.o);}
  this.enemy.o.visible=true;this.roof.visible=true;this.active=true;this.uiTick=0;
  document.body.classList.add('aerial-duel-active');this.panel.hidden=false;this.startButton.hidden=true;
  this.syncMeshes();this.playPlayer('Idle');this.playOpponent(this.enemy,'Idle');this.refreshHUD();
  return true;
 }
 stop(){
  if(!this.active)return;
  this.active=false;this.roof.visible=false;this.enemy.o.visible=false;
  this.panel.hidden=true;this.startButton.hidden=false;
  this.actions.length=0;this.held.clear();this.previousButtons={};
  document.body.classList.remove('aerial-duel-active');
  for(const effect of this.effects){this.scene.remove(effect.mesh);effect.mesh.geometry.dispose();effect.mesh.material.dispose();}
  this.effects.length=0;this.onExit();
 }
 pollPad(){
  const g=navigator.getGamepads?.()?.find(g=>g?.connected);
  if(!g){this.previousButtons={};return {x:0,z:0};}
  const on=i=>!!(g.buttons?.[i]?.pressed||g.buttons?.[i]?.value>.55);
  const current={0:on(0),1:on(1),2:on(2),3:on(3),6:on(6),7:on(7)};
  const edge=i=>current[i]&&!this.previousButtons[i];
  if(edge(2))this.actions.push('light');
  if(edge(3))this.actions.push('launch');
  if(edge(0))this.actions.push('pursue');
  if(edge(1))this.actions.push('dodge');
  if(edge(7)){this.actions.push(current[6]?'finisher':'pursue');}
  this.previousButtons=current;
  const dz=v=>Math.abs(v)<.17?0:v;
  return {x:dz(g.axes?.[0]||0),z:dz(g.axes?.[1]||0)};
 }
 actionFeedback(result){
  if(result.ok){
   const type=result.event?.type;
   const playerAnimation=motion[type?.replace('-hit','')]||motion[this.lastAction]||'Punch';
   this.playPlayer(playerAnimation);
  }else{
   this.message.textContent=String(result.reason||'Move unavailable').replace(/-/g,' ').toUpperCase();
  }
 }
 emitEffects(){
  for(const event of this.state.events){
   if(event.id<=this.lastEventId)continue;
   this.lastEventId=event.id;
   if(['light-hit','launch','aerial-finisher','roof-floor-impact','roof-wall-impact','reframer-strike','perfect-evade'].includes(event.type)){
    const around=event.type==='reframer-strike'||event.type==='perfect-evade'?this.state.player:this.state.enemy;
    const color=event.type==='reframer-strike'?0xffa46b:event.type==='roof-floor-impact'?0xb3b5c9:0xaa70ff;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.045,6,28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));
    ring.rotation.x=Math.PI/2;ring.position.set(this.origin.x+around.x,this.origin.y+(event.type.includes('roof-')?.1:around.y+1.1),this.origin.z+around.z);
    this.scene.add(ring);this.effects.push({mesh:ring,life:.65,total:.65});
   }
   if(event.type==='light-hit')this.playOpponent(this.enemy,'HitChest');
   if(event.type==='launch'||event.type==='aerial-finisher')this.playOpponent(this.enemy,'Knock');
   if(event.type==='reframer-telegraph')this.playOpponent(this.enemy,'Guard');
   if(event.type==='reframer-strike')this.playOpponent(this.enemy,'Jab');
   if(event.type==='roof-floor-impact')this.playOpponent(this.enemy,'GetUp');
   if(event.type==='victory')this.message.textContent='VICTORY · REFRAMER CONTAINED. EXIT TO SAVANNAH.';
   if(event.type==='defeat')this.message.textContent='METAL DOWN · EXIT TO RETRY.';
  }
 }
 syncMeshes(){
  if(!this.state)return;
  const p=this.state.player,e=this.state.enemy;
  this.player.o.position.set(this.origin.x+p.x,this.origin.y+p.y,this.origin.z+p.z);
  this.enemy.o.position.set(this.origin.x+e.x,this.origin.y+e.y,this.origin.z+e.z);
  this.player.o.rotation.y=Math.atan2(e.x-p.x,e.z-p.z);
  this.enemy.o.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);
 }
 updateCamera(dt){
  const p=this.state.player,e=this.state.enemy;
  const mid=new THREE.Vector3(this.origin.x+(p.x+e.x)/2,this.origin.y+2+(p.y+e.y)/2,this.origin.z+(p.z+e.z)/2);
  const separation=Math.hypot(p.x-e.x,p.z-e.z);
  const dist=12+Math.min(6,separation*.4);
  const target=new THREE.Vector3(mid.x+dist*.45,mid.y+5.5,mid.z+dist);
  this.camera.position.lerp(target,Math.min(1,dt*5));
  this.camera.lookAt(mid);
  this.camera.fov+=(65-this.camera.fov)*Math.min(1,dt*5);this.camera.updateProjectionMatrix();
 }
 refreshHUD(){
  const s=this.state;if(!s)return;
  const pct=v=>Math.round(Math.max(0,Math.min(1,v))*100);
  this.panel.querySelector('#adMe').textContent=pct(s.player.hp)+'%';
  this.panel.querySelector('#adThem').textContent=pct(s.enemy.hp)+'%';
  this.panel.querySelector('#adMeBar').style.width=pct(s.player.hp)+'%';
  this.panel.querySelector('#adThemBar').style.width=pct(s.enemy.hp)+'%';
  this.panel.querySelector('#adPhase').textContent=s.mode==='ACTIVE'?'COMBO '+s.combo+' · ENERGY '+pct(s.energy)+'%':s.mode;
  if(s.mode==='ACTIVE'){
   this.message.textContent=s.enemy.y>.55?(s.player.y>.55?'AIRBORNE · Q / LT+RT FINISH':'ENEMY LAUNCHED · SPACE / RT PURSUE'):
    (s.combo>=2?'CHAIN READY · K / Y TO LAUNCH':'J / X STRIKE TWICE · K / Y LAUNCH');
  }
 }
 update(dt){
  if(!this.active)return;
  dt=Math.max(0,Math.min(.05,dt));
  const stick=this.pollPad();
  const x=Number(this.held.has('KeyD')||this.held.has('ArrowRight'))-Number(this.held.has('KeyA')||this.held.has('ArrowLeft'));
  const z=Number(this.held.has('KeyS')||this.held.has('ArrowDown'))-Number(this.held.has('KeyW')||this.held.has('ArrowUp'));
  let c={x:Math.max(-1,Math.min(1,x+stick.x)),z:Math.max(-1,Math.min(1,z+stick.z))};
  while(this.actions.length){
   const a=this.actions.shift();this.lastAction=a;
   const result=duelAction(this.state,a);this.actionFeedback(result);
  }
  stepRooftopDuel(this.state,dt,c);
  this.syncMeshes();this.emitEffects();
  for(let i=this.effects.length-1;i>=0;i--){
   const f=this.effects[i];f.life-=dt;
   f.mesh.scale.setScalar(1+(1-f.life/f.total)*2.5);f.mesh.material.opacity=Math.max(0,f.life/f.total);
   if(f.life<=0){this.scene.remove(f.mesh);f.mesh.geometry.dispose();f.mesh.material.dispose();this.effects.splice(i,1);}
  }
  this.advanceMixers(dt);this.updateCamera(dt);
  this.uiTick-=dt;if(this.uiTick<=0){this.uiTick=.1;this.refreshHUD();}
 }
 snapshot(){return this.state?{...duelSnapshot(this.state),active:this.active,enemyVisible:this.enemy?.o.visible,roofVisible:this.roof.visible,playerWorld:{x:this.player.o.position.x,y:this.player.o.position.y,z:this.player.o.position.z}}:null;}
}