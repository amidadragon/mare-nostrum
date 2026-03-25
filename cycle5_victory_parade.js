// CYCLE 5: VICTORY PARADE — Animated celebration ceremony
// Triggers after victory screen is dismissed, displays a parade of marching units,
// confetti effects, and stats summary before returning to menu.
(function() {
  'use strict';

  // Initialize parade state in the state object if not present
  var _origInit = typeof initState === 'function' ? initState : null;
  if (_origInit) {
    window.initState = function() {
      var result = _origInit.apply(this, arguments);
      if (!state.victoryParade) {
        state.victoryParade = { active: false, phase: 0, timer: 0, units: [], particles: [] };
      }
      return result;
    };
  }

  // Initialize victory parade on victory achievement
  function startVictoryParade() {
    if (!state.victoryParade) {
      state.victoryParade = { active: false, phase: 0, timer: 0, units: [], particles: [] };
    }
    state.victoryParade.active = true;
    state.victoryParade.phase = 1;
    state.victoryParade.timer = 0;
    state.victoryParade.units = [];
    state.victoryParade.particles = [];

    // Create parade units
    var islandX = state.isleX || width / 2;
    var islandY = state.isleY || height / 2;

    // Player character at front
    state.victoryParade.units.push({
      type: 'player',
      x: -100,
      y: islandY - 20,
      targetX: width + 100,
      speed: 0.8,
      bobOffset: 0,
      frame: 0
    });

    // Marching soldiers (4-6 soldiers in formation)
    var soldierCount = 4 + Math.floor(Math.random() * 2);
    for (var i = 0; i < soldierCount; i++) {
      state.victoryParade.units.push({
        type: 'soldier',
        x: -120 - (i * 50),
        y: islandY + (i % 2) * 30 - 15,
        targetX: width + 100,
        speed: 0.8,
        bobOffset: Math.random() * Math.PI * 2,
        frame: Math.floor(Math.random() * 4)
      });
    }

    // Enemy standards/flags (2-3)
    var flagCount = 2 + Math.floor(Math.random() * 2);
    for (var j = 0; j < flagCount; j++) {
      state.victoryParade.units.push({
        type: 'flag',
        x: -80 + (j * 30),
        y: islandY + 40,
        targetX: width + 100,
        speed: 0.8,
        bobOffset: j * 0.5,
        frame: 0,
        rotation: 0
      });
    }

    // Cheering citizens (static, flanking sides)
    for (var k = 0; k < 3; k++) {
      state.victoryParade.units.push({
        type: 'citizen',
        x: 80 + k * 150,
        y: islandY - 100,
        side: 'left',
        armRaised: 0,
        bobOffset: k * 0.3
      });
      state.victoryParade.units.push({
        type: 'citizen',
        x: 80 + k * 150,
        y: islandY + 100,
        side: 'right',
        armRaised: 0,
        bobOffset: k * 0.3
      });
    }
  }

  // Hook into draw loop to trigger parade when victory screen is dismissed
  var _origDraw = typeof draw !== 'undefined' ? draw : null;
  if (_origDraw) {
    window.draw = function() {
      // Check if victory was just achieved and victory screen was dismissed
      if (state.victoryAchieved && !state.victoryScreen && state.victoryParade && !state.victoryParade.active) {
        startVictoryParade();
      }

      // Call original draw
      _origDraw.apply(this, arguments);

      // Draw and update victory parade
      if (state.victoryParade && state.victoryParade.active) {
        drawVictoryParade();
        updateVictoryParade();
      }
    };
  }

  // Draw the victory parade
  function drawVictoryParade() {
    var parade = state.victoryParade;
    var timer = parade.timer;
    var phase = parade.phase;

    push();

    // Phase 1: Camera zoom out + golden border
    if (phase === 1) {
      var progress = Math.min(1, timer / 120);
      var zoom = 1 - progress * 0.15;
      var borderAlpha = progress * 150;

      // Draw golden border
      stroke(220, 190, 100, borderAlpha);
      strokeWeight(8);
      noFill();
      rect(10, 10, width - 20, height - 20, 15);

      // Inner glow
      stroke(220, 190, 100, borderAlpha * 0.4);
      strokeWeight(2);
      rect(15, 15, width - 30, height - 30, 12);
    }

    // Phase 2: Parade march
    if (phase === 2) {
      // Draw golden laurel wreath at top
      drawLaurelWreath(width / 2, 40);

      // Draw "TRIUMPHUS" banner
      fill(220, 190, 100, 200);
      textAlign(CENTER, CENTER);
      textSize(36);
      textStyle(BOLD);
      text('TRIUMPHUS', width / 2, 80);
      textStyle(NORMAL);

      // Draw marching units
      for (var i = 0; i < parade.units.length; i++) {
        var unit = parade.units[i];
        if (unit.type === 'player') {
          drawPlayerParade(unit);
        } else if (unit.type === 'soldier') {
          drawSoldierParade(unit);
        } else if (unit.type === 'flag') {
          drawFlagParade(unit);
        } else if (unit.type === 'citizen') {
          drawCitizenParade(unit);
        }
      }
    }

    // Phase 3: Fireworks and confetti
    if (phase === 3) {
      var progress = Math.min(1, (timer - 360) / 120);

      // Create new particles as phase starts
      if (timer === 360) {
        createFireworksParticles();
      }

      // Draw existing particles
      for (var p = 0; p < parade.particles.length; p++) {
        var particle = parade.particles[p];
        fill(particle.r, particle.g, particle.b, particle.alpha);
        noStroke();
        rect(particle.x, particle.y, particle.size, particle.size);
      }

      // Occasional bursts
      if (frameCount % 15 === 0) {
        createFireworksParticles();
      }
    }

    // Phase 4: Stats summary + fade to credits
    if (phase === 4) {
      var progress = (timer - 480) / 120;
      var statsAlpha = Math.min(220, progress * 300);

      // Semi-transparent overlay
      fill(0, 0, 0, 100);
      noStroke();
      rect(0, 0, width, height);

      // Stats panel
      var panelW = 320;
      var panelH = 240;
      var panelX = width / 2 - panelW / 2;
      var panelY = height / 2 - panelH / 2;

      fill(20, 18, 14, statsAlpha * 0.9);
      stroke(220, 190, 100, statsAlpha * 0.8);
      strokeWeight(2);
      rect(panelX, panelY, panelW, panelH, 8);

      // Title
      textAlign(CENTER, TOP);
      textSize(18);
      fill(255, 220, 100, statsAlpha);
      text('VICTORY ACHIEVED', width / 2, panelY + 15);

      // Stats
      var stats = [
        'Days to Victory: ' + (state.day || '?'),
        'Units Trained: ' + getUnitCount(),
        'Islands Explored: ' + getIslandCount(),
        'Resources Gathered: ' + (state.gold || 0)
      ];

      textAlign(LEFT, TOP);
      textSize(11);
      fill(180, 170, 140, statsAlpha);
      for (var s = 0; s < stats.length; s++) {
        text(stats[s], panelX + 20, panelY + 50 + s * 30);
      }

      // "Return to Menu" hint
      if (progress > 0.8) {
        var blinkAlpha = (Math.sin(frameCount * 0.08) + 1) * 0.5;
        textAlign(CENTER, BOTTOM);
        textSize(9);
        fill(160, 150, 120, statsAlpha * (0.5 + blinkAlpha * 0.5));
        text('Press any key to return to menu...', width / 2, panelY + panelH - 10);
      }
    }

    pop();
  }

  // Update parade state
  function updateVictoryParade() {
    var parade = state.victoryParade;
    parade.timer++;

    // Phase transitions
    if (parade.timer >= 120 && parade.phase === 1) parade.phase = 2;
    if (parade.timer >= 360 && parade.phase === 2) parade.phase = 3;
    if (parade.timer >= 480 && parade.phase === 3) parade.phase = 4;

    // Update marching units
    for (var i = 0; i < parade.units.length; i++) {
      var unit = parade.units[i];
      if (unit.type === 'player' || unit.type === 'soldier' || unit.type === 'flag') {
        unit.x += unit.speed;
        unit.bobOffset += 0.05;
        unit.frame = (unit.frame + 0.15) % 4;
      } else if (unit.type === 'citizen') {
        unit.armRaised = Math.sin(frameCount * 0.08 + unit.bobOffset) * 0.5 + 0.5;
      }
    }

    // Update particles
    for (var p = parade.particles.length - 1; p >= 0; p--) {
      var particle = parade.particles[p];
      particle.y += particle.vy;
      particle.x += particle.vx;
      particle.alpha -= 3;
      if (particle.alpha <= 0) {
        parade.particles.splice(p, 1);
      }
    }

    // End parade after phase 4 completes
    if (parade.timer >= 600) {
      parade.active = false;
    }
  }

  // Draw player character in parade
  function drawPlayerParade(unit) {
    var y = unit.y + Math.sin(frameCount * 0.08 + unit.bobOffset) * 5;

    // Simple pixel art player (head + body + legs)
    fill(220, 180, 120); // Skin tone
    rect(unit.x - 4, y - 12, 8, 8); // Head

    fill(150, 100, 50); // Brown clothes
    rect(unit.x - 6, y - 4, 12, 8); // Torso

    // Animated legs
    var legFrame = Math.floor(unit.frame);
    var legOffset = (legFrame % 2) * 2 - 1;
    fill(50, 40, 30); // Dark brown
    rect(unit.x - 3, y + 4, 3, 6); // Left leg
    rect(unit.x + 2, y + 4 + legOffset, 3, 6); // Right leg

    // Crown/laurel
    fill(220, 190, 100);
    arc(unit.x, y - 15, 10, 6, PI, TWO_PI);
  }

  // Draw marching soldier in parade
  function drawSoldierParade(unit) {
    var y = unit.y + Math.sin(frameCount * 0.08 + unit.bobOffset) * 4;

    // Simple soldier (head + armor + legs)
    fill(200, 190, 170); // Light skin
    rect(unit.x - 3, y - 10, 6, 6); // Head

    fill(180, 160, 140); // Armor color
    rect(unit.x - 5, y - 4, 10, 8); // Armor

    // Animated legs marching
    var legFrame = Math.floor(unit.frame);
    var legOffset = (legFrame % 2) * 2;
    fill(40, 35, 30); // Dark
    rect(unit.x - 2, y + 4, 2, 5); // Left leg
    rect(unit.x + 2, y + 4 + legOffset, 2, 5); // Right leg

    // Helmet plume
    fill(200, 50, 50); // Red plume
    rect(unit.x - 1, y - 15, 2, 6);
  }

  // Draw enemy flag/standard
  function drawFlagParade(unit) {
    var y = unit.y + Math.sin(frameCount * 0.08 + unit.bobOffset) * 3;
    unit.rotation += 0.05;

    // Flag pole
    stroke(100, 80, 60);
    strokeWeight(2);
    noFill();
    line(unit.x, y - 15, unit.x, y + 10);

    // Flag fabric (wavy)
    fill(200, 80, 80, 180); // Red flag
    noStroke();
    var waveAmp = Math.sin(unit.rotation) * 8;
    beginShape();
    vertex(unit.x, y - 12);
    vertex(unit.x + 20 + waveAmp, y - 10);
    vertex(unit.x + 20 + waveAmp, y);
    vertex(unit.x, y + 2);
    endShape(CLOSE);
  }

  // Draw cheering citizen
  function drawCitizenParade(unit) {
    var bob = Math.sin(frameCount * 0.06 + unit.bobOffset) * 2;
    var y = unit.y + bob;

    // Head
    fill(210, 170, 140);
    circle(unit.x, y - 8, 6);

    // Body
    fill(180, 140, 100);
    rect(unit.x - 4, y - 2, 8, 10);

    // Raised arm (animated)
    var armY = unit.armRaised > 0.3 ? y - 8 - unit.armRaised * 8 : y - 3;
    stroke(210, 170, 140);
    strokeWeight(2);
    line(unit.x + 3, y - 2, unit.x + 8, armY);
    noStroke();
  }

  // Draw laurel wreath decoration
  function drawLaurelWreath(x, y) {
    fill(220, 190, 100, 200);
    noStroke();

    // Left arc
    arc(x - 20, y, 25, 25, -PI / 4, PI + PI / 4);
    // Right arc
    arc(x + 20, y, 25, 25, PI / 4, TWO_PI - PI / 4);

    // Center circle
    circle(x, y, 6);
  }

  // Create firework particles
  function createFireworksParticles() {
    var colors = [
      [255, 220, 100], // Gold
      [255, 100, 100], // Red
      [100, 200, 255], // Blue
      [100, 255, 150]  // Green
    ];

    // Central burst at random X
    var burstX = width / 2 + random(-200, 200);
    var burstY = height / 3 + random(-50, 50);
    var particleCount = 20 + Math.floor(Math.random() * 20);

    for (var i = 0; i < particleCount; i++) {
      var angle = (i / particleCount) * TWO_PI;
      var speed = 2 + Math.random() * 3;
      var color = colors[Math.floor(Math.random() * colors.length)];

      state.victoryParade.particles.push({
        x: burstX,
        y: burstY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 2 + Math.random() * 3,
        r: color[0],
        g: color[1],
        b: color[2],
        alpha: 200
      });
    }
  }

  // Helper functions
  function getUnitCount() {
    if (!state.legia || !state.legia.army) return 0;
    return state.legia.army.length;
  }

  function getIslandCount() {
    if (!state.islands) return 0;
    var count = 0;
    for (var key in state.islands) {
      if (state.islands[key] && state.islands[key].visited) count++;
    }
    return count;
  }

  // Hook into keyPressed to dismiss parade and return to menu
  var _origKeyPressed = typeof keyPressed !== 'undefined' ? keyPressed : null;
  window.keyPressed = function() {
    // If parade is in phase 4 and has been showing for a bit, allow dismissal
    if (state && state.victoryParade && state.victoryParade.active &&
        state.victoryParade.phase === 4 && state.victoryParade.timer > 540) {
      state.victoryParade.active = false;
      state.victoryAchieved = null;
      // Could trigger menu transition here if needed
      return false;
    }
    if (_origKeyPressed) return _origKeyPressed.apply(this, arguments);
  };

  console.log('[CYCLE5] Victory parade system loaded');
})();
