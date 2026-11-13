# METAL LIVES HERE v0.1 — PROPOSAL / PUBLISH HOLD
From the owner's "WIR METAL × REFRAMER RUSH — 100 new ideas" (2026-11-06). Built toward its three milestones.

## Milestone A — walk, skate, fall, get the board back, get in a car, drive, get out
- **Driving uses ReFramer Rush's own DrivePhysics** (`assets/drive_physics.mjs`, ported verbatim; its 10/10 suite runs in
  Connected's tests). 1 Rush unit = 0.094 m in Savannah (top ≈ 30 m/s street, nitro higher; drift, slipstream from
  traffic, weight transfer as in Rush).
- **Metal's car** is parked by the Commons (PROPOSAL: black sedan). Any car whose driver has already got out also works.
  **E / D-up** next to it: board stowed, Metal gets in. **Pad**: R2 gas · L2 brake/reverse · left stick steer ·
  B handbrake drift · A nitro · Y (or D-up / E) out under ~6 m/s. **Keys**: W/S/A/D or arrows · Space drift · Shift nitro · E out.
  Buildings, shields and the wall stop the car (a hard hit can break wall panels); ramming a Roadframe at speed hurts it.
  Getting out puts Metal beside the door; if he had the board, it's back under his feet.
- **D-up = interact everywhere** (Osei, Mari, rescues, villains, cars).
## Milestone C — Morrow reacts
- **Lil Heavy** (PROPOSAL placeholder look: small board-bodied buddy with a gunmetal dome and a light eye) follows Metal,
  **scouts**: rolls toward the nearest machine/villain within 40 m and chirps a warning once, and after a bail **rolls the
  loose board back** to Metal. Hidden while driving.
- **Mari · game of S.K.A.T.E.** (Season One Ep.21 "Side B"): at the Skatepark, E / D-up. She sets tricks she can land
  (difficulty-weighted); you have 15 s to land the same trick for real (names come from the board physics), then you set
  and she has to match. First to S-K-A-T-E loses. She gets sharper each time you beat her (saved).
- **The ReFramer Signal** (idea 30): three bars of a low machine rhythm play before a ReFramer drops, louder as you get
  closer to a live nest — you learn the warning without a map marker.
## Verified
Unit suite 300 pass (2 pre-existing failures on main unchanged), incl. Rush's DrivePhysics suite 10/10.
Headless browser with a fake Nimbus: D-up at Metal's car → driving (board stowed, Metal hidden); 3 s of R2 → 67 m;
B + steer → 44° drift; L2 → 3 mph; Y → out beside the door with the board back. Bail into the ledge → Lil Heavy went to fetch
and rolled the board back until Metal had it again. Mari started a game. 0 page errors.
## Not yet
Motorcycles, races/drift competitions, store interiors, traffic personalities, scavenger/ambush ReFramers, apex bosses,
district repair history — next passes, from the same 100-idea list.
