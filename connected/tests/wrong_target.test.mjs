import assert from 'node:assert/strict';
import {test} from 'node:test';
import {WT,createWT,step,hitLimb,hitKeeper,observe,forceAt,checks,serialize,restore} from '../assets/wrong_target_core.mjs';
const dt=1/60;
const SITE={signal:{x:0,z:-12},bus:{x:0,z:0},door:{x:-1,z:2},safe:{x:-14,z:14},nest:{x:6,z:-3},field:{x:4,z:6,dx:1,dz:0}};
const W=(o={})=>({metal:{x:0,z:-12},officers:[{x:5,z:8},{x:8,z:8}],occluded:[false,false],gal:100,...o});
const lead=(p)=>{const dx=SITE.safe.x-p.x,dz=SITE.safe.z-p.z,d=Math.hypot(dx,dz)||1,k=Math.min(d,2.5)/d;return {x:p.x+dx*k,z:p.z+dz*k};};
const run=(S,w,sec,f)=>{const ev=[];for(let i=0;i<sec*60;i++){if(f)f(w,i*dt);const o=step(S,w,dt);ev.push(...o.events);}return ev;};
const live=()=>{const S=createWT(SITE);step(S,W(),dt);return S;};

test('the signal starts it; police arrive after a delay; eight addressable limbs',()=>{
  const S=createWT(SITE);step(S,W({metal:{x:40,z:40}}),dt);assert.equal(S.mission,'APPROACH');
  const e=step(S,W(),dt).events;assert.ok(e.some(x=>x.type==='activate'));assert.equal(S.boss.limbs.length,8);
  const ev=run(S,W({metal:{x:30,z:30}}),WT.OFFICER_DELAY+.1);assert.ok(ev.some(x=>x.type==='policeArrive'));
});

test('brace: far away does nothing, near + hold Draw costs 18 Gallium once and reverses the lift; no Gallium, no brace',()=>{
  const S=live();run(S,W({metal:{x:30,z:30},drawing:true}),2);assert.equal(S.bus.braced,false);const t0=S.bus.tilt;assert.ok(t0>.15,'the shuttle is being lifted');
  const ev=run(S,W({metal:{x:2,z:1},drawing:true}),1.2);assert.ok(ev.some(e=>e.type==='braced'));assert.equal(S.stats.gal,18);
  run(S,W({metal:{x:2,z:1},drawing:true}),2);assert.equal(S.stats.gal,18,'no double charge');assert.ok(S.bus.tilt<t0);
  const P=live();const e2=run(P,W({metal:{x:2,z:1},drawing:true,gal:10}),1.2);assert.ok(e2.some(e=>e.why==='gallium'));assert.equal(P.bus.braced,false);
});

test('extracted is not safe — the rider walks with Metal, waits if left, and only the safe zone counts',()=>{
  const S=live();const ev0=run(S,W({metal:{x:-1,z:2},interact:true}),dt);assert.ok(ev0.some(e=>e.why==='brace'),'must brace first');
  run(S,W({metal:{x:2,z:1},drawing:true}),1.2);step(S,W({metal:{x:-1,z:2},interact:true}),dt);
  assert.equal(S.people[0].phase,'ESCORTING');assert.equal(S.after.rescued,0);
  run(S,W({metal:{x:60,z:60}}),.5);assert.equal(S.people[0].phase,'WAITING');
  const w=W({metal:{x:-1,z:2}});const ev=run(S,w,40,(w)=>{w.metal=lead(S.people[0]);});
  assert.ok(ev.some(e=>e.type==='safe'&&e.id==='A'));assert.equal(S.after.rescued,1);assert.ok(checks(S).rescuedMatches);
});

test('police learn only from what they witness, once each; a witnessed rescue lowers suspicion, collateral raises it',()=>{
  const S=live();run(S,W({metal:{x:30,z:30}}),WT.OFFICER_DELAY+.1);
  assert.equal(observe(S,0,'X','rescue',{dist:60}),null,'out of range');assert.equal(observe(S,0,'X','rescue',{occluded:true}),null,'occluded');
  const a=observe(S,0,'R1','rescue',{dist:5});assert.equal(a.suspicion,48);assert.equal(observe(S,0,'R1','rescue',{dist:5}),null,'duplicate');
  observe(S,1,'C1','collateral',{dist:5});assert.equal(S.officers[1].mode,'PURSUE');
  const ev=run(S,W({metal:{x:8,z:8.5}}),dt*2);assert.ok(ev.some(e=>e.type==='snare'),'a pursuing officer snares Metal');
  assert.ok(checks(S).uniqueEvidence);
});

test('limbs: support loss changes stance; taking a shuttle-side leg while it is loose dumps load on it; the Framekeeper repairs from finite stock',()=>{
  const S=live();const t0=S.bus.tilt;const r=hitLimb(S,1,1);hitLimb(S,1,1);assert.equal(S.boss.limbs[0].hp,0);assert.ok(S.bus.tilt>=t0+.25-1e-9,'load shifted onto the shuttle');
  hitLimb(S,3,1);hitLimb(S,3,1);assert.equal(S.boss.mode,'RECOVER_STANCE');assert.equal(S.boss.supports,2);
  const ev=run(S,W({metal:{x:30,z:30}}),WT.REPAIR_EVERY+.1);const rep=ev.find(e=>e.type==='repair');assert.ok(rep);assert.equal(S.keeper.stock,1);assert.equal(S.boss.mode,'HARVEST','a repaired leg lets it stand again');
  run(S,W({metal:{x:30,z:30}}),WT.REPAIR_EVERY*3);assert.equal(S.keeper.stock,0,'never negative');assert.ok(checks(S).stock);
  const K=live();hitLimb(K,4,1);hitLimb(K,4,.2);assert.equal(hitKeeper(K,1).type,'keeperDown');run(K,W({metal:{x:30,z:30}}),WT.REPAIR_EVERY+.1);assert.equal(K.keeper.stock,2,'a downed drone repairs nothing');
});

test('gravity anomaly is bounded and local and switches off; Lil Heavy footage diverts the drone',()=>{
  const S=live();const f=forceAt(S,SITE.field.x,SITE.field.z);assert.ok(f.ax>0);assert.deepEqual(forceAt(S,999,999),{ax:0,az:0});
  run(S,W({metal:{x:30,z:30}}),WT.GRAV_T+.1);assert.equal(S.grav.on,false);
  const L=live();run(L,W({metal:{x:30,z:30}}),WT.OFFICER_DELAY+.1);const ev=run(L,W({metal:{x:6,z:8},lilHeavyScan:true}),dt);assert.ok(ev.some(e=>e.type==='lilHeavyScan'));assert.ok(L.keeper.diverted);hitLimb(L,3,.3);run(L,W({metal:{x:30,z:30}}),WT.DIVERT_T+WT.REPAIR_EVERY);assert.ok(L.keeper.log.length>=1,'the footage only buys time — the drone comes back');
});

test('full run: brace, both riders physically safe, two supports down → complete; save round-trips; mid-incident reload restarts it',()=>{
  const S=live();run(S,W({metal:{x:2,z:1},drawing:true}),1.2);
  for(const id of ['A','B']){step(S,W({metal:{x:-1,z:2},interact:true}),dt);const p=S.people.find(q=>q.id===id);
    run(S,W(),60,(w)=>{w.metal=lead(p);});}
  assert.equal(S.after.rescued,2);assert.equal(S.mission,'DEFEND','not done while it can still stand');
  for(const id of [3,4])for(let k=0;k<2;k++)hitLimb(S,id,1);
  const ev=run(S,W({metal:{x:30,z:30}}),dt);const c=ev.find(e=>e.type==='complete');assert.ok(c);assert.equal(c.rescued,2);assert.ok(S.after.routeOpen);
  assert.ok(Object.values(checks(S)).every(Boolean));const R=restore(serialize(S),SITE);assert.equal(R.mission,'COMPLETE');assert.equal(R.after.rescued,2);
  const M=live();assert.equal(restore(serialize(M),SITE).mission,'APPROACH');assert.equal(restore('{bad',SITE).mission,'APPROACH');
});
