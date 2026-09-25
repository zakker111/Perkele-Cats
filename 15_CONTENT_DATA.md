# 15 — Content Data

## Goal

Keep content editable by humans and AI without changing engine code for every new scene, item, puzzle, or NPC.

## Recommended data groups

```text
content/
  scenes/
  items/
  equipment/
  npcs/
  dialogue/
  puzzles/
  hazards/
  audio/
  tuning/
```

JSON is a reasonable default when runtime parsing is needed; TypeScript/JavaScript modules are acceptable when the existing project architecture already uses them. Do not invent a second content format without need.

## Stable ids

Ids should be unique and durable. Do not derive ids from display text.

Example:

```json
{
  "id": "item_bread_basic",
  "type": "food",
  "displayName": "Bread",
  "heal": 2,
  "stackable": true
}
```

## Scene data

A scene should reference object ids and positions rather than embedding complex behavior.

## Puzzle data

Prefer declarative rules where practical: state, action, precondition, transition, completion.

## Dialogue data

Keep dialogue ids stable so save files and scene scripts can refer to them safely.

## Validation

Add a content validation step that detects:

- duplicate ids;
- missing references;
- invalid enum values;
- missing required fields;
- impossible puzzle references;
- missing asset references where validation is available.
