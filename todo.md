# TODO — Master Plan & Phases

Single source of truth for implementation order, derived from all repository specs
(`01`–`25`, `AGENTS.md`, `versions.md`). Each phase maps to a release in `versions.md`.

**Golden rule (README):** one playable slice, always runnable. Every phase must end
green on: `node --test tests/engine.test.mjs` · `node tools/validate-content.mjs` ·
`node scripts/build-pages.mjs` · browser smoke test.

Legend: `[x]` done · `[~]` partial · `[ ]` todo

---

## PHASE 0 — Repository Setup ✅ COMPLETE
Docs: 24, 19

- [x] Playable skeleton structure: `game/` (source), `tests/`, `tools/`, `scripts/`, `dist/` (Pages output)
- [x] GitHub CI workflow as Pages deploy gate — `.github/workflows/ci-pages.yml`
- [x] Subpath-safe Pages build + root redirect `index.html`
- [x] `.gitignore`

---

## PHASE 1 — Foundation (v0.1.0) ✅ COMPLETE
Docs: 01, 02, 14, 15, 16, 18, 25

- [x] EventBus + deterministic clock (pure logic, no DOM) — `src/core/events.js`, `clock.js`
- [x] Player domain: health, inventory, equipment choice, beer state machine — `src/core/player.js`
- [x] Engine: click-to-move on walkable tiles, hotspots, interaction routing — `src/core/engine.js`
- [x] Pipe XOR beer exclusivity + explicit swap + 6-shot cycle + reload
- [x] Drunk text perception filter (`src/core/beer-logic.js`) wired into message pipeline
- [x] Beer surreal visual distortion (canvas CSS pass, reduced-distortion respected)
- [x] Food healing (berries/bread) + soap gag item — data-driven in `content/bundle.js`
- [x] Hammer danger events (telegraph, timed choices, deterministic outcomes)
- [x] Perkele cat hazard with cooldown; Seppo rescue NPC (once-per-run, bread gift)
- [x] Funny-recoverable death (revive overlay, no hard game-over)
- [x] Puzzle system (steps, choices, hints, key-item gating via conditions)
- [x] 3 scenes with exits/navigation covering Episode One beats 1–10 (skeleton scale)
- [x] Content validator — `tools/validate-content.mjs` (stable IDs, reference checks)
- [x] Save/load v1 (versioned localStorage, corruption-safe) — `src/persistence.js`
- [x] Isometric 2.5D canvas renderer + camera framing + HUD (HP, equipment chip w/ click-swap, shots, beer badge, inventory)
- [x] Keyboard controls (E/X/F/R/D/S/L/1-2-3/Esc) — docs/12
- [x] TTS toggle + graceful fallback — `src/tts.js`; reduced-distortion option — docs/17
- [x] Tests: 20/20 unit + 9/9 browser smoke green

**Exit criteria:** fresh clone → tests green; Pages URL loads and room is playable. **MET.**

---

## PHASE 2 — Signature Items Polish (v0.2.0) ⬅ START HERE
Docs: 03, 04, 05, 06, 11, 22
The mechanics exist; this phase makes them *feel* like the game's identity.

- [ ] Comedic failure audit: every wrong action (7th shot, drink-with-pipe, eat soap) gets a distinct joke line per docs/22
- [ ] Pipe targeting: fire only at valid targets (cats, hammer); "blast into the sky" miss gag elsewhere — docs/06
- [ ] Beer escalation variety: 2nd+ beer deepens SURREAL tint / adds wobble layers — docs/05
- [ ] Surreal gameplay nudge: friendly NPCs read as suspicious while SURREAL (and back) — docs/05
- [ ] Swap animation/feedback: brief HUD flourish so the XOR choice reads clearly — docs/12
- [ ] Item inspect coverage: every inventory item has flavor text (template format, docs/15)
- [ ] New tests: shot accounting vs target types, multi-beer escalation, swap feedback events
- [ ] Update `versions.md` changelog + tag `v0.2.0`

**Exit criteria:** pipe/beer exclusivity is felt in ≥10 distinct comedic moments; zero silent failures.

---

## PHASE 3 — Danger & Characters Expansion (v0.3.0)
Docs: 08, 09, 22

- [ ] Cat pack behavior: 2–3 cats coordinate, forcing pipe-or-flight decisions — docs/09
- [ ] More hammer variants across scenes (different NPCs, telegraphs, option sets) — docs/08
- [ ] Data-driven dialogue trees via `npc-template.md` format (branch by flags/inventory)
- [ ] Seppo personality pass: more deadpan lines, rare repeat-encounter gag
- [ ] Recovery tuning: every hazard ≤2 s restart, health economy balanced to food supply
- [ ] Encounter resolution matrix tests (cat × equipment × health states)
- [ ] Tag `v0.3.0`

**Exit criteria:** all three hazard types demonstrable with comedy-first, recoverable outcomes.

---

## PHASE 4 — Full Adventure Slice (v0.4.0)
Docs: 07, 10, 23

- [ ] Expand to full Episode One room list (docs/10 world map, docs/23 beats 1–10 at real scale)
- [ ] Multi-step puzzle chains across rooms using `puzzle-template.md` (key-item gating, stable IDs)
- [ ] Persistent world flags + scene-state memory (taken items stay taken, solved puzzles stay solved)
- [ ] Locked/hidden passages, safe-room puzzle density per docs/07
- [ ] Beat-by-beat playthrough smoke test (automated assertions for each of the 10 progression beats)
- [ ] Art pass: tile variety, props, per-scene lighting mood — docs/11
- [ ] Tag `v0.4.0`

**Exit criteria:** continuous click-through intro→finale with no dead ends, no unearned puzzles.

---

## PHASE 5 — Episode One Complete (v0.5.0)
Docs: 12, 13, 17, 25

- [ ] UI/UX pass: cursor states, hotspot hover hints, scrollable message log, settings screen — docs/12
- [ ] Audio: per-scene ambience, SFX set (pipe blast, sip, hammer, cat hiss), volume sliders — docs/13
- [ ] TTS voice coverage for all dialogue + narration; speaker-name captions
- [ ] Accessibility audit: colorblind-safe palette, keyboard-only completion path, captions, reduced motion — docs/17
- [ ] Save slots (3+) + autosave-on-scene-change + versioned migration
- [ ] Final comedy pass against docs/22 (every failure earns a laugh)
- [ ] Definition-of-Done checklist run (docs/25)
- [ ] Tag `v0.5.0` = **Episode One public release**

---

## PHASE 6 — Hardening & Performance
Docs: 14, 18, 19

- [ ] Determinism fuzz tests (seeded replays of engine ticks)
- [ ] Load-time budget < 2 s on throttled network; asset lazy-loading
- [ ] Cross-browser matrix in CI (Chromium / Firefox / Safari)
- [ ] Dev-only error telemetry overlay + content-hotswap debug mode

---

## PHASE 7 — Episode Two & Content Pipeline
Docs: 10, 15, 22

- [ ] Extract reusable scene/puzzle/NPC kits from Episode One into authoring templates
- [ ] New locations + escalated pipe/beer identity gags
- [ ] Localization scaffold: strings out of code (`fi` / `en`)

---

## PHASE 8 — Distribution & Community
Docs: 19, 24

- [ ] Custom domain + Pages CDN verification
- [ ] itch.io export wrapper (same bundle, base-path flag)
- [ ] Real backlog issues from open phase tasks; public roadmap page
- [ ] Branch protection on `main` + PR template enforcement in CI

---

## PHASE 9 — 1.0.0 Release Candidate

- [ ] Full regression suite green across Phases 2–8 features
- [ ] External playtest round (≥5 people), fix-list triage
- [ ] Docs refresh: README screenshots/GIF, `ARCHITECTURE.md`
- [ ] Semantic-version tag `1.0.0`

---

## HOUSEKEEPING (do alongside Phase 2)

- [ ] Move numbered docs into `docs/NN_*.md`, templates into `templates/` (matches README/MANIFEST paths)
- [ ] Add `CHANGELOG.md` seeded from `versions.md`
- [ ] Commit current working tree (Phase 1 code is staged but not yet committed)

---

## CURRENT STATUS SUMMARY (verified against code, 2026-09-26)

| Phase | Status |
|---|---|
| 0 — Repo setup | ✅ complete |
| 1 — Foundation v0.1.0 | ✅ complete (mechanics incl. pipe/beer, beer distortion, hazards, save/load) |
| 2 — Signature polish v0.2.0 | ⬅ **NEXT — start here** |
| 3–9 | not started |

**Start Phase 2.** First task: comedic failure-line audit of `engine.js` + `player.js` against docs/22.
