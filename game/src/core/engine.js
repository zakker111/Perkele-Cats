// Game engine: owns the authoritative state structure (docs/14), runs scenes,
// routes interactions, and applies content rules. DOM-free so it is testable
// in Node; the browser layer only reads state and forwards input.

import { EventBus, GameEvents } from './events.js';
import { Clock } from './clock.js';
import { Player, EquipmentState, BeerState, MAX_SHOTS } from './player.js';
import { filterDrunkText } from './beer-logic.js';

export class Engine {
  constructor(content) {
    this.content = content; // validated bundle: {scenes, items, npcs, puzzles, dialogue, tuning}
    this.bus = new EventBus();
    this.clock = new Clock();
    this.player = new Player(this.bus, content.tuning);

    this.sceneId = null;
    this.playerPos = { x: 0, y: 0 }; // tile coords (float for smooth walk)
    this.walkTarget = null;
    this.flags = {}; // progression flags
    this.messages = []; // log for UI
    this.hammer = null; // active hammer event runtime state
    this.hazardCooldowns = {}; // hazardId -> readyAt (seconds)
    this.puzzleRuntime = {}; // puzzleId -> {step}
    this.gameOver = false;
    this.won = false;
    this.reducedDistortion = false; // set by UI layer; disables drunk text filter (docs/17)

    this.bus.on(GameEvents.MESSAGE, ({ text }) => {
      // docs/05: during TIPSY/SURREAL the player perceives dialogue through
      // the drunk filter. engine.messages stores the FILTERED perception —
      // authoritative clean source stays in content data (docs/15).
      const perceived = filterDrunkText(text, this.player.beerState, {
        reducedDistortion: this.reducedDistortion,
      });
      this.messages.push(perceived);
      if (this.messages.length > 50) this.messages.shift();
      this.lastMessage = perceived;
    });
    this.bus.on(GameEvents.GAME_OVER, () => {
      this.gameOver = true;
      this._funnyDeath();
    });
  }

  // ---------- boot / scene ----------

  start(sceneId, spawn = { x: 0, y: 0 }) {
    this.enterScene(sceneId, spawn);
    // Starting inventory for the skeleton slice can be data-driven later.
  }

  enterScene(sceneId, spawn) {
    const scene = this._scene(sceneId);
    if (!scene) throw new Error(`Unknown scene id: ${sceneId}`);
    this.sceneId = sceneId;
    this.playerPos = { ...spawn };
    this.walkTarget = null;
    this.hammer = null;
    this.bus.emit(GameEvents.SCENE_ENTERED, { sceneId, scene });
    this.say(scene.intro || `You are at ${scene.displayName}.`);
  }

  _scene(id) {
    return this.content.scenes.find((s) => s.id === (id || this.sceneId));
  }

  say(text) {
    this.bus.emit(GameEvents.MESSAGE, { text });
  }

  setFlag(name, value = true) {
    if (this.flags[name] === value) return;
    this.flags[name] = value;
    this.bus.emit(GameEvents.FLAG_CHANGED, { name, value });
  }

  // ---------- movement (click-to-move on walkable tiles) ----------

  requestMove(tx, ty) {
    const scene = this._scene();
    if (!scene) return { ok: false };
    if (!this.isWalkable(scene, tx, ty)) {
      this.say('You cannot walk there. The universe says no.');
      return { ok: false, reason: 'not-walkable' };
    }
    this.walkTarget = { x: tx, y: ty };
    return { ok: true };
  }

  isWalkable(scene, tx, ty) {
    const { width, height, blocked } = scene.walk;
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
    return !blocked.some(([bx, by]) => bx === tx && by === ty);
  }

  update(dt) {
    if (this.gameOver || this.won) return;
    this.clock.advance(dt);
    this._walk(dt);
    this._hammerTimeout();
  }

  _hammerTimeout() {
    // Time-windowed danger: if the player dawdles, the hammer falls (docs/08).
    if (this.hammer && this.clock.now() - this.hammer.startedAt > this.hammer.windowSeconds) {
      this.say('You hesitated. The hammer did not.');
      this.resolveHammerEvent(false, 'timeout');
    }
  }

  _walk(dt) {
    if (!this.walkTarget) return;
    const speed = this.content.tuning.player.walkSpeedTilesPerSecond;
    const dx = this.walkTarget.x - this.playerPos.x;
    const dy = this.walkTarget.y - this.playerPos.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step || dist === 0) {
      this.playerPos = { ...this.walkTarget };
      this.walkTarget = null;
    } else {
      this.playerPos.x += (dx / dist) * step;
      this.playerPos.y += (dy / dist) * step;
    }
  }

  // ---------- interactions ----------

  clickObject(objectId) {
    if (this.gameOver || this.won) return;
    const scene = this._scene();
    const obj = scene.objects.find((o) => o.id === objectId);
    if (!obj) return;
    this.bus.emit(GameEvents.INTERACTION_STARTED, { sceneId: scene.id, objectId });

    if (!this._conditionsMet(scene, obj)) {
      this.say(obj.lockedText || 'It does not respond to your enthusiasm.');
      return;
    }

    switch (obj.action) {
      case 'inspect':
        this.say(obj.text || 'You see nothing useful but feel richer spiritually.');
        break;
      case 'take':
        this.player.addItem(obj.givesItem);
        this.say(`Picked up: ${this._itemName(obj.givesItem)}.`);
        scene.objects = scene.objects.filter((o) => o !== obj); // consumed from scene
        break;
      case 'give': {
        if (this.player.hasItem(obj.requiresItem)) {
          this.player.removeItem(obj.requiresItem);
          this.player.addItem(obj.givesItem);
          this.say(obj.text || 'A fair trade, legally distinct from robbery.');
          if (obj.setFlag) this.setFlag(obj.setFlag);
        } else {
          this.say(`They want your ${this._itemName(obj.requiresItem)}. You refuse. Then reconsider.`);
        }
        break;
      }
      case 'goto':
        this._useExit(obj.exit, obj.spawn);
        break;
      case 'puzzle':
        this.say(this.startPuzzle(obj.puzzle)?.intro || 'The puzzle refuses to puzzle today.');
        break;
      case 'dialogue':
        this.dialogue(obj.dialogue);
        break;
      case 'hammer-event':
        this.startHammerEvent(obj);
        break;
      case 'cat':
        this.triggerCat(obj);
        break;
      case 'seppo':
        this.seppoEncounter(obj);
        break;
      default:
        this.say('Nothing happens. Comedy timing requires a second attempt.');
    }
  }

  _useExit(exitName, spawn) {
    const scene = this._scene();
    const exit = scene.exits.find((e) => e.name === exitName);
    if (!exit) return;
    if (!this._conditionsMet(scene, exit)) {
      this.say(exit.lockedText || 'That way is closed for reasons.');
      return;
    }
    const target = this._scene(exit.to);
    this.enterScene(exit.to, spawn || exit.spawn || { x: 1, y: 1 });
    void target;
  }

  _itemName(id) {
    return this.content.items[id]?.displayName || id;
  }

  _conditionsMet(scene, entry) {
    if (!entry.conditions) return true;
    for (const f of entry.conditions.flags || []) {
      if (!this.flags[f]) return false;
    }
    for (const i of entry.conditions.items || []) {
      if (!this.player.hasItem(i)) return false;
    }
    return true;
  }

  // ---------- equipment shortcuts routed from UI ----------

  _equipItem(itemId, okText) {
    if (!this.player.hasItem(itemId)) {
      this.say('You do not have that yet.');
      return { ok: false };
    }
    const res = this.player.equip(this._equipmentChoiceFor(itemId), itemId);
    if (res.ok) this.say(okText);
    else this.say(res.reason);
    return res;
  }

  _equipmentChoiceFor(itemId) {
    return itemId === this.content.tuning.player.pipeItemId
      ? EquipmentState.PIPE
      : EquipmentState.BEER;
  }

  equipPipe() {
    return this._equipItem(this.content.tuning.player.pipeItemId, 'Pipe equipped. Six shots of pure decision-making.');
  }
  equipBeer() {
    return this._equipItem(this.content.tuning.player.beerItemId, 'Beer equipped. A beverage with narrative consequences.');
  }
  swapEquipment() {
    return this._equipResult(
      this.player.swapEquipment(),
      `Swapped to ${this.player.equipment.toLowerCase()}.`,
    );
  }
  _equipResult(res, okText) {
    if (res.ok) this.say(okText);
    else this.say(res.reason);
    return res;
  }

  firePipe(targetLabel) {
    const res = this.player.firePipe();
    if (!res.ok) {
      this.say(res.reason);
      return res;
    }
    // Pipe combat is short & secondary (docs/06). Skeleton: resolves scripted hazards.
    if (this.hammer && this.hammer.resolvableByPipe) {
      this.resolveHammerEvent(true, 'pipe');
    } else if (targetLabel === 'cat') {
      this.say('The Perkele cat dodges with insulting grace and hisses judgment.');
    } else {
      this.say(`BANG! ${res.shotsLeft} shot${res.shotsLeft === 1 ? '' : 's'} remain. A distant moose is unimpressed.`);
    }
    return res;
  }

  reloadPipe() {
    if (this.player.equipment !== EquipmentState.PIPE) {
      this.say('Equip the pipe first.');
      return;
    }
    this.player.reloadPipe();
    this.say(`You reload the pipe. ${MAX_SHOTS} shots of optimism.`);
  }

  drinkBeer() {
    const res = this.player.drinkBeer(this.clock);
    if (!res.ok) this.say(res.reason);
    else this.say('You drink the beer. The colors start filing complaints with management.');
    return res;
  }

  eatFood(itemId) {
    const res = this.player.consumeFood(itemId, this.content.items);
    if (!res.ok) this.say(res.reason);
    return res;
  }

  get surrealActive() {
    return this.player.beerState === BeerState.SURREAL;
  }

  // ---------- puzzles (safe zones: docs/07 — no enemies during puzzles) ----------

  startPuzzle(puzzleId) {
    const puzzle = this.content.puzzles[puzzleId];
    if (!puzzle) return null;
    if (!this.puzzleRuntime[puzzleId]) this.puzzleRuntime[puzzleId] = { step: 0 };
    this.bus.emit(GameEvents.PUZZLE_STEP, { puzzleId, step: this.puzzleRuntime[puzzleId].step });
    return { intro: puzzle.intro, steps: puzzle.steps.map((s) => s.question) };
  }

  puzzleAnswer(puzzleId, choiceIndex) {
    const puzzle = this.content.puzzles[puzzleId];
    const rt = this.puzzleRuntime[puzzleId];
    if (!puzzle || !rt) return { ok: false };
    const step = puzzle.steps[rt.step];
    if (!step) return { ok: false };
    if (choiceIndex !== step.answerIndex) {
      this.say(step.wrongText || 'Wrong. The puzzle judges you gently.');
      return { ok: false, correct: false };
    }
    this.say(step.correctText || 'Click. Something unlocks philosophically.');
    rt.step += 1;
    this.bus.emit(GameEvents.PUZZLE_STEP, { puzzleId, step: rt.step });
    if (rt.step >= puzzle.steps.length) {
      this.bus.emit(GameEvents.PUZZLE_COMPLETED, { puzzleId });
      this.say(puzzle.successText || 'Puzzle solved! Somewhere a tiny fanfare plays.');
      if (puzzle.setFlag) this.setFlag(puzzle.setFlag);
      if (puzzle.rewardItem) this.player.addItem(puzzle.rewardItem);
      if (puzzle.winGame) {
        this.won = true;
        this.bus.emit(GameEvents.GAME_WON, {});
        this.say(puzzle.endingText || 'THE END — for now. The credits are emotionally unavailable.');
      }
      return { ok: true, solved: true };
    }
    return { ok: true, correct: true };
  }

  // ---------- dialogue (text authoritative; TTS optional adapter) ----------

  dialogue(dialogueId) {
    const d = this.content.dialogue[dialogueId];
    if (!d) return;
    this.bus.emit(GameEvents.DIALOGUE_STARTED, { dialogueId });
    for (const line of d.lines) this.say(`${line.speaker}: ${line.text}`);
    if (d.setFlag) this.setFlag(d.setFlag);
    this.bus.emit(GameEvents.DIALOGUE_FINISHED, { dialogueId });
  }

  // ---------- hammer events (docs/08: short, readable, deterministic) ----------

  startHammerEvent(obj) {
    if (this.hammer) return;
    this.hammer = {
      npc: obj.npc,
      telegraph: obj.telegraph,
      options: obj.options, // [{label, kind: 'dodge'|'pipe'|'talk', success, text}]
      resolvableByPipe: obj.resolvableByPipe !== false,
      startedAt: this.clock.now(),
      windowSeconds: obj.windowSeconds ?? this.content.tuning.hammer.windowSeconds,
    };
    this.bus.emit(GameEvents.HAMMER_EVENT_STARTED, { npc: obj.npc });
    this.say(`${obj.npc} raises a hammer. ${obj.telegraph}`);
  }

  hammerChoice(index) {
    if (!this.hammer) return;
    const opt = this.hammer.options[index];
    if (!opt) return;
    const resolved = this.resolveHammerEvent(opt.success, opt.kind);
    if (resolved) this.say(opt.text);
  }

  resolveHammerEvent(success, via) {
    if (!this.hammer) return false;
    const dmg = success
      ? 0
      : this.content.tuning.hammer.damage;
    this.hammer = null;
    if (dmg) this.player.takeDamage(dmg, 'hammer');
    this.bus.emit(GameEvents.HAMMER_EVENT_RESOLVED, { success, via, damage: dmg });
    if (!success && !this.gameOver) this.say('The hammer finds your ego. Health reduced. Ego intact.');
    return true;
  }

  // ---------- Perkele cats (docs/09: hazard + cooldown, once per intended hit) ----------

  triggerCat(obj) {
    const cd = this.hazardCooldowns[obj.id] || 0;
    if (this.clock.now() < cd) {
      this.say('The cat has left to contemplate Finland elsewhere.');
      return;
    }
    this.bus.emit(GameEvents.CAT_HAZARD_TRIGGERED, { hazardId: obj.id });
    const dmg = obj.damage ?? this.content.tuning.cat.damage;
    this.player.takeDamage(dmg, 'perkele-cat');
    this.hazardCooldowns[obj.id] = this.clock.now() + (obj.cooldownSeconds ?? this.content.tuning.cat.cooldownSeconds);
    this.say(obj.hitText || `PERKELE CAT attacks! -${dmg} health. It regrets nothing.`);
  }

  // ---------- Seppo rescue (docs/04/23: rare, helpful, funny) ----------

  seppoEncounter(obj) {
    if (this.flags['seppo_done']) {
      this.say('Seppo has already performed his one miracle today.');
      return;
    }
    const needy =
      this.player.health <= this.content.tuning.seppo.healthThreshold ||
      !this.player.hasItem('item_berries') && !this.player.hasItem('item_bread');
    if (!needy) {
      this.say('Seppo looks at your well-stocked backpack, nods respectfully, and vanishes.');
      return;
    }
    this.setFlag('seppo_done');
    this.player.addItem(obj.givesItem || 'item_bread', 2);
    this.say(obj.text || 'A rare Seppo appears! "Here. You look like a man who chose the wrong equipment." He gives you bread and leaves dramatically.');
  }

  // ---------- death / recovery (failure is funny and recoverable) ----------

  _funnyDeath() {
    const lines = [
      'You died. Somewhere a accordion plays a sad waltz.',
      'Killed by absurdity. Retry? The joke is on you either way.',
      'Game over. The Perkele cats send flowers. They are fake flowers.',
    ];
    this.say(lines[Math.floor(this.clock.now()) % lines.length]);
  }

  revive() {
    // Recoverable failure: respawn sober-ish with partial health.
    this.gameOver = false;
    this.player.health = Math.ceil(this.player.maxHealth / 2);
    this.player.cancelBeerSession(); // audit F-3: stale beer timers must not fire post-revive
    this.player._setBeerState(BeerState.SOBER);
    this.bus.emit(GameEvents.HEALTH_CHANGED, { health: this.player.health, max: this.player.maxHealth });
    const scene = this._scene();
    this.say(`You wake up where it all went wrong. ${scene.displayName} remembers.`);
  }

  // ---------- save/load (versioned schema, docs/16) ----------

  static SAVE_VERSION = 1;

  serialize() {
    return {
      version: Engine.SAVE_VERSION,
      sceneId: this.sceneId,
      playerPos: this.playerPos,
      flags: this.flags,
      messages: [],
      player: this.player.serialize(),
      hazardCooldowns: {},
      puzzleRuntime: this.puzzleRuntime,
      won: this.won,
    };
  }

  load(save) {
    if (!save || save.version !== Engine.SAVE_VERSION) {
      // Migration hook (docs/16): invalid/old saves fail gracefully, never corrupt.
      this.say('Save data rejected: unknown version. Your dignity remains intact.');
      return false;
    }
    try {
      this.flags = save.flags || {};
      this.puzzleRuntime = save.puzzleRuntime || {};
      this.won = !!save.won;
      this.gameOver = false;
      this.player.load(save.player, this.clock);
      this.enterScene(save.sceneId, save.playerPos);
      this.bus.emit(GameEvents.LOADED, {});
      this.say('Save loaded. The world reassembles, mostly correctly.');
      return true;
    } catch (err) {
      console.error('Invalid save data:', err);
      this.say('That save file was older than time itself. It crumbled.');
      return false;
    }
  }
}

export { EquipmentState, BeerState, MAX_SHOTS };
