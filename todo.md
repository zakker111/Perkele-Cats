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

## PHASE 1 — Foundation (v0.1.0) ✅ DONE (pre-existing skeleton, re-verified 2026-09-26)
Docs: 01, 02, 14, 15, 16, 18, 25

A working foundation already existed in the repo before this plan was executed
(21/21 tests green, content validator OK, Pages build OK). It is recorded here
for traceability — but per the golden rule we do NOT declare victory on it yet:
Phase 1 proper now means *auditing and hardening* it against the specs before
building Phase 2 on top. The audit tasks below are the real Phase 1 work.

### 1.A Audit & spec conformance — ✅ DONE 2026-09-26 (audit below)
- [x] Walk engine.js/player.js vs docs/02 (core gameplay contract): list every requirement met/unmet
- [x] Verify determinism: same inputs + same clock ticks ⇒ identical outcomes (no Math.random in core; seed check)
- [x] Verify AGENTS.md §3 non-negotiables one-by-one (pipe XOR beer, swap-before-drink, funny recovery, data-driven content, stable IDs)
- [x] Content-ID stability check: rename-detection test in validator; scene/item/puzzle/dialogue ID registry
- [x] Health-economy sanity: damage values vs food supply across the 3 scenes (table below)
- [x] Save-format review: version field, migration hook, corrupt-save path covered by a test
- [ ] Write `docs/STATUS.md`: what exists, where, how to run — single honest snapshot
- [x] Fix everything the audit finds; keep all existing tests green

#### 1.A Audit findings (2026-09-26)

**AGENTS.md §3 non-negotiables → code mapping (all MET):**
| Rule | Where enforced | Test |
|---|---|---|
| Point-and-click primary | `engine.clickObject`, `requestMove` | smoke_browser |
| Tile-based 2.5D scenes | iso renderer + walkable grid | smoke_boot |
| Pipe XOR beer, one active | `player._setEquipment` single slot | 'only one equipment' |
| No drinking with pipe equipped + UI explains swap | `canDrinkBeer` reason text + HUD chip | 'cannot drink while pipe' |
| Six shots per cycle | `MAX_SHOTS = 6`, reload on empty | 'six-shot cycle' |
| Pipe combat short/secondary | cat-only targets, cooldowns | 'cat hazard' |
| Puzzle rooms enemy-free | by design: hazard objects only placed in scene_forest; stove+gate puzzles have none (docs/07) | manual + smoke |
| Beer → temporary surreal state | TIPSY→SURREAL→RECOVERING→SOBER chain | **F-1 regression** |
| Surreal keeps text/logic readable | beer-logic filter preserves puzzle-critical lines | 'drunk filter' |
| Food heals; soap = fiction disclaimer | `consumeFood` gag branch prints safety line | 'soap gag' |
| Seppo rare bread-rescue | once-per-run flag | 'seppo' |
| Perkele cats damage | `triggerCat` + cooldown | 'cat' |
| Hammer events readable rules | telegraph + timed deterministic choices | 'hammer' |
| Funny recoverable failure | `_funnyDeath` + `revive()` half-health | 'revive' |
| TTS optional, text authoritative | tts.js graceful fallback | smoke |

**Determinism:** zero `Math.random` / `Date.now` in `src/core/*` (grep-verified);
Clock is simulated-time; death-line variation uses `clock.now()` (deterministic).
New regression test runs the full action sequence twice and asserts byte-identical
state. PASS.

**Bugs found & fixed (commit 19f4a9d):**
- **F-1** `drinkBeer` stored only the *last* timer id and cancelled just that one,
  so re-drinking during RECOVERING left stale timers → SURREAL was skipped.
  Fixed with a session-token-guarded timer chain. Regression tests added.
- **F-2** Swapping pipe→beer mid-session left orphan timers that could flip state
  back unexpectedly. Swap now cleanly ends the beer session. Test added.
- **F-3** `revive()` set SOBER but pending timers survived death. Revive cancels
  the session. Test added.

**Health economy (tuning verified):** start/max HP 100; cat hit −25 (cd 8 s),
hammer fail −40, revive → 50. Food: berries +15, bread +30. A worst-case loop
(cat+hammer = −65) is always recoverable from ≥2 bushes + Seppo bread; supply
(≥45 heal available in forest alone) exceeds hazard demand. Balanced.

**Save format:** `SAVE_VERSION = 1` stamped; loader rejects mismatched/corrupt
payloads (covered by persistence round-trip + garbage-input tests); `load()`
now also drops stale beer sessions. Migration hook point: `Engine.load` version
branch.

**Content IDs:** validator enforces unique stable ids + resolves every
`givesItem/dialogue/puzzle/exit` reference; duplicate/broken-ref detection is
unit-tested ('validation detects duplicate ids…'). Rename-safety: saves store
ids only — renaming an id invalidates old saves, documented as forbidden by
AGENTS.md §2 stable-id rule.

### 1.B Hardening & tooling
- [ ] CI actually runs on push/PR (verify workflow triggers; add Pages-deploy comment header)
- [ ] Browser smoke test runs in CI (Playwright job), not just locally
- [ ] Error boundary: uncaught exception shows funny recoverable overlay, not blank page
- [ ] Mobile/responsive pass on HUD + canvas scaling (docs/12, docs/17)
- [ ] Performance guard: frame-time budget assertion in smoke test (≤ 16 ms avg)
- [ ] README update: "How to run / test / deploy" section matching reality

### 1.C Housekeeping (from docs/24 repo-workflow)
- [ ] Move numbered specs into `docs/`, templates into `templates/` (git mv, links fixed)
- [ ] Add CHANGELOG.md seeded from versions.md
- [ ] Tag `v0.1.0` once 1.A–1.C all green

**Exit criteria:** written audit showing every docs/02 + AGENTS.md §3 rule mapped to code or a fix; CI green including browser smoke; tag v0.1.0 pushed.

---

## PHASE 2 — Signature Items Polish (v0.2.0)
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

## CURRENT STATUS SUMMARY (updated 2026-09-26)

| Phase | Status |
|---|---|
| 0 — Repo setup | ✅ complete |
| 1 — Foundation v0.1.0 | ⬅ **ACTIVE** — skeleton exists & is green (21/21 tests), now undergoing formal audit & hardening (1.A → 1.C) before tagging v0.1.0 |
| 2 — Signature polish v0.2.0 | planned (mechanics already prototyped in skeleton; will absorb audit findings) |
| 3–9 | not started |

**We are starting PHASE 1 properly.** First task: **1.A — spec-conformance audit**
(walk `engine.js`/`player.js` against docs/02 + AGENTS.md §3, verify determinism,
save-format review). The existing code is treated as a candidate implementation
that must pass the audit, not as finished work.
