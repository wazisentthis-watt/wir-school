import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const root=process.env.WIR_DUEL_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const results=[],errors=[];let page,padPage,touchPage;
const get=async p=>p.evaluate(()=>({snapshot:window.__aerialPilot?.snapshot(),game:window.__game?{board:window.__game.board.visible,story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')}:null}));
async function load(p){
 p.on('pageerror',e=>errors.push(String(e.stack||e)));
 await p.goto(root+'/connected/?lite=1&aerial_duel=1',{waitUntil:'domcontentloaded',timeout:50000});
 await p.waitForFunction(()=>window.__ready===true&&!!window.__aerialPilot&&window.__game?.P?.o,null,{timeout:75000});
}
async function afterCooldown(p){await p.waitForFunction(()=>window.__aerialPilot?.state?.cooldown===0,null,{timeout:12000});}
try{
 const ctx=await browser.newContext({viewport:{width:1200,height:800},serviceWorkers:'block'});
 page=await ctx.newPage();await load(page);
 const origin=await page.evaluate(()=>({x:window.__game.P.o.position.x,y:window.__game.P.o.position.y,z:window.__game.P.o.position.z}));
 const before=await get(page);assert.equal(before.snapshot,null,'duel should not auto-start');assert.equal(before.game.board,false);
 assert.equal(await page.locator('#aerialDuelStart').isVisible(),true);
 results.push({case:'Savannah_First_Mission_Loaded_With_OptIn',ok:true});
 await page.locator('#aerialDuelStart').click();
 await page.waitForFunction(()=>window.__aerialPilot?.active&&window.__aerialPilot?.state?.mode==='ACTIVE',null,{timeout:7000});
 let s=(await get(page)).snapshot;
 assert.equal(s.enemyVisible,true);assert.equal(s.roofVisible,true);assert.ok(s.playerWorld.y>10);
 assert.ok(s.enemy.hp>.7);results.push({case:'Actual_Rooftop_And_ReFramer_Model_Spawned',ok:true});
 await page.locator('[data-duel="light"]').click();
 await page.waitForFunction(()=>window.__aerialPilot?.state?.combo===1,null,{timeout:8000});
 await afterCooldown(page);
 await page.locator('[data-duel="light"]').click();
 await page.waitForFunction(()=>window.__aerialPilot?.state?.combo>=2,null,{timeout:8000});
 await afterCooldown(page);
 s=(await get(page)).snapshot;
 assert.ok(s.enemy.hp<.60,'enemy mesh not taking melee damage: '+JSON.stringify(s));
 results.push({case:'Two_Hit_Grounded_Melee_Chain',ok:true,hp:s.enemy.hp});
 await page.locator('[data-duel="launch"]').click();
 await page.waitForFunction(()=>window.__aerialPilot?.state?.enemy?.y>.65,null,{timeout:12000});
 s=(await get(page)).snapshot;assert.ok(s.events.some(x=>x.type==='launch'));
 results.push({case:'Launcher_Uses_Real_Y_Height_And_Gravity',ok:true,height:s.enemy.y});
 await afterCooldown(page);
 await page.locator('[data-duel="pursue"]').click();
 await page.waitForFunction(()=>window.__aerialPilot?.state?.player?.y>.7,null,{timeout:15000});
 const chase=(await get(page)).snapshot;
 assert.ok(chase.player.y>.7&&chase.events.some(x=>x.type==='air-pursuit'));
 results.push({case:'Momentum_Based_Aerial_Pursuit',ok:true,playerY:chase.player.y});
 await afterCooldown(page);
 await page.waitForFunction(()=>{
  const p=window.__aerialPilot?.state;if(!p||p.mode!=='ACTIVE')return false;
  return p.airChase>.1&&p.enemy.y>.65&&p.player.y>.65&&
   Math.hypot(p.player.x-p.enemy.x,p.player.y-p.enemy.y,p.player.z-p.enemy.z)<4.2;
 },null,{timeout:15000});
 await page.locator('[data-duel="finisher"]').click();
 await page.waitForFunction(()=>window.__aerialPilot?.state?.finisherLanded,null,{timeout:12000});
 await page.waitForFunction(()=>window.__aerialPilot?.state?.mode==='VICTORY',null,{timeout:19000});
 s=(await get(page)).snapshot;
 assert.ok(s.roofImpacts>=1,'win without physical roof impact');
 assert.ok(s.events.some(x=>x.type==='aerial-finisher'));assert.ok(s.events.some(x=>x.type==='roof-floor-impact'));
 results.push({case:'Galaxy_Gallium_Aerial_Finisher_Roof_Impact_And_Victory',ok:true,impacts:s.roofImpacts});
 await page.screenshot({path:'test-results/metal_aerial_duel_victory.png'});
 await page.locator('#adExit').click();
 await page.waitForFunction(()=>!window.__aerialPilot.active,null,{timeout:4000});
 const restored=await page.evaluate(()=>({x:window.__game.P.o.position.x,y:window.__game.P.o.position.y,z:window.__game.P.o.position.z,roof:window.__aerialPilot.roof.visible}));
 assert.equal(restored.roof,false);
 for(const k of ['x','z'])assert.ok(Math.abs(restored[k]-origin[k])<.001,'failed to restore '+k);
 const after=await get(page);
 assert.equal(after.game.story,before.game.story,'duel rewrote Metal story');
 assert.equal(after.game.profile,before.game.profile,'duel rewrote Valence profile');
 assert.equal(after.game.board,before.game.board,'duel changed original forged board');
 results.push({case:'Exit_Restores_World_And_Saves',ok:true});
 await ctx.close();
 // Real game + virtual Xbox standardized Gamepad API.
 const gameCtx=await browser.newContext({viewport:{width:1080,height:760},serviceWorkers:'block'});
 await gameCtx.addInitScript(()=>{
  const buttons=Array.from({length:17},()=>({pressed:false,value:0,touched:false}));
  const pad={id:'Virtual Xbox Standard Duel QA',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons,timestamp:0};
  window.__virtualDuelPad=pad;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad,null,null,null]});
 });
 padPage=await gameCtx.newPage();await load(padPage);
 await padPage.locator('#aerialDuelStart').click();
 async function padPulse(idx,held=[]){
  await padPage.evaluate(({idx,held})=>{for(const j of held){const b=window.__virtualDuelPad.buttons[j];b.pressed=true;b.value=1;}const b=window.__virtualDuelPad.buttons[idx];b.pressed=true;b.value=1;}, {idx,held});
  // Do not use wall-clock button pulses: software-rendered WebGL may skip 330 ms
  // between frames. The real pilot must have sampled BOTH physical edges.
  await padPage.waitForFunction(idx=>window.__aerialPilot?.previousButtons?.[idx]===true,idx,{timeout:16000});
  await padPage.evaluate(({idx,held})=>{for(const j of [idx,...held]){const b=window.__virtualDuelPad.buttons[j];b.pressed=false;b.value=0;}},{idx,held});
  await padPage.waitForFunction(idx=>window.__aerialPilot?.previousButtons?.[idx]===false,idx,{timeout:16000});
 }
 await padPulse(2);
 await padPage.waitForFunction(()=>window.__aerialPilot.state.combo>=1&&window.__aerialPilot.state.cooldown===0,null,{timeout:12000});
 await padPulse(2);
 await padPage.waitForFunction(()=>window.__aerialPilot.state.combo>=2&&window.__aerialPilot.state.cooldown===0,null,{timeout:12000});
 await padPulse(3);
 try{await padPage.waitForFunction(()=>window.__aerialPilot.state.enemy.y>.5,null,{timeout:15000});}
 catch(err){const snapshot=await padPage.evaluate(()=>({state:window.__aerialPilot?.snapshot(),prev:window.__aerialPilot?.previousButtons,message:document.querySelector('#adMessage')?.textContent}));throw Error('Xbox Y launcher missed after sampled button press/release: '+JSON.stringify(snapshot)+' '+String(err));}
 results.push({case:'Virtual_Xbox_X_Chain_Y_Launch',ok:true});
 await gameCtx.close();
 // Touch mode must reveal five actions without hiding scene.
 const touchCtx=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2,serviceWorkers:'block'});
 touchPage=await touchCtx.newPage();await load(touchPage);
 await touchPage.locator('#aerialDuelStart').tap();
 await touchPage.waitForFunction(()=>window.__aerialPilot?.active,null,{timeout:8000});
 assert.equal(await touchPage.locator('[data-duel]').count(),5);
 const bounds=await touchPage.locator('[data-duel="light"]').boundingBox();
 assert.ok(bounds.width>=44&&bounds.height>=44,'touch strike target smaller than 44px');
 await touchPage.locator('[data-duel="light"]').tap();
 await touchPage.waitForFunction(()=>window.__aerialPilot?.state?.combo===1,null,{timeout:8000});
 results.push({case:'iPhone_Sized_Touch_Action_And_Melee',ok:true});
 await touchPage.screenshot({path:'test-results/metal_aerial_duel_mobile.png'});
 await touchCtx.close();
 assert.deepEqual(errors,[],errors.join('\n'));
 console.log('METAL AERIAL DUEL 01 BROWSER QA PASS',JSON.stringify(results.map(x=>x.case)));
}catch(e){
 console.error('METAL AERIAL DUEL 01 BROWSER QA FAIL',String(e.stack||e),JSON.stringify(results),JSON.stringify(errors));
 try{await (touchPage||padPage||page)?.screenshot({path:'test-results/metal_aerial_duel_failure.png'});}catch{}
 process.exitCode=1;
}finally{writeFileSync('test-results/metal_aerial_duel_report.json',JSON.stringify({results,errors},null,2));await browser.close();}
