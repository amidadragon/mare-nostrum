// CYCLE 5: QUEST TRACKER & MINIMAP ENHANCEMENTS
// Patches quest tracker with defensive null checks and clipping
// Patches minimap to show all 4 NPCs, buildings, compass rose, and invasions
(function() {
  'use strict';

  // ============================================================================
  // PART 1: QUEST TRACKER FIXES (narrative.js drawQuestTracker)
  // ============================================================================

  // Patch drawQuestTracker to add defensive null checks and clipping
  if (typeof drawQuestTracker === 'function') {
    window.drawQuestTracker = function() {
      if (!state.mainQuest) return;

      let ch = state.mainQuest.chapter;
      if (ch >= MAIN_QUEST_CHAPTERS.length) {
        fill(255, 215, 0, 180); textAlign(RIGHT, TOP); textSize(11);
        text('IMPERATOR — Legacy Complete', width - 16, 16); textAlign(LEFT, TOP); return;
      }

      let chapter = MAIN_QUEST_CHAPTERS[ch];
      if (!chapter) return;

      let rx = width - 240, ry = 12, rw = 228, rh = 18 + chapter.objectives.length * 13;

      // Set up clipping for quest tracker panel
      push();
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.rect(rx, ry, rw, rh + 100); // clip area with buffer for npc quests
      drawingContext.clip();

      drawHUDPanel(rx, ry, rw, rh);
      fill(220, 190, 80); textAlign(LEFT, TOP); textSize(11);
      text(chapter.title, rx + 8, ry + 5);

      let oy = ry + 19;
      for (let obj of chapter.objectives) {
        let done = false;
        if (obj.check) done = obj.check();
        else if (obj.counter) done = (state.mainQuest.counters && state.mainQuest.counters[obj.counter] || 0) >= obj.target;
        else if (obj.interact) done = !!state.narrativeFlags[obj.interact];

        let pt = '';
        if (obj.counter && !done) {
          let counterVal = state.mainQuest.counters ? (state.mainQuest.counters[obj.counter] || 0) : 0;
          pt = ' (' + counterVal + '/' + obj.target + ')';
        }

        fill(done ? color(120, 200, 80) : color(180, 170, 140)); textSize(10);
        let objStr = (done ? '[x] ' : '[ ] ') + obj.desc + pt;
        let maxW = rw - 20;
        while (objStr.length > 10 && textWidth(objStr) > maxW) objStr = objStr.slice(0, -1);
        text(objStr, rx + 10, oy);
        oy += 13;
      }

      // NPC side quests — defensive null checks
      let nqY = ry + rh + 6;

      // Extend clip region for NPC quests
      drawingContext.restore();
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.rect(rx, ry, rw, height - ry - 60); // larger buffer for all npc quests
      drawingContext.clip();

      for (let npcName of ['livia', 'marcus', 'vesta', 'felix']) {
        // DEFENSIVE: check state.npcQuests exists before accessing
        if (!state.npcQuests) continue;

        let nqState = state.npcQuests[npcName];
        if (!nqState || !nqState.active) continue;

        let chain = (typeof NPC_QUEST_CHAINS !== 'undefined') ? NPC_QUEST_CHAINS[npcName] : null;
        let quest = chain ? chain.find(q => q.id === nqState.active) : null;
        if (!quest) continue;

        let nqH = 16 + quest.objectives.length * 12;
        drawHUDPanel(rx, nqY, rw, nqH);
        fill(140, 180, 220); textSize(10);

        let npcDisplayName = npcName;
        if (typeof getNPCDisplayName === 'function') {
          npcDisplayName = getNPCDisplayName(npcName);
        } else {
          npcDisplayName = npcName.charAt(0).toUpperCase() + npcName.slice(1);
        }

        text(npcDisplayName + ': ' + quest.title, rx + 8, nqY + 4);

        let objY = nqY + 16;
        for (let obj of quest.objectives) {
          let done = false;
          if (obj.check) done = obj.check();
          else if (obj.counter) {
            // DEFENSIVE: check state.npcQuests.counters exists
            let counterVal = (state.npcQuests && state.npcQuests.counters) ? (state.npcQuests.counters[obj.counter] || 0) : 0;
            done = counterVal >= obj.target;
          }
          else if (obj.interact) done = !!state.narrativeFlags[obj.interact];

          let pt = '';
          if (obj.counter && !done) {
            let counterVal = (state.npcQuests && state.npcQuests.counters) ? (state.npcQuests.counters[obj.counter] || 0) : 0;
            pt = ' (' + counterVal + '/' + obj.target + ')';
          }

          fill(done ? color(120, 200, 80) : color(160, 150, 120)); textSize(9);
          let npcStr = (done ? '[x] ' : '[ ] ') + obj.desc + pt;
          let npcMaxW = rw - 20;
          while (npcStr.length > 10 && textWidth(npcStr) > npcMaxW) npcStr = npcStr.slice(0, -1);
          text(npcStr, rx + 10, objY);
          objY += 12;
        }
        nqY += nqH + 4;
      }

      drawingContext.restore();
      pop();

      textAlign(LEFT, TOP);
    };
    console.log('[CYCLE5-QUEST] Quest tracker patched with null checks and clipping');
  }

  // ============================================================================
  // PART 2: MINIMAP ENHANCEMENTS
  // ============================================================================

  // Store minimap geometry for overlay access
  window._minimapGeo = null;

  // Function to draw enhanced minimap overlay with NPCs, buildings, compass, etc.
  function drawMinimapOverlay() {
    if (!state || typeof width === 'undefined' || typeof height === 'undefined') return;

    // Calculate minimap geometry (mirrors ui.js)
    let uiScale = width > 800 ? 1 : 0.85;
    let hudMargin = 16;
    let mmW = max(110, floor(120 * uiScale));
    let mmH = max(70, floor(76 * uiScale));
    let mmX = width - mmW - hudMargin;
    let mmY = hudMargin;
    let mcx = mmX + mmW / 2;
    let mcy = mmY + mmH / 2;

    let islandRX = state.islandRX || 500;
    let islandRY = state.islandRY || 320;
    let scaleX = (mmW - 12) / (islandRX * 2);
    let scaleY = (mmH - 12) / (islandRY * 2);

    // Store geometry for potential debug/external use
    window._minimapGeo = { mmX, mmY, mmW, mmH, mcx, mcy, scaleX, scaleY };

    // Set up clipping so overlay elements don't overflow
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(mmX + 2, mmY + 2, mmW - 4, mmH - 4);
    drawingContext.clip();

    // ─── BUILDINGS ───
    // Draw buildings as small colored squares
    if (state.buildings && Array.isArray(state.buildings)) {
      for (let b of state.buildings) {
        if (!b || typeof b.x !== 'number' || typeof b.y !== 'number') continue;

        let bx = mcx + (b.x - WORLD.islandCX) * scaleX;
        let by = mcy + (b.y - WORLD.islandCY) * scaleY;

        // Color by building type
        let bcolor = [120, 100, 80]; // default tan
        if (b.type === 'castrum') bcolor = [200, 60, 60];       // red
        else if (b.type === 'temple') bcolor = [180, 160, 120]; // tan
        else if (b.type === 'market') bcolor = [180, 180, 60];  // yellow
        else if (b.type === 'forum') bcolor = [140, 140, 120];  // gray
        else if (b.type === 'granary') bcolor = [160, 140, 80]; // brown
        else if (b.type === 'watchtower' || b.type === 'guardtower') bcolor = [160, 100, 60]; // orange

        noStroke();
        fill(bcolor[0], bcolor[1], bcolor[2], 160);
        rectMode(CENTER);
        rect(bx, by, 3, 3);
        rectMode(CORNER);
      }
    }

    // ─── ALL 4 NPCs (Livia, Marcus, Vesta, Felix) ───
    let npcs = [
      { name: 'livia', obj: state.npc, color: [255, 150, 180] },
      { name: 'marcus', obj: state.marcus, color: [180, 200, 255] },
      { name: 'vesta', obj: state.vesta, color: [180, 140, 255] },
      { name: 'felix', obj: state.felix, color: [140, 200, 140] }
    ];

    for (let npc of npcs) {
      if (!npc.obj || typeof npc.obj.x !== 'number' || typeof npc.obj.y !== 'number') continue;

      let ndx = (npc.obj.x - WORLD.islandCX) * scaleX;
      let ndy = (npc.obj.y - WORLD.islandCY) * scaleY;

      noStroke();
      fill(npc.color[0], npc.color[1], npc.color[2], 180);
      circle(mcx + ndx, mcy + ndy, 3.5);
    }

    // ─── ENEMY POSITIONS (during invasions) — blinking red dots ───
    if (state.invasion && state.invasion.active && state.invasion.enemies && Array.isArray(state.invasion.enemies)) {
      let enemyBlink = (sin(frameCount * 0.1) + 1) * 0.5; // 0 to 1 blink

      for (let enemy of state.invasion.enemies) {
        if (!enemy || typeof enemy.x !== 'number' || typeof enemy.y !== 'number') continue;

        let edx = (enemy.x - WORLD.islandCX) * scaleX;
        let edy = (enemy.y - WORLD.islandCY) * scaleY;

        noStroke();
        fill(255, 80, 80, 120 + enemyBlink * 100);
        circle(mcx + edx, mcy + edy, 3);
      }
    }

    // ─── COMPASS ROSE (N/S/E/W labels) ───
    let compassSize = 12;
    let compassX = mmX + 6;
    let compassY = mmY + 6;

    fill(180, 160, 120, 100); textSize(4); textAlign(CENTER, CENTER);
    text('N', compassX, compassY - compassSize);
    text('S', compassX, compassY + compassSize);
    text('W', compassX - compassSize, compassY);
    text('E', compassX + compassSize, compassY);

    textAlign(LEFT, TOP);

    drawingContext.restore();
    pop();
  }

  // Hook into draw loop after drawHUD
  var _origDraw = typeof draw !== 'undefined' ? draw : null;
  if (_origDraw) {
    window.draw = function() {
      // Call the previous draw (which includes drawHUD)
      _origDraw.apply(this, arguments);

      // Now draw our minimap overlay on top
      try {
        drawMinimapOverlay();
      } catch (e) {
        // Silently fail if minimap overlay has issues
        console.debug('[CYCLE5-MINIMAP] Overlay error:', e);
      }
    };
    console.log('[CYCLE5-MINIMAP] Enhanced minimap patched into draw loop');
  }

  console.log('[CYCLE5] Quest tracker and minimap enhancements loaded');
})();
