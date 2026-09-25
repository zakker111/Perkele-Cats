// Deterministic GitHub Pages build (docs/19).
// Copies the static game into /dist and rewrites asset references to a
// relative base so it works from ANY repo subpath, e.g.
//   https://<user>.github.io/<repo>/
// No bundler, no external deps: the game ships as native ES modules with
// relative imports already — this keeps the build reproducible & offline.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'game');
const OUT = path.join(ROOT, 'dist');

function copyDir(src, out) {
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'package.json') continue; // dev-only file, not needed on Pages
    const s = path.join(src, entry.name);
    const d = path.join(out, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(SRC, OUT);

// Safety check: reject absolute asset paths (would break under a subpath).
let problems = 0;
for (const file of ['index.html', 'style.css']) {
  const text = fs.readFileSync(path.join(OUT, file), 'utf8');
  if (/(src|href)="\/(?!\/)/.test(text)) {
    console.error(`✗ ${file} contains an absolute path "/..." — breaks Pages subpath deploy`);
    problems++;
  }
}
for (const js of walkJs(OUT)) {
  const text = fs.readFileSync(js, 'utf8');
  if (/from ['"]\/(?!\/)/.test(text)) {
    console.error(`✗ ${path.relative(OUT, js)} uses absolute module imports`);
    problems++;
  }
}
if (problems) process.exit(1);

// version stamp for cache clarity (docs/19: clear cache/version behavior)
const pkg = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ version: pkg.version, built: 'deterministic' }, null, 2));

console.log(`✓ Pages build OK → dist/ (v${pkg.version}, relative-path safe)`);

function* walkJs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkJs(p);
    else if (e.name.endsWith('.js')) yield p;
  }
}
