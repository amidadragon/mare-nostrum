(function() {
  'use strict';

  // ========== UTILITY FUNCTIONS ==========

  var clampPlayerInRoom = function() {
    var bounds;
    if (state.insideCastrum) {
      bounds = CASTRUM_ROOM;
    } else if (state.insideTemple) {
      bounds = TEMPLE_ROOM;
    } else {
      return;
    }
    var minX = bounds.cx - bounds.hw + 25;
    var maxX = bounds.cx + bounds.hw - 25;
    var minY = bounds.cy - bounds.hh + 25;
    var maxY = bounds.cy + bounds.hh - 25;
    state.player.x = Math.max(minX, Math.min(maxX, state.player.x));
    state.player.y = Math.max(minY, Math.min(maxY, state.player.y));
  };

  var drawStoneFloor = function(cx, cy, w, h, variation) {
    var tileSize = 40;
    for (var x = cx - w / 2; x < cx + w / 2; x += tileSize) {
      for (var y = cy - h / 2; y < cy + h / 2; y += tileSize) {
        var sx = w2sX(x);
        var sy = w2sY(y);
        var tint = 150 + Math.floor(Math.sin(x / 20 + y / 20) * 15);
        fill(tint, tint, tint);
        noStroke();
        rect(sx, sy, tileSize, tileSize);
        stroke(100, 100, 100);
        strokeWeight(1);
        noFill();
        rect(sx, sy, tileSize, tileSize);
      }
    }
  };

  var drawTorchFlame = function(sx, sy) {
    var flameHeight = 20;
    var wobble = Math.sin(frameCount * 0.05) * 2;
    fill(255, 180, 0, 180);
    noStroke();
    beginShape();
    vertex(sx - 4 + wobble, sy);
    vertex(sx + 4 + wobble, sy);
    vertex(sx + 6 + wobble * 1.5, sy - flameHeight * 0.5);
    vertex(sx + 3 + wobble * 2, sy - flameHeight);
    vertex(sx - 3 + wobble * 2, sy - flameHeight);
    vertex(sx - 6 + wobble * 1.5, sy - flameHeight * 0.5);
    endShape(CLOSE);
    fill(255, 220, 100, 220);
    ellipse(sx + wobble, sy - flameHeight * 0.6, 5, 8);
  };

  var drawGlowCircle = function(sx, sy, rad, col) {
    noFill();
    stroke(col[0], col[1], col[2], 100);
    strokeWeight(2);
    circle(sx, sy, rad * 2);
    stroke(col[0], col[1], col[2], 50);
    strokeWeight(1);
    circle(sx, sy, rad * 2.5);
  };

  var drawInteractionPrompt = function(sx, sy, text) {
    fill(255, 255, 200);
    textSize(14);
    textAlign(CENTER, TOP);
    text(text, sx, sy + 40);
  };

  // ========== CASTRUM INTERIOR ==========

  drawCastrumRoom = function() {
    clampPlayerInRoom();
    var cx = CASTRUM_ROOM.cx;
    var cy = CASTRUM_ROOM.cy;
    var scx = w2sX(cx);
    var scy = w2sY(cy);

    // Background dark stone
    fill(60, 55, 50);
    noStroke();
    rect(scx - CASTRUM_ROOM.hw, scy - CASTRUM_ROOM.hh, CASTRUM_ROOM.hw * 2, CASTRUM_ROOM.hh * 2);

    // Stone floor with wear path
    drawStoneFloor(cx, cy, CASTRUM_ROOM.hw * 2, CASTRUM_ROOM.hh * 2, 1);
    
    // Worn path from door to center
    stroke(100, 95, 85, 180);
    strokeWeight(30);
    noFill();
    var doorY = cy + CASTRUM_ROOM.hh - 30;
    var tableY = cy - 60;
    line(w2sX(cx), w2sY(doorY), w2sX(cx), w2sY(tableY));

    // Back wall with faction banner
    fill(50, 45, 40);
    rect(scx - CASTRUM_ROOM.hw, scy - CASTRUM_ROOM.hh, CASTRUM_ROOM.hw * 2, 60);
    
    // Faction banner
    var fk = state.faction;
    drawFactionStandard(scx, scy - CASTRUM_ROOM.hh + 30, fk, 1.2);

    // Trophy shields on wall
    for (var i = 0; i < 3; i++) {
      var shx = scx - 80 + i * 80;
      var shy = scy - CASTRUM_ROOM.hh + 35;
      fill(200, 180, 100);
      noStroke();
      circle(shx, shy, 25);
      fill(150, 130, 70);
      circle(shx, shy, 20);
    }

    // Torches (4 total)
    drawTorchSconce(scx - CASTRUM_ROOM.hw + 40, scy - 60, 255, 180, 0);
    drawTorchSconce(scx - CASTRUM_ROOM.hw + 40, scy + 60, 255, 180, 0);
    drawTorchSconce(scx + CASTRUM_ROOM.hw - 40, scy - 60, 255, 180, 0);
    drawTorchSconce(scx + CASTRUM_ROOM.hw - 40, scy + 60, 255, 180, 0);

    // Interactive stations (Y-sorted drawable list)
    var items = [];

    // Supply crates (front left)
    var crateX = cx - 120;
    var crateY = cy + 80;
    items.push({y: crateY, draw: function() {
      var sx = w2sX(crateX);
      var sy = w2sY(crateY);
      fill(120, 100, 70);
      rect(sx - 25, sy - 20, 50, 40);
      fill(100, 85, 55);
      rect(sx - 25, sy - 20, 50, 15);
      fill(255, 255, 200);
      textSize(10);
      textAlign(CENTER, CENTER);
      text('W:' + state.wood, sx, sy + 5);
    }});

    // Training yard (center) - sparring soldiers
    var trainX = cx;
    var trainY = cy - 20;
    items.push({y: trainY, draw: function() {
      var sx = w2sX(trainX);
      var sy = w2sY(trainY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [200, 150, 100]);
      
      // Soldier 1
      var s1x = sx - 25 + Math.sin(frameCount * 0.03) * 5;
      drawSoldier(s1x, sy, state.faction, true);
      
      // Soldier 2
      var s2x = sx + 25 - Math.sin(frameCount * 0.03) * 5;
      drawSoldier(s2x, sy, state.faction, false);
      
      // Clash sparks
      if (Math.floor(frameCount / 10) % 2 === 0) {
        fill(255, 200, 0, 200);
        for (var i = 0; i < 3; i++) {
          circle(sx + (Math.random() - 0.5) * 20, sy - 10 + Math.random() * 10, 2);
        }
      }
    }});

    // Recruitment desk (right)
    var recruX = cx + 130;
    var recruY = cy + 30;
    items.push({y: recruY, draw: function() {
      var sx = w2sX(recruX);
      var sy = w2sY(recruY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [100, 150, 200]);
      
      // Desk
      fill(140, 110, 80);
      rect(sx - 35, sy - 15, 70, 35);
      
      // Scrolls and inkwell
      fill(200, 180, 150);
      rect(sx - 25, sy - 10, 15, 8);
      circle(sx + 10, sy - 8, 4);
      
      // NPC officer
      drawOfficer(sx + 15, sy - 25);
      
      // RECRUIT sign
      fill(200, 50, 50);
      textSize(12);
      textAlign(CENTER, CENTER);
      text('RECRUIT', sx, sy - 40);
    }});

    // Armory rack (left)
    var armX = cx - 130;
    var armY = cy - 40;
    items.push({y: armY, draw: function() {
      var sx = w2sX(armX);
      var sy = w2sY(armY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [200, 100, 100]);
      
      // Weapon rack
      fill(100, 80, 60);
      rect(sx - 30, sy - 25, 60, 50);
      
      // Weapons
      for (var i = 0; i < 4; i++) {
        stroke(150, 120, 80);
        strokeWeight(3);
        line(sx - 15 + i * 10, sy - 20, sx - 15 + i * 10, sy + 20);
      }
      
      // Upgrade icon if available
      if (state.gold >= 50) {
        fill(255, 220, 0, 200);
        circle(sx + 30, sy - 30, 12);
        fill(0);
        textSize(10);
        textAlign(CENTER, CENTER);
        text('↑', sx + 30, sy - 30);
      }
    }});

    // War table (back center)
    var tableX = cx;
    var tableY = cy - 80;
    items.push({y: tableY, draw: function() {
      var sx = w2sX(tableX);
      var sy = w2sY(tableY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [200, 200, 100]);
      
      // Table
      fill(100, 80, 60);
      rect(sx - 50, sy - 30, 100, 60);
      
      // Glowing map surface
      fill(60, 100, 150, 100);
      rect(sx - 45, sy - 25, 90, 50);
      
      // Faction tokens
      var positions = [
        {x: -20, y: -10}, {x: 0, y: 0}, {x: 20, y: -10}
      ];
      for (var i = 0; i < positions.length; i++) {
        fill(200, 150, 100);
        circle(sx + positions[i].x, sy + positions[i].y, 6);
      }
    }});

    // Commander (back right)
    var cmdX = cx + 110;
    var cmdY = cy - 90;
    items.push({y: cmdY, draw: function() {
      var sx = w2sX(cmdX);
      var sy = w2sY(cmdY);
      
      // Larger imposing figure
      drawCommander(sx, sy, state.faction);
      
      // Speech bubble if near
      var psx = w2sX(state.player.x);
      var psy = w2sY(state.player.y);
      if (dist(psx, psy, sx, sy) < 120) {
        fill(255, 255, 200);
        rect(sx + 20, sy - 50, 100, 30);
        fill(0);
        textSize(10);
        textAlign(LEFT, CENTER);
        text('Ready for orders?', sx + 25, sy - 35);
      }
    }});

    // Door (bottom center)
    var doorX = cx;
    var doorY = cy + CASTRUM_ROOM.hh - 20;
    items.push({y: doorY, draw: function() {
      var sx = w2sX(doorX);
      var sy = w2sY(doorY);
      fill(80, 60, 40);
      rect(sx - 30, sy - 40, 60, 50);
      fill(200, 150, 100);
      rect(sx - 25, sy - 35, 50, 45);
      fill(0);
      circle(sx + 20, sy - 10, 3);
      // Light coming through
      fill(255, 200, 100, 50);
      rect(sx - 30, sy - 40, 60, 10);
    }});

    // Sort and draw all items
    items.sort(function(a, b) { return a.y - b.y; });
    for (var i = 0; i < items.length; i++) {
      items[i].draw();
    }

    // Draw player on top
    drawPlayer();
  };

  drawCastrumRoomHUD = function() {
    fill(200, 200, 200);
    textSize(20);
    textAlign(CENTER, TOP);
    text(getFactionTerms().barracks, width / 2, 10);

    // Bottom station bar
    fill(50, 50, 50, 180);
    rect(0, height - 40, width, 40);

    var stations = [
      {label: '⚔ Training', x: 80},
      {label: '🛡 Armory', x: 200},
      {label: '📜 Recruit', x: 320},
      {label: '🗺 War Table', x: 450},
      {label: '🚪 Exit', x: 580}
    ];

    for (var i = 0; i < stations.length; i++) {
      fill(150, 150, 150);
      textSize(12);
      textAlign(CENTER, CENTER);
      text(stations[i].label, stations[i].x, height - 20);
    }

    // Highlight nearby station
    var psx = w2sX(state.player.x);
    var psy = w2sY(state.player.y);
    var cx = CASTRUM_ROOM.cx;
    var cy = CASTRUM_ROOM.cy;

    var stationPos = [
      {x: cx, y: cy - 20},
      {x: cx - 130, y: cy - 40},
      {x: cx + 130, y: cy + 30},
      {x: cx, y: cy - 80},
      {x: cx, y: cy + CASTRUM_ROOM.hh - 20}
    ];

    for (var i = 0; i < stationPos.length; i++) {
      var sx = w2sX(stationPos[i].x);
      var sy = w2sY(stationPos[i].y);
      if (dist(psx, psy, sx, sy) < 120) {
        fill(255, 220, 100);
        textSize(12);
        textAlign(CENTER, CENTER);
        text(stations[i].label, stations[i].x, height - 20);
        drawInteractionPrompt(psx, psy, '[E] Interact');
      }
    }
  };

  _castrumRoomInteractE = function() {
    var psx = w2sX(state.player.x);
    var psy = w2sY(state.player.y);
    var cx = CASTRUM_ROOM.cx;
    var cy = CASTRUM_ROOM.cy;
    var interactDist = 55;

    var stations = [
      {x: cx, y: cy - 20, action: 'training'},
      {x: cx - 130, y: cy - 40, action: 'armory'},
      {x: cx + 130, y: cy + 30, action: 'recruit'},
      {x: cx, y: cy - 80, action: 'war_table'},
      {x: cx, y: cy + CASTRUM_ROOM.hh - 20, action: 'exit'}
    ];

    for (var i = 0; i < stations.length; i++) {
      var sx = w2sX(stations[i].x);
      var sy = w2sY(stations[i].y);
      if (dist(psx, psy, sx, sy) < interactDist * 2) {
        addFloatingText(psx, psy, 'Activated!', [255, 255, 100]);
        spawnParticles(state.player.x, state.player.y, 'spark', 5);
        snd.playSFX('select');

        if (stations[i].action === 'training') {
          addFloatingText(psx, psy - 30, 'Training in progress...', [100, 200, 255]);
        } else if (stations[i].action === 'armory') {
          addFloatingText(psx, psy - 30, 'Upgrade cost: 50 gold', [200, 100, 100]);
          if (state.gold >= 50) {
            state.gold -= 50;
            state.legia.hp = state.legia.maxHp;
            addFloatingText(psx, psy - 50, '+Armor', [200, 200, 0]);
          }
        } else if (stations[i].action === 'recruit') {
          addFloatingText(psx, psy - 30, 'Open Recruitment...', [100, 150, 200]);
          if (typeof SHOW_LEGIA_UI !== 'undefined') {
            SHOW_LEGIA_UI = true;
          }
        } else if (stations[i].action === 'war_table') {
          addFloatingText(psx, psy - 30, 'Consulting nations...', [200, 200, 100]);
          if (typeof SHOW_NATIONS_PANEL !== 'undefined') {
            SHOW_NATIONS_PANEL = !SHOW_NATIONS_PANEL;
          }
        } else if (stations[i].action === 'exit') {
          state.insideCastrum = false;
          state.player.x = CASTRUM_ROOM.cx;
          state.player.y = CASTRUM_ROOM.cy + CASTRUM_ROOM.hh + 50;
        }
        return;
      }
    }
  };

  // ========== TEMPLE INTERIOR ==========

  drawTempleRoom = function() {
    clampPlayerInRoom();
    var cx = TEMPLE_ROOM.cx;
    var cy = TEMPLE_ROOM.cy;
    var scx = w2sX(cx);
    var scy = w2sY(cy);

    // Sacred background with gradient feel
    fill(30, 40, 60);
    noStroke();
    rect(scx - TEMPLE_ROOM.hw, scy - TEMPLE_ROOM.hh, TEMPLE_ROOM.hw * 2, TEMPLE_ROOM.hh * 2);

    // Polished marble floor with faction inlay
    var tileSize = 35;
    for (var x = cx - TEMPLE_ROOM.hw / 2; x < cx + TEMPLE_ROOM.hw / 2; x += tileSize) {
      for (var y = cy - TEMPLE_ROOM.hh / 2; y < cy + TEMPLE_ROOM.hh / 2; y += tileSize) {
        var sx = w2sX(x);
        var sy = w2sY(y);
        var alt = Math.floor((x / tileSize + y / tileSize) % 2);
        fill(alt ? 100 : 120, alt ? 110 : 125, alt ? 140 : 160);
        rect(sx, sy, tileSize, tileSize);
      }
    }

    // Central circular mosaic
    fill(80, 100, 140, 100);
    circle(scx, scy, 90);
    fill(120, 140, 180, 80);
    circle(scx, scy, 70);

    // Columns (4 ornate pillars)
    var colPositions = [
      {x: -80, y: -40}, {x: 80, y: -40},
      {x: -80, y: 40}, {x: 80, y: 40}
    ];
    for (var i = 0; i < colPositions.length; i++) {
      var colX = cx + colPositions[i].x;
      var colY = cy + colPositions[i].y;
      var cosx = w2sX(colX);
      var cosy = w2sY(colY);
      fill(150, 160, 180);
      rect(cosx - 8, cosy - 60, 16, 120);
      fill(180, 190, 200);
      ellipse(cosx, cosy - 65, 20, 10);
      ellipse(cosx, cosy + 65, 20, 10);
    }

    // Torches/braziers (6 total with divine fire)
    var brazierPositions = [
      {x: -110, y: -60}, {x: 0, y: -90}, {x: 110, y: -60},
      {x: -110, y: 60}, {x: 0, y: 90}, {x: 110, y: 60}
    ];
    for (var i = 0; i < brazierPositions.length; i++) {
      var brX = cx + brazierPositions[i].x;
      var brY = cy + brazierPositions[i].y;
      var brsx = w2sX(brX);
      var brsy = w2sY(brY);
      drawBrazier(brsx, brsy);
    }

    // Divine light beam from above (altar)
    fill(200, 180, 150, 30);
    rect(scx - 40, scy - TEMPLE_ROOM.hh - 20, 80, TEMPLE_ROOM.hh);

    // Interactive stations (Y-sorted)
    var items = [];

    // Altar (back center)
    var altX = cx;
    var altY = cy - 90;
    items.push({y: altY, draw: function() {
      var sx = w2sX(altX);
      var sy = w2sY(altY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [200, 180, 100]);
      
      // Altar steps
      fill(80, 90, 120);
      rect(sx - 45, sy - 25, 90, 50);
      
      // Top surface
      fill(120, 140, 180);
      rect(sx - 40, sy - 20, 80, 20);
      
      // Divine light effect
      fill(255, 200, 100, 80);
      circle(sx, sy - 15, 30);
      
      // Faction symbol with particle
      fill(200, 180, 100);
      circle(sx, sy - 25, 12);
      
      // Particles rising
      for (var p = 0; p < 2; p++) {
        fill(255, 200, 100, 100);
        var px = sx + Math.sin(frameCount * 0.02 + p) * 10;
        var py = sy - 30 - (frameCount % 60) * 0.5;
        circle(px, py, 3);
      }
    }});

    // Advisor (right)
    var advX = cx + 100;
    var advY = cy + 20;
    items.push({y: advY, draw: function() {
      var sx = w2sX(advX);
      var sy = w2sY(advY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [150, 200, 180]);
      
      // Robed figure with staff
      fill(100, 120, 140);
      rect(sx - 12, sy - 20, 24, 40);
      fill(150, 160, 180);
      circle(sx, sy - 25, 8);
      stroke(180, 160, 140);
      strokeWeight(2);
      line(sx + 15, sy - 30, sx + 15, sy + 15);
      fill(200, 180, 100);
      circle(sx + 15, sy - 35, 5);
      
      // Glowing aura
      noFill();
      stroke(150, 200, 180, 80);
      strokeWeight(1);
      circle(sx, sy, 35);
    }});

    // Jester (left)
    var jestX = cx - 100;
    var jestY = cy + 20;
    items.push({y: jestY, draw: function() {
      var sx = w2sX(jestX);
      var sy = w2sY(jestY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [200, 150, 200]);
      
      // Colorful outfit with bounce
      var bounce = Math.sin(frameCount * 0.04) * 3;
      fill(255, 100, 100);
      rect(sx - 10, sy - 15 + bounce, 20, 35);
      fill(255, 200, 100);
      circle(sx, sy - 20 + bounce, 7);
      
      // Bells
      fill(255, 200, 0);
      circle(sx - 8, sy - 25 + bounce, 4);
      circle(sx + 8, sy - 25 + bounce, 4);
    }});

    // Achievement wall plaque (left wall)
    var achX = cx - TEMPLE_ROOM.hw + 30;
    var achY = cy - 50;
    items.push({y: achY, draw: function() {
      var sx = w2sX(achX);
      var sy = w2sY(achY);
      fill(120, 100, 70);
      rect(sx - 20, sy - 30, 40, 60);
      fill(200, 180, 120);
      rect(sx - 18, sy - 28, 36, 56);
      
      if (typeof TEMPLE_ACHIEVEMENTS !== 'undefined' && TEMPLE_ACHIEVEMENTS.length > 0) {
        fill(255, 220, 0, 200);
        circle(sx + 15, sy - 20, 6);
      }
    }});

    // Divine pool (front center)
    var poolX = cx;
    var poolY = cy + 70;
    items.push({y: poolY, draw: function() {
      var sx = w2sX(poolX);
      var sy = w2sY(poolY);
      
      // Glow circle
      drawGlowCircle(sx, sy, 55, [150, 180, 200]);
      
      // Water pool
      fill(80, 120, 160);
      circle(sx, sy, 40);
      
      // Shimmer effect
      fill(150, 200, 220, 100);
      var shimmer = Math.sin(frameCount * 0.03) * 15;
      arc(sx, sy, 50 + shimmer, 20, 0, PI);
    }});

    // Incense burners (near altar)
    var incX = cx - 40;
    var incY = cy - 60;
    items.push({y: incY, draw: function() {
      var sx = w2sX(incX);
      var sy = w2sY(incY);
      fill(100, 80, 60);
      rect(sx - 10, sy - 5, 20, 15);
      
      // Smoke rising
      for (var s = 0; s < 3; s++) {
        fill(200, 200, 200, 80 - s * 20);
        var sx2 = sx + Math.sin(frameCount * 0.02 + s * 2) * 8;
        var sy2 = sy - 10 - (frameCount % 40) * 0.7 - s * 8;
        circle(sx2, sy2, 4 - s);
      }
    }});

    var incX2 = cx + 40;
    items.push({y: incY, draw: function() {
      var sx = w2sX(incX2);
      var sy = w2sY(incY);
      fill(100, 80, 60);
      rect(sx - 10, sy - 5, 20, 15);
      
      for (var s = 0; s < 3; s++) {
        fill(200, 200, 200, 80 - s * 20);
        var sx2 = sx + Math.sin(frameCount * 0.02 + s * 2 + PI) * 8;
        var sy2 = sy - 10 - (frameCount % 40) * 0.7 - s * 8;
        circle(sx2, sy2, 4 - s);
      }
    }});

    // Door (bottom center)
    var doorX = cx;
    var doorY = cy + TEMPLE_ROOM.hh - 20;
    items.push({y: doorY, draw: function() {
      var sx = w2sX(doorX);
      var sy = w2sY(doorY);
      fill(60, 50, 40);
      rect(sx - 35, sy - 45, 70, 55);
      fill(120, 100, 80);
      rect(sx - 30, sy - 40, 60, 50);
      fill(255, 200, 100, 80);
      rect(sx - 30, sy - 40, 60, 12);
    }});

    // Sort and draw
    items.sort(function(a, b) { return a.y - b.y; });
    for (var i = 0; i < items.length; i++) {
      items[i].draw();
    }

    // Draw pet (follows player)
    if (typeof _drawTemplePet !== 'undefined' && state.player) {
      var petX = state.player.x - 30;
      var petY = state.player.y + 20;
      _drawTemplePet({}, w2sX(petX), w2sY(petY));
    }

    // Draw player on top
    drawPlayer();
  };

  drawTempleRoomHUD = function() {
    fill(200, 200, 220);
    textSize(20);
    textAlign(CENTER, TOP);
    text('Sacred Temple', width / 2, 10);

    // Bottom station bar
    fill(30, 30, 50, 180);
    rect(0, height - 40, width, 40);

    var stations = [
      {label: '🙏 Altar', x: 80},
      {label: '📚 Advisor', x: 200},
      {label: '🤡 Jester', x: 320},
      {label: '💧 Pool', x: 430},
      {label: '🚪 Exit', x: 530}
    ];

    for (var i = 0; i < stations.length; i++) {
      fill(150, 150, 180);
      textSize(12);
      textAlign(CENTER, CENTER);
      text(stations[i].label, stations[i].x, height - 20);
    }

    // Highlight nearby station
    var psx = w2sX(state.player.x);
    var psy = w2sY(state.player.y);
    var cx = TEMPLE_ROOM.cx;
    var cy = TEMPLE_ROOM.cy;

    var stationPos = [
      {x: cx, y: cy - 90},
      {x: cx + 100, y: cy + 20},
      {x: cx - 100, y: cy + 20},
      {x: cx, y: cy + 70},
      {x: cx, y: cy + TEMPLE_ROOM.hh - 20}
    ];

    for (var i = 0; i < stationPos.length; i++) {
      var sx = w2sX(stationPos[i].x);
      var sy = w2sY(stationPos[i].y);
      if (dist(psx, psy, sx, sy) < 120) {
        fill(200, 220, 200);
        textSize(12);
        textAlign(CENTER, CENTER);
        text(stations[i].label, stations[i].x, height - 20);
        drawInteractionPrompt(psx, psy, '[E] Interact');
      }
    }
  };

  _templeRoomInteractE = function() {
    var psx = w2sX(state.player.x);
    var psy = w2sY(state.player.y);
    var cx = TEMPLE_ROOM.cx;
    var cy = TEMPLE_ROOM.cy;
    var interactDist = 55;

    var stations = [
      {x: cx, y: cy - 90, action: 'altar'},
      {x: cx + 100, y: cy + 20, action: 'advisor'},
      {x: cx - 100, y: cy + 20, action: 'jester'},
      {x: cx, y: cy + 70, action: 'pool'},
      {x: cx, y: cy + TEMPLE_ROOM.hh - 20, action: 'exit'}
    ];

    for (var i = 0; i < stations.length; i++) {
      var sx = w2sX(stations[i].x);
      var sy = w2sY(stations[i].y);
      if (dist(psx, psy, sx, sy) < interactDist * 2) {
        addFloatingText(psx, psy, 'Blessed!', [200, 220, 200]);
        spawnParticles(state.player.x, state.player.y, 'spark', 5);
        snd.playSFX('select');

        if (stations[i].action === 'altar') {
          addFloatingText(psx, psy - 30, 'Divine blessing...', [200, 180, 100]);
          state.solar = Math.min(state.solar + 50, state.maxSolar);
        } else if (stations[i].action === 'advisor') {
          addFloatingText(psx, psy - 30, 'Wise counsel received', [150, 200, 180]);
        } else if (stations[i].action === 'jester') {
          if (typeof TEMPLE_JESTER_JOKES !== 'undefined' && 
              typeof TEMPLE_JESTER_JOKES[state.faction] !== 'undefined') {
            var jokes = TEMPLE_JESTER_JOKES[state.faction];
            var joke = jokes[Math.floor(Math.random() * jokes.length)];
            addFloatingText(psx, psy - 30, joke, [200, 150, 150]);
          } else {
            addFloatingText(psx, psy - 30, 'A fine jest!', [200, 150, 150]);
          }
        } else if (stations[i].action === 'pool') {
          addFloatingText(psx, psy - 30, 'Spirit restored', [150, 180, 200]);
          state.legia.hp = Math.min(state.legia.hp + 30, state.legia.maxHp);
        } else if (stations[i].action === 'exit') {
          state.insideTemple = false;
          state.player.x = TEMPLE_ROOM.cx;
          state.player.y = TEMPLE_ROOM.cy + TEMPLE_ROOM.hh + 50;
        }
        return;
      }
    }
  };

  // ========== HELPER DRAWING FUNCTIONS ==========

  var drawTorchSconce = function(sx, sy, r, g, b) {
    fill(100, 80, 60);
    rect(sx - 8, sy - 30, 16, 50);
    fill(150, 120, 80);
    rect(sx - 10, sy - 35, 20, 10);
    drawTorchFlame(sx, sy - 30);
    fill(r, g, b, 30);
    circle(sx, sy - 30, 60);
  };

  var drawBrazier = function(sx, sy) {
    fill(120, 100, 70);
    rect(sx - 12, sy, 24, 25);
    fill(150, 120, 80);
    circle(sx, sy - 8, 16);
    
    // Sacred flames
    fill(200, 100, 200, 150);
    var wobble = Math.sin(frameCount * 0.05) * 2;
    triangle(sx - 6 + wobble, sy - 10, sx + 6 + wobble, sy - 10, sx + wobble, sy - 25);
    fill(255, 150, 200, 180);
    triangle(sx - 3 + wobble, sy - 8, sx + 3 + wobble, sy - 8, sx + wobble, sy - 18);
    
    fill(200, 100, 200, 60);
    circle(sx, sy - 15, 50);
  };

  var drawSoldier = function(sx, sy, fk, facing) {
    var colors = FACTION_MILITARY[fk];
    
    // Body
    fill(colors.tunic[0], colors.tunic[1], colors.tunic[2]);
    rect(sx - 5, sy - 3, 10, 10);
    
    // Head
    fill(200, 160, 140);
    circle(sx, sy - 8, 4);
    
    // Helm
    fill(colors.helm[0], colors.helm[1], colors.helm[2]);
    circle(sx, sy - 10, 5);
    
    // Weapon
    stroke(180, 160, 120);
    strokeWeight(2);
    if (facing) {
      line(sx + 5, sy - 2, sx + 10, sy - 8);
    } else {
      line(sx - 5, sy - 2, sx - 10, sy - 8);
    }
  };

  var drawOfficer = function(sx, sy) {
    fill(150, 150, 150);
    rect(sx - 8, sy, 16, 20);
    fill(200, 160, 140);
    circle(sx, sy - 10, 6);
    fill(100, 80, 60);
    circle(sx, sy - 12, 7);
  };

  var drawCommander = function(sx, sy, fk) {
    var colors = FACTION_MILITARY[fk];
    
    // Full armor
    fill(colors.armor[0], colors.armor[1], colors.armor[2]);
    rect(sx - 10, sy - 5, 20, 25);
    
    // Cape
    fill(colors.cape[0], colors.cape[1], colors.cape[2]);
    triangle(sx - 12, sy, sx - 12, sy + 20, sx + 12, sy + 20);
    
    // Head with helm
    fill(200, 160, 140);
    circle(sx, sy - 15, 7);
    fill(colors.helm[0], colors.helm[1], colors.helm[2]);
    circle(sx, sy - 17, 8);
    
    // Crest
    if (colors.helmCrest) {
      fill(colors.helmCrest[0], colors.helmCrest[1], colors.helmCrest[2]);
      triangle(sx - 3, sy - 26, sx + 3, sy - 26, sx, sy - 32);
    }
    
    // Aura
    noFill();
    stroke(255, 200, 100, 100);
    strokeWeight(1);
    circle(sx, sy + 5, 45);
  };

  console.log('[V2 INTERIORS] Loaded: Castrum + Temple interior redesign');
})();
