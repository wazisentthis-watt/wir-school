import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadMissionAsset,MISSION_ASSET_TIMEOUTS} from '../assets/mission_asset_recovery.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('working original model is used without a fallback or warning',async()=>{
 const expected={scene:{name:'original'},animations:[{name:'Idle'}]};
 let warnings=0,fall=0;
 const got=await loadMissionAsset(async()=>expected,'original.glb',{
  onWarning:()=>warnings++,fallback:()=>{fall++;return {scene:{name:'fallback'}};}
 });
 assert.equal(got,expected);assert.equal(warnings,0);assert.equal(fall,0);
});
test('HTTP/GLTF failure recovers with a named fallback, reporting source',async()=>{
 const notes=[],fallback={scene:{name:'fallback'},animations:[]};
 const got=await loadMissionAsset(async()=>{throw Error('HTTP 404')},'metal.glb',{
  onWarning:w=>notes.push(w),fallback:()=>fallback});
 assert.equal(got,fallback);assert.equal(notes.length,1);
 assert.equal(notes[0].asset,'metal.glb');assert.match(notes[0].reason,/404/);
 assert.equal(notes[0].fallback,true);
});
test('missing critical model is a clear failure when no fallback is permitted',async()=>{
 await assert.rejects(loadMissionAsset(async()=>{throw Error('bad GLB')},'critical.glb'),
  /Required mission asset unavailable: critical.glb/);
});
test('never resolving model loader times out and releases its startup wait',async()=>{
 const warnings=[];
 const found=await loadMissionAsset(()=>new Promise(()=>{}),'hang.glb',{
  timeout:5,fallback:()=>({scene:{name:'proxy'}}),onWarning:w=>warnings.push(w)});
 assert.equal(found.scene.name,'proxy');
 assert.match(warnings[0].reason,/deadline exceeded/);
});
test('resolved scene-less data is rejected rather than appearing loaded',async()=>{
 const found=await loadMissionAsset(async()=>({animations:[]}), 'broken.glb',{
  fallback:()=>({scene:{name:'proxy'}})});
 assert.equal(found.scene.name,'proxy');
});
test('timeouts are limited to a reasonable optional and critical startup window',()=>{
 assert.ok(MISSION_ASSET_TIMEOUTS.optional>=1000);
 assert.ok(MISSION_ASSET_TIMEOUTS.critical>=MISSION_ASSET_TIMEOUTS.optional);
 assert.ok(MISSION_ASSET_TIMEOUTS.critical<=30000);
});
test('recoverable startup has UI boot script before module, keeps its main asset and saves',()=>{
 const html=read('../index.html');
 assert.ok(html.indexOf('assets/boot_recovery.js')<html.indexOf('assets/main.js'));
 assert.match(html,/src="assets\/main\.js"/);
 const main=read('../assets/main.js');
 for(const text of ['missionAsset(\'assets/models/RobotExpressive.glb\'','missionAsset(\'assets/models/metal/metal_phase6_fight.glb\'',
   'missionAsset(\'assets/models/metal/metal_skateboard_4wheel_PLACEHOLDER.glb\''])
   assert.ok(main.includes(text),text);
 assert.match(main,/window\.__game\.bootReport=/);
 assert.match(main,/boot\.ready\(\)/);
 assert.match(main,/boot\.failed\(e\)/);
 const script=read('../assets/boot_recovery.js');
 assert.match(script,/Retry in Lite Mode/);assert.match(script,/Retry loading/);
 assert.ok(!script.includes('localStorage.clear('));
 assert.ok(!script.includes('removeItem('));
});

test('rigless fallback never dereferences a missing current animation clip',()=>{
 const main=read('../assets/main.js');
 assert.match(main,/if\(actT<=0&&\(!P\.cur\|\|P\.cur\.loop!==THREE\.LoopOnce/);
 assert.match(main,/ch\.feet\.length\?Math\.min/);
 assert.match(main,/if\(!P\.feet\.length\)return/);
});
