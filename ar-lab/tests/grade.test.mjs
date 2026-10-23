import {createRequire} from 'module'; const require=createRequire(import.meta.url);
let pass=0,fail=0; const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m); };
globalThis.fetch=()=>{ throw Error('network'); }; let net=0; const of=globalThis.fetch; globalThis.fetch=(...a)=>{net++;return of(...a)};
const G=require('../grade.js');
// standalone: no gradebook, no parent -> silent
ok(G.report('train:orb')===null,'no gradebook: report is a silent no-op');
let thrown=false; try{ G.install(); globalThis.labEvent('train:orb'); globalThis.labEvent('table:set'); }catch{ thrown=true; } ok(!thrown,'labEvent chain never throws without gradebook');
// same-page gradebook
const calls=[],reg=[]; globalThis.WIRSchool={getClass:()=>null,registerClass:d=>reg.push(d),recordAttempt:(...a)=>calls.push(a)}; G._reset();
const g=G.report('train:orb'); ok(g&&g.meta.title==='Lesson: Lio of the Steady Palm','Lio of the Steady Palm lesson completion reports');
ok(calls.length===1&&calls[0][0]==='sci-ar-safe-lab'&&calls[0][2]===1&&calls[0][3]===1,'recordAttempt(classId,itemId,score,max,meta) signature matches');
ok(reg.length===1&&reg[0].wing==='science','lab class registered in science wing');
for(const e of ['table:set','table:place','table:push']) G.report(e);
ok(calls.length===4,'Table-mode tasks report (set/place/push)');
ok(calls.every(c=>c[4].data_class==='simulated'&&c[4].label==='Simulated'),'every payload labeled Simulated');
G.report('table:push'); ok(calls.length===4,'repeat events do not spam the gradebook');
ok(G.report('fire:burst')===null&&G.report('table:scan')===null,'non-graded events ignored');
// gradebook throws (not logged in) -> silent
globalThis.WIRSchool={getClass:()=>({}),recordAttempt:()=>{throw Error('not logged in')}}; G._reset();
thrown=false; try{ G.report('train:fire'); }catch{ thrown=true; } ok(!thrown,'gradebook error (not logged in) is swallowed');
// iframe bridge
delete globalThis.WIRSchool; const msgs=[]; globalThis.parent={postMessage:(m,o)=>msgs.push(m)}; G._reset();
G.report('train:water'); ok(msgs.length===1&&msgs[0].wir==='school-call'&&msgs[0].method==='recordAttempt'&&msgs[0].args[4].data_class==='simulated','iframe: school-call postMessage to parent');
// previous labEvent still called
let prevHit=0; delete globalThis.parent; globalThis.labEvent=()=>prevHit++; G.install(); globalThis.labEvent('x'); ok(prevHit===1,'existing labEvent handler still runs');
ok(net===0,'no network calls');
console.log(`grade: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
