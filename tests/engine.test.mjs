// AGENTS.md §7 critical-rule tests. Pure Node, zero dependencies:
//   node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

import { Engine } from '../game/src/core/engine.js';
import { EquipmentState, BeerState, MAX_SHOTS } from '../game/src/core/player.js';
import { validateContent } from '../game/src/core/content-validation.js';
import { content as realContent } from '../game/content/bundle.js';

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
