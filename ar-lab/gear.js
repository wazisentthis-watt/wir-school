/* Gear mode: real CC0 lab models (Poly Haven "chemistry_set" + "bunsen_burner").
   Poke (one finger) = press/tap: light the burner, pour a beaker/flask, squeeze the dropper.
   Poke and hold + move = carry an item. Hold an item above a lit burner to heat it (live °C readout). */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FX,L,rnd,lightAt} from './fx.js';
import {E} from './elements.js';
const $=id=>document.getElementById(id);
const DEFS=[
 {id:'beaker',name:'Beaker 250 mL',src:'set',node:'chemistry_set_beaker_large',h:120,liquid:.55,col:0x3fa8ff,pour:true,what:'water'},
 {id:'flask',name:'Flask',src:'set',node:'chemistry_set_bottle_clear_a',h:130,liquid:.45,col:0x8fe36a,pour:true,what:'green dye in water'},
 {id:'tube',name:'Test tube',src:'set',node:'chemistry_set_test_tube_a',h:120,liquid:.35,col:0xff6fa8,what:'water + red cabbage dye'},
 {id:'dropper',name:'Dropper bottle',src:'set',node:['chemistry_set_bottle_clear_e','chemistry_set_bottle_clear_e_dropper'],h:105,liquid:.5,col:0xffd84a,drop:true,what:'vinegar (a weak acid)'},
 {id:'burner',name:'Bunsen burner',src:'burner',node:['bunsen_burner'],h:140,burner:true},
];
export const G={items:[],held:null,ready:false,status:'loading'};
let scene;
function load(url){ return new Promise((ok,no)=>new GLTFLoader().load(url,ok,undefined,no)); }
export async function init(sc,say){ scene=sc; G.say=say;
  try{ const [set,bur]=await Promise.all([load('assets/models/chemistry_set/chemistry_set.gltf'),load('assets/models/bunsen_burner/bunsen_burner.gltf')]);
    const W=FX.W||innerWidth, n=DEFS.length;
    DEFS.forEach((d,i)=>{ const root=(d.src==='set'?set:bur).scene; const names=[].concat(d.node);
      const g=new THREE.Group(), inner=new THREE.Group(); g.add(inner);
      for(const nm of names){ const o=root.getObjectByName(nm); if(!o) continue; const c=o.clone(); inner.add(c);
        c.traverse(m=>{ if(m.isMesh){ m.material=m.material.clone(); if(/glass/.test(m.material.name)){ m.material.transparent=true; m.material.opacity=.38; m.material.depthWrite=false; m.material.roughness=.05; m.material.envMapIntensity=1; m.renderOrder=6; } } }); }
      // centre on the model's own base, scale metres → screen px
      const bb=new THREE.Box3().setFromObject(inner), sz=bb.getSize(new THREE.Vector3()), s=d.h/sz.y;
      inner.position.set(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2); g.scale.setScalar(s);
      const it={...d,g,inner,s,w:sz.x*s,x:W*(i+.5)/n,y:0,home:null,level:d.liquid||0,temp:22,on:false,tilt:0,pourT:0,lab:document.createElement('div')};
      if(d.liquid){ const r=Math.min(sz.x,sz.z)*.36, hh=sz.y*.8; const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,24),new THREE.MeshStandardMaterial({color:d.col,transparent:true,opacity:.75,roughness:.2,emissive:d.col,emissiveIntensity:.25}));
        m.renderOrder=5; it.liq=m; it.liqH=hh; it.liqY=sz.y*.05; g.add(m); }
      it.lab.className='alab glab'; $('gearLabels').appendChild(it.lab); scene.add(g); G.items.push(it); });
    G.ready=true; G.status='ok'; layout(); show(false); }
  catch(e){ console.warn('gear load failed',e); G.status='failed'; } }
function layout(){ const n=G.items.length; G.items.forEach((it,i)=>{ it.x=FX.W*(i+.5)/n*.96+FX.W*.02; it.y=FX.H*.52+(i%2)*30; it.home={x:it.x,y:it.y}; }); }
export function show(on){ G.on=on; for(const it of G.items){ it.g.visible=on; it.lab.style.display=on?'':'none'; } $('gearLabels').hidden=!on; }
export function reset(){ for(const it of G.items){ it.level=it.liquid||0; it.temp=22; it.on=false; } layout(); }
const burner=()=>G.items.find(i=>i.burner);
function hit(p){ let best=null,bd=1e9; for(const it of G.items){ const h=it.h, cx=it.x, cy=it.y-h/2; if(Math.abs(p.x-cx)<Math.max(36,it.w*.6)&&p.y>it.y-h-20&&p.y<it.y+16){ const d=Math.abs(p.x-cx); if(d<bd){bd=d;best=it;} } } return best; }
function nearestCup(src){ let best=null,bd=1e9; for(const it of G.items){ if(it===src||!it.liq) continue; const d=Math.hypot(it.x-src.x,it.y-src.y); if(d<bd){bd=d;best=it;} } return best; }
function tap(it){
  if(it.burner){ it.on=!it.on; G.say(it.on?'Burner lit: blue flame ≈ 1500 °C':'Burner off'); if(it.on) window.labEvent?.('gear:burner'); return; }
  if(it.pour){ const t=nearestCup(it); if(!t) return; if(it.level<.05){ G.say(`${it.name} is empty`); return; } it.pourT=1.4; it.pourTo=t; G.say(`Pouring ${it.what} into the ${t.name.toLowerCase()}`); window.labEvent?.('gear:pour'); return; }
  if(it.drop){ const t=nearestCup(it); if(!t) return; it.drops=(it.drops||0)+3; it.dropTo=t; G.say('Drip, drip, drip: 3 drops'); window.labEvent?.('gear:drop');
    if(t.id==='tube'){ t.col2=0xff2a6a; setTimeout(()=>G.say('Red cabbage dye turns pinker in acid: it is a pH indicator!'),700); } return; }
  G.say(`${it.name}: ${it.what}, ${Math.round(it.level*100)}% full, ${Math.round(it.temp)} °C. Hold it over the lit burner to heat it.`); }
export function update(hs,dt){ if(!G.ready||!G.on) return;
  const H=hs[0];
  if(H){ const p=H.pinchPt;
    if(H.g==='poke'&&H.changed&&!G.held){ const it=hit(p); if(it){ G.held=it; G.hold={t:0,x0:p.x,y0:p.y,dx:it.x-p.x,dy:it.y-p.y,moved:false}; } }
    if(G.held&&H.g==='poke'){ const h=G.hold; h.t+=dt; if(Math.hypot(p.x-h.x0,p.y-h.y0)>28) h.moved=true;
      if(h.moved&&!G.held.burner){ G.held.x+=(p.x+h.dx-G.held.x)*.5; G.held.y+=(p.y+h.dy-G.held.y)*.5; } }
    if(G.held&&H.g!=='poke'){ const it=G.held, h=G.hold; G.held=null; if(!h.moved) tap(it); } }
  else if(G.held){ const it=G.held; G.held=null; if(!G.hold.moved) tap(it); }
  const B=burner();
  for(const it of G.items){
    if(it.burner&&it.on){ const fx=it.x, fy=it.y-it.h*.98; E.hot.push({x:fx,y:fy-20,r:22});
      for(let i=0;i<5*FX.Q;i++) L.fire.spawn(fx+rnd(-4,4),fy,rnd(-12,12),-rnd(120,220),{size:rnd(10,18),grow:.6,life:rnd(.18,.32),curl:.8,a:.75,c:[.35,.55,1.3]});
      if(Math.random()<.5) L.glow.spawn(fx,fy-14,0,0,{c:[.3,.5,1.4],size:42,life:.08,a:.5,field:0}); lightAt(fx,fy,[.4,.6,1],1.3); }
    // heating: item held over the flame
    if(B&&B.on&&!it.burner&&Math.abs(it.x-B.x)<45&&it.y<B.y-B.h*.9&&it.y>B.y-B.h*.9-90){ const was=it.temp; it.temp=Math.min(it.level>0?100:250,it.temp+dt*22); if(was<60&&it.temp>=60) window.labEvent?.('gear:heat');
      if(it.temp>=100&&it.level>0){ it.level=Math.max(0,it.level-dt*.01); if(Math.random()<.6) L.smoke.spawn(it.x+rnd(-8,8),it.y-it.h,rnd(-10,10),-rnd(50,90),{c:[.9,.9,.95],a:.25,size:rnd(30,50),grow:2,life:1.4}); } }
    else if(!it.burner) it.temp+=(22-it.temp)*Math.min(1,dt*.05);
    if(it.liq&&it.temp>70&&it.level>0) for(let i=0;i<(it.temp>=100?3:1);i++) if(Math.random()<.5) L.glow.spawn(it.x+rnd(-it.w*.25,it.w*.25),it.y-it.h*.1,rnd(-5,5),-rnd(40,90),{c:[1,1,1.1],size:rnd(4,8),life:rnd(.3,.6),a:.7});
    // pouring: tilt toward target, stream of liquid
    if(it.pourT>0){ it.pourT-=dt; const t=it.pourTo, dir=Math.sign(t.x-it.x)||1; it.tilt+=(dir*-1.9-it.tilt)*Math.min(1,dt*5);
      if(Math.abs(it.tilt)>1.1&&it.level>0){ const amt=Math.min(it.level,dt*.3); it.level-=amt; t.level=Math.min(1,t.level+amt*it.h/t.h*.8);
        const lx=it.x+dir*it.w*.5, ly=it.y-it.h*.85; for(let i=0;i<4;i++) L.glow.spawn(lx,ly,dir*rnd(60,110)+(t.x-lx)*.9,rnd(-40,0),{c:new THREE.Color(it.col).toArray(),size:rnd(7,11),life:.55,a:.85,grav:900,field:0}); }
      if(it.pourT<=0) it.pourTo=null; }
    else it.tilt*= Math.pow(.02,dt);
    if(it.drops>0){ it.dropCd=(it.dropCd||0)-dt; if(it.dropCd<=0){ it.dropCd=.35; it.drops--; const t=it.dropTo; L.glow.spawn(it.x,it.y-it.h,(t.x-it.x)*1.2,-160,{c:[1,.9,.3],size:9,life:.8,a:.9,grav:500,field:0}); t.level=Math.min(1,t.level+.01); } }
    if(it.col2&&it.liq){ it.liq.material.color.lerp(new THREE.Color(it.col2),dt*.8); it.liq.material.emissive.copy(it.liq.material.color); }
    if(it.liq){ const lv=Math.max(.001,it.level); it.liq.visible=it.level>0.01; it.liq.scale.set(1,lv*it.liqH,1); it.liq.position.set(0,it.liqY+lv*it.liqH/2,0);
      const hot=Math.max(0,(it.temp-22)/78); it.liq.material.emissiveIntensity=.25+hot*.4; }
    it.g.position.set(it.x,-it.y,0); it.g.rotation.z=it.tilt*.5; it.g.rotation.y+=dt*.15*(it===G.held?0:1);
    it.lab.innerHTML=`<b>${it.name}</b><br>${it.burner?(it.on?'🔥 lit · poke to turn off':'poke to light'):`${Math.round(it.temp)} °C · ${Math.round(it.level*100)}%${it.temp>=100&&it.level>0?' · boiling':''}`}`;
    it.lab.style.transform=`translate(${it.x}px,${it.y+8}px) translateX(-50%)`; } }
