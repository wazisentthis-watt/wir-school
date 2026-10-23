import {comboNew,comboStep,comboTick,soundFor,CW} from '../juice.js';
import {NOTES,notesNew,pickNote,RATE,QUESTS,questStep} from '../notes.js';
import {readFileSync} from 'fs';
let pass=0,fail=0; const ok=(c,m)=>{ if(c) pass++; else { fail++; console.log('FAIL',m); } };
// combo
{ const C=comboNew(); let r; r=comboStep(C,'fire:flame',0); ok(r.n===1,'first'); r=comboStep(C,'fire:focus',.5); r=comboStep(C,'fire:burst',1); ok(r.n===3&&r.tier===1,'tier1 at 3'); ok(r.reward?.name==='Spark chain','reward at 3');
  r=comboStep(C,'fire:burst',1.5); ok(r.n===3,'repeat counts half'); ok(!r.reward,'no repeat reward');
  ok(comboTick(C,1.5+CW+.1)===0,'decays'); r=comboStep(C,'air:spin',10); ok(r.n===1,'resets after window');
  const D=comboNew(); for(let i=0;i<10;i++) r=comboStep(D,'m'+i,i*.5); ok(r.n===10&&r.tier===3,'tier3'); ok(D.given.has(6)&&D.given.has('six'),'rewards given once'); }
ok(soundFor('blast:release:fire','fire')==='boom','boom'); ok(soundFor('move:flick','water')==='splash','splash'); ok(soundFor('x','fire')===null,'none');
// notes rate limit
{ const N=notesNew(); ok(pickNote(N,'item:lit:paper',0,'fire')==='cellulose','paper note'); ok(pickNote(N,'fire:flame',1,'fire')===null,'one at a time');
  N.open=null; ok(pickNote(N,'fire:flame',RATE-1,'fire')===null,'rate-limited'); ok(pickNote(N,'fire:flame',RATE+1,'fire')==='triangle','after gap'); N.open=null;
  ok(pickNote(N,'item:lit:paper',99,'fire')===null,'each note once'); ok(pickNote(N,'fire:focus',200,'water')===null,'mode-gated');
  for(const [k,n] of Object.entries(NOTES)) ok(n.b.length<140&&n.more&&n.atoms.length,'note concise '+k); }
// quests
{ const Q={id:'candle',i:0}; ok(questStep(Q,'item:lit:candle')===null,'order enforced'); ok(questStep(Q,'item:candle')?.say,'step1'); const last=questStep(Q,'item:lit:candle'); ok(last?.q&&last.a[last.ok].includes('oxygen'),'quiz'); }
// fire palette: normal blending for heat layers, no white blowout clamp
{ const fx=readFileSync(new URL('../fx.js',import.meta.url),'utf8'); ok(/add&&!heat\?THREE\.AdditiveBlending/.test(fx),'heat layers normal-blended'); ok(/clamp\(mix\(vec3\(g\),h,sat\),0\.,1\.\)/.test(fx),'flame color clamped ≤1'); ok(/rim\*outline/.test(fx),'dark edge'); ok(/bloomK/.test(fx),'bloom per mode'); }
// ethics: no burn targets added
{ const src=['notes.js','juice.js','v7ui.js'].map(f=>readFileSync(new URL('../'+f,import.meta.url),'utf8')).join(''); ok(!/person|people|animal|face/i.test(src.replace(/surface/g,'')),'no people/animal targets'); }
console.log(`v7: ${pass} passed, ${fail} failed`); process.exit(fail?1:0);
