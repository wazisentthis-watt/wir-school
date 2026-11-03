// Physics acceptance checks: pure analysis, never changes gameplay.
export function analyzePhysics(samples,{minJumpHeight=.35,maxJumpHeight=5,maxLandingSpeed=30,maxGroundDrift=1.2}={}){
 const events=[],issues=[];
 if(!Array.isArray(samples)||samples.length<2)return {events,issues,summary:{samples:samples?.length||0,jumps:0,landings:0}};
 let takeoff=null,peak=-Infinity,jumps=0,landings=0;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i];
  if(!Number.isFinite(b.dt)||b.dt<=0||!Number.isFinite(b.position?.y)||!Number.isFinite(b.verticalSpeed)){issues.push({kind:'invalid-sample',index:i});continue;}
  if(a.grounded&&!b.grounded&&!b.wall&&!b.swing&&!b.flying){takeoff={time:b.time,y:a.position.y};peak=b.position.y;}
  if(takeoff&&!b.grounded)peak=Math.max(peak,b.position.y);
  if(takeoff&&!a.grounded&&b.grounded){
   const height=Math.max(0,peak-takeoff.y),airtime=b.time-takeoff.time;
   events.push({kind:'jump',height,airtime,landingSpeed:Math.max(0,-a.verticalSpeed),time:b.time});
   jumps++;landings++;
   if(height<minJumpHeight||height>maxJumpHeight)issues.push({kind:'jump-height',height,time:b.time});
   if(-a.verticalSpeed>maxLandingSpeed)issues.push({kind:'hard-landing',speed:-a.verticalSpeed,time:b.time});
   takeoff=null;
  }
  if(a.grounded&&b.grounded&&!b.board&&!b.wall&&!b.swing&&!b.flying&&a.speed<.15&&b.speed>maxGroundDrift)
   issues.push({kind:'ground-velocity-spike',speed:b.speed,time:b.time});
 }
 return {events,issues,summary:{samples:samples.length,jumps,landings}};
}
