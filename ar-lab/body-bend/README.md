# Body-Bend (camera full-body "stance bending") — LOCAL PROTOTYPE

**PLACEHOLDER / PROPOSAL – not canon. Everything here is Simulated.** Not committed, not pushed. Neutral names only (slab, shield, boat); no Avatar names or moves, no Pokémon assets (all art is drawn on a canvas, no image files). Attunement strings are NOT designed yet: a faint optional placeholder line is the only stand-in.

## Privacy
Camera video is processed **on this device only**. Nothing is recorded, saved or uploaded. The only network use is loading the MediaPipe pose library and model from a CDN when you press **camera** (jsdelivr + storage.googleapis.com). Offline, the page works in **sim** mode with a fake keyboard-driven body.

## How to open
```
cd ar-lab/body-bend
python3 -m http.server 8000      # then open http://localhost:8000/
```
- Desktop: `localhost` counts as a secure context, so the camera works.
- iPhone: the camera needs **https** (or localhost). Plain `http://<laptop-ip>:8000` will be refused by Safari. Use an https tunnel/host you trust, or test in sim mode first. Prop the phone up and step back so your whole body is in view.
- Tests: `node tests/*.js` (Node 20+, no installs, no network).

## What you do
1. **Clear your space** screen first: ~2 m clear, whole body in view, stomp gently, no jumping. Start unlocks after your full body has been in frame ~1.5 s and you press "My space is clear".
2. **Stomp** = foot drops fast and stops, hips drop, then **set** (~0.12 s still) and **hold** (~0.3 s still). Cooldown 2.5 s after each stomp (0.8 s after a failed one), max 8 per minute.
3. A **single ripple ring** spreads on the floor at the foot, then the solid rises from its centre (~0.7 s later, ~1 s slow ease). One rock at a time; the old one fades softly (1.2 s). Rocks stay put (fade after 90 s).
4. Effects (2-3 total):
   - normal stance stomp → **slab** at the foot where it landed
   - **wide + low** stance held after the stomp (ankle gap >= 1.7 shoulder widths, avg knee angle <= 150°) → **shield** wall, centred on your stance
   - **pool** on (a virtual pool drawn on dry floor under you) + stomp inside it → **boat** rises (wide-low there → shield rising out of the water)
5. **Hide behind the shield:** the rock is drawn by its own shape; if your feet are farther from the camera than the rock's base (higher on screen) the rock covers you. Step forward past its base and your body mask is drawn over the rock. Uses the MediaPipe pose segmentation mask when available, otherwise a rough pose-capsule silhouette.
6. Slow push: a wrist inside a settled rock moving slowly (0.05–0.8 m/s) drags it with heavy inertia (cap 0.15 m/s). Fast flicks do nothing. Nothing flies.
7. Rest prompt every 5 min (15 s, recognition paused). Jumping (both feet leaving the floor) is ignored and locks stomps for 1.5 s.
8. Each rock is anchored to the floor spot of the landing foot and scaled by shoulder width (distance is estimated with an assumed 0.40 m shoulder width and ~60° field of view; it is a rough guess).

HUD: only a tiny pose hint at the bottom, a tiny "calm" meter (lower acceleration of hips and wrists = calmer), and the PLACEHOLDER badge. Buttons top-right: camera, sim, pool, string, clear.

## Sim keys (offline test mode)
Arrows move/step (up = farther, down = nearer), **Space** stomp, **Shift+Space** wide-low stomp, **W** toggle walking, **J** jump, **P** pool, **G** string, **K** skeleton, **R** clear rocks. Add `?rest=20` to the URL to see the rest prompt after 20 s.

## Files
`index.html` UI · `app.js` camera/sim glue · `body.js` pure logic (recognizer, world, checks) · `render.js` canvas drawing · `fixtures.js` simulated 33-landmark poses · `tests/body.test.js` node tests.

## What works (verified)
- Recognizer, rock/boat state, space check, rest timer, motion meter, push physics, depth ordering: node tests on **synthetic poses** (see test output).
- Sim mode in headless Chromium (screenshots): clear-space gate, stomp → ripple → rise, shield hiding the simulated body, stepping forward puts the body over the rock, pool + boat, walking/jump ignored, no console errors, no requests off localhost.

## Partial
- **Depth is faked at first and may look rough.** Columns pushed toward a fixed vanishing point (horizon assumed at 38% of frame height); not real 3D, no camera pose. If the phone moves, anchored rocks do not follow (they are pinned to screen coordinates).
- **Real camera + MediaPipe is not tested.** Pose/segmentation code follows the library API but was never run against a real camera or the real model here. Thresholds were set against synthetic fixtures, not real people, so expect tuning (stomp speed, hip drop, wide/low limits). Side-on views make knee angles unreliable.
- Occlusion is per frame with one depth rule (feet row vs rock base row); arms reaching over a rock while the body is behind it will be wrong.
- Boat is a plain box-like hull. Rock look is columns with facet lines.

## Not built
Attunement strings (placeholder line only), hand/finger flow, palms-together charge and clap release, gradebook hookup, sound, multi-person, camera-motion compensation, real depth, any canon decisions. Not wired into `grade.js`; nothing is reported as Observed.
