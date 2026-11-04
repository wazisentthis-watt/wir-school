// Static source contract only. Real WebGL/rig rendering still requires device QA.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
function segment(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+1);assert.ok(i>=0&&j>i,'missing '+a);return source.slice(i,j);}
const swing=segment('function startSwing(pp){','function releaseSwing(');
const carried=segment('function boardOnBack(){','// ---------- main loop ----------');
test('start swing never forces boarding',()=>{assert.ok(swing.includes('const boardBack=!st.board;'));assert.ok(!swing.includes('st.board=true'));});
test('board back state recorded on swing',()=>assert.ok(swing.includes('held:!!keys.KeyQ,boardBack')));
test('board visibly stays mounted to torso',()=>{assert.ok(carried.includes('board.visible=true'));assert.ok(carried.includes('getWorldQuaternion'));});
test('board mount can handle non-S1 character rigs',()=>{assert.ok(!carried.includes('if(!P.p6){board.visible=false;return;}'));assert.ok(carried.includes("getObjectByName('Chest')"));});
test('unmodified swing retains real anchor constraint',()=>{assert.ok(swing.includes('pickAnchor(pp)'));assert.ok(swing.includes('st.gal<=.04'))});
test('swing release remains implemented',()=>assert.ok(source.includes('function releaseSwing(why,landed)')));
test('board remains retrievable for regular skating',()=>assert.ok(source.includes('if(!st.board)boardOnBack();')));
