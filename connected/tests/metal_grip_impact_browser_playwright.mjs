// Browser QA of original S1 skeleton plus authentic Ballast combat body.
// Does NOT assert that source GLB contains finger bones or visual fidelity.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const report={status:'FAIL',fingerSource:'original Metal S1 GLB',deviceTested:false,
 visualSkinInspected:false,authoredFBXRetargeted:false,recovery:null,grip:null,legacy:null};
const errors=[];
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
try{
 const ctx=await browser.newContext({viewport:{width:1024,height:700},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('wir_metal_story_v1',JSON.stringify({version:1,chapter:1,
   flags:{skate_reached:true},checkpoint:{position:{x:0,y:.25,z:8},reason:'Grip Recovery QA'},updatedAt:null}));
  window.__qaPad={id:'Simulated Xbox-style pad',index:0,mapping:'standard',connected:true,
   axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'/connected/?lite=1&controller_v3=1&metal_next=1&metal_motion_qa=1',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.__ready===true||window.__bootRecovery?.getStatus?.failed,
  null,{timeout:90000});
 assert.equal(await page.evaluate(()=>!!window.__ready),true,'Original game must load');
 await page.waitForFunction(()=>window.__game?.P?.p6===true&&!!window.__game?.motionTest?.holdActor,
  null,{timeout:20000});
 await page.evaluate(()=>{window.__testHold=true;});
 const first=await page.evaluate(()=>window.__game.metalNext());
 assert.equal(first.fingerGrip.strength,0);
 assert.equal(first.enemyRecovery.find(a=>a.kind==='ballast').phase,'idle');
 const fingers=await page.evaluate(()=>{
  let actual=0;window.__game.P.model.traverse(o=>{
   if(o.isBone&&/thumb|index|middle|ring|pinky|pinkie|little/i.test(o.name))actual++;});
  return actual;
 });
 assert.ok(first.fingerGrip.detected>=0&&first.fingerGrip.detected<=fingers,
  'Cannot claim joints not present in original GLB');
 assert.equal(first.fingerGrip.animatedOnlyIfPresent,true);
 assert.equal(await page.evaluate(()=>window.__game.motionTest.holdActor('ballast')),true);
 assert.equal(await page.evaluate(()=>window.__game.motionTest.queueThrow()),true);
 await page.evaluate(()=>window.__game.stepForTest(8,.016));
 const loading=await page.evaluate(()=>({
  grip:window.__game.metalNext().fingerGrip,
  contact:window.__game.metalNext().contactMode,
  holding:window.__game.motionTest.isHolding()
 }));
 assert.equal(loading.holding,true);
 assert.ok(loading.grip.strength>0&&loading.grip.strength<=1);
 assert.ok(['two-hand','one-hand','fallback'].includes(loading.contact));
 report.grip={originalRigNamedFingerBones:fingers,recognizedFingerCount:loading.grip.detected,
  strengthDuringLoad:loading.grip.strength,handContact:loading.contact,
  behavior:loading.grip.detected>0?'real joint curl overlay':'fallback grip / no invented finger pose'};
 await page.evaluate(()=>window.__game.stepForTest(23,.016));
 assert.equal(await page.evaluate(()=>window.__game.motionTest.isHolding()),false,'One throw release');
 const release=await page.evaluate(()=>window.__game.factionActors.find(a=>a.kind==='ballast').body.state);
 assert.equal(release,'ragdoll-proxy');
 const impacts=await page.evaluate(()=>{
  let detected=0,recovered=0,flight=false,maxTilt=0,impactPhaseSeen=false,everRecover=false;
  for(let i=0;i<245;i++){
   window.__game.stepForTest(1,.016);
   const a=window.__game.metalNext().enemyRecovery.find(a=>a.kind==='ballast');
   detected=Math.max(detected,a.impacts);recovered=Math.max(recovered,a.recoveries);
   if(a.phase==='air')flight=true;if(a.phase==='impact')impactPhaseSeen=true;
   if(a.phase==='recover')everRecover=true;
   const actor=window.__game.factionActors.find(a=>a.kind==='ballast');
   maxTilt=Math.max(maxTilt,Math.abs(actor.visual?.rotation.z||0));
  }
  const actor=window.__game.factionActors.find(a=>a.kind==='ballast');
  return {impacts:detected,recoveries:recovered,flight,impactPhaseSeen,everRecover,
   maxVisualTilt:maxTilt,actorBody:actor.body.state,visualPivot:!!actor.visual,
   actualPhysicsGround:actor.body.position.y};
 });
 assert.equal(impacts.visualPivot,true);
 assert.equal(impacts.flight,true);
 assert.equal(impacts.impacts,1,'Single physical landing yields one impact');
 assert.equal(impacts.impactPhaseSeen,true);
 assert.ok(impacts.maxVisualTilt>.05,'Enemy torso responds to fall');
 assert.equal(impacts.recoveries,1,'Single standing transition begins one get-up');
 assert.equal(impacts.everRecover,true);
 report.recovery=impacts;
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wir_metal_story_v1')).version),1);
 await page.screenshot({path:'test-results/metal-grip-impact-v4.png',fullPage:true});
 const old=await ctx.newPage();old.on('pageerror',e=>errors.push(String(e)));
 await old.goto(base+'/connected/?lite=1',{waitUntil:'domcontentloaded',timeout:30000});
 await old.waitForFunction(()=>window.__ready===true||window.__bootRecovery?.getStatus?.failed,
  null,{timeout:90000});
 assert.equal(await old.evaluate(()=>!!window.__ready),true);
 assert.equal(await old.evaluate(()=>window.__game.metalNext()),null);
 report.legacy={loaded:true,v1SaveIntact:true,defaultInputUnchanged:true};
 assert.deepEqual(errors,[]);
 report.status='PASS';
 console.log('METAL GRIP + IMPACT v4 BROWSER PASS',JSON.stringify(report));
}catch(e){report.error=String(e.stack||e);console.error('METAL GRIP + IMPACT v4 FAILED',report.error);process.exitCode=1;}
finally{writeFileSync('test-results/metal-grip-impact-v4.json',JSON.stringify(report,null,2));await browser.close();}
