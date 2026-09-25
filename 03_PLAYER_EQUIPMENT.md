# 03 — Player Equipment

## Equipment model

There are two signature equipment items:

- `PIPE`
- `BEER`

They occupy the same active equipment choice. The player can own both, but only one can be actively equipped.

## Critical rule

When `PIPE` is active:

- the player cannot directly drink beer;
- selecting beer should explain that the player must swap first;
- no hidden automatic swap should occur unless a future design explicitly enables it.

When `BEER` is active:

- the player can drink if beer charges/uses remain;
- pipe actions are unavailable until the pipe is equipped.

## UI

Show:

- active equipment icon;
- inactive equipment icon;
- swap button;
- pipe shots when pipe is active;
- drink control when beer is active;
- clear disabled reason when an action is unavailable.

## Swap behavior

Swapping is an atomic state change:

1. Validate the destination equipment exists.
2. Validate the player is in a state that permits swapping.
3. Change active equipment.
4. Update UI immediately.
5. Emit one equipment-changed event.
6. Allow the next action to see the new state.

## Better equipment

Future versions may contain replacement pipes or better beers. Upgrades must use the same equipment interface instead of creating unrelated player state.

### Pipe upgrades may change

- maximum shots;
- accuracy or range rules;
- visual effect;
- special utility property.

### Beer upgrades may change

- surreal duration;
- intensity profile;
- number of drinks available;
- specific interaction effects.

Do not let upgrades invalidate the simple pipe/beer equipment contract.
