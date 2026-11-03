// WIR Connected: SLOTTA's original game-cartridge combat system.
// Eight installed games: three active ports, five backpack USB storage ports.
// All abilities and titles are original WIR concepts.
export const SLOTTA_GAMES=[
 {id:'slither-master',name:'Slither Master',move:'Circuit Serpents',role:'suppress',cooldown:6},
 {id:'ninja-star',name:'Ninja Star',move:'Cyborg Clone',role:'summon',cooldown:9},
 {id:'phantom-racer',name:'Phantom Racer',move:'Afterimage Dash',role:'evade',cooldown:5},
 {id:'iron-arena',name:'Iron Arena',move:'Impact Gauntlet',role:'strike',cooldown:7},
 {id:'ghost-frequency',name:'Ghost Frequency',move:'Signal Jam',role:'jam',cooldown:8},
 {id:'beast-byte',name:'Beast Byte',move:'Predator Drone',role:'summon',cooldown:11},
 {id:'gravity-jam',name:'Gravity Jam',move:'Gravity Pulse',role:'control',cooldown:10},
 {id:'tower-zero',name:'Tower Zero',move:'Shield Tower',role:'defend',cooldown:12}
];
export function createSlottaLoadout(){
 return {active:['slither-master','ninja-star','phantom-racer'],stored:['iron-arena','ghost-frequency','beast-byte','gravity-jam','tower-zero'],download:null,cooldowns:{},time:0};
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
