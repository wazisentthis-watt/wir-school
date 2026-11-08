// Opt-in ReFramer SQUAD: two self-contained physical agents + original lead.
// Existing ReFramer Rush state machine and real loaded car GLBs are reused.
// Each agent owns exactly one claimed donor, body, eight articulated limbs,
// original wheel meshes, salvage ledger, health, and pursuit state.
// NO duplicate player controller, no replacement GLB, no live-save mutations.
// This is NOT general-purpose aircraft fabrication nor verified Titanium Talons.
import {createReframers,wake,step,hit as hitCore,rescue as rescueCore,loseReframerTarget,RF} from './reframer_core.mjs';
import {createReframerHunt,stepReframerHunt,hitReframerArm,HUNT} from './reframer_hunt_core.mjs';
import {SQUAD,createReframerSquad,reserveVehicle,attachVehiclePart,damageVehiclePart,
 releaseVehicle,reserveTentacle,releaseTentacle,squadOrders,squadSnapshot} from './reframer_squad_core.mjs';
const sq=n=>n*n;
const d2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const cool=()=>({key:'',time:0});
export function mountReframerSquad({THREE,scene,cars,player,vel,leaderNests,leaderInfo,
 heldCar,gamepad,keys,pressed,onHurt,onAlert,onRescue,drawScrap,isTouch=false,qa=false}){
 if(!THREE||!scene||!Array.isArray(cars)||!player?.o||!vel||!Array.isArray(leaderNests)||leaderNests.length<2)
  throw Error('REFRAMER_SQUAD_NEEDS_ORIGINAL_SCENE_AND_NESTS');
 const brain=createReframerSquad(isTouch?1:2),units=[],cache={};
 const meshMat=new THREE.MeshStandardMaterial({color:0x2a313a,metalness:.85,roughness:.34});
 const clawMat=new THREE.MeshStandardMaterial({color:0x292a30,metalness:.8,roughness:.37});
 const eyeMat=new THREE.MeshStandardMaterial({color:0xff6a23,emissive:0xa43a12,emissiveIntensity:1.5});
 const coreGeo=new THREE.DodecahedronGeometry(1.13,0);
 const eyeGeo=new THREE.SphereGeometry(.32,10,8);
 const shaftGeo=new THREE.CylinderGeometry(.075,.1,1,6);
 const tipGeo=new THREE.ConeGeometry(.18,.3,6);
 const tmpU=new THREE.Vector3(0,1,0),va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
 const brief=new Map(),ownerParts=new Map();
 let active=true,frame=0,escapeTouch=false;
 function announce(agent,key,title){
  if(brief.get(agent.id+key))return;
  brief.set(agent.id+key,true);
  onAlert?.(title);
 }
 function limb(o,from,to){
  const delta=vc.copy(to).sub(from);const len=delta.length();
  o.position.copy(from).addScaledVector(delta,.5);
  o.scale.set(1,Math.max(.01,len),1);
  if(len>.001)o.quaternion.setFromUnitVectors(tmpU,delta.divideScalar(len));
 }
 // Reserve separate existing nests for the two wing agents, leaving unreserved
 // nests for the original one-agent ReFramer Rush implementation.
 for(let i=0;i<brain.wings.length;i++){
  const a=brain.wings[i];
  const sourceNest=leaderNests[i+1]||leaderNests[leaderNests.length-1];
  sourceNest.cool=Math.max(sourceNest.cool,1e6);
  const W=createReframers([{x:sourceNest.x,y:sourceNest.y,z:sourceNest.z}]);
  const root=new THREE.Group();
  root.name='WIR_EXISTING_REFRAMER_SQUAD_'+a.id;
  const hull=new THREE.Mesh(coreGeo,meshMat);hull.castShadow=true;root.add(hull);
  const eye=new THREE.Mesh(eyeGeo,eyeMat);eye.position.set(0,-.15,.9);root.add(eye);
  root.visible=false;scene.add(root);
  const arms=[];
  for(let j=0;j<8;j++){
   const g=new THREE.Group(),s1=new THREE.Mesh(shaftGeo,clawMat),
    s2=new THREE.Mesh(shaftGeo,clawMat),cl=new THREE.Mesh(tipGeo,eyeMat);
   g.add(s1,s2,cl);g.visible=false;scene.add(g);
   arms.push({g,s1,s2,cl,ang:j/8*Math.PI*2});
  }
  const scan=new THREE.Mesh(new THREE.ConeGeometry(2.5,3,16,1,true),
   new THREE.MeshBasicMaterial({color:0xff7626,transparent:true,opacity:.16,
    side:THREE.DoubleSide,depthWrite:false}));scan.visible=false;scene.add(scan);
  units.push({id:a.id,role:a.role,W,hunt:createReframerHunt(),root,eye,arms,scan,
   donor:null,wheels:[],wheelHome:[],claimedMesh:new Set(),phase:0,elapsed:0,
   lastStage:'idle',lastCapture:false,padPrev:false,stats:{rescues:0,rammed:0}});
 }
 const btn=document.createElement('button');btn.id='reframerSquadBreakFree';btn.type='button';
 btn.textContent='BREAK FREE · E / A';btn.setAttribute('aria-label','Escape coordinated ReFramer grapple');
 btn.classList.add('wir-keep');btn.hidden=true;
 btn.style.cssText='position:fixed;bottom:calc(91px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);z-index:68;touch-action:manipulation;border:2px solid #e8a28a;background:#742b35;color:white;border-radius:14px;padding:12px 20px;font:bold 13px system-ui;cursor:pointer';
 btn.addEventListener('click',()=>{escapeTouch=true;});document.body.append(btn);
 function wheelList(car){
  const out=[];car.traverse(x=>{if(/wheel/i.test(x.name)&&x.parent&&!out.includes(x))out.push(x);});
  return out.slice(0,4);
 }
 function startWing(u){
  if(u.W.enc)return false;
  const p=player.o.position;
  const available=cars.filter(c=>c!==heldCar?.()&&!c.userData?.worldBody&&!c.userData?.reframed&&!brain.vehicleClaims.has(c.uuid))
   .map(c=>({id:c.uuid,x:c.position.x,z:c.position.z,occupied:!c.userData.occupantExited,c}));
  const E=wake(u.W,{x:p.x,z:p.z},available);
  if(!E)return false;
  const car=available.find(x=>x.id===E.donor)?.c;
  const reserved=reserveVehicle(brain,u.id,E.donor);
  if(!reserved.ok||!car){u.W.enc=null;return false;}
  car.userData.reframed=true;car.userData.spd0=car.userData.spd;car.userData.spd=0;
  u.donor=car;u.hunt=createReframerHunt();u.root.visible=true;
  u.wheels=wheelList(car);
  u.wheelHome=u.wheels.map(w=>({node:w,parent:w.parent,pos:w.position.clone(),q:w.quaternion.clone(),scale:w.scale.clone()}));
  u.claimedMesh.clear();u.lastStage='drop';
  announce(u,'wake','REFRAMER '+u.id+' WOKE · '+u.role.toUpperCase());
  return true;
 }
 function takePart(u,index){
  const w=u.wheels[index],E=u.W.enc;if(!w||!E||u.claimedMesh.has(w.uuid))return;
  const o=attachVehiclePart(brain,u.id,{id:w.uuid,kind:'wheel',vehicleId:u.donor.uuid});
  if(!o.ok)return;
  scene.attach(w);u.claimedMesh.add(w.uuid);
  ownerParts.set(w.uuid,{unitId:u.id,wheel:w});
  w.position.set(E.target.x+Math.cos(index*Math.PI/2)*1.8,.6,E.target.z+Math.sin(index*Math.PI/2)*1.8);
 }
 function salvageMesh(w,amount,id){
  if(!w)return;
  if(w.parent!==scene)scene.attach(w);
  drawScrap.push({kind:'scrap',id,x:w.position.x,y:w.position.y,z:w.position.z,
    reserve:Math.min(.14,Math.max(0,amount)),mesh:w});
 }
 function endWing(u,result){
  if(!result||!u.donor)return;
  const E=u.W.enc,car=u.donor,outcome=result.outcome;
  const clean=outcome==='aborted'||outcome==='clean';
  const released=releaseVehicle(brain,u.id,outcome);
  releaseTentacle(brain,u.id,false);
  if(clean){
   for(const h of u.wheelHome){
    if(!h.node||!h.parent)continue;
    h.parent.attach(h.node);h.node.position.copy(h.pos);
    h.node.quaternion.copy(h.q);h.node.scale.copy(h.scale);
   }
   car.userData.reframed=false;car.userData.spd=car.userData.spd0||car.userData.spd;
   car.position.y=.05;car.rotation.x=0;car.rotation.z=0;
  }else{
   // The donor's large shell becomes wreckage, not a magically respawning car.
   const i=cars.indexOf(car);if(i>=0)cars.splice(i,1);
   scene.remove(car);
   for(const p of released.parts){
    const match=u.wheels.find(w=>w.uuid===p.id);
    if(match)salvageMesh(match,p.integrity*.14,'squad-part-'+u.id+'-'+p.id);
   }
  }
  u.wheels=[];u.wheelHome=[];u.claimedMesh.clear();u.donor=null;
  u.root.visible=false;u.scan.visible=false;for(const arm of u.arms)arm.g.visible=false;
  u.hunt=createReframerHunt();u.lastStage='idle';
  for(const key of [...brief.keys()])if(key.startsWith(u.id))brief.delete(key);
  announce(u,'ended','REFRAMER '+u.id+' '+(clean?'REPELLED':'LEFT A VEHICLE WRECK'));
 }
 function updateWheels(u,stage,T){
  const E=u.W.enc;
  if(!E||!u.donor)return;
  if(stage==='release'||stage==='reframe'||stage==='chase'){
   const count=stage==='release'?E.parts:4;
   for(let k=0;k<Math.min(count,u.wheels.length);k++)takePart(u,k);
  }
  const a=brain.wings.find(x=>x.id===u.id);
  if(!a)return;
  for(const p of a.parts){
   const wheel=u.wheels.find(w=>w.uuid===p.id);
   if(!wheel||wheel.parent!==scene)continue;
   const k=u.wheels.indexOf(wheel);
   wheel.position.set(E.target.x+Math.cos(k*Math.PI/2+T*2)*1.75,
    .7+Math.sin(T*2+k)*.2,E.target.z+Math.sin(k*Math.PI/2+T*2)*1.75);
   wheel.rotation.x+=.09;
  }
 }
 function visuals(u,T){
  const E=u.W.enc,m=u.root,car=u.donor;
  if(!E){m.visible=false;return;}
  const stage=E.stage,activeCar=stage==='reframe'||stage==='chase';
  const pos=activeCar?E.target:E.pos;
  m.visible=true;m.position.set(pos.x,activeCar?2.8:E.pos.y,pos.z);
  m.rotation.y+=.024;
  u.eye.material.emissiveIntensity=stage==='read'?2:1;
  if(car&&activeCar){
   car.position.set(E.target.x,.6,E.target.z);car.rotation.y=E.heading||car.rotation.y;
  }
  if(car&&stage==='reframe'&&!activeCar)car.position.y=.05;
  if(car&&stage==='read'){
   u.scan.visible=true;u.scan.position.set(car.position.x,2,car.position.z);u.scan.rotation.y+=.03;
  }else u.scan.visible=false;
  for(let k=0;k<8;k++){
   const arm=u.arms[k],hidden=u.hunt.armBroken&&k===0;
   arm.g.visible=stage!=='drop'&&!hidden;
   if(!arm.g.visible)continue;
   const ang=arm.ang,base=va.copy(m.position);
   let end;
   if(stage==='anchor'||stage==='release'){
    end=vb.set(car.position.x+Math.cos(ang)*1.4,car.position.y+.8,car.position.z+Math.sin(ang)*1.5);
   }else if(k===0&&(u.hunt.tether==='windup'||u.hunt.tether==='hold')){
    end=vb.set(player.o.position.x,player.o.position.y+1.2,player.o.position.z);
   }else{
    end=vb.set(m.position.x+Math.cos(ang+T*.4)*2.6,
     m.position.y-1.45+Math.sin(T*2+ang)*.2,m.position.z+Math.sin(ang+T*.4)*2.6);
   }
   const mid=m.position.clone().lerp(end,.5);mid.y+=.85;
   const first=base.clone(),last=end.clone();
   limb(arm.s1,first,mid);limb(arm.s2,mid,last);arm.cl.position.copy(last);
  }
 }
 let worldTick=0,startedOnce=false;
 function tick(dt){
  if(!active||!Number.isFinite(dt)||dt<=0)return;
  const t=Math.min(.05,dt),p=player.o.position,meta=[];
  const leader=leaderInfo?.();
  if(leader?.position&&leader.stage==='chase')meta.push({id:'RF-LEAD',
   position:leader.position,sees:d2(leader.position,p)<SQUAD.SIGHT});
  for(const u of units){
   const e=u.W.enc;
   const position=e?(e.stage==='chase'?e.target:e.pos):u.W.nests[0];
   meta.push({id:u.id,position,sees:!!e&&e.stage==='chase'&&d2(position,p)<SQUAD.SIGHT});
  }
  const orders=squadOrders(brain,{metal:{x:p.x,z:p.z},units:meta,dt:t});
  let holding=false;const game=gamepad?.(),button=!!game?.buttons?.[0]?.pressed;
  // Deterministic priority: closest held tentacle consumes each escape tap;
  // idle wings cannot consume a button intended for normal Savannah gameplay.
  const heldUnit=units.find(u=>u.hunt.tether==='hold');
  const tap=!!heldUnit&&(!!pressed?.KeyE||(button&&!heldUnit.padPrev)||escapeTouch);
  if(tap&&heldUnit&&pressed)pressed.KeyE=false;
  escapeTouch=false;
  btn.hidden=!heldUnit;
  for(const u of units)u.padPrev=button;
  for(const u of units){
   if(!u.W.enc){
    step(u.W,{x:p.x,z:p.z},null,t); // nest cooldown only while idle
    startWing(u);continue;
   }
   const e=u.W.enc,car=u.donor;
   const order=orders.find(x=>x.id===u.id);
   let hunt=null;
   if(e.stage==='chase'){
    const distance=d2(e.target,p);
    hunt=stepReframerHunt(u.hunt,{metal:{x:p.x,z:p.z},
      robot:{x:e.target.x,z:e.target.z},visible:distance<SQUAD.SIGHT,
      allowTether:order?.allowTether===true&&(!brain.activeGrabber||brain.activeGrabber===u.id),
      escapeTap:heldUnit===u&&tap},t);
    for(const evt of hunt.events){
     if(evt.type==='tether-warn'){
      reserveTentacle(brain,u.id);
      announce(u,'warn','REFRAMER '+u.id+' TENTACLE WINDUP · DODGE');
     }
     if(evt.type==='tether-caught')announce(u,'grab','METAL GRABBED · TAP E / A / BREAK FREE');
     if(['tether-escaped','tether-dodged','tether-release','tether-lost','tether-arm-broken'].includes(evt.type)){
      releaseTentacle(brain,u.id,evt.type==='tether-escaped');
      brief.delete(u.id+'warn');brief.delete(u.id+'grab');
     }
    }
    if(hunt.held){
     vel.x=vel.x*Math.exp(-2*t)+(e.target.x-p.x)*.85*t;
     vel.z=vel.z*Math.exp(-2*t)+(e.target.z-p.z)*.85*t;
     holding=true;
    }
    if(hunt.damage>0)onHurt?.(hunt.damage,new THREE.Vector3(e.target.x,p.y,e.target.z));
    if(hunt.lost){
     const fin=loseReframerTarget(u.W);if(fin)endWing(u,fin);
     continue;
    }
    if(order?.goal)hunt={...hunt,goal:order.goal,canRam:hunt.canRam&&distance<2.4};
   }
   // Exactly one original ReFramer state-machine update per active agent per frame.
   const out=step(u.W,{x:p.x,z:p.z},car&&e.stage!=='chase'?{x:car.position.x,z:car.position.z}:null,t,hunt);
   if(out.ram>0&&d2(e.target,p)<2.5){
    onHurt?.(out.ram,new THREE.Vector3(e.target.x,p.y,e.target.z));
    u.stats.rammed++;
   }
   for(const evt of out.events){
    if(evt.type==='occupantShaken'&&car)onRescue?.(car,false);
    if(evt.type==='stage'){
     u.lastStage=evt.stage;
     if(evt.stage==='read')announce(u,'scan','REFRAMER '+u.id+' SCANNING VEHICLE');
     if(evt.stage==='release')announce(u,'part','REFRAMER '+u.id+' REMOVING DONOR PARTS');
     if(evt.stage==='chase')announce(u,'chase','ROADFRAME '+u.id+' HUNTING METAL');
    }
    if(evt.type==='end')endWing(u,evt);
   }
   if(!u.W.enc)continue;
   if(car&&e.occupied&&!e.rescued&&d2(p,car.position)<3.6&&pressed?.KeyE){
    pressed.KeyE=false;
    if(rescueCore(u.W)){onRescue?.(car,true);u.stats.rescues++;}
   }
   updateWheels(u,e.stage,brain.clock);
   visuals(u,brain.clock);
  }
 }
 function hitWing(kind,power,pos){
  if(!active||!pos)return false;
  const sorted=units.filter(u=>u.W.enc).map(u=>{
   const e=u.W.enc;
   const p=e.stage==='chase'||e.stage==='reframe'?e.target:e.pos;
   return {u,d:Math.hypot(p.x-pos.x,(e.stage==='chase'?1:e.pos.y)-pos.y,p.z-pos.z)}
  }).sort((a,b)=>a.d-b.d);
  for(const item of sorted){
   const {u}=item,e=u.W.enc;
   if(item.d>3.3)continue;
   const inventory=brain.wings.find(x=>x.id===u.id);
   if(inventory&&e.stage==='chase'){
    for(const part of [...inventory.parts]){
     const mesh=u.wheels.find(w=>w.uuid===part.id);
     if(!mesh||mesh.position.distanceTo(pos)>1.15)continue;
     const damage=kind==='car'?.8:kind==='glob'?.52:kind==='blast'?.42:.3;
     const result=damageVehiclePart(brain,u.id,mesh.uuid,damage);
     if(result.broken){
      // Detached part goes into DRAW, with the damaged part's remaining matter.
      // It is no longer part of the unit's inventory or future assembly.
      salvageMesh(mesh,.10,'squad-broken-part-'+u.id+'-'+mesh.uuid);
      u.claimedMesh.delete(mesh.uuid);
      onAlert?.('REFRAMER '+u.id+' LOST A VEHICLE COMPONENT');
     }
     return true;
    }
    if(!u.hunt.armBroken&&u.arms[0].cl.position.distanceTo(pos)<1.25){
     const weak=hitReframerArm(u.hunt,kind,power);
     if(weak.ok){
      if(weak.broken){
       const source=u.arms[0].cl,claw=source.clone();
       scene.add(claw);claw.position.copy(source.position);
       salvageMesh(claw,weak.salvage,'squad-claw-'+u.id+'-'+e.id);
       u.arms[0].g.visible=false;releaseTentacle(brain,u.id);
       onAlert?.('REFRAMER '+u.id+' CLAW SEVERED · SALVAGE AVAILABLE');
      }
      return true;
     }
    }
   }
   const response=hitCore(u.W,kind,power);
   if(response?.type==='end')endWing(u,response);
   else if(response?.type==='jam')onAlert?.('REFRAMER '+u.id+' SCAN JAMMED');
   return !!response;
  }
  return false;
 }
 function snapshot(){
  return {enabled:true,total:1+units.length,wingCount:units.length,wingActors:units.map(u=>({
   id:u.id,role:u.role,stage:u.W.enc?.stage||'idle',active:!!u.W.enc,
   carId:u.donor?.uuid||null,arms:u.arms.length,attachedMeshes:u.claimedMesh.size,
   hunt:{tether:u.hunt.tether,armBroken:u.hunt.armBroken},
   rescue:u.stats.rescues,rammed:u.stats.rammed})),...squadSnapshot(brain),
   activeEscape:!btn.hidden};
 }
 function qaStart(){
  if(!qa)return {ok:false,reason:'qa-disabled'};
  const donors=cars.filter(c=>!c.userData.reframed&&!c.userData.worldBody);
  if(donors.length<units.length)return {ok:false,reason:'not-enough-original-cars'};
  for(let i=0;i<units.length;i++){
   const u=units[i],n=u.W.nests[0],c=donors[i];
   if(u.W.enc)continue;
   // Place REAL car GLBs near their natural nests; this fixture never runs in
   // gameplay and avoids replacing an object with a primitive.
   c.userData.spd=0;c.position.set(n.x+4,.05,n.z+3);
   c.userData.lane=c.userData.axis?n.x+4:n.z+3;
   c.userData.t=c.userData.axis?n.z+3:n.x+4;
   c.userData.occupantExited=false;
   const r=wake(u.W,{x:n.x+10,z:n.z+4},[{id:c.uuid,x:c.position.x,z:c.position.z,occupied:true}]);
   if(!r)return {ok:false,reason:'original-wake-failed',agent:u.id};
   const ok=reserveVehicle(brain,u.id,c.uuid);
   if(!ok.ok)return {ok:false,reason:'claim-failed',agent:u.id};
   c.userData.reframed=true;c.userData.spd0=c.userData.spd;c.userData.spd=0;
   u.donor=c;u.wheels=wheelList(c);
   u.wheelHome=u.wheels.map(w=>({node:w,parent:w.parent,pos:w.position.clone(),q:w.quaternion.clone(),scale:w.scale.clone()}));
   u.root.visible=true;
  }
  const originals=units.map(u=>({id:u.id,carId:u.donor.uuid,meshCount:(()=>{let n=0;u.donor.traverse(o=>{if(o.isMesh)n++});return n;})()}));
  return {ok:true,originals,distinct:new Set(originals.map(o=>o.carId)).size};
 }
 function destroy(){
  active=false;btn.remove();
  for(const u of units){
   scene.remove(u.root);scene.remove(u.scan);
   for(const a of u.arms)scene.remove(a.g);
   if(u.donor){
    for(const h of u.wheelHome)if(h.node&&h.parent){
     h.parent.attach(h.node);h.node.position.copy(h.pos);h.node.quaternion.copy(h.q);h.node.scale.copy(h.scale);
    }
    u.donor.userData.reframed=false;u.donor.userData.spd=u.donor.userData.spd0||u.donor.userData.spd;
   }
  }
  coreGeo.dispose();eyeGeo.dispose();shaftGeo.dispose();tipGeo.dispose();
  meshMat.dispose();clawMat.dispose();eyeMat.dispose();
  for(const u of units){u.scan.geometry.dispose();u.scan.material.dispose();}
 }
 return Object.freeze({tick,hit:hitWing,snapshot,destroy,qaStart});
}
