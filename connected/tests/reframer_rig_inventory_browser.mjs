// Read-only source-of-truth inventory from the loaded rival_sparring_hero.glb.
// WIR PROPOSAL / PUBLISH HOLD. Inspect the same real SkeletonUtils.clone used in rooftop.
import {chromium} from 'playwright';
import {writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1100,height:790},serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 const root=process.env.WIR_DUEL_BASE||'http://127.0.0.1:8765';
 await page.goto(root+'/connected/?lite=1&aerial_duel=1',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__ready===true&&!!window.__aerialPilot,null,{timeout:80000});
 await page.locator('#aerialDuelStart').click();
 await page.waitForFunction(()=>window.__aerialPilot?.enemy?.model,null,{timeout:10000});
 const result=await page.evaluate(()=>{
  const e=window.__aerialPilot.enemy;let bones=[],meshes=[],actions=[];
  e.model.traverse(o=>{
   if(o.isBone)bones.push({name:o.name,parent:o.parent?.name||'',rot:[o.rotation.x,o.rotation.y,o.rotation.z].map(v=>+v.toFixed(3))});
   if(o.isSkinnedMesh)meshes.push({name:o.name,boneCount:o.skeleton?.bones.length||0,skinNames:o.skeleton?.bones.slice(0,5).map(b=>b.name)});
  });
  for(const [alias,a] of Object.entries(e.acts||{})){
   const clip=a.getClip();
   actions.push({alias,clip:clip.name,duration:+clip.duration.toFixed(3),tracks:clip.tracks.length});
  }
  const raw=[...new Map(actions.map(a=>[a.clip,{name:a.clip,duration:a.duration,tracks:a.tracks}])).values()].sort((a,b)=>a.name.localeCompare(b.name));
  return {asset:'connected/assets/models/rival_sparring_hero.glb',assetSource:'loaded from WIR Connected in actual Chromium',
   rigRootName:e.model.name,bones,skinnedMeshes:meshes,aliases:actions,uniqueClips:raw,
   activeTraining:window.__aerialPilot.active,baseModel:e.model.type};
 });
 if(result.bones.length===0||result.uniqueClips.length===0)throw Error('Real GLB rig or animated tracks missing: '+JSON.stringify(result));
 if(errors.length)throw Error('Browser page errors '+errors.join('; '));
 writeFileSync('test-results/reframer_runtime_rig_inventory.json',JSON.stringify(result,null,2));
 console.log('REFRAMER RIG INVENTORY PASS '+JSON.stringify(result));
}catch(e){console.error('REFRAMER RIG INVENTORY FAIL',e.stack||String(e));process.exitCode=1;}
finally{await browser.close();}
