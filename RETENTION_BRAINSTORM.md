# MARE NOSTRUM — RETENTION BRAINSTORM
*Compiled 2026-03-19*

---

## Context: Where We Are

The game has a complete narrative spine (10 chapters), real production chains, 4 explored islands, 4 NPCs with full quest chains, and a satisfying arc from castaway to Imperator. The emotional core is "rebuilding from nothing, becoming something." That's strong.

The retention problem is structural: once a player finishes Chapter X, there is nothing pulling them back tomorrow. The day/night/season cycle exists, but it doesn't create daily stakes. The NPC hearts system is a one-time grind, not an ongoing relationship. The trade routes are passive income, not active decisions.

This brainstorm identifies what to add — and more importantly, what the *minimum viable hook* looks like for each.

---

## THE TOP 10 — PRIORITIZED BY IMPACT/EFFORT RATIO

### #1 — The Merchant Calendar (Daily Rotating Stock)
**Category:** Daily/Weekly Hooks
**IMPACT: 5 | EFFORT: 2 | PRIORITY: 10/10**

A roving merchant ship appears at the dock every morning with 3 randomized items for sale. Stock rotates on real calendar days (seeded by day number). Some items are time-locked rarities: a particular dye, a foreign seed variety, a relic fragment only sold on market days.

**Why this works:** It costs nothing to check. Players open the game just to see what's available. FOMO is powerful when scarcity is real.

**Implementation:**
- Seed `Math.random` with `Math.floor(Date.now() / 86400000)` to get a consistent daily seed
- Pool of ~30 merchant items: exotic seeds (silk cotton, saffron, imported emmer), rare tool upgrades, cosmetic fragments, relic shards, specialty food
- 3 slots, each item visible in limited quantity (1–3 units), gone when bought
- Merchant ship animation is already in the codebase — give it a named NPC: "Hanno the Merchant"
- Add one "market day" per week (Saturdays) where Hanno carries 5 items and a chance at something unique (a new building schematic, a second-island seed, or a legendary item)

**Specific daily items (examples):**
- Saffron seeds (only grows in summer, makes Saffron Bread, best gift for Vesta)
- Silk thread (needed for Governor's Sash cosmetic)
- Cretan amphora (doubles wine storage capacity)
- Etruscan coin mold (converts gold to "denarii" at 2:1 — new currency for premium shop)
- Terra Nova seed pack (unlocks a crop only growable on the colony)

---

### #2 — NPC Daily Schedules + Favor System
**Category:** Long-term Progression / Emergent
**IMPACT: 5 | EFFORT: 3 | PRIORITY: 8.5/10**

Right now NPCs wander and give quests. After their quest chain, they go silent. This is the biggest retention cliff in the game — players max out hearts with Livia in Chapter III and she becomes scenery by Chapter VI.

**Solution: NPCs become living characters with daily rhythms and daily asks.**

Each NPC has a 3-slot "desire" system that refreshes each in-game day:
- A gift they want today (e.g., "Livia wants flowers this morning" — shown as a small icon near her)
- A favor they need (e.g., "Marcus wants 2 fish before sundown")
- An activity invitation (e.g., "Vesta is stargazing tonight — join her between hours 21-23")

Meeting their daily want gives +1 "favor point" per NPC (separate from hearts). Favor points unlock new dialogue lines, small cosmetics (Livia gives you her father's ring as a keepsake at 30 favors), and eventually a "fifth quest" — a post-endgame quest for each NPC that couldn't happen until you'd proven deep friendship.

**Why this works:** It gives players a reason to visit NPCs every session. It makes the world feel inhabited. It rewards players who already love the NPCs with more of what they already want.

**Implementation:**
- Each NPC has a `dailyWant` object: `{ type: 'gift'|'favor'|'activity', item: string, hour_start: int, hour_end: int }`
- Seed daily wants from the same day-counter as the merchant (consistent within a session)
- Visual indicator: small speech bubble icon over NPC head when they have a daily want
- Favor count stored in `state.npc_favors.livia` etc.
- 5–7 new post-endgame dialogue trees per NPC (Felix in particular — he's the most mysterious, most room to expand)

---

### #3 — Seasonal Events (4 per year, recurring)
**Category:** Daily/Weekly Hooks / Emergent
**IMPACT: 5 | EFFORT: 3 | PRIORITY: 8.5/10**

The game already has seasons. They don't do anything memorable. Four annual events tied to real Roman festivals would make seasons feel like actual chapters of time — not just visual filters.

**The four festivals:**

**SATURNALIA (Winter)** — 3 in-game days. All prices at merchants halved. NPCs give you gifts (small items). A decorated pine appears in the village square. You can host a feast: gather 8 meals + 3 wine, trigger a cutscene where all 4 NPCs gather at the fire. Special reward: Saturnalia Wreath cosmetic.

**FLORALIA (Spring)** — 5 in-game days. Crops grow 50% faster. Flower spawns everywhere (new gatherable). A flower-weaving minigame: press a sequence of keys matching the lyre notes to weave a crown. Crown is giftable to any NPC for +3 hearts. Rare: if you give it to Vesta, she reads an augury — predicts this season's dominant weather (mechanically useful).

**LUDI ROMANI (Late Summer)** — 3 in-game days. The arena gets a tournament bracket: 5 rounds of escalating combat, each with a named enemy and a specific kill condition (kill within 30 seconds, take no damage, etc.). Reward: unique combat titles ("Gladiator of the Mare") and a Champion's Shield cosmetic. Resets annually — players can attempt each year for a higher score.

**LEMURIA (Autumn)** — The dark festival. 2 in-game nights. Ghost enemies spawn on the home island (not just Terra Nova). NPCs have unique scared/reverent dialogue. The Necropolis entrance glows differently. If you complete a specific ritual (light 5 torches in order around the island), a new ghost NPC appears — one of the Ninth Legion soldiers — who gives lore about what happened before the game starts.

**Why this works:** Recurring events create annual rhythms. Players think "I want to be at Saturnalia again." It gives long-term players new content without requiring new islands.

---

### #4 — The Collection Journal (Fish, Crops, Creatures, Relics)
**Category:** Long-term Progression
**IMPACT: 4 | EFFORT: 2 | PRIORITY: 9/10**

The game has fishing, multiple crop types, combat with different enemies, and 20 lore tablets. None of it feeds a collection system. This is a near-zero-effort retention layer.

**The "Naturalist's Codex"** — a new journal tab (J key, secondary tab):
- **Fish Log**: 12 fish species, each with size records (largest catch), flavor text, and best bait/time/location. Completing the log unlocks the "Sea Sage" title.
- **Crop Almanac**: Every crop grown 10+ times gets an almanac entry with hand-drawn style pixel art, optimal season, and a food pairing note from Felix. Completing it unlocks a Master Farmer emblem on the home island sign.
- **Bestiary**: 15 enemy types across all islands. Each has a kill count, lore paragraph, and weakness. Completing it unlocks a Combat Trophy displayed in the barracks building.
- **Relic Registry**: The 20 lore tablets plus 5 hidden "artifact" items. Completing it triggers a unique conversation with Felix about what he concludes from all of them (a mini-epilogue lore dump that recontextualizes the main story).

**Why this works:** The Pokédex instinct is real. Players will farm fish just to see the codex entry. Completionists will replay with this system in mind.

**Implementation:** Single `state.codex` object. Each entry has `found: bool`, `count: int`, `record: value`. A new tab panel, mostly text + small pixel icons. Low art cost if you reuse existing sprites.

---

### #5 — Random World Events (Storm, Pirate Raid, Plague, Windfall)
**Category:** Emergent Gameplay
**IMPACT: 4 | EFFORT: 3 | PRIORITY: 7/10**

Currently the world is stable between player actions. Nothing unexpected happens. This kills the sense of a living world after the first playthrough.

**5–8 random events that trigger based on game state and probability:**

**PIRATE RAID** — Appears when player has 100+ gold and it's been 3+ days since last raid. A pirate ship appears offshore. You have 2 in-game hours to defend (fight 5 pirates in sequence). Success: gold bounty. Failure: lose 25% of stored resources. Marcus has unique dialogue for this event.

**HARVEST WINDFALL** — Random season event (20% chance per season). All crops yield double this day. A golden shimmer on the field. No action required — just enjoy. Vesta says "Sol smiles on us today."

**CRYSTAL SURGE** — A tremor reveals new crystal nodes on Hyperborea. 3-day window before they sink again. Creates urgency to visit that island.

**PLAGUE OF MICE** — Stored grain takes -10% for 3 days unless you "set traps" (craft 3 wood into a trap item). Felix finds it funny. Livia does not.

**MERCHANT STORM** — A merchant ship wrecks near your island. You can dive for its cargo (new dive opportunity, time-limited). The cargo is worth significant gold. Optional moral choice: save the merchant's log (gives a quest lead) or take the gold.

**THE WANDERING SOLDIER** — A stranger walks onto your island every 30+ in-game days. They trade a rare item for specific goods. Each visitor has a name, a one-line story, and a unique item. Seven possible visitors (one per chapter beat as a callback to earlier story). After Chapter X, one of these visitors is actually a messenger from Rome — first hint of possible future content.

**Why this works:** Uncertainty creates engagement. Players log back in to see what happened.

---

### #6 — Farming Combos + Fishing Combos (Mastery Layer)
**Category:** Depth Mechanics
**IMPACT: 4 | EFFORT: 2 | PRIORITY: 9/10**

The ITCH page mentions combo systems. If they're not fully implemented, this is the highest-leverage depth mechanic because it deepens the two activities players repeat most.

**Harvest Combos:**
- Harvesting 3+ crops in quick succession (within 2 seconds each) builds a combo multiplier: x1.5 at 3, x2 at 5, x3 at 8
- Combo counter visible as a floating UI element (big number, Roman numeral style)
- Breaking the chain resets it
- "Perfect Harvest" achievement: reach x5 combo — unlocks the "Gold Sickle" cosmetic tool
- Adds strategic planting: cluster your crops for combo optimization vs. space optimization

**Fishing Combos:**
- Three-phase fishing: cast (timing), strike (timing window), reel (hold/release rhythm)
- Currently fishing is likely click-to-catch. Upgrade: cast direction affects fish species
- "Lucky Cast" — casting at exactly the right angle during a specific time catches a rare fish not in the rotation
- Consecutive successful catches without breaking build a "Good Tide" bonus: +gold from the next trade route trip

**Why this works:** Makes activities players do dozens of times feel like a skill floor to master. Gives veteran players something to optimize. Costs almost nothing to implement on top of existing systems.

---

### #7 — Cosmetic Unlock System (Walls, Roofs, Paths, Character Outfits)
**Category:** Long-term Progression
**IMPACT: 4 | EFFORT: 3 | PRIORITY: 7/10**

The character skin system (castaway → Imperator) is one of the best ideas in the game. Extend that logic to the entire colony.

**Building Variants:**
- Each building type unlocks a "Roman Classic" and "Solarpunk" variant at island level 15+
- Variants are cosmetic only — same function, different pixel art
- Unlocked by meeting specific conditions: "Upgraded Villa" requires 30 favors with Livia; "Forge with Solar Panels" requires completing the Vulcan chapter AND colony level 10

**Path Materials:**
- Currently all paths likely use the same tile. Unlock: sand path, stone path, mosaic path (requires 5 ancient relics), living green path (solarpunk — requires 20 crystals)
- Mosaic path is the prestige flex — players show it off in screenshots

**Character Cosmetics:**
- Harvest Festival Hat (Floralia reward)
- Champion's Laurel (Ludi Romani arena win)
- Crystal Circlet (30 crystals gifted to Vesta total)
- Fisherman's Cloak (Fish Log completed)
- The actual Imperator skin already exists — make the unlocking of sub-variants visible in a "wardrobe" panel

**Why this works:** This is Stardew's secret weapon. Cosmetics have infinite perceived value at near-zero development cost. Players build toward them. They screenshot them. The screenshot becomes marketing.

---

### #8 — Dynamic Economy (Price Fluctuation + Supply Chains)
**Category:** Emergent Gameplay
**IMPACT: 3 | EFFORT: 2 | PRIORITY: 7.5/10**

Right now TRADE_GOODS has fixed `goldPerTrip` values. This is fine, but it makes trading a passive background process.

**Simple dynamic pricing:**
- Each good has a base price ± a fluctuation range
- Price updates each in-game season based on: current weather (drought makes grain expensive), current island level (higher level, more buyers), events (Saturnalia doubles wine price)
- A "Market Bulletin" in the economy panel shows current prices and a 1-season trend arrow (up/down)
- Players can time their trade route creation to optimize for high-price windows

**Deep supply chain (medium effort):**
- "Export Bonus": if you trade the same good for 5 consecutive trips, it establishes a "contract" — price locks at +20% above market for 10 trips, then drops as the buyer is satisfied
- "Import Deal": Hanno the Merchant occasionally offers to buy your surplus at 50% above standard price, but only for 24 hours

**Why this works:** Transforms passive trade income into active decisions. Gives economy-minded players a loop to optimize.

---

### #9 — Secret Areas + Hidden Lore (One per Island)
**Category:** Depth Mechanics
**IMPACT: 4 | EFFORT: 3 | PRIORITY: 7/10**

Hyperborea and the Necropolis already feel like they have secrets. Lean in. Every island should have one area that most players will never find on their first playthrough.

**The 4 hidden areas:**

**Home Island — The Founders' Hollow:** A small cave entrance behind the waterfall (if there isn't one, add it). Inside: 3 lore tablets written by the original exiles who were here before the player arrived. One tablet is in a language only Felix can translate (triggers a special dialogue chain). Reward: Founders' Seal cosmetic.

**Isle of Vulcan — The Cold Vent:** Most of Vulcan is hot. In the northeast corner, there is one vent that blows cold air — an anomaly. Examining it 3 times (across 3 visits) triggers a brief vision sequence: you see the island before the volcano, green and inhabited. Reward: a rare ore type "Void Iron" used to make a second legendary weapon.

**Hyperborea — The Ice Mirror:** A perfectly still frozen lake that acts as a mirror. Standing in front of it shows your character as they looked at the start of the game — the castaway version — for 5 seconds. Then it shows a version of you in an outfit that doesn't exist yet (a tease). This is 100% narrative, zero gameplay. But it's the kind of thing that gets clipped and posted.

**Necropolis — Room Thirteen:** The Necropolis has a fixed number of rooms. Room 13 doesn't appear on the map. It only opens if you enter on a specific in-game date (the day of Lemuria, the autumn festival). Inside: the ghost of a Roman soldier who is not part of the Ninth Legion. He's someone from the player's past — left deliberately vague but clearly a ghost from before the exile. One line of dialogue. No reward. The best thing in the game.

**Why this works:** Secrets create communities. Players post about what they found. Others go looking. YouTube videos happen.

---

### #10 — Weekly Community Bounty (Server-side, Minimal)
**Category:** Social/Share
**IMPACT: 3 | EFFORT: 2 | PRIORITY: 7.5/10**

Since the game saves to localStorage and has no server, a "community challenge" can be faked effectively.

**Implementation:**
- Host a tiny JSON file at a static URL (GitHub Gist, or the itch page description) that updates weekly
- The game fetches it on load (optional, gracefully fails offline)
- Displays a "This Week's Challenge" in the journal: e.g., "This week: Breed and harvest 50 crops of Emmer Wheat. Reward: Seed of the Week (Imported Flax)"
- If player completes the challenge condition, they receive the reward and a "challenge complete" badge in the journal

This is not real multiplayer. But it *feels* like community because everyone is doing the same challenge. If the developer posts the challenges on itch.io comments weekly, players start commenting their results. That's a community.

**Why this works:** Zero backend required. Creates a shared social experience from a singleplayer game. Gives the developer a weekly touchpoint to re-engage the player base.

---

## FULL BRAINSTORM BY CATEGORY

### Category 1: Daily/Weekly Hooks

**Daily Quests/Bounties**
Three bounty slips appear each morning on the town notice board (a new pinboard building or just a UI element). They cycle based on day seed. Examples:
- "Hanno needs 5 fish before sundown" → reward: 20 gold
- "Marcus is training at dawn — spar with him" → triggers a short combat minigame, reward: +1 combat XP upgrade
- "Vesta sees trouble tonight — complete a Terra Nova expedition" → reward: 2 crystals
Bounties expire at end of day. This is the single easiest daily hook to implement. IMPACT: 4 | EFFORT: 1

**Seasonal Events**
Described above (#3). IMPACT: 5 | EFFORT: 3

**Rotating Merchant Stock**
Described above (#1). IMPACT: 5 | EFFORT: 2

**Daily Gift / Login Bonus**
On first session of each real-world day, a small reward appears in the player's inventory — framed as "you slept and the colony worked." Examples: +5 gold, +3 grain, +1 crystal. Escalates on consecutive-day streaks: 7-day streak gives a special item. The streak counter is stored in localStorage with a 36-hour window so players don't get punished for time zone variance. IMPACT: 3 | EFFORT: 1

**Solar Calendar — In-Game Holidays**
Real Roman holidays mapped to real dates: Saturnalia = Dec 17-23, Floralia = April 28-May 3, etc. When a player opens the game on those real-world dates, the game acknowledges the festival. Seasonal-specific music mode. Small bonus. This costs almost nothing and makes the world feel alive relative to the real world. IMPACT: 3 | EFFORT: 1

---

### Category 2: Long-term Progression

**Prestige / New Game+**
After Chapter X (Imperator), a "Legacy" mode unlocks. The player starts a new exile on a new island configuration, but retains: cosmetics, the Naturalist's Codex, combat skill tree unlocks, and a Legacy Title visible to returning visitors ("Exile of the Third Founding"). New colony generates with slightly different terrain. The story is the same but NPC dialogue acknowledges your history. IMPACT: 4 | EFFORT: 4

**Achievement Unlocks**
A Roman-themed achievement system inside the journal. 30 achievements, split:
- "Civic" achievements (colony milestones, building counts)
- "Maritime" achievements (fishing, diving, trade)
- "Martial" achievements (combat kill counts, arena wins)
- "Scholar" achievements (lore tablets, codex entries, Felix quests)
- "Pious" achievements (Vesta quests, dawn prayers, shrine visits)
Each tier of completion gives a small cosmetic. Full completion gives the "Civis Romanus Sum" badge — your save screen shows it. IMPACT: 4 | EFFORT: 2

**Cosmetic Unlocks**
Described above (#7). IMPACT: 4 | EFFORT: 3

**Collection Systems**
Described above (#4). IMPACT: 4 | EFFORT: 2

**Island Level Prestige Rewards**
Currently island progression goes to 25 (Imperator). Add visual milestones at 5, 10, 15, 20, 25:
- Level 5: A sundial appears in the village square (shows exact in-game time, decorative)
- Level 10: The island gets a proper Roman name (player can choose from 5 options)
- Level 15: Seabirds start nesting on the cliffs (ambient — new ambient sound layer)
- Level 20: A second companion animal appears (unlockable cat variant — a tortoiseshell instead of tabby)
- Level 25: The island's day/night sky gets a subtle Roman constellation overlay at night
IMPACT: 3 | EFFORT: 2

---

### Category 3: Emergent Gameplay

**Random Events**
Described above (#5). IMPACT: 4 | EFFORT: 3

**NPC Drama / NPC-NPC Relationships**
Felix and Livia have history. Vesta and Marcus don't trust each other at first (soldier vs. mystic). These tensions are hinted at in the writing but never mechanically realized.

Two systems:
1. **NPC Mood**: Each NPC has a hidden mood state (content / worried / excited / grieving) that changes based on game events. Mood affects their daily greeting, their gift preferences, and their wander patterns. Marcus is worried after a pirate raid. Vesta is excited during Lemuria.
2. **NPC Bonds**: As you build hearts with multiple NPCs simultaneously, NPC-NPC relationships evolve. At 6+ hearts with both Livia and Felix, a new scene triggers: they're talking by the waterfront. You can approach or not. The scene reveals something about Felix's past that his solo quest chain doesn't. Optional, discoverable.
IMPACT: 4 | EFFORT: 3

**Dynamic Economy**
Described above (#8). IMPACT: 3 | EFFORT: 2

**Weather Affecting Gameplay More Deeply**
Current weather exists. Make it matter:
- **Storm**: Fishing yields doubled (fish bite in rough water), but crops have 20% chance of damage. Trade ships delayed (in-game visual: ship waits at port)
- **Drought**: Crops need watering (new irrigation action: carry water from the well to plots). Adds light survival pressure without being punishing.
- **Fog**: Visibility reduced. Distant islands invisible. Companions behave differently (cats hide indoors, crow sits on your shoulder and follows you). A fog-only rare fish species appears in the bay.
- **Clear with Strong Wind**: Sailing speed doubled. Best day to establish a trade route.
Weather forecasting: Vesta can tell you tomorrow's weather if hearts >= 4 ("I feel a storm coming"). Gives weather system a human face.
IMPACT: 3 | EFFORT: 2

---

### Category 4: Social/Share

**Screenshot Mode**
Press F9 to enter screenshot mode. Hides HUD. Optional: letter-box bars top and bottom with a customizable caption. 6 filter options: None, Golden Hour, Moonlit, Sepia (Ancient), Solarpunk (boosted teals), Dramatic (contrast + vignette). Share button copies to clipboard. Cost: near zero — it's HUD visibility toggle + some post-processing via p5's filter(). IMPACT: 3 | EFFORT: 1

**Shareable Island Snapshot**
Once per real-world day, you can generate an "Island Card" — a cropped, stylized view of your colony with your current title, day number, and season. Rendered to a canvas and downloadable as PNG. Players post these. The consistent format creates a recognizable visual identity for the game on social media. IMPACT: 3 | EFFORT: 2

**Leaderboards**
Since the game is browser-based with localStorage, a true leaderboard requires a backend. Lightweight option: an itch.io-hosted "Score Board" comment thread where players post their stats. The game can format a shareable score string: "Day 127 | Imperator | Island Lv25 | 847 gold | Fish Log: 9/12 | Codex: 71% | #MareNostrum". One button generates this string. IMPACT: 2 | EFFORT: 1

**Community Challenges**
Described above (#10). IMPACT: 3 | EFFORT: 2

---

### Category 5: Depth Mechanics

**Farming and Fishing Combos**
Described above (#6). IMPACT: 4 | EFFORT: 2

**Secret Areas / Hidden Content**
Described above (#9). IMPACT: 4 | EFFORT: 3

**Hard Mode / Ironman**
At new game creation: toggle "Iron Exile" mode. Rules: one life (death = permadeath back to Chapter I), no merchant, pirates raid every 10 days, weather is harsher. Separate leaderboard category. The Ironman player's save file is flagged — every milestone tracked shows "Iron" prefix. If you die, your colonist's name is saved to a memorial list visible on the main menu. IMPACT: 3 | EFFORT: 2

**Speedrun Mode**
An in-game timer that starts at Chapter I and tracks time-to-completion. Pause on dialogue. End at Chapter X final ceremony. Top times visible on itch page. Seed-based "weekly speedrun challenge" (fixed seed, fixed weather). Costs nothing — just a visible timer. IMPACT: 2 | EFFORT: 1

**Combo / Mastery Titles**
Visible to the player in their journal. Earned by performing expert actions: "Fisher-King" (catch 100 fish), "Architect of the Sea" (build all 20 building types), "The Remembered" (find all lore tablets), "Mars-Touched" (win 50 arena fights). Each title is displayable on the colony sign at the port — where arriving ships would see it. Prestige made visible. IMPACT: 3 | EFFORT: 1

---

### Category 6: Missing Content

**More Islands**
The game has 4 explorable islands + home + Terra Nova. A 5th island would require significant content work but the framework exists. Best candidate: **The Isle of Hermes** — a trade hub where other exiled colonies have settled. Other player-like NPCs (procedurally named Romans) trade, gossip, and occasionally send quests back to your island. This is the closest the game gets to multiplayer without being multiplayer. IMPACT: 5 | EFFORT: 5

**Pet/Companion System Expansion**
The 4 companions (cats, tortoise, crow) are autonomous. Expand to: companions can be assigned roles. The crow becomes a scout (sent to an island, reports on enemy positions before you go). The tortoise can carry resources short distances on the island. A cat can be sent to the merchant to negotiate a small discount. Each role requires a specific item to "train" (crow needs a copper bracelet, tortoise needs a carrying harness). IMPACT: 3 | EFFORT: 3

**Music Instruments**
A lute/lyre building (small) that the player can approach and interact with. Opens a simple keypad (A S D F G H J keys) that maps to notes. Playing the correct Roman mode pattern (Dorian: D E F G A Bb C) for 8+ beats triggers a "community concert" event where NPCs gather around and listen. If you play the specific melody pattern that matches Vesta's dawn prayer, a bonus occurs. This is both a depth mechanic and a pure delight moment. IMPACT: 4 | EFFORT: 3

**Underwater Expansion**
The diving zones exist. Expand: 3 underwater "biomes" within the diving area (shallow reef, mid-water kelp forest, deep trench). Each has different fish species, different treasure types, different ambient lighting. A new craftable item: the Diving Bell — extends breath bar by 50%, unlocked after Vulcan forge. New rare: an underwater Roman ruin, accessible only with the diving bell, containing a unique lore entry about the colony's pre-history. IMPACT: 4 | EFFORT: 3

**Cooking Expansion**
Currently cooking produces "meals." There should be specific recipes. A recipe book (found in Felix's library). 12 recipes, each requiring specific ingredient combinations, each with a different effect when eaten:
- Emmer Bread: +5% crop speed for 1 in-game day
- Spiced Wine: +20% combat speed for 1 fight
- Hyperborean Stew (frost fish + grain + spice): reveals all enemies on Terra Nova for 1 day
- Necropolis Honey Cake: +1 temporary heart with any NPC when gifted
- Imperator's Feast (all high-tier ingredients): full colony XP boost for 1 day
Gifting specific food to NPCs based on their preferences (tracked in codex) gives double heart reward. IMPACT: 4 | EFFORT: 2

---

## IMPLEMENTATION ROADMAP

### Sprint 1 (Lowest effort, highest impact — do these now)
1. Daily notice board bounties (3 per day, seeded)
2. Rotating merchant stock (Hanno the Merchant, 3 daily items)
3. Collection Journal / Naturalist's Codex (stub + fill over time)
4. Farming + fishing combos
5. Screenshot mode (F9, HUD toggle, filters)

### Sprint 2 (Medium effort, major retention impact)
6. NPC daily wants + favor system
7. Seasonal festivals (Saturnalia first — lowest content cost, highest warmth)
8. Random world events (start with 3: pirate raid, harvest windfall, wandering soldier)
9. Dynamic economy (price fluctuation, market bulletin)
10. Cooking recipes with effects

### Sprint 3 (Higher effort, depth and replayability)
11. Secret areas (one per island, start with Necropolis Room 13 — pure narrative, no art cost)
12. Cosmetic unlock system + wardrobe panel
13. Achievement system (30 achievements, journal tab)
14. NPC-NPC relationship scenes (Felix + Livia first)
15. Weather gameplay effects (drought irrigation, fog fish)

### Sprint 4 (Long-term, post-confirmation of player base)
16. Iron Exile / Hard Mode
17. New Game+ / Legacy Mode
18. Isle of Hermes (5th explorable island)
19. Instrument minigame
20. Weekly community challenges (requires minimal server)

---

## THE ONE THING

If you build nothing else from this list: **build the rotating daily merchant and the NPC daily wants system.**

Together they take maybe 3 days of work and they answer the most important retention question: "Why come back tomorrow?"

The answer becomes: "To see what Hanno is selling. To find out what Livia wants today."

That's enough. That's the hook. Everything else on this list is amplification.
