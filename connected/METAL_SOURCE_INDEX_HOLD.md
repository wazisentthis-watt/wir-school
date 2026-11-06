# WIR Connected × METAL: Source Consolidation
**PROPOSAL / PUBLISH HOLD · 2026-11-06 · Candidate, NOT a certified canonical release**

This is the integration index for the playable native METAL systems. It connects existing Connected source to the tested follow-on build code without superseding its newer skating, physics, save, or Morrow City changes.

## Correct source locations
| System | Source of truth in this candidate |
| --- | --- |
| Original 3D game/camera/rig/controls/saves | `connected/assets/main.js`, `powers.js`, existing `connected/assets/` modules |
| Savannah native mission pilot (Build 01) | `connected/assets/savannah_native_core.mjs`, `savannah_native_bridge.js` |
| 8-mission expansion (Build 02) | same Savannah core + bridge; `connected/tests/savannah_campaign_expansion.test.mjs` |
| Six-limb, Gallium, Skate Gallop, Snap, RIFFT, Lil Heavy, Dominion (Build 03) | `connected/assets/metal_native_beast_core.mjs`, `metal_native_beast_adapter.js` |
| Procedural Gallium limbs, eight villain looks, three districts, hit-volume rules (Build 04) | `connected/assets/metal_visual_rules.mjs`, `metal_visual_evolution.js` |
| Regression and browser checks | `connected/tests/*native*`, `connected/tests/metal_visual*`, `.github/workflows/savannah-native-pilot.yml` |
| Historical standalone HTML versions and screenshots | `connected/prototypes/STANDALONE_VARIANTS_CATALOG_HOLD.md`; **archive inventory only, binaries not yet imported to Git** |
| Creative crossover and power proposal | `connected/proposals/METAL_POWER_AND_CROSSOVER_NOTES_HOLD.md` |

## Preview flags
On a branch preview (not the public production URL):
- `?savannah_native=1` for native pilot + 8-mission campaign
- `?savannah_native=1&savannah_beast=1` for combat and companion
- `?savannah_native=1&savannah_beast=1&savannah_visual=1` for Build 04 visuals
- `&lite=1` for lower GPU load

All optional systems share the original Connected Three.js scene and player. Do not introduce a fifth top-level script in `connected/index.html`; the existing four-script boot is a tested invariant.

## WIR guardrails
- All new characters, cosmetic forms and crossover worlds are **proposals**, not locked book canon.
- Approved character art/rigs are unchanged. Procedural geometry is a fallback and not a final GLB.
- Four real wheels; no hovering or instant teleport. Gallium and forces remain finite, RIFFT routes need supported anchors.
- The shared Connected save keys are not to be reset/migrated. Preserve the existing Morrow systems and all current mainline development.
- **PUBLISH HOLD:** the authoritative `.github/wir-hold-policy.json` currently blocks unapproved merge/public release. A GitHub PR is not automatically deployment or canon approval.

## Validate before promotion
Run Node unit checks and headless Chromium in the proposed branch; check first mission, eight missions, keyboard/gamepad (including real hardware), mobile Safari, world physics, saves, and asset rights. Link to GitHub Actions evidence in the PR. No `CURRENT_BUILD.json` promotion in the separate studio repository until a verified and owner-approved merged source exists.
