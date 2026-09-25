// Optional TTS adapter (docs/13). Text remains authoritative; the game is
// fully playable with TTS off or unsupported. Off by default.

window.__ttsEnabled = window.__ttsEnabled || false;

export function speakLine(text) {
  if (!window.__ttsEnabled) return;
  if (!('speechSynthesis' in window)) return; // graceful fallback: silence + text
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' '));
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* TTS is optional infrastructure — never break gameplay for it */
  }
}
