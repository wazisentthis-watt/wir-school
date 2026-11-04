# ReFramer Asset + IK + BVH Pilot 01

**PROPOSAL / PUBLISH HOLD | SOURCE-ONLY DRAFT | NO MERGE OR DEPLOY.**

Baseline: newest WIR Connected Savannah main checked at task start, f7d0560bee082946f24397bc69982259e32a1ccd. Pack 02 is a separately merged feature-branch PR #39, not automatically part of main. We did not overwrite or falsely declare that branch as live.

## Exact uploaded sources
Soldier.glb: 62 skeletal joints, 24 clips, SHA256 8b3ecad9edfe10bc663cb9f8317603d9fc7952c6f95b90a9be92752aa0a37e0f.
Character.glb: 25 skeletal joints, 22 clips, SHA256 cefe2ff8b8e49607bb7e7349862a10e29a63c69eeabc1c939330cb8cb8f90301.
Both source GLBs include Punch_Right, Punch_Left, Kick_Right, Kick_Left, Roll, HitRecieve, HitRecieve_2 and Idle_Neutral. Exact skeleton binding was checked in the uploaded binary glTF animation channels, not inferred from file titles.
Original ReFramer in main: connected/assets/models/rival_sparring_hero.glb, 65 verified bones and 21 clips from the prior actual WebGL browser inventory.
CCDIKSolver.js is included directly from the uploaded file at connected/assets/lib/addons/animation/CCDIKSolver.js, using the pre-existing Three.js r160 module import map. Three.js MIT source.
three-mesh-bvh-master.zip is source version 0.9.18 with MIT license, compatible peer Three >=0.159.0. The CI builds a temporary ESM runtime from a pinned published package; no new default engine dependency.

## Privacy/rights
Neither uploaded Soldier.glb nor Character.glb is committed or redistributed in this branch; rights and canon have not been confirmed. The four sample rotation channels each from Punch_Right and Roll are deliberately included as small source-provenance diagnostic data, not full animations. This is a bounded private motion retargeting study.
Full user-uploaded clip playback can only be verified after the operator chooses those exact files through the in-game local File picker. They are parsed in the browser; no game server upload is implemented. The automated GitHub tests validate sampled rotations on the actual ReFramer rig, not a full private source file.

## Play without changing the published game
Check out the draft branch, run a local HTTP server in the repository root (python3 -m http.server 8765), then open:
http://localhost:8765/connected/?lite=1&aerial_duel=1&reframer_ik=1
Enter the Rooftop Duel training instance and select the source GLB from your computer. Choose one of its compatible clips from the list. Toggle FOOT IK or HAND CONTACT and click BVH COMPARE to verify collisions. Exit returns to normal Savannah without changing the production story/profile keys.
The normal /connected/ URL and the existing ?aerial_duel=1 route have no ReFramer asset probe, File input, new IK solver or optional BVH imports.

## Collision/physics comparison
The pilot's two-link foot/hand solver runs on disposable proxy bones with extra target bones. It never modifies the original skinned-mesh bone array. Only small (<=0.23 m hand, <=0.20 m foot) targets are blended into the true rig rotations after each existing animation mixer update.
The existing rooftop core remains the sole authority for position, gravity, contact, player/enemy health and victory; original WIR metal_combat_physics.js and all skating and movement systems are untouched.
BVH is used for a read-only 120-ray intersection equivalence check against standard THREE.Raycaster. The first rooftop floor mesh has only a handful of triangles: the timing is a measurement, NOT evidence that BVH accelerates the whole city. After the check the original mesh.raycast function is restored. No world collider is changed.

## Real QA
The draft workflow runs code checks, deterministic source mapping and physics tests, builds a temporary upstream BVH ESM, then launches actual software-WebGL Chromium on locally served full Savannah. It validates original ReFramer bones, four uploaded rotation samples per character/clip, unchanged collision body, bounded hand IK, equivalent BVH ray distances, and mobile touch input. Screenshots and JSON measurements are recorded as CI artifacts.

## Not yet verified
Full streamed GLB clip transfer on GitHub CI (private source bytes deliberately absent); physical iPhone Safari; actual Bluetooth controller; foot contact pose aesthetics; commercial source model licensing; general city BVH performance; ragdoll physics; Pack 02 merge into latest main. Do not merge or publish until owner/admin authorization and artifact signoff.