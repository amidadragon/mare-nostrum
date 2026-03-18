# sketch.js Modularization Plan

**Current state**: 23,118 lines in sketch.js. 7 modules already extracted (3,223 lines total).
**Goal**: Identify cleanly extractable sections. No refactoring -- just cut/paste into new `<script>` files loaded before sketch.js.
**Pattern**: All files share p5.js globals + game globals (state, cam, WORLD, C, etc.). New files are added as `<script>` tags in index.html before sketch.js.

---

## Priority 1 -- Large, Self-Contained Sections

### 1. `sound.js` -- SoundManager Class
- **Lines**: 22503-23118 (616 lines)
- **Content**: Entire `SoundManager` class + `snd` global declaration
- **Globals needed**: p5.sound API (`p5.Noise`, `p5.Oscillator`, `p5.Gain`, `p5.BandPass`, `p5.LowPass`), `constrain`, `getAudioContext`, `localStorage`
- **Globals provided**: `snd` (global instance, assigned in `setup()`)
- **Risk**: Very low. Self-contained class. Only `snd` variable declaration moves; `setup()` still calls `new SoundManager()`.
- **Notes**: Also extract `dist2()` helper at line 22499 (stays in sketch.js, it's used everywhere).

### 2. `menu.js` -- Main Menu + Settings + Credits
- **Lines**: 1341-1962 (622 lines)
- **Content**: `_initMenuParticles()`, `drawMenuScreen()`, `drawSettingsPanel()`, `drawCreditsPanel()`, `handleMenuClick()`
- **Globals needed**: `gameScreen`, `menuHover`, `menuFadeIn`, `menuKeyIdx`, `menuFadeOut`, `menuFadeAction`, `menuBgImg`, `snd`, `C`, `outlinedText`, `_dith`, `_b4`, `startNewGame`, `startLoadGame`, `returnToMenu`
- **Globals provided**: Menu particle arrays (internal to menu system)
- **Risk**: Low. Menu is a separate screen state; only called when `gameScreen !== 'game'`.

### 3. `cinematics.js` -- Intro + Cutscenes
- **Lines**: 1963-3351 (1,389 lines)
- **Content**: `drawIntroCinematic()`, `skipIntro()`, `startPreRepairCutscene()`, `drawPreRepairCutscene()`, `startSailingCutscene()`, `drawSailingCutscene()`, `skipCutscene()`, `doFirstRepair()`, `completeSailToHome()`
- **Globals needed**: `state`, `cam`, `camSmooth`, `WORLD`, `C`, `snd`, `openDialog`, `addFloatingText`, `addNotification`, `outlinedText`, `_delta`, `_dith`, `_b4`, `w2sX`, `w2sY`
- **Globals provided**: None (all functions)
- **Risk**: Low. Cutscenes are linear sequences, only active during `state.introPhase` or `state.cutscene`.

### 4. `conquest.js` -- Conquest Island + Colony + Imperial Bridge
- **Lines**: 14672-16975 (2,303 lines)
- **Content**: `CONQUEST_BUILDINGS`, `isOnConquestIsland()`, `initConquestIsland()`, `enterConquest()`, `exitConquest()`, `updateConquest()`, `spawnConquestEnemy()`, `drawConquestIsland()`, all conquest drawing/update functions, colony system (`canColonize`, `colonizeTerraNovaAction`, `upgradeColony`, `updateColonyIncome`), Imperial Bridge (`canBuildBridge`, `startBuildBridge`, `updateBridgeConstruction`, `isOnImperialBridge`, `drawImperialBridge`), `drawColonyOverlay()`
- **Globals needed**: `state`, `cam`, `camSmooth`, `WORLD`, `C`, `w2sX`, `w2sY`, `s2wX`, `s2wY`, `addFloatingText`, `addNotification`, `showAchievement`, `snd`, `particles`, `spawnParticles`, `openDialog`, `_delta`, `outlinedText`, `drawHUDPanel`, `triggerScreenShake`, fog-of-war functions
- **Globals provided**: `CONQUEST_BUILDINGS`, all conquest/colony/bridge functions
- **Risk**: Medium. Tightly coupled with input handling (keyPressed/mousePressed have conquest branches). Those branches stay in sketch.js and call conquest functions.

### 5. `wreck.js` -- Wreck Beach System
- **Lines**: 18815-19992 (1,178 lines)
- **Content**: `getWreckDepth()`, `updateWreckBeach()`, `spawnWreckSplash()`, `getNearestScavNode()`, `collectScavNode()`, `buildRaft()`, `sailToHome()`, `handleWreckInteract()`, `updateWreckRowing()`, crab AI, wreck ambient, `drawWreckIsland()`, `drawWreckEntities()`, `drawWreckHUD()`
- **Globals needed**: `state`, `WRECK`, `cam`, `camSmooth`, `C`, `WORLD`, `w2sX`, `w2sY`, `s2wX`, `s2wY`, `addFloatingText`, `addNotification`, `snd`, `_delta`, `outlinedText`, `particles`, `spawnParticles`, `openDialog`, `drawHUDPanel`, `drawBarHUD`
- **Globals provided**: All wreck functions
- **Risk**: Low. Wreck is a separate game phase (`state.onWreck`).

---

## Priority 2 -- Medium Sections

### 6. `sky.js` -- Sky, Ocean, Weather, Seasons
- **Lines**: 3352-5062 (1,711 lines)
- **Content**: `updateTime()`, `getSkyBrightness()`, `drawSky()`, `drawSun()`, `drawStarField()`, `drawDriftClouds()`, `drawMoonPhased()`, `drawSkyBirds()`, `drawStormClouds()`, `drawOcean()`, `drawShoreWaves()`, seasons (`getSeason`, `getSeasonName`, `getSeasonGrass`, `getSeasonRim`), festivals (`getFestival`, `startFestival`, `drawFestivalBanner`, `updateFestival`), night market, message bottles, villa codex, exile's journal, island visitors, seasonal crops
- **Globals needed**: `state`, `C`, `WORLD`, `cam`, `camSmooth`, `w2sX`, `w2sY`, `_delta`, `snd`, `addFloatingText`, `addNotification`, `openDialog`, `outlinedText`, `starPositions`, `cloudShadows`, `stormActive`, `stormTimer`, `drawHUDPanel`, `drawParchmentPanel`
- **Globals provided**: All sky/ocean/season/weather functions, `starPositions`
- **Notes**: Could split further (sky.js + weather.js + seasons.js) but they share time-of-day state heavily. The journal/codex/visitor subsystems (lines 4458-4964) could also be a separate `journal.js` if desired.

### 7. `buildings.js` -- Building/Blueprint System
- **Lines**: 7813-8692 (880 lines)
- **Content**: `drawBuildings()`, `drawOneBuilding()`, `drawBuildGhost()`, `getBuildDiscount()`, `canAfford()`, `payCost()`, `getCostString()`, `placeBuilding()`, crystal nodes drawing
- **Globals needed**: `state`, `BLUEPRINTS`, `C`, `WORLD`, `w2sX`, `w2sY`, `s2wX`, `s2wY`, `cam`, `_delta`, `snd`, `addFloatingText`, `addNotification`, `isOnIsland`, `snapToGrid`, `isBlockedByBuilding`, `spawnBuildingComplete`
- **Globals provided**: Building draw/place functions (but `BLUEPRINTS` const stays in sketch.js since it's referenced everywhere)
- **Risk**: Low. Drawing + placement logic is self-contained.

### 8. `player.js` -- Player Movement, Animation, Drawing
- **Lines**: 8764-9873 (1,110 lines)
- **Content**: `updateRowing()`, `drawRowingBoat()`, `updatePlayer()`, `updateFishing()`, `startFishing()`, `reelFish()`, `drawFishing()`, `drawPlayerTrail()`, `updatePlayerAnim()`, `triggerPlayerJoy()`, `triggerPlayerAlert()`, `drawPlayer()` and all sub-draw functions (shadow, feet, cape, body, arms, tool, head)
- **Globals needed**: `state`, `C`, `WORLD`, `cam`, `w2sX`, `w2sY`, `s2wX`, `s2wY`, `_delta`, `snd`, `addFloatingText`, `addNotification`, `isWalkable`, `isOnIsland`, `isOnWreck`, `isOnBridge`, `isOnPier`, `isInShallows`, `isOnConquestIsland`, `isOnImperialBridge`, `rollFishType`, `particles`, `spawnParticles`
- **Globals provided**: All player update/draw functions
- **Risk**: Medium. `updatePlayer()` has many branches checking game state.

### 9. `companions.js` -- All Companion AI + Drawing
- **Lines**: 9874-10722 (849 lines)
- **Content**: `updateCompanion()`, `drawCompanionTrail()`, `drawCompanion()`, `updateWoodcutter()`, `drawWoodcutter()`, `updateCenturion()`, `drawCenturion()`
- **Globals needed**: `state`, `C`, `WORLD`, `w2sX`, `w2sY`, `_delta`, `snd`, `addFloatingText`, `addNotification`, `isOnIsland`, `spawnParticles`, `spawnWoodChips`
- **Globals provided**: All companion update/draw functions
- **Risk**: Low. Companions have simple AI loops.

### 10. `npcs.js` -- NPC Drawing + Dialogue + Quests + Cats
- **Lines**: 10723-11045 + 5499-5596 + 5597-5886 + 21530-21970 + 21971-22097 (combined ~1,600 lines)
- **Content**: `drawNPC()`, `drawDialogBubble()`, `drawHeart()`, NPC dialogues, cat adoption, NPC quests, new NPC types, cat update/draw
- **Globals needed**: `state`, `C`, `w2sX`, `w2sY`, `_delta`, `snd`, `addFloatingText`, `openDialog`, `outlinedText`
- **Risk**: Medium. Scattered across multiple locations in the file -- extraction requires gathering non-contiguous blocks.

---

## Priority 3 -- Smaller / More Tangled

### 11. `particles.js` -- Particle System + Juice Effects
- **Lines**: 11046-11755 (710 lines)
- **Content**: `updateParticles()`, `drawParticles()`, `spawnParticles()`, all `spawn*()` juice functions (harvest burst, crystal pulse, wood chips, loot cascade, island level-up, building complete, boss defeated, island discovered, divine blessing, season fanfare), `drawColorGrading()`
- **Globals needed**: `state`, `C`, `particles`, `_delta`, `w2sX`, `w2sY`, `cam`, `snd`, `addFloatingText`
- **Globals provided**: All particle/juice functions, modifies `particles` array
- **Risk**: Low. Pure visual effects.

### 12. `hud.js` -- HUD, Inventory, Build UI, Empire Dashboard
- **Lines**: 16975-17802 (828 lines)
- **Content**: `trackHudResource()`, `drawHudResource()`, `drawEmpireDashboard()`, `drawInventoryScreen()`, `drawHotbar()`, `drawHUD()`, `drawBuildUI()`, `drawBuildIcon()`, `drawHUDPanel()`, `drawParchmentPanel()`, `drawBarHUD()`, `drawCursor()`
- **Globals needed**: `state`, `C`, `BLUEPRINTS`, `cam`, `w2sX`, `w2sY`, `snd`, `hudFlash`, `empireDashOpen`, `inventoryOpen`, `outlinedText`, economy globals
- **Risk**: Medium. `drawHUDPanel` and `drawParchmentPanel` are used by many other modules as utility functions -- they need to load before anything that calls them.

### 13. `input.js` -- Input Handlers
- **Lines**: 17803-18814 (1,012 lines)
- **Content**: `mouseWheel()`, `mousePressed()`, `mouseDragged()`, `touchStarted()`, `keyPressed()`
- **Globals needed**: Nearly everything. Input is the main dispatch hub -- it calls into every system.
- **Risk**: High. This is the most tangled section. Every system gets invoked from input handlers. Extract last, if at all.

### 14. `storm.js` -- Storm + Lightning + Energy Arcs
- **Lines**: 11756-11856 (101 lines)
- **Content**: `updateStorm()`, `genLightningBranches()`, `drawLightning()`, `drawEnergyArcs()`
- **Risk**: Very low but very small. May not be worth a separate file.

### 15. `arena.js` -- Arena Drawing + Adventure Combat
- **Lines**: 12796-14216 (1,421 lines)
- **Content**: `getEnemyStats()`, `spawnWave()`, `enterAdventure()`, `exitAdventure()`, `updateAdventure()`, `updatePlayerCombat()`, `playerAttack()`, `updateEnemyAI()`, `enemyDeath()`, arena drawing, enemy drawing, adventure HUD
- **Globals needed**: `state`, `C`, `WORLD`, `cam`, `w2sX`, `w2sY`, `_delta`, `snd`, `addFloatingText`, `addNotification`, `triggerScreenShake`, `spawnParticles`, combat module globals
- **Notes**: Already have combat.js -- this could be merged into it or kept separate as `arena.js`.

### 16. `island-render.js` -- Island Terrain Rendering
- **Lines**: 5887-7748 (1,862 lines)
- **Content**: `drawIsland()`, `drawPort()`, `getMerchantPortPosition()`, `drawMerchantPort()`, `drawShoreline()`, `drawFarmZoneBG()`, `drawRomanRoad()`, `drawNightLighting()`, `drawGrassTufts()`, `drawIslandBelly()`, `drawVines()`, `drawExpansionZone()`, `drawPyramid()`, `drawRuins()`
- **Globals needed**: `state`, `C`, `WORLD`, `cam`, `w2sX`, `w2sY`, `_delta`, `getSeason`, `getSeasonGrass`, `getSkyBrightness`, `snd`
- **Risk**: Medium. Large but purely rendering. Depends on season/time functions.

---

## Extraction Order (Recommended)

| Order | File | Lines | Risk | Reason |
|-------|------|-------|------|--------|
| 1 | `sound.js` | 616 | Very Low | Self-contained class at end of file |
| 2 | `cinematics.js` | 1,389 | Low | Isolated game phase |
| 3 | `wreck.js` | 1,178 | Low | Isolated game phase |
| 4 | `menu.js` | 622 | Low | Separate screen state |
| 5 | `particles.js` | 710 | Low | Pure effects, no state mutation |
| 6 | `companions.js` | 849 | Low | Simple AI loops |
| 7 | `conquest.js` | 2,303 | Medium | Biggest single section |
| 8 | `buildings.js` | 880 | Low | Self-contained system |
| 9 | `player.js` | 1,110 | Medium | Central but well-bounded |
| 10 | `arena.js` | 1,421 | Medium | Consider merging with combat.js |
| 11 | `sky.js` | 1,711 | Medium | Many subsystems bundled |
| 12 | `island-render.js` | 1,862 | Medium | Pure rendering |
| 13 | `hud.js` | 828 | Medium | Utility functions used by others |
| 14 | `npcs.js` | ~1,600 | Medium | Non-contiguous blocks |
| 15 | `input.js` | 1,012 | High | Calls everything -- extract last |

**Total extractable**: ~18,091 lines (78% of sketch.js)
**Would remain in sketch.js**: ~5,027 lines (globals, state, initState, setup, draw, camera, coord helpers, save/load, various small sections)

---

## Script Load Order in index.html

New files must load BEFORE sketch.js (since sketch.js contains `setup()` and `draw()`). Order matters for dependencies:

```html
<script src="engine.js?v=XXX"></script>
<script src="narrative.js?v=XXX"></script>
<script src="sound.js?v=XXX"></script>         <!-- SoundManager class -->
<script src="menu.js?v=XXX"></script>           <!-- menu screens -->
<script src="cinematics.js?v=XXX"></script>     <!-- intro + cutscenes -->
<script src="particles.js?v=XXX"></script>      <!-- effects (used by many) -->
<script src="sky.js?v=XXX"></script>            <!-- sky, ocean, weather, seasons -->
<script src="buildings.js?v=XXX"></script>      <!-- blueprint system -->
<script src="companions.js?v=XXX"></script>     <!-- companion AI -->
<script src="npcs.js?v=XXX"></script>           <!-- NPC system -->
<script src="player.js?v=XXX"></script>         <!-- player movement/draw -->
<script src="island-render.js?v=XXX"></script>  <!-- terrain rendering -->
<script src="arena.js?v=XXX"></script>          <!-- arena combat -->
<script src="conquest.js?v=XXX"></script>       <!-- conquest + colony -->
<script src="wreck.js?v=XXX"></script>          <!-- wreck beach -->
<script src="hud.js?v=XXX"></script>            <!-- HUD + UI panels -->
<script src="sketch.js?v=XXX"></script>         <!-- core: state, setup, draw, input, save/load -->
<script src="islands.js?v=XXX"></script>
<script src="diving.js?v=XXX"></script>
<script src="combat.js?v=XXX"></script>
<script src="economy.js?v=XXX"></script>
<script src="debug.js?v=XXX"></script>
```

Note: Since all files share global scope, load order only matters for code that executes at parse time (const/let declarations, class definitions). Function definitions are hoisted within a single script but NOT across scripts. However, since none of these functions are called at parse time (they're called from `setup()`, `draw()`, or event handlers which run after all scripts load), the order is flexible. The above order is for readability.

---

## What Stays in sketch.js

After full extraction, sketch.js would contain:
- Global text helpers (outlinedText, MIN_TEXT_SIZE patch) -- lines 6-26
- Game screen state variables -- lines 28-68
- Palette `C` -- lines 70-136
- World config `WORLD` -- lines 137-144
- All `state` globals + `BLUEPRINTS` -- lines 146-960
- `initState()` -- lines 185-960
- `preload()`, `setup()`, `startNewGame()`, `startLoadGame()`, `returnToMenu()` -- lines 961-1120
- Camera + coord helpers -- lines 1121-1275
- `draw()` main loop + `drawInner()` -- lines 1276-1340
- Dither helpers -- lines 1334-1340
- `drawWorldObjectsSorted()` -- lines 7749-7812
- Farm plots drawing -- lines 8569-8692
- Resources drawing -- lines 8693-8763
- Dialog system -- lines 11971-12189
- Floating text / notifications -- lines 11857-11943
- Screen transitions -- lines 11944-11970
- Trees -- lines 12190-12420
- Merchant ship -- lines 12421-12779
- Screen shake -- lines 12779-12805
- Equipment/shop data -- lines 14217-14575
- Fog of war -- lines 14576-14671
- Save/load -- lines 20387-20750
- Zone placement helpers -- lines 20750-20896
- Chickens, fountain, crystal shrine -- lines 20897-21165
- Harvester companion, Vesta AI -- lines 21166-21529
- Crop variety drawing -- lines 22097-22497
- Island expansion -- lines 22220-22497
- Coord helpers -- lines 22498-22502
