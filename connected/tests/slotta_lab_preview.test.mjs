import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

test('SLOTTA Lab has controllable preview, timeline, pause, speed, sockets, cameras',()=>{
 const source=readFileSync(new URL('../slotta-lab/index.html',import.meta.url),'utf8');
 for(const control of ['id="clip"','id="play"','id="pause"','id="slow"','id="repeat"','id="timeline"','id="sockets"','id="hitbox"','data-camera="0"'])
  assert.ok(source.includes(control),control);
 assert.ok(source.includes('signature_cartridges.svg'));
 const scripts=[...source.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 const code=scripts[0][1].replace(/^import [^\n]+?;\s*$/gm,'');
 assert.doesNotThrow(()=>new Script(code,{filename:'slotta-lab-preview.js'}));
 const helper=code.indexOf('const $=id=>document.getElementById(id);');
 const firstUse=code.indexOf("clip=$('clip')");
 assert.ok(helper>=0&&firstUse>helper,'DOM helper initialized before use');
});
test('SLOTTA temporary model exposes PHATOM and combat sockets for eventual GLB replacement',()=>{
 const source=readFileSync(new URL('../assets/slotta_visuals.js',import.meta.url),'utf8');
 for(const socket of ['SLOTTA_LEFT_HAND','SLOTTA_RIGHT_HAND','PHATOM_socket','SLOTTA_SERPENT_SPAWN','SLOTTA_CLONE_SPAWN','SLOTTA_DASH_TRAIL'])
  assert.ok(source.includes(socket),socket);
});
