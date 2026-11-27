// Headless check of the first mission: fresh profile, accept with Y, move Metal to the Commons corner, screenshot the bank.
import {chromium} from 'playwright';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const page = await browser.newPage({viewport: {width: 800, height: 450}});
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
try {
  await page.goto(base + '/connected/?lite=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 180000});
  await page.waitForFunction(() => !!document.getElementById('missionGate'), null, {timeout: 120000});
  await page.keyboard.press('KeyY');
  await page.waitForFunction(() => !!document.getElementById('prologueCard'), null, {timeout: 120000});
  const site = await page.evaluate(() => window.__game.prSite());
  if (site) await page.evaluate(([x, y, z]) => window.__game.teleportForTest({x: x + 5, y: 0.2, z: z + 5}), site);
  await page.waitForTimeout(2500);
  await page.screenshot({path: '/tmp/bank_1.png', timeout: 170000});
  console.log('SHOTS', site ? 'site ' + site.map(v => v.toFixed(1)).join(',') : 'no site', errors.length ? 'errors: ' + errors.slice(0, 3).join(' | ') : 'no page errors');
} catch (e) {
  console.log('FAIL', e.message, errors.slice(0, 3));
  process.exitCode = 1;
} finally {
  await browser.close();
}
