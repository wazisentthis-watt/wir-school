# GALAXY GALLIUM GLOBS + MORROW VILLAINS v0.1 — PROPOSAL / PUBLISH HOLD

RB1 voice brief (2026-11-06): "I don't see any of the ramps… the Galaxy Gallium was black and crystallized and had
sparkles in it — bring that back… gallium globs, like metal bending, blast things, even knock cars over… add villains
and people to fight." Mission blueprint received the same day (see `METAL_FREE_ROAM_MISSION_BLUEPRINT_HOLD.md`).

## What changed
- **Real skate + Test-Yard park are ON by default** on the normal link. `?real_skate=0` brings back the old skate and box kickers.
  Touch: stick = lean, flick the stick forward = push, jump button = knees/pop.
- **Galaxy Gallium look → black galaxy crystal** (limb, board forge alloy, wall ramps, drips, puddles, blasts, globs):
  near-black glossy body, faceted crystallized normals, a 3-layer parallax star field inside, faint blue-violet nebula,
  silver fresnel. `?gallium=liquid` restores the 2026-10-23 mercury pass.
- **Gallium globs** — hold **G** / hold **Y** (controller, on the ground or while riding): Metal pulls Gallium out of the
  suit into a wobbling crystal glob between his hands, with matter streaming in from both forearms. Release to throw it.
  The longer you hold, the bigger it gets (and the more Gallium it costs). Bigger = slower, heavier, harder hit.
  - Fighters: up to 0.42 damage, knockdown at half size and up. Too small = it flows back into the suit (refund).
  - Cars: the driver always gets out first. A small glob shoves the car, half size and up tips it over, a full glob
    sends it rolling. Tumbling cars bowl over fighters in their path.
  - Every glob splats into a crystal puddle. Walk over it to pull 80 % back. Puddles fade after 25 s.
- **Villains** (Season One blueprint), each with a name tag, their own look, and a Morrow-radio call when you get close:
  - Ep.1 **Ballast** (Fight Lot sidewalk): armored front — jabs barely land (25 %). Globs, flipped cars and slams hit 180 %.
    Ground slam with a warning ring; jump or roll out.
  - Ep.2 **Slipline**: dashes and leaves slick lanes you slide on.
  - Ep.3 **Glassjaw**: four fake reinforcement plates absorb the first hits, then he folds (160 %).
  - Ep.4 **Kiln**: heat aura cooks you up close. A glob cools him: the heat stops and he seizes up.
  - Ep.5 **Echo Nail**: drives a spike where you stand; it hits again 7 s later (warning ring at 1.5 s). Step off it or pull it (E).
  - Relay, Kairo Vale, The Foreman, NIXO stay as before. The three street crews are unchanged.
  Beating an episode villain: "Ep.N … down · recording stem earned", +30 % Gallium.

## Files
- `assets/gallium_glob_core.mjs` — glob sizing / cost / launch / car impulse / tumble / puddle (pure).
- `assets/villain_core.mjs` — Ballast, Slipline, Glassjaw, Kiln, Echo Nail rules (pure).
- `assets/gallium_limb.js` — `galaxyCrystalMat`, `GALLIUM_LOOK`.
- `assets/story_enemies.js` — Kiln + Echo Nail added; episode numbers / titles / weaknesses.
- `assets/main.js` — globs, villain abilities and effects, tags, radio calls, default real skate, touch skate mapping, test hooks.
- `tests/gallium_glob_villain.test.mjs` — 9 simulations.

## Verified
- `node --test tests/*.test.mjs` → 276 pass, the same 2 pre-existing failures as main (SLOTTA count, wall_board_lock).
- Headless Chromium on the plain link: park built (13 rails); 1 s of G → glob 0.85, Gallium 1.00 → 0.86; thrown at a
  taxi → driver out, car rolled ~2 turns and settled; puddle pickup 0.86 → 0.97. Villain prompt: "E — Ballast ·
  Ep.1 Concrete Has a Tempo". Front jab vs glob on Ballast = 0.015 vs 0.108 stance. Idle 6 s vs Ballast = HP 1.00 → 0.62. 0 page errors.

## Open (owner)
Villain looks, placements, numbers and the glob controls are PROPOSAL. The full Ep.1 mission (recording session → depot
robbery → lost first fight → awning rescue → delivery-platform win → back to the session) is the next build; this pass ships
the fighters and rules it needs.
