# 01 — Project Plan

## Product statement

Create a small, highly readable, browser-based comedy adventure where the player explores simple 2.5D tile scenes, solves safe puzzles, survives absurd hazards, swaps between a pipe and beer, eats strange food, and experiences temporary surreal changes after drinking.

## Player promise

The game should feel easy to control but unpredictable in outcome. The player should frequently think, “I understand what the game wants me to do, but I did not expect it to react like that.”

## Core loop

```text
Observe scene
→ click / inspect
→ collect or use an item
→ swap pipe / beer when necessary
→ solve a puzzle or survive a short hazard
→ trigger a joke/reaction
→ unlock the next scene
→ repeat
```

## Game pillars

- **Readable:** simple tiles, clear silhouettes, short text.
- **Interactive:** nearly every visible object has a reason to inspect or use.
- **Funny:** failure produces a reaction, not a dead end.
- **Weird:** beer alters presentation and selected interactions.
- **Safe puzzling:** puzzle sections have no active enemies.
- **Small systems:** each mechanic is understandable on its own.

## First playable vertical slice

One small street/interior scene should contain:

- player movement by click;
- one NPC;
- one item pickup;
- beer/pipe swapping;
- one six-shot pipe interaction;
- one beer surreal effect;
- one healing item;
- one safe puzzle;
- one Perkele cat hazard;
- one short hammer event;
- a clear scene exit.

Do not add a large world until this slice works.

## Production strategy

Build systems in reusable layers: rendering, input, world state, interaction, inventory, equipment, hazards, dialogue, puzzles, save data. Content should mostly configure these systems rather than subclassing them for every scene.

## Success criteria

The game can be opened in a normal desktop browser, clicked through without a tutorial video, completed as a short scenario, and understood by another developer from the repository alone.
