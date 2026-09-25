# AGENTS.md — Instructions for AI Coding Agents

This file is the operational contract for AI agents working on this repository.

## 1. Mission

Build the game described in the repository documents without silently changing its core rules. Keep the game browser-playable, funny, readable, deterministic, and simple enough to maintain.

## 2. Mandatory workflow

Before coding:

1. Read this file.
2. Read `README.md` and `versions.md`.
3. Read the system document(s) related to the requested change.
4. Inspect the current code before inventing new abstractions.
5. State the smallest implementation slice that can prove the feature works.

During coding:

- Prefer existing project utilities and architecture.
- Keep game content data-driven when practical.
- Use stable ids for scenes, items, NPCs, interactions, puzzles, hazards, and save data.
- Keep state transitions explicit.
- Avoid hidden side effects in click handlers and render functions.
- Do not make browser APIs a hard dependency of core simulation rules when an abstraction is possible.
- Do not add a second framework to solve a problem already solved by the project.
- Do not use silent catch-all error handling for gameplay-state errors.
- Do not make randomness necessary for puzzle correctness.

After coding:

- Run relevant tests.
- Run the browser build.
- Verify the changed flow manually when possible.
- Update the relevant documentation when behavior changed.
- Check save compatibility if player state changed.
- Keep the repository deployable.

## 3. Non-negotiable gameplay rules

- Point-and-click is the primary interaction model.
- Scenes are simple tile-based 2.5D compositions.
- Pipe and beer are the signature equipment choices.
- Pipe and beer share the active equipment choice; only one is active.
- The player cannot drink while the pipe is equipped. The UI must explain that a swap is required.
- The pipe contains six shots per loaded cycle.
- Pipe combat is short and secondary to exploration and puzzles.
- Puzzle sections do not contain active enemies.
- Drinking beer creates a temporary surreal state.
- Surreal presentation can be visually strange, but essential text and puzzle logic must stay understandable.
- Food heals. Berries and bread are valid normal food.
- Soap is a fictional comedy item. Do not imply that consuming real soap is safe.
- Seppo is a rare helpful food-rescue encounter.
- Perkele cats are hazards that can damage the player.
- Hammer events are short danger situations driven by readable rules.
- Death/failure should generally produce humorous feedback and a sensible retry/recovery path.
- TTS is optional; text remains authoritative.

## 4. Coding style for gameplay

Use explicit state machines where a system has states. Example:

```text
PlayerState
  exploring
  interacting
  puzzle
  danger
  incapacitated

EquipmentState
  PIPE
  BEER
  NONE

BeerState
  SOBER
  TIPSY
  SURREAL
  RECOVERING
```

Use named functions with clear intent such as:

- `equipPipe()`
- `equipBeer()`
- `swapEquipment()`
- `drinkBeer()`
- `consumeFood()`
- `firePipe()`
- `startHammerEvent()`
- `resolvePuzzleStep()`
- `applyCatDamage()`

Do not rely on loosely coupled booleans when an explicit state is clearer.

## 5. Content rules

Keep text, item definitions, puzzle definitions, scene metadata, dialogue, and balancing values in data files when possible. Code should provide reusable behavior; content should describe instances.

Do not copy protected material from existing games. The game may use broad genre ideas but all implementation and content must be original.

## 6. UI rules

The player should always be able to answer these questions:

- Where am I?
- What can I click?
- What am I carrying?
- Is the pipe or beer active?
- How much health do I have?
- How many pipe shots remain?
- Why did an action fail?
- What is currently strange because of beer?

A failed action should produce a readable explanation or funny response rather than doing nothing silently.

## 7. Testing rules

Every major system needs unit or integration tests. Critical rules require explicit tests:

- no beer use while pipe is active;
- successful equipment swap;
- six-shot pipe cycle;
- pipe cannot fire with zero shots;
- food increases health without exceeding maximum health;
- puzzle logic works without combat;
- beer state expires correctly;
- cat damage applies once per intended hit/event;
- hammer event resolves deterministically for a given input/state;
- save/load preserves important player state;
- game can boot in a browser build.

## 8. Scope control

Do not add multiplayer, open-world simulation, procedural puzzle generation, complex real-time physics, or full voice acting unless a future version explicitly adds them. See `docs/21_SCOPE_NON_GOALS.md`.

## 9. Definition of agent success

A change is successful when it is implemented, tested, documented when needed, visually understandable, and compatible with the game's existing rules. A feature is not complete merely because the code compiles.
