---
name: Retention System Design
description: Prioritized retention features for Mare Nostrum — daily hooks, long-term progression, emergent content
type: project
---

Retention brainstorm completed 2026-03-19. Full doc at `/Users/ioio/mare-nostrum/RETENTION_BRAINSTORM.md`.

**Why:** The game has a complete narrative arc (Ch I–X) but no daily pull after endgame. NPCs go silent after heart max. Trade is passive. Nothing brings players back tomorrow.

**The one-sentence diagnosis:** Mare Nostrum has a great first playthrough and a weak second day.

## Top Priority Features (by impact/effort)

**Sprint 1 — Do Now (1–3 days each):**
1. Daily notice board bounties — 3 per day, seeded from real calendar date
2. Rotating merchant stock — "Hanno the Merchant," 3 daily items, weekly market day with 5 items
3. Naturalist's Codex — Fish Log (12 species), Crop Almanac, Bestiary (15 enemies), Relic Registry (20 tablets)
4. Farming + fishing combos — harvest 3+ in 2s = x1.5 multiplier; fishing three-phase timing
5. Screenshot mode — F9, HUD toggle, 6 filters, shareable caption

**Sprint 2 — Medium Effort, Major Retention:**
6. NPC daily wants + favor system — each NPC has 3 daily asks (gift/favor/activity), favor points unlock post-endgame quests
7. Seasonal festivals — Saturnalia (winter), Floralia (spring), Ludi Romani (summer arena tournament), Lemuria (dark autumn)
8. Random world events — pirate raid, harvest windfall, crystal surge, plague of mice, wandering soldier
9. Dynamic economy — price fluctuation by season/weather/events, market bulletin, export contracts
10. Cooking recipes with effects — 12 recipes, each with a gameplay buff when eaten or gifted

**Sprint 3 — Depth:**
11. Secret areas — one per island (home: Founders' Hollow, Vulcan: Cold Vent, Hyperborea: Ice Mirror, Necropolis: Room 13)
12. Cosmetic unlock system — building variants, path materials, character cosmetics, wardrobe panel
13. Achievement system — 30 achievements across 5 categories, journal tab
14. NPC-NPC relationship scenes — Felix+Livia first (their untold history)
15. Weather gameplay effects — drought irrigation, fog-exclusive fish species, storm doubles fish yield

**Sprint 4 — Long-term:**
16. Iron Exile hard mode (permadeath + harsher conditions)
17. New Game+ / Legacy mode (retains cosmetics + codex)
18. Isle of Hermes (5th island — other exile colonies, near-multiplayer feel)
19. Instrument minigame (lyre at lute building, Dorian mode puzzle)
20. Weekly community challenges (static JSON fetch, gracefully offline)

## The Single Highest-ROI Move
Daily merchant (Hanno) + NPC daily wants system. ~3 days of work. Answers "why come back tomorrow?" with a concrete daily pull. Everything else amplifies this.

**How to apply:** When prioritizing what to build next, check this list. Don't build Sprint 3 features until Sprint 1 is shipped and playtested.
