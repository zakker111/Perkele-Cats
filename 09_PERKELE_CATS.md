# 09 — Perkele Cats

## Role

Perkele cats are recurring environmental hazards and comic antagonists. They should be immediately recognizable and memorable.

## Behavior

A cat can:

- idle;
- patrol a small path;
- notice the player;
- perform a warning animation;
- trigger a contact or swipe hazard;
- return to idle.

Do not build advanced AI unless a specific level needs it.

## Damage

A cat hazard has an explicit hitbox/trigger and a cooldown so one collision does not accidentally apply repeated damage every frame.

## Puzzle separation

Cats should not attack while the player is actively solving a puzzle. They can be present decoratively near a puzzle area, but the puzzle state pauses/deactivates their damage behavior.

## Funny consequences

Possible feedback:

- exaggerated animation;
- silly sound;
- player complaint line;
- cat immediately acts innocent;
- small scene displacement.

Avoid overly punishing knockback or progress loss.
