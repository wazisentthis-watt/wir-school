import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const scenarios=[],pageErrors=[];
let mobile,controller;
async function ready(page,path='/connected/?lite=1'){
 page.on('pageerror',e=>pageErrors.push(String(e.stack||e)));
 await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.__ready===true&&!!window.__game?.forge?.(),null,{timeout:75000});
 await page.evaluate(()=>{
  const g=window.__game;
  g.P.o.position.set(175,.25,175);
  g.FG.inFight=false;
 });
}
try{
 const mobileCtx=await browser.newContext({
  viewport:{width:390,height:844},screen:{width:390,height:844},
  deviceScaleFactor:2,isMobile:true,hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  serviceWorkers:'block'
 });
 mobile=await mobileCtx.newPage();await ready(mobile);
 const metrics=await mobile.evaluate(()=>{
  const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  return {stick:box('#stick'),pad:box('#tbtn'),forgeButton:box('[data-k="KeyB"]'),
   touchShown:getComputedStyle(document.querySelector('#touch')).display!=='none'};
 });
 assert.equal(metrics.touchShown,true,'iPhone-size touch controls hidden');
 assert.ok(metrics.stick.right+2<=metrics.pad.left,'virtual stick and four-column buttons overlap: '+JSON.stringify(metrics));
 assert.ok(metrics.forgeButton.width>=44&&metrics.forgeButton.height>=44,'forge target smaller than 44px');
 scenarios.push({case:'390px_touch_layout_nonoverlap',ok:true,metrics});
 const before=await mobile.evaluate(()=>({
  story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')
 }));
 // Check touch button cancellation and joystick cancellation; neither may stick.
 const cancelled=await mobile.evaluate(()=>{
  const e=document.querySelector('#tbtn button[data-k="KeyE"]');
  e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:891,clientX:250,clientY:770}));
  const held=window.__game.keys.KeyE;
  e.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:891,clientX:250,clientY:770}));
  const released=!window.__game.keys.KeyE;
  const s=document.querySelector('#stick'),r=s.getBoundingClientRect(),n=document.querySelector('#nub');
  s.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:892,clientX:r.right-4,clientY:r.top+r.height/2}));
  const moved=n.style.left;
  s.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:892,clientX:r.right-4,clientY:r.top+r.height/2}));
  const reset=n.style.left;
  return {held,released,moved,reset};
 });
 assert.equal(cancelled.held,true);assert.equal(cancelled.released,true);
 assert.notEqual(cancelled.moved,cancelled.reset,'joystick should recenter after pointercancel');
 scenarios.push({case:'touch_pointercancel_clears_input',ok:true,cancelled});
 await mobile.locator('#tbtn button[data-k="KeyB"]').tap();
 await mobile.waitForFunction(()=>window.__game.forge().state.phase!=='IDLE',null,{timeout:12000});
 assert.equal(await mobile.evaluate(()=>window.__game.keys.KeyB),false,'mobile tap left B held');
 await mobile.waitForFunction(()=>!document.querySelector('#forgeHud').hidden,null,{timeout:12000});
 const state=await mobile.evaluate(()=>({
  phase:window.__game.forge().state.phase,label:document.querySelector('#forgeStage').textContent,
  progress:document.querySelector('#forgeTrack').getAttribute('aria-valuenow'),
  board:window.__game.board.visible
 }));
 assert.equal(state.board,false,'real board visible before formation');
 assert.ok(state.label.length>5&&Number(state.progress)>=0,'forge progress missing');
 scenarios.push({case:'mobile_touch_starts_forge_and_HUD',ok:true,state});
 await mobile.waitForFunction(()=>window.__game.st.board===true&&window.__game.forge().state.phase==='SKATING',null,{timeout:35000});
 assert.equal(await mobile.evaluate(()=>document.querySelector('#forgeHud').hidden),true);
 const after=await mobile.evaluate(()=>({
  story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')
 }));
 assert.deepEqual(after,before,'mobile forge unexpectedly mutated production saves');
 scenarios.push({case:'mobile_forge_mounts_and_saves_unchanged',ok:true});
 await mobile.screenshot({path:'test-results/metal_forge_phase5_mobile.png',fullPage:true});
 await mobileCtx.close();
 const padCtx=await browser.newContext({viewport:{width:1200,height:800},serviceWorkers:'block'});
 await padCtx.addInitScript(()=>{
  const buttons=Array.from({length:17},()=>({pressed:false,touched:false,value:0}));
  const pad={id:'Xbox Wireless Controller QA (virtual)',connected:true,index:0,
   mapping:'standard',axes:[0,0,0,0],buttons,timestamp:0,
   vibrationActuator:null};
  window.__virtualPad=pad;
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad,null,null,null]});
 });
 controller=await padCtx.newPage();await ready(controller);
 await controller.evaluate(()=>window.__game.metalControllerV3.setMode('skylab'));
 await controller.waitForTimeout(550);
 const state0=await controller.evaluate(()=>({mode:window.__game.metalControllerV3.mode,connected:window.__game.metalControllerV3.connected,
  phase:window.__game.forge().state.phase}));
 assert.equal(state0.mode,'skylab');
 assert.equal(state0.connected,true,'virtual Xbox controller was not discovered');
 await controller.evaluate(()=>{const b=window.__virtualPad.buttons[1];b.pressed=true;b.touched=true;b.value=1;window.__virtualPad.timestamp+=18;});
 await controller.waitForFunction(()=>window.__game.forge().state.phase!=='IDLE',null,{timeout:12000});
 await controller.evaluate(()=>{const b=window.__virtualPad.buttons[1];b.pressed=false;b.touched=false;b.value=0;window.__virtualPad.timestamp+=18;});
 scenarios.push({case:'skylab_B_on_ground_starts_forge',ok:true});
 await controller.waitForFunction(()=>window.__game.st.board===true&&window.__game.forge().state.phase==='SKATING',null,{timeout:35000});
 await controller.evaluate(()=>{const b=window.__virtualPad.buttons[1];b.pressed=true;b.touched=true;b.value=1;window.__virtualPad.timestamp+=18;});
 await controller.waitForFunction(()=>window.__game.forge().state.phase==='DISSOLVING'&&!window.__game.st.board,null,{timeout:12000});
 await controller.evaluate(()=>{const b=window.__virtualPad.buttons[1];b.pressed=false;b.touched=false;b.value=0;window.__virtualPad.timestamp+=18;});
 scenarios.push({case:'skylab_B_dissolves_no_carried_board',ok:true});
 await controller.waitForFunction(()=>window.__game.forge().state.phase==='IDLE',null,{timeout:17000});
 await controller.evaluate(()=>{window.__game.FG.inFight=true;const b=window.__virtualPad.buttons[1];b.pressed=true;b.touched=true;b.value=1;window.__virtualPad.timestamp+=18;});
 await controller.waitForTimeout(500);
 assert.equal(await controller.evaluate(()=>window.__game.forge().state.phase),'IDLE','B in combat must not forge');
 scenarios.push({case:'skylab_B_combat_does_not_forge',ok:true});
 assert.deepEqual(pageErrors,[],'browser errors '+pageErrors.join('\n'));
 await controller.screenshot({path:'test-results/metal_forge_phase5_controller.png',fullPage:true});
 await padCtx.close();
 console.log('METAL FORGE PHASE5 INPUT QA PASS',JSON.stringify(scenarios.map(({case:label})=>label)));
}catch(e){
 console.error('METAL FORGE PHASE5 INPUT QA FAIL',e.stack||e);
 console.error('SCENARIOS',JSON.stringify(scenarios));
 console.error('PAGE ERRORS',JSON.stringify(pageErrors));
 try{await (controller||mobile)?.screenshot({path:'test-results/metal_forge_phase5_failure.png'});}catch{}
 process.exitCode=1;
}finally{
 writeFileSync('test-results/metal_forge_phase5_input.json',JSON.stringify({scenarios,pageErrors},null,2));
 await browser.close();
}
