# METAL Galaxy Gallium Forge: Phase 2 (PROPOSAL / PUBLISH HOLD)
Based on live `wir-school/main` commit `32bcea5099a42407adfa447b42c33f91a0a4e854`, which already includes merged PR #29. This is a separate DRAFT branch; no merge or deployment is authorized.

## Phase 2 implemented
The B-button `?gal_forge=1` path creates a seven-part staging board: 1 dark deck (starts 1.55s), 2 physical trucks (1.88s) and 4 tan wheels (2.08s), finishing before mounting at 2.65s. It adds 16 tiny ground-sourced visual fragments alongside 96 original glow particles. At 3.3s the temporary proxy disappears and the existing real 4-wheel GLB takes over for the original physics. B dismount still dissolves the board, never carries it. Matter-sourcing is VISUAL ONLY, not destructible terrain or city resource extraction.

The original METAL character mixer plays existing rig actions chosen per phase when they exist. S1 may use the actual Crouch/Block action; S2–S4 may use Idle fallback. Charge and Blast provide available gathering/activation gestures. No actual FBX retarget, finger IK or forced prosthetic knee clamp is claimed. The ordinary movement animation selector is suspended while forging; changing character forms is blocked until done. Existing story saves, profile, skateboard GLB, controls, swing, first-mission and textures stay intact.

## Verify
`node --test connected/tests/metal_forge_state.test.mjs connected/tests/metal_forge_choreography.test.mjs connected/tests/metal_boardback_swing_contract.test.mjs`. The project Actions Forge workflow runs real local Chromium against `/connected/?lite=1&gal_forge=1` and tests four wheels, timeline progression, mount/dismount and unchanged story/profile saves.

User's eight uploaded Capoeira FBXs were examined, but not imported because they are combat motions. Retarget source license and S1–S4 rest-axis approval are pending. Physical iPhone Safari, Bluetooth and final visual approval remain pending.
