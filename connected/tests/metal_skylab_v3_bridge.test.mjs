import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSavannahMetalController,SKYLAB_MOVES,SKYLAB_BUTTONS,shouldGripWorld} from '../assets/metal_skylab_v3_bridge.mjs';
const pad=(pressed=[],axes=[0,0,0,0],id='Xbox Wireless Controller')=>({
 id,index:0,mapping:'standard',connected:true,axes,
 buttons:Array.from({length:18},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))
});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),snapshot:()=>new Map(m)}};
const fresh=()=>createSavannahMetalController({doc:null,storage:storage()});
test('mode defaults SkyLab, original Classic remains selectable',()=>{
 const c=fresh();assert.equal(c.mode,'skylab');c.setMode('classic');assert.equal(c.mode,'classic');c.setMode('skylab');assert.equal(c.mode,'skylab');
});
test('Xbox profile uses A/B/X/Y, R2, L1/L2/R1 without L3/R3',()=>{
 assert.equal(SKYLAB_BUTTONS.jump,0);assert.equal(SKYLAB_BUTTONS.dash,1);
 assert.equal(SKYLAB_BUTTONS.roar,2);assert.equal(SKYLAB_BUTTONS.slam,3);
 assert.equal(SKYLAB_BUTTONS.glide,7);assert.ok(!Object.values(SKYLAB_BUTTONS).includes(10));assert.ok(!Object.values(SKYLAB_BUTTONS).includes(11));
});
test('first connected gamepad does not generate phantom button taps',()=>{
 const c=fresh();const s=c.poll(pad([0]));assert.equal(s.connected,true);assert.deepEqual(s.edges,[]);
});
test('analog movement and right-stick camera feed the engine',()=>{
 const c=fresh();c.poll(pad());const s=c.poll(pad([],[.95,-.8,.9,0]),1/30);
 assert.ok(s.x>.5&&s.y<-.5);assert.ok(s.lookX>0);
});
test('A jump, X punch, Y yaw and R1 tether produce independent edges',()=>{
 for(const [button,expected] of [[0,'jump'],[2,'roar'],[3,'slam'],[5,'grapple']]){
  const c=fresh();c.poll(pad());const r=c.poll(pad([button]));assert.ok(r.edges.includes(expected),expected);
 }
});
test('L2 + A triggers kickflip instead of ordinary A jump',()=>{
 const c=fresh();c.poll(pad());c.poll(pad([6]));const s=c.poll(pad([6,0]));
 assert.equal(s.combo.kickflip,true);assert.ok(!s.edges.includes('jump'));
});
test('L2 + X pressure and L2 + Y Gorillium preview are separate',()=>{
 const c=fresh();c.poll(pad());c.poll(pad([6]));assert.equal(c.poll(pad([6,2])).combo.pressure,true);
 c.poll(pad([6]));assert.equal(c.poll(pad([6,3])).combo.gorillium,true);
});
test('L2 + R2 gives tether sling, not occupied vehicle throw',()=>{
 const c=fresh();c.poll(pad());c.poll(pad([6]));assert.equal(c.poll(pad([6,7])).combo.sling,true);
});
test('D-pad next selects one of six actually supported world actions',()=>{
 const c=fresh();c.poll(pad());const a=c.poll(pad([13]));assert.equal(SKYLAB_MOVES.length,6);assert.equal(a.move.id,'pulse');
});
test('disconnect neutralizes sticks and does not pause a running game',()=>{
 const c=fresh();c.poll(pad());c.poll(pad([7],[1,0,0,0]));const s=c.poll(null);
 assert.equal(s.connected,false);assert.equal(s.x,0);assert.equal(s.y,0);assert.equal(s.paused,false);
});
test('Menu requires 0.8s hold to pause; short tap leaves game running',()=>{
 const c=fresh();c.poll(pad());c.poll(pad([9]),.1);c.poll(pad());assert.equal(c.paused,false);
 for(let i=0;i<13;i++)c.poll(pad([9]),.08);assert.equal(c.paused,true);
 c.poll(pad());for(let i=0;i<13;i++)c.poll(pad([9]),.08);assert.equal(c.paused,false);
});
test('Classic mode cannot accidentally pause through SkyLab held Menu',()=>{
 const c=fresh();c.setMode('classic');c.poll(pad());for(let i=0;i<24;i++)c.poll(pad([9]),.08);
 assert.equal(c.paused,false);assert.equal(c.poll(pad()).active,false);
});
test('controller settings use separate storage key, not story checkpoints',()=>{
 const st=storage(),c=createSavannahMetalController({doc:null,storage:st});
 c.setMode('classic');const keys=[...st.snapshot().keys()];
 assert.ok(keys.some(k=>k==='wir-connected-metal-v3-settings'));
 assert.ok(keys.every(k=>!/^wir_metal_story_v1$/.test(k)));
});

test('Bluetooth loss clears even a deliberate pause, allowing keyboard/touch fallback',()=>{
 const c=fresh();c.poll(pad());for(let i=0;i<13;i++)c.poll(pad([9]),.08);
 assert.equal(c.paused,true);const s=c.poll(null);assert.equal(c.paused,false);assert.equal(s.paused,false);
});

test('Classic mode cannot inherit a held SkyLab grab after switching layouts',()=>{
 assert.equal(shouldGripWorld({mode:'classic',v3Held:true}),false);
 assert.equal(shouldGripWorld({mode:'skylab',v3Held:true}),true);
 assert.equal(shouldGripWorld({mode:'classic',lb:true,v3Held:true}),true);
 assert.equal(shouldGripWorld({mode:'classic',keyboard:true}),true);
 assert.equal(shouldGripWorld({mode:'skylab'}),false);
});
