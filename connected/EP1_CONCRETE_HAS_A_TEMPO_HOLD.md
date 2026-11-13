# Ep.1 "Concrete Has a Tempo" — free-roam mission v0.1
**Status: PROPOSAL / PUBLISH HOLD · draft PR · not merged · 2026-11-06**

The first full story mission inside WIR: Connected. It starts in free roam, plays all six beats of the owner's Season One blueprint, saves, and goes back to free roam.

## The block (new lot `morrow`, bx −1 / by −1, north-west of Forsyth Commons)
- **Nia | Field Studio**: Quaternius Building_Small_1, with a rooftop signal dish. Nia waits at the door.
- **Morrow Depot**: Building_Medium_2, plus a walkable loading dock. A **delivery platform** hangs from a steel gantry. Crates and barrels sit on the platform. There is a latch on the beam and a pin lever on the right post.
- **Corner Market**: three booths under a striped awning on four posts, with four shoppers. A front post breaks and the awning hinges down from its back edge.
- **Midnight Garage**: the v0.2 prototype motorcycle is parked out front.
- Words on signs only show with help on. With help off, an amber light pillar marks where to go next. Violet stays on Metal's seams only.

## Beats (rules in `assets/ep1_mission_core.mjs`, 7 node tests)
| # | Blueprint | How it plays |
|---|---|---|
| 1 | Skate to the recording session | Roll up to the studio door and Nia's 96 BPM beat starts. A push, A, Space or a tap on the kick counts if it lands within ±0.13 s. Six hits on the beat make "the take". The session always ends by 40 s, so it can never block you. |
| 2 | Chase Ballast after the depot robbery | Siren and red strobe. Ballast bursts out with a crate (UAL2 Walk_Carry) and runs round the block toward the market. Once you're within 16 m he throws crates at you. Get within 5.5 m to start round one. |
| 3 | Lose the first confrontation | A real fight in the existing fight system, but his stance can't drop below 0.25. Round one ends after 16 s or once you've lost 0.32 HP: he knocks Metal down. "Hitting harder won't work." |
| 4 | Save the civilians under the awning | Ballast snaps the front post. Hold Metal Draw within 6.5 m of the market to brace it: a Galaxy Gallium column props the front edge, the sag reverses, and one shopper walks out every 1.4 s. If you leave it, the awning comes down and the people left under it crawl out **shaken**. Nobody dies. The ledger counts clean vs shaken. |
| 5 | Beat Ballast with the delivery platform | Round two is at the depot. Punches only earn a hint after four. If Metal is more than 8 m away, Ballast goes back to loading his haul under the platform (UAL2 Chest_Open). Drop it on him: a heavy glob on the latch (the latch outranks Ballast for glob aim), or hold Metal Draw at the post for 0.8 s to pull the pin. A miss slams the ground (and hurts if you're under it), then the platform re-hoists in 6 s. A hit pins him. |
| 6 | Return to the session, save, free roam | Back at the studio you get **stem 1/6**, +Gallium, and a log entry. Ballast goes back to his corner as a rematch. Talk to Nia (E) to replay the episode; the stem stays. |

## Save
- Key `wirEp1V1`. It stores checkpoints only: toStudio → chase → platform → return → done, plus the ledger (clean/shaken civilians, platform misses, losses, stems, best time).
- A reload mid-fight resumes at the last checkpoint. `?ep1=reset` clears the save.

## Also in this PR
- **Sound** (owner WAVs → MP3):
  - bell at the start and end of every spar, crew fight and story round;
  - crowd and ring music under fights;
  - ring ambience near the Fight Lot;
  - phase-in when a ReFramer drops onto a car (machines only; Metal never teleports).
- **Metal glob throw**: uses the UAL2 OverhandThrow retarget when he's on foot.
- **Lil Heavy**: the v0.2 design (black 0.53 m deck, pale wheels, four violet tendril legs that walk). The violet strip only lights when he's active.
- **Motorcycle**: the v0.2 design, driven by the same Rush DrivePhysics with steer ×1.13. It has a lean and a smaller collision radius, and Metal rides it with hands on the bars (Walk_Carry pose frozen).

## Evidence
- `node --test tests/*.test.mjs`: 307 pass. The 2 failures were already on main (SLOTTA count, wall_board_lock).
- Headless Chromium (swiftshader) ran the full mission with a fake standard gamepad, from a cold load to `done`. Results:
  - 6/6 on-beat hits;
  - crate toss;
  - round one stance held at 0.25 through 20 heavy hits, then the scripted loss;
  - 4/4 shoppers out clean;
  - Ballast standing at his haul 0.1 m from the platform centre;
  - glob on the latch, then pinned, then return, then done;
  - save written;
  - all 5 audio buffers decoded;
  - bike rode 27.6 m;
  - 0 page errors.
- **UNTESTED:** real Nimbus or other physical controller, iPhone Safari, real GPU frame times.

## Rollback
Revert this PR. The only new storage key is `wirEp1V1`. The Ballast sidewalk encounter goes back to how it was before this PR.
