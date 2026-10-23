// Metal powers by season — source: metal_powers_by_season_2026-10-23.md + Coach canon fixes 10/23. Feelings: UNKNOWN (not invented).
const P=[
['ALL','Galaxy Gallium: one finite budget (meters)','LOCKED','play'],
['ALL','Gunmetal at rest, violet only on active seams','LOCKED','play'],
['ALL','Gallium swing / grapple (Q)','CURRENT','play'],
['ALL','Gallium wall-ramp → wall ride on 4 wheels','CURRENT','play'],
['ALL','Star Merkaba Flight (F, carves, never hovers)','LOCKED','play'],
['ALL','Numpad fight layout (4/6 1/3 2 5 8 7 9)','LOCKED','play'],
['ALL','Real 4-wheel board, tan wheels, never a hoverboard','LOCKED','play'],
['ALL','Left prosthetic covered every season (S2 exposed-leg sheet = LEGACY)','LOCKED','play'],
['ALL','No teleport — fast travel = RIFFT Step (physical route) / no hover — pending Coach confirm vs locks.json','CURRENT','placeholder'],
['ALL','Board locked to left prosthetic foot while riding (only B bail / Space kick-off separate) — mechanism Gallium/magnetic OPEN','CURRENT','play'],
['ALL','Season special (numpad 9) per form','OPEN','placeholder'],
['S1','Look: crown afro vs black spiky mask — pending S1 guide check','OPEN','placeholder'],
['S1','Street skating: push, pump, ollie, grinds, wall plant','LOCKED','play'],
['S1','Gallium BRACE / ANCHOR-RELEASE, sacrificial anchors','LOCKED','placeholder'],
['S1','GALLIUM GALLOP, Catch the Floor, Magnetic Snapline','LOCKED','placeholder'],
['S1','Merkaba limits him (limiter mechanic PROPOSAL)','LOCKED','placeholder'],
['S2','States unlock incl. Heavy Metal Crash State (effects OPEN, names PLACEHOLDER) — press R','CURRENT','placeholder'],
['S2','Merkaba: more direct transfer','LOCKED','placeholder'],
['S3','Look: braided mane','CURRENT','play'],
['S3','Merkaba mounted on his BACK','CURRENT','play'],
['S3','BLACK AMP RIFFT (effect OPEN) — press R','CURRENT','placeholder'],
['S3','Extra Gallium from a RIFFT in reality','CURRENT','placeholder'],
['S3','Bandaged right hand, glow through cracks (colour OPEN); ','CURRENT','play'],
['S3','Hand-damage origin: galaxy-scale Galaxy Gallium encounter (M\'Zaro not confirmed)','PROPOSAL','placeholder'],
['S3','True RIFFT Flight, Board Blast, Sparky, denser build','LOCKED','placeholder'],
['S3','Brick training (G at Skatepark), lion movement','PROPOSAL','play'],
['S4','Look: the lion','PROPOSAL','placeholder'],
['S4','Bandaged right hand carries forward','CURRENT','play'],
['S4','Merkaba on back carries over from S3','PROPOSAL','play'],
['S4','All other S4 powers','OPEN','placeholder']];
const G=()=>window.__game;const form=()=>(G()&&G().st.metalForm)||1;
const avail=s=>s==='ALL'||s==='S'+form(); // forms freely switchable: rows show for the selected form
let el;function render(){if(!el){el=document.createElement('div');el.id='powers';el.style.cssText='position:fixed;left:50%;top:8%;transform:translateX(-50%);max-width:94vw;max-height:80vh;overflow:auto;background:rgba(10,8,20,.92);color:#eee;font:13px system-ui;padding:12px 16px;border-radius:12px;z-index:60;display:none';document.body.appendChild(el);}
 const c={LOCKED:'#7fe08a',CURRENT:'#7fc8ff',PROPOSAL:'#ffb86b',OPEN:'#aaa'};
 el.innerHTML='<b>METAL POWERS · form S'+form()+'</b> <small>(N / POWERS to close · feelings: UNKNOWN · whole panel PROPOSAL build)</small><table>'+P.map(([s,n,t,k])=>{const on=avail(s);return '<tr style="opacity:'+(on?1:.4)+'"><td>'+s+'</td><td>'+n+'</td><td style="color:'+c[t]+'">'+t+'</td><td>'+(on?(k==='play'?'playable':'placeholder'):'switch to '+s)+'</td></tr>';}).join('')+'</table>';}
function toggle(){render();el.style.display=el.style.display==='none'?'block':'none';}
function say(t){const e=document.getElementById('toast');if(e){e.innerHTML=t;e.style.opacity=1;}}
addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='KeyN')toggle();
 if(e.code==='KeyR'){const f=form();say(f>=3?'BLACK AMP RIFFT — CURRENT, effect OPEN (placeholder)':f===2?'Heavy Metal Crash State — CURRENT unlock, effect OPEN (placeholder)':'States unlock in S2');}
 if(e.code==='Numpad9'||e.code==='KeyO'&&false)say('S'+form()+' season special — OPEN (placeholder)');});
window.__powers={toggle,list:P,get open(){return el&&el.style.display!=='none';}};
addEventListener('wir-form',()=>{if(el&&el.style.display!=='none')render();});
