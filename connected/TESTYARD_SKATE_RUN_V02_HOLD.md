# METAL Test Yard 3D -> WIR Connected Savannah | scoring integration v0.2
**PROPOSAL / PUBLISH HOLD | Opt-in only | No merge or publish**

## Actual input and source integrity
- User-supplied input: `METAL Test Yard 3D.html` (2,040,297 bytes, SHA-256 `91948dbf15c724445e3ef8f94aba3e0ca71d5676cb248ae011b8867be12f856c`).
- Original uses Three.js 0.160 from CDN, height-profile ramps, rails, 1/240 physics substeps, 9.8m/s² gravity, flip/grab/manual/grind/bail mechanics, two-minute runs, trick repetitions and combos.
- The original HTML is *not committed* to this game repository. The code below is an isolated adaptation derived from the supplied Test Yard scoring intent.
- Existing WIR Connected in GitHub already has `connected/assets/testyard_skate_adapter.mjs`, its real scene hook in `main.js`, and `?skate_yard=1` gate. This revision builds on that implementation rather than creating a conflicting second skating solver.

## Exactly what v0.2 changes
1. New pure `testyard_session_score.mjs` for independent 120-second runs and unlimited free-skate. Trick names/points come **only from confirmed landing, completed rail-contact line and manual completion events** of the real Connected runtime.
2. A Test Yard status panel with `120s RUN`, `FREE SKATE`, remaining time, combo multiplier and banked points, visible only with the existing `?skate_yard=1` flag.
3. Original-style repeated trick score decay (1.0, 0.5, 0.25...), lines multiply by actual completed trick count, grounded grace window for banking, and bail dropping the unbanked combo.
4. No player/world entity creation, movement physics replacement, save format, currency, Gallium cost, controller remapping, or original mission changes. This module has **no storage, network, DOM, Three.js or animation-loop dependencies**.

## Try in the branch
- Serve a checked-out branch locally: `python3 -m http.server 8765`
- Baseline: `http://127.0.0.1:8765/connected/?lite=1`
- Test Yard: `http://127.0.0.1:8765/connected/?lite=1&skate_yard=1`
- Equip real board using existing B forge; if the forge takes time, do not override it. Use FLIP/GRAB/MANUAL on screen or the existing `[`, `]` and `'` keyboard actions. Confirm actual trick, then bank the line. Start a 120-second run separately.
- Debug inspection on opt-in branch only: `window.__game.testYardSession()`.

## Checks / open issues
- Unit: `node --test connected/tests/testyard_session_score.test.mjs`.
- Original source parity: `node --test connected/tests/testyard_skate_adapter.test.mjs`.
- Full browser: `node connected/tests/testyard_connected_browser_playwright.mjs` served from the private checkout after Playwright install.
- Existing first-mission, controller, save, Forge, SLOTTA and physics regressions must remain green.
- **Not ported in this revision:** 1/240 physics replacement, height-profile halfpipe, true roll-in bank, exact rail-projection physics, speed-dependent ramp takeoffs, or the original run's R-I-F-F-T collectible letters. Those need a separate collision/wheel-contact review, not a copy/paste of the original entire simulation.
- **Unverified until manual testing:** real iPhone Safari/touch and the user's physical Xbox-style Bluetooth controller.
- **Publication:** HOLD. Review the draft PR and regression report before any merge or production deploy.
