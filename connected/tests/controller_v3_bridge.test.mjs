import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createConnectedControllerV3,gamepadV3Enabled,CONNECTED_ACTION_KEYS} from '../assets/controller_v3_bridge.mjs';
const makePad=(buttons=[],axes=[0,0,0,0],id='Xbox Wireless Controller')=>({
 id,index:0,connected:true,mapping:'standard',axes,
 buttons:Array.from({length:18},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))
});
const ctx=()=>({keys:{},pressed:{}});
test('opt-in is exact and absent by default',()=>{assert.equal(gamepadV3Enabled(''),false);assert.equal(gamepadV3Enabled('?controller_v3=0'),false);assert.equal(gamepadV3Enabled('?controller_v3=1'),true)});
test('legacy world actions are explicitly named',()=>{assert.equal(CONNECTED_ACTION_KEYS.jump,'Space');assert.equal(CONNECTED_ACTION_KEYS.dash,'KeyB')});
test('zero stick deadzone',()=>{const c=createConnectedControllerV3(),x=ctx();const a=c.poll(makePad([],[.07,-.08,0,0]),1/60,x);assert.equal(a.x,0);assert.equal(a.y,0)});
test('controller-reported axes drive travel',()=>{const c=createConnectedControllerV3(),x=ctx();const a=c.poll(makePad([],[.85,-.9,0,0]),1/60,x);assert.ok(a.x>.65);assert.ok(a.y<-.70)});
test('newly connected held button cannot create phantom jump',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad([0]),.016,x);assert.equal(x.pressed.Space,undefined);assert.equal(x.keys.Space,true)});
test('button edge produces one jump',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad(),.016,x);c.poll(makePad([0]),.016,x);assert.equal(x.pressed.Space,true);x.pressed.Space=false;c.poll(makePad([0]),.016,x);assert.equal(x.pressed.Space,false)});
test('release unsets owned controller keys',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad(),.016,x);c.poll(makePad([0]),.016,x);c.poll(makePad(),.016,x);assert.equal(x.keys.Space,false)});
test('LB/RB/LT/RT stay reserved for world grip',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad(),.016,x);c.poll(makePad([4,5,6,7]),.016,x);assert.deepEqual(Object.keys(x.keys),[])});
test('right camera suppressed during grip',()=>{const c=createConnectedControllerV3(),x=ctx();let called=0;c.poll(makePad([], [0,0,1,.5]),.016,{...x,lookEnabled:false,applyCamera:()=>called++});assert.equal(called,0)});
test('reconnect and disconnect clear latches',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad(),.016,x);c.poll(makePad([0]),.016,x);assert.equal(c.poll(null,.016,x),null);assert.equal(x.keys.Space,false);assert.equal(c.status().connected,false)});
test('custom button learned with no cast during calibration',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad(),.016,x);assert.equal(c.startLearning('dash'),true);c.poll(makePad([10]),.016,x);assert.equal(c.status().bindings.dash,10);assert.equal(x.pressed.KeyB,undefined);c.poll(makePad([10]),.016,x);assert.equal(x.pressed.KeyB,undefined);c.poll(makePad(),.016,x);c.poll(makePad([10]),.016,x);assert.equal(x.pressed.KeyB,true)});
test('reserved button never learned as custom face action',()=>{const c=createConnectedControllerV3(),x=ctx();c.poll(makePad(),.016,x);c.startLearning('jump');c.poll(makePad([4]),.016,x);assert.equal(c.status().bindings.jump,0);assert.equal(c.status().learningAction,'jump')});
test('profile adjustments stored in a controller-only namespace',()=>{const calls=[],storage={getItem:()=>null,setItem:(key,value)=>calls.push([key,value])};const c=createConnectedControllerV3({storage}),x=ctx();c.poll(makePad(),.016,x);c.configure({deadzone:.29});assert.equal(c.status().deadzone,.29);assert.ok(calls.every(([k])=>k.startsWith('wir_gorillium_controller_v3_')))});
test('camera smoothing uses finite angular values',()=>{const c=createConnectedControllerV3(),x=ctx(),d=[];c.poll(makePad(),.016,x);c.poll(makePad([],[0,0,.9,.5]),.016,{...x,applyCamera:(a,b)=>d.push([a,b])});assert.ok(d.length>0&&d.every(pair=>pair.every(Number.isFinite)))});
