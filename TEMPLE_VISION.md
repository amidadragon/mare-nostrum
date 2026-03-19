# TEMPLE VISION — Mare Nostrum
## The Five Faces of the Sacred Mountain

**The design principle in one sentence:** The temple is not a building on the island — it IS the island, made vertical.

Every civilization the player builds radiates outward from this point. The temple should look like the center of gravity. At level 25, it should be the first thing a returning player sees when they dock, the last thing they look at before they close the game. It should make them feel the weight of what they built.

---

## CURRENT STATE AUDIT

**What exists (as of sketch.js ~line 6335):**
- `baseW = min(180, 55 + lvl*12)` — caps at 180px at level ~10. Dead flat for levels 10-25.
- `colH = min(35 + lvl*6, 80)` — caps at 80px at level ~7. Columns stop growing early.
- Column count: 4 → 6 → 8 (levels 1, 3, 5). No change levels 5-25.
- Pediment, entablature, columns, entrance glow, flanking statues at level 3+.
- Sacred flame on apex (green-to-gold gradient).
- Level 25 special: faint golden ellipse. That's it.

**The honest rating: 5/10.**

The structure looks like a temple. It does not look like the center of a civilization. The scale cap kicks in too early. The level 1 and level 15 versions are barely distinguishable to a casual eye. The level 25 condition is a couple of glowing ellipses, not a moment. The interior is one static room.

---

## THE FIVE TIERS

Each tier is a distinct visual identity. Not just bigger — different in character.

### TIER 1 — THE ALTAR (Levels 1-4)
**Character:** Rough, humble, personal. This is a man's prayer on an empty beach. Not a temple — a plea.

**Exterior dimensions:**
- Platform: 60px wide, 4px tall. Single step. Rough-cut stone, not dressed marble — irregular block joins visible.
- Two columns only. Height 28px, width 5px. No fluting, no capital. Just upright stones, unpolished.
- Lintel across the top: a single flat stone, 64px wide, 8px tall.
- No pediment. The lintel IS the roof.
- Small crude altar block between the columns: 12px wide, 8px tall, dark basalt color (#3D2B1F).
- Votive flame on altar: tiny, 4px flame, orange-red. Flickers. This is the player's first fire made sacred.
- No doorway to enter. This is an outdoor altar.

**Color palette:** Dark basalt stone (#4A3828), rough limestone (#B8A890), votive flame orange (#E8621A).
No white. No marble. Raw materials from the island itself.

**Footprint exclusion zone:** 45px radius. Buildings spawned by the procedural system never place within this zone.

**Night behavior:** The votive flame is the ONLY light source in early levels. It flickers alone in the dark. Make it visible from 150px away — the warmth radius of the glow should be generous, because at level 1 this fire IS hope.

**Platform elevation offset (visual only, matching H1 hill):** The altar sits at the natural H1 peak. The visual Y offset from `getElevationOffset()` already handles this if we pass `pyr.x, pyr.y`. No additional math needed.

---

### TIER 2 — THE NAOS (Levels 5-8)
**Character:** A proper Greek-style temple emerging from the altar's foundation. The same votive flame is now inside, protected. Civilization learning to shelter its gods.

**Exterior dimensions:**
- Platform: 100px wide, 3-step stylobate. Each step 4px tall. Marble-white now (#D4CFC0) — the player has found stone resources.
- Four columns. Height 45px, width 6px. Slight entasis. Simple Doric capital (plain echinus + abacus, no acanthus).
- Cella wall behind columns: 68px wide, 38px tall. Single doorway 14px wide.
- Basic pediment: 8px rise. No tympanum sculpture yet — blank.
- Interior visible through doorway: warm amber glow, stronger than Tier 1.
- Flanking torch braziers (ground level, not mounted): pairs of tripod bronze braziers. 3px flame.

**What's new vs Tier 1:** The columns have capitals. The platform has real steps. There is an enclosed room. The flame is inside.

**Color:** Warm limestone (#C8C0B0), Doric capitals (#D8D0C0), torch flame (#FF8C20).

**Platform exclusion zone:** 65px radius.

**Night:** Both torch braziers cast warm light pools (radius ~20px). The amber doorway glow spills onto the front steps. The temple is a lantern in the dark.

---

### TIER 3 — THE GRAND TEMPLE (Levels 9-14)
**Character:** Roman gravitas arrives. This is a state temple now, not a personal shrine. The Roman vocabulary — Corinthian capitals, full entablature, triglyphs, proper tympanum sculpture — appears in force.

**Exterior dimensions:**
- Platform: 150px wide, 5-step stylobate. Steps are visibly heavier — 5px each, with shadow undersides.
- Six columns in front (peristyle hint — 2 angled "return" column silhouettes visible at sides, suggesting but not fully drawing a full surround colonnade).
- Column height 65px, width 7px. Corinthian capitals — acanthus leaf clusters, volute scrolls.
- Full entablature: architrave (three fasciae), triglyph frieze, projecting cornice. Total entablature height ~14px.
- Pediment: 18px rise. Tympanum now has Sol Invictus relief — the sun face with rays. Gold (#C8A830) on warm stone.
- Center acroterion: tall palmette finial, 10px × 14px, gold-tipped.
- Corner acroteria: smaller palmette pairs.
- Flanking statues on pedestals: these exist in current code at level 3 — keep but SCALE them up. At Tier 3, the pedestals are taller (10px), the figures are 22px tall, and they hold attributes (one raised arm with spear, one with fasces).

**What's new vs Tier 2:** The return columns create depth. The entablature is full and correct. The tympanum has sculpture. The platform is monumental enough that the player's character looks small standing on it. This is the point of visual recognition — the player should think "that's a real Roman temple."

**Color:** Dressed travertine white (#E0DAC8), entablature shadow (#B0A890), gold details (#C8A830), background cella in warm shadow (#9A9280).

**Platform exclusion zone:** 85px radius. Nearby buildings should visibly respect this space — the plaza around the temple is opening up.

**Night:** Mounted torch brackets appear on columns (not braziers now — iron torch rings bolted to column shafts). Interior glow is warmer and larger. The column fronts catch the interior light — the fluted shafts glow on their forward faces.

---

### TIER 4 — THE MONUMENTAL TEMPLE (Levels 15-19)
**Character:** Imperial power made stone. This is Trajan-era Rome. Double colonnade, gold everywhere, flanking statues, eternal roof flame. Every material reads wealth. Every proportion reads authority.

**Exterior dimensions:**
- Platform: 210px wide. Seven-step stylobate. The steps are wide enough that the player character could stand on individual steps. Ground shadow ellipse is 280px wide.
- Double colonnade: 8 front columns (outer row) + 4 additional columns set back 16px (inner row, partially visible between outer columns). Total visual depth reads as the hexastyle portico of a major Roman state temple.
- Column height 85px, width 8px. Still Corinthian but the capitals are richer — visible leaf clusters with gold tips (#D4AA40 at the volutes).
- Entablature: 18px total. Triglyph frieze is more elaborate — each metope panel has a small carved victory scene (simplified pixel relief: two figures, one kneeling). At this tier the frieze reads as narrative, not decoration.
- Pediment: 26px rise. Tympanum sculpture: Apollo driving the quadriga (sun chariot). Two figure groups flank center — Victory crowning a general on left, Fortuna with cornucopia on right. This is ambitious pixel art but achievable in ~30 draw calls per figure.
- Gold acroteria at all three pediment points: larger than Tier 3. 14px tall palmette finials with gold shimmer animation (sin wave, gentle).
- Flanking COLOSSAL statues — much bigger than Tier 3. 36px tall figures on 14px pedestals. These are deities: Jupiter on left (thunderbolt), Minerva on right (owl + spear). Their marble (#F0EAE0) contrasts with the warmer temple stone.
- ETERNAL FLAME on roof: not at apex — behind the pediment on the roof ridge. A bronze tripod basket, 8px wide, 10px tall, with a multi-layered flame (3 layers, orange/gold/white core). This is the campfire from Era 1 grown formal and public. It burns 24/7 — no night shutoff.

**Gold accents specific to Tier 4:**
- Column capital volutes: gold (#D4AA40)
- Entablature crown molding: gold strip along top edge (2px)
- Pediment raking cornice: gold outline
- Acroteria: fully gold
- Door lintel: gold beam overlay
- Eternal flame tripod: gold metal

**What's new vs Tier 3:** The double colonnade creates genuine architectural depth. The colossal flanking statues — for the first time — are clearly taller than nearby buildings. The gold is not an accent; it is a statement. The eternal roof flame makes the temple visible from anywhere on the island at all times.

**Color additions:** Imperial gold (#D4AA40), white marble statue (#F0EAE0), eternal flame orange-white (#FFD060 center, #FF8020 outer).

**Platform exclusion zone:** 110px radius. The stone plaza surrounding the temple should read as cleared, formal ground. At level 15, the Via Principalis road terminates here — consider drawing a circular plaza geometry (simple: `noFill(); stroke(); circle(0, 0, exclusionRadius*2)` as a stone ring inset into the terrain).

**Night:** The eternal roof flame never goes out — it is the brightest static light source on the island. Column torch brackets now also illuminate the double colonnade. Gold elements shimmer faintly (sin pulse on fill alpha). The colossal statue faces catch the eternal flame light on their forward surfaces.

---

### TIER 5 — THE CRYSTAL BEACON (Levels 20-25)
**Character:** This is what happens when Rome finds magic and doesn't stop. The temple doesn't transform — it ascends. The Roman structure is still there, legible in every proportion, but crystal has erupted through it. This is the island's power made architecture. The player should stop moving and stare.

**Exterior evolution from Tier 4:**

**The Crystal Growth (Level 20 onset, full by Level 23):**
A primary crystal formation grows from behind the pediment apex — not replacing the pediment but erupting through it. At level 20 it is 15px tall and narrow. At level 22 it is 32px tall. At level 25 it is 60px tall, a hexagonal prism tapering to a point, teal-aqua (#5EECD0) with a bright core (#DFFFFF).

Crystal veins begin appearing on the column shafts at level 21 — thin lines of teal running up from base to capital, like luminescent cracks. `strokeWeight(0.8); stroke(80, 240, 200, 120); line(...)`. Each column gets 2-3 veins.

At level 22, smaller secondary crystal shards grow from the corners of the stylobate steps — short clusters (8-12px), angled outward like the island is growing through the marble.

At level 23, the cella doorway arch glows teal from within — not amber anymore but the aqua of crystal. The interior is transforming.

At level 25, crystal formations flank the entire portico — two large clusters (40px tall) growing from the platform corners, matching the scale of the colossal statues. The statues remain but now have crystal bases growing up around their pedestals.

**The Golden Light Beam (Level 22+):**
At dusk and throughout the night, a vertical golden-white beam shoots upward from the crystal apex. This is not a small glow effect — it is a proper beam: `strokeWeight(4); stroke(255, 240, 160, alpha); line(0, apexY, 0, apexY - 400)`. Falloff: alpha starts at 180 at base, fades to 0 at 400px above apex. Width of beam: 4px core + two 8px soft edge passes at alpha/3.

The beam pulses with a slow 8-second sine wave (matching the ATLANTIS_VISION beacon pulse: `sin(frameCount * 0.013) * 0.2 + 0.8`). It is visible even when the camera is zoomed out. It should be visible from other islands (clamp to horizon Y in distant rendering).

At dawn, the beam fades over 20 frames as the sun rises.

**The Crystal Ring (Level 23+):**
A ring of 12 crystal shards orbits the apex point in a slow ellipse (isometric perspective — orbit is an ellipse not a circle). Orbit radius: 18px horizontal, 8px vertical. Speed: one full revolution per 10 seconds. Each shard: 5px tall, 2px wide, teal fill, brighter core.

```
// Ring orbit math (inside drawPyramid)
for (let r = 0; r < 12; r++) {
  let angle = r * TWO_PI / 12 + frameCount * 0.01;
  let rx = 18, ry = 8;
  let shardX = cos(angle) * rx;
  let shardY = apexY + sin(angle) * ry;
  fill(80, 240, 200, 200);
  rect(shardX - 1, shardY - 2.5, 2, 5, 1);
}
```

**The Crystal Step Veins (Level 21+):**
The stylobate steps begin showing crystal veins running across them — horizontal glowing lines in the stone. `stroke(80, 220, 190, 60); strokeWeight(0.6); line(...)` at irregular intervals (2-3 per step face). These veins pulse very slightly (alpha oscillates +/-20).

**The Ground Glow Plaza (Level 24+):**
A soft teal radial gradient on the ground beneath the temple, radius 140px. `fill(0, 200, 160, 8); ellipse(0, 8, 280, 60)` — flat ellipse to read as ground-level light. Layered 4× at different alphas for soft edge. At night this is visible from anywhere on the island.

**Colossal Crystal Statues (Level 25 only):**
The Jupiter and Minerva statues from Tier 4 have crystal growths through them — not replacing the marble figure but erupting from the base upward. Jupiter's thunderbolt becomes a crystal formation. Minerva's owl perch shows crystal growth. The statues are half marble, half geology.

**Size at Level 25:**
- Platform: 240px wide
- Crystal beacon apex: 55px above pediment peak (total height from ground to apex: ~195px screen-space)
- Column height: 90px
- Ground shadow ellipse: 320px wide

At level 25, the temple should be taller than every other structure on the island by a significant margin. The colosseum, the aqueduct arches, the lighthouse — all shorter. The temple apex with crystal should be the highest point rendered on the entire canvas.

**Night (Tier 5) — the full stack:**
1. Ground glow plaza: teal, pulsing
2. Crystal vein glow on steps and columns: teal lines, visible
3. Eternal roof flame: still present, gold-orange
4. Crystal beacon main light: soft teal aura, radius grows to 200px at night
5. Golden light beam: shooting upward, 400px, pulsing 8s
6. Crystal ring: orbiting the apex, twinkling
7. Secondary crystal clusters: emitting soft teal light (radius ~30px each)

Total effect: the temple at level 25 at night is an unambiguous beacon. From across the island, from the wreck beach, from any distant island rendering — it is the dominant visual element. The sky directly above the beam should show a faint column of lighter darkness, as if the beam is illuminating the air itself (a second even fainter white-alpha `strokeWeight(20); stroke(255, 255, 255, 3)` pass behind the main beam).

---

## SCALE CORRECTION — ENDING THE EARLY CAP

**The current bug:** Both `baseW` and `colH` hit their caps before level 10. Levels 10-25 are visually stagnant.

**The fix:** Remove the `min()` caps entirely. Let the temple scale continuously. Add tier-specific multipliers.

```javascript
// Proposed scaling (replaces lines 6342-6343 in sketch.js)
let tier = getTier(lvl); // returns 1-5 based on level
let baseW, colH;

if (tier === 1) {
  baseW = 60;
  colH = 28;
} else if (tier === 2) {
  baseW = 100 + (lvl - 5) * 6; // 100 to 124
  colH = 45 + (lvl - 5) * 4;  // 45 to 57
} else if (tier === 3) {
  baseW = 130 + (lvl - 9) * 8; // 130 to 170
  colH = 57 + (lvl - 9) * 3;  // 57 to 72
} else if (tier === 4) {
  baseW = 175 + (lvl - 15) * 7; // 175 to 210
  colH = 72 + (lvl - 15) * 3;  // 72 to 84
} else { // tier 5
  baseW = 210 + (lvl - 20) * 6; // 210 to 240
  colH = 84 + (lvl - 20) * 2;  // 84 to 94
}
```

**getTier() helper:**
```javascript
function getTier(lvl) {
  if (lvl <= 4) return 1;
  if (lvl <= 8) return 2;
  if (lvl <= 14) return 3;
  if (lvl <= 19) return 4;
  return 5;
}
```

---

## VISUAL DOMINANCE SYSTEM

**The problem:** Other buildings crowd around the temple and it disappears into the noise.

**The solution — three-part:**

**1. Exclusion zone enforced per tier**

The `state.pyramid` object needs a `getExclusionRadius()` that grows with tier:
- Tier 1: 45px
- Tier 2: 65px
- Tier 3: 85px
- Tier 4: 110px
- Tier 5: 130px

The building placement system already has exclusion logic. The pyramid's radius input to that system needs to scale. Currently it's likely fixed. Search for where pyramid exclusion is defined and replace with tier-based value.

**2. Raised platform visual cue (Tier 3+)**

At level 9+, draw a stone plaza circle behind the temple (before drawing the temple) as a filled ellipse on the terrain layer. This makes the temple appear to sit on dedicated prepared ground:
- Lv 9-14: 120px radius, fill `#C8C0A8` (dressed stone plaza)
- Lv 15-19: 150px radius, same color with gold border ring
- Lv 20+: 180px radius, with teal crystal-vein inlaid ring pattern

**3. Draw order — temple last**

The temple must render AFTER all other island elements (trees, buildings, NPCs, resources). If any other system draws after the temple, it will visually bury it. Audit the draw call order in `drawIsland()` or equivalent. The pyramid should be the final major element drawn on the island surface layer, so it always appears in front.

---

## INTERIOR EVOLUTION

The interior is currently a static room regardless of temple level. Every tier should unlock a distinct room or feature.

### Interior Tier 1 (Levels 1-4): THE CRUDE SANCTUARY
One room. Rough stone walls, packed earth floor. No tile. A single stone altar block in the north. A clay oil lamp on the altar — the only light.

The player can:
- **Pray at altar**: spend 10 solar → receive a small random blessing (crop growth +20% next harvest, +2 fish next fishing, enemy -1 damage next combat). Blessing appears as floating text. One blessing active at a time.

### Interior Tier 2 (Levels 5-8): THE SMALL TEMPLE
The room grows. Marble floor tile (checkerboard, existing code). Stone walls with horizontal course lines. A proper marble altar with a carved inscription. Two wall torches (iron brackets).

Added east wall: a crude mosaic panel — abstract geometric pattern, not yet Sol Invictus. Tesserae in terracotta, ochre, dark blue.

The player can:
- **Altar**: same blessing mechanic from Tier 1, but expanded pool (5 blessing types)
- **Oracle corner** (north-west niche): A small stone bowl with water. Interact → see "the oracle is silent" for now. This is a placeholder the player notices and wonders about.

### Interior Tier 3 (Levels 9-14): THE GRAND HALL
The interior becomes a proper hall — wider and taller (render at 500×360 vs current 400×300). Four interior columns (2 per side), marble shafts. Coffered ceiling suggestion (grid of darker rectangles overhead).

The Sol Invictus mosaic moves from the wall to the apse above the altar — larger now (60px diameter circle), full sun-face rendering with rays, animated shimmer.

**New: THE ORACLE POOL** (north room, separated by an arch)
A separate rendered zone behind the altar. The player walks through the arch to enter. Inside: a circular reflecting pool (40px radius ellipse, deep blue `#1A2A4A` with animated surface ripple).

Interaction: stand at pool edge → receive a "prophecy" — actually a gameplay hint. One per day (using `state.lastOracleDay`). Hint pool:
- "The deep waters hold ancient things." (diving reminder)
- "Iron tempers gold — seek the dark stones." (iron ore hint)
- "The north wind carries danger. Prepare your soldiers." (combat warning on expedition)
- "Three hearts, one trust." (relationship hint for NPC progression)
- "The crystal does not sleep." (crystal energy storage hint)

The prophecy appears as dialogue text with Livia's portrait (she becomes the oracle figure).

**New: THE TROPHY WALL** (south alcove)
A wall with 6 mounted display niches. Each niche shows a relic/achievement:
- Shipwreck timber fragment (always present — "how it began")
- First gold coin (appears when player first earns 100 solar)
- Legion standard (appears when castrum/barracks built)
- Crystal shard in bronze setting (appears when player first converts crystal to solar at altar)
- Obsidian blade (appears when player visits Vulcan Isle)
- Laurel crown (appears when player completes chapter 5)

These are purely visual. The niche shows either the relic (colored sprite, 12×18px) or an empty dark slot with "?" text. Players check the trophy wall to see what they've unlocked. No UI flags or UI screens — the wall IS the display.

### Interior Tier 4 (Levels 15-19): THREE WINGS
The hall now has three branches — north (oracle/pool), central (altar + trophy wall), and a new wing:

**WEST WING: THE WAR ROOM**
A map table — stone slab with a painted relief of the sea (current islands visible as raised relief bumps). Player approaches and sees expedition status, castrum strength, available legion units.

Functionality:
- View active expedition countdown
- Assign a blessing to departing soldiers (costs 5 solar → +10% success chance on next expedition)
- See which distant islands have been cleared

Visual: large stone table (80px × 50px), carved relief surface `#8A7060`, with small painted island markers (5px circles in island colors). Standing around it: Marcus NPC (he's the military commander by Era 2 — show his sprite here).

**Interior size:** Expand to 600×400 rendered interior. The wider space is needed for three wings to feel distinct.

**New floor material:** Red-veined marble in the central hall (fill alternates between `#D4C8B8` and `#C4A898` with thin `#8A4040` vein lines).

### Interior Tier 5 (Levels 20-25): THE CRYSTAL SANCTUM
The interior transforms. The stone walls show crystal veins (matching exterior). The floor has teal crystal inlays at the tile joints. The ceiling — which was implied before — is now visible and shows a crystal formation growing downward from the center like a stalactite chandelier.

**THE FLOATING ALTAR:**
The central altar from previous tiers now hovers 12px above the floor. A soft teal glow beneath it (the levitation effect). The altar rotates very slowly — actually the player camera rotates around a fixed altar, OR we fake it by gently shifting the altar's shadow position: `let altarFloat = sin(frameCount * 0.02) * 3; rect(altarX, altarY - altarFloat - 12, ...)`.

**THE CRYSTAL NEXUS (north chamber):**
Replaces the oracle pool. A large hexagonal crystal formation rising from the floor (50px tall, 30px wide at base, tapering). Deep teal glow. Standing adjacent to it shows a vision — the ISLAND OVERVIEW panel.

Island overview: a simplified top-down map of the player's island (sketch, not photorealistic), showing all current buildings as dots with color coding. This is a late-game reward for the player — seeing their whole civilization at once from above. Rendered as a 200×160 inset panel with a stone frame.

**THE MEMORY WALL:**
The trophy wall expands to the entire south and east wall — now showing a timeline of the island's history as relief panels:
- Panel 1: The shipwreck (always first)
- Panel 2-8: Auto-filled from milestone flags (`state.chapter`, building construction, expedition results)
- Each panel: 30px × 40px carved relief scene, animated very slightly (smoke rising from the wreck, flames on the forum panel)

**STANDING IN THE NEXUS:**
When the player stands adjacent to the Crystal Nexus for 3+ seconds, the background music shifts to the Era 3 lyre echo mode (the two-lyre effect from ATLANTIS_VISION). No UI prompt. No reward. Just the music shift. The player is experiencing the island's energy. This is the quietest, most powerful moment in the game.

---

## ANIMATION SPEC — KEY EFFECTS

### The Golden Beam (Level 22+ exterior, night only)
```javascript
// Render pass 1: soft wide halo
strokeWeight(20);
stroke(255, 240, 120, 6 * beamPulse);
line(0, apexY, 0, apexY - 400);

// Render pass 2: medium beam
strokeWeight(8);
stroke(255, 230, 100, 18 * beamPulse);
line(0, apexY, 0, apexY - 400);

// Render pass 3: tight core
strokeWeight(2.5);
stroke(255, 255, 200, 80 * beamPulse);
line(0, apexY, 0, apexY - 300);
```
`beamPulse = sin(frameCount * 0.013) * 0.2 + 0.8` — 8-second cycle.

### The Crystal Ring (Level 23+)
12 shards orbiting in an isometric ellipse. Each shard is a small diamond (4 vertices). The shard alpha pulses individually with a per-shard phase offset: `sin(frameCount * 0.05 + r * 0.5) * 0.3 + 0.7`.

### Crystal Vein Animation (Level 21+)
The veins on columns and steps pulse with a traveling-wave effect: `alpha = 60 + sin(frameCount * 0.04 + veinIndex * 0.8) * 30`. This creates a slow shimmer moving up the column face.

### The Eternal Roof Flame (Level 15+)
3-layer flame same as existing sacred flame code, but:
- Positioned at roof ridge behind pediment (worldspace Y: `pedY - pedH - 14`)
- Never sleeps — `tBright` check does NOT apply
- Size: `flameH = 14 + sin(frameCount * 0.07) * 2` (gentle breathing)
- Color: gold-white core, not green. `lerpColor(color(255, 220, 60), color(255, 140, 30), f/3)`

---

## NIGHT VISUAL PRIORITY STACK

The temple should be the brightest element at night at every tier. Current code has `getSkyBrightness()` check — extend this logic:

| Tier | Night effect |
|------|-------------|
| 1 | Single votive flame. Warm glow radius 40px |
| 2 | Two brazier flames. Warm glow radius 60px total |
| 3 | Four torch brackets on columns. Interior amber spill from doorway. Combined glow radius ~90px |
| 4 | All of Tier 3 plus eternal roof flame (permanent). Gold shimmer on metal elements. Glow radius ~130px |
| 5 | All of Tier 4 plus: crystal glow (teal), golden beam shooting 400px up, crystal ring, step vein glow. Glow radius for base teal: ~200px. Beam visible everywhere |

---

## PLATFORM / EXCLUSION ZONE IMPLEMENTATION

The exclusion zone growth per tier needs to translate into building placement prevention. In the building placement code, when checking distance to `state.pyramid`:

```javascript
function getPyramidExclusionRadius() {
  let tier = getTier(state.islandLevel);
  let radii = [45, 65, 85, 110, 130];
  return radii[tier - 1];
}
```

Additionally: for Tier 3+, draw a stone plaza ground circle in the terrain layer (before buildings render):
```javascript
// In drawIsland() terrain pass, after grass, before buildings:
if (state.islandLevel >= 9) {
  let plazaR = getPyramidExclusionRadius() * 1.15;
  fill(200, 193, 178, 90); // dressed stone color, semi-transparent over grass
  ellipse(islandCX, islandCY - 15, plazaR * 2, plazaR * 0.9);
  // optional: ring border
  noFill(); stroke(185, 178, 162, 60); strokeWeight(1.5);
  ellipse(islandCX, islandCY - 15, plazaR * 2, plazaR * 0.9);
  noStroke();
}
```

---

## WHAT TO CUT

These ideas were considered and rejected:

- **Physics-based crystal shard growth animation**: too expensive, not readable at pixel scale. Static-but-growing shards are more legible.
- **Temple-specific weather shelter mechanic** (rain stops inside): invisible to player, high implementation cost, low return.
- **Crystal energy capacity tied to temple level**: this already exists implicitly via the level system. Don't add a second number for players to track.
- **Animated god statues** (statues that move): undermines the sacred stillness. The temple at Tier 5 should feel eternal, not kinetic.
- **Interior NPC companions who give buffs on daily visit**: would create a mandatory daily task loop. The interior should feel optional and rewarding, not required. Keep it exploration, not obligation.

---

## IMPLEMENTATION ORDER (if building this sprint)

1. `getTier(lvl)` function — 5 lines, needed by everything
2. Scale fix: remove `min()` caps, implement tier-based `baseW` / `colH` — immediate visual payoff
3. Exclusion zone scaling — prevents crowding at high levels
4. Tier 1-2 exterior redesign (current Tier 1 looks like Tier 2) — 45 min
5. Tier 4 exterior: double colonnade, eternal roof flame, colossal statues — 2 hrs
6. Tier 5 crystal onset at level 20: crystal apex growth + vein system — 2 hrs
7. Tier 5 golden beam (night) — 30 min
8. Tier 5 crystal ring orbit — 30 min
9. Stone plaza ground circle (Tier 3+) — 20 min
10. Interior tier branching: add oracle pool (Tier 3) and trophy wall stubs (Tier 3) — 3 hrs
11. Interior Tier 4 war room (Marcus presence + expedition view) — 2 hrs
12. Interior Tier 5 crystal sanctum + floating altar + island overview — 3 hrs

Total exterior: ~6 hours. Total interior: ~8 hours. This is achievable in one focused sprint.

---

## THE TEST

Build it. Then run this test:

Open a level 1 save. Screenshot the temple.
Use debug `/level 10`. Screenshot.
Use debug `/level 20`. Screenshot.
Use debug `/level 25`. Wait for night. Screenshot.

If those four screenshots don't each make you stop and say "damn" — go back. The level 25 night temple with the golden beam should be a screenshot people put in their Steam reviews. Not because you told them to. Because they couldn't help it.

That is the bar.

---

*Document version: 1.0 — Creative direction. Implementation subject to playtesting.*
*See sketch.js ~line 6335 (drawPyramid) and ~line 6724 (drawTempleInterior) for current implementation.*
*See ATLANTIS_VISION.md for era context and Ring System integration.*
*See ISLAND_REDESIGN_SPEC.md for H1 hill positioning and plaza ground layer integration.*
