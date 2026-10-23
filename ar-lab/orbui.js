/* v8 orb glue: feeds hand landmarks into orb.js physics, draws the orb (2D canvas, crisp golf-ball size) + a few particles,
   a subtle stability ring, difficulty chip (easy/normal/master/off), launches on moves/blasts, and emits orb:* events for the lesson. */
import {orbNew,orbStep,orbLaunch,palmTilt,restPoint,DIFF,R0} from './orb.js';
import {FX,L,rnd,lightAt} from './fx.js';
import {E,boom} from './elements.js';
export const OB={O:orbNew(),diff:'normal',prev:null,carry:0,spinT:0,minX:1e9,maxX:-1e9};
try{ OB.diff=localStorage.getItem('wirlab.orb')||'normal'; }catch{}
let cv,cx,chip; const MODES=['fire','water','earth','air'];
export const active=()=>OB.diff!=='off'&&MODES.includes(E.mode);
export function init(){ cv=document.createElement('canvas'); cv.id='orbc'; Object.assign(cv.style,{position:'fixed',inset:0,pointerEvents:'none',zIndex:6}); document.body.appendChild(cv);
  const fit=()=>{ cv.width=innerWidth; cv.height=innerHeight; }; fit(); addEventListener('resize',fit); cx=cv.getContext('2d');
  chip=document.createElement('button'); chip.id='orbchip'; chip.title='Orb difficulty'; Object.assign(chip.style,{position:'fixed',right:'12px',top:'110px',zIndex:41,background:'#0008',color:'#fff',border:0,borderRadius:'18px',height:'36px',padding:'0 10px',font:'12px system-ui'});
  const lbl=()=>chip.textContent='◉ '+OB.diff; lbl(); chip.onclick=()=>{ const L2=['easy','normal','master','off']; OB.diff=L2[(L2.indexOf(OB.diff)+1)%4]; try{localStorage.setItem('wirlab.orb',OB.diff);}catch{} lbl(); };
  document.body.appendChild(chip); }
const TIPS=[4,8,12,16,20];
export function step(hs,dt){ if(!cx) return; cx.clearRect(0,0,cv.width,cv.height); if(!active()){ OB.O.state='gone'; return; }
  const h=hs.find(x=>x.palm&&x.pts), O=OB.O, P=DIFF[OB.diff];
  const ch=E.chgLook?.state==='charging'||E.chg?.state==='charging', two=hs.filter(x=>x.palm);
  if(ch&&two.length>=2){ // two-palm charge: the orb floats between the palms as the charge core, then the clap launches it
    const mx=(two[0].palm.x+two[1].palm.x)/2, my=(two[0].palm.y+two[1].palm.y)/2-(two[0].scale||90)*.4;
    if(O.state!=='held'){ Object.assign(O,{state:'held',t:0,rx:0,ry:0,vx:0,vy:0,held:0,stab:1}); }
    O.x+=(mx-O.x)*.5; O.y+=(my-O.y)*.5; O.w=8; O.ang+=O.w*dt; O.stab=1; OB.prev={x:O.x,y:O.y,vx:0,vy:0,t:FX.t,tips:[]}; draw(O,(two[0].scale||90)*(1+.4*(E.chgLook?.lvl||0))); return; }
  let H=null;
  if(h){ const s=h.scale||90, rp=restPoint(h.palm,h.pts,s), pv=OB.prev, nt=FX.t;
    let vx=0,vy=0,ax=0,ay=0; if(pv&&nt>pv.t){ const d=Math.max(1/90,nt-pv.t); vx=(rp.x-pv.x)/d; vy=(rp.y-pv.y)/d; const kk=Math.min(1,d*14); vx=pv.vx+(vx-pv.vx)*kk; vy=pv.vy+(vy-pv.vy)*kk; ax=(vx-pv.vx)/d; ay=(vy-pv.vy)/d; }
    const tips=TIPS.map((i,j)=>{ const q=h.pts[i], pq=pv?.tips?.[j]; const d=pv?Math.max(1/90,nt-pv.t):1; return {x:q.x,y:q.y,vx:pq?(q.x-pq.x)/d:0,vy:pq?(q.y-pq.y)/d:0}; });
    const cup=h.g==='cup'?1:h.g==='relaxed'?.4:0;
    H={x:rp.x,y:rp.y,vx,vy,ax:Math.max(-2e4,Math.min(2e4,ax)),ay:Math.max(-2e4,Math.min(2e4,ay)),tilt:palmTilt(h.pts),s,cup,tips};
    OB.prev={x:rp.x,y:rp.y,vx,vy,t:nt,tips:tips.map(t=>({x:t.x,y:t.y}))}; } else OB.prev=null;
  orbStep(O,H,dt,P);
  for(const e of O.ev) onOrb(e,H);
  if(O.state==='held'){ // lesson signals
    if(O.held>3&&!OB.said3){ OB.said3=1; window.labEvent?.('orb:hold'); }
    OB.minX=Math.min(OB.minX,O.x); OB.maxX=Math.max(OB.maxX,O.x); if(OB.maxX-OB.minX>(H?.s||90)*2.2&&O.held>2&&!OB.saidC){ OB.saidC=1; window.labEvent?.('orb:carry'); }
    if(Math.abs(O.w)>5){ OB.spinT+=dt; if(OB.spinT>.8&&!OB.saidS){ OB.saidS=1; window.labEvent?.('orb:twirl'); } } else OB.spinT=Math.max(0,OB.spinT-dt);
    if(Math.abs(O.rx)>(H?.s||90)*.25&&!OB.saidR){ OB.saidR=1; window.labEvent?.('orb:roll'); } }
  if(O.state!=='gone') draw(O,H?.s||OB.lastS||90); if(H) OB.lastS=H.s; }
function onOrb(e,H){ const O=OB.O;
  if(e==='drop'){ window.labEvent?.('orb:drop'); OB.minX=1e9; OB.maxX=-1e9; OB.said3=0; }
  if(e==='fizzle'){ const c=COL[E.mode]; for(let i=0;i<8;i++) (E.mode==='earth'?L.dust:L.spark).spawn(O.x,O.y,rnd(-120,120),rnd(-160,20),{c:c.p,size:rnd(3,6),life:rnd(.3,.6),grav:300,a:.8}); if(E.mode==='fire') L.smoke.spawn(O.x,O.y,0,-40,{c:[.4,.4,.4],a:.2,size:30,grow:1,life:.8}); }
  if(e==='pop'){ boom(O.x,O.y,10+10*(O.power||1),COL[E.mode].p); window.labEvent?.('orb:pop'); }
  if(e==='spawn') window.labEvent?.('orb:spawn'); }
/* moves / blasts launch the orb toward where the hand is heading (default: up and away) */
export function onEv(ev){ if(!active()) return; const O=OB.O; if(O.state==='gone'||O.state==='fly') return;
  const big=/^blast:release/.test(ev), m=/^(fire:(fireball|burst)|water:throw|earth:throw|air:throw|move:(bloom|push|flick))/.test(ev);
  if(!big&&!m) return; const v=OB.prev||{vx:0,vy:0}; const sp=Math.hypot(v.vx,v.vy);
  const dx=sp>200?v.vx/sp:0, dy=sp>200?v.vy/sp:-1, p=big?1.8:1;
  if(orbLaunch(O,dx*900*p+v.vx*.3,dy*900*p-250,p)) window.labEvent?.('orb:launch'); }
const COL={fire:{a:'#ffd27a',b:'#ff6a1a',c:'#8a1606',p:[1,.45,.08]},water:{a:'#d8f3ff',b:'#3f9be8',c:'#0b3a78',p:[.3,.65,1]},earth:{a:'#c8ad8a',b:'#7a5a3c',c:'#33241a',p:[.5,.4,.3]},air:{a:'#f2fbff',b:'#8fd2f2',c:'#2d6f93',p:[.55,.85,1]}};
function draw(O,s){ const r=R0*s*.5*2, c=COL[E.mode], x=O.x, y=O.y; // r = orb radius in px
  const k=FX.Q;
  // body
  cx.save(); cx.translate(x,y);
  cx.fillStyle='rgba(0,0,0,.25)'; cx.beginPath(); cx.ellipse(0,r*1.05,r*.9,r*.25,0,0,7); cx.fill(); // soft contact shadow
  const g=cx.createRadialGradient(-r*.35,-r*.35,r*.1,0,0,r); g.addColorStop(0,c.a); g.addColorStop(.55,c.b); g.addColorStop(1,c.c);
  cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,r,0,7); cx.fill();
  // spin marks: visible angular velocity
  cx.rotate(O.ang); cx.strokeStyle=E.mode==='air'?'rgba(255,255,255,.8)':'rgba(255,255,255,.45)'; cx.lineWidth=Math.max(1.2,r*.12); cx.lineCap='round';
  if(E.mode==='air'){ for(let i=0;i<3;i++){ cx.beginPath(); cx.arc(0,0,r*(.35+.2*i),i*2,i*2+2.2); cx.stroke(); } }
  else if(E.mode==='earth'){ cx.fillStyle='rgba(30,20,12,.55)'; for(const [a,d,q] of [[0,.45,.18],[2.1,.5,.14],[4,.3,.12]]){ cx.beginPath(); cx.arc(Math.cos(a)*r*d,Math.sin(a)*r*d,r*q,0,7); cx.fill(); } }
  else { cx.beginPath(); cx.arc(0,0,r*.62,-.6,.6); cx.stroke(); cx.beginPath(); cx.arc(0,0,r*.62,2.5,3.7); cx.stroke(); }
  cx.restore();
  // stability ring (subtle): green steady → amber → red about to fall
  if(O.state==='held'){ const st=O.stab, col=st>.6?'120,255,170':st>.3?'255,200,90':'255,90,70';
    cx.strokeStyle=`rgba(${col},${.25+.4*(1-st)})`; cx.lineWidth=2; cx.beginPath(); cx.arc(x,y,r*1.55,-Math.PI/2,-Math.PI/2+6.283*Math.max(.03,st)); cx.stroke(); }
  // element flavour, kept tiny (v8: fire amount drastically reduced)
  if(E.mode==='fire'){ if(Math.random()<.5*k) L.fire.spawn(x+rnd(-r,r)*.4,y-r*.3,rnd(-8,8),-rnd(40,80),{size:r*rnd(1,1.5),grow:-.2,life:rnd(.15,.25),a:.8}); if(Math.random()<.08*k) L.spark.spawn(x,y-r,rnd(-30,30),-rnd(60,140),{c:[1,.45,.08],size:3,life:.6,grav:-20}); lightAt(x,y,[1,.5,.2],.5); if(O.state==='held'||O.state==='fly') E.hot.push({x,y,r:r*1.2,held:O.state==='held'}); }
  else if(E.mode==='water'&&Math.random()<.15*k) L.spark.spawn(x+rnd(-r,r)*.5,y+rnd(-r,r)*.5,0,10,{c:[.7,.9,1],size:3,life:.3});
  else if(E.mode==='air'&&Math.random()<.3*k){ const a=O.ang*2+rnd(0,6.28); L.spark.spawn(x+Math.cos(a)*r*1.3,y+Math.sin(a)*r*1.3,-Math.sin(a)*80,Math.cos(a)*80,{c:[.55,.85,1],size:3,life:.3}); } }
