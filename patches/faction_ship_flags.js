// patches/faction_ship_flags.js
// Polish (P3): faction-unique ship pennants for war battles.
//
// Wraps:
//   - startWarBattle(attackerArmy, defenderArmy, context)
//        -> tags w.ships.player / w.ships.enemy with `_nationKey`
//   - _drawWarShip(ship, isPlayer)
//        -> overlays a small faction flag pennant above the ship hull
//
// Color source:
//   1. FACTION_MILITARY[key].conquestFlag (primary)
//   2. _getNavalFactionColor(key) (fallback)
//   3. neutral grey (last resort)
//
// Load AFTER: military.js, nations.js, combat.js, and sketch.js (patches folder)
// Zero risk: pure overlay on top of existing render; no internal replacement.

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.__FACTION_SHIP_FLAGS_PATCHED__) return;

  // ---------- color resolver ----------
  function _factionTintRGB(key) {
    if (!key) return [200, 200, 200];
    try {
      if (typeof FACTION_MILITARY === 'object'
          && FACTION_MILITARY[key]
          && FACTION_MILITARY[key].conquestFlag) {
        return FACTION_MILITARY[key].conquestFlag;
      }
    } catch (e) {}
    try {
      if (typeof _getNavalFactionColor === 'function') {
        const c = _getNavalFactionColor(key);
        if (Array.isArray(c) && c.length >= 3) return c;
      }
    } catch (e) {}
    return [200, 200, 200];
  }

  // ---------- pennant renderer ----------
  function _drawFactionPennant(x, y, nationKey, opts) {
    opts = opts || {};
    const w       = opts.w       != null ? opts.w       : 14;
    const h       = opts.h       != null ? opts.h       :  8;
    const poleH   = opts.poleH   != null ? opts.poleH   : 22;
    const offsetY = opts.offsetY != null ? opts.offsetY : -32;

    const rgb = _factionTintRGB(nationKey);

    push();
    // flagpole
    stroke(40, 30, 20, 220);
    strokeWeight(1.5);
    line(x, y + offsetY, x, y + offsetY - poleH);
    noStroke();
    // pennant triangle — subtle billow from the current frame
    const billow = floor(sin(frameCount * 0.05) * 1.5);
    fill(rgb[0], rgb[1], rgb[2], 240);
    triangle(
      x,         y + offsetY - poleH,
      x + w,     y + offsetY - poleH + h * 0.5 + billow,
      x,         y + offsetY - poleH + h
    );
    // dark definition stripe against the pole
    fill(rgb[0] * 0.6, rgb[1] * 0.6, rgb[2] * 0.6, 220);
    rect(x - 0.5, y + offsetY - poleH, 2, h);
    pop();
  }

  // expose helpers for future patches / debugging
  window._factionTintRGB     = _factionTintRGB;
  window._drawFactionPennant = _drawFactionPennant;

  // ---------- patch 1: startWarBattle — tag ships with nationKey ----------
  if (typeof window.startWarBattle === 'function') {
    const _origStart = window.startWarBattle;
    window.startWarBattle = function (attackerArmy, defenderArmy, context) {
      const r = _origStart.apply(this, arguments);
      try {
        const candidates = [];
        if (window.warBattle && window.warBattle.ships) candidates.push(window.warBattle);
        if (typeof state === 'object' && state && state.warBattle && state.warBattle.ships) {
          candidates.push(state.warBattle);
        }
        for (const w of candidates) {
          if (w.ships && w.ships.player) {
            w.ships.player._nationKey = (state && state.faction) ? state.faction : 'rome';
          }
          if (w.ships && w.ships.enemy && context && context.nationKey) {
            w.ships.enemy._nationKey = context.nationKey;
          }
        }
      } catch (e) {
        console.warn('[faction_ship_flags] startWarBattle tag failed:', e && e.message);
      }
      return r;
    };
  }

  // ---------- patch 2: _drawWarShip — overlay pennant ----------
  if (typeof window._drawWarShip === 'function') {
    const _origDraw = window._drawWarShip;
    window._drawWarShip = function (ship, isPlayer) {
      const r = _origDraw.apply(this, arguments);
      try {
        if (ship && typeof ship.x === 'number' && typeof ship.y === 'number'
            && ship.alive !== false) {
          let key = ship._nationKey;
          if (!key) {
            key = isPlayer
              ? ((state && state.faction) ? state.faction : 'rome')
              : 'carthage';
          }
          _drawFactionPennant(ship.x, ship.y, key, { offsetY: -32 });
        }
      } catch (e) {
        console.warn('[faction_ship_flags] pennant draw failed:', e && e.message);
      }
      return r;
    };
  }

  window.__FACTION_SHIP_FLAGS_PATCHED__ = true;
  console.log('[faction_ship_flags] active — war ships now render faction pennants');
})();