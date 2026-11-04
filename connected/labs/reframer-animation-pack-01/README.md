# WIR ReFramer Animation Pack 01 | source-backed status
**PROPOSAL / PUBLISH HOLD · STACKED DRAFT ON PR #34. NEVER MERGE OR DEPLOY WITHOUT OWNER APPROVAL.**

## Verified actual rig and gameplay constraints
On Nov 4, 2026, locally served Chromium loaded the original `connected/assets/models/rival_sparring_hero.glb` from WIR Connected. Its runtime scene is `AuxScene` with 65 bones, 3 skinned meshes (body, eyes, eyebrows), 21 unique built-in animation clips, and 40 action aliases. See `manifest.json` plus the full browser-generated rig inventory in the [runtime inspection](https://github.com/wazisentthis-watt/wir-school/actions/runs/41913862680). Finger chains, legs and arms are present, verified in runtime.

## Eight performances
The actor's current authentic GLB action set already contains Idle_Loop, Punch_Jab/Punch_Cross/Melee_Hook, Shield_Dash, Hit_Knockback, Roll, LayToIdle, Idle_Shield_Loop and m_kick_r. These are reused, **not replaced**. The pack adds original quaternion-keyframed gestures on the verified names (`upperarm_r`, `lowerarm_r`, `spine_02`, etc.) as additive THREE.AnimationClip actions on the **existing ReFramer AnimationMixer**, not an extra player or rig. Novel structural-steel five-plate visual shield, teal air trails, and roof recovery ring are temporary and non-collidable.

Preview each by checking out this stacked branch locally and opening:
`http://localhost:8765/connected/?lite=1&aerial_duel=1&reframer_pack=1`.
Click **REFRAMER ROOFTOP DUEL · TRAINING**, then **REFRAMER · 8 MOTIONS**. Each motion has its own preview button. During preview only the training duel timer is paused; exit restores original Savannah state and saved progress.

The normal `?aerial_duel=1` route without `reframer_pack=1` **retains PR #34 logic and presentation**. Neither is live on main; even after rooftop promotion the pack remains separately gated. No exported FBX, GLB or 2D sprite atlases are claimed by this pack. It generates live in-engine 3D animation and VFX, and provides the data manifest for later 2D/2.5D sprite capture.

## Honest animation gaps
The model is **rival sparring hero**, not final ReFramer canon. True motion-capture authored root-motion uppercut, directional flight and braking, full center-of-mass aerial roll, palm/knee contact recovery, finger IK for construct building, and offensive aerial-counter AI/hitboxes are still missing. New keys are an original procedural first pass, not falsely described as professionally mocapped clips. No new rights granted to unrelated artist work.

## Test gate
`node --test connected/tests/reframer_animation_pack01.test.mjs connected/tests/reframer_animation_pack01_integration.test.mjs`
`node --check connected/assets/reframer_animation_pack01.js`
Browser QA: load original Savannah mission + ReFramer model; 65 bones, 21 raw clips, 8 generated additive actions; preview each, shield/afterimages, gamepad and touch existing pilot; ensure story and profile unchanged. Preserve PR #34's existing 17/17 and 9/9 full combat/browser regressions. Do not merge/publish while base-branch release policy remains HOLD.
