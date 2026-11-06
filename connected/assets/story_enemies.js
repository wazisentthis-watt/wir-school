// WIR Connected: Metal antagonist encounter design data.
// PROPOSAL / HOLD: roster is development material, NOT locked story canon.
// No encounters are spawned until gameplay integration and owner review.
export const STORY_ENEMIES = Object.freeze([
 {id:'ballast',name:'Ballast',arc:'early',style:'heavy',hp:1.8,speed:0.65,attack:'slam',weakness:'environment (globs, cars) — front is armored',status:'PROPOSAL',ep:1,title:'Concrete Has a Tempo'},
 {id:'slipline',name:'Slipline',arc:'mid',style:'evasive',hp:0.9,speed:1.55,attack:'flank',weakness:'intercept',status:'PROPOSAL',ep:2,title:'The Bill Moves'},
 {id:'glassjaw',name:'Glassjaw',arc:'mid',style:'counter',hp:1.1,speed:1.1,attack:'parry',weakness:'crack the fake plates first',status:'PROPOSAL',ep:3,title:'Strong Is Not Tough'},
 {id:'relay',name:'Relay',arc:'route-conflict',style:'tactical',hp:1.25,speed:1.2,attack:'route-control',weakness:'reposition',status:'PROPOSAL'},
 {id:'kairo',name:'Kairo Vale',arc:'second-thought',style:'mirror',hp:1.3,speed:1.35,attack:'movement-copy',weakness:'unpredictable-movement',status:'PROPOSAL',note:'Rival with an autonomy arc; not permanently evil'},
 {id:'foreman',name:'The Foreman',arc:'late',style:'boss',hp:3,speed:0.7,attack:'industrial-slam',weakness:'hazard-timing',status:'PROPOSAL'},
 {id:'nixo',name:'NIXO',arc:'future',style:'adaptive',hp:2.4,speed:1.4,attack:'adapt',weakness:'vary-moves',status:'PROPOSAL'},
 {id:'kiln',name:'Kiln',arc:'early',style:'heavy',hp:1.4,speed:0.9,attack:'heat',weakness:'Gallium globs cool him',status:'PROPOSAL',ep:4,title:'Temperature Geography'},
 {id:'echonail',name:'Echo Nail',arc:'early',style:'tactical',hp:1.1,speed:1.15,attack:'delayed-impact spikes',weakness:'move off / pull the spikes',status:'PROPOSAL',ep:5,title:'The Street Hits Twice'}
]);
export function getStoryEnemy(id){return STORY_ENEMIES.find(e=>e.id===id)||null;}
