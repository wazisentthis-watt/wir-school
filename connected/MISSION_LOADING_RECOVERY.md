# METAL first-mission loading and recovery · 2026-11-03

**Authority:** WIR Connected code. **Status: PROPOSAL/HOLD** until owner
approves and tests on iPhone. Existing source art, SAVED checkpoints, controls,
boss combat, and existing working models must not be discarded.

## What changed

The first mission still uses its original assets when present. A missing or
stalled file no longer needs to stop the entire mission:

| Asset category | Fallback (when asset is missing or exceeds its deadline) |
| --- | --- |
| Metal Phase 6 model | Original, low-poly humanoid surrogate; no fabricated rig animations |
| Quaternius RobotExpressive | Plain-jointed civilian proxy (no character clips) |
| Four-wheel skateboard | Procedural deck with four physical tan wheels |
| Kenney city buildings | Simple solid, grippable block buildings retaining colliders |
| City vehicles | Static low-poly passenger-car proxy, existing traffic systems continue |
| Rival and crew source | Existing `makeRival` / `makeChar` substitute |

Optional asset deadline: **14 seconds**; mission-critical asset deadline:
**18 seconds** per request. Asset categories load concurrently where possible.
All fallback use is recorded by `window.__bootRecovery.getStatus()` and
`window.__game.bootReport()` after a successful mission load.

### Recovery on broken JavaScript or failed startup

A small classic-script monitor in `connected/assets/boot_recovery.js` runs
*before* the ES module game. It can show a concrete failure stage and
**Retry loading / Retry in Lite Mode / Show error details** buttons even if
`main.js` cannot import or WebGL initialization throws. Retry appends a URL
cache-buster and preserves existing location/query options. It never clears
browser storage or writes a new checkpoint.

A stalled stage gets a visible recovery option after a watchdog limit.
`Lite Mode` keeps the original engine and disables some costly effects;
it does not claim to be a separate simplified final game.

### Saved data and gameplay

Normal storage uses the existing `wir_metal_story_v1` Metal story key and
`wir_valence_profile_v1` profile. Storage failures are caught without blocking
world initialization. Existing checkpoints are read by the original Metal story
engine. The SLOTTA QA query still disables persistent writes and holds background
simulation. Procedural fallback art is not automatically persisted or approved
as replacement canon.

Fallback models have **no skeletal animations**. The player animation selector
checks for a missing `P.cur` clip, and the foot placement system skips absent
foot bones. No claims are made that these placeholders are final rigged assets.

## Automated acceptance

- `connected/tests/mission_asset_recovery.test.mjs`: deterministic asset
  fallback/timeout, recovery gate, save-safety and missing-rig source checks
- `.github/workflows/physics-tests.yml`: full prior physics and SLOTTA tests
  plus the new asset tests
- `.github/workflows/mission-load-qa.yml`: headless Chromium game test that
  validates normal startup, intentionally returns HTTP 404 for five actual
  GLBs, and denies `assets/main.js` once to exercise visible retry to Lite
  Mode. Tests preserve the previously saved story string and emit evidence.
- Existing `.github/workflows/slotta-browser-qa.yml` is preserved, ensuring
  the actual SLOTTA first-boss browser tests remain valid.

## Manual gates before any merge or publishing

1. iPhone Safari: first-mission starts on cellular and Wi-Fi; note cold-load
   duration and failures without assuming network availability
2. Turn on airplane mode after assets have loaded and inspect state/caching
3. Verify the normal rigged Metal is still selected whenever its GLB exists
4. Deny one GLB on a test server; verify the placeholder has collision/controls
5. Test Retry and Lite Mode after a simulated failed JavaScript load
6. Confirm saved checkpoints restore accurately across reloads
7. Bluetooth controller: move, jump, skate, attack, grab, release, and reopen
   the mission after loss of connection
8. Verify at least one SLOTTA encounter completes with proper boss events

**No merge or publish without these review gates.** CI verifies browser behavior
under controlled synthetic faults, not physical-device endurance or final art.
