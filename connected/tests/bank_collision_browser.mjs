// Headless check: the bank is solid. Teleport Metal into the bank's centre; he should be pushed out of it.
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
  const bank = await page.evaluate(() => window.__game.bankBox());
  if (!bank) throw new Error('no bank');
  await page.evaluate(([x, z]) => window.__game.teleportForTest({x, y: 0.2, z}), bank);
  await page.waitForTimeout(2500);
  const pos = await page.evaluate(() => window.__game.playerPos());
  const inside = Math.abs(pos[0] - bank[0]) < 3.2 && Math.abs(pos[2] - bank[1]) < 3.2;
  console.log(inside ? 'FAIL still inside the bank' : 'PASS pushed out of the bank', 'player at', pos.map(v => v.toFixed(1)).join(','), errors.length ? 'errors: ' + errors.slice(0, 2).join(' | ') : '');
  if (inside || errors.length) process.exitCode = 1;
} catch (e) {
  console.log('FAIL', e.message, errors.slice(0, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
