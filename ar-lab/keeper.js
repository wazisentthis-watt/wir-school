/* v6 pure helpers (no DOM, unit-tested in Node):
   1) Keeper flame: one persistent flame hovering in front of the hands. Every move feeds or shapes it; it never goes out.
   2) Finger ribbon: water control points floating ABOVE the hand, one per fingertip, moved by each finger. */
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
// move -> impulses. heat is the flame's life (0.15 floor = never dies); the rest are short shaping impulses that decay.
export const FEED={
 ripple:{flick:1,heat:.12}, rippleIn:{flick:1,heat:.08}, pulse:{breath:1,heat:.1}, bloom:{flare:1,heat:.25},
 curl:{dim:1}, flip:{roll:1}, twist:{swirl:.7}, palmUp:{lift:1,heat:.12}, palmDown:{dim:.5,heat:-.05},
 scoop:{lift:.8,heat:.1}, pluck:{spark:1}, thumb:{spark:1}, spiral:{swirl:1,heat:.05}, push:{extend:1},
 pull:{draw:1,heat:.08}, thumbRoll:{spark:.6,weave:1}, shake:{flick:1.4,heat:-.04}, beckon:{draw:.7,heat:.1},
 cup:{shelter:1}, pour:{spill:1},
};
const IMP=['flick','breath','flare','dim','roll','swirl','lift','spark','extend','draw','weave','shelter','spill'];
export const HEAT_FLOOR=.15;
export function keeperNew(x=0,y=0){ const K={x,y,heat:.45,last:'',feeds:0,phase:0}; for(const k of IMP) K[k]=0; return K; }
export function keeperFeed(K,k){ const f=FEED[k]; if(!f) return false;
  for(const [a,v] of Object.entries(f)){ if(a==='heat') K.heat=cl(K.heat+v,HEAT_FLOOR,1); else K[a]=Math.min(1.5,K[a]+v); }
  K.last=k; K.feeds++; return true; }
/* anchor = point in front of the hands; held = {cup,pour} continuous states (re-fed every frame they are held) */
export function keeperStep(K,anchor,dt,held={}){
  if(held.cup) K.shelter=Math.max(K.shelter,1); if(held.pour) K.spill=Math.max(K.spill,1);
  for(const k of IMP) K[k]*=Math.exp(-dt*(k==='shelter'?6:2.6));
  K.heat+=(.45-K.heat)*dt*.05; K.heat=cl(K.heat,HEAT_FLOOR,1); K.phase+=dt*(2+K.swirl*10);
  if(anchor){ const k=Math.min(1,dt*9); K.x+=(anchor.x-K.x)*k; K.y+=(anchor.y-K.y)*k; }
  return keeperShape(K); }
export function keeperShape(K){
  const breathe=1+.35*K.breath*Math.sin(K.phase*3);
  const size=(.55+K.heat)*breathe*(1+.8*K.flare)*(1-.45*Math.min(1,K.dim))*(1-.25*Math.min(1,K.draw))*(1+.15*K.shelter);
  return { x:K.x, y:K.y-K.lift*30+K.draw*12, size:Math.max(.25,size),
    height:(1+.9*K.extend+.5*K.lift)*(1-.3*Math.min(1,K.shelter)), flicker:.15+K.flick, swirl:K.swirl, spin:K.phase,
    lean:K.spill*(K.spillDir||1)+Math.sin(K.roll*1.4)*.6, sparks:K.spark, weave:K.weave,
    bright:cl(.55+K.heat*.5+K.flare*.5-K.dim*.3,.35,1.4), alive:K.heat>=HEAT_FLOOR }; }

/* Finger ribbon: 5 control points ABOVE the hand (thumb..pinky). Each point rides its own fingertip:
   x follows the tip (spread out by how far the finger is from the palm), height rises with that finger's extension,
   and the fingertip's own velocity drags its point (so a single finger flick bends only its part of the water). */
const TIPS=[4,8,12,16,20];
export function fingerRibbon(pts,prev,dt,ext){ const palm={x:(pts[0].x+pts[5].x+pts[9].x+pts[13].x+pts[17].x)/5,y:(pts[0].y+pts[5].y+pts[9].y+pts[13].y+pts[17].y)/5};
  const sc=Math.hypot(pts[0].x-pts[9].x,pts[0].y-pts[9].y)||1, top=Math.min(...TIPS.map(i=>pts[i].y));
  return TIPS.map((i,f)=>{ const tp=pts[i], e=ext?ext[f]:1, vx=prev?(tp.x-prev[i].x)/dt:0, vy=prev?(tp.y-prev[i].y)/dt:0;
    return { f, x:tp.x+(tp.x-palm.x)*.25+vx*.06, y:top-sc*(.45+.55*e)+vy*.06+(f===0?sc*.25:0), e }; }); }
