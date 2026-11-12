# METAL Parametric Character Lab · WIR Connected
**Original procedural implementation. PROPOSAL / PUBLISH HOLD.**

## Source
The user-supplied pasted note is a technical narrative and incomplete wrapper about another game, not the real original ai_3d_model_generator.js module or any mocap source files. This implementation is newly authored using standard Three.js skinning and procedural geometry techniques, not copied proprietary fighter code.

## Implemented
- connected/assets/ai_3d_model_spec.mjs: JSON spec validator, constrained body proportions/palettes, METAL preset, seeded RNG, and normalized skin weight checks.
- connected/assets/ai_3d_model_generator.js: 24-bone humanoid skeleton, lofted torso, weighted hinged arms/legs, ellipsoid head, embedded Afro-Crown coils and squared chin coils, sealed armor and covered legs, real SkinnedMesh and welded UV seam normals.
- Deterministic lean/base/heavy geometry with identical vertex topology, two GPU morph targets, per-bone static guard, anticipation and stride poses.
- connected/labs/metal-procedural-rig.html: interactive 3D model preview, no effect on normal Connected startup or save files.
- Node spec tests and Playwright WebGL/browser tests in connected/tests.

## Run
Serve the repository root on an HTTP server: python3 -m http.server 8765
Open /connected/labs/metal-procedural-rig.html. This lab imports the existing local Three.js vendor module. No network model API, CDN, or key.

## Scope and discrepancies
- The pasted description says 22 bones, but the explicitly listed spine, two four-bone arms and two five-bone legs require 24. This build uses 24.
- The note describes 13 quantized FBX mocap clips and analytical two-bone IK, but supplies neither animation files nor solver. They are NOT implemented or claimed.
- The advertised 15ms build and zero-cost morph benchmark were not verified. Morph positions are pre-built at boot and blended on GPU at runtime.
- This rig does not replace the established WIR Connected character GLB, board, six tentacle powers or physics. It is a review lab only.
- No third-party BrawlScape character code, art, motion clips or textures were imported. An LLM can supply validated JSON spec data, but the generator does not call an LLM itself.

## WIR canon
Dark sealed METAL armor, Afro-to-Crown continuity, white angular sensory apertures, concealed left lower prosthetic and physical four-wheel skateboard remain design constraints. This prototype has no final approved model fidelity. Maintain PROPOSAL / PUBLISH HOLD, explicit owner art review and physical controller/mobile QA before release.