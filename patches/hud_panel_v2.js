// ═══════════════════════════════════════════════════════════════════════
// HUD PANEL V2 — complete rebuild of the top-left panel. ZERO core edits.
//
// The legacy panel block inside drawHUD() positions ~20 lines with chained
// ad-hoc offsets — text overlaps (rank over castrum), and SHIP/CROP lines
// spill outside the panel. It cannot be fixed surgically, and drawHUD also
// owns the minimap/quest tracker/pause overlay, so we don't replace it.
//
// Strategy: wrap drawHUD; after it runs, draw a REDESIGNED, OPAQUE panel
// over the legacy panel's footprint. Ours shows a superset of the same
// info in a measured sectioned layout — every row advances a cursor, the
// panel height is computed from content, nothing can overlap or overflow.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  const BRONZE = [176, 141, 87], PARCH = [232, 213, 174], MUTED = [196, 178, 142];

  function px(u, n, mn) { return Math.max(mn || 1, Math.floor(n * u)); }

  // ─── tiny procedural icons (12px box, centered at x+6,y+6) ─────────────
  function icon(key, x, y) {
    push(); translate(x + 6, y + 6); noStroke();
    const I = {
      gold() { fill(150,110,40); ellipse(0.5,0.5,11,11); fill(227,179,65); ellipse(0,0,11,11); fill(255,225,140); ellipse(-1.5,-1.5,4,4); },
      seeds() { fill(190,150,90); ellipse(-3,2,5,6); ellipse(3,1,5,6); ellipse(0,-3,5,6); },
      harvest() { stroke(212,180,90); strokeWeight(1.6); line(0,6,0,-3); noStroke(); fill(228,198,110); ellipse(-2.5,-2,4,3); ellipse(2.5,-2,4,3); ellipse(-2.5,-5,4,3); ellipse(2.5,-5,4,3); },
      wood() { push(); rotate(-0.5); fill(120,84,52); rect(-6,-2.5,12,5,2); fill(168,124,80); ellipse(6,0,4.5,5); fill(120,84,52); ellipse(6,0,2,2.4); pop(); },
      stone() { fill(150,148,140); beginShape(); vertex(-5,4); vertex(-6,-1); vertex(-2,-5); vertex(4,-4); vertex(6,1); vertex(3,5); endShape(CLOSE); fill(190,188,180); triangle(-2,-5,4,-4,0,0); },
      crystals() { fill(68,220,170); beginShape(); vertex(0,-6); vertex(4,-1); vertex(2,5); vertex(-2,5); vertex(-4,-1); endShape(CLOSE); fill(160,255,220,200); triangle(0,-6,4,-1,0,1); },
      fish() { fill(110,165,210); ellipse(-1,0,10,6); triangle(4,0,8,-3.5,8,3.5); fill(20,35,50); ellipse(-3.5,-0.8,1.6,1.6); },
      iron() { fill(120,130,145); beginShape(); vertex(-5,3); vertex(-4,-3); vertex(1,-5); vertex(5,-1); vertex(4,4); endShape(CLOSE); fill(170,180,195); triangle(-4,-3,1,-5,0,-1); },
      hide() { fill(186,140,95); beginShape(); vertex(-5,-4); vertex(5,-4); vertex(6,2); vertex(2,5); vertex(-2,5); vertex(-6,2); endShape(CLOSE); },
      relic() { fill(205,150,210); rect(-4,-2,8,7,1); fill(230,190,235); triangle(-5,-2,5,-2,0,-7); },
      bone() { stroke(235,225,190); strokeWeight(2.5); line(-4,3,4,-3); noStroke(); fill(245,238,210); ellipse(-4.5,2,4,4); ellipse(-2.8,4.4,4,4); ellipse(4.5,-2,4,4); ellipse(2.8,-4.4,4,4); },
      meals() { fill(210,170,110); arc(0,1,12,9,0,PI,CHORD); fill(232,213,174,90); ellipse(0,-1,9,3); },
      wine() { fill(150,60,90); ellipse(0,-1,8,7); stroke(180,160,130); strokeWeight(1.4); line(0,2,0,5); noStroke(); },
      oil() { fill(160,170,70); ellipse(0,1,8,9); rect(-1.5,-6,3,4,1); },
      food() { fill(90,160,90); arc(0,0,12,10,0,PI,CHORD); fill(140,200,120); ellipse(-2,-2,4,3); ellipse(2.5,-1.5,4,3); },
      legion() { fill(180,60,50); beginShape(); vertex(-4,-5); vertex(4,-5); vertex(4,2); vertex(0,6); vertex(-4,2); endShape(CLOSE); fill(227,179,65); rect(-0.8,-5,1.6,11); },
    };
    (I[key] || function(){ fill(200,185,150); ellipse(0,0,8,8); })();
    pop();
  }

  function drawPanelV2() {
    if (photoMode || screenshotMode) return;
    if (typeof dialogState !== 'undefined' && dialogState && dialogState.active) return;
    if (state.hudMinimized) return;

    const u = Math.min(width / 1280, height / 800);
    const margin = px(u, 16, 12);
    const W = Math.max(195, Math.floor(210 * u));
    const X = margin + 10;
    const X2 = margin + W - 12;
    const lh = px(u, 15, 13);          // row height
    const sTxt = px(u, 9, 8), nTxt = px(u, 11, 10), bTxt = px(u, 13, 12);

    // fade when player walks under the panel (kept from legacy)
    const psx = w2sX(state.player.x), psy = w2sY(state.player.y);
    const fade = (psx < width * 0.35 && psy < height * 0.45) ? 0.35 : 1.0;

    // ── estimate legacy footprint so we fully cover it ──
    const l12 = px(u, 12, 11);
    let legacy = Math.floor(195 * u);
    [state.ironOre, state.rareHide, state.ancientRelic, state.titanBone,
     state.meals, state.wine, state.oil].forEach((v) => { if (v > 0) legacy += l12; });
    if ((state.islandLevel || 1) >= 3 && state._dailyFoodNeeded > 0) legacy += l12;
    if (state.blessing && state.blessing.type) legacy += l12;
    if (state.quest) legacy += l12;
    if (state.weather && state.weather.type !== 'clear') legacy += l12;
    if ((state.daysSinceRain || 0) >= 3) legacy += l12;
    legacy += l12 + Math.floor(l12 * 2.5);
    if (state.quarrier && state.quarrier.unlocked) legacy += Math.floor(14 * u);
    legacy = Math.min(legacy, height - 80);
    legacy += l12 * 7; // overflow lines legacy spills below its own panel

    // ─────────────────────────────────────────────────────────────────────
    // measure + draw in one pass onto an offset cursor; we first compute
    // height by a dry run of the same row plan, then draw.
    // ─────────────────────────────────────────────────────────────────────
    const rows = [];
    const R = (fn, h) => rows.push({ fn, h });
    const div = () => R((y) => {
      stroke(BRONZE[0], BRONZE[1], BRONZE[2], 110); strokeWeight(1);
      line(X, y + 4, X2, y + 4);
      noStroke(); fill(BRONZE[0], BRONZE[1], BRONZE[2], 160);
      push(); translate((X + X2) / 2, y + 4); rotate(PI / 4); rectMode(CENTER); rect(0, 0, 4, 4); rectMode(CORNER); pop();
    }, 9);

    const textRow = (label, value, vCol, ic, sub) => R((y) => {
      if (ic) icon(ic, X, y);
      fill(MUTED[0], MUTED[1], MUTED[2], 230); textSize(sTxt + 1); textAlign(LEFT, TOP);
      text(label, X + (ic ? 17 : 0), y + 1);
      if (sub) {
        const lw = textWidth(label); // measure at LABEL size before shrinking
        fill(MUTED[0], MUTED[1], MUTED[2], 150); textSize(sTxt - 1);
        text(sub, X + (ic ? 17 : 0) + lw + 9, y + 2.5);
      }
      if (value !== null && value !== undefined) {
        fill(vCol[0], vCol[1], vCol[2]); textSize(nTxt); textAlign(RIGHT, TOP);
        text(String(value), X2, y);
        textAlign(LEFT, TOP);
      }
    }, lh);

    // ── header: faction + rank ──
    const rankTitle = state.islandLevel >= 25 ? 'IMPERATOR' : state.islandLevel >= 20 ? 'CONSUL'
      : state.islandLevel >= 15 ? 'SENATOR' : state.islandLevel >= 10 ? 'PRAETOR'
      : state.islandLevel >= 5 ? 'AEDILIS' : 'CITIZEN';
    R((y) => {
      if (typeof drawFactionEmblem === 'function' && state.faction) drawFactionEmblem(state.faction, X - 2, y - 1, px(u, 18, 16));
      fill(227, 179, 65); textSize(bTxt); textAlign(LEFT, TOP);
      text(rankTitle, X + px(u, 22, 19), y);
      fill(MUTED[0], MUTED[1], MUTED[2]); textSize(sTxt); textAlign(RIGHT, TOP);
      let rep = '';
      if (typeof getReputationTitle === 'function') rep = getReputationTitle().toUpperCase() + ' · ';
      text(rep + 'LV.' + (state.islandLevel || 1), X2, y + 2);
      textAlign(LEFT, TOP);
    }, lh + 2);

    // ── solar + hp ──
    R((y) => {
      const bw = W - 24 - px(u, 42, 38);
      drawBarHUD(X, y + 2, bw, px(u, 9, 8), state.maxSolar > 0 ? state.solar / state.maxSolar : 0, C.solarBright, C.solarGold, 'SOLAR');
    }, lh);
    if (state.player.hp < state.player.maxHp) {
      R((y) => {
        const bw = W - 24 - px(u, 42, 38);
        drawBarHUD(X, y + 1, bw, px(u, 7, 6), Math.max(0, state.player.hp / state.player.maxHp), '#c83228', '#3c2820', 'HP');
      }, lh - 3);
    }
    div();

    // ── resources ──
    textRow('Seeds', state.seeds, [240, 232, 210], 'seeds');
    textRow('Harvest', state.harvest, [240, 232, 210], 'harvest');
    textRow('Wood', state.wood, [205, 160, 105], 'wood');
    textRow('Stone', state.stone, [195, 193, 185], 'stone');
    textRow('Crystals', state.crystals, [120, 235, 195], 'crystals');
    // gold + upkeep/income
    R((y) => {
      icon('gold', X, y);
      fill(MUTED[0], MUTED[1], MUTED[2], 230); textSize(sTxt + 1); textAlign(LEFT, TOP);
      text('Gold', X + 17, y + 1);
      let up = 0, inc = 0;
      if (typeof calculateBuildingMaintenance === 'function') up += calculateBuildingMaintenance();
      if (typeof getArmyUpkeep === 'function') up += getArmyUpkeep();
      if (typeof calculateDailyTradeIncome === 'function') inc += calculateDailyTradeIncome();
      if (state.conquest && state.conquest.colonyIncome) inc += state.conquest.colonyIncome;
      let fx = X + 17 + textWidth('Gold') + 8;
      textSize(sTxt - 1);
      if (up > 0) { fill(220, 110, 90); text('−' + up + '/d', fx, y + 2.5); fx += textWidth('−' + up + '/d') + 5; }
      if (inc > 0) { fill(120, 210, 130); text('+' + inc + '/d', fx, y + 2.5); }
      fill(245, 205, 95); textSize(nTxt); textAlign(RIGHT, TOP);
      text(String(state.gold || 0), X2, y);
      textAlign(LEFT, TOP);
    }, lh);
    if (state.fish > 0) textRow('Fish', state.fish, [140, 195, 240], 'fish');
    if (state.ironOre > 0) textRow('Iron', state.ironOre, [185, 195, 210], 'iron');
    if (state.rareHide > 0) textRow('Hide', state.rareHide, [215, 175, 135], 'hide');
    if (state.ancientRelic > 0) textRow('Relics', state.ancientRelic, [225, 165, 230], 'relic');
    if (state.titanBone > 0) textRow('Bone', state.titanBone, [245, 232, 185], 'bone');
    if (state.meals > 0) textRow('Meals', state.meals, [230, 195, 120], 'meals');
    if (state.wine > 0) textRow('Wine', state.wine, [205, 110, 145], 'wine');
    if (state.oil > 0) textRow('Oil', state.oil, [185, 195, 105], 'oil');
    if ((state.islandLevel || 1) >= 3 && state._dailyFoodNeeded > 0) {
      const needed = state._dailyFoodNeeded;
      const total = (state.harvest || 0) + (state.fish || 0) + (state.meals || 0);
      const days = needed > 0 ? Math.floor(total / needed) : 99;
      const colF = days >= 5 ? [120, 200, 120] : days >= 2 ? [230, 195, 90] : [240, 110, 90];
      const mill = state.buildings && state.buildings.some((b) => b.type === 'windmill' && !b.ruined);
      textRow('Food', '−' + needed + '/d · ' + days + 'd', colF, 'food', mill ? 'mill ×2' : null);
    }
    div();

    // ── legion ──
    {
      let armyCount = 0, hasArmy = false;
      if (state.legia) {
        armyCount = (state.legia.soldiers || 0) + (state.legia.army ? state.legia.army.length : 0);
        if (state.legia.units) armyCount += state.legia.units.reduce((s, q) => s + (q.count || 1), 0);
        hasArmy = armyCount > 0 || state.legia.castrumLevel > 0;
      }
      if (hasArmy) {
        const cap = typeof getArmyCap === 'function' ? getArmyCap() : 30;
        let sub = state.legia.castrumLevel > 0 ? 'Castrum Lv.' + state.legia.castrumLevel : null;
        if (state._controlledIslands && state._controlledIslands.length > 0) {
          sub = (sub ? sub + ' · ' : '') + 'Isles ' + state._controlledIslands.length;
        }
        textRow('Legion', armyCount + '/' + cap, [225, 200, 160], 'legion', sub);
      }
    }

    // ── companions / workers gauges ──
    R((y) => {
      const bw = Math.floor((W - 24) * 0.52);
      const bh = px(u, 8, 7);
      drawBarHUD(X, y + 2, bw, bh, (state.companion ? state.companion.energy : 0) / 100, C.companionG, C.companionD, 'CRITTER');
    }, lh - 1);
    R((y) => {
      const bw = Math.floor((W - 24) * 0.52);
      const bh = px(u, 8, 7);
      drawBarHUD(X, y + 2, bw, bh, (state.woodcutter ? state.woodcutter.energy : 0) / 100, '#A0724A', '#4A3520', 'CUTTER');
    }, lh - 1);
    if (state.quarrier && state.quarrier.unlocked) {
      R((y) => {
        const bw = Math.floor((W - 24) * 0.52);
        drawBarHUD(X, y + 2, bw, px(u, 8, 7), state.quarrier.energy / 100, '#8A8AA0', '#3A3A48', 'QUARRIER');
      }, lh - 1);
    }

    // ── hero levels ──
    R((y) => {
      const lv = state.player.level || 1, xp = Math.floor(state.player.xp || 0), need = lv * 100;
      fill(MUTED[0], MUTED[1], MUTED[2], 230); textSize(sTxt + 1); textAlign(LEFT, TOP);
      const hlbl = 'Hero LV.' + lv;
      text(hlbl, X, y + 1);
      const bx = X + textWidth(hlbl) + 10, bw = X2 - bx - px(u, 52, 46);
      drawBarHUD(bx, y + 3, Math.max(40, bw), px(u, 5, 4), Math.min(1, xp / need), '#caa84a', '#3a3022', '');
      fill(MUTED[0], MUTED[1], MUTED[2], 170); textSize(sTxt - 1); textAlign(RIGHT, TOP);
      text(xp + '/' + need, X2, y + 1.5);
      textAlign(LEFT, TOP);
    }, lh - 1);
    if (state.companionPets && state.companionPets.centurion) {
      R((y) => {
        const cp = state.companionPets.centurion;
        const lead = (typeof getFactionTerms === 'function') ? (getFactionTerms().leader || 'Centurion') : 'Centurion';
        const need = (typeof companionXpForLevel === 'function') ? companionXpForLevel(cp.level) : cp.level * 10;
        fill(205, 180, 90, 230); textSize(sTxt + 1); textAlign(LEFT, TOP);
        const clbl = lead + ' Lv.' + cp.level;
        text(clbl, X, y + 1);
        const bx = X + textWidth(clbl) + 10, bw = X2 - bx - px(u, 52, 46);
        drawBarHUD(bx, y + 3, Math.max(40, bw), px(u, 5, 4), Math.min(1, (cp.xp || 0) / need), '#b08d57', '#3a3022', '');
        fill(MUTED[0], MUTED[1], MUTED[2], 170); textSize(sTxt - 1); textAlign(RIGHT, TOP);
        text(Math.floor(cp.xp || 0) + '/' + need, X2, y + 1.5);
        textAlign(LEFT, TOP);
      }, lh - 1);
    }
    if ((state.player.skillPoints || 0) > 0) {
      R((y) => {
        fill(255, 220, 90); textSize(sTxt + 1); textAlign(LEFT, TOP);
        text('[K]  ' + state.player.skillPoints + ' skill point' + (state.player.skillPoints > 1 ? 's' : '') + ' ready', X, y + 1);
      }, lh - 2);
    }
    div();

    // ── world ──
    {
      const si = (typeof getSeason === 'function') ? getSeason() : 0;
      const sCol = [[140, 195, 110], [230, 180, 80], [200, 120, 70], [150, 180, 210]][si] || PARCH;
      const sName = (typeof getSeasonName === 'function') ? getSeasonName() : '';
      const sc = (!((typeof isSeaPeoplesFaction === 'function') && isSeaPeoplesFaction()) &&
                  typeof getSeasonalCrop === 'function') ? getSeasonalCrop() : null;
      textRow(sName, 'Day ' + (state.day || 1), sCol, null, sc ? '· best: ' + sc.name : null);
      if (state.ship && state.ship.state !== 'gone') {
        textRow('Ship', state.ship.state.toUpperCase(), [245, 205, 95]);
      }
      if (!((typeof isSeaPeoplesFaction === 'function') && isSeaPeoplesFaction())) {
        const hasNew = (state.flaxSeeds > 0 || state.pomegranateSeeds > 0 || state.lotusSeeds > 0);
        textRow('Crop', (state.cropSelect || 'grain').toUpperCase(), [210, 200, 175], null,
          sc ? (hasNew ? 'keys 1–7' : 'keys 1–4') : (hasNew ? 'keys 1–3,5–7' : 'keys 1–3'));
      }
      if (state.grapeSeeds > 0 || state.oliveSeeds > 0) {
        let s2 = [];
        if (state.grapeSeeds > 0) s2.push('grape ' + state.grapeSeeds);
        if (state.oliveSeeds > 0) s2.push('olive ' + state.oliveSeeds);
        textRow('Vines', s2.join(' · '), [190, 130, 200]);
      }
      if (state.blessing && state.blessing.type) {
        const bm = Math.floor((state.blessing.timer || 0) / 60);
        textRow('Blessing', state.blessing.type.toUpperCase() + ' ' + bm + 'm', [160, 215, 110]);
      }
      if (state.weather && state.weather.type !== 'clear') {
        const ws = Math.floor((state.weather.timer || 0) / 60);
        textRow('Weather', state.weather.type.toUpperCase() + (ws > 0 ? ' ' + ws + 's' : ''), [150, 185, 225]);
      }
    }

    // ── compute height, draw panel, run rows ──
    let contentH = 10;
    for (const r of rows) contentH += r.h;
    contentH += 8;
    // cover the legacy footprint, but never balloon more than a few rows
    const H = Math.max(contentH, Math.min(legacy, contentH + 4 * l12, height - 70));

    drawingContext.globalAlpha = fade;
    // fully opaque base first — drawHUDPanel alone (alpha 238) lets bright
    // legacy text/bars bleed through
    noStroke(); fill(28, 21, 14); rect(margin, margin, W, H, 7);
    drawHUDPanel(margin, margin, W, H);
    let y = margin + 10;
    push();
    textFont('Cinzel, Georgia, serif');
    noStroke();
    for (const r of rows) { r.fn(y); y += r.h; }
    pop();
    drawingContext.globalAlpha = 1;
  }

  // ─── wire: draw right after the legacy HUD each frame ──────────────────
  const iv = setInterval(function () {
    if (typeof window.drawHUD !== 'function' || typeof state === 'undefined') return;
    clearInterval(iv);
    const orig = window.drawHUD;
    window.drawHUD = function () {
      orig.apply(this, arguments);
      try { if (gameScreen === 'game') drawPanelV2(); } catch (e) { /* silent */ }
    };
    console.log('[HUD Panel V2] ✓ top-left panel rebuilt');
  }, 400);
})();
