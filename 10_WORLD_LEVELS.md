# 10 — World and Level Structure

## World shape

Use small connected scenes rather than one large continuous map. Each scene has a clear purpose and a limited number of interactable objects.

## Recommended first-episode structure

```text
Scene 01 — Arrival
  establish movement, inspect, inventory

Scene 02 — Pub/Interior
  pipe + beer introduction, NPC dialogue

Scene 03 — Street
  first Perkele cat and simple item hunt

Scene 04 — Odd Yard/Workshop
  first safe puzzle

Scene 05 — Trouble Spot
  short hammer event and pipe choice

Scene 06 — Strange Route
  beer-driven surreal sequence

Scene 07 — Seppo Encounter
  rare food rescue/reaction scene

Scene 08 — Final Puzzle
  combined item clues, no active enemies

Scene 09 — Exit
  payoff and end-of-episode state
```

Names are placeholders and can be replaced with original content.

## Scene contract

Every scene defines:

- id;
- background/tile layers;
- collision/walkable map;
- exits;
- interactables;
- NPCs;
- hazards;
- music/ambience id;
- entry/exit hooks.

## Tile strategy

Use a small tile vocabulary. Reuse tiles with variations instead of making every tile unique. Depth is produced by layers and object offsets, not by complicated 3D simulation.

## Scene size

Prefer compact scenes that fit comfortably on the player's screen. Large empty spaces reduce joke density and increase pathfinding complexity without adding value.
