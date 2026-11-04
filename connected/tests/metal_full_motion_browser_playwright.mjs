import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
const report={status:'FAILED',optIn:null,legacy:null,actualController:false,realDevice:false,webglPixelsObserved:false};
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
let pages=[];
try{
 const ctx=await browser.newContext({viewport:{width:1100,height:720},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('wir_metal_story_v1',JSON.stringify({version:1,chapter:1,
   flags:{skate_reached:true},checkpoint:{position:{x:0,y:.25,z:8},reason:'QA'},
   updatedAt:null}));
  window.__qaPad={id:'QA Simulated Controller',mapping:'standard',index:0,connected:true,
   axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
 });
 const open=async path=>{
  const p=await ctx.newPage();pages.push(p);
  p.on('pageerror',e=>{report.errors??=[];report.errors.push(String(e))});
  await p.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForFunction(()=>window.__ready===true||window.__errors?.length>2,null,{timeout:85000});
  assert.equal(await p.evaluate(()=>!!window.__ready),true,'Mission must fully load at '+path);
  return p;
 };
 const p=await open('/connected/?lite=1&controller_v3=1&metal_next=1');
 await p.waitForFunction(()=>window.__game?.metalNext?.()?.enabled===true,null,{timeout:10000});
 const initial=await p.evaluate(()=>window.__game.metalNext());
 assert.ok(initial.actorKinds.includes('ballast')&&initial.actorKinds.includes('kiln'));
 assert.equal(initial.cityGridSize,5,'Lite Mode must not grow its map');
 await p.evaluate(()=>{
  window.__testHold=true;
  const g=window.__game;g.st.board=true;g.board.visible=true;
  window.__qaPad.buttons[7]={pressed:true,value:.9};
  g.stepForTest(8,.016);
  window.__qaPad.buttons[7]={pressed:false,value:0};
  g.stepForTest(1,.016);
 });
 const afterTap=await p.evaluate(()=>window.__game.metalNext());
 assert.equal(afterTap.pressureCount,1,'One short RT press should produce one impulse');
 assert.equal(afterTap.action,'push');
 await p.evaluate(()=>{
  window.__qaPad.buttons[7]={pressed:true,value:1};
  window.__game.stepForTest(39,.016);
  window.__qaPad.buttons[7]={pressed:false,value:0};
  window.__game.stepForTest(1,.016);
 });
 const afterRiff=await p.evaluate(()=>window.__game.metalNext());
 assert.equal(afterRiff.pressureCount,2);
 assert.equal(afterRiff.action,'riff-board');
 const story=await p.evaluate(()=>localStorage.getItem('wir_metal_story_v1'));
 assert.ok(JSON.parse(story).version===1,'Story save must remain valid');
 await p.screenshot({path:'test-results/metal-full-motion-optin.png',fullPage:true});
 report.optIn={initial,afterTap,afterRiff,saveVersion:1,htmlReady:true};
 const normal=await open('/connected/?lite=1');
 const legacy=await normal.evaluate(()=>({enabled:window.__game?.metalNext?.(),
  ready:window.__ready,story:localStorage.getItem('wir_metal_story_v1')}));
 assert.equal(legacy.enabled,null,'No pressure or enemy features without metal_next=1');
 assert.equal(legacy.ready,true);assert.equal(JSON.parse(legacy.story).version,1);
 report.legacy={ready:true,optInDisabled:true,storyValid:true};
 assert.deepEqual(report.errors||[],[],'No browser runtime errors');
 report.status='PASS';console.log('METAL FULL MOTION BROWSER PASS',JSON.stringify(report));
}catch(e){report.error=String(e.stack||e);console.error('METAL FULL MOTION BROWSER FAIL',report.error);process.exitCode=1;
}finally{
 writeFileSync('test-results/metal-full-motion-browser.json',JSON.stringify(report,null,2));
 await browser.close();
}
