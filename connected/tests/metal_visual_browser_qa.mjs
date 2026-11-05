import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// PR-only visualization test: shared original engine, no new save behavior.
const url=process.env.WIR_VISUAL_TEST_URL||'http://127.0.0.1:8765/connected/?lite=1&slotta_qa=1&savannah_native=1&savannah_beast=1&savannah_visual=1';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>!!window.__ready&&!!window.__game?.metalVisual&&!!window.__game?.metalBeast&&!!window.__game?.savannahNative,null,{timeout:150000});
 const baseline=await page.evaluate(()=>({
  saves:[localStorage.getItem('wir_metal_story_v1'),localStorage.getItem('wir_valence_profile_v1')],
  playerModel:window.__game.P.model,
  scene:window.__game.P.o.parent,
  canvasCount:document.querySelectorAll('canvas').length
 }));
 // Stable player ref is checked inside the page, never serializing Three.js scene objects.
 await page.evaluate(()=>{const g=window.__game;g.savannahNative.start(2);});
 await page.waitForFunction(()=>window.__game.metalVisual.snapshot().chapter===2&&window.__game.metalVisual.snapshot().bossDecor,null,{timeout:15000});
 const morrow=await page.evaluate(()=>{
  const g=window.__game,v=g.metalVisual.snapshot(),root=g.P.o.parent.getObjectByName('WIR_BUILD04_VISUAL_EVOLUTION_HOLD');
  const geometry=root?.getObjectByName('Gallium_Coil_Tentacle_1')?.geometry;
  return {v,world:g.metalVisual.world(),shared:root?.parent===g.P.o.parent,positions:geometry?.attributes.position.count,
    originalPlayer:!!g.P.model,canvasCount:document.querySelectorAll('canvas').length};
 });
 assert.equal(morrow.shared,true,'visual layer must reuse the live Three.js scene');
 assert.equal(morrow.v.armMeshes,6);assert.ok(morrow.v.tubeTriangles>100,'6 detailed arms missing');
 assert.ok(morrow.positions>=50,'first arm lacks 3D cylindrical surface');
 assert.ok(morrow.v.environmentPieces>=6,'Morrow City set dressing missing');
 assert.equal(morrow.world,'morrow');
 assert.equal(morrow.originalPlayer,true);
 assert.ok(morrow.canvasCount<=baseline.canvasCount+1,'game created a second rendering canvas');
 await page.evaluate(()=>{window.__game.metalVisual.skipIntro();window.__game.savannahNative.start(0);});
 await page.waitForFunction(()=>window.__game.metalVisual.snapshot().chapter===0,null,{timeout:15000});
 const river=await page.evaluate(()=>({world:window.__game.metalVisual.world(),boss:window.__game.metalVisual.snapshot().bossName}));
 assert.equal(river.world,'riverfront');assert.equal(river.boss,'Brine Broker');
 await page.evaluate(()=>window.__game.savannahNative.start(1));
 await page.waitForFunction(()=>window.__game.metalVisual.snapshot().chapter===1,null,{timeout:15000});
 const marsh=await page.evaluate(()=>({
  world:window.__game.metalVisual.world(),saves:[localStorage.getItem('wir_metal_story_v1'),localStorage.getItem('wir_valence_profile_v1')],
  pose:!!window.__game.P.model,errors:window.__errors.slice(-3)
 }));
 assert.equal(marsh.world,'marsh');assert.deepEqual(marsh.saves,baseline.saves,'original saved-game bytes changed');
 assert.equal(marsh.pose,true,'original rig lost');assert.deepEqual(errors,[],'browser page errors');
 console.log(JSON.stringify({ok:true,morrow:{triangles:morrow.v.tubeTriangles,pieces:morrow.v.environmentPieces},
  worlds:[morrow.world,river.world,marsh.world],savedDataPreserved:true}));
 // Evidence is attached to CI run, never committed as canon art.
 await page.screenshot({path:'test-results/native-metal-build04.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
