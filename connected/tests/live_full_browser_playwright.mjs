import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

// Non-mutating live hosted startup QA for the full-quality game (the existing
// mission recovery suite exercises Lite Mode). Chromium is not physical Safari.
const base=process.env.METAL_BOOT_BASE||'https://wazisentthis-watt.github.io/wir-school';
const cases=[
 {name:'desktop-full',viewport:{width:1280,height:800},isMobile:false,hasTouch:false},
 {name:'mobile-full',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
 '--disable-features=Vulkan','--no-sandbox'
]});
const results=[];
try{
 for(const testCase of cases){
  const ctx=await browser.newContext({viewport:testCase.viewport,
   isMobile:testCase.isMobile,hasTouch:testCase.hasTouch,deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await ctx.newPage();
  const errors=[],failedRequests=[],consoleErrors=[];
  page.on('pageerror',err=>errors.push(String(err.stack||err)));
  page.on('requestfailed',req=>failedRequests.push({url:req.url(),error:req.failure()?.errorText}));
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
  let snapshot=null;
  try{
   await page.goto(base+'/connected/?live_qa='+testCase.name,
    {waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||
    !!window.__bootRecovery?.getStatus?.().error,null,{timeout:75000});
   snapshot=await page.evaluate(()=>({
    ready:window.__ready===true,
    mission:window.__game?.metalStoryChapter?.()?.title||null,
    state:window.__bootRecovery?.getStatus?.()||null,
    canvas:!!document.querySelector('canvas'),
    loadingPanel:document.getElementById('load')?.style.display||'',
    errors:window.__errors||[]
   }));
   assert.ok(snapshot.ready,'Full-quality mission is not ready: '+JSON.stringify(snapshot));
   assert.ok(snapshot.canvas,'Full-quality renderer canvas absent');
   assert.match(snapshot.mission||'',/Metal Awakens/);
   assert.equal(errors.length,0,'Browser exceptions: '+JSON.stringify(errors));
   await page.waitForTimeout(1200);
   assert.equal(errors.length,0,'Post-boot browser exception: '+JSON.stringify(errors));
   results.push({name:testCase.name,pass:true,snapshot,failedRequests,consoleErrors});
   console.log('PASS LIVE FULL',testCase.name,JSON.stringify({
    mission:snapshot.mission,warnings:snapshot.state?.warnings?.length||0,
    failedRequests:failedRequests.length,consoleErrors:consoleErrors.length
   }));
  }catch(e){
   results.push({name:testCase.name,pass:false,error:String(e.stack||e),
    snapshot,errors,failedRequests,consoleErrors});
   console.error('FAIL LIVE FULL',testCase.name,String(e.stack||e));
   console.error('BROWSER ERRORS',JSON.stringify(errors));
   console.error('BROWSER FAILED REQUESTS',JSON.stringify(failedRequests));
   console.error('BROWSER CONSOLE',JSON.stringify(consoleErrors));
   try{await page.screenshot({path:'test-results/live_full_'+testCase.name+'.png',fullPage:true});}catch{}
  }finally{await ctx.close();}
 }
 writeFileSync('test-results/live_full_results.json',JSON.stringify(results,null,2));
 if(results.some(result=>!result.pass))process.exitCode=1;
}finally{await browser.close();}
