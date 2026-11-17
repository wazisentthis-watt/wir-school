// Chromium check for Metal forms S5 (Mixamo rig) and S6 (textured rig), PROPOSAL.
// Switches with the number keys (1-6) and fails on any page error. The controller chord is not included yet:
// Back is already the Power Wheel button, so the chord needs a different button first.
// Serve the repo root so /connected/ resolves, then: METAL_BOOT_BASE=http://127.0.0.1:8765 node tests/metal_mixamo_form_browser.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 1280, height: 720}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
const formIs = (text) => page.waitForFunction(t => document.getElementById('formBtn')?.textContent === t, text, {timeout: 60000});
try {
  await page.goto(base + '/connected/?lite=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 90000});
  for (const [i, label] of [[4, 'FORM S5'], [5, 'FORM S6'], [0, 'FORM S1']]) {
    await page.evaluate(n => window.__setForm(n), i);
    await formIs(label);
  }
  assert.deepEqual(errors, [], 'no page errors while switching forms');
  console.log('PASS metal-forms S1 -> S5 -> S6 -> S1, no page errors');
} catch (e) {
  console.log('FAIL metal-forms', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
