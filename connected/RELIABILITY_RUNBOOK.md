# WIR Connected: 3D Mission Loading Reliability Runbook

**Scope:** existing `/connected/` game in `wazisentthis-watt/wir-school`. No overhaul, no save resets, no changes to other WIR games. User authorized repairing the live Connected startup on November 3, 2026. Do not treat that as blanket authorization for future game releases or changes to WIR canon.

## What was reproducible

- Previous fatal main.js errors in PR #15: duplicate frame-loop declaration, orphaned startup function, and shadowed Morrow state. These were fixed and merged before this runbook.
- PR #16 baseline head successfully started `01 · Metal Awakens` in hosted desktop Chromium and simulated touch/mobile Chromium. Existing failed loading on the owner's actual device was **not reproducible** on those browsers.
- Stale entry-script caches, weaker mobile GPU hardware, and stalled downloads are *risks*, not verified causes on the owner's device. Never report them as proven until device/browser evidence exists.

## Reliability improvements

1. **Cache boundary:** index.html pins all four startup entry scripts to one release revision, allowing a fresh set after repairs. On subsequent releases, update the revision string and run `live_loader_contract.test.mjs`. This does not defeat all caching of transitively imported modules.
2. **Safe escape hatch:** immediately visible Lite link before JavaScript, plus Retry/Lite buttons. Boot recovery exposes them after 18 seconds even without a fatal error, and flags prolonged stalls with the actual loading stage.
3. **Lite memory budget:** smaller surrounding city while retaining all 7 named special lots, four rather than thirteen city model masters, fewer decorative trees, flat backdrop instead of full HDR environment, and no post-processing render targets. Normal/full mode remains unchanged. Model failures still use the existing bounded procedural fallback adapter.
4. **Regression gates:** Node syntax + loading contracts, actual normal first mission and five missing-model injections, failed main-module + checkpoint-preserving Lite retry, hosted full desktop and simulated mobile Chromium. Tests are run for branch review and post-merge live status.
5. **Ongoing detection:** hosted workflow runs daily and is manually dispatchable; workflow failure is visible in GitHub Actions, and troubleshooting evidence is attached for seven days.

## Go / No-Go criteria

- Merge only after all required gameplay, syntax, physics and browser QA checks for the *exact proposed head SHA* have passed. The policy's governance HOLD failure is a separate authorization signal, not a gameplay pass.
- Confirm owner-approved, narrowly scoped publishing and record exact SHA, PR, user approval and deployment evidence. Do not relax governance for unrelated code.
- Confirm GitHub Pages has deployed the expected new main commit; check live page HTML for the new script revision, verify HTTP 200/MIME and re-run *hosted* Chromium.
- Confirm first mission title, render canvas, checkpoint byte preservation, no page errors and recovery from a broken GLB. Test physical iPhone Safari and actual Bluetooth controller separately: emulator success is **not** hardware validation.

## Troubleshooting when loading fails on a real device

- If the page is blank, open the direct `/connected/?lite=1&retry=<timestamp>` link, not a downloaded `.html` file.
- If the loading screen persists, use **Having trouble? Start Lite Mode** or **Retry in Lite Mode** after recovery controls appear. These operations do not erase `localStorage`.
- Tap **Show error details**. Capture the displayed loading stage and first error. Do not collect user tokens, secret keys, user saves or personal data.
- For iPhone Safari: check available device RAM/GPU, WebGL support, Safari site data/caching, network restrictions and private mode, but do not clear the user's saved game data without a backup.
- Reproduce failed dependency, WebGL render, script/network, and cache mix individually with the existing fault injection tests. Label any unsupported explanation `UNKNOWN`.

## Rollback

- Record the pre-release main commit and repair commit. If the deployed release regresses, create a tightly scoped revert PR from the previous known-good main and run the same checks before restoring. Never replace or delete saves.
- Do not merge unapproved playable branches, 3D meshes, form art, or experimental canon while repairing startup.
