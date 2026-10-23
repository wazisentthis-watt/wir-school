/* Elements mode (water / fire / earth / air) + chemistry effects, all on the fx.js engine. */
import {FX,L,WATER,ROCKS,rnd,addField,waterSpawn,waterThrow,waterCount,rockSpawn,rockCrumble,dust,lightAt,paperAt,paperChar} from './fx.js';

export const E={mode:'water', hands:[], combo:0, onGesture:null, hot:[], booms:[]};
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
  return H; }

/* ---- per-element behaviour ---- */
const MODES={
 water(H,dt){ const W=WATER;
   if(H.g==='open'){ W.orb={x:H.palm.x,y:H.palm.y-H.scale*.7,r:Math.max(40,H.scale*.75)};
     const have=waterCount(1); if(have<260*FX.Q) for(let i=0;i<6;i++){ const a=rnd(0,6.28); waterSpawn(W.orb.x+Math.cos(a)*W.orb.r*2.5,W.orb.y+Math.sin(a)*W.orb.r*2.5,0,0,1,4); }
     if(H.swipe&&have>20){ waterThrow(H.vx*1.2,H.vy*1.2,1); W.orb=null; E.say('Water thrown!'); } }
   else if(H.g==='poke'){ const p=H.pinchPt; W.path.unshift({x:p.x,y:p.y}); if(W.path.length>34) W.path.length=34;
     let moved=0; for(let i=0;i<W.n;i++) if(W.mode[i]===1){W.mode[i]=2;moved++;}
     if(waterCount(2)<120*FX.Q) for(let i=0;i<3;i++) waterSpawn(p.x+rnd(-10,10),p.y+rnd(-10,10),0,0,2,4);
     W.orb=null; if(H.swipe&&H.speed>1700){ waterThrow(H.vx*1.1,H.vy*1.1,2); W.path=[]; E.say('Water whip!'); } }
   else { if(H.changed&&(H.prevG==='open'||H.prevG==='poke')){ const n=waterThrow(H.vx*1.1,H.vy*1.1-100,-1); if(n&&H.speed>500) E.say('Splash!'); }
     W.orb=null; W.path=[]; } },
 fire(H,dt){ const k=FX.Q;
   if(H.g==='open'){ // jet along the fingers, stronger when pushing toward the camera
     const dx=H.pts[9].x-H.pts[0].x, dy=H.pts[9].y-H.pts[0].y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d;
     const pw=Math.min(2.2,1+Math.max(0,H.pushS)*1.5), o={x:H.pts[9].x+ux*H.scale*.6,y:H.pts[9].y+uy*H.scale*.6};
     for(let i=0;i<24*k*pw;i++){ const sp=rnd(380,820)*pw, sx=ux+rnd(-.22,.22), sy=uy+rnd(-.22,.22);
       L.fire.spawn(o.x+rnd(-8,8),o.y+rnd(-8,8),sx*sp+H.vx*.5,sy*sp+H.vy*.5-40,{c:[1,.9,.8],size:rnd(22,44),grow:1.8,life:rnd(.35,.7),drag:.94,curl:2.5,spin:rnd(-3,3),a:.62}); }
     for(let i=0;i<3*k;i++) L.spark.spawn(o.x,o.y,ux*rnd(400,900)+rnd(-120,120),uy*rnd(400,900)+rnd(-120,120),{c:[1,.7,.3],size:rnd(8,16),life:rnd(.3,.8),drag:.97,grav:300});
     if(Math.random()<.35) L.smoke.spawn(o.x+ux*160,o.y+uy*160,ux*120,uy*120-60,{c:[.12,.1,.1],a:.35,size:rnd(60,100),grow:2,life:rnd(1,1.8),curl:1.5});
     lightAt(o.x,o.y,[1,.55,.2],2.5*pw); if(H.changed) E.say(pw>1.3?'Fire jet, full blast':'Fire jet'); }
   if(H.g==='poke'){ const t=H.pinchPt; E.hot.push({x:t.x,y:t.y,r:26});
     for(let i=0;i<5*FX.Q;i++) L.fire.spawn(t.x+rnd(-4,4),t.y-4,rnd(-20,20)+H.vx*.3,-rnd(60,160),{size:rnd(10,20),grow:1.2,life:rnd(.25,.45),curl:2,a:.75});
     lightAt(t.x,t.y,[1,.6,.25],1.2); if(H.changed) E.say('Fingertip flame: poke something to light it'); }
   if(H.g==='vee'){ E.ember=E.ember||{x:H.palm.x,y:H.palm.y,r:10,vx:0,vy:0,held:true}; const b=E.ember; b.held=true; b.x+=(H.palm.x-b.x)*.5; b.y+=(H.palm.y-H.scale*.4-b.y)*.5; b.vx=H.vx; b.vy=H.vy; b.r=Math.min(46,b.r+dt*30);
     if(H.changed) E.say('Ember ball charging… flick or open your hand to throw'); }
   else if(E.ember?.held&&(H.changed||H.swipe)){ const b=E.ember; b.held=false; const s=Math.max(700,H.speed*1.2), d=Math.hypot(H.vx,H.vy)||1; b.vx=H.speed>250?H.vx/d*s:0; b.vy=H.speed>250?H.vy/d*s:-900; E.say('Fireball!'); } },
 earth(H,dt){
   const near=(p)=>ROCKS.filter(k=>k.mode!=='held').sort((a,b)=>dist(a,p)-dist(b,p))[0];
   if(H.g==='open'){ if(H.vy<-450&&(!H.liftCd||FX.t>H.liftCd)&&!(H.lift&&ROCKS.includes(H.lift))){ H.lift=rockSpawn(H.palm.x+rnd(-20,20),H.palm.y-H.scale*.2); H.liftCd=FX.t+.6; E.say('Rock rises!'); }
     if(H.lift&&ROCKS.includes(H.lift)&&H.lift.mode!=='held'&&H.lift.mode!=='free'){ H.lift.ty=Math.min(H.lift.ty,H.palm.y-H.scale*.3); H.lift.x+=(H.palm.x-H.lift.x)*.1; if(H.lift.mode==='hover') H.lift.mode='rise'; }
     for(const k of ROCKS) if(k.mode==='hover'&&H.swipe&&dist(k,H.palm)<260){ k.mode='free'; k.vx=H.vx*1.1; k.vy=H.vy*1.1; } }
   if(H.g!=='open') H.lift=null;
  if(H.g==='vee'){ if(!H.rock){ const k=near(H.pinchPt); if(k&&dist(k,H.pinchPt)<k.r*2.2) {H.rock=k; k.mode='held'; E.say('Got it. Flick to throw.');} }
     if(H.rock){ H.rock.hx=H.pinchPt.x; H.rock.hy=H.pinchPt.y; } }
   else if(H.rock){ const k=H.rock; H.rock=null; if(!ROCKS.includes(k)) return;
     if(H.g==='fist'){ rockCrumble(k); E.say('Crushed to dust'); }
     else { k.mode=H.speed>300?'free':'hover'; k.ty=k.y; k.vx=H.vx*1.2; k.vy=H.vy*1.2; if(k.mode==='free') E.say('Thrown!'); } }
   if(H.g==='fist'&&H.changed&&!H.rock){ const k=near(H.palm); if(k&&dist(k,H.palm)<k.r*1.6){ rockCrumble(k); E.say('Crushed to dust'); } } },
 air(H,dt){ const tip=H.g==='open'?H.palm:H.tip, pv=H.lastTip||tip;
   const sp=Math.hypot(tip.x-pv.x,tip.y-pv.y)/dt;
   if(sp>60) L.streak.spawn(tip.x,tip.y,(tip.x-pv.x)/dt*.08,(tip.y-pv.y)/dt*.08,{tx:pv.x,ty:pv.y,life:.45,w:5,lag:3,c:[.75,.9,1]});
   for(let i=0;i<Math.min(6,sp/250)*FX.Q;i++) L.streak.spawn(tip.x+rnd(-30,30),tip.y+rnd(-30,30),(tip.x-pv.x)/dt*rnd(.3,.7)+rnd(-80,80),(tip.y-pv.y)/dt*rnd(.3,.7)+rnd(-80,80),{life:rnd(.5,1.1),w:rnd(1.5,3),lag:rnd(6,12)});
   H.lastTip={x:tip.x,y:tip.y};
   if(H.swipe&&(!H.gustCd||FX.t>H.gustCd)){ H.gustCd=FX.t+.4; addField({type:'push',x:H.palm.x,y:H.palm.y,r:320,vx:H.vx,vy:H.vy,dur:.5});
     for(let i=0;i<40*FX.Q;i++) L.streak.spawn(H.palm.x+rnd(-60,60),H.palm.y+rnd(-60,60),H.vx*rnd(.6,1.1),H.vy*rnd(.6,1.1),{life:rnd(.4,.8),w:rnd(1.5,3.5),lag:8}); E.say('Gust!'); } },
};
/* circles make a vortex in every mode; it pushes water, fire, smoke, dust and rocks */
export function vortex(c){ addField({type:'vortex',x:c.x,y:c.y,r:Math.max(180,c.r*3),str:2600,dir:c.dir,dur:4}); E.say('Vortex!'); E.vortex={...c,t:4}; }
function stepVortexFx(dt){ const v=E.vortex; if(!v) return; v.t-=dt; if(v.t<=0){E.vortex=null;return;}
  for(let i=0;i<10*FX.Q;i++){ const a=rnd(0,6.28), r=rnd(.3,1.4)*Math.max(60,v.r*1.5); const x=v.x+Math.cos(a)*r, y=v.y+Math.sin(a)*r;
    L.streak.spawn(x,y,-Math.sin(a)*v.dir*420,Math.cos(a)*v.dir*420,{life:rnd(.5,1),w:rnd(1.5,3),lag:9,c:E.mode==='fire'?[1,.6,.3]:E.mode==='water'?[.6,.85,1]:E.mode==='earth'?[.8,.7,.55]:[.8,.92,1]}); }
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
  for(let i=0;i<120*FX.Q;i++){ const a=rnd(0,6.28), s=rnd(100,700); L.fire.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{size:rnd(30,60),grow:1.8,life:rnd(.4,.9),drag:.92,curl:2,a:.65}); }
  for(let i=0;i<50*FX.Q;i++){ const a=rnd(0,6.28), s=rnd(300,1100); L.streak.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{life:rnd(.4,.9),w:2,lag:14,grav:900,c:c||[1,.65,.3]}); }
  for(let i=0;i<14;i++) L.smoke.spawn(x+rnd(-30,30),y+rnd(-30,30),rnd(-80,80),rnd(-140,-30),{c:[.1,.08,.08],a:.55,size:rnd(80,140),grow:1.6,life:rnd(1.4,2.4),curl:1}); }

/* two-hand combo: clap both open palms together -> elemental burst */
function combo(hs,dt){ if(hs.length<2) { E.prevGap=null; return; } const [a,b]=hs, gap=dist(a.palm,b.palm);
  const closing=E.prevGap!=null?(E.prevGap-gap)/dt:0; E.prevGap=gap;
  if(gap<a.scale*1.3&&closing>500&&(!E.comboCd||FX.t>E.comboCd)&&!['poke','vee'].includes(a.g)&&!['poke','vee'].includes(b.g)){ E.comboCd=FX.t+1.2; const x=(a.palm.x+b.palm.x)/2, y=(a.palm.y+b.palm.y)/2; burst(x,y); } }
export function burst(x,y){ E.say('COMBO: Elemental burst!'); addField({type:'blast',x,y,r:420,str:6000,dur:.4}); FX.shake=10;
  if(E.mode==='fire') boom(x,y,50);
  else if(E.mode==='water'){ for(let i=0;i<220*FX.Q;i++){const a=rnd(0,6.28),s=rnd(300,1200); waterSpawn(x,y,Math.cos(a)*s,Math.sin(a)*s-200,0,2);} }
  else if(E.mode==='earth'){ for(let i=0;i<3;i++) rockSpawn(x+(i-1)*140,y-40); dust(x,FX.H-6,60,1.6); }
  else { for(let i=0;i<160*FX.Q;i++){const a=rnd(0,6.28),s=rnd(400,1400); L.streak.spawn(x,y,Math.cos(a)*s,Math.sin(a)*s,{life:rnd(.4,1),w:rnd(2,4),lag:10});} addField({type:'vortex',x,y,r:400,str:3000,dir:1,dur:3}); } }

export function update(hands,dt){
  E.hands=hands; E.hot=E.booms.filter(b=>FX.t-b.t<.4); E.booms=E.hot.slice();
  if(MODES[E.mode]) for(const H of hands){ MODES[E.mode](H,dt); if(H.circle) vortex(H.circle); }
  if(!hands.some(h=>h.g==='open')&&E.mode==='water') WATER.orb=null;
  if(MODES[E.mode]) combo(hands,dt);
  stepEmber(dt); stepVortexFx(dt); }
export function clearAll(){ WATER.n=0; WATER.orb=null; WATER.path=[]; for(const k of [...ROCKS]) rockCrumble(k); E.ember=null; E.vortex=null; FX.fields.length=0; }

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
