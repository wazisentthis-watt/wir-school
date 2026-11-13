# Wrong Target — Foundry Steps v0.1
**Status: PROPOSAL / PUBLISH HOLD · draft PR · not merged · 2026-11-06**

Milestone 2 of the owner's saga plan, built inside WIR: Connected on the new lot `foundry` (bx 1 / by 1, south-east of Forsyth Commons). The rules are in `assets/wrong_target_core.mjs` (7 node tests). They are re-cut in metres from the v0.3 `WIRMorrowSystems` reducer.

## How it plays
1. **The signal:** a pulsing red ReFramer sensor at the Foundry Steps. Skate within 16 m and the machine **drops** onto the civic shuttle with the phase-in sound. A bounded **gravity anomaly** opens for 11 s: a shimmer column, debris falling sideways, and Metal pushed off-line inside its 7 m radius only.
2. **Brace the shuttle:** the four harvest arms (5–8) lift the far side. Hold **Metal Draw** beside the shuttle for 1 s. A Galaxy Gallium sill and props go in, costing 18 finite Gallium once. The lift reverses and the door glows amber. If it lifts all the way first, it rips a wheel off and the riders come out **shaken**. The part ledger stays conserved.
3. **Extract ≠ safe:** press E or D-up at the door to get one rider out. They follow Metal on foot (slower if shaken). If he gets more than 22 m away they **wait**. They only count once they physically step inside the teal **safe zone**.
4. **Take its legs:** legs 1–4 carry the body, and each joint has its own HP. Strikes and globs hit the actual limb segments, and glob aim prefers live limbs and the drone. With two supports down it loses its stance. **Trap:** taking a shuttle-side leg (1 or 2) while the shuttle is unbraced and occupied dumps the load onto it. Standing under the body gets you stomped.
5. **Framekeeper drone** (ReconBot, eight tool arms): every 9 s it welds a damaged support leg back (+45) from a **finite stock of 2**. Knock it down (glob, strike or pulse) or let **Lil Heavy film it**. Lil Heavy scouts automatically, and his footage diverts the drone for 12 s and counts as evidence.
6. **Armored police, MC-01 and MC-02** (human officers, visible faces, pressure-cage helmets with struts, a visor and a stress gauge):
   - They arrive at 6 s.
   - They only learn from what they **witness**: within 32 m, with a real line of sight raycast against the city colliders, and each piece of evidence counts once.
   - A witnessed rescue is −20 suspicion, a brace −13, Lil Heavy's footage −10. Globbing the occupied shuttle is collateral, +24.
   - Suspicion ≤ 47 → **ASSIST**: they walk with the riders. 48–85 → **INVESTIGATE**: they keep 8 m and radio in. ≥ 86 → **PURSUE**: an inertia snare cable slows Metal and he drags through it.
7. **Done:** only when both riders are safe **and** the machine can't stand. It collapses, the officers wave, and the stop reopens. The braced shuttle stays braced across reloads. Save key `wirWrongTargetV1`. A reload mid-incident restarts the incident cleanly; a completed one stays complete. `?wt=reset` clears it.

## Evidence
- `node --test tests/*.test.mjs`: 314 pass. The 2 failures were already on main (SLOTTA, wall_board_lock).
- Headless Chromium (swiftshader), cold load. Results:
  - signal → drop;
  - E at the door refused until braced;
  - brace (18 spent);
  - both riders walked physically to SAFE;
  - both officers saw both rescues → ASSIST, suspicion 28 and 37;
  - two legs down → RECOVER_STANCE → COMPLETE, trust 68, saved;
  - a glob on leg 3 → 43 HP; the drone was diverted by Lil Heavy, then came back and welded it 43 → 88 (stock 1);
  - 0 page errors.
- Ep.1 regression run still completes.
- **UNTESTED:** physical controller, iPhone Safari, real GPU frame times. The voxel bots' licence is not verified.

## Not in v0.1 (next)
- Framebreaker suits (MechaTrooper).
- Midair armor reassembly.
- Scavenger carrying the stolen wheel (MobileStorageBot).
- Officer helmet overload / rescue twist.
- Navmesh pathing for riders (they walk straight lines).
- Building-climb phase.
