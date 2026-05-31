# Mare Nostrum — Audit Report

**Generated:** 2026-04-24
**Canonical folder:** `~/Desktop/_CODE/mare-nostrum/`
**Branch / HEAD:** `lod-world @ 1094655`
**Local server:** `http://localhost:8888/` (PID 52868, fresh from CONSOLIDATE)
**Autosync daemon:** killed and unloaded

> Phase 2 (static) was partially scoped — the subagent could not reach the user's real filesystem from its sandbox. The static audit will be completed by running `AUDIT_TREE.command` on the user's Mac. This report's §3-§5 (dead code, collisions, file inventory) are placeholders until that report lands and gets merged.
>
> Phase 3 (runtime) was executed directly against the live browser via Chrome MCP. Findings below are primary-source: what actually happens when the game runs, not what the code claims.

---

## §1 Executive Summary

**The game's biggest problem is not bugs. It's scope.**

The codebase claims to be "Mare Nostrum — Roman Mediterranean Strategy" but the live runtime exposes functions for:

- Strategy layer (8 factions, islands, territories, combat, diplomacy)
- Life-sim layer (fishing, farming, seasonal crops, market days)
- Player-avatar layer (walking on islands, bridges, piers, shallows)
- Ship-interior layer (on-deck, below-deck, ship-surface navigation)
- Wreck-diving layer (isOnWreck, Grover quantum chest pick)
- Swarm mode (`isSwarmActive`, `drawSwarmMode`, `drawSwarmHUD`, `drawSwarmPanels`) — **no visible UI entry**
- Cinematics (pre-repair, sailing, home sunrise, intro, narrative dialogue)
- Quantum/oracle features (QRNG, Grover hunt)
- Time-of-day (golden hour, moon phases)
- Lore tablets, codex entries, quest tracker

**This is a life-sim with a strategy layer bolted on, not a strategy game.** If the stated alpha goal is "Mare Nostrum — Roman Mediterranean Strategy," ~60% of the runtime surface area is out-of-scope features that should be deferred or cut.

**Top 5 alpha-blockers (P0):**

1. **CONQUEST button click doesn't enter conquest.** Title-screen handler mis-dispatches — clicking CONQUEST expands the menu instead of starting a game. Smoke-test confirmed. Every downstream test is gated behind this.
2. **`selectFaction('rome')` ran without throwing, but world state (`islands`, `nations`, `player`, `myFaction`) stayed `undefined`.** So even when the player picks a faction, the world doesn't initialize. `_lobbyStartGame()` also doesn't populate these. Either there's a different entry point we haven't found, or the init path is half-wired.
3. **3 of 4 title-screen buttons have no handler.** `startMultiplayer`, `openSettings`, `openCredits` are `undefined`. MULTIPLAYER, SETTINGS, CREDITS are dead UI.
4. **Faction-select screen is visible but visually unfinished.** Icons render at thumbnail size, text is nearly invisible against the dark backdrop, difficulty picker sits on top of faction cards. Not shippable as-is.
5. **No scene / state machine.** Game state is tracked by a scatter of `is*` flags (`isSwarmActive`, `isInvasionBattleActive`, `_isExplorationActive`, `isSeaEventActive`, etc.) instead of a single `state` variable. This is the root cause of #1 and #2 — handlers have no single source of truth about what screen the player is on.

**Top 5 "just cut it" candidates:**

1. **Swarm mode** (`isSwarmActive`, `drawSwarmMode`, `drawSwarmHUD`, `drawAgentActivity`, `spawnFactionAgents`, `addSwarmScreenNotification`, `getSwarmFactionEvents`, `_logSwarmFactionEvent`). No visible menu entry. No clear purpose in a strategy game. Estimated 500+ LOC of runtime surface.
2. **Farming system** (`isInFarmZone`, `isSeasonalCrop`, `isNewCrop`, `drawFarmZoneBG`, `drawFarmPlots`, `drawOnePlot`). Belongs in a life-sim. Unclear why a Roman strategy game needs farming plots.
3. **Fishing + tidal HUD** (`drawFishing`, `drawTidalHUD`, `isInShallows`). Same reasoning.
4. **Ship-interior navigation** (`isOnShipDeck`, `isBelowDeck`, `isOnShipSurface`). Flavor feature that doesn't affect strategy outcomes. Cut or defer to v0.2.
5. **Intro cinematic + home sunrise cinematic** (`drawIntroCinematic`, `drawHomeSunriseCinematic`). Nice-to-have. Defer until the actual game works.

**Go / no-go read:** Alpha is **not 2 weeks away**. It's 4-6 weeks of focused cutting + fixing away, conditional on aggressive scope reduction. Without cuts: 2-3 months minimum.

---

## §2 Phase 3 Runtime Feature Matrix

| Feature | Verdict | Severity | Evidence |
|---|---|---|---|
| Page loads, canvas renders | **WORKS** | — | 2056×1150 canvas, title art + menu render in ≤3s |
| No game-code console errors | **WORKS** | — | Only chrome-extension `inpage.js` noise |
| All patches load with flags set | **WORKS** | — | 7 `__*_PATCHED__` window flags confirmed (safe_init, patch_health, faction_army_banners, faction_ship_flags, grover_hunt, quantum_rng, quest_tracker_fix) |
| Title screen art | **WORKS** | — | Full pixel-art scene renders; `MARE NOSTRUM` title visible |
| Subtitle says "Cozy Roman Survival" under strategy title | **PARTIAL** | P1 | Mismatch with og:title `Roman Mediterranean Strategy` — two identities fighting |
| Title → CONQUEST click | **BROKEN** | **P0** | Click registers (menu grows CREDITS + INSTALL APP), but doesn't start a game. Hitbox/dispatch mismatch. `cycle4_fixes.js` was supposed to cover this. |
| Title → MULTIPLAYER click | **DEAD** | P1 cut | `window.startMultiplayer` = undefined. No handler. |
| Title → SETTINGS click | **DEAD** | P0 | `window.openSettings` = undefined. Volume / keybinds / difficulty live here — can't ship alpha without. |
| Title → CREDITS click | **DEAD** | P2 | `window.openCredits` = undefined. Nice-to-have. |
| Title → INSTALL APP button | **UNKNOWN** | P2 | Didn't test; likely PWA leftover. |
| `startConquestGame()` direct call | **PARTIAL** | P0 | Advances to "CHOOSE YOUR ALLEGIANCE" screen but doesn't populate world. |
| Faction select screen renders | **PARTIAL** | P0 | Title + subtitle + EASY/NORMAL/HARD + 8 faction cards visible, but cards are tiny, text is near-invisible, difficulty picker overlaps card area |
| `selectFaction('rome')` direct call | **BROKEN** | P0 | Ran without error; `myFaction` / `playerFaction` / `chosenFaction` all remain null. No state change. |
| `_lobbyStartGame()` direct call | **BROKEN** | P0 | Ran without error; `islands` / `nations` / `player` / `cities` all remain undefined. World never initializes. |
| World map rendering | **UNKNOWN** | — | Can't reach it — gated behind broken faction pick + start |
| Combat flow | **UNKNOWN** | — | Gated behind world init |
| Diplomacy panel | **UNKNOWN** | — | Gated behind world init |
| Save / load | **UNKNOWN** | — | `saveGame` / `loadGame` exist, but nothing to save yet |
| Audio (title music, SFX) | **NOT TESTED** | P1 | Deferred |
| Performance (FPS) | **NOT TESTED** | P2 | Deferred |

---

## §3 Scope Gridlock (the real finding)

The codebase is carrying at least four gameplay loops simultaneously, with no clear director:

| Loop | Scope | Symptoms in runtime |
|---|---|---|
| **Strategy game** | 8 factions, islands, territories, combat, diplomacy | Most functions present, world init broken |
| **Cozy Roman life-sim** | Fishing, farming, seasons, market days, player walking on islands | Still wired (`isInFarmZone`, `drawFarmPlots`, `isMarketDay`) |
| **Ship exploration** | On-deck, below-deck, ship surface | `isOnShipDeck`, `isBelowDeck`, `isOnShipSurface` all active |
| **Swarm mode** | Unknown — has its own HUD, panels, notifications, event log | `isSwarmActive=true` by default on fresh load (!) |

"Swarm mode is active by default" means the game boots into a state that shouldn't exist in a strategy game at all. Until we decide what Swarm is and either cut it or make it an explicit mode the player enters on purpose, the strategy experience is contaminated.

**Recommendation:** Pick ONE primary loop for v0.1.0-alpha. Gate the others behind a feature flag (`?experimental=1` or similar), delete what isn't in the alpha loop after 30 days of no regret.

---

## §4 File Inventory & Static Code Findings

**_Awaiting `AUDIT_TREE.command` output._**

When user runs it and pastes `~/Desktop/AUDIT_STATIC/SUMMARY.md` back, the static audit fills in here. Expected to produce:

- Total .js files and LOC
- Top 15 fattest files
- `window.*` export map + collision detection
- Orphan .js files (on disk but never loaded by `index.html`)
- Dead symbols (declared but never called anywhere)
- TODO / FIXME / HACK / XXX / @deprecated sweep

---

## §5 Patch Bundle Findings (from Phase 2 subagent)

Audited in full (the 8-patch overlay bundle is reachable from the sandbox):

### Collisions
- `window._factionTintRGB` — 3 assignments (faction_ship_flags canonical, faction_army_banners `||` fallback, patch_health instrumentation wrapper). Working as designed.
- `window._drawFactionPennant` — same pattern, same verdict.
- `window.draw` — wrapped by both `safe_init.js` (crash shield) and `quest_tracker_fix.js`. **Latent risk:** wrap order makes `quest_tracker_fix` outermost, so throws inside its wrapper escape `safe_init`'s try/catch. Low likelihood (wrapper body is 4 lines) but real.
- `window.text` — `quest_tracker_fix` overrides p5's global `text()`. Gated by an `ACTIVE` flag that only flips during quest rendering. Sharpest edge in the bundle.

### Should-be-folded-into-core
1. **`safe_init.js` (8 KB, 211 LOC)** is structural, not a feature. Its `SUBSYSTEMS` list drifts from the real subsystem roster every time a new subsystem gets added — which is why `patch_health.js` exists. Fix: fold the `_wrapIfExists` body into a core `__mnTry(name, fn)` helper, have each subsystem call that directly.
2. **`quest_tracker_fix.js`'s `window.text` shim (4.5 KB half, ~60 LOC)** — replaces a p5 global. Correct fix is a 10-line change inside `drawQuests` using `textWrap(WORD)` + `textLeading()` + bounded `text(str, x, y, w, h)`.

### Should be gated
3. **`bugtest.js` (9.4 KB, 244 LOC)** is a test harness that ships in prod. Gate behind `?debug=1` — 9 KB off every page load.

### Zero TODO/FIXME/HACK markers in the reachable bundle
Clean code. The entropy is in the main tree, not the patches.

---

## §6 Recommended Cut List (so far)

| Cut | Rationale | Rough savings |
|---|---|---|
| Swarm mode | No menu entry, unclear purpose, active by default | ~500 LOC + cognitive load |
| Farming system | Life-sim feature in a strategy game | unknown — needs static audit |
| Fishing + tidal HUD | Life-sim feature | unknown |
| Ship-interior navigation | Flavor that doesn't affect strategy outcomes | unknown |
| Intro cinematic + home sunrise cinematic | Polish, not MVP | unknown |
| MULTIPLAYER button | No handler, no code | Remove button from menu |
| CREDITS button | No handler, defer to v0.2 | Remove button |
| INSTALL APP button | PWA leftover? | Remove if not used |
| `WIRE_PATCHES.command` + `_v2.command` in `outputs/` | Superseded by `_v3` | 6 KB |
| `patches/` overlay folder (fold into core) | Overlays masking core bugs | ~1400 LOC from runtime |

---

## §7 Fix Queue (for the next working session)

Ranked by blocking-power for alpha. Do not work on #5 before #1-4.

1. **Fix P0: CONQUEST click dispatch**
   - File(s): `input.js` (mousePressed / handleMenuClick), `ui.js` (menu render), `cycle4_fixes.js` (hitbox patch)
   - Problem: click registers but dispatches to wrong handler; menu expands instead of starting game.
   - Fix: read `handleMenuClick`, inspect button rects vs hit-test rects, fix the mismatch. Probably a y-offset issue from the expanded menu.
   - Effort: **S** (< 30 min)
   - Unlocks: ability to runtime-test the entire conquest flow

2. **Fix P0: `selectFaction` + `_lobbyStartGame` don't init world**
   - File(s): wherever `selectFaction` is declared (grep the static audit's `_decls.tsv`)
   - Problem: these entry points don't populate `islands` / `nations` / `player` / `myFaction`.
   - Fix: trace what they DO set, figure out what init function they're missing, wire it.
   - Effort: **M** (< 2h)
   - Unlocks: actually being able to play

3. **Fix P0: introduce a single `state` / `scene` variable**
   - Files: scattered — wherever any `is*` flag is read
   - Problem: game tracks state through ~40 boolean flags. Guarantees inconsistency.
   - Fix: define `window.scene = 'title' | 'factionSelect' | 'world' | 'combat' | ...`, gate existing handlers on `scene === 'X'`, deprecate the `is*` flags over time (don't delete yet — too much code reads them).
   - Effort: **L** (< 1 day)
   - Unlocks: every future bug-fix gets 10× easier

4. **Wire or remove MULTIPLAYER / SETTINGS / CREDITS**
   - File(s): `ui.js` title menu render, dispatcher
   - Problem: 3 of 4 buttons have no handler.
   - Fix: at minimum, remove MULTIPLAYER + CREDITS from the menu entirely; implement SETTINGS (volume, keybinds, difficulty) with ~4 controls.
   - Effort: **M** for SETTINGS, **S** to remove the other two
   - Unlocks: shippable main menu

5. **Fold `patches/` back into core files**
   - File(s): all 8 patches → their real targets
   - Problem: overlays mask core bugs and make the load order fragile.
   - Fix: per-patch merge as described in §5.
   - Effort: **L** (< 1 day)
   - Unlocks: clean git branch, easier debugging

6. **Decide Swarm mode's fate**
   - Either wire it to a menu entry with an explicit mode switch, or delete the whole subsystem.
   - Effort: **S** (decision) + **M** (deletion) or **L** (wire-up)
   - Unlocks: coherent game identity

7. **Cut or defer life-sim features** (farming, fishing, tidal, ship-interior)
   - Same pattern — decide per-feature: ship in alpha, defer to v0.2, or delete.
   - Effort: **L** across all of them

---

## §8 Alpha Gate Readiness (per MASTERPROMPT §6)

| Requirement | Status | Blocker(s) |
|---|---|---|
| Player can start a new game | **GAP** | Fix #1, #2 |
| Player can play 10 min without a crash | **UNKNOWN** | Can't test until start works |
| Save + load end-to-end | **UNKNOWN** | Same |
| World map with N islands | **UNKNOWN** | Same |
| At least one meaningful decision per turn | **UNKNOWN** | Same |
| One victory condition + one loss | **UNKNOWN** | Same |
| Title music + one SFX | **NOT TESTED** | — |
| Title screen doesn't embarrass us | **MET** | — |
| Menus clickable where they appear | **GAP** | Fix #1 |
| No placeholder text visible | **UNKNOWN** | Needs static audit TODO sweep |
| README with screenshot + pitch + URL | **NOT CHECKED** | — |
| itch.io page draft | **NOT STARTED** | — |
| Version tagged `0.1.0-alpha` | **NOT DONE** | — |

**Net read:** Zero alpha-gate items are green end-to-end. Title-screen rendering is the only unambiguous win. To ship alpha, fixes #1-#3 are non-negotiable; #4 is non-negotiable; decisions on Swarm + life-sim cuts determine whether the remaining work is 4 weeks or 12.

---

## §9 What To Do Right Now

1. **Run `AUDIT_TREE.command`** to complete the static audit — paste `SUMMARY.md` back, I merge it into §4.
2. **Fix #1 from the queue** (CONQUEST click) — smallest unblocker, opens runtime testing for everything downstream.
3. **Then #2** (world init) — once that's green, re-run Phase 3 to produce a real feature matrix for world map / combat / diplomacy.
4. **Then a scope-cut decision meeting with yourself** — pick the alpha loop, commit to cuts in writing in `ALPHA_SCOPE.md`.

Don't start on new features. Don't refactor cosmetics. Fix the starting path, cut the sprawl, ship.
