import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPointerLatch,touchStickVector} from '../assets/metal_touch_input.mjs';
import {forgeDisplay} from '../assets/metal_forge_hud.mjs';
test('touch press is edge-triggered and only last pointer release clears it',()=>{
 const p=createPointerLatch();assert.equal(p.down(11),true);assert.equal(p.down(11),false);
 assert.equal(p.down(12),false);assert.equal(p.count,2);
 assert.equal(p.up(11),false);assert.equal(p.count,1);
 assert.equal(p.up(12),true);assert.equal(p.up(12),false);
 assert.equal(p.down(13),true);assert.equal(p.clear(),true);assert.equal(p.count,0);
 assert.equal(p.clear(),false);
});
test('thumbstick is centered for each CSS size and handles diagonal clamping',()=>{
 for(const width of [106,130,180]){
  const rect={left:10,top:20,width,height:width};
  const c=touchStickVector(rect,10+width/2,20+width/2);
  assert.deepEqual(c,{x:0,y:0});
  const a=touchStickVector(rect,rect.left+width,rect.top+width);
  assert.ok(Math.abs(Math.hypot(a.x,a.y)-1)<.001);
 }
 const invalid=touchStickVector({width:0,height:0,left:0,top:0},NaN,Infinity);
 assert.deepEqual(invalid,{x:0,y:0});
});
test('Forge accessible display progresses and disappears after skating',()=>{
 assert.equal(forgeDisplay({phase:'IDLE',elapsed:0}).visible,false);
 const a=forgeDisplay({phase:'DETECTING',elapsed:.3});assert.ok(a.visible&&a.percent>0);
 const b=forgeDisplay({phase:'COMPRESSION',elapsed:2});assert.ok(b.percent>a.percent);
 assert.equal(forgeDisplay({phase:'MOUNTING',elapsed:3.3}).percent,100);
 assert.equal(forgeDisplay({phase:'DISSOLVING',elapsed:.275}).percent,50);
 assert.equal(forgeDisplay({phase:'SKATING',elapsed:3.3}).visible,false);
});
test('real source keeps original forge, flight and dodge, but maps SkyLab B to board when grounded',()=>{
 const s=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 assert.match(s,/if\(GAL_FORGE_ENABLED&&!FG\.inFight&&onGround&&!st\.flying&&!st\.swing\)pressed\.KeyB=true/);
 assert.match(s,/else pressed\.Semicolon=true/);
 assert.match(s,/if\(FG\.inFight&&!st\.board&&pressed\.KeyB\)/);
 assert.match(s,/if\(!st\.board\)board\.visible=false/);
 assert.ok(!s.includes('function boardOnBack(){'));
 assert.match(s,/updateForgeHud\(\)/);
 assert.ok(s.includes('metal_skateboard_4wheel_PLACEHOLDER.glb'));
});
test('mobile release handles cancellation, blur and pagehide without input storage',()=>{
 const s=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
 for(const x of ["'pointerup','pointercancel','lostpointercapture'","addEventListener('blur',clearTouchKeys)","addEventListener('pagehide',clearTouchKeys)"])assert.ok(s.includes(x),x);
 assert.ok(!s.includes("e.clientX-r.left-65"));
});
