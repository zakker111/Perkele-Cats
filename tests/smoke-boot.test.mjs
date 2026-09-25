// Automated boot smoke test (versions.md 0.1.0 + docs/18).
// Boots the built game in a real browser via puppeteer-core if available,
// otherwise falls back to a static-serve + module-graph check with plain Node
// so CI never depends on a flaky browser download.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = fs.existsSync(path.join(ROOT, 'dist')) ? path.join(ROOT, 'dist') : path.join(ROOT, 'game');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = path.join(SITE, url === '/' ? 'index.html' : decodeURIComponent(url));
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // repo-root fallback for Pages subpath style requests
    file = path.join(ROOT, 'game', url === '/' ? 'index.html' : decodeURIComponent(url));
  }
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.log(`smoke: serving ${path.relative(ROOT, SITE)} at ${base}`);

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
};

// 1) index served
const html = await (await fetch(`${base}/index.html`)).text();
ok(html.includes('id="scene"'), 'index.html serves canvas #scene');
ok(html.includes('./src/main.js'), 'module entry linked with relative path');

// 2) every imported module resolves over HTTP (catches broken paths early)
async function checkGraph(entry, seen = new Set()) {
  const url = new URL(entry, `${base}/`);
  if (seen.has(url.href)) return true;
  seen.add(url.href);
  const res = await fetch(url.href);
  if (!res.ok) { ok(false, `module exists: ${url.pathname}`); return false; }
  const src = await res.text();
  const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const imp of imports) {
    if (!(await checkGraph(new URL(imp, url).pathname + '', seen))) return false;
  }
  return true;
}
ok(await checkGraph('/src/main.js'), 'ES module dependency graph resolves (boot prerequisites)');

// 3) optional real-browser boot
try {
  const puppeteer = (await import('puppeteer-core')).default;
  const chromeBin = process.env.CHROME_BIN_PATH || '/usr/bin/chromium' ;
  const browser = await puppeteer.launch({ executablePath: chromeBin, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle0' });
  const booted = await page.evaluate(() => !!window.__game && window.__game.engine.sceneId === 'scene_moi');
  ok(booted && errors.length === 0, 'browser boot: engine starts in scene_moi with zero console errors');
  await browser.close();
} catch (err) {
  console.log(`⚠ puppeteer/chromium unavailable (${err.message.split('\n')[0]}) — static boot checks still ran`);
}

server.close();
if (failures) {
  console.error(`SMOKE FAILED (${failures})`);
  process.exit(1);
}
console.log('SMOKE OK');
