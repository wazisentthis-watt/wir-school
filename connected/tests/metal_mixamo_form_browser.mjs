// Chromium check for Metal form S5 (Mixamo rig, PROPOSAL). Switches S1 -> S5 -> S1 and fails on page errors.
// Serve the repo root so /connected/ resolves, then: METAL_BOOT_BASE=http://127.0.0.1:8765 node tests/metal_mixamo_form_browser.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 1280, height: 720}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
try {
  await page.goto(base + '/connected/?lite=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 90000});
  await page.evaluate(() => window.__setForm(4));
  await page.waitForFunction(() => document.getElementById('formBtn')?.textContent === 'FORM S5', null, {timeout: 60000});
  await page.evaluate(() => window.__setForm(0));
  await page.waitForFunction(() => document.getElementById('formBtn')?.textContent === 'FORM S1', null, {timeout: 60000});
  assert.deepEqual(errors, [], 'no page errors while switching forms');
  console.log('PASS metal-s5-mixamo-form S1 -> S5 -> S1 with no page errors');
} catch (e) {
  console.log('FAIL metal-s5-mixamo-form', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
