/* v6 two-palm charge + early (predictive) release. Pure, Node-testable.
   Charge pose: both hands visible, wrists (heels) close together, fingertips apart (an open bowl / cupped "C").
   While held the charge grows. Release: the fingertip gap closing fast is extrapolated; when the predicted
   time-to-contact drops below LEAD seconds, the blast launches, before the hands actually meet. */
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const tipMid=p=>({x:(p[8].x+p[12].x+p[16].x+p[20].x)/4,y:(p[8].y+p[12].y+p[16].y+p[20].y)/4});
export const CH={HEEL:1.5,OPEN:.95,CONTACT:.45,LEAD:.16,VMIN:2.2,ARM:.25,FULL:1.6,CANCEL:.35};
export function chargeNew(){ return {state:'idle',hold:0,lvl:0,gap:null,v:0,away:0,t0:0}; }
/* a,b: {pts, scale, g}. returns {state, lvl, ev:'start'|'release'|'cancel'|null, gap, heel, v, ttc, x, y} */
export function chargeStep(C,a,b,t,dt){
  if(!a||!b||!a.pts||!b.pts){ const was=C.state==='charging'; Object.assign(C,chargeNew()); return {state:'idle',lvl:0,ev:was?'cancel':null}; }
  const s=((a.scale||1)+(b.scale||1))/2, heel=d(a.pts[0],b.pts[0])/s, ta=tipMid(a.pts), tb=tipMid(b.pts), gap=d(ta,tb)/s;
  const iv=C.gap==null?0:(C.gap-gap)/Math.max(dt,1e-3); C.v=C.gap==null?0:C.v+(iv-C.v)*.6; C.gap=gap;
  const x=(a.pts[0].x+b.pts[0].x+ta.x+tb.x)/4, y=(a.pts[0].y+b.pts[0].y+ta.y+tb.y)/4;
  const ok=a.g!=='fist'&&b.g!=='fist'&&heel<CH.HEEL;
  const ttc=C.v>0?(gap-CH.CONTACT)/C.v:Infinity; let ev=null;
  if(C.state==='idle'){ if(ok&&gap>CH.OPEN){ C.hold+=dt; if(C.hold>=CH.ARM){ C.state='charging'; C.lvl=0; C.t0=t; ev='start'; } } else C.hold=0; }
  else if(C.state==='charging'){ C.lvl=Math.min(1,C.lvl+dt/CH.FULL);
    if(!ok){ C.away+=dt; if(C.away>CH.CANCEL){ C.state='idle'; C.hold=0; C.lvl=0; ev='cancel'; } } else C.away=0;
    if(ev!=='cancel'&&C.lvl>.12&&C.v>CH.VMIN&&(ttc<CH.LEAD||gap<CH.CONTACT)){ ev='release'; C.state='cool'; C.rel={t,lvl:C.lvl,gap,ttc}; } }
  else if(C.state==='cool'){ if(gap>CH.OPEN*1.3||t-C.rel.t>1.2){ C.state='idle'; C.hold=0; C.lvl=0; } }
  return {state:C.state,lvl:C.lvl,ev,gap,heel,v:C.v,ttc,x,y,rel:C.rel}; }
