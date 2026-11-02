// WIR Connected: Metal antagonist encounter design data.
// PROPOSAL / HOLD: roster is development material, NOT locked story canon.
// No encounters are spawned until gameplay integration and owner review.
export const STORY_ENEMIES = Object.freeze([
 {id:'ballast',name:'Ballast',arc:'early',style:'heavy',hp:1.8,speed:0.65,attack:'slam',weakness:'dodge-and-counter',status:'PROPOSAL'},
 {id:'slipline',name:'Slipline',arc:'mid',style:'evasive',hp:0.9,speed:1.55,attack:'flank',weakness:'intercept',status:'PROPOSAL'},
 {id:'glassjaw',name:'Glassjaw',arc:'mid',style:'counter',hp:1.1,speed:1.1,attack:'parry',weakness:'feint-and-guard-break',status:'PROPOSAL'},
 {id:'relay',name:'Relay',arc:'route-conflict',style:'tactical',hp:1.25,speed:1.2,attack:'route-control',weakness:'reposition',status:'PROPOSAL'},
 {id:'kairo',name:'Kairo Vale',arc:'second-thought',style:'mirror',hp:1.3,speed:1.35,attack:'movement-copy',weakness:'unpredictable-movement',status:'PROPOSAL',note:'Rival with an autonomy arc; not permanently evil'},
 {id:'foreman',name:'The Foreman',arc:'late',style:'boss',hp:3,speed:0.7,attack:'industrial-slam',weakness:'hazard-timing',status:'PROPOSAL'},
 {id:'nixo',name:'NIXO',arc:'future',style:'adaptive',hp:2.4,speed:1.4,attack:'adapt',weakness:'vary-moves',status:'PROPOSAL'}
]);
export function getStoryEnemy(id){return STORY_ENEMIES.find(e=>e.id===id)||null;}
