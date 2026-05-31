// patches/faction_army_banners.js
// Polish (P3): faction-unique unit sprites — adds a faction banner above each
// army cluster in the land-battle view.
//
// Wraps: drawArmyBattle()
//   After the original render runs, reads window._armyBattle (the in-flight
//   battle struct) and draws one faction pennant above each side's live-unit
//   centroid:
//     - attackers -> if context.type === 'attack', that's the player; else enemy
//     - defenders -> inverse
//
// Dependency: patches/faction_ship_flags.js (provides window._drawFactionPennant
//             and window._factionTintRGB).  Load THIS file AFTER ship_flags.
//
// Zero risk: the wrap never prevents the original render, never mutates state,
// and fails soft (try/catch wraps the overlay entirely).

(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (window.__FACTION_ARMY_BANNERS_PATCHED__) return;
  if (typeof window.drawArmyBattle !== 'function') return;

  // If ship_flags didn't load first, install a minimal local fallback so this
  // patch never crashes even in isolation.
  if (typeof window._drawFactionPennant !== 'function') {
    window._factionTintRGB = window._factionTintRGB || function (key) {
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
    };
    window._drawFactionPennant = function (x, y, nationKey, opts) {
      opts = opts || {};
      const w       = opts.w       != null ? opts.w       : 14;
      const h       = opts.h       != null ? opts.h       :  8;
      const poleH   = opts.poleH   != null ? opts.poleH   : 22;
      const offsetY = opts.offsetY != null ? opts.offsetY : -32;
      const rgb = window._factionTintRGB(nationKey);
      push();
      stroke(40, 30, 20, 220);
      strokeWeight(1.5);
      line(x, y + offsetY, x, y + offsetY - poleH);
      noStroke();
      const billow = floor(sin(frameCount * 0.05) * 1.5);
      fill(rgb[0], rgb[1], rgb[2], 240);
      triangle(
        x,         y + offsetY - poleH,
        x + w,     y + offsetY - poleH + h * 0.5 + billow,
        x,         y + offsetY - poleH + h
      );
      fill(rgb[0] * 0.6, rgb[1] * 0.6, rgb[2] * 0.6, 220);
      rect(x - 0.5, y + offsetY - poleH, 2, h);
      pop();
    };
  }

  function _groupCenter(units) {
    if (!Array.isArray(units) || units.length === 0) return null;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u && u.alive !== false
          && typeof u.x === 'number'
          && typeof u.y === 'number') {
        sx += u.x; sy += u.y; n++;
      }
    }
    return n ? { x: sx / n, y: sy / n } : null;
  }

  const _origDrawArmyBattle = window.drawArmyBattle;
  window.drawArmyBattle = function () {
    const r = _origDrawArmyBattle.apply(this, arguments);
    try {
      const b = window._armyBattle;
      if (!b || !b.context) return r;

      const type        = b.context.type;            // 'attack' | 'defend'
      const enemyKey    = b.context.nationKey || 'carthage';
      const playerKey   = (typeof state === 'object' && state && state.faction)
                            ? state.faction : 'rome';

      let attackerKey, defenderKey;
      if (type === 'attack') {
        attackerKey = playerKey; defenderKey = enemyKey;
      } else {
        attackerKey = enemyKey;  defenderKey = playerKey;
      }

      const aC = _groupCenter(b.attackers);
      const dC = _groupCenter(b.defenders);

      const bannerOpts = { w: 18, h: 12, poleH: 30, offsetY: 0 };
      if (aC) window._drawFactionPennant(aC.x, aC.y - 28, attackerKey, bannerOpts);
      if (dC) window._drawFactionPennant(dC.x, dC.y - 28, defenderKey, bannerOpts);
    } catch (e) {
      console.warn('[faction_army_banners] failed:', e && e.message);
    }
    return r;
  };

  window.__FACTION_ARMY_BANNERS_PATCHED__ = true;
  console.log('[faction_army_banners] active — armies now render faction banners above their clusters');
})();