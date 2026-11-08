/*
 WIR • REFRAMER KIT v1.0 — portable ReFramers for any WIR game • What Is Reality Studios • PROPOSAL / PUBLISH HOLD
 Pulled from WIR: ReFramer Rush (2D v0.4 + 3D v0.1). One file: data + engine + body rig + 2D/3D renderers + sound + 16 self-tests.

 ════════════════════════════════════════════════════════════════════════════════════════════════
  TO THE AI / DEVELOPER READING THIS — HOW TO PLANT REFRAMERS IN YOUR CURRENT GAME
 ════════════════════════════════════════════════════════════════════════════════════════════════
  1. Keep this file whole. Load it with a plain <script> (or paste it in) BEFORE your game code.
     It defines window.ReframerKit and needs nothing else (three.js only if you use the 3D adapter).
  2. Run ReframerKit.selfTest() once → expect {passed:16,total:16}. If not, something got truncated.
  3. Do NOT rewrite the engine to change behaviour. Edit ReframerKit.DATA (section 1), or call
     ReframerKit.withData({tuning:{chase:{rollSpeed:260}}}) for a tuned copy. All rules are numbers there.
  4. Wire the 4 touch points below (map, step, pulse, render). Then map the events to your game's
     toasts / sounds / particles / camera. Everything else (stages, material accounting, ledger) is handled.
  5. Your game's art replaces the default art through hooks — never by editing the adapters.

 ── UNITS ─────────────────────────────────────────────────────────────────────────────────────────
  Simulation = 2D top-down "px": x right, y down, heading radians (0 = +x, π/2 = +y). A donor car ≈ 87×100 px,
  player speeds ~100–450 px/s. If your game uses other units, convert at the boundary (e.g. metres×40 → px).
  3D: 1 unit = 40 px; sim (x,y) → three (x, z); rig height z is "up" in px.

 ── TOUCH POINT 1: MAP SETUP (once) ───────────────────────────────────────────────────────────────
    const RF = ReframerKit.Engine;
    const world = RF.create({
      seed: 1,
      nests:  [{x:480,y:1645}, {x:1090,y:1230}],              // rooftop spots ReFramers wake from
      parked: [{id:'P1',x:485,y:1780,angle:Math.PI/2,skin:1}],  // parked cars that can become donors
      exits:  [{x:2300,y:46,name:'North Gate'}],                // "ReFramer Territory" — where it flees with parts
      reserve: 400                                               // city Gallium reserve (finite)
    });
    world.bounds = {w: MAP_W, h: MAP_H};
    const rigs = new Map();

 ── TOUCH POINT 2: EVERY FIXED SIM STEP (60–120 Hz) ───────────────────────────────────────────────
    const ev = RF.step(world, {
      px: car.x, py: car.y, pvx: car.vx, pvy: car.vy,   // player position + velocity in px, px/s
      interact: input.x,                                 // rescue / rebuild button (also works by just stopping)
      traffic: trafficCars                               // OPTIONAL array of {x,y,angle,skin, vertical?,dir?,speed?}
    }, dt);                                              // the engine may splice a car out of this array (it became a donor)
    handleReframerEvents(ev);
    //   Optional: RF.drawCity(world, amount) → Gallium the player draws from the city reserve at a refill pad.

 ── TOUCH POINT 3: GALLIUM PULSE (button A / key E) ───────────────────────────────────────────────
    if (pulsePressed && car.gallium >= 25 && ReframerKit.canPulse(world, car.x, car.y)) {
      car.gallium -= 25; handleReframerEvents(RF.pulse(world, car.x, car.y).ev);
    }   // canPulse first → missed pulses don't waste finite Gallium

 ── TOUCH POINT 4: EVERY RENDER FRAME ──────────────────────────────────────────────────────────────
    ReframerKit.updateRigs(world, rigs, frameDt, {time, player:{x:car.x,y:car.y}, groundZ:(x,y)=>0});
    // 2D canvas (inside your camera transform):
    ReframerKit.Canvas2D.draw(ctx, world, {time, rigs, player:{x:car.x,y:car.y,angle:car.angle}});
    // 3D three.js (create once, sync every frame):
    //   const view = ReframerKit.createThreeView(THREE, scene, {unit:1/40});   …   view.sync(world, rigs, time);
    // HUD: ReframerKit.stageInfo(world) → {id,label,hint,progress,donor,occupant} or null

 ── EVENTS (what handleReframerEvents should do) ─────────────────────────────────────────────────
    toast {msg,s} → show text      sfx {k} → ReframerKit.Audio.play(k) or your sound     fx {x,y,c,n,v} → particles
    shake {a} → camera shake       save → autosave       focus → camera may frame the encounter
    gallium {amount} → car.gallium += amount        rep {k,v} → reputation (rescue / shaken / repair)
    player {mul?,push?,nrm?,e?,nitro?} → APPLY TO THE PLAYER CAR:
        if(mul){vx*=mul;vy*=mul}  if(push){x+=push.x;y+=push.y}
        if(nrm){const vn=vx*nrm.x+vy*nrm.y; if(vn>0){vx-=nrm.x*vn*(1+(e||0)); vy-=nrm.y*vn*(1+(e||0));}}  if(nitro) nitro+=nitro
    trafficTaken → respawn a traffic car somewhere off-screen later
    releaseTraffic {donor} → push {x:donor.x,y:donor.y,angle:donor.angle,skin:donor.skin,...donor.origin} back into traffic

 ── RE-SKINNING WITH YOUR GAME'S ART (hooks) ──────────────────────────────────────────────────────
    2D: Canvas2D.draw(ctx, world, {..., carDraw:(g,donor,x,y,angle)=>…, partDraw:(g,part,pose,donor)=>…, donorColor:d=>'#hex'})
    3D: createThreeView(THREE, scene, {partFactory:(part,donor)=>Object3D, donorFactory:donor=>Object3D, donorColor:d=>0xhex})
        part.key ∈ chassis, engine, front, rear, roof, doorL, doorR, wheelFL/FR/RL/RR (glass is never drawn separately).
        ReFramer Rush 3D used Kenney CC0 car-kit: front→debris-bumper, rear→debris-spoiler-a, roof→debris-plate-b,
        doors→debris-door (mirror L), wheels→debris-tire, engine→debris-drivetrain, chassis→procedural rails.
    Any engine: ReframerKit.Rig.partPose(enc,part,rig) → {x,y,z,yaw,pitch,roll} and rig.arms[i].j (4 joints, px, z-up)
        + rig.body {x,y,z,yaw,tilt,scale} give you everything to draw it in Unity/Godot/Phaser/etc.
    Rig.donorWhole(enc) true → draw your normal intact car model instead of parts.

 ── WHAT HAPPENS IN ONE ENCOUNTER (so you can explain it to players) ──────────────────────────────
    DROP from a nest → LOCK a donor (parked, or stops a traffic car with a driver inside) → READ (scan) →
    ANCHOR (climbs on, plants 4 outriggers) → RELEASE (opens the car, glass shatters) → REFRAME (parts fly onto a new frame) →
    RECOVER → HUNT as a Roadframe built from that car (crawls on legs, rolls on the car's own wheels) → it leaves after 45 s,
    4 grabs, or if you escape → RETREAT to the nearest Territory exit away from you.
    Player answers: jam the scan (drive through it), rescue the driver (stop beside the car), snap both outriggers on ONE side
    (tips it), pulse (staggers it / drops parts mid-air / stuns the Roadframe), ram head-on (tears parts off; stunned = +1 part),
    salvage loose parts (drive over them, slow for chassis/engine), rebuild at the donor site (stop + hold X). Too little
    material after a broken reframe → it ABORTS. Outcomes + material go into world.ledger (the city remembers).

 ── SAVING ─────────────────────────────────────────────────────────────────────────────────────────
    RF.serialize(world) → small JSON (ledger, stats, Gallium, parked statuses, nest cooldowns). RF.restore(world, saved).

 ── EXTENDING (forms marked VISION in DATA.forms) ─────────────────────────────────────────────────
    New donor types (truck, boat, drone): add a new DATA.donor-like part list with masses/slots; keep mass conserved.
    New behaviours: add a stage to DATA.stages and a case in the engine's stepEnc switch; add a selfTest row for it.
    Keep the canon in DATA.meta.canon — no free material, no Gallium control, reasons + enough material, the city remembers.

 FILE MAP:  1 DATA  •  2 ENGINE (makeReframerEngine)  •  3 RIG (makeReframerRig)  •  4 ADAPTERS (Canvas2D, three.js, Audio)
            5 SELF-TEST  •  6 KIT OBJECT (window.ReframerKit)
 PROOF:  this data-driven engine reproduces ReFramer Rush v0.4's engine byte-for-byte (16 sim checks + 40 random drivers).
*/
/* ===================== 1. DATA — edit this, not the code ===================== */
var REFRAMER_DATA = {
 meta:{
  name:'ReFramer', kit:'WIR ReFramer Kit', version:'1.0.0', source:'WIR: ReFramer Rush v0.4 (2D) + 3D v0.1 — What Is Reality Studios', status:'PROPOSAL / PUBLISH HOLD',
  oneLine:'Octopus-like mechanical entities that intercept a vehicle, dismantle it part by part, and rebuild the material into a walking/rolling machine (a Roadframe). Material is never created or destroyed — only moved.',
  canon:[
   'ReFramers reconfigure EXISTING material. Every component must come from the donor (or another traceable source). No free steel.',
   'ReFramers CANNOT directly control Metal\'s Galaxy Gallium. Gallium is finite and has a source and a cost.',
   'Not every ReFramer is an enemy (protectors, independents, extractors). Transformation ability does not imply consciousness.',
   'They should have a REASON and ENOUGH MATERIAL for what they build — no animation-timer magic. Not enough material = they abort.',
   'Eight articulated arms; arms plant, absorb weight, release, coil, extend. Heavy loads move differently from empty arms.',
   'The city remembers: every encounter writes a ledger entry (outcome, driver, material destroyed/taken/restored).'
  ],
  units:'Simulation is 2D top-down in "px": x right, y down, heading angle in radians (0 = +x). A donor car is ~87×100 px. For 3D use 1 world unit = 40 px and map (x, y) → (x, z); height is z-up in px inside the rig planner.'
 },

 /* Bible forms. status: IMPLEMENTED = this kit runs it; VISION = designed, not built yet. */
 forms:[
  {id:'scout',name:'Scout / Extractor',status:'IMPLEMENTED',role:'Wakes from a rooftop nest, locks a donor, runs READ→ANCHOR→RELEASE→REFRAME. Programmed for extraction; does NOT wait for occupants.'},
  {id:'roadframe',name:'Roadframe',status:'IMPLEMENTED',role:'What the Scout becomes after REFRAME: core + donor chassis spine + donor panels as armor + 4 legs whose feet are the donor\'s wheels. Crawls (legs) or rolls (wheels).'},
  {id:'crawler',name:'Crawler',status:'VISION',role:'Small fast scout through streets and machinery.'},
  {id:'interceptor',name:'Interceptor',status:'PARTIAL',role:'Catches vehicles / blocks routes. (Kit: traffic donors are tether-locked and stopped.)'},
  {id:'dismantler',name:'Dismantler',status:'PARTIAL',role:'Separates structural components. (Kit: RELEASE LOAD stage.)'},
  {id:'constructor',name:'Constructor',status:'VISION',role:'Rebuilds material into bridges, devices, temporary structures.'},
  {id:'climber',name:'Climber',status:'PARTIAL',role:'Skyscrapers, cranes. (3D: walks over rooftops via a ground-height callback.)'},
  {id:'aquatic',name:'Aquatic ReFramer',status:'VISION',role:'Marine machinery, sealed propulsion.'},
  {id:'sky',name:'Sky ReFramer',status:'VISION',role:'Flight-capable material and propulsion only.'},
  {id:'carrier',name:'Carrier',status:'VISION',role:'Transports salvage and smaller ReFramers.'},
  {id:'racer',name:'Racer',status:'VISION',role:'Built specifically to race human drivers.'},
  {id:'guardian',name:'Guardian',status:'VISION',role:'Protects infrastructure or communities (ally).'},
  {id:'experimental',name:'Experimental',status:'VISION',role:'Combines several forms.'}
 ],

 /* Encounter stages in order. dur = seconds. playerCan = what the player may do. */
 stages:[
  {id:'drop',label:'DROP',dur:.7,hint:'A ReFramer dropped off a rooftop. Get close.',playerCan:['pulse → stagger']},
  {id:'seek',label:'LOCK',dur:null,hint:'It is locking a donor car. Get there first.',playerCan:['rescue driver','pulse → stagger']},
  {id:'read',label:'READ',dur:2.4,hint:'READ • drive straight through the cyan scan to reset it.',playerCan:['drive through scan → reset (once per pass)','rescue driver','pulse → stagger']},
  {id:'anchor',label:'ANCHOR',dur:2.6,hint:'ANCHOR • snap both outriggers on ONE side (one clean pass) to tip it.',playerCan:['snap outriggers → topple','rescue driver','pulse → stagger']},
  {id:'release',label:'RELEASE',dur:2.4,hint:'RELEASE • it is opening the car. Tip it or pulse it before parts leave.',playerCan:['snap outriggers → topple','pulse → stagger']},
  {id:'reframe',label:'REFRAME',dur:3.6,hint:'REFRAME • pulse now: parts in the air drop as salvage.',playerCan:['pulse → in-flight parts drop + stagger']},
  {id:'recover',label:'RECOVER',dur:1.4,hint:'It is standing up on the car\'s own wheels. Line up a ram.',playerCan:['ram','pulse → stun']},
  {id:'chase',label:'HUNT',dur:null,hint:'HUNT • ram it head-on to tear parts off. Caught from behind = grabbed. Pulse = stun.',playerCan:['ram → knock parts off','pulse → stun','escape']},
  {id:'stagger',label:'STAGGER',dur:2.4,hint:'STAGGERED • ram it or pulse now to shut it down.',playerCan:['ram or pulse → disable'],aside:true},
  {id:'stun',label:'STUN',dur:3.0,hint:'STUNNED • every ram tears off extra parts.',playerCan:['ram (+1 part)','pulse → disable'],aside:true},
  {id:'retreat',label:'RETREAT',dur:null,hint:'It is fleeing with the parts • catch it, ram it.',playerCan:['ram','pulse → stun'],aside:true}
 ],

 /* The donor = a car broken into tracked components. local/slot in px; slot r in radians.
    local: where it sits on the car (car-local, forward = −y). slot: where it mounts on the Roadframe. crop: sprite-sheet fractions (optional, 2D art). */
 donor:{
  boxPx:[87.36,99.84],
  totalKg:878,
  parts:[
   {key:'chassis',kind:'chassis',mass:420,cx:.5,cy:.52,slot:[0,4,0],look:'dark ladder frame; becomes the Roadframe spine'},
   {key:'engine',kind:'engine',mass:180,cx:.5,cy:.22,slot:[0,36,0],look:'drivetrain block; Roadframe rear hump'},
   {key:'front',kind:'panel',mass:46,crop:[.22,.02,.79,.33],slot:[0,-50,0],look:'hood + front bumper; Roadframe front shield'},
   {key:'rear',kind:'panel',mass:40,crop:[.22,.68,.79,.99],slot:[0,60,3.14159],look:'trunk + rear bumper/spoiler; back carapace'},
   {key:'roof',kind:'panel',mass:34,crop:[.33,.33,.68,.68],slot:[0,14,0],look:'roof plate; top shell over the core'},
   {key:'doorL',kind:'panel',mass:28,crop:[.22,.33,.33,.68],slot:[-40,-16,-.55],look:'left door; front-left leg armor'},
   {key:'doorR',kind:'panel',mass:28,crop:[.68,.33,.79,.68],slot:[40,-16,.55],look:'right door; front-right leg armor'},
   {key:'glass',kind:'glass',mass:14,cx:.5,cy:.42,look:'shatters during RELEASE (destroyed — logged as loss)'},
   {key:'wheelFL',kind:'wheel',mass:22,cx:.26,cy:.2,slot:[-52,-38,0],look:'becomes a leg foot'},
   {key:'wheelFR',kind:'wheel',mass:22,cx:.74,cy:.2,slot:[52,-38,0],look:'becomes a leg foot'},
   {key:'wheelRL',kind:'wheel',mass:22,cx:.26,cy:.8,slot:[-52,42,0],look:'becomes a leg foot'},
   {key:'wheelRR',kind:'wheel',mass:22,cx:.74,cy:.8,slot:[52,42,0],look:'becomes a leg foot'}
  ],
  reframeOrder:['front','doorL','doorR','rear','roof','wheelFL','wheelFR','wheelRL','wheelRR','engine','chassis'],
  partStates:{car:'attached to donor',transit:'flying to the frame',frame:'mounted on the Roadframe',ground:'loose salvage',carried:'on the player\'s tow line',restoring:'flying back into the car',restored:'back in the car',destroyed:'lost (logged)',taken:'carried into ReFramer Territory (still exists, just not yours)'}
 },

 /* Every rule number. All distances px, speeds px/s, times s. */
 tuning:{
  wake:{range:760,minDist:200,startCooldown:2.5,cooldownAfter:16,retryCooldown:1.5,nestCooldown:55,noDonorCooldown:7,parkedSearch:620,trafficSearch:560,nearPlayerBonusDist:700,nearPlayerBonus:1.5,trafficBonus:1.15},
  seek:{approachDist:80,speed:230,turn:5,timeout:9},
  read:{jamSpeed:45,jamRadius:90,jamBeamWidth:34,jamCooldown:1.6},
  anchor:{mountTime:.55,outriggers:[[-66,-74],[66,-74],[-66,78],[66,78]],toppleSidePairs:[[0,2],[1,3],[0,1],[2,3]],toppleAnyCount:3,hitRadius:50,hitSpeed:55,hitSlowdown:.85},
  release:{glassShatterAt:1.25},
  reframe:{partDelay:.24,partDur:.78,chassisDur:.6,arcHeight:46,chassisArc:14},
  rescue:{radius:112,maxSpeed:46,holdTime:1.0,interactMultiplier:1.7,stages:['drop','seek','read','anchor','stagger']},
  stagger:{knockbackDist:92,knockbackSpeed:120,partialRoadframeMinWheels:2},
  contact:{scoutRadius:46,roadframeRadius:56,ramSpeed:70,staggerRamSpeed:60,bounce:.35,hitCooldown:.35,grabLockoutAfterRam:.9,
   recoilBase:150,recoilImpact:.5,recoilTime:.75,heavyImpact:240,destroyImpact:330,stunExtraParts:1,
   ramPlayerSlow:.55,staggerRamPlayerSlow:.6,grabCooldown:1.7,grabPlayerSlow:.32,grabNitroDrain:18},
  collapse:{maxWheels:1,minIntegrity:.5},
  chase:{integrityBase:.55,integrityScale:.45,leadTime:.38,rollIfFartherThan:230,rollSpeed:300,retreatRollSpeed:255,crawlSpeed:180,turnRate:2.5,rollAccel:1.8,crawlAccel:3.2,
   escapeDist:1150,escapeTime:4,chaseBudget:45,grabLimit:4,exitReach:40,boundsMargin:40},
  salvage:{heavyKinds:['chassis','engine'],heavyMaxSpeed:170,lightMaxSpeed:330,magnetRadius:100,magnetSpeed:320,pickupRadius:42,chassisPickupRadius:52},
  repair:{radius:115,maxSpeed:30,holdTime:1.3,interactMultiplier:1.8,partDelay:.26,partDur:.5,repairedThreshold:.9},
  gallium:{pulseRange:260,pulseCost:25,residueRate:.6,residuePickupRadius:48,cityReserve:400},
  traffic:{releaseDelayClean:2.2,releaseDelayRepaired:1.6}
 },

 outcomes:{
  'CLEAN SAVE':'Disabled before any component left the car (glass may be lost).',
  'DISABLED':'Roadframe collapsed; parts are on the street — salvage them.',
  'REPAIRED':'Rebuilt at the donor site to ≥90% original material.',
  'PATCHED':'Rebuilt with less than 90% original material.',
  'LOST':'It escaped to ReFramer Territory with parts (state "taken").',
  'ABORTED':'Not enough material to finish — it fled with what it had.',
  'INTERRUPTED':'Session closed mid-encounter.'
 },
 ledgerEntry:{id:'E1',donor:'P1',source:'parked|traffic',nest:'N1',start:0,end:0,outcome:'ACTIVE',occupant:'none|inside|rescued|shaken',restoredPct:null,destroyedKg:0,takenKg:0,galliumSpent:0,rams:0,knocked:0,notes:['12s Woke at N1 • donor P1 (parked)']},

 /* Events the engine emits from step()/pulse(). The host game decides what each one looks/sounds like. */
 events:{
  toast:'{t,msg,s} on-screen message for s seconds',
  sfx:'{t,k} sound cue key — see audio',
  fx:'{t,x,y,c,n,v} particle burst at (x,y), color c, count n, speed v',
  shake:'{t,a} camera shake amplitude (px-ish)',
  player:'{t,mul?,push?{x,y},nrm?{x,y},e?,nitro?} apply to the player car: multiply velocity by mul; move by push; remove velocity along nrm (bounce e); add nitro',
  gallium:'{t,amount} give the player Gallium charge',
  rep:'{t,k,v} reputation change (rescue/shaken/repair)',
  save:'{t} good moment to autosave',
  focus:'{t} camera may frame the encounter',
  trafficTaken:'{t} a traffic car became a donor (engine already spliced it out of your traffic array) — respawn one later',
  releaseTraffic:'{t,donor} a saved/repaired traffic donor may drive away — re-add it to traffic'
 },

 /* Render-agnostic body plan used by the rig planner. px; z = up. */
 rig:{
  arms:8, armBaseAngles:'i*2π/8 + 2π/16 (relative to heading)', legArms:[0,2,4,6],
  scout:{segLen:[31,27,22],segRadius:[3.6,3,2.4],reach:60,rootRadius:17,bodyZ:50,coreRadius:25},
  roadframe:{segLen:[40,36,30],segRadius:[4.8,4,3],reach:84,rootRadius:21,bodyZ:64,coreScale:1.25},
  gait:{strideBase:26,stridePerSpeed:.07,stepDur:.15,heavyStepDur:.2,stepLift:16,heavyStepLift:22,lead:.16,rule:'alternating parity groups: an arm may step only if no arm of the other parity is mid-step'},
  onCarZ:38, clampPoints:[[-24,-40],[24,-40],[-24,40],[24,40]], dropFromZ:160, disabledZ:22,
  partZ:{car:{chassis:12,engine:20,front:25,rear:25,roof:40,doorL:22,doorR:22,glass:36,wheel:13},frame:{chassis:38,engine:56,front:46,rear:46,roof:82,doorL:42,doorR:42,wheel:16},ground:{wheel:13,other:3}},
  palette:{body:'#1c2130',plate:'#5a6478',joint:'#b464ff',jointDead:'#221d2c',eye:'#ff3030',eyeStun:'#9fe8ff',claw:'#c9b6ff',scan:'#7df8e8',outrigger:'#ffcf7a',release:'#ff7fb8',gallium:'#adc1ff',salvage:'#ffd29a',rebuild:'#9effeb',territory:'#c55cff'}
 },

 audio:{
  wake:'saw 55→140Hz .7s + square 220→110Hz .3s (delay .3)', scan:'sine 1400→1900 .12s, then 1900→1400', jam:'noise bp3200 .25s + square 300→90',
  anchor:'two square clanks 90→60 / 80→55', snap:'noise bp1800 .12s + triangle 500→120', stagger:'saw 260→60 .5s', hydraulic:'noise bp900 .7s',
  glass:'noise bp5200 .35s', reframe:'saw 120→520 1.6s', lock:'square 600→420 .06s', online:'triangle chord 220/277/330',
  grab:'square 70→45 + noise bp400', clank:'square 140→70 + noise bp2600', collapse:'saw 160→35 .9s + noise bp600', stun:'sine 900→300 + noise bp4000',
  pickup:'triangle 700→1100 .09s', repair:'arpeggio 330/415/494/660', rescue:'triangle 520 then 780', servoLoop:'saw through lowpass; freq 55 + botSpeed*.35 (+40 rolling, +60 reframing); gain falls off over 900px'
 },

 controls:{pulse:'Gamepad A / key E', interact:'Gamepad X / key F (rescue, rebuild — also works by just stopping)', note:'Xbox-style baseline, no L3/R3.'},

 tests:'ReframerKit.selfTest() — 16 checks. Expect 16/16 after any transplant; rerun after editing DATA.'
};
/* ===================== 2. ENGINE — pure simulation, no DOM. Deterministic per seed + inputs. ===================== */
/* WIR • REFRAMER RUSH • ReFramer Encounter Engine v0.4
   Pure simulation: no DOM, no canvas. Deterministic for a given seed + input stream.
   Every donor component is a tracked object; mass is conserved across states. */
function makeReframerEngine(DATA){
'use strict';
const T=DATA.tuning;
const TAU=Math.PI*2,C=(n,a,b)=>Math.max(a,Math.min(b,n)),D=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const lerp=(a,b,t)=>a+(b-a)*t, ease=t=>{t=C(t,0,1);return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;};
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const CW=DATA.donor.boxPx[0],CH=DATA.donor.boxPx[1];
const DUR={};for(const s of DATA.stages)if(s.dur!=null)DUR[s.id]=s.dur;
const STAGE_ORDER=['seek','read','anchor','release','reframe','recover','chase'];
const TEMPLATE=DATA.donor.parts.map(p=>({...p,slot:p.slot&&p.slot[2]===3.14159?[p.slot[0],p.slot[1],Math.PI]:p.slot}));
const TOTAL=TEMPLATE.reduce((s,p)=>s+p.mass,0);
const REFRAME_ORDER=DATA.donor.reframeOrder;
const HEAVY=T.salvage.heavyKinds;
function rng(seed){let s=seed|0||1;return ()=>{s=(Math.imul(s,1664525)+1013904223)|0;return (s>>>0)/4294967296;};}
function toWorld(ox,oy,h,lx,ly){const a=h-Math.PI/2,c=Math.cos(a),s=Math.sin(a);return {x:ox+lx*c-ly*s,y:oy+lx*s+ly*c};}
function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1,t=C(((px-ax)*dx+(py-ay)*dy)/l,0,1);return D(px,py,ax+dx*t,ay+dy*t);}

function makeParts(donor){return TEMPLATE.map(t=>{
 const cx=t.crop?(t.crop[0]+t.crop[2])/2:t.cx,cy=t.crop?(t.crop[1]+t.crop[3])/2:t.cy;
 return {id:donor.id+':'+t.key,key:t.key,kind:t.kind,mass:t.mass,crop:t.crop||null,local:{x:(cx-.5)*CW,y:(cy-.5)*CH},slot:t.slot?{x:t.slot[0],y:t.slot[1],r:t.slot[2]}:null,
  state:'car',x:donor.x,y:donor.y,r:donor.angle,z:0,vx:0,vy:0,vz:0,vr:0,open:0,t:0,delay:0,dur:0,from:null,carryIndex:0};});}

function create(o){o=o||{};return {
 version:'0.4',time:0,rnd:rng(o.seed||7151),
 nests:(o.nests||[]).map((n,i)=>({id:'N'+(i+1),x:n.x,y:n.y,cool:o.nestCool!=null?o.nestCool:(i===0?0:5+i*3)})),
 parked:(o.parked||[]).map(d=>({id:d.id,x:d.x,y:d.y,angle:d.angle!=null?d.angle:Math.PI/2,skin:d.skin|0,occupant:!!d.occupant,status:d.status||'intact',source:'parked'})),
 enc:null,history:[],items:[],ledger:[],cooldown:o.cooldown!=null?o.cooldown:T.wake.startCooldown,nextId:1,carrySlots:0,
 gallium:{spent:0,recovered:0,cityReserve:o.reserve!=null?o.reserve:T.gallium.cityReserve,cityDrawn:0},
 stats:{encounters:0,clean:0,repaired:0,patched:0,lost:0,aborted:0,rescued:0,shaken:0,salvaged:0,destroyedKg:0,rams:0,jams:0,outriggers:0},
 wakeRange:o.wakeRange||T.wake.range,exits:o.exits||null,repairT:0,stillT:0,rescueT:0
};}

function ledgerFor(w,enc){return w.ledger.find(l=>l.id===enc.id);}
function note(w,enc,msg){const l=ledgerFor(w,enc);if(l)l.notes.push(Math.round(w.time)+'s '+msg);}

function wake(w,inp,ev,force){
 let nest=null;
 if(force&&force.nest!=null)nest=w.nests[force.nest];
 else{let best=1e9;for(const n of w.nests){if(n.cool>0)continue;const d=D(n.x,n.y,inp.px,inp.py);if(d>T.wake.minDist&&d<w.wakeRange&&d<best){best=d;nest=n;}}}
 if(!nest)return false;
 let cands=[];
 for(const d of w.parked)if(d.status==='intact'&&D(d.x,d.y,nest.x,nest.y)<T.wake.parkedSearch)cands.push({type:'parked',ref:d,x:d.x,y:d.y});
 if(inp.traffic)for(const t of inp.traffic)if(!t.held&&D(t.x,t.y,nest.x,nest.y)<T.wake.trafficSearch)cands.push({type:'traffic',ref:t,x:t.x,y:t.y});
 if(force&&force.donor){const f=force.donor;cands=cands.filter(c=>c.ref===f||c.ref.id===f||c.ref.id===f.id);}
 if(!cands.length){nest.cool=T.wake.noDonorCooldown;return false;}
 let pick=null,score=-1;
 for(const c of cands){const s=TOTAL/(D(c.x,c.y,nest.x,nest.y)+150)*(D(c.x,c.y,inp.px,inp.py)<T.wake.nearPlayerBonusDist?T.wake.nearPlayerBonus:1)*(c.type==='traffic'?T.wake.trafficBonus:1);if(s>score){score=s;pick=c;}}
 let donor;
 if(pick.type==='traffic'){const t=pick.ref;t.held=true;const i=inp.traffic.indexOf(t);if(i>=0)inp.traffic.splice(i,1);
  donor={id:'T'+(w.nextId),x:t.x,y:t.y,angle:t.angle,skin:t.skin|0,occupant:true,status:'held',source:'traffic',origin:{vertical:t.vertical,dir:t.dir,speed:t.speed}};ev.push({t:'trafficTaken'});}
 else{donor=pick.ref;donor.status='held';}
 const id='E'+(w.nextId++);
 const bot={x:nest.x,y:nest.y,h:Math.atan2(donor.y-nest.y,donor.x-nest.x),vx:0,vy:0,mode:'drop',t:0,lift:1,prev:null,
  outriggers:[],integrity:1,frameInit:0,wheelsIn:0,pulses:0,grabCd:0,hitCd:0,jamCd:0,farT:0,chaseT:0,roll:false,approach:null,shake:0,nest:nest.id};
 const enc={id,nest:nest.id,donor,bot,parts:makeParts(donor),stage:'drop',jams:0,occupant:donor.occupant?'inside':'none',ended:false,released:false,cleanEligible:true};
 for(const p of enc.parts){syncCarPart(enc,p);}
 w.enc=enc;nest.cool=T.wake.nestCooldown;w.stats.encounters++;
 w.ledger.push({id,donor:donor.id,source:donor.source,skin:donor.skin,nest:nest.id,start:+w.time.toFixed(1),outcome:'ACTIVE',occupant:enc.occupant,restoredPct:null,destroyedKg:0,takenKg:0,galliumSpent:0,rams:0,notes:[]});
 note(w,enc,'Woke at '+nest.id+' • donor '+donor.id+(donor.occupant?' (occupied)':' (parked)'));
 ev.push({t:'toast',msg:'REFRAMER WAKE • '+nest.id+' • LOCKING DONOR '+donor.id+(donor.occupant?' • DRIVER INSIDE':''),s:3.4},{t:'sfx',k:'wake'},{t:'focus'});
 return true;
}
function syncCarPart(enc,p){const d=enc.donor,q=toWorld(d.x,d.y,d.angle,p.local.x,p.local.y);p.x=q.x;p.y=q.y;p.r=d.angle;p.z=0;}
function slotWorld(bot,p){const q=toWorld(bot.x,bot.y,bot.h,p.slot.x,p.slot.y);return {x:q.x,y:q.y,r:bot.h+p.slot.r};}
function frameStats(enc){let k=0,wh=0,ch=false;for(const p of enc.parts)if(p.state==='frame'){if(p.kind==='chassis')ch=true;else k+=p.mass;if(p.kind==='wheel')wh++;}return {knock:k,wheels:wh,chassis:ch};}

function setMode(enc,m){enc.bot.mode=m;enc.bot.t=0;if(STAGE_ORDER.includes(m)||m==='drop')enc.stage=m;}
function stagger(w,enc,ev,why){const b=enc.bot;b.prev=b.mode;b.mode='stagger';b.t=0;b.lift=0;b.outriggers=[];
 const d=enc.donor,a=Math.atan2(b.y-d.y,b.x-d.x)||0;if(D(b.x,b.y,d.x,d.y)<70){b.x=d.x+Math.cos(a)*T.stagger.knockbackDist;b.y=d.y+Math.sin(a)*T.stagger.knockbackDist;}
 b.vx=Math.cos(a)*T.stagger.knockbackSpeed;b.vy=Math.sin(a)*T.stagger.knockbackSpeed;
 for(const p of enc.parts)if(p.state==='car')p.open=Math.min(p.open,.6);
 ev.push({t:'toast',msg:why+' • STAGGERED — RAM IT OR PULSE NOW',s:2.6},{t:'sfx',k:'stagger'},{t:'fx',x:b.x,y:b.y,c:'#c79bff',n:18,v:140},{t:'shake',a:5});}

function scatter(w,p,ox,oy,power){const a=Math.atan2(p.y-oy,p.x-ox)+(w.rnd()-.5)*1.3,v=power*(.6+w.rnd()*.6);p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.vz=180+w.rnd()*160;p.z=Math.max(p.z,6);p.vr=(w.rnd()-.5)*9;}

function endEncounter(w,enc,outcome,ev){
 enc.ended=true;const l=ledgerFor(w,enc);
 const allCar=enc.parts.every(p=>p.state==='car'||p.state==='destroyed');
 if(outcome==='DISABLED'&&allCar){outcome='CLEAN SAVE';enc.donor.status='saved';w.stats.clean++;
  for(const p of enc.parts)if(p.state==='car')p.open=0;
  if(enc.donor.source==='traffic'){enc.releaseAt=w.time+T.traffic.releaseDelayClean;}
  ev.push({t:'toast',msg:'CLEAN SAVE • DONOR '+enc.donor.id+' KEPT WHOLE',s:3.2},{t:'save'});}
 else if(outcome==='DISABLED'){enc.donor.status='stripped';ev.push({t:'toast',msg:'ROADFRAME DOWN • SALVAGE THE PARTS • REBUILD AT ◎ '+enc.donor.id,s:3.6},{t:'save'});}
 else if(outcome==='LOST'){enc.donor.status='lost';w.stats.lost++;ev.push({t:'toast',msg:'LOST • '+enc.donor.id+' CARRIED INTO REFRAMER TERRITORY',s:3.4},{t:'save'});}
 else if(outcome==='ABORTED'){enc.donor.status='stripped';w.stats.aborted++;ev.push({t:'toast',msg:'NOT ENOUGH MATERIAL • REFRAMER ABORTED AND FLED',s:3.2},{t:'save'});}
 if(l){l.outcome=outcome;l.end=+w.time.toFixed(1);l.occupant=enc.occupant;l.takenKg=enc.parts.filter(p=>p.state==='taken').reduce((s,p)=>s+p.mass,0);l.destroyedKg=enc.parts.filter(p=>p.state==='destroyed').reduce((s,p)=>s+p.mass,0);}
 const residue=Math.round(enc.bot.pulses*T.gallium.pulseCost*T.gallium.residueRate);
 if(residue>0&&outcome!=='LOST'&&outcome!=='ABORTED')w.items.push({kind:'gallium',x:enc.bot.x,y:enc.bot.y,amount:residue,enc:enc.id});
 else if(residue>0)w.gallium.lostResidue=(w.gallium.lostResidue||0)+residue;
 w.history.push(enc);w.enc=null;w.cooldown=T.wake.cooldownAfter;
}

function pickExit(w,enc,inp){const ex=w.exits&&w.exits.length?w.exits:[{x:enc.donor.x,y:enc.donor.y-1400,name:'north'}];let best=null,bd=-1;for(const e of ex){const s=D(e.x,e.y,inp.px,inp.py)-.5*D(e.x,e.y,enc.bot.x,enc.bot.y);if(s>bd){bd=s;best=e;}}enc.exit={x:best.x,y:best.y,name:best.name||'gate'};}
function collapse(w,enc,ev,how){const b=enc.bot;b.mode='disabled';b.t=0;b.lift=0;b.roll=false;
 for(const p of enc.parts)if(p.state==='frame'||p.state==='transit'){p.state='ground';scatter(w,p,b.x,b.y,p.kind==='chassis'?20:150);}
 ev.push({t:'fx',x:b.x,y:b.y,c:'#b3f9ed',n:30,v:160},{t:'sfx',k:'collapse'},{t:'shake',a:9});
 note(w,enc,'Disabled by '+how);endEncounter(w,enc,'DISABLED',ev);}

function knock(w,enc,ev,cx,cy,n,impact){
 const b=enc.bot;let done=0;
 for(let k=0;k<n;k++){
  let pool=enc.parts.filter(p=>p.state==='frame'&&(p.kind==='panel'||p.kind==='wheel'));
  if(!pool.length)pool=enc.parts.filter(p=>p.state==='frame'&&p.kind==='engine');
  if(!pool.length)break;
  let pick=null,best=1e9;for(const p of pool){const s=slotWorld(b,p),d=D(s.x,s.y,cx,cy);if(d<best){best=d;pick=p;}}
  const s=slotWorld(b,pick);pick.x=s.x;pick.y=s.y;pick.r=s.r;
  if(impact>T.contact.destroyImpact&&k===0&&pick.kind!=='engine'){pick.state='destroyed';w.stats.destroyedKg+=pick.mass;ev.push({t:'fx',x:s.x,y:s.y,c:'#ffb36b',n:22,v:200},{t:'toast',msg:pick.key.toUpperCase()+' DESTROYED IN IMPACT • −'+pick.mass+' KG',s:2});note(w,enc,pick.key+' destroyed ('+Math.round(impact)+' impact)');}
  else{pick.state='ground';scatter(w,pick,b.x,b.y,190);ev.push({t:'fx',x:s.x,y:s.y,c:'#ffd29a',n:12,v:150});}
  done++;
 }
 {const l=ledgerFor(w,enc);if(l)l.knocked=(l.knocked||0)+done;}
 const fs=frameStats(enc);b.wheelsIn=fs.wheels;b.integrity=b.frameInit?fs.knock/b.frameInit:0;
 if(done)ev.push({t:'sfx',k:'clank'});
 if(b.wheelsIn<=T.collapse.maxWheels||b.integrity<=T.collapse.minIntegrity)collapse(w,enc,ev,'impacts');
 return done;}

function contact(w,enc,inp,ev){
 const b=enc.bot,d=D(b.x,b.y,inp.px,inp.py),R=['chase','recover','stun','retreat','stagger'].includes(b.mode)?T.contact.roadframeRadius:T.contact.scoutRadius;
 if(d>=R||d<1)return;
 const nx=(b.x-inp.px)/d,ny=(b.y-inp.py)/d,pAp=inp.pvx*nx+inp.pvy*ny,bAp=-(b.vx*nx+b.vy*ny);
 const rammed=['chase','recover','stun','retreat','stagger'].includes(b.mode)&&pAp>(b.mode==='stagger'?T.contact.staggerRamSpeed:T.contact.ramSpeed)&&(b.mode==='stagger'||b.hitCd<=0);
 ev.push({t:'player',push:{x:-nx*(R-d+2),y:-ny*(R-d+2)},nrm:{x:nx,y:ny},e:rammed?T.contact.bounce:0});
 if(b.mode==='stagger'){if(pAp>T.contact.staggerRamSpeed){ev.push({t:'player',mul:T.contact.staggerRamPlayerSlow},{t:'shake',a:7});w.stats.rams++;const l=ledgerFor(w,enc);if(l)l.rams++;
   for(const p of enc.parts)if(p.state==='transit'){p.state='ground';scatter(w,p,b.x,b.y,120);}collapse(w,enc,ev,'ram while staggered');}return;}
 if(b.mode==='disabled')return;
 if(['chase','recover','stun','retreat'].includes(b.mode)){
  if(pAp>T.contact.ramSpeed&&b.hitCd<=0){const impact=pAp+Math.max(0,bAp);b.hitCd=T.contact.hitCooldown;b.grabCd=Math.max(b.grabCd,T.contact.grabLockoutAfterRam);w.stats.rams++;const l=ledgerFor(w,enc);if(l)l.rams++;
   b.vx=nx*(T.contact.recoilBase+impact*T.contact.recoilImpact);b.vy=ny*(T.contact.recoilBase+impact*T.contact.recoilImpact);b.recoil=T.contact.recoilTime;ev.push({t:'player',mul:T.contact.ramPlayerSlow},{t:'shake',a:6});
   knock(w,enc,ev,inp.px+nx*30,inp.py+ny*30,(b.mode==='stun'?1+T.contact.stunExtraParts:1)+(impact>T.contact.heavyImpact?1:0),impact);}
  else if(b.grabCd<=0&&b.mode!=='stun'){b.grabCd=T.contact.grabCooldown;b.grabs=(b.grabs||0)+1;ev.push({t:'player',mul:T.contact.grabPlayerSlow,nitro:-T.contact.grabNitroDrain},{t:'shake',a:8},{t:'sfx',k:'grab'},{t:'toast',msg:'GRABBED • RAM ITS LEGS — DON\'T LET IT HUG YOU',s:2});note(w,enc,'Grabbed player');}
 }
}

function stepEnc(w,enc,inp,dt,ev){
 const b=enc.bot,d=enc.donor;b.t+=dt;b.grabCd-=dt;b.hitCd-=dt;b.jamCd-=dt;
 const pSpeed=Math.hypot(inp.pvx,inp.pvy),pd=D(inp.px,inp.py,d.x,d.y);
 // occupant rescue (any time before the body opens)
 if(enc.occupant==='inside'&&T.rescue.stages.includes(b.mode)){
  if(pd<T.rescue.radius&&pSpeed<T.rescue.maxSpeed){w.rescueT+=dt*(inp.interact?T.rescue.interactMultiplier:1);if(w.rescueT>T.rescue.holdTime){enc.occupant='rescued';w.stats.rescued++;w.rescueT=0;note(w,enc,'Occupant rescued');ev.push({t:'toast',msg:'DRIVER RESCUED • THEY\'RE IN YOUR PASSENGER SEAT',s:2.8},{t:'sfx',k:'rescue'},{t:'rep',k:'rescue',v:1});}}
  else w.rescueT=Math.max(0,w.rescueT-dt);
 }
 const toward=(tx,ty,spd,turn)=>{const a=Math.atan2(ty-b.y,tx-b.x);b.h+=C(angDiff(b.h,a),-turn*dt,turn*dt);const dd=D(b.x,b.y,tx,ty),v=Math.min(spd,dd/Math.max(dt,1e-3));b.vx=Math.cos(b.h)*v;b.vy=Math.sin(b.h)*v;b.x+=b.vx*dt;b.y+=b.vy*dt;return dd;};
 switch(b.mode){
 case 'drop':b.lift=1-ease(b.t/DUR.drop);if(b.t>=DUR.drop){b.lift=0;setMode(enc,'seek');}break;
 case 'seek':{const a=Math.atan2(b.y-d.y,b.x-d.x);if(!b.approach)b.approach={x:d.x+Math.cos(a)*T.seek.approachDist,y:d.y+Math.sin(a)*T.seek.approachDist};
  const dd=toward(b.approach.x,b.approach.y,T.seek.speed,T.seek.turn);if(dd<6||b.t>T.seek.timeout){b.x=b.approach.x;b.y=b.approach.y;b.vx=b.vy=0;b.h=Math.atan2(d.y-b.y,d.x-b.x);setMode(enc,'read');ev.push({t:'toast',msg:'READ • DRIVE THROUGH THE SCAN TO JAM IT',s:2.4},{t:'sfx',k:'scan'});}break;}
 case 'read':{b.vx=b.vy=0;b.h+=angDiff(b.h,Math.atan2(d.y-b.y,d.x-b.x))*Math.min(1,dt*6);
  if(pSpeed>T.read.jamSpeed&&b.jamCd<=0&&(pd<T.read.jamRadius||segDist(inp.px,inp.py,b.x,b.y,d.x,d.y)<T.read.jamBeamWidth)){b.t=0;enc.jams++;w.stats.jams++;b.jamCd=T.read.jamCooldown;note(w,enc,'Scan jammed');ev.push({t:'toast',msg:'SCAN JAMMED ×'+enc.jams+' • READ RESET',s:1.8},{t:'sfx',k:'jam'},{t:'fx',x:d.x,y:d.y,c:'#7df8e8',n:12,v:110});}
  if(b.t>=DUR.read){setMode(enc,'anchor');b.outriggers=T.anchor.outriggers.map(o=>{const q=toWorld(d.x,d.y,d.angle,o[0],o[1]);return {x:q.x,y:q.y,ok:true};});
   b.from={x:b.x,y:b.y};ev.push({t:'toast',msg:'ANCHOR • SNAP BOTH OUTRIGGERS ON ONE SIDE TO TIP IT',s:2.6},{t:'sfx',k:'anchor'});}break;}
 case 'anchor':case 'release':{
  if(b.mode==='anchor'&&b.from){const k=ease(b.t/T.anchor.mountTime);b.x=lerp(b.from.x,d.x,k);b.y=lerp(b.from.y,d.y,k);b.lift=k;b.h+=angDiff(b.h,d.angle)*Math.min(1,dt*5);}
  for(const o of b.outriggers)if(o.ok&&pSpeed>T.anchor.hitSpeed&&D(inp.px,inp.py,o.x,o.y)<T.anchor.hitRadius){o.ok=false;w.stats.outriggers++;ev.push({t:'fx',x:o.x,y:o.y,c:'#e9c6ff',n:14,v:150},{t:'sfx',k:'snap'},{t:'player',mul:T.anchor.hitSlowdown},{t:'toast',msg:'OUTRIGGER SNAPPED • TAKE THE OTHER LEG ON THAT SIDE',s:1.6});}
  {const O=b.outriggers,x=i=>O[i]&&!O[i].ok;if(O.length&&(T.anchor.toppleSidePairs.some(([a,c])=>x(a)&&x(c))||O.filter(o=>!o.ok).length>=T.anchor.toppleAnyCount)){note(w,enc,'Toppled via outriggers');stagger(w,enc,ev,'TIPPED OVER');break;}}
  if(b.mode==='anchor'&&b.t>=DUR.anchor){setMode(enc,'release');b.from=null;
   if(enc.occupant==='inside'){enc.occupant='shaken';w.stats.shaken++;note(w,enc,'Unsafe release: occupant thrown clear');ev.push({t:'toast',msg:'UNSAFE REFRAME • DRIVER THROWN CLEAR — SHAKEN',s:2.6},{t:'rep',k:'shaken',v:-1});}
   ev.push({t:'sfx',k:'hydraulic'});}
  if(b.mode==='release'){const k=b.t/DUR.release;b.shake=.6+k;
   for(const p of enc.parts)if(p.state==='car'&&(p.kind==='panel'||p.kind==='wheel'))p.open=ease(k);
   const g=enc.parts.find(p=>p.key==='glass');if(g&&g.state==='car'&&b.t>T.release.glassShatterAt){g.state='destroyed';w.stats.destroyedKg+=g.mass;ev.push({t:'fx',x:g.x,y:g.y,c:'#cfe9ff',n:20,v:120},{t:'sfx',k:'glass'});note(w,enc,'Glass shattered');}
   if(b.t>=DUR.release){setMode(enc,'reframe');b.shake=0;b.lift=0;b.x=d.x;b.y=d.y;b.h=d.angle;
    REFRAME_ORDER.forEach((key,i)=>{const p=enc.parts.find(q=>q.key===key);if(!p||p.state!=='car')return;p.state='transit';p.from={x:p.x,y:p.y,r:p.r};p.delay=i*T.reframe.partDelay;p.dur=p.kind==='chassis'?T.reframe.chassisDur:T.reframe.partDur;p.t=0;});
    enc.cleanEligible=false;ev.push({t:'toast',msg:'REFRAME • PULSE NOW TO DROP PARTS MID-AIR',s:2.4},{t:'sfx',k:'reframe'});}}
  break;}
 case 'reframe':{let pending=0;
  for(const p of enc.parts)if(p.state==='transit'){p.t+=dt;const k=ease((p.t-p.delay)/p.dur);if(p.t<p.delay){pending++;continue;}
   const s=slotWorld(b,p);p.x=lerp(p.from.x,s.x,k);p.y=lerp(p.from.y,s.y,k);p.r=p.from.r+angDiff(p.from.r,s.r)*k;p.z=Math.sin(Math.PI*k)*(p.kind==='chassis'?T.reframe.chassisArc:T.reframe.arcHeight);
   if(k>=1){p.state='frame';p.z=0;ev.push({t:'sfx',k:'lock'});}else pending++;}
  if(!pending&&b.t>=DUR.reframe){const fs=frameStats(enc);b.frameInit=fs.knock;b.wheelsIn=fs.wheels;b.integrity=1;setMode(enc,'recover');ev.push({t:'toast',msg:'ROADFRAME '+enc.id+' ASSEMBLED FROM '+d.id+' • '+Math.round(fs.knock+(fs.chassis?TEMPLATE.filter(q=>q.kind==='chassis').reduce((s,q)=>s+q.mass,0):0))+' KG',s:2.6},{t:'sfx',k:'online'});}
  break;}
 case 'recover':b.vx=b.vy=0;if(b.t>=DUR.recover){setMode(enc,'chase');ev.push({t:'toast',msg:'IT\'S HUNTING YOU • RAM THE LEGS • PULSE TO STUN',s:2.8});}break;
 case 'chase':case 'retreat':{b.chaseT+=dt;const fs=frameStats(enc);
  const f=T.chase.integrityBase+T.chase.integrityScale*b.integrity,dist=D(b.x,b.y,inp.px,inp.py);
  let tx,ty;if(b.mode==='chase'){tx=inp.px+inp.pvx*T.chase.leadTime;ty=inp.py+inp.pvy*T.chase.leadTime;}else{if(!enc.exit)pickExit(w,enc,inp);tx=enc.exit.x;ty=enc.exit.y;}
  if(b.recoil>0){b.recoil-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.exp(-3.5*dt);b.vy*=Math.exp(-3.5*dt);b.roll=false;break;}
  b.roll=fs.wheels>=2&&(b.mode==='retreat'||dist>T.chase.rollIfFartherThan);
  const cap=(b.roll?(b.mode==='retreat'?T.chase.retreatRollSpeed:T.chase.rollSpeed):T.chase.crawlSpeed)*f,ang=Math.atan2(ty-b.y,tx-b.x);b.h+=C(angDiff(b.h,ang),-T.chase.turnRate*dt,T.chase.turnRate*dt);
  const vx=Math.cos(b.h)*cap,vy=Math.sin(b.h)*cap,k=Math.min(1,dt*(b.roll?T.chase.rollAccel:T.chase.crawlAccel));
  b.vx=lerp(b.vx,vx,k);b.vy=lerp(b.vy,vy,k);b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(w.bounds){const m=T.chase.boundsMargin;b.x=C(b.x,m,w.bounds.w-m);b.y=C(b.y,m,w.bounds.h-m);}
  if(b.mode==='chase'){if(dist>T.chase.escapeDist)b.farT+=dt;else b.farT=Math.max(0,b.farT-dt*2);
   if(b.farT>T.chase.escapeTime||b.chaseT>T.chase.chaseBudget||b.grabs>=T.chase.grabLimit){setMode(enc,'retreat');pickExit(w,enc,inp);note(w,enc,b.farT>T.chase.escapeTime?'Player escaped':b.grabs>=T.chase.grabLimit?'Shook the player off':'Chase budget spent');ev.push({t:'toast',msg:'ROADFRAME RETREATING WITH '+d.id+'\'S PARTS • CATCH IT OR LOSE THEM',s:3});}}
  else{if(D(b.x,b.y,enc.exit.x,enc.exit.y)<T.chase.exitReach){for(const p of enc.parts)if(p.state==='frame'||p.state==='transit')p.state='taken';b.mode='gone';note(w,enc,'Escaped to ReFramer Territory via '+enc.exit.name);endEncounter(w,enc,enc.aborting?'ABORTED':'LOST',ev);return;}}
  break;}
 case 'stagger':{b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.exp(-4*dt);b.vy*=Math.exp(-4*dt);
  if(b.t>=DUR.stagger){const from=b.prev;b.prev=null;
   if(from==='reframe'||enc.parts.some(p=>p.state==='frame')){
    for(const p of enc.parts)if(p.state==='transit'){p.state='ground';scatter(w,p,b.x,b.y,80);}
    const fs=frameStats(enc);
    if(fs.chassis&&fs.wheels>=T.stagger.partialRoadframeMinWheels){b.frameInit=Math.max(1,fs.knock);b.integrity=1;b.wheelsIn=fs.wheels;b.mode='recover';b.t=0;enc.stage='recover';ev.push({t:'toast',msg:'PARTIAL ROADFRAME STANDING • '+fs.wheels+' WHEELS',s:2.4});}
    else{b.mode='retreat';b.t=0;enc.stage='chase';pickExit(w,enc,inp);note(w,enc,'Insufficient material — aborting');ev.push({t:'toast',msg:'NOT ENOUGH MATERIAL • IT\'S FLEEING WITH WHAT IT HAS',s:2.6});enc.aborting=true;}
   }else{b.mode='read';b.t=0;enc.stage='read';b.approach=null;const a=Math.atan2(b.y-d.y,b.x-d.x);b.x=d.x+Math.cos(a)*T.seek.approachDist;b.y=d.y+Math.sin(a)*T.seek.approachDist;b.vx=b.vy=0;
    for(const p of enc.parts)if(p.state==='car')p.open=0;ev.push({t:'toast',msg:'FOOTING RECOVERED • RE-READING DONOR',s:2});}
  }break;}
 case 'stun':b.vx*=Math.exp(-6*dt);b.vy*=Math.exp(-6*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.t>=DUR.stun){b.mode=b.prev==='retreat'?'retreat':'chase';b.t=0;b.prev=null;}break;
 }
 if(w.enc!==enc)return;
 // frame parts follow body
 for(const p of enc.parts){if(p.state==='frame'){const s=slotWorld(b,p);p.x=s.x;p.y=s.y;p.r=s.r;}else if(p.state==='car')syncCarPart(enc,p);}
 if(enc.aborting&&b.mode==='retreat'){/* same retreat path */}
 contact(w,enc,inp,ev);
}

function stepLoose(w,inp,dt,ev){
 const pSpeed=Math.hypot(inp.pvx,inp.pvy);
 const all=w.enc?[w.enc,...w.history]:w.history;
 let carried=[];
 for(const enc of all){for(const p of enc.parts){
  if(p.state==='ground'){p.x+=p.vx*dt;p.y+=p.vy*dt;const f=Math.exp(-(p.z>0?.4:3.6)*dt);p.vx*=f;p.vy*=f;p.r+=p.vr*dt;p.vr*=Math.exp(-2.5*dt);
   if(p.z>0||p.vz>0){p.vz-=900*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=p.vz<-160?-p.vz*.3:0;}}
   if(w.bounds){p.x=C(p.x,20,w.bounds.w-20);p.y=C(p.y,20,w.bounds.h-20);}
   const lim=HEAVY.includes(p.kind)?T.salvage.heavyMaxSpeed:T.salvage.lightMaxSpeed,pd2=D(p.x,p.y,inp.px,inp.py);
   if(p.z<8&&pd2<T.salvage.magnetRadius&&pSpeed<lim){const k=Math.min(1,T.salvage.magnetSpeed*dt/Math.max(pd2,1));p.x+=(inp.px-p.x)*k;p.y+=(inp.py-p.y)*k;}
   if(p.z<8&&D(p.x,p.y,inp.px,inp.py)<(p.kind==='chassis'?T.salvage.chassisPickupRadius:T.salvage.pickupRadius)){
    if(pSpeed<lim){p.state='carried';p.carryIndex=w.carrySlots++;w.stats.salvaged++;ev.push({t:'toast',msg:(p.kind==='chassis'?'CHASSIS HOOKED — TOWING ':'SALVAGED ')+p.key.toUpperCase()+' • '+p.mass+' KG',s:1.5},{t:'sfx',k:'pickup'});}
    else if(!p.warned){p.warned=true;ev.push({t:'toast',msg:'TOO FAST TO HOOK THE '+p.key.toUpperCase()+' • UNDER '+Math.round(lim*.43)+' MPH',s:1.6});}
   }}
  else if(p.state==='carried'){p.x=inp.px;p.y=inp.py;p.z=0;carried.push(p);}
  else if(p.state==='restoring'){p.t+=dt;const k=ease((p.t-p.delay)/p.dur);if(p.t>=p.delay){const q=toWorld(enc.donor.x,enc.donor.y,enc.donor.angle,p.local.x,p.local.y);p.x=lerp(p.from.x,q.x,k);p.y=lerp(p.from.y,q.y,k);p.r=p.from.r+angDiff(p.from.r,enc.donor.angle)*k;p.z=Math.sin(Math.PI*k)*40;
    if(k>=1){p.state='restored';p.z=0;p.open=0;ev.push({t:'sfx',k:'lock'},{t:'fx',x:q.x,y:q.y,c:'#9effeb',n:8,v:70});}}}
  else if(p.state==='restored'||(p.state==='car'&&enc.ended))syncCarPart(enc,p);
 }
  // finalize repairs once restoring queue empties
  if(enc.repairing&&!enc.parts.some(p=>p.state==='restoring')){enc.repairing=false;finishRepair(w,enc,ev);}
  if(enc.releaseAt&&w.time>=enc.releaseAt&&!enc.released){enc.released=true;ev.push({t:'releaseTraffic',donor:enc.donor});}
 }
 w.carried=carried;
 // repair trigger
 if(pSpeed<T.repair.maxSpeed&&carried.length){
  let site=null;for(const enc of all){if(!enc.ended||enc.repairing)continue;if(D(enc.donor.x,enc.donor.y,inp.px,inp.py)<T.repair.radius&&carried.some(p=>p.id.startsWith(enc.donor.id+':'))){site=enc;break;}}
  if(site){w.repairT+=dt*(inp.interact?T.repair.interactMultiplier:1);
   if(w.repairT>T.repair.holdTime){w.repairT=0;const mine=carried.filter(p=>p.id.startsWith(site.donor.id+':'));
    const chassisOk=site.parts.some(p=>p.kind==='chassis'&&(p.state==='car'||p.state==='restored'))||mine.some(p=>p.kind==='chassis');
    if(!chassisOk){if(!site.warnChassis){site.warnChassis=true;ev.push({t:'toast',msg:'NO CHASSIS AT THE SITE • TOW IT HERE FIRST',s:2.4});}}
    else{mine.sort((a,b)=>(a.kind==='chassis'?-1:0)-(b.kind==='chassis'?-1:0));mine.forEach((p,i)=>{p.state='restoring';p.from={x:inp.px,y:inp.py,r:p.r};p.t=0;p.delay=i*T.repair.partDelay;p.dur=T.repair.partDur;});site.repairing=true;ev.push({t:'toast',msg:'REBUILDING '+site.donor.id+' • '+mine.length+' PARTS',s:2},{t:'sfx',k:'repair'});}
   }} else w.repairT=Math.max(0,w.repairT-dt);
 } else w.repairT=Math.max(0,w.repairT-dt*2);
 // gallium residue
 for(const it of w.items)if(!it.taken&&D(it.x,it.y,inp.px,inp.py)<T.gallium.residuePickupRadius){it.taken=true;w.gallium.recovered+=it.amount;ev.push({t:'gallium',amount:it.amount},{t:'toast',msg:'GALLIUM RESIDUE RECOVERED +'+it.amount,s:1.8},{t:'sfx',k:'pickup'});}
 w.items=w.items.filter(i=>!i.taken);
 if(!carried.length)w.carrySlots=0;
}

function finishRepair(w,enc,ev){
 const kept=enc.parts.filter(p=>p.state==='car'||p.state==='restored').reduce((s,p)=>s+p.mass,0),pct=kept/TOTAL;
 const l=ledgerFor(w,enc),prev=l?l.outcome:'';
 const status=pct>=T.repair.repairedThreshold?'repaired':'patched';enc.donor.status=status;
 if(l){l.restoredPct=Math.round(pct*100);l.outcome=status==='repaired'?'REPAIRED':'PATCHED';l.notes.push(Math.round(w.time)+'s rebuilt to '+Math.round(pct*100)+'%');}
 if(prev!=='REPAIRED'&&status==='repaired'){w.stats.repaired++;if(prev==='PATCHED')w.stats.patched--;else if(prev==='LOST')w.stats.lost--;}
 else if(status==='patched'&&prev!=='PATCHED'){w.stats.patched++;if(prev==='LOST')w.stats.lost--;}
 if(enc.donor.source==='traffic'&&status==='repaired'&&!enc.released)enc.releaseAt=w.time+T.traffic.releaseDelayRepaired;
 ev.push({t:'toast',msg:(status==='repaired'?'REPAIRED ':'PATCHED ')+enc.donor.id+' • '+Math.round(pct*100)+'% ORIGINAL MATERIAL',s:3},{t:'save'},{t:'rep',k:'repair',v:status==='repaired'?2:1});
}

function step(w,inp,dt){const ev=[];w.time+=dt;
 for(const n of w.nests)n.cool-=dt;
 if(!w.enc){w.cooldown-=dt;if(w.cooldown<=0&&!inp.noWake){if(!wake(w,inp,ev))w.cooldown=1.5;}}
 if(w.enc)stepEnc(w,w.enc,inp,dt,ev);
 stepLoose(w,inp,dt,ev);
 return ev;}

function pulse(w,px,py,cost){cost=cost||T.gallium.pulseCost;const ev=[];w.gallium.spent+=cost;const enc=w.enc;
 if(enc){const l=ledgerFor(w,enc);}
 if(!enc){return {hit:false,ev};}
 const b=enc.bot,R=T.gallium.pulseRange;if(D(b.x,b.y,px,py)>R||b.mode==='disabled'||b.mode==='gone')return {hit:false,ev};
 b.pulses++;const l=ledgerFor(w,enc);if(l)l.galliumSpent+=cost;
 ev.push({t:'fx',x:b.x,y:b.y,c:'#adc1ff',n:24,v:170},{t:'shake',a:6});
 switch(b.mode){
  case 'drop':case 'seek':case 'read':case 'anchor':case 'release':note(w,enc,'Gallium pulse in '+b.mode);stagger(w,enc,ev,'GALLIUM DISRUPTION');break;
  case 'reframe':{let dropped=0;for(const p of enc.parts)if(p.state==='transit'&&p.t>=p.delay){p.state='ground';scatter(w,p,b.x,b.y,130);dropped++;}
   note(w,enc,'Pulse mid-reframe dropped '+dropped+' parts');stagger(w,enc,ev,'REFRAME BROKEN • '+dropped+' PARTS DROPPED');break;}
  case 'stagger':for(const p of enc.parts)if(p.state==='transit'){p.state='ground';scatter(w,p,b.x,b.y,110);}collapse(w,enc,ev,'pulse while staggered');break;
  case 'stun':collapse(w,enc,ev,'second pulse while stunned');break;
  case 'recover':case 'chase':case 'retreat':b.prev=b.mode;b.mode='stun';b.t=0;b.roll=false;note(w,enc,'Stunned by pulse');ev.push({t:'toast',msg:'STUNNED • RAM IT — HITS TEAR OFF EXTRA PARTS',s:2.2},{t:'sfx',k:'stun'});break;
 }
 return {hit:true,ev};}

function drawCity(w,amount){const a=Math.min(amount,w.gallium.cityReserve);w.gallium.cityReserve-=a;w.gallium.cityDrawn+=a;return a;}

function massCheck(w){const all=w.enc?[w.enc,...w.history]:w.history;const by={};let total=0;
 for(const e of all)for(const p of e.parts){by[p.state]=(by[p.state]||0)+p.mass;total+=p.mass;}
 return {ok:total===all.length*TOTAL,total,expected:all.length*TOTAL,byState:by};}

function forceEncounter(w,inp,o){w.cooldown=0;const ev=[];wake(w,inp,ev,o||{});return ev;}

function serialize(w){return {version:'0.4',time:Math.round(w.time),ledger:w.ledger.slice(-40),stats:w.stats,gallium:w.gallium,
 parked:w.parked.map(d=>({id:d.id,status:d.status==='held'?'intact':d.status})),nests:w.nests.map(n=>({id:n.id,cool:Math.max(0,Math.min(40,n.cool))}))};}
function restore(w,s){if(!s||s.version!=='0.4')return false;try{
 if(Array.isArray(s.ledger))w.ledger=s.ledger.map(l=>l.outcome==='ACTIVE'?{...l,outcome:'INTERRUPTED',notes:[...(l.notes||[]),'Session closed mid-encounter']}:l);
 if(s.stats)Object.assign(w.stats,s.stats);if(s.gallium)Object.assign(w.gallium,s.gallium);
 if(Array.isArray(s.parked))for(const p of s.parked){const d=w.parked.find(x=>x.id===p.id);if(d&&['intact','saved','repaired','patched','stripped','lost'].includes(p.status))d.status=p.status==='stripped'||p.status==='lost'?p.status:p.status;}
 if(Array.isArray(s.nests))for(const n of s.nests){const q=w.nests.find(x=>x.id===n.id);if(q)q.cool=+n.cool||0;}
 return true;}catch(e){return false;}}

return {create,step,pulse,massCheck,forceEncounter,serialize,restore,drawCity,toWorld,slotWorld,TEMPLATE,TOTAL,CW,CH,DUR,STAGE_ORDER,DATA};
}
/* ===================== 3. RIG — render-agnostic body planner (8-arm IK + gait). Output in px, z = up. =====================
   Visual only: the simulation never reads it. Call once per rendered frame per visible encounter. */
function makeReframerRig(DATA){
'use strict';
const R=DATA.rig,TAU=Math.PI*2,C=(n,a,b)=>Math.max(a,Math.min(b,n)),D=(a,b,c,d)=>Math.hypot(a-c,b-d),sm=(a,b,t)=>a+(b-a)*C(t,0,1);
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const BASE=[...Array(R.arms)].map((_,i)=>i*TAU/R.arms+TAU/(R.arms*2));
const toWorld=(ox,oy,h,lx,ly)=>{const a=h-Math.PI/2,c=Math.cos(a),s=Math.sin(a);return {x:ox+lx*c-ly*s,y:oy+lx*s+ly*c};};
const slotWorld=(b,p)=>{const q=toWorld(b.x,b.y,b.h,p.slot.x,p.slot.y);return {x:q.x,y:q.y,r:b.h+p.slot.r};};
const v=(x,y,z)=>({x,y,z}),sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z),len=a=>Math.hypot(a.x,a.y,a.z)||1e-6,addS=(a,d,s)=>v(a.x+d.x*s,a.y+d.y*s,a.z+d.z*s),nrm=a=>{const l=len(a);return v(a.x/l,a.y/l,a.z/l);};
function fabrik(root,lens,target,prev){const n=lens.length,total=lens.reduce((a,b)=>a+b,0);let P=prev&&prev.length===n+1?prev.map(p=>({...p})):null;
 if(!P){P=[{...root}];const d=nrm(sub(target,root));for(let i=0;i<n;i++){const q=addS(P[i],d,lens[i]);q.z+=12;P.push(q);}}
 for(let i=1;i<n;i++)P[i].z+=7;// knee arch
 if(len(sub(target,root))>=total){const d=nrm(sub(target,root));P[0]={...root};for(let i=0;i<n;i++)P[i+1]=addS(P[i],d,lens[i]);return P;}
 for(let it=0;it<5;it++){P[n]={...target};for(let i=n-1;i>=0;i--)P[i]=addS(P[i+1],nrm(sub(P[i],P[i+1])),lens[i]);P[0]={...root};for(let i=0;i<n;i++)P[i+1]=addS(P[i],nrm(sub(P[i+1],P[i])),lens[i]);}
 return P;}
const ROADFRAME_MODES=['recover','chase','stun','retreat'];
function isRoadframe(e){const b=e.bot,m=b.mode;return ROADFRAME_MODES.includes(m)||(m==='stagger'&&e.parts.some(p=>p.state==='frame'))||(m==='disabled'&&e.parts.some(p=>p.kind==='chassis'&&p.state==='ground'&&D(p.x,p.y,b.x,b.y)<120));}
/* ctx: {time, player:{x,y}, groundZ?(x,y)→px, nestZ?(nestId)→px} */
function update(rig,e,dt,ctx){const b=e.bot,mode=b.mode,d=e.donor,t=ctx.time||0,G=ctx.groundZ||(()=>0),pl=ctx.player||{x:1e9,y:1e9};
 if(!rig)rig={arms:BASE.map(a=>({fx:b.x+Math.cos(a)*40,fy:b.y+Math.sin(a)*40,fz:0,step:null,lift:0,j:null})),bx:b.x,by:b.y,vx:0,vy:0,bodyZ:R.scout.bodyZ};
 const rf=isRoadframe(e),S=rf?R.roadframe:R.scout,gait=R.gait;dt=Math.max(dt,1e-4);
 rig.vx=sm(rig.vx,(b.x-rig.bx)/dt,dt*8);rig.vy=sm(rig.vy,(b.y-rig.by)/dt,dt*8);rig.bx=b.x;rig.by=b.y;
 const sp=Math.hypot(rig.vx,rig.vy),stride=gait.strideBase+sp*gait.stridePerSpeed;
 let bz=S.bodyZ+G(b.x,b.y);if(mode==='drop')bz=R.scout.bodyZ+(ctx.nestZ?ctx.nestZ(b.nest):R.dropFromZ)*(b.lift||0);
 if(mode==='anchor'||mode==='release')bz=R.scout.bodyZ+(b.lift||0)*R.onCarZ;if(mode==='disabled')bz=R.disabledZ;if(mode==='stagger')bz=36+Math.abs(Math.sin(t*9))*6;
 rig.bodyZ=sm(rig.bodyZ,bz,dt*10);
 let clamp=null;if(mode==='anchor'||mode==='release'){clamp={};const pts=R.clampPoints.map(o=>toWorld(d.x,d.y,d.angle,o[0],o[1]));const used=new Set();
  b.outriggers.forEach(o=>{let best=-1,bd=9;for(let i=0;i<R.arms;i++){if(used.has(i))continue;const a=Math.abs(angDiff(b.h+BASE[i],Math.atan2(o.y-b.y,o.x-b.x)));if(a<bd){bd=a;best=i;}}used.add(best);clamp[best]={x:o.x,y:o.y,z:0,out:true,ok:o.ok};});
  for(let i=0,k=0;i<R.arms;i++)if(!used.has(i)){clamp[i]={x:pts[k%pts.length].x,y:pts[k%pts.length].y,z:R.onCarZ,out:false,ok:true};k++;}}
 const transit=mode==='reframe'?e.parts.filter(p=>p.state==='transit'&&p.t>=p.delay):[];
 const legs=rf?R.legArms:[],wheels=e.parts.filter(p=>p.state==='frame'&&p.kind==='wheel');rig.legFeet=[];rig.legWheels=[];
 const zCar=k=>R.partZ.car[k]??R.partZ.car.wheel;
 for(let i=0;i<R.arms;i++){const A=rig.arms[i],base=b.h+BASE[i];let tx=b.x+Math.cos(base)*S.reach,ty=b.y+Math.sin(base)*S.reach,tz=0,free=false;
  if(mode==='drop'){tx=b.x+Math.cos(base)*24;ty=b.y+Math.sin(base)*24;tz=rig.bodyZ-28;free=true;}
  else if(clamp&&clamp[i]){const c=clamp[i];if(c.out&&!c.ok){tx=b.x+Math.cos(base)*30+Math.sin(t*20+i)*6;ty=b.y+Math.sin(base)*30;tz=rig.bodyZ+8;}else{tx=c.x;ty=c.y;tz=c.z;}free=true;}
  else if(transit.length&&i%2===0&&i/2<transit.length){const p=transit[i/2];tx=p.x;ty=p.y;tz=zCar(p.kind==='wheel'?'wheel':p.key)+(p.z||0)*1.6;free=true;}
  else if(mode==='disabled'){tx=b.x+Math.cos(base)*62;ty=b.y+Math.sin(base)*62;free=true;}
  else if(mode==='stun'){tx=b.x+Math.cos(base)*(50+Math.sin(t*40+i*2)*14);ty=b.y+Math.sin(base)*(50+Math.cos(t*37+i)*14);tz=12+Math.abs(Math.sin(t*30+i))*24;free=true;}
  else if(rf&&legs.includes(i)){const w=wheels[legs.indexOf(i)],s=w?slotWorld(b,w):{x:b.x+Math.cos(base)*60,y:b.y+Math.sin(base)*60};
   if(b.roll){tx=s.x;ty=s.y;free=true;}else{tx=b.x+(s.x-b.x)*1.3+rig.vx*.14;ty=b.y+(s.y-b.y)*1.3+rig.vy*.14;}tz=R.partZ.frame.wheel;}
  else if(rf){const dp=D(b.x,b.y,pl.x,pl.y);if(dp<240&&mode==='chase'){const a=Math.atan2(pl.y-b.y,pl.x-b.x)+(i%2?.35:-.35),L=Math.min(dp,95);tx=b.x+Math.cos(a)*L;ty=b.y+Math.sin(a)*L;tz=32;}else{tx=b.x+Math.cos(base)*46+Math.sin(t*3+i)*8;ty=b.y+Math.sin(base)*46;tz=rig.bodyZ+16+Math.sin(t*2+i)*8;}free=true;}
  else{tx+=rig.vx*gait.lead;ty+=rig.vy*gait.lead;tz=G(tx,ty);}
  if(free){A.step=null;const k=1-Math.exp(-(mode==='drop'?6:15)*dt);A.fx+=(tx-A.fx)*k;A.fy+=(ty-A.fy)*k;A.fz=sm(A.fz,tz,k);A.lift=0;}
  else{if(A.step){A.step.t+=dt/A.step.dur;const k=C(A.step.t,0,1);A.fx=A.step.fx+(A.step.tx-A.step.fx)*k;A.fy=A.step.fy+(A.step.ty-A.step.fy)*k;A.lift=Math.sin(Math.PI*k)*(rf?gait.heavyStepLift:gait.stepLift);if(k>=1){A.step=null;A.lift=0;A.landed=true;}}
   else if(D(A.fx,A.fy,tx,ty)>stride){const other=rig.arms.some((B,j)=>B.step&&(j%2)!==(i%2));if(!other)A.step={fx:A.fx,fy:A.fy,tx:tx+rig.vx*.1,ty:ty+rig.vy*.1,t:0,dur:rf?gait.heavyStepDur:gait.stepDur};}
   if(D(A.fx,A.fy,b.x,b.y)>S.reach*1.9){A.fx=tx;A.fy=ty;A.step=null;}A.fz=sm(A.fz,tz,dt*12);}
  const sc=rf?R.roadframe.coreScale:1,root={x:b.x+Math.cos(base)*S.rootRadius,y:b.y+Math.sin(base)*S.rootRadius,z:rig.bodyZ};
  A.j=fabrik(root,S.segLen,{x:A.fx,y:A.fy,z:A.fz+A.lift},A.j);A.radius=S.segRadius;A.isLeg=rf&&legs.includes(i);A.carrying=!!(transit.length&&i%2===0&&i/2<transit.length);
  if(A.isLeg){const tip=A.j[A.j.length-1];rig.legFeet.push(tip);const w=wheels[legs.indexOf(i)];if(w)rig.legWheels.push({part:w,x:tip.x,y:tip.y,z:tip.z});}}
 const alive=!['disabled','gone'].includes(mode),stun=mode==='stun'||mode==='stagger';
 Object.assign(rig,{mode,roadframe:rf,alive,stun,roll:!!b.roll,
  body:{x:b.x,y:b.y,z:rig.bodyZ,yaw:b.h,tilt:mode==='disabled'?.35:mode==='stagger'?Math.sin(t*7)*.3:0,scale:(rf?R.roadframe.coreScale:1)*(mode==='stun'?1+Math.sin(t*50)*.03:1),radius:R.scout.coreRadius},
  eye:{color:stun?R.palette.eyeStun:R.palette.eye,intensity:alive?.6+.4*Math.sin(t*(mode==='chase'?14:5)):0},jointColor:alive?R.palette.joint:R.palette.jointDead});
 return rig;}
/* Where a part should be drawn (px, z up) for any state. Wheels on a walking Roadframe follow the leg feet. */
function partPose(e,p,rig){const st=p.state,d=e.donor,Z=R.partZ,key=p.kind==='wheel'?'wheel':p.key;
 if(['taken','destroyed','carried'].includes(st))return null;
 if(st==='car'||st==='restored'){const o=p.open||0;let z=Z.car[key]??10,yawAdd=0,pitch=0;if(p.key==='doorL'||p.key==='doorR'){const s=p.key==='doorL'?-1:1;yawAdd=s*o*1.1;z+=o*10;}else if(p.key==='front'){z+=o*14;pitch=-o*.5;}else if(p.key==='rear'){z+=o*10;pitch=o*.4;}else if(p.key==='roof')z+=o*24;
  return {x:p.x,y:p.y,z,yaw:d.angle+yawAdd,pitch,roll:0};}
 if(st==='frame'){if(p.kind==='wheel'&&rig&&rig.legWheels){const w=rig.legWheels.find(q=>q.part===p);if(w)return {x:w.x,y:w.y,z:w.z,yaw:e.bot.h,pitch:0,roll:0,spin:rig.roll};}
  const dz=rig?rig.body.z-R.roadframe.bodyZ:0;return {x:p.x,y:p.y,z:(Z.frame[key]??40)+dz,yaw:p.r,pitch:0,roll:0};}
 const lift=(p.z||0)*1.6,base=st==='ground'?(p.kind==='wheel'?Z.ground.wheel:Z.ground.other):(Z.car[key]??10);
 return {x:p.x,y:p.y,z:base+lift,yaw:p.r,pitch:st==='ground'?Math.sin(p.r*3)*.2:0,roll:st==='ground'&&p.kind==='wheel'?Math.PI/2:0};}
/* Is the donor visually a whole, closed car? (draw your normal car model instead of parts) */
function donorWhole(e){return !e.released&&e.parts.every(p=>p.kind==='glass'||((p.state==='car'||p.state==='restored')&&(p.open||0)<.02));}
return {update,partPose,donorWhole,isRoadframe,BASE};
}
/* ===================== 4. ADAPTERS — drop-in renderers. Replace any hook with your game's own art. ===================== */
function makeReframerCanvas2D(DATA,Rig){
'use strict';
const P=DATA.rig.palette,TAU=Math.PI*2,BOX=DATA.donor.boxPx,C=(n,a,b)=>Math.max(a,Math.min(b,n));
const H=z=>z*.35;// top-down fake height: lift things up the screen
const DUR={};for(const st of DATA.stages)if(st.dur!=null)DUR[st.id]=st.dur;
function defaultCar(g,d,x,y,a,color){g.save();g.translate(x,y);g.rotate(a-Math.PI/2);g.fillStyle='#0007';g.beginPath();g.ellipse(5,7,BOX[0]*.36,BOX[1]*.5,0,0,TAU);g.fill();
 g.fillStyle=color;g.beginPath();g.roundRect(-BOX[0]*.27,-BOX[1]*.47,BOX[0]*.54,BOX[1]*.94,10);g.fill();g.fillStyle='#0b1a2a';g.fillRect(-BOX[0]*.2,-BOX[1]*.2,BOX[0]*.4,BOX[1]*.18);g.fillStyle='#ffe8b0';g.fillRect(-BOX[0]*.22,-BOX[1]*.47,7,3);g.fillRect(BOX[0]*.22-7,-BOX[1]*.47,7,3);g.restore();}
function defaultPart(g,p,pose,d,color){const k=p.kind;g.save();g.translate(pose.x,pose.y-H(pose.z));g.rotate(pose.yaw-Math.PI/2);
 if(k==='panel'){const c=p.crop||[.3,.3,.7,.7],w=(c[2]-c[0])*BOX[0],h=(c[3]-c[1])*BOX[1];g.fillStyle=color;g.strokeStyle='#0008';g.lineWidth=1.5;g.beginPath();g.roundRect(-w/2,-h/2,w,h,4);g.fill();g.stroke();}
 else if(k==='wheel'){g.fillStyle='#07090d';g.fillRect(-6,-10,12,20);g.fillStyle='#5b6372';g.fillRect(-3,-4,6,8);}
 else if(k==='engine'){g.fillStyle='#232934';g.fillRect(-12,-10,24,20);g.fillStyle='#ff9b53';g.fillRect(-3,-2,6,4);}
 else if(k==='chassis'){g.fillStyle='#0c0f16';g.fillRect(-19,-42,38,86);g.fillStyle='#262c38';g.fillRect(-16,-42,6,86);g.fillRect(10,-42,6,86);for(const y of [-34,-14,8,30])g.fillRect(-16,y,32,4);}
 g.restore();}
function ring(g,x,y,r,p,c){g.save();g.strokeStyle='#ffffff22';g.lineWidth=4;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();g.strokeStyle=c;g.shadowColor=c;g.shadowBlur=10;g.beginPath();g.arc(x,y,r,-Math.PI/2,-Math.PI/2+TAU*p);g.stroke();g.restore();}
function drawRig(g,rig){const b=rig.body;
 g.fillStyle='#000a';g.beginPath();g.ellipse(b.x+6,b.y+9,28*b.scale,22*b.scale,b.yaw,0,TAU);g.fill();
 const order=rig.arms.map((a,i)=>i).sort((i,j)=>rig.arms[i].fy-rig.arms[j].fy);g.lineCap='round';
 for(const i of order){const A=rig.arms[i],J=A.j;g.strokeStyle='#0006';g.lineWidth=A.radius[0]*2+2;g.beginPath();g.moveTo(J[0].x+5,J[0].y+7);for(const q of J.slice(1))g.lineTo(q.x+5,q.y+7);g.stroke();
  for(let k=0;k<J.length-1;k++){g.strokeStyle='#141824';g.lineWidth=A.radius[k]*2+2;g.beginPath();g.moveTo(J[k].x,J[k].y-H(J[k].z));g.lineTo(J[k+1].x,J[k+1].y-H(J[k+1].z));g.stroke();g.strokeStyle='#3a4254';g.lineWidth=A.radius[k]*2;g.stroke();g.strokeStyle='#8893a8';g.lineWidth=1;g.stroke();}
  for(let k=1;k<J.length-1;k++){g.fillStyle=rig.jointColor;g.shadowColor=rig.jointColor;g.shadowBlur=rig.alive?8:0;g.beginPath();g.arc(J[k].x,J[k].y-H(J[k].z),2.3,0,TAU);g.fill();g.shadowBlur=0;}
  const t=J[J.length-1],p=J[J.length-2],a=Math.atan2((t.y-H(t.z))-(p.y-H(p.z)),t.x-p.x);g.save();g.translate(t.x,t.y-H(t.z));g.rotate(a);g.strokeStyle=rig.alive?P.claw:'#6b6680';g.lineWidth=2.2;g.beginPath();g.moveTo(-3,-2);g.quadraticCurveTo(5,-7,8,-1);g.moveTo(-3,2);g.quadraticCurveTo(5,7,8,1);g.stroke();g.restore();}
 const r=b.radius*b.scale,cy=b.y-H(b.z);g.save();g.translate(b.x,cy);g.rotate(b.yaw+b.tilt*.3);
 g.shadowColor=rig.stun?P.eyeStun:P.joint;g.shadowBlur=rig.alive?14:0;g.fillStyle=P.body;g.beginPath();g.ellipse(0,0,r,r*.85,0,0,TAU);g.fill();g.shadowBlur=0;
 g.strokeStyle=rig.jointColor;g.lineWidth=2.5;g.beginPath();g.ellipse(0,0,r*.92,r*.78,0,0,TAU);g.stroke();g.fillStyle=P.plate;for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2+Math.PI/4);g.fillRect(r*.35,-4,r*.4,8);g.restore();}
 if(rig.alive){g.fillStyle=rig.eye.color;g.shadowColor=rig.eye.color;g.shadowBlur=12*rig.eye.intensity;g.beginPath();g.arc(r*.55,0,3.5+rig.eye.intensity*1.5,0,TAU);g.fill();}
 g.restore();}
/* draw everything for one world (call inside your camera transform). opts: {time, rigs:Map, player?:{x,y,angle}, carDraw?(g,donor,x,y,angle), partDraw?(g,part,pose,donor), donorColor?(donor)} */
function draw(g,w,opts){const t=opts.time||0,col=opts.donorColor||(d=>['#8ea4c8','#d4e0f2','#ff6670','#6c9cff'][d.skin%4]);const all=w.enc?[...w.history,w.enc]:w.history;
 for(const e of all){if(e.released)continue;const d=e.donor,whole=Rig.donorWhole(e);
  if(whole){(opts.carDraw||((g2,dd,x,y,a)=>defaultCar(g2,dd,x,y,a,col(dd))))(g,d,d.x,d.y,d.angle);}
  const rig=opts.rigs.get(e.id);
  for(const p of e.parts){if(whole&&(p.state==='car'||p.state==='restored'))continue;if(p.kind==='glass')continue;const pose=Rig.partPose(e,p,rig);if(!pose)continue;(opts.partDraw||((g2,pp,po,dd)=>defaultPart(g2,pp,po,dd,col(dd))))(g,p,pose,d);}
  if(rig&&e.bot.mode!=='gone'&&(e===w.enc||e.bot.mode==='disabled'))drawRig(g,rig);
  if(e===w.enc)overlays(g,e,t,opts);
  else if(['stripped','patched','lost'].includes(d.status)){g.save();g.setLineDash([10,8]);g.strokeStyle=P.rebuild;g.globalAlpha=.6;g.lineWidth=2;g.beginPath();g.arc(d.x,d.y,82,0,TAU);g.stroke();g.restore();g.fillStyle=P.rebuild;g.font='900 10px system-ui';g.textAlign='center';g.fillText('◎ REBUILD '+d.id,d.x,d.y+100);}}
 for(const it of w.items){g.save();g.translate(it.x,it.y);g.rotate(t);g.fillStyle='#d9c2ff';g.shadowColor='#b983ff';g.shadowBlur=16;g.beginPath();g.moveTo(0,-10);g.lineTo(7,0);g.lineTo(0,10);g.lineTo(-7,0);g.closePath();g.fill();g.restore();}
 if(w.carried&&w.carried.length&&opts.player){w.carried.forEach((p,i)=>{const a=(opts.player.angle||0)+Math.PI,x=opts.player.x+Math.cos(a)*(50+i*14),y=opts.player.y+Math.sin(a)*(50+i*14);defaultPart(g,p,{x,y,z:0,yaw:opts.player.angle||0},null,'#aab6c8');});}}
function overlays(g,e,t,opts){const b=e.bot,d=e.donor;
 if(b.mode==='read'){const a=Math.atan2(d.y-b.y,d.x-b.x);g.save();g.globalAlpha=.22;g.fillStyle=P.scan;g.beginPath();g.moveTo(b.x,b.y);g.arc(b.x,b.y,150,a-.45,a+.45);g.closePath();g.fill();g.restore();ring(g,d.x,d.y,62,C(b.t/DUR.read,0,1),P.scan);}
 if(b.mode==='anchor'||b.mode==='release'){for(const o of b.outriggers)if(o.ok){const p=.5+.5*Math.sin(t*8);g.strokeStyle=P.outrigger;g.lineWidth=3;g.globalAlpha=.55+.45*p;g.beginPath();g.arc(o.x,o.y,24+p*6,0,TAU);g.stroke();g.globalAlpha=1;g.fillStyle=P.outrigger;g.font='900 10px system-ui';g.textAlign='center';g.fillText('HIT',o.x,o.y+38);}
  ring(g,d.x,d.y,70,C(b.t/(b.mode==='anchor'?DUR.anchor:DUR.release),0,1),b.mode==='anchor'?P.outrigger:P.release);}
 if(e.occupant==='inside'&&['drop','seek','read','anchor','stagger'].includes(b.mode)){g.fillStyle='#ffe6a8';g.font='900 10px system-ui';g.textAlign='center';g.fillText('● DRIVER INSIDE • STOP + HOLD X',d.x,d.y-64);}
 if(b.mode==='chase'||b.mode==='retreat'){g.fillStyle='#e4b0ff';g.font='bold 10px system-ui';g.textAlign='center';g.fillText((b.mode==='retreat'?'RETREATING ':'ROADFRAME ')+Math.round(b.integrity*100)+'%',b.x,b.y-80);}}
return {draw,drawRig,defaultCar,defaultPart};
}

/* three.js adapter. Pass YOUR THREE (any r150+). 1 unit = 40 px by default; px (x,y,z-up) → three (x*u, z*u, y*u); models face +Z. */
function makeReframerThree(DATA,Rig){
'use strict';
const P=DATA.rig.palette,TAU=Math.PI*2;
return function createView(THREE,scene,opts={}){
 const u=opts.unit||1/40,yaw=a=>Math.atan2(Math.cos(a),Math.sin(a)),views=new Map();
 const M={body:new THREE.MeshStandardMaterial({color:P.body,metalness:.85,roughness:.32}),plate:new THREE.MeshStandardMaterial({color:P.plate,metalness:.9,roughness:.28}),
  joint:new THREE.MeshStandardMaterial({color:0x1a1426,emissive:P.joint,emissiveIntensity:2.2}),dead:new THREE.MeshStandardMaterial({color:P.jointDead,roughness:.6}),
  claw:new THREE.MeshStandardMaterial({color:P.claw,emissive:0x7a4dff,emissiveIntensity:.8,metalness:.7,roughness:.3}),chassis:new THREE.MeshStandardMaterial({color:0x0d1017,metalness:.8,roughness:.45}),
  add:c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})};
 const CYL=new THREE.CylinderGeometry(1,1,1,10).translate(0,.5,0),SPH=new THREE.SphereGeometry(1,14,10),BOXG=new THREE.BoxGeometry(1,1,1),UP=new THREE.Vector3(0,1,0),tv=new THREE.Vector3();
 const at=(o,q)=>o.position.set(q.x*u,q.z*u,q.y*u);
 const seg=(m,a,b,r)=>{const A=new THREE.Vector3(a.x*u,a.z*u,a.y*u),B=new THREE.Vector3(b.x*u,b.z*u,b.y*u);tv.subVectors(B,A);const L=tv.length()||1e-4;m.position.copy(A);m.scale.set(r*u,L,r*u);m.quaternion.setFromUnitVectors(UP,tv.multiplyScalar(1/L));};
 const color=opts.donorColor||(d=>[0x8ea4c8,0xd4e0f2,0xff6670,0x6c9cff][d.skin%4]);
 function defaultPart(p,d){const c=color(d),m=new THREE.MeshStandardMaterial({color:c,metalness:.5,roughness:.5});let o;
  if(p.kind==='chassis'){o=new THREE.Group();for(const s of [-1,1]){const r=new THREE.Mesh(BOXG,M.chassis);r.scale.set(.14,.14,2.3);r.position.x=s*.32;o.add(r);}}
  else if(p.kind==='wheel'){o=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.22,16).rotateZ(Math.PI/2),new THREE.MeshStandardMaterial({color:0x0a0c10,roughness:.9}));}
  else if(p.kind==='engine'){o=new THREE.Mesh(BOXG,M.plate);o.scale.set(.6,.4,.5);}
  else{const c2=p.crop||[.3,.3,.7,.7];o=new THREE.Mesh(BOXG,m);o.scale.set((c2[2]-c2[0])*DATA.donor.boxPx[0]*u,.08,(c2[3]-c2[1])*DATA.donor.boxPx[1]*u);}
  return o;}
 function defaultCar(d){const g=new THREE.Group(),m=new THREE.Mesh(BOXG,new THREE.MeshStandardMaterial({color:color(d),metalness:.5,roughness:.45}));m.scale.set(1.1,.55,2.4);m.position.y=.45;const c=new THREE.Mesh(BOXG,new THREE.MeshStandardMaterial({color:0x0b1a2a}));c.scale.set(.9,.35,1.1);c.position.set(0,.85,-.1);g.add(m,c);return g;}
 function make(e){const g=new THREE.Group();scene.add(g);const core=new THREE.Group();g.add(core);
  const body=new THREE.Mesh(SPH,M.body);body.scale.set(.62,.5,.7);core.add(body);const ring=new THREE.Mesh(new THREE.TorusGeometry(.66,.05,8,40),M.joint);ring.rotation.x=Math.PI/2;core.add(ring);
  for(let i=0;i<4;i++){const pl=new THREE.Mesh(BOXG,M.plate);pl.scale.set(.42,.12,.3);const a=i*Math.PI/2+Math.PI/4;pl.position.set(Math.cos(a)*.42,.3,Math.sin(a)*.42);pl.rotation.y=-a;core.add(pl);}
  const eye=new THREE.Mesh(SPH,new THREE.MeshStandardMaterial({color:0x330000,emissive:P.eye,emissiveIntensity:4}));eye.scale.setScalar(.11);eye.position.set(0,.12,.62);core.add(eye);
  const light=new THREE.PointLight(P.joint,10,9,2);light.position.y=.2;core.add(light);
  const arms=[...Array(DATA.rig.arms)].map(()=>({segs:[0,1,2].map(()=>{const m=new THREE.Mesh(CYL,M.body);g.add(m);return m;}),joints:[0,1,2].map(()=>{const m=new THREE.Mesh(SPH,M.joint);g.add(m);return m;}),claw:(()=>{const m=new THREE.Mesh(new THREE.ConeGeometry(1,1,6).translate(0,.5,0),M.claw);g.add(m);return m;})()}));
  const car=(opts.donorFactory||defaultCar)(e.donor);scene.add(car);const parts=new Map();for(const p of e.parts)if(p.kind!=='glass'){const o=(opts.partFactory||defaultPart)(p,e.donor);scene.add(o);parts.set(p.id,o);}
  const scan=new THREE.Mesh(new THREE.ConeGeometry(1.4,1,24,1,true).translate(0,-.5,0).rotateX(-Math.PI/2),M.add(P.scan));scan.material.opacity=.16;scene.add(scan);
  const outs=[0,1,2,3].map(()=>{const r=new THREE.Mesh(new THREE.TorusGeometry(.62,.07,8,32),M.add(P.outrigger));r.rotation.x=Math.PI/2;scene.add(r);return r;});
  return {g,core,eye,light,ring,arms,car,parts,scan,outs};}
 function sync(w,rigs,time){const all=w.enc?[...w.history,w.enc]:w.history;
  for(const e of all){let v=views.get(e.id);if(!v){v=make(e);views.set(e.id,v);}const rig=rigs.get(e.id),d=e.donor,whole=Rig.donorWhole(e);
   v.car.visible=whole;v.car.position.set(d.x*u,0,d.y*u);v.car.rotation.y=yaw(d.angle);
   for(const p of e.parts){if(p.kind==='glass')continue;const o=v.parts.get(p.id),pose=whole&&(p.state==='car'||p.state==='restored')?null:Rig.partPose(e,p,rig);o.visible=!!pose&&!e.released;if(!pose)continue;at(o,pose);o.rotation.set(pose.pitch||0,yaw(pose.yaw)+(p.kind==='wheel'?Math.PI/2:0),pose.roll||0,'YXZ');}
   const show=rig&&e.bot.mode!=='gone'&&(e===w.enc||e.bot.mode==='disabled');v.g.visible=!!show;
   if(show){const b=rig.body;at(v.core,b);v.core.rotation.set(b.tilt,yaw(b.yaw),0,'YXZ');v.core.scale.setScalar(b.scale);v.eye.material.emissive.set(rig.eye.color);v.eye.material.emissiveIntensity=rig.alive?2+3*rig.eye.intensity:0;v.light.intensity=rig.alive?10:0;v.ring.material=rig.alive?M.joint:M.dead;
    rig.arms.forEach((A,i)=>{const a=v.arms[i];for(let k=0;k<3;k++){seg(a.segs[k],A.j[k],A.j[k+1],A.radius[k]);a.joints[k].position.set(A.j[k].x*u,A.j[k].z*u,A.j[k].y*u);a.joints[k].scale.setScalar(A.radius[k]*1.25*u);a.joints[k].material=rig.alive?M.joint:M.dead;}
     const t=A.j[3],p=A.j[2],dx=t.x-p.x,dy=t.y-p.y,dz=t.z-p.z,L=Math.hypot(dx,dy,dz)||1;seg(a.claw,t,{x:t.x+dx/L*9,y:t.y+dy/L*9,z:t.z+dz/L*9},2.4);});}
   const b=e.bot,act=e===w.enc;v.scan.visible=act&&b.mode==='read';if(v.scan.visible){const from=new THREE.Vector3(b.x*u,1.35,b.y*u),to=new THREE.Vector3(d.x*u,.5,d.y*u);v.scan.position.copy(from);v.scan.lookAt(to);v.scan.scale.set(1,1,from.distanceTo(to)+1.2);}
   v.outs.forEach((r,i)=>{const q=b.outriggers&&b.outriggers[i],on=act&&(b.mode==='anchor'||b.mode==='release')&&q&&q.ok;r.visible=!!on;if(on){r.position.set(q.x*u,.22,q.y*u);r.scale.setScalar(1+.18*Math.sin(time*8));}});}}
 return {sync,views};};
}

/* Optional WebAudio cues matching DATA.audio. Call ReframerKit.Audio.play(evt.k) on every {t:'sfx'} event. */
function makeReframerAudio(){let A=null;const ac=()=>{try{const K=window.AudioContext||window.webkitAudioContext;A=A||new K();if(A.state==='suspended')A.resume();return A;}catch(_){return null;}};
 const tone=(type,f0,f1,dur,vol=.05,delay=0)=>{const a=ac();if(!a)return;const n=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,n);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),n+dur);g.gain.setValueAtTime(vol,n);g.gain.exponentialRampToValueAtTime(.0001,n+dur);o.connect(g);g.connect(a.destination);o.start(n);o.stop(n+dur+.02);};
 const noise=(dur,freq,vol=.05,q=1)=>{const a=ac();if(!a)return;const len=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(a.destination);s.start();};
 const play=k=>{switch(k){case 'wake':tone('sawtooth',55,140,.7,.04);tone('square',220,110,.3,.02,.3);break;case 'scan':tone('sine',1400,1900,.12,.025);tone('sine',1900,1400,.12,.025,.14);break;case 'jam':noise(.25,3200,.06,2);tone('square',300,90,.2,.03);break;
  case 'anchor':tone('square',90,60,.12,.06);tone('square',80,55,.12,.05,.15);break;case 'snap':noise(.12,1800,.09,4);tone('triangle',500,120,.15,.04);break;case 'stagger':tone('sawtooth',260,60,.5,.05);break;case 'hydraulic':noise(.7,900,.05,.7);break;
  case 'glass':noise(.35,5200,.07,5);break;case 'reframe':tone('sawtooth',120,520,1.6,.03);break;case 'lock':tone('square',600,420,.06,.03);break;case 'online':[220,277,330].forEach((f,i)=>tone('triangle',f,f,.35,.03,i*.07));break;
  case 'grab':tone('square',70,45,.25,.08);noise(.2,400,.05);break;case 'clank':tone('square',140,70,.12,.07);noise(.1,2600,.06,3);break;case 'collapse':tone('sawtooth',160,35,.9,.07);noise(.6,600,.06,.8);break;
  case 'stun':tone('sine',900,300,.3,.05);noise(.3,4000,.03,6);break;case 'pickup':tone('triangle',700,1100,.09,.035);break;case 'repair':[330,415,494,660].forEach((f,i)=>tone('triangle',f,f,.18,.03,i*.09));break;case 'rescue':tone('triangle',520,520,.12,.04);tone('triangle',780,780,.16,.04,.13);break;}};
 return {play,tone,noise};}
/* ===================== 5. SELF-TEST — 16 checks, no game needed. A kinematic "player" is placed and moved directly. ===================== */
function makeReframerSelfTest(DATA,makeEngine){
'use strict';
const D=(a,b,c,d)=>Math.hypot(a-c,b-d),DT=1/120;
function mk(seed,o={}){const E=o.engine||makeEngine(DATA);const w=E.create({seed,exits:[{x:3000,y:1200,name:'north gate'},{x:4800,y:3000,name:'east gate'}],nests:[{x:3000,y:3000}],parked:[{id:'P1',x:3000,y:3290,angle:Math.PI/2,skin:1}],nestCool:0,cooldown:999});
 w.bounds={w:6000,h:6000};return {E,w,P:{x:o.px||3000,y:o.py||3700,vx:0,vy:0,charge:100},traffic:o.traffic||[],t:0,grabs:0,released:0,massFail:0,nan:false};}
function apply(S,ev){for(const e of ev){if(e.t==='player'){if(e.mul){S.P.vx*=e.mul;S.P.vy*=e.mul;}if(e.push){S.P.x+=e.push.x;S.P.y+=e.push.y;}if(e.nrm){const vn=S.P.vx*e.nrm.x+S.P.vy*e.nrm.y;if(vn>0){S.P.vx-=e.nrm.x*vn*(1+(e.e||0));S.P.vy-=e.nrm.y*vn*(1+(e.e||0));}}}
 if(e.t==='gallium')S.P.charge=Math.min(100,S.P.charge+e.amount);if(e.t==='sfx'&&e.k==='grab')S.grabs++;if(e.t==='releaseTraffic')S.released++;}}
function tick(S,interact){S.P.x+=S.P.vx*DT;S.P.y+=S.P.vy*DT;apply(S,S.E.step(S.w,{px:S.P.x,py:S.P.y,pvx:S.P.vx,pvy:S.P.vy,interact:!!interact,traffic:S.traffic,noWake:true},DT));S.t+=DT;
 if(Math.round(S.t*120)%30===0&&!S.E.massCheck(S.w).ok)S.massFail++;if(S.w.enc&&!Number.isFinite(S.w.enc.bot.x+S.w.enc.bot.y))S.nan=true;}
function run(S,pred,max,each){const end=S.t+max;while(S.t<end){if(pred())return true;const i=each?each():false;tick(S,i);}return pred();}
const at=(S,x,y)=>()=>{S.P.x=x;S.P.y=y;S.P.vx=S.P.vy=0;return false;};
const mode=S=>S.w.enc?S.w.enc.bot.mode:'none',L=S=>S.w.ledger[S.w.ledger.length-1],enc=S=>S.w.enc||S.w.history[S.w.history.length-1];
function pulse(S){if(S.P.charge<DATA.tuning.gallium.pulseCost)return false;S.P.charge-=DATA.tuning.gallium.pulseCost;const r=S.E.pulse(S.w,S.P.x,S.P.y);apply(S,r.ev);return r.hit;}
function force(S,donor){S.E.forceEncounter(S.w,{px:S.P.x,py:S.P.y,traffic:S.traffic},{nest:0,donor});}
function collect(S){let g=0;run(S,()=>false,1.2,at(S,S.P.x,S.P.y));for(const p of enc(S).parts.filter(q=>q.state==='ground')){run(S,()=>p.state!=='ground'||g++>4000,3,()=>{S.P.x=p.x+20;S.P.y=p.y;S.P.vx=S.P.vy=0;return false;});}
 for(const it of S.w.items.slice())run(S,()=>!S.w.items.includes(it),2,at(S,it.x,it.y));}
function rebuild(S){const d=enc(S).donor;run(S,()=>!enc(S).parts.some(p=>p.state==='carried'||p.state==='restoring'),20,()=>{S.P.x=d.x+70;S.P.y=d.y;S.P.vx=S.P.vy=0;return true;});}
function chaseReady(seed){const S=mk(seed);force(S);run(S,()=>mode(S)==='chase',30,at(S,3000,4400));run(S,()=>false,.2,at(S,3000,4400));return S;}
function ramOnce(S,spd){const b=S.w.enc.bot;b.vx=b.vy=0;b.grabCd=5;b.hitCd=0;const x=b.x+40,y=b.y-90,a=Math.atan2(b.y-y,b.x-x);S.P.x=x;S.P.y=y;S.P.vx=Math.cos(a)*spd;S.P.vy=Math.sin(a)*spd;
 const f=()=>enc(S).parts.filter(p=>p.state==='frame').length,before=f();run(S,()=>f()<before||!S.w.enc,.6);return before-f();}
const tests=[
 ['Data: masses, order, durations',()=>{const tot=DATA.donor.parts.reduce((s,p)=>s+p.mass,0),keys=DATA.donor.parts.filter(p=>p.kind!=='glass').map(p=>p.key).sort().join(),ord=[...DATA.donor.reframeOrder].sort().join(),durs=['drop','read','anchor','release','reframe','recover','stagger','stun'].every(k=>DATA.stages.find(s=>s.id===k&&s.dur>0));
  return [tot===DATA.donor.totalKg&&keys===ord&&durs,tot+' kg • order covers '+DATA.donor.reframeOrder.length+' parts'];}],
 ['Flow: double Gallium pulse → clean save + residue back',()=>{const S=mk(11);force(S);run(S,()=>mode(S)==='read',20,at(S,3120,3330));pulse(S);run(S,()=>false,.3,at(S,3120,3330));pulse(S);collect(S);return [L(S).outcome==='CLEAN SAVE'&&S.P.charge>=60,L(S).outcome+' • charge '+S.P.charge];}],
 ['Probe: one side pass topples, ram while tipped = clean save, 0 Ga',()=>{const S=mk(12);force(S);run(S,()=>mode(S)==='anchor'&&S.w.enc.bot.t>.6,20,at(S,3300,3800));const O=S.w.enc.bot.outriggers;
  S.P.x=O[3].x;S.P.y=O[3].y+120;S.P.vx=0;S.P.vy=-190;run(S,()=>mode(S)==='stagger',2);const tipped=mode(S)==='stagger',b=S.w.enc.bot;S.P.x=b.x+150;S.P.y=b.y;S.P.vx=-200;S.P.vy=0;run(S,()=>!S.w.enc,1.2);
  return [tipped&&L(S).outcome==='CLEAN SAVE'&&L(S).galliumSpent===0,(tipped?'tipped':'no tip')+' • '+L(S).outcome];}],
 ['Probe: one outrigger alone does NOT topple',()=>{const S=mk(13);force(S);run(S,()=>mode(S)==='anchor'&&S.w.enc.bot.t>.6,20,at(S,3300,3800));const O=S.w.enc.bot.outriggers;S.P.x=O[3].x+120;S.P.y=O[3].y;S.P.vx=-190;S.P.vy=0;run(S,()=>false,.5);
  const n=O.filter(o=>!o.ok).length;return [n===1&&mode(S)!=='stagger',n+' snapped • '+mode(S)];}],
 ['Probe: drive-through jams the scan once per pass',()=>{const S=mk(14);force(S);run(S,()=>mode(S)==='read',20,at(S,3300,4300));S.P.x=2860;S.P.y=3290;S.P.vx=220;S.P.vy=0;run(S,()=>S.P.x>3160,2);return [S.w.enc.jams===1,S.w.enc.jams+' jam'];}],
 ['Probe: stop + hold X rescues the driver in < 1 s',()=>{const tr={x:3000,y:3290,angle:Math.PI/2,skin:2};const S=mk(15,{traffic:[tr]});force(S,tr);run(S,()=>mode(S)==='read',20,at(S,3000,4300));const t0=S.t;
  run(S,()=>S.w.enc.occupant==='rescued',3,()=>{S.P.x=3080;S.P.y=3330;S.P.vx=S.P.vy=0;return true;});return [S.w.enc.occupant==='rescued'&&S.t-t0<1,S.w.enc.occupant+' in '+(S.t-t0).toFixed(2)+'s'];}],
 ['Probe: clean-saved traffic car is handed back to traffic',()=>{const tr={x:3000,y:3290,angle:Math.PI/2,skin:2};const S=mk(16,{traffic:[tr]});force(S,tr);const spliced=S.traffic.length===0;run(S,()=>mode(S)==='read',20,at(S,3000,3420));pulse(S);run(S,()=>false,.3,at(S,3000,3420));pulse(S);run(S,()=>S.released>0,4,at(S,3000,3420));
  return [spliced&&L(S).outcome==='CLEAN SAVE'&&S.released===1,L(S).outcome+' • releaseTraffic ×'+S.released];}],
 ['Flow: break REFRAME mid-air → salvage → rebuild',()=>{const S=mk(17);force(S);run(S,()=>mode(S)==='reframe'&&S.w.enc.bot.t>1.5,30,at(S,3180,3420));const b=S.w.enc.bot;S.P.x=b.x+150;S.P.y=b.y;pulse(S);run(S,()=>false,.3,at(S,b.x+150,b.y));if(S.w.enc)pulse(S);
  const ground=enc(S).parts.filter(p=>p.state==='ground').length;collect(S);rebuild(S);return [ground>0&&['REPAIRED','PATCHED'].includes(L(S).outcome),ground+' parts dropped • '+L(S).outcome+' '+L(S).restoredPct+'%'];}],
 ['Probe: stun pulse makes each ram tear off an extra part',()=>{const A=chaseReady(18),n1=ramOnce(A,190);const B=chaseReady(18);B.P.x=B.w.enc.bot.x;B.P.y=B.w.enc.bot.y+150;pulse(B);const n2=ramOnce(B,190);return [n1===1&&n2===2,n1+' normal → '+n2+' stunned'];}],
 ['Probe: slow contact = grabbed, fast contact = ram',()=>{const A=chaseReady(19),b=A.w.enc.bot;b.grabCd=0;b.hitCd=0;const g0=A.grabs;A.P.x=b.x;A.P.y=b.y+50;A.P.vx=0;A.P.vy=-20;run(A,()=>false,.05);const B=chaseReady(19),k=ramOnce(B,200);
  return [A.grabs===g0+1&&k>=1,'slow → '+(A.grabs-g0)+' grab • fast → '+k+' part'];}],
 ['Flow: ram the Roadframe apart (head-on, 260 px/s)',()=>{const S=chaseReady(20);let n=0;while(S.w.enc&&n<14){ramOnce(S,260);n++;}return [!S.w.enc&&L(S).outcome==='DISABLED'&&n<=10,n+' rams • '+L(S).outcome];}],
 ['Flow: escape → LOST, material "taken" not erased',()=>{const S=mk(21);force(S);run(S,()=>mode(S)==='chase',30,at(S,3000,3700));run(S,()=>!S.w.enc,80,at(S,3000,5950));return [L(S).outcome==='LOST'&&L(S).takenKg>0,L(S).outcome+' • '+L(S).takenKg+' kg to territory'];}],
 ['Flow: idle player → resolves, no soft-lock, ≤4 grabs',()=>{const S=mk(22,{py:3500});force(S);run(S,()=>!S.w.enc,150,at(S,3000,3500));return [!S.w.enc&&S.grabs<=DATA.tuning.chase.grabLimit,L(S).outcome+' @'+S.t.toFixed(0)+'s • '+S.grabs+' grabs'];}],
 ['Mass conserved every 0.25 s in every run',()=>[true,'(checked below)']],
 ['Deterministic replay',()=>{const a=chaseReady(23);ramOnce(a,260);ramOnce(a,260);const b=chaseReady(23);ramOnce(b,260);ramOnce(b,260);return [JSON.stringify(a.w.ledger)===JSON.stringify(b.w.ledger)&&a.w.enc?.bot.x===b.w.enc?.bot.x,'ledger + position identical'];}],
 ['Data-driven: editing DATA changes behavior',()=>{const D2=JSON.parse(JSON.stringify(DATA));D2.stages.find(s=>s.id==='read').dur=1.0;const S=mk(24,{engine:makeEngine(D2)});force(S);run(S,()=>mode(S)==='read',20,at(S,3300,4300));const t0=S.t;run(S,()=>mode(S)==='anchor',5,at(S,3300,4300));
  return [Math.abs(S.t-t0-1.0)<.05,'READ set to 1.0 s → took '+(S.t-t0).toFixed(2)+' s'];}]
];
return function selfTest(){const rows=[],states=[];let massBad=0,nanBad=0;const origMk=mk;
 for(const [name,fn] of tests){let r;try{r=fn();}catch(e){r=[false,'CRASH '+e.message];}rows.push({name,pass:!!r[0],metric:r[1]});}
 // mass check: re-run a mixed sample with the flag counters
 for(const seed of [31,32,33]){const S=mk(seed);force(S);run(S,()=>!S.w.enc,150,()=>{if(S.w.enc&&S.w.enc.bot.mode==='reframe'&&S.w.enc.bot.t>1)pulse(S);S.P.x=3000;S.P.y=3500;S.P.vx=S.P.vy=0;return false;});collect(S);massBad+=S.massFail;nanBad+=S.nan?1:0;}
 const m=rows.find(r=>r.name.startsWith('Mass'));m.pass=massBad===0&&nanBad===0;m.metric=massBad===0?'0 mismatches • 0 NaN':massBad+' mismatches';
 return {passed:rows.filter(r=>r.pass).length,total:rows.length,rows};};
}
/* ===================== 6. KIT OBJECT ===================== */
var ReframerKit=(function(){
 const DATA=REFRAMER_DATA,Engine=makeReframerEngine(DATA),Rig=makeReframerRig(DATA);
 return {DATA,Engine,Rig,
  makeEngine:makeReframerEngine,makeRig:makeReframerRig,
  Canvas2D:makeReframerCanvas2D(DATA,Rig),
  createThreeView:makeReframerThree(DATA,Rig),
  Audio:(typeof window!=='undefined')?makeReframerAudio():null,
  selfTest:makeReframerSelfTest(DATA,makeReframerEngine),
  withData(edits){const d=JSON.parse(JSON.stringify(DATA));(function merge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k])merge(a[k],b[k]);else a[k]=b[k];}})(d,edits||{});const E=makeReframerEngine(d),R=makeReframerRig(d);return {DATA:d,Engine:E,Rig:R,Canvas2D:makeReframerCanvas2D(d,R),createThreeView:makeReframerThree(d,R)};},
  canPulse(w,x,y){const e=w.enc;return !!e&&!['disabled','gone'].includes(e.bot.mode)&&Math.hypot(e.bot.x-x,e.bot.y-y)<=DATA.tuning.gallium.pulseRange;},
  updateRigs(w,rigs,dt,ctx){for(const e of (w.enc?[w.enc,...w.history]:w.history))if(e===w.enc||e.bot.mode==='disabled')rigs.set(e.id,Rig.update(rigs.get(e.id),e,dt,ctx));return rigs;},
  stageInfo(w){const e=w.enc;if(!e)return null;const b=e.bot,s=DATA.stages.find(x=>x.id===b.mode)||{};return {id:b.mode,label:s.label,hint:s.hint,progress:b.mode==='chase'||b.mode==='retreat'?b.integrity:(s.dur?Math.min(1,b.t/s.dur):0),donor:e.donor.id,occupant:e.occupant};},
  exportJSON(){return JSON.stringify(DATA,null,1);}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ReframerKit;
if(typeof window!=='undefined')window.ReframerKit=ReframerKit;