/* Elements mode (water / fire / earth / air) + chemistry effects, all on the fx.js engine. */
import {step as moveStep,defaultCal} from './moves.js';
import {keeperNew,keeperFeed,keeperStep} from './keeper.js';
import {chargeNew,chargeStep} from './charge.js';
import {fingerRibbon} from './keeper.js';
import {poseDebounce,emberRelease} from './aim.js';
import {POOL,AIRB,airBall,airClear,mote,FX,L,WATER,ROCKS,rnd,addField,waterSpawn,waterThrow,waterCount,rockSpawn,rockCrumble,dust,lightAt,paperAt,paperChar} from './fx.js';

export const E={ev:n=>E.onEv?.(n),mode:'water', hands:[], combo:0, onGesture:null, hot:[], booms:[], q:[], blasts:[], chg:null, chgLook:null};
E.later=(s,f)=>E.q.push({t:FX.t+s,f});
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
  // Kinetic-chain move engine (moves.js): static pose open/poke/cup/fist/relaxed (no ✌️) + temporal moves, per-user calibrated.
  if(!cal.mv) cal.mv=defaultCal();
  const R=moveStep(H,pts,FX.t,cal.mv,dt); let g=R.g;
  H.n=R.n; H.mvs=R.state; H.mv=R.ev.map(e=>e.k); H.mvo=R.ev; for(const e of R.ev) E.ev('move:'+e.k);
  const prevG=H.g; H.g=poseDebounce(H.db=H.db||{g:H.g},g); H.pinch=H.g==='cup';
  H.pinchPt=H.g==='cup'?{x:(palm.x*2+pts[12].x)/3,y:(palm.y*2+pts[12].y)/3}:{x:pts[8].x,y:pts[8].y};
  // fingertip push toward the camera = tap
  H.tap=H.g==='poke'&&H.pushS>1.2&&(!H.tapCd||FX.t>H.tapCd); if(H.tap) H.tapCd=FX.t+.6;
  H.changed=prevG!==H.g; H.prevG=prevG;
  // circle detector on index tip (or palm)
  const p=H.g==='poke'?pts[8]:palm; H.trail=(H.trail||[]); H.trail.push({x:p.x,y:p.y,t:FX.t}); while(H.trail.length&&FX.t-H.trail[0].t>1.2) H.trail.shift();
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
   const has=k=>H.mv.includes(k);
   if(has('ripple')||has('rippleIn')){ if(POOL.n>10||W.n>20){ addField({type:'push',x:H.palm.x,y:FX.groundY||H.palm.y,r:420,vx:(has('ripple')?1:-1)*500,vy:-260,dur:.4}); E.say('Ripple'); E.ev('water:ripple'); } }
   if(has('pulse')){ for(let i=0;i<40*FX.Q;i++){ const a=rnd(-2.8,-.35), s=rnd(250,520); waterSpawn(H.palm.x,H.palm.y-H.scale*.4,Math.cos(a)*s,Math.sin(a)*s,0,2.5); } E.say('Bloom'); E.ev('water:bloom'); }
   if(has('shake')){ for(let i=0;i<30*FX.Q;i++) waterSpawn(H.palm.x+rnd(-30,30),H.palm.y+rnd(-30,30),rnd(-500,500),rnd(-400,100),0,1.5); E.say('Droplets'); E.ev('water:shake'); }
   if(has('scoop')&&POOL.n>8){ H.scoopT=FX.t+1.5; E.say('Scooped an orb: tilt to pour, flick to throw'); E.ev('water:scoop'); }
   if(H.g==='cup'&&!H.holding&&!H.mvs.pour){ const p=H.pinchPt; W.path=ribbonPath(H,dt);
     if(waterCount(2)<(H.scoopT>FX.t?90:45)*FX.Q) waterSpawn(p.x+rnd(-8,8),p.y+rnd(-8,8),0,0,2,4);
     if(H.swipe){ waterThrow(H.vx*1.1,H.vy*1.1,2); W.path=[]; E.say('Water throw!'); } return; }
   if(H.g==='cup'&&!H.holding&&H.mvs.pour){ const d=H.mvs.pour, p={x:H.pinchPt.x+d*H.scale*.45,y:H.pinchPt.y}; for(let i=0;i<W.n;i++) if(W.mode[i]===2) W.mode[i]=0; W.path=[];
     if(W.n<560*FX.Q) for(let i=0;i<2;i++) waterSpawn(p.x+rnd(-5,5),p.y+6,d*rnd(20,60)+H.vx*.3,rnd(60,140),0,8);
     if(!H.pourSaid){ H.pourSaid=1; E.say('Pouring'); } if(POOL.n>40&&!H.poolEv){ H.poolEv=1; E.ev('water:pool'); } return; } else H.pourSaid=0;
   if(H.g==='open'&&POOL.n<12&&waterCount(2)>8&&!H.holding){ W.path=ribbonPath(H,dt); if(waterCount(2)<70*FX.Q) waterSpawn(H.palm.x+rnd(-8,8),H.palm.y-H.scale,0,0,2,4); if(!H.ribSaid){H.ribSaid=1; E.say('Water floats above your fingers: move each finger to shape it'); E.ev('water:ribbon');} if(H.swipe){ waterThrow(H.vx*1.1,H.vy*1.1,2); W.path=[]; } return; }
   if(H.g==='open'){ waterStrands(H,dt); return; } else strandsOff(H);
   if(H.g==='poke'){ const p=H.pinchPt; W.path.unshift({x:p.x,y:p.y}); if(W.path.length>34) W.path.length=34;
     let moved=0; for(let i=0;i<W.n;i++) if(W.mode[i]===1){W.mode[i]=2;moved++;}
     if(waterCount(2)<120*FX.Q) for(let i=0;i<3;i++) waterSpawn(p.x+rnd(-10,10),p.y+rnd(-10,10),0,0,2,4);
     W.orb=null; if(H.swipe&&H.speed>1700){ waterThrow(H.vx*1.1,H.vy*1.1,2); W.path=[]; E.say('Water whip!'); } }
   else { if(H.changed&&(H.prevG==='open'||H.prevG==='poke')){ const n=waterThrow(H.vx*1.1,H.vy*1.1-100,-1); if(n&&H.speed>500) E.say('Splash!'); }
     W.orb=null; W.path=[]; } },
 fire(H,dt){ const k=FX.Q, has=q=>H.mv.includes(q);
   E.keeper=E.keeper||keeperNew(H.palm.x,H.palm.y-H.scale); for(const q of H.mv) if(keeperFeed(E.keeper,q)) E.ev('fire:keep:'+q); if(H.mvs?.pour) E.keeper.spillDir=H.mvs.pour;
   if(has('ripple')||has('rippleIn')){ const ord=has('ripple')?[20,16,12,8]:[8,12,16,20]; ord.forEach((ti,j)=>E.later(j*.08,()=>{ const p=H.pts[ti]; for(let i=0;i<8*k;i++) L.fire.spawn(p.x+rnd(-3,3),p.y-4,rnd(-15,15),-rnd(90,170),{size:rnd(12,20),grow:.9,life:rnd(.25,.4),curl:1.2,a:1}); E.hot.push({x:p.x,y:p.y,r:16}); })); E.say('Flame ripple'); E.ev('fire:ripple'); }
   if(has('bloom')) H.bloomT=FX.t+.45;
   if(has('thumb')){ const p=H.pts[4]; for(let i=0;i<26*k;i++) L.spark.spawn(p.x,p.y,rnd(-260,260),rnd(-380,-60),{c:[1,.7,.3],size:7,life:rnd(.4,.8),grav:600}); lightAt(p.x,p.y,[1,.6,.3],1.5); E.say('Spark'); E.ev('fire:spark'); }
   if(has('curl')){ if(E.ember?.held) E.ember=null; H.focus=0; E.say('Banked low: the keeper flame stays alive'); E.ev('fire:snuff'); }
   if(H.g==='open'){ const dx=H.pts[9].x-H.pts[0].x, dy=H.pts[9].y-H.pts[0].y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d, o={x:H.pts[9].x+ux*H.scale*.5,y:H.pts[9].y+uy*H.scale*.5};
     L.glow.spawn(o.x,o.y,0,0,{c:[1,.5,.15],a:.25,size:H.scale*.9,life:.06,field:0});
     if((H.pushS>.9||H.swipe||H.bloomT>FX.t||has('push'))&&(!H.burstCd||FX.t>H.burstCd)){ H.burstCd=FX.t+.7; H.bloomT=0; const bx=H.swipe?H.vx/(H.speed||1):ux, by=H.swipe?H.vy/(H.speed||1):uy;
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
   if(H.g==='cup'){ E.ember=E.ember||{x:H.palm.x,y:H.palm.y,r:10,vx:0,vy:0,held:true}; const b=E.ember; b.held=true; b.heldFor=(b.heldFor||0)+dt; b.x+=(H.palm.x-b.x)*.5; b.y+=(H.palm.y-H.scale*.4-b.y)*.5; b.vx=H.vx; b.vy=H.vy; b.r=Math.min(40,b.r+dt*30);
     if(H.changed) E.say('Ember charging in your cupped hand… flick-open to throw'); if(b.r>30&&!b.ev){ b.ev=1; E.ev('fire:ember'); } }
   else if(E.ember?.held&&(H.changed||H.swipe)&&!emberRelease(E.ember.heldFor||0,H.g,H.swipe)){ if(H.g!=='cup'&&(E.ember.heldFor||0)<.5) E.ember=null; }
   else if(E.ember?.held&&(H.changed||H.swipe)){ const b=E.ember; b.held=false; const s=Math.max(700,H.speed*1.2), d=Math.hypot(H.vx,H.vy)||1; b.vx=H.speed>250?H.vx/d*s:0; b.vy=H.speed>250?H.vy/d*s:-900; E.say('Fireball!'); E.ev('fire:fireball'); } },
 earth(H,dt){ const has=q=>H.mv.includes(q);
   if(has('scoop')&&(!H.liftCd||FX.t>H.liftCd)){ H.lift=rockSpawn(H.palm.x+rnd(-20,20),H.palm.y-H.scale*.2); H.liftCd=FX.t+.6; E.say('Scooped a rock up!'); E.ev('earth:rise'); }
   if(has('shake')){ FX.shake=9; dust(H.palm.x,FX.H-6,40,1.4); for(const k of ROCKS) if(k.mode!=='held'){ k.mode='free'; k.vx=rnd(-120,120); k.vy=rnd(-380,-180); } E.say('Tremor'); E.ev('earth:tremor'); }
   if(has('bloom')){ const k=H.rock||ROCKS.filter(q=>q.mode!=='held'||q===H.rock).sort((a,b)=>dist(a,H.palm)-dist(b,H.palm))[0]; if(k&&dist(k,H.palm)<k.r*3){ if(H.rock===k) H.rock=null; rockCrumble(k); E.say('Shattered'); E.ev('earth:shatter'); } }
   const near=(p)=>ROCKS.filter(k=>k.mode!=='held').sort((a,b)=>dist(a,p)-dist(b,p))[0];
   if(H.g==='open'){ if(H.vy<-450&&(!H.liftCd||FX.t>H.liftCd)&&!(H.lift&&ROCKS.includes(H.lift))){ H.lift=rockSpawn(H.palm.x+rnd(-20,20),H.palm.y-H.scale*.2); H.liftCd=FX.t+.6; E.say('Rock rises!'); E.ev('earth:rise'); }
     if(H.lift&&ROCKS.includes(H.lift)&&H.lift.mode!=='held'&&H.lift.mode!=='free'){ H.lift.ty=Math.min(H.lift.ty,H.palm.y-H.scale*.3); H.lift.x+=(H.palm.x-H.lift.x)*.1; if(H.lift.mode==='hover') H.lift.mode='rise'; }
     for(const k of ROCKS) if(k.mode==='hover'&&H.swipe&&dist(k,H.palm)<260){ k.mode='free'; k.vx=H.vx*1.1; k.vy=H.vy*1.1; } }
   if(H.g!=='open') H.lift=null;
  if(H.g==='cup'&&!H.holding){ if(!H.rock){ const k=near(H.pinchPt); if(k&&dist(k,H.pinchPt)<k.r*2.2) {H.rock=k; k.mode='held'; E.say('Got it. Flick to throw, flick-open to shatter.'); E.ev('earth:grab');} }
     if(H.rock){ H.rock.hx=H.pinchPt.x; H.rock.hy=H.pinchPt.y; } }
   else if(H.rock){ const k=H.rock; H.rock=null; if(!ROCKS.includes(k)) return;
     if(H.g==='fist'){ rockCrumble(k); E.say('Crushed to dust'); }
     else { k.mode=H.speed>300?'free':'hover'; k.ty=k.y; k.vx=H.vx*1.2; k.vy=H.vy*1.2; if(k.mode==='free'){ E.say('Thrown!'); E.ev('earth:throw'); } } }
   if(H.g==='fist'&&H.changed&&!H.rock){ const k=near(H.palm); if(k&&dist(k,H.palm)<k.r*1.6){ rockCrumble(k); E.say('Crushed to dust'); } } },
 air(H,dt){ const has=q=>H.mv.includes(q); const tip=H.g==='open'?H.palm:H.tip, pv=H.lastTip||tip, sp=Math.hypot(tip.x-pv.x,tip.y-pv.y)/dt; H.lastTip={x:tip.x,y:tip.y};
   const w=circRate(H,H.g==='cup'?H.palm:tip);
   if(sp>120&&Math.random()<.5*FX.Q) mote(tip.x+rnd(-20,20),tip.y+rnd(-20,20),(tip.x-pv.x)/dt*.5,(tip.y-pv.y)/dt*.5);
   let b=H.ball&&AIRB.includes(H.ball)?H.ball:null;
   if(has('pulse')&&(!b||b.free)) H.pulseHold=FX.t+1.2;
   if(H.g==='cup'||(H.pulseHold>FX.t&&H.g!=='fist')){ const c={x:H.palm.x,y:H.palm.y-H.scale*.75};
     if(!b||b.free){ b=H.ball=airBall(c.x,c.y,14); E.say('Air ball: spiral your wrist to spin it'); E.ev('air:ball'); }
     b.held=true; b.x+=(c.x-b.x)*.5; b.y+=(c.y-b.y)*.5; b.r=Math.min(Math.max(34,H.scale*.55),b.r+dt*40); feedSpin(b,w,dt,H); }
   if(b&&b.held){ const s=Math.abs(b.spin); if(s>5) E.ev('air:spin'); const ps=Math.max(s,b.peak||0); b.keepT=s>5?(b.keepT||0)+dt:0; if(b.keepT>3&&!b.kev){ b.kev=1; E.ev('air:keep'); }
     if((H.swipe&&H.speed>900)||has('push')){ if(ps>5){ if(!H.swipe){ H.vx=0; H.vy=-1100; } b.held=false; b.free=true; b.vx=H.vx*1.1; b.vy=H.vy*1.1; b.life=1; H.ball=null; E.say('Air ball thrown'); E.ev('air:throw'); }
       else if(!H.spinCd||FX.t>H.spinCd){ H.spinCd=FX.t+2; E.say('Spin it first: keep circling'); } }
     else if(H.g!=='cup'&&H.g!=='open'&&!(H.pulseHold>FX.t)) b.held=false; }
   if(H.g==='open'&&H.swipe&&(!H.gustCd||FX.t>H.gustCd)){ H.gustCd=FX.t+.5; addField({type:'push',x:H.palm.x,y:H.palm.y,r:320,vx:H.vx,vy:H.vy,dur:.5});
     const g=airBall(H.palm.x,H.palm.y,26); g.held=false; g.free=true; g.vx=H.vx*.9; g.vy=H.vy*.9; g.spin=4*Math.sign(H.vx||1); g.life=.6;
     for(let i=0;i<14*FX.Q;i++) mote(H.palm.x+rnd(-50,50),H.palm.y+rnd(-50,50),H.vx*rnd(.5,1),H.vy*rnd(.5,1)); E.say('Gust!'); } },
};
/* circles make a vortex in every mode; it pushes water, fire, smoke, dust and rocks */
const TIPS=[4,8,12,16,20];
function strandsOff(H,sink){ for(const S of WATER.strands) S.on=false; for(let i=0;i<WATER.n;i++) if(WATER.mode[i]===4){ WATER.mode[i]=0; WATER.vy[i]=sink?200:0; } H.amt=0; }
function waterStrands(H,dt){ const W=WATER, gy=FX.groundY; if(!gy) return;
  if(POOL.n+W.strands.reduce((s,S)=>s+S.n,0)<12){ if(!H.dryCd||FX.t>H.dryCd){ H.dryCd=FX.t+4; E.say('Pour water first: cup your hand and tilt it over the floor'); } return; }
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

/* ---- v6: fingertip water ribbon (each fingertip owns one control point floating above the hand) ---- */
function ribbonPath(H,dt){ const r=fingerRibbon(H.pts,H.prevPts,dt,H.fx); H.prevPts=H.pts.map(p=>({x:p.x,y:p.y})); H.rib=r;
  for(const q of r) if(q.e>.3) L.glow.spawn(q.x,q.y,0,0,{c:[.4,.75,1],a:.18+.2*q.e,size:H.scale*(.25+.25*q.e),life:.05,field:0});
  return [r[4],r[3],r[2],r[1],r[0]].map(q=>({x:q.x,y:q.y})); }

/* ---- v6: keeper flame, a small flame carried in front of the hands; every move feeds/shapes it, it never goes out ---- */
function stepKeeper(hands,dt){ const K=E.keeper||(E.keeper=keeperNew(FX.W/2,FX.H*.55)); const hs=hands.filter(h=>h.palm);
  let anchor=null; if(hs.length){ let x=0,y=0,s=0; for(const h of hs){ x+=h.palm.x; y+=h.palm.y; s+=h.scale; } x/=hs.length; y/=hs.length; s/=hs.length; anchor={x,y:y-s*1.05}; K.s=s; }
  const held={cup:hs.some(h=>h.mvs?.cup),pour:hs.some(h=>h.mvs?.pour)};
  const S=keeperStep(K,anchor,dt,held); if(E.chg?.state==='charging') return; drawKeeper(S,K.s||90,dt); }
function drawKeeper(S,sc,dt){ const k=FX.Q, z=sc*.55*S.size, x=S.x, y=S.y;
  // v7: small warm halo only (additive glow was washing the flame out to white on bright scenes); heat shimmer above
  L.glow.spawn(x,y+z*.2,0,0,{c:[1,.4,.1],a:.18*S.bright,size:z*3.2,life:.06,field:0});
  FX.shimmer={x,y:y-z*.6,r:z*1.5}; FX.shimT=FX.t;
  const n=Math.round((2+2.5*S.size+2.5*S.flicker)*k), up=110*S.height+30; // v8: much smaller keeper flame
  for(let i=0;i<n;i++){ let px=x+rnd(-.35,.35)*z, py=y+rnd(-.1,.3)*z, vx=rnd(-14,14)*(1+S.flicker*2)+S.lean*90, vy=-rnd(.7,1)*up;
    if(S.swirl>.05){ const a=S.spin+i*2.4, r=z*(.5+.6*S.swirl); px=x+Math.cos(a)*r; py=y+Math.sin(a)*r*.45; vx+=-Math.sin(a)*220*S.swirl; vy+=Math.cos(a)*60*S.swirl; }
    L.fire.spawn(px,py,vx,vy,{size:rnd(.5,.9)*z,grow:.7,life:rnd(.22,.36)*(.8+.4*S.height),curl:1+S.flicker,a:.85}); }
  // v7: licking tongues: thin, fast, leaning flame licks that break off the top
  if(Math.random()<.25*k+S.flicker*.15) for(let i=0;i<1;i++){ const a=rnd(-.6,.6); L.flame.spawn(x+a*z*.5,y-z*.2,a*60+S.lean*120+rnd(-30,30),-rnd(1.1,1.6)*up,{size:z*rnd(.28,.45),grow:-.3,life:rnd(.18,.3),curl:2,a:.9}); }
  // v7: rising embers (always a few)
  if(Math.random()<.35*k+S.sparks*.5) L.spark.spawn(x+rnd(-.4,.4)*z,y-z*.3,rnd(-40,40),-rnd(120,260),{c:[1,.45,.08],size:rnd(3,5),life:rnd(.6,1.2),grav:-40,curl:1.5});
  if(S.weave>.05) for(let i=0;i<3;i++){ const a=S.spin*1.7+i*2.09; L.flame.spawn(x+Math.cos(a)*z*.9,y+Math.sin(a)*z*.3,0,-80,{size:z*.35,life:.25,a:.7}); }
  if(S.sparks>.1&&Math.random()<S.sparks*k) L.spark.spawn(x,y,rnd(-200,200),rnd(-320,-80),{c:[1,.75,.35],size:6,life:rnd(.3,.6),grav:500});
  E.hot.push({x,y,r:z*.9,held:true}); lightAt(x,y,[1,.6,.25],1.2*S.bright); }

/* ---- v6: two-palm charge, then the clap launches a blast that flies toward/out of the screen ---- */
const ELC={fire:[1,.55,.2],water:[.35,.7,1],earth:[.75,.55,.35],air:[.45,.8,1]}; // v7: air tinted so its swirls read on white walls
function stepCharge(hands,dt){ const hs=hands.filter(h=>h.palm&&h.pts); const C=E.chg||(E.chg=chargeNew());
  const r=chargeStep(C,hs[0],hs[1],FX.t,dt); E.chgLook=r; const m=E.mode, col=ELC[m]||[1,1,1];
  if(r.ev==='start'){ E.say('Charging: hold it… then clap to release'); E.ev('blast:charge'); C.bonus=heldBonus(); }
  if(r.state==='charging'){ const z=40+120*r.lvl*(1+C.bonus*.6), k=FX.Q;
    L.glow.spawn(r.x,r.y,0,0,{c:col,a:.35+.4*r.lvl,size:z*2.2,life:.06,field:0}); L.glow.spawn(r.x,r.y,0,0,{c:[1,1,1],a:.3+.4*r.lvl,size:z*.6,life:.05,field:0});
    for(let i=0;i<(4+10*r.lvl)*k;i++){ const a=rnd(0,6.28), d=z*rnd(1,1.8); chargeMote(m,r.x+Math.cos(a)*d,r.y+Math.sin(a)*d,-Math.cos(a)*d*3,-Math.sin(a)*d*3,col); }
    if(r.lvl>.98&&!C.full){ C.full=1; E.ev('blast:full'); E.say('Fully charged'); } }
  if(r.ev==='release'){ launchBlast(r.x,r.y,r.lvl*(1+C.bonus*.6),m); C.full=0; E.ev('blast:release'); E.ev('blast:early:'+Math.round(Math.max(0,r.ttc)*1000)); }
  if(r.ev==='cancel'){ C.full=0; E.say('Charge faded'); } }
function heldBonus(){ // already holding this element in hand = bigger blast (it is consumed into the blast)
  let b=0; if(E.mode==='fire'&&E.ember?.held){ b=1; E.ember=null; } if(E.mode==='fire'&&E.keeper) b+=.4*E.keeper.heat;
  if(E.mode==='water'&&waterCount(2)>20) b=1; if(E.mode==='earth'&&E.hands.some(h=>h.rock)){ b=1; for(const h of E.hands) if(h.rock){ rockCrumble(h.rock); h.rock=null; } }
  if(E.mode==='air'&&E.hands.some(h=>h.ball)) b=1; return Math.min(1.4,b); }
function chargeMote(m,x,y,vx,vy,col){ if(m==='water') waterSpawn(x,y,vx,vy,0,.4); else if(m==='air') mote(x,y,vx,vy); else if(m==='earth') L.dust.spawn(x,y,vx*.5,vy*.5,{c:[.6,.5,.4],a:.5,size:rnd(8,14),life:.3});
  else L.fire.spawn(x,y,vx,vy,{size:rnd(10,18),life:.25,grow:.5,a:.8}); }
export function launchBlast(x,y,p,m=E.mode){ p=Math.max(.3,p); E.blasts.push({x,y,r:24+30*p,p,m,t:0,dur:.9}); FX.flash=Math.max(FX.flash||0,.25+.25*p); FX.shake=4+6*p; lightAt(x,y,ELC[m]||[1,1,1],3+4*p);
  addField({type:'blast',x,y,r:260+200*p,str:3000+3000*p,dur:.3}); E.say(({fire:'Flame blast!',water:'Tide blast!',earth:'Stone blast!',air:'Wind blast!'})[m]||'Blast!'); }
// the blast flies "out of the screen": it grows fast (coming at the viewer), drifts up a little, and its trail streaks outward
function stepBlasts(dt){ for(let i=E.blasts.length-1;i>=0;i--){ const b=E.blasts[i]; b.t+=dt; const u=b.t/b.dur, k=FX.Q, col=ELC[b.m]||[1,1,1];
    b.r*=1+dt*(3.2+b.p); b.y-=dt*60; const a0=Math.max(0,1-u);
    L.glow.spawn(b.x,b.y,0,0,{c:col,a:.5*a0,size:b.r*2.4,life:.06,field:0});
    for(let j=0;j<(10+14*b.p)*k*a0;j++){ const a=rnd(0,6.28), rr=b.r*rnd(.6,1.05), px=b.x+Math.cos(a)*rr, py=b.y+Math.sin(a)*rr, vx=Math.cos(a)*rnd(300,700), vy=Math.sin(a)*rnd(300,700);
      if(b.m==='fire') L.fire.spawn(px,py,vx,vy,{size:rnd(.25,.45)*b.r,grow:1.2,life:.2,a:.8*a0,drag:.9});
      else if(b.m==='water'){ if(j%2) waterSpawn(px,py,vx,vy,0,.6); else L.glow.spawn(px,py,vx*.3,vy*.3,{c:[.6,.85,1],a:.5*a0,size:b.r*.25,life:.12}); }
      else if(b.m==='earth'){ L.dust.spawn(px,py,vx*.4,vy*.4,{c:[.65,.52,.4],a:.55*a0,size:b.r*.3,life:.35}); if(j%5===0) L.streak.spawn(px,py,vx,vy,{life:.35,w:3,lag:12,grav:900,c:[.7,.55,.4]}); }
      else { if(j%2) mote(px,py,vx,vy); else L.streak.spawn(px,py,-Math.sin(a)*500,Math.cos(a)*500,{life:.2,w:1.5,lag:10,grav:0,c:[.9,.97,1]}); } }
    if(b.m==='fire') E.hot.push({x:b.x,y:b.y,r:b.r*.7});
    if(u>=1) E.blasts.splice(i,1); } }

/* ember ball / fireball */
function stepEmber(dt){ const b=E.ember; if(!b) return;
  if(!b.held){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.vy+=120*dt; const out=b.x<0||b.x>FX.W||b.y<0||b.y>FX.H;
    if(out){ boom(Math.max(0,Math.min(FX.W,b.x)),Math.max(0,Math.min(FX.H,b.y)),b.r); E.ember=null; return; } }
  E.hot.push({x:b.x,y:b.y,r:b.r*1.4,held:b.held});
  const k=FX.Q; L.glow.spawn(b.x,b.y,0,0,{c:[1,.45,.12],size:b.r*4.5,life:.08,a:.7,field:0});
  L.glow.spawn(b.x,b.y,0,0,{c:[1,.95,.8],size:b.r*1.6,life:.06,field:0});
  for(let i=0;i<(b.held?10:18)*k;i++){ const a=rnd(0,6.28), r=rnd(0,b.r); L.fire.spawn(b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,-b.vx*.15+rnd(-60,60),-b.vy*.15-rnd(40,140),{size:rnd(18,34)*(b.r/30),grow:.8,life:rnd(.25,.5),curl:2,a:.8}); }
  if(Math.random()<.4) L.spark.spawn(b.x,b.y,rnd(-200,200),rnd(-300,0),{c:[1,.6,.25],size:8,life:.6,grav:500});
  lightAt(b.x,b.y,[1,.5,.2],3); }
export function boom(x,y,r=30,c){ E.booms.push({x:x,y:y,r:r*4,t:FX.t}); FX.flash=.8; FX.shake=8; lightAt(x,y,[1,.6,.3],8);
  addField({type:'blast',x,y,r:320,str:5000,dur:.35});
  for(let i=0;i<60*FX.Q;i++){ const a=rnd(0,6.28), s=rnd(100,500); L.fire.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{size:rnd(30,60),grow:1.8,life:rnd(.4,.9),drag:.92,curl:2,a:.65}); }
  for(let i=0;i<50*FX.Q;i++){ const a=rnd(0,6.28), s=rnd(300,1100); L.streak.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{life:rnd(.4,.9),w:2,lag:14,grav:900,c:c||[1,.65,.3]}); }
  for(let i=0;i<5;i++) L.smoke.spawn(x+rnd(-30,30),y+rnd(-30,30),rnd(-80,80),rnd(-140,-30),{c:[.85,.8,.75],a:.12,size:rnd(60,100),grow:1.6,life:rnd(1.4,2.4),curl:1}); }

/* two-hand combo: clap both open palms together -> elemental burst */
function pairBall(hs,dt){ const [a,b]=hs; if(hs.length<2||a.g!=='open'||b.g!=='open'){ if(E.pair&&AIRB.includes(E.pair)) E.pair.held=false; E.pair=null; return; }
  const gap=dist(a.palm,b.palm); if(gap>a.scale*3.4){ if(E.pair) E.pair.held=false; E.pair=null; return; }
  const c={x:(a.palm.x+b.palm.x)/2,y:(a.palm.y+b.palm.y)/2}; if(!E.pair||!AIRB.includes(E.pair)){ E.pair=airBall(c.x,c.y,20); E.ev('air:ball'); }
  const p=E.pair; p.held=true; p.x=c.x; p.y=c.y; p.r+=(Math.max(24,gap*.36)-p.r)*.2; feedSpin(p,circRate(a,a.palm),dt); if(Math.abs(p.spin)>5) E.ev('air:spin'); }
function combo(hs,dt){ if(E.mode==='air'&&E.chg?.state!=='charging') pairBall(hs,dt); if(E.chg&&E.chg.state!=='idle'){ E.prevGap=null; return; } if(hs.length<2) { E.prevGap=null; return; } const [a,b]=hs, gap=dist(a.palm,b.palm);
  const closing=E.prevGap!=null?(E.prevGap-gap)/dt:0; E.prevGap=gap;
  if(gap<a.scale*1.3&&closing>500&&(!E.comboCd||FX.t>E.comboCd)&&!['poke','cup'].includes(a.g)&&!['poke','cup'].includes(b.g)){ E.comboCd=FX.t+1.2; const x=(a.palm.x+b.palm.x)/2, y=(a.palm.y+b.palm.y)/2; burst(x,y); } }
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
  for(let i=E.q.length-1;i>=0;i--) if(FX.t>=E.q[i].t){ const f=E.q[i].f; E.q.splice(i,1); f(); }
  if(E.mode==='fire'&&!E.orbOn) stepKeeper(hands,dt); else if(E.keeper&&E.mode!=='fire') E.keeper=null;
  if(MODES[E.mode]) stepCharge(hands,dt); stepBlasts(dt);
  stepEmber(dt); stepVortexFx(dt); }
export function clearAll(){ WATER.n=0; WATER.orb=null; WATER.path=[]; for(const k of [...ROCKS]) rockCrumble(k); E.ember=null; E.vortex=null; E.keeper=null; E.blasts.length=0; FX.fields.length=0; airClear(); E.pair=null; for(const S of WATER.strands) S.on=false; }

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
