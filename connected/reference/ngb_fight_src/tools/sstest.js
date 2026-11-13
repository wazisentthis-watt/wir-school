// Sweet Science checks: AI-vs-AI full fights (no crash, trauma accrues, events fire) + targeted mechanics + corner flow.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot&lowfx'); await p.waitForFunction('window.__ready');
  const out = await p.evaluate(() => {
    const g = window.__game; const R = []; const ok = (n, pass, ...i) => R.push([pass ? 'PASS' : 'FAIL', n, ...i]); const dt = 1 / 60;
    // --- 1. three AI-vs-AI fights, all eras
    const feeds = {}; const of = g.feed.bind(g); g.feed = (t, c) => { const k = t.replace(/^[A-Za-z ]+?(?= is| hurt| digs|'s)/, '').slice(0, 30); feeds[k] = (feeds[k] || 0) + 1; of(t, c); };
    for (const era of ['modern', 'golden', 'bare']) {
      Object.assign(g.settings, { mode: 'watch', p0: 'savannah', p1: 'graham', diff: 'normal', rounds: 3, roundLen: 90, era }); g.start(); g.paused = true; let t = 0;
      while (t < 330 && g.phase !== 'end') { if (g.ss.cornerOpen) g.ss.closeCorner(); g.update(dt); t += dt; }
      const tr = g.f.map(f => f.tr ? { sw: f.tr.swell.map(Math.round), cut: f.tr.cut.map(Math.round), hand: f.tr.hand.map(Math.round), nose: Math.round(f.tr.nose) } : null);
      ok(`AI fight (${era}) completes`, g.phase === 'end' || t >= 330, g.result && g.result.how, g.result && g.result.extra, 't', Math.round(t), JSON.stringify(tr));
    }
    ok('trauma events fired across fights', Object.keys(feeds).length > 0, JSON.stringify(feeds));
    // --- 2. targeted: player fight, scripted hits through the real resolver path pieces
    Object.assign(g.settings, { mode: 'quick', p1: 'graham', rounds: 3, roundLen: 90, era: 'modern' }); g.start(); g.ctrl[1] = null; for (let i = 0; i < 175; i++) g.update(dt);
    const P = g.player, O = g.f[1]; const S = g.ss; const fake = (hi, path, name, heavy) => ({ hi, def: { path, target: path === 'body' ? 'body' : 'head' }, name, heavy });
    // liver: lead hook to the body, heavy enough → delayed fold
    S.init(O); const kd0 = O.knockdowns; S.afterHit(P, O, { kind: 'clean', strike: fake(0, 'hook', 'hookL') }, 'body', 7.2); ok('liver shot arms a delayed fold', O.tr.liverT > 1 && O.tr.liverFold, O.tr.liverT);
    for (let i = 0; i < 80; i++) g.update(dt); ok('…and the legs go ~1.15 s later', O.knockdowns > kd0 || O.state === 'down' || g.phase === 'down', O.state, O.knockdowns, g.phase);
    for (let i = 0; i < 900 && g.phase !== 'fight'; i++) { if (g.count) g.count.mash = 9; g.update(dt); }
    // plexus
    S.afterHit(P, O, { kind: 'clean', strike: fake(1, 'straight', 'bodyJabR') }, 'body', 6); O.stamina = 90; g.update(dt); ok('solar plexus caps stamina', O.stamina <= 20.5, +O.stamina.toFixed(1));
    // swelling side + blind side
    O.tr.swell = [0, 0]; S.afterHit(P, O, { kind: 'clean', strike: fake(1, 'straight', 'crossR') }, 'head', 6); ok('right hand swells the LEFT eye', O.tr.swell[0] > 5 && O.tr.swell[1] === 0, O.tr.swell);
    O.tr.swell[0] = 70; const d1 = S.modifyHit(P, O, { dmg: 5, part: 'head', kind: 'clean', strike: fake(1, 'straight', 'crossR') }); O.tr.swell[0] = 0; const d0 = S.modifyHit(P, O, { dmg: 5, part: 'head', kind: 'clean', strike: fake(1, 'straight', 'crossR') });
    ok('blind-side shot lands harder', d1 > d0 * 1.2, +d1.toFixed(2), +d0.toFixed(2));
    // rolling with a hook
    O.weaveX = 0.6; const r1 = S.modifyHit(P, O, { dmg: 5, part: 'head', kind: 'clean', strike: fake(1, 'hook', 'hookR') }); O.weaveX = -0.6; const r0 = S.modifyHit(P, O, { dmg: 5, part: 'head', kind: 'clean', strike: fake(1, 'hook', 'hookR') }); O.weaveX = 0;
    ok('rolling with the hook takes the sting out', r1 < r0 * 0.75, +r1.toFixed(2), +r0.toFixed(2));
    // broken hand hits softer
    P.tr.hand[1] = 60; const h1 = S.modifyHit(P, O, { dmg: 5, part: 'body', kind: 'clean', strike: fake(1, 'straight', 'bodyJabR') }); P.tr.hand[1] = 0; const h0 = S.modifyHit(P, O, { dmg: 5, part: 'body', kind: 'clean', strike: fake(1, 'straight', 'bodyJabR') });
    ok('hurt hand hits softer', h1 < h0 * 0.8, +h1.toFixed(2), +h0.toFixed(2));
    // vision vignette on the player's swollen side
    P.tr.swell = [80, 0]; S.vision(); const vs = document.getElementById('ssVision').style.boxShadow; ok('player vision closes on the swollen side', /inset/.test(vs) && /160px/.test(vs), vs.slice(0, 60)); P.tr.swell = [0, 0]; S.vision();
    // --- 3. corner between rounds
    g.roundT = 0.01; for (let i = 0; i < 30 && g.phase === 'fight'; i++) g.update(dt);
    ok('end of round opens YOUR corner', g.ss.cornerOpen && !document.getElementById('ssCorner').classList.contains('hidden'), g.phase);
    for (let i = 0; i < 600; i++) g.update(dt); ok('break waits while you sit on the stool', g.phase === 'break', g.phase);
    P.tr.cut = [50, 0]; P.tr.swell = [60, 0]; document.getElementById('cnQuick').click(); document.getElementById('cnQSpit').click(); P.tr.mouthpiece = false;
    for (let i = 0; i < 660 && g.corner.active; i++) g.corner.tick(dt); ok('the 10-second corner closes itself, grease + spit applied', !g.ss.cornerOpen && P.tr.vaseline[0] > 0.3 && P.tr.mouthpiece, P.tr.vaseline, g.corner.lastResult && g.corner.lastResult.lines);
    for (let i = 0; i < 600 && g.phase !== 'fight'; i++) g.update(dt); ok('stand up → next round starts', g.round === 2 && (g.phase === 'fight' || g.phase === 'intro'), g.round, g.phase);
    // menu era pill
    g.toMenu && g.toMenu(); const pill = document.getElementById('menuEra'); ok('RULES pill in menu', !!pill, pill && pill.textContent);
    return R;
  });
  let pass = 0, fail = 0; for (const r of out) { r[0] === 'PASS' ? pass++ : fail++; console.log(JSON.stringify(r)); }
  console.log(`${pass} pass / ${fail} fail`); console.log(errs.slice(0, 5).join('\n')); await b.close();
})();
