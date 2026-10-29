const AUTO_START_SEC=3; // hands-free: starts by itself after the camera sees a clear space for 3 s
/* app.js — camera/sim glue (final merged build). PLACEHOLDER / PROPOSAL – not canon. Everything is Simulated.
   Network: ONLY the MediaPipe library + models (pose; hands only if you turn the flow layer on) are loaded from a CDN when you press "camera". No uploads, no recording, no analytics.
   If the CDN/camera is unavailable the page works offline in "sim" mode (keyboard-driven fake body). */
import {StompRecognizer,MotionQuality,RestTimer,World,spaceCheck,measure,framesPerMetre} from './body.js?v=4';
import {drawPool,drawRipple,drawRock,drawBoat,drawFlow,drawPerson,drawSimScene,horizonY} from './render.js';
import {Engine as FlowEngine,STRINGS,Grade} from './flow.js';
import {FlowSim} from './simflow.js';
import {DEFAULTS} from './config.js';
import {makePose,standPose,walkPose,stompFrames,jumpFrames} from './fixtures.js';
const VISION='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const HAND_MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const $=id=>document.getElementById(id), view=$('view'), ctx=view.getContext('2d');
const mk=n=>{ const c=document.createElement('canvas'); return c; };
const src=mk(), sx=src.getContext('2d'), pc=mk(), pctx=pc.getContext('2d'), mc=mk(), mctx=mc.getContext('2d');
const S={mode:'sim',started:false,okSince:null,pts:null,prev:null,flow:DEFAULTS.flowLayer,str:DEFAULTS.string,hud:DEFAULTS.hud,skel:false,fsim:new FlowSim(),fst:null,fe:null,handsRes:null,hands:null,hn:0,fq:0,mp:null,fs:null,auto:false,hold:false,clapT:-1,tilt:.85,stiff:false,tog:0,drive:0,video:null,landmarker:null,maskOK:false,maskFresh:0,maskFails:0,
  walk:false,seq:null,sim:{cx:.5,floor:.84,stance:1,bend:0},lastT:0,hand:null,rest:null,debug:new URLSearchParams(location.search).has('debug')};
// camera-friendly thresholds (real phones are noisier than the sim): softer stomp, shorter hold
const rec=new StompRecognizer({impactAnkleVel:1.4,impactLift:.12,impactHipVel:.2,impactHipDrop:.015,minStance:.45,landedVel:1.4,calmAnkle:1.2,calmHip:1.2,holdMs:150,setTimeoutMs:1200}), quality=new MotionQuality(), world=new World(), rest=new RestTimer(DEFAULTS.restEveryMs,DEFAULTS.restMs), feng=new FlowEngine({seed:11});
const q=new URLSearchParams(location.search); if(q.get('rest')) rest.everyMs=+q.get('rest')*1000; // test hook
let W=540,H=960,aspect=W/H; function size(w,h){ W=w;H=h; for(const c of [view,src,pc,mc]){ if(c!==mc){c.width=w;c.height=h;} } aspect=w/h; world.aspect=aspect; }
size(540,960);
const status=t=>$('status').textContent=t;
const simHp=floor=>Math.max(.2,1.15*(floor-.38));
const simBase=()=>({cx:S.sim.cx,floor:S.sim.floor,Hp:simHp(S.sim.floor),aspect,stance:S.sim.stance,bend:S.sim.bend});
const lerpPts=(a,b,u)=>a.map((p,i)=>({x:p.x+(b[i].x-p.x)*u,y:p.y+(b[i].y-p.y)*u,z:0,v:1}));
/* ---------- sim body ---------- */
function simPose(now){ const base=simBase(); const idle=S.walk?walkPose(base,now,1):standPose(base,now);
  if(!S.seq) return idle; const el=now-S.seq.t0, fr=S.seq.frames, i=Math.min(fr.length-1,Math.floor(el*30)); if(el>fr[fr.length-1].t+.02){ S.seq=null; return idle; }
  let pts=fr[i].pts; const end=fr[fr.length-1].t, rin=Math.min(1,el/.4), rout=Math.min(1,(end-el)/.4); pts=lerpPts(idle,pts,Math.min(rin,rout)); return pts; }
function startSeq(kind,now){ if(S.seq) return; const b=simBase(); let fr;
  if(kind==='stomp') fr=stompFrames(b,{noise:0}); else if(kind==='wide') fr=stompFrames({...b,stance:2.0,bend:.5},{noise:0,lift:.08*b.Hp,hipDrop:.045*b.Hp}); else fr=jumpFrames(b);
  S.seq={frames:fr,t0:now,kind}; }
/* ---------- camera + MediaPipe (CDN, optional) ---------- */
async function startCamera(){ try{ status('asking for camera…'); const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    const v=document.createElement('video'); v.playsInline=true; v.muted=true; v.srcObject=stream; await v.play(); S.video=v; S.mode='cam'; view.classList.add('mirror'); $('keys').style.display='none'; size(v.videoWidth||640,v.videoHeight||480); rec.reset(); S.pts=null; feng.reset();
    status('camera on · loading pose model from CDN…'); loadPose(); }
  catch(e){ console.warn(e); status('camera unavailable ('+(e.name||'error')+') — sim mode'); toSim(); } }
async function loadPose(){ try{ const m=await import(VISION+'/vision_bundle.mjs'); const fs=await m.FilesetResolver.forVisionTasks(VISION+'/wasm'); S.mp=m; S.fs=fs;
    const o=d=>({baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:true,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
    try{ S.landmarker=await m.PoseLandmarker.createFromOptions(fs,o('GPU')); }catch{ S.landmarker=await m.PoseLandmarker.createFromOptions(fs,o('CPU')); }
    status('camera + pose on (on-device) · mask: waiting'); ensureHands(); }
  catch(e){ console.warn('pose load failed',e); status('pose model unavailable (offline?) — switched to sim mode'); stopCamera(); toSim(); } }
/* hands: only fetched when the optional flow layer is on in camera mode (fingertips refine the chain + palm angle; pose-only works without it) */
async function ensureHands(){ if(S.hands||S.handsLoading||!S.mp||!S.flow||S.mode!=='cam') return; S.handsLoading=true;
  try{ const o=d=>({baseOptions:{modelAssetPath:HAND_MODEL,delegate:d},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4});
    try{ S.hands=await S.mp.HandLandmarker.createFromOptions(S.fs,o('GPU')); }catch{ S.hands=await S.mp.HandLandmarker.createFromOptions(S.fs,o('CPU')); } }
  catch(e){ console.warn('hands optional failed',e); } S.handsLoading=false; }
function stopCamera(){ if(S.video){ S.video.srcObject?.getTracks().forEach(t=>t.stop()); S.video=null; } S.landmarker=null; S.hands=null; S.handsRes=null; S.mp=null; S.fs=null; }
function toSim(){ stopCamera(); feng.reset(); S.mode='sim'; view.classList.remove('mirror'); size(540,960); rec.reset(); S.pts=null; $('keys').style.display='block'; if(!S.started) status('sim mode (no camera) · simulated body'); }
let lastVT=-1;
function camStep(now){ const v=S.video; if(!v||!v.videoWidth) return null; if(v.videoWidth!==W||v.videoHeight!==H) size(v.videoWidth,v.videoHeight); sx.drawImage(v,0,0,W,H);
  if(!S.landmarker||v.currentTime===lastVT) return S.pts; lastVT=v.currentTime;
  try{ const r=S.landmarker.detectForVideo(v,performance.now()); const lm=r.landmarks?.[0];
    const mm=r.segmentationMasks?.[0]; if(mm){ try{ const w=mm.width,h=mm.height,f=mm.getAsFloat32Array(); if(mc.width!==w||mc.height!==h){mc.width=w;mc.height=h;} const id=mctx.createImageData(w,h);
        for(let i=0;i<f.length;i++){ const u=Math.max(0,Math.min(1,(f[i]-.35)/.3)); id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=255; id.data[i*4+3]=u*255; } mctx.putImageData(id,0,0); S.maskOK=true; S.maskFresh=now; S.maskFails=0; }
      catch(e){ if(++S.maskFails>5) S.maskOK=false; } finally{ mm.close?.(); } }
    if(S.flow&&S.hands&&(S.hn++%2===0)){ try{ const hr=S.hands.detectForVideo(v,performance.now()); S.handsRes=(hr.landmarks||[]).map(l=>({pts:l.map(p=>({x:fx(p.x*W),y:p.y*H,z:p.z*W}))})); }catch(e){} }
    return lm?lm.map(p=>({x:p.x,y:p.y,z:p.z,v:p.visibility??1})):null; }
  catch(e){ console.warn('detect failed',e); return null; } }
/* ---------- main loop ---------- */
function frame(ts){ const now=ts/1000, dt=Math.min(.1,now-(S.lastT||now)); S.lastT=now; requestAnimationFrame(frame);
  let pts=null; if(S.mode==='sim'){ pts=simPose(now); if(S.flow) pts=simFlow(pts,now,dt); drawSimScene(sx,W,H,pts,now); } else pts=camStep(now);
  S.pts=pts; update(pts,now,dt); compose(now); hud(now); }
function update(pts,now,dt){
  if(!pts){ if(!S.started&&S.mode==='cam') $('hint').textContent='Camera on. Back up until your whole body is in view.'; if(S.flow&&S.started) S.fst=feng.update({t:now,pts:null}); $('hint').textContent=S.started?'':''; return; }
  const sc=spaceCheck(pts,aspect);
  if(!S.started){ if(sc.ok){ S.okSince??=now; } else S.okSince=null;
    const left=S.okSince!=null?Math.max(0,AUTO_START_SEC-(now-S.okSince)):null;
    $('hint').textContent=$('gateMsg').textContent=sc.ok?('Space looks clear. Hold still, starting in '+Math.ceil(left)+'…'):('Step back until your whole body fits: '+sc.reasons.join(' · '));
    if(left===0) beginPlay(); return; }
  const rs=rest.update(now*1000); rec.paused=rs==='rest'; $('rest').classList.toggle('show',rs==='rest'); if(rs==='rest') $('restLeft').textContent=Math.ceil(rest.restLeftMs(now*1000)/1000)+' s';
  // pushers: wrists with velocity (frame-widths/s)
  const push=[]; if(S.prev&&dt>0) for(const i of [15,16]) push.push({x:pts[i].x,y:pts[i].y,vx:(pts[i].x-S.prev[i].x)/dt});
  S.prev=pts.map(p=>({...p}));
  const evs=rs==='rest'?[]:rec.feed(pts,now,aspect); quality.push(pts,now,aspect);
  for(const e of evs){ if(e.type==='stomp'){ const it=world.spawn(e,now); window.labEvent?.('body-bend:stomp:'+it.kind); window.__lastEvent={type:it.kind,t:now}; Grade.report(it.kind==='shield'?'shield':'stomp'); }
    else if(e.type==='jump-ignored') flash('jump ignored — stomp gently'); }
  world.step(dt,now,push,aspect);
  if(S.flow&&rs!=='rest') flowStep(pts,now,dt); }
let flashT=0; function flash(t){ $('hint').textContent=t; flashT=performance.now()+1800; }
function feetY(pts){ return Math.max(...[27,28,29,30,31,32].map(i=>pts[i].y)); }
function compose(now){ ctx.drawImage(src,0,0);
  drawPool(ctx,world.pool,world,W,H,now);
  const items=world.items.slice().sort((a,b)=>a.baseY-b.baseY); let cutReady=false;
  for(const it of items){ drawRipple(ctx,it,world.rippleAmount(it,now),W,H); if(it.kind==='boat') drawBoat(ctx,it,world,now,W,H); else drawRock(ctx,it,world,now,W,H);
    // HIDE-BEHIND: if the player's feet are nearer the camera than the rock base, re-draw the player's body mask over the rock.
    if(S.pts&&world.playerInFront(it,feetY(S.pts))){ if(!cutReady){ buildCutout(); cutReady=true; } ctx.drawImage(pc,0,0); } }
  if(S.flow&&S.fst) drawFlow(ctx,S.fst,W,S.mode==='cam',{string:S.str>=0});
  if(S.skel&&S.pts){ ctx.save(); ctx.strokeStyle='rgba(255,210,127,.5)'; ctx.lineWidth=2; for(const [a,b] of [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]]){ ctx.beginPath(); ctx.moveTo(S.pts[a].x*W,S.pts[a].y*H); ctx.lineTo(S.pts[b].x*W,S.pts[b].y*H); ctx.stroke(); } ctx.restore(); } }
/* player cutout = camera pixels where the person is. Real segmentation mask when available, else a rough pose-capsule silhouette. */
function buildCutout(){ pctx.globalCompositeOperation='source-over'; pctx.clearRect(0,0,W,H);
  if(S.mode==='cam'&&S.maskOK) pctx.drawImage(mc,0,0,W,H); else drawPerson(pctx,S.pts,W,H,'#fff','#fff');
  pctx.globalCompositeOperation='source-in'; pctx.drawImage(src,0,0); pctx.globalCompositeOperation='source-over'; }
function hud(now){ const t=now; flowHud();
  if(performance.now()>flashT) $('hint').textContent=S.started?rec.hint(t):''; $('mfill').style.transform=`scaleX(${Math.max(.03,quality.q).toFixed(3)})`;
  if(S.started&&S.mode==='cam'&&S.landmarker) status(`on-device · pose on · player mask: ${S.maskOK?'segmentation':'rough silhouette fallback'}`); else if(S.started&&S.mode==='sim') status('sim mode · simulated body'); }
/* ---------- controls ---------- */
function setPool(on){ $('bPool').classList.toggle('on',on); if(!on){ world.setPool(null); return; } const p=S.pts; let x=.5,y=.8,k=.4;
  if(p){ const m=measure(p,aspect); x=(p[27].x+p[28].x)/2; y=m.floorY+.02; k=framesPerMetre(m.swNorm); } world.setPool({x,y,rxm:1.4,k}); }
$('bPool').onclick=()=>setPool(!world.pool);
$('bFlow').onclick=()=>setFlow(!S.flow);
$('bStr').onclick=()=>{ setString(S.str>=STRINGS.length-1?-1:S.str+1); };
$('bHud').onclick=()=>setHud(!S.hud);
function setFlow(on){ S.flow=on; feng.reset(); S.fst=null; S.handsRes=null; $('bFlow').classList.toggle('on',on); $('bFlow').textContent='flow: '+(on?'on':'off'); $('fmeter').classList.toggle('show',on); if(!on) setString(-1); else ensureHands(); }
function setString(i){ if(i>=0&&!S.flow){ setFlow(true); } S.str=i; if(i>=0) feng.setString(i); $('bStr').classList.toggle('on',i>=0); $('bStr').textContent='string: '+(i>=0?STRINGS[i].id:'off'); }
function setHud(on){ S.hud=on; document.body.classList.toggle('collapsed',!on); $('bHud').textContent=on?'hud ▾':'hud ▴'; }
/* ---------- optional flow layer ---------- */
const fx=x=>S.mode==='cam'?W-x:x;   // flow engine uses selfie-mirrored x (left hand on the left); the canvas itself is mirrored by CSS in camera mode
function flowPts(p){ return p.map(q=>({x:fx(q.x*W),y:q.y*H,z:(q.z||0)*W,v:q.v??1})); }
function flowStep(pts,now,dt){ const st=S.fst=feng.update({t:now,pts:flowPts(pts),hands:S.handsRes});
  for(const e of st.events) if(e==='clap-release'||e==='charge-release') Grade.report('charge');
  if(st.quality>.6){ S.fq+=dt; if(S.fq>4) Grade.report('flow'); } else S.fq=Math.max(0,S.fq-dt); }
function simFlow(pts,now,dt){ const clapping=S.clapT>=0; let tog=S.hold?1:0;
  if(clapping){ S.clapT+=dt; const c=S.clapT; tog=c<.25?1-c/.25:c<.4?(c-.25)/.15:1; if(c>.7) S.clapT=-1; }
  S.tog+=(tog-S.tog)*(1-Math.exp(-dt/(clapping?.04:.25)));
  S.drive+=((S.auto?Math.sin(2*Math.PI*.45*now):0)-S.drive)*(1-Math.exp(-dt/.25)); S.fsim.body.stiff=S.stiff;
  return S.fsim.apply(pts,aspect,dt,{drive:S.drive,reach:.5,together:S.tog,tilt:S.tilt},measure(pts,aspect)); }
function flowHud(){ const st=S.fst; if(!S.flow||!st) return; const q=Math.round(st.quality*100), c=Math.round(st.charge*100);
  $('ffill').style.transform=`scaleX(${Math.max(0,st.quality).toFixed(3)})`; $('cfill').style.transform=`scaleX(${st.charge.toFixed(3)})`;
  $('ftxt').textContent='flow (Simulated) '+q+'%'+(st.flow.resting?' · resting':''); $('ctxt').textContent='charge (Simulated)'+(c?' '+c+'%':''); }
$('bClr').onclick=()=>world.clear(performance.now()/1000);
$('bCam').onclick=()=>startCamera(); $('bSim').onclick=()=>toSim();
$('bGateCam').onclick=()=>{ $('gate').classList.remove('show'); startCamera(); }; $('bGateSim').onclick=()=>toSim();
function beginPlay(){ if(S.started) return; S.started=true; $('gate').classList.remove('show'); rest.begin(performance.now()); rec.reset(); }
$('bStart').onclick=beginPlay;
addEventListener('keydown',e=>{ if(S.mode!=='sim') return; const k=e.key, now=performance.now()/1000; const st=.02;
  if(k==='ArrowLeft') S.sim.cx=Math.max(.15,S.sim.cx-st); else if(k==='ArrowRight') S.sim.cx=Math.min(.85,S.sim.cx+st);
  else if(k==='ArrowUp') S.sim.floor=Math.max(.55,S.sim.floor-st); else if(k==='ArrowDown') S.sim.floor=Math.min(.94,S.sim.floor+st);
  else if(k===' '){ e.preventDefault(); startSeq(e.shiftKey?'wide':'stomp',now); } else if(k==='w'||k==='W') S.walk=!S.walk; else if(k==='j'||k==='J') startSeq('jump',now);
  else if(k==='p'||k==='P') setPool(!world.pool); else if(k==='g'||k==='G') $('bStr').click(); else if(k==='l'||k==='L') $('bFlow').click(); else if(k==='f'||k==='F') S.auto=!S.auto; else if(k==='h'||k==='H') S.hold=!S.hold; else if(k==='c'||k==='C'){ if(S.clapT<0) S.clapT=0; } else if(k==='t'||k==='T') S.tilt=S.tilt>.5?.15:.85; else if(k==='x'||k==='X') S.stiff=!S.stiff; else if(k==='k'||k==='K') S.skel=!S.skel; else if(k==='r'||k==='R') $('bClr').click(); });
window.__bb={S,world,rec,rest,quality,feng,startSeq,setPool,setFlow,setString,setHud,now:()=>performance.now()/1000}; // test hook only
$('keys').style.display='block'; status('sim mode (no camera) · simulated body'); requestAnimationFrame(frame);
