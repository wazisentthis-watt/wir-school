import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRealSkate} from '../assets/real_skate_core.mjs';
import {createRide,stepRide,boardPose,bodyHeading} from '../assets/real_skate_ride.mjs';
import {createSkateYard} from '../assets/skate_yard_world.mjs';

// Whole-line simulations on the real yard geometry (lot-local metres, centre 0,0, floor 0).
const dt=1/60,I0={lx:0,ly:0,rx:0,ry:0,l2:0,r2:0,a:false,aEdge:false},inp=o=>({...I0,...o});
const W=createSkateYard();
const push=(t,until)=>t<until&&Math.abs(t%.6)<dt/2;
function ride(start,heading,script,secs){
  const S=createRealSkate({rng:()=>.5}),R=createRide(S,W,{x:start[0],z:start[1],heading}),ev=[];let maxY=0;
  for(let t=0;t<secs;t+=dt){const e=stepRide(R,script(t,R),dt);maxY=Math.max(maxY,R.p.y);for(const x of e)ev.push({...x,t});}
  return {R,S,ev,maxY,has:k=>ev.some(e=>e.type===k),get:k=>ev.filter(e=>e.type===k)};
}
// ollie bot: load both knees approaching, snap the back foot at `at`, slide the front foot 0.1 s later; balance any grind
const ollieAt=(cond,until=1.3)=>(t,R)=>{const I=inp({aEdge:push(t,until)});
  if(R.core.mode==='ground'&&!R.popped&&cond(R,.9)){I.l2=1;I.r2=1;if(cond(R,0)){I.r2=0;R.popped=true;R.pt=t;}}
  if(R.popped&&R.core.mode==='air')I.l2=t-R.pt<.1?1:0;
  if(R.core.mode==='grind'){const g=R.core.grind;I.lx=Math.max(-1,Math.min(1,-g.b*1.6-g.bv*.9));}
  return I;};

test('yard geometry: halfpipe, wall QP, funbox, kicker, ledge, pad, stairs and 13 grindable edges',()=>{
  assert.ok(Math.abs(W.height(8.5,13)-2.97)<.05,'halfpipe deck ≈ 3 m');
  assert.equal(W.height(0,13),0,'flat bottom');
  assert.equal(W.height(0,-4),1,'funbox top 1 m');
  assert.equal(W.height(18,0),.5,'ledge .5 m');
  assert.equal(W.height(-14,0),.3,'manual pad .3 m');
  assert.equal(W.rails.length,13);
  for(const r of W.rails)assert.ok(Math.abs(r.a.x)<=22&&Math.abs(r.a.z)<=22&&Math.abs(r.b.x)<=22&&Math.abs(r.b.z)<=22,'inside the 44 m lot: '+r.name);
});

test('halfpipe: push in, go vert at the lip, come back in fakie without bailing',()=>{
  const L=ride([-3,13],Math.PI/2,t=>inp({aEdge:push(t,1.9)}),4);
  assert.ok(L.has('vert'),'launched off the lip');
  const land=L.get('land')[0];assert.ok(land&&land.ok,'landed back in');assert.equal(land.fakie,true,'came back in fakie (rolling tail-first)');
  assert.ok(L.maxY>3.1,'air above the 3 m coping: '+L.maxY.toFixed(2));
  assert.ok(!L.has('bail'));
});

test('not enough speed = stall below the lip and roll back down, no air',()=>{
  const L=ride([-3,13],Math.PI/2,t=>inp({aEdge:push(t,.7)}),4);
  assert.ok(!L.has('vert'));assert.ok(L.maxY<2.5&&L.maxY>.6,'partway up: '+L.maxY.toFixed(2));assert.ok(L.S.speed<0||L.R.p.x<4,'rolled back');
});

test('pumping the transitions (crouch on the flat, stand up the curve) keeps the halfpipe alive longer than coasting',()=>{
  const peaks=pump=>{const L=ride([-2,13],Math.PI/2,(t,R)=>{const I=inp({aEdge:push(t,1.3)});if(pump&&t>1.6){const up=R.slope*Math.sign(R.core.speed||1);R.cc=R.cc??0;
    if(R.core.mode!=='ground'||Math.abs(R.slope)<.06)R.cc=Math.min(.8,R.cc+dt*3);else if(up>0)R.cc=Math.max(0,R.cc-dt*1.6);I.l2=I.r2=R.cc;}return I;},12);return {L,y:L.R.pumpGain||0};};
  const coast=peaks(false),pumped=peaks(true);
  assert.ok(pumped.y>.2,'pump energy gain recorded '+pumped.y.toFixed(2));
  assert.ok(!pumped.L.has('pop'),'easing off the triggers slowly never pops');
  // compare total height reached on later passes
  assert.ok(pumped.L.maxY>=coast.L.maxY-.05);
});

test('lean in over the coping (left stick forward at the lip) locks a coping grind; otherwise you come back in',()=>{
  const L=ride([-3,13],Math.PI/2,(t,R)=>inp({aEdge:push(t,1.9),ly:R.p.y>1.5&&t<3?-.6:0}),5);
  const g=L.get('grindStart')[0];assert.ok(g&&/Coping/.test(g.name),'coping lock: '+(g&&g.name));
  const N=ride([-3,13],Math.PI/2,t=>inp({aEdge:push(t,1.9)}),4);assert.ok(!N.has('grindStart'),'no accidental coping lock');
});

test('rolling into the side of the ledge at speed slams you; ollie up onto it instead',()=>{
  const L=ride([8,-3],Math.PI/2,t=>inp({aEdge:push(t,2)}),4);
  assert.match(L.get('bail')[0]?.why||'',/ollie onto it/);
});

test('ollie onto the ledge parallel = 50-50, balanced to the end, then rolls off',()=>{
  const L=ride([17.3,-14],0,ollieAt((R,lead)=>R.p.z>-7.6-lead),7);
  assert.ok(L.has('pop'));const g=L.get('grindStart')[0];assert.equal(g?.name,'50-50');
  const e=L.get('grindEnd')[0];assert.ok(e&&e.how==='end','rode it to the end');
  assert.ok(L.get('land').some(x=>x.ok),'landed off the end');assert.ok(!L.has('bail'));
});

test('flat bar: ollie on, hands off the stick = slip off the rail; balanced = 50-50 the whole bar',()=>{
  const ok=ride([-16,4.2],Math.PI/2,ollieAt((R,lead)=>R.p.x>-9.9-lead),6);
  assert.equal(ok.get('grindStart')[0]?.name,'50-50');assert.ok(!ok.has('bail'));
  const drop=ride([-16,4.2],Math.PI/2,(t,R)=>{const I=ollieAt((R,lead)=>R.p.x>-9.9-lead)(t,R);if(R.core.mode==='grind')I.lx=R.core.grind.b>0?1:-1;return I;},6);
  assert.ok(drop.has('bail'),'pushing the wobble the wrong way throws you off');
});

test('kicker launches an air from speed alone; three-stair drop lands clean',()=>{
  const K=ride([12,-10],0,t=>inp({aEdge:push(t,2)}),5);assert.ok(K.has('rollOff'));assert.ok(K.maxY>.9);assert.ok(K.get('land')[0]?.ok);
  const T=ride([-23,-12],Math.PI/2,t=>inp({aEdge:push(t,1.3)}),4);assert.ok(T.has('rollOff'));assert.ok(T.get('land')[0]?.ok);
});

test('board pose follows lean and flips for the renderer',()=>{
  const S=createRealSkate(),R=createRide(S,W,{x:0,z:0});S.speed=5;
  for(let i=0;i<40;i++)stepRide(R,inp({lx:1}),dt);
  assert.ok(boardPose(R).roll>.2,'board leans');assert.equal(bodyHeading(R),S.heading);
});
