/* v8 fire limits + extinguish rule (pure, Node-tested). */
export const FIRE={cap:260,maxObj:2};
/* a hand smothers/douses a fire under it: fist, curl, palm-down over it, or any hand over it in water mode */
export function dousing(p,box,mode){ if(!p) return 0; const pad=(p.s||90)*.5;
  if(p.x<box.x-pad||p.x>box.x+box.w+pad||p.y<box.y-pad*2.2||p.y>box.y+box.h+pad) return 0;
  if(mode==='water') return 1.4; const mv=p.mv||[]; if(p.g==='fist'||mv.includes('curl')||mv.includes('palmDown')||p.st?.palmDown) return 1; return 0; }
