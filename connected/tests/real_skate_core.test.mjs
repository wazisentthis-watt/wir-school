import assert from 'node:assert/strict';
import {test} from 'node:test';
import {RS,createRealSkate,padToInput,stepGround,stepAir,land,enterGrind,stepGrind,wrap} from '../assets/real_skate_core.mjs';

const dt=1/60;
const I0={lx:0,ly:0,rx:0,ry:0,l2:0,r2:0,a:false,aEdge:false};
const inp=o=>({...I0,...o});
// deterministic rng so balance tests are repeatable
const seeded=(s=7)=>()=>{s=(s*16807)%2147483647;return s/2147483647;};
const rider=(o={})=>createRealSkate({rng:seeded(o.seed||7),...o});

// tiny vertical integrator: the main game owns real positions; tests only need airtime + peak
function runAir(S,pop,script,{g=RS.G}={}){
  let y=0,vy=pop.vy,t=0,peak=0;const ev=[];
  while(t<3){const I=script(t);const r=stepAir(S,I,dt);vy+=r.dvy;ev.push(...r.events);vy-=g*dt;y+=vy*dt;t+=dt;peak=Math.max(peak,y);if(y<=0&&t>.05)break;}
  return {peak,t,ev,impact:-vy};
}
// catchAt: seconds after the pop, or 'watch' = squeeze both when the board has come back around grip-up (what a player does)
const watching=A=>{const b=A&&A.board;if(!b||!A.freed)return false;const r=b.rot,TAU=Math.PI*2;const done=Math.abs(r.roll)>TAU*.8||Math.abs(r.yaw)>Math.PI*.8||Math.abs(r.pitch)>TAU*.8;return done&&Math.abs(r.roll-Math.round(r.roll/TAU)*TAU)<.35&&Math.abs(r.yaw-Math.round(r.yaw/Math.PI)*Math.PI)<.35&&Math.abs(r.pitch-Math.round(r.pitch/TAU)*TAU)<.35;};
function popWith(S,{back='R',loadFor=.3,slideAt=.1,spin=0,flick=null,catchAt=null,speed=6}={}){
  S.speed=speed;
  for(let t=0;t<loadFor;t+=dt)stepGround(S,inp({l2:1,r2:1,lx:spin}),{},dt);
  const front=back==='R'?'L':'R';
  const r=stepGround(S,inp({[back==='R'?'r2':'l2']:0,[front==='L'?'l2':'r2']:1,lx:spin}),{},dt);
  assert.ok(r.pop,'pop fires on fast back-trigger release');
  const air=runAir(S,r.pop,t=>{
    const I=inp({lx:0});
    const frontKey=front==='L'?'l2':'r2';I[frontKey]=t<slideAt?1:0;
    if(flick&&t>=flick.at&&t<flick.at+.06){const k=flick.foot==='L'?['lx','ly']:['rx','ry'];I[k[0]]=flick.x;I[k[1]]=flick.y;}
    if(catchAt==='watch'){if(S.air&&(S.air.caughtBot||watching(S.air))){S.air.caughtBot=true;I.l2=1;I.r2=1;}}
    else if(catchAt!=null&&t>=catchAt){I.l2=1;I.r2=1;}
    return I;
  });
  return {pop:r.pop,air,landing:land(S,{impact:air.impact})};
}

test('A taps push: one stroke per tap, v7 parity curve, holding A does not keep accelerating',()=>{
  const S=rider();const sp=[];
  for(let i=0;i<120;i++){const tap=i%37===0;stepGround(S,inp({a:true,aEdge:tap}),{},dt);if(i===59)sp.push(S.speed);}
  sp.push(S.speed);
  assert.ok(sp[0]>3&&sp[0]<7,'~1 s of rhythm pushing ≈ 5 m/s, got '+sp[0].toFixed(2));
  assert.ok(sp[1]<=RS.CRUISE+1e-9);
  const H=rider();for(let i=0;i<120;i++)stepGround(H,inp({a:true,aEdge:i===0}),{},dt);
  assert.ok(H.speed<3.6&&H.speed<sp[1]*.7,'holding A = a single stroke, got '+H.speed.toFixed(2));
});

test('lean is a carve, not a turn button: radius tightens with speed-limited grip, board lags the stick',()=>{
  const S=rider();S.speed=5;
  stepGround(S,inp({lx:1}),{},dt);
  assert.ok(Math.abs(S.lean)<RS.LEAN_MAX*.2,'board lean lags the stick on frame 1');
  for(let i=0;i<60;i++)stepGround(S,inp({lx:1}),{},dt);
  const k=Math.tan(RS.TRUCK*S.lean)/RS.WHEELBASE,R=1/Math.abs(k);
  assert.ok(R>1.5&&R<3.5,'full lean carve radius ≈ 2–3 m, got '+R.toFixed(2));
  assert.ok(S.heading<0,'lean right (stick +x) turns right (heading decreases)');
  const z=rider();z.speed=0;for(let i=0;i<60;i++)stepGround(z,inp({lx:1}),{},dt);assert.equal(z.heading,0,'stationary board does not spin from lean');
});

test('hard lean at speed breaks grip into a powerslide (near boardslide) and scrubs speed',()=>{
  const S=rider();S.speed=11;const ev=[];
  for(let i=0;i<70;i++)ev.push(...stepGround(S,inp({lx:-1}),{},dt).events);
  assert.ok(ev.some(e=>e.type==='powerslide'),'powerslide event');
  assert.ok(Math.abs(S.slide)>RS.SLIDE_EVENT,'board yawed sideways '+(S.slide*57.3).toFixed(0)+'°');
  assert.ok(S.speed<10,'slide scrubs speed: '+S.speed.toFixed(2));
  const C=rider();C.speed=4;const ce=[];for(let i=0;i<70;i++)ce.push(...stepGround(C,inp({lx:-1}),{},dt).events);
  assert.ok(!ce.some(e=>e.type==='powerslide'),'same lean at 4 m/s just carves');
});

test('perfect ollie: load, snap back trigger, slide front trigger in the window — beats a both-at-once hop and a never-slid pop',()=>{
  const P=popWith(rider(),{slideAt:.1,catchAt:.45});
  assert.ok(P.air.ev.some(e=>e.type==='perfectPop'));assert.ok(P.air.ev.some(e=>e.type==='realign'),'both triggers clicked back in = feet realigned');
  const U=popWith(rider(),{slideAt:.1});assert.equal(U.landing.quality,'clean','no realign = clean, not perfect');
  assert.equal(P.landing.ok,true);assert.equal(P.landing.quality,'perfect');
  const W=rider();W.speed=6;for(let t=0;t<.3;t+=dt)stepGround(W,inp({l2:1,r2:1}),{},dt);
  const hop=stepGround(W,inp({}),{},dt).pop;assert.ok(hop.vy<P.pop.vy*.8,'both triggers at once = weak hop');
  const N=popWith(rider(),{slideAt:9});
  assert.ok(N.air.ev.some(e=>e.type==='noSlide'));assert.ok(N.air.peak<P.air.peak*.8,`no slide peak ${N.air.peak.toFixed(2)} vs perfect ${P.air.peak.toFixed(2)}`);
  assert.notEqual(N.landing.quality,'perfect');
  assert.ok(P.air.peak>1.45&&P.air.peak<1.95,'perfect ollie ≈ v7 canonical 1.76 m pop, got '+P.air.peak.toFixed(2));
});

test('deeper and longer knee load = higher pop',()=>{
  const shallow=rider();shallow.speed=6;for(let t=0;t<.06;t+=dt)stepGround(shallow,inp({l2:.5,r2:.5}),{},dt);
  const a=stepGround(shallow,inp({l2:.5}),{},dt).pop;
  const deep=rider();deep.speed=6;for(let t=0;t<.3;t+=dt)stepGround(deep,inp({l2:1,r2:1}),{},dt);
  const b=stepGround(deep,inp({l2:1}),{},dt).pop;
  assert.ok(a&&b&&b.vy>a.vy+.6,`deep ${b.vy.toFixed(2)} > shallow ${a.vy.toFixed(2)}`);
});

test('front-foot trigger release first = nollie (regular stance: L2 is the front foot)',()=>{
  const S=rider();S.speed=6;for(let t=0;t<.3;t+=dt)stepGround(S,inp({l2:1,r2:1}),{},dt);
  const r=stepGround(S,inp({r2:1}),{},dt);assert.equal(r.pop.kind,'Nollie');
  const G=rider({stance:'goofy'});G.speed=6;for(let t=0;t<.3;t+=dt)stepGround(G,inp({l2:1,r2:1}),{},dt);
  assert.equal(stepGround(G,inp({l2:1}),{},dt).pop.kind,'Nollie','goofy mirrors: R2 is front');
});

test('kickflip = front foot off + left stick flick, caught by squeezing both triggers again',()=>{
  // regular: front foot = L, slides off (L2 released) then flicks the left stick toward the heel→toe side (left)
  const P=popWith(rider(),{slideAt:.08,flick:{foot:'L',x:-1,y:0,at:.1},catchAt:'watch'});
  assert.ok(P.air.ev.some(e=>e.type==='kick'&&e.role==='front'));
  assert.ok(P.air.ev.some(e=>e.type==='catch'),'caught');
  assert.equal(P.landing.ok,true,'landed: '+P.landing.why);
  assert.match(P.landing.name,/Kickflip/);
  const H=popWith(rider(),{slideAt:.08,flick:{foot:'L',x:1,y:0,at:.1},catchAt:'watch'});
  assert.match(H.landing.name,/Heelflip/);
});

test('flicking a stick while that foot is still on (trigger held) does nothing — you have to take the foot off first',()=>{
  const S=rider();S.speed=6;for(let t=0;t<.3;t+=dt)stepGround(S,inp({l2:1,r2:1}),{},dt);
  const r=stepGround(S,inp({l2:1}),{},dt);
  const air=runAir(S,r.pop,t=>inp({l2:1,lx:t>.1&&t<.16?-1:0}));
  assert.ok(!air.ev.some(e=>e.type==='kick'));assert.equal(land(S,{impact:air.impact}).name,'Ollie');
});

test('flip you never catch = bail; catch too early mid-rotation = board under you upside down',()=>{
  const N=popWith(rider(),{slideAt:.08,flick:{foot:'L',x:-1,y:0,at:.1},catchAt:null});
  assert.equal(N.landing.ok,false);assert.match(N.landing.why,/caught|upside|sideways/i);
  const E=popWith(rider(),{slideAt:.08,flick:{foot:'L',x:-1,y:0,at:.1},catchAt:.1+.15});
  assert.equal(E.landing.ok,false,'caught at half a rotation');
});

test('back foot scoop (right stick) = pop shove-it; scoop + front flick = varial/tre family',()=>{
  const S=popWith(rider(),{slideAt:.08,flick:{foot:'R',x:0,y:1,at:.1},catchAt:'watch'});
  assert.equal(S.landing.ok,true,S.landing.why);assert.match(S.landing.name,/Shove-It/);
  const V=rider();V.speed=6;for(let t=0;t<.3;t+=dt)stepGround(V,inp({l2:1,r2:1}),{},dt);
  const r=stepGround(V,inp({l2:1}),{},dt);
  const air=runAir(V,r.pop,t=>{const I=inp({l2:t<.06?1:0});if(t>=.1&&t<.16){I.lx=-1;I.ry=1;}if(t>=.1+.4)I.l2=I.r2=1;return I;});
  const L=land(V,{impact:air.impact});
  assert.ok(air.ev.filter(e=>e.type==='kick').length===2,'both feet kicked');
  assert.ok(/Varial|Tre|Flip/.test(L.name),L.name+' '+L.why);
});

test('spin is committed at the pop: leaning into it before popping spins, steering only after the pop barely does',()=>{
  const H=popWith(rider(),{slideAt:.1,spin:-.5});assert.equal(H.landing.ok,true,H.landing.why);assert.match(H.landing.name,/180/,'half wind-up = 180');
  const F=popWith(rider(),{slideAt:.1,spin:-1});assert.equal(F.landing.ok,true,F.landing.why);assert.match(F.landing.name,/360/,'full wind-up = 360');
  const Ab=0;
  const B=rider();B.speed=6;for(let t=0;t<.3;t+=dt)stepGround(B,inp({l2:1,r2:1}),{},dt);
  const r=stepGround(B,inp({l2:1}),{},dt);
  runAir(B,r.pop,t=>inp({l2:t<.1?1:0,lx:-1}));
  assert.ok(Math.abs(B.air.bodyYaw)<1.2,'air-only steering ≤ ~60°: '+(B.air.bodyYaw*57.3).toFixed(0)+'°');
  assert.equal(Ab,0);
});

test('ollie onto a rail picks the grind from board angle; stick X balances, letting go eventually slips off',()=>{
  const S=rider();
  assert.equal(enterGrind(S,0,0.05).name,'50-50');
  assert.equal(enterGrind(rider(),0,Math.PI/2).name,'Boardslide');
  assert.equal(enterGrind(rider(),0,Math.PI/2,'ledge').name,'Lipslide');
  assert.match(enterGrind(rider(),0,.7).name,/Crooked|Smith/);
  // nobody balancing → falls within a few seconds
  const F=rider({seed:3});enterGrind(F,0,0);let fell=0;for(let i=0;i<600&&!fell;i++)if(stepGrind(F,inp({}),dt).fall)fell=i*dt;
  assert.ok(fell>.25&&fell<6,'unbalanced grind falls after '+fell.toFixed(2)+'s');
  // a balancing thumb (small corrective input proportional to the wobble) holds it for 6 s
  const B=rider({seed:3});enterGrind(B,0,0);let ok=true;
  for(let i=0;i<360;i++){const g=B.grind;const lx=Math.max(-1,Math.min(1,-g.b*1.6-g.bv*.9));if(stepGrind(B,inp({lx}),dt).fall){ok=false;break;}}
  assert.ok(ok,'balanced 6 s');
  // over-correcting (full stick bang-bang) throws you off the other side — it is sensitive
  const O=rider({seed:3});enterGrind(O,0,0);let of=false;for(let i=0;i<600;i++){const lx=O.grind?(O.grind.b>0?-1:1):0;if(stepGrind(O,inp({lx}),dt).fall){of=true;break;}}
  assert.ok(of,'bang-bang full stick eventually falls');
  // weight back = 5-0
  const W=rider();enterGrind(W,0,0);stepGrind(W,inp({ly:.6}),dt);assert.equal(W.grind.name,'5-0');
});

test('pop out of a grind uses the same ollie motion',()=>{
  const S=rider();enterGrind(S,0,0);for(let i=0;i<20;i++)stepGrind(S,inp({l2:1,r2:1,lx:-S.grind.b}),dt);
  // the triggers were already held when we landed on the rail: need a re-squeeze, then release
  for(let i=0;i<5;i++)stepGrind(S,inp({lx:-(S.grind?.b||0)}),dt);
  for(let i=0;i<12;i++)stepGrind(S,inp({l2:1,r2:1,lx:-(S.grind?.b||0)}),dt);
  const r=stepGrind(S,inp({l2:1}),dt);assert.ok(r.pop&&r.pop.vy>3,'popped off the rail');
});

test('manual is weight on the back truck: hold the balance point, too much loops out, too little sets it down',()=>{
  const S=rider();S.speed=6;const ev=[];
  for(let i=0;i<90;i++)ev.push(...stepGround(S,inp({ly:RS.MAN_SET}),{},dt).events);
  assert.ok(ev.some(e=>e.type==='manualStart'));
  const L=rider();L.speed=6;const le=[];for(let i=0;i<20;i++)le.push(...stepGround(L,inp({ly:.5}),{},dt).events);for(let i=0;i<20;i++)le.push(...stepGround(L,inp({ly:.77}),{},dt).events);
  assert.ok(le.some(e=>e.type==='bail'),'looped out');
});

test('slopes: gravity along the board speeds you up downhill and stalls you on a ramp face',()=>{
  const D=rider();D.speed=3;for(let i=0;i<60;i++)stepGround(D,inp({}),{gAlong:4},dt);assert.ok(D.speed>6);
  const U=rider();U.speed=5;for(let i=0;i<90;i++)stepGround(U,inp({}),{gAlong:-6},dt);assert.ok(U.speed<0,'rolls back down (fakie) '+U.speed.toFixed(2));
});

test('landing a big drop too hard bails; landing with the body sideways to the roll bails',()=>{
  const S=rider();S.speed=6;for(let t=0;t<.3;t+=dt)stepGround(S,inp({l2:1,r2:1}),{},dt);stepGround(S,inp({l2:1}),{},dt);
  assert.equal(land(S,{impact:16}).ok,false);
  const T=rider();T.speed=6;for(let t=0;t<.3;t+=dt)stepGround(T,inp({l2:1,r2:1}),{},dt);stepGround(T,inp({l2:1}),{},dt);
  T.air.bodyYaw=Math.PI/2;assert.equal(land(T,{impact:3}).ok,false);
});

test('a slow release of both triggers is standing up (pump), not a pop',()=>{
  const S=rider();S.speed=6;for(let t=0;t<.3;t+=dt)stepGround(S,inp({l2:1,r2:1}),{},dt);
  let popped=false,stood=false;for(let i=0;i<50;i++){const v=1-i/40;const r=stepGround(S,inp({l2:Math.max(0,v),r2:Math.max(0,v)}),{},dt);popped||=!!r.pop;stood||=r.events.some(e=>e.type==='standUp');}
  assert.equal(popped,false);assert.equal(stood,true);assert.equal(S.mode,'ground');
});

test('padToInput reads the standard mapping analog triggers and A edge (no L3/R3 needed)',()=>{
  const b=(n,v=0)=>Array.from({length:17},(_,i)=>({pressed:false,value:0}));
  const gp={axes:[.5,-.04,0,.9],buttons:b()};gp.buttons[0]={pressed:true,value:1};gp.buttons[6]={pressed:true,value:.7};gp.buttons[7]={pressed:false,value:.3};
  const I=padToInput(gp,{});assert.equal(I.aEdge,true);assert.equal(I.ly,0,'deadzone');assert.equal(I.l2,.7);assert.equal(I.r2,.3);assert.equal(I.ry,.9);
  assert.equal(padToInput(gp,I).aEdge,false);
});
