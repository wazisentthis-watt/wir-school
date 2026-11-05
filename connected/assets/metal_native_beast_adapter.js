// WIR Connected · METAL advanced combat layer. PROPOSAL / PUBLISH HOLD.
// Attaches to the existing METAL and Three.js scene; no save writes or second player/renderer.
import * as THREE from 'three';
import {createBeastState,ARM_ROLES,selectBeastArm,cycleBeastRole,spendGallium,reclaimGallium,buildConstruct,recoverConstruct,addBeastResonance,activateSnap,cycleThermal,cycleShape,cycleLil,markRifft,beginRifftTravel,finishRifft,resetRifft,canDominion,useDominion,tickBeast} from './metal_native_beast_core.mjs';
import {scanBoss,collectCitizen,reviveCitizen,repairNode,damageBoss} from './savannah_native_core.mjs';
const clamp=THREE.MathUtils.clamp;
const AIR=0.17; // Experimental Gallium Gallop, not free flight.
export function installNativeBeast(g,pilot){const b=new BeastLayer(g,pilot);b.mount();return b;}
class BeastLayer {
 constructor(g,pilot){this.g=g;this.pilot=pilot;this.s=createBeastState();this.scene=g.P.o.parent;this.root=new THREE.Group();this.root.name='WIR_METAL_BEAST_POWERS_HOLD';this.scene.add(this.root);
  this.lines=[];this.constructModels=new Map();this.anchorMass=new Map();this.grabbed=null;this.holdBoss=false;this.guardUntil=0;this.dominionWindup=0;this.charge=0;this.rifftMove=null;this.cooldown=0;this.lastPad=[];this.last=performance.now();this.ticks=0;this.lastScout=0;this.lastRepair=0;this.lastRecover=0;this.lilMesh=null;
 }
 mount(){for(let i=0;i<6;i++){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(3*13),3));const mat=new THREE.LineBasicMaterial({color:i%2?0x7a40df:0xb78dff,transparent:true,opacity:.87});const line=new THREE.Line(geo,mat);line.frustumCulled=false;this.root.add(line);this.lines.push(line);}
  this.createLil();this.createHUD();this.bindInputs();this.pilot.beast=this;
  this.g.metalBeast={snapshot:()=>this.snapshot(),select:n=>this.select(n),role:()=>this.role(),command:()=>this.command(),build:()=>this.build(),recover:()=>this.recover(),scan:()=>this.scan(),snap:()=>this.snap(),mark:()=>this.mark(),cross:()=>this.cross(),ret:()=>this.return(),thermal:()=>this.thermal(),shape:()=>this.shape(),lil:()=>this.lil(),dominion:()=>this.dominion(),gallop:()=>this.gallop(),trick:()=>this.trick(),throw:()=>this.throw()};
  requestAnimationFrame(()=>this.tick());}
 snapshot(){return {arms:[...this.s.arms],selected:this.s.selected,thermal:this.s.thermal,shape:this.s.shape,focus:Math.round(this.s.focus),heat:Math.round(this.s.heat),resonance:Math.round(this.s.resonance),snap:this.s.snap,snapStorm:this.s.snapStorm,held:this.holdBoss,anchors:this.s.anchorPoints.length,gallium:+this.g.st.gal.toFixed(3),constructs:this.s.constructs.filter(c=>c.active).length,rift:{...this.s.rift},lil:this.s.lil,dominion:this.s.dominionCooldown,chapter:this.pilot.s.chapter};}
 createHUD(){const hud=document.createElement('section');hud.id='metalBeastPanel';hud.style.cssText='position:fixed;z-index:45;left:8px;bottom:9px;max-width:min(350px,95vw);max-height:58vh;overflow:auto;background:#0a091eea;color:#f4e9ff;border:1px solid #8854d0;border-radius:13px;padding:9px;font:11px system-ui;box-shadow:0 8px 22px #07051799';
  hud.innerHTML='<b style="color:#cba4ff">METAL · GALAXY RIFFT BEAST</b> <small style="color:#ffc77b">BUILD 03 · HOLD</small><div id="mbStatus" role="status" aria-live="polite" style="margin:6px 0"></div><div id="mbCommands" style="display:flex;gap:4px;flex-wrap:wrap"></div><div style="color:#ad9ecb;margin-top:4px">Alt + numpad 1–6 arms, 7 role, 8 command, 9 construct, 0 Lil Heavy. Alt+Q scan · X Snap · Z thermal · C shape · V reclaim · R mark · T cross · Backspace return · E Dominion · G Gallop · Space trick · H release/throw.</div>';
  document.body.append(hud);this.hud=hud;this.status=hud.querySelector('#mbStatus');const a=hud.querySelector('#mbCommands');
  for(const [k,fn] of [['ARM',()=>this.select((this.s.selected+1)%6)],['ROLE',()=>this.role()],['COMMAND',()=>this.command()],['SCOUT',()=>this.scan()],['SNAP',()=>this.snap()],['BUILD',()=>this.build()],['RECOVER',()=>this.recover()],['SHAPE',()=>this.shape()],['COLD/HOT',()=>this.thermal()],['RIFFT MARK',()=>this.mark()],['CROSS',()=>this.cross()],['RETURN',()=>this.return()],['LIL HEAVY',()=>this.lil()],['GALLOP',()=>this.gallop()],['TRICK',()=>this.trick()],['THROW',()=>this.throw()],['DOMINION',()=>this.dominion()]]){
   const el=document.createElement('button');el.type='button';el.textContent=k;el.style.cssText='background:#382455;border:1px solid #72539b;border-radius:6px;color:white;padding:5px 7px;cursor:pointer';el.addEventListener('click',fn);a.append(el);
  }this.renderHUD();}
 note(msg){this.s.message=msg;this.renderHUD();}
 selected(){return this.s.selected;}
 select(n){if(!selectBeastArm(this.s,n))return false;this.note('Arm '+(n+1)+' · '+this.s.arms[n]);return true;}
 role(){const index=this.selected(),old=this.s.arms[index];if(old==='Anchor')this.releaseAnchor(index);if(old==='Grapple'&&this.holdBoss&&this.s.grabArm===index)this.throw();const r=cycleBeastRole(this.s);this.note('Arm '+(index+1)+' assigned '+r);return r;}
 onMissionStart(){if(this.holdBoss){this.holdBoss=false;this.s.held=false;this.grabbed=null;}this.dominionWindup=0;this.rifftMove=null;this.s.rift.travel=0;this.guardUntil=0;}
 eligible(){return this.pilot.s.phase==='playing';}
 player(){return this.g.P.o.position;}
 nearestAnchor(max=26){const p=this.player(),anchors=this.g.anchors||[];let best=null,d=max;
  for(const a of anchors){if(!a||!Number.isFinite(a.x))continue;const h=a.distanceTo(p);if(h<d){d=h;best=a;}}return best;}
 scan(){if(!this.eligible())return false;const p=this.player(),b=this.pilot.boss?.mesh;if(!b||Math.hypot(p.x-b.position.x,p.z-b.position.z)>28){this.note('Scan: move within 28m of the target.');return false;}
 if(this.s.focus<12)return false;this.s.focus-=12;scanBoss(this.pilot.s);addBeastResonance(this.s,15);this.note('Crown Read · weakness exposed · +15 chord');return true;}
 snap(){if(this.s.snap>0){this.s.snap=0;this.s.snapExposure=0;this.note('SNAP cancelled before neural overload');return true;}const ok=activateSnap(this.s);this.note(ok?'SNAP active · cancel early to avoid Snap Storm':'SNAP unavailable · focus or overload');return ok;}
 thermal(){const m=cycleThermal(this.s);this.note(m+' · temperature costs now active');return m;}
 shape(){const m=cycleShape(this.s);this.note('Gallium construction: '+m);return m;}
 lil(){const m=cycleLil(this.s);this.note('Lil Heavy: '+m+' mode');return m;}
 anchorCount(){return this.s.anchorPoints.filter(a=>a&&a.distanceTo(this.player())<28).length;}
 command(){if(!this.eligible())return false;const arm=this.selected(),role=this.s.arms[arm],p=this.player();
  if(role==='Anchor'){if(this.s.anchorPoints[arm]){this.releaseAnchor(arm);this.note('Anchor released · material recovered');return true;}const a=this.nearestAnchor();if(!a){this.note('ANCHOR failed · no supported physical surface');return false;}const next=spendGallium(this.g.st.gal,.018);if(next===null)return false;this.g.st.gal=next;this.anchorMass.set(arm,.018);this.s.anchorPoints[arm]=a.clone();addBeastResonance(this.s,9);this.note('Arm '+(arm+1)+' physically anchored · 1.8% Gallium');return true;}
  if(role==='Grapple'){const b=this.pilot.boss;if(!b?.active||this.holdBoss||p.distanceTo(b.mesh.position)>10){this.note('Grapple needs an unheld enemy inside 10m');return false;}
   const next=spendGallium(this.g.st.gal,.035);if(next===null)return false;this.g.st.gal=next;this.grabbed=b;this.holdBoss=true;this.s.held=true;this.s.grabArm=arm;this.guardUntil=0;this.note('GALAXY GRIP · enemy physically held. Alt+H throws.');return true;}
  if(role==='Guard'||role==='Counter'){this.guardUntil=performance.now()/1000+3;this.note(role+' ready · brace against next strike');
   if(role==='Counter'&&this.pilot.telegraph>0){this.pilot.telegraph=0;this.pilot.enemyClock=3;this.pilot.s.stun=1.5;addBeastResonance(this.s,16);this.note('COUNTER · enemy wind-up intercepted');}return true;}
  if(role==='Mobility')return this.gallop();
  if(role==='Rescue'){const a=this.pilot.nearest('citizen',8);if(!a)return false;
   const c=this.pilot.s.citizens[a.id];const ok=c?.mode==='injured'?reviveCitizen(this.pilot.s,a.id):collectCitizen(this.pilot.s,a.id);
   if(ok){this.note('Arm '+(arm+1)+' rescued citizen '+(a.id+1));addBeastResonance(this.s,10);}return ok;}
  return false;}
 releaseAnchor(arm){if(!this.s.anchorPoints[arm])return;const cost=this.anchorMass.get(arm)||0;this.g.st.gal=reclaimGallium(this.g.st.gal,cost,.8).remaining;this.anchorMass.delete(arm);this.s.anchorPoints[arm]=null;}
 guarding(){return this.s.thermal==='Cold Lock'&&(performance.now()/1000<this.guardUntil||this.shielding()||this.bracing());}
 shielding(){const p=this.player(),b=this.pilot.boss?.mesh?.position;if(!b)return false;return [...this.constructModels.values()].some(v=>v.type==='Shield'&&p.distanceTo(v.mesh.position)<7&&v.mesh.position.distanceTo(b)<p.distanceTo(b));}
 bracing(){const p=this.player();return [...this.constructModels.values()].some(v=>v.type==='Brace'&&p.distanceTo(v.mesh.position)<6);}
 slowFactor(){return this.s.snap>0?.38:1;}
 throw(){if(!this.holdBoss)return false;
  const dir=this.g.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  this.grabbed.mesh.position.addScaledVector(dir,4.5);this.pilot.s.stun=2.2;
  damageBoss(this.pilot.s,this.s.thermal==='Hot Line'?27:18);addBeastResonance(this.s,24);
  this.holdBoss=false;this.s.held=false;this.grabbed=null;this.note('GALAXY THROW · enemy released with momentum');return true;}
 build(){if(!this.eligible())return false;const p=this.player(),d=this.g.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  const pos=p.clone().addScaledVector(d,4).setY(Math.max(.35,p.y));
  const result=buildConstruct(this.s,this.g.st.gal,{type:this.s.shape,position:{x:pos.x,y:pos.y,z:pos.z}});
  if(!result.ok){this.note(result.reason);return false;}this.g.st.gal=result.gallium;
  const type=this.s.shape,mat=new THREE.MeshStandardMaterial({color:type==='Ramp'?0x6742bd:0x211b31,metalness:.73,roughness:.24,transparent:true,opacity:.8,emissive:0x6d34b2,emissiveIntensity:.4});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(type==='Shield'?3:type==='Brace'?1.1:3,type==='Shield'?2.5:type==='Brace'?3:.35,type==='Shield'?.35:type==='Brace'?.55:4),mat);
  mesh.position.copy(pos);if(type==='Ramp')mesh.rotation.x=-.29;this.root.add(mesh);
  this.constructModels.set(result.id,{mesh,type});
  addBeastResonance(this.s,6);this.note(type+' constructed · '+Math.round(result.cost*100)+'% Gallium allocated');return true;}
 recover(){const p=this.player();let nearest=null,dist=9;
  for(const [id,m] of this.constructModels){const d=p.distanceTo(m.mesh.position);if(d<dist){nearest=id;dist=d;}}
  if(nearest===null)return false;const r=recoverConstruct(this.s,this.g.st.gal,nearest);if(!r.ok)return false;this.g.st.gal=r.gallium;const m=this.constructModels.get(nearest);
  this.root.remove(m.mesh);m.mesh.geometry.dispose();m.mesh.material.dispose();this.constructModels.delete(nearest);
  this.note('Gallium reabsorbed · 80% returned; 20% dissipated');return true;}
 gallop(){if(!this.g.st.board||this.s.focus<12||!this.g.ground()){this.note('Gallium Gallop needs the four-wheel board on a supported surface');return false;}
  const next=spendGallium(this.g.st.gal,.012);if(next===null)return false;this.g.st.gal=next;this.s.focus-=12;
  const dir=this.g.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
  this.g.vel.addScaledVector(dir,7);const ramp=[...this.constructModels.values()].find(v=>v.type==='Ramp'&&this.player().distanceTo(v.mesh.position)<6);if(ramp)this.g.vel.y=Math.max(this.g.vel.y,3.2);this.s.heat=Math.min(100,this.s.heat+7);addBeastResonance(this.s,9);this.note('Gallium Gallop · anchored push, momentum preserved');return true;}
 trick(){if(!this.g.st.board||!this.g.ground()||this.s.focus<8)return false;
  this.s.focus-=8;this.g.vel.y=Math.max(this.g.vel.y,5.5);addBeastResonance(this.s,12);this.note('Board ollie · physical four-wheel launch');return true;}
 mark(){const a=this.nearestAnchor();const p=this.player();const quality=a?clamp(1-a.distanceTo(p)/60,.1,1):0;
  const result=markRifft(this.s,{x:p.x,y:p.y,z:p.z},{valid:!!a,quality});this.note(result.ok?'RIFFT '+result.step+' anchored':result.reason);return result.ok;}
 clearPath(a,b){const colliders=this.g.colliders||[];for(let n=1;n<10;n++){const t=n/10,pt=new THREE.Vector3(a.x+(b.x-a.x)*t,Math.max(.75,a.y),a.z+(b.z-a.z)*t);
   if(colliders.some(c=>c.containsPoint?.(pt)))return false;}return true;}
 cross(returning=false){if(this.rifftMove)return false;const r=this.s.rift;const from=returning?r.destination:r.source,to=returning?r.source:r.destination;
  if(!from||!to||this.player().distanceTo(new THREE.Vector3(from.x,from.y,from.z))>5){this.note('RIFFT requires nearby route entrance');return false;}
  const clear=this.clearPath(from,to),ok=beginRifftTravel(this.s,{clear,grounded:!!this.g.ground()});
  if(!ok){this.note('RIFFT blocked · check anchors, Return integrity and collisions');return false;}
  this.rifftMove={start:this.player().clone(),from:new THREE.Vector3(from.x,from.y,from.z),to:new THREE.Vector3(to.x,to.y,to.z),progress:0,duration:Math.max(.7,Math.hypot(to.x-from.x,to.z-from.z)/22),returning};
  this.note('RIFFT route engaged · physical travel, not teleportation');return true;}
 return(){if(this.s.rift.destination&&this.player().distanceTo(new THREE.Vector3(this.s.rift.destination.x,this.s.rift.destination.y,this.s.rift.destination.z))<5)return this.cross(true);
  this.note('Return requires the destination anchor and intact route.');return false;}
 dominion(){if(!this.eligible())return false;const s=this.s;
  if(!useDominion(s,{anchored:this.anchorCount(),scanned:this.pilot.s.weak>0,gallium:this.g.st.gal})){
    this.note('Crown Dominion: 2 valid anchors, Crown scan, 100 Chord, 35 Focus, heat ≤60 required');return false;}
  this.dominionWindup=1.25;this.note('CROWN DOMINION · WIND-UP → TENSION → INITIATION');return true;}
 createLil(){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x17151f,metalness:.8,roughness:.25});
  const deck=new THREE.Mesh(new THREE.BoxGeometry(.55,.08,.92),m);deck.position.y=.22;g.add(deck);
  const wheel=new THREE.MeshStandardMaterial({color:0xc9a979,roughness:.55});
  for(const x of [-.22,.22])for(const z of [-.29,.29]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.1,10),wheel);w.rotation.z=Math.PI/2;w.position.set(x,.1,z);g.add(w);}
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0x9e65ff,emissive:0x7b35ff,emissiveIntensity:2}));lens.position.y=.39;g.add(lens);
  this.root.add(g);this.lilMesh=g;}
 updateLil(dt){const p=this.player();let goal=p.clone().add(new THREE.Vector3(2,0,2)),s=this.s;
  if(s.lil==='Scout'&&this.pilot.boss?.active)goal=this.pilot.boss.mesh.position.clone().add(new THREE.Vector3(2,0,0));
  if(s.lil==='Repair'){const i=this.pilot.s.repairs.findIndex(r=>!r.done);if(i>=0&&this.pilot.repairs[i])goal=this.pilot.repairs[i].position.clone();}
  if(s.lil==='Recover'&&this.constructModels.size)goal=[...this.constructModels.values()][0].mesh.position.clone();
  const mesh=this.lilMesh,delta=goal.clone().sub(mesh.position).setY(0);if(delta.length()>1)mesh.position.add(delta.clampLength(0,5.2*dt));
  mesh.position.y=Math.max(.1,p.y)+.07+Math.sin(s.time*6)*.025;mesh.rotation.y=Math.atan2(delta.x,delta.z);
  if(!this.eligible())return;
  if(s.lil==='Scout'&&s.time-this.lastScout>13&&mesh.position.distanceTo(this.pilot.boss.mesh.position)<9){this.lastScout=s.time;scanBoss(this.pilot.s);addBeastResonance(s,5);this.note('Lil Heavy scout · weakness recorded');}
  if(s.lil==='Repair'&&s.time-this.lastRepair>1.4){const i=this.pilot.s.repairs.findIndex(r=>!r.done&&this.pilot.repairs[r.id]&&mesh.position.distanceTo(this.pilot.repairs[r.id].position)<3);
   if(i>=0){this.lastRepair=s.time;repairNode(this.pilot.s,i,.10);}}
  if(s.lil==='Recover'&&s.time-this.lastRecover>8){for(const [id,m] of this.constructModels){if(mesh.position.distanceTo(m.mesh.position)<2.7){this.lastRecover=s.time;this.recoverAt(id);break;}}}
 }
 recoverAt(id){const m=this.constructModels.get(id),result=recoverConstruct(this.s,this.g.st.gal,id);if(!m||!result.ok)return false;
  this.g.st.gal=result.gallium;this.root.remove(m.mesh);m.mesh.geometry.dispose();m.mesh.material.dispose();this.constructModels.delete(id);return true;}
 bindInputs(){addEventListener('keydown',e=>{if(!e.altKey||e.repeat)return;const code=e.code;
  if(/^Numpad[1-6]$/.test(code)){e.preventDefault();this.select(Number(code.slice(-1))-1);return;}
  const cmds={Numpad7:()=>this.role(),Numpad8:()=>this.command(),Numpad9:()=>this.build(),Numpad0:()=>this.lil(),
   KeyQ:()=>this.scan(),KeyX:()=>this.snap(),KeyZ:()=>this.thermal(),KeyC:()=>this.shape(),KeyV:()=>this.recover(),
   KeyR:()=>this.mark(),KeyT:()=>this.cross(),Backspace:()=>this.return(),KeyE:()=>this.dominion(),KeyG:()=>this.gallop(),
   Space:()=>this.trick(),KeyH:()=>this.throw(),KeyB:()=>this.build()};if(cmds[code]){e.preventDefault();cmds[code]();}});
  addEventListener('blur',()=>{this.guardUntil=0;});}
 gamepad(){const pad=navigator.getGamepads?.()?.find(x=>x?.connected);if(!pad)return;
  const b=pad.buttons.map(x=>x.pressed),prev=this.lastPad;
  if(b[5]){if(b[12]&&!prev[12])this.select((this.selected()+5)%6);if(b[13]&&!prev[13])this.select((this.selected()+1)%6);
   if(b[0]&&!prev[0])this.scan();if(b[1]&&!prev[1])this.snap();if(b[2]&&!prev[2])this.command();if(b[3]&&!prev[3])this.dominion();}
  this.lastPad=b;}
 updateLines(){const p=this.player(),s=this.s;
  for(let i=0;i<6;i++){const line=this.lines[i],role=s.arms[i],anchor=s.anchorPoints[i],a=p.clone().add(new THREE.Vector3((i%3-1)*.22,1.35,0));
   const phase=s.time*3+i*1.3,spread=(i-2.5)*.56;
   let end=a.clone().add(new THREE.Vector3(spread,1.4+Math.sin(phase)*.25,-2));
   if(role==='Anchor'&&anchor)end=anchor.clone();
   if(this.holdBoss&&s.grabArm===i&&this.grabbed)end=this.grabbed.mesh.position.clone().add(new THREE.Vector3(0,1.4,0));
   if(role==='Guard')end=a.clone().add(new THREE.Vector3(spread*.8,.5,-1.1));
   const attr=line.geometry.attributes.position;
   for(let t=0;t<13;t++){const f=t/12,q=a.clone().lerp(end,f);q.x+=Math.sin(Math.PI*f)*Math.sin(phase+t*.35)*.24;q.y+=Math.sin(Math.PI*f)*.48;q.z+=Math.sin(Math.PI*f)*Math.cos(phase+i)*.22;attr.setXYZ(t,q.x,q.y,q.z);}
   attr.needsUpdate=true;line.material.opacity=i===s.selected?1:.62;
  }}
 tick(){requestAnimationFrame(()=>this.tick());const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
  tickBeast(this.s,dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.holdBoss&&this.grabbed?.mesh){const p=this.player(),d=this.g.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
   this.grabbed.mesh.position.copy(p).addScaledVector(d,3.2);this.grabbed.mesh.position.y=p.y+.35;
   this.pilot.telegraph=0;this.pilot.enemyClock=Math.max(1.5,this.pilot.enemyClock);}
  if(this.rifftMove){const m=this.rifftMove;m.progress=Math.min(1,m.progress+dt/m.duration);
   const ease=m.progress*m.progress*(3-2*m.progress),p=m.start.clone().lerp(m.to,ease);
   this.g.P.o.position.copy(p);this.g.vel.set(0,0,0);
   if(m.progress>=1){finishRifft(this.s,true);this.rifftMove=null;addBeastResonance(this.s,15);this.note('RIFFT route completed · integrity '+Math.round(this.s.rift.integrity)+'%');}}
  if(this.dominionWindup>0){this.dominionWindup-=dt;if(this.dominionWindup<=0){if(this.pilot.boss?.active&&this.eligible()){
      const damage=this.s.thermal==='Hot Line'?76:62;damageBoss(this.pilot.s,damage,{scanned:true});this.pilot.s.stun=3.5;this.note('CROWN DOMINION · controlled six-arm release');}
     this.g.st.gal=Math.max(0,this.g.st.gal-.08);for(const arm of [...this.anchorMass.keys()])this.releaseAnchor(arm);this.s.anchorPoints=[];}}
  this.updateLil(dt);this.updateLines();this.gamepad();if(++this.ticks%15===0)this.renderHUD();}
 renderHUD(){if(!this.status)return;const s=this.s;
  this.status.textContent='ARM '+(s.selected+1)+' '+s.arms[s.selected]+' · Gallium '+Math.round(this.g.st.gal*100)+'% · Focus '+Math.round(s.focus)+' · Heat '+Math.round(s.heat)+' · Chord '+Math.round(s.resonance)+' · '+s.thermal+' · Lil '+s.lil+' · Anchor '+this.anchorCount()+'/2 · '+(s.snapStorm>0?'SNAP STORM ':'')+s.message;
 }
}
