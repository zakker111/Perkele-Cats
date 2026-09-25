# 04 — Items and Health

## Item categories

- `FOOD` — restores health.
- `EQUIPMENT` — can become active equipment.
- `KEY_ITEM` — advances a puzzle or story condition.
- `GAG_ITEM` — mainly produces reactions, inspect text, or comedy.

## Required food

### Berries

Simple food item. Consuming it restores a small amount of health.

### Bread

Reliable food item. Consuming it restores a moderate amount of health.

### Soap

A fictional absurd comedy item. It may produce an intentionally ridiculous interaction or joke, but the game must not frame real soap consumption as safe, healthy, or recommended. Treat the in-game object as fantasy/comedy content.

### Seppo food rescue

Seppo is not an inventory item. He is a rare NPC event that can give the player food when the player is in serious need. The event should be controlled by a transparent low-health or scarcity rule rather than arbitrary spawn spam.

## Health rules

- `0 < health < max` means injured.
- `health = max` means full health.
- Healing cannot exceed max health.
- Damage cannot reduce health below zero.
- A death/incapacitation threshold is explicit.

## Consumable behavior

Consuming an item should:

1. Check item exists and is consumable.
2. Check the player can act.
3. Apply the item effect.
4. Remove/decrement the item.
5. Play feedback.
6. Save state if autosave is enabled.

Never remove an item before confirming that the effect was applied successfully.
