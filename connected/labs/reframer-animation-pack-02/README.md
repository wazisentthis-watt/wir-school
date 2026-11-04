# ReFramer Animation Pack 02 | Aerial counter + full-body motion upgrade
**PROPOSAL / PUBLISH HOLD, NO MERGE, NO DEPLOY.**

### Source provenance
This development branch extends ReFramer Pack 01 commit `de7f6f86a7885fe16ed99ad312cbc21c9031650d`. The source GLB has 65 verified bones, 21 existing clips and three skinned meshes. The original GLB binary has not changed. The real Savannah main branch has separately advanced and does not contain Pack 01 at time of starting this task. Keep this feature stacked until owner approves source convergence; never overwrite the current Savannah build.

### Exact opt-in behavior
Locally serve the repository root (`python3 -m http.server 8765`), then open:
`http://localhost:8765/connected/?lite=1&aerial_duel=1&reframer_pack2=1`
Click **REFRAMER ROOFTOP DUEL · TRAINING**, then **REFRAMER · PACK 02** to see all eight Pack 01 motions, including three newly authored full-body versions.

The three improved motions use distinct **six-pose quaternion keyframes** across 16–17 real bones, rather than Pack 01's symmetric single-gesture five-key envelope. The original mixer, existing base clips, Forge and story saves are preserved. The airborne tumble includes a 360° *visual model spin* synchronized to current roof-relative altitude and blended back to rest; rooftop physics, actual center of mass, and collision boundaries are still owned by the original deterministic duel solver.

With `reframer_pack2=1` enabled, a ReFramer struck into the air can attempt **one** telegraphed counter per launch/pursuit. It gives METAL 0.48s to press **B** for dodge. On contact the hit removes 0.105 health with bounded knockback; on successful dodge it causes no damage. METAL's confirmed finisher can interrupt a pending counter. No extra gamepad buttons are added. **Air counter gameplay is disabled** in the existing rooftop and Pack 01 URLs, so both earlier runs remain unchanged.

### Limitations
These are original in-game authored FK/quaternion motion tracks, **not** externally downloaded mocap, guaranteed real-time foot IK, physical ragdoll or canon-locked ReFramer art. A proper mocap artist should refine foot planting, shoulder/palm contact and the air-turn transitions later. Physical Safari/Xbox/Nimbus testing remains open. All visuals and AI remain inside the private training arena.

### QA
`node --test connected/tests/reframer_animation_pack02_core.test.mjs connected/tests/reframer_animation_pack02_integration.test.mjs`
The GitHub Actions browser job must verify real model tracks, full spin, dodgeable telegraph, original save data, iPhone-size touch and old rooftop regression. The trusted HOLD authorization check is expected to block any release.
