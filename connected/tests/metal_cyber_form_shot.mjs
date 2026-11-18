// Screenshot check for form S7 (cyberpunk Mixamo rig) and the S5 default. Writes PNGs to /tmp.
// Serve the repo root, then: METAL_BOOT_BASE=http://127.0.0.1:8765 node connected/tests/metal_cyber_form_shot.mjs
import {chromium} from 'playwright';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 640, height: 360}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
const formIs = (text) => page.waitForFunction(t => document.getElementById('formBtn')?.textContent === t, text, {timeout: 180000});
try {
  await page.goto(base + '/connected/?lite=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 180000});
  await formIs('FORM S5');
  await page.waitForTimeout(3000);
  await page.screenshot({path: '/tmp/form_S5.png', timeout: 170000});
  await page.evaluate(() => window.__setForm(6));
  await formIs('FORM S7');
  await page.waitForTimeout(3000);
  await page.screenshot({path: '/tmp/form_S7.png', timeout: 170000});
  console.log('SHOTS', errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
} catch (e) {
  console.log('FAIL', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
