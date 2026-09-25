# 06 — Pipe Combat

## Role

The pipe is a six-shot short-range/ranged utility weapon. It exists mainly for brief comedy/action moments rather than as the game's primary genre.

## Ammo model

Each loaded cycle contains 6 shots.

```text
shots = 6
fire -> shots -= 1
shots == 0 -> cannot fire until reload/refill rule is satisfied
```

The exact reload rule must be defined by the episode content. Do not silently generate infinite ammunition unless the data says so.

## Targeting

Use explicit target ids and validation. A pipe shot should fail cleanly when:

- no valid target exists;
- target is out of range;
- player is in a state where firing is not allowed;
- no shots remain.

## Combat scope

Combat should be short. Prefer a few scripted or semi-scripted encounters over a full enemy combat system.

## Feedback

Every shot should produce:

- muzzle/pipe animation;
- audio cue;
- hit/miss feedback;
- remaining-shot UI change;
- NPC/world reaction where relevant.

## Safety with puzzles

Do not put active combat enemies into puzzle-solving spaces. If a player uses the pipe around a puzzle object, treat it as an explicit optional interaction or harmless joke.

## Upgrade compatibility

The pipe implementation should support future pipe variants through data, not a separate class for every pipe.
