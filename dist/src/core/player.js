// Player domain state: health, inventory, equipment choice, beer state.
// Pure logic — no DOM (docs/14 layering). Emits through the shared EventBus.

import { GameEvents } from './events.js';

export const EquipmentState = Object.freeze({
  NONE: 'NONE',
  PIPE: 'PIPE',
  BEER: 'BEER',
});

export const BeerState = Object.freeze({
  SOBER: 'SOBER',
  TIPSY: 'TIPSY',
  SURREAL: 'SURREAL',
  RECOVERING: 'RECOVERING',
});

export const MAX_SHOTS = 6; // docs/03 + AGENTS.md non-negotiable rule

export class Player {
  constructor(bus, tuning) {
    this.bus = bus;
    this.tuning = tuning;

    this.maxHealth = tuning.player.maxHealth;
    this.health = tuning.player.startHealth;

    /** @type {Map<string, number>} itemId -> count */
    this.inventory = new Map();

    this.equipment = EquipmentState.NONE;
    this.shotsLeft = 0; // pipe shots in current loaded cycle

    this.beerState = BeerState.SOBER;
    // One token identifying the current beer session: swapping timers into a
    // single cancelable handle makes stale transitions impossible (audit F-1).
    this.beerSession = 0;
    // Phase 2 (docs/05): how many beers deep the current session is. Drives
    // escalation layers in beer-logic + renderer. Resets when fully sober.
    this.beerLevel = 0;
    // Deterministic gag rotation counters (docs/22 recurring jokes with
    // variations). Never Math.random — clock + counters only.
    this.gagCounters = {};
  }

  /** Deterministic rotating pick from a list of joke lines (docs/22). */
  _gag(key, lines) {
    const n = (this.gagCounters[key] = (this.gagCounters[key] || 0) + 1);
    return lines[(n - 1) % lines.length];
  }

  // ---------- health ----------

  heal(amount) {
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    if (this.health !== before) {
      this.bus.emit(GameEvents.HEALTH_CHANGED, { health: this.health, max: this.maxHealth });
    }
    return this.health - before;
  }

  takeDamage(amount, source) {
    if (this.health <= 0) return 0;
    const before = this.health;
    this.health = Math.max(0, this.health - amount);
    this.bus.emit(GameEvents.DAMAGE_APPLIED, { amount: before - this.health, source });
    this.bus.emit(GameEvents.HEALTH_CHANGED, { health: this.health, max: this.maxHealth });
    if (this.health <= 0) {
      this.bus.emit(GameEvents.GAME_OVER, { source });
    }
    return before - this.health;
  }

  // ---------- inventory ----------

  addItem(itemId, count = 1) {
    this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + count);
    this.bus.emit(GameEvents.ITEM_ADDED, { itemId, count });
    this.bus.emit(GameEvents.INVENTORY_CHANGED, {});
  }

  removeItem(itemId, count = 1) {
    const have = this.inventory.get(itemId) || 0;
    if (have < count) return false;
    if (have === count) this.inventory.delete(itemId);
    else this.inventory.set(itemId, have - count);
    this.bus.emit(GameEvents.ITEM_REMOVED, { itemId, count });
    this.bus.emit(GameEvents.INVENTORY_CHANGED, {});
    return true;
  }

  hasItem(itemId) {
    return (this.inventory.get(itemId) || 0) > 0;
  }

  // ---------- equipment (pipe XOR beer) ----------

  /**
   * @param {'PIPE'|'BEER'|'NONE'} choice equipment slot choice
   * @param {string} [itemId] inventory item id required for the choice
   */
  equip(choice, itemId) {
    if (choice === EquipmentState.NONE) {
      this._setEquipment(EquipmentState.NONE);
      return { ok: true };
    }
    if (itemId && !this.hasItem(itemId)) {
      return { ok: false, reason: `You do not have the ${choice.toLowerCase()} yet.` };
    }
    this._setEquipment(choice);
    if (choice === EquipmentState.PIPE && this.shotsLeft === 0) {
      this.reloadPipe();
    }
    return { ok: true };
  }

  swapEquipment() {
    // Explicit visible swap between the two signature choices.
    const t = this.tuning.player;
    if (this.equipment !== EquipmentState.PIPE && this.equipment !== EquipmentState.BEER) {
      return { ok: false, reason: 'Nothing to swap yet. You need both a pipe and a beer first.' };
    }
    const next = this.equipment === EquipmentState.PIPE ? EquipmentState.BEER : EquipmentState.PIPE;
    if (next === EquipmentState.BEER && this.beerState !== BeerState.SOBER) {
      // Audit F-2: swapping to beer mid-session must not resurrect a dead
      // timer chain — end the current beer session cleanly first.
      this.cancelBeerSession();
      this._setBeerState(BeerState.SOBER);
    }
    const needItem = next === EquipmentState.PIPE ? t.pipeItemId : t.beerItemId;
    const prev = this.equipment; // BUG-5 fix: capture BEFORE equip mutates the slot
    const res = this.equip(next, needItem);
    if (res.ok) {
      // Phase 2 (docs/12): dedicated feedback event so the HUD can flourish.
      this.bus.emit(GameEvents.EQUIPMENT_SWAPPED, { from: prev, to: next });
    }
    return res;
  }

  /** Cancel all pending beer-state transitions for the current session. */
  cancelBeerSession() {
    this.beerSession += 1;
  }

  _setEquipment(target) {
    if (this.equipment === target) return;
    this.equipment = target;
    this.bus.emit(GameEvents.EQUIPMENT_CHANGED, { equipment: target, shotsLeft: this.shotsLeft });
  }

  // ---------- pipe ----------

  reloadPipe() {
    this.shotsLeft = MAX_SHOTS;
    this.bus.emit(GameEvents.EQUIPMENT_CHANGED, { equipment: this.equipment, shotsLeft: this.shotsLeft, reloaded: true });
  }

  canFirePipe() {
    if (this.equipment !== EquipmentState.PIPE) {
      return { ok: false, reason: this._gag('pipe-not-equipped', [
        'The pipe is not equipped. It watches you struggle from your pocket, smug.',
        'You are holding the wrong legend. Press [X] to swap to the pipe.',
        'The pipe stays holstered until you commit. Like most Finnish plans.',
      ]) };
    }
    if (this.shotsLeft <= 0) {
      return { ok: false, reason: this._gag('pipe-empty', [
        'Click. Empty. The pipe rattles sadly, like a maraca of regret. Press [R].',
        'Nothing but tobacco-flavored disappointment. Reload with [R].',
        'The pipe has expressed all six of its opinions. Reload it.',
      ]) };
    }
    return { ok: true };
  }

  firePipe() {
    const check = this.canFirePipe();
    if (!check.ok) return check;
    this.shotsLeft -= 1;
    this.bus.emit(GameEvents.PIPE_FIRED, { shotsLeft: this.shotsLeft });
    if (this.shotsLeft === 0) {
      this.bus.emit(GameEvents.MESSAGE, { text: 'CLONK. That was the last shot. The pipe goes silent, emotionally.' });
    }
    return { ok: true, shotsLeft: this.shotsLeft };
  }

  // ---------- beer ----------

  canDrinkBeer() {
    if (this.equipment === EquipmentState.PIPE) {
      // Non-negotiable rule (AGENTS.md §3): UI must explain the swap.
      return { ok: false, reason: this._gag('drink-with-pipe', [
        'You cannot drink with the pipe in hand. The Pipe Council forbids it. Press [X] to swap.',
        'The beer refuses to compete with six shots of authority. Swap equipment first [X].',
        'Drinking requires a free-ish hand. The pipe is holding ALL of your hands. Press [X].',
      ]) };
    }
    if (this.equipment !== EquipmentState.BEER) {
      return { ok: false, reason: 'Equip the beer first [E], then drink [D]. Basic beverage ergonomics.' };
    }
    if (!this.hasItem(this.tuning.player.beerItemId)) {
      return { ok: false, reason: this._gag('no-beer', [
        'No beer left. The bottle was an illusion of hope, now deeply practical disappointment.',
        'Empty. You stare into the glass like it owes you money. It does.',
        'Zero beers. The fridge in your mind closes politely.',
      ]) };
    }
    if (this.beerState !== BeerState.SOBER && this.beerState !== BeerState.RECOVERING) {
      return { ok: false, reason: this._gag('already-drunk', [
        'You are already seeing sideways. Wait for the world to stop breathing.',
        'Another one? The floor has filed a restraining order. Wait it out.',
        'Your liver sends a strongly worded fax. Recovery in progress.',
      ]) };
    }
    return { ok: true };
  }

  drinkBeer(clock) {
    const check = this.canDrinkBeer();
    if (!check.ok) return check;
    const beerId = this.tuning.player.beerItemId;
    this.removeItem(beerId);
    this.bus.emit(GameEvents.ITEM_CONSUMED, { itemId: beerId });
    this.beerLevel += 1; // Phase 2: session depth drives escalation layers
    this.bus.emit(GameEvents.BEER_DRANK, { level: this.beerLevel });

    this._setBeerState(BeerState.TIPSY);
    const t = this.tuning.beer;
    // Audit F-1: one session token guards the whole chain, so a re-drink or
    // swap can never leave stale timers that skip states (SURREAL was
    // previously skipped when drinking during RECOVERING).
    this.cancelBeerSession();
    const session = this.beerSession;
    const guarded = (state) => () => {
      if (this.beerSession === session) this._setBeerState(state);
    };
    clock.after(t.tipsySeconds, guarded(BeerState.SURREAL));
    clock.after(t.tipsySeconds + t.surrealSeconds, guarded(BeerState.RECOVERING));
    clock.after(
      t.tipsySeconds + t.surrealSeconds + t.recoveringSeconds,
      () => {
        if (this.beerSession !== session) return;
        this.beerLevel = 0; // fully sober: session depth resets
        this._setBeerState(BeerState.SOBER);
      },
    );
    return { ok: true, level: this.beerLevel };
  }

  _setBeerState(state) {
    if (this.beerState === state) return;
    const prev = this.beerState;
    this.beerState = state;
    this.bus.emit(GameEvents.BEER_STATE_CHANGED, { state, prev });
  }

  // ---------- food ----------

  consumeFood(itemId, items) {
    const def = items[itemId];
    if (!def || def.type !== 'food') {
      return { ok: false, reason: 'That is not food. Probably.' };
    }
    if (!this.hasItem(itemId)) {
      return { ok: false, reason: 'You do not have that.' };
    }
    if (def.gag) {
      // Soap gag: funny but explicitly NOT presented as real-world advice.
      this.removeItem(itemId);
      this.bus.emit(GameEvents.ITEM_CONSUMED, { itemId });
      this.bus.emit(GameEvents.MESSAGE, {
        text: `${def.inspectText}\n(Absurd fiction. Do NOT eat real soap. Soap is for washing.)`,
      });
      return { ok: true, healed: 0, gag: true };
    }
    const healed = this.heal(def.heal);
    this.removeItem(itemId);
    this.bus.emit(GameEvents.ITEM_CONSUMED, { itemId });
    this.bus.emit(GameEvents.MESSAGE, { text: `You eat the ${def.displayName}. Health +${healed}.` });
    return { ok: true, healed };
  }

  // ---------- save/load ----------

  serialize() {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      inventory: [...this.inventory.entries()],
      equipment: this.equipment,
      shotsLeft: this.shotsLeft,
      beerState: this.beerState,
      gagCounters: { ...this.gagCounters },
    };
  }

  load(data, clock) {
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    this.inventory = new Map(data.inventory);
    this.equipment = data.equipment;
    this.shotsLeft = data.shotsLeft;
    this.beerState = BeerState.SOBER; // never save mid-surreal; sobriety on load
    this.beerLevel = 0;
    this.gagCounters = data.gagCounters ? { ...data.gagCounters } : {};
    this.cancelBeerSession(); // audit F-1: drop any pending transitions from before the save
    this.bus.emit(GameEvents.INVENTORY_CHANGED, {});
    this.bus.emit(GameEvents.EQUIPMENT_CHANGED, { equipment: this.equipment, shotsLeft: this.shotsLeft });
    this.bus.emit(GameEvents.HEALTH_CHANGED, { health: this.health, max: this.maxHealth });
  }
}
