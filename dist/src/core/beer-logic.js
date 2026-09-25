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

/**
 * Apply the drunk dialogue filter to a message line.
 * @param {string} text raw line ("Speaker: content" supported)
 * @param {'SOBER'|'TIPSY'|'SURREAL'|'RECOVERING'} beerState
 * @param {{reducedDistortion?: boolean}} [opts]
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

  let hits = 0;
  const out = body.replace(/[A-Za-zÄÖÅäöå]+/g, (word) => {
    const rep = table[word.toLowerCase()];
    if (!rep) return word;
    hits += 1;
    return /^[A-Z]/.test(word) ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
  });

  if (beerState === BeerState.SURREAL && hits >= 3) {
    return `${prefix}${out}${SURREAL_SUFFIX}`;
  }
  return prefix + out;
}
