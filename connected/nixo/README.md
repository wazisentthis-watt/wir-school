# NIXO: Morph Mill Network — game integration

This is the destination for the NIXO playable browser game and future WIR School training integration. Do **not** overwrite the existing `connected/` game.

## Intended structure
- `connected/nixo/game/3d/` — current articulated 3D arena, duel and elemental gauntlet.
- `connected/nixo/game/legacy-2d/` — original v0.2 2D fighting prototype.
- `connected/nixo/training/` — the eight character-specific Morph Mills.
- `connected/nixo/animation-library/` — original WIR moves, editor, rig mapping, corrected BVH/JSON imports.
- `connected/nixo/physics-lab/` — first body/impact simulation demonstration.
- `connected/nixo/README.md` — this integration index.

## Existing prototypes to preserve
- Morph Mill game v0.2 source and self-contained HTML.
- Morph Mill 3D v0.3 source and self-contained HTML, with camera, articulated fighters, animation import / equipping, and fight-memory UI.
- NIXO Physics Lab 001 HTML + Body Physics Bible.
- Combat game remains a prototype, **not** automatic video skeleton extraction.

## Inputs and contracts
MotionForge should output reviewed, versioned movement data with explicit rig ID, coordinate conventions, timebase, provenance, licensing and confidence. Reject unknown rigs and unreviewed reference-only motions from competitive release.

## Gameplay modes
Binary Bark boss; Elemental Outlaw Six (70–75); training arena; personalized Morph Mills; fight replay and skeleton overlays.

## Pending source migration
The full local builds (including offline HTML bundles and image assets) were packaged for transfer but are not represented by this index alone. Do not mark migration complete until the game files and assets have been committed and opened in a browser from GitHub Pages.
