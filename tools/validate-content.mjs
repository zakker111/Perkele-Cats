// Content validation CLI (docs/15 + 19_GITHUB_PAGES step 3).
// Usage: node tools/validate-content.mjs [path/to/bundle.js]
// Exits non-zero on any error so CI fails before deploying.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { validateContent } from '../game/src/core/content-validation.js';

const target = process.argv[2] || 'game/content/bundle.js';
const mod = await import(pathToFileURL(path.resolve(target)).href);
const errors = validateContent(structuredClone(mod.content));

if (errors.length) {
  console.error(`✗ content validation FAILED (${errors.length} error(s)):`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
} else {
  const c = mod.content;
  console.log(`✓ content OK: ${c.scenes.length} scenes, ${Object.keys(c.items).length} items, ` +
    `${Object.keys(c.puzzles).length} puzzles, ${Object.keys(c.dialogue).length} dialogues.`);
}
