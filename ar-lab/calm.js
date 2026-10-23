/* v9 "calm" layer: one place for the settings that make the lab simpler and steadier. Pure (no DOM) so tests can import it. */
export const CALM={
  on:true,
  cap:.2,       // particle layers keep at most 35% of their old max
  speed:.4,     // particles launch at 55% speed
  drag:2.2,     // extra drag per second (velocity *= e^-drag·dt) so things settle
  R:200,        // particles stay within this many px of where they were born
  dz:3.5,       // hand dead zone in px: smaller jitter than this does nothing
  mc:.7, beta:.015, // one-euro: low cutoff = heavy smoothing, small beta = still follows real moves
  modes:['water','fire','earth','air'], // simple set; atoms/gear/chem stay reachable from the ⋯ menu
  moves:{ // the few clear moves per mode (cup, fist, point and the two-palm charge are poses and always work)
    water:['ripple','pulse','push','bloom','curl'], fire:['bloom','push','curl'],
    earth:['scoop','bloom','push','curl'], air:['push','pulse','bloom','curl'] },
};
export const HINT={ water:'🤲 Cup to hold water · tilt to pour · 🙌 clap to blast', fire:'Orb rests on your palm · tilt gently · ✊ curl to put fire out',
  earth:'Scoop up to raise a rock · 💥 flick-open to break it', air:'Push to send a gust · 🙌 clap to blast' };
/* One-euro filter with a soft dead zone on the input. */
export class CalmFilter{ constructor(mc=CALM.mc,beta=CALM.beta,dz=CALM.dz){ Object.assign(this,{mc,b:beta,dz,x:null,dx:0}); }
  a(c,dt){ const r=2*Math.PI*c*dt; return r/(r+1); }
  f(v,dt){ if(this.x===null){ this.x=v; return v; } dt=Math.max(dt,1e-3);
    let d=v-this.x; const ad=Math.abs(d); d=ad<=this.dz?0:Math.sign(d)*(ad-this.dz); const t=this.x+d; // dead zone
    const dv=(t-this.x)/dt; this.dx+=this.a(1,dt)*(dv-this.dx); const c=this.mc+this.b*Math.abs(this.dx);
    this.x+=this.a(c,dt)*(t-this.x); return this.x; } }
/* Bound + settle one particle (used by fx Layer.step; also tested directly). Returns the new velocity pair. */
export function calmVel(x,y,vx,vy,ox,oy,dt,R=CALM.R){ const k=Math.exp(-CALM.drag*dt); vx*=k; vy*=k;
  const dx=x-ox, dy=y-oy, d=Math.hypot(dx,dy);
  if(d>R*.7){ const o=(d-R*.7)/(R*.3), ux=dx/d, uy=dy/d, out=vx*ux+vy*uy; // soft wall: pull back + kill outward speed
    if(out>0){ vx-=out*ux*Math.min(1,o); vy-=out*uy*Math.min(1,o); } vx-=ux*o*400*dt; vy-=uy*o*400*dt; }
  return [vx,vy]; }
/* Only keep the moves that belong to this mode. */
export function calmMoves(mv,mode){ const a=CALM.moves[mode]; return a&&mv?mv.filter(m=>a.includes(m)):mv; }
