// patches/quest_tracker_fix.js
// Tier-0 polish (P3): prevents quest tracker text from clipping.
//
// The original quest tracker draws raw strings without measuring width, so
// longer quests like "Negotiate alliance with Carthage before winter" run off
// the panel's right edge. This patch wraps text(str, x, y) *only* while the
// quest tracker is drawing, replacing overflowing strings with a wrapped or
// ellipsized version.
//
// Strategy: expose a single helper window._fitQuestLine(str, maxWidth) and
// monkey-patch drawQuestTracker (or renderQuests, whichever exists) so the
// helper is installed across the draw window. Falls through cleanly if no
// quest-draw function is present.
//
// Zero risk: overlay + try/catch + restores text() whether the original
// throws or returns.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__QUEST_TRACKER_FIX_PATCHED__) return;

  // Panel inner width (px) — tuned to the cycle4_fixes quest box.
  const MAX_WIDTH = 260;
  const MAX_LINES = 2;

  function _fitQuestLine(str, maxW, maxLines) {
    maxW     = maxW     || MAX_WIDTH;
    maxLines = maxLines || MAX_LINES;
    if (typeof textWidth !== 'function' || typeof str !== 'string') return [str];

    // Fast path — already fits.
    if (textWidth(str) <= maxW) return [str];

    const words = str.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const probe = cur ? cur + ' ' + w : w;
      if (textWidth(probe) <= maxW) {
        cur = probe;
      } else {
        if (cur) lines.push(cur);
        cur = w;
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);

    // Ellipsize last line if still overflowing.
    if (lines.length) {
      let last = lines[lines.length - 1];
      if (textWidth(last) > maxW) {
        while (last.length > 3 && textWidth(last + '…') > maxW) {
          last = last.slice(0, -1);
        }
        lines[lines.length - 1] = last + '…';
      }
    }
    return lines.length ? lines : [str];
  }
  window._fitQuestLine = _fitQuestLine;

  // Active-scope toggle — when true, our text() wrapper intercepts.
  let ACTIVE = false;

  // Patch text() only once; behavior is inert unless ACTIVE.
  const _origText = window.text;
  if (typeof _origText === 'function') {
    window.text = function (str, x, y, w, h) {
      if (!ACTIVE || typeof str !== 'string') {
        return _origText.apply(this, arguments);
      }
      try {
        // Only intercept within the quest panel x-range.
        // The tracker draws at x ~ width-280 -> width-20, so use a simple
        // right-edge heuristic.
        const rightEdge = (typeof width === 'number') ? width - 16 : 9999;
        const leftEdge  = rightEdge - (MAX_WIDTH + 8);
        if (typeof x !== 'number' || x < leftEdge || x > rightEdge) {
          return _origText.apply(this, arguments);
        }
        const lines = _fitQuestLine(str, MAX_WIDTH, MAX_LINES);
        if (lines.length === 1 && lines[0] === str) {
          return _origText.apply(this, arguments);
        }
        // Re-emit each wrapped line.
        const lineH = (typeof textLeading === 'function') ? textLeading() : 16;
        for (let i = 0; i < lines.length; i++) {
          _origText.call(this, lines[i], x, y + i * lineH);
        }
      } catch (e) {
        return _origText.apply(this, arguments);
      }
    };
  }

  function _wrapQuestDrawer(name) {
    if (typeof window[name] !== 'function') return false;
    const orig = window[name];
    window[name] = function () {
      ACTIVE = true;
      try { return orig.apply(this, arguments); }
      finally { ACTIVE = false; }
    };
    return true;
  }

  const wrapped = [
    _wrapQuestDrawer('drawQuestTracker'),
    _wrapQuestDrawer('renderQuestTracker'),
    _wrapQuestDrawer('drawQuests'),
    _wrapQuestDrawer('renderQuests'),
  ].some(Boolean);

  if (!wrapped) {
    // No explicit quest drawer found — fall back to activating on every
    // draw() call. The x-range heuristic already limits interception.
    if (typeof window.draw === 'function') {
      const _origDraw = window.draw;
      window.draw = function () {
        ACTIVE = true;
        try { return _origDraw.apply(this, arguments); }
        finally { ACTIVE = false; }
      };
    }
  }

  window.__QUEST_TRACKER_FIX_PATCHED__ = true;
  console.log('[quest_tracker_fix] active — quest text will wrap/ellipsize instead of clipping');
})();