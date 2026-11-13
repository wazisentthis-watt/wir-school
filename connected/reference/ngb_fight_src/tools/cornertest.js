// The 10-second corner: real pointer gestures (dig in the jar, smear the brows), water, spit, talk → effects; timer closes it.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await p.route(/fonts\.g/, r => r.abort()); const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready', null, { timeout: 90000 });
  const out = [], ok = (n, pass, ...i) => out.push([pass ? 'PASS' : 'FAIL', n, ...i]);
  const z = await p.evaluate(() => { const G = window.__game; G.loop = () => {}; let T = 1000; performance.now = () => T; window.__fr = n => { for (let i = 0; i < n; i++) { T += 1000 / 60; G.update(1 / 60); G.updateCamera(1 / 60); G.corner.tick(1 / 60); } G.render(); };
    G.settings.mode = 'quick'; G.settings.p1 = 'graham'; G.settings.rounds = 3; G.start(); __fr(200); G.ctrl[1] = null;
    // a round where Graham kept landing the jab
    const O = G.f[1]; O.stats.byStrike = { jabL: { t: 9, l: 6 }, crossR: { t: 4, l: 1 } }; G.player.tr && (G.player.tr.vaseline = [0, 0]);
    G.roundT = 0.05; __fr(40); const C = G.corner; const zz = C.zones(); return { active: C.active, brow: zz.brow, rb: zz.rb, mouth: zz.mouth, eye: zz.eye, attr: { ...G.player.attr }, stam: G.player.stamina, jar: (() => { const r = document.getElementById('cnJar').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; })() }; });
  ok('corner opens at the end of the round', z.active);
  // dig the finger into the jar (circles), then drag straight across his left brow, re-load, his right brow
  const M = p.mouse; const dig = async () => { await M.move(z.jar.x, z.jar.y); await M.down(); for (let a = 0; a < 6.3; a += 0.4) await M.move(z.jar.x + Math.cos(a) * z.jar.w * 0.25, z.jar.y + Math.sin(a) * z.jar.w * 0.25, { steps: 2 }); await M.up(); }; // lift the finger, carry it over
  for (const i of [0, 1]) { await dig(); const br = z.brow[i]; await M.move(br.x - z.rb[0], br.y - 0.5 * z.rb[1]); await M.down(); for (const dy of [-0.5, 0, 0.5]) { await M.move(br.x - z.rb[0], br.y + dy * z.rb[1], { steps: 4 }); await M.move(br.x + z.rb[0], br.y + dy * z.rb[1], { steps: 10 }); } await M.up(); }
  await p.evaluate(() => __fr(2));
  // water: drag the bottle to his mouth and hold; then the bucket under his mouth
  const tool = async (name) => p.evaluate(n => { const r = document.querySelector(`[data-tool="${n}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, name);
  let t = await tool('water'); await M.move(t.x, t.y); await M.down(); await M.move(z.mouth.x + 10, z.mouth.y + 5, { steps: 6 }); await p.evaluate(() => __fr(36)); await M.up();
  t = await tool('bucket'); await M.move(t.x, t.y); await M.down(); await M.move(z.mouth.x, z.mouth.y + 90, { steps: 6 }); await p.evaluate(() => __fr(30)); await M.up();
  // talk (typed path = same analyzer as the mic)
  const talk = await p.evaluate(() => { const C = window.__game.corner; C.hear("He keeps hitting you with that left jab. You got to start slipping and rolling left more. You got this, champ!", 1); return { buffs: C.talk.buffs, read: window.__game.player.cornerRead, reply: document.getElementById('cnReply').textContent }; });
  await p.evaluate(() => { window.__cornerDebug = false; __fr(1); }); await p.screenshot({ path: '/tmp/claude-0/plots/corner_play.png' });
  const res = await p.evaluate(() => { __fr(60 * 9); const G = window.__game, C = G.corner, P = G.player; return { active: C.active, open: G.ss.cornerOpen, last: C.lastResult && { lines: C.lastResult.lines, grease: C.lastResult.grease, eye: C.lastResult.eye, sip: +C.lastResult.sip.toFixed(2), spat: C.lastResult.spat }, vas: P.tr.vaseline, mouth: P.tr.mouthpiece, attr: { ...P.attr }, cornerRest: P.cornerRest }; });
  ok('Vaseline: smeared brows are covered (both sides > 50%)', res.last.grease && res.last.grease.every(q => q > 0.5) && !res.last.eye, res.last.grease, 'eye', res.last.eye, 'stored', res.vas);
  ok('water poured and he spat (mouthpiece rinsed)', res.last.sip > 0.3 && res.last.spat && res.mouth, res.last.sip, res.last.spat);
  ok('talk about his jab → +3 agility + a read on the jab', talk.buffs.some(b => b.attr === 'agility' && b.n === 3) && talk.read === 'jab' && res.attr.agility === z.attr.agility + 3, JSON.stringify(talk.buffs), talk.read, talk.reply);
  ok('the corner closes itself at 10 seconds and the fighter stands up', !res.active && !res.open && !res.cornerRest, res.last.lines);
  // the read works next round: his jab lands softer
  const rd = await p.evaluate(() => { const G = window.__game, P = G.player, O = G.f[1]; G.phase = 'fight'; G.frozen = false; O.state = 'idle'; O.stunT = 0; const hit = () => { O.strike = null; O.state = 'idle'; O.stamina = 100; O.sig = P.sig = null; O.requestStrike('jabL'); if (!O.strike) return NaN; const d = G.ss.modifyHit(O, P, { dmg: 10, part: 'head', kind: 'clean', strike: O.strike }); O.strike = null; O.state = 'idle'; return d; }; const a = hit(); P.cornerRead = null; const b2 = hit(); P.cornerRead = 'jab'; return +(a / b2).toFixed(2); });
  ok('next round: the jab he told you about lands softer (READ IT)', rd < 0.85, rd);
  // grease in the eye costs you
  const eye = await p.evaluate(() => { const G = window.__game; G.player.tr.blood = [0, 0]; G.roundT = 0.05; G.phase = 'fight'; G.frozen = false; __fr(40); const C = G.corner; if (!C.active) return 'no corner'; const z = C.zones(); C.load = 1; const e = z.eye[0]; for (let k = -2; k <= 2; k++) { C.load = 1; C.smear({ x: e.x - z.re[0], y: e.y + k * z.re[1] * 0.4 }, { x: e.x + z.re[0], y: e.y + k * z.re[1] * 0.4 }); } C.close('stand'); return { eye: C.lastResult.eye, blood: G.player.tr.blood.map(v => Math.round(v)) }; });
  ok('grease smeared in his eye → blurry eye next round', eye.eye && eye.blood[0] > 10, JSON.stringify(eye));
  let pass = 0, fail = 0; for (const l of out) { if (l[0] === 'PASS') pass++; else fail++; console.log(JSON.stringify(l)); }
  console.log(`${pass} pass / ${fail} fail`); console.log(errs.join('\n')); await b.close();
})();
