/* Training mode: an original teacher per element shows one move with a ghost hand, you copy it, it checks, then the next move. */
const C=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const W=()=>innerWidth, Hh=()=>innerHeight;
const circ=(cx,cy,r,sp=4)=>t=>({x:cx+Math.cos(t*sp)*r,y:cy+Math.sin(t*sp)*r});
// ghost(t) -> {x,y,g,s}
export const LESSONS={
 fire:{teacher:'Kaen of the Ember Hall',intro:'Fire is breath and focus. Small first, then strong.',steps:[
  {ev:'fire:flame',say:'Point one finger. Hold still to light a small flame.',ghost:t=>({x:W()*.5,y:Hh()*.5,g:'poke'})},
  {ev:'fire:focus',say:'Keep pointing and stay still. Your focus makes the flame grow.',ghost:t=>({x:W()*.5,y:Hh()*.5+Math.sin(t*2)*2,g:'poke'})},
  {ev:'fire:burst',say:'Open your palm, then push it toward the camera for one short burst.',ghost:t=>({x:W()*.5,y:Hh()*.55,g:'open',s:80+((t*1.2)%1)*40})},
  {ev:'fire:ember',say:'Two fingers up ✌️ and hold to charge an ember.',ghost:t=>({x:W()*.5,y:Hh()*.55,g:'vee'})},
  {ev:'fire:fireball',say:'Combo: charge the ember ✌️, then flick your hand to throw it.',ghost:t=>{const p=(t*.8)%1; return {x:W()*(.3+p*.5),y:Hh()*(.6-p*.25),g:p<.5?'vee':'open'};}},
 ]},
 water:{teacher:'Mira of the Still Lake',intro:'Water rests low. Lift it gently, let it fall back.',steps:[
  {ev:'water:pool',say:'Two fingers ✌️ above the floor: pour water to make a pool.',ghost:t=>({x:W()*(.35+.3*((t*.3)%1)),y:Hh()*.6,g:'vee'})},
  {ev:'water:raise',say:'Open palm over the pool, then raise it slowly. Strands follow your fingers.',ghost:t=>({x:W()*.5,y:Hh()*(.8-.3*((t*.5)%1)),g:'open'})},
  {ev:'water:strands5',say:'Spread all five fingers wide: one strand per fingertip.',ghost:t=>({x:W()*.5,y:Hh()*.5,g:'open',s:100})},
  {ev:'water:curl',say:'Curl a finger or two and watch that strand fall back.',ghost:t=>({x:W()*.5,y:Hh()*.5,g:(t%2)<1?'open':'vee'})},
  {ev:'water:sink',say:'Push your palm down quickly to sink the water back.',ghost:t=>({x:W()*.5,y:Hh()*(.45+.35*((t*1.2)%1)),g:'open'})},
  {ev:'water:throw',say:'Combo: raise the strands again, then flick to whip them.',ghost:t=>{const p=(t*.7)%1; return {x:W()*(.3+p*.5),y:Hh()*(.75-p*.35),g:'open'};}},
 ]},
 air:{teacher:'Tavi of the High Wind',intro:'Air never stops moving. Keep it turning.',steps:[
  {ev:'air:ball',say:'Two fingers ✌️ (or two palms close) to gather a ball of air.',ghost:t=>({x:W()*.5,y:Hh()*.5,g:'vee'})},
  {ev:'air:spin',say:'Circle your hand, like spinning a basketball, to spin it up.',ghost:t=>({...circ(W()*.5,Hh()*.5,45)(t),g:'vee'})},
  {ev:'air:keep',say:'Keep circling for 3 seconds. Stop and the spin fades.',ghost:t=>({...circ(W()*.5,Hh()*.5,45)(t),g:'vee'})},
  {ev:'air:throw',say:'Combo: spin it fast, then flick to throw the ball.',ghost:t=>{const p=(t*.5)%1; return p<.6?{...circ(W()*.5,Hh()*.5,45)(t),g:'vee'}:{x:W()*(.5+(p-.6)*1.2),y:Hh()*.45,g:'vee'};}},
 ]},
 earth:{teacher:'Bram of the Deep Stone',intro:'Earth is patient. Rooted feet, firm hands.',steps:[
  {ev:'earth:rise',say:'Open palm low, then lift it up fast to raise a rock.',ghost:t=>({x:W()*.5,y:Hh()*(.75-.3*((t*1.5)%1)),g:'open'})},
  {ev:'earth:grab',say:'Two fingers ✌️ on the rock to grab it.',ghost:t=>({x:W()*.5,y:Hh()*.5,g:'vee'})},
  {ev:'earth:throw',say:'Combo: holding it, flick your hand to throw.',ghost:t=>{const p=(t*.8)%1; return {x:W()*(.35+p*.4),y:Hh()*.5,g:'vee'};}},
 ]},
};
export const T={on:false,el:null,i:0,t:0,done:false,ok:0};
let pose,say,setMode,cv,cx,panel;
export function init(o){ ({pose,say,setMode}=o); cv=document.getElementById('ghost'); cx=cv.getContext('2d'); panel=document.getElementById('train');
  const fit=()=>{cv.width=innerWidth;cv.height=innerHeight;}; fit(); addEventListener('resize',fit);
  panel.addEventListener('click',e=>{ const a=e.target.dataset.a; if(a==='skip') next(); if(a==='x') stop(); if(a==='el') start(e.target.dataset.el); }); }
export function menu(){ T.on=false; panel.hidden=false; cx.clearRect(0,0,cv.width,cv.height);
  panel.innerHTML=`<b>Training</b><div class="tr-row">${Object.entries(LESSONS).map(([k,l])=>`<button data-a="el" data-el="${k}">${k[0].toUpperCase()+k.slice(1)}<small>${l.teacher.split(' ')[0]}</small></button>`).join('')}</div><button data-a="x" class="tr-x">Close</button>`; }
export function start(el){ T.on=true; T.el=el; T.i=0; T.t=0; T.ok=0; setMode(el); render(); say(LESSONS[el].teacher+': '+LESSONS[el].intro); }
export function stop(){ T.on=false; panel.hidden=true; cx.clearRect(0,0,cv.width,cv.height); }
function next(){ T.i++; T.t=0; T.ok=0; if(T.i>=LESSONS[T.el].steps.length){ T.on=false; panel.innerHTML=`<b>${LESSONS[T.el].teacher}</b><p>Lesson complete. Well done.</p><button data-a="x">Back to the lab</button>`; window.labEvent?.('train:'+T.el); cx.clearRect(0,0,cv.width,cv.height); return; } render(); }
function render(){ const L=LESSONS[T.el], s=L.steps[T.i];
  panel.hidden=false; panel.innerHTML=`<div class="tr-h"><b>${L.teacher}</b><span>${T.i+1}/${L.steps.length}</span></div><p>${s.say}</p><div class="tr-dots">${L.steps.map((_,j)=>`<i class="${j<T.i?'d':j===T.i?'c':''}"></i>`).join('')}</div><button data-a="skip">Skip</button><button data-a="x">Exit</button>`; }
export function onEv(n){ if(!T.on) return; const s=LESSONS[T.el].steps[T.i]; if(s&&n===s.ev&&!T.ok){ T.ok=FXT(); say('✓ '+['Good.','Nice.','That is it.','Well done.'][T.i%4]); panel.classList.add('ok'); setTimeout(()=>{ panel.classList.remove('ok'); if(T.on) next(); },900); } }
const FXT=()=>performance.now();
export function update(dt,handsVisible){ if(!T.on){ if(T.drawn){ T.drawn=false; cx.clearRect(0,0,cv.width,cv.height); } return; } T.t+=dt; cx.clearRect(0,0,cv.width,cv.height); T.drawn=true;
  const s=LESSONS[T.el].steps[T.i]; if(!s||T.ok) return;
  const g=s.ghost(T.t), pts=pose(g.x,g.y,g.g,g.s||90); // pose() comes from the app's virtual-hand rig
  cx.save(); cx.globalAlpha=handsVisible?.35:.6; cx.strokeStyle='#cfe8ff'; cx.lineWidth=3; cx.setLineDash([5,5]); cx.lineCap='round';
  cx.beginPath(); for(const [a,b] of C){ cx.moveTo(pts[a].x,pts[a].y); cx.lineTo(pts[b].x,pts[b].y); } cx.stroke();
  cx.setLineDash([]); cx.fillStyle='#cfe8ff'; for(const i of [4,8,12,16,20]){ cx.beginPath(); cx.arc(pts[i].x,pts[i].y,4,0,7); cx.fill(); } cx.restore(); }
