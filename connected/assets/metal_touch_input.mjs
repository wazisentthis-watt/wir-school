// Shared touch input primitives for METAL Savannah. No storage, DOM or game state writes.
export function createPointerLatch(){
 const active=new Set();
 return {
  down(id){if(active.has(id))return false;const first=active.size===0;active.add(id);return first;},
  up(id){return active.delete(id)&&active.size===0;},
  has(id){return active.has(id);},
  clear(){const had=active.size>0;active.clear();return had;},
  get count(){return active.size;}
 };
}
export function touchStickVector(rect,clientX,clientY,deadzone=.035){
 const w=Math.max(1,Number(rect?.width)||1),h=Math.max(1,Number(rect?.height)||1);
 const radius=Math.max(1,Math.min(w,h)/2-12);
 let x=(clientX-rect.left-w/2)/radius,y=(clientY-rect.top-h/2)/radius;
 if(!Number.isFinite(x)||!Number.isFinite(y))return {x:0,y:0};
 const length=Math.hypot(x,y);
 if(length<deadzone)return {x:0,y:0};
 if(length>1){x/=length;y/=length;}
 return {x,y};
}
