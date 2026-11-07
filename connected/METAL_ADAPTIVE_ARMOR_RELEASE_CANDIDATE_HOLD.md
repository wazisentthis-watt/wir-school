# METAL: Adaptive Armor, Actual Combat Integration (Release Candidate)
**November 6, 2026 | PROPOSAL / PUBLISH HOLD | Do not deploy until authorization**

## What this milestone truly adds
- **Adaptive Armor (#12):** once Metal completes the existing district salvage + support repair mission, the ability button appears in the opt-in METAL ABILITY LAB (`?metal_abilities=1`).
- **Physical character presentation:** a subtle silver/cyan mesh follows the actual player's Three.js root while active. It has no second player controller and isn't a new collision target.
- **Real defensive effect:** the existing `metalHurt`, villain attack and sparring damage paths call `armorDamage` before reducing Metal's real HP.
- **Balance:** activating armor consumes 0.08 (8%) of the shared finite Galaxy Gallium reserve; the suit absorbs up to 70% of an incoming hit, limited to 0.30 HP of total shell capacity, for at most 12 seconds; breaking/expiring causes a 4-second cooldown. The hero is *not invulnerable*.
- **Matter conservation:** armor material is irrecoverably consumed and added to the private `wir_metal_power_lab_v1` material-loss ledger so a browser reload cannot refund it.
- The **73 power catalogue** is preserved, and #12 now honestly changes from `design-only` to `opt-in-lab` (nine opt-in entries, 13 existing partial entries, and 51 design-only). These are power statuses, **not 73 fully implemented combat systems**.
- **Baseline compatibility:** without the opt-in URL flag, `metalPowerLab===null`, so `armorDamage(dmg)` returns the original damage value and creates no UI, armor shell or save change.

## Verification
- Pure rules: `node --test connected/tests/metal_adaptive_armor_core.test.mjs`.
- Exact source wiring checks: all four real HP-damage routes call the armor wrapper; single charge and no normal-story save writes.
- Desktop and simulated mobile Chromium: `node connected/tests/metal_power_lab_browser_playwright.mjs`; verifies Mission 01 boot, salvage→repair unlock, armor activation, no duplicate material spending, physical panel construction, Snap Step, impact/reclaim and story save isolation.
- Game physics regression and existing controller/gameplay CI must be green before promotion.
- Real iPhone Safari + physical Nimbus/Xbox gamepad are not certified by desktop browser emulation.

## What still isn't here
Full Gorillium transformations with the authentic rig/31 clips, Lion Metal, Star Merkaba combat, city-wide mesh deformation/structural simulation, full 73 independently playable powers, advanced chemistry and mature mission-unlock economy. Those are separate verified milestones.

## Live release gate
The authoritative `.github/wir-hold-policy.json` currently sets:
```json
{"mode":"HOLD","allowPublicPublish":false,"approvedMerges":[],"approvedReleases":[]}
```
This feature branch must **not** bypass that rule. A general instruction to go live is not proof that the exact tested commit passed release authorization or that the complete 73-power target is ready. Obtain owner-reviewed SHA approval through established governance, resolve current failed workflow checks, then deploy and verify the Pages output and original saved games. GitHub Pages last attempted deployment timed out, so a successful build alone is insufficient to claim publication.

## Next verified stages
1. Defensive shield against enemy projectiles with actual hit volumes and material cost, separate from armor.
2. A true skateable Gallium rail and ramp using the existing skate collision solver; no fake decoration.
3. Five-body/limb animation test using authentic GLB source before claiming Gorillium transformation.
4. Larger malleable district: structural support graphs, persisted repaired/broken world state, NPC routing and a completed enemy/rescue mission.
