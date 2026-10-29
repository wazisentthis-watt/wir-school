// node tests/merge.test.js — the MERGED build: stomp + flow layer together, defaults, labels, privacy, names. SIMULATED poses only. PLACEHOLDER / PROPOSAL – not canon.
import fs from 'fs'; import {StompRecognizer,World,measure,RestTimer,spaceCheck} from '../body.js';
import {makePose,standPose,walkPose,stompFrames,jumpFrames} from '../fixtures.js';
import {FlowSim} from '../simflow.js'; import {Engine,STRINGS,Grade,GESTURES} from '../flow.js'; import {DEFAULTS,BADGE,LABELS,ALLOWED_HOSTS} from '../config.js';
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m); };
let net=0; globalThis.fetch=()=>{ net++; throw Error('network'); };
const rd=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const SRC=['app.js','body.js','flow.js','simflow.js','render.js','fixtures.js','config.js','index.html']; const text=Object.fromEntries(SRC.map(f=>[f,rd(f)])); const all=Object.values(text).join('\n');
const A=9/16, base={cx:.5,floor:.84,Hp:.6,aspect:A,stance:1,bend:0}, DT=1/30;
/* run the whole simulated pipeline like app.js does: stomp body -> optional flow overlay -> stomp recognizer + flow engine */
function pipeline({secs=12,flow=true,frames=null,inp=()=>({}),walk=false}){ const rec=new StompRecognizer(), fs_=new FlowSim(), eng=new Engine({seed:11}); const ev=[]; let st=null,t=0,maxQ=0,events=[];
  for(let i=0;i<secs*30;i++){ t+=DT; let pts=frames?(frames[Math.min(frames.length-1,i)].pts):(walk?walkPose(base,t,1):standPose(base,t));
    if(flow){ pts=fs_.apply(pts,A,DT,inp(t),measure(pts,A)); st=eng.update({t,pts:pts.map(p=>({x:p.x*540,y:p.y*960,z:(p.z||0)*540,v:p.v}))}); maxQ=Math.max(maxQ,st.quality); events.push(...st.events); }
    for(const e of rec.feed(pts,t,A)) ev.push(e); }
  return {ev,st,maxQ,events,types:ev.map(e=>e.type)}; }
// ---- defaults ----
ok(DEFAULTS.string===-1,'string is OFF by default'); ok(DEFAULTS.flowLayer===false,'flow layer is OFF by default (screen nearly empty)'); ok(DEFAULTS.hud===true&&DEFAULTS.pool===false,'HUD starts expanded, pool off');
ok(DEFAULTS.restEveryMs===5*60000,'rest prompt every 5 minutes'); ok(STRINGS.length===3&&STRINGS.every(s=>/^String [ABC] \(PLACEHOLDER\)$/.test(s.label)),'3 neutral PLACEHOLDER strings');
// ---- stomp still works with the flow layer on (and off) ----
{ const on=pipeline({frames:stompFrames(base),secs:3,flow:true}), off=pipeline({frames:stompFrames(base),secs:3,flow:false});
  ok(on.types.join()==='impact,set,stomp'&&off.types.join()==='impact,set,stomp','stomp recognised with flow overlay ON ('+on.types.join('>')+') and OFF'); }
{ const b={...base,stance:2,bend:.5}; const r=pipeline({frames:stompFrames(b,{lift:.08*.6,hipDrop:.045*.6}),secs:3,flow:true}); const s=r.ev.find(e=>e.type==='stomp'); ok(s&&s.kind==='shield','wide-low stomp -> shield with flow overlay ON'); const w=new World(); const it=w.spawn(s,0); ok(it.kind==='shield'&&it.simulated===true,'shield item is simulated'); }
{ const w=new World(); w.setPool({x:.5,y:.85,rxm:1,k:.4}); ok(w.spawn({x:.5,y:.85,k:.4,kind:'slab'},0).kind==='boat','boat in pool still works'); }
// ---- walking / jumping with the flow layer swaying never stomp ----
{ const r=pipeline({secs:20,walk:true,inp:t=>({drive:Math.sin(2*Math.PI*.45*t),reach:.5})}); ok(!r.types.includes('stomp'),'walking + flowing sway: no stomp ('+r.types.join('>')+')'); }
{ const r=pipeline({secs:20,inp:t=>({drive:Math.sin(2*Math.PI*.45*t),reach:.5})}); ok(!r.types.includes('stomp')&&!r.types.includes('impact'),'standing + auto-sway: no stomp, no impact'); }
{ const r=pipeline({frames:jumpFrames(base),secs:3}); ok(!r.types.includes('stomp'),'jump with flow overlay: no stomp'); }
// ---- flow layer on the merged sim body ----
{ const r=pipeline({secs:14,inp:t=>({drive:Math.sin(2*Math.PI*.45*t),reach:.5})}); ok(r.st.quality>.45,'auto-sway on the merged sim body reads as flow ('+r.st.quality.toFixed(2)+')'); const s=pipeline({secs:14,inp:t=>({drive:0,reach:.5})}); ok(s.st.quality<.05&&s.st.flow.resting,'standing still = resting, not flow'); }
{ const r=pipeline({secs:10,inp:t=>({together:t>.5&&t<6?1:0,reach:.5})}); ok(r.events.includes('charge-release')&&!r.events.includes('clap-release'),'palms together then parting = calm release (merged body)'); }
{ const clap=t=>{ let tog=t>.5?1:0; if(t>=4&&t<4.25) tog=1-(t-4)/.25; else if(t>=4.25&&t<4.4) tog=(t-4.25)/.15; return {together:tog,reach:.5}; }; const r=pipeline({secs:7,inp:clap}); ok(r.events.includes('clap-release'),'clap releases early (merged body)'); }
ok(!GESTURES.some(g=>/pinch|two-?finger/i.test(g)),'no pinch / two-fingers-up');
// ---- clear-space check + rest prompt still wired ----
{ const good=standPose({...base,Hp:.6,floor:.9},0); ok(spaceCheck(good,A).ok,'clear-space check passes for a whole body in frame'); const bad=good.map(p=>({...p})); bad[27].v=.2; ok(!spaceCheck(bad,A).ok,'clear-space check fails when feet are not visible'); }
{ const r=new RestTimer(DEFAULTS.restEveryMs,DEFAULTS.restMs); r.begin(0); ok(r.update(299000)==='active'&&r.update(300000)==='rest'&&r.update(315000)==='active','rest prompt: active until 5:00, rest 15 s'); }
ok(/space-check|spaceCheck/.test(text['app.js'])&&/id="gate"/.test(text['index.html'])&&/id="rest"/.test(text['index.html']),'app wires the clear-space gate and the rest overlay');
// ---- HUD collapse ----
{ const h=text['index.html']; ok(/id="bHud"/.test(h)&&/body\.collapsed \.hudg\{display:none!important\}/.test(h),'collapse button exists and hides .hudg');
  ok(/id="badge"/.test(h)&&!/id="badge"[^>]*class="hudg"/.test(h),'badge is not part of the collapsible HUD'); ok(/id="gate"[^>]*class="overlay show"/.test(h)&&!/id="(gate|rest)"[^>]*hudg/.test(h),'gate and rest overlays are not hidden by collapse');
  ok(/id="bStr">string: off</.test(h)&&/id="bFlow">flow: off</.test(h),'html shows string: off / flow: off by default'); }
// ---- labels ----
ok(BADGE==='PLACEHOLDER / PROPOSAL – not canon'&&text['index.html'].includes('<b>'+BADGE+'</b>'),'badge text is exactly "PLACEHOLDER / PROPOSAL – not canon"');
ok(Object.values(LABELS).every(l=>/Simulated/.test(l)),'every data label says Simulated'); ok(/calm \(Simulated\)/.test(text['index.html'])&&/flow \(Simulated\)/.test(text['index.html'])&&/charge \(Simulated\)/.test(text['index.html']),'html meters labelled Simulated');
ok(/Simulated/.test(text['body.js'])&&/simulated:true/.test(text['body.js']),'stomp events carry simulated:true');
// ---- names ----
{ const names=/avatar|aang|katara|toph|zuko|sokka|airbend|waterbend|earthbend|firebend|bending game|pok[eé]mon|pikachu|charizard|bulbasaur|squirtle|poké|RIFFT|\bNem\b/i; ok(!names.test(all),'no Avatar / Pokémon / other-property names in any source file'); 
  const banned=/\b(damage|weapon|kill|attack|projectile|explod|fireball|health)\b/i; ok(!banned.test(all.replace(/Don't get smart to hurt nobody/g,'')),'no violence vocabulary'); }
// ---- privacy: on-device camera only ----
{ const urls=[...all.matchAll(/https?:\/\/[^\s'"`)]+/g)].map(m=>new URL(m[0]).host); ok(urls.length>0&&urls.every(h=>ALLOWED_HOSTS.includes(h)),'only network hosts in source: '+[...new Set(urls)].join(', '));
  ok(!/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|MediaRecorder|toDataURL|toBlob|localStorage|indexedDB|createObjectURL/.test(all.replace(/globalThis\.fetch/g,'')),'no fetch/upload/recording/storage APIs in source');
  ok(/imports?\(VISION|import\(VISION/.test(text['app.js'])||/await import\(VISION/.test(text['app.js']),'MediaPipe is imported from the CDN only inside the camera path'); }
// ---- gradebook: silent without one, simulated with one ----
{ Grade._reset(); ok(['stomp','shield','flow','charge'].every(k=>Grade.report(k)===null),'no gradebook: all four reports are silent no-ops');
  const calls=[]; globalThis.WIRSchool={getClass:()=>({}),recordAttempt:(...a)=>calls.push(a)}; Grade._reset(); for(const k of ['stomp','shield','flow','charge','stomp']) Grade.report(k);
  ok(calls.length===4&&calls.every(c=>c[0]==='sci-ar-safe-lab'&&c[4].label==='Simulated'&&c[4].data_class==='simulated'),'with a gradebook: 4 items, each once, class sci-ar-safe-lab, labelled Simulated'); delete globalThis.WIRSchool; }
ok(!/grade\.js/.test(all.replace(/\/\/.*|\/\*[\s\S]*?\*\//g,'')),'no hard dependency on ../grade.js (only the optional bridge)');
ok(net===0,'no network calls made by logic/tests');
console.log(`\nmerge: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
