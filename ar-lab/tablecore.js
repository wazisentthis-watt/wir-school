/* v10 table mode core (pure, testable). A flat "table" plane in screen space: everything at y>=top is table.
   Items rest on it with high friction; only a hand poke/flick pushes them, slowly. Nothing spawns on its own. */
export const TP={maxV:60, fric:5, stop:4, push:.25, reach:16, minTip:40, maxItems:12, r0:12};
export function planeNew(top,W,H){ return {top,W,H}; }
export const persp=(P,y)=>.45+.55*Math.max(0,Math.min(1,(y-P.top)/(P.H-P.top||1)));
export function placePile(items,P,x,y,el){ if(y<P.top) y=P.top+4; const out=[]; const s=persp(P,y);
  if(items.length<TP.maxItems) out.push({x,y,vx:0,vy:0,el,r:TP.r0*s,big:1});
  for(let k=0;k<3&&items.length+out.length<TP.maxItems;k++){ const a=k*2.1+.4; out.push({x:x+Math.cos(a)*14*s,y:y+Math.sin(a)*7*s,vx:0,vy:0,el,r:3*s}); }
  items.push(...out); clamp(items,P); return out.length; }
function clamp(items,P){ for(const o of items){ const lo=P.top+o.r*.5;
  if(o.y<lo){ o.y=lo; o.vy=Math.max(0,o.vy); } if(o.y>P.H-o.r){ o.y=P.H-o.r; o.vy=Math.min(0,o.vy); }
  if(o.x<o.r){ o.x=o.r; o.vx=Math.max(0,o.vx); } if(o.x>P.W-o.r){ o.x=P.W-o.r; o.vx=Math.min(0,o.vx); } } }
/* tips: [{x,y,vx,vy}] fingertip/palm points with velocity in px/s */
export function tableStep(items,P,tips,dt){ let pushed=0;
  for(const o of items){
    for(const t of tips||[]){ const dx=o.x-t.x, dy=o.y-t.y, d=Math.hypot(dx,dy), sp=Math.hypot(t.vx,t.vy);
      if(d>o.r+TP.reach||sp<TP.minTip) continue; const tow=(t.vx*dx+t.vy*dy)/(d||1); if(tow<=0) continue; // only moving INTO it pushes
      o.vx+=t.vx*TP.push*(o.big?1:1.3); o.vy+=t.vy*TP.push*.6*(o.big?1:1.3); pushed++; }
    const v=Math.hypot(o.vx,o.vy); if(v>TP.maxV){ o.vx*=TP.maxV/v; o.vy*=TP.maxV/v; }
    const k=Math.exp(-TP.fric*dt); o.vx*=k; o.vy*=k; if(Math.hypot(o.vx,o.vy)<TP.stop){ o.vx=0; o.vy=0; } // static friction: it stays put
    o.x+=o.vx*dt; o.y+=o.vy*dt; }
  clamp(items,P); return pushed; }
/* plane guess from phone pitch (deviceorientation beta: 90 = upright, 0 = flat). Upright phone sees the table low in frame. */
export function planeFromPitch(beta,H){ if(beta==null) return H*.55; const b=Math.max(20,Math.min(100,beta)); return H*(.25+.45*(b-20)/80); }
