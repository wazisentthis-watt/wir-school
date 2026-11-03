// WIR Metal story engine v1. Independent of Three.js; checkpoints are explicit.
// A saved checkpoint records stable progress, not transient combat physics.
export const METAL_STORY_VERSION=1;
export const METAL_CHAPTERS=Object.freeze([
 {id:'awakening',title:'01 · Metal Awakens',objective:'Reach the Skatepark checkpoint',checkpoint:'skate'},
 {id:'phantom',title:'02 · Phantom Engine',objective:'Defeat SLOTTA or capture him',checkpoint:'boss'},
 {id:'aftershock',title:'03 · Aftershock',objective:'Return to the home safehouse',checkpoint:'home'},
 {id:'free-roam',title:'04 · Morrow City',objective:'Explore Morrow City and await the next chapter',checkpoint:'home'}
]);
export function createMetalStory(data=null){
 const valid=data&&data.version===METAL_STORY_VERSION&&Number.isInteger(data.chapter)&&data.chapter>=0&&data.chapter<METAL_CHAPTERS.length;
 const s={version:METAL_STORY_VERSION,chapter:valid?data.chapter:0,flags:valid&&data.flags&&typeof data.flags==='object'?{...data.flags}:{},checkpoint:valid&&data.checkpoint?data.checkpoint:null,updatedAt:valid?data.updatedAt||null:null};
 return s;
}
export function advanceMetalStory(s,event){
 const expected=['skate_reached','slotta_resolved','home_returned'];
 if(s.chapter>=expected.length||event!==expected[s.chapter])return false;
 s.flags[event]=true;s.chapter++;return true;
}
export function metalStoryChapter(s){return METAL_CHAPTERS[s.chapter]||METAL_CHAPTERS[0];}
export function makeMetalCheckpoint(s,position,reason){
 if(!position||!['x','y','z'].every(k=>Number.isFinite(position[k])))throw new Error('Invalid checkpoint position');
 return {version:METAL_STORY_VERSION,chapter:s.chapter,flags:{...s.flags},checkpoint:{position:{x:position.x,y:position.y,z:position.z},reason:String(reason||'checkpoint').slice(0,100)},updatedAt:Date.now()};
}
export function readMetalCheckpoint(storage,key='wir_metal_story_v1'){
 try{return createMetalStory(JSON.parse(storage.getItem(key)||'null'));}catch{return createMetalStory();}
}
export function writeMetalCheckpoint(storage,s,position,reason,key='wir_metal_story_v1'){
 const saved=makeMetalCheckpoint(s,position,reason);
 try{storage.setItem(key,JSON.stringify(saved));Object.assign(s,saved);return true;}catch{return false;}
}
