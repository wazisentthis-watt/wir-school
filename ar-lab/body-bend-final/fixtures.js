/* fixtures.js — SIMULATED 33-landmark poses (PLACEHOLDER / PROPOSAL – not canon). Used by node tests AND the in-browser "sim" mode.
   Units: person height Hp in frame-heights; x converted with aspect (W/H). Nothing here is real camera data. */
export function rng(seed=1){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const ease=u=>{u=Math.max(0,Math.min(1,u)); return u*u*(3-2*u);};
/* base: {cx,floor,Hp,aspect,stance(ankle gap / shoulder width),bend(0..1)}; extras: liftL,liftR (Hp units), hipDrop (Hp), sway */
export function makePose(base,x={}){ const b={cx:.5,floor:.9,Hp:.6,aspect:9/16,stance:1.0,bend:0,...base}, a=b.aspect, Hp=b.Hp;
  const sw=.23*Hp, tor=.30*Hp, L=.47*Hp, ankH=.03*Hp; const liftL=x.liftL||0, liftR=x.liftR||0, sway=x.sway||0;
  const ax=[b.cx*a-b.stance*sw/2+sway*a, b.cx*a+b.stance*sw/2+sway*a]; // isotropic units
  const aY=[b.floor-ankH-liftL, b.floor-ankH-liftR];
  const hipHalf=.09*Hp, hx=b.cx*a+sway*a; const d=L*(1-.3*b.bend);
  // hip height from the lower foot so a lifted foot does not drag the hips up
  const dxs=[Math.abs(ax[0]-(hx-hipHalf)),Math.abs(ax[1]-(hx+hipHalf))]; const baseAnk=b.floor-ankH;
  const dy=Math.sqrt(Math.max(.0004,Math.max(d,Math.max(...dxs)*1.02)**2-Math.max(...dxs)**2));
  const hipYFinal=baseAnk-dy+(x.hipDrop||0);
  const hips=[{x:hx-hipHalf,y:hipYFinal},{x:hx+hipHalf,y:hipYFinal}];
  const shY=hipYFinal-tor, sh=[{x:hx-sw/2,y:shY},{x:hx+sw/2,y:shY}];
  const knee=i=>{ const h=hips[i], an={x:ax[i],y:aY[i]}; const mx=(h.x+an.x)/2,my=(h.y+an.y)/2, dd=Math.hypot(h.x-an.x,h.y-an.y), off=Math.sqrt(Math.max(0,(L/2)**2-(dd/2)**2));
    const out=i===0?-1:1; return {x:mx+out*off*.8,y:my}; };
  const pts=new Array(33); const set=(i,p,v=1)=>{ pts[i]={x:p.x/a,y:p.y,z:0,v}; };
  const headY=shY-.13*Hp; set(0,{x:hx,y:headY}); for(let i=1;i<=10;i++) set(i,{x:hx+((i%2?-1:1)*.02*Hp),y:headY-.01*Hp});
  set(7,{x:hx-.05*Hp,y:headY}); set(8,{x:hx+.05*Hp,y:headY});
  set(11,sh[0]); set(12,sh[1]); set(23,hips[0]); set(24,hips[1]);
  const wr=x.wrists||[{x:hx-sw*.75,y:shY+tor*.9},{x:hx+sw*.75,y:shY+tor*.9}];
  for(const i of [0,1]){ set(13+i,{x:(sh[i].x+wr[i].x)/2,y:(sh[i].y+wr[i].y)/2}); set(15+i,wr[i]); for(let j=17+i;j<=21+i;j+=2) set(j,wr[i]); }
  for(const i of [0,1]){ set(25+i,knee(i)); set(27+i,{x:ax[i],y:aY[i]}); set(29+i,{x:ax[i],y:aY[i]+ankH*.9}); set(31+i,{x:ax[i]+(i?1:-1)*.02*Hp,y:aY[i]+ankH}); }
  return pts; }
/* walking in place with drift. speed 1 = normal, 1.4 = brisk */
export function walkPose(base,t,speed=1){ const f=1.0*speed, A=.055*Hp(base)*speed, ph=t*f*2*Math.PI; const swing=p=>Math.max(0,Math.sin(p))**1.0;
  const bob=Math.abs(Math.sin(ph))*.03*Hp(base)*speed; return makePose({...base,stance:.55,cx:(base.cx||.5)+.02*Math.sin(t*.5)},{liftL:A*swing(ph),liftR:A*swing(ph+Math.PI),hipDrop:bob}); }
const Hp=b=>b.Hp||.6;
export function standPose(base,t=0,r){ const n=r?(r()-.5)*.004:0; return makePose(base,{sway:Math.sin(t*.9)*.004+n}); }
/* frames for one stomp: stand -> lift one foot -> slam (hips drop) -> set -> hold -> relax. 30 fps. */
export function stompFrames(base,o={}){ const fps=30, dur=o.dur||2.8, out=[], r=rng(o.seed||7), n=o.noise??.0015, Hp_=Hp(base);
  const liftMax=o.lift??.12*Hp_, tLift=.6, tTop=1.0, tSlam=1.07, drop=o.hipDrop??.05*Hp_, foot=o.foot??0;
  for(let i=0;i<=dur*fps;i++){ const t=i/fps; let lift=0, hd=0;
    if(t>=tLift&&t<tTop) lift=liftMax*ease((t-tLift)/(tTop-tLift)); else if(t>=tTop&&t<tSlam) lift=liftMax*(1-ease((t-tTop)/(tSlam-tTop))); 
    if(t>=tTop&&t<tSlam+.1) hd=drop*ease((t-tTop)/(tSlam+.1-tTop)); else if(t>=tSlam+.1) hd=drop*(1-ease((t-tSlam-.1)/.8));
    const x={liftL:foot===0?lift:0,liftR:foot===1?lift:0,hipDrop:hd,sway:Math.sin(t*.9)*.002};
    const pts=makePose(base,x).map(p=>({...p,x:p.x+(r()-.5)*n,y:p.y+(r()-.5)*n})); out.push({t,pts}); } return out; }
/* jump: both feet leave the floor together */
export function jumpFrames(base,o={}){ const fps=30,out=[],r=rng(5),Hp_=Hp(base); const h=o.h??.12*Hp_;
  for(let i=0;i<=2.4*fps;i++){ const t=i/fps, u=(t-.8)/.5; const lift=u>=0&&u<=1?h*4*u*(1-u):0; const hd=u>=1&&u<1.3?.04*Hp_*Math.sin((u-1)/.3*Math.PI):0;
    out.push({t,pts:makePose(base,{liftL:lift,liftR:lift,hipDrop:hd}).map(p=>({...p,x:p.x+(r()-.5)*.0015,y:p.y+(r()-.5)*.0015}))}); } return out; }
/* a foot tap with no hip involvement (should NOT count: whole-body only) */
export function tapFrames(base){ return stompFrames(base,{hipDrop:0,seed:3}); }
