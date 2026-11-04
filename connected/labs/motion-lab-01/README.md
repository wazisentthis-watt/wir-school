# METAL | Mini Morrow Motion Lab 01

**PROPOSAL / PUBLISH HOLD. Draft-only test yard.** Not merged or deployed.

Preview on the draft branch: /connected/labs/motion-lab-01/

## Recovered assets
Original skate_ramp GLB (11,236 bytes) and Textures/colormap.png (10,860 bytes) were extracted unmodified from Google Drive /1010/METAL_MINI_MORROW_CITY_3D_v18_PLAYABLE.html. See assets/SOURCE_PROVENANCE.json for SHA-256, source URL and rights hold. Original texture URI is resolved by GLTFLoader.

The existing site's METAL rig and skateboard are linked by path rather than duplicated. New animation retargeting is not included. When the model is absent, a labelled debug silhouette is used. Lil Heavy has a marked rendezvous LOCATION only, not a replacement character.

## Mission
Approach ramp, make raycast-backed ramp contact, ollie off the ramp and land, then return slowly to the Lil Heavy rendezvous at x=0,z=10.5.

Keyboard: W/Up push, S/Down brake, A/D carve, Shift pump, Space ollie. Touch controls and standard Gamepad left stick/A/left bumper implemented but not certified on physical devices.

## Save isolation
Only wir_motion_lab01_progress_v1 is written or cleared. The lab never overwrites wir_metal_story_v1 or wir_valence_profile_v1. Restart clears only lab progress. Production index.html, assets/main.js, and mission loader remain unchanged.

## QA
Run:
  node --test connected/tests/motion_lab_01.test.mjs
  npm install --no-save playwright
  npx playwright install --with-deps chromium
  python3 -m http.server 8765
  METAL_BOOT_BASE=http://127.0.0.1:8765 node connected/tests/motion_lab_01_browser_playwright.mjs

The PR workflow runs these tests. The ?qa=1 parameter provides deterministic frame-driving for tests only. No releases, merges, main-branch changes, canon approvals or publication.
