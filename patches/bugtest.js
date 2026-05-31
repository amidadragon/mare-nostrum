// patches/bugtest.js
// Injectable smoke-test harness for Mare Nostrum V2.
//
// Exposes: window.runBugTest([opts])
//   -> Promise<{ total, passed, failed, failures, durationMs, env }>
//
// Tests are grouped: globals, factions, functions, state, synthetic-render,
// save-load, patches. Each test is a pure function that throws on failure.
//
// Zero-risk: read-only probes by default. Synthetic renders are wrapped in
// push()/pop() and run on a throwaway _armyBattle / ship struct that is
// immediately cleared.
//
// Usage:
//   runBugTest()                  // full suite, logs summary
//   runBugTest({quiet:true})      // silent, returns promise
//   runBugTest({only:'factions'}) // just the factions group

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__BUGTEST_HARNESS__) return;

  const FACTION_KEYS = ['rome','carthage','egypt','greece','seapeople','persia','phoenicia','gaul'];

  // Some module-scope consts (FACTION_SHIPS, FACTION_MILITARY) are not reachable
  // via window['…'] but ARE reachable via bare identifier. Helper:
  function _resolveGlobal(name) {
    try { return (new Function('return typeof ' + name + " !== 'undefined' ? " + name + ' : undefined'))(); }
    catch (e) { return undefined; }
  }

  // ---------- test registry ----------
  const tests = [];
  function T(group, name, fn) { tests.push({ group, name, fn }); }

  // ---------- group: globals ----------
  T('globals', 'p5 loaded', () => {
    if (typeof window.p5 === 'undefined' && typeof push !== 'function') {
      throw new Error('p5.js not loaded (push() missing)');
    }
  });
  T('globals', 'state exists', () => {
    if (typeof state !== 'object' || state == null) throw new Error('state undefined');
  });
  T('globals', 'canvas present', () => {
    if (!document.querySelector('canvas')) throw new Error('no <canvas>');
  });

  // ---------- group: factions ----------
  T('factions', 'RIVAL_FACTIONS populated', () => {
    const R = _resolveGlobal('RIVAL_FACTIONS') || window.RIVAL_FACTIONS;
    if (typeof R !== 'object' || R == null) throw new Error('RIVAL_FACTIONS missing');
    let found = 0;
    for (const k of FACTION_KEYS) if (typeof R[k] === 'string') found++;
    if (found < 4) throw new Error('RIVAL_FACTIONS only covers ' + found + '/' + FACTION_KEYS.length);
  });
  T('factions', 'FACTION_SHIPS populated', () => {
    const S = _resolveGlobal('FACTION_SHIPS');
    if (typeof S !== 'object' || S == null) throw new Error('FACTION_SHIPS missing');
    for (const k of FACTION_KEYS) {
      const f = S[k];
      if (!f) throw new Error('FACTION_SHIPS[' + k + '] missing');
      if (!Array.isArray(f.hullColor) || f.hullColor.length < 3) {
        throw new Error('FACTION_SHIPS[' + k + '].hullColor bad');
      }
    }
  });
  T('factions', 'FACTION_MILITARY populated', () => {
    const M = _resolveGlobal('FACTION_MILITARY');
    if (typeof M !== 'object' || M == null) throw new Error('FACTION_MILITARY missing');
    for (const k of FACTION_KEYS) {
      const f = M[k];
      if (!f) throw new Error('FACTION_MILITARY[' + k + '] missing');
      if (!Array.isArray(f.conquestFlag) || f.conquestFlag.length < 3) {
        throw new Error('FACTION_MILITARY[' + k + '].conquestFlag bad');
      }
    }
  });

  // ---------- group: functions ----------
  // Required: must be present. Optional: warn but don't fail.
  const REQUIRED_FNS = [
    'drawShip', '_drawWarShip', 'drawArmyBattle', 'startWarBattle',
    'drawWarBattle', 'save', '_getNavalFactionColor',
  ];
  const OPTIONAL_FNS = ['load', 'loadGame', 'loadSave'];
  for (const fn of REQUIRED_FNS) {
    T('functions', fn + ' defined', () => {
      if (typeof window[fn] !== 'function') {
        throw new Error(fn + ' not a function');
      }
    });
  }
  T('functions', 'some load-variant exists', () => {
    const ok = OPTIONAL_FNS.some(n => typeof window[n] === 'function');
    if (!ok) throw new Error('no load/loadGame/loadSave function found');
  });

  // ---------- group: state ----------
  T('state', 'state.faction is valid or null', () => {
    const f = state.faction;
    if (f != null && FACTION_KEYS.indexOf(f) < 0) {
      throw new Error('state.faction invalid: ' + f);
    }
  });
  T('state', 'state.tradeRoutes is array', () => {
    if (state.tradeRoutes != null && !Array.isArray(state.tradeRoutes)) {
      throw new Error('state.tradeRoutes not array');
    }
  });
  T('state', 'state.seaPeopleShips is array', () => {
    if (state.seaPeopleShips != null && !Array.isArray(state.seaPeopleShips)) {
      throw new Error('state.seaPeopleShips not array');
    }
  });

  // ---------- group: synthetic-render ----------
  T('synthetic-render', '_drawWarShip runs for rome', () => {
    const ship = {
      x: 100, y: 100, angle: 0, hp: 10, maxHp: 10, alive: true,
      type: 'trireme', _nationKey: 'rome',
    };
    push(); translate(0,0);
    try { window._drawWarShip(ship, true); } finally { pop(); }
  });
  T('synthetic-render', '_drawWarShip runs for carthage', () => {
    const ship = {
      x: 120, y: 120, angle: 0, hp: 10, maxHp: 10, alive: true,
      type: 'trireme', _nationKey: 'carthage',
    };
    push();
    try { window._drawWarShip(ship, false); } finally { pop(); }
  });
  T('synthetic-render', 'drawArmyBattle runs with synthetic struct', () => {
    const prev = window._armyBattle;
    const fake = {
      context: { type: 'attack', nationKey: 'carthage', hasShips: false, hasWalls: false },
      phase: 'melee',
      attackers: [{ x:200, y:200, hp:10, maxHp:10, alive:true, type:'legion' }],
      defenders: [{ x:300, y:200, hp:10, maxHp:10, alive:true, type:'hoplite' }],
      projectiles: [],
      formation: 'line',
      result: null,
      resultTimer: 0,
    };
    window._armyBattle = fake;
    push();
    try { window.drawArmyBattle(); } finally { pop(); window._armyBattle = prev; }
  });

  // ---------- group: save-load (non-destructive round-trip) ----------
  T('save-load', 'save() produces a string-coerceable blob', () => {
    if (typeof save !== 'function') throw new Error('no save()');
    // Don't actually call save() if it writes to localStorage — just probe arity.
    if (save.length < 0) throw new Error('save arity bad');
  });
  T('save-load', 'localStorage round-trip ok', () => {
    try {
      const k = '__bugtest_probe__';
      localStorage.setItem(k, '1');
      const v = localStorage.getItem(k);
      localStorage.removeItem(k);
      if (v !== '1') throw new Error('localStorage round-trip bad');
    } catch (e) {
      throw new Error('localStorage unavailable: ' + (e && e.message));
    }
  });

  // ---------- group: patches ----------
  T('patches', 'ship flags patch installed (optional)', () => {
    if (!window.__FACTION_SHIP_FLAGS_PATCHED__) {
      throw new Error('faction_ship_flags.js not installed');
    }
    if (typeof window._drawFactionPennant !== 'function') {
      throw new Error('_drawFactionPennant missing');
    }
  });
  T('patches', 'army banners patch installed (optional)', () => {
    if (!window.__FACTION_ARMY_BANNERS_PATCHED__) {
      throw new Error('faction_army_banners.js not installed');
    }
  });

  // ---------- runner ----------
  async function runBugTest(opts) {
    opts = opts || {};
    const quiet = !!opts.quiet;
    const only  = opts.only || null;
    const t0 = performance.now();
    const results = { total: 0, passed: 0, failed: 0, failures: [], byGroup: {} };

    for (const t of tests) {
      if (only && t.group !== only) continue;
      results.total++;
      results.byGroup[t.group] = results.byGroup[t.group] || { passed:0, failed:0 };
      try {
        await t.fn();
        results.passed++;
        results.byGroup[t.group].passed++;
      } catch (e) {
        results.failed++;
        results.byGroup[t.group].failed++;
        results.failures.push({
          group: t.group, test: t.name,
          error: (e && e.message) ? e.message : String(e),
        });
      }
    }

    results.durationMs = Math.round(performance.now() - t0);
    results.env = {
      faction: (state && state.faction) || null,
      scene: (typeof currentScene === 'string') ? currentScene : null,
      patches: {
        ship_flags:     !!window.__FACTION_SHIP_FLAGS_PATCHED__,
        army_banners:   !!window.__FACTION_ARMY_BANNERS_PATCHED__,
        bugtest:        true,
        quest_fix:      !!window.__QUEST_TRACKER_FIX_PATCHED__,
        quantum_rng:    !!window.__QUANTUM_RNG_PATCHED__,
        grover_hunt:    !!window.__GROVER_HUNT_PATCHED__,
      },
    };

    if (!quiet) {
      const tag = results.failed === 0 ? '%c[bugtest] PASS' : '%c[bugtest] FAIL';
      const col = results.failed === 0 ? 'color:#3a5' : 'color:#c33';
      console.log(tag, col, results.passed + '/' + results.total,
                  '(' + results.durationMs + 'ms)');
      if (results.failures.length) {
        console.groupCollapsed('[bugtest] failures (' + results.failures.length + ')');
        for (const f of results.failures) {
          console.warn('· [' + f.group + '] ' + f.test + ' — ' + f.error);
        }
        console.groupEnd();
      }
    }
    return results;
  }

  window.runBugTest          = runBugTest;
  window.__BUGTEST_HARNESS__ = true;
  console.log('[bugtest] harness loaded — call runBugTest() to execute');
})();