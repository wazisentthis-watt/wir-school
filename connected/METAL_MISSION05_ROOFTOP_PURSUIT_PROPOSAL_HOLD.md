# WIR Connected Savannah · Mission 05 Rooftop Pursuit

**BRANTACLE 03 / WIR Metal · PROPOSAL / PUBLISH HOLD.** This is a real optional mission in the **existing** `connected/` Three.js game, not a stand-alone HTML replacement and not a published release.

## Provenance and protected base

- Repo: `wazisentthis-watt/wir-school`
- Branch: `feature/metal-mission05-rooftop-pursuit-20261104-hold`
- Immutable branch base: `fad85c02504b2c7167d4e70e41445325a3604aeb` (merged PR #35 Test Yard and PR #34 ReFramer duel).
- Skate / grabs / cause-specific falls: reuses `connected/assets/testyard_skate_adapter.mjs` from PR #35. The existing four-wheel skate, grind/landing, Gallium board forging, movement solver and controller remain authoritative.
- Aerial rooftop combat: selectively imports the **tested** original combat physics core and Three.js arena from [PR #34](https://github.com/wazisentthis-watt/wir-school/pull/34), already merged by an external action during this build, head `f37a493da23f69fa32523cc214e271bdd8f6d86b`. The duel core is not changed. The pilot adapter adds an opt-in physically reached roof entry and hides the earlier training START button.
- **No merge was performed by Mission05 work**; PR #34 had already merged on main before this rebased branch was created. No changes to `metal_story_engine.js`, current rigs/GLBs, original save schema, original powers, controller profiles, publishing settings, or `wir-school/main`.

## Play from a private checkout of this branch

```sh
python3 -m http.server 8765
```

Open `http://localhost:8765/connected/?lite=1&mission05=1` (mobile-friendly Lite) or `http://localhost:8765/connected/?mission05=1` (full graphics). **Do not claim this feature is on the public GitHub Pages site.**

Mission 05 is a separate proposed chapter accessible as an **explicit opt-in preview**, even before the original story chapter 04 is completed. That does **not** advance or rewrite the four existing story chapters.

## Five playable beats

1. **Skatepark pursuit signal:** activate M05 with its on-screen BEGIN button, F10 or a deliberate controller D-pad Up + Y chord. Move to the original Savannah Skatepark.
2. **Authentic board/trick:** forge the original Galaxy Gallium four-wheel board with original B/Forge action (3.3-second assembly). Use the Test Yard flip control `[` or opt-in mobile FLIP button / controller X on-board. The original airborne/landing solver must **catch** a completed kickflip, heelflip, tre flip, pop shove-it or impossible within Skatepark range; mere key presses do not progress.
3. **Real rooftop traversal:** reach the new actual collidable Fight Lot roof approximately 11.8 m above ground. Corner anchors and two intermediate physical ledges allow original wall riding/swinging/flight, not teleportation. Arrive grounded on the roof near its objective beacon.
4. **ReFramer aerial fight:** dissolve the board, return to grounded foot posture and use ENGAGE REFRAMER / F10 / controller D-pad Up + Y. Real 3D ReFramer AI uses PR #34 physical combo, launcher, finite-air pursuit, Galaxy Gallium finisher and **real roof impact** before victory. The existing Phase 6 Metal and rival animation mixers receive authentic available punch/kick/flight/blast/dodge/fall/get-up clips with fallback. Duel-specific keyboard J/K/Space/Q/B or Xbox X/Y/A/RT/LT+RT/B or mobile action controls take over **only during the duel**. Exit safely restores the exact pre-duel position, yaw/pitch, camera, velocity, and original control systems.
5. **Return home:** walk, skate, swing or fly back to Forsyth Commons; ground contact near home completes the mission and stores its completion.

Mission HUD provides distance hints, a world-space objective beacon, progress and a SAVE 05 control. All original shortcuts, abilities, story actors and inventory remain accessible **outside** the bounded duel.

## Checkpoint contract

New separate versioned key: `wir_metal_rooftop_pursuit_v1`, containing only stage, last safe scene position, flip name/score, physical duel results, attempts and completion. No automatic position writes every frame. Saves occur at stage transitions or explicit SAVE 05; saves are strictly validated, bounded, and restored only at mission-opt-in startup. Save corruption fails closed. Existing `wir_metal_story_v1` and Valence profile keys are not written by the Mission05 modules; the **original game** may still legitimately advance chapter 01 when Metal reaches the Skatepark.

## QA and limitations

```sh
node --test connected/tests/metal_mission05_core.test.mjs connected/tests/metal_aerial_duel_core.test.mjs
node --check connected/assets/main.js
node connected/tests/metal_mission05_browser_playwright.mjs
```

The dedicated scoped GitHub Actions workflow runs this plus existing Forge, Test Yard, SkyLab, mission-loading and board/swing checks. Browser QA executes a real first mission, actual Forge and flip landing, real 3D rooftop floor collision, real duel combo/finisher/roof-impact victory, return and checkpoint reload, mobile-size touch, and Xbox-standard Gamepad API chord. **For short and reproducible browser checks only**, GitHub Playwright uses the existing `teleportForTest` hook for long-distance travel between city waypoints. Production/player code **never** teleports; a full uninterrupted manual rooftop traversal and physical controller/iPhone Safari must be signed off separately.

Known limits: custom roof geometry is a proposal, not an authentic Savannah building; ReFramer model is the original available rival rig tinted as a ReFramer prototype, not an approved character GLB; duel uses its own tested physics loop and action mapping only while active; real finger/face/IK visual quality and long-session memory/frame timing still need manual QA. This is one complete proposed mission, not all season 05 canon.

## Publication policy

Trusted `.github/wir-hold-policy.json`: `mode=HOLD`, `allowPublicPublish=false`, `approvedMerges=[]`. **Never merge, auto-merge, mark release-ready or deploy this PR without a separate explicit owner authorization and repaired branch rule enforcement.** Current main was previously merged/published despite HOLD checks; red CI is not an effective branch protection without ruleset.

Rollback: close the unmerged draft PR or discard this scoped feature branch. Default `/connected/` remains unchanged.

## Rebase provenance and baseline warning

The original Mission05 PR #37 was closed **unmerged** when PR #34 was merged into main concurrently, making that first branch conflict with newly merged duel files. This branch was recreated cleanly from `fad85c...`, reuses the exact merged ReFramer source, adds only opt-in `useWorldEntry`/`hideEntry` parameters, and keeps the original `?aerial_duel=1` training route backward compatible. The merged PR #34 had accidentally omitted its earlier `TEST_YARD_SKATE` feature flag while leaving references to it; this branch restores the feature flag (default false) so the merged Test Yard code can initialize safely. Do not infer that live `main` has been repaired; this correction is unmerged and within the new draft only.
