// WIR Connected: opt-in controller v3 adapter. PROPOSAL / PUBLISH HOLD.
// Existing physical LB/RB/LT/RT chords remain owned by the world input loop.
import {ControllerAdapter,controllerFamily} from '../gorillium-lab/controller_core.mjs';
export const CONNECTED_ACTION_KEYS=Object.freeze({
 jump:'Space',dash:'KeyB',roar:'Numpad4',slam:'Numpad6',
 mode:'KeyM',pause:'KeyP',cataclysm:'KeyE',rage:'KeyX',
 footIK:'Numpad1',tentIK:'Numpad3'
});
export const CONNECTED_ACTION_NAMES=Object.freeze({
 jump:'Jump / recover',dash:'Board / dodge',roar:'Left punch',slam:'Right punch',
 mode:'Map',pause:'Profile',cataclysm:'Interact',rage:'Root slab',
 footIK:'Left kick',tentIK:'Right kick'
});
const RESERVED=new Set([4,5,6,7]);
export function gamepadV3Enabled(search=''){
 try{return new URLSearchParams(search).get('controller_v3')==='1';}
 catch{return false;}
}
export function createConnectedControllerV3({storage=null}={}){
 const adapter=new ControllerAdapter({storage});
 let prevKeys=new Set(),currentPad=null,frames=0,lastMove={x:0,y:0};
 let learningAction=null,learningPrev=new Set();
 const release=keys=>{for(const k of prevKeys)keys[k]=false;prevKeys.clear();};
 function poll(pad,dt,{keys,pressed,lookEnabled=true,applyCamera=()=>{}}={}){
  if(!keys||!pressed)throw Error('Key and press tables are required');
  if(!pad||pad.connected===false){release(keys);adapter.disconnect();currentPad=null;
   learningAction=null;learningPrev.clear();lastMove={x:0,y:0};return null;}
  currentPad=pad;
  if(learningAction){
   const down=new Set(Array.from(pad.buttons||[],(b,i)=>b?.pressed||b?.value>.6?i:null)
    .filter(i=>i!==null));
   const candidate=[...down].find(i=>!learningPrev.has(i)&&!RESERVED.has(i));
   learningPrev=down;
   const report=adapter.poll(pad,dt,{suppressActions:true});
   release(keys);lastMove={x:0,y:0};
   if(candidate!==undefined){adapter.configure({bindings:{[learningAction]:candidate}});
    adapter.save();learningAction=null;learningPrev.clear();}
   return {...lastMove,id:pad.id,calibrating:true,profile:report.profile};
  }
  const report=adapter.poll(pad,dt);
  const next=new Set();
  for(const action of report.held){
   const idx=adapter.profile.bindings[action],key=CONNECTED_ACTION_KEYS[action];
   if(key&&!RESERVED.has(idx))next.add(key);
  }
  for(const key of prevKeys)if(!next.has(key))keys[key]=false;
  for(const key of next){if(!prevKeys.has(key))pressed[key]=true;keys[key]=true;}
  prevKeys=next;lastMove={x:report.x,y:report.y};
  if(lookEnabled)applyCamera(report.lookX,report.lookY,dt);
  frames++;return {...lastMove,id:pad.id,calibrating:false,profile:report.profile};
 }
 function startLearning(action){
  if(!(action in CONNECTED_ACTION_KEYS)||!currentPad)return false;
  learningAction=action;
  learningPrev=new Set(Array.from(currentPad.buttons||[],(b,i)=>b?.pressed||b?.value>.6?i:null)
   .filter(i=>i!==null));return true;
 }
 function cancelLearning(){learningAction=null;learningPrev.clear();}
 return {
  adapter,poll,startLearning,cancelLearning,
  configure:update=>{cancelLearning();const p=adapter.configure(update);adapter.save();return p;},
  reset:()=>{cancelLearning();adapter.reset();return adapter.profile;},
  status:()=>({connected:!!currentPad,id:String(currentPad?.id||'No controller detected'),
   family:controllerFamily(currentPad?.id||''),index:currentPad?.index??null,
   mapping:currentPad?.mapping||'unknown',buttonCount:currentPad?.buttons?.length||0,
   axisCount:currentPad?.axes?.length||0,learningAction,frameCount:frames,
   move:{...lastMove},bindings:{...adapter.profile.bindings},deadzone:adapter.profile.deadzone,
   lookDeadzone:adapter.profile.lookDeadzone,invertLookY:adapter.profile.invertLookY})
 };
}
export function installConnectedControllerPanel(bridge,{documentRef=document}={}){
 const d=documentRef,box=d.createElement('details');box.id='connected-controller-v3-panel';
 box.style.cssText='position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:100;max-width:min(92vw,350px);max-height:65vh;overflow:auto;background:#121021ee;border:1px solid #9868ea;border-radius:12px;color:#f9efff;font:12px system-ui;padding:8px;box-shadow:0 4px 18px #0009';
 const summary=d.createElement('summary');summary.textContent='Controller v3 TEST · settings';box.append(summary);
 const status=d.createElement('p');status.textContent='Press a paired controller button to connect.';box.append(status);
 const desc=d.createElement('p');desc.textContent='LB grab · RB swing · LT charge · RT RIFFT Step. These four physical buttons stay reserved; this mode is opt-in only.';box.append(desc);
 const sliders=[];
 function slider(label,key,min,max,step){
  const row=d.createElement('label');row.style.cssText='display:block;margin:8px 0';row.textContent=label+' ';
  const range=d.createElement('input');range.type='range';range.min=String(min);range.max=String(max);range.step=String(step);range.value=String(bridge.adapter.profile[key]);range.setAttribute('aria-label',label);
  const value=d.createElement('span');value.textContent=range.value;
  range.addEventListener('input',()=>{value.textContent=range.value;bridge.configure({[key]:Number(range.value)});});
  row.append(range,value);box.append(row);sliders.push({range,value,key});
 }
 slider('Move deadzone','deadzone',.02,.45,.01);
 slider('Camera deadzone','lookDeadzone',.02,.45,.01);
 slider('Camera sensitivity','sensitivity',.25,3,.05);
 const invert=d.createElement('label'),checkbox=d.createElement('input');checkbox.type='checkbox';checkbox.checked=bridge.adapter.profile.invertLookY;
 checkbox.addEventListener('change',()=>bridge.configure({invertLookY:checkbox.checked}));
 invert.append(checkbox,d.createTextNode(' Invert right-stick Y'));box.append(invert);
 const select=d.createElement('select');select.setAttribute('aria-label','Action to remap');select.style.cssText='max-width:55%;background:#292044;color:white';
 for(const [action,name] of Object.entries(CONNECTED_ACTION_NAMES)){const option=d.createElement('option');option.value=action;option.textContent=name;select.append(option);}
 const learn=d.createElement('button');learn.type='button';learn.textContent='Learn button';
 learn.addEventListener('click',()=>{if(bridge.startLearning(select.value))status.textContent='Press an unreserved button for '+CONNECTED_ACTION_NAMES[select.value];});
 box.append(select,learn);
 const reset=d.createElement('button');reset.type='button';reset.textContent='Reset to default';reset.style.marginLeft='6px';
 reset.addEventListener('click',()=>{bridge.reset();for(const it of sliders){it.range.value=String(bridge.adapter.profile[it.key]);it.value.textContent=it.range.value;}checkbox.checked=bridge.adapter.profile.invertLookY;});
 box.append(reset);d.body.append(box);
 let last=0;
 function refresh(now=0){if(now-last<300)return;last=now;const s=bridge.status();
  status.textContent=s.learningAction?'Press button to remap '+CONNECTED_ACTION_NAMES[s.learningAction]+' (LB/RB/LT/RT reserved)':
   s.connected?s.id+' | '+s.family+' | '+s.axisCount+' axes, '+s.buttonCount+' buttons':
   'No controller detected. Pair controller, then press a button.';
 }
 return {element:box,refresh};
}
