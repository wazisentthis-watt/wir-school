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
