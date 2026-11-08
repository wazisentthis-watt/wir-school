// METAL story mold in-scene browser test: legacy game unchanged, real skate
// first rhythm validated, separate autosave and season finale visible as roadmap.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const specs=[
 {name:'savannah-baseline',path:'?lite=1',campaign:false,mobile:false},
 {name:'campaign-first-push-desktop',path:'?lite=1&metal_campaign=1',campaign:true,mobile:false},
 {name:'campaign-first-push-touch',path:'?lite=1&metal_campaign=1',campaign:true,mobile:true}
];
const results=[];
try{
 for(const c of specs){
  const ctx=await browser.newContext({viewport:c.mobile?{width:390,height:844}:{width:1150,height:740},
   isMobile:c.mobile,hasTouch:c.mobile,deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  try{
   await page.goto(base+'/connected/'+c.path,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().error,
    null,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__ready),true,'Original Mission 01 did not load');
   assert.match(await page.evaluate(()=>window.__game?.metalStoryChapter?.()?.title||''),/Metal Awakens/);
   if(!c.campaign){
    assert.equal(await page.locator('#metalStoryMold').count(),0);
    assert.equal(await page.evaluate(()=>typeof window.__game?.metalStoryMold),'undefined');
   }else{
    await page.waitForFunction(()=>typeof window.__game?.metalStoryMold==='function',
     null,{timeout:20000});
    assert.equal(await page.locator('#metalStoryMoldToggle').isVisible(),true,
     'Campaign prompt suppressed by clean-screen mode');
    await page.locator('#metalStoryMoldToggle').click();
    assert.equal(await page.locator('#metalStoryMoldPanel').isVisible(),true);
    assert.equal(await page.locator('#metalStorySeasonIndex').count(),1);
    assert.equal(await page.locator('#metalStoryFinalePreview').count(),1);
    assert.equal(await page.locator('#metalStorySeasonIndex [data-episode]').count(),30);
    const before=await page.evaluate(()=>window.__game.metalStoryMold());
    assert.equal(before.episodes,30);
    assert.equal(before.firstPush,false);
    assert.equal(before.finaleUnlocked,false);
    // Insufficient evidence must NOT mint story progress.
    await page.locator('#metalStoryFirstPush').click();
    assert.equal(await page.evaluate(()=>window.__game.metalStoryMold().firstPush),false);
    // QA physically moves existing Metal within one ordinary Skatepark and
    // equips the ORIGINAL game's board / velocity; mission logic itself has
    // no teleport or mock controller.
    await page.evaluate(()=>{
     const g=window.__game,c=g.SPOTS.skate.c;
     g.P.o.position.set(c.x,.25,c.z);
     g.st.board=true;g.board.visible=true;g.vel.set(2.3,0,0);
     g.stepForTest(1,.016);
    });
    const evidence=await page.evaluate(()=>{
     const g=window.__game,c=g.SPOTS.skate.c,p=g.P.o.position;
     return {grounded:g.ground(),board:g.st.board,
      speed:Math.hypot(g.vel.x,g.vel.z),dist:Math.hypot(c.x-p.x,c.z-p.z)};
    });
    assert.equal(evidence.board,true,'Player has no real board');
    assert.ok(evidence.dist<14,'Player did not reach real park');
    assert.ok(evidence.grounded,'Original movement solver does not report ground');
    assert.ok(evidence.speed>=.8,'Original movement solver did not report rolling speed');
    const originalSave=await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1'));
    await page.locator('#metalStoryFirstPush').click();
    const state=await page.evaluate(()=>window.__game.metalStoryMold());
    assert.equal(state.firstPush,true,'First playable story beat failed to complete');
    assert.deepEqual(state.recordedStems,['First Push']);
    assert.equal(state.finaleUnlocked,false);
    assert.equal(state.episodeProgress.s1e01,'FIELD_RECORDING_DONE');
    assert.equal(await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),
     originalSave,'New story beat corrupted or rewrote original save');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__ready===true
     &&typeof window.__game?.metalStoryMold==='function',null,{timeout:90000});
    assert.equal(await page.evaluate(()=>window.__game.metalStoryMold().firstPush),true,
     'Progress lost after reload');
    console.log('PASS METAL FIRST PUSH',c.name,JSON.stringify({evidence,recorded:true,
     separateSave:true,episodeCount:30,finale:'gated'}));
   }
   assert.equal(errors.length,0,'Unexpected runtime errors: '+errors.join(' | '));
   await page.screenshot({path:'test-results/metal-story-'+c.name+'.png'});
   results.push({name:c.name,pass:true});
  }catch(e){
   console.log('FAIL METAL STORY',c.name,String(e.stack||e),errors);
   results.push({name:c.name,pass:false,error:String(e.stack||e),errors});
   try{await page.screenshot({path:'test-results/metal-story-failed-'+c.name+'.png',fullPage:true})}catch{}
  }finally{await ctx.close();}
 }
 writeFileSync('test-results/metal-story-mold-browser.json',JSON.stringify(results,null,2));
 if(results.some(x=>!x.pass))process.exitCode=1;
}finally{await browser.close()}
