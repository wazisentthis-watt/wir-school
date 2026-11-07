# METAL Ability Convergence: 73-entry Registry + First Physical District
**November 6, 2026 · PROPOSAL / PUBLISH HOLD**

## Precise status

This milestone does **not** turn all 73 registry entries into implemented, production-grade abilities. It preserves the original owner's 73 named entries under `metal_power_registry_73.mjs` and distinguishes `existing-partial`, `opt-in-lab`, and `design-only`. A prototype action must affect gameplay, have finite costs, and pass reproducible tests before it is described as playable.

The normal `/connected/` entry point, Mission 01 boot, gamepad mappings, existing Gallium swing, skating, 3D rig, SLOTTA and `wir_metal_story_v1` saves are unchanged by this module, unless you intentionally load the local feature branch with **`?lite=1&metal_abilities=1`**. Query flag gating is source-level; GitHub Pages does not publish this branch.

## What is integrated and genuinely interactive

- Five discoverable physical salvage pickups placed in the existing Savannah scene, with tracked identities, distance limits, nonduplicating collection and private progression saves.
- **Pressure Reading:** a timed structural scan attached to the actual repairable support, consuming Focus and respecting cooldown.
- **Structural Reinforcement:** consumes real Gallium reserve and salvage, visibly repairs the support and recomputes the real Three.js Box3 collision.
- **Gallium Construction:** consumes real salvage/Gallium to create a world-space panel with mesh, actual collidable Box3, configurable integrity and bounded number of structures.
- **Material Impact:** damage the created panel; visible geometry and collision change, including debris becoming noncollidable when structurally exhausted.
- **Material Reclamation:** remove the actual panel and return at most 80% of *remaining* material, never full material duplication.
- **Snap Step:** after a four-stage mission, spends Focus and adds a capped, real velocity impulse to the existing movement solver without teleports or a second controller.
- **Mission unlock sequence:** salvage two sources → repair failing support → construct a physical panel → perform Snap Step. Stored under the **separate** `wir_metal_power_lab_v1` key; no rewrites to the story checkpoint key.
- A collapsible mobile-friendly on-screen lab and list of all 73 entries with transparent status labels. Not 73 fake hotkeys, and no involuntary overlay in normal gameplay.

## Actual scope restrictions

Only a few basic abilities are newly playable in this **opt-in lab**. Other existing partial powers such as board forging, swing, charged blast and form-switch experiments are already in Savannah's engine, but full Gorillium/Lion Metal/RIFFT transformation, chemistry, remote world deformation, complete NPC/traffic reactions, 73 independent playable techniques, and true citywide persistence are **NOT implemented by this PR**.

This lab initially makes *one* support and up to eight user panels deformable. It does not change building geometry/traffic, and an AABB wall is **not** a skateable inclined ramp. The existing shared world collision list and Gallium reserve are reused. It does not rewrite the main physics solver.

## Reproduction

1. Check out the feature branch and serve the repository root on HTTP, for example `python3 -m http.server 8765`.
2. Start the unmodified baseline at `http://127.0.0.1:8765/connected/?lite=1`; confirm Mission 01 appears and the power lab does not exist.
3. Open `http://127.0.0.1:8765/connected/?lite=1&metal_abilities=1`; use **METAL ABILITY LAB** at top right. Walk/skate to the visible silver salvage pickups.
4. Pick up two sources, stand by the damaged column to reinforce it, create a panel in clear space, then perform Snap Step when grounded.
5. Damage/reclaim a panel. Reload the page and verify mission knowledge, destroyed panels, salvage IDs and available material are handled consistently without changing `wir_metal_story_v1`.

## Tests and acceptance

- `node --test connected/tests/metal_power_lab_core.test.mjs`: 73 source names, strict costs, progression, persistence and negative data.
- `node connected/tests/metal_power_lab_browser_playwright.mjs`: real local source through Chromium desktop + mobile touch emulation, including the baseline, first mission, Gallium accounting and save isolation.
- `node --check connected/assets/main.js` and new modules. Existing physics, first-mission and controller regressions must pass at exact PR head.
- **Real iPhone Safari and real Bluetooth controller remain unverified until owner-device QA.**
- **Do not merge or deploy:** trusted `.github/wir-hold-policy.json` has `mode:"HOLD"` and `allowPublicPublish:false`. Its explicit, protected-base authorization gate must be respected. Owner's high-level wish for all abilities does not provide an exact SHA-reviewed release.

## Next genuine integration stages

1. Rig-correct Gorillium from the recovered original GLB and authentic clips, with actual enemy hitboxes.
2. Gallium ramps with actual rollable surfaces, rail load paths and tested skating collision.
3. Shield, grappling and electrical conductors tied to enemy actions instead of visual-only effects.
4. Save adapters for persistent city structures, citizens/traffic, material economy, unlock rewards and reliable first-mission replay.
5. Approved user-driven release after production checks and specific governance authorization, with rollback to the known-good main SHA.

Source-of-truth: the owner's uploaded `METAL IN DA RIFFT: Complete Power Registry`, not an invented 73-button action sheet. All canon changes remain proposals until owner-approved.
