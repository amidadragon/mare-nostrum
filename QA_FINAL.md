# Mare Nostrum — Final QA Audit
Date: 2026-03-19

---

## 1. npm run check (12 files)

**PASS** — All 12 files pass `node -c` syntax check:
sketch.js, wreck.js, sound.js, combat.js, diving.js, economy.js,
islands.js, narrative.js, engine.js, debug.js, cinematics.js, menu.js

---

## 2. Regression Checks

### snd.updateLyre() called only once
**PASS** — Single call at sketch.js:1380, outside all conditionals, top of drawInner().
No duplicate call in any other file.

### || [] guards on island arrays in saveGame
**PASS** — All 5 island array groups are guarded:
- state.vulcan.obsidianNodes || [] (line 19417, 19420)
- state.vulcan.hotSprings || [] (line 19418)
- state.vulcan.lavaPools || [] (line 19419)
- state.vulcan.smokeVents || [] (line 19421)
- state.hyperborea.frozenRuins || [] (line 19424-19425)
- state.hyperborea.frostNodes || [] (line 19426)
- state.plenty.spiceNodes || [] (line 19429-19430)
- state.plenty.fruitTrees || [] (line 19431)
- state.necropolis.tombs || [] (line 19434-19435)
- state.necropolis.soulNodes || [] (line 19436-19437)
- state.necropolis.ghostNPCs || [] (line 19438-19439)

NOTE: Save key is `iceNodes` but state field is `frostNodes` (Hyperborea, line 19426 vs 19600).
Round-trip is self-consistent — save writes `iceNodes`, load reads `iceNodes` to populate `frostNodes`.
Not a crash, but the naming mismatch remains (documented as known issue in fragile_systems.md).

### Distant islands use horizon-clamped functions
**PASS** — Both functions verified:
- drawArenaIsleDistant() (line 13028): pins to `horizonY = max(height*0.06, height*0.25-horizonOffset) + 5`
- drawConquestIsleDistant() (line 15793): clamps with `sy = max(sy, _horizY)` where `_horizY` uses same formula
Both are wired into the draw loop (lines 1716, 1719).

### Cook and fisherman in save/load
**PASS** — Both saved and loaded:
- saveGame: cook (line 19408), fisherman (line 19409)
- loadGame: cook (line 19546), fisherman (line 19547)
Both use null guard in save (`? { ... } : null`) and `if (d.cook)` / `if (d.fisherman)` in load.

### Port positions derived (not saved)
**PASS** — No portLeft/portRight in saveData. `updatePortPositions()` called in loadGame at line 19578 before port-dependent load code. Correctly derived from island size.

---

## 3. New NPC Checks

### state.cook initialized in initState()
**PASS** — Lines 442-448:
```
cook: {
  x: WORLD.islandCX - 100, y: WORLD.islandCY + 40,
  vx: 0, vy: 0, speed: 1.2,
  task: 'idle', timer: 0, cookTimer: 0,
  unlocked: false,
}
```

### state.fisherman initialized in initState()
**PASS** — Lines 450-457:
```
fisherman: {
  x: 0, y: 0,
  boatX: 0, boatY: 0,
  timer: 0, catchTimer: 0,
  unlocked: false,
  fishCaught: 0,
}
```

### Both updated and drawn
**PASS** — updateCook(dt) at line 1652, updateFisherman(dt) at line 1653.
Both inside the "normal island" else-branch (not called during conquest or adventure).
drawCook() wired into Y-sorted draw list at line 6629-6630.
drawFisherman() wired into Y-sorted draw list at line 6631-6632.
Both draw functions guard on `unlocked` flag.

---

## 4. Undefined Variable / Logic Error Scan

### drawOneTree handles all 3 types
**PASS** — Branches at lines 11959, 12006, 12056:
- `t.type === 'oak'` — Mediterranean Cypress silhouette
- `t.type === 'olive'` — Gnarled olive with silver-green canopy
- `t.type === 'pine'` — Umbrella stone pine (Pinus pinea)
No else-fallthrough that would silently skip rendering.

### expandIsland() variable scoping (BUG-017)
**PASS** — `let cx = WORLD.islandCX, cy = WORLD.islandCY` declared at line 21340,
BEFORE all milestone building blocks at lines 21341-21390+.
BUG-017 is fixed.

### xpBoost / xpBoostTimer saved (BUG-029)
**PASS** — Both saved (line 19355) and loaded (lines 19666-19667).

---

## 5. ESC Key Chain

**FAIL** — Two separate ESC handler blocks exist and the second is unreachable:

**First block** (line 18169-18180) handles:
- dialogState.active
- expeditionModifierSelect
- upgradeShopOpen
- nightMarket.shopOpen
- ship.shopOpen
- tradeRouteUI
Falls through to `saveGame(); gameScreen = 'menu'; return;`

**Second block** (line 18707-18712) handles:
- empireDashOpen
- inventoryOpen
- skillTreeOpen
This block is UNREACHABLE because the first ESC block always returns before code reaches line 18707.

**Result**: Pressing ESC while empireDashOpen, inventoryOpen, or skillTreeOpen are active
causes an unintended save + return to main menu instead of closing the overlay.

**Also missing from ESC chain**: `state.buildMode` (home island build mode).
ESC while building sends player to menu with `state.buildMode = true` still set.
On resume, the player returns mid-build-mode with no indication. `state.demolishMode`
is never reset either. `B` key is the intended close for build mode but ESC should at
minimum close it rather than going to menu.

```
BUG: ESC closes game instead of Empire Dashboard / Inventory / Skill Tree
Severity: High
Repro Steps:
1. Start a game
2. Press TAB to open Empire Dashboard
3. Press ESC
Expected: Empire Dashboard closes
Actual: Game saves and returns to main menu
Location: sketch.js:18169-18180 (missing empireDashOpen/inventoryOpen/skillTreeOpen checks)
Suggested Fix: Add to first ESC block before the saveGame() call:
  if (empireDashOpen) { empireDashOpen = false; return; }
  if (inventoryOpen) { inventoryOpen = false; return; }
  if (typeof skillTreeOpen !== 'undefined' && skillTreeOpen) { skillTreeOpen = false; return; }
  if (state.buildMode) { state.buildMode = false; state.demolishMode = false; return; }
Then remove or consolidate the dead second block at line 18707.
```

---

## 6. Known Outstanding Issues (not regressions, pre-existing)

- **BUG-018**: Chapter X rite_mare_nostrum fires at hearts >= 8 but chapter needs >= 10.
  `all_hearts_max` objective in narrative.js:121 checks >= 10; sketch.js rite check is >= 8.
  Chapter X cannot complete.

- **BUG-026** (cosmetic): Save key `iceNodes` vs state field `frostNodes` in Hyperborea.
  Round-trip is consistent but naming is misleading for future maintainers.

- **Fragile**: Daily island refresh at lines 2070-2082 calls .forEach without || [] guards.
  Safe because initState() sets arrays to [], but a corrupt load that sets phase != 'unexplored'
  without restoring the arrays would crash. Low probability but worth hardening.

---

## Summary

| Check | Result |
|---|---|
| npm run check (12 files) | PASS |
| snd.updateLyre() called once | PASS |
| \|\| [] guards on island arrays | PASS |
| Distant islands horizon-clamped | PASS |
| Cook in save/load | PASS |
| Fisherman in save/load | PASS |
| Port positions derived (not saved) | PASS |
| state.cook in initState() | PASS |
| state.fisherman in initState() | PASS |
| Cook updated and drawn | PASS |
| Fisherman updated and drawn | PASS |
| drawOneTree handles oak/olive/pine | PASS |
| expandIsland() cx/cy scoping (BUG-017) | PASS |
| ESC key chain closes overlays before menu | **FAIL** |
