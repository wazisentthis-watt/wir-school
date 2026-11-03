// Guards against frame-loop splice conflicts that broke the 3D browser startup.
// PROPOSAL / PUBLISH HOLD. This must never alter actual Metal game state.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';

const file=resolve(dirname(fileURLToPath(import.meta.url)),'../assets/main.js');
const source=readFileSync(file,'utf8');
const frame=source.split('function update(dt){')[1]?.split('const il=Math.min(1,Math.hypot(ix,iz));')[0];
const count=(re)=>(frame?.match(re)||[]).length;

test('3D game main module parses before mission load',()=>{
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout||'JavaScript parser rejected main.js');
});
test('one gamepad poll, movement vector, physics step and Morrow update per frame',()=>{
 assert.ok(frame,'Metal frame update source block not found');
 assert.equal(count(/const pad=pollPad\(\);/g),1,'duplicate const pad halts ES-module evaluation');
 assert.equal(count(/\blet ix=/g),1,'duplicate movement declaration halts ES-module evaluation');
 assert.equal(count(/updateMorrow\(dt\);/g),1,'Morrow AI should advance once each frame');
 assert.equal(count(/bodyMachine\.step\(dt,0,true\);/g),1,'impact/balance machine should advance once');
 assert.equal(count(/bodyMachine\.step\(dt,0\);/g),0,'no second movement proxy step');
});

test('only one mission boot exists and recovery-aware loading stays authoritative',()=>{
 assert.equal((source.match(/\(async\(\)=>\{const msg=/g)||[]).length,1,
  'Legacy orphaned startup can cause Unexpected end of input in Chromium');
 assert.doesNotMatch(source,/robotGLTF=await loadG\('assets\/models\/RobotExpressive\.glb'\)/,
  'Obsolete direct loader bypasses mission fallback and boot status');
 assert.match(source,/robotGLTF=await missionAsset\('assets\/models\/RobotExpressive\.glb'/);
});
