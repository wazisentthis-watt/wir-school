# METAL vNext · movement, combat and city expansion
**Status:** PROPOSAL / PUBLISH HOLD, opt-in only. No merge, public deployment or canon changes.

## How to enable in an approved draft/test build
Serve the checked-out repository root, e.g. `python3 -m http.server 8765`.
- Default WIR Connected (unmodified behavior): `http://127.0.0.1:8765/connected/?lite=1`
- Desktop vNext with controller calibration: `http://127.0.0.1:8765/connected/?metal_next=1&controller_v3=1`
- Mobile Lite QA: `http://127.0.0.1:8765/connected/?lite=1&metal_next=1&controller_v3=1`

**Neither these query parameters nor the branch will change the currently published game until the owner reviews and authorizes a merge.**

## Implemented systems (feature flag)
1. **Pressure R2/RT:** one physics impulse on release, rather than acceleration each frame. Short tap on four-wheel board adds speed once; holding R2 for `>= 0.40`s then releasing adds a reduced/limited RIFFT step, subject to cooldown and a real ground contact. On foot, a supported ground RIFFT step is available. The old auto-stroke acceleration is disabled *only in opt-in mode*; coast/carve/brake/friction remain.
2. **Controller combos:** physical LB+Y throws a currently held enemy; LB+RT retains object/world throws (including safe actors); LT+RT retains existing KODA charge; LT+B parry animation, LT+X bind, X→X→Y Gallium knuckle-chain; D-pad cycles proposal ability banks and preview clips when the loaded rig actually has them. No L3/R3 required. Existing LB/RB/LT/RT grips/chords are protected from controller remaps in the adapter. Full 31-ability runtime integration is NOT claimed.
3. **Board-back swing:** swing no longer automatically equips the board. While carried, the board remains attached and rotates with the character's chest/spine/root during the rope swing. Existing anchor, energy, swing physics and model are retained.
4. **Directional combat:** released hostile actors are moved by the existing `createCombatBody` + `applyCombatHit` + `stepCombatBody` impulse solver, with mass-aware release and procedural fall/recovery proxies. Citizen grabs retain the pre-existing safe put-down/release rather than converting everyone into a hostile throw target. Real paired humanoid animation FBXs and ragdoll physics are still pending.
5. **Moving charge:** only while actively charging, torso shunts, rhythmic lean/side motion, compression and heel/toe motion produce a crump-derived prototype rather than static particle-only charging. Pulses create temporary environmental rings, nearby lights change and pedestrians pause briefly; the existing `merkabah_charge` stress, finite Gallium and resource accounting remain authoritative. This is not full mocap choreography or permanent city deformation.
6. **Conflict and enemy identity:** four deterministic, low-complexity *provisional* fight-lot opponents added only in vNext: Ballast (mass push), Slipline (directional redirection), Glassjaw (temporary surface/RIFFT instability), Kiln (heat transfer *only if nearby metal*). Existing Framekeepers, Framebreakers, Reframers, SLOTTA, their story state, and three missions stay untouched. Enemy models and effects are placeholders, NOT finalized WIR likenesses. Existing Framekeeper rescue classification remains distinct from Framebreaker aggressors.
7. **Expanded map:** desktop opt-in grows to **9×9** generated city blocks (7×7 default), while `lite=1` keeps **5×5**. This is not yet chunk-streamed/cached terrain: cost and FPS must be measured on phones before a larger expansion.

## Exact source
- `connected/assets/metal_full_motion.mjs`: `PressureStep`, `ComboInput`, `safeThrow`, `chargePose`, `enemyAbilityTick`.
- `connected/assets/main.js`: limited opt-in call sites, existing game physics reused; no loader/save migration.
- `connected/tests/metal_full_motion.test.mjs`: deterministic 20-case tests.
- `connected/tests/metal_full_motion_browser_playwright.mjs`: actual browser/GLB boot check for opt-in/default mission, R2 tap and hold, four new opponents, and version-1 save.
- `.github/workflows/metal-full-motion-proposal.yml`: dedicated Node+Chromium QA.

## Required source animations before visual finish
- Normal Metal: left prosthetic planted right-foot R2 *push load/release/recovery*, 8-way start/stop turns, skate pressure shifts, bail/land, with *separate* board-back swing body pose.
- Combat pair: reach/contact/catch/hold/overhead load/side throw/safe set-down/release/impact/recovery (sync both player and target, plus real collider).
- Charge: two chest slaps, asymmetric crump shunts, twisting torso + planted heels, overload correction, recovery and environmental response.
- Enemies: distinct Ballast heavy bracing, Slipline surface-anchor redirect, Glassjaw fractured-coat telegraph, Kiln linked heat transfer. Framekeeper containment and Framebreaker counterattack remain separate.

Free motion candidates (CMU, ACCAD, KinemIQ) and Gaussian splat scenery are **intake candidates** only. A Gaussian splat is visual geometry, not rigged GLB and not a gameplay collision proxy. Uploaded OBJ, FBX, GLB, BVH assets need per-file origin/license checks, bone mapping, hash, appropriate retargeting and iPhone performance testing before import.

## Regression and approval
Test commands:
```sh
node --check connected/assets/metal_full_motion.mjs
node --check connected/assets/main.js
node --test connected/tests/metal_full_motion.test.mjs
node connected/tests/metal_full_motion_browser_playwright.mjs
```
The live game and any existing user save are untouched. Avoid merge/deploy/publish until owner approval and real Bluetooth + iOS Safari evidence. Base branch is PR #23 / #21; PR #24 on a separate branch supplied board-back movement and is not merged by this work. Rollback: close/discard this draft, use default build.
