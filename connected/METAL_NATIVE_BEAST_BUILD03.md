# Build 03: Native METAL Beast Abilities (HOLD)
Stacked on Build 02 (PR #43) and WIR Connected native pilot (PR #42).

## Activation
On a branch preview served with proper Three.js assets: `/connected/?savannah_native=1&savannah_beast=1` (add `lite=1` for lower-power hardware).

This is **not** the standalone Morrow City engine, a new save slot, or a canon release. The module uses the existing Connected player rig, camera, board state, physics velocity, and Gallium gauge.

## Actual gameplay controls
- **Alt + numeric keypad 1–6:** select one of six independently animated tendrils.
- **Alt + numpad 7 / 8:** cycle selected limb role / issue its assigned command.
- **Alt + numpad 9 / 0:** build currently selected Gallium structure / cycle Lil Heavy AI.
- **Alt + Q / X:** Crown Read scan / Controlled Snap (enemy telegraphs slow; neural overload imposes cooldown).
- **Alt + Z / C / V:** Cold Lock ↔ Hot Line / choose Shield-Brace-Ramp / reclaim nearby constructed Gallium at 80%.
- **Alt + R / T / Backspace:** mark supported RIFFT source and destination / cross as a short physical traversal / return after cooldown.
- **Alt + E / G / Space / H:** Crown Dominion / grounded board Gallop / ollie / throw held opponent.
- **RB + D-pad / RB + face buttons:** cycle tentacle, command, scan, Snap and Dominion on standard Gamepad API controllers.
- Touchscreen buttons in the compact left-hand Beast panel offer all essential actions.

## Roles
Guard and Counter create a defensive window or interrupt a telegraphed enemy strike; Anchor finds an actual nearby Connected world anchor; Grapple physically restrains the native mission boss and throws it; Mobility supplies a board push; Rescue safely recruits or revives a nearby mission citizen. The six limbs have independent state and live visual lines. **They are not yet fully rigged GLB tentacles with inverse kinematics.**

## Conservation
- Spends the existing `window.__game.st.gal` for constructs, grabs, blasts and Gallop.
- Construct recovery returns 80% of the allocated material; material is not duplicated.
- Cold Lock improves guarding; Hot Line increases damage but can raise heat.
- Snap has a focus drain, heat buildup, and neural overload.
- RIFFT needs two valid surface-supported positions separated by 8–32 meters, a clear path, a grounded METAL, and Return integrity. Traversal progresses over rendered frames, not a teleport.
- Lil Heavy is represented with a small **four-wheel** autonomous board, limited to scouting, assisted repairs and recovery.
- Crown Dominion requires a target scanned by Crown Read, two live world anchors, 100 Resonance, 35 Focus, heat at/below 60, 8% Gallium, and cooldown.

## Test and publication gates
```bash
node --check connected/assets/metal_native_beast_core.mjs
node --check connected/assets/metal_native_beast_adapter.js
node --test connected/tests/metal_native_beast_core.test.mjs
```
CI additionally boots the actual Connected 3D world in headless Chromium and checks model reuse, visible 3D limbs, Gallium spending/recovery, Snap activation, and save preservation. No owner's physical Bluetooth controller or iPhone Safari result should be invented from simulated testing.

No unapproved merge to main. WIR HOLD, existing saves, original controls, original Metal rig, and approved canon remain intact.
