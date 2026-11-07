# WIR Connected Savannah 3D ⇄ Morrow Systems Lab v0.1 handoff

**Date:** 2026-11-06 • **PROPOSAL / PUBLISH HOLD** • **No production/gameplay modification.**

## Source of truth for this new prototype
WIR Studio Brantacle 03 now holds the new, hash-verified source candidate:
[METAL Morrow Systems Lab v0.1](https://github.com/wazisentthis-watt/wir-100-studio/tree/import/metal-morrow-systems-v01-20261106/projects/metal/experiments/morrow-systems-v01).

Its 3D Test Yard, offline mission trainer, original two Test Yard files, `src/metal_world_core.cjs` and `src/morrow_3d_bridge.js` are **separate development artifacts**, not new mainline Connected gameplay. The material and mission core is **one state machine** with finite Gallium, ramp/rail/brace construction, world-location pickups, ReFramer tether, rescue/repair unlocks, unique `wir.metal.morrow.systemslab.v01` save key, plus 12 passing deterministic Node tests in the source archive.

## Existing Connected integration surfaces to preserve
- `connected/assets/main.js` and its real board, first mission, physics clock, controllers, touch, combat and save flow.
- `connected/assets/testyard_skate_adapter.mjs` (prior opt-in Test Yard tricks).
- `connected/assets/testyard_session_score.mjs` / `connected/TESTYARD_SKATE_RUN_V02_HOLD.md` (existing skate scoring work).
- `connected/assets/gallium_glob_core.mjs`, `connected/assets/gallium_grip_core.js`, `connected/assets/gallium_limb.js`.
- Original `mty-*` Test Yard and Connected checkpoint save keys. No silent migration, overwrite, auto-import or new default control mappings.

## Safe future integration plan
1. Compare deterministic core save schema with Connected's current save and world entity registries; adapter-only mapping behind `?morrow_lab=1`. Default off.
2. Map ramp/rail construction to the **authoritative Connected collision system** rather than copying Test Yard's `ELS` height solver into Savannah.
3. Reuse original GAL LIUM ledgers or reconcile costs; never create two independent material inventories.
4. Add a contained district block with pickups, ReFramer prototype, civilian, wall, Gallium ramp and rail, all behind the opt-in.
5. Test first mission startup, frame time, keyboard, touch, gamepad, controller disconnect/reconnect, save isolation, and fall/rail contact. Real iPhone/Bluetooth device remains open until physical QA.
6. Draft scoped feature PR with rollback; only the owner may approve merging/publishing.

## Current status
- **Studio source:** committed in an intake branch, awaiting draft review. Original files hash-matched and preserved.
- **Deterministic core:** 12/12 original tests independently rerun successfully locally. 
- **3D test:** embedded GLB preserved, JS syntax originally checked, but full Three.js WebGL playthrough and actual first mission integration NOT verified.
- **Connected production:** unchanged by this handoff. No new input interception, physics solver or save writes.
- **Release:** PUBLISH HOLD.

GitHub branches are not canonical releases. Do not report a source import as a working live city without a tested integration/merge.
