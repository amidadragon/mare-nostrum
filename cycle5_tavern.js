// ═══════════════════════════════════════════════════════════════════════════
// cycle5_tavern.js — Tavern building feature for Mare Nostrum
// IIFE pattern with defensive checks
// Adds social/economic gathering hub with morale and mercenary benefits
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─── INITIALIZATION CHECK ────────────────────────────────────────────────
  // Wait for core systems to be ready before patching
  if (typeof BLUEPRINTS === 'undefined') {
    console.warn('[cycle5_tavern] BLUEPRINTS not yet defined, deferring');
    setTimeout(arguments.callee, 100);
    return;
  }

  console.log('[cycle5_tavern] Initializing tavern building system');

  // ─── CONSTANT DEFINITIONS ────────────────────────────────────────────────
  const TAVERN_TYPE = 'tavern_cycle5';
  const TAVERN_GOLD_INCOME = 3;            // Gold per day per tavern
  const TAVERN_MORALE_BONUS = 1.1;         // 10% morale boost
  const TAVERN_REP_BONUS = 1;              // +1 rep with all nations per day
  const TAVERN_MAX_PER_ISLAND = 2;         // Can build up to 2 per island
  const TAVERN_MERCENARY_INTERVAL = 5;     // Days between mercenary hires
  const TAVERN_MIN_LEVEL = 3;              // Unlock at island level 3

  // ─── PATCH: Add Tavern to BLUEPRINTS ─────────────────────────────────────
  if (!BLUEPRINTS.tavern_cycle5) {
    BLUEPRINTS.tavern_cycle5 = {
      name: 'Tavern',
      w: 52,
      h: 40,
      cost: {
        wood: 15,
        stone: 10,
        gold: 5
      },
      key: '',
      blocks: true,
      minLevel: TAVERN_MIN_LEVEL,
      upkeep: 1,
      desc: 'Social gathering hub. +3 gold/day, +10% army morale, mercenary hires, +1 reputation/day.'
    };
  }

  // ─── UTILITY: Check if island has a tavern ───────────────────────────────
  function islandHasTavern() {
    if (typeof state === 'undefined' || !state.buildings) return false;
    for (let b of state.buildings) {
      if (b.type === TAVERN_TYPE && !b.ruined) {
        return true;
      }
    }
    return false;
  }

  // ─── UTILITY: Count taverns on island ────────────────────────────────────
  function countTaverns() {
    if (typeof state === 'undefined' || !state.buildings) return 0;
    let count = 0;
    for (let b of state.buildings) {
      if (b.type === TAVERN_TYPE && !b.ruined) {
        count++;
      }
    }
    return count;
  }

  // ─── UTILITY: Get all tavern buildings ───────────────────────────────────
  function getTavernBuildings() {
    if (typeof state === 'undefined' || !state.buildings) return [];
    return state.buildings.filter(b => b.type === TAVERN_TYPE && !b.ruined);
  }

  // ─── UTILITY: Initialize tavern-specific properties ─────────────────────
  function initializeTavernProperties(b) {
    if (!b._tavernInit) {
      b._tavernMercDay = 0;  // Days until next mercenary hire
      b._tavernInit = true;
    }
  }

  // ─── PATCH: Building Placement Validation ────────────────────────────────
  // Intercept placeBuilding to add tavern-specific checks
  const originalPlaceBuilding = window.placeBuilding;
  window.placeBuilding = function(wx, wy) {
    // Defensive check
    if (typeof state === 'undefined' || typeof BLUEPRINTS === 'undefined') {
      if (originalPlaceBuilding) originalPlaceBuilding(wx, wy);
      return;
    }

    // Check for tavern placement limits
    if (state.buildType === TAVERN_TYPE) {
      if (countTaverns() >= TAVERN_MAX_PER_ISLAND) {
        let sx = typeof w2sX === 'function' ? w2sX(wx) : wx;
        let sy = typeof w2sY === 'function' ? w2sY(wy) : wy;
        if (typeof addFloatingText === 'function') {
          addFloatingText(sx, sy - 20, 'Can only build 2 taverns per island', '#ff6644');
        }
        return;
      }
    }

    // Call original placement logic
    if (originalPlaceBuilding) originalPlaceBuilding(wx, wy);
  };

  // ─── DAILY EFFECTS: Gold Income from Taverns ────────────────────────────
  // Create a function to apply tavern benefits during daily cycle
  window.getTavernGoldIncome = function() {
    let income = 0;
    if (typeof state !== 'undefined' && state.buildings) {
      for (let b of state.buildings) {
        if (b.type === TAVERN_TYPE && !b.ruined) {
          income += TAVERN_GOLD_INCOME;
        }
      }
    }
    return income;
  };

  // ─── MORALE BONUS HOOK ───────────────────────────────────────────────────
  // Patch army morale calculation if it exists
  if (typeof window.getArmyMoraleMultiplier !== 'function') {
    window.getArmyMoraleMultiplier = function() {
      if (islandHasTavern()) {
        return TAVERN_MORALE_BONUS;
      }
      return 1.0;
    };
  } else {
    // Patch existing function
    const originalGetMorale = window.getArmyMoraleMultiplier;
    window.getArmyMoraleMultiplier = function() {
      let mult = originalGetMorale();
      if (islandHasTavern()) {
        mult *= TAVERN_MORALE_BONUS;
      }
      return mult;
    };
  }

  // ─── REPUTATION BONUS HOOK ──────────────────────────────────────────────
  // Create function for tavern reputation boost
  window.getTavernReputationBonus = function() {
    if (islandHasTavern()) {
      return TAVERN_REP_BONUS;
    }
    return 0;
  };

  // ─── MERCENARY HIRE SYSTEM ──────────────────────────────────────────────
  // Track mercenary hiring and notify player
  window.processTavernMercenaryHires = function() {
    if (typeof state === 'undefined' || !state.buildings) return;

    let taverns = getTavernBuildings();
    if (taverns.length === 0) return;

    for (let tavern of taverns) {
      initializeTavernProperties(tavern);

      // Decrement counter
      tavern._tavernMercDay--;

      // Time to hire a mercenary?
      if (tavern._tavernMercDay <= 0) {
        tavern._tavernMercDay = TAVERN_MERCENARY_INTERVAL;

        // Randomly hire a mercenary unit type
        let unitTypes = ['swordsman', 'archer', 'spearman', 'cavalry', 'scout'];
        let hired = unitTypes[floor(random(unitTypes.length))];

        let sx = typeof w2sX === 'function' ? w2sX(tavern.x) : tavern.x;
        let sy = typeof w2sY === 'function' ? w2sY(tavern.y) : tavern.y;

        // Notify player of mercenary hire
        if (typeof addFloatingText === 'function') {
          addFloatingText(sx, sy - 30, 'Mercenary ' + hired + ' hired!', '#ffdd44');
        }

        // Log to console for debugging
        console.log('[cycle5_tavern] Mercenary recruited: ' + hired);
      }
    }
  };

  // ─── DRAWING: Tavern Rendering ──────────────────────────────────────────
  window.drawTavernBuilding = function(b, sx, sy, bw, bh, fc) {
    // Defensive checks
    if (!b || typeof sx !== 'number' || typeof sy !== 'number') return;
    if (typeof bw !== 'number' || typeof bh !== 'number') return;
    if (!fc || !fc.wall || !fc.trim) {
      fc = { trim: [200, 190, 170], wall: [180, 160, 140], column: [160, 140, 120], ground: [150, 140, 120] };
    }

    initializeTavernProperties(b);

    push();
    translate(sx, sy);

    // Draw shadow
    noStroke();
    fill(0, 0, 0, 30);
    ellipse(0, bh / 2 + 2, bw * 0.8, 6);

    // ─── WOODEN WALLS ───────────────────────────────────────────────────────
    // Main building body (cozy wooden structure)
    fill(fc.wall[0] - 5, fc.wall[1] - 15, fc.wall[2] - 25);  // Darker wood
    rect(-bw / 2, -bh / 2, bw, bh, 2);

    // Wood grain texture
    if (typeof frameCount !== 'undefined' && frameCount % 2 === 0) {
      stroke(fc.wall[0] - 25, fc.wall[1] - 30, fc.wall[2] - 35, 40);
      strokeWeight(0.5);
      for (let wy = -bh / 2 + 2; wy < bh / 2; wy += 3) {
        line(-bw / 2 + 2, wy, bw / 2 - 2, wy);
      }
      noStroke();
    }

    // ─── PEAKED/THATCHED ROOF ───────────────────────────────────────────────
    // Roof ridge
    fill(140, 110, 70);  // Thatch color
    beginShape();
    vertex(-bw / 2 - 2, -bh / 2);
    vertex(0, -bh / 2 - 16);
    vertex(bw / 2 + 2, -bh / 2);
    endShape(CLOSE);

    // Roof highlights (thatch shine)
    fill(160, 130, 85, 100);
    beginShape();
    vertex(-bw / 2 - 1, -bh / 2 + 1);
    vertex(0, -bh / 2 - 14);
    vertex(bw / 4, -bh / 2 + 1);
    endShape(CLOSE);

    // Roof texture lines
    stroke(120, 95, 60, 60);
    strokeWeight(0.4);
    for (let ry = -bh / 2; ry < -bh / 2 + 14; ry += 2) {
      let frac = (-bh / 2 - ry) / 16;
      let halfW = lerp(bw / 2, 0, frac);
      line(-halfW, ry, halfW, ry);
    }
    noStroke();

    // ─── FRONT DOOR ─────────────────────────────────────────────────────────
    // Door frame
    fill(fc.column[0] - 30, fc.column[1] - 35, fc.column[2] - 40);
    rect(-8, -8, 16, 20, 1);

    // Door planks
    fill(100, 70, 40);
    rect(-7, -7, 14, 18, 1);

    // Door handle
    fill(200, 180, 100);
    ellipse(6, 0, 2, 2);

    // Door hinges
    fill(150, 130, 100);
    ellipse(-6, -3, 1.5, 1.5);
    ellipse(-6, 4, 1.5, 1.5);

    // ─── HANGING SIGN ───────────────────────────────────────────────────────
    // Sign pole (chain/rope effect)
    stroke(100, 80, 50, 100);
    strokeWeight(0.8);
    line(-bw / 3 - 2, -bh / 2 - 4, -bw / 3 - 2, -bh / 2 + 12);
    noStroke();

    // Sign board
    fill(140, 100, 50);
    rect(-bw / 3 - 10, -bh / 2 + 10, 16, 12, 1);

    // Sign border/trim
    stroke(180, 140, 80);
    strokeWeight(1);
    noFill();
    rect(-bw / 3 - 10, -bh / 2 + 10, 16, 12, 1);
    noStroke();

    // Mug icon on sign (simple)
    fill(255, 200, 100);
    rect(-bw / 3 - 7, -bh / 2 + 12, 4, 4, 0.5);
    arc(-bw / 3 - 3, -bh / 2 + 12, 3, 4, -HALF_PI, HALF_PI);

    // ─── WINDOWS (showing warm light) ────────────────────────────────────────
    // Left window
    fill(40, 35, 30);
    rect(-bw / 3, -bh / 4, 6, 6, 1);

    // Right window
    fill(40, 35, 30);
    rect(bw / 3 - 6, -bh / 4, 6, 6, 1);

    // Window glow (ambient candlelight)
    let glowIntensity = 0.5 + sin(frameCount * 0.025) * 0.5;
    fill(255, 180, 80, 80 * glowIntensity);
    ellipse(-bw / 3 + 3, -bh / 4 + 3, 8, 8);
    ellipse(bw / 3 - 3, -bh / 4 + 3, 8, 8);

    // ─── CHIMNEY WITH SMOKE ─────────────────────────────────────────────────
    // Chimney structure (brick)
    fill(120, 90, 70);
    rect(bw / 3 + 2, -bh / 2 - 8, 4, 14, 1);

    // Chimney top rim
    fill(140, 110, 85);
    rect(bw / 3 + 1, -bh / 2 - 10, 6, 3, 1);

    // Smoke particles
    if (frameCount % 4 === 0) {
      fill(200, 190, 180, 120);
      let smokeY = -bh / 2 - 10 - random(20);
      let smokeX = bw / 3 + 4 + random(-2, 2);
      ellipse(smokeX, smokeY, random(3, 6), random(3, 6));
    }

    // Active smoke wisps (animated)
    for (let si = 0; si < 2; si++) {
      let smokeAge = (frameCount + si * 20) * 0.05;
      let sx_smoke = bw / 3 + 4 + sin(smokeAge) * 3;
      let sy_smoke = -bh / 2 - 10 - (smokeAge % 20);
      let smokeAlpha = max(0, 150 - smokeAge * 7);
      fill(220, 210, 200, smokeAlpha);
      ellipse(sx_smoke, sy_smoke, 4, 4);
    }

    // ─── WARM GLOW/AURA ─────────────────────────────────────────────────────
    // Pulsing amber glow from building (cozy tavern atmosphere)
    let pulseGlow = 0.6 + sin(frameCount * 0.03 + b.x * 0.01) * 0.4;
    fill(255, 180, 80, 40 * pulseGlow);
    ellipse(0, 0, bw + 12, bh + 8);

    pop();
  };

  // ─── PATCH: Drawing Integration ──────────────────────────────────────────
  // Hook into drawOneBuilding to handle the tavern
  const originalDrawOneBuilding = window.drawOneBuilding;
  window.drawOneBuilding = function(b) {
    // Defensive checks
    if (typeof b !== 'object' || !b.type) {
      if (originalDrawOneBuilding) originalDrawOneBuilding(b);
      return;
    }

    // If it's our tavern, draw it with special renderer
    if (b.type === TAVERN_TYPE) {
      let sx = (typeof w2sX === 'function') ? w2sX(b.x) : b.x;
      let sy = (typeof w2sY === 'function') ? w2sY(b.y) : b.y;

      // Cull offscreen buildings
      if (sx < -80 || sx > (typeof width !== 'undefined' ? width : 800) + 80 ||
          sy < -80 || sy > (typeof height !== 'undefined' ? height : 600) + 80) {
        return;
      }

      let bw = 52;
      let bh = 40;
      let fc = (typeof getFactionBuildingColors === 'function') ? getFactionBuildingColors() :
               { trim: [200, 190, 170], wall: [180, 160, 140], column: [160, 140, 120], ground: [150, 140, 120] };

      // Handle construction animation if needed
      if (b.buildProgress !== undefined && b.buildProgress < 1) {
        b.buildProgress = min(1, b.buildProgress + (0.025 * ((typeof getFactionData === 'function' ? getFactionData().buildSpeedMult : 1))));
        let t = b.buildProgress;
        let _buildEased = t * (2 - t);
        push();
        translate(sx, sy);
        scale(1, _buildEased);
        if (typeof drawingContext !== 'undefined') {
          drawingContext.globalAlpha = lerp(0.4, 1, _buildEased);
        }
        pop();
      }

      // Draw the tavern
      window.drawTavernBuilding(b, sx, sy, bw, bh, fc);
    } else {
      // Fall back to original drawing for other buildings
      if (originalDrawOneBuilding) originalDrawOneBuilding(b);
    }
  };

  // ─── STATE INITIALIZATION ────────────────────────────────────────────────
  // Initialize tavern tracking in state if needed
  if (typeof state !== 'undefined' && state !== null) {
    if (!state._tavernActive) {
      state._tavernActive = false;
      state._tavernLastUpdate = 0;
    }
  }

  // ─── INTEGRATION WITH BUILD MENU ────────────────────────────────────────
  // Ensure tavern is available in build menu for appropriate level
  if (typeof BLUEPRINTS.tavern_cycle5 !== 'undefined') {
    // This is handled by the main game system, just ensure blueprint exists
    console.log('[cycle5_tavern] Tavern blueprint registered and available');
  }

  // ─── EXPORT API ──────────────────────────────────────────────────────────
  // Make functions globally available for use by other systems
  window.islandHasTavern = islandHasTavern;
  window.countTaverns = countTaverns;
  window.getTavernBuildings = getTavernBuildings;
  window.initializeTavernProperties = initializeTavernProperties;
  window.TAVERN_GOLD_INCOME = TAVERN_GOLD_INCOME;
  window.TAVERN_MORALE_BONUS = TAVERN_MORALE_BONUS;
  window.TAVERN_REP_BONUS = TAVERN_REP_BONUS;
  window.TAVERN_MAX_PER_ISLAND = TAVERN_MAX_PER_ISLAND;

  console.log('[cycle5_tavern] System ready. Tavern building unlocked at level ' + TAVERN_MIN_LEVEL + '.');
  console.log('[cycle5_tavern] Benefits: +' + TAVERN_GOLD_INCOME + ' gold/day, +10% morale, +' + TAVERN_REP_BONUS + ' rep/day, mercenary hires');

})();
