// Real locally served Connected Savannah Mission05 end-to-end Chromium QA.
// Navigation between long city waypoints uses existing teleportForTest ONLY in QA,
// but trick landing, board forging, rooftop collider, duel and save are real engine events.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const results=[],errors=[];let page,tablet,mobile;
const snapshot=async p=>p.evaluate(()=>({
 ready:window.__ready===true,story:window.__game?.metalStoryChapter?.()?.title,
 stage:window.__mission05?.snapshot?.(),hasMissionUI:!!document.querySelector('#mission05Hud'),
 gameStorySave:localStorage.getItem('wir_metal_story_v1'),
 profile:localStorage.getItem('wir_valence_profile_v1'),currentSave:localStorage.getItem('wir_metal_rooftop_pursuit_v1'),
 powers:!!window.__game?.fireMetalBlast,board:window.__game?.st.board,
 forge:window.__game?.forge?.()?.state.phase,duel:window.__mission05?.duel?.snapshot()
}));
async function load(p){
 p.on('pageerror',e=>errors.push(String(e.stack||e)));
 await p.goto(base+'/connected/?lite=1&mission05=1',{waitUntil:'domcontentloaded',timeout:50000});
 await p.waitForFunction(()=>window.__ready===true&&!!window.__mission05?.snapshot&&!!window.__game?.P?.o,
 null,{timeout:80000});
}
async function stage(p,name,timeout=16000){
 await p.waitForFunction(s=>window.__mission05?.snapshot?.().stage===s,name,{timeout});
}
async function cool(p){await p.waitForFunction(()=>window.__mission05?.duel?.state?.cooldown===0,null,{timeout:12000});}
try{
 const ctx=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:1,serviceWorkers:'block'});
 page=await ctx.newPage();await load(page);let before=await snapshot(page);
 assert.equal(before.stage.stage,'INTRO');
 assert.match(before.story||'',/Metal Awakens/);
 assert.equal(before.hasMissionUI,true);assert.equal(before.powers,true);
 assert.equal(await page.locator('#testyardSkateActions button').count(),3);
 results.push({case:'real_Savannah_Mission05_optin_and_original_power_integrity',pass:true});
 await page.locator('#m05Action').click();await stage(page,'SKATEPARK');
 // QA-only route shortcut avoids a flaky ten-block travel timer; the actual mission never teleports.
 await page.evaluate(()=>{const g=window.__game;const c=g.SPOTS.skate.c;
  g.teleportForTest({x:c.x,y:.25,z:c.z});g.vel.set(0,0,0);
 });
 await stage(page,'TRICK');
 await page.evaluate(()=>{window.__game.pressed.KeyB=true;});
 await page.waitForFunction(()=>window.__game?.st.board===true,null,{timeout:27000});
 const forged=await snapshot(page);
 assert.equal(forged.board,true,'Original seven-piece Galaxy Gallium board not equipped');
 results.push({case:'real_original_four_wheel_Forge',pass:true,phase:forged.forge});
 await page.evaluate(()=>{const g=window.__game;g.pressed.BracketLeft=true;});
 await page.waitForFunction(()=>window.__game?.testYard?.()?.flip==='Kickflip',null,{timeout:10000});
 await stage(page,'ROOFTOP',22000);
 const trick=await snapshot(page);
 assert.equal(trick.stage.flip,'Kickflip');assert.ok(trick.stage.points>=150);
 results.push({case:'real_TestYard_directional_flip_caught_on_original_landing',pass:true,points:trick.stage.points});
 // QA-only location positioning to exercise the real roof floor and grounding.
 await page.evaluate(()=>{const g=window.__game;const r=window.__mission05.snapshot().roof;
  g.teleportForTest({x:r.x,y:r.y+.08,z:r.z});g.vel.set(0,-.5,0);
 });
 await stage(page,'DUEL',12000);
 const roofState=await snapshot(page);
 assert.equal(roofState.stage.stage,'DUEL');
 const top=await page.evaluate(()=>window.__game.P.o.position.y);
 assert.ok(Math.abs(top-roofState.stage.roof.y)<.65,'Original floorAt does not recognize physical rooftop');
 results.push({case:'actual_physical_Fight_Lot_rooftop_floor_contact',pass:true,height:top});
 await page.evaluate(()=>window.__game.pressed.KeyB=true);
 await page.waitForFunction(()=>window.__game.st.board===false,null,{timeout:6000});
 await page.waitForFunction(()=>window.__game.forge()?.state.phase==='IDLE',null,{timeout:9000});
 await page.locator('#m05Action').click();
 await page.waitForFunction(()=>window.__mission05?.duel?.active===true,null,{timeout:10000});
 const fightStart=await snapshot(page);
 assert.equal(fightStart.stage.stage,'DUEL');
 assert.equal(fightStart.duel.roofVisible,true);
 assert.equal(fightStart.stage.duelActive,true);
 // Because the player started on the real roof, start must be within <0.1m, not a teleport.
 const delta=await page.evaluate(()=>{
  const r=window.__mission05.snapshot().roof,p=window.__game.P.o.position;
  return Math.abs(p.y-r.y);
 });
 assert.ok(delta<.1,'Pilot displaced original real roof Y position');
 results.push({case:'no_teleport_real_roof_duel_activation',pass:true,delta});
 await page.locator('[data-duel="light"]').click();
 await page.waitForFunction(()=>window.__mission05?.duel?.state?.combo>=1,null,{timeout:11000});
 await cool(page);
 await page.locator('[data-duel="light"]').click();
 await page.waitForFunction(()=>window.__mission05?.duel?.state?.combo>=2,null,{timeout:11000});
 await cool(page);
 await page.locator('[data-duel="launch"]').click();
 await page.waitForFunction(()=>window.__mission05?.duel?.state?.enemy?.y>.65,null,{timeout:11000});
 await cool(page);
 await page.locator('[data-duel="pursue"]').click();
 await page.waitForFunction(()=>window.__mission05?.duel?.state?.player?.y>.65,null,{timeout:12000});
 await cool(page);
 await page.waitForFunction(()=>{
  const s=window.__mission05?.duel?.state;
  return !!s&&s.airChase>.1&&s.enemy.y>.65&&s.player.y>.65&&
  Math.hypot(s.player.x-s.enemy.x,s.player.y-s.enemy.y,s.player.z-s.enemy.z)<4.2;
 },null,{timeout:15000});
 await page.locator('[data-duel="finisher"]').click();
 await page.waitForFunction(()=>window.__mission05?.duel?.state?.finisherLanded===true,null,{timeout:10000});
 await page.waitForFunction(()=>window.__mission05?.duel?.state?.mode==='VICTORY',null,{timeout:18000});
 await stage(page,'RETURN',6000);
 let won=await snapshot(page);assert.ok(won.stage.roofImpacts>=1);
 assert.ok(won.duel.events.some(x=>x.type==='roof-floor-impact'));
 results.push({case:'authentic_ReFramer_air_chain_Gallium_finisher_and_roof_impact',pass:true,
  impacts:won.stage.roofImpacts});
 await page.screenshot({path:'test-results/mission05_rooftop_victory.png'});
 await page.locator('#adExit').click();
 await page.waitForFunction(()=>!window.__mission05?.duel?.active,null,{timeout:6000});
 // QA-only shortcut back to the original safehouse, using original root and floor.
 await page.evaluate(()=>{const g=window.__game;const c=g.SPOTS.home.c;
  g.teleportForTest({x:c.x,y:.25,z:c.z});g.vel.set(0,0,0);
 });
 await stage(page,'COMPLETE',10000);
 const done=await snapshot(page);
 assert.equal(done.stage.complete,true);
 assert.equal(JSON.parse(done.currentSave).stage,'COMPLETE');
 assert.equal(done.gameStorySave,before.gameStorySave,'Original Metal story save changed');
 results.push({case:'safehouse_return_completes_separate_mission_checkpoint',pass:true});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ready===true&&!!window.__mission05?.snapshot,null,{timeout:80000});
 const loaded=await snapshot(page);
 assert.equal(loaded.stage.stage,'COMPLETE','Saved Mission05 completion not restored');
 assert.equal(loaded.gameStorySave,before.gameStorySave,'Mission05 reload changed original story');
 assert.equal(errors.length,0,errors.join('\n'));
 results.push({case:'relaunch_restores_M05_without_legacy_story_or_power_regression',pass:true});
 await ctx.close();
 // Real phone-sized browser viewport and touch tap on mission controls.
 const touchCtx=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},
  isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
 mobile=await touchCtx.newPage();await load(mobile);
 const start=mobile.locator('#m05Action');
 const bound=await start.boundingBox();
 assert.ok(bound.width>=44&&bound.height>=44,'mission touch target too small');
 await start.tap();await stage(mobile,'SKATEPARK');
 assert.equal(await mobile.locator('#testyardSkateActions button').count(),3);
 assert.equal(await mobile.locator('#m05Save').isVisible(),true);
 results.push({case:'phone_sized_touch_UI_mission_start_and_skate_actions',pass:true});
 await mobile.screenshot({path:'test-results/mission05_mobile.png'});
 await touchCtx.close();
 // Standard Gamepad input: D-pad Up+Y must start Mission05 without L3 or R3.
 const gpCtx=await browser.newContext({viewport:{width:1100,height:720},serviceWorkers:'block'});
 await gpCtx.addInitScript(()=>{
  const buttons=Array.from({length:17},()=>({pressed:false,value:0,touched:false}));
  const p={index:0,id:'Virtual Xbox Mission05 QA',connected:true,mapping:'standard',
   axes:[0,0,0,0],buttons,timestamp:0};
  window.__virtualM05Pad=p;
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[p,null,null,null]});
 });
 tablet=await gpCtx.newPage();await load(tablet);
 await tablet.evaluate(()=>{for(const n of [12,3]){
  window.__virtualM05Pad.buttons[n].pressed=true;window.__virtualM05Pad.buttons[n].value=1;
 }});
 await stage(tablet,'SKATEPARK',16000);
 results.push({case:'standard_Xbox_DpadUp_Y_chord_start',pass:true});
 await gpCtx.close();
 console.log('MISSION05 REAL GAME CHROMIUM PASS',JSON.stringify(results.map(r=>r.case)));
}catch(e){
 console.error('MISSION05 CHROMIUM FAIL',String(e.stack||e),JSON.stringify(results),JSON.stringify(errors));
 try{await (tablet||mobile||page)?.screenshot({path:'test-results/mission05_failure.png'});}catch{}
 process.exitCode=1;
}finally{writeFileSync('test-results/mission05_browser_report.json',JSON.stringify({results,errors},null,2));await browser.close();}
