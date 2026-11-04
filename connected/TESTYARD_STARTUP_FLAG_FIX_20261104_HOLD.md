# WIR Connected startup blocker | independent repair (HOLD)
- **Problem:** publicly deployed Savannah at main `fad85c02504b2c7167d4e70e41445325a3604aeb` raises `ReferenceError: TEST_YARD_SKATE is not defined` at module startup (hosted Chromium failed first mission, see [run 41918799041](https://github.com/wazisentthis-watt/wir-school/actions/runs/41918799041)).
- **Smallest repair:** define `const TEST_YARD_SKATE=new URLSearchParams(location.search).get('skate_yard')==='1';` before the adapter is used. This is the already documented query flag in `connected/TESTYARD_SKATE_IMPORT_V01_HOLD.md`.
- **No changes:** default gameplay, movement/physics, Forge, ReFramer Pack 01/02, missions, saves, assets, or publication rules.
- **QA:** existing Test Yard workflow tests locally served baseline `?lite=1`, opt-in desktop `?lite=1&skate_yard=1`, phone-sized opt-in, original Metal Awakens mission and 4-wheel board. Hosted/public retest cannot pass until authorized release reaches Pages; do not mislabel green local QA as live recovery.
- **Status:** separate draft fix, PROPOSAL / PUBLISH HOLD, no merge or deployment. The authorized owner must resolve the trusted HOLD policy before shipping.
