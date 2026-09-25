# 07 — Puzzle System

## Design rule

Puzzles are safe spaces. No active enemy should attack the player while a puzzle is being solved.

## Puzzle structure

A puzzle definition should contain:

- id;
- scene id;
- starting state;
- interactable controls;
- valid transitions;
- completion condition;
- reward/unlock;
- hint text;
- failure feedback if needed.

## Puzzle principles

- The goal is understandable from observation and dialogue.
- Required objects are discoverable.
- A wrong action should teach something or produce a funny reaction.
- Never require pixel-perfect clicking.
- Never depend on an undocumented random number.
- Do not make the player repeat a long sequence after a small mistake.

## Puzzle types

Recommended reusable types:

- sequence/order;
- object combination;
- switch/lever state;
- code/key matching;
- dialogue deduction;
- spatial arrangement;
- timing-free observation puzzle.

## Hint system

Use 2-3 levels of hints:

1. indirect observation;
2. clear clue;
3. near-solution explanation.

Hints should never soft-lock progress.

## Beer interaction

Beer may reveal an optional alternate clue or humorous interpretation, but the underlying puzzle must remain solvable without requiring intoxication unless the episode explicitly labels a puzzle as a beer-gated joke puzzle.

## Completion

On success, emit a puzzle-completed event and update progression state. Do not rely solely on a scene-local boolean.
