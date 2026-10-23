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
