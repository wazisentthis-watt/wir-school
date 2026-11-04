/**
 * WIR METAL · selective original-skeleton grip + impact/recovery choreography.
 * PROPOSAL / PUBLISH HOLD. Never invents finger bones, changes collision physics,
 * moves the player's root, or adds a save schema.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
const finite=v=>Number.isFinite(v)?v:0;
const valid=v=>v&&['x','y','z'].every(k=>Number.isFinite(v[k]));
const norm=v=>{const n=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/n,y:v.y/n,z:v.z/n};};

/** Maps real glTF joint names, never assumes any finger joint is present. */
export function classifyFingerBone(name){
 if(typeof name!=='string'||!name)return null;
 const lower=name.toLowerCase();
 const family=/(thumb|index|middle|ring|pinky|pinkie|little)/.exec(lower)?.[1];
 if(!family)return null;
 const f=family==='pinkie'||family==='little'?'pinky':family;
 const after=lower.slice(lower.indexOf(family)+family.length);
 const match=after.match(/^[^a-z0-9]*0?([1-4])(?:[^\d]|$)/);
 const segment=match?Number(match[1]):1;
 let side='unknown';
 if(/(?:^|[_.-])l(?:$|[_.-])|^left|left(?=thumb|index|middle|ring|pinky|little)/.test(lower))side='left';
 if(/(?:^|[_.-])r(?:$|[_.-])|^right|right(?=thumb|index|middle|ring|pinky|little)/.test(lower))side='right';
 return {family:f,side,segment};
}
/** Radian target only; actual local finger bend axis must be checked per glTF. */
export function plannedFingerCurl(info,strength){
 if(!info||typeof info!=='object')return 0;
 const per={thumb:.40,index:.70,middle:.85,ring:.92,pinky:.88};
 const base=per[info.family];
 if(!Number.isFinite(base))return 0;
 const segment=clamp(Number.isFinite(info.segment)?info.segment:1,1,4);
 return clamp(finite(strength),0,1)*base*(segment===1?.60:segment===2?1:segment===3?.85:.55);
}
export class GripChoreo{
 constructor(){this.grip=0;this.active=false;this.releaseCount=0;}
 step(dt,{grabbing=false,loading=0,relax=false}={}){
  dt=clamp(finite(dt),0,.065);
  const target=relax?0:grabbing?clamp(.50+.50*clamp(finite(loading),0,1),0,1):0;
  const prev=this.grip;
  this.grip+=(target-this.grip)*(1-Math.exp(-dt*(target>this.grip?15:12)));
  if(this.grip<.004)this.grip=0;
  if(prev>.05&&this.grip===0)this.releaseCount++;
  this.active=this.grip>.002;
  return {active:this.active,strength:this.grip,fingerMode:this.active?'detected-only':'rest',
   releaseCount:this.releaseCount};
 }
}
/** Stable knee plane when IK's requested pole nearly follows the thigh-to-ankle axis. */
export function stableKneePole(hip,target,pole){
 if(!valid(hip)||!valid(target))return {x:0,y:0,z:1};
 const axis=norm({x:target.x-hip.x,y:target.y-hip.y,z:target.z-hip.z});
 let p=valid(pole)?pole:{x:0,y:0,z:1};
 const d=p.x*axis.x+p.y*axis.y+p.z*axis.z;
 let lateral={x:p.x-d*axis.x,y:p.y-d*axis.y,z:p.z-d*axis.z};
 if(Math.hypot(lateral.x,lateral.y,lateral.z)<.002){
  const fallback=Math.abs(axis.z)<.9?{x:0,y:0,z:1}:{x:1,y:0,z:0};
  const projection=fallback.x*axis.x+fallback.y*axis.y+fallback.z*axis.z;
  lateral={x:fallback.x-projection*axis.x,y:fallback.y-projection*axis.y,z:fallback.z-projection*axis.z};
 }
 return norm(lateral);
}
/** Returns a purely VISUAL overlay after the existing CombatBody gravity solver runs. */
export class EnemyImpactChoreo{
 constructor(){this.mode='idle';this.clock=0;this.landed=false;this.impacts=0;this.recoveries=0;this.lastY=null;}
 step(dt,body,ground=.25){
  dt=clamp(finite(dt),0,.065);
  if(!body)return this.pose();
  const y=finite(body.position?.y),v=body.velocity||{x:0,y:0,z:0};
  const speed=Math.hypot(finite(v.x),finite(v.z)),vertical=finite(v.y);
  const active=body.state==='ragdoll-proxy';
  const touch=y<=ground+.025;
  if(active){
   if(this.mode==='idle'||this.mode==='recover'){this.landed=false;this.clock=0;}
   if(touch&&!this.landed){
    // A new throw can start on the ground; only count a genuine collision after flight.
    if(this.lastY!==null&&this.lastY>ground+.05){
     this.landed=true;this.impacts++;this.clock=0;
    }
   }
   this.mode=this.landed?'impact':'air';
   this.clock+=dt;
  }else if(this.mode==='air'||this.mode==='impact'){
   this.mode='recover';this.clock=0;this.recoveries++;
  }else if(this.mode==='recover'){
   this.clock+=dt;
   if(this.clock>=.55){this.mode='idle';this.clock=0;this.landed=false;}
  }
  this.lastY=y;
  return this.pose({speed,vertical});
 }
 pose({speed=0,vertical=0}={}){
  if(this.mode==='idle')return {phase:'idle',tilt:0,lean:0,compress:0,impacts:this.impacts,recoveries:this.recoveries};
  if(this.mode==='air')return {phase:'air',tilt:clamp(.12+speed*.04+Math.abs(vertical)*.012,.10,.75),
   lean:clamp(speed*.016,0,.25),compress:0,impacts:this.impacts,recoveries:this.recoveries};
  if(this.mode==='impact'){
   const settle=1-smooth(this.clock/.48);
   return {phase:'impact',tilt:.83*settle+.14,lean:.12*settle,compress:.19*settle,
    impacts:this.impacts,recoveries:this.recoveries};
  }
  const r=1-smooth(this.clock/.55);
  return {phase:'recover',tilt:.32*r,lean:.10*r,compress:.14*r,
   impacts:this.impacts,recoveries:this.recoveries};
 }
}
