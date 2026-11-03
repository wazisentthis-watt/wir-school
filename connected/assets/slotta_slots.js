// WIR Connected: SLOTTA's original game-cartridge combat system.
// Eight installed games: three active ports, five backpack USB storage ports.
// All abilities and titles are original WIR concepts.
// Original WIR cartridge worlds; media references are inspiration, not copied assets.
export const SLOTTA_GAMES=[
 {id:'zero-sector',name:'Zero Sector',move:'Reality Grid',role:'arena',cooldown:9},
 {id:'fleshcode',name:'Fleshcode',move:'Adaptive Blades',role:'strike',cooldown:7},
 {id:'phasebound',name:'Phasebound',move:'Phase Shift',role:'evade',cooldown:8},
 {id:'shifting-department',name:'Shifting Department',move:'Telekinetic Launch',role:'control',cooldown:7},
 {id:'nanoforge',name:'Nanoforge',move:'Forge Drones',role:'summon',cooldown:10},
 {id:'gravity-children',name:'Gravity Children',move:'Gravity Well',role:'control',cooldown:9},
 {id:'tenfold',name:'Tenfold',move:'Beast Form',role:'transform',cooldown:12},
 {id:'elemental-outlaw',name:'Elemental Outlaw',move:'Energy Burst',role:'strike',cooldown:8}
];
export function createSlottaLoadout(){
 return {active:['zero-sector','nanoforge','gravity-children'],stored:['fleshcode','phasebound','shifting-department','tenfold','elemental-outlaw'],download:null,cooldowns:{},time:0};
}
export function swapSlot(loadout,activeIndex,storedIndex){
 if(!Number.isInteger(activeIndex)||activeIndex<0||activeIndex>=3||!Number.isInteger(storedIndex)||storedIndex<0||storedIndex>=5)return false;
 [loadout.active[activeIndex],loadout.stored[storedIndex]]=[loadout.stored[storedIndex],loadout.active[activeIndex]];return true;
}
export function beginDownload(loadout,replaceId,newGameId,duration=20){
 if(loadout.download||!SLOTTA_GAMES.some(g=>g.id===newGameId)||loadout.active.includes(newGameId)||loadout.stored.includes(newGameId))return false;
 const index=loadout.stored.indexOf(replaceId);if(index<0)return false;
 loadout.download={index,id:newGameId,remaining:Math.max(1,duration)};loadout.stored[index]=null;return true;
}
export function tickSlotta(loadout,dt){
 if(!Number.isFinite(dt)||dt<=0)return;loadout.time+=dt;
 for(const id of Object.keys(loadout.cooldowns))loadout.cooldowns[id]=Math.max(0,loadout.cooldowns[id]-dt);
 if(loadout.download){loadout.download.remaining-=dt;if(loadout.download.remaining<=0){loadout.stored[loadout.download.index]=loadout.download.id;loadout.download=null;}}
}
export function activateSlot(loadout,activeIndex){
 const id=loadout.active[activeIndex],game=SLOTTA_GAMES.find(g=>g.id===id);
 if(!game||loadout.cooldowns[id]>0)return null;loadout.cooldowns[id]=game.cooldown;return game;
}
