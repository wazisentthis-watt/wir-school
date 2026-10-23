/* Elements mode (water / fire / earth / air) + chemistry effects, all on the fx.js engine. */
import {POOL,AIRB,airBall,airClear,mote,FX,L,WATER,ROCKS,rnd,addField,waterSpawn,waterThrow,waterCount,rockSpawn,rockCrumble,dust,lightAt,paperAt,paperChar} from './fx.js';

export const E={ev:n=>E.onEv?.(n),mode:'water', hands:[], combo:0, onGesture:null, hot:[], booms:[]};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const FING=[[8,6],[12,10],[16,14],[20,18]];

/* ---- gesture reading (forgiving: 3-frame debounce, hysteresis on pinch) ---- */
export function readHand(H,pts,dt,cal){
  const prevPalm=H.palm; H.pts=pts;
  const palm={x:(pts[0].x+pts[5].x+pts[9].x+pts[13].x+pts[17].x)/5,y:(pts[0].y+pts[5].y+pts[9].y+pts[13].y+pts[17].y)/5};
  const scale=dist(pts[0],pts[9])||1; H.scale0=H.scale||scale; H.scale=scale;
  H.palm=palm; H.tip=pts[8]; H.pinchPt={x:(pts[4].x+pts[8].x)/2,y:(pts[4].y+pts[8].y)/2};
  if(prevPalm){ const ivx=(palm.x-prevPalm.x)/dt, ivy=(palm.y-prevPalm.y)/dt, k=Math.min(1,dt*18); H.vx=(H.vx||0)+(ivx-(H.vx||0))*k; H.vy=(H.vy||0)+(ivy-(H.vy||0))*k; }
  else {H.vx=H.vy=0;}
  H.speed=Math.hypot(H.vx,H.vy); H.push=(H.scale-H.scale0)/H.scale/dt; H.pushS=(H.pushS||0)*.8+H.push*.2;
  const ext=FING.filter(([t,p])=>dist(pts[t],pts[0])>dist(pts[p],pts[0])*(cal.ext||1.12)).length;
  // Gestures (phone-friendly, no pinch): POKE = index only; VEE = index+middle up; OPEN; FIST (rare: needs 6 steady frames).
  const up=f=>dist(pts[FING[f][0]],pts[0])>dist(pts[FING[f][1]],pts[0])*(cal.ext||1.12);
  const iu=up(0),mu=up(1),ru=up(2),pu=up(3);
  let g='relaxed';
  if(ext>=4) g='open'; else if(iu&&mu&&!ru&&!pu) g='vee'; else if(iu&&!mu&&!ru&&!pu) g='poke'; else if(ext===0) g='fist'; else if(ext>=3) g='open';
  H.cand===g?H.cn++:(H.cand=g,H.cn=1);
  const prevG=H.g; if(H.cn>=(g==='fist'?6:g==='poke'?2:3)) H.g=g; H.pinch=H.g==='vee';
  H.pinchPt=H.g==='vee'?{x:(pts[8].x+pts[12].x)/2,y:(pts[8].y+pts[12].y)/2}:{x:pts[8].x,y:pts[8].y};
  // fingertip push toward the camera = tap
  H.tap=H.g==='poke'&&H.pushS>1.2&&(!H.tapCd||FX.t>H.tapCd); if(H.tap) H.tapCd=FX.t+.6;
  H.changed=prevG!==H.g; H.prevG=prevG;
  // circle detector on index tip (or palm)
  const p=H.g==='poke'||H.g==='vee'?pts[8]:palm; H.trail=(H.trail||[]); H.trail.push({x:p.x,y:p.y,t:FX.t}); while(H.trail.length&&FX.t-H.trail[0].t>1.2) H.trail.shift();
  H.circle=null; if(H.trail.length>12){ let cx=0,cy=0; for(const q of H.trail){cx+=q.x;cy+=q.y;} cx/=H.trail.length; cy/=H.trail.length;
    let acc=0,r=0; for(let i=1;i<H.trail.length;i++){ const a0=Math.atan2(H.trail[i-1].y-cy,H.trail[i-1].x-cx), a1=Math.atan2(H.trail[i].y-cy,H.trail[i].x-cx); let d=a1-a0; if(d>Math.PI)d-=2*Math.PI; if(d<-Math.PI)d+=2*Math.PI; acc+=d; r+=Math.hypot(H.trail[i].x-cx,H.trail[i].y-cy);} r/=H.trail.length;
    if(Math.abs(acc)>Math.PI*1.7&&r>35){ H.circle={x:cx,y:cy,r,dir:Math.sign(acc)}; H.trail=[]; } }
  H.swipe=H.speed>(cal.swipe||1300);
  { const r=(t,p)=>Math.max(0,Math.min(1,(dist(pts[t],pts[0])/(dist(pts[p],pts[0])||1)-1)/.55));
    H.fx=[Math.max(0,Math.min(1,(dist(pts[4],pts[17])/(dist(pts[2],pts[17])||1)-1)/.6)),r(8,6),r(12,10),r(16,14),r(20,18)];
    H.spread=(dist(pts[8],pts[12])+dist(pts[12],pts[16])+dist(pts[16],pts[20]))/3/scale; }
  return H; }

/* ---- per-element behaviour ---- */
const MODES={
 water(H,dt){ const W=WATER; W.orb=null;
   if(H.g==='vee'){ const p=H.pinchPt; if(W.n<560*FX.Q) for(let i=0;i<2;i++) waterSpawn(p.x+rnd(-6,6),p.y+8,rnd(-15,15)+H.vx*.3,rnd(60,140),0,8);
     if(H.changed) E.say('Pouring onto the ground'); if(POOL.n>40&&!H.poolEv){ H.poolEv=1; E.ev('water:pool'); } }
   if(H.g==='open'){ waterStrands(H,dt); return; } else strandsOff(H);
   if(H.g==='poke'){ const p=H.pinchPt; W.path.unshift({x:p.x,y:p.y}); if(W.path.length>34) W.path.length=34;
     let moved=0; for(let i=0;i<W.n;i++) if(W.mode[i]===1){W.mode[i]=2;moved++;}
     if(waterCount(2)<120*FX.Q) for(let i=0;i<3;i++) waterSpawn(p.x+rnd(-10,10),p.y+rnd(-10,10),0,0,2,4);
     W.orb=null; if(H.swipe&&H.speed>1700){ waterThrow(H.vx*1.1,H.vy*1.1,2); W.path=[]; E.say('Water whip!'); } }
   else { if(H.changed&&(H.prevG==='open'||H.prevG==='poke')){ const n=waterThrow(H.vx*1.1,H.vy*1.1-100,-1); if(n&&H.speed>500) E.say('Splash!'); }
     W.orb=null; W.path=[]; } },
 fire(H,dt){ const k=FX.Q;
   if(H.g==='open'){ const dx=H.pts[9].x-H.pts[0].x, dy=H.pts[9].y-H.pts[0].y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d, o={x:H.pts[9].x+ux*H.scale*.5,y:H.pts[9].y+uy*H.scale*.5};
     L.glow.spawn(o.x,o.y,0,0,{c:[1,.5,.15],a:.25,size:H.scale*.9,life:.06,field:0});
     if((H.pushS>.9||H.swipe)&&(!H.burstCd||FX.t>H.burstCd)){ H.burstCd=FX.t+.7; const bx=H.swipe?H.vx/(H.speed||1):ux, by=H.swipe?H.vy/(H.speed||1):uy;
       for(let i=0;i<34*k;i++){ const sp=rnd(420,640), sx=bx+rnd(-.12,.12), sy=by+rnd(-.12,.12); L.fire.spawn(o.x+rnd(-5,5),o.y+rnd(-5,5),sx*sp,sy*sp-30,{size:rnd(16,30),grow:1.1,life:rnd(.22,.38),drag:.9,curl:1.2,a:.8}); }
       for(let i=0;i<4;i++) E.hot.push({x:o.x+bx*60*(i+1),y:o.y+by*60*(i+1),r:30});
       lightAt(o.x,o.y,[1,.55,.2],2.2); E.say('Burst'); E.ev('fire:burst'); }
     else if(H.changed) E.say('Push your palm toward the camera for a burst'); }
   if(H.g==='poke'){ const t=H.pinchPt; H.focus=H.speed<260?Math.min(2.5,(H.focus||0)+dt):Math.max(0,(H.focus||0)-dt*3); const g=1+H.focus*.6;
     E.hot.push({x:t.x,y:t.y,r:18*g});
     for(let i=0;i<(5+4*H.focus)*FX.Q;i++) L.fire.spawn(t.x+rnd(-3,3)*g,t.y-4,rnd(-12,12)*g+H.vx*.3,-rnd(60,130)*g,{size:rnd(12,20)*g,grow:.9,life:rnd(.24,.38)*Math.sqrt(g),curl:1.2,a:1});
     L.glow.spawn(t.x,t.y-6*g,0,0,{c:[1,.75,.4],a:.5,size:22*g,life:.05,field:0});
     lightAt(t.x,t.y,[1,.6,.25],.8*g); if(H.changed) E.say('Fingertip flame: hold still to focus it');
     if(H.focus>1&&!H.fev){ H.fev=1; E.ev('fire:flame'); } if(H.focus>2&&H.fev<2){ H.fev=2; E.ev('fire:focus'); } }
   else { H.focus=0; H.fev=0; }
   if(H.g==='vee'){ E.ember=E.ember||{x:H.palm.x,y:H.palm.y,r:10,vx:0,vy:0,held:true}; const b=E.ember; b.held=true; b.x+=(H.palm.x-b.x)*.5; b.y+=(H.palm.y-H.scale*.4-b.y)*.5; b.vx=H.vx; b.vy=H.vy; b.r=Math.min(40,b.r+dt*30);
     if(H.changed) E.say('Ember ball charging… flick or open your hand to throw'); if(b.r>30&&!b.ev){ b.ev=1; E.ev('fire:ember'); } }
   else if(E.ember?.held&&(H.changed||H.swipe)){ const b=E.ember; b.held=false; const s=Math.max(700,H.speed*1.2), d=Math.hypot(H.vx,H.vy)||1; b.vx=H.speed>250?H.vx/d*s:0; b.vy=H.speed>250?H.vy/d*s:-900; E.say('Fireball!'); E.ev('fire:fireball'); } },
 earth(H,dt){
   const near=(p)=>ROCKS.filter(k=>k.mode!=='held').sort((a,b)=>dist(a,p)-dist(b,p))[0];
   if(H.g==='open'){ if(H.vy<-450&&(!H.liftCd||FX.t>H.liftCd)&&!(H.lift&&ROCKS.includes(H.lift))){ H.lift=rockSpawn(H.palm.x+rnd(-20,20),H.palm.y-H.scale*.2); H.liftCd=FX.t+.6; E.say('Rock rises!'); E.ev('earth:rise'); }
     if(H.lift&&ROCKS.includes(H.lift)&&H.lift.mode!=='held'&&H.lift.mode!=='free'){ H.lift.ty=Math.min(H.lift.ty,H.palm.y-H.scale*.3); H.lift.x+=(H.palm.x-H.lift.x)*.1; if(H.lift.mode==='hover') H.lift.mode='rise'; }
     for(const k of ROCKS) if(k.mode==='hover'&&H.swipe&&dist(k,H.palm)<260){ k.mode='free'; k.vx=H.vx*1.1; k.vy=H.vy*1.1; } }
   if(H.g!=='open') H.lift=null;
  if(H.g==='vee'){ if(!H.rock){ const k=near(H.pinchPt); if(k&&dist(k,H.pinchPt)<k.r*2.2) {H.rock=k; k.mode='held'; E.say('Got it. Flick to throw.'); E.ev('earth:grab');} }
     if(H.rock){ H.rock.hx=H.pinchPt.x; H.rock.hy=H.pinchPt.y; } }
   else if(H.rock){ const k=H.rock; H.rock=null; if(!ROCKS.includes(k)) return;
     if(H.g==='fist'){ rockCrumble(k); E.say('Crushed to dust'); }
     else { k.mode=H.speed>300?'free':'hover'; k.ty=k.y; k.vx=H.vx*1.2; k.vy=H.vy*1.2; if(k.mode==='free'){ E.say('Thrown!'); E.ev('earth:throw'); } } }
   if(H.g==='fist'&&H.changed&&!H.rock){ const k=near(H.palm); if(k&&dist(k,H.palm)<k.r*1.6){ rockCrumble(k); E.say('Crushed to dust'); } } },
 air(H,dt){ const tip=H.g==='open'?H.palm:H.tip, pv=H.lastTip||tip, sp=Math.hypot(tip.x-pv.x,tip.y-pv.y)/dt; H.lastTip={x:tip.x,y:tip.y};
   const w=circRate(H,H.g==='vee'?H.pinchPt:tip);
   if(sp>120&&Math.random()<.5*FX.Q) mote(tip.x+rnd(-20,20),tip.y+rnd(-20,20),(tip.x-pv.x)/dt*.5,(tip.y-pv.y)/dt*.5);
   let b=H.ball&&AIRB.includes(H.ball)?H.ball:null;
   if(H.g==='vee'){ const c={x:(H.pts[8].x+H.pts[12].x)/2,y:(H.pts[8].y+H.pts[12].y)/2-H.scale*.25};
     if(!b||b.free){ b=H.ball=airBall(c.x,c.y,14); E.say('Air ball: circle your hand to spin it'); E.ev('air:ball'); }
     b.held=true; b.x+=(c.x-b.x)*.5; b.y+=(c.y-b.y)*.5; b.r=Math.min(Math.max(34,H.scale*.55),b.r+dt*40); feedSpin(b,w,dt,H); }
   if(b&&b.held){ const s=Math.abs(b.spin); if(s>5) E.ev('air:spin'); const ps=Math.max(s,b.peak||0); b.keepT=s>5?(b.keepT||0)+dt:0; if(b.keepT>3&&!b.kev){ b.kev=1; E.ev('air:keep'); }
     if(H.swipe&&H.speed>900){ if(ps>5){ b.held=false; b.free=true; b.vx=H.vx*1.1; b.vy=H.vy*1.1; b.life=1; H.ball=null; E.say('Air ball thrown'); E.ev('air:throw'); }
       else if(!H.spinCd||FX.t>H.spinCd){ H.spinCd=FX.t+2; E.say('Spin it first: keep circling'); } }
     else if(H.g!=='vee'&&H.g!=='open') b.held=false; }
   if(H.g==='open'&&H.swipe&&(!H.gustCd||FX.t>H.gustCd)){ H.gustCd=FX.t+.5; addField({type:'push',x:H.palm.x,y:H.palm.y,r:320,vx:H.vx,vy:H.vy,dur:.5});
     const g=airBall(H.palm.x,H.palm.y,26); g.held=false; g.free=true; g.vx=H.vx*.9; g.vy=H.vy*.9; g.spin=4*Math.sign(H.vx||1); g.life=.6;
     for(let i=0;i<14*FX.Q;i++) mote(H.palm.x+rnd(-50,50),H.palm.y+rnd(-50,50),H.vx*rnd(.5,1),H.vy*rnd(.5,1)); E.say('Gust!'); } },
};
/* circles make a vortex in every mode; it pushes water, fire, smoke, dust and rocks */
const TIPS=[4,8,12,16,20];
function strandsOff(H,sink){ for(const S of WATER.strands) S.on=false; for(let i=0;i<WATER.n;i++) if(WATER.mode[i]===4){ WATER.mode[i]=0; WATER.vy[i]=sink?200:0; } H.amt=0; }
function waterStrands(H,dt){ const W=WATER, gy=FX.groundY; if(!gy) return;
  if(POOL.n+W.strands.reduce((s,S)=>s+S.n,0)<12){ if(!H.dryCd||FX.t>H.dryCd){ H.dryCd=FX.t+4; E.say('Pour water first: ✌️ over the floor'); } return; }
  if(H.vy>650&&(H.amt||0)>.2){ strandsOff(H,true); E.say('Sink'); E.ev('water:sink'); return; }
  H.amt=Math.max(0,Math.min(1,(H.amt||0)-H.vy*dt/260));       // raise the palm to pull up, push down to sink back
  let on=0;
  for(let f=0;f<5;f++){ const S=W.strands[f], tp=H.pts[TIPS[f]], e=H.fx[f]; S.on=H.amt>.05&&e>.3&&tp.y<gy-20;
    if(!S.on) continue; on++; S.rx+=(tp.x-S.rx)*.25; S.tx=tp.x; S.ty=gy-(gy-tp.y)*H.amt; S.w=2+Math.min(6,H.spread*4)*e;
    const want=Math.round((14+16*e)*H.amt*FX.Q);
    if(S.n<want){ let best=-1,bd=1e9; for(let k=0;k<24;k++){ const i=(Math.random()*W.n)|0; if(W.mode[i]===3){ const d=Math.abs(W.x[i]-S.rx); if(d<bd){bd=d;best=i;} } }
      if(best>=0){ W.mode[best]=4; W.sid[best]=f; W.idx[best]=Math.random(); S.n++; } }
    else if(S.n>want+2){ for(let i=0;i<W.n;i++) if(W.mode[i]===4&&W.sid[i]===f&&W.idx[i]>.7){ W.mode[i]=0; S.n--; break; } } }
  for(let f=0;f<5;f++) if(!W.strands[f].on) for(let i=0;i<W.n;i++) if(W.mode[i]===4&&W.sid[i]===f) W.mode[i]=0;
  if(H.amt>.6&&on) E.ev('water:raise'); if(on===5) { H.had5=1; E.ev('water:strands5'); } else if(H.had5&&on>=2&&on<5&&H.amt>.3){ H.had5=0; E.ev('water:curl'); }
  if(H.swipe&&on){ waterThrow(H.vx*1.1,H.vy*1.1,4); strandsOff(H); E.say('Water whip!'); E.ev('water:throw'); } }
/* air: angular speed of the fingertip around its own recent centre (rad/s), for spinning a ball like a basketball */
function circRate(H,p){ const T=H.tr2=(H.tr2||[]); T.push({x:p.x,y:p.y,t:FX.t}); while(T.length&&FX.t-T[0].t>.5) T.shift(); if(T.length<6) return 0;
  let cx=0,cy=0; for(const q of T){cx+=q.x;cy+=q.y;} cx/=T.length; cy/=T.length; let acc=0,r=0;
  for(let i=1;i<T.length;i++){ let d=Math.atan2(T[i].y-cy,T[i].x-cx)-Math.atan2(T[i-1].y-cy,T[i-1].x-cx); if(d>Math.PI)d-=2*Math.PI; if(d<-Math.PI)d+=2*Math.PI; acc+=d; r+=Math.hypot(T[i].x-cx,T[i].y-cy); }
  r/=T.length-1; const span=T[T.length-1].t-T[0].t; return r>12&&span>.15?acc/span:0; }
function feedSpin(b,w,dt,H){ b.peak=Math.max(Math.abs(b.spin),(b.peak||0)*Math.pow(.5,dt)); if(H&&H.speed>700) return; if(Math.abs(w)>2){ b.spin+=(w*1.1-b.spin)*Math.min(1,dt*2.5); b.fed=true; } }
export function vortex(c){ addField({type:'vortex',x:c.x,y:c.y,r:Math.max(180,c.r*3),str:2600,dir:c.dir,dur:4}); E.say('Vortex!'); E.vortex={...c,t:4}; }
function stepVortexFx(dt){ const v=E.vortex; if(!v) return; v.t-=dt; if(v.t<=0){E.vortex=null;return;}
  for(let i=0;i<10*FX.Q;i++){ const a=rnd(0,6.28), r=rnd(.3,1.4)*Math.max(60,v.r*1.5); const x=v.x+Math.cos(a)*r, y=v.y+Math.sin(a)*r;
    if(i<4) mote(x,y,-Math.sin(a)*v.dir*380,Math.cos(a)*v.dir*380); }
  if(E.mode==='fire'&&Math.random()<.8) for(let i=0;i<6*FX.Q;i++){ const a=rnd(0,6.28); L.fire.spawn(v.x+Math.cos(a)*v.r*.8,v.y+Math.sin(a)*v.r*.8,-Math.sin(a)*v.dir*300,Math.cos(a)*v.dir*300,{size:rnd(24,40),grow:1,life:rnd(.4,.7),curl:1,a:.7}); }
  if(E.mode==='earth'&&Math.random()<.3) dust(v.x+rnd(-v.r,v.r),v.y+rnd(-v.r,v.r),3,.6);
  if(E.mode==='water'&&Math.random()<.5) for(let i=0;i<3;i++){ const a=rnd(0,6.28); waterSpawn(v.x+Math.cos(a)*v.r,v.y+Math.sin(a)*v.r,-Math.sin(a)*v.dir*500,Math.cos(a)*v.dir*500,0,1.2); } }

/* ember ball / fireball */
function stepEmber(dt){ const b=E.ember; if(!b) return;
  if(!b.held){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.vy+=120*dt; const out=b.x<0||b.x>FX.W||b.y<0||b.y>FX.H;
    if(out){ boom(Math.max(0,Math.min(FX.W,b.x)),Math.max(0,Math.min(FX.H,b.y)),b.r); E.ember=null; return; } }
  E.hot.push({x:b.x,y:b.y,r:b.r*1.4});
  const k=FX.Q; L.glow.spawn(b.x,b.y,0,0,{c:[1,.45,.12],size:b.r*4.5,life:.08,a:.7,field:0});
  L.glow.spawn(b.x,b.y,0,0,{c:[1,.95,.8],size:b.r*1.6,life:.06,field:0});
  for(let i=0;i<(b.held?10:18)*k;i++){ const a=rnd(0,6.28), r=rnd(0,b.r); L.fire.spawn(b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,-b.vx*.15+rnd(-60,60),-b.vy*.15-rnd(40,140),{size:rnd(18,34)*(b.r/30),grow:.8,life:rnd(.25,.5),curl:2,a:.8}); }
  if(Math.random()<.4) L.spark.spawn(b.x,b.y,rnd(-200,200),rnd(-300,0),{c:[1,.6,.25],size:8,life:.6,grav:500});
  lightAt(b.x,b.y,[1,.5,.2],3); }
export function boom(x,y,r=30,c){ E.booms.push({x:x,y:y,r:r*4,t:FX.t}); FX.flash=.8; FX.shake=8; lightAt(x,y,[1,.6,.3],8);
  addField({type:'blast',x,y,r:320,str:5000,dur:.35});
  for(let i=0;i<60*FX.Q;i++){ const a=rnd(0,6.28), s=rnd(100,500); L.fire.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{size:rnd(30,60),grow:1.8,life:rnd(.4,.9),drag:.92,curl:2,a:.65}); }
  for(let i=0;i<50*FX.Q;i++){ const a=rnd(0,6.28), s=rnd(300,1100); L.streak.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{life:rnd(.4,.9),w:2,lag:14,grav:900,c:c||[1,.65,.3]}); }
  for(let i=0;i<5;i++) L.smoke.spawn(x+rnd(-30,30),y+rnd(-30,30),rnd(-80,80),rnd(-140,-30),{c:[.42,.4,.38],a:.25,size:rnd(60,100),grow:1.6,life:rnd(1.4,2.4),curl:1}); }

/* two-hand combo: clap both open palms together -> elemental burst */
function pairBall(hs,dt){ const [a,b]=hs; if(hs.length<2||a.g!=='open'||b.g!=='open'){ if(E.pair&&AIRB.includes(E.pair)) E.pair.held=false; E.pair=null; return; }
  const gap=dist(a.palm,b.palm); if(gap>a.scale*3.4){ if(E.pair) E.pair.held=false; E.pair=null; return; }
  const c={x:(a.palm.x+b.palm.x)/2,y:(a.palm.y+b.palm.y)/2}; if(!E.pair||!AIRB.includes(E.pair)){ E.pair=airBall(c.x,c.y,20); E.ev('air:ball'); }
  const p=E.pair; p.held=true; p.x=c.x; p.y=c.y; p.r+=(Math.max(24,gap*.36)-p.r)*.2; feedSpin(p,circRate(a,a.palm),dt); if(Math.abs(p.spin)>5) E.ev('air:spin'); }
function combo(hs,dt){ if(E.mode==='air') pairBall(hs,dt); if(hs.length<2) { E.prevGap=null; return; } const [a,b]=hs, gap=dist(a.palm,b.palm);
  const closing=E.prevGap!=null?(E.prevGap-gap)/dt:0; E.prevGap=gap;
  if(gap<a.scale*1.3&&closing>500&&(!E.comboCd||FX.t>E.comboCd)&&!['poke','vee'].includes(a.g)&&!['poke','vee'].includes(b.g)){ E.comboCd=FX.t+1.2; const x=(a.palm.x+b.palm.x)/2, y=(a.palm.y+b.palm.y)/2; burst(x,y); } }
export function burst(x,y){ E.say('COMBO: Elemental burst!'); addField({type:'blast',x,y,r:420,str:6000,dur:.4}); FX.shake=10;
  if(E.mode==='fire') boom(x,y,50);
  else if(E.mode==='water'){ for(let i=0;i<220*FX.Q;i++){const a=rnd(0,6.28),s=rnd(300,1200); waterSpawn(x,y,Math.cos(a)*s,Math.sin(a)*s-200,0,2);} }
  else if(E.mode==='earth'){ for(let i=0;i<3;i++) rockSpawn(x+(i-1)*140,y-40); dust(x,FX.H-6,60,1.6); }
  else { for(let i=0;i<3;i++){ const g=airBall(x,y,30); g.held=false; g.free=true; const a=i*2.09; g.vx=Math.cos(a)*700; g.vy=Math.sin(a)*700; g.spin=8; } for(let i=0;i<40*FX.Q;i++){const a=rnd(0,6.28),s=rnd(200,700); mote(x,y,Math.cos(a)*s,Math.sin(a)*s);} addField({type:'vortex',x,y,r:400,str:3000,dir:1,dur:3}); } }

export function update(hands,dt){
  E.hands=hands; E.hot=E.booms.filter(b=>FX.t-b.t<.4); E.booms=E.hot.slice();
  FX.groundY=E.mode==='water'?FX.H*.86:null;
  if(MODES[E.mode]) for(const H of hands){ MODES[E.mode](H,dt); if(H.circle&&!(E.mode==='air'&&(H.ball||E.pair))&&!(E.mode==='water'&&H.g==='open')) vortex(H.circle); }
  if(!hands.some(h=>h.g==='open')&&E.mode==='water') WATER.orb=null;
  if(MODES[E.mode]) combo(hands,dt);
  stepEmber(dt); stepVortexFx(dt); }
export function clearAll(){ WATER.n=0; WATER.orb=null; WATER.path=[]; for(const k of [...ROCKS]) rockCrumble(k); E.ember=null; E.vortex=null; FX.fields.length=0; airClear(); E.pair=null; for(const S of WATER.strands) S.on=false; }

/* ---------------- chemistry visuals ---------------- */
const em=[]; let chemOn=false, burner=null, basin=null, paperR=null, charK=0;
export function chemProps(on,rects){ chemOn=on; FX.basins.length=0; paperAt(null);
  if(!on) return; burner=rects.flame; basin=rects.water; paperR=rects.paper;
  FX.basins.push({x:basin.left+8,y:basin.top+basin.height*.45,w:basin.width-16,h:basin.height*.5});
  paperAt(paperR); paperChar(charK=0); }
function center(r){ return {x:r.left+r.width/2,y:r.top+r.height/2}; }
export function chemReset(){ paperChar(charK=0); em.length=0; }
export function chemFx(type,target,r){ em.push({type,target,t:0,dur:type==='nothing'?1:3.4,color:r.color||[1,1,1],ox:0}); }
function burnerFlame(c,col,boost=1){ const k=FX.Q, x=c.x, y=c.y+18;
  for(let i=0;i<5*k*boost;i++) L.flame.spawn(x+rnd(-6,6),y,rnd(-15,15),rnd(-220,-140)*boost,{c:col||[.45,.6,1.4],size:rnd(16,26)*boost,grow:-.3,life:rnd(.25,.4),curl:.8,a:.6,field:.3}); }
export function chemStep(dt){ if(!chemOn) return; const k=FX.Q;
  // idle props: Bunsen flame and a water dish that stays full
  if(burner) burnerFlame(center(burner));
  if(basin){ let inB=0; for(let i=0;i<WATER.n;i++) if(WATER.mode[i]===0&&WATER.y[i]>basin.top) inB++;
    if(inB<70*k) for(let i=0;i<3;i++) waterSpawn(basin.left+rnd(14,basin.width-14),basin.top+basin.height*.55,0,0,0,30); }
  for(let i=em.length-1;i>=0;i--){ const e=em[i]; e.t+=dt; const R=e.target==='water'?basin:e.target==='paper'?paperR:burner; const c=center(R);
    const p={x:c.x,y:e.target==='water'?R.top+R.height*.5:c.y};
    switch(e.type){
     case 'mgburn': case 'mgflare': { const big=e.type==='mgflare'?1.8:1; FX.flash=Math.max(FX.flash,.5*big); lightAt(p.x,p.y,[1,1,1],6*big);
       L.glow.spawn(p.x+rnd(-4,4),p.y+rnd(-4,4),0,0,{c:[1.4,1.4,1.5],size:rnd(110,170)*big,life:.07,field:0});
       for(let j=0;j<10*k*big;j++) L.fire.spawn(p.x+rnd(-8,8),p.y+rnd(-6,6),rnd(-60,60),rnd(-200,-60),{c:[.9,.95,1.3],size:rnd(16,30),life:rnd(.15,.35),a:.9});
       for(let j=0;j<4*k*big;j++){ const a=rnd(0,6.28),s=rnd(200,700)*big; L.streak.spawn(p.x,p.y,Math.cos(a)*s,Math.sin(a)*s,{life:rnd(.2,.5),w:1.8,lag:16,grav:600,c:[1,1,1.2]}); }
       if(Math.random()<.5) L.smoke.spawn(p.x+rnd(-10,10),p.y-20,rnd(-20,20),rnd(-90,-40),{c:[.95,.95,.95],a:.45,size:rnd(40,70),grow:2.5,life:rnd(1.5,2.5),curl:1});
       if(e.type==='mgflare'&&e.t<.1) for(let j=0;j<60;j++){const a=rnd(Math.PI,2*Math.PI),s=rnd(300,900); waterSpawn(p.x,p.y,Math.cos(a)*s,Math.sin(a)*s,0,1.5);} break; }
     case 'fizzslow': if(Math.random()<.25) L.glow.spawn(p.x+rnd(-20,20),p.y+10,rnd(-5,5),-rnd(20,50),{c:[.5,.7,1],size:rnd(6,10),life:1.2,a:.7}); break;
     case 'nawater': case 'kwater': { const K=e.type==='kwater', sp=K?9:5;
       const x=p.x+Math.sin(e.t*sp*1.3)*R.width*.3, y=p.y-4+Math.cos(e.t*sp)*4; const col=K?[.8,.55,1.3]:[1.3,.75,.25];
       L.glow.spawn(x,y,0,0,{c:[1.5,1.3,1],size:22,life:.06,field:0}); L.glow.spawn(x,y,0,0,{c:col,size:70,life:.08,a:.6,field:0});
       for(let j=0;j<(K?12:7)*k;j++) L.flame.spawn(x+rnd(-6,6),y-6,rnd(-30,30),rnd(-260,-120),{c:col,size:rnd(14,26),grow:.4,life:rnd(.2,.45),curl:1.5,a:.8});
       if(Math.random()<.6) waterSpawn(x+rnd(-6,6),y,rnd(-120,120),-rnd(150,350),0,.8);
       if(Math.random()<.3) L.smoke.spawn(x,y-20,0,-60,{c:[.85,.85,.9],a:.25,size:40,grow:2,life:1.2,curl:1});
       lightAt(x,y,col.map(v=>Math.min(1,v)),2.5);
       if(K&&Math.random()<.06){ for(let j=0;j<30*k;j++){const a=rnd(Math.PI,2*Math.PI),s=rnd(200,600); L.streak.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{life:.4,w:2,lag:14,grav:800,c:[.9,.6,1.2]});} FX.flash=.3; } break; }
     case 'flametest': burnerFlame(c,e.color.map(v=>v*1.4),2.4); lightAt(c.x,c.y,e.color,2); break;
     case 'sparks': burnerFlame(c,[1.3,.6,.2],1.3);
       for(let j=0;j<5*k;j++){ const a=rnd(-2.9,-.25),s=rnd(250,750); L.streak.spawn(c.x+rnd(-8,8),c.y,Math.cos(a)*s,Math.sin(a)*s,{life:rnd(.4,.9),w:1.6,lag:18,grav:900,c:[1.2,.65,.2]}); }
       lightAt(c.x,c.y,[1,.6,.2],2); break;
     case 'paper': charK=Math.min(1,charK+dt*.35); paperChar(charK);
       for(let j=0;j<8*k;j++) L.fire.spawn(p.x+rnd(-R.width*.35,R.width*.35),p.y+rnd(-10,14),rnd(-20,20),rnd(-160,-60),{size:rnd(20,36),grow:1,life:rnd(.3,.6),curl:2,a:.75});
       if(Math.random()<.4) L.smoke.spawn(p.x+rnd(-20,20),p.y-30,0,-70,{c:[.15,.12,.1],a:.4,size:rnd(50,80),grow:2,life:2,curl:1}); lightAt(p.x,p.y,[1,.5,.2],2); break;
     case 'nothing': break; }
    if(e.t>e.dur) em.splice(i,1); } }
