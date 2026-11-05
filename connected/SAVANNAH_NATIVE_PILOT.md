# METAL × Savannah: Native WIR Connected Gameplay Pilot
**Status: PROPOSAL / PUBLISH HOLD. No release or canon change.**

This branch adds two optional, native Three.js Savannah missions to the existing WIR Connected world. It does **not** replace the existing renderer, main METAL rig, controller, checkpoint, physical movement, civilian population, or story loop.

## Open and play
When served from a branch preview, visit `/connected/?savannah_native=1` (or `?lite=1&savannah_native=1`). Click **Riverfront** to play Chapter 07 with Brine Broker, Ayo and Sana, then **Marshline** for Chapter 08 with Ledger Wraith, Binta and Zola. Original controls still move METAL. Use E near characters to recruit and rescue, hold E near amber markers to repair, escort civilians to the cyan refuge, and use 4/6 or J/K for strikes and 7/9 for Gallium blasts. Alt+1–4 or LB + face buttons activates recruited allies. On-screen buttons are included for touch.

## Shared world contract
The pilot attaches original placeholder meshes to the **existing** Three.js scene via `window.__game.P.o.parent`, reads the existing character position, camera, keys and finite `st.gal` resource. No duplicate 3D scene, rendering loop, player body or teleport for real gameplay. Other METAL powers remain available in the main engine. The add-on has a lightweight mission tick but does not replace main physics.

## Scope/limits
- Two native missions, three civilians and two timed repairs each, boss pressure and four named ally abilities.
- Spawn locations are relative to the player in Connected's **fictional Savannah prototype** and are deliberately not a claim to exact real-world River Street or marsh geography.
- Placeholder character meshes; not final official WIR character art.
- **Not a port of all eight standalone Savannah Crossing missions**. The standalone Morrow City stages and its custom rendering/game logic remain separate.
- Mission health and city integrity are local proposal meters, not replacements for Connected's global status. Blast cost does debit the existing Gallium resource.
- No save reads/writes or migration. Reloading resets this optional pilot only. The main `wir_metal_story_v1` and `wir_valence_profile_v1` storage contracts must remain unchanged.
- WIR canon, Gorillium model/animation HOLD, and existing rig/real-world controller testing are unaffected.

## Automated validation
```bash
node --check connected/assets/savannah_native_core.mjs
node --check connected/assets/savannah_native_bridge.js
node --test connected/tests/savannah_native_core.test.mjs
```
CI is added for this pilot and runs only in a PR. Node rules are testable separately from the heavyweight world renderer.

## Manual owner acceptance before any merge
1. Normal `/connected/` still loads with no native pilot entities.
2. Opt-in full and Lite versions launch, show the original rig, and render the new boss/NPCs with no runtime errors.
3. Existing original story checkpoint, pause, movement, board, controller and other systems still behave as before.
4. Test native recruitment, repair, attack, physical escort and boss completion on desktop and iPhone Safari, plus the actual Bluetooth controller.
5. Verify all source files load from GitHub Pages with correct MIME types and test against the same candidate commit.
6. Seek explicit publication authorization. Governance HOLD is deliberately not bypassed.

## Rollback
Close/revert the draft PR to remove the pilot, or remove the guarded index script and link plus the two new assets. No save migration is required.
