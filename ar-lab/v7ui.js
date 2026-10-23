/* v7 glue: combo/streak badge, sound + mute, fingertip trails, lab-note toasts with "Learn more" (Atoms explainer), mini quests. */
import {comboNew,comboStep,comboTick,play,soundFor,setMuted,isMuted} from './juice.js';
import {NOTES,notesNew,pickNote,QUESTS,questStep} from './notes.js';
const U={C:comboNew(),N:notesNew(),Q:null,trail:[]};
let ctx; const now=()=>performance.now()/1000;
const css=`#v7c{position:fixed;right:60px;top:64px;font:700 15px system-ui;color:#fff;text-shadow:0 1px 3px #000;pointer-events:none;transition:transform .12s;z-index:40}
#v7c.pop{transform:scale(1.35)} #v7c small{display:block;font-weight:500;font-size:11px;opacity:.85}
#v7m{position:fixed;right:12px;bottom:12px;z-index:41;background:#0008;color:#fff;border:0;border-radius:18px;width:36px;height:36px;font-size:17px}
#v7n{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);max-width:min(420px,88vw);background:#101522e8;color:#eef;border:1px solid #ffffff22;border-radius:12px;padding:9px 34px 9px 12px;font:13px/1.35 system-ui;z-index:42;display:none}
#v7n b{color:#ffb35c} #v7n a{color:#8fd0ff;cursor:pointer;margin-left:6px} #v7n .x{position:absolute;right:8px;top:6px;cursor:pointer;opacity:.7}
#v7x{position:fixed;inset:12% 8% auto;background:#0b1020f2;color:#eef;border-radius:14px;padding:16px;font:14px/1.45 system-ui;z-index:43;display:none;max-width:520px;margin:auto}
#v7x .x{float:right;cursor:pointer} #v7x .at{display:inline-block;margin:6px 4px 0 0;padding:4px 9px;border-radius:12px;background:#ffffff18}
#v7q{position:fixed;left:12px;bottom:58px;background:#0008;color:#fff;border-radius:10px;padding:6px 10px;font:12px system-ui;z-index:41;max-width:60vw}
#v7q button{margin:3px 4px 0 0;font-size:12px}`;
export function init(c){ ctx=c; const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const mk=(id,tag='div')=>{ const e=document.createElement(tag); e.id=id; document.body.appendChild(e); return e; };
  U.c=mk('v7c'); U.n=mk('v7n'); U.x=mk('v7x'); U.q=mk('v7q');
  const m=mk('v7m','button'); m.title='Sound on/off'; const lbl=()=>m.textContent=isMuted()?'🔇':'🔊'; lbl(); m.onclick=()=>{ setMuted(!isMuted()); lbl(); if(!isMuted()) play('chime'); };
  startQuest('candle'); }
export function onEv(ev){ const t=now(), mode=ctx.E.mode;
  const s=soundFor(ev,mode); if(s) play(s);
  if(/^blast:release/.test(ev)) ctx.FX.shake=Math.max(ctx.FX.shake||0,12);
  if(/^(move:|fire:|water:|earth:|air:|blast:release)/.test(ev)&&!/keep:/.test(ev)){ const r=comboStep(U.C,ev.split(':').slice(0,2).join(':'),t); showCombo(r); }
  const k=pickNote(U.N,ev,t,mode); if(k) showNote(k);
  if(U.Q){ const nx=questStep(U.Q,ev); if(nx) drawQuest(nx); } }
function showCombo(r){ if(r.n<2) return; U.c.innerHTML=`×${r.n} ${['combo','chain!','streak!!','blazing!!!'][r.tier]}${r.reward?`<small>🏅 ${r.reward.name}</small>`:''}`;
  U.c.classList.add('pop'); setTimeout(()=>U.c.classList.remove('pop'),120); if(r.reward) play('chime',r.tier*2); else if(r.tier) play('chime',r.n%7,.2); }
function showNote(k){ const n=NOTES[k]; U.n.innerHTML=`<span class="x">✕</span><b>Lab note · ${n.t}</b><br>${n.b}<a>Learn more →</a>`; U.n.style.display='block';
  const close=()=>{ U.n.style.display='none'; U.N.open=null; }; U.n.querySelector('.x').onclick=close; clearTimeout(U.nt); U.nt=setTimeout(close,11000);
  U.n.querySelector('a').onclick=()=>{ close(); explain(k); }; }
export function explain(k){ const n=NOTES[k]; try{ ctx.setMode('atoms'); }catch{}
  U.x.innerHTML=`<span class="x">✕</span><b>${n.t}</b><p>${n.b}</p><p>${n.more}</p><div>Try building with: ${n.atoms.map(a=>`<span class="at">${a}</span>`).join('')}</div>`; U.x.style.display='block'; U.x.querySelector('.x').onclick=()=>U.x.style.display='none'; }
function startQuest(id){ U.Q={id,i:0}; drawQuest(QUESTS.find(q=>q.id===id).steps[0]); }
function drawQuest(s){ const q=QUESTS.find(x=>x.id===U.Q.id); if(!s){ U.q.style.display='none'; return; }
  if(s.say){ U.q.innerHTML=`🎯 <b>${q.name}</b>: ${s.say} <a style="cursor:pointer;opacity:.6" id="v7qx">✕</a>`; U.q.querySelector('#v7qx').onclick=()=>{U.Q=null;U.q.style.display='none';}; return; }
  play('chime',2); U.q.innerHTML=`🎯 <b>${q.name}</b> ✔<br>${s.q}<br>${s.a.map((a,i)=>`<button data-i="${i}">${a}</button>`).join('')}`;
  U.q.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const ok=+b.dataset.i===s.ok; U.q.innerHTML=ok?`🏅 Right! ${s.a[s.ok]}.`:`Not quite: it's <b>${s.a[s.ok]}</b>.`; play(ok?'chime':'thud',ok?7:0);
    const nxt=QUESTS[QUESTS.findIndex(x=>x.id===q.id)+1]; setTimeout(()=>nxt?startQuest(nxt.id):(U.q.style.display='none'),3500); }); }
/* per frame: fingertip trails + combo decay */
const TC={fire:[1,.45,.08],water:[.2,.55,1],earth:[.6,.45,.3],air:[.45,.8,1]};
export function tick(hs){ const {L,FX}=ctx, c=TC[ctx.E.mode]; if(U.q) U.q.style.visibility=c?'visible':'hidden'; if(!comboTick(U.C,now())) U.c.textContent='';
  if(!c||!L?.spark) return; for(const h of hs){ const p=h.tip; if(!p) continue; if(Math.random()<.5*FX.Q) L.spark.spawn(p.x,p.y,0,-10,{c,size:4,life:.35,grav:0,a:.7}); } }
export const _U=U;
