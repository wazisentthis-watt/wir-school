# WIR METAL Galaxy Gallium Forge Phase 3: authored rig performance
**PROPOSAL / PUBLISH HOLD. Owner approval required to merge or publish.**
Base 2f3d7eb8a735224b6886186789f7e68cba0d444b; new Phase 3 draft builds on Phase 2 already merged to main.

## Implementation
A new original, deterministic `metal_forge_pose.mjs` times six gestures: scan, reach into the nearby environment, gather, press material, seal and board mount. `metal_forge_performance.js` discovers real compatible upper-body bones on the currently selected S1–S4 METAL rig at runtime and overlays small, physically readable local arm, forearm, head and chest motions **after the original AnimationMixer**. It restores the original quaternions **before the next mixer evaluation** so actions never accumulate rotational drift, and automatically remaps if METAL's form changes. It deliberately does not move, clamp or retarget the left prosthetic knee. Missing bones are skipped safely; available original animation clips remain the base.
The original board GLB, staged deck/trucks/four wheels, Phase 2 particles, collision/physics, Gallium resource accounting, B input and existing save keys remain unchanged.

## Verification
The existing Gallium Forge workflow now adds node-pure pose tests and actual browser evidence showing mapped rig bones during the forge. First mission, physics and controller gates still apply.
No downloaded FBX clips have been copied or licensed. Dedicated retargeted body motion and true environment destruction remain future work, and physical iPhone and Bluetooth remain unverified. Do not label this a filmed AAA-quality mocap sequence.
