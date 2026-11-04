# WIR METAL | Planted R2 Push + Paired Throw Animation v2

**PROPOSAL / PUBLISH HOLD.** Separate stacked draft PR #26 against vNext PR #25, which remains unmerged. Original GLBs, FBXs, game files, saves and deployment are untouched on `main`.

## Implementation
- `connected/assets/metal_motion_choreo.mjs`: immutable motion-asset wishlist and pure deterministic `SkateStrokeChoreo` / `PairedThrowChoreo` timelines. Choreography owns *poses*, never movement physics or extra impulses.
- Actual `main.js` connects `PressureStep` R2 press/hold/release to the original Phase 6 two-bone leg IK. The **left prosthetic stays on the board's nose**, and the right biological foot follows `strokePoint(u)`, with load, grounded toe contact, push drive, and recovery. The existing `skateGround` owns speed, coast/drag/carve. The choreography cannot cause continuous acceleration.
- Actor throw starts a wind-up, maintains the target's physical attachment to Gallium during loading and triggers the already existing `applyCombatHit` exactly once at 0.32 seconds. The target proxy enters `ragdoll-proxy` and the existing gravity/contact solver. The player torso and held target react during loading. Civilians retain safe release rather than hostile throws.
- `?metal_next=1` gates all runtime changes. `?metal_motion_qa=1` supplies read/write test hooks **only on the opt-in draft** for deterministic in-game QA.
- Original 70-bone Gorillium GLB and 31 preserved clips are NOT rewritten or claimed to have new real recorded motions. The current Phase 6 character receives procedural IK, and villain proxies receive procedural body motion.

## Play from a checked-out review branch
```sh
python3 -m http.server 8765 --bind 127.0.0.1
# Desktop proposal:
# http://127.0.0.1:8765/connected/?controller_v3=1&metal_next=1
# Lite proposal:
# http://127.0.0.1:8765/connected/?lite=1&controller_v3=1&metal_next=1
```

R2 short tap/release = individual skate push with leg-stroke animation; R2 hold/release = RIFFT on a physical surface. LB grab then LB+Y = paired actor throw; LB+RT retains existing world/car throw priority. No L3/R3 needed. Defaults unchanged when `metal_next` flag absent.

## Reproducible gates
```sh
node --check connected/assets/main.js
node --check connected/assets/metal_motion_choreo.mjs
node --test connected/tests/metal_motion_choreo.test.mjs
node connected/tests/metal_motion_choreo_browser_playwright.mjs
```
The in-game browser test boots actual Metal Phase 6 and uses a real Ballast actor, checks stance loading and one impulse, release marker and body state, then loads the default legacy route to check save compatibility.

## Asset gaps / next acceptance
**Still required**: original paired reach/grip/load/throw/impact/recovery FBX or BVH clips, clean target skeletons and skin weights, final push animation for all Metal forms, knee and foot IK pole correction on slopes, landed victim collision with buildings, motion warp/root correction, iPhone Safari paired-controller test, reliable camera-spin hardware mapping, and current GLB/FBX provenance. Some old uploads expired: re-upload source files only if exact retargeting is requested. New enemies are provisional WIR power proxies, not final character likenesses.

**No merge, no publish.**
