// Prevent a repaired GitHub Pages build from being hidden behind stale
// browser-cached ES modules. No gameplay, saves, asset ownership or canon changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const html=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'../index.html'),'utf8');
test('boot recovery installs before the 3D mission module',()=>{
 assert.ok(html.indexOf('src="assets/boot_recovery.js')<html.indexOf('src="assets/main.js'));
 assert.match(html,/<script\s+type="module"\s+src="assets\/main\.js\?v=[a-z0-9-]+"/i);
});
test('all top-level scripts use one explicit cache-busting build revision',()=>{
 const urls=[...html.matchAll(/<script\b[^>]*\bsrc="assets\/([^"]+\.js)(\?v=([^"]+))?"/g)];
 assert.equal(urls.length,4,'Expected boot + three game modules');
 assert.ok(urls.every(m=>!!m[3]),'Every entry script needs a revision');
 assert.equal(new Set(urls.map(m=>m[3])).size,1,'Avoid mixed startup builds');
});
test('a visible no-JavaScript-required Lite rescue link exists',()=>{
 assert.match(html,/<a\s+id="liteEmergency"\s+href="\?lite=1[^"]+"/);
 assert.match(html,/Having trouble\? Start Lite Mode/);
});
