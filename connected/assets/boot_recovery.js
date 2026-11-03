// WIR Connected startup UI: independent classic script so even an ES-module
// import/WebGL failure still leaves working retry and Lite Mode controls.
// Never clears localStorage, checkpoints, assets or saves. PROPOSAL/HOLD.
(function(){
 'use strict';
 const panel=document.getElementById('load'),label=document.getElementById('loadmsg');
 if(!panel||!label)return;
 const state={phase:'Boot script',warnings:[],error:null,ready:false,started:Date.now(),last:Date.now()};
 const detail=document.createElement('p');detail.id='loadDetail';
 detail.style.cssText='max-width:480px;margin:12px auto 4px;font:13px/1.5 system-ui;color:#d9ddf8;white-space:pre-wrap;text-align:center';
 detail.setAttribute('role','status');
 const actions=document.createElement('div');actions.id='loadActions';
 actions.style.cssText='display:none;gap:9px;justify-content:center;flex-wrap:wrap;margin:14px auto;z-index:500;position:relative';
 const btn=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;
  b.style.cssText='cursor:pointer;background:#2b2348;border:1px solid #a68fdb;color:white;border-radius:10px;padding:12px 16px;min-height:44px;font:700 14px system-ui';
  b.addEventListener('click',fn);actions.append(b);return b;};
 const reload=(lite)=>{const u=new URL(location.href);if(lite)u.searchParams.set('lite','1');u.searchParams.set('retry',String(Date.now()));location.assign(u.toString());};
 btn('Retry loading',()=>reload(false));btn('Retry in Lite Mode',()=>reload(true));
 const info=btn('Show error details',()=>{detail.hidden=!detail.hidden;});
 info.style.background='#232537';
 panel.append(detail,actions);
 function stage(message){if(state.ready||state.error)return;state.phase=String(message||'Loading world');state.last=Date.now();label.textContent=state.phase;}
 function warning(w){state.warnings.push({phase:state.phase,...w});
  if(state.warnings.length>40)state.warnings.shift();}
 function failed(reason){
  if(state.ready||state.error)return;
  const msg=String(reason?.message||reason||'Unknown startup error');
  state.error=msg;panel.style.display='';label.textContent='Mission could not finish loading';
  detail.hidden=false;
  detail.textContent='Stage: '+state.phase+'\n'+msg.slice(0,500)+
   (state.warnings.length?'\nOptional art fallbacks: '+state.warnings.length:'')+
   '\nYour saved progress is preserved. Retry or use Lite Mode.';
  actions.style.display='flex';
 }
 function ready(){
  state.ready=true;state.phase='Mission ready';state.last=Date.now();
  clearInterval(watchdog);
  actions.style.display='none';
  // Keep warnings accessible to the game and QA; do not imply a failed load.
 }
 window.__bootRecovery={stage,warning,failed,ready,getStatus:()=>({
  phase:state.phase,ready:state.ready,error:state.error,warnings:state.warnings.map(x=>({...x})),
  elapsedMs:Date.now()-state.started
 })};
 window.addEventListener('error',e=>{
  if(state.ready)return;
  if(e.target&&e.target!==window&&e.target.tagName==='SCRIPT')
   failed('Game script unavailable: '+(e.target.getAttribute('src')||'unknown script'));
  else if(e.error)failed(e.error);
 },true);
 window.addEventListener('unhandledrejection',e=>{
  if(!state.ready)warning({reason:String(e.reason||'Promise rejection'),asset:'startup'});
 });
 const watchdog=setInterval(()=>{
  if(state.ready||state.error){clearInterval(watchdog);return;}
  if(Date.now()-state.last>60000||Date.now()-state.started>150000)
   failed('Loading stopped responding. Connection or model download may have stalled.');
 },3000);
 stage('Preparing WIR Connected mission…');
})();
