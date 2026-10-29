/* Body Bend FLOW (kinetic-chain string prototype) - PLACEHOLDER / PROPOSAL, not canon. LOCAL prototype, not pushed.
   Coach's vision: motion flows feet -> hips -> spine -> shoulders -> arm -> fingers and a glowing string leaves the body at the end of the chain.
   Calm, heavy, steady. NO pinch, NO two-fingers-up. Palm angle = wrist skill; two palms together = charge; clap = early release.
   String TYPES are PLACEHOLDER (String A/B/C). No lore, no harm mechanics of any kind: strings only paint light, nudge soft seeds, or grow harmless glow.
   Every score/data label says Simulated. Pure core (Node-tested) first; the browser app (camera, canvas) is startApp() at the bottom. MIT.
   Relation to /workspace/game_upload_staging/camera-bending-game (wir-bending, "Attuned Star"): that one detects DISCRETE moves (stomp, strike...) with a
   Five-Stack/technique table. This one measures CONTINUOUS flow of the chain. Separate files, nothing imported; Attunement-only, no crossover with other properties. */
(function(root){
'use strict';
/* ---------- tunable CALM constants (all in one place) ---------- */
var CALM={
  tauPose:.14,      // s, landmark low-pass: bigger = heavier/steadier
  deadZone:.006,    // fraction of torso length: jitter smaller than this does nothing
  tauAct:.16,       // s, smoothing of each chain stage's activity
  stageGain:[2.9,2.2,2.5,2.2,1.6,11],   // feet,hips,spine,shoulders,arm,fingers -> activity ~1 when vigorous (PLACEHOLDER tuning)
  actMin:.06,       // stage counts as "used" above this mean activity
  window:2.0,       // s of history for flow measurement
  lagMin:.03, lagMax:.7, corrMin:.3,  // ordered-chain lag window in s
  j0:6.0,           // smoothness: bigger = more forgiving of jerk
  rise:.7, fall:1.6,  // s, flow meter rise/fall (calm)
  restBelow:.04,    // total activity under this = resting
  stringSegs:16, stringLen:.22,   // segments, base segment length (torso units)
  stringDamp:.90, stringFollow:.10, maxStringSpeed:2.2, // per-frame damp, soft follow, torso-units/s speed cap
  seedCount:14, seedHome:.9, seedR:.45, seedMaxV:.55, seedDrag:2.6, seedPush:.9, // soft-object physics (torso units)
  chargeTime:3.0, together:.55, clapFrom:1.1, clapSpeed:2.5, // palms together (shoulder-widths) / clap
  palmMin:.25, palmMax:.9 // palm facing range mapped to string focus
};
var STAGES=['Feet','Hips','Spine','Shoulders','Arm','Fingers'];
var LM={nose:0,lSh:11,rSh:12,lEl:13,rEl:14,lWr:15,rWr:16,lPk:17,rPk:18,lIx:19,rIx:20,lHip:23,rHip:24,lAn:27,rAn:28};
var STRINGS=[ // PLACEHOLDER types: neutral names only. Behaviours are harmless demo behaviours, NOT canon.
  {id:'A',label:'String A (PLACEHOLDER)',color:[.35,.85,1],behaviour:'paint'},
  {id:'B',label:'String B (PLACEHOLDER)',color:[1,.75,.4],behaviour:'nudge'},
  {id:'C',label:'String C (PLACEHOLDER)',color:[.8,.55,1],behaviour:'grow'}];
var LABELS={badge:'PLACEHOLDER / PROPOSAL - not canon',sim:'Simulated',
  flow:'Flow (Simulated)',score:'Seeds nudged (Simulated)',charge:'Charge (Simulated)',ethic:"Don't get smart to hurt nobody."};
var GESTURES=['palm-angle','palms-together-charge','clap-release']; // pinch and two-fingers-up are deliberately absent
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function sstep(a,b,v){var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
function mid(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function rng(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

/* ---------- simulated pose generator (no camera needed). Normalized 0..1 landmarks, 33 pts, y down ---------- */
function SimBody(){ this.t=0; this.h=[]; this.stiff=false; }
SimBody.LAGS=[0,.06,.12,.18,.26,.34]; // each stage trails the one before it: this IS the "flow"
SimBody.prototype.drive=function(t){ var h=this.h; if(!h.length) return 0; if(t<=h[0][0]) return h[0][1];
  for(var i=h.length-1;i>=0;i--) if(h[i][0]<=t){ var a=h[i],b=h[i+1]||h[i]; var k=b[0]>a[0]?(t-a[0])/(b[0]-a[0]):0; return a[1]+(b[1]-a[1])*k; } return h[0][1]; };
/* inp: {drive:-1..1 body sway, reach:0..1 raise hand, together:0..1 palms together, tilt:0..1 palm angle (1=palm faces camera), hand:'r'|'l'} */
SimBody.prototype.step=function(dt,inp){ this.t+=dt; this.h.push([this.t,clamp(inp.drive||0,-1,1)]); while(this.h.length>2&&this.h[1][0]<this.t-1.5) this.h.shift();
  var L=this.stiff?[0,0,0,0,0,0]:SimBody.LAGS, self=this, d=function(i){return self.drive(self.t-L[i]);};
  var P=[],i; for(i=0;i<33;i++) P.push({x:.5,y:.5,z:0,v:1});
  var set=function(k,x,y,z){P[k].x=x;P[k].y=y;P[k].z=z||0;};
  var hipsX=.5+.04*d(1), hipY=.58+.025*d(0), shMidX=hipsX+.05*d(2), tilt=.03*d(3), shY=.36;
  set(LM.lHip,hipsX-.06,hipY); set(LM.rHip,hipsX+.06,hipY);
  set(LM.lSh,shMidX-.1+.01*d(3),shY-tilt); set(LM.rSh,shMidX+.1+.01*d(3),shY+tilt);
  set(LM.nose,shMidX+.01*d(3),.22);
  set(LM.lAn,.44+.01*d(0),.92); set(LM.rAn,.56-.01*d(0),.92);
  var reach=inp.reach==null?.3:inp.reach, tog=clamp(inp.together||0,0,1), tl=inp.tilt==null?.8:inp.tilt, right=inp.hand!=='l';
  var chest={x:shMidX,y:.42};
  var side=function(sgn,active){ var sh=P[sgn>0?LM.rSh:LM.lSh], w;
    if(active) w={x:sh.x+sgn*(.06+.1*reach)+.12*d(4),y:sh.y+.28-.34*reach+.05*d(4)}; else w={x:sh.x+sgn*.03+.02*d(4),y:sh.y+.3};
    w.x+=(chest.x+sgn*.015-w.x)*tog; w.y+=(chest.y-w.y)*tog;
    var wr=sgn>0?LM.rWr:LM.lWr, ix=sgn>0?LM.rIx:LM.lIx, pk=sgn>0?LM.rPk:LM.lPk, el=sgn>0?LM.rEl:LM.lEl;
    set(el,(sh.x+w.x)/2+sgn*.02,(sh.y+w.y)/2+.02); set(wr,w.x,w.y);
    var f=.03*d(5), sp=.025, facing=clamp(tl,0,1); // palm facing camera: index/pinky spread across x; turned away: they stack in depth (z)
    set(ix,w.x-sgn*sp*facing+f,w.y-.05,-sp*(1-facing)*2);
    set(pk,w.x+sgn*sp*facing,w.y-.04,sp*(1-facing)*2); };
  side(1,right); side(-1,!right);
  set(25,.45,.75); set(26,.55,.75);
  return P; };

/* ---------- engine ---------- */
function Engine(opts){ opts=opts||{}; this.rand=rng(opts.seed||7); this.C=opts.calm||CALM; this.reset(); }
Engine.prototype.reset=function(){ var C=this.C,r=this.rand,i;
  this.t=null; this.sm=null; this.prev=null; this.torso=120; this.hist=[]; this.act=[0,0,0,0,0,0]; this.lead='r'; this.leadScore={l:0,r:0};
  this.q={flow:0,seq:0,smooth:0,cover:0,shown:0,resting:true,lags:[]};
  this.charge=0; this.togetherT=0; this.apartT=0; this.chargeAtOpen=0; this.clapped=false; this.distHist=[]; this.events=[]; this.pulses=[]; this.palm=.5; this.palmShown=.5;
  this.stringId=this.stringId||0; this.str=[]; for(i=0;i<C.stringSegs;i++) this.str.push({x:0,y:0,vx:0,vy:0}); this.strInit=false; this.head=null; this.headV={x:0,y:0};
  this.trail=[]; this.nudged=0; this.seeds=[];
  for(i=0;i<C.seedCount;i++){ var a=r()*Math.PI*2, d=Math.sqrt(r())*C.seedHome; var s={hx:Math.cos(a)*d*.9,hy:-.2+Math.sin(a)*d*.7,x:0,y:0,vx:0,vy:0,glow:0,size:1,touched:false}; s.x=s.hx; s.y=s.hy; this.seeds.push(s); }
  this.totalAct=0; };
/* seed coordinates are in torso units relative to the hips so the scene scales with the player */
Engine.prototype.setString=function(i){ this.stringId=((i%STRINGS.length)+STRINGS.length)%STRINGS.length; };
Engine.prototype.smoothPts=function(pts,dt){ var C=this.C,a=1-Math.exp(-dt/C.tauPose),dz=C.deadZone*this.torso,i;
  if(!this.sm){ this.sm=pts.map(function(p){return {x:p.x,y:p.y,z:p.z||0,v:p.v==null?1:p.v};}); return this.sm; }
  for(i=0;i<pts.length;i++){ var s=this.sm[i],p=pts[i],dx=p.x-s.x,dy=p.y-s.y; if(Math.hypot(dx,dy)<dz){dx=0;dy=0;}
    s.x+=dx*a; s.y+=dy*a; s.z+=((p.z||0)-s.z)*a; s.v=p.v==null?1:p.v; }
  return this.sm; };
/* palm facing the camera, 0..1, from wrist/index/pinky (hand landmarks 0,5,17 if given, else pose wrist/index/pinky) */
function palmFacing(w,ix,pk){ var ax=ix.x-w.x,ay=ix.y-w.y,az=(ix.z||0)-(w.z||0), bx=pk.x-w.x,by=pk.y-w.y,bz=(pk.z||0)-(w.z||0);
  var nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx, m=Math.hypot(nx,ny,nz); return m<1e-9?.5:Math.abs(nz)/m; }
/* frame: {t seconds, pts: 33 pose points in screen px (already mirrored if selfie), hands: [{pts:21}] optional} */
Engine.prototype.update=function(frame){ var C=this.C,t=frame.t,pts=frame.pts,dt;
  if(this.t===null) dt=1/30; else dt=clamp(t-this.t,1/120,.1); this.t=t; this.events=[];
  if(!pts||pts.length<29){ this.decay(dt); this.stepWorld(dt,null); return this.state(); }
  var S=this.smoothPts(pts,dt), tors=dist(mid(S[LM.lSh],S[LM.rSh]),mid(S[LM.lHip],S[LM.rHip])); if(tors>10) this.torso+=(tors-this.torso)*(1-Math.exp(-dt/.5));
  var T=this.torso, shMid=mid(S[LM.lSh],S[LM.rSh]), hipMid=mid(S[LM.lHip],S[LM.rHip]), anMid=mid(S[LM.lAn],S[LM.rAn]), i;
  var lean=Math.atan2(shMid.x-hipMid.x,hipMid.y-shMid.y), shTilt=Math.atan2(S[LM.rSh].y-S[LM.lSh].y,S[LM.rSh].x-S[LM.lSh].x), legH=(anMid.y-hipMid.y)/T;
  var sides={l:{w:S[LM.lWr],s:S[LM.lSh],ix:S[LM.lIx],pk:S[LM.lPk]},r:{w:S[LM.rWr],s:S[LM.rSh],ix:S[LM.rIx],pk:S[LM.rPk]}};
  var hand=null; if(frame.hands) for(var hi=0;hi<frame.hands.length;hi++){ var H=frame.hands[hi]; if(H&&H.pts&&H.pts.length>=21){ var sd0=H.pts[0].x<hipMid.x?'l':'r'; if(!hand) hand={}; hand[sd0]=H.pts; } }
  var pr=this.prev, sig=[0,0,0,0,0,0];
  var snap={shMid:shMid,hipMid:hipMid,anMid:anMid,lean:lean,shTilt:shTilt,legH:legH,l:{w:sides.l.w.x-shMid.x,wy:sides.l.w.y-shMid.y},r:{w:sides.r.w.x-shMid.x,wy:sides.r.w.y-shMid.y},
    fl:{x:sides.l.ix.x-sides.l.w.x,y:sides.l.ix.y-sides.l.w.y},fr:{x:sides.r.ix.x-sides.r.w.x,y:sides.r.ix.y-sides.r.w.y}};
  if(hand){ for(var sd in hand){ var f=hand[sd][8],w=hand[sd][0]; snap['f'+sd]={x:f.x-w.x,y:f.y-w.y}; } }
  var armSp={l:0,r:0};
  if(pr){ var k=1/dt;
    sig[0]=(Math.abs(snap.legH-pr.legH)*k+dist(snap.anMid,pr.anMid)/T*k)*.5;
    sig[1]=dist(snap.hipMid,pr.hipMid)/T*k;
    sig[2]=Math.abs(snap.lean-pr.lean)*k*.7;
    sig[3]=(dist({x:snap.shMid.x-snap.hipMid.x,y:snap.shMid.y-snap.hipMid.y},{x:pr.shMid.x-pr.hipMid.x,y:pr.shMid.y-pr.hipMid.y})/T*k+Math.abs(snap.shTilt-pr.shTilt)*k*.5);
    ['l','r'].forEach(function(s){ armSp[s]=Math.hypot(snap[s].w-pr[s].w,snap[s].wy-pr[s].wy)/T*k; });
    this.leadScore.l+=(armSp.l-this.leadScore.l)*(1-Math.exp(-dt/.6)); this.leadScore.r+=(armSp.r-this.leadScore.r)*(1-Math.exp(-dt/.6));
    if(this.lead==='r'&&this.leadScore.l>this.leadScore.r*1.4+.02) this.lead='l'; else if(this.lead==='l'&&this.leadScore.r>this.leadScore.l*1.4+.02) this.lead='r';
    sig[4]=armSp[this.lead]; var fk='f'+this.lead; var cf=snap[fk]||(this.lead==='l'?snap.fl:snap.fr), pf=pr[fk]||(this.lead==='l'?pr.fl:pr.fr);
    sig[5]=cf&&pf?dist(cf,pf)/T*k:0; }
  this.prev=snap;
  var a=1-Math.exp(-dt/C.tauAct); for(i=0;i<6;i++){ this.act[i]+=(clamp(sig[i]*C.stageGain[i]/3,0,1.5)-this.act[i])*a; }
  var tot=0; for(i=0;i<6;i++) tot+=this.act[i]; this.totalAct=tot/6;
  this.hist.push({t:t,a:this.act.slice(),arm:armSp[this.lead]}); while(this.hist.length&&t-this.hist[0].t>C.window) this.hist.shift();
  this.measureFlow(dt);
  // palm angle (wrist skill)
  var ls=sides[this.lead], pf2=hand&&hand[this.lead]?palmFacing(hand[this.lead][0],hand[this.lead][5],hand[this.lead][17]):palmFacing(ls.w,ls.ix,ls.pk);
  this.palm+=(pf2-this.palm)*(1-Math.exp(-dt/.25)); var tgt=sstep(C.palmMin,C.palmMax,this.palm); this.palmShown+=(tgt-this.palmShown)*(1-Math.exp(-dt/.35));
  // palms together -> charge; parting slowly -> calm release; clap (fast re-close after opening) -> early release
  var sw=dist(S[LM.lSh],S[LM.rSh])||T*.6, hd=dist(S[LM.lWr],S[LM.rWr])/sw, ph=this.distHist; ph.push({t:t,d:hd}); while(ph.length&&t-ph[0].t>.5) ph.shift();
  var wasMax=0; for(i=0;i<ph.length;i++) wasMax=Math.max(wasMax,ph[i].d); var closing=ph.length>1?(ph[0].d-hd)/Math.max(.05,t-ph[0].t):0;
  var together=hd<C.together;
  if(together){ this.togetherT+=dt; if(this.togetherT>.25&&!this.clapped) this.charge=clamp(this.charge+dt/C.chargeTime,0,1); this.apartT=0; }
  else { this.togetherT=0; this.apartT+=dt; this.chargeAtOpen=this.charge;
    if(this.charge>.05&&this.apartT>.4) this.release(this.charge*.8,'open'); }
  if(together&&this.togetherT<.3&&this.chargeAtOpen>.02&&wasMax>C.clapFrom&&closing>C.clapSpeed&&!this.clapped){ this.clapped=true; this.release(this.chargeAtOpen,'clap'); }
  if(!together&&this.apartT>.3) this.clapped=false;
  this.world={cx:hipMid.x,cy:hipMid.y,T:T};
  var fp=hand&&hand[this.lead]?hand[this.lead][8]:ls.ix; this.stepWorld(dt,fp?{x:fp.x,y:fp.y}:null);
  return this.state(); };
Engine.prototype.decay=function(dt){ var C=this.C; this.act=this.act.map(function(v){return v*Math.exp(-dt/.3);}); this.q.shown=Math.max(0,this.q.shown-dt/C.fall); this.q.resting=true; this.charge=Math.max(0,this.charge-dt*.2); };
/* flow = ordered lags between consecutive used stages (cross-correlation) x coverage x smoothness. All Simulated. */
Engine.prototype.measureFlow=function(dt){ var C=this.C,h=this.hist; if(h.length<12){ return this.easeQ(0,dt); }
  var n=h.length, i, s, mean=[0,0,0,0,0,0]; for(i=0;i<n;i++) for(s=0;s<6;s++) mean[s]+=h[i].a[s]/n;
  var used=[]; for(s=0;s<6;s++) if(mean[s]>C.actMin) used.push(s);
  var step=Math.max(1,(n/(C.window*15))|0), fps=n/Math.max(.2,h[n-1].t-h[0].t), pairs=0, score=0, lags=[];
  if(this.totalAct<C.restBelow||used.length<2){ this.q.seq=0; this.q.cover=used.length/6; this.q.lags=[]; return this.easeQ(0,dt,true); }
  var corr=function(u,v,lag){ var c=0,nu=0,nv=0,lg=Math.round(lag*fps); for(var j=0;j<n;j+=step){ var k=j+lg; if(k<0||k>=n) continue; var x=h[j].a[u]-mean[u],y=h[k].a[v]-mean[v]; c+=x*y; nu+=x*x; nv+=y*y; } return nu>1e-9&&nv>1e-9?c/Math.sqrt(nu*nv):0; };
  for(i=0;i<used.length-1;i++){ var u=used[i],v=used[i+1],best=-2,bl=0; for(var lag=-.15;lag<=C.lagMax+1e-9;lag+=1/Math.max(8,fps/2)){ var c=corr(u,v,lag); if(c>best){best=c;bl=lag;} }
    pairs++; var sc=0; if(best>=C.corrMin){ if(bl>=C.lagMin&&bl<=C.lagMax) sc=1; else if(Math.abs(bl)<C.lagMin) sc=.25; } score+=sc*clamp(best,0,1)*.7+sc*.3; lags.push(+bl.toFixed(2)); }
  var seq=pairs?score/pairs:0, cover=used.length/6;
  // smoothness of the lead arm's speed: small second-difference of its smoothed speed = smooth
  var sp=h.map(function(e){return e.arm;}), acc=0,m=0,mean2=0; for(i=0;i<n;i++) mean2+=sp[i]/n; for(i=2;i<n;i++){ var dd=(sp[i]-2*sp[i-1]+sp[i-2])*fps*fps; acc+=dd*dd; m++; }
  var rms=Math.sqrt(acc/Math.max(1,m)), smooth=1/(1+rms/(C.j0*Math.max(.15,mean2)*30));
  this.q.seq=seq; this.q.cover=cover; this.q.smooth=smooth; this.q.lags=lags;
  this.easeQ(clamp(seq*(.45+.55*cover)*(.35+.65*smooth)*1.15,0,1),dt,false); };
Engine.prototype.easeQ=function(target,dt,rest){ var C=this.C,q=this.q; q.flow=target; q.resting=!!rest||this.totalAct<C.restBelow;
  var tau=target>q.shown?C.rise:C.fall; q.shown+=(target-q.shown)*(1-Math.exp(-dt/tau)); };
Engine.prototype.release=function(amount,how){ this.charge=0; this.events.push(how==='clap'?'clap-release':'charge-release');
  this.pulses.push({x:0,y:-.3,r:0,amt:clamp(amount,.1,1),age:0}); };
/* soft world: string (soft verlet, capped speed, tethered), seeds (springs home, capped speed, bounded). Nothing can fly out. */
Engine.prototype.stepWorld=function(dt,fp){ var C=this.C,T=this.torso,W=this.world||{cx:0,cy:0,T:T},i,q=this.q.shown,focus=this.palmShown;
  var segs=C.stringSegs, st=STRINGS[this.stringId];
  var seg=C.stringLen*(.55+.65*focus)*(.35+.65*q)/(segs/8); // torso units per segment (palm focus + flow lengthen the string)
  if(fp){ var hx=(fp.x-W.cx)/T, hy=(fp.y-W.cy)/T; // string head: heavy follow, capped speed
    if(!this.head){ this.head={x:hx,y:hy}; } var dx=hx-this.head.x,dy=hy-this.head.y, cap=C.maxStringSpeed;
    var k=1-Math.exp(-dt/.12); var mx=dx*k, my=dy*k, ml=Math.hypot(mx,my); if(ml/dt>cap){ mx*=cap*dt/ml; my*=cap*dt/ml; }
    this.head.x+=mx; this.head.y+=my; this.headV.x=mx/dt; this.headV.y=my/dt; }
  var S=this.str; if(this.head&&!this.strInit){ for(i=0;i<segs;i++){ S[i].x=this.head.x; S[i].y=this.head.y; } this.strInit=true; }
  if(this.strInit){ S[0].x=this.head.x; S[0].y=this.head.y;
    for(i=1;i<segs;i++){ var p=S[i],pp=S[i-1];
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=Math.pow(C.stringDamp,dt*60); p.vy*=Math.pow(C.stringDamp,dt*60);
      var ddx=p.x-pp.x,ddy=p.y-pp.y,dl=Math.hypot(ddx,ddy)||1e-6;
      var nx=pp.x+ddx/dl*seg, ny=pp.y+ddy/dl*seg; // soft distance constraint
      var f=Math.min(1,C.stringFollow*60*dt), tx=p.x+(nx-p.x)*f, ty=p.y+(ny-p.y)*f; p.vx+=(tx-p.x)*8*dt; p.vy+=(ty-p.y)*8*dt; p.x=tx; p.y=ty;
      var v=Math.hypot(p.vx,p.vy); if(v>C.maxStringSpeed){ p.vx*=C.maxStringSpeed/v; p.vy*=C.maxStringSpeed/v; }
      var off=Math.hypot(p.x-this.head.x,p.y-this.head.y), lim=seg*segs*1.05; if(off>lim){ p.x=this.head.x+(p.x-this.head.x)*lim/off; p.y=this.head.y+(p.y-this.head.y)*lim/off; } } }
  if(this.strInit&&st.behaviour==='paint'&&q>.08){ var tp=S[segs-1]; this.trail.push({x:tp.x,y:tp.y,age:0,a:q}); }
  for(i=0;i<this.trail.length;i++) this.trail[i].age+=dt; while(this.trail.length&&(this.trail[0].age>3||this.trail.length>160)) this.trail.shift();
  for(i=this.pulses.length-1;i>=0;i--){ var pu=this.pulses[i]; pu.age+=dt; pu.r+=dt*.35; if(pu.age>2.5) this.pulses.splice(i,1); } // soft ring from a release
  var R=C.seedR, push=C.seedPush*(st.behaviour==='nudge'?1.4:st.behaviour==='grow'?.25:.6)*q;
  for(i=0;i<this.seeds.length;i++){ var s=this.seeds[i], fx=(s.hx-s.x)*1.2, fy=(s.hy-s.y)*1.2, near=0;
    if(this.strInit&&q>.05) for(var j=0;j<segs;j+=2){ var sx=s.x-S[j].x, sy=s.y-S[j].y, d=Math.hypot(sx,sy); if(d<R){ var w=(1-d/R); near=Math.max(near,w); fx+=sx/(d||1)*w*push; fy+=sy/(d||1)*w*push; } }
    for(var pi=0;pi<this.pulses.length;pi++){ var pu2=this.pulses[pi], px=s.x-pu2.x, py=s.y-pu2.y, pd=Math.hypot(px,py), ring=Math.abs(pd-pu2.r*1.5); if(ring<.15){ var pw=(1-ring/.15)*.5*pu2.amt*(1-pu2.age/2.5); fx+=px/(pd||1)*pw; fy+=py/(pd||1)*pw; near=Math.max(near,pw); } }
    s.vx+=fx*dt; s.vy+=fy*dt; var k2=Math.exp(-C.seedDrag*dt); s.vx*=k2; s.vy*=k2; var v2=Math.hypot(s.vx,s.vy); if(v2>C.seedMaxV){ s.vx*=C.seedMaxV/v2; s.vy*=C.seedMaxV/v2; }
    s.x+=s.vx*dt; s.y+=s.vy*dt; var ox=s.x-s.hx, oy=s.y-s.hy, od=Math.hypot(ox,oy), lim2=C.seedHome*.5; if(od>lim2){ s.x=s.hx+ox*lim2/od; s.y=s.hy+oy*lim2/od; s.vx*=.5; s.vy*=.5; }
    s.glow+=(near-s.glow)*(1-Math.exp(-dt/(near>s.glow?.4:1.4)));
    if(st.behaviour==='grow') s.size+=((1+near*.9)-s.size)*(1-Math.exp(-dt/.8)); else s.size+=(1-s.size)*(1-Math.exp(-dt/.8));
    if(s.glow>.5&&!s.touched){ s.touched=true; this.nudged++; this.events.push('seed-nudged'); } else if(s.glow<.15) s.touched=false; } };
Engine.prototype.state=function(){ return {quality:this.q.shown,flow:this.q,act:this.act,stages:STAGES,charge:this.charge,palm:this.palmShown,palmRaw:this.palm,lead:this.lead,
  string:this.strInit?this.str:null,stringType:STRINGS[this.stringId],head:this.head,trail:this.trail,seeds:this.seeds,pulses:this.pulses,nudged:this.nudged,events:this.events,world:this.world,torso:this.torso}; };

/* ---------- optional gradebook report (pattern from ../grade.js; class sci-ar-safe-lab; every payload Simulated; silent if no gradebook) ---------- */
var Grade=(function(){ var CLASS_ID='sci-ar-safe-lab', sent={}, seq=0;
  var ITEMS={'flow':{itemId:'body-bend-flow',title:'Body Bend: held a flowing chain (Simulated)'},'charge':{itemId:'body-bend-charge',title:'Body Bend: charged and released (Simulated)'}};
  function build(k){ var p=ITEMS[k]; if(!p) return null; return {classId:CLASS_ID,itemId:p.itemId,score:1,max:1,meta:{title:p.title,kind:'body-bend',event:'bodybend:'+k,source:'Body Bend (PLACEHOLDER / PROPOSAL)',data_class:'simulated',label:'Simulated',note:'Simulated lab result, not an observed measurement'}}; }
  function report(k){ var g=build(k); if(!g||sent[g.itemId]) return null; var args=[g.classId,g.itemId,g.score,g.max,g.meta], ok=false;
    try{ var S=root.WIRSchool; if(S&&typeof S.recordAttempt==='function'){ try{ if(!S.getClass(CLASS_ID)) S.registerClass({id:CLASS_ID,wing:'science',room:'AR Safe Lab',title:'AR Safe Lab (Simulated)',label:'PROPOSAL / demo',sources:{},facts:[],lessons:[],quizzes:[]}); }catch(e){} S.recordAttempt.apply(S,args); ok=true; } }catch(e){}
    if(!ok){ try{ if(root.parent&&root.parent!==root){ root.parent.postMessage({wir:'school-call',id:'bodybend-'+(++seq),method:'recordAttempt',args:args},'*'); ok=true; } }catch(e){} }
    if(ok) sent[g.itemId]=1; return ok?g:null; }
  return {CLASS_ID:CLASS_ID,build:build,report:report,_reset:function(){sent={};}}; })();

/* ---------- browser app (camera + canvas). Same CDN approach as ../app.js initHands(). Not Node-tested. ---------- */
function startApp(){ var $=function(i){return document.getElementById(i);}, VISION='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  var video=$('cam'), cv=$('fx'), cx=cv.getContext('2d'), eng=new Engine({seed:11}), sim=new SimBody(), W=0,H=0,dpr=1;
  var S={cam:false,pose:null,hands:null,facing:'user',n:0,handsRes:null,auto:false,stiff:false,tilt:.85,tog:0,clap:-1,keys:{},mx:.5,my:.5,mouse:false,drive:0,reach:.35,lastNow:0,fpsT:0,fps:0,flowT:0,t:0,noBody:0};
  var pc=document.createElement('canvas'), pcx=pc.getContext('2d');
  function size(){ dpr=Math.min(2,window.devicePixelRatio||1); W=innerWidth; H=innerHeight; cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px'; cx.setTransform(dpr,0,0,dpr,0,0); }
  addEventListener('resize',size); size();
  function say(m){ $('status').textContent=m; }
  function toScreen(p){ var vw=video.videoWidth||720, vh=video.videoHeight||1280, sc=Math.max(W/vw,H/vh), ox=(W-vw*sc)/2, oy=(H-vh*sc)/2, x=S.facing==='user'?1-p.x:p.x;
    return {x:ox+x*vw*sc,y:oy+p.y*vh*sc,z:(p.z||0)*vw*sc,v:p.visibility==null?1:p.visibility}; }
  async function loadModels(){ try{ say('Loading pose model...'); var v=await import(VISION+'/vision_bundle.mjs'), fs=await v.FilesetResolver.forVisionTasks(VISION+'/wasm');
      var mk=function(K,url,extra){ var o=function(d){return Object.assign({baseOptions:{modelAssetPath:url,delegate:d},runningMode:'VIDEO'},extra);}; return K.createFromOptions(fs,o('GPU')).catch(function(){return K.createFromOptions(fs,o('CPU'));}); };
      S.pose=await mk(v.PoseLandmarker,'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',{numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5});
      say('Pose ready. Loading hands (optional)...');
      try{ S.hands=await mk(v.HandLandmarker,'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',{numHands:2,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4}); }catch(e){ console.warn('hands optional failed',e); }
      say('Tracking ready. Step back so your whole body is in frame.'); }catch(e){ console.warn('pose failed',e); say('Pose tracking could not load. Simulated body still works (keyboard / mouse / controller).'); } }
  async function startCam(){ if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ say('No camera access here (needs HTTPS). Using the simulated body.'); return; }
    try{ if(S.stream) S.stream.getTracks().forEach(function(t){t.stop();}); S.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:S.facing},width:{ideal:1280},height:{ideal:720}}});
      video.srcObject=S.stream; await video.play().catch(function(){}); video.classList.toggle('mirror',S.facing==='user'); S.cam=true; $('simBadge').hidden=true; eng.reset(); if(!S.pose) loadModels(); else say('Camera on.'); }
    catch(e){ S.cam=false; say('Camera was not allowed or not found. On iPhone: aA > Website Settings > Camera > Allow. The simulated body still works.'); } }
  function useSim(){ S.cam=false; if(S.stream){ S.stream.getTracks().forEach(function(t){t.stop();}); S.stream=null; } video.srcObject=null; $('simBadge').hidden=false; eng.reset(); say('Simulated body: mouse = sway + reach, F = auto-flow, Space = hold palms together, C = clap, J = stiff, T = palm tilt'); }
  $('camBtn').onclick=startCam; $('simBtn').onclick=useSim; $('resetBtn').onclick=function(){ eng.reset(); sim=new SimBody(); };
  $('flipBtn').onclick=function(){ S.facing=S.facing==='user'?'environment':'user'; if(S.cam) startCam(); };
  function pickString(i){ eng.setString(i); Array.prototype.forEach.call(document.querySelectorAll('[data-s]'),function(b){ b.classList.toggle('on',+b.dataset.s===eng.stringId); }); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-s]'),function(b){ b.onclick=function(){ pickString(+b.dataset.s); }; }); pickString(0);
  addEventListener('keydown',function(e){ var k=e.key.toLowerCase(); S.keys[k]=1;
    if(k==='f') S.auto=!S.auto; if(k==='j') S.stiff=!S.stiff; if(k==='t') S.tilt=S.tilt>.5?.15:.85; if(k==='1'||k==='2'||k==='3') pickString(+k-1); if(k==='c'&&S.clap<0) S.clap=0; if(k===' ') e.preventDefault(); });
  addEventListener('keyup',function(e){ delete S.keys[e.key.toLowerCase()]; });
  cv.addEventListener('pointermove',function(e){ S.mx=e.clientX/W; S.my=e.clientY/H; S.mouse=true; });
  function simInput(dt){ var K=S.keys, tgt=0, pad=(navigator.getGamepads&&navigator.getGamepads()[0])||null;
    if(S.auto) tgt=Math.sin(2*Math.PI*.45*S.t); else if(K.arrowleft||K.a) tgt=-1; else if(K.arrowright||K.d) tgt=1; else if(pad&&Math.abs(pad.axes[0])>.15) tgt=pad.axes[0]; else if(S.mouse) tgt=clamp((S.mx-.5)*2.4,-1,1);
    S.drive+=(tgt-S.drive)*(1-Math.exp(-dt/.25)); // soft: the simulated body is heavy too
    var rt=S.mouse?clamp(1-S.my,0,1):.35; if(K.arrowup||K.w) rt=.9; if(K.arrowdown||K.s) rt=.1; if(pad&&Math.abs(pad.axes[3]||0)>.15) rt=clamp(.5-pad.axes[3]*.5,0,1); S.reach+=(rt-S.reach)*(1-Math.exp(-dt/.3));
    var hold=K[' ']||(pad&&pad.buttons[0]&&pad.buttons[0].pressed)?1:0, togT=hold; if(pad&&pad.buttons[1]&&pad.buttons[1].pressed&&S.clap<0) S.clap=0;
    if(S.clap>=0){ S.clap+=dt; var c=S.clap; togT=c<.25?1-c/.25:c<.4?(c-.25)/.15:1; if(c>.7) S.clap=-1; } // open, then slam shut
    S.tog+=(togT-S.tog)*(1-Math.exp(-dt/(S.clap>=0?.04:.25))); sim.stiff=S.stiff;
    return sim.step(dt,{drive:S.drive,reach:S.reach,together:S.tog,tilt:S.tilt}); }
  function loop(now){ requestAnimationFrame(loop); var dt=Math.min(.1,(now-(S.lastNow||now))/1000||.016); S.lastNow=now; S.t+=dt; var t=now/1000, pts=null, hands=null;
    if(S.cam){ if(S.pose&&video.readyState>=2&&video.videoWidth){ var w=256,h=Math.round(w*video.videoHeight/video.videoWidth); if(pc.width!==w){pc.width=w;pc.height=h;} pcx.drawImage(video,0,0,w,h);
        try{ var r=S.pose.detectForVideo(pc,now), lm=r.landmarks&&r.landmarks[0]; pts=lm?lm.map(toScreen):null; }catch(e){}
        if(S.hands&&(S.n++%2===0)){ try{ var hr=S.hands.detectForVideo(video,now); S.handsRes=(hr.landmarks||[]).map(function(l){return {pts:l.map(toScreen)};}); }catch(e){} } hands=S.handsRes; }
      S.noBody=pts?0:S.noBody+dt; }
    else { var P=simInput(dt), cw=Math.min(W,H*.5625), ox=W/2-cw/2; pts=P.map(function(p){return {x:ox+p.x*cw,y:p.y*H,z:p.z*cw,v:1};}); }
    var st=eng.update({t:S.cam?t:S.t,pts:pts,hands:hands}); draw(st,pts); hud(st,dt);
    st.events.forEach(function(e){ if(e==='clap-release'||e==='charge-release') Grade.report('charge'); });
    if(st.quality>.6){ S.flowT+=dt; if(S.flowT>4) Grade.report('flow'); } else S.flowT=Math.max(0,S.flowT-dt); }
  function rgba(c,a){ return 'rgba('+(c[0]*255|0)+','+(c[1]*255|0)+','+(c[2]*255|0)+','+a+')'; }
  function draw(st,pts){ cx.clearRect(0,0,W,H); if(!S.cam){ var g=cx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b1020'); g.addColorStop(1,'#10202a'); cx.fillStyle=g; cx.fillRect(0,0,W,H); }
    var wd=st.world; if(!wd||!pts){ if(S.cam&&S.noBody>1){ cx.fillStyle='rgba(255,255,255,.8)'; cx.font='16px system-ui'; cx.textAlign='center'; cx.fillText('Step back so your whole body is in frame',W/2,H/2); } return; }
    var T=st.torso, X=function(u){return wd.cx+u*T;}, Y=function(v){return wd.cy+v*T;}, col=st.stringType.color, q=st.quality;
    var J=eng.sm||pts, bones=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28]];
    cx.lineCap='round'; cx.strokeStyle='rgba(255,255,255,.22)'; cx.lineWidth=2; cx.beginPath(); bones.forEach(function(b){ cx.moveTo(J[b[0]].x,J[b[0]].y); cx.lineTo(J[b[1]].x,J[b[1]].y); }); cx.stroke();
    var nodes=[mid(J[27],J[28]),mid(J[23],J[24]),mid(mid(J[23],J[24]),mid(J[11],J[12])),mid(J[11],J[12]),J[st.lead==='l'?15:16],J[st.lead==='l'?19:20]];
    cx.globalCompositeOperation='lighter'; for(var i=0;i<6;i++){ var a=clamp(st.act[i],0,1), rad=6+a*16; var gr=cx.createRadialGradient(nodes[i].x,nodes[i].y,0,nodes[i].x,nodes[i].y,rad*2); gr.addColorStop(0,rgba(col,.2+.6*a)); gr.addColorStop(1,rgba(col,0)); cx.fillStyle=gr; cx.beginPath(); cx.arc(nodes[i].x,nodes[i].y,rad*2,0,7); cx.fill(); }
    st.seeds.forEach(function(s){ var x=X(s.x),y=Y(s.y), r=(5+s.glow*7)*s.size, gl=.25+.7*s.glow; var g2=cx.createRadialGradient(x,y,0,x,y,r*2.4); g2.addColorStop(0,rgba([.8,1,.7],gl)); g2.addColorStop(1,rgba(col,0)); cx.fillStyle=g2; cx.beginPath(); cx.arc(x,y,r*2.4,0,7); cx.fill();
      cx.fillStyle='rgba(220,255,200,'+(.55+.4*s.glow)+')'; cx.beginPath(); cx.ellipse(x,y,r*.55,r,Math.atan2(s.vy,s.vx)+1.2,0,7); cx.fill(); });
    st.pulses.forEach(function(p){ cx.strokeStyle=rgba(col,.5*p.amt*(1-p.age/2.5)); cx.lineWidth=4; cx.beginPath(); cx.arc(X(p.x),Y(p.y),p.r*1.5*T,0,7); cx.stroke(); });
    if(st.stringType.behaviour==='paint') for(var k=0;k<st.trail.length;k++){ var tr=st.trail[k], al=Math.max(0,1-tr.age/3)*.35*tr.a; cx.fillStyle=rgba(col,al); cx.beginPath(); cx.arc(X(tr.x),Y(tr.y),5,0,7); cx.fill(); }
    if(st.string){ var sg=st.string, glow=.12+.88*q; for(var pass=0;pass<2;pass++){ cx.strokeStyle=rgba(pass?[1,1,1]:col,(pass?.55:.35)*glow); cx.lineWidth=(pass?2:9)*(.5+.5*st.palm+.3*q); cx.beginPath(); cx.moveTo(X(sg[0].x),Y(sg[0].y)); for(var j=1;j<sg.length-1;j++){ var xm=(sg[j].x+sg[j+1].x)/2, ym=(sg[j].y+sg[j+1].y)/2; cx.quadraticCurveTo(X(sg[j].x),Y(sg[j].y),X(xm),Y(ym)); } cx.stroke(); } }
    cx.globalCompositeOperation='source-over'; }
  function hud(st,dt){ var f=st.flow, pc2=Math.round(st.quality*100); $('meterFill').style.width=pc2+'%'; $('meterFill').style.background='linear-gradient(90deg,#4ad,#8f8)';
    $('meterTxt').textContent=LABELS.flow+': '+pc2+'%  '+(f.resting?'resting':st.quality>.6?'flowing':st.quality>.25?'finding flow':'stiff / choppy');
    $('chainBars').innerHTML=STAGES.map(function(n,i){ return '<span><i style="height:'+Math.round(clamp(st.act[i],0,1)*100)+'%"></i><b>'+n.slice(0,3)+'</b></span>'; }).join('');
    $('chargeFill').style.width=Math.round(st.charge*100)+'%'; $('chargeTxt').textContent=LABELS.charge+': '+Math.round(st.charge*100)+'%';
    $('score').textContent=LABELS.score+': '+st.nudged; $('palmTxt').textContent='Palm toward camera (Simulated reading): '+Math.round(st.palm*100)+'%'; $('strTxt').textContent=st.stringType.label+' - '+st.stringType.behaviour+' (PLACEHOLDER behaviour)';
    $('tip').textContent=f.resting?'Move slowly: start from your feet and hips, let the arm follow.':(f.seq<.4?'Let the hips lead and the arm follow, like a wave.':f.smooth<.5?'Slow down and soften, no jerks.':'Nice, steady flow.');
    S.fpsT+=dt; S.fps++; if(S.fpsT>1){ $('fps').textContent=S.fps+' fps'+(S.cam?'':' (sim)'); S.fps=0; S.fpsT=0; } }
  requestAnimationFrame(loop); useSim(); window.__bodybend={eng:eng,S:S}; }

var API={startApp:startApp,CALM:CALM,STAGES:STAGES,STRINGS:STRINGS,LABELS:LABELS,GESTURES:GESTURES,LM:LM,SimBody:SimBody,Engine:Engine,palmFacing:palmFacing,Grade:Grade};
root.BodyBend=API; if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
