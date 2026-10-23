import * as MV from './moves.js';
import * as STL from './still.js';
import * as TR from './train.js';
import * as FXE from './fx.js';
import {FX} from './fx.js';
import * as EL from './elements.js';
import * as AT from './atoms.js';
import * as GE from './gear.js';
import * as BU from './burn.js';
import * as BO from './body.js';
import * as IT from './items.js';
import * as V7 from './v7ui.js';
const {E}=EL;
const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const $ = id => document.getElementById(id);

/* ---------- data ---------- */
const ELEMENTS = [
  {id:'Mg', name:'Magnesium', color:'#e8e8ff'},
  {id:'Na', name:'Sodium', color:'#ffb347'},
  {id:'K',  name:'Potassium', color:'#c9a0ff'},
  {id:'Cu', name:'Copper', color:'#3fe0c0'},
  {id:'Fe', name:'Iron filings', color:'#ff7a2a'},
];
const TARGETS = [
  {id:'water', name:'Water dish'},
  {id:'flame', name:'Burner'},
  {id:'paper', name:'Paper'},
];
const HUMAN = "Don't get smart to hurt nobody.";
// Each reaction: fx preset + card. All are standard classroom demos, shown virtually.
const R = {
 'Mg+fire': {fx:'mgburn', title:'Magnesium: the Sun Went Indoors', eq:'2Mg + O₂ → 2MgO',
  why:'Magnesium grabs oxygen so hard it releases a huge amount of energy, around 3100 °C. The flame is brilliant white and gives off UV light. The white smoke and powder is magnesium oxide.',
  hurt:'Staring at it can hurt your eyes. It is hot enough to cause bad burns. And NEVER put water on burning magnesium: it rips oxygen out of water, releasing hydrogen, and the fire gets worse.',
  safe:'Teachers use tiny strips, tongs, safety glasses, and do not look straight at it. Burning metal is smothered with dry sand or a Class D extinguisher. Step back, breathe, let the adult handle it.',
  oscar:'I looked straight at it once. I now see in ✨ sparkle ✨ permanently. Do not be me.',
  earth:'Same chemistry lights emergency flares that help rescuers find people. Use light to find people, not to hurt them.'},
 'Mg+water': {fx:'fizzslow', title:'Magnesium in Cold Water: …Hello?', eq:'Mg + 2H₂O → Mg(OH)₂ + H₂ (very slow)',
  why:'In cold water a thin oxide skin protects magnesium, so you only get a few lazy hydrogen bubbles. Hot steam makes it react much faster.',
  hurt:'The real danger is the burning version: water on a magnesium fire makes it flare up violently.',
  safe:'Cold water + Mg strip = boring and fine. Burning Mg + water = never. Dry sand or Class D only.',
  oscar:'I waited 40 minutes for this bubble. It was worth it. (It was not.)',
  earth:'Magnesium is in every chlorophyll molecule. Your plants are literally powered by it. 🌱'},
 'Mg+water+fire': {fx:'mgflare', title:'WATER ON BURNING MAGNESIUM — WHY WE NEVER', eq:'Mg + H₂O → MgO + H₂ (then H₂ burns)',
  why:'Burning magnesium is so hot it pulls oxygen out of water. That releases hydrogen gas, which also burns. Water feeds this fire instead of putting it out.',
  hurt:'Flare-ups, spattering molten metal, and serious burns. This is why water is the wrong extinguisher for metal fires.',
  safe:'Metal fires: dry sand or a Class D extinguisher, and get away calmly. Here it is virtual, so curiosity costs nothing.',
  oscar:'I tried to put it out with water. The fire said "thank you" and got bigger.',
  earth:'Knowing which fires water makes worse saves firefighters\' lives.'},
 'Na+water': {fx:'nawater', title:'Sodium: Diva on a Water Slide', eq:'2Na + 2H₂O → 2NaOH + H₂',
  why:'Sodium has one loose outer electron it is desperate to give away. It reacts with water, making hydrogen gas and sodium hydroxide. The heat melts it into a ball that zips around on hydrogen bubbles, and the hydrogen can catch with a yellow-orange flame.',
  hurt:'It can pop and spatter. Sodium hydroxide is caustic and burns skin and eyes. Hydrogen can ignite.',
  safe:'Only teachers demo it, with a pea-sized piece, safety screen and goggles. Metal is stored under oil and never touched with bare hands. Stand back and enjoy the show calmly.',
  oscar:'Sodium entered the pool like it owned the place. Lifeguard quit.',
  earth:'Sodium\'s yellow-orange glow is the old street-light color. Light up streets, not trouble.'},
 'K+water': {fx:'kwater', title:'Potassium: Sodium\'s Louder Cousin', eq:'2K + 2H₂O → 2KOH + H₂',
  why:'Potassium\'s outer electron sits even farther from the nucleus, so it gives it up even more easily. It reacts more violently than sodium, and the hydrogen ignites at once with a lilac flame.',
  hurt:'It is more violent than sodium: it can spatter or pop. Potassium hydroxide burns skin and eyes.',
  safe:'Teacher demo only: tiny piece, safety screen, goggles, distance. Watch, don\'t touch.',
  oscar:'Potassium arrived in purple, screamed, and left. Iconic.',
  earth:'Potassium is a key plant nutrient. Bananas and your garden both love it. 🍌🌱'},
 'Na+fire': {fx:'flametest', color:[1,0.65,0.15], title:'Sodium Flame Test: Orange Alert', eq:'Excited Na atoms emit light at ~589 nm',
  why:'Heat bumps sodium\'s electrons up an energy level. When they fall back down, they release yellow-orange light of one exact color.',
  hurt:'The metal itself is very reactive. Real flame tests use safe sodium salts like table salt on a wire, not the metal.',
  safe:'Goggles, tied-back hair, a teacher present, salts not metals. A calm hand is a safe hand.',
  oscar:'Every flame test eventually turns orange because sodium is EVERYWHERE. Sodium is the glitter of chemistry.',
  earth:'Astronomers use these same color fingerprints to tell what stars are made of. ✨'},
 'K+fire': {fx:'flametest', color:[0.78,0.6,1], title:'Potassium Flame Test: Lilac Drama', eq:'Excited K atoms emit lilac light (~766 nm + ~404 nm)',
  why:'Potassium\'s electrons release red and violet light when they drop back down. Together they look lilac.',
  hurt:'Potassium metal reacts violently with moisture. Real flame tests use potassium salts.',
  safe:'Salts on a clean wire loop, goggles, adult supervision. Watch through cobalt-blue glass to hide sodium\'s orange.',
  oscar:'Lilac. Delicate. Fancy. Potassium is wearing a tuxedo to the bonfire.',
  earth:'Same color-fingerprint science tests soil and water for pollution.'},
 'Cu+fire': {fx:'flametest', color:[0.2,0.95,0.75], title:'Copper: The Green-Blue Glow-Up', eq:'2Cu + O₂ → 2CuO (heat); Cu emits green-blue light',
  why:'Excited copper atoms give off green-blue light. That is why copper compounds turn flames this color.',
  hurt:'Hot metal and flames cause burns. Some copper compounds are toxic if swallowed or breathed in.',
  safe:'Tongs, goggles, ventilation, a teacher present. Wash hands after.',
  oscar:'Copper turned the fire into a mermaid. I have no further questions.',
  earth:'Copper wires carry clean electricity from solar panels and wind turbines. ⚡🌍'},
 'Fe+fire': {fx:'sparks', title:'Iron Filings: Tiny Fireworks', eq:'3Fe + 2O₂ → Fe₃O₄',
  why:'An iron nail barely burns, but filings have a huge surface area touching oxygen, so each tiny bit flashes as an orange spark. Sparklers use this.',
  hurt:'Sparks burn skin and clothes and can get in eyes.',
  safe:'Goggles, sprinkle a pinch into a flame with a teacher, nothing flammable nearby, calm hands.',
  oscar:'Iron: boring as a nail, a superstar as dust. Relatable.',
  earth:'Iron is in the hemoglobin carrying oxygen through your blood right now. ❤️'},
 'Cu+water': {fx:'nothing', title:'Copper in Water: Nap Time', eq:'Cu + H₂O → no reaction',
  why:'Copper holds its electrons tight. It sits low in the reactivity series, so water can\'t take them.',
  hurt:'Nothing happens here. That\'s why pipes are made of copper.',
  safe:'Boring = safe. Boring is underrated.',
  oscar:'I dropped copper in water and copper said "no." Respect.',
  earth:'Copper pipes carry clean drinking water for millions. 💧'},
 'Fe+water': {fx:'nothing', title:'Iron in Water: Slow-Motion Rust', eq:'4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃ (rust, over days)',
  why:'Iron rusts with water AND oxygen together, but slowly, over days and weeks.',
  hurt:'Rusty edges can cut, so keep tetanus shots up to date.',
  safe:'Gloves for rusty metal, clean any cuts.',
  oscar:'I watched it rust. Took a week. Best show I\'ve ever seen.',
  earth:'Rust-proofing bridges keeps people safe and saves tons of steel. 🌉'},
};
R['Na+water+fire']=R['Na+water']; R['K+water+fire']=R['K+water'];
R['Cu+water+fire']=R['Cu+water']; R['Fe+water+fire']=R['Fe+water'];
function lookup(el, target){
  if (target==='water') return {key:el+'+water', r:R[el+'+water']}; // non-ignite water
  return {key:el+'+fire', r:R[el+'+fire']};
}

/* ---------- state ---------- */
const S = {cursor:{x:innerWidth/2,y:innerHeight/2}, held:null, loads:{}, facing:'environment',
  low:false, stream:null, landmarker:null, handSeen:false, pinch:false, palmT:0, busy:false, src:'touch', boost:'auto', boostOn:false, luma:128, pinchOn:.35, pinchOff:.55, lostT:0, calib:null};
try{const c=JSON.parse(localStorage.getItem('wirlab.calib')||'null'); if(c){S.pinchOn=c.on;S.pinchOff=c.off;S.ext=c.ext;S.swipeT=c.swipe;S.calV=c.v||1;}}catch{}
/* progressive unlock: Cu,Fe open after the gate; Mg after 2 reactions; Na after 4; K after 6 */
const UNLOCK={Cu:0,Fe:0,Mg:2,Na:4,K:6};
const LS='wirlab.v1', gst=()=>JSON.parse(localStorage.getItem(LS)||'{}');
const doneN=()=>(gst().done||[]).length;
function markDone(k){const g=gst(); g.done=[...new Set([...(g.done||[]),k])]; localStorage.setItem(LS,JSON.stringify(g)); window.PROFILE?.sync(); window.labEvent?.('rx:'+k); refreshLocks();}
function refreshLocks(){document.querySelectorAll('.el').forEach(n=>n.classList.toggle('locked',doneN()<UNLOCK[n.dataset.id]));}

/* ---------- UI build ---------- */
const shelf=$('shelf'), tgs=$('targets'), cur=$('cursor');
ELEMENTS.forEach(e=>{const d=document.createElement('div');d.className='el';d.dataset.id=e.id;
  d.style.borderColor=e.color;d.innerHTML=`${e.id}<small>${e.name}</small>`;shelf.appendChild(d);});
TARGETS.forEach(t=>{const d=document.createElement('div');d.className='tg';d.dataset.id=t.id;
  d.innerHTML=`<span>${t.name}</span><div class="load"></div>`;tgs.appendChild(d);});
const status = m => $('status').textContent = m;

function hit(sel,x,y){for(const n of document.querySelectorAll(sel)){const r=n.getBoundingClientRect();
  const pad=14; if(x>r.left-pad&&x<r.right+pad&&y>r.top-pad&&y<r.bottom+pad) return n;} return null;}

function grab(){ if(S.held||S.busy) return; const n=hit('.el',S.cursor.x,S.cursor.y);
  if(n&&n.classList.contains('locked')){ status(`Locked: ${n.dataset.id} unlocks after ${UNLOCK[n.dataset.id]} different reactions (you have ${doneN()}).`); return; }
  if(n){S.held=n.dataset.id; cur.classList.add('grab'); cur.textContent=S.held; status(`Holding ${S.held}. Drop it on water, flame or paper.`);} }
function release(){ if(!S.held) return; const t=hit('.tg',S.cursor.x,S.cursor.y);
  if(t){ const id=t.dataset.id; S.loads[id]=S.held; t.querySelector('.load').textContent=S.held;
    if(id==='water' && (S.held==='Na'||S.held==='K'||S.held==='Mg')) react(S.held,'water',false);
    else if(id==='water') react(S.held,'water',false);
    else status(`${S.held} is on the ${id}. Hold an open palm 1 s (or Ignite / B) to ignite.`);
  } else status('Dropped in mid-air. Gravity is virtual too. Try again.');
  S.held=null; cur.classList.remove('grab'); cur.textContent=''; }
function ignite(){ if(S.busy) return;
  // flame/paper loads first; else water loaded with Mg -> the "never" lesson
  for(const t of ['flame','paper']) if(S.loads[t]) return react(S.loads[t],t,true);
  if(S.loads.water) return react(S.loads.water,'water',true);
  status('Nothing loaded. Pinch an element and drop it on a target first.');
  const p=tgPos('flame'); for(let i=0;i<30;i++){const a=FXE.rnd(-3,-.2),v=FXE.rnd(200,600);FXE.L.streak.spawn(p.x,p.y,Math.cos(a)*v,Math.sin(a)*v,{life:.5,w:1.6,lag:16,grav:900,c:[1.2,.65,.2]});} }
function resetLab(){ S.loads={}; EL.chemReset(); document.querySelectorAll('.tg .load').forEach(n=>n.textContent='');
  status('Lab reset. Inspector Spud has filed nothing. For once.'); }

/* ---------- reactions ---------- */
function tgPos(id){const r=document.querySelector(`.tg[data-id="${id}"]`).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function react(el,target,fire){
  let key = target==='water' ? el+'+water'+(fire?'+fire':'') : el+'+fire';
  const r = R[key]; if(!r) return;
  S.busy=true; markDone(key); const p=tgPos(target);
  if(target==='paper'&&fire) EL.chemFx('paper',target,{});
  EL.chemFx(r.fx,target,r);
  status(fire?`${el} ignited on ${target}…`:`${el} meets water…`);
  setTimeout(()=>showCard(r), r.fx==='nothing'?900:3200);
}
function showCard(r){
  $('cardBody').innerHTML=`<h2>${r.title}</h2><div class="eq">${r.eq}</div>
  <h3>⚗️ Why it happens</h3><p>${r.why}</p><h3>🚑 How people get hurt</h3><p>${r.hurt}</p>
  <h3>🧘 Stay safe & calm</h3><p>${r.safe}</p><p class="oscar">🥕 Oscar: ${r.oscar}</p>
  <h3>🌍 Humanity & Earth</h3><p>${r.earth}<br><b>${HUMAN}</b></p>`;
  $('card').hidden=false; }
$('cardClose').onclick=()=>{$('card').hidden=true;S.busy=false;resetLab();};

/* ---------- engine glue ---------- */
const canvas=$('fx');
function initThree(){ FXE.init(canvas,video); }
function resize(){ FX.low=S.low; FXE.resize(); }
E.say=m=>{ const g=$('gsay'); g.textContent=m; g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); };
/* ---------- camera ---------- */
const video=$('cam');
async function startCamera(){
  $('camerr').hidden=true;
  if(S.stream) S.stream.getTracks().forEach(t=>t.stop());
  if(!navigator.mediaDevices?.getUserMedia){ return camError('This browser has no camera access (needs HTTPS and Safari/Chrome). Touch and controller still work.'); }
  try{
    S.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:S.facing},width:{ideal:1280},height:{ideal:720}}});
    video.srcObject=S.stream; await video.play().catch(()=>{}); camOn(true); startTrackLoop();
    video.classList.toggle('mirror',S.facing==='user'); video.onloadedmetadata=()=>FXE.setCamera(true,S.facing==='user'); FXE.setCamera(true,S.facing==='user');
    status(S.landmarker?'Point ☝️ to poke, cup 🤲 to hold.':'Camera on. Loading hand tracking…');
  }catch(err){
    const denied = err && (err.name==='NotAllowedError'||err.name==='SecurityError');
    camError(denied
      ? '📷 Camera permission was denied. To fix on iPhone: tap "aA" in the Safari address bar → Website Settings → Camera → Allow, then reload. Or Settings → Apps → Safari → Camera → Allow. You can still play with touch or a controller.'
      : `📷 Camera unavailable (${err?.name||'error'}). Touch and controller still work.`);
  }
}
function camOn(on){ const c=$('camOn'); c.hidden=false; c.classList.toggle('off',!on); c.textContent=on?'● Camera on · processed on this device only':'○ Camera off · tap to turn on'; }
window.__stopCamera=()=>{ S.stream?.getTracks().forEach(t=>t.stop()); S.stream=null; camOn(false); };
function camError(m){ const b=$('camerr'); b.hidden=false; b.innerHTML=m+'<br><br><button id="camRetry">Try camera again</button> <button id="camDismiss">Use touch</button>';
  $('camRetry').onclick=startCamera; $('camDismiss').onclick=()=>b.hidden=true; status('No camera. Drag elements with your finger.'); }

/* ---------- hand tracking ---------- */
async function initHands(){
  try{
    const v=await import(VISION+'/vision_bundle.mjs');
    const fs=await v.FilesetResolver.forVisionTasks(VISION+'/wasm');
    const opts=d=>({baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:d},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4});
    try{ S.landmarker=await v.HandLandmarker.createFromOptions(fs,opts('GPU')); }
    catch{ S.landmarker=await v.HandLandmarker.createFromOptions(fs,opts('CPU')); }
    status(S.stream?'Hand tracking ready. Point ☝️ to poke, cup 🤲 to hold.':'Hand tracking ready (no camera yet).');
  }catch(e){ console.warn('hands failed',e); status('Hand tracking could not load. Touch and controller still work.'); }
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function toScreen(l){ const vw=video.videoWidth,vh=video.videoHeight,W=innerWidth,H=innerHeight;
  const s=Math.max(W/vw,H/vh),dx=(W-vw*s)/2,dy=(H-vh*s)/2; let x=l.x*vw*s+dx; const y=l.y*vh*s+dy;
  if(S.facing==='user') x=W-x; return {x,y}; }
let lastVT=-1, frameN=0;
/* One-euro filter: smooth when still, responsive when moving */
class OneEuro{constructor(mc=1.2,beta=.03,dc=1){this.mc=mc;this.b=beta;this.dc=dc;this.x=null;this.dx=0;}
  a(c,dt){const r=2*Math.PI*c*dt;return r/(r+1);}
  f(v,dt){if(this.x===null){this.x=v;return v;} const d=(v-this.x)/dt; this.dx+=this.a(this.dc,dt)*(d-this.dx);
    const c=this.mc+this.b*Math.abs(this.dx)*1000; this.x+=this.a(c,dt)*(v-this.x); return this.x;}}
const F=[...Array(42)].map(()=>new OneEuro());
/* Low-light / dark-skin boost: downscale, measure brightness, apply gamma+contrast LUT before detection */
const proc=document.createElement('canvas'), pctx=proc.getContext('2d',{willReadFrequently:true}); const LUT=new Uint8ClampedArray(256);
let lutFor=-1;
function buildLUT(l){ const target=125, g=Math.max(.35,Math.min(1,Math.log(target/255)/Math.log(Math.max(8,l)/255)));
  for(let i=0;i<256;i++){ let v=255*Math.pow(i/255,g); v=(v-128)*1.25+128; LUT[i]=v; } lutFor=l; }
function frameForDetect(){
  const W=480, H=Math.round(W*video.videoHeight/video.videoWidth); if(proc.width!==W){proc.width=W;proc.height=H;}
  pctx.drawImage(video,0,0,W,H);
  const meter=(S.metN=(S.metN||0)+1)%15===0, apply=S.boost==='on'||(S.boost==='auto'&&S.boostOn);
  if(!meter&&!apply) return proc;
  const img=pctx.getImageData(0,0,W,H), d=img.data;
  if(meter){ let sum=0,n=0; for(let i=0;i<d.length;i+=64){sum+=d[i]*.3+d[i+1]*.59+d[i+2]*.11;n++;} S.luma=sum/n; FX.sceneL=S.luma/255;
    S.boostOn=S.luma<95; updBoostBtn();
    let c=0,cn=0,e2=0,en=0; for(let y=0;y<H;y+=6) for(let x=0;x<W;x+=6){ const k=(y*W+x)*4, l=d[k]*.3+d[k+1]*.59+d[k+2]*.11; if(x>W*.3&&x<W*.7&&y>H*.3&&y<H*.7){c+=l;cn++;} else if(x<W*.12||x>W*.88||y<H*.12){e2+=l;en++;} }
    S.backlit=(e2/en)-(c/cn)>45&&(c/cn)<120; lightWarn(S.backlit?'☀️ Backlit':S.luma<60?'🌙 Dim light':null); }
  if(apply){ if(Math.abs(lutFor-S.luma)>6) buildLUT(S.luma); for(let i=0;i<d.length;i+=4){d[i]=LUT[d[i]];d[i+1]=LUT[d[i+1]];d[i+2]=LUT[d[i+2]];} pctx.putImageData(img,0,0); }
  return proc;
}
function updBoostBtn(){ const b=$('boost'); if(b) b.textContent='Boost: '+(S.boost==='auto'?('Auto'+(S.boostOn?' (on)':'')):S.boost==='on'?'On':'Off'); }
/* skeleton overlay */
const skel=$('skel'), sk=skel.getContext('2d');
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
/* v6: one colour per hand, eased over ~150 ms toward the (debounced) pose colour, so fast transitions don't flicker */
const SKC={poke:[95,255,138],cup:[95,255,138],fist:[255,154,90],open:[127,216,255]}, SKD=[200,245,255], skCur=[null,null];
function skelCol(i,g){ const t=SKC[g]||SKD; const c=skCur[i]||(skCur[i]=[...t]); for(let k=0;k<3;k++) c[k]+=(t[k]-c[k])*.18; return `rgb(${c.map(v=>v|0).join(',')})`; }
function drawSkel(hs){ hs=(hs||[]).map(h=>Array.isArray(h)?{pts:h,g:''}:h); const dpr=Math.min(devicePixelRatio,2);
  if(skel.width!==innerWidth*dpr){skel.width=innerWidth*dpr;skel.height=innerHeight*dpr;}
  sk.setTransform(dpr,0,0,dpr,0,0); sk.clearRect(0,0,innerWidth,innerHeight);
  for(const [hi,h] of hs.entries()){ const pts=h.pts; if(!pts) continue; const col=skelCol(hi,h.g);
    for(const [w,c] of [[6,'#0008'],[2.5,col]]){ sk.lineWidth=w; sk.strokeStyle=c; sk.lineCap='round'; sk.beginPath();
      for(const [a,b] of BONES){sk.moveTo(pts[a].x,pts[a].y);sk.lineTo(pts[b].x,pts[b].y);} sk.stroke(); }
    for(const [i,p] of pts.entries()){ const tip=i===4||i===8; sk.fillStyle=tip?col:'#fff'; sk.strokeStyle='#000a'; sk.lineWidth=1.5;
      sk.beginPath(); sk.arc(p.x,p.y,tip?6:3.5,0,7); sk.fill(); sk.stroke(); } } }
const hint=m=>{const h=$('hint'); h.hidden=!m; if(m) h.textContent=m;};
/* Two-stage calibration (saved to the profile, done once):
   Stage 1 static: open hand → learns how "extended" your fingers read.
   Stage 2 movement signature: ☝️ poke, 🤲 soft cup, then 3 flicks → learns curled-finger ratio and your flick speed.
   Result: per-user finger-extension threshold (S.ext) and swipe threshold (S.swipeT). */
const CAL_STEPS=[{k:'open',icon:'1',msg:'Stage 1: show your OPEN hand, fingers spread, arm\'s length away'},
 {k:'poke',icon:'2a',msg:'Stage 2: POINT one finger (others curled) and hold'},
 {k:'cup',icon:'2b',msg:'Now CUP your hand softly, like holding water, and hold'},
 {k:'flick',icon:'2c',msg:'Now FLICK your hand sideways fast, 3 times'}];
const ratio=(pts,f)=>{ const [t,p]=[[8,6],[12,10],[16,14],[20,18]][f]; return Math.hypot(pts[t].x-pts[0].x,pts[t].y-pts[0].y)/(Math.hypot(pts[p].x-pts[0].x,pts[p].y-pts[0].y)||1); };
function startCalib(){ S.calib={i:0,open:[],curl:[],flicks:[],peak:0,t:0}; $('calbox').hidden=false; calShow(); }
function calShow(){ const s=CAL_STEPS[S.calib.i]; $('calIcon').textContent=s.icon; $('calMsg').textContent=s.msg; $('calFill').style.width='0'; S.calib.n=0; }
function stepCalib(h,dt){ const c=S.calib; if(!c||!h?.pts) return; const s=CAL_STEPS[c.i], pts=h.pts, need=25;
  if(s.k==='open'){ c.open.push(Math.min(...[0,1,2,3].map(f=>ratio(pts,f)))); c.n++; }
  if(s.k==='poke'&&ratio(pts,0)>Math.max(ratio(pts,1),ratio(pts,2))+.1){ c.curl.push(Math.max(ratio(pts,1),ratio(pts,2),ratio(pts,3))); c.n++; }
  if(s.k==='cup'&&(h.g==='cup'||h.g==='relaxed')){ c.n++; } // the move engine (moves.js) is learning this hand's range meanwhile
  if(s.k==='flick'){ c.peak=Math.max(c.peak,h.speed||0); if((h.speed||0)<250&&c.peak>700){ c.flicks.push(c.peak); c.peak=0; } c.n=c.flicks.length*need/3; }
  $('calFill').style.width=Math.min(100,c.n/need*100)+'%';
  if(c.n<need) return;
  if(c.i<CAL_STEPS.length-1){ c.i++; calShow(); return; }
  const med=x=>[...x].sort((p,q)=>p-q)[x.length>>1], pct=(x,q)=>[...x].sort((p,q2)=>p-q2)[Math.floor(x.length*q)];
  const o=pct(c.open,.2), k=pct(c.curl,.8);
  if(o-k<.06){ $('calMsg').textContent='Open and curled looked too similar. Move closer to the light and try again.'; S.calib={i:0,open:[],curl:[],flicks:[],peak:0}; setTimeout(calShow,1600); return; }
  S.ext=Math.max(1.02,Math.min(1.3,(o+k)/2)); S.swipeT=Math.max(700,Math.min(1800,med(c.flicks)*.6)); S.calV=2;
  saveMv(); localStorage.setItem('wirlab.calib',JSON.stringify({v:2,ext:+S.ext.toFixed(3),swipe:Math.round(S.swipeT),on:S.pinchOn,off:S.pinchOff}));
  window.PROFILE?.sync(); window.labEvent?.('calibrated');
  S.calib=null; $('calbox').hidden=true; status(`Calibrated to your hand (finger threshold ${S.ext.toFixed(2)}, flick ${Math.round(S.swipeT)} px/s). Saved to your profile.`); }
const HANDS=[{},{}]; const FL=[0,1].map(()=>[...Array(42)].map(()=>new OneEuro()));
function smooth(slot,pts,dt){ const f=FL[slot]; return pts.map((p,i)=>({x:f[i*2].f(p.x,dt),y:f[i*2+1].f(p.y,dt)})); }
try{ S.mvCal=JSON.parse(localStorage.getItem('wirlab.moves')||'null'); }catch{} if(!S.mvCal?.lo) S.mvCal=MV.defaultCal();
function saveMv(){ try{ localStorage.setItem('wirlab.moves',JSON.stringify({lo:S.mvCal.lo.map(v=>+v.toFixed(3)),hi:S.mvCal.hi.map(v=>+v.toFixed(3)),faceSign:0,sens:S.mvCal.sens})); }catch{} }
setInterval(()=>{ if(S.handSeen&&!synth) saveMv(); },15000);
function cal(){ return {on:S.pinchOn,off:S.pinchOff,ext:S.ext,swipe:S.swipeT,mv:S.mvCal}; }
S.lat={inf:0,e2e:0,trk:0,trkN:0,trkT:0};
let synth=null; // test hook: screen-pixel landmarks for headless tests
let detect=function(now){
  if(synth) return synth;
  if(!S.landmarker||!video.videoWidth||video.currentTime===lastVT) return undefined;
  if(S.low&&(frameN%2)) return undefined;
  lastVT=video.currentTime;
  const t0=performance.now(); const res=S.landmarker.detectForVideo(frameForDetect(),now); S.lat.inf=S.lat.inf*.8+(performance.now()-t0)*.2;
  // confidence gate: drop low-confidence hands instead of showing jittery guesses
  return (res.landmarks||[]).filter((lm,i)=>(res.handedness?.[i]?.[0]?.score??1)>=.6).map(lm=>lm.map(toScreen)); };
function trackHands(now,dt){
  const got=detect(now); if(got===undefined) return;
  const fdt=Math.max(dt,1/120);
  if(!got.length){ S.lostT+=dt; if(S.lostT<.3&&S.handsNow?.length){ skel.style.opacity=1-S.lostT/.3; } if(S.lostT>8&&S.facing==='environment'&&!S.flipAsked&&S.stream){ S.flipAsked=1; $('flipChip').hidden=false; }
    if(S.lostT>.3){ S.handSeen=false; S.palmT=0; $('palm').style.opacity=0; drawSkel([]); FL.forEach(f=>f.forEach(o=>o.x=null)); HANDS.forEach(h=>{h.palm=null;h.g='none';});
      if(S.pinch&&S.lostT>.8){S.pinch=false;release();} if(S.src==='hand') S.handsNow=[];
      if(S.src==='hand'||S.lostT>3) hint('Show your hand to the camera'); }
    return; }
  S.lostT=0; skel.style.opacity=1; hint(null);
  // keep slots stable: match by nearest wrist
  if(got.length===2&&HANDS[0].palm&&HANDS[1].palm){ const d=(a,h)=>Math.hypot(a[0].x-h.pts[0].x,a[0].y-h.pts[0].y);
    if(d(got[0],HANDS[1])+d(got[1],HANDS[0])<d(got[0],HANDS[0])+d(got[1],HANDS[1])) got.reverse(); }
  const hs=got.slice(0,2).map((g,i)=>EL.readHand(HANDS[i],smooth(i,g,fdt),fdt,cal()));
  if(got.length<2){ HANDS[1].palm=null; FL[1].forEach(o=>o.x=null); }
  if(!S.handSeen && !S.calib && (S.calV||0)<2 && !synth) startCalib();
  S.handSeen=true; S.src='hand'; S.handsNow=hs;
  const h=hs[0], lm=h.pts;
  drawSkel((VH.on||VH.off>0)&&!synth?[]:hs);
  if(S.calib){ return stepCalib(h,dt); }
  if(E.mode!=='chem'){ gestureHud(hs); return; }
  const sp=h.pinchPt; S.cursor.x+=(sp.x-S.cursor.x)*.6; S.cursor.y+=(sp.y-S.cursor.y)*.6;
  const pinch=h.g==='poke'||h.g==='cup';
  if(pinch&&!S.pinch) grab(); if(!pinch&&S.pinch) release(); S.pinch=pinch;
  if(h.g==='open'&&!S.held&&!S.busy){ S.palmT+=dt; $('palm').style.opacity=1; $('palmFill').style.width=Math.min(100,S.palmT*100)+'%';
    if(S.palmT>=1){ S.palmT=0; $('palm').style.opacity=0; ignite(); } }
  else { S.palmT=0; $('palm').style.opacity=0; }
}
const GHINT={
 water:[['charge','🙌 Heels together, clap','charge + blast'],['cup','🤲 Cup, then tilt','hold water · pour it'],['ripple','〰 Finger ripple','wave over the pool'],['pulse','🪼 Jellyfish pulse','bloom spray'],['scoop','Scoop','lift an orb'],['open','Open palm + lift','5 strands, 1 per finger'],['open','Curl / spread fingers','shape the strands'],['open','Push down fast','sink it'],['swipe','Flick','whip']],
 fire:[['keep','🔥 Any move','feeds the keeper flame'],['charge','🙌 Heels together, clap','charge + blast'],['poke','☝️ Point, hold still','flame grows with focus'],['bloom','💥 Flick-open / push','short burst'],['cup','🤲 Cup','ember ball'],['swipe','Flick','throw fireball'],['ripple','〰 Ripple','fingertip flames'],['thumb','👍 Thumb sweep','sparks'],['curl','✊ Curl one by one','snuff'],['circle','Circle','fire tornado'],['combo','Clap 2 hands','explosion']],
 earth:[['charge','🙌 Heels together, clap','charge + blast'],['scoop','Scoop / palm lifts','raise a rock'],['cup','🤲 Cup on the rock','grab it'],['bloom','💥 Flick-open','shatter it'],['shake','Shake','tremor'],['swipe','Flick','throw it'],['fist','Hold a fist on rock','crush to dust'],['combo','Clap 2 hands','rock wall']],
 air:[['charge','🙌 Heels together, clap','charge + blast'],['pulse','🪼 Pulse / 🤲 cup / 2 palms','air ball'],['spiral','🌀 Spiral the wrist','spin it up'],['push','Push or flick (spinning)','throw it'],['open','Open palm swipe','gust']],
 atoms:[['poke','Point at a tile / atom','take it, drag it'],['poke','Drop on another','bond or react'],['cup','🤲 Cup over molecule','rotate it'],['fist','Fist hold on molecule','split to atoms']],
 gear:[['poke','☝️ Poke an item','press: light / pour / drop'],['poke','Poke, hold, move','carry it'],['poke','Hold over lit burner','heat it']],
 chem:[['poke','Point','grab element'],['open','Open palm 1 s','ignite']],
};
function buildHud(){ $('gest').innerHTML=GHINT[E.mode].map(([k,a,b])=>`<div class="gh" data-k="${k}"><b>${a}</b><span>${b}</span></div>`).join(''); }
function gestureHud(hs){ const act=new Set(); for(const h of hs){ act.add(h.g); if(h.swipe) act.add('swipe'); if(h.circle) act.add('circle'); for(const k of h.mv||[]){ act.add(k); if(k==='spiral') act.add('circle'); } if(h.mvs?.cup) act.add('cup'); } if(hs.length>1) act.add('combo'); if(E.chg?.state==='charging') act.add('charge'); if(E.mode==='fire'&&hs.some(h=>h.mv?.length||h.mvs?.cup)) act.add('keep');
  if(hs.some(h=>h.mvs?.tiltHint)&&!E.chg?.state?.startsWith('ch')&&(!S.tiltT||performance.now()-S.tiltT>7000)){ S.tiltT=performance.now(); E.say('Palm up? Tilt your palm toward you (not fingers at the camera)'); window.labEvent?.('hint:tilt'); }
  document.querySelectorAll('.gh').forEach(n=>n.classList.toggle('on',act.has(n.dataset.k)));
  $('gnow').textContent=hs.map((h,i)=>`${hs.length>1?(i?'R ':'L '):''}${({open:'open palm',poke:'☝️ poke',cup:'🤲 cup',fist:'fist',relaxed:'relaxed',none:'—'})[h.g]||h.g}`).join('   '); }
function setMode(m){ E.mode=m; FX.bloomK=m==='fire'?.25:.6; FX.glowK=m==='fire'?.5:1; document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const chem=m==='chem'; $('shelf').hidden=!chem; $('targets').hidden=!chem; $('cursor').hidden=!chem; $('ignite').hidden=!chem;
  EL.clearAll(); buildHud(); AT.show(m==='atoms'); GE.show(m==='gear'); window.labEvent?.('mode:'+m);
  requestAnimationFrame(()=>{ const r={}; document.querySelectorAll('.tg').forEach(t=>r[t.dataset.id]=t.getBoundingClientRect()); EL.chemProps(chem,r); });
  status(m==='atoms'?'Atoms: pinch an element tile, bring atoms together to bond. Open palm rotates.':chem?'Chem lab: pinch an element, drop it on the dish, burner or paper.':({water:'🤲 cup + tilt = pour · open palm + lift = strands',fire:'☝️ hold still = flame · flick-open = burst',earth:'scoop = rock · 🤲 cup = grab',air:'🪼 pulse = air ball · spiral to spin · push to throw'})[m]||'Tap ⋯ for moves, 🎓 to train'); }

/* ---------- virtual hand (touch / controller) -> same gesture pipeline ---------- */
function pose(x,y,g,s=90){ if(typeof g==='object') return MV.synth(x,y,{s,...g}); if(g==='cup') return MV.synth(x,y+s*.55,{s,n:[.45,.4,.4,.4,.4]}); const ext=[[0,-.45],[0,-.75],[0,-1]], cur=[[0,-.3],[0,-.05],[0,.15]];
  const mcp=[[-.35,-.95],[0,-1],[.3,-.95],[.55,-.85]]; const P=[[0,0],[-.35,-.3],[-.6,-.55],[-.75,-.8],[-.85,-1.05]];
  if(g==='pinch'||g==='point') g='poke'; const fingers=g==='fist'?[0,0,0,0]:g==='poke'?[1,0,0,0]:g==='vee'?[1,1,0,0]:g==='relaxed'?[0,0,1,1]:[1,1,1,1];
  mcp.forEach((m,f)=>{ P.push(m); const seg=fingers[f]?ext:cur; seg.forEach(d=>P.push([m[0]+d[0]*(f===3?.8:1),m[1]+d[1]*(f===3?.8:1)])); });
  if(g==='pinch'){ P[6]=[-.45,-1.35];P[7]=[-.55,-1.55];P[8]=[-.6,-1.68]; P[3]=[-.75,-1.1];P[4]=[-.62,-1.62]; }
  if(g==='fist'){ P[3]=[-.4,-.55];P[4]=[.05,-.45]; }
  let ox=.03,oy=-.75; if(g==='poke'){ox=-.35;oy=-1.95;} if(g==='vee'){ox=-.17;oy=-1.97;}
  return P.map(([px,py])=>({x:x+(px-ox)*s,y:y+(py-oy)*s})); }
const VH={on:false,x:0,y:0,g:'relaxed',off:0};
const virtG=(n)=>({gear:['poke','cup'],atoms:['poke','cup'],water:['cup','open'],fire:['open','cup'],earth:['cup','fist'],air:['poke','open'],chem:['poke','open']})[E.mode][n>1?1:0];
/* Poke-to-press: point one finger at a button, then push the fingertip toward the camera (or hold still 1 s) = tap. */
const PT={el:null,t:0};
function pokeTap(hs,dt){ const h=hs.find(h=>h.g==='poke'&&!h.virtual); if(!h||!h.pts){ if(PT.el) PT.el.classList.remove('poking'); PT.el=null; return; }
  const t=h.pts[8]; const el=document.elementFromPoint(t.x,t.y)?.closest('button,label,.cls'); if(!el||el.closest('#ptable')){ if(PT.el) PT.el.classList.remove('poking'); PT.el=null; return; }
  if(el!==PT.el){ PT.el?.classList.remove('poking'); PT.el=el; PT.t=0; el.classList.add('poking'); }
  PT.t+=dt; el.style.setProperty('--pk',Math.min(1,PT.t)); if(h.tap||PT.t>1){ el.click(); PT.t=-1.2; E.say('Pressed'); } }
const _detect=detect;
detect=function(now){ const d=synth?synth:undefined; if(d) return d;
  if(VH.on||VH.off>0){ if(!VH.on) VH.off--; return [pose(VH.x,VH.y,VH.on?VH.g:'relaxed')]; }
  return _detect(now); };

/* ---------- gamepad ---------- */
const padPrev={};
function pollPad(dt){
  const pads=navigator.getGamepads?navigator.getGamepads():[]; for(const g of pads){ if(!g) continue;
    const ax=g.axes[0]||0, ay=g.axes[1]||0, dz=.15, b=i=>!!g.buttons[i]?.pressed;
    if(Math.abs(ax)>dz||Math.abs(ay)>dz){ S.src='pad'; const sp=E.mode==='chem'?700:1100;
      S.cursor.x=Math.max(0,Math.min(innerWidth,S.cursor.x+ax*sp*dt)); S.cursor.y=Math.max(0,Math.min(innerHeight,S.cursor.y+ay*sp*dt)); }
    const A=b(0),B=b(1),X=b(2),Y=b(3);
    if(E.mode==='chem'){
      if(A&&!padPrev.A){ S.src='pad'; if(!$('card').hidden) $('cardClose').click(); else if(S.held) release(); else grab(); }
      if(B&&!padPrev.B) ignite(); }
    else { const gg=A?(E.mode==='fire'?'open':E.mode==='earth'?'cup':'poke'):B?'open':X?'fist':null;
      if(gg){ if(!VH.on&&E.mode==='earth'&&gg==='cup') maybeRock(S.cursor.x,S.cursor.y); VH.on=true; VH.g=gg; }
      else if(VH.on){ VH.on=false; VH.off=5; }
      VH.x=S.cursor.x; VH.y=S.cursor.y; }
    if(Y&&!padPrev.Y) setMode(MODES_LIST[(MODES_LIST.indexOf(E.mode)+1)%MODES_LIST.length]);
    Object.assign(padPrev,{A,B,X,Y}); break; }
}
addEventListener('gamepadconnected',e=>status(`Controller connected: stick moves, A = main move, B = open palm, X = fist, Y = next element.`));

/* ---------- touch ---------- */
const hud=$('hud'), touches=new Map();
function maybeRock(x,y){ if(!FXE.ROCKS.some(k=>Math.hypot(k.x-x,k.y-y)<k.r*2.2)){ const k=FXE.rockSpawn(x,y); if(k){k.y=y+40;k.mode='rise';} } }
addEventListener('pointerdown',e=>{ if(hud.hidden||e.target.closest('#bar,#card,#camerr,#modes,#calbox,#gate,#aClear,#aChal,#chal,#more,#train,#ptable')) return; S.src='touch';
  if(E.mode==='chem'){ S.cursor.x=e.clientX;S.cursor.y=e.clientY; grab(); return; }
  touches.set(e.pointerId,{x:e.clientX,y:e.clientY}); const n=touches.size;
  if(n===1&&E.mode==='earth') maybeRock(e.clientX,e.clientY);
  VH.on=true; VH.g=virtG(n); VH.x=e.clientX; VH.y=e.clientY; });
addEventListener('pointermove',e=>{ if(E.mode!=='chem'){ if(touches.has(e.pointerId)){ touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const ps=[...touches.values()]; VH.x=ps.reduce((a,p)=>a+p.x,0)/ps.length; VH.y=ps.reduce((a,p)=>a+p.y,0)/ps.length; } return; }
  if(S.src!=='touch'&&!S.held) return; if(e.target.closest('#bar,#card')) return; S.cursor.x=e.clientX;S.cursor.y=e.clientY; });
const up=e=>{ if(E.mode!=='chem'){ touches.delete(e.pointerId); if(!touches.size&&VH.on){ VH.on=false; VH.off=5; } else if(touches.size) VH.g=virtG(touches.size); return; }
  if(S.src==='touch'&&S.held){S.cursor.x=e.clientX;S.cursor.y=e.clientY;release();} };
addEventListener('pointerup',up); addEventListener('pointercancel',up);

/* ---------- loop with adaptive quality ---------- */
let last=performance.now(), fpsAcc=0, fpsN=0, qAcc=0, qN=0;
/* v7: in stationary (phone-on-stand) mode, effects carried by the hands (keeper flame, ribbons) must not be clipped away:
   that clipping is what made the fire nearly invisible on a propped-up phone */
function handZones(hs){ return hs.map(h=>{ const k=h.scale||90; return {x:h.palm.x-k*1.6,y:h.palm.y-k*2.6,w:k*3.2,h:k*3.4,up:k*1.5}; }); }
function loop(now){
  const dt=Math.min(.05,(now-last)/1000); last=now; frameN++;
  if(!S.rvfc||synth||VH.on||VH.off>0) try{ trackHands(now,dt); }catch(e){ console.warn(e); }
  pollPad(dt);
  const hs=(S.handsNow||[]).filter(h=>h.palm);
  pokeTap(hs,dt); for(const h of hs) if(h.changed&&h.g!=='relaxed'&&h.g!=='none') window.labEvent?.(`g:${h.g}:${E.mode}`);
  try{ if(E.mode==='atoms') AT.update(hs,dt); EL.update(E.mode==='chem'||E.mode==='atoms'||E.mode==='gear'?[]:hs,dt); GE.update(E.mode==='gear'?hs:[],dt); const elm=['water','fire','earth','air'].includes(E.mode), still=STL.update(dt,now); BU.B.still=still&&elm; BU.B.tip=hs[0]?.pinchPt||null; BU.B.palms=hs.filter(h=>h.palm).map((h,i)=>({id:i,x:h.palm.x,y:h.palm.y,s:h.scale,g:h.g})); IT.update(hs,dt); BU.B.debug=document.body.classList.contains('more'); FX.clip=BU.B.still?BU.zones(hs[0]?.pinchPt).concat(IT.zones(),handZones(hs)):null; stillHud(still);
    BU.update(dt,now,E.mode==='fire'||E.mode==='gear'||BU.B.still); EL.chemStep(dt); V7.tick(hs); FXE.step(dt); TR.update(dt,hs.length>0); }catch(e){ console.warn(e); }
  if(E.mode==='chem'){ cur.style.left=S.cursor.x+'px'; cur.style.top=S.cursor.y+'px';
    document.querySelectorAll('.tg').forEach(t=>t.classList.toggle('hot',!!S.held&&hit('.tg',S.cursor.x,S.cursor.y)===t)); }
  fpsAcc+=dt;fpsN++; qAcc+=dt;qN++;
  if(fpsAcc>.5){$('fps').textContent=`${Math.round(fpsN/fpsAcc)} fps · trk ${S.lat.trk|0} · inf ${S.lat.inf.toFixed(0)}ms · e2e ${S.lat.e2e.toFixed(0)}ms · q${FX.Q.toFixed(2)}`;fpsAcc=0;fpsN=0;}
  if(qAcc>1.2){ const fps=qN/qAcc, q0=FX.Q; if(!S.fixedQ){ if(fps<32) FX.Q=Math.max(.3,FX.Q*.8); else if(fps>52) FX.Q=Math.min(S.low?.5:1,FX.Q*1.08); }
    if(Math.abs(FX.Q-q0)>.1) resize(); qAcc=0;qN=0; }
  if(BO.BD.on){ BO.draw(skel.getContext('2d')); }
  if(S.lat.pend){ S.lat.e2e=S.lat.e2e*.8+(performance.now()-S.lat.pend)*.2; S.lat.pend=0; }
  requestAnimationFrame(loop);
}
/* Gesture loop decoupled from rendering: inference + gesture reading run once per *camera frame*
   (requestVideoFrameCallback), so heavy particle frames can't delay or double-count gestures. */
let lastTrk=performance.now();
function trackLoop(now,meta){ const t=performance.now(), dt=Math.min(.1,(t-lastTrk)/1000); lastTrk=t;
  if(!(synth||VH.on||VH.off>0)){ try{ trackHands(t,dt); BO.track(video,t,toScreen); }catch(e){ console.warn(e); } }
  S.lat.trkN++; if(t-S.lat.trkT>1000){ S.lat.trk=S.lat.trkN*1000/(t-S.lat.trkT); S.lat.trkN=0; S.lat.trkT=t; }
  // e2e: frame presented by the camera → next rendered frame that used it
  S.lat.pend=meta?.presentationTime?Math.min(t,meta.presentationTime):t;
  video.requestVideoFrameCallback(trackLoop); }
function startTrackLoop(){ if(S.rvfc||!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return; S.rvfc=true; video.requestVideoFrameCallback(trackLoop); }

/* ---------- wiring ---------- */
const MODES_LIST=['water','fire','earth','air','atoms','gear','chem'];
let started=false;
window.startLab=()=>{ if(started) return; started=true; hud.hidden=false; refreshLocks();
  initThree(); AT.init(FX.scene,E.say); GE.init(FX.scene,E.say); E.onBurn=()=>window.labEvent?.('burn'); BU.init(video,toScreen,E.say,VISION); IT.init(E.say); STL.init(video); TR.init({pose,say:E.say,setMode}); E.onEv=n=>{ TR.onEv(n); window.labEvent?.(n); }; { const pe=window.labEvent; window.labEvent=n=>{ try{pe?.(n);}catch{} try{V7.onEv(n);}catch(e){console.warn(e);} }; V7.init({E,FX,L:FXE.L,setMode}); window.__v7=V7; } setMode('water'); requestAnimationFrame(loop); startCamera(); initHands();
  status('Pick a mode. Hands: ☝️ point = poke/press, 🤲 cup = hold, flowing moves (ripple, pulse, scoop…) in ⋯.  No camera? Drag with one or two fingers.'); };
$('modes').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b&&b.dataset.m){ setMode(b.dataset.m); TR.T.on&&TR.T.el!==b.dataset.m&&TR.stop(); } });
$('boost').onclick=()=>{ S.boost={auto:'on',on:'off',off:'auto'}[S.boost]; updBoostBtn(); };
$('calib').onclick=startCalib; $('calSkip').onclick=()=>{S.calib=null;$('calbox').hidden=true;};
function flipCam(to){ S.facing=to||(S.facing==='user'?'environment':'user'); $('flipChip').hidden=true; startCamera(); E.say(S.facing==='user'?'Selfie view (mirrored): play facing the screen, items on the desk in front of you':'Room view'); $('flipPill').classList.toggle('on',S.facing==='user'); }
$('flip').onclick=$('flipPill').onclick=()=>flipCam();
$('flipYes').onclick=()=>flipCam('user'); $('flipNo').onclick=()=>{ $('flipChip').hidden=true; S.flipAsked=2; };
$('ignite').onclick=ignite; $('reset').onclick=()=>{ resetLab(); EL.clearAll(); };
$('lowpow').onchange=e=>{ S.low=e.target.checked; if(S.low) FX.Q=Math.min(FX.Q,.5); resize(); status(S.low?'Low power: no bloom, fewer particles, hands every other frame.':'Full power.'); };
window.__lab={AT:AT._test,S,E,FX,L:FXE.L,ROCKS:FXE.ROCKS,WATER:FXE.WATER,react,ignite,grab,release,drawSkel,startCalib,setMode,pose,feed:h=>{synth=h;},burst:EL.burst,blast:EL.launchBlast};

/* camera indicator, classes, body layer, wipe */
$('camOn').onclick=()=>{ if(S.stream) window.__stopCamera(); else startCamera(); };
$('clBtn').onclick=()=>{ const b=$('classes'); b.hidden=!b.hidden; window.PROFILE?.render(); };
$('bodyBtn').onclick=async()=>{ $('bodyBtn').textContent='Body: …'; const on=await BO.enable(VISION); $('bodyBtn').textContent='Body: '+(on?'on':BO.BD.status==='failed'?'failed':'off'); };
const SL={auto:'Stationary: auto',on:'Stationary: on',off:'Stationary: off'};
function stillHud(s){ const b=$('stillBtn'); if(!b) return; const t=SL[STL.ST.mode]+(STL.ST.mode==='auto'?(s?' (still)':' (moving)'):''); if(b.textContent!==t) b.textContent=t; b.classList.toggle('on',s); }
$('stillBtn').onclick=()=>{ STL.askMotion(); STL.setMode({auto:'on',on:'off',off:'auto'}[STL.ST.mode]); E.say(STL.ST.mode==='off'?'Free mode: elements anywhere':'Prop the phone up: only items in frame get elements'); };
function lightWarn(m){ const w=$('lightwarn'), now=performance.now();
  if(!m){ w.hidden=true; return; } if(w.hidden&&now-(S.lwT||-1e9)>60000){ S.lwT=now; w.textContent=m; w.hidden=false; w.style.opacity=1; clearTimeout(S.lwTo); S.lwTo=setTimeout(()=>{ w.style.opacity=0; setTimeout(()=>w.hidden=true,500); },4000); } }
$('more').onclick=()=>{ document.body.classList.toggle('more'); $('more').textContent=document.body.classList.contains('more')?'✕':'⋯'; };
$('trainBtn').onclick=$('trainBtn2').onclick=()=>{ document.body.classList.remove('more'); $('more').textContent='⋯'; TR.menu(); };
$('wipeBtn').onclick=()=>window.wipeNow?.();
window.__lab2={IT,flipCam,TR,POOL:FXE.POOL,AIRB:FXE.AIRB,STL,GE,BU,BO,S};
