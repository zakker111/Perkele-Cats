# 08 — NPCs and Hammer Events

## NPC goals

NPCs should be memorable through short dialogue, animation, reactions, and useful clues. Avoid huge dialogue trees unless they directly support the story.

## NPC definition

Recommended fields:

- id;
- display name;
- scene id;
- position;
- portrait/visual id;
- dialogue ids;
- state flags;
- reactions;
- optional event hooks.

## Hammer event

Some people attempt to hit the player's head with a hammer. This is a short danger event, not a full combat encounter.

The event should have:

1. a readable telegraph;
2. a brief reaction window or interaction choice;
3. a deterministic resolution rule;
4. a funny result for success or failure;
5. a recovery path.

Possible player responses can include moving away, swapping equipment, drinking, using the pipe, or interacting with a nearby object, depending on the specific encounter. The individual encounter data decides what works.

## Fairness

Never hide the only required response behind an unreadable visual effect. Beer may make the event look strange, but the important action cue remains accessible.

## Damage

Hammer damage is an explicit event, e.g. `HAMMER_HIT`, and should not be applied from an animation frame directly. This keeps testing reliable.

## Dialogue

Keep lines short. Reactions to bizarre player actions are often more valuable than long exposition.
