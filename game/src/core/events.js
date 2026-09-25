// Minimal synchronous event bus (see docs/14_TECHNICAL_ARCHITECTURE.md).
// Renderers and UI subscribe; domain systems publish. No DOM dependency.

export const GameEvents = Object.freeze({
  SCENE_ENTERED: 'SCENE_ENTERED',
  INTERACTION_STARTED: 'INTERACTION_STARTED',
  MESSAGE: 'MESSAGE',
  ITEM_ADDED: 'ITEM_ADDED',
  ITEM_REMOVED: 'ITEM_REMOVED',
  ITEM_CONSUMED: 'ITEM_CONSUMED',
  INVENTORY_CHANGED: 'INVENTORY_CHANGED',
  EQUIPMENT_CHANGED: 'EQUIPMENT_CHANGED',
  EQUIPMENT_SWAPPED: 'EQUIPMENT_SWAPPED',
  PIPE_FIRED: 'PIPE_FIRED',
  BEER_DRANK: 'BEER_DRANK',
  BEER_STATE_CHANGED: 'BEER_STATE_CHANGED',
  HEALTH_CHANGED: 'HEALTH_CHANGED',
  DAMAGE_APPLIED: 'DAMAGE_APPLIED',
  PUZZLE_STEP: 'PUZZLE_STEP',
  PUZZLE_COMPLETED: 'PUZZLE_COMPLETED',
  HAMMER_EVENT_STARTED: 'HAMMER_EVENT_STARTED',
  HAMMER_EVENT_RESOLVED: 'HAMMER_EVENT_RESOLVED',
  CAT_HAZARD_TRIGGERED: 'CAT_HAZARD_TRIGGERED',
  DIALOGUE_STARTED: 'DIALOGUE_STARTED',
  DIALOGUE_FINISHED: 'DIALOGUE_FINISHED',
  FLAG_CHANGED: 'FLAG_CHANGED',
  GAME_OVER: 'GAME_OVER',
  GAME_WON: 'GAME_WON',
  SAVED: 'SAVED',
  LOADED: 'LOADED',
});

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const set = this.listeners.get(event);
    if (set) set.delete(fn);
  }

  emit(event, payload = {}) {
    const set = this.listeners.get(event);
    if (set) {
      for (const fn of [...set]) fn(payload, event);
    }
  }
}
