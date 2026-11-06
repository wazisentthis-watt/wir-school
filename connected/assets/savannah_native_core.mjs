// WIR Connected native Savannah mission core. PROPOSAL / PUBLISH HOLD.
// No legacy save keys are read or written here.
export const CHAPTERS=Object.freeze([
{id:'river',title:'07 · Riverfront Resonance',boss:'Brine Broker',allies:['Ayo','Sana'],citizens:3,repairs:2},
{id:'marsh',title:'08 · Marshline Signal',boss:'Ledger Wraith',allies:['Binta','Zola'],citizens:3,repairs:2,pattern:'jam',hp:135},
{id:'ballast',title:'01 · Shift Change',boss:'Ballast',allies:[],citizens:3,repairs:2,pattern:'brace',hp:115},
{id:'kiln',title:'02 · Heat Line',boss:'Kiln',allies:[],citizens:3,repairs:2,pattern:'heat',hp:125},
{id:'glassjaw',title:'03 · False Supports',boss:'Glassjaw',allies:[],citizens:3,repairs:2,pattern:'brittle',hp:135},
{id:'patchwork',title:'04 · Ghost Wires',boss:'Patchwork',allies:[],citizens:3,repairs:2,pattern:'jam',hp:140},
{id:'loadshark',title:'05 · The Price of Force',boss:'Load Shark',allies:[],citizens:3,repairs:2,pattern:'redirect',hp:150},
{id:'foreman',title:'06 · Six Arms, One City',boss:'The Foreman',allies:[],citizens:4,repairs:3,pattern:'infrastructure',hp:185}]);
export const ALLIES=Object.freeze({
Ayo:{name:'Ayo "Tidewire" Mensah',power:'Stabilize a damaged node'},
Sana:{name:'Sana "Backbeat" Diallo',power:'Stun and disrupt the boss'},
Binta:{name:'Binta "Mossline" Sarr',power:'Expose structural weaknesses'},
Zola:{name:'Zola "Railbird" Ndlovu',power:'Evacuate one recruited civilian'}});
export const createSavannahState=()=>({active:false,chapter:-1,phase:'idle',allies:[],citizens:[],repairs:[],bossHp:100,bossMaxHp:100,city:100,player:100,weak:0,stun:0,allyCooldown:{},completed:[],message:'Optional Savannah chapters ready.',events:[]});
function event(s,msg){s.message=msg;s.events.push(msg);if(s.events.length>25)s.events.shift();}
export function beginSavannah(s,index){if(!Number.isInteger(index)||index<0||index>=CHAPTERS.length)return false;
s.active=true;s.chapter=index;s.phase='playing';s.citizens=Array.from({length:CHAPTERS[index].citizens},(_,id)=>({id,mode:'waiting',hp:100}));
s.repairs=Array.from({length:CHAPTERS[index].repairs},(_,id)=>({id,progress:0,done:false}));s.bossHp=CHAPTERS[index].hp??(index?135:110);s.bossMaxHp=s.bossHp;s.city=100;s.player=100;s.bossTelegraph=0;s.jammed=0;s.weak=0;s.stun=0;s.allyCooldown={};
event(s,CHAPTERS[index].title+' started: recruit, repair, rescue and defeat '+CHAPTERS[index].boss);return true;}
export function recruitAlly(s,name){if(!s.active||s.phase!=='playing'||!CHAPTERS[s.chapter].allies.includes(name)||s.allies.includes(name))return false;s.allies.push(name);event(s,ALLIES[name].name+' joined METAL.');return true;}
export function collectCitizen(s,id){const c=s.citizens[id];if(s.phase!=='playing'||!c||c.mode!=='waiting')return false;c.mode='following';event(s,'Citizen '+(id+1)+' following. Escort to the cyan refuge.');return true;}
export function evacuateCitizen(s,id){const c=s.citizens[id];if(!c||c.mode!=='following')return false;c.mode='safe';event(s,'Citizen '+(id+1)+' evacuated.');checkVictory(s);return true;}
export function repairNode(s,id,amount){const r=s.repairs[id];if(s.phase!=='playing'||!r||r.done||!Number.isFinite(amount)||amount<=0)return false;
r.progress=Math.min(1,r.progress+amount);if(r.progress>=1){r.done=true;s.city=Math.min(100,s.city+12);event(s,'Network node '+(id+1)+' repaired.');}checkVictory(s);return true;}
export function damageBoss(s,amount,{scanned=false}={}){if(s.phase!=='playing'||!Number.isFinite(amount)||amount<=0)return false;
const pattern=CHAPTERS[s.chapter].pattern;
const exposed=Boolean(scanned||s.weak>0);
let multiplier=exposed?1.6:1;
if(pattern==='brace'&&!exposed)multiplier*=.6;
if(pattern==='brittle')multiplier*=exposed?1.3:.68;
if(pattern==='infrastructure'&&s.repairs.some(r=>!r.done))multiplier*=.58;
if(pattern==='redirect'&&!exposed)damageCity(s,Math.min(8,amount*.18));
if(s.phase!=='playing')return false;
s.bossHp=Math.max(0,s.bossHp-amount*multiplier);if(s.bossHp===0)event(s,CHAPTERS[s.chapter].boss+' disabled. Finish rescuing the city.');checkVictory(s);return true;}
export function damageCity(s,amount){if(s.phase!=='playing'||!Number.isFinite(amount)||amount<=0)return false;s.city=Math.max(0,s.city-amount);if(s.city===0){s.phase='failed';event(s,'City integrity lost. Retry the chapter.');}return true;}
export function damagePlayer(s,amount){if(s.phase!=='playing'||!Number.isFinite(amount)||amount<=0)return false;s.player=Math.max(0,s.player-amount);if(s.player===0){s.phase='failed';event(s,'METAL overwhelmed. Retry the chapter.');}return true;}
export function citizenHit(s,id,amount){const c=s.citizens[id];if(s.phase!=='playing'||!c||c.mode==='safe'||c.mode==='injured'||!Number.isFinite(amount)||amount<=0)return false;
c.hp=Math.max(0,c.hp-amount);if(c.hp===0){c.mode='injured';damageCity(s,12);event(s,'Citizen '+(id+1)+' needs help.');}return true;}
export function reviveCitizen(s,id){const c=s.citizens[id];if(!c||c.mode!=='injured')return false;c.hp=40;c.mode='following';event(s,'Citizen '+(id+1)+' recovered.');return true;}
export function useAlly(s,name){if(s.phase!=='playing'||!s.allies.includes(name)||s.allyCooldown[name]>0)return false;
s.allyCooldown[name]={Ayo:14,Sana:12,Binta:15,Zola:18}[name];
if(name==='Ayo'){const r=s.repairs.find(r=>!r.done);if(r)repairNode(s,r.id,.6);else s.city=Math.min(100,s.city+8);}
if(name==='Sana'){s.stun=Math.max(s.stun,5);damageBoss(s,12);}
if(name==='Binta')s.weak=Math.max(s.weak,9);
if(name==='Zola'){const c=s.citizens.find(c=>c.mode==='following');if(c)evacuateCitizen(s,c.id);else s.city=Math.min(100,s.city+7);}
event(s,ALLIES[name].name+' activated '+ALLIES[name].power+'.');checkVictory(s);return true;}
export function tickSavannah(s,dt){if(s.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;s.jammed=Math.max(0,(s.jammed||0)-dt);s.bossTelegraph=Math.max(0,(s.bossTelegraph||0)-dt);s.weak=Math.max(0,s.weak-dt);s.stun=Math.max(0,s.stun-dt);for(const k of Object.keys(s.allyCooldown))s.allyCooldown[k]=Math.max(0,s.allyCooldown[k]-dt);}
export const missionCounts=s=>({safe:s.citizens.filter(c=>c.mode==='safe').length,total:s.citizens.length,repairs:s.repairs.filter(r=>r.done).length,required:s.repairs.length,boss:s.bossHp});
export function checkVictory(s){if(s.phase!=='playing')return false;const c=missionCounts(s);if(c.safe===c.total&&c.repairs===c.required&&s.bossHp===0){s.phase='complete';if(!s.completed.includes(s.chapter))s.completed.push(s.chapter);event(s,CHAPTERS[s.chapter].title+' complete.');return true;}return false;}

export const CAMPAIGN_ORDER=Object.freeze([2,3,4,5,6,7,0,1]);
export const campaignChapter=(ordinal)=>CHAPTERS[CAMPAIGN_ORDER[ordinal]]??null;
// Boss patterns damage the environment differently; readable wind-ups are handled by the 3D bridge.
export function bossPressure(s,near=false,braced=false){
 if(s.phase!=='playing'||s.bossHp<=0||s.stun>0)return false;
 const pattern=CHAPTERS[s.chapter].pattern;
 const cityLoss={brace:3,heat:6,brittle:5,jam:4,redirect:7,infrastructure:8}[pattern]??4;
 damageCity(s,Math.max(0,cityLoss-(s.repairs.filter(r=>r.done).length*1.5)));
 if(near&&s.phase==='playing')damagePlayer(s,braced?2:pattern==='brace'?13:pattern==='heat'?11:9);
 if(pattern==='jam'){s.jammed=3;event(s,'Resonance scramble · repair systems briefly jammed.');}
 if(pattern==='heat')event(s,'Kiln heat wave · avoid the hot zone and use bracing.');
 if(pattern==='redirect')event(s,'Load Shark transferred force into city infrastructure. Scan before striking.');
 if(pattern==='infrastructure')event(s,'The Foreman activated city machinery. Repair nodes weaken his armor.');
 return true;
}
export function scanBoss(s){
 if(s.phase!=='playing'||s.bossHp<=0)return false;s.weak=Math.max(s.weak,7);
 event(s,'Crown scan · '+CHAPTERS[s.chapter].boss+' weakness exposed for 7 seconds.');return true;
}
