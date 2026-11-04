# METAL Aerial Combat Pilot 01 | ReFramer Rooftop Duel
**PROPOSAL / PUBLISH HOLD. Draft only.** Pinned from `wir-school/main` at `e0004f2c75e72952dac6c7c143c6602c6d6c24b4`. No merge, Pages deployment or ordinary game release is authorized.

## Play the isolated prototype
With this branch checked out and served at repo root, open
`/connected/?lite=1&aerial_duel=1`. Let the real first mission load normally, then tap **REFRAMER ROOFTOP DUEL · TRAINING** to enter a contained arena over the existing Fight Lot.

- Keyboard: WASD move, **J** quick strikes (2-hit combo), **K** uppercut launcher, **Space/F** momentum-based flight pursuit, **Q** Galaxy Gallium aerial finisher, **B** dodge. Press **Esc** or EXIT to return to Savannah.
- Xbox (SkyLab only during this encounter): left stick movement, **X** light attack, **Y** launch, **A or RT** pursue, **LT+RT** Gallium finisher, **B** dodge. No L3/R3. Existing mappings are unchanged outside the pilot.
- Touch: a compact directional pad and five distinct action buttons on a real Three.js render.
- Real opponent: a new ReFramer training fighter from existing rig/animations, with approach, wind-up, strikes, reactions, launch physics and recoverable roof collisions.
- Win: land two melee hits → launch → pursue in air → deliver a finisher → opponent falls and collides with the rooftop. The enemy can attack, block positioning, damage METAL and win if METAL is depleted.
- The training rooftop is a private scene group; no new collider is added to regular Savannah. Original first mission, skating/forge, free-flight, swinging, map, character saves, world NPCs, SLOTTA and controller settings remain intact. Leaving restores original player position/velocity/camera without writing persistent data.

## Engineering notes
Pure JavaScript deterministic `metal_aerial_duel_core.mjs` owns local centre-relative combat state, bounded velocities, enemy AI, wall and rooftop contact and win/lose rules. `metal_aerial_duel_pilot.js` synchronizes the real METAL and ReFramer 3D models, 5 input actions, camera and transient collision effects. When not in the opt-in encounter, the original `main.js` update branch runs untouched.

**Known limitations:** Non-canon training arena entered through an explicit scene transition; no seamless animation from street to roof yet, no licensed new DBZ material, no destructive city walls or civilian damage; the debris/roof impacts are visual. Actual iPhone Safari, physical Bluetooth controller and definitive S1–S4 character motion review remain unverified. The opponent uses existing clips, not newly imported FBX.

## Acceptance tests
`node --test connected/tests/metal_aerial_duel_core.test.mjs connected/tests/metal_aerial_duel_integration.test.mjs`
`node --check connected/assets/main.js && node --check connected/assets/metal_aerial_duel_pilot.js`
Also use real hosted Chromium to enter the pilot, verify the live original models, attack/launch/pursue/finisher/roof impact/victory and exit back to Savannah. Run the existing mission-recovery, physics, controller, Forge, SLOTTA, syntax and HOLD gates before any possible promotion. **No publishing without owner authorization through trusted policy.**
