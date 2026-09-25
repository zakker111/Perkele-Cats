# 11 — Art and Camera

## Visual target

Simple, colorful, tile-based 2.5D graphics. The player should be able to understand the scene at a glance.

## Rendering layers

Recommended order:

1. background color/sky;
2. far background tiles;
3. midground architecture;
4. floor/walkable tiles;
5. interactable props;
6. characters;
7. foreground occluders;
8. UI/interaction markers.

## 2.5D model

Use flat or low-detail sprites/planes with depth ordering. Avoid a complex 3D engine unless the existing project already uses one successfully.

## Camera

The camera should:

- frame the active scene cleanly;
- keep the player visible;
- avoid excessive screen shake;
- optionally pan a small amount when moving between scene sections;
- support a reduced-motion setting.

## Visual hierarchy

Interactive objects should differ by silhouette, motion, hover highlight, or a consistent cursor cue. Do not rely on tiny text alone.

## Beer visuals

Beer effects should be implemented as configurable post-processing/overlay/layer effects when possible. Keep a safe mode that reduces distortion while preserving state and feedback.

## Asset naming

Use stable ids such as:

`tile_street_01`, `prop_bread_01`, `npc_seppo_01`, `cat_perkele_01`, `player_idle_01`.

Avoid filenames tied to temporary scene names when the asset is reusable.
