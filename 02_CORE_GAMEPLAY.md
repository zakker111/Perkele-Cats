# 02 — Core Gameplay

## Player states

Use explicit high-level states:

- `EXPLORING` — normal movement and object interaction.
- `INSPECTING` — focused interaction with an object/NPC.
- `PUZZLE` — safe puzzle interaction; hazards are disabled unless the puzzle explicitly defines a cosmetic timer.
- `DANGER` — short hammer/cat/hazard sequence.
- `INCAPACITATED` — temporary recovery or restart choice.

## Interaction priority

A click should resolve in this order:

1. UI control if the click is in UI.
2. Active dialogue response if dialogue is open.
3. Puzzle control if in a puzzle.
4. Reachable world object under the cursor.
5. Walkable destination.
6. Nothing.

Every rejected interaction should have a reason when the reason matters to gameplay.

## Health

Health has a maximum. Damage is applied through named events rather than arbitrary renderer callbacks. Food restores health up to the maximum.

A typical tuning starting point is 5 maximum health. Treat this as a data value, not a hard-coded universal constant.

## Progression

Progress is driven by solved puzzles, discovered facts, collected items, NPC flags, and scene unlocks. Avoid pure grind.

## Failure

Failure states should usually restart the current short situation or move the player to a safe recovery point. Avoid deleting a large amount of progress because of a single cat collision or hammer mistake.

## Determinism

Puzzle answers and essential progression must be deterministic. Cosmetic timing and optional joke variation may use seeded or controlled randomness, but randomness must never make a critical puzzle impossible.

## Core verbs

- Walk
- Look/inspect
- Talk
- Take
- Use
- Give
- Equip
- Swap
- Drink
- Eat
- Fire
- Solve
- Exit

Keep the verb set small and reuse it across scenes.
