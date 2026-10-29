# Body-Bend FINAL (merged) — LOCAL PROTOTYPE

**PLACEHOLDER / PROPOSAL – not canon. Everything here is Simulated.** Published as a test page on Coach's request (Oct 28). Neutral names only (slab, shield, boat, String A/B/C). No Pokémon or Avatar names, no image/asset files (all art is drawn on a canvas). No harm mechanics: nothing flies, nothing damages anything.

One build that merges two earlier prototypes (both left untouched): `../body-bend/` (stomp → ripple → slab / shield / boat) and `../body-bend-flow/` (flow meter, string, palms charge, clap).

## Privacy
Camera video is processed **on this device only**. Nothing is recorded, saved, uploaded, or stored (no fetch/upload/recording/storage APIs in the source; a test checks this). The only network use: when you press **camera**, the MediaPipe library and models load from `cdn.jsdelivr.net` and `storage.googleapis.com` (the hand model only if you turn the flow layer on). No account, no paid service. Offline, **sim** mode (fake keyboard body) still works.

## How to open
```
cd ar-lab/body-bend-final
python3 -m http.server 8000        # then open http://localhost:8000/
```
- **Desktop:** `localhost` is a secure context, so the camera works.
- **iPhone (Safari):** the camera only works on **https** (or localhost). `http://<laptop-ip>:8000` will be refused by Safari. Options: put the folder on any https static host you already trust, or an https tunnel you control. On the phone: open the page, tap **Use camera**, allow camera (if you said no: aA → Website Settings → Camera → Allow). Prop the phone up, ~2 m back, whole body in frame head to feet, rear or front camera as you like (the page uses the front camera). Try **Try simulated body** first to see the flow with no camera.
- Tests: `node tests/*.js` (Node 20+, no installs, no network). Equivalent: `node tests/all.test.js` or `npm test`.

## What you do (main game)
1. **Clear your space** screen first: ~2 m clear floor, whole body in view, stomp gently, no jumping. "My space is clear" unlocks after your full body has been in frame ~1.5 s.
2. **Stomp** = foot drops fast and stops, hips drop, then **set** (~0.12 s still) and **hold** (~0.3 s still). Cooldown 2.5 s (0.8 s after a failed one), max 8 per minute (default `maxStompsPerMin:8` in `body.js`; the rate-limit test sets 3 on purpose so it hits the cap quickly). Walking, standing, jumping and slow squats do nothing.
3. A single **ripple ring** spreads on the floor at the foot, then the solid rises slowly from its centre. One at a time; the old one fades softly.
   - normal stomp → **slab** where your foot landed
   - **wide + low** stance held after the stomp → **shield** (drawn so it covers you when you stand behind it; step forward and you cover it)
   - **pool** on (virtual pool drawn on the floor) + stomp inside → **boat** (wide-low there → shield out of the water)
4. Slow push: a wrist inside a settled rock moving slowly drags it with heavy inertia. Fast flicks do nothing.
5. **Rest prompt** every 5 min (15 s, recognition paused). Jump-ignored hint if both feet leave the floor.

Screen is nearly empty: PLACEHOLDER badge, a tiny pose hint, a tiny `calm (Simulated)` bar, a small button row. **hud ▾** (top right) collapses everything except the badge; the clear-space and rest prompts always show.

## Optional layer (off by default): flow
Buttons **flow: off** and **string: off**.
- **flow: on** → tiny `flow (Simulated)` meter (how smoothly motion travels feet → hips → spine → shoulders → arm → fingers; calm, slow-moving numbers) and a tiny `charge (Simulated)` bar. **Palms together** ~3 s builds charge; parting slowly releases calmly; a **clap** (open, then slam shut) releases early (faint ring). No pinch, no two-fingers-up.
- **string: A / B / C / off** (turns flow on too) → a faint glowing string from your lead hand with calm, heavy physics. A/B/C are neutral PLACEHOLDER types (they only paint a soft trail, or nothing extra); their meaning is **not designed** — real string types need Attunement data that does not exist here.
- Turning flow on in camera mode also loads the hand model (optional; pose-only works).

## Gradebook (silent)
Reports to `sci-ar-safe-lab` only if a gradebook exists (`window.WIRSchool.recordAttempt`, or `postMessage` to a parent frame): first stomp, first shield, 4 s of flow, first charge release. Each once per session, labelled Simulated, `data_class: simulated`. No gradebook → nothing happens, no errors. Not wired to `../grade.js`.

## Sim keys (no camera)
Arrows move (up = farther), **Space** stomp, **Shift+Space** wide-low stomp, **W** walk, **J** jump, **P** pool, **R** clear rocks, **K** skeleton. Flow layer: **L** layer, **G** string, **F** auto-sway, **H** hold palms, **C** clap, **T** palm tilt, **X** stiff. `?rest=20` shows the rest prompt after 20 s.

## Files
`index.html` UI · `app.js` camera / sim glue · `body.js` stomp logic, rocks, space check, rest timer · `flow.js` flow engine, string, charge/clap, gradebook bridge · `simflow.js` simulated arm motion for sim mode · `render.js` canvas drawing · `fixtures.js` simulated poses · `config.js` defaults + labels · `tests/`.

## What works (verified here)
- Node tests on **synthetic poses** (stomp, shield, boat, hide-behind ordering, jump/walk rejection, space check, rest timer, flow scoring, charge/clap, calm caps, labels, names, privacy, gradebook): see the test output you ran.
- Headless Chromium, **sim mode**: gate → start, stomp → ripple → slab, flow layer + string on, palms charge, HUD collapse (only badge + hud button left), no console errors, no requests off localhost.

## Partial
- **Depth is faked** (columns pushed toward a fixed vanishing point; no 3D, no camera pose). Rocks are pinned to screen coordinates; if the phone moves they do not follow.
- Hiding uses the person mask when MediaPipe gives one, else a rough body outline; arms reaching over a rock look wrong.
- Merged sim body: the flow arm motion in sim mode is a stand-in laid over the stomp stick figure; clap detection in sim is near its threshold (it fires ~0.4 s after the slam).
- String A/B/C are placeholders; the string follows the lead fingertip only.

## Untested — real camera and iPhone
**Never run with a real person, a real camera, or an iPhone 17.** All thresholds (stomp speed, hip drop, wide/low limits, flow lag windows, clap speed, palm angle) were set on synthetic poses and will need tuning. Side-on views make knee angles unreliable. Real MediaPipe pose/segmentation/hand code follows the library API; with a fake video feed it was only smoke-checked for loading (see report), not for recognising a body. Safari/iPhone behaviour (autoplay, orientation, performance, heat, battery) is unknown. Distance and rock scale assume a 0.40 m shoulder width and ~60° field of view.

## Not built
Real string types / Attunement rules, sound, multi-person, camera-motion compensation, real depth or 3D, any canon decisions, push/commit, hosting/https setup, a rear-camera toggle (front camera only), gradebook UI.
