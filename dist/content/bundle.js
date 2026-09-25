// Data-driven content bundle (docs/15). All ids are stable and unique.
// Skeleton slice: covers First Episode beats 1–10 (docs/23) with original text.

export const content = {
  startScene: 'scene_moi',

  tuning: {
    player: { maxHealth: 10, startHealth: 6, walkSpeedTilesPerSecond: 4, pipeItemId: 'item_pipe', beerItemId: 'item_beer_bottle' },
    beer: { tipsySeconds: 3, surrealSeconds: 8, recoveringSeconds: 4 },
    hammer: { windowSeconds: 12, damage: 3 },
    cat: { damage: 2, cooldownSeconds: 20 },
    seppo: { healthThreshold: 4 },
  },

  items: {
    item_pipe: { id: 'item_pipe', type: 'equipment', displayName: 'Sauna Pipe', stackable: false,
      inspectText: 'A hand-carved pipe with exactly six opinions per reload.' },
    item_beer_bottle: { id: 'item_beer_bottle', type: 'equipment', displayName: 'Koffy-Gold Beer', stackable: true,
      inspectText: 'Cold. Condolences to your liver. Swapping required before drinking.' },
    item_berries: { id: 'item_berries', type: 'food', displayName: 'Swamp Berries', stackable: true, heal: 2,
      inspectText: 'Local berries. Definitely food. Probably.' },
    item_bread: { id: 'item_bread', type: 'food', displayName: 'Rye Bread', stackable: true, heal: 3,
      inspectText: 'Dark rye. Can stop a small hammer. Also breakfast.' },
    item_soap: { id: 'item_soap', type: 'food', gag: true, displayName: 'Finnish Soap', stackable: false,
      inspectText: 'The legendary soap. FICTIONAL GAG ITEM — in this world soap counts as food. In yours it does not. Soap is for washing.' },
    item_stick: { id: 'item_stick', type: 'misc', displayName: 'Suspicious Stick', stackable: true,
      inspectText: 'A stick with commitment issues.' },
    item_gate_key: { id: 'item_gate_key', type: 'key', displayName: 'Rusty Gate Key', stackable: false,
      inspectText: 'Opens the forest gate. Smells of perseverance.' },
  },

  dialogue: {
    dlg_maija_intro: {
      setFlag: 'met_maija',
      lines: [
        { speaker: 'Maija', text: 'You smell like sauna smoke and bad decisions.' },
        { speaker: 'Maija', text: 'Take the pipe. Or the beer. Never both at once. That is the law.' },
        { speaker: 'Maija', text: 'Press E to equip, X to swap. The universe is full of switches.' },
      ],
    },
    dlg_tarmo_grumble: {
      lines: [
        { speaker: 'Tarmo', text: 'I am fixing the fence. With a HAMMER. It is emotional support construction.' },
        { speaker: 'Tarmo', text: 'Do not stand in the swing zone. The swing zone is everywhere. Sorry!' },
      ],
    },
  },

  puzzles: {
    puzzle_stove: {
      intro: 'The old wood stove refuses to light. Three dials stare back at you.',
      steps: [
        {
          question: 'The chimney flap is rusted. You:',
          choices: ['Pour beer on it', 'Open it with the suspicious stick', 'Ask it politely in Finnish'],
          answerIndex: 1,
          correctText: 'The stick fits perfectly. The chimney opens like it has been waiting.',
          wrongText: 'The stove is not impressed by beverages or manners.',
        },
        {
          question: 'Two logs remain. Where do they go?',
          choices: ['On top, stacked like pancakes', 'Criss-cross like a tiny wooden bed', 'Back inside your bag'],
          answerIndex: 1,
          correctText: 'A tiny wooden bed for fire. Textbook.',
          wrongText: 'The logs reject the pancake theory.',
        },
        {
          question: 'Final step: what does every Finnish stove need?',
          choices: ['A moment of silence', 'One more log "for later"', 'Matches, obviously'],
          answerIndex: 2,
          correctText: 'MATCHES. The stove roars to life. Warmth achieved.',
          wrongText: 'Poetry will not ignite birch bark.',
        },
      ],
      successText: 'PUZZLE SOLVED: The stove works! Maija nods from across the yard, trying not to smile.',
      setFlag: 'stove_solved',
      rewardItem: 'item_gate_key',
    },
    puzzle_finale: {
      intro: 'The forest gate. A lock shaped like three mushrooms. This is fine.',
      steps: [
        {
          question: 'The keyhole hides behind moss. You use:',
          choices: ['Your finger', 'The suspicious stick (again)', 'Soap as lubricant (in fiction only!)'],
          answerIndex: 1,
          correctText: 'The stick removes the moss. The stick has a second career.',
          wrongText: 'The moss wins round one.',
        },
        {
          question: 'The rusty key resists. Best technique?',
          choices: ['Force, panic, force', 'Wiggle gently while complaining loudly', 'Bribery'],
          answerIndex: 1,
          correctText: 'The lock appreciates traditional Finnish complaint-based maintenance. Click!',
          wrongText: 'The lock files a noise complaint.',
        },
        {
          question: 'The gate swings open. You:',
          choices: ['Walk through like a legend', 'Run because spiders', 'Ask the gate for permission'],
          answerIndex: 0,
          correctText: 'You stride through. The forest applauds in leaves.',
          wrongText: 'Spiders are valid. But the story needs walking.',
        },
      ],
      winGame: true,
      endingText: '★ EPISODE ONE COMPLETE ★ You survived cats, hammers and your own equipment choices. Episode two: the Sauna of Destiny.',
    },
  },

  scenes: [
    // ---------- Beat 1–4: Mökki piha (cottage yard) ----------
    {
      id: 'scene_moi',
      displayName: 'Mökki Piha (Cottage Yard)',
      intro: 'A cottage yard in rural Finland. A sign reads: "CLICK TO WALK. THIS IS THE TUTORIAL."',
      walk: { width: 12, height: 8, blocked: [[0,0],[11,0],[0,7],[11,7]] },
      objects: [
        { id: 'obj_sign', kind: 'prop', x: 2, y: 1, label: 'Sign', action: 'inspect',
          text: 'The sign says: click glowing things. Clicking non-glowing things is discouraged.' },
        { id: 'obj_stick', kind: 'item', x: 8, y: 5, label: 'Stick', action: 'take', givesItem: 'item_stick' },
        { id: 'obj_maija', kind: 'npc', x: 5, y: 2, label: 'Maija', action: 'dialogue', dialogue: 'dlg_maija_intro' },
        { id: 'obj_pipe_case', kind: 'item', x: 3, y: 5, label: 'Pipe case', action: 'take', givesItem: 'item_pipe',
          conditions: { flags: ['met_maija'] }, lockedText: 'Maija holds the case hostage until you say hello.' },
        { id: 'obj_beer_crate', kind: 'item', x: 9, y: 2, label: 'Beer crate', action: 'take', givesItem: 'item_beer_bottle',
          conditions: { flags: ['met_maija'] }, lockedText: 'The crate is welded shut by narrative pacing.' },
        { id: 'obj_bush', kind: 'item', x: 10, y: 6, label: 'Berry bush', action: 'take', givesItem: 'item_berries' },
        { id: 'obj_exit_forest', kind: 'exit', x: 11, y: 4, label: 'Path → Forest', action: 'goto', exit: 'to_forest' },
        { id: 'obj_exit_sauna', kind: 'exit', x: 0, y: 4, label: '← Sauna door', action: 'goto', exit: 'to_sauna' },
      ],
      exits: [
        { name: 'to_forest', to: 'scene_forest', spawn: { x: 1, y: 4 } },
        { name: 'to_sauna', to: 'scene_sauna', spawn: { x: 1, y: 4 } },
      ],
    },

    // ---------- Beat 5: safe puzzle room (no enemies allowed here, docs/07) ----------
    {
      id: 'scene_sauna',
      displayName: 'Pikku Sauna (Little Sauna)',
      intro: 'A small sauna. Cozy. Puzzle-shaped. Zero hostile wildlife, by zoning law.',
      walk: { width: 10, height: 7, blocked: [[0,0],[9,0],[0,6],[9,6]] },
      objects: [
        { id: 'obj_stove', kind: 'puzzle', x: 5, y: 1, label: 'Wood stove', action: 'puzzle', puzzle: 'puzzle_stove' },
        { id: 'obj_soap_shelf', kind: 'item', x: 2, y: 3, label: 'Soap shelf', action: 'take', givesItem: 'item_soap' },
        { id: 'obj_bench', kind: 'prop', x: 7, y: 4, label: 'Bench', action: 'inspect',
          text: 'A wooden bench at two heights. The architecture of relaxation.' },
        { id: 'obj_back_yard', kind: 'exit', x: 0, y: 4, label: '← Back to yard', action: 'goto', exit: 'back_yard' },
      ],
      exits: [{ name: 'back_yard', to: 'scene_moi', spawn: { x: 1, y: 4 } }],
    },

    // ---------- Beats 6–10: forest road ----------
    {
      id: 'scene_forest',
      displayName: 'Metropolie (Forest Road)',
      intro: 'A forest road. Birds sing. Somewhere, a cat sharpens tiny claws.',
      walk: { width: 14, height: 8, blocked: [[0,0],[13,0],[0,7],[13,7],[6,3],[7,3]] },
      objects: [
        { id: 'obj_cat', kind: 'hazard', x: 9, y: 2, label: 'Perkele Cat', action: 'cat',
          hitText: 'PERKELE CAT attacks from an oak tree! -2 health. It hisses "PERKELE" with feeling.' },
        { id: 'obj_tarmo', kind: 'npc', x: 4, y: 2, label: 'Tarmo + hammer', action: 'dialogue', dialogue: 'dlg_tarmo_grumble' },
        { id: 'obj_hammer_zone', kind: 'event', x: 5, y: 5, label: 'Swing zone', action: 'hammer-event',
          npc: 'Tarmo', telegraph: 'He winds up. Choose FAST:',
          options: [
            { label: 'Dodge left', kind: 'dodge', success: true, text: 'You dodge. The hammer hits a stump. The stump apologizes.' },
            { label: 'Fire the pipe (startle shot)', kind: 'pipe', success: true, text: 'BANG! Tarmo startles, drops the hammer, thanks you for the excitement.' },
            { label: 'Stand still and network', kind: 'talk', success: false, text: 'You make eye contact with the descending hammer. Rude.' },
          ] },
        { id: 'obj_seppo', kind: 'npc', x: 11, y: 6, label: 'Strange figure', action: 'seppo', givesItem: 'item_bread' },
        { id: 'obj_gate', kind: 'puzzle', x: 13, y: 4, label: 'Forest gate', action: 'puzzle', puzzle: 'puzzle_finale',
          conditions: { items: ['item_gate_key'] },
          lockedText: 'The mushroom lock wants its key. The stove puzzle had one. Just saying.' },
        { id: 'obj_back_home', kind: 'exit', x: 0, y: 4, label: '← Back to yard', action: 'goto', exit: 'back_yard' },
      ],
      exits: [{ name: 'back_yard', to: 'scene_moi', spawn: { x: 10, y: 4 } }],
    },
  ],
};
