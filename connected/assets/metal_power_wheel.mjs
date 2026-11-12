// Interactive GTA-style METAL Power Wheel, backed by real 73-entry registry.
// Opt-in only; does not replace original first mission, controller, saves or
// physics. Until a power has a verified mechanic it is informational, not cast.
import {POWER_FAMILIES,wheelAbilities,wheelAvailability,normalizedChoice} from './metal_power_wheel_core.mjs';
const KEY='wir_metal_power_wheel_v1';
const style=(el,text)=>{el.style.cssText=text;return el};
function make(tag,cls,text=''){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e}
export function mountMetalPowerWheel({getLab,onShortBack,storage}={}){
 if(typeof document==='undefined'||typeof getLab!=='function')throw Error('POWER_WHEEL_NEEDS_DOM_AND_LAB');
 let familyIndex=0,abilityIndex=0,equipped=null,last=null,open=false,alive=true;
 try{const raw=storage?.getItem(KEY);if(raw&&raw.length<1000){
  const cfg=JSON.parse(raw),choice=normalizedChoice(cfg.familyIndex,cfg.abilityIndex);
  familyIndex=choice.familyIndex;abilityIndex=choice.abilityIndex;
  if(Number.isInteger(cfg.equipped)&&cfg.equipped>=1&&cfg.equipped<=73)equipped=cfg.equipped;
 }}catch{}
 const root=make('div','wir-keep');root.id='metalPowerWheel';
 root.style.cssText='position:fixed;right:calc(12px + env(safe-area-inset-right,0px));top:calc(10px + env(safe-area-inset-top,0px));z-index:82;pointer-events:none;font:12px system-ui;color:#f1ebff';
 const toggle=style(make('button','','⚡ POWERS'), 'pointer-events:auto;touch-action:manipulation;min-height:42px;padding:9px 13px;border-radius:12px;background:#25203c;color:white;border:1px solid #a991f6;font:700 12px system-ui;cursor:pointer');
 toggle.type='button';toggle.id='metalPowerWheelToggle';toggle.setAttribute('aria-label','Open Metal Power Wheel');
 const overlay=style(make('section',''), 'position:fixed;inset:0;z-index:83;background:#090914da;pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:calc(12px + env(safe-area-inset-top,0px)) 8px calc(8px + env(safe-area-inset-bottom,0px));gap:7px;overflow:auto');
 overlay.id='metalPowerWheelDialog';overlay.hidden=true;overlay.style.display='none';overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Metal Galaxy Power Wheel');
 const header=make('div','','⚡ GALAXY POWER WHEEL · 73 ABILITIES');
 header.style.cssText='font:bold 13px system-ui;letter-spacing:.7px;text-align:center';
 const circle=style(make('div',''), 'position:relative;width:min(84vw,340px);height:min(84vw,340px);min-height:260px;max-height:340px;flex-shrink:0;border:2px solid #8674aa;border-radius:50%;background:radial-gradient(circle,#292137 0%,#161322 60%,#100e17 100%)');
 const center=style(make('div',''), 'position:absolute;left:24%;top:34%;width:52%;min-height:30%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font:bold 12px system-ui;gap:5px;pointer-events:none');
 const choices=make('div','');choices.id='metalPowerChoices';
 choices.style.cssText='background:#151324;border:1px solid #5e5378;border-radius:12px;max-width:min(440px,94vw);width:100%;max-height:24vh;min-height:92px;overflow:auto;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;padding:9px';
 const details=make('div','');details.id='metalPowerDetails';
 details.style.cssText='text-align:center;min-height:24px;color:#d3c9e8;max-width:90vw;font:11px/1.4 system-ui';
 const commands=style(make('div',''), 'display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap');
 const equip=make('button','','EQUIP');equip.id='metalPowerEquip';equip.type='button';
 const use=make('button','','USE POWER');use.id='metalPowerUse';use.type='button';
 const close=make('button','','CLOSE');close.type='button';close.id='metalPowerClose';
 for(const b of [equip,use,close])b.style.cssText='touch-action:manipulation;border-radius:9px;min-height:42px;padding:8px 14px;color:white;background:#45305d;border:1px solid #9372ce;font:bold 12px system-ui;cursor:pointer';
 close.style.background='#2c2936';commands.append(equip,use,close);
 const help=make('div','','Touch: choose a family + move • Keyboard: Tab, arrows, Enter, R • Gamepad: hold View, right stick, D-pad, A');
 help.style.cssText='font:10px/1.5 system-ui;opacity:.82;text-align:center;max-width:440px';
 const feedback=make('div','','Ready to discover an ability');
 feedback.id='metalPowerWheelFeedback';feedback.setAttribute('role','status');
 feedback.style.cssText='font:12px/1.5 system-ui;color:#a9e3ff;text-align:center;min-height:20px';
 overlay.append(header,circle,choices,details,commands,feedback,help);
 root.append(toggle,overlay);document.body.append(root);
 const members=POWER_FAMILIES.map((f,i)=>{
  const b=make('button','',f.icon+'\n'+f.name);b.type='button';b.dataset.family=f.id;
  const a=Math.PI*2*i/8-Math.PI/2,px=50+35*Math.cos(a),py=50+35*Math.sin(a);
  b.style.cssText='position:absolute;left:'+px+'%;top:'+py+'%;transform:translate(-50%,-50%);width:75px;min-height:56px;border-radius:15px;border:1px solid #736785;background:#302c44;color:#f4efff;padding:5px;font:700 10px system-ui;white-space:pre-line;touch-action:manipulation;cursor:pointer';
  b.addEventListener('click',()=>{familyIndex=i;abilityIndex=0;draw()});circle.append(b);return b;
 });
 const memory=()=>{try{storage?.setItem(KEY,JSON.stringify({familyIndex,abilityIndex,equipped}));}catch{}};
 const current=()=>wheelAbilities(POWER_FAMILIES[familyIndex].id)[abilityIndex];
 const availability=()=>wheelAvailability(current(),getLab()?.snapshot?.());
 const draw=()=>{
  if(!alive)return;
  const f=POWER_FAMILIES[familyIndex],powers=wheelAbilities(f.id);
  if(abilityIndex>=powers.length)abilityIndex=0;
  const a=current(),v=availability();
  center.replaceChildren(make('div','',f.icon+' '+f.name),make('div','',a?.name||'No ability'),
   make('div','',v.state.toUpperCase()));
  members.forEach((b,i)=>{b.style.borderColor=i===familyIndex?'#faf5ff':'#736785';b.style.background=i===familyIndex?'#6d488e':'#302c44';b.setAttribute('aria-pressed',String(i===familyIndex));});
  choices.replaceChildren();
  for(let i=0;i<powers.length;i++){
   const p=powers[i],a0=wheelAvailability(p,getLab()?.snapshot?.()),b=make('button','',p.name+(a0.state==='ready'?' ✓':a0.state==='locked'?' 🔒':' ·'));
   b.type='button';b.dataset.powerId=String(p.id);b.style.cssText='font:11px system-ui;background:'+(i===abilityIndex?'#695097':'#302944')+';color:white;border:1px solid #716688;border-radius:8px;padding:7px;touch-action:manipulation;min-height:34px';
   b.addEventListener('click',()=>{abilityIndex=i;draw()});choices.append(b);
  }
  details.textContent=v.why+(equipped===a?.id?' · EQUIPPED':'');
  equip.disabled=v.state!=='ready';use.disabled=v.state!=='ready';
  equip.style.opacity=equip.disabled?'.45':'1';use.style.opacity=use.disabled?'.45':'1';
  memory();
 };
 const setOpen=v=>{
  open=!!v;overlay.hidden=!open;overlay.style.display=open?'flex':'none';toggle.setAttribute('aria-expanded',String(open));
  if(open){draw();toggle.textContent='⚡ WHEEL OPEN';}
  else toggle.textContent='⚡ POWERS';
 };
 const equipCurrent=()=>{
  const a=current(),v=availability();
  if(v.state!=='ready'){feedback.textContent=v.why;return false}
  if(equipped!==a.id)last=equipped;
  equipped=a.id;feedback.textContent='EQUIPPED · '+a.name;draw();return true;
 };
 const useCurrent=()=>{
  const a=current(),v=availability(),lab=getLab();
  if(v.state!=='ready'||!lab?.perform){feedback.textContent=v.why;return false}
  const result=lab.perform(v.action);
  feedback.textContent=result?.ok?'ACTIVATED · '+a.name:'UNAVAILABLE · '+(result?.reason||'Check position, Gallium, material or cooldown');
  draw();return result?.ok===true;
 };
 toggle.addEventListener('click',()=>setOpen(!open));
 close.addEventListener('click',()=>setOpen(false));
 equip.addEventListener('click',equipCurrent);use.addEventListener('click',useCurrent);
 function navigateFamily(n){familyIndex=((familyIndex+n)%8+8)%8;abilityIndex=0;draw()}
 function navigatePower(n){const list=wheelAbilities(POWER_FAMILIES[familyIndex].id);abilityIndex=((abilityIndex+n)%list.length+list.length)%list.length;draw()}
 function keydown(e){
  if(!alive)return;
  if(e.code==='Tab'){e.preventDefault();e.stopImmediatePropagation();setOpen(!open);return}
  if(!open)return;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape','KeyR'].includes(e.code))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.code==='ArrowLeft')navigateFamily(-1);else if(e.code==='ArrowRight')navigateFamily(1);
  else if(e.code==='ArrowUp')navigatePower(-1);else if(e.code==='ArrowDown')navigatePower(1);
  else if(e.code==='Enter')equipCurrent();else if(e.code==='KeyR')useCurrent();else setOpen(false);
 }
 window.addEventListener('keydown',keydown,true);
 let backWas=false,backHeld=0,backOpened=false,dpadLeftWas=false,dpadRightWas=false,aWas=false,stickSector=-1;
 function pollGamepad(gp,dt=1/60){
  const back=!!gp?.buttons?.[8]?.pressed;
  if(back){
   backHeld+=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
   if(backHeld>.36&&!backOpened){backOpened=true;setOpen(true);}
  }
  const handled=back||backWas||open;
  if(open){
   const x=gp?.axes?.[2]||0,y=gp?.axes?.[3]||0;
   if(Math.hypot(x,y)>.65){
    const sector=(Math.round((Math.atan2(y,x)+Math.PI/2)/(2*Math.PI)*8)+8)%8;
    if(sector!==stickSector){familyIndex=sector;abilityIndex=0;draw();stickSector=sector}
   }else stickSector=-1;
   const left=!!gp?.buttons?.[14]?.pressed,right=!!gp?.buttons?.[15]?.pressed,a=!!gp?.buttons?.[0]?.pressed;
   if(left&&!dpadLeftWas)navigatePower(-1);
   if(right&&!dpadRightWas)navigatePower(1);
   if(a&&!aWas){equipCurrent();useCurrent();}
   dpadLeftWas=left;dpadRightWas=right;aWas=a;
  }
  if(!back&&backWas){
   if(backOpened)setOpen(false);
   else onShortBack?.();
   backHeld=0;backOpened=false;stickSector=-1;
  }
  backWas=back;
  return handled;
 }
 function snapshot(){return {open,visible:!overlay.hidden,family:POWER_FAMILIES[familyIndex].id,
  currentId:current()?.id,currentName:current()?.name,equipped,last,availability:availability().state,
  total:73,action:availability().action};}
 const destroy=()=>{alive=false;window.removeEventListener('keydown',keydown,true);root.remove()};
 return Object.freeze({isOpen:()=>open,pollGamepad,snapshot,setOpen,equip:equipCurrent,use:useCurrent,destroy});
}
