// WIR: Connected — Season variants + "Lighthouse Yard: Brick" (Coach PROPOSAL 2026-10-23, NOT stamped canon)
// S1 = default, unchanged. S3 = heavier transitional body (lion presence only hinted). S4 = The Lion (coming): no model, no invented design.
import * as THREE from 'three';
const G=()=>window.__game;
// ---------- seasons ----------
const SEASONS=['S1','S3','S4'];let si=0;let base=null,line=null;
const S3={ // PLACEHOLDER proportions, PROPOSAL. Values are LOCAL bone scales (x,y,z), chosen so globals come out: hips 1.12, chest/upper back 1.16, upper arm 1.10, forearm 1.23, hand 1.05, head/face ~S1 with crown/mane ~6% fuller
 'DEF-hips':[1.12,1,1.12],'DEF-spine.001':[1.02/1.12,1,1.02/1.12],'DEF-spine.003':[1.16/1.02,1,1.14/1.02],
 'DEF-upper_arm.L':[1.1/1.16,1,1.1/1.14],'DEF-upper_arm.R':[1.1/1.16,1,1.1/1.14],'DEF-forearm.L':[1.12,1,1.12],'DEF-forearm.R':[1.12,1,1.12],
 'DEF-hand.L':[1.05/1.23,1,1.05/1.23],'DEF-hand.R':[1.05/1.23,1,1.05/1.23],'DEF-neck':[1/1.16,1,1/1.14],'DEF-head':[1.06,1.03,1.06]};
const BOARD_DROP=.035; // board settles lower under the heavier body (PROPOSAL)
const nk=n=>n.replace(/\./g,''); // three.js strips dots from node names
const S3N=Object.fromEntries(Object.entries(S3).map(([k,v])=>[nk(k),v]));let BM=null;
function bones(){if(BM)return BM;const g=G();const m={};g.P.model.traverse(b=>{if(b.isBone&&S3N[nk(b.name)])m[nk(b.name)]=b;});return BM=m;}
function ensureLine(){if(line)return;const g=G();const hb=(g.P.model.getObjectByName('DEF-forearmR')||g.P.model.getObjectByName('DEF-forearm.R'));if(!hb)return;
 // RIGHT hand = damaged hand (PLACEHOLDER pick). Faint silver line up the wrist.
 const geo=new THREE.CylinderGeometry(.006,.006,1,6);line=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xcfd3da,emissive:0xbfc6d0,emissiveIntensity:.5,metalness:1,roughness:.25,transparent:true,opacity:.75}));
 line.name='S3_DamagedHand_SilverLine_PLACEHOLDER';hb.add(line);line.visible=false;fitLine(hb);}
function fitLine(hb){const ws=new THREE.Vector3();hb.getWorldScale(ws);const len=.14/ws.y;line.scale.set(1/ws.x,len,1/ws.z);line.position.set(.035/ws.x,.85*(hb.userData.len||0.25)/ws.y,.0);}
function cycleSeason(){if(window.__setForm&&window.__realForms){const g=G();window.__setForm(((g.st.metalForm||1))%4);B&&(B.season='S'+(((g.st.metalForm||1))%4+1));return;}si=(si+1)%SEASONS.length;const s=SEASONS[si];
 if(s==='S4'){badge('S4: The Lion (coming) — no model yet; showing S3 body');}else badge(s==='S1'?'S1 · Street Metal (default)':'S3 · heavier, damaged right hand (PLACEHOLDER) · PROPOSAL');
 const g=G();g.st.season=s;ensureLine();if(line)line.visible=s!=='S1';
 const bs=g.board&&g.board.children[0];if(bs){if(base===null)base=bs.position.y;bs.position.y=base-(s==='S1'?0:BOARD_DROP/(g.board.scale.y||1));}}
function seasonPost(){if(window.__realForms)return;if(!G()||SEASONS[si]==='S1')return;const bm=bones();for(const [n,b] of Object.entries(bm)){const k=S3N[n];b.scale.set(b.scale.x*k[0],b.scale.y*k[1],b.scale.z*k[2]);}}
let badgeEl;function badge(t){if(!badgeEl){badgeEl=document.createElement('div');badgeEl.style.cssText='position:absolute;right:10px;top:10px;font:600 12px system-ui;color:#e8e8f0;background:rgba(10,8,20,.7);padding:4px 10px;border-radius:10px;z-index:30';document.body.appendChild(badgeEl);}badgeEl.textContent='SEASON '+t+' · [T] cycle';}
// ---------- brick minigame ----------
const STAGES=[
 {k:'Chip',goal:'Place a small amount of force where you intend. Tap/hold briefly on the target corner.'},
 {k:'Crack',goal:'Sustain the placement along the chosen line. Hold and trace the dotted line.'},
 {k:'Crumble',goal:'Distribute the release across the material. Spread presses over all 4 marks, none too hard.'},
 {k:'Stop',goal:'End the response when YOU choose. Press, then release before the cup beside it shakes.'}];
let B=null,actx;
function snd(type){try{actx=actx||new AudioContext();const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
 if(type==='tck'){const n=actx.createBufferSource(),buf=actx.createBuffer(1,actx.sampleRate*.03,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,6);n.buffer=buf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=2500;n.connect(f).connect(g);g.gain.value=.5;g.connect(actx.destination);n.start();return;}
 if(type==='shatter'){const n=actx.createBufferSource(),buf=actx.createBuffer(1,actx.sampleRate*.5,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);n.buffer=buf;n.connect(g);g.gain.value=.5;g.connect(actx.destination);n.start();return;}
 o.connect(g).connect(actx.destination);o.type='sine';o.frequency.value=type==='fail'?140:660;g.gain.value=.04;g.gain.exponentialRampToValueAtTime(.0001,t+.15);o.start();o.stop(t+.16);}catch(e){}}
function ambience(on){try{actx=actx||new AudioContext();if(on&&!B.amb){const hum=actx.createOscillator(),hg=actx.createGain();hum.frequency.value=55;hum.type='sawtooth';const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=160;hg.gain.value=.025;hum.connect(lp).connect(hg).connect(actx.destination);hum.start();
  const n=actx.createBufferSource(),buf=actx.createBuffer(1,actx.sampleRate*2,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(.5+.5*Math.sin(i/actx.sampleRate*Math.PI*3));n.buffer=buf;n.loop=true;const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=380;bp.Q.value=.8;const wg=actx.createGain();wg.gain.value=.05;n.connect(bp).connect(wg).connect(actx.destination);n.start();B.amb=[hum,n];}
 if(!on&&B&&B.amb){B.amb.forEach(x=>x.stop());B.amb=null;}}catch(e){}}
const CORNERS=[[.2,.25],[.8,.25],[.2,.75],[.8,.75]];
function openBrick(){const c=document.createElement('canvas');c.id='brickc';c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:50;touch-action:none';document.body.appendChild(c);
 B={c,g:c.getContext('2d'),stage:0,corner:0,force:0,holding:false,lat:0,cmdT:-1,drift:[0,0],chips:[],cracks:[],msg:'',msgT:0,shattered:false,cupShake:0,crumbleHits:[0,0,0,0],crack:0,stopArmed:false,t:0,season:(G().st.season||'S1')};
 B.btns=[];ambience(true);c.addEventListener('pointerdown',pd);c.addEventListener('pointerup',pu);requestAnimationFrame(drawBrick);}
function closeBrick(pocket){if(!B)return;ambience(false);B.c.remove();const m=pocket?'Pocketed the brick. No penalty — try again anytime.':'Put the brick away.';B=null;const t=document.getElementById('toast');if(t){t.innerHTML=m;t.style.opacity=1;}}
function hand(){return B.season==='S3'||B.season==='S4';} // S3/S4 hand: latency + drift (PROPOSAL)
function press(){if(B.shattered){B.shattered=false;B.chips=[];B.crack=0;B.crumbleHits=[0,0,0,0];return;}B.holding=true;B.force=0;
 B.lat=hand()?(.08+Math.random()*.45):0;B.drift=hand()&&Math.random()<.35?[(Math.random()-.5)*.35,(Math.random()-.5)*.35]:[0,0];B.cmdT=B.t;if(B.stage===3)B.stopArmed=true;}
function release(){if(!B||!B.holding)return;B.holding=false;const f=B.force,live=B.t-B.cmdT>B.lat;const [cx,cy]=CORNERS[B.corner];const px=cx+B.drift[0],py=cy+B.drift[1];
 const off=Math.hypot(B.drift[0],B.drift[1])>.1;
 if(!live){say('…nothing. The command arrived late.','fail');return;}
 if(f>1){shatter();return;}
 const st=STAGES[B.stage].k;
 if(st==='Chip'){if(Math.random()<.18){say('Tck — no chip. Sometimes there is no chip.','tck');return;}
  if(f<.12){say('Too soft — nothing gave.','fail');return;}B.chips.push([px,py,f]);snd('tck');
  if(off)say('Tck. A chip — but it landed somewhere else (drift).');else if(f<.45){say('Tck. Clean chip, right where you wanted it. → Crack');B.stage=1;}else say('Chip, but heavier than needed. Smaller.');}
 else if(st==='Crack'){if(B.crack>=1){say('Crack held along the line. → Crumble');B.stage=2;}else say('Line broke off at '+(B.crack*100|0)+'%. Keep the force steady and low.','fail');B.crack=0;}
 else if(st==='Crumble'){const i=B.corner;if(f>.6){say('Too much into one spot — spread it.','fail');B.crumbleHits[i]=Math.max(0,B.crumbleHits[i]-1);return;}B.crumbleHits[i]++;snd('tck');B.chips.push([px,py,f]);
  if(B.crumbleHits.every(h=>h>=1)){say('Distributed. The corner crumbles evenly. → Stop');B.stage=3;}else say('Tck. Now another mark.');}
 else if(st==='Stop'){if(B.cupShake>0.5){say('You stopped — but the cup rattled. Stop sooner.','fail');}else if(f<.15){say('Too little to start a response.','fail');}else{snd('tck');say('Stopped exactly when you chose. Cup untouched. ✓ (PROPOSAL loop complete — try again)');B.stage=0;B.chips=[];B.crumbleHits=[0,0,0,0];}B.cupShake=0;B.stopArmed=false;}}
function shatter(){B.shattered=true;B.holding=false;snd('shatter');say('Brick shattered — released, not controlled. Click to take out another brick.','');}
function say(m,s){B.msg=m;B.msgT=4;if(s)snd(s);}
function hit(x,y,r){return B.btns.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);}
function pd(e){const b=hit(e.clientX,e.clientY);if(b){b.fn();return;}
 // choose corner by clicking near it, then press
 const R=B.rect;if(R){const u=(e.clientX-R.x)/R.w,v=(e.clientY-R.y)/R.h;let bi=0,bd=9;CORNERS.forEach((c,i)=>{const d=Math.hypot(c[0]-u,c[1]-v);if(d<bd){bd=d;bi=i;}});if(bd<.35)B.corner=bi;}
 press();}
function pu(){release();}
function drawBrick(){if(!B)return;requestAnimationFrame(drawBrick);const dt=1/60;B.t+=dt;const c=B.c,g=B.g,W=c.width=innerWidth,H=c.height=innerHeight;
 if(B.holding&&B.t-B.cmdT>B.lat){B.force+=dt*(B.stage===1?.35:.6);if(B.stage===1){B.crack=Math.min(1,B.crack+dt*.45);if(B.force>.75){B.crack=0;B.force=0;say('Pushed too hard — the line jumped. Hold lighter.','fail');}}if(B.stage===3&&B.force>.55)B.cupShake+=dt*2.5;if(B.force>1)shatter();}
 if(hand()&&B.holding&&Math.random()<.01)B.drift=[(Math.random()-.5)*.3,(Math.random()-.5)*.3];
 g.fillStyle='#101018';g.fillRect(0,0,W,H);
 // hand (black glove, sound hand = LEFT when S3 damaged right is PLACEHOLDER)
 const bw=Math.min(W*.5,520),bh=bw*.48,bx=W/2-bw/2,by=H/2-bh/2;B.rect={x:bx,y:by,w:bw,h:bh};
 g.fillStyle='#16161c';g.beginPath();g.ellipse(W/2,by+bh+bh*.25,bw*.62,bh*.55,0,0,Math.PI*2);g.fill();
 // brick
 const sh=B.shattered;g.save();g.translate(bx,by);
 if(sh){for(let i=0;i<14;i++){g.fillStyle=['#8e3b2a','#a5462f','#7a3022'][i%3];g.fillRect((i*67)%bw,bh*.7+(i*31)%(bh*.5),bw*.09,bh*.12);}}
 else{const gr=g.createLinearGradient(0,0,0,bh);gr.addColorStop(0,'#b24e33');gr.addColorStop(1,'#7b2f20');g.fillStyle=gr;g.fillRect(0,0,bw,bh);
  g.fillStyle='rgba(0,0,0,.15)';for(let i=0;i<60;i++)g.fillRect((i*97)%bw,(i*53)%bh,3,3);
  // old shallow marks on one corner (from the scene)
  g.fillStyle='rgba(40,10,5,.5)';for(let i=0;i<7;i++)g.fillRect(bw*.82+(i%3)*8,bh*.08+(i/3|0)*7,4,3);
  for(const [u,v,f] of B.chips){g.fillStyle='#3a140c';g.beginPath();g.arc(u*bw,v*bh,4+f*14,0,7);g.fill();}
  if(B.stage===1){g.setLineDash([6,6]);g.strokeStyle='#e8d8ff';g.lineWidth=2;g.beginPath();const [cx,cy]=CORNERS[B.corner];g.moveTo(cx*bw,cy*bh);g.lineTo(.5*bw,.5*bh);g.stroke();g.setLineDash([]);g.strokeStyle='#1a0703';g.lineWidth=3;g.beginPath();g.moveTo(cx*bw,cy*bh);g.lineTo((cx+(.5-cx)*B.crack)*bw,(cy+(.5-cy)*B.crack)*bh);g.stroke();}
  CORNERS.forEach(([u,v],i)=>{g.strokeStyle=i===B.corner?'#ffffff':'rgba(255,255,255,.3)';g.lineWidth=i===B.corner?3:1;g.beginPath();g.arc(u*bw,v*bh,B.stage===0?10:16,0,7);g.stroke();if(B.stage===2&&B.crumbleHits[i]){g.fillStyle='#e8d8ff';g.fillText('✓',u*bw-4,v*bh+4);}});
  // where the command actually lands (drift ghost)
  if(B.holding&&(B.drift[0]||B.drift[1])){const [cx,cy]=CORNERS[B.corner];g.strokeStyle='rgba(200,205,215,.6)';g.beginPath();g.arc((cx+B.drift[0])*bw,(cy+B.drift[1])*bh,8,0,7);g.stroke();}}
 g.restore();
 // fingertip
 if(!sh){const [cx,cy]=CORNERS[B.corner];g.fillStyle='#0b0b0f';g.beginPath();g.ellipse(bx+cx*bw,by+cy*bh-bh*.32,11,bh*.3,0,0,7);g.fill();if(hand()){g.strokeStyle='rgba(205,210,220,'+(.35+.3*Math.sin(B.t*3))+')';g.lineWidth=1.5;g.beginPath();g.moveTo(bx+cx*bw-6,by+cy*bh-bh*.5);g.lineTo(bx+cx*bw+4,by+cy*bh-bh*.1);g.stroke();}}
 // cup (Stop stage)
 if(B.stage===3){const sx=(Math.random()-.5)*B.cupShake*6;g.fillStyle='#f2efe8';g.fillRect(bx+bw+40+sx,by+bh*.35,46,58);g.strokeStyle='#f2efe8';g.lineWidth=5;g.beginPath();g.arc(bx+bw+92+sx,by+bh*.6,12,-1.4,1.4);g.stroke();g.fillStyle='#bbb';g.font='11px system-ui';g.fillText('fragile cup',bx+bw+34,by+bh*.35+76);}
 // force meter
 g.fillStyle='#222';g.fillRect(W/2-150,by+bh+bh*.9,300,12);g.fillStyle=B.force>.8?'#ff6b5a':'#cfd3da';g.fillRect(W/2-150,by+bh+bh*.9,300*Math.min(1,B.force),12);
 g.fillStyle='#888';g.font='11px system-ui';g.textAlign='center';g.fillText('force (over the top = shatter)',W/2,by+bh+bh*.9+28);
 // text
 g.textAlign='left';g.fillStyle='#e8e8f0';g.font='bold 20px system-ui';g.fillText('Lighthouse Yard: Brick · Stage '+(B.stage+1)+'/4 — '+STAGES[B.stage].k,24,40);
 g.font='13px system-ui';g.fillStyle='#c8c0dc';g.fillText(STAGES[B.stage].goal,24,62);
 g.fillStyle='#ffb86b';g.fillText('PROPOSAL (Coach 2026-10-23, not stamped canon) · Season '+B.season+(hand()?' hand: commands may arrive late or land somewhere else':' hand: steady')+' · brick held in the sound (left) hand · damaged hand = right (PLACEHOLDER)',24,82);
 g.fillStyle='#9a94b0';g.fillText('Click a corner / 1-4 to pick · hold mouse or Space for force · release to stop · K pocket the brick (no penalty) · Esc close',24,H-20);
 if(B.msgT>0){B.msgT-=dt;g.globalAlpha=Math.min(1,B.msgT);g.fillStyle='#fff';g.font='600 17px system-ui';g.textAlign='center';g.fillText(B.msg,W/2,by-30);g.globalAlpha=1;g.textAlign='left';}
 // buttons
 B.btns=[{x:W-190,y:20,w:170,h:36,t:'Pocket the brick',fn:()=>closeBrick(true)}];for(const b of B.btns){g.fillStyle='#2a2440';g.fillRect(b.x,b.y,b.w,b.h);g.fillStyle='#e8e8f0';g.font='600 14px system-ui';g.textAlign='center';g.fillText(b.t,b.x+b.w/2,b.y+23);g.textAlign='left';}}
// ---------- input ----------
addEventListener('keydown',e=>{const g=G();if(!g)return;
 if(B){e.stopImmediatePropagation();e.preventDefault();if(e.repeat)return;if(e.code==='Escape')closeBrick(false);else if(e.code==='KeyK')closeBrick(true);else if(e.code==='Space')press();else if(/^Digit[1-4]$/.test(e.code))B.corner=+e.code[5]-1;return;}
 if(e.code==='KeyT'&&!e.repeat){cycleSeason();e.stopImmediatePropagation();}
 if(e.code==='KeyG'&&!e.repeat){const s=g.SPOTS.skate,p=g.P.o.position;if(window.__brickAnywhere||(s.c&&p.distanceTo(s.c)<40)){for(const k in g.keys)g.keys[k]=false;openBrick();e.stopImmediatePropagation();}else{const t=document.getElementById('toast');t.innerHTML='Brick minigame: go to the Skatepark (Lighthouse Yard), then press G';t.style.opacity=1;}}},true);
addEventListener('keyup',e=>{if(B){e.stopImmediatePropagation();if(e.code==='Space')release();}},true);
window.__seasonPost=seasonPost;window.__brick={open:openBrick,close:closeBrick,cycleSeason,get state(){return B;}};
const wait=setInterval(()=>{if(G()&&G().P){clearInterval(wait);badge('S1 · Street Metal (default)');}},300);
