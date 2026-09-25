// Game engine: owns the authoritative state structure (docs/14), runs scenes,
// routes interactions, and applies content rules. DOM-free so it is testable
// in Node; the browser layer only reads state and forwards input.

import { EventBus, GameEvents } from './events.js';
import { Clock } from './clock.js';
import { Player, EquipmentState, BeerState, MAX_SHOTS } from './player.js';
import { filterDrunkText, suspiciousNpcLine, surrealInspect, isCriticalLine, CRITICAL_LINE_MARKER } from './beer-logic.js';

// docs/22: rare repeat-encounter gag — callbacks beat repetition. Seppo's one
// miracle never repeats, but running into him again cycles these deadpan lines.
export const SEPPO_REPEAT_GAGS = Object.freeze([
  'Seppo raises one eyebrow. That is the entire conversation.',
  '"You again." Seppo disappears into a birch tree that was definitely too thin.',
  'Seppo points at your equipment choice, sighs like a sauna stove, and leaves.',
]);

export class Engine {
  constructor(content) {
    // BUG-6 fix: engine state (taken objects, scene mutations) must never leak
    // back into the shared content module. Deep-clone so multiple engines /
    // test runs / hot-reload cannot corrupt each other's world data.
    this.content = structuredClone(content); // validated bundle: {scenes, items, npcs, puzzles, dialogue, tuning}
    this.bus = new EventBus();
    this.clock = new Clock();
    this.player = new Player(this.bus, content.tuning);

    this.sceneId = null;
    this.playerPos = { x: 0, y: 0 }; // tile coords (float for smooth walk)
    this.walkTarget = null;
    this.flags = {}; // progression flags
    this.messages = []; // log for UI
    this.hammer = null; // active hammer event runtime state
    this.pendingCatDodge = false; // docs/06: cat engaged as pipe target (dodges)
    this.hazardCooldowns = {}; // hazardId -> readyAt (seconds)
    this.puzzleRuntime = {}; // puzzleId -> {step}
    this.gameOver = false;
    this.won = false;
    this.conversation = null; // active branching conversation {id, node}
    this.reducedDistortion = false; // set by UI layer; disables drunk text filter (docs/17)

    this.bus.on(GameEvents.MESSAGE, ({ text }) => {
      // docs/05: during TIPSY/SURREAL the player perceives dialogue through
      // the drunk filter. engine.messages stores the FILTERED perception —
      // authoritative clean source stays in content data (docs/15).
      let perceived = filterDrunkText(text, this.player.beerState, {
        reducedDistortion: this.reducedDistortion,
        escalationLevel: this.player.beerLevel,
      });
      // docs/05 silly NPC reactions: friendly NPCs read as suspicious while SURREAL.
      perceived = suspiciousNpcLine(perceived, {
        beerState: this.player.beerState,
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

  /** Emit a message that bypasses the drunk filter (critical rule lines). */
  sayRaw(text) {
    this.messages.push(text);
    if (this.messages.length > 50) this.messages.shift();
    this.lastMessage = text;
    this.bus.emit(GameEvents.RAW_MESSAGE, { text });
  }

  /** Deterministic rotating joke line (docs/22 recurring jokes, no Math.random). */
  _gagLine(key, lines) {
    const n = (this.player.gagCounters[key] = (this.player.gagCounters[key] || 0) + 1);
    return lines[(n - 1) % lines.length];
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
        this.say(surrealInspect(obj, {
          beerState: this.player.beerState,
          reducedDistortion: this.reducedDistortion,
        }) || 'You see nothing useful but feel richer spiritually.');
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
        if (obj.conversation) this.startConversation(obj.conversation);
        else this.dialogue(obj.dialogue);
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
        this.say(this._gagLine('no-action', [
          'Nothing happens. Comedy timing requires a second attempt.',
          'Nothing happens, except a small bird quietly reconsidering your life choices.',
          'You interact with enthusiasm. The universe files it under "pending".',
        ]));
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
    const from = this.player.equipment;
    const res = this.player.swapEquipment();
    if (res.ok) {
      const to = this.player.equipment.toLowerCase();
      const flavor = to === 'beer'
        ? `⚡ Swapped PIPE → BEER. The bottle hums a small victory song.`
        : `⚡ Swapped BEER → PIPE. Six opinions, freshly reloaded in spirit.`;
      this.say(flavor);
      void from;
    } else {
      this.say(res.reason);
    }
    return res;
  }
  _equipResult(res, okText) {
    if (res.ok) this.say(okText);
    else this.say(res.reason);
    return res;
  }

  /** Is there a pipe-valid target currently engaged? (docs/06 targeting) */
  _pipeTarget() {
    if (this.hammer && this.hammer.resolvableByPipe) return 'hammer';
    if (this.pendingCatDodge) return 'cat';
    return null;
  }

  firePipe(targetLabel) {
    const res = this.player.firePipe();
    if (!res.ok) {
      this.say(res.reason);
      return res;
    }
    // Pipe combat is short & secondary (docs/06). Targeted: firing at nothing
    // is a "blast into the sky" gag, not a free solution to every problem.
    const target = targetLabel || this._pipeTarget();
    if (target === 'hammer' && this.hammer && this.hammer.resolvableByPipe) {
      this.resolveHammerEvent(true, 'pipe');
    } else if (target === 'cat') {
      this.pendingCatDodge = false;
      this.say(this._gagLine('cat-dodge', [
        'The Perkele cat dodges with insulting grace and hisses judgment.',
        'The cat does not even move. The shot simply misses, out of respect.',
        'Direct hit on a leaf. The cat counts it as emotional damage inflicted on nature.',
      ]));
    } else {
      this.say(this._gagLine('sky-gag', [
        `BANG! ${res.shotsLeft} shot${res.shotsLeft === 1 ? '' : 's'} remain. You blasted into the sky. A cloud apologizes.`,
        `BANG! ${res.shotsLeft} shot${res.shotsLeft === 1 ? '' : 's'} remain. Somewhere a moose is mildly inconvenienced.`,
        `BANG! ${res.shotsLeft} shot${res.shotsLeft === 1 ? '' : 's'} remain. Aim exists for a reason, you know.`,
      ]));
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
    if (!res.ok) {
      this.say(res.reason);
      return res;
    }
    const level = res.level || 1;
    if (level >= 3) {
      this.say(`You drink beer #${level}. The concept of 'drunk' renames itself to 'enlightened'.`);
    } else if (level === 2) {
      this.say('You drink another beer. The trees begin submitting their opinions formally.');
    } else {
      this.say('You drink the beer. The colors start filing complaints with management.');
    }
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
    this._speakDialogue(d, dialogueId);
  }

  _speakDialogue(d, dialogueId) {
    this.bus.emit(GameEvents.DIALOGUE_STARTED, { dialogueId });
    for (const line of d.lines) {
      // docs/05 + docs/17: critical rule/instruction lines bypass the drunk
      // filter entirely and get a ⚖ marker so the clean text reads as law.
      if (isCriticalLine(line)) this.sayRaw(`${CRITICAL_LINE_MARKER}${line.speaker}: ${line.text}`);
      else this.say(`${line.speaker}: ${line.text}`);
    }
    if (d.setFlag) this.setFlag(d.setFlag);
    if (Array.isArray(d.givesItem)) {
      for (const g of d.givesItem) {
        if (!this.flags[`dlg_given:${dialogueId}:${g.item}`]) {
          this.player.addItem(g.item, g.count || 1);
          this.setFlag(`dlg_given:${dialogueId}:${g.item}`);
          this.say(`You pocket the ${this._itemName(g.item)}. They insist.`);
        }
      }
    }
    this.bus.emit(GameEvents.DIALOGUE_FINISHED, { dialogueId });
  }

  // ---------- branching conversation trees (docs/08 NPC template, Phase 3) ----------
  // Data-driven nodes: { id, lines[], once?, setFlag?, givesItem?, conditions?,
  //                       choices: [{ label, goto?, hint? }] }
  // Branching is deterministic; state lives in flags (stable-ID convention).

  startConversation(convId) {
    if (this.conversation) {
      this.say('A conversation is already happening. Finnish politeness forbids queuing two.');
      return null;
    }
    const conv = this.content.conversations?.[convId];
    if (!conv || !conv.nodes?.[conv.start]) return null;
    this.conversation = { id: convId, node: conv.start };
    return this._conversationStep();
  }

  chooseConversation(choiceIndex) {
    if (!this.conversation) return null;
    const conv = this.content.conversations[this.conversation.id];
    const node = conv.nodes[this.conversation.node];
    // Presentation layer only shows condition-visible choices; remap the
    // display index to the underlying data index deterministically.
    const visible = (node.choices || []).filter((c) => this._conditionsMet(this._scene(), c));
    const choice = visible[choiceIndex];
    if (!choice) return null;
    if (choice.goto && conv.nodes[choice.goto]) {
      this.conversation.node = choice.goto;
      return this._conversationStep();
    }
    const endedId = this.conversation.id;
    this.conversation = null;
    this.bus.emit(GameEvents.CONVERSATION_ENDED, { convId: endedId });
    return { ended: true, text: 'The conversation ends with mutual Finnish silence.' };
  }

  // Escape hatch: gracefully abandon a conversation (docs/12 keyboard-first).
  endConversation() {
    if (!this.conversation) return false;
    const endedId = this.conversation.id;
    this.conversation = null;
    this.say('You bow politely and exit the conversation. Small talk: defeated.');
    this.bus.emit(GameEvents.CONVERSATION_ENDED, { convId: endedId });
    return true;
  }

  _conversationStep() {
    const conv = this.content.conversations[this.conversation.id];
    const node = conv.nodes[this.conversation.node];
    if (node.once && this.flags[`conv:${this.conversation.id}:${this.conversation.node}`]) {
      // Replay path: skip repeat comedy, keep structure stable.
      this.say('(They have said all they are going to say.)');
      this.conversation = null;
      return { ended: true, replayed: true };
    }
    this.bus.emit(GameEvents.CONVERSATION_NODE, { convId: this.conversation.id, nodeId: this.conversation.node });
    for (const line of node.lines) {
      if (isCriticalLine(line)) this.sayRaw(`${CRITICAL_LINE_MARKER}${line.speaker}: ${line.text}`);
      else this.say(`${line.speaker}: ${line.text}`);
    }
    if (node.setFlag) this.setFlag(node.setFlag);
    if (node.once) this.setFlag(`conv:${this.conversation.id}:${this.conversation.node}`);
    if (Array.isArray(node.givesItem)) {
      for (const g of node.givesItem) {
        if (!this.flags[`dlg_given:${this.conversation.id}:${this.conversation.node}:${g.item}`]) {
          this.player.addItem(g.item, g.count || 1);
          this.setFlag(`dlg_given:${this.conversation.id}:${this.conversation.node}:${g.item}`);
          this.say(`You pocket the ${this._itemName(g.item)}. They insist.`);
        }
      }
    }
    let choices = node.choices || [];
    if (choices.length === 0) {
      this.conversation = null;
      return { text: '', choices: [], ended: true };
    }
    // Filter choices by conditions (flags / inventory), then hide single-branch menus.
    choices = choices.filter((c) => this._conditionsMet(this._scene(), c));
    while (choices.length === 1 && choices[0].goto && conv.nodes[choices[0].goto]) {
      const next = choices[0];
      this.conversation.node = next.goto;
      const step = this._conversationStep();
      if (step.ended) return step;
      return step;
    }
    if (choices.length === 0) {
      this.conversation = null;
      return { text: '', choices: [], ended: true };
    }
    return { text: node.prompt || 'You:', choices: choices.map((c) => ({ label: c.label })) };
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
    // docs/09 Phase 3: pack behavior. A cat may belong to a named pack; packs
    // coordinate — triggering one member brings the whole pack, but the pack
    // shares ONE cooldown so players face a single "pipe-or-flight" decision.
    const packId = obj.pack;
    if (packId) {
      const pack = this.content.packs?.[packId];
      const members = this._scene().objects.filter((o) => o.pack === packId);
      const leaderCd = this.hazardCooldowns[`pack:${packId}`] || 0;
      if (this.clock.now() < leaderCd) {
        this.say('The pack is grooming. They will see you later. Probably.');
        return;
      }
      this.bus.emit(GameEvents.CAT_HAZARD_TRIGGERED, { hazardId: obj.id, pack: packId });
      this.setFlag('met_cat_pack');
      const dmg = obj.damage ?? this.content.tuning.cat.damage;
      this.player.takeDamage(dmg, 'perkele-cat');
      const cdSecs = obj.cooldownSeconds ?? this.content.tuning.cat.cooldownSeconds;
      this.hazardCooldowns[obj.id] = this.clock.now() + cdSecs;
      this.hazardCooldowns[`pack:${packId}`] = this.clock.now() + cdSecs;
      for (const m of members) {
        if (m !== obj) this.hazardCooldowns[m.id] = this.clock.now() + cdSecs;
      }
      this.pendingCatDodge = true;
      const howl = pack?.howl || `PERKELE CAT attacks! -${dmg} health. It hisses "PERKELE" with feeling.`;
      const reinforcements = members.length > 1
        ? `\n${members.length - 1} more cat(s) arrive at tactical speed. The pack has opinions about you.`
        : '';
      this.say(`${howl}${reinforcements}`);
      return;
    }
    this.bus.emit(GameEvents.CAT_HAZARD_TRIGGERED, { hazardId: obj.id });
    const dmg = obj.damage ?? this.content.tuning.cat.damage;
    this.player.takeDamage(dmg, 'perkele-cat');
    this.hazardCooldowns[obj.id] = this.clock.now() + (obj.cooldownSeconds ?? this.content.tuning.cat.cooldownSeconds);
    this.pendingCatDodge = true; // docs/06: cat is now a valid pipe target (it will dodge — comedy, not solution)
    this.say(obj.hitText || `PERKELE CAT attacks! -${dmg} health. It regrets nothing.`);
  }

  // ---------- Seppo rescue (docs/04/23: rare, helpful, funny) ----------

  seppoEncounter(obj) {
    if (this.flags['seppo_done']) {
      // Phase 3 personality pass: the rare repeat-encounter gag (docs/22 —
      // callbacks beat repetition). Deterministic via counter flag.
      const n = (this.flags['seppo_gags'] || 0) % SEPPO_REPEAT_GAGS.length;
      this.flags['seppo_gags'] = (this.flags['seppo_gags'] || 0) + 1;
      this.say(SEPPO_REPEAT_GAGS[n]);
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
      this.conversation = null;
      this.pendingCatDodge = false;
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
