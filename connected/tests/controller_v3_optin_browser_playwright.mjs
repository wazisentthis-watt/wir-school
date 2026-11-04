// Isolated integration QA: opt-in controller mode does not replace existing missions,
// player saves or physical grip-button ownership. PROPOSAL / PUBLISH HOLD.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const evidence={status:'FAIL',defaultMode:null,optin:null,hardwareTested:false,publishHold:true};
const errors=[];
let page;
try{
 const context=await browser.newContext({viewport:{width:1024,height:720},serviceWorkers:'block'});
 await context.addInitScript(()=>{
  const story=JSON.stringify({version:1,chapter:1,flags:{skate_reached:true},
   checkpoint:{position:{x:0,y:.25,z:8},reason:'Controller QA'},updatedAt:null});
  window.__qaStoryOriginal=story;
  localStorage.setItem('wir_metal_story_v1',story);
  window.__qaPad={id:'QA Simulated Xbox Controller',index:0,connected:true,mapping:'standard',
   axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
 });
 page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/connected/?lite=1&controller_v3=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().failed,
  null,{timeout:65000});
 assert.equal(await page.evaluate(()=>!!window.__ready),true,'Mission failed to start in opt-in mode');
 await page.waitForFunction(()=>window.__controllerV3?.status().connected===true,null,{timeout:15000});
 assert.equal(await page.locator('#connected-controller-v3-panel').count(),1);
 assert.equal(await page.evaluate(()=>window.__controllerV3.status().id),'QA Simulated Xbox Controller');
 await page.evaluate(()=>{window.__qaPad.axes[0]=.95;});
 await page.waitForFunction(()=>window.__controllerV3.status().move.x>.8,null,{timeout:5000});
 await page.evaluate(()=>{window.__qaPad.axes[0]=0;window.__qaPad.buttons[0]={pressed:true,value:1};});
 await page.waitForFunction(()=>window.__game?.keys?.Space===true,null,{timeout:5000});
 await page.evaluate(()=>{window.__qaPad.buttons[0]={pressed:false,value:0};});
 await page.waitForFunction(()=>window.__game?.keys?.Space===false,null,{timeout:5000});
 await page.evaluate(()=>window.__controllerV3.configure({deadzone:.27}));
 assert.equal(await page.evaluate(()=>window.__controllerV3.status().deadzone),.27);
 // Reserve LB/RB/LT/RT for existing live-world logic. Do not remap them to keys.
 await page.evaluate(()=>{for(const i of [4,5,6,7])window.__qaPad.buttons[i]={pressed:true,value:1};});
 assert.equal(await page.evaluate(()=>!!window.__game?.keys?.KeyQ),false);
 await page.evaluate(()=>{for(const i of [4,5,6,7])window.__qaPad.buttons[i]={pressed:false,value:0};});
 assert.equal(await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),await page.evaluate(()=>window.__qaStoryOriginal));
 evidence.optin={gameReady:true,panel:true,gamepadId:true,analogMovement:true,jump:true,release:true,
  remapProfile:true,storySaveUnchanged:true};
 await page.screenshot({path:'test-results/connected-controller-v3-optin.png',fullPage:true});
 // Default route must not activate new adapter or panel even if pad is connected.
 const ordinary=await context.newPage();ordinary.on('pageerror',e=>errors.push(String(e)));
 await ordinary.goto(base+'/connected/?lite=1',{waitUntil:'domcontentloaded',timeout:30000});
 await ordinary.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().failed,
  null,{timeout:65000});
 assert.equal(await ordinary.evaluate(()=>!!window.__ready),true,'Legacy mission failed to load');
 assert.equal(await ordinary.evaluate(()=>window.__controllerV3===undefined),true,'Opt-in leaked into default');
 assert.equal(await ordinary.locator('#connected-controller-v3-panel').count(),0);
 assert.equal(await ordinary.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),await ordinary.evaluate(()=>window.__qaStoryOriginal));
 evidence.defaultMode={gameReady:true,adapterOff:true,missionSaveUnchanged:true};
 assert.deepEqual(errors,[],'Browser JavaScript errors');
 evidence.status='PASS';console.log('CONNECTED CONTROLLER v3 OPT-IN QA PASS',JSON.stringify(evidence));
}catch(e){
 evidence.error=String(e.stack||e);console.error('CONNECTED CONTROLLER v3 QA FAILED',evidence.error);process.exitCode=1;
}finally{
 writeFileSync('test-results/connected-controller-v3-qa.json',JSON.stringify(evidence,null,2));
 await browser.close();
}
