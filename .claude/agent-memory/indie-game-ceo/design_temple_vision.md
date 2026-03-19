---
name: Temple Five-Tier Progression Vision
description: Complete redesign spec for drawPyramid() — five tiers of exterior + interior evolution, crystal beacon system, scale fix, and visual dominance rules
type: project
---

Full design spec written to `/Users/ioio/mare-nostrum/TEMPLE_VISION.md`.

**Why:** Current temple has scale caps that kick in before level 10, making levels 10-25 visually stagnant. Interior is static regardless of progression. Temple doesn't read as dominant vs surrounding buildings.

**Key decisions:**

- `getTier(lvl)` helper: 1-4→T1, 5-8→T2, 9-14→T3, 15-19→T4, 20-25→T5
- Remove `min()` caps on `baseW` and `colH` — replace with tier-based scaling formulas
- Five distinct visual identities: crude altar → naos → grand Roman temple → monumental imperial → crystal beacon
- Crystal growth starts at level 20 (onset), full by level 23
- Golden beam (night only): 3-pass stroke render, 400px tall, 8s pulse cycle
- Crystal ring orbit: 12 shards, isometric ellipse, level 23+
- Exclusion zone scales per tier: 45 / 65 / 85 / 110 / 130 px
- Stone plaza ground circle drawn BEFORE buildings at Tier 3+ (level 9+)
- Temple drawn LAST in island render order (after all buildings/trees/NPCs)

**Interior tiers:**
- T1: single room, crude altar, random daily blessing mechanic
- T2: floor tile, wall mosaic (geometric), oracle niche stub
- T3: grand hall (500×360), oracle pool with daily prophecy (Livia as oracle), trophy wall (6 relics from milestone flags)
- T4: three wings — altar/trophy, oracle pool, new WAR ROOM (Marcus + map table + expedition view)
- T5: crystal sanctum, floating altar, Crystal Nexus shows island overview map, Memory Wall (auto-filled relief panels from chapter flags), 3s nexus proximity triggers lyre echo mode

**How to apply:** When implementing temple changes, check TEMPLE_VISION.md for pixel-level color values, draw call pseudocode, and animation specs. The document includes a 12-step implementation order with time estimates.
