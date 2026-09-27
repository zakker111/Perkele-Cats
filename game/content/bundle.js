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
      inspectText: 'A stick with commitment issues.',
      useText: 'You wave the stick heroically. Nothing thanks you. The stick understands.' },
    item_gate_key: { id: 'item_gate_key', type: 'key', displayName: 'Rusty Gate Key', stackable: false,
      inspectText: 'Opens the forest gate. Smells of perseverance.',
      useText: 'The key is eager. It has dreams of being a spoon, but it chose duty.' },
    item_life_ring: { id: 'item_life_ring', type: 'misc', displayName: 'Red Life Ring', stackable: false,
      inspectText: 'A floating circle of institutional safety. The lake demands one. Bureaucracy is hydrodynamic.' },
  },

  dialogue: {
    dlg_maija_intro: {
      setFlag: 'met_maija',
      lines: [
        { speaker: 'Maija', text: 'You smell like sauna smoke and bad decisions.' },
        { speaker: 'Maija', text: 'Take the pipe. Or the beer. Never both at once. That is the law.', critical: true },
        { speaker: 'Maija', text: 'Press E to equip, X to swap. The universe is full of switches.', critical: true },
      ],
    },
    dlg_tarmo_grumble: {
      lines: [
        { speaker: 'Tarmo', text: 'I am fixing the fence. With a HAMMER. It is emotional support construction.' },
        { speaker: 'Tarmo', text: 'Do not stand in the swing zone. The swing zone is everywhere. Sorry!' },
      ],
    },
  },

  // Branching conversation trees (docs/08 npc-template format; Phase 3).
  // Choices may carry conditions {flags/items} — hidden until met (deterministic).
  conversations: {
    conv_maija: {
      start: 'greet',
      nodes: {
        greet: {
          once: true,
          setFlag: 'met_maija',
          lines: [
            { speaker: 'Maija', text: 'You smell like sauna smoke and bad decisions.' },
            { speaker: 'Maija', text: 'Take the pipe. Or the beer. Never both at once. That is the law.', critical: true },
          ],
          choices: [
            { label: '"What is down the forest road?"', goto: 'road' },
            { label: '"Any advice about cats?"', goto: 'cats' },
            { label: 'Nod stoically and leave', hint: 'end' },
          ],
        },
        road: {
          lines: [
            { speaker: 'Maija', text: 'Tarmo. Hammer. Swing zone. That is the whole forecast.' },
            { speaker: 'Maija', text: 'Also mushrooms. If the stove offers you one, it has earned it.', critical: true },
          ],
          choices: [
            { label: '"What about cats?"', goto: 'cats' },
            { label: 'Thank her and go', hint: 'end' },
          ],
        },
        cats: {
          lines: [
            { speaker: 'Maija', text: 'Cats? On the road there is a PACK now. Three of them. Unionized.' },
            { speaker: 'Maija', text: 'Pipe makes noise. Noise makes cats reconsider. Beer makes you reconsider everything.', critical: true },
          ],
          givesItem: [{ item: 'item_berries', count: 1 }],
          choices: [{ label: 'Take the berries she thrusts at you', hint: 'end' }],
        },
      },
    },
    conv_tarmo: {
      start: 'fence',
      nodes: {
        fence: {
          lines: [
            { speaker: 'Tarmo', text: 'I am fixing the fence. With a HAMMER. It is emotional support construction.' },
          ],
          choices: [
            { label: '"Is the swing zone dangerous?"', goto: 'zone' },
            { label: '"Have you met my cat problem?"', goto: 'catbond', conditions: { flags: ['met_cat_pack'] } },
            { label: 'Watch him hammer in respectful silence', hint: 'end' },
          ],
        },
        zone: {
          lines: [
            { speaker: 'Tarmo', text: 'The swing zone is everywhere. Sorry!' },
            { speaker: 'Tarmo', text: 'If I wind up: dodge left, or make loud pipe noise. Do NOT network with me.', critical: true },
          ],
          choices: [
            { label: '"Cat problem? You seem like a cat expert."', goto: 'catbond', conditions: { flags: ['met_cat_pack'] } },
            { label: 'Back away slowly', hint: 'end' },
          ],
        },
        catbond: {
          once: true,
          setFlag: 'tarmo_ally',
          lines: [
            { speaker: 'Tarmo', text: 'CATS?! Tell them Tarmo says the forest is CLOSED for hammer business.' },
            { speaker: 'Tarmo', text: 'Here. Field rye. Ate one myself. Metaphorically. It is a very good rye.' },
          ],
          givesItem: [{ item: 'item_bread', count: 2 }],
          choices: [{ label: 'Shake the hammer-free hand', hint: 'end' }],
        },
      },
    },
  },

  // Perkele cat packs (docs/09): coordinated hazards sharing ONE cooldown.
  packs: {
    pack_forest: {
      howl: 'THE PACK attacks! -2 health. Three tiny warlords, one opinion: you.',
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
      solvedText: 'The stove ticks along contentedly. It has better things to do than re-light itself.',
      successText: 'PUZZLE SOLVED: The stove works! Maija nods from across the yard, trying not to smile.',
      setFlag: 'stove_solved',
      rewardItem: 'item_gate_key',
    },
    puzzle_lake: {
      // Multi-step chain step 2 (docs/07): rowboat needs oars + a life ring.
      intro: 'A rowboat waits on the dock. The far shore is where the story keeps its finale.',
      steps: [
        {
          question: 'The oarlocks are empty. Two candidates lie nearby:',
          choices: ['The sauna bench slats (structurally optimistic)', 'The suspicious stick and its emotional support twin', 'Wish harder'],
          answerIndex: 1,
          correctText: 'The sticks achieve their destiny: official oars. The lake is impressed.',
          wrongText: 'The bench files a formal complaint and stays attached to the wall.',
          hint: 'One of these items has already proven its versatility in puzzles past.',
        },
        {
          question: 'Safety inspection time. What goes in the boat?',
          choices: ['A life ring, obviously', 'More logs "for later"', 'Your doubts'],
          answerIndex: 0,
          correctText: 'Life ring aboard. The water accepts these terms.',
          wrongText: 'The lake rejects your doubt-based flotation theory.',
          conditions: { items: ['item_life_ring'] },
        },
        {
          question: 'Final cast-off: push off with:',
          choices: ['Foot, pole, and commitment', 'Pure beer-fueled confidence', 'Backwards paddle, like a legend'],
          answerIndex: 2,
          correctText: 'You punt off smoothly. The forest gate glitters on the far shore.',
          wrongText: 'The boat spins once, politely dizzy, and returns you to the dock.',
        },
      ],
      solvedText: 'The rowboat rests at the far shore, job complete, emotionally available for one more trip.',
      successText: 'PUZZLE SOLVED: You reach the far shore! The gate looms ahead, mossy and smug.',
      setFlag: 'lake_crossed',
    },
    puzzle_finale: {
      intro: 'The forest gate, now reachable from the lake\'s far shore. A lock shaped like three mushrooms. This is fine.',
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
      setFlag: 'gate_opened', // opens the forest→lakeside exit; finale is now reachable from the far shore
      endingText: '★ EPISODE ONE COMPLETE ★ You survived cats, hammers and your own equipment choices. Row to the sauna on the far shore for the real finale.',
    },
    puzzle_sauna_finale: {
      // Episode One TRUE finale (docs/23 beat 10): safe-room puzzle, zero enemies (docs/07).
      intro: 'The lakeside sauna glows through birch trees. Inside: the Long Bench of Destiny.',
      steps: [
        {
          question: 'The sauna demands one final ritual:',
          choices: ['Settle onto the top bench like it owes you rent', 'Do push-ups for authenticity', 'Ask the stove for life advice'],
          answerIndex: 0,
          correctText: 'The bench receives you the way Finland receives silence: completely.',
          wrongText: 'The sauna politely rejects your cardio energy.',
        },
        {
          question: 'Loyly! Water goes on the stones—',
          choices: ['Exactly one ladle, traditional', 'The whole bucket, maximalist', 'None, save the drama'],
          answerIndex: 0,
          correctText: 'One perfect hiss of steam. The world narrows to warmth and competence.',
          wrongText: 'The stove steams disapprovingly at bucket-based excess.',
        },
        {
          question: 'Roll in the snow, or:',
          choices: ['Roll in the snow — tradition is law', 'Stay inside like a legend', 'Challenge the lake itself'],
          answerIndex: 0,
          correctText: 'Snow contact achieved. Circulation: heroic. Dignity: improved.',
          wrongText: 'The sauna judges your indoor tendencies through the wall.',
        },
      ],
      solvedText: 'The sauna hums, satisfied with you specifically.',
      successText: 'The steam rises in the shape of applause.',
      winGame: true,
      endingText: '★ EPISODE ONE COMPLETE ★ Pipe, beer, cats, hammers, one lake crossing — and finally, the sauna. You did the traditional thing. THE END (for now).',
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
          text: 'The sign says: click glowing things. Clicking non-glowing things is discouraged.',
          surrealText: 'The sign now reads: CLICK ANYTHING. ANARCHY IS TEMPORARY. HYDRATION IS FOREVER.' },
        { id: 'obj_stick', kind: 'item', x: 8, y: 5, label: 'Stick', action: 'take', givesItem: 'item_stick' },
        { id: 'obj_maija', kind: 'npc', x: 5, y: 2, label: 'Maija', action: 'dialogue', conversation: 'conv_maija' },
        { id: 'obj_pipe_case', kind: 'item', x: 3, y: 5, label: 'Pipe case', action: 'inspect',
          text: 'A velvet-lined case hums faintly. Six opinions, packaged for travel.',
          surrealText: 'The case purrs when you look at it sideways. Like a small wooden cat.' },
        { id: 'obj_pipe_take', kind: 'item', x: 3, y: 6, label: 'Take pipe', action: 'take', givesItem: 'item_pipe',
          conditions: { flags: ['met_maija'] }, lockedText: 'Maija holds the case hostage until you say hello.' },
        { id: 'obj_beer_crate', kind: 'item', x: 9, y: 2, label: 'Beer crate', action: 'inspect',
          text: 'A crate of warm ambition. Cold once opened. Probably.',
          surrealText: 'The crate breathes. In. Out. Inside are infinite smaller crates, one of which holds truth.' },
        { id: 'obj_beer_take', kind: 'item', x: 10, y: 2, label: 'Take beer', action: 'take', givesItem: 'item_beer_bottle',
          conditions: { flags: ['met_maija'] }, lockedText: 'The crate is welded shut by narrative pacing.' },
        { id: 'obj_bush', kind: 'item', x: 10, y: 6, label: 'Berry bush', action: 'inspect',
          text: 'Low bushes heavy with berries that dare you.',
          surrealText: 'The bush is holding a meeting. The agenda: you.' },
        { id: 'obj_bush_take', kind: 'item', x: 11, y: 6, label: 'Pick berries', action: 'take', givesItem: 'item_berries' },
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
        { id: 'obj_soap_shelf', kind: 'item', x: 2, y: 3, label: 'Soap shelf', action: 'inspect',
          text: 'One bar of soap on a shelf built for one bar of soap. Purpose achieved.',
          surrealText: 'The soap glows like a relic. A tiny choir. You squint. The choir denies everything.' },
        { id: 'obj_soap_take', kind: 'item', x: 3, y: 3, label: 'Take soap', action: 'take', givesItem: 'item_soap' },
        { id: 'obj_bench', kind: 'prop', x: 7, y: 4, label: 'Bench', action: 'inspect',
          text: 'A wooden bench at two heights. The architecture of relaxation.',
          surrealText: 'Two benches stacked in a time loop. Someone sat here in every timeline.' },
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
        { id: 'obj_cat', kind: 'hazard', x: 9, y: 2, label: 'Perkele Cat', action: 'cat', pack: 'pack_forest' },
        { id: 'obj_cat2', kind: 'hazard', x: 10, y: 1, label: 'Perkele Cat (flanker)', action: 'cat', pack: 'pack_forest' },
        { id: 'obj_cat3', kind: 'hazard', x: 8, y: 4, label: 'Perkele Cat (manager)', action: 'cat', pack: 'pack_forest' },
        { id: 'obj_tarmo', kind: 'npc', x: 4, y: 2, label: 'Tarmo + hammer', action: 'dialogue', conversation: 'conv_tarmo' },
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
          lockedText: 'The mushroom lock wants its key. The sauna stove puzzle had one. Just saying.' },
        { id: 'obj_back_home', kind: 'exit', x: 0, y: 4, label: '← Back to yard', action: 'goto', exit: 'back_yard' },
      ],
      exits: [
        { name: 'back_yard', to: 'scene_moi', spawn: { x: 10, y: 4 } },
        // The solved finale gate opens onto the lakeside shore (docs/10 chain).
        { name: 'to_lakeside', to: 'scene_lakeside', spawn: { x: 2, y: 5 },
          conditions: { flags: ['gate_opened'] }, lockedText: 'The gate is locked. Mushroom locks hate pickpockets.' },
      ],
    },

    // ---------- Lakeside (docs/10 room expansion; multi-step rowboat chain) ----------
    {
      id: 'scene_lakeside',
      displayName: 'Ranta (Lakeside)',
      intro: 'A pale lake stretches out. A rowboat, a dock, and a suspiciously well-rested cat.',
      walk: { width: 12, height: 8, blocked: [[0,0],[11,0],[0,7],[11,7],[9,4],[10,4],[9,5],[10,5]] },
      objects: [
        { id: 'obj_dock', kind: 'puzzle', x: 9, y: 3, label: 'Rowboat at dock', action: 'puzzle', puzzle: 'puzzle_lake',
          conditions: { items: ['item_stick'] },
          lockedText: 'The rowboat needs oars. Somewhere a stick dreams of promotion.' },
        { id: 'obj_ring', kind: 'item', x: 4, y: 2, label: 'Life ring', action: 'take', givesItem: 'item_life_ring' },
        { id: 'obj_cat4', kind: 'hazard', x: 6, y: 1, label: 'Lakeside Perkele Cat', action: 'cat' },
        { id: 'obj_berry2', kind: 'item', x: 2, y: 6, label: 'Lingonberry bush', action: 'take', givesItem: 'item_berries' },
        { id: 'obj_back_gate', kind: 'exit', x: 1, y: 5, label: '← Through the gate', action: 'goto', exit: 'back_gate' },
        { id: 'obj_aittasauna', kind: 'puzzle', x: 10, y: 2, label: 'Aittasauna (lakeside sauna)', action: 'puzzle', puzzle: 'puzzle_sauna_finale' },
        { id: 'obj_sauna_shore', kind: 'exit', x: 11, y: 6, label: 'Sauna side door →', action: 'goto', exit: 'to_sauna_side' },
      ],
      exits: [
        { name: 'back_gate', to: 'scene_forest', spawn: { x: 12, y: 4 } },
        { name: 'to_sauna_side', to: 'scene_sauna', spawn: { x: 8, y: 5 } },
      ],
    },
  ],
};
