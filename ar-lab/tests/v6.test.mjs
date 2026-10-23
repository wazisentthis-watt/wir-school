import * as M from '../moves.js';
import * as K from '../keeper.js';
import * as C from '../charge.js';
let pass=0,tot=0; const ok=(c,msg)=>{ tot++; if(c) pass++; console.log((c?'PASS ':'FAIL ')+msg); };
const dt=1/30, ease=(a,b,u)=>a+(b-a)*Math.max(0,Math.min(1,u));
// ---- 1) keeper flame: every move shapes it, it never goes out ----
{ const keys=Object.keys(M.MOVE_INFO); const base=K.keeperShape(K.keeperNew(100,100)); let all=true;
  for(const k of keys){ const F=K.keeperNew(100,100); K.keeperFeed(F,k); const s=K.keeperShape(F);
    const diff=['size','height','flicker','swirl','lean','sparks','bright','y','weave'].some(q=>Math.abs(s[q]-base[q])>1e-3); if(!diff){ all=false; console.log('  no effect:',k); } }
  ok(all,`keeper: all ${keys.length} moves/states change the flame shape`);
  const F=K.keeperNew(); for(let i=0;i<40;i++){ K.keeperFeed(F,'curl'); K.keeperFeed(F,'palmDown'); K.keeperFeed(F,'shake'); for(let j=0;j<10;j++) K.keeperStep(F,{x:0,y:0},dt); }
  const s=K.keeperStep(F,{x:0,y:0},dt); ok(s.alive&&F.heat>=K.HEAT_FLOOR&&s.size>=.25,`keeper: 400 dim/snuff moves later flame still alive (heat ${F.heat.toFixed(2)}, size ${s.size.toFixed(2)})`);
  const G=K.keeperNew(); for(let i=0;i<300;i++) K.keeperStep(G,{x:0,y:0},dt); ok(K.keeperShape(G).alive,'keeper: 10 s idle, flame still alive');
  const H=K.keeperNew(0,0); for(let i=0;i<30;i++) K.keeperStep(H,{x:200,y:50},dt); ok(Math.abs(H.x-200)<2&&Math.abs(H.y-50)<2,'keeper: follows the anchor in front of the hands'); }
// ---- 2) finger ribbon: each fingertip moves its own control point, all above the hand ----
{ const p=M.synth(200,400,{n:[1,1,1,1,1]}); const r=K.fingerRibbon(p,null,dt,[1,1,1,1,1]); const top=Math.min(...[4,8,12,16,20].map(i=>p[i].y));
  ok(r.length===5&&r.every(q=>q.y<top),'ribbon: 5 control points, all float above the fingertips');
  const p2=M.synth(200,400,{n:[1,1,.2,1,1]}); const r2=K.fingerRibbon(p2,p,dt,[1,1,.2,1,1]);
  const moved=r2.map((q,i)=>Math.hypot(q.x-r[i].x,q.y-r[i].y)); ok(moved[2]>moved[0]*2&&moved[2]>moved[4]*2,`ribbon: curling the middle finger moves mostly the middle point (${moved.map(v=>v.toFixed(0)).join(',')})`); }
// ---- 3) palm-up: tolerance + tilt hint ----
{ const run=(tilt,T=1.6)=>{ const H={},cal=M.defaultCal(); const ev=new Set(); let hint=0;
    for(let t=0;t<.3;t+=dt) M.step(H,M.synth(200,400,{}),t,cal,dt);
    for(let t=0;t<T;t+=dt){ const r=M.step(H,M.synth(200,400,{tilt:ease(0,tilt,(t-.4)/.3)}),.3+t,cal,dt); r.ev.forEach(e=>ev.add(e.k)); if(r.state.tiltHint) hint=1; } return {ev:[...ev],hint}; };
  const a=run(.6); ok(a.ev.includes('palmUp'),'palmUp: fires at a slightly shallower tilt (0.6) than v5 needed');
  const b=run(.3); ok(!b.ev.includes('palmUp')&&b.hint,'palmUp: half-tilt (fingers toward camera) does not fire but shows "tilt palm toward you" hint'); }
// ---- 4) two-palm charge + early release ----
function pair(cx,y,theta,heelOff=.3,s=90,g='open'){ const L=M.synth(cx-heelOff*s,y,{s,roll:-theta}), R=M.synth(cx+heelOff*s,y,{s,roll:theta,flip:true}); return [{pts:L,scale:s,g},{pts:R,scale:s,g}]; }
function clap({hold=1.2,close=.15,thetaOpen=.6,thetaEnd=-.05,T=2.2}){ const S=C.chargeNew(); let start=null,rel=null,contact=null,maxLvl=0;
  for(let t=0;t<T;t+=dt){ const u=(t-hold)/close, th=ease(thetaOpen,thetaEnd,u), [a,b]=pair(300,400,th);
    const r=C.chargeStep(S,a,b,t,dt); maxLvl=Math.max(maxLvl,r.lvl); if(r.ev==='start'&&start==null) start=t; if(r.ev==='release'&&rel==null) rel={t,...r};
    if(contact==null&&r.gap<C.CH.CONTACT) contact=t; }
  return {start,rel,contact,maxLvl}; }
{ const r=clap({}); ok(r.start!=null&&r.start<.5,`charge: starts after holding the open two-palm bowl (t=${r.start?.toFixed(2)}s)`);
  ok(r.maxLvl>.4,`charge: grows while held (level ${r.maxLvl.toFixed(2)})`);
  ok(r.rel&&r.contact&&r.rel.t<r.contact,`charge: clap releases EARLY: release t=${r.rel?.t.toFixed(3)}s, hands meet t=${r.contact?.toFixed(3)}s, lead ${r.rel&&r.contact?((r.contact-r.rel.t)*1000).toFixed(0):'-'} ms`);
  const fast=clap({close:.08}); ok(fast.rel&&fast.contact&&fast.rel.t<fast.contact,`charge: very fast clap (80 ms) still releases before contact (lead ${fast.rel&&fast.contact?((fast.contact-fast.rel.t)*1000).toFixed(0):'-'} ms)`);
  const slow=clap({close:2.5,thetaEnd:.25,T:4}); ok(!slow.rel,'charge: slowly drifting the hands closer does NOT release');
  const early=clap({hold:.2}); ok(!early.rel,'charge: clapping before it is charged does not release (needs a real charge first)');
  { const S=C.chargeNew(); let st=null; for(let t=0;t<1.5;t+=dt){ const [a,b]=pair(300,400,.6,2.2); const r=C.chargeStep(S,a,b,t,dt); if(r.ev==='start') st=t; } ok(st==null,'charge: hands apart (heels not together) never charges'); }
  { const S=C.chargeNew(); let st=null; for(let t=0;t<1.5;t+=dt){ const [a,b]=pair(300,400,-.05,.3); const r=C.chargeStep(S,a,b,t,dt); if(r.ev==='start') st=t; } ok(st==null,'charge: palms already together (prayer) never charges'); }
  { let hit=0; for(let i=0;i<20;i++){ const S=C.chargeNew(); let rel=null,contact=null; for(let t=0;t<2.2;t+=dt){ const u=(t-1.1)/.15, th=ease(.6,-.05,u); const [a,b]=pair(300+(Math.random()-.5)*6,400,th+(Math.random()-.5)*.04); a.pts=a.pts.map(p=>({x:p.x+(Math.random()-.5)*4,y:p.y+(Math.random()-.5)*4}));
      const r=C.chargeStep(S,a,b,t,dt); if(r.ev==='release'&&rel==null) rel=t; if(contact==null&&r.gap<C.CH.CONTACT) contact=t; } if(rel!=null&&(contact==null||rel<=contact)) hit++; }
    ok(hit>=18,`charge: jitter robustness ${hit}/20 early releases`); } }
console.log(`${pass}/${tot} v6 checks passed`); if(pass<tot) process.exitCode=1;
// ---- 5) phone-video fixes: ignition hitbox, person guard, cup hysteresis, ember release ----
import * as A from '../aim.js';
{ let pass2=0; const T=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1; };
  const run=(o,hotF,secs)=>{ let ig=0,wn=0; for(let t=0;t<secs;t+=dt){ const r=A.aimStep(o,hotF(t),dt); if(r.ignite) ig++; if(r.warn) wn++; } return {ig,wn}; };
  const phone={box:{x:300,y:300,w:80,h:150}};
  T(run({...phone,box:{...phone.box}},()=>[{x:220,y:320,r:60}],2).ig===0,'ignite: big flame 80 px off the phone box (radius overlaps, center outside) does NOT light it');
  T(run({...phone,box:{...phone.box}},()=>[{x:340,y:350,r:20}],.15).ig===0,'ignite: brushing the box for 0.15 s does not light it (dwell)');
  T(run({...phone,box:{...phone.box}},()=>[{x:340,y:350,r:20}],.6).ig>0,'ignite: flame center on the box for 0.6 s lights it');
  const person=()=>({box:{x:50,y:50,w:330,h:800},safe:true});
  T(run(person(),t=>[{x:215,y:300,r:40,held:true},{x:220,y:500,r:30,held:true}],5).wn===0,'guard: keeper flame + cupped ember held in front of the body (selfie) for 5 s: no "not the person" warning');
  T(run(person(),t=>[{x:215,y:720,r:20}],3).wn===0,'guard: aimed fingertip flame low in the box (hands/lap, outside face/torso core): no warning');
  T(run(person(),t=>[{x:215,y:300,r:20}],.4).wn===0,'guard: aimed flame passing over the torso for 0.4 s: no warning (dwell)');
  T(run(person(),t=>[{x:215,y:300,r:20}],1).wn>0,'guard: aimed flame held on the face/torso for 1 s: warns (and never burns)');
  { const D={g:'open'}; const seq=['open','cup','cup','cup','open','open','cup','open']; let saw=false; for(const g of seq) if(A.poseDebounce(D,g)==='cup') saw=true; T(!saw,'cup hysteresis: 3-frame cup flickers while flat never register as cup'); }
  { const D={g:'open'}; for(let i=0;i<6;i++) A.poseDebounce(D,'cup'); const in6=D.g==='cup'; A.poseDebounce(D,'open'); A.poseDebounce(D,'open'); A.poseDebounce(D,'open'); const held=D.g==='cup'; for(let i=0;i<2;i++) A.poseDebounce(D,'open');
    T(in6&&held&&D.g==='open','cup hysteresis: needs 6 frames to enter, 4 to leave'); }
  T(!A.emberRelease(.2,'open',false),'ember: flick-open 0.2 s after cupping does NOT throw (no "Fireball!" while cupping)');
  T(A.emberRelease(.8,'open',false)&&!A.emberRelease(.8,'cup',true)&&!A.emberRelease(.8,'relaxed',false),'ember: only throws after 0.5 s cupped, on flick-open or a flick out of the cup');
}
