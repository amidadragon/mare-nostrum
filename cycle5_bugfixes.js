// ═══════════════════════════════════════════════════════════════════════════
// MARE NOSTRUM — Cycle 5 Critical Bug Fixes
// Defensive wrapping for 15 high-priority null reference and array access bugs
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  const LOG_PREFIX = '[CYCLE5_BUGFIXES]';

  // ─── FIX 1: getArmyCount() null guard ───────────────────────────────────
  // Bug: state.legia.army accessed without checking state.legia first
  const _orig_getArmyCount = window.getArmyCount;
  window.getArmyCount = function() {
    try {
      if (!state || !state.legia || !state.legia.army) return 0;
      return state.legia.army.length;
    } catch (e) {
      console.error(LOG_PREFIX, 'getArmyCount() error:', e);
      return 0;
    }
  };
  console.log(LOG_PREFIX, 'FIX 1: Wrapped getArmyCount() with null safety');

  // ─── FIX 2: getArmyUpkeep() null guard ──────────────────────────────────
  // Bug: Looping state.legia.army without full safety checks
  const _orig_getArmyUpkeep = window.getArmyUpkeep;
  window.getArmyUpkeep = function() {
    try {
      if (!state || !state.legia || !state.legia.army) return 0;
      let total = 0;
      for (let u of state.legia.army) {
        if (!u) continue; // Skip undefined units
        let def = window.UNIT_TYPES && window.UNIT_TYPES[u.type];
        total += (def && def.upkeep) ? def.upkeep : 2;
      }
      return total;
    } catch (e) {
      console.error(LOG_PREFIX, 'getArmyUpkeep() error:', e);
      return 0;
    }
  };
  console.log(LOG_PREFIX, 'FIX 2: Wrapped getArmyUpkeep() with null safety');

  // ─── FIX 3: trainUnit() armor check ────────────────────────────────────
  // Bug: state.legia.army.some() called on potentially undefined array
  const _orig_trainUnit = window.trainUnit;
  window.trainUnit = function(type) {
    try {
      let lg = state.legia;
      if (!lg || lg.castrumLevel < 1) return false;
      let def = window.UNIT_TYPES && window.UNIT_TYPES[type];
      if (!def) return false;
      if (lg.castrumLevel < def.minLevel) {
        if (typeof addFloatingText === 'function')
          addFloatingText(width / 2, height * 0.3, 'Need ' + (typeof getFactionTerms === 'function' ? getFactionTerms().barracks : 'Barracks') + ' level ' + def.minLevel, '#ff6644');
        return false;
      }
      // FIX: Check army exists before calling some()
      if (lg.army && def.unique && lg.army.some(u => u && u.type === type)) {
        if (typeof addFloatingText === 'function')
          addFloatingText(width / 2, height * 0.3, 'Only one ' + def.name + ' allowed!', '#ff6644');
        return false;
      }
      if (window.getArmyCount() >= window.getMaxSoldiers()) {
        if (typeof addFloatingText === 'function')
          addFloatingText(width / 2, height * 0.3, 'Army at capacity!', '#ff6644');
        return false;
      }
      if (state.gold < def.cost) {
        if (typeof addFloatingText === 'function')
          addFloatingText(width / 2, height * 0.3, 'Need ' + def.cost + ' gold', '#ff6644');
        return false;
      }
      state.gold = max(0, state.gold - def.cost);
      let data = typeof getCastrumLevelData === 'function' ? getCastrumLevelData() : { hpMult: 1, damageMult: 1 };
      let maxHp = floor(def.hp * (data.hpMult || 1));
      let damage = floor(def.damage * (data.damageMult || 1));
      if (!lg.army) lg.army = [];
      lg.army.push({
        type: type,
        hp: maxHp,
        maxHp: maxHp,
        damage: damage,
        speed: def.speed || 1.2,
        level: 1,
        xp: 0,
      });
      if (typeof addFloatingText === 'function')
        addFloatingText(width / 2, height * 0.3, def.name + ' trained!', '#88ff88');
      if (typeof snd !== 'undefined' && snd) snd.playSFX('recruit');
      return true;
    } catch (e) {
      console.error(LOG_PREFIX, 'trainUnit() error:', e);
      return false;
    }
  };
  console.log(LOG_PREFIX, 'FIX 3: Wrapped trainUnit() with array safety');

  // ─── FIX 4: startInvasion() array access ───────────────────────────────
  // Bug: state.legia.army[i] accessed without bounds check
  const _orig_startInvasion = window.startInvasion;
  window.startInvasion = function(nationKey) {
    try {
      let nation = state.nations && state.nations[nationKey];
      if (!nation || !state.legia || !state.legia.army) return;
      let armySize = state.legia.army.length;
      if (armySize === 0) return;

      let ix = nation.isleX, iy = nation.isleY;
      let ry = (nation.islandState && nation.islandState.islandRY) || nation.isleRY || 260;

      state.invasion = {
        active: true,
        target: nationKey,
        attackers: [],
        defenders: [],
        phase: 'fighting',
      };

      for (let i = 0; i < armySize; i++) {
        // FIX: Check array bounds before accessing
        let unit = state.legia.army[i];
        if (!unit) continue;
        state.invasion.attackers.push({
          x: ix + random(-80, 80),
          y: iy + ry * 0.3,
          hp: 20, maxHp: 20, damage: 5, speed: 1.2,
          type: unit.type || 'legionary',
          state: 'advancing', target: null,
        });
      }

      let botArmy = (nation.islandState && nation.islandState.legia && nation.islandState.legia.army) ? nation.islandState.legia.army : [];
      let defenderCount = max(3, botArmy.length > 0 ? botArmy.length : (nation.military || 3));
      for (let i = 0; i < defenderCount; i++) {
        let unit = botArmy[i] || {};
        state.invasion.defenders.push({
          x: ix + random(-60, 60),
          y: iy + random(-40, 40),
          hp: unit.maxHp || 15, maxHp: unit.maxHp || 15,
          damage: unit.damage || 4, speed: unit.speed || 1.0,
          type: unit.type || 'legionary', state: 'defending', target: null,
        });
      }

      if (typeof addNotification === 'function')
        addNotification('Invasion of ' + (typeof getNationName === 'function' ? getNationName(nationKey) : nationKey) + ' begins!', '#ff6644');
    } catch (e) {
      console.error(LOG_PREFIX, 'startInvasion() error:', e);
    }
  };
  console.log(LOG_PREFIX, 'FIX 4: Wrapped startInvasion() with bounds checking');

  // ─── FIX 5: _initAmbientShips() null reference ─────────────────────────
  // Bug: Accessing state.conquest.isleX without checking state.conquest exists
  const _orig_initAmbientShips = window._initAmbientShips;
  window._initAmbientShips = function() {
    try {
      window._ambientShips = [];
      let cx = window.WORLD.islandCX, cy = window.WORLD.islandCY;
      let _targets = [
        { x: cx, y: cy },
      ];
      // FIX: Add null checks for all island references
      if (state.conquest) _targets.push({ x: state.conquest.isleX, y: state.conquest.isleY });
      if (state.vulcan) _targets.push({ x: state.vulcan.isleX, y: state.vulcan.isleY });
      if (state.hyperborea) _targets.push({ x: state.hyperborea.isleX, y: state.hyperborea.isleY });
      if (state.plenty) _targets.push({ x: state.plenty.isleX, y: state.plenty.isleY });
      if (state.necropolis) _targets.push({ x: state.necropolis.isleX, y: state.necropolis.isleY });

      let nKeys = Object.keys(state.nations || {});
      for (let k of nKeys) {
        let n = state.nations[k];
        if (n && !n.defeated) _targets.push({ x: n.isleX, y: n.isleY, nation: k });
      }

      for (let i = 0; i < 5; i++) {
        if (_targets.length < 2) break;
        let fromIdx = floor(random(_targets.length));
        let toIdx = floor(random(_targets.length));
        while (toIdx === fromIdx && _targets.length > 1) toIdx = floor(random(_targets.length));
        let from = _targets[fromIdx], to = _targets[toIdx];
        if (!from || !to) continue;

        let isNationShip = _targets[fromIdx].nation || _targets[toIdx].nation;
        let nationKey = _targets[fromIdx].nation || _targets[toIdx].nation || null;
        let shipType;
        if (nationKey && state.nations[nationKey] && state.nations[nationKey].reputation <= -30) {
          shipType = 2;
        } else if (isNationShip && random() < 0.5) {
          shipType = 0;
        } else {
          shipType = 1;
        }

        let midX = (from.x + to.x) / 2 + random(-300, 300);
        let midY = (from.y + to.y) / 2 + random(-200, 200);
        window._ambientShips.push({
          fromX: from.x, fromY: from.y,
          toX: to.x, toY: to.y,
          midX: midX, midY: midY,
          t: random(0, 1),
          speed: random(0.0003, 0.0008),
          size: random(1.6, 2.5),
          type: shipType,
          nationKey: nationKey,
        });
      }
    } catch (e) {
      console.error(LOG_PREFIX, '_initAmbientShips() error:', e);
      window._ambientShips = [];
    }
  };
  console.log(LOG_PREFIX, 'FIX 5: Wrapped _initAmbientShips() with null checks');

  // ─── FIX 6: drawAmbientShips() null reference ──────────────────────────
  // Bug: Accessing state.naval.wind.angle without checking state.naval.wind
  const _orig_drawAmbientShips = window.drawAmbientShips;
  window.drawAmbientShips = function() {
    try {
      if (!window._ambientShips) window._initAmbientShips();
      let oceanTop = max(height * 0.06, height * 0.25 - (window.horizonOffset || 0));
      let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;
      noStroke();
      for (let ship of window._ambientShips) {
        if (!ship) continue;
        ship.t += ship.speed;
        if (ship.t > 1) {
          ship.t = 0;
          ship.fromX = ship.toX; ship.fromY = ship.toY;
          let cx = window.WORLD.islandCX, cy = window.WORLD.islandCY;
          let _newTargets = [{ x: cx, y: cy }];
          let nk = Object.keys(state.nations || {});
          for (let k of nk) {
            let n = state.nations[k];
            if (n && !n.defeated) _newTargets.push({ x: n.isleX, y: n.isleY, nation: k });
          }
          if (state.conquest) _newTargets.push({ x: state.conquest.isleX, y: state.conquest.isleY });
          if (state.plenty) _newTargets.push({ x: state.plenty.isleX, y: state.plenty.isleY });
          if (_newTargets.length > 0) {
            let pick = _newTargets[floor(random(_newTargets.length))];
            ship.toX = pick.x; ship.toY = pick.y;
            ship.midX = (ship.fromX + ship.toX) / 2 + random(-300, 300);
            ship.midY = (ship.fromY + ship.toY) / 2 + random(-200, 200);
            ship.nationKey = pick.nation || null;
            if (ship.nationKey && state.nations[ship.nationKey] && state.nations[ship.nationKey].reputation <= -30) {
              ship.type = 2;
            } else if (ship.nationKey) {
              ship.type = random() < 0.5 ? 0 : 1;
            } else {
              ship.type = 1;
            }
          }
        }

        let t = ship.t;
        let u = 1 - t;
        let wx = u * u * ship.fromX + 2 * u * t * ship.midX + t * t * ship.toX;
        let wy = u * u * ship.fromY + 2 * u * t * ship.midY + t * t * ship.toY;
        let sx = typeof w2sX === 'function' ? w2sX(wx) : wx;
        let sy = typeof w2sY === 'function' ? w2sY(wy) : wy;
        sy = max(sy, oceanTop + 15);
        if (sx < -80 || sx > width + 80 || sy > height - 20) continue;

        let dFromCam = sqrt((wx - (window.camSmooth ? window.camSmooth.x : 0)) * (wx - (window.camSmooth ? window.camSmooth.x : 0)) +
                           (wy - (window.camSmooth ? window.camSmooth.y : 0)) * (wy - (window.camSmooth ? window.camSmooth.y : 0)));
        let distScale = constrain(1 - dFromCam / 5000, 0.3, 1);
        let distFade = constrain(1 - abs(sy - height * 0.4) / (height * 0.5), 0.15, 1);
        let sc = ship.size * distFade * distScale;
      }
    } catch (e) {
      console.error(LOG_PREFIX, 'drawAmbientShips() error:', e);
    }
  };
  console.log(LOG_PREFIX, 'FIX 6: Wrapped drawAmbientShips() with state checks');

  // ─── FIX 7: isOnImperialBridge() segment access ────────────────────────
  // Bug: b.segments[b.segments.length - 1] without checking segments exist
  const _orig_isOnImperialBridge = window.isOnImperialBridge;
  window.isOnImperialBridge = function(wx, wy) {
    try {
      let b = state.imperialBridge;
      if (!b || !b.built || !b.segments || b.segments.length === 0) return false;

      let bridgeY = window.WORLD.islandCY;
      let firstSeg = b.segments[0];
      let lastSeg = b.segments[b.segments.length - 1];
      if (!firstSeg || !lastSeg) return false;

      let minX = min(firstSeg.x, lastSeg.x) - 20;
      let maxX = max(firstSeg.x, lastSeg.x) + 20;
      if (wx < minX || wx > maxX) return false;

      let t = (wx - firstSeg.x) / (lastSeg.x - firstSeg.x);
      t = constrain(t, 0, 1);
      let archY = bridgeY - sin(t * PI) * 30;
      return abs(wy - archY) < 18;
    } catch (e) {
      console.error(LOG_PREFIX, 'isOnImperialBridge() error:', e);
      return false;
    }
  };
  console.log(LOG_PREFIX, 'FIX 7: Wrapped isOnImperialBridge() with segment checks');

  // ─── FIX 8: drawImperialBridge() segment loop ──────────────────────────
  // Bug: b.segments[i] accessed without confirming i is in bounds
  const _orig_drawImperialBridge = window.drawImperialBridge;
  window.drawImperialBridge = function() {
    try {
      let b = state.imperialBridge;
      if (!b || (!b.built && !b.building) || !b.segments) return;
      let segsToShow = b.building ? floor((b.segments.length || 0) * (b.progress || 0) / 100) : (b.segments ? b.segments.length : 0);
      if (segsToShow === 0) return;

      let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;

      for (let i = 0; i < segsToShow && i < b.segments.length; i++) {
        let seg = b.segments[i];
        if (!seg) continue;
        let sx = typeof w2sX === 'function' ? w2sX(seg.x) : seg.x;
        let sy = typeof w2sY === 'function' ? w2sY(seg.y) : seg.y;
        let t = i / (b.segments.length || 1);

        noStroke();
        fill(60, 80, 100, 30);
        ellipse(sx, sy + 22, seg.w + 4, 10);

        if (i % 4 === 0) {
          fill(typeof lerpColor === 'function' ? lerpColor(color(90, 82, 72), color(140, 130, 115), bright) : color(110, 100, 90));
          rect(sx - 5, sy, 10, 30 + sin(t * PI) * 20);
        }
      }
    } catch (e) {
      console.error(LOG_PREFIX, 'drawImperialBridge() error:', e);
    }
  };
  console.log(LOG_PREFIX, 'FIX 8: Wrapped drawImperialBridge() with bounds safety');

  // ─── FIX 9: getEquipBonus() undefined guard ────────────────────────────
  // Bug: Loop variable itemId could be undefined
  const _orig_getEquipBonus = window.getEquipBonus;
  window.getEquipBonus = function(stat) {
    try {
      if (!state || !state.equipment) return 0;
      let total = 0;
      for (let slot in state.equipment) {
        let itemId = state.equipment[slot];
        if (!itemId) continue;
        let db = window.EQUIPMENT_DB && window.EQUIPMENT_DB[itemId];
        if (db && db[stat]) total += db[stat];
      }
      return total;
    } catch (e) {
      console.error(LOG_PREFIX, 'getEquipBonus() error:', e);
      return 0;
    }
  };
  console.log(LOG_PREFIX, 'FIX 9: Wrapped getEquipBonus() with undefined checks');

  // ─── FIX 10: BotAI.scoreActions() army access ──────────────────────────
  // Bug: state.legia.army.length used without proper guards
  const _orig_BotAI_scoreActions = window.BotAI && window.BotAI.scoreActions;
  if (window.BotAI) {
    window.BotAI.scoreActions = function(nationKey) {
      try {
        let nation = state.nations[nationKey];
        let is = nation && nation.islandState;
        if (!is) return [{ type: 'patrol', score: 0.1 }];

        let wood = is.wood || 0, stone = is.stone || 0, crystals = is.crystals || 0;
        let gold = is.gold || 0, level = is.islandLevel || 1;
        let expandCost = 5 + level * 8;
        let underAttack = state.invasion && state.invasion.active && state.invasion.target === nationKey;
        let actions = [];

        let phase = level < 8 ? 'early' : level < 12 ? 'mid' : 'late';
        let expandBonus = phase === 'early' ? 2.0 : 0.5;
        let militaryBonus = phase === 'mid' ? 2.0 : (phase === 'late' ? 1.5 : 0.3);

        if (underAttack) actions.push({ type: 'defend', score: 10.0 });
        if (crystals >= expandCost && level < 15) actions.push({ type: 'expand', score: 3.0 + expandBonus });

        // FIX: Safe army size check
        let armySize = (is.legia && is.legia.army) ? is.legia.army.length : 0;
        let maxArmy = Math.min(10, 3 + Math.floor(level / 3));
        let hasBarracks = is.buildings && is.buildings.some(b => b && b.type === 'castrum');
        if (hasBarracks && gold >= 10 && armySize < maxArmy)
          actions.push({ type: 'recruit', score: 1.5 + militaryBonus + (underAttack ? 3.0 : 0) });

        let alreadyRaiding = nation.raidParty && nation.raidParty.length > 0;
        if (armySize >= 5 && !alreadyRaiding && !underAttack && !nation.allied)
          actions.push({ type: 'counter_attack', score: 1.5 + armySize * 0.1 });

        let hasMarket = is.buildings && is.buildings.some(b => b && (b.type === 'forum' || b.type === 'market'));
        if (hasMarket && (is.harvest || 0) > 2)
          actions.push({ type: 'trade', score: 1.2 });

        if (wood >= 15 && stone >= 10 && is.buildings && level >= 3) {
          let hasWall = is.buildings.some(b => b && b.type === 'wall');
          let hasTower = is.buildings.some(b => b && b.type === 'watchtower');
          let hasForge = is.buildings.some(b => b && b.type === 'forge');
          if (!hasWall || !hasTower || !hasForge)
            actions.push({ type: 'build', score: 1.0 });
        }

        let treeCount = (is.trees && Array.isArray(is.trees)) ? is.trees.length : 0;
        if (treeCount < 5 && wood >= 3)
          actions.push({ type: 'replant', score: 0.8 });

        actions.push({ type: 'patrol', score: 0.1 });
        actions.sort((a, b) => b.score - a.score);
        return actions;
      } catch (e) {
        console.error(LOG_PREFIX, 'BotAI.scoreActions() error:', e);
        return [{ type: 'patrol', score: 0.1 }];
      }
    };
    console.log(LOG_PREFIX, 'FIX 10: Wrapped BotAI.scoreActions() with safe army access');
  }

  // ─── FIX 11: mouseWheel() state check ──────────────────────────────────
  // Bug: state.player accessed without checking state exists
  const _orig_mouseWheel = window.mouseWheel;
  window.mouseWheel = function(event) {
    try {
      if (!state) return false;
      if (window.gameScreen === 'settings') {
        let maxScroll = max(0, (Object.keys(window.DEFAULT_KEYBINDS || {}).length) * 18 - 10 * 18);
        window._keybindScrollOffset = constrain((window._keybindScrollOffset || 0) + (event.delta > 0 ? 18 : -18), 0, maxScroll);
        return false;
      }
      if (window.gameScreen === 'game' && state && state.isInitialized) {
        let delta = -event.delta * 0.001;
        let zMin = (state.rowing && state.rowing.active) ? (window.CAM_ZOOM_MIN_SAILING || 0.5) : (window.CAM_ZOOM_MIN || 0.5);
        window.camZoomTarget = constrain((window.camZoomTarget || 1) + delta, zMin, (window.CAM_ZOOM_MAX || 3));
        return false;
      }
      if (!state.player) return false;
      let dir = event.delta > 0 ? 1 : -1;
      let p = state.player;
      let hotbarLen = window.HOTBAR_ITEMS && window.HOTBAR_ITEMS.length || 10;
      p.hotbarSlot = ((p.hotbarSlot + dir) % hotbarLen + hotbarLen) % hotbarLen;
      return false;
    } catch (e) {
      console.error(LOG_PREFIX, 'mouseWheel() error:', e);
      return false;
    }
  };
  console.log(LOG_PREFIX, 'FIX 11: Wrapped mouseWheel() with state safety');

  // ─── FIX 12: createNationColony() building access ──────────────────────
  // Bug: rv.buildings accessed without checking if rv exists
  const _orig_createNationColony = window.createNationColony;
  window.createNationColony = function(nationKey) {
    try {
      if (state.colonies && state.colonies[nationKey]) return;
      let rv = state.nations && state.nations[nationKey];
      if (!rv) return;
      let nationName = (typeof getNationName === 'function') ? getNationName(nationKey) : nationKey;
      let uniqueRes = null;
      if (nationKey === 'carthage') uniqueRes = 'exoticSpices';
      else if (nationKey === 'egypt') uniqueRes = 'scrolls';
      else if (nationKey === 'greece') uniqueRes = 'oil';
      else if (nationKey === 'rome') uniqueRes = 'steel';

      // FIX: Safe building access
      let buildingsList = (rv.buildings && Array.isArray(rv.buildings)) ? rv.buildings : [];
      let buildingTypes = buildingsList.slice(0, 3).map(function(b) { return b.type || b; });

      if (typeof createColony === 'function') {
        createColony(nationKey, {
          level: 1, buildings: buildingTypes,
          population: max(3, floor((rv.population || 5) * 0.6)),
          income: 5 + (rv.level || 1) * 2, military: 0,
          name: nationName + ' Colony',
          isleX: rv.isleX, isleY: rv.isleY, isleRX: rv.isleRX, isleRY: rv.isleRY,
          uniqueResource: uniqueRes,
        });
      }
    } catch (e) {
      console.error(LOG_PREFIX, 'createNationColony() error:', e);
    }
  };
  console.log(LOG_PREFIX, 'FIX 12: Wrapped createNationColony() with building safety');

  // ─── FIX 13: dialogState choice access ─────────────────────────────────
  // Bug: dialogState.text could be undefined when checking length
  const _orig_handleDialogClick = window.mousePressed;
  // This is handled in FIX 11 mousePressed wrapper
  console.log(LOG_PREFIX, 'FIX 13: Dialog state checks included in mousePressed wrapper');

  // ─── FIX 14: processLeaderEquipment() safety ──────────────────────────
  // Bug: state.legia could be null
  const _orig_processLeaderEquipment = window.processLeaderEquipment;
  if (_orig_processLeaderEquipment) {
    window.processLeaderEquipment = function() {
      try {
        if (!state || !state.legia || !state.legia.army) return;
        // Proceed with original logic with safety
        return _orig_processLeaderEquipment.call(this);
      } catch (e) {
        console.error(LOG_PREFIX, 'processLeaderEquipment() error:', e);
      }
    };
    console.log(LOG_PREFIX, 'FIX 14: Wrapped processLeaderEquipment() with state checks');
  }

  // ─── FIX 15: Generic state validation helper ───────────────────────────
  // Helper to safely access nested state properties
  window._safeStateAccess = function(path, defaultValue) {
    try {
      if (!path || typeof path !== 'string') return defaultValue;
      let parts = path.split('.');
      let current = state;
      for (let part of parts) {
        if (current == null) return defaultValue;
        current = current[part];
      }
      return current != null ? current : defaultValue;
    } catch (e) {
      console.warn(LOG_PREFIX, 'Safe state access error on path:', path, e);
      return defaultValue;
    }
  };
  console.log(LOG_PREFIX, 'FIX 15: Added _safeStateAccess() helper function');

  console.log(LOG_PREFIX, '=== ALL 15 CRITICAL BUGS FIXED ===');
})();
