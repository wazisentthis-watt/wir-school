// ============================================================================
// GALAXY GALLIUM LIMB — swing-line visuals. ALL LOOK/NUMBERS HERE ARE PROPOSAL
// (RB1 voice 2026-10-23, unstamped; Metal's Bot + parent canon notes).
// LOCKED respected: black/charcoal/gunmetal dominate; violet ONLY on active
// seams (origin seam at forearm + freeze front); silver-gunmetal veins;
// Gallium finite & cost tracked; no teleport; 28 m range; real-surface anchor only.
// PROPOSAL: Venom-style fluid MASS read as a Gallium LIMB (Survival Limbs
// lineage) — tapered, sinew/tendon ridges, wobbling liquid while extending,
// splash-stick at the front, then FREEZES RIGID (cold-vacuum freeze front racing
// anchor→hand). Release: un-freezes, flows back into the arm, 80% returns,
// 20% left as a recoverable puddle. Suit thins slightly while material is out.
// Visual only: swing physics/controls untouched.
// 2026-10-23 RB1: "more fluid and water-like" -> liquid-metal/mercury pass (PROPOSAL):
// physical glossy translucent material + galaxy sparkle + fresnel, travelling wave,
// rippling surface, teardrop drips that break off, wobbly latch blob, splash ring,
// pour-back retract. The 'freeze' now only firms the line (low ripple), never matte.
// ============================================================================
import * as THREE from 'three';
const GUN=0x7d838d, VIO=0x8a4dff;
function veinTex(){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#5c6068';g.fillRect(0,0,64,256);g.strokeStyle='#e8ecf2';g.globalAlpha=.9;
 for(let i=0;i<5;i++){g.lineWidth=1+Math.random()*1.5;g.beginPath();let x=Math.random()*64;g.moveTo(x,0);for(let y=0;y<=256;y+=16){x+=(Math.random()-.5)*14;g.lineTo(x,y);}g.stroke();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
export const LIMB={lineCost:.03,returnShare:.8,extendT:.16,freezeT:.28,retractT:.45,thin:.94,puddleLife:8}; // PROPOSAL
export const GU={value:0}; // shared time uniform for liquid shaders
export function galliumLiquidMat(o={}){ // liquid metal / mercury w/ violet galaxy sparkle (PROPOSAL)
 const m=new THREE.MeshPhysicalMaterial(Object.assign({color:0xb9bec8,metalness:.92,roughness:.06,clearcoat:1,clearcoatRoughness:.04,
  transmission:.18,thickness:.4,ior:1.6,iridescence:.35,iridescenceIOR:1.4,envMapIntensity:2.6,transparent:true,opacity:.97},o));
 m.onBeforeCompile=sh=>{sh.uniforms.uT=GU;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT;varying vec3 vWP;float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}')
  .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),3.0);
   totalEmissiveRadiance+=mix(vec3(0.55,0.62,0.75),vec3(0.62,0.38,1.0),0.5+0.5*sin(uT*1.7+vWP.y*2.0))*fr*1.1;
   vec3 cp=floor(vWP*38.0+vec3(0.0,uT*2.0,0.0));float sp=step(0.985,h3(cp))*(0.5+0.5*sin(uT*9.0+h3(cp+1.0)*30.0));
   totalEmissiveRadiance+=vec3(0.75,0.55,1.0)*sp*1.6;`);};
 return m;}
export function makeGalliumLimb(scene,THREEref){
 const vt=veinTex();
 const liquidM=galliumLiquidMat();
 const frozenM=galliumLiquidMat({roughness:.14,transmission:.08,color:0xa7adb8}); // firmed line: still glossy liquid, just stiller
 // PROPOSAL look-tune: specular sheen + soft cool fresnel rim so the limb separates from dark sky
 const rim=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.5);totalEmissiveRadiance+=vec3(0.55,0.6,0.7)*fr*0.9;');};return m;};
 
 const SEG=48,RAD=10;
 const mk=m=>{const me=new THREE.Mesh(new THREE.BufferGeometry(),m);me.castShadow=true;me.frustumCulled=false;scene.add(me);me.visible=false;return me;};
 const liquid=mk(liquidM),frozen=mk(frozenM);
 const glowM=new THREE.MeshBasicMaterial({color:0xb48cff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
 const origin=new THREE.Mesh(new THREE.SphereGeometry(.16,14,10),glowM);origin.visible=false;scene.add(origin); // violet seam at forearm (active)
 const front=new THREE.Mesh(new THREE.TorusGeometry(.3,.07,10,24),glowM.clone());front.visible=false;scene.add(front); // freeze front
 const frost=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xcfd6e0,size:.05,transparent:true,opacity:.8,depthWrite:false}));frost.frustumCulled=false;scene.add(frost);
 const splash=new THREE.Mesh(new THREE.SphereGeometry(.32,20,14),liquidM);splash.visible=false;scene.add(splash); // wobbly latch blob
 const ringM=new THREE.MeshBasicMaterial({color:0xcbb8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const rings=[];const ringG=new THREE.RingGeometry(.8,1,40);
 const ripple=(p,n)=>{for(let k=0;k<2;k++){const m=new THREE.Mesh(ringG,ringM.clone());m.position.copy(p);if(n)m.lookAt(p.clone().add(n));else m.rotation.x=-Math.PI/2;scene.add(m);rings.push({m,t:-k*.12});}};
 const dripM=galliumLiquidMat({transmission:0}); // mercury drips (PROPOSAL)
 const drips=[];const dripG=new THREE.SphereGeometry(.05,8,6);const MAXD=60;
 const spawnDrip=(p,v)=>{if(drips.length>=MAXD)return;const m=new THREE.Mesh(dripG,dripM);m.position.copy(p);scene.add(m);drips.push({m,v,t:0,s:.6+Math.random()*.8});};
 const puddles=[];const pudG=new THREE.CircleGeometry(.45,20);
 let S=null,prevSwing=null;
 const curvePts=(a,b,t,wob,time,sag)=>{const pts=[];const end=a.clone().lerp(b,t);const d=end.clone().sub(a);const L=d.length()||1e-3;
  const side=new THREE.Vector3().crossVectors(d,new THREE.Vector3(0,1,0)).normalize();if(!isFinite(side.x)||side.lengthSq()<.1)side.set(1,0,0);
  const up=new THREE.Vector3().crossVectors(side,d).normalize();
  for(let i=0;i<=14;i++){const u=i/14;const p=a.clone().addScaledVector(d,u);const env=Math.sin(Math.PI*u);
   const tw=Math.sin(u*14-time*16)*.09*env; // travelling wave hand->anchor (always on, water-like)
   p.addScaledVector(side,Math.sin(u*9+time*14)*.18*wob*env+tw*.6).addScaledVector(up,Math.cos(u*7+time*11)*.14*wob*env+tw-sag*env*L*.06);pts.push(p);}
  return new THREE.CatmullRomCurve3(pts);};
 // anatomical tube: tapered (thick at forearm, slimmer, swollen splash head), sinew ridges, liquid noise
 function tube(mesh,curve,u0,u1,liquidAmt,time){const pos=[],uv=[],idx=[];const F=new THREE.Vector3(),N=new THREE.Vector3(),B=new THREE.Vector3(),T=new THREE.Vector3(),ref=new THREE.Vector3(0,1,0);
  if(curve.getLength()<.05){mesh.visible=false;return;}
  for(let i=0;i<=SEG;i++){const u=THREE.MathUtils.clamp(u0+(u1-u0)*i/SEG,0,1);const c=curve.getPointAt(u);curve.getTangentAt(u,T);N.crossVectors(T,ref).normalize();if(N.lengthSq()<.1)N.set(1,0,0);B.crossVectors(T,N);
   let r=THREE.MathUtils.lerp(.22,.11,Math.pow(u,.7))+Math.max(0,(u-.9)/.1)*.06; // taper + head
   r*=1+.12*Math.sin(u*38)*Math.exp(-((u-.25)**2)*8); // bicep/forearm muscle bunches
   for(let j=0;j<=RAD;j++){const th=j/RAD*Math.PI*2;
    let rr=r*(1+.16*Math.pow(Math.max(0,Math.cos(th*3)),6)); // 3 tendon ridges running the length
    const la=.25+.75*liquidAmt; // never fully rigid: surface keeps rippling
    rr*=1+la*(.2*Math.sin(th*2+u*25-time*18)*Math.sin(u*13+time*9)+.12*Math.sin(u*60-time*24+th)+.08*Math.sin(th*5-time*7+u*31));
    rr*=1+.35*Math.exp(-((u-((time*1.3)%1))**2)*400); // bulge pulse flowing along the line
    F.copy(c).addScaledVector(N,Math.cos(th)*rr).addScaledVector(B,Math.sin(th)*rr);pos.push(F.x,F.y,F.z);uv.push(j/RAD,u*6);}}
  for(let i=0;i<SEG;i++)for(let j=0;j<RAD;j++){const a=i*(RAD+1)+j,b=a+RAD+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=mesh.geometry;g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();mesh.visible=true;}
 const hide=()=>{liquid.visible=frozen.visible=origin.visible=front.visible=splash.visible=false;frost.visible=false;};
 const blob=(m,p,s,time,amp)=>{m.position.copy(p);m.scale.set(s*(1+amp*Math.sin(time*13)),s*(.7+amp*Math.sin(time*11+1)),s*(1+amp*Math.cos(time*9+2)));m.rotation.y=time*.7;};
 return {LIMB,state:()=>S,
  tick(dt,{swing,hand,model,st,groundY,playerPos}){const time=performance.now()/1000;GU.value=time;
   for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const k=Math.max(0,r.t)/.7;r.m.scale.setScalar(.2+k*1.6);r.m.material.opacity=r.t<0?0:.8*(1-k);if(k>=1){scene.remove(r.m);r.m.material.dispose();rings.splice(i,1);}}
   if(swing&&swing!==prevSwing){ // new line committed
    S={phase:'extend',t:0,a:swing.a.clone(),cost:Math.min(st.gal,LIMB.lineCost)};st.gal=Math.max(0,st.gal-S.cost);}
   if(!swing&&prevSwing&&S&&S.phase!=='retract'){S.phase='retract';S.t=0;S.from=S.a.clone();
    st.gal=Math.min(1,st.gal+S.cost*LIMB.returnShare); // 80% flows back
    const pm=new THREE.Mesh(pudG,galliumLiquidMat({transmission:0,color:0x8d93a0}));ripple(new THREE.Vector3(playerPos.x+.6,groundY+.05,playerPos.z));
    pm.rotation.x=-Math.PI/2;pm.position.set(playerPos.x+.6,groundY+.03,playerPos.z);scene.add(pm);puddles.push({m:pm,t:0,val:S.cost*(1-LIMB.returnShare)});}
   prevSwing=swing;
   // suit thins while material is out (PROPOSAL)
   const out=S&&S.phase!=='done';if(model){const k=out?LIMB.thin:1;model.scale.x+=(k*(model.userData.sx??=model.scale.x)-model.scale.x)*Math.min(1,dt*10);model.scale.z+=(k*(model.userData.sz??=model.scale.z)-model.scale.z)*Math.min(1,dt*10);}
   // puddles: 20% recoverable — walk over to reabsorb, else evaporates
   for(let i=puddles.length-1;i>=0;i--){const p=puddles[i];p.t+=dt;p.m.scale.setScalar(Math.min(1,p.t*6));
    const near=Math.hypot(p.m.position.x-playerPos.x,p.m.position.z-playerPos.z)<1&&playerPos.y<groundY+.6&&p.t>.6;
    if(near){st.gal=Math.min(1,st.gal+p.val);} if(near||p.t>LIMB.puddleLife){scene.remove(p.m);p.m.material.dispose();puddles.splice(i,1);} else if(p.t>LIMB.puddleLife-1)p.m.material.opacity=LIMB.puddleLife-p.t;}
   for(let i=drips.length-1;i>=0;i--){const d=drips[i];d.t+=dt;d.v.y-=12*dt;d.m.position.addScaledVector(d.v,dt);const sp=d.v.length();const st2=Math.min(2.4,1+sp*.12);d.m.scale.set(d.s/Math.sqrt(st2),d.s*st2,d.s/Math.sqrt(st2));d.m.lookAt(d.m.position.clone().add(d.v));d.m.rotateX(Math.PI/2);
    if(d.m.position.y<groundY||d.t>3){if(d.m.position.y<groundY+.2&&rings.length<12&&Math.random()<.3){const r=new THREE.Mesh(ringG,ringM.clone());r.position.set(d.m.position.x,groundY+.03,d.m.position.z);r.rotation.x=-Math.PI/2;scene.add(r);rings.push({m:r,t:.25});}scene.remove(d.m);drips.splice(i,1);}}
   if(!S||S.phase==='done'){hide();return;}
   S.t+=dt;const h=hand.clone();
   if(S.phase==='extend'||S.phase==='frozen'){
    if(swing)S.a.copy(swing.a);
    const ext=Math.min(1,S.t/LIMB.extendT);const fr=S.phase==='extend'?Math.min(1,Math.max(0,(S.t-LIMB.extendT)/LIMB.freezeT)):1;
    if(fr>=1&&S.phase==='extend')S.phase='frozen';
    const wob=ext<1?1:(1-fr); // liquid wobble dies as it freezes rigid
    const curve=curvePts(h,S.a,ext,wob,time,(1-fr)*.5);
    // freeze races anchor -> hand: u in [1-fr,1] is frozen
    const uf=1-fr;
    if(uf>0.002)tube(liquid,curve,0,uf,wob,time);else liquid.visible=false;
    if(fr>0.002)tube(frozen,curve,uf,1,0,time);else frozen.visible=false;
    origin.visible=true;origin.position.copy(h);origin.scale.setScalar(1.2+.3*Math.sin(time*20));
    front.visible=fr>0&&fr<1||S.phase==='frozen'&&S.t<LIMB.extendT+LIMB.freezeT+.25; // ring lingers briefly at hand
    if(front.visible){const p=curve.getPointAt(uf);front.position.copy(p);front.lookAt(p.clone().add(curve.getTangentAt(uf)));front.material.opacity=.95;}
    // frost motes shed at the freeze front
    if(front.visible){const arr=[];for(let k=0;k<40;k++){const u=Math.min(1,uf+Math.random()*.12);const p=curve.getPointAt(u);arr.push(p.x+(Math.random()-.5)*.35,p.y+(Math.random()-.5)*.35,p.z+(Math.random()-.5)*.35);}frost.geometry.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));frost.visible=true;}else frost.visible=false;
    splash.visible=ext>=1;if(splash.visible){const st0=S.t-LIMB.extendT;if(!S.splashed){S.splashed=true;const n=S.a.clone().sub(h).normalize().negate();ripple(S.a,n);for(let k=0;k<10;k++)spawnDrip(S.a.clone(),new THREE.Vector3((Math.random()-.5)*5,Math.random()*3,(Math.random()-.5)*5).addScaledVector(n,2));}
     const s=Math.min(1,st0*8+.3);blob(splash,S.a,s*.95,time,.18*Math.exp(-st0*1.5)+.06);}
    if(Math.random()<dt*(ext<1?30:fr<1?18:5)){const p=curve.getPointAt(.15+Math.random()*.8);p.y-=.12;spawnDrip(p,new THREE.Vector3((Math.random()-.5)*.6,-.3,(Math.random()-.5)*.6));} // beads bead off underside and break away
   }else if(S.phase==='retract'){ // un-freeze, flow back into the arm
    const k=Math.min(1,S.t/LIMB.retractT);frozen.visible=false;splash.visible=false;front.visible=false;frost.visible=false;
    // pour-back: the line sags and drains toward the hand like poured water; tail stays fat, tip thins and sheds drops
    const e=k*k*(3-2*k);const tip=S.from.clone().lerp(h,e);tip.y-=Math.sin(Math.PI*k)*1.2;const curve=curvePts(h,tip,1,1,time,1.4+k*2);
    if(k<.97){tube(liquid,curve,0,1,1,time);origin.visible=true;origin.position.copy(h);origin.scale.setScalar(1.2+k*.8);
     splash.visible=true;blob(splash,tip,.55*(1-k)+.12,time,.25);if(Math.random()<dt*30)spawnDrip(tip.clone(),new THREE.Vector3((Math.random()-.5),-.2,(Math.random()-.5)));}else{S.phase='done';hide();}
   }}};}
