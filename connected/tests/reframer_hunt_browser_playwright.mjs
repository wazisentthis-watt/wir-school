// Chromium smoke for actual WIR Connected ReFramer chase adapter.
// Does not fake completed missions or modify the normal story save.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const cases=[
 {name:'normal-savannah',path:'?lite=1',lab:false,touch:false},
 {name:'reframer-hunt-desktop',path:'?lite=1&reframer_hunt=1',lab:true,touch:false},
 {name:'reframer-hunt-touch',path:'?lite=1&reframer_hunt=1',lab:true,touch:true}
];
const results=[];
try{
 for(const c of cases){
  const context=await browser.newContext({viewport:c.touch?{width:390,height:844}:{width:1150,height:760},
   hasTouch:c.touch,isMobile:c.touch,deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/connected/'+c.path,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().error,null,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__ready),true,'Mission 01 did not boot');
   assert.match(await page.evaluate(()=>window.__game?.metalStoryChapter?.()?.title||''),/Metal Awakens/);
   assert.equal(await page.evaluate(()=>!!window.__game?.P?.o?.parent),true,'Metal model not in 3D world');
   if(!c.lab){
    assert.equal(await page.locator('#reframerBreakFree').count(),0,'Opt-in struggle button leaked to default game');
    assert.equal(await page.evaluate(()=>typeof window.__game?.reframerHunt),'undefined');
   }else{
    await page.waitForFunction(()=>typeof window.__game?.reframerHunt==='function',null,{timeout:16000});
    const state=await page.evaluate(()=>window.__game.reframerHunt());
    assert.equal(state.enabled,true);
    assert.equal(state.arms,8,'Existing eight-armed source was replaced');
    assert.ok(state.nests>=1,'No existing rooftop nests were recovered');
    assert.equal(state.armBroken,false);
    assert.equal(state.tether,'idle');
    const btn=page.locator('#reframerBreakFree');
    assert.equal(await btn.count(),1,'Missing touch escape control');
    assert.equal(await btn.isVisible(),false,'Escape button must only appear if physically caught');
    assert.equal(await page.evaluate(()=>document.querySelector('#reframerBreakFree').classList.contains('wir-keep')),true);
   }
   assert.equal(errors.length,0,'JavaScript errors: '+errors.join(' | '));
   await page.screenshot({path:'test-results/'+c.name+'.png'});
   console.log('PASS',c.name,c.lab?'Original eight-arm mesh and opt-in chase / struggle wiring present':'Normal Metal mission unaffected');
   results.push({case:c.name,pass:true,errors});
  }catch(e){
   console.error('FAIL',c.name,String(e.stack||e),errors);
   results.push({case:c.name,pass:false,error:String(e.stack||e),errors});
  }finally{await context.close();}
 }
 writeFileSync('test-results/reframer-hunt-browser.json',JSON.stringify(results,null,2));
 if(results.some(x=>!x.pass))process.exitCode=1;
}finally{await browser.close();}
