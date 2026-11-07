# METAL · Test Yard skating and fall integration into WIR Connected Savannah

**Source repository:** wazisentthis-watt/wir-school
**Scope:** existing /connected/ Three.js game, not a replacement build
**Status:** PROPOSAL / PUBLISH HOLD · NO MERGE / NO DEPLOY / NO CANON PROMOTION

## Source integrity
- Original user upload: METAL Test Yard 3D.html, SHA-256 91948dbf15c724445e3ef8f94aba3e0ca71d5676cb248ae011b8867be12f856c (2,040,297 bytes).
- Prior stand-alone Savannah skate/fight candidate: METAL_WIR_CONNECTED_SAVANNAH_SKATE_COMBAT_V01_PROPOSAL_HOLD.html, SHA-256 2e2609aac779ef0a545195748bac340183338f930562758ceb5bda6e2c53400b.
- The imported **mechanics are selectively adapted**, not an unreviewed copying of the Test Yard scene or binary model. The existing Connected Phase 6 rig, GLB animations, four-wheel board, motion/physics root, missions, Gallium, lives, powers and saves remain unchanged. No new art/FBX files committed.
- Original destination base main commit: e0004f2c75e72952dac6c7c143c6602c6d6c24b4.

## In actual game, feature flag is mandatory
From a LOCAL checkout of this branch, run:
  python3 -m http.server 8765
Open:
  http://localhost:8765/connected/?lite=1&skate_yard=1
or full quality:
  http://localhost:8765/connected/?skate_yard=1

**Do not claim the GitHub Pages URL has this feature until an approved merge, deploy SHA check and browser QA.** The existing live site on main is unchanged.

## Test Yard features now wired into Connected

- On an actual board, directional kickflip, heelflip, tre flip, pop shove-it and impossible. A dedicated flip input uses Connected's EXISTING ollie impulse (no separate physics loop); completed tricks only award combo on an actual original landing.
- Indy, Melon, Stalefish, Nosegrab and Tailgrab use the existing airborne state and held input. Finishing a grab or a flip can add to the already existing pending skate combo.
- Crooked, 5-0, Nosegrind, Smith and 50-50 *style labels* appear when Connected's original rail-contact resolver reports a grind. These are NOT claimed as a complete new physical rail-snapping solver.
- Manual balance has an alternate deterministic tuning path while opt-in; the existing manual state, speed limit, velocity and failure logic remain authoritative.
- Eight cause-specific fall animation profiles and timed recoveries select ORIGINAL Phase 6 clips where present (slam/slide/bail/dodge, stand/step), otherwise the original animation fallback. These overlays never replace movement/physics root or teleport Metal.
- Existing on-foot fight damage/hit logic remains untouched; opt-in tries original Phase 6 punch/kick/charge-era clips as VISUALS ONLY, with legacy animation fallback.

## Controls
- Classic board controls unchanged: W/stick push and steer; Shift pump; Space/A ollie; B board; powers still use their existing controls.
- In opt-in mode while riding: **[** or controller **X** begins a directional flip (auto-ollie on ground); **]** or controller **Y (held)** grabs in the air; **'** or MANUAL touch button supports manual balancing with speed >2.25 m/s. The game adds FLIP, GRAB and MANUAL touch controls only under the flag.
- Controller X/Y retain their existing fighting actions while on foot. L2/R2/L1/R1 remain with Connected's original charge/Rifft/grab/swing mapping; no L3 or R3 required.
- The direction from movement stick determines which flip/grab style is selected; old mobile movement and controller fallback stay active.

## Test evidence, safety and known limits
New tests:
  node --test connected/tests/testyard_skate_adapter.test.mjs
Syntax:
  node --check connected/assets/main.js
  node --check connected/assets/testyard_skate_adapter.mjs

Branch source has passed read-only V8 script parsing, exact source-hook inspection, and deterministic manual evaluations of flip, grab, and fall classifications. **Not yet a certified real-game browser pass**. Browser smoke must check original first mission (`01 · Metal Awakens`), normal and Lite, boot recovery, existing saves, flight, swing, B board/dissolve and foot fighting. Verify real Xbox Bluetooth and iPhone Safari on hardware independently. Never claim hardware success based on Chromium simulation.

Known limits: the Test Yard's complete 240 Hz standalone park physics and its 2 MB embedded binary GLB were **not copied into Connected**; the established Connected v7-style skate engine continues to own all physical movement. Exact animation retarget/finger contact and native collision response need visual device tests before publishing.

## Rollback
Close this draft PR without merge. New adapter module, test and documentation are additive. Main.js edits are conditional on skate_yard=1, except the new static module import, which is included in this same scoped branch; default behavior is tested for compatibility. Existing `main` and GitHub Pages stay on previous code. No save schema migration, publish change, or original game source replacement.
