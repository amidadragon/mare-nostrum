// ═══════════════════════════════════════════════════════════════════════════
// cycle5_lighthouse.js — Enhanced Lighthouse building feature for Mare Nostrum
// IIFE pattern with defensive checks
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─── INITIALIZATION CHECK ────────────────────────────────────────────────
  // Wait for core systems to be ready before patching
  if (typeof BLUEPRINTS === 'undefined') {
    console.warn('[cycle5_lighthouse] BLUEPRINTS not yet defined, deferring');
    setTimeout(arguments.callee, 100);
    return;
  }

  console.log('[cycle5_lighthouse] Initializing enhanced lighthouse system');

  // ─── CONSTANT DEFINITIONS ────────────────────────────────────────────────
  const LIGHTHOUSE_TYPE = 'lighthouse_enhanced';
  const LIGHTHOUSE_RANGE = 80;                // Detection radius around lighthouse
  const LIGHTHOUSE_SAILING_BOOST = 1.15;      // 15% sailing speed increase
  const LIGHTHOUSE_VISIBILITY_BOOST = 1.25;   // 25% visibility range increase
  const LIGHTHOUSE_RAID_REDUCTION = 0.80;     // 20% reduction in raid encounter chance
  const LIGHTHOUSE_MAX_PER_ISLAND = 1;        // Can only build 1 per island

  // ─── PATCH: Add Lighthouse to BLUEPRINTS ─────────────────────────────────
  // Create a new lighthouse variant with Cycle 5 specs: level 5, lower cost
  if (!BLUEPRINTS.lighthouse_cycle5) {
    BLUEPRINTS.lighthouse_cycle5 = {
      name: 'Lighthouse',
      w: 26,
      h: 60,
      cost: {
        stone: 30,
        wood: 20,
        crystals: 10
      },
      key: '',
      blocks: true,
      minLevel: 5,
      upkeep: 2,
      desc: 'Beacon tower. +15% sailing speed, increases ship visibility range, reduces raid encounters by 20%.'
    };
  }

  // ─── UTILITY: Check if island has a lighthouse ───────────────────────────
  function islandHasLighthouse() {
    if (typeof state === 'undefined' || !state.buildings) return false;
    let count = 0;
    for (let b of state.buildings) {
      if (b.type === 'lighthouse' || b.type === 'lighthouse_cycle5') {
        count++;
      }
    }
    return count > 0;
  }

  // ─── UTILITY: Count lighthouses on island ────────────────────────────────
  function countLighthouses() {
    if (typeof state === 'undefined' || !state.buildings) return 0;
    let count = 0;
    for (let b of state.buildings) {
      if (b.type === 'lighthouse' || b.type === 'lighthouse_cycle5') {
        count++;
      }
    }
    return count;
  }

  // ─── UTILITY: Find lighthouse building (if exists) ───────────────────────
  function getLighthouseBuilding() {
    if (typeof state === 'undefined' || !state.buildings) return null;
    for (let b of state.buildings) {
      if ((b.type === 'lighthouse' || b.type === 'lighthouse_cycle5') && !b.ruined) {
        return b;
      }
    }
    return null;
  }

  // ─── PATCH: Building Placement Validation ────────────────────────────────
  // Intercept placeBuilding to add lighthouse-specific checks
  const originalPlaceBuilding = window.placeBuilding;
  window.placeBuilding = function(wx, wy) {
    // Defensive check
    if (typeof state === 'undefined' || typeof BLUEPRINTS === 'undefined') {
      if (originalPlaceBuilding) originalPlaceBuilding(wx, wy);
      return;
    }

    // Check for lighthouse placement limits
    if (state.buildType === 'lighthouse_cycle5') {
      if (countLighthouses() >= LIGHTHOUSE_MAX_PER_ISLAND) {
        let sx = typeof w2sX === 'function' ? w2sX(wx) : wx;
        let sy = typeof w2sY === 'function' ? w2sY(wy) : wy;
        if (typeof addFloatingText === 'function') {
          addFloatingText(sx, sy - 20, 'Can only build 1 lighthouse per island', '#ff6644');
        }
        return;
      }

      // Check if near coast/island edge
      if (typeof islandEdgeDist === 'function') {
        let edgeDist = islandEdgeDist(wx, wy);
        // Allow placement if very close to island edge (within 20px equivalent)
        if (edgeDist < -5) {
          let sx = typeof w2sX === 'function' ? w2sX(wx) : wx;
          let sy = typeof w2sY === 'function' ? w2sY(wy) : wy;
          if (typeof addFloatingText === 'function') {
            addFloatingText(sx, sy - 20, 'Lighthouse must be near coast', '#ff6644');
          }
          return;
        }
      }
    }

    // Call original placement logic
    if (originalPlaceBuilding) originalPlaceBuilding(wx, wy);
  };

  // ─── SAILING SPEED MODIFIER ──────────────────────────────────────────────
  // Hook into any sailing speed calculation
  // Check for global sailing speed modifier function and patch it
  if (typeof window.getSailingSpeedMultiplier !== 'function') {
    window.getSailingSpeedMultiplier = function() {
      let mult = 1.0;
      if (islandHasLighthouse()) {
        mult *= LIGHTHOUSE_SAILING_BOOST;
      }
      return mult;
    };
  } else {
    // Patch existing function
    const originalGetSailingSpeed = window.getSailingSpeedMultiplier;
    window.getSailingSpeedMultiplier = function() {
      let mult = originalGetSailingSpeed();
      if (islandHasLighthouse()) {
        mult *= LIGHTHOUSE_SAILING_BOOST;
      }
      return mult;
    };
  }

  // ─── RAID ENCOUNTER REDUCTION ────────────────────────────────────────────
  // Patch raid/encounter chance calculation if it exists
  if (typeof window.getRaidChanceMultiplier !== 'function') {
    window.getRaidChanceMultiplier = function() {
      if (islandHasLighthouse()) {
        return LIGHTHOUSE_RAID_REDUCTION;
      }
      return 1.0;
    };
  } else {
    // Patch existing function
    const originalGetRaidChance = window.getRaidChanceMultiplier;
    window.getRaidChanceMultiplier = function() {
      let mult = originalGetRaidChance();
      if (islandHasLighthouse()) {
        mult *= LIGHTHOUSE_RAID_REDUCTION;
      }
      return mult;
    };
  }

  // ─── DRAWING: Enhanced Lighthouse Rendering ──────────────────────────────
  // This function can be called by the main drawing loop
  window.drawLighthouseEnhanced = function(b, sx, sy, bw, bh, fc) {
    // Defensive checks
    if (!b || typeof sx !== 'number' || typeof sy !== 'number') return;
    if (typeof bw !== 'number' || typeof bh !== 'number') return;
    if (!fc || !fc.trim || !fc.wall || !fc.column) {
      fc = { trim: [200, 190, 170], wall: [180, 160, 140], column: [160, 140, 120] };
    }

    push();
    translate(sx, sy);

    // Draw shadow
    noStroke();
    fill(0, 0, 0, 30);
    ellipse(0, bh / 2 + 2, bw * 0.8, 6);

    // Base platform
    fill(fc.trim[0] - 20, fc.trim[1] - 23, fc.trim[2] - 25);
    rect(-bw / 2, bh / 2 - 12, bw, 12, 1);
    fill(fc.trim[0] - 10, fc.trim[1] - 13, fc.trim[2] - 17);
    rect(-bw / 2 + 1, bh / 2 - 14, bw - 2, 3, 1);

    // Tapered tower body (wider at base, tapers toward top)
    let lhBotW = bw - 2;
    let lhTopW = bw * 0.5;  // More tapered for better visual

    fill(fc.wall[0], fc.wall[1], fc.wall[2]);
    beginShape();
    vertex(-lhBotW / 2, bh / 2 - 14);
    vertex(-lhTopW / 2, -bh / 2 + 12);
    vertex(lhTopW / 2, -bh / 2 + 12);
    vertex(lhBotW / 2, bh / 2 - 14);
    endShape(CLOSE);

    // Stone coursing (horizontal bands)
    stroke(fc.wall[0] - 20, fc.wall[1] - 20, fc.wall[2] - 20, 55);
    strokeWeight(0.5);
    for (let lhy = -bh / 2 + 18; lhy < bh / 2 - 16; lhy += 5) {
      let frac = (lhy - (-bh / 2 + 12)) / (bh - 26);
      frac = constrain(frac, 0, 1);
      let halfW = lerp(lhTopW / 2, lhBotW / 2, frac);
      line(-halfW + 1, lhy, halfW - 1, lhy);
    }
    noStroke();

    // Windows/ports along tower
    fill(40, 55, 80, 200);
    rect(-1.5, -bh / 2 + 20, 3, 4, 1);
    rect(-1.5, -bh / 2 + 30, 3, 4, 1);
    rect(-1.5, -bh / 2 + 40, 3, 4, 1);
    rect(-1.5, bh / 2 - 26, 3, 4, 1);

    // Top gallery/parapet
    fill(fc.trim[0] - 10, fc.trim[1] - 10, fc.trim[2] - 13);
    rect(-lhTopW / 2 - 3, -bh / 2 + 8, lhTopW + 6, 5, 1);
    fill(fc.trim[0], fc.trim[1], fc.trim[2]);
    rect(-lhTopW / 2 - 4, -bh / 2 + 6, lhTopW + 8, 3, 1);

    // Parapet columns
    fill(fc.trim[0] - 15, fc.trim[1] - 16, fc.trim[2] - 17);
    rect(-lhTopW / 2 - 3, -bh / 2 + 4, 2, 4);
    rect(lhTopW / 2 + 1, -bh / 2 + 4, 2, 4);

    // Lantern chamber (the top structure housing the light)
    fill(fc.column[0] + 5, fc.column[1] + 5, fc.column[2] + 2);
    rect(-lhTopW / 4 - 1, -bh / 2, lhTopW / 2 + 2, 8, 1);

    // Lantern roof
    fill(140, 110, 50);
    arc(0, -bh / 2, lhTopW / 2 + 4, 5, PI, TWO_PI, PIE);

    // Beacon light cap
    fill(150, 120, 55);
    rect(-1.5, -bh / 2 - 2, 3, 3, 1);

    // ─── ANIMATED LIGHT EFFECT ──────────────────────────────────────────────
    // The beacon pulses and rotates with a light beam
    {
      let lhBright = (typeof getSkyBrightness === 'function') ? getSkyBrightness() : 0.5;
      let lhNight = lhBright < 0.4 ? 1.0 : 0;  // Full glow at night

      // Pulsing glow in lantern
      let lhPulse = 0.6 + sin(frameCount * 0.04 + b.x * 0.08) * 0.4;
      fill(255, 220, 100, 150 * lhNight * lhPulse);
      rect(-lhTopW / 4, -bh / 2 + 1, lhTopW / 2, 6, 1);

      // Bright core
      fill(255, 240, 180, 200 * lhNight * lhPulse);
      rect(-lhTopW / 4 + 2, -bh / 2 + 2, lhTopW / 2 - 4, 4, 1);

      // Rotating light beam (visible only at night)
      if (lhNight > 0.8 && typeof frameCount !== 'undefined') {
        let beamAngle = (frameCount * 0.015 + (b.x || 0) * 0.01) % TWO_PI;
        let beamLen = 60;
        let beamDx = cos(beamAngle) * beamLen;
        let beamDy = sin(beamAngle) * 40;

        // Light beam cone
        fill(255, 240, 160, 20);
        beginShape();
        vertex(0, -bh / 2 + 4);
        vertex(beamDx - 10, -bh / 2 + 4 + beamDy - 8);
        vertex(beamDx + 10, -bh / 2 + 4 + beamDy + 8);
        endShape(CLOSE);

        // Glow halo around beam origin
        fill(255, 220, 100, 60);
        ellipse(0, -bh / 2 + 4, 16, 12);
      }

      // Ambient light aura (day and night, stronger at night)
      let auraAlpha = 25 * (0.3 + lhNight * 0.7) * lhPulse;
      fill(255, 200, 80, auraAlpha);
      ellipse(0, -bh / 2 + 2, lhTopW + 8, 14);
    }

    pop();
  };

  // ─── PATCH: Drawing Integration ──────────────────────────────────────────
  // Hook into drawOneBuilding to handle the enhanced lighthouse
  const originalDrawOneBuilding = window.drawOneBuilding;
  window.drawOneBuilding = function(b) {
    // Defensive checks
    if (typeof b !== 'object' || !b.type) {
      if (originalDrawOneBuilding) originalDrawOneBuilding(b);
      return;
    }

    // If it's our enhanced lighthouse, draw it with special renderer
    if (b.type === 'lighthouse_cycle5') {
      let sx = (typeof w2sX === 'function') ? w2sX(b.x) : b.x;
      let sy = (typeof w2sY === 'function') ? w2sY(b.y) : b.y;

      // Cull offscreen buildings
      if (sx < -80 || sx > (typeof width !== 'undefined' ? width : 800) + 80 ||
          sy < -80 || sy > (typeof height !== 'undefined' ? height : 600) + 80) {
        return;
      }

      let bw = 26;
      let bh = 60;
      let fc = (typeof getFactionBuildingColors === 'function') ? getFactionBuildingColors() :
               { trim: [200, 190, 170], wall: [180, 160, 140], column: [160, 140, 120] };

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

      // Draw the lighthouse
      window.drawLighthouseEnhanced(b, sx, sy, bw, bh, fc);
    } else {
      // Fall back to original drawing for other buildings
      if (originalDrawOneBuilding) originalDrawOneBuilding(b);
    }
  };

  // ─── STATE INITIALIZATION ────────────────────────────────────────────────
  // Initialize lighthouse tracking in state if needed
  if (typeof state !== 'undefined' && state !== null) {
    if (!state._lighthouseActive) {
      state._lighthouseActive = false;
    }
  }

  // ─── EXPORT API ──────────────────────────────────────────────────────────
  // Make functions globally available for use by other systems
  window.islandHasLighthouse = islandHasLighthouse;
  window.countLighthouses = countLighthouses;
  window.getLighthouseBuilding = getLighthouseBuilding;
  window.LIGHTHOUSE_SAILING_BOOST = LIGHTHOUSE_SAILING_BOOST;
  window.LIGHTHOUSE_VISIBILITY_BOOST = LIGHTHOUSE_VISIBILITY_BOOST;
  window.LIGHTHOUSE_RAID_REDUCTION = LIGHTHOUSE_RAID_REDUCTION;

  console.log('[cycle5_lighthouse] System ready. Lighthouse building unlocked at level 5.');
  console.log('[cycle5_lighthouse] Benefits: +15% sailing speed, +25% visibility, -20% raids');

})();
