# PROPOSAL · S☀️L SkateFuL · Sun Yard V0.1 (private test build)
Not WIR canon, not published, not hosted. Separate from RIFFT until Coach rules.

three.js r160 (vendored, MIT, `vendor/LICENSE`); rails use its `Line3` closest-point math. Touch controls (`touch.js`) are our own Pointer Events code, no library. No other third-party code or assets: all art and sound are made in code, so no CC0 packs are used yet.

## Locked build order (CENTER)
1. Skater + momentum ✅ (2026-10-15)
2. Bowl + halfpipe ✅ (2026-10-20)
3. Wallride + rails ✅ (walls 2026-10-21, rails 2026-10-22)
4. Momentum ✅ (2026-10-23) · 5. SOL Energy meter · 6. Sunline creation · 7. Rooftop gap · 8. Trick replay camera (last)

## Run locally
`python3 -m http.server 8797 --bind 127.0.0.1` in this folder, open `index.html`. Tests: see `TEST.md`.

## v0.2 visual pass (2026-10-20, PROPOSAL)
Visual only; physics `step()`, controls and locked spec untouched. All art is procedural/generated in `game.js` (no downloaded assets):
procedural low-poly skater rig + board (push / carve / vert / air / grab / grind poses, board flips per trick), sunset shader sky with sun, golden directional light + PCF soft shadows, warm fog, canvas-generated concrete/tile textures, steel coping and rail, instanced skyline (46 buildings), 28 instanced palms, ledges, SOL glow trail (additive ribbon), landing/grind particles, WebAudio-generated ambience + roll/grind/pop/land SFX (starts on first key/click), restyled HUD (PROPOSAL label kept).
Draw calls 34 (budget 100). Pixel ratio cap 2 kept. Screenshots: shots_v2_bowl.png, shots_v2_halfpipe_air.png, shots_v2_wide.png, shots_v2_grind.png.

## Item 3a: real walls + wallride/wallie (2026-10-21, PROPOSAL)
- One `WALLS` array (axis-aligned boxes) now drives both the instanced ledge mesh and the physics. The ±30 m clamp is gone; the yard edge, the 4 inner ledges and 2 new rideable walls (2.4 m tall, 10 m long, sun-orange, at x = ±27, z 3–13) are all solid. Same draw calls (one instanced mesh).
- New `Wallride` state. Entry from Air onto a rideable wall: X held, or pressed up to 0.3 s before contact (THPS-style buffer); horizontal speed > 4 m/s; 15–60° from parallel. Otherwise you bounce off.
- On the wall: gravity × 0.3, speed decays 1.5 m/s², max 1.2 s, then you drop off. B dismounts. RS up = wallie: up = 3 + 4·(1 − t/1.2)·sin(angle), along-wall speed × cos(angle), 1.5 m/s push off. Steeper entry pops higher and shorter, shallow goes lower and farther.
- Numbers are PROPOSAL from research/3D_2026-10-21.md (THPS1+2 wallride rules), tune by play.
- Testing: `./test/run.sh` serves this folder on 127.0.0.1:8797 itself, links puppeteer-core from /workspace/game_studio/tools, runs test.mjs, then frees the port. 21/21 gates. Screenshot: screenshot_wallride.png.
- Item 3 part 2 (RAILS[] + wallride-to-rail link) done 2026-10-22, see below.

## Item 3b: RAILS[] + touch v0 (2026-10-22, PROPOSAL)
- **Rails are data now.** `RAILS` is a list of polylines, `[x,y,z]` points each. Every straight piece is its own segment (`SEGS`), so a kink counts as a new rail (the THPS rule). One InstancedMesh draws every rail bar and one draws every post, the same 2 draw calls the single rail used.
- **4 rails:** the deck rail (the original, x −6..6 at z 14, now RAILS[0]); a **down rail** that runs diagonally and slopes from 1.2 m to 0.4 m; a **kink rail** (3 points, 2 segments); and a **wall link rail** (sloped, 1.3 m to 0.7 m) that runs off the end of the +x rideable wall.
- **Snap:** three.js `Line3.closestPointToPointParameter`, then horizontal distance ≤ `GRIND_SNAP` (0.5 m) to land on a rail from the air, or ≤ 1.5 m with X from the ground. It won't lock more than 45° off the rail's direction (`GRIND.angleTol`). All the numbers live in one `GRIND` config, so an easy/hard setting is free later.
- **Grind follows the rail** whichever way you ride it. Gravity works along the slope (downhill speeds up, uphill slows to a "too slow" exit), with 0.6 m/s² friction, and the skater pitches with the rail.
- **Balance bar:** a big DOM bar (no draw calls) under the skater, shown only while grinding; it turns red past 70%. Going over a kink, or landing a new rail within 1 s of leaving the last one, **recentres balance by 50%**. The same-rail penalty is off (ALT_IDEAS).
- **Side pop:** while grinding, RS left/right (or a touch swipe) pops off to that side of travel (4.0 m/s up + 2.0 m/s sideways). RS up is still the straight pop.
- **Wallride → rail:** while wallriding, hold or tap X with a rail within 1.0 m of the wall line (and −0.6..+1.2 m in height) running the same way, and you transfer onto it. No X means a normal wallride.
- **Touch v0 (`touch.js`):** it turns on with a coarse pointer, `maxTouchPoints > 0`, or `?touch=1`, and feeds the same input object as pad and keys. Left half: a floating stick (x = steer, up = push, down = brake/pump, dead zone 0.15). Right half: tap = pop, swipe of 40 px or more within 150 ms = right-stick flick (flip in the air, side pop on a rail). Buttons: X, GRAB, A, B. `touch-action: none` is set on the page, canvas and overlay, and the touch UI is DOM, so it adds no draw calls.
- Tests: `./test/run.sh` passes **39/39 gates** (was 21) with 0 console errors, 0 off-device requests and 29–34 draw calls. Screenshots: `screenshot_rails.png` (grinding the sloped rail with the balance bar) and `screenshot_touch.png` (844×390 phone view, stick + buttons).
- Numbers are PROPOSAL from research/3D_2026-10-21.md and 3D_2026-10-22.md. Tune them by playing.

## Item 4: momentum (2026-10-23, PROPOSAL)
- **Timed pump (Skate 3 style).** Hold LT (S key, or pull the touch stick down) while dropping into a transition to crouch and charge (the HUD shows a 5-pip PUMP meter). Release once you're climbing the other side to cash it in: up to +3.0 m/s × charge. Grades by the slope you release on: PERFECT 0.2–1.6 (full), OK (60%), LATE near vert (30%). Releasing while still going downhill, with no charge, or on the flat deck gives nothing, and holding LT forever gives nothing. LT on flat still brakes. All numbers are in one `PUMP` config.
- **Clean-landing bump (THPS style).** Landing after at least 0.35 s of air adds +0.4 m/s, or +1.0 m/s with a trick. A bail or a tiny hop adds nothing, and `MAX_SPEED` (25 m/s, ~56 mph) is never exceeded. Config: `LAND`.
- **Speed camera.** FOV goes from 65° up to +12° with speed (phone/touch cap +7°), follow distance from 7 m to 9 m, and each graded pump kicks the FOV a little. It only calls `updateProjectionMatrix()` when the FOV moves. `?speedcam=0` or the V key turns it off. Config: `SPEEDCAM`.
- The old "hold LT and gain speed while dropping in" pump is gone; the tests now pump like a player (hold in, let go climbing out) via `__sy.pumpRun`.
- Tests: `./test/run.sh` passes **52/52 gates** (was 39), 0 console errors, 0 off-device requests, 29–34 draw calls. Timed pumping peaks at 32.7 mph in 20 s vs 7.8 mph for both no input and hold-only. Over 90 s it tops out at 43.3 mph, under the 55.9 mph cap. Screenshot: `screenshot_momentum.png` (24.2 mph right after a PERFECT pump, FOV 73°).
- Known (pre-existing): the chase cam has no collision, so deep in the bowl it can sit below the deck lip. Logged in the backlog.
