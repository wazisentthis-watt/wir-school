import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const base=process.env.WIR_PACK_BASE||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const results=[],errors=[];let desktop,mobile;
const checkErrors=p=>p.on('pageerror',err=>errors.push(String(err.stack||err)));
async function boot(page,route='/connected/?lite=1&aerial_duel=1&reframer_pack2=1'){
 checkErrors(page);
 await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:50000});
 await page.waitForFunction(()=>window.__ready===true&&!!window.__aerialPilot&&!!window.__game?.P?.o,null,{timeout:85000});
 await page.locator('#aerialDuelStart').click();
 await page.waitForFunction(()=>window.__aerialPilot?.active===true&&!!window.__aerialPilot.reframerPack,null,{timeout:15000});
}
const scene=page=>page.evaluate(()=>{
 const d=window.__aerialPilot,p=d.reframerPack;
 return {active:d.active,pack:p.snapshot(),enemyY:d.state.enemy.y,position:[p.enemy.o.position.x,p.enemy.o.position.y,p.enemy.o.position.z],
  modelRotation:[p.enemy.model.rotation.x,p.enemy.model.rotation.y,p.enemy.model.rotation.z],
  modelPositionY:p.enemy.model.position.y,mode:d.state.mode,airCounterEnabled:d.state.airCounterEnabled,
  story:localStorage.getItem('wir_metal_story_v1'),profile:localStorage.getItem('wir_valence_profile_v1')};
});
try{
 const ctx=await browser.newContext({viewport:{width:1200,height:800},serviceWorkers:'block'});
 desktop=await ctx.newPage();await boot(desktop);
 const start=await scene(desktop);
 assert.equal(start.pack.phase2Enabled,true);
 assert.equal(start.pack.rigBoneCount,65);
 assert.equal(start.pack.sourceClipCount,21);
 assert.equal(start.pack.authoredClipCount,8);
 assert.equal(start.airCounterEnabled,true);
 assert.ok(start.pack.authoredTracks>=60);
 assert.deepEqual(Object.keys(start.pack.upgraded).sort(),['aerial_counter','airborne_tumble','uppercut_launcher']);
 results.push({case:'Real_65_bone_rig_with_3_upgraded_full_body_actions',pass:true,tracks:start.pack.authoredTracks});
 const detail=await desktop.evaluate(()=>{
  const p=window.__aerialPilot.reframerPack;
  return [...p.ownedClips.entries()].filter(([id])=>['uppercut_launcher','airborne_tumble','aerial_counter'].includes(id)).map(([id,c])=>({
   id,tracks:c.tracks.length,keyTimes:c.tracks[0].times.length,
   names:c.tracks.map(t=>t.name),name:c.name,quaternionLengths:c.tracks.map(t=>t.values.length)
  }));
 });
 assert.equal(detail.length,3);
 assert.ok(detail.every(c=>c.tracks>=16&&c.keyTimes===6&&c.quaternionLengths.every(n=>n===24)));
 assert.ok(detail.every(c=>c.names.some(n=>n==='pelvis.quaternion')&&c.names.some(n=>n==='foot_r.quaternion'||n==='thigh_r.quaternion')));
 results.push({case:'Distinct_six_pose_quaternion_tracks_all_three_motions',pass:true,detail:detail.map(c=>({id:c.id,tracks:c.tracks}))});
 await desktop.locator('#reframerAnimLabToggle').click();
 assert.equal(await desktop.locator('[data-refmotion]').count(),8);
 for(const id of ['uppercut_launcher','aerial_counter']){
  await desktop.locator('[data-refmotion="'+id+'"]').click();
  await desktop.waitForFunction(id=>window.__aerialPilot.reframerPack?.current===id,id,{timeout:14000});
  const v=await scene(desktop);assert.equal(v.pack.preview,true);
  results.push({case:'Preview_'+id,pass:true});
 }
 await desktop.locator('[data-refmotion="airborne_tumble"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot?.reframerPack?.current==='airborne_tumble'&&window.__aerialPilot?.reframerPack?.elapsed>.45,null,{timeout:15000});
 const during=await scene(desktop);
 assert.ok(during.pack.tumbleAngle>.2,'no authored full-body model tumble applied '+JSON.stringify(during));
 assert.ok(during.pack.tumbleOffsetY>.02,'missing waist-centered visual pivot');
 assert.equal(during.enemyY,0,'animation preview mutated deterministic collision body');
 results.push({case:'Physics_separated_visual_360_tumble',pass:true,angle:during.pack.tumbleAngle,offset:during.pack.tumbleOffsetY});
 await desktop.screenshot({path:'test-results/reframer_pack02_tumble.png'});
 await desktop.locator('#reframerAnimLabToggle').click();
 await desktop.waitForFunction(()=>window.__aerialPilot?.reframerPack?.preview===false,null,{timeout:9000});
 const afterToggle=await scene(desktop);
 assert.ok(Math.abs(afterToggle.pack.tumbleAngle)<.001,'character retained tumble spin after preview');
 results.push({case:'Preview_exit_restores_original_mesh_pose',pass:true});
 await desktop.locator('[data-duel="light"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot.state.combo>=1,null,{timeout:12000});
 await desktop.waitForFunction(()=>window.__aerialPilot.state.cooldown===0,null,{timeout:12000});
 await desktop.locator('[data-duel="light"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot.state.combo>=2,null,{timeout:12000});
 await desktop.waitForFunction(()=>window.__aerialPilot.state.cooldown===0,null,{timeout:12000});
 await desktop.locator('[data-duel="launch"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot.state.enemy.y>.65,null,{timeout:12000});
 await desktop.locator('[data-duel="pursue"]').click();
 await desktop.waitForFunction(()=>window.__aerialPilot.state.player.y>.6,null,{timeout:16000});
 results.push({case:'Real_controls_launch_and_pursue_with_pack02_enabled',pass:true});
 const air=await desktop.evaluate(()=>({active:window.__aerialPilot.state.airCounterEnabled,
  events:window.__aerialPilot.state.events.map(e=>e.type),pack:window.__aerialPilot.reframerPack.snapshot()}));
 assert.equal(air.active,true);
 // Deterministic AI hit, evade, one-hit limit and damage amounts are separately unit-tested.
 // Browser route validates that gameplay continues and the pack is present during actual combat.
 results.push({case:'Optional_counter_route_present_without_crashing_live_duel',pass:true,events:air.events.slice(-8)});
 await desktop.locator('#adExit').click();
 await desktop.waitForFunction(()=>window.__aerialPilot.active===false,null,{timeout:7000});
 const exit=await scene(desktop);
 assert.equal(exit.story,start.story);assert.equal(exit.profile,start.profile);
 assert.ok(Math.abs(exit.pack.tumbleAngle)<.001);
 results.push({case:'Exit_restores_original_game_and_saves',pass:true});
 await desktop.screenshot({path:'test-results/reframer_pack02_exit.png'});
 await ctx.close();
 const mobCtx=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},
  deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 mobile=await mobCtx.newPage();await boot(mobile);
 await mobile.locator('#reframerAnimLabToggle').tap();
 assert.equal(await mobile.locator('[data-refmotion]').count(),8);
 const bbox=await mobile.locator('[data-refmotion="uppercut_launcher"]').boundingBox();
 assert.ok(bbox.width>=44&&bbox.height>=44,'undersized motion selector '+JSON.stringify(bbox));
 await mobile.locator('[data-refmotion="uppercut_launcher"]').tap();
 await mobile.waitForFunction(()=>window.__aerialPilot?.reframerPack?.current==='uppercut_launcher',null,{timeout:10000});
 results.push({case:'Phone_sized_motion_lab_preview_operates',pass:true});
 await mobile.screenshot({path:'test-results/reframer_pack02_mobile.png'});
 await mobCtx.close();
 assert.deepEqual(errors,[]);
 console.log('REFRAMER PACK02 REAL BROWSER PASS '+JSON.stringify(results.map(x=>x.case)));
}catch(e){console.error('REFRAMER PACK02 REAL BROWSER FAIL '+String(e.stack||e));
 console.error('SCENARIOS '+JSON.stringify(results));console.error('JS ERRORS '+JSON.stringify(errors));
 try{await (mobile||desktop)?.screenshot({path:'test-results/reframer_pack02_failure.png'});}catch{}
 process.exitCode=1;
}finally{writeFileSync('test-results/reframer_pack02_qa.json',JSON.stringify({results,errors},null,2));await browser.close();}
