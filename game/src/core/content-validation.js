// Content validation (docs/15): duplicate ids, missing references, invalid
// enums, missing required fields. Runs in tests and in the dev build.

const REQUIRED_SCENE_FIELDS = ['id', 'displayName', 'walk', 'objects', 'exits'];
const VALID_ACTIONS = new Set([
  'inspect', 'take', 'give', 'goto', 'puzzle', 'dialogue',
  'hammer-event', 'cat', 'seppo',
]);

export function validateContent(content) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  // items
  const itemIds = new Set();
  for (const [id, def] of Object.entries(content.items || {})) {
    if (itemIds.has(id)) err(`duplicate item id: ${id}`);
    itemIds.add(id);
    if (!def.displayName) err(`item ${id}: missing displayName`);
    if (!['food', 'equipment', 'key', 'gag', 'misc'].includes(def.type)) {
      err(`item ${id}: invalid type "${def.type}"`);
    }
    if (def.type === 'food' && !def.gag && typeof def.heal !== 'number') {
      err(`food item ${id}: missing heal value`);
    }
  }

  // puzzles
  const puzzleIds = new Set();
  for (const [id, p] of Object.entries(content.puzzles || {})) {
    if (puzzleIds.has(id)) err(`duplicate puzzle id: ${id}`);
    puzzleIds.add(id);
    if (!Array.isArray(p.steps) || p.steps.length === 0) err(`puzzle ${id}: no steps`);
    (p.steps || []).forEach((s, i) => {
      if (typeof s.answerIndex !== 'number' || !s.choices || !s.choices[s.answerIndex]) {
        err(`puzzle ${id} step ${i}: answerIndex out of range`);
      }
    });
    if (p.rewardItem && !itemIds.has(p.rewardItem)) err(`puzzle ${id}: unknown rewardItem ${p.rewardItem}`);
  }

  // dialogue
  const dialogueIds = new Set(content.dialogue ? Object.keys(content.dialogue) : []);
  for (const [id, d] of Object.entries(content.dialogue || {})) {
    if (!Array.isArray(d.lines) || d.lines.length === 0) err(`dialogue ${id}: empty`);
  }

  // scenes
  const sceneIds = new Set();
  for (const s of content.scenes || []) {
    for (const f of REQUIRED_SCENE_FIELDS) {
      if (!(f in s)) err(`scene ${s.id || '?'}: missing field "${f}"`);
    }
    if (sceneIds.has(s.id)) err(`duplicate scene id: ${s.id}`);
    sceneIds.add(s.id);
    for (const o of s.objects || []) {
      if (!o.id) err(`scene ${s.id}: object without id`);
      if (!VALID_ACTIONS.has(o.action)) err(`scene ${s.id}/${o.id}: invalid action "${o.action}"`);
      if (o.givesItem && !itemIds.has(o.givesItem)) err(`scene ${s.id}/${o.id}: unknown givesItem ${o.givesItem}`);
      if (o.requiresItem && !itemIds.has(o.requiresItem)) err(`scene ${s.id}/${o.id}: unknown requiresItem ${o.requiresItem}`);
      if (o.puzzle && !puzzleIds.has(o.puzzle)) err(`scene ${s.id}/${o.id}: unknown puzzle ${o.puzzle}`);
      if (o.dialogue && !dialogueIds.has(o.dialogue)) err(`scene ${s.id}/${o.id}: unknown dialogue ${o.dialogue}`);
      if (o.exit && !(s.exits || []).some((e) => e.name === o.exit)) err(`scene ${s.id}/${o.id}: unknown exit ${o.exit}`);
    }
    for (const e of s.exits || []) {
      if (!sceneIds.has(e.to) && !(content.scenes.some((t) => t.id === e.to))) {
        // forward reference tolerated only if target exists anywhere:
        if (!content.scenes.some((t) => t.id === e.to)) err(`scene ${s.id}: exit ${e.name} -> unknown scene ${e.to}`);
      }
    }
  }

  // tuning essentials
  for (const key of ['player', 'beer', 'hammer', 'cat', 'seppo']) {
    if (!content.tuning?.[key]) err(`tuning missing section "${key}"`);
  }

  return errors;
}
