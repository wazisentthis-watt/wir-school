// usage: node shot.js url out.png [w h] [evalJS]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w = 1200, h = 700, js] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push(m.type()+': '+m.text()); }); p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto(url); await p.waitForFunction('window.__ready', null, { timeout: 60000 }).catch(e => errs.push('timeout ready'));
  if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log(JSON.stringify(r)); }
  await p.screenshot({ path: out });
  if (errs.length) console.log(errs.slice(0, 15).join('\n'));
  await b.close();
})();
