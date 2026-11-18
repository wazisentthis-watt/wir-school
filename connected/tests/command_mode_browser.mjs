// REFRAMER COMMAND Cinder Pass browser test (headless Chromium, swiftshader). PROPOSAL / PUBLISH HOLD.
// Serves connected/ over HTTP, plays the mission with real key presses, and checks the verdict.
// Node: node tests/command_mode_browser.mjs   (set SHOT_DIR to choose where screenshots go)
import http from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {extname, join, dirname, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOT_DIR = process.env.SHOT_DIR || join(tmpdir(), 'wir-command-shots');
const MIME = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.css':'text/css'};
const server = http.createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(ROOT, p === '/' ? 'command.html' : p);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const buf = await readFile(file);
    res.writeHead(200, {'content-type': MIME[extname(file)] || 'application/octet-stream'}).end(buf);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(8783, '127.0.0.1', r));

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' · ' + detail : '')); };

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-features=Vulkan', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:8783/command.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__command && window.__command.status, null, { timeout: 15000 });
await mkdir(SHOT_DIR, { recursive: true });
await page.waitForTimeout(400);
await page.screenshot({ path: join(SHOT_DIR, 'command_cinder_start.png') });

const st = () => page.evaluate(() => window.__command.status());
const medics = () => page.evaluate(() => window.__command.C.evac.map(e => ({ id: e.id, state: e.state, x: +e.x.toFixed(2), z: +e.z.toFixed(2) })));

let s = await st();
check('starts incomplete', !s.complete && !s.failed);
check('objectives listed', s.objectives.length === 2, s.objectives.map(o => o.id).join(','));

// Rescue requests alone must not win.
await page.keyboard.press('KeyR');
await page.keyboard.press('KeyR');
await page.waitForTimeout(100);
let m = await medics();
// With no escort in range, requested medics stay put: requested, not moving, not safe.
check('requested medics wait without an escort', m.every(x => x.state === 'waiting' && x.x === 6), JSON.stringify(m.map(x => x.state + '@' + x.x)));
s = await st();
check('requests alone do not complete', !s.complete && !s.medicsSafe);

// Escort: Bulwark follows the requested medics for real.
await page.keyboard.press('KeyE');
await page.evaluate(() => window.__command.stepForTest(900, 1 / 20)); // 45 s of mission time
m = await medics();
check('escorted medics walk into the safe zone', m.every(x => x.state === 'safe'), JSON.stringify(m.map(x => x.state + '@' + x.x)));
s = await st();
check('medics safe but hostile up is not a win', s.medicsSafe && !s.complete);
await page.screenshot({ path: join(SHOT_DIR, 'command_cinder_medics_safe.png') });

// Strike the hostile: General is placed beside it (test hook), then Space x4 with cooldown.
await page.evaluate(() => window.__command.placeGeneralNearHostileForTest());
for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await page.evaluate(() => window.__command.stepForTest(15, 1 / 20)); }
s = await st();
check('hostile neutralized by strikes', s.hostileNeutral, 'hostile=' + JSON.stringify(await page.evaluate(() => window.__command.C.hostile.hp)));
check('full win only when both hold', s.complete === true && s.failed === false);
const inv = await page.evaluate(() => window.__command.invariants());
check('invariants clean', inv.length === 0, JSON.stringify(inv));
await page.waitForTimeout(400);
await page.screenshot({ path: join(SHOT_DIR, 'command_cinder_complete.png') });

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed · screenshots in ${SHOT_DIR}`);
process.exit(failed ? 1 : 0);
