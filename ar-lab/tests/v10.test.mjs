import {TP,planeNew,placePile,tableStep} from '../tablecore.js';
import {CALM} from '../calm.js';
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m); };
const P=planeNew(500,430,860), dt=1/30;
// 1. placed items stay still for 10 s with no input
{ const it=[]; placePile(it,P,200,650,'water'); placePile(it,P,300,560,'fire'); const s0=JSON.stringify(it.map(o=>[o.x,o.y]));
  for(let i=0;i<300;i++) tableStep(it,P,[],dt); ok(JSON.stringify(it.map(o=>[o.x,o.y]))===s0,`${it.length} placed items do not move at all over 10 s without input`); }
// 2. a hand sitting still next to them (tracking jitter-free) does not push
{ const it=[]; placePile(it,P,200,650,'earth'); const x0=it[0].x; for(let i=0;i<300;i++) tableStep(it,P,[{x:200,y:635,vx:0,vy:0}],dt); ok(it[0].x===x0,'a still hand resting on the pile does not move it'); }
// 3. push moves it slowly and it stays on the plane, then stops
{ const it=[]; placePile(it,P,200,650,'water'); const o=it[0]; let vmax=0;
  for(let i=0;i<20;i++){ const tx=150+i*8; tableStep(it,P,[{x:Math.min(tx,o.x-4),y:o.y,vx:240,vy:-300}],dt); vmax=Math.max(vmax,Math.hypot(o.vx,o.vy)); }
  for(let i=0;i<300;i++) tableStep(it,P,[],dt);
  ok(o.x>205,`a flick pushes it along the table (moved ${(o.x-200).toFixed(0)}px)`); ok(vmax<=TP.maxV+1e-6,`push speed stays slow (max ${vmax.toFixed(0)}px/s ≤ ${TP.maxV})`);
  ok(it.every(q=>q.y>=P.top&&q.y<=P.H&&q.x>=0&&q.x<=P.W),'everything stays on the table plane (an upward flick cannot lift it off)'); ok(o.vx===0&&o.vy===0,'it comes to rest afterwards (friction)'); }
// 4. no spontaneous spawning: only placePile adds items, and amounts are tiny
{ const it=[]; for(let i=0;i<600;i++) tableStep(it,P,[{x:200,y:600,vx:500,vy:0}],dt); ok(it.length===0,'nothing spawns on its own (20 s of hand motion, 0 items)');
  const n=placePile(it,P,100,700,'fire'); ok(n<=4,`one tap places a pinch (${n} pieces)`); for(let i=0;i<10;i++) placePile(it,P,100+i*20,700,'water'); ok(it.length<=TP.maxItems,`table holds at most ${TP.maxItems} pieces`); }
// 5. taps above the table land on it, not in mid-air
{ const it=[]; placePile(it,P,100,200,'air'); ok(it.every(o=>o.y>=P.top),'a drop above the table line lands on the table, not in mid-air'); }
ok(CALM.cap<=.2&&CALM.speed<=.4,'global particle amount ≤20% and speed ≤40% of v8');
console.log(`v10: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
