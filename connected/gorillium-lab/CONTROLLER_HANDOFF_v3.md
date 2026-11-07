# Gorillium Controller Edition v3 | Isolated handoff

**PROPOSAL / PUBLISH HOLD.** This branch does not change `connected/assets/main.js`, live controls, user save state, the mission loader or production GLBs.

## User intent and honest hardware status

The owner requests a perfect match to their existing Bluetooth controller. No verified brand/model or browser-reported Gamepad ID has been supplied. Do not pretend this is tested on their actual hardware. Instead the standalone v3 HTML implements a local controller calibration overlay and exact runtime Gamepad ID readout.

## Available controller source

`controller_core.mjs` provides a browser-compatible pure Gamepad API input adapter:
- Xbox/PlayStation/Switch/Backbone/Kishi/GameSir/8BitDo-family name hints (never claim certainty without an ID);
- radial dead zones (move .18, look .14), frame-rate-independent smoothing, configurable axes and invert flags;
- 14 mappable actions with debounce, trigger analog thresholds and hot-plug reset;
- per-device versioned storage keys, no player-save migration, no network or tracking;
- action suppression during remapping, so calibration input never casts a combat move;
- robust fallback to keyboard/touch on disconnect.

**Default standard-layout positions:** left stick move, right stick camera; button 0 jump, 1 dash, 2 Roar, 3 Groundbreaker, 4 Grapple, 5 Tentacle Strike, 6 hold Glide, 7 hold Sprint, 8 Tentacle Mode, 9 Pause, 12 Cataclysm, 13 Rage, 14 Foot IK, 15 Tentacle IK. Physical button labels vary by controller.

## Tested and blocked

- Standalone v3 package, generated using the owner's unmodified `METAL_GORILLIUM_ABILITY_SHOWCASE_v2.glb`: GLB SHA-256 `8495a8c5e727bf64244a1235e58fb655c4c4cae91ac46e18206e668ae154cd81`, 70 skinned joints, 31 clips.
- Local Node input tests: 21 passed; prior movement tests: 21 passed. Synthetic Chromium controller input/UI with mocked WebGL2: passed. No real controller or iPhone Safari hardware test.
- GitHub controller module subset is gated by `gorillium_controller_core.test.mjs` in the existing isolated Gorillium preview QA workflow. It intentionally does **not** patch live animation frame / keyboard handlers before visual/performance review.

## Next acceptance to make WIR Connected use v3

1. Ask owner for their controller's browser-reported Gamepad ID or photograph/model, then lock exact physical button labels.
2. Import the controller adapter into WIR Connected under an *opt-in* `?controller_v3=1` test flag. Do not replace the already-working `main.js` input path by default.
3. Confirm existing board tricks, S1–S4 switching, 3 mission loads, local saves, mobile touch and Bluetooth reconnect.
4. Run visual WebGL browser QA, then real iPhone Safari paired-controller QA; keep fallback / Lite Mode.
5. Only after explicit approval discuss activation/merge.

Status remains **PROPOSAL / PUBLISH HOLD**, regardless of earlier unrelated PR merges.
