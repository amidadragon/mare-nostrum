# SPRINT V1.1 — Mare Nostrum: Rough Playable → Polished Itch.io Release

**Target:** Everything below turns a 7/10 browser demo into a 9/10 itch.io release.
**Philosophy:** Polish existing systems until they sing. Add zero new feature scope. Kill every rough edge.

---

## HOW TO READ THIS PLAN

Each item has:
- **File(s):** what to touch
- **Root cause:** what is actually wrong in the code
- **Fix:** specific, actionable implementation
- **Complexity:** S (<30 min) / M (30-90 min) / L (2-4 hours)
- **Agent:** which specialist to assign

---

## PRIORITY 1 — BLOCKERS
*These make the game look broken or lose data. Fix these before shipping anything.*

---

### P1-1: NPC Dialogues Sometimes Return Empty
**Severity:** High — players walk up to Livia, press E, nothing happens or she repeats a single line in a loop.

**Root cause:** `getExpandedDialogue('livia')` in narrative.js (line 436) falls back to `pool[0].text` when `candidates.length === 0`. But Livia's `LIVIA_DIALOGUE_POOL` filter is strict — `minH/maxH` gates combined with `timeMin/timeMax` windows can leave `candidates === []` in normal play (mid-day, hearts 2-3, no active weather). The fallback returns `pool[0].text` which is always the FIRST line, making her repeat "I didn't expect to see you..." on every interaction. Marcus is worse: `nn.present` is `false` until ship arrives, so pressing E near him during his walk animation produces no response — the code silently skips him.

**Also:** `drawNewNPC` renders the `[E]` prompt for Marcus/Vesta/Felix when `pd < 80 && npc.dialogTimer <= 0`, but the actual keyPressed handler guards Marcus with `if (name === 'Marcus' && !nn.present) return` — creating a ghost prompt that does nothing.

**Fix:**
- `narrative.js ~line 436`: Change fallback from `pool[0].text` to a random from the full pool filtered only by `minH <= h < maxH`, ignoring time/weather constraints. Keep the strict filter for the primary pass.
- `sketch.js ~line 20388`: Change `if (pd < 80 && npc.dialogTimer <= 0)` in `drawNewNPC` to also check `npc.present !== false` (for Marcus) before showing the `[E]` glow.
- `sketch.js ~line 18321`: Remove the hard `return` for Marcus when not present; instead show a "Come back when the ship docks" line using `addFloatingText`.

**Files:** `narrative.js`, `sketch.js`
**Complexity:** S
**Agent:** general-purpose

---

### P1-2: Diving Resources Lost on Reload (Data Loss)
**Severity:** High — players earn pearls, sponges, coral, then save and reload to find them gone.

**Root cause:** `state.diving.pearls`, `.coral`, `.sponges`, `.amphoras` are collected and incremented in `diving.js` but the `saveGame()` function in sketch.js never serializes them. They are part of `initState()` defaults but orphaned from persistence.

**Fix:** In `saveGame()`, add `diving` sub-object with `{ pearls, coral, sponges, amphoras, totalDives, lungCapacity, diveSpeed }`. In `loadGame()`, restore with `|| 0` guards. Add a version migration note (already on format v7 — bump to v8 or add patch guard).

**Files:** `sketch.js` (saveGame/loadGame blocks)
**Complexity:** S
**Agent:** general-purpose

---

### P1-3: D-Key Conflict — Move Right + Dive Fire Simultaneously
**Severity:** High — pressing D to move right also triggers `startDive()` on the keyPressed event. Players constantly accidentally enter dive mode.

**Root cause:** `keyPressed()` calls `startDive()` when `key === 'd' || key === 'D'`, but `updatePlayer()` uses `keyIsDown(68)` for rightward movement. The D-key fires the pressed handler every single frame the key is down (in some browser implementations) OR fires on first press during a rightward walk, instantly toggling dive.

**Fix:** Change the dive trigger from `key === 'd' || key === 'D'` to `key === 'D'` with explicit shift requirement, OR rebind dive to a dedicated key like `V` (for "dive/submerge"). Update all help text, tutorial hints, and the control line in `drawHUD()`. V is currently unused and makes ergonomic sense (next to the movement keys).

**Files:** `sketch.js` (keyPressed, drawHUD controls text, tutorial hints)
**Complexity:** S
**Agent:** general-purpose

---

### P1-4: Skill Tree UI Missing — XP is Awarded But Cannot Be Spent
**Severity:** High — the combat system grants XP, awards `state.player.skillPoints`, but there is no UI to spend them. The skill tree state (`state.player.skills`) exists. The 3-branch 9-skill design exists in `combat.js`. But pressing any skill key does nothing meaningful because skills remain at level 0.

**Root cause:** No `drawSkillTree()` function has been wired into the draw loop. The skill upgrade flow exists in `combat.js` (`grantXP`, skill branch data) but no mouse/keyboard handler routes to `upgradeSkill()`. Players accumulate skill points that do nothing — the entire combat progression loop is broken.

**Fix:** Build a minimal skill tree overlay — Tab or K key opens a panel showing 3x3 grid (Gladiator / Praetor / Mystic branches), each slot shows skill name + level + cost + unlock requirement. Click to spend. Can reuse the existing `empireDashOpen` pattern. Skill descriptions are already in `combat.js` — just need the panel rendered and click routing.

**Files:** `sketch.js` (draw loop overlay, keyPressed toggle), `combat.js` (skill upgrade routing)
**Complexity:** L
**Agent:** game-designer + general-purpose (parallel)

---

### P1-5: Build Mode Grid Snap Feels Off — Pieces Don't Align Visually
**Severity:** Medium-High — players report pieces "not snapping properly."

**Root cause:** The grid snap is mathematically correct (`snapToGrid` rounds to nearest 32px in WORLD space) but the visual cursor in `drawBuildGhost()` runs inside `translate(shakeX, shakeY + floatOffset)`. The `s2wX(mouseX - shakeX)` call compensates shake but the snapped world coordinate then gets drawn without accounting for the `floatOffset` in the translate context. The ghost appears ~12-15px below where it will actually be placed. This makes the preview misrepresent the placement, and placed tiles appear to shift position when the island bobs.

**Also:** Buildings are stored in world coordinates but rendered with `w2sX/w2sY` inside the float/shake translate, meaning their screen position is correct — but their Y-sort layer appears wrong when floatOffset is large (buildings "pop" in front/behind each other mid-bob).

**Fix:** In `drawBuildGhost()`, snap the visual rectangle after converting to screen space (not before), so the ghost is always pixel-accurate to where the placed building will appear. Specifically: compute `snapX = snapToGrid(s2wX(mouseX - shakeX))` and `snapY = snapToGrid(s2wY(mouseY - shakeY - floatOffset))`, then draw the ghost at `w2sX(snapX) - shakeX` and `w2sY(snapY) - shakeY - floatOffset` (relative to the translate context). The Y-sort should use `b.y + b.h/2` as the sort key rather than `b.y` for buildings with meaningful height.

**Files:** `sketch.js` (`drawBuildGhost`, building Y-sort)
**Complexity:** M
**Agent:** art-director

---

### P1-6: Storm Barely Covers the Sky — Visually Unconvincing
**Severity:** Medium — storm weather fires but only 4 small clouds appear in the top 5% of screen. The sun is still fully visible. Doesn't feel like a storm.

**Root cause:** `drawStormClouds()` places 4 hardcoded clouds at `y ≈ 0.02 to 0.06 * height` (near the very top), each `r = 100-190px` in screen space. At 900px height, these span roughly 60-90px vertically — a thin gray band. The `intensity` multiplier on alpha means they're 60% transparent even at peak storm. The sun draw call happens regardless of storm state.

**Fix:**
1. Expand cloudData to 12-16 clouds covering `y: 0.02 to 0.35` — actually fill the sky.
2. Pass storm coverage to `drawSun()` — when `stormActive`, multiply sun alpha by `(1 - intensity * 0.85)` so it dims behind clouds.
3. Add a storm color overlay: after ocean is drawn but before island, `fill(20, 25, 40, 40 * intensity)` rect over the whole screen.
4. Add 3-4 large dark foreground clouds that drift slowly across (`x += cloudSpeed * dt` per cloud using stored `state.stormClouds[]` positions).
5. Rain streaks: already exist but check they're rendering — add 2-3 vertical streak passes over the island surface.

**Files:** `sketch.js` (`drawStormClouds`, `drawSun`, `drawSky`)
**Complexity:** M
**Agent:** art-director

---

## PRIORITY 2 — POLISH
*These make the game feel unfinished. Players will clock each one in the first 30 minutes.*

---

### P2-1: Cypress Trees Look Ugly
**Severity:** Medium — the tree typed as 'oak' renders as a "Cypress" (comment at line 11720) but the foliage is blocky pixel stacks that look jagged. Mediterranean cypresses are the visual signature of the game.

**Root cause:** The current cypress draws a series of overlapping `rect()` calls to simulate a triangular column. The rects are too uniform in width per layer (12px wide at base tapering to 2px) and use only 2 green values `(22,55,20)` and `(32,68,28)`. No silhouette variation. At `s=1` (the normal scale factor), the tree is 100px tall on screen but all layers are axis-aligned rectangles — no jitter or organic variation.

**Fix:** Replace the cypress foliage with a procedural approach using the tree's `swayPhase` as a seed for per-layer width jitter:
- Each foliage layer: base width + `sin(swayPhase + layerIdx * 2.3) * 1.5 * s` pixels of jitter, so the silhouette looks irregular/hand-drawn
- Add a third green shade `(18, 42, 16)` for the deep shadow side (left half of each layer)
- Add tiny triangular tips between layers using `triangle()` calls to break up the rectangular stacking
- The trunk should be 2px wider and taper — use `rect(-2*s, -30*s, 3*s, 30*s)` for left half and `rect(0, -29*s, 2*s, 28*s)` for right half with lighter fill

This is a visual-only change. No gameplay impact.

**Files:** `sketch.js` (`drawOneTree`, oak branch, lines ~11719-11759)
**Complexity:** M
**Agent:** art-director

---

### P2-2: Island Feels Empty at High Levels (Levels 10+)
**Severity:** Medium — the island grows significantly per level, but tree/grass spawning doesn't keep pace. At level 15+ you have a large ellipse with buildings clustered in the center and a lot of bare green ground.

**Root cause:** `expandIsland()` increases `islandRX/RY` but only pushes existing trees and spawns 2 new trees per expansion in one specific region. Trees are initialized at game start with a fixed count, not relative to island size. Grass patches (if any) are not tracked in state.

**Fix:**
1. After each `expandIsland()`, spawn 4-6 new trees randomly distributed in the newly revealed ring area (between old RX and new RX). Filter against farm zone exclusion.
2. Add `state.decorFlora = []` — an array of small non-interactable decorations: ferns `(8x6px, dark green)`, wildflowers `(4x4px, #cc8844)`, moss patches `(16x8px, semi-transparent)`. Spawn 30 at game start plus 8 per island expansion. Draw them before trees in the world render order.
3. In `drawIslandSurface()` (wherever the grass base ellipse is drawn), add a subtle texture pass: every 40px, draw a 1x1px darker green dot in a grid, jittered by sin(x+y) — gives the grass a cross-hatched feel rather than a flat green ellipse.

**Files:** `sketch.js` (`expandIsland`, `initState`, island draw functions)
**Complexity:** M
**Agent:** art-director + game-designer

---

### P2-3: Centurion Freeze Bug During Dive
**Severity:** Medium — when the player dives, the centurion locks up (reported as "centurion dive freeze"). The centurion's `task: 'follow'` code tries to pathfind to `state.player.x/y` which during diving is the player's pre-dive position.

**Root cause:** `updateCenturion()` runs every frame regardless of dive state. During dive, `state.diving.active = true` but the centurion's target remains the player's world coords. The centurion may be walking into the water (off-island) and getting stuck at the island boundary check.

**Fix:** At the top of `updateCenturion()`, add: `if (state.diving && state.diving.active) return;` — freeze the centurion while player is underwater. On dive exit, set `state.centurion.x = state.player.x + 20; state.centurion.y = state.player.y` to snap it back.

**Files:** `sketch.js` (`updateCenturion`)
**Complexity:** S
**Agent:** general-purpose

---

### P2-4: HUD Shows "DAY" Twice
**Severity:** Low-Medium — two separate day counters appear simultaneously. Looks like a UI bug.

**Root cause:** `drawHUD()` renders a day counter in the left resource panel AND `drawTimeWidget()` renders the day/hour info at top-center. Both fire in the same frame.

**Fix:** Remove the day counter from `drawHUD()`'s left panel, keep only `drawTimeWidget()`. The time widget is more prominent and informative.

**Files:** `sketch.js` (`drawHUD`)
**Complexity:** S
**Agent:** general-purpose

---

### P2-5: Agricultural Specialization Shows Wrong Multiplier
**Severity:** Low-Medium — the colony UI says "3x harvest" but the code does `harvestAmt * 1.3`. This is a trust issue — players will catch it.

**Root cause:** String in the colony/trade UI uses "3x" but implementation in `sketch.js ~line 18995` (approx) is `* 1.3`.

**Fix:** Change the UI string to "+30% harvest" everywhere. Search for "3x" or "3× harvest" in the colony specialization description strings and fix them.

**Files:** `sketch.js`, `economy.js`
**Complexity:** S
**Agent:** general-purpose

---

### P2-6: Damage Numbers Have Camera-Drift Jank
**Severity:** Medium — floating damage numbers drift across the screen as the camera moves because they spawn in world space but render in screen space without applying the camera delta between spawn and render frames.

**Root cause:** Floating text objects store `{ x, y }` in screen space at spawn time. But `cam` smoothly interpolates (`camSmooth`) over multiple frames. A number spawned at `w2sX(enemy.x)` in frame N renders at the same screen X in frame N+1 even though `camSmooth.x` has shifted.

**Fix:** Store floating text in WORLD coordinates (not screen), and convert in the draw step: `let sx = w2sX(ft.wx), sy = w2sY(ft.wy)`. For non-world text (UI popups), keep them in screen space with a `world: false` flag. This requires auditing all `addFloatingText()` call sites to pass world coords instead of screen coords when the source is a world entity.

**Files:** `sketch.js` (`addFloatingText`, `updateFloatingText`, `drawFloatingText`)
**Complexity:** M
**Agent:** general-purpose

---

### P2-7: ESC Overlay Handling — Pressing ESC During Dialogue Opens Menu
**Severity:** Medium — pressing ESC while a dialogue bubble is showing opens the pause/menu instead of dismissing the dialogue. Player loses context.

**Root cause:** The ESC handler runs top-to-bottom and hits the `gameScreen = 'menu'` branch before checking `dialogState.active`.

**Fix:** At the top of the ESC keyPressed section, check `if (dialogState.active) { advanceDialog(); return; }`. Also check `if (state.buildMode) { state.buildMode = false; return; }` (already partially done but verify order).

**Files:** `sketch.js` (keyPressed ESC section)
**Complexity:** S
**Agent:** general-purpose

---

### P2-8: Oracle / Storm Prayer Double-Autocomplete
**Severity:** Medium — interacting with the crystal shrine during a storm sets both `dawn_prayer` and `oracle_riddle` flags in the same interaction, short-circuiting quest steps.

**Root cause:** The shrine interact handler (sketch.js ~line 22596-22604) has two consecutive flag-set blocks with no `else` guard between them. Both fire if conditions overlap.

**Fix:** Add `else if` between the oracle_riddle block and the dawn_prayer block so only one fires per interaction.

**Files:** `sketch.js` (crystal shrine interact handler)
**Complexity:** S
**Agent:** general-purpose

---

### P2-9: Trees at Island Edge Pop In/Out on Boundary Check
**Severity:** Low-Medium — `drawOneTree()` calls `if (!isOnIsland(t.x, t.y)) return` which correctly guards drawing, but trees near the edge (within 1px of the boundary) flicker every frame because `isOnIsland` uses a floating-point ellipse test and `floatOffset` changes the coordinate system slightly each frame.

**Root cause:** `isOnIsland` checks world coordinates which are fixed, so it shouldn't be affected by `floatOffset`. But the `floatOffset` changes `w2sY()` output, which means the world-to-screen conversion shifts — trees that are ON the island in world space appear to be off-screen on the visible canvas edge. The issue is purely visual: trees near the `islandRY * 0.9` boundary appear at the very edge of the visible grass and the `isOnIsland` check uses 0.9 of the radius, so trees between 90% and 100% radius are valid world positions but get culled.

**Fix:** Change the guard to use the actual island radii rather than the surface radii: `if (!isInsideIslandEllipse(t.x, t.y, 1.0)) return` so edge trees always render. They were placed on the island at spawn time and should always be valid.

**Files:** `sketch.js` (`drawOneTree`)
**Complexity:** S
**Agent:** art-director

---

## PRIORITY 3 — CONTENT
*These expand fun without adding scope. Each reuses existing systems.*

---

### P3-1: Islands Need a Recurring Reason to Visit
**Severity:** Medium — Vulcan, Hyperborea, Plenty, Necropolis are fully realized one-time dungeons. After the first visit and resource collection, there is zero reason to return. This kills the mid-to-late game loop.

**Root cause:** Obsidian nodes, frost crystals, spice nodes, soul nodes — all set `collected: true` permanently. No respawn timer exists for island resources.

**Fix:** Add `respawnDays: 3` to each island resource node. In `updateVulcanIsland`, `updateHyperboreIsland`, etc., tick a `respawnTimer` per collected node each day tick. After 3 days, `node.collected = false`. This reuses the exact same system as `crystalNodes` on the home island which already have `respawnTimer`. 8 lines of code per island.

Also add one unique "daily" resource per island that respawns every real-time session (on game load):
- Vulcan: 1-2 stray `ironOre` chunks near the lava pools
- Hyperborea: 1 `ancientRelic` piece frozen in a snowdrift (random position)
- Plenty: 1 `exoticSpice` node guaranteed fresh
- Necropolis: 1 `soulEssence` orb near the tomb entrance

**Files:** `islands.js` (all four update functions), `sketch.js` (day tick handler)
**Complexity:** M
**Agent:** game-designer

---

### P3-2: Cooking System is Underexplained
**Severity:** Medium — players can cook meals, stew, garum, ambrosia — but there is no in-game recipe reference. The hotbar doesn't indicate "cookpot" as a usable item. Players discover cooking by accident.

**Root cause:** The cooking UI is only visible when the player is adjacent to a cookpot AND presses a specific key — but there's no consistent visual affordance telling players the cookpot exists and what it does.

**Fix:**
1. When player walks within 40px of the cookpot, show a persistent (not just on-hover) recipe list: small bubble showing "Meal: grain + fish" etc.
2. Add the cookpot to the hotbar contextual display — when hotbarSlot 0 (sickle) is selected near a cookpot, show a "switch to cooking" hint.
3. Add one tutorial hint: first time player has both grain >= 3 AND fish >= 1, show `tutorialHint = { text: "Try cooking! Stand near the cookpot and press E.", ... }`.

**Files:** `sketch.js` (drawNearbyPrompts, tutorial hint trigger in updatePlayer)
**Complexity:** M
**Agent:** game-designer

---

### P3-3: Fishing is Too Passive — No Tension
**Severity:** Medium — fishing works but it's mechanically flat. Cast rod, wait for bite, press F. The "bite" feedback is a floating text pop — barely noticeable.

**Root cause:** `state.fishing.bite` triggers `addFloatingText` but there is no audio SFX variation (just a single tone), no visual excitement on the float (no bobber animation) and the timing is purely random.

**Fix:**
1. When `fishing.bite = true`, add a bobber "dip" animation: for 5 frames, draw the fishing line endpoint 4px lower + water ripple particle burst (reuse existing `spawnParticles('splash')`)
2. Add a `snd.playSFX('bite')` call if it exists, or add a quick pitched-up version of the plunk SFX
3. Make the F-key reel timing matter: if player reels within 30 frames of bite, full fish. If they wait 60+ frames, 50% chance it escapes with a `snd.playSFX('splash')` and message "Got away!"
4. Rare fish visual: when a tuna/swordfish is caught, add a 2-second "big catch" screen flash (already have `state.screenFlash`) and doubled particle burst

**Files:** `sketch.js` (fishing update, reel fish, draw fishing)
**Complexity:** M
**Agent:** game-designer

---

### P3-4: Message Bottles Have No Stakes / Discovery Arc
**Severity:** Low-Medium — `state.bottles[]` is defined with full structure (message, treasure coords) but the discovery experience is flat. Player collects a bottle, reads a message, walks to coords, finds loot. No emotional payoff.

**Root cause:** The message text in bottles is generic. No bottle feeds into the main narrative. The treasure hunt is purely mechanical.

**Fix:** Write 5 specific bottle messages that hint at the world's backstory — the previous inhabitants of the floating island, the Senator Aurelius connection, the Roman fleet. Each message should be 2-3 sentences in epistolary Roman style. The treasure at the end of each should include a narrative fragment (lore tablet unlock). This is pure content work — no code changes needed, just write better `state.bottles[i].message` strings in `initState()` and hook `unlockJournal('bottle_N')` on each treasure find.

**Files:** `sketch.js` (bottle initialization, treasure find handler)
**Complexity:** S
**Agent:** game-designer

---

### P3-5: Night Sky is Underused
**Severity:** Low — the night cycle exists but the night sky (stars) is just a static `starPositions` array drawn as dots. No shooting stars, no moon phase, no reason to be outside at night beyond the cricket ambient.

**Root cause:** Night is purely visual — nothing unique happens after 21:00 except lyre switching to 'night' mode.

**Fix:**
1. Shooting star: every 4-5 minutes of in-game night (random), trigger a shooting star — a particle that travels from upper-right to lower-left over 2 seconds, leaving a glowing trail (reuse existing particle system with a single long-life high-velocity particle)
2. Moon phase indicator in the time widget — a small crescent/full/half moon icon drawn with 2-3 `arc()` calls. Use `(state.day % 8)` as the phase. No gameplay effect needed — pure atmosphere
3. Vesta dialogue: at night, `getExpandedDialogue('vesta')` has time-gated lines already defined in `narrative.js`. Verify they fire correctly and add 2 more lines referencing moon/stars.

**Files:** `sketch.js` (night draw, drawTimeWidget, star render)
**Complexity:** M
**Agent:** art-director + sound-designer

---

## PRIORITY 4 — NICE-TO-HAVE (Stretch Goals)
*Do these only if P1-P3 are fully done and time remains. These push 9/10 to 10/10.*

---

### P4-1: Skill Tree UI Polish
After implementing the basic skill tree panel (P1-4), add:
- Skill unlock particle burst (reuse `spawnParticles('crystal')`) when a skill is purchased
- Each skill slot shows a small pixel-art icon (even a 6x6 symbol) — gladiator sword, praetor lance, mystic bolt
- Skill hotkeys (1/2/3 in combat) show brief skill name popup when pressed, so player knows which skill fired

**Files:** `sketch.js` (skill panel render)
**Complexity:** M
**Agent:** art-director

---

### P4-2: Wreck Beach — Add Weight to the Opening
**Severity:** Impact. The wreck intro is the first thing every player sees.

The current opening: player wakes on a beach, scavenges nodes, builds raft, sails away. It's functional. But it doesn't land with the weight that earns the 10/10 "this game's intro hit different" review quote.

**Fix:**
1. Add one line of on-screen text at the very first frame after fade-in — not a dialogue box, just `outlinedText()` centered in the sky for 3 seconds: `"Day 1 of exile. The sea returned me, but not my name."` Then fade it out.
2. The salvageable crates on the wreck — when the player approaches the first one for the first time, play a brief audio tone (lowest lyre note, single pluck) and show the text: `"Something familiar in the wreckage."` Make the player feel like a person before they feel like a character.
3. Add one crab that follows the player for a few seconds when first scavenged, then scurries away. Takes 5 lines of code. Creates a moment.

**Files:** `cinematics.js`, `wreck.js`
**Complexity:** M
**Agent:** game-designer

---

### P4-3: Juice Pass — Input Feedback
**Fix for every interaction that currently has no feedback:**
- Building placement: add a 3-frame `triggerScreenShake(1, 3)` on successful place (tiny, satisfying thunk)
- Crop harvest: the sickle swing animation already exists — verify `snd.playSFX('harvest')` fires on EVERY harvest, not just the first combo hit
- Fish reel: add a brief screen tilt (shake X only, 2 frames) to simulate the pull
- NPC heart gain: `npcHeartPop()` already exists — verify it fires for all 4 NPCs including Livia (it may be missing from the Livia-specific branch at line 18289 — check it calls `npcHeartPop(n)`)
- Crystal node collect: verify `spawnParticles` fires with `'crystal'` type and at least 8 particles

None of these add features. They're all 1-2 line fixes to existing systems that are already 80% wired.

**Files:** `sketch.js` (scattered — build place, harvest, fishing, NPC gift)
**Complexity:** S per fix, M total
**Agent:** qa-tester (finds which ones are missing), general-purpose (fixes)

---

### P4-4: First-Session Onboarding
**Severity:** Low — no tutorial for new players. The wreck island is self-explanatory, but once on the home island, players don't know about building (B key), the shrine, or the ship.

**Fix:** The `tutorialHint` system already exists. Add 5 milestone-triggered hints:
1. After first harvest: `"Press B to enter Build Mode. Place tiles, walls, and torches."`
2. After 3 builds: `"The Crystal Shrine (far left) powers your island. Keep it charged."`
3. After day 3 passes: `"The merchant ship arrives every few days. Stand at the dock to trade."`
4. After first dive: `"Pearls sell for 15g each at the merchant. Dive when breath is full."`
5. After first island expansion: `"Explore the sea — four islands ring Mare Nostrum, each with rare resources."`

Gate each with a `state.narrativeFlags['hint_X']` idempotency check (the `trackMilestone` pattern).

**Files:** `sketch.js` (day tick / harvest / build success handlers)
**Complexity:** S
**Agent:** game-designer

---

### P4-5: Itch.io Store Page Assets
**Not code — but must ship before launch.**
- Title card: 1920x1080 screenshot of the island at golden hour (mid-afternoon, level 10+ island, NPCs visible, warm sky). Can be captured in-game with photo mode.
- GIF: 10-second loop of the sailing cinematic OR the island bobbing with day/night cycle visible.
- Description: 150 words max. Lead with the emotional hook ("A Roman exile. A floating island. A chance to begin again."), then mechanics bullet list. NO feature soup.
- Tags on itch.io: cozy, roman, life-sim, farming, pixel-art, browser-game, p5js (for discoverability)
- Pricing: free with "pay what you want" toggle. Lower barrier = more plays = more feedback.

**Files:** `manifest.json` (app description), itch.io page
**Complexity:** M
**Agent:** marketing

---

## SPRINT EXECUTION ORDER

**Week 1: Blockers**
- P1-1 (NPC dialogue empty) — Day 1
- P1-2 (diving save data) — Day 1
- P1-3 (D-key conflict) — Day 1
- P1-5 (build ghost visual) — Day 2
- P1-6 (storm clouds) — Day 2
- P1-4 (skill tree UI) — Days 3-4 (L task, needs full attention)

**Week 2: Polish Pass**
- P2-1 (cypress) — Day 1
- P2-3 (centurion freeze) — Day 1
- P2-4 (HUD double day) — Day 1 (S)
- P2-5 (spec string) — Day 1 (S)
- P2-7 (ESC dialogue) — Day 1 (S)
- P2-8 (oracle autocomplete) — Day 1 (S)
- P2-6 (damage numbers) — Day 2
- P2-2 (island empty) — Day 2-3
- P2-9 (tree flicker) — Day 3 (S)

**Week 3: Content + Stretch**
- P3-1 (island respawn) — Day 1
- P3-2 (cooking UI) — Day 2
- P3-3 (fishing tension) — Day 2
- P3-4 (bottle messages) — Day 3 (content, fast)
- P3-5 (night sky) — Day 3
- P4-x (stretch goals, pick best ROI)

**Week 4: QA + Ship**
- Full playthrough from new game to Chapter 4 (minimum)
- Fix any regressions from above
- Build itch.io zip, test offline (PWA), test mobile layout
- Write itch.io page copy
- Launch

---

## KNOWN STUBS TO NOT TOUCH IN V1.1

These are defined in state but have no update/draw code. Do NOT add them in this sprint — they are post-launch scope:
- `state.pirateRaid` — no update/draw code exists
- `state.fleet` — no update/draw code exists
- `engine.js` plugin system (`registerUpdate`/`registerDraw`) — built but never called
- Old NPC line arrays (`MARCUS_LINES`, `VESTA_LINES`, `FELIX_LINES` at sketch.js ~4244) — superseded by expanded dialogue system, can be deleted in cleanup pass

---

## HONEST ASSESSMENT: What Takes This from 7/10 to 9/10

The game has genuine heart. The exile-to-Imperator arc is real and earned. The procedural lyre music + wave ambience creates something rare in browser games — actual atmosphere. The NPC sprite work is detailed and alive (blink, breathe, emotion states).

What's holding it at 7/10 right now:
1. **Data loss** (diving resources) destroys trust immediately in any player who discovers it
2. **The D-key bug** is embarrassing for a movement game
3. **Empty skill tree** means the combat system delivers XP into a void — players feel cheated
4. **NPC dialogues falling back** to the same line makes the characters feel scripted within 5 minutes
5. **Storms** that don't look like storms are a broken promise — the code says "storm" but players see "slight gray smudge"

Fix those five and you have a 8.5/10 that feels complete. Add the cypress redesign, the island emptiness fix, and the fishing tension — you're at 9/10. The 10/10 is in the opening: if the first 90 seconds on the wreck beach can make a player feel something — lonely, determined, quietly hopeful — the rest of the game delivers on that promise. That's the work.

---

*Sprint Plan written by Aurelian Forge Studio — CEO review*
*Codebase audited: sketch.js (~21k lines), narrative.js, islands.js, diving.js, sound.js, combat.js, economy.js, engine.js*
*Version: v1.0.0 → targeting v1.1.0*
