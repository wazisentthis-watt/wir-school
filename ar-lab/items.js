/* Item tray: virtual desk items you pull out with a move, hold in the palm, then light / freeze / soak / throw / drop.
   Simple material + temperature model (°C-ish). Drawn procedurally on a 2D canvas (no external assets). */
import {FX,L,WATER,AIRB,rnd,waterSpawn,lightAt} from './fx.js';
import {E} from './elements.js';
export const MAT={
 paper:{name:'Paper ball',icon:'📃',r:24,ign:230,burn:.22,flame:1,bounce:.25,mass:.3,ash:true},
 candle:{name:'Candle',icon:'🕯',r:26,ign:150,burn:.012,flame:.55,bounce:.1,mass:1,wick:true},
 wood:{name:'Wood block',icon:'🪵',r:30,ign:300,burn:.03,flame:.6,bounce:.2,mass:1.2,smoulder:true},
 ice:{name:'Ice cube',icon:'🧊',r:24,ign:1e9,bounce:.35,mass:.8,ice:true,t0:-12},
 coin:{name:'Metal coin',icon:'🪙',r:20,ign:1e9,bounce:.45,mass:1,metal:true},
 leaf:{name:'Leaf',icon:'🍃',r:26,ign:260,burn:.16,flame:.8,bounce:.05,mass:.15,ash:true,flutter:true,wet0:.35},
 cup:{name:'Cup of water',icon:'🥛',r:30,ign:1e9,bounce:.1,mass:1.5,water:true},
};
export const IT={items:[],sel:'paper',open:false};
let cv,cx,say=()=>{};
const ground=()=>(FX.groundY||FX.H*.9);
export function init(sayFn){ say=sayFn||say; cv=document.getElementById('items'); cx=cv.getContext('2d');
  const fit=()=>{ cv.width=innerWidth; cv.height=innerHeight; }; fit(); addEventListener('resize',fit);
  const tray=document.getElementById('tray');
  tray.innerHTML=`<b>Items</b>${Object.entries(MAT).map(([k,m])=>`<button data-it="${k}" class="${k===IT.sel?'on':''}"><span>${m.icon}</span><small>${m.name}</small></button>`).join('')}<p>Scoop or cup your hand by the tray to pull the selected item out, or tap an item twice.</p><button data-it="clear" class="clr">Clear items</button>`;
  tray.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; const k=b.dataset.it;
    if(k==='clear'){ IT.items.length=0; return; }
    if(IT.sel===k){ spawn(k,170,ground()-MAT[k].r); say(`${MAT[k].name} on the desk`); }
    IT.sel=k; tray.querySelectorAll('button[data-it]').forEach(x=>x.classList.toggle('on',x.dataset.it===k)); });
  document.getElementById('trayBtn').onclick=()=>toggle(); }
export function toggle(on=!IT.open){ IT.open=on; document.getElementById('tray').classList.toggle('open',on); document.getElementById('trayBtn').classList.toggle('on',on); }
export function spawn(type,x,y){ const m=MAT[type]; const it={type,m,x,y,vx:0,vy:0,rot:0,vr:0,held:null,temp:m.t0??20,wet:m.wet0||0,char:0,burn:0,lit:false,size:1,level:m.water?1:0,frozen:m.ice?1:0,curl:0,seed:Math.random()*1000};
  IT.items.push(it); if(IT.items.length>8) IT.items.shift(); window.labEvent?.('item:'+type); return it; }
const trayEdge=()=>IT.open?(document.getElementById('tray').getBoundingClientRect().right||170):-1;
/* hands -> grab / hold / throw / drop */
function handle(hs,dt){
  for(let i=0;i<hs.length;i++){ const H=hs[i]; if(!H?.palm) continue; const mv=H.mv||[], held=IT.items.find(t=>t.held===i); H.holding=!!held;
    const hold={x:H.palm.x,y:H.palm.y-H.scale*.35};
    if(held){ held.x+=(hold.x-held.x)*.6; held.y+=(hold.y-held.y)*.6; held.vx=H.vx; held.vy=H.vy; held.rot+=((H.mvs?.pour?H.mvs.pour*.9:0)-held.rot)*.2;
      if(mv.includes('bloom')||(H.swipe&&H.speed>1100)){ held.held=null; held.vx=H.vx*1.1; held.vy=Math.min(H.vy*1.1,-200); held.vr=rnd(-8,8); say(`Threw the ${held.m.name.toLowerCase()}`); window.labEvent?.('item:throw'); }
      else if(mv.includes('flip')||mv.includes('palmDown')){ held.held=null; held.vx=H.vx*.3; held.vy=60; say('Dropped'); window.labEvent?.('item:drop'); }
      else if(held.m.water&&H.mvs?.pour&&held.level>0){ held.level=Math.max(0,held.level-dt*.25); const px=held.x+H.mvs.pour*held.m.r; if(held.frozen<.5) for(let k=0;k<2;k++) waterSpawn(px+rnd(-4,4),held.y-held.m.r*.4,H.mvs.pour*rnd(30,80),rnd(40,120),0,4); }
      // frost: a jellyfish pulse in Air mode chills what you hold
      if(E.mode==='air'&&mv.includes('pulse')){ held.temp=Math.min(held.temp,held.temp-45); held.wet=Math.max(held.wet,.05); say('Frost breath ❄'); }
      continue; }
    const grabbing=mv.includes('scoop')||mv.includes('pull')||(H.g==='cup'&&H.changed);
    if(!grabbing) continue;
    const near=IT.items.filter(t=>t.held==null).sort((a,b)=>Math.hypot(a.x-hold.x,a.y-hold.y)-Math.hypot(b.x-hold.x,b.y-hold.y))[0];
    if(near&&Math.hypot(near.x-hold.x,near.y-hold.y)<Math.max(90,H.scale*1.2)){ near.held=i; say(`Holding the ${near.m.name.toLowerCase()} (flick-open to throw, flip to drop)`); window.labEvent?.('item:hold'); }
    else if(IT.open&&H.palm.x<trayEdge()+140){ const it=spawn(IT.sel,hold.x,hold.y); it.held=i; say(`Pulled a ${it.m.name.toLowerCase()} from the tray`); window.labEvent?.('item:pull'); } } }
function sampleWater(t){ const W=WATER; if(!W.n) return 0; let c=0; for(let k=0;k<40;k++){ const j=(Math.random()*W.n)|0; if(Math.abs(W.x[j]-t.x)<t.m.r*1.2&&Math.abs(W.y[j]-t.y)<t.m.r*1.2) c++; } return c*W.n/40; }
function physics(t,dt,hs){ const m=t.m;
  if(t.held!=null&&!hs[t.held]?.palm) t.held=null;
  if(t.held==null){ const gy=ground()-m.r*t.size*.8; t.vy+=(m.flutter?500:1400)*dt; if(m.flutter){ t.vx+=Math.sin(FX.t*3+t.seed)*120*dt; t.vy*=.97; }
    t.x+=t.vx*dt; t.y+=t.vy*dt; t.rot+=t.vr*dt;
    if(t.y>gy){ t.y=gy; t.vy=-t.vy*m.bounce; t.vx*=.8; t.vr*=.7; if(Math.abs(t.vy)<40) t.vy=0; }
    if(t.x<m.r){ t.x=m.r; t.vx=Math.abs(t.vx)*.5; } if(t.x>FX.W-m.r){ t.x=FX.W-m.r; t.vx=-Math.abs(t.vx)*.5; } } }
function thermal(t,dt){ const m=t.m, r=m.r*t.size;
  let heat=0; for(const h of E.hot) if(Math.hypot(h.x-t.x,h.y-t.y)<r+h.r) heat+=1;
  for(const o of IT.items) if(o!==t&&(o.lit||o.burn>0)&&Math.hypot(o.x-t.x,o.y-t.y)<r+o.m.r*1.4) heat+=.6;
  for(const o of IT.items) if(o!==t&&o.m.ice&&o.size>.1&&Math.hypot(o.x-t.x,o.y-t.y)<r+o.m.r+6) t.temp-=12*dt;
  for(const b of AIRB) if(b.held&&Math.hypot(b.x-t.x,b.y-t.y)<r+b.r) t.temp-=25*dt*Math.min(3,Math.abs(b.spin||1));
  const wetIn=sampleWater(t); if(wetIn>0&&!m.water){ t.wet=Math.min(1,t.wet+wetIn*dt*.05); if(t.temp>100&&m.metal){ t.temp-=wetIn*4*dt; steam(t,2); } }
  if(m.water&&wetIn>0) t.level=Math.min(1,t.level+wetIn*dt*.01);
  const k=m.metal?1.6:m.water?.35:1; t.temp+=heat*(m.metal?520:300)*k*dt; t.temp=Math.min(t.temp,m.metal?950:1100); t.temp+=(20-t.temp)*(m.metal?.12:.18)*dt;
  if(heat&&t.wet>0){ t.wet=Math.max(0,t.wet-heat*.25*dt); if(Math.random()<.4) steam(t,1); }
  // phase / material behaviour
  if(m.ice){ if(t.temp>0){ t.size=Math.max(0,t.size-dt*(.01+Math.max(0,t.temp)*.0016)); if(Math.random()<.25) waterSpawn(t.x+rnd(-r*.4,r*.4),t.y+r*.6,rnd(-10,10),40,0,3); if(heat) t.temp=Math.min(t.temp,60); } }
  if(m.water){ if(t.temp>=100){ t.temp=100+(t.temp-100)*.2; if(t.level>0){ t.level=Math.max(0,t.level-dt*.02); if(Math.random()<.5) steam(t,1); } }
    t.frozen=Math.max(0,Math.min(1,t.frozen+(t.temp<0?dt*.25:-dt*.3))); }
  if(t.wet>0&&!m.water) t.frozen=Math.max(0,Math.min(1,t.frozen+(t.temp<0?dt*.4:-dt*.5)))*(t.wet>.05?1:0);
  if(m.ign<1e8&&t.temp>m.ign&&t.wet<.15&&t.frozen<.2&&!t.lit){ t.lit=true; say(`The ${m.name.toLowerCase()} caught fire`); window.labEvent?.('item:lit:'+t.type); }
  if(t.lit){ if(t.wet>.4||t.frozen>.5){ t.lit=false; steam(t,6); say('Hiss… put out'); }
    else { if(m.wick){ t.size=Math.max(.25,t.size-dt*m.burn); t.char=Math.min(.15,t.char+dt*.01); }
      else { t.char=Math.min(1,t.char+dt*m.burn); t.curl=Math.min(1,t.curl+dt*m.burn*1.5); if(m.smoulder&&t.char>.5&&Math.random()<.02) t.temp-=10; }
      t.temp=Math.max(t.temp,m.ign+40);
      const f=m.flame*(m.ash?(1-t.char*.8):m.smoulder?(t.char>.6?.35:1):1), fx=m.wick?t.x:t.x, fy=m.wick?t.y-r*1.05:t.y-r*.4;
      for(let i=0;i<(m.wick?2:5*f)*FX.Q;i++) L.fire.spawn(fx+rnd(-r,r)*(m.wick?.08:.45),fy,rnd(-12,12),-rnd(50,120)*(m.wick?.7:1),{size:rnd(10,20)*(m.wick?.8:f+.4),grow:.8,life:rnd(.2,.4),curl:m.wick?.4:1.2,a:.9});
      if(Math.random()<.06*f) L.smoke.spawn(fx,fy-10,rnd(-10,10),-rnd(40,80),{c:[.6,.58,.55],a:.15,size:rnd(30,50),grow:1.5,life:rnd(1,1.8),curl:1.2});
      if(m.smoulder&&Math.random()<.15) L.spark.spawn(t.x+rnd(-r,r)*.6,t.y+rnd(-r,r)*.4,rnd(-60,60),-rnd(60,160),{c:[1,.5,.2],size:5,life:.6,grav:200});
      E.hot.push({x:fx,y:fy,r:r*.6}); lightAt(fx,fy,[1,.6,.25],m.wick?1:1.6);
      if(m.ash&&t.char>=1){ for(let i=0;i<14;i++) L.dust.spawn(t.x+rnd(-r,r)*.5,t.y+rnd(-r,r)*.5,rnd(-60,60),rnd(-120,0),{c:[.35,.34,.33],size:rnd(3,7),life:rnd(1,2),grav:120,a:.8,drag:.97}); t.dead=true; say(`The ${m.name.toLowerCase()} burned to ash`); window.labEvent?.('item:ash'); } } }
  if(m.metal&&t.temp>400&&Math.random()<.05) lightAt(t.x,t.y,[1,.4,.15],(t.temp-400)/300); }
function steam(t,n){ for(let i=0;i<n;i++) L.smoke.spawn(t.x+rnd(-10,10),t.y-t.m.r*.6,rnd(-20,20),-rnd(60,120),{c:[.92,.94,.97],a:.18,size:rnd(20,36),grow:1.8,life:rnd(.8,1.4),curl:1.5}); }
export function update(hs,dt){ if(!cx) return; handle(hs||[],dt);
  for(const t of IT.items){ physics(t,dt,hs||[]); thermal(t,dt); } IT.items=IT.items.filter(t=>!t.dead&&!(t.m.ice&&t.size<=.05));
  draw(); }
export function zones(){ return IT.items.map(t=>({x:t.x-t.m.r,y:t.y-t.m.r,w:t.m.r*2,h:t.m.r*2,up:90})); }
/* ---------- procedural drawing ---------- */
const lerp=(a,b,u)=>a+(b-a)*u, mix=(c1,c2,u)=>c1.map((v,i)=>Math.round(lerp(v,c2[i],u)));
const rgb=(c,a=1)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
function heatTint(t){ return t<400?0:Math.min(1,(t-400)/450); }
function draw(){ cx.clearRect(0,0,cv.width,cv.height);
  if(IT.open||IT.items.length){ cx.save(); cx.strokeStyle='rgba(255,255,255,.08)'; cx.setLineDash([6,8]); cx.beginPath(); cx.moveTo(0,ground()); cx.lineTo(cv.width,ground()); cx.stroke(); cx.restore(); }
  for(const t of IT.items){ const m=t.m, r=m.r*Math.max(.15,t.size); cx.save(); cx.translate(t.x,t.y); cx.rotate(t.rot);
    // contact shadow
    if(t.held==null){ cx.save(); cx.rotate(-t.rot); cx.fillStyle='rgba(0,0,0,.25)'; cx.beginPath(); cx.ellipse(0,ground()-t.y-2,r*.9,4,0,0,7); cx.fill(); cx.restore(); }
    const ch=t.char;
    if(t.type==='paper'){ const base=mix([238,234,222],[30,22,18],ch); cx.fillStyle=rgb(base); cx.beginPath();
      for(let i=0;i<14;i++){ const a=i/14*6.283, rr=r*(.78+.22*Math.sin(t.seed+i*2.3))*(1-t.curl*.25); cx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } cx.closePath(); cx.fill();
      cx.strokeStyle=rgb(mix([190,185,170],[15,10,8],ch),.9); cx.lineWidth=1; for(let i=0;i<5;i++){ cx.beginPath(); cx.moveTo(rnd0(t,i)*r*.6,rnd0(t,i+7)*r*.6); cx.lineTo(rnd0(t,i+3)*r*.6,rnd0(t,i+9)*r*.6); cx.stroke(); }
      if(t.lit){ cx.strokeStyle='rgba(255,140,40,.9)'; cx.lineWidth=2; cx.beginPath(); cx.arc(0,0,r*(1-ch*.4)*.9,0,7); cx.stroke(); } }
    else if(t.type==='leaf'){ const base=mix(mix([70,160,60],[150,110,40],Math.min(1,ch*2)),[25,18,12],Math.max(0,ch*2-1)); cx.fillStyle=rgb(base); cx.scale(1,1-t.curl*.5);
      cx.beginPath(); cx.moveTo(-r,0); cx.quadraticCurveTo(0,-r*.75,r,0); cx.quadraticCurveTo(0,r*.75,-r,0); cx.fill(); cx.strokeStyle=rgb(mix([40,110,40],[20,14,10],ch)); cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(-r*1.15,0); cx.lineTo(r*.9,0); cx.stroke(); }
    else if(t.type==='candle'){ const h=r*2*t.size, w=r*.8; cx.fillStyle='#f4ecd8'; cx.fillRect(-w/2,r-h,w,h); cx.fillStyle='rgba(255,255,255,.25)'; cx.fillRect(-w/2+3,r-h,4,h);
      if(t.lit){ cx.fillStyle='rgba(244,236,216,.9)'; cx.beginPath(); cx.ellipse(0,r-h,w*.55,4,0,0,7); cx.fill(); cx.fillStyle='rgba(255,220,150,.9)'; cx.beginPath(); cx.ellipse(0,r-h-10,4,9,0,0,7); cx.fill(); }
      cx.strokeStyle='#222'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(0,r-h); cx.lineTo(0,r-h-6); cx.stroke(); }
    else if(t.type==='wood'){ const base=mix([168,118,70],[28,20,16],ch); cx.fillStyle=rgb(base); cx.fillRect(-r,-r*.7,r*2,r*1.4);
      cx.strokeStyle=rgb(mix([120,80,45],[10,8,6],ch)); cx.lineWidth=1; for(let i=0;i<4;i++){ cx.beginPath(); cx.moveTo(-r,-r*.5+i*r*.33); cx.bezierCurveTo(-r*.3,-r*.6+i*r*.33,r*.3,-r*.4+i*r*.33,r,-r*.5+i*r*.33); cx.stroke(); }
      if(t.lit&&ch>.3){ const g=cx.createRadialGradient(0,0,2,0,0,r); g.addColorStop(0,`rgba(255,${90+Math.random()*40|0},20,${.25+ch*.3})`); g.addColorStop(1,'rgba(255,60,0,0)'); cx.fillStyle=g; cx.fillRect(-r,-r*.7,r*2,r*1.4); } }
    else if(t.type==='ice'){ const s=r*1.6; cx.fillStyle='rgba(200,235,255,.55)'; rr(cx,-s/2,-s/2,s,s,6); cx.fill(); cx.strokeStyle='rgba(240,250,255,.9)'; cx.lineWidth=1.5; cx.stroke(); cx.fillStyle='rgba(255,255,255,.6)'; cx.fillRect(-s*.3,-s*.35,s*.18,s*.4);
      if(t.temp>0){ cx.fillStyle='rgba(160,210,255,.6)'; cx.beginPath(); cx.arc(s*.2,s*.5,2.5,0,7); cx.fill(); } }
    else if(t.type==='coin'){ const ht=heatTint(t.temp); const base=mix([196,170,90],[255,110,40],ht); const g=cx.createLinearGradient(-r,-r,r,r); g.addColorStop(0,rgb(mix(base,[255,255,255],.35))); g.addColorStop(1,rgb(mix(base,[0,0,0],.3))); cx.fillStyle=g;
      cx.beginPath(); cx.ellipse(0,0,r,r*.92,0,0,7); cx.fill(); cx.strokeStyle=rgb(mix(base,[0,0,0],.4)); cx.lineWidth=2; cx.beginPath(); cx.ellipse(0,0,r*.75,r*.68,0,0,7); cx.stroke();
      if(ht>0){ cx.globalCompositeOperation='lighter'; const gg=cx.createRadialGradient(0,0,r*.3,0,0,r*1.8); gg.addColorStop(0,`rgba(255,120,40,${ht*.5})`); gg.addColorStop(1,'rgba(255,60,0,0)'); cx.fillStyle=gg; cx.beginPath(); cx.arc(0,0,r*1.8,0,7); cx.fill(); } }
    else if(t.type==='cup'){ const w=r*1.3, h=r*1.7; cx.beginPath(); cx.moveTo(-w/2,-h/2); cx.lineTo(w/2,-h/2); cx.lineTo(w*.4,h/2); cx.lineTo(-w*.4,h/2); cx.closePath(); cx.fillStyle='rgba(220,240,255,.18)'; cx.fill();
      if(t.level>0){ const ly=h/2-h*.9*t.level; cx.save(); cx.clip(); cx.fillStyle=t.frozen>.5?'rgba(220,240,255,.85)':'rgba(70,150,255,.6)'; cx.fillRect(-w,ly,w*2,h); cx.restore();
        if(t.temp>=95&&t.frozen<.5){ cx.fillStyle='rgba(255,255,255,.7)'; for(let i=0;i<3;i++){ cx.beginPath(); cx.arc(rnd(-w*.3,w*.3),rnd(ly,h/2),2,0,7); cx.fill(); } } }
      cx.strokeStyle='rgba(235,245,255,.8)'; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(-w/2,-h/2); cx.lineTo(-w*.4,h/2); cx.lineTo(w*.4,h/2); cx.lineTo(w/2,-h/2); cx.stroke(); }
    // wet sheen / frost overlay
    if(t.wet>.15&&!m.water){ cx.fillStyle=`rgba(90,150,255,${t.wet*.25})`; cx.beginPath(); cx.arc(0,0,r*.9,0,7); cx.fill(); }
    if(t.frozen>.1&&!m.ice){ cx.strokeStyle=`rgba(230,245,255,${t.frozen*.8})`; cx.lineWidth=1; for(let i=0;i<6;i++){ const a=i*1.05+t.seed; cx.beginPath(); cx.moveTo(0,0); cx.lineTo(Math.cos(a)*r*.9,Math.sin(a)*r*.9); cx.stroke(); } }
    cx.restore();
    if(t.held!=null||document.body.classList.contains('more')){ cx.fillStyle='rgba(255,255,255,.7)'; cx.font='10px system-ui'; cx.fillText(`${m.name}${t.lit?' 🔥':''}${t.frozen>.5?' ❄':''}${t.wet>.3?' 💧':''} ${Math.round(t.temp)}°`,t.x-r,t.y-r-8); } } }
function rnd0(t,i){ return Math.sin(t.seed*7.1+i*12.9898)*.9; }
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
