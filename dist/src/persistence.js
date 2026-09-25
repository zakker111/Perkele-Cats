// Versioned save/load via localStorage (docs/16). Fails gracefully: a corrupt
// or version-mismatched save never crashes the game or corrupts new state.

const KEY = 'perkele-adventure-save';

export function saveGame(engine) {
  try {
    localStorage.setItem(KEY, JSON.stringify(engine.serialize()));
    return true;
  } catch (err) {
    console.error('save failed', err);
    return false;
  }
}

export function loadGame(engine) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    return engine.load(JSON.parse(raw));
  } catch (err) {
    console.error('load failed', err);
    return false;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
