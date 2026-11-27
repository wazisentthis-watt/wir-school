// Headless check: boots, screenshots the field with the predator in view, and reports page errors. Writes /tmp/creature_*.png.
import {chromium} from 'playwright';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 800, height: 450}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
try {
  await page.goto(base + '/connected/?lite=1&prologue=0', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 180000});
  await page.waitForTimeout(3000);
  const wp = await page.evaluate(() => window.__game.wildPos());
  if (wp) await page.evaluate(([x, y, z]) => window.__game.teleportForTest({x: x + 4, y: 0.2, z: z + 4}), wp);
  const dbg = wp ? 'predator at ' + wp.map(v => v.toFixed(1)).join(',') : 'none';
  await page.screenshot({path: '/tmp/creature_1.png', timeout: 170000});
  await page.waitForTimeout(4000);
  await page.screenshot({path: '/tmp/creature_2.png', timeout: 170000});
  console.log('SHOTS', dbg, errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
} catch (e) {
  console.log('FAIL', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
