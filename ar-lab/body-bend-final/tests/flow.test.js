// node tests/flow.test.js  — optional FLOW layer logic (flow.js) on SIMULATED poses. PLACEHOLDER / PROPOSAL – not canon.
import fs from 'fs'; import B from '../flow.js';
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m); };
let net=0; globalThis.fetch=()=>{net++;throw Error('network');};
const {SimBody,Engine,CALM,LABELS,STRINGS,Grade}=B;
const src=fs.readFileSync(new URL('../flow.js',import.meta.url),'utf8'), html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const DT=1/30;
function run(kind,secs=12,extra){ const sim=new SimBody(),eng=new Engine({seed:3}); let t=0,st,maxQ=0; if(kind==='stiff'||kind==='jerky') sim.stiff=true;
  for(let i=0;i<secs*30;i++){ t+=DT; let d=0; if(kind==='flow'||kind==='stiff') d=Math.sin(Math.PI*t); if(kind==='jerky') d=(Math.floor(t/.35)%2?1:-1)*(Math.floor(t/.7)%3?1:.4);
    const inp=extra?extra(t,i):{}; const P=sim.step(DT,{drive:d,reach:.5,...inp}); const pts=P.map(p=>({x:p.x*720,y:p.y*1280,z:p.z*720,v:1}));
    st=eng.update({t,pts}); maxQ=Math.max(maxQ,st.quality); } return {st,eng,maxQ}; }
// 1. kinetic chain scoring
const flow=run('flow'),stiff=run('stiff'),jerky=run('jerky'),still=run('still');
ok(flow.st.quality>.6,'flowing feet->arm chain scores high ('+flow.st.quality.toFixed(2)+')');
ok(flow.st.flow.lags.filter(l=>l>0).length>=3,'consecutive stages show positive lag (hips lead, arm follows): '+flow.st.flow.lags);
ok(flow.st.quality>stiff.st.quality+.1,'stiff block movement scores lower than flowing ('+stiff.st.quality.toFixed(2)+')');
ok(flow.st.quality>jerky.st.quality+.3,'jerky movement scores much lower ('+jerky.st.quality.toFixed(2)+')');
ok(still.st.quality<.05&&still.st.flow.resting,'standing still reads as resting, not flow');
// 2. calm: nothing flies out, even with violent input
{ const eng=new Engine({seed:5}); let t=0,st,bad=false,maxSeed=0,maxStr=0; const sim=new SimBody();
  for(let i=0;i<1800;i++){ t+=DT; const P=sim.step(DT,{drive:Math.sin(i*1.7)*(i%2?1:-1),reach:i%7/7}); const pts=P.map(p=>({x:p.x*720+(i%5)*40*(i>600&&i<900?1:0),y:p.y*1280,z:0,v:1}));
    if(i%97===0) pts[16]={x:Math.random()*2000-500,y:Math.random()*3000-800,z:0,v:1}; // teleporting wrist (tracking glitch)
    st=eng.update({t,pts}); const T=st.torso;
    for(const s of st.seeds){ if(!isFinite(s.x+s.y)) bad=true; maxSeed=Math.max(maxSeed,Math.hypot(s.x-s.hx,s.y-s.hy),Math.hypot(s.vx,s.vy)*0); if(Math.hypot(s.vx,s.vy)>CALM.seedMaxV+1e-6) bad=true; }
    if(st.string) for(const p of st.string){ if(!isFinite(p.x+p.y)) bad=true; maxStr=Math.max(maxStr,Math.hypot(p.vx,p.vy)); } }
  ok(!bad,'no NaN, seed speed never above cap under violent/glitchy input'); ok(maxSeed<=CALM.seedHome*.5+1e-6,'seeds stay tethered near home (max drift '+maxSeed.toFixed(2)+')');
  ok(maxStr<=CALM.maxStringSpeed+1e-6,'string speed capped ('+maxStr.toFixed(2)+')'); }
// 3. palm toward camera
{ const mk=tilt=>{ const sim=new SimBody(),eng=new Engine(); let t=0,st; for(let i=0;i<120;i++){ t+=DT; const P=sim.step(DT,{drive:Math.sin(Math.PI*t),reach:.6,tilt}); st=eng.update({t,pts:P.map(p=>({x:p.x*720,y:p.y*1280,z:p.z*720,v:1}))}); } return st; };
  const a=mk(1),b=mk(.05); ok(a.palm>b.palm+.3,'palm facing camera reads higher than palm turned away ('+a.palm.toFixed(2)+' vs '+b.palm.toFixed(2)+')');
  ok(B.palmFacing({x:0,y:0,z:0},{x:0,y:-1,z:0},{x:-1,y:0,z:0})>.99,'palmFacing: flat to camera = ~1'); }
// 4. two palms charge, calm release when parted, clap releases early
{ const script=(clapAt)=>run('still',12,(t)=>{ let tog=t>1&&t<8?1:0; if(clapAt&&t>=clapAt&&t<clapAt+.25) tog=1-(t-clapAt)/.25; else if(clapAt&&t>=clapAt+.25&&t<clapAt+.4) tog=(t-clapAt-.25)/.15; else if(clapAt&&t>=clapAt+.4&&t<8) tog=1; return {together:tog}; });
  const hold=run('still',3.5,(t)=>({together:t>.5?1:0})); ok(hold.st.charge>.4&&hold.st.charge<1,'holding palms together builds charge ('+hold.st.charge.toFixed(2)+')');
  const sim=new SimBody(),eng=new Engine(); let t=0,events=[],chargeBefore=0; // charge, then clap at 4s
  for(let i=0;i<9*30;i++){ t+=DT; let tog=t>.5?1:0; if(t>=4&&t<4.25) tog=1-(t-4)/.25; else if(t>=4.25&&t<4.4) tog=(t-4.25)/.15; const P=sim.step(DT,{together:tog,reach:.5}); const st=eng.update({t,pts:P.map(p=>({x:p.x*720,y:p.y*1280,z:p.z*720,v:1}))}); if(t<4) chargeBefore=st.charge; st.events.forEach(e=>events.push([e,+t.toFixed(2)])); }
  const clap=events.find(e=>e[0]==='clap-release'); ok(chargeBefore>.5&&clap&&clap[1]<4.8,'clap releases the charge early: '+JSON.stringify(events.filter(e=>e[0]!=='seed-nudged')));
  const sim2=new SimBody(),eng2=new Engine(); t=0; events=[]; for(let i=0;i<9*30;i++){ t+=DT; const tog=t>.5&&t<4?1:0; const P=sim2.step(DT,{together:tog,reach:.5}); const st=eng2.update({t,pts:P.map(p=>({x:p.x*720,y:p.y*1280,z:p.z*720,v:1}))}); st.events.forEach(e=>events.push(e)); }
  ok(events.includes('charge-release')&&!events.includes('clap-release'),'palms parting slowly = calm release, no clap'); }
// 5. strings: placeholder, neutral, harmless
ok(STRINGS.length>=2&&STRINGS.length<=3&&STRINGS.every(s=>/^String [A-C] \(PLACEHOLDER\)$/.test(s.label)),'2-3 neutral PLACEHOLDER strings (String A/B/C)');
ok(STRINGS.every(s=>['paint','nudge','grow'].includes(s.behaviour)),'string behaviours limited to paint / nudge / grow');
ok(!B.GESTURES.some(g=>/pinch|two-?finger/i.test(g)),'no pinch / two-fingers-up gesture');
ok(!/palmFacing\(.*pinch|thumb/i.test(src),'no thumb/pinch logic in flow.js');
const banned=/\b(damage|weapon|kill|attack|projectile|explod|fireball|health|hp)\b/i; ok(!banned.test(src.replace(/Don't get smart to hurt nobody/g,''))&&!banned.test(html),'no violence / weapon / damage vocabulary');
const names=/avatar|aang|katara|toph|zuko|airbender|waterbend|earthbend|firebend|RIFFT|\bNem\b|Metal\b/i; ok(!names.test(src)||/Relation to/.test(src),'neutral names');
ok(!/avatar|aang|katara|toph|zuko|airbender|waterbend|earthbend|firebend/i.test(src+html),'no Avatar names / element-nation mapping');
// 6. labels
ok(/PLACEHOLDER \/ PROPOSAL – not canon/.test(html)&&LABELS.badge==='PLACEHOLDER / PROPOSAL – not canon','visible PLACEHOLDER / PROPOSAL – not canon badge');
ok([LABELS.flow,LABELS.score,LABELS.charge].every(s=>/Simulated/.test(s)),'every score label says Simulated');
ok(/flow \(Simulated\)/.test(html)&&/charge \(Simulated\)/.test(html)&&/calm \(Simulated\)/.test(html),'HTML data labels say Simulated');
// 7. gradebook bridge
ok(Grade.report('flow')===null,'no gradebook: silent no-op');
const calls=[],reg=[]; globalThis.WIRSchool={getClass:()=>null,registerClass:d=>reg.push(d),recordAttempt:(...a)=>calls.push(a)}; Grade._reset();
const g=Grade.report('flow'); ok(g&&calls.length===1&&calls[0][0]==='sci-ar-safe-lab'&&calls[0][2]===1&&calls[0][3]===1,'recordAttempt(classId,itemId,score,max,meta) to sci-ar-safe-lab');
Grade.report('flow'); Grade.report('charge'); ok(calls.length===2,'once per item per session'); ok(calls.every(c=>c[4].data_class==='simulated'&&c[4].label==='Simulated'),'payloads labeled Simulated');
globalThis.WIRSchool={getClass:()=>({}),recordAttempt:()=>{throw Error('no login');}}; Grade._reset(); let th=false; try{Grade.report('flow');}catch{th=true;} ok(!th,'gradebook error swallowed');
delete globalThis.WIRSchool; const msgs=[]; globalThis.parent={postMessage:m=>msgs.push(m)}; Grade._reset(); Grade.report('charge'); ok(msgs.length===1&&msgs[0].wir==='school-call'&&msgs[0].args[4].label==='Simulated','iframe bridge postMessage');
// 8. calm constants live at top & no network
ok(/^var CALM=\{/m.test(src.split('\n').slice(0,20).join('\n')),'CALM constants at top of file'); ok(net===0,'no network calls');
console.log(`flow layer: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
