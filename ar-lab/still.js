/* Stationary mode: is the phone propped still? DeviceMotion when permitted, else frame difference on a tiny grey thumbnail. */
export const ST={mode:'auto',still:false,src:'frame',motion:null,diff:1,calmFor:0};
let cv,cx,prev,video,lastT=0;
export function init(v){ video=v; cv=document.createElement('canvas'); cv.width=32; cv.height=18; cx=cv.getContext('2d',{willReadFrequently:true});
  try{ ST.mode=localStorage.getItem('wirlab.still')||'auto'; }catch(e){}
  if(window.DeviceMotionEvent&&typeof DeviceMotionEvent.requestPermission!=='function') listen(); }
function listen(){ addEventListener('devicemotion',e=>{ const a=e.rotationRate; if(!a) return; ST.src='motion'; ST.motion=Math.abs(a.alpha||0)+Math.abs(a.beta||0)+Math.abs(a.gamma||0); }); }
export async function askMotion(){ try{ if(DeviceMotionEvent?.requestPermission&&await DeviceMotionEvent.requestPermission()==='granted') listen(); }catch(e){} }
export function setMode(m){ ST.mode=m; try{localStorage.setItem('wirlab.still',m);}catch(e){} }
/* hands move a lot of pixels, so frame diff uses the median of 3x3 cell diffs: a hand covers a few cells, a moving phone changes all of them */
export function update(dt,now){
  if(now-lastT>200&&video&&video.readyState>=2){ lastT=now; cx.drawImage(video,0,0,32,18); const d=cx.getImageData(0,0,32,18).data, g=new Float32Array(576);
    for(let i=0;i<576;i++) g[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;
    if(prev){ const cells=[]; for(let cy=0;cy<3;cy++) for(let cxx=0;cxx<3;cxx++){ let s=0,n=0; for(let y=cy*6;y<cy*6+6;y++) for(let x=Math.floor(cxx*32/3);x<Math.floor((cxx+1)*32/3);x++){ s+=Math.abs(g[y*32+x]-prev[y*32+x]); n++; } cells.push(s/n); }
      cells.sort((a,b)=>a-b); ST.diff=cells[4]; } prev=g; }
  const moving=ST.src==='motion'&&ST.motion!=null ? ST.motion>8 : ST.diff>6;
  ST.calmFor=moving?0:ST.calmFor+dt;
  ST.auto=ST.calmFor>1.5; ST.still=ST.mode==='on'||(ST.mode==='auto'&&ST.auto); return ST.still; }
