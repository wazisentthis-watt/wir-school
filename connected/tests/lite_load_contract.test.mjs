// Reliability contracts: Lite must be less expensive than full 3D and the
// watchdog must expose save-safe recovery rather than hiding on an endless spin.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');
const main=read('../assets/main.js');
const rescue=read('../assets/boot_recovery.js');

test('Lite is exact opt-in, keeps every named special lot and shrinks outer blocks',()=>{
 assert.match(main,/const LITE=new URLSearchParams\(location\.search\)\.get\('lite'\)==='1'/);
 assert.match(main,/const BLOCK=44,ROAD=12,N=LITE\?2:\(METAL_FULL\?4:3\)/);
 assert.match(main,/const METAL_FULL=new URLSearchParams\(location\.search\)\.get\('metal_next'\)==='1'/);
 for(const bx of ['skate','field','fight','dojo','forge','pluto','home'])
  assert.match(main,new RegExp('\\b'+bx+':\\{bx:'));
});
test('Lite skips HDRI and heavy GPU post-processing but full mode keeps them',()=>{
 assert.match(main,/const composer=LITE\?null:new EffectComposer\(renderer\)/);
 assert.match(main,/const bloom=LITE\?null:new UnrealBloomPass/);
 assert.match(main,/if\(composer\)composer\.setSize/);
 assert.match(main,/if\(bloom\)bloom\.strength=/);
 assert.match(main,/if\(LITE\)\{scene\.background=new THREE\.Color/);
 assert.match(main,/const names=\(LITE\?'abcd':'abcdefghij'\)/);
 assert.match(main,/for\(let k=0;k<\(LITE\?16:40\);k\+\+\)/);
});
test('stalled mission presents recovery options early, without mutating save data',()=>{
 assert.match(rescue,/Date\.now\(\)-state\.started>18000\)offerRescue\(\)/);
 assert.match(rescue,/rescueShown/);
 assert.match(rescue,/Retry in Lite Mode/);
 assert.match(rescue,/Your saved progress is preserved/);
 assert.doesNotMatch(rescue,/localStorage\.(?:clear|removeItem)\(/);
});
