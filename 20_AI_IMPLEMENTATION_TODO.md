# 20 — AI Implementation TODO

This is the execution checklist. Complete items in order unless an item is explicitly marked as parallel.

## Phase 1 — Foundation

- [ ] Create/verify browser project.
- [ ] Confirm build and local development command.
- [ ] Create game-state root.
- [ ] Create one tile-based 2.5D scene.
- [ ] Implement click-to-move.
- [ ] Implement interactable object base.
- [ ] Add basic UI shell.
- [ ] Add automated boot smoke test.

## Phase 2 — Player systems

- [ ] Add player health.
- [ ] Add inventory.
- [ ] Add active equipment state.
- [ ] Add pipe item definition.
- [ ] Add beer item definition.
- [ ] Add swap UI.
- [ ] Enforce pipe/beer exclusivity.

## Phase 3 — Pipe

- [ ] Implement six-shot state.
- [ ] Implement firing validation.
- [ ] Implement shot feedback.
- [ ] Implement empty-shot behavior.
- [ ] Add tests for six-shot cycle.

## Phase 4 — Beer and food

- [ ] Implement drink action.
- [ ] Implement beer state machine.
- [ ] Implement surreal presentation adapter.
- [ ] Implement food consumption.
- [ ] Add berries.
- [ ] Add bread.
- [ ] Add fictional soap gag safely.
- [ ] Add reduced-distortion mode.

## Phase 5 — Puzzle system

- [ ] Implement reusable puzzle state machine.
- [ ] Add first safe puzzle.
- [ ] Add hints.
- [ ] Add puzzle-completion event.
- [ ] Ensure no active enemies run in puzzle mode.

## Phase 6 — Characters and danger

- [ ] Implement NPC definition and dialogue.
- [ ] Implement TTS abstraction + text fallback.
- [ ] Implement hammer event.
- [ ] Implement Perkele cat hazard.
- [ ] Add damage cooldown handling.
- [ ] Add Seppo rescue encounter.

## Phase 7 — Persistence

- [ ] Implement versioned save schema.
- [ ] Implement save/load.
- [ ] Add invalid-save recovery.
- [ ] Add migration hook.

## Phase 8 — Content

- [ ] Build first-episode scenes.
- [ ] Populate NPCs and dialogue.
- [ ] Populate puzzles.
- [ ] Add food/equipment/keys.
- [ ] Add beer reaction content.
- [ ] Add hazard encounters.
- [ ] Add ending/payoff.

## Phase 9 — Release

- [ ] Run unit tests.
- [ ] Run browser smoke test.
- [ ] Validate content references.
- [ ] Check accessibility settings.
- [ ] Build production version.
- [ ] Deploy to GitHub Pages.
- [ ] Test deployed site.
- [ ] Update `versions.md`.

## Agent rule

Do not mark a checkbox complete because code exists. Mark it complete only after behavior is tested and the required user-facing flow works.
