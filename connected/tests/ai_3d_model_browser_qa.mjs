import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const url=process.env.WIR_PARAMETRIC_URL||'http://127.0.0.1:8765/connected/labs/metal-procedural-rig.html';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1220,height:800}});const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!window.previewRig,null,{timeout:20000});
 const before=await page.evaluate(()=>{const r=window.previewRig,stats=r.stats(),skin=Object.values(r.meshes)[0].geometry.attributes;let valid=true;
  for(let j=0;j<Math.min(40,skin.skinWeight.count);j++){let sum=0;for(let k=0;k<4;k++)sum+=skin.skinWeight.getComponent(j,k);if(Math.abs(sum-1)>1e-4)valid=false;}
  return {stats,valid,rig:r.group.userData.rigged,metal:r.spec.appearance,head:r.bones.Head?.name};});
 assert.equal(before.stats.bones,24);assert.ok(before.stats.vertices>2000);assert.ok(before.stats.triangles>1500);
 assert.equal(before.stats.morphTargets,2);assert.equal(before.valid,true);assert.equal(before.metal,'metal');assert.equal(before.head,'Head');
 await page.locator('#bulk').evaluate(el=>{el.value='0.85';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('[data-pose="anticipation"]').click();
 const after=await page.evaluate(()=>({morph:window.previewRig.meshes.armor.morphTargetInfluences,spine:window.previewRig.bones.Spine.rotation.x}));
 assert.ok(after.morph[1]>.8);assert.ok(after.spine>.1);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:760});
 assert.equal(await page.locator('#panel').count(),1);
 console.log(JSON.stringify({ok:true,bones:before.stats.bones,vertices:before.stats.vertices,triangles:before.stats.triangles,skinWeights:before.valid,morph:after.morph}));
}finally{await browser.close();}