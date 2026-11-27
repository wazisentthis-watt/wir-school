# Metal 3D attachment test — PROPOSAL / PUBLISH HOLD
This is a separate test branch, not a Pages deployment. Original main and model files are unchanged.
## Local run
1. Check out `test/metal-power-attachments-20261127`.
2. Run `python -m http.server 8000` from the repository root.
3. Open `http://localhost:8000/connected/?metal_power_meshes=1&metal_abilities=1` (the second flag enables the existing ability lab). Use a test browser profile; Connected's ordinary save paths are not changed.
4. Open **3D POWER ASSETS · TEST** and select the supplied `Metal_Power_Visuals.glb` from the separate attachment handoff. The file is intentionally not in Git yet. It is 463,356 bytes, with 27 attachments across nine power groups; no replacement character. Do not select the 47 MB combined rig.
5. **FOLLOW GAME** displays sword, adaptive armor, electron charge, existing Gallium grip and swing cues when the original host activates them. Swing uses the existing world tether and anchor; custom cuff/hook supplement it. The original sword is masked only when a custom sword is attached and the existing forge state authorizes it. Hold B to melt per existing controls. **Visual preview** buttons display one mesh group without granting powers, spending resources or dealing damage. Unload Assets restores base visuals.
## QA
- 10 isolated JS checks passed: Idle state hides all; Sword follows authoritative state; Armor, charge, swing, grip follow host; Preview isolated from live state; Unknown preview rejected; Namespaced bone alias; Missing bone returns null; 27 named attachments validate; Invalid scale rejected; Opt-in flag exists only on branch.
- The downloadable offline preview is separate from Connected. All nine preview modes passed browser pose and face-count checks, with no page errors in headless Chromium software-rendering mode.
- Not verified: full Connected startup, WebGL fit of all active season rigs, controller, iPhone, actual gameplay damage/physics, actual image-to-3D fidelity. Crown/weight/diamond/roar remain preview-only. Existing mechanics remain authority, not the visual module.
- All mesh offsets are preliminary. Inspect right-hand grip, armor clipping, missing bone report, swing hook orientation and form swaps before merging. Existing Gallium limb remains authoritative for flexible tether visuals.
## Rollback
Remove the query flag or unload the local mesh file. No merge/deploy until owner QA.
