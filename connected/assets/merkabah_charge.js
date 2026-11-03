// Galaxy Gallium Merkabah charge: pure, deterministic gameplay state.
export function createCharge(){return {active:false,time:0,balance:0,metal:0,capacity:0,stress:0,unstable:false,stage:0,emergency:false,reinforcements:false};}
export function stepCharge(c,dt,{charging=false,left=false,right=false,metalNearby=0}={}){
 dt=Math.max(0,Math.min(.05,dt));const events=[];
 if(charging){if(!c.active){c.active=true;events.push('CHARGE START');}c.time+=dt;
 c.capacity=Math.max(0,metalNearby);c.metal=Math.min(c.capacity,c.metal+dt*(.25+c.capacity*.12));
 if(left)c.balance=Math.max(-1,c.balance-.075);if(right)c.balance=Math.min(1,c.balance+.075);
 c.stress=Math.max(0,c.stress+dt*(.07+c.metal*.09+Math.max(0,-c.balance)*.24));
 c.stage=c.metal<.7?1:c.metal<2?2:3;
 if(c.balance<-.58||c.stress>.9){c.emergency=true;events.push('STRUCTURE CRITICAL · RETURN METAL');}
 if(c.balance>.65){c.unstable=true;c.reinforcements=true;events.push('CROWN OVERLOAD · FIVE STAR RESPONSE');}
 }else if(c.active){c.active=false;events.push('CHARGE RELEASE');}
 if(c.emergency){c.metal=Math.max(0,c.metal-dt*5);c.stress=Math.max(0,c.stress-dt*2);if(c.metal===0){c.emergency=false;c.balance=0;events.push('STRUCTURES RESTORED');}}
 else if(!c.active){c.stress=Math.max(0,c.stress-dt*.1);c.metal=Math.max(0,c.metal-dt*.12);}
 return events;
}
