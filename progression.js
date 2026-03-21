// ═══════════════════════════════════════════════════════════════════════════
// ─── PROGRESSION LOOP SYSTEMS ─────────────────────────────────────────────
// Achievements, Player Stats, Daily Quests, Day Milestones
// Loaded before sketch.js — all globals (state, addFloatingText, etc.) in sketch.js
// ═══════════════════════════════════════════════════════════════════════════

// ═══ ACHIEVEMENT DEFINITIONS (30) ════════════════════════════════════════
const ACHIEVEMENTS = [
  // First milestones (10)
  { id: 'first_harvest',    name: 'First Fruits',          desc: 'Harvest your first crop',              icon: '\u2618', secret: false },
  { id: 'first_fish',       name: 'Hooked!',               desc: 'Catch your first fish',                icon: '\u2248', secret: false },
  { id: 'first_build',      name: 'Foundation',             desc: 'Place your first building',            icon: '\u25A1', secret: false },
  { id: 'first_combat',     name: 'Blood and Sand',         desc: 'Defeat your first enemy',              icon: '\u2694', secret: false },
  { id: 'first_crystal',    name: 'Crystal Touched',        desc: 'Collect your first crystal',           icon: '\u25C6', secret: false },
  { id: 'first_trade',      name: 'Merchant of the Isles',  desc: 'Complete your first trade',            icon: '\u00A4', secret: false },
  { id: 'first_cat',        name: 'Feline Friend',          desc: 'Adopt a stray cat',                    icon: '\u2261', secret: false },
  { id: 'first_dive',       name: 'Into the Deep',          desc: 'Complete your first dive',             icon: '\u2248', secret: false },
  { id: 'first_quest',      name: 'Duty Calls',             desc: 'Complete a quest',                     icon: '\u2605', secret: false },
  { id: 'first_expedition', name: 'Terra Incognita',        desc: 'Complete your first expedition',       icon: '\u2690', secret: false },
  // Progression (10)
  { id: 'level_5',          name: 'Growing Settlement',     desc: 'Reach island level 5',                 icon: '\u2191', secret: false },
  { id: 'level_10',         name: 'Thriving Colony',        desc: 'Reach island level 10',                icon: '\u2191', secret: false },
  { id: 'level_20',         name: 'Consul',                 desc: 'Reach island level 20',                icon: '\u2654', secret: false },
  { id: 'level_25',         name: 'Imperator',              desc: 'Reach island level 25 - you won!',     icon: '\u2605', secret: false },
  { id: 'gold_100',         name: 'Purse Full',             desc: 'Earn 100 total gold',                  icon: '\u00A4', secret: false },
  { id: 'gold_1000',        name: 'Midas Touch',            desc: 'Earn 1,000 total gold',                icon: '\u2606', secret: false },
  { id: 'harvest_100',      name: 'Master Farmer',          desc: 'Harvest 100 crops',                    icon: '\u2618', secret: false },
  { id: 'fish_50',          name: 'Neptune\'s Blessing',    desc: 'Catch 50 fish',                        icon: '\u2248', secret: false },
  { id: 'kills_50',         name: 'Gladiator',              desc: 'Defeat 50 enemies',                    icon: '\u2694', secret: false },
  { id: 'buildings_20',     name: 'Grand Architect',        desc: 'Build 20 structures',                  icon: '\u25A1', secret: false },
  // Completionist / rare (5)
  { id: 'all_fish',         name: 'Codex Piscium',          desc: 'Catch every fish type',                icon: '\u2248', secret: false },
  { id: 'all_hearts',       name: 'Beloved',                desc: 'Max hearts with all 4 NPCs',           icon: '\u2665', secret: false },
  { id: 'all_islands',      name: 'Explorer Supreme',       desc: 'Visit all discoverable islands',       icon: '\u2609', secret: false },
  { id: 'all_crops',        name: 'Botanical Scholar',      desc: 'Grow every crop type',                 icon: '\u2618', secret: false },
  { id: 'combo_10',         name: 'Harvest Frenzy',         desc: 'Reach a 10x harvest combo',            icon: '\u2605', secret: false },
  // Secret achievements (5)
  { id: 'storm_fisher',     name: 'Storm Fisher',           desc: 'Catch a fish during a drift storm',    icon: '\u2608', secret: true },
  { id: 'night_owl',        name: 'Night Owl',              desc: 'Play past midnight (in-game)',         icon: '\u263D', secret: true },
  { id: 'wreck_escape',     name: 'Castaway No More',       desc: 'Escape the wreck beach',               icon: '\u2693', secret: true },
  { id: 'max_solar',        name: 'Sol Invictus',           desc: 'Fill solar energy to maximum',         icon: '\u2600', secret: true },
  { id: 'survive_30',       name: 'Thirty Days',            desc: 'Survive 30 days on the islands',       icon: '\u2637', secret: true },
];

function unlockAchievement(id) {
  if (!state || !state.achievements) return;
  if (state.achievements.includes(id)) return;
  let def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def) return;
  state.achievements.push(id);
  if (typeof showAchievement === 'function') showAchievement(def.icon + ' ' + def.name);
  if (typeof addNotification === 'function') addNotification('Achievement: ' + def.name, '#ffdd44');
  if (snd) snd.playSFX('build');
  if (typeof trackMilestone === 'function') trackMilestone('ach_' + id);
}

function checkAchievements() {
  if (!state || !state.achievements) return;
  let s = state.playerStats;
  if (!s) return;
  // First-type
  if (s.cropsHarvested >= 1) unlockAchievement('first_harvest');
  if (s.fishCaught >= 1) unlockAchievement('first_fish');
  if (s.buildingsBuilt >= 1) unlockAchievement('first_build');
  if (s.enemiesDefeated >= 1) unlockAchievement('first_combat');
  if (s.crystalsCollected >= 1) unlockAchievement('first_crystal');
  if (s.questsCompleted >= 1) unlockAchievement('first_quest');
  if (s.catsAdopted >= 1) unlockAchievement('first_cat');
  if (s.divesCompleted >= 1) unlockAchievement('first_dive');
  if (s.expeditionsCompleted >= 1) unlockAchievement('first_expedition');
  if ((state.codex && state.codex.visitorsTraded || 0) >= 1) unlockAchievement('first_trade');
  // Progression
  if (state.islandLevel >= 5) unlockAchievement('level_5');
  if (state.islandLevel >= 10) unlockAchievement('level_10');
  if (state.islandLevel >= 20) unlockAchievement('level_20');
  if (state.islandLevel >= 25) unlockAchievement('level_25');
  if (s.totalGoldEarned >= 100) unlockAchievement('gold_100');
  if (s.totalGoldEarned >= 1000) unlockAchievement('gold_1000');
  if (s.cropsHarvested >= 100) unlockAchievement('harvest_100');
  if (s.fishCaught >= 50) unlockAchievement('fish_50');
  if (s.enemiesDefeated >= 50) unlockAchievement('kills_50');
  if (s.buildingsBuilt >= 20) unlockAchievement('buildings_20');
  // Completionist
  if (typeof FISH_TYPES !== 'undefined' && state.codex && Object.keys(state.codex.fishCaught || {}).length >= FISH_TYPES.length) unlockAchievement('all_fish');
  let _allCrops = ['grain','grape','olive','wildflower','sunfruit','pumpkin','frostherb'];
  if (state.codex && state.codex.cropsGrown && _allCrops.every(c => state.codex.cropsGrown[c])) unlockAchievement('all_crops');
  if (state.npc && state.npc.hearts >= 10 && state.marcus && state.marcus.hearts >= 10 && state.vesta && state.vesta.hearts >= 10 && state.felix && state.felix.hearts >= 10) unlockAchievement('all_hearts');
  if (state.vulcan && state.vulcan.phase !== 'unexplored' && state.hyperborea && state.hyperborea.phase !== 'unexplored' && state.plenty && state.plenty.phase !== 'unexplored' && state.necropolis && state.necropolis.phase !== 'unexplored') unlockAchievement('all_islands');
  if ((state.harvestCombo && state.harvestCombo.bestEver >= 10) || (state.codex && state.codex.bestCombo >= 10)) unlockAchievement('combo_10');
  // Secret
  if (state.solar >= state.maxSolar && state.maxSolar > 0) unlockAchievement('max_solar');
  if (state.day >= 30) unlockAchievement('survive_30');
  if (state.progression && state.progression.homeIslandReached) unlockAchievement('wreck_escape');
}

// ═══ PLAYER STATS TRACKING ═══════════════════════════════════════════════
let _progStatsTimer = 0;

function updatePlayerStats(dt) {
  if (!state || !state.playerStats) return;
  _progStatsTimer += dt;
  if (_progStatsTimer >= 60) {
    state.playerStats.timePlayed += Math.floor(_progStatsTimer / 60);
    _progStatsTimer %= 60;
  }
  state.playerStats.daysSurvived = state.day;
}

function trackStat(stat, amount) {
  if (!state || !state.playerStats || state.playerStats[stat] === undefined) return;
  state.playerStats[stat] += amount;
}

// ═══ DAILY QUESTS (3 per day) ════════════════════════════════════════════
const DAILY_QUEST_POOL = [
  { type: 'harvest', desc: 'Harvest 5 crops',       target: 5,  reward: { gold: 15, crystals: 1 } },
  { type: 'harvest', desc: 'Harvest 10 crops',      target: 10, reward: { gold: 30, crystals: 2 } },
  { type: 'fish',    desc: 'Catch 3 fish',          target: 3,  reward: { gold: 12, crystals: 1 } },
  { type: 'fish',    desc: 'Catch 6 fish',          target: 6,  reward: { gold: 25, crystals: 2 } },
  { type: 'build',   desc: 'Build 1 building',      target: 1,  reward: { gold: 10, crystals: 1 } },
  { type: 'build',   desc: 'Build 3 buildings',     target: 3,  reward: { gold: 25, crystals: 2 } },
  { type: 'kill',    desc: 'Defeat 3 enemies',      target: 3,  reward: { gold: 20, crystals: 1 } },
  { type: 'kill',    desc: 'Defeat 5 enemies',      target: 5,  reward: { gold: 35, crystals: 3 } },
  { type: 'chop',    desc: 'Chop 3 trees',          target: 3,  reward: { gold: 10, crystals: 1 } },
  { type: 'crystal', desc: 'Collect 3 crystals',    target: 3,  reward: { gold: 20, crystals: 0 } },
  { type: 'gift',    desc: 'Give a gift to an NPC', target: 1,  reward: { gold: 15, crystals: 1 } },
  { type: 'trade',   desc: 'Trade with Hanno',      target: 1,  reward: { gold: 20, crystals: 2 } },
];

function generateDailyQuests() {
  if (!state) return;
  let pool = DAILY_QUEST_POOL.slice();
  let quests = [];
  let mult = 1 + Math.floor(state.day / 10) * 0.3;
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    let idx = Math.floor(Math.random() * pool.length);
    let q = pool.splice(idx, 1)[0];
    quests.push({
      id: 'dq_' + state.day + '_' + i,
      desc: q.desc, type: q.type, target: q.target, progress: 0,
      reward: { gold: Math.floor(q.reward.gold * mult), crystals: Math.floor(q.reward.crystals * mult) },
      completed: false,
    });
  }
  state.dailyQuests = quests;
  state.dailyQuestsDay = state.day;
}

function checkDailyQuestProgress(type, amount) {
  if (!state || !state.dailyQuests) return;
  state.dailyQuests.forEach(q => {
    if (q.completed || q.type !== type) return;
    q.progress = Math.min(q.progress + amount, q.target);
    if (q.progress >= q.target) {
      q.completed = true;
      if (q.reward.gold) { state.gold += q.reward.gold; trackStat('totalGoldEarned', q.reward.gold); }
      if (q.reward.crystals) state.crystals += q.reward.crystals;
      let rt = [];
      if (q.reward.gold) rt.push('+' + q.reward.gold + 'g');
      if (q.reward.crystals) rt.push('+' + q.reward.crystals + ' crystal');
      if (typeof addFloatingText === 'function') addFloatingText(width / 2, height * 0.25, 'DAILY QUEST DONE! ' + rt.join(' '), '#ffdd44');
      if (typeof addNotification === 'function') addNotification('Daily quest: ' + q.desc + ' - ' + rt.join(', '), '#ffdd44');
      if (snd) snd.playSFX('build');
    }
  });
}

// ═══ MILESTONES WITH REWARDS ═════════════════════════════════════════════
const DAY_MILESTONES = [
  { id: 'day5',  day: 5,  title: 'Day 5 - Fishing Upgrade',
    reward: function() { if (state.tools) state.tools.copperRod = 1; addNotification('Copper rod upgraded!', '#64b4ff'); } },
  { id: 'day10', day: 10, title: 'Day 10 - Hanno\'s Arrival',
    reward: function() { state.gold += 30; state.seeds += 10; state.crystals += 5; addNotification('Hanno: +30g +10 seeds +5 crystals!', '#ffcc44'); } },
  { id: 'day15', day: 15, title: 'Day 15 - First Expedition',
    reward: function() { state.gold += 20; state.crystals += 3; addNotification('Expeditions unlocked! +20g +3 crystals', '#88aadd'); } },
  { id: 'day20', day: 20, title: 'Day 20 - Rival Contact',
    reward: function() { state.gold += 40; state.ironOre += 3; addNotification('Rival contact! +40g +3 iron', '#dd8888'); } },
  { id: 'day30', day: 30, title: 'Day 30 - Secret Island Hint',
    reward: function() { state.crystals += 10; state.gold += 50; addNotification('Secret island hinted! +50g +10 crystals', '#aa77ff'); } },
];

function checkDayMilestones() {
  if (!state) return;
  if (!state.milestonesClaimed) state.milestonesClaimed = [];
  DAY_MILESTONES.forEach(m => {
    if (state.day >= m.day && !state.milestonesClaimed.includes(m.id)) {
      state.milestonesClaimed.push(m.id);
      m.reward();
      if (typeof showAchievement === 'function') showAchievement(m.title);
      if (snd) snd.playSFX('season_change');
    }
  });
}

// ═══ PROGRESSION UI DRAWING (achievements panel, stats panel, daily quest HUD) ═══
function drawAchievementsPanel() {
  if (!state.achievementsPanelOpen) return;
  noStroke(); fill(0, 0, 0, 200); rect(0, 0, width, height);
  let pw = Math.min(width - 40, 480), ph = Math.min(height - 40, 440);
  let px = (width - pw) / 2, py = (height - ph) / 2;
  if (typeof drawParchmentPanel === 'function') drawParchmentPanel(px, py, pw, ph);
  else { fill(35, 28, 18, 245); rect(px, py, pw, ph, 6); stroke(180, 145, 70, 220); strokeWeight(1.5); noFill(); rect(px, py, pw, ph, 6); noStroke(); }

  // Title
  fill(212, 175, 80); textAlign(CENTER, TOP); textSize(14);
  text('ACHIEVEMENTS', width / 2, py + 12);
  let unlocked = (state.achievements || []).length;
  fill(160, 140, 100); textSize(9);
  text(unlocked + ' / ' + ACHIEVEMENTS.length + ' unlocked', width / 2, py + 30);

  // Progress bar
  noStroke();
  fill(40, 35, 25); rect(px + 30, py + 44, pw - 60, 8, 4);
  fill(200, 170, 90); rect(px + 30, py + 44, (pw - 60) * (unlocked / ACHIEVEMENTS.length), 8, 4);

  // Tabs: [Achievements] [Stats] [Milestones]
  let tabY = py + 58;
  let tabs = ['Achievements', 'Stats', 'Milestones'];
  let tabW = (pw - 40) / 3;
  let _achTab = state._achTab || 0;
  textSize(8); textAlign(CENTER, TOP);
  for (let i = 0; i < tabs.length; i++) {
    let tx = px + 20 + i * tabW;
    fill(i === _achTab ? color(60, 50, 35) : color(35, 28, 18));
    rect(tx, tabY, tabW - 4, 18, 3);
    fill(i === _achTab ? color(220, 190, 120) : color(120, 100, 70));
    text(tabs[i], tx + tabW / 2 - 2, tabY + 4);
  }

  let contentY = tabY + 24;
  let contentH = ph - (contentY - py) - 20;

  if (_achTab === 0) {
    // Achievement list
    textAlign(LEFT, TOP);
    let rowH = 28;
    let maxRows = Math.floor(contentH / rowH);
    let scroll = state._achScroll || 0;
    for (let i = 0; i < maxRows && i + scroll < ACHIEVEMENTS.length; i++) {
      let ach = ACHIEVEMENTS[i + scroll];
      let have = (state.achievements || []).includes(ach.id);
      let ry = contentY + i * rowH;
      fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
      rect(px + 12, ry, pw - 24, rowH - 2, 3);
      if (have) {
        fill(220, 200, 120); textSize(12); text(ach.icon, px + 20, ry + 6);
        fill(210, 190, 130); textSize(9); text(ach.name, px + 38, ry + 3);
        fill(160, 145, 110); textSize(7); text(ach.desc, px + 38, ry + 15);
      } else if (ach.secret) {
        fill(80, 70, 50); textSize(9); text('???', px + 20, ry + 6);
        fill(80, 70, 50); textSize(7); text('Secret achievement', px + 38, ry + 9);
      } else {
        fill(100, 90, 65); textSize(12); text(ach.icon, px + 20, ry + 6);
        fill(100, 90, 65); textSize(9); text(ach.name, px + 38, ry + 3);
        fill(80, 70, 50); textSize(7); text(ach.desc, px + 38, ry + 15);
      }
    }
    if (ACHIEVEMENTS.length > maxRows) {
      fill(120, 100, 70); textSize(7); textAlign(CENTER, TOP);
      text('Scroll: UP/DOWN arrows (' + (scroll + 1) + '-' + Math.min(scroll + maxRows, ACHIEVEMENTS.length) + ' of ' + ACHIEVEMENTS.length + ')', width / 2, contentY + contentH - 2);
    }
  } else if (_achTab === 1) {
    // Stats panel
    textAlign(LEFT, TOP);
    let s = state.playerStats || {};
    let stats = [
      { l: 'Total Gold Earned',  v: s.totalGoldEarned || 0,     c: '#ffbb22' },
      { l: 'Crops Harvested',    v: s.cropsHarvested || 0,      c: '#88cc44' },
      { l: 'Fish Caught',        v: s.fishCaught || 0,          c: '#64b4ff' },
      { l: 'Enemies Defeated',   v: s.enemiesDefeated || 0,     c: '#dd8888' },
      { l: 'Days Survived',      v: s.daysSurvived || state.day,c: '#aabbcc' },
      { l: 'Buildings Built',    v: s.buildingsBuilt || 0,      c: '#88cc88' },
      { l: 'Islands Discovered', v: s.islandsDiscovered || 0,   c: '#aaddff' },
      { l: 'Trees Chopped',      v: s.treesChopped || 0,        c: '#8c6428' },
      { l: 'Gifts Given',        v: s.giftsGiven || 0,          c: '#ff88aa' },
      { l: 'Crystals Collected', v: s.crystalsCollected || 0,   c: '#44ffaa' },
      { l: 'Quests Completed',   v: s.questsCompleted || 0,     c: '#ffcc44' },
      { l: 'Expeditions Done',   v: s.expeditionsCompleted || 0,c: '#88aadd' },
      { l: 'Dives Completed',    v: s.divesCompleted || 0,      c: '#66aacc' },
      { l: 'Cats Adopted',       v: s.catsAdopted || 0,         c: '#ddaa88' },
      { l: 'Meals Cooked',       v: s.mealsCooked || 0,         c: '#dcb450' },
      { l: 'Time Played',        v: Math.floor((s.timePlayed || 0) / 60) + 'm ' + ((s.timePlayed || 0) % 60) + 's', c: '#cccccc' },
    ];
    for (let i = 0; i < stats.length; i++) {
      let sy = contentY + i * 17;
      fill(color(stats[i].c)); textSize(8);
      textAlign(LEFT, TOP); text(stats[i].l, px + 20, sy);
      textAlign(RIGHT, TOP); text('' + stats[i].v, px + pw - 20, sy);
    }
  } else if (_achTab === 2) {
    // Milestones
    textAlign(LEFT, TOP);
    for (let i = 0; i < DAY_MILESTONES.length; i++) {
      let m = DAY_MILESTONES[i];
      let claimed = (state.milestonesClaimed || []).includes(m.id);
      let ry = contentY + i * 32;
      fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
      rect(px + 12, ry, pw - 24, 28, 3);
      if (claimed) {
        fill(180, 200, 100); textSize(10); text('\u2713 ' + m.title, px + 20, ry + 4);
        fill(140, 130, 90); textSize(7); text('Claimed on day ' + m.day, px + 20, ry + 17);
      } else {
        fill(100, 90, 65); textSize(10); text('Day ' + m.day + ' - ???', px + 20, ry + 4);
        fill(80, 70, 50); textSize(7);
        text(state.day < m.day ? (m.day - state.day) + ' days remaining' : 'Available!', px + 20, ry + 17);
      }
    }
  }

  // Close hint
  fill(120, 100, 70); textSize(7); textAlign(CENTER, BOTTOM);
  text('[TAB] Close    [1/2/3] Switch Tab    [UP/DOWN] Scroll', width / 2, py + ph - 4);
  textAlign(LEFT, TOP);
}

// Daily quest checklist (small HUD element, bottom-right area above hotbar)
function drawDailyQuestHUD() {
  if (!state.dailyQuests || state.dailyQuests.length === 0) return;
  if (typeof photoMode !== 'undefined' && photoMode) return;
  if (typeof screenshotMode !== 'undefined' && screenshotMode) return;
  if (typeof dialogState !== 'undefined' && dialogState.active) return;

  let dqPanelH = 14 + state.dailyQuests.length * 16;
  let dqX = max(0, width - 170), dqY = max(0, min(height - 170, height - dqPanelH - 50));
  // Fade if player is in bottom-right
  let _psx = typeof w2sX === 'function' ? w2sX(state.player.x) : 0;
  let _psy = typeof w2sY === 'function' ? w2sY(state.player.y) : 0;
  let fade = (_psx > width * 0.65 && _psy > height * 0.55) ? 0.3 : 0.85;
  drawingContext.globalAlpha = fade;

  noStroke();
  fill(20, 16, 12, 200); rect(dqX, dqY, 160, 14 + state.dailyQuests.length * 16, 4);
  stroke(180, 145, 70, 100); strokeWeight(0.5); noFill();
  rect(dqX, dqY, 160, 14 + state.dailyQuests.length * 16, 4);
  noStroke();

  fill(200, 170, 90); textSize(7); textAlign(LEFT, TOP);
  text('DAILY QUESTS', dqX + 6, dqY + 3);

  for (let i = 0; i < state.dailyQuests.length; i++) {
    let q = state.dailyQuests[i];
    let qy = dqY + 14 + i * 16;
    let check = q.completed ? '\u2713' : '\u25CB';
    fill(q.completed ? color(140, 200, 100) : color(160, 140, 100));
    textSize(7);
    text(check + ' ' + q.desc, dqX + 6, qy);
    if (!q.completed) {
      fill(120, 100, 70); textSize(6);
      textAlign(RIGHT, TOP);
      text(q.progress + '/' + q.target, dqX + 154, qy + 1);
      textAlign(LEFT, TOP);
    }
  }
  drawingContext.globalAlpha = 1.0;
}
