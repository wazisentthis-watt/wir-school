// Headless check: boots into the Gorillium form S8, screenshots it, and reports page errors. Writes /tmp/form_S8*.png.
import {chromium} from 'playwright';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 800, height: 450}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
const formIs = (text) => page.waitForFunction(t => document.getElementById('formBtn')?.textContent === t, text, {timeout: 180000});
try {
  await page.goto(base + '/connected/?lite=1&prologue=0', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 180000});
  await formIs('FORM S8');
  await page.waitForTimeout(2500);
  await page.screenshot({path: '/tmp/form_S8.png', timeout: 170000});
  console.log('SHOTS', errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'boots as S8, no page errors');
} catch (e) {
  console.log('FAIL', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
