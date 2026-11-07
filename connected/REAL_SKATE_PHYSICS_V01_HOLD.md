# REAL SKATE PHYSICS v0.1 — PROPOSAL / PUBLISH HOLD

Opt-in only: `?real_skate=1` (add `&stance=goofy` to mirror the feet; Metal's canon stance stays **regular**).
Without the flag nothing changes: the old MSK skate core, box kickers, rail and bowl stay exactly as live.
MISSION05 ignores the flag.

Owner brief (RB1 voice, 2026-11-05): the controller teaches you how to really skate. Tap A to push, the stick is
real lean (not "hold left to go left"), L2+R2 bend the knees and load the ollie, pops depend on which foot does what,
flips come from a foot that is off the board flicking its stick, spins have to come from the pop, rails come from
ollies with very sensitive balance, and the Skatepark needs ramps like the METAL Test Yard.

## Controls (SteelSeries Nimbus / standard mapping)

| Input | What it is physically |
|---|---|
| **A (tap)** | one push stroke. A rhythm of taps keeps you pushing. Holding A does nothing extra. No pushing up a transition. |
| **Left stick X** | board lean. Lean → trucks turn (real truck geometry, 0.42 m wheelbase) → carve radius. Lean hard at speed and the wheels lose grip → powerslide (board swings sideways, scrubs speed — nearly a boardslide). |
| **Left stick Y** | weight. Back ≈ 60 % = manual (hold the balance point; too far = loop out, too little = sets down). Forward = nose manual. Hard back = foot brake. Slow + weight + lean = kick-turn pivot. |
| **L2 + R2 (hold)** | bend both knees (Metal visibly crouches). Deeper / longer squeeze = higher pop. |
| **Snap the back-foot trigger** (regular: R2) | POP. Snap the front one (L2) instead = nollie. Let both off at once = weak hop. Let them off slowly = you just stand up (that is how you pump). |
| **Ease the front-foot trigger off** | the slide that levels the board. 0.06–0.16 s after the pop = PERFECT POP (extra height). Never = tail-dragging board, lower, sketchy. |
| **Squeeze L2 + R2 again in the air** | feet back on the bolts. Needed for a PERFECT ollie, required to catch any flip. |
| **Flick a free foot's stick** (its trigger must be off) | kick the board. Front foot (left stick): left = kickflip, right = heelflip. Back foot (right stick): scoop = BS / FS shove-it, hard scoop = 360. Both together = varial / tre family. Flicking while that foot is still on (trigger held) does nothing. |
| **Spin** | set by your lean / stick at the moment of the pop (half wind-up ≈ 180, full ≈ 360). In the air you only get a little body English, less once the board is loose. |
| **Rails / ledges / coping** | no grind button: ollie onto them. Board angle to the rail picks 50-50 / crooked / smith / boardslide / lipslide. Left stick X balances (body lag ~0.14 s, so over-correcting throws you off the other side); stick Y moves weight to 5-0 / nosegrind. Pop out with the same ollie motion. Coping only locks if you lean in over the lip (stick forward at the top). |
| **Transitions** | real slope gravity, vert lip throws you straight up and you come back in fakie unless you spin. Pump: squeeze on the flat, ease off while riding up the curve (angular-momentum model). |
| **B** | still dissolves the board / bails. **R1** still throws the Gallium line. Menu still pauses. L2/R2 never start flight or charge while riding. |

Keyboard assist (not the design target): W tap push · A/D lean · S manual (Shift+S brake) · hold Space = knees, release = pop with a good slide · arrows right after the pop = flick · Space again = catch.

## Skatepark (Test-Yard-style, compacted to the 44 m lot)
Halfpipe (3.6 m radius, 80°, ~3 m deck, steel coping both sides), wall quarter pipe (72°), funbox with top rail and two
edge ledges, kicker, 15 m flat bar, long ledge, manual pad, three-stair with handrail. 13 grindable edges. Surfaces
are height profiles + boxes, so physics and meshes come from the same numbers. Ramp backs and ledge sides block
walking; Metal can walk up ramp faces.

## Files
- `assets/real_skate_core.mjs` — pure rider physics (push, lean/trucks/grip, weight, triggers/pop/slide/realign, flicks, spin, landing, grind balance).
- `assets/real_skate_ride.mjs` — runs the core on surfaces (slopes, vert lips, roll-offs, rails, pumping, bails, line scoring).
- `assets/skate_yard_world.mjs` — park layout, heightfield, rails, Three.js meshes.
- `assets/main.js` — flag, park swap, pad capture while riding, ride step, board/rider pose, crouch IK, small trigger/balance HUD with hints that fade after a dozen tricks.
- `tests/real_skate_core.test.mjs` (18) + `tests/real_skate_ride.test.mjs` (10) — headless simulations of every rule above.

## Physics numbers (real, not arcade, where it matters)
Rolling resistance μrr ≈ 0.022 (scaled by the normal force on slopes), quadratic air drag 0.004 v², grip μ 0.72,
pop 3.2 + 1.9·load (+0.5 perfect slide) m/s → perfect ollie ≈ 1.7 m (v7 canonical ollie ≈ 1.76 m — Metal is enhanced),
push curve kept from v7 (~5 m/s after 1 s of rhythm, cruise cap 8.5). Hard landings over 14.5 m/s normal impact bail.

## Verified
- `node --test tests/real_skate_*.test.mjs` → 28/28.
- Full suite: 267 pass; the 2 failures (`SLOTTA … 3 active + 5 stored`, `wall_board_lock.test.mjs`) fail identically on main without this change.
- Headless Chromium with a fake Nimbus pad: 4 A taps → 7.1 m/s; halfpipe vert 3.5 m above floor, lands fakie; snap-R2/ease-L2 → PERFECT POP onto the flat bar → balanced 50-50 to the end → rolled away; kickflip caught with the triggers; hard lean at 10 m/s → powerslide; R2 on the board never starts flight; B still dissolves the board; zero page errors.

## Open (needs owner ruling)
- Board-lock canon (board stays attached under the left foot — mechanism OPEN) vs. real flips where the board leaves the feet: this build lets it leave only while a foot is kicking it and the triggers have not caught it. PROPOSAL.
- `stance=goofy` player option is a PROPOSAL; Metal stays regular.
- Park layout is a PROPOSAL adapted from the owner's METAL Test Yard numbers.
