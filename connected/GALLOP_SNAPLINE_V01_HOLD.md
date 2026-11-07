# Gallium Gallop + Crown points / Magnetic Snapline v0.1 — PROPOSAL / PUBLISH HOLD (2026-11-07)

Two of Metal's skating powers from the 73-entry registry, built into WIR: Connected's real-skate ride.
Canon source: the S1 move unlocks from the Godot / METAL_TOPDOWN builds (ARC L414-420, ARC L446).
Everything about timing, numbers and button choice is **PROPOSAL**.

## Gallium Gallop (canon S1E9)
"THOOM-tik": he compresses, anchors on a real surface and releases. Every stride lands on all four wheels.

- **Pad:** X while riding on the ground or a rail. In the air X is still grab. **Keys:** C.
- A stride needs a foothold (ground or rail). It is never a mid-air step, and rolling off mid-load cancels it with nothing spent.
- Tap again 0.1–0.6 s after the landing ("tik") and the strides chain. Chained strides push harder, up to the board's top speed of 16 m/s.
- A hard stick lean breaks the rhythm and costs 1.5×.
- Each stride costs 0.03 Galaxy Gallium. That Gallium is the anchor: it stays on the foothold as a puddle, and L2+R2 on foot pulls it back. Material is conserved.

## Crown points + Magnetic Snapline (canon S1E11)
- **Pad:** D-pad ◀ marks the next anchor ahead, up to 3 (lamp tops and roof edges). D-pad ▶ commits the Snapline. **Keys:** 1 / 2.
- Each Crown point parks 0.04 Gallium at its anchor.
- The committed arc is drawn in violet. It clears every roof under it: the arc is sampled every 0.2 m and lifted until clear.
- There is no cancel mid-arc. Input during the arc is ignored.
- It never teleports: movement is capped at 0.6 m per frame whatever the frame time.
- It lands on the first floor past the last point that a clean descent can reach, on four wheels at 12 m/s.
- After landing, or if points sit unused for 14 s, the anchors drip down to the floor below as puddles. Nothing is lost.
- If something knocks him off the board mid-arc, the arc drops and the anchors drip down where they are.

## Not built
- **Heavy Halo:** no definition exists in any build, note or chat. It is listed as OPEN, and I didn't invent one.
- Gallop only works on the real-skate ride, which is the default. With `?real_skate=0` (old skate) there is no Gallop or Snapline.
- Canon unlocks are S1E9 and S1E11. In free roam both are available now. Episode locks are pending the owner's call.

## Verified (headless Chromium, swiftshader, fake standard-mapping pad)
- **Five strides:** speed 8.1 → 10.0 → 12.4 → 15.0 → 16.0 (capped), chain 1–5, no bails, every landing on four wheels.
- **Gallop material:** five puddles left behind; reserve plus puddles 0.920 → 0.920 (conserved).
- **Late press:** a press 1.2 s after a landing starts a new chain (chain 1).
- **Snapline over a 12.3 m roof:**
  - 2 Crown points, a 44.5 m arc in 132 frames.
  - Largest single step 0.333 m. Lowest clearance over solids 4.52 m.
  - A cancel attempt (stick, A, B) mid-arc was ignored.
  - Landed on the floor (y 0.25 = floor 0.25) at 11.9 m/s, board still under him.
- **Snapline material:** the anchors dripped to puddles. Reserve plus puddles before marking 0.920, after landing 0.920.
- **Regression:** the Galaxy Gallium kit and Framebreaker sim are unchanged, with 0 page errors.
- **Node:** `tests/gallop_snapline.test.mjs` 9/9. Full suite 335, 333 pass. The 2 failures are the same ones already on main (SLOTTA count, `wall_board_lock`).

**UNTESTED:** a physical Nimbus controller, iPhone Safari and a real GPU.
