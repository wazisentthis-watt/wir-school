// Replay a real recorded clip (pose JSON from vidpose.js) through the game: calibrate from the clip, drive the fighter, render frames.
// node replay.js <clip> [cam]   → /home/claude/vid/replay_<clip>/g%04d.png + replay_<clip>.json (per-frame log)
const { chromium } = require('playwright'); const fs = require('fs');
const clip = process.argv[2], camMode = +(process.argv[3] ?? 1);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 960 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('http://localhost:8765/index.html?shot'); await p.waitForFunction('window.__ready', null, { timeout: 60000 });
  const data = JSON.parse(fs.readFileSync(`/home/claude/vid/pose_${clip}_c0.json`));
  const info = await p.evaluate(([data, camMode]) => {
    const G = window.__game; G.loop = () => {}; let T = 1000; performance.now = () => T;
    const obj = a => a ? a.map(([x, y, z, v]) => ({ x, y, z, visibility: v })) : null;
    window.__frames = data.frames.map((f, k) => ({ lm: obj(f.lm), world: obj(f.world), t: 1000 + k * 1000 / data.fps }));
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.stance = 'orthodox'; G.start(); G.ctrl[1] = null;
    for (let i = 0; i < 175; i++) { T += 1000 / 60; G.update(1 / 60); }
    const P = G.player, O = G.f[1]; P.pos.set(0, 0, -0.48); O.pos.set(0, 0, 0.48); P.stamina = O.stamina = 100;
    const m = G.pmk; m.active = true; m.tracker = new (m.tracker.constructor)({ swap: false, tune: m.cfg }); const cal = m.tracker.autoCalibrate(window.__frames); m.state = 'live'; m.lastRes = T;
    G.camMode = camMode; document.getElementById('hud').style.display = 'none'; for (const id of ['pmkChip', 'pmkPrev', 'pmkCal', 'announce', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
    window.__T = () => T; window.__step = (k) => { const f = window.__frames[k]; T = f.t; m.feed(f); const ev = m.lastCommit; for (let i = 0; i < 2; i++) { T += 1000 / 60; G.pollPads(); G.update(1 / 60); } G.updateCamera(1 / 30); if (window.__camView) window.__camView(); G.render();
      const H = m.tracker.hands; return { k, strike: P.strike ? P.strike.name : null, live: P.strike ? !!P.strike.live : false, landed: P.stats.landed, thrown: P.stats.thrown, blocked: P.stats.blocked,
        hands: H.map(h => [h.phase, +h.ext.toFixed(2), +h.vr.toFixed(1), h.guard ? 1 : 0, +h.conf.toFixed(2), h.armed ? 1 : 0, h.launch ? 1 : 0]), torso: ['weave', 'duck', 'pull', 'twist'].map(q => +m.tracker.torso[q].toFixed(2)), commit: ev && ev.t === T - 2000 / 60 ? ev.strike : null, last: ev ? ev.strike + (ev.ok ? '' : '✗') : null, own: P.camBody ? P.camBody.own.map(v => +v.toFixed(2)) : null, glove: [0, 1].map(hi => { const sh = P.B[hi ? 'RightArm' : 'LeftArm'].getWorldPosition(P.gloveNow[hi].clone()); return P.toLocal(P.gloveNow[hi].clone()).sub(P.toLocal(sh)).toArray().map(v => +v.toFixed(2)); }), tgt: m.out.map(o => o.relGs.toArray().map(v => +v.toFixed(2))), relP: H.map(h => h.rel.toArray().map(v => +v.toFixed(2))) }; };
    // a view like your phone's: from your front-right, a little low, looking up — both fighters in shot
    window.__camView = () => { const c = G.camera; if (G.ref) G.ref.root.visible = false; c.position.set(-2.35, 1.2, 0.15); c.lookAt(0, 1.2, 0.05); c.fov = 46; c.updateProjectionMatrix(); };
    return { cal, n: window.__frames.length, frame: m.tracker.frame, arms: m.tracker.cal.arms.map(a => +a.len.toFixed(2)) };
  }, [data, camMode]);
  console.log(JSON.stringify(info));
  const dir = `/home/claude/vid/replay_${clip}`; fs.mkdirSync(dir, { recursive: true }); const log = [];
  for (let k = 0; k < info.n; k++) { const r = await p.evaluate(k => window.__step(k), k); log.push(r); await p.screenshot({ path: `${dir}/g${String(k + 1).padStart(4, '0')}.png` }); }
  fs.writeFileSync(`/home/claude/vid/replay_${clip}.json`, JSON.stringify({ info, log }));
  const thrown = log[log.length - 1].thrown, landed = log[log.length - 1].landed; const names = []; let prev = null; for (const r of log) { if (r.strike && r.strike !== prev) names.push(r.k + ':' + r.strike); prev = r.strike; }
  console.log('thrown', thrown, 'landed', landed, 'blocked', log[log.length - 1].blocked, '\nstrikes', names.join(' '), '\n', errs.slice(0, 3).join('\n'));
  await b.close();
})();
