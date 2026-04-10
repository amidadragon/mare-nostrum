// swarm-integration.js — Wires Mediterranean map + WorldGraph + Agent system
// into the existing Mare Nostrum game loop. Adds 'swarm' gameScreen mode.

// ═══════════════════════════════════════════════════════════════════════════
// SWARM STATE
// ═══════════════════════════════════════════════════════════════════════════

let swarmState = {
  initialized: false,
  turn: 0,
  turnTimer: 0,
  turnInterval: 180, // frames between agent turns (~3 sec at 60fps)
  speed: 1,          // 0=paused, 1=normal, 2=fast, 3=ultra
  selectedCity: null,
  selectedFaction: null,
  selectedAgent: null,
  showPanel: 'map',  // 'map' | 'council' | 'intel' | 'chronicle'
  chronicle: [],     // narrative log of events
  hoveredCity: null,
  playerFaction: 'rome', // faction the player is advising
  turnLog: [],       // last turn's agent actions
  notifications: [], // on-screen event notifications
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initSwarmMode(playerFaction) {
  playerFaction = playerFaction || 'rome';

  // Set up map dimensions based on current canvas
  MED_MAP.canvasW = width;
  MED_MAP.canvasH = height;

  // Initialize world graph
  worldGraph = initWorldGraph();

  // Spawn all faction agents (~88 agents)
  initAllFactionAgents(worldGraph);

  // Reset camera
  if (typeof resetMapCamera === 'function') resetMapCamera();

  // Set swarm state
  swarmState.initialized = true;
  swarmState.turn = 0;
  swarmState.turnTimer = 0;
  swarmState.playerFaction = playerFaction;
  swarmState.chronicle = [];
  swarmState.selectedCity = null;
  swarmState.selectedAgent = null;
  swarmState.notifications = [];

  // Add initial chronicle entry
  addChronicleEntry('The Senate convenes. The Mediterranean awaits.', 'system');

  // Log stats
  let stats = worldGraph.stats();
  console.log('[SWARM] World initialized:', stats);
  console.log('[SWARM] Nodes:', stats.totalNodes, '| Edges:', stats.totalEdges);
  console.log('[SWARM] Node types:', stats.nodeTypes);
  console.log('[SWARM] Edge types:', stats.edgeTypes);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DRAW LOOP (called from sketch.js draw() when gameScreen === 'swarm')
// ═══════════════════════════════════════════════════════════════════════════

function drawSwarmMode() {
  if (!swarmState.initialized) return;

  background(18, 28, 48); // Deep Mediterranean sea blue

  // ─── Update camera smoothing ───
  if (typeof updateMapCamera === 'function') updateMapCamera();

  // ─── Process agent turns ───
  if (swarmState.speed > 0) {
    swarmState.turnTimer++;
    let interval = swarmState.turnInterval / swarmState.speed;
    if (swarmState.turnTimer >= interval) {
      swarmState.turnTimer = 0;
      processSwarmTurn();
    }
  }

  // ─── Draw the Mediterranean map ───
  if (typeof drawMediterraneanMap === 'function') {
    drawMediterraneanMap();
  }

  // ─── Draw agent activity indicators on map ───
  drawAgentActivity();

  // ─── Draw UI overlays ───
  drawSwarmHUD();
  drawSwarmPanels();
  drawSwarmNotifications();

  // ─── Draw cursor ───
  cursor(ARROW);
}

// ═══════════════════════════════════════════════════════════════════════════
// TURN PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

function processSwarmTurn() {
  if (!worldGraph) return;

  // processAgentTurn increments graph.turn itself
  let turnLog = processAgentTurn(worldGraph);
  swarmState.turn = worldGraph.turn;
  swarmState.turnLog = turnLog;

  // Process significant events into chronicle
  // turnLog entries: { agent, role, faction, action (string), target, reason, priority }
  for (let entry of turnLog) {
    // Only chronicle higher-priority actions
    if (entry.priority && entry.priority > 0.4) {
      let msg = formatAgentAction(entry.agent, entry.faction, entry.action, entry.target);
      if (msg) {
        addChronicleEntry(msg, entry.faction);
        // High-priority events become notifications
        if (entry.priority > 0.7) {
          addSwarmScreenNotification(msg, entry.faction);
        }
      }
    }
  }

  // Update faction economics every 5 turns
  if (swarmState.turn % 5 === 0) {
    updateFactionEconomics();
  }
}

function updateFactionEconomics() {
  if (!worldGraph) return;
  for (let fid in SWARM_FACTIONS) {
    let fNode = worldGraph.getNode(fid);
    if (!fNode) continue;
    let income = worldGraph.factionEconomicPower(fid);
    fNode.data.gold = (fNode.data.gold || 0) + income;
  }
}

function formatAgentAction(name, factionId, actionType, target) {
  let fName = SWARM_FACTIONS[factionId] ? SWARM_FACTIONS[factionId].name : 'Unknown';
  let targetName = target && SWARM_FACTIONS[target] ? SWARM_FACTIONS[target].name : (target || 'a rival');
  switch (actionType) {
    case 'lobby_war':
      return `${name} of ${fName} speaks for war against ${targetName}`;
    case 'lobby_peace':
      return `${name} of ${fName} counsels peace`;
    case 'propose_trade':
      return `${name} of ${fName} proposes a new trade agreement`;
    case 'lobby_embargo':
      return `${name} of ${fName} demands an embargo`;
    case 'recruit_army':
      return `${name} of ${fName} raises new troops`;
    case 'plan_campaign':
      return `${name} of ${fName} plans a military campaign`;
    case 'gather_intel':
      return `${name} of ${fName} dispatches spies`;
    case 'plot_betrayal':
      return `${name} of ${fName} plots in the shadows...`;
    case 'call_for_omens':
      return `${name} of ${fName} reads the omens`;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT ACTIVITY VISUALIZATION (dots/lines on map showing agent actions)
// ═══════════════════════════════════════════════════════════════════════════

function drawAgentActivity() {
  if (!worldGraph) return;

  push();
  scale(medCam.zoom);
  translate(-width / 2 + medCam.x, -height / 2 + medCam.y);

  // Draw trade route activity
  let tradeEdges = worldGraph.getEdgesByType('TRADES_WITH');
  for (let e of tradeEdges) {
    let fA = SWARM_FACTIONS[e.from];
    let fB = SWARM_FACTIONS[e.to];
    if (!fA || !fB) continue;
    let cityA = MED_CITIES[fA.capital];
    let cityB = MED_CITIES[fB.capital];
    if (!cityA || !cityB) continue;

    let posA = MED_MAP.toScreen(cityA.lat, cityA.lon);
    let posB = MED_MAP.toScreen(cityB.lat, cityB.lon);

    // Animated trade pulse
    let t = (millis() / 2000 + e.id * 0.3) % 1;
    let pulseX = lerp(posA.x, posB.x, t);
    let pulseY = lerp(posA.y, posB.y, t);

    stroke(220, 190, 60, 40);
    strokeWeight(max(0.5, 1 / medCam.zoom));
    line(posA.x, posA.y, posB.x, posB.y);

    // Trade pulse dot
    noStroke();
    fill(255, 220, 80, 120);
    let dotR = max(2, 3 / medCam.zoom);
    ellipse(pulseX, pulseY, dotR, dotR);
  }

  // Draw military tension indicators (pulsing red between rival factions)
  let rivalries = worldGraph.getEdgesByType('RIVALRY');
  for (let e of rivalries) {
    let fA = SWARM_FACTIONS[e.from];
    let fB = SWARM_FACTIONS[e.to];
    if (!fA || !fB) continue;
    let cityA = MED_CITIES[fA.capital];
    let cityB = MED_CITIES[fB.capital];
    if (!cityA || !cityB) continue;

    let posA = MED_MAP.toScreen(cityA.lat, cityA.lon);
    let posB = MED_MAP.toScreen(cityB.lat, cityB.lon);

    let pulse = (sin(millis() / 800 + e.id) + 1) * 0.5;
    stroke(180, 40, 40, 15 + pulse * 25);
    strokeWeight(max(0.5, 1.5 / medCam.zoom));
    // Dashed line effect
    let steps = 12;
    for (let i = 0; i < steps; i += 2) {
      let t1 = i / steps;
      let t2 = (i + 1) / steps;
      line(
        lerp(posA.x, posB.x, t1), lerp(posA.y, posB.y, t1),
        lerp(posA.x, posB.x, t2), lerp(posA.y, posB.y, t2)
      );
    }
  }

  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// HUD — Top bar with turn counter, faction gold, speed controls
// ═══════════════════════════════════════════════════════════════════════════

function drawSwarmHUD() {
  push();
  // Top bar background
  noStroke();
  fill(10, 12, 20, 220);
  rect(0, 0, width, 44);
  // Gold line
  stroke(180, 150, 50, 100);
  strokeWeight(1);
  line(0, 44, width, 44);
  noStroke();

  textAlign(LEFT, CENTER);
  textFont('Cinzel, Georgia, serif');

  // Turn counter
  textSize(14);
  fill(244, 213, 141);
  text('TURN ' + swarmState.turn, 16, 22);

  // Year display (each turn = ~1 month, starting 264 BC — First Punic War)
  let startYear = 264;
  let monthsElapsed = swarmState.turn;
  let yearsElapsed = floor(monthsElapsed / 12);
  let currentYear = startYear - yearsElapsed;
  let yearStr = currentYear > 0 ? currentYear + ' BC' : (1 - currentYear) + ' AD';
  textSize(11);
  fill(180, 160, 120);
  text(yearStr, 110, 22);

  // Speed controls
  let speedLabels = ['⏸', '▶', '▶▶', '▶▶▶'];
  let speedX = 220;
  textSize(12);
  for (let i = 0; i < speedLabels.length; i++) {
    let sx = speedX + i * 40;
    let hovered = mouseX > sx - 5 && mouseX < sx + 30 && mouseY > 5 && mouseY < 39;
    if (swarmState.speed === i) {
      fill(255, 220, 80);
    } else if (hovered) {
      fill(200, 180, 130);
      cursor(HAND);
    } else {
      fill(120, 110, 90);
    }
    text(speedLabels[i], sx, 22);
  }

  // Player faction info (right side)
  let pFaction = SWARM_FACTIONS[swarmState.playerFaction];
  let pNode = worldGraph ? worldGraph.getNode(swarmState.playerFaction) : null;
  if (pFaction && pNode) {
    textAlign(RIGHT, CENTER);
    // Faction name
    textSize(13);
    fill(pFaction.color[0], pFaction.color[1], pFaction.color[2]);
    text(pFaction.name, width - 120, 16);
    // Gold
    textSize(11);
    fill(220, 190, 60);
    text('⚜ ' + floor(pNode.data.gold || 0), width - 120, 32);
    // Military + Economic power
    textSize(10);
    fill(180, 160, 120);
    let milStr = worldGraph.factionMilitaryStrength(swarmState.playerFaction);
    let econStr = worldGraph.factionEconomicPower(swarmState.playerFaction);
    text('⚔ ' + milStr + '  ⛵ ' + econStr, width - 16, 22);
  }

  // Panel tabs
  textAlign(CENTER, CENTER);
  textSize(11);
  let tabs = [
    { id: 'map', label: 'MAP' },
    { id: 'council', label: 'COUNCIL' },
    { id: 'intel', label: 'INTEL' },
    { id: 'chronicle', label: 'CHRONICLE' },
  ];
  let tabW = 80;
  let tabStartX = width / 2 - (tabs.length * tabW) / 2;
  for (let i = 0; i < tabs.length; i++) {
    let tx = tabStartX + i * tabW + tabW / 2;
    let isActive = swarmState.showPanel === tabs[i].id;
    let hovered = mouseX > tx - tabW / 2 && mouseX < tx + tabW / 2 && mouseY > 5 && mouseY < 39;

    if (isActive) {
      fill(50, 42, 30);
      noStroke();
      rect(tx - tabW / 2 + 2, 30, tabW - 4, 14, 2, 2, 0, 0);
      fill(255, 220, 80);
    } else if (hovered) {
      fill(200, 180, 130);
      cursor(HAND);
    } else {
      fill(120, 110, 90);
    }
    text(tabs[i].label, tx, 22);
  }

  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// PANELS — Council, Intel, Chronicle side panels
// ═══════════════════════════════════════════════════════════════════════════

function drawSwarmPanels() {
  if (swarmState.showPanel === 'map') {
    // Draw selected city info if any
    if (swarmState.selectedCity) {
      drawCityInfoPanel();
    }
    return;
  }

  // Side panel (right side)
  let panW = min(340, width * 0.3);
  let panX = width - panW;
  let panY = 48;
  let panH = height - panY;

  push();
  // Panel background
  fill(12, 14, 22, 230);
  noStroke();
  rect(panX, panY, panW, panH);
  // Gold border
  stroke(120, 100, 50, 80);
  strokeWeight(1);
  line(panX, panY, panX, height);
  noStroke();

  if (swarmState.showPanel === 'council') {
    drawCouncilPanel(panX, panY, panW, panH);
  } else if (swarmState.showPanel === 'intel') {
    drawIntelPanel(panX, panY, panW, panH);
  } else if (swarmState.showPanel === 'chronicle') {
    drawChroniclePanel(panX, panY, panW, panH);
  }
  pop();
}

function drawCityInfoPanel() {
  let city = MED_CITIES[swarmState.selectedCity];
  if (!city) return;
  let cNode = worldGraph ? worldGraph.getNode(swarmState.selectedCity) : null;

  let panW = 240;
  let panH = 180;
  let panX = 12;
  let panY = 52;

  push();
  fill(12, 14, 22, 230);
  stroke(120, 100, 50, 80);
  strokeWeight(1);
  rect(panX, panY, panW, panH, 4);
  noStroke();

  textAlign(LEFT, TOP);
  textFont('Cinzel, Georgia, serif');
  let tx = panX + 12;
  let ty = panY + 12;

  // City name
  textSize(14);
  fill(244, 213, 141);
  text(city.name, tx, ty);
  ty += 22;

  // Type & faction
  textSize(10);
  fill(180, 160, 120);
  let fac = city.faction ? SWARM_FACTIONS[city.faction] : null;
  text((city.type || 'city').toUpperCase() + (fac ? ' — ' + fac.name : ''), tx, ty);
  ty += 16;

  if (cNode) {
    // Population
    fill(160, 150, 130);
    text('Population: ' + (cNode.data.population || '?'), tx, ty); ty += 14;
    text('Income: ' + (cNode.data.income || 0) + ' gold/turn', tx, ty); ty += 14;
    text('Defense: ' + '■'.repeat(cNode.data.defenseLevel || 1), tx, ty); ty += 14;
    text('Morale: ' + floor((cNode.data.morale || 0.5) * 100) + '%', tx, ty); ty += 14;
    if (city.port) {
      fill(80, 160, 220);
      text('⚓ Port City', tx, ty);
    }
  }
  pop();
}

function drawCouncilPanel(px, py, pw, ph) {
  textAlign(LEFT, TOP);
  textFont('Cinzel, Georgia, serif');
  let tx = px + 14;
  let ty = py + 14;

  // Title
  textSize(13);
  fill(244, 213, 141);
  text('FACTION COUNCIL', tx, ty);
  ty += 24;

  // List agents in player's faction
  if (!worldGraph) return;
  let agents = worldGraph.factionAgents(swarmState.playerFaction);

  textSize(10);
  for (let agent of agents) {
    if (ty > py + ph - 20) break;
    let d = agent.data;
    let roleColor = getRoleColor(d.role);

    // Name & role
    fill(roleColor[0], roleColor[1], roleColor[2]);
    text('■', tx, ty);
    fill(200, 190, 170);
    text(d.name + ' — ' + (d.role || '?').toUpperCase(), tx + 12, ty);
    ty += 14;

    // Key trait bars
    fill(140, 130, 110);
    let traits = ['ambition', 'loyalty', 'militarism'];
    let traitStr = traits.map(t => t.charAt(0).toUpperCase() + ':' + floor((d[t] || 0.5) * 10)).join(' ');
    text(traitStr, tx + 12, ty);
    ty += 16;
  }
}

function drawIntelPanel(px, py, pw, ph) {
  textAlign(LEFT, TOP);
  textFont('Cinzel, Georgia, serif');
  let tx = px + 14;
  let ty = py + 14;

  // Title
  textSize(13);
  fill(244, 213, 141);
  text('INTELLIGENCE', tx, ty);
  ty += 24;

  if (!worldGraph) return;

  // Show diplomatic relations
  textSize(11);
  fill(200, 180, 140);
  text('Diplomatic Relations:', tx, ty);
  ty += 18;

  textSize(10);
  for (let fid in SWARM_FACTIONS) {
    if (fid === swarmState.playerFaction) continue;
    if (ty > py + ph - 40) break;

    let fac = SWARM_FACTIONS[fid];
    let rel = getRelationStatus(swarmState.playerFaction, fid);
    let strength = worldGraph.relationshipStrength(swarmState.playerFaction, fid);

    fill(fac.color[0], fac.color[1], fac.color[2]);
    text('■', tx, ty);
    fill(180, 170, 150);
    text(fac.name, tx + 14, ty);

    // Relation status
    let relColor = rel === 'ALLIED' ? [60, 180, 80] :
                   rel === 'NEUTRAL' ? [180, 180, 100] :
                   rel === 'TENSION' ? [220, 160, 40] :
                   [200, 50, 50];
    fill(relColor[0], relColor[1], relColor[2]);
    text(rel, tx + 100, ty);
    ty += 14;

    // War/peace balance
    let wpb = worldGraph.warPeaceBalance(swarmState.playerFaction, fid);
    fill(140, 130, 110);
    text('War sentiment: ' + floor(wpb.ratio * 100) + '%', tx + 14, ty);
    ty += 16;
  }

  // Potential betrayers
  ty += 8;
  textSize(11);
  fill(200, 60, 60);
  text('⚠ Loyalty Risks:', tx, ty);
  ty += 16;

  let betrayers = worldGraph.findPotentialBetrayers(swarmState.playerFaction);
  textSize(10);
  if (betrayers.length === 0) {
    fill(120, 160, 120);
    text('No immediate threats detected', tx + 8, ty);
  } else {
    for (let b of betrayers.slice(0, 3)) {
      if (ty > py + ph - 20) break;
      fill(200, 120, 80);
      text(b.agent.data.name + ' — Risk: ' + floor(b.betrayalRisk * 100) + '%', tx + 8, ty);
      ty += 14;
    }
  }
}

function drawChroniclePanel(px, py, pw, ph) {
  textAlign(LEFT, TOP);
  textFont('Cinzel, Georgia, serif');
  let tx = px + 14;
  let ty = py + 14;

  // Title
  textSize(13);
  fill(244, 213, 141);
  text('CHRONICLE', tx, ty);
  ty += 24;

  textSize(10);
  // Show chronicle entries (newest first)
  let entries = swarmState.chronicle.slice(-30).reverse();
  for (let entry of entries) {
    if (ty > py + ph - 20) break;

    // Turn number
    fill(100, 90, 70);
    text('[T' + entry.turn + ']', tx, ty);

    // Entry text with faction color
    let fac = SWARM_FACTIONS[entry.faction];
    if (fac) {
      fill(fac.color[0], fac.color[1], fac.color[2], 200);
    } else {
      fill(180, 170, 150);
    }

    // Wrap text within panel
    let lineW = pw - 60;
    let msgX = tx + 40;
    let lines = wrapText(entry.msg, lineW);
    for (let line of lines) {
      if (ty > py + ph - 20) break;
      text(line, msgX, ty);
      ty += 13;
    }
    ty += 4;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — Floating event banners
// ═══════════════════════════════════════════════════════════════════════════

function addSwarmScreenNotification(msg, factionId) {
  swarmState.notifications.push({
    msg,
    factionId,
    timer: 300, // 5 seconds at 60fps
    y: 0,
  });
  // Keep max 4 notifications
  if (swarmState.notifications.length > 4) {
    swarmState.notifications.shift();
  }
}

function drawSwarmNotifications() {
  let ny = 52;
  let cx = width / 2;

  push();
  textAlign(CENTER, CENTER);
  textFont('Cinzel, Georgia, serif');
  textSize(11);

  for (let i = swarmState.notifications.length - 1; i >= 0; i--) {
    let n = swarmState.notifications[i];
    n.timer--;
    if (n.timer <= 0) {
      swarmState.notifications.splice(i, 1);
      continue;
    }

    let alpha = n.timer > 60 ? 220 : floor(220 * (n.timer / 60));
    let fac = SWARM_FACTIONS[n.factionId];
    let barColor = fac ? fac.color : [180, 170, 150];

    // Background
    let tw = textWidth(n.msg) + 40;
    fill(15, 18, 28, alpha);
    noStroke();
    rect(cx - tw / 2, ny, tw, 26, 3);

    // Left accent bar
    fill(barColor[0], barColor[1], barColor[2], alpha);
    rect(cx - tw / 2, ny, 3, 26, 3, 0, 0, 3);

    // Text
    fill(230, 220, 200, alpha);
    text(n.msg, cx, ny + 13);

    ny += 30;
  }
  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function addChronicleEntry(msg, factionId) {
  swarmState.chronicle.push({
    turn: swarmState.turn,
    msg,
    faction: factionId || null,
    time: millis(),
  });
}

function getRelationStatus(factionA, factionB) {
  if (!worldGraph) return 'UNKNOWN';
  // Check all diplomatic edge types
  let types = ['ALLIED', 'NEUTRAL', 'TENSION', 'RIVALRY', 'WAR'];
  for (let t of types) {
    let e = worldGraph.findEdge(factionA, factionB, t) ||
            worldGraph.findEdge(factionB, factionA, t);
    if (e) return t;
  }
  return 'NEUTRAL';
}

function getRoleColor(role) {
  switch (role) {
    case 'senator': return [200, 180, 60];
    case 'merchant': return [60, 180, 120];
    case 'general': return [200, 60, 60];
    case 'admiral': return [60, 120, 200];
    case 'priest': return [180, 140, 220];
    case 'spy': return [140, 140, 140];
    case 'scholar': return [120, 200, 200];
    default: return [160, 160, 160];
  }
}

function wrapText(str, maxW) {
  let words = str.split(' ');
  let lines = [];
  let current = '';
  for (let w of words) {
    let test = current ? current + ' ' + w : w;
    if (textWidth(test) > maxW && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [str];
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLERS (called from sketch.js input routing)
// ═══════════════════════════════════════════════════════════════════════════

function swarmMousePressed() {
  if (mouseY < 44) {
    // HUD clicks
    // Speed buttons
    let speedX = 220;
    for (let i = 0; i < 4; i++) {
      let sx = speedX + i * 40;
      if (mouseX > sx - 5 && mouseX < sx + 30 && mouseY > 5 && mouseY < 39) {
        swarmState.speed = i;
        return;
      }
    }
    // Tab clicks
    let tabs = ['map', 'council', 'intel', 'chronicle'];
    let tabW = 80;
    let tabStartX = width / 2 - (tabs.length * tabW) / 2;
    for (let i = 0; i < tabs.length; i++) {
      let tx = tabStartX + i * tabW;
      if (mouseX > tx && mouseX < tx + tabW) {
        swarmState.showPanel = tabs[i];
        return;
      }
    }
    return;
  }

  // Map click — check for city selection
  if (typeof getCityAtScreen === 'function') {
    let cityId = getCityAtScreen(mouseX, mouseY);
    if (cityId) {
      swarmState.selectedCity = cityId;
      swarmState.showPanel = 'map';
      return;
    }
  }

  // Start map drag
  if (typeof handleMapMousePressed === 'function') {
    handleMapMousePressed(mouseX, mouseY);
  }

  // Deselect city if clicking on open sea
  swarmState.selectedCity = null;
}

function swarmMouseDragged() {
  if (typeof handleMapMouseDragged === 'function') {
    handleMapMouseDragged(mouseX, mouseY);
  }
}

function swarmMouseReleased() {
  if (typeof handleMapMouseReleased === 'function') {
    handleMapMouseReleased();
  }
}

function swarmMouseWheel(delta) {
  if (typeof handleMapMouseWheel === 'function') {
    handleMapMouseWheel(delta);
  }
}

function swarmKeyPressed(k, kc) {
  // ESC — back to menu
  if (kc === 27) {
    gameScreen = 'menu';
    return;
  }
  // Space — toggle pause
  if (k === ' ') {
    swarmState.speed = swarmState.speed === 0 ? 1 : 0;
    return;
  }
  // 1-3 — speed
  if (k === '1') swarmState.speed = 1;
  if (k === '2') swarmState.speed = 2;
  if (k === '3') swarmState.speed = 3;
  // Tab panels
  if (k === 'm' || k === 'M') swarmState.showPanel = 'map';
  if (k === 'c' || k === 'C') swarmState.showPanel = 'council';
  if (k === 'n' || k === 'N') swarmState.showPanel = 'intel';
  if (k === 'h' || k === 'H') swarmState.showPanel = 'chronicle';
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND SWARM ENGINE — runs alongside the main game (not as separate screen)
// ═══════════════════════════════════════════════════════════════════════════
// This is the V2 integration layer. The swarm agents run in the background,
// making decisions that affect faction AI, diplomacy, and world events.
// The player sees the effects through the existing game systems.

let _swarmBgState = {
  initialized: false,
  turnTimer: 0,
  turnInterval: 300, // frames between swarm turns (~5 sec at 60fps)
  lastTurnLog: [],
  factionMapping: {
    // Map game faction keys to swarm faction keys
    // (they may differ — game uses 8 factions, swarm uses 8 but with different keys)
    rome: 'rome',
    carthage: 'carthage',
    egypt: 'egypt',
    greece: 'greece',
    persia: 'seleucid',     // game's 'persia' maps to swarm's 'seleucid'
    phoenicia: 'iberia',     // placeholder mapping
    gaul: 'gaul',
    seapeople: 'numidia',   // placeholder mapping
  },
};

/**
 * Initialize the swarm engine as a background system.
 * Called automatically when WorldState is ready.
 */
function initSwarmBackground(playerFaction) {
  if (_swarmBgState.initialized) return;
  if (typeof initWorldGraph !== 'function') return;
  if (typeof initAllFactionAgents !== 'function') return;

  playerFaction = playerFaction || state.faction || 'rome';

  // Set up map dimensions
  if (typeof MED_MAP !== 'undefined') {
    MED_MAP.canvasW = width || 1280;
    MED_MAP.canvasH = height || 800;
  }

  // Initialize world graph (creates faction nodes, city nodes, edges)
  worldGraph = initWorldGraph();

  // Spawn 88 agents across all factions
  initAllFactionAgents(worldGraph);

  // Sync initial state from WorldState into the graph
  syncWorldStateToGraph();

  _swarmBgState.initialized = true;
  _swarmBgState.turnTimer = 0;

  let stats = worldGraph.stats();
  console.log('[SWARM-BG] Background swarm initialized:', stats.totalNodes, 'nodes,', stats.totalEdges, 'edges');
}

/**
 * Sync game state (from WorldState) into the swarm graph.
 * Updates faction gold, military, relations based on actual game data.
 */
function syncWorldStateToGraph() {
  if (!worldGraph) return;
  if (typeof WorldState === 'undefined' || !WorldState.initialized) return;

  for (let gameKey in _swarmBgState.factionMapping) {
    let swarmKey = _swarmBgState.factionMapping[gameKey];
    let fNode = worldGraph.getNode(swarmKey);
    if (!fNode) continue;

    // Read from WorldState if it's a registered island
    let isle = WorldState.getIsland(gameKey);
    if (isle) {
      let nationRef = isle.nationRef;
      if (nationRef) {
        fNode.data.gold = nationRef.gold || 0;
        fNode.data.military = nationRef.military || 0;
        fNode.data.population = nationRef.population || 5;
        fNode.data.level = nationRef.level || 1;
        fNode.data.defeated = !!nationRef.defeated;
      }
      // Also sync from island state
      let armySize = WorldState.getArmySize(gameKey);
      if (armySize > 0) fNode.data.military = armySize;
    }
  }
}

/**
 * Process one swarm turn in the background.
 * Agent decisions get translated into game actions.
 */
function processSwarmBackgroundTurn() {
  if (!worldGraph) return;

  // Sync current game state into graph
  syncWorldStateToGraph();

  // Run agent turn
  let turnLog = processAgentTurn(worldGraph);
  _swarmBgState.lastTurnLog = turnLog;

  // Translate agent actions into game effects
  for (let entry of turnLog) {
    if (entry.priority && entry.priority > 0.3) {
      applySwarmActionToGame(entry);
    }
  }
}

// ─── Swarm Event Log (for diplomacy panel display) ──────────────────────
// Keyed by game faction. Each entry: { text, turn, type, time }
let _swarmFactionEvents = {};
const _SWARM_MAX_FACTION_EVENTS = 12;

function _logSwarmFactionEvent(gameKey, text, type) {
  if (!_swarmFactionEvents[gameKey]) _swarmFactionEvents[gameKey] = [];
  _swarmFactionEvents[gameKey].push({
    text: text,
    type: type || 'info',
    turn: _swarmBgState.turnTimer || 0,
    time: Date.now()
  });
  if (_swarmFactionEvents[gameKey].length > _SWARM_MAX_FACTION_EVENTS) {
    _swarmFactionEvents[gameKey].shift();
  }
}

/**
 * Get recent swarm events for a specific game faction (used by diplomacy panel).
 */
function getSwarmFactionEvents(gameKey) {
  return _swarmFactionEvents[gameKey] || [];
}

// Pretty faction names for notifications
function _factionDisplayName(gameKey) {
  let names = {
    rome: 'Rome', carthage: 'Carthage', egypt: 'Egypt', greece: 'Greece',
    persia: 'Persia', phoenicia: 'Phoenicia', gaul: 'Gaul', seapeople: 'Sea Peoples'
  };
  return names[gameKey] || gameKey;
}

// Notification colors per action type
function _swarmNotifColor(action) {
  switch (action) {
    case 'recruit_army': return '#cc9944';
    case 'lobby_war': return '#cc3333';
    case 'lobby_peace': return '#44aa66';
    case 'propose_trade': return '#44aacc';
    case 'plan_campaign': return '#cc6633';
    case 'plot_betrayal': return '#aa44cc';
    case 'call_for_omens': return '#cccc44';
    default: return '#d4a040';
  }
}

/**
 * Translate a swarm agent action into a game effect.
 * This bridges between the abstract swarm decisions and the concrete game systems.
 * Phase 2: also fires visible notifications for significant events.
 */
function applySwarmActionToGame(entry) {
  if (!state || !state.nations) return;

  let gameKey = null;
  // Find the game faction key for this swarm faction
  for (let gk in _swarmBgState.factionMapping) {
    if (_swarmBgState.factionMapping[gk] === entry.faction) {
      gameKey = gk;
      break;
    }
  }
  if (!gameKey || !state.nations[gameKey]) return;
  let nation = state.nations[gameKey];
  let fName = _factionDisplayName(gameKey);

  switch (entry.action) {
    case 'recruit_army':
      // Boost military slightly
      if (nation.gold >= 10) {
        nation.military = (nation.military || 0) + 1;
        nation.gold -= 10;
        if (entry.priority > 0.6) {
          _logSwarmFactionEvent(gameKey, fName + ' recruits soldiers', 'military');
          if (typeof addNotification === 'function') {
            addNotification(fName + ' recruits troops!', _swarmNotifColor('recruit_army'));
          }
        }
      }
      break;

    case 'lobby_war': {
      // Decrease relations with target faction
      let targetGameKey = null;
      for (let gk in _swarmBgState.factionMapping) {
        if (_swarmBgState.factionMapping[gk] === entry.target) {
          targetGameKey = gk;
          break;
        }
      }
      if (targetGameKey && nation.relations && nation.relations[targetGameKey] !== undefined) {
        nation.relations[targetGameKey] = Math.max(-100, (nation.relations[targetGameKey] || 0) - 5);
        let tName = _factionDisplayName(targetGameKey);
        _logSwarmFactionEvent(gameKey, fName + ' agitates against ' + tName, 'war');
        _logSwarmFactionEvent(targetGameKey, fName + ' stirs hostility', 'war');
        if (entry.priority > 0.5 && typeof addNotification === 'function') {
          addNotification(fName + ' agitates against ' + tName + '!', _swarmNotifColor('lobby_war'));
        }
      }
      break;
    }

    case 'lobby_peace': {
      // Increase relations with all non-war factions
      if (nation.relations) {
        for (let k in nation.relations) {
          if (nation.relations[k] < 50) {
            nation.relations[k] = Math.min(100, nation.relations[k] + 2);
          }
        }
        _logSwarmFactionEvent(gameKey, fName + ' seeks peace', 'peace');
        if (entry.priority > 0.6 && typeof addNotification === 'function') {
          addNotification(fName + ' seeks peace with neighbors.', _swarmNotifColor('lobby_peace'));
        }
      }
      break;
    }

    case 'propose_trade': {
      // Boost gold through trade
      nation.gold = (nation.gold || 0) + 5;
      // Also boost target
      let targetGameKey = null;
      for (let gk in _swarmBgState.factionMapping) {
        if (_swarmBgState.factionMapping[gk] === entry.target) {
          targetGameKey = gk;
          break;
        }
      }
      if (targetGameKey && state.nations[targetGameKey]) {
        state.nations[targetGameKey].gold = (state.nations[targetGameKey].gold || 0) + 3;
        let tName = _factionDisplayName(targetGameKey);
        _logSwarmFactionEvent(gameKey, fName + ' trades with ' + tName, 'trade');
        _logSwarmFactionEvent(targetGameKey, tName + ' receives trade from ' + fName, 'trade');
        if (entry.priority > 0.5 && typeof addNotification === 'function') {
          addNotification(fName + ' trades with ' + tName + '.', _swarmNotifColor('propose_trade'));
        }
      }
      break;
    }

    case 'plan_campaign': {
      // Increase military readiness (preparation for invasion)
      nation._campaignReady = (nation._campaignReady || 0) + 1;
      _logSwarmFactionEvent(gameKey, fName + ' prepares for war', 'military');
      // Only notify when campaign fully ready (3+ preparations)
      if (nation._campaignReady >= 3 && typeof addNotification === 'function') {
        addNotification(fName + ' is ready for war!', _swarmNotifColor('plan_campaign'));
        nation._campaignReady = 0; // reset after notification
      }
      break;
    }

    case 'gather_intel': {
      // No direct game effect — intel is tracked in the graph
      _logSwarmFactionEvent(gameKey, fName + ' gathers intelligence', 'intel');
      break;
    }

    case 'plot_betrayal': {
      // Can trigger alliance breaks later
      nation._betrayalPlots = (nation._betrayalPlots || 0) + 1;
      _logSwarmFactionEvent(gameKey, fName + ' plots betrayal...', 'betrayal');
      if (nation._betrayalPlots >= 3 && typeof addNotification === 'function') {
        addNotification('Rumors of treachery within ' + fName + '!', _swarmNotifColor('plot_betrayal'));
        nation._betrayalPlots = 0;
      }
      break;
    }

    case 'call_for_omens': {
      // Small morale boost
      if (nation.islandState && nation.islandState.legia) {
        nation.islandState.legia.morale = Math.min(100, (nation.islandState.legia.morale || 80) + 5);
      }
      _logSwarmFactionEvent(gameKey, fName + ' consults the oracles', 'omens');
      if (entry.priority > 0.7 && typeof addNotification === 'function') {
        addNotification(fName + ' receives a divine omen!', _swarmNotifColor('call_for_omens'));
      }
      break;
    }
  }
}

/**
 * Called every frame from the main game loop to tick the background swarm.
 * Add this call to drawInner() or updateIslandSystems().
 */
function updateSwarmBackground(dt) {
  if (!_swarmBgState.initialized) {
    // Try to init if WorldState is ready
    if (typeof WorldState !== 'undefined' && WorldState.initialized) {
      initSwarmBackground(state.faction);
    }
    return;
  }

  _swarmBgState.turnTimer++;
  if (_swarmBgState.turnTimer >= _swarmBgState.turnInterval) {
    _swarmBgState.turnTimer = 0;
    processSwarmBackgroundTurn();
  }
}

/**
 * Get the latest swarm events for UI display (chronicle, notifications).
 */
function getSwarmEvents() {
  return _swarmBgState.lastTurnLog || [];
}

/**
 * Check if swarm background is running.
 */
function isSwarmActive() {
  return _swarmBgState.initialized;
}
