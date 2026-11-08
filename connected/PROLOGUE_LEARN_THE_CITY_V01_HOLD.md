# Prologue · Learn the City v0.1 — PROPOSAL / PUBLISH HOLD (2026-11-07)

This is the first mission of the game. It starts by itself on a fresh save and hands off to Ep.1 at Morrow Block.
No canon story is invented: the title, step order, crew, numbers and button choices are all **PROPOSAL**.

URL switches: `?prologue=0` turns it off · `?prologue=reset` starts over · `?prologue=1` replays a finished one.
Save key: `wirPrologueV1`. Reloading mid-fight puts you back at the crew.

## The 15 steps
| # | Step | What it teaches | Pad (keys) |
|---|---|---|---|
| 1 | Where you are | You're Metal. Savannah — WIR: Connected. Forsyth Commons is home. The lots around it. Amber light = where to go | right stick (mouse) |
| 2 | Move | walk 10 m + jump | left stick, A (WASD, Space) |
| 3 | Your board | forge it from Galaxy Gallium | B |
| 4 | Push | push to 5.5 m/s, lean to steer | A, left stick (W, A/D) |
| 5 | Ride the line | three amber gates on the road south of the Commons | — |
| 6 | Ollie | knees, then the snap | L2+R2, snap R2 (hold/release Space) |
| 7 | Gallium Gallop | chain 3 on-beat strides | X (C) |
| 8 | Gallium Line | swing | R1, R1 again to let go (Q) |
| 9 | Crown points + Snapline | mark the anchors ahead, commit the arc | D-pad ◀ / ▶ (1 / 2) |
| 10 | Something's wrong | a crew is stripping a car on the street west of the Commons | follow the amber light |
| 11 | Three of them | the street fight (below) — restrain all three | X strike · B dodge · Y glob · D-pad ▲ bind |
| 12 | Police pickup | cuffs hold until the police come; the cuff Gallium drips back as puddles | — |
| 13 | Every power you have | cycle all 14 power cards; use glob, blast, pull, plus one shape (sword / shield / plasma) | D-pad ▼ (3) |
| 14 | That's the city | Ep.1 starts at Morrow Block (Nia's Field Studio) | follow the amber light |
| 15 | done | | |

The teaching steps never block you: after 60 s they move on and are logged as skipped. The fight can't be skipped. If Metal goes down, the crew resets and you run it back.

## New villain logic: the Scrap crew (`assets/scrap_crew_core.mjs`)
- **Brawler:** stands and fights; the existing fight system runs him.
- **Thrower:** keeps 7–12 m away, winds up for 0.7 s, then throws a brick that flies a real arc. Dodge as it arrives, close in, or glob him.
- **Lookout:** grabs the wheel and runs a real road route away from Metal.
  - Once he's more than 14 m away he's out of the fight, so B makes the board for the chase.
  - Catch him (within 2.3 m) and he gives up.
  - He tires after 22 s, so he can always be caught.
- **Reading the room:** when two are down, the last one gives up, unless he's the lookout and still well clear.
- **Giving up:** someone who has given up can't be hit; you restrain them.
- **Nonlethal:** down → bound → picked up by the police.

## Gallium Bind (works everywhere, not just in the prologue)
- **Input:** D-pad ▲ or E next to anyone tapped out or giving up.
- **Cuffs:** galaxy-crystal cuffs cost 0.04 Galaxy Gallium.
- **Bound people stay down:** they don't get back up.
- **Street crews:** police take bound people after 12 s, and the cuff Gallium drips back as a puddle, so nothing is lost. The crew comes back on its normal cooldown.
- **Not bindable:** Ballast (Ep.1), the Framebreakers (they have their own surrender) and rivals.
- **First say:** Bind gets first say over E only when someone is down within 2.4 m. Otherwise E and D-pad ▲ still do what they did before.

## Power cards (everywhere)
D-pad ▼ (keys: 3) shows a card for each of Metal's 14 powers: name, pad or keyboard buttons, and whether you've used it.

## Also changed
- **ReFramers:** they don't drop during the prologue lessons. Everywhere else there's now a 75 s gap between encounters. With city-wide wake, a Roadframe was hitting Metal about every 25 s.
- **Clean HUD mode:** the prologue card and the power card carry the `wir-keep` class, so they stay up when it hides everything else.

## Verified (headless Chromium, swiftshader, fake standard-mapping pad)
- **Full run from a cold load to done:**
  - All 15 steps in order.
  - Gates 3/3 in 5.4 s; one pop; Gallop chain 3; one swing (tap mode).
  - Snapline on the first heading (street lamps).
  - Crew alerted at 16 m; police pickup turned 3 cuffs into 3 puddles.
  - 14/14 cards seen; used: glob, blast, pull, sword, plus everything from earlier.
  - Saved as `done`, 0 page errors.
- **Fight from 20 m out:**
  - The lookout ran 27.6 m down the road within 6 s.
  - The thrower wound up and threw, and the brick was dodged (ledger dodges 1).
  - The brawler went out from X strikes; the thrower went out from globs.
  - The lookout was out of the fight at range, B made the board, and he was run down in 9 s and gave up.
  - All three bound.
  - Metal's health stayed flat for 8 s after the fight (before the ReFramer gap it was being rammed).
- **Regressions:** Ep.1 (complete, save written), Wrong Target (COMPLETE, trust 68), Galaxy Gallium kit and Framebreakers, Gallop and Snapline. All unchanged, 0 page errors.
- **Node:** `tests/prologue.test.mjs` 9/9. Full suite 344, 342 pass. The 2 failures are the same ones already on main (SLOTTA count, `wall_board_lock`).

**UNTESTED:** a physical Nimbus controller, iPhone Safari and a real GPU.
**Not done:** a hands-up pose for surrendering (no clip; they stand idle). The police are a light and a timer, not officers. The lookout runs straight route lines with no navmesh.
