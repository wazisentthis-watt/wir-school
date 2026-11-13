// node scen.js name  -> runs a scripted scenario and saves frames
const { chromium } = require('playwright');
const SC = {
  ko: { setup: `g.ctrl=[null,null]; g.phase='fight'; g.roundT=1e9; g.__step=(g)=>{ if(g.__t>1 && !g.__kd){ g.__kd=1; const B=g.f[1]; B.health=0; g.checkKnockdown(B,'head',10,{def:{label:'Right Hook'}}); g.count.aiRise=4; } };`, times: [1.4, 2.2, 3.5, 6.5, 8.6, 9.6, 11] },
  kneel: { setup: `g.ctrl=[null,null]; g.phase='fight'; g.roundT=1e9; g.__step=(g)=>{ if(g.__t>1 && !g.__kd){ g.__kd=1; const B=g.f[1]; B.health=0; g.checkKnockdown(B,'body',10,{def:{label:'Left Body'}}); g.count.aiRise=4; } };`, times: [2.5, 4] },
  weave: { setup: `g.ctrl=[null,null]; g.phase='fight'; g.roundT=1e9; g.camMode=1; g.__step=(g)=>{ const A=g.f[0]; A.intent.weave = g.__t>1 && g.__t<2.5 ? 1 : 0; if(g.__t>3 && !g.__r){g.__r=1; A.startRoll(1);} };`, times: [2.0, 3.25] },
  scorch: { setup: `g.phase='fight'; g.bs.res=100; g.bs.counts.scorch=9; g.camMode=2;`, times: [4, 7] },
  glaze: { setup: `g.phase='fight'; g.bs.res=100; g.bs.counts.glaze=9; g.camMode=2;`, times: [5] },
  steam: { setup: `g.phase='fight'; g.bs.res=100; g.bs.counts.steam=19; g.camMode=1;`, times: [4] },
  fwd: { setup: `g.ctrl=[null,null]; g.phase='fight'; g.roundT=1e9; g.camMode=1; g.__step=(g)=>{ if(g.__t>1 && !g.__kd){ g.__kd=1; const B=g.f[1]; B.health=0; B.vel.copy(B.forward).multiplyScalar(0.6); g.checkKnockdown(B,'head',10,{def:{label:'Left Hook',path:'hook'}}); g.count.aiRise=5; } };`, times: [1.3, 2.4, 4.2, 7.2, 8.4] },
  ws: { setup: `g.settings.rules='exhibition'; g.ctrl=[null,null]; g.phase='fight'; g.roundT=1e9; g.camMode=1; const A=g.f[0]; g.__step=(g)=>{ if(g.__t>0.5&&!g.__a){g.__a=1; A.focus=99; A.stamina=99; A.weightShift(-1);} if(g.__t>2.5&&!g.__b){g.__b=1; A.focus=99; A.weightShift(1); A.focus=99; A.weightShift(1);} };`, times: [0.4, 2.2, 4.5] },
  versus3: { setup: `g.phase='fight'; g.camMode=1;`, times: [3] },
  win: { setup: `g.ctrl=[null,null]; g.phase='fight'; g.roundT=1e9; g.__step=(g)=>{ if(g.__t>1 && !g.__kd){ g.__kd=1; g.finish(g.f[0],'KO'); } };`, times: [3, 5] },
};
(async () => {
  const name = process.argv[2]; const sc = SC[name]; const W = +(process.argv[3] || 1100), H = +(process.argv[4] || 640);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack || '').split('\n').slice(0, 3).join('|')));
  await p.goto('file:///home/claude/ngb/dist/index.html?shot'); await p.waitForFunction('window.__ready');
  await p.evaluate((setup) => { const g = window.__game; Object.assign(g.settings, { mode: 'watch', p0: 'savannah', p1: 'graham' }); g.start(); g.paused = true; g.__t = 0; g.showReport = () => {}; eval(setup); }, sc.setup);
  for (const tt of sc.times) {
    await p.evaluate((tt) => { const g = window.__game; const dt = 1 / 60; while (g.__t < tt) { if (g.__step) g.__step(g); g.update(dt); g.__t += dt; g.updateCamera(dt); } g.updateHUD(); g.render(); }, tt);
    await p.screenshot({ path: `/tmp/claude-0/plots/sc_${name}_${tt}.png` });
  }
  if (errs.length) console.error(errs.join('\n'));
  await b.close();
})();
