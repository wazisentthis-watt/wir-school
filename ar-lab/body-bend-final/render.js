/* render.js — canvas drawing only (no assets, no network). PLACEHOLDER / PROPOSAL – not canon. Everything drawn is Simulated.
   Pseudo-3D: every solid is a set of columns with front / top / side faces pushed toward a vanishing point (frustum look),
   so shape + shading + parallax change with where the rock stands in the frame. Depth is FAKED. */
import {KINDS,RISE_DELAY_S} from './body.js';
const HORIZON=.38; // fraction of frame height used as the vanishing point row (fixed guess, not measured)
const rr=seed=>{ let s=(seed>>>0)||1; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; };
const hsl=(h,s,l,a=1)=>`hsla(${h},${s}%,${l}%,${a})`;
const toward=(p,vp,s)=>({x:p.x+(vp.x-p.x)*s,y:p.y+(vp.y-p.y)*s});
const poly=(ctx,pts,fill)=>{ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); };
export const horizonY=H=>H*HORIZON;

export function drawShadow(ctx,cx,by,w,amt,alpha){ const rx=w*.62, ry=w*.12; ctx.save(); ctx.translate(cx,by); ctx.scale(1,ry/rx); const g=ctx.createRadialGradient(0,0,rx*.15,0,0,rx);
  g.addColorStop(0,`rgba(0,0,0,${(.15+.4*amt)*alpha})`); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,rx,0,Math.PI*2); ctx.fill(); ctx.restore(); }

/* single ripple ring on the floor at the stomp point, then the solid rises from its centre */
export function drawRipple(ctx,it,u,W,H){ if(u<0||u>1.4) return; const k=Math.min(1,u), a=Math.max(0,1-u/1.4); const rx=(.15+.95*k)*it.k*W, ry=rx*.28*(W/H)/(W/H);
  ctx.save(); ctx.translate(it.x*W,it.baseY*H); ctx.scale(1,.28); ctx.lineWidth=2.5; ctx.strokeStyle=it.inPool?`rgba(210,240,255,${.75*a})`:`rgba(225,205,170,${.7*a})`;
  ctx.beginPath(); ctx.arc(0,0,rx,0,Math.PI*2); ctx.stroke(); ctx.restore(); }

export function drawPool(ctx,pool,world,W,H,t){ if(!pool) return; const rx=pool.rxm*pool.k*W, ry=rx*.3; ctx.save(); ctx.translate(pool.x*W,pool.y*H);
  const g=ctx.createRadialGradient(0,0,rx*.1,0,0,rx); g.addColorStop(0,'rgba(80,170,215,.38)'); g.addColorStop(.85,'rgba(60,140,200,.28)'); g.addColorStop(1,'rgba(40,110,170,.05)');
  ctx.scale(1,.3); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,rx,0,Math.PI*2); ctx.fill();
  ctx.lineWidth=2; ctx.strokeStyle='rgba(190,235,255,.45)'; ctx.stroke(); ctx.lineWidth=1.2; ctx.strokeStyle=`rgba(255,255,255,${.12+.06*Math.sin(t*.8)})`; ctx.beginPath(); ctx.arc(0,0,rx*(.55+.03*Math.sin(t*.7)),0,Math.PI*2); ctx.stroke(); ctx.restore(); }

/* rock slab / shield: columns with front/top/side faces */
export function drawRock(ctx,it,world,t,W,H){ const spec=KINDS[it.kind], rise=world.riseAmount(it,t), al=world.alpha(it,t); if(rise<=0||al<=0) return;
  const n=it.kind==='shield'?13:7, w=spec.wM*it.k*W, hFull=spec.hM*it.k*W, cx=it.x*W, by=it.baseY*H, vp={x:W/2,y:H*HORIZON}, s=it.kind==='shield'?.09:.13, r=rr(it.seed);
  const cw=w/n, dir=cx<vp.x?1:-1; const cols=[]; for(let i=0;i<n;i++){ const u=(i+.5)/n, prof=it.kind==='shield'?.78+.22*Math.sin(Math.PI*u)**.7:.8+.2*Math.sin(Math.PI*u); cols.push({i,h:hFull*prof*(.9+.1*r()),sh:r(),lean:(r()-.5)*cw*.25}); }
  ctx.save(); ctx.globalAlpha=al; drawShadow(ctx,cx,by,w,rise,al); ctx.beginPath(); ctx.rect(0,0,W,by+1); ctx.clip(); const lift=(1-rise);
  const order=dir>0?cols:cols.slice().reverse();
  for(const c of order){ const x0=cx-w/2+c.i*cw, x1=x0+cw+.5, off=lift*c.h*1.02, top=by-c.h+off, bot=by+off, l=c.lean;
    const F=[{x:x0,y:bot},{x:x1,y:bot},{x:x1+l,y:top},{x:x0+l,y:top}];
    // side face toward the vanishing point
    const xe=dir>0?x1:x0, xt=xe+(dir>0?l:l), T={x:xt,y:top}, B={x:xe,y:bot}; const Tb=toward(T,vp,s), Bb=toward(B,vp,s);
    poly(ctx,[B,T,Tb,Bb],hsl(26,16,22+c.sh*6));
    if(top>vp.y){ const TL=toward(F[3],vp,s), TR=toward(F[2],vp,s); poly(ctx,[F[3],F[2],TR,TL],hsl(30,15,50+c.sh*8)); }
    poly(ctx,F,hsl(28,17,36+c.sh*9)); const g=ctx.createLinearGradient(0,top,0,bot); g.addColorStop(0,'rgba(255,240,215,.14)'); g.addColorStop(1,'rgba(0,0,0,.28)'); poly(ctx,F,g);
    ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0+cw*.2+l,top+c.h*.2); ctx.lineTo(x0+cw*.7+l,top+c.h*(.35+.3*c.sh)); ctx.stroke(); }
  ctx.restore(); }

/* simple boat (side-on hull + deck) that rises out of the (virtual) water with a slow bob */
export function drawBoat(ctx,it,world,t,W,H){ const spec=KINDS.boat, rise=world.riseAmount(it,t), al=world.alpha(it,t); if(rise<=0||al<=0) return;
  const w=spec.wM*it.k*W, h=spec.hM*it.k*W, cx=it.x*W, by=it.baseY*H, vp={x:W/2,y:H*HORIZON}, bob=rise>=1?Math.sin(t*1.1)*h*.025:0;
  ctx.save(); ctx.globalAlpha=al; drawShadow(ctx,cx,by,w*.9,rise*.6,al); ctx.beginPath(); ctx.rect(0,0,W,by+h*.04); ctx.clip(); ctx.translate(cx,by+(1-rise)*h*1.1+bob);
  const hull=[{x:-.36*w,y:0},{x:.34*w,y:0},{x:.5*w,y:-h*.78},{x:-.5*w,y:-h}];
  const abs=p=>({x:p.x+cx,y:p.y+by}); const deckL=hull[3], deckR=hull[2], dL=toward({x:deckL.x,y:deckL.y},{x:vp.x-cx,y:vp.y-by},.18), dR=toward({x:deckR.x,y:deckR.y},{x:vp.x-cx,y:vp.y-by},.18);
  if(by-h>vp.y) poly(ctx,[deckL,deckR,dR,dL],hsl(28,40,22)); 
  const g=ctx.createLinearGradient(0,-h,0,0); g.addColorStop(0,hsl(27,42,44)); g.addColorStop(1,hsl(24,40,24)); poly(ctx,hull,g);
  ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=1.5; for(const f of [.33,.66]){ ctx.beginPath(); ctx.moveTo(-.43*w+.07*w*f*0,-h*f*.95); ctx.lineTo(.42*w,-h*f*.7); ctx.stroke(); }
  ctx.strokeStyle='rgba(255,230,190,.35)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(hull[3].x,hull[3].y); ctx.lineTo(hull[2].x,hull[2].y); ctx.stroke(); ctx.restore(); }

/* FLOW layer drawing (all optional, faint): string, soft trail, release ring. st = flow engine state; flip = mirror x (front camera engine coords).
   Nothing here is a designed mechanic: neutral placeholder look. */
const rgba=(c,a)=>'rgba('+(c[0]*255|0)+','+(c[1]*255|0)+','+(c[2]*255|0)+','+a+')';
export function drawFlow(ctx,st,W,flip,opts={}){ if(!st||!st.world) return; const wd=st.world, T=st.torso, col=st.stringType.color, q=st.quality;
  const X=u=>{ const x=wd.cx+u*T; return flip?W-x:x; }, Y=v=>wd.cy+v*T;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  if(opts.string){
    if(st.stringType.behaviour==='paint') for(const tr of st.trail){ const al=Math.max(0,1-tr.age/3)*.18*tr.a; ctx.fillStyle=rgba(col,al); ctx.beginPath(); ctx.arc(X(tr.x),Y(tr.y),4,0,7); ctx.fill(); }
    const sg=st.string; if(sg){ const glow=.1+.5*q; ctx.lineCap='round';
      for(const pass of [0,1]){ ctx.strokeStyle=rgba(pass?[1,1,1]:col,(pass?.3:.2)*glow*2); ctx.lineWidth=(pass?1.5:6)*(.5+.5*st.palm+.3*q); ctx.beginPath(); ctx.moveTo(X(sg[0].x),Y(sg[0].y));
        for(let j=1;j<sg.length-1;j++){ const xm=(sg[j].x+sg[j+1].x)/2, ym=(sg[j].y+sg[j+1].y)/2; ctx.quadraticCurveTo(X(sg[j].x),Y(sg[j].y),X(xm),Y(ym)); } ctx.stroke(); } } }
  for(const p of st.pulses){ ctx.strokeStyle=rgba(col,.35*p.amt*(1-p.age/2.5)); ctx.lineWidth=3; ctx.beginPath(); ctx.arc(X(p.x),Y(p.y),p.r*1.5*T,0,7); ctx.stroke(); }
  ctx.restore(); }

/* person silhouette from landmarks: used for the SIM scene and as the FALLBACK mask when no segmentation mask is available (rough!) */
export function drawPerson(ctx,pts,W,H,fill='#fff',head='#fff'){ const X=i=>pts[i].x*W, Y=i=>pts[i].y*H, sw=Math.hypot(X(11)-X(12),Y(11)-Y(12))||W*.1;
  ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.fillStyle=fill; ctx.strokeStyle=fill;
  ctx.beginPath(); for(const [i,j] of [[11,0],[12,0]]){} ctx.moveTo(X(11),Y(11)); ctx.lineTo(X(12),Y(12)); ctx.lineTo(X(24),Y(24)); ctx.lineTo(X(23),Y(23)); ctx.closePath(); ctx.fill();
  ctx.lineWidth=sw*.30; for(const [a,b,c] of [[11,13,15],[12,14,16]]){ ctx.beginPath(); ctx.moveTo(X(a),Y(a)); ctx.lineTo(X(b),Y(b)); ctx.lineTo(X(c),Y(c)); ctx.stroke(); }
  ctx.lineWidth=sw*.38; for(const [a,b,c,d] of [[23,25,27,31],[24,26,28,32]]){ ctx.beginPath(); ctx.moveTo(X(a),Y(a)); ctx.lineTo(X(b),Y(b)); ctx.lineTo(X(c),Y(c)); ctx.lineTo(X(d),Y(d)); ctx.stroke(); }
  ctx.lineWidth=sw*.2; ctx.beginPath(); ctx.moveTo((X(11)+X(12))/2,(Y(11)+Y(12))/2); ctx.lineTo(X(0),Y(0)); ctx.stroke();
  ctx.fillStyle=head; ctx.beginPath(); ctx.arc(X(0),Y(0),sw*.34,0,Math.PI*2); ctx.fill(); ctx.restore(); }

export function drawSimScene(ctx,W,H,pts,t){ const hz=H*HORIZON; let g=ctx.createLinearGradient(0,0,0,hz); g.addColorStop(0,'#27324a'); g.addColorStop(1,'#46526b'); ctx.fillStyle=g; ctx.fillRect(0,0,W,hz);
  g=ctx.createLinearGradient(0,hz,0,H); g.addColorStop(0,'#7a6f62'); g.addColorStop(1,'#a8987f'); ctx.fillStyle=g; ctx.fillRect(0,hz,W,H-hz);
  ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1; for(let i=-12;i<=12;i++){ ctx.beginPath(); ctx.moveTo(W/2+i*8,hz); ctx.lineTo(W/2+i*W*.28,H); ctx.stroke(); }
  for(let j=1;j<10;j++){ const y=hz+(H-hz)*Math.pow(j/10,1.8); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  if(pts){ drawPerson(ctx,pts,W,H,'#d9a05b','#f0c58a'); ctx.fillStyle='rgba(20,20,30,.0)'; } }
