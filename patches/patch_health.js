// patches/patch_health.js
// Silent-drift monitor for Mare Nostrum V2.
//
// Every overlay patch we ship sets a window.__X_PATCHED__ flag and exports a
// few helper functions (e.g. _drawFactionPennant, QRNG.next, startGroverHunt).
// Those helpers are supposed to run during normal gameplay. If a game update
// renames or guards the callsite, the helpers go silent — the patch is still
// "installed" (flag is true, __safeInit__ reports no errors), but the feature
// is effectively dead. This is the hardest class of bug to spot: no crash, no
// visible error, just a gradual drift of cosmetic/feature coverage.
//
// This patch instruments each known exported helper with a call-counter and
// last-invocation timestamp. It exposes:
//
//   window.getPatchHealth()   -> {
//     patches: {
//       faction_ship_flags: { installed, helpers: {name: {calls, lastCallAgoMs, suspectedDrift}} },
//       faction_army_banners: {...},
//       quest_tracker_fix:   {...},
//       quantum_rng:         {...},
//       grover_hunt:         {...},
//       safe_init:           {...},
//       bugtest:             {...},
//     },
//     summary: { installed: n, helpersTotal: n, helpersActive: n, suspectedDrift: n },
//   }
//
// A helper is "suspectedDrift" when it's been installed for > 60 seconds of
// wall-clock gameplay and has never been invoked. That threshold is generous
// on purpose: players who haven't entered naval combat shouldn't see a warning
// for ship-flag helpers. For helpers that should fire every frame (safe_init
// draw wrappers), the threshold could be tighter — but we use the uniform
// generous threshold to avoid false positives.
//
// Zero-risk: pure observer. Doesn't change helper behaviour, just counts.
// Load order: LAST — after every other patch has registered its helpers.

(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__PATCH_HEALTH_PATCHED__) return;

  const DRIFT_THRESHOLD_MS = 60000;  // 60s
  const _installedAt = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const _now = () => (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // Per-helper instrumentation store.
  //   _helpers[patchName][helperName] = { calls, lastCall, installedAt }
  const _helpers = Object.create(null);

  function _instrument(patchName, helperPath) {
    // helperPath is a dotted path from window, e.g. "QRNG.next" or "_drawFactionPennant".
    const parts  = helperPath.split('.');
    const leaf   = parts.pop();
    let holder   = window;
    for (const p of parts) {
      if (!holder || typeof holder !== 'object') return false;
      holder = holder[p];
    }
    if (!holder || typeof holder[leaf] !== 'function') return false;
    const orig = holder[leaf];
    if (orig.__patchHealthWrapped__) return false;

    if (!_helpers[patchName]) _helpers[patchName] = Object.create(null);
    _helpers[patchName][helperPath] = { calls: 0, lastCall: 0, installedAt: _now() };

    const wrapped = function () {
      const rec = _helpers[patchName][helperPath];
      rec.calls++;
      rec.lastCall = _now();
      return orig.apply(this, arguments);
    };
    // Preserve any metadata other patches set on the fn.
    for (const k in orig) {
      try { wrapped[k] = orig[k]; } catch (_) {}
    }
    wrapped.__patchHealthWrapped__ = true;
    wrapped.__origFn__ = orig;
    holder[leaf] = wrapped;
    return true;
  }

  // Patch -> (flag, [helpers to instrument])
  const PATCH_DEFS = {
    faction_ship_flags: {
      flag:    '__FACTION_SHIP_FLAGS_PATCHED__',
      helpers: ['_drawFactionPennant', '_factionTintRGB'],
    },
    faction_army_banners: {
      flag:    '__FACTION_ARMY_BANNERS_PATCHED__',
      helpers: ['_drawArmyBanner'],
    },
    quest_tracker_fix: {
      flag:    '__QUEST_TRACKER_FIX_PATCHED__',
      helpers: ['_fitQuestLine'],
    },
    quantum_rng: {
      flag:    '__QUANTUM_RNG_PATCHED__',
      helpers: ['QRNG.next', 'QRNG.nextInt', 'QRNG.pick', 'QRNG.refill'],
    },
    grover_hunt: {
      flag:    '__GROVER_HUNT_PATCHED__',
      helpers: ['startGroverHunt'],
    },
    safe_init: {
      flag:    '__SAFE_INIT_PATCHED__',
      helpers: ['_mnSafe', 'getHealthStatus'],
    },
    bugtest: {
      flag:    '__BUGTEST_HARNESS__',
      helpers: ['runBugTest'],
    },
  };

  let instrumentedCount = 0;
  for (const name in PATCH_DEFS) {
    const def = PATCH_DEFS[name];
    if (!window[def.flag]) continue;  // patch isn't installed, nothing to instrument
    for (const h of def.helpers) {
      if (_instrument(name, h)) instrumentedCount++;
    }
  }

  function getPatchHealth() {
    const now = _now();
    const uptime = now - _installedAt;
    const out = { patches: {}, summary: {
      installed: 0, helpersTotal: 0, helpersActive: 0, suspectedDrift: 0, uptimeMs: Math.round(uptime),
    } };

    for (const name in PATCH_DEFS) {
      const def = PATCH_DEFS[name];
      const installed = !!window[def.flag];
      const entry = { installed, helpers: {} };
      if (installed) out.summary.installed++;

      const helperStore = _helpers[name] || {};
      for (const h of def.helpers) {
        const present = !!helperStore[h];
        const rec     = helperStore[h];
        const calls   = rec ? rec.calls : 0;
        const age     = (rec && rec.lastCall) ? Math.round(now - rec.lastCall) : null;
        const drift   = installed && present && calls === 0 && uptime > DRIFT_THRESHOLD_MS;
        entry.helpers[h] = {
          present, calls,
          lastCallAgoMs: age,
          suspectedDrift: drift,
        };
        if (installed) out.summary.helpersTotal++;
        if (calls > 0)  out.summary.helpersActive++;
        if (drift)      out.summary.suspectedDrift++;
      }
      out.patches[name] = entry;
    }

    return out;
  }

  // Tiny console summary helper for quick eyeballing.
  function printPatchHealth() {
    const h = getPatchHealth();
    console.group('[patch_health] report');
    console.log('uptime:', Math.round(h.summary.uptimeMs / 1000) + 's',
                '| installed:', h.summary.installed,
                '| helpers active/total:', h.summary.helpersActive + '/' + h.summary.helpersTotal,
                '| suspected drift:', h.summary.suspectedDrift);
    for (const name in h.patches) {
      const p = h.patches[name];
      const tag = p.installed ? '✓' : '·';
      const parts = [];
      for (const hn in p.helpers) {
        const he = p.helpers[hn];
        const cal = he.calls > 0 ? ('×' + he.calls) : (he.suspectedDrift ? 'DRIFT' : 'idle');
        parts.push(hn + ':' + cal);
      }
      console.log(tag, name, '—', parts.join(', ') || '(no helpers)');
    }
    console.groupEnd();
    return h;
  }

  window.getPatchHealth        = getPatchHealth;
  window.printPatchHealth      = printPatchHealth;
  window.__PATCH_HEALTH_PATCHED__ = true;
  console.log('[patch_health] active — instrumented ' + instrumentedCount +
              ' helpers across ' + Object.keys(PATCH_DEFS).length + ' patches. ' +
              'Call getPatchHealth() or printPatchHealth() for a report.');
})();