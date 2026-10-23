/* Safe Lab Gate: register -> 30s orientation -> 10/10 remixed quiz -> pledge -> lab. All local (localStorage). */
(function(){
const LS='wirlab.v1', $=id=>document.getElementById(id);
const st=()=>JSON.parse(localStorage.getItem(LS)||'{}'), save=o=>localStorage.setItem(LS,JSON.stringify({...st(),...o}));
const pick=a=>a[Math.floor(Math.random()*a.length)], shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* PHATOM-style personalization: read "about you", pick a world to set questions in */
const WORLDS=[
 {k:/plant|garden|seed|grow|farm|soil|flower/i, at:'in your garden', thing:'your seedlings', who:'your plants'},
 {k:/football|sport|ball|gym|train|coach|run|lift|fitness/i, at:'at practice', thing:'your water bottle', who:'your teammates'},
 {k:/cook|food|kitchen|chef|bake/i, at:'in the kitchen', thing:'the cutting board', who:'the people you cook for'},
 {k:/music|rap|song|beat|sing/i, at:'in the studio', thing:'your headphones', who:'your crew'},
 {k:/game|gaming|xbox|playstation|controller|nintendo/i, at:'during a game night', thing:'your controller', who:'your squad'},
 {k:/kid|son|daughter|family|child|teach|student/i, at:'at home with family', thing:'the kitchen table', who:'your family'},
 {k:/dog|cat|animal|pet/i, at:'at home with your pet', thing:'the pet bowl', who:'your pet'},
];
function world(about){ return WORLDS.find(w=>w.k.test(about||'')) || {at:'at home', thing:'the table', who:'the people around you'}; }

/* Bank: q = wording variants (with {name},{at},{thing},{who}); a = right answers; w = wrong answers (3 drawn) */
const B=[
 {q:['{name}, you spill a chemical {at}. First move?','A chemical splashes {at}. What do you do first, {name}?'],a:['Step back and tell an adult or teacher','Stop, step back, and get a trained adult'],w:['Wipe it with your hand','Taste it to check what it is','Hide it so nobody worries','Pour random stuff on it to cancel it']},
 {q:['Why never put water on burning magnesium?','Burning magnesium + water. What happens?'],a:['Water makes the fire flare up worse','It pulls oxygen from water and the fire grows'],w:['Water puts it out instantly','Nothing, it is fine','It turns into gold','It freezes']},
 {q:['What puts out a metal (Class D) fire?','A metal fire needs what?'],a:['Dry sand or a Class D extinguisher','Smother it with dry sand / Class D extinguisher'],w:['A bucket of water','Blowing on it','A wet towel and a fan','Soda']},
 {q:['What protects your eyes in a real lab?','Before any real reaction, your eyes need…'],a:['Safety goggles','Proper safety goggles'],w:['Sunglasses','Squinting','Nothing if you are quick','A hat']},
 {q:['Is it OK to look straight at burning magnesium?','Burning Mg is super bright. Stare at it?'],a:['No, it can hurt your eyes','No, look away, it gives off UV'],w:['Yes, it is just light','Yes, if you blink a lot','Only with one eye','Yes, for a photo']},
 {q:['How do you smell a chemical safely?','Safe way to check a smell?'],a:['Wave the air toward you, never sniff directly','Waft gently with your hand'],w:['Put your nose right in it','Take a deep sniff','Taste it instead','Shake it near your face']},
 {q:['Can you eat or drink in a chemistry lab?','{name}, snack in the lab?'],a:['No, never eat or drink in a lab','No, food stays out of the lab'],w:['Yes, if it is a small snack','Only water','Yes if gloves are on','Only on Fridays']},
 {q:['Sodium meets water. What happens in real life?','Why is sodium in water dangerous?'],a:['It fizzes, makes hydrogen and can pop or catch fire','It reacts fast, makes hydrogen and heat'],w:['Nothing at all','It dissolves like sugar','It makes ice','It gets colder and safer']},
 {q:['Who should handle real reactive metals like sodium or potassium?','Real potassium belongs with…'],a:['Trained teachers with safety gear','Only trained adults in a proper lab'],w:['Anyone curious','Kids at a sleepover','Whoever is bravest','Nobody needs training']},
 {q:['The pledge of this lab is…','Finish the pledge: "Don\'t get smart to…"'],a:['"Don\'t get smart to hurt nobody."','…hurt nobody.'],w:['"Get smart, get rich."','"Smart beats nice."','"Knowledge is a weapon."','"Win at any cost."']},
 {q:['Someone wants to use chemistry to hurt people. You…','A friend asks you to help make something to harm someone. You…'],a:['Refuse and tell a trusted adult','Say no and report it to someone who can help'],w:['Help a little','Keep it a secret','Teach them for money','Ignore it completely']},
 {q:['What is science in this lab for?','Why learn dangerous chemistry here?'],a:['To understand, protect people and the planet','To stay safe and help people and nature'],w:['To win fights','To build weapons','To scare people','To show off']},
 {q:['Leftover chemicals {at}. Where do they go?','How do you get rid of old chemicals?'],a:['Follow disposal rules / ask an adult','Proper disposal, never just down the drain or outside'],w:['Pour them on the plants','Dump them in a river','Flush them','Bury them in the yard']},
 {q:['Why care about pouring chemicals on soil?','Chemicals in the soil can…'],a:['Harm plants, bugs, water and animals','Poison the ecosystem living there'],w:['Make plants grow super fast','Do nothing','Clean the dirt','Make gold']},
 {q:['Is everything in this AR lab real?','What happens to the "fire" in this AR lab?'],a:['No, it is all virtual and safe','It is virtual, nothing really burns'],w:['It is real fire','It can burn your phone','It is real sodium','It heats your hand']},
 {q:['Should you try these reactions at home after the AR lab?','{name}, you saw Na + water here. Try it {at}?'],a:['No, only with a trained teacher in a real lab','No, the AR lab is the safe way'],w:['Yes, it looked fun','Yes, with a little bit','Yes, outside is fine','Yes, if nobody is looking']},
 {q:['Long hair near a flame should be…','Before a flame demo, hair and loose sleeves should be…'],a:['Tied back and away','Tied back, sleeves rolled'],w:['Left loose','Sprayed with hairspray','Held over the flame','Covered in oil']},
 {q:['A chemical gets in your eye. What do you do?','Eye splash! Next step?'],a:['Flush with water at the eyewash 15 minutes and get help','Rinse at the eyewash and call for help'],w:['Rub it hard','Wait and see','Close it and go to sleep','Put lotion in it']},
 {q:['A small burn on your skin from something hot. First aid?','Hot spill burns your hand. Do what?'],a:['Cool running water and tell an adult','Cool water for several minutes, get help'],w:['Ice directly for an hour','Butter','Ignore it','Pop any blisters']},
 {q:['Copper in a flame makes what color?','Flame test: copper gives…'],a:['Green / blue-green','Blue-green'],w:['Purple','Bright white','Black','Red only']},
 {q:['Potassium flame color is…','Flame test: potassium gives…'],a:['Lilac / light purple','Pale purple (lilac)'],w:['Green','Orange-yellow','Black','Blue-white']},
 {q:['Sodium flame color is…','Flame test: sodium gives…'],a:['Bright orange-yellow','Orange-yellow'],w:['Green','Purple','Black','Pink']},
 {q:['What gas do sodium and potassium make in water?','The bubbles from Na in water are…'],a:['Hydrogen','Hydrogen gas (H₂)'],w:['Oxygen','Helium','Carbon dioxide','Steam only']},
 {q:['Which reacts more wildly with water?','More violent with water: sodium or potassium?'],a:['Potassium','Potassium (more reactive)'],w:['Sodium','They are exactly the same','Neither reacts','Copper']},
 {q:['Burning magnesium makes what white powder?','The white smoke from burning Mg is…'],a:['Magnesium oxide (MgO)','MgO'],w:['Salt','Sugar','Flour','Snow']},
 {q:['Iron filings sprinkled into a flame do what?','Fe filings in a flame look like…'],a:['Sparkle with orange sparks','Shower of sparks'],w:['Explode like a bomb','Turn green','Nothing ever','Freeze']},
 {q:['Where is the safest place to be during a demo?','During a teacher\'s demo you stand…'],a:['Back behind the safety line','At a safe distance, watching'],w:['As close as possible','Right over the flame','Holding the chemical','Behind the teacher\'s back reaching in']},
 {q:['If you feel panicked in the lab, best move?','Something goes wrong and you feel scared. Do what?'],a:['Breathe, step back, call for help','Stay calm, move away, tell an adult'],w:['Run and push people','Throw the beaker','Freeze and hide it','Try to fix it alone fast']},
 {q:['Why read a label before using a chemical?','Labels tell you…'],a:['What it is and how to handle it safely','Hazards and safe handling'],w:['Nothing useful','Only the price','The color it will turn','A joke']},
 {q:['Gloves in a real lab are for…','Why wear lab gloves?'],a:['Protecting skin from chemicals','Keeping chemicals off your skin'],w:['Fashion','Better grip on snacks','Keeping hands warm only','Nothing']},
 {q:['{name}, a fire alarm goes off. You…','Fire alarm during class. Do what?'],a:['Leave calmly by the planned exit','Calmly follow the evacuation route'],w:['Finish the experiment','Grab all chemicals','Hide under the desk','Use the elevator']},
 {q:['Science that helps {who} looks like…','A humanitarian use of chemistry is…'],a:['Clean water and medicine','Purifying water, making medicine'],w:['Making weapons','Polluting rivers','Scaring people','Hurting animals']},
 {q:['Emergency flares use bright burning metal to…','Why are magnesium flares useful?'],a:['Help rescuers find people','Signal for rescue'],w:['Hurt people','Burn forests','Light fireworks at people','Scare animals']},
 {q:['An ecosystem is…','Pro-ecosystem means caring about…'],a:['Living things and their environment working together','Plants, animals, water and soil together'],w:['Only humans','Only money','Only machines','Just one plant']},
 {q:['Anti-warfare means…','In this lab, chemistry is never for…'],a:['Not using knowledge for war or harm','Weapons or war'],w:['Learning history','Helping people','Growing food','Cleaning water']},
 {q:['Mixing random household cleaners {at} is…','Bleach + ammonia cleaners together?'],a:['Dangerous, it can make toxic gas','Never do it, toxic gas'],w:['A better cleaner','Totally safe','Good for {thing}','Smells nice']},
 {q:['Before touching {thing} after a lab, you…','After lab work, before you eat?'],a:['Wash your hands','Wash hands with soap and water'],w:['Lick your fingers','Wipe on your shirt','Nothing','Blow on them']},
 {q:['A broken glass beaker. How do you clean it?','Broken glassware should be…'],a:['Tell an adult, use a brush, never bare hands','Swept up carefully into a glass bin'],w:['Picked up fast with bare hands','Left on the floor','Kicked under the table','Thrown at the trash']},
 {q:['Why does this lab make you take a quiz first?','The 10/10 quiz is so you…'],a:['Show you understand safety before playing','Prove you know how to be safe and kind'],w:['Waste time','Get a prize','Pay money','Nothing']},
 {q:['Heat makes most reactions go…','Hot steam vs cold water with magnesium: which is faster?'],a:['Faster (hot steam)','Faster when hotter'],w:['Slower','Exactly the same','Backwards','Stop forever']},
 {q:['If you are not sure something is safe, you…','{name}, unsure about a step. Do what?'],a:['Stop and ask','Ask a teacher before doing it'],w:['Guess','Do it faster','Ask nobody','Look it up after']},
 {q:['Knowing how something can hurt people helps you…','Why learn how accidents happen?'],a:['Prevent it and protect people','Keep yourself and others safe'],w:['Hurt people better','Brag','Nothing','Trick friends']},
 {q:['Who do you protect with what you learn?','Your knowledge should protect…'],a:['People, animals, plants and the planet','Everyone and everything living'],w:['Only yourself','Nobody','Only rich people','Only machines']},
 {q:['A real lab coat should be…','Lab coats are for…'],a:['Worn buttoned to protect clothes and skin','Protecting your body from splashes'],w:['Worn open as a cape','Optional costume','For hiding snacks','Used as a towel']},
];

function fill(s,u){const w=world(u.about); return s.replace(/\{name\}/g,u.name||'friend').replace(/\{at\}/g,w.at).replace(/\{thing\}/g,w.thing).replace(/\{who\}/g,w.who);}
function makeSet(u){ return shuffle(B).slice(0,10).map(b=>{const right=fill(pick(b.a),u);
  const opts=shuffle([right,...shuffle(b.w).slice(0,3).map(x=>fill(x,u))]); return {q:fill(pick(b.q),u),opts,right};}); }

/* ---------- screens ---------- */
const G=$('gate');
function show(html){ G.innerHTML=`<div class="gbox">${html}</div>`; G.hidden=false; G.scrollTop=0; }
function step(n){ return `<div class="steps">${['Join','Watch','Quiz','Pledge'].map((s,i)=>`<span class="${i<n?'done':i===n?'on':''}">${i<n?'✓':i+1} ${s}</span>`).join('')}</div>`; }

function register(){
  const u=st().user||{};
  show(`${step(0)}<h1>🥕 Safe Lab Gate</h1><p>Hi! Tell Oscar who you are. It stays on this phone only.</p>
  <label class="fl">Your name or handle<input id="gName" maxlength="30" autocomplete="nickname" value="${esc(u.name||'')}" placeholder="e.g. Naki"></label>
  <label class="fl">About you (what you love)<textarea id="gAbout" maxlength="200" rows="3" placeholder="e.g. football, growing plants, my kids">${esc(u.about||'')}</textarea></label>
  <button class="gbtn" id="gNext">Next ➜</button>`);
  $('gNext').onclick=()=>{const name=$('gName').value.trim(), about=$('gAbout').value.trim();
    if(!name){ $('gName').focus(); $('gName').classList.add('bad'); return; }
    save({user:{name,about,at:Date.now()}}); orientation(); };
}

const SLIDES=[
 ['🥕','Welcome to Oscar\'s Absurd AR Lab','Everything here is virtual. No real fire. No real danger.'],
 ['🥽','Real labs need goggles, gloves and a teacher','Reactive metals like sodium and potassium are never home experiments.'],
 ['✋','Pinch to grab, open palm to ignite','Or tap and drag with your finger, or use a game controller.'],
 ['🔥','Magnesium + water = worse fire','Metal fires get dry sand or a Class D extinguisher. Never water.'],
 ['🌱','Protect people, plants and the planet','Chemicals do not go on soil, in rivers or down the drain.'],
 ['🕊️','"Don\'t get smart to hurt nobody."','Science is for healing, clean water and rescue. Never for war.'],
];
function orientation(){
  const D=5000; let i=0, t0=performance.now(), raf;
  show(`${step(1)}<div class="slide" id="sl"></div><div class="pbar"><div id="pfill"></div></div>
   <p class="small" id="ptime">30 s</p><button class="gbtn" id="gGo" disabled>Watch to the end…</button>`);
  const draw=()=>{const [e,h,p]=SLIDES[i]; $('sl').innerHTML=`<div class="semoji">${e}</div><h2>${h}</h2><p>${p}</p>`;};
  draw();
  const tick=now=>{ const el=now-t0, tot=D*SLIDES.length, k=Math.min(1,el/tot);
    $('pfill').style.width=(k*100)+'%'; $('ptime').textContent=Math.ceil((tot-el)/1000)+' s';
    const ni=Math.min(SLIDES.length-1,Math.floor(el/D)); if(ni!==i){i=ni;draw();}
    if(k<1) raf=requestAnimationFrame(tick); else { $('ptime').textContent='Done ✓'; const b=$('gGo'); b.disabled=false; b.textContent='Start the quiz ➜'; b.onclick=quiz; } };
  raf=requestAnimationFrame(tick);
  window.__gateSkipVideo=()=>{t0-=D*SLIDES.length;}; // test hook
}

function quiz(){
  const u=st().user, set=makeSet(u); window.__gateSet=set; let n=0, score=0, missed=[];
  const q=()=>{ const it=set[n];
    show(`${step(2)}<p class="small">Question ${n+1} of 10 · need 10/10</p><h2 class="qq">${esc(it.q)}</h2>
     <div class="opts">${it.opts.map((o,j)=>`<button class="opt" data-j="${j}">${esc(o)}</button>`).join('')}</div>`);
    G.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ const ok=it.opts[b.dataset.j]===it.right;
      G.querySelectorAll('.opt').forEach(x=>{x.disabled=true; if(it.opts[x.dataset.j]===it.right) x.classList.add('ok');});
      if(ok) score++; else { b.classList.add('no'); missed.push(it); }
      setTimeout(()=>{ n++; n<10?q():result(); }, ok?600:1600); }); };
  const result=()=>{ if(score===10){ save({passed:Date.now()}); return pledge(); }
    show(`${step(2)}<h1>${score}/10</h1><p>So close, ${esc(u.name)}! You need 10/10. Here is what to remember:</p>
     <ul class="miss">${missed.map(m=>`<li><b>${esc(m.q)}</b><br>✅ ${esc(m.right)}</li>`).join('')}</ul>
     <p class="small">Next try is a brand-new mix of questions.</p><button class="gbtn" id="gRetry">Try a new set ➜</button>`);
    $('gRetry').onclick=quiz; };
  q();
}

function pledge(){
  const u=st().user;
  show(`${step(3)}<h1>10/10 🎉</h1><p class="big">"Don't get smart to hurt nobody."</p>
   <p>I, <b>${esc(u.name)}</b>, promise to use what I learn to protect people, animals, plants and the planet. I will not use science for war or to harm anyone. Real reactive chemicals stay with trained teachers.</p>
   <button class="gbtn" id="gPledge">I pledge ✋ Open the lab</button>`);
  $('gPledge').onclick=()=>{ save({pledged:Date.now()}); enter(); };
}
function enter(){ G.hidden=true; G.innerHTML=''; const go=()=>window.startLab?window.startLab():setTimeout(go,100); go(); }

function welcomeBack(){ const s=st();
  show(`<h1>🥕 Welcome back, ${esc(s.user.name)}!</h1><p>You passed the gate. Reactions unlocked: <b>${(s.done||[]).length}</b> done.</p>
   <button class="gbtn" id="gIn">Enter the lab 🔬</button><button class="gbtn ghost" id="gRedo">Retake the gate</button>`);
  $('gIn').onclick=enter; $('gRedo').onclick=()=>{save({passed:0,pledged:0});register();}; }

window.WIRGate={state:st,save,makeSet,bank:B,register};
const s=st(); (s.passed&&s.pledged&&s.user)?welcomeBack():register();
})();
