# Lesson 01 · Pete's Circuit (specification only)

**Status:** WORKING PLAN, not executable code or a claim of a port. Related story: `Pete Stays` and `Gigabyte`.

## What players should experience

Tiny Pete traverses a simple circuit-board layout, collects **six contacts**, avoids hazards and reaches an exit. Pete stays a spider in this educational simulation; do not silently turn him into Savannah's powered avatar. It is not the fictional Gig-Shock experiment reproduced in hardware.

## Teachable source structure

- State: `player = {x, y, vx, vy, radius}`, `contacts`, `walls`, `exit`, `complete`.
- Inputs: `WASD`, arrow keys and responsive touch controls. Normalize diagonals so two keys do not move faster by accident.
- Timing: use `requestAnimationFrame`, measure elapsed time, cap extreme `dt` after a tab pause, and apply movement in `update(dt)`.
- Collision: prevent passing through board edges and keep visual contact feedback aligned with actual position.
- Level logic: collect six unique objects; gate exit on `remaining === 0`; avoid treating visual overlap as collection without the condition.
- UI: clear reset/retry; sound and effect toggles; readable touch targets.

## Narrative wrapper

Savannah notices Pete exploring the controller and wonders how a creature without hands might use an interface. The playable lesson makes a **simulation**, not a biological claim about Pete's cognition. A student's first goal is to make one object move; the second is to make the motion frame-rate independent; the third is to make contact collection measurable.

## Acceptance before claiming PLAYABLE

Run the actual HTML in a browser. Test keyboard and touch independently. Run at both low/high FPS. Verify six contacts, wall collisions, exit locks, restart, on-screen labels and no external assets. Report commit/build and actual results rather than citing historical success in another session.
