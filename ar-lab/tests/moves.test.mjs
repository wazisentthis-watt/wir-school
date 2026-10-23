import * as M from '../moves.js';
const dt=1/30, ease=(a,b,u)=>a+(b-a)*Math.max(0,Math.min(1,u));
const dip=(t,t0,len=.25,lo=.15)=>{ const u=(t-t0)/len; return u<0||u>1?1:1-(1-lo)*Math.sin(u*Math.PI); };
const O=(n,extra={})=>({n,...extra});
const SEQ={
 ripple:[1.3,t=>O([1,dip(t,.6),dip(t,.5),dip(t,.4),dip(t,.3)])],
 rippleIn:[1.3,t=>O([1,dip(t,.3),dip(t,.4),dip(t,.5),dip(t,.6)])],
 pulse:[1.2,t=>{const v=dip(t,.4,.5,.3);return O([1,v,v,v,v]);}],
 bloom:[1.2,t=>{const v=t<.3?1:t<.75?0:ease(0,1,(t-.75)/.1);return O([v,v,v,v,v]);}],
 curl:[1.6,t=>O([1,...[0,1,2,3].map(f=>ease(1,0,(t-.3-f*.15)/.12))])],
 flip:[1.0,t=>O([1,1,1,1,1],{flip:ease(1,-1,(t-.3)/.25)})],
 twist:[1.2,t=>O([1,1,1,1,1],{roll:ease(0,1.7,(t-.3)/.45)})],
 palmUp:[1.4,t=>O([1,1,1,1,1],{tilt:ease(0,.85,(t-.6)/.3)})],
 palmDown:[1.8,t=>O([1,1,1,1,1],{flip:-1,tilt:ease(0,.85,(t-1)/.3)})],
 scoop:[1.2,t=>O([.6,.45,.45,.45,.45]),t=>({x:200,y:400+Math.sin(Math.max(0,Math.min(1,(t-.2)/.7))*Math.PI)*110})],
 pluck:[1.0,t=>O([1,1,dip(t,.4,.22),1,1])],
 beckon:[1.4,t=>O([0,Math.min(dip(t,.3,.3),dip(t,.75,.3)),0,0,0])],
 thumb:[1.0,t=>O([.5,.8,.8,.8,.8],{thumbX:ease(-1,1,(t-.4)/.3)})],
 thumbRoll:[1.6,t=>O([.5,.6,.6,.6,.6],{touch:t<.3?null:t<.6?0:t<.9?1:2})],
 spiral:[1.6,t=>O([1,1,1,1,1]),t=>({x:200+Math.cos(t*8)*45,y:400+Math.sin(t*8)*45})],
 push:[.9,t=>O([1,1,1,1,1],{s:ease(90,125,(t-.3)/.25)})],
 pull:[.9,t=>O([1,1,1,1,1],{s:ease(125,90,(t-.3)/.25)})],
 shake:[1.3,t=>O([1,1,1,1,1]),t=>({x:200+Math.sin(t*20)*45,y:400})],
};
const NEG={
 idle:[3,t=>O([1,1,1,1,1].map(v=>v-Math.random()*.08),{s:90+Math.random()*2}),t=>({x:200+Math.random()*3,y:400+Math.random()*3})],
 point:[3,t=>O([0,1,0,0,0].map(v=>Math.max(0,v-Math.random()*.08)))],
 slowMove:[3,t=>O([1,1,1,1,1]),t=>({x:100+t*60,y:400})],
 cupHold:[2,t=>O([.6,.42,.42,.42,.42])],
};
function run([T,fo,fp]){ const H={}, cal=M.defaultCal(); const evs=new Set(); let gs=new Set(), st={};
  // brief open-palm calibration first so faceSign is learned
  for(let t=0;t<.3;t+=dt) M.step(H,M.synth(200,400,{n:[1,1,1,1,1]}),t,cal,dt);
  for(let t=0;t<T;t+=dt){ const o=fo(t), p=fp?fp(t):{x:200,y:400}; const r=M.step(H,M.synth(p.x,p.y,o),.3+t,cal,dt); r.ev.forEach(e=>evs.add(e.k)); gs.add(r.g); if(r.state.cup) st.cup=1; if(r.state.pour) st.pour=1; }
  return {evs:[...evs],gs:[...gs],st}; }
let pass=0,tot=0;
for(const [k,s] of Object.entries(SEQ)){ const r=run(s); tot++; const ok=r.evs.includes(k); if(ok) pass++; console.log((ok?'PASS ':'FAIL ')+k.padEnd(10),'events:',r.evs.join(',')||'-'); }
for(const [k,s] of Object.entries(NEG)){ const r=run(s); console.log('NEG  '+k.padEnd(10),'events:',r.evs.join(',')||'(none)','poses:',r.gs.join(','),JSON.stringify(r.st)); }
{ const r=run([1.5,t=>O([.6,.42,.42,.42,.42],{roll:ease(0,.8,(t-.5)/.4)})]); console.log('STATE pour', JSON.stringify(r.st)); }
console.log(`${pass}/${tot} moves recognised`);
// robustness: jitter + stiff-fingered user (range .2-.7) with a calibrated profile
function run2([T,fo,fp],stiff){ const H={}, cal=M.defaultCal(); if(stiff){cal.lo=cal.lo.map(()=>.2);cal.hi=cal.hi.map(()=>.7);} const evs=new Set();
  const mapN=n=>n.map(v=>Math.max(0,Math.min(1,(stiff?.2+.5*v:v)+(Math.random()-.5)*.08)));
  for(let t=0;t<.3;t+=dt) M.step(H,M.synth(200,400,{n:mapN([1,1,1,1,1])}),t,cal,dt);
  for(let t=0;t<T;t+=dt){ const o=fo(t), p=fp?fp(t):{x:200,y:400}; const r=M.step(H,M.synth(p.x+(Math.random()-.5)*4,p.y+(Math.random()-.5)*4,{...o,n:mapN(o.n)}),.3+t,cal,dt); r.ev.forEach(e=>evs.add(e.k)); }
  return [...evs]; }
for(const stiff of [0,1]){ let ok=0; const miss=[]; for(const [k,s] of Object.entries(SEQ)){ let h=0; for(let i=0;i<10;i++) if(run2(s,stiff).includes(k)) h++; ok+=h; if(h<8) miss.push(k+':'+h+'/10'); }
  console.log(stiff?'stiff+jitter':'jitter', `${ok}/${Object.keys(SEQ).length*10}`, 'weak:',miss.join(' ')||'none'); }
