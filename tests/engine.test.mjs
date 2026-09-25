// AGENTS.md §7 critical-rule tests. Pure Node, zero dependencies:
//   node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

import { Engine } from '../game/src/core/engine.js';
import { EquipmentState, BeerState, MAX_SHOTS } from '../game/src/core/player.js';
import { validateContent } from '../game/src/core/content-validation.js';
import { content as realContent } from '../game/content/bundle.js';
import { filterDrunkText } from '../game/src/core/beer-logic.js';
import { GameEvents } from '../game/src/core/events.js';

function makeEngine() {
  // deep clone so scene mutations (taking items) don't leak between tests
  const c = structuredClone(realContent);
  const e = new Engine(c);
  e.start(c.startScene, { x: 2, y: 4 });
  return e;
}

function giveStarterKit(e) {
  e.player.addItem('item_pipe');
  e.player.addItem('item_beer_bottle', 3);
}

test('content bundle passes validation with zero errors', () => {
  assert.deepEqual(validateContent(structuredClone(realContent)), []);
});

test('validation detects duplicate ids and missing references', () => {
  const bad = structuredClone(realContent);
  bad.scenes[0].objects.push({ id: 'obj_ghost', action: 'take', givesItem: 'item_does_not_exist' });
  bad.scenes[0].objects.push({ id: 'obj_bad', action: 'teleport' });
  const errors = validateContent(bad);
  assert.ok(errors.some((m) => m.includes('unknown givesItem')));
  assert.ok(errors.some((m) => m.includes('invalid action')));
});

test('game boots into the start scene', () => {
  const e = makeEngine();
  assert.equal(e.sceneId, 'scene_moi');
  assert.ok(e.messages.length > 0);
});

test('pipe cycle is exactly six shots', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  assert.equal(e.player.shotsLeft, MAX_SHOTS);
  assert.equal(MAX_SHOTS, 6);
  for (let i = 5; i >= 0; i--) {
    const r = e.player.firePipe();
    assert.equal(r.ok, true);
    assert.equal(r.shotsLeft, i);
  }
  const empty = e.player.firePipe();
  assert.equal(empty.ok, false, 'cannot fire with zero shots');
  e.reloadPipe();
  assert.equal(e.player.shotsLeft, 6);
});

test('pipe and beer are mutually exclusive; swap works', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  assert.equal(e.player.equipment, EquipmentState.PIPE);
  e.swapEquipment();
  assert.equal(e.player.equipment, EquipmentState.BEER);
  e.swapEquipment();
  assert.equal(e.player.equipment, EquipmentState.PIPE);
});

test('cannot drink while pipe equipped; must swap first', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  const blocked = e.drinkBeer();
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /swap/i);
  e.swapEquipment();
  const ok = e.drinkBeer();
  assert.equal(ok.ok, true);
});

test('beer state machine expires through TIPSY->SURREAL->RECOVERING->SOBER', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  e.drinkBeer();
  assert.equal(e.player.beerState, BeerState.TIPSY);
  e.update(e.content.tuning.beer.tipsySeconds + 0.01);
  assert.equal(e.player.beerState, BeerState.SURREAL);
  assert.equal(e.surrealActive, true);
  e.update(e.content.tuning.beer.surrealSeconds + 0.01);
  assert.equal(e.player.beerState, BeerState.RECOVERING);
  e.update(e.content.tuning.beer.recoveringSeconds + 0.01);
  assert.equal(e.player.beerState, BeerState.SOBER);
  assert.equal(e.surrealActive, false);
});

test('food heals up to max health but never beyond', () => {
  const e = makeEngine();
  e.player.health = 9;
  e.player.addItem('item_bread'); // heal 3
  const res = e.eatFood('item_bread');
  assert.equal(res.ok, true);
  assert.equal(e.player.health, e.player.maxHealth);
  assert.equal(e.player.hasItem('item_bread'), false, 'consumed on use');
});

test('soap gag heals nothing and warns it is fiction', () => {
  const e = makeEngine();
  const before = e.player.health;
  e.player.addItem('item_soap');
  const res = e.eatFood('item_soap');
  assert.equal(res.gag, true);
  assert.equal(e.player.health, before);
  assert.match(e.messages.at(-1), /do not eat real soap/i);
});

test('puzzle completes deterministically and rewards progression', () => {
  const e = makeEngine();
  e.startPuzzle('puzzle_stove');
  for (const step of e.content.puzzles.puzzle_stove.steps) {
    const wrong = e.puzzleAnswer('puzzle_stove', (step.answerIndex + 1) % step.choices.length);
    assert.equal(wrong.ok, false, 'wrong answer rejected');
    const right = e.puzzleAnswer('puzzle_stove', step.answerIndex);
    assert.equal(right.ok, true);
  }
  assert.equal(e.flags.stove_solved, true);
  assert.ok(e.player.hasItem('item_gate_key'));
});

test('finale puzzle win requires key via conditions', () => {
  const e = makeEngine();
  e.enterScene('scene_forest', { x: 12, y: 4 });
  e.clickObject('obj_gate');
  assert.equal(e.won, false, 'gate locked without key');
  e.player.addItem('item_gate_key');
  e.clickObject('obj_gate');
  for (const step of e.content.puzzles.puzzle_finale.steps) {
    e.puzzleAnswer('puzzle_finale', step.answerIndex);
  }
  assert.equal(e.won, true);
});

test('cat damage applies once per hit and respects cooldown', () => {
  const e = makeEngine();
  e.enterScene('scene_forest', { x: 8, y: 3 });
  const before = e.player.health;
  e.clickObject('obj_cat');
  assert.equal(e.player.health, before - e.content.tuning.cat.damage);
  e.clickObject('obj_cat'); // immediate re-click -> cooldown, no second hit
  assert.equal(e.player.health, before - e.content.tuning.cat.damage);
  e.update(e.content.tuning.cat.cooldownSeconds + 1);
  e.clickObject('obj_cat');
  assert.equal(e.player.health, before - 2 * e.content.tuning.cat.damage);
});

test('hammer event resolves deterministically for a given choice', () => {
  const e = makeEngine();
  e.enterScene('scene_forest', { x: 5, y: 5 });
  e.clickObject('obj_hammer_zone');
  assert.ok(e.hammer, 'event started');
  const before = e.player.health;
  e.hammerChoice(0); // dodge = success
  assert.equal(e.player.health, before, 'success means no damage');
  assert.equal(e.hammer, null);

  e.clickObject('obj_hammer_zone');
  e.hammerChoice(2); // stand still = fail
  assert.equal(e.player.health, before - e.content.tuning.hammer.damage);
});

test('hammer timeout falls deterministically if player dawdles', () => {
  const e = makeEngine();
  e.enterScene('scene_forest', { x: 5, y: 5 });
  e.clickObject('obj_hammer_zone');
  const before = e.player.health;
  e.update(e.content.tuning.hammer.windowSeconds + 1);
  assert.equal(e.hammer, null);
  assert.equal(e.player.health, before - e.content.tuning.hammer.damage);
});

test('death is recoverable with humorous feedback', () => {
  const e = makeEngine();
  e.player.takeDamage(999, 'test-cat');
  assert.equal(e.gameOver, true);
  assert.match(e.messages.at(-1), /died|dead|absurdity|flowers/i);
  e.revive();
  assert.equal(e.gameOver, false);
  assert.ok(e.player.health > 0);
});

test('save/load preserves important player state', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  e.player.firePipe();
  e.setFlag('met_maija');
  const save = e.serialize();

  const e2 = makeEngine();
  assert.equal(e2.load(JSON.parse(JSON.stringify(save))), true);
  assert.equal(e2.sceneId, e.sceneId);
  assert.equal(e2.player.equipment, EquipmentState.PIPE);
  assert.equal(e2.player.shotsLeft, e.player.shotsLeft);
  assert.equal(e2.flags.met_maija, true);
  assert.ok(e2.player.hasItem('item_beer_bottle'));
});

test('invalid save version fails gracefully without corrupting state', () => {
  const e = makeEngine();
  const before = e.player.health;
  assert.equal(e.load({ version: 99 }), false);
  assert.equal(e.player.health, before);
});

test('click-to-move rejects unwalkable tiles', () => {
  const e = makeEngine();
  assert.equal(e.requestMove(0, 0).ok, false, 'corner is blocked');
  assert.equal(e.requestMove(5, 5).ok, true);
  e.update(10);
  assert.equal(e.playerPos.x, 5);
  assert.equal(e.playerPos.y, 5);
});

test('scene navigation via exits works', () => {
  const e = makeEngine();
  e.clickObject('obj_exit_sauna');
  assert.equal(e.sceneId, 'scene_sauna');
  e.clickObject('obj_back_yard');
  assert.equal(e.sceneId, 'scene_moi');
});

test('seppo rescue only triggers when player is genuinely needy', () => {
  const e = makeEngine();
  e.enterScene('scene_forest', { x: 11, y: 6 });
  e.player.health = 10;
  e.player.addItem('item_bread');
  e.clickObject('obj_seppo');
  assert.ok(!e.flags.seppo_done, 'not needy -> no handout');
  e.player.health = 2;
  e.clickObject('obj_seppo');
  assert.ok(e.flags.seppo_done, 'needy -> rescued');
  assert.ok(e.player.hasItem('item_bread'));
});

// ---------- Phase 1 audit regressions (docs/02 determinism + AGENTS.md §3) ----------

test('audit F-1: full beer chain passes through SURREAL and returns to SOBER', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  assert.equal(e.drinkBeer().ok, true);
  assert.equal(e.player.beerState, BeerState.TIPSY);
  e.clock.advance(e.content.tuning.beer.tipsySeconds + 0.001);
  assert.equal(e.player.beerState, BeerState.SURREAL, 'SURREAL must be reachable');
  e.clock.advance(e.content.tuning.beer.surrealSeconds + 0.001);
  assert.equal(e.player.beerState, BeerState.RECOVERING);
  e.clock.advance(e.content.tuning.beer.recoveringSeconds + 0.001);
  assert.equal(e.player.beerState, BeerState.SOBER);
});

test('audit F-1: re-drink during RECOVERING starts a clean chain (no skipped SURREAL)', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  e.drinkBeer();
  const t = e.content.tuning.beer;
  e.clock.advance(t.tipsySeconds + t.surrealSeconds + 0.001); // now RECOVERING
  assert.equal(e.player.beerState, BeerState.RECOVERING);
  assert.equal(e.drinkBeer().ok, true); // allowed while recovering
  assert.equal(e.player.beerState, BeerState.TIPSY);
  e.clock.advance(t.tipsySeconds + 0.001);
  assert.equal(e.player.beerState, BeerState.SURREAL, 'stale timer must not skip SURREAL');
  e.clock.advance(t.surrealSeconds + 0.001);
  assert.equal(e.player.beerState, BeerState.RECOVERING);
  e.clock.advance(t.recoveringSeconds + 0.001);
  assert.equal(e.player.beerState, BeerState.SOBER);
});

test('audit F-2: swapping pipe->beer mid-session ends it soberly, no stale timers', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  e.drinkBeer();
  e.swapEquipment(); // -> PIPE
  e.swapEquipment(); // -> BEER again
  assert.equal(e.player.beerState, BeerState.SOBER);
  const t = e.content.tuning.beer;
  e.clock.advance(t.tipsySeconds + t.surrealSeconds + t.recoveringSeconds + 5);
  assert.equal(e.player.beerState, BeerState.SOBER, 'old session timers must not fire');
});

test('audit F-3: revive cancels pending beer transitions', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  e.drinkBeer();
  e.player.takeDamage(999, 'audit');
  assert.equal(e.gameOver, true);
  e.revive();
  assert.equal(e.player.beerState, BeerState.SOBER);
  e.clock.advance(600);
  assert.equal(e.player.beerState, BeerState.SOBER, 'revive must kill stale beer timers');
});

test('determinism: identical action sequences produce identical state', () => {
  const run = () => {
    const e = makeEngine();
    giveStarterKit(e);
    e.equipPipe();
    for (let i = 0; i < 7; i++) e.firePipe('audit target');
    e.reloadPipe();
    e.swapEquipment(); // -> BEER
    e.drinkBeer();
    e.update(3.5); // deterministic clock advance
    e.clickObject('obj_bush');
    e.eatFood('item_berries');
    return JSON.stringify(e.player.serialize()) + '|' + String(e.clock.now());
  };
  assert.equal(run(), run());
});

// ================= PHASE 2 — Signature Items Polish (v0.2.0) =================

test('P2: comedic failure audit — every wrong action earns a distinct joke line', () => {
  const e = makeEngine();
  giveStarterKit(e);
  // 1) drink with pipe equipped -> explains swap, never silent
  e.equipPipe();
  const r1 = e.player.canDrinkBeer();
  assert.equal(r1.ok, false);
  assert.match(r1.reason, /\[X\]|swap/i);
  // 2) empty pipe fire after six shots
  for (let i = 0; i < MAX_SHOTS; i++) e.player.firePipe();
  const r2 = e.player.canFirePipe();
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /reload|\[R\]/i);
  // 3) soap gag carries the fiction disclaimer
  e.player.addItem('item_soap');
  const before = e.messages.length;
  e.eatFood('item_soap');
  assert.match(e.messages.slice(before).join('\n'), /do NOT eat real soap/i);
  // 4) swap with nothing relevant in hands is explained, not ignored
  const e2 = makeEngine();
  const r4 = e2.swapEquipment();
  assert.equal(r4.ok, false);
  assert.match(e2.messages.at(-1), /pipe and a beer/i);
});

test('P2: recurring jokes rotate deterministically and repeat after the cycle', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  const seen = [];
  for (let i = 0; i < 7; i++) { e.drinkBeer(); seen.push(e.messages.at(-1)); }
  // three rotating variants, so consecutive failures differ...
  assert.notEqual(seen[0], seen[1]);
  assert.notEqual(seen[1], seen[2]);
  // ...and the cycle repeats deterministically (docs/22 variations)
  assert.equal(seen[3], seen[0]);
  // same engine replayed from scratch yields identical lines
  const e2 = makeEngine();
  giveStarterKit(e2);
  e2.equipPipe();
  for (let i = 0; i < 7; i++) e2.drinkBeer();
  assert.deepEqual(e2.messages.filter((m) => /Pipe Council|six shots of authority|free-ish hand/.test(m)),
    e.messages.filter((m) => /Pipe Council|six shots of authority|free-ish hand/.test(m)));
});

test('P2: pipe targeting — hammer resolves, cats dodge with gags, sky misses are gags (docs/06)', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  // no target engaged: blast into the sky gag, shot still counted
  const msgCount = e.messages.length;
  const res = e.firePipe();
  assert.equal(res.ok, true);
  assert.equal(res.shotsLeft, MAX_SHOTS - 1);
  assert.match(e.messages.at(-1), /sky|moose|aim/i);
  // hammer event targeted: pipe resolves it (forest scene has the hazards)
  e.enterScene('scene_forest', { x: 1, y: 4 });
  e.clickObject('obj_hammer_zone');
  assert.ok(e.hammer);
  e.firePipe();
  assert.equal(e.hammer, null);
  // cat engaged: valid target but dodges (comedy, not solution)
  e.clickObject('obj_cat');
  assert.equal(e.pendingCatDodge, true);
  const hpAfterHit = e.player.health;
  e.firePipe();
  assert.equal(e.player.health, hpAfterHit, 'dodged shot must not damage');
  assert.match(e.messages.at(-1), /cat|leaf|grace|respect/i);
  assert.equal(e.pendingCatDodge, false);
});

test('P2: multi-beer escalation deepens without breaking the state machine (docs/05)', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.player.addItem('item_beer_bottle', 5); // three full sessions worth
  e.equipBeer();
  // beer #1 full chain
  e.drinkBeer();
  assert.equal(e.player.beerLevel, 1);
  e.clock.advance(20);
  assert.equal(e.player.beerState, BeerState.SOBER);
  assert.equal(e.player.beerLevel, 0, 'level resets when sober');
  // beer #2 then #3 back-to-back during RECOVERING escalates cleanly
  e.drinkBeer(); e.clock.advance(3 + 8); // now RECOVERING
  assert.equal(e.player.beerState, BeerState.RECOVERING);
  const r2 = e.drinkBeer();
  assert.equal(r2.level, 2);
  e.clock.advance(3 + 8);
  const r3 = e.drinkBeer();
  assert.equal(r3.level, 3);
  e.clock.advance(3);
  assert.equal(e.player.beerState, BeerState.SURREAL);
  // escalation changes perception vocabulary: "friend" reads deeper at level 3
  const l3 = filterDrunkText('She is my friend.', BeerState.SURREAL, { escalationLevel: 3 });
  const l1 = filterDrunkText('She is my friend.', BeerState.SURREAL, { escalationLevel: 1 });
  assert.match(l1, /unpaid life consultant/);
  assert.match(l3, /temporary permanent friend/);
  // accessibility parity: reduced distortion disables everything
  assert.equal(filterDrunkText('She is my friend.', BeerState.SURREAL, { reducedDistortion: true, escalationLevel: 3 }), 'She is my friend.');
});

test('P2: surreal NPC suspicion keeps puzzle-critical text intact (docs/05/17)', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  e.drinkBeer();
  e.clock.advance(3); // SURREAL
  assert.equal(e.player.beerState, BeerState.SURREAL);
  const before = e.messages.length;
  e.dialogue('dlg_maija_intro');
  const heard = e.messages.slice(before).join('\n');
  // paranoia aside appended...
  assert.match(heard, /FURNITURE DOES NOT BREATHE/);
  // ...but the critical instruction survives (swap law is readable)
  assert.match(heard, /[Nn]ever both at once/);
});

test('P2: swap feedback — EQUIPMENT_SWAPPED fires only on successful swaps (docs/12)', () => {
  const e = makeEngine();
  let events = [];
  e.bus.on(GameEvents.EQUIPMENT_SWAPPED, (p) => events.push(p));
  const bad = e.swapEquipment(); // nothing held
  assert.equal(bad.ok, false);
  assert.equal(events.length, 0);
  giveStarterKit(e);
  e.equipPipe();
  const ok = e.swapEquipment();
  assert.equal(ok.ok, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].to, EquipmentState.BEER);
  assert.match(e.messages.at(-1), /Swapped PIPE → BEER/);
});

test('P2: inspect coverage — every item has flavor text; surreal alternates exist (docs/15)', () => {
  for (const [id, def] of Object.entries(realContent.items)) {
    assert.ok(def.inspectText && def.inspectText.length > 10, `missing inspectText: ${id}`);
  }
  // props gained surreal alternate inspection lines
  const yard = realContent.scenes.find((s) => s.id === 'scene_moi');
  const sign = yard.objects.find((o) => o.id === 'obj_sign');
  assert.ok(sign.surrealText, 'sign needs a surreal variant');
  // and the engine actually uses them while SURREAL
  const e = makeEngine();
  giveStarterKit(e);
  e.equipBeer();
  e.drinkBeer();
  e.clock.advance(3);
  const before = e.messages.length;
  e.clickObject('obj_sign');
  assert.match(e.messages.at(-1), /ANARCHY IS TEMPORARY/, 'surreal inspect line should show');
  // sober shows the clean line
  e.clock.advance(20);
  const b2 = e.messages.length;
  e.clickObject('obj_sign');
  assert.match(e.messages.at(-1), /click glowing things/i);
});

test('BUG-5 regression: EQUIPMENT_SWAPPED payload reports the PREVIOUS slot', () => {
  const e = makeEngine();
  giveStarterKit(e);
  const swaps = [];
  e.bus.on(GameEvents.EQUIPMENT_SWAPPED, (p) => swaps.push(p));
  // NONE -> PIPE (first equip; from is null-ish)
  assert.ok(e.equipPipe().ok);
  // PIPE -> BEER must report from: 'PIPE' even though the slot already mutated
  assert.ok(e.swapEquipment().ok);
  assert.equal(swaps.at(-1).from, EquipmentState.PIPE);
  assert.equal(swaps.at(-1).to, EquipmentState.BEER);
  // BEER -> PIPE must report from: 'BEER'
  assert.ok(e.swapEquipment().ok);
  assert.equal(swaps.at(-1).from, EquipmentState.BEER);
  assert.equal(swaps.at(-1).to, EquipmentState.PIPE);
});

test('BUG-6 regression: engine never mutates the shared content bundle', () => {
  const countBush = (c) =>
    c.scenes.find((s) => s.id === 'scene_moi').objects.filter((o) => o.id === 'obj_bush_take').length;
  // The engine clones content internally...
  const e = new Engine(realContent);
  e.start(realContent.startScene, { x: 2, y: 4 });
  assert.notEqual(e.content, realContent); // defensive clone exists
  // ...clicking away ALL copies of an object (consumed via array filter)
  while (e.content.scenes.some((s) => s.objects.some((o) => o.id === 'obj_bush_take'))) {
    giveStarterKit(e);
    e.clickObject('obj_bush_take');
    e.clock.advance(30); // clear any cooldowns between attempts
  }
  assert.equal(countBush(e.content), 0); // local world is spent...
  assert.ok(countBush(realContent) > 0); // ...but the module-level bundle is pristine
  // A fresh engine from the same bundle sees the bush again.
  const e2 = new Engine(realContent);
  e2.start(realContent.startScene, { x: 2, y: 4 });
  assert.ok(countBush(e2.content) > 0);
});

test('P2: gag rotation counters persist through save/load (no reset exploit)', () => {
  const e = makeEngine();
  giveStarterKit(e);
  e.equipPipe();
  e.drinkBeer(); // gag #1
  const first = e.messages.at(-1);
  const save = JSON.parse(JSON.stringify(e.serialize()));
  const e2 = makeEngine();
  assert.ok(e2.load(save));
  e2.player.addItem('item_pipe');
  e2.player.addItem('item_beer_bottle', 2);
  e2.equipPipe();
  e2.drinkBeer(); // gag #2 continues the rotation, not restarts it
  assert.notEqual(e2.messages.at(-1), first);
});
