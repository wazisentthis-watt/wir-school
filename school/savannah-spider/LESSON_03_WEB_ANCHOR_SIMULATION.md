# Lesson 03 · Rope tension, anchors and consequences

**Status:** EDUCATIONAL PROPOSAL · Related episodes: **Break-In**, **River Street Run**.

The webline is treated as an **idealized force constraint**, not an invitation to perform real dangerous stunts. Do not try anchoring heavy real-world carts, jumping off buildings or using improvised load-bearing rope systems.

## Simulation variables

- Moving mass and velocity
- Anchor position and structural capacity
- Rope length, slack, stiffness and break threshold
- Ground friction and collision bounds
- Nearby bystander clearance
- Objective: safely redirect a virtual rolling cart to a clear landing

## Core insight

In *Break-In*, Savannah attaches to a shelf that is not fixed: his pull makes it rotate, worsening danger. In *River Street Run*, he chooses a fixed stone support and redirects a cart toward an empty landing instead of simply trying to freeze it.

The lesson asks students to try three **virtual** anchor choices: a loose shelf, a weak railing and a solid simulation anchor. Plot the resulting paths, inspect why 'stronger pull' sometimes worsens outcomes, and show success only when the cart stops without entering pedestrian zones.

## Acceptance before runtime claims

The playable implementation must render a repeatable path, let students change one parameter at a time, display anchor state and force feedback, handle rope-break conditions, and prevent unsafe real-world instructions from being treated as gameplay advice. Keep Savannah Spider's independent project code away from Metal's Gallium systems.
