// Headless fight simulation: node sim.js [p0] [p1] [diff] [seconds] [shotsPrefix]
const { chromium } = require('playwright');
(async () => {
  const [p0 = 'savannah', p1 = 'graham', diff = 'normal', secs = 120, shots = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'))); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL/.test(m.text())) errs.push(m.text()); }); await p.route(/fonts\.g/, r => r.abort());
  await p.goto('file:///home/claude/ngb/dist/index.html?shot&lowfx'); await p.waitForFunction('window.__ready');
  const res = await p.evaluate(async ([p0, p1, diff, secs]) => {
    const g = window.__game; Object.assign(g.settings, { mode: 'watch', p0, p1, diff, rounds: 3, roundLen: 90 }); g.start(); g.paused = true;
    const log = { dist: [], events: {}, kd: [], phases: {} , hits: []};
    const origFeed = g.feed.bind(g); g.feed = (t, c) => { log.events[t.split(':')[0].slice(0, 40)] = (log.events[t.split(':')[0].slice(0, 40)] || 0) + 1; };
    const origRes = g.resolve.bind(g);
    g.resolve = (att) => { const s = att.strike; const before = s && s.contact; origRes(att); if (s && !before && s.contact) log.hits.push([att.id, s.name, s.contact.vol.part, +(s.contact.pen).toFixed(3)]); };
    const dt = 1 / 60; let t = 0;
    while (t < secs && g.phase !== 'end') { g.update(dt); t += dt; if (Math.round(t * 60) % 30 === 0) { log.dist.push(+g.f[0].pos.distanceTo(g.f[1].pos).toFixed(2)); } log.phases[g.phase] = (log.phases[g.phase] || 0) + dt; }
    const [A, B] = g.f; const S = f => ({ hp: +f.health.toFixed(1), st: +f.stamina.toFixed(0), kd: f.knockdowns, ...f.stats, byStrike: JSON.stringify(f.stats.byStrike) });
    const partCount = {}; for (const h of log.hits) { const k = h[0] + ':' + h[2]; partCount[k] = (partCount[k] || 0) + 1; }
    return { t: +t.toFixed(1), phase: g.phase, result: g.result && { w: g.result.winner && g.result.winner.spec.short, how: g.result.how, extra: g.result.extra }, scores: g.scores, A: S(A), B: S(B), distAvg: +(log.dist.reduce((a, b) => a + b, 0) / log.dist.length).toFixed(2), distMin: Math.min(...log.dist), distMax: Math.max(...log.dist), events: log.events, parts: partCount, phases: log.phases, bs: g.bs.state, res: g.bs.res };
  }, [p0, p1, diff, +secs]);
  console.log(JSON.stringify(res, null, 1));
  if (errs.length) console.error('ERRORS:\n' + errs.slice(0, 10).join('\n'));
  await b.close();
})();
