import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MAT,build,constructHeight,constructRails,reclaim,damageConstruct,railFrom,railSegments,bendRail,straightenRail,createWall,hitWall,wallState,repairWall,JOBS,createWorldState,currentJob,checkJobs,serialize,deserialize} from '../assets/malleable_world_core.mjs';
import {createReframers,wake,step,hitArm,hitWheel,react,rescue,repairPart,hit} from '../assets/reframer_core.mjs';
const dt=1/60;

test('material is committed to constructs until you reclaim it; locked blueprints and empty reserves refuse',()=>{
  const s=createWorldState();const r=build(s,'ramp',0,0,0);assert.ok(r.ok);assert.equal(s.units,60-MAT.COST.ramp);
  assert.equal(build(s,'rail',0,0,0).why,'locked');s.units=10;assert.equal(build(s,'ramp',5,0,0).why,'material');
  assert.equal(reclaim(s,r.c.id),MAT.COST.ramp);assert.equal(s.units,10+MAT.COST.ramp);assert.equal(s.constructs.length,0);
  const d=build(s,'ramp',0,0,0);damageConstruct(s,d.c.id,.5);assert.ok(reclaim(s,d.c.id)<MAT.COST.ramp,'damaged → some matter lost');
});

test('a Gallium ramp is a real surface: height rises along the heading, rails are grindable lines',()=>{
  const s=createWorldState();s.unlocked.rail=true;const {c}=build(s,'ramp',0,0,0);
  assert.equal(constructHeight(c,0,-1),-1);assert.ok(constructHeight(c,0,1)<constructHeight(c,0,3));assert.ok(Math.abs(constructHeight(c,0,3.19)-1.1)<.01);
  const rl=build(s,'rail',10,0,Math.PI/2).c;const seg=constructRails(rl)[0];assert.ok(Math.abs(seg.a.y-.55)<1e-9);assert.ok(Math.abs(seg.b.x-seg.a.x-6)<1e-9);
});

test('a heavy glob bends the bar; the grind follows the new shape; it can be straightened',()=>{
  const r=railFrom({x:-6,y:.55,z:0},{x:6,y:.55,z:0},'Flat bar');
  assert.equal(bendRail(r,{x:0,z:.2},{x:0,y:-.1,z:1},.2),false,'too light to bend steel');
  const p=bendRail(r,{x:0,z:.2},{x:0,y:-.8,z:1},.9);assert.ok(p&&p.z>.5&&p.y<.55);
  const segs=railSegments(r);assert.equal(segs.length,2);assert.match(segs[0].name,/Bent/);
  straightenRail(r);assert.equal(railSegments(r).length,1);
});

test('wall panels crack, break and cascade when unsupported; repair rebuilds bottom-up with material',()=>{
  const W=createWall(4,3);hitWall(W,1,0,.6);assert.equal(wallState(W).cracked,1);
  const fell=hitWall(W,1,0,.7);assert.ok(fell.length>=1);
  hitWall(W,2,0,1.2);const st=wallState(W);assert.ok(st.broken>=3,'panels above two broken bottoms with no bridge fall: '+JSON.stringify(st));
  const s=createWorldState();let n=0;while(repairWall(s,W)?.ok)n++;assert.ok(n>=3);assert.equal(wallState(W).broken,0);assert.ok(W.panels.some(p=>p.patched));
  s.units=0;hitWall(W,0,0,1.5);assert.equal(repairWall(s,W).why,'material');
});

test('jobs unlock techniques through mastery, and the world saves compact changes',()=>{
  const s=createWorldState();assert.equal(currentJob(s).id,'gather');s.stats.drawn=45;assert.equal(checkJobs(s).id,'gather');
  s.stats.rampAirs=1;assert.equal(checkJobs(s).unlock,'rail');assert.equal(s.unlocked.rail,true);
  const rails={bar:railFrom({x:-6,y:.55,z:0},{x:6,y:.55,z:0},'Flat bar')};bendRail(rails.bar,{x:0,z:0},{x:0,y:-1,z:1},1);
  const W=createWall();hitWall(W,0,0,1);build(s,'ramp',3,4,1);
  const txt=serialize(s,rails,W);assert.ok(txt.length<1500,'compact '+txt.length);
  const rails2={bar:railFrom({x:-6,y:.55,z:0},{x:6,y:.55,z:0},'Flat bar')},W2=createWall();const s2=deserialize(txt,rails2,W2);
  assert.equal(rails2.bar.pts.length,3);assert.equal(W2.panels[0].hp,0);assert.equal(s2.constructs.length,1);assert.equal(s2.unlocked.rail,true);assert.equal(JOBS.length,4);
});

test('ReFramer limbs: break 3 arms during the clamp to topple it; Roadframe outriggers: 3 wheels off and it collapses',()=>{
  const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:10,z:0},[{id:'c',x:5,z:0}]);for(let i=0;i<60*3.2;i++)step(W,{x:10,z:0},{x:5,z:0},dt);
  assert.equal(W.enc.stage,'anchor');hitArm(W,0,1);hitArm(W,1,1);const t=hitArm(W,2,1);assert.equal(t.tipped,true);assert.equal(W.enc.stage,'stagger');
  const W2=createReframers([{x:0,y:12,z:0}]);wake(W2,{x:10,z:0},[{id:'c',x:5,z:0}]);for(let i=0;i<60*13;i++)step(W2,{x:10,z:0},null,dt);assert.equal(W2.enc.stage,'chase');
  hitWheel(W2,0,1);hitWheel(W2,1,1);const e=hitWheel(W2,2,1);assert.equal(e.outcome,'roadframeDown');
});

test('ReFramer reacts: outriggers up vs swinging, goes after Gallium constructs, works faster once the driver is out, flees with parts from a huge hit',()=>{
  const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:10,z:0},[{id:'c',x:5,z:0,occupied:true}]);for(let i=0;i<60;i++)step(W,{x:10,z:0},{x:5,z:0},dt);
  assert.equal(react(W,{swinging:true}).type,'outriggersUp');const a0=W.enc.arms[0];hitArm(W,0,.4);assert.ok(Math.abs(a0-W.enc.arms[0]-.2)<1e-9,'guarded arms take half');
  rescue(W);assert.equal(W.enc.speed,1.5);
  for(let i=0;i<60*4;i++)step(W,{x:10,z:0},{x:5,z:0},dt);assert.equal(react(W,{construct:{id:'ramp1',x:6,z:2}}).type,'smashConstruct');
  while(W.enc.stage!=='release')step(W,{x:10,z:0},{x:5,z:0},dt);for(let i=0;i<30;i++)step(W,{x:10,z:0},{x:5,z:0},dt);const f=react(W,{bigHit:.9});assert.equal(f.outcome,'fledWithParts');
});

test('stop it after the wheels came off: parts scatter, guide them back and the car is repaired',()=>{
  const W=createReframers([{x:0,y:12,z:0}]);wake(W,{x:10,z:0},[{id:'c',x:5,z:0}]);while(W.enc.stage!=='release')step(W,{x:10,z:0},{x:5,z:0},dt);
  for(let i=0;i<70;i++)step(W,{x:10,z:0},{x:5,z:0},dt);hitArm(W,0,1);hitArm(W,1,1);hitArm(W,2,1);hit(W,'strike',.8);const r=hit(W,'strike',1);
  assert.equal(r.outcome,'clean');assert.ok(r.scatter>=1);for(let k=0;k<r.scatter;k++)repairPart(W,r.id);assert.equal(W.ledger[0].outcome,'repaired');
});
