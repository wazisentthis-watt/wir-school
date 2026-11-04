// WIR Connected Gorillium v3 · controller input adapter.
// Adapter is isolated from live main.js and saves. PROPOSAL / PUBLISH HOLD.
// Browser Gamepad API reports logical positions, not guaranteed physical labels.
export const PAD_ACTIONS=Object.freeze(['jump','dash','roar','slam','grapple','tentacle','glide','sprint','mode','pause','cataclysm','rage','footIK','tentIK']);
export const DEFAULT_BINDINGS=Object.freeze({jump:0,dash:1,roar:2,slam:3,grapple:4,tentacle:5,glide:6,sprint:7,mode:8,pause:9,cataclysm:12,rage:13,footIK:14,tentIK:15});
export const DEFAULT_PROFILE=Object.freeze({moveX:0,moveY:1,lookX:2,lookY:3,deadzone:.18,lookDeadzone:.14,sensitivity:1,turnSmoothing:14,invertLookY:false,invertMoveY:false,triggerThreshold:.35,bindings:DEFAULT_BINDINGS});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function controllerFamily(id=''){
 const n=String(id).toLowerCase();
 if(/xbox|xinput|microsoft|x-box/.test(n))return 'Xbox / XInput';
 if(/dualsense|dualshock|playstation|sony|vendor:\s*054c|^wireless controller$/.test(n))return 'PlayStation';
 if(/nintendo|switch|joy.con|joycon/.test(n))return 'Nintendo / Switch';
 if(/backbone/.test(n))return 'Backbone';
 if(/kishi|razer/.test(n))return 'Razer / Kishi';
 if(/gamesir/.test(n))return 'GameSir';
 if(/8bitdo/.test(n))return '8BitDo';
 return 'Gamepad API / custom';
}
export function sanitizedProfile(config={}){
 const z={...DEFAULT_PROFILE,...config};
 for(const k of ['moveX','moveY','lookX','lookY'])z[k]=Number.isInteger(z[k])&&z[k]>=0&&z[k]<=9?z[k]:DEFAULT_PROFILE[k];
 z.deadzone=clamp(Number.isFinite(+z.deadzone)?+z.deadzone:.18,.02,.45);
 z.lookDeadzone=clamp(Number.isFinite(+z.lookDeadzone)?+z.lookDeadzone:.14,.02,.45);
 z.sensitivity=clamp(Number.isFinite(+z.sensitivity)?+z.sensitivity:1,.25,3);
 z.turnSmoothing=clamp(Number.isFinite(+z.turnSmoothing)?+z.turnSmoothing:14,2,40);
 z.triggerThreshold=clamp(Number.isFinite(+z.triggerThreshold)?+z.triggerThreshold:.35,.1,.95);
 z.invertLookY=!!z.invertLookY;z.invertMoveY=!!z.invertMoveY;z.bindings={};
 for(const action of PAD_ACTIONS){const n=config?.bindings?.[action];
  z.bindings[action]=n===null?null:Number.isInteger(n)&&n>=0&&n<=31?n:DEFAULT_BINDINGS[action];}
 return z;
}
export function radialStick(x=0,y=0,dz=.18){
 x=Number.isFinite(x)?clamp(x,-1,1):0;y=Number.isFinite(y)?clamp(y,-1,1):0;
 const mag=Math.hypot(x,y);if(mag<=dz)return {x:0,y:0};
 const scaled=clamp((mag-dz)/(1-dz),0,1),factor=scaled/mag;
 return {x:x*factor,y:y*factor};
}
export function buttonDown(pad,index,threshold=.35){
 if(index===null||index===undefined)return false;
 const b=pad?.buttons?.[index];return !!(b&&(b.pressed||Number(b.value)>threshold));
}
export function padKey(pad){return [String(pad?.id||'unknown').slice(0,128),pad?.mapping||'',pad?.axes?.length||0,pad?.buttons?.length||0].join('|');}
export function snapshot(pad){return {id:String(pad?.id||'Unknown controller'),family:controllerFamily(pad?.id),mapping:pad?.mapping||'non-standard',
 axisCount:pad?.axes?.length||0,buttonCount:pad?.buttons?.length||0,
 axes:Array.from(pad?.axes||[],v=>Number.isFinite(v)?Math.round(v*1000)/1000:0),
 pressed:Array.from(pad?.buttons||[],(b,i)=>(b?.pressed||b?.value>.35)?i:null).filter(n=>n!==null)};}
export class ControllerAdapter{
 constructor({storage=null,keyPrefix='wir_gorillium_controller_v3_'}={}){
  this.storage=storage;this.keyPrefix=keyPrefix;this.profile=sanitizedProfile();this.padId=null;this.prev=new Set();this.lookX=0;this.lookY=0;this.lastActive=null;
 }
 load(pad){const key=padKey(pad);if(key===this.padId)return false;
  this.padId=key;this.prev=new Set();this.lookX=0;this.lookY=0;
  try{const stored=this.storage?.getItem(this.keyPrefix+key);this.profile=sanitizedProfile(stored?JSON.parse(stored):{});}
  catch{this.profile=sanitizedProfile();}return true;
 }
 save(){if(!this.padId||!this.storage?.setItem)return false;
  try{this.storage.setItem(this.keyPrefix+this.padId,JSON.stringify(this.profile));return true;}catch{return false;}}
 reset(){this.profile=sanitizedProfile();this.prev.clear();this.lookX=0;this.lookY=0;return this.save();}
 configure(update){this.profile=sanitizedProfile({...this.profile,...update,bindings:{...this.profile.bindings,...(update?.bindings||{})}});return this.profile;}
 disconnect(){this.padId=null;this.prev.clear();this.lookX=0;this.lookY=0;this.lastActive=null;}
 poll(pad,dt=1/60,{suppressActions=false}={}){
  if(!pad||pad.connected===false){this.disconnect();return {connected:false,x:0,y:0,lookX:0,lookY:0,held:[],edges:[],snapshot:null};}
  const changed=this.load(pad),p=this.profile,a=i=>Number(pad.axes?.[i]||0);
  const move=radialStick(a(p.moveX),a(p.moveY),p.deadzone);
  const look=radialStick(a(p.lookX),a(p.lookY),p.lookDeadzone);
  const time=clamp(Number.isFinite(dt)?dt:1/60,0,.08),alpha=1-Math.exp(-p.turnSmoothing*time);
  this.lookX+=(look.x*p.sensitivity-this.lookX)*alpha;
  this.lookY+=((p.invertLookY?-1:1)*look.y*p.sensitivity-this.lookY)*alpha;
  const held=PAD_ACTIONS.filter(action=>buttonDown(pad,p.bindings[action],p.triggerThreshold));
  const next=new Set(held),edges=changed||suppressActions?[]:held.filter(a=>!this.prev.has(a));
  this.prev=next;this.lastActive=snapshot(pad);
  return {connected:true,x:move.x,y:(p.invertMoveY?-1:1)*move.y,
   lookX:suppressActions?0:this.lookX,lookY:suppressActions?0:this.lookY,
   held:suppressActions?[]:held,edges,snapshot:this.lastActive,profile:p};
 }
}
