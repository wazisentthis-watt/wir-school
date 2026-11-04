# WIR Connected: Gorillium Core v0.1

Status: **PROPOSAL / PUBLISH HOLD**. Live main, saves and existing game unchanged.

## Implemented
- Pure JavaScript ability core: eight independent limb slots, six proposed abilities, Gallium budget, cooldowns, targeting and limb release.
- Twelve deterministic Node tests with no assets, browsers or external dependencies.
- Existing physics workflow now checks Gorillium syntax and unit tests.

## Not yet integrated
No final original Gorillium model, skeleton, tentacle weights, FBX retargeting, visual VFX, sounds, actual damage, ragdolls, player controls or in-game transformation. This new core is deliberately NOT imported by the live main.js. There is no save migration or game release. Move names and cooldown/energy parameters remain PROPOSAL.

## Core interface
createGorilliumState(), setGorilliumForm(state, enabled), checkGorilliumCast(state, move, {source,target}), castGorilliumAbility(...), stepGorillium(state,dt), gorilliumStatus(state). Targeted attacks require finite 3D positions and stable target id; shield is untargeted. Successful casts yield ability, role, limb ids, target id, start time and hold duration. Cast results do NOT mean the target was hit.

## Next acceptance
1. Recover and validate authentic Gorillium GLB and clip hashes; inspect bone hierarchy and confirm eight usable effector points.
2. Render the genuine rig in an isolated debug harness and animate one Tentacle Lash and one Galaxy Tether motion.
3. Connect the action-event interface to actual collision confirmation, resource budgets and visual events, feature-gated only.
4. Run local and hosted startup/fallback/controller regressions; seek physical iPhone validation prior to turning on a public game feature.
5. Keep 2.5D and 3D branches separate, preserve canon, PUBLISH HOLD and original save bytes.

## Reproduce
- node --check connected/assets/gorillium_ability_core.js
- node --test connected/tests/gorillium_ability_core.test.mjs

Rollback: close or revert only this draft PR. No live or original files need replacement.
