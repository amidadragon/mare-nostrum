---
name: Retention Systems Design
description: 18 random events, Codex/Collection system, seasonal modifiers, and endgame loop design for post-Chapter X engagement
type: project
---

Design document written to /Users/ioio/mare-nostrum/RETENTION_SYSTEMS_DESIGN.md in March 2026.

**Why:** Requested brainstorm on systems to extend replayability beyond Chapter X completion (Imperator level 25).
**How to apply:** Reference this when implementing any of these systems — all design numbers, priority order, and state shape decisions are in that file.

## Key Decisions

### Random Events
- 18 events total in events.js (new file, same pattern as economy.js)
- State shape: `state.activeEvent = { id, timer, data }` + `state.eventCooldowns = {}` + `state.eventHistory = []`
- Daily roll: 35% chance of triggering an eligible event. Cooldowns per event prevent spam.
- 1 in-game day = 8,000 frames. Event timers in days × 8000.
- E01 Pirate Raid, E02 Festival, E07 Migration, E10 Storm are highest priority (impact/effort).

### Codex
- 6 categories: Fish (14 total — 5 existing + 9 new), Monsters (8 types), Buildings (20 + 4 event-gated), Lore (20 tablets + 10 fragments), Relationships (20 milestones), Cats
- State: `state.codex = { fish: {}, monsters: {}, buildings: {}, lore: {}, relationships: {}, cats: {} }`
- Codex UI key: C. Felix-flavored panel with tabs.
- Fish encyclopedia completion = permanent 1.1x bite speed bonus.
- Bestiary completion = +5 damage permanent.
- Building completion = -10% build cost.

### Seasonal Content
- Spring: +20% crop growth, Blight risk highest
- Summer: Standard + eclipse possible, crystal noon bonus
- Autumn: -15% growth, +10% yield, Storm/Pirate events peak
- Winter: -30% growth, longer nights, Frost Cod available
- Wreath Rating evaluates different criteria per season (advisory, not blocking)

### Endgame Loop (3 Pillars)
- Pillar 1: Legacy Project — 5 Wonders of Mare Nostrum (prestige building chain, post-Chapter X BLUEPRINTS entries with requiresChapter: 10)
- Pillar 2: Endless Arena — wave scaling beyond current cap, wave 20/30 milestones, personal best tracked in `state.arenaRecord`
- Pillar 3: New Game Plus — triggered by Victory Arch completion, carries level/codex/cats/50% gold, hearts reset to 2, 1.5x event frequency

### Implementation Priority Order
1. Storm event, Festival event, Crystal Resonance — Low effort
2. Fish Encyclopedia tracking hooks, Pirate Raid, seasonal modifiers — Medium effort
3. Legacy Project Wonders, Endless Arena, Codex UI — High effort
4. Merchant Caravan, Lost Sailor, Shipwreck Debris — Low-Medium effort
5. New Game Plus — careful save format work needed
