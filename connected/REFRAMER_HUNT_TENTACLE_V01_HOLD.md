# ReFramer Rush → METAL Connected Savannah: Hunter / Tentacle v0.1
**BRANTACLE 03, PROPOSAL / PUBLISH HOLD. Source-preserving opt-in, NOT a public feature.**

## Original source recovered and reused
- `connected/assets/reframer_core.mjs`: existing ReFramer Rush 3D v0.1-derived wake/drop/scan/anchor/release/reframe/Roadframe/chase state machine. Retained, not replaced.
- `connected/assets/main.js`: original rooftop nests, eight linked procedural arms, flattened dodecahedral core, and **real in-world Kenney car GLBs**. Pulls four wheel meshes from an existing loaded car and reassembles them as a Roadframe.
- `connected/assets/models/cars/{police,sedan,suv,truck,van,delivery,taxi}.glb`: donor candidates already shipped with Savannah. No new or invented meshes substituted.
- `connected/assets/metal_draw_core.mjs`: actual finite material draw system. Detached ReFramer claw enters its **existing** scrap source list, with a .18 reserve, and cannot be collected twice.
- `connected/assets/reframer_asset_ik_pilot.mjs`, `connected/labs/reframer-asset-ik-pilot/manifest.json`: separate optional GLB retarget investigation, not yet an authorized source of ReFramer animation in ordinary gameplay.
- `wir-100-studio/projects/metal/experiments/rapier-skate-reframers-v01/`: experimental vehicle steering / drift / nitro prototype, not a body transformation model. No Rapier runtime copied into Savannah.
- `wir-100-studio/projects/roboreality/docs/20_JUSTICE_UNITS_CONCEPT_ETHICS.md`: robotics concept, **not a confirmed Titanium Talons eagle-person game GLB**. Preserve distinction.

## What this opt-in implementation adds
Start the local branch with `?lite=1&reframer_hunt=1`.
1. **Hunting and loss-of-contact:** the existing Roadframe pursues Metal within a 32-m awareness radius and searches for his last known position when he moves outside it. Eight seconds without detection ends the pursuit instead of letting the robot know his coordinates anywhere in the city.
2. **Telegraphed mechanical tentacle:** when Metal comes within range, the ReFramer visibly extends **one of its existing eight arms** toward him with a 0.8-second windup. The shot can be dodged by moving out of range.
3. **Struggle:** while caught, the machine physically tugs Metal using the original velocity solver. **Tap E three times**, press **A three times** on the existing gamepad, or use the temporary **BREAK FREE** touch button. Capture ends after a maximum of three seconds and inflicts finite damage if not escaped. The button is hidden when not captured.
4. **Structural weak point:** a high-power blow to the extended claw can sever that exact attachment, disabling future grapple attempts for that machine. The detached mesh becomes physically visible salvage and can be drawn using Metal's existing Gallium Draw. Its finite reserve cannot regenerate after extraction.
5. **Purpose:** the existing occupied-car rescue, vehicle scan, wheel extraction, assembly, ramming and core fight behavior remain. The donor car becomes the machine's shell. This is not an ordinary Transformer conversion.
6. **Big robot presence:** the original ReFramer disc/core mesh is scaled to 145% in opt-in encounters, giving a larger looming silhouette near vehicles. The native rig remains the same.
7. **No separate player/renderer:** Metal movement, hand grab, swing, charge, skateboard, checkpoint and saves remain owned by the pre-existing Connected engine. No new power controls overwrite L2, R1 or L2+R2.

## Honest limitations
- The **pursuit detector is distance-based**, not yet raycast-tested line of sight or a comprehensive police/dispatch simulation.
- The ReFramer uses the original eight procedural arms, **not a fully validated animated octopus GLB** or separately suspended physical limbs.
- One active ReFramer/Roadframe at a time, chosen from several existing nests. Two to three simultaneous unique individuals require a per-agent instance refactor, aggression budgets and mobile performance tests.
- Helicopter / plane / pavement machinery shell transformations and the **Titanium Talons / Justice Units** flyers are *proposed* workstreams. They need validated GLBs and shape-specific travel rules. No alleged existing 3D eagle robot source was substituted.
- Robot armor supports one breakable **claw component** in this milestone, not complete per-vehicle structural damage / load paths.
- These enemy encounters are still episodic in the normal world; persistent wanted-level history, roster identities, vehicles left behind on reload and mission checkpoints require additional save adapters.
- Source tests check the mathematical gameplay rules; browser smoke checks scene startup and opt-in eight-arm integration. A separate full end-to-end chase and hardware Gamepad test are still needed to claim all behavior verified in a running city.

## Reproduce
1. Check out `feature/metal-reframer-hunt-tether-v01-20261107-hold` and serve the repository root with `python3 -m http.server 8765`.
2. Check unchanged `/connected/?lite=1`: normal first-mission boot, **no** break-free control or experimental ReFramer Hunt status.
3. Load `/connected/?lite=1&reframer_hunt=1`. Find an active rooftop nest near traffic and let the ReFramer scan/dismantle a real car. Before RELEASE, E rescues the driver.
4. During Roadframe chase, move out of its detection radius; it should follow the last-known location rather than teleport. Approach for a visible arm windup, dodge it or perform three deliberate breakaway taps.
5. Hit the first claw attachment with large enough directed Gallium attacks. It detaches and becomes ordinary finite Draw scrap. Other arms remain; core remains vulnerable to ordinary weapons.
6. Confirm original mission saves remain unchanged. Reboot without the flag to recover the baseline behavior.

## Test/merge/release
- `node --test connected/tests/draw_combo_reframer.test.mjs connected/tests/reframer_hunt_core.test.mjs`.
- `node --check` on all edited modules, including original `main.js`.
- Desktop and simulated-touch Chromium boot `connected/tests/reframer_hunt_browser_playwright.mjs`.
- Must also pass existing Mission 01, original skating, save, controller and mobile checks; failures unrelated to this branch still block release.
- **Do not merge or publish automatically:** protected-base `.github/wir-hold-policy.json` has mode HOLD and `allowPublicPublish:false`. Owner approval, full browser QA and exact-commit release authorization required. Keep rollback to existing main.
