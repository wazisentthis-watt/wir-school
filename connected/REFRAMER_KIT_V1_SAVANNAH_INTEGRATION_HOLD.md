# WIR Connected Savannah | Original ReFramer Kit v1 Integrated with Squad
**November 7, 2026 • PROPOSAL / PUBLISH HOLD • No public release**

## Source provenance
The owner supplied `WIR ReFramer Kit v1.js`. We placed its complete **unchanged** 780-line source at `connected/assets/reframer_kit_v1.js`, verified full string equality with the attachment, and ran the kit's **16/16 canonical simulation tests**. This is the owner-supplied implementation of ReFramer Rush 2D v0.4 + 3D v0.1; the kit is not an unrelated art pack.

The original code includes 878 kg of donor material across 12 tracked component definitions, 4 wheels at 22 kg each, 8 articulated limbs with three segments and a FABRIK/gait solver, self-contained deterministic `Engine`, 2D and Three.js adapters, and a material-accounting ledger.

## What the current game actually uses

### Under explicit `?reframer_squad=1` only
1. **Full owner kit is loaded dynamically**, integrity/self-test checked, then bound to the original pre-existing ReFramer Squad world. The ordinary Savannah first-mission path does not load the extra script, squads or UI.
2. **Rig integration:** use `kit.Rig.update()` to animate the *actual* eight-arm physical ReFramer group in Savannah with three procedural limb segments per arm. Converts kit px-coordinate (x,y,z-up) to Three.js world (x,y-up,z) at 40 pixels per world unit. A held tentacle overrides one arm's gait so capture stays visible and responsive.
3. **Material provenance:** extract only four wheel meshes physically available from the existing 3D vehicle GLB and tag them with their matching owner-kit wheel keys and **22 kg** mass each. At the moment, the remaining chassis/doors/roof/engine are still present in the original undivided donor-car model; do **not** claim those were individually taken.
4. **Squad:** one existing leader ReFramer with two independent additional bodies on desktop or one additional on touch, each with separate car ownership, extracted real wheel meshes, states, combat, path orders, last-known-location squad radio, and singular tentacle-capture arbitration.
5. **Combat:** real in-game hits can sever a captured claw or a vehicle wheel, and a broken wheel cannot rematerialize during a donor restoration. Draw scrap uses the existing game's finite Galaxy Gallium intake.
6. **Saved code and evidence:** ReFramer source stays unmodified; no rewriting main Metal's original checkpoint schema or rewriting player motor/controller.

### Deliberately NOT active as a second simulation
The source kit's `Engine.step()` is *not* run alongside `reframer_core.mjs`. They both own ReFramer lifecycle and donor state. Stepping both would create duplicate car claims, source material and conflicting chase results. We use its `DATA` + `Rig` now and preserve its full `Engine`, `Canvas2D`, `createThreeView`, `Audio`, `serialize` and `restore` for controlled future migration and comparison. They are not claimed integrated into live Savannah.

## Tests
- `node --test connected/tests/reframer_kit_savannah_bridge.test.mjs`: canonical self-tests, 878 kg conservation data, 22 kg genuine wheels, coordinate conversions, three-joint IK, and failure on corrupt source.
- `node --test connected/tests/reframer_squad_core.test.mjs connected/tests/reframer_hunt_core.test.mjs connected/tests/draw_combo_reframer.test.mjs`: squad independence, physical vehicle provenance, chase and rescue behavior.
- `node connected/tests/reframer_squad_browser_playwright.mjs` on locally served branch: ordinary Mission 01 boot, opt-in desktop/touch scene, original kit loaded, two different existing car GLBs dismantled, both machines in Roadframe chase, real wheel strikes and isolation.
- Re-run source syntax and physics regressions on exact latest commit. The browser is emulated mobile only; no claim of tested iPhone hardware or Bluetooth controller.

## Next features still missing
- Exact source car chassis/doors/engine 3D part extraction from original GLB (source currently has only four separable wheels). Proper mount-point meshes and conservation before claiming universal transformation.
- Official kit engine full state machine integration (physical outriggers, glass release, recover/retreat/repair, mass ledger serialization) behind a **single** game authority, with bidirectional save migration tests.
- Flight-capable donor material and rotor/wing/cockpit assembly for helicopter and plane; never transform without retrieved physical source.
- Justice Units/Titanium Talons rig, flight/navigation, crowd reaction and story assignments. Existing source not yet verified as a production-ready eagle-person GLB.
- Per-agent pathfinding/LOS and persistent wanted-level mission history; current unit sight is radius-based and play-session scoped.

## Release
User intent: put them in the game; delivered as **testable source integration**. Repository policy `.github/wir-hold-policy.json` remains authoritative with `mode:"HOLD"`, `allowPublicPublish:false`. Do not merge or deploy this branch automatically, and do not set public-site status to completed before full regression and release authorization. In particular, merely uploading the kit is not authority to bypass HOLD. Original main remains a rollback.
