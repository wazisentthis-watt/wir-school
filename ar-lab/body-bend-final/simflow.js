/* simflow.js - SIMULATED arm / chain motion laid over the stomp sim body, so the optional flow layer can be tried with no camera.
   PLACEHOLDER / PROPOSAL – not canon. Everything here is Simulated; nothing is real camera data.
   Uses the flow SimBody (each stage trails the one before it) and copies only its DELTAS onto the stomp body, laterally for hips / feet
   (hips and ankles never move up or down here, so the stomp recognizer is not disturbed). */
import {SimBody} from './flow.js';
const FLOW_T=.22, CW=.5625; // torso length (frame heights) and frame width used inside SimBody
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export class FlowSim{
  constructor(){ this.body=new SimBody(); this.t=0; }
  /* pts: 33 normalized stomp-body landmarks; inp: {drive,reach,together,tilt}; m = measure(pts,aspect); returns NEW array (pts is not modified) */
  apply(pts,aspect,dt,inp,m){ const P=this.body.step(dt,inp), s=m.T/FLOW_T, sx=m.sw/(.2*CW), kx=CW*sx/aspect, ky=s, kya=sx*.85; // arms use the shoulder-width scale on y too (the stomp stick body is stubbier than the flow body) // y scales with torso length, x with shoulder width (so palm / clap geometry matches the flow sim)
    const out=pts.map(p=>({...p})); const dX=(a,b)=>(a-b)*kx, dY=(a,b)=>(a-b)*ky;
    // hips and ankles: sideways only
    out[23].x+=dX(P[23].x,.44); out[24].x+=dX(P[24].x,.56);
    for(const [i,bx] of [[27,.44],[28,.56]]){ const d=dX(P[i].x,bx); out[i].x+=d; out[i+2].x+=d; out[i+4].x+=d; }
    // shoulders, head: follow the chain
    out[11].x+=dX(P[11].x,.4); out[11].y+=dY(P[11].y,.36); out[12].x+=dX(P[12].x,.6); out[12].y+=dY(P[12].y,.36);
    for(let i=0;i<=10;i++){ out[i].x+=dX(P[0].x,.5); }
    const fsm=mid(P[11],P[12]), nsm=mid(out[11],out[12]);
    // arms and hands: placed relative to the shoulder middle
    for(const i of [13,14,15,16,17,18,19,20]){ out[i]={...out[i],x:nsm.x+(P[i].x-fsm.x)*kx*1.2,y:nsm.y+(P[i].y-fsm.y)*kya,z:(P[i].z||0)*kx}; }
    out[21]={...out[15]}; out[22]={...out[16]}; return out; }
}
