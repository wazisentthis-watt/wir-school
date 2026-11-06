// WIR Connected Build 04 · METAL visual evolution. PROPOSAL / PUBLISH HOLD.
// Uses existing player, mission actors, original meshes, renderer and save state.
// Optional add-on: ?savannah_native=1&savannah_beast=1&savannah_visual=1
import * as THREE from 'three';
import {CHAPTERS} from './savannah_native_core.mjs';
import {BOSS_STYLES,visualWorld,visualBudget,cinematicBeat,hitVolume,closestCollision,sceneSeed} from './metal_visual_rules.mjs';
const V=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
const txt=(n)=>Math.round(n*10)/10;
const safeDispose=(root)=>root?.traverse(o=>{o.geometry?.dispose?.();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose?.();m.dispose?.();}});
function geometry(samples,sides){
 const geo=new THREE.BufferGeometry(),verts=new Float32Array((samples+1)*sides*3),indices=[];
 for(let j=0;j<samples;j++)for(let k=0;k<sides;k++){const a=j*sides+k,b=j*sides+(k+1)%sides,c=(j+1)*sides+k,d=(j+1)*sides+(k+1)%sides;indices.push(a,c,b,b,c,d);}
 geo.setAttribute('position',new THREE.BufferAttribute(verts,3));geo.setIndex(indices);return geo;
}
function worldCanvasLabel(message,color){
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#100b1f';x.fillRect(0,0,512,128);
 x.strokeStyle=color;x.lineWidth=8;x.strokeRect(4,4,504,120);x.fillStyle='#ede6ff';x.font='bold 29px system-ui';x.textAlign='center';x.fillText(message.slice(0,28).toUpperCase(),256,77);
 const tex=new THREE.CanvasTexture(c),mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,transparent:true});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.85),mat);mesh.position.set(0,3.1,0);return mesh;
}
export function installVisualEvolution(g,pilot,beast){
 const v=new VisualEvolution(g,pilot,beast);v.mount();return v;
}
class VisualEvolution{
 constructor(g,pilot,beast){
  this.g=g;this.pilot=pilot;this.beast=beast;this.scene=g.P.o.parent;
  this.root=new THREE.Group();this.root.name='WIR_BUILD04_VISUAL_EVOLUTION_HOLD';this.scene.add(this.root);
  this.arms=[];this.env=new THREE.Group();this.root.add(this.env);this.fx=new THREE.Group();this.root.add(this.fx);
  this.bossMesh=null;this.halo=null;this.warning=null;this.activeChapter=-1;this.activeBoss=null;
  this.intro=0;this.introDone=false;this.previousTelegraph=0;this.facing={x:0,z:1};
  this.frame=0;this.last=performance.now();this.light=null;this.lite=new URLSearchParams(location.search).get('lite')==='1';
  this.budget=visualBudget(this.lite);this.originalFog=this.scene.fog;
 }
 mount(){
  this.setupTentacles();this.createHUD();this.pilot.visualAttackHit=()=>this.hitPlayer();
  this.g.metalVisual={snapshot:()=>this.snapshot(),skipIntro:()=>this.skipIntro(),world:()=>visualWorld(CHAPTERS[this.activeChapter]),chapter:()=>this.activeChapter};
  requestAnimationFrame(()=>this.tick());
 }
 snapshot(){
  return {chapter:this.activeChapter,sceneShared:this.scene===this.g.P.o.parent,armMeshes:this.arms.length,
   tubeTriangles:this.arms.reduce((a,v)=>a+(v.tube.geometry.index?.count||0)/3,0),
   bossDecor:!!this.bossMesh,environmentPieces:this.env.children.length,
   bossName:CHAPTERS[this.activeChapter]?.boss||null,
   cinematic:cinematicBeat(this.intro),telegraph:this.warning?.visible||false,originalRig:!!this.g.P.model};
 }
 makeMat(color=0x13111c,emissive=0x7443ad,intensity=.25){
  return new THREE.MeshStandardMaterial({color,metalness:.86,roughness:.22,emissive,emissiveIntensity:intensity,side:THREE.DoubleSide});
 }
 setupTentacles(){
  const {tentacleSamples:n,tentacleSides:sides}=this.budget;
  for(let i=0;i<6;i++){
   const geo=geometry(n,sides),mat=this.makeMat(i%2?0x080913:0x14121d,0x5823ae,.3);
   const mesh=new THREE.Mesh(geo,mat);mesh.name='Gallium_Coil_Tentacle_'+(i+1);mesh.frustumCulled=false;this.root.add(mesh);
   // Sound-cord tracer: a broken violet music staff embedded in the metallic surface.
   const traceGeo=new THREE.BufferGeometry(),traceArray=new Float32Array((n+1)*3);
   traceGeo.setAttribute('position',new THREE.BufferAttribute(traceArray,3));
   const tracer=new THREE.Line(traceGeo,new THREE.LineBasicMaterial({color:0xab68ff,transparent:true,opacity:.85}));
   tracer.frustumCulled=false;this.root.add(tracer);
   const tip=new THREE.Mesh(new THREE.ConeGeometry(.31,.95,7),this.makeMat(0x100e1c,0xb452ff,.7));this.root.add(tip);
   this.arms.push({tube:mesh,tracer,tip,index:i});
   if(this.beast.lines[i])this.beast.lines[i].visible=false;
  }
 }
 createHUD(){
  const e=document.createElement('div');e.id='wirBuild04Intro';
  e.style.cssText='position:fixed;z-index:47;top:12%;left:50%;transform:translateX(-50%);width:min(390px,90vw);border:1px solid #9b6bd4;border-radius:13px;background:linear-gradient(155deg,#100d20ec,#241637d9);color:#f6edff;padding:15px 18px;font:12px system-ui;box-shadow:0 10px 50px #070014b0;text-align:center;pointer-events:auto;display:none';
  e.innerHTML='<div id="wir04Beat" style="font-size:11px;color:#bf8cff;letter-spacing:.2em"></div><div id="wir04Boss" style="font-size:23px;font-weight:900;letter-spacing:.05em;margin:8px 0"></div><div id="wir04World" style="opacity:.8"></div><button id="wir04Skip" style="margin-top:12px;border:1px solid #b18bff;color:#eee;background:#332054;padding:7px 13px;border-radius:7px">Skip intro</button>';
  document.body.append(e);e.querySelector('#wir04Skip').addEventListener('click',()=>this.skipIntro());
  this.hud=e;this.hudBeat=e.querySelector('#wir04Beat');this.hudBoss=e.querySelector('#wir04Boss');this.hudWorld=e.querySelector('#wir04World');
 }
 skipIntro(){this.intro=3.5;this.introDone=true;this.hud.style.display='none';if(this.bossMesh){this.bossMesh.scale.setScalar(1);this.pilot.boss.mesh.visible=true;}if(this.halo)this.halo.scale.setScalar(1.35);}
 cylinder(radius,height,color,parent,x,y,z,radial=8){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius*.95,height,radial),this.makeMat(color,color,.12));
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 block(parent,w,h,d,color,x,y,z){
  const box=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.makeMat(color,color,.11));
  box.position.set(x,y,z);parent.add(box);return box;
 }
 crystal(parent,x,y,z,size,color){
  const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(size,0),this.makeMat(0x100c1e,color,.8));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 torus(parent,r,t,color,x,y,z){
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,6,20),this.makeMat(0x0c0c18,color,.8));
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 dressBoss(chapter){
  const source=this.pilot.boss?.mesh;if(!source)return;
  const style=BOSS_STYLES[chapter.boss];const g=new THREE.Group();g.name='WIR_BOSS_GEAR_'+chapter.boss.replace(/\s/g,'_');source.add(g);this.bossMesh=g;
  const base=style.palette,accent=style.accent;
  if(style.geometry==='plates'){
   for(const x of [-.58,.58]){this.block(g,.69,.36,.54,base,x,1.55,.02);this.block(g,.43,.46,.6,base,x,1.12,.12);}
   this.block(g,1.25,.46,.62,base,0,1.0,0);
  }else if(style.geometry==='vents'){
   for(const x of [-.5,.5]){this.cylinder(.22,.9,base,g,x,1.25,.2);for(let n=0;n<3;n++)this.torus(g,.23,.045,accent,x,1.02+n*.22,.22).rotation.x=Math.PI/2;}
   this.crystal(g,0,1.65,.4,.25,accent);
  }else if(style.geometry==='shards'){
   for(let i=0;i<8;i++){const a=i*Math.PI*2/8;this.crystal(g,Math.cos(a)*.74,1.4+Math.sin(i*7)*.25,Math.sin(a)*.35,.29+(i%3)*.07,accent);}
  }else if(style.geometry==='coils'){
   for(let i=0;i<5;i++){const t=this.torus(g,.46+i*.11,.035,accent,0,1.2+i*.13,.13);t.rotation.x=(i%2)*.5;t.rotation.y=i*.21;}
  }else if(style.geometry==='fins'){
   for(const x of [-.53,.53]){const fin=this.crystal(g,x,1.7,.12,.42,accent);fin.scale.set(.5,1.5,.45);fin.rotation.z=x*.8;}
   this.block(g,.64,.2,.52,base,0,.94,.2);
  }else if(style.geometry==='machine'){
   for(let i=0;i<4;i++){const a=i*Math.PI/2;const arm=this.block(g,.22,.85,.22,base,Math.sin(a)*.66,1.65,Math.cos(a)*.55);arm.rotation.z=Math.sin(a)*.5;}
   this.torus(g,.65,.15,accent,0,2.45,0).rotation.x=Math.PI/2;this.crystal(g,0,2.28,0,.27,accent);
  }else if(style.geometry==='tanks'){
   for(const x of [-.45,.45]){this.cylinder(.29,1.0,base,g,x,1.15,.31);this.torus(g,.3,.06,accent,x,1.35,.32).rotation.x=Math.PI/2;}
  }else if(style.geometry==='glyphs'){
   for(let i=0;i<5;i++){const panel=this.block(g,.28,.9,.07,base,(i-2)*.37,1.5+(i%2)*.2,.3);panel.rotation.z=(i-2)*.25;this.crystal(g,(i-2)*.37,1.52+(i%2)*.2,.41,.11,accent);}
  }
  const badge=worldCanvasLabel(chapter.boss,'#'+accent.toString(16).padStart(6,'0'));g.add(badge);badge.visible=!this.lite;
  const halo=this.torus(this.fx,1.5,.075,accent,source.position.x,source.position.y+.15,source.position.z);
  halo.rotation.x=Math.PI/2;halo.scale.setScalar(1.4);this.halo=halo;
 }
 createDecor(chapter,center){
  const kind=visualWorld(chapter),accent=kind==='morrow'?0x935cff:kind==='riverfront'?0x45cfd8:0x9bda77;
  const base=kind==='morrow'?0x242037:kind==='riverfront'?0x453a3c:0x344b41;
  for(let i=0;i<this.budget.props;i++){
   const x=(sceneSeed(chapter.index??0,i+8)-.5)*45,z=(sceneSeed((chapter.index??0)+16,i+9)-.5)*48;
   // Surround the combat arena; leave central combat/rescue paths readable.
   const side=x<0?-1:1,px=center.x+(17+Math.abs(x)*.25)*side,pz=center.z+z;
   const h=kind==='morrow'?2.1+sceneSeed(22,i)*5:kind==='riverfront'?1.2+sceneSeed(43,i)*3:1.1+sceneSeed(37,i)*2.5;
   if(kind==='morrow'){
    this.block(this.env,1.2,h,1.2,base,px,center.y+h/2,pz);
    this.crystal(this.env,px,center.y+h+.2,pz,.25,accent);
    this.block(this.env,1.5,.055,.12,accent,px,center.y+Math.min(2.2,h),pz+.7);
   }else if(kind==='riverfront'){
    this.block(this.env,2.4,h,1.9,base,px,center.y+h/2,pz);
    for(let a=0;a<3;a++)this.block(this.env,2.3,.06,.09,accent,px,center.y+.35+a*.4,pz+1);
    const post=this.cylinder(.12,2.8,0x544030,this.env,px+1.7,center.y+1.4,pz);post.rotation.z=.08;
   }else{
    const stump=this.cylinder(.27,h,0x4a392c,this.env,px,center.y+h/2,pz);
    for(let a=0;a<3;a++){const leaf=this.crystal(this.env,px+Math.sin(a*2.1)*.6,center.y+h+.25,pz+Math.cos(a*2.1)*.5,.7,accent);leaf.scale.set(1.35,.3,1.3);}
    stump.rotation.z=Math.sin(i)*.1;
   }
  }
  // Low-cost lighting and world-bound energy rifts, without changing gameplay colliders.
  const light=new THREE.PointLight(accent,this.lite?1.2:2.2,this.lite?14:32);light.position.set(center.x,center.y+6,center.z-11);this.env.add(light);this.light=light;
  const ring=this.torus(this.env,5,.08,accent,center.x,center.y+.10,center.z-13);ring.rotation.x=Math.PI/2;
  if(kind!=='morrow'){
   for(let i=0;i<5;i++){const water=this.block(this.env,4.5,.025,2.4,kind==='riverfront'?0x1b576b:0x355b52,center.x+(i-2)*10,center.y+.04,center.z-25);water.material.metalness=.36;water.material.roughness=.18;}
  }
 }
 createWarningMesh(){
  const geo=new THREE.BufferGeometry(),mat=new THREE.MeshBasicMaterial({color:0xff4f8c,transparent:true,opacity:.29,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,mat);mesh.visible=false;mesh.name='WIR_Boss_Attack_HitVolume';this.fx.add(mesh);this.warning=mesh;
 }
 rebuild(){
  this.clearChapter();
  const chapter={...CHAPTERS[this.pilot.s.chapter],index:this.pilot.s.chapter};if(!chapter.id||!this.pilot.boss?.mesh)return;
  this.activeChapter=this.pilot.s.chapter;this.activeBoss=this.pilot.boss.mesh;
  this.dressBoss(chapter);this.createDecor(chapter,this.pilot.origin);this.createWarningMesh();
  this.intro=0;this.introDone=false;this.previousTelegraph=0;
  this.pilot.s.stun=Math.max(this.pilot.s.stun,3.3);this.pilot.enemyClock=Math.max(this.pilot.enemyClock,4.5);
  this.hudBoss.textContent=chapter.boss.toUpperCase();
  this.hudWorld.textContent=(visualWorld(chapter)==='morrow'?'MORROW CITY':visualWorld(chapter)==='riverfront'?'SAVANNAH RIVERFRONT':'SAVANNAH MARSHLINE')+' · '+chapter.title;
  this.hud.style.display='block';
 }
 clearChapter(){
  if(this.bossMesh){this.bossMesh.parent?.remove(this.bossMesh);safeDispose(this.bossMesh);this.bossMesh=null;}
  for(const child of [...this.env.children]){this.env.remove(child);safeDispose(child);if(child.isLight)child.dispose?.();}
  for(const child of [...this.fx.children]){this.fx.remove(child);safeDispose(child);}
  this.halo=null;this.warning=null;this.activeChapter=-1;this.activeBoss=null;this.hud.style.display='none';this.pilot.visualAttackHit=()=>false;
 }
 updateTentacles(){
  const {tentacleSamples:n,tentacleSides:sides}=this.budget;
  const mode=this.beast.s.thermal;
  for(const arm of this.arms){
   const src=this.beast.lines[arm.index]?.geometry.attributes.position;if(!src)continue;
   const positions=[],start=new THREE.Vector3().fromBufferAttribute(src,0),end=new THREE.Vector3().fromBufferAttribute(src,12);
   const role=this.beast.s.arms[arm.index];
   const skipContact=role==='Anchor'&&this.beast.s.anchorPoints[arm.index];
   const hit=skipContact?null:closestCollision(start,end,.12,this.g.colliders);
   const cutoff=hit?Math.max(.04,hit.t-.018):1;
   for(let j=0;j<=n;j++){
    const u=Math.min(cutoff,j/n)*12,k=Math.min(11,Math.floor(u)),f=Math.min(1,u-k);
    const a=new THREE.Vector3().fromBufferAttribute(src,k),b=new THREE.Vector3().fromBufferAttribute(src,k+1);
    positions.push(a.lerp(b,f));
   }
   const attr=arm.tube.geometry.attributes.position,trace=arm.tracer.geometry.attributes.position;
   for(let j=0;j<=n;j++){
    const p=positions[j],prev=positions[Math.max(0,j-1)],next=positions[Math.min(n,j+1)];
    const tangent=next.clone().sub(prev).normalize(),normal=new THREE.Vector3().crossVectors(tangent,UP);
    if(normal.lengthSq()<.0001)normal.set(1,0,0);normal.normalize();
    const binormal=new THREE.Vector3().crossVectors(tangent,normal).normalize();
    const radius=(.11+.045*Math.sin(Math.PI*j/n))*(mode==='Cold Lock'?1.1:.92);
    for(let k=0;k<sides;k++){const a=k*2*Math.PI/sides;
     const v=p.clone().addScaledVector(normal,Math.cos(a)*radius).addScaledVector(binormal,Math.sin(a)*radius);
     attr.setXYZ(j*sides+k,v.x,v.y,v.z);
    }
    const fracture=Math.sin(j*7+arm.index*1.7)*.045;
    const crack=p.clone().addScaledVector(normal,radius+.025+fracture).addScaledVector(binormal,Math.sin(j*2+arm.index)*.045);
    trace.setXYZ(j,crack.x,crack.y,crack.z);
   }
   attr.needsUpdate=true;arm.tube.geometry.computeVertexNormals();trace.needsUpdate=true;
   const tip=arm.tip,d=positions[n].clone().sub(positions[n-1]).normalize();
   tip.position.copy(positions[n]).addScaledVector(d,.35);
   tip.quaternion.setFromUnitVectors(UP,d.lengthSq()>.01?d:UP);
   tip.material.emissiveIntensity=mode==='Hot Line'?.85:.44;
   arm.tube.material.emissiveIntensity=(arm.index===this.beast.s.selected?.54:.16)+(this.beast.s.snap>0?.25:0);
   arm.tracer.material.opacity=arm.index===this.beast.s.selected?1:.54;
  }
 }
 // Actual volume geometry matches the hit test used by the mission's boss pressure.
 updateWarningGeometry(){
  if(!this.warning||this.previousTelegraph<=0)return;
  const style=BOSS_STYLES[CHAPTERS[this.activeChapter].boss],p=this.pilot.boss.mesh.position;
  const f=this.facing,l={x:-f.z,z:f.x};let vertices=[];
  const vertex=(x,z)=>[p.x+x,p.y+.10,p.z+z];
  const tri=(a,b,c)=>{vertices.push(...a,...b,...c);};
  if(style.attack==='cone'){
   const count=18,r=style.reach,half=(style.angle||Math.PI/2)/2;
   for(let i=0;i<count;i++){const a=-half+2*half*i/count,b=-half+2*half*(i+1)/count;
    const at=t=>vertex(r*(f.x*Math.cos(t)+l.x*Math.sin(t)),r*(f.z*Math.cos(t)+l.z*Math.sin(t)));
    tri(vertex(0,0),at(a),at(b));}
  }else if(style.attack==='line'){
   const r=style.reach,w=style.width/2;
   const a=vertex(l.x*w,l.z*w),b=vertex(-l.x*w,-l.z*w),c=vertex(f.x*r-l.x*w,f.z*r-l.z*w),d=vertex(f.x*r+l.x*w,f.z*r+l.z*w);
   tri(a,b,c);tri(a,c,d);
  }else{
   const steps=32,r=style.reach,inner=style.attack==='ring'?style.inner:0;
   for(let i=0;i<steps;i++){const a=i*2*Math.PI/steps,b=(i+1)*2*Math.PI/steps;
    const pt=(rad,t)=>vertex(Math.cos(t)*rad,Math.sin(t)*rad);
    tri(pt(inner,a),pt(r,a),pt(r,b));tri(pt(inner,a),pt(r,b),pt(inner,b));}
  }
  this.warning.geometry.dispose();
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();this.warning.geometry=geo;
 }
 hitPlayer(){
  if(this.activeChapter<0||!this.pilot.boss)return false;
  const style=BOSS_STYLES[CHAPTERS[this.activeChapter].boss];
  return hitVolume(style,this.pilot.boss.mesh.position,this.g.P.o.position,this.facing);
 }
 updateTelegraph(){
  if(!this.warning||this.activeChapter<0)return;
  const t=this.pilot.telegraph;
  if(t>0&&this.previousTelegraph<=0){
   const p=this.pilot.boss.mesh.position,q=this.g.P.o.position,d=Math.hypot(q.x-p.x,q.z-p.z)||1;
   this.facing={x:(q.x-p.x)/d,z:(q.z-p.z)/d};
   this.pilot.visualAttackHit=()=>this.hitPlayer();
  }
  this.warning.visible=t>0;
  this.warning.material.opacity=.18+.13*Math.sin(performance.now()/85)**2;
  this.previousTelegraph=t;
  if(t>0&&this.frame%3===0)this.updateWarningGeometry();
  if(this.halo&&this.pilot.boss?.mesh){this.halo.position.set(this.pilot.boss.mesh.position.x,this.pilot.boss.mesh.position.y+.18,this.pilot.boss.mesh.position.z);this.halo.rotation.z+=.01;}
 }
 updateIntro(dt){
  if(this.introDone||this.activeChapter<0)return;
  this.intro+=dt;const beat=cinematicBeat(this.intro);
  this.hudBeat.textContent=beat==='wind-up'?'I · WIND-UP':beat==='tension'?'II · TENSION':beat==='initiation'?'III · INITIATION':'';
  if(this.bossMesh){this.bossMesh.scale.setScalar(beat==='wind-up'?.65:beat==='tension'?.85:1);}
  if(this.halo)this.halo.scale.setScalar(beat==='wind-up'?.8:beat==='tension'?1.1:1.35);
  if(beat==='done'){this.introDone=true;this.hud.style.display='none';}
 }
 tick(){
  requestAnimationFrame(()=>this.tick());const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;this.frame++;
  const p=this.pilot;
  if(p.s.phase==='idle'){if(this.activeChapter>=0)this.clearChapter();}
  else if(p.boss?.mesh&&p.s.chapter!==this.activeChapter)this.rebuild();
  if(this.activeChapter>=0){this.updateIntro(dt);this.updateTelegraph();if(this.halo&&this.light){this.light.intensity=(this.lite?1.2:2.2)+Math.sin(now/530)*.12;}}
  this.updateTentacles();
 }
}
