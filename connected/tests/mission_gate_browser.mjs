// Headless check of the first-mission choice on a fresh profile: Y starts the prologue, B plays free roam.
import {chromium} from 'playwright';
const base = process.env.METAL_BOOT_BASE || 'http://127.0.0.1:8765';
const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox']});
const run = async (key, expectPrologue) => {
  const ctx = await browser.newContext({viewport: {width: 800, height: 450}});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  await page.goto(base + '/connected/?lite=1', {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.__setForm === 'function' && window.__realForms === true, null, {timeout: 180000});
  await page.waitForFunction(() => !!document.getElementById('missionGate'), null, {timeout: 120000});
  await page.keyboard.press(key);
  await page.waitForTimeout(2500);
  const gone = await page.evaluate(() => !document.getElementById('missionGate'));
  const prologue = await page.evaluate(() => !!document.getElementById('prologueCard'));
  await ctx.close();
  const ok = gone && prologue === expectPrologue && errors.length === 0;
  console.log(ok ? 'PASS' : 'FAIL', key, 'gate closed:', gone, 'prologue card:', prologue, errors.length ? 'errors: ' + errors.slice(0, 2).join(' | ') : '');
  return ok;
};
try {
  const a = await run('KeyY', true);
  const b = await run('KeyN', false);
  if (!(a && b)) process.exitCode = 1;
} catch (e) {
  console.log('FAIL', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
