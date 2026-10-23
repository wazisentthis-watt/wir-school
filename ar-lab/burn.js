/* Scene burning: MediaPipe Object Detector (EfficientDet-Lite0, Apache-2.0 Google model) finds real things in the camera view.
   Fire (fingertip flame, ember ball, booms) that touches a detected object lights it: flames + smoke + a char decal
   anchored in the object's box coordinates (u,v), so the scorch follows the object as the camera moves.
   Char is remembered per label in localStorage. People are never burnable. Purely visual, nothing real is affected. */
import {FX,L,rnd,lightAt} from './fx.js';
import {E} from './elements.js';
import {aimStep} from './aim.js';
const MODEL='https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
const NEVER=/person|dog|cat|bird|horse|sheep|cow|bear|elephant|zebra|giraffe/;
export const B={maxFires:2,still:false,on:false,det:null,objs:[],last:0,status:'off',inject:null,lastSay:0};
let cv,cx,video,toScreen,say,charImg;
const mem=JSON.parse(localStorage.getItem('wirlab.char')||'{}');
const saveMem=()=>{ try{localStorage.setItem('wirlab.char',JSON.stringify(mem));}catch{} };
export async function init(vid,ts,sayFn,VISION){ video=vid; toScreen=ts; say=sayFn;
  cv=document.getElementById('char'); cx=cv.getContext('2d'); resize(); addEventListener('resize',resize);
  charImg=new Image(); charImg.src='assets/char_decal.png';
  try{ const v=await import(VISION+'/vision_bundle.mjs'); const fs=await v.FilesetResolver.forVisionTasks(VISION+'/wasm');
    const o=d=>({baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',scoreThreshold:.35,maxResults:6});
    try{ B.det=await v.ObjectDetector.createFromOptions(fs,o('GPU')); }catch{ B.det=await v.ObjectDetector.createFromOptions(fs,o('CPU')); }
    B.status='ready'; }catch(e){ console.warn('object detector failed',e); B.status='failed'; } }
function resize(){ if(!cv) return; cv.width=innerWidth; cv.height=innerHeight; }
function boxToScreen(bb){ const vw=video.videoWidth,vh=video.videoHeight; const a=toScreen({x:bb.originX/vw,y:bb.originY/vh}), b=toScreen({x:(bb.originX+bb.width)/vw,y:(bb.originY+bb.height)/vh});
  return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}; }
function iou(a,b){ const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)), y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)); const i=x*y; return i/(a.w*a.h+b.w*b.h-i); }
function detect(now){
  let dets=null;
  if(B.inject) dets=B.inject();
  else if(B.det&&video.videoWidth&&now-B.last>220){ B.last=now; try{ const r=B.det.detectForVideo(video,now); dets=r.detections.map(d=>({label:d.categories[0].categoryName,score:d.categories[0].score,box:boxToScreen(d.boundingBox)})); }catch{} }
  if(!dets) return;
  for(const d of dets){ let best=null,bs=0; for(const o of B.objs){ if(o.label!==d.label) continue; const s=iou(o.box,d.box)+(1-Math.min(1,Math.hypot(o.box.x+o.box.w/2-d.box.x-d.box.w/2,o.box.y+o.box.h/2-d.box.y-d.box.h/2)/Math.max(d.box.w,d.box.h))); if(s>bs){bs=s;best=o;} }
    if(best&&bs>.35){ const o=best, k=B.still?(iou(o.box,d.box)>.8?0:.15):.55; o.vx=((d.box.x-o.box.x))/Math.max(.05,(now-o.seenMs)/1000); o.vy=((d.box.y-o.box.y))/Math.max(.05,(now-o.seenMs)/1000);
      for(const p of ['x','y','w','h']) o.box[p]+=(d.box[p]-o.box[p])*(o.held?.85:k); o.seen=FX.t; o.seenMs=now; heldCheck(o); }
    else B.objs.push({label:d.label,box:{...d.box},seen:FX.t,seenMs:now,vx:0,vy:0,fire:0,chars:(mem[d.label]||[]).map(c=>({...c})),safe:NEVER.test(d.label)}); }
  B.objs=B.objs.filter(o=>FX.t-o.seen<2.5); }
/* real handheld objects: a detected box that overlaps a gripping hand is "held"; between detections the box rides on the palm */
B.palms=[];
function heldCheck(o){ if(o.safe){ o.held=null; return; } const b=o.box; let best=null;
  for(const p of B.palms){ if(!['cup','fist','relaxed','poke'].includes(p.g)) continue; const pad=p.s*.35;
    if(p.x>b.x-pad&&p.x<b.x+b.w+pad&&p.y>b.y-pad&&p.y<b.y+b.h+pad) best=p; }
  if(best){ if(!o.held) say?.(`Holding the ${o.label}: effects follow your hand`); o.held=best.id; o.hoff={x:b.x-best.x,y:b.y-best.y}; } else o.held=null; }
export function update(dt,now,active){
  if(!cv) return; cx.clearRect(0,0,cv.width,cv.height); if(!active&&!B.objs.some(o=>o.fire>0)) { if(!active) return; }
  detect(now);
  for(const o of B.objs){ const b=o.box;
    const hp=o.held!=null&&B.palms.find(p=>p.id===o.held);
    if(hp&&o.hoff){ b.x+=(hp.x+o.hoff.x-b.x)*.6; b.y+=(hp.y+o.hoff.y-b.y)*.6; o.seen=Math.max(o.seen,FX.t-1); }
    else if(FX.t-o.seen>.1&&FX.t-o.seen<1){ b.x+=o.vx*dt*.5; b.y+=o.vy*dt*.5; } // short extrapolation between detections
    if(o.held!=null&&!hp) o.held=null;
    // ignite from any fire hot-spot inside the box
    { const A=aimStep(o,E.hot,dt); if(A.warn&&FX.t-B.lastSay>3){ B.lastSay=FX.t; say(`Not the ${o.label}. Fire is never for living things.`); }
    const h=A.ignite; if(h&&!o.safe){
      const u=Math.min(1,Math.max(0,(h.x-b.x)/b.w)), v=Math.min(1,Math.max(0,(h.y-b.y)/b.h));
      const burning=B.objs.filter(q=>q.fire>0).length; if(o.fire<=0&&burning>=B.maxFires){ if(FX.t-B.lastSay>2){B.lastSay=FX.t; say(`${B.maxFires} fires already: let one burn out first`);} } else {
      if(o.fire<=0){ say(`The ${o.label} caught fire!`); E.onBurn?.(o.label); }
      o.fire=Math.min(2.5,o.fire+dt*2+.5*(o.fire<=0)); const near=o.chars.find(c=>Math.hypot(c.u-u,c.v-v)<.12);
      if(near) near.r=Math.min(.2,near.r+dt*.08); else if(o.chars.length<4) o.chars.push({u,v,r:.05,s:Math.random()}); } } }
    if(o.fire>0){ o.fire-=dt; const k=FX.Q;
      for(const c of o.chars){ c.r=Math.min(.2,c.r+dt*.005); const x=b.x+c.u*b.w, y=b.y+c.v*b.h, rr=c.r*Math.min(b.w,b.h);
        for(let i=0;i<3*k;i++) L.fire.spawn(x+rnd(-rr,rr)*.5,y+rnd(-rr,rr)*.3,rnd(-12,12),-rnd(70,150),{size:rnd(14,26),grow:.8,life:rnd(.3,.5),curl:1.2,a:.8});
        if(Math.random()<.12*k) L.smoke.spawn(x,y-rr,rnd(-15,15),-rnd(40,90),{c:[.5,.48,.46],a:.15,size:rnd(40,70),grow:1.6,life:rnd(1.2,2.2),curl:1.5});
        if(Math.random()<.1) L.spark.spawn(x,y,rnd(-150,150),-rnd(150,400),{c:[1,.7,.3],size:rnd(5,10),life:rnd(.4,.8),grav:300}); }
      lightAt(b.x+b.w/2,b.y+b.h/2,[1,.55,.2],2);
      if(o.fire<=0){ mem[o.label]=o.chars.map(c=>({u:+c.u.toFixed(3),v:+c.v.toFixed(3),r:+c.r.toFixed(3),s:c.s})); saveMem(); say(`Fire's out. The ${o.label} stays scorched.`); } }
    // draw char decal anchored to object box (follows it as the camera moves)
    for(const c of o.chars){ const x=b.x+c.u*b.w, y=b.y+c.v*b.h, rr=c.r*Math.min(b.w,b.h);
      cx.save(); cx.beginPath(); cx.rect(b.x,b.y,b.w,b.h); cx.clip(); cx.translate(x,y); cx.rotate(c.s*6.28); cx.globalAlpha=.42;
      if(charImg.complete&&charImg.naturalWidth) cx.drawImage(charImg,-rr,-rr,rr*2,rr*2);
      else { const g=cx.createRadialGradient(0,0,0,0,0,rr); g.addColorStop(0,'rgba(10,6,4,.9)'); g.addColorStop(.6,'rgba(40,20,8,.6)'); g.addColorStop(1,'rgba(60,30,10,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,rr,0,7); cx.fill(); }
      if(o.fire>0){ cx.globalCompositeOperation='lighter'; const g=cx.createRadialGradient(0,0,rr*.5,0,0,rr); g.addColorStop(0,'rgba(255,90,20,0)'); g.addColorStop(.8,'rgba(255,120,30,.5)'); g.addColorStop(1,'rgba(255,60,0,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,rr,0,7); cx.fill(); }
      cx.restore(); }
    const tgt=B.debug||o.fire>0||o.held!=null||(B.tip&&B.tip.x>b.x-30&&B.tip.x<b.x+b.w+30&&B.tip.y>b.y-30&&B.tip.y<b.y+b.h+30);
    if(tgt&&(active||B.still)){ cx.save(); cx.strokeStyle=o.safe?'rgba(127,255,212,.45)':o.fire>0?'rgba(255,170,80,.6)':'rgba(255,255,255,.35)'; cx.lineWidth=1.2; cx.beginPath(); cx.roundRect?cx.roundRect(b.x,b.y,b.w,b.h,10):cx.rect(b.x,b.y,b.w,b.h); cx.stroke();
      cx.fillStyle='rgba(255,255,255,.7)'; cx.font='10px system-ui'; cx.fillText((o.safe?'🛡 ':'')+(o.held!=null?'✋ ':'')+o.label,b.x+6,b.y+13); cx.restore(); } } }
export function zones(tip){ const z=B.objs.filter(o=>!o.safe).map(o=>({...o.box,up:Math.min(140,o.box.h*.8)})); if(tip) z.push({x:tip.x-18,y:tip.y-18,w:36,h:36,up:40}); return z; }
export function forget(){ for(const k in mem) delete mem[k]; saveMem(); B.objs.forEach(o=>o.chars=[]); }
