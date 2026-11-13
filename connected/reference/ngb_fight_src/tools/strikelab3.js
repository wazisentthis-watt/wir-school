// Fire each strike at a static opponent at a range of distances; report contact results + optional impact screenshots.
const { chromium } = require('playwright');
(async () => {
  const shots = process.argv[2] === 'shots';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 640 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate(() => { const g = window.__game; Object.assign(g.settings, { mode: 'watch', p0: 'savannah', p1: 'graham' }); g.start(); g.paused = true; g.ctrl = [null, null]; g.phase = 'fight'; g.frozen = false; g.roundT = 1e9; g.camMode = 1;
    g.checkKnockdown = () => {}; });
  const names = ['overL', 'overR', 'bodyJabL', 'bodyJabR', 'bodyUpL', 'bodyUpR', 'upperR', 'hookL'];
  const out = [];
  for (const nm of names) for (const D of [0.95, 1.1]) {
    const r = await p.evaluate(([nm, D, shots]) => {
      const g = window.__game; const [A, B] = g.f; const dt = 1 / 60;
      for (const f of g.f) { f.reset(false); f.health = 100; f.stats.byStrike = {}; f.vel.set(0,0,0); f.intent.move.set(0,0); f.setGuard(null); f.action = null; }
      A.pos.set(0, 0, -D / 2); B.pos.set(0, 0, D / 2); A.yaw = 0; B.yaw = Math.PI;
      for (let i = 0; i < 40; i++) { g.update(dt); A.pos.set(0, 0, -D / 2); B.pos.set(0, 0, D / 2); }
      A.startStrike(nm, nm === 'hookL'); const s = A.strike; let minD = 9, shot = null, res = null, maxSpd = 0;
      for (let i = 0; i < 60 && A.strike === s; i++) {
        g.update(dt); B.pos.set(0, 0, D / 2);
        const tgt = s.def.target === 'head' ? B.vol.head.a : B.vol.abdo.b.clone().lerp(B.vol.abdo.a, 0.35);
        const dd = A.gloveNow[s.hi].distanceTo(tgt); if (dd < minD) minD = dd; maxSpd = Math.max(maxSpd, A.gloveNow[s.hi].distanceTo(A.glovePrev[s.hi]) / dt);
        if (s.contact && !res) { res = { part: s.contact.vol.part, pen: +s.contact.pen.toFixed(3), t: +s.t.toFixed(2) }; }
      }
      return { nm, D, res: res ? `${res.part} pen${res.pen} @${res.t}` : 'MISS', minD: +minD.toFixed(3), maxSpd: +maxSpd.toFixed(1), hp: +B.health.toFixed(1) };
    }, [nm, D, shots]);
    out.push(r);
  }
  for (const r of out) console.log(r.nm.padEnd(7), r.D, r.res.padEnd(26), 'minD', r.minD, 'vmax', r.maxSpd, 'hp', r.hp);
  if (shots) {
    for (const nm of names) {
      await p.evaluate(([nm]) => { const g = window.__game; const [A, B] = g.f; const dt = 1 / 60; const D = 1.1;
        for (const f of g.f) { f.reset(false); f.vel.set(0,0,0); f.action = null; }
        A.pos.set(0, 0, -D / 2); B.pos.set(0, 0, D / 2); for (let i = 0; i < 40; i++) { g.update(dt); A.pos.set(0, 0, -D / 2); B.pos.set(0, 0, D / 2); }
        A.startStrike(nm, nm === 'hookL'); const s = A.strike; for (let i = 0; i < 60; i++) { g.update(dt); B.pos.set(0, 0, D / 2); if (s.t >= s.def.impact - 0.005 || s.contact) break; }
        g.camPos.set(2.3, 1.5, 0.2); g.camLook.set(0, 1.15, 0); g.camera.position.copy(g.camPos); g.camera.lookAt(g.camLook); g.camera.fov = 45; g.camera.updateProjectionMatrix(); g.render(); }, [nm]);
      await p.screenshot({ path: `/tmp/claude-0/plots/sl_${nm}.png` });
    }
  }
  if (errs.length) console.error(errs.join('\n'));
  await b.close();
})();
