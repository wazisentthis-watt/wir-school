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
// ============================================================================
import * as THREE from 'three';
const GUN=0x7d838d, VIO=0x8a4dff;
function veinTex(){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#5c6068';g.fillRect(0,0,64,256);g.strokeStyle='#e8ecf2';g.globalAlpha=.9;
 for(let i=0;i<5;i++){g.lineWidth=1+Math.random()*1.5;g.beginPath();let x=Math.random()*64;g.moveTo(x,0);for(let y=0;y<=256;y+=16){x+=(Math.random()-.5)*14;g.lineTo(x,y);}g.stroke();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
export const LIMB={lineCost:.03,returnShare:.8,extendT:.16,freezeT:.28,retractT:.3,thin:.94,puddleLife:8}; // PROPOSAL
export function makeGalliumLimb(scene,THREEref){
 const vt=veinTex();
 const liquidM=new THREE.MeshStandardMaterial({color:GUN,map:vt,metalness:.9,roughness:.22,envMapIntensity:2.2});
 const frozenM=new THREE.MeshStandardMaterial({color:0x9aa0a8,map:vt,metalness:.7,roughness:.45,envMapIntensity:1.6}); // matte frozen bar
 // PROPOSAL look-tune: specular sheen + soft cool fresnel rim so the limb separates from dark sky
 const rim=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.5);totalEmissiveRadiance+=vec3(0.55,0.6,0.7)*fr*0.9;');};return m;};
 rim(liquidM);rim(frozenM);
 const SEG=48,RAD=10;
 const mk=m=>{const me=new THREE.Mesh(new THREE.BufferGeometry(),m);me.castShadow=true;me.frustumCulled=false;scene.add(me);me.visible=false;return me;};
 const liquid=mk(liquidM),frozen=mk(frozenM);
 const glowM=new THREE.MeshBasicMaterial({color:0xb48cff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
 const origin=new THREE.Mesh(new THREE.SphereGeometry(.16,14,10),glowM);origin.visible=false;scene.add(origin); // violet seam at forearm (active)
 const front=new THREE.Mesh(new THREE.TorusGeometry(.3,.07,10,24),glowM.clone());front.visible=false;scene.add(front); // freeze front
 const frost=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0xcfd6e0,size:.05,transparent:true,opacity:.8,depthWrite:false}));frost.frustumCulled=false;scene.add(frost);
 const splash=new THREE.Mesh(new THREE.SphereGeometry(.32,14,8),frozenM);splash.scale.set(1,.45,1);splash.visible=false;scene.add(splash);
 const drips=[];const dripG=new THREE.SphereGeometry(.045,6,4);
 const puddles=[];const pudG=new THREE.CircleGeometry(.45,20);
 let S=null,prevSwing=null;
 const curvePts=(a,b,t,wob,time,sag)=>{const pts=[];const end=a.clone().lerp(b,t);const d=end.clone().sub(a);const L=d.length()||1e-3;
  const side=new THREE.Vector3().crossVectors(d,new THREE.Vector3(0,1,0)).normalize();if(!isFinite(side.x)||side.lengthSq()<.1)side.set(1,0,0);
  const up=new THREE.Vector3().crossVectors(side,d).normalize();
  for(let i=0;i<=8;i++){const u=i/8;const p=a.clone().addScaledVector(d,u);const env=Math.sin(Math.PI*u);
   p.addScaledVector(side,Math.sin(u*9+time*14)*.18*wob*env).addScaledVector(up,Math.cos(u*7+time*11)*.14*wob*env-sag*env*L*.06);pts.push(p);}
  return new THREE.CatmullRomCurve3(pts);};
 // anatomical tube: tapered (thick at forearm, slimmer, swollen splash head), sinew ridges, liquid noise
 function tube(mesh,curve,u0,u1,liquidAmt,time){const pos=[],uv=[],idx=[];const F=new THREE.Vector3(),N=new THREE.Vector3(),B=new THREE.Vector3(),T=new THREE.Vector3(),ref=new THREE.Vector3(0,1,0);
  if(curve.getLength()<.05){mesh.visible=false;return;}
  for(let i=0;i<=SEG;i++){const u=THREE.MathUtils.clamp(u0+(u1-u0)*i/SEG,0,1);const c=curve.getPointAt(u);curve.getTangentAt(u,T);N.crossVectors(T,ref).normalize();if(N.lengthSq()<.1)N.set(1,0,0);B.crossVectors(T,N);
   let r=THREE.MathUtils.lerp(.22,.11,Math.pow(u,.7))+Math.max(0,(u-.9)/.1)*.06; // taper + head
   r*=1+.12*Math.sin(u*38)*Math.exp(-((u-.25)**2)*8); // bicep/forearm muscle bunches
   for(let j=0;j<=RAD;j++){const th=j/RAD*Math.PI*2;
    let rr=r*(1+.16*Math.pow(Math.max(0,Math.cos(th*3)),6)); // 3 tendon ridges running the length
    rr*=1+liquidAmt*.22*Math.sin(th*2+u*25-time*18)*Math.sin(u*13+time*9);
    F.copy(c).addScaledVector(N,Math.cos(th)*rr).addScaledVector(B,Math.sin(th)*rr);pos.push(F.x,F.y,F.z);uv.push(j/RAD,u*6);}}
  for(let i=0;i<SEG;i++)for(let j=0;j<RAD;j++){const a=i*(RAD+1)+j,b=a+RAD+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=mesh.geometry;g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();mesh.visible=true;}
 const hide=()=>{liquid.visible=frozen.visible=origin.visible=front.visible=splash.visible=false;frost.visible=false;};
 return {LIMB,state:()=>S,
  tick(dt,{swing,hand,model,st,groundY,playerPos}){const time=performance.now()/1000;
   if(swing&&swing!==prevSwing){ // new line committed
    S={phase:'extend',t:0,a:swing.a.clone(),cost:Math.min(st.gal,LIMB.lineCost)};st.gal=Math.max(0,st.gal-S.cost);}
   if(!swing&&prevSwing&&S&&S.phase!=='retract'){S.phase='retract';S.t=0;S.from=S.a.clone();
    st.gal=Math.min(1,st.gal+S.cost*LIMB.returnShare); // 80% flows back
    const pm=new THREE.Mesh(pudG,new THREE.MeshStandardMaterial({color:0x202126,metalness:1,roughness:.12,transparent:true,opacity:.95}));
    pm.rotation.x=-Math.PI/2;pm.position.set(playerPos.x+.6,groundY+.03,playerPos.z);scene.add(pm);puddles.push({m:pm,t:0,val:S.cost*(1-LIMB.returnShare)});}
   prevSwing=swing;
   // suit thins while material is out (PROPOSAL)
   const out=S&&S.phase!=='done';if(model){const k=out?LIMB.thin:1;model.scale.x+=(k*(model.userData.sx??=model.scale.x)-model.scale.x)*Math.min(1,dt*10);model.scale.z+=(k*(model.userData.sz??=model.scale.z)-model.scale.z)*Math.min(1,dt*10);}
   // puddles: 20% recoverable — walk over to reabsorb, else evaporates
   for(let i=puddles.length-1;i>=0;i--){const p=puddles[i];p.t+=dt;p.m.scale.setScalar(Math.min(1,p.t*6));
    const near=Math.hypot(p.m.position.x-playerPos.x,p.m.position.z-playerPos.z)<1&&playerPos.y<groundY+.6&&p.t>.6;
    if(near){st.gal=Math.min(1,st.gal+p.val);} if(near||p.t>LIMB.puddleLife){scene.remove(p.m);p.m.material.dispose();puddles.splice(i,1);} else if(p.t>LIMB.puddleLife-1)p.m.material.opacity=LIMB.puddleLife-p.t;}
   for(let i=drips.length-1;i>=0;i--){const d=drips[i];d.v.y-=12*dt;d.m.position.addScaledVector(d.v,dt);if(d.m.position.y<groundY){scene.remove(d.m);drips.splice(i,1);}}
   if(!S||S.phase==='done'){hide();return;}
   S.t+=dt;const h=hand.clone();
   if(S.phase==='extend'||S.phase==='frozen'){
    if(swing)S.a.copy(swing.a);
    const ext=Math.min(1,S.t/LIMB.extendT);const fr=S.phase==='extend'?Math.max(0,(S.t-LIMB.extendT)/LIMB.freezeT):1;
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
    splash.visible=ext>=1;if(splash.visible){splash.position.copy(S.a);const s=Math.min(1,(S.t-LIMB.extendT)*10+.3);splash.scale.set(s*1.1,s*.45,s*1.1);}
    if(ext<1||fr<1&&Math.random()<dt*25){const p=curve.getPointAt(Math.random()*Math.max(.05,uf));const m=new THREE.Mesh(dripG,liquidM);m.position.copy(p);scene.add(m);drips.push({m,v:new THREE.Vector3((Math.random()-.5),-.5,(Math.random()-.5))});}
   }else if(S.phase==='retract'){ // un-freeze, flow back into the arm
    const k=Math.min(1,S.t/LIMB.retractT);frozen.visible=false;splash.visible=false;front.visible=false;frost.visible=false;
    const tip=S.from.clone().lerp(h,k*k);const curve=curvePts(h,tip,1,1-k*.5,time,.6);
    if(k<.97){tube(liquid,curve,0,1,1,time);origin.visible=true;origin.position.copy(h);}else{S.phase='done';hide();}
   }}};}
