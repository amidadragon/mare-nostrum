// ═══════════════════════════════════════════════════════════════════════════
// ─── SANDBOX COMPASS — "Always Something To Do" Purpose Layer ───────────
// ═══════════════════════════════════════════════════════════════════════════
// Gives the open-ended sandbox a constant stream of breadcrumbs.
// 3 rotating goals from different categories, rewards on completion,
// lifetime achievement tracking, and a persistent HUD compass rose.

// ─── GOAL TEMPLATES ─────────────────────────────────────────────────────
// Each template is a factory: tier (1-5) scales difficulty & reward.
const COMPASS_CATEGORIES = {
  exploration: {
    icon: '⛵', color: '#66bbdd',
    goals: [
      { id: 'visit_island',    desc: t => `Sail to ${t.target}`,         make: tier => { let islands = typeof WORLD_ISLANDS !== 'undefined' ? WORLD_ISLANDS : []; let pick = islands[Math.floor(Math.random() * islands.length)]; return { target: pick ? pick.name : 'Terra Nova', check: () => state.currentIsland && state.currentIsland === (pick ? pick.id : 'terra_nova') }; }},
      { id: 'sail_distance',   desc: t => `Sail ${t.target} leagues`,    make: tier => { let d = 200 * tier; return { target: d, counter: '_cx_sail', need: d }; }},
      { id: 'discover_tablet', desc: t => `Find a lore tablet`,          make: tier => ({ target: 1, counter: '_cx_tablets', need: 1 })},
      { id: 'world_map_check', desc: t => `Open the world map`,          make: tier => ({ target: 'the map', check: () => typeof worldMapOpen !== 'undefined' && worldMapOpen })},
    ]
  },
  economy: {
    icon: '🪙', color: '#ddaa44',
    goals: [
      { id: 'earn_gold',      desc: t => `Earn ${t.target} gold`,        make: tier => { let g = 20 * tier; return { target: g, counter: '_cx_goldEarned', need: g }; }},
      { id: 'harvest_crops',  desc: t => `Harvest ${t.target} crops`,    make: tier => { let h = 3 * tier; return { target: h, counter: '_cx_harvested', need: h }; }},
      { id: 'catch_fish',     desc: t => `Catch ${t.target} fish`,       make: tier => { let f = 2 * tier; return { target: f, counter: '_cx_fished', need: f }; }},
      { id: 'cook_meals',     desc: t => `Cook ${t.target} meals`,       make: tier => { let m = 2 * tier; return { target: m, counter: '_cx_cooked', need: m }; }},
      { id: 'wealth_check',   desc: t => `Have ${t.target}+ gold`,       make: tier => { let g = 30 + 25 * tier; return { target: g, check: () => state.gold >= g }; }},
    ]
  },
  building: {
    icon: '🏛', color: '#bb9966',
    goals: [
      { id: 'place_buildings', desc: t => `Build ${t.target} structures`, make: tier => { let b = 2 * tier; return { target: b, counter: '_cx_built', need: b }; }},
      { id: 'build_type',      desc: t => `Place a ${t.target}`,         make: tier => { let types = ['torch', 'fence', 'mosaic', 'lantern', 'aqueduct', 'bath', 'flower']; let pick = types[Math.floor(Math.random() * types.length)]; return { target: pick, counter: '_cx_built_' + pick, need: 1 }; }},
      { id: 'reach_level',     desc: t => `Reach island level ${t.target}`, make: tier => { let lvl = 3 + tier * 2; return { target: lvl, check: () => (state.islandLevel || 1) >= lvl }; }},
    ]
  },
  social: {
    icon: '💬', color: '#dd88bb',
    goals: [
      { id: 'gift_npc',    desc: t => `Give a gift to someone`,       make: tier => ({ target: 1, counter: '_cx_gifted', need: 1 })},
      { id: 'pet_cat',     desc: t => `Pet a cat ${t.target} times`,  make: tier => { let p = 1 + tier; return { target: p, counter: '_cx_catPetted', need: p }; }},
      { id: 'hearts_total',desc: t => `Earn ${t.target} total hearts`, make: tier => { let h = 2 * tier; return { target: h, counter: '_cx_heartsEarned', need: h }; }},
    ]
  },
  combat: {
    icon: '⚔', color: '#cc5544',
    goals: [
      { id: 'train_units',   desc: t => `Train ${t.target} soldiers`,    make: tier => { let u = 2 * tier; return { target: u, counter: '_cx_trained', need: u }; }},
      { id: 'defeat_enemies',desc: t => `Defeat ${t.target} enemies`,    make: tier => { let e = 3 * tier; return { target: e, counter: '_cx_kills', need: e }; }},
      { id: 'conquer_island',desc: t => `Conquer an island`,             make: tier => ({ target: 1, counter: '_cx_conquests', need: 1 })},
    ]
  },
  mastery: {
    icon: '🏆', color: '#ffcc00',
    goals: [
      { id: 'daily_wreath',   desc: t => `Earn a daily wreath`,           make: tier => ({ target: 1, counter: '_cx_wreaths', need: 1 })},
      { id: 'combo_streak',   desc: t => `Get a ${t.target}x harvest combo`, make: tier => { let c = 3 + tier; return { target: c, check: () => state.harvestCombo && state.harvestCombo.count >= c }; }},
      { id: 'activities_day', desc: t => `Do ${t.target}+ activities today`, make: tier => { let a = 3 + tier; return { target: a, check: () => { let da = state.dailyActivities; if (!da) return false; let c = 0; if (da.harvested > 0) c++; if (da.fished > 0) c++; if (da.built > 0) c++; if (da.gifted > 0) c++; if (da.cooked > 0) c++; if (da.catPetted > 0) c++; if (da.crystal > 0) c++; if (da.chopped > 0) c++; return c >= a; }}; }},
      { id: 'survive_days',   desc: t => `Survive ${t.target} days`,      make: tier => { let d = 5 + tier * 5; return { target: d, check: () => state.day >= d }; }},
    ]
  },
};

// ─── COMPASS REWARDS ────────────────────────────────────────────────────
const COMPASS_REWARDS = [
  { tier: 1, gold: 5,  bonus: null },
  { tier: 2, gold: 12, bonus: 'seeds',    amount: 3 },
  { tier: 3, gold: 20, bonus: 'crystals', amount: 2 },
  { tier: 4, gold: 35, bonus: 'wood',     amount: 8 },
  { tier: 5, gold: 50, bonus: 'crystals', amount: 5 },
];

// ─── MILESTONES — lifetime achievement tiers ────────────────────────────
const COMPASS_MILESTONES = [
  { at: 5,   title: 'Wayward',      desc: 'First steps on the compass path' },
  { at: 15,  title: 'Seeker',       desc: 'Always looking for the next horizon' },
  { at: 30,  title: 'Pathfinder',   desc: 'The Mediterranean knows your name' },
  { at: 50,  title: 'Trailblazer',  desc: 'No shore is foreign to you' },
  { at: 75,  title: 'Compass Rose',desc: 'The winds obey your will' },
  { at: 100, title: 'Eternal',      desc: 'The sea and the sky are your home' },
];

// ─── STATE INITIALIZATION ───────────────────────────────────────────────
function initSandboxCompass() {
  if (!state._compass) {
    state._compass = {
      goals: [],          // current 3 active goals
      completed: 0,       // lifetime completed count
      counters: {},       // per-goal-type counters
      tier: 1,            // current difficulty tier (scales up)
      lastCategories: [], // avoid repeating same categories
      milestoneShown: 0,  // highest milestone shown
      hudOpen: true,      // whether the compass HUD is visible
      totalByCategory: {}, // track completions per category
    };
  }
  // Ensure we have 3 goals
  let c = state._compass;
  while (c.goals.length < 3) {
    _compassAddGoal(c);
  }
}

// ─── GOAL GENERATION ────────────────────────────────────────────────────
function _compassAddGoal(c) {
  let catKeys = Object.keys(COMPASS_CATEGORIES);
  // Avoid recently used categories
  let available = catKeys.filter(k => !c.lastCategories.includes(k));
  if (available.length === 0) { available = catKeys; c.lastCategories = []; }
  let catKey = available[Math.floor(Math.random() * available.length)];
  let cat = COMPASS_CATEGORIES[catKey];
  let templates = cat.goals;
  let template = templates[Math.floor(Math.random() * templates.length)];

  // Scale tier with progress (every 10 completions = +1 tier, max 5)
  let tier = Math.min(5, 1 + Math.floor(c.completed / 10));
  c.tier = tier;
  let made = template.make(tier);

  let goal = {
    id: template.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    templateId: template.id,
    category: catKey,
    icon: cat.icon,
    color: cat.color,
    desc: template.desc(made),
    tier: tier,
    check: made.check || null,
    counter: made.counter || null,
    need: made.need || 0,
    startValue: made.counter ? (c.counters[made.counter] || 0) : 0,
    done: false,
    celebrated: false,
  };

  c.goals.push(goal);
  c.lastCategories.push(catKey);
  if (c.lastCategories.length > 2) c.lastCategories.shift();
}

// ─── UPDATE LOOP — call every frame ─────────────────────────────────────
function updateSandboxCompass() {
  if (!state._compass) return;
  let c = state._compass;
  let anyDone = false;

  for (let i = 0; i < c.goals.length; i++) {
    let g = c.goals[i];
    if (g.done) continue;

    let complete = false;
    if (g.check) {
      try { complete = g.check(); } catch (e) { /* silently skip broken checks */ }
    } else if (g.counter) {
      let current = c.counters[g.counter] || 0;
      let progress = current - g.startValue;
      complete = progress >= g.need;
    }

    if (complete) {
      g.done = true;
      anyDone = true;
      c.completed++;
      if (!c.totalByCategory[g.category]) c.totalByCategory[g.category] = 0;
      c.totalByCategory[g.category]++;

      // Grant reward
      let reward = COMPASS_REWARDS[Math.min(g.tier - 1, COMPASS_REWARDS.length - 1)];
      state.gold = (state.gold || 0) + reward.gold;
      let rewardStr = '+' + reward.gold + 'g';
      if (reward.bonus && reward.amount) {
        state[reward.bonus] = (state[reward.bonus] || 0) + reward.amount;
        rewardStr += ', +' + reward.amount + ' ' + reward.bonus;
      }

      // Celebration
      if (typeof addFloatingText === 'function') {
        addFloatingText(width / 2, height * 0.35, '⊛ COMPASS GOAL COMPLETE', '#ffd700');
        addFloatingText(width / 2, height * 0.40, g.desc, g.color);
        addFloatingText(width / 2, height * 0.45, rewardStr, '#ffcc44');
      }
      if (typeof spawnParticles === 'function') {
        spawnParticles(state.player.x, state.player.y, 'harvest', 8);
      }
      if (typeof snd !== 'undefined' && snd && snd.playSFX) snd.playSFX('harvest_combo');

      // Check milestones
      _compassCheckMilestone(c);
    }
  }

  // Replace completed goals with new ones
  if (anyDone) {
    c.goals = c.goals.filter(g => !g.done);
    while (c.goals.length < 3) {
      _compassAddGoal(c);
    }
  }
}

function _compassCheckMilestone(c) {
  for (let m of COMPASS_MILESTONES) {
    if (c.completed >= m.at && c.milestoneShown < m.at) {
      c.milestoneShown = m.at;
      if (typeof addFloatingText === 'function') {
        addFloatingText(width / 2, height * 0.25, '★ ' + m.title.toUpperCase() + ' ★', '#ffd700');
        addFloatingText(width / 2, height * 0.30, m.desc, '#ffcc88');
      }
      if (typeof showAchievement === 'function') {
        showAchievement('Compass: ' + m.title);
      }
    }
  }
}

// ─── COUNTER HOOKS — call from game systems ─────────────────────────────
// These increment compass counters when the player does things.
// They hook into existing game events without modifying core files.

function compassTrack(counterName, amount) {
  if (!state._compass) return;
  if (!state._compass.counters) state._compass.counters = {};
  state._compass.counters[counterName] = (state._compass.counters[counterName] || 0) + (amount || 1);
}

// ─── DRAW COMPASS HUD — small persistent panel ─────────────────────────
function drawSandboxCompass() {
  if (!state._compass || !state._compass.hudOpen) return;
  // Don't draw during menus, world map, combat overlays
  if (typeof worldMapOpen !== 'undefined' && worldMapOpen) return;
  if (state.legiaUIOpen) return;
  if (state.showSummary) return;

  let c = state._compass;
  let goals = c.goals;
  if (!goals || goals.length === 0) return;

  push();
  // Panel position: bottom-left, above the resource bar area
  let panW = Math.min(220, Math.floor(width * 0.18));
  let lineH = 16;
  let headerH = 22;
  let panH = headerH + goals.length * lineH + 8;
  let px = 10;
  let py = height - panH - 60; // above the bottom HUD

  // Background
  noStroke();
  fill(20, 16, 10, 180);
  rect(px, py, panW, panH, 5);
  // Border
  stroke(120, 100, 60, 100);
  strokeWeight(0.5);
  noFill();
  rect(px + 1, py + 1, panW - 2, panH - 2, 4);
  noStroke();

  // Header
  fill(200, 180, 100);
  textSize(10);
  textAlign(LEFT, TOP);
  text('☼ COMPASS', px + 8, py + 5);

  // Completed count
  fill(140, 120, 80);
  textSize(9);
  textAlign(RIGHT, TOP);
  text(c.completed + ' done', px + panW - 8, py + 6);
  textAlign(LEFT, TOP);

  // Milestone title
  let title = _compassCurrentTitle(c);
  if (title) {
    fill(180, 160, 80);
    textSize(8);
    text(title, px + 60, py + 6);
  }

  // Goal lines
  let gy = py + headerH;
  for (let i = 0; i < goals.length; i++) {
    let g = goals[i];
    let progress = _compassGoalProgress(g, c);

    // Category color dot
    fill(color(g.color));
    noStroke();
    ellipse(px + 14, gy + lineH / 2, 5, 5);

    // Description
    fill(190, 175, 140);
    textSize(9);
    textAlign(LEFT, TOP);
    let descText = g.desc;
    let maxDescW = panW - 50;
    if (textWidth(descText) > maxDescW) {
      while (descText.length > 5 && textWidth(descText + '..') > maxDescW) descText = descText.slice(0, -1);
      descText += '..';
    }
    text(descText, px + 22, gy + 2);

    // Progress indicator
    if (g.counter && g.need > 0) {
      let current = Math.min(g.need, (c.counters[g.counter] || 0) - g.startValue);
      fill(140, 125, 90);
      textSize(8);
      textAlign(RIGHT, TOP);
      text(Math.max(0, current) + '/' + g.need, px + panW - 8, gy + 3);
      textAlign(LEFT, TOP);
    } else if (progress >= 1) {
      fill(120, 200, 80);
      textSize(8);
      textAlign(RIGHT, TOP);
      text('✓', px + panW - 8, gy + 3);
      textAlign(LEFT, TOP);
    }

    gy += lineH;
  }

  // Thin progress bar at bottom
  let barY = py + panH - 5;
  let nextMilestone = _compassNextMilestone(c);
  if (nextMilestone) {
    let prevAt = 0;
    for (let m of COMPASS_MILESTONES) { if (m.at < nextMilestone.at) prevAt = m.at; }
    let pct = Math.min(1, (c.completed - prevAt) / (nextMilestone.at - prevAt));
    fill(50, 40, 25);
    rect(px + 8, barY, panW - 16, 2, 1);
    fill(200, 170, 60);
    rect(px + 8, barY, (panW - 16) * pct, 2, 1);
  }

  pop();
}

function _compassGoalProgress(g, c) {
  if (g.done) return 1;
  if (g.check) {
    try { return g.check() ? 1 : 0; } catch (e) { return 0; }
  }
  if (g.counter && g.need > 0) {
    let current = (c.counters[g.counter] || 0) - g.startValue;
    return Math.min(1, current / g.need);
  }
  return 0;
}

function _compassCurrentTitle(c) {
  let title = null;
  for (let m of COMPASS_MILESTONES) {
    if (c.completed >= m.at) title = m.title;
  }
  return title;
}

function _compassNextMilestone(c) {
  for (let m of COMPASS_MILESTONES) {
    if (c.completed < m.at) return m;
  }
  return null;
}

// ─── HOOKS — monkey-patch existing functions to feed compass counters ───
// We wrap existing game functions to track events without editing core files.

(function installCompassHooks() {
  // Hook: trainUnit — track soldier training
  if (typeof window.trainUnit === 'function') {
    let _origTrainUnit = window.trainUnit;
    window.trainUnit = function() {
      let armyBefore = state.legia ? (state.legia.army ? state.legia.army.length : 0) : 0;
      let result = _origTrainUnit.apply(this, arguments);
      let armyAfter = state.legia ? (state.legia.army ? state.legia.army.length : 0) : 0;
      if (armyAfter > armyBefore) compassTrack('_cx_trained', armyAfter - armyBefore);
      return result;
    };
  }

  // Hook: advanceMainQuestCounter — track quest-related activities
  if (typeof window.advanceMainQuestCounter === 'function') {
    let _origAdvMQ = window.advanceMainQuestCounter;
    window.advanceMainQuestCounter = function(key, amt) {
      let result = _origAdvMQ.apply(this, arguments);
      // Map quest counters to compass counters
      if (key === 'mq_harvested') compassTrack('_cx_harvested', amt || 1);
      if (key === 'mq_built') compassTrack('_cx_built', amt || 1);
      if (key === 'mq_fished') compassTrack('_cx_fished', amt || 1);
      return result;
    };
  }

  // Hook: daily summary wreath tracking
  if (typeof window.calculateDailySummary === 'function') {
    let _origCalcDaily = window.calculateDailySummary;
    window.calculateDailySummary = function() {
      let result = _origCalcDaily.apply(this, arguments);
      if (result && result.wreaths > 0) compassTrack('_cx_wreaths', 1);
      return result;
    };
  }
})();

// ─── ACTIVITY TRACKING via dailyActivities polling ──────────────────────
// Since we can't hook every single action, we poll the dailyActivities
// object each frame and detect increments.
let _compassLastDailySnapshot = null;

function _compassPollDailyActivities() {
  if (!state.dailyActivities || !state._compass) return;
  let da = state.dailyActivities;
  if (!_compassLastDailySnapshot) {
    _compassLastDailySnapshot = {
      harvested: da.harvested || 0,
      fished: da.fished || 0,
      built: da.built || 0,
      gifted: da.gifted || 0,
      cooked: da.cooked || 0,
      catPetted: da.catPetted || 0,
      crystal: da.crystal || 0,
      chopped: da.chopped || 0,
    };
    return;
  }
  let snap = _compassLastDailySnapshot;
  let diff;

  diff = (da.harvested || 0) - snap.harvested;
  if (diff > 0) { compassTrack('_cx_harvested', diff); snap.harvested = da.harvested; }

  diff = (da.fished || 0) - snap.fished;
  if (diff > 0) { compassTrack('_cx_fished', diff); snap.fished = da.fished; }

  diff = (da.built || 0) - snap.built;
  if (diff > 0) { compassTrack('_cx_built', diff); snap.built = da.built; }

  diff = (da.gifted || 0) - snap.gifted;
  if (diff > 0) { compassTrack('_cx_gifted', diff); snap.gifted = da.gifted; }

  diff = (da.cooked || 0) - snap.cooked;
  if (diff > 0) { compassTrack('_cx_cooked', diff); snap.cooked = da.cooked; }

  diff = (da.catPetted || 0) - snap.catPetted;
  if (diff > 0) { compassTrack('_cx_catPetted', diff); snap.catPetted = da.catPetted; }

  diff = (da.crystal || 0) - snap.crystal;
  if (diff > 0) { compassTrack('_cx_crystal', diff); snap.crystal = da.crystal; }

  diff = (da.chopped || 0) - snap.chopped;
  if (diff > 0) { compassTrack('_cx_chopped', diff); snap.chopped = da.chopped; }

  // Track gold earnings
  if (typeof state.gold === 'number') {
    if (snap._lastGold === undefined) snap._lastGold = state.gold;
    let goldDiff = state.gold - snap._lastGold;
    if (goldDiff > 0) compassTrack('_cx_goldEarned', goldDiff);
    snap._lastGold = state.gold;
  }

  // Reset snapshot when daily activities reset (new day)
  if ((da.harvested || 0) < snap.harvested) {
    _compassLastDailySnapshot = null;
  }
}

// ─── COMBAT KILL TRACKING ───────────────────────────────────────────────
// Poll enemy kill count from state if available
let _compassLastKills = -1;
function _compassPollCombat() {
  if (!state._compass) return;
  if (state.score && typeof state.score.enemiesDefeated === 'number') {
    if (_compassLastKills < 0) _compassLastKills = state.score.enemiesDefeated;
    let diff = state.score.enemiesDefeated - _compassLastKills;
    if (diff > 0) compassTrack('_cx_kills', diff);
    _compassLastKills = state.score.enemiesDefeated;
  }
}

// ─── MASTER UPDATE — called from draw loop ──────────────────────────────
function updateAndDrawCompass() {
  if (!state || typeof state !== 'object') return;
  if (typeof gameScreen !== 'undefined' && gameScreen !== 'game') return;

  // Initialize on first frame of gameplay
  if (!state._compass) initSandboxCompass();

  // Poll activity trackers
  _compassPollDailyActivities();
  _compassPollCombat();

  // Check goal completion
  updateSandboxCompass();

  // Draw HUD
  drawSandboxCompass();
}

// ─── TOGGLE KEY — Tab key toggles compass visibility ────────────────────
// We add a secondary keypress listener that doesn't conflict with input.js
document.addEventListener('keydown', function(e) {
  if (e.key === 'Tab' && state && state._compass) {
    e.preventDefault();
    state._compass.hudOpen = !state._compass.hudOpen;
  }
});

// ─── WIRE INTO DRAW LOOP ────────────────────────────────────────────────
// We hook into the p5.js draw cycle by wrapping the global draw function.
// This runs AFTER all other drawing so the compass renders on top.
(function wireCompassIntoDraw() {
  // Wait for p5.js to be ready
  let _checkInterval = setInterval(function() {
    if (typeof window.draw === 'function' && typeof state !== 'undefined') {
      clearInterval(_checkInterval);
      let _origDraw = window.draw;
      window.draw = function() {
        _origDraw.apply(this, arguments);
        try { updateAndDrawCompass(); } catch(e) { /* fail silently */ }
      };
      console.log('[Sandbox Compass] ✓ Purpose layer active — Tab to toggle');
    }
  }, 500);
})();
