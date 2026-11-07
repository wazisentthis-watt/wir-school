# METAL Forge Phase 5: mobile + controller reliability
**PROPOSAL / PUBLISH HOLD · Branch-only; do not merge or deploy.**
Baseline: `79361872d8a58c41d9e1eee0f5d4830b77913341`, current `main` already includes the owner's Phase 4 default-on Galaxy Gallium Forge.

- Grounded **SkyLab gamepad B** now forges and dissolves the board; during a sparring fight or airborne, B continues to dodge/dash. Pressing B again during formation is ignored so a held button cannot spawn a second board.
- Original Classic mode and its B mapping are untouched. Gamepad mapping, battery/pairing and actual Safari behavior require physical-device QA.
- Touch controls now capture and release individual pointers, reset on pointer cancel/capture loss/browser blur/pagehide, and use geometry-normalized joystick movement rather than 130px-fixed math.
- Narrow-phone CSS avoids the old overlap between left virtual stick and 4-column right touch action pad. Buttons retain minimum 44px tap targets; controller settings appear above, not on top of, touch buttons.
- Nonintrusive on-screen Galaxy Gallium forge progress (detecting, extraction, gathering, deck/wheels, activation, mounting, dissolution). It is derived from existing controller state and **does not mutate saves**.
- Existing character rigs, original GLB skateboard, first mission, mission save schemas, Gallium quantities, earlier combat input behavior in fights and emergency `?gal_forge=0` remain unchanged.
- Mobile Chromium emulation is **not a physical iPhone Safari or Bluetooth certification**. Hardware test still needed before release permission.
