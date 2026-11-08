// WIR Connected ReFramer SQUAD scene smoke: normal, desktop, touch,
// and ACTUAL source car GLB theft by two distinct octopus robots.
// This is QA-only and never deploys an enabled squad by default.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const cases=[
 {name:'normal-savannah',url:'?lite=1',squad:false,mobile:false},
 {name:'squad-desktop',url:'?lite=1&reframer_squad=1',squad:true,mobile:false},
 {name:'squad-iphone-emulation',url:'?lite=1&reframer_squad=1',squad:true,mobile:true},
 {name:'squad-dual-real-car-qa',url:'?lite=1&reframer_squad=1&reframer_squad_qa=1',squad:true,mobile:false,qa:true}
];
const results=[];
try{
 for(const c of cases){
  const ctx=await browser.newContext({
   viewport:c.mobile?{width:390,height:844}:{width:1120,height:760},
   hasTouch:c.mobile,isMobile:c.mobile,deviceScaleFactor:1,serviceWorkers:'block'
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  try{
   await page.goto(base+'/connected/'+c.url,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().error,null,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__ready),true,'Normal mission loading regressed');
   assert.match(await page.evaluate(()=>window.__game?.metalStoryChapter?.()?.title||''),/Metal Awakens/);
   if(!c.squad){
    assert.equal(await page.evaluate(()=>typeof window.__game?.reframerSquad),'undefined');
    assert.equal(await page.locator('#reframerSquadBreakFree').count(),0,'Opt-in HUD leaked');
   }else{
    await page.waitForFunction(()=>typeof window.__game?.reframerSquad==='function',null,{timeout:20000});
    const snap=await page.evaluate(()=>window.__game.reframerSquad());
    assert.equal(snap.total,c.mobile?2:3,'Incorrect total original + independent wing actors');
    assert.equal(snap.wingActors.length,c.mobile?1:2);
    assert.ok(snap.wingActors.every(x=>x.arms===8),'Independent agents missing authentic 8-limb procedural rigs');
    assert.equal(snap.vehicleClaims.length,0,'Cars stolen without an encounter');
    assert.equal(await page.locator('#reframerSquadBreakFree').count(),1);
    assert.equal(await page.locator('#reframerSquadBreakFree').isVisible(),false,'No unexplained escape HUD');
    if(c.qa){
     const init=await page.evaluate(()=>window.__game.reframerSquadQA?.begin());
     assert.equal(init?.ok,true,'Unable to use existing two Kenney car meshes');
     assert.equal(init.distinct,2,'Two machines attempted to steal the same vehicle');
     assert.ok(init.originals.every(x=>x.meshCount>0),'No actual mesh in donor GLB');
     const active=await page.evaluate(()=>window.__game.reframerSquad());
     assert.equal(active.vehicleClaims.length,2);
     assert.equal(new Set(active.wingActors.map(x=>x.carId)).size,2);
     const evolved=await page.evaluate(()=>window.__game.reframerSquadQA.advance(280,.05));
     assert.equal(evolved.ok,true);
     const snap=evolved.state;
     assert.ok(snap.wingActors.every(x=>x.stage==='chase'),'Original source machine did not finish actual car dismantle / Roadframe state');
     assert.ok(snap.wingActors.every(x=>x.attachedMeshes>0),'No actual donor wheel mesh removed and attached to machine');
     assert.equal(snap.vehicleClaims.length,2);
     assert.ok(snap.wings.every(x=>x.parts.length>0),'Missing individual finite part inventories');
     const partIds=snap.wings.flatMap(x=>x.parts.map(p=>p.id));
     assert.equal(new Set(partIds).size,partIds.length,'Duplicated salvaged parts across machines');
     console.log('REFRAMER TWO REAL CAR SHELLS',JSON.stringify({
      originalMeshCounts:init.originals.map(x=>x.meshCount),
      stages:snap.wingActors.map(x=>x.stage),
      partCounts:snap.wings.map(x=>x.parts.length),distinct: init.distinct
     }));
     // Hit one of the REAL, detached donor wheels, not a fictional enemy HP value.
     // No vehicle part may respawn or be removed from the other independent agent.
     const target=snap.wings[0].id,other=snap.wings[1];
     const first=await page.evaluate(id=>window.__game.reframerSquadQA.attack(id,'car'),target);
     assert.equal(first.ok,true,'Real source-wheel attack missed');
     const second=await page.evaluate(id=>window.__game.reframerSquadQA.attack(id,'car'),target);
     assert.equal(second.ok,true,'Source-wheel break did not register');
     const final=second.state;
     assert.equal(final.wings[0].parts.length,snap.wings[0].parts.length-1,'Destroyed wheel was not removed from the owner inventory');
     assert.equal(final.wings[1].parts.length,other.parts.length,'Attack stole parts from another agent');
     assert.equal(new Set(final.wings.flatMap(x=>x.parts.map(p=>p.id))).size,
      final.wings.reduce((n,x)=>n+x.parts.length,0),'Duplicate physical wheel inventory after combat');
     console.log('REFRAMER REAL COMPONENT BREAK',JSON.stringify({
      targeted:target,remaining:final.wings[0].parts.length,
      otherUnchanged:final.wings[1].parts.length
     }));
    }
   }
   assert.equal(errors.length,0,'Runtime JS errors: '+errors.join(' | '));
   await page.screenshot({path:'test-results/reframer-'+c.name+'.png'});
   console.log('PASS',c.name);
   results.push({case:c.name,ok:true,errors});
  }catch(e){
   console.error('FAIL',c.name,String(e.stack||e),errors);
   results.push({case:c.name,ok:false,error:String(e.stack||e),errors});
   try{await page.screenshot({path:'test-results/reframer-failed-'+c.name+'.png',fullPage:true})}catch{}
  }finally{await ctx.close()}
 }
 writeFileSync('test-results/reframer-squad-browser.json',JSON.stringify(results,null,2));
 if(results.some(x=>!x.ok))process.exitCode=1;
}finally{await browser.close()}
