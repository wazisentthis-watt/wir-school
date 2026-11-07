// Retired carried-board regression checks.
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
test('no on-foot board attachment remains',()=>{assert.ok(!s.includes('function boardOnBack(){'));assert.ok(!s.includes('BOARD ON BACK'));assert.ok(s.includes('if(!st.board)board.visible=false;'));});
test('swing still uses real anchors and finite resource',()=>{const a=s.slice(s.indexOf('function startSwing(pp){'),s.indexOf('function releaseSwing('));assert.ok(a.includes('pickAnchor(pp)'));assert.ok(a.includes('st.gal<=.04'));assert.ok(!a.includes('st.board=true'));});
test('real skateboard GLB and physics remain',()=>{assert.ok(s.includes('metal_skateboard_4wheel_PLACEHOLDER.glb'));assert.ok(s.includes('if(st.board){if(st.boardFree>0)'));assert.ok(s.includes('function releaseSwing(why,landed)'));});
