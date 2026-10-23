/* v10 table mode UI: scan → place → push. Own canvas, no FX particles, no blasts. */
import {TP,planeNew,placePile,tableStep,planeFromPitch,persp} from './tablecore.js';
export const T={on:false,phase:'off',P:null,items:[],beta:null,betaHist:[],scanT:0,prev:[],pokeT:0,pokeAt:null,mat:'water',spawned:0};
const COL={water:['#bfe6ff','#2f8fdc'],fire:['#ffe08a','#e2541b'],earth:['#d2b48c','#6b4a2b'],air:['#f2fbff','#9cc3d6']};
let cv,ctx,chip,say=()=>{};
export function init(o){ say=o.say||say; cv=document.createElement('canvas'); cv.id='tablec'; cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4'; document.body.appendChild(cv); ctx=cv.getContext('2d');
  chip=document.createElement('div'); chip.id='tablechip'; chip.hidden=true; chip.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:104px;z-index:30;white-space:nowrap;background:#000a;color:#fff;font:13px system-ui;padding:6px 10px;border-radius:14px;display:flex;gap:8px;align-items:center';
  document.body.appendChild(chip);
  const st=document.createElement('style'); st.textContent='#tablechip button{all:unset;cursor:pointer;padding:3px 8px;border-radius:9px;background:#ffffff22}#tblBtn.on{background:#fff;color:#000}'; document.head.appendChild(st);
  const b=document.createElement('button'); b.id='tblBtn'; b.textContent='📐 Table'; b.onclick=()=>T.on?exit():enter(); document.getElementById('modes')?.appendChild(b);
  addEventListener('deviceorientation',e=>{ if(e.beta!=null){ T.beta=e.beta; T.betaHist.push(e.beta); if(T.betaHist.length>30) T.betaHist.shift(); } });
  addEventListener('pointerdown',e=>{ if(!T.on||e.target.closest('button,#tablechip,#modes,#bar,#card,#more,#tagchip,#orbchip')) return; e.stopImmediatePropagation(); tap(e.clientX,e.clientY); },true);
  addEventListener('resize',size); size(); }
function size(){ if(!cv) return; const d=Math.min(devicePixelRatio,2); cv.width=innerWidth*d; cv.height=innerHeight*d; ctx.setTransform(d,0,0,d,0,0); if(T.P){ T.P.W=innerWidth; T.P.H=innerHeight; } }
export function enter(){ T.on=true; T.phase='scan'; T.scanT=0; T.P=null; document.getElementById('tblBtn')?.classList.add('on'); document.body.classList.add('table');
  try{ DeviceOrientationEvent?.requestPermission?.().catch(()=>{}); }catch{}
  ui(); say('Point the phone at a table and move it slowly. Tap the table to set it.'); window.labEvent?.('table:scan'); }
export function exit(){ T.on=false; T.phase='off'; document.getElementById('tblBtn')?.classList.remove('on'); document.body.classList.remove('table'); chip.hidden=true; ctx?.clearRect(0,0,innerWidth,innerHeight); }
export function lock(y){ T.P=planeNew(y,innerWidth,innerHeight); T.phase='place'; ui(); say('Table set. Tap it (or point and hold) to place a pinch of '+T.mat+'.'); window.labEvent?.('table:set'); }
export function tap(x,y){ if(T.phase==='scan'){ lock(Math.min(y,innerHeight*.9)); return; }
  if(T.phase==='place'){ if(y<T.P.top){ say('Tap on the table (below the line)'); return; } drop(x,y); } }
export function drop(x,y){ const n=placePile(T.items,T.P,x,y,T.mat); if(!n) say('Table is full: push things off or Clear'); else { T.spawned+=n; window.labEvent?.('table:place'); } }
function ui(){ chip.hidden=!T.on; chip.innerHTML=T.phase==='scan'?'<span>📐 Scanning: tap the table surface</span><button data-a="x">✕</button>'
  :`<span>📐 ${T.mat} · tap = place · poke = push</span><button data-a="r">Rescan</button><button data-a="c">Clear</button><button data-a="x">✕</button>`;
  chip.querySelectorAll('button').forEach(b=>b.onclick=()=>({r:()=>{T.phase='scan';T.P=null;ui();},c:()=>{T.items.length=0;},x:exit})[b.dataset.a]()); }
export function setMat(m){ if(COL[m]){ T.mat=m; if(T.on) ui(); } }
/* per frame. hs = tracked hands (screen px). Returns true when table mode owns the frame (element effects are skipped). */
export function update(hs,dt){ if(!T.on) return false; const W=innerWidth,H=innerHeight;
  if(T.phase==='scan'){ T.scanT+=dt; const y=planeFromPitch(T.beta,H); T.guess=(T.guess??y)+(y-(T.guess??y))*Math.min(1,dt*3);
    const h=T.betaHist, steady=h.length>20&&Math.max(...h)-Math.min(...h)<3; if(steady&&T.scanT>2.5) lock(T.guess); }
  const tips=[]; (hs||[]).forEach((h,i)=>{ const pts=[h.pts?.[8],h.pts?.[12],h.palm].filter(Boolean); pts.forEach((p,j)=>{ const q=T.prev[i*3+j]; tips.push({x:p.x,y:p.y,vx:q?(p.x-q.x)/Math.max(dt,1e-3):0,vy:q?(p.y-q.y)/Math.max(dt,1e-3):0}); T.prev[i*3+j]={x:p.x,y:p.y}; }); });
  if(!hs?.length) T.prev.length=0;
  if(T.phase==='place'){ T.P.W=W; T.P.H=H; if(tableStep(T.items,T.P,tips,dt)) window.labEvent?.('table:push');
    const h=hs?.[0], p=h?.pts?.[8]; // point and hold still on the table = place
    if(h&&h.g==='poke'&&p&&p.y>T.P.top&&!T.items.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<30)){ if(T.pokeAt&&Math.hypot(p.x-T.pokeAt.x,p.y-T.pokeAt.y)<12) T.pokeT+=dt; else { T.pokeT=0; T.pokeAt={x:p.x,y:p.y}; } if(T.pokeT>.9){ T.pokeT=-1.5; drop(p.x,p.y+8); } } else T.pokeT=0; }
  draw(W,H); return true; }
function draw(W,H){ ctx.clearRect(0,0,W,H); const top=T.P?T.P.top:(T.guess??H*.55), a=T.phase==='scan'?.35+.25*Math.sin(performance.now()/250):.22;
  // perspective grid on the plane
  ctx.strokeStyle=`rgba(140,230,255,${a})`; ctx.lineWidth=1; ctx.beginPath(); const vx=W/2, vy=top-H*.35;
  for(let i=-8;i<=8;i++){ const bx=W/2+i*W/6; ctx.moveTo(vx+(bx-vx)*.0+ (bx-vx)*((top-vy)/(H-vy)),top); ctx.lineTo(bx,H); }
  for(let k=0;k<7;k++){ const y=top+(H-top)*Math.pow(k/6,1.6); ctx.moveTo(0,y); ctx.lineTo(W,y); } ctx.stroke();
  if(T.phase==='scan'){ const y=top+(H-top)*.35; ctx.strokeStyle='#8fe6ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(W/2,y,34,12,0,0,6.283); ctx.stroke(); }
  const t=performance.now()/1000;
  for(const o of [...T.items].sort((a,b)=>a.y-b.y)){ const [c1,c2]=COL[o.el]||COL.water;
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(o.x,o.y+o.r*.35,o.r*1.1,o.r*.4,0,0,6.283); ctx.fill();
    const g=ctx.createRadialGradient(o.x-o.r*.35,o.y-o.r*1.1,o.r*.1,o.x,o.y-o.r*.7,o.r); g.addColorStop(0,c1); g.addColorStop(1,c2); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,o.y-o.r*.7,o.r,0,6.283); ctx.fill();
    if(o.el==='fire'&&o.big){ const f=1+.15*Math.sin(t*9+o.x); ctx.fillStyle='rgba(255,170,40,.8)'; ctx.beginPath(); ctx.ellipse(o.x,o.y-o.r*1.9,o.r*.4,o.r*.8*f,0,0,6.283); ctx.fill(); } } }
