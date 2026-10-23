import {orbNew,orbStep,orbLaunch,palmTilt,DIFF} from '../orb.js';
import {normalizeRGBA,Voter,regionBox,colorSig,sigDist} from '../vision.js';
import {dousing,FIRE} from '../fire.js';
import {readFileSync} from 'fs';
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++; console.log('PASS',m);} else { fail++; console.log('FAIL',m); } };
const dt=1/30;
function run(fn,T=4,P=DIFF.normal){ const O=orbNew(); O.t=9; let px=200,vx=0,drops=0,minS=1;
  for(let t=0;t<T;t+=dt){ const h=fn(t); const nvx=(h.x-px)/dt, ax=t<dt*2?0:(nvx-vx)/dt; px=h.x; vx=nvx;
    orbStep(O,{x:h.x,y:400,ax,ay:0,vx:nvx,vy:0,tilt:h.tilt?.(ax)||0,s:100,cup:0,tips:h.tips?h.tips(t,O):[]},dt,P);
    if(O.ev.includes('drop')) drops++; if(O.state==='held') minS=Math.min(minS,O.stab); } return {O,drops,minS}; }
// ---- orb physics ----
{ const r=run(()=>({x:200})); ok(r.drops===0&&r.minS>.95,'still hand: orb rests steady'); }
{ const r=run(()=>({x:200,tilt:()=>.25}),1.5); ok(r.O.rx>10&&r.drops===0,`tilt right rolls the orb right (rx=${r.O.rx.toFixed(1)}) without dropping`);
  const l=run(()=>({x:200,tilt:()=>-.25}),1.5); ok(l.O.rx<-10,'tilt left rolls it left'); }
{ const r=run(()=>({x:200,tilt:()=>.9}),2); ok(r.drops>0,'steep tilt rolls it off the palm'); }
{ let peak=0; run(()=>({x:200,tips:(t,O)=>{ peak=Math.max(peak,O.rx); return t<.3?[{x:200+O.rx-10,y:400+O.ry,vx:400,vy:0}]:[]; }}),.6); ok(peak>8,`finger stroke to the right nudges it right (peak ${peak.toFixed(1)}px)`); }
{ let peak=0; run(()=>({x:200,tips:(t,O)=>{ peak=Math.min(peak,O.rx); return t<.3?[{x:200+O.rx+10,y:400+O.ry,vx:-400,vy:0}]:[]; }}),.6); ok(peak<-8,'pinky/ring stroke to the left nudges it left'); }
{ const r=run(()=>({x:200,tips:(t,O)=>[{x:200+O.rx,y:400+O.ry-18,vx:500,vy:0}]}),.5); ok(Math.abs(r.O.w)>5&&r.drops===0,`fingertip sweep over the top twirls it (w=${r.O.w.toFixed(1)} rad/s)`); }
{ const r=run(t=>({x:200+120*Math.sin(4*t)})); ok(r.drops>0,'fast side-to-side move without guiding: the orb falls off'); }
{ const r=run(t=>({x:200+120*Math.sin(4*t),tilt:a=>Math.max(-1,Math.min(1,a/(2000*1.2)))})); ok(r.drops===0&&r.minS>.5,`same move, guided by leaning the palm into it: stays on (min stability ${r.minS.toFixed(2)})`); }
{ const r=run(t=>({x:200+60*Math.sin(2*t)})); ok(r.drops===0,'slow carry keeps it even unguided'); }
{ const e=run(t=>({x:200+90*Math.sin(4.5*t)}),4,DIFF.easy), m=run(t=>({x:200+90*Math.sin(4.5*t)}),4,DIFF.master); ok(e.drops===0&&m.drops>0,`difficulty: easy holds (${e.drops}), master drops (${m.drops})`); }
{ const O=orbNew(); O.t=9; let st=[]; const H={x:200,y:400,ax:0,ay:0,vx:0,vy:0,tilt:0,s:100,tips:[]}; orbStep(O,H,dt); orbStep(O,{...H,ax:3e4},dt); for(let i=0;i<120;i++){ orbStep(O,H,dt); st.push(O.state); }
  ok(st.includes('fall')&&st.includes('gone')&&O.state==='held','drop → fizzle → respawns after a beat'); }
{ const O=orbNew(); O.t=9; const H={x:200,y:400,ax:0,ay:0,vx:0,vy:0,tilt:0,s:100,tips:[]}; orbStep(O,H,dt); ok(orbLaunch(O,0,-900)&&O.state==='fly','moves launch the orb'); let pop=false; for(let i=0;i<40;i++){ orbStep(O,H,dt); pop=pop||O.ev.includes('pop'); } ok(pop,'launched orb pops at the end of its flight'); }
{ const pts=Array.from({length:21},()=>({x:0,y:0})); pts[0]={x:100,y:200}; pts[9]={x:130,y:110}; ok(palmTilt(pts)>.2,'palm tilt from landmarks: leaning right is positive'); }
// ---- detection helpers ----
{ const W=64,H=48,d=new Uint8ClampedArray(W*H*4); for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const k=(y*W+x)*4, cup=x>20&&x<40&&y>10&&y<40, v=cup?(y<20?150:120):18+((x*7+y*3)%5); d[k]=d[k+1]=d[k+2]=v; d[k+3]=255; }
  const c0=d[(25*W+30)*4]-d[(25*W+5)*4]; normalizeRGBA(d,W,H); const c1=d[(25*W+30)*4]-d[(25*W+5)*4]; ok(c1>c0,`contrast normalize widens cup/background gap (${c0}→${c1.toFixed(0)})`);
  const b=regionBox(d,W,H,30,30); ok(b&&b.x>=19&&b.x<=23&&b.w>=16&&b.w<=22,`tap on the cup finds its box (${JSON.stringify(b)})`);
  const s1=colorSig(d,W,b), s2=colorSig(d,W,{x:2,y:2,w:10,h:10}); ok(sigDist(s1,s1)<.01&&sigDist(s1,s2)>.3,'remembered tag signature matches the cup, not the table'); }
{ const V=new Voter(5,2,.42); const box={x:10,y:10,w:50,h:50}; let r=V.push([{label:'cup',score:.25,box}]); ok(r.length===0,'weak single hit is not trusted'); r=V.push([]); r=V.push([{label:'cup',score:.24,box:{...box,x:14}}]); ok(r.length===1,'weak but repeated (2 of 5 runs) is confirmed');
  const V2=new Voter(); ok(V2.push([{label:'cup',score:.6,box}]).length===1,'a strong hit is confirmed at once'); }
// ---- fire limits / extinguish ----
{ const box={x:100,y:100,w:80,h:80}; ok(dousing({x:140,y:120,s:90,g:'fist'},box,'fire')>0,'fist over a burning object smothers it'); ok(dousing({x:140,y:120,s:90,g:'open',mv:['palmDown']},box,'fire')>0,'palm-down over it smothers it');
  ok(dousing({x:140,y:120,s:90,g:'open'},box,'water')>0,'any hand over it in water mode douses it'); ok(dousing({x:140,y:120,s:90,g:'open'},box,'fire')===0,'an open hand in fire mode does not'); ok(dousing({x:600,y:600,s:90,g:'fist'},box,'fire')===0,'far away does nothing'); }
{ const fx=readFileSync(new URL('../fx.js',import.meta.url),'utf8'); ok(FIRE.cap<=300&&/FIRE\.cap/.test(fx),'total fire particles on screen are capped'); ok(/max:260,heat:true/.test(fx),'fire layer 900→260 particles'); }
console.log(`v8: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
