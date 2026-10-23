/* Scene burning: MediaPipe Object Detector (EfficientDet-Lite0, Apache-2.0 Google model) finds real things in the camera view.
   Fire (fingertip flame, ember ball, booms) that touches a detected object lights it: flames + smoke + a char decal
   anchored in the object's box coordinates (u,v), so the scorch follows the object as the camera moves.
   Char is remembered per label in localStorage. People are never burnable. Purely visual, nothing real is affected. */
import {FX,L,rnd,lightAt} from './fx.js';
import {E} from './elements.js';
const MODEL='https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
const NEVER=/person|dog|cat|bird|horse|sheep|cow|bear|elephant|zebra|giraffe/;
export const B={on:false,det:null,objs:[],last:0,status:'off',inject:null,lastSay:0};
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
    if(best&&bs>.35){ const o=best, k=.55; o.vx=((d.box.x-o.box.x))/Math.max(.05,(now-o.seenMs)/1000); o.vy=((d.box.y-o.box.y))/Math.max(.05,(now-o.seenMs)/1000);
      for(const p of ['x','y','w','h']) o.box[p]+=(d.box[p]-o.box[p])*k; o.seen=FX.t; o.seenMs=now; }
    else B.objs.push({label:d.label,box:{...d.box},seen:FX.t,seenMs:now,vx:0,vy:0,fire:0,chars:(mem[d.label]||[]).map(c=>({...c})),safe:NEVER.test(d.label)}); }
  B.objs=B.objs.filter(o=>FX.t-o.seen<2.5); }
export function update(dt,now,active){
  if(!cv) return; cx.clearRect(0,0,cv.width,cv.height); if(!active&&!B.objs.some(o=>o.fire>0)) { if(!active) return; }
  detect(now);
  for(const o of B.objs){ const b=o.box;
    if(FX.t-o.seen>.1&&FX.t-o.seen<1){ b.x+=o.vx*dt*.5; b.y+=o.vy*dt*.5; } // short extrapolation between detections
    // ignite from any fire hot-spot inside the box
    for(const h of E.hot){ if(h.x>b.x-h.r*.3&&h.x<b.x+b.w+h.r*.3&&h.y>b.y-h.r*.3&&h.y<b.y+b.h+h.r*.3){
      if(o.safe){ if(FX.t-B.lastSay>3){ B.lastSay=FX.t; say(`Not the ${o.label}. Fire is never for living things.`);} continue; }
      const u=Math.min(1,Math.max(0,(h.x-b.x)/b.w)), v=Math.min(1,Math.max(0,(h.y-b.y)/b.h));
      if(o.fire<=0){ say(`The ${o.label} caught fire!`); E.onBurn?.(o.label); }
      o.fire=Math.min(4,o.fire+dt*3+.5*(o.fire<=0)); const near=o.chars.find(c=>Math.hypot(c.u-u,c.v-v)<.12);
      if(near) near.r=Math.min(.45,near.r+dt*.25); else if(o.chars.length<14) o.chars.push({u,v,r:.06,s:Math.random()}); } }
    if(o.fire>0){ o.fire-=dt; const k=FX.Q;
      for(const c of o.chars){ c.r=Math.min(.5,c.r+dt*.02); const x=b.x+c.u*b.w, y=b.y+c.v*b.h, rr=c.r*Math.min(b.w,b.h);
        for(let i=0;i<4*k;i++) L.fire.spawn(x+rnd(-rr,rr)*.7,y+rnd(-rr,rr)*.5,rnd(-20,20),-rnd(60,180),{size:rnd(16,34),grow:1.4,life:rnd(.3,.6),curl:2.2,a:.7});
        if(Math.random()<.25*k) L.smoke.spawn(x,y-rr,rnd(-15,15),-rnd(40,90),{c:[.1,.09,.08],a:.4,size:rnd(50,90),grow:2.2,life:rnd(1.2,2.2),curl:1.5});
        if(Math.random()<.1) L.spark.spawn(x,y,rnd(-150,150),-rnd(150,400),{c:[1,.7,.3],size:rnd(5,10),life:rnd(.4,.8),grav:300}); }
      lightAt(b.x+b.w/2,b.y+b.h/2,[1,.55,.2],2);
      if(o.fire<=0){ mem[o.label]=o.chars.map(c=>({u:+c.u.toFixed(3),v:+c.v.toFixed(3),r:+c.r.toFixed(3),s:c.s})); saveMem(); say(`Fire's out. The ${o.label} stays scorched.`); } }
    // draw char decal anchored to object box (follows it as the camera moves)
    for(const c of o.chars){ const x=b.x+c.u*b.w, y=b.y+c.v*b.h, rr=c.r*Math.min(b.w,b.h)*1.3;
      cx.save(); cx.translate(x,y); cx.rotate(c.s*6.28); cx.globalAlpha=.85;
      if(charImg.complete&&charImg.naturalWidth) cx.drawImage(charImg,-rr,-rr,rr*2,rr*2);
      else { const g=cx.createRadialGradient(0,0,0,0,0,rr); g.addColorStop(0,'rgba(10,6,4,.9)'); g.addColorStop(.6,'rgba(40,20,8,.6)'); g.addColorStop(1,'rgba(60,30,10,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,rr,0,7); cx.fill(); }
      if(o.fire>0){ cx.globalCompositeOperation='lighter'; const g=cx.createRadialGradient(0,0,rr*.5,0,0,rr); g.addColorStop(0,'rgba(255,90,20,0)'); g.addColorStop(.8,'rgba(255,120,30,.5)'); g.addColorStop(1,'rgba(255,60,0,0)'); cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,rr,0,7); cx.fill(); }
      cx.restore(); }
    if(active){ cx.strokeStyle=o.safe?'rgba(127,255,212,.5)':'rgba(255,210,127,.55)'; cx.setLineDash([6,5]); cx.lineWidth=1.5; cx.strokeRect(b.x,b.y,b.w,b.h); cx.setLineDash([]);
      cx.fillStyle='rgba(0,0,0,.55)'; cx.fillRect(b.x,b.y-16,cx.measureText(o.label).width+38,16); cx.fillStyle='#fff'; cx.font='11px system-ui'; cx.fillText((o.safe?'🛡 ':'🔥 ')+o.label,b.x+4,b.y-4); } } }
export function forget(){ for(const k in mem) delete mem[k]; saveMem(); B.objs.forEach(o=>o.chars=[]); }
