/* Optional body layer: MediaPipe Pose Landmarker (BlazePose lite, Apache-2.0) for full-body bending stances.
   Earth STOMP: a knee lifts, then that ankle slams down → rock wall erupts.  Air SPIN: shoulders turn a full circle → cyclone.
   Runs on a 256 px frame every 2nd camera frame so it never starves the hand tracker. */
import {FX,rockSpawn,addField} from './fx.js';
import {E,vortex} from './elements.js';
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
export const BD={on:false,lm:null,pts:null,status:'off',n:0,hist:[],spin:{flips:0,last:0,sign:0},stompCd:0,events:[]};
const c=document.createElement('canvas'), cx=c.getContext('2d');
export async function enable(VISION){ if(BD.lm){ BD.on=!BD.on; return BD.on; } BD.status='loading';
  try{ const v=await import(VISION+'/vision_bundle.mjs'); const fs=await v.FilesetResolver.forVisionTasks(VISION+'/wasm');
    const o=d=>({baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
    try{ BD.lm=await v.PoseLandmarker.createFromOptions(fs,o('GPU')); }catch{ BD.lm=await v.PoseLandmarker.createFromOptions(fs,o('CPU')); }
    BD.on=true; BD.status='on'; }catch(e){ console.warn('pose failed',e); BD.status='failed'; BD.on=false; } return BD.on; }
export function track(video,now,toScreen){ if(!BD.on||!BD.lm||!video.videoWidth) return; if((BD.n++)%2) return;
  const W=256,H=Math.round(W*video.videoHeight/video.videoWidth); if(c.width!==W){c.width=W;c.height=H;} cx.drawImage(video,0,0,W,H);
  const r=BD.lm.detectForVideo(c,now); const lm=r.landmarks?.[0];
  if(!lm){ BD.pts=null; return; } feed(lm.map(p=>({...toScreen(p),v:p.visibility??1})),now/1000); }
// stance logic is separate so tests can feed synthetic bodies
export function feed(pts,t){ BD.pts=pts; BD.hist.push({t,pts}); while(BD.hist.length&&t-BD.hist[0].t>1) BD.hist.shift();
  const L=pts, leg=Math.hypot(L[23].x-L[27].x,L[23].y-L[27].y)||200;
  // stomp: either ankle was raised (above the other by 25% of leg) within 0.8 s and is now back down, moving fast
  for(const [a,o] of [[27,28],[28,27]]){ const raised=BD.hist.some(h=>h.pts[o].y-h.pts[a].y>leg*.25&&t-h.t<.8);
    const prev=BD.hist[BD.hist.length-3]; const vy=prev?(L[a].y-prev.pts[a].y)/Math.max(.02,t-prev.t):0;
    if(raised&&vy>leg*2.5&&Math.abs(L[a].y-L[o].y)<leg*.1&&t>BD.stompCd&&L[a].v>.5){ BD.stompCd=t+1.2; stomp(L[a].x); } }
  // spin: shoulder left/right order flips (back turned, then front again) within 2.5 s
  const s=Math.sign(L[12].x-L[11].x); if(s&&s!==BD.spin.sign){ if(t-BD.spin.last<2.5) BD.spin.flips++; else BD.spin.flips=1; BD.spin.last=t; BD.spin.sign=s;
    if(BD.spin.flips>=3){ BD.spin.flips=0; spin(); } } }
function stomp(x){ BD.events.push('stomp'); window.labEvent?.('body:stomp'); FX.shake=Math.max(FX.shake||0,14);
  if(E.mode==='earth'){ for(let i=-2;i<=2;i++) rockSpawn(x+i*70,FX.H*.72); E.say('STOMP! Rock wall'); } else E.say('Stomp! (switch to Earth to raise rocks)'); }
function spin(){ BD.events.push('spin'); window.labEvent?.('body:spin');
  if(E.mode==='air'){ vortex({x:FX.W/2,y:FX.H/2,r:200,dir:1}); E.say('SPIN! Cyclone'); } else E.say('Spin! (switch to Air for a cyclone)'); }
const BONES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
export function draw(sk){ if(!BD.on||!BD.pts) return; const p=BD.pts; sk.save(); sk.lineWidth=4; sk.strokeStyle='rgba(255,210,127,.55)'; sk.beginPath();
  for(const [a,b] of BONES){ if(p[a].v<.4||p[b].v<.4) continue; sk.moveTo(p[a].x,p[a].y); sk.lineTo(p[b].x,p[b].y); } sk.stroke(); sk.restore(); }
