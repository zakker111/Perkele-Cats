# Versions and Release Plan

## 0.1.0 — Foundation

Goal: prove the browser game loop.

- Project boots in a browser.
- One tile-based 2.5D scene renders.
- Camera and click navigation work.
- Basic object interaction works.
- Player state and health exist.
- Minimal inventory UI exists.
- Automated smoke test can load the game.

## 0.2.0 — Signature Items

- Equipment system exists.
- Pipe can be equipped.
- Pipe has six shots.
- Beer can be equipped.
- Beer and pipe cannot be active together.
- Swapping is explicit and visible.
- Drinking works and starts the beer state.
- Food healing works.
- First safe puzzle works.

## 0.3.0 — Danger and Characters

- NPC dialogue framework.
- TTS adapter with fallback to text.
- Hammer danger event.
- Perkele cat hazard.
- Humorous reactions and feedback.
- First short scenario can be completed.

## 0.4.0 — Adventure Slice

- Multiple connected scenes.
- Several original puzzles.
- Multiple beer effects.
- Seppo rescue encounter.
- Save/load.
- Basic content data pipeline.

## 0.5.0 — First Episode Complete

- Planned first episode content complete.
- Puzzle chains complete.
- Main characters complete.
- Required items and interactions complete.
- Audio/TTS pass complete where supported.
- Balance and readability pass complete.

## 1.0.0 — Browser Release

- Stable production build.
- GitHub Pages deployment works.
- Critical bugs resolved.
- Accessibility checks complete.
- Performance acceptable on target desktop browsers.
- Save format versioned.
- Repository documentation matches implementation.

## Version policy

- Major: incompatible save/gameplay contract change.
- Minor: new gameplay system or substantial content.
- Patch: fixes, tuning, copy, content corrections, non-breaking technical changes.

Every release must record what changed, what was tested, and any known limitation.
