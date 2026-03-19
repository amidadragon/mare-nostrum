# CEO_REVIEW.md — Sprint V1.1 Audit
*Aurelian Forge Studio — Second Sprint Review*
*Code read: sketch.js (21,386 lines), sound.js (917), diving.js (603), islands.js (574), narrative.js (880), combat.js (334)*

---

## What Sprint 1 Agents Actually Delivered

Before naming new problems, the record needs to be set straight on what was claimed vs. built.

**Confirmed delivered and working:**
- Cypress trees fully rewritten (8-layer tapered column, per-layer sway, 3-shade color system, pointed tip triangle, bark detail). The flash/ugly issue is resolved.
- Thunder bug fixed. Old code fired `playSFX('thunder')` on a `random() < 0.002` check every frame — ~7 thunder cracks per second at 60fps. New code uses a proper countdown timer (1200-2400 frames, ~20-40 seconds). Sound.js lines 275-284.
- Diving resources (pearls/coral/sponges/amphoras) are saved to localStorage. Lines 19250-19253 in saveGame(), lines 19445-19448 in loadGame(). The P1-2 data loss bug is gone.
- Build ghost floating — `drawBuildGhost()` correctly subtracts floatOffset when converting mouse to world coords (`s2wY(mouseY - shakeY - floatOffset)` at line 7492), and renders inside the `translate(shakeX, shakeY + floatOffset)` block. Math checks out. The ghost aligns with placed buildings.
- Skill tree UI is fully implemented in combat.js (drawSkillTree, handleSkillTreeClick, SKILL_DEFS with 9 skills across 3 branches). It's wired into sketch.js draw loop at line 1945. Players CAN spend skill points. This was listed as a P1 blocker — it's not a blocker anymore.
- NPC dialogue fallback fixed. `getExpandedDialogue()` in narrative.js lines 436-443 now relaxes to hearts-only filter, then full pool as last resort. No more single-line loops.
- Chapter 7-10 narrative flags (forge_vulcan_blade, learn_ritual, final_inscription, rite_mare_nostrum) all have setters — islands.js lines 367-374, 464-470; sketch.js lines 18300-18307; narrative.js line 733. Chapters complete.
- Ambient ships implemented and called at line 1691 in the home island draw path.
- Zone-based expansion exists (levels 2-5 hardcoded, levels 6-25 procedural). Grass tufts added per level (20 + lvl*2 per expansion at lines 21351-21373). Trees added procedurally (4+lvl per expansion at line 21331).

---

## What Is Still Broken — Honest Findings

### 1. Ambient Ships Are Invisible in Practice

The ships exist. The math is wrong for visibility.

Ships orbit at `dist: random(1200, 2500)` world units from island center. At default camera zoom, 1 world unit = 1 screen pixel. A ship hull 20 world units wide at 2000 units away would appear at the horizon as a 10-pixel silhouette on a noisy animated ocean. The `distFade` formula (`constrain(1 - abs(sy - height * 0.4) / (height * 0.4), 0.2, 1)`) applies to ships that land near screen Y = 40% of height — but ships at 2000 world units out with typical island at screen center will have `w2sY(wy)` returning values near the horizon line which is `max(height * 0.06, height * 0.25 - horizonOffset)`, nowhere near `height * 0.4`. The ships are there but players won't see them.

**File:** `sketch.js`, `drawAmbientShips()` at line 2770
**Fix:** Reduce orbit dist to `random(600, 1000)`. At 700 units out, a ship is solidly in the visible ocean band. Also scale hull up: `sc = ship.size * distFade` currently produces ~0.3-0.6x scale; set base size to 1.8 so the hull is 36px wide on screen. The `sy > height - 30` cull guard is too aggressive — change to `sy > height - 10`.

**Impact/Effort:** HIGH/S — this is a 4-number change that delivers a visible feature already fully coded.

---

### 2. Iron Ore Is Gated Behind Combat — Mid-Game Economy Wall

Iron ore drops only from conquest island combat (lines 15051, 15070). Every building above level 5 that needs iron (watchtower: 4 iron, bridge: 8 iron, expedition upgrades) is therefore gated behind entering the conquest island. The Quarrier companion mines stone, not iron. There is no iron node on the home island.

This creates a hard wall: players who prioritize building and NPCs over combat can hit a point where they can't build the watchtower, can't afford expedition upgrades, and don't understand why. The conquest island is also locked behind `villaCleared` (NPC hearts requirement). So a player who hasn't found Livia yet literally cannot obtain iron ore in any way.

**File:** `sketch.js`, `expandIsland()` at line ~21130
**Fix:** At island level 7-8, spawn 2-3 iron ore nodes (type 'iron_ore', not linked to any existing resource system). Add a simple respawn timer matching the existing stone/vine node pattern. Alternatively, let the Quarrier have a 10% chance per mine cycle to yield 1 iron_ore when mining stone nodes at island level 7+. The quarrier update loop is at line 9856 — it's a 3-line addition.

**Impact/Effort:** HIGH/S — removes a progression wall that no new player will understand.

---

### 3. Storm Visual Is Still Underwhelming

The sprint plan (P1-6) called for expanding clouds from 4 to 12-16, covering y 0.02-0.35, dimming the sun, adding a color overlay, and adding drifting foreground clouds. What was actually delivered: 12 clouds (lines 2568-2574) at y range 0.03-0.20. That's progress from 4 clouds but:

- The clouds at 0.03-0.20 still leave the bottom 80% of sky clear.
- The sun dimming code at line 2255 uses `stormActive ? 0.2 : 1` — sun is correctly dimmed, this works.
- No dark color overlay over the island exists.
- No drifting foreground cloud layer.
- The `drawStormClouds()` function renders all 12 clouds using the same `(25, 32, 50, 160 * intensity)` fill. At full intensity, alpha = 160 on an ellipse with `r * 2.2` width and `r * 0.7` height. These are flat dark blobs. They read as "overcast" not "storm."

The result is a 6/10 storm. A player on itch.io screenshots this and writes "weather effects feel half-done."

**File:** `sketch.js`, `drawStormClouds()` at line 2565, `drawSky()`, `drawOcean()`
**Fix (specific):**
1. After `drawOcean()` and before `drawIsland()`, add a full-screen storm overlay: `fill(20, 25, 40, 45 * intensity); noStroke(); rect(0, 0, width, height)` inside the draw loop for `stormActive`.
2. In `drawStormClouds()`, add 4 large foreground clouds: `{ x: 0.1, y: 0.28, r: 220 }, { x: 0.4, y: 0.32, r: 200 }, { x: 0.7, y: 0.26, r: 240 }, { x: 0.9, y: 0.30, r: 180 }`. These push the cloud base down to 30% of screen height and feel physically present.
3. Per-cloud x drift: store `state.stormClouds = cloudData.map((c,i) => ({...c, drift: 0}))` and increment `drift += 0.0003 * intensity` each frame. Use `c.x * width + c.drift * width` as the cx.

This is a 20-line fix that transforms storm from "slight overcast" to "actual storm."

**Impact/Effort:** HIGH/M

---

### 4. Port Interaction Breaks on High-Level Islands (The Actual Bug)

The "ports keep breaking at different levels" has a specific and discoverable cause. `ship.dockX` is computed fresh every frame: `WORLD.islandCX + getSurfaceRX() * 1.12` at line 11924. That's correct and grows with island. The player proximity check `dist2(player, ship.dockX, ship.dockY) < 120` at line 11964 should work.

The LEFT port (rowboat) is the one that breaks. It's stored to localStorage and loaded back. The stored `portLeft` contains coordinates at the time of last save. On load, line 19374 restores it: `if (d.portLeft) state.portLeft = d.portLeft`. The boat interaction at line 18266 uses `port.x - 80` as the boat's world position. The player snap-back on disembark also uses `port.x - 40` (line 18256).

The bug: `portLeft.x` is `WORLD.islandCX - srx - 20` where `srx = getSurfaceRX()`. If the player saves at level 10 (srx ~600), portLeft.x ~= 600 - 600 - 20 = -20. If they load a NEW game and this saves stale — no, the `d.portLeft` guard prevents bad loads.

The real issue is subtler: `getPortPosition()` is called to get the LEFT port for rowboat interaction. But the merchant pier drawing (`drawMerchantPort()`) uses `getMerchantPortPosition()` which returns `portRight`. If `portRight` was saved at a different island level than `portLeft`, and `updatePortPositions()` isn't called after load (line 19376 only calls it if BOTH are null), then either port can be stale post-expand.

The actual break pattern: island expands, `updatePortPositions()` is called (line 21134), updates portLeft/portRight to new positions. Save. Load. Ports restored from save. Expand AGAIN before next save. `updatePortPositions()` updates live state but NOT the saved values until next save. This is fine on the current session. But if a crash/reload happens between expand and save, portLeft/portRight in localStorage are one level behind. The rowboat prompt appears 20-40 units to the left of where it should, the `dist < 60` check passes only at the old position, and the player can't board from where the visual boat appears.

**File:** `sketch.js`, `saveGame()` line 19132
**Fix:** Remove `portLeft` and `portRight` from saveGame() entirely. Remove lines 19205-19206 and 19374-19375. Instead, always recompute ports on load by calling `updatePortPositions()` after `islandRX` and `islandRY` are restored (line 19454 is where they're loaded — add `updatePortPositions()` right after). Ports are derived values; they don't need to be persisted.

**Impact/Effort:** HIGH/S — 4 line deletions + 1 line addition. Eliminates the class of port mismatch bugs permanently.

---

### 5. Fishing Has Zero Tension — The "!!" Text Doesn't Work

The sprint plan called for a bobber dip animation, sound feedback, and a timing window. What was delivered: the bite state at line 8607-8616 renders `'!! PRESS F !!'` text in a pulsing color and draws 3 random pixel splashes. That's all. No bobber dip. No pitched SFX. No timing window — if you press F within 50 frames of bite (line 8524), you catch the fish. If you wait longer, bite resets silently (`f.bite = false` with no message at line 8527). Players fish, see nothing happen, press F randomly, occasionally get fish.

The fishing mini-game is not a mini-game. It's a timer with a text prompt. For a cozy life-sim where fishing is one of three primary activities alongside farming and building, this is a 4/10 experience attached to an 8/10 game.

**File:** `sketch.js`, `drawFishing()` at line 8585 and `updateFishing()` at line 8511
**Fix (specific code-level):**

In `updateFishing()` near line 8514, add a `biteFlash` counter to `state.fishing`:
```
// At bite trigger (line 8515):
f.biteFlash = 8;    // 8-frame bobber dip
if (snd) snd.playSFX('pluck');   // existing SFX
spawnParticles(state.player.x + (state.player.facing === 'left' ? -30 : 30),
               state.player.y + 5, 'splash', 4);
```

In `drawFishing()` at line 8598, add bobber dip:
```
let bobberDip = (f.biteFlash > 0) ? 6 : 0;
f.biteFlash = max(0, (f.biteFlash || 0) - 1);
let lineEndY = rodEndY + 25 + sin(frameCount * 0.1) * 3 + bobberDip;
```

In the miss case (line 8527, `f.bite = false`), add:
```
addFloatingText(w2sX(state.player.x), w2sY(state.player.y) - 40, 'Got away!', '#88aacc');
if (snd) snd.playSFX('splash');
```

These three changes create: a visible bobber dip, a sound cue, a splash particle burst, and a miss message. 15 lines of code. Fishing goes from 4/10 to 7/10.

**Impact/Effort:** HIGH/S

---

## Summary Rankings by Impact/Effort

| # | Issue | Impact | Effort | Rank |
|---|-------|--------|--------|------|
| 4 | Port interaction breaks | High — players can't leave island | S (5 lines) | 1 |
| 1 | Ambient ships invisible | High — visual feature missing | S (4 numbers) | 2 |
| 2 | Iron ore gated behind combat | High — economy wall | S (3 lines in quarrier) | 3 |
| 5 | Fishing has no tension | High — core activity feels flat | S (15 lines) | 4 |
| 3 | Storm visual underwhelming | Medium — atmosphere broken promise | M (20 lines) | 5 |

---

## The Honest Gap Assessment

Sprint 1 shipped real fixes. The codebase is in better shape than the sprint plan suggests — several P1 blockers are already resolved. The game can be played from wreck to chapter 10 without hitting hard data loss or broken controls.

What separates this from 5-star itch.io territory right now:

**The ambient layer is thin.** The ocean is gorgeous. The island music is genuinely special. But the ocean has 4 ships that are effectively invisible and a storm that looks like a gray tint. A player who plays for 30 minutes will see the game's beautiful bones but not feel the world is alive around them. The ambient ships fix and storm fix together take ~3 hours and triple the atmospheric density.

**The fishing economy.** Fishing is listed as a core loop pillar. If fishing feels like pressing F on a schedule, players discover farming is strictly better and fishing becomes dead content by day 5. The 15-line fix above would make fishing something players actively look forward to rather than a background task.

**The iron ore wall.** Any player who tries to build the watchtower or craft the steel pickaxe before colonizing will hit an invisible wall. They'll look at their inventory, see zero iron, see no iron source on the island, and either consult the wiki or quit. There is no wiki. This is a retention killer at the exact mid-game moment when players are deciding if this is a game they'll finish.

Fix those three and you have an 8.5/10 that deserves the front page.

---

*Review completed by Aurelian Forge Studio CEO*
*Code read: March 2026*
*Next review trigger: after ambient ships, port fix, and fishing tension are shipped*
