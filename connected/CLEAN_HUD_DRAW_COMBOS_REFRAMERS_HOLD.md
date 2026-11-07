# CLEAN SCREEN · METAL DRAW · POWER COMBOS · REFRAMERS · VILLAIN POWERS — PROPOSAL / PUBLISH HOLD

RB1 voice brief (2026-11-06): no words on the screen; toggle help on/off (help explains each button as you press it);
"everywhere you're standing, as long as you're near metal, you can draw it to you — the charge-up has to be better";
bring in ReFramer Rush's villains and gameplay; combos; villains with all their powers.

## Clean screen / Help mode
- **Help OFF (default)**: no words anywhere — panels, toasts, prompts, place names, world signs, villain name tags are hidden.
  Feedback is light, motion and sound. Touch buttons stay on phones.
- **Help ON**: everything shows + a whisper under the action that names every button the moment you press it,
  per context (walking, fighting, jumping, swinging, riding, in the air, grinding), including combo hints.
- Toggle: **H** · **tap Menu** on the controller (hold Menu still pauses) · `?help=1`. Remembered per browser.

## Metal Draw (better charge-up)
- Hold **5** (keyboard, laptop **K**) or **hold L1** (controller; tap L1 is still the pulse/blast). Everything metal in 14 m
  streams into Metal: cars, lamp posts, skatepark rails and coping, Gallium puddles, ReFramer scrap. Closer + heavier = faster;
  each object holds a finite amount, so you move to keep charging. Full suit → the extra becomes charge.

## Power combos (no on-screen sequences; they follow what the powers do)
Gallium Fist (2 strikes → glob, +60 %) · Magnet Storm (draw 1 s → pulse: double radius, pulls fighters in) ·
Shatter (blast your own glob in flight → crystal shard burst) · Meteor (glob from the air → drives down, cracks the ground) ·
Rail Rifle (throw while grinding → faster, pierces) · Style Cannon (flip trick → throw) · Swing Breaker (let go of a swing → strike = heavy down-hit).
Chains inside 3 s multiply.

## ReFramers (from ReFramer Rush 3D v0.1's ReframerEngine)
Eight-armed machines wake on rooftops near Metal, drop on a real car, **scan** it (jam the scan twice with pulse / glob / blast → it aborts),
**clamp** it (tip it with a big glob or a thrown car; hit it while it's down), **pull the wheels off**, and **rebuild the car into a Roadframe**
that hunts and rams Metal. Press **E** at the car before the release to pull the driver (otherwise they still get out — shaken, never hurt).
Breaking a Roadframe leaves its wheels as scrap you can draw for Gallium.

## Villain second powers
Ballast throws cars at you (driver out first) · Slipline's charged slide eats your strikes (intercept her mid-dash for double) ·
Glassjaw regrows a plate when you back off + throws glass shards · Kiln heat lance + hot zones (a glob puts a zone out) ·
Echo Nail stores the hits he takes and releases them 7 s later as a shockwave.

## Files
`assets/metal_draw_core.mjs`, `assets/power_combo_core.mjs`, `assets/reframer_core.mjs` (all pure), `assets/villain_core.mjs` (second powers),
`assets/main.js` (help mode, whispers, draw streams, combos, ReFramer meshes/arms/scan/Roadframe, villain power visuals),
`tests/draw_combo_reframer.test.mjs` (6 simulations).

## Verified
Unit suite: all new tests pass; the only failures are the 2 pre-existing ones on main (SLOTTA count, wall_board_lock).
Headless browser on the plain link: zero visible text elements with help off, 6 with help on; 1.5 s draw next to a car: Gallium 0.20 → 0.65
(car ran dry), nothing in an empty field; Magnet Storm fired; ReFramer woke, dropped, scanned, driver rescued with E, clamped, rebuilt into a
Roadframe; 6 globs broke it → scrap left to draw; 0 page errors.
