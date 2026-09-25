# 16 — Save and Load

## Save scope

Persist only gameplay state needed to continue, not renderer internals.

Recommended fields:

- save format version;
- current scene id;
- player position/checkpoint;
- health;
- inventory;
- active equipment;
- pipe shots;
- beer state/time remaining if design requires it;
- puzzle completion flags;
- NPC progression flags;
- unlocked scene/exit flags.

## Schema

Use an explicit save object with a version number.

Example:

```json
{
  "version": 1,
  "sceneId": "scene_street_01",
  "player": {
    "health": 4,
    "activeEquipment": "PIPE",
    "pipeShots": 3,
    "inventory": ["item_bread_basic"]
  },
  "flags": {
    "puzzle_gate_open": true
  }
}
```

## Autosave

Autosave after major progression events such as puzzle completion, scene exit, or important item acquisition. Avoid saving during every animation frame.

## Corrupt/invalid saves

Never crash because a save is malformed. If a save cannot be safely loaded, preserve the original data if possible and offer a new-game or recovery option.

## Migration

Each incompatible save format needs a migration step or a clear compatibility decision recorded in `versions.md`.
