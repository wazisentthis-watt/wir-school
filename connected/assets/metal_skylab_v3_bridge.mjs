// WIR Connected: METAL Savannah 3D / SkyLab V3 controller integration.
// Opt-in gameplay adapter on top of the existing Gorillium controller core.
// No mission/save mutations; leave original controller mode available.
// PROPOSAL / PUBLISH HOLD.
import {ControllerAdapter, DEFAULT_BINDINGS} from '../gorillium-lab/controller_core.mjs';
export const SKYLAB_BUTTONS=Object.freeze({
  jump:0,dash:1,roar:2,slam:3,tentacle:4,grapple:5,sprint:6,glide:7,
  pause:9,cataclysm:12,rage:13,footIK:14,tentIK:15,mode:8
});
// A held SkyLab-only grab must never leak when the player selects Classic controls.
export function shouldGripWorld({mode='classic',lb=false,keyboard=false,v3Held=false}={}){
 return !!(lb||keyboard||(mode==='skylab'&&v3Held));
}
export const SKYLAB_MOVES=Object.freeze([
  {id:'grapple',label:'Gallium tether · supported anchor'},
  {id:'pulse',label:'Gallium pulse · grounded'},
  {id:'flight',label:'Merkaba flight · airborne'},
  {id:'board',label:'Skateboard'},
  {id:'riff',label:'RIFFT Step · momentum route'},
  {id:'blast',label:'Metal blast · needs Gallium'}
]);
const STORE='wir-connected-metal-v3-settings';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function storageRead(storage){try{return JSON.parse(storage?.getItem(STORE)||'null')||{};}catch{return {};}}
function safeSave(storage,value){try{storage?.setItem(STORE,JSON.stringify(value));}catch{}}
export function createSavannahMetalController({storage=(typeof localStorage==='undefined'?null:localStorage),doc=(typeof document==='undefined'?null:document),onMessage=()=>{}}={}){
 const previous=storageRead(storage);
 const core=new ControllerAdapter({storage,keyPrefix:'wir_connected_metal_xbox_v3_'});
 let mode=previous.mode==='classic'?'classic':'skylab',selected=0,paused=false,menuSeconds=0,menuFired=false,connected=false,frames=0,remap=null;
 let panel=null,display=null,modeControl=null,deadzone=null,sensitivity=null,lookSensitivity=null,buttonSelector=null,axisSelectors={},status=null,remapWaitRelease=false;
 const note=s=>{try{onMessage(s);}catch{}};
 function save(){safeSave(storage,{...storageRead(storage),mode});}
 function setMode(next){if(next!=='classic'&&next!=='skylab')return;mode=next;paused=false;menuSeconds=0;menuFired=false;save();if(modeControl)modeControl.value=next;note('Controller: '+(next==='classic'?'Classic Savannah':'Metal SkyLab V3'));}
 function mount(){
  if(!doc?.body)return;
  const open=doc.createElement('button');open.id='metalV3ControllerButton';open.type='button';open.textContent='🎮 Metal Controller';open.setAttribute('aria-label','Metal Xbox controller calibration');
  open.style.cssText='position:fixed;bottom:16px;right:12px;z-index:32;pointer-events:auto;border:1px solid #9572d8;border-radius:10px;background:#231636;color:#f8efff;padding:9px;font:700 12px system-ui';
  panel=doc.createElement('section');panel.id='metalV3ControllerPanel';panel.setAttribute('aria-label','Metal Xbox Bluetooth controller settings');
  panel.style.cssText='position:fixed;right:10px;bottom:58px;z-index:70;width:min(335px,calc(100vw - 20px));max-height:75vh;overflow:auto;background:#120d22f5;color:#f9f5ff;border:1px solid #9572d8;border-radius:12px;padding:12px;display:none;font:12px/1.55 system-ui;pointer-events:auto';
  const title=doc.createElement('div');title.textContent='🎮 METAL: SAVANNAH • SKYLAB V3';title.style.fontWeight='bold';panel.append(title);
  display=doc.createElement('div');display.textContent='Controller not detected';display.setAttribute('role','status');display.style='margin:7px 0;color:#d7baff;overflow-wrap:anywhere';panel.append(display);
  const label=doc.createElement('label');label.textContent='Controller mode: ';
  modeControl=doc.createElement('select');for(const [v,t] of [['skylab','SkyLab V3 (Xbox flight)'],['classic','Classic Savannah controls']]){const op=doc.createElement('option');op.value=v;op.textContent=t;modeControl.append(op);}modeControl.value=mode;modeControl.onchange=()=>setMode(modeControl.value);label.append(modeControl);panel.append(label);
  const help=doc.createElement('div');help.style='padding:7px;margin:8px 0;border:1px solid #4e3b69;border-radius:8px';
  help.textContent='A jump · B dodge/brake · X strike · Y 360° spin · L1 Gallium pulse · R1 swing · L2 combo · R2 flight · D-pad select & cast · L2+A kickflip · L2+X Gallium strike · hold Menu 0.8s pause · No L3/R3 required. Airborne Gallium platforms and full Gorillium animation remain development features.';panel.append(help);
  const range=(name,min,max,step,val,cb)=>{const row=doc.createElement('label');row.style='display:block;margin:5px 0';row.textContent=name+' ';const control=doc.createElement('input');control.type='range';control.min=min;control.max=max;control.step=step;control.value=val;control.oninput=()=>cb(+control.value);row.append(control);panel.append(row);return control;};
  deadzone=range('Deadzone',.02,.45,.01,.18,v=>{core.configure({deadzone:v});core.save();});
  sensitivity=range('Move sensitivity',.25,3,.05,1,v=>{core.configure({sensitivity:v});core.save();});
  lookSensitivity=range('Camera smoothing',2,40,1,14,v=>{core.configure({turnSmoothing:v});core.save();});
  const invert=doc.createElement('label');invert.textContent='Invert camera Y ';const check=doc.createElement('input');check.type='checkbox';check.onchange=()=>{core.configure({invertLookY:check.checked});core.save();};invert.append(check);panel.append(invert);
  const axes=doc.createElement('div');axes.style='display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:8px 0';
  for(const [key,name] of [['moveX','Left X'],['moveY','Left Y'],['lookX','Right X'],['lookY','Right Y']]){
    const row=doc.createElement('label');row.textContent=name+' ';const sel=doc.createElement('select');for(let i=0;i<10;i++){const o=doc.createElement('option');o.value=i;o.textContent='Axis '+i;sel.append(o);}
    sel.onchange=()=>{core.configure({[key]:Number(sel.value)});core.save();};row.append(sel);axes.append(row);axisSelectors[key]=sel;
  }panel.append(axes);
  const actions=doc.createElement('div');actions.textContent='Remap face/shoulder/D-pad button: ';
  buttonSelector=doc.createElement('select');for(const action of Object.keys(SKYLAB_BUTTONS)){if(action==='mode')continue;const o=doc.createElement('option');o.value=action;o.textContent=action;buttonSelector.append(o);}actions.append(buttonSelector);panel.append(actions);
  const listen=doc.createElement('button');listen.textContent='Listen for button';listen.onclick=()=>{remap=buttonSelector.value;remapWaitRelease=true;note('Release all controller buttons, then press your button for '+remap);};panel.append(listen);
  const reset=doc.createElement('button');reset.textContent='Reset Xbox mapping';reset.onclick=()=>{core.configure({bindings:{...SKYLAB_BUTTONS},deadzone:.18,sensitivity:1,turnSmoothing:14,moveX:0,moveY:1,lookX:2,lookY:3,invertLookY:false});core.save();refreshPanel();};panel.append(reset);
  const close=doc.createElement('button');close.textContent='Close';close.onclick=()=>panel.style.display='none';panel.append(close);
  const foot=doc.createElement('div');foot.textContent='Controller settings only; Metal missions and saves are unchanged. PROPOSAL / PUBLISH HOLD.';foot.style='opacity:.7;font-size:10px;margin-top:8px';panel.append(foot);
  for(const el of panel.querySelectorAll('button,select,input')){el.style.accentColor='#a77bff';el.style.maxWidth='100%';}
  doc.body.append(open,panel);open.onclick=()=>{panel.style.display=panel.style.display==='none'?'block':'none';refreshPanel();};
 }
 function refreshPanel(snapshot=null){
  if(!display)return;
  display.textContent=connected?'CONNECTED · '+(snapshot?.id||core.lastActive?.id||'Bluetooth gamepad')+' · '+(paused?'PAUSED':mode.toUpperCase()):'NOT DETECTED · Pair controller in iPhone Settings > Bluetooth; press a button in Safari';
  const p=core.profile;if(!p)return;deadzone.value=p.deadzone;sensitivity.value=p.sensitivity;lookSensitivity.value=p.turnSmoothing;
  for(const k of Object.keys(axisSelectors))axisSelectors[k].value=p[k];
 }
 function getFrame(pad,dt=1/60){
  frames++;
  const prior=core.padId;
  const s=core.poll(pad,dt);
  if(!s.connected){if(connected){note('Bluetooth disconnected; movement cleared, world remains running.');}connected=false;paused=false;menuSeconds=0;menuFired=false;if(frames%10===0)refreshPanel();return {active:mode==='skylab',connected:false,x:0,y:0,lookX:0,lookY:0,held:[],edges:[],combo:{},paused,move:SKYLAB_MOVES[selected]};}
  connected=true;
  if(core.padId!==prior){
   // Give this game its own baseline so the separate Gorillium animation lab retains its mapping.
   const raw=storageRead(storage);const calibrated=raw?.calibratedPadIds||{};
   if(!calibrated[core.padId]){core.configure({bindings:{...SKYLAB_BUTTONS}});core.save();calibrated[core.padId]=true;safeSave(storage,{...raw,mode,calibratedPadIds:calibrated});}
   note('Controller detected: '+s.snapshot.id);
  }
  if(remap){const a=pad?.buttons||[];const pressedButtons=a.map((b,i)=>i!==10&&i!==11&&(b?.pressed||b?.value>.52));
   if(remapWaitRelease){if(!pressedButtons.some(Boolean))remapWaitRelease=false;}
   else{const idx=pressedButtons.findIndex(Boolean);if(idx>=0){core.configure({bindings:{[remap]:idx}});core.save();note('Mapped '+remap+' to button '+idx);remap=null;}}
   refreshPanel(s.snapshot);return {active:mode==='skylab',connected:true,x:0,y:0,lookX:0,lookY:0,held:[],edges:[],combo:{},paused,move:SKYLAB_MOVES[selected]};
  }
  if(mode==='classic'){paused=false;menuSeconds=0;menuFired=false;if(frames%12===0)refreshPanel(s.snapshot);return {active:false,connected:true,x:s.x,y:s.y,lookX:s.lookX,lookY:s.lookY,held:[],edges:[],combo:{},paused:false,move:SKYLAB_MOVES[selected]};}
  const held=s.held,edges=s.edges,has=k=>held.includes(k),edge=k=>edges.includes(k);
  if(has('pause')){menuSeconds+=Math.min(.08,Math.max(0,dt));if(menuSeconds>=.8&&!menuFired){menuFired=true;paused=!paused;note(paused?'Controller paused':'Controller resumed');}}
  else{menuSeconds=0;menuFired=false;}
  if(edge('cataclysm')){selected=(selected+SKYLAB_MOVES.length-1)%SKYLAB_MOVES.length;note('Move '+SKYLAB_MOVES[selected].label);}
  if(edge('rage')){selected=(selected+1)%SKYLAB_MOVES.length;note('Move '+SKYLAB_MOVES[selected].label);}
  const combo={kickflip:edge('jump')&&has('sprint'),pressure:edge('roar')&&has('sprint'),gorillium:edge('slam')&&has('sprint'),grab:has('tentacle')&&has('sprint'),sling:edge('glide')&&has('sprint')};
  const e=edges.filter(k=>!((k==='jump'&&combo.kickflip)||(k==='roar'&&combo.pressure)||(k==='slam'&&combo.gorillium)||(k==='glide'&&combo.sling)));
  if(frames%12===0)refreshPanel(s.snapshot);
  return {active:mode==='skylab',connected:true,x:paused?0:s.x,y:paused?0:s.y,lookX:paused?0:s.lookX,lookY:paused?0:s.lookY,held,edges:paused?[]:e,combo:paused?{}:combo,paused,move:SKYLAB_MOVES[selected]};
 }
 mount();
 return {poll:getFrame,get mode(){return mode},get paused(){return paused},get connected(){return connected},get slot(){return SKYLAB_MOVES[selected]},setMode,get diagnostics(){return {mode,connected,paused,slot:SKYLAB_MOVES[selected],profile:core.profile,snapshot:core.lastActive}},showPanel(){if(panel)panel.style.display='block';refreshPanel();}};
}