import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const cases=[
 {name:'ordinary-mission-preserved',url:'?lite=1',feature:false,mobile:false},
 {name:'visible-reframers-plus-wheel-desktop',url:'?lite=1&reframer_squad=1&metal_abilities=1&reframer_squad_qa=1',feature:true,mobile:false},
 {name:'visible-reframers-plus-wheel-touch',url:'?lite=1&reframer_squad=1&metal_abilities=1&reframer_squad_qa=1',feature:true,mobile:true}
];
const outcomes=[];
try{
 for(const c of cases){
  const ctx=await browser.newContext({viewport:c.mobile?{width:390,height:844}:{width:1200,height:800},
   hasTouch:c.mobile,isMobile:c.mobile,deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/connected/'+c.url,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.().error,null,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__ready),true,'Mission 01 not ready');
   assert.match(await page.evaluate(()=>window.__game?.metalStoryChapter?.()?.title||''),/Metal Awakens/);
   if(!c.feature){
    assert.equal(await page.locator('#metalPowerWheelToggle').count(),0,'Opt-in Power Wheel leaked into normal game');
    assert.equal(await page.locator('#reframerSightingButton').count(),0,'Opt-in ReFramer Sighting leaked into normal game');
    assert.equal(await page.evaluate(()=>typeof window.__game?.metalPowerWheel),'undefined');
    assert.equal(await page.evaluate(()=>typeof window.__game?.startReframerSighting),'undefined');
   }else{
    await page.waitForFunction(()=>typeof window.__game?.metalPowerWheel==='function'
     &&typeof window.__game?.startReframerSighting==='function',null,{timeout:20000});
    const sight=page.locator('#reframerSightingButton');
    assert.equal(await sight.isVisible(),true,'Sighting is still invisible in clean-screen');
    const rootVisible=await page.evaluate(()=>getComputedStyle(document.getElementById('reframerSighting')).display);
    assert.notEqual(rootVisible,'none');
    const power=page.locator('#metalPowerWheelToggle');
    assert.equal(await power.isVisible(),true,'Power Wheel cannot be opened');
    const dialog=page.locator('#metalPowerWheelDialog');
    assert.equal(await dialog.isVisible(),false,'Wheel should start closed');
    await power.click();
    assert.equal(await dialog.isVisible(),true);
    assert.equal(await dialog.getAttribute('role'),'dialog');
    assert.equal(await page.locator('#metalPowerChoices button').count()>0,true);
    const initial=await page.evaluate(()=>window.__game.metalPowerWheel());
    assert.equal(initial.total,73);
    await page.locator('#metalPowerChoices button[data-power-id="4"]').click();
    assert.equal(await page.evaluate(()=>window.__game.metalPowerWheel().availability),'ready');
    await page.locator('#metalPowerEquip').click();
    assert.equal(await page.evaluate(()=>window.__game.metalPowerWheel().equipped),4);
    await page.locator('#metalPowerUse').click();
    const lab=await page.evaluate(()=>window.__game.metalPowerLab());
    assert.equal(lab.lastAction,'scan','Power Wheel did not execute the real physical pressure scan');
    assert.ok(lab.focus<1,'Power Wheel fake-cast scan without spending Focus');
    // Selecting the unimplemented Gorillium must show a real locked mechanic.
    await page.locator('#metalPowerWheel [data-family="forms"]').click();
    await page.locator('#metalPowerChoices button[data-power-id="57"]').click();
    assert.equal(await page.evaluate(()=>window.__game.metalPowerWheel().availability),'future');
    assert.equal(await page.locator('#metalPowerUse').isEnabled(),false);
    await page.locator('#metalPowerClose').click();
    assert.equal(await dialog.isVisible(),false);
    // The player chooses a visible mission encounter; no hidden rooftop spawn hunt.
    await sight.click();
    const s=await page.evaluate(()=>window.__game.reframerSquad());
    assert.equal(s.vehicleClaims.length,c.mobile?1:2,'No genuine existing donor vehicle was claimed when sighting button pressed');
    assert.equal(s.wingActors.filter(x=>x.active).length,c.mobile?1:2);
    assert.ok(s.wingActors.filter(x=>x.active).every(x=>x.distanceMeters<32),
     'ReFramer units still spawn too far away for player to see');
    const evolved=await page.evaluate(()=>window.__game.reframerSquadQA.advance(280,.05));
    assert.equal(evolved.ok,true);
    assert.ok(evolved.state.wingActors.every(x=>x.stage==='chase'),
     'Roadframe did not complete existing car dismantle in the new visible encounter');
    assert.ok(evolved.state.wings.every(x=>x.parts.length===4),
     'Failed to extract four actual wheel meshes for each robot');
    assert.equal(errors.length,0,'JavaScript runtime errors: '+errors.join(' | '));
    console.log('PASS VISIBLE METAL POWERS / REFRAMERS',c.name,JSON.stringify({
     count:s.vehicleClaims.length,near:s.wingActors.map(x=>x.distanceMeters),
     phases:evolved.state.wingActors.map(x=>x.stage),parts:evolved.state.wings.map(x=>x.parts.length),
     selectedPower:4,focus:lab.focus
    }));
   }
   await page.screenshot({path:'test-results/'+c.name+'.png'});
   console.log('PASS',c.name);outcomes.push({name:c.name,pass:true,errors});
  }catch(e){
   console.log('FAIL',c.name,String(e.stack||e),errors);
   outcomes.push({name:c.name,pass:false,error:String(e.stack||e),errors});
   try{await page.screenshot({path:'test-results/failed-'+c.name+'.png',fullPage:true})}catch{}
  }finally{await ctx.close();}
 }
 writeFileSync('test-results/metal-visible-reframers-power-wheel.json',JSON.stringify(outcomes,null,2));
 if(outcomes.some(o=>!o.pass))process.exitCode=1;
}finally{await browser.close();}
