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
    this.beerTimerId = null;
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
    const next = this.equipment === EquipmentState.PIPE ? EquipmentState.BEER : EquipmentState.PIPE;
    const needItem = next === EquipmentState.PIPE ? t.pipeItemId : t.beerItemId;
    return this.equip(next, needItem);
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
      return { ok: false, reason: 'The pipe is not equipped. Press [E] to select it.' };
    }
    if (this.shotsLeft <= 0) {
      return { ok: false, reason: 'The pipe is empty. It rattles sadly. Press [R] to reload.' };
    }
    return { ok: true };
  }

  firePipe() {
    const check = this.canFirePipe();
    if (!check.ok) return check;
    this.shotsLeft -= 1;
    this.bus.emit(GameEvents.PIPE_FIRED, { shotsLeft: this.shotsLeft });
    if (this.shotsLeft === 0) {
      this.bus.emit(GameEvents.MESSAGE, { text: 'CLONK. That was the last shot. The pipe is empty.' });
    }
    return { ok: true, shotsLeft: this.shotsLeft };
  }

  // ---------- beer ----------

  canDrinkBeer() {
    if (this.equipment === EquipmentState.PIPE) {
      // Non-negotiable rule (AGENTS.md §3): UI must explain the swap.
      return { ok: false, reason: 'You cannot drink while the pipe is equipped. Swap equipment first [E/X].' };
    }
    if (this.equipment !== EquipmentState.BEER) {
      return { ok: false, reason: 'Equip the beer first [E], then drink [D].' };
    }
    if (!this.hasItem(this.tuning.player.beerItemId)) {
      return { ok: false, reason: 'No beer left. The bottle is an illusion of hope.' };
    }
    if (this.beerState !== BeerState.SOBER && this.beerState !== BeerState.RECOVERING) {
      return { ok: false, reason: 'You are already seeing sideways. Wait for the world to stop breathing.' };
    }
    return { ok: true };
  }

  drinkBeer(clock) {
    const check = this.canDrinkBeer();
    if (!check.ok) return check;
    const beerId = this.tuning.player.beerItemId;
    this.removeItem(beerId);
    this.bus.emit(GameEvents.ITEM_CONSUMED, { itemId: beerId });
    this.bus.emit(GameEvents.BEER_DRANK, {});

    this._setBeerState(BeerState.TIPSY);
    const t = this.tuning.beer;
    clock.cancel(this.beerTimerId);
    this.beerTimerId = clock.after(t.tipsySeconds, () => this._setBeerState(BeerState.SURREAL));
    this.beerTimerId = clock.after(t.tipsySeconds + t.surrealSeconds, () =>
      this._setBeerState(BeerState.RECOVERING),
    );
    this.beerTimerId = clock.after(t.tipsySeconds + t.surrealSeconds + t.recoveringSeconds, () =>
      this._setBeerState(BeerState.SOBER),
    );
    return { ok: true };
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
    };
  }

  load(data, clock) {
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    this.inventory = new Map(data.inventory);
    this.equipment = data.equipment;
    this.shotsLeft = data.shotsLeft;
    this.beerState = BeerState.SOBER; // never save mid-surreal; sobriety on load
    clock.cancel(this.beerTimerId);
    this.bus.emit(GameEvents.INVENTORY_CHANGED, {});
    this.bus.emit(GameEvents.EQUIPMENT_CHANGED, { equipment: this.equipment, shotsLeft: this.shotsLeft });
    this.bus.emit(GameEvents.HEALTH_CHANGED, { health: this.health, max: this.maxHealth });
  }
}
