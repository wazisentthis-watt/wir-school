// Chromium check for the new playable avatar (form S5, Mixamo rig, PROPOSAL).
// Boots straight into S5, then switches to S6 and back, and fails on any page error.
// Serve the repo root so /connected/ resolves, then: METAL_BOOT_BASE=http://127.0.0.1:8765 node tests/metal_mixamo_form_browser.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 1280, height: 720}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
const formIs = (text) => page.waitForFunction(t => document.getElementById('formBtn')?.textContent === t, text, {timeout: 90000});
try {
  await page.goto(base + '/connected/?lite=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 90000});
  await formIs('FORM S5');
  for (const [i, label] of [[5, 'FORM S6'], [4, 'FORM S5']]) {
    await page.evaluate(n => window.__setForm(n), i);
    await formIs(label);
  }
  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS avatar boots as S5, switches S6 and back, no page errors');
} catch (e) {
  console.log('FAIL avatar', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
