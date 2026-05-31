# Mare Nostrum — Alpha Scope (v0.1.0-alpha)

**Last updated:** 2026-04-24
**Owner:** Amidevs
**Target ship:** 6 weeks from start of focused work
**Companion docs:** `MASTERPROMPT.md`, `AUDIT_REPORT.md`

---

## 1. Game Identity

**Mare Nostrum is a turn-based Roman Mediterranean strategy game with an optional cozy peace phase where you rebuild between wars.**

The full long-term vision is a two-phase loop: war phases for tension, peace
phases for calm and rebuilding. **v0.1.0-alpha ships only the war phase.**
The peace-phase code stays alive in the repo but is gated — invisible to
players on alpha launch day.

This is not a compromise. It's how we actually ship. Ambitious vision,
conservative launch.

---

## 2. The Three Buckets

Every feature in the runtime falls into one of three buckets:

| Bucket | Meaning | v0.1.0 treatment |
|---|---|---|
| **IN** | Must work for alpha to ship | Fix, polish, ship |
| **GATED** | Real feature, but peace-phase — not in v0.1 | Code stays, disabled behind `?phase=peace` |
| **CUT** | Confused or broken or nobody needs it | Deleted from the tree |

---

## 3. IN — must work for alpha

### 3.1 Title screen
- [ ] Canvas renders title art + MARE NOSTRUM title (currently works)
- [ ] Subtitle resolved — either "Roman Mediterranean Strategy" or "A Roman Strategy Game". No "Cozy Roman Survival" conflict.
- [ ] CONQUEST button starts a new game (P0 fix — audit #1)
- [ ] SETTINGS button opens a panel with volume, difficulty, keybinds
- [ ] Optional: CREDITS button opens a one-screen credits roll
- [ ] **Cut from menu:** MULTIPLAYER, INSTALL APP

### 3.2 Faction select
- [ ] CHOOSE YOUR ALLEGIANCE screen renders
- [ ] 8 faction cards at readable size with visible name + emblem + 1-line flavor
- [ ] Difficulty picker (EASY / NORMAL / HARD) doesn't overlap faction cards
- [ ] Clicking a faction + START actually initializes `islands`, `nations`, `player`, `myFaction` (P0 fix — audit #2)
- [ ] Back button returns to title

### 3.3 World map
- [ ] All 27 Mediterranean islands render
- [ ] Camera can pan and zoom (keyboard + mouse wheel)
- [ ] Island hover shows tooltip: name, owner, military, economy
- [ ] Island click opens a selection panel

### 3.4 Armies
- [ ] Recruit units at an owned island (L key + legion button both work)
- [ ] Move armies between owned islands
- [ ] Engage armies (attack an enemy island)
- [ ] Army combat resolves with a visible result (winner, losses, occupier change)

### 3.5 Ships
- [ ] Build a ship at a coastal island
- [ ] Dispatch a ship to another island
- [ ] Naval combat resolves

### 3.6 Diplomacy
- [ ] Open diplomacy panel
- [ ] Propose alliance / declare war / offer trade
- [ ] AI accepts or rejects based on relationship state
- [ ] War/peace state persists across turns

### 3.7 Turn / time
- [ ] End turn button progresses the world
- [ ] All 7 AI factions take a visible turn action per cycle
- [ ] At least one meaningful player decision per turn (recruit / move / diplomacy)

### 3.8 Victory / defeat
- [ ] One victory condition reachable (domination, or last-standing, or wonder)
- [ ] One loss condition (your capital falls)
- [ ] End-game screen shows outcome

### 3.9 Save / load
- [ ] Manual save slot
- [ ] Auto-save on turn end
- [ ] Load returns to exact state (faction, turn, islands, armies, diplomacy)

### 3.10 Audio (minimum)
- [ ] Title music plays, loops cleanly
- [ ] One SFX on primary action (click / end-turn / combat)
- [ ] Volume slider in settings actually attenuates

### 3.11 Polish floor
- [ ] No visible TODO / FIXME / Lorem ipsum / placeholder text
- [ ] Menus clickable where they appear (hitboxes match visuals)
- [ ] Title screen frame rate ≥ 30 fps
- [ ] World map frame rate ≥ 30 fps with all 27 islands

### 3.12 Ship prep
- [ ] `README.md` with screenshot, one-line pitch, play URL
- [ ] itch.io page draft written (name, description, tags, price)
- [ ] `package.json` / HTML meta bumped to version `0.1.0-alpha`
- [ ] Git tagged `v0.1.0-alpha`

---

## 4. GATED — alive, invisible, opt-in only

All of the following keep their code, stay loaded, but are gated behind a URL
flag so they can't accidentally activate in alpha:

```javascript
// Top of sketch.js or equivalent
const PEACE_PHASE_ENABLED = new URLSearchParams(location.search).get('phase') === 'peace';
// ... every peace-phase handler begins with: if (!PEACE_PHASE_ENABLED) return;
```

Gated systems (`?phase=peace` to enable):

- **Farming** — `drawFarmPlots`, `drawFarmZoneBG`, `drawOnePlot`, `isInFarmZone`, `isSeasonalCrop`, `isNewCrop`
- **Fishing + tidal** — `drawFishing`, `drawTidalHUD`, `isInShallows`
- **Ship interior** — `isOnShipDeck`, `isBelowDeck`, `isOnShipSurface`, below-deck walking
- **Player avatar exploration** — `isWalkable`, `isOnBridge`, `isOnPier`, `isOnIsland`, `isOnImperialBridge`, `isOnAnyIslandSurface` and all downstream walking/interact code
- **Market days + trade** — `isMarketDay`, `isGoodInDemand`, `isPriceAboveBase`, `getCurrentDemandGoods`
- **Cinematics** — `drawIntroCinematic`, `drawPreRepairCutscene`, `drawSailingCutscene`, `drawHomeSunriseCinematic`, `skipCutscene`
- **Lore / narrative** — `drawLoreTablets`, `drawLoreTabletPopup`, `drawNarrativeDialogue`, `initNarrativeState`, `shouldTriggerFelixLiviaScene`, Felix/Livia system
- **Time-of-day + moon** — `isGoldenHour`, `drawMoonPhased`
- **Wreck diving + quantum** — `isOnWreck`, `diveWreck`, Grover hunt, QRNG oracle (flavor for peace phase, not alpha)
- **Quest tracker** — `drawQuestTracker` stays IN for war-quest notifications; its peace-quest content is dormant but the shell ships

**Rule:** if a GATED system has a visible side effect on alpha load (e.g. `drawFarmPlots` fires during `draw()`), that's a bug. Every gated handler must early-return when the flag is off.

---

## 5. CUT — gone from the tree

Delete these. Recover from `_ARCHIVE/` or git history if we change our minds.

| Cut | Reason | Rough LOC |
|---|---|---|
| **Swarm mode** (`isSwarmActive`, `drawSwarmMode`, `drawSwarmHUD`, `drawSwarmPanels`, `drawAgentActivity`, `spawnFactionAgents`, `initSwarmMode`, `addSwarmScreenNotification`, `_logSwarmFactionEvent`, `getSwarmFactionEvents`, entire swarm subsystem) | No menu entry, active by default, nobody remembers what it's for | ~500+ |
| **MULTIPLAYER menu button** | Handler doesn't exist; post-alpha feature | ~5 |
| **INSTALL APP menu button** | PWA leftover; cut unless explicitly wanted | ~10 |
| **`patches/` folder as a concept** | Fold each file into its target; overlays mask core bugs | save ~1400 LOC of indirection |
| **Misc scripts in `outputs/`** | `WIRE_PATCHES.command`, `_v2.command` superseded by `_v3` | ~6 KB |

---

## 6. Scaffolding (must land before IN work can start)

These are the architectural pieces required to make the three buckets real:

### 6.1 Scene machine (v0.1 prerequisite)
Define one variable:
```javascript
window.scene = 'title' | 'factionSelect' | 'world' | 'combat' | 'diplomacy' | 'victory' | 'defeat';
```
Every draw and handler routes on `scene === 'X'`. The ~40 scattered `is*`
flags get deprecated over time — don't delete them yet, too many call sites.

### 6.2 Phase gate
One line at the top of every peace-phase handler:
```javascript
if (!PEACE_PHASE_ENABLED) return;
```
Start of every `draw*` and `update*` that's in the GATED list.

### 6.3 Single lobby → world init path
Exactly ONE function initializes a new game:
```javascript
startNewGame(factionId, difficulty)  // populates islands, nations, player, myFaction
```
`selectFaction` and `_lobbyStartGame` either both call this or both get deleted.

### 6.4 Folding `patches/` back into core
Per-patch merge as described in the audit:
- `safe_init.js` → `__mnTry` helper inside each subsystem
- `quest_tracker_fix.js`'s `window.text` shim → inline inside `drawQuests` with `textWrap/textLeading/bounded text()`
- `bugtest.js` → gated by `?debug=1`
- Everything else → rename to non-patch filenames, drop into their domain folders (`ui/`, `combat/`, etc.)
- Delete `patches/` directory
- Delete `hotfix_missing_fns.js` (its whole job was crash-prevention during dev — no longer needed once real functions exist)

---

## 7. Timeline (6 weeks, aggressive)

| Week | Work | Exit criteria |
|---|---|---|
| **1** | Scaffolding (§6.1, §6.2, §6.3, §6.4), cut Swarm mode | `scene` variable gates all render code; alpha load shows zero peace-phase draws; patches folder deleted |
| **2** | Fix audit P0s #1-4 (CONQUEST click, world init, 3 dead buttons) | Click CONQUEST → faction select → pick Rome → land on world map with 27 islands rendered |
| **3** | Army + ship flows (§3.4, §3.5) | Can recruit, move, attack, build ship, sail, naval combat resolves |
| **4** | Diplomacy, turn cycle, victory/defeat (§3.6, §3.7, §3.8) | Playable end-to-end in ≤30 min, reachable win + loss |
| **5** | Save/load (§3.9), audio (§3.10), settings panel | Save mid-game, reload, same state. Volume slider works. |
| **6** | Bug bash, README, itch.io page, tag `v0.1.0-alpha` | Shippable. |

**Buffer:** none. If something slips, cut a 3.x item rather than slip the date.

---

## 8. Rules for the Alpha Run

1. **No new features beyond §3.** Anything else is v0.2.
2. **Peace-phase code stays gated, not enabled.** No "just one test with phase=peace on by default."
3. **Every commit links to an item in this doc.** If a change doesn't unlock an IN item or fix a P0, revisit.
4. **No cosmetic refactors.** Polish comes in week 6.
5. **Weekly screenshot diary.** Every Friday, capture the game state, archive it. Visible progress is how you stay motivated.
6. **If stuck > 2 days on one item, cut it.** Shipping with a reduced alpha is better than not shipping.

---

## 9. What's in v0.2 (so you can say no to them)

Write down the bright-line list of what v0.2 WILL cover, so every "ooh I should add X" thought this alpha cycle can be answered with "that's v0.2":

- Peace phase enabled by default (no URL flag)
- War ↔ peace phase transitions (senate scene, treaty ceremony)
- Farming, fishing, tidal HUD fully playable
- Walking on islands (player avatar, bridges, piers)
- Ship interior exploration
- Felix/Livia narrative arc
- Cutscenes — intro, repair, sailing, sunrise
- Wreck diving + Grover / QRNG minigame
- Lore tablets, codex
- Market trade economy
- Time-of-day + moon phases
- MULTIPLAYER (if ever)

Any of these that slip into alpha makes alpha slip.

---

## 10. Commit this file

Once reviewed, save as `ALPHA_SCOPE.md` in the canonical folder root and
commit on `lod-world` (→ `main`). This document + `MASTERPROMPT.md` are the
two docs every session opens with.
