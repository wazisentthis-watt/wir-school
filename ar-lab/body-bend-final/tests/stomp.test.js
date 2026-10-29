// node tests/stomp.test.js   — stomp / shield / boat logic (body.js). SIMULATED fixtures only (PLACEHOLDER / PROPOSAL – not canon). No camera, no network.
import {StompRecognizer,MotionQuality,RestTimer,World,spaceCheck,measure,distanceFromShoulders,framesPerMetre,KINDS,RISE_S,RISE_DELAY_S,CFG} from '../body.js';
import {makePose,walkPose,standPose,stompFrames,jumpFrames,tapFrames,rng} from '../fixtures.js';
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m); };
let net=0; globalThis.fetch=()=>{ net++; throw Error('network'); };
const A=9/16, base={cx:.5,floor:.9,Hp:.6,aspect:A,stance:1.0,bend:0};
const run=(frames,rec=new StompRecognizer(),aspect=A)=>{ const ev=[]; for(const f of frames) for(const e of rec.feed(f.pts,f.t,aspect)) ev.push(e); return {ev,rec}; };
const types=ev=>ev.map(e=>e.type);

// ---- stomp ----
{ const {ev}=run(stompFrames(base)); const t=types(ev);
  ok(t.join()==='impact,set,stomp','normal stomp: sequence impact -> set -> hold(stomp) ['+t.join('>')+']');
  const s=ev.find(e=>e.type==='stomp'); ok(s&&s.kind==='slab'&&!s.wideLow,'normal stance stomp -> slab (not shield)');
  ok(s&&s.simulated===true,'stomp event labeled simulated');
  const fx=.5-(1.0*.23*.6/2)/A; ok(Math.abs(s.x-fx)<.02&&s.y>.85&&s.y<.95,'landing spot is the stomping foot floor spot (x='+s.x.toFixed(3)+' expected ~'+fx.toFixed(3)+', y='+s.y.toFixed(3)+')'); }
{ const b={...base,stance:2.0,bend:.5}; const {ev}=run(stompFrames(b,{lift:.08*.6,hipDrop:.045*.6})); const s=ev.find(e=>e.type==='stomp');
  ok(s&&s.wideLow&&s.kind==='shield','wide low stance + stomp -> shield (stance '+(s&&s.stance.toFixed(2))+', knee '+(s&&s.knee.toFixed(0))+'deg)'); }
{ const b={...base,stance:2.0,bend:0}; const {ev}=run(stompFrames(b)); const s=ev.find(e=>e.type==='stomp');
  ok(s&&!s.wideLow&&s.kind==='slab','wide but straight-legged stomp -> slab, not shield'); }
{ const b={...base,stance:2.0,bend:.5}; const {ev}=run(stompFrames(b,{lift:.08*.6,hipDrop:.045*.6,foot:1})); ok(types(ev).includes('stomp'),'works with the other foot too'); }
{ const b={...base,stance:2.0,bend:.5}; const s=run(stompFrames(b,{lift:.08*.6,hipDrop:.045*.6})).ev.find(e=>e.type==='stomp'); const w=new World(); const it=w.spawn(s,0);
  ok(Math.abs(it.x-.5)<.02&&Math.abs(s.x-.5)>.1,'shield (and boat) is centred on the stance (x='+it.x.toFixed(2)+') while its depth/floor row comes from the landing foot (foot x='+s.x.toFixed(2)+')'); }
// ---- distance scaling ----
{ const near={...base,Hp:.8}, far={...base,Hp:.4}; const a=run(stompFrames(near)).ev.find(e=>e.type==='stomp'), b=run(stompFrames(far)).ev.find(e=>e.type==='stomp');
  ok(a&&b&&a.distM<b.distM,'closer player -> smaller estimated distance ('+a.distM.toFixed(2)+' m vs '+b.distM.toFixed(2)+' m, ESTIMATE)');
  ok(a.k>b.k*1.8,'rock scale follows shoulder width (frame-widths/m '+a.k.toFixed(3)+' vs '+b.k.toFixed(3)+')'); }

// ---- false positives ----
const fps=30, secs=12;
const fr=(fn)=>{ const o=[]; for(let i=0;i<secs*fps;i++){ const t=i/fps; o.push({t,pts:fn(t)}); } return o; };
{ const r=rng(2); const {ev}=run(fr(t=>standPose(base,t,r).map(p=>({...p,x:p.x+(r()-.5)*.003,y:p.y+(r()-.5)*.003})))); ok(!types(ev).some(x=>x!=='x'&&['impact','stomp'].includes(x)),'standing still with sway + jitter for 12 s: no impact/stomp (events: '+types(ev).length+')'); }
for(const sp of [1,1.2,1.4]){ const r=rng(4); const {ev}=run(fr(t=>walkPose(base,t,sp).map(p=>({...p,x:p.x+(r()-.5)*.003,y:p.y+(r()-.5)*.003})))); const t=types(ev);
  ok(!t.includes('stomp')&&!t.includes('impact'),'walking in place x'+sp+' for 12 s: no stomp (events: ['+t.join(',')+'])'); }
{ const {ev}=run(tapFrames(base)); ok(!types(ev).includes('stomp'),'foot tap with no hip drop: no stomp (whole-body only)'); }
{ const {ev}=run(jumpFrames(base)); const t=types(ev); ok(!t.includes('stomp')&&t.includes('jump-ignored'),'jump (both feet leave floor): never rewarded, flagged jump-ignored ['+t.join(',')+']'); }
{ // slow squat down and up
  const fr2=[]; for(let i=0;i<4*fps;i++){ const t=i/fps, b=Math.sin(Math.min(1,t/2)*Math.PI/2)*.6; fr2.push({t,pts:makePose({...base,stance:1.6,bend:b})}); } const {ev}=run(fr2); ok(!types(ev).includes('stomp'),'slow squat: no stomp'); }
{ // stomp that does not hold (player keeps moving) -> aborted
  const f=stompFrames(base); const w=[...f.filter(x=>x.t<1.4)]; for(let i=0;i<40;i++){ const t=1.4+i/fps; w.push({t,pts:walkPose(base,t,1.4)}); } const {ev}=run(w); ok(!types(ev).includes('stomp'),'stomp followed by walking away: no confirmed stomp ['+types(ev).join(',')+']'); }

// ---- cooldown / rate limit ----
{ const rec=new StompRecognizer(); const one=stompFrames(base); const all=[]; for(let r=0;r<2;r++) for(const f of one) all.push({t:f.t+r*3.1,pts:f.pts});
  const {ev}=run(all,rec); ok(types(ev).filter(x=>x==='stomp').length===2,'two stomps 3.1 s apart both register (cooldown 2.5 s)');
  const rec2=new StompRecognizer(); const all2=[]; for(let r=0;r<2;r++) for(const f of one) all2.push({t:f.t+r*1.9,pts:f.pts}); const e2=run(all2,rec2).ev; ok(types(e2).filter(x=>x==='stomp').length===1,'a second stomp 1.9 s later is ignored (cooldown after each stomp)'); }
{ /* test-only override: default is 8/min (body.js); 3 here so the cap is reached fast */ const rec=new StompRecognizer({cooldownMs:0,abortCooldownMs:0,maxStompsPerMin:3}); const one=stompFrames(base,{dur:2.2}); const all=[]; for(let r=0;r<6;r++) for(const f of one) all.push({t:f.t+r*2.3,pts:f.pts});
  const {ev}=run(all,rec); ok(types(ev).filter(x=>x==='stomp').length<=3&&types(ev).includes('rate-limited'),'rate limit: at most '+3+'/min then rate-limited ('+types(ev).filter(x=>x==='stomp').length+' stomps)'); }
{ const rec=new StompRecognizer(); rec.paused=true; const {ev}=run(stompFrames(base),rec); ok(!types(ev).includes('stomp'),'paused (rest prompt) -> no stomp'); }

// ---- clear space ----
{ ok(spaceCheck(makePose(base),A).ok,'clear-space check passes for a full body in frame'); const cut=makePose({...base,floor:1.02}); const r=spaceCheck(cut,A);
  ok(!r.ok&&r.reasons.length>0,'feet out of frame -> not ok: "'+r.reasons.join('; ')+'"'); const hid=makePose(base); hid[27].v=.1; ok(!spaceCheck(hid,A).ok,'ankle not visible -> not ok'); ok(!spaceCheck(null).ok,'no body -> not ok'); }
// ---- rest prompt ----
{ const r=new RestTimer(5*60000,15000); r.begin(0); ok(r.update(1000)==='active'&&r.update(299000)==='active','rest: active before 5 min'); ok(r.update(300000)==='rest'&&r.restLeftMs(305000)===10000,'rest prompt appears at 5 min for 15 s'); ok(r.update(316000)==='active','rest ends, active again'); ok(r.update(300000+15000+299000)==='active'&&r.update(316000+300000)==='rest','rest prompt repeats every 5 min'); }
// ---- motion quality ----
{ const q=(fn)=>{ const m=new MotionQuality(); let v=1; for(let i=0;i<5*fps;i++) v=m.push(fn(i/fps),i/fps,A); return v; }; const r=rng(9);
  const calm=q(t=>makePose(base,{sway:Math.sin(t*1.9)*.01,wrists:undefined})); const jit=q(t=>makePose(base,{sway:Math.sin(t*20)*.02,wrists:[{x:.2+Math.sin(t*19)*.1,y:.5+Math.cos(t*17)*.1},{x:.3+Math.sin(t*23)*.1,y:.5}]}));
  ok(calm>.8,'slow sway -> high calm score ('+calm.toFixed(2)+')'); ok(jit<.4,'jerky flailing -> low score ('+jit.toFixed(2)+')'); ok(calm>jit,'calm > jerky'); }

// ---- world: anchoring, one at a time, slow rise, fade, slow push only ----
{ const w=new World(); const ev={x:.5,y:.8,k:.4,kind:'shield'}; const it=w.spawn(ev,0);
  ok(Math.abs(it.x-.5)<1e-9&&it.baseY>=.8&&it.baseY<=.85,'rock anchored at the landing floor spot (shield nudged slightly toward camera)');
  ok(w.rippleAmount(it,.2)>=0&&w.riseAmount(it,.2)===0,'ripple ring first (t=.2 s), rock has not started rising');
  ok(w.riseAmount(it,RISE_DELAY_S+.05)<.05&&w.riseAmount(it,RISE_DELAY_S+RISE_S/2)>.4&&w.riseAmount(it,RISE_DELAY_S+RISE_S/2)<.6&&w.riseAmount(it,RISE_DELAY_S+RISE_S+.1)===1,'~1 s eased rise after the ripple, then settles at full height');
  const it2=w.spawn({x:.3,y:.85,k:.4,kind:'slab'},5); ok(it.fadeAt===5&&!it2.fadeAt,'second stomp: the first rock starts a soft fade, only one active rock');
  w.step(.033,5+1.3,[]); ok(w.items.length===1,'faded rock removed after '+1.2+' s'); w.clear(10); w.step(.033,12,[]); ok(w.items.length===0,'clear() fades everything out'); }
{ const w=new World(); const it=w.spawn({x:.5,y:.8,k:.4,kind:'slab'},0); const T=3; let t=T; const x0=it.x;
  // wrist inside the rock pushing slowly (0.2 m/s) for 4 s
  const k=it.k, vx=.2*k; for(let i=0;i<120;i++){ t+=1/30; const b=w.box(it,t); w.step(1/30,t,[{x:it.x,y:it.baseY-.02,vx}],A); } const moved=it.x-x0, mps=Math.abs(it.vx)/k;
  ok(moved>.005&&moved<.08,'slow push moves the rock a little ('+(moved/k).toFixed(2)+' m in 4 s)'); ok(mps<=.1501,'rock speed capped (<=0.15 m/s): '+mps.toFixed(3)+' m/s');
  const w2=new World(); const i2=w2.spawn({x:.5,y:.8,k:.4,kind:'slab'},0); let tt=3; for(let i=0;i<60;i++){ tt+=1/30; w2.step(1/30,tt,[{x:i2.x,y:i2.baseY-.02,vx:3*i2.k}],A); } ok(Math.abs(i2.x-.5)<1e-9,'fast flick (3 m/s) does not move it: nothing flies');
  const w3=new World(); const i3=w3.spawn({x:.5,y:.8,k:.4,kind:'slab'},0); for(let i=0;i<60;i++){ tt+=1/30; w3.step(1/30,tt,[{x:.9,y:.2,vx:.2*i3.k}],A); } ok(i3.x===.5,'wrist outside the rock does nothing'); 
  // after push stops it settles
  for(let i=0;i<90;i++){ t+=1/30; w.step(1/30,t,[],A); } const xs=it.x; for(let i=0;i<30;i++){ t+=1/30; w.step(1/30,t,[],A); } ok(Math.abs(it.x-xs)<.002,'rock settles and stays put after the push'); }
// ---- depth ordering / hide behind shield ----
{ const w=new World(); const it=w.spawn({x:.5,y:.8,k:.4,kind:'shield'},0); const by=it.baseY;
  ok(w.playerInFront(it,by-.05)===false,'player standing farther up the floor (feet above rock base): rock covers player (player hidden behind it)');
  ok(w.playerInFront(it,by-.01)===false,'hysteresis: tiny change does not flip');
  ok(w.playerInFront(it,by+.03)===true,'player steps forward (feet below rock base): player covers the rock'); ok(w.playerInFront(it,by+.005)===true,'hysteresis holds in front'); ok(w.playerInFront(it,by-.03)===false,'stepping back behind it flips again'); }
// ---- pool ----
{ const w=new World(); w.setPool({x:.5,y:.85,rxm:1.0,k:.4}); const m=w.spawn({x:.5,y:.85,k:.4,kind:'slab'},0); ok(m.kind==='boat'&&m.inPool,'stomp inside virtual pool -> boat rises');
  const s=w.spawn({x:.5,y:.85,k:.4,kind:'shield'},9); ok(s.kind==='shield'&&s.inPool,'wide-low stomp inside pool -> rock shield rises out of the water');
  const o=w.spawn({x:.02,y:.85,k:.4,kind:'slab'},20); ok(o.kind==='slab'&&!o.inPool,'stomp outside pool -> normal slab'); }
// ---- misc ----
ok(Object.keys(KINDS).join()==='slab,shield,boat','exactly 3 effects with neutral names: '+Object.keys(KINDS).join(', '));
ok(net===0,'no network calls made by logic/tests');
console.log(`\nstomp: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
