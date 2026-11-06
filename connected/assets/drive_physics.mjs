// DRIVE PHYSICS — ported verbatim from the owner's "WIR ReFramer Rush 3D v0.1" (PROPOSAL / PUBLISH HOLD).
// Units are ReFramer Rush units (Rush HUD: speed×0.43 = mph). Connected maps 1 unit = 0.094 m (DRV.U in main.js) so top speed ≈ 30 m/s in Savannah.
var DrivePhysics=(function(){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const blend=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
function vehicle(x=350,y=1790,angle=-Math.PI/2){return {x,y,angle,vx:0,vy:0,yawRate:0,steer:0,nitro:100,charge:100,loadFront:1,loadRear:1,roll:0,driftAngle:0,driftTime:0,driftPoints:0,slipstream:0,boostSpool:0,lateralG:0,longitudinalG:0,frontTire:0,rearTire:0,distance:0};}
function deadzone(n,threshold=.13){const a=Math.abs(n);return a<=threshold?0:Math.sign(n)*(a-threshold)/(1-threshold);}
function step(c,a={},e={},dt=1/120){
 dt=clamp(dt,0,1/30);
 const road=e.road!==false,drift=!!a.drift,assist=e.assist||'street';
 const steer=clamp(a.steer||0,-1,1),gas=clamp(a.throttle||0,0,1),brake=clamp(a.brake||0,0,1);
 c.slipstream=blend(c.slipstream,clamp(e.draft||0,0,1),e.draft?2.2:1.8,dt);
 const ca=Math.cos(c.angle),sa=Math.sin(c.angle);
 const u=c.vx*ca+c.vy*sa,v=-c.vx*sa+c.vy*ca,speed=Math.hypot(c.vx,c.vy);
 c.steer=blend(c.steer,steer,road?9.6:6.5,dt);
 const angle=c.steer*(.59/(1+speed/560))*clamp(e.sensitivity||1,.5,1.5);
 const frontSlip=Math.atan2(v+c.yawRate*16.5,Math.max(37,Math.abs(u)))-angle*(Math.sign(u)||1);
 const rearSlip=Math.atan2(v-c.yawRate*17.5,Math.max(37,Math.abs(u)));
 const grip=(road?1:.43)*clamp(e.gripScale??1,.3,1.4);
 const fmax=565*grip*clamp(c.loadFront,.65,1.38)*(drift?.93:1);
 const rmax=530*grip*clamp(c.loadRear,.65,1.38)*(drift?.36:1);
 const ff=clamp(-frontSlip*1820,-fmax,fmax)*(1-.09*brake);
 const rf=clamp(-rearSlip*1950,-rmax,rmax)*(1-.12*gas-.19*brake);
 c.frontTire=ff/Math.max(fmax,1);c.rearTire=rf/Math.max(rmax,1);
 const boosting=!!a.nitro&&gas>.08&&c.nitro>.3;
 c.boostSpool=blend(c.boostSpool,boosting?1:0,boosting?4.8:7.1,dt);
 if(boosting)c.nitro=Math.max(0,c.nitro-25*dt);
 else c.nitro=Math.min(100,c.nitro+(2.9+c.slipstream*22)*dt);
 const resistance=(u>=0?1:-1)*(18+speed*speed*.00068*(1-c.slipstream*.58));
 const force=gas*(230+(speed<55?36:0))+brake*(u>9?-520:(u< -8?470:-95))+c.boostSpool*340+c.slipstream*45-resistance;
 const yawKick=drift&&Math.abs(u)>52?steer*2.35*(1+.25*Math.abs(c.steer)):0;
 const assistTorque=assist==='street'&&!drift?(-c.yawRate*.34-Math.atan2(v,Math.max(32,Math.abs(u)))*1.6):0;
 c.yawRate+=(((ff*16.5-rf*17.5)/1950)+yawKick+assistTorque-c.yawRate*(road?(drift?.62:1.08):1.55))*dt;
 c.yawRate=clamp(c.yawRate,-2.55,2.55);
 const lat=ff*.53+rf*.47;
 c.vx+=(ca*force-sa*lat)*dt;
 c.vy+=(sa*force+ca*lat)*dt;
 const limit=road?(boosting||c.boostSpool>.1?445:320):132;
 const sp=Math.hypot(c.vx,c.vy);if(sp>limit){c.vx*=limit/sp;c.vy*=limit/sp;}
 if(gas<.01&&brake<.01&&Math.hypot(c.vx,c.vy)<8){c.vx*=Math.exp(-3*dt);c.vy*=Math.exp(-3*dt);}
 c.angle+=c.yawRate*dt;
 c.x+=c.vx*dt;c.y+=c.vy*dt;c.distance+=Math.hypot(c.vx,c.vy)*dt;
 c.loadFront=blend(c.loadFront,clamp(1-force*.00084,.68,1.34),4.5,dt);c.loadRear=2-c.loadFront;
 c.roll=blend(c.roll,clamp(lat/540,-1,1),5,dt);
 const cc=Math.cos(c.angle),ss=Math.sin(c.angle);
 const ux=c.vx*cc+c.vy*ss,side=-c.vx*ss+c.vy*cc;
 c.driftAngle=Math.atan2(side,Math.max(25,Math.abs(ux)))*180/Math.PI;
 c.lateralG=lat/78.48;c.longitudinalG=force/78.48;
 if(Math.abs(c.driftAngle)>8&&speed>86){c.driftTime+=dt;c.driftPoints+=dt*Math.max(0,(Math.abs(c.driftAngle)-8)/21)*speed*.13;}
 return c;
}
function replay(commands,opts={}){
 const c=vehicle(opts.x||0,opts.y||0,opts.angle||0),trace=[];
 if(opts.speed)c.vx=Math.cos(c.angle)*opts.speed,c.vy=Math.sin(c.angle)*opts.speed;
 if(Number.isFinite(opts.nitro))c.nitro=opts.nitro;
 let time=0;
 for(const cmd of commands){const count=Math.round(cmd.seconds*120);for(let i=0;i<count;i++){
  step(c,cmd,{road:cmd.road!==false,draft:cmd.draft||0,assist:opts.assist||'street'},1/120);time+=1/120;
  if(i%30===0)trace.push({time:+time.toFixed(3),mph:+(Math.hypot(c.vx,c.vy)*.43).toFixed(2),drift:+c.driftAngle.toFixed(2),nitro:+c.nitro.toFixed(2),draft:+c.slipstream.toFixed(2),x:+c.x.toFixed(2),y:+c.y.toFixed(2)});
 }}return {state:c,trace};
}
function suite(){let rows=[],traces=[];const add=(name,pass,metric,expected,trace)=>{rows.push({name,pass:!!pass,metric,expected});if(trace)for(const t of trace)traces.push({test:name,...t});};
 let launch=replay([{seconds:5,throttle:1}]);let mph=Math.hypot(launch.state.vx,launch.state.vy)*.43;
 add('Paved acceleration',mph>85&&mph<160,mph.toFixed(1)+' mph','85–160 mph',launch.trace);
 let turn=replay([{seconds:1.3,steer:.75,throttle:.55}],{speed:170});let yaw=Math.abs(turn.state.angle*180/Math.PI);
 add('Turn-in / yaw',yaw>8&&yaw<150,yaw.toFixed(1)+'°','8–150°',turn.trace);
 let grip=replay([{seconds:1.8,steer:.73,throttle:.48}],{speed:175,assist:'expert'}),drift=replay([{seconds:1.8,steer:.73,throttle:.48,drift:true}],{speed:175,assist:'expert'});
 const cleanAngle=Math.abs(grip.state.driftAngle),slideAngle=Math.abs(drift.state.driftAngle);
 add('Drift vs grip',slideAngle>cleanAngle+4,slideAngle.toFixed(1)+'° / '+cleanAngle.toFixed(1)+'°','drift > grip +4°',drift.trace);
 let boost=replay([{seconds:3,throttle:1,nitro:true}],{speed:100}),bare=replay([{seconds:3,throttle:1}],{speed:100});let bp=Math.hypot(boost.state.vx,boost.state.vy)*.43, np=Math.hypot(bare.state.vx,bare.state.vy)*.43;
 add('Nitro spool / fuel',bp>np+8&&boost.state.nitro<85,bp.toFixed(1)+' vs '+np.toFixed(1)+' mph','boost +8 mph / fuel <85%',boost.trace);
 let wake=replay([{seconds:3.6,throttle:.5,draft:1}],{speed:150,nitro:35}),still=replay([{seconds:3.6,throttle:.5}],{speed:150,nitro:35});let recharge=wake.state.nitro-still.state.nitro;
 add('Slipstream / refill',wake.state.slipstream>.95&&recharge>25,'+'+recharge.toFixed(1)+'% nitro','>25% gain',wake.trace);
 const frontGas=replay([{seconds:1.25,throttle:1}],{speed:120}).state.loadFront,frontBrake=replay([{seconds:1.25,brake:1}],{speed:120}).state.loadFront;
 add('Longitudinal weight transfer',frontBrake>frontGas+.1,frontGas.toFixed(3)+' → '+frontBrake.toFixed(3),'front brake > gas +0.1');
 const first=replay([{seconds:1.1,steer:.72,throttle:.45,drift:true}],{speed:175,assist:'expert'}),caught=replay([{seconds:1.1,steer:.72,throttle:.45,drift:true},{seconds:1.1,steer:-.7,throttle:.3}],{speed:175,assist:'expert'});
 const a=Math.abs(first.state.driftAngle),b=Math.abs(caught.state.driftAngle);
 add('Countersteer recovery',b<a*.6,a.toFixed(1)+'° → '+b.toFixed(1)+'°','slide angle -40%',caught.trace);
 let dirt=replay([{seconds:5,throttle:1,road:false}]);const dirtMph=Math.hypot(dirt.state.vx,dirt.state.vy)*.43;
 add('Offroad speed penalty',dirtMph<mph*.7,dirtMph.toFixed(1)+' mph','<70% of paved',dirt.trace);
 const cmds=[{seconds:1,throttle:.8,steer:.4},{seconds:1.4,throttle:.7,drift:true,steer:-.5},{seconds:2,brake:.3,steer:.2}];
 let one=replay(cmds),two=replay(cmds);add('Deterministic replay',JSON.stringify(one.state)===JSON.stringify(two.state),'byte-identical','identical',one.trace);
 add('Stick deadzone',deadzone(.08,.15)===0&&deadzone(.72,.15)>.6,'0.08→0 / 0.72→'+deadzone(.72,.15).toFixed(2),'zero / >0.60');
 return {passed:rows.filter(r=>r.pass).length,total:rows.length,rows,traces};
}
return {vehicle,step,replay,suite,deadzone,clamp};
})();
export default DrivePhysics;
export const {vehicle,step,replay,suite,deadzone}=DrivePhysics;
