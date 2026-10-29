/* app.js — camera/sim glue. PLACEHOLDER / PROPOSAL – not canon. Everything is Simulated.
   Network: ONLY the MediaPipe pose library + model are loaded from a CDN when you press "camera". No uploads, no recording, no analytics.
   If the CDN/camera is unavailable the page works offline in "sim" mode (keyboard-driven fake body). */
import {StompRecognizer,MotionQuality,RestTimer,World,spaceCheck,measure,framesPerMetre} from './body.js';
import {drawPool,drawRipple,drawRock,drawBoat,drawString,drawPerson,drawSimScene,horizonY} from './render.js';
import {makePose,standPose,walkPose,stompFrames,jumpFrames} from './fixtures.js';
const VISION='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const $=id=>document.getElementById(id), view=$('view'), ctx=view.getContext('2d');
const mk=n=>{ const c=document.createElement('canvas'); return c; };
const src=mk(), sx=src.getContext('2d'), pc=mk(), pctx=pc.getContext('2d'), mc=mk(), mctx=mc.getContext('2d');
const S={mode:'sim',started:false,okSince:null,pts:null,prev:null,string:false,skel:false,video:null,landmarker:null,maskOK:false,maskFresh:0,maskFails:0,
  walk:false,seq:null,sim:{cx:.5,floor:.84,stance:1,bend:0},lastT:0,hand:null,rest:null,debug:new URLSearchParams(location.search).has('debug')};
const rec=new StompRecognizer(), quality=new MotionQuality(), world=new World(), rest=new RestTimer(5*60000,15000);
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
    const v=document.createElement('video'); v.playsInline=true; v.muted=true; v.srcObject=stream; await v.play(); S.video=v; S.mode='cam'; view.classList.add('mirror'); size(v.videoWidth||640,v.videoHeight||480); rec.reset(); S.pts=null;
    status('camera on · loading pose model from CDN…'); loadPose(); }
  catch(e){ console.warn(e); status('camera unavailable ('+(e.name||'error')+') — sim mode'); toSim(); } }
async function loadPose(){ try{ const m=await import(VISION+'/vision_bundle.mjs'); const fs=await m.FilesetResolver.forVisionTasks(VISION+'/wasm');
    const o=d=>({baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:true,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
    try{ S.landmarker=await m.PoseLandmarker.createFromOptions(fs,o('GPU')); }catch{ S.landmarker=await m.PoseLandmarker.createFromOptions(fs,o('CPU')); }
    status('camera + pose on (on-device) · mask: waiting'); }
  catch(e){ console.warn('pose load failed',e); status('pose model unavailable (offline?) — switched to sim mode'); stopCamera(); toSim(); } }
function stopCamera(){ if(S.video){ S.video.srcObject?.getTracks().forEach(t=>t.stop()); S.video=null; } S.landmarker=null; }
function toSim(){ stopCamera(); S.mode='sim'; view.classList.remove('mirror'); size(540,960); rec.reset(); S.pts=null; $('keys').style.display='block'; if(!S.started) status('sim mode (no camera) · simulated body'); }
let lastVT=-1;
function camStep(now){ const v=S.video; if(!v||!v.videoWidth) return null; if(v.videoWidth!==W||v.videoHeight!==H) size(v.videoWidth,v.videoHeight); sx.drawImage(v,0,0,W,H);
  if(!S.landmarker||v.currentTime===lastVT) return S.pts; lastVT=v.currentTime;
  try{ const r=S.landmarker.detectForVideo(v,performance.now()); const lm=r.landmarks?.[0];
    const mm=r.segmentationMasks?.[0]; if(mm){ try{ const w=mm.width,h=mm.height,f=mm.getAsFloat32Array(); if(mc.width!==w||mc.height!==h){mc.width=w;mc.height=h;} const id=mctx.createImageData(w,h);
        for(let i=0;i<f.length;i++){ const u=Math.max(0,Math.min(1,(f[i]-.35)/.3)); id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=255; id.data[i*4+3]=u*255; } mctx.putImageData(id,0,0); S.maskOK=true; S.maskFresh=now; S.maskFails=0; }
      catch(e){ if(++S.maskFails>5) S.maskOK=false; } finally{ mm.close?.(); } }
    return lm?lm.map(p=>({x:p.x,y:p.y,z:p.z,v:p.visibility??1})):null; }
  catch(e){ console.warn('detect failed',e); return null; } }
/* ---------- main loop ---------- */
function frame(ts){ const now=ts/1000, dt=Math.min(.1,now-(S.lastT||now)); S.lastT=now; requestAnimationFrame(frame);
  let pts=null; if(S.mode==='sim'){ pts=simPose(now); drawSimScene(sx,W,H,pts,now); } else pts=camStep(now);
  S.pts=pts; update(pts,now,dt); compose(now); hud(now); }
function update(pts,now,dt){
  if(!pts){ $('hint').textContent=S.started?'':''; return; }
  const sc=spaceCheck(pts,aspect);
  if(!S.started){ $('gateMsg').textContent=sc.ok?'':sc.reasons.join(' · '); if(sc.ok){ S.okSince??=now; } else S.okSince=null; $('bStart').disabled=!(S.okSince!=null&&now-S.okSince>=1.5); return; }
  const rs=rest.update(now*1000); rec.paused=rs==='rest'; $('rest').classList.toggle('show',rs==='rest'); if(rs==='rest') $('restLeft').textContent=Math.ceil(rest.restLeftMs(now*1000)/1000)+' s';
  // pushers: wrists with velocity (frame-widths/s)
  const push=[]; if(S.prev&&dt>0) for(const i of [15,16]) push.push({x:pts[i].x,y:pts[i].y,vx:(pts[i].x-S.prev[i].x)/dt});
  S.prev=pts.map(p=>({...p}));
  S.hand=(()=>{ if(!push.length) return null; return Math.abs(push[0].vx)>=Math.abs(push[1].vx)?15:16; })();
  const evs=rs==='rest'?[]:rec.feed(pts,now,aspect); quality.push(pts,now,aspect);
  for(const e of evs){ if(e.type==='stomp'){ const it=world.spawn(e,now); window.labEvent?.('body-bend:stomp:'+it.kind); window.__lastEvent={type:it.kind,t:now}; }
    else if(e.type==='jump-ignored') flash('jump ignored — stomp gently'); }
  world.step(dt,now,push,aspect); }
let flashT=0; function flash(t){ $('hint').textContent=t; flashT=performance.now()+1800; }
function feetY(pts){ return Math.max(...[27,28,29,30,31,32].map(i=>pts[i].y)); }
function compose(now){ ctx.drawImage(src,0,0);
  drawPool(ctx,world.pool,world,W,H,now);
  const items=world.items.slice().sort((a,b)=>a.baseY-b.baseY); let cutReady=false;
  for(const it of items){ drawRipple(ctx,it,world.rippleAmount(it,now),W,H); if(it.kind==='boat') drawBoat(ctx,it,world,now,W,H); else drawRock(ctx,it,world,now,W,H);
    // HIDE-BEHIND: if the player's feet are nearer the camera than the rock base, re-draw the player's body mask over the rock.
    if(S.pts&&world.playerInFront(it,feetY(S.pts))){ if(!cutReady){ buildCutout(); cutReady=true; } ctx.drawImage(pc,0,0); } }
  if(S.string&&S.pts) drawString(ctx,S.pts,W,H,S.hand);
  if(S.skel&&S.pts){ ctx.save(); ctx.strokeStyle='rgba(255,210,127,.5)'; ctx.lineWidth=2; for(const [a,b] of [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]]){ ctx.beginPath(); ctx.moveTo(S.pts[a].x*W,S.pts[a].y*H); ctx.lineTo(S.pts[b].x*W,S.pts[b].y*H); ctx.stroke(); } ctx.restore(); } }
/* player cutout = camera pixels where the person is. Real segmentation mask when available, else a rough pose-capsule silhouette. */
function buildCutout(){ pctx.globalCompositeOperation='source-over'; pctx.clearRect(0,0,W,H);
  if(S.mode==='cam'&&S.maskOK) pctx.drawImage(mc,0,0,W,H); else drawPerson(pctx,S.pts,W,H,'#fff','#fff');
  pctx.globalCompositeOperation='source-in'; pctx.drawImage(src,0,0); pctx.globalCompositeOperation='source-over'; }
function hud(now){ const t=now; if(performance.now()>flashT) $('hint').textContent=S.started?rec.hint(t):''; $('mfill').style.transform=`scaleX(${Math.max(.03,quality.q).toFixed(3)})`;
  if(S.started&&S.mode==='cam'&&S.landmarker) status(`on-device · pose on · player mask: ${S.maskOK?'segmentation':'rough silhouette fallback'}`); else if(S.started&&S.mode==='sim') status('sim mode · simulated body'); }
/* ---------- controls ---------- */
function setPool(on){ $('bPool').classList.toggle('on',on); if(!on){ world.setPool(null); return; } const p=S.pts; let x=.5,y=.8,k=.4;
  if(p){ const m=measure(p,aspect); x=(p[27].x+p[28].x)/2; y=m.floorY+.02; k=framesPerMetre(m.swNorm); } world.setPool({x,y,rxm:1.4,k}); }
$('bPool').onclick=()=>setPool(!world.pool);
$('bStr').onclick=()=>{ S.string=!S.string; $('bStr').classList.toggle('on',S.string); };
$('bClr').onclick=()=>world.clear(performance.now()/1000);
$('bCam').onclick=()=>startCamera(); $('bSim').onclick=()=>toSim();
$('bGateCam').onclick=()=>startCamera(); $('bGateSim').onclick=()=>toSim();
$('bStart').onclick=()=>{ S.started=true; $('gate').classList.remove('show'); rest.begin(performance.now()); rec.reset(); };
addEventListener('keydown',e=>{ if(S.mode!=='sim') return; const k=e.key, now=performance.now()/1000; const st=.02;
  if(k==='ArrowLeft') S.sim.cx=Math.max(.15,S.sim.cx-st); else if(k==='ArrowRight') S.sim.cx=Math.min(.85,S.sim.cx+st);
  else if(k==='ArrowUp') S.sim.floor=Math.max(.55,S.sim.floor-st); else if(k==='ArrowDown') S.sim.floor=Math.min(.94,S.sim.floor+st);
  else if(k===' '){ e.preventDefault(); startSeq(e.shiftKey?'wide':'stomp',now); } else if(k==='w'||k==='W') S.walk=!S.walk; else if(k==='j'||k==='J') startSeq('jump',now);
  else if(k==='p'||k==='P') setPool(!world.pool); else if(k==='g'||k==='G') $('bStr').click(); else if(k==='k'||k==='K') S.skel=!S.skel; else if(k==='r'||k==='R') $('bClr').click(); });
window.__bb={S,world,rec,rest,quality,startSeq,setPool,now:()=>performance.now()/1000}; // test hook only
$('keys').style.display='block'; status('sim mode (no camera) · simulated body'); requestAnimationFrame(frame);
