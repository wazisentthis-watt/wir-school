const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'] }); const p = await ctx.newPage(); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  const r = await p.evaluate(() => {
    const G = window.__game; G.loop = () => {};
    const pad = { index: 0, id: 'SteelSeries Nimbus', connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
    window.__fakePads = [pad];
    const press = (i) => { pad.buttons[i].pressed = true; pad.buttons[i].value = 1; G.pollPads(); pad.buttons[i].pressed = false; pad.buttons[i].value = 0; G.pollPads(); };
    press(13); press(13); // d-pad down twice in menu
    const focus = G.nav.el && G.nav.el.textContent.slice(0, 30);
    G.settings.mode = 'quick'; G.start(); for (let i = 0; i < 200; i++) { G.pollPads(); G.update(1 / 60); } press(2); for (let i = 0; i < 20; i++) G.update(1 / 60);
    for (let i = 0; i < 30; i++) G.updateCamera(1 / 60); G.updateHUD(); G.render();
    return { focus, touchDisplay: getComputedStyle(document.getElementById('touch')).display, padmode: document.body.classList.contains('padmode'), strike: G.player.stats.thrown };
  });
  console.log(JSON.stringify(r)); await p.screenshot({ path: '/tmp/claude-0/plots/padphone.png' });
  console.log(errs.join('\n')); await b.close();
})();
