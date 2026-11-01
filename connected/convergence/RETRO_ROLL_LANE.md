# RIFFT RIDE-RZ: RETRO ROLL -> Metal Convergence Lane

Status: PROPOSAL / Publish HOLD
Lane owner: Retro Roll / 2D top-down skate-RPG subsystem
Canonical integration target: the Metal mega-convergence project
Baseline used for this handoff: `connected-swing-crowd` @ `3548143572dd93559ac06d676f406d70eb354e06`

## Why this lane exists

Retro Roll is not a separate replacement for Metal. It is a specialized Metal gameplay mode/world-access layer that must converge into the same canonical Metal project without creating a competing "latest" version.

The current Metal baseline already contains:
- Phase 6 Metal skate core
- on-foot movement + combat v2
- Gallium swing v2
- board persistence through swings / landings
- nonlethal street crews / sparring

Retro Roll must build ON TOP of those systems, not reimplement them.

## What Retro Roll contributes

### 1. 2D top-down Metal mode
A top-down arcade-skating interpretation of Metal designed for fast replayable routes, portable/mobile play, and stylized WIR world traversal.

### 2. Shared Shango / CCR movement grammar
Movement remains rooted in:
- Root: grounding, shadow position, air time, contact
- Core: velocity, direction, charge, friction, slide/coil state
- Crown: board element, lane choice, trick choice

### 3. Top-down skate readability
Core visual tricks:
- player sprite separates from ground shadow during ollies
- board can animate independently during flips
- bowls/ramps fake depth through scale, shadow, tint, and momentum
- bails preserve travel direction through friction-slide recovery rather than dead-stopping

### 4. Route-based world interaction
Retro Roll is not "Tony Hawk with WIR skins." Routes can branch by:
- street / rooftop / rail / water / RIFFT path
- rescue events
- world-state changes
- hidden/recovery routes
- character-specific traversal grammar

### 5. Element / chemistry board layer
Board materials can affect friction, charge, rail lock, hazards, and environmental reactions. This must remain deterministic and testable.

### 6. RIFFT breakthrough structure
A run may cross between WIR environments and art styles. Getting "lost" can deliberately reroute the player into another reality rather than simply fail the run.

## Integration rule

DO NOT fork Metal's identity.

Retro Roll should reuse canonical Metal data whenever possible:
- Metal appearance / forms
- board state
- Gallium rules
- movement constants where compatible
- combat metadata where used
- progression / save identity
- controller mapping conventions

If a 2D representation needs different numbers for feel, those values should be stored as mode-specific tuning, not silently redefine Metal globally.

## Proposed repo shape after convergence

```
metal/
  canon/
  shared/
    input/
    movement/
    gallium/
    board/
    save/
  modes/
    connected-3d/
    waymaker/
    retro-roll-2d/
  assets/
    metal/
    shared/
  tests/
  docs/
    convergence/
```

Exact paths may change in the mega-convergence repo. The important rule is that Retro Roll lives as a MODE sharing canonical Metal systems, not as an unrelated game copy.

## Retro Roll first vertical slice

One dense replayable Morrow route:
- Metal only
- top-down 2D
- controller + touch
- push / carve / powerslide / ollie / kickflip / grind / wall interaction
- high / middle / low route choices
- one rescue event
- one RIFFT breakthrough
- one Gallium interaction
- score: time + flow + route + style + rescue + stability + return
- clean restart and replay loop

No feature expansion until the route feels good.

## Art package expected

For the first production slice:
- Metal reference sheet
- Metal top-down key-pose sprite sheet
- board sheet
- Morrow terrain/tile sheet
- rails/route objects
- parallax/background style references
- rescue/interactable sprites
- collectible/boost/checkpoint sprites
- hazards/obstacles
- Gallium/RIFFT VFX
- speed/dust/spark VFX
- HUD
- result screen
- title/menu

Approx. 15 master sheets, with individual sprite frames packed inside those sheets.

## Anti-drift rules for every chat / agent

1. Before coding, read the convergence manifest and latest accepted Metal head.
2. Never call a local experiment "current Metal" unless its head is registered.
3. New work belongs on a feature branch / PR.
4. Do not overwrite another lane's mechanics to make integration easier.
5. If the same feature already exists in canonical Metal, adapt it instead of rebuilding it.
6. Keep PROPOSAL / Publish HOLD unless the user explicitly approves publication.
7. Every handoff must record:
   - baseline SHA
   - files touched
   - features added
   - tests run
   - unresolved conflicts
   - next integration step

## Immediate handoff request to the mega-convergence chat

When the canonical Metal convergence repo/branch is established:
1. register this Retro Roll lane,
2. preserve its 2D top-down identity,
3. map its shared systems to canonical Metal movement/board/Gallium/save/input modules,
4. keep its mode-specific rendering and route logic isolated,
5. cherry-pick or port only after comparing against the newest Metal head.

This branch is a convergence handoff, not a claim to be the final canonical Metal branch.
