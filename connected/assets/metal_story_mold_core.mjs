// WIR METAL • end-backward Season One playable story mold (PROPOSAL / HOLD).
// Canonical 30 episode TITLES, antagonists, audio stems are from the approved
// September 11 2026 Metal master archive; do not confuse historical doc
// preservation with approval of every optional gameplay mechanic.
// Explicit optional game integration: do not replace existing 4-chapter save.
export const METAL_MOLD_KEY='wir_metal_story_mold_v1';
export const METAL_MOLD_VERSION=1;
const EPISODES=[
 ['Concrete Has a Tempo','Ballast','First Push','Listen before striking','record'],
 ['The Bill Moves','Slipline','Somebody Pays','Redirect force away from civilians','redirect'],
 ['Strong Is Not Tough','Glassjaw','Tiny Cracks','Flex instead of relying on stiffness','repair'],
 ['Temperature Geography','Kiln','Hot Rail Cold Hand','Track heat flow and vulnerable supports','thermal'],
 ['The Street Hits Twice','Echo Nail','Again','Count a delayed second impact','timing'],
 ['Four Wheels Down','Ballast and Slipline','Four Points','Keep a real four-wheel board and protect young skaters','skate'],
 ['Anchor Point','Slipline','No Free Impact','Choose viable physical anchors','anchors'],
 ['False Strong','Glassjaw','Flex Test','Revisit a failed Gallium repair','accountability'],
 ['Cold Side of Fire','Kiln','Condensation Map','Release pressure with Gallium Gallop','gallop'],
 ['The Beat Comes Back','Echo Nail','Seven Count','Listen when visibility fails','listening'],
 ['East Is Down','Nyaxi','Bent Compass','Diagnose magnetic misalignment','vector'],
 ['Socket Weather','Nyaxi','Left Side Forecast','Protect prosthetic users before pursuit','care'],
 ['Loose Things','Patchwork','Tik Tik Tik','Inspect original part interfaces','interfaces'],
 ['The Sound of a Failing Bolt','Patchwork','Assembly Song','Repair without covering up faults','maintenance'],
 ['What the Floor Knows','Rattle','Underfoot','Discover hidden structural load paths','hidden-load'],
 ['Gyre Lesson','Rattle','Load Path','Navigate supports without collapsing them','path'],
 ['Unpaid Weight','Ballast and Load Shark','Carried Downstairs','Evacuate when load is redirected into homes','evacuate'],
 ['Every Floor Becomes a Ceiling','Load Shark','Ceiling People','Track scars in the city after victory','consequence'],
 ['Morrow Unplugged','Kiln','Block Power','Coordinate human radio without powered HUD','human-network'],
 ['A City That Remembers','The Foreman','Labor Ghost One','Recognize machinery replaying work cycles','work-memory'],
 ['Side B','Consequence','Breath Between Tracks','Rest and ask for help','recovery'],
 ['Route Reverse','Nyaxi and Patchwork','Misaligned Together','Recover original board parts','part-ownership'],
 ['The Honest Crack','Glassjaw and Rattle','Repair Visible','Expose visible and hidden failed joints','verification'],
 ['Seven Seconds Later','Echo Nail','Memory Is Not Consent','Turn a remembered impact into a brace','reframe'],
 ['Nobody Operating','The Foreman','Empty Shift','Add human witnesses to autonomous machinery','witnesses'],
 ['Catch the Floor','Load Shark','Choose Again','Save occupants and catch a floor','floor'],
 ['Assembly of One','Patchwork and the failing city network','Put Back Different','Build repairable assemblies with service joints','repair-together'],
 ['The Work Choir','Rattle and the Foreman','Hands Remember Why','Recover workers’ intention inside stored labor patterns','human-intention'],
 ['Return Integrity',"Nyaxi, Load Shark, and the Foreman's network",'Better Between','Complete a physical return route, never teleport','return'],
 ['Everybody Out','The Foreman','City Under My Wheels','Choose the floor over the boss and bring everybody home','everybody']
];
export const METAL_SEASON_ARCS=Object.freeze([
 {id:'streets',title:'The Streets Teach Metal Again',first:1,last:6,focus:'Listen and rescue before the rematch'},
 {id:'routes',title:'Control the Route',first:7,last:12,focus:'Anchor, prosthetic alignment, and safe momentum'},
 {id:'machine',title:'Morrow Is a Machine',first:13,last:18,focus:'Hidden support, failure and permanent city damage'},
 {id:'memory',title:'The City Fights Back',first:19,last:24,focus:'Human agency, work memory, rest and repair'},
 {id:'everybody',title:'Everybody Out',first:25,last:30,focus:'Shared command, return integrity, rescue and recovery'}
]);
export const METAL_SEASON_30=Object.freeze(EPISODES.map((a,i)=>Object.freeze({
 number:i+1,id:'s1e'+String(i+1).padStart(2,'0'),title:a[0],opposition:a[1],
 albumStem:a[2],finalePayoff:a[3],skillTag:a[4],
 arc:METAL_SEASON_ARCS.find(x=>i+1>=x.first&&i+1<=x.last).id,
 playableStatus:i===0?'first-push-segment':'design-only'
})));
export const METAL_SERIES_LOCKS=Object.freeze({
 hero:'Intsimbi “Metal” Solano',world:'Morrow City · Earth AID',
 prosthetic:'LEFT lower leg (lost at 16, predates Galaxy Gallium)',
 origin:'Second Thought · chooses life BEFORE Gallium intervenes at Dead Man’s Pipe',
 force:'All force, pressure and momentum retain a destination',
 board:'Four actual wheels, never a hoverboard; skating stays mechanical',
 gallium:'Finite living material partner; no double-spend of salvaged matter',
 movement:'PLACE → ANCHOR → LOAD → ALIGN → RELEASE → RECOVER; not teleportation',
 character:'Lil Heavy is an autonomous collaborator; his parts are not Metal’s ammunition',
 ending:'Catch the central floor; city evacuates and contains the Foreman; finished collaborative album',
 seasonOneSource:'Metal_InDa_RIFFT_Master_Archive_2026-09-11.md / S01 30 Episode Season Bible'
});
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const FIRST_PUSH=Object.freeze({
 episodeId:'s1e01',beat:'FIELD_RECORDING',title:'First Push · Concrete Has a Tempo',
 objective:'Skate to the neighborhood session and record the wheel-seam rhythm',
 requirement:'Real board active, grounded, rolling at least 0.8 world units/s, within 14m of the Skatepark',
 next:'Ballast robbery, awning rescue, engineering rematch and Nia’s response: not implemented'
});
export const FINAL_BEATS=Object.freeze([
 {id:'EVACUATE',title:'Clear the threatened districts',
  evidence:'verified civilian evacuation and safe exits'},
 {id:'READ_LOADS',title:'Map the structural burden',
  evidence:'physical support graph and known failed pathways'},
 {id:'ASSIGN_TEAM',title:'Give Morrow its own agency',
  evidence:'Tasha, Nia, Osei and Mari each perform a distinct verified task'},
 {id:'RETURN_ROUTE',title:'Ride the route that brings people home',
  evidence:'board, prosthetic and finite Gallium pass each physical Return'},
 {id:'CATCH_FLOOR',title:'Catch the floor instead of chasing the Foreman',
  evidence:'central floor physically held until occupants escape'},
 {id:'EVERYBODY_OUT',title:'Receive confirmation, then stop',
  evidence:'Tasha confirms all clear and Foreman contained by city network'},
 {id:'CITY_UNDER_MY_WHEELS',title:'Release the finished community album',
  evidence:'Metal survives; song includes people’s voices, work, wheel and silence'}
]);
// Final victory is an exact stage contract, not a fake boss HP bar.
// Scenes cannot claim completion from mere button presses or catalogue entries.
export function finaleGate(proof={}){
 const required=['evacuationVerified','loadPathsVerified','teamTasksVerified',
  'physicalReturnsVerified','floorHeldUntilClear','allClearConfirmed',
  'foremanContained','metalSurvived','communityAlbumCompleted'];
 return Object.freeze({ok:required.every(k=>proof[k]===true),
  missing:required.filter(k=>proof[k]!==true),required});
}
const empty=()=>({version:1,firstPush:false,recordedStems:[],epoch:0,lastEvent:null,
  episodeProgress:{s1e01:'NOT_STARTED'},finalePreviewSeen:false});
export function createMetalMold(saved=null){
 const s=empty();
 if(!saved||saved.version!==1||typeof saved!=='object')return s;
 if(saved.firstPush===true&&Array.isArray(saved.recordedStems)&&saved.recordedStems.includes('First Push')){
  s.firstPush=true;s.recordedStems=['First Push'];s.episodeProgress.s1e01='FIELD_RECORDING_DONE';
 }
 s.finalePreviewSeen=saved.finalePreviewSeen===true;
 return s;
}
export function metalMoldSnapshot(s){
 return {version:1,episodes:30,firstPush:s.firstPush,
  playableSegments:s.firstPush?['s1e01-field-recording-complete']:['s1e01-field-recording-available'],
  recordedStems:[...s.recordedStems],episodeProgress:{...s.episodeProgress},
  nextObjective:s.firstPush?'Ballast and awning rescue require real encounter implementation':FIRST_PUSH.objective,
  finaleUnlocked:false,finaleStatus:'planned-and-gated-not-playable',
  finalePreviewSeen:s.finalePreviewSeen};
}
export function attemptFirstPush(s,{position,skatepark,board,grounded,speed}={}){
 if(s.firstPush)return {ok:false,reason:'already-recorded'};
 if(!position||!skatepark||![position.x,position.z,skatepark.x,skatepark.z,speed].every(finite))
  return {ok:false,reason:'invalid-world-evidence'};
 if(dist(position,skatepark)>14)return {ok:false,reason:'reach-the-skatepark'};
 if(board!==true)return {ok:false,reason:'equip-the-real-four-wheel-board'};
 if(grounded!==true)return {ok:false,reason:'land-your-board'};
 if(speed<.8)return {ok:false,reason:'roll-across-a-seam'};
 s.firstPush=true;s.recordedStems=['First Push'];s.episodeProgress.s1e01='FIELD_RECORDING_DONE';
 s.lastEvent='first_push_recorded';s.epoch++;
 return {ok:true,beat:FIRST_PUSH.beat,track:'First Push',
  completedEpisode:false,unlockedAbilityIds:[],consequence:'The first city rhythm is archived'};
}
export function saveMetalMold(storage,s){
 if(!storage||typeof storage.setItem!=='function')return false;
 try{storage.setItem(METAL_MOLD_KEY,JSON.stringify({
  version:1,firstPush:s.firstPush,recordedStems:[...s.recordedStems],
  finalePreviewSeen:s.finalePreviewSeen
 }));return true}catch{return false}
}
export function loadMetalMold(storage){
 try{return createMetalMold(JSON.parse(storage?.getItem(METAL_MOLD_KEY)||'null'))}
 catch{return createMetalMold()}
}
