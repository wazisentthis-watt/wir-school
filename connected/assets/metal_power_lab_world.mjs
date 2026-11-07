// METAL Morrow District Power Lab • opt-in playable scene adapter.
// Does not install when ?metal_abilities=1 is absent. No replacement locomotion
// controller, no global collision override, no first-mission save mutation.
// PROPOSAL / PUBLISH HOLD. Structures are original test-zone geometry, not the
// whole city's deformability or a claim that all 73 abilities are implemented.
import {makePowerLab,stepPowerLab,powerLabSnapshot,powerLabSave,
 applyPowerLab,POWER_LAB_SAVE_KEY,POWER_LAB_PICKUP_IDS} from './metal_power_lab_core.mjs';
import {METAL_POWER_REGISTRY,registryCounts} from './metal_power_registry_73.mjs';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
const LIMIT=10;
export function mountMetalPowerLab({THREE,scene,P,st,vel,colliders,camera,grounded,storage}){
 if(!THREE||!scene||!P?.o||!st||!vel||!Array.isArray(colliders))
  throw Error('METAL_POWER_LAB_MISSING_HOST');
 let raw=null;
 try{const s=storage?.getItem(POWER_LAB_SAVE_KEY);if(typeof s==='string'&&s.length<40000)raw=JSON.parse(s);}
 catch{} // private/quota-restricted Safari is allowed to keep an in-memory run
 const S=makePowerLab(raw),live=new Map(),pickupMeshes=new Map();
 const root=document.createElement('div');root.id='metalPowerLab';
 root.style.cssText='position:fixed;right:calc(12px + env(safe-area-inset-right,0px));top:calc(55px + env(safe-area-inset-top,0px));z-index:53;font:12px system-ui;color:#f2eafd;max-width:min(345px,90vw)';
 const trigger=document.createElement('button');trigger.type='button';trigger.textContent='⚙ METAL ABILITY LAB';
 trigger.setAttribute('aria-label','Toggle the opt-in Metal abilities and mission laboratory');
 trigger.style.cssText='background:#211c38;color:white;border:1px solid #8f7bd4;padding:8px 12px;border-radius:12px;font:700 12px system-ui;min-height:42px;touch-action:manipulation;cursor:pointer';
 const panel=document.createElement('section');panel.hidden=true;panel.id='metalPowerLabPanel';
 panel.style.cssText='margin-top:6px;background:#141226f2;border:1px solid #7c6aa1;border-radius:12px;padding:11px;max-height:68vh;overflow:auto;box-shadow:0 8px 30px #0008';
 const status=document.createElement('p');status.style.cssText='font-size:12px;line-height:1.45;margin:7px 0;color:#e4d4ff';
 const stats=document.createElement('p');stats.style.cssText='font-variant-numeric:tabular-nums;margin:4px 0 9px;color:#c4bddc';
 const actions=document.createElement('div');actions.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px';
 const note=document.createElement('p');note.textContent='Only listed LAB mechanics run here. The other entries are a roadmap, not 73 finished attacks. No live-story saves or canon changes.';
 note.style.cssText='font-size:10px;color:#aeb3ca;line-height:1.4';
 const feedback=document.createElement('div');feedback.id='metalPowerLabFeedback';feedback.setAttribute('role','status');
 feedback.style.cssText='font-size:11px;min-height:26px;color:#c8eeca;margin-top:6px';
 const codexBtn=document.createElement('button');codexBtn.type='button';codexBtn.textContent='VIEW ALL 73 POWER ENTRIES';
 codexBtn.style.cssText=trigger.style.cssText+';width:100%;font-size:10px;margin-top:10px';
 const codex=document.createElement('div');codex.hidden=true;codex.style.cssText='max-height:250px;overflow:auto;font-size:10px;color:#ddd7ee;margin-top:9px';
 const makeBtn=(label,action)=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.ability=action;
  b.style.cssText='color:white;background:#393050;border:1px solid #8174ad;border-radius:8px;min-height:40px;padding:8px;font:600 11px system-ui;touch-action:manipulation';
  b.addEventListener('click',()=>perform(action));actions.append(b);return b;
 };
 const buttons={
  scan:makeBtn('PRESSURE READ','scan'),
  collect:makeBtn('COLLECT SCRAP','collect'),
  reinforce:makeBtn('REINFORCE','reinforce'),
  build:makeBtn('BUILD PANEL','build'),
  impact:makeBtn('TEST IMPACT','impact'),
  reclaim:makeBtn('RECLAIM','reclaim'),
  step:makeBtn('SNAP STEP','snap-step')
 };
 panel.append(status,stats,actions,feedback,codexBtn,codex,note);root.append(trigger,panel);
 trigger.addEventListener('click',()=>{panel.hidden=!panel.hidden;draw();});
 codexBtn.addEventListener('click',()=>{codex.hidden=!codex.hidden;if(!codex.hidden){
  codex.textContent='';
  for(const a of METAL_POWER_REGISTRY){
   const item=document.createElement('p');item.style.margin='3px 0';
   item.textContent=String(a.id).padStart(2,'0')+' · '+a.name+' ['+a.status+']';
   codex.append(item);
  }
 }});
 document.body.append(root);
 const silver=new THREE.MeshStandardMaterial({color:0x8998a8,metalness:.75,roughness:.3});
 const amber=new THREE.MeshStandardMaterial({color:0xa47b64,metalness:.4,roughness:.6});
 const broken=new THREE.MeshStandardMaterial({color:0x694740,metalness:.4,roughness:.85});
 const pickupMat=new THREE.MeshStandardMaterial({color:0xc4acdb,emissive:0x38215d,emissiveIntensity:.5,metalness:.5,roughness:.32});
 const geoPanel=new THREE.BoxGeometry(2.7,2.3,.42);
 const geoSupport=new THREE.BoxGeometry(2.1,3.2,.6);
 const pickupGeo=new THREE.DodecahedronGeometry(.34);
 const center=P.o.position.clone();
 const offsets=[[-3,-6],[2,-9],[11,-1],[10,8],[-7,9]];
 const anchors=Object.freeze(POWER_LAB_PICKUP_IDS.map((id,i)=>({
  id,x:center.x+offsets[i][0],z:center.z+offsets[i][1]
 })));
 const supportPos=new THREE.Vector3(center.x+6,1.7,center.z+6);
 const support=new THREE.Mesh(geoSupport,amber);support.position.copy(supportPos);
 support.name='WIR_TESTLAB_DAMAGED_SUPPORT';support.castShadow=true;scene.add(support);
 let supportCollider=null;
 function attachCollider(mesh){
  const box=new THREE.Box3().setFromObject(mesh);
  colliders.push(box);return box;
 }
 function removeCollider(box){if(!box)return;const i=colliders.indexOf(box);if(i>=0)colliders.splice(i,1);}
 function renderSupport(){
  support.material=S.supportIntegrity>=.8?silver:amber;
  support.scale.y=.6+.4*S.supportIntegrity;
  support.position.y=supportPos.y-(3.2*(1-support.scale.y))/2;
  if(supportCollider)supportCollider.setFromObject(support);
 }
 supportCollider=attachCollider(support);renderSupport();
 for(const a of anchors){
  if(S.collected.includes(a.id))continue;
  const mesh=new THREE.Mesh(pickupGeo,pickupMat);mesh.position.set(a.x,.75,a.z);
  mesh.name='WIR_TESTLAB_SALVAGE_'+a.id;mesh.castShadow=true;scene.add(mesh);pickupMeshes.set(a.id,mesh);
 }
 function syncPanels(){
  for(const o of S.structures){
   if(live.has(o.id))continue;
   const mesh=new THREE.Mesh(geoPanel,silver);
   mesh.name='WIR_TESTLAB_PANEL_'+o.id;
   mesh.position.set(o.pos.x,1.2,o.pos.z);mesh.castShadow=true;scene.add(mesh);
   live.set(o.id,{mesh,box:attachCollider(mesh)});
  }
  for(const [id,item] of [...live]){
   const o=S.structures.find(s=>s.id===id);
   if(!o){removeCollider(item.box);scene.remove(item.mesh);live.delete(id);continue;}
   item.mesh.scale.y=Math.max(.14,o.integrity);
   item.mesh.position.y=1.2*item.mesh.scale.y;
   item.mesh.material=o.integrity>.55?silver:broken;
   if(o.integrity>.12){
    if(!item.box){item.box=attachCollider(item.mesh);}
    else item.box.setFromObject(item.mesh);
   }else{removeCollider(item.box);item.box=null;}
  }
 }
 syncPanels();
 // Gallium committed to restored structures must not be regenerated on reload.
 const committed=S.structures.reduce((v,o)=>v+o.spentGal,0);
 st.gal=Math.max(0,(finite(st.gal)?st.gal:0)-committed);
 const scanRing=new THREE.Mesh(new THREE.RingGeometry(2.8,3,48),
  new THREE.MeshBasicMaterial({color:0xa8e4ff,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));
 scanRing.rotation.x=-Math.PI/2;scanRing.visible=false;scene.add(scanRing);
 let scanLife=0,shownStatus='',saveOk=true,frame=0,closed=false;
 const c3=new THREE.Vector3();
 const closeObject=(pos,maxDist=4)=>Math.hypot(pos.x-P.o.position.x,pos.z-P.o.position.z)<=maxDist;
 const nearestPickup=()=>{
  let best=null;
  for(const [id,m] of pickupMeshes){const d=P.o.position.distanceTo(m.position);
   if(!best||d<best.dist)best={id,mesh:m,dist:d};}
  return best;
 };
 const nearestStructure=()=>{
  let best={id:'district-support',dist:P.o.position.distanceTo(support.position)};
  for(const [id,m] of live){const d=P.o.position.distanceTo(m.mesh.position);
   if(d<best.dist)best={id,dist:d};}
  return best;
 };
 const nearestPanel=()=>{
  let best=null;
  for(const [id,m] of live){const d=P.o.position.distanceTo(m.mesh.position);
   if(!best||d<best.dist)best={id,dist:d};}
  return best;
 };
 function save(){
  try{storage?.setItem(POWER_LAB_SAVE_KEY,JSON.stringify(powerLabSave(S)));saveOk=true;}
  catch{saveOk=false;}
 }
 function direction(){
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);dir.y=0;
  if(dir.lengthSq()<.1)return {x:0,z:1};
  dir.normalize();return {x:dir.x,z:dir.z};
 }
 function draw(){
  if(closed)return;
  const q=powerLabSnapshot(S);const title=q.stageTitle;
  if(title!==shownStatus){shownStatus=title;}
  status.textContent='MISSION '+Math.min(q.stage+1,5)+'/5 · '+title;
  stats.textContent='Salvage '+q.scrap+' · Gallium '+Math.round(Math.max(0,st.gal)*100)+'% · Focus '+Math.round(q.focus*100)+'% · Physical panels '+q.structures.length;
  for(const [key,b] of Object.entries(buttons))b.disabled=
   key==='build'&&!q.unlocks.build||key==='reinforce'&&!q.unlocks.reinforce||key==='step'&&!q.unlocks.snapStep||
   key==='impact'&&!q.unlocks.impact;
 }
 function perform(action){
  if(closed)return;
  const nearObj=action==='collect'?nearestPickup():action==='reinforce'?nearestStructure():nearestPanel();
  const dir=direction(),player=P.o.position;
  const point={x:player.x+dir.x*4.5,z:player.z+dir.z*4.5};
  // Prevent construction inside an existing wall or occupied collision geometry.
  if(action==='build'){
   const occupied=colliders.some(b=>point.x>b.min.x-.5&&point.x<b.max.x+.5&&point.z>b.min.z-.5&&point.z<b.max.z+.5);
   if(occupied){feedback.textContent='BLOCKED · An existing collider occupies this location';return;}
  }
  const result=applyPowerLab(S,action,{
   id:nearObj?.id, distance:action==='build'?4.5:nearObj?.dist??Infinity,
   gallium:st.gal,point,dir,grounded:!!grounded()
  });
  if(!result.ok){feedback.textContent='BLOCKED · '+result.reason.replace(/-/g,' ');draw();return result;}
  st.gal=Math.min(1,Math.max(0,(finite(st.gal)?st.gal:0)-result.spentGal+result.returnedGal));
  if(action==='collect'){
   const m=pickupMeshes.get(result.id);if(m){scene.remove(m);pickupMeshes.delete(result.id);}
   feedback.textContent='SALVAGE COLLECTED · '+result.id;
  }else if(action==='scan'){
   scanLife=result.seconds;scanRing.visible=true;
   feedback.textContent='PRESSURE READ · nearby support and constructed panels outlined by scan';
  }else if(action==='snap-step'){
   const old=Math.hypot(vel.x,vel.z);
   vel.x+=result.impulse.x;vel.z+=result.impulse.z;
   const sp=Math.hypot(vel.x,vel.z);
   if(sp>22){vel.x*=22/sp;vel.z*=22/sp;}
   feedback.textContent='SNAP STEP · '+Math.round(Math.hypot(vel.x,vel.z)-old)+' m/s directional impulse';
  }else if(action==='reinforce'){renderSupport();syncPanels();
   feedback.textContent='REINFORCED · real support geometry and contact bounds updated';
  }else if(action==='build'){syncPanels();feedback.textContent='BUILT · collision-enabled Gallium panel';}
  else if(action==='impact'){syncPanels();feedback.textContent='IMPACT · structure damaged and collision updated';}
  else if(action==='reclaim'){syncPanels();feedback.textContent='RECLAIMED · surviving Gallium returned';}
  save();draw();return result;
 }
 function tick(dt){
  if(closed)return;
  stepPowerLab(S,dt);
  scanLife=Math.max(0,scanLife-Math.max(0,Math.min(.1,dt||0)));
  scanRing.visible=scanLife>0;
  if(scanRing.visible){scanRing.position.set(support.position.x,.34,support.position.z);scanRing.material.opacity=.28+.35*(scanLife/5);}
  if(++frame%12===0){
   for(const [id,m] of pickupMeshes){m.rotation.y+=.06;const a=anchors.find(x=>x.id===id);m.position.y=.75+.12*Math.sin(S.clock*2+m.position.x);}
   if(!panel.hidden)draw();
  }
 }
 function snapshot(){return {...powerLabSnapshot(S),registry:registryCounts(),saveKey:POWER_LAB_SAVE_KEY,saveOk,
  sceneObjects:{support:1,panels:live.size,salvage:pickupMeshes.size},attached:true};}
 function destroy(){
  if(closed)return;closed=true;
  removeCollider(supportCollider);scene.remove(support);scene.remove(scanRing);
  for(const {mesh,box} of live.values()){removeCollider(box);scene.remove(mesh);}
  for(const m of pickupMeshes.values())scene.remove(m);
  root.remove();geoPanel.dispose();geoSupport.dispose();pickupGeo.dispose();
  scanRing.geometry.dispose();scanRing.material.dispose();
  silver.dispose();amber.dispose();broken.dispose();pickupMat.dispose();
 }
 return Object.freeze({tick,snapshot,perform,destroy});
}
