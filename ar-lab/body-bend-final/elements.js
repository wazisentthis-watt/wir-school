/* elements.js v8 — SOURCE-BASED bending. PLACEHOLDER / PROPOSAL, original WIR art, Simulated. Neutral names only.
   Rules (PROPOSAL, from fan-praise research): you never make an element from nothing (except air, gathered from the air).
   1 SOURCE  water from the pool · earth from ground your stomp loosens · fire from the flame · air by circling a hand.
   2 DRAW    put a hand near the source and lift slowly; the element comes up with weight (it lags ~150 ms behind you).
   3 HOLD    it stays as one mass that follows your hand with inertia; let both hands drop and it falls back.
   4 RELEASE a quick push sends it out; it slows down and SETTLES (water pools, earth lands, fire fades to embers, air dissolves).
   Calm physics: soft drag, nothing aimed at people. */
export const ELEMENTS=['water','earth','fire','air'];
const LOOK={water:['#7fd4ff','#3aa0ff','#d8f4ff'],earth:['#b08a5a','#7a5a36','#d9bf8c'],fire:['#ffd27f','#ff8a3a','#ff4d2a'],air:['#ffffff','#cfe8ff','#e8f0ff']};
export class Smoother{ constructor(a=.45){ this.a=a; this.p=null; }
  step(pts){ if(!pts){ this.p=null; return null; } if(!this.p||this.p.length!==pts.length){ this.p=pts.map(q=>({...q})); return this.p; }
    for(let i=0;i<pts.length;i++){ const q=pts[i],o=this.p[i], d=Math.hypot(q.x-o.x,q.y-o.y), a=Math.min(1,this.a+d*6); o.x+=(q.x-o.x)*a; o.y+=(q.y-o.y)*a; o.z=q.z; o.v=q.v; } return this.p; } }
const R=Math.random;
export class ElementFX{
  constructor(){ this.el='water'; this.ps=[]; this.mass=null; this.prev=null; this.loose=[]; this.spin=0; this.lastAng=null; this.hint=''; this.pool=1; this.t=0; }
  set(el){ if(LOOK[el]){ this.el=el; if(this.mass) this._drop(); } }
  onStomp(xn,yn){ this.loose.push({x:xn,y:yn,t:this.t}); if(this.loose.length>3) this.loose.shift(); }
  sources(W,H){ const s={water:[{x:.18*W,y:.9*H,r:.13*W}],fire:[{x:.82*W,y:.86*H,r:.09*W}],earth:this.loose.filter(l=>this.t-l.t<20).map(l=>({x:l.x*W,y:l.y*H,r:.1*W})),air:[]}; return s[this.el]; }
  _drop(){ const m=this.mass; this.mass=null; this._settle(m.x,m.y,m.amt,0,60); }
  _settle(x,y,amt,vx,vy){ const n=8+amt*30|0; for(let i=0;i<n;i++) this.ps.push({x,y,vx:vx*.3+(R()-.5)*120,vy:vy*.3+(R()-.5)*120-(this.el==='fire'?40:0),age:0,life:.8+R()*.8,s:3+R()*5,c:LOOK[this.el][R()*3|0],el:this.el,settle:true});
    if(this.el==='water') this.pool=Math.min(1.4,this.pool+amt*.2); }
  update(pts,W,H,dt){ this.t+=dt; let hint='';
    if(pts&&pts.length>=33){ const hand=[15,16].map(i=>({x:pts[i].x*W,y:pts[i].y*H,ok:(pts[i].v??1)>.4})); const hipY=(pts[23].y+pts[24].y)/2*H;
      const vel=hand.map((h,k)=>this.prev&&dt>0?{x:(h.x-this.prev[k].x)/dt,y:(h.y-this.prev[k].y)/dt}:{x:0,y:0});
      if(!this.mass){ const src=this.sources(W,H);
        if(this.el==='air'){ // gather: circle a hand
          const h=hand[1].ok?hand[1]:hand[0], c={x:(pts[11].x+pts[12].x)/2*W,y:(pts[11].y+pts[23].y)/2*H}; const a=Math.atan2(h.y-c.y,h.x-c.x);
          if(this.lastAng!=null){ let d=a-this.lastAng; if(d>Math.PI) d-=2*Math.PI; if(d<-Math.PI) d+=2*Math.PI; this.spin=this.spin*.97+Math.abs(d); } this.lastAng=a;
          if(R()<this.spin*.3) this.ps.push({x:h.x+(R()-.5)*60,y:h.y+(R()-.5)*60,vx:(R()-.5)*30,vy:(R()-.5)*30,age:0,life:.7,s:2+R()*3,c:LOOK.air[R()*3|0],el:'air'});
          hint='air: circle one hand to gather it'+(this.spin>.3?' · keep circling':'');
          if(this.spin>6){ this.mass={x:h.x,y:h.y,vx:0,vy:0,amt:.6,k:hand.indexOf(h)}; this.spin=0; } }
        else if(!src.length) hint='earth: stomp first to loosen the ground, then reach down and lift';
        else { hint=this.el+': put a hand near the '+(this.el==='water'?'pool':this.el==='fire'?'flame':'loosened ground')+' and lift slowly';
          for(let k=0;k<2;k++){ const h=hand[k]; if(!h.ok) continue; for(const s of src){ const d=Math.hypot(h.x-s.x,h.y-s.y);
            if(d<s.r*1.6){ s.draw=(s.draw||0); if(vel[k].y<-25&&vel[k].y>-900){ this.drawAmt=(this.drawAmt||0)+dt*1.2; for(let i=0;i<3;i++) this.ps.push({x:s.x+(R()-.5)*s.r,y:s.y,vx:(h.x-s.x)*2,vy:(h.y-s.y)*2,age:0,life:.5,s:3+R()*4,c:LOOK[this.el][R()*3|0],el:this.el}); }
              if((this.drawAmt||0)>.5){ this.mass={x:s.x,y:s.y,vx:0,vy:0,amt:.5,k}; this.drawAmt=0; if(this.el==='water') this.pool=Math.max(.3,this.pool-.15); } } } } } }
      else { const m=this.mass, h=hand[m.k].ok?hand[m.k]:hand[1-m.k], v=vel[hand[m.k].ok?m.k:1-m.k], sp=Math.hypot(v.x,v.y);
        const both=hand[0].ok&&hand[1].ok&&Math.hypot(hand[0].x-hand[1].x,hand[0].y-hand[1].y)<W*.25; const tx=both?(hand[0].x+hand[1].x)/2:h.x, ty=(both?(hand[0].y+hand[1].y)/2:h.y)-20;
        if(both) m.amt=Math.min(1.5,m.amt+dt*.25); // two hands together = hold more, steadier
        const k=this.el==='earth'?14:this.el==='water'?22:28, damp=this.el==='earth'?6:7; // spring = weight / lag
        m.vx+=((tx-m.x)*k-m.vx*damp)*dt; m.vy+=((ty-m.y)*k-m.vy*damp+(this.el==='earth'?120:0))*dt; m.x+=m.vx*dt; m.y+=m.vy*dt;
        hint=this.el+' held'+(both?' (two hands: steadier)':'')+' · push quickly to release · drop both hands to let go';
        if(sp>1100&&!both){ this.ps.push({x:m.x,y:m.y,vx:v.x*.5,vy:v.y*.5,age:0,life:1.6,s:14+m.amt*14,c:LOOK[this.el][0],el:this.el,shot:true,amt:m.amt}); this.mass=null; }
        else if(hand[0].y>hipY&&hand[1].y>hipY){ this.lowT=(this.lowT||0)+dt; if(this.lowT>1.2){ this._drop(); this.lowT=0; } } else this.lowT=0; }
      this.prev=hand; } else { this.prev=null; hint='step into view'; if(this.mass) this._drop(); }
    for(const p of this.ps){ p.age+=dt; const drag=p.shot?1.8:2.4; p.vx-=p.vx*drag*dt; p.vy-=p.vy*drag*dt;
      if(!p.shot){ p.vy+=(p.el==='earth'?300:p.el==='water'?120:p.el==='fire'?-80:0)*dt; }
      p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.y>H-4&&p.el!=='fire'){ p.y=H-4; p.vy*=-.2; p.vx*=.5; }
      if(p.shot&&(Math.hypot(p.vx,p.vy)<60||p.age>p.life)){ p.age=p.life; this._settle(p.x,p.y,p.amt,p.vx,p.vy); } }
    this.ps=this.ps.filter(p=>p.age<p.life).slice(-900); this.hint=hint; return hint; }
  _blob(ctx,x,y,r,cols,t){ const g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,cols[2]); g.addColorStop(.45,cols[0]); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); }
  draw(ctx,W,H){ const t=this.t; ctx.save();
    // sources
    ctx.globalAlpha=.85; if(this.el==='water'){ const s=this.sources(W,H)[0]; ctx.fillStyle='rgba(58,160,255,.35)'; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r*this.pool,s.r*.28*this.pool,0,0,7); ctx.fill(); ctx.strokeStyle='rgba(216,244,255,.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r*this.pool*(.6+.1*Math.sin(t*2)),s.r*.17*this.pool,0,0,7); ctx.stroke(); }
    if(this.el==='fire'){ const s=this.sources(W,H)[0]; ctx.globalCompositeOperation='lighter'; for(let i=0;i<5;i++) this._blob(ctx,s.x+Math.sin(t*5+i)*8,s.y-10-i*9+Math.sin(t*7+i)*4,26-i*4,LOOK.fire,t); ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#3a2a1a'; ctx.fillRect(s.x-30,s.y+8,60,10); }
    if(this.el==='earth') for(const s of this.sources(W,H)){ ctx.strokeStyle='rgba(217,191,140,.8)'; ctx.lineWidth=3; ctx.beginPath(); for(let i=0;i<6;i++){ const a=i/6*7; ctx.moveTo(s.x,s.y); ctx.lineTo(s.x+Math.cos(a)*s.r*.8,s.y+Math.sin(a)*s.r*.2); } ctx.stroke(); }
    // particles
    for(const p of this.ps){ const u=1-p.age/p.life; ctx.globalAlpha=Math.max(0,u)*.85;
      if(p.el==='earth'){ ctx.fillStyle=p.c; ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s*.8); }
      else { ctx.globalCompositeOperation='lighter'; this._blob(ctx,p.x,p.y,p.s*1.8,LOOK[p.el],t); ctx.globalCompositeOperation='source-over'; } }
    // held mass
    const m=this.mass; if(m){ ctx.globalAlpha=.95; const r=22+m.amt*26;
      if(this.el==='earth'){ ctx.fillStyle='#7a5a36'; ctx.beginPath(); for(let i=0;i<7;i++){ const a=i/7*6.283, rr=r*(.8+.2*Math.sin(i*2.3)); ctx[i?'lineTo':'moveTo'](m.x+Math.cos(a)*rr,m.y+Math.sin(a)*rr*.8); } ctx.closePath(); ctx.fill(); ctx.strokeStyle='#d9bf8c'; ctx.lineWidth=2; ctx.stroke(); }
      else { ctx.globalCompositeOperation='lighter'; const n=this.el==='air'?6:9; for(let i=0;i<n;i++){ const a=t*(this.el==='air'?6:2)+i*6.283/n, rr=r*(this.el==='air'?.9:.35); this._blob(ctx,m.x+Math.cos(a)*rr-m.vx*.03,m.y+Math.sin(a)*rr*.7-m.vy*.03,r*.6,LOOK[this.el],t); } } }
    ctx.restore(); } }
