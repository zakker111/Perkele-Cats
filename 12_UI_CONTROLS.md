# 12 — UI and Controls

## Input

Primary: mouse/touch pointer.

Optional desktop shortcuts may exist for convenience, but every essential action must be possible with point-and-click.

## Cursor states

Useful cursor/tool modes:

- move;
- inspect;
- talk;
- take/use;
- unavailable;
- pipe target;
- puzzle interaction.

## HUD

Minimum persistent information:

- health;
- active equipment;
- pipe shots if relevant;
- inventory access;
- current interaction/object name when helpful.

## Inventory

Inventory should be a small grid/list with icon + readable name. Selecting an item should show its intended action rather than requiring a memorized verb syntax.

## Equipment panel

Display pipe and beer as two explicit choices. When pipe is active and the player tries to drink, the UI should say something equivalent to: “The pipe is equipped. Swap to beer first.” The wording can be funny but must be clear.

## Feedback

Important events should use at least two channels when possible: animation + text, sound + icon, etc. This helps players who miss one channel.

## No silent failure

If an action is invalid, the player gets a visible/inspectable reason or a character reaction.
