# METAL Terrain-Aware Skating + Contact Alignment v3

**PROPOSAL / PUBLISH HOLD. November 4, 2026.** This is a stacked follow-up to the Phase 6 planted-foot and paired-throw work on PR #26, which is merged into PR #25's development branch, not the published `main`. Controller PR #23 and its base PR #21 remain separate. No user assets or original GLBs/FBXs overwritten. No deployment or shared game-release authorization.

## Integrated improvements
1. **Sloped physical support on existing kicker ramps.** The four actual rendered skatepark meshes supply finite top-face contact planes, their world-space normals and precise foot positions. `floorAt` chooses a reachable ramp only if the 3D character can step up to it without clipping through from beneath. Rooftop box collisions retain their original vertical-reach and footprint checks. This is not terrain-wide heightmapping or streamed mesh collision.
2. **Board roll and pitch.** On a grounded four-wheel skateboard, its orientation follows the kicker normal with exponential smoothing, retaining player heading. The player still cannot hover or teleport, and airborne/wall/grapple states use the existing physics.
3. **Real original Phase 6 two-leg IK.** Left prosthetic target follows the tilted deck. Right biological foot gets a bounded vertical compensation to make planted pressure strokes reach the actual slope. Swing/recovery legs keep their normal lifted trajectory. Foot orientation, uphill push traction, and whole-body knee limits are still not final motion capture.
4. **Paired enemy hand alignment.** During queued throw wind-up, actual right and left character bone positions (if present) influence the held hostile actor's position. One-hand and missing-bone fallbacks preserve the Gallium hold anchor. Contact movement and actor yaw are bounded each frame, and the actor receives exactly one real combat-body impulse from the existing release marker. No hostile throws of civilians, no extra fake attack physics.

## Opt-in tests
Local review only, after checking out the draft:
```sh
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/connected/?lite=1&metal_next=1&controller_v3=1
node --check connected/assets/main.js
node --test connected/tests/metal_terrain_contact.test.mjs connected/tests/metal_paired_contact.test.mjs
node connected/tests/metal_terrain_contact_browser_playwright.mjs
```
QA-only `metal_terrain_qa=1` exposes a read-only ramp manifest to the automated test; it cannot summon or move objects. The pre-existing automated `teleportForTest` and `metal_motion_qa=1` hooks allow reproducible positioning of the original Metal and a real Ballast actor; they are test-only, not new public gameplay powers. The standard `?lite=1` route remains unchanged.

## Asset intake, visual QA and release gates
- Some older uploaded FBX assets have expired, so exact authored paired FBX retargeting is **not accomplished here**. Re-upload needed before matching real source clips or declaring visual skin accuracy.
- Test real iPhone Safari performance and actual Bluetooth controller: camera-axis calibration, R2 short/hold force, the four original kicker ramps, skate balance, seamless board-back swing, grab/throw, non-hostile release and S1–S4 changes.
- Inspect visually for right-toe clipping, left prosthetic heel alignment, upside-down normals, snapped hips at ramp lips, opponent interpenetration, Ballast landing/get-up, and moving charges.
- Preserve the three story missions, all saved checkpoints, original rigs and PUBLISH HOLD until explicit owner approval.

Source: `metal_terrain_contact.mjs` + `metal_paired_contact.mjs`, guarded integrations in `main.js`, 38 new targeted deterministic source tests (88 total with preceding movement tests) and browser integration checks. This is a technically scoped, reversible milestone. No release, publishing, merge, asset overwrite, or new canonical animation declared.

## Verified browser evidence (November 4, 2026)
- Exact v3 game-branch Chrome test passed: four original ramp meshes discovered; first kicker normal `(0, 0.95024, -0.31152)`; board-up matched that normal; support height `1.18985` world units; one R2 impulse; original Phase 6 leg bones present.
- Ballast followed **two** original S1 hand bones during wind-up, released into `ragdoll-proxy` exactly once; the original story version-1 save and legacy Lite boot remained intact.
- 88/88 unit tests passed; entire scoped browser choreography gate passed; previous first-mission, physics, SLOTTA and hosted-startup workflows passed.
- GitHub Actions evidence: https://github.com/wazisentthis-watt/wir-school/actions/runs/41831315500/artifacts/13321294911
- Original rig materials, animation *visual pixel fidelity*, terrain on other ramps, actual mobile GPU performance, and a physical Bluetooth controller still require hands-on QA.
