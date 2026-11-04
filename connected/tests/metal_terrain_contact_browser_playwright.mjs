// Browser QA of ACTUAL original Metal S1 rig and rendered skatepark kickers.
// This verifies game transforms and collision intent, not visual pixel-perfect skin quality.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.METAL_BOOT_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const evidence={status:'FAILED',originalModelsEdited:false,deviceTested:false,iosSafariTested:false,
 visualMeshInspection:false,terrain:null,paired:null,legacy:null};
const errors=[];
const browser=await chromium.launch({headless:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-features=Vulkan','--no-sandbox'
]});
try{
 const ctx=await browser.newContext({viewport:{width:1050,height:720},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('wir_metal_story_v1',JSON.stringify({
   version:1,chapter:1,flags:{skate_reached:true},checkpoint:{position:{x:0,y:.25,z:8},reason:'Terrain QA'},updatedAt:null}));
  window.__qaPad={id:'QA Bluetooth simulation',index:0,mapping:'standard',connected:true,
   axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__qaPad]});
 });
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(base+'/connected/?lite=1&controller_v3=1&metal_next=1&metal_motion_qa=1&metal_terrain_qa=1',
  {waitUntil:'domcontentloaded',timeout:30000});
 await p.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.failed,null,{timeout:90000});
 assert.equal(await p.evaluate(()=>!!window.__ready),true,'S1 mission failed to boot');
 await p.waitForFunction(()=>window.__game?.P?.p6===true&&window.__game?.terrainQA?.()?.length===4,
  null,{timeout:18000});
 const surfaces=await p.evaluate(()=>window.__game.terrainQA());
 assert.equal(surfaces.length,4,'Four source kicker ramps must be registered');
 assert.ok(surfaces.every(x=>x.id.startsWith('MorrowKicker')));
 // Pre-existing test-only character reposition; no runtime ability gives teleport.
 await p.evaluate(()=>{
  window.__testHold=true;
  const ramp=window.__game.terrainQA()[0];
  const g=window.__game;
  g.P.o.position.set(ramp.origin.x,ramp.origin.y+.03,ramp.origin.z);
  g.vel.set(0,0,0);g.st.board=true;g.board.visible=true;
  g.stepForTest(24,.016);
 });
 const slope=await p.evaluate(()=>({
  state:window.__game.metalNext(),
  bones:{L:!!window.__game.P.legs?.L?.[2],R:!!window.__game.P.legs?.R?.[2]}
 }));
 assert.equal(slope.state.terrain.surface,'MorrowKicker_0');
 assert.ok(slope.state.terrain.rootGround>.4,'Ramp top must act as ground');
 assert.equal(slope.bones.L,true);assert.equal(slope.bones.R,true);
 assert.ok(slope.state.terrain.normal.y<.999,'Support normal must tilt away from flat asphalt');
 assert.ok(Math.hypot(slope.state.terrain.boardUp[0],slope.state.terrain.boardUp[2])>.02,
  'Four-wheel board should lean to ramp surface');
 await p.evaluate(()=>{window.__qaPad.buttons[7]={pressed:true,value:.9};window.__game.stepForTest(9,.016);});
 const load=await p.evaluate(()=>window.__game.metalNext());
 assert.equal(load.skateAnimation.phase,'load');
 assert.equal(load.pressureCount,0);
 await p.evaluate(()=>{window.__qaPad.buttons[7]={pressed:false,value:0};window.__game.stepForTest(1,.016);});
 const stroke=await p.evaluate(()=>window.__game.metalNext());
 assert.equal(stroke.pressureCount,1);
 assert.equal(stroke.skateAnimation.phase,'drive');
 evidence.terrain={surfaceCount:4,surface:slope.state.terrain.surface,
  normal:slope.state.terrain.normal,boardUp:slope.state.terrain.boardUp,
  ground:slope.state.terrain.rootGround,phase:stroke.skateAnimation.phase,impulses:stroke.pressureCount};
 // Existing Ballast actor, not a new dummy, is attached to the rig's hand-contact pose.
 assert.equal(await p.evaluate(()=>window.__game.motionTest.holdActor('ballast')),true);
 assert.equal(await p.evaluate(()=>window.__game.motionTest.queueThrow()),true);
 await p.evaluate(()=>window.__game.stepForTest(5,.016));
 const attached=await p.evaluate(()=>({held:window.__game.motionTest.isHolding(),
  mode:window.__game.metalNext().contactMode,pose:window.__game.metalNext().throwAnimation,
  rightHand:!!window.__game.P.handBone}));
 assert.equal(attached.held,true);
 assert.ok(['one-hand','two-hand','fallback'].includes(attached.mode));
 if(attached.rightHand)assert.notEqual(attached.mode,'fallback','Actual S1 right hand should produce a constrained contact');
 await p.evaluate(()=>window.__game.stepForTest(10,.016));
 assert.equal(await p.evaluate(()=>window.__game.motionTest.isHolding()),true);
 await p.evaluate(()=>window.__game.stepForTest(13,.016));
 const release=await p.evaluate(()=>({
  stillHeld:window.__game.motionTest.isHolding(),
  body:window.__game.factionActors.find(a=>a.kind==='ballast')?.body?.state
 }));
 assert.equal(release.stillHeld,false);
 assert.equal(release.body,'ragdoll-proxy');
 await p.evaluate(()=>window.__game.stepForTest(22,.016));
 assert.equal(await p.evaluate(()=>window.__game.metalNext().throwCompletions),1);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('wir_metal_story_v1')).version),1);
 evidence.paired={contact:attached.mode,realRigHand:attached.rightHand,release:'ragdoll-proxy',uniqueRelease:true};
 await p.screenshot({path:'test-results/metal-terrain-contact-v3.png',fullPage:true});
 const old=await ctx.newPage();old.on('pageerror',e=>errors.push(String(e)));
 await old.goto(base+'/connected/?lite=1',{waitUntil:'domcontentloaded',timeout:30000});
 await old.waitForFunction(()=>window.__ready===true||!!window.__bootRecovery?.getStatus?.failed,null,{timeout:90000});
 assert.equal(await old.evaluate(()=>!!window.__ready),true);
 assert.equal(await old.evaluate(()=>window.__game.metalNext()),null);
 assert.equal(await old.evaluate(()=>window.__game.terrainQA===undefined),true);
 assert.deepEqual(errors,[]);
 evidence.legacy={booted:true,unmodified:true,saveVersion1:true};
 evidence.status='PASS';
 console.log('METAL TERRAIN + PAIRED CONTACT BROWSER PASS',JSON.stringify(evidence));
}catch(e){evidence.error=String(e.stack||e);console.error('METAL TERRAIN + CONTACT QA FAILED',evidence.error);process.exitCode=1;
}finally{writeFileSync('test-results/metal-terrain-v3.json',JSON.stringify(evidence,null,2));await browser.close();}
