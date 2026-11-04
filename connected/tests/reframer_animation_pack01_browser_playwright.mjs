import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.WIR_PACK_BASE||'http://127.0.0.1:8765';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const scenarios=[],errors=[];let desktop,mobile;
const observe=p=>p.on('pageerror',e=>errors.push(String(e.stack||e)));
async function boot(p){
 observe(p);
 await p.goto(base+'/connected/?lite=1&aerial_duel=1&reframer_pack=1',{waitUntil:'domcontentloaded',timeout:60000});
 await p.waitForFunction(()=>window.__ready===true&&!!window.__aerialPilot&&!!window.__game?.P?.o,null,{timeout:85000});
 await p.locator('#aerialDuelStart').click();
 await p.waitForFunction(()=>window.__aerialPilot?.active&&!!window.__aerialPilot?.reframerPack,null,{timeout:12000});
}
try{
 const ctx=await browser.newContext({viewport:{width:1200,height:800},serviceWorkers:'block'});
 desktop=await ctx.newPage();await boot(desktop);
 const before=await desktop.evaluate(()=>({story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1'),board:window.__game.board.visible}));
 const rig=await desktop.evaluate(()=>{const p=window.__aerialPilot.reframerPack;return {...p.provenance,...p.snapshot(),
  meshes:p.enemy.model.children.length,sourceRig:p.enemy.model.name,
  actions:[...p.ownedClips.entries()].map(([name,clip])=>({name,duration:clip.duration,tracks:clip.tracks.length,
   keys:clip.tracks.map(x=>x.name)}))};});
 assert.equal(rig.bones,65,JSON.stringify(rig));
 assert.equal(rig.skinnedMeshes,3);assert.equal(rig.sourceClipCount,21);assert.equal(rig.authoredClipCount,8);
 assert.ok(rig.authoredTracks>=30,JSON.stringify(rig));
 assert.deepEqual(rig.missingImportantBones,[]);
 assert.ok(rig.actions.every(x=>x.tracks>=4&&x.keys.every(n=>n.endsWith('.quaternion'))));
 scenarios.push({case:'Actual_65Bone_ReFramer_21SourceClips_8AdditiveClips',ok:true,tracks:rig.authoredTracks});
 await desktop.locator('#reframerAnimLabToggle').click();
 assert.equal(await desktop.locator('[data-refmotion]').count(),8);
 scenarios.push({case:'All_Eight_Preview_Controls_Visible',ok:true});
 const names=['combat_idle','melee_three','uppercut_launcher','aerial_pursuit','airborne_tumble','rooftop_recovery','shield_formation','aerial_counter'];
 for(const name of names){
  await desktop.locator('[data-refmotion="'+name+'"]').click();
  await desktop.waitForFunction(id=>window.__aerialPilot?.reframerPack?.snapshot()?.current===id,name,{timeout:12000});
  const info=await desktop.evaluate(id=>{
   const p=window.__aerialPilot.reframerPack,clip=p.ownedClips.get(id);
   return {current:p.current,preview:p.preview,overlay:clip?.tracks?.length||0,
    source:p.enemy.cur?.getClip?.()?.name||'',history:p.history.at(-1)?.source};
  },name);
  assert.equal(info.current,name);assert.equal(info.preview,true);
  assert.ok(info.overlay>=4,name+' must have real authored bone QuaternionKeyframeTracks');
  scenarios.push({case:'Preview_'+name,ok:true,overlay:info.overlay,source:info.source});
  if(name==='aerial_pursuit'){
   await desktop.waitForFunction(()=>window.__aerialPilot?.reframerPack?.trails?.visible,null,{timeout:10000});
   await desktop.screenshot({path:'test-results/reframer_aerial_pursuit.png'});
  }
  if(name==='shield_formation'){
   await desktop.waitForFunction(()=>window.__aerialPilot?.reframerPack?.shield?.visible,null,{timeout:10000});
   assert.equal(await desktop.evaluate(()=>window.__aerialPilot.reframerPack.shield.children.length),5);
   await desktop.screenshot({path:'test-results/reframer_structural_shield.png'});
  }
 }
 await desktop.locator('[data-refmotion="combat_idle"]').click();
 const frozen=await desktop.evaluate(()=>window.__aerialPilot.state.time);
 await desktop.waitForTimeout(500);
 assert.equal(await desktop.evaluate(()=>window.__aerialPilot.state.time),frozen,'motion lab advanced the combat simulation');
 scenarios.push({case:'Preview_Pauses_Only_Isolated_Duel_Simulation',ok:true});
 await desktop.locator('#reframerAnimLabToggle').click();
 await desktop.waitForFunction(()=>window.__aerialPilot.reframerPack.preview===false,null,{timeout:5000});
 await desktop.locator('[data-duel="light"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot?.state?.combo===1,null,{timeout:9000});
 await desktop.waitForFunction(()=>window.__aerialPilot.state.cooldown===0,null,{timeout:12000});
 await desktop.locator('[data-duel="light"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot?.state?.combo>=2,null,{timeout:9000});
 await desktop.waitForFunction(()=>window.__aerialPilot.state.cooldown===0,null,{timeout:12000});
 await desktop.locator('[data-duel="launch"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot?.reframerPack?.history?.some(h=>h.name==='airborne_tumble'&&h.source==='event:launch'),null,{timeout:9000});
 scenarios.push({case:'Real_Duel_Launch_Drives_New_Airborne_Tumble_Animation',ok:true});
 await desktop.locator('#adExit').click();
 await desktop.waitForFunction(()=>window.__aerialPilot?.active===false,null,{timeout:5000});
 const after=await desktop.evaluate(()=>({story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1'),board:window.__game.board.visible,pack:window.__aerialPilot.reframerPack.snapshot()}));
 assert.deepEqual({story:after.story,profile:after.profile,board:after.board},before);
 assert.equal(after.pack.current,null);
 scenarios.push({case:'Exit_Restores_Savannah_No_Save_Or_Board_Changes',ok:true});
 await ctx.close();
 const mobileCtx=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},deviceScaleFactor:2,
  isMobile:true,hasTouch:true,serviceWorkers:'block'});
 mobile=await mobileCtx.newPage();await boot(mobile);
 await mobile.locator('#reframerAnimLabToggle').tap();
 assert.equal(await mobile.locator('[data-refmotion]').count(),8);
 const bounds=await mobile.locator('[data-refmotion="aerial_counter"]').boundingBox();
 assert.ok(bounds.width>=44&&bounds.height>=44,'iPhone-size motion selector is too small '+JSON.stringify(bounds));
 await mobile.locator('[data-refmotion="aerial_counter"]').tap();
 await mobile.waitForFunction(()=>window.__aerialPilot?.reframerPack?.current==='aerial_counter',null,{timeout:8000});
 scenarios.push({case:'iPhone_Viewport_Touch_Previews_Aerial_Counter',ok:true,bounds});
 await mobile.screenshot({path:'test-results/reframer_motion_lab_mobile.png'});
 await mobileCtx.close();
 assert.deepEqual(errors,[],'Browser JavaScript errors: '+errors.join('; '));
 console.log('REFRAMER PACK 01 BROWSER QA PASS '+JSON.stringify(scenarios.map(x=>x.case)));
}catch(e){
 console.error('REFRAMER PACK 01 BROWSER QA FAIL '+String(e.stack||e));
 console.error('REFRAMER PACK 01 SCENARIOS '+JSON.stringify(scenarios));
 console.error('REFRAMER PACK 01 ERRORS '+JSON.stringify(errors));
 try{await (mobile||desktop)?.screenshot({path:'test-results/reframer_pack01_failure.png'});}catch{}
 process.exitCode=1;
}finally{
 writeFileSync('test-results/reframer_pack01_qa.json',JSON.stringify({scenarios,errors},null,2));
 await browser.close();
}