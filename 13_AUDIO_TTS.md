# 13 — Audio and Text-to-Speech

## Audio goals

Audio supports comedy and feedback more than realism.

Use short reusable cues for:

- click/interaction;
- pickup;
- equipment swap;
- pipe shot;
- beer drink;
- heal;
- cat hazard;
- hammer wind-up/hit;
- puzzle success;
- scene transition.

## TTS architecture

Use an abstraction such as:

```text
SpeechService
  speak(text, voiceId, options)
  stop()
  isAvailable()
```

The browser implementation can use a platform speech API or another provider later. Game logic must not depend on a specific TTS vendor.

## Text is authoritative

Every spoken line is also available as readable text. If TTS fails, the game continues.

## Voice style

Use distinct but simple voice profiles if available. Do not require a large voice-acting pipeline for the first release.

## Comedy sound design

Silence can be a joke. Do not add music or sound to every interaction. Reserve the strongest cues for reveals and reactions.

## Accessibility

Provide mute controls, volume controls, subtitles/text for spoken dialogue, and a way to disable TTS while keeping dialogue visible.
