// Browser presentation layer: 2.5D isometric tile renderer + UI shell.
// Reads engine state; forwards input to engine. Does NOT mutate gameplay
// state directly (docs/14). Surreal beer mode = CSS filter on canvas only,
// essential text stays readable (AGENTS.md §3).

import { Engine } from './core/engine.js';
import { GameEvents } from './core/events.js';
import { BeerState } from './core/player.js';
import { content } from '../content/bundle.js';
import { validateContent } from './core/content-validation.js';
import { saveGame, loadGame, clearSave } from './persistence.js';
import { speakLine } from './tts.js';

const TILE_W = 64;
const TILE_H = 32;

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const errors = validateContent(content);
if (errors.length) {
  console.error('CONTENT ERRORS:', errors);
}

const engine = new Engine(content);
window.__game = { engine }; // debug handle for smoke tests

// ---------- camera / projection ----------

function project(tx, ty) {
  const x = (tx - ty) * (TILE_W / 2);
  const y = (tx + ty) * (TILE_H / 2);
  return { x, y };
}

let camOffset = { x: 0, y: 0 };

function updateCamera() {
  const scene = engine._scene();
  const p = project(engine.playerPos.x, engine.playerPos.y);
  camOffset.x = canvas.width / 2 - p.x;
  camOffset.y = canvas.height / 3 - p.y;
  void scene;
}

function screenToTile(sx, sy) {
  const x = sx - camOffset.x;
  const y = sy - camOffset.y;
  const tx = (x / (TILE_W / 2) + y / (TILE_H / 2)) / 2;
  const ty = (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2;
  return { tx, ty };
}

// ---------- rendering ----------

const PALETTE = {
  grass: ['#7fae5c', '#8fbc6a'],
  sauna: ['#a97c50', '#b98d5f'],
  forest: ['#5d8f4f', '#6da35e'],
};

function tileColors(scene) {
  return PALETTE[scene.id === 'scene_sauna' ? 'sauna' : scene.id === 'scene_forest' ? 'forest' : 'grass'];
}

function drawDiamond(cx, cy, w, h, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function render() {
  const scene = engine._scene();
  if (!scene) return;
  updateCamera();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cols = tileColors(scene);

  for (let ty = 0; ty < scene.walk.height; ty++) {
    for (let tx = 0; tx < scene.walk.width; tx++) {
      const { x, y } = project(tx, ty);
      const cx = x + camOffset.x;
      const cy = y + camOffset.y;
      const blocked = scene.walk.blocked.some(([bx, by]) => bx === tx && by === ty);
      const color = blocked ? '#3d4a3a' : cols[(tx + ty) % 2];
      drawDiamond(cx, cy, TILE_W, TILE_H, color, 'rgba(0,0,0,0.15)');
    }
  }

  // objects sorted by depth
  const objs = [...scene.objects].sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const o of objs) {
    const { x, y } = project(o.x, o.y);
    drawObject(o, x + camOffset.x, y + camOffset.y);
  }

  // player
  const pp = project(engine.playerPos.x, engine.playerPos.y);
  drawPlayer(pp.x + camOffset.x, pp.y + camOffset.y);

  // walk marker
  if (engine.walkTarget) {
    const wp = project(engine.walkTarget.x, engine.walkTarget.y);
    drawDiamond(wp.x + camOffset.x, wp.y + camOffset.y, 20, 10, null, '#ffe27a');
  }
}

const KIND_GLYPH = { item: '◆', npc: '☺', prop: '•', exit: '➜', hazard: '▲', event: '⚒', puzzle: '✎' };
const KIND_COLOR = { item: '#ffe27a', npc: '#8ecbff', prop: '#cfcfcf', exit: '#9dff9d', hazard: '#ff7a7a', event: '#ffb37a', puzzle: '#c9a0ff' };

function drawObject(o, x, y) {
  ctx.save();
  const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 300 + o.x);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = KIND_COLOR[o.kind] || '#fff';
  ctx.font = '22px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(KIND_GLYPH[o.kind] || '?', x, y - 6);
  ctx.globalAlpha = 1;
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeText(o.label, x, y + 14);
  ctx.fillText(o.label, x, y + 14);
  ctx.restore();
}

function drawPlayer(x, y) {
  ctx.save();
  // shadow
  drawDiamond(x, y + 4, 26, 12, 'rgba(0,0,0,0.3)', null);
  // body (simple 2.5D guy)
  ctx.fillStyle = '#2b3a55';
  ctx.fillRect(x - 7, y - 26, 14, 18);
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath();
  ctx.arc(x, y - 32, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3b22';
  ctx.fillRect(x - 7, y - 40, 14, 4); // hat
  if (engine.player.equipment === 'PIPE') {
    ctx.fillStyle = '#a06a3a';
    ctx.fillRect(x + 6, y - 30, 10, 3);
  } else if (engine.player.equipment === 'BEER') {
    ctx.fillStyle = '#c98a2b';
    ctx.fillRect(x + 7, y - 34, 4, 9);
  }
  ctx.restore();
}

// ---------- hit testing ----------

canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const sx = ev.clientX - rect.left;
  const sy = ev.clientY - rect.top;
  const scene = engine._scene();
  // nearest object within grab radius?
  let best = null;
  let bestDist = 26;
  for (const o of scene.objects) {
    const { x, y } = project(o.x, o.y);
    const d = Math.hypot(x + camOffset.x - sx, y + camOffset.y - sy);
    if (d < bestDist) { best = o; bestDist = d; }
  }
  if (best) {
    engine.clickObject(best.id);
    return;
  }
  const { tx, ty } = screenToTile(sx, sy);
  engine.requestMove(Math.round(tx), Math.round(ty));
});

// ---------- UI shell (docs/12: always answer where/how much/why) ----------

const ui = {
  sceneName: document.getElementById('scene-name'),
  health: document.getElementById('health-bar'),
  equip: document.getElementById('equip-indicator'),
  shots: document.getElementById('shots'),
  inventory: document.getElementById('inventory'),
  log: document.getElementById('log'),
  beerBadge: document.getElementById('beer-badge'),
  hammerPanel: document.getElementById('hammer-panel'),
  puzzlePanel: document.getElementById('puzzle-panel'),
  overlay: document.getElementById('overlay'),
};

function refreshHud() {
  const p = engine.player;
  ui.health.textContent = `HP ${p.health}/${p.maxHealth}`;
  ui.health.style.setProperty('--hp', `${(p.health / p.maxHealth) * 100}%`);
  const eq = p.equipment;
  // Swap affordance (docs/03, AGENTS.md §3): the pipe/beer choice must always be
  // one visible click away. Space toggles between the two signature items.
  ui.equip.textContent = eq === 'NONE' ? 'Hands: empty — [X] swap' : eq === 'PIPE' ? 'Hands: PIPE — [X] swap to beer' : 'Hands: BEER — [X] swap to pipe';
  ui.equip.className = `chip chip-${eq.toLowerCase()}`;
  ui.equip.onclick = () => { engine.swapEquipment(); refreshHud(); };
  ui.shots.textContent = eq === 'PIPE' ? `Shots: ${p.shotsLeft}/6 [F fire][R reload]` : '';
  ui.beerBadge.textContent =
    p.beerState === BeerState.SOBER ? '' : `🍺 ${p.beerState}${p.beerState === 'SURREAL' ? ' — everything is fine' : ''}`;

  ui.inventory.innerHTML = '';
  for (const [id, count] of p.inventory) {
    const def = content.items[id];
    const btn = document.createElement('button');
    btn.className = 'inv-item';
    btn.title = def.inspectText || '';
    btn.textContent = `${def.displayName}${count > 1 ? ' ×' + count : ''}`;
    btn.onclick = () => {
      if (def.type === 'food') engine.eatFood(id);
      else if (id === 'item_pipe') engine.equipPipe();
      else if (id === 'item_beer_bottle') engine.equipBeer();
      else engine.say(def.useText || def.inspectText || 'You poke it philosophically.');
    };
    ui.inventory.appendChild(btn);
  }
}

function refreshHammer() {
  if (!engine.hammer) { ui.hammerPanel.classList.add('hidden'); return; }
  ui.hammerPanel.classList.remove('hidden');
  ui.hammerPanel.innerHTML = `<div class="hammer-title">⚒ ${engine.hammer.npc} SWINGS! Choose:</div>`;
  engine.hammer.options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1}. ${opt.label}`;
    b.onclick = () => engine.hammerChoice(i);
    ui.hammerPanel.appendChild(b);
  });
}

let activePuzzle = null;
function showPuzzle(puzzleId) {
  const puzzle = content.puzzles[puzzleId];
  const rt = engine.puzzleRuntime[puzzleId];
  const step = puzzle.steps[rt.step];
  if (!step) { hidePuzzle(); return; }
  activePuzzle = puzzleId;
  ui.puzzlePanel.classList.remove('hidden');
  ui.puzzlePanel.innerHTML = `<div class="puzzle-q">${step.question}</div>`;
  step.choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = c;
    b.onclick = () => {
      const res = engine.puzzleAnswer(puzzleId, i);
      if (res.solved || !engine.puzzleRuntime[puzzleId] || !content.puzzles[puzzleId].steps[engine.puzzleRuntime[puzzleId].step]) hidePuzzle();
      else showPuzzle(puzzleId);
    };
    ui.puzzlePanel.appendChild(b);
  });
  const hint = document.createElement('button');
  hint.className = 'hint';
  hint.textContent = '💡 Hint';
  hint.onclick = () => engine.say(puzzle.steps[rt.step].hint || `Try option ${puzzle.steps[rt.step].answerIndex + 1}. The game forgives.`);
  ui.puzzlePanel.appendChild(hint);
}
function hidePuzzle() { activePuzzle = null; ui.puzzlePanel.classList.add('hidden'); }

ui.overlay.classList.add('hidden');
function showOverlay(html, buttons) {
  ui.overlay.classList.remove('hidden');
  ui.overlay.innerHTML = html;
  for (const [label, fn] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    ui.overlay.appendChild(b);
  }
}

// ---------- event wiring ----------

engine.bus.on(GameEvents.SCENE_ENTERED, ({ scene }) => {
  ui.sceneName.textContent = scene.displayName;
  hidePuzzle();
});
engine.bus.on(GameEvents.MESSAGE, ({ text }) => showLogLine(text));
// Critical rule lines bypass the drunk filter (sayRaw) but still reach the log/TTS.
engine.bus.on(GameEvents.RAW_MESSAGE, ({ text }) => showLogLine(text));

function showLogLine(perceived) {
  // The engine's message pipeline already applied the drunk perception filter
  // (docs/05). The log shows exactly what the player "hears" — no double filter.
  const div = document.createElement('div');
  div.textContent = perceived;
  ui.log.prepend(div);
  while (ui.log.children.length > 30) ui.log.lastChild.remove();
  speakLine(perceived);
}
engine.bus.on(GameEvents.PUZZLE_STEP, ({ puzzleId }) => showPuzzle(puzzleId));
engine.bus.on(GameEvents.HAMMER_EVENT_STARTED, () => refreshHammer());
engine.bus.on(GameEvents.HAMMER_EVENT_RESOLVED, () => refreshHammer());
engine.bus.on(GameEvents.BEER_STATE_CHANGED, ({ state }) => {
  const deep = state === 'SURREAL';
  canvas.classList.toggle('surreal', deep);
  // Phase 2 multi-beer escalation: 2nd+ beer adds visual layers (docs/05).
  canvas.classList.toggle('surreal-mid', deep && engine.player.beerLevel === 2);
  canvas.classList.toggle('surreal-deep', deep && engine.player.beerLevel >= 3);
  document.body.classList.toggle('tipsy', state === 'TIPSY' || state === 'RECOVERING');
});
// Swap flourish (docs/12): HUD pulse so the XOR choice reads clearly.
engine.bus.on(GameEvents.EQUIPMENT_SWAPPED, () => {
  ui.equip.classList.remove('swap-flash');
  void ui.equip.offsetWidth; // restart animation
  ui.equip.classList.add('swap-flash');
});
engine.bus.on(GameEvents.GAME_OVER, () => {
  showOverlay('<h2>☠ You are dead.</h2><p>The forest wins this round. Retry is free; dignity costs extra.</p>',
    [['Get up (revive)', () => { ui.overlay.classList.add('hidden'); engine.revive(); refreshHud(); }]]);
});
engine.bus.on(GameEvents.GAME_WON, () => {
  showOverlay('<h2>★ EPISODE ONE COMPLETE ★</h2><p>Skeleton victory. The full plan lives in docs/.</p>',
    [['Play again', () => location.reload()]]);
});

// ---------- keyboard (docs/12) ----------

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'e') {
    if (engine.player.hasItem('item_pipe') && engine.player.equipment !== 'PIPE') engine.equipPipe();
    else if (engine.player.hasItem('item_beer_bottle')) engine.equipBeer();
  } else if (k === 'x') engine.swapEquipment();
  else if (k === 'f') engine.firePipe();
  else if (k === 'r') engine.reloadPipe();
  else if (k === 'd') engine.drinkBeer();
  else if (k === 's') { saveGame(engine); engine.say('Game saved (localStorage).'); }
  else if (k === 'l') { if (loadGame(engine)) engine.say('Loaded.'); }
  else if (k === '1' && engine.hammer) engine.hammerChoice(0);
  else if (k === '2' && engine.hammer) engine.hammerChoice(1);
  else if (k === '3' && engine.hammer) engine.hammerChoice(2);
  else if (k === 'escape') hidePuzzle();
  refreshHud();
  refreshHammer();
});

// toolbar buttons
document.getElementById('btn-save').onclick = () => { saveGame(engine); engine.say('Game saved.'); };
document.getElementById('btn-load').onclick = () => { if (!loadGame(engine)) engine.say('No valid save found.'); };
document.getElementById('btn-clear').onclick = () => { clearSave(); engine.say('Save deleted like an embarrassing mixtape.'); };
document.getElementById('btn-tts').onclick = (ev) => {
  const on = window.__ttsEnabled = !window.__ttsEnabled;
  ev.target.textContent = `TTS: ${on ? 'ON' : 'OFF'}`;
  engine.say(on ? 'Voice enabled. Text remains authoritative.' : 'Voice off. Silence, the national sound.');
};
document.getElementById('btn-reduced').onclick = (ev) => {
  const on = document.body.classList.toggle('reduced-distortion');
  ev.target.textContent = `Reduced distortion: ${on ? 'ON' : 'OFF'}`;
};

// ---------- main loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  engine.update(dt);
  render();
  refreshHud();
  if (engine.hammer !== ui._lastHammerRef) { refreshHammer(); ui._lastHammerRef = engine.hammer; }
  requestAnimationFrame(frame);
}

engine.start(content.startScene, { x: 2, y: 4 });
refreshHud();
requestAnimationFrame(frame);
