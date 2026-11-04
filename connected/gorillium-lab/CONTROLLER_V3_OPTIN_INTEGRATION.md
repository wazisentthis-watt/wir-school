# WIR Connected controller v3 | Opt-in Savannah integration

**PROPOSAL / PUBLISH HOLD. No merge, live release or canon change.**

This is a **stacked** follow-up to draft PR #21. The normal WIR Connected input path is unchanged unless the page loads with `?controller_v3=1`.

## Testing routes

- Existing game (unchanged): `/connected/?lite=1`.
- Opt-in local/staged build: `/connected/?lite=1&controller_v3=1`.
- Desktop opt-in: `/connected/?controller_v3=1`.
- `?lite=1` still bypasses expensive post-processing; the new controller does not turn it off.
- Until this proposal is reviewed and merged, the **hosted URL does not include this controller test mode**. Run locally from the draft branch or GitHub PR preview if one is explicitly provided.

Start an HTTP server from repository root:
```sh
python3 -m http.server 8765 --bind 127.0.0.1
# Open http://127.0.0.1:8765/connected/?lite=1&controller_v3=1
```

## What the bridge actually changes

- Uses the pure `ControllerAdapter` in `connected/gorillium-lab/controller_core.mjs`.
- Supports radial movement/aim dead zones, frame-rate-independent right-stick smoothing, camera Y inversion and editable controller profiles.
- Provides a small in-game test panel. Displays the browser's actual controller ID and buttons/axes. Lets players save a custom button selection.
- Maps face and D-pad inputs to *existing WIR Connected* key actions. The default gamepad button numbers retain the WIR baseline.
- Leaves **physical LB/RB/LT/RT** as existing WIR grip/swing/charge/RIFFT chords, not override mappings. They are intentionally excluded from the remap UI because these actions are handled separately inside the original game loop.
- Preserves legacy keyboard, touch, device-connected fallback and current story saves. Controller-only preferences use a separate namespace.
- Blocks accidental actions on hot-plug connection and when a player is learning a new button.

There is no new Gorillium model loading, no new mission dependency, no changes to existing GLBs and no physics rewrite.

## Tests

```sh
node --check connected/assets/main.js
node --check connected/assets/controller_v3_bridge.mjs
node --test connected/tests/gorillium_controller_core.test.mjs connected/tests/controller_v3_bridge.test.mjs
node connected/tests/controller_v3_optin_browser_playwright.mjs
```

The Chromium integration test loads **both** the normal and opt-in Savannah game routes, checks model startup, tests a simulated pad, and confirms no alteration of a story-save sentinel. Simulated input cannot prove a real Bluetooth device works in iPhone Safari.

## Release gates

1. Tests must pass on a build from **this branch**, including the hosted visual load check.
2. Owner must identify controller by actual browser-reported Gamepad ID or hardware photo/model.
3. Verify real iPhone Safari Bluetooth pairing, physical label mapping, re-connect, analog drift, controller/touch fallback, Gallium LB+RT throw and LT+RT KODA charge.
4. Verify Metal S1–S4, three story chapters, mission boot recovery and no save loss.
5. Only after owner review, rebase/compare with updated main and explicitly approve a separate merge.

**Preserve PROPOSAL / PUBLISH HOLD.**
