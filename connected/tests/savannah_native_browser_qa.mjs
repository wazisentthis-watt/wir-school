import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Browser QA for explicitly enabled native Savannah, not a production release gate.
const base=process.env.WIR_NATIVE_TEST_URL||'http://127.0.0.1:8765/connected/?lite=1&slotta_qa=1&savannah_native=1';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>Boolean(window.__game?.savannahNative&&window.__ready),null,{timeout:150000});
 const startup=await page.evaluate(()=>({player:!!window.__game.P,originalScene:!!window.__game.P.o.parent,native:!!window.__game.savannahNative,canvasCount:document.querySelectorAll('canvas').length,saves:{story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')}}));
 assert.equal(startup.player,true);assert.equal(startup.native,true);
 const outcome=await page.evaluate(()=>{
   const g=window.__game, before=g.P.o.parent.children.length;
   const success=g.savannahNative.start(0);
   const state=g.savannahNative.snapshot();
   const root=g.P.o.parent.getObjectByName('WIR_SAVANNAH_NATIVE_HOLD');
   return {success,state,visuals:root?.children?.length,worldScene:g.P.o.parent===root?.parent,before,after:g.P.o.parent.children.length,
     saves:{story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')}};
 });
 assert.equal(outcome.success,undefined); // start() is a UI action, returns void
 assert.equal(outcome.state.phase,'playing');assert.equal(outcome.state.chapter,0);
 assert.ok(outcome.visuals>=8,'3D chapter actors did not spawn');
 assert.equal(outcome.worldScene,true,'native actors not in original scene');
 assert.ok(outcome.after>=outcome.before,'Connected scene was replaced');
 assert.deepEqual(outcome.saves,startup.saves,'Connected storage changed during opt-in start');
 assert.deepEqual(errors,[],'Browser page errors');
 console.log(JSON.stringify({ok:true,outcome:{phase:outcome.state.phase,visuals:outcome.visuals,sharedScene:outcome.worldScene},errors}));
 await page.close();
} finally {await browser.close();}
