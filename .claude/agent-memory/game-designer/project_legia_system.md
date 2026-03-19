---
name: Legia Military System
description: Castrum building and legion training system added March 2026 — key locations and balance values
type: project
---

Full legia system added to sketch.js. Key details:

**State**: `state.legia` — recruits, maxRecruits (5/10/20 by tier), trainingQueue, trainingTimer, castrumLevel (0-3), castrumX/Y, deployed, legiaUIOpen

**Blueprint**: `castrum` in BLUEPRINTS at line ~228. Cost: 10 stone + 8 wood + 5 ironOre + 50 gold. minLevel: 8. 52x40.

**Key functions** (all in sketch.js, near the FOG OF WAR section ~line 15800):
- `updateLegia(dt)` — training timer countdown, recruit ready notifications
- `handleLegiaKey(k)` — [1] train (20g + 1 meal, 300 frames), [2] upgrade castrum
- `drawLegionPatrol()` — animated soldiers patrol near castrum in island context
- `drawLegiaUI()` — parchment panel, keyboard-driven

**Hooks**:
- `placeBuilding()` — sets castrumLevel=1 on first castrum placed, blocks second
- `updateLegia()` called from main island update loop
- `drawLegionPatrol()` called inside the island translate() context (before buildGhost)
- `drawLegiaUI()` called in the 2D UI layer (with drawSkillTree etc.)
- E key on home island: opens/closes legiaUI if within 50px of castrum
- ESC key: closes legiaUI
- Number keys blocked during legiaUI via `handleLegiaKey()`

**Expedition integration** (in exitConquest / enterConquest flows):
- Embark: all recruits become `deployed`, recruits=0 — in both ENTER-key and double-click paths
- `conquestPlayerAttack()` — dmg *= (1 + deployed * 0.15) for +15% per soldier
- `exitConquest()` — lootBonusMult *= (1 + deployed * 0.10), goldEarned *= (1 + deployed * 0.15)
- On return: each soldier has 20% death chance, survivors return to recruits; all lost on death-exit

**Castrum upgrade costs**:
- Tier 1->2: 100g + 20 stone → maxRecruits 10
- Tier 2->3: 300g + 50 stone + 10 ironOre → maxRecruits 20

**Why:** Gives a dedicated military progression path separate from the Terra Nova expedition soldiers (state.conquest.soldiers). Legia are home-island trained, expedition-deployed.
