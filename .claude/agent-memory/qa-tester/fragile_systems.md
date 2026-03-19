---
name: Fragile Systems — Mare Nostrum
description: High-risk areas prone to regression, especially after modularization
type: project
---

# Fragile Systems

## 1. drawInner() render pipeline (sketch.js ~1546-2134)
The entire normal island render path is one long function. Any uncaught exception thrown before the HUD/UI draws causes all subsequent rendering to be skipped silently (caught by draw()'s try/catch). The drawNightLighting bug (BUG-101) demonstrates this — the game appears to load but nothing after line 1897 renders.

**Watch for**: Any function called without typeof guard in drawInner that might be extracted or renamed.

## 2. Cross-file function calls after modularization
Many functions extracted to separate files are called from sketch.js WITHOUT typeof guards:
- drawWreckIsland, drawWreckHUD, drawWreckEntities (from wreck.js)
- updateWreckBeach, handleWreckInteract (from wreck.js)
- drawNightLighting (MISSING — BUG-101)
- All farming, fishing, npc, events, player, world functions

These work at runtime because all scripts load before draw() fires. But if a function is ever removed or renamed without updating sketch.js, the failure is silent.

## 3. keyPressed() V key conflict (sketch.js ~15112-15199)
Three separate V key blocks with no clean if/else chain. Adding any new V key binding requires careful audit of all three.

## 4. Save/Load system (sketch.js:15636-16162)
- Version 7 format
- Island loot arrays have || [] guards in saveGame but not all access sites
- Tree reconstruction on load is positional (matched by index) — mismatch if island layout changes
- Crystal nodes are always rebuilt from scratch on load (not saved)

## 5. Load order dependencies
Files load in this order:
engine.js → sound.js → narrative.js → cinematics.js → fishing.js → farming.js → npc.js → events.js → world.js → player.js → ui.js → sketch.js → wreck.js → menu.js → islands.js → diving.js → combat.js → economy.js → debug.js

Key risks:
- ui.js uses NAT_ENEMY_DATA, NAT_RELIC_DATA, JOURNAL_ENTRIES, BLUEPRINTS (all in sketch.js — safe at runtime only)
- sketch.js keyPressed uses TUNIC_COLORS, HEADWEAR (player.js — OK)
- sketch.js uses EXPEDITION_MODIFIERS (ui.js — OK)
- sketch.js uses MARCUS_LINES etc. (npc.js — OK)
- player.js's wardrobeOpen let variable is read/written by sketch.js (works via shared global scope)

## 6. Global variable scope
All key globals declared with let/const at top scope in sketch.js. In classic script tags, these are accessible from all other script files via shared global scope (not window properties, but same scope). This works but any migration to ES modules would break everything.

## 7. Wreck beach progression
Gate in keyPressed (line 14527-14532) blocks ALL other game keys while on wreck. Easy to break if state transitions aren't clean.

# Fragile Systems

## 1. Narrative Flag System
All quest objectives using `interact:` require manual flag setting in code. There is NO automatic flag-setting on discovery/events. Each new interact objective must be paired with `state.narrativeFlags['flag_name'] = true` in the appropriate handler. This has been fixed for all 7 Chapters VII-X flags as of 2026-03-18 audit. Easy to break again with new objectives.

## 2. Save/Load Field Parity
`saveGame()` and `loadGame()` are manually maintained parallel lists. New state fields must be added to BOTH. Known omissions after 2026-03-18 audit pass 4:
- Island loot states now saved — but Hyperborea uses wrong field name (iceNodes vs frostNodes — BUG-026)
- player.xpBoost / xpBoostTimer not saved (BUG-029)
- Crafted resources: steel, marble, perfume, scrolls not saved (unused currently)
Check both functions any time state is extended.

## 3. Conquest Error Recovery (sketch.js:1312)
The catch block that fires "Too many conquest errors" partially resets state. Root causes: NaN propagation from null target references. Every new enemy type needs NaN guards on spawn position.

## 4. `expandIsland()` variable scoping
CRITICAL PATTERN: `let cx`/`cy` declarations must appear BEFORE all milestone building blocks. As of 2026-03-18 they are declared AFTER (BUG-017) causing ReferenceError at levels 5/10/15/20. After any future edit to expandIsland(), verify variable declarations are before all usage.

## 5. Island Particle Arrays (islands.js)
Vulcan `ambientAsh`, Hyperborea `snowflakes`, Necropolis `wisps` are filtered each frame only when the island is `active`. If update logic ever changes to always-run, particles accumulate unbounded.

## 6. `_combatLastEnemyCount` in combat.js
Global var tracking enemy count for XP. `exitConquest()` zeroing `enemies = []` triggers XP grant for all live enemies — systematic XP exploit via fast exit.

## 7. Chapter X Heart Threshold
`rite_mare_nostrum` fires at hearts >= 8 (sketch.js) but `all_hearts_max` objective checks >= 10 (narrative.js:121). These must stay in sync. Currently they are mismatched (BUG-018).

## 8. Quarrier unlock double-notification on legacy saves
If `quarrierUnlocked` is absent from save (pre-quarrier save), loadGame defaults to `false`. Next `updateQuarrier` call at level 5+ will re-show "Quarrier joined!" notification. This is a cosmetic annoyance. Migration path: if `d.quarrierUnlocked === undefined && d.islandLevel >= 5` then set `q.unlocked = true` silently.

## 9. Distant island rendering — "Distant" functions pattern
Pattern established in audit pass 4: horizon-clamped distant rendering functions exist as `drawArenaIsleDistant()` and `drawConquestIsleDistant()`. When adding new island rendering, ALWAYS check that the new distant-rendering function is actually wired into the draw loop. BUG-024 and BUG-025 are examples of functions created but never called.

## 10. Island state field naming consistency
Hyperborea: state field is `frostNodes` but save/load used `iceNodes` (BUG-026). When saving island loot, cross-reference the field name against `initState()`. Do not invent names — copy from the object literal.

## 11. Island interact handler location (as of 2026-03-19 visual redesign)
`handleVulcanInteract`, `handleHyperboreInteract`, `handlePlentyInteract`, `handleNecropolisInteract` were moved from sketch.js to islands.js (+276 lines). Call sites remain in sketch.js keyPressed at lines 18517/18521/18525/18529. If any future modularization moves these again, ensure both the function definitions AND the call sites are updated together.

## 12. `shakeTimer` global used in islands.js
islands.js uses the `shakeTimer` global (declared at sketch.js:186). This is safe as long as islands.js is loaded after sketch.js. Do not rename or localize this variable.

## 13. Ambient citizens — save/load pattern (Sprint 4)
`state.citizens` IS initialized in initState() (line 979), saved (line 22506) with `|| []` guard, and loaded (line 22970) with fallback to `initCitizens()`. Pattern is correct. However `updateCitizens()` is not frame-rate independent — see BUG-031.

## 14. Random event save/load pattern (Sprint 4)
`state.activeEvent`, `state.eventCooldown`, `state.eventHistory` are ALL saved (lines 22585–22587) and loaded (lines 22781–22783). Pattern is correct. The correct search terms in future audits are `checkRandomEvent`, `updateActiveEvent`, `drawEventBanner` — NOT `state.events`.

## 15. `spawnKillBurst` cross-file guard (Sprint 4)
`spawnKillBurst` is defined in combat.js:806 and called from sketch.js:15374 with a `typeof spawnKillBurst === 'function'` guard. This pattern is safe — if combat.js is ever removed or the function renamed, the call silently no-ops instead of crashing. Maintain this guard.

## 16. `_arenaProjectiles` cross-file access (Sprint 4)
`_arenaProjectiles` is declared as `var` in combat.js:824 (making it a global). Accessed from sketch.js:14930 and 15190 with `typeof` guards. Pattern is correct. Never convert to `let` or `const` without updating call sites.

## 17. Era palette cache per-frame (Sprint 4)
`getEraPalette()` caches by `frameCount`. Called 3 times per frame from sketch.js (lines 7152, 7268, 8647). Cache is correct — no redundant computation. Do not add a 4th call site without confirming the frame cache is still sufficient.

## 18. Coastline cache invalidation (Sprint 4)
`getCoastlineVerts()` caches by `islandRX/islandRY`. Cache is invalidated whenever the island grows (expandIsland increments these). Noise seed is hardcoded to 42 — coastline shape is deterministic but does NOT vary between saves or restarts. This is by design. The 128-vertex cache rebuilds only on island level-up. No bug, but note: if WORLD.islandRX is ever changed (e.g., for a new game type), the cache will correctly regenerate.

## 19. Screenshot mode globals (Sprint 4)
`screenshotMode` and `screenshotFilter` are declared as globals at sketch.js:80–81. Both are NOT saved to localStorage — intentional (screenshot mode should not persist across sessions). `drawVignette`, `drawScreenshotFilter`, `drawScreenshotIndicator` are called at end of both temple interior path (line 1597–1599) and main game path (lines 2142–2144). Pattern is complete and correct.
