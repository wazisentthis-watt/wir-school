import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

// Real browser fault injection against the existing first mission. This is
// headless Chromium on Linux, not an iOS Safari or Bluetooth-controller test.
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const outcomes=[];
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const checkpoint=JSON.stringify({version:1,chapter:0,flags:{},checkpoint:null,updatedAt:null});
const profile=JSON.stringify({created:1740000000000,decisions:[],achievements:[],discoveries:[],log:[]});
const context=await browser.newContext({viewport:{width:1180,height:750},deviceScaleFactor:1,serviceWorkers:'block'});
await context.addInitScript(({checkpoint,profile})=>{
 localStorage.setItem('wir_metal_story_v1',checkpoint);
 localStorage.setItem('wir_valence_profile_v1',profile);
},{checkpoint,profile});
async function awaitMission(page){
 await page.waitForFunction(()=>window.__ready===true&&!!window.__game?.P?.o
  || !!window.__bootRecovery?.getStatus?.().error,null,{timeout:55000});
 const status=await page.evaluate(()=>window.__bootRecovery?.getStatus?.());
 if(status?.error)throw Error('Game boot failed at '+status.phase+': '+status.error+
  '\\nSee browser page errors and screenshot in CI evidence.');
 return page.evaluate(()=>({
  ready:window.__ready,
  mission:window.__game?.metalStoryChapter?.()?.title,
  warnings:window.__game?.bootReport?.()?.warnings||[],
  canvas:!!document.querySelector('canvas'),
  game:!!window.__game?.P?.o,
  saved:localStorage.getItem('wir_metal_story_v1'),
  errors:window.__errors||[],
  fallbackMetal:window.__game?.P?.model?.userData?.missionFallback||null
 }));
}
let current=null;const pageErrors=[],failedResponses=[];
const observe=page=>{
 page.on('pageerror',error=>pageErrors.push(String(error.stack||error.message||error)));
 page.on('response',response=>{if(response.status()>=400&&response.url().includes('/connected/'))
  failedResponses.push({url:response.url(),status:response.status()});});
};
try{
 // Baseline route: full first mission, existing world and original asset paths.
 current=await context.newPage();observe(current);
 const normalErrors=[];current.on('pageerror',e=>normalErrors.push(e.message));
 await current.goto(base+'/connected/?lite=1',{waitUntil:'domcontentloaded'});
 const normal=await awaitMission(current);
 assert.equal(normal.ready,true);assert.equal(normal.canvas,true);assert.equal(normal.game,true);
 assert.match(normal.mission||'',/Metal Awakens/);
 assert.equal(normal.saved,checkpoint,'Startup mutated the existing checkpoint');
 assert.equal(normalErrors.length,0,'Normal route emitted runtime exceptions');
 outcomes.push({scenario:'normal',pass:true,mission:normal.mission,warnings:normal.warnings.length});
 await current.close();

 // Fault injection: deliberate 404 on important model dependencies, plus
 // a city building and car. The fallback must be visible and traceable.
 current=await context.newPage();observe(current);
 const missing=['RobotExpressive.glb','metal_phase6_fight.glb',
  'metal_skateboard_4wheel_PLACEHOLDER.glb','building-a.glb','taxi.glb'];
 const aborted=[];
 await current.route('**/connected/assets/models/**',route=>{
  const filename=decodeURIComponent(route.request().url()).split('/').pop();
  if(missing.includes(filename)){
   aborted.push(filename);return route.fulfill({status:404,contentType:'text/plain',body:'QA simulated missing asset'});
  }
  return route.continue();
 });
 await current.goto(base+'/connected/?lite=1',{waitUntil:'domcontentloaded'});
 const degraded=await awaitMission(current);
 assert.equal(degraded.saved,checkpoint,'Recovery changed the saved Metal checkpoint');
 assert.equal(degraded.fallbackMetal,'metal','Metal was not replaced with the fallback mesh');
 assert.ok(degraded.warnings.length>=4,'Not all missing model warnings were captured');
 console.log('DEGRADED BOOT CAPTURED ERRORS',JSON.stringify(degraded.errors));
 assert.equal(degraded.errors.length,0,'Fallback startup logged game runtime errors: '+JSON.stringify(degraded.errors));
 for(const name of missing)assert.ok(aborted.includes(name),'Missing asset route was not exercised: '+name);
 outcomes.push({scenario:'missing-models',pass:true,missing:aborted,warnings:degraded.warnings.map(w=>w.asset),
  fallback:degraded.fallbackMetal});
 await current.screenshot({path:'test-results/metal_mission_fallback.png',fullPage:true});
 await current.close();

 // Fatal module outage: independent classic boot script offers retry and Lite
 // before any main.js code can execute. Retry must keep existing save bytes.
 current=await context.newPage();observe(current);
 let failOnce=true;
 await current.route('**/connected/assets/main.js',route=>{
  if(failOnce){failOnce=false;return route.abort('failed');}
  return route.continue();
 });
 await current.goto(base+'/connected/',{waitUntil:'domcontentloaded'});
 await current.locator('#loadActions button').first().waitFor({state:'visible',timeout:20000});
 const failState=await current.evaluate(()=>window.__bootRecovery?.getStatus?.());
 assert.ok(failState?.error,'Boot recovery did not notice main script failure');
 const controls=current.locator('#loadActions button');
 assert.equal(await controls.count(),3);
 await controls.nth(1).click();
 await current.waitForURL(url=>url.searchParams.get('lite')==='1'&&url.searchParams.has('retry'),
  {timeout:20000});
 const reloaded=await awaitMission(current);
 assert.equal(reloaded.saved,checkpoint,'Retry deleted existing save');
 assert.equal(reloaded.ready,true);
 outcomes.push({scenario:'fatal-module-retry',pass:true,error:failState.error,
  liteReload:true,savePreserved:true});
 await current.screenshot({path:'test-results/metal_mission_retry.png',fullPage:true});

 writeFileSync('test-results/metal_mission_recovery.json',JSON.stringify({passed:3,total:3,outcomes},null,2));
 for(const item of outcomes)console.log('PASS METAL MISSION',item.scenario,JSON.stringify(item));
}catch(e){
 writeFileSync('test-results/metal_mission_recovery.json',
  JSON.stringify({passed:outcomes.length,total:3,outcomes,error:String(e.stack||e),pageErrors,failedResponses},null,2));
 console.error('METAL MISSION RECOVERY FAILED',e.stack||e);
 console.error('BROWSER MODULE ERRORS',JSON.stringify(pageErrors));
 console.error('BROWSER FAILED RESPONSES',JSON.stringify(failedResponses));
 if(current){try{await current.screenshot({path:'test-results/metal_mission_failure.png',fullPage:true});}catch{}}
 process.exitCode=1;
}finally{await browser.close();}
