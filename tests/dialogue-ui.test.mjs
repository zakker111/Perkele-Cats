// Phase 3 regression: conversation tree API contract used by the UI layer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../game/src/core/engine.js';
import { content } from '../game/content/bundle.js';

const mk = () => { const e = new Engine(structuredClone(content)); e.start('scene_moi', { x: 2, y: 4 }); return e; };

test('startConversation returns node with visible choices only', () => {
  const e = mk();
  const step = e.startConversation('conv_tarmo');
  assert.ok(step && !step.ended);
  // catbond-gated choice hidden until met_cat_pack flag exists
  assert.equal(step.choices.length, 2);
});

test('chooseConversation uses display index (remapped through conditions)', () => {
  const e = mk();
  e.startConversation('conv_tarmo');
  const step = e.chooseConversation(0); // "Is the swing zone dangerous?"
  assert.ok(step && !step.ended);
  assert.ok(e.conversation);
});

test('conditional choice appears after flag set', () => {
  const e = mk();
  e.setFlag('met_cat_pack');
  const step = e.startConversation('conv_tarmo');
  assert.equal(step.choices.length, 3);
});

test('endConversation exits gracefully and emits event', () => {
  const e = mk();
  let ended = false;
  e.bus.on('CONVERSATION_ENDED', () => { ended = true; });
  e.startConversation('conv_maija');
  assert.equal(e.endConversation(), true);
  assert.equal(e.conversation, null);
  assert.ok(ended);
  assert.equal(e.endConversation(), false); // idempotent when no conversation
});

test('once-nodes do not repeat comedy on replay', () => {
  const e = mk();
  const s1 = e.startConversation('conv_maija');
  assert.ok(s1.choices.length >= 2);
  e.endConversation();
  const s2 = e.startConversation('conv_maija');
  assert.equal(s2.ended, true);
  assert.ok(s2.replayed);
});

test('givesItem is granted exactly once per node', () => {
  const e = mk();
  e.startConversation('conv_maija');
  e.chooseConversation(1); // cats branch -> berries
  assert.equal(e.player.inventory.get("item_berries"), 1);
  e.endConversation();
  e.startConversation('conv_maija'); // replay path ends immediately
  assert.equal(e.player.inventory.get("item_berries"), 1);
});
