# MOVES — kinetic-chain hand library (v5)

Fluid, loose, dexterous single-hand moves ("jellyfish hands") recognised from the 21 MediaPipe hand landmarks **over time**.
Engine: `moves.js` (pure JS, no DOM). Tests: `node tests/moves.test.mjs` (synthetic landmark sequences per move, jitter + stiff-hand runs, negative idle/point/slow/cup-hold runs).

**The ✌️ two-finger gesture is gone.** Everything it did is now the soft **Cup 🤲** (hold) and its moves (tilt = pour, flick-open = release).

## Features (per frame)
| Feature | From landmarks |
|---|---|
| `n[0..4]` finger extension 0–1 (thumb…pinky) | tip-to-wrist ÷ PIP-to-wrist (thumb: tip-to-17 ÷ 2-to-17), **normalised by the user's own min/max** |
| `m` | mean of the four fingers' `n` |
| `cross` | signed 2D cross (5−0)×(17−0) ÷ scale² → palm vs back of hand facing the camera |
| `roll` | angle of wrist→middle-MCP (0→9), unwrapped → in-plane wrist rotation |
| `Q` | palm length ÷ width ( |0–9| ÷ |5–17| ) → foreshortening when the palm turns up/down |
| `sc`, `w` | palm length and width in px → push/pull toward the camera |
| `thumbX` | thumb tip projected on the 5→17 knuckle axis → thumb sweep |
| `tipD[4]` | thumb tip to each fingertip ÷ scale → thumb roll |
| `x,y,vx,vy` | palm centre and smoothed velocity |

History: 1.6 s ring buffer per hand. Each move has a 0.55 s cooldown. Events are fired as `move:<name>` (training, classes) and remapped per element.

## Calibration (per user)
- Running min/max per finger (`lo[5]`, `hi[5]`): expands instantly when the user goes further, relaxes back slowly (2 %/s), so a stiff or small-range hand still reaches 0…1.
- `faceSign` learned from the first clearly open palm → tells palm-toward-camera from back-of-hand (works for left or right hand and either camera, mirrored or not).
- `Q0` palm-shape baseline adapts slowly (for palm up/down).
- Saved in `localStorage['wirlab.moves']` and synced into the profile (`cur.moves`). The calibration's step 2b is now **"cup your hand softly"** (was ✌️).

## Static poses (debounced)
`open` · `poke` ☝️ (index only) · `cup` 🤲 (all four fingers 16–62 % curled, none straight) · `fist` · `relaxed`.

## The library (18 moves + 2 held states)
Diff = difficulty 1 (easy) … 3 (dexterous).

| # | Move | How to do it | Detection (features + temporal pattern) | Water | Fire | Earth | Air | Strings (PROPOSAL) | Diff |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Finger ripple** 〰 | Wave the fingers pinky → ring → middle → index, like a wave rolling off the hand | In 1.1 s, each finger's `n` dips ≥0.3 below its earlier max and recovers ≥0.22; dip times are ordered pinky<ring<middle<index (≥3 consecutive fingers), span ≥0.08 s | Wave across the pool | Flames hop along each fingertip in sequence | — | Motes stream off the fingertips | **Weave** (Right Core express: ripple-out) | 2 |
| 2 | **Reverse ripple** | Same, index → pinky | Same, opposite order | Wave the other way | Reverse flame run | — | — | Weave (Left Core receive: ripple-in) | 2 |
| 3 | **Jellyfish pulse** 🪼 | Let the hand soften halfway closed, then bloom open again | `m` > 0.62 → < 0.45 → > 0.62 within 1.1 s, the closed phase < 0.75 s and never a full fist | Bloom spray (fountain ring) | (burst if pushed) | — | **Gather an air ball** (held 1.2 s; cup keeps it) / frost-breath on a held item | **Open** stage | 1 |
| 4 | **Flick-open** 💥 | Hold a soft fist ≥0.2 s, then burst it open | `m` < 0.16 for ≥0.2 s, then `m` > 0.7 within 0.28 s of the fist ending | — | **Burst** / releases a charged ember | **Shatter** the held / nearest rock | — | **Release** (Right Core express) | 1 |
| 5 | **Finger-by-finger curl** ✊ | Fold the fingers down one at a time into a fist | Each finger's `n` crosses below 0.45 in order (index→pinky or pinky→index), ≥0.18 s span, ends with `m` < 0.3 | — | **Snuff** (puts out ember + flame, smoke puff) | — | — | **Clasp** stage | 2 |
| 6 | **Wrist flip** | Turn the hand over: palm ↔ back | `cross` sign changes (|cross| > 0.12 both sides) within 0.6 s | — | — | — | — | Right Core express (outer wrist) | 1 |
| 7 | **Wrist roll** (dial) | Rotate the hand in the camera plane like turning a dial | Unwrapped `roll` changes > 1.3 rad in 0.7 s | — | — | — | — | Weave (turn the strand) | 2 |
| 8 | **Palm turn up** | Tip the palm to face the ceiling, as if offering | `Q` drops below 62 % of the baseline after being ≈ baseline, `cross` sign stays the palm-facing sign | — | — | — | — | Left Core receive (inner palm) | 1 |
| 9 | **Palm turn down** | Tip the palm to face the floor, as if covering | Same, while the back of the hand faces the camera | Drops a held item | | | | Return | 1 |
| 10 | **Scoop** | Cup, dip down and sweep up in a U | Palm `vy` > +160 px/s then < −160 px/s within 0.8 s, hand soft (`m` < 0.8), depth > 0.35 × palm length | **Scoop an orb** from the pool | — | **Scoop a rock up** | — | **Left Core receive** (gather) | 1 |
| 11 | **Pluck** | Snap one finger in and out, like plucking a string | One finger's `n` drops > 0.3 and recovers within 0.4 s while every other finger moves < 0.22 | — | — | — | — | **Pluck a strand** (Left Core fingertips) | 2 |
| 12 | **Thumb sweep** 👍 | Brush the thumb across the palm and back | `thumbX` travels > 0.55 of the knuckle width within 0.5 s, fingers steady (Δm < 0.2), palm width steady (not a flip) | — | **Sparks** off the thumb (striking a match) | — | — | Weave (thumb strums) | 2 |
| 13 | **Spiral** 🌀 | Draw circles with the wrist (keep circling) | Palm path winds > 1.6π around its centroid in 1.3 s, radius > 0.15 × palm length; continuous `spin` rate exported | Vortex | Fire tornado | Dust vortex | **Spin up the air ball** | **Charge** | 1 |
| 14 | **Push** | Push the palm toward the camera | Palm length ×1.18 and width ×1.12 within 0.35 s | — | Burst | — | **Throw the spun air ball** | Right Core express | 1 |
| 15 | **Pull** | Draw the palm back toward you | Palm length ×0.85 and width ×0.89 within 0.35 s | — | — | — | — | Return / receive | 1 |
| 16 | **Thumb roll** | Roll the thumb tip along index → middle → ring tips | Nearest thumb-to-fingertip contact (< 0.28 × scale) moves index → middle → ring in order within 1.5 s | — | — | — | — | **Weave** (counting the strands) | 3 |
| 17 | **Shake** | Shake the hand loosely side to side | ≥ 4 reversals of palm `vx` (|vx| > 220 px/s) within 0.9 s | Fling droplets | — | **Tremor** (rocks hop, dust) | — | Release (shake it off) | 1 |
| 18 | **Beckon** | Index alone curls in and out twice ("come here") | Two index plucks within 1.2 s while the other fingers stay curled | — | — | — | — | Left Core receive (call it in) | 2 |
| S1 | **Cup** 🤲 (held state) | Soft half-curled hand, like holding water | Static pose `cup` ≥ 3 frames | Hold water in the palm (orb) | **Charge an ember** | **Grab a rock** | Hold the air ball | **Charge** (hold) | 1 |
| S2 | **Pour** (held state) | While cupped, tilt the hand to one side | `cup` + roll changed > 0.5 rad since the cup started; sign = direction | **Pour** a stream (makes the pool) | — | — | — | Release (pour out) | 1 |

Kept from before: ☝️ poke (flame / water stream / press buttons), open palm (strands, burst + push, gust), flick (throw), two-palm clap combo, two palms close = air ball.

## Items (tray 🧺)
- Grab: **scoop**, **pull** or a fresh **cup** near an item; near the open tray it pulls the selected item out into the palm. Tap an item twice in the tray as a touch fallback.
- Held items follow the palm. **Flick-open** or a fast flick throws. **Wrist flip** or **palm down** drops. **Pour** tips the cup of water.
- **Pulse** in Air mode = frost breath on what you hold.

## Attunement strings canon mapping — PROPOSAL (not canon yet; for Phatom to confirm)
Canon (from /bending/): **Left Core receives** (inner palm / fingertips) · **Right Core expresses** (outer wrist / knuckles) · Clasp stages **Open → Weave → Charge → Clasp → Release**.

| Canon slot | Proposed moves | Why |
|---|---|---|
| Left Core — receive (inner palm, fingertips) | Scoop, Cup, Palm turn up, Pluck, Thumb roll, Beckon, Reverse ripple | Movements that gather toward the palm or touch with the fingertips |
| Right Core — express (outer wrist, knuckles) | Flick-open, Wrist flip, Push, Shake, Finger ripple (outward) | Movements led by the back of the hand / wrist that send energy out |
| Open | Jellyfish pulse (bloom) | Hand opens and breathes |
| Weave | Ripple / reverse ripple, Thumb roll, Thumb sweep, Wrist roll | Fingers interlace motion along the strands |
| Charge | Cup hold, Spiral | Holding and winding up |
| Clasp | Finger-by-finger curl → fist | Literally closes the hand in sequence |
| Release | Flick-open (and Pour / Shake as soft releases) | The burst out of the clasp |

A natural strings combo would then read: **pulse (Open) → ripple (Weave) → cup + spiral (Charge) → curl (Clasp) → flick-open (Release)**, every stage detectable by the engine today.

## Test results (synthetic sequences)
`node tests/moves.test.mjs`: 18/18 moves recognised; 180/180 under jitter, 180/180 for a stiff-fingered user (range 0.2–0.7) with calibration. Negatives (3 s idle open hand with noise, steady point, slow sideways move, 2 s cup hold) fire no move events.

## v6 — keeper flame, floating water, wrist skill, two-palm charge blast (+ phone-video fixes)
**Keeper flame (Fire).** One small flame always hovers in front of your hands, like carrying a flame you must keep alive while walking. Every move feeds or shapes it (`keeper.js` FEED table): ripple / reverse ripple = flicker · jellyfish pulse = it breathes · flick-open = flare · spiral / wrist roll = swirl · push = it stretches out · pull / beckon = drawn in close · curl / palm down = banked low (**never goes out**, heat floor 0.15) · palm up / scoop = lifted · pluck / thumb sweep = sparks · thumb roll = weave ring · flip = lean · shake = wild flicker · cup = sheltered · pour = spills sideways. No dark smoke anywhere in Fire mode (curl no longer makes smoke; explosion smoke is light and faint).

**Floating water (Water).** Cupped water (and held water over an empty floor) floats **above** the hand as a ribbon with 5 control points, one per fingertip: height = that finger's extension, x = its tip, and the tip's own velocity bends its part. Curl one finger and only its part drops.

**Palm up = wrist skill.** Kept on purpose: fingers pointing straight at the camera do not count; angle the palm toward you. Tolerance relaxed (Q ratio 0.62 → 0.68, `PU_TOL`). Half-tilt held 0.45 s shows "Palm up? Tilt your palm toward you". New lesson **Oru of the Quiet Wrist** (🎓 → Wrist): keep-alive pulse, palm up, palm down, wrist roll, charge, clap-release.

**Two-palm charge blast (all four elements).** Heels of both hands together, fingers open like a bowl → after 0.25 s it charges (glow + inflowing element particles, full at 1.6 s). Already holding the element (cupped ember / held rock / air ball / held water) makes it bigger and is consumed. **Clap to release, predicted early:** the fingertip-gap closing speed is extrapolated; when time-to-contact < 0.16 s (and speed > 2.2 hand-sizes/s) the blast launches, so it leaves your hands before they meet. The blast grows toward the viewer (flies out of the screen): fire / water spray / stone dust + shards / wind streaks. Slow drift, heels apart, prayer hands, or clapping before it is charged never release. `charge.js`.

**Phone-video fixes (`aim.js`).**
- Object ignition: a flame's **center** must be on the object box (12 px pad) for 0.25 s; a big flame nearby no longer lights the phone.
- "Not the person" guard: held flames in front of you (keeper flame, cupped ember) are ignored (in selfie view the person box is always behind the hands). It warns only when an **aimed** fire (fingertip flame, thrown fireball, blast) stays on the face/torso core for 0.6 s. People/animals are still never burnable.
- Cup hysteresis: cup needs 6 steady frames to enter and 4 to leave, so flat hands don't show "Ember charging". The ember throws only after 0.5 s cupped, on flick-open or a flick out of the cup (no "Fireball!" while you are cupping).
- Skeleton colour: one colour per hand, eased over ~150 ms (no per-joint flicker in fast transitions).

### v6 tests
`node tests/v6.test.mjs`: 28/28. Keeper: all 20 moves/states change the flame; alive after 400 dim moves and 10 s idle; follows the hands. Ribbon: 5 points above the tips; middle-finger curl moves mostly its own point. Palm-up fires at tilt 0.6, half-tilt gives the hint. Charge: starts at 0.23 s, grows, normal clap releases 67 ms **before** contact, 80 ms clap too; slow drift / heels apart / prayer / uncharged → no release; 20/20 under jitter. Fixes: 11 checks (hitbox, dwell, person guard ×4, cup hysteresis ×2, ember ×2). `node tests/moves.test.mjs` still 18/18, 180/180 jitter, 180/180 stiff.

## v7: visible fire, juice, lab notes

**Fire visibility.** Fire sprites now use normal (alpha) blending instead of additive, so they no longer blow out to white on a bright phone camera.
- The palette is layered: deep red outer and tail, orange mid, yellow core, and a small white only at the hottest point. Colors are clamped to 1.
- A soft dark rim lets the flame read on skin and white walls.
- The scene adapts to brightness. Camera luminance (`S.luma`) feeds `FX.sceneL`. In bright scenes this raises saturation, contrast and the dark rim, and lowers additive glow and bloom. Bloom is 0.25 in fire mode, versus 0.6 elsewhere.
- The keeper flame has licking tongues, rising embers, and heat shimmer (background refraction above the flame).
- **Root cause found:** in stationary (phone-on-stand) mode, the effects clip zones killed any particle outside the object or fingertip zones, which included the keeper flame. Hands now get their own clip zones.

**Water, earth and air.** Water has darker blue edges and specular that scales with brightness. Air blasts and swirls are tinted blue (`.45,.8,1`) instead of near-white. Earth uses the existing textured rock.

**Juice (`juice.js`, `v7ui.js`).**
- **Combo counter:** a 1.6 s window between moves. Varied moves count 1 each and repeating the same move counts ½.
- **Tiers and rewards:** tiers are at 3, 6 and 10 moves. Rewards (🏅): Spark chain (3), Flowing hands (6), Keeper of the flame (10), and Six different moves.
- **Sound:** WebAudio synth voices (whoosh, crackle, splash, thud, chime, hum, boom), with no audio files. A 🔊 mute toggle is saved to localStorage.
- **Screen shake** on blast release, and fingertip particle trails in the element color.

**Lab notes (`notes.js`).**
- One small toast at a time, at least 25 s apart, and each note shows only once. A toast auto-closes after 11 s or on ✕.
- Topics: the fire triangle, flame color vs temperature, cellulose combustion → CO₂ + H₂O + ash, latent heat of melting ice, water hydrogen bonds and surface tension, low-pressure vortex cores, rock types, and stored energy.
- "Learn more →" switches to Atoms mode and opens an explainer that suggests atoms to build with.
- **Mini quests:** "Light the candle" (pull a candle → light it → fire-triangle quiz), then "Melt the ice cube" (→ latent-heat quiz). Items now emit `item:melt`.

Tests: `node tests/v7.test.mjs` (34 checks).

## v8
- **Calmer fire**: fewer and smaller flames, slower spread. Fire on screen is capped (`FIRE.cap`, at most 2 burning objects). To put it out, curl your hand, make a fist, or hold your palm down over the flame; water mode douses it with steam.
- **Element orb**: a golf-ball-sized orb rests just above your palm. Tilt your palm to roll it, and use your fingertips to nudge or twirl it (the spin marks show it turning). If you move fast without guiding it, it wobbles and drops, then respawns. A stability ring shows how steady it is. Tap the chip at the top right to cycle easy / normal / master / off. The charge-blast and the throw moves launch the orb. New lesson: "Lio of the Steady Palm".
- **Detection**: frames are contrast-normalized, the detection threshold is lower (.2), and results go through temporal voting. Lite2 switches on automatically when fps allows (or use `?det=lite2`). Long-press an object to identify it: a CLIP guess plus a label picker, remembered per profile.

## v9: simpler and calmer
- **Steadier hands**: hand tracking is heavily smoothed and has a small dead zone, so tiny jitters do nothing.
- **Fewer moves**: each element mode keeps only a few clear moves (fire: flick-open, push, curl; water: ripple, pulse, push, flick-open; earth: scoop, flick-open, push; air: push, pulse, flick-open). Cup, fist, point and the two-palm clap still work everywhere.
- **The orb starts on easy**: strong centering and heavy damping, and it reacts to smoothed palm motion, so it rarely drops.
- **Particles stay put**: about a third as many, slower, with drag so they settle, and they stay within about 200px of where they started. Loose water drops are shorter-lived. Blasts push more gently and over a smaller area.
- **Atoms**: molecules follow your hand more slowly, spin less and stay on screen.
- **Less on screen**: the mode bar shows Water, Fire, Earth and Air (Atoms, Gear and Chem are under ⋯). The gesture list, quest chip and fps counter are hidden. One clear hint line.
- All settings live in `calm.js`; `CALM.on=false` restores v8 behavior.

## v10: table mode (place it, it stays)
- Tap **📐 Table** in the mode bar. Point the phone at a table and move it slowly. A grid and a ring show where the table is. Tap the table surface to set it; it also locks on its own when the phone has been held steady for a few seconds (using the phone's tilt sensor).
- **Place**: tap the table, or point and hold still for about 1 s, to drop a tiny pinch of the current element (one small bead plus 3 crumbs). At most 12 pieces at a time.
- Placed things **stay put**: nothing moves, spawns or launches on its own. Poking or flicking into a piece slides it slowly along the table (high friction, at most 60 px/s), and it never leaves the table. Rescan, Clear and ✕ are on the chip.
- In table mode, element effects, the orb and blasts are off. Outside it they still work.
- Globally, particle amounts are now 20% of v8 and speeds 40%.
