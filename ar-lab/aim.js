/* v6 aim + guard rules (pure, Node-tested). Used by burn.js.
   Ignite: a fire hot-spot's CENTER must be inside the object box (small pad), and stay there IGN_DWELL seconds.
   People/animals: never burnable. The "not the person" warning only fires when an AIMED fire source (fingertip flame,
   thrown fireball, blast) dwells on the face/torso core of the box. Held flames in front of your body (keeper flame,
   cupped ember) are ignored, because in selfie view the person box is always behind the hands. */
export const AIM={PAD:12,IGN_DWELL:.25,WARN_DWELL:.6,DECAY:2};
export function inBox(h,b,pad=AIM.PAD){ return h.x>b.x-pad&&h.x<b.x+b.w+pad&&h.y>b.y-pad&&h.y<b.y+b.h+pad; }
export function inCore(h,b){ return h.x>b.x+b.w*.2&&h.x<b.x+b.w*.8&&h.y>b.y&&h.y<b.y+b.h*.65; }
/* o: {box,safe,aimT,warnT}; hots: [{x,y,r,held?}]. returns {ignite:hot|null, warn:bool} */
export function aimStep(o,hots,dt){ const b=o.box; o.aimT=o.aimT||0; o.warnT=o.warnT||0;
  if(o.safe){ const h=hots.find(h=>!h.held&&inCore(h,b)); o.warnT=h?o.warnT+dt:Math.max(0,o.warnT-dt*AIM.DECAY);
    const warn=o.warnT>=AIM.WARN_DWELL; if(warn) o.warnT=0; return {ignite:null,warn}; }
  const h=hots.find(h=>inBox(h,b)); o.aimT=h?o.aimT+dt:Math.max(0,o.aimT-dt*AIM.DECAY);
  return {ignite:h&&(o.aimT>=AIM.IGN_DWELL||o.fire>0)?h:null,warn:false}; }
/* pose debounce with hysteresis: entering 'cup' needs CUP_IN frames, leaving it needs CUP_OUT; other poses POSE_IN */
export const DB={CUP_IN:6,CUP_OUT:4,POSE_IN:3,FIST_IN:6,POKE_IN:2};
export function poseDebounce(D,g){ D.cand===g?D.cn++:(D.cand=g,D.cn=1); const cur=D.g;
  let need=g==='cup'?DB.CUP_IN:g==='fist'?DB.FIST_IN:g==='poke'?DB.POKE_IN:DB.POSE_IN; if(cur==='cup'&&g!=='cup') need=Math.max(need,DB.CUP_OUT);
  if(D.cn>=need) D.g=g; return D.g; }
/* ember: must be cupped >= HOLD s before it can be thrown; throw only on flick-open (open) or a fast flick out of the cup */
export const EMBER_HOLD=.5;
export function emberRelease(heldFor,g,swipe){ return heldFor>=EMBER_HOLD&&g!=='cup'&&(g==='open'||swipe); }
