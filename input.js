// ═══ INPUT SYSTEM ═══════════════════════════════════════════════════════
// Mouse, keyboard, and touch input handlers for Mare Nostrum
// Extracted from sketch.js

// ─── INPUT ────────────────────────────────────────────────────────────────
function mouseWheel(event) {
  // Scroll keybind list in settings
  if (gameScreen === 'settings') {
    let maxScroll = max(0, Object.keys(DEFAULT_KEYBINDS).length * 18 - 10 * 18);
    _keybindScrollOffset = constrain(_keybindScrollOffset + (event.delta > 0 ? 18 : -18), 0, maxScroll);
    return false;
  }
  // Zoom camera with scroll wheel during gameplay
  if (gameScreen === 'game' && state && state.isInitialized) {
    let delta = -event.delta * 0.001;
    let zMin = (state.rowing && state.rowing.active) ? CAM_ZOOM_MIN_SAILING : CAM_ZOOM_MIN;
    camZoomTarget = constrain(camZoomTarget + delta, zMin, CAM_ZOOM_MAX);
    return false;
  }
  let dir = event.delta > 0 ? 1 : -1;
  let p = state.player;
  p.hotbarSlot = ((p.hotbarSlot + dir) % HOTBAR_ITEMS.length + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length;
  return false;
}

function mousePressed() {
  if (snd) snd.resume();
  // Right-click cancels click-to-move
  if (mouseButton === RIGHT) {
    if (state && state.player) { state.player.targetX = null; state.player.targetY = null; state.player.vx = 0; state.player.vy = 0; state.player.moving = false; }
    return;
  }
  if (gameScreen === 'lobby') { if (typeof lobbyHandleClick === 'function') lobbyHandleClick(); return; }
  if (gameScreen !== 'game') { handleMenuClick(); return; }
  if (state.introPhase !== 'done') { skipIntro(); return; }
  if (factionSelectActive) {
    if (_pendingFaction) { selectFaction(_pendingFaction); _pendingFaction = null; return; }
    if (factionSelectHover) { _pendingFaction = factionSelectHover; }
    return;
  }
  if (state.cutscene) { skipCutscene(); return; }
  // Dialog choice click handling
  if (dialogState.active && dialogState.choices && dialogState.displayLen >= dialogState.text.length) {
    let d = dialogState, boxW = min(width - 40, 440), boxH = 90;
    let bx = (width - boxW) / 2, by = height - boxH - 20, portW = 56;
    let choiceY = by + boxH + 4, choiceX = bx + portW + 16;
    for (let i = 0; i < d.choices.length; i++) {
      let ch = d.choices[i];
      let cbw = textWidth(ch.text) + 24;
      let cbx = choiceX;
      for (let j = 0; j < i; j++) cbx += textWidth(d.choices[j].text) + 24 + 8;
      if (mouseX > cbx && mouseX < cbx + cbw && mouseY > choiceY && mouseY < choiceY + 22) {
        if (typeof ch.action === 'function') ch.action();
        return;
      }
    }
    return; // block other clicks while dialog choices visible
  }
  // Multiplayer clicks (rival panel + trade offer)
  if (typeof MP !== 'undefined' && MP.connected) {
    if (state._mpTradeOffer && MP.handleTradeOfferClick(mouseX, mouseY)) return;
    if (MP.handleRivalPanelClick(mouseX, mouseY)) return;
  }
  // Shipyard click
  if (typeof handleShipyardClick === 'function' && handleShipyardClick()) return;
  // Army battle — allow clicks during deploy for formation picker
  if (typeof _armyBattle !== 'undefined' && _armyBattle) {
    if (typeof handleArmyBattleClick === 'function') handleArmyBattleClick(mouseX, mouseY);
    return;
  }
  if (dismissIslandMilestone()) return;
  // Screenshot capture on click
  if (screenshotMode) {
    photoModeFlash = 6; // ~100ms at 60fps
    if (snd) snd.playSFX('shutter_click');
    saveCanvas('mare-nostrum-' + nf(month(), 2) + nf(day(), 2) + '-' + nf(hour(), 2) + nf(minute(), 2), 'png');
    return;
  }
  // Tech tree click
  if (state.techTreeOpen && typeof handleTechTreeClick === 'function') {
    if (handleTechTreeClick(mouseX, mouseY)) return;
  }
  // Victory screen dismiss
  if (state.victoryScreen && state.victoryScreen.timer > 120) {
    state.victoryScreen = null;
    return;
  }
  // Hotbar tap detection (mobile + desktop click)
  if (typeof _handleHotbarTap === 'function' && _handleHotbarTap(mouseX, mouseY)) return;
  // Legion button click
  if (typeof handleLegionButtonClick === 'function' && handleLegionButtonClick(mouseX, mouseY)) return;
  // Wardrobe click handling
  if (wardrobeOpen) {
    let pw = 220, ph = 280;
    let px = width / 2 - pw / 2;
    let py = height / 2 - ph / 2;
    let swatchSize = 24, swatchGap = 8;
    let swatchStartX = px + (pw - (TUNIC_COLORS.length * (swatchSize + swatchGap) - swatchGap)) / 2;
    for (let i = 0; i < TUNIC_COLORS.length; i++) {
      let sx = swatchStartX + i * (swatchSize + swatchGap) + swatchSize / 2;
      let sy = py + 54 + swatchSize / 2;
      if (dist(mouseX, mouseY, sx, sy) < swatchSize / 2 + 2) {
        state.wardrobe.tunicColor = i;
        return;
      }
    }
    let hwSize = 40, hwGap = 16;
    let hwStartX = px + (pw - (HEADWEAR.length * (hwSize + hwGap) - hwGap)) / 2;
    for (let i = 0; i < HEADWEAR.length; i++) {
      let hx = hwStartX + i * (hwSize + hwGap);
      let hy = py + 120;
      if (mouseX > hx && mouseX < hx + hwSize && mouseY > hy && mouseY < hy + hwSize) {
        if (HEADWEAR[i].unlocked()) state.wardrobe.headwear = i;
        return;
      }
    }
    if (mouseX < px || mouseX > px + pw || mouseY < py || mouseY > py + ph) {
      wardrobeOpen = false;
    }
    return;
  }
  // Dismiss lore tablet popup / narrative dialogue on click
  if (typeof loreTabletPopup !== 'undefined' && loreTabletPopup) { loreTabletPopup = null; return; }
  if (typeof narrativeDialogue !== 'undefined' && narrativeDialogue) { narrativeDialogue = null; return; }
  // Skill tree click handling
  if (typeof handleSkillTreeClick === 'function' && handleSkillTreeClick(mouseX, mouseY)) return;
  // Economy UI click handling
  if (typeof handleEconomyClick === 'function' && handleEconomyClick(mouseX, mouseY)) return;
  // Expedition modifier select — click handling
  if (state.expeditionModifierSelect) {
    let panW = 340, panH = 230;
    let px = width / 2 - panW / 2, py = height / 2 - panH / 2;
    let mods = Object.keys(EXPEDITION_MODIFIERS);
    let sy = py + 48;
    for (let i = 0; i < mods.length; i++) {
      let ry = sy + i * 34;
      if (mouseX > px + 8 && mouseX < px + panW - 8 && mouseY > ry && mouseY < ry + 30) {
        // Click to select
        if (state.expeditionModifier === mods[i]) {
          // Double-click on already selected = confirm (embark)
          let expNum = state.conquest.expeditionNum;
          let supplyCost = {
            gold: 15 + expNum * 5 + state.conquest.soldiers.length * 5,
            wood: 10 + expNum * 3,
            meals: min(3, 1 + floor(expNum / 3)),
          };
          if (state.gold < supplyCost.gold) { addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.gold + ' gold!', '#ff6644'); return; }
          if (state.wood < supplyCost.wood) { addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.wood + ' wood!', '#ff6644'); return; }
          if (state.meals < supplyCost.meals) { addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.meals + ' meals!', '#ff6644'); return; }
          state.gold = max(0, state.gold - supplyCost.gold);
          state.wood -= supplyCost.wood;
          state.meals -= supplyCost.meals;
          state.expeditionModifierSelect = false;
          addFloatingText(width / 2, height * 0.38, getModifier().name + ' Expedition', getModifier().color);
          // enterConquest() deprecated -- openworld seamless
        } else {
          state.expeditionModifier = mods[i];
        }
        return;
      }
    }
    return; // block other clicks
  }

  // Upgrade shop click handling
  if (state.upgradeShopOpen) {
    let panW = 320, panH = 300;
    let px = width / 2 - panW / 2, py = height / 2 - panH / 2;
    let keys = Object.keys(EXPEDITION_UPGRADES);
    let sy = py + 70;
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let tier = state.expeditionUpgrades[key] || 0;
      let upg = EXPEDITION_UPGRADES[key];
      if (tier >= upg.tiers.length) continue;
      let btnX = px + panW - 85, btnY = sy + i * 36 + 4;
      if (mouseX > btnX && mouseX < btnX + 72 && mouseY > btnY && mouseY < btnY + 24) {
        buyExpeditionUpgrade(key);
        return;
      }
    }
    return;
  }
  // Night market click handling
  if (state.nightMarket.shopOpen) {
    let panW = 310, panH = 230;
    let panX = width / 2 - panW / 2;
    let panY = height / 2 - panH / 2 - 10;
    for (let i = 0; i < 4; i++) {
      let item = state.nightMarket.stock[i];
      if (!item || !canAffordMarketItem(item)) continue;
      let oy = panY + 50 + i * 40;
      if (mouseX > panX + 12 && mouseX < panX + panW - 12 && mouseY > oy && mouseY < oy + 34) {
        buyMarketItem(i);
        return;
      }
    }
    return;
  }
  // Dismiss daily summary
  if (state.showSummary) {
    state.showSummary = false;
    return;
  }
  // Conquest mode clicks
  if (state.conquest.active) {
    let cq = state.conquest;
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    if (cq.buildMode) {
      placeConquestBuilding(wx, wy);
    } else {
      // Click to chop nearest tree
      let best = null, bestD = 40;
      for (let t of cq.trees) {
        if (!t.alive) continue;
        let d = dist(state.player.x, state.player.y, t.x, t.y);
        if (d < bestD) { best = t; bestD = d; }
      }
      if (best) {
        // Auto-switch to axe for chopping
        if (state.player.hotbarSlot !== 1) { state.player.hotbarSlot = 1; }
        cq.chopTarget = best;
        cq.chopTimer = 0;
      }
    }
    return;
  }
  if (state.buildMode) {
    if (state.demolishMode) {
      // If confirm dialog is showing, ignore clicks (use E/ESC keys)
      if (state.demolishConfirm) return;
      let wx = s2wX(mouseX), wy = s2wY(mouseY);
      let landmark = ['granary', 'well', 'temple', 'market', 'forum'];
      for (let i = state.buildings.length - 1; i >= 0; i--) {
        let b = state.buildings[i];
        if (landmark.includes(b.type)) continue;
        if (abs(wx - b.x) < (b.w || 24) * 0.7 && abs(wy - b.y) < (b.h || 24) * 0.7) {
          // Ruined buildings: repair instead of demolish
          if (b.ruined) {
            repairBuilding(b);
            return;
          }
          // Calculate 50% refund
          let bp = BLUEPRINTS[b.type];
          let refund = {};
          if (bp && bp.cost) {
            for (let res in bp.cost) {
              let amt = floor(bp.cost[res] * 0.5);
              if (amt > 0) refund[res] = amt;
            }
          }
          state.demolishConfirm = { buildingIndex: i, building: b, refund: refund };
          return;
        }
      }
      addFloatingText(w2sX(wx), w2sY(wy) - 20, 'No building here', C.textDim);
      return;
    }
    let wx = snapToGrid(s2wX(mouseX - shakeX));
    let wy = snapToGrid(s2wY(mouseY - shakeY - floatOffset));
    placeBuilding(wx, wy);
    return;
  }

  // Ship shop click handling (tabbed UI)
  if (state.ship.shopOpen && state.ship.state === 'docked') {
    if (!state.ship.shopTab) state.ship.shopTab = 'buy';
    let panW = min(320, width - 20);
    let tab = state.ship.shopTab;
    let filtered = typeof _getShopTabOffers === 'function' ? _getShopTabOffers(tab, state.ship.offers) : state.ship.offers;
    let headerH = 90;
    let panH = min(headerH + filtered.length * 28 + 28, height - 20);
    let panX = max(10, width / 2 - panW / 2);
    let panY = max(10, height / 2 - panH / 2);
    // Tab click detection
    let tabs = ['buy', 'sell', 'upgrade'];
    let tabW = floor((panW - 36) / 3);
    let tabY = panY + 42;
    for (let t = 0; t < 3; t++) {
      let tx = panX + 12 + t * (tabW + 6);
      if (mouseX > tx && mouseX < tx + tabW && mouseY > tabY && mouseY < tabY + 22) {
        state.ship.shopTab = tabs[t];
        return;
      }
    }
    // Offer click detection
    let listY = tabY + 40;
    for (let i = 0; i < filtered.length; i++) {
      let oy = listY + i * 28;
      if (mouseX > panX + 12 && mouseX < panX + panW - 12 && mouseY > oy && mouseY < oy + 24) {
        let origIdx = state.ship.offers.indexOf(filtered[i]);
        if (origIdx >= 0) doTrade(origIdx);
        return;
      }
    }
    return;
  }

  // Build mode click-to-select building type (decoration only)
  if (state.buildMode) {
    let baseTypes = ['floor', 'wall', 'door', 'chest', 'bridge', 'fence', 'torch', 'flower', 'lantern', 'mosaic', 'aqueduct', 'bath'];
    let slotW = 48, gap = 4;
    let numBase = baseTypes.length;
    let barW = numBase * slotW + (numBase - 1) * gap + 24;
    let rowH = 56;
    let barH = rowH + 8;
    let barX = width / 2 - barW / 2;
    let barY = height - barH - 16;
    if (mouseY > barY && mouseY < barY + barH) {
      let startX = barX + 12;
      let ty0 = barY + 5;
      for (let i = 0; i < baseTypes.length; i++) {
        let tx = startX + i * (slotW + gap);
        if (mouseX > tx && mouseX < tx + slotW && mouseY > ty0 && mouseY < ty0 + 48) {
          state.buildType = baseTypes[i];
          return;
        }
      }
    }
  }

  // Check if clicking a farm plot
  let clicked = false;
  let hs = state.player.hotbarSlot;
  state.plots.forEach(p => {
    let px = w2sX(p.x);
    let py = w2sY(p.y);
    if (dist(mouseX, mouseY, px, py) < p.w * 0.7) {
      clicked = true;
      if (p.ripe) {
        // Auto-switch to sickle for harvesting; bonus if already equipped
        let toolBonus = hs === 0;
        if (hs !== 0) { state.player.hotbarSlot = 0; addFloatingText(width / 2, height - 110, 'Switched to Sickle', '#aaddaa'); }
        state.player.toolSwing = 12;
        state.player._hitlagFrames = 2;
        let wasBlessed = p.blessed;
        p.planted = false; p.ripe = false; p.glowing = false;
        p.timer = 0; p.stage = 0; p.blessed = false;
        let harvestAmt = (state.npc && state.npc.hearts >= 5) ? 2 : 1;
        if (state.tools && state.tools.sickle) harvestAmt *= 2;
        if (state.blessing && state.blessing.type === 'luck') harvestAmt *= 2;
        if (state.heartRewards && state.heartRewards.includes('golden')) harvestAmt *= 2;
        if (wasBlessed) harvestAmt *= 3;
        if (state.prophecy && state.prophecy.type === 'harvest') harvestAmt += 1;
        let festR = getFestival();
        if (festR && festR.effect.allResources) harvestAmt *= festR.effect.allResources;
        // Right tool bonus: +1 harvest if sickle was already equipped
        if (toolBonus) harvestAmt += 1;
        // Agricultural colony spec: +30% harvest yield
        if (state.colonySpec && state.colonySpec['conquest'] === 'agricultural') harvestAmt = floor(harvestAmt * 1.3);
        // Fertile Hands passive skill bonus
        if (typeof getHarvestSkillBonus === 'function') harvestAmt = floor(harvestAmt * getHarvestSkillBonus());
        // Random event bonus (festival_day +50%, harvest_moon +100%)
        harvestAmt = floor(harvestAmt * getEventHarvestMult());
        // Harvest combo
        harvestAmt = onHarvestCombo(p, harvestAmt);
        // Crop rotation & soil fertility
        if (typeof onPlotHarvest === 'function') {
          let _rotBonus = onPlotHarvest(p);
          if (_rotBonus) { harvestAmt = floor(harvestAmt * 1.1); addFloatingText(w2sX(p.x), w2sY(p.y) - 65, 'Rotation Bonus! +10%', '#44cc88'); }
        }
        // Tech: selective_breeding — 25% chance 2x harvest
        if (typeof hasTech === 'function' && hasTech('selective_breeding') && random() < 0.25) {
          harvestAmt *= 2;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '2x BREED!', '#88cc44');
        }
        state.harvest += harvestAmt;
        state.dailyActivities.harvested += harvestAmt;
        if (snd) snd.playSFX('harvest');
        triggerPlayerJoy();
        unlockJournal('first_harvest');
        if (!state.codex.cropsGrown) state.codex.cropsGrown = {};
        state.codex.cropsGrown[p.cropType || 'grain'] = true;
        let _ck = p.cropType || 'grain';
        if (!state.codex.crops) state.codex.crops = {};
        if (!state.codex.crops[_ck]) state.codex.crops[_ck] = { harvested: true, count: 0, firstDay: state.day };
        state.codex.crops[_ck].count += harvestAmt;
        state.codex.crops[_ck].harvested = true;
        checkQuestProgress('harvest', harvestAmt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_harvested', harvestAmt);
        if (typeof grantXP === 'function') grantXP(5 * harvestAmt);
        trackMilestone('first_harvest');
        if (typeof trackStat === 'function') trackStat('cropsHarvested', harvestAmt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('harvest', harvestAmt);
        if (typeof triggerNPCReaction === 'function') triggerNPCReaction('harvest', p.x, p.y);
        // Auto-seeds: each harvest gives 1-2 seeds back
        let seedBack = 1 + (random() < 0.5 ? 1 : 0);
        if (Object.keys(state.codex.crops).length >= 7) seedBack += 1;
        state.seeds += seedBack;
        addFloatingText(px, py - 25, '+' + seedBack + ' Seed', '#8fbc8f');
        // Seasonal crop bonuses
        let scData = getSeasonalCropData(p.cropType);
        if (scData) {
          if (p.cropType === 'sunfruit') { state.solar = min(state.maxSolar, state.solar + 15); addFloatingText(px, py - 35, '+15 Solar!', '#ffaa33'); }
          if (p.cropType === 'frostherb') { state.crystals += 1; addFloatingText(px, py - 35, '+1 Crystal!', '#88ddff'); }
          if (p.cropType === 'pumpkin') { harvestAmt += 2; }
          if (p.cropType === 'wildflower') { spawnParticles(p.x, p.y, 'build', 10); }
        }
        // New crop bonuses
        if (p.cropType === 'lotus') { let lc = 1 + floor(random(2)); state.crystals += lc; addFloatingText(px, py - 35, '+' + lc + ' Crystal!', '#f0a0c8'); }
        if (p.cropType === 'pomegranate') { let pg = 3 + floor(random(3)); state.gold += pg; addFloatingText(px, py - 35, '+' + pg + ' Gold!', '#c82828'); }
        if (p.cropType === 'flax') { let fb = 1; state.wood += fb; addFloatingText(px, py - 35, '+' + fb + ' Fiber!', '#6496dc'); }
        let label = wasBlessed ? '+' + harvestAmt + ' BLESSED!' : (harvestAmt > 1 ? '+' + harvestAmt + ' Harvest!' : '+Harvest');
        let labelColor = scData ? scData.color : (wasBlessed ? '#ffdd00' : C.cropGlow);
        addFloatingText(px, py - 20, label, labelColor);
        if (typeof spawnHarvestArc === 'function') spawnHarvestArc(px, py - 20, label, labelColor, 'harvest');
        // Codex discovery for crops
        if (typeof markCodexDiscovery === 'function' && state.codex.crops[_ck] && state.codex.crops[_ck].count === harvestAmt) markCodexDiscovery('crops', _ck);
        spawnHarvestBurst(p.x, p.y, p.cropType || 'grain');
        triggerScreenShake(wasBlessed ? 4 : 1.5, wasBlessed ? 8 : 4);
      } else if (!p.planted) {
        let canPlant = false;
        let cropType = state.cropSelect || 'grain';
        if (cropType === 'grape' && state.grapeSeeds > 0) { state.grapeSeeds--; canPlant = true; }
        else if (cropType === 'olive' && state.oliveSeeds > 0) { state.oliveSeeds--; canPlant = true; }
        else if (cropType === 'flax' && state.flaxSeeds > 0) { state.flaxSeeds--; canPlant = true; }
        else if (cropType === 'pomegranate' && state.pomegranateSeeds > 0) { state.pomegranateSeeds--; canPlant = true; }
        else if (cropType === 'lotus' && state.lotusSeeds > 0) { state.lotusSeeds--; canPlant = true; }
        else if (isSeasonalCrop(cropType)) {
          let sc = getSeasonalCropData(cropType);
          if (sc && sc.season === getSeason() && state.seeds > 0) { state.seeds--; canPlant = true; }
          else { cropType = 'grain'; if (state.seeds > 0) { state.seeds--; canPlant = true; } }
        }
        else if (state.seeds > 0) { state.seeds--; canPlant = true; cropType = 'grain'; }
        if (canPlant) {
          if (typeof onPlotPlant === 'function') onPlotPlant(p, cropType);
          p.planted = true; p.stage = 0; p.timer = 0; p.cropType = cropType;
          if (typeof advanceNPCQuestCounter === 'function') advanceNPCQuestCounter('nq_livia_planted', 1);
          if (snd) snd.playSFX('build');
          let label = cropType === 'grain' ? 'Planted' : 'Planted ' + cropType;
          addFloatingText(px, py - 20, label, C.vineLight);
          if (state.plots && state.plots.filter(function(pl) { return pl.planted; }).length === 1) { addFloatingText(px, py - 40, 'It will grow over time!', '#88cc44'); }
        }
      }
    }
  });

  // Check if clicking a resource node (stone, crystal_shard)
  if (!clicked) {
    let rwx = s2wX(mouseX), rwy = s2wY(mouseY);
    let nearRes = state.resources.find(r => {
      if (!r.active) return false;
      return dist2(rwx, rwy, r.x, r.y) < 22 && dist2(state.player.x, state.player.y, r.x, r.y) < 60;
    });
    if (nearRes) {
      let pickBonus = state.player.hotbarSlot === 2;
      if (!pickBonus) { state.player.hotbarSlot = 2; addFloatingText(width / 2, height - 110, 'Switched to Pick', '#aaddaa'); }
      state.player.toolSwing = 12;
      state.player._hitlagFrames = 2;
      nearRes.active = false; nearRes.respawnTimer = 600;
      let amt = pickBonus ? 2 : 1;
      if (nearRes.type === 'stone') { state.stone += amt; checkQuestProgress('stone', amt); addFloatingText(w2sX(nearRes.x), w2sY(nearRes.y) - 15, '+' + amt + ' Stone', '#aaaaaa'); }
      else if (nearRes.type === 'crystal_shard') { state.crystals += amt; checkQuestProgress('crystal', amt); addFloatingText(w2sX(nearRes.x), w2sY(nearRes.y) - 15, '+' + amt + ' Crystal', C.crystalGlow); }
      if (snd) snd.playSFX(nearRes.type === 'stone' ? 'stone_mine' : 'crystal');
      spawnParticles(nearRes.x, nearRes.y, 'collect', 5);
      clicked = true;
    }
  }

  // Check if clicking a crystal node (must be nearby)
  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    let nearCrystal = state.crystalNodes.find(c => {
      if (c.charge <= 0) return false;
      let cd = dist2(wx, wy, c.x, c.y);
      let playerDist = dist2(state.player.x, state.player.y, c.x, c.y);
      return cd < 20 && playerDist < 60;
    });
    if (nearCrystal) {
      // Auto-switch to pickaxe for mining; bonus if already equipped
      let pickBonus = state.player.hotbarSlot === 2;
      if (!pickBonus) { state.player.hotbarSlot = 2; addFloatingText(width / 2, height - 110, 'Switched to Pick', '#aaddaa'); }
      state.player.toolSwing = 12;
      state.player._hitlagFrames = 2;
      let amt = nearCrystal.charge >= 30 ? 2 : 1;
      if (pickBonus) amt += 1;
      amt = floor(amt * (getFactionData().crystalIncomeMult || 1));
      state.crystals += amt;
      if (snd) snd.playSFX('crystal');
      state.dailyActivities.crystal += amt;
        if (typeof trackStat === 'function') trackStat('crystalsCollected', amt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('crystal', amt);
      checkQuestProgress('crystal', amt);
      if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_crystals_gathered', amt);
      unlockJournal('first_crystal');
      nearCrystal.charge = 0;
      // Steel Pickaxe halves respawn time (2x mining speed)
      nearCrystal.respawnTimer = state.tools.steelPick ? 400 : 800;
      let csx = w2sX(nearCrystal.x), csy = w2sY(nearCrystal.y);
      addFloatingText(csx, csy - 15, '+' + amt + ' Crystal', C.crystalGlow);
      spawnCrystalPulse(nearCrystal.x, nearCrystal.y);
      triggerScreenShake(2, 4);
      clicked = true;
    }
  }

  // Check if clicking a tree (must be nearby)
  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    let nearTree = state.trees.find(t => {
      if (!t.alive) return false;
      let td = dist2(wx, wy, t.x, t.y);
      let playerDist = dist2(state.player.x, state.player.y, t.x, t.y);
      return td < 25 && playerDist < 60;
    });
    if (nearTree) {
      // Auto-switch to axe for chopping; bonus damage if already equipped
      if (state.player.hotbarSlot === 1) nearTree.health -= 1; // axe bonus hit
      if (state.player.hotbarSlot !== 1) { state.player.hotbarSlot = 1; addFloatingText(width / 2, height - 110, 'Switched to Axe', '#aaddaa'); }
      state.player.toolSwing = 12;
      state.player._hitlagFrames = 2;
      chopTree(nearTree);
      clicked = true;
    }
  }

  // Feed companion pets (gift system)
  if (!clicked) {
    let gwx = s2wX(mouseX);
    let gwy = s2wY(mouseY);
    if (tryCompanionGift(gwx, gwy)) clicked = true;
  }

  // Pet cats
  if (!clicked) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    let nearCat = state.cats.find(c => {
      if (!c.adopted) return false;
      let cd = dist2(wx, wy, c.x, c.y);
      let pd = dist2(state.player.x, state.player.y, c.x, c.y);
      return cd < 20 && pd < 50;
    });
    if (nearCat && !nearCat.petted) {
      nearCat.petted = true;
      state.dailyActivities.catPetted++;
      let sx = w2sX(nearCat.x), sy = w2sY(nearCat.y);
      spawnParticles(nearCat.x, nearCat.y, 'burst', 5);
      addFloatingText(sx, sy - 15, 'Petted ' + nearCat.colorName + '!', '#ffaaaa');
      clicked = true;
    }
  }

  if (!clicked && mouseButton === LEFT && !(state._buildExitFrame && frameCount - state._buildExitFrame < 10)) {
    let wx = s2wX(mouseX);
    let wy = s2wY(mouseY);
    state.player.targetX = wx;
    state.player.targetY = wy;
  }
}

function mouseDragged() {
  // Drag volume sliders in settings
  if (gameScreen === 'settings' && snd) {
    let py = floor(height * 0.18);
    let sliderY = py + 80;
    let sliderW = 120;
    let slX = floor(width / 2 + 10);
    let keys = ['master', 'sfx', 'ambient', 'music'];
    for (let k of keys) {
      if (mouseX >= slX - 10 && mouseX <= slX + sliderW + 10 && mouseY >= sliderY - 12 && mouseY <= sliderY + 12) {
        snd.setVolume(k, constrain((mouseX - slX) / sliderW, 0, 1));
        return;
      }
      sliderY += 24;
    }
  }
}

function touchStarted() {
  if (snd) snd.resume();
  // Delegate to mousePressed for touch handling
  // Return false to prevent default browser behavior (zoom, scroll)
  return false;
}

function keyPressed() {
  if (snd) snd.resume();
  // Faction select keyboard shortcuts
  if (factionSelectActive) {
    if (_pendingFaction) {
      if (keyCode === 13 || keyCode === 10) { selectFaction(_pendingFaction); _pendingFaction = null; return; }
      if (keyCode === 27) { _pendingFaction = null; return; }
      return;
    }
    if (key === 'r' || key === 'R') { _pendingFaction = 'rome'; return; }
    if (key === 'c' || key === 'C') { _pendingFaction = 'carthage'; return; }
    if (key === 'e' || key === 'E') { _pendingFaction = 'egypt'; return; }
    if (key === 'g' || key === 'G') { _pendingFaction = 'greece'; return; }
    if (key === 's' || key === 'S') { _pendingFaction = 'seapeople'; return; }
    if (key === 'p' || key === 'P') { _pendingFaction = 'persia'; return; }
    if (key === 'f' || key === 'F') { _pendingFaction = 'phoenicia'; return; }
    if (key === 'l' || key === 'L') { _pendingFaction = 'gaul'; return; }
    return;
  }
  // Island milestone overlay — dismiss on any key
  if (dismissIslandMilestone()) return;
  // E/Enter dismisses popup overlays (lore tablet, narrative dialogue, dialog, victory screen)
  if (keyCode === 69 || keyCode === 13) {
    if (typeof loreTabletPopup !== 'undefined' && loreTabletPopup) { loreTabletPopup = null; return; }
    if (typeof narrativeDialogue !== 'undefined' && narrativeDialogue) { narrativeDialogue = null; return; }
    if (dialogState.active) { advanceDialog(); return; }
    if (state.victoryScreen && state.victoryScreen.timer > 120) { state.victoryScreen = null; return; }
  }
  // Island naming overlay intercepts all keys when open
  if (typeof handleIslandNamingKey === 'function' && handleIslandNamingKey(key, keyCode)) return;
  // Debug console intercepts all keys when open
  if (typeof Debug !== 'undefined' && Debug.handleKey(key, keyCode)) return;
  // Lobby E key for relic claiming, ESC to leave
  if (gameScreen === 'lobby') {
    if ((key === 'e' || key === 'E') && typeof lobbyClaimRelic === 'function') { lobbyClaimRelic(); return; }
    if (keyCode === 27) { if (typeof resetLobby === 'function') resetLobby(); gameScreen = 'menu'; return; }
    return;
  }
  if (gameScreen !== 'game') {
    // Keybind rebinding — intercept next keypress
    if (gameScreen === 'settings' && _rebindingAction) {
      if (keyCode === 27) { _rebindingAction = null; return; } // ESC cancels
      let keyName;
      if (keyCode === 16) keyName = 'SHIFT';
      else if (keyCode === 18) keyName = 'ALT';
      else if (keyCode === 9) keyName = 'TAB';
      else if (keyCode === 13) keyName = 'ENTER';
      else if (keyCode === 32) keyName = 'SPACE';
      else if (key === '`') keyName = '`';
      else if (key.length === 1) keyName = key.toUpperCase();
      else keyName = key.toUpperCase();
      gameSettings.keybinds[_rebindingAction] = keyName;
      _rebindingAction = null;
      _saveSettings();
      return false;
    }
    // ESC from settings/credits back to menu
    if (keyCode === 27 && (gameScreen === 'settings' || gameScreen === 'credits')) {
      _rebindingAction = null; _keybindScrollOffset = 0;
      gameScreen = 'menu';
    }
    if (keyCode === 27 && (gameScreen === 'multiplayer' || gameScreen === 'howtoplay')) {
      if (typeof _mpSubScreen !== 'undefined' && _mpSubScreen !== 'main') { _mpSubScreen = 'main'; }
      else { gameScreen = 'menu'; if (state) state._mpMenuOpen = false; }
      return;
    }
    // Multiplayer join input
    if ((gameScreen === 'multiplayer' || gameScreen === 'howtoplay') && typeof _mpSubScreen !== 'undefined' && _mpSubScreen === 'join') {
      if (keyCode === ENTER && typeof _mpJoinInput !== 'undefined' && _mpJoinInput.length > 0) {
        MP.join(_mpJoinInput);
        _mpSubScreen = 'host'; // reuse host screen to show waiting
        return;
      }
      if (keyCode === BACKSPACE) { _mpJoinInput = (_mpJoinInput || '').slice(0, -1); return; }
      if (key.length === 1 && (_mpJoinInput || '').length < 8) { _mpJoinInput = (_mpJoinInput || '') + key.toUpperCase(); return; }
      return;
    }
    // ESC on menu = back to game (if save exists / game in progress)
    if (keyCode === 27 && gameScreen === 'menu' && state && state.isInitialized) {
      state._paused = false;
      gameScreen = 'game';
      return;
    }
    // Menu keyboard navigation
    if (gameScreen === 'menu') {
      let hasSave = !!localStorage.getItem(_SAVE_KEY);
      let btnCount = hasSave ? 5 : 4;
      if (keyCode === DOWN_ARROW || keyCode === 83) { // down or S
        menuKeyIdx = (menuKeyIdx + 1) % btnCount;
        menuHover = menuKeyIdx;
      } else if (keyCode === UP_ARROW || keyCode === 87) { // up or W
        menuKeyIdx = menuKeyIdx <= 0 ? btnCount - 1 : menuKeyIdx - 1;
        menuHover = menuKeyIdx;
      } else if (keyCode === ENTER || keyCode === 32) { // enter or space
        if (menuKeyIdx >= 0) { menuHover = menuKeyIdx; handleMenuClick(); }
        else if (menuHover >= 0) handleMenuClick();
      }
    }
    return;
  }
  if (state.introPhase !== 'done') { skipIntro(); return; }
  if (state.cutscene) { skipCutscene(); return; }

  // Home key resets camera zoom
  if (keyCode === 36) { camZoomTarget = 1.0; return; }

  // Victory screen dismiss
  if (state.victoryScreen && state.victoryScreen.timer > 120) {
    if (keyCode === ENTER) { state.victoryScreen = null; return; }
    if (key === 'n' || key === 'N') { state.victoryScreen = null; return; }
  }

  // F2 = instant screenshot
  if (keyCode === 113) {
    let d = new Date();
    let ts = d.getFullYear() + '-' + nf(d.getMonth()+1,2) + '-' + nf(d.getDate(),2) + '_' + nf(d.getHours(),2) + '-' + nf(d.getMinutes(),2) + '-' + nf(d.getSeconds(),2);
    saveCanvas('screenshot_' + ts, 'png');
    addFloatingText(width / 2, height * 0.1, 'Screenshot saved!', '#ffffff');
    if (snd) snd.playSFX('shutter_click');
    return;
  }

  // F9 = toggle screenshot mode
  if (keyCode === 120) {
    screenshotMode = !screenshotMode;
    screenshotFilter = 0;
    if (screenshotMode) {
      photoModeWatermarkAlpha = 0;
      photoModeTipTimer = 120;
      addFloatingText(width / 2, height * 0.1, 'SCREENSHOT MODE - Click to capture, F to cycle filters, F9 to exit', '#ffffff');
    } else {
      addFloatingText(width / 2, height * 0.1, 'HUD RESTORED', '#ffdc50');
    }
    return;
  }
  // F key in screenshot mode = cycle filter
  if (screenshotMode && (key === 'f' || key === 'F')) {
    screenshotFilter = (screenshotFilter + 1) % 4;
    let fNames = ['No Filter', 'Warm (Golden Hour)', 'Cool (Moonlit)', 'Sepia (Ancient)'];
    addFloatingText(width / 2, height * 0.1, fNames[screenshotFilter], '#ffffff');
    return;
  }

  // Multiplayer chat input
  if (typeof MP !== 'undefined' && MP.connected) {
    if (keyCode === ENTER) {
      if (state._chatOpen) {
        if (state._chatInput) MP.chat(state._chatInput);
        state._chatOpen = false;
        state._chatInput = '';
        return;
      } else {
        state._chatOpen = true;
        state._chatInput = '';
        return;
      }
    }
    if (state._chatOpen) {
      if (keyCode === ESCAPE) { state._chatOpen = false; state._chatInput = ''; return; }
      if (keyCode === BACKSPACE) { state._chatInput = (state._chatInput || '').slice(0, -1); return; }
      if (key.length === 1) { state._chatInput = (state._chatInput || '') + key; return; }
      return;
    }
  }

  // Block all input during army battle
  if (typeof _armyBattle !== 'undefined' && _armyBattle) return;

  // ESC — close overlays first, then menu as last resort
  if (keyCode === 27) {
    if (!state.tutorialGoalComplete && state.tutorialGoalStep < TUTORIAL_STEPS.length && state.progression.homeIslandReached) { skipTutorial(); addNotification('Tutorial skipped', '#aaaaaa'); return; }
    if (typeof worldMapOpen !== 'undefined' && worldMapOpen) { worldMapOpen = false; return; }
    if (state.nationDiplomacyOpen) { closeNationDiplomacy(); return; }
    // openworld: visitingNation ESC deprecated
    if (state.wreck._visiting) {
      state.wreck._visiting = false;
      state.rowing.active = true;
      state.rowing.x = WRECK.cx;
      state.rowing.y = WRECK.cy + WRECK.ry * 1.1;
      state.rowing.speed = 0; state.rowing.angle = HALF_PI; state.rowing.wakeTrail = [];
      state.player.x = state.rowing.x; state.player.y = state.rowing.y;
      cam.x = state.player.x; cam.y = state.player.y;
      camSmooth.x = cam.x; camSmooth.y = cam.y;
      return;
    }
    if (state.demolishConfirm) { state.demolishConfirm = null; return; }
    if (state.buildMode) { state.buildMode = false; state._buildExitFrame = frameCount; return; }
    if (state.insideTemple) {
      state.insideTemple = false;
      state.player.x = state._templeReturnX || state.pyramid.x;
      state.player.y = state._templeReturnY || state.pyramid.y + 10;
      camSmooth.x = state.player.x; camSmooth.y = state.player.y - height * 0.12;
      return;
    }
    if (state.insideCastrum) {
      state.insideCastrum = false;
      if (state.legia) state.legia.legiaUIOpen = false;
      state.player.x = state._castrumReturnX || (state.legia ? state.legia.castrumX : WORLD.islandCX);
      state.player.y = state._castrumReturnY || (state.legia ? state.legia.castrumY + 50 : WORLD.islandCY);
      camSmooth.x = state.player.x; camSmooth.y = state.player.y - height * 0.12;
      return;
    }
    if (wardrobeOpen) { wardrobeOpen = false; return; }
    if (dialogState.active) { dialogState.active = false; return; }
    if (state.expeditionModifierSelect) { state.expeditionModifierSelect = false; return; }
    if (state.upgradeShopOpen) { state.upgradeShopOpen = false; return; }
    if (typeof _shipyardOpen !== 'undefined' && _shipyardOpen) { closeShipyard(); return; }
    if (state.nightMarket && state.nightMarket.shopOpen) { state.nightMarket.shopOpen = false; return; }
    if (state.ship && state.ship.shopOpen) { state.ship.shopOpen = false; return; }
    if (state.tradeRouteUI) { state.tradeRouteUI = false; return; }
    if (state.colonyManageOpen) { state.colonyManageOpen = false; state.colonyManageSelected = null; return; }
    if (state.legia && state.legia.legiaUIOpen) { state.legia.legiaUIOpen = false; return; }
    if (state.activeEvent && state.activeEvent.data && state.activeEvent.data.shopOpen) { state.activeEvent.data.shopOpen = false; return; }
    if (state.naturalistOpen) { state.naturalistOpen = false; return; }
    if (typeof recipeBookOpen !== 'undefined' && recipeBookOpen) { recipeBookOpen = false; return; }
    if (state.achievementsPanelOpen) { state.achievementsPanelOpen = false; return; }
    if (empireDashOpen) { empireDashOpen = false; return; }
    if (inventoryOpen) { inventoryOpen = false; return; }
    if (equipmentWindowOpen) { equipmentWindowOpen = false; return; }
    if (typeof skillTreeOpen !== 'undefined' && skillTreeOpen) { skillTreeOpen = false; return; }
    if (state.techTreeOpen) { state.techTreeOpen = false; return; }
    if (state.codexOpen) { state.codexOpen = false; return; }
    if (state.journalOpen) { state.journalOpen = false; return; }
    saveGame();
    state._paused = true;
    gameScreen = 'menu';
    menuFadeIn = 0;
    return;
  }

  // ─── IMPERATOR CEREMONY DISMISS ───
  if (state.victoryCeremony && state.victoryCeremony.phase === 4) {
    state.victoryCeremony = null;
    return;
  }

  // Legacy island [E] interactions removed -- V4.0 seamless handlers below

  // Seamless nation island E-key (new system)
  if (state._activeNation && !state.visitingNation) {
    if (state.nationDiplomacyOpen) { handleNationDiplomacyKey(key, keyCode); return; }
    // Bot island E-key: open diplomacy panel (invasion is option inside)
    if ((key === 'e' || key === 'E') && state._invasionTarget && typeof openNationDiplomacy === 'function') {
      openNationDiplomacy(state._invasionTarget);
      return;
    }
    if (key === 'e' || key === 'E') { if (handleActiveNationInteract()) return; }
  }

  // Seamless exploration island E-key
  if (state._activeExploration && (key === 'e' || key === 'E')) {
    if (state._activeExploration === 'vulcan') { handleVulcanInteract(); return; }
    if (state._activeExploration === 'hyperborea') { handleHyperboreInteract(); return; }
    if (state._activeExploration === 'plenty') { handlePlentyInteract(); return; }
    if (state._activeExploration === 'necropolis') { handleNecropolisInteract(); return; }
  }

  // ─── WRECK BEACH KEYS ───
  if (((state.progression.gameStarted && !state.progression.homeIslandReached) || state.wreck._visiting) &&
      !state.rowing.active && !state.conquest.active) {
    if (key === 'e' || key === 'E') {
      // When visiting wreck from sailing, E at south shore to depart
      if (state.wreck._visiting) {
        let wbY = WRECK.cy + WRECK.ry * 0.75;
        if (state.player.y > wbY) {
          state.wreck._visiting = false;
          state.rowing.active = true;
          state.rowing.x = WRECK.cx;
          state.rowing.y = WRECK.cy + WRECK.ry * 1.1;
          state.rowing.speed = 0;
          state.rowing.angle = HALF_PI;
          state.rowing.wakeTrail = [];
          state.player.x = state.rowing.x; state.player.y = state.rowing.y;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          addFloatingText(width / 2, height * 0.35, 'Setting sail...', '#88ccff');
          return;
        }
      }
      handleWreckInteract();
    }
    if (key === ' ' && typeof _wreckMiniGames !== 'undefined' && _wreckMiniGames.rockSkip && (_wreckMiniGames.rockPhase === 'throwing' || _wreckMiniGames.rockPhase === 'bouncing')) { handleRockBounce(); return false; }
    return; // block all other game keys on wreck
  }

  // Expedition modifier selection
  if (state.expeditionModifierSelect) {
    let mods = Object.keys(EXPEDITION_MODIFIERS);
    // Number keys 1-5 to select modifier
    for (let i = 0; i < mods.length; i++) {
      if (key === String(i + 1)) { state.expeditionModifier = mods[i]; return; }
    }
    // ESC to cancel
    if (keyCode === 27) { state.expeditionModifierSelect = false; return; }
    // ENTER to confirm and embark
    if (keyCode === ENTER) {
      // Check supply cost
      let expNum = state.conquest.expeditionNum;
      let supplyCost = {
        gold: 15 + expNum * 5 + state.conquest.soldiers.length * 5,
        wood: 10 + expNum * 3,
        meals: min(3, 1 + floor(expNum / 3)),
      };
      if (state.gold < supplyCost.gold) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.gold + ' gold!', '#ff6644');
        return;
      }
      if (state.wood < supplyCost.wood) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.wood + ' wood!', '#ff6644');
        return;
      }
      let totalFood = (state.meals || 0) + (state.stew || 0);
      if (totalFood < supplyCost.meals) {
        addFloatingText(width / 2, height * 0.3, 'Need ' + supplyCost.meals + ' meals/stew! (have ' + totalFood + ')', '#ff6644');
        return;
      }
      // Deduct food — use meals first, then stew
      state.gold = max(0, state.gold - supplyCost.gold);
      state.wood -= supplyCost.wood;
      let foodNeeded = supplyCost.meals;
      let mealsUsed = min(state.meals, foodNeeded);
      state.meals -= mealsUsed;
      foodNeeded -= mealsUsed;
      if (foodNeeded > 0) state.stew -= foodNeeded;
      state.expeditionModifierSelect = false;
      let modName = getModifier().name;
      addFloatingText(width / 2, height * 0.38, modName + ' Expedition', getModifier().color);
      // enterConquest() deprecated -- openworld seamless
      return;
    }
    return; // block other keys while selecting
  }

  // Economy system keys (trade routes, spec selection)
  if (typeof handleEconomyKey === 'function') {
    if (handleEconomyKey(key, keyCode)) return;
  }

  // Rival diplomacy keys
  if (handleRivalDiplomacyKey(key, keyCode)) return;

  // Conquest mode keys
  if (state.conquest.active) {
    let cq = state.conquest;
    if (key === ' ' || key === 'j' || key === 'J') {
      if (!cq.buildMode) conquestPlayerAttack();
      return;
    }
    if (key === 'e' || key === 'E') {
      // Bridge exit — walk back to home island
      if (state.imperialBridge.built && cq.colonized) {
        let bridgeEntryX = cq.isleX + cq.isleRX * 0.85;
        let bridgeEntryY = WORLD.islandCY;
        if (dist(state.player.x, state.player.y, bridgeEntryX, bridgeEntryY) < 80) {
          cq.active = false;
          state.player.x = WORLD.islandCX - state.islandRX * 0.85;
          state.player.y = WORLD.islandCY;
          state.player.vx = 0; state.player.vy = 0;
          cam.x = state.player.x; cam.y = state.player.y;
          camSmooth.x = cam.x; camSmooth.y = cam.y;
          state.centurion.x = state.player.x + 20;
          state.centurion.y = state.player.y + 10;
          addFloatingText(width / 2, height * 0.3, 'Returning home via Imperial Bridge', '#aaddff');
          return;
        }
      }
      // Only board ship when near it at south shore
      let shipX = cq.shipX || cq.isleX;
      let shipY = cq.shipY || (cq.isleY + cq.isleRY * 0.92 + 15);
      let dShip = dist(state.player.x, state.player.y, shipX, shipY);
      // exitConquest deprecated -- openworld
      // V1.2: E key — upgrade tower
      for (let b of cq.buildings) {
        if (b.type === 'watchtower' && dist(state.player.x, state.player.y, b.x, b.y) < 45) {
          let tKey = floor(b.x) + ',' + floor(b.y);
          if (!cq.towerLevels) cq.towerLevels = {};
          let tLv = cq.towerLevels[tKey] || 0;
          let tData = EXPEDITION_TOWER.levels[tLv];
          if (tData && tData.upgradeCost) {
            let cost = tData.upgradeCost;
            let canAfford = (cq.woodPile >= (cost.wood || 0)) && ((cq.stonePile || 0) >= (cost.stone || 0)) && (state.gold >= (cost.gold || 0));
            if (canAfford) {
              cq.woodPile -= cost.wood || 0;
              cq.stonePile = (cq.stonePile || 0) - (cost.stone || 0);
              state.gold -= cost.gold || 0;
              cq.towerLevels[tKey] = tLv + 1;
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Tower Lv' + (tLv + 2) + '!', '#88aadd');
              if (snd) snd.playSFX('upgrade');
            } else {
              let need = [];
              if ((cost.wood || 0) > cq.woodPile) need.push((cost.wood - cq.woodPile) + ' wood');
              if ((cost.stone || 0) > (cq.stonePile || 0)) need.push((cost.stone - (cq.stonePile || 0)) + ' stone');
              if ((cost.gold || 0) > state.gold) need.push((cost.gold - state.gold) + ' gold');
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Need ' + need.join(', '), '#ff6644');
            }
          } else {
            addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Tower at max level!', '#aaaaaa');
          }
          return;
        }
      }
      // V1.2: E key — upgrade barracks
      for (let b of cq.buildings) {
        if (b.type === 'barracks' && dist(state.player.x, state.player.y, b.x, b.y) < 45) {
          let lvIdx = cq.barracksLevel - 1;
          if (lvIdx < 0) lvIdx = 0;
          if (lvIdx >= EXPEDITION_BARRACKS.levels.length - 1) {
            addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Barracks at max level!', '#aaaaaa');
            return;
          }
          let lvData = EXPEDITION_BARRACKS.levels[lvIdx];
          if (lvData && lvData.upgradeCost) {
            let cost = lvData.upgradeCost;
            let canAfford = (cq.woodPile >= (cost.wood || 0)) && ((cq.stonePile || 0) >= (cost.stone || 0)) && (state.gold >= (cost.gold || 0));
            if (canAfford) {
              cq.woodPile -= cost.wood || 0;
              cq.stonePile = (cq.stonePile || 0) - (cost.stone || 0);
              state.gold -= cost.gold || 0;
              cq.barracksLevel++;
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Barracks Lv' + cq.barracksLevel + '!', '#88cc88');
              if (snd) snd.playSFX('upgrade');
            } else {
              let need = [];
              if ((cost.wood || 0) > cq.woodPile) need.push((cost.wood - cq.woodPile) + ' wood');
              if ((cost.stone || 0) > (cq.stonePile || 0)) need.push((cost.stone - (cq.stonePile || 0)) + ' stone');
              if ((cost.gold || 0) > state.gold) need.push((cost.gold - state.gold) + ' gold');
              addFloatingText(w2sX(b.x), w2sY(b.y) - 45, 'Need ' + need.join(', '), '#ff6644');
            }
          }
          return;
        }
      }
      // E key: chop nearest tree (same as click, but proximity-based)
      if (!cq.buildMode) {
        conquestPlayerChop();
        if (cq.chopTarget) return;
      }
      // E key: mine crystal nodes
      if (cq.crystalNodes) {
        let bestCrystal = null, bestCD = 40;
        for (let cn of cq.crystalNodes) {
          if (cn.collected) continue;
          let d = dist(state.player.x, state.player.y, cn.x, cn.y);
          if (d < bestCD) { bestCrystal = cn; bestCD = d; }
        }
        if (bestCrystal) {
          bestCrystal.collected = true;
          state.gold += floor(random(15, 30));
          cq.lootBag.push({ type: 'iron_ore', qty: floor(random(2, 4)) });
          addFloatingText(w2sX(bestCrystal.x), w2sY(bestCrystal.y) - 14, '+Crystal!', '#88ddff');
          spawnParticles(bestCrystal.x, bestCrystal.y, 'crystal', 8);
          if (snd) snd.playSFX('chop');
          return;
        }
      }
      // E key: mine resource deposits (iron ore, stone)
      if (cq.resourceDeposits) {
        let bestRes = null, bestRD = 40;
        for (let rd of cq.resourceDeposits) {
          if (rd.depleted) continue;
          let d = dist(state.player.x, state.player.y, rd.x, rd.y);
          if (d < bestRD) { bestRes = rd; bestRD = d; }
        }
        if (bestRes) {
          bestRes.hp--;
          spawnParticles(bestRes.x, bestRes.y, 'chop', 3);
          if (bestRes.hp <= 0) {
            bestRes.depleted = true;
            let qty = floor(random(2, 5));
            if (bestRes.type === 'iron') {
              cq.lootBag.push({ type: 'iron_ore', qty: qty });
              addFloatingText(w2sX(bestRes.x), w2sY(bestRes.y) - 14, '+' + qty + ' Iron Ore', '#aabbcc');
            } else {
              if (!cq.stonePile) cq.stonePile = 0;
              cq.stonePile += qty;
              addFloatingText(w2sX(bestRes.x), w2sY(bestRes.y) - 14, '+' + qty + ' Stone', '#bbbbbb');
            }
            if (snd) snd.playSFX('chop');
          } else {
            addFloatingText(w2sX(bestRes.x), w2sY(bestRes.y) - 14, 'Mining... (' + bestRes.hp + '/' + bestRes.maxHp + ')', '#cccccc');
          }
          return;
        }
      }
      // E key: fishing spot at coast
      if (cq.fishingSpots) {
        let bestFish = null, bestFD = 50;
        for (let fs of cq.fishingSpots) {
          if (fs.cooldown > 0) continue;
          let d = dist(state.player.x, state.player.y, fs.x, fs.y);
          if (d < bestFD) { bestFish = fs; bestFD = d; }
        }
        if (bestFish) {
          bestFish.cooldown = 600; // 10s cooldown
          let fishTypes = ['Perch', 'Bass', 'Trout', 'Eel'];
          let caught = fishTypes[floor(random(fishTypes.length))];
          state.gold += floor(random(8, 18));
          cq.lootBag.push({ type: 'rare_hide', qty: 1 });
          addFloatingText(w2sX(bestFish.x), w2sY(bestFish.y) - 20, 'Caught a ' + caught + '!', '#44bbdd');
          spawnParticles(bestFish.x, bestFish.y, 'water', 5);
          if (snd) snd.playSFX('water');
          return;
        }
      }
    }
    // Faction abilities Q/R (take priority in combat)
    if (!cq.buildMode && typeof handleFactionAbilityKey === 'function') {
      if (handleFactionAbilityKey(key)) return;
    }
    if (key === 'b' || key === 'B') {
      cq.buildMode = !cq.buildMode;
      if (cq.buildMode) addFloatingText(width / 2, height * 0.35, 'Build Mode — click to place', '#aaddff');
      return;
    }
    // Build type selection
    if (cq.buildMode) {
      let types = Object.keys(CONQUEST_BUILDINGS);
      for (let t of types) {
        if (key === CONQUEST_BUILDINGS[t].key) { cq.buildType = t; return; }
      }
      if (keyCode === 27) { cq.buildMode = false; return; } // ESC exits build
    }
    // Combat skill keys (1/2/3 when not in build mode)
    if (!cq.buildMode && typeof handleCombatSkillKey === 'function') {
      if (handleCombatSkillKey(key)) return;
    }
    // Dodge roll on ALT (enhanced via combat.js)
    if (keyMatchesAction('dodge', key, keyCode)) {
      if (typeof tryDodgeRoll === 'function') tryDodgeRoll();
      return false;
    }
    return;
  }

  // Naval combat — SPACE fires cannons, E boards when sailing
  if (state.rowing && state.rowing.active) {
    if (key === ' ' && typeof playerFireCannons === 'function') { playerFireCannons(); return; }
  }
  // Upgrade shop close
  if (state.upgradeShopOpen) {
    if (keyCode === 27 || key === 'e' || key === 'E') { state.upgradeShopOpen = false; return; }
    return;
  }
  // Night market purchases (1-4 keys while shop open)
  if (state.nightMarket.shopOpen) {
    if (key >= '1' && key <= '4') { buyMarketItem(parseInt(key) - 1); return; }
    if (keyCode === 27 || key === 'e' || key === 'E') { state.nightMarket.shopOpen = false; return; }
    return; // Block other input while market open
  }
  // Wandering merchant purchases (1-3 keys while shop open)
  if (state.activeEvent && state.activeEvent.id === 'wandering_merchant' && state.activeEvent.data.shopOpen) {
    if (key >= '1' && key <= '3') { buyWanderingMerchantItem(parseInt(key) - 1); return; }
    if (keyCode === 27 || key === 'e' || key === 'E') { state.activeEvent.data.shopOpen = false; return; }
    return;
  }
  // Dodge roll on ALT
  if (keyMatchesAction('dodge', key, keyCode)) {
    if (typeof tryDodgeRoll === 'function') tryDodgeRoll();
    return false;
  }

  // Interact
  if (key === 'e' || key === 'E') {
    // Temple interior interactions (advisor, jester, pet, altar)
    if (state.insideTemple) {
      _templeRoomInteractE();
      return;
    }
    // Castrum interior interactions
    if (state.insideCastrum) {
      _castrumRoomInteractE();
      return;
    }
    // Dive from boat — E while rowing in open water
    if (typeof startDive === 'function' && state.rowing && state.rowing.active &&
        !state.conquest.active) {
      startDive(); return;
    }
    // Dive — E near water, but NOT if near the rowboat
    if (typeof startDive === 'function' && !state.rowing.active && !state.buildMode &&
        !state.conquest.active &&
        !state._activeExploration) {
      let _port = typeof getPortPosition === 'function' ? getPortPosition() : { x: 0, y: 0 };
      let _nearBoat = dist(state.player.x, state.player.y, _port.x + 80, _port.y + 20) < 70;
      if (!_nearBoat && isInShallows(state.player.x, state.player.y)) {
        startDive(); return;
      }
    }

    // Random event E-key interactions
    if (interactWanderingMerchant()) return;
    if (interactAncientSpirit()) return;
    if (interactGhostSighting()) return;
    if (interactWanderingSoldier()) return;

    // Crystal rain drop pickup
    if (state.crystalRainDrops && state.crystalRainDrops.length > 0) {
      let nearDrop = state.crystalRainDrops.find(d => !d.collected && dist(state.player.x, state.player.y, d.x, d.y) < 40);
      if (nearDrop) {
        nearDrop.collected = true;
        state.crystals += 1;
        state.solar = min(state.maxSolar, state.solar + 1);
        if (snd) snd.playSFX('crystal');
        addFloatingText(w2sX(nearDrop.x), w2sY(nearDrop.y) - 15, '+1 Crystal +1 Solar', '#44ffaa');
        spawnParticles(nearDrop.x, nearDrop.y, 'divine', 3);
        if (typeof trackStat === 'function') trackStat('crystalsCollected', 1);
        return;
      }
    }

    // God prayer at temple: E near temple → god dialogue → choose blessing → 1-day cooldown
    {
      let nearTemple = state.buildings.find(b => b.type === 'temple' &&
        dist(state.player.x, state.player.y, b.x, b.y) < 50);
      if (nearTemple && state.faction && GODS[state.faction]) {
        let god = GODS[state.faction];
        if (state.god.prayerCooldown <= 0) {
          // Show blessing choice dialog
          let opts = god.blessingOptions;
          let blessingNames = opts.map(b => b.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
          dialogState.active = true;
          dialogState.speaker = god.name;
          dialogState.portrait = null;
          dialogState.text = god.name + ', ' + god.domain + ' deity, hears your prayer. Choose a blessing:';
          dialogState.displayLen = 999;
          dialogState.choices = blessingNames.map((name, i) => ({
            text: name,
            action: function() {
              state.god.blessingActive = opts[i];
              state.god.blessingTimer = 1440; // 1 day
              state.god.prayerCooldown = 1440; // 1 day cooldown
              state.god.ultimateCharge = min(5, state.god.ultimateCharge + 1);
              addFloatingText(width / 2, height * 0.3, god.name + ' blesses you: ' + name + '!', FACTIONS[state.faction].accentColorHex);
              spawnParticles(nearTemple.x, nearTemple.y, 'divine', 12);
              if (snd) snd.playSFX('crystal');
              if (state.god.ultimateCharge >= 5) {
                addFloatingText(width / 2, height * 0.38, 'Ultimate ready! Press G to activate ' + god.ultimate, '#ffd700');
              }
              dialogState.active = false;
            }
          }));
          dialogState.onComplete = null;
          return;
        } else {
          addFloatingText(width / 2, height * 0.3, god.name + ' requires rest before next prayer', '#998866');
          return;
        }
      }
    }

    // Altar prayer: once/day random blessing
    {
      let nearAltar = state.buildings.find(b => b.type === 'altar' &&
        dist(state.player.x, state.player.y, b.x, b.y) < 40);
      if (nearAltar) {
        if (!state._altarPrayedToday) {
          state._altarPrayedToday = true;
          let types = ['crops', 'solar', 'speed', 'luck'];
          state.blessing = { type: types[floor(random(types.length))], timer: 1440 };
          addFloatingText(width / 2, height * 0.3, 'Blessed: ' + state.blessing.type + '!', '#ddaa55');
          spawnParticles(nearAltar.x, nearAltar.y, 'divine', 8);
          if (snd) snd.playSFX('crystal');
        } else {
          addFloatingText(width / 2, height * 0.3, 'Already prayed today', '#998866');
        }
        return;
      }
    }

    // Bakery upgrade: E near bakery shows tier upgrade dialog
    {
      let nearBakery = state.buildings.find(b => b.type === 'bakery' && !b.ruined &&
        dist(state.player.x, state.player.y, b.x, b.y) < 50);
      if (nearBakery) {
        let tier = nearBakery.tier || 1;
        if (tier < 3) {
          let nextTier = tier + 1;
          let tierNames = { 2: 'Stone Oven Bakery', 3: 'Grand Bakery' };
          let tierDescs = { 2: '4 bread/day, -20% food use', 3: '6 bread/day, -40% food use, +2g/day' };
          let tierCosts = { 2: { gold: 80, stone: 15 }, 3: { gold: 150, stone: 30, ironOre: 5 } };
          let cost = tierCosts[nextTier];
          let canAfford = (state.gold >= (cost.gold || 0)) && (state.stone >= (cost.stone || 0)) && (state.ironOre >= (cost.ironOre || 0));
          let costStr = Object.entries(cost).map(([k, v]) => v + ' ' + k).join(', ');
          dialogState.active = true;
          dialogState.speaker = 'Pistrinum';
          dialogState.portrait = null;
          dialogState.text = 'Upgrade to ' + tierNames[nextTier] + '?\n' + tierDescs[nextTier] + '\nCost: ' + costStr;
          dialogState.displayLen = 999;
          dialogState.choices = [
            {
              text: canAfford ? 'Upgrade (Tier ' + nextTier + ')' : 'Cannot afford',
              action: function() {
                if (canAfford) {
                  state.gold -= cost.gold || 0;
                  state.stone -= cost.stone || 0;
                  state.ironOre -= cost.ironOre || 0;
                  nearBakery.tier = nextTier;
                  addFloatingText(width / 2, height * 0.3, tierNames[nextTier] + ' built!', '#dda844');
                  spawnParticles(nearBakery.x, nearBakery.y, 'build', 10);
                  if (snd) snd.playSFX('upgrade');
                }
                dialogState.active = false;
              }
            },
            { text: 'Cancel', action: function() { dialogState.active = false; } }
          ];
          dialogState.onComplete = null;
          return;
        } else {
          addFloatingText(width / 2, height * 0.3, 'Grand Bakery — fully upgraded!', '#dda844');
          return;
        }
      }
    }

    // Discovery event interaction (NPC rescue, etc.)
    if (handleDiscoveryInteract()) return;

    // Narrative interact checks (lore tablets, quest objectives)
    if (typeof state.narrativeFlags !== 'undefined' && state.mainQuest) {
      let px = state.player.x, py = state.player.y;
      // Lore tablet E-key pickup
      if (typeof checkLoreTabletPickup === 'function') checkLoreTabletPickup();
      // Livia scroll near ruins (Chapter 3, objective 2)
      if (state.mainQuest.chapter === 2 && state.npc.hearts >= 4 && !state.narrativeFlags['livia_scroll']) {
        if (state.ruins.length > 0 && dist(px, py, state.ruins[0].x, state.ruins[0].y) < 50) {
          state.narrativeFlags['livia_scroll'] = true;
          addFloatingText(width / 2, height * 0.25, 'Found a hidden scroll!', '#ddc880');
          spawnParticles(px, py, 'divine', 6);
        }
      }
      // Return scroll to Livia (Chapter 3, objective 3)
      if (state.narrativeFlags['livia_scroll'] && !state.narrativeFlags['livia_scroll_return'] && dist(px, py, state.npc.x, state.npc.y) < 60) {
        state.narrativeFlags['livia_scroll_return'] = true;
        addFloatingText(width / 2, height * 0.25, 'Scroll delivered to Livia', '#ddc880');
      }
      // Livia letter — deliver to merchant ship (NPC quest)
      if (state.npcQuests && state.npcQuests.livia && state.npcQuests.livia.active === 'livia_q3' && !state.narrativeFlags['livia_letter']) {
        if (state.ship.state === 'docked' && state.wood >= 5 && state.harvest >= 3) {
          let sp = typeof getPortPosition === 'function' ? getPortPosition() : { x: 0, y: 0 };
          if (dist(px, py, sp.x, sp.y) < 80) {
            state.narrativeFlags['livia_letter'] = true;
            addFloatingText(width / 2, height * 0.25, 'Letter entrusted to the merchant', '#88ccff');
          }
        }
      }
      // Felix manuscript read (NPC quest)
      if (state.npcQuests && state.npcQuests.felix && state.npcQuests.felix.active === 'felix_q3' && !state.narrativeFlags['read_manuscript']) {
        if (state.felix && dist(px, py, state.felix.x, state.felix.y) < 60 && state.harvest >= 3 && state.wood >= 4) {
          state.narrativeFlags['read_manuscript'] = true;
          addFloatingText(width / 2, height * 0.25, 'You read Felix\'s manuscript...', '#88cc88');
        }
      }
    }

    // Rowboat embark/disembark
    if (state.rowing.active) {
      let r = state.rowing;
      // Dock at nearby island
      // Board enemy ship if boarding target available
      if (state.naval && state.naval.boardingTarget && typeof startBoardingCombat === 'function') { startBoardingCombat(); return; }
      if (r.nearIsle === 'conquest') {
        if (state.conquest.colonized) {
          // Colonized — free, peaceful entry
          // enterConquest() deprecated -- openworld seamless
          return;
        }
        // Open modifier selection UI
        state.expeditionModifierSelect = true;
        state.expeditionModifier = state.expeditionModifier || 'normal';
        return;
      }
      if (r.nearIsle === 'wreck') {
        // Dock at wreck beach
        state.rowing.active = false;
        state.wreck._visiting = true;
        state.player.x = WRECK.cx + 40;
        state.player.y = WRECK.cy + 10;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        _startCamTransition(); camZoomTarget = 1.0;
        addFloatingText(width / 2, height * 0.35, 'Wreck Beach', C.sand);
        return;
      }
      if (['vulcan','hyperborea','plenty','necropolis'].includes(r.nearIsle)) {
        let _ei = state[r.nearIsle];
        state.rowing.active = false;
        let _da = atan2(r.y - _ei.isleY, r.x - _ei.isleX);
        state.player.x = _ei.isleX + cos(_da) * _ei.isleRX * 0.6;
        state.player.y = _ei.isleY + sin(_da) * _ei.isleRY * 0.6;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        _startCamTransition(); camZoomTarget = 1.0;
        return;
      }
      if (state.nations && state.nations[r.nearIsle]) {
        // Seamless disembark — don't teleport, just step onto the island
        let _nv = state.nations[r.nearIsle];
        state.rowing.active = false;
        let _dockAng = atan2(r.y - _nv.isleY, r.x - _nv.isleX);
        state.player.x = _nv.isleX + cos(_dockAng) * _nv.isleRX * 0.6;
        state.player.y = _nv.isleY + sin(_dockAng) * _nv.isleRY * 0.6;
        state.player.vx = 0; state.player.vy = 0;
        cam.x = state.player.x; cam.y = state.player.y;
        _startCamTransition(); camZoomTarget = 1.0;
        // Set invasion target if player has army
        if (state.legia && state.legia.army && state.legia.army.length > 0 && !_nv.defeated && !_nv.vassal) {
          state._invasionTarget = r.nearIsle;
        }
        return;
      }
      // Otherwise disembark — snap player back to pier
      let port = getPortPosition();
      state.rowing.active = false;
      state.player.x = port.x + 40;
      state.player.y = port.y;
      state.player.vx = 0;
      state.player.vy = 0;
      addFloatingText(width / 2, height * 0.35, 'Back on solid ground', C.textBright);
      return;
    }
    // Shipyard interaction — E near shipyard building
    if (typeof openShipyard === 'function' && !state.rowing.active) {
      let _syB = (state.buildings || []).find(b => b.type === 'shipyard' && dist(state.player.x, state.player.y, b.x, b.y) < 60);
      if (_syB) { openShipyard(); return; }
    }
    // Check if near rowboat at pier (pier extends left from port) — gate behind villa
    let _canBoard = !state.progression.gameStarted || state.progression.villaCleared;
    let port = getPortPosition();
    let boatWorldX = port.x + 80;
    let boatWorldY = port.y + 20;
    if (_canBoard && dist(state.player.x, state.player.y, boatWorldX, boatWorldY) < 60) {
      state.rowing.active = true;
      state.rowing.x = boatWorldX;
      state.rowing.y = boatWorldY;
      state.rowing.angle = 0; // facing right (east, away from island)
      state.rowing.speed = 0;
      state.rowing.oarPhase = 0;
      state.rowing.wakeTrail = [];
      addFloatingText(width / 2, height * 0.35, 'Rowing the Navis Parva! WASD to sail, E to dock', C.solarBright);
      if (snd && snd.playNarration) snd.playNarration('first_sail');
      return;
    }
    // Visitor trade
    if (state.visitor && !state.visitor.interacted && dist(state.player.x, state.player.y, state.visitor.x, state.visitor.y) < 70) {
      tradeWithVisitor(); return;
    }
    // Temple court visitor trade
    if (state.templeCourt && state.templeCourt.visitors.length > 0) {
      let nearCourt = state.templeCourt.visitors.find(v => !v.traded && !v.walking && dist(state.player.x, state.player.y, v.x, v.y) < 60);
      if (nearCourt) { tradeWithCourtVisitor(nearCourt); return; }
    }
    // Treasure dig
    if (state.activeTreasure && !state.activeTreasure.found) {
      if (digTreasure()) return;
    }
    // Collect bottles
    let nearBottle = state.bottles.find(b => !b.collected && dist(state.player.x, state.player.y, b.x, b.y) < 40);
    if (nearBottle) { collectBottle(nearBottle); return; }
    // E key: mine nearest charged crystal node
    {
      let nearCrystal = state.crystalNodes.find(c =>
        c.charge > 0 && dist(state.player.x, state.player.y, c.x, c.y) < 60
      );
      if (nearCrystal) {
        let pickBonus = state.player.hotbarSlot === 2;
        if (!pickBonus) { state.player.hotbarSlot = 2; addFloatingText(width / 2, height - 110, 'Switched to Pick', '#aaddaa'); }
        state.player.toolSwing = 12;
        state.player._hitlagFrames = 2;
        let amt = nearCrystal.charge >= 30 ? 2 : 1;
        if (pickBonus) amt += 1;
        amt = floor(amt * (getFactionData().crystalIncomeMult || 1));
        state.crystals += amt;
        if (snd) snd.playSFX('crystal');
        state.dailyActivities.crystal += amt;
        if (typeof trackStat === 'function') trackStat('crystalsCollected', amt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('crystal', amt);
        checkQuestProgress('crystal', amt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_crystals_gathered', amt);
        unlockJournal('first_crystal');
        nearCrystal.charge = 0;
        nearCrystal.respawnTimer = state.tools.steelPick ? 400 : 800;
        let csx = w2sX(nearCrystal.x), csy = w2sY(nearCrystal.y);
        addFloatingText(csx, csy - 15, '+' + amt + ' Crystal', C.crystalGlow);
        if (state.dailyActivities.crystal === amt && state.day <= 2) { addFloatingText(csx, csy - 35, 'These power island expansion!', '#88ddff'); }
        spawnCrystalPulse(nearCrystal.x, nearCrystal.y);
        triggerScreenShake(2, 4);
        return;
      }
    }
    // E key: harvest nearest ripe crop
    {
      let nearPlot = state.plots.find(p =>
        p.ripe && dist(state.player.x, state.player.y, p.x, p.y) < 40
      );
      if (nearPlot) {
        let p = nearPlot;
        let hs = state.player.hotbarSlot;
        let toolBonus = hs === 0;
        if (hs !== 0) { state.player.hotbarSlot = 0; addFloatingText(width / 2, height - 110, 'Switched to Sickle', '#aaddaa'); }
        state.player.toolSwing = 12;
        state.player._hitlagFrames = 2;
        let wasBlessed = p.blessed;
        p.planted = false; p.ripe = false; p.glowing = false;
        p.timer = 0; p.stage = 0; p.blessed = false;
        let harvestAmt = (state.npc && state.npc.hearts >= 5) ? 2 : 1;
        if (state.tools && state.tools.sickle) harvestAmt *= 2;
        if (state.blessing && state.blessing.type === 'luck') harvestAmt *= 2;
        if (state.heartRewards && state.heartRewards.includes('golden')) harvestAmt *= 2;
        if (wasBlessed) harvestAmt *= 3;
        if (state.prophecy && state.prophecy.type === 'harvest') harvestAmt += 1;
        let festR = getFestival();
        if (festR && festR.effect.allResources) harvestAmt *= festR.effect.allResources;
        if (toolBonus) harvestAmt += 1;
        if (state.colonySpec && state.colonySpec['conquest'] === 'agricultural') harvestAmt = floor(harvestAmt * 1.3);
        if (typeof getHarvestSkillBonus === 'function') harvestAmt = floor(harvestAmt * getHarvestSkillBonus());
        harvestAmt = floor(harvestAmt * getEventHarvestMult());
        harvestAmt = onHarvestCombo(p, harvestAmt);
        // Crop rotation & soil fertility
        if (typeof onPlotHarvest === 'function') {
          let _rotBonus = onPlotHarvest(p);
          if (_rotBonus) { harvestAmt = floor(harvestAmt * 1.1); addFloatingText(w2sX(p.x), w2sY(p.y) - 65, 'Rotation Bonus! +10%', '#44cc88'); }
        }
        if (typeof hasTech === 'function' && hasTech('selective_breeding') && random() < 0.25) {
          harvestAmt *= 2;
          addFloatingText(w2sX(p.x), w2sY(p.y) - 20, '2x BREED!', '#88cc44');
        }
        state.harvest += harvestAmt;
        state.dailyActivities.harvested += harvestAmt;
        if (snd) snd.playSFX('harvest');
        triggerPlayerJoy();
        unlockJournal('first_harvest');
        if (!state.codex.cropsGrown) state.codex.cropsGrown = {};
        state.codex.cropsGrown[p.cropType || 'grain'] = true;
        let _ck = p.cropType || 'grain';
        if (!state.codex.crops) state.codex.crops = {};
        if (!state.codex.crops[_ck]) state.codex.crops[_ck] = { harvested: true, count: 0, firstDay: state.day };
        state.codex.crops[_ck].count += harvestAmt;
        state.codex.crops[_ck].harvested = true;
        checkQuestProgress('harvest', harvestAmt);
        if (typeof advanceMainQuestCounter === 'function') advanceMainQuestCounter('mq_harvested', harvestAmt);
        if (typeof grantXP === 'function') grantXP(5 * harvestAmt);
        trackMilestone('first_harvest');
        if (typeof trackStat === 'function') trackStat('cropsHarvested', harvestAmt);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('harvest', harvestAmt);
        if (typeof triggerNPCReaction === 'function') triggerNPCReaction('harvest', p.x, p.y);
        let seedBack = 1 + (random() < 0.5 ? 1 : 0);
        if (Object.keys(state.codex.crops).length >= 7) seedBack += 1;
        state.seeds += seedBack;
        let px = w2sX(p.x), py = w2sY(p.y);
        addFloatingText(px, py - 25, '+' + seedBack + ' Seed', '#8fbc8f');
        let scData = getSeasonalCropData(p.cropType);
        if (scData) {
          if (p.cropType === 'sunfruit') { state.solar = min(state.maxSolar, state.solar + 15); addFloatingText(px, py - 35, '+15 Solar!', '#ffaa33'); }
          if (p.cropType === 'frostherb') { state.crystals += 1; addFloatingText(px, py - 35, '+1 Crystal!', '#88ddff'); }
          if (p.cropType === 'pumpkin') { harvestAmt += 2; }
          if (p.cropType === 'wildflower') { spawnParticles(p.x, p.y, 'build', 10); }
        }
        if (p.cropType === 'lotus') { let lc = 1 + floor(random(2)); state.crystals += lc; addFloatingText(px, py - 35, '+' + lc + ' Crystal!', '#f0a0c8'); }
        if (p.cropType === 'pomegranate') { let pg = 3 + floor(random(3)); state.gold += pg; addFloatingText(px, py - 35, '+' + pg + ' Gold!', '#c82828'); }
        if (p.cropType === 'flax') { let fb = 1; state.wood += fb; addFloatingText(px, py - 35, '+' + fb + ' Fiber!', '#6496dc'); }
        let label = wasBlessed ? '+' + harvestAmt + ' BLESSED!' : (harvestAmt > 1 ? '+' + harvestAmt + ' Harvest!' : '+Harvest');
        let labelColor = (typeof getSeasonalCropData === 'function' && getSeasonalCropData(p.cropType)) ? getSeasonalCropData(p.cropType).color : (wasBlessed ? '#ffdd00' : C.cropGlow);
        addFloatingText(px, py - 20, label, labelColor);
        if (typeof spawnHarvestArc === 'function') spawnHarvestArc(px, py - 20, label, labelColor, 'harvest');
        if (typeof markCodexDiscovery === 'function' && state.codex.crops[_ck] && state.codex.crops[_ck].count === harvestAmt) markCodexDiscovery('crops', _ck);
        spawnHarvestBurst(p.x, p.y, p.cropType || 'grain');
        triggerScreenShake(wasBlessed ? 4 : 1.5, wasBlessed ? 8 : 4);
        return;
      }
    }
    // Legia castrum interaction — gate is on south side of building
    if (state.legia && state.legia.castrumLevel > 0 &&
        dist(state.player.x, state.player.y, state.legia.castrumX, state.legia.castrumY + 50) < 40) {
      if (!state.insideCastrum && !_doorTransition) {
        if (snd) snd.playSFX('door_creak');
        state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
        state._castrumReturnX = state.player.x;
        state._castrumReturnY = state.player.y;
        startDoorTransition(function() {
          state.insideCastrum = true;
          state.player.x = CASTRUM_ROOM.cx;
          state.player.y = CASTRUM_ROOM.cy + CASTRUM_ROOM.hh * 0.5;
          state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
          camSmooth.x = CASTRUM_ROOM.cx; camSmooth.y = CASTRUM_ROOM.cy - height * 0.06;
          var ft2 = getFactionTerms();
          addFloatingText(width / 2, height * 0.3, 'Entering ' + ft2.barracks, '#ddccaa');
        });
      }
      return;
    }
    // Night market interaction
    if (state.nightMarket.active) {
      let mp = getMarketPosition();
      if (dist(state.player.x, state.player.y, mp.x, mp.y) < 60) {
        state.nightMarket.shopOpen = !state.nightMarket.shopOpen;
        if (state.nightMarket.shopOpen && snd) snd.playSFX('door_creak');
        return;
      }
    }
    // Rite of Mare Nostrum — crystal shrine (Chapter X)
    if (state.crystalShrine && dist(state.player.x, state.player.y, state.crystalShrine.x, state.crystalShrine.y) < 55) {
      if (state.narrativeFlags && !state.narrativeFlags['rite_mare_nostrum']) {
        let lvlOk = (state.islandLevel || 0) >= 25;
        let heartsOk = state.npc && state.npc.hearts >= 10 &&
                       state.marcus && state.marcus.hearts >= 10 &&
                       state.vesta && state.vesta.hearts >= 10 &&
                       state.felix && state.felix.hearts >= 10;
        if (lvlOk && heartsOk) {
          state.narrativeFlags['rite_mare_nostrum'] = true;
          trackMilestone('game_complete');
          addFloatingText(width / 2, height * 0.18, 'RITE OF MARE NOSTRUM', '#ffd700');
          addFloatingText(width / 2, height * 0.26, 'The crystals sing. The sea is yours.', '#aaddff');
          addFloatingText(width / 2, height * 0.34, 'All hearts aligned. All islands joined.', '#ff88cc');
          spawnParticles(state.crystalShrine.x, state.crystalShrine.y, 'divine', 20);
          if (snd) snd.playSFX('upgrade');
          shakeTimer = 10;
          if (state.mainQuest) {
            state.mainQuest.dialogueQueue.push({ npc: 'livia', line: "Imperator. Not by conquest — by love. By grain and stone and stubborn hope. Rome would not understand. But the gods do. And so do I.", timer: 400 });
          }
          return;
        } else if (!lvlOk) {
          addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'Reach island level 25 first (' + (state.islandLevel || 0) + '/25)', '#aaddff');
          return;
        } else {
          addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'All four must hold you dear (10 hearts each)', '#ff88cc');
          return;
        }
      } else if (state.narrativeFlags && state.narrativeFlags['rite_mare_nostrum']) {
        addFloatingText(w2sX(state.crystalShrine.x), w2sY(state.crystalShrine.y) - 30, 'The rite is complete. Mare Nostrum endures.', '#ffd700');
        return;
      }
    }
    // Temple interior entry — near door (front of pyramid)
    if (!state.insideTemple && !_doorTransition && dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y + 5) < 40) {
      if (snd) snd.playSFX('door_creak');
      state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
      state._templeReturnX = state.player.x;
      state._templeReturnY = state.player.y;
      startDoorTransition(function() {
        state.insideTemple = true;
        state.player.x = TEMPLE_ROOM.cx;
        state.player.y = TEMPLE_ROOM.cy + TEMPLE_ROOM.hh * 0.5;
        state.player.vx = 0; state.player.vy = 0; state.player.moving = false;
        camSmooth.x = TEMPLE_ROOM.cx; camSmooth.y = TEMPLE_ROOM.cy - height * 0.06;
        var _th = TEMPLE_HALLS[state.faction || 'rome'] || TEMPLE_HALLS.rome;
        addFloatingText(width / 2, height * 0.3, 'Entering ' + _th.name, '#ffd080');
        state.templePetX = 0; state.templePetY = 0; state.templeJesterJokedToday = false;
      });
      return;
    }
    // Upgrade Forge at pyramid
    if (dist(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 60) {
      state.upgradeShopOpen = !state.upgradeShopOpen;
      return;
    }
    let p = state.player;
    let n = state.npc;
    let d = dist2(p.x, p.y, n.x, n.y);
    if (d < 80) {
      checkNPCWantSatisfied('livia');
      // Gift priority: wine/oil (2 hearts), meals (1 heart), harvest (1 heart)
      let giftHearts = 0;
      let giftName = '';
      if (state.wine > 0) {
        state.wine--; giftHearts = 2; giftName = 'Wine';
      } else if (state.oil > 0) {
        state.oil--; giftHearts = 2; giftName = 'Olive Oil';
      } else if (state.meals > 0) {
        state.meals--; giftHearts = 1; giftName = 'Meal';
      } else if (state.harvest > 0) {
        state.harvest--; giftHearts = 1; giftName = 'Harvest';
      }
      if (giftHearts > 0) {
        n.hearts = min(10, n.hearts + giftHearts);
        let _liviaGiftLine = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue('livia') : null;
        n.currentLine = _liviaGiftLine || n.lines[floor(random(n.lines.length))];
        n.dialogTimer = 180;
        let heartText = giftHearts > 1 ? '♥ +' + giftHearts + ' Hearts (' + giftName + ')' : '♥ +Heart';
        addFloatingText(w2sX(n.x), w2sY(n.y) - 30, heartText, '#ff6688');
        npcHeartPop(n);
        if (snd) snd.playSFX('gift_accepted');
        state.dailyActivities.gifted++;
        if (typeof trackStat === 'function') trackStat('giftsGiven', 1);
        if (typeof checkDailyQuestProgress === 'function') checkDailyQuestProgress('gift', 1);
        unlockJournal('npc_friend');
        if (n.hearts >= 5) unlockJournal('five_hearts');
        checkHeartMilestones(n.hearts);
        if (typeof addNPCMemory === 'function') addNPCMemory('livia', 'gift', giftName);
      } else {
        if (snd) snd.playSFX('dialogue_open');
        if (typeof addNPCMemory === 'function') addNPCMemory('livia', 'chat');
        // Check for Livia personal quest first
        let _liviaQ = (typeof getAvailableNPCQuest === 'function' && state.npcQuests) ? getAvailableNPCQuest('livia') : null;
        if (_liviaQ && !state.npcQuests.livia.active) {
          startNPCQuest('livia', _liviaQ); n.dialogTimer = 250;
        } else if (!state.quest) {
          state.quest = generateQuest();
          n.dialogTimer = 200;
          addFloatingText(w2sX(n.x), w2sY(n.y) - 30, 'New Quest: ' + state.quest.desc, C.solarBright);
        } else {
          // Show expanded dialogue or fall back to generic lines
          let _liviaLine = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue('livia') : null;
          n.dialogTimer = 150;
          n.currentLine = _liviaLine || n.lines[floor(random(n.lines.length))];
          addFloatingText(w2sX(n.x), w2sY(n.y) - 30, state.quest.desc + ' (' + state.quest.progress + '/' + state.quest.target + ')', C.textBright);
        }
      }
    }

    // New NPC interactions
    let newNpcs = [
      { npc: state.marcus, lines: MARCUS_LINES, mid: MARCUS_LINES_MID, high: MARCUS_LINES_HIGH, name: 'Marcus' },
      { npc: state.vesta, lines: VESTA_LINES, mid: VESTA_LINES_MID, high: VESTA_LINES_HIGH, name: 'Vesta' },
      { npc: state.felix, lines: FELIX_LINES, mid: FELIX_LINES_MID, high: FELIX_LINES_HIGH, name: 'Felix' },
    ];
    newNpcs.forEach(({ npc: nn, lines, mid, high, name }) => {
      if (!nn) return;
      if (name === 'Marcus' && !nn.present) return;
      let dd = dist2(p.x, p.y, nn.x, nn.y);
      if (dd < 80) {
        checkNPCWantSatisfied(name.toLowerCase());
        // Gift check
        let giftH = 0, giftN = '';
        let wineBonus = (state.prophecy && state.prophecy.type === 'wine') ? 2 : 1;
        if (state.wine > 0) { state.wine--; giftH = 2 * wineBonus; giftN = 'Wine'; }
        else if (state.oil > 0) { state.oil--; giftH = 2 * wineBonus; giftN = 'Oil'; }
        else if (state.meals > 0) { state.meals--; giftH = 1; giftN = 'Meal'; }
        else if (state.harvest > 0) { state.harvest--; giftH = 1; giftN = 'Harvest'; }
        else if (state.fish > 0 && name === 'Marcus') { state.fish--; giftH = 1; giftN = 'Fish'; }
        else if (state.crystals > 1 && name === 'Vesta') { state.crystals--; giftH = 1; giftN = 'Crystal'; }

        if (state.prophecy && state.prophecy.type === 'hearts') giftH += 1;
        // Gift preference multiplier
        if (giftH > 0 && typeof getGiftMultiplier === 'function') {
          let _giftType = giftN.toLowerCase() === 'wine' ? 'wine' : giftN.toLowerCase() === 'oil' ? 'oil' : giftN.toLowerCase() === 'meal' ? 'meals' : giftN.toLowerCase() === 'harvest' ? 'harvest' : giftN.toLowerCase() === 'fish' ? 'fish' : giftN.toLowerCase() === 'crystal' ? 'crystals' : giftN.toLowerCase();
          giftH = ceil(giftH * getGiftMultiplier(name.toLowerCase(), _giftType));
        }
        let festH = getFestival();
        if (festH && festH.effect.hearts) giftH *= festH.effect.hearts;
        let calicoCat = state.cats.find(c => c.adopted && c.passive === 'hearts');
        if (calicoCat && giftH > 0) giftH = ceil(giftH * 1.05);

        if (giftH > 0) {
          nn.hearts = min(10, nn.hearts + giftH);
          let maxH = max(state.npc.hearts, state.marcus ? state.marcus.hearts : 0, state.vesta.hearts, state.felix.hearts);
          if (maxH > state.codex.npcMaxHearts) state.codex.npcMaxHearts = maxH;
          nn.currentLine = getNPCDialogue(nn, lines, mid, high, name.toLowerCase());
          nn.dialogTimer = 180;
          npcHeartPop(nn);
          if (snd) snd.playSFX('gift_accepted');
          state.dailyActivities.gifted++;
          let ht = giftH > 1 ? '+' + giftH + ' Hearts (' + giftN + ')' : '+Heart';
          addFloatingText(w2sX(nn.x), w2sY(nn.y) - 30, ht, '#ff6688');
          if (typeof addNPCMemory === 'function') addNPCMemory(name.toLowerCase(), 'gift', giftN);
        } else {
          if (snd) snd.playSFX('dialogue_open');
          // Offer NPC personal quest or use expanded dialogue
          let _nk = name.toLowerCase();
          let _aq = (typeof getAvailableNPCQuest === 'function' && state.npcQuests) ? getAvailableNPCQuest(_nk) : null;
          if (_aq && !state.npcQuests[_nk].active) {
            startNPCQuest(_nk, _aq); nn.dialogTimer = 250;
          } else {
            let _ed = (typeof getExpandedDialogue === 'function') ? getExpandedDialogue(_nk) : null;
            nn.currentLine = _ed || getNPCDialogue(nn, lines, mid, high, _nk);
            nn.dialogTimer = 150;
          }
          if (typeof addNPCMemory === 'function') addNPCMemory(_nk, 'chat');
        }
      }
    });
  }

  // Fishing / Trade with ship
  if (keyMatchesAction('fish', key, keyCode)) {
    if (state.fishing.active && state.fishing.phase === 'strike') {
      // Successful strike!
      reelFish();
    } else if (state.fishing.active && state.fishing.phase === 'wait') {
      // Too early!
      addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 30, 'Too early!', '#ff8866');
      state.fishing.phase = 'cooldown';
      state.fishing.phaseTimer = 120; // 2 second cooldown
      state.fishing.bobberDip = 0;
      state.fishing.bite = false;
      state.fishing.streak = 0;
      if (snd) snd.playSFX('water');
    } else if (state.fishing.active && (state.fishing.phase === 'reel' || state.fishing.phase === 'cooldown' || state.fishing.phase === 'cast')) {
      // Ignore during these phases
    } else if (state.ship.shopOpen && state.ship.state === 'docked') {
      // Trade handled by number keys below
    } else if (!state.fishing.active && !state.buildMode) {
      // Auto-switch to rod for fishing
      if (state.player.hotbarSlot !== 3) { state.player.hotbarSlot = 3; addFloatingText(width / 2, height - 110, 'Switched to Rod', '#aaddaa'); }
      startFishing();
    }
  }
  // Legia UI number keys
  if (state.legia && state.legia.legiaUIOpen) {
    if (key === 'l' || key === 'L' || key === 'e' || key === 'E') { state.legia.legiaUIOpen = false; return; }
    if ((key === 'r' || key === 'R') && state.legia.soldiers && state.legia.soldiers.length > 0) {
      state.legia.marching = true;
      state.legia.legiaUIOpen = false;
      addFloatingText(width / 2, height * 0.3, 'The legion marches! Board your ship.', '#cc4444');
      return;
    }
    if (handleLegiaKey(key)) return;
    return; // block all other keys while legiaUI open
  }

  // Shop tab switching with number keys when shop is open
  if (state.ship.shopOpen && state.ship.state === 'docked') {
    let tabs = ['buy', 'sell', 'upgrade'];
    let tabIdx = parseInt(key) - 1;
    if (tabIdx >= 0 && tabIdx < 3) {
      state.ship.shopTab = tabs[tabIdx];
    }
  }

  // Crop select (when not in build mode or shop)
  if (!state.buildMode && !(state.ship.shopOpen && state.ship.state === 'docked')) {
    if (key === '1') { state.cropSelect = 'grain'; addFloatingText(width / 2, height * 0.4, 'Crop: Grain', C.vineLight); }
    if (key === '2') { state.cropSelect = 'grape'; addFloatingText(width / 2, height * 0.4, 'Crop: Grape', '#9040a0'); }
    if (key === '3') { state.cropSelect = 'olive'; addFloatingText(width / 2, height * 0.4, 'Crop: Olive', '#607030'); }
    if (key === '4') {
      let sc = getSeasonalCrop();
      if (sc) { state.cropSelect = sc.id; addFloatingText(width / 2, height * 0.4, 'Crop: ' + sc.name, sc.color); }
    }
    if (key === '5' && state.flaxSeeds > 0) { state.cropSelect = 'flax'; addFloatingText(width / 2, height * 0.4, 'Crop: Flax', '#6496dc'); }
    if (key === '6' && state.pomegranateSeeds > 0) { state.cropSelect = 'pomegranate'; addFloatingText(width / 2, height * 0.4, 'Crop: Pomegranate', '#c82828'); }
    if (key === '7' && state.lotusSeeds > 0) { state.cropSelect = 'lotus'; addFloatingText(width / 2, height * 0.4, 'Crop: Sacred Lotus', '#f0a0c8'); }
  }

  // Dive attack — SPACE while underwater
  if (state.diving && state.diving.active && (key === ' ' || key === 'j' || key === 'J')) {
    let p = state.player;
    if (p.attackTimer <= 0) {
      p.attackTimer = p.attackCooldown;
      p.slashPhase = 10;
      p.toolSwing = 12;
      if (snd) snd.playSFX('hit');
    }
    return;
  }

  // Hotbar 1-0 direct select
  if (!state.buildMode && !state.conquest.active) {
    let numKey = key === '0' ? 9 : parseInt(key) - 1;
    if (numKey >= 0 && numKey < HOTBAR_ITEMS.length) {
      let item = HOTBAR_ITEMS[numKey];
      // Consumable items (slots 5+) — use immediately instead of selecting
      if (numKey === 5) { usePotion(); return; }
      if (numKey === 6) { useStew(); return; }
      if (numKey === 7 || numKey === 8) { state.player.hotbarSlot = numKey; addFloatingText(width / 2, height - 110, item.name, '#aaddaa'); return; }
      if (numKey === 9) { useAmbrosia(); return; }
      state.player.hotbarSlot = numKey;
      addFloatingText(width / 2, height - 110, item.name, '#aaddaa');
      return;
    }
  }

  // Dialog advance with Space
  if (dialogState.active && key === ' ') { advanceDialog(); return; }

  // Empire Dashboard toggle (Tab)
  if (keyCode === 9) {
    if (state.codexOpen) {
      state.journalOpen = !state.journalOpen;
    } else {
      empireDashOpen = !empireDashOpen;
      if (empireDashOpen) inventoryOpen = false;
    }
    if (snd) snd.playSFX('page_turn');
    return false; // prevent browser tab switching
  }

  // V key: Call to Arms (if army exists) or Wardrobe toggle
  if (key === 'v' || key === 'V') {
    if (gameScreen === 'game' && !state.diving.active && !state.rowing.active) {
      // Call to Arms: teleport army to player
      if (state.legia && state.legia.army && state.legia.army.length > 0 && !state.legia.garrison) {
        if (!state._callToArmsCooldown || state._callToArmsCooldown <= 0) {
          let army = state.legia.army;
          for (let i = 0; i < army.length; i++) {
            let angle = (i / army.length) * Math.PI * 2;
            army[i].x = state.player.x + Math.cos(angle) * (50 + Math.random() * 50);
            army[i].y = state.player.y + Math.sin(angle) * (50 + Math.random() * 50);
          }
          if (typeof _currentFormation !== 'undefined') _currentFormation = 'battle';
          if (typeof addFloatingText === 'function') addFloatingText(width / 2, height * 0.25, 'CALL TO ARMS!', '#ff4444');
          if (typeof snd !== 'undefined' && snd) snd.playSFX('war_horn');
          if (typeof triggerScreenShake === 'function') triggerScreenShake(4, 12, 0, 0, 'random');
          state._callToArmsCooldown = 60;
          return;
        }
      }
      // Fallback: wardrobe
      wardrobeOpen = !wardrobeOpen;
      return;
    }
  }

  // Inventory toggle (I key)
  if (keyMatchesAction('inventory', key, keyCode)) {
    inventoryOpen = !inventoryOpen;
    if (inventoryOpen) empireDashOpen = false;
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // Character Equipment toggle (O key)
  if (key === 'o' || key === 'O') {
    equipmentWindowOpen = !equipmentWindowOpen;
    if (equipmentWindowOpen) { empireDashOpen = false; inventoryOpen = false; }
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // Achievements panel toggle (U key)
  if (key === 'u' || key === 'U') {
    state.achievementsPanelOpen = !state.achievementsPanelOpen;
    if (state.achievementsPanelOpen) { empireDashOpen = false; inventoryOpen = false; }
    return;
  }
  if (state.achievementsPanelOpen) {
    if (key === '1') { state._achTab = 0; return; }
    if (key === '2') { state._achTab = 1; return; }
    if (key === '3') { state._achTab = 2; return; }
    if (keyCode === UP_ARROW) { state._achScroll = Math.max(0, (state._achScroll || 0) - 1); return; }
    if (keyCode === DOWN_ARROW) { state._achScroll = Math.min(ACHIEVEMENTS.length - 1, (state._achScroll || 0) + 1); return; }
  }

  // Skill tree toggle (K key)
  // HUD minimize toggle (H key)
  if (key === 'h' || key === 'H') {
    state.hudMinimized = !state.hudMinimized;
    addFloatingText(width / 2, height * 0.1, state.hudMinimized ? 'HUD minimized (H to expand)' : 'HUD expanded', '#ffdc50');
    return;
  }

  if (key === 'k' || key === 'K') {
    if (typeof toggleSkillTree === 'function') toggleSkillTree();
    return;
  }

  // Legion panel toggle (L key)
  if (keyMatchesAction('legia', key, keyCode)) {
    if (state.legia && state.legia.castrumLevel >= 1) {
      state.legia.legiaUIOpen = !state.legia.legiaUIOpen;
      return;
    }
  }

  // Naturalist's Codex toggle (N key)
  if (key === 'n' || key === 'N') {
    state.naturalistOpen = !state.naturalistOpen;
    if (state.naturalistOpen) { state.codexOpen = false; state.journalOpen = false; }
    return;
  }
  if (state.naturalistOpen) {
    if (key === '1') { state.naturalistTab = 0; return; }
    if (key === '2') { state.naturalistTab = 1; return; }
    if (key === '3') { state.naturalistTab = 2; return; }
    if (key === '4') { state.naturalistTab = 3; return; }
    if (key === '5') { state.naturalistTab = 4; return; }
    if (key === '6') { state.naturalistTab = 5; return; }
  }

  // Recipe Book toggle (G key)
  if (keyMatchesAction('recipeBook', key, keyCode)) {
    if (typeof recipeBookOpen !== 'undefined') {
      recipeBookOpen = !recipeBookOpen;
      return;
    }
  }

  // Block input when overlays are open
  if (empireDashOpen || inventoryOpen || equipmentWindowOpen || state.naturalistOpen || wardrobeOpen || (typeof recipeBookOpen !== 'undefined' && recipeBookOpen)) return;
  if (state.techTreeOpen) return; // tech tree blocks other input

  // Tech tree toggle (Y key)
  if (key === 'y' || key === 'Y') {
    state.techTreeOpen = !state.techTreeOpen;
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // World Map toggle (M key)
  if (keyMatchesAction('map', key, keyCode)) {
    if (typeof worldMapOpen !== 'undefined') {
      worldMapOpen = !worldMapOpen;
      if (snd) snd.playSFX('page_turn');
    }
    return;
  }

  // Villa Codex toggle (C key)
  if (key === 'c' || key === 'C') {
    state.codexOpen = !state.codexOpen;
    state.journalOpen = false;
    if (snd) snd.playSFX('page_turn');
    return;
  }

  // Demolish confirmation: E to confirm, ESC handled above
  if (state.demolishConfirm && (key === 'e' || key === 'E')) {
    let dc = state.demolishConfirm;
    let b = dc.building;
    let idx = state.buildings.indexOf(b);
    if (idx >= 0) {
      state.buildings.splice(idx, 1);
      let refundParts = [];
      for (let res in dc.refund) {
        state[res] = (state[res] || 0) + dc.refund[res];
        let name = res === 'ironOre' ? 'iron' : res;
        refundParts.push('+' + dc.refund[res] + ' ' + name);
      }
      let sx = w2sX(b.x), sy = w2sY(b.y);
      addFloatingText(sx, sy - 20, 'Demolished', '#ff6644');
      if (refundParts.length > 0) {
        addFloatingText(sx, sy - 40, refundParts.join(', '), '#44cc44');
      }
      spawnParticles(b.x, b.y, 'chop', 6);
      if (snd) snd.playSFX('chop');
    }
    state.demolishConfirm = null;
    return;
  }

  // Build mode toggle
  if (keyMatchesAction('buildMode', key, keyCode)) {
    state.buildMode = !state.buildMode;
    state.demolishMode = false;
    state.demolishConfirm = null;
    if (state.buildMode) {
      addFloatingText(width / 2, height * 0.4, 'BUILD MODE ON', C.crystalGlow);
    } else {
      addFloatingText(width / 2, height * 0.4, 'BUILD MODE OFF', C.textDim);
      state._buildExitFrame = frameCount;
    }
  }

  // Build type selection
  if (state.buildMode) {
    if (key === '1') state.buildType = 'floor';
    if (key === '2') state.buildType = 'wall';
    if (key === '3') state.buildType = 'door';
    if (key === '4') state.buildType = 'chest';
    if (key === '5') state.buildType = 'bridge';
    if (key === '6') state.buildType = 'fence';
    if (key === '7') state.buildType = 'torch';
    if (key === '8') state.buildType = 'flower';
    if (key === '9') state.buildType = 'lantern';
    if (key === '0') state.buildType = 'mosaic';
    if (key === '-') state.buildType = 'aqueduct';
    if (key === '=') state.buildType = 'bath';
    if (key === 'r' || key === 'R' || key === 'q' || key === 'Q') {
      if (ROTATABLE_TYPES.includes(state.buildType)) {
        state.buildRotation = (state.buildRotation + 1) % 4;
        addFloatingText(width / 2, height * 0.4, 'Rotated ' + (state.buildRotation * 90) + '\u00B0', '#aaddff');
      }
      return; // prevent R from giving seeds while in build mode
    }
    if (keyMatchesAction('demolish', key, keyCode)) {
      state.demolishMode = !state.demolishMode;
      state.demolishConfirm = null;
      addFloatingText(width / 2, height * 0.4, state.demolishMode ? 'DEMOLISH MODE — click building' : 'DEMOLISH OFF', state.demolishMode ? '#ff6644' : C.textDim);
    }
  }

  // Expand island (only when not in build mode)
  if (!state.buildMode && (key === 'x' || key === 'X')) {
    expandIsland();
  }

  // Build Imperial Bridge (G key — near pyramid)
  if (key === 'g' || key === 'G') {
    let nearPyramid = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 70;
    if (nearPyramid && typeof canBuildBridge === 'function' && canBuildBridge()) {
      startBuildBridge();
    }
  }

  // Pray at temple
  if (key === 't' || key === 'T') {
    // Try awakening Lares first
    if (tryAwakenLares()) return;
    let pd = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y);
    if (pd < 100) {
      prayAtTemple();
    } else {
      addFloatingText(width / 2, height * 0.4, 'Get closer to the temple', C.textDim);
    }
  }

  // God ultimate — G key (requires 5 prayers)
  if (key === 'g' || key === 'G') {
    if (state.god && state.god.ultimateCharge >= 5 && state.faction && GODS[state.faction]) {
      let god = GODS[state.faction];
      state.god.ultimateCharge = 0;
      addFloatingText(width / 2, height * 0.25, god.ultimate + '!', '#ffd700');
      spawnParticles(state.player.x, state.player.y, 'divine', 20);
      if (snd) snd.playSFX('fanfare');
      // Apply ultimate effect based on faction
      if (state.faction === 'rome') { state.player.battleCryTimer = 600; } // 10 sec battle fury
      else if (state.faction === 'carthage') { state.gold += 100; }
      else if (state.faction === 'egypt') { state.solar = state.maxSolar; state.crystals += 10; }
      else if (state.faction === 'greece') { state.player.xp += 200; }
      else if (state.faction === 'seapeople') { state.fish += 50; state.wood += 20; }
      else if (state.faction === 'persia') { state.gold += 80; if (state.colonies) for (let ck of Object.keys(state.colonies)) state.colonies[ck].gold += 30; }
      else if (state.faction === 'phoenicia') { state.gold += 60; state.tradeRoutes.forEach(r => { r.goldEarned += 50; }); }
      else if (state.faction === 'gaul') { state.wood += 30; state.stone += 20; state.harvest += 20; }
      trackMilestone('god_ultimate_' + state.faction);
    }
  }

  // Cook — C key near a brazier/torch building; also Colony at pyramid
  if (key === 'c' || key === 'C') {
    // Colony management at pyramid takes priority
    let nearPyramid = dist2(state.player.x, state.player.y, state.pyramid.x, state.pyramid.y) < 70;
    if (nearPyramid && canColonize()) {
      colonizeTerraNovaAction();
      return;
    }
    if (nearPyramid && state.conquest.colonized && state.conquest.colonyLevel < 10) {
      upgradeColony();
      return;
    }
    if (state.cooking.active) {
      addFloatingText(width / 2, height * 0.4, 'Already cooking...', C.textDim);
    } else {
      let nearBrazier = state.buildings.some(b => {
        if (b.type !== 'torch') return false;
        return dist2(state.player.x, state.player.y, b.x, b.y) < 80;
      });
      if (nearBrazier) {
        // Try recipes in order of value (best first)
        let cooked = false;
        for (let i = RECIPES.length - 1; i >= 0; i--) {
          if (canCook(RECIPES[i])) {
            cookRecipe(RECIPES[i]);
            state.cooking.active = true;
            let festCook = getFestival();
            let instantCook = (state.prophecy && state.prophecy.type === 'cooking') || (festCook && festCook.effect.cooking);
            state.cooking.timer = instantCook ? 1 : 120;
            state.cooking.recipe = RECIPES[i].name;
            addFloatingText(width / 2, height * 0.35, 'Cooking ' + RECIPES[i].name + '...', C.solarBright);
            cooked = true;
            break;
          }
        }
        if (!cooked) {
          addFloatingText(width / 2, height * 0.4, 'No ingredients! Need harvest + fish', C.textDim);
        }
      } else {
        addFloatingText(width / 2, height * 0.4, 'Build a Brazier first, then stand near it', C.textDim);
      }
    }
  }

  // Photo mode toggle
  if (key === 'p' || key === 'P') {
    photoMode = !photoMode;
    if (photoMode) {
      photoModeWatermarkAlpha = 0;
      photoModeTipTimer = 120; // ~2 seconds at 60fps
    }
    addFloatingText(width / 2, height * 0.3, photoMode ? 'PHOTO MODE' : 'HUD RESTORED', '#ffdc50');
  }
  // Save / Load
  if (key === 'l' || key === 'L') { loadGame(); }

  // Debug seeds
  if (key === 'r' || key === 'R') {
    state.seeds += 3;
    addFloatingText(width / 2, height * 0.4, '+3 Seeds', C.vineLight);
  }
}
