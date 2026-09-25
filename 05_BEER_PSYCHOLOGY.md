# 05 — Beer and Surreal State

## Purpose

Beer is a core comedy mechanic, not merely a healing/buff item. Drinking should make the game feel temporarily strange without destroying readability.

## State model

```text
SOBER
→ TIPSY
→ SURREAL
→ RECOVERING
→ SOBER
```

Exact durations are data-driven.

## Surreal effects

Effects can include:

- palette shifts;
- exaggerated character sizes;
- wobbling environment layers;
- strange object animations;
- altered idle animations;
- silly NPC reactions;
- harmless impossible background events;
- temporary alternate inspection lines;
- UI wobble that does not hide important information.

## Gameplay vs presentation

Most beer effects should be presentation-only. A small number may modify selected interactions. Critical puzzle facts, required item labels, and accessibility text must remain available.

## Why the equipment limitation matters

The comedy rule is intentional: a pipe in the active hand/equipment state means the player cannot immediately drink. The player has to recognize the problem and swap equipment. This should create funny short-term confusion without becoming frustrating.

## Timing

Effects use a timer/state machine. Do not scatter beer countdown logic across scene scripts.

## Recovery

Recovery may use a visual fade, simple animation, sound cue, and a short text reaction. It should not require a special item unless a future episode explicitly introduces such a mechanic.

## Accessibility rule

Never make a critical puzzle unsolvable because of psychedelic distortion. Offer reduced motion/visual effect settings while preserving the mechanical state.
