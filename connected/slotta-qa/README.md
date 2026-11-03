# SLOTTA browser encounter QA · PROPOSAL/HOLD

This station runs **the actual WIR: Connected mission** in a same-origin iframe,
then checks the real Three.js scene and boss handlers. It is a **QA tool**, not
a standalone shipped game and not an approved change to character canon.

## Open locally

From the root of a checked-out `wir-school` repository:

```sh
python3 -m http.server 8765
```

Visit [http://localhost:8765/connected/slotta-qa/](http://localhost:8765/connected/slotta-qa/)
in a supported desktop browser. Tap **Run all 8 browser checks**, or tap
individual checks. Use **Save JSON report** for evidence. This path will only
be hosted on GitHub Pages after a reviewed merge and deployment. Do not
present the production Pages URL as containing unmerged test code.

## What the eight browser checks actually prove

| Check | Real engine behavior under test |
| --- | --- |
| Mission | First-mission assets and player/SLOTTA actors exist, scene has WebGL canvas, starting 3/5 PHATOM contract |
| Serpent | Frame-driven Slither Master cast creates real Circuit Serpent entities and starts cooldown at the cast frame |
| Clone | Frame-driven Ninja Star cast creates Cyborg Clone entities and starts cooldown at the cast frame |
| Cooldown | Hit interruption during selection cancels queued attack without consuming cooldown or spawning serpents |
| Reactions | Real `hitSlotta()` health handler dispatches light then heavy impact state |
| Gallium | Real `galliumGrabWorld()` target-selection ray grabs SLOTTA, `releaseGrip()` enters recovery |
| Dash | Real `updateSlottaDash()` stops at an injected Box3 wall, with no collider tunneling |
| Errors | `window.__errors` remains empty at the end of tested scenarios |

Tests pause normal game progression in a special `slotta_qa=1` iframe.
Each test uses a distant, empty **test-only arena** at coordinates (10000,
10000) and restores boss and player positions, health, animation, timers,
cooldowns, minions and effects. The mission still loads its real models,
scene, collision geometry, and gameplay code.

Normal player pages do not initialize the test API. In QA mode main.js
disables normal Metal checkpoint and profile writes. Test-only collision
shapes and summon visuals are disposed after the test.

## CI verification

`.github/workflows/slotta-browser-qa.yml` checks out the current branch,
installs headless Chromium and Playwright, serves the repository locally and
runs `connected/tests/slotta_browser_playwright.mjs` against this page.
The run requires **8/8** passes, no page exceptions or missing JS/GLB assets,
and retains a screenshot plus JSON diagnostic evidence as an artifact.

Source contract checks live in
`connected/tests/slotta_browser_contract.test.mjs` and join the existing
Physics regression tests.

## Important limits

- Headless Chromium on Linux is **not iOS Safari**, touch responsiveness, real
  Bluetooth-controller operation, or mobile performance/thermal testing.
- Programmatic actors and QA-only positions are not a substitute for finishing
  a whole boss fight using player input, controller, and camera.
- Dash-wall test inserts a synthetic Box3 obstacle into the actual world's
  collider array. It verifies the real collision resolution code, not every
  building material or geometry shape.
- No final rigged GLB or facial clips are included.
- SLOTTA visual appearance, unapproved assets and publishing remain
  **PROPOSAL / HOLD**. Do not merge until owner review and real-device QA.
