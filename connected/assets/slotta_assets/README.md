# SLOTTA Asset Pack v1 · WIR: Connected

**Status:** Playable procedural geometry on proposed visual design. Character appearance is **PROPOSAL / HOLD FOR OWNER ART APPROVAL**. The existing SLOTTA game mechanics and story remain authoritative.

## Live source assets

- `../slotta_visuals.js`: modular original Three.js boss model (jointed mesh groups, idle/walking sway), PHATOM backpack with exactly **3 active ports + 5 storage bays**, orange retrieval port, Circuit Serpent and Cyborg Clone geometry/animation.
- `cartridge_atlas.svg`: eight original game-cartridge icons, **4 columns by 2 rows**, in the same order as `../slotta_slots.js`. Each tile is **256 × 256** and the file is **1024 × 512**.
- `../../slotta-lab/index.html`: dedicated 3D inspection page, supports touch rotation and zoom on desktop.
- `../../tests/slotta_asset_contract.test.mjs`: asserts exact 3+5/8 game layout and integration hooks.

### Boss integration

The original first-boss fight, attack cycles, PHATOM switches, damage, and victory logic stay in `main.js`. Only the boss and minion visual geometry is replaced by `slotta_visuals.js`, keeping body physics, target selection, pursuit, and Gallium disruption as they were.

### Downloadable asset pack (created alongside this PR)

The ZIP delivered in ChatGPT includes:

- Four **real GLB static blockouts**, including SLOTTA with 41 named parts and a standalone 16-part PHATOM backpack. All were reloaded successfully as nonempty glTF scenes.
- Two orthographic/art-direction reference sheets and a visual mood board.
- Eight **256 × 256 transparent PNG** cartridge icons and matching 1024 × 512 atlas.
- Two **8-frame 4 × 2 transparent PNG VFX flipbooks**, for Circuit Serpents and Cyborg Clones.
- Boss introduction PNG, README and validation manifest.

**Binary GLBs and PNGs are in the downloadable ChatGPT ZIP, not in this source branch.** Their files are static art blockouts, **not** skinned/rigged/weight-painted GLBs. The `slotta_visuals.js` implementation in GitHub provides the playable joint/pivot animation independently.

### Accepted vs not yet verified

Verified via static/automated test gate: syntax, original cartridge count and unique IDs, swap functions, integration paths, presence of scene assets.

Needs manual run on iPhone: actual WebGL rendering, Bluetooth controller, frame rate, collision and combat synchronization. The current avatar is a stylized production blockout, not a final realistic mesh.

### Canon notes

The character name is **SLOTTA** and the engine is **PHATOM**. Slither Master/Ninja Star are established legacy concepts for Circuit Serpents and clone attacks; the existing WIR Connected `slotta_slots.js` eight game IDs are preserved unchanged. No proprietary character/game content or third-party references are shipped as game assets.


## Pre-rig animation and PHATOM expansion (2026-11-03)

**Visual status: PROPOSAL / HOLD.** The owner-provided SLOTTA reference is a
streetwear character (red hoodie, denim jacket, jeans, tan boots, high-top fade)
with the PHATOM backpack. The temporary procedural model is an approximation,
**not** owner-approved final canon or a weight-painted rig.

### Three starting ports, five stored, three archived

The 3 starting active worlds are:
1. Slither Master, Circuit Serpents
2. Ninja Star, Cyborg Clones
3. Phantom Racer, Afterimage Dash

The original five stored games remain Fleshcode, Phasebound, Shifting Department,
Tenfold, and Elemental Outlaw. The formerly active Zero Sector, Nanoforge, and
Gravity Children remain in the **archive**, available for future download/swap.
There are 11 registered game IDs but **only eight installed PHATOM slots**.
`signature_cartridges.svg` adds new original icons for the three signature games;
the existing `cartridge_atlas.svg` remains an archive of the earlier eight icons.

### Source responsibilities

- `slotta_animation_machine.js`: deterministic time/priority state machine,
  frame markers and clip-name manifest, no dependency on 3D renderer
- `slotta_pose.js`: procedural character poses, cartridge ejection/insertion,
  independently pulsing active and storage slot lights
- `slotta_visuals.js`: streetwear-inspired blockout, sockets, articulated limbs,
  procedural enemy models and the pose adapter
- `slotta_rig_adapter.js`: non-destructive skeleton inspection and future glTF
  AnimationMixer setup. Does **not** pretend the blockout is skinned.
- `main.js`: attacks are queued at PHATOM selection and resolve when the
  animation's **cast** frame arrives. Old boss AI, RPG encounters and legacy
  eight powers remain; Phantom Racer moves the boss continuously through the
  collision-aware world rather than teleporting Metal.
- `slotta-lab/index.html`: interactive asset QA, animation picker, timeline
  scrub, playback speed, pause, repeat, camera views, hitbox silhouette, attachment
  socket markers and cast-frame rings. No save state is changed here.

### Required sockets and external GLB contract

Model in meter scale, Y up, +Z forward, feet at Y=0, skinned meshes and named
bones Hips, Spine, Head, LeftHand, RightHand (common Mixamo aliases accepted).
Recommended sockets:

- `PHATOM_socket` near the shoulder blades
- `SLOTTA_SERPENT_SPAWN` on the right wrist
- `SLOTTA_CLONE_SPAWN` behind/around the hips
- `SLOTTA_DASH_TRAIL` on the back/hips
- `SLOTTA_LEFT_HAND` / `SLOTTA_RIGHT_HAND` for equipment and gestures

Suggested clip names: Idle, Walk, Strafe, BossIntro, CartridgeSelect,
CartridgeSwap, SlitherCast, NinjaSummon, PhantomDash, LegacyCast, HitLight,
HitHeavy, GalliumHeld, Knockdown, GetUp, Taunt, Victory. They are
**target clip names**. These animations have not yet been exported as a real
skinned GLB.

### Test and acceptance

Run all local tests with:
```sh
node --check connected/assets/main.js
node --check connected/assets/slotta_visuals.js
node --check connected/assets/slotta_animation_machine.js
node --check connected/assets/slotta_pose.js
node --check connected/assets/slotta_rig_adapter.js
node --test connected/tests/slotta_asset_contract.test.mjs connected/tests/slotta_animation_machine.test.mjs connected/tests/slotta_lab_preview.test.mjs
```

Manual QA on an iPhone with controller is **still required**:
1. SLOTTA appears with visual PHATOM 3+5; no missing assets/runtime errors
2. Slither Master casts at the tell, then two serpents move and disrupt Gallium
3. Ninja Star casts at the tell, then two clones pursue Metal
4. Phantom Racer shows moving afterimages and stops at solid building colliders
5. Boss takes blast damage and performs appropriate hit reaction; does not
   continue a canceled attack after an interrupt
6. L1 Gallium grip halts the dash and displays held pose; release returns to
   ground/recovery state
7. All original legacy cartridges remain usable if swapped into active ports
8. Lab controls work with touch and PC; check FPS and thermal/device behavior

Do not merge/publish this visual redesign until owner approval of the
appearance and review of manual iPhone results. 
