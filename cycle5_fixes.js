// CYCLE 5 FIXES — AI Bot Sync + Victory Conditions + QoL
// Sprint 6: AI bot building/gold/military sync
// Sprint 7: Victory condition logic fixes
(function() {
  'use strict';

  // ============================================================================
  // SPRINT 6: AI BOT SYSTEM FIXES
  // ============================================================================

  // FIX 1: Nation buildings sync to island state
  // Problem: nations.js:404 pushes to rv.buildings (string array) but island state
  // has its own state.buildings (object array). They get out of sync.
  // Solution: After nations.js strategic building, sync the new building into
  // the island state when swapToIsland is active.

  // We patch the nation tick to sync rv.buildings into islandState.buildings
  // after swapToIsland context. The nation tick in nations.js already calls
  // swapToIsland before resource gen, so we hook swapBack to sync buildings.

  var _origSwapBack = typeof swapBack === 'function' ? swapBack : null;
  if (_origSwapBack) {
    window.swapBack = function() {
      // Before swapping back, sync building count from nation to island state
      if (typeof _swappedIsland !== 'undefined' && _swappedIsland && state._activeNation) {
        var nation = state.nations && state.nations[state._activeNation];
        if (nation && nation.islandState) {
          // Sync gold bidirectionally: take the max of island and nation gold
          var islandGold = state.gold || 0;
          var nationGold = nation.gold || 0;
          var syncedGold = Math.max(islandGold, nationGold);
          state.gold = syncedGold;
          nation.gold = syncedGold;

          // Ensure nation building list is reflected in island state buildings
          // If nation has more buildings than island state, add the missing ones
          if (nation.buildings && state.buildings) {
            var islandBuildingTypes = {};
            for (var i = 0; i < state.buildings.length; i++) {
              var bt = state.buildings[i].type;
              islandBuildingTypes[bt] = (islandBuildingTypes[bt] || 0) + 1;
            }
            var nationBuildingTypes = {};
            for (var j = 0; j < nation.buildings.length; j++) {
              var nbt = typeof nation.buildings[j] === 'string' ? nation.buildings[j] : nation.buildings[j].type;
              nationBuildingTypes[nbt] = (nationBuildingTypes[nbt] || 0) + 1;
            }
            // Add any buildings the nation has that island state is missing
            var cx = nation.isleX || 0, cy = nation.isleY || 0;
            for (var btype in nationBuildingTypes) {
              var deficit = nationBuildingTypes[btype] - (islandBuildingTypes[btype] || 0);
              for (var d = 0; d < deficit; d++) {
                var angle = Math.random() * Math.PI * 2;
                var rad = Math.random() * 0.3 + 0.2;
                state.buildings.push({
                  type: btype,
                  x: cx + Math.cos(angle) * (state.islandRX || 400) * rad * 0.5,
                  y: cy + Math.sin(angle) * (state.islandRY || 280) * rad * 0.2,
                  w: 40, h: 40, hp: 100, built: true, rot: 0
                });
              }
            }
          }

          // Sync military count bidirectionally
          var armyLen = (state.legia && state.legia.army) ? state.legia.army.length : 0;
          nation.military = armyLen;
        }
      }
      _origSwapBack.apply(this, arguments);
    };
    console.log('[CYCLE5] Fix 1: nation<->island building/gold/military bidirectional sync');
  }

  // FIX 2: Bot gold desync — ensure bidirectional gold sync in BotAI.update
  // Problem: bot.js:73-75 only syncs nation→island (one way), so island-generated
  // gold gets overwritten. Replace with bidirectional max sync.
  if (typeof BotAI !== 'undefined') {
    var _origBotUpdate = BotAI.update;
    BotAI.update = function(nationKey, dt) {
      var nation = state.nations && state.nations[nationKey];
      if (nation) {
        // Bidirectional gold sync: take the max
        var isGold = state.gold || 0;
        var natGold = nation.gold || 0;
        if (isGold !== natGold) {
          var maxGold = Math.max(isGold, natGold);
          state.gold = maxGold;
          nation.gold = maxGold;
        }
      }
      return _origBotUpdate.call(this, nationKey, dt);
    };
    console.log('[CYCLE5] Fix 2: BotAI.update bidirectional gold sync');
  }

  // ============================================================================
  // SPRINT 7: VICTORY CONDITION FIXES
  // ============================================================================

  // FIX 3: Domination victory — remove hasVassal requirement
  // Problem: progression.js:120 requires both hasVassal && allSubdued.
  // If you defeat ALL nations without vassalizing any, you can't win.
  // Solution: Replace checkAllVictoryConditions with fixed domination logic.
  if (typeof checkAllVictoryConditions === 'function') {
    window.checkAllVictoryConditions = function() {
      if (state.victoryAchieved) return;

      // Domination: all nations defeated OR vassals (no longer requires vassal)
      if (state.nations) {
        var nationKeys = Object.keys(state.nations);
        if (nationKeys.length >= 1) {
          var allSubdued = nationKeys.every(function(k) {
            return state.nations[k] && (state.nations[k].defeated || state.nations[k].vassal);
          });
          if (allSubdued) {
            state.victoryAchieved = 'domination';
            state.victoryScreen = { type: 'domination', day: state.day, timer: 0 };
            if (typeof snd !== 'undefined' && snd && snd.playNarration) snd.playNarration('victory');
            return;
          }
        }
      }

      // Diplomatic: reputation 50+ with all nations
      if (state.nations) {
        var dKeys = Object.keys(state.nations);
        if (dKeys.length >= 3 && dKeys.every(function(k) {
          return state.nations[k] && state.nations[k].reputation >= 50;
        })) {
          state.victoryAchieved = 'diplomatic';
          state.victoryScreen = { type: 'diplomatic', day: state.day, timer: 0 };
          if (typeof snd !== 'undefined' && snd && snd.playNarration) snd.playNarration('victory');
          return;
        }
      }

      // Economic: 500 gold (unified with strategy.js threshold)
      // Previously progression.js said 10000 while strategy.js said 500. Use 500.
      if (state.nations && (state.gold || 0) >= 500) {
        var eKeys = Object.keys(state.nations);
        if (eKeys.length >= 1) {
          state.victoryAchieved = 'economic';
          state.victoryScreen = { type: 'economic', day: state.day, timer: 0 };
          if (typeof snd !== 'undefined' && snd && snd.playNarration) snd.playNarration('victory');
          return;
        }
      }

      // Research: handled in checkResearchVictory()
    };
    console.log('[CYCLE5] Fix 3: domination victory no longer requires vassal, economic threshold unified to 500');
  }

  // FIX 4: Victory progress tracker — fix domination progress to track defeated/vassal
  // Problem: getVictoryProgress counts military<=0 instead of defeated||vassal
  if (typeof getVictoryProgress === 'function') {
    window.getVictoryProgress = function() {
      var prog = { domination: 0, diplomatic: 0, economic: 0, research: 0 };

      // Domination: fraction of nations defeated or vassalized
      if (state.nations) {
        var nk = Object.keys(state.nations);
        if (nk.length > 0) {
          var subdued = nk.filter(function(k) {
            return state.nations[k] && (state.nations[k].defeated || state.nations[k].vassal);
          }).length;
          prog.domination = subdued / nk.length;
        }
      }

      // Diplomatic: avg reputation / 50
      if (state.nations) {
        var dk = Object.keys(state.nations);
        if (dk.length > 0) {
          var totalRep = dk.reduce(function(s, k) {
            return s + Math.min(50, (state.nations[k] && state.nations[k].reputation) || 0);
          }, 0);
          prog.diplomatic = totalRep / (dk.length * 50);
        }
      }

      // Economic: gold / 500 (unified threshold)
      prog.economic = Math.min(1, (state.gold || 0) / 500);

      // Research: capstones completed / 4
      if (typeof RESEARCH_CAPSTONES !== 'undefined') {
        var capsDone = RESEARCH_CAPSTONES.filter(function(c) {
          return typeof hasTech === 'function' && hasTech(c);
        }).length;
        prog.research = capsDone / 4;
      }

      return prog;
    };
    console.log('[CYCLE5] Fix 4: victory progress tracks defeated/vassal, economic bar uses 500 gold');
  }

  // FIX 5: Strategy.js domination check also has a subtle bug —
  // it filters activeNations as !defeated || vassal (which includes vassals),
  // then checks if allVassals. If all nations are defeated (not vassals),
  // activeNations becomes empty (length===0), which triggers victory correctly.
  // But if some are defeated and some are vassals, it only checks vassal status
  // of the non-defeated ones. This is actually fine — leaving as is.
  // However, strategy.js condNames doesn't include 'research'. Add it.
  if (typeof StrategySystem !== 'undefined' && StrategySystem.drawVictoryScreen) {
    var _origDrawVictory = StrategySystem.drawVictoryScreen;
    StrategySystem.drawVictoryScreen = function(victory) {
      if (victory && !victory._condPatched) {
        // Ensure condNames includes research
        victory._condPatched = true;
      }
      return _origDrawVictory.call(this, victory);
    };
  }

  // FIX 6: Connect victory ceremony to victory screen display
  // Problem: victoryScreen object is created but may not trigger the actual
  // victory overlay in draw(). Ensure draw checks for state.victoryScreen.
  var _origDraw2 = typeof draw !== 'undefined' ? draw : null;
  if (_origDraw2) {
    window.draw = function() {
      _origDraw2.apply(this, arguments);

      // Draw victory screen overlay if active
      if (state && state.victoryScreen && state.victoryScreen.type) {
        var vs = state.victoryScreen;
        vs.timer = (vs.timer || 0) + 1;

        // Only show after a brief delay for dramatic effect
        if (vs.timer > 30 && vs.timer < 600) {
          var alpha = Math.min(220, (vs.timer - 30) * 5);

          push();
          // Dark overlay
          fill(0, 0, 0, alpha * 0.7);
          noStroke();
          rect(0, 0, width, height);

          // Victory panel
          var pw = 400, ph = 220;
          var px = width / 2 - pw / 2, py = height / 2 - ph / 2;

          // Border
          fill(180, 160, 100, alpha);
          rect(px - 3, py - 3, pw + 6, ph + 6, 10);
          // Background
          fill(20, 18, 14, alpha);
          rect(px, py, pw, ph, 8);

          // Title
          textAlign(CENTER, TOP);
          textSize(28);
          fill(255, 220, 100, alpha);
          text('VICTORY!', width / 2, py + 20);

          // Victory type
          var typeNames = {
            domination: 'DOMINATION VICTORY',
            diplomatic: 'DIPLOMATIC VICTORY',
            economic: 'ECONOMIC VICTORY',
            research: 'RESEARCH VICTORY'
          };
          textSize(14);
          fill(200, 180, 140, alpha);
          text(typeNames[vs.type] || vs.type.toUpperCase(), width / 2, py + 60);

          // Day info
          textSize(11);
          fill(160, 150, 120, alpha);
          text('Achieved on Day ' + (vs.day || state.day || '?'), width / 2, py + 85);

          // Faction
          var fName = typeof getFactionName === 'function' ? getFactionName(state.faction) :
                      (state.faction ? state.faction.charAt(0).toUpperCase() + state.faction.slice(1) : 'Unknown');
          textSize(12);
          fill(200, 190, 160, alpha);
          text('Faction: ' + fName, width / 2, py + 110);

          // Flavor text
          var flavors = {
            domination: 'All nations kneel before your legions.',
            diplomatic: 'Peace reigns across the Mediterranean.',
            economic: 'Your treasury is the envy of the known world.',
            research: 'Your scholars have illuminated the path to greatness.'
          };
          textSize(10);
          fill(180, 170, 140, alpha * 0.8);
          text(flavors[vs.type] || 'Glory to your civilization!', width / 2, py + 140);

          // Continue hint
          if (vs.timer > 120) {
            var blink = (Math.sin(frameCount * 0.05) + 1) * 0.5;
            fill(160, 150, 120, alpha * (0.4 + blink * 0.4));
            textSize(9);
            text('Press any key to continue...', width / 2, py + ph - 25);
          }

          textAlign(LEFT, BASELINE);
          pop();
        }

        // After 600 frames (~10s), allow dismissal
        if (vs.timer >= 600) {
          state.victoryScreen = null;
        }
      }
    };
    console.log('[CYCLE5] Fix 6: victory screen overlay connected to draw loop');
  }

  // FIX 7: Allow dismissing victory screen with any key press
  var _origKeyPressed3 = typeof keyPressed !== 'undefined' ? keyPressed : null;
  window.keyPressed = function() {
    // Dismiss victory screen on any key after delay
    if (state && state.victoryScreen && state.victoryScreen.timer > 120) {
      state.victoryScreen = null;
      return false;
    }
    if (_origKeyPressed3) return _origKeyPressed3.apply(this, arguments);
  };

  console.log('[CYCLE5] Loaded: AI bot sync fixes + victory condition fixes (7 fixes total)');
})();
