// agent.js — Swarm Intelligence Agent System
// Each NPC has personality traits, beliefs, memory, and goals.
// Agents perceive the world, update beliefs, decide, and act.
// Heuristic Tier 1 — runs entirely in browser, no LLM needed.

// ─── AGENT ROLE DEFINITIONS ─────────────────────────────────────────
const AGENT_ROLES = {
  senator: {
    name: 'Senator',
    icon: '🏛',
    baseTraits: { ambition: 0.6, loyalty: 0.5, greed: 0.4, militarism: 0.3, charisma: 0.6, religiosity: 0.3 },
    skills: ['politics', 'oratory', 'intrigue'],
    decisionWeights: { politics: 1.0, economy: 0.5, military: 0.3, religion: 0.2 },
  },
  merchant: {
    name: 'Merchant',
    icon: '⚖',
    baseTraits: { ambition: 0.5, loyalty: 0.4, greed: 0.8, militarism: 0.1, charisma: 0.5, religiosity: 0.2 },
    skills: ['trade', 'negotiation', 'logistics'],
    decisionWeights: { politics: 0.3, economy: 1.0, military: 0.1, religion: 0.1 },
  },
  general: {
    name: 'General',
    icon: '⚔',
    baseTraits: { ambition: 0.7, loyalty: 0.6, greed: 0.3, militarism: 0.9, charisma: 0.5, religiosity: 0.3 },
    skills: ['tactics', 'leadership', 'siege'],
    decisionWeights: { politics: 0.4, economy: 0.2, military: 1.0, religion: 0.1 },
  },
  admiral: {
    name: 'Admiral',
    icon: '⚓',
    baseTraits: { ambition: 0.6, loyalty: 0.6, greed: 0.3, militarism: 0.7, charisma: 0.4, religiosity: 0.3 },
    skills: ['naval', 'navigation', 'blockade'],
    decisionWeights: { politics: 0.3, economy: 0.3, military: 0.8, religion: 0.1 },
  },
  priest: {
    name: 'Priest',
    icon: '☀',
    baseTraits: { ambition: 0.3, loyalty: 0.7, greed: 0.1, militarism: 0.1, charisma: 0.6, religiosity: 0.9 },
    skills: ['divination', 'oratory', 'healing'],
    decisionWeights: { politics: 0.5, economy: 0.1, military: 0.1, religion: 1.0 },
  },
  spy: {
    name: 'Spy',
    icon: '🗝',
    baseTraits: { ambition: 0.7, loyalty: 0.3, greed: 0.5, militarism: 0.3, charisma: 0.4, religiosity: 0.1 },
    skills: ['espionage', 'disguise', 'sabotage'],
    decisionWeights: { politics: 0.6, economy: 0.3, military: 0.5, religion: 0.0 },
  },
  scholar: {
    name: 'Scholar',
    icon: '📜',
    baseTraits: { ambition: 0.4, loyalty: 0.5, greed: 0.2, militarism: 0.0, charisma: 0.4, religiosity: 0.4 },
    skills: ['research', 'engineering', 'medicine'],
    decisionWeights: { politics: 0.3, economy: 0.4, military: 0.1, religion: 0.5 },
  },
};

// ─── ROMAN / ANCIENT NAME POOLS ─────────────────────────────────────
const NAME_POOLS = {
  rome: {
    male: ['Marcus', 'Gaius', 'Lucius', 'Quintus', 'Publius', 'Titus', 'Gnaeus', 'Decimus', 'Spurius', 'Appius',
           'Aulus', 'Manius', 'Servius', 'Numerius', 'Sextus', 'Vibius', 'Caeso', 'Faustus', 'Agrippa', 'Primus'],
    family: ['Cornelius', 'Scipio', 'Fabius', 'Claudius', 'Julius', 'Aurelius', 'Cato', 'Varro', 'Crassus', 'Flaminius',
             'Gracchus', 'Brutus', 'Cassius', 'Licinius', 'Aemilius', 'Sempronius', 'Sulpicius', 'Valerius', 'Horatius', 'Furius'],
  },
  carthage: {
    male: ['Hanno', 'Hamilcar', 'Hannibal', 'Hasdrubal', 'Mago', 'Bomilcar', 'Himilco', 'Adherbal', 'Maharbal', 'Gisco',
           'Bostar', 'Saphon', 'Abdmelqart', 'Eshmunamash', 'Arish', 'Baalhanno', 'Sapho', 'Hannon', 'Malchus', 'Boodes'],
    family: ['Barca', 'Magonid', 'Gisco', 'Dido', 'Hanno', 'Elissa', 'Sophonisba', 'Tanit', 'Melqart', 'Eshmun'],
  },
  egypt: {
    male: ['Ptolemy', 'Sosibius', 'Agathocles', 'Aristomenes', 'Cleomenes', 'Dionysius', 'Apollonius', 'Zenon',
           'Imhotep', 'Nectanebo', 'Amasis', 'Psamtik', 'Ramesses', 'Thutmose', 'Amenhotep', 'Khasekhemre'],
    family: ['of Alexandria', 'of Memphis', 'of Thebes', 'Lagid', 'Soter', 'Philadelphus', 'Euergetes', 'Philopator'],
  },
  greece: {
    male: ['Leonidas', 'Themistocles', 'Pericles', 'Demosthenes', 'Alcibiades', 'Philopoemen', 'Aratus', 'Cleomenes',
           'Pyrrhus', 'Epaminondas', 'Xenophon', 'Aristides', 'Cimon', 'Miltiades', 'Lycurgus', 'Archimedes'],
    family: ['of Athens', 'of Sparta', 'of Corinth', 'of Thebes', 'of Rhodes', 'of Macedon', 'of Epirus', 'of Thessaly'],
  },
  seleucid: {
    male: ['Antiochus', 'Seleucus', 'Demetrius', 'Philip', 'Alexander', 'Tigranes', 'Mithridates', 'Arsaces',
           'Orontes', 'Ptolemais', 'Apollodorus', 'Diodotus', 'Molon', 'Achaeus', 'Hermias', 'Zeuxis'],
    family: ['Nicator', 'Soter', 'Theos', 'Callinicus', 'Ceraunus', 'Epiphanes', 'Philopator', 'Sidetes'],
  },
  iberia: {
    male: ['Indibilis', 'Mandonius', 'Culchas', 'Luxinius', 'Istolatius', 'Viriathus', 'Olyndicus', 'Retogenes',
           'Ambiorix', 'Corocotta', 'Astolpas', 'Edeco', 'Attenes', 'Audax', 'Ditalco', 'Minurus'],
    family: ['of Gades', 'of Carthago Nova', 'of Saguntum', 'of Tarraco', 'Turdetani', 'Celtiberi', 'Lusitani', 'Ilergetes'],
  },
  gaul: {
    male: ['Vercingetorix', 'Ambiorix', 'Dumnorix', 'Diviciacus', 'Indutiomarus', 'Commius', 'Cingetorix', 'Cavarinus',
           'Tasgetius', 'Litaviccus', 'Eporedorix', 'Viridomarus', 'Critognatus', 'Lucterius', 'Drappes', 'Gutuater'],
    family: ['of Massilia', 'of Narbo', 'Arverni', 'Aedui', 'Sequani', 'Helvetii', 'Belgae', 'Carnutes'],
  },
  numidia: {
    male: ['Masinissa', 'Jugurtha', 'Micipsa', 'Adherbal', 'Hiempsal', 'Gulussa', 'Juba', 'Gauda',
           'Syphax', 'Lacumazes', 'Mazaetullus', 'Nabdalsa', 'Oxyntas', 'Capussa', 'Massiva', 'Oezalces'],
    family: ['of Cirta', 'of Zama', 'of Thugga', 'Massylii', 'Masaesyli', 'Gaetuli', 'Musulamii', 'Numidae'],
  },
};

// ─── AGENT FACTORY ──────────────────────────────────────────────────

let _nextAgentId = 1;

function generateAgentName(faction) {
  let pool = NAME_POOLS[faction] || NAME_POOLS.rome;
  let first = pool.male[Math.floor(Math.random() * pool.male.length)];
  let family = pool.family[Math.floor(Math.random() * pool.family.length)];
  return `${first} ${family}`;
}

function createAgent(role, factionId, graph) {
  let roleDef = AGENT_ROLES[role];
  if (!roleDef) return null;

  let id = `agent_${_nextAgentId++}`;
  let name = generateAgentName(factionId);

  // Randomize traits around base values (±0.2)
  let traits = {};
  for (let t in roleDef.baseTraits) {
    let base = roleDef.baseTraits[t];
    traits[t] = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.4));
  }

  // Add paranoia and risk tolerance
  traits.paranoia = Math.random() * 0.6 + 0.1;
  traits.riskTolerance = Math.random() * 0.6 + 0.2;

  let agentData = {
    name: name,
    role: role,
    roleName: roleDef.name,
    icon: roleDef.icon,
    faction: factionId,
    alive: true,
    age: 30 + Math.floor(Math.random() * 30),
    influence: role === 'senator' ? 0.6 : (role === 'general' ? 0.5 : 0.3),

    // Personality traits
    ...traits,

    // Skills
    skills: roleDef.skills.reduce((obj, s) => { obj[s] = 0.3 + Math.random() * 0.5; return obj; }, {}),

    // Decision weights
    decisionWeights: { ...roleDef.decisionWeights },

    // Beliefs — { topic: { stance: 0-1, confidence: 0-1 } }
    beliefs: {},

    // Memory — last N significant events
    memory: [],
    maxMemory: 20,

    // Current goals — [{ type, target, priority, reason, deadline? }]
    goals: [],

    // Mood / emotional state
    mood: 0.6, // 0 = miserable, 1 = ecstatic
    lastAction: null,
    lastActionTurn: 0,

    // Council vote tracking
    votes: {}, // { proposalId: 'for'|'against' }
  };

  // Add to graph
  graph.addNode(id, 'agent', agentData);
  graph.addEdge(id, factionId, 'MEMBER_OF', traits.loyalty, { since: graph.turn, role: role });

  return id;
}

// ─── AGENT DECISION ENGINE (TIER 1 — HEURISTIC) ────────────────────

function agentPerceive(agentId, graph) {
  let agent = graph.getNode(agentId);
  if (!agent || !agent.data.alive) return [];

  let d = agent.data;
  let factionId = d.faction;
  let events = [];

  // Check faction's economic state
  let econ = graph.factionEconomicPower(factionId);
  if (econ < 200 && d.greed > 0.5) {
    events.push({ type: 'economy_weak', severity: 0.7, data: { income: econ } });
  }

  // Check military threats
  let rivals = graph.getEdgesByType('RIVALRY').filter(e => e.from === factionId || e.to === factionId);
  for (let r of rivals) {
    let rivalId = r.from === factionId ? r.to : r.from;
    let rivalStrength = graph.factionMilitaryStrength(rivalId);
    let ownStrength = graph.factionMilitaryStrength(factionId);
    if (rivalStrength > ownStrength * 1.3 && d.paranoia > 0.4) {
      events.push({ type: 'military_threat', severity: 0.8, data: { rival: rivalId, ratio: rivalStrength / (ownStrength + 1) } });
    }
  }

  // Check trade disruptions
  let trades = graph.factionTradeRoutes(factionId);
  for (let t of trades) {
    if (t.data.satisfaction < 0.3 && d.role === 'merchant') {
      events.push({ type: 'trade_disrupted', severity: 0.6, data: { route: t } });
    }
  }

  return events;
}

function agentUpdateBeliefs(agentId, events, graph) {
  let agent = graph.getNode(agentId);
  if (!agent) return;
  let d = agent.data;

  for (let event of events) {
    switch (event.type) {
      case 'military_threat': {
        let rivalId = event.data.rival;
        let beliefKey = `war_with_${rivalId}`;
        if (!d.beliefs[beliefKey]) d.beliefs[beliefKey] = { stance: 0.5, confidence: 0.3 };

        // Generals become more pro-war, merchants less
        let warShift = d.militarism * 0.2 - (1 - d.militarism) * 0.1;
        d.beliefs[beliefKey].stance = Math.max(0, Math.min(1, d.beliefs[beliefKey].stance + warShift));
        d.beliefs[beliefKey].confidence = Math.min(1, d.beliefs[beliefKey].confidence + 0.1);
        break;
      }
      case 'economy_weak': {
        if (!d.beliefs['expand_trade']) d.beliefs['expand_trade'] = { stance: 0.5, confidence: 0.3 };
        d.beliefs['expand_trade'].stance = Math.min(1, d.beliefs['expand_trade'].stance + d.greed * 0.15);
        d.beliefs['expand_trade'].confidence = Math.min(1, d.beliefs['expand_trade'].confidence + 0.1);
        break;
      }
      case 'trade_disrupted': {
        let rivalFaction = null; // Would determine who's responsible
        if (!d.beliefs['trade_embargo']) d.beliefs['trade_embargo'] = { stance: 0.5, confidence: 0.3 };
        d.beliefs['trade_embargo'].stance = Math.min(1, d.beliefs['trade_embargo'].stance + d.greed * 0.2);
        break;
      }
    }

    // Add to memory
    d.memory.push({
      turn: graph.turn,
      event: event.type,
      data: event.data,
      emotionalImpact: event.severity * (d.paranoia > 0.5 ? 1.3 : 1.0),
    });
    if (d.memory.length > d.maxMemory) d.memory.shift();
  }

  // Decay old beliefs toward neutral
  for (let key in d.beliefs) {
    let b = d.beliefs[key];
    b.confidence = Math.max(0.1, b.confidence * 0.98); // slow decay
    // Stance drifts toward personality default
    let defaultStance = key.startsWith('war') ? d.militarism : 0.5;
    b.stance = lerp(b.stance, defaultStance, 0.02);
  }
}

function agentDecide(agentId, graph) {
  let agent = graph.getNode(agentId);
  if (!agent || !agent.data.alive) return null;
  let d = agent.data;

  // Score possible actions based on personality + beliefs + goals
  let actions = [];

  // ── POLITICAL ACTIONS ──
  if (d.role === 'senator' || d.role === 'priest') {
    // Lobby for or against war
    for (let key in d.beliefs) {
      if (key.startsWith('war_with_') && d.beliefs[key].confidence > 0.4) {
        let targetFaction = key.replace('war_with_', '');
        let stance = d.beliefs[key].stance;
        if (stance > 0.6) {
          actions.push({
            type: 'lobby_war',
            target: targetFaction,
            priority: stance * d.charisma * d.beliefs[key].confidence,
            reason: `Believes ${targetFaction} is a threat`,
          });
        } else if (stance < 0.4) {
          actions.push({
            type: 'lobby_peace',
            target: targetFaction,
            priority: (1 - stance) * d.charisma * d.beliefs[key].confidence,
            reason: `Advocates peace with ${targetFaction}`,
          });
        }
      }
    }
  }

  // ── ECONOMIC ACTIONS ──
  if (d.role === 'merchant') {
    if (d.beliefs['expand_trade'] && d.beliefs['expand_trade'].stance > 0.6) {
      actions.push({
        type: 'propose_trade',
        priority: d.greed * d.beliefs['expand_trade'].confidence,
        reason: 'Economy needs new trade routes',
      });
    }
    if (d.beliefs['trade_embargo'] && d.beliefs['trade_embargo'].stance > 0.7) {
      actions.push({
        type: 'lobby_embargo',
        priority: d.greed * d.beliefs['trade_embargo'].confidence * 0.8,
        reason: 'Trade losses demand retaliation',
      });
    }
  }

  // ── MILITARY ACTIONS ──
  if (d.role === 'general' || d.role === 'admiral') {
    // Push for military buildup
    let ownStrength = graph.factionMilitaryStrength(d.faction);
    if (d.militarism > 0.6 && ownStrength < 100) {
      actions.push({
        type: 'recruit_army',
        priority: d.militarism * d.ambition,
        reason: 'Military strength is insufficient',
      });
    }
    // Push for specific campaign
    for (let key in d.beliefs) {
      if (key.startsWith('war_with_') && d.beliefs[key].stance > 0.7) {
        let target = key.replace('war_with_', '');
        actions.push({
          type: 'plan_campaign',
          target: target,
          priority: d.militarism * d.ambition * d.beliefs[key].stance,
          reason: `Wants to lead campaign against ${target}`,
        });
      }
    }
  }

  // ── INTRIGUE ACTIONS ──
  if (d.role === 'spy') {
    actions.push({
      type: 'gather_intel',
      priority: 0.5 + d.ambition * 0.3,
      reason: 'Routine intelligence gathering',
    });
    if (d.loyalty < 0.3 && d.ambition > 0.7) {
      actions.push({
        type: 'plot_betrayal',
        priority: (1 - d.loyalty) * d.ambition * 0.5,
        reason: 'Dissatisfied with current faction',
      });
    }
  }

  // ── RELIGIOUS ACTIONS ──
  if (d.role === 'priest') {
    if (d.religiosity > 0.7) {
      actions.push({
        type: 'call_for_omens',
        priority: d.religiosity * 0.6,
        reason: 'The gods must be consulted',
      });
    }
  }

  // Sort by priority and return top action
  actions.sort((a, b) => b.priority - a.priority);
  return actions.length > 0 ? actions[0] : { type: 'idle', priority: 0, reason: 'No pressing matters' };
}

function agentAct(agentId, action, graph) {
  let agent = graph.getNode(agentId);
  if (!agent || !action) return;
  let d = agent.data;

  d.lastAction = action;
  d.lastActionTurn = graph.turn;

  // Record the action as a graph event
  let eventId = `event_${graph.turn}_${agentId}`;
  graph.addNode(eventId, 'event', {
    type: action.type,
    agent: agentId,
    agentName: d.name,
    faction: d.faction,
    target: action.target || null,
    reason: action.reason,
    turn: graph.turn,
    priority: action.priority,
  });
  graph.addEdge(agentId, eventId, 'PERFORMED', action.priority);

  // Action effects
  switch (action.type) {
    case 'lobby_war':
    case 'lobby_peace': {
      // Influence other agents in same faction
      let allies = graph.factionAgents(d.faction);
      for (let ally of allies) {
        if (ally.id === agentId) continue;
        let trust = graph.relationshipStrength(ally.id, agentId);
        let influence = d.charisma * (0.3 + trust * 0.3);
        let beliefKey = `war_with_${action.target}`;
        if (!ally.data.beliefs[beliefKey]) ally.data.beliefs[beliefKey] = { stance: 0.5, confidence: 0.2 };

        let shift = action.type === 'lobby_war' ? influence * 0.1 : -influence * 0.1;
        ally.data.beliefs[beliefKey].stance = Math.max(0, Math.min(1, ally.data.beliefs[beliefKey].stance + shift));
        ally.data.beliefs[beliefKey].confidence = Math.min(1, ally.data.beliefs[beliefKey].confidence + 0.05);
      }
      break;
    }
    case 'gather_intel': {
      // Spy discovers information about a rival faction
      let rivals = graph.getEdgesByType('RIVALRY')
        .filter(e => e.from === d.faction || e.to === d.faction)
        .map(e => e.from === d.faction ? e.to : e.from);
      if (rivals.length > 0) {
        let target = rivals[Math.floor(Math.random() * rivals.length)];
        graph.addEdge(d.faction, target, 'HAS_INTEL', 0.3 + d.skills.espionage * 0.5, {
          quality: d.skills.espionage,
          turn: graph.turn,
          source: agentId,
        });
      }
      break;
    }
    // Other actions modify graph state similarly...
  }
}

// ─── TURN PROCESSOR ─────────────────────────────────────────────────
// Run all agents through their decision cycle

function processAgentTurn(graph) {
  graph.turn++;

  let agents = graph.getNodesByType('agent');
  let turnLog = [];

  for (let agent of agents) {
    if (!agent.data.alive) continue;

    // 1. PERCEIVE
    let events = agentPerceive(agent.id, graph);

    // 2. UPDATE BELIEFS
    agentUpdateBeliefs(agent.id, events, graph);

    // 3. DECIDE
    let action = agentDecide(agent.id, graph);

    // 4. ACT
    if (action && action.type !== 'idle') {
      agentAct(agent.id, action, graph);
      turnLog.push({
        agent: agent.data.name,
        role: agent.data.roleName,
        faction: agent.data.faction,
        action: action.type,
        target: action.target,
        reason: action.reason,
        priority: action.priority,
      });
    }
  }

  return turnLog;
}

// ─── FACTION INITIALIZATION ─────────────────────────────────────────
// Spawn starting agents for each faction

function spawnFactionAgents(factionId, graph) {
  let agents = [];

  // Every faction gets a balanced council
  let composition = [
    { role: 'senator', count: 3 },
    { role: 'merchant', count: 2 },
    { role: 'general', count: 2 },
    { role: 'admiral', count: 1 },
    { role: 'priest', count: 1 },
    { role: 'spy', count: 1 },
    { role: 'scholar', count: 1 },
  ];

  // Faction personality modifiers
  let faction = SWARM_FACTIONS[factionId];
  if (!faction) return agents;

  for (let comp of composition) {
    for (let i = 0; i < comp.count; i++) {
      let agentId = createAgent(comp.role, factionId, graph);
      if (agentId) {
        let agent = graph.getNode(agentId);
        // Apply faction personality bias
        switch (faction.personality) {
          case 'expansionist':
            agent.data.militarism = Math.min(1, agent.data.militarism + 0.1);
            agent.data.ambition = Math.min(1, agent.data.ambition + 0.1);
            break;
          case 'mercantile':
            agent.data.greed = Math.min(1, agent.data.greed + 0.15);
            agent.data.militarism = Math.max(0, agent.data.militarism - 0.1);
            break;
          case 'defensive':
            agent.data.loyalty = Math.min(1, agent.data.loyalty + 0.15);
            agent.data.paranoia = Math.min(1, agent.data.paranoia + 0.1);
            break;
          case 'cultural':
            agent.data.religiosity = Math.min(1, agent.data.religiosity + 0.1);
            agent.data.charisma = Math.min(1, agent.data.charisma + 0.1);
            break;
          case 'warrior':
            agent.data.militarism = Math.min(1, agent.data.militarism + 0.2);
            agent.data.riskTolerance = Math.min(1, agent.data.riskTolerance + 0.1);
            break;
          case 'tribal':
            agent.data.loyalty = Math.min(1, agent.data.loyalty + 0.1);
            agent.data.riskTolerance = Math.min(1, agent.data.riskTolerance + 0.15);
            break;
          case 'nomadic':
            agent.data.riskTolerance = Math.min(1, agent.data.riskTolerance + 0.15);
            agent.data.ambition = Math.min(1, agent.data.ambition + 0.1);
            break;
          case 'imperial':
            agent.data.ambition = Math.min(1, agent.data.ambition + 0.15);
            agent.data.greed = Math.min(1, agent.data.greed + 0.1);
            break;
        }
        agents.push(agentId);
      }
    }
  }

  // Create initial trust relationships between agents in same faction
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      let trust = 0.2 + Math.random() * 0.4; // 0.2 to 0.6 initial trust
      graph.addEdge(agents[i], agents[j], 'TRUSTS', trust, { since: 0 });
      graph.addEdge(agents[j], agents[i], 'TRUSTS', trust + (Math.random() - 0.5) * 0.2, { since: 0 });
    }
  }

  return agents;
}

// Initialize all factions
function initAllFactionAgents(graph) {
  let allAgents = {};
  for (let fid in SWARM_FACTIONS) {
    allAgents[fid] = spawnFactionAgents(fid, graph);
  }
  console.log(`[SWARM] Initialized ${Object.values(allAgents).flat().length} agents across ${Object.keys(allAgents).length} factions`);
  return allAgents;
}
