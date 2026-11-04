# METAL Galaxy Gallium Board Forge · PROPOSAL/PUBLISH HOLD
Protected draft, base 7920bb28420a06bf3909afdbdacae030e6cea108. Do not merge or deploy without owner GO.

**Flag:** on a local checkout/server of this draft run `/connected/?lite=1&gal_forge=1`. Default remains instant-B but NO back/front carried board in draft. B during forge cannot spawn duplicate board. With flag: on ground and finite floor material, spend 0.08 current Gallium; 96 transient environmental particles gather into a gunmetal deck with four tan wheels over ~3.3s, then the existing original skateboard GLB and original physics take over. B dismount triggers ~0.55s disassembly and returns 0.05 Gallium, never creating free matter. The particles originate from the sampled actual world floor, but do NOT remove voxel/mesh matter; destructive environment harvesting remains a future proposal.

**Compatibility:** original Metal S1–S4 assets, character mixer, first mission, saved story/profile keys, real-world swing anchors, controller mappings and boarding physics remain. No downloaded FBX is included and no fake magic-cast filename is claimed; existing Charge/Interact clips are reused only if present. Physical iPhone/Bluetooth, imported rig animation retarget, and final rendered pose QA are still REQUIRED.

**Tests:** `node --check connected/assets/main.js && node --check connected/assets/metal_forge_controller.js && node --test connected/tests/metal_forge_state.test.mjs connected/tests/metal_boardback_swing_contract.test.mjs`. Compare main and branch first and keep live deployment HOLD.

**Original user uploads:** eight Mixamo-style Capoeira FBXs are fighting motions (kicks/leg sweeps), not actual forge clips. They carry approximately 66 Mixamo bone names and require original-source license checks. Do not import their bytes into public GitHub. UniMate is MIT-licensed tooling; KayKit character pack is CC0 but does not substitute METAL. No assets from these uploads are incorporated in this draft.

**Blender prosthetic:** `metal_retarget_preflight.py` inspects target armature bone mapping and knee location but changes NO rotations or constraints; locking local Y/Z without reading actual rest axes would be unsafe.
