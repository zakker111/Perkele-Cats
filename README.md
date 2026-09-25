# Weird 2.5D Point-and-Click Adventure — AI Development Plan

## What this repository is

This repository is the implementation specification for an original browser-based 2.5D point-and-click comedy adventure. The game uses simple tile-based scenes, clear interactions, short puzzles, absurd NPC situations, a six-shot pipe, swappable beer, food-based healing, Perkele cats, hammer danger events, and temporary surreal effects caused by drinking.

The goal is not to reproduce any existing game. The reference point is the broad genre of classic comedy point-and-click adventures: readable scenes, funny item interactions, visual gags, characters with strong reactions, and puzzles. All characters, dialogue, art, music, locations, and puzzle solutions must be original.

## Read these files first

1. `AGENTS.md` — rules for an AI coding agent.
2. `versions.md` — release sequence and scope.
3. `docs/01_PROJECT_PLAN.md` — product and architecture overview.
4. `docs/20_AI_IMPLEMENTATION_TODO.md` — implementation order.
5. The system-specific document before modifying that system.

## Core gameplay contract

- Browser-first game.
- 2.5D presentation built from simple tiles/layers.
- Point-and-click interaction is the primary control model.
- Player has health, inventory, and a signature equipment choice.
- The signature equipment choice is either the pipe or beer; only one is active at a time.
- The pipe has six shots per loaded cycle.
- The player cannot drink beer while the pipe is equipped; they must swap first.
- Drinking causes a temporary surreal presentation/gameplay state.
- Food restores health.
- Berries and bread are normal healing items.
- Soap is a fictional absurd gag item and is not presented as real-world food or advice.
- A rare helpful Seppo encounter can provide food when the player is in serious need.
- Perkele cats are recurring hazards that can reduce health.
- Some NPCs create short hammer danger events.
- Puzzle rooms/segments are safe from active enemies and should focus on reasoning.
- Failure is funny and recoverable; do not build punishment-heavy loops.
- TTS is optional infrastructure. The game remains playable without it.

## Design priorities

1. Readability before visual complexity.
2. Funny interactions before combat depth.
3. Deterministic rules before hidden randomness.
4. Small reusable systems before custom one-off code.
5. Data-driven content before hard-coded scene logic.
6. Playable vertical slices before broad incomplete systems.

## Suggested repository layout

```text
/
├─ README.md
├─ AGENTS.md
├─ versions.md
├─ docs/
│  ├─ 01_PROJECT_PLAN.md
│  ├─ 02_CORE_GAMEPLAY.md
│  ├─ 03_PLAYER_EQUIPMENT.md
│  ├─ 04_ITEMS_HEALTH.md
│  ├─ 05_BEER_PSYCHOLOGY.md
│  ├─ 06_PIPE_COMBAT.md
│  ├─ 07_PUZZLES.md
│  ├─ 08_NPCS_HAMMER_EVENTS.md
│  ├─ 09_PERKELE_CATS.md
│  ├─ 10_WORLD_LEVELS.md
│  ├─ 11_ART_CAMERA.md
│  ├─ 12_UI_CONTROLS.md
│  ├─ 13_AUDIO_TTS.md
│  ├─ 14_TECHNICAL_ARCHITECTURE.md
│  ├─ 15_CONTENT_DATA.md
│  ├─ 16_SAVE_LOAD.md
│  ├─ 17_ACCESSIBILITY.md
│  ├─ 18_TEST_PLAN.md
│  ├─ 19_GITHUB_PAGES.md
│  ├─ 20_AI_IMPLEMENTATION_TODO.md
│  ├─ 21_SCOPE_NON_GOALS.md
│  ├─ 22_CONTENT_RULES.md
│  ├─ 23_PROGRESSION_FIRST_EPISODE.md
│  ├─ 24_REPO_WORKFLOW.md
│  └─ 25_DEFINITION_OF_DONE.md
└─ templates/
   ├─ scene-template.md
   ├─ puzzle-template.md
   ├─ npc-template.md
   └─ item-template.md
```

## Implementation principle

Build one playable slice and keep it runnable. Do not create a huge framework before the first room can be clicked through.

Recommended progression: boot -> scene -> click movement -> interaction -> inventory -> equipment -> pipe -> beer -> food -> one puzzle -> NPC dialogue -> hammer event -> cat hazard -> save/load -> release pipeline -> content expansion.

## Source-of-truth rule

When documents appear to disagree, prefer implemented behavior that is intentionally released and covered by tests. Otherwise use `AGENTS.md`, then the relevant system document, then `versions.md`. New ideas do not override an explicit rule without a documented change.
