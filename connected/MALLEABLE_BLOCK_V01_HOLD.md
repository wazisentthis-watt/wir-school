# MALLEABLE MORROW BLOCK v0.1 + METAL × REFRAMER LIMBS — PROPOSAL / PUBLISH HOLD

Sources (RB1, 2026-11-06): "One Game, Every Power, A World You Can Physically Change" (first playable milestone:
one block with a skate spot, a breakable wall, a bendable rail, a repairable structure, material pickups and a mission
giver — and the game remembers), "METAL × REFRAMER RUSH" (fight the actual limbs, rescue, repair instead of destroy,
ReFramers react to what Metal does), and the skating brief (already in Skate Phase 1).

## The block (Skatepark lot)
- **Material is real**: Gallium = 0–100 units (st.gal). Constructs commit material until reclaimed.
- **Constructs you actually ride** — hold the glob (**G / Y**) and flick the **right stick** (or arrows):
  **↑ Gallium ramp** (30 units, curved kicker that launches the board by its real shape),
  **← / → Gallium rail** (15, grindable), **↓ Gallium shield** (20, a wall that blocks). Black galaxy crystal.
- **Reclaim** = Metal Draw (hold 5 / K / L1) on it: matter streams back. Damaged constructs give back less.
- **Bendable bar**: a heavy glob that hits the skatepark's flat bar bends it where it lands (direction of the hit,
  down if from above). The grind follows the new shape ("Bent Flat bar"). Draw on it 1.5 s to straighten (8 units).
- **Breakable wall** (12 masonry panels): globs, flipped/thrown cars and heavy strikes crack and break panels; unsupported
  panels above fall (support rule: carried from below or bridged between two carried neighbours). Fallen panels are rubble
  you can draw. **Repair**: Metal Draw at the wall patches it bottom-up with Gallium (10 units/panel) — patched panels are crystal.
- **Osei's job board** (E to talk; Knowledge · Mastery · Resources): Material run (draw 40) → The Missing Span (build a ramp,
  0.5 s of air off it → **Gallium rail learned**) → Reshape the line (bend the bar, grind its new shape) →
  Don't Let It Fall (repair the wall to full → **Gallium shield learned**). Normal skating is never locked.
- **The world remembers**: constructs, the bar's shape, wall panels / patches, jobs, unlocks and units are saved
  (compact JSON, ~550 bytes, `localStorage wirWorldV1`). `?world=reset` starts fresh.
- Soft aim: globs lock the nearest bendable / breakable / mechanical target in front of Metal.

## ReFramers (Metal × ReFramer Rush)
- **Limbs, not a health bar**: each of the 8 arms can be torn off (globs / strikes at the clamp). 3 arms off during the clamp
  topples it; fewer arms = slower dismantling. On the Roadframe, the wheels are the **outriggers**: 3 off and it collapses.
- **Reactions**: outriggers up when Metal swings (arms take half), goes after nearby Gallium constructs (damages them),
  works faster once the driver is rescued (guards the parts), a huge glob during the teardown makes it flee **with the parts**.
- **Repair instead of destroy**: stop it after the wheels came off → the parts scatter; hold draw near the car and they fly back
  into place. All back = the car returns to traffic (ledger outcome `repaired`).

## Files
`assets/malleable_world_core.mjs` (pure), `assets/reframer_core.mjs` (limbs, reactions, part repair), `assets/skate_yard_world.mjs`
(rail mesh tags), `assets/main.js` (block, constructs, bar, wall, Osei, save, aim assist, ReFramer limb hits), tests
`tests/malleable_world.test.mjs` (8 simulations).

## Verified
Unit suite: all new tests pass; only the 2 pre-existing failures on main remain (SLOTTA count, wall_board_lock).
Headless browser (fresh world): drew 45 units next to a car → job 1; a glob bent the flat bar (3 points) and the grind
read "50-50 on Bent Flat bar" → job 3; built a Gallium ramp (−30), rode it at 8.5 m/s → 1.7 m air, landed → job 2, rail learned;
3 globs broke a column of the wall (3 panels), drawing at it patched them back → job 4, shield learned; saved 551 bytes;
**after a full page reload** the ramp, the bent bar, the 3 crystal patches and all jobs were still there; 0 page errors.

## Not in this pass (next)
Pressure Reading view, support graphs for real buildings, entering/driving cars (ReFramer Rush DrivePhysics), more blocks.
