/* v8 element orb: a golf-ball-sized orb resting just above the palm. Pure physics, Node-tested (tests/v8.test.mjs).
   The orb is NOT glued to the hand. It lives in the hand's frame as an offset (rx,ry) on a shallow, tilting palm "bowl":
   - inertia: when the palm accelerates, the orb feels the opposite pseudo-force and lags / wobbles
   - tilt: the palm plane's roll (from landmarks) rolls it that way
   - fingers: each fingertip near the orb is a local force field; stroking pushes it, sweeping past it spins it
   - leaving the support edge (or being flung up) = it drops, fizzles, and respawns after a beat
   Units: px, s. Everything scales with hand size s (palm wrist→middle-knuckle length). */
export const DIFF={
 easy:  {k:150,c:16,edge:1.8,inertia:.22,g:2000,roll:.5,fk:.6, fr:1.1,spinK:.04,respawn:.5,lp:6}, /* v9: very forgiving: strong centering, heavy damping, smoothed palm accel */
 normal:{k:36,c:4.5,edge:.75,inertia:1,  g:2000,roll:1.2,fk:1.2,fr:1.0,spinK:.06,respawn:1.2},
 master:{k:16,c:2.6,edge:.55,inertia:1.25,g:2000,roll:1.5,fk:1.5,fr:.9,spinK:.07,respawn:1.6},
};
export const R0=.24; // orb radius / s (golf ball next to a palm)
export function orbNew(){ return {state:'gone',t:0,rx:0,ry:0,vx:0,vy:0,ang:0,w:0,x:0,y:0,wx:0,wy:0,stab:1,held:0,ev:[]}; }
/* palm tilt from landmarks: sin of the roll of wrist(0)→middle knuckle(9); + = leans right on screen → orb rolls right */
export function palmTilt(pts){ const dx=pts[9].x-pts[0].x, dy=pts[9].y-pts[0].y, l=Math.hypot(dx,dy)||1; return dx/l; }
/* rest point: a little above the palm centre, along the hand's up direction */
export function restPoint(palm,pts,s){ const dx=pts[9].x-pts[0].x, dy=pts[9].y-pts[0].y, l=Math.hypot(dx,dy)||1; return {x:palm.x+dx/l*s*.15,y:palm.y+dy/l*s*.15-s*.32}; }
/* H: {x,y rest point, ax,ay palm acceleration, vx,vy palm velocity, tilt, s, cup 0..1, tips:[{x,y,vx,vy}]} or null (no hand) */
export function orbStep(O,H,dt,P=DIFF.normal){ O.ev.length=0; O.t+=dt;
  if(O.state==='gone'){ if(H&&O.t>P.respawn){ Object.assign(O,{state:'held',t:0,rx:0,ry:0,vx:0,vy:0,w:0,stab:1,held:0}); O.ev.push('spawn'); } return O; }
  if(O.state==='fall'||O.state==='fly'){ O.wy+=(O.state==='fly'?P.g*.25:P.g)*dt*(H?.s||100)/100; O.x+=O.wx*dt; O.y+=O.wy*dt; O.ang+=O.w*dt; O.w*=Math.pow(.6,dt);
    if(O.t>(O.state==='fly'?.9:.7)){ O.ev.push(O.state==='fly'?'pop':'fizzle'); O.state='gone'; O.t=0; } return O; }
  // held
  if(!H){ return drop(O,0,0); }
  const s=H.s, g=P.g*s/100, k=P.k*(.6+.8*(H.cup||0)), edge=P.edge*s, rad=R0*s;
  let ax=H.ax, ayH=H.ay; if(P.lp){ O.sax=(O.sax??ax)+(ax-(O.sax??ax))*Math.min(1,dt*P.lp); O.say=(O.say??ayH)+(ayH-(O.say??ayH))*Math.min(1,dt*P.lp); ax=O.sax; ayH=O.say; }
  let fx=-ax*P.inertia + g*P.roll*H.tilt - k*O.rx - P.c*O.vx, fy=0, tq=0;
  // fingertip force fields (relative to the palm's own motion)
  const ox=H.x+O.rx, oy=H.y+O.ry;
  for(const T of H.tips||[]){ const dx=T.x-ox, dy=T.y-oy, d=Math.hypot(dx,dy), R=P.fr*s; if(d>R) continue;
    const f=1-d/R, rvx=T.vx-H.vx, rvy=T.vy-H.vy, side=Math.abs(dx)>Math.abs(dy)?1:.25; // a finger beside the orb pushes; one sweeping over/under it mostly spins it
    fx+=rvx*P.fk*f*1.6*side; fy+=rvy*P.fk*f*.8*side;
    tq+=(dx*rvy-dy*rvx)/Math.max(rad,d)/Math.max(rad,d)*f; }
  // vertical: gravity holds it on the palm floor unless the palm drops faster than gravity, or a finger flicks it up
  let ay=g - ayH*P.inertia + fy - k*.25*Math.min(0,O.ry) - P.c*O.vy*(O.ry<0?1:0);
  O.vx+=fx*dt; O.rx+=O.vx*dt; O.vy+=ay*dt; O.ry+=O.vy*dt; if(O.ry>0){ O.ry=0; if(O.vy>0) O.vy=0; }
  O.w+=tq*P.spinK*60*dt; O.w*=Math.pow(.5,dt); O.ang+=(O.vx/rad+O.w)*dt;
  const st=Math.max(0,1-Math.abs(O.rx)/edge)*Math.max(0,1+O.ry/(edge*1.3)); O.stab+=(st-O.stab)*Math.min(1,dt*8); O.held+=dt;
  if(Math.abs(O.rx)>edge||O.ry<-edge*1.3) return drop(O,H.vx+O.vx,H.vy+O.vy,H);
  O.x=H.x+O.rx; O.y=H.y+O.ry; return O; }
function drop(O,vx,vy,H){ O.state='fall'; O.t=0; if(H){ O.x=H.x+O.rx; O.y=H.y+O.ry; } O.wx=vx; O.wy=vy; O.ev.push('drop'); return O; }
/* existing moves / charge blast launch the orb */
export function orbLaunch(O,vx,vy,power=1){ if(!(O.state==='held'||(O.state==='fall'&&O.t<.5))) return false; /* a clap can knock it loose a moment before the release: still counts */ O.state='fly'; O.t=0; O.wx=vx; O.wy=vy; O.power=power; O.ev.push('launch'); return true; }
