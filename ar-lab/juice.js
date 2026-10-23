/* v7 juice: combo chains, synthesized sound (WebAudio, no files), shake on blast, fingertip trails, small rewards.
   comboStep / rewardFor are pure (Node-tested); the rest is thin DOM/audio glue. */
export const CW=1.6; // seconds allowed between chained moves
export function comboNew(){ return {n:0,last:-9,best:0,kinds:new Set(),lastK:''}; }
/* returns {n, tier, reward|null}; the same move repeated counts less than a varied chain */
export function comboStep(C,k,t){ if(t-C.last>CW){ C.n=0; C.kinds=new Set(); }
  const varied=k!==C.lastK; C.n+=varied?1:.5; C.last=t; C.lastK=k; C.kinds.add(k); C.best=Math.max(C.best,C.n);
  const n=Math.floor(C.n), tier=n>=10?3:n>=6?2:n>=3?1:0; return {n,tier,reward:rewardFor(C,n,varied)}; }
export function rewardFor(C,n,varied){ C.given=C.given||new Set();
  for(const [at,name] of [[3,'Spark chain'],[6,'Flowing hands'],[10,'Keeper of the flame']]) if(n>=at&&!C.given.has(at)&&varied){ C.given.add(at); return {at,name}; }
  if(C.kinds.size>=6&&!C.given.has('six')){ C.given.add('six'); return {at:'six',name:'Six different moves'}; } return null; }
export function comboTick(C,t){ return t-C.last>CW?0:Math.floor(C.n); }

/* ---- sound: tiny synth voices ---- */
const SND={muted:false,ctx:null,last:{}};
try{ SND.muted=localStorage.getItem('wirlab.mute')==='1'; }catch{}
export function setMuted(m){ SND.muted=m; try{ localStorage.setItem('wirlab.mute',m?'1':'0'); }catch{} }
export const isMuted=()=>SND.muted;
function ac(){ if(SND.muted) return null; if(!SND.ctx){ const A=globalThis.AudioContext||globalThis.webkitAudioContext; if(!A) return null; SND.ctx=new A(); SND.master=SND.ctx.createGain(); SND.master.gain.value=.35; SND.master.connect(SND.ctx.destination); } if(SND.ctx.state==='suspended') SND.ctx.resume(); return SND.ctx; }
function noise(c,dur){ const b=c.createBuffer(1,Math.ceil(c.sampleRate*dur),c.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const s=c.createBufferSource(); s.buffer=b; return s; }
function env(c,g,a,peak,dec){ const t=c.currentTime; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(.001,t+a+dec); }
const V={
 whoosh:(c,o)=>{ const n=noise(c,.6), f=c.createBiquadFilter(), g=c.createGain(); f.type='bandpass'; f.frequency.setValueAtTime(300,c.currentTime); f.frequency.exponentialRampToValueAtTime(1800,c.currentTime+.35); n.connect(f).connect(g).connect(o); env(c,g,.04,.5,.45); n.start(); },
 crackle:(c,o)=>{ for(let i=0;i<6;i++){ const n=noise(c,.04), f=c.createBiquadFilter(), g=c.createGain(); f.type='highpass'; f.frequency.value=2000+Math.random()*3000; n.connect(f).connect(g).connect(o); const t=c.currentTime+Math.random()*.25; g.gain.setValueAtTime(.3,t); g.gain.exponentialRampToValueAtTime(.001,t+.03); n.start(t); } },
 splash:(c,o)=>{ const n=noise(c,.5), f=c.createBiquadFilter(), g=c.createGain(); f.type='lowpass'; f.frequency.setValueAtTime(3000,c.currentTime); f.frequency.exponentialRampToValueAtTime(400,c.currentTime+.4); n.connect(f).connect(g).connect(o); env(c,g,.01,.5,.4); n.start(); },
 thud:(c,o)=>{ const s=c.createOscillator(), g=c.createGain(); s.frequency.setValueAtTime(120,c.currentTime); s.frequency.exponentialRampToValueAtTime(40,c.currentTime+.25); s.connect(g).connect(o); env(c,g,.005,.8,.3); s.start(); s.stop(c.currentTime+.4); },
 chime:(c,o,p=0)=>{ [0,4,7].forEach((st,i)=>{ const s=c.createOscillator(), g=c.createGain(); s.type='triangle'; s.frequency.value=660*Math.pow(2,(st+p)/12); s.connect(g).connect(o); const t=c.currentTime+i*.06; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.25,t+.01); g.gain.exponentialRampToValueAtTime(.001,t+.5); s.start(t); s.stop(t+.6); }); },
 hum:(c,o,p=0)=>{ const s=c.createOscillator(), g=c.createGain(); s.type='sine'; s.frequency.value=110+p*220; s.connect(g).connect(o); env(c,g,.05,.12,.25); s.start(); s.stop(c.currentTime+.35); },
 boom:(c,o)=>{ V.thud(c,o); V.whoosh(c,o); V.crackle(c,o); },
};
export function play(k,p,minGap=.08){ const c=ac(); if(!c||!V[k]) return false; const now=c.currentTime; if(now-(SND.last[k]||-9)<minGap) return false; SND.last[k]=now; try{ V[k](c,SND.master,p); }catch{} return true; }
/* which sound for which event (pure map) */
export function soundFor(ev,mode){ if(/^blast:release/.test(ev)) return 'boom'; if(ev==='blast:charge') return 'hum'; if(/^move:/.test(ev)) return mode==='fire'?'crackle':mode==='water'?'splash':mode==='earth'?'thud':'whoosh';
  if(/fireball|burst|item:lit/.test(ev)) return 'whoosh'; if(/earth:(rise|throw|tremor)/.test(ev)) return 'thud'; if(/water:/.test(ev)) return 'splash'; if(/air:/.test(ev)) return 'whoosh'; return null; }
