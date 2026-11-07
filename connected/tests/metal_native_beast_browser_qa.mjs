import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=process.env.WIR_NATIVE_BEAST_TEST_URL||'http://127.0.0.1:8765/connected/?lite=1&slotta_qa=1&savannah_native=1&savannah_beast=1';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>!!window.__ready&&!!window.__game?.savannahNative&&!!window.__game?.metalBeast,null,{timeout:150000});
 const actual=await page.evaluate(()=>{
  const g=window.__game,p=g.P.o.parent,beast=g.metalBeast;const saved={story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')};
  g.savannahNative.start(2);
  const selected=beast.select(4),start=beast.snapshot();
  const constructed=beast.build(),withBuild=beast.snapshot();
  const recovered=beast.recover(),afterRecover=beast.snapshot();
  const snapped=beast.snap(),afterSnap=beast.snapshot();
  return {sharedRoot:!!p.getObjectByName('WIR_METAL_BEAST_POWERS_HOLD'),hasOriginalMetal:!!g.P.model,
   selected,start,constructed,withBuild,recovered,afterRecover,snapped,afterSnap,
   savannah:g.savannahNative.snapshot(),savesBefore:saved,
   savesAfter:{story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')}};
 });
 assert.equal(actual.sharedRoot,true,'Missing shared-scene power rig');
 assert.equal(actual.hasOriginalMetal,true);
 assert.equal(actual.selected,true);
 assert.equal(actual.start.arms.length,6);
 assert.equal(actual.start.selected,4);
 assert.equal(actual.savannah.chapter,2);
 assert.equal(actual.constructed,true);
 assert.equal(actual.withBuild.constructs,1);
 assert.ok(actual.withBuild.gallium<actual.start.gallium);
 assert.equal(actual.recovered,true);
 assert.equal(actual.afterRecover.constructs,0);
 assert.equal(actual.snapped,true);
 assert.ok(actual.afterSnap.snap>0);
 assert.deepEqual(actual.savesAfter,actual.savesBefore);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,chapter:actual.savannah.chapter,galliumBefore:actual.start.gallium,galliumRecovered:actual.afterRecover.gallium,limbs:actual.start.arms.length,scene:'shared'}));
} finally {await browser.close();}
