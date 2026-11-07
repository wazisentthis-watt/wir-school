# SKATE PHASE 1 — THE BOARD IS ITS OWN BODY — PROPOSAL / PUBLISH HOLD

From the owner's "How METAL's skating should actually work" + 260-point physics list (2026-11-06) and the Copilot
"Advanced Mechanics Master Build 2" test yard (its board-body idea is ported; its button grind/flip/manual are not).

## What changed
- **Deck rigid body** (`assets/board_body.mjs`): 2.2 kg, per-axis inertia (roll 0.0105, pitch 0.125, yaw 0.132 kg·m²),
  air damping, foot friction damping per foot on the grip. Feet apply **torque impulses**, not tricks:
  - front-foot flick sideways → roll (kickflip / heelflip); flicking off the nose instead → pitch wobble
  - back-foot scoop → yaw (shove-its); back foot sideways → pitch wrap (impossible)
  - flick **speed** sets the torque (snappy ≈ 1 flip / 0.33 s, lazy ≈ 0.6 s): under/over-flips and doubles/triples emerge from torque × airtime.
- **Catching is physical**: each trigger squeezed = that foot touches the deck and its friction damps the spin.
  Too early stops it mid-rotation (bail: upside down / sideways). Too late (> 0.9 s after the kick) = feet miss the deck.
  One foot only = sketchy, or a run-out on a hard landing. Good players squeeze a beat early (the friction finishes the turn).
- **Feet on the deck**: once a foot is on, its stick slides it around its bolt. At touchdown: tail-heavy = board shoots out,
  nose-heavy = nose dive, toe/heel-heavy = washout, centered = clean/perfect.
- **Tricks named from what the board did**: Ollie, Nollie, Kickflip, Heelflip, Double/Triple, FS/BS Pop Shove-It, 360 Shove,
  Varial Kickflip, Varial Heelflip, Hardflip, Inward Heelflip, Tre Flip, Laser Flip, 360 Hardflip, 360 Inward Heelflip,
  Impossible, Late ___ (flick after 0.34 s), body 180/360/540 prefixes, and a fallback for anything nobody named.
- **Grabs**: hold **X** (keyboard **C**) in the air with the board under your feet. Stick picks it: right = Indy,
  left = Melon, up = Nosegrab, down = Tailgrab (mirrored for goofy). Steadies the deck, scores by hold time. Still holding at a hard landing = bail.
- **Bails have consequences**: every bail sends the board off with its own momentum (rolls far on its wheels, scrapes short
  on its side or grip, bounces off ledges). Metal falls (or runs it out) and has to walk over to it. Board back under his feet when he reaches it.
- **Riding-only buttons**: **B** = foot brake (hold), **hold B 0.55 s** = step off + dissolve (Galaxy Gallium forge as before).
  **Y** = Gallium glob, **R1** = Gallium line (unchanged). Off the board nothing changed.
- Fix: a finished bail no longer leaves the next ride stuck in bail state.

## Verified
- `node --test tests/*.test.mjs` → 284 pass; same 2 pre-existing failures as main (SLOTTA count, wall_board_lock).
  New `tests/board_body.test.mjs` (8 simulations): inertia ratio, foot damping, flick torque → kickflip / double,
  early & late catches, one-foot catch, foot placement fails, hardflip / inward heel / impossible / late flip / 360 shove / laser naming, grabs, loose board.
- Headless Chromium, fake Nimbus: ledge slam → loose board kept rolling, Metal walked back and remounted; "Ollie Indy" with X + stick;
  holding B 0.5 s braked 7 → 4.3 m/s, past 0.55 s stepped off; 0 page errors.

## Next phases (plan)
2 Four wheels + two trucks + surfaces · 3 Grinds by contact geometry · 4 Body, falls, Assisted vs Full Physics, camera · 5 Into Savannah (Gallium ramp shapes, swing catch, carry/drop).
