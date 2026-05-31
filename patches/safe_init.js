// patches/safe_init.js
// Structural crash-proofing for Mare Nostrum V2.
//
// The single highest-leverage change for defect rate: keep the p5 animation
// frame loop alive no matter what a subsystem does. Today, a thrown exception
// inside setup() or draw() kills the loop and the game becomes a blank
// canvas. This patch wraps setup()/draw() (and a configurable list of
// subsystem entry points) so that when any one throws, we:
//
//   1. Log the error with subsystem name + throttled console output
//   2. Mark that subsystem unhealthy in window._mnHealth
//   3. After N strikes, auto-disable the subsystem for the rest of the session
//   4. Let every other subsystem keep running
//
// The game degrades — land combat might not render, crowd ambience might go
// silent — but the player never sees a black canvas and can still save.
//
// Exposes:
//   window.getHealthStatus()    -> { subsystem: { healthy, errors, lastError, disabled } }
//   window._mnHealth            raw store (read-only advisable)
//   window._mnSafe(name, fn)    wrap a function ad-hoc with the safety net
//
// Zero risk: overlay only. If a subsystem was working, it still works. If it
// was broken, now we catch it instead of killing the loop.
//
// Load order: EARLY — after hotfix stubs, before other patches.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__SAFE_INIT_PATCHED__) return;

  // Strikes until a subsystem is permanently disabled for the session.
  const MAX_STRIKES      = 5;
  // Minimum ms between identical error logs — prevents console flood.
  const LOG_THROTTLE_MS  = 2000;

  const _mnHealth = Object.create(null);
  function _record(name) {
    if (!_mnHealth[name]) {
      _mnHealth[name] = {
        healthy: true, errors: 0, lastError: null, disabled: false,
        lastCall: 0, calls: 0, lastLog: 0,
      };
    }
    return _mnHealth[name];
  }

  function _throttledWarn(h, name, err) {
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (now - h.lastLog < LOG_THROTTLE_MS) return;
    h.lastLog = now;
    console.warn('[safe_init] subsystem "' + name + '" threw: ' +
                 ((err && err.message) || err));
    if (err && err.stack) console.warn(err.stack);
  }

  function _mnSafe(name, fn) {
    if (typeof fn !== 'function') return fn;
    return function () {
      const h = _record(name);
      if (h.disabled) return undefined;
      h.calls++;
      h.lastCall = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        h.errors++;
        h.lastError = (e && e.message) || String(e);
        h.healthy = false;
        _throttledWarn(h, name, e);
        if (h.errors >= MAX_STRIKES) {
          h.disabled = true;
          console.warn('[safe_init] disabling "' + name + '" after ' + MAX_STRIKES +
                       ' strikes — subsystem will no longer run this session');
        }
        return undefined;
      }
    };
  }

  // Subsystems we know exist in MN V2. Each entry = window fn name we wrap.
  // If a name isn't a function at patch time, we skip it silently.
  const SUBSYSTEMS = [
    // Top-level scene dispatchers
    'drawWorld', 'drawMap', 'drawSailing', 'drawCombat', 'drawWarBattle',
    'drawArmyBattle', 'drawDiplomacy', 'drawCity', 'drawIsland',
    'drawQuest', 'drawQuestTracker', 'drawMenu', 'drawHUD',
    // Heavy per-entity renders that tend to throw on malformed data
    'drawShip', '_drawWarShip', '_drawBattleUnits',
    // Simulation ticks
    'updateSailing', 'updateCombat', 'updateDiplomacy', 'updateAI',
    'updateEconomy', 'updateSeaPeople',
    // Input / save
    'keyPressed', 'mousePressed', 'mouseReleased', 'save',
  ];

  function _wrapIfExists(name) {
    if (typeof window[name] !== 'function') return false;
    const orig = window[name];
    // Avoid re-wrapping if already safe-wrapped.
    if (orig.__safeInit__) return false;
    const wrapped = _mnSafe(name, orig);
    wrapped.__safeInit__ = true;
    wrapped.__origFn__   = orig;
    window[name] = wrapped;
    _record(name); // register even before first call
    return true;
  }

  let wrappedCount = 0;
  for (const name of SUBSYSTEMS) if (_wrapIfExists(name)) wrappedCount++;

  // Wrap setup() and draw() specially. We must preserve p5's ability to
  // invoke them by name. p5 binds these on window, so re-assignment works.
  let setupWrapped = false, drawWrapped = false;

  if (typeof window.setup === 'function' && !window.setup.__safeInit__) {
    const origSetup = window.setup;
    const safeSetup = function () {
      const h = _record('setup');
      h.calls++;
      try {
        return origSetup.apply(this, arguments);
      } catch (e) {
        h.errors++;
        h.lastError = (e && e.message) || String(e);
        h.healthy = false;
        console.error('[safe_init] setup() threw but loop kept alive:', e);
        // Ensure p5 still thinks setup ran — otherwise draw never starts.
        // p5 calls setup once; if it throws, some global init (width/height,
        // canvas) may be missing. Try the minimum to keep draw() viable.
        try {
          if (typeof createCanvas === 'function' &&
              (typeof width !== 'number' || !width)) {
            createCanvas(window.innerWidth || 1280, window.innerHeight || 720);
          }
        } catch (_) {}
        return undefined;
      }
    };
    safeSetup.__safeInit__ = true;
    safeSetup.__origFn__   = origSetup;
    window.setup = safeSetup;
    setupWrapped = true;
  }

  if (typeof window.draw === 'function' && !window.draw.__safeInit__) {
    const origDraw = window.draw;
    const safeDraw = function () {
      const h = _record('draw');
      if (h.disabled) {
        // Completely dead frame loop — fill canvas with a soft colour so the
        // player sees something better than a frozen last frame.
        try {
          if (typeof background === 'function') background(12, 20, 36);
          if (typeof fill === 'function') fill(180, 160, 90);
          if (typeof noStroke === 'function') noStroke();
          if (typeof textAlign === 'function' && typeof CENTER === 'number') textAlign(CENTER, CENTER);
          if (typeof text === 'function' && typeof width === 'number') {
            text('Rendering degraded — open console for details.', width / 2, 40);
          }
        } catch (_) {}
        return;
      }
      h.calls++;
      try {
        return origDraw.apply(this, arguments);
      } catch (e) {
        h.errors++;
        h.lastError = (e && e.message) || String(e);
        h.healthy = false;
        _throttledWarn(h, 'draw', e);
        if (h.errors >= MAX_STRIKES * 4) {  // draw runs 60x/sec, be stricter
          h.disabled = true;
          console.warn('[safe_init] disabling draw() — frame loop will show degraded banner');
        }
        return undefined;
      }
    };
    safeDraw.__safeInit__ = true;
    safeDraw.__origFn__   = origDraw;
    window.draw = safeDraw;
    drawWrapped = true;
  }

  function getHealthStatus() {
    // Return a plain snapshot, not the live store.
    const out = {};
    for (const name in _mnHealth) {
      const h = _mnHealth[name];
      out[name] = {
        healthy: h.healthy, errors: h.errors, calls: h.calls,
        disabled: h.disabled, lastError: h.lastError,
        lastCallAgoMs: h.lastCall
          ? Math.round(((typeof performance !== 'undefined') ? performance.now() : Date.now()) - h.lastCall)
          : null,
      };
    }
    return out;
  }

  window._mnHealth            = _mnHealth;
  window._mnSafe              = _mnSafe;
  window.getHealthStatus      = getHealthStatus;
  window.__SAFE_INIT_PATCHED__ = true;

  console.log('[safe_init] active — wrapped ' + wrappedCount + ' subsystems, ' +
              'setup=' + setupWrapped + ', draw=' + drawWrapped +
              '. Call getHealthStatus() for a report.');
})();