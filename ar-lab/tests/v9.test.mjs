import {CalmFilter,calmVel,CALM,calmMoves} from '../calm.js';
import {orbNew,orbStep,DIFF} from '../orb.js';
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m); };
let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647-.5;
// 1. jittery still hand: dead zone + filter -> output barely moves
{ const f=new CalmFilter(); let mn=1e9,mx=-1e9; for(let i=0;i<300;i++){ const y=f.f(200+rnd()*6,1/30); if(i>30){mn=Math.min(mn,y);mx=Math.max(mx,y);} } ok(mx-mn<1.5,`jitter ±3px on a still hand → output wobble ${(mx-mn).toFixed(2)}px (<1.5)`); }
// 2. real move still followed
{ const f=new CalmFilter(); let y; for(let i=0;i<60;i++) y=f.f(i<10?200:400,1/30); ok(Math.abs(y-400)<15,`a real 200px move is followed within 1.7 s (at ${y.toFixed(0)})`); }
// 3. orb: easy is default-forgiving under jittery hand
function run(P,jit,T=6){ const O=orbNew(); O.t=9; const f=new CalmFilter(); let px=200,vx=0,drops=0,minS=1;
  for(let i=0;i<T*30;i++){ const dt=1/30, raw=200+rnd()*2*jit, x=f.f(raw,dt), nvx=(x-px)/dt, ax=(nvx-vx)/dt; px=x; vx=nvx;
    orbStep(O,{x,y:300,vx,vy:0,ax,ay:0,s:100,tilt:0,cup:0,tips:[]},dt,P); if(O.ev.includes('drop')) drops++; if(O.state==='held'&&O.held>.5) minS=Math.min(minS,O.stab); }
  return {drops,minS}; }
{ const r=run(DIFF.easy,8); ok(r.drops===0&&r.minS>.8,`easy orb + ±8px tracking jitter: ${r.drops} drops, min stability ${r.minS.toFixed(2)}`); }
{ const r=run(DIFF.easy,25); ok(r.drops===0,`easy orb survives heavy ±25px jitter (${r.drops} drops)`); }
// 4. easy rarely drops on a brisk move (that dropped normal)
function swing(P){ const O=orbNew(); O.t=9; let px=200,vx=0,d=0; for(let i=0;i<120;i++){ const t=i/30,x=200+90*Math.sin(4.5*t),nvx=(x-px)*30,ax=(nvx-vx)*30; px=x; vx=nvx; orbStep(O,{x,y:300,vx,vy:0,ax,ay:0,s:100,tilt:0,cup:0,tips:[]},1/30,P); if(O.ev.includes('drop')) d++; } return d; }
ok(swing(DIFF.easy)===0,'easy holds through a brisk side-to-side swing');
// 5. particles: settle + stay bounded
{ let worst=0, endV=0; for(let k=0;k<40;k++){ const a=k/40*6.28; let x=100,y=100,vx=Math.cos(a)*900*CALM.speed,vy=Math.sin(a)*900*CALM.speed;
  for(let i=0;i<180;i++){ [vx,vy]=calmVel(x,y,vx,vy,100,100,1/60); x+=vx/60; y+=vy/60; worst=Math.max(worst,Math.hypot(x-100,y-100)); } endV=Math.max(endV,Math.hypot(vx,vy)); }
  ok(worst<=CALM.R,`fast particles stay within ${CALM.R}px of their source (max ${worst.toFixed(0)}px)`); ok(endV<20,`particles settle within 3 s (end speed ${endV.toFixed(1)}px/s)`); }
ok(CALM.cap<=.4&&CALM.speed<=.6,'particle counts capped to ≤40% and speeds ≤60%');
// 6. fewer moves
ok(calmMoves(['shake','thumb','bloom','curl'],'fire').join()==='bloom,curl','fire keeps only clear moves (bloom, curl)');
console.log(`v9: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
