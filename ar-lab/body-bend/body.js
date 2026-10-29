/* body-bend / body.js — pure logic (no DOM). PLACEHOLDER / PROPOSAL – not canon. Everything here is Simulated.
   Landmarks: MediaPipe Pose 33-point layout, normalized x,y in 0..1 (y down), v = visibility.
   Distances are measured in TORSO LENGTHS (T = shoulder-mid to hip-mid) so thresholds are camera-distance independent.
   Thresholds are first guesses checked only against synthetic fixtures (tests/), NOT tuned on a real camera. */
export const LM={NOSE:0,LSH:11,RSH:12,LEL:13,REL:14,LWR:15,RWR:16,LHIP:23,RHIP:24,LKNEE:25,RKNEE:26,LANK:27,RANK:28,LHEEL:29,RHEEL:30,LFOOT:31,RFOOT:32};
export const CFG={
  impactAnkleVel:2.5,   // T/s, downward ankle speed spike
  impactLift:0.25,      // T, foot must have travelled at least this far down
  impactHipVel:0.5,     // T/s, hips drop fast
  impactHipDrop:0.05,   // T
  landedVel:1.0,        // T/s, "then stop"
  minStance:0.8,        // ankle gap / shoulder width at impact (feet not together)
  calmAnkle:0.8, calmHip:0.8, // T/s considered "still" for SET and HOLD
  setMs:120, holdMs:300, setTimeoutMs:700,
  cooldownMs:2500, abortCooldownMs:800, jumpLockMs:1500,
  jumpRise:0.2,         // T, BOTH ankles above their floor baseline => jump (never rewarded)
  wideRatio:1.7,        // ankle gap / shoulder width
  lowKnee:150,          // deg, average knee angle at/under this = "low"
  maxStompsPerMin:8,
};
const ASSUMED_SHOULDER_M=0.40, ASSUMED_FOCAL=0.87; // ESTIMATE: ~60deg horizontal FOV, focal in frame-widths. Rough on purpose.

/* ---------- geometry helpers (isotropic: x multiplied by aspect = W/H) ---------- */
const P=(pts,i,a)=>({x:pts[i].x*a,y:pts[i].y,v:pts[i].v??1});
const mid=(p,q)=>({x:(p.x+q.x)/2,y:(p.y+q.y)/2});
const dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
export function kneeAngle(h,k,a){ const u={x:h.x-k.x,y:h.y-k.y}, w={x:a.x-k.x,y:a.y-k.y}; const d=Math.hypot(u.x,u.y)*Math.hypot(w.x,w.y)||1;
  return Math.acos(Math.max(-1,Math.min(1,(u.x*w.x+u.y*w.y)/d)))*180/Math.PI; }
export function measure(pts,aspect=1){ const g=i=>P(pts,i,aspect);
  const sh=mid(g(LM.LSH),g(LM.RSH)), hp=mid(g(LM.LHIP),g(LM.RHIP)); const T=dist(sh,hp)||1e-6;
  const sw=dist(g(LM.LSH),g(LM.RSH))||1e-6, gap=Math.abs(g(LM.LANK).x-g(LM.RANK).x);
  const kl=kneeAngle(g(LM.LHIP),g(LM.LKNEE),g(LM.LANK)), kr=kneeAngle(g(LM.RHIP),g(LM.RKNEE),g(LM.RANK));
  const floorY=Math.max(...[27,28,29,30,31,32].map(i=>pts[i].y));
  return {T,sw,swNorm:Math.abs(pts[LM.LSH].x-pts[LM.RSH].x),stance:gap/sw,knee:(kl+kr)/2,hipY:hp.y,hip:hp,sh,floorY,
    ankY:[g(LM.LANK).y,g(LM.RANK).y],ankX:[pts[LM.LANK].x,pts[LM.RANK].x]}; }
/* distance (m) ESTIMATED from shoulder width in frame-widths; and rock scale = frame-widths per metre at that distance */
export const distanceFromShoulders=swNorm=>ASSUMED_SHOULDER_M*ASSUMED_FOCAL/Math.max(1e-4,swNorm);
export const framesPerMetre=swNorm=>swNorm/ASSUMED_SHOULDER_M;

/* ---------- clear-space / full-body-in-frame check ---------- */
export function spaceCheck(pts,aspect=1){ const r=[]; if(!pts||pts.length<33) return {ok:false,reasons:['no body found']};
  const need=[0,11,12,23,24,25,26,27,28,31,32];
  if(need.some(i=>(pts[i].v??1)<.5)) r.push('whole body must be visible, head to feet');
  if(need.some(i=>pts[i].x<.02||pts[i].x>.98||pts[i].y<.02||pts[i].y>.98)) r.push('step back: you are touching the frame edge');
  const h=Math.max(...need.map(i=>pts[i].y))-Math.min(...need.map(i=>pts[i].y));
  if(h<.35) r.push('step a little closer'); if(h>.95) r.push('step back'); return {ok:r.length===0,reasons:r}; }

/* ---------- rest prompt (injectable clock) ---------- */
export class RestTimer{ constructor(everyMs=5*60000,restMs=15000){ this.everyMs=everyMs; this.restMs=restMs; this.start=null; this.state='active'; }
  begin(now){ this.start=now; this.state='active'; }
  update(now){ if(this.start==null) return this.state; const el=now-this.start;
    if(this.state==='active'&&el>=this.everyMs){ this.state='rest'; this.start=now; }
    else if(this.state==='rest'&&el>=this.restMs){ this.state='active'; this.start=now; } return this.state; }
  restLeftMs(now){ return this.state==='rest'?Math.max(0,this.restMs-(now-this.start)):0; } }

/* ---------- calm-motion quality (0..1): low acceleration of hips + wrists, smoothed ---------- */
export class MotionQuality{ constructor(A0=12){ this.A0=A0; this.h=[]; this.q=1; this.sm=null; }
  push(pts,t,aspect=1){ const m=measure(pts,aspect), T=m.T; const g=i=>P(pts,i,aspect);
    const cur=[m.hip,g(LM.LWR),g(LM.RWR)].map(p=>({x:p.x/T,y:p.y/T}));
    if(!this.sm) this.sm=cur; else this.sm=this.sm.map((s,i)=>({x:s.x+(cur[i].x-s.x)*.4,y:s.y+(cur[i].y-s.y)*.4}));
    this.h.push({t,p:this.sm.map(s=>({...s}))}); while(this.h.length&&t-this.h[0].t>1.2) this.h.shift();
    const f=this.h[this.h.length-1], at=tt=>this.h.reduce((b,e)=>Math.abs(e.t-tt)<Math.abs(b.t-tt)?e:b);
    if(this.h.length>5){ const a=at(t-.1), b=at(t-.2); let s=0,n=0;
      if(a!==b&&a!==f){ const dt=((f.t-a.t)+(a.t-b.t))/2; for(let i=0;i<3;i++){ const ax=(f.p[i].x-2*a.p[i].x+b.p[i].x)/(dt*dt), ay=(f.p[i].y-2*a.p[i].y+b.p[i].y)/(dt*dt); s+=ax*ax+ay*ay; n++; }
        const rms=Math.sqrt(s/n); this.acc=Math.max((this.acc||0)*.96,rms); this.q+= (Math.exp(-(this.acc)/this.A0)-this.q)*.08; } } return this.q; } }

/* ---------- STOMP recognizer: impact -> set -> hold, with cooldown; walking & jumping never trigger ---------- */
export class StompRecognizer{
  constructor(cfg={}){ this.c={...CFG,...cfg}; this.reset(); }
  reset(){ this.hist=[]; this.phase='idle'; this.until=0; this.jumpUntil=0; this.imp=null; this.calmSince=null; this.stomps=[]; this.m=null; this.paused=false; }
  /* feed one frame. returns array of events: impact | set | stomp | aborted | jump-ignored | rate-limited */
  feed(pts,t,aspect=1){ const ev=[]; const m=this.m=measure(pts,aspect), c=this.c, ms=t*1000;
    const e={t,ank:m.ankY,hip:m.hipY,T:m.T,v:[0,0],hv:0}; const H=this.hist; H.push(e); while(H.length&&t-H[0].t>2) H.shift();
    const back=H.slice().reverse().find(x=>t-x.t>=.09); if(back){ const dt=t-back.t, T=m.T; e.v=[(e.ank[0]-back.ank[0])/dt/T,(e.ank[1]-back.ank[1])/dt/T]; e.hv=(e.hip-back.hip)/dt/T; }
    const rec=H.filter(x=>t-x.t<=.4);
    const calm=Math.abs(e.v[0])<c.calmAnkle&&Math.abs(e.v[1])<c.calmAnkle&&Math.abs(e.hv)<c.calmHip;
    // jump: both ankles above their own floor baseline (max y over 1.5 s) at the same time
    const base=[0,1].map(a=>Math.max(...H.filter(x=>t-x.t<=1.5).map(x=>x.ank[a])));
    const jumpish=H.filter(x=>t-x.t<=.8).some(x=>[0,1].every(a=>(base[a]-x.ank[a])/m.T>=c.jumpRise));
    if(jumpish&&ms>this.jumpUntil){ this.jumpUntil=ms+c.jumpLockMs; ev.push({type:'jump-ignored',t}); if(this.phase!=='idle'){ this.phase='idle'; } }
    if(this.paused){ this.phase='idle'; return ev; }
    if(this.phase==='idle'){
      if(ms<this.until||ms<this.jumpUntil) return ev;
      for(const a of [0,1]){ const o=1-a; const peakV=Math.max(...rec.map(x=>x.v[a])), travel=(e.ank[a]-Math.min(...rec.map(x=>x.ank[a])))/m.T;
        const hipPeak=Math.max(...rec.map(x=>x.hv)), hipDrop=(e.hip-Math.min(...rec.map(x=>x.hip)))/m.T;
        if(peakV>=c.impactAnkleVel&&travel>=c.impactLift&&Math.abs(e.v[a])<=c.landedVel&&Math.abs(e.ank[a]-e.ank[o])/m.T<=.2
           &&hipPeak>=c.impactHipVel&&hipDrop>=c.impactHipDrop&&m.stance>=c.minStance){
          this.stomps=this.stomps.filter(s=>ms-s<60000); if(this.stomps.length>=c.maxStompsPerMin){ this.until=ms+c.cooldownMs; ev.push({type:'rate-limited',t}); return ev; }
          this.imp={t,a,x:m.ankX[a],landY:m.floorY,ank:e.ank[a]}; this.phase='set'; this.calmSince=null; ev.push({type:'impact',t,foot:a}); break; } }
    } else if(this.phase==='set'||this.phase==='hold'){
      const lifted=(this.imp.ank-e.ank[this.imp.a])/m.T>.2;
      if(lifted||Math.abs(e.v[this.imp.a])>c.landedVel*1.5&&this.phase==='hold'||Math.abs(e.hv)>c.calmHip*1.5&&this.phase==='hold'){ return this._abort(ev,t,ms); }
      if(calm){ if(this.calmSince==null) this.calmSince=ms; } else { this.calmSince=null; if(this.phase==='hold') return this._abort(ev,t,ms); }
      if(this.phase==='set'){ if(ms-this.imp.t*1000>c.setTimeoutMs&&this.calmSince==null) return this._abort(ev,t,ms);
        if(this.calmSince!=null&&ms-this.calmSince>=c.setMs){ this.phase='hold'; this.holdStart=ms; this.holdFloor=m.floorY; ev.push({type:'set',t}); } }
      else { if(ms-this.holdStart>=c.holdMs){ // held pose decides the effect
          const wideLow=m.stance>=c.wideRatio&&m.knee<=c.lowKnee; const imp=this.imp;
          const out={type:'stomp',t,x:m.ankX[imp.a],cx:(m.ankX[0]+m.ankX[1])/2,y:m.floorY,wideLow,wide:m.stance>=c.wideRatio,knee:m.knee,stance:m.stance,swNorm:m.swNorm,
            kind:wideLow?'shield':'slab',distM:distanceFromShoulders(m.swNorm),k:framesPerMetre(m.swNorm),simulated:true};
          this.stomps.push(ms); this.phase='idle'; this.until=ms+c.cooldownMs; this.imp=null; ev.push(out); } } }
    return ev; }
  _abort(ev,t,ms){ this.phase='idle'; this.imp=null; this.until=ms+this.c.abortCooldownMs; ev.push({type:'aborted',t}); return ev; }
  cooldownLeft(t){ return Math.max(0,this.until-t*1000); }
  /* tiny pose-name hint for the HUD */
  hint(t){ const m=this.m; if(this.paused) return 'rest'; if(this.phase==='set') return 'set…'; if(this.phase==='hold') return 'hold…';
    if(this.cooldownLeft(t)>0||t*1000<this.jumpUntil) return 'settle'; if(!m) return ''; const wl=m.stance>=this.c.wideRatio&&m.knee<=this.c.lowKnee;
    return wl?'wide + low · shield':m.stance>=this.c.wideRatio?'wide':'stand'; } }

/* ---------- rock / boat state: anchored to the floor spot, one at a time, slow rise, soft fade, slow push only ---------- */
export const RISE_S=1.0, RIPPLE_S=.8, RISE_DELAY_S=.7, FADE_S=1.2, TTL_S=90;
export const KINDS={slab:{wM:.8,hM:.5,front:.01},shield:{wM:1.5,hM:1.3,front:.03},boat:{wM:1.4,hM:.55,front:.01}};
export const easeInOut=u=>{u=Math.max(0,Math.min(1,u)); return u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;};
export class World{
  constructor(){ this.items=[]; this.pool=null; }
  /* stomp event -> single ripple, then rock/boat rises from its centre. Older item fades softly (one rock at a time). */
  spawn(ev,t){ for(const it of this.items) if(!it.fadeAt) it.fadeAt=t;
    let kind=ev.kind; if(this.pool&&this.inPool(ev.x,ev.y)){ kind=ev.kind==='shield'?'shield':'boat'; }
    const spec=KINDS[kind]; const it={kind,x:(kind==='shield'||kind==='boat')&&ev.cx!=null?ev.cx:ev.x,baseY:Math.min(.98,ev.y+spec.front),k:ev.k,t0:t,vx:0,fadeAt:0,inPool:!!(this.pool&&this.inPool(ev.x,ev.y)),seed:Math.floor((ev.x*977+ev.y*131)*1000)%9973,simulated:true};
    this.items.push(it); return it; }
  setPool(p){ this.pool=p; }   // {x,y,rxm,k} in normalized frame coords; drawn on dry ground only
  inPool(x,y,aspect=this.aspect||1){ const p=this.pool; if(!p) return false; const rx=p.rxm*p.k, ry=rx*aspect*.3; return ((x-p.x)/rx)**2+((y-p.y)/ry)**2<=1; }
  riseAmount(it,t){ return easeInOut((t-it.t0-RISE_DELAY_S)/RISE_S); }
  rippleAmount(it,t){ const u=(t-it.t0)/RIPPLE_S; return u<0||u>1.4?-1:u; }
  alpha(it,t){ const f=it.fadeAt||((t-it.t0>TTL_S)?it.t0+TTL_S:0); if(!f) return 1; return Math.max(0,1-(t-f)/FADE_S); }
  clear(t){ for(const it of this.items) if(!it.fadeAt) it.fadeAt=t; }
  /* geometry in frame-widths: {x0,x1,w,h} */
  box(it,t){ const s=KINDS[it.kind]; return {x0:it.x-s.wM*it.k/2,x1:it.x+s.wM*it.k/2,w:s.wM*it.k,hFrameW:s.hM*it.k*this.riseAmount(it,t)}; }
  /* slow push: a wrist inside the rock moving slowly drags it with heavy inertia; a fast flick does nothing. m/s limits. */
  step(dt,t,pushers,aspect=1){ this.aspect=aspect; this.items=this.items.filter(it=>this.alpha(it,t)>0);
    for(const it of this.items){ const b=this.box(it,t), rise=this.riseAmount(it,t); let target=null;
      if(rise>=1&&this.alpha(it,t)>=1) for(const p of pushers){ const hTop=b.hFrameW/aspect; const inside=p.x>=b.x0-.01&&p.x<=b.x1+.01&&p.y<=it.baseY+.01&&p.y>=it.baseY-hTop;
        const vm=Math.abs(p.vx)/it.k; if(inside&&vm>=.05&&vm<=.8) target=Math.max(-.15,Math.min(.15,p.vx*.3/ 1)); }
      const lim=.15*it.k; if(target!==null) it.vx+=(Math.max(-lim,Math.min(lim,target))-it.vx)*Math.min(1,dt*1.2); else it.vx*=Math.exp(-dt*3);
      it.vx=Math.max(-lim,Math.min(lim,it.vx)); it.x=Math.max(.05,Math.min(.95,it.x+it.vx*dt)); } }
  /* depth ordering: is the player in front of this item? (feet floor-y vs item base-y, with hysteresis) */
  playerInFront(it,feetY){ const f=it.inFront===undefined?feetY>=it.baseY:(it.inFront?feetY>it.baseY-.012:feetY>it.baseY+.012); it.inFront=f; return f; } }
