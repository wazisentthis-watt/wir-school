// WIR Connected × METAL Savannah: opt-in native scene pilot. PROPOSAL / PUBLISH HOLD.
// No second renderer, player, campaign, or save writes. Enable ?savannah_native=1.
import * as THREE from 'three';
import {CHAPTERS,ALLIES,createSavannahState,beginSavannah,recruitAlly,collectCitizen,evacuateCitizen,repairNode,damageBoss,damageCity,damagePlayer,citizenHit,reviveCitizen,useAlly,tickSavannah,missionCounts,CAMPAIGN_ORDER,bossPressure,scanBoss} from './savannah_native_core.mjs';
if(new URLSearchParams(location.search).get('savannah_native')==='1')requestAnimationFrame(awaitGame);
function awaitGame(){const g=window.__game;if(!window.__ready||!g?.P?.o?.parent){requestAnimationFrame(awaitGame);return;}try{new NativePilot(g).mount();}catch(e){console.error('Savannah pilot failed:',e);window.__errors?.push(String(e));}}
class NativePilot{
 constructor(g){this.g=g;this.scene=g.P.o.parent;this.s=createSavannahState();this.root=new THREE.Group();this.root.name='WIR_SAVANNAH_NATIVE_HOLD';this.scene.add(this.root);this.actors=[];this.repairs=[];this.fx=[];this.frame=0;this.last=performance.now();this.enemyClock=1;this.telegraph=0;this.hitCD=0;this.holdE=false;this.lastButtons=[];this.origin=new THREE.Vector3();}
 mount(){this.setupUI();this.listen();this.g.savannahNative={snapshot:()=>this.snapshot(),start:n=>this.start(n),interact:()=>this.interact(),attack:()=>this.attack(),ally:n=>this.ally(n),exit:()=>this.exit(),scan:()=>this.scan(),next:()=>this.next()};
  if(new URLSearchParams(location.search).get('savannah_beast')==='1')import('./metal_native_beast_adapter.js').then(m=>m.installNativeBeast(this.g,this)).catch(e=>{console.error('METAL Beast HOLD pilot failed:',e);window.__errors?.push(String(e));});
  requestAnimationFrame(()=>this.tick());}
 snapshot(){return {chapter:this.s.chapter,phase:this.s.phase,city:this.s.city,bossHp:this.s.bossHp,counts:missionCounts(this.s),allies:[...this.s.allies],completed:[...this.s.completed]};}
 setupUI(){const box=document.createElement('section');box.id='savannahNative';box.setAttribute('aria-label','Native Savannah mission pilot');
  box.style.cssText='position:fixed;z-index:45;right:10px;top:80px;width:min(335px,calc(100vw - 20px));max-height:65vh;overflow:auto;background:rgba(10,9,30,.94);border:1px solid #9876db;border-radius:13px;padding:12px;color:#f6edff;font:12px system-ui;box-shadow:0 8px 25px #09051799';
  box.innerHTML='<b style="color:#d5afff">WIR CONNECTED · NATIVE SAVANNAH</b> <small style="color:#ffca74">PROPOSAL</small><div id="svnTitle" style="font-size:14px;font-weight:bold;margin:8px 0"></div><div id="svnState" aria-live="polite"></div><div id="svnActions" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div><div id="svnAllies" style="margin-top:8px"></div><p style="color:#bfb3d9;font-size:11px">E interact/hold to repair · 4/6 or J/K strike · 7/9 blast · Alt+Q Crown scan · Alt+1–4 allies · LB+face buttons · Alt+S next</p>';
  document.body.append(box);this.box=box;this.title=box.querySelector('#svnTitle');this.status=box.querySelector('#svnState');this.actions=box.querySelector('#svnActions');this.team=box.querySelector('#svnAllies');
  for(const n of CAMPAIGN_ORDER)this.button(CHAPTERS[n].title.slice(0,16),()=>this.start(n));
  this.button('NEXT',()=>this.next());this.button('SCAN',()=>this.scan());this.button('Exit',()=>this.exit());
  this.button('INTERACT',()=>this.interact(),'hold');this.button('STRIKE',()=>this.attack());this.button('BLAST',()=>this.attack(1.7));this.renderUI();}
 button(label,fn,mode){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='border:1px solid #9576d8;border-radius:7px;padding:8px;color:#fff;background:#35204f;cursor:pointer';
  b.addEventListener('click',fn);if(mode==='hold'){b.addEventListener('pointerdown',()=>this.holdE=true);for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>this.holdE=false);}this.actions.append(b);return b;}
 listen(){addEventListener('keydown',e=>{if(e.altKey&&e.code==='KeyS'){e.preventDefault();this.next();return;}
   if(e.altKey&&e.code==='KeyQ'){e.preventDefault();this.scan();return;}
   if(e.altKey&&/^Digit[1-4]$/.test(e.code)){e.preventDefault();this.ally(['Ayo','Sana','Binta','Zola'][Number(e.code.slice(-1))-1]);return;}
   if(this.s.phase!=='playing'||e.repeat)return;
   if(['Numpad4','Numpad6','KeyJ','KeyK'].includes(e.code))this.attack(1);
   if(['Numpad7','Numpad9'].includes(e.code))this.attack(1.7);
   if(e.code==='KeyE')this.interact();});
  addEventListener('keyup',e=>{if(e.code==='KeyE')this.holdE=false;});addEventListener('blur',()=>this.holdE=false);}
 clear(){for(const child of [...this.root.children]){this.root.remove(child);child.traverse?.(o=>{o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose?.();}});}
  this.actors=[];this.repairs=[];this.fx=[];}
 mat(color,glow=0){return new THREE.MeshStandardMaterial({color,metalness:.43,roughness:.44,emissive:color,emissiveIntensity:glow});}
 ring(x,z,color,scale=1){const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.TorusGeometry(scale,.09*scale,8,32),new THREE.MeshBasicMaterial({color}));mesh.rotation.x=Math.PI/2;mesh.position.y=.1;root.add(mesh);root.position.set(x,this.origin.y,z);this.root.add(root);return root;}
 model(color){const g=new THREE.Group(),m=this.mat(color,.1),torso=new THREE.Mesh(new THREE.CylinderGeometry(.38,.3,1.05,8),m);
  torso.position.y=1.24;g.add(torso);const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.29,1),this.mat(color,.28));head.position.y=2.05;g.add(head);
  for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(.2,.88,.25),m);arm.position.set(side*.53,1.24,0);g.add(arm);const leg=new THREE.Mesh(new THREE.BoxGeometry(.24,.7,.27),m);leg.position.set(side*.2,.42,0);g.add(leg);}return g;}
 actor(kind,id,x,z,color){const mesh=this.model(color),actor={kind,id,mesh,active:true,t:0};mesh.position.set(this.origin.x+x,this.origin.y,this.origin.z+z);this.root.add(mesh);this.actors.push(actor);return actor;}
 start(index){if(!beginSavannah(this.s,index))return;this.beast?.onMissionStart?.();this.clear();this.origin.copy(this.g.P.o.position);this.origin.y=Math.max(.15,Math.min(1,this.origin.y));this.enemyClock=1.4;this.telegraph=0;this.hitCD=0;
  // All entities live in the existing Connected Three.js scene near the actual player.
  const chapter=CHAPTERS[index],palette={brace:0x70808f,heat:0xff703b,brittle:0xa9bfe5,jam:0x8b4eff,redirect:0xda466a,infrastructure:0xffcb66};
  this.boss=this.actor('boss',index,0,-13,palette[chapter.pattern]??(index?0xbc42dc:0x259bb6));this.boss.mesh.scale.setScalar(index===7?1.72:1.4);
  this.warning=this.ring(this.boss.mesh.position.x,this.boss.mesh.position.z,0xff4a69,3);this.warning.visible=false;
  this.refuge=this.ring(this.origin.x+10,this.origin.z+7,0x55eaff,1.9);
  for(let i=0;i<chapter.citizens;i++)this.actor('citizen',i,-10+i*6,-5+(i%2)*4,0xcaa17f);
  const nodeCoords=[[-11,-12],[12,-11],[0,11]];
  for(let i=0;i<chapter.repairs;i++){const [x,z]=nodeCoords[i];this.repairs.push(this.ring(this.origin.x+x,this.origin.z+z,0xffbd64,1));}
  chapter.allies.forEach((n,i)=>this.actor('ally',n,i?9:-9,5,i?0xd17cea:0x7aa7ff));
  this.s.message='In-world mission active. Recruit allies, protect civilians, repair nodes, defeat the boss.';this.renderUI();}
 next(){const current=CAMPAIGN_ORDER.indexOf(this.s.chapter),following=this.s.phase==='complete'?current+1:CAMPAIGN_ORDER.findIndex(i=>!this.s.completed.includes(i));this.start(CAMPAIGN_ORDER[Math.max(0,Math.min(following,CAMPAIGN_ORDER.length-1))]);}
 scan(){const p=this.g.P.o.position;if(this.boss&&Math.hypot(p.x-this.boss.mesh.position.x,p.z-this.boss.mesh.position.z)<30){return scanBoss(this.s);}this.s.message='Crown scan out of range. Close the distance.';return false;}
 exit(){this.clear();this.s.active=false;this.s.phase='idle';this.renderUI();}
 nearest(kind,max=4){const p=this.g.P.o.position;let best=null,d=max;for(const a of this.actors){if(a.kind!==kind||!a.active)continue;const dx=p.x-a.mesh.position.x,dz=p.z-a.mesh.position.z,h=Math.hypot(dx,dz);if(h<d){d=h;best=a;}}return best;}
 interact(){if(this.s.phase!=='playing')return false;
  const a=this.nearest('ally');if(a&&recruitAlly(this.s,a.id)){a.active=false;a.mesh.visible=false;return true;}
  const c=this.nearest('citizen');if(c){const v=this.s.citizens[c.id];if(v.mode==='waiting')return collectCitizen(this.s,c.id);if(v.mode==='injured')return reviveCitizen(this.s,c.id);}
  const p=this.g.P.o.position;for(let i=0;i<this.repairs.length;i++){if(this.s.repairs[i].done)continue;const r=this.repairs[i].position;if(Math.hypot(p.x-r.x,p.z-r.z)<4){if(this.s.jammed>0)return false;return repairNode(this.s,i,.08);}}
  this.s.message='Move near a recruit, a civilian, or an amber repair node.';return false;}
 ally(name){if(this.s.phase!=='playing')return false;const ok=useAlly(this.s,name);if(ok)this.renderUI();return ok;}
 attack(weight=1){if(this.s.phase!=='playing'||this.hitCD>0||!this.boss?.active)return false;
  const p=this.g.P.o.position,target=this.boss.mesh.position,dist=Math.hypot(p.x-target.x,p.z-target.z);
  const dir=this.g.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize(),diff=target.clone().sub(p).setY(0);
  if(dist>(weight>1?13:7)||(dist>=2&&dir.dot(diff.normalize())<0))return false;
  const cost=weight>1?.045:0;if(this.g.st.gal<cost){this.s.message='Not enough Galaxy Gallium for blast';return false;}
  if(cost)this.g.st.gal=Math.max(0,this.g.st.gal-cost);this.hitCD=weight>1?.65:.27;damageBoss(this.s,weight>1?14:8);
  const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(weight>1?.7:.35,1),this.mat(0xb574ff,.9));flash.position.copy(target).add(new THREE.Vector3(0,1.4,0));this.root.add(flash);this.fx.push({mesh:flash,life:.32});return true;}
 gamepad(){const pad=navigator.getGamepads?.()?.find(p=>p?.connected);if(!pad)return;const keys=pad.buttons.map(b=>b.pressed);if(this.s.phase==='playing'&&keys[4])for(let i=0;i<4;i++){if(keys[i]&&!this.lastButtons[i])this.ally(['Sana','Zola','Ayo','Binta'][i]);}this.lastButtons=keys;}
 tick(){requestAnimationFrame(()=>this.tick());const t=performance.now(),dt=Math.min(.05,Math.max(0,(t-this.last)/1000));this.last=t;this.frame++;
  if(this.s.phase==='playing'){tickSavannah(this.s,dt);this.hitCD=Math.max(0,this.hitCD-dt);const p=this.g.P.o.position,b=this.boss,dist=Math.hypot(p.x-b.mesh.position.x,p.z-b.mesh.position.z);
   if(this.s.bossHp>0){if(!this.beast?.holdBoss&&this.s.stun<=0&&dist>6&&dist<30){const speed=(this.s.chapter?1.55:1.15)*dt;b.mesh.position.x+=(p.x-b.mesh.position.x)/dist*speed;b.mesh.position.z+=(p.z-b.mesh.position.z)/dist*speed;}
    b.mesh.rotation.y+=dt*.6;const bossDt=dt*(this.beast?.slowFactor?.()??1);this.enemyClock-=this.beast?.holdBoss?0:bossDt;
    if(this.telegraph>0&&!this.beast?.holdBoss){this.telegraph-=bossDt;this.warning.position.x=b.mesh.position.x;this.warning.position.z=b.mesh.position.z;this.warning.visible=true;
      const pulse=1+.2*Math.sin(performance.now()/90);this.warning.scale.setScalar(pulse);
      if(this.telegraph<=0){this.warning.visible=false;bossPressure(this.s,dist<8,!!this.g.keys.Numpad2||!!this.beast?.guarding?.());
       const hurt=this.actors.find(a=>a.kind==='citizen'&&this.s.citizens[a.id].mode!=='safe'&&a.mesh.position.distanceTo(b.mesh.position)<5);
       if(hurt)citizenHit(this.s,hurt.id,22);this.enemyClock=this.s.chapter>=2?2.8:3.5;}}
    else if(this.enemyClock<=0){this.telegraph=.9;this.enemyClock=0;this.s.message='RED SIGNAL: '+CHAPTERS[this.s.chapter].boss+' winding up! Brace or move.';}
   }else{b.active=false;b.mesh.visible=false;if(this.warning)this.warning.visible=false;}
   for(const a of this.actors)if(a.kind==='citizen'){const c=this.s.citizens[a.id];a.mesh.visible=c.mode!=='safe';if(c.mode==='injured')a.mesh.rotation.z=Math.PI/2;else a.mesh.rotation.z=0;
    if(c.mode==='following'){const target=p.clone().add(new THREE.Vector3((a.id-1)*1.25,0,2+a.id*.5)),d=target.sub(a.mesh.position).setY(0);if(d.length()>1.2)a.mesh.position.add(d.clampLength(0,3.4*dt));
      if(Math.hypot(a.mesh.position.x-this.refuge.position.x,a.mesh.position.z-this.refuge.position.z)<3)evacuateCitizen(this.s,a.id);}
   }
   for(let i=0;i<this.repairs.length;i++){const mesh=this.repairs[i],node=this.s.repairs[i];mesh.visible=!node.done;if(node.done)continue;
    if(this.s.jammed<=0&&(this.holdE||this.g.keys.KeyE)&&Math.hypot(p.x-mesh.position.x,p.z-mesh.position.z)<4)repairNode(this.s,i,dt*.3);}
  }
  for(let i=this.fx.length-1;i>=0;i--){const fx=this.fx[i];fx.life-=dt;fx.mesh.scale.addScalar(dt*2);if(fx.life<=0){this.root.remove(fx.mesh);fx.mesh.geometry.dispose();fx.mesh.material.dispose();this.fx.splice(i,1);}}
  this.gamepad();if(this.frame%12===0)this.renderUI();}
 renderUI(){if(!this.status)return;const s=this.s;
  if(s.phase==='idle'){this.title.textContent='Eight native missions · Morrow City → Savannah';this.status.textContent='Same Connected METAL, camera, Savannah world and movement. Missions are separate proposal-only progress.';}
  else{const c=missionCounts(s);this.title.textContent=CHAPTERS[s.chapter].title+' · '+s.phase.toUpperCase();this.status.textContent='CITY '+Math.round(s.city)+'% · METAL '+Math.round(s.player)+'% · BOSS '+Math.ceil(s.bossHp)+' HP · SAFE '+c.safe+'/'+c.total+' · REPAIRS '+c.repairs+'/'+c.required+'. '+s.message;}
  this.team.replaceChildren();if(s.phase==='playing'){this.team.append(document.createTextNode('Allies (E to recruit): '));for(const name of CHAPTERS[s.chapter].allies){const b=document.createElement('button');b.textContent=name+(s.allies.includes(name)?' · POWER':' · FIND');b.disabled=!s.allies.includes(name)||s.allyCooldown[name]>0;b.style.cssText='margin:3px;border-radius:6px;background:#463267;color:#fff;border:1px solid #a78bd8;padding:5px';b.addEventListener('click',()=>this.ally(name));this.team.append(b);}}
  if(s.phase==='complete')this.team.textContent='Chapter cleared. Press NEXT for the following assignment.';
 }
}
