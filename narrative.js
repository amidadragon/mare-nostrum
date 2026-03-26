// ═══════════════════════════════════════════════════════════════════════════
// ─── NARRATIVE ENGINE — "THE LEGACY OF ROME" ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// Loaded before sketch.js — provides quest data, NPC dialogue, lore tablets

// ─── MAIN QUEST CHAIN (10 chapters) ─────────────────────────────────────
const MAIN_QUEST_CHAPTERS = [
  {
    id: 'awakening', title: 'I — Awakening',
    desc: 'Survive the wreck. Find a way to the inhabited island.',
    objectives: [
      { id: 'scavenge_wreck', desc: 'Scavenge supplies from the wreck', check: () => state.wood >= 2 && state.stone >= 1 },
      { id: 'repair_trireme', desc: 'Repair the trireme enough to sail', check: () => state.progression && state.progression.triremeRepaired },
      { id: 'reach_home', desc: 'Reach the home island', check: () => state.progression && state.progression.homeIslandReached },
    ],
    reward: { gold: 5, seeds: 5 },
    journalOnComplete: 'mq_awakening',
    dialogueOnComplete: { npc: 'livia', line: "You made it. I watched your trireme limp in — thought Neptune himself spat you out. Welcome to the edge of the world." },
  },
  {
    id: 'first_harvest', title: 'II — The First Harvest',
    desc: 'Prove you can survive. Grow food, build shelter.',
    objectives: [
      { id: 'plant_crops', desc: 'Plant 3 crops', check: () => state.plots.filter(p => p.planted).length >= 3 },
      { id: 'harvest_5', desc: 'Harvest 5 times', counter: 'mq_harvested', target: 5 },
      { id: 'build_3', desc: 'Build 3 structures', counter: 'mq_built', target: 3 },
    ],
    reward: { gold: 15, seeds: 8, crystals: 2 },
    journalOnComplete: 'mq_first_harvest',
    dialogueOnComplete: { npc: 'livia', line: "Look at those fields. Golden as a senator's villa. You belong here — I knew it the moment I saw you pull that first weed." },
  },
  {
    id: 'livias_secret', title: "III — Livia's Secret",
    desc: "Livia has something to tell you. Reach 4 hearts with her.",
    objectives: [
      { id: 'livia_hearts_4', desc: 'Reach 4 hearts with Livia', check: () => state.npc.hearts >= 4 },
      { id: 'find_scroll', desc: 'Find the hidden scroll near the ruins', interact: 'livia_scroll' },
      { id: 'return_to_livia', desc: 'Return the scroll to Livia', interact: 'livia_scroll_return' },
    ],
    reward: { gold: 25, crystals: 5 },
    journalOnComplete: 'mq_livias_secret',
    dialogueOnComplete: { npc: 'livia', line: "Now you know. My father was Senator Aurelius. They accused him of treason — me too, by blood. This island is my prison and my salvation. Please... keep my secret." },
  },
  {
    id: 'marcus_honor', title: "IV — Marcus's Honor",
    desc: "Help Marcus find his lost legion's standard, hidden on Terra Nova.",
    objectives: [
      { id: 'marcus_hearts_3', desc: 'Reach 3 hearts with Marcus', check: () => state.marcus && state.marcus.hearts >= 3 },
      { id: 'expedition_3', desc: 'Complete 3 expeditions to Terra Nova', counter: 'mq_expeditions', target: 3 },
      { id: 'find_standard', desc: 'Find the legion standard (rare drop)', counter: 'mq_standard_found', target: 1 },
    ],
    reward: { gold: 40, ironOre: 5, ancientRelic: 1 },
    journalOnComplete: 'mq_marcus_honor',
    dialogueOnComplete: { npc: 'marcus', line: "The eagle... LEG IX FID. My grandfather carried this into Caledonia. They said the Ninth vanished. They didn't vanish — they came here. And now their standard flies again." },
  },
  {
    id: 'crystal_prophet', title: 'V — The Crystal Prophet',
    desc: "Vesta's visions grow stronger. The crystals warn of danger.",
    objectives: [
      { id: 'vesta_hearts_4', desc: 'Reach 4 hearts with Vesta', check: () => state.vesta && state.vesta.hearts >= 4 },
      { id: 'gather_crystals_20', desc: 'Gather 20 crystals total', counter: 'mq_crystals_gathered', target: 20 },
      { id: 'activate_shrine', desc: 'Pray at the crystal shrine during a storm', interact: 'storm_prayer' },
    ],
    reward: { crystals: 10, gold: 30 },
    journalOnComplete: 'mq_crystal_prophet',
    dialogueOnComplete: { npc: 'vesta', line: "I saw it — clear as the morning star. A darkness stirs beneath the western sea. The crystals scream when it moves. We must prepare. The old gods demand it." },
  },
  {
    id: 'taming_terra', title: 'VI — Taming Terra Nova',
    desc: 'Conquer and colonize the wild island.',
    objectives: [
      { id: 'colonize_terra', desc: 'Colonize Terra Nova', check: () => state.conquest.colonized },
      { id: 'colony_level_3', desc: 'Reach colony level 3', check: () => state.conquest.colonyLevel >= 3 },
      { id: 'bridge_built', desc: 'Build the Imperial Bridge', check: () => state.imperialBridge.built },
    ],
    reward: { gold: 60, ironOre: 8, rareHide: 5 },
    journalOnComplete: 'mq_taming_terra',
    dialogueOnComplete: { npc: 'livia', line: "Two islands, one people. My father dreamed of expansion without bloodshed. You've done what he could not — built an empire on trust, not steel." },
  },
  // Old expedition island quests removed
  {
    id: 'mare_nostrum', title: 'X — Mare Nostrum',
    desc: 'Unite all islands. Build the final bridge. Become Imperator.',
    objectives: [
      { id: 'island_25', desc: 'Reach island level 25', check: () => state.islandLevel >= 25 },
      { id: 'all_hearts_max', desc: 'Full hearts with all NPCs', check: () => state.npc.hearts >= 10 && state.marcus && state.marcus.hearts >= 10 && state.vesta && state.vesta.hearts >= 10 && state.felix && state.felix.hearts >= 10 },
      { id: 'final_ceremony', desc: 'Perform the Rite of Mare Nostrum', interact: 'rite_mare_nostrum' },
    ],
    reward: { gold: 200 },
    journalOnComplete: 'mq_mare_nostrum',
    dialogueOnComplete: { npc: 'livia', line: "Imperator. Not by conquest — by love. By grain and stone and stubborn hope. Rome would not understand. But the gods do. And so do I." },
  },
];

// ─── NPC PERSONAL QUEST CHAINS (3 quests per NPC) ──────────────────────
const NPC_QUEST_CHAINS = {
  livia: [
    {
      id: 'livia_q1', title: "Livia's Garden",
      desc: 'Plant 5 crops for Livia.',
      requirement: { hearts: 2 },
      objectives: [{ id: 'plant_5_livia', desc: 'Plant 5 crops', counter: 'nq_livia_planted', target: 5 }],
      reward: { gold: 10, seeds: 10 },
      dialogueStart: "I had a garden in Rome — roses and jasmine along a marble wall. Could you plant something near the villa? Not roses... grain. Something honest.",
      dialogueEnd: "You remembered. The smell of fresh earth... it takes me back to mornings in my father's garden. Before the accusations. Before everything. Thank you.",
    },
    {
      id: 'livia_q2', title: "Wine of Exile",
      desc: 'Bring Livia 3 wine for a ceremony.',
      requirement: { hearts: 5, prevQuest: 'livia_q1' },
      objectives: [{ id: 'wine_3_livia', desc: 'Bring 3 wine', check: () => state.wine >= 3 }],
      reward: { gold: 25, crystals: 3 },
      dialogueStart: "My father's birthday approaches. In Rome, we would pour wine at his feet and speak his name to the sky. Will you bring me wine?",
      dialogueEnd: "Gaius Aurelius. Senator. Father. Exile. May the wine reach you wherever you rest. ...I never cry. Don't look at me like that.",
      consumeItems: { wine: 3 },
    },
    {
      id: 'livia_q3', title: "Letters to Rome",
      desc: "Help Livia write a letter to her sister.",
      requirement: { hearts: 8, prevQuest: 'livia_q2' },
      objectives: [
        { id: 'parchment_mats', desc: 'Gather materials (5 wood, 3 harvest)', check: () => state.wood >= 5 && state.harvest >= 3 },
        { id: 'deliver_letter', desc: 'Give the letter to the merchant ship', interact: 'livia_letter' },
      ],
      reward: { gold: 50 },
      dialogueStart: "I have a sister. Claudia. She thinks I'm dead. I need parchment... bark and grain to make pulp. Will you help?",
      dialogueEnd: "The merchant will carry it past the Pillars of Hercules to Rome. She may never receive it. But I had to try. Some words must be spoken, even into wind.",
      consumeItems: { wood: 5, harvest: 3 },
    },
  ],
  marcus: [
    {
      id: 'marcus_q1', title: "The Soldier's Blade",
      desc: "Bring iron and wood to repair Marcus's gladius.",
      requirement: { hearts: 2 },
      objectives: [{ id: 'marcus_blade_mats', desc: 'Bring 3 iron ore and 4 wood', check: () => state.ironOre >= 3 && state.wood >= 4 }],
      reward: { gold: 15, ironOre: 2 },
      dialogueStart: "My gladius is notched to ruin. Twenty years of service and the blade is tired — like me. A soldier without a blade is just a man.",
      dialogueEnd: "Listen to that ring. Sharp as the day I earned it. 'FIDES' stamped on every legion blade. Faith. I'd forgotten what that felt like.",
      consumeItems: { ironOre: 3, wood: 4 },
    },
    {
      id: 'marcus_q2', title: "Ghost Patrol",
      desc: "Kill 15 enemies on Terra Nova for Marcus.",
      requirement: { hearts: 5, prevQuest: 'marcus_q1' },
      objectives: [{ id: 'kill_15', desc: 'Defeat 15 enemies on Terra Nova', counter: 'nq_marcus_kills', target: 15 }],
      reward: { gold: 30, rareHide: 3, titanBone: 2 },
      dialogueStart: "Something's moving in the western forest. If we don't patrol, they'll find us. I need you on the line with me.",
      dialogueEnd: "Quiet. Finally quiet. You fight like a true soldier — no wasted motion. Whoever trained you did it right.",
    },
    {
      id: 'marcus_q3', title: "The Centurion's Toast",
      desc: "Bring 5 meals and 2 wine for a memorial feast.",
      requirement: { hearts: 8, prevQuest: 'marcus_q2' },
      objectives: [{ id: 'ceremony_food', desc: 'Bring 5 meals and 2 wine', check: () => state.meals >= 5 && state.wine >= 2 }],
      reward: { gold: 50, ancientRelic: 1 },
      dialogueStart: "A contubernium feast — eight places set, seven empty. For the men who didn't make it. We eat, we drink, we speak their names.",
      dialogueEnd: "Titus. Gaius. Publius. Septimus. Decimus. Servius. Lucius. Seven cups, seven names. Rest well, brothers. The watch continues.",
      consumeItems: { meals: 5, wine: 2 },
    },
  ],
  vesta: [
    {
      id: 'vesta_q1', title: "Rekindling the Flame",
      desc: "Bring 5 crystals to relight the sacred flame.",
      requirement: { hearts: 2 },
      objectives: [{ id: 'vesta_crystals', desc: 'Bring 5 crystals', check: () => state.crystals >= 5 }],
      reward: { gold: 10, crystals: 8 },
      dialogueStart: "The sacred flame must never die. Yet mine was drowned by the storm. These crystals hold Sol's warmth. Five should be enough.",
      dialogueEnd: "See how it burns without fuel? That is not fire — it is memory. Three centuries of whispered hopes, burning bright again.",
      consumeItems: { crystals: 5 },
    },
    {
      id: 'vesta_q2', title: "Star Map",
      desc: "Observe the sky for 3 nights for Vesta.",
      requirement: { hearts: 5, prevQuest: 'vesta_q1' },
      objectives: [{ id: 'night_observations', desc: 'Observe stars at night (3 nights)', counter: 'nq_vesta_nights', target: 3 }],
      reward: { gold: 20, crystals: 5 },
      dialogueStart: "The constellations have shifted. I need three nights of observation — stand on the high ground after dark.",
      dialogueEnd: "Orion moved twelve degrees. We are not where Rome thinks we are. These islands drift. The crystals are anchors.",
    },
    {
      id: 'vesta_q3', title: "The God's Question",
      desc: "Pray at the shrine at dawn, answer the riddle.",
      requirement: { hearts: 8, prevQuest: 'vesta_q2' },
      objectives: [
        { id: 'pray_dawn', desc: 'Pray at the shrine at dawn (5:30-6:30)', interact: 'dawn_prayer' },
        { id: 'answer_riddle', desc: 'Answer the riddle', interact: 'oracle_riddle' },
      ],
      reward: { gold: 40, crystals: 10 },
      dialogueStart: "Sol Invictus has spoken. Go to the shrine at dawn, when his light first touches the crystal. He will ask. You must answer.",
      dialogueEnd: "You answered well. Not correctly — there is no correct answer to a god's question. But honestly. He judges our willingness to stand and speak.",
    },
  ],
  felix: [
    {
      id: 'felix_q1', title: "The Library Fund",
      desc: "Bring 8 stone and 6 wood for Felix's library.",
      requirement: { hearts: 2 },
      objectives: [{ id: 'library_mats', desc: 'Bring 8 stone and 6 wood', check: () => state.stone >= 8 && state.wood >= 6 }],
      reward: { gold: 15, seeds: 5 },
      dialogueStart: "Seventeen scrolls need a home. Stone walls for damp, wooden shelves for scrolls. The cats need reading nooks. Non-negotiable.",
      dialogueEnd: "Not Alexandria. Better — the Library of Us. No politics, no censors, no burning. Just knowledge and cats.",
      consumeItems: { stone: 8, wood: 6 },
    },
    {
      id: 'felix_q2', title: "The Translation",
      desc: "Find 5 lore tablets to help Felix translate an inscription.",
      requirement: { hearts: 5, prevQuest: 'felix_q1' },
      objectives: [{ id: 'tablets_for_felix', desc: 'Find 5 lore tablets', check: () => state.loreTablets && state.loreTablets.filter(t => t.found).length >= 5 }],
      reward: { gold: 30, ancientRelic: 1 },
      dialogueStart: "An inscription in the deep ruins — Pre-Republican, possibly Etruscan. The lore tablets use the same script. Find enough and I can crack it.",
      dialogueEnd: "It reads: 'We came from the burning city to the floating stones. We traded steel for crystal, war for wonder.' They were refugees. Like us.",
    },
    {
      id: 'felix_q3', title: "Felix's Manuscript",
      desc: "Help Felix finish his magnum opus.",
      requirement: { hearts: 8, prevQuest: 'felix_q2' },
      objectives: [
        { id: 'manuscript_mats', desc: 'Bring 3 harvest and 4 wood', check: () => state.harvest >= 3 && state.wood >= 4 },
        { id: 'read_manuscript', desc: 'Read the finished manuscript', interact: 'read_manuscript' },
      ],
      reward: { gold: 50, crystals: 5 },
      dialogueStart: "Seventy-three chapters, two appendices, cat index. I need oak-gall ink. And then... I need someone to read it.",
      dialogueEnd: "You read it. All of it. Even the footnotes. Page one: 'For the one who built a world and then stopped to read about it.' I'm not crying. Ink fumes.",
      consumeItems: { harvest: 3, wood: 4 },
    },
  ],
};

// ─── NPC GIFT PREFERENCES ───────────────────────────────────────────────
const NPC_GIFT_PREFS = {
  livia: {
    loved: ['wine', 'oil'], liked: ['meals', 'harvest'], disliked: ['fish', 'stone'],
    loveResp: "Oh! My favorite. You remembered.", likeResp: "That's kind of you. Truly.", dislikeResp: "I... appreciate the thought.",
  },
  marcus: {
    loved: ['fish', 'meals'], liked: ['wine', 'ironOre'], disliked: ['seeds', 'harvest'],
    loveResp: "Now that's a proper gift.", likeResp: "Not bad. I'll take it.", dislikeResp: "What am I supposed to do with this?",
  },
  vesta: {
    loved: ['crystals'], liked: ['oil', 'harvest'], disliked: ['fish', 'wood'],
    loveResp: "The crystal sings in my hands. Sacred.", likeResp: "The temple accepts your offering.", dislikeResp: "The gods are... politely unimpressed.",
  },
  felix: {
    loved: ['oil', 'wine'], liked: ['meals', 'harvest'], disliked: ['ironOre', 'stone'],
    loveResp: "Brain fuel! Three chapters tonight.", likeResp: "Sustenance! The scholar endures.", dislikeResp: "What am I, a mason?",
  },
};

function getGiftMultiplier(npcName, giftType) {
  let prefs = NPC_GIFT_PREFS[npcName];
  if (!prefs) return 1;
  if (prefs.loved.includes(giftType)) return 2;
  if (prefs.liked.includes(giftType)) return 1;
  if (prefs.disliked.includes(giftType)) return 0.5;
  return 1;
}

function getGiftResponse(npcName, giftType) {
  let prefs = NPC_GIFT_PREFS[npcName];
  if (!prefs) return null;
  if (prefs.loved.includes(giftType)) return prefs.loveResp;
  if (prefs.disliked.includes(giftType)) return prefs.dislikeResp;
  return prefs.likeResp;
}

// ─── NPC DAILY WANTS — seeded per real-world day ───
const DAILY_WANTS = {
  livia: [
    { type: 'gift', resource: 'harvest', label: 'Livia wants fresh produce today' },
    { type: 'gift', resource: 'fish', label: 'Livia craves fresh fish' },
    { type: 'gift', resource: 'harvest', label: 'Livia needs grain for bread' },
    { type: 'favor', zone: 'temple', label: 'Livia asks you to pray at the temple' },
    { type: 'favor', zone: 'ruins', label: 'Livia wants you to explore the ruins' },
    { type: 'activity', action: 'lyre', label: 'Livia wants to hear the lyre' },
    { type: 'gift', resource: 'crystals', label: 'Livia seeks a crystal shard' },
    { type: 'activity', action: 'sunset', label: 'Livia wants to watch the sunset together' },
  ],
  marcus: [
    { type: 'gift', resource: 'fish', label: 'Marcus wants fish for the troops' },
    { type: 'gift', resource: 'wood', label: 'Marcus needs timber for repairs' },
    { type: 'gift', resource: 'stone', label: 'Marcus wants stone for the walls' },
    { type: 'favor', zone: 'castrum', label: 'Marcus asks you to inspect the barracks' },
    { type: 'favor', zone: 'castrum', label: 'Marcus wants you to train at the barracks' },
    { type: 'activity', action: 'spar', label: 'Marcus challenges you to spar' },
    { type: 'gift', resource: 'ironOre', label: 'Marcus needs iron for weapons' },
    { type: 'activity', action: 'patrol', label: 'Marcus wants you to patrol the shore' },
  ],
  vesta: [
    { type: 'gift', resource: 'harvest', label: 'Vesta wants fresh vegetables' },
    { type: 'gift', resource: 'seeds', label: 'Vesta needs seeds for the garden' },
    { type: 'gift', resource: 'harvest', label: 'Vesta seeks an offering of grain' },
    { type: 'favor', zone: 'farm', label: 'Vesta asks you to tend the crops' },
    { type: 'favor', zone: 'shrine', label: 'Vesta wants you to visit the crystal shrine' },
    { type: 'activity', action: 'cook', label: 'Vesta wants to cook together' },
    { type: 'gift', resource: 'fish', label: 'Vesta wants fish for Garum sauce' },
    { type: 'activity', action: 'stargaze', label: 'Vesta invites you to stargaze tonight' },
  ],
  felix: [
    { type: 'gift', resource: 'gold', label: 'Felix wants gold for his maps' },
    { type: 'gift', resource: 'wood', label: 'Felix needs planks for the dock' },
    { type: 'gift', resource: 'fish', label: 'Felix craves a fresh catch' },
    { type: 'favor', zone: 'port', label: 'Felix asks you to check the harbor' },
    { type: 'favor', zone: 'diving', label: 'Felix wants you to dive for relics' },
    { type: 'activity', action: 'lyre', label: 'Felix wants sea shanties on the lyre' },
    { type: 'gift', resource: 'stone', label: 'Felix needs ballast stones' },
    { type: 'activity', action: 'sail', label: 'Felix wants to sail together' },
  ],
};

// Get today's want for an NPC — deterministic seed from real-world day
function getDailyWant(npcName) {
  let pool = DAILY_WANTS[npcName];
  if (!pool || pool.length === 0) return null;
  let daySeed = Math.floor(Date.now() / 86400000);
  // Each NPC gets a different offset so they don't all want the same type
  let npcOffset = { livia: 0, marcus: 3, vesta: 5, felix: 7 }[npcName] || 0;
  let idx = (daySeed + npcOffset) % pool.length;
  let want = Object.assign({}, pool[idx]);
  // Replace hardcoded Roman name with faction-appropriate name
  if (typeof getNPCDisplayName === 'function' && want.label) {
    let romeName = npcName.charAt(0).toUpperCase() + npcName.slice(1);
    let facName = getNPCDisplayName(npcName);
    if (facName !== romeName) want.label = want.label.replace(romeName, facName);
  }
  return want;
}

// ─── FELIX + LIVIA RELATIONSHIP SCENE ───
// Triggers: Chapter 6+, hearts >= 8 with both Felix AND Livia
// One-time: state.narrativeFlags.felixLiviaSceneShown
const FELIX_LIVIA_SCENE = {
  trigger: {
    minChapter: 6,
    minHeartsFelix: 8,
    minHeartsLivia: 8,
    flag: 'felixLiviaSceneShown',
  },
  lines: [
    { speaker: 'livia', text: "You're still carrying that wax tablet." },
    { speaker: 'felix', text: "Force of habit. A man records what he can't afford to forget." },
    { speaker: 'livia', text: "In Rome... you could have just walked away." },
    { speaker: 'felix', text: "And let them take you? Not while I still had legs." },
    { speaker: 'livia', text: "I never said —" },
    { speaker: 'felix', text: "I know. Neither did I. Now we're even." },
  ],
  rewards: {
    heartBonus: 1,        // +1 heart to both Felix and Livia (if below max)
    loreEntry: {
      id: 'unspoken_debt',
      title: 'The Unspoken Debt',
      text: 'Before the exile, Felix was a court scribe. When the Praetorians came for Livia — a senator\'s daughter who spoke too freely — Felix forged documents that bought her one night to escape. He never told her. She always knew.',
    },
  },
};

// Check if Felix+Livia scene should trigger
function shouldTriggerFelixLiviaScene(state) {
  if (!state || !state.narrativeFlags) return false;
  if (state.narrativeFlags[FELIX_LIVIA_SCENE.trigger.flag]) return false;
  let ch = state.chapter || 0;
  if (ch < FELIX_LIVIA_SCENE.trigger.minChapter) return false;
  // Check hearts — need to find how hearts are stored
  // Hearts might be state.npc.hearts for Livia, state.marcusHearts, etc.
  // This will be called from sketch.js which knows the exact state shape
  return true; // sketch.js will do the final hearts check
}

// Get the scene lines
function getFelixLiviaLines() {
  return FELIX_LIVIA_SCENE.lines;
}

function getFelixLiviaRewards() {
  return FELIX_LIVIA_SCENE.rewards;
}

// ─── FAVOR LEGACY DIALOGUE — unlocked at favor milestones ───
const FAVOR_DIALOGUE = {
  livia: {
    10: "You know... I stopped counting the sunsets. They all belong to us now.",
    20: "My father would have liked you. He valued constancy above all things.",
    30: "If Rome could see what we built here, they would weep. Not from envy. From recognition.",
  },
  marcus: {
    10: "I trained a thousand soldiers. You're the only one I'd follow into the dark.",
    20: "The walls I build now aren't to keep enemies out. They're to keep this feeling in.",
    30: "When I close my eyes, I don't see Rome anymore. I see this. That's enough.",
  },
  vesta: {
    10: "The gods speak in harvest rhythms. You've learned to listen. That is rare.",
    20: "I dreamed of the old temple last night. It was smaller than I remembered. Ours is better.",
    30: "There is a prayer I saved for the one who would rebuild the world. I think it's time I said it.",
  },
  felix: {
    10: "I've mapped every coastline I could see. None of them lead back to what we were. Good.",
    20: "You know what the sea taught me? That the only shore worth reaching is the one you chose.",
    30: "I'll tell you a secret. I stopped looking for a way home the day you built the dock.",
  },
};

function getFavorDialogue(npcName, favorLevel) {
  let lines = FAVOR_DIALOGUE[npcName];
  if (!lines) return null;
  // Return the highest unlocked line
  let thresholds = [30, 20, 10];
  for (let t of thresholds) {
    if (favorLevel >= t && lines[t]) return { threshold: t, text: lines[t] };
  }
  return null;
}

// ─── RELATIONSHIP MILESTONES ────────────────────────────────────────────
const RELATIONSHIP_TIERS = [
  { hearts: 0, title: 'Stranger', color: '#888888' },
  { hearts: 3, title: 'Friend', color: '#88cc44' },
  { hearts: 6, title: 'Confidant', color: '#44aaff' },
  { hearts: 10, title: 'Soulmate', color: '#ff88cc' },
];

function getRelationshipTier(hearts) {
  let tier = RELATIONSHIP_TIERS[0];
  for (let t of RELATIONSHIP_TIERS) { if (hearts >= t.hearts) tier = t; }
  return tier;
}

// ─── EXPANDED NPC DIALOGUE — 20 lines each, conditional ─────────────────
const LIVIA_DIALOGUE_POOL = [
  { text: "Ave, stranger. The grain ripens beautifully, no?", minH: 0, maxH: 3 },
  { text: "Venus herself blessed this isle. I feel it in the warm breeze.", minH: 0, maxH: 3 },
  { text: "You have the hands of a worker. Good. We need workers, not talkers.", minH: 0, maxH: 3 },
  { text: "I don't speak of my past. Don't ask.", minH: 0, maxH: 3 },
  { text: "The cypress sway like dancers at a feast I'll never attend again.", minH: 0, maxH: 4 },
  { text: "You keep coming back. I... don't mind that.", minH: 3, maxH: 7 },
  { text: "My father taught me to read the stars. Some nights I still look for Rome.", minH: 3, maxH: 7 },
  { text: "Bring me grain and I'll share wine under the cypress. Fair trade, no?", minH: 3, maxH: 7 },
  { text: "I dreamed of marble halls last night. Woke to birdsong. I prefer the birdsong.", minH: 3, maxH: 7 },
  { text: "Marcus thinks I'm too soft on you. Marcus can mind his own century.", minH: 3, maxH: 7, requires: { npc: 'marcus', minHearts: 2 } },
  { text: "When storms come, I think of the night my ship went down. Then I hear you building.", minH: 4, maxH: 7 },
  { text: "The trireme that brought me here is buried on the north shore. I visit sometimes.", minH: 4, maxH: 7 },
  { text: "I was betrothed once. To a man who traded me for political favor. You're nothing like him.", minH: 7, maxH: 11 },
  { text: "Stay. Not because I need you — because I want you here. There's a difference.", minH: 7, maxH: 11 },
  { text: "My heart races when you bring gifts. What can I say... I am weak for honest men.", minH: 7, maxH: 11 },
  { text: "If Rome sent a ship tomorrow, I would not board it. This is home. You are home.", minH: 8, maxH: 11 },
  { text: "I told Vesta about us. She smiled and said the stars already knew.", minH: 8, maxH: 11, requires: { npc: 'vesta', minHearts: 4 } },
  { text: "The dawn here is softer than Rome's. No roosters, no senators. Just light.", minH: 2, maxH: 11, timeMin: 300, timeMax: 420 },
  { text: "The sunset paints the water gold. Sit with me. Just... sit.", minH: 4, maxH: 11, timeMin: 1080, timeMax: 1260 },
  { text: "Can't sleep either? The stars are magnificent tonight. I see Orion.", minH: 3, maxH: 11, timeMin: 1320, timeMax: 300 },
];

const MARCUS_DIALOGUE_POOL = [
  { text: "Looking to trade? I don't do charity.", minH: 0, maxH: 3 },
  { text: "These waters are tricky. I've sailed worse, but not by much.", minH: 0, maxH: 3 },
  { text: "Don't touch the merchandise. Point and I'll hand it to you.", minH: 0, maxH: 3 },
  { text: "I had a ship. Three-masted. Fortuna. Don't ask what happened.", minH: 0, maxH: 4 },
  { text: "Your island's got potential. Not that I care. Gold is what I care about.", minH: 0, maxH: 3 },
  { text: "Been soldiering twenty years. The shield wall is the only honest thing left.", minH: 0, maxH: 4 },
  { text: "Your fishing's improving. I've been watching.", minH: 3, maxH: 7 },
  { text: "I carved Fortuna's name into the dock. Old superstition. Works, though.", minH: 3, maxH: 7 },
  { text: "The octopus here are cunning. Like senators, but more honest.", minH: 3, maxH: 7 },
  { text: "I don't sleep well. Never have. The watch changes, but the watchman stays.", minH: 3, maxH: 7 },
  { text: "Livia's wine isn't bad. Don't tell her I said that.", minH: 4, maxH: 7, requires: { npc: 'livia', minHearts: 3 } },
  { text: "Felix asked me to read his book. I said I would. Lying gets easier with age.", minH: 4, maxH: 7, requires: { npc: 'felix', minHearts: 3 } },
  { text: "I'm building a stall. Permanent. Don't make a fuss about it.", minH: 7, maxH: 11 },
  { text: "I used to dream about Fortuna sinking. Not anymore. Now I dream about this dock.", minH: 7, maxH: 11 },
  { text: "I'm staying because I'm tired of leaving. That's it. No poetry.", minH: 7, maxH: 11 },
  { text: "You're the closest thing to a brother I've had since the legion. Don't die.", minH: 8, maxH: 11 },
  { text: "Sharpened my blade this morning. Not for trouble. Because I want to be ready for you.", minH: 9, maxH: 11 },
  { text: "Morning patrol. Everything quiet. That's how I like it.", minH: 2, maxH: 11, timeMin: 300, timeMax: 480 },
  { text: "Night watch. Stars and silence. A soldier's favorite company.", minH: 3, maxH: 11, timeMin: 1320, timeMax: 300 },
  { text: "Storm coming. I feel it in the scar on my shoulder. Never wrong.", minH: 2, maxH: 11, weather: 'rain' },
];

const VESTA_DIALOGUE_POOL = [
  { text: "The temple welcomes all seekers. I am Vesta. I tend the flame.", minH: 0, maxH: 3 },
  { text: "You carry the scent of the mainland. It fades, in time.", minH: 0, maxH: 3 },
  { text: "The crystals are the island's memory. Handle them with reverence.", minH: 0, maxH: 3 },
  { text: "Time moves differently here. You've noticed, haven't you?", minH: 0, maxH: 3 },
  { text: "I speak with the stars. They speak back. Most think me mad.", minH: 0, maxH: 4 },
  { text: "Pray when you feel lost. The answer won't come immediately. But it will.", minH: 1, maxH: 4 },
  { text: "I was a potter's daughter before I was a priestess. My hands still remember clay.", minH: 3, maxH: 7 },
  { text: "I dreamed of this island for seven years before I found it.", minH: 3, maxH: 7 },
  { text: "The crystals sing if you hold them long enough. A low tone, like a mother humming.", minH: 3, maxH: 7 },
  { text: "The island has moods. Today it's contemplative. Can you feel it?", minH: 3, maxH: 7 },
  { text: "Marcus asked me to bless his sword. I blessed his hands instead. He didn't notice.", minH: 4, maxH: 7, requires: { npc: 'marcus', minHearts: 3 } },
  { text: "Felix catalogues the world. I feel it. Both are true. Neither is complete.", minH: 4, maxH: 7, requires: { npc: 'felix', minHearts: 3 } },
  { text: "This island was lifted by an act of love. Not metaphor — literal love, crystallized.", minH: 7, maxH: 11 },
  { text: "The temple is changing. The columns straighten when no one watches.", minH: 7, maxH: 11 },
  { text: "The crystals are the god's tears. Or their laughter. I've never been sure.", minH: 7, maxH: 11 },
  { text: "Take this flame. It will never go out. Like the love that raised this island.", minH: 8, maxH: 11 },
  { text: "I have seen your death in the stars. It is very, very far away. You are safe.", minH: 9, maxH: 11 },
  { text: "Dawn prayer. The crystals catch first light and scatter it like tiny suns.", minH: 2, maxH: 11, timeMin: 300, timeMax: 420 },
  { text: "Midnight. The flame burns bluest now. Secrets are easiest to hear.", minH: 4, maxH: 11, timeMin: 0, timeMax: 120 },
  { text: "The rain feeds the crystals. Listen — they're drinking.", minH: 2, maxH: 11, weather: 'rain' },
];

const FELIX_DIALOGUE_POOL = [
  { text: "Don't touch the scrolls! ...Sorry. Reflex.", minH: 0, maxH: 3 },
  { text: "I'm Felix. Former senator, current researcher. Happily demoted.", minH: 0, maxH: 3 },
  { text: "These ruins are Pre-Republican. The stonework suggests Etruscan influence.", minH: 0, maxH: 3 },
  { text: "I came to study simplicity. Instead I found cats. Acceptable substitute.", minH: 0, maxH: 3 },
  { text: "That grey cat? Minerva. She ignores me. Accurately named.", minH: 0, maxH: 4 },
  { text: "Livia brings me food because she thinks I forget to eat. She's correct.", minH: 1, maxH: 4, requires: { npc: 'livia', minHearts: 1 } },
  { text: "I was a terrible senator. I kept proposing library funding. In Rome, that's treason.", minH: 3, maxH: 7 },
  { text: "They laughed at my cat sanctuary proposal. History will vindicate me.", minH: 3, maxH: 7 },
  { text: "Rewriting my manuscript. Title: 'The Song of Floating Stones.' Chapter one is all cats.", minH: 3, maxH: 7 },
  { text: "The calico brought me a dead mouse. In cat society, that's a doctorate.", minH: 3, maxH: 7 },
  { text: "Marcus offered to proofread. I'd rather feed the manuscript to gulls.", minH: 4, maxH: 7, requires: { npc: 'marcus', minHearts: 3 } },
  { text: "Vesta says the ruins have memory. I say architecture. We're both right.", minH: 4, maxH: 7, requires: { npc: 'vesta', minHearts: 3 } },
  { text: "The library is built. Books shelved. Cats claimed every corner. Perfect.", minH: 7, maxH: 11 },
  { text: "My manuscript is finished. I dedicated it to the island. And to you.", minH: 7, maxH: 11 },
  { text: "I thought I came to study simplicity. The most complex thing I found was friendship.", minH: 7, maxH: 11 },
  { text: "The cats are wearing togas now. I categorically deny involvement.", minH: 8, maxH: 11 },
  { text: "Forty rooms in my Roman villa. Miserable. One room here, scrolls and cats. Bliss.", minH: 8, maxH: 11 },
  { text: "Morning light through the ruin arches. Best reading conditions.", minH: 2, maxH: 11, timeMin: 360, timeMax: 540 },
  { text: "Writing by candlelight. The cats are asleep. Peak scholarship.", minH: 3, maxH: 11, timeMin: 1260, timeMax: 120 },
  { text: "Rain day. Perfect for research. The scrolls disagree but they'll dry.", minH: 2, maxH: 11, weather: 'rain' },
];

// ─── MAX HEARTS ENDGAME DIALOGUE — keeps NPCs alive at full friendship ──
const LIVIA_MAX_DIALOGUE = [
  "I found wild thyme by the cliff today. Smelled like the garden in Rome. I kept some for you.",
  "Do you ever think about what we'd be doing if none of this happened? I don't. Not anymore.",
  "The olive tree by the villa is bearing fruit. Our first harvest together. I saved the biggest one.",
  "I wrote your name in the margin of my father's scroll. He would have approved.",
  "Sometimes I stand at the dock and watch the horizon. Not waiting for rescue. Just... watching. With you.",
  "The cats have claimed the sunny spot by the amphora again. I've given up fighting them.",
  "I made extra bread today. Take some. No, take it. I insist.",
  "The wind changed direction today. It smells like cinnamon from somewhere far away.",
];
const MARCUS_MAX_DIALOGUE = [
  "Polished my gladius this morning. Force of habit. The peace here makes me restless... in a good way.",
  "Caught three mackerel before dawn. Take one. Consider it a standing order.",
  "I've been teaching the young ones sword forms. They're terrible. Reminds me of myself.",
  "Found an old coin in the sand. Keep it. For luck. Not that you need it.",
  "The walls are holding well. I check them every morning. Old soldiers never stop patrolling.",
  "I carved a chess set from driftwood. You're the only one here worth playing against.",
  "Dreamed of marching with the Ninth again last night. Woke up glad to be here instead.",
  "Storm's coming. I stocked extra firewood by your door. Don't read into it.",
];
const VESTA_MAX_DIALOGUE = [
  "The crystals hummed your name this morning. They do that now. I think they're fond of you.",
  "I pressed a flower into resin for you. It will glow faintly at night. A small blessing.",
  "The stars rearranged last night. A new constellation. I'm naming it after you.",
  "I saw tomorrow in the flames. It was warm. You were smiling. That's all I needed to see.",
  "Take this crystal shard. I've been singing to it for a week. It carries a prayer for you.",
  "The temple walls are warm today. The island is content. It knows we are here.",
  "I dreamed of a city of light beneath the waves. Perhaps one day we'll find it together.",
  "Every flame I tend is a word in a letter to the gods. Today's letter is about gratitude.",
];
const FELIX_MAX_DIALOGUE = [
  "Chapter sixty-three: 'On Friendship in Exile.' It's the best chapter. Don't tell the cats.",
  "Minerva brought me a live crab this morning. I think she's trying to expand my research.",
  "I found a passage in the old texts about laughter curing stone rot. Testing it on the columns.",
  "Take this scroll copy. My notes on local tides. Useless to most. Invaluable to you.",
  "The cats and I took a vote. You're an honorary member of the research team. Unanimous.",
  "I've started a second manuscript. Working title: 'Why I Stopped Missing Rome.' Short book.",
  "A bird landed on my scroll and left a footprint in the wet ink. I'm keeping it. Art.",
  "Drew a map of every path you've walked on this island. The lines make a shape. I think it's a heart.",
];

function getMaxHeartsDialogue(npcName) {
  let pool = npcName === 'livia' ? LIVIA_MAX_DIALOGUE :
             npcName === 'marcus' ? MARCUS_MAX_DIALOGUE :
             npcName === 'vesta' ? VESTA_MAX_DIALOGUE :
             npcName === 'felix' ? FELIX_MAX_DIALOGUE : null;
  if (!pool) return null;
  let npcState = npcName === 'livia' ? state.npc :
                 npcName === 'marcus' ? state.marcus :
                 npcName === 'vesta' ? state.vesta : state.felix;
  if (!npcState || npcState.hearts < 10) return null;
  let daySeed = Math.floor(Date.now() / 86400000);
  let npcOffset = { livia: 0, marcus: 3, vesta: 5, felix: 7 }[npcName] || 0;
  let idx = (daySeed + npcOffset + Math.floor(frameCount / 3600)) % pool.length;
  return pool[idx];
}

function getExpandedDialogue(npcName) {
  // At max hearts, 50% chance to pull from endgame pool for variety
  let maxLine = (typeof getMaxHeartsDialogue === 'function') ? getMaxHeartsDialogue(npcName) : null;
  if (maxLine && random() < 0.5) return maxLine;

  let pool = npcName === 'livia' ? LIVIA_DIALOGUE_POOL :
             npcName === 'marcus' ? MARCUS_DIALOGUE_POOL :
             npcName === 'vesta' ? VESTA_DIALOGUE_POOL :
             npcName === 'felix' ? FELIX_DIALOGUE_POOL : null;
  if (!pool) return null;
  let npcState = npcName === 'livia' ? state.npc :
                 npcName === 'marcus' ? state.marcus :
                 npcName === 'vesta' ? state.vesta : state.felix;
  let h = npcState ? npcState.hearts : 0;
  let t = state.time;
  let candidates = pool.filter(d => {
    if (h < d.minH || h >= d.maxH) return false;
    if (d.timeMin !== undefined) {
      if (d.timeMin < d.timeMax) { if (t < d.timeMin || t > d.timeMax) return false; }
      else { if (t < d.timeMin && t > d.timeMax) return false; }
    }
    if (d.weather && (!state.weather || state.weather.type !== d.weather)) return false;
    if (d.requires) {
      let rNpc = d.requires.npc === 'livia' ? state.npc :
                 d.requires.npc === 'marcus' ? state.marcus :
                 d.requires.npc === 'vesta' ? state.vesta : state.felix;
      if (!rNpc || rNpc.hearts < d.requires.minHearts) return false;
    }
    return true;
  });
  if (candidates.length === 0) {
    // Relax: filter only by hearts range
    candidates = pool.filter(d => h >= d.minH && h < d.maxH);
    if (candidates.length === 0) candidates = pool;
    return candidates[floor(random(candidates.length))].text;
  }
  return candidates[floor(random(candidates.length))].text;
}

// ─── NPC WORLD EVENT REACTIONS ──────────────────────────────────────────
function getNPCReaction(npcName, event) {
  const R = {
    livia: {
      storm: "Stay close. The last storm took everything from me.",
      festival: "Put on your best toga! ...That IS your best toga?",
      boss_defeated: "You're alive. Thank the gods. I made dinner just in case.",
      colony_built: "Two islands. Two chances. My father would have wept.",
    },
    marcus: {
      storm: "Lash the crates down. I've ridden out worse — but not by much.",
      festival: "Festivals. Hmph. ...Fine. For the wine.",
      boss_defeated: "That thing had teeth like gladii. You've earned a drink.",
      colony_built: "Proper outpost. Fortified perimeter. Not bad for a farmer.",
    },
    vesta: {
      storm: "The crystals scream in the storm. I will sing to calm them.",
      festival: "Every laugh is a prayer. Every dance is worship.",
      boss_defeated: "The darkness recedes. I saw this in the flames three days ago.",
      colony_built: "The island breathes easier. More hearts to love it.",
    },
    felix: {
      storm: "My scrolls! Save the scrolls! ...Cats first, then scrolls.",
      festival: "I've prepared a twelve-point presentation — where's everyone going?",
      boss_defeated: "Documented the creature in chapter forty-seven. Terrifying.",
      colony_built: "A second library! ...What do you mean 'barracks'?",
    },
  };
  return R[npcName] && R[npcName][event] || null;
}

// ─── LORE TABLETS — 20 ancient inscriptions ─────────────────────────────
const LORE_TABLETS = [
  { id: 0, island: 'home', rx: 0.7, ry: -0.4, title: 'Tablet of Arrival',
    text: 'We came from the burning city, three ships of the Ninth. The sea boiled behind us. Ahead, floating stones caught the moonlight like frozen waves. "There," said the Centurion. "We stop running there."' },
  { id: 1, island: 'home', rx: -0.6, ry: 0.3, title: 'Tablet of the First Flame',
    text: 'The priestess Vesta Prima touched the largest crystal and fire leapt from stone. No fuel, no spark. Pure light. She wept and said: "Sol Invictus followed us. We are not abandoned."' },
  { id: 2, island: 'home', rx: 0.3, ry: 0.6, title: 'Tablet of the Farmer',
    text: 'Marcus Agricola planted the first grain. It grew in seven days. "The soil remembers," he said. "It remembers what Rome was before the swords. A village of farmers."' },
  { id: 3, island: 'home', rx: -0.3, ry: -0.6, title: 'Tablet of Crystal Song',
    text: 'The crystals sing at dawn. We measured the tone: it matches the human heart at rest. The engineers say coincidence. The priestess says design. The soldiers say "quiet, we are sleeping."' },
  { id: 4, island: 'terra_nova', rx: 0.4, ry: -0.3, title: 'Tablet of the Wild',
    text: 'The western island resists us. Its trees move when unwatched, its beasts are cunning as senators. We lost three men to the forest. They came back changed — speaking in tongues of root and stone.' },
  { id: 5, island: 'terra_nova', rx: -0.5, ry: 0.2, title: 'Tablet of the Builders',
    text: 'We raised walls on the wild island. By morning they were overgrown. By noon, the roots had become the walls — stronger than stone. The island was waiting to be asked.' },
  { id: 6, island: 'terra_nova', rx: 0.1, ry: 0.5, title: 'Tablet of the Beast King',
    text: 'The great wolf watches from the ridge. White as bone, eyes like blue fire. It does not attack. It judges. "That is not an animal," said the Centurion. "That is a god in hiding."' },
  { id: 7, island: 'home', rx: 0.5, ry: 0.1, title: 'Tablet of the Bridge',
    text: 'We built a bridge between islands using crystal-fused stone. It floats on water as if water were solid. The priestess says the crystals remember when all islands were one.' },
  { id: 8, island: 'home', rx: -0.8, ry: 0.0, title: 'Tablet of the Senate',
    text: 'We formed a senate of twelve. Six soldiers, three farmers, two builders, one priestess. Our first law: no citizen shall be exiled. We remember what exile feels like.' },
  { id: 9, island: 'home', rx: 0.0, ry: -0.7, title: 'Tablet of the Star Map',
    text: 'Vesta Prima mapped the sky. The constellations are wrong by twelve degrees. "We did not sail here," she said. "We were brought here. By the crystals. By the gods. By love."' },
  { id: 10, island: 'terra_nova', rx: -0.2, ry: -0.5, title: 'Tablet of the Forge',
    text: 'Deep beneath the volcanic island, a forge. Not Roman. Older. The anvil was crystal, the fire was white. Someone made weapons here — blades that cut shadow, shields that turned fate.' },
  { id: 11, island: 'terra_nova', rx: 0.6, ry: 0.3, title: 'Tablet of the Treaty',
    text: 'The beasts sent an emissary — a crow that spoke Latin. Peace: we would not cut the heart-trees, they would not raid our camps. Rome taught us war. This place teaches diplomacy.' },
  { id: 12, island: 'home', rx: -0.4, ry: 0.5, title: 'Tablet of the Children',
    text: 'The first child born here had eyes like crystal — pale green, flecked with gold. Vesta Prima said: "The island claims its own. She will be the bridge between us and what was here before."' },
  { id: 13, island: 'home', rx: 0.6, ry: -0.2, title: 'Tablet of the Plague',
    text: 'Fever took fourteen in the first winter. We burned their bodies on the high ground. The crystals turned black for three days. When they cleared, the fever was gone. The island mourned with us.' },
  { id: 14, island: 'home', rx: -0.1, ry: -0.3, title: 'Tablet of the Conspiracy',
    text: 'A message by merchant ship. Rome knows of the crystals. Consul Varius wants them for war. We must prepare — not for battle, for disappearing.' },
  { id: 15, island: 'terra_nova', rx: -0.4, ry: 0.4, title: 'Tablet of the Vanishing',
    text: 'We asked the crystals to hide us. The island rose, the mists thickened, the currents turned hostile. Roman ships were sent in circles. We became myth. We became free.' },
  { id: 16, island: 'home', rx: 0.2, ry: 0.4, title: 'Tablet of the Imperator',
    text: 'We chose an Imperator by vote. The farmer Marcus Agricola: "An empire built on grain lasts longer than one built on steel." He ruled forty years.' },
  { id: 17, island: 'terra_nova', rx: 0.3, ry: -0.6, title: 'Tablet of the Prophecy',
    text: 'Vesta Prima spoke her last prophecy: "One day a new exile will arrive. They will carry Rome in their heart and the island in their hands. They will finish what we started."' },
  { id: 18, island: 'home', rx: -0.5, ry: -0.4, title: 'Tablet of the Final Night',
    text: 'The last of the Ninth died on a Tuesday. The crystal-eyed child, grown old. "I can hear them coming. Not enemies. Family. Across the water. Across time." Then she smiled and was gone.' },
  { id: 19, island: 'home', rx: 0.4, ry: 0.3, title: 'Tablet of Mare Nostrum',
    text: 'If you read this, the prophecy was true. We are the Ninth Legion — not lost, not vanished. We chose this place. We chose peace. Build well. Love deeply. Remember us.' },
];

// ─── GOLDEN PROPHECIES — quest hints ────────────────────────────────────
const GOLDEN_PROPHECIES = [
  { text: 'The earth awaits seeds. Three fields shall prove your worth.', chapter: 1 },
  { text: "A daughter of Rome hides behind a farmer's smile.", chapter: 2 },
  { text: 'An eagle sleeps in the western forest. A soldier weeps for it.', chapter: 3 },
  { text: 'Crystal tears fall when the sky breaks. Pray in the storm.', chapter: 4 },
  { text: 'Two lands joined by stone and will. The bridge waits.', chapter: 5 },
  { text: 'Fire births steel on the smoking isle. Bring iron and bone.', chapter: 6 },
  { text: 'The north remembers what Rome forgot. Count the stones.', chapter: 7 },
  { text: 'The dead do not rest. They wait to speak truth.', chapter: 8 },
  { text: 'All hearts aligned. All islands joined. The rite awaits.', chapter: 9 },
];

// ─── NARRATIVE JOURNAL ENTRIES ──────────────────────────────────────────
const NARRATIVE_JOURNAL_ENTRIES = [
  { id: 'mq_awakening', title: 'Chapter I — Awakening',
    text: 'I survived the wreck. The trireme carried me to shore — a proper island with Roman ruins and good soil. Whatever fate put me here gave me a fighting chance.' },
  { id: 'mq_first_harvest', title: 'Chapter II — The First Harvest',
    text: 'The fields yielded. Grain, strong and golden. Livia watched from the cypress grove. She nodded. In exile, a nod is worth a standing ovation.' },
  { id: 'mq_livias_secret', title: "Chapter III — Livia's Secret",
    text: "Senator Aurelius. Treason. Exile by blood. Livia carries her father's name like a wound. She trusted me with it — the heaviest gift on this island." },
  { id: 'mq_marcus_honor', title: "Chapter IV — Marcus's Honor",
    text: 'The eagle of the Ninth. LEG IX FID. Lost for generations. Marcus held it and something broke behind his eyes — the wall between himself and the past.' },
  { id: 'mq_crystal_prophet', title: 'Chapter V — The Crystal Prophet',
    text: "Vesta's prophecy came during the storm — not words but images. Darkness beneath the sea. The sacred flame burned blue. We are not alone on these islands." },
  { id: 'mq_taming_terra', title: 'Chapter VI — Taming Terra Nova',
    text: 'The bridge stretches between islands. Two colonies, one people. The Ninth did this before us — we found their blueprints in the ruins.' },
  { id: 'mq_volcanic_forge', title: 'Chapter VII — The Volcanic Forge',
    text: "The forge was not Roman. Older. The blade I forged glows with the mountain's heat. Vulcan's gift, earned in fire." },
  { id: 'mq_frozen_memories', title: 'Chapter VIII — Frozen Memories',
    text: 'The ritual of Sol Invictus was never about the sun. It was about remembering — holding light when the world goes dark.' },
  { id: 'mq_dead_speak', title: 'Chapter IX — The Dead Speak',
    text: "We were exiled to protect a secret. These crystals are the source of Rome's hidden power. A consul buried the truth and sent us here to die. We built instead." },
  { id: 'mq_mare_nostrum', title: 'Chapter X — Mare Nostrum',
    text: 'Imperator. Not by conquest — by love. Livia, Marcus, Vesta, Felix — they did not follow me. We walked together. Mare Nostrum is not a sea. It is a bond.' },
];

// ─── NARRATIVE STATE + UPDATE FUNCTIONS ─────────────────────────────────
let loreTabletPopup = null;
let narrativeDialogue = null;

function initNarrativeState() {
  if (!state.mainQuest) {
    state.mainQuest = { chapter: 0, step: 0, counters: {}, completedChapters: [], dialogueQueue: [] };
  }
  if (!state.npcQuests) {
    state.npcQuests = {
      livia: { active: null, completed: [], available: true },
      marcus: { active: null, completed: [], available: true },
      vesta: { active: null, completed: [], available: true },
      felix: { active: null, completed: [], available: true },
      counters: {},
    };
  }
  if (!state.loreTablets) {
    state.loreTablets = LORE_TABLETS.map(t => ({
      id: t.id, found: false,
      wx: t.island === 'home' ? WORLD.islandCX + t.rx * state.islandRX : state.conquest.isleX + t.rx * state.conquest.isleRX,
      wy: t.island === 'home' ? WORLD.islandCY + t.ry * state.islandRY : state.conquest.isleY + t.ry * state.conquest.isleRY,
      island: t.island,
    }));
  }
  if (!state.narrativeFlags) state.narrativeFlags = {};
  if (!state.npcReactionQueue) state.npcReactionQueue = [];
  if (state.mainQuest && !state.mainQuest.counters) state.mainQuest.counters = {};
  if (state.npcQuests && !state.npcQuests.counters) state.npcQuests.counters = {};
}

// ─── EARLY GAME TUTORIAL NUDGES — guide new players through gather→build→reward ───
function tickEarlyGameNudges(dt) {
  if (!state.mainQuest || !state.progression || !state.progression.homeIslandReached) return;
  let ch = state.mainQuest.chapter;
  if (ch > 1) return; // only active during chapters 0 and 1
  if (!state._earlyNudges) state._earlyNudges = { timer: 0, shown: {} };
  let en = state._earlyNudges;
  en.timer += dt;

  // Chapter 1: gather→build→reward micro-loop nudges
  if (ch === 1) {
    let counters = state.mainQuest.counters || {};
    let planted = state.plots ? state.plots.filter(p => p.planted).length : 0;
    let harvested = counters['mq_harvested'] || 0;
    let built = counters['mq_built'] || 0;

    // Nudge 1: plant crops (after ~10 seconds on chapter 1)
    if (!en.shown['plant'] && planted < 3 && en.timer > 600) {
      en.shown['plant'] = true;
      addFloatingText(width / 2, height * 0.18, 'Walk to the farm plots and press [E] to plant crops!', '#ddc880');
      addFloatingText(width / 2, height * 0.23, 'You need seeds — check your inventory.', '#bbaa70');
    }
    // Nudge 2: harvest when crops grow
    if (!en.shown['harvest'] && planted >= 3 && harvested < 3 && en.timer > 1800) {
      en.shown['harvest'] = true;
      addFloatingText(width / 2, height * 0.18, 'Your crops are growing! Harvest them when they glow.', '#88cc44');
    }
    // Nudge 3: build after some harvesting
    if (!en.shown['build'] && harvested >= 3 && built < 1 && en.timer > 2400) {
      en.shown['build'] = true;
      addFloatingText(width / 2, height * 0.18, 'Press [B] to open the build menu. Place your first structure!', '#aaddff');
    }
    // Nudge 4: encouragement after first build
    if (!en.shown['reward'] && built >= 1 && harvested >= 1) {
      en.shown['reward'] = true;
      addFloatingText(width / 2, height * 0.15, 'Your island is taking shape! Keep building to grow.', '#ffd700');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('fanfare');
    }
  }
}

function updateMainQuest() {
  if (!state.mainQuest) return;
  let ch = state.mainQuest.chapter;
  if (ch >= MAIN_QUEST_CHAPTERS.length) return;
  let chapter = MAIN_QUEST_CHAPTERS[ch];
  if (!chapter) return;
  let allComplete = true;
  for (let obj of chapter.objectives) {
    let done = false;
    if (obj.check) done = obj.check();
    else if (obj.counter) done = (state.mainQuest.counters[obj.counter] || 0) >= obj.target;
    else if (obj.interact) done = !!state.narrativeFlags[obj.interact];
    if (!done) { allComplete = false; break; }
  }
  if (allComplete) {
    state.mainQuest.completedChapters.push(chapter.id);
    let r = chapter.reward;
    for (let [k, v] of Object.entries(r)) state[k] = (state[k] || 0) + v;
    let rewardText = Object.entries(r).map(([k, v]) => '+' + v + ' ' + k).join(', ');
    addFloatingText(width / 2, height * 0.2, 'CHAPTER COMPLETE: ' + chapter.title, '#ffd700');
    addFloatingText(width / 2, height * 0.27, rewardText, '#ffcc44');
    spawnParticles(state.player.x, state.player.y, 'divine', 15);
    if (typeof snd !== 'undefined' && snd) snd.playSFX('fanfare');
    if (chapter.journalOnComplete) unlockJournal(chapter.journalOnComplete);
    if (chapter.dialogueOnComplete) {
      state.mainQuest.dialogueQueue.push({ npc: chapter.dialogueOnComplete.npc, line: chapter.dialogueOnComplete.line, timer: 300 });
    }
    state.mainQuest.chapter = ch + 1;
    state.mainQuest.step = 0;
    if (state.score) state.score.questsCompleted++;
    if (typeof adjustReputation === 'function') adjustReputation(3);
    // Quest completion grants research points
    if (typeof grantResearchPoints === 'function') {
      let rpBonus = 5 + ch * 3; // 5-20 RP scaling with chapter
      grantResearchPoints(rpBonus);
      addFloatingText(width / 2, height * 0.28, '+' + rpBonus + ' RP (quest)', '#88ccff');
    }
    if (ch + 1 >= 2) trackMilestone('chapter_' + (ch + 1));
    // Quest compass nudges — stored as pending floats, shown after a delay
    if (!state.mainQuest.pendingNudges) state.mainQuest.pendingNudges = [];
    if (ch === 0) {
      state.mainQuest.pendingNudges.push({ text: 'Marcus is somewhere to the east. Find him.', color: '#aabbcc', delay: 180 });
    } else if (ch === 1) {
      state.mainQuest.pendingNudges.push({ text: 'Vesta tends the crystal shrine. Seek her out.', color: '#aaddff', delay: 180 });
    }
    if (state.mainQuest.chapter >= MAIN_QUEST_CHAPTERS.length) {
      addFloatingText(width / 2, height * 0.15, 'THE LEGACY OF ROME — COMPLETE', '#ffd700');
    }
  }
}

function tickPendingNudges(dt) {
  if (!state.mainQuest || !state.mainQuest.pendingNudges) return;
  let nudges = state.mainQuest.pendingNudges;
  for (let i = nudges.length - 1; i >= 0; i--) {
    nudges[i].delay -= dt;
    if (nudges[i].delay <= 0) {
      addFloatingText(width / 2, height * 0.22, nudges[i].text, nudges[i].color);
      nudges.splice(i, 1);
    }
  }
}

function advanceMainQuestCounter(counter, amount) {
  if (!state.mainQuest || !state.mainQuest.counters) return;
  state.mainQuest.counters[counter] = (state.mainQuest.counters[counter] || 0) + (amount || 1);
  if (typeof snd !== 'undefined' && snd) snd.playSFX('quest_progress');
}

function advanceNPCQuestCounter(counter, amount) {
  if (!state.npcQuests || !state.npcQuests.counters) return;
  state.npcQuests.counters[counter] = (state.npcQuests.counters[counter] || 0) + (amount || 1);
}

function getAvailableNPCQuest(npcName) {
  let chain = NPC_QUEST_CHAINS[npcName];
  if (!chain) return null;
  let nqState = state.npcQuests[npcName];
  if (!nqState || nqState.active) return null;
  let npcState = npcName === 'livia' ? state.npc : npcName === 'marcus' ? state.marcus : npcName === 'vesta' ? state.vesta : state.felix;
  let hearts = npcState ? npcState.hearts : 0;
  for (let quest of chain) {
    if (nqState.completed.includes(quest.id)) continue;
    if (quest.requirement.hearts > hearts) continue;
    if (quest.requirement.prevQuest && !nqState.completed.includes(quest.requirement.prevQuest)) continue;
    return quest;
  }
  return null;
}

function startNPCQuest(npcName, quest) {
  state.npcQuests[npcName].active = quest.id;
  state.npcQuests[npcName].available = false;
  addFloatingText(width / 2, height * 0.2, 'NEW QUEST: ' + quest.title, '#88ccff');
  state.mainQuest.dialogueQueue.push({ npc: npcName, line: quest.dialogueStart, timer: 400 });
}

function checkNPCQuestCompletion(npcName) {
  if (!state.npcQuests) return;
  let nqState = state.npcQuests[npcName];
  if (!nqState || !nqState.active) return;
  let chain = NPC_QUEST_CHAINS[npcName];
  if (!chain) return;
  let quest = chain.find(q => q.id === nqState.active);
  if (!quest) return;
  let allDone = true;
  for (let obj of quest.objectives) {
    let done = false;
    if (obj.check) done = obj.check();
    else if (obj.counter) done = (state.npcQuests.counters[obj.counter] || 0) >= obj.target;
    else if (obj.interact) done = !!state.narrativeFlags[obj.interact];
    if (!done) { allDone = false; break; }
  }
  if (!allDone) return;
  if (quest.consumeItems) {
    for (let [res, amt] of Object.entries(quest.consumeItems)) state[res] = (state[res] || 0) - amt;
  }
  let r = quest.reward;
  for (let [k, v] of Object.entries(r)) state[k] = (state[k] || 0) + v;
  let rewardText = Object.entries(r).map(([k, v]) => '+' + v + ' ' + k).join(', ');
  addFloatingText(width / 2, height * 0.2, 'QUEST COMPLETE: ' + quest.title, '#88ff88');
  addFloatingText(width / 2, height * 0.27, rewardText, '#ffcc44');
  spawnParticles(state.player.x, state.player.y, 'divine', 10);
  if (typeof snd !== 'undefined' && snd) snd.playSFX('fanfare');
  let npcState = npcName === 'livia' ? state.npc : npcName === 'marcus' ? state.marcus : npcName === 'vesta' ? state.vesta : state.felix;
  if (npcState) npcState.hearts = min(10, npcState.hearts + 2);
  state.mainQuest.dialogueQueue.push({ npc: npcName, line: quest.dialogueEnd, timer: 400 });
  nqState.completed.push(quest.id);
  nqState.active = null;
  nqState.available = true;
}

function updateNPCQuests() {
  for (let n of ['livia', 'marcus', 'vesta', 'felix']) checkNPCQuestCompletion(n);
}

// ─── LORE TABLET DRAWING + PICKUP ───────────────────────────────────────
function checkLoreTabletPickup() {
  if (!state.loreTablets) return;
  let px = state.player.x, py = state.player.y;
  let isOnTerra = state.conquest.active;
  for (let lt of state.loreTablets) {
    if (lt.found) continue;
    if (isOnTerra && lt.island !== 'terra_nova') continue;
    if (!isOnTerra && lt.island !== 'home') continue;
    if (dist(px, py, lt.wx, lt.wy) < 30) {
      lt.found = true;
      let data = LORE_TABLETS[lt.id];
      loreTabletPopup = { tablet: data, timer: 600 };
      addFloatingText(width / 2, height * 0.15, 'LORE TABLET: ' + data.title, '#ccaa55');
      spawnParticles(px, py, 'divine', 8);
      addFloatingText(width / 2, height * 0.22, state.loreTablets.filter(t => t.found).length + '/20 tablets', '#aa9955');
      // Naturalist's Codex lore tracking
      if (state.codex) {
        if (!state.codex.lore) state.codex.lore = {};
        let _isNewLore = !state.codex.lore[String(lt.id)];
        state.codex.lore[String(lt.id)] = { read: true, firstDay: state.day };
        if (_isNewLore && typeof markCodexDiscovery === 'function') markCodexDiscovery('lore', String(lt.id));
      }
      // Tablet 19 is the Final Inscription — Chapter IX objective
      if (lt.id === 19 && state.narrativeFlags) {
        state.narrativeFlags['final_inscription'] = true;
        addFloatingText(width / 2, height * 0.3, 'THE FINAL INSCRIPTION', '#ffd700');
      }
      break;
    }
  }
}

function drawLoreTablets() {
  if (!state.loreTablets) return;
  let isOnTerra = state.conquest.active;
  for (let lt of state.loreTablets) {
    if (lt.found) continue;
    if (isOnTerra && lt.island !== 'terra_nova') continue;
    if (!isOnTerra && lt.island !== 'home') continue;
    let sx = w2sX(lt.wx), sy = w2sY(lt.wy);
    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
    push(); noStroke();
    fill(120, 110, 90); rect(sx - 5, sy - 2, 10, 4);
    fill(160, 145, 115); rect(sx - 4, sy - 12, 8, 10);
    fill(140, 125, 100); rect(sx - 5, sy - 13, 10, 2);
    fill(100, 85, 60); rect(sx - 2, sy - 10, 4, 1); rect(sx - 2, sy - 8, 4, 1); rect(sx - 2, sy - 6, 3, 1);
    let pulse = sin(frameCount * 0.06 + lt.id) * 0.4 + 0.6;
    fill(220, 190, 80, floor(40 * pulse)); rect(sx - 6, sy - 14, 12, 16);
    pop();
    if (dist(state.player.x, state.player.y, lt.wx, lt.wy) < 40) {
      fill(220, 190, 80); textAlign(CENTER, CENTER); textSize(11);
      text('[E] Read tablet', sx, sy - 20); textAlign(LEFT, TOP);
    }
  }
}

function drawLoreTabletPopup() {
  if (!loreTabletPopup) return;
  loreTabletPopup.timer--;
  if (loreTabletPopup.timer <= 0) { loreTabletPopup = null; return; }
  let t = loreTabletPopup.tablet;
  let alpha = loreTabletPopup.timer > 60 ? 220 : floor(220 * loreTabletPopup.timer / 60);
  let pw = 320, ph = 120, px = width / 2 - pw / 2, py = height * 0.6;
  noStroke(); fill(40, 32, 20, alpha); rect(px, py, pw, ph, 6);
  stroke(180, 150, 80, alpha); strokeWeight(1); noFill(); rect(px + 3, py + 3, pw - 6, ph - 6, 4); noStroke();
  fill(220, 190, 80, alpha); textAlign(CENTER, TOP); textSize(10); text(t.title, width / 2, py + 10);
  fill(200, 180, 140, alpha); textSize(10);
  let words = t.text.split(' '), line = '', ly = py + 28, maxW = pw - 30;
  for (let w of words) {
    let test = line + (line ? ' ' : '') + w;
    if (textWidth(test) > maxW) { text(line, width / 2, ly); ly += 11; line = w; } else line = test;
  }
  if (line) text(line, width / 2, ly);
  fill(150, 130, 90, alpha); textSize(10); text('[ click to dismiss ]', width / 2, py + ph - 14);
  textAlign(LEFT, TOP);
}

// ─── QUEST TRACKER HUD ─────────────────────────────────────────────────
function drawQuestTracker() {
  if (!state.mainQuest) return;
  let ch = state.mainQuest.chapter;
  if (ch >= MAIN_QUEST_CHAPTERS.length) {
    fill(255, 215, 0, 180); textAlign(RIGHT, TOP); textSize(11);
    text('IMPERATOR — Legacy Complete', width - 16, 16); textAlign(LEFT, TOP); return;
  }
  let chapter = MAIN_QUEST_CHAPTERS[ch];
  if (!chapter) return;
  let rw = min(280, floor(width * 0.22));
  let rx = width - rw - 12, ry = 12, rh = 18 + chapter.objectives.length * 14;
  drawHUDPanel(rx, ry, rw, rh);
  fill(220, 190, 80); textAlign(LEFT, TOP); textSize(11);
  text(chapter.title, rx + 8, ry + 5);
  let oy = ry + 19;
  for (let obj of chapter.objectives) {
    let done = false;
    if (obj.check) done = obj.check();
    else if (obj.counter) done = (state.mainQuest.counters[obj.counter] || 0) >= obj.target;
    else if (obj.interact) done = !!state.narrativeFlags[obj.interact];
    let pt = '';
    if (obj.counter && !done) pt = ' (' + (state.mainQuest.counters[obj.counter] || 0) + '/' + obj.target + ')';
    fill(done ? color(120, 200, 80) : color(180, 170, 140)); textSize(10);
    let objStr = (done ? '[x] ' : '[ ] ') + obj.desc + pt;
    let maxW = rw - 16;
    if (textWidth(objStr) > maxW) {
      while (objStr.length > 10 && textWidth(objStr + '...') > maxW) objStr = objStr.slice(0, -1);
      objStr += '...';
    }
    text(objStr, rx + 10, oy); oy += 14;
  }
  // NPC side quests
  let nqY = ry + rh + 6;
  for (let npcName of ['livia', 'marcus', 'vesta', 'felix']) {
    let nqState = state.npcQuests ? state.npcQuests[npcName] : null;
    if (!nqState || !nqState.active) continue;
    let chain = NPC_QUEST_CHAINS[npcName];
    let quest = chain ? chain.find(q => q.id === nqState.active) : null;
    if (!quest) continue;
    let nqH = 16 + quest.objectives.length * 12;
    drawHUDPanel(rx, nqY, rw, nqH);
    fill(140, 180, 220); textSize(10);
    text((typeof getNPCDisplayName === 'function' ? getNPCDisplayName(npcName) : npcName.charAt(0).toUpperCase() + npcName.slice(1)) + ': ' + quest.title, rx + 8, nqY + 4);
    let objY = nqY + 16;
    for (let obj of quest.objectives) {
      let done = false;
      if (obj.check) done = obj.check();
      else if (obj.counter) done = (state.npcQuests.counters[obj.counter] || 0) >= obj.target;
      else if (obj.interact) done = !!state.narrativeFlags[obj.interact];
      let pt = '';
      if (obj.counter && !done) pt = ' (' + (state.npcQuests.counters[obj.counter] || 0) + '/' + obj.target + ')';
      fill(done ? color(120, 200, 80) : color(160, 150, 120)); textSize(9);
      let npcStr = (done ? '[x] ' : '[ ] ') + obj.desc + pt;
      let npcMaxW = rw - 16;
      if (textWidth(npcStr) > npcMaxW) {
        while (npcStr.length > 10 && textWidth(npcStr + '...') > npcMaxW) npcStr = npcStr.slice(0, -1);
        npcStr += '...';
      }
      text(npcStr, rx + 10, objY); objY += 12;
    }
    nqY += nqH + 4;
  }
  textAlign(LEFT, TOP);
}

// ─── NARRATIVE DIALOGUE QUEUE ───────────────────────────────────────────
function updateNarrativeDialogue() {
  if (narrativeDialogue) {
    narrativeDialogue.timer--;
    if (narrativeDialogue.timer <= 0) narrativeDialogue = null;
    return;
  }
  if (state.mainQuest && state.mainQuest.dialogueQueue && state.mainQuest.dialogueQueue.length > 0) {
    narrativeDialogue = state.mainQuest.dialogueQueue.shift();
  }
}

function drawNarrativeDialogue() {
  if (!narrativeDialogue) return;
  let d = narrativeDialogue;
  let alpha = d.timer > 30 ? 230 : floor(230 * d.timer / 30);
  let pw = min(400, width - 40), px = width / 2 - pw / 2, py = height - 100;
  noStroke(); fill(25, 20, 15, alpha); rect(px, py, pw, 70, 6);
  stroke(180, 150, 80, alpha); strokeWeight(1); noFill(); rect(px + 2, py + 2, pw - 4, 66, 4); noStroke();
  let nc = d.npc === 'livia' ? color(255, 150, 180, alpha) : d.npc === 'marcus' ? color(180, 200, 255, alpha) :
    d.npc === 'vesta' ? color(180, 140, 255, alpha) : color(140, 200, 140, alpha);
  fill(nc); textAlign(LEFT, TOP); textSize(9);
  text((typeof getNPCDisplayName === 'function' ? getNPCDisplayName(d.npc) : d.npc.charAt(0).toUpperCase() + d.npc.slice(1)), px + 10, py + 8);
  fill(210, 200, 175, alpha); textSize(10);
  let words = d.line.split(' '), line = '', ly = py + 24, maxW = pw - 24;
  for (let w of words) {
    let test = line + (line ? ' ' : '') + w;
    if (textWidth(test) > maxW) { text(line, px + 12, ly); ly += 10; line = w; } else line = test;
  }
  if (line) text(line, px + 12, ly);
  textAlign(LEFT, TOP);
}

// ─── ENHANCED PROPHECY — Golden Prophecies ──────────────────────────────
function generateEnhancedProphecy() {
  if (state.mainQuest && random() < 0.15) {
    let ch = state.mainQuest.chapter;
    let golden = GOLDEN_PROPHECIES.find(p => p.chapter === ch);
    if (golden) return { text: golden.text, type: 'golden', desc: 'Quest hint — heed the oracle', active: true, golden: true };
  }
  return generateProphecy();
}
