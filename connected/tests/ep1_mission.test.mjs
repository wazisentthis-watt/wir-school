import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EP1,createEp1,step,feed,beatError,fightAbandoned,replay,serialize,deserialize} from '../assets/ep1_mission_core.mjs';
const dt=1/60;
const W=(o={})=>({metal:{x:0,z:0},studio:{x:-12,z:-12},ballast:{x:20,z:0},market:{x:0,z:12},platform:{x:11,z:2},post:{x:14,z:2},metalHp:1,braced:false,drawing:false,...o});
function run(M,w,sec,each){const ev=[];for(let i=0;i<sec*60;i++){if(each)each(i*dt,w);const o=step(M,w,dt);ev.push(...o.events);}return ev;}

test('the session starts at the studio and only on-beat landings count; it always finishes',()=>{
  const M=createEp1();const w=W({metal:{x:-12,z:-12}});step(M,w,dt);assert.equal(M.stage,'session');
  const p=60/EP1.BPM;assert.ok(beatError(p*3+.05)<.06);assert.ok(beatError(p*3+p/2)>.3);
  assert.equal(feed(M,'land',{time:p*2+p/2}).type,'offBeat');
  for(let k=1;k<=EP1.BEATS_NEEDED;k++)assert.equal(feed(M,'push',{time:p*k+.04}).type,'onBeat');
  const ev=run(M,w,.1);assert.ok(ev.some(e=>e.type==='depotAlarm'));assert.equal(M.stage,'alarm');
  const M2=createEp1();step(M2,w,dt);run(M2,w,EP1.SESSION_MAX+.2);assert.ok(['alarm','chase'].includes(M2.stage),'never stuck at the studio');
});

test('chase: Ballast tosses crates while you close in, catching him starts round one',()=>{
  const M=createEp1();M.stage='chase';const w=W({metal:{x:8,z:0}});const ev=run(M,w,1);assert.ok(ev.some(e=>e.type==='tossCrate'));
  w.metal={x:16,z:0};run(M,w,dt*2);assert.equal(M.stage,'clash');
});

test('round one is a scripted loss — he cannot go down and the fight ends when he lands enough or time runs out',()=>{
  const M=createEp1();M.stage='chase';const w=W({metal:{x:17,z:0}});step(M,w,dt);assert.equal(M.stage,'clash');
  const o=step(M,w,dt);assert.equal(o.minStance,EP1.CLASH_MIN_STANCE);
  w.metalHp=.6;const ev=run(M,w,dt*2);assert.ok(ev.some(e=>e.type==='scriptedLoss'));assert.equal(M.stage,'down');assert.equal(M.ledger.losses,1);
  const M2=createEp1();M2.stage='chase';const w2=W({metal:{x:17,z:0}});step(M2,w2,dt);run(M2,w2,EP1.CLASH_T+.1);assert.equal(M2.stage!=='clash',true);
});

test('awning: bracing with Metal Draw holds it up and walks people out; walking away lets it fall (they get out shaken)',()=>{
  const M=createEp1();M.stage='down';const w=W({metal:{x:0,z:10}});const e0=run(M,w,EP1.DOWN_T+.05);assert.ok(e0.some(e=>e.type==='awningBreak'));
  w.braced=true;const ev=run(M,w,EP1.AWN.civs*EP1.AWN.outT+.3);assert.equal(ev.filter(e=>e.type==='civOut').length,EP1.AWN.civs);assert.equal(M.stage,'platform');assert.equal(M.ledger.civsClean,4);
  const M2=createEp1();M2.stage='down';run(M2,w,EP1.DOWN_T+.05,()=>{});const w2=W({metal:{x:0,z:10},braced:false});const ev2=run(M2,w2,20);
  assert.ok(ev2.some(e=>e.type==='awningDown'));assert.equal(M2.ledger.civsShaken,4);assert.equal(M2.stage,'platform');
  const M3=createEp1();M3.stage='down';run(M3,w,EP1.DOWN_T+.05);const w3=W({metal:{x:40,z:40},braced:true});run(M3,w3,3);assert.equal(M3.awn.out,0,'bracing from across the block does nothing');
});

test('platform: punches only earn a hint; releasing the latch with Ballast underneath pins him; a miss re-hoists',()=>{
  const M=createEp1();M.stage='platform';const w=W({ballast:{x:0,z:0},metal:{x:3,z:0}});
  for(let k=0;k<EP1.PLAT.punchHint-1;k++)feed(M,'punch');assert.equal(feed(M,'punch').type,'hint');
  assert.equal(feed(M,'latch',{power:1}).type,'platformRelease');const ev=run(M,w,EP1.PLAT.dropT+.05);assert.ok(ev.some(e=>e.type==='platformMiss'));assert.equal(M.ledger.platformMisses,1);
  run(M,w,EP1.PLAT.rehoist+.05);assert.equal(M.plat.state,'up');
  w.ballast={x:11.5,z:2.4};w.drawing=true;w.metal={x:14,z:2.5};const e2=run(M,w,EP1.PLAT.pullT+EP1.PLAT.dropT+.1);assert.ok(e2.some(e=>e.type==='platformRelease'),'drawing the pin at the post');assert.ok(e2.some(e=>e.type==='pinned'));
  run(M,w,EP1.PIN_T+.05);assert.equal(M.stage,'return');
});

test('return to the session to finish: stem 1 of 6, ledger and checkpoints survive a reload, replay keeps the stem',()=>{
  const M=createEp1();M.stage='return';M.runT=200;const ev=run(M,W({metal:{x:-12,z:-12}}),dt);const c=ev.find(e=>e.type==='complete');assert.ok(c);assert.equal(c.stems,1);assert.equal(c.of,6);assert.equal(M.stage,'done');
  const M2=deserialize(serialize(M));assert.equal(M2.stage,'done');assert.equal(M2.ledger.stems,1);assert.ok(replay(M2));assert.equal(M2.stage,'toStudio');assert.equal(M2.ledger.stems,1);
  const mid=createEp1();mid.stage='awning';assert.equal(deserialize(serialize(mid)).stage,'platform');mid.stage='clash';assert.equal(deserialize(serialize(mid)).stage,'chase');
  assert.equal(deserialize('{bad').stage,'toStudio');
  const f=createEp1();f.stage='clash';assert.equal(fightAbandoned(f),'chase');
});

test('full run with a scripted player hits every blueprint beat in order',()=>{
  const M=createEp1();const w=W();const seen=[];const p=60/EP1.BPM;let time=0;
  for(let i=0;i<60*240&&M.stage!=='done';i++){time+=dt;
    if(M.stage==='toStudio')w.metal={x:-12,z:-12};
    if(M.stage==='session'&&Math.abs(time%p)<dt)feed(M,'push',{time:Math.round(time/p)*p});
    if(M.stage==='chase')w.metal={x:w.ballast.x-4,z:w.ballast.z};
    if(M.stage==='clash')w.metalHp-=.03*dt;
    if(M.stage==='awning'){w.metal={x:0,z:11};w.braced=true;}
    if(M.stage==='platform'){w.braced=false;w.ballast={x:11,z:2};w.metal={x:14,z:2};w.drawing=true;}
    if(M.stage==='return'){w.drawing=false;w.metal={x:-12,z:-12};}
    const o=step(M,w,dt);for(const e of o.events)if(e.type==='stage')seen.push(e.stage);}
  assert.deepEqual(seen,['session','alarm','chase','clash','down','awning','platform','pinned','return','done']);
});
