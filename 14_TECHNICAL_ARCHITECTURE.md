# 14 — Technical Architecture

## Guiding architecture

Use a small event/state-driven browser game architecture. Exact framework choice is implementation-dependent; do not introduce one without a project-level reason.

## Recommended layers

```text
Presentation
  renderer, UI, animation, audio

Game application
  input routing, scene controller, dialogue controller

Domain systems
  player state, inventory, equipment, puzzle, hazard, progression

Content
  scenes, items, NPCs, puzzles, dialogue, tuning

Persistence
  save/load/version migration
```

## Game state

Keep authoritative state in one predictable structure. Renderers read state; they should not secretly mutate gameplay state.

## Events

Useful events include:

- `SCENE_ENTERED`
- `INTERACTION_STARTED`
- `ITEM_ADDED`
- `ITEM_CONSUMED`
- `EQUIPMENT_CHANGED`
- `PIPE_FIRED`
- `BEER_DRANK`
- `BEER_STATE_CHANGED`
- `DAMAGE_APPLIED`
- `PUZZLE_COMPLETED`
- `HAMMER_EVENT_STARTED`
- `HAMMER_EVENT_RESOLVED`
- `CAT_HAZARD_TRIGGERED`
- `DIALOGUE_STARTED`
- `DIALOGUE_FINISHED`

## Timing

Centralize timed states such as beer duration and hazard cooldowns. Do not implement important timers in ad-hoc DOM callbacks.

## Randomness

Randomness is optional for cosmetic variety. Essential gameplay must not depend on uncontrolled random state. When randomness is needed, use one seeded/random service so tests can reproduce behavior.

## Error handling

Invalid content ids and invalid state transitions should produce development-time diagnostics. In production, user-facing behavior should fail gracefully without corrupting save data.
