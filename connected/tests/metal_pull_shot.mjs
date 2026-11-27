// Headless check: hold the Gallium pull (K) and screenshot the liquid stream. Writes /tmp/pull_*.png.
import {chromium} from 'playwright';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 800, height: 450}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
try {
  await page.goto(base + '/connected/?lite=1&prologue=0', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 180000});
  await page.waitForTimeout(2000);
  await page.screenshot({path: '/tmp/pull_0_idle.png', timeout: 170000});
  const lamp = await page.evaluate(() => window.__drawDebug().lamp);
  if (lamp) await page.evaluate(([x, z]) => window.__game.teleportForTest({x: x + 2.2, y: 0.2, z: z + 1.5}), lamp);
  await page.waitForTimeout(800);
  await page.keyboard.down('KeyK');
  await page.waitForTimeout(2500);
  await page.screenshot({path: '/tmp/pull_1_drawing.png', timeout: 170000});
  const dbg = await page.evaluate(() => window.__drawDebug && window.__drawDebug());
  console.log('DEBUG', JSON.stringify(dbg));
  await page.keyboard.up('KeyK');
  console.log('SHOTS', errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
} catch (e) {
  console.log('FAIL', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
