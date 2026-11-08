# WIR METAL: Visible ReFramers + Galaxy Power Wheel v0.1
**November 8, 2026 | BRANTACLE 03 | PROPOSAL / PUBLISH HOLD**

## Why the current public build is confusing

Even though PR #67 reached `main` and GitHub Pages, the extra ReFramer Squad exists only under `?reframer_squad=1`. Without a nearby valid roof nest, an eligible donor car within 40 units of it, and Metal within 55 units of the nest, **no robot appears**. Neither HUD nor map tells the player where to go. A successfully published script does not establish a discoverable encounter.

Similarly, the 73-source power registry and `?metal_abilities=1` test laboratory are not a GTA-style equipment wheel. They are experimental mechanics and a catalogue.

## This change makes the experiences discoverable

### The REAL ReFramer Sighting
- Under `?reframer_squad=1`, a visible `🐙 REFRAMER SIGHTING` button is kept through the HUD-free clean-screen mode.
- On explicit player click, the game selects only **existing, already-loaded donor car GLBs**, finds collision-clear street positions near Metal, and initiates the *original* ReFramer Rush `wake → drop → read → anchor → release → reframe → chase` state machine.
- Two individually simulated machines on desktop, one additional wing on mobile, use their authentic owner-kit eight-arm/three-segment bodies, source car wheels, material ownership, and original combat/struggle.
- No new fake cars and no forced player teleport. This is a local opt-in scripted sighting, so selected donor traffic may be repositioned to the player-visible area, not a fully emergent city police dispatch.
- A minimal HUD reports active machine count and distance to nearest enemy. The old natural rooftop spawns remain available.
- Collision search can reject a sighting if there is no clear nearby street; it reports that honestly instead of pretending the spawn succeeded.

### Galaxy Power Wheel
- Under `?metal_abilities=1`, a persistent compact `⚡ POWERS` button opens the real 8-family wheel. It survives the default clean-screen CSS and is touch accessible.
- Eight families cover all **73 exact registry entries without duplication**: Neural, Construction, Defense, Tendrils, Movement, Combat, Forms, RIFFT/Merkaba.
- All 73 names appear, but only abilities with **real connected laboratory mechanics** can be equipped and cast. The rest accurately display partial / future. Unlocks require salvage and mission progress. No currency duplication or fake animations.
- Casting delegates to the real laboratory: Pressure Reading consumes Focus and scans a physical support; Adaptive Armor consumes finite Gallium and protects against real damage; construction/repair creates actual scene collision; Snap Step applies physical velocity. These already existed separately, now they can be chosen from a common wheel.
- The existing gamepad View button: **tap = original map**; hold ≥0.36 sec = wheel; right stick selects a family; D-pad cycles powers; A equips and casts; release View closes. On phone: touch the power button and tap categories, select, equip, use. On keyboard: Tab opens, arrows navigate, Enter equips and R activates.
- No L3/R3, no replacement Metal movement authority, and no new control reassignment to LB (grab), RB (swing) or trigger charge.

### Testing scope
- Node mapping/action/negative-status tests for exact 73 IDs and source-integration guards, plus original ReFramer squad + material suite.
- Browser smoke for ordinary Mission 01 startup, desktop power selection and real Focus spending, unimplemented Gorillium remaining disabled, touch UI, and actual original-car visible ReFramer dispatch.
- The browser script uses a **QA-only, bounded** FSM stepping helper after manual sighting initiation to verify original car dismantling and real wheel inventories, not a demonstration that the player beat a full mission by hand.
- Physical Xbox/Nimbus controller and iPhone Safari remain unverified; simulated Gamepad and iPhone viewport are not equivalent.

## Exact URLs when source is authorized for deployment
- Normal: `/connected/` (existing first mission, no experimental UI).
- Opt-in ReFramers: `/connected/?lite=1&reframer_squad=1`
- Opt-in Power Wheel: `/connected/?lite=1&metal_abilities=1`
- Both simultaneously: `/connected/?lite=1&reframer_squad=1&metal_abilities=1`

**Do not present these branch features as public before an authorized deployment.**

## Release policy

Current trusted `.github/wir-hold-policy.json` says `mode: HOLD`, `allowPublicPublish: false`, no approved merges/releases. Previous unexpected merging/deployment does not grant blanket permission. Preserve source SHA, draft PR and green regression checks; do not bypass the HOLD policy automatically.

## Next truly necessary upgrades

1. Make the sighting a real persistent rescue/escape mission, with reward, wanted-level heat, dispatch pathfinding, police/eagle units and replayable checkpoint.
2. Create visible map markers and navigable routes to *natural* roof nests, not only direct triggered sightings.
3. Expand the wheel's action router beyond the lab: allow verified original board/grab/swing/charge actions using stable game action IDs and avoid duplicate inputs.
4. Integrate more of Metal's 73 powers one mechanically validated ability at a time, preserving unlock provenance.
5. Verify physical gamepad View timing, iPhone Safari memory and long-session performance before enabling either system by default.
