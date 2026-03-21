// ui.js — UI/HUD drawing functions extracted from sketch.js
// All functions are global (p5.js global mode)

// ─── FLOATING TEXT ────────────────────────────────────────────────────────
function addFloatingText(x, y, txt, col) {
  floatingText.push({ x, y, txt, col, life: 80, maxLife: 80, vy: -0.6 });
}

// ─── NOTIFICATION FEED ───────────────────────────────────────────────────
function addNotification(txt, col) {
  col = col || '#d4a040';
  notifications.push({ text: txt, col: col, timer: 300, maxTimer: 300, fadeIn: 0 });
  if (notifications.length > 6) notifications.shift();
}

function updateNotifications(dt) {
  for (let i = notifications.length - 1; i >= 0; i--) {
    let n = notifications[i];
    n.fadeIn = min(n.fadeIn + dt * 0.08, 1);
    n.timer -= dt;
    if (n.timer <= 0) { notifications.splice(i, 1); }
  }
}

function drawNotifications() {
  if (notifications.length === 0) return;
  textSize(10);
  let maxVisible = 3;
  let startIdx = max(0, notifications.length - maxVisible);
  let slotY = 8;

  for (let i = notifications.length - 1; i >= startIdx; i--) {
    let n = notifications[i];
    let fadeOut = n.timer < 40 ? n.timer / 40 : 1;
    let alpha = n.fadeIn * fadeOut;
    // Slide down from top
    let slideY = (1 - n.fadeIn) * -30;
    let tw = textWidth(n.text) + 32;
    let th = 22;
    let px = width / 2 - tw / 2;
    let py = slotY + slideY;

    // Parchment background
    noStroke();
    fill(235, 220, 190, 210 * alpha);
    rect(px + 4, py + 2, tw - 8, th - 4);
    // Ragged edges — small triangular notches on top and bottom
    for (let e = 0; e < tw - 12; e += 8) {
      let ex = px + 6 + e;
      // Top notches
      fill(235, 220, 190, 210 * alpha);
      triangle(ex, py + 2, ex + 4, py - 1, ex + 8, py + 2);
      // Bottom notches
      triangle(ex, py + th - 2, ex + 4, py + th + 1, ex + 8, py + th - 2);
    }
    // Darker border lines
    stroke(180, 160, 120, 140 * alpha);
    strokeWeight(0.7);
    // Left and right borders
    line(px + 4, py + 1, px + 4, py + th - 1);
    line(px + tw - 4, py + 1, px + tw - 4, py + th - 1);
    noStroke();

    // Text in dark brown
    textAlign(CENTER, CENTER);
    fill(60, 40, 20, 240 * alpha);
    text(n.text, width / 2, py + th / 2);
    slotY += th + 4;
  }
  textAlign(LEFT, TOP);
}

// ─── DAY/NIGHT CLOCK HUD ────────────────────────────────────────────────
function drawClockHUD() {
  if (photoMode || screenshotMode) return;
  if (dialogState && dialogState.active) return;
  let h = state.time / 60;
  let cx = width / 2, cy = 28, r = 16;

  // Fade when player is near top center
  let _psx = w2sX(state.player.x), _psy = w2sY(state.player.y);
  let clockFade = (_psx > width * 0.35 && _psx < width * 0.65 && _psy < height * 0.15) ? 0.3 : 1.0;
  drawingContext.globalAlpha = clockFade;

  // Dark semi-transparent background
  noStroke();
  fill(15, 12, 8, 160);
  ellipse(cx, cy, r * 2, r * 2);

  // Hour markers (12 ticks)
  for (let i = 0; i < 12; i++) {
    let a = (i / 12) * TWO_PI - HALF_PI;
    let ix = cx + cos(a) * (r - 3);
    let iy = cy + sin(a) * (r - 3);
    fill(180, 160, 120, 120);
    ellipse(ix, iy, 1.5, 1.5);
  }

  // Determine if day or night, and icon angle
  // Sun: visible 5-21, moon: visible 21-5 (next day)
  let isDay = h >= 5 && h < 21;
  let iconAngle;
  if (isDay) {
    // Map 5-21 to left(-PI) -> top(-HALF_PI) -> right(0)
    iconAngle = map(h, 5, 21, PI, 0) - HALF_PI;
  } else {
    // Map 21-29(5) to left(PI) -> top(HALF_PI) -> right(0)
    let nightH = h >= 21 ? h - 21 : h + 3; // 0-8 range
    iconAngle = map(nightH, 0, 8, PI, 0) - HALF_PI;
  }
  let iconX = cx + cos(iconAngle) * (r - 7);
  let iconY = cy + sin(iconAngle) * (r - 7);

  if (isDay) {
    // Sun - yellow circle with tiny rays
    fill(255, 220, 60);
    ellipse(iconX, iconY, 7, 7);
    stroke(255, 220, 60, 150);
    strokeWeight(0.5);
    for (let i = 0; i < 8; i++) {
      let ra = (i / 8) * TWO_PI;
      line(iconX + cos(ra) * 4.5, iconY + sin(ra) * 4.5,
           iconX + cos(ra) * 6, iconY + sin(ra) * 6);
    }
    noStroke();
  } else {
    // Moon - white crescent
    fill(230, 230, 245);
    ellipse(iconX, iconY, 6, 6);
    fill(15, 12, 8, 160);
    ellipse(iconX + 2, iconY - 1, 5, 5);
  }

  // Time period label below clock
  let period;
  if (h >= 5 && h < 7) period = 'Dawn';
  else if (h >= 7 && h < 11) period = 'Morning';
  else if (h >= 11 && h < 13) period = 'Noon';
  else if (h >= 13 && h < 17) period = 'Afternoon';
  else if (h >= 17 && h < 21) period = 'Dusk';
  else if (h >= 21 && h < 24 || h >= 0 && h < 1) period = 'Night';
  else period = 'Midnight';

  textAlign(CENTER, TOP);
  textSize(7);
  fill(200, 180, 140, 180 * clockFade);
  text(period, cx, cy + r + 3);
  textAlign(LEFT, TOP);
  drawingContext.globalAlpha = 1;
}

// ─── ACHIEVEMENT POPUP ──────────────────────────────────────────────────
function showAchievement(txt) {
  achievementPopup = { text: txt, timer: 240, slideX: 250 };
}

function updateAchievementPopup(dt) {
  if (!achievementPopup) return;
  let a = achievementPopup;
  // Slide in
  if (a.timer > 200) a.slideX = max(0, a.slideX - dt * 8);
  // Slide out
  else if (a.timer < 40) a.slideX = min(250, a.slideX + dt * 8);
  a.timer -= dt;
  if (a.timer <= 0) achievementPopup = null;
}

function drawAchievementPopup() {
  if (!achievementPopup) return;
  let a = achievementPopup;
  let pw = 200, ph = 36;
  let px = width - pw + a.slideX;
  let py = 100;
  // Panel
  noStroke();
  fill(25, 20, 12, 230);
  rect(px, py, pw, ph, 4);
  stroke(212, 160, 64, 200);
  strokeWeight(1.5);
  noFill();
  rect(px, py, pw, ph, 4);
  noStroke();
  // Star icon
  fill(255, 200, 40);
  textSize(14);
  textAlign(LEFT, CENTER);
  text('\u2605', px + 8, py + ph / 2);
  // Text
  fill(240, 220, 180);
  textSize(11);
  text(a.text, px + 26, py + ph / 2 - 1);
  textAlign(LEFT, TOP);
}

function drawFloatingText() {
  floatingText.forEach(f => {
    let a = map(f.life, 0, f.maxLife, 0, 255);
    let age = f.maxLife - f.life;
    // Scale pop: start at 1.4x, settle to 1.0 with bounce ease
    let scaleT = min(age / 12, 1);
    let sc = 1 + 0.4 * (1 - scaleT) * (1 + sin(scaleT * PI * 2) * 0.3);
    let c = color(f.col);
    // Drop shadow
    c.setAlpha(a * 0.3);
    noStroke();
    fill(c);
    textAlign(CENTER, CENTER);
    textSize(11 * sc);
    text(f.txt, f.x + 1, f.y + 1);
    // Main text
    c.setAlpha(a);
    fill(c);
    text(f.txt, f.x, f.y);
  });
  textAlign(LEFT, TOP);
}

function updateScreenTransition(dt) {
  if (!screenTransition.active) return;
  screenTransition.alpha += screenTransition.dir * 8 * dt;
  if (screenTransition.dir > 0 && screenTransition.alpha >= 255) {
    screenTransition.alpha = 255;
    if (screenTransition.callback) screenTransition.callback();
    screenTransition.dir = -1;
  } else if (screenTransition.dir < 0 && screenTransition.alpha <= 0) {
    screenTransition.alpha = 0;
    screenTransition.active = false;
  }
}

function startScreenTransition(callback) {
  screenTransition.active = true;
  screenTransition.alpha = 0;
  screenTransition.dir = 1;
  screenTransition.callback = callback;
}

function drawScreenTransition() {
  if (!screenTransition.active) return;
  noStroke();
  fill(10, 8, 5, screenTransition.alpha);
  rect(0, 0, width, height);
}


// ─── JOURNAL / CODEX UI ─────────────────────────────────────────────────
function drawJournalUI() {
  if (!state.journalOpen) return;
  let pw = min(360, width - 20), ph = min(340, height - 20);
  let panX = max(10, width / 2 - pw / 2);
  let panY = max(10, height / 2 - ph / 2);

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, pw, ph);

  // Title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80);
  textAlign(CENTER, TOP);
  textSize(15);
  text("EXILE'S JOURNAL", width / 2, panY + 12);
  textFont('monospace');

  fill(180, 160, 120);
  textSize(9);
  text(state.journal.length + ' / ' + JOURNAL_ENTRIES.length + ' entries discovered', width / 2, panY + 30);

  // Scrollable entries
  let startY = panY + 50;
  let maxEntries = 7; // visible at once
  textAlign(LEFT, TOP);

  for (let i = 0; i < JOURNAL_ENTRIES.length && i < maxEntries; i++) {
    let entry = JOURNAL_ENTRIES[i];
    let unlocked = state.journal.includes(entry.id);
    let ry = startY + i * 38;

    // Row bg
    fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
    rect(panX + 12, ry, pw - 24, 34, 3);

    if (unlocked) {
      // Title
      fill(210, 190, 130);
      textSize(10);
      text(entry.title, panX + 20, ry + 3);
      // Preview text (truncated)
      fill(160, 145, 110);
      textSize(10);
      let preview = entry.text.substring(0, 65) + '...';
      text(preview, panX + 20, ry + 18);
    } else {
      // Locked
      fill(90, 80, 60);
      textSize(10);
      text('???  —  ' + (i < 4 ? 'Keep exploring...' : 'A deeper mystery awaits'), panX + 20, ry + 10);
    }
  }

  // More indicator
  if (JOURNAL_ENTRIES.length > maxEntries) {
    fill(120, 100, 70);
    textAlign(CENTER, TOP);
    textSize(11);
    text('... ' + (JOURNAL_ENTRIES.length - maxEntries) + ' more entries below ...', width / 2, startY + maxEntries * 38 + 4);
  }

  // Tab hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(11);
  text('[TAB] Codex    [V] Close', width / 2, panY + ph - 16);
  textAlign(LEFT, TOP);
}

function drawCodexUI() {
  if (!state.codexOpen) return;
  if (state.journalOpen) { drawJournalUI(); return; }
  let pw = min(340, width - 20), ph = min(320, height - 20);
  let panX = max(10, width / 2 - pw / 2);
  let panY = max(10, height / 2 - ph / 2);

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, pw, ph);

  // Title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80);
  textAlign(CENTER, TOP);
  textSize(15);
  text('VILLA CODEX', width / 2, panY + 12);
  textFont('monospace');

  let comp = getCodexCompletion();
  fill(160, 140, 100);
  textSize(9);
  text(comp.done + ' / ' + comp.total + ' (' + floor(comp.pct * 100) + '%)', width / 2, panY + 30);

  // Progress bar
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  line(panX + 30, panY + 44, panX + pw - 30, panY + 44);
  noStroke();
  fill(60, 50, 35);
  rect(panX + 30, panY + 48, pw - 60, 8, 4);
  fill(200, 170, 90);
  rect(panX + 30, panY + 48, (pw - 60) * comp.pct, 8, 4);

  // Categories
  let c = state.codex;
  let categories = [
    { name: 'Fish Caught', done: Object.keys(c.fishCaught).length, total: 5,
      items: ['sardine', 'tuna', 'octopus', 'eel', 'goldfish'], check: k => c.fishCaught[k] },
    { name: 'Crops Grown', done: Object.keys(c.cropsGrown).length, total: 7,
      items: ['grain', 'grape', 'olive', 'wildflower', 'sunfruit', 'pumpkin', 'frostherb'], check: k => c.cropsGrown[k] },
    { name: 'Buildings', done: Object.keys(c.buildingsBuilt).length, total: 20,
      items: Object.keys(BLUEPRINTS), check: k => c.buildingsBuilt[k] },
    { name: 'Treasures', done: min(5, c.treasuresFound), total: 5 },
    { name: 'Festivals', done: min(4, c.festivalsAttended), total: 4 },
    { name: 'Visitor Trades', done: min(5, c.visitorsTraded), total: 5 },
    { name: 'Best Combo', done: c.bestCombo >= 10 ? 1 : 0, total: 1,
      extra: 'Record: ' + c.bestCombo },
  ];

  let startY = panY + 68;
  textAlign(LEFT, TOP);
  categories.forEach((cat, i) => {
    let ry = startY + i * 32;
    // Row bg
    fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
    rect(panX + 12, ry - 2, pw - 24, 28, 3);
    // Name
    fill(cat.done >= cat.total ? color(180, 200, 100) : color(200, 180, 140));
    textSize(10);
    text(cat.name, panX + 20, ry + 2);
    // Count
    fill(cat.done >= cat.total ? color(180, 200, 100) : color(140, 120, 90));
    textSize(9);
    textAlign(RIGHT, TOP);
    text(cat.done + '/' + cat.total + (cat.extra ? ' — ' + cat.extra : ''), panX + pw - 20, ry + 3);
    textAlign(LEFT, TOP);
    // Items preview
    if (cat.items) {
      let ix = panX + 20;
      textSize(10);
      cat.items.forEach((item, j) => {
        if (j > 6) return;
        let found = cat.check(item);
        fill(found ? color(160, 180, 90) : color(80, 70, 55));
        text(found ? item : '???', ix, ry + 16);
        ix += textWidth(found ? item : '???') + 6;
      });
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(11);
  text('[TAB] Journal    [V] Close', width / 2, panY + ph - 16);
  textAlign(LEFT, TOP);
}

// ─── RECIPE BOOK UI ──────────────────────────────────────────────────────

let recipeBookOpen = false;

// Ingredient display names
const _INGREDIENT_NAMES = {
  harvest: 'Harvest', fish: 'Fish', wood: 'Wood', grapeSeeds: 'Grape',
  oliveSeeds: 'Olive', exoticSpices: 'Spice', soulEssence: 'Essence',
  wine: 'Wine', crystals: 'Crystal',
};

// Recipe effect descriptions
const _RECIPE_EFFECTS = {
  'Meal': 'Gift (+2 hearts) or eat for energy',
  'Wine': 'Gift (+3 hearts), feast ingredient',
  'Olive Oil': 'Gift (+3 hearts), trade value',
  'Feast': 'Grand feast — 3 meals at once',
  'Stew': 'Heals 30 HP in combat',
  'Garum': 'Trade to merchants for 25g',
  'Honeyed Figs': '+15% XP gain for 1 day',
  'Ambrosia': 'Full heal + brief invulnerability',
};

function drawRecipeBookUI() {
  if (!recipeBookOpen) return;
  push();

  let pw = min(340, width - 20), ph = min(340, height - 20);
  let panX = max(10, width / 2 - pw / 2);
  let panY = max(10, height / 2 - ph / 2);

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, pw, ph);

  // Title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80);
  textAlign(CENTER, TOP);
  textSize(15);
  text('RECIPE BOOK', width / 2, panY + 12);
  textFont('monospace');

  fill(180, 160, 120);
  textSize(11);
  text('Cook at the Cookpot near your villa', width / 2, panY + 29);

  // Recipe list
  let startY = panY + 46;
  let rowH = 34;
  textAlign(LEFT, TOP);

  for (let i = 0; i < RECIPES.length; i++) {
    let r = RECIPES[i];
    let ry = startY + i * rowH;
    if (ry + rowH > panY + ph - 20) break;
    let affordable = canCook(r);

    // Row background
    fill(i % 2 === 0 ? color(55, 45, 30, 100) : color(50, 40, 28, 60));
    rect(panX + 10, ry, pw - 20, rowH - 2, 3);

    // Affordable indicator dot
    fill(affordable ? color(80, 200, 80) : color(80, 60, 50));
    ellipse(panX + 20, ry + rowH / 2 - 2, 6, 6);

    // Recipe name
    fill(affordable ? color(220, 200, 150) : color(150, 135, 110));
    textSize(10);
    text(r.name, panX + 28, ry + 2);

    // Qty indicator
    let owned = state[r.item] || 0;
    if (owned > 0) {
      fill(180, 170, 120);
      textSize(10);
      text('x' + owned, panX + 28 + textWidth(r.name) + 6, ry + 4);
    }

    // Ingredients line
    let ingParts = [];
    for (let [res, amt] of Object.entries(r.needs)) {
      let resName = _INGREDIENT_NAMES[res] || res;
      let have = state[res] || 0;
      ingParts.push(amt + ' ' + resName + (have < amt ? ' (' + have + ')' : ''));
    }
    fill(affordable ? color(160, 150, 120) : color(120, 105, 85));
    textSize(10);
    text(ingParts.join('  +  '), panX + 28, ry + 15);

    // Effect text
    let eff = _RECIPE_EFFECTS[r.name] || '';
    if (eff) {
      fill(140, 160, 120);
      textSize(9);
      textAlign(RIGHT, TOP);
      text(eff, panX + pw - 16, ry + 4);
      textAlign(LEFT, TOP);
    }
  }

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(11);
  text('[G] Close    Cook at Cookpot with [E]', width / 2, panY + ph - 16);
  textAlign(LEFT, TOP);

  pop();
}

// ─── NATURALIST'S CODEX UI ────────────────────────────────────────────────
const NAT_TAB_NAMES = ['Fish', 'Crops', 'Bestiary', 'Relics', 'Buildings', 'Lore'];
const NAT_RARITY_COLORS = { Common: '#aabbcc', Uncommon: '#88cc88', Rare: '#ddaa33', Legendary: '#ff8844' };

function getNatCodexCompletion() {
  let total = 0, done = 0;
  let fishKeys = Object.keys(NAT_FISH_DATA);
  total += fishKeys.length;
  fishKeys.forEach(k => { if (state.codex.fish && state.codex.fish[k]) done++; });
  let cropKeys = Object.keys(NAT_CROP_DATA);
  total += cropKeys.length;
  cropKeys.forEach(k => { if (state.codex.crops && state.codex.crops[k]) done++; });
  let enemyKeys = Object.keys(NAT_ENEMY_DATA);
  total += enemyKeys.length;
  enemyKeys.forEach(k => { if (state.codex.enemies && state.codex.enemies[k]) done++; });
  let relicKeys = Object.keys(NAT_RELIC_DATA);
  total += relicKeys.length;
  relicKeys.forEach(k => { if (state.codex.relics && state.codex.relics[k]) done++; });
  total += 20; // lore tablets
  if (state.codex.lore) done += Object.keys(state.codex.lore).length;
  return { total, done };
}

function getNatTabCompletion(tab) {
  if (tab === 0) {
    let k = Object.keys(NAT_FISH_DATA); let d = k.filter(x => state.codex.fish && state.codex.fish[x]).length;
    return { done: d, total: k.length, complete: d >= k.length };
  }
  if (tab === 1) {
    let k = Object.keys(NAT_CROP_DATA); let d = k.filter(x => state.codex.crops && state.codex.crops[x]).length;
    return { done: d, total: k.length, complete: d >= k.length };
  }
  if (tab === 2) {
    let k = Object.keys(NAT_ENEMY_DATA); let d = k.filter(x => state.codex.enemies && state.codex.enemies[x]).length;
    return { done: d, total: k.length, complete: d >= k.length };
  }
  if (tab === 3) {
    let k = Object.keys(NAT_RELIC_DATA); let d = k.filter(x => state.codex.relics && state.codex.relics[x]).length;
    return { done: d, total: k.length, complete: d >= k.length };
  }
  if (tab === 4) {
    let k = Object.keys(state.codex.buildingsBuilt || {}); let t = 20;
    return { done: min(k.length, t), total: t, complete: k.length >= t };
  }
  if (tab === 5) {
    let d = Object.keys(state.codex.lore || {}).length;
    return { done: d, total: 20, complete: d >= 20 };
  }
  return { done: 0, total: 1, complete: false };
}

function drawNaturalistCodex() {
  if (!state.naturalistOpen) return;
  push();
  let pw = min(width - 40, 560), ph = min(height - 60, 480);
  let px = (width - pw) / 2, py = (height - ph) / 2;
  // Parchment background
  drawParchmentPanel(px, py, pw, ph);
  // Title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80); textSize(16); textAlign(CENTER, TOP);
  text("Naturalist's Codex", px + pw / 2, py + 10);
  textFont('monospace');
  // Overall progress bar
  let comp = getNatCodexCompletion();
  let barW = pw - 80, barX = px + 40, barY = py + 33;
  fill(60, 50, 35); rect(barX, barY, barW, 8, 4);
  fill(120, 170, 100); rect(barX, barY, barW * (comp.done / max(comp.total, 1)), 8, 4);
  fill(180, 160, 120); textSize(10); textAlign(RIGHT, TOP);
  text(comp.done + '/' + comp.total, px + pw - 35, barY);
  // Tab strip
  let tabW = pw / 6, tabY = py + 48;
  for (let i = 0; i < 6; i++) {
    let tx = px + i * tabW;
    let tc = getNatTabCompletion(i);
    let active = state.naturalistTab === i;
    fill(active ? [65, 52, 35] : [40, 32, 22]);
    stroke(120, 95, 55, 120); strokeWeight(0.8);
    rect(tx, tabY, tabW, 20, active ? [4, 4, 0, 0] : 0);
    noStroke();
    fill(tc.complete ? [140, 200, 100] : (active ? [210, 180, 80] : [140, 120, 80]));
    textSize(11); textAlign(CENTER, CENTER);
    text(NAT_TAB_NAMES[i] + ' ' + tc.done + '/' + tc.total, tx + tabW / 2, tabY + 10);
  }
  // Content area
  let cx = px + 10, cy = tabY + 24, cw = pw - 20, ch = ph - (cy - py) - 30;
  fill(35, 28, 20, 180); noStroke(); rect(cx, cy - 2, cw, ch + 4, 4);
  // Dispatch
  if (state.naturalistTab === 0) drawNatFishTab(cx, cy, cw, ch);
  else if (state.naturalistTab === 1) drawNatCropsTab(cx, cy, cw, ch);
  else if (state.naturalistTab === 2) drawNatBestiaryTab(cx, cy, cw, ch);
  else if (state.naturalistTab === 3) drawNatRelicsTab(cx, cy, cw, ch);
  else if (state.naturalistTab === 4) drawNatBuildingsTab(cx, cy, cw, ch);
  else if (state.naturalistTab === 5) drawNatLoreTab(cx, cy, cw, ch);
  // Close hint
  fill(120, 100, 70); textSize(10); textAlign(CENTER, BOTTOM);
  text('[N] Close  |  [1-6] Switch Tab', px + pw / 2, py + ph - 5);
  pop();
}

function _drawNatEntry(x, y, w, label, rarity, desc, countStr, discovered) {
  let bg = discovered ? color(250, 245, 230, 220) : color(200, 195, 185, 140);
  fill(bg); noStroke(); rect(x, y, w, 42, 4);
  if (discovered) {
    fill(color(NAT_RARITY_COLORS[rarity] || '#aabbcc')); textSize(10); textAlign(LEFT, TOP);
    text(rarity, x + 6, y + 3);
    fill(60, 40, 20); textSize(9); textStyle(BOLD);
    text(label, x + 6, y + 12);
    textStyle(NORMAL); fill(90, 70, 45); textSize(10);
    text(desc, x + 6, y + 24, w - 60);
    if (countStr) { fill(100, 140, 80); textSize(10); textAlign(RIGHT, TOP); text(countStr, x + w - 6, y + 12); }
  } else {
    fill(140, 130, 110); textSize(9); textAlign(LEFT, TOP); textStyle(ITALIC);
    text('???', x + 6, y + 14);
    textStyle(NORMAL); textSize(10); fill(150, 140, 120);
    text('Not yet discovered', x + 6, y + 26);
  }
  textAlign(LEFT, TOP); textStyle(NORMAL);
}

function drawNatFishTab(cx, cy, cw, ch) {
  let cols = 2, entH = 46, gap = 4;
  let keys = Object.keys(NAT_FISH_DATA);
  let colW = (cw - gap * (cols + 1)) / cols;
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i], d = NAT_FISH_DATA[k];
    let col = i % cols, row = floor(i / cols);
    let ex = cx + gap + col * (colW + gap), ey = cy + gap + row * (entH + gap);
    if (ey + entH > cy + ch) continue;
    let rec = state.codex.fish && state.codex.fish[k];
    let countStr = rec ? 'Caught: ' + rec.count : null;
    let extra = rec ? ' | Day ' + rec.firstDay : '';
    _drawNatEntryWithDiscovery(ex, ey, colW, d.label, d.rarity, d.desc + '  [' + d.season + ', ' + d.time + ']' + extra, countStr, !!rec, 'fish', k);
  }
  // Completion reward note
  let tc = getNatTabCompletion(0);
  fill(tc.complete ? [140, 200, 100] : [160, 140, 100]); textSize(10); textAlign(LEFT, BOTTOM);
  text(tc.complete ? 'REWARD ACTIVE: +50% fishing speed' : 'Complete all ' + tc.total + ' fish for +50% fishing speed', cx + 4, cy + ch - 2);
}

function drawNatCropsTab(cx, cy, cw, ch) {
  let keys = Object.keys(NAT_CROP_DATA);
  let entH = 46, gap = 4, colW = (cw - gap * 3) / 2;
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i], d = NAT_CROP_DATA[k];
    let col = i % 2, row = floor(i / 2);
    let ex = cx + gap + col * (colW + gap), ey = cy + gap + row * (entH + gap);
    if (ey + entH > cy + ch) continue;
    let rec = state.codex.crops && state.codex.crops[k];
    let countStr = rec ? 'Harvested: ' + rec.count : null;
    _drawNatEntryWithDiscovery(ex, ey, colW, d.label, d.rarity, d.desc, countStr, !!rec, 'crops', k);
  }
  let tc = getNatTabCompletion(1);
  fill(tc.complete ? [140, 200, 100] : [160, 140, 100]); textSize(10); textAlign(LEFT, BOTTOM);
  text(tc.complete ? 'REWARD ACTIVE: +1 seed per harvest' : 'Grow all ' + tc.total + ' crops for +1 bonus seed per harvest', cx + 4, cy + ch - 2);
}

function drawNatBestiaryTab(cx, cy, cw, ch) {
  let keys = Object.keys(NAT_ENEMY_DATA);
  let entH = 46, gap = 4, colW = (cw - gap * 3) / 2;
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i], d = NAT_ENEMY_DATA[k];
    let col = i % 2, row = floor(i / 2);
    let ex = cx + gap + col * (colW + gap), ey = cy + gap + row * (entH + gap);
    if (ey + entH > cy + ch) continue;
    let rec = state.codex.enemies && state.codex.enemies[k];
    let countStr = rec ? 'Defeated: ' + rec.count : null;
    _drawNatEntryWithDiscovery(ex, ey, colW, d.label, d.rarity, d.desc, countStr, !!rec, 'enemies', k);
  }
  let tc = getNatTabCompletion(2);
  fill(tc.complete ? [140, 200, 100] : [160, 140, 100]); textSize(10); textAlign(LEFT, BOTTOM);
  text(tc.complete ? 'REWARD ACTIVE: +10% damage' : 'Defeat all ' + tc.total + ' enemy types for +10% damage', cx + 4, cy + ch - 2);
}

function drawNatRelicsTab(cx, cy, cw, ch) {
  let keys = Object.keys(NAT_RELIC_DATA);
  let entH = 46, gap = 4, colW = (cw - gap * 3) / 2;
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i], d = NAT_RELIC_DATA[k];
    let col = i % 2, row = floor(i / 2);
    let ex = cx + gap + col * (colW + gap), ey = cy + gap + row * (entH + gap);
    if (ey + entH > cy + ch) continue;
    let rec = state.codex.relics && state.codex.relics[k];
    let countStr = rec ? 'Found day ' + rec.firstDay : null;
    _drawNatEntryWithDiscovery(ex, ey, colW, d.label, d.rarity, d.desc, countStr, !!rec, 'relics', k);
  }
  let tc = getNatTabCompletion(3);
  fill(160, 140, 100); textSize(10); textAlign(LEFT, BOTTOM);
  text('Dig treasures around the island to find relics. ' + tc.done + '/' + tc.total + ' found.', cx + 4, cy + ch - 2);
}

function drawNatBuildingsTab(cx, cy, cw, ch) {
  let built = Object.keys(state.codex.buildingsBuilt || {});
  let entH = 20, gap = 3, cols = 3, colW = (cw - gap * (cols + 1)) / cols;
  let all = Object.keys(BLUEPRINTS || {});
  for (let i = 0; i < all.length; i++) {
    let k = all[i];
    let col = i % cols, row = floor(i / cols);
    let ex = cx + gap + col * (colW + gap), ey = cy + gap + row * (entH + gap);
    if (ey + entH > cy + ch) continue;
    let isBuilt = state.codex.buildingsBuilt && state.codex.buildingsBuilt[k];
    fill(isBuilt ? color(230, 225, 205, 220) : color(195, 190, 180, 130));
    noStroke(); rect(ex, ey, colW, entH, 3);
    fill(isBuilt ? [50, 35, 20] : [140, 130, 115]); textSize(11); textAlign(LEFT, CENTER);
    let bp = BLUEPRINTS && BLUEPRINTS[k];
    let label = bp ? bp.name : k;
    text((isBuilt ? '' : '? ') + label, ex + 5, ey + entH / 2);
  }
  let tc = getNatTabCompletion(4);
  fill(tc.complete ? [140, 200, 100] : [160, 140, 100]); textSize(10); textAlign(LEFT, BOTTOM);
  text(tc.complete ? 'REWARD ACTIVE: -20% build cost' : 'Build all types for -20% build cost. ' + tc.done + '/20 built.', cx + 4, cy + ch - 2);
}

function drawNatLoreTab(cx, cy, cw, ch) {
  let found = state.codex.lore || {};
  let entH = 20, gap = 3, cols = 4, colW = (cw - gap * (cols + 1)) / cols;
  for (let i = 0; i < 20; i++) {
    let k = String(i + 1);
    let col = i % cols, row = floor(i / cols);
    let ex = cx + gap + col * (colW + gap), ey = cy + gap + row * (entH + gap);
    if (ey + entH > cy + ch) continue;
    let rec = found[k];
    fill(rec ? color(230, 225, 205, 220) : color(195, 190, 180, 130));
    noStroke(); rect(ex, ey, colW, entH, 3);
    fill(rec ? [50, 35, 20] : [140, 130, 115]); textSize(11); textAlign(LEFT, CENTER);
    text(rec ? 'Tablet #' + k : '? Tablet #' + k, ex + 5, ey + entH / 2);
    if (rec) { fill(100, 130, 80); textSize(9); text('Day ' + rec.firstDay, ex + colW - 28, ey + entH / 2); }
  }
  let tc = getNatTabCompletion(5);
  fill(tc.complete ? [140, 200, 100] : [160, 140, 100]); textSize(10); textAlign(LEFT, BOTTOM);
  text(tc.complete ? 'REWARD ACTIVE: All lore unlocked — speak to Felix.' : 'Find all 20 lore tablets. ' + tc.done + '/20 found.', cx + 4, cy + ch - 2);
}

// ─── MERCHANT SHOP UI ───────────────────────────────────────────────────
function _getShopTabOffers(tab, offers) {
  if (tab === 'buy') return offers.filter(o => o.type === 'sell'); // type 'sell' = player buys from merchant
  if (tab === 'sell') return offers.filter(o => o.type === 'buy'); // type 'buy' = merchant buys from player
  if (tab === 'upgrade') return offers.filter(o => o.type === 'tool');
  return offers;
}

function drawShopUI() {
  let ship = state.ship;
  if (!ship.shopOpen || ship.state !== 'docked') return;
  if (!ship.shopTab) ship.shopTab = 'buy';

  let tab = ship.shopTab;
  let filtered = _getShopTabOffers(tab, ship.offers);
  let panW = min(320, width - 20);
  let headerH = 90; // title + gold + tabs
  let panH = min(headerH + filtered.length * 28 + 28, height - 20);
  let panX = max(10, width / 2 - panW / 2);
  let panY = max(10, height / 2 - panH / 2);

  // Dim backdrop
  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  drawParchmentPanel(panX, panY, panW, panH);

  // Title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80);
  textSize(15);
  textAlign(CENTER, TOP);
  text('MERCATOR', width / 2, panY + 8);
  textFont('monospace');
  fill(210, 180, 80);
  textSize(11);
  text('Gold: ' + state.gold, width / 2, panY + 26);

  // Tab bar
  let tabs = ['buy', 'sell', 'upgrade'];
  let tabLabels = ['BUY', 'SELL', 'UPGRADE'];
  let tabKeys = ['1', '2', '3'];
  let tabW = floor((panW - 36) / 3);
  let tabY = panY + 42;
  for (let t = 0; t < 3; t++) {
    let tx = panX + 12 + t * (tabW + 6);
    let active = tab === tabs[t];
    // Tab background
    fill(active ? color(65, 55, 38, 220) : color(35, 28, 20, 160));
    noStroke();
    rect(tx, tabY, tabW, 22, 4, 4, 0, 0);
    // Active: gold border
    if (active) {
      stroke(210, 180, 80, 200);
      strokeWeight(1.5);
      noFill();
      rect(tx, tabY, tabW, 22, 4, 4, 0, 0);
      noStroke();
    }
    // Label
    fill(active ? color(220, 200, 150) : color(120, 100, 70));
    textSize(10);
    textAlign(CENTER, TOP);
    text(tabLabels[t] + ' [' + tabKeys[t] + ']', tx + tabW / 2, tabY + 6);
  }
  // Line under tabs
  stroke(140, 110, 55, 80);
  strokeWeight(0.5);
  line(panX + 12, tabY + 23, panX + panW - 12, tabY + 23);
  noStroke();

  // Category label
  fill(160, 140, 100);
  textSize(9);
  textAlign(CENTER, TOP);
  let catLabel = tab === 'buy' ? 'Resources & Seeds' : tab === 'sell' ? 'Your Goods' : 'Tool Upgrades';
  text(catLabel, width / 2, tabY + 27);

  // Offer rows
  let listY = tabY + 40;
  textAlign(LEFT, TOP);
  if (filtered.length === 0) {
    fill(120, 100, 70);
    textSize(10);
    textAlign(CENTER, TOP);
    text(tab === 'upgrade' ? 'All tools purchased!' : 'No items available', width / 2, listY + 10);
    textAlign(LEFT, TOP);
  }
  filtered.forEach((offer, i) => {
    let oy = listY + i * 28;
    let canDo = offer.type === 'buy' ?
      state[offer.item] >= offer.qty :
      state.gold >= offer.price;

    // Row background
    fill(canDo ? color(60, 50, 35, 150) : color(40, 30, 25, 100));
    rect(panX + 12, oy, panW - 24, 24, 3);
    // Left accent bar
    let accentCol = tab === 'buy' ? [80, 160, 80] : tab === 'sell' ? [180, 150, 60] : [100, 140, 200];
    fill(canDo ? color(accentCol[0], accentCol[1], accentCol[2]) : color(80, 60, 40));
    rect(panX + 12, oy, 3, 24, 3, 0, 0, 3);

    // Label
    fill(canDo ? color(220, 200, 150) : color(100, 85, 65));
    textSize(9);
    text(offer.label, panX + 22, oy + 8);

    // Price trend arrow
    if (offer.trend !== undefined && typeof drawPriceTrendArrow === 'function') {
      drawPriceTrendArrow(panX + panW - 50, oy + 12, offer.trend);
    }

    // Click hint
    if (canDo) {
      fill(accentCol[0], accentCol[1], accentCol[2]);
      textAlign(RIGHT, TOP);
      textSize(11);
      text('CLICK', panX + panW - 18, oy + 9);
      textAlign(LEFT, TOP);
    }
  });

  // Close hint
  fill(120, 100, 70);
  textAlign(CENTER, TOP);
  textSize(11);
  text('[E] Close', width / 2, panY + panH - 16);
  textAlign(LEFT, TOP);
}

// ─── ADVENTURE HUD ──────────────────────────────────────────────────────
function drawAdventureHUD() {
  let p = state.player;
  let a = state.adventure;
  push();

  // HP Bar — top center (shakes on damage)
  let barW = 200, barH = 16;
  let barX = width / 2 - barW / 2;
  let barY = 15;
  let _hpShakeOff = 0;
  if (_juiceHpShakeTimer > 0) {
    _hpShakeOff = floor(sin(_juiceHpShakeTimer * 1.5) * 3);
    _juiceHpShakeTimer -= 1;
  }
  // Background
  fill(40, 15, 15, 200);
  rect(barX - 2 + _hpShakeOff, barY - 2, barW + 4, barH + 4, 4);
  // Empty
  fill(80, 25, 20);
  rect(barX + _hpShakeOff, barY, barW, barH, 3);
  // Filled
  let hpFrac = max(0, p.hp / p.maxHp);
  let hpCol = hpFrac > 0.5 ? color(180, 50, 30) : (hpFrac > 0.25 ? color(200, 120, 20) : color(220, 40, 40));
  fill(hpCol);
  rect(barX + _hpShakeOff, barY, barW * hpFrac, barH, 3);
  // Low HP pulse
  if (hpFrac < 0.25) {
    let pulse = sin(frameCount * 0.15) * 0.3 + 0.7;
    fill(220, 40, 40, 40 * pulse);
    rect(barX + _hpShakeOff, barY, barW * hpFrac, barH, 3);
  }
  // Text
  fill(255);
  textSize(10);
  textAlign(CENTER, CENTER);
  text('HP ' + max(0, floor(p.hp)) + ' / ' + p.maxHp, width / 2 + _hpShakeOff, barY + barH / 2);

  // Wave indicator
  let waveText = '';
  if (a.waveState === 'fighting') waveText = 'WAVE ' + a.wave + (a.wave % 10 === 0 ? '  BOSS' : '');
  else if (a.waveState === 'intermission') waveText = 'Next wave in ' + ceil(a.waveTimer / 60) + '...';
  else if (a.waveState === 'victory') waveText = 'VICTORY! Press E to return';
  else if (a.waveState === 'idle') waveText = 'Prepare...';
  fill(255, 230, 180);
  textSize(12);
  text(waveText, width / 2, barY + barH + 16);

  // Kill count
  fill(200, 180, 140, 180);
  textSize(9);
  textAlign(LEFT, TOP);
  text('Kills: ' + a.killCount, 15, 15);
  text('Gold: ' + state.gold, 15, 28);

  // Attack cooldown indicator
  if (p.attackTimer > 0) {
    let cdFrac = p.attackTimer / p.attackCooldown;
    fill(60, 60, 60, 150);
    ellipse(width / 2, barY + barH + 42, 20, 20);
    fill(255, 200, 80, 200);
    arc(width / 2, barY + barH + 42, 18, 18, -HALF_PI, -HALF_PI + TWO_PI * (1 - cdFrac));
  }

  // Retreat hint
  if (a.waveState !== 'fighting') {
    fill(180, 180, 160, 150);
    textSize(9);
    textAlign(CENTER);
    text('[E] Board boat to retreat', width / 2, height - 25);
  }

  // Controls hint
  fill(160, 150, 130, 120);
  textSize(11);
  textAlign(RIGHT, BOTTOM);
  text('WASD move | SPACE attack | SHIFT sprint | ALT dodge', width - 10, height - 10);

  pop();
}

// ─── EXPEDITION FORGE UI ────────────────────────────────────────────────
function drawUpgradeShopUI() {
  if (!state.upgradeShopOpen) return;
  push();
  let panW = min(360, width - 20), panH = min(320, height - 20);
  let px = max(10, width / 2 - panW / 2), py = max(10, height / 2 - panH / 2);

  // Parchment background
  drawParchmentPanel(px, py, panW, panH);

  // Title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80); textSize(15); textAlign(CENTER);
  text('EXPEDITION FORGE', px + panW / 2, py + 18);
  textFont('monospace');
  fill(180, 160, 120); textSize(11);
  text('Upgrade your expeditions at the temple', px + panW / 2, py + 34);

  // Resource bar
  let ry = py + 44;
  fill(30, 25, 18, 180);
  rect(px + 8, ry, panW - 16, 18, 3);
  fill(200, 180, 130); textSize(10); textAlign(LEFT);
  let resText = 'Gold:' + state.gold + '  Wood:' + state.wood + '  Iron:' + state.ironOre +
    '  Hide:' + state.rareHide + '  Relic:' + state.ancientRelic + '  Bone:' + state.titanBone;
  text(resText, px + 12, ry + 12);

  // Upgrades list
  let keys = Object.keys(EXPEDITION_UPGRADES);
  let sy = py + 70;
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let upg = EXPEDITION_UPGRADES[key];
    let tier = state.expeditionUpgrades[key] || 0;
    let maxTier = upg.tiers.length;
    let atMax = (key === 'expeditionTier') ? tier >= maxTier : tier >= maxTier;

    let rowY = sy + i * 36;
    // Row bg
    fill(i % 2 === 0 ? 45 : 40, i % 2 === 0 ? 38 : 33, 28, 150);
    rect(px + 8, rowY, panW - 16, 32, 3);

    // Name + desc
    fill(atMax ? 100 : 220, atMax ? 180 : 200, atMax ? 60 : 150);
    textSize(10); textAlign(LEFT);
    text(upg.name + (atMax ? ' (MAX)' : ' [Tier ' + tier + '/' + maxTier + ']'), px + 14, rowY + 12);
    fill(150, 140, 110); textSize(10);
    text(upg.desc, px + 14, rowY + 24);

    // Cost + buy button
    if (!atMax) {
      let cost = upg.tiers[tier];
      let resNames = {gold:'gold', wood:'wood', ironOre:'iron', rareHide:'hide', ancientRelic:'relic', titanBone:'bone'};
      let costStr = Object.entries(cost).map(([k, v]) => v + ' ' + (resNames[k]||k)).join(', ');
      let canAfford = canAffordUpgrade(cost);

      fill(canAfford ? 80 : 50, canAfford ? 160 : 50, canAfford ? 80 : 50, 200);
      let btnX = px + panW - 85, btnY = rowY + 4;
      rect(btnX, btnY, 72, 24, 4);
      fill(canAfford ? 220 : 120, canAfford ? 240 : 120, canAfford ? 220 : 120);
      textSize(10); textAlign(CENTER, CENTER);
      text(costStr, btnX + 36, btnY + 12);
    }
  }

  // Close hint
  fill(140, 130, 100, 120); textSize(11); textAlign(CENTER);
  text('[E] Close', px + panW / 2, py + panH - 10);
  pop();
}

// ─── BOUNTY BOARD UI ────────────────────────────────────────────────────
function drawBountyBoard() {
  let bb = state.bountyBoard;
  if (!bb.bounties || bb.bounties.length === 0) return;
  // Show bounties in conquest HUD — top right
  let bx = width - 180, by = 12;
  push();
  fill(30, 25, 18, 200);
  stroke(120, 100, 60, 150);
  strokeWeight(1);
  rect(bx, by, 170, 16 + bb.bounties.length * 22, 5);
  noStroke();
  fill(200, 180, 120); textSize(11); textAlign(LEFT);
  text('BOUNTIES', bx + 8, by + 11);
  for (let i = 0; i < bb.bounties.length; i++) {
    let b = bb.bounties[i];
    let ry = by + 18 + i * 22;
    fill(b.completed ? 60 : 35, b.completed ? 50 : 30, 25, 150);
    rect(bx + 4, ry, 162, 18, 3);
    fill(b.completed ? color(100, 180, 80) : color(180, 160, 120));
    textSize(10); textAlign(LEFT);
    text(b.desc, bx + 8, ry + 10);
    // Progress
    fill(b.completed ? color(100, 200, 80) : color(140, 120, 80));
    textAlign(RIGHT);
    let progText = b.completed ? 'DONE' : b.progress + '/' + b.target;
    text(progText, bx + 162, ry + 10);
    textAlign(LEFT);
  }
  pop();
}

// ─── EXPEDITION MODIFIERS ────────────────────────────────────────────────
const EXPEDITION_MODIFIERS = {
  normal:     { name: 'Standard',    desc: 'No modifiers',           color: '#bbbbbb', enemyMult: 1.0, lootMult: 1.0, spawnMult: 1.0, speedMult: 1.0 },
  blood_moon: { name: 'Blood Moon',  desc: '2x enemies, 2x loot',   color: '#ff4444', enemyMult: 1.5, lootMult: 2.0, spawnMult: 0.5, speedMult: 1.2 },
  foggy:      { name: 'Fog of Dread',desc: 'Thick fog, rare spawns', color: '#8899aa', enemyMult: 0.7, lootMult: 1.3, spawnMult: 1.5, speedMult: 0.8 },
  sacred:     { name: 'Sacred Ground',desc:'No enemies, 3x trees',   color: '#88ddff', enemyMult: 0.0, lootMult: 0.3, spawnMult: 99,  speedMult: 1.0 },
  golden:     { name: 'Golden Age',  desc: '+50% gold, fast danger', color: '#ffcc44', enemyMult: 1.2, lootMult: 1.0, spawnMult: 0.8, speedMult: 1.0, goldMult: 1.5, dangerMult: 1.5 },
};

function getModifier() {
  let key = state.expeditionModifier || 'normal';
  return EXPEDITION_MODIFIERS[key] || EXPEDITION_MODIFIERS.normal;
}

function drawModifierSelectUI() {
  if (!state.expeditionModifierSelect) return;
  push();
  // Dim backdrop
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  let panW = 340, panH = 230;
  let px = width / 2 - panW / 2, py = height / 2 - panH / 2;

  // Panel bg
  fill(35, 30, 22, 240);
  stroke(140, 110, 60);
  strokeWeight(2);
  rect(px, py, panW, panH, 8);
  noStroke();

  // Title
  fill(220, 200, 150); textSize(13); textAlign(CENTER);
  text('CHOOSE EXPEDITION TYPE', px + panW / 2, py + 20);
  fill(160, 140, 100); textSize(10);
  text('Select a modifier for this expedition', px + panW / 2, py + 34);

  // Modifier options
  let mods = Object.keys(EXPEDITION_MODIFIERS);
  let sy = py + 48;
  for (let i = 0; i < mods.length; i++) {
    let key = mods[i];
    let mod = EXPEDITION_MODIFIERS[key];
    let ry = sy + i * 34;
    let selected = (state.expeditionModifier || 'normal') === key;

    // Row bg
    fill(selected ? 55 : 40, selected ? 48 : 35, selected ? 35 : 25, 180);
    if (selected) { stroke(200, 180, 100, 120); strokeWeight(1); }
    rect(px + 8, ry, panW - 16, 30, 4);
    noStroke();

    // Color indicator
    fill(mod.color);
    ellipse(px + 20, ry + 15, 8, 8);

    // Name + desc
    fill(selected ? 255 : 200, selected ? 240 : 190, selected ? 200 : 150);
    textSize(10); textAlign(LEFT);
    text(mod.name, px + 30, ry + 11);
    fill(150, 140, 110); textSize(10);
    text(mod.desc, px + 30, ry + 23);

    // Key hint
    fill(180, 160, 100, 150);
    textSize(9); textAlign(RIGHT);
    text('[' + (i + 1) + ']', px + panW - 16, ry + 15);
    textAlign(LEFT);
  }

  // Supply cost preview
  let en = state.conquest.expeditionNum;
  let costG = 15 + en * 5 + state.conquest.soldiers.length * 5;
  let costW = 10 + en * 3;
  let costM = min(3, 1 + floor(en / 3));
  let totalFood = (state.meals || 0) + (state.stew || 0);
  let canGo = state.gold >= costG && state.wood >= costW && totalFood >= costM;
  fill(canGo ? 140 : 180, canGo ? 130 : 60, canGo ? 100 : 50, 160); textSize(11); textAlign(CENTER);
  text('Cost: ' + costG + 'g  ' + costW + ' wood  ' + costM + ' food (have ' + totalFood + ')', px + panW / 2, py + panH - 24);
  // Confirm hint
  fill(180, 160, 100, 180); textSize(9);
  text('Click to select, double-click to embark  |  [ESC] Cancel', px + panW / 2, py + panH - 10);
  pop();
}

// ─── LEGIA / EXPEDITION OVERLAY ─────────────────────────────────────────
function drawLegiaUI() {
  let lg = state.legia;
  if (!lg || !lg.legiaUIOpen) return;
  push();

  let hasArmy = typeof getArmyCount === 'function';
  let armyCount = hasArmy ? getArmyCount() : 0;
  let maxSoldiers = hasArmy && typeof getMaxSoldiers === 'function' ? getMaxSoldiers() : lg.maxRecruits;
  let unlockedTypes = hasArmy && typeof getUnlockedUnitTypes === 'function' ? getUnlockedUnitTypes() : ['legionary'];
  let upkeep = hasArmy && typeof getArmyUpkeep === 'function' ? getArmyUpkeep() : 0;
  let garrison = hasArmy && typeof getGarrisonCount === 'function' ? getGarrisonCount() : 0;
  let deployed = hasArmy && typeof getDeployedCount === 'function' ? getDeployedCount() : 0;
  let morale = lg.morale || 100;
  let _legiaFt = (typeof getFactionTerms === 'function') ? getFactionTerms() : { barracks: 'Castrum', army: 'Legion' };
  let castrumName = (typeof getCastrumLevelName === 'function') ? getCastrumLevelName(lg.castrumLevel) : _legiaFt.barracks;

  // Dynamic height based on unlocked units
  let trainRows = unlockedTypes.length;
  let pw = min(320, width - 20), ph = min(200 + trainRows * 26 + (armyCount > 0 ? 50 : 0), height - 20);
  let px = max(10, width / 2 - pw / 2), py = max(10, height / 2 - ph / 2);

  // Dark panel background
  drawParchmentPanel(px, py, pw, ph);

  // Title + banner
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80); textAlign(CENTER, TOP); textSize(14);
  text(_legiaFt.army.toUpperCase(), px + pw / 2, py + 10);
  textFont('monospace');
  fill(140, 110, 70); textSize(9);
  text(castrumName + ' (Level ' + lg.castrumLevel + '/' + 5 + ')', px + pw / 2, py + 26);

  let sy = py + 44;
  fill(180, 160, 120); textSize(10); textAlign(LEFT, TOP);

  // Army overview
  text('Army: ' + armyCount + ' / ' + maxSoldiers, px + 14, sy);
  text('Garrison: ' + garrison + '  |  Deployed: ' + deployed, px + 14, sy + 13);
  sy += 28;

  // Morale bar
  fill(140, 120, 90); textSize(9);
  text('Morale:', px + 14, sy);
  fill(40, 30, 20); rect(px + 60, sy, 100, 8, 2);
  let moraleCol = morale > 60 ? color(80, 180, 80) : morale > 30 ? color(200, 180, 40) : color(200, 60, 40);
  fill(moraleCol); rect(px + 60, sy, floor(100 * morale / 100), 8, 2);
  fill(200, 180, 140); textSize(8); textAlign(RIGHT, TOP);
  text(floor(morale) + '%', px + 170, sy);
  sy += 14;

  // Upkeep
  fill(180, 140, 80); textSize(9); textAlign(LEFT, TOP);
  text('Army Upkeep: ' + upkeep + 'g/day', px + 14, sy);
  sy += 12;
  let _bldUp = (typeof calculateBuildingMaintenance === 'function') ? calculateBuildingMaintenance() : 0;
  if (_bldUp > 0) {
    fill(160, 120, 70);
    text('Building Upkeep: ' + _bldUp + 'g/day', px + 14, sy);
    sy += 12;
  }
  sy += 4;

  // Unit counts by type
  if (armyCount > 0 && hasArmy) {
    fill(160, 140, 100); textSize(9);
    let _ft = (typeof getFactionTerms === 'function') ? getFactionTerms() : { soldier: 'Legionary', elite: 'Centurion' };
    let typeNames = { legionary: _ft.soldier, archer: 'Archer', cavalry: 'Cavalry', siege_ram: 'Siege Ram', centurion: _ft.elite };
    for (let t of unlockedTypes) {
      let cnt = typeof getArmyCountByType === 'function' ? getArmyCountByType(t) : 0;
      if (cnt > 0) {
        text('  ' + (typeNames[t] || t) + ': ' + cnt, px + 14, sy);
        sy += 12;
      }
    }
    sy += 4;
  }

  // Separator
  stroke(100, 80, 50, 120); strokeWeight(1);
  line(px + 14, sy, px + pw - 14, sy); noStroke();
  sy += 6;

  // Train buttons
  fill(200, 170, 100); textSize(10); textAlign(LEFT, TOP);
  text('TRAIN UNITS:', px + 14, sy); sy += 14;

  let unitKeys = { legionary: '1', archer: '3', cavalry: '4', siege_ram: '5', centurion: '6' };
  let unitCosts = (typeof UNIT_TYPES !== 'undefined') ? UNIT_TYPES : {};
  for (let t of unlockedTypes) {
    let k = unitKeys[t] || '?';
    let def = unitCosts[t];
    let costStr = def ? def.cost + 'g' : '?g';
    let nameStr = def ? def.name : t;
    if (t === 'legionary') nameStr = _ft.soldier;
    else if (t === 'centurion') nameStr = 'Elite ' + _ft.elite;
    fill(armyCount < maxSoldiers ? color(180, 160, 120) : color(100, 80, 60));
    textSize(10);
    text('[' + k + '] ' + nameStr + ' (' + costStr + ')', px + 20, sy);
    sy += 13;
    // Counter info line
    let cInfo = (typeof UNIT_COUNTER_INFO !== 'undefined') ? UNIT_COUNTER_INFO[t] : null;
    if (cInfo) {
      let c = color(cInfo.color);
      fill(red(c), green(c), blue(c), 180);
      textSize(7);
      text('Strong vs ' + cInfo.strong, px + 30, sy);
      sy += 11;
    } else {
      sy += 2;
    }
  }

  // Upgrade castrum
  if (lg.castrumLevel < 5) {
    sy += 4;
    let nextLvData = (typeof CASTRUM_LEVELS !== 'undefined') ? CASTRUM_LEVELS[lg.castrumLevel + 1] : null;
    let costStr = '';
    if (nextLvData && nextLvData.cost) {
      let c = nextLvData.cost;
      let parts = [];
      if (c.gold) parts.push(c.gold + 'g');
      if (c.stone) parts.push(c.stone + ' stone');
      if (c.ironOre) parts.push(c.ironOre + ' iron');
      if (c.crystals) parts.push(c.crystals + ' crystal');
      costStr = parts.join(' + ');
    }
    fill(200, 170, 100); textSize(10);
    let nextName = (typeof getCastrumLevelName === 'function') ? getCastrumLevelName(lg.castrumLevel + 1) : (nextLvData ? nextLvData.name : 'next');
    text('[2] Upgrade to ' + nextName + ' (' + costStr + ')', px + 14, sy);
    sy += 16;
  }

  // Garrison toggle
  if (armyCount > 0) {
    sy += 2;
    fill(160, 140, 100); textSize(10);
    text('[G] Toggle garrison/deploy all', px + 14, sy); sy += 14;
  }

  // Expedition launch
  if (armyCount > 0) {
    fill(180, 160, 120); textSize(10);
    text('[R] Launch expedition (go to port)', px + 14, sy); sy += 14;
  }

  // Close hint
  fill(100, 90, 70); textSize(9); textAlign(CENTER, TOP);
  text('[E] [L] or [ESC] Close', px + pw / 2, py + ph - 16);
  pop();
}

function drawExpeditionSummaryOverlay() {
  let s = state._expedSummary;
  if (!s) return;
  s.timer--;
  if (s.timer <= 0) { state._expedSummary = null; return; }

  // Fade out in last 60 frames
  let alpha = s.timer < 60 ? floor((s.timer / 60) * 220) : 220;
  push();
  noStroke();
  fill(0, 0, 0, min(alpha, 160));
  rect(0, 0, width, height);

  let lootEntries = Object.entries(s.loot);
  let bw = min(340, width - 20), bh = min(200 + (s.soldiersStart > 0 ? 30 : 0) + lootEntries.length * 22, height - 20);
  let bx = max(10, width / 2 - bw / 2), by = max(10, height / 2 - bh / 2);

  fill(30, 20, 10, alpha);
  stroke(200, 170, 80, alpha); strokeWeight(2);
  rect(bx, by, bw, bh, 8);
  noStroke();

  fill(s.isDeath ? color(255, 100, 60, alpha) : color(220, 185, 60, alpha));
  textAlign(CENTER, TOP); textSize(18);
  text(s.isDeath ? 'EXPEDITION ENDED' : 'EXPEDITION COMPLETE', width / 2, by + 14);

  stroke(160, 130, 60, alpha * 0.7); strokeWeight(1);
  line(bx + 20, by + 38, bx + bw - 20, by + 38);
  noStroke();

  let ty = by + 48;
  fill(200, 185, 140, alpha); textSize(11); textAlign(LEFT, TOP);
  text('Enemies Defeated:', bx + 24, ty);
  fill(255, 220, 100, alpha); textAlign(RIGHT, TOP);
  text(s.kills, bx + bw - 24, ty);

  ty += 22;
  fill(200, 185, 140, alpha); textAlign(LEFT, TOP);
  text('Gold Earned:', bx + 24, ty);
  fill(255, 200, 60, alpha); textAlign(RIGHT, TOP);
  text('+' + s.gold, bx + bw - 24, ty);

  for (let [name, qty] of lootEntries) {
    ty += 22;
    fill(180, 165, 120, alpha); textAlign(LEFT, TOP);
    text(name + ':', bx + 24, ty);
    let col = {Wood:[187,136,68], Iron:[170,187,204], Hide:[204,153,102], Relic:[255,136,255], Bone:[255,221,136]}[name] || [204,204,204];
    fill(col[0], col[1], col[2], alpha); textAlign(RIGHT, TOP);
    text('+' + qty, bx + bw - 24, ty);
  }

  if (s.soldiersStart > 0) {
    ty += 28;
    stroke(160, 130, 60, alpha * 0.5); strokeWeight(1);
    line(bx + 20, ty - 8, bx + bw - 20, ty - 8);
    noStroke();
    let survived = s.soldiersStart - s.soldiersLost;
    fill(200, 185, 140, alpha); textAlign(LEFT, TOP); textSize(11);
    text('Soldiers:', bx + 24, ty);
    fill(s.soldiersLost === 0 ? color(120, 220, 120, alpha) : color(255, 150, 80, alpha));
    textAlign(RIGHT, TOP);
    text(survived + ' survived, ' + s.soldiersLost + ' lost', bx + bw - 24, ty);
  }

  fill(140, 130, 100, alpha * 0.7); textAlign(CENTER, TOP); textSize(9);
  text('Returning home...', width / 2, by + bh - 20);
  pop();
}

// ─── COLONY OVERLAY ─────────────────────────────────────────────────────
function drawColonyOverlay() {
  let c = state.conquest;
  if (!c.colonized || state.conquest.active) return;
  let sx = w2sX(c.isleX), sy = w2sY(c.isleY);
  if (sx < -500 || sx > width + 500 || sy < -500 || sy > height + 500) return;
  let bright = getSkyBrightness();

  push();
  noStroke();

  // Colony grass tufts
  if (c.colonyGrassTufts) {
    for (let g of c.colonyGrassTufts) {
      let gx = w2sX(g.x), gy = w2sY(g.y);
      let sway = sin(frameCount * 0.03 + g.sway) * 2;
      fill(lerpColor(color(50, 90, 40), color(80, 140, 60), bright * g.hue));
      for (let b = 0; b < g.blades; b++) {
        let bx = gx + (b - g.blades / 2) * 2 + sway;
        rect(floor(bx), floor(gy - g.height), 1, floor(g.height));
      }
    }
  }

  // Colony farms — simplified view from distance
  for (let p of c.colonyPlots) {
    let px = w2sX(p.x), py = w2sY(p.y);
    // Soil
    fill(lerpColor(color(60, 45, 25), color(100, 80, 50), bright));
    rect(floor(px), floor(py), floor(p.w * 0.6), floor(p.h * 0.6), 1);
    // Crops if planted
    if (p.planted && p.stage > 0) {
      let cropH = p.stage * 3;
      fill(lerpColor(color(50, 100, 30), color(100, 180, 60), bright));
      for (let ci = 0; ci < 3; ci++) {
        rect(floor(px + 3 + ci * 5), floor(py + p.h * 0.3 - cropH), 2, cropH);
      }
    }
  }

  // Colony buildings
  for (let b of c.colonyBuildings) {
    let bx = w2sX(b.x), by = w2sY(b.y);
    let bw, bh;
    switch (b.type) {
      case 'forum':
        bw = 40; bh = 30;
        // Stone base
        fill(lerpColor(color(140, 130, 110), color(200, 190, 170), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 2);
        // Columns
        fill(lerpColor(color(180, 170, 155), color(230, 220, 200), bright));
        rect(floor(bx - bw / 2 + 4), floor(by - bh / 2 - 8), 3, 12);
        rect(floor(bx + bw / 2 - 7), floor(by - bh / 2 - 8), 3, 12);
        rect(floor(bx - 2), floor(by - bh / 2 - 8), 3, 12);
        // Roof
        fill(lerpColor(color(160, 80, 40), color(200, 120, 60), bright));
        triangle(bx - bw / 2 - 2, by - bh / 2 - 6, bx + bw / 2 + 2, by - bh / 2 - 6, bx, by - bh / 2 - 20);
        // Label
        fill(255, 240, 200, 150); textSize(9); textAlign(CENTER);
        text('FORUM', bx, by + bh / 2 + 8);
        break;
      case 'granary':
        bw = 24; bh = 20;
        fill(lerpColor(color(130, 100, 50), color(180, 150, 80), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(lerpColor(color(100, 70, 30), color(150, 120, 60), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2 - 6), bw + 4, 6, 1);
        break;
      case 'market':
        bw = 30; bh = 18;
        fill(lerpColor(color(160, 140, 100), color(220, 200, 160), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(200, 60, 40, 150);
        rect(floor(bx - bw / 2 - 2), floor(by - bh / 2 - 8), bw + 4, 8);
        break;
      case 'temple':
        bw = 28; bh = 24;
        fill(lerpColor(color(180, 175, 165), color(240, 235, 225), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(lerpColor(color(200, 195, 185), color(250, 245, 235), bright));
        for (let ci = 0; ci < 3; ci++) {
          rect(floor(bx - bw / 2 + 4 + ci * 10), floor(by - bh / 2 - 10), 3, 14);
        }
        triangle(bx - bw / 2 - 2, by - bh / 2 - 8, bx + bw / 2 + 2, by - bh / 2 - 8, bx, by - bh / 2 - 22);
        break;
      default:
        bw = 22; bh = 18;
        fill(lerpColor(color(120, 110, 95), color(170, 160, 140), bright));
        rect(floor(bx - bw / 2), floor(by - bh / 2), bw, bh, 1);
        fill(lerpColor(color(140, 80, 40), color(180, 110, 60), bright));
        rect(floor(bx - bw / 2 - 1), floor(by - bh / 2 - 5), bw + 2, 5, 1);
        break;
    }
  }

  // Colony label
  fill(255, 230, 180, 180); textSize(9); textAlign(CENTER);
  let labelY = sy - floor(c.isleRY * 0.55);
  text('Colony LV.' + c.colonyLevel, sx, labelY);
  fill(200, 190, 150, 120); textSize(10);
  text(c.colonyWorkers + ' workers  +' + c.colonyIncome + 'g/day', sx, labelY + 12);
  textAlign(LEFT, TOP);

  pop();
}


// ─── MAIN HUD ────────────────────────────────────────────────────────────
// ─── HUD ──────────────────────────────────────────────────────────────────
// UI scale (set per frame in drawHUD, used by drawHudResource)
let _uiScale = 1;
// Track resource changes for HUD pop animation
let _hudPrev = {};
function trackHudResource(key, val) {
  if (_hudPrev[key] !== undefined && _hudPrev[key] !== val) {
    hudFlash[key] = { timer: 15, delta: val - _hudPrev[key] };
  }
  _hudPrev[key] = val;
}
function drawHudResource(x, y, label, val, col, key) {
  trackHudResource(key, val);
  let flash = hudFlash[key];
  let sc = 1, flashAlpha = 0, _fDelta = 0;
  if (flash && flash.timer > 0) {
    let t = flash.timer / 15;
    let bounce = t > 0.5 ? sin(t * PI) : sin(t * PI * 2) * 0.5;
    sc = 1 + 0.2 * bounce;
    flashAlpha = t;
    _fDelta = flash.delta || 0;
    flash.timer--;
  }
  push();
  translate(x, y);
  scale(sc);
  fill(col);
  let _resTs = max(9, floor(10 * _uiScale));
  textSize(_resTs);
  textAlign(LEFT, TOP);
  text(label + val, 0, 0);
  if (flashAlpha > 0) {
    let pulse = 0.5 + 0.5 * sin(flashAlpha * PI);
    fill(255, 200, 60, 160 * flashAlpha * pulse);
    text(label + val, 0, 0);
    if (_fDelta !== 0) {
      fill(_fDelta > 0 ? 80 : 220, _fDelta > 0 ? 220 : 80, 80, 200 * flashAlpha);
      textSize(max(7, floor(8 * _uiScale)));
      text((_fDelta > 0 ? '+' : '') + _fDelta, textWidth(label + val) + 4, -2 - floor(flashAlpha * 4));
    }
  }
  pop();
}

// ═══ EMPIRE DASHBOARD (Tab key) ═════════════════════════════════════════
function drawEmpireDashboard() {
  if (!empireDashOpen) return;
  noStroke(); fill(0, 0, 0, 200); rect(0, 0, width, height);
  let pw = min(width - 40, 560), ph = min(height - 40, 420);
  let px = (width - pw) / 2, py = (height - ph) / 2;
  fill(35, 28, 18, 245); rect(px, py, pw, ph, 6);
  fill(50, 40, 28, 40); rect(px + 2, py + 2, pw - 4, ph * 0.25, 4, 4, 0, 0);
  stroke(180, 145, 70, 220); strokeWeight(2); noFill(); rect(px, py, pw, ph, 6);
  stroke(120, 95, 55, 80); strokeWeight(0.5); rect(px + 6, py + 6, pw - 12, ph - 12, 4); noStroke();
  fill(180, 145, 70, 140);
  rect(px+4,py+4,5,5); rect(px+pw-9,py+4,5,5); rect(px+4,py+ph-9,5,5); rect(px+pw-9,py+ph-9,5,5);
  textFont('Cinzel, Georgia, serif'); fill(212, 175, 80); textAlign(CENTER, TOP); textSize(15);
  text('IMPERIUM ROMANUM', width/2, py+14); textFont('monospace');
  let rkT = state.islandLevel>=25?'IMPERATOR':state.islandLevel>=20?'CONSUL':state.islandLevel>=15?'SENATOR':state.islandLevel>=10?'GOVERNOR':'CITIZEN';
  let _iName = state.islandName ? '"' + state.islandName + '" — ' : '';
  fill(160,140,100); textSize(11); text(rkT+' \u2014 ' + _iName + 'Island Level '+state.islandLevel, width/2, py+32);
  stroke(120,95,55,80); strokeWeight(0.5); line(px+20,py+46,px+pw-20,py+46); noStroke();
  let mX=px+14,mY=py+54,mW=pw*0.45,mH=ph*0.5;
  fill(20,25,35,200); rect(mX,mY,mW,mH,4);
  stroke(100,85,55,100); strokeWeight(0.5); noFill(); rect(mX,mY,mW,mH,4); noStroke();
  fill(140,120,80); textSize(10); textAlign(CENTER,TOP); text('WORLD MAP',mX+mW/2,mY+3);
  let _isls=[{n:'Home',x:WORLD.islandCX,y:WORLD.islandCY,c:color(80,120,50),rx:18,ry:12},{n:'Arena',x:state.adventure.isleX,y:state.adventure.isleY,c:color(160,80,60),rx:8,ry:6},{n:'Terra Nova',x:state.conquest.isleX,y:state.conquest.isleY,c:state.conquest.colonized?color(80,160,80):color(80,120,160),rx:14,ry:10},{n:'Vulcan',x:state.vulcan.isleX,y:state.vulcan.isleY,c:color(180,60,30),rx:10,ry:8},{n:'Hyperborea',x:state.hyperborea.isleX,y:state.hyperborea.isleY,c:color(100,180,220),rx:11,ry:8},{n:'Plenty',x:state.plenty.isleX,y:state.plenty.isleY,c:color(60,160,60),rx:12,ry:9},{n:'Necropolis',x:state.necropolis.isleX,y:state.necropolis.isleY,c:color(120,50,160),rx:10,ry:7}];
  let _mnX=Infinity,_mxX=-Infinity,_mnY=Infinity,_mxY=-Infinity;
  _isls.forEach(i=>{_mnX=min(_mnX,i.x);_mxX=max(_mxX,i.x);_mnY=min(_mnY,i.y);_mxY=max(_mxY,i.y);});
  let _mSc=min((mW-40)/max(_mxX-_mnX,1),(mH-40)/max(_mxY-_mnY,1));
  let _mcx=mX+mW/2,_mcy=mY+mH/2+6,_aX=(_mnX+_mxX)/2,_aY=(_mnY+_mxY)/2;
  if(state.conquest.colonized){stroke(160,140,80,60);strokeWeight(0.5);_empDL(_mcx+(WORLD.islandCX-_aX)*_mSc,_mcy+(WORLD.islandCY-_aY)*_mSc,_mcx+(state.conquest.isleX-_aX)*_mSc,_mcy+(state.conquest.isleY-_aY)*_mSc,4);noStroke();}
  _isls.forEach(il=>{let ix=_mcx+(il.x-_aX)*_mSc,iy=_mcy+(il.y-_aY)*_mSc;fill(il.c);noStroke();ellipse(ix,iy,il.rx,il.ry);fill(200,185,150,180);textSize(5.5);textAlign(CENTER,TOP);text(il.n,ix,iy+il.ry/2+2);});
  fill(255,80,40,180+sin(frameCount*0.15)*60);circle(_mcx+(state.player.x-_aX)*_mSc,_mcy+(state.player.y-_aY)*_mSc,5);
  let sX=px+pw*0.52,sY=py+54,sW=pw*0.45;
  fill(160,140,90);textSize(11);textAlign(LEFT,TOP);text('EMPIRE STATISTICS',sX,sY);sY+=14;
  let _cI=state.conquest.colonized?state.conquest.colonyIncome:0,_tP=1+(state.conquest.colonized?state.conquest.colonyWorkers:0),_mS=state.conquest.soldiers.length+(state.centurion.hp>0?1:0);
  [{l:'GOLD',v:state.gold,c:'#ffbb22'},{l:'POPULATION',v:_tP,c:'#aaddaa'},{l:'MILITARY',v:_mS+' sol.',c:'#dd8888'},{l:'DAILY INCOME',v:'+'+_cI+'g',c:'#ddcc66'},{l:'EXPEDITIONS',v:state.conquest.expeditionNum,c:'#88aadd'},{l:'TOTAL KILLS',v:state.conquest.totalKills,c:'#cc8866'},{l:'DAY',v:state.day,c:'#aabbcc'},{l:'SEASON',v:getSeasonName().split(' ')[0],c:'#88cc66'}].forEach(s=>{fill(color(s.c));textSize(10);textAlign(LEFT,TOP);text(s.l,sX,sY);textAlign(RIGHT,TOP);text(''+s.v,sX+sW,sY);sY+=13;});
  textAlign(LEFT,TOP);sY+=6;fill(140,120,80);textSize(10);text('RANK PROGRESS',sX,sY);sY+=11;
  let _rks=[{n:'Citizen',l:1},{n:'Governor',l:10},{n:'Senator',l:15},{n:'Consul',l:20},{n:'Imperator',l:25}],_cR=0;
  for(let i=_rks.length-1;i>=0;i--){if(state.islandLevel>=_rks[i].l){_cR=i;break;}}
  let _nR=min(_cR+1,_rks.length-1),_rF=_cR===_nR?1:(state.islandLevel-_rks[_cR].l)/(_rks[_nR].l-_rks[_cR].l);
  fill(40,35,25);rect(sX,sY,sW,10,4);fill(180,145,60);rect(sX,sY,sW*_rF,10,4);
  fill(255,230,180);textSize(9);textAlign(CENTER,CENTER);text(_rks[_cR].n+' \u2192 '+_rks[_nR].n,sX+sW/2,sY+5);textAlign(LEFT,TOP);
  let cdY=py+ph*0.62;stroke(120,95,55,60);strokeWeight(0.5);line(px+20,cdY-6,px+pw-20,cdY-6);noStroke();
  fill(160,140,90);textSize(11);text('COLONIES & FLEET',px+14,cdY);cdY+=14;
  if(state.conquest.colonized){let cw=pw*0.4,ch=ph*0.26;fill(30,25,18,200);rect(px+14,cdY,cw,ch,4);stroke(120,100,60,100);strokeWeight(0.5);noFill();rect(px+14,cdY,cw,ch,4);noStroke();fill(140,200,140);textSize(11);text('Terra Nova',px+22,cdY+6);fill(120,110,80);textSize(10);text('Colony Level '+state.conquest.colonyLevel,px+22,cdY+18);text('Workers: '+state.conquest.colonyWorkers,px+22,cdY+30);text('Income: +'+state.conquest.colonyIncome+'g/day',px+22,cdY+42);
  } else {fill(100,90,70);textSize(10);text('No colonies yet. Conquer Terra Nova (LV.10+)',px+14,cdY+4);}
  let fX=px+pw*0.52;fill(120,110,80);textSize(10);text('FLEET',fX,cdY);text('Navis Parva - Active',fX,cdY+13);
  fill(state.ship.state==='docked'?color(140,200,140):color(90,80,60));text('Merchant - '+(state.ship.state==='docked'?'DOCKED':state.ship.state==='gone'?'At sea':state.ship.state.toUpperCase()),fX,cdY+26);
  if(state.imperialBridge.built){fill(200,170,90);text('Imperial Bridge - ACTIVE',fX,cdY+39);}
  fill(120,100,70);textSize(10);textAlign(CENTER,BOTTOM);text('[TAB] Close',width/2,py+ph-6);textAlign(LEFT,TOP);
}
function _empDL(x1,y1,x2,y2,dl){let d=dist(x1,y1,x2,y2);if(d<1)return;let dx=(x2-x1)/d,dy=(y2-y1)/d;for(let i=0;i<d;i+=dl*2){let e=min(i+dl,d);line(x1+dx*i,y1+dy*i,x1+dx*e,y1+dy*e);}}

// ═══ INVENTORY SCREEN (I key) ═══════════════════════════════════════════
function drawInventoryScreen() {
  if (!inventoryOpen) return;
  noStroke(); fill(0,0,0,190); rect(0,0,width,height);
  let pw=min(width-40,440),ph=min(height-40,380),px=(width-pw)/2,py=(height-ph)/2;
  fill(30,24,16,245);rect(px,py,pw,ph,6);stroke(180,145,70,220);strokeWeight(1.5);noFill();rect(px,py,pw,ph,6);stroke(120,95,55,80);strokeWeight(0.5);rect(px+5,py+5,pw-10,ph-10,4);noStroke();
  textFont('Cinzel, Georgia, serif');fill(210,180,80);textAlign(CENTER,TOP);textSize(14);text('INVENTARIUM',width/2,py+12);textFont('monospace');
  let gX=px+16,gY=py+36,cW=60,cH=36,cols=floor((pw-32)/cW);
  let _res=[{n:'Seeds',v:state.seeds,c:'#88cc44'},{n:'Harvest',v:state.harvest,c:'#ccaa44'},{n:'Wood',v:state.wood,c:'#8c6428'},{n:'Stone',v:state.stone,c:'#7a7268'},{n:'Crystals',v:state.crystals,c:'#44ffaa'},{n:'Gold',v:state.gold,c:'#ffbb22'},{n:'Fish',v:state.fish,c:'#64b4ff'},{n:'Iron',v:state.ironOre,c:'#aab8cc'},{n:'Hide',v:state.rareHide,c:'#c8a078'},{n:'Relics',v:state.ancientRelic,c:'#dc8cdc'},{n:'Bone',v:state.titanBone,c:'#f0dc8c'},{n:'Grape Sd',v:state.grapeSeeds,c:'#8c3ca0'},{n:'Olive Sd',v:state.oliveSeeds,c:'#6a8e30'}];
  _res.forEach((r,i)=>{let cx=gX+(i%cols)*cW,cy=gY+floor(i/cols)*cH;fill(r.v>0?color(40,35,25,200):color(25,20,14,150));rect(cx,cy,cW-4,cH-4,3);if(r.v>0){stroke(100,85,55,60);strokeWeight(0.5);noFill();rect(cx,cy,cW-4,cH-4,3);noStroke();}fill(r.v>0?color(r.c):color(60,50,40));textSize(10);textAlign(CENTER,TOP);text(r.v,cx+(cW-4)/2,cy+4);fill(r.v>0?color(160,140,100):color(70,60,45));textSize(9);text(r.n,cx+(cW-4)/2,cy+18);});
  let eY=gY+ceil(_res.length/cols)*cH+10;stroke(120,95,55,60);strokeWeight(0.5);line(px+20,eY,px+pw-20,eY);noStroke();eY+=6;
  fill(160,140,90);textSize(11);textAlign(LEFT,TOP);text('EQUIPMENT',px+16,eY);eY+=14;
  let _p=state.player;
  [{l:'WEAPON',v:WEAPONS[_p.weapon].name,d:'DMG '+WEAPONS[_p.weapon].dmg,c:'#ddccaa'},{l:'ARMOR',v:ARMORS[_p.armor].name,d:_p.armor>0?'REDUCE -'+ARMORS[_p.armor].reduce:'None',c:'#aabbcc'},{l:'POTIONS',v:_p.potions+'x',d:'Heals '+POTION_HEAL+' HP',c:'#44dd88'}].forEach((eq,i)=>{let sx=px+16+i*(pw/3-4),sw=pw/3-12;fill(35,28,20,200);rect(sx,eY,sw,40,4);stroke(100,85,55,80);strokeWeight(0.5);noFill();rect(sx,eY,sw,40,4);noStroke();fill(120,100,70);textSize(9);textAlign(CENTER,TOP);text(eq.l,sx+sw/2,eY+3);fill(color(eq.c));textSize(9);text(eq.v,sx+sw/2,eY+12);fill(100,90,65);textSize(9);text(eq.d,sx+sw/2,eY+25);});
  let coY=eY+50;fill(160,140,90);textSize(11);textAlign(LEFT,TOP);text('CONSUMABLES',px+16,coY);coY+=14;
  [{n:'Meals',v:state.meals,c:'#dcb450'},{n:'Wine',v:state.wine,c:'#a03250'},{n:'Oil',v:state.oil,c:'#8ca03c'}].forEach((c,i)=>{let cx=px+16+i*(pw/3-4),cw=pw/3-12;fill(35,28,20,180);rect(cx,coY,cw,32,3);fill(c.v>0?color(c.c):color(60,50,40));textSize(10);textAlign(CENTER,TOP);text(c.v,cx+cw/2,coY+3);fill(c.v>0?color(140,120,85):color(60,50,40));textSize(9);text(c.n,cx+cw/2,coY+16);});
  let tY=coY+40;let _tN=['Basic','Bronze','Iron'];fill(120,100,70);textSize(10);textAlign(LEFT,TOP);
  text('TOOLS:  Sickle: '+_tN[state.tools.sickle]+'  |  Axe: '+_tN[state.tools.axe]+'  |  Net: '+_tN[state.tools.net],px+16,tY);
  fill(120,100,70);textSize(10);textAlign(CENTER,BOTTOM);text('[I] Close',width/2,py+ph-6);textAlign(LEFT,TOP);
}

function drawHotbar() {
  if (screenshotMode) return;
  let p = state.player;
  let slot = p.hotbarSlot;
  let slotW = (typeof _isMobile !== 'undefined' && _isMobile) ? 44 : max(36, floor(40 * _uiScale));
  let slotH = slotW, gap = max(3, floor(4 * _uiScale));
  let totalW = HOTBAR_ITEMS.length * (slotW + gap) - gap;
  let bx = floor((width - totalW) / 2);
  let by = height - slotH - max(12, floor(14 * _uiScale));

  noStroke();
  // Track hotbar selection change for bounce
  if (typeof _hotbarPrevSlot === 'undefined') _hotbarPrevSlot = slot;
  if (typeof _hotbarBounce === 'undefined') _hotbarBounce = 0;
  if (_hotbarPrevSlot !== slot) { _hotbarBounce = 8; _hotbarPrevSlot = slot; }
  if (_hotbarBounce > 0) _hotbarBounce -= 0.5;

  // Leather belt backing strip
  fill(55, 38, 22, 200);
  rect(bx - 6, by - 3, totalW + 12, slotH + 6, 6);
  fill(70, 50, 30, 80);
  rect(bx - 6, by - 3, totalW + 12, 2, 6, 6, 0, 0);
  fill(35, 24, 14, 80);
  rect(bx - 6, by + slotH + 1, totalW + 12, 2, 0, 0, 6, 6);
  // Belt stitching lines
  stroke(90, 70, 40, 60);
  strokeWeight(0.5);
  for (let si = 0; si < totalW + 8; si += 6) {
    line(bx - 4 + si, by - 2, bx - 4 + si + 3, by - 2);
    line(bx - 4 + si, by + slotH + 2, bx - 4 + si + 3, by + slotH + 2);
  }
  noStroke();

  let _hbAc = (typeof getFactionData === 'function') ? getFactionData().accentColor : [212, 160, 64];

  for (let i = 0; i < HOTBAR_ITEMS.length; i++) {
    let sx = bx + i * (slotW + gap);
    let selected = i === slot;
    // Bounce offset for newly selected slot
    let _slotBounce = (selected && _hotbarBounce > 0) ? floor(sin(_hotbarBounce / 8 * PI) * -4) : 0;

    // Slot background — wood texture (brown gradient)
    fill(selected ? 65 : 38, selected ? 48 : 28, selected ? 32 : 18, 220);
    rect(sx, by + _slotBounce, slotW, slotH, 3);
    // Wood grain lines
    fill(selected ? 75 : 45, selected ? 55 : 32, selected ? 38 : 20, 40);
    for (let gy = 0; gy < slotH; gy += 4) {
      rect(sx + 1, by + _slotBounce + gy, slotW - 2, 1);
    }
    // Highlight top edge (wood sheen)
    fill(120, 95, 60, selected ? 60 : 30);
    rect(sx + 1, by + _slotBounce, slotW - 2, 1, 3, 3, 0, 0);
    // Border
    if (selected) {
      // Golden glow border for selected
      stroke(_hbAc[0], _hbAc[1], _hbAc[2], 220);
      strokeWeight(1.5);
      noFill();
      rect(sx - 1, by + _slotBounce - 1, slotW + 2, slotH + 2, 4);
      // Outer glow
      stroke(_hbAc[0], _hbAc[1], _hbAc[2], 60);
      strokeWeight(2);
      rect(sx - 2, by + _slotBounce - 2, slotW + 4, slotH + 4, 5);
      noStroke();
    } else {
      stroke(80, 60, 40, 100);
      strokeWeight(0.6);
      noFill();
      rect(sx, by + _slotBounce, slotW, slotH, 3);
      noStroke();
    }

    // Key number label (top-left of slot)
    fill(selected ? 212 : 120, selected ? 160 : 100, selected ? 64 : 60, selected ? 220 : 120);
    textSize(max(9, floor(10 * _uiScale))); textAlign(LEFT, TOP);
    text(HOTBAR_ITEMS[i].key, sx + 2, by + 1);

    // Pixel icon in slot
    let cx = sx + floor(slotW / 2);
    let cy = by + floor(slotH / 2);
    let item = HOTBAR_ITEMS[i];

    if (item.icon === 'sickle') {
      // Pixel sickle — curved blade
      fill(180, 180, 190);
      rect(cx - 1, cy - 6, 2, 6);  // handle
      rect(cx + 1, cy - 8, 4, 2);  // blade top
      rect(cx + 3, cy - 6, 2, 4);  // blade right
      fill(120, 90, 50);
      rect(cx - 2, cy, 4, 4);      // grip
    } else if (item.icon === 'axe') {
      // Pixel axe
      fill(120, 90, 50);
      rect(cx - 1, cy - 4, 2, 10); // handle
      fill(160, 160, 170);
      rect(cx - 4, cy - 6, 6, 4);  // head
      fill(180, 180, 190);
      rect(cx - 4, cy - 6, 2, 4);  // edge
    } else if (item.icon === 'pick') {
      // Pixel pickaxe
      fill(120, 90, 50);
      rect(cx - 1, cy - 2, 2, 8);  // handle
      fill(160, 160, 170);
      rect(cx - 5, cy - 5, 10, 3); // head
      fill(140, 140, 150);
      rect(cx - 5, cy - 5, 2, 2);  // point
      rect(cx + 3, cy - 5, 2, 2);  // point
    } else if (item.icon === 'rod') {
      // Pixel fishing rod
      fill(120, 90, 50);
      rect(cx + 1, cy - 6, 2, 12); // rod
      fill(100, 160, 200);
      rect(cx + 3, cy - 6, 1, 1);  // tip
      rect(cx + 3, cy - 5, 1, 4);  // line
      fill(200, 200, 60);
      rect(cx + 2, cy - 1, 2, 1);  // hook
    } else if (item.icon === 'weapon') {
      // Pixel gladius/weapon
      let wn = WEAPONS[p.weapon].name;
      fill(190, 190, 200);
      rect(cx - 1, cy - 7, 2, 10); // blade
      fill(180, 180, 190);
      rect(cx - 1, cy - 8, 2, 2);  // tip
      fill(200, 170, 60);
      rect(cx - 2, cy + 2, 4, 2);  // guard
      fill(100, 70, 35);
      rect(cx - 1, cy + 4, 2, 3);  // grip
    } else if (item.icon === 'potion') {
      fill(60, 180, 80); rect(cx - 3, cy - 2, 6, 7, 2);
      fill(80, 200, 100); rect(cx - 2, cy - 1, 4, 3);
      fill(140, 110, 60); rect(cx - 1, cy - 5, 2, 4);
      fill(200, 180, 100); textSize(5); textAlign(CENTER,CENTER); text(p.potions, cx, cy + 8);
    } else if (item.icon === 'stew') {
      fill(140, 90, 40); rect(cx - 4, cy - 1, 8, 5, 1);
      fill(180, 120, 50); rect(cx - 3, cy - 2, 6, 3);
      fill(200, 180, 100); textSize(5); textAlign(CENTER,CENTER); text(state.stew || 0, cx, cy + 8);
    } else if (item.icon === 'meal') {
      fill(200, 170, 80); rect(cx - 4, cy - 2, 8, 5, 2);
      fill(220, 190, 100); rect(cx - 3, cy - 1, 6, 3);
      fill(200, 180, 100); textSize(5); textAlign(CENTER,CENTER); text(state.meals || 0, cx, cy + 8);
    } else if (item.icon === 'wine') {
      fill(130, 30, 50); rect(cx - 2, cy - 2, 4, 6, 1);
      fill(100, 70, 35); rect(cx - 1, cy - 5, 2, 4);
      fill(200, 180, 100); textSize(5); textAlign(CENTER,CENTER); text(state.wine || 0, cx, cy + 8);
    } else if (item.icon === 'ambrosia') {
      fill(220, 180, 40); rect(cx - 3, cy - 2, 6, 6, 2);
      fill(255, 220, 80, 150); ellipse(cx, cy, 8, 8);
      fill(200, 180, 100); textSize(5); textAlign(CENTER,CENTER); text(state.ambrosia || 0, cx, cy + 8);
    }
  }

  // Selected item name below hotbar
  fill(212, 160, 64);
  textSize(10);
  textAlign(CENTER, TOP);
  let cur = HOTBAR_ITEMS[slot];
  let displayName = cur.icon === 'weapon' ? WEAPONS[p.weapon].name : cur.name;
  text(displayName + ' — ' + cur.desc, width / 2, by + slotH + 3);
  textAlign(LEFT, TOP);
}

// ─── SCREENSHOT MODE OVERLAYS ─────────────────────────────────────────────
function drawVignette() {
  if (!screenshotMode) return;
  push();
  noStroke();
  let maxA = 100;
  for (let i = 0; i < 8; i++) {
    let t = i / 8;
    let a = maxA * (1 - t) * (1 - t);
    fill(0, 0, 0, a);
    let m = t * 0.5;
    rect(0, 0, width, height * (0.2 - m * 0.18));
    rect(0, height * (0.8 + m * 0.18), width, height * (0.2 - m * 0.18));
    rect(0, 0, width * (0.15 - m * 0.12), height);
    rect(width * (0.85 + m * 0.12), 0, width * (0.15 - m * 0.12), height);
  }
  pop();
}

function drawScreenshotFilter() {
  if (!screenshotMode || screenshotFilter === 0) return;
  push();
  noStroke();
  if (screenshotFilter === 1) {
    fill(255, 180, 60, 25);
    rect(0, 0, width, height);
    fill(255, 140, 40, 12);
    rect(0, height * 0.5, width, height * 0.5);
  } else if (screenshotFilter === 2) {
    fill(40, 80, 180, 25);
    rect(0, 0, width, height);
    fill(60, 140, 200, 10);
    rect(0, 0, width, height * 0.4);
  } else if (screenshotFilter === 3) {
    fill(160, 120, 60, 35);
    rect(0, 0, width, height);
    fill(200, 180, 140, 15);
    rect(0, 0, width, height);
  }
  pop();
}

function drawScreenshotIndicator() {
  if (!screenshotMode) return;
  push();
  noStroke();
  fill(255, 60, 40);
  ellipse(width - 15, 15, 8, 8);
  if (screenshotFilter > 0) {
    fill(255, 255, 255, 150);
    textSize(10);
    textAlign(RIGHT);
    let sNames = ['', 'WARM', 'COOL', 'SEPIA'];
    text(sNames[screenshotFilter], width - 25, 18);
  }
  pop();
}

function drawPhotoModeOverlay() {
  if (!photoMode && !screenshotMode) return;
  push();
  noStroke();

  // Stronger vignette for photo/screenshot mode
  let maxA = screenshotMode ? 140 : 120;
  for (let i = 0; i < 10; i++) {
    let t = i / 10;
    let a = maxA * (1 - t) * (1 - t);
    fill(0, 0, 0, a);
    rect(0, 0, width, height * (0.22 - t * 0.02));
    rect(0, height * (0.78 + t * 0.02), width, height * (0.22 - t * 0.02));
    rect(0, 0, width * (0.18 - t * 0.015), height);
    rect(width * (0.82 + t * 0.015), 0, width * (0.18 - t * 0.015), height);
  }

  // Watermark fade-in
  if (photoModeWatermarkAlpha < 80) photoModeWatermarkAlpha = min(80, photoModeWatermarkAlpha + 2);
  fill(255, 248, 230, photoModeWatermarkAlpha);
  textSize(10);
  textAlign(RIGHT, BOTTOM);
  text('MARE NOSTRUM', width - 16, height - 12);

  // Tip text — fades after 2 seconds
  if (photoModeTipTimer > 0) {
    photoModeTipTimer--;
    let tipA = photoModeTipTimer > 30 ? 160 : floor(160 * (photoModeTipTimer / 30));
    fill(255, 248, 230, tipA);
    textSize(9);
    textAlign(CENTER, CENTER);
    text(screenshotMode ? 'Click to capture' : 'Press P to exit', width / 2, height - 30);
  }

  // White flash on capture
  if (photoModeFlash > 0) {
    fill(255, 255, 255, floor((photoModeFlash / 6) * 200));
    rect(0, 0, width, height);
    photoModeFlash--;
  }

  pop();
}

function drawHUD() {
  if (photoMode || screenshotMode) return;
  if (dialogState.active) return;

  // UI scale factor — 1.0 at 1280x800, scales with screen size
  let uiScale = min(width / 1280, height / 800);
  _uiScale = uiScale;
  let hudTextSize = max(10, floor(11 * uiScale));
  let hudBigText = max(12, floor(14 * uiScale));
  let hudSmallText = max(8, floor(9 * uiScale));
  let hudLineH = max(11, floor(12 * uiScale));
  let hudMargin = max(12, floor(16 * uiScale));
  let hudPanelW = max(195, floor(210 * uiScale));

  let h = state.time / 60;
  let mins = floor(state.time % 60);
  let ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = floor(h % 12) || 12;
  let timeStr = displayH + ':' + nf(mins, 2) + ' ' + ampm;

  // Top-left panel — fade when player is in that screen quadrant
  let _psx = w2sX(state.player.x), _psy = w2sY(state.player.y);
  let _hudFade = (_psx < width * 0.35 && _psy < height * 0.45) ? 0.35 : 1.0;
  drawingContext.globalAlpha = _hudFade;

  // Top-left panel — compact, scaled
  let hudH = floor(195 * uiScale);
  if (state.ironOre > 0) hudH += hudLineH;
  if (state.rareHide > 0) hudH += hudLineH;
  if (state.ancientRelic > 0) hudH += hudLineH;
  if (state.titanBone > 0) hudH += hudLineH;
  if (state.meals > 0) hudH += hudLineH;
  if (state.wine > 0) hudH += hudLineH;
  if (state.oil > 0) hudH += hudLineH;
  if ((state.islandLevel || 1) >= 3 && state._dailyFoodNeeded > 0) hudH += hudLineH;
  if (state.blessing && state.blessing.type) hudH += hudLineH;
  if (state.quest) hudH += hudLineH;
  if (state.weather && state.weather.type !== 'clear') hudH += hudLineH;
  if ((state.daysSinceRain || 0) >= 3) hudH += hudLineH;
  hudH += hudLineH; // crop select line
  if (state.quarrier && state.quarrier.unlocked) hudH += floor(14 * uiScale);
  hudH = min(hudH, height - 80); // clamp to avoid going off-screen
  drawHUDPanel(hudMargin, hudMargin, hudPanelW, hudH - floor(14 * uiScale));
  textAlign(LEFT, TOP);

  let hudX = hudMargin + 10;
  let barW = max(100, floor(110 * uiScale));
  drawBarHUD(hudX, hudMargin + 8, barW, max(8, floor(9 * uiScale)), state.maxSolar > 0 ? state.solar / state.maxSolar : 0, C.solarBright, C.solarGold, 'SOLAR');

  // Core resources — always show
  let resY = hudMargin + floor(26 * uiScale);
  drawHudResource(hudX, resY, 'SEEDS    ', state.seeds, color(C.textBright), 'seeds'); resY += hudLineH;
  drawHudResource(hudX, resY, 'HARVEST  ', state.harvest, color(C.textBright), 'harvest'); resY += hudLineH;
  drawHudResource(hudX, resY, 'WOOD     ', state.wood, color(140, 100, 40), 'wood'); resY += hudLineH;
  drawHudResource(hudX, resY, 'STONE    ', state.stone, color(C.stoneLight), 'stone'); resY += hudLineH;
  drawHudResource(hudX, resY, 'CRYSTALS ', state.crystals, color(C.crystalGlow), 'crystals'); resY += hudLineH;
  // Conditional resources — only when player has them
  drawHudResource(hudX, resY, 'GOLD     ', state.gold, color(C.solarBright), 'gold');
  // Show daily upkeep next to gold
  let _bldUpkeep = (typeof calculateBuildingMaintenance === 'function') ? calculateBuildingMaintenance() : 0;
  let _armUpkeep = (typeof getArmyUpkeep === 'function') ? getArmyUpkeep() : 0;
  let _totalUpkeep = _bldUpkeep + _armUpkeep;
  if (_totalUpkeep > 0) {
    fill(200, 80, 60); textSize(hudSmallText);
    text(' -' + _totalUpkeep + '/d', hudX + barW, resY);
  }
  resY += hudLineH;
  if (state.fish > 0) { drawHudResource(hudX, resY, 'FISH     ', state.fish, color(100, 180, 255), 'fish'); resY += hudLineH; }
  // Food consumption indicator (level 3+)
  if ((state.islandLevel || 1) >= 3 && state._dailyFoodNeeded > 0) {
    let needed = state._dailyFoodNeeded;
    let totalFood = (state.harvest || 0) + (state.fish || 0) + (state.meals || 0);
    let daysLeft = needed > 0 ? floor(totalFood / needed) : 99;
    let foodCol = daysLeft >= 5 ? color(80, 180, 80) : daysLeft >= 2 ? color(220, 180, 40) : color(255, 80, 60);
    fill(foodCol); textSize(hudTextSize);
    text('FOOD -' + needed + '/day (' + daysLeft + 'd)', hudX, resY); resY += hudLineH;
  }
  // Expedition resources
  let expResY = resY;
  if (state.ironOre > 0 || state.rareHide > 0 || state.ancientRelic > 0 || state.titanBone > 0) {
    fill(170, 185, 200); textSize(hudTextSize);
    if (state.ironOre > 0) { text('IRON     ' + state.ironOre, hudX, expResY); expResY += hudLineH; }
    fill(200, 160, 120);
    if (state.rareHide > 0) { text('HIDE     ' + state.rareHide, hudX, expResY); expResY += hudLineH; }
    fill(220, 140, 220);
    if (state.ancientRelic > 0) { text('RELIC    ' + state.ancientRelic, hudX, expResY); expResY += hudLineH; }
    fill(240, 220, 140);
    if (state.titanBone > 0) { text('BONE     ' + state.titanBone, hudX, expResY); expResY += hudLineH; }
  }
  // Cooked goods
  let cookedY = expResY;
  if (state.meals > 0 || state.wine > 0 || state.oil > 0) {
    fill(220, 180, 80); textSize(hudTextSize);
    if (state.meals > 0) { text('MEALS    ' + state.meals, hudX, cookedY); cookedY += hudLineH; }
    if (state.wine > 0) { fill(160, 50, 80); text('WINE     ' + state.wine, hudX, cookedY); cookedY += hudLineH; }
    if (state.oil > 0) { fill(140, 160, 60); text('OIL      ' + state.oil, hudX, cookedY); cookedY += hudLineH; }
  }

  let barH = max(7, floor(8 * uiScale));
  drawBarHUD(hudX, cookedY + 2, barW, barH, state.companion.energy / 100, C.companionG, C.companionD, 'CRITTER');
  drawBarHUD(hudX, cookedY + 2 + barH + 7, barW, barH, state.woodcutter.energy / 100, '#A0724A', '#4A3520', 'CUTTER');
  if (state.quarrier.unlocked) drawBarHUD(hudX, cookedY + 2 + (barH + 7) * 2, barW, barH, state.quarrier.energy / 100, '#8A8078', '#3A3530', 'QUARRY');
  let qOff = (state.quarrier && state.quarrier.unlocked) ? floor(14 * uiScale) : 0;
  let barBlockH = 2 + (barH + 7) * 2;

  // Island level — Cinzel for rank title
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80);
  textSize(hudTextSize);
  let rankTitle = state.islandLevel >= 25 ? 'IMPERATOR' : state.islandLevel >= 20 ? 'CONSUL' : state.islandLevel >= 15 ? 'SENATOR' : state.islandLevel >= 10 ? 'GOVERNOR' : 'CITIZEN';
  text(rankTitle + ' — LV.' + state.islandLevel, hudX, cookedY + barBlockH + qOff);
  textFont('monospace');
  // Skill points alert
  let _skillOff = 0;
  if ((state.player.skillPoints || 0) > 0) {
    fill(255, 220, 80); textSize(hudTextSize);
    text('[K] ' + state.player.skillPoints + ' skill pt' + (state.player.skillPoints > 1 ? 's' : '') + ' ready', hudX, cookedY + barBlockH + hudLineH + qOff);
    _skillOff = hudLineH;
  }
  // Season
  let seasonCol = getSeason() === 2 ? color(200, 140, 40) : getSeason() === 3 ? color(180, 200, 220) : getSeason() === 1 ? color(200, 180, 60) : color(80, 160, 50);
  fill(seasonCol);
  textSize(hudTextSize);
  text(getSeasonName(), hudX, cookedY + barBlockH + hudLineH + _skillOff + qOff);
  // Seasonal crop hint
  let _scHint = typeof getSeasonalCrop === 'function' ? getSeasonalCrop() : null;
  if (_scHint) {
    fill(160, 150, 110, 160); textSize(hudSmallText);
    text('Best crop: ' + _scHint.name, hudX, cookedY + barBlockH + hudLineH * 2 + _skillOff + qOff);
  }

  // Ship status
  let hudY = cookedY + barBlockH + hudLineH * 3 + _skillOff;
  if (state.ship.state !== 'gone') {
    fill(color(C.solarBright));
    textSize(hudTextSize);
    text('SHIP: ' + state.ship.state.toUpperCase(), hudX, hudY);
    hudY += hudLineH;
  }

  // Grape/olive seeds — only show when player has some
  if (state.grapeSeeds > 0 || state.oliveSeeds > 0) {
    fill(140, 60, 160);
    textSize(hudTextSize);
    let seedStr = '';
    if (state.grapeSeeds > 0) seedStr += 'GRAPE ' + state.grapeSeeds + '  ';
    if (state.oliveSeeds > 0) seedStr += 'OLIVE ' + state.oliveSeeds;
    text(seedStr.trim(), hudX, hudY);
    hudY += hudLineH;
  }

  // Crop select
  fill(color(C.textDim)); textSize(hudTextSize);
  let sc = getSeasonalCrop();
  let hasNewSeeds = (state.flaxSeeds > 0 || state.pomegranateSeeds > 0 || state.lotusSeeds > 0);
  let cropHint = sc ? (hasNewSeeds ? '  (1-7)' : '  (1/2/3/4)') : (hasNewSeeds ? '  (1-3,5-7)' : '  (1/2/3)');
  text('CROP: ' + (state.cropSelect || 'grain').toUpperCase() + cropHint, hudX, hudY);
  hudY += hudLineH;

  // Blessing indicator
  if (state.blessing && state.blessing.type) {
    let blessCol = state.blessing.type === 'crops' ? '#88cc44' : state.blessing.type === 'solar' ? '#ffcc44' : state.blessing.type === 'speed' ? '#44ccff' : state.blessing.type === 'storm' ? '#8888ff' : '#ff88ff';
    fill(color(blessCol));
    textSize(hudTextSize);
    let bMin = floor((state.blessing.timer || 0) / 60);
    text('BLESSING: ' + state.blessing.type.toUpperCase() + ' (' + bMin + 'm)', hudX, hudY);
    hudY += hudLineH;
  }

  // Weather indicator
  if (state.weather && state.weather.type !== 'clear') {
    let wCol = state.weather.type === 'rain' ? '#6699cc' : state.weather.type === 'heatwave' ? '#ff8844' : '#aabbcc';
    fill(color(wCol));
    textSize(hudTextSize);
    let wSec = floor((state.weather.timer || 0) / 60);
    text('WEATHER: ' + state.weather.type.toUpperCase() + ' (' + wSec + 's)', hudX, hudY);
    hudY += hudLineH;
  }

  // Tech: natural_philosophy — predict tomorrow's weather
  if (typeof hasTech === 'function' && hasTech('natural_philosophy')) {
    fill(140, 170, 200, 160); textSize(hudSmallText);
    let nextWeather = (state.daysSinceRain || 0) >= 5 ? 'RAIN likely' : (state.daysSinceRain || 0) >= 3 ? 'DROUGHT continues' : 'CLEAR skies expected';
    text('Tomorrow: ' + nextWeather, hudX, hudY);
    hudY += hudLineH;
  }

  // Drought indicator
  if ((state.daysSinceRain || 0) >= 3) {
    fill(200, 140, 60);
    textSize(hudTextSize);
    let dLabel = (state.daysSinceRain || 0) >= 7 ? 'SEVERE DROUGHT' : 'DROUGHT';
    text(dLabel + ' (day ' + (state.daysSinceRain || 0) + ')', hudX, hudY);
    hudY += hudLineH;
  }

  // Quest tracker
  if (state.quest) {
    fill(color(C.solarGold));
    textSize(hudTextSize);
    text('QUEST: ' + state.quest.desc + ' ' + state.quest.progress + '/' + state.quest.target, hudX, hudY);
    hudY += hudLineH;
  }

  drawingContext.globalAlpha = 1.0;

  // Storm warning
  if (stormActive) {
    fill(color(C.stormFlash));textSize(hudSmallText);textAlign(CENTER,TOP);text('DRIFT STORM ACTIVE',width/2,40);textAlign(LEFT,TOP);
  }

  // Island name label (top center, subtle)
  if (state.islandName && !stormActive) {
    textFont('Cinzel, Georgia, serif');
    fill(200, 175, 120, 160);
    textSize(hudBigText);
    textAlign(CENTER, TOP);
    let _dayLbl = state.islandName + ' \u2014 Day ' + state.day;
    if (typeof isMarketDay === 'function' && isMarketDay(state.day)) _dayLbl += '  [MARKET DAY]';
    if (state.prestige && state.prestige.count > 0) _dayLbl += '  \u2726' + state.prestige.count;
    text(_dayLbl, width / 2, 6);
    if (typeof isMarketDay === 'function' && isMarketDay(state.day)) {
      fill(255, 220, 80, 80 + Math.sin(frameCount * 0.05) * 30);
      textSize(hudSmallText);
      text('Better shop prices today!', width / 2, 6 + hudBigText + 2);
    }
    textAlign(LEFT, TOP);
    textFont('monospace');
  }

  // Prestige UI hint (after winning)
  if (state.won && !state.conquest.active && !state.rowing.active) {
    fill(200, 180, 100, 120); textSize(8); textAlign(CENTER, TOP);
    text('[P] Prestige & Score', width / 2, height - 64);
    textAlign(LEFT, TOP);
  }

  // Harvest combo counter — visible near player when active
  if (state.harvestCombo && state.harvestCombo.count >= 2 && state.harvestCombo.timer > 0) {
    let hc = state.harvestCombo;
    let psx = w2sX(state.player.x), psy = w2sY(state.player.y);
    let tier = Math.min(Math.floor(hc.count / 2), 6);
    let bonusPct = [0, 10, 20, 30, 40, 50, 60][tier];
    let comboColors = ['#ffffff', '#ffffff', '#ffeeaa', '#ffdd66', '#ffcc33', '#ffaa00', '#ff8800'];
    let col = color(comboColors[tier]);
    let pulse = 1 + Math.sin(frameCount * 0.15) * 0.08;
    let barFrac = hc.timer / ((state.prophecy && state.prophecy.type === 'combo') ? 180 : 90);
    // Combo badge
    push();
    textAlign(CENTER, CENTER);
    textSize(10 * pulse);
    fill(red(col), green(col), blue(col), 220);
    text('COMBO x' + hc.count, psx + 50, psy - 40);
    textSize(10);
    fill(red(col), green(col), blue(col), 160);
    text('+' + bonusPct + '% yield', psx + 50, psy - 28);
    // Timer bar
    noStroke();
    fill(40, 35, 25, 150);
    rect(psx + 25, psy - 22, 50, 3, 1);
    fill(red(col), green(col), blue(col), 180);
    rect(psx + 25, psy - 22, 50 * barFrac, 3, 1);
    pop();
  }

  // ─── QUEST TRACKER (right side) ───
  {let qtW=max(156,floor(170*uiScale)),qtH=max(32,floor(36*uiScale));
  if(state.quest){let qtX=width-qtW-14,qtY=floor(122*uiScale);noStroke();fill(25,20,14,180);rect(qtX,qtY,qtW,qtH,4);
    stroke(180,145,70,100);strokeWeight(0.5);noFill();rect(qtX,qtY,qtW,qtH,4);noStroke();
    fill(212,160,64);textSize(hudTextSize);textAlign(LEFT,TOP);text('QUEST',qtX+6,qtY+3);
    fill(200,190,160);textSize(hudTextSize);text(state.quest.desc.length>22?state.quest.desc.substring(0,22)+'..':state.quest.desc,qtX+6,qtY+3+hudTextSize+2);
    let _qF=state.quest.progress/state.quest.target;fill(40,35,25);rect(qtX+6,qtY+qtH-8,qtW-56,4,2);
    fill(212,160,64);rect(qtX+6,qtY+qtH-8,(qtW-56)*_qF,4,2);fill(160,140,100);textSize(hudSmallText);textAlign(RIGHT,TOP);
    text(state.quest.progress+'/'+state.quest.target,qtX+qtW-6,qtY+qtH-10);textAlign(LEFT,TOP);}}

  // Controls (bottom right) — context-aware, minimal
  let ctrlW = max(200, floor(220 * uiScale));
  let cr = width - hudMargin, cb = height - hudMargin;
  let controlLines = [];
  if (state.buildMode) {
    controlLines = [state.demolishConfirm ? 'E confirm  |  ESC cancel' : state.demolishMode ? 'CLICK building to demolish  |  X cancel  |  B close' : 'WASD move  |  CLICK place  |  Q rotate  |  X demolish  |  B close'];
  } else if (state.rowing && state.rowing.active) {
    controlLines = ['WASD row  |  E dock  |  ESC menu'];
  } else if (state.wreck && state.wreck.active) {
    controlLines = ['WASD move  |  E gather  |  TAB raft'];
  } else {
    controlLines = ['WASD move  |  1-5 tools  |  6-0 items  |  E interact', 'SPACE attack  |  B build  |  K skills  |  N codex  |  Y tech  |  ESC menu'];
  }
  let controlH = floor(10 * uiScale) + controlLines.length * hudLineH;
  drawHUDPanel(cr - ctrlW, cb - controlH, ctrlW, controlH);
  fill(160, 140, 100, 180); textSize(hudTextSize); textAlign(LEFT, TOP);
  for (let ci = 0; ci < controlLines.length; ci++) {
    text(controlLines[ci], cr - ctrlW + 6, cb - controlH + 5 + ci * hudLineH);
  }

  noStroke();
  textAlign(LEFT, TOP);

  // ─── MINI-MAP (top right) ───
  let mmW = max(110, floor(120 * uiScale)), mmH = max(70, floor(76 * uiScale));
  let mmX = width - mmW - hudMargin, mmY = hudMargin;
  noStroke();
  fill(15, 20, 30, 230);
  rect(mmX, mmY, mmW, mmH, 4);
  // Gold border (matches HUD style)
  stroke(180, 145, 70, 160);
  strokeWeight(1);
  noFill();
  rect(mmX, mmY, mmW, mmH, 4);
  // Inner decorative line
  stroke(120, 95, 55, 60);
  strokeWeight(0.5);
  rect(mmX + 2, mmY + 2, mmW - 4, mmH - 4, 3);
  noStroke();
  // Island name label
  fill(180, 160, 120, 160); textSize(max(5, floor(6 * uiScale))); textAlign(CENTER, TOP);
  text('INSULA DOMUS', mmX + mmW / 2, mmY + 2); textAlign(LEFT, TOP);
  let mcx = mmX + mmW / 2, mcy = mmY + mmH / 2;
  let scaleX = (mmW - 12) / (state.islandRX * 2);
  let scaleY = (mmH - 12) / (state.islandRY * 2);
  // Island shape
  noStroke();
  fill(65, 85, 40, 220);
  ellipse(mcx, mcy, (mmW - 14), (mmH - 14) * 0.7);
  // Island rim
  stroke(90, 110, 50, 150);
  strokeWeight(1);
  noFill();
  ellipse(mcx, mcy, (mmW - 14), (mmH - 14) * 0.7);
  noStroke();
  // Farm plots
  fill(90, 60, 25, 180);
  state.plots.forEach(pl => {
    let dx = (pl.x - WORLD.islandCX) * scaleX;
    let dy = (pl.y - WORLD.islandCY) * scaleY;
    rect(mcx + dx - 1.5, mcy + dy - 1, 3, 2);
  });
  // Trees
  fill(40, 80, 30, 200);
  state.trees.forEach(t => {
    if (!t.alive) return;
    let dx = (t.x - WORLD.islandCX) * scaleX;
    let dy = (t.y - WORLD.islandCY) * scaleY;
    circle(mcx + dx, mcy + dy, 2.5);
  });
  // Crystals
  fill(0, 255, 136, 180);
  state.crystalNodes.forEach(c => {
    let dx = (c.x - WORLD.islandCX) * scaleX;
    let dy = (c.y - WORLD.islandCY) * scaleY;
    circle(mcx + dx, mcy + dy, 2);
  });
  // Temple
  fill(220, 210, 190, 200);
  rect(mcx - 3, mcy - 2, 6, 4, 1);
  // Player — bright blinking dot
  let pdx = (state.player.x - WORLD.islandCX) * scaleX;
  let pdy = (state.player.y - WORLD.islandCY) * scaleY;
  fill(255, 80, 40, 180 + sin(frameCount * 0.15) * 60);
  circle(mcx + pdx, mcy + pdy, 4);
  // NPC
  let ndx = (state.npc.x - WORLD.islandCX) * scaleX;
  let ndy = (state.npc.y - WORLD.islandCY) * scaleY;
  fill(200, 80, 200, 180);
  circle(mcx + ndx, mcy + ndy, 3);
  // Bridge indicator (west arrow)
  if (state.imperialBridge.built) {
    stroke(200, 170, 90, 120); strokeWeight(0.5);
    line(mmX + 4, mcy, mmX + 12, mcy);
    fill(200, 170, 90, 120); noStroke();
    triangle(mmX + 3, mcy, mmX + 7, mcy - 2, mmX + 7, mcy + 2);
    fill(180, 160, 120, 100); textSize(4); textAlign(LEFT, CENTER);
    text('Bridge', mmX + 3, mcy + 6); textAlign(LEFT, TOP);
  }

  // ─── SPAWN LEGION BUTTON (bottom-right, above hotbar) ───
  drawLegionButton();
}

// Legion button state
let _legionBtnPulse = 0;

function drawLegionButton() {
  if (!state.legia || !state.legia.army) return;
  let army = state.legia.army;
  if (army.length === 0) return;

  let btnW = 60, btnH = 50;
  // Position: right of hotbar area
  let slotW = (typeof _isMobile !== 'undefined' && _isMobile) ? 44 : 36;
  let gap = 3;
  let totalHotbar = 10 * (slotW + gap) - gap;
  let hotbarRight = floor((width + totalHotbar) / 2);
  let bx = hotbarRight + 14;
  let by = height - btnH - 16;

  // Clamp so it doesn't go off-screen
  if (bx + btnW > width - 8) bx = width - btnW - 8;

  // Store for click detection
  _legionBtnX = bx;
  _legionBtnY = by;
  _legionBtnW = btnW;
  _legionBtnH = btnH;

  let deployed = typeof getDeployedCount === 'function' ? getDeployedCount() : 0;
  let garrison = typeof getGarrisonCount === 'function' ? getGarrisonCount() : 0;
  let total = army.length;
  let isDeployed = deployed > garrison;
  let mil = typeof getFactionMilitary === 'function' ? getFactionMilitary() : { tunic: [180, 40, 40] };

  // Pulse animation
  _legionBtnPulse += 0.05;

  // Button background
  push();
  noStroke();
  fill(25, 20, 14, 220);
  rect(bx, by, btnW, btnH, 5);

  // Border color based on state
  let borderCol;
  if (total === 0) {
    borderCol = color(80, 80, 80); // grayed out
  } else if (isDeployed) {
    borderCol = color(200, 60, 50); // red for recall
  } else {
    borderCol = color(210, 180, 60); // gold for deploy
  }
  stroke(borderCol);
  strokeWeight(1.5);
  noFill();
  rect(bx, by, btnW, btnH, 5);

  // Inner glow pulse when army available
  if (total > 0) {
    let pulse = sin(_legionBtnPulse) * 0.3 + 0.3;
    stroke(red(borderCol), green(borderCol), blue(borderCol), pulse * 80);
    strokeWeight(0.5);
    rect(bx + 2, by + 2, btnW - 4, btnH - 4, 4);
  }
  noStroke();

  // Shield + sword icon (centered top area)
  let ix = bx + btnW / 2, iy = by + 16;
  // Shield body
  fill(mil.tunic[0], mil.tunic[1], mil.tunic[2], 200);
  beginShape();
  vertex(ix, iy - 8);
  vertex(ix + 7, iy - 5);
  vertex(ix + 6, iy + 3);
  vertex(ix, iy + 8);
  vertex(ix - 6, iy + 3);
  vertex(ix - 7, iy - 5);
  endShape(CLOSE);
  // Shield boss (center circle)
  fill(220, 200, 140, 180);
  circle(ix, iy, 5);
  // Sword (angled behind shield)
  stroke(200, 200, 200, 200);
  strokeWeight(1.5);
  line(ix + 5, iy - 10, ix + 12, iy + 4);
  // Sword guard
  strokeWeight(2);
  line(ix + 7, iy - 5, ix + 10, iy - 3);
  noStroke();

  // Label text
  textAlign(CENTER, TOP);
  textSize(8);
  if (isDeployed) {
    fill(200, 80, 60);
    text('RECALL', bx + btnW / 2, by + 28);
  } else {
    fill(210, 190, 80);
    text('DEPLOY', bx + btnW / 2, by + 28);
  }

  // Soldier count
  textSize(9);
  fill(180, 170, 140);
  text(deployed + '/' + total, bx + btnW / 2, by + 38);

  // Hotkey hint
  textSize(6);
  fill(120, 110, 90, 140);
  text('[G]', bx + btnW / 2, by + btnH - 9);

  pop();
  textAlign(LEFT, TOP);
}

// Legion button hit area (set by drawLegionButton)
let _legionBtnX = 0, _legionBtnY = 0, _legionBtnW = 0, _legionBtnH = 0;

function handleLegionButtonClick(mx, my) {
  if (!state.legia || !state.legia.army || state.legia.army.length === 0) return false;
  if (mx < _legionBtnX || mx > _legionBtnX + _legionBtnW) return false;
  if (my < _legionBtnY || my > _legionBtnY + _legionBtnH) return false;

  let deployed = typeof getDeployedCount === 'function' ? getDeployedCount() : 0;
  let garrison = typeof getGarrisonCount === 'function' ? getGarrisonCount() : 0;
  let shouldRecall = deployed > garrison;

  if (typeof setAllGarrison === 'function') {
    setAllGarrison(shouldRecall);
  }

  // Sound
  if (typeof snd !== 'undefined' && snd) snd.playSFX('war_horn');

  // Floating text
  let msg = shouldRecall ? 'LEGION RECALLED!' : 'LEGION DEPLOYED!';
  let col = shouldRecall ? '#cc6644' : '#ddcc44';
  if (typeof addFloatingText === 'function') addFloatingText(width / 2, height * 0.25, msg, col);

  // Screen shake
  if (typeof triggerScreenShake === 'function') triggerScreenShake(3, 12, 0, 0, 'random');

  // If deploying, set formation positions around player
  if (!shouldRecall && state.legia && state.legia.army) {
    _spawnLegionFormation();
  }

  return true;
}

function _spawnLegionFormation() {
  let army = state.legia.army;
  let p = state.player;
  // Facing direction based on player movement or default south
  let facing = (p.vx !== undefined && (p.vx !== 0 || p.vy !== 0))
    ? atan2(p.vy || 0, p.vx || 0)
    : PI / 2; // default: facing down
  let behindAngle = facing + PI; // behind the player
  let spacing = 30;

  let deployIdx = 0;
  for (let i = 0; i < army.length; i++) {
    if (army[i].garrison) continue;
    // V-formation: spread units in two wings behind player
    let row = floor(deployIdx / 2);
    let side = (deployIdx % 2 === 0) ? -1 : 1;
    let spreadAngle = behindAngle + side * 0.35 * (row + 1);
    let dist = spacing + row * 20;
    // Set target position — updatePlayerEscort will smooth-move them there
    army[i].x = p.x + cos(spreadAngle) * dist;
    army[i].y = p.y + sin(spreadAngle) * dist;
    deployIdx++;
  }
}

// Build menu slide-in animation state
let _buildMenuSlide = 0;

function drawBuildUI() {
  if (!state.buildMode) { _buildMenuSlide = 0; return; }

  // Slide-in from bottom animation
  if (_buildMenuSlide < 1) _buildMenuSlide = min(1, _buildMenuSlide + 0.08);
  let slideOff = floor((1 - _buildMenuSlide) * 80);

  // Build mode = personal decoration only. Landmark buildings auto-spawn with island levels.
  let baseTypes = ['floor', 'wall', 'door', 'chest', 'bridge', 'fence', 'torch', 'flower', 'lantern', 'mosaic', 'aqueduct', 'bath'];
  let slotW = 48;
  let gap = 4;
  let numBase = baseTypes.length;
  let barW = numBase * slotW + (numBase - 1) * gap + 24;
  let rowH = 56;
  let barH = rowH + 8;
  let barX = width / 2 - barW / 2;
  let barY = height - barH - 16 + slideOff;

  // Bar background — parchment scroll style
  noStroke();
  // Shadow
  fill(0, 0, 0, 50);
  rect(barX - 1, barY + 2, barW + 6, barH + 6, 8);
  // Parchment base
  fill(38, 30, 20, 240);
  rect(barX, barY, barW, barH, 6);
  // Warm parchment overlay
  fill(190, 170, 140, 12);
  rect(barX, barY, barW, barH, 6);
  // Scroll roll effect — darker top edge
  fill(0, 0, 0, 35);
  rect(barX, barY, barW, 4, 6, 6, 0, 0);
  fill(80, 65, 40, 30);
  rect(barX, barY + 4, barW, 2);
  // Gold border
  let _bmAc = (typeof getFactionData === 'function') ? getFactionData().accentColor : [180, 150, 80];
  stroke(_bmAc[0], _bmAc[1], _bmAc[2], 160);
  strokeWeight(1.2);
  noFill();
  rect(barX, barY, barW, barH, 6);
  stroke(140, 110, 60, 70);
  strokeWeight(0.5);
  rect(barX + 3, barY + 3, barW - 6, barH - 6, 4);
  // Divider between rows
  stroke(120, 95, 55, 60);
  strokeWeight(0.8);
  line(barX + 6, barY + rowH + 4, barX + barW - 6, barY + rowH + 4);
  noStroke();

  // Row labels
  fill(160, 130, 70, 160);
  textSize(9);
  textAlign(LEFT, TOP);
  text('BASE', barX + 4, barY + 3);
  fill(140, 100, 55, 140);
  text('ADV', barX + 4, barY + rowH + 6);

  let startX = barX + 12;

  function drawSlot(t, i, row) {
    // Stagger slide-in per slot
    let _slotSlide = max(0, floor((1 - min(1, _buildMenuSlide * 1.5 - i * 0.04)) * 30));
    let tx = startX + i * (slotW + gap);
    let ty = barY + row * (rowH + 4) + 5 + _slotSlide;
    let selected = state.buildType === t;
    let unlocked = isBuildingUnlocked(t);
    let affordable = unlocked && canAfford(t);
    let bp = BLUEPRINTS[t];

    // Slot background
    if (selected) {
      fill(80, 65, 40, 180);
      stroke(200, 170, 90, 220);
      strokeWeight(1.5);
    } else if (!unlocked) {
      fill(20, 16, 12, 160);
      stroke(60, 45, 30, 80);
      strokeWeight(0.8);
    } else {
      fill(35, 28, 20, 160);
      stroke(affordable ? color(120, 100, 70, 100) : color(80, 40, 30, 80));
      strokeWeight(0.8);
    }
    rect(tx, ty, slotW, 48, 4);
    noStroke();

    // Icon
    push();
    if (!unlocked) drawingContext.globalAlpha = 0.3;
    translate(tx + slotW / 2, ty + 16);
    scale(1.3);
    drawBuildIcon(t, selected);
    drawingContext.globalAlpha = 1.0;
    pop();

    if (!unlocked) {
      // Lock icon
      fill(120, 90, 50, 180);
      textSize(11);
      textAlign(CENTER, TOP);
      text('LV' + bp.minLevel, tx + slotW / 2, ty + 32);
      fill(80, 60, 35, 160);
      textSize(9);
      text(bp.name, tx + slotW / 2, ty + 42);
    } else {
      // Key binding
      fill(selected ? color(200, 170, 90) : color(140, 120, 85));
      textSize(10);
      textAlign(CENTER, TOP);
      if (bp.key) text(bp.key, tx + slotW / 2, ty + 32);
      // Name
      fill(selected ? color(220, 200, 160) : (affordable ? color(140, 120, 85) : color(120, 60, 50)));
      textSize(9);
      text(bp.name, tx + slotW / 2, ty + 42);
    }
  }

  baseTypes.forEach((t, i) => drawSlot(t, i, 0));

  // Title bar
  textFont('Cinzel, Georgia, serif');
  fill(210, 180, 80, 230);
  textSize(11);
  textAlign(CENTER, BOTTOM);
  text('AEDIFICIUM', width / 2, barY - 6);
  textFont('monospace');
  fill(160, 140, 100, 180);
  textSize(8);
  text('[B] close', width / 2, barY + 2);

  // Selected item tooltip with cost or lock message
  let bp = BLUEPRINTS[state.buildType];
  let unlocked = isBuildingUnlocked(state.buildType);
  textSize(11);
  textAlign(CENTER, BOTTOM);
  if (!unlocked) {
    fill(160, 110, 55);
    text(bp.name.toUpperCase() + '  --  Reach island level ' + bp.minLevel, width / 2, barY - 16);
  } else {
    let costStr = getCostString(state.buildType);
    fill(220, 200, 160);
    text(bp.name.toUpperCase() + '  --  ' + costStr, width / 2, barY - 16);
  }
  textAlign(LEFT, TOP);

  // Demolish confirmation overlay
  if (state.demolishConfirm) {
    let dc = state.demolishConfirm;
    let b = dc.building;
    let bpDem = BLUEPRINTS[b.type];
    let bName = bpDem ? bpDem.name : b.type;
    let refundStr = '';
    let parts = [];
    for (let res in dc.refund) {
      let name = res === 'ironOre' ? 'iron' : res;
      parts.push(dc.refund[res] + ' ' + name);
    }
    refundStr = parts.length > 0 ? parts.join(', ') : 'nothing';

    let dlgW = 280, dlgH = 72;
    let dlgX = width / 2 - dlgW / 2, dlgY = height / 2 - dlgH / 2 - 40;

    // Dim backdrop
    fill(0, 0, 0, 120);
    noStroke();
    rect(0, 0, width, height);

    // Panel
    drawParchmentPanel(dlgX, dlgY, dlgW, dlgH);

    fill(220, 180, 80);
    textFont('Cinzel, Georgia, serif');
    textSize(12);
    textAlign(CENTER, TOP);
    text('Demolish ' + bName + '?', width / 2, dlgY + 8);
    textFont('monospace');
    fill(140, 200, 140);
    textSize(10);
    text('Refund: ' + refundStr, width / 2, dlgY + 26);
    fill(180, 160, 120);
    textSize(10);
    text('[E] Confirm    [ESC] Cancel', width / 2, dlgY + 44);
    textAlign(LEFT, TOP);
  }
}

function drawBuildIcon(type, selected) {
  let c1 = selected ? color(220, 210, 180) : color(C.textDim);
  let c2 = selected ? color(180, 170, 150) : color(100, 95, 85);
  let accent = selected ? color(200, 160, 80) : color(140, 120, 70);
  noStroke();
  fill(c1);
  switch (type) {
    case 'wall':
      // Marble ashlar blocks
      fill(c1);
      rect(-10, -6, 20, 12, 1);
      stroke(c2);
      strokeWeight(0.5);
      line(-10, -1, 10, -1);
      line(-10, 4, 10, 4);
      line(-3, -6, -3, -1);
      line(5, -1, 5, 4);
      line(-5, 4, -5, 6);
      noStroke();
      // Sunlit highlight
      fill(255, 240, 200, selected ? 50 : 20);
      rect(-10, -6, 20, 4);
      break;
    case 'floor':
      // Herringbone stone tile
      fill(c1);
      rect(-10, -8, 20, 16, 1);
      stroke(c2);
      strokeWeight(0.4);
      // Herringbone pattern
      for (let hy = -6; hy <= 6; hy += 4) {
        for (let hx = -8; hx <= 8; hx += 8) {
          line(hx, hy, hx + 4, hy + 2);
          line(hx + 4, hy + 2, hx + 8, hy);
          line(hx + 4, hy + 2, hx + 4, hy + 4);
        }
      }
      noStroke();
      break;
    case 'door':
      // Roman arched doorway
      fill(c1);
      rect(-10, -4, 20, 12, 1);
      fill(0, 0, 0, selected ? 120 : 80);
      rect(-5, -2, 10, 10);
      // Arch top
      arc(0, -2, 10, 10, PI, TWO_PI);
      // Keystone
      fill(accent);
      beginShape();
      vertex(-2, -6); vertex(2, -6);
      vertex(1.5, -3); vertex(-1.5, -3);
      endShape(CLOSE);
      break;
    case 'chest':
      // Roman arca with bronze bands
      fill(selected ? color(110, 70, 35) : color(80, 55, 30));
      rect(-8, -2, 16, 10, 1);
      // Lid
      fill(selected ? color(130, 85, 40) : color(95, 65, 35));
      rect(-9, -5, 18, 5, 2);
      // Bronze bands
      fill(accent);
      rect(-9, -5, 18, 1.2);
      rect(-9, 2, 18, 1.2);
      // Lock plate
      fill(accent);
      rect(-1, 0, 3, 3);
      fill(0, 0, 0, 80);
      rect(0, 1, 1, 1);
      break;
    case 'bridge':
      fill(c1);
      rect(-10, -4, 20, 8);
      fill(c2);
      rect(-10, -6, 20, 3);
      // Pixel arch
      fill(0, 0, 0, 60);
      rect(-4, 2, 8, 2);
      rect(-2, 4, 4, 2);
      fill(selected ? color(60, 120, 200, 80) : color(40, 80, 140, 50));
      rect(-6, 3, 12, 2);
      break;
    case 'fence':
      fill(c1);
      rect(-10, -4, 20, 2);
      rect(-10, 6, 20, 2);
      for (let bx = -7; bx <= 7; bx += 4.5) {
        fill(c2);
        rect(floor(bx) - 1, -2, 2, 8);
        fill(c1);
        rect(floor(bx) - 1, 1, 3, 3);
      }
      break;
    case 'torch':
      fill(accent);
      // Tripod legs — pixel
      rect(-4, 2, 2, 8);
      rect(2, 2, 2, 8);
      // Bowl
      rect(-5, 0, 10, 3);
      // Fire — pixel rects
      fill(255, 120, 20, selected ? 220 : 120);
      rect(-2, -3, 4, 3);
      fill(255, 200, 40, selected ? 200 : 100);
      rect(-1, -4, 2, 3);
      fill(255, 255, 180, selected ? 160 : 60);
      rect(0, -5, 1, 2);
      break;
    case 'flower':
      fill(selected ? color(50, 100, 40) : color(40, 70, 30));
      rect(-7, -1, 14, 8);
      let rc = selected ? color(180, 30, 50) : color(130, 30, 40);
      fill(rc);
      rect(-5, -2, 3, 3);
      rect(2, -1, 3, 3);
      rect(-1, 2, 3, 3);
      fill(selected ? color(220, 60, 80) : color(160, 50, 60));
      rect(-4, -1, 1, 1);
      rect(3, 0, 1, 1);
      break;
    case 'lantern':
      fill(c1);
      rect(-3, 2, 6, 8);
      rect(-5, 9, 10, 2);
      fill(accent);
      rect(-4, -1, 8, 3);
      // Spout
      rect(4, -1, 3, 2);
      // Flame
      fill(255, 200, 60, selected ? 220 : 100);
      rect(6, -4, 2, 3);
      fill(255, 255, 180, selected ? 180 : 60);
      rect(6, -5, 2, 1);
      break;
    case 'mosaic':
      fill(selected ? color(200, 180, 140) : color(140, 130, 110));
      rect(-8, -8, 16, 16);
      fill(selected ? color(160, 60, 30) : color(120, 50, 30));
      rect(-8, -8, 16, 2);
      rect(-8, 6, 16, 2);
      rect(-8, -6, 2, 12);
      rect(6, -6, 2, 12);
      // Diamond — pixel stacked rects
      fill(selected ? color(40, 60, 120) : color(30, 45, 80));
      rect(0, -5, 1, 1);
      rect(-1, -4, 3, 1);
      rect(-2, -3, 5, 1);
      rect(-3, -2, 7, 1);
      rect(-4, -1, 9, 2);
      rect(-3, 1, 7, 1);
      rect(-2, 2, 5, 1);
      rect(-1, 3, 3, 1);
      rect(0, 4, 1, 1);
      // Center
      fill(selected ? color(200, 160, 40) : color(140, 110, 40));
      rect(-1, -1, 2, 2);
      break;
    case 'aqueduct':
      fill(c1);
      rect(-9, -4, 4, 12);
      rect(5, -4, 4, 12);
      // Pixel arch
      fill(c1);
      rect(-5, -4, 10, 2);
      rect(-3, -2, 6, 2);
      rect(-10, -7, 20, 4);
      // Water
      fill(selected ? color(60, 130, 210, 150) : color(40, 80, 140, 80));
      rect(-8, -6, 16, 2);
      // Keystone
      fill(accent);
      rect(-1, -4, 2, 2);
      break;
    case 'granary':
      // Granary icon — raised structure with roof
      fill(c1);
      rect(-9, -2, 18, 10, 1);
      // Stilts
      fill(c2);
      rect(-7, 8, 3, 4);
      rect(4, 8, 3, 4);
      // Roof
      fill(selected ? color(170, 95, 55) : color(120, 65, 38));
      rect(-10, -6, 20, 5, 1);
      // Ventilation dots
      fill(0, 0, 0, selected ? 100 : 60);
      rect(-5, 1, 3, 2);
      rect(2, 1, 3, 2);
      break;
    case 'well':
      // Well icon — round shaft with crossbeam
      fill(c1);
      rect(-6, -4, 12, 12, 2);
      // Dark water
      fill(selected ? color(40, 90, 140, 180) : color(25, 55, 90, 120));
      ellipse(0, -1, 8, 4);
      // Crossbeam
      fill(selected ? color(120, 85, 40) : color(85, 60, 30));
      rect(-8, -7, 16, 3, 1);
      rect(-7, -7, 2, 6);
      rect(5, -7, 2, 6);
      break;
    case 'temple':
      // Temple icon — columns and pediment
      fill(c1);
      rect(-10, 0, 20, 8, 1);
      // Columns
      for (let ti = 0; ti < 4; ti++) {
        rect(-9 + ti * 6, -8, 3, 10, 1);
      }
      // Entablature
      rect(-11, -10, 22, 3, 1);
      // Pediment
      beginShape();
      vertex(-10, -10); vertex(0, -16); vertex(10, -10);
      endShape(CLOSE);
      // Acroteria
      fill(accent);
      circle(-10, -11, 3);
      circle(10, -11, 3);
      circle(0, -17, 3);
      break;
    case 'market':
      // Market icon — awning stall
      fill(selected ? color(195, 55, 40) : color(130, 40, 30));
      rect(-10, -10, 20, 8, 1);
      fill(selected ? color(220, 205, 175) : color(150, 140, 115));
      rect(-5, -10, 5, 8);
      rect(5, -10, 5, 8);
      // Counter
      fill(c1);
      rect(-10, -2, 20, 10, 1);
      // Goods
      fill(accent);
      rect(-7, -1, 4, 4, 1);
      fill(selected ? color(55, 120, 65) : color(40, 80, 45));
      ellipse(4, 1, 6, 4);
      break;
    case 'forum':
      // Forum icon — plaza with central fountain
      fill(c1);
      rect(-10, -10, 20, 20, 1);
      // Grid lines
      stroke(c2);
      strokeWeight(0.4);
      line(-10, -3, 10, -3);
      line(-10, 4, 10, 4);
      line(-3, -10, -3, 10);
      line(4, -10, 4, 10);
      noStroke();
      // Central fountain
      fill(selected ? color(50, 120, 180, 200) : color(35, 75, 120, 120));
      ellipse(-1, 0, 6, 4);
      // Columns
      fill(c1);
      rect(-11, -11, 3, 4, 1);
      rect(8, -11, 3, 4, 1);
      rect(-11, 7, 3, 4, 1);
      rect(8, 7, 3, 4, 1);
      break;
    case 'watchtower':
      // Watchtower icon — tall tower with battlements
      fill(c1);
      rect(-5, -10, 10, 20, 1);
      // Merlons
      fill(c2);
      rect(-5, -14, 3, 5, 1);
      rect(2, -14, 3, 5, 1);
      // Arrow slit
      fill(0, 0, 0, selected ? 120 : 70);
      rect(-1.5, -6, 3, 5, 1);
      // Torch
      fill(selected ? color(255, 160, 30, 220) : color(200, 110, 20, 100));
      rect(-1, -14, 2, 3);
      fill(selected ? color(255, 220, 80, 220) : color(200, 180, 50, 100));
      rect(-0.5, -15, 1, 2);
      break;
    case 'arch':
      // Triumphal arch icon
      fill(c1);
      rect(-10, -10, 7, 20, 1);
      rect(3, -10, 7, 20, 1);
      // Arch opening
      fill(0, 0, 0, selected ? 130 : 80);
      rect(-3, -8, 6, 16);
      arc(0, -8, 6, 8, PI, TWO_PI);
      // Attic
      fill(c1);
      rect(-10, -14, 20, 5, 1);
      // Keystone — gold
      fill(accent);
      rect(-1.5, -10, 3, 3, 1);
      break;
    case 'villa':
      // Villa icon — walled compound with garden
      fill(c1);
      rect(-10, -10, 20, 20, 1);
      // Interior
      fill(c2);
      rect(-7, -7, 14, 14, 1);
      // Garden — green patch
      fill(selected ? color(55, 100, 40, 200) : color(35, 65, 25, 140));
      rect(0, -5, 6, 8, 1);
      // Pool
      fill(selected ? color(50, 110, 170, 200) : color(30, 70, 110, 120));
      ellipse(-4, 2, 6, 4);
      // Roof edge
      fill(selected ? color(165, 88, 50, 180) : color(110, 60, 35, 120));
      rect(-10, -10, 20, 3, 1);
      break;
    case 'shrine':
      // Shrine icon — columns and flame
      fill(c1);
      rect(-8, -2, 16, 10, 1);
      fill(c2);
      rect(-6, -8, 3, 8, 1);
      rect(3, -8, 3, 8, 1);
      fill(c1);
      rect(-7, -10, 5, 3, 1);
      rect(2, -10, 5, 3, 1);
      fill(selected ? color(255, 160, 40, 220) : color(200, 120, 30, 120));
      rect(-1, -6, 2, 3);
      fill(selected ? color(255, 220, 80, 200) : color(200, 170, 50, 100));
      rect(-0.5, -8, 1, 2);
      break;
    case 'house':
      // House icon — peaked roof with door/windows
      fill(c1);
      rect(-9, -2, 18, 12, 1);
      fill(0, 0, 0, selected ? 120 : 70);
      rect(-2, 2, 4, 8);
      fill(accent);
      rect(1, 5, 1, 1);
      fill(0, 0, 0, selected ? 100 : 60);
      rect(-7, 0, 3, 3);
      rect(4, 0, 3, 3);
      fill(selected ? color(185, 100, 58) : color(130, 70, 40));
      beginShape();
      vertex(-10, -2); vertex(0, -10); vertex(10, -2);
      endShape(CLOSE);
      break;
    case 'library':
      // Library icon — scroll niches and columns
      fill(c1);
      rect(-10, -6, 20, 16, 1);
      fill(0, 0, 0, selected ? 100 : 60);
      for (let li = 0; li < 3; li++) {
        rect(-7 + li * 5, -3, 3, 5, 1);
      }
      fill(selected ? color(195, 175, 140) : color(140, 125, 100));
      for (let li = 0; li < 3; li++) {
        rect(-6 + li * 5, -1, 1, 3, 1);
      }
      fill(c1);
      rect(-10, -10, 20, 5, 1);
      fill(accent);
      rect(-9, -5, 18, 1.5);
      break;
    case 'arena':
      // Arena icon — oval with seating and banners
      fill(selected ? color(210, 190, 150) : color(150, 135, 108));
      ellipse(0, 0, 18, 14);
      fill(c1);
      for (let ai = 0; ai < 8; ai++) {
        let aa = ai * TWO_PI / 8;
        rect(cos(aa) * 8 - 1, sin(aa) * 6 - 1, 3, 3);
      }
      fill(selected ? color(180, 35, 35) : color(130, 30, 30));
      rect(-9, -10, 4, 6);
      rect(5, -10, 4, 6);
      break;
    case 'campfire':
      // Campfire icon — stone ring with flame
      fill(c2);
      for (let ci = 0; ci < 6; ci++) {
        let ca = ci * TWO_PI / 6;
        rect(cos(ca) * 5 - 1, sin(ca) * 4 - 1, 2, 2, 1);
      }
      fill(selected ? color(255, 150, 30, 220) : color(200, 110, 20, 120));
      rect(-2, -3, 4, 4);
      fill(selected ? color(255, 220, 60, 200) : color(200, 170, 40, 100));
      rect(-1, -5, 2, 3);
      fill(selected ? color(255, 255, 180, 160) : color(200, 200, 140, 60));
      rect(0, -6, 1, 2);
      break;
  }
}

function drawHUDPanel(x, y, w, h) {
  noStroke();
  // Drop shadow
  fill(0, 0, 0, 40);
  rect(x + 2, y + 2, w, h, 4);
  // Parchment base — warm tan
  fill(42, 34, 24, 230);
  rect(x, y, w, h, 4);
  // Subtle warm overlay (parchment feel)
  fill(190, 170, 140, 18);
  rect(x, y, w, h, 4);
  // Sparse dither noise for parchment grain (low draw count)
  fill(160, 140, 110, 10);
  for (let dy = 0; dy < h; dy += 8) {
    for (let dx = 0; dx < w; dx += 8) {
      if (_b4[(dy & 3) * 4 + (dx & 3)] > 10) {
        rect(x + dx, y + dy, 3, 3);
      }
    }
  }
  // Darker edges (vignette on panel)
  fill(0, 0, 0, 30);
  rect(x, y, w, 3, 4, 4, 0, 0);
  rect(x, y + h - 3, w, 3, 0, 0, 4, 4);
  fill(0, 0, 0, 20);
  rect(x, y, 3, h, 4, 0, 0, 4);
  rect(x + w - 3, y, 3, h, 0, 4, 4, 0);
  // Bronze/gold border
  let ac = (typeof getFactionData === 'function') ? getFactionData().accentColor : [180, 150, 80];
  stroke(ac[0], ac[1], ac[2], 140);
  strokeWeight(1);
  noFill();
  rect(x, y, w, h, 4);
  // Inner decorative line
  stroke(180, 150, 80, 50);
  strokeWeight(0.4);
  rect(x + 2, y + 2, w - 4, h - 4, 3);
  noStroke();
}

function drawParchmentPanel(x, y, w, h) {
  noStroke();
  // Outer shadow
  fill(0, 0, 0, 60);
  rect(x + 3, y + 3, w, h, 6);
  // Dark backdrop
  fill(25, 20, 14, 240);
  rect(x, y, w, h, 5);
  // Parchment inner — warm tan
  fill(52, 42, 30, 245);
  rect(x + 2, y + 2, w - 4, h - 4, 4);
  // Warm parchment overlay
  fill(190, 170, 140, 14);
  rect(x + 2, y + 2, w - 4, h - 4, 4);
  // Sparse dither grain texture
  fill(150, 130, 100, 9);
  for (let dy = 2; dy < h - 2; dy += 8) {
    for (let dx = 2; dx < w - 2; dx += 8) {
      if (_b4[(dy & 3) * 4 + (dx & 3)] > 9) {
        rect(x + dx, y + dy, 3, 3);
      }
    }
  }
  // Vignette edges
  fill(0, 0, 0, 25);
  rect(x + 2, y + 2, w - 4, 4, 4, 4, 0, 0);
  rect(x + 2, y + h - 6, w - 4, 4, 0, 0, 4, 4);
  fill(0, 0, 0, 18);
  rect(x + 2, y + 2, 4, h - 4, 4, 0, 0, 4);
  rect(x + w - 6, y + 2, 4, h - 4, 0, 4, 4, 0);
  // Gold ornamental border
  let ac = (typeof getFactionData === 'function') ? getFactionData().accentColor : [180, 150, 80];
  stroke(ac[0], ac[1], ac[2], 200);
  strokeWeight(1.5);
  noFill();
  rect(x + 1, y + 1, w - 2, h - 2, 5);
  // Inner decorative line
  stroke(140, 110, 55, 100);
  strokeWeight(0.5);
  rect(x + 5, y + 5, w - 10, h - 10, 3);
  // Corner ornaments — diamond shapes
  noStroke();
  fill(ac[0], ac[1], ac[2], 180);
  let cs = 5;
  // top-left
  push(); translate(x + 6, y + 6); rotate(PI / 4); rectMode(CENTER); rect(0, 0, cs, cs); rectMode(CORNER); pop();
  // top-right
  push(); translate(x + w - 6, y + 6); rotate(PI / 4); rectMode(CENTER); rect(0, 0, cs, cs); rectMode(CORNER); pop();
  // bottom-left
  push(); translate(x + 6, y + h - 6); rotate(PI / 4); rectMode(CENTER); rect(0, 0, cs, cs); rectMode(CORNER); pop();
  // bottom-right
  push(); translate(x + w - 6, y + h - 6); rotate(PI / 4); rectMode(CENTER); rect(0, 0, cs, cs); rectMode(CORNER); pop();
  noStroke();
}

function drawBarHUD(x, y, w, h, frac, colFull, colEmpty, label) {
  // Carved stone border
  fill(60, 50, 35);
  rect(x - 1, y - 1, w + 2, h + 2, 3);
  stroke(90, 75, 50, 120);
  strokeWeight(0.5);
  noFill();
  rect(x - 1, y - 1, w + 2, h + 2, 3);
  noStroke();
  // Empty trough
  fill(color(colEmpty));
  rect(x, y, w, h, 2);
  // Filled bar with subtle gradient
  let _cf = color(colFull);
  fill(_cf);
  rect(x, y, w * frac, h, 2);
  // Highlight stripe along top of filled area
  fill(red(_cf), green(_cf), blue(_cf), 60);
  rect(x, y, w * frac, max(1, floor(h / 3)), 2, 2, 0, 0);
  // Glow pulse on bar edge when filling
  if (frac > 0.01 && frac < 0.99) {
    let _glPulse = sin(frameCount * 0.12) * 0.4 + 0.6;
    fill(red(_cf), green(_cf), blue(_cf), 80 * _glPulse);
    rect(x + w * frac - 3, y, 6, h, 2);
  }
  // Ornamental end caps
  fill(90, 75, 50, 140);
  rect(x - 2, y, 2, h);
  rect(x + w, y, 2, h);
  // Label in warmer color
  fill(180, 160, 120);
  textSize(max(10, floor(11 * _uiScale)));
  textAlign(LEFT, TOP);
  text(label, x + w + 8, y + 1);
}

// ─── CURSOR — faction-themed ──────────────────────────────────────────────
function drawCursor() {
  let cx = mouseX, cy = mouseY;
  let ac = (typeof getFactionData === 'function') ? getFactionData().accentColor : [180, 150, 80];

  if (state.buildMode) {
    // Build cursor — golden crosshair with faction ring
    noStroke();
    fill(ac[0], ac[1], ac[2], 100);
    ellipse(cx, cy, 16, 16);
    fill(255, 200, 60, 80);
    ellipse(cx, cy, 8, 8);
    stroke(255, 220, 100, 200);
    strokeWeight(1);
    line(cx - 10, cy, cx - 4, cy);
    line(cx + 4, cy, cx + 10, cy);
    line(cx, cy - 10, cx, cy - 4);
    line(cx, cy + 4, cx, cy + 10);
    noStroke();
    fill(255, 255, 255, 220);
    ellipse(cx, cy, 3, 3);
  } else {
    // Faction-themed cursor — outer ring + inner dot + crosshair
    noStroke();
    fill(ac[0], ac[1], ac[2], 150);
    ellipse(cx, cy, 12, 12);
    fill(255, 255, 255, 200);
    ellipse(cx, cy, 4, 4);
    stroke(255, 255, 255, 100);
    strokeWeight(1);
    line(cx - 8, cy, cx - 4, cy);
    line(cx + 4, cy, cx + 8, cy);
    line(cx, cy - 8, cx, cy - 4);
    line(cx, cy + 4, cx, cy + 8);
    noStroke();
  }
}


// ─── TUTORIAL HINT UI ───────────────────────────────────────────────────
function drawTutorialHintUI() {
  if (!tutorialHint) return;
  let h = tutorialHint;
  let sx = w2sX(h.wx), sy = w2sY(h.wy);
  // Fade in/out
  let fadeIn = min(1, (180 - h.timer < 20) ? (180 - h.timer) / 20 : 1);
  let fadeOut = min(1, h.timer / 30);
  let a = min(fadeIn, fadeOut) * 255;
  let bob = sin(frameCount * 0.06) * 3;

  noStroke();
  textSize(9);
  let tw = textWidth(h.text) + 24;
  let hx = floor(sx - tw / 2), hy = floor(sy - 12 + bob);
  // Dark background with gold border
  fill(20, 16, 10, a * 0.8);
  rect(hx, hy, tw, 20, 4);
  stroke(212, 160, 64, a * 0.6);
  strokeWeight(1);
  noFill();
  rect(hx, hy, tw, 20, 4);
  noStroke();
  // Animated arrow pointing down
  let arrowY = hy + 22 + sin(frameCount * 0.08) * 3;
  fill(212, 160, 64, a * 0.8);
  triangle(sx - 4, arrowY, sx + 4, arrowY, sx, arrowY + 6);
  // Text
  fill(255, 240, 180, a);
  textAlign(CENTER, CENTER);
  text(h.text, floor(sx), hy + 10);
  textAlign(LEFT, TOP);
}

// ─── CURRENT GOAL HUD — top-left below resources ───────────────────────
function drawCurrentGoalHUD() {
  if (!state.tutorialGoal) return;
  if (state.tutorialGoalComplete) return;
  if (photoMode || screenshotMode || dialogState.active) return;
  let goal = state.tutorialGoal;
  let gx = width - 185, gy = 158;
  let fadeAlpha = 220;

  // Panel
  noStroke();
  fill(15, 12, 8, fadeAlpha * 0.85);
  rect(gx, gy, 172, 28, 3);
  stroke(180, 150, 60, fadeAlpha * 0.4);
  strokeWeight(0.5);
  noFill();
  rect(gx, gy, 172, 28, 3);
  noStroke();

  // Label
  fill(180, 150, 60, fadeAlpha);
  textSize(7);
  textAlign(LEFT, TOP);
  text('CURRENT GOAL', gx + 6, gy + 3);

  // Goal text
  fill(240, 230, 200, fadeAlpha);
  textSize(9);
  text(goal.text, gx + 6, gy + 14);

  // Subtle arrow pointing toward objective (world space)
  if (goal.targetWX !== undefined && goal.targetWY !== undefined) {
    let psx = w2sX(state.player.x), psy = w2sY(state.player.y);
    let tsx = w2sX(goal.targetWX), tsy = w2sY(goal.targetWY);
    let tdist = dist(psx, psy, tsx, tsy);
    if (tdist > 60) {
      let ang = atan2(tsy - psy, tsx - psx);
      let arrowR = 40;
      let ax = psx + cos(ang) * arrowR, ay = psy + sin(ang) * arrowR;
      let bob2 = sin(frameCount * 0.07) * 2;
      push();
      translate(floor(ax + bob2 * cos(ang + HALF_PI)), floor(ay + bob2 * sin(ang + HALF_PI)));
      rotate(ang);
      let arrAlpha = 100 + sin(frameCount * 0.05) * 30;
      fill(180, 150, 60, arrAlpha);
      noStroke();
      triangle(7, 0, -3, -4, -3, 4);
      fill(150, 120, 40, arrAlpha * 0.5);
      rect(-5, -2, 5, 4, 1);
      pop();
    }
  }
}

// ─── DISCOVERY EVENT UI ─────────────────────────────────────────────────
function drawDiscoveryEvent() {
  if (!discoveryEvent) return;
  let evt = discoveryEvent;
  let a = min(255, (240 - evt.timer) * 4);
  if (evt.timer < 30) a = floor(evt.timer * 8);

  // Dark overlay strip
  noStroke();
  fill(15, 12, 8, floor(a * 0.7));
  rect(0, height * 0.35, width, 70);

  // Gold border
  fill(200, 170, 60, floor(a * 0.5));
  rect(0, height * 0.35, width, 2);
  rect(0, height * 0.35 + 68, width, 2);

  // Dialog text
  fill(240, 225, 180, a);
  textSize(11);
  textAlign(CENTER, CENTER);
  text(evt.text, width / 2, height * 0.35 + 25);

  // Subtext
  fill(180, 220, 150, a * (0.6 + sin(frameCount * 0.08) * 0.3));
  textSize(9);
  text(evt.subtext, width / 2, height * 0.35 + 48);
  textAlign(LEFT, TOP);
}

// Draw ruin overlay on buildings when NPCs not yet found
function drawRuinOverlays() {
  let prog = state.progression;
  if (!prog.gameStarted || prog.villaCleared) return;

  noStroke();
  // Overgrown vines on farm if not cleared
  if (!prog.farmCleared) {
    let plots = state.plots;
    for (let i = 0; i < plots.length; i++) {
      let p = plots[i];
      let sx = w2sX(p.x), sy = w2sY(p.y);
      if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
      // Dead brown overlay
      fill(80, 65, 35, 100);
      rect(floor(sx - p.w / 2), floor(sy - p.h / 2), p.w, p.h);
      // Weed tufts
      fill(60, 80, 30, 120);
      if (i % 3 === 0) {
        rect(floor(sx - 4), floor(sy - 6), 2, 6);
        rect(floor(sx + 2), floor(sy - 4), 2, 4);
      }
    }
  }

  // Cracked/vine overlay near NPCs that aren't found
  if (!prog.npcsFound.marcus) {
    // Rubble pile near Marcus location
    let mx = w2sX(WORLD.islandCX + WORLD.islandRX - 100);
    let my = w2sY(WORLD.islandCY + 20);
    if (mx > -100 && mx < width + 100) {
      fill(90, 80, 65, 180);
      rect(floor(mx - 15), floor(my - 5), 30, 12);
      rect(floor(mx - 10), floor(my - 10), 20, 6);
      fill(70, 65, 55, 150);
      rect(floor(mx - 8), floor(my + 2), 12, 4);
      // Help text glow
      if (dist(state.player.x, state.player.y, WORLD.islandCX + WORLD.islandRX - 100, WORLD.islandCY + 20) < 70) {
        fill(255, 200, 100, 60 + sin(frameCount * 0.06) * 30);
        textSize(11); textAlign(CENTER, CENTER);
        text('Someone is trapped...', floor(mx), floor(my - 18));
        textAlign(LEFT, TOP);
      }
    }
  }
}

// ─── HARVEST ARC PROJECTILES ────────────────────────────────────────────
// Items arc from harvest position toward HUD resource counter, then pulse it
let _harvestArcs = [];

function spawnHarvestArc(sx, sy, label, col, hudKey) {
  // Target: top-left HUD resource area (approximate position of the resource text)
  let tx = 80, ty = 38;
  // Offset ty based on which resource
  let keyOffsets = { seeds: 0, harvest: 11, wood: 22, stone: 33, crystals: 44, gold: 55, fish: 66 };
  if (keyOffsets[hudKey] !== undefined) ty += keyOffsets[hudKey];
  _harvestArcs.push({
    x: sx, y: sy, sx: sx, sy: sy, tx: tx, ty: ty,
    life: 40, maxLife: 40,
    label: label, col: col, hudKey: hudKey,
    sparkles: []
  });
}

function updateHarvestArcs(dt) {
  for (let i = _harvestArcs.length - 1; i >= 0; i--) {
    let a = _harvestArcs[i];
    a.life -= dt;
    let t = 1 - (a.life / a.maxLife);
    // Ease-in-out cubic
    let ease = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
    // Arc with upward bulge
    let midX = (a.sx + a.tx) / 2;
    let midY = min(a.sy, a.ty) - 80;
    // Quadratic bezier interpolation
    let u = 1 - ease;
    a.x = u * u * a.sx + 2 * u * ease * midX + ease * ease * a.tx;
    a.y = u * u * a.sy + 2 * u * ease * midY + ease * ease * a.ty;
    // Spawn sparkle trail
    if (a.life % 6 < dt && a.sparkles.length < 3) {
      a.sparkles.push({ x: a.x, y: a.y, life: 18 });
    }
    // Update sparkles
    for (let j = a.sparkles.length - 1; j >= 0; j--) {
      a.sparkles[j].life -= dt;
      if (a.sparkles[j].life <= 0) a.sparkles.splice(j, 1);
    }
    if (a.life <= 0) {
      // Trigger HUD pulse on arrival
      if (a.hudKey) hudFlash[a.hudKey] = { timer: 15, delta: 1 };
      _harvestArcs.splice(i, 1);
    }
  }
}

function drawHarvestArcs() {
  for (let i = 0; i < _harvestArcs.length; i++) {
    let a = _harvestArcs[i];
    let alpha = map(a.life, 0, a.maxLife, 80, 255);
    let c = color(a.col);
    // Draw sparkle trail
    for (let j = 0; j < a.sparkles.length; j++) {
      let sp = a.sparkles[j];
      let sa = (sp.life / 18) * 200;
      fill(255, 240, 180, sa);
      noStroke();
      let sz = 1 + (sp.life / 18) * 2;
      rect(floor(sp.x) - 1, floor(sp.y) - 1, sz, sz);
    }
    // Draw the item dot
    fill(red(c), green(c), blue(c), alpha);
    noStroke();
    rect(floor(a.x) - 2, floor(a.y) - 2, 5, 5);
    // Label fades as it travels
    if (a.life > a.maxLife * 0.6) {
      let la = map(a.life, a.maxLife * 0.6, a.maxLife, 0, 255);
      fill(red(c), green(c), blue(c), la);
      textSize(11);
      textAlign(CENTER, BOTTOM);
      text(a.label, floor(a.x), floor(a.y) - 5);
      textAlign(LEFT, TOP);
    }
  }
}

// ─── CODEX DISCOVERY DELIGHT ────────────────────────────────────────────
// Track newly discovered codex entries for gold flash + NEW badge
let _codexNewEntries = {}; // { 'fish:sardine': timestamp, ... }

function markCodexDiscovery(category, key) {
  let id = category + ':' + key;
  if (!_codexNewEntries[id]) {
    _codexNewEntries[id] = frameCount;
    if (snd) snd.playSFX('build'); // quill-scratch substitute (closest SFX)
  }
}

function isCodexEntryNew(category, key) {
  let id = category + ':' + key;
  let fc = _codexNewEntries[id];
  if (!fc) return false;
  // NEW badge lasts 180 frames (~3 seconds at 60fps)
  if (frameCount - fc < 180) return true;
  return false;
}

// Patched entry drawer that adds gold flash and NEW badge
function _drawNatEntryWithDiscovery(x, y, w, label, rarity, desc, countStr, discovered, category, key) {
  let isNew = discovered && isCodexEntryNew(category, key);
  let bg = discovered ? color(250, 245, 230, 220) : color(200, 195, 185, 140);
  // Gold flash for new entries
  if (isNew) {
    let flashT = (frameCount - _codexNewEntries[category + ':' + key]) / 180;
    let pulse = 0.5 + 0.5 * sin(flashT * PI * 6);
    bg = lerpColor(color(255, 220, 100, 240), color(250, 245, 230, 220), flashT);
  }
  fill(bg); noStroke(); rect(x, y, w, 42, 4);
  if (discovered) {
    fill(color(NAT_RARITY_COLORS[rarity] || '#aabbcc')); textSize(10); textAlign(LEFT, TOP);
    text(rarity, x + 6, y + 3);
    fill(60, 40, 20); textSize(9); textStyle(BOLD);
    text(label, x + 6, y + 12);
    textStyle(NORMAL); fill(90, 70, 45); textSize(10);
    text(desc, x + 6, y + 24, w - 60);
    if (countStr) { fill(100, 140, 80); textSize(10); textAlign(RIGHT, TOP); text(countStr, x + w - 6, y + 12); }
    // NEW badge
    if (isNew) {
      fill(255, 200, 40);
      textSize(10); textStyle(BOLD); textAlign(RIGHT, TOP);
      text('NEW!', x + w - 6, y + 3);
      textStyle(NORMAL);
    }
  } else {
    fill(140, 130, 110); textSize(9); textAlign(LEFT, TOP); textStyle(ITALIC);
    text('???', x + 6, y + 14);
    textStyle(NORMAL); textSize(10); fill(150, 140, 120);
    text('Not yet discovered', x + 6, y + 26);
  }
  textAlign(LEFT, TOP); textStyle(NORMAL);
}

// ─── FISH CATCH CARD ────────────────────────────────────────────────────
let _catchCard = null; // { name, rarity, rarityColor, weight, isNew, timer, maxTimer }

function showCatchCard(fishName, rarity, weight, isNew) {
  let rarityColor = NAT_RARITY_COLORS[rarity] || '#aabbcc';
  _catchCard = {
    name: fishName, rarity: rarity, rarityColor: rarityColor,
    weight: weight, isNew: isNew,
    timer: 90, maxTimer: 90 // 1.5 sec at 60fps
  };
}

function updateCatchCard(dt) {
  if (!_catchCard) return;
  _catchCard.timer -= dt;
  if (_catchCard.timer <= 0) _catchCard = null;
}

function drawCatchCard() {
  if (!_catchCard) return;
  let c = _catchCard;
  let t = 1 - (c.timer / c.maxTimer); // 0 to 1
  // Slide in from right (first 20%), hold, slide out (last 20%)
  let slideX = 0;
  if (t < 0.15) slideX = (1 - t / 0.15) * 200; // slide in
  else if (t > 0.8) slideX = ((t - 0.8) / 0.2) * 200; // slide out
  let cardW = 160, cardH = 60;
  let cx = width - cardW - 12 + slideX;
  let cy = height * 0.3;
  // Card background
  noStroke();
  fill(25, 20, 12, 230);
  rect(cx, cy, cardW, cardH, 5);
  // Rarity border
  let rc = color(c.rarityColor);
  stroke(red(rc), green(rc), blue(rc), 220);
  strokeWeight(2);
  noFill();
  rect(cx, cy, cardW, cardH, 5);
  noStroke();
  // Fish name
  fill(240, 230, 200);
  textSize(13); textStyle(BOLD);
  textAlign(CENTER, TOP);
  text(c.name, cx + cardW / 2, cy + 6);
  textStyle(NORMAL);
  // Rarity label
  fill(red(rc), green(rc), blue(rc));
  textSize(11);
  text(c.rarity, cx + cardW / 2, cy + 23);
  // Weight
  fill(180, 170, 150);
  textSize(11);
  text('Weight: ' + c.weight, cx + cardW / 2, cy + 35);
  // NEW badge
  if (c.isNew) {
    fill(255, 220, 60);
    textSize(9); textStyle(BOLD);
    text('NEW!', cx + cardW / 2, cy + 46);
    textStyle(NORMAL);
  }
  textAlign(LEFT, TOP);
}

// ─── TECH TREE UI (Y key) ──────────────────────────────────────────────────
let _techTreeScroll = 0;
let _techTreeHover = null;

function drawTechTreeUI() {
  if (!state.techTreeOpen) return;
  let pw = min(width - 40, 580), ph = min(height - 40, 420);
  let panX = width / 2 - pw / 2, panY = height / 2 - ph / 2;

  // Dim background
  noStroke(); fill(0, 0, 0, 180); rect(0, 0, width, height);

  // Panel
  drawParchmentPanel(panX, panY, pw, ph);

  // Title
  textFont('Cinzel, Georgia, serif'); fill(210, 180, 80); textAlign(CENTER, TOP); textSize(15);
  text('RESEARCH & TECHNOLOGY', width / 2, panY + 10); textFont('monospace');
  // Subtitle: current research
  textSize(9); fill(180, 160, 120);
  if (state.research && state.research.current) {
    let ct = TECH_TREE[state.research.current];
    let pct = floor((state.research.progress / ct.cost) * 100);
    text('Researching: ' + ct.name + ' (' + pct + '%)', width / 2, panY + 28);
  } else {
    text('No active research. Click a tech to begin.', width / 2, panY + 28);
  }
  // RP display
  textSize(9);
  fill(140, 180, 220);
  text('RP/day: ' + getResearchRate() + '  |  Total RP: ' + ((state.research && state.research.points) || 0), width / 2, panY + 40);

  // Draw branches
  let branchY = panY + 58;
  let branchH = 68;
  let nodeW = 88, nodeH = 48, gap = 10;
  _techTreeHover = null;

  for (let bi = 0; bi < TECH_BRANCHES.length; bi++) {
    let branch = TECH_BRANCHES[bi];
    let bCol = TECH_BRANCH_COLORS[branch];
    let by = branchY + bi * branchH;

    // Branch label
    fill(bCol[0], bCol[1], bCol[2], 200); textAlign(LEFT, TOP); textSize(9);
    text(TECH_BRANCH_NAMES[branch].toUpperCase(), panX + 8, by + 2);

    // Get techs in this branch sorted by tier
    let techs = [];
    for (let tid in TECH_TREE) {
      if (TECH_TREE[tid].branch === branch) techs.push({ id: tid, ...TECH_TREE[tid] });
    }
    techs.sort((a, b) => a.tier - b.tier);

    // Draw connector line
    let lineY = by + 30;
    stroke(bCol[0], bCol[1], bCol[2], 60); strokeWeight(1);
    let startNodeX = panX + 8 + 0 * (nodeW + gap) + nodeW / 2;
    let endNodeX = panX + 8 + (techs.length - 1) * (nodeW + gap) + nodeW / 2;
    line(startNodeX, lineY, endNodeX, lineY);
    noStroke();

    for (let ti = 0; ti < techs.length; ti++) {
      let tech = techs[ti];
      let tx = panX + 8 + ti * (nodeW + gap);
      let ty = by + 8;
      let completed = hasTech(tech.id);
      let available = canResearch(tech.id);
      let isCurrent = state.research && state.research.current === tech.id;
      let isHovered = mouseX >= tx && mouseX <= tx + nodeW && mouseY >= ty && mouseY <= ty + nodeH;

      if (isHovered) _techTreeHover = tech.id;

      // Node background
      if (completed) {
        fill(40, 80, 40, 220);
        stroke(80, 180, 80, 180);
      } else if (isCurrent) {
        fill(40, 50, 80, 220);
        stroke(100, 140, 220, 180);
      } else if (available) {
        fill(50, 42, 30, 220);
        stroke(bCol[0], bCol[1], bCol[2], 120);
      } else {
        fill(30, 25, 18, 200);
        stroke(60, 50, 40, 80);
      }
      strokeWeight(isHovered ? 1.5 : 0.8);
      rect(tx, ty, nodeW, nodeH, 3);
      noStroke();

      // Tech name
      textAlign(CENTER, TOP); textSize(8);
      if (completed) fill(120, 220, 120);
      else if (available) fill(200, 190, 160);
      else fill(100, 90, 70);
      text(tech.name, tx + nodeW / 2, ty + 3);

      // Cost or status
      textSize(7);
      if (completed) {
        fill(80, 180, 80);
        text('COMPLETE', tx + nodeW / 2, ty + 15);
      } else if (isCurrent) {
        fill(120, 160, 220);
        let rprog = (state.research && state.research.progress) || 0;
        let pct = floor((rprog / tech.cost) * 100);
        text(pct + '%', tx + nodeW / 2, ty + 15);
        // Progress bar
        fill(30, 35, 50); rect(tx + 4, ty + 25, nodeW - 8, 4, 1);
        fill(100, 140, 220); rect(tx + 4, ty + 25, (nodeW - 8) * (rprog / tech.cost), 4, 1);
      } else {
        fill(available ? color(180, 160, 120) : color(80, 70, 55));
        text(tech.cost + ' RP', tx + nodeW / 2, ty + 15);
      }

      // Desc on hover
      if (isHovered) {
        textSize(7); fill(180, 170, 140);
        text(tech.desc, tx + nodeW / 2, ty + 35);
      }

      // Capstone star
      if (tech.capstone) {
        fill(255, 220, 60, completed ? 255 : 80);
        textSize(10);
        text('\u2605', tx + nodeW - 8, ty + 2);
      }
    }
  }

  // Controls hint
  fill(120, 100, 70); textAlign(CENTER, TOP); textSize(9);
  text('Click to research  |  Y or ESC to close', width / 2, panY + ph - 18);
  textAlign(LEFT, TOP);
}

function handleTechTreeClick(mx, my) {
  if (!state.techTreeOpen) return false;
  let pw = min(width - 40, 580), ph = min(height - 40, 420);
  let panX = width / 2 - pw / 2, panY = height / 2 - ph / 2;
  let branchY = panY + 58, branchH = 68;
  let nodeW = 88, nodeH = 48, gap = 10;

  for (let bi = 0; bi < TECH_BRANCHES.length; bi++) {
    let branch = TECH_BRANCHES[bi];
    let by = branchY + bi * branchH;
    let techs = [];
    for (let tid in TECH_TREE) {
      if (TECH_TREE[tid].branch === branch) techs.push({ id: tid, ...TECH_TREE[tid] });
    }
    techs.sort((a, b) => a.tier - b.tier);

    for (let ti = 0; ti < techs.length; ti++) {
      let tech = techs[ti];
      let tx = panX + 8 + ti * (nodeW + gap);
      let ty = by + 8;
      if (mx >= tx && mx <= tx + nodeW && my >= ty && my <= ty + nodeH) {
        if (canResearch(tech.id)) {
          startResearch(tech.id);
          addFloatingText(width / 2, height * 0.25, 'Now researching: ' + tech.name, '#88ccff');
          return true;
        } else if (hasTech(tech.id)) {
          addFloatingText(width / 2, height * 0.25, tech.name + ' already complete!', '#88aa88');
          return true;
        } else {
          addFloatingText(width / 2, height * 0.25, 'Requires: ' + TECH_TREE[tech.requires].name, '#ff8866');
          return true;
        }
      }
    }
  }
  return false;
}

// ─── VICTORY SCREEN ────────────────────────────────────────────────────────
function drawVictoryScreen() {
  if (!state.victoryScreen) return;
  let vs = state.victoryScreen;
  vs.timer = (vs.timer || 0) + 1;
  let fadeIn = min(1, vs.timer / 60);

  // Full screen overlay
  noStroke();
  fill(0, 0, 0, fadeIn * 220);
  rect(0, 0, width, height);

  let titles = {
    domination: 'DOMINATION VICTORY',
    diplomatic: 'DIPLOMATIC VICTORY',
    economic: 'ECONOMIC VICTORY',
    research: 'RESEARCH VICTORY',
  };
  let descs = {
    domination: 'Through military might, you have conquered all rival nations.\nThe Mediterranean bows to your legions.',
    diplomatic: 'Through wisdom and goodwill, all nations call you friend.\nPeace reigns across the sea.',
    economic: 'Your golden treasury overflows, trade routes span the world.\nWealth is the truest power.',
    research: 'All four branches of knowledge mastered.\nYour civilization has reached enlightenment.',
  };
  let colors = {
    domination: [200, 60, 60],
    diplomatic: [60, 180, 120],
    economic: [220, 180, 40],
    research: [100, 160, 240],
  };
  let col = colors[vs.type] || [200, 200, 200];

  // Victory particles
  if (vs.timer % 3 === 0 && vs.timer < 300) {
    particles.push({
      x: random(width * 0.2, width * 0.8), y: height + 4,
      vx: random(-1.5, 1.5), vy: random(-4, -1.5),
      life: random(60, 120), maxLife: 120,
      type: 'burst', size: random(3, 7),
      r: col[0], g: col[1], b: col[2],
      world: false,
    });
  }

  push();
  let alpha = fadeIn * 255;

  // Title
  textAlign(CENTER, CENTER); textSize(22);
  fill(col[0], col[1], col[2], alpha);
  text(titles[vs.type] || 'VICTORY', width / 2, height * 0.25);

  // Decorative line
  stroke(col[0], col[1], col[2], alpha * 0.5); strokeWeight(1);
  line(width * 0.3, height * 0.32, width * 0.7, height * 0.32);
  noStroke();

  // Description
  textSize(11); fill(220, 210, 190, alpha);
  let descLines = (descs[vs.type] || '').split('\n');
  for (let i = 0; i < descLines.length; i++) {
    text(descLines[i], width / 2, height * 0.38 + i * 16);
  }

  // Stats
  textSize(10); fill(180, 170, 140, alpha);
  text('Days: ' + (vs.day || state.day), width / 2, height * 0.52);
  text('Island Level: ' + (state.islandLevel || 1), width / 2, height * 0.56);
  text('Gold Earned: ' + ((state.score && state.score.goldEarned) || 0), width / 2, height * 0.60);
  text('Techs Researched: ' + ((state.research && state.research.completed) || []).length + '/20', width / 2, height * 0.64);

  // Final score
  let score = (vs.day || 1) * 10 + (state.islandLevel || 1) * 50 + ((state.research && state.research.completed) || []).length * 25;
  textSize(14); fill(col[0], col[1], col[2], alpha);
  text('FINAL SCORE: ' + score, width / 2, height * 0.72);

  // Options
  if (vs.timer > 120) {
    textSize(10); fill(180, 170, 140, min(255, (vs.timer - 120) * 4));
    text('Press ENTER to continue playing  |  Press N for New Game+', width / 2, height * 0.82);
  }
  pop();
  textAlign(LEFT, TOP);
}

// ─── VICTORY PROGRESS HUD (4 icons below minimap) ──────────────────────────
function drawVictoryProgressHUD() {
  if (photoMode || screenshotMode) return;
  if (dialogState.active) return;
  if (!state.nations || Object.keys(state.nations).length === 0) return;
  if (state.victoryAchieved) return;

  let prog = getVictoryProgress();
  let mmW = 110, mmX = width - mmW - 16, mmY = 90;
  let iconSize = 18, gap = 4;
  let totalW = 4 * iconSize + 3 * gap;
  let startX = mmX + (mmW - totalW) / 2;

  // Player proximity fade
  let _psx = w2sX(state.player.x), _psy = w2sY(state.player.y);
  let _vhFade = (_psx > width * 0.6 && _psy < height * 0.3) ? 0.25 : 0.85;
  drawingContext.globalAlpha = _vhFade;

  let icons = [
    { label: 'DOM', prog: prog.domination, col: [200, 60, 60], symbol: '\u2694' },
    { label: 'DIP', prog: prog.diplomatic, col: [60, 180, 120], symbol: '\u2764' },
    { label: 'ECO', prog: prog.economic, col: [220, 180, 40], symbol: '\u25C9' },
    { label: 'RES', prog: prog.research, col: [100, 160, 240], symbol: '\u2605' },
  ];

  for (let i = 0; i < icons.length; i++) {
    let ic = icons[i];
    let ix = startX + i * (iconSize + gap);
    let iy = mmY;

    // Background
    noStroke(); fill(20, 18, 14, 200);
    rect(ix, iy, iconSize, iconSize + 8, 2);

    // Fill meter
    let fillH = floor(iconSize * ic.prog);
    fill(ic.col[0], ic.col[1], ic.col[2], 80);
    rect(ix + 1, iy + iconSize - fillH, iconSize - 2, fillH, 1);

    // Border
    stroke(ic.col[0], ic.col[1], ic.col[2], ic.prog >= 1 ? 200 : 60);
    strokeWeight(0.8); noFill();
    rect(ix, iy, iconSize, iconSize, 2);
    noStroke();

    // Symbol
    fill(ic.col[0], ic.col[1], ic.col[2], 180);
    textAlign(CENTER, CENTER); textSize(10);
    text(ic.symbol, ix + iconSize / 2, iy + iconSize / 2);

    // Label
    fill(120, 110, 90, 160); textSize(6); textAlign(CENTER, TOP);
    text(ic.label, ix + iconSize / 2, iy + iconSize + 1);
  }

  drawingContext.globalAlpha = 1.0;
  textAlign(LEFT, TOP);
}

// ─── COMPASS HUD BAR (Skyrim-style) ───────────────────────────────────────
let worldMapOpen = false;

function _getCompassIslands() {
  let islands = [
    { name: 'Home', x: WORLD.islandCX, y: WORLD.islandCY, col: '#88cc88', icon: '\u2302' },
    { name: 'Arena', x: state.adventure.isleX, y: state.adventure.isleY, col: '#cc8888', icon: '\u2694' },
    { name: state.conquest.colonized ? 'Colony' : 'Terra Nova', x: state.conquest.isleX, y: state.conquest.isleY, col: state.conquest.colonized ? '#88cc88' : '#88aacc', icon: '\u2694' },
    { name: 'Wreck Beach', x: WRECK.cx, y: WRECK.cy, col: '#ccaa66', icon: '\u2693' },
    { name: 'Vulcan', x: state.vulcan.isleX, y: state.vulcan.isleY, col: '#ff5533', icon: '\u2740' },
    { name: 'Hyperborea', x: state.hyperborea.isleX, y: state.hyperborea.isleY, col: '#88ddff', icon: '\u2744' },
    { name: 'Plenty', x: state.plenty.isleX, y: state.plenty.isleY, col: '#44cc44', icon: '\u2618' },
    { name: 'Necropolis', x: state.necropolis.isleX, y: state.necropolis.isleY, col: '#9944cc', icon: '\u2620' },
  ];
  let _nKeys = Object.keys(state.nations || {});
  for (let _nk of _nKeys) {
    let _nv = state.nations[_nk];
    if (_nv && !_nv.defeated) {
      islands.push({ name: getNationName(_nk), x: _nv.isleX, y: _nv.isleY, col: getNationStanceColor(_nv), icon: '\u2694', nation: true });
    }
  }
  return islands;
}

function drawCompassHUD() {
  if (photoMode || screenshotMode) return;
  if (!state.rowing || !state.rowing.active) return;
  let r = state.rowing;
  let px = r.x, py = r.y;
  let facing = r.angle || 0;
  let barW = min(width * 0.6, 500);
  let barH = 24;
  let barX = (width - barW) / 2;
  let barY = 6;
  push();
  fill(15, 12, 8, 180); noStroke();
  rect(barX, barY, barW, barH, 4);
  stroke(120, 100, 70, 100); strokeWeight(0.5); noFill();
  rect(barX, barY, barW, barH, 4); noStroke();
  fill(255, 220, 140, 200);
  triangle(barX + barW / 2 - 3, barY + barH, barX + barW / 2 + 3, barY + barH, barX + barW / 2, barY + barH - 4);
  let dirs = [
    { label: 'N', ang: -HALF_PI }, { label: 'NE', ang: -QUARTER_PI },
    { label: 'E', ang: 0 }, { label: 'SE', ang: QUARTER_PI },
    { label: 'S', ang: HALF_PI }, { label: 'SW', ang: HALF_PI + QUARTER_PI },
    { label: 'W', ang: PI }, { label: 'NW', ang: -(HALF_PI + QUARTER_PI) },
  ];
  for (let dir of dirs) {
    let diff = dir.ang - facing;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    let xPos = barX + barW / 2 + (diff / PI) * (barW / 2);
    if (xPos < barX + 4 || xPos > barX + barW - 4) continue;
    let isMajor = dir.label.length === 1;
    fill(isMajor ? color(255, 220, 140, 220) : color(180, 160, 120, 140));
    textSize(isMajor ? 11 : 8); textAlign(CENTER, CENTER);
    text(dir.label, xPos, barY + barH / 2);
    if (isMajor) { fill(255, 220, 140, 60); rect(xPos - 0.5, barY + 2, 1, barH - 4); }
  }
  let islands = _getCompassIslands();
  for (let isle of islands) {
    let dx = isle.x - px, dy = isle.y - py;
    let ang = atan2(dy, dx);
    let diff = ang - facing;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    let xPos = barX + barW / 2 + (diff / PI) * (barW / 2);
    if (xPos < barX + 6 || xPos > barX + barW - 6) continue;
    let d = sqrt(dx * dx + dy * dy);
    let alpha = d < 400 ? 80 : 200;
    let c = color(isle.col);
    fill(red(c), green(c), blue(c), alpha);
    textSize(10); textAlign(CENTER, CENTER);
    text(isle.icon, xPos, barY + barH / 2 - 1);
    fill(red(c), green(c), blue(c), alpha * 0.6);
    rect(xPos - 1, barY + barH - 3, 2, 2);
  }
  textAlign(LEFT, TOP); pop();
}

// ─── WORLD MAP (press M) ──────────────────────────────────────────────────
function drawWorldMap() {
  if (!worldMapOpen) return;
  let mapW = min(width - 40, 700), mapH = min(height - 40, 500);
  let mapX = (width - mapW) / 2, mapY = (height - mapH) / 2;
  push();
  fill(0, 0, 0, 180); rect(0, 0, width, height);
  fill(20, 18, 14, 240); stroke(140, 120, 80, 180); strokeWeight(2);
  rect(mapX, mapY, mapW, mapH, 8); noStroke();
  fill(220, 200, 160); textSize(16); textAlign(CENTER, TOP);
  text('MARE NOSTRUM', width / 2, mapY + 10);
  fill(160, 140, 110); textSize(10);
  text('[M] Close', width / 2, mapY + 30);
  let areaX = mapX + 20, areaY = mapY + 48, areaW = mapW - 40, areaH = mapH - 68;
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(areaX, areaY, areaW, areaH);
  drawingContext.clip();
  fill(25, 45, 70, 255); rect(areaX, areaY, areaW, areaH);
  let allIslands = _getCompassIslands();
  let minWX = WORLD.islandCX, maxWX = WORLD.islandCX, minWY = WORLD.islandCY, maxWY = WORLD.islandCY;
  for (let isle of allIslands) {
    minWX = min(minWX, isle.x); maxWX = max(maxWX, isle.x);
    minWY = min(minWY, isle.y); maxWY = max(maxWY, isle.y);
  }
  let rangeX = max(maxWX - minWX, 2000), rangeY = max(maxWY - minWY, 2000);
  let _mapScale = min(areaW / (rangeX * 1.3), areaH / (rangeY * 1.3));
  let midWX = (minWX + maxWX) / 2, midWY = (minWY + maxWY) / 2;
  function mapPX(wx) { return areaX + areaW / 2 + (wx - midWX) * _mapScale; }
  function mapPY(wy) { return areaY + areaH / 2 + (wy - midWY) * _mapScale; }
  stroke(40, 60, 85, 40); strokeWeight(0.5);
  for (let gx = floor(minWX / 1000) * 1000; gx <= maxWX + 1000; gx += 1000) {
    let sx = mapPX(gx);
    if (sx > areaX && sx < areaX + areaW) line(sx, areaY, sx, areaY + areaH);
  }
  for (let gy = floor(minWY / 1000) * 1000; gy <= maxWY + 1000; gy += 1000) {
    let sy = mapPY(gy);
    if (sy > areaY && sy < areaY + areaH) line(areaX, sy, areaX + areaW, sy);
  }
  noStroke();
  let _disc = _getDiscoveredIslandKeys();
  if (state.tradeRoutes && state.tradeRoutes.length > 0) {
    for (let route of state.tradeRoutes) {
      if (!route.active) continue;
      let fromX = mapPX(route.from ? route.from.x : WORLD.islandCX);
      let fromY = mapPY(route.from ? route.from.y : WORLD.islandCY);
      let toX = mapPX(route.to ? route.to.x : state.conquest.isleX);
      let toY = mapPY(route.to ? route.to.y : state.conquest.isleY);
      let isRaided = route.raided && route.raidTimer > 0;
      stroke(isRaided ? color(255, 80, 60, 140) : color(220, 200, 100, 100)); strokeWeight(1.5);
      drawingContext.setLineDash([4, 4]);
      line(fromX, fromY, toX, toY);
      drawingContext.setLineDash([]); noStroke();
      let prog = (frameCount % 200) / 200;
      fill(isRaided ? color(255, 80, 60, 220) : color(220, 200, 100, 200));
      ellipse(lerp(fromX, toX, prog), lerp(fromY, toY, prog), 4, 4);
      if (isRaided) {
        let raidProg = 0.5;
        if (route.shipX && route.from) raidProg = constrain(dist(route.from.x, route.from.y, route.shipX, route.shipY) / max(1, dist(route.from.x, route.from.y, route.to.x, route.to.y)), 0, 1);
        let skX = lerp(fromX, toX, raidProg), skY = lerp(fromY, toY, raidProg);
        fill(255, 60, 50, 200); textSize(10); textAlign(CENTER, CENTER);
        text('\u2620', skX, skY);
        textAlign(LEFT, TOP);
      }
    }
  }
  for (let isle of allIslands) {
    let ix = mapPX(isle.x), iy = mapPY(isle.y);
    let discovered = _disc.indexOf(isle.name) >= 0;
    let c = color(isle.col);
    if (!discovered) {
      fill(60, 55, 50, 100); ellipse(ix, iy, 12, 8);
      fill(120, 110, 90, 80); textSize(7); textAlign(CENTER, TOP);
      text('???', ix, iy + 6); continue;
    }
    let isHome = isle.name === 'Home';
    let sz = isHome ? 18 : 12;
    fill(red(c), green(c), blue(c), 60); ellipse(ix, iy, sz + 6, (sz + 6) * 0.65);
    fill(red(c), green(c), blue(c), 180); ellipse(ix, iy, sz, sz * 0.65);
    fill(255, 255, 255, 200); textSize(isHome ? 11 : 9); textAlign(CENTER, CENTER);
    text(isle.icon, ix, iy - 1);
    fill(red(c), green(c), blue(c), 220); textSize(8); textAlign(CENTER, TOP);
    text(isle.name, ix, iy + sz * 0.4 + 2);
    if (isle.nation) { fill(red(c), green(c), blue(c), 200); ellipse(ix + sz * 0.5 + 4, iy - 2, 5, 5); }
  }
  if (state.rowing && state.rowing.active) {
    let plX = mapPX(state.rowing.x), plY = mapPY(state.rowing.y);
    let pulse = 3 + sin(frameCount * 0.08) * 1.5;
    fill(255, 220, 80, 100); ellipse(plX, plY, pulse * 2, pulse * 2);
    fill(255, 240, 140, 255); ellipse(plX, plY, 5, 5);
    fill(255, 255, 200, 200); textSize(7); textAlign(CENTER, TOP);
    text('YOU', plX, plY + 5);
  } else {
    let plX = mapPX(WORLD.islandCX), plY = mapPY(WORLD.islandCY);
    let pulse = 2 + sin(frameCount * 0.08) * 1;
    fill(255, 220, 80, 150); ellipse(plX, plY + 8, pulse * 2, pulse * 2);
  }
  drawingContext.restore();
  fill(120, 110, 90, 160); textSize(8); textAlign(LEFT, TOP);
  text('\u262E Friendly   \u2620 Dangerous   \u2694 Combat   --- Trade Route', mapX + 20, mapY + mapH - 16);
  textAlign(LEFT, TOP); pop();
}

function _getDiscoveredIslandKeys() {
  let keys = ['Home', 'Arena'];
  if (state.conquest.phase !== 'unexplored' || state.conquest.colonized) keys.push(state.conquest.colonized ? 'Colony' : 'Terra Nova');
  keys.push('Wreck Beach');
  if (state.vulcan.phase !== 'unexplored') keys.push('Vulcan');
  if (state.hyperborea.phase !== 'unexplored') keys.push('Hyperborea');
  if (state.plenty.phase !== 'unexplored') keys.push('Plenty');
  if (state.necropolis.phase !== 'unexplored') keys.push('Necropolis');
  let _nKeys = Object.keys(state.nations || {});
  for (let _nk of _nKeys) {
    let _nv = state.nations[_nk];
    if (_nv && !_nv.defeated) keys.push(getNationName(_nk));
  }
  return keys;
}
