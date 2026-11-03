import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

// This is a REAL headless Chromium check of the branch's actual game build,
// including its world assets, WebGL, SLOTTA geometry, attack queue and Gallium.
// It is intentionally not an iPhone / physical controller certification.
const base=process.env.SLOTTA_QA_BASE||'http://127.0.0.1:8765';
const folder='test-results';mkdirSync(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
 '--disable-features=Vulkan','--no-sandbox'
]});
let page,report=null;const failures=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:820},
  deviceScaleFactor:1,serviceWorkers:'block'});
 page=await context.newPage();
 page.on('pageerror',error=>failures.push('uncaught: '+error.message));
 page.on('requestfailed',req=>{if(/\.(?:glb|gltf|js|css)(?:\?|$)/i.test(req.url()))
  failures.push('resource: '+req.url()+' '+(req.failure()?.errorText||''));});
 page.setDefaultTimeout(150000);
 await page.goto(base+'/connected/slotta-qa/',{waitUntil:'domcontentloaded'});
 await page.locator('#qa-state[data-state="ready"]').waitFor({timeout:150000});
 await page.locator('#runAll').click();
 await page.waitForFunction(()=>!!window.__slottaQAConsole?.report?.()?.cases?.length,
  null,{timeout:60000});
 report=await page.evaluate(()=>window.__slottaQAConsole.report());
 writeFileSync(folder+'/slotta_browser_report.json',JSON.stringify(report,null,2));
 await page.screenshot({path:folder+'/slotta_qa.png',fullPage:true});
 assert.equal(report.cases.length,8,'Eight real-game browser checks were required');
 for(const result of report.cases)assert.equal(result.ok,true,
  'SLOTTA browser QA '+result.id+': '+(result.message||JSON.stringify(result.details)));
 assert.equal(report.allPassed,true);
 assert.equal(report.gameReady,true);
 assert.equal(failures.length,0,'Browser runtime/resource failures: '+failures.join('; '));
 console.log('SLOTTA BROWSER QA: 8 / 8 verified in headless Chromium');
 for(const test of report.cases)console.log('PASS',test.id,JSON.stringify(test.details||{}));
}catch(e){
 console.error('SLOTTA BROWSER QA FAILED:',e.stack||String(e));
 if(page){
  try{await page.screenshot({path:folder+'/slotta_failure.png',fullPage:true});}catch{}
  try{
   const data=await page.evaluate(()=>({
    state:document.querySelector('#qa-state')?.dataset.state,
    detail:document.querySelector('#statusDetail')?.textContent,
    frameErrors:document.querySelector('#game')?.contentWindow?.__errors||[],
    frameLoad:document.querySelector('#game')?.contentDocument?.querySelector('#loadmsg')?.textContent,
    report:window.__slottaQAConsole?.report?.()
   }));
   writeFileSync(folder+'/slotta_failure.json',JSON.stringify({data,failures},null,2));
   console.error('QA browser details',JSON.stringify(data).slice(0,5000));
  }catch(err){console.error('Diagnostics unavailable',String(err));}
 }
 process.exitCode=1;
}finally{await browser.close();}
