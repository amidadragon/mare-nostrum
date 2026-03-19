# Mare Nostrum — Retention Systems Design Document
**Date:** March 2026 | **Status:** Pre-implementation brainstorm

---

## Overview

This document covers four retention systems designed to extend replayability beyond Chapter X completion. All systems are designed around p5.js constraints: no build step, single-file draw loop, localStorage state, ~60fps target. Implementation complexity is rated Low / Medium / High relative to the existing codebase.

---

## Part 1 — Random Event System

### Design Goal

Create unpredictable moments that break routine and make each day feel different. Events should be short (resolve in 1–3 in-game days), optional where possible, and reward engagement rather than punish absence. The cozy principle: events are surprises, not crises.

### How It Works

A daily roll at day transition (`onDayTransitionEconomy` or equivalent) checks event eligibility. One event can be active at a time. Events store their state in `state.activeEvent = { id, timer, data }`. Draw-loop and interaction hooks read this object.

Implementation home: `events.js` (new file) with a hook called from the existing day transition in `sketch.js`. Follows the same pattern as `economy.js` — exposes `updateEventSystem(dt)` and `drawEventOverlay()`.

### Time Math Reference

1 in-game day = ~8,000 frames = ~133 real seconds (~2.2 minutes). All timers below are in in-game days. Convert to frames by multiplying by 8,000.

---

### The 18 Events

Each entry: **trigger condition | frequency | reward | NPC reaction hook | implementation complexity**

---

**E01 — Pirate Raid**
A corsair ship appears on the horizon. Player has 1 in-game day to choose: Fight (arm the dock, defeat wave of 8–12 pirates), Trade (pay 30 gold), or Ignore (lose 15 gold and 5 random resources to plunder).

- Trigger: Day 15+, 1-in-10 chance per day, max once every 20 days
- Reward (Fight): 40–60 gold, 1 rare hide, 1–2 iron ore, +1 Marcus hearts
- Reward (Trade): Pirate offers a "contraband crate" (random rare resource: exotic spice or ancient relic)
- NPC reactions: Marcus ("Finally. I've been bored."), Livia ("Don't let them near the granary."), Vesta ("I saw this in the flame last week."), Felix ("I'm documenting this. From behind the wall.")
- Gameplay: Enemies use the existing conquest enemy spawning system. Pirates are a new enemy type: HP 40, damage 8, speed 1.2. 8 pirates at low player level, scaling to 12 at level 15+.
- Complexity: Medium (new enemy type, dock interaction, choice UI panel)

---

**E02 — Festival of Sol Invictus**
The island erupts in celebration. NPCs dance, crops grow twice as fast for 1 day, and a communal feast table appears near Livia's position.

- Trigger: Day 7 + every 28 days after (simulated monthly festival). Can be triggered manually by Vesta quest in Chapter V.
- Reward: 2x crop growth speed for 1 day, all NPCs give a free gift item (no daily limit), Wreath Rating +2 bonus
- Special: If player attends the feast (walks to feast table position, presses E), gains "Festival Blessing" — +20% harvest yield for 3 days, stored as `state.festivalBlessTimer`
- NPC reactions: use existing `getNPCReaction(npc, 'festival')` — already written in narrative.js
- Complexity: Low (day flag, NPC dance animation = use existing idle frames with offset, one interaction point)

---

**E03 — Lost Sailor**
A dinghy drifts in with an exhausted sailor. Player can rescue (bring 3 food within 1 day) or ignore.

- Trigger: Day 5+, 1-in-12 chance per day, max once every 15 days
- Reward (Rescue): 20–35 gold, 1 random tool component, +1 heart with random NPC (sailor knows them from Rome), unlock a one-time "sailor's chart" that reveals a hidden lore tablet location
- Reward (Ignore): Nothing, minor Wreath Rating penalty (-1)
- Complexity: Low (NPC-lite entity at dock position, proximity interaction, food check)

---

**E04 — Earthquake**
The island shudders. 1–3 random buildings take damage (lose 30% of their stored production or require 2 wood + 2 stone to repair). A new cave crack opens on the island, containing 3–6 random resources.

- Trigger: Day 20+, 1-in-20 chance per day. Never within 5 days of the last earthquake.
- Reward: Cave crack yields obsidian (3–6 units), iron ore (2–4), or crystals (2–4), randomly weighted. The crack closes after 1 day.
- Damage: Affected buildings display a visual crack overlay. Player presses E near them to repair (consume 2 wood + 2 stone). No repair = building skips its next production cycle.
- NPC reactions: Marcus ("Structure integrity compromised. Fix the dock first."), Felix ("The scrolls! ... The scrolls are fine. The shelves, however...")
- Complexity: Medium (screen shake already exists, building damage flag, visual crack sprite, resource node)

---

**E05 — Merchant Caravan**
An unusual merchant anchors for 1 day only, selling 3 rare items not available in the regular shop. The selection rotates each visit.

- Trigger: Day 12+, 1-in-8 chance per day, max once every 10 days
- Item pool (pick 3 randomly each visit): exotic spice (50g), ancient relic (80g), titan bone (60g), soul essence (90g), rare hide (40g), legendary seed (70g, grows in 2 days, yields 10 harvest), mystery crate (30g, random contents)
- Complexity: Low (variant of existing merchant UI, timed availability flag)

---

**E06 — Eclipse**
The sun disappears for half a day. Crystal nodes pulse with extra light and yield 2x crystals for the eclipse duration. All enemies gain +15% HP. Vesta has unique eclipse-only dialogue.

- Trigger: Day 30+, 1-in-15 chance per day
- Reward: 2x crystal yield during eclipse (about 4,000 frames = ~half real day)
- Atmosphere: Sky darkens (modify `horizonOffset` draw to darken tones), moon-like lighting, particle effect from crystal nodes
- Special: If player prays at the shrine during eclipse, unlocks a permanent oracle prophecy that gives +2 crystals per prayer going forward
- Complexity: Medium (sky shader mod, crystal node multiplier flag, Vesta dialogue condition)

---

**E07 — Animal Migration**
A seasonal wave of unusual creatures passes through or near the island. Special fish appear in the waters (higher value, new species), and a rare land animal appears on the main island.

- Trigger: Once per season (spring/summer/autumn/winter), randomized within a 5-day window
- Reward: 2 new fish types available for 3 days (see Codex/Collection section for fish types), rare land animal drops 1 titan bone or rare hide on defeat
- Complexity: Medium (conditional fish table mod, temporary animal spawn)

---

**E08 — Blight**
One random crop type becomes diseased. Planted crops of that type die within 1 day unless treated with 2 crystals per plot (Vesta provides the cure).

- Trigger: Day 18+, 1-in-14 chance per day. Does not trigger if player has fewer than 3 active plots of any type.
- Reward for curing: Vesta gives +0.5 hearts, and the cured soil yields 1.5x harvest next cycle ("grateful earth" effect)
- Stakes: Blighted plots turn brown and emit sick particle effect. Max 3 plots affected.
- Complexity: Low-Medium (plot state flag, particle tint, Vesta interaction)

---

**E09 — Wandering Hero**
A named wandering hero (Roman legionary, different each visit) arrives on the island seeking work. Player can hire for 1 day (costs 15 gold) — the hero fights alongside in any combat encounter.

- Trigger: Day 25+, 1-in-10 chance per day, max once every 12 days
- Hero stats: HP 80, damage 12, autonomous combat AI (follows player into conquest/adventure zones)
- Reward: Hirable hero removes 20% of enemy HP from combat encounters that day. Also provides 1 unique lore fragment about Rome (Felix-trackable)
- Complexity: Medium (companion-lite entity using existing autonomous AI patterns from companions)

---

**E10 — Storm Season**
A 2-day storm hits. Fishing yields double, but outdoor farming slows 50%. Ships cannot sail (trade routes pause). Marcus gives storm-specific dialogue.

- Trigger: Tied to existing `state.weather.type === 'rain'` extended to "storm" tier. 1-in-6 chance per day in autumn, 1-in-10 in other seasons.
- Reward: Fishing yields 2x. Storm washes up flotsam on shore (random resources: 2–5 wood, 1–2 stone, occasional rare find)
- Complexity: Low (weather already exists — extend weather.type to include 'storm', add fishing multiplier, flotsam interaction point)

---

**E11 — Roman Census Ship**
An official Roman census ship appears. Player must hide their crystals (store in a "hidden cache" built structure) or pay a 50-gold "tribute" to avoid resource seizure.

- Trigger: Day 40+, 1-in-20 chance per day. Only one occurrence possible per playthrough (thematic — Rome eventually forgets about you)
- Reward (Hide): Nothing, but narrative satisfaction + Livia/Felix dialogue acknowledging the moment with major payoff lines
- Reward (Pay): Lose 50 gold but merchant leaves behind a "roman engineering scroll" — unlocks 1 bonus building blueprint
- Reward (Fight): Can fight off the census guards (8 enemies, tough). Reward: 80 gold + "Rome's Most Wanted" title (cosmetic)
- Complexity: Medium-High (unique narrative event, requires new building or temp "cache" mechanic)

---

**E12 — Crystal Resonance**
All crystal nodes on the island pulse simultaneously and grant a 10-minute (8,000 frame) window where crystal yields are +50% and the oracle is free.

- Trigger: 1-in-20 chance per day after day 15. More likely (1-in-10) at dawn (time 300–420)
- Reward: Crystal harvest bonus, free oracle consultation
- Atmosphere: Crystals emit a visible harmonic ring effect (concentric circle particles pulsing outward from each node)
- Complexity: Low (timed flag + particle effect + oracle cost override)

---

**E13 — Rival Exile**
Another Roman exile washes ashore — but they are unfriendly and try to steal from the player's resource pile. Player can confront (combat), negotiate (give 20 gold), or let them settle (they become a minor trade partner, offering 10 gold per day for 5 days).

- Trigger: Day 30+, 1-in-15 chance per day, max one occurrence per playthrough
- Reward (Settle): 50 gold over 5 days, a new lore fragment, and a one-time item trade
- Reward (Confront): 1–2 enemy combat, drop: 15 gold, 1 iron ore
- Complexity: Medium (unique one-shot NPC, choice panel)

---

**E14 — Philosopher's Visit**
A traveling philosopher arrives and challenges Felix to a debate. The player must bring 3 scrolls (wood + harvest items functioning as scroll materials) to Felix within 1 day to help him prepare.

- Trigger: Requires Felix hearts >= 5. 1-in-12 chance per day after day 20.
- Reward: Felix hearts +1, +30 gold (the philosopher pays for lodging), unlocks a new Felix dialogue tier and "Logic" permanent buff (+5% XP from all sources, stored as passive flag)
- Complexity: Low (item check interaction, flag, XP modifier)

---

**E15 — Shipwreck Debris**
A wreck washes near shore. Player can dive (if diving system is active) or wait — items wash up over 2 days.

- Trigger: Day 10+, 1-in-10 chance per day
- Reward (Dive immediately): 3–5 random items including chance of ancient relic or rare hide
- Reward (Wait): 1–2 items wash ashore automatically (wood, stone, occasional iron ore)
- Complexity: Low (wreck.js already handles diving — this is a reuse of existing system with a timed spawn point)

---

**E16 — Celestial Alignment**
Three of the game's four islands are visible simultaneously on a clear night. Vesta identifies the alignment as sacred. Praying at the shrine during alignment grants a permanent +1 oracle prophecy slot.

- Trigger: Day 60+. Once per playthrough. Requires clear weather. Triggers at night (time 1320+).
- Reward: Permanent oracle slot expansion (stored as `state.oracleSlotsBonus = 1`)
- Complexity: Low (flag check, night condition, shrine interaction)

---

**E17 — Wild Boar Rampage**
A large boar breaks loose from the forest and charges through the island, destroying 1 planted crop and scattering resources from the resource pile (loses 5–10 of a random resource).

- Trigger: Day 8+, 1-in-12 chance per day. Player is warned 1 in-game hour before it arrives (Vesta sees it in a vision).
- Reward (Defeat before it reaches crops): Boar drops 2 rare hide, 1 titan bone. +1 Marcus hearts ("Good hunting.")
- Stakes: If ignored, the crop/resource damage is minor but visible — a cozy motivation to act, not a crisis.
- Complexity: Low (enemy entity with fixed path, pre-alert floating text from Vesta)

---

**E18 — Trireme Regatta**
A passing fleet invites the player to a rowing race. Uses the existing rowing/sailing system. A timed challenge: reach a marker island position faster than the AI trireme.

- Trigger: Day 20+. 1-in-15 chance per day. Only triggers if trireme is repaired.
- Reward (Win): 50 gold, "Champion of the Sea" title, Marcus +1 hearts
- Reward (Lose): 10 consolation gold, Marcus: "You'll row better next time."
- Complexity: Medium (reuses rowing system, adds AI ship target + timer)

---

### Event System Implementation Notes

State shape:
```
state.activeEvent = null | { id: 'E01', timer: 16000, data: { ... } }
state.eventCooldowns = { E01: 0, E02: 0, ... }  // days until eligible again
state.eventHistory = ['E01', 'E03']  // one-shot tracking
```

Day transition roll (pseudocode):
```javascript
function rollDailyEvent() {
  if (state.activeEvent) return;
  let eligible = EVENT_DEFS.filter(e => isEventEligible(e));
  if (!eligible.length) return;
  if (random() < 0.35) {  // 35% chance of any event per day
    let pick = eligible[floor(random(eligible.length))];
    state.activeEvent = { id: pick.id, timer: pick.duration * 8000, data: {} };
  }
}
```

35% daily rate with cooldowns means players see approximately 1 event every 3 days on average — frequent enough to feel alive, rare enough to feel special.

---

## Part 2 — Codex / Collection System

### Design Goal

Give completionist players a reason to engage with every system. The Codex is a Felix-flavored encyclopedia that tracks catches, kills, discoveries, and milestones. Completion rewards should be meaningful but not required for progression.

### Codex Categories

---

**2A — Fish Encyclopedia**

5 base fish types already exist. Expand to 14 total by adding 9 seasonal/island/event-gated variants:

| Fish | Where | Season | Method | Codex Entry Flavor |
|------|-------|---------|--------|--------------------|
| Sardine | Home waters | Any | Net | "Rome's bread and fish." |
| Bass | Home waters | Spring/Summer | Rod | "Patient prey for patient men." |
| Eel | Home waters | Night only | Rod | "Sinuous as a senator's argument." |
| Tuna | Deep water | Summer | Rod (iron+) | "Fought like a gladiator. Lost." |
| Octopus | Home waters | Autumn | Net | "Eight arms and still outsmarted." |
| Cuttlefish | Home waters | Any | Net | "Ink optional. Flavor mandatory." |
| Frost Cod | Hyperborea waters | Winter | Rod | "Cold enough to make a Stoic weep." |
| Lava Eel | Vulcan waters | Summer | Rod | "Technically still alive when caught." |
| Ghost Shrimp | Necropolis waters | Night | Net | "Translucent. Unsettling. Delicious." |
| Sunfish | Migration event (E07) | Any | Rod | "The size of Felix's ego." |
| Sea Turtle | Any | Summer | Observe (E prompt) | "Release immediately. Felix insists." |
| Leviathan Fry | Deep water | Rare (1% catch) | Rod | "Tiny. Terrifying ancestry." |
| Amphora Eel | Wreck diving | Any | Dive | "Living in an amphora. Rent-free." |
| Storm Mackerel | Storm event (E10) | Any | Net | "Only brave fish during storms." |

System interactions: Each new fish feeds into cooking (new recipes), merchant values (each fish has its own `goldPerTrip` if added to TRADE_GOODS), and NPC gifts (Marcus loves fish).

Codex entry shows: fish silhouette (filled when caught, greyed out when not), season indicator, flavor text, "First catch: Day X." Completionist reward: catch all 14 = Felix gives a unique item ("Felix's Illustrated Piscine Compendium") and +1 permanent fishing luck (1.1x bite speed multiplier).

Implementation: Extend `state.fishing.caughtSpecies = {}` map. Existing fishing catch code in sketch.js adds the species key on catch.

---

**2B — Monster Bestiary**

Track every enemy type encountered and killed. 8 enemy types currently implied by combat/conquest system:

| Enemy | Zone | Bestiary Entry |
|-------|------|----------------|
| Forest Boar | Terra Nova | "Tusks like pilum heads. Less accurate." |
| Harpy | Terra Nova / Adventure | "Screams in three dialects." |
| Rock Troll | Terra Nova | "Slow. Unsubtle. Unignorable." |
| Skeleton Warrior | Necropolis | "The Ninth's old enemies, still loyal to spite." |
| Sea Serpent | Water zones | "Hydrodynamic. Unpleasant." |
| Titan | Terra Nova late | "We don't study them. We survive them." |
| Minotaur | Arena | "Arena-bred. Never domesticated." |
| Pirate | Event E01 | "Professionals. The bad kind." |

For each: first kill date, total kills, HP max, damage range (observed), drop table revealed after 3 kills. "Chronicled" when 10 kills logged. Full bestiary completion reward: "Marcus's War Journal" item — grants +5 damage permanently.

Implementation: `state.bestiary = { forestBoar: { seen: 0, killed: 0, chronicled: false }, ... }`. Increment on each enemy kill in the existing death handlers.

---

**2C — Building Blueprints**

Track all 20 building types discovered and built. Some blueprints are unlocked through events rather than just leveling:

- 12 standard blueprints: unlocked by island level (existing system)
- 4 event blueprints: Hidden Cache (E11 reward), Storm Cellar (E10 reward after 3 storms survived), Philosopher's Study (E14 reward), Victory Arch (post-Chapter X)
- 4 island blueprints: discovered on each of the 4 explorable islands (Vulcan Forge, Frost Observatory, Spice Garden, Soul Lantern)

Codex entry shows: building icon, function, when unlocked. Completion reward: all 20 = "Master Builder" title + permanent -10% building cost reduction.

Implementation: `state.blueprintsDiscovered = {}` map with blueprint keys. Most already exist via `BLUEPRINTS` object — just need tracking.

---

**2D — Lore Fragments**

20 lore tablets already exist. Add 10 additional short "lore fragments" found via:
- 4x from wandering hero visits (E09)
- 3x from philosopher's visit reward (E14)
- 2x from rival exile settle outcome (E13)
- 1x from sailor rescue (E03)

Fragments are shorter than tablets — 2–3 sentence vignettes. Felix reads them aloud (one per fragment, unique line each). All 30 collected = "The Complete Archive" — unlocks a special ending journal entry about the Ninth Legion.

---

**2E — NPC Relationship Milestones**

Track relationship progression milestones per NPC:

| Milestone | Trigger | Journal Entry |
|-----------|---------|---------------|
| First gift | Give any gift | "Sharing what we have." |
| First quest | Accept NPC quest 1 | "They trust me with something real." |
| Confidant | Reach 6 hearts | Unique NPC monologue |
| Soulmate | Reach 10 hearts | Unique NPC declaration |
| All quests done | Complete NPC quest 3 | "Their story, fully known." |

4 NPCs x 5 milestones = 20 relationship entries. Full completion reward: group scene unlocks — the four NPCs gather at the feast table and exchange cross-reference dialogue (each NPC references another, payoff for players who know all their stories).

---

**2F — Cat Collection**

The existing cat adoption system is a natural Codex category. Each cat has a name, description, and trait. Codex tracks: found date, name, current location on island.

Target: 10–12 cats total (if not already at this count). Felix narrates each entry. Full collection: Felix says "I have become the Library of Cats" and grants the player a unique cat companion with a special ability (e.g., the cat sits near resource nodes and occasionally yields +1 of that resource).

---

### Codex UI Implementation

The Codex is a UI panel accessible via a dedicated key (e.g., `C`). Structure:
- Tab bar: Fish | Monsters | Buildings | Lore | Relationships | Cats
- Grid of entries (greyed silhouettes for undiscovered)
- Felix's portrait in corner with dynamic commentary based on completion percentage
- Completion bar per category + grand total

State: `state.codex = { fish: {}, monsters: {}, buildings: {}, lore: {}, relationships: {}, cats: {} }`.

Implementation complexity: Medium-High. The UI is the largest lift. The tracking hooks are all Low — one-line increments on existing events.

---

## Part 3 — Seasonal Content

### Season Structure

The existing season system (spring/summer/autumn/winter) already exists in `state.season`. Each season should have at least 3 meaningful differences that affect strategy. Currently seasons affect mainly weather probability and ambient audio. Here is what should change per season:

---

**Spring**
- Crops: +20% growth speed. All seed types available from shop.
- Fishing: Sardine, Bass run — 40% higher catch rate on rod.
- Events: Festival of Sol Invictus (E02) most likely. Blight (E08) highest risk.
- Weather: Rain 40%, Clear 55%, Storm 5%.
- Ambient: Lyre switches toward "peaceful" mode more often.
- Special: First day of spring, all NPC hearts increase by 0.5 (spring warmth). Felix gives a seasonal observation dialogue.

**Summer**
- Crops: Standard growth. Exotic spice grows only in summer (Plenty Island).
- Fishing: Tuna, Sunfish. Sea Turtle observation possible.
- Events: Animal Migration (E07) peaks. Eclipse (E06) possible.
- Weather: Clear 75%, Rain 20%, Storm 5%.
- Special: Crystal nodes yield 1 extra crystal at peak noon (time 720). Oracle visions are clearer — prophecy hints are more specific.

**Autumn**
- Crops: -15% growth speed but harvest yields +10% (abundance modifier). Wine grape yield +25%.
- Fishing: Octopus, Cuttlefish. Storm Mackerel available if storm hits.
- Events: Pirate Raid (E01) more likely (trading season). Storm Season (E10) peaks.
- Weather: Rain 50%, Clear 40%, Storm 10%.
- Special: Wreath Rating evaluations are weighted toward harvest quantity in autumn — the island judges abundance. Merchant Caravan (E05) has an expanded autumn stock.

**Winter**
- Crops: -30% growth speed. No exotic growth on Plenty Island. But storage ferments wine to "aged wine" worth +30% more gold.
- Fishing: Frost Cod (Hyperborea only), Eel peak.
- Events: Earthquake (E04) more likely (frost heave logic). Celestial Alignment (E16) possible.
- Weather: Rain 30%, Clear 40%, Storm 20%, Snow (visual only, no gameplay effect) 10%.
- Special: Night is longer (time shifts — `state.sunriseTime += 60`, `state.sunsetTime -= 60`). Crystal nodes glow brighter at night (atmosphere). Vesta has winter-only dialogue about Sol Invictus's absence.

---

### Per-Season Player Goals

To give players a seasonal loop, the Wreath Rating system evaluates different things each season:

- Spring: Planting count, NPC hearts
- Summer: Combat victories, island exploration
- Autumn: Harvest yield, trade route income
- Winter: Building count, crystal stock, fishing catches

This makes each season a "soft challenge" with a different focus. The evaluation is advisory (Wreath Rating bonus only) — it does not lock content, but players who optimize for it get a meaningful gold/resource reward and a unique daily title.

---

## Part 4 — Endgame Loop (Post-Chapter X)

### Problem Statement

After Chapter X (Imperator reached, all NPCs at max hearts, Chapter X narrative complete), the player has: no more main quests, no more NPC quest chains, fully developed island, potentially all systems explored. The loop needs to sustain engagement for players who want to continue.

### The Three Endgame Pillars

---

**Pillar 1 — The Legacy Project (Ongoing construction goal)**

After Chapter X, Livia proposes the "Eternal City" — a collaborative island upgrade project. This is a prestige building chain: 5 Wonders of Mare Nostrum, each requiring massive resources and unlocking cosmetic/quality-of-life rewards.

| Wonder | Cost | Benefit |
|--------|------|---------|
| Temple of Sol Invictus | 100 stone, 50 crystals, 20 gold | Oracle prophecies become 100% accurate (no more vague hints) |
| The Imperial Baths | 80 stone, 40 wood, 30 gold | Visiting NPCs restore 20 HP to player on proximity |
| Forum of the Ninth | 60 stone, 60 wood, 50 gold | NPC gift interactions unlock daily bonus dialogue scene |
| The Eternal Lighthouse | 40 stone, 20 crystal, 30 iron | Fishing yield +25% permanent, new fish species appear |
| The Victory Arch | 100 stone, 50 iron, 100 gold | Unlocks "New Game Plus" flag + cosmetic golden player sprite |

Each Wonder has a building ceremony (animation + NPC dialogue scene). All 5 complete = Felix writes a final chapter of his manuscript dedicated to the Wonders — full text shown as a closing ceremony.

This is not a new game — it is a reason to keep farming resources. All Wonders are visible in the build menu after Chapter X, grayed out until the prerequisites are met.

Implementation: Add to BLUEPRINTS with `requiresChapter: 10`. Standard building system, no new architecture.

---

**Pillar 2 — Endless Arena**

After Chapter X, the Arena on Terra Nova transitions to "Endless Mode." Wave count no longer caps. Instead:

- Waves 1–10: Normal difficulty (existing scaling)
- Wave 11–20: Elite tier — enemies have 1.5x HP, new elite variants (armored boar, champion pirate, undead centurion)
- Wave 21+: Legendary tier — enemies have 2x HP, boss-type enemies every 5th wave, new enemy type (Titan Guard, HP 300, damage 20)

Endless Arena rewards:
- Personal best wave tracked in `state.arenaRecord`
- Every 5-wave milestone: gold reward (15g × wave milestone), rare drop (1 item from a "arena loot table")
- Wave 20 clear: Unlocks "Gladiator Eternal" title + cosmetic armor variant (Marcus comments: "You've earned that.")
- Wave 30 clear: "Champion of Champions" — a legendary sword (damage 40) available as a cosmetic variant

This gives combat-focused players a pure mastery challenge. Scores persist in localStorage for bragging rights.

Implementation: Extend existing arena wave system with `state.arenaEndlessMode = true` flag post-Chapter X. Modify wave cap check to not terminate at wave 10.

---

**Pillar 3 — New Game Plus (NG+)**

After completing the Victory Arch (Pillar 1, final Wonder), a "New Voyage" option appears on the main menu. NG+ carries over:

- Player level and skill tree
- Codex completion (fish caught, bestiary, lore)
- Cat collection
- NPC relationship tier titles (but hearts reset to 2 for each NPC — "old friends, starting fresh")
- Gold: 50% of current gold (cap 200g carried over — enough to skip early grind, not enough to trivialize)

NG+ changes:
- Events trigger 1.5x more frequently
- Pirate raids are harder (12 fixed pirates, 2 waves)
- Seasonal durations compressed by 20% (faster pace)
- New NG+-exclusive lore fragment reveals the fate of the original Ninth Legion colony
- Chapter X reward: instead of "Imperator," the title becomes "Imperator Eternus" — cosmetically distinct ending

This creates a genuine replay arc for players who want to experience the story again with mastery.

Implementation: NG+ flag stored in localStorage meta (outside `state`). `initState()` checks for NG+ flag and applies carry-overs. Low architectural impact.

---

### Secondary Endgame: Seasonal Records

Post-Chapter X, each completed season adds to a "Season Chronicle" — a Felix-narrated record of what happened that season. It tracks: crops harvested, fish caught, enemies defeated, events encountered, Wreath Rating average.

The Chronicle is a pure flavor system but gives players a record of their run and something to compare across seasons. It also surfaces interesting numbers ("you harvested 847 grain this summer") that naturally motivate "can I beat that?" thinking.

State: `state.seasonChronicle = [{ season: 'summer', year: 2, crops: 847, ... }, ...]`

---

## Implementation Priority

Ordered by impact-per-effort ratio:

1. **High impact, Low effort**: Storm event (E10) — extends existing weather system. Festival (E02) — day flag + NPC animations. Crystal Resonance (E12) — pure flag + particle effect.
2. **High impact, Medium effort**: Fish Encyclopedia (Codex 2A) — tracking hooks are trivial; 9 new fish need catch-table entries. Pirate Raid (E01) — highest narrative impact, reuses combat. Seasonal content modifiers — fits into existing day transition code.
3. **High impact, High effort**: The Legacy Project (Wonders) — large resource costs, meaningful rewards, straightforward BLUEPRINTS extension. Endless Arena — minimal new code, high replayability. Codex UI — the panel is the work, the data is easy.
4. **Moderate impact, Low effort**: Merchant Caravan (E05) — variant merchant panel. Lost Sailor (E03) — minimal entity. Shipwreck Debris (E15) — reuses diving.js.
5. **Lower priority**: New Game Plus — carry-over logic needs careful save format work. Roman Census Ship (E11) — requires new building type (Hidden Cache).

---

## Balance Guardrails

- Events should never stack negative consequences. If Earthquake (E04) and Blight (E08) would fire the same week, suppress one (add mutual cooldown).
- Seasonal modifiers are bonuses or mild penalties — never lockouts. A player who loves farming in winter should still be able to farm, just slower.
- Codex completion rewards are quality-of-life, not power creep. A player who ignores the Codex is not weaker; a player who completes it is slightly smoother.
- Endless Arena and the Wonders are opt-in. Neither should gate any narrative content.
- NG+ carries over enough to feel powerful but not enough to feel trivial. The early island levels should still feel real.

---

*End of document. Implementation notes for specific systems can be written as separate documents when feature work begins.*
