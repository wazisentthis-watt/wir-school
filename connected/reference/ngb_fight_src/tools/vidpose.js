// Run the game's own vendored MediaPipe Pose over a video's frames (served from dist/site/_frames/<clip>/) → landmarks JSON.
// node vidpose.js <clip> [complexity]
const { chromium } = require('playwright'); const fs = require('fs');
const clip = process.argv[2], cx = +(process.argv[3] || 0);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } }); await p.route(/fonts\.g/, r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction('window.__ready', null, { timeout: 60000 });
  const n = fs.readdirSync(`/home/claude/ngb/dist/site/_frames/${clip}`).length;
  const out = await p.evaluate(async ([clip, n, cx]) => {
    const m = window.__game.pmk; await m.loadScript('./vendor/mediapipe-pose/pose.js');
    const pose = new window.Pose({ locateFile: f => './vendor/mediapipe-pose/' + f });
    pose.setOptions({ modelComplexity: cx, smoothLandmarks: true, enableSegmentation: false, selfieMode: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    let last = null; pose.onResults(r => { last = r; }); await pose.initialize();
    const frames = []; const t0 = performance.now();
    for (let i = 1; i <= n; i++) {
      const img = new Image(); img.src = `./_frames/${clip}/f${String(i).padStart(4, '0')}.jpg`; await img.decode();
      last = null; await pose.send({ image: img });
      const r = last; const q = a => a ? a.map(l => [+l.x.toFixed(4), +l.y.toFixed(4), +l.z.toFixed(4), +(l.visibility ?? 1).toFixed(3)]) : null;
      frames.push({ i, lm: q(r && r.poseLandmarks), world: q(r && r.poseWorldLandmarks) });
    }
    return { clip, fps: 30, n, ms: Math.round(performance.now() - t0), frames };
  }, [clip, n, cx]);
  fs.writeFileSync(`/home/claude/vid/pose_${clip}_c${cx}.json`, JSON.stringify(out));
  console.log(clip, 'frames', out.n, 'tracked', out.frames.filter(f => f.lm).length, 'ms', out.ms, errs.slice(0, 3));
  await b.close();
})();
