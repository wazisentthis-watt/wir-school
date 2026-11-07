# METAL Galaxy Gallium Forge Phase 4: make forging the ordinary B action

**PROPOSAL / PUBLISH HOLD: draft only, no merge or deploy.**

Based on current Savannah live source at `4cc56811882404d9f2571feebe42071604978c07` (Phase 3 merged in PR #31). This source-only change makes the already-tested original Galaxy Gallium board forge active by default for keyboard B, touch FORGE, and the game's existing controller board action.

- On the ground with enough Galaxy Gallium, B starts the 3.3-second original six-gesture forge, gathering particles into an individually built deck, two trucks and four tan wheels. The existing skateboard GLB and physics take over when complete. B dismount dissolves the board. There is no board on METAL's body.
- Query override `?gal_forge=0` restores instant B boarding **without** a backpack or front-of-chest board. This fallback touches no saved story/profile data or persistent preference keys.
- Existing `?gal_forge=1` continues to work, and normal `?lite=1` also runs the forge. Nothing changes in the original mission, rigs, animations, resources, bone mapping, gameplay save schemas or public governance policy.
- The mobile touch action is now called FORGE; the Help panel explains B forging instead of immediate board materialization.

## QA and acceptance

```sh
node --check connected/assets/main.js
node --test connected/tests/metal_forge_state.test.mjs connected/tests/metal_forge_choreography.test.mjs connected/tests/metal_forge_performance.test.mjs connected/tests/metal_boardback_swing_contract.test.mjs
# Also run existing first mission, 105-test physics, controller QA and the Forge Chromium workflow.
```

The browser test loads `/connected/?lite=1` (no special forge parameter), checks 7 separate components, 6-bone original-rig action, real GLB mount, B dismount, unchanged live game save keys, then loads `/connected/?lite=1&gal_forge=0` and confirms instant boarding and dismounting without any carried board. Real iPhone and Bluetooth hardware are not certified by Chromium.

**Important release status:** GitHub `main/.github/wir-hold-policy.json` currently has `mode=HOLD`, `allowPublicPublish=false`, and no approved merge or release records. No direct push to main, bypass merge or deployment is permitted by this release candidate. Owner/admin must authorize before production promotion.
