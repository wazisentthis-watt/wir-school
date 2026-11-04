import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
const url=base+'/connected/labs/motion-lab-01/?qa=1';
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox'
]});
const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
const originalStory='{"chapter":13,"special":"DO_NOT_TOUCH"}';
const originalProfile='{"friends":["Lil Heavy"],"DO_NOT_TOUCH":true}';
await context.addInitScript(({a,b})=>{
 localStorage.setItem('wir_metal_story_v1',a);
 localStorage.setItem('wir_valence_profile_v1',b);
},{a:originalStory,b:originalProfile});
const errors=[],requests=[],checks=[];
mkdirSync('test-results',{recursive:true});
let page;
try{
 page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/motion-lab-01/'))requests.push({status:r.status(),url:r.url()});});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__motionLab?.snapshot().ready,{},{timeout:60000});
 let s=await page.evaluate(()=>window.__motionLab.snapshot());
 assert.ok(s.canvas&&s.rampLoaded&&s.textureLoaded,
  'Real GLB model AND original PNG texture must render: '+JSON.stringify(s));
 checks.push({name:'real-glb-texture',success:true});
 assert.ok(!s.errors.some(x=>x.includes('ramp GLB could not load')));
 assert.ok(s.metalLoaded,'Lab did not display linked original METAL model: '+JSON.stringify(s.errors));
 assert.ok(s.boardLoaded,'Existing linked skateboard model did not load: '+JSON.stringify(s.errors));
 checks.push({name:'existing-metal-and-skateboard',success:true});
 s=await page.evaluate(()=>window.__motionLab.qaDrive(65,{throttle:1}));
 assert.ok(s.rider.speed>2.5&&s.rider.z<8,
  'Skater did not move under real physics: '+JSON.stringify(s));
 checks.push({name:'deterministic-skate-input',success:true,speed:s.rider.speed});
 s=await page.evaluate(()=>window.__motionLab.qaDrive(25,{throttle:1}));
 assert.ok(s.mission.stage>=2,'Ramp geometry not contacted with real downward raycast: '+JSON.stringify(s));
 checks.push({name:'ramp-raycast-contact',success:true,stage:s.mission.stage});
 s=await page.evaluate(()=>window.__motionLab.qaDrive(1,{jump:true,throttle:1}));
 assert.equal(s.rider.grounded,false,'Ollie did not leave ground');
 checks.push({name:'real-ollie',success:true});
 s=await page.evaluate(()=>window.__motionLab.qaDrive(110,{throttle:0}));
 assert.equal(s.rider.grounded,true,'Ollie did not land');
 assert.ok(s.mission.stage>=3,'Landing from ramp did not advance mini mission: '+JSON.stringify(s.mission));
 checks.push({name:'ollie-landing-stage',success:true,stage:s.mission.stage});
 const saves=await page.evaluate(()=>({
  story:localStorage.getItem('wir_metal_story_v1'),
  profile:localStorage.getItem('wir_valence_profile_v1'),
  lab:localStorage.getItem('wir_motion_lab01_progress_v1')
 }));
 assert.equal(saves.story,originalStory,'Production Metal checkpoint was modified');
 assert.equal(saves.profile,originalProfile,'Production Valence profile was modified');
 assert.ok(JSON.parse(saves.lab).stage>=3,'Lab progress did not autosave');
 checks.push({name:'production-saves-unchanged',success:true});
 await page.screenshot({path:'test-results/motion_lab_desktop.png',fullPage:true});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__motionLab?.snapshot().ready,{},{timeout:60000});
 assert.ok((await page.evaluate(()=>window.__motionLab.snapshot())).mission.stage>=3,
  'The independent lab checkpoint was not recovered on reload');
 checks.push({name:'lab-autosave-reload',success:true});
 await page.locator('#reset').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('wir_motion_lab01_progress_v1')),null);
 assert.equal(await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),originalStory);
 checks.push({name:'reset-clears-lab-only',success:true});
 const mobile=await context.newPage();
 mobile.on('pageerror',e=>errors.push(String(e)));
 await mobile.setViewportSize({width:390,height:844});
 await mobile.goto(url,{waitUntil:'domcontentloaded'});
 await mobile.waitForFunction(()=>window.__motionLab?.snapshot().ready,{},{timeout:60000});
 assert.equal(await mobile.locator('[data-key="forward"]').isVisible(),true);
 await mobile.screenshot({path:'test-results/motion_lab_mobile.png',fullPage:true});
 checks.push({name:'mobile-layout',success:true});
 await mobile.close();
 assert.deepEqual(errors,[],'Browser JS runtime errors');
 assert.deepEqual(requests,[],'Lab assets returned 4xx/5xx');
 checks.push({name:'no-browser-runtime-errors',success:true});
 console.log('METAL MOTION LAB QA PASS '+JSON.stringify(checks));
}catch(e){
 console.error('METAL MOTION LAB QA FAILURE',e.stack||e);
 console.error('PAGE ERRORS',JSON.stringify(errors));
 console.error('FAILED REQUESTS',JSON.stringify(requests));
 if(page)await page.screenshot({path:'test-results/motion_lab_failure.png',fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{
 writeFileSync('test-results/motion_lab_qa.json',JSON.stringify({
  passed:checks.filter(x=>x.success).length,checks,errors,requests},null,2));
 await browser.close();
}
