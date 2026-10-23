// scouter.js: Material Scouter step 1, CLIP zero-shot in the browser (Binary Bark). PROPOSAL.
// Usage: import {startScouter} from './scouter.js'; startScouter(videoEl, overlayEl)
// Dispatches window event 'wir-material' with detail {material, massEst, moveCost, card}.
import {MATERIALS, card} from './materials.js';
const KEYS=Object.keys(MATERIALS), LABELS=KEYS.map(k=>MATERIALS[k].prompt);
let clf=null;
async function load(status){
  if(clf) return clf;
  status&&(status.textContent='Loading vision model (first time ~90 MB)…');
  const {pipeline}=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  clf=await pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32');
  return clf;
}
export async function startScouter(video, overlay, {intervalMs=1500, minConf=0.4}={}){
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
  video.srcObject=stream; video.playsInline=true; await video.play();
  await load(overlay);
  const cv=document.createElement('canvas'); cv.width=224; cv.height=224; const g=cv.getContext('2d');
  let busy=false;
  const tick=async()=>{ if(busy) return; busy=true;
    try{ g.drawImage(video,0,0,224,224);
      const out=await clf(cv.toDataURL('image/jpeg',0.8), LABELS);
      const top=out[0], key=KEYS[LABELS.indexOf(top.label)];
      if(top.score<minConf){ overlay.innerHTML='<b>UNKNOWN</b>: scan closer<br><small>best guess '+MATERIALS[key].label+' '+top.score.toFixed(2)+'</small>'; }
      else { const c=card(key,top.score); render(overlay,c);
        window.dispatchEvent(new CustomEvent('wir-material',{detail:{material:key,massEst:c.massEst,moveCost:c.moveCost,card:c}})); }
    }catch(e){ overlay.textContent='Scouter error: '+e.message; }
    busy=false; };
  return setInterval(tick, intervalMs);
}
export function render(el,c){
  const n=v=>v==null?'<i>TBD (Coach data)</i>':v;
  el.innerHTML=`<div style="font:13px monospace"><b>${c.label}</b> · ${(c.confidence*100)|0}%<br>
  Density ${c.density[0]}–${c.density[1]} kg/m³<br>Hardness ${c.hardness}<br>${c.behavior}<br>
  Est. mass in view ~${c.massEst} kg <small>(ESTIMATE)</small><br>Attunability ${n(c.attunability)}<br>Move cost ${n(c.moveCost)}<br>
  <small style="color:#f96">${c.tag}</small></div>`;
}
