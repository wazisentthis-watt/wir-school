import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
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
  {id:'water', icon:'💧', name:'Water'},
  {id:'flame', icon:'🔥', name:'Flame'},
  {id:'paper', icon:'📄', name:'Paper'},
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
  d.innerHTML=`${t.icon}<span>${t.name}</span><div class="load"></div>`;tgs.appendChild(d);});
const status = m => $('status').textContent = m;

function hit(sel,x,y){for(const n of document.querySelectorAll(sel)){const r=n.getBoundingClientRect();
  const pad=14; if(x>r.left-pad&&x<r.right+pad&&y>r.top-pad&&y<r.bottom+pad) return n;} return null;}

function grab(){ if(S.held||S.busy) return; const n=hit('.el',S.cursor.x,S.cursor.y);
  if(n&&n.classList.contains('locked')){ status(`🔒 ${n.dataset.id} unlocks after ${UNLOCK[n.dataset.id]} different reactions (you have ${doneN()}).`); return; }
  if(n){S.held=n.dataset.id; cur.classList.add('grab'); cur.textContent=S.held; status(`Holding ${S.held}. Drop it on water, flame or paper.`);} }
function release(){ if(!S.held) return; const t=hit('.tg',S.cursor.x,S.cursor.y);
  if(t){ const id=t.dataset.id; S.loads[id]=S.held; t.querySelector('.load').textContent=S.held;
    if(id==='water' && (S.held==='Na'||S.held==='K'||S.held==='Mg')) react(S.held,'water',false);
    else if(id==='water') react(S.held,'water',false);
    else status(`${S.held} is on the ${id}. Hold an open palm 1 s (or 🔥 / B) to ignite.`);
  } else status('Dropped in mid-air. Gravity is virtual too. Try again.');
  S.held=null; cur.classList.remove('grab'); cur.textContent=''; }
function ignite(){ if(S.busy) return;
  // flame/paper loads first; else water loaded with Mg -> the "never" lesson
  for(const t of ['flame','paper']) if(S.loads[t]) return react(S.loads[t],t,true);
  if(S.loads.water) return react(S.loads.water,'water',true);
  status('Nothing loaded. Pinch an element and drop it on a target first.');
  burst('spark', tgPos('flame'), [1,.6,.2], 40); }
function resetLab(){ S.loads={}; document.querySelectorAll('.tg .load').forEach(n=>n.textContent='');
  status('Lab reset. Inspector Spud has filed nothing. For once.'); }

/* ---------- reactions ---------- */
function tgPos(id){const r=document.querySelector(`.tg[data-id="${id}"]`).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function react(el,target,fire){
  let key = target==='water' ? el+'+water'+(fire?'+fire':'') : el+'+fire';
  const r = R[key]; if(!r) return;
  S.busy=true; markDone(key); const p=tgPos(target);
  if(target==='paper'&&fire) runFx('paper',p,{});
  runFx(r.fx,p,r);
  status(fire?`🔥 ${el} ignited on ${target}…`:`${el} meets water…`);
  setTimeout(()=>showCard(r), r.fx==='nothing'?900:3200);
}
function showCard(r){
  $('cardBody').innerHTML=`<h2>${r.title}</h2><div class="eq">${r.eq}</div>
  <h3>⚗️ Why it happens</h3><p>${r.why}</p><h3>🚑 How people get hurt</h3><p>${r.hurt}</p>
  <h3>🧘 Stay safe & calm</h3><p>${r.safe}</p><p class="oscar">🥕 Oscar: ${r.oscar}</p>
  <h3>🌍 Humanity & Earth</h3><p>${r.earth}<br><b>${HUMAN}</b></p>`;
  $('card').hidden=false; }
$('cardClose').onclick=()=>{$('card').hidden=true;S.busy=false;resetLab();};

/* ---------- three.js particles ---------- */
const canvas=$('fx'); let renderer, scene, cam3, geo, MAX=4000;
const P={pos:null,col:null,size:null,vel:null,life:null,maxl:null,n:0,drag:null,grav:null};
const emitters=[];
function initThree(){
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false});
  scene=new THREE.Scene(); cam3=new THREE.OrthographicCamera(0,1,0,1,-10,10);
  geo=new THREE.BufferGeometry();
  P.pos=new Float32Array(MAX*3);P.col=new Float32Array(MAX*3);P.size=new Float32Array(MAX);
  P.vel=new Float32Array(MAX*2);P.life=new Float32Array(MAX);P.maxl=new Float32Array(MAX);P.drag=new Float32Array(MAX);P.grav=new Float32Array(MAX);
  geo.setAttribute('position',new THREE.BufferAttribute(P.pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(P.col,3));
  geo.setAttribute('size',new THREE.BufferAttribute(P.size,1));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{dpr:{value:1},tex:{value:new THREE.TextureLoader().load('assets/kenney_light_01.png')}},
    vertexShader:`attribute float size;varying vec3 vC;uniform float dpr;void main(){vC=color;gl_PointSize=size*dpr;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vC;uniform sampler2D tex;void main(){vec4 t=texture2D(tex,gl_PointCoord);float d=length(gl_PointCoord-.5);float a=max(t.a*max(t.r,.6),smoothstep(.5,0.,d)*.35);gl_FragColor=vec4(vC*a,a);}`,
    vertexColors:true});
  P.mat=mat; scene.add(new THREE.Points(geo,mat)); resize();
}
function resize(){ if(!renderer) return; const dpr=S.low?1:Math.min(devicePixelRatio,2);
  renderer.setPixelRatio(dpr); renderer.setSize(innerWidth,innerHeight,false);
  cam3.right=innerWidth; cam3.bottom=innerHeight; cam3.updateProjectionMatrix(); P.mat.uniforms.dpr.value=dpr; }
addEventListener('resize',resize);
function spawn(x,y,vx,vy,c,size,life,drag=0.98,grav=0){
  const cap=S.low?1200:MAX; if(P.n>=cap) return; const i=P.n++;
  P.pos[i*3]=x;P.pos[i*3+1]=y;P.pos[i*3+2]=0;P.vel[i*2]=vx;P.vel[i*2+1]=vy;
  P.col[i*3]=c[0];P.col[i*3+1]=c[1];P.col[i*3+2]=c[2];P.size[i]=size;P.life[i]=life;P.maxl[i]=life;P.drag[i]=drag;P.grav[i]=grav;}
function kill(i){const j=--P.n; if(i===j) return;
  for(const [a,k] of [[P.pos,3],[P.col,3],[P.vel,2]]) for(let q=0;q<k;q++) a[i*k+q]=a[j*k+q];
  for(const a of [P.size,P.life,P.maxl,P.drag,P.grav]) a[i]=a[j];}
const rnd=(a,b)=>a+Math.random()*(b-a);
function burst(type,p,c,n){for(let i=0;i<n;i++){const a=rnd(0,6.28),s=rnd(1,6);spawn(p.x,p.y,Math.cos(a)*s,Math.sin(a)*s,c,rnd(4,10),rnd(.4,1),.95,.08);}}
function flash(o,ms){const f=$('flash');f.style.opacity=o;setTimeout(()=>f.style.opacity=0,ms);}
function runFx(type,p,r){ emitters.push({type,p:{...p},o:{...p},t:0,dur:type==='nothing'?1:3.2,color:r.color}); }
function stepEmitter(e,dt){
  e.t+=dt; const k=S.low?.4:1, p=e.p;
  switch(e.type){
   case 'mgburn': { // brilliant white core, white MgO smoke rising
     if(Math.random()<.5) flash(rnd(.35,.7),60);
     for(let i=0;i<40*k;i++) spawn(p.x+rnd(-6,6),p.y+rnd(-6,6),rnd(-1.5,1.5),rnd(-3,0),[1,1,1],rnd(10,26),rnd(.15,.4),.9);
     for(let i=0;i<6*k;i++) spawn(p.x,p.y-10,rnd(-.6,.6),rnd(-1.6,-.6),[.35,.35,.4],rnd(18,34),rnd(1,2),.99);
     for(let i=0;i<4*k;i++){const a=rnd(0,6.28);spawn(p.x,p.y,Math.cos(a)*6,Math.sin(a)*6,[.8,.85,1],4,.5,.96,.15);} break; }
   case 'mgflare': {
     flash(rnd(.5,.9),80);
     for(let i=0;i<70*k;i++){const a=rnd(0,6.28),s=rnd(1,9);spawn(p.x,p.y,Math.cos(a)*s,Math.sin(a)*s-2,[1,1,rnd(.85,1)],rnd(8,28),rnd(.3,.9),.94,.1);} break; }
   case 'fizzslow': if(Math.random()<.15) spawn(p.x+rnd(-20,20),p.y+10,0,-.6,[.6,.8,1],6,1.5,1); break;
   case 'nawater': case 'kwater': { // ball zips around the water, fizzing, coloured H2 flame
     const K=e.type==='kwater', sp=K?9:5;
     p.x=e.o.x+Math.sin(e.t*sp*1.3)*70+Math.sin(e.t*sp*3.1)*20; p.y=e.o.y+Math.cos(e.t*sp)*22;
     const c=K?[.75,.55,1]:[1,.62,.12];
     spawn(p.x,p.y,0,0,[1,1,.9],16,.08,1);
     for(let i=0;i<(K?18:10)*k;i++) spawn(p.x+rnd(-8,8),p.y,rnd(-1,1),rnd(-3.5,-1),c,rnd(8,18),rnd(.2,.5),.95);
     for(let i=0;i<4*k;i++) spawn(p.x+rnd(-14,14),p.y+rnd(0,8),rnd(-.5,.5),rnd(-1.5,-.4),[.7,.85,1],rnd(3,6),.6,.98); // H2 fizz
     if(K&&Math.random()<.08){burst('pop',p,c,40*k);flash(.25,50);} break; }
   case 'flametest': { const c=e.color;
     for(let i=0;i<22*k;i++) spawn(p.x+rnd(-14,14),p.y,rnd(-.6,.6),rnd(-4,-1.5),c,rnd(10,22),rnd(.3,.7),.97); break; }
   case 'sparks': {
     for(let i=0;i<14*k;i++){const a=rnd(-2.8,-.3),s=rnd(4,11);spawn(p.x,p.y,Math.cos(a)*s,Math.sin(a)*s,[1,rnd(.45,.7),.15],rnd(3,6),rnd(.4,.9),.97,.25);}
     for(let i=0;i<6*k;i++) spawn(p.x+rnd(-10,10),p.y,0,rnd(-3,-1),[1,.5,.1],14,.4,.97); break; }
   case 'paper': for(let i=0;i<10*k;i++) spawn(p.x+rnd(-35,35),p.y+rnd(-20,20),0,rnd(-2,-.5),[1,.45,.1],rnd(8,16),rnd(.3,.6),.97); break;
   case 'nothing': break;
  }
  return e.t<e.dur;
}
function stepParticles(dt){
  for(let i=emitters.length-1;i>=0;i--) if(!stepEmitter(emitters[i],dt)) emitters.splice(i,1);
  const f=dt*60;
  for(let i=P.n-1;i>=0;i--){ P.life[i]-=dt; if(P.life[i]<=0){kill(i);continue;}
    P.vel[i*2]*=P.drag[i]; P.vel[i*2+1]=P.vel[i*2+1]*P.drag[i]+P.grav[i]*f;
    P.pos[i*3]+=P.vel[i*2]*f; P.pos[i*3+1]+=P.vel[i*2+1]*f; }
  geo.setDrawRange(0,P.n);
  for(const a of ['position','color','size']) geo.attributes[a].needsUpdate=true;
  renderer.render(scene,cam3);
}

/* ---------- camera ---------- */
const video=$('cam');
async function startCamera(){
  $('camerr').hidden=true;
  if(S.stream) S.stream.getTracks().forEach(t=>t.stop());
  if(!navigator.mediaDevices?.getUserMedia){ return camError('This browser has no camera access (needs HTTPS and Safari/Chrome). Touch and controller still work.'); }
  try{
    S.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:S.facing},width:{ideal:1280},height:{ideal:720}}});
    video.srcObject=S.stream; await video.play().catch(()=>{});
    video.classList.toggle('mirror',S.facing==='user');
    status(S.landmarker?'Pinch an element to grab it ✋':'Camera on. Loading hand tracking…');
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
    const opts=d=>({baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:d},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.4,minHandPresenceConfidence:.4,minTrackingConfidence:.4});
    try{ S.landmarker=await v.HandLandmarker.createFromOptions(fs,opts('GPU')); }
    catch{ S.landmarker=await v.HandLandmarker.createFromOptions(fs,opts('CPU')); }
    status(S.stream?'Hand tracking ready. Pinch an element to grab it ✋':'Hand tracking ready (no camera yet).');
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
function updBoostBtn(){ const b=$('boost'); if(b) b.textContent='🌙 Boost: '+(S.boost==='auto'?('Auto'+(S.boostOn?' (on)':'')):S.boost==='on'?'On':'Off'); }
/* skeleton overlay */
const skel=$('skel'), sk=skel.getContext('2d');
const BONES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawSkel(pts,pinch){ const dpr=Math.min(devicePixelRatio,2); if(skel.width!==innerWidth*dpr){skel.width=innerWidth*dpr;skel.height=innerHeight*dpr;}
  sk.setTransform(dpr,0,0,dpr,0,0); sk.clearRect(0,0,innerWidth,innerHeight); if(!pts) return;
  const col=pinch?'#5fff8a':'#7fffd4';
  for(const [w,c] of [[9,'#000a'],[4,col]]){ sk.lineWidth=w; sk.strokeStyle=c; sk.lineCap='round'; sk.beginPath();
    for(const [a,b] of BONES){sk.moveTo(pts[a].x,pts[a].y);sk.lineTo(pts[b].x,pts[b].y);} sk.stroke(); }
  for(const [i,p] of pts.entries()){ sk.fillStyle=(i===4||i===8)?'#ffb347':'#fff'; sk.strokeStyle='#000'; sk.lineWidth=2;
    sk.beginPath(); sk.arc(p.x,p.y,(i===4||i===8)?8:5,0,7); sk.fill(); sk.stroke(); } }
const hint=m=>{const h=$('hint'); h.hidden=!m; if(m) h.textContent=m;};
/* calibration: learn this person's open-hand and pinch distances */
function startCalib(){ S.calib={phase:0,open:[],pin:[],t:0}; $('calbox').hidden=false; $('calIcon').textContent='✋'; $('calMsg').textContent='Show your OPEN hand, fingers spread, about an arm\'s length away'; $('calFill').style.width='0'; }
function stepCalib(r,dt){ const c=S.calib; if(!c) return; (c.phase?c.pin:c.open).push(r); const need=25, arr=c.phase?c.pin:c.open;
  $('calFill').style.width=Math.min(100,arr.length/need*100)+'%';
  if(arr.length>=need){ if(!c.phase){ c.phase=1; $('calIcon').textContent='👌'; $('calMsg').textContent='Now PINCH: touch thumb and pointer finger together and hold'; $('calFill').style.width='0'; return; }
    const med=a=>[...a].sort((x,y)=>x-y)[a.length>>1]; const o=med(c.open), p=med(c.pin);
    if(o-p<.15){ $('calMsg').textContent='Hmm, open and pinch looked the same. Try again closer to the light.'; c.phase=0;c.open=[];c.pin=[]; return; }
    S.pinchOn=p+(o-p)*.3; S.pinchOff=p+(o-p)*.55; localStorage.setItem('wirlab.calib',JSON.stringify({on:S.pinchOn,off:S.pinchOff}));
    S.calib=null; $('calbox').hidden=true; status('✅ Calibrated to your hand. Pinch an element to grab it.'); } }
function trackHands(now,dt){
  if(!S.landmarker||!video.videoWidth||video.currentTime===lastVT) return;
  if(S.low && (frameN%2)) return;
  lastVT=video.currentTime;
  const res=S.landmarker.detectForVideo(frameForDetect(),now);
  const raw=res.landmarks?.[0];
  if(!raw){ S.lostT+=dt; if(S.lostT>.35){ S.handSeen=false; S.palmT=0; $('palm').style.opacity=0; drawSkel(null); F.forEach(f=>f.x=null);
      if(S.pinch&&S.lostT>.8){S.pinch=false;release();}
      if(S.src==='hand'||S.lostT>3) hint(S.luma<95?'🌙 It\'s dark: face a lamp or window. Boost is helping.':'✋ Show your hand: palm to camera, 30–60 cm away'); }
    return; }
  S.lostT=0; hint(null);
  const fdt=Math.max(dt,1/120), lm=raw.map((l,i)=>({x:F[i*2].f(l.x,fdt),y:F[i*2+1].f(l.y,fdt)}));
  if(!S.handSeen && !S.calib && !localStorage.getItem('wirlab.calib')) startCalib();
  S.handSeen=true; S.src='hand';
  const scale=dist(lm[0],lm[9])||.1, pinchR=dist(lm[4],lm[8])/scale;
  if(S.calib){ drawSkel(lm.map(toScreen),false); return stepCalib(pinchR,dt); }
  const mid={x:(lm[4].x+lm[8].x)/2,y:(lm[4].y+lm[8].y)/2};
  const sp=toScreen(mid); S.cursor.x+=(sp.x-S.cursor.x)*.6; S.cursor.y+=(sp.y-S.cursor.y)*.6;
  const pinch = S.pinch ? pinchR<S.pinchOff : pinchR<S.pinchOn; // hysteresis
  if(pinch&&!S.pinch) grab(); if(!pinch&&S.pinch) release(); S.pinch=pinch;
  drawSkel(lm.map(toScreen),pinch);
  const open=!pinch && [[8,6],[12,10],[16,14],[20,18]].every(([t,p])=>dist(lm[t],lm[0])>dist(lm[p],lm[0])*1.1) && dist(lm[4],lm[5])/scale>0.5;
  if(open&&!S.held&&!S.busy){ S.palmT+=dt; $('palm').style.opacity=1; $('palmFill').style.width=Math.min(100,S.palmT*100)+'%';
    if(S.palmT>=1){ S.palmT=0; $('palm').style.opacity=0; ignite(); } }
  else { S.palmT=0; $('palm').style.opacity=0; }
}

/* ---------- gamepad ---------- */
const padPrev={};
function pollPad(dt){
  const pads=navigator.getGamepads?navigator.getGamepads():[]; for(const g of pads){ if(!g) continue;
    const ax=g.axes[0]||0, ay=g.axes[1]||0, dz=.15;
    if(Math.abs(ax)>dz||Math.abs(ay)>dz){ S.src='pad'; S.cursor.x=Math.max(0,Math.min(innerWidth,S.cursor.x+ax*700*dt)); S.cursor.y=Math.max(0,Math.min(innerHeight,S.cursor.y+ay*700*dt)); }
    const A=g.buttons[0]?.pressed, B=g.buttons[1]?.pressed;
    if(A&&!padPrev.A){ S.src='pad'; if(!$('card').hidden) $('cardClose').click(); else if(S.held) release(); else grab(); }
    if(B&&!padPrev.B) ignite();
    padPrev.A=A; padPrev.B=B; break; }
}
addEventListener('gamepadconnected',e=>status(`🎮 ${e.gamepad.id.slice(0,30)} connected: stick moves, A grabs/drops, B ignites.`));

/* ---------- touch ---------- */
const hud=$('hud');
hud.addEventListener('pointerdown',e=>{ if(e.target.closest('#bar,#card,#camerr')) return; S.src='touch';
  S.cursor.x=e.clientX;S.cursor.y=e.clientY; grab(); });
hud.addEventListener('pointermove',e=>{ if(S.src!=='touch'&&!S.held) return; if(e.target.closest('#bar,#card')) return; S.cursor.x=e.clientX;S.cursor.y=e.clientY; });
hud.addEventListener('pointerup',e=>{ if(S.src==='touch'&&S.held){S.cursor.x=e.clientX;S.cursor.y=e.clientY;release();} });

/* ---------- loop ---------- */
let last=performance.now(), fpsAcc=0, fpsN=0;
function loop(now){
  const dt=Math.min(.05,(now-last)/1000); last=now; frameN++;
  try{ trackHands(now,dt); }catch(e){ console.warn(e); }
  pollPad(dt);
  cur.style.left=S.cursor.x+'px'; cur.style.top=S.cursor.y+'px';
  document.querySelectorAll('.tg').forEach(t=>t.classList.toggle('hot',!!S.held&&hit('.tg',S.cursor.x,S.cursor.y)===t));
  stepParticles(dt);
  fpsAcc+=dt;fpsN++; if(fpsAcc>.5){$('fps').textContent=Math.round(fpsN/fpsAcc)+' fps';fpsAcc=0;fpsN=0;}
  requestAnimationFrame(loop);
}

/* ---------- wiring ---------- */
let started=false;
window.startLab=()=>{ if(started) return; started=true; hud.hidden=false; refreshLocks();
  initThree(); requestAnimationFrame(loop); startCamera(); initHands();
  status('Tip: pinch 👌 to grab, open palm ✋ 1 s to ignite. No camera? Tap and drag.'); };
$('boost').onclick=()=>{ S.boost={auto:'on',on:'off',off:'auto'}[S.boost]; updBoostBtn(); };
$('calib').onclick=startCalib; $('calSkip').onclick=()=>{S.calib=null;$('calbox').hidden=true;};
$('flip').onclick=()=>{ S.facing=S.facing==='user'?'environment':'user'; startCamera(); };
$('ignite').onclick=ignite; $('reset').onclick=resetLab;
$('lowpow').onchange=e=>{ S.low=e.target.checked; resize(); status(S.low?'Low power: fewer particles, hands tracked every other frame.':'Full power. Oscar is sweating.'); };
window.__lab={S,react,ignite,grab,release,drawSkel,startCalib};
