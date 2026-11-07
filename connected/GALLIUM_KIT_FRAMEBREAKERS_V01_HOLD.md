# Galaxy Gallium Kit v1 + Framebreakers v0.1
**Status: PROPOSAL / PUBLISH HOLD · draft PR · not merged · 2026-11-06**

## The material rule (owner direction)
Galaxy Gallium is **finite liquid metal, heated and cooled with particles from the vacuum of space**. It is liquid and flowing while Metal shapes it, and it sets into black galaxy crystal when it cools. The same material is used for the board, the swing line, the sword, the shield, the Merkaba, the beam and the puddles.
- `galaxyCrystalMat({cool})`: `cool` 0 = hot liquid with flowing normals; 1 = set crystal facets.
- Nothing is created or destroyed. Material moves between reserve, board, hand, puddles and blasts.
- In-browser test: reserve + puddles stayed at 0.900 through forge, melt, recall and pull.

## Controls (on foot; the board keeps its own triggers)
| Input | What happens |
|---|---|
| **B tap** | Board lost within 45 m → it flies back to Metal on a liquid-metal arc and he steps on. Board gone, or lost further than 45 m → forge a new one (FORGE_COST). The far board melts into a puddle where it lies. |
| **B hold** (0.55 s) | Melts what he's holding (sword or shield). Otherwise melts the board, under him or where it lies. It becomes a **puddle that stays** (saved, `wirPuddlesV1`). |
| **L2 + R2** (keyboard: hold Y) | **PULL**: liquid metal streams in from cars, lamps, rails and puddles, and he plants. The **Star Merkaba** (two interlocked tetrahedra of liquid galaxy metal) grows and spins up. **Purple plasma arcs** crackle from a third of full charge. |
| PULL + **X** | Liquid-metal **galaxy sword** in the right hand: ×1.6 damage. |
| PULL + **B** | Liquid-metal **shield** on the left forearm: frontal hits take 15 %, 5 blocks, then it falls as a puddle. Swapping refunds the old shape. |
| PULL + **Y** | **Plasma blast**: a liquid-metal beam with a violet plasma core, 24 m. Power and cost scale with charge. It hits foes, ReFramer limbs, the Framekeeper and Framebreaker drones, and shoves cars. |
| Release a full pull | **Heavy Hands** for 8 s: strikes ×1.5 damage and ×1.8 knockback. |
- In fights, B tap is still dodge.
- While pulling, the SkyLab combos (pressure / gorillium / kickflip / sling) are muted, so X, Y and B belong to the pull.
- Walking over puddles no longer auto-absorbs them: they stay until he pulls them back.
- The S3 / flight Merkaba is now a real star tetrahedron (it was an octahedron).

## Framebreakers v0.1 — Foundry Steps north sidewalk
Two human operators in armored frames: plates, a helmet with a visor, and hazard shoulders. Rules are in `framebreaker_core.mjs`.
- **Plates, not health:** chest, back and two shoulders soak 75 %. A hard hit or a glob knocks one loose; it falls physically.
- **Pit crew (Framekeepers):** two little eight-armed drones catch the loose plate and bolt it back on in 2.4 s. Downing a drone (glob, strike or pulse near it) stops that drone's repair. The other drone can still take the job.
- **Ground Lock:** every 7 s they plant for 2.5 s (orange ring) and take no knockback. A glob breaks the lock.
- **Frame Shear:** if Metal rides in close, they go for the trucks and the board is knocked loose and lost. Tap B to call it back.
- **Inertia Snare:** a cable from 4–10 m slows him.
- **Judgment:**
  - Police trust ≥ 60 from Wrong Target → they stand down and nod, unless Metal hits them.
  - A ReFramer within 40 m → **emergency alliance**: they walk on the machine and hit it.
  - All plates off and stance broken → the operator **surrenders**. Nonlethal.

## Evidence
- `node --test tests/*.test.mjs`: 320 pass. The 2 failures were already on main. 6 new tests.
- One source-contract regex was updated for the kit-owned B.
- Headless Chromium with a fake standard gamepad:
  - forge;
  - Frame Shear knocked the board 3.7 m loose, tap B recalled it, back under his feet;
  - hold B → puddle (material conserved);
  - L2+R2 2.5 s → charge 0.98, Merkaba and arcs on, puddle pulled back;
  - +X sword, +B shield, +Y blast (cost 0.14);
  - hold B melted the shield;
  - Framebreakers confronted → hook knocked a chest plate off → a drone carried it back → repaired → drone downed;
  - Ep.1 and Wrong Target regressions still complete;
  - 0 page errors.
- **UNTESTED:** physical controller and iPhone.
