/* v8 tap-to-identify + tap-to-label. Long-press (0.6 s) on something in the camera view:
   1) region-grow on the contrast-normalized frame finds the object's box under your finger (works for a white cup on black)
   2) a remembered tag with a matching color/shape signature is applied at once; otherwise an optional CLIP zero-shot guess
      (transformers.js, loaded on first use, runs on-device) is offered, and you confirm or pick a label ("this is a cup")
   3) tags are remembered per profile and also fix wrong detector labels later. Manual objects are tracked by re-growing the region. */
import {B,preFrame} from './burn.js';
import {FX} from './fx.js';
import {regionBox,colorSig,sigDist,TAG_LABELS} from './vision.js';
let ts,say,chip,lp=null; const key=()=>'wirlab.tags.'+(localStorage.getItem('wirlab.current')||'guest');
const load=()=>{ try{ return JSON.parse(localStorage.getItem(key())||'[]'); }catch{ return []; } };
const save=()=>{ try{ localStorage.setItem(key(),JSON.stringify(B.tags.slice(-40))); }catch{} };
function inv(x,y){ const a=ts({x:0,y:0}), b=ts({x:1,y:1}); return {u:(x-a.x)/(b.x-a.x),v:(y-a.y)/(b.y-a.y)}; }
function toScr(F,bx){ const vw=F.W*F.sx, vh=F.H*F.sy; const a=ts({x:bx.x*F.sx/vw,y:bx.y*F.sy/vh}), b=ts({x:(bx.x+bx.w)*F.sx/vw,y:(bx.y+bx.h)*F.sy/vh}); return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}; }
function toImg(F,s){ const p=inv(s.x,s.y), q=inv(s.x+s.w,s.y+s.h); const x0=Math.min(p.u,q.u)*F.W, x1=Math.max(p.u,q.u)*F.W, y0=Math.min(p.v,q.v)*F.H, y1=Math.max(p.v,q.v)*F.H;
  return {x:Math.max(0,x0|0),y:Math.max(0,y0|0),w:Math.max(1,Math.min(F.W,x1)-x0|0),h:Math.max(1,Math.min(F.H,y1)-y0|0)}; }
export function init(toScreen,sayFn){ ts=toScreen; say=sayFn; B.tags=load(); B.sigOf=(box,F)=>{ const b=toImg(F,box); return b.w>2&&b.h>2?colorSig(F.img.data,F.W,b):null; };
  chip=document.createElement('div'); chip.id='tagchip'; Object.assign(chip.style,{position:'fixed',zIndex:44,display:'none',background:'#0b1020ee',color:'#fff',borderRadius:'12px',padding:'8px',font:'12px system-ui',maxWidth:'260px'}); document.body.appendChild(chip); const st=document.createElement('style'); st.textContent='#tagchip button{all:unset;cursor:pointer;display:inline-block;margin:2px;padding:3px 7px;border-radius:9px;background:#ffffff1f;font:11px system-ui;color:#fff}#tagchip button[data-x]{background:none;opacity:.7}'; document.head.appendChild(st);
  addEventListener('pointerdown',e=>{ if(e.target.closest('button,#bar,#modes,#more,#train,#ptable,#tagchip,#v7n,#v7x,#v7q,#gate,#card')) return; lp={x:e.clientX,y:e.clientY,t:setTimeout(()=>{ identify(lp.x,lp.y); lp=null; },600)}; });
  const cancel=e=>{ if(lp&&(!e.clientX||Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>14)){ clearTimeout(lp.t); lp=null; } };
  addEventListener('pointermove',cancel); addEventListener('pointerup',()=>{ if(lp){ clearTimeout(lp.t); lp=null; } });
  setInterval(track,400); }
export function identify(x,y){ const F=preFrame(); if(!F) return null; const p=inv(x,y); const ib=regionBox(F.img.data,F.W,F.H,p.u*F.W,p.v*F.H);
  if(!ib){ say('Could not find an object edge there. Try a plainer background or hold it closer.'); return null; }
  const box=toScr(F,ib), sig=colorSig(F.img.data,F.W,ib); let bt=null,bd=.3; for(const t of B.tags){ const q=sigDist(sig,t.sig); if(q<bd){bd=q;bt=t;} }
  if(bt){ add(bt.label,box,sig,false); say(`That's your ${bt.label}`); return bt.label; }
  ask(box,sig,null); clip(F,ib).then(g=>{ if(g&&chip.style.display!=='none'&&chip.dataset.k===String(box.x)) ask(box,sig,g); }); return 'ask'; }
function ask(box,sig,guess){ chip.dataset.k=String(box.x); chip.style.left=Math.min(innerWidth-270,Math.max(6,box.x))+'px'; chip.style.top=Math.min(innerHeight-160,box.y+box.h+6)+'px'; chip.style.display='block';
  chip.innerHTML=`<b>What is this?</b> ${guess?`<br>Looks like a <b>${guess.label}</b> (${Math.round(guess.score*100)}%) <button data-l="${guess.label}">✓ yes</button>`:'<small style="opacity:.7">(guessing…)</small>'}<br>${TAG_LABELS.map(l=>`<button data-l="${l}">${l}</button>`).join('')} <button data-x="1">✕</button>`;
  chip.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; chip.style.display='none'; if(b.dataset.l){ add(b.dataset.l,box,sig,true); say(`Got it: this is a ${b.dataset.l}. I'll remember it.`); window.labEvent?.('tag:'+b.dataset.l); } }; }
export function add(label,box,sig,remember){ B.objs.push({label,box:{...box},seen:FX.t,seenMs:performance.now(),vx:0,vy:0,fire:0,chars:[],safe:false,manual:true,sig,conf:true});
  if(remember){ B.tags=B.tags.filter(t=>!(t.label===label&&sigDist(t.sig,sig)<.15)); B.tags.push({label,sig}); save(); } }
function track(){ const ms=B.objs.filter(o=>o.manual); if(!ms.length) return; const F=preFrame(); if(!F) return;
  for(const o of ms){ const c=inv(o.box.x+o.box.w/2,o.box.y+o.box.h/2); const ib=regionBox(F.img.data,F.W,F.H,c.u*F.W,c.v*F.H); if(!ib) continue;
    const sig=colorSig(F.img.data,F.W,ib); if(sigDist(sig,o.sig)>.45) continue; const nb=toScr(F,ib); for(const k of ['x','y','w','h']) o.box[k]+=(nb[k]-o.box[k])*.6; o.seen=FX.t; } }
/* optional CLIP zero-shot on the crop (on-device). Fails quietly offline → the picker still works. */
let clipP=null;
async function clip(F,ib){ try{ if(!clipP) clipP=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2').then(m=>m.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32'));
    const c=document.createElement('canvas'); const pad=.12; const x=Math.max(0,ib.x-ib.w*pad), y=Math.max(0,ib.y-ib.h*pad), w=Math.min(F.W-x,ib.w*(1+2*pad)), h=Math.min(F.H-y,ib.h*(1+2*pad)); c.width=224; c.height=224;
    c.getContext('2d').drawImage(F.cv,x,y,w,h,0,0,224,224); const pipe=await Promise.race([clipP,new Promise((_,rj)=>setTimeout(()=>rj('slow'),15000))]);
    const out=await pipe(c.toDataURL('image/jpeg',.85),TAG_LABELS.map(l=>'a photo of a '+l)); const b=out[0]; return {label:b.label.replace('a photo of a ',''),score:b.score}; }catch(e){ return null; } }
