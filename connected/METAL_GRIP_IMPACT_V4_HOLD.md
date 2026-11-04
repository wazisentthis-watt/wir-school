# METAL Contact & Recovery v4 | WIR Connected development build

**2026-11-04 · PROPOSAL / PUBLISH HOLD · unmerged.**

This branch is stacked on draft PR #27 (`feature/metal-terrain-foot-contact-v3-20261104-hold`), which builds on the earlier planted-foot and pressure-skating work. No changes to published `main`, save schemas, original GLBs, story scripts, or Gamepad mappings.

## New source and effects

**`connected/assets/metal_grip_impact_v4.mjs`** implements:
- Strict finger-joint name classification using *existing* bones. It does not invent finger anatomy. Finger curls use bounded, phase-aware curves for thumb, index, middle, ring, little fingers. Their local bend axes are provisional until rig-specific visual inspection. Models without recognizable finger joints continue to use the prior Gallium/wrist grab.
- `GripChoreo`: smooth open, hold and relax motion; no extra physics, damage or energy allocation.
- `stableKneePole`: fallback knee plane for the existing Phase 6 two-bone IK if the pole vector aligns with the thigh-to-ankle direction. The old solver remains unchanged outside opt-in `?metal_next=1`.
- `EnemyImpactChoreo`: a purely visual air→impact→recover→idle timeline based on the authentic `CombatBody` gravity, bouncing, stun and standing transition, with a single counted landing.

**`connected/assets/main.js`** integrates these behind `metal_next=1`. Non-SLOTTA original WIR procedural opponents now have a dedicated visual-only pivot, preserving their existing root collider, positions, attacks, ragdoll physics and mission states. The new overlay tilts and compresses during landing and gets up when the physics body stands. SLOTTA retains his original animated boss asset and is not overwritten.

The real S1 skeleton is inspected at runtime and reports the actual count of matching finger joints. If count = zero, no fake finger animations are played. The existing GLB clips and the 70-bone Gorillium ability lab are not re-rigged or overwritten.

## QA and reproducibility

Run from the scoped branch and repository root, served via HTTP:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
node --check connected/assets/main.js
node --check connected/assets/metal_grip_impact_v4.mjs
node --test connected/tests/metal_grip_impact_v4.test.mjs
node connected/tests/metal_grip_impact_browser_playwright.mjs
```

- `metal_next=1`: optional development gameplay mode; normal hosted game unaffected.
- `metal_motion_qa=1`: existing test-only rig/throw fixture, not a gameplay teleport ability.
- Real-game Chromium QA loads the genuine S1 GLB and Ballast procedural actor, checks detection and grip strength, a single physical release, landing and recovery animation, save isolation and legacy mission startup.
- Maintain existing physics, browser graphics, first mission, SLOTTA and hosted-startup checks.

## Limits and next acceptance

This is **procedural motion**, not final captured/retargeted FBX motion. Rig-specific finger bend axes, grip-object contact offsets, physically accurate heel/toe contact and knee hyperextension require visual inspection and actual hardware. Some older uploaded FBX files have expired and must be uploaded again for their exact animation retargeting. Authentic new enemy meshes and all 31 playable Gorillium effects remain outside this scoped milestone.

Physical controller and iPhone Safari tests are outstanding. Do not merge, deploy or publish until independently approved. Rollback: close this draft and use baseline `main`.
