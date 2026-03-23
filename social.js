// MARE NOSTRUM — Bottles, Codex, Journal, Visitors, Temple Court
// ─── MESSAGE BOTTLES & TREASURE ──────────────────────────────────────────
const BOTTLE_MESSAGES = [
  { msg: 'Beneath the oldest tree, riches sleep...', reward: 'gold', qty: 20 },
  { msg: 'The temple guards a crystalline secret.', reward: 'crystals', qty: 5 },
  { msg: 'Where water meets stone, seeds take root.', reward: 'seeds', qty: 10 },
  { msg: 'The merchant hid his finest grape cuttings here.', reward: 'grapeSeeds', qty: 5 },
  { msg: 'An ancient Roman buried olive branches...', reward: 'oliveSeeds', qty: 5 },
  { msg: 'Neptune left a gift in the shallows.', reward: 'fish', qty: 8 },
  { msg: 'Vulcan\'s forge once burned here — stone remains.', reward: 'stone', qty: 15 },
  { msg: 'A woodcutter\'s hidden cache!', reward: 'wood', qty: 20 },
];

function spawnBottle() {
  // Place bottle on island edge (south side, near water)
  let angle = random(-0.8, 0.8); // mostly south
  let cx = WORLD.islandCX, cy = WORLD.islandCY;
  let bx = cx + cos(PI / 2 + angle) * (WORLD.islandRX - 20);
  let by = cy + sin(PI / 2 + angle) * (WORLD.islandRY - 10);

  let msgData = BOTTLE_MESSAGES[floor(random(BOTTLE_MESSAGES.length))];
  // Treasure location: random spot on island
  let tx = cx + random(-WORLD.islandRX * 0.6, WORLD.islandRX * 0.6);
  let ty = cy + random(-WORLD.islandRY * 0.5, WORLD.islandRY * 0.5);

  state.bottles.push({
    x: bx, y: by, collected: false,
    message: msgData.msg,
    treasure: { type: msgData.reward, qty: msgData.qty, x: tx, y: ty, found: false },
    bobPhase: random(TWO_PI),
  });
}

function collectBottle(bottle) {
  bottle.collected = true;
  state.activeTreasure = bottle.treasure;
  addFloatingText(w2sX(bottle.x), w2sY(bottle.y) - 20, 'Found a bottle!', '#44ccff');
  addFloatingText(width / 2, height * 0.3, '"' + bottle.message + '"', '#ffddaa');
  spawnParticles(bottle.x, bottle.y, 'build', 8);
}

function digTreasure() {
  let t = state.activeTreasure;
  if (!t || t.found) return false;
  let pd = dist(state.player.x, state.player.y, t.x, t.y);
  if (pd < 35) {
    t.found = true;
    state[t.type] = (state[t.type] || 0) + t.qty;
    state.codex.treasuresFound++;
    let _relicMap = { ancientRelic: 'bronze_eagle', crystals: 'crystal_shard', gold: 'ancient_coin', ironOre: 'roman_helm' };
    let _rid = _relicMap[t.type] || 'sea_amphora';
    if (!state.codex.relics) state.codex.relics = {};
    let _isNewRelic = !state.codex.relics[_rid];
    if (!state.codex.relics[_rid]) state.codex.relics[_rid] = { found: true, firstDay: state.day };
    if (_isNewRelic && typeof markCodexDiscovery === 'function') markCodexDiscovery('relics', _rid);
    unlockJournal('relic_found');
    addFloatingText(w2sX(t.x), w2sY(t.y) - 30, 'TREASURE! +' + t.qty + ' ' + t.type, '#ffcc00');
    spawnParticles(state.player.x, state.player.y, 'harvest', 20);
    triggerScreenShake(3, 10);
    state.screenFlash = { r: 255, g: 204, b: 0, alpha: 100, timer: 30 };
    state.activeTreasure = null;
    return true;
  }
  return false;
}

function drawBottles() {
  state.bottles.forEach(b => {
    if (b.collected) return;
    let sx = w2sX(b.x), sy = w2sY(b.y);
    let bob = sin(frameCount * 0.03 + b.bobPhase) * 3;

    push();
    translate(sx, sy + bob);
    // Bottle body
    fill(100, 180, 120, 200);
    noStroke();
    rect(-3, -8, 6, 10, 2);
    // Neck
    fill(90, 170, 110, 200);
    rect(-1.5, -12, 3, 5, 1);
    // Cork
    fill(180, 140, 80);
    rect(-2, -13, 4, 2, 1);
    // Paper inside
    fill(240, 230, 200, 180);
    rect(-1, -6, 2, 5, 0.5);
    // Sparkle
    if (frameCount % 40 < 10) {
      fill(255, 255, 200, 150);
      ellipse(0, -8, 3 + sin(frameCount * 0.1) * 2);
    }
    pop();
  });
}

function drawTreasureHint() {
  let t = state.activeTreasure;
  if (!t || t.found) return;
  // Draw X marker at treasure location
  let sx = w2sX(t.x), sy = w2sY(t.y);
  let pulse = sin(frameCount * 0.06) * 0.3 + 0.7;
  push();
  translate(sx, sy);
  stroke(255, 180, 0, pulse * 200);
  strokeWeight(2);
  line(-6, -6, 6, 6);
  line(-6, 6, 6, -6);
  noStroke();
  fill(255, 200, 50, floor(pulse * 100));
  rect(-8, -1, 16, 2); rect(-1, -8, 2, 16);
  pop();

  // Distance indicator on HUD
  let pd = dist(state.player.x, state.player.y, t.x, t.y);
  let warmth = pd < 30 ? 'DIG HERE! [E]' : pd < 80 ? 'BURNING HOT!' : pd < 150 ? 'Getting warmer...' : 'Cold...';
  let warmColor = pd < 30 ? '#ff4444' : pd < 80 ? '#ffaa00' : pd < 150 ? '#ffcc66' : '#88aacc';
  fill(color(warmColor));
  textAlign(CENTER, CENTER);
  textSize(10);
  text(warmth, width / 2, 72);
}

// ─── VILLA CODEX ─────────────────────────────────────────────────────────
function getCodexCompletion() {
  let c = state.codex;
  let total = 0, done = 0;
  // Fish: 5 types
  total += 5; done += Object.keys(c.fishCaught).length;
  // Crops: 7 types (grain, grape, olive + 4 seasonal)
  total += 7; done += Object.keys(c.cropsGrown).length;
  // Buildings: 20 types (12 base + 8 advanced)
  total += 20; done += Object.keys(c.buildingsBuilt).length;
  // NPC hearts: max 10
  total += 10; done += min(10, c.npcMaxHearts);
  // Treasures: 5+
  total += 5; done += min(5, c.treasuresFound);
  // Festivals: 4 seasons
  total += 4; done += min(4, c.festivalsAttended);
  // Visitors: 5 trades
  total += 5; done += min(5, c.visitorsTraded);
  // Combo: reach 10
  total += 1; done += c.bestCombo >= 10 ? 1 : 0;
  return { done, total, pct: total > 0 ? done / total : 0 };
}

// ─── EXILE'S JOURNAL — STORY ENTRIES ──────────────────────────────────────
const JOURNAL_ENTRIES = [
  { id: 'shipwreck', title: 'The Storm',
    text: 'I remember lightning splitting the mast. The sea swallowed everything — the ship, the crew, my orders from Rome. I woke on sand with salt in my wounds and the sun on my face. Wherever this is, the gods saw fit to spare me.' },
  { id: 'first_harvest', title: 'First Harvest',
    text: 'The soil here is rich — dark and warm. My first grain came up golden within days. Perhaps exile is not punishment but providence. Rome taught me to conquer; this island teaches me to tend.' },
  { id: 'first_building', title: 'Laying Stones',
    text: 'I found cut stone among the ruins — Roman stone, dressed in the old way. Someone built here before me. The mortar crumbled centuries ago, but the foundations hold. I will build upon what they left.' },
  { id: 'npc_friend', title: 'A Familiar Voice',
    text: 'The old man speaks Latin with a provincial accent — Hispania, perhaps. He says his grandfather came here seeking fortune. Three generations on this forgotten shore. "Rome lives in small acts," he told me. I believe him.' },
  { id: 'first_crystal', title: 'The Singing Stones',
    text: 'The crystals hum at dawn. I pressed my ear to one and heard — or imagined — a chorus. The locals call them "Tears of Sol Invictus." They pulse with warmth. Whatever power cursed my voyage, it also blessed this place.' },
  { id: 'first_fish', title: 'Patient Waters',
    text: 'The sea that nearly killed me now feeds me. I sat at the pier for an hour before the first bite. A legionary learns patience in the shield wall; a fisherman learns it in silence. Both keep you alive.' },
  { id: 'terra_nova', title: 'Beyond the Horizon',
    text: 'There is another island to the west — dark with forest, wreathed in mist. The locals avoid it. I see firelight some nights. Whether friend or foe waits there, a soldier must know his surroundings.' },
  { id: 'first_festival', title: 'Feast of Flowers',
    text: 'We held a festival today. Garlands on every post, honey-wine in clay cups. For a moment I forgot I was an exile. The children danced and the old man played a bone flute. Rome celebrates with spectacle; here we celebrate with warmth.' },
  { id: 'five_hearts', title: 'Bonds of Exile',
    text: 'The old man brought me wine today — unprompted, unasked. He said I remind him of his son, lost to fever years ago. We sat and watched the sunset. Exile strips away rank and pretense. What remains is simply human.' },
  { id: 'relic_found', title: 'Relic of the IX',
    text: 'Among the ruins I found a bronze eagle — a legionary standard, tarnished green. "LEG IX FID" stamped on the base. The Ninth Legion, Fidelis. They were posted to Britannia and vanished from history. Did they come here? Did they build all this?' },
  { id: 'night_market', title: 'Merchants of Moonlight',
    text: 'A merchant ship appeared at dusk, lanterns swaying. They trade under moonlight — old superstition, they say. Their wares are strange: amulets from Egypt, spices from the East. The world is wider than Rome knows.' },
  { id: 'temple_prayer', title: 'Prayer to Sol',
    text: 'I rebuilt the temple altar and prayed for the first time since the storm. Not the formal prayers of a legionary — something quieter, more honest. "Let this place be enough." The crystal behind the altar glowed. I choose to believe that was an answer.' },
  { id: 'conquest_settled', title: 'New Foundations',
    text: 'Terra Nova is ours now. Workers clear trees, builders raise walls. It is a pale echo of Roman expansion, but it feels different — we build not to conquer but to shelter. The Ninth would understand, I think. They came here seeking the same.' },
  { id: 'trireme_repair', title: 'Seaworthy Again',
    text: 'With salvaged planks and fraying rope, I have made the trireme passable. Not seaworthy by Roman standards — no centurion would board this wreck willingly. But she floats, the patched sail holds wind, and the oars still pull. That is enough.' },
  { id: 'home_found', title: 'A Shore Remembered',
    text: 'The island appeared through morning haze like a half-forgotten dream. Roman columns on the ridge, an aqueduct spine along the hill. Someone built a life here once. The docks are rotting, the fields are wild, but the bones of a colony remain. This will be home.' },
  { id: 'marcus_found', title: 'The Soldier in the Rubble',
    text: 'I found him pinned under a collapsed archway — still alive, still cursing. Marcus, a legionary like me, shipwrecked in the same storm. His leg was trapped but his spirit was not. "Get me out," he growled, "and I will guard this place with my life." I believed him.' },
  { id: 'vesta_found', title: 'Keeper of the Flame',
    text: 'She was kneeling at the ruined shrine, whispering prayers to dead embers. Vesta, a priestess who kept the sacred flame on a temple ship. The storm took her flame but not her faith. She asked only for crystals to relight it. A small price for divine counsel.' },
  { id: 'felix_found', title: 'The Farmer Who Stayed',
    text: 'Felix was already here — has been for years, he says. A freedman who chose this island over Rome. The fields were his pride before the storm flattened them. He looked at the weeds and laughed. "Weeds just mean the soil is good." I helped him pull the first row.' },
  { id: 'villa_restored', title: 'Villa Nova',
    text: 'Three souls found, three purposes joined. Marcus guards the perimeter. Vesta tends the shrine. Felix turns soil. And I — I am the thread that binds them. The villa is no longer a ruin. Smoke rises from the hearth. This is not exile anymore. This is beginning.' },
  { id: 'lares_awaken', title: 'Spirit of the Hearth',
    text: 'At Vesta\'s urging, I placed crystals on the altar and spoke the old words. The air thickened. A shape formed — luminous, translucent, vaguely human. The Lares, guardian spirit of this place. It drifted to the garden and began to tend the crops. Some help is not of this world.' },
  { id: 'woodcutter_join', title: 'The Axeman Cometh',
    text: 'After felling enough trees to prove my purpose, a figure emerged from the grove — broad-shouldered, silent, axe in hand. Not a ghost. A descendant of the colony, living wild in the forest. He nodded once and began to chop. No words needed between men who work.' },
  { id: 'harvester_join', title: 'Hands for the Harvest',
    text: 'The first ripe grain drew her out — a weathered woman with a woven basket and a sickle worn smooth from years of use. She had been watching from the ruins, waiting to see if we meant to farm or to plunder. My harvest answered her question.' },
  { id: 'centurion_join', title: 'Shield and Sword',
    text: 'Marcus vouched for me to his old comrade — a centurion who survived the wreck and hid in the hills. He appeared at the villa gate in battered armor, saluted, and took his post. "Point me at the enemy," he said. Some soldiers never stop being soldiers.' },
  { id: 'full_codex', title: 'The Whole Story',
    text: 'I have pieced it together from relics, ruins, and the old man\'s stories. The Ninth came here fleeing a plague. They built a colony, raised families, worshipped Sol Invictus under open sky. They did not vanish — they chose to stay. And now, so do I.' },
].concat(typeof NARRATIVE_JOURNAL_ENTRIES !== 'undefined' ? NARRATIVE_JOURNAL_ENTRIES : []);

function unlockJournal(id) {
  if (state.journal.includes(id)) return;
  state.journal.push(id);
  let entry = JOURNAL_ENTRIES.find(e => e.id === id);
  if (entry) {
    addFloatingText(width / 2, height * 0.25, 'Journal: ' + entry.title, '#ddc880');
    spawnParticles(state.player.x, state.player.y, 'divine', 6);
  }
  // Check for full journal completion (all entries except full_codex itself)
  let otherEntries = JOURNAL_ENTRIES.filter(e => e.id !== 'full_codex');
  if (otherEntries.every(e => state.journal.includes(e.id))) {
    unlockJournal('full_codex');
  }
}

// ─── ISLAND VISITORS ─────────────────────────────────────────────────────
const VISITORS = [
  { type: 'pilgrim', name: 'Pilgrim', color: '#ddccaa',
    greeting: 'I have traveled far to see your island...',
    offer: 'I\'ll trade 10 gold for 3 crystals.',
    trade: { give: { gold: 10 }, take: { crystals: 3 } } },
  { type: 'herbalist', name: 'Herbalist', color: '#88cc66',
    greeting: 'These herbs! I\'ve never seen such growth.',
    offer: 'Give me 5 harvest, I\'ll share rare seeds.',
    trade: { give: { harvest: 5 }, take: { grapeSeeds: 3, oliveSeeds: 3 } } },
  { type: 'bard', name: 'Wandering Bard', color: '#cc88ff',
    greeting: 'A song for the isle-keeper!',
    offer: 'A tale for a meal? I know a blessing...',
    trade: { give: { meals: 2 }, take: { blessing: true } } },
  { type: 'collector', name: 'Collector', color: '#ffaa44',
    greeting: 'I collect curiosities from every shore.',
    offer: 'Trade 3 fish for 8 stone and 5 wood?',
    trade: { give: { fish: 3 }, take: { stone: 8, wood: 5 } } },
  { type: 'mystic', name: 'Temple Mystic', color: '#aaddff',
    greeting: 'The stars led me to your shrine...',
    offer: 'An offering of 5 crystals grants a vision.',
    trade: { give: { crystals: 5 }, take: { prophecyRefresh: true } } },
];

function spawnVisitor() {
  let v = VISITORS[floor(random(VISITORS.length))];
  let port = getPortPosition();
  state.visitor = {
    type: v.type, name: v.name, color: v.color,
    greeting: v.greeting, offer: v.offer, trade: v.trade,
    x: port.x - 20, y: port.y - 10,
    timer: 1200, // stays for ~20 seconds at 60fps
    interacted: false, dialogTimer: 0, currentLine: 0,
  };
  addFloatingText(width / 2, height * 0.25, v.name + ' has arrived!', v.color);
}

function tradeWithVisitor() {
  let v = state.visitor;
  if (!v || v.interacted) return;
  // Check player can afford
  for (let [res, amt] of Object.entries(v.trade.give)) {
    if ((state[res] || 0) < amt) {
      addFloatingText(width / 2, height * 0.35, 'Not enough ' + res + '!', '#ff6666');
      return;
    }
  }
  // Pay
  for (let [res, amt] of Object.entries(v.trade.give)) {
    state[res] -= amt;
  }
  // Receive
  for (let [res, val] of Object.entries(v.trade.take)) {
    if (res === 'blessing') {
      let types = ['crops', 'solar', 'speed', 'luck'];
      state.blessing = { type: types[floor(random(types.length))], timer: 1440 };
      addFloatingText(width / 2, height * 0.3, 'Blessed by the bard!', '#cc88ff');
    } else if (res === 'prophecyRefresh') {
      state.prophecy = generateProphecy();
      addFloatingText(width / 2, height * 0.3, 'New prophecy revealed!', '#aaddff');
    } else {
      state[res] = (state[res] || 0) + val;
      addFloatingText(width / 2, height * 0.3, '+' + val + ' ' + res, '#ffcc44');
    }
  }
  v.interacted = true;
  v.dialogTimer = 120;
  v.currentLine = 1;
  state.codex.visitorsTraded++; if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('trade', 1);
  spawnParticles(v.x, v.y, 'harvest', 10);
}

function updateVisitor(dt) {
  if (!state.visitor) return;
  state.visitor.timer -= dt;
  if (state.visitor.dialogTimer > 0) state.visitor.dialogTimer -= dt;
  if (state.visitor.timer <= 0) {
    addFloatingText(width / 2, height * 0.3, state.visitor.name + ' departed.', '#aaaaaa');
    state.visitor = null;
  }
}

function drawVisitor() {
  let v = state.visitor;
  if (!v) return;
  let sx = w2sX(v.x), sy = w2sY(v.y);

  push();
  translate(sx, sy);
  noStroke();
  // Shadow — pixel
  fill(0, 0, 0, 30);
  rect(-9, 2, 18, 3);
  // Body (robed figure)
  fill(color(v.color));
  rect(-5, -10, 10, 14);
  // Head — pixel
  fill(210, 185, 150);
  rect(-4, -18, 8, 8);
  // Hood/hat — pixel
  fill(color(v.color));
  rect(-5, -20, 10, 4);
  rect(-6, -18, 12, 2);
  // Eyes — pixel
  fill(40);
  rect(-3, -15, 2, 2);
  rect(1, -15, 2, 2);
  // Staff
  stroke(120, 90, 50);
  strokeWeight(1.5);
  line(8, -18, 8, 5);
  noStroke();
  pop();

  // Dialog bubble
  let pd = dist(state.player.x, state.player.y, v.x, v.y);
  if (pd < 70) {
    let msg = v.interacted ? 'Safe travels!' : (v.currentLine === 0 ? v.greeting : v.offer);
    // Bubble
    fill(0, 0, 0, 160);
    rectMode(CENTER);
    let tw = textWidth(msg) + 20;
    rect(sx, sy - 32, min(tw, 200), 20, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(msg, sx, sy - 32);
    rectMode(CORNER);

    if (!v.interacted) {
      fill(255, 200, 100);
      textSize(9);
      text('[E] Trade', sx, sy - 18);
    }
  }
}

// Farming system — see farming.js

// ─── TEMPLE COURT SYSTEM ─────────────────────────────────────────────────
// Temple court area — open space in front of main temple (x:840, y:310)
const TEMPLE_COURT = { x: 780, y: 360, w: 120, h: 80 };

const COURT_VISITOR_TYPES = {
  foreign_merchant: {
    name: 'Foreign Merchant', minLevel: 8, dailyChance: 0.15, unique: false,
    nations: {
      carthage: { greeting: 'Carthaginian wares, finest in the sea!', offer: 'Bulk resources: 20 wood + 20 stone for 15 gold', trade: { give: { gold: 15 }, take: { wood: 20, stone: 20 } } },
      egypt:    { greeting: 'From the banks of the Nile, I bring wonders.', offer: '3 crystals for just 8 gold', trade: { give: { gold: 8 }, take: { crystals: 3 } } },
      greece:   { greeting: 'Athenian crafts, touched by Athena herself.', offer: 'Fine oil and seeds for 10 gold', trade: { give: { gold: 10 }, take: { oliveSeeds: 5, oil: 2 } } },
      persia:   { greeting: 'Persian luxuries from the eastern roads.', offer: 'Exotic spices for 12 gold', trade: { give: { gold: 12 }, take: { exoticSpices: 2 } } },
      phoenicia:{ greeting: 'Phoenician dyes and cedar — the best!', offer: '15 wood + rare hide for 10 gold', trade: { give: { gold: 10 }, take: { wood: 15, rareHide: 1 } } },
      gaul:     { greeting: 'Gallic iron, forged by mountain clans.', offer: 'Iron ore for 8 gold', trade: { give: { gold: 8 }, take: { ironOre: 3 } } },
      seapeople:{ greeting: 'From hidden shores, treasures of the deep.', offer: 'Fish and pearls for 6 gold', trade: { give: { gold: 6 }, take: { fish: 8 } } },
    },
    color: '#ffaa44',
  },
  diplomat: {
    name: 'Diplomat', minLevel: 12, dailyChance: 0.05, unique: true,
    color: '#88aaff',
  },
  spy: {
    name: 'Spy', minLevel: 15, dailyChance: 0.05, unique: true,
    color: '#8866aa',
  },
};

function spawnTempleCourtVisitors() {
  let tc = state.templeCourt;
  let lvl = state.islandLevel || 1;
  let nationKeys = Object.keys(state.nations || {});
  if (nationKeys.length === 0) return;

  for (let typeKey in COURT_VISITOR_TYPES) {
    let vt = COURT_VISITOR_TYPES[typeKey];
    if (lvl < vt.minLevel) continue;
    if (random() > vt.dailyChance) continue;
    // Unique check — only one diplomat / spy at a time
    if (vt.unique && tc.visitors.some(v => v.type === typeKey)) continue;
    // Max 4 court visitors at once
    if (tc.visitors.length >= 4) break;

    let nationKey = nationKeys[floor(random(nationKeys.length))];
    let vx = TEMPLE_COURT.x + random(-TEMPLE_COURT.w / 3, TEMPLE_COURT.w / 3);
    let vy = TEMPLE_COURT.y + random(-TEMPLE_COURT.h / 3, TEMPLE_COURT.h / 3);

    let visitor = {
      type: typeKey, nationKey: nationKey, x: vx, y: vy,
      timer: 2400, // ~40 seconds
      traded: false, dialogTimer: 0,
      walking: null, // { tx, ty } target for walk-away
    };

    if (typeKey === 'foreign_merchant') {
      let nationTrades = vt.nations[nationKey] || vt.nations.carthage;
      visitor.name = getNationName(nationKey) + ' Merchant';
      visitor.greeting = nationTrades.greeting;
      visitor.offer = nationTrades.offer;
      visitor.trade = nationTrades.trade;
      visitor.color = vt.color;
    } else if (typeKey === 'diplomat') {
      let offers = [];
      let nation = state.nations[nationKey];
      if (nation && nation.reputation < -30) {
        offers.push({ label: 'Peace Treaty (100g)', cost: 100, effect: 'peace' });
      }
      offers.push({ label: 'Alliance Proposal (50g, +30 rep)', cost: 50, effect: 'alliance' });
      offers.push({ label: 'Trade Agreement (+10% trade, 10 days)', cost: 25, effect: 'trade_agreement' });
      let pick = offers[floor(random(offers.length))];
      visitor.name = getNationName(nationKey) + ' Diplomat';
      visitor.greeting = 'I speak for ' + getNationName(nationKey) + '.';
      visitor.offer = pick.label;
      visitor.trade = { diplomatEffect: pick.effect, cost: pick.cost };
      visitor.color = vt.color;
    } else if (typeKey === 'spy') {
      visitor.name = 'Hooded Stranger';
      visitor.greeting = 'I have... information, for a price.';
      visitor.offer = 'Intel on ' + getNationName(nationKey) + ' — 30 gold';
      visitor.trade = { spyTarget: nationKey, cost: 30 };
      visitor.color = vt.color;
      visitor.nationKey = null; // hidden affiliation
      visitor._spyTarget = nationKey;
    }

    tc.visitors.push(visitor);
    addFloatingText(width / 2, height * 0.25, visitor.name + ' arrives at the temple court!', visitor.color);
  }
}

function updateTempleCourt(dt) {
  let tc = state.templeCourt;
  if (!tc) return;
  for (let i = tc.visitors.length - 1; i >= 0; i--) {
    let v = tc.visitors[i];
    v.timer -= dt;
    if (v.dialogTimer > 0) v.dialogTimer -= dt;

    // Walk away after trade or timeout
    if (v.walking) {
      let dx = v.walking.tx - v.x, dy = v.walking.ty - v.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d < 5) { tc.visitors.splice(i, 1); continue; }
      let spd = 0.5;
      v.x += (dx / d) * spd * dt;
      v.y += (dy / d) * spd * dt;
    } else if (v.timer <= 0) {
      // Start walking to port
      let port = getPortPosition();
      v.walking = { tx: port.x, ty: port.y };
    }
  }
}

function tradeWithCourtVisitor(v) {
  if (!v || v.traded) return;
  let tc = state.templeCourt;

  if (v.type === 'foreign_merchant') {
    // Check can afford
    for (let [res, amt] of Object.entries(v.trade.give)) {
      if ((state[res] || 0) < amt) {
        addFloatingText(width / 2, height * 0.35, 'Not enough ' + res + '!', '#ff6666');
        return;
      }
    }
    for (let [res, amt] of Object.entries(v.trade.give)) { state[res] -= amt; }
    for (let [res, val] of Object.entries(v.trade.take)) { state[res] = (state[res] || 0) + val; addFloatingText(width / 2, height * 0.3, '+' + val + ' ' + res, '#ffcc44'); }
  } else if (v.type === 'diplomat') {
    let cost = v.trade.cost;
    if ((state.gold || 0) < cost) {
      addFloatingText(width / 2, height * 0.35, 'Not enough gold!', '#ff6666');
      return;
    }
    state.gold -= cost;
    let effect = v.trade.diplomatEffect;
    let nation = state.nations[v.nationKey];
    if (effect === 'peace' && nation) {
      nation.reputation = max(nation.reputation, -10);
      if (nation.wars) nation.wars = nation.wars.filter(w => w !== (state.faction || 'rome'));
      addFloatingText(width / 2, height * 0.25, 'Peace with ' + getNationName(v.nationKey) + '!', '#88cc88');
    } else if (effect === 'alliance' && nation) {
      nation.reputation = min(100, (nation.reputation || 0) + 30);
      addFloatingText(width / 2, height * 0.25, '+30 reputation with ' + getNationName(v.nationKey), '#88aaff');
    } else if (effect === 'trade_agreement' && nation) {
      nation._tradeBonus = (nation._tradeBonus || 0) + 10;
      nation._tradeBonusDays = 10;
      addFloatingText(width / 2, height * 0.25, '+10% trade income with ' + getNationName(v.nationKey) + ' for 10 days', '#ffcc44');
    }
  } else if (v.type === 'spy') {
    if ((state.gold || 0) < v.trade.cost) {
      addFloatingText(width / 2, height * 0.35, 'Not enough gold!', '#ff6666');
      return;
    }
    state.gold -= v.trade.cost;
    let target = v._spyTarget || v.trade.spyTarget;
    let nation = state.nations[target];
    if (nation) {
      nation._intelRevealedDays = 5;
      addFloatingText(width / 2, height * 0.25, getNationName(target) + ' intel revealed for 5 days!', '#cc88ff');
      addFloatingText(width / 2, height * 0.33, 'Military: ' + (nation.military || 0) + '  Gold: ' + (nation.gold || 0) + '  Aggro: ' + (nation.aggression || 0), '#aaaacc');
    }
  }

  v.traded = true;
  v.dialogTimer = 120;
  state.codex.visitorsTraded++;
  if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('trade', 1);
  spawnParticles(v.x, v.y, 'harvest', 10);
  if (snd) snd.playSFX('coin');
  // Start walking away
  let port = getPortPosition();
  v.walking = { tx: port.x, ty: port.y };
}

function drawTempleCourtVisitors_single(v) {
  let sx = w2sX(v.x), sy = w2sY(v.y);
  push();
  translate(sx, sy);
  noStroke();

  // Shadow
  fill(0, 0, 0, 30);
  rect(-9, 2, 18, 3);

  if (v.type === 'diplomat') {
    let nc = FACTIONS[v.nationKey] ? FACTIONS[v.nationKey].bannerColor : [100, 100, 180];
    fill(220, 215, 200);
    rect(-5, -10, 10, 14);
    fill(nc[0], nc[1], nc[2]);
    rect(-2, -8, 3, 12);
    fill(210, 185, 150);
    rect(-4, -18, 8, 8);
    fill(80, 140, 60);
    rect(-5, -19, 10, 3);
    fill(40);
    rect(-3, -15, 2, 2);
    rect(1, -15, 2, 2);
    fill(230, 220, 180);
    rect(7, -8, 3, 8);
    stroke(180, 160, 120);
    strokeWeight(0.5);
    line(7, -8, 10, -8);
    line(7, 0, 10, 0);
    noStroke();
  } else if (v.type === 'spy') {
    fill(50, 40, 60);
    rect(-6, -12, 12, 16);
    fill(40, 30, 50);
    rect(-6, -20, 12, 10);
    rect(-5, -22, 10, 4);
    fill(30, 25, 35);
    rect(-4, -18, 8, 6);
    fill(180, 160, 200);
    rect(-2, -15, 2, 1);
    rect(1, -15, 2, 1);
  } else {
    let nc = FACTIONS[v.nationKey] ? FACTIONS[v.nationKey].bannerColor : [200, 150, 50];
    fill(nc[0], nc[1], nc[2]);
    rect(-5, -10, 10, 14);
    fill(min(255, nc[0] + 40), min(255, nc[1] + 40), min(255, nc[2] + 40));
    rect(-3, -8, 6, 10);
    fill(210, 185, 150);
    rect(-4, -18, 8, 8);
    fill(nc[0], nc[1], nc[2]);
    rect(-5, -20, 10, 4);
    fill(40);
    rect(-3, -15, 2, 2);
    rect(1, -15, 2, 2);
    fill(140, 100, 50);
    rect(-8, -6, 4, 6);
  }
  pop();

  // Dialog bubble when player is near
  let pd = dist(state.player.x, state.player.y, v.x, v.y);
  if (pd < 60) {
    let msg = v.traded ? 'Farewell!' : v.greeting;
    if (!v.traded && v.dialogTimer <= 0) msg = v.offer;
    fill(0, 0, 0, 160);
    rectMode(CENTER);
    let tw = textWidth(msg) + 20;
    rect(sx, sy - 32, min(tw, 220), 20, 6);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(msg, sx, sy - 32);
    rectMode(CORNER);

    if (!v.traded) {
      fill(255, 200, 100);
      textSize(9);
      text('[E] Trade', sx, sy - 18);
    }
  }
}
