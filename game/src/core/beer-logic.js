// Beer psychology layer (docs/05): the drunk dialogue filter.
// Pure logic — DOM-free, deterministic, unit-testable (AGENTS.md §7).
//
// Design rules honored here:
//  * Text stays READABLE during surreal state (docs/17 accessibility):
//    whole-word funny synonyms only; we never scramble letters.
//  * Speaker prefixes ("Maija: ...") are preserved so dialogue attribution
//    survives the drunken haze.
//  * Reduced-distortion mode disables the filter entirely — same opt-out as
//    the visual distortion (parity between senses).

import { BeerState } from './player.js';

/**
 * Word-substitution tables per beer state, data-driven so comedy writers can
 * tune them without touching code (docs/15 principle). Matched on word
 * boundaries, case-insensitive, leading capital preserved.
 */
export const DRUNK_FILTERS = Object.freeze({
  [BeerState.TIPSY]: Object.freeze({
    very: 'slightly-more-than-slightly',
    dangerous: 'character-building',
    cat: 'small angry loaf',
    cats: 'small angry loaves',
    hammer: 'emotional support hammer',
    tomorrow: 'never (ask me on Thursday)',
    problem: 'opportunity-shaped object',
    problems: 'opportunity-shaped objects',
    quiet: 'suspiciously calm',
    key: 'shiny perseverance object',
    fine: 'structurally magnificent',
    work: 'consensual hallucination',
    night: 'when the furniture whispers',
    strange: 'interesting-shaped',
    lost: 'geographically philosophical',
    secret: 'whisper-material',
    easy: 'suspiciously smooth',
    hard: 'rude physics',
    old: 'vintage decision',
    new: 'recently born',
  }),
  [BeerState.SURREAL]: Object.freeze({
    hello: 'greetings, fellow temporary meat',
    yes: 'obviously, the universe agrees',
    no: 'no, but also everything, but mostly no',
    door: 'portal of commitment',
    pipe: 'the six opinions',
    beer: 'liquid honesty',
    forest: 'green togetherness',
    sauna: 'hot truth chamber',
    bread: 'edible pillow',
    soap: 'forbidden candy (fiction only!)',
    stove: 'fire furniture',
    gate: 'wooden question mark',
    health: 'soul structural integrity',
    friend: 'unpaid life consultant',
    time: 'the river that bills you',
    home: 'where the socks live',
    dangerous: 'beautifully inadvisable',
    cat: 'tiny chaos goblin',
    cats: 'chaos goblins',
    hammer: "Tarmo's exclamation tool",
    sign: 'paper that thinks it is wise',
    stick: 'the true protagonist',
    berries: 'swamp candy (bulk bag)',
    bird: 'flying rat (affectionate)',
    tree: 'vertical forest opinion',
    smoke: "the sauna's ghost",
    walk: 'leg business',
    run: 'panic tourism',
    fire: 'angry light',
    cold: 'aggressively Scandinavian',
    dead: 'temporarily unavailable',
    sleep: 'horizontal thinking',
    dream: 'free cinema',
    life: 'the long tutorial',
    silence: 'loud nothing',
    truth: 'one of several drafts',
    maybe: 'probably definitely possibly',
    fine: 'structurally magnificent',
    good: 'morning-tier excellent',
    bad: 'a plot twist',
    old: 'vintage decision',
    new: 'recently born',
    face: 'meat mask',
    hand: 'finger platform',
    head: 'thought tower',
    mind: 'the internal parliament',
    strange: 'interesting-shaped',
    tired: 'battery-saving mode',
    left: 'the suspicious side',
    right: 'the correct side, obviously',
    end: 'the period at the sentence',
    win: 'successful not-losing',
    lost: 'geographically philosophical',
    hidden: 'playing very serious hide-seek',
    mystery: 'question wearing a coat',
    puzzle: 'friendly wall',
    lock: 'stubborn little box',
    broken: 'modern art now',
    empty: 'full of absence',
    never: 'not even once, dramatically',
    again: 'one more time, bravely',
    soon: 'in the near later',
    later: "the future's waiting room",
    first: 'the pioneer ordinal',
    last: 'the survivor ordinal',
    best: 'gold-plated option',
    worst: 'blacklisted option',
    always: 'every single rotation of the planet',
    simple: 'stairs with two steps',
    joke: 'a small humor animal',
    think: 'brain typing',
    know: 'data installed',
    remember: 'memory returns the call',
    game: 'structured playtime',
    wait: 'stand still with expectations',
    stay: 'commit to coordinates',
    inside: 'belly of the building',
    dark: 'the lights are being philosophical',
    color: 'the skin of light',
    colors: 'the skins of light',
    sound: 'air punches',
    voice: 'meat flute',
    words: 'many small meaning containers',
    book: 'stack of trapped voices',
    story: 'a chain of and-thens',
    idea: 'a thought that showed up uninvited',
    destiny: "the plot's favorite word",
    luck: 'randomness with manners',
    money: 'paper that convinces people',
    key: 'the yes of hardware',
    work: 'consensual hallucination',
    night: 'when the furniture whispers',
    quiet: 'suspiciously calm',
    problem: 'opportunity-shaped object',
    problems: 'opportunity-shaped objects',
    very: 'a amount of amount',
    easy: 'suspiciously smooth',
    hard: 'rude physics',
  }),
});

const SURREAL_SUFFIX = ' …the world hums in B-flat.';

// ---------- multi-beer escalation (Phase 2, docs/05) ----------
// A second+ beer deepens the surreal state instead of resetting it: extra
// word layers and stronger visual distortion. Presentation-only — puzzle
// facts and required item labels stay readable (docs/05 accessibility rule).

const ESCALATION_TABLES = Object.freeze({
  2: Object.freeze({
    friend: 'certified human-shaped companion',
    forest: 'green parliament',
    time: 'melting Tuesday',
    work: 'voluntary hallucination',
    night: 'when the floorboards gossip',
    door: 'wooden challenge',
    key: 'metal confidence',
    problem: 'opportunity-shaped boulder',
    cat: 'furry tax collector',
    hammer: 'Tarmo\'s punctuation device',
    bread: 'square soup (solid variant)',
    beer: 'liquid honesty (double shot)',
    pipe: 'the six opinions (unanimous)',
    health: 'soul load-bearing wall',
    fire: 'enthusiastic lighting',
    cold: 'aggressively Nordic',
    truth: 'draft number four',
    life: 'the tutorial that never ends',
    silence: 'confident nothing',
    smoke: 'the sauna\'s alibi',
    head: 'thought cathedral',
    mind: 'internal parliament in session',
    wait: 'standing still with ambition',
    lost: 'geographically existential',
    easy: 'arrogantly smooth',
    hard: 'personally offensive physics',
  }),
  3: Object.freeze({
    friend: 'temporary permanent friend',
    forest: 'one very large green opinion',
    time: 'a rumor told by clocks',
    night: 'when the furniture forms a government',
    door: 'commitment machine',
    problem: 'opportunity-shaped mountain range',
    cat: 'apex chaos accountant',
    hammer: 'the final argument',
    bread: 'edible mattress',
    beer: 'philosophy juice',
    pipe: 'six unanimous opinions',
    health: 'spiritual plumbing',
    fire: 'portable sunset',
    cold: 'Scandinavia\'s personality',
    truth: 'one of several competing drafts',
    life: 'an unskippable cutscene',
    silence: 'a crowd of held breaths',
    smoke: 'the building\'s daydream',
    head: 'meat lighthouse',
    mind: 'parliament on fire (safely)',
    lost: 'spatially optimistic',
    easy: 'suspiciously frictionless',
    hard: 'physics with a personal grudge',
    hello: 'greetings, fellow temporary meat',
    yes: 'the universe agrees loudly',
    no: 'no, but also everything, but mostly no',
  }),
});

export const MAX_ESCALATION = 3; // beers 4+ behave like beer #3

/** Extra word layer for the Nth beer consumed in one session (N>=2). */
export function getEscalationTable(level) {
  return ESCALATION_TABLES[Math.min(level, MAX_ESCALATION)] || null;
}

/** CSS class the presentation layer applies to the canvas per escalation. */
export function getBeerVisualClass(level) {
  if (level >= 3) return 'surreal-deep';
  if (level === 2) return 'surreal-mid';
  return 'surreal-base';
}

/**
 * Apply the drunk dialogue filter to a message line.
 * @param {string} text raw line ("Speaker: content" supported)
 * @param {'SOBER'|'TIPSY'|'SURREAL'|'RECOVERING'} beerState
 * @param {{reducedDistortion?: boolean, escalationLevel?: number}} [opts]
 * @returns {string} filtered (or original) text
 */
export function filterDrunkText(text, beerState, opts = {}) {
  if (!text || typeof text !== 'string') return text;
  if (opts.reducedDistortion) return text; // accessibility opt-out parity with visuals
  const table = DRUNK_FILTERS[beerState];
  if (!table) return text; // SOBER / RECOVERING: authoritative clean text

  // Keep speaker prefix intact: "Maija: ..." — only filter the spoken part.
  let prefix = '';
  let body = text;
  const m = text.match(/^([A-ZÄÖÅ][\wÄÖÅ]*):\s(.*)$/s);
  if (m) {
    prefix = `${m[1]}: `;
    body = m[2];
  }

  const extra = opts.escalationLevel >= 2 ? getEscalationTable(opts.escalationLevel) : null;
  let hits = 0;
  const out = body.replace(/[A-Za-zÄÖÅäöå]+/g, (word) => {
    const lower = word.toLowerCase();
    // Escalation layer overrides the base table: deeper beer = stranger words.
    const rep = (extra && extra[lower]) || table[lower];
    if (!rep) return word;
    hits += 1;
    return /^[A-Z]/.test(word) ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
  });

  if (beerState === BeerState.SURREAL && hits >= 3) {
    return `${prefix}${out}${SURREAL_SUFFIX}`;
  }
  return prefix + out;
}

// ---------- surreal NPC suspicion (docs/05: "silly NPC reactions") ----------
// Presentation-only overlay on dialogue lines while SURREAL. Authoritative
// clean text stays in content data; puzzle-critical facts survive because we
// only append a paranoid aside — we never remove information.

const SUSPICION_ASIDE = ' …why is it standing so still? FURNITURE DOES NOT BREATHE.';

/**
 * Decorate a dialogue line for a suspicious drunk perception.
 * @param {string} line already-filtered dialogue line ("Speaker: text")
 * @param {{beerState: string, reducedDistortion?: boolean}} ctx
 * @returns {string}
 */
export function suspiciousNpcLine(line, ctx) {
  if (ctx.beerState !== BeerState.SURREAL || ctx.reducedDistortion) return line;
  // Only human NPCs read as suspicious; the player's own narration is untouched.
  if (!/^(Maija|Tarmo|Seppo):/.test(line)) return line;
  return line + SUSPICION_ASIDE;
}

/** Alternate surreal inspection line (docs/05), if one exists for the object. */
export function surrealInspect(obj, ctx) {
  if (ctx.beerState === BeerState.SURREAL && !ctx.reducedDistortion && obj.surrealText) {
    return obj.surrealText;
  }
  return obj.text;
}
