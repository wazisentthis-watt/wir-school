import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
const cases=[
 {name:'ordinary-savannah',query:'?lite=1',mobile:false,lab:false},
 {name:'metal-lab-desktop',query:'?lite=1&metal_abilities=1',mobile:false,lab:true},
 {name:'metal-lab-touch',query:'?lite=1&metal_abilities=1',mobile:true,lab:true}
];
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const results=[];
try{
 for(const c of cases){
  const context=await browser.newContext({
   viewport:c.mobile?{width:390,height:844}:{width:1180,height:760},
   isMobile:c.mobile,hasTouch:c.mobile,deviceScaleFactor:1,serviceWorkers:'block'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  try{
   await page.goto(base+'/connected/'+c.query,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().error,
    null,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__ready),true,'Mission not ready');
   const mission=await page.evaluate(()=>window.__game?.metalStoryChapter?.()?.title);
   assert.match(mission||'',/Metal Awakens/);
   if(!c.lab){
    assert.equal(await page.locator('#metalPowerLab').count(),0,'Lab leaked into ordinary game');
    assert.equal(await page.evaluate(()=>typeof window.__game?.metalPowerLab),'undefined');
    assert.equal(errors.length,0,'Baseline JavaScript error: '+errors.join(' | '));
    results.push({case:c.name,pass:true,mission});continue;
   }
   await page.waitForFunction(()=>!!window.__game?.metalPowerLab?.(),null,{timeout:20000});
   const start=await page.evaluate(()=>{
    const g=window.__game;
    localStorage.setItem('wir_metal_story_v1','preserve-this-separate-mission-save');
    const p=g.P.o.position;window.__powerLabOrigin={x:p.x,y:p.y,z:p.z};
    return {power:g.metalPowerLab(),gal:g.st.gal,origin:{x:p.x,y:p.y,z:p.z},
      mainSave:localStorage.getItem('wir_metal_story_v1')};
   });
   assert.equal(start.power.registry.total,73);
   assert.equal(start.power.stage,0);
   assert.equal(start.power.sceneObjects.salvage,5);
   const rootInfo=await page.evaluate(()=>{
    const node=document.getElementById('metalPowerLab'),button=node?.querySelector('button');
    return {root:!!node,button:!!button,hidden:button?.hidden,outer:button?.outerHTML.slice(0,220),
     display:button?getComputedStyle(button).display:null,
     parentDisplay:node?getComputedStyle(node).display:null,visibility:button?getComputedStyle(button).visibility:null};
   });
   console.log('POWER LAB BUTTON DIAGNOSTICS',c.name,JSON.stringify(rootInfo));
   assert.equal(rootInfo.button,true,'Power Lab button not created');
   assert.notEqual(rootInfo.parentDisplay,'none','Clean Screen suppressed the explicitly opted-in lab');
   assert.notEqual(rootInfo.display,'none','Ability lab trigger is invisible');
   await page.locator('#metalPowerLab > button').first().click({timeout:8000});
   const collect=page.locator('button[data-ability="collect"]');
   await page.evaluate(()=>{
    const p=window.__game.P.o.position,o=window.__powerLabOrigin;
    p.set(o.x-3,.25,o.z-6);
   });
   await page.waitForTimeout(100);
   await collect.click();
   await page.evaluate(()=>{
    const p=window.__game.P.o.position,o=window.__powerLabOrigin;
    p.set(o.x+2,.25,o.z-9);
   });
   await page.waitForTimeout(100);
   await collect.click();
   let state=await page.evaluate(()=>window.__game.metalPowerLab());
   assert.equal(state.stage,1,'Two genuine collected sources did not unlock repair');
   assert.equal(state.scrap,2);
   await page.evaluate(()=>{
    const p=window.__game.P.o.position,o=window.__powerLabOrigin;
    p.set(o.x+5,.25,o.z+5);
   });
   await page.locator('button[data-ability="reinforce"]').click();
   state=await page.evaluate(()=>window.__game.metalPowerLab());
   assert.equal(state.stage,2,'Physically local reinforcement failed');
   assert.ok(state.supportIntegrity>=.8);
   // Move into the open plaza, where the nearest forward placement is unoccupied.
   const candidates=[[0,0],[-6,8],[10,-6],[-9,-7]];
   let built=false;
   for(const [dx,dz] of candidates){
    await page.evaluate(([x,z])=>{
     const p=window.__game.P.o.position,o=window.__powerLabOrigin;
     p.set(o.x+x,.25,o.z+z);
    },[dx,dz]);
    await page.waitForTimeout(50);
    await page.locator('button[data-ability="build"]').click();
    const q=await page.evaluate(()=>window.__game.metalPowerLab());
    if(q.stage>=3){built=true;break;}
   }
   state=await page.evaluate(()=>window.__game.metalPowerLab());
   assert.equal(built,true,'Physical Gallium panel placement never found a free place');
   assert.equal(state.structures.length,1);
   assert.equal(state.sceneObjects.panels,1);
   const saveBefore=await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1'));
   assert.equal(saveBefore,'preserve-this-separate-mission-save');
   // The trusted game physics owner still controls grounded state.
   await page.waitForFunction(()=>window.__game?.ground?.()===true,null,{timeout:6000});
   await page.locator('button[data-ability="snap-step"]').click();
   state=await page.evaluate(()=>window.__game.metalPowerLab());
   assert.equal(state.stage,4,'Snap Step did not complete in the real scene');
   assert.equal(state.lastAction,'snap-step');
   assert.ok(state.focus<1);
   // Inspect the exact panel the core created, not any unrelated city collider.
   await page.evaluate(()=>{
    const g=window.__game,q=g.metalPowerLab(),p=q.structures[0].pos;
    g.P.o.position.set(p.x,.25,p.z-1.2);
   });
   await page.waitForTimeout(100);
   await page.locator('button[data-ability="impact"]').click();
   state=await page.evaluate(()=>window.__game.metalPowerLab());
   assert.ok(state.structures[0].integrity<1);
   const galBefore=await page.evaluate(()=>window.__game.st.gal);
   await page.locator('button[data-ability="reclaim"]').click();
   const galAfter=await page.evaluate(()=>window.__game.st.gal);
   state=await page.evaluate(()=>window.__game.metalPowerLab());
   assert.equal(state.structures.length,0);
   assert.ok(galAfter>galBefore,'Reclaim did not return surviving metal');
   assert.equal(state.stage,4,'Knowledge lost after reclaim');
   assert.equal(await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),
    'preserve-this-separate-mission-save');
   assert.equal(errors.length,0,'Browser errors: '+errors.join(' | '));
   await page.screenshot({path:'test-results/metal-powers-'+c.name+'.png',fullPage:true});
   console.log('PASS METAL POWER LAB',c.name,'mission complete · 73 registry entries · real objects and saves');
   results.push({case:c.name,pass:true,stage:state.stage,sources:start.power.sceneObjects.salvage,
    mission,galBefore,galAfter,registry:state.registry,saveIsolated:true});
  }catch(e){
   results.push({case:c.name,pass:false,error:String(e.stack||e),errors});
   console.error('FAIL METAL POWER LAB',c.name,String(e.stack||e),errors);
   try{await page.screenshot({path:'test-results/metal-powers-fail-'+c.name+'.png',fullPage:true});}catch{}
  }finally{await context.close();}
 }
 writeFileSync('test-results/metal-powers-lab.json',JSON.stringify(results,null,2));
 if(results.some(x=>!x.pass))process.exitCode=1;
}finally{await browser.close();}
