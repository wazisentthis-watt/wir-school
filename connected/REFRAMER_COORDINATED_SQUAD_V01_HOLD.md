# METAL × ReFramer Rush: Coordinated Scavenger Squad v0.1
**2026-11-07 • Source prototype • PROPOSAL / PUBLISH HOLD**

## Objective
Make the mechanical-octopus ReFramers a population, rather than one one-off boss. Keep the owner's original **ReFramer Rush 3D** eight-arm body, source vehicle-model dismantling, donor car rescue, metallic scrap and Metal's Savannah control engine. Never substitute generic Transformers or a fabricated eagle GLB.

## What this actually implements
- Original ReFramer remains the lead actor, with its original car attachment, wheel theft, roadframe, hunter tentacle and weaknesses.
- Adds **two independently simulated wing agents on desktop** or **one on touch devices** to keep mobile geometry bounded: three total actors on desktop, two on touch. Every wing has its **own eight articulated arm meshes, dodecahedral core, own `createReframers` FSM**, independent encounter HP, cooldowns, disabled claws, and car shell.
- Wings use two distinct **existing rooftop nests** reserved from the original leader (leader retains unreserved nests). No off-camera magically instantiated cars.
- **Finite donor ownership:** each wing claims one actual already-loaded car GLB via unique UUID. One car cannot be claimed by two units. It detaches actual named wheel meshes, stores their **individual mesh UUIDs and source vehicle IDs** as an inventory, and uses those world meshes in a moving Roadframe shell. If defeated, its recovered wheels become existing Gallium Draw scrap sources with limited physical reserve. If interrupted, original wheel parent/transform and car speed are restored.
- **Coordination, not omniscience:** nearby units publish a last-known Metal position over a short-lived shared radio contact. The interceptor flanks; the salvager moves toward the last-known position. Radio contact expires after seven seconds; one unit cannot ram Metal without personal detection. Two wings cannot deploy overlapping tentacle grabs.
- Existing **tether warning, escape, finite capture damage** and weak-claw rules work with both wing bodies using the already-shared combat damage interface. E, controller A, and a temporary touch BREAK FREE button respond to captures; baseline controls remain untouched.
- **Collision fix:** while optional squad transformation is enabled, ordinary ambient traffic movement does not teleport donor cars away from the machines. Other car traffic is unaffected.
- Existing **Mission 01 gameplay, saves, GLB files, skating, L2 grab, R1 swing, L2+R2 charge-up** remain original. No replacement player rig or second renderer.

## Opt-in build
Serve the feature branch locally using HTTP. Use:
- `/connected/?lite=1`: untouched ordinary Savannah gameplay; no squad code installed.
- `/connected/?lite=1&reframer_squad=1`: new independent wing encounters alongside the original.
- `/connected/?lite=1&reframer_squad=1&reframer_squad_qa=1`: *testing only*, can force two **existing** GLB donors near the pre-existing nests to prove identity, extraction and scene updates.

## Automated evidence
- `node --test connected/tests/reframer_squad_core.test.mjs connected/tests/reframer_hunt_core.test.mjs connected/tests/draw_combo_reframer.test.mjs`
- `node connected/tests/reframer_squad_browser_playwright.mjs` against an HTTP-served local checkout with Playwright Chromium. Normal boot, desktop, emulated touch, two source-model donors and physically extracted wheel inventories.
- Compare other existing GitHub Actions checks on the exact PR head. Do not claim physical controller validation from simulated Gamepad/Chromium.

## Explicitly not yet implemented
- Full PHATOM universal extraction/build logic that can transform any arbitrary machine into a plane, helicopter or pavement-laying machine. The available **car wheel** meshes are real and ownership-safe, but there are no aviation flight surfaces or a universal joint/structural grammar yet.
- Titanium Talons / Justice Units: no original eagle-person rig has been verified here.
- Physics raycast line-of-sight and complex city pathfinding. Detection is distance-based. Coordination is a bounded squad radio/formation model.
- Persistent multi-ReFramer serialized city state across full page reloads; these incidents are session-scoped and originals are preserved. The existing offline game saves are not modified.
- True 3D rig animation retargeting (current eight-arm ReFramers are their recovered procedural implementation).
- Mobile hardware performance, real Bluetooth-controller QA, and full end-to-end capture/kill from arbitrary player input on an iPhone.

## Gates
A successful code-level unit test is not a full game QA. Source and in-scene tests must both pass on the exact SHA. Main is immutable from this branch until formally authorized. Repository base policy currently has `mode: HOLD` and `allowPublicPublish: false`. Do **not** merge, deploy, disable or edit HOLD. The previous unexpected merges are not a release authorization.

## Next verified expansion
1. Make existing per-part inventory gameplay accessible: disable specific wheel, tread, rotor, tool modules and visually change handling.
2. Add raycast visibility, dispatch heat and navmesh steering, plus named unique squad roles and wanted-level memory.
3. Confirm the original **Justice Units** eagle-humanoid GLB before integrating flying Titanium Talons.
4. Move from donor wheel meshes to reusable **PHATOM part contracts** (mount points, shape, mass, load path, power, movement type, provenance), with tested rotor/wing vehicle recipes; never generate missing source parts from thin air.
