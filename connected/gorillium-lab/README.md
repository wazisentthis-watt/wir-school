# Gorillium Original-Rig Preview Lab

**Status:** PROPOSAL / PUBLISH HOLD. This is an isolated, review-only lab under `connected/gorillium-lab/`. The live game's `connected/index.html`, `connected/assets/main.js`, loading recovery, canon and user saves are unchanged by this milestone.

## What is now working

- A self-contained Three.js viewer loading the exact existing GLB from the repository, or an original GLB selected directly from a device.
- Source checks: SHA-256, binary GLB 2.0 header/JSON validation, mesh/skin counts, skinned joint indices, available animation clips, and possible tentacle-name hints.
- Rig inspection uses existing `assets/rig_diagnostics.js`.
- Eight *actual* skinned joints must be explicitly mapped and individually distinct. The game-ability core then drives an experimental Tentacle Lash pose on one joint and Galaxy Tether poses on two joints. Poses restore neutral quaternions and the visual events make no hit/damage claims.
- Browser upload is local-only and does not transfer models to a server. Selecting an artifact does not grant provenance or canon approval.
- The existing Metal S1 model can be inspected for compatibility, but **cannot be cast as Gorillium when loaded via the built-in comparison action**.

## Measured existing model intake

GitHub Actions [rig QA 41759974770](https://github.com/wazisentthis-watt/wir-school/actions/runs/41759974770) ran actual repository GLB parser + Chromium GLTFLoader:
- `connected/assets/models/metal/metal_phase6_fight.glb`: **916,948 bytes**, SHA-256 `158ae049b7fc440d31cc4faeb4672cb7d98aa37949a9911e4bfe28db0adca548`, 63 nodes, 17 meshes, 10 skins, 22 unique joints, **60 embedded clips**, zero identifiable tentacle nodes.
- `connected/assets/models/metal/forms/metal_S3_PROPOSAL.glb`: **1,282,968 bytes**, SHA-256 `56bd6dca3187412330420351cf7f9b0179097f190ce972c88ccf1dc93b327bfb`, 23 nodes, 2 meshes, 2 skins, 20 unique joints, **10 embedded clips**, zero identifiable tentacle nodes.
- These are existing Metal sources, **not verified Gorillium**. The user's independently referenced `METAL_GORILLIUM_ABILITY_SHOWCASE_v2.glb` and variant files (reportedly 31 clips) were not found in connected Drive, Dropbox or indexed Library searches; do not claim those files were read, hashed or imported.

## Browser evidence

QA of Metal S1 **as a test fixture only**:
- Loads real S1 GLB in Chromium and reports 22 skinned joints and 60 clips; built-in comparison path remains unable to cast Gorillium.
- Loading the same S1 bytes through the *local-file upload plumbing* binds eight distinct real bones for code-path testing; Tentacle Lash changed their actual quaternion with observed `poseDeltaRadians=0.0970`, then restored `poseDeltaRadians=0`.
- Existing save sentinel `wir_metal_story_v1` unchanged, no browser exceptions.
- **17/17 Node tests pass** across the GLB intake and ability core. No real Gorillium model, actual tentacle anatomical validation or physical iPhone/Bluetooth test has yet occurred.
- CI screenshot and JSON evidence are kept in the GitHub Actions artifact for seven days.

## Preview and tests

Serve the repo root over HTTP (not file://):

```sh
python3 -m http.server 8765 --bind 127.0.0.1
# Open http://127.0.0.1:8765/connected/gorillium-lab/
```

Click **Inspect existing Metal S1** for a comparison. To inspect the authentic Gorillium model when recovered, select its original .glb with the local file picker, review the SHA and skeleton, select eight actual tentacle joints, click Validate, then exercise Lash/Tether. Do not treat manual selections as rig provenance proof.

```sh
node --test connected/tests/gorillium_ability_core.test.mjs connected/tests/gorillium_glb_intake.test.mjs
node connected/gorillium-lab/glb_intake.mjs connected/assets/models/metal/metal_phase6_fight.glb
node connected/tests/gorillium_lab_browser_playwright.mjs
```

## Next milestone and stop conditions

1. Recover authentic Gorillium source binary and original FBX clips in a readable source store; record source link, exact SHA-256 and rights. The current exact files are missing, so **rig-specific Gorillium animation remains blocked**.
2. Run this inspector on that original GLB and confirm eight independently controllable, properly skinned tentacle chains; source hints are not proof.
3. Connect existing authentic rig's animation events to the six core abilities, with collision/hit confirmation, safe resets and optional audio/VFX in isolated feature-flagged preview.
4. Run mobile Safari and real controller QA after automated Chromium checks.
5. Only after review and separate owner approval consider updating the live WIR Connected build.

**Rollback:** close/discard this draft branch; no live-game or save migration.


## Follow-up · authentic original animation bridge (November 3, 2026)

The reviewed original Gorillium source intake manifest `rig_intake_manifest_v2.json` identifies a 2,298,460-byte user-uploaded GLB (SHA-256 `8495a8c5e727bf64244a1235e58fb655c4c4cae91ac46e18206e668ae154cd81`), 70 skinned joints, 31 named clips and eight distinct chains of five tentacle joints. This binary was inspected from a user upload in a prior branch; the binary itself **is not stored in the public GitHub repository** and is not automatically available to the deployed site. This milestone does not import or redistribute it.

- Added `authentic_clip_bridge.mjs` with a fail-closed check for the exact SHA, 31 named animations, 70 skinned joint names, and all 40 original tentacle joint names. Structural matching is useful technical evidence, **not proof of ownership or approved canon**.
- The isolated preview now maps six existing gameplay action events to these original clip names: `Gallium_Whip`, `Ability_21_Galactic_Tether`, `Ability_13_Octo_Shield`, `Ability_22_Crystal_Barrage`, `Ability_20_Pressure_Reactor`, and `Ability_24_Galaxy_Gallium_Cataclysm`.
- Exact-source preview selects the eight original terminal tentacle joints automatically. A different source can still be manually tested for **Lash and Tether compatibility poses only**; it cannot unlock the full six original animations.
- Buttons and keyboard keys 1–6 invoke original clips only after the source check, rig binding and existing charge/cooldown checks pass. All animation cues are visual previews. No real damage, collision confirmation, live-game mutation or save writes.
- After playing a one-shot original ability, the adapter returns to the original `Idle_Gallium_Breath` clip. A queued new move will not overwrite a running preview action.

### Limits and acceptance

Because the original binary is not in the repository, CI checks the **contract** with synthetic metadata and verifies **the rejection path** against real Metal S1 geometry. It **does not demonstrate** the original user-uploaded Gorillium visually executing its 31 clips. That will require reselecting the original GLB in the lab and recording browser video QA, then testing iOS Safari and Bluetooth hardware separately.

Commands: `node --test connected/tests/gorillium_authentic_clip_bridge.test.mjs`; `node connected/tests/gorillium_lab_browser_playwright.mjs` from the repo's HTTP test server with Playwright installed.

**PROPOSAL / PUBLISH HOLD** continues for this new bridge. Live `connected/index.html`, `connected/assets/main.js`, checkpoint saves and existing Metal builds are unchanged.
