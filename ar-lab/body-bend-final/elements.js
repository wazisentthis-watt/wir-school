/* elements.js — body-driven element particles. PLACEHOLDER / PROPOSAL, original WIR art (no outside-franchise visuals). Simulated.
   Elements follow wrists (15,16) and ankles (27,28). Calm physics: soft drag, nothing flies off fast, nothing aimed at people. */
export const ELEMENTS=['water','earth','fire','air'];
const LOOK={water:{c:['#7fd4ff','#3aa0ff','#d8f4ff'],g:-20,drag:2.2,life:1.4,size:[4,9]},
  earth:{c:['#b08a5a','#7a5a36','#d9bf8c'],g:260,drag:1.2,life:1.6,size:[3,8]},
  fire:{c:['#ffd27f','#ff8a3a','#ff4d2a'],g:-90,drag:2.8,life:.9,size:[3,7]},
  air:{c:['#ffffff','#cfe8ff','#e8f0ff'],g:-5,drag:1.6,life:1.8,size:[2,5]}};
export class Smoother{ constructor(a=.45){ this.a=a; this.p=null; }
  step(pts){ if(!pts){ this.p=null; return null; } if(!this.p||this.p.length!==pts.length){ this.p=pts.map(q=>({...q})); return this.p; }
    for(let i=0;i<pts.length;i++){ const q=pts[i],o=this.p[i], d=Math.hypot(q.x-o.x,q.y-o.y), a=Math.min(1,this.a+d*6); o.x+=(q.x-o.x)*a; o.y+=(q.y-o.y)*a; o.z=q.z; o.v=q.v; } return this.p; } }
export class ElementFX{
  constructor(max=700){ this.max=max; this.ps=[]; this.el='water'; this.prev=null; this.orb=0; }
  set(el){ if(LOOK[el]) this.el=el; }
  emit(x,y,vx,vy,n,el=this.el){ const L=LOOK[el]; for(let i=0;i<n&&this.ps.length<this.max;i++){ const r=Math.random;
    this.ps.push({x:x+(r()-.5)*8,y:y+(r()-.5)*8,vx:vx*.35+(r()-.5)*40,vy:vy*.35+(r()-.5)*40,life:L.life*(.6+r()*.6),age:0,s:L.size[0]+r()*(L.size[1]-L.size[0]),c:L.c[(r()*L.c.length)|0],el}); } }
  /* pts: normalized landmarks; W,H canvas px; dt s. Returns hand speed (px/s) for HUD use. */
  update(pts,W,H,dt,mirror=false){ let speed=0; const fx=x=>mirror?(1-x)*W:x*W;
    if(pts&&pts.length>=33){ const J=[15,16,27,28]; const cur=J.map(i=>({x:fx(pts[i].x),y:pts[i].y*H,ok:(pts[i].v??1)>.4}));
      if(this.prev&&dt>0) for(let k=0;k<4;k++){ const a=cur[k],b=this.prev[k]; if(!a.ok||!b.ok) continue; const vx=(a.x-b.x)/dt, vy=(a.y-b.y)/dt, sp=Math.hypot(vx,vy);
        if(k<2){ speed=Math.max(speed,sp); const n=Math.min(10,Math.floor(sp/90))+(this.el==='fire'?1:0); this.emit(a.x,a.y,vx,vy,n); }
        else if(sp>120) this.emit(a.x,a.y,vx*.2,-Math.abs(vy)*.2,Math.min(6,sp/150|0),this.el==='air'?'air':'earth'); }
      // palms near each other -> a held orb of the current element that grows while held
      const d=Math.hypot(cur[0].x-cur[1].x,cur[0].y-cur[1].y); this.orbX=(cur[0].x+cur[1].x)/2; this.orbY=(cur[0].y+cur[1].y)/2;
      this.orb=d<W*.22&&cur[0].ok&&cur[1].ok?Math.min(1,this.orb+dt*.8):Math.max(0,this.orb-dt*1.5);
      if(this.orb>.05&&Math.random()<.6) this.emit(this.orbX,this.orbY,0,0,1);
      this.prev=cur; } else this.prev=null;
    for(const p of this.ps){ const L=LOOK[p.el]; p.age+=dt; p.vx-=p.vx*L.drag*dt; p.vy-=p.vy*L.drag*dt; p.vy+=L.g*dt;
      if(p.el==='air'){ const a=p.age*4; p.vx+=Math.cos(a)*30*dt; p.vy+=Math.sin(a)*30*dt; }
      p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.el==='earth'&&p.y>H-4){ p.y=H-4; p.vy*=-.2; p.vx*=.6; } }
    this.ps=this.ps.filter(p=>p.age<p.life); return speed; }
  draw(ctx){ ctx.save(); ctx.globalCompositeOperation='lighter';
    for(const p of this.ps){ const u=1-p.age/p.life; ctx.globalAlpha=Math.max(0,u)*(p.el==='earth'?.9:.75);
      if(p.el==='earth'){ ctx.globalCompositeOperation='source-over'; ctx.fillStyle=p.c; ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s*.8); ctx.globalCompositeOperation='lighter'; continue; }
      const r=p.s*(p.el==='fire'?u+.3:1); const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2); g.addColorStop(0,p.c); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,r*2,0,7); ctx.fill(); }
    if(this.orb>.05){ const L=LOOK[this.el], r=18+this.orb*34; ctx.globalAlpha=.55*this.orb; const g=ctx.createRadialGradient(this.orbX,this.orbY,0,this.orbX,this.orbY,r); g.addColorStop(0,L.c[2]); g.addColorStop(.5,L.c[0]); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(this.orbX,this.orbY,r,0,7); ctx.fill(); }
    ctx.restore(); } }
