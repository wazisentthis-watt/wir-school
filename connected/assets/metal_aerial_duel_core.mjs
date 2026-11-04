// METAL Rooftop Duel Pilot 01 · independent physics/rules, no DOM/Three or saved-game writes.
// All combat tuning is PROPOSAL; 1 unit = 1 world metre. PUBLISH HOLD.
import {PACK02_COUNTER} from './reframer_animation_pack02_design.mjs';
export const DUEL_ROOF=Object.freeze({halfX:14,halfZ:11,gravity:18,enemyMass:85});
export const DUEL_ACTIONS=Object.freeze(['light','launch','pursue','finisher','dodge']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const length3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const length2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const fighter=(x,z,hp)=>({x,y:0,z,vx:0,vy:0,vz:0,hp,stun:0,airborne:false});
export function createRooftopDuel({airCounter=false}={}){
 return {mode:'ACTIVE',time:0,player:fighter(-1.2,0,1),enemy:fighter(1.2,0,.78),
  combo:0,comboWindow:0,comboHits:0,energy:1,airChase:0,finisherLanded:false,
  cooldown:0,dodgeTime:0,aiCooldown:2.3,aiWindup:0,enemyAttacks:0,
  roofImpacts:0,wallImpacts:0,events:[],sequence:0,outcome:null,
  airCounterEnabled:!!airCounter,airCounterUsed:false,airCounterWindup:0,airCounterCount:0};
}
function emit(s,type,data={}){const e={id:++s.sequence,type,t:Number(s.time.toFixed(3)),...data};s.events.push(e);if(s.events.length>30)s.events.shift();return e;}
function hurtEnemy(s,damage,{stun=.4,push=1.2}={}){
 const e=s.enemy,p=s.player,dx=e.x-p.x,dz=e.z-p.z,len=Math.hypot(dx,dz)||1;
 e.hp=clamp(e.hp-damage,0,1);e.stun=Math.max(e.stun,stun);
 e.vx+=dx/len*push;e.vz+=dz/len*push;
}
export function duelAction(s,action){
 if(s?.mode!=='ACTIVE')return {ok:false,reason:'duel-not-active'};
 if(!DUEL_ACTIONS.includes(action))return {ok:false,reason:'unsupported-action'};
 const p=s.player,e=s.enemy,d=length3(p,e),flat=length2(p,e);
 if(action==='dodge'){
  if(s.cooldown>0)return {ok:false,reason:'cooldown'};
  s.cooldown=.25;s.dodgeTime=.58;
  const side=Math.abs(e.z-p.z)<.5?1:-1;p.vx+=side*6;p.vz-=2;
  return {ok:true,event:emit(s,'dodge')};
 }
 // A confirmed launcher can transition straight into pursuit; recovery still protects
 // ground strikes and the finisher, and a chase cannot be restarted repeatedly.
 if(s.cooldown>0&&action!=='pursue')return {ok:false,reason:'cooldown'};
 if(action==='light'){
  if(p.y>.75||e.y>.75)return {ok:false,reason:'ground-strikes-only'};
  s.cooldown=.23;s.comboWindow=1.2;
  const landed=flat<=3.35;
  if(!landed){s.combo=0;return {ok:false,reason:'out-of-range',event:emit(s,'miss')};}
  s.combo=Math.min(3,s.combo+1);s.comboHits++;
  hurtEnemy(s,s.combo===3?.14:.12,{stun:.42,push:.48});
  return {ok:true,event:emit(s,'light-hit',{combo:s.combo,enemyHP:e.hp})};
 }
 if(action==='launch'){
  if(s.combo<2)return {ok:false,reason:'build-two-hit-chain'};
  if(flat>3.6||e.y>.3)return {ok:false,reason:'enemy-not-grounded-nearby'};
  s.cooldown=.35;s.combo=0;s.comboWindow=0;
  hurtEnemy(s,.15,{stun:1.65,push:1.7});
  e.vy=13;e.airborne=true;
  return {ok:true,event:emit(s,'launch',{enemyHP:e.hp})};
 }
 if(action==='pursue'){
  if(s.airChase>0)return {ok:false,reason:'already-pursuing'};
  if(e.y<.65)return {ok:false,reason:'launch-opponent-first'};
  if(s.energy<.1)return {ok:false,reason:'low-energy'};
  s.energy-=.1;s.cooldown=.22;s.airChase=1.9;
  const dx=e.x-p.x,dz=e.z-p.z,len=Math.hypot(dx,dz)||1;
  p.vx=dx/len*9;p.vz=dz/len*9;p.vy=Math.max(11,p.vy);
  p.airborne=true;
  return {ok:true,event:emit(s,'air-pursuit')};
 }
 if(action==='finisher'){
  if(s.airChase<=0||p.y<.65||e.y<.65)return {ok:false,reason:'pursue-into-air'};
  if(d>4.4)return {ok:false,reason:'move-closer'};
  if(s.energy<.2)return {ok:false,reason:'low-energy'};
  s.cooldown=.55;s.energy-=.2;s.airChase=0;s.finisherLanded=true;
  s.airCounterWindup=0;s.airCounterUsed=true; // confirmed finisher cancels the counter telegraph
  hurtEnemy(s,.47,{stun:1.9,push:12});
  e.vy=-15.5;e.airborne=true;
  p.vy=Math.min(p.vy,1);
  return {ok:true,event:emit(s,'aerial-finisher',{enemyHP:e.hp})};
 }
 return {ok:false,reason:'unhandled-action'};
}
function stepActor(body,dt,isEnemy,s){
 const airborne=body.y>.001||body.vy>0;
 if(airborne)body.vy-=DUEL_ROOF.gravity*dt;
 body.x+=body.vx*dt;body.y+=body.vy*dt;body.z+=body.vz*dt;
 body.vx*=Math.exp(-2.6*dt);body.vz*=Math.exp(-2.6*dt);
 for(const axis of ['x','z']){
  const limit=axis==='x'?DUEL_ROOF.halfX:DUEL_ROOF.halfZ;
  if(Math.abs(body[axis])>limit){
   const power=Math.abs(body['v'+axis]);
   body[axis]=clamp(body[axis],-limit,limit);
   body['v'+axis]*=-.16;
   if(isEnemy&&power>4){s.wallImpacts++;body.hp=clamp(body.hp-.07,0,1);body.stun=Math.max(body.stun,.5);emit(s,'roof-wall-impact',{speed:power});}
  }
 }
 if(body.y<=0){
  if(airborne&&isEnemy&&body.vy< -5){
   const impactSpeed=-body.vy;s.roofImpacts++;
   body.stun=Math.max(body.stun,.8);
   emit(s,'roof-floor-impact',{speed:impactSpeed,enemyHP:body.hp});
   if(s.finisherLanded||body.hp<=0){s.mode='VICTORY';s.outcome='reframer-contained';emit(s,'victory');}
  }
  body.y=0;body.vy=0;body.airborne=false;
 }else body.airborne=true;
}
export function stepRooftopDuel(s,dt,controls={}){
 if(s?.mode!=='ACTIVE')return s;
 dt=clamp(dt,0,.05);if(dt===0)return s;
 s.time+=dt;
 const p=s.player,e=s.enemy;
 s.cooldown=Math.max(0,s.cooldown-dt);
 s.comboWindow=Math.max(0,s.comboWindow-dt);if(s.comboWindow===0)s.combo=0;
 s.airChase=Math.max(0,s.airChase-dt);
 s.dodgeTime=Math.max(0,s.dodgeTime-dt);
 e.stun=Math.max(0,e.stun-dt);p.stun=Math.max(0,p.stun-dt);
 const dx=clamp(controls.x||0,-1,1),dz=clamp(controls.z||0,-1,1),l=Math.hypot(dx,dz)||1;
 if(p.stun<=0){
  if(p.y<=.01){
   p.vx+=(dx/l*6-p.vx)*Math.min(1,dt*12);
   p.vz+=(dz/l*6-p.vz)*Math.min(1,dt*12);
  }else if(s.airChase>0&&e.y>.1){
   const vx=e.x-p.x,vz=e.z-p.z,dd=Math.hypot(vx,vz)||1;
   // Bounded air pursuit: meters/second, not teleport or hovering.
   const aimX=vx/dd*12,aimZ=vz/dd*12;
   p.vx+=(aimX-p.vx)*Math.min(1,dt*7);
   p.vz+=(aimZ-p.vz)*Math.min(1,dt*7);
   p.vy+=(clamp((e.y-p.y)*2,-5,10)-p.vy)*Math.min(1,dt*1.4);
  }else{
   p.vx+=dx/l*dt*3;p.vz+=dz/l*dt*3;
  }
 }
 if(e.y<=.01&&e.stun<=0){
  const d=length2(p,e);
  s.aiCooldown=Math.max(0,s.aiCooldown-dt);
  if(s.aiWindup>0){
   s.aiWindup=Math.max(0,s.aiWindup-dt);
   if(s.aiWindup===0){
    if(d<2.65&&p.y<1.5){
     if(s.dodgeTime>0){emit(s,'perfect-evade');}
     else {p.hp=clamp(p.hp-.12,0,1);p.stun=.3;const len=d||1;p.vx+=(p.x-e.x)/len*5;p.vz+=(p.z-e.z)/len*5;emit(s,'reframer-strike',{playerHP:p.hp});}
    }else emit(s,'reframer-missed');
    s.enemyAttacks++;s.aiCooldown=1.6;
   }
  }else if(s.aiCooldown<=0&&d<2.8){
   s.aiWindup=.68;emit(s,'reframer-telegraph');
  }else if(d>2.15){
   const len=d||1;e.vx+=(p.x-e.x)/len*dt*13;e.vz+=(p.z-e.z)/len*dt*13;
   const speed=Math.hypot(e.vx,e.vz);
   if(speed>2.8){e.vx=e.vx/speed*2.8;e.vz=e.vz/speed*2.8;}
  }
 }
 // Optional ReFramer air counter is isolated behind Pack 02's explicit URL flag.
 // A true finite wind-up gives METAL time to press B and evade; exactly one
 // aerial counter opportunity is available in a single launch/pursuit exchange.
 if(s.airCounterEnabled&&!s.finisherLanded){
  if(s.airCounterWindup>0){
   s.airCounterWindup=Math.max(0,s.airCounterWindup-dt);
   if(s.airCounterWindup===0){
    s.airCounterUsed=true;s.airCounterCount++;
    const distance=length3(p,e);
    if(p.y>.35&&e.y>.35&&distance<PACK02_COUNTER.range){
     if(s.dodgeTime>0)emit(s,'reframer-air-counter-evaded');
     else{
      p.hp=clamp(p.hp-PACK02_COUNTER.damage,0,1);
      p.stun=Math.max(p.stun,PACK02_COUNTER.stun);
      const norm=Math.hypot(p.x-e.x,p.z-e.z)||1;
      p.vx+=(p.x-e.x)/norm*PACK02_COUNTER.knockback;
      p.vz+=(p.z-e.z)/norm*PACK02_COUNTER.knockback;
      p.vy=Math.max(0,p.vy)+1.5;
      emit(s,'reframer-air-counter-hit',{playerHP:p.hp});
     }
    }else emit(s,'reframer-air-counter-missed');
   }
  }else if(!s.airCounterUsed&&s.airChase>.15&&p.y>.6&&e.y>1.05&&length3(p,e)<4.4){
   s.airCounterWindup=PACK02_COUNTER.windup;
   emit(s,'reframer-air-counter-telegraph');
  }
 }
 stepActor(p,dt,false,s);
 stepActor(e,dt,true,s);
 if(p.hp<=0){s.mode='DEFEAT';s.outcome='player-downed';emit(s,'defeat');}
 if(s.time>=150&&s.mode==='ACTIVE'){s.mode='DEFEAT';s.outcome='time-limit';emit(s,'defeat');}
 return s;
}
export function duelSnapshot(s){return JSON.parse(JSON.stringify({
 mode:s.mode,time:s.time,player:s.player,enemy:s.enemy,combo:s.combo,comboHits:s.comboHits,
 energy:s.energy,roofImpacts:s.roofImpacts,wallImpacts:s.wallImpacts,events:s.events,outcome:s.outcome,
 airCounterEnabled:s.airCounterEnabled,airCounterWindup:s.airCounterWindup,airCounterCount:s.airCounterCount
}));}
