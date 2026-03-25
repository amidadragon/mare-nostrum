/**
 * CYCLE 5: Faction-Specific Unit Sprites
 * Adds visual variety to military units through faction-specific helmet shapes, shield designs,
 * and formation indicators.
 *
 * Features:
 * - Faction-specific helmet variations (Galea, Corinthian, Nemes, Hoplite, Horned, Tiara, Conical, Winged)
 * - Faction-specific shield shapes and emblems (Scutum, Round, Kite, Aspis, Buckler, Crescent, Hexagonal)
 * - Formation indicators (line, wedge, square shapes)
 * - Morale visualization (color-coded bar above formation)
 */

(function() {
  'use strict';

  // ================================================================
  // HELMET RENDERING FUNCTIONS BY FACTION
  // ================================================================

  function drawRomeHelmet(x, y, mil) {
    // Galea with tall crest (plume on top)
    push();
    translate(x, y);
    noStroke();

    // Main helm dome
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-3, -13, 6, 3);

    // Cheek guards
    fill(mil.helm[0] * 0.85, mil.helm[1] * 0.85, mil.helm[2] * 0.85);
    rect(-4, -11, 1, 3);
    rect(3, -11, 1, 3);

    // Tall plume on top (red/crimson)
    fill(mil.plume[0], mil.plume[1], mil.plume[2]);
    rect(-1, -17, 2, 5);

    pop();
  }

  function drawCarthageHelmet(x, y, mil) {
    // Corinthian-style with nose guard
    push();
    translate(x, y);
    noStroke();

    // Main helm
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    ellipse(0, -12, 6, 5);

    // Nose guard
    fill(mil.helm[0] * 0.8, mil.helm[1] * 0.8, mil.helm[2] * 0.8);
    rect(-1, -11, 2, 4);

    // Cheek protectors
    ellipse(-3, -10, 2, 3);
    ellipse(3, -10, 2, 3);

    pop();
  }

  function drawEgyptHelmet(x, y, mil) {
    // Nemes headdress / pharaoh style striped cloth
    push();
    translate(x, y);
    noStroke();

    // Main cloth wrap (turquoise/teal)
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-3, -13, 6, 4);

    // Accent stripe (gold)
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-3, -11, 6, 1);

    // Front lappet
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    triangle(-3, -9, 3, -9, 3, -8);

    pop();
  }

  function drawGreeceHelmet(x, y, mil) {
    // Hoplite helm with horizontal crest slot
    push();
    translate(x, y);
    noStroke();

    // Main helm dome
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-3, -13, 6, 4);

    // Crest slot
    fill(80, 70, 60);
    rect(-4, -11, 8, 1);

    // Crest plume (horizontal)
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    rect(-5, -11, 10, 1);

    pop();
  }

  function drawSeaPeopleHelmet(x, y, mil) {
    // Horned helmet with twin peaks
    push();
    translate(x, y);
    noStroke();

    // Main helm base
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-2, -12, 4, 3);
    ellipse(-2, -12, 3, 2);
    ellipse(2, -12, 3, 2);

    // Left horn
    fill(mil.plume[0], mil.plume[1], mil.plume[2]);
    triangle(-3, -13, -4, -16, -2, -14);

    // Right horn
    triangle(3, -13, 4, -16, 2, -14);

    pop();
  }

  function drawPersiaHelmet(x, y, mil) {
    // Tiara cap (tall pointed top)
    push();
    translate(x, y);
    noStroke();

    // Base of tiara
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    rect(-3, -11, 6, 2);

    // Sides
    fill(mil.helm[0] * 0.9, mil.helm[1] * 0.9, mil.helm[2] * 0.9);
    triangle(-3, -11, -4, -10, -3, -9);
    triangle(3, -11, 4, -10, 3, -9);

    // Tall pointed crown
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    triangle(-2, -11, 2, -11, 0, -18);

    pop();
  }

  function drawPhoeniciasHelmet(x, y, mil) {
    // Conical cap
    push();
    translate(x, y);
    noStroke();

    // Conical crown
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    triangle(-3, -11, 3, -11, 0, -16);

    // Brim
    fill(mil.helm[0] * 0.85, mil.helm[1] * 0.85, mil.helm[2] * 0.85);
    ellipse(0, -11, 6, 2);

    pop();
  }

  function drawGaulHelmet(x, y, mil) {
    // Winged helmet with side wings
    push();
    translate(x, y);
    noStroke();

    // Main dome
    fill(mil.helm[0], mil.helm[1], mil.helm[2]);
    ellipse(0, -12, 5, 4);

    // Left wing
    fill(mil.helmCrest[0], mil.helmCrest[1], mil.helmCrest[2]);
    triangle(-3, -10, -6, -12, -4, -8);

    // Right wing
    triangle(3, -10, 6, -12, 4, -8);

    pop();
  }

  // ================================================================
  // SHIELD RENDERING FUNCTIONS BY FACTION
  // ================================================================

  function drawRomeShield(x, y, mil) {
    // Scutum: tall rectangular with boss
    push();
    translate(x, y);
    noStroke();

    // Main shield
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    rect(-2.5, -6, 2, 6, 0.5);

    // Shield boss (center bump)
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    ellipse(-1.5, -3, 2, 2);

    pop();
  }

  function drawCarthageShield(x, y, mil) {
    // Round shield with moon emblem
    push();
    translate(x, y);
    noStroke();

    // Main round shield
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    ellipse(-4, -3, 5, 5);

    // Moon emblem (accent color)
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    arc(-4, -3, 2.5, 2.5, 0, PI, CHORD);

    pop();
  }

  function drawEgyptShield(x, y, mil) {
    // Tall kite shield
    push();
    translate(x, y);
    noStroke();

    // Kite shape: tall and pointed
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    quad(-2, -7, -3, -2, -2, 2, 0, -7);

    // Stripe accent
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    rect(-2, -4, 2, 1);

    pop();
  }

  function drawGreeceShield(x, y, mil) {
    // Aspis: round hoplon with lambda emblem
    push();
    translate(x, y);
    noStroke();

    // Main round shield
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    ellipse(-4, -3, 5, 5);

    // Lambda symbol (>) in center
    stroke(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    strokeWeight(1.5);
    line(-4.5, -5, -3.5, -2);
    line(-3.5, -2, -4.5, 1);
    noStroke();

    pop();
  }

  function drawSeaPeopleShield(x, y, mil) {
    // Small round buckler
    push();
    translate(x, y);
    noStroke();

    // Small buckler
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    ellipse(-4, -3, 3.5, 3.5);

    // Center boss
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    ellipse(-4, -3, 1.5, 1.5);

    pop();
  }

  function drawPersiaShield(x, y, mil) {
    // Gerron: crescent/figure-8 shaped shield
    push();
    translate(x, y);
    noStroke();

    // Crescent shape using two circles
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    ellipse(-4, -3, 4, 6);

    // Inner crescent (cutout)
    fill(15, 10, 8);
    ellipse(-4, -3, 2, 3);

    pop();
  }

  function drawPhoeniciaShield(x, y, mil) {
    // Round shield with bull emblem
    push();
    translate(x, y);
    noStroke();

    // Main round shield
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    ellipse(-4, -3, 5, 5);

    // Bull horns (accent)
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    triangle(-5, -4, -6, -6, -4.5, -4);
    triangle(-3, -4, -2, -6, -3.5, -4);

    pop();
  }

  function drawGaulShield(x, y, mil) {
    // Hexagonal shield
    push();
    translate(x, y);
    noStroke();

    // Hexagon approximation using multiple lines
    fill(mil.shield[0], mil.shield[1], mil.shield[2]);
    beginShape();
    vertex(-3, -7);
    vertex(-4.5, -3);
    vertex(-3, 1);
    vertex(0, 2);
    vertex(3, 1);
    vertex(4.5, -3);
    endShape(CLOSE);

    // Boss accent
    fill(mil.shieldBoss[0], mil.shieldBoss[1], mil.shieldBoss[2]);
    ellipse(0.5, -2, 1.5, 1.5);

    pop();
  }

  // ================================================================
  // FACTION HELMET & SHIELD DISPATCH
  // ================================================================

  function getFaction() {
    if (typeof state !== 'undefined' && state.faction) {
      return state.faction;
    }
    return 'rome';
  }

  function drawFactionHelmet(faction, x, y, mil) {
    if (!mil) return;

    switch (faction) {
      case 'rome': drawRomeHelmet(x, y, mil); break;
      case 'carthage': drawCarthageHelmet(x, y, mil); break;
      case 'egypt': drawEgyptHelmet(x, y, mil); break;
      case 'greece': drawGreeceHelmet(x, y, mil); break;
      case 'seapeople': drawSeaPeopleHelmet(x, y, mil); break;
      case 'persia': drawPersiaHelmet(x, y, mil); break;
      case 'phoenicia': drawPhoeniciasHelmet(x, y, mil); break;
      case 'gaul': drawGaulHelmet(x, y, mil); break;
      default: drawRomeHelmet(x, y, mil);
    }
  }

  function drawFactionShield(faction, x, y, mil) {
    if (!mil) return;

    switch (faction) {
      case 'rome': drawRomeShield(x, y, mil); break;
      case 'carthage': drawCarthageShield(x, y, mil); break;
      case 'egypt': drawEgyptShield(x, y, mil); break;
      case 'greece': drawGreeceShield(x, y, mil); break;
      case 'seapeople': drawSeaPeopleShield(x, y, mil); break;
      case 'persia': drawPersiaShield(x, y, mil); break;
      case 'phoenicia': drawPhoeniciaShield(x, y, mil); break;
      case 'gaul': drawGaulShield(x, y, mil); break;
      default: drawRomeShield(x, y, mil);
    }
  }

  // ================================================================
  // FORMATION INDICATORS
  // ================================================================

  function drawFormationIndicator(army, faction) {
    if (!army || !Array.isArray(army) || army.length === 0) return;

    push();
    noStroke();

    // Get army bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let u of army) {
      if (u && typeof u.x === 'number' && typeof u.y === 'number') {
        minX = min(minX, u.x);
        maxX = max(maxX, u.x);
        minY = min(minY, u.y);
        maxY = max(maxY, u.y);
      }
    }

    if (minX === Infinity) {
      pop();
      return;
    }

    let centerX = (minX + maxX) / 2;
    let centerY = (minY + maxY) / 2;

    // Draw formation shape above units (small indicator)
    let formationType = army.length % 3; // Cycle through 3 formation types

    push();
    translate(w2sX(centerX), w2sY(centerY) - 30);
    noFill();
    stroke(200, 180, 100, 120);
    strokeWeight(1);

    if (formationType === 0) {
      // Line formation: horizontal dash
      line(-8, 0, 8, 0);
    } else if (formationType === 1) {
      // Wedge formation: triangle
      triangle(-6, 4, 6, 4, 0, -4);
    } else {
      // Square formation: rect
      rect(-6, -4, 12, 8);
    }
    pop();

    pop();
  }

  function drawMoraleBar(army) {
    if (!army || !Array.isArray(army) || army.length === 0) return;
    if (typeof state === 'undefined' || !state.legia) return;

    push();

    // Get army bounding box for positioning
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    for (let u of army) {
      if (u && typeof u.x === 'number' && typeof u.y === 'number') {
        minX = min(minX, u.x);
        maxX = max(maxX, u.x);
        minY = min(minY, u.y);
      }
    }

    if (minX === Infinity) {
      pop();
      return;
    }

    let centerX = w2sX((minX + maxX) / 2);
    let barY = w2sY(minY) - 15;

    // Morale color: green (high) -> yellow (medium) -> red (low)
    let morale = state.legia.morale || 75;
    let moraleColor;

    if (morale > 60) {
      moraleColor = color(100, 200, 80); // Green
    } else if (morale > 30) {
      moraleColor = color(220, 180, 50); // Yellow
    } else {
      moraleColor = color(200, 80, 80); // Red
    }

    // Draw morale bar (thin horizontal)
    noStroke();
    fill(moraleColor);
    rect(centerX - 12, barY, 24 * (morale / 100), 2);

    // Border
    stroke(150, 140, 130);
    strokeWeight(1);
    noFill();
    rect(centerX - 12, barY, 24, 2);

    pop();
  }

  // ================================================================
  // MONKEY PATCH: Override drawUnitSprite to add faction details
  // ================================================================

  // Store original function if it exists
  let _originalDrawUnitSprite = typeof window.drawUnitSprite === 'function'
    ? window.drawUnitSprite
    : null;

  window.drawUnitSprite = function(unit, idx) {
    // Call original drawing first
    if (_originalDrawUnitSprite) {
      _originalDrawUnitSprite(unit, idx);
    }

    // Now add faction-specific embellishments
    if (!unit || typeof unit.x !== 'number' || typeof unit.y !== 'number') return;

    let sx = typeof w2sX === 'function' ? w2sX(unit.x) : null;
    let sy = typeof w2sY === 'function' ? w2sY(unit.y) : null;

    if (!sx || !sy || sx < -30 || sx > (typeof width !== 'undefined' ? width : 0) + 30 ||
        sy < -30 || sy > (typeof height !== 'undefined' ? height : 0) + 30) {
      return;
    }

    let mil = typeof getFactionMilitary === 'function' ? getFactionMilitary() : null;
    if (!mil) return;

    let faction = getFaction();
    let floatOffset = typeof _floatOffset !== 'undefined' ? _floatOffset : (typeof floatOffset !== 'undefined' ? floatOffset : 0);

    push();
    // Position relative to unit, accounting for walking animation and facing
    let facing = unit.facing || 1;
    translate(sx, sy + floatOffset);
    scale(facing, 1);

    // Draw faction-specific helmet (replaces generic one)
    if (unit.type !== 'siege_ram') {
      drawFactionHelmet(faction, 0, 0, mil);

      // Draw faction-specific shield
      drawFactionShield(faction, -4, -2, mil);
    }

    pop();
  };

  // ================================================================
  // INTEGRATION WITH ARMY RENDERING
  // ================================================================

  // Patch army drawing to include formation indicators and morale bars
  let _originalDrawArmy = typeof window.drawArmy === 'function'
    ? window.drawArmy
    : null;

  window.drawArmy = function(army) {
    // Call original drawing
    if (_originalDrawArmy) {
      _originalDrawArmy(army);
    }

    // Add formation and morale visual feedback
    let faction = getFaction();
    drawFormationIndicator(army, faction);
    drawMoraleBar(army);
  };

  // ================================================================
  // PUBLIC API
  // ================================================================

  window.UNIT_SPRITES = {
    drawFactionHelmet: drawFactionHelmet,
    drawFactionShield: drawFactionShield,
    drawFormationIndicator: drawFormationIndicator,
    drawMoraleBar: drawMoraleBar,
    getFaction: getFaction,
  };

})();
