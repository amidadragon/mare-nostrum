// ═══════════════════════════════════════════════════════════════════════
// ISLAND LANDING FIX — repairs the session-breaking dock bug. ZERO core
// edits.
//
// ROOT CAUSE: expansion.js swaps `_islandFields` (which include 'time',
// 'day', 'progression') between the global state and the visited island's
// state. createNeutralIslandState() defines time as an OBJECT
// {hours, minutes} while the live game uses MINUTES (number), and its
// progression lacks homeIslandReached. On dock:
//   state.time = {object}  -> getSkyBrightness() caches NaN for the frame
//   -> AmbientManager._ramp(NaN) throws -> safeDraw aborts EVERY frame
//   -> gray void; and !progression.homeIslandReached flips the engine
//   into WRECK SURVIVAL mode (THIRST/HUNGER HUD, "FIND WATER!").
//
// FIX, in four layers (any one would mask it; together they make landing
// robust per the design note's "islandLoadSequence" intent):
//   1. Sanitize island states at the factory (createNeutralIslandState)
//   2. Sanitize again on every swap (covers states saved before this fix)
//   3. updateTime self-heals if state.time is ever non-numeric/non-finite
//   4. Audio ramps skip non-finite targets — a NaN can degrade audio for
//      a frame but can never abort the draw loop again
// ═══════════════════════════════════════════════════════════════════════

(function () {
  function sanitize(ist) {
    if (!ist || typeof ist !== 'object') return ist;
    if (ist.time != null && typeof ist.time !== 'number') {
      ist.time = (typeof ist.time === 'object')
        ? ((ist.time.hours || 8) * 60 + (ist.time.minutes || 0))
        : 480;
    }
    if (typeof ist.time === 'number' && !isFinite(ist.time)) ist.time = 480;
    if (ist.day != null && (typeof ist.day !== 'number' || !isFinite(ist.day))) ist.day = 1;
    if (ist.progression && typeof ist.progression === 'object') {
      const p = ist.progression;
      if (p.homeIslandReached === undefined) p.homeIslandReached = true;
      if (p.gameStarted === undefined) p.gameStarted = true;
      if (p.villaCleared === undefined) p.villaCleared = true;
      if (p.tutorialDone === undefined) p.tutorialDone = true;
      // tutorial code dereferences these without guards (sketch.js ~2491+)
      if (!p.npcsFound || typeof p.npcsFound !== 'object') p.npcsFound = {};
      if (!p.tutorialsSeen || typeof p.tutorialsSeen !== 'object') p.tutorialsSeen = {};
      if (!p.companionsAwakened || typeof p.companionsAwakened !== 'object') p.companionsAwakened = {};
    }
    if (ist.weather && typeof ist.weather === 'object' && ist.weather.intensity == null) {
      ist.weather.intensity = 0;
    }
    // the swapped-in player object must satisfy updatePlayer()'s contract;
    // backfill anything createNeutralIslandState forgot from the live player
    if (ist.player && typeof ist.player === 'object') {
      const pl = ist.player;
      if (!Array.isArray(pl.trailPoints)) pl.trailPoints = [];
      if (pl.dashTimer == null) pl.dashTimer = 0;
      if (pl.targetX === undefined) pl.targetX = null;
      if (pl.targetY === undefined) pl.targetY = null;
      if (pl.skillPoints == null) pl.skillPoints = 0;
      if (typeof state !== 'undefined' && state.player) {
        for (const k in state.player) {
          if (pl[k] === undefined) {
            const v = state.player[k];
            pl[k] = Array.isArray(v) ? [] : (typeof v === 'object' && v !== null) ? JSON.parse(JSON.stringify(v)) : v;
          }
        }
      }
    }
    return ist;
  }

  const wire = setInterval(function () {
    if (typeof window.createNeutralIslandState !== 'function' ||
        typeof window.swapToIsland !== 'function' ||
        typeof window.updateTime !== 'function' ||
        typeof state === 'undefined') return;
    clearInterval(wire);

    // 1. factory
    const origFactory = window.createNeutralIslandState;
    window.createNeutralIslandState = function () {
      return sanitize(origFactory.apply(this, arguments));
    };

    // 2a. raw swap (expansion.js path)
    const origSwap = window.swapToIsland;
    window.swapToIsland = function (islandState, cx, cy) {
      sanitize(islandState);
      return origSwap.apply(this, arguments);
    };

    // 2b. WorldState path (stack-safe swaps route here)
    const wireWS = setInterval(function () {
      if (typeof WorldState === 'undefined' || !WorldState.safeSwap) return;
      clearInterval(wireWS);
      const origSafe = WorldState.safeSwap.bind(WorldState);
      WorldState.safeSwap = function (islandId) {
        const isle = WorldState.islands && WorldState.islands[islandId];
        if (isle && isle.islandState) sanitize(isle.islandState);
        return origSafe(islandId);
      };
      // heal anything already registered (e.g. loaded from an old save)
      if (WorldState.islands) {
        for (const id in WorldState.islands) {
          const isle = WorldState.islands[id];
          if (isle && isle.islandState) sanitize(isle.islandState);
        }
      }
    }, 500);

    // 3. time self-heal
    const origUpdateTime = window.updateTime;
    window.updateTime = function (dt) {
      if (typeof state.time !== 'number' || !isFinite(state.time)) {
        state.time = (state.time && typeof state.time === 'object')
          ? ((state.time.hours || 8) * 60 + (state.time.minutes || 0))
          : 480;
      }
      if (typeof state.day !== 'number' || !isFinite(state.day)) state.day = 1;
      return origUpdateTime.apply(this, arguments);
    };

    // 4. audio ramp guard — NaN must never abort the draw loop
    const wireAmb = setInterval(function () {
      if (typeof snd === 'undefined' || !snd || !snd._amb || !snd._amb._ramp) return;
      clearInterval(wireAmb);
      const amb = snd._amb;
      const origRamp = amb._ramp.bind(amb);
      amb._ramp = function (param, target, time) {
        if (!isFinite(target)) return; // skip silently, keep the frame alive
        return origRamp(param, target, time);
      };
      console.log('[Landing Fix] ✓ audio ramp guard active');
    }, 500);

    console.log('[Landing Fix] ✓ island state sanitizers + time self-heal active');

    // 5. entity-draw guards — a malformed visitor NPC must not abort frames
    if (typeof window.drawNPC === 'function') {
      const origDrawNPC = window.drawNPC;
      window.drawNPC = function (n) {
        if (n && n.currentLine != null && n.currentLine !== -1 &&
            typeof n.currentLine !== 'string' &&
            (!Array.isArray(n.lines) || n.lines[n.currentLine] == null)) {
          n.currentLine = -1; // dialogue state without dialogue lines — reset
        }
        try { return origDrawNPC.apply(this, arguments); } catch (e) { /* skip this npc */ }
      };
    }
    if (typeof window.drawWorldObjectsSorted === 'function') {
      const origSorted = window.drawWorldObjectsSorted;
      window.drawWorldObjectsSorted = function () {
        try { return origSorted.apply(this, arguments); } catch (e) { /* keep the frame */ }
      };
    }
  }, 400);
})();
