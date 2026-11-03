import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('browser QA page is a functioning interactive page with eight checks',()=>{
 const page=read('../slotta-qa/index.html');
 const scripts=[...page.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new Script(scripts[0][1],{filename:'slotta-browser-qa.js'}));
 for(const id of ['mission','serpent','clone','cooldown','reactions','grip','dash','errors'])
  assert.ok(page.includes("['"+id+"',"),'Missing '+id+' case');
 for(const element of ['id="game"','id="runAll"','id="qa-state"','id="reset"','id="copy"','id="export"'])
  assert.ok(page.includes(element),'Missing '+element);
 assert.match(page,/slotta_qa=1/);
 assert.match(page,/window\.__slottaQAConsole=/);
});
test('runtime QA hooks require an explicit query parameter and hold the background simulation',()=>{
 const main=read('../assets/main.js');
 assert.match(main,/new URLSearchParams\(location\.search\)\.get\('slotta_qa'\)==='1'/);
 assert.match(main,/if\(SLOTTA_BROWSER_QA\)window\.__testHold=true/);
 assert.match(main,/if\(SLOTTA_BROWSER_QA\)installSlottaBrowserQA\(\)/);
 assert.match(main,/window\.__slottaQA=\{/);
});
test('QA mode protects Metal save and persistent profile writes',()=>{
 const main=read('../assets/main.js');
 assert.match(main,/if\(!SLOTTA_BROWSER_QA\)localStorage\.setItem\(PKEY/);
 assert.match(main,/if\(SLOTTA_BROWSER_QA\|\|!P\|\|!metalStoryReady\)return false/);
});
test('tests call actual live world combat functions, then restore isolated actor state',()=>{
 const main=read('../assets/main.js');
 for(const method of ['updateSlottaBoss(.05)','queueSlottaAttack(slottaConsole,slottaAnimator,index)',
   'hitSlotta(5)','hitSlotta(20)','galliumGrabWorld()','releaseGrip()','updateSlottaDash(.05,boss)'])
  assert.ok(main.includes(method),'Missing real combat probe '+method);
 assert.match(main,/boss\.position\.set\(10000,groundY,10000\)/);
 assert.match(main,/P\.o\.position\.copy\(old\.player\)/);
 assert.match(main,/if\(old\)end\(old\)/);
});
test('Chromium runner requires all eight game tests to pass and writes JSON/screenshots',()=>{
 const runner=read('./slotta_browser_playwright.mjs');
 assert.match(runner,/chromium\.launch\(/);
 assert.match(runner,/assert\.equal\(report\.cases\.length,8/);
 assert.match(runner,/assert\.equal\(result\.ok,true/);
 assert.match(runner,/slotta_browser_report\.json/);
 assert.match(runner,/slotta_qa\.png/);
});
