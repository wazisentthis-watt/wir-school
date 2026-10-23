/* Local profiles + classes. Everything stays on this device for now.
   Backend-ready: all reads/writes go through STORE (get/put of one JSON doc per profile). To add accounts later,
   swap STORE for a REST adapter (e.g. GET/PUT /api/profiles/:id with a session token) — no other code changes. */
(function(){
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STORE={ list(){ return JSON.parse(localStorage.getItem('wirlab.profiles')||'{}'); },
  put(id,doc){ const l=this.list(); l[id]=doc; localStorage.setItem('wirlab.profiles',JSON.stringify(l)); },
  del(id){ const l=this.list(); delete l[id]; localStorage.setItem('wirlab.profiles',JSON.stringify(l)); } };
// Ask the browser not to evict our storage (Safari/Chrome may clear site data otherwise — a likely cause of "retaking the gate").
try{ navigator.storage?.persist?.(); }catch{}
const idOf=n=>n.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,32)||'me';
async function hash(s){ try{ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('wirlab:'+s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }catch{ let h=0; for(const c of s) h=(h*31+c.charCodeAt(0))|0; return 'x'+h; } }

/* Classes: ordered lessons. Each step completes on a lab event (window.labEvent). */
const CLASSES=[
 {id:'safety',title:'1 · Lab safety',steps:[['gate','Pass the Safe Lab Gate and take the pledge']]},
 {id:'calib',title:'2 · Teach the lab your hand',steps:[['calibrated','Finish the 2-stage calibration (open, poke, ✌️, flick)']]},
 {id:'water',title:'3 · Waterbending',steps:[['mode:water','Open Water mode'],['g:open:water','Summon a water orb with an open palm'],['g:poke:water','Point and drag a water stream']]},
 {id:'earth',title:'4 · Earthbending',steps:[['mode:earth','Open Earth mode'],['g:vee:earth','Grab a rock with ✌️ two fingers']]},
 {id:'fire',title:'5 · Fire and the burner',steps:[['mode:fire','Open Fire mode'],['g:poke:fire','Light your fingertip flame'],['burn','Poke a real object in your room with fire (it is only virtual)']]},
 {id:'gear',title:'6 · Lab gear',steps:[['mode:gear','Open Gear mode'],['gear:burner','Poke the Bunsen burner to light it'],['gear:heat','Heat a test tube over the flame'],['gear:pour','Poke a beaker to pour']]},
 {id:'atoms1',title:'7 · Atoms and bonds',steps:[['mode:atoms','Open Atoms mode'],['bond:H2O','Build water H₂O'],['bond:NaCl','Make salt NaCl (ionic)'],['bond:N2','Build N₂ (triple bond)']]},
 {id:'atoms2',title:'8 · Reactions and energy',steps:[['react:h2','2H₂ + O₂ → 2H₂O (exothermic)'],['react:ch4','Burn methane'],['react:neut','Neutralize HCl with NaOH']]},
 {id:'atoms3',title:'9 · Photosynthesis',steps:[['react:photo','Run the photosynthesis overview (endothermic)']]},
 {id:'chem',title:'10 · Metal fires (Chem)',steps:[['mode:chem','Open Chem mode'],['rx:any','Run any unlocked reaction']]},
];
let cur=null; // current profile doc
const P=window.PROFILE={ STORE, CLASSES, get cur(){return cur;},
  sync(){ if(!cur) return; cur.gate=JSON.parse(localStorage.getItem('wirlab.v1')||'{}'); const c=localStorage.getItem('wirlab.calib'); if(c) cur.calib=JSON.parse(c); cur.updated=Date.now(); STORE.put(cur.id,cur); },
  event(name){ if(!cur) return; cur.events=cur.events||{}; const keys=[name]; if(name.startsWith('rx:')) keys.push('rx:any');
    let fresh=false; for(const k of keys) if(!cur.events[k]){ cur.events[k]=Date.now(); fresh=true; }
    if(fresh){ STORE.put(cur.id,cur); const step=nextStep(); if(step&&keys.some(k=>doneJustNow(k))) toast('Class step done ✓'); render(); } },
  logout(){ localStorage.removeItem('wirlab.current'); localStorage.removeItem('wirlab.v1'); localStorage.removeItem('wirlab.calib'); location.reload(); },
  wipe(){ for(const k of Object.keys(localStorage)) if(k.startsWith('wirlab.')) localStorage.removeItem(k); try{ indexedDB?.databases?.().then(d=>d.forEach(x=>x.name&&indexedDB.deleteDatabase(x.name))); }catch{} },
  render };
const doneJustNow=k=>cur.events[k]&&Date.now()-cur.events[k]<1500;
function isDone(step){ return !!cur?.events?.[step[0]]; }
function nextStep(){ for(const c of CLASSES) for(const s of c.steps) if(!isDone(s)) return {c,s}; return null; }
window.labEvent=n=>P.event(n);
function toast(m){ const t=document.createElement('div'); t.className='toast'; t.textContent=m; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
function render(){ const b=$('classes'); if(!b||!cur) return; let open=true;
  b.innerHTML=`<div class="clhead"><b>${esc(cur.name)}'s classes</b><button id="clX">✕</button></div>`+CLASSES.map(c=>{ const d=c.steps.filter(isDone).length, all=d===c.steps.length, lock=!open; if(!all) open=false;
    return `<div class="cls ${all?'done':''} ${lock?'lock':''}"><div><b>${lock?'🔒':all?'✅':'▶'} ${c.title}</b><span>${d}/${c.steps.length}</span></div>${lock?'':`<ul>${c.steps.map(s=>`<li class="${isDone(s)?'ok':''}">${isDone(s)?'✓':'○'} ${s[1]}</li>`).join('')}</ul>`}</div>`; }).join('')+
   `<div class="clfoot"><button id="clOut">Switch profile</button><button id="clWipe" class="danger">Wipe all my data</button></div>`;
  $('clX').onclick=()=>b.hidden=true; $('clOut').onclick=()=>{P.sync();P.logout();}; $('clWipe').onclick=()=>wipeNow();
  const n=nextStep(), nb=$('clNext'); if(nb) nb.textContent=n?`Next: ${n.s[1]}`:'All classes done 🎉'; }
function wipeNow(){ if(!confirm('Wipe every profile, gate pass, calibration and scorch memory from this device? This cannot be undone.')) return; P.wipe(); try{ window.__stopCamera?.(); }catch{} location.reload(); }
window.wipeNow=wipeNow;

function login(){ const G=$('gate'); const l=STORE.list(), ids=Object.keys(l);
  G.innerHTML=`<div class="gbox"><h1>🧪 WIR Lab sign in</h1><p class="small">Profiles live on this device only (nothing is uploaded). Your gate pass, calibration and class progress are saved to your profile, so you only do them once.</p>
   ${ids.length?`<div class="plist">${ids.map(i=>`<button class="gbtn ghost pbtn" data-id="${esc(i)}">${esc(l[i].name)}${l[i].pin?' 🔒':''}</button>`).join('')}</div><p class="small">or make a new profile:</p>`:''}
   <label>Name<input id="pName" maxlength="40" autocomplete="nickname"></label><label>4-digit PIN (optional)<input id="pPin" inputmode="numeric" maxlength="4" type="password"></label>
   <button class="gbtn" id="pGo">Continue</button><p id="pErr" class="err"></p></div>`; G.hidden=false;
  G.querySelectorAll('.pbtn').forEach(b=>b.onclick=async()=>{ const d=l[b.dataset.id]; if(d.pin){ const p=prompt(`PIN for ${d.name}`); if(p===null) return; if(await hash(p)!==d.pin){ $('pErr').textContent='Wrong PIN.'; return; } } use(d); });
  $('pGo').onclick=async()=>{ const n=$('pName').value.trim(); if(!n){ $('pErr').textContent='Type a name.'; return; } const id=idOf(n);
    if(l[id]){ $('pErr').textContent='That profile exists: tap its name above.'; return; } const pin=$('pPin').value.trim();
    if(pin&&!/^\d{4}$/.test(pin)){ $('pErr').textContent='PIN must be 4 digits.'; return; }
    use({id,name:n,pin:pin?await hash(pin):'',created:Date.now(),events:{},gate:{}}); }; }
function use(d){ cur=d; localStorage.setItem('wirlab.current',d.id);
  localStorage.setItem('wirlab.v1',JSON.stringify(d.gate||{})); if(d.calib) localStorage.setItem('wirlab.calib',JSON.stringify(d.calib)); else localStorage.removeItem('wirlab.calib');
  STORE.put(d.id,d); start(); }
function start(){ const go=()=>window.GATE_START?window.GATE_START():setTimeout(go,30); go(); }
function boot(){
  // migrate a pre-profile gate pass so nobody retakes it
  const l=STORE.list(), old=JSON.parse(localStorage.getItem('wirlab.v1')||'{}');
  let id=localStorage.getItem('wirlab.current');
  if(!Object.keys(l).length&&old.user&&old.passed){ const d={id:idOf(old.user.name),name:old.user.name,pin:'',created:Date.now(),events:{gate:Date.now()},gate:old}; const c=localStorage.getItem('wirlab.calib'); if(c) d.calib=JSON.parse(c); STORE.put(d.id,d); id=d.id; localStorage.setItem('wirlab.current',id); }
  if(id&&STORE.list()[id]){ cur=STORE.list()[id]; // gate state from profile wins (repairs a cleared wirlab.v1)
    if(cur.gate?.passed&&!JSON.parse(localStorage.getItem('wirlab.v1')||'{}').passed) localStorage.setItem('wirlab.v1',JSON.stringify(cur.gate));
    if(cur.calib&&!localStorage.getItem('wirlab.calib')) localStorage.setItem('wirlab.calib',JSON.stringify(cur.calib));
    start(); } else login(); }
// mark gate class step when the lab opens with a pass
setInterval(()=>{ if(cur){ const g=JSON.parse(localStorage.getItem('wirlab.v1')||'{}'); if(g.passed&&g.pledged&&!cur.events?.gate) P.event('gate'); } },1000);
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
