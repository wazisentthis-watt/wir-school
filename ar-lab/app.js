import * as FXE from './fx.js';
import {FX} from './fx.js';
import * as EL from './elements.js';
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
try{const c=JSON.parse(localStorage.getItem('wirlab.calib')||'null'); if(c){S.pinchOn=c.on;S.pinchOff=c.off;}}catch{}
/* progressive unlock: Cu,Fe open after the gate; Mg after 2 reactions; Na after 4; K after 6 */
const UNLOCK={Cu:0,Fe:0,Mg:2,Na:4,K:6};
const LS='wirlab.v1', gst=()=>JSON.parse(localStorage.getItem(LS)||'{}');
const doneN=()=>(gst().done||[]).length;
function markDone(k){const g=gst(); g.done=[...new Set([...(g.done||[]),k])]; localStorage.setItem(LS,JSON.stringify(g)); refreshLocks();}
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
    video.srcObject=S.stream; await video.play().catch(()=>{});
    video.classList.toggle('mirror',S.facing==='user'); video.onloadedmetadata=()=>FXE.setCamera(true,S.facing==='user'); FXE.setCamera(true,S.facing==='user');
    status(S.landmarker?'Pinch an element to grab it.':'Camera on. Loading hand tracking…');
  }catch(err){
    const denied = err && (err.name==='NotAllowedError'||err.name==='SecurityError');
    camError(denied
      ? '📷 Camera permission was denied. To fix on iPhone: tap "aA" in the Safari address bar → Website Settings → Camera → Allow, then reload. Or Settings → Apps → Safari → Camera → Allow. You can still play with touch or a controller.'
      : `📷 Camera unavailable (${err?.name||'error'}). Touch and controller still work.`);
  }
}
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
    status(S.stream?'Hand tracking ready. Pinch an element to grab it.':'Hand tracking ready (no camera yet).');
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
  const meter=frameN%15===0, apply=S.boost==='on'||(S.boost==='auto'&&S.boostOn);
  if(!meter&&!apply) return proc;
  const img=pctx.getImageData(0,0,W,H), d=img.data;
  if(meter){ let sum=0,n=0; for(let i=0;i<d.length;i+=64){sum+=d[i]*.3+d[i+1]*.59+d[i+2]*.11;n++;} S.luma=sum/n;
    S.boostOn=S.luma<95; updBoostBtn(); }
  if(apply){ if(Math.abs(lutFor-S.luma)>6) buildLUT(S.luma); for(let i=0;i<d.length;i+=4){d[i]=LUT[d[i]];d[i+1]=LUT[d[i+1]];d[i+2]=LUT[d[i+2]];} pctx.putImageData(img,0,0); }
  return proc;
}
function updBoostBtn(){ const b=$('boost'); if(b) b.textContent='Boost: '+(S.boost==='auto'?('Auto'+(S.boostOn?' (on)':'')):S.boost==='on'?'On':'Off'); }
/* skeleton overlay */
const skel=$('skel'), sk=skel.getContext('2d');
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawSkel(hs){ hs=(hs||[]).map(h=>Array.isArray(h)?{pts:h,g:''}:h); const dpr=Math.min(devicePixelRatio,2);
  if(skel.width!==innerWidth*dpr){skel.width=innerWidth*dpr;skel.height=innerHeight*dpr;}
  sk.setTransform(dpr,0,0,dpr,0,0); sk.clearRect(0,0,innerWidth,innerHeight);
  for(const h of hs){ const pts=h.pts; if(!pts) continue; const col=h.g==='pinch'?'#5fff8a':h.g==='fist'?'#ff9a5a':h.g==='open'?'#7fd8ff':'#c8f5ff';
    for(const [w,c] of [[6,'#0008'],[2.5,col]]){ sk.lineWidth=w; sk.strokeStyle=c; sk.lineCap='round'; sk.beginPath();
      for(const [a,b] of BONES){sk.moveTo(pts[a].x,pts[a].y);sk.lineTo(pts[b].x,pts[b].y);} sk.stroke(); }
    for(const [i,p] of pts.entries()){ const tip=i===4||i===8; sk.fillStyle=tip?'#ffd27f':'#fff'; sk.strokeStyle='#000a'; sk.lineWidth=1.5;
      sk.beginPath(); sk.arc(p.x,p.y,tip?6:3.5,0,7); sk.fill(); sk.stroke(); } } }
const hint=m=>{const h=$('hint'); h.hidden=!m; if(m) h.textContent=m;};
/* calibration: learn this person's open-hand and pinch distances */
function startCalib(){ S.calib={phase:0,open:[],pin:[],t:0}; $('calbox').hidden=false; $('calIcon').textContent='1'; $('calMsg').textContent='Show your OPEN hand, fingers spread, about an arm\'s length away'; $('calFill').style.width='0'; }
function stepCalib(r,dt){ const c=S.calib; if(!c) return; (c.phase?c.pin:c.open).push(r); const need=25, arr=c.phase?c.pin:c.open;
  $('calFill').style.width=Math.min(100,arr.length/need*100)+'%';
  if(arr.length>=need){ if(!c.phase){ c.phase=1; $('calIcon').textContent='2'; $('calMsg').textContent='Now PINCH: touch thumb and pointer finger together and hold'; $('calFill').style.width='0'; return; }
    const med=a=>[...a].sort((x,y)=>x-y)[a.length>>1]; const o=med(c.open), p=med(c.pin);
    if(o-p<.15){ $('calMsg').textContent='Hmm, open and pinch looked the same. Try again closer to the light.'; c.phase=0;c.open=[];c.pin=[]; return; }
    S.pinchOn=p+(o-p)*.3; S.pinchOff=p+(o-p)*.55; localStorage.setItem('wirlab.calib',JSON.stringify({on:S.pinchOn,off:S.pinchOff}));
    S.calib=null; $('calbox').hidden=true; status('Calibrated to your hand. Pinch an element to grab it.'); } }
const HANDS=[{},{}]; const FL=[0,1].map(()=>[...Array(42)].map(()=>new OneEuro()));
function smooth(slot,pts,dt){ const f=FL[slot]; return pts.map((p,i)=>({x:f[i*2].f(p.x,dt),y:f[i*2+1].f(p.y,dt)})); }
function cal(){ return {on:S.pinchOn,off:S.pinchOff}; }
let synth=null; // test hook: screen-pixel landmarks for headless tests
let detect=function(now){
  if(synth) return synth;
  if(!S.landmarker||!video.videoWidth||video.currentTime===lastVT) return undefined;
  if(S.low&&(frameN%2)) return undefined;
  lastVT=video.currentTime;
  const res=S.landmarker.detectForVideo(frameForDetect(),now);
  return (res.landmarks||[]).map(lm=>lm.map(toScreen)); };
function trackHands(now,dt){
  const got=detect(now); if(got===undefined) return;
  const fdt=Math.max(dt,1/120);
  if(!got.length){ S.lostT+=dt; if(S.lostT>.35){ S.handSeen=false; S.palmT=0; $('palm').style.opacity=0; drawSkel([]); FL.forEach(f=>f.forEach(o=>o.x=null)); HANDS.forEach(h=>{h.palm=null;h.g='none';});
      if(S.pinch&&S.lostT>.8){S.pinch=false;release();} if(S.src==='hand') S.handsNow=[];
      if(S.src==='hand'||S.lostT>3) hint(S.luma<95?'It\'s dark: face a lamp or window. Boost is helping.':'Show your hand: palm to camera, 30–60 cm away'); }
    return; }
  S.lostT=0; hint(null);
  // keep slots stable: match by nearest wrist
  if(got.length===2&&HANDS[0].palm&&HANDS[1].palm){ const d=(a,h)=>Math.hypot(a[0].x-h.pts[0].x,a[0].y-h.pts[0].y);
    if(d(got[0],HANDS[1])+d(got[1],HANDS[0])<d(got[0],HANDS[0])+d(got[1],HANDS[1])) got.reverse(); }
  const hs=got.slice(0,2).map((g,i)=>EL.readHand(HANDS[i],smooth(i,g,fdt),fdt,cal()));
  if(got.length<2){ HANDS[1].palm=null; FL[1].forEach(o=>o.x=null); }
  if(!S.handSeen && !S.calib && !localStorage.getItem('wirlab.calib') && !synth) startCalib();
  S.handSeen=true; S.src='hand'; S.handsNow=hs;
  const h=hs[0], lm=h.pts;
  drawSkel((VH.on||VH.off>0)&&!synth?[]:hs);
  if(S.calib){ return stepCalib(h.pinchR,dt); }
  if(E.mode!=='chem'){ gestureHud(hs); return; }
  const sp=h.pinchPt; S.cursor.x+=(sp.x-S.cursor.x)*.6; S.cursor.y+=(sp.y-S.cursor.y)*.6;
  const pinch=h.g==='pinch';
  if(pinch&&!S.pinch) grab(); if(!pinch&&S.pinch) release(); S.pinch=pinch;
  if(h.g==='open'&&!S.held&&!S.busy){ S.palmT+=dt; $('palm').style.opacity=1; $('palmFill').style.width=Math.min(100,S.palmT*100)+'%';
    if(S.palmT>=1){ S.palmT=0; $('palm').style.opacity=0; ignite(); } }
  else { S.palmT=0; $('palm').style.opacity=0; }
}
const GHINT={
 water:[['open','Open palm','summon water orb'],['pinch','Pinch + drag','stream / whip'],['swipe','Flick','throw it'],['circle','Circle','whirlpool'],['combo','Clap 2 hands','tidal burst']],
 fire:[['open','Open palm','fire jet (push = stronger)'],['fist','Fist','ember ball'],['swipe','Open fast / flick','throw fireball'],['circle','Circle','fire tornado'],['combo','Clap 2 hands','explosion']],
 earth:[['open','Palm lifts up','raise a rock'],['pinch','Pinch rock','grab it'],['swipe','Flick','throw it'],['fist','Fist on rock','crush to dust'],['combo','Clap 2 hands','rock wall']],
 air:[['point','Point + move','wind trail'],['swipe','Swipe','gust'],['circle','Circle','vortex (moves everything)'],['combo','Clap 2 hands','cyclone']],
 chem:[['pinch','Pinch','grab element'],['open','Open palm 1 s','ignite']],
};
function buildHud(){ $('gest').innerHTML=GHINT[E.mode].map(([k,a,b])=>`<div class="gh" data-k="${k}"><b>${a}</b><span>${b}</span></div>`).join(''); }
function gestureHud(hs){ const act=new Set(); for(const h of hs){ act.add(h.g); if(h.swipe) act.add('swipe'); if(h.circle) act.add('circle'); } if(hs.length>1) act.add('combo');
  document.querySelectorAll('.gh').forEach(n=>n.classList.toggle('on',act.has(n.dataset.k)));
  $('gnow').textContent=hs.map((h,i)=>`${hs.length>1?(i?'R ':'L '):''}${({open:'open palm',pinch:'pinch',fist:'fist',point:'point',relaxed:'relaxed',none:'—'})[h.g]||h.g}`).join('   '); }
function setMode(m){ E.mode=m; document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const chem=m==='chem'; $('shelf').hidden=!chem; $('targets').hidden=!chem; $('cursor').hidden=!chem; $('ignite').hidden=!chem;
  EL.clearAll(); buildHud();
  requestAnimationFrame(()=>{ const r={}; document.querySelectorAll('.tg').forEach(t=>r[t.dataset.id]=t.getBoundingClientRect()); EL.chemProps(chem,r); });
  status(chem?'Chem lab: pinch an element, drop it on the dish, burner or paper.':'Elements: '+m.toUpperCase()+'. Try the moves on the left.'); }

/* ---------- virtual hand (touch / controller) -> same gesture pipeline ---------- */
function pose(x,y,g,s=90){ const ext=[[0,-.45],[0,-.75],[0,-1]], cur=[[0,-.3],[0,-.05],[0,.15]];
  const mcp=[[-.35,-.95],[0,-1],[.3,-.95],[.55,-.85]]; const P=[[0,0],[-.35,-.3],[-.6,-.55],[-.75,-.8],[-.85,-1.05]];
  const fingers=g==='fist'?[0,0,0,0]:g==='point'?[1,0,0,0]:[1,1,1,1];
  mcp.forEach((m,f)=>{ P.push(m); const seg=fingers[f]?ext:cur; seg.forEach(d=>P.push([m[0]+d[0]*(f===3?.8:1),m[1]+d[1]*(f===3?.8:1)])); });
  if(g==='pinch'){ P[6]=[-.45,-1.35];P[7]=[-.55,-1.55];P[8]=[-.6,-1.68]; P[3]=[-.75,-1.1];P[4]=[-.62,-1.62]; }
  if(g==='fist'){ P[3]=[-.4,-.55];P[4]=[.05,-.45]; }
  let ox=.03,oy=-.75; if(g==='pinch'){ox=-.61;oy=-1.65;} if(g==='point'){ox=-.35;oy=-1.95;}
  return P.map(([px,py])=>({x:x+(px-ox)*s,y:y+(py-oy)*s})); }
const VH={on:false,x:0,y:0,g:'relaxed',off:0};
const virtG=(n)=>({water:['pinch','open'],fire:['open','fist'],earth:['pinch','fist'],air:['point','open']})[E.mode][n>1?1:0];
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
    else { const gg=A?(E.mode==='fire'?'open':E.mode==='air'?'point':'pinch'):B?'open':X?'fist':null;
      if(gg){ if(!VH.on&&E.mode==='earth'&&gg==='pinch') maybeRock(S.cursor.x,S.cursor.y); VH.on=true; VH.g=gg; }
      else if(VH.on){ VH.on=false; VH.off=5; }
      VH.x=S.cursor.x; VH.y=S.cursor.y; }
    if(Y&&!padPrev.Y) setMode(MODES_LIST[(MODES_LIST.indexOf(E.mode)+1)%MODES_LIST.length]);
    Object.assign(padPrev,{A,B,X,Y}); break; }
}
addEventListener('gamepadconnected',e=>status(`Controller connected: stick moves, A = main move, B = open palm, X = fist, Y = next element.`));

/* ---------- touch ---------- */
const hud=$('hud'), touches=new Map();
function maybeRock(x,y){ if(!FXE.ROCKS.some(k=>Math.hypot(k.x-x,k.y-y)<k.r*2.2)){ const k=FXE.rockSpawn(x,y); if(k){k.y=y+40;k.mode='rise';} } }
addEventListener('pointerdown',e=>{ if(hud.hidden||e.target.closest('#bar,#card,#camerr,#modes,#calbox,#gate')) return; S.src='touch';
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
function loop(now){
  const dt=Math.min(.05,(now-last)/1000); last=now; frameN++;
  try{ trackHands(now,dt); }catch(e){ console.warn(e); }
  pollPad(dt);
  const hs=(S.handsNow||[]).filter(h=>h.palm);
  try{ EL.update(E.mode==='chem'?[]:hs,dt); EL.chemStep(dt); FXE.step(dt); }catch(e){ console.warn(e); }
  if(E.mode==='chem'){ cur.style.left=S.cursor.x+'px'; cur.style.top=S.cursor.y+'px';
    document.querySelectorAll('.tg').forEach(t=>t.classList.toggle('hot',!!S.held&&hit('.tg',S.cursor.x,S.cursor.y)===t)); }
  fpsAcc+=dt;fpsN++; qAcc+=dt;qN++;
  if(fpsAcc>.5){$('fps').textContent=Math.round(fpsN/fpsAcc)+' fps · q'+FX.Q.toFixed(2)+' · '+FXE.counts();fpsAcc=0;fpsN=0;}
  if(qAcc>1.2){ const fps=qN/qAcc, q0=FX.Q; if(!S.fixedQ){ if(fps<32) FX.Q=Math.max(.3,FX.Q*.8); else if(fps>52) FX.Q=Math.min(S.low?.5:1,FX.Q*1.08); }
    if(Math.abs(FX.Q-q0)>.1) resize(); qAcc=0;qN=0; }
  requestAnimationFrame(loop);
}

/* ---------- wiring ---------- */
const MODES_LIST=['water','fire','earth','air','chem'];
let started=false;
window.startLab=()=>{ if(started) return; started=true; hud.hidden=false; refreshLocks();
  initThree(); setMode('water'); requestAnimationFrame(loop); startCamera(); initHands();
  status('Pick an element. Hands: open palm, pinch, fist, swipe, circle. No camera? Drag with one or two fingers.'); };
$('modes').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) setMode(b.dataset.m); });
$('boost').onclick=()=>{ S.boost={auto:'on',on:'off',off:'auto'}[S.boost]; updBoostBtn(); };
$('calib').onclick=startCalib; $('calSkip').onclick=()=>{S.calib=null;$('calbox').hidden=true;};
$('flip').onclick=()=>{ S.facing=S.facing==='user'?'environment':'user'; startCamera(); };
$('ignite').onclick=ignite; $('reset').onclick=()=>{ resetLab(); EL.clearAll(); };
$('lowpow').onchange=e=>{ S.low=e.target.checked; if(S.low) FX.Q=Math.min(FX.Q,.5); resize(); status(S.low?'Low power: no bloom, fewer particles, hands every other frame.':'Full power.'); };
window.__lab={S,E,FX,ROCKS:FXE.ROCKS,WATER:FXE.WATER,react,ignite,grab,release,drawSkel,startCalib,setMode,pose,feed:h=>{synth=h;},burst:EL.burst};
