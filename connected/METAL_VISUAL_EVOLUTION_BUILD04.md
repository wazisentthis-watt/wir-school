# WIR Connected · Build 04: Visual Evolution
**PROPOSAL / PUBLISH HOLD · Experimental visual layer · No approved 3D model replacement**

## Dependency chain
Native pilot PR #42 → eight missions PR #43 → Beast systems PR #44 → **Build 04**.
Only the original Connected Three.js scene is used. Requires `?savannah_native=1&savannah_beast=1&savannah_visual=1`, with optional `&lite=1`.

## What's playable and visible
- Six real **procedural tubular meshes** follow the six Beast limbs. Black Gallium, violet musical-chord fractures, crystal talons, and selected-limb illumination are generated from Metal's existing animated limb points. This is **not** an approved final six-arm GLB rig, retargeted animation or user-supplied model.
- Tips are constrained using segment-vs-Box3 sweeps against Connected's existing structure collider list. This prevents obvious tendril tips from clipping straight through registered structural boxes; it does **not** add full tentacle inverse kinematics or rigid-body collisions.
- Eight villains receive original distinguishing **prototype armor silhouettes** and in-world markings: Ballast (load plates), Kiln (vents), Glassjaw (shards), Patchwork (coils), Load Shark (fins), Foreman (machinery), Brine Broker (pressure tanks) and Ledger Wraith (glyph panels).
- Three alternate set-dressing groups: **Morrow City** industrial anomalies, **Savannah riverfront** warehouse/pressure systems, **Savannah marsh** vegetation and water. The set dressing is outside the main interaction lanes, intentionally noncolliding and fictional; it is not a claim of precise Savannah geography.
- **Boss introductions** use 3.3 seconds of WIR wind-up / tension / initiation, 3D halo pulses, in-world title ornamentation and a skip button. Original camera remains owned by Connected, without cinematic camera hijacking.
- Actual boss attack checks use the same circle, ring, line or cone volumes shown by the 3D attack telegraph. Movement outside the visible danger area can avoid damage; the previous radius-only rule remains the fallback when Build 04 is off.
- Lite mode reduces mesh segments, radial sides and ambient props.

## Source files
- `connected/assets/metal_visual_rules.mjs`: original, testable pure functions for eight enemy archetypes, hit-volume physics, swept sphere vs AABB, cinematic beats and device budgets.
- `connected/assets/metal_visual_evolution.js`: gated renderer adapter, procedural tentacles, environment and boss decoration, animations and in-world telegraphs.
- `connected/tests/metal_visual_rules.test.mjs`: unit checks for boss profiles, attacks, collisions and performance budgets.
- `connected/tests/metal_visual_browser_qa.mjs`: headless Chromium opt-in test that switches Morrow→riverfront→marsh, checks six 3D limb meshes and keeps existing rig and local storage unchanged.

## Preview
Serve the **full stacked branch** with its original asset files. Open:
```
/connected/?lite=1&savannah_native=1&savannah_beast=1&savannah_visual=1
```
Click **01 Shift Change** to face Ballast, then **07 Riverfront Resonance** and **08 Marshline Signal** to inspect each district, or use the mission picker. The existing METAL controls and advanced Beast controls continue to work.

## Testing and publication rules
- JavaScript syntax and pure unit tests must pass at the exact PR head SHA.
- Full desktop and Lite Chromium startup and shared-model/saves smoke tests required; CI stores a screenshot artifact. Browser/CI simulation does **not** validate an iPhone, physical Xbox/PlayStation controller, or final asset aesthetics.
- Existing Metal story checkpoints and Valence profile must not be reset or migrated. Never change the approved original 3D character rig, lore or WIR governance HOLD by treating procedural art as final canon.
- No merge to main or publish without explicit user authorization and project owner review. Closing/reverting only this draft PR removes the optional visual layer without deleting saves.

## Next art pipeline after approval
Use approved source images to model and rig METAL with correct black facets, lion crown / Afro continuity, six Gallium appendages, protected left prosthetic, and musical cord surface breaks. Author approved villains and districts as separate GLBs. Keep fallback geometry for missing assets and budget mobile loads.
