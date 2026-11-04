import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
const report={status:'FAIL',source:'Draft WIR Connected with real Phase 6 rig',iosSafariTested:false,physicalPadTested:false,
 originalFBXRetargeted:false,playerAndEnemyRenderingPixelsInspected:false};
const errors=[];mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
try{
 const ctx=await browser.newContext({viewport:{width:1024,height:700},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  window.__qaPad={id:'QA simulated Bluetooth pad',index:0,mapping:'standard',connected:true,
   axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
  localStorage.setItem('wir_metal_story_v1',JSON.stringify({
   version:1,chapter:1,flags:{skate_reached:true},
   checkpoint:{position:{x:0,y:.25,z:8},reason:'Choreo QA'},updatedAt:null}));
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/connected/?lite=1&metal_next=1&controller_v3=1&metal_motion_qa=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().failed,null,{timeout:85000});
 assert.equal(await page.evaluate(()=>!!window.__ready),true,'Actual Metal mission must load');
 await page.waitForFunction(()=>!!window.__game?.motionTest?.holdActor,null,{timeout:10000});
 const initial=await page.evaluate(()=>{
  window.__testHold=true;
  window.__game.st.board=true;window.__game.board.visible=true;
  return window.__game.metalNext();
 });
 assert.equal(initial.skateAnimation.phase,'idle');
 // Press R2: actual game step drives actual Phase 6 leg pose while velocity remains controller-owned.
 await page.evaluate(()=>{
  window.__qaPad.buttons[7]={pressed:true,value:.95};
  window.__game.stepForTest(9,.016);
 });
 const loaded=await page.evaluate(()=>window.__game.metalNext());
 assert.equal(loaded.skateAnimation.phase,'load');
 assert.equal(loaded.pressureCount,0,'No extra push while foot is loading');
 await page.evaluate(()=>{
  window.__qaPad.buttons[7]={pressed:false,value:0};
  window.__game.stepForTest(1,.016);
 });
 const stroke=await page.evaluate(()=>window.__game.metalNext());
 assert.equal(stroke.pressureCount,1,'One impulse on release');
 assert.equal(stroke.skateAnimation.phase,'drive');
 assert.equal(stroke.action,'push');
 await page.evaluate(()=>window.__game.stepForTest(6,.016));
 const progressed=await page.evaluate(()=>window.__game.metalNext());
 assert.ok(progressed.skateAnimation.u>stroke.skateAnimation.u);
 report.stroke={firstPose:loaded.skateAnimation,releasePose:stroke.skateAnimation,recoveryPose:progressed.skateAnimation,
  exactlyOneImpulse:true};
 // In-memory test hook reuses a REAL fight-lot actor/combat body, not an invented DOM placeholder.
 const held=await page.evaluate(()=>window.__game.motionTest.holdActor('ballast'));
 assert.equal(held,true,'Real Ballast faction actor must be present');
 await page.evaluate(()=>{
  window.__qaPad.buttons[4]={pressed:true,value:1}; // LB
  window.__game.stepForTest(2,.016);
  window.__qaPad.buttons[3]={pressed:true,value:1}; // Y while LB held
  window.__game.stepForTest(1,.016);
 });
 const queued=await page.evaluate(()=>window.__game.metalNext());
 assert.equal(queued.throwAnimation.active,true);
 assert.equal(queued.throwAnimation.phase,'load');
 assert.equal(await page.evaluate(()=>window.__game.motionTest.isHolding()),true);
 await page.evaluate(()=>{
  window.__qaPad.buttons[4]={pressed:false,value:0};
  window.__qaPad.buttons[3]={pressed:false,value:0};
  window.__game.stepForTest(10,.016);
 });
 assert.equal(await page.evaluate(()=>window.__game.motionTest.isHolding()),true,'Target must remain attached before release marker');
 const before=await page.evaluate(()=>window.__game.metalNext().throwAnimation);
 assert.equal(before.releaseNow,false);
 await page.evaluate(()=>window.__game.stepForTest(16,.016));
 const released=await page.evaluate(()=>({
  held:window.__game.motionTest.isHolding(),
  actor:window.__game.factionActors.find(a=>a.kind==='ballast')?.body?.state,
  motion:window.__game.metalNext().throwAnimation
 }));
 assert.equal(released.held,false,'Throw should release actor at pose event');
 assert.equal(released.actor,'ragdoll-proxy','Actual combat-body physics should receive throw impulse');
 await page.evaluate(()=>window.__game.stepForTest(20,.016));
 const finished=await page.evaluate(()=>window.__game.metalNext());
 assert.equal(finished.throwCompletions,1,'Throw must complete once, no duplicate impulse');
 report.throw={windup:queued.throwAnimation,release:released,completed:finished.throwCompletions};
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('wir_metal_story_v1')).version)),1);
 await page.screenshot({path:'test-results/metal-choreo-browser.png',fullPage:true});
 // Legacy route remains unmodified by new animation code.
 const old=await ctx.newPage();old.on('pageerror',e=>errors.push(String(e)));
 await old.goto(base+'/connected/?lite=1',{waitUntil:'domcontentloaded',timeout:30000});
 await old.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().failed,null,{timeout:85000});
 assert.equal(await old.evaluate(()=>!!window.__ready),true);
 assert.equal(await old.evaluate(()=>window.__game.metalNext()),null);
 assert.equal(await old.evaluate(()=>window.__game.motionTest===undefined),true);
 assert.deepEqual(errors,[]);
 report.legacy={missionReady:true,optInMotionOff:true,saveVersion1Preserved:true};
 report.status='PASS';console.log('METAL PAIRED CHOREO BROWSER PASS',JSON.stringify(report));
}catch(e){report.error=String(e.stack||e);console.error('METAL PAIRED CHOREO BROWSER FAIL',report.error);process.exitCode=1;
}finally{writeFileSync('test-results/metal-choreo-browser-report.json',JSON.stringify(report,null,2));await browser.close();}
