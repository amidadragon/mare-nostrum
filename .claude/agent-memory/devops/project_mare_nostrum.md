---
name: Mare Nostrum project structure
description: Game file layout, save system version, cache busting scheme, and deployment targets
type: project
---

Mare Nostrum (Sunlit Isles) is a p5.js browser game served as static files.

**Files**: sketch.js (23,118 lines main logic), islands.js (564), combat.js (334), economy.js (500), diving.js (434), engine.js (140), narrative.js (871), debug.js (380), index.html shell. Total extracted modules: 3,223 lines.

**Modularization**: Plan documented in MODULARIZATION_PLAN.md. 15 candidate extractions identified totaling ~18k lines. Safest first extractions: sound.js (SoundManager class, lines 22503-23118), cinematics.js (intro+cutscenes, lines 1963-3351), wreck.js (wreck beach system, lines 18815-19992). Script load order: all new files go before sketch.js in index.html.

**Save system**: localStorage key `sunlitIsles_save`, version field currently 7. Resources added over time — island resources (obsidian, frostCrystal, exoticSpices, soulEssence) added to save/load as of 2026-03-18. Diving resources (pearls, coral, sponges, amphoras, lungCapacity, diveSpeed, totalDives) added to save/load as of 2026-03-18.

**Cache busting**: Manual `?v=N` on all script tags in index.html. All scripts should share the same version number. Currently at v=200.

**Delta time**: `_delta` is calculated in seconds in the draw() preamble (line ~1282). `drawInner()` converts to frame-units via `min(2, _delta * 60)` — the clamp at 2 prevents death spirals on tab-switch.

**Particles**: Global `particles` array, hard-capped at 300 (line ~11052). Not unbounded.

**Conquest enemies**: Capped at 20 via spawn logic (line ~15297). Cleaned up on death via splice.

**Why:** Tracking these details avoids re-investigation in future sessions.
**How to apply:** Reference when making build, save migration, or performance changes.
