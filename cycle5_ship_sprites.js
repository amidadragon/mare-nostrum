/**
 * CYCLE 5: Faction-Specific Ship Sprites
 * Adds visual variety to ships through faction decorations, hull colors, and figureheads
 *
 * Features:
 * - Faction-specific prow figureheads (eagle, horse, eye of horus, owl, lion, cedar, boar)
 * - Hull color variations matching faction identity
 * - Shield patterns along hull sides
 * - Applies to both main rowing boat and ambient ships
 */

(function() {
  'use strict';

  // ================================================================
  // HULL COLOR PALETTE BY FACTION
  // ================================================================
  const HULL_COLORS = {
    rome: { light: [95, 65, 35], dark: [65, 35, 15], accent: [150, 80, 40] },           // Dark reddish-brown
    carthage: { light: [85, 50, 75], dark: [55, 30, 50], accent: [120, 50, 160] },       // Purple-tinted dark wood
    egypt: { light: [185, 155, 105], dark: [155, 125, 75], accent: [200, 170, 40] },    // Light cedar (warm tan)
    greece: { light: [100, 120, 135], dark: [70, 90, 110], accent: [50, 100, 170] },    // Blue-grey
    seapeople: { light: [30, 25, 20], dark: [20, 15, 10], accent: [26, 58, 92] },       // Very dark (near black)
    persia: { light: [110, 70, 50], dark: [80, 45, 25], accent: [106, 42, 138] },       // Reddish mahogany
    phoenicia: { light: [140, 85, 60], dark: [100, 55, 35], accent: [138, 16, 80] },    // Cedar red
    gaul: { light: [145, 125, 85], dark: [110, 95, 60], accent: [42, 106, 48] }         // Natural light oak
  };

  // ================================================================
  // HELPER: Get faction from state or parameter
  // ================================================================
  function getFaction() {
    if (typeof state !== 'undefined' && state.faction) {
      return state.faction;
    }
    if (typeof getFactionMilitary === 'function') {
      let mil = getFactionMilitary();
      // Match by conquest flag color
      for (let key in FACTION_MILITARY) {
        if (FACTION_MILITARY[key].conquestFlag === mil.conquestFlag) {
          return key;
        }
      }
    }
    return 'rome';
  }

  // ================================================================
  // FIGUREHEAD DRAWING FUNCTIONS
  // ================================================================

  function drawEagleFigurehead(x, y) {
    // Eagle head at bow (rome)
    push();
    translate(x, y);
    fill(200, 170, 60); // gold
    // Head
    ellipse(0, 0, 6, 8);
    // Beak
    fill(180, 150, 50);
    triangle(3, -1, 8, -1, 5, 1);
    // Eyes
    fill(0);
    ellipse(-1, -2, 2, 2);
    fill(200, 170, 60);
    ellipse(-1, -2, 1, 1);
    pop();
  }

  function drawHorseHeadFigurehead(x, y) {
    // Horse head at bow (carthage)
    push();
    translate(x, y);
    fill(160, 120, 80); // bronze
    // Head oval
    ellipse(0, 0, 8, 10);
    // Snout
    fill(140, 100, 60);
    ellipse(0, 4, 6, 5);
    // Eyes
    fill(0);
    ellipse(-2, -2, 2, 2);
    ellipse(2, -2, 2, 2);
    // Ears
    fill(160, 120, 80);
    triangle(-4, -6, -2, -8, -2, -4);
    triangle(4, -6, 2, -8, 2, -4);
    pop();
  }

  function drawEyeOfHorusFigurehead(x, y) {
    // Eye of Horus (egypt)
    push();
    translate(x, y);
    // Gold background circle
    fill(200, 170, 40);
    ellipse(0, 0, 8, 8);
    // Blue iris
    fill(64, 176, 160);
    ellipse(0, 0, 5, 5);
    // Black pupil
    fill(0);
    ellipse(0, 0, 2, 2);
    // Upper eyelid mark
    fill(64, 176, 160);
    rect(-4, -4, 8, 2);
    pop();
  }

  function drawOwlFigurehead(x, y) {
    // Owl figurehead (greece)
    push();
    translate(x, y);
    fill(200, 190, 170); // white/grey
    // Head
    ellipse(0, 0, 8, 9);
    // Eyes
    fill(0);
    ellipse(-2, -1, 3, 4);
    ellipse(2, -1, 3, 4);
    fill(200, 190, 170);
    ellipse(-2, 0, 1, 2);
    ellipse(2, 0, 1, 2);
    // Beak
    fill(150, 130, 110);
    triangle(-1, 2, 1, 2, 0, 4);
    pop();
  }

  function drawLionFigurehead(x, y) {
    // Lion head (persia)
    push();
    translate(x, y);
    fill(200, 170, 60); // gold
    // Head
    ellipse(0, 0, 9, 8);
    // Mane (rays)
    for (let i = 0; i < 6; i++) {
      let ang = (i / 6) * TWO_PI - HALF_PI;
      let mx = cos(ang) * 5;
      let my = sin(ang) * 5;
      triangle(mx * 0.8, my * 0.8, mx, my, mx + 1, my - 1);
    }
    // Eyes
    fill(0);
    ellipse(-2, -2, 2, 2);
    ellipse(2, -2, 2, 2);
    // Snout/Nose
    fill(180, 150, 50);
    ellipse(0, 2, 4, 3);
    pop();
  }

  function drawCedarOrnament(x, y) {
    // Cedar tree ornament (phoenicia)
    push();
    translate(x, y);
    fill(80, 140, 60); // green
    // Triangle tree shape (3 tiers)
    triangle(-6, 6, 0, 0, 6, 6);
    triangle(-4, 3, 0, -2, 4, 3);
    triangle(-2, 0, 0, -4, 2, 0);
    // Trunk
    fill(120, 80, 40);
    rect(-1, 4, 2, 4);
    pop();
  }

  function drawBoarFigurehead(x, y) {
    // Boar head (gaul)
    push();
    translate(x, y);
    fill(120, 80, 50); // brown
    // Head
    ellipse(0, 0, 8, 8);
    // Snout
    fill(100, 65, 40);
    ellipse(1, 3, 5, 4);
    // Eyes
    fill(0);
    ellipse(-2, -2, 2, 1);
    ellipse(2, -2, 2, 1);
    // Tusks
    fill(180, 160, 140);
    triangle(-2, 4, -3, 6, -1, 5);
    triangle(2, 4, 3, 6, 1, 5);
    // Ears
    fill(120, 80, 50);
    triangle(-5, -4, -6, -6, -4, -5);
    triangle(5, -4, 6, -6, 4, -5);
    pop();
  }

  // ================================================================
  // DRAW FACTION-SPECIFIC PROW FIGUREHEAD
  // ================================================================
  function drawProwFigurehead(faction, x, y) {
    if (!faction) faction = getFaction();

    switch (faction) {
      case 'rome':
        drawEagleFigurehead(x, y);
        break;
      case 'carthage':
        drawHorseHeadFigurehead(x, y);
        break;
      case 'egypt':
        drawEyeOfHorusFigurehead(x, y);
        break;
      case 'greece':
        drawOwlFigurehead(x, y);
        break;
      case 'seapeople':
        // Sea people already have dragon prow in base code
        break;
      case 'persia':
        drawLionFigurehead(x, y);
        break;
      case 'phoenicia':
        drawCedarOrnament(x, y);
        break;
      case 'gaul':
        drawBoarFigurehead(x, y);
        break;
    }
  }

  // ================================================================
  // GET HULL COLORS FOR FACTION
  // ================================================================
  function getHullColor(faction, colorType = 'light') {
    if (!faction) faction = getFaction();
    let palette = HULL_COLORS[faction] || HULL_COLORS.rome;
    return palette[colorType] || palette.light;
  }

  // ================================================================
  // DRAW SHIELD PATTERN ON HULL SIDE
  // ================================================================
  function drawShieldPattern(faction, isTopSide = true) {
    if (!faction) faction = getFaction();

    let shieldColor = null;
    if (typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[faction]) {
      shieldColor = FACTION_MILITARY[faction].conquestFlag;
    }

    if (!shieldColor) shieldColor = [160, 35, 25]; // fallback

    let shieldCount = 4;
    let shieldSpacing = 18;
    let startX = -24;
    let yPos = isTopSide ? -7 : 7;

    fill(shieldColor[0], shieldColor[1], shieldColor[2]);
    noStroke();

    for (let i = 0; i < shieldCount; i++) {
      let sx = startX + i * shieldSpacing;
      // Small circle shield
      ellipse(sx, yPos, 4, 4);
      // Shield boss (lighter center)
      fill(shieldColor[0] + 30, shieldColor[1] + 30, shieldColor[2] + 30);
      ellipse(sx, yPos, 2, 2);
      fill(shieldColor[0], shieldColor[1], shieldColor[2]);
    }
  }

  // ================================================================
  // PATCH: Override drawRowingBoat with faction variants
  // ================================================================

  // Store original drawRowingBoat reference
  let originalDrawRowingBoat = window.drawRowingBoat;

  window.drawRowingBoat = function() {
    let faction = getFaction();
    let r = typeof state !== 'undefined' ? state.rowing : null;
    if (!r || !r.active) return;

    let sx = typeof w2sX === 'function' ? w2sX(r.x) : r.x;
    let sy = typeof w2sY === 'function' ? w2sY(r.y) : r.y;
    let bob = typeof sin === 'function' ? sin(frameCount * 0.03) * 2 : 0;

    // Call original function to render base ship
    if (originalDrawRowingBoat) {
      originalDrawRowingBoat();
    }

    // Add faction-specific decorations AFTER base render
    let verticalness = Math.abs(Math.sin(r.angle));
    let useTopDown = verticalness > 0.55;

    push();

    if (useTopDown) {
      // TOP-DOWN view: figurehead at front (bow)
      translate(Math.floor(sx), Math.floor(sy + bob));
      rotate(r.angle);
      drawProwFigurehead(faction, 60, 0);
      pop();
    } else {
      // SIDE view: figurehead at front, with flip
      let drawAngle = r.angle;
      let flipX = 1;
      if (drawAngle > Math.PI / 2) { drawAngle -= Math.PI; flipX = -1; }
      else if (drawAngle < -Math.PI / 2) { drawAngle += Math.PI; flipX = -1; }

      translate(Math.floor(sx), Math.floor(sy + bob));
      rotate(drawAngle);
      scale(flipX, 1);
      drawProwFigurehead(faction, 55, -3);
      pop();
    }
  };

  // ================================================================
  // PATCH: Enhance drawAmbientShips with hull colors
  // ================================================================

  let originalDrawAmbientShips = window.drawAmbientShips;

  window.drawAmbientShips = function() {
    if (typeof _ambientShips === 'undefined' || !_ambientShips) {
      if (typeof _initAmbientShips === 'function') _initAmbientShips();
    }

    let oceanTop = typeof max === 'function' ? max(height * 0.06, height * 0.25 - horizonOffset) : height * 0.1;
    let bright = typeof getSkyBrightness === 'function' ? getSkyBrightness() : 0.5;
    noStroke();

    for (let ship of _ambientShips) {
      ship.t += ship.speed;
      if (ship.t > 1) {
        ship.t = 0;
        ship.fromX = ship.toX;
        ship.fromY = ship.toY;
        let cx = typeof WORLD !== 'undefined' ? WORLD.islandCX : 0;
        let cy = typeof WORLD !== 'undefined' ? WORLD.islandCY : 0;
        let _newTargets = [{ x: cx, y: cy }];

        if (typeof state !== 'undefined' && state.nations) {
          let nk = Object.keys(state.nations);
          for (let k of nk) {
            let n = state.nations[k];
            if (n && !n.defeated) {
              _newTargets.push({ x: n.isleX, y: n.isleY, nation: k });
            }
          }
        }

        if (typeof state !== 'undefined') {
          if (state.conquest) _newTargets.push({ x: state.conquest.isleX, y: state.conquest.isleY });
          if (state.plenty) _newTargets.push({ x: state.plenty.isleX, y: state.plenty.isleY });
        }

        let pick = _newTargets[Math.floor(Math.random() * _newTargets.length)];
        ship.toX = pick.x;
        ship.toY = pick.y;
        ship.midX = (ship.fromX + ship.toX) / 2 + Math.random() * 600 - 300;
        ship.midY = (ship.fromY + ship.toY) / 2 + Math.random() * 400 - 200;
        ship.nationKey = pick.nation || null;

        if (ship.nationKey && typeof state !== 'undefined' && state.nations && state.nations[ship.nationKey]) {
          if (state.nations[ship.nationKey].reputation <= -30) {
            ship.type = 2;
          } else {
            ship.type = Math.random() < 0.5 ? 0 : 1;
          }
        } else if (ship.nationKey) {
          ship.type = Math.random() < 0.5 ? 0 : 1;
        } else {
          ship.type = 1;
        }
      }

      let t = ship.t;
      let u = 1 - t;
      let wx = u * u * ship.fromX + 2 * u * t * ship.midX + t * t * ship.toX;
      let wy = u * u * ship.fromY + 2 * u * t * ship.midY + t * t * ship.toY;

      let sx = typeof w2sX === 'function' ? w2sX(wx) : wx;
      let sy = typeof w2sY === 'function' ? w2sY(wy) : wy;

      sy = typeof max === 'function' ? max(sy, oceanTop + 15) : sy;
      if (sx < -80 || sx > width + 80 || sy > height - 20) continue;

      let dFromCam = 0;
      if (typeof camSmooth !== 'undefined') {
        dFromCam = Math.sqrt((wx - camSmooth.x) * (wx - camSmooth.x) + (wy - camSmooth.y) * (wy - camSmooth.y));
      }
      let distScale = typeof constrain === 'function' ? constrain(1 - dFromCam / 5000, 0.3, 1) : 1;
      let distFade = typeof constrain === 'function' ? constrain(1 - Math.abs(sy - height * 0.4) / (height * 0.5), 0.15, 1) : 1;
      let sc = ship.size * distFade * distScale;

      let dx = 2 * (1 - t) * (ship.midX - ship.fromX) + 2 * t * (ship.toX - ship.midX);
      let dir = dx >= 0 ? 1 : -1;

      push();
      translate(Math.floor(sx), Math.floor(sy));
      scale(dir * sc, sc);

      let hAlpha = 160 * distFade * bright;

      // Determine faction from ship nation key
      let shipFaction = ship.nationKey || 'rome';
      let hullColor = getHullColor(shipFaction, 'light');
      let hullDark = getHullColor(shipFaction, 'dark');

      // Hull with faction color
      fill(hullColor[0], hullColor[1], hullColor[2], hAlpha);
      beginShape();
      vertex(-12, -1);
      vertex(-10, 3);
      vertex(10, 3);
      vertex(12, -1);
      vertex(9, -3);
      vertex(-9, -3);
      endShape(CLOSE);

      // Hull stripe (darker)
      fill(hullDark[0], hullDark[1], hullDark[2], hAlpha * 0.7);
      rect(-8, -1, 16, 1);

      // Mast
      fill(70, 48, 20, hAlpha);
      rect(-1, -16, 2, 14);

      // Sail colored by ship type and nation
      let puff = typeof sin === 'function' ? sin(frameCount * 0.025 + ship.t * 20) * 1.5 : 0;
      let sailR, sailG, sailB;

      if (ship.nationKey && typeof FACTION_MILITARY !== 'undefined' && FACTION_MILITARY[ship.nationKey]) {
        let _nf = FACTION_MILITARY[ship.nationKey].conquestFlag;
        if (ship.type === 2) {
          sailR = _nf[0];
          sailG = _nf[1] * 0.6;
          sailB = _nf[2] * 0.6;
        } else {
          sailR = _nf[0];
          sailG = _nf[1];
          sailB = _nf[2];
        }
      } else if (ship.type === 0) {
        sailR = 240;
        sailG = 210;
        sailB = 140;
      } else if (ship.type === 2) {
        sailR = 200;
        sailG = 80;
        sailB = 70;
      } else {
        sailR = 235;
        sailG = 228;
        sailB = 210;
      }

      fill(sailR, sailG, sailB, hAlpha * 0.9);
      beginShape();
      vertex(0, -15);
      vertex(7 + puff, -9);
      vertex(0, -2);
      endShape(CLOSE);

      // Small flag at top of mast
      if (ship.type === 0) fill(220, 190, 60, hAlpha);
      else if (ship.type === 2) fill(200, 50, 40, hAlpha);
      else fill(200, 200, 200, hAlpha * 0.7);
      rect(1, -17, 4, 2);

      // Wake trail
      fill(180, 210, 230, 18 * distFade);
      ellipse(-14, 2, 8, 2);
      ellipse(-18, 2, 5, 1);

      pop();
    }
  };

  // ================================================================
  // EXPORT HELPERS FOR EXTERNAL USE
  // ================================================================
  window.drawShipFigurehead = drawProwFigurehead;
  window.getShipHullColor = getHullColor;

})();
