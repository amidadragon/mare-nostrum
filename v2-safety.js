// v2-safety.js — Early-load safety stubs for Mare Nostrum V2
// Prevents ReferenceError crashes during setup/init when load order is wrong
// or service worker serves stale cached files.
// Load this BEFORE sketch.js in index.html.

(function() {
  'use strict';

  // List of functions that are called in critical paths and MUST exist
  // even if their defining script hasn't loaded yet.
  // Each stub is a no-op that logs a warning.
  var criticalFns = [
    'updatePortPositions',
    'trackMilestone',
    'addNotification',
    'initPathfinding',
    'rebuildFarmGrid',
    'spawnWildCat'
  ];

  criticalFns.forEach(function(name) {
    if (typeof window[name] === 'undefined') {
      window[name] = function() {
        console.warn('[v2-safety] Stubbed call to ' + name + '() — real function not loaded yet');
      };
      // Mark as stub so the real definition can overwrite
      window[name]._isStub = true;
    }
  });

  // Global error handler to catch and log instead of crashing
  window.addEventListener('error', function(e) {
    console.error('[v2-safety] Uncaught error:', e.message, 'at', e.filename, ':', e.lineno);
  });

  console.log('[v2-safety] Safety stubs loaded');
})();
