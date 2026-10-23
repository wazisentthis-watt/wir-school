/* Kinetic-chain move engine: single-hand fluid moves recognised from 21 landmarks over time.
   Pure module (no DOM) so it can be unit-tested in Node with synthetic landmark sequences. See MOVES.md. */
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const MOVE_INFO={
 ripple:{name:'Finger ripple',how:'Wave the fingers pinky → index, one after another',lvl:2},
 rippleIn:{name:'Reverse ripple',how:'Wave the fingers index → pinky',lvl:2},
 pulse:{name:'Jellyfish pulse',how:'Loosely close the hand halfway and bloom it open again',lvl:1},
 bloom:{name:'Flick-open',how:'Hold a soft fist, then burst it open',lvl:1},
 curl:{name:'Finger-by-finger curl',how:'Fold the fingers down one at a time into a fist',lvl:2},
 flip:{name:'Wrist flip',how:'Turn the hand over: palm to back of hand (or back)',lvl:1},
 twist:{name:'Wrist roll',how:'Roll the wrist so the hand rotates like turning a dial',lvl:2},
 palmUp:{name:'Palm turn up',how:'Tip the palm to face the ceiling, as if offering',lvl:1},
 palmDown:{name:'Palm turn down',how:'Tip the palm to face the floor, as if covering',lvl:1},
 scoop:{name:'Scoop',how:'Cup the hand, dip down and sweep up in a U',lvl:1},
 pluck:{name:'Pluck',how:'Snap one finger in and out, like plucking a string',lvl:2},
 thumb:{name:'Thumb sweep',how:'Sweep the thumb across the palm and back',lvl:2},
 spiral:{name:'Spiral circle',how:'Draw a circle with the wrist (keep circling to spin)',lvl:1},
 push:{name:'Push',how:'Push the palm toward the camera',lvl:1},
 pull:{name:'Pull',how:'Draw the palm back toward you',lvl:1},
 thumbRoll:{name:'Thumb roll',how:'Roll the thumb tip along index → middle → ring tips',lvl:3},
 shake:{name:'Shake',how:'Shake the hand loosely side to side',lvl:1},
 beckon:{name:'Beckon',how:'Curl the index finger in and out twice ("come here")',lvl:2},
 // continuous states
 cup:{name:'Cup',how:'Soft, half-curled hand like holding water',lvl:1,state:true},
 pour:{name:'Pour',how:'While cupped, tilt the hand to one side',lvl:1,state:true},
};
export function feats(p){ const sc=d(p[0],p[9])||1;
  const r=(t,q)=>cl((d(p[t],p[0])/(d(p[q],p[0])||1)-1)/.55);
  const ext=[cl((d(p[4],p[17])/(d(p[2],p[17])||1)-1)/.6),r(8,6),r(12,10),r(16,14),r(20,18)];
  const cross=((p[5].x-p[0].x)*(p[17].y-p[0].y)-(p[5].y-p[0].y)*(p[17].x-p[0].x))/(sc*sc);
  const ux=(p[17].x-p[5].x), uy=(p[17].y-p[5].y), ul=Math.hypot(ux,uy)||1, mid={x:(p[5].x+p[17].x)/2,y:(p[5].y+p[17].y)/2};
  return {ext,cross,roll:Math.atan2(p[9].y-p[0].y,p[9].x-p[0].x),Q:sc/(ul||1),sc,
    thumbX:((p[4].x-mid.x)*ux+(p[4].y-mid.y)*uy)/ul/ul,
    tipD:[8,12,16,20].map(i=>d(p[4],p[i])/sc),
    palm:{x:(p[0].x+p[5].x+p[9].x+p[13].x+p[17].x)/5,y:(p[0].y+p[5].y+p[9].y+p[13].y+p[17].y)/5}}; }
export function defaultCal(){ return {lo:[.1,.1,.1,.1,.1],hi:[.85,.9,.9,.9,.85],faceSign:0,sens:1}; }
/* per-user calibration: running min/max of each finger's extension, relaxing slowly toward defaults */
function adapt(cal,ext,dt){ for(let f=0;f<5;f++){ const e=ext[f];
  cal.lo[f]=e<cal.lo[f]?e:cal.lo[f]+(Math.min(.25,e)-cal.lo[f])*dt*.02; cal.hi[f]=e>cal.hi[f]?e:cal.hi[f]+(Math.max(.6,e)-cal.hi[f])*dt*.02; } }
const CD=.55;
export function step(H,pts,t,cal,dt=1/30){
  const F=feats(pts); adapt(cal,F.ext,dt);
  const n=F.ext.map((e,f)=>cl((e-cal.lo[f])/Math.max(.25,cal.hi[f]-cal.lo[f])));
  const m=(n[1]+n[2]+n[3]+n[4])/4;
  const X=H.mvx=H.mvx||{hist:[],cd:{},state:{}}; const hs=X.hist;
  const prev=hs[hs.length-1]; let vx=0,vy=0; if(prev){ const k=Math.max(1e-3,t-prev.t); vx=(F.palm.x-prev.x)/k; vy=(F.palm.y-prev.y)/k; vx=prev.vx+(vx-prev.vx)*.5; vy=prev.vy+(vy-prev.vy)*.5; }
  let rollU=F.roll; if(prev){ let dr=F.roll-prev.rawRoll; while(dr>Math.PI)dr-=2*Math.PI; while(dr<-Math.PI)dr+=2*Math.PI; rollU=prev.roll+dr; }
  const fr={w:F.sc/F.Q,t,n,m,cross:F.cross,roll:rollU,rawRoll:F.roll,Q:F.Q,x:F.palm.x,y:F.palm.y,sc:F.sc,vx,vy,thumbX:F.thumbX,tipD:F.tipD};
  hs.push(fr); while(hs.length&&t-hs[0].t>1.6) hs.shift();
  if(cal.faceSign===0&&m>.7&&Math.abs(F.cross)>.2) cal.faceSign=Math.sign(F.cross);
  const ev=[]; const fire=(k,o={})=>{ if((X.cd[k]||-9)>t) return; X.cd[k]=t+CD; ev.push({k,...o}); };
  const win=s=>hs.filter(h=>t-h.t<=s);
  // ---- static pose (no ✌️): open / poke / cup / fist / relaxed ----
  const up=n.map(v=>v>.6), nUp=up.slice(1).filter(Boolean).length;
  let g='relaxed';
  if(nUp>=4||(nUp>=3&&m>.6)) g='open';
  else if(up[1]&&!up[2]&&!up[3]&&!up[4]) g='poke';
  else if(m<.14) g='fist';
  else if(m>=.16&&m<=.62&&Math.max(n[1],n[2],n[3],n[4])<.8) g='cup';
  // ---- ripple: per-finger dips ordered in time ----
  const W=win(1.1);
  if(W.length>8){ const dip=[]; for(let f=1;f<=4;f++){ let mx=-1,mi=2,mt=0,after=0; for(const h of W){ const v=h.n[f]; if(v<mi&&mx-v>.3){mi=v;mt=h.t;after=v;} if(mt) after=Math.max(after,v); if(v>mx&&!mt) mx=v; }
      dip[f]=mt&&after-mi>.22?mt:0; }
    const ord=(a)=>{ for(let i=1;i<a.length;i++) if(!(dip[a[i]]&&dip[a[i-1]]&&dip[a[i]]>dip[a[i-1]]+.02)) return false; return true; };
    const span=(a)=>dip[a[a.length-1]]-dip[a[0]];
    if((ord([4,3,2,1])||ord([4,3,2])||ord([3,2,1]))&&span([4,3,2,1].filter(f=>dip[f]))>.08) fire('ripple',{dur:span([4,3,2,1].filter(f=>dip[f]))});
    else if((ord([1,2,3,4])||ord([1,2,3])||ord([2,3,4]))&&span([1,2,3,4].filter(f=>dip[f]))>.08) fire('rippleIn');
    // pluck / beckon: one finger dips & recovers fast while the others stay put
    for(let f=1;f<=4;f++){ const W2=win(.4); if(W2.length<4) continue; let lo=2,hi=-1; for(const h of W2){lo=Math.min(lo,h.n[f]);hi=Math.max(hi,h.n[f]);}
      const others=[1,2,3,4].filter(q=>q!==f).every(q=>{ let a=2,b=-1; for(const h of W2){a=Math.min(a,h.n[q]);b=Math.max(b,h.n[q]);} return b-a<.22; });
      const first=W2[0].n[f], last=W2[W2.length-1].n[f];
      if(others&&hi-lo>.4&&first-lo>.3&&last-lo>.3){ X.plk=X.plk||[]; X.plk.push({t,f}); X.plk=X.plk.filter(p=>t-p.t<1.2);
        if(f===1&&X.plk.filter(p=>p.f===1).length>=2&&nUp<=1){ fire('beckon'); X.plk=[]; } else fire('pluck',{f}); X.cd['ripple']=X.cd['rippleIn']=t+.3; break; } } }
  // ---- pulse / bloom (flick-open) ----
  { const W3=win(1.1); let st=0,tc=0,closedFor=0,minM=2,openT=0;
    for(const h of W3){ if(st===0&&h.m>.62){st=1;} else if(st===1&&h.m<.45){st=2;tc=h.t;} else if(st===2){ minM=Math.min(minM,h.m); if(h.m>.62){st=3;openT=h.t;} } }
    const fistHold=(()=>{ let s=-1,e=-1; for(const h of win(1.2)){ if(h.m<.16){ if(s<0)s=h.t; e=h.t; } } return s>=0?{s,e,len:e-s}:null; })();
    if(fistHold&&fistHold.len>=.2&&m>.66&&t-fistHold.e<.45) { fire('bloom'); X.cd.pulse=t+.6; }
    else if(st===3&&openT-tc<.75&&minM>.08&&t-openT<.15) fire('pulse',{depth:1-minM}); }
  // ---- finger-by-finger curl into a fist ----
  if(m<.3){ const W4=win(1.6); const ct=[0,0,0,0,0]; for(let f=1;f<=4;f++){ for(let i=1;i<W4.length;i++) if(W4[i-1].n[f]>=.45&&W4[i].n[f]<.45) ct[f]=W4[i].t; }
    const ok=a=>a.every((f,i)=>ct[f]&&(i===0||ct[f]>ct[a[i-1]]+.03)); if((ok([1,2,3,4])||ok([4,3,2,1]))&&Math.abs(ct[4]-ct[1])>.18) fire('curl'); }
  // ---- wrist flip (pronation: palm <-> back) and roll (in-plane rotation) ----
  { const W5=win(.6); const a=W5.find(h=>Math.abs(h.cross)>.12); if(a&&Math.abs(F.cross)>.12&&Math.sign(a.cross)!==Math.sign(F.cross)) fire('flip',{to:Math.sign(F.cross)===cal.faceSign?'palm':'back'});
    const W6=win(.7); if(W6.length>3){ const dr=rollU-W6[0].roll; if(Math.abs(dr)>1.3) fire('twist',{dir:Math.sign(dr)}); } }
  // ---- palm turn up / down: palm foreshortens (length/width ratio Q drops) ----
  { X.Q0=X.Q0?X.Q0+(F.Q-X.Q0)*(F.Q>X.Q0?.02:.003):F.Q; const W7=win(.7); const hiQ=Math.max(...W7.map(h=>h.Q));
    if(hiQ>X.Q0*.85&&hiQ<X.Q0*1.25&&F.Q<X.Q0*.62&&W7.every(h=>Math.sign(h.cross)===Math.sign(F.cross))){ const faceNow=Math.sign(F.cross)===(cal.faceSign||1); fire(faceNow?'palmUp':'palmDown'); } }
  // ---- scoop: down then up (U) with a soft cupped hand ----
  { const W8=win(.8); let s=0,yb=0; for(const h of W8){ if(s===0&&h.vy>160) s=1; else if(s===1&&h.vy<-160&&h.m<.8){ s=2; } }
    const ys=W8.map(h=>h.y); if(s===2&&Math.max(...ys)-Math.min(ys[0],ys[ys.length-1])>F.sc*.35) fire('scoop'); }
  // ---- thumb sweep across the palm ----
  { const W9=win(.5); if(W9.length>3){ const xs=W9.map(h=>h.thumbX); const lo=Math.min(...xs), hi=Math.max(...xs), il=xs.indexOf(lo), ih=xs.indexOf(hi);
    const ms=W9.map(h=>h.m); const ws=W9.map(h=>h.w); if(Math.max(...ws)>Math.min(...ws)*1.25) ms.push(9); if(Math.max(...ms)-Math.min(...ms)<.2&&W9.every(h=>Math.sign(h.cross)===Math.sign(F.cross))&&hi-lo>.55&&Math.abs(il-ih)>1&&(il===0||ih===0||il===xs.length-1||ih===xs.length-1)) fire('thumb',{dir:Math.sign(ih-il)}); } }
  // ---- thumb roll along the fingertips ----
  { const W10=win(1.5), tt=[0,0,0,0]; for(const h of W10){ const mn=Math.min(...h.tipD), k=h.tipD.indexOf(mn); if(mn<.28) tt[k]=tt[k]||h.t; }
    if(tt[0]&&tt[1]&&tt[2]&&tt[0]<tt[1]&&tt[1]<tt[2]&&Math.min(...F.tipD)<.35) fire('thumbRoll'); }
  // ---- spiral: accumulated turning of the palm path ----
  { const W11=win(1.3); if(W11.length>10){ let cx=0,cy=0; for(const h of W11){cx+=h.x;cy+=h.y;} cx/=W11.length; cy/=W11.length; let acc=0,r=0;
      for(let i=1;i<W11.length;i++){ let q=Math.atan2(W11[i].y-cy,W11[i].x-cx)-Math.atan2(W11[i-1].y-cy,W11[i-1].x-cx); if(q>Math.PI)q-=2*Math.PI; if(q<-Math.PI)q+=2*Math.PI; acc+=q; r+=Math.hypot(W11[i].x-cx,W11[i].y-cy); }
      r/=W11.length; X.spin=Math.abs(acc)>1&&r>F.sc*.12?acc/(W11[W11.length-1].t-W11[0].t):0;
      if(Math.abs(acc)>Math.PI*1.6&&r>F.sc*.15){ fire('spiral',{dir:Math.sign(acc),r}); } } }
  // ---- push / pull (apparent hand size) ----
  { const W12=win(.35); if(W12.length>2){ const k=F.sc/W12[0].sc, kw=(F.sc/F.Q)/W12[0].w; if(k>1.18&&kw>1.12) fire('push'); else if(k<.85&&kw<.89) fire('pull'); } }
  // ---- shake: >=4 x-velocity reversals ----
  { const W13=win(.9); let rev=0,s0=0; for(const h of W13){ if(Math.abs(h.vx)>220){ const s=Math.sign(h.vx); if(s0&&s!==s0) rev++; s0=s; } } if(rev>=4) fire('shake'); }
  // ---- continuous: cup, pour ----
  const S=X.state; S.cupN=g==='cup'?(S.cupN||0)+1:0; S.cup=S.cupN>=3;
  if(S.cup&&S.cupN===3) S.roll0=rollU; S.pour=S.cup&&Math.abs(rollU-S.roll0)>.5?Math.sign(rollU-S.roll0):0;
  S.spin=X.spin||0;
  return {g,n,m,ev,state:S,F}; }

/* ---- synthetic hand for tests and the training ghost ----
   o: {n:[thumb,index,middle,ring,pinky] 0..1, s:size px, roll:rad (0 = fingers up), flip:bool (back of hand), tilt:0..1 (palm toward horizontal), thumbX:-1..1} */
export function synth(x,y,o={}){ const n=o.n||[1,1,1,1,1], s=o.s||90, fl=typeof o.flip==='number'?o.flip:(o.flip?-1:1), tilt=o.tilt||0;
  const mcp=[[-.35,-.95],[0,-1],[.3,-.95],[.55,-.85]], P=[[0,0]];
  const th=n[0], tx=o.thumbX, p17=[.55,-.85], p2=[-.6,-.55], k=1+.6*th;
  P.push([-.35,-.3],p2,[(p2[0]+(p17[0]+(p2[0]-p17[0])*k))/2,(p2[1]+(p17[1]+(p2[1]-p17[1])*k))/2-.05],[tx!=null?tx*.7:p17[0]+(p2[0]-p17[0])*k,p17[1]+(p2[1]-p17[1])*k]);
  mcp.forEach((m,f)=>{ const e=n[f+1], L=f===3?.8:1, my=Math.hypot(m[0],m[1]); P.push(m);
    const pipY=-.3*L, tipY=my-(1+.55*e)*(my+.3*L), dipY=(pipY+tipY)/2;
    P.push([m[0],m[1]+pipY],[m[0]+(1-e)*.03,m[1]+dipY],[m[0],m[1]+tipY]); });
  if(o.touch!=null){ const tip=[8,12,16,20][o.touch]; P[4]=[P[tip][0]-.04,P[tip][1]+.04]; }
  const c=Math.cos(o.roll||0), sn=Math.sin(o.roll||0);
  return P.map(([px,py])=>{ px*=fl; py*=(1-tilt*.6); return {x:x+(px*c-py*sn)*s,y:y+(px*sn+py*c)*s}; }); }
