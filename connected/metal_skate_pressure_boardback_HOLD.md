# WIR Metal: board-back swing, skating pressure and foe interactions

**November 3, 2026. PROPOSAL / PUBLISH HOLD.** Scoped against the live game's `connected/assets/main.js`, preserving all original playable assets, save keys, quests and default controller mappings.

## This draft's implemented change
- `startSwing` no longer forcibly sets `st.board=true`. The player may swing while the four-wheel board stays carried.
- Carried-board placement now follows the actual chest/spine/root world rotation during a rope swing. It works on non-S1 forms that lack `P.legs`.
- Rope physics, real anchors, Gallium cost, existing swing animation, state restoration and mission boot were intentionally untouched.
- Seven source-contract tests prevent reintroducing the forced board equip and check the non-S1 mount fallback.

**Do not declare gameplay / visual QA complete until the real GLB, swing pose, torso orientation and board clipping are checked in Chromium plus iPhone Safari and a real controller.**

## Pressure-based skating candidate, NOT live-integrated
The user's uploaded `METAL Test Yard 3D.html` currently adds a continuous `+7.2*dt` velocity while W/RT remains held; WIR Connected's `riffStep()` adds a fixed 36-unit/s velocity burst. Both feel more like gas pedals than pressurized, planted foot strokes.

The independently built `METAL_TEST_YARD_PRESSURE_SKATE_v1_PROPOSAL_HOLD.html` and `metal_pressure_r2.mjs` prototype a mass- and impulse-based input: short R2/RT release = one push, hold >=0.40s then release = a cooled-down RIFFT step, natural coast/drag in the original yard. 13 deterministic source tests pass; full browser rendering was unavailable in this runtime. The on-foot form is unit-tested in the pure mechanic but is **not** wired to the board-only Yard.

For future real-game integration use explicit priorities:
1. L2+R2 = KODA/valence charge (existing mechanics).
2. L1+R2 = throw held world object (existing mechanics).
3. R2 alone while board-equipped = pressure push / charge on release.
4. R2 alone on foot = pressurized ground step (must have actual support/anchor).
Never queue two actions for one trigger event. Do not drop the present LT/RT crown logic.

## Actual Xbox-style controller layout recovered from the owner
A bottom, B right, X left, Y top, D-pad, two sticks, L1/L2/R1/R2; no L3/R3. Brand and Gamepad API ID remain unverified. Keep a browser-detectable calibration page. The separate Controller v3.1 standalone prototype adds a right-stick neutral gate to prevent cameras spinning when the browser maps a trigger as the look axis; it has 24 Node controller tests, 21 movement tests and a synthetic-controller Chromium smoke pass. Physical Bluetooth hardware remains untested.

## Next staged tasks
1. Test this carried-board swing branch with S1 and S2/S3/S4 actual GLBs, board alignment, hand anchor and collision.
2. Port discrete foot-push and R2 delayed RIFFT release behind a feature flag, preserving Gallium finite-matter resource accounting and all world-grip chords.
3. Add grab attach/drag/throw/catch/landing paired animation clips and physical impulses to enemy bodies; support rescue outcomes for civilians.
4. Introduce charge-up crump/two-chest-slap rhythmic movement and environment consequence states.
5. Spawn canon-grounded Ballast, Slipline, Glassjaw and Framekeeper prototypes before larger enemy swarms. Reframers in existing live source are only a training placeholder until canon evidence is reconciled.
6. Stream real city chunks and collision proxies on mobile. Gaussian splats are optional visual scenery, not a substitute for collision geometry.

No merged or published changes. Rollback: close this draft PR.
