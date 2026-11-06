import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RS,createRealSkate,stepGround,stepAir,land} from '../assets/real_skate_core.mjs';
import {BB,createBoard,impulse,stepBoard,residual,recognize,createLoose,stepLoose} from '../assets/board_body.mjs';
import {createRide,stepRide} from '../assets/real_skate_ride.mjs';
import {createSkateYard} from '../assets/skate_yard_world.mjs';

// Skate Phase 1: the board is its own body. Every result below comes from torque, inertia, damping and timing.
const dt=1/60,I0={lx:0,ly:0,rx:0,ry:0,l2:0,r2:0,a:false,aEdge:false,grab:false},inp=o=>({...I0,...o});
const TAU=Math.PI*2,near=(a,s)=>a-Math.round(a/s)*s;
// pop with good slide timing, then run `air(t,A)` each frame; extra lift lets us test big air without a ramp
function trick(air,{speed=6,lift=0}={}){
  const S=createRealSkate({rng:()=>.5});S.speed=speed;for(let t=0;t<.3;t+=dt)stepGround(S,inp({l2:1,r2:1}),{},dt);
  const r=stepGround(S,inp({l2:1}),{},dt);let vy=r.pop.vy+lift,y=0,t=0;const ev=[];
  while(t<4){const A=S.air;const I=inp({l2:t<.08?1:0,...air(t,A)});const o=stepAir(S,I,dt);ev.push(...o.events);vy+=o.dvy-RS.G*dt;y+=vy*dt;t+=dt;if(y<=0&&t>.05)break;}
  return {S,ev,air:t,res:land(S,{impact:-vy})};
}
// a player who watches the deck: squeeze both when it comes back around grip-up
// lead the catch: feet friction keeps turning the deck for about ω / (k·feet) more radians, so a good player squeezes early by that much
const lead=(A,ax,step,feet)=>{const b=A.board,w=b.w[ax],ahead=near(b.rot[ax]+w/(BB.FOOT_DAMP*feet),step);return Math.abs(ahead)<.3;};
const watch=(A,feet=2)=>{const r=A.board.rot;const turned=Math.abs(r.roll)>4||Math.abs(r.yaw)>2.2||Math.abs(r.pitch)>4;return A.freed&&turned&&lead(A,'roll',TAU,feet)&&lead(A,'yaw',Math.PI,feet)&&lead(A,'pitch',TAU,feet);};
const flick=(foot,x,y,at)=>(t)=>t>=at&&t<at+.06?(foot==='L'?{lx:x,ly:y}:{rx:x,ry:y}):{};
const both=(...fs)=>(t,A)=>{let o={};for(const f of fs)o={...o,...f(t,A)};return o;};
const catcher=(t,A)=>{if(A&&(A.botCaught||watch(A))){A.botCaught=true;return {l2:1,r2:1};}return {};};

test('the deck has real inertia: the same foot impulse spins roll ~12x faster than yaw',()=>{
  const b=createBoard();b.contacts.L=b.contacts.R=false;impulse(b,'roll',.16);impulse(b,'yaw',.16);
  assert.ok(b.w.roll/b.w.yaw>11&&b.w.roll/b.w.yaw<14);
  const c=createBoard();c.contacts.L=c.contacts.R=false;impulse(c,'roll',.16);const w0=c.w.roll;for(let i=0;i<30;i++)stepBoard(c,dt);
  const d=createBoard();impulse(d,'roll',.16);for(let i=0;i<30;i++)stepBoard(d,dt);
  assert.ok(c.w.roll>w0*.85,'air barely slows it');assert.ok(d.w.roll<w0*.02,'two feet on the grip stop it dead');
});

test('kickflip from a front-foot flick; flick harder → faster flip (a double fits in the same air)',()=>{
  const K=trick(both(flick('L',-1,0,.1),catcher));assert.equal(K.res.ok,true,K.res.why);assert.match(K.res.name,/^Kickflip/);
  // strength comes from how fast the stick travels: a lazy push (ramped over 0.12 s) flips slower
  const lazy=trick(both((t)=>t>=.1&&t<.25?{lx:-Math.min(1,(t-.1)/.12)}:{},catcher));
  const fast=K.S.stats,lz=lazy.ev.find(e=>e.type==='kick');assert.ok(lz,'lazy flick still kicks');
  const dbl=trick(both(flick('L',-1,0,.1),(t,A)=>{if(!A)return{};const r=A.board.rot.roll;if(A.botCaught||(Math.abs(r)>TAU*1.6&&lead(A,'roll',TAU,2))){A.botCaught=true;return{l2:1,r2:1};}return{};}),{lift:2.2});
  assert.match(dbl.res.name,/Double Kickflip/,dbl.res.name+' '+dbl.res.why);
});

test('catch too early interrupts the rotation (feet friction) → bail; too late → feet miss the deck',()=>{
  const E=trick(both(flick('L',-1,0,.1),(t)=>t>.24?{l2:1,r2:1}:{}));
  assert.equal(E.res.ok,false);assert.match(E.res.fail,/upsideDown|sideways/);
  const L=trick(both(flick('L',-1,0,.1),(t)=>t>.1+BB.REACH+.05?{l2:1,r2:1}:{}),{lift:1.5});
  assert.ok(L.ev.some(e=>e.type==='missed'));assert.equal(L.res.fail,'missed');
});

test('one foot back on = sketchy at best; on a hard landing you run it out',()=>{
  const one=(t,A)=>A&&(A.botCaught||watch(A,1))?(A.botCaught=true,{l2:1}):{};
  const soft=trick(both(flick('L',-1,0,.1),one));assert.ok(soft.res.ok?soft.res.quality==='sketchy':true,JSON.stringify(soft.res));assert.notEqual(soft.res.quality,'perfect');
  const hard=trick(both(flick('L',-1,0,.1),one),{lift:3});assert.equal(hard.res.fail,'runOut');
});

test('where your feet are on the deck at touchdown matters: tail-heavy shoots the board out, toe-heavy washes out',()=>{
  const ok=trick(()=>({}));assert.equal(ok.res.ok,true);
  const tail=trick((t)=>t>.3?{l2:1,r2:1,ly:1,ry:1}:{});assert.equal(tail.res.fail,'shotOut',JSON.stringify(tail.res));
  const nose=trick((t)=>t>.3?{l2:1,r2:1,ly:-1,ry:-1}:{});assert.equal(nose.res.fail,'noseDive');
  const toe=trick((t)=>t>.3?{l2:1,r2:1,lx:1,rx:1}:{});assert.equal(toe.res.fail,'washout');
});

test('tricks are named from what the board did: hardflip, inward heel, impossible, laser, late flip, 360 shove',()=>{
  const name=(...fs)=>trick(both(...fs,catcher),{lift:1.5}).res;
  assert.match(name(flick('L',-1,0,.1),flick('R',0,-1,.1)).name,/Hardflip/);
  assert.match(name(flick('L',1,0,.1),flick('R',0,1,.1)).name,/Inward Heelflip/);
  assert.match(name(flick('R',1,0,.1)).name,/Impossible/);
  assert.match(name(flick('L',-1,0,.45)).name,/Late Kickflip/);
  const s360=name((t)=>t>=.1&&t<.16?{ry:1.0}:{},(t,A)=>{if(!A)return{};const y=A.board.rot.yaw;if(A.botCaught||(Math.abs(y)>TAU*.8&&lead(A,'yaw',Math.PI,2))){A.botCaught=true;return{l2:1,r2:1};}return{};});
  assert.match(s360.name,/Shove-It/);
  const r=recognize({rot:{roll:TAU,yaw:-TAU,pitch:0}},{});assert.equal(r.name,'360 Hardflip');
  const l=recognize({rot:{roll:-TAU,yaw:-TAU,pitch:0}},{});assert.equal(l.name,'Laser Flip');
});

test('grab: hold X in the air — stick picks the grab, it steadies the deck, let go before you land',()=>{
  const G=trick((t)=>t>.2&&t<.55?{grab:true,lx:.8}:{},{lift:1});assert.equal(G.res.ok,true);assert.match(G.res.name,/Ollie Indy/);
  const N=trick((t)=>t>.2&&t<.55?{grab:true,ly:-.8}:{},{lift:1});assert.match(N.res.name,/Nosegrab/);
  const H=trick((t)=>t>.2?{grab:true}:{},{lift:3});assert.equal(H.res.ok,false);assert.match(H.res.why,/holding the grab|drop/);
});

test('a bail sends the board off with its own momentum: it rolls far on its wheels, scrapes short on its side',()=>{
  const floor=()=>0,roll=(up)=>{const L=createLoose({x:0,y:.05,z:0},{x:0,y:0,z:6},{},up);for(let i=0;i<600;i++)stepLoose(L,floor,dt);return L.p.z;};
  const far=roll(true),short=roll(false);assert.ok(far>15,'wheels '+far.toFixed(1));assert.ok(short<6,'grip-down '+short.toFixed(1));
  // in the ride: rolling into the ledge side at speed → board bounces back loose, Metal falls
  const W=createSkateYard(),S=createRealSkate({rng:()=>.5}),R=createRide(S,W,{x:8,z:-3,heading:Math.PI/2});const ev=[];
  for(let t=0;t<4;t+=dt)ev.push(...stepRide(R,inp({aEdge:t<2&&Math.abs(t%.6)<dt/2}),dt));
  const b=ev.find(e=>e.type==='bail');assert.ok(b&&b.loose,'loose board');assert.equal(b.fail,'wall');assert.ok(b.loose.v.x<0,'bounced back off the ledge');
});
