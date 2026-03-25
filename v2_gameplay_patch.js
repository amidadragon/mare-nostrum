(function() {
  'use strict';

  // ============================================================================
  // V2 GAMEPLAY PATCH — Mouse recruit clicks + N key diplomacy + quality of life
  // ============================================================================

  // ── MOUSE CLICK RECRUITMENT ──────────────────────────────────────────────
  // Store button hitboxes from drawLegiaUI so mousePressed can detect clicks
  window._legiaButtons = [];

  var _origDrawLegiaUI = typeof drawLegiaUI === 'function' ? drawLegiaUI : null;

  if (_origDrawLegiaUI) {
    window.drawLegiaUI = function() {
      // Clear button hitboxes before redraw
      window._legiaButtons = [];
      _origDrawLegiaUI.apply(this, arguments);
    };

    // Monkey-patch the text() calls inside drawLegiaUI to capture button positions
    // Instead of patching text(), let's add a post-render overlay with clickable zones
    // We'll compute button positions from the panel geometry (same as drawLegiaUI)
    window._drawLegiaClickZones = function() {
      var lg = state.legia;
      if (!lg || !lg.legiaUIOpen) return;

      // Match panel geometry from drawLegiaUI (ui.js ~line 1091)
      var pw = 220, ph = 320;
      var px = width - pw - 20;
      var py = 60;

      // Match the unlockedTypes list from drawLegiaUI
      var unlockedTypes = ['legionary'];
      if (lg.castrumLevel >= 2) unlockedTypes.push('archer');
      if (lg.castrumLevel >= 3) unlockedTypes.push('cavalry');
      if (lg.castrumLevel >= 4) unlockedTypes.push('siege_ram');
      if (lg.castrumLevel >= 5) unlockedTypes.push('centurion');

      // Calculate button Y positions (matching drawLegiaUI layout)
      var sy = py + 26; // header
      sy += 15; // army count line
      sy += 13; // formation line
      sy += 15; // separator + TRAIN UNITS header
      sy += 14; // after header

      var unitKeys = { legionary: '1', archer: '3', cavalry: '4', siege_ram: '5', centurion: '6' };

      window._legiaButtons = [];
      for (var i = 0; i < unlockedTypes.length; i++) {
        var t = unlockedTypes[i];
        var btnY = sy;
        var btnH = 13;

        // Check for counter info line
        var hasCounter = (typeof UNIT_COUNTER_INFO !== 'undefined') && UNIT_COUNTER_INFO[t];

        window._legiaButtons.push({
          x: px + 14,
          y: btnY,
          w: pw - 28,
          h: btnH + (hasCounter ? 11 : 2),
          key: unitKeys[t] || '1',
          type: t
        });

        sy += 13;
        sy += hasCounter ? 11 : 2;
      }
    };
  }

  // Hook into mousePressed to handle legion button clicks
  var _origMousePressed = typeof mousePressed !== 'undefined' ? mousePressed : null;

  window.mousePressed = function() {
    // Check legion recruit button clicks
    if (state && state.legia && state.legia.legiaUIOpen && window._legiaButtons) {
      for (var i = 0; i < window._legiaButtons.length; i++) {
        var btn = window._legiaButtons[i];
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          // Simulate the keyboard press for this unit
          if (typeof handleLegiaKey === 'function') {
            handleLegiaKey(btn.key);
          }
          return;
        }
      }
    }

    // Pass through to original
    if (_origMousePressed) {
      return _origMousePressed.apply(this, arguments);
    }
  };

  // ── N KEY: DIPLOMACY WORLD VIEW ────────────────────────────────────────
  // Patch keyPressed to add N key toggle for DiplomacySystem.worldViewOpen
  var _origKeyPressed2 = typeof keyPressed !== 'undefined' ? keyPressed : null;

  window.keyPressed = function() {
    // N key toggles diplomacy world view (only when not in menus/interiors)
    if ((key === 'n' || key === 'N') && typeof DiplomacySystem !== 'undefined') {
      if (gameScreen === 'game' && !state.insideCastrum && !state.insideTemple &&
          !state.nationDiplomacyOpen && !state.expeditionModifierSelect) {
        DiplomacySystem.worldViewOpen = !DiplomacySystem.worldViewOpen;
        return false;
      }
    }

    // Pass through
    if (_origKeyPressed2) {
      return _origKeyPressed2.apply(this, arguments);
    }
  };

  // ── HOOK INTO DRAW TO UPDATE LEGIA BUTTON POSITIONS ────────────────────
  var _origDraw = typeof draw !== 'undefined' ? draw : null;
  if (_origDraw) {
    window.draw = function() {
      _origDraw.apply(this, arguments);
      // Update button hitboxes after draw
      if (typeof window._drawLegiaClickZones === 'function') {
        window._drawLegiaClickZones();
      }
      // Draw diplomacy world view overlay
      if (typeof DiplomacySystem !== 'undefined' && DiplomacySystem.worldViewOpen) {
        if (typeof drawDiplomacyWorldView === 'function') {
          drawDiplomacyWorldView();
        }
      }
      // Draw trade panel overlay
      if (typeof TradeSystem !== 'undefined' && TradeSystem.panelOpen) {
        TradeSystem.drawPanel();
      }
      // Update trade system
      if (typeof TradeSystem !== 'undefined') {
        TradeSystem.update(1/60);
      }
    };
  }

  console.log('[V2 GAMEPLAY] Loaded: mouse recruit, N-key diplomacy, trade/diplo draw hooks');
})();
