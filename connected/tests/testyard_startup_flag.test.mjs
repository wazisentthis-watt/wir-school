import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../assets/main.js',import.meta.url),'utf8');
test('original WIR Connected first-mission startup defines the Test Yard flag before first use',()=>{
 const declaration="const TEST_YARD_SKATE=new URLSearchParams(location.search).get('skate_yard')==='1';";
 const firstUse="const yard=TEST_YARD_SKATE?createTestYardSkateAdapter():null;";
 assert.ok(main.includes(declaration));assert.ok(main.includes(firstUse));
 assert.ok(main.indexOf(declaration)<main.indexOf(firstUse));
 assert.equal(main.split(declaration).length,2);
});
test('Test Yard remains optional and never changes default physics',()=>{
 assert.ok(main.includes("get('skate_yard')==='1'"));
 assert.ok(main.includes('const yard=TEST_YARD_SKATE?createTestYardSkateAdapter():null;'));
 assert.ok(main.includes('metal_skateboard_4wheel_PLACEHOLDER.glb'));
 assert.ok(main.includes('initMetalStory()'));
});
