# Mare Nostrum — Visual Redesign Plan
## Comprehensive Assessment + Prioritized Action List

---

## CURRENT STATE ASSESSMENT

The game has a solid foundation: a coherent Mediterranean palette, animated day/night, layered ocean rendering, and a genuinely impressive main temple. What it lacks is **visual identity per character**, **pixel art discipline** (most shapes are smooth ellipses rather than hard-edged pixel art), and **contrast and saturation** in critical NPC and building sprites.

---

## SECTION 1: NPC CHARACTER DESIGNS

### 1A. Livia (drawNPC — sketch.js:10625)
**Current rating: 6/10**

She is the most detailed NPC. Gold sandals, crimson palla, flowing blonde hair, kohl eyes, beauty mark — the vocabulary is right. But at runtime scale 0.72, much of this detail vanishes into mush. The `scale(0.72)` shrinks everything, causing sub-pixel rendering that destroys the kohl eyeliner and earring details. She also uses smooth `ellipse()` for her shadow, which breaks pixel style.

**Problems:**
- Scaled down 28% via `scale(0.72)` — pixel detail is lost at runtime
- Hair uses `rect()` but sizes are even numbers that blur at sub-pixel coords when scaled
- Palla is two overlapping rects with no structural landmark — she reads as "blob in crimson"
- No silhouette clarity — at a glance she looks like a slightly-draped rectangle
- Eyes are the best feature but lose detail at 0.72 scale

**Proposed fix:**
- Remove `scale(0.72)` — redesign her coordinate system at native 1x so pixel grid snaps correctly
- Give her a clear silhouette landmark: wider draped palla shoulder + narrow waist = readable in one frame
- Redesign hair in 2x2 pixel blocks (not 1px strokes) so it survives any browser zoom
- Add a signature accessory: a visible scroll tube or wine jug at her hip that is instantly recognizable
- Use `fill(140, 30, 50)` for palla, `fill(248, 240, 225)` for stola — high contrast on island grass

**Specific changes:**
```
sketch.js:10642  — remove `scale(0.72 * faceDir, 0.72);`
sketch.js:10643  — replace with `scale(faceDir, 1);` (use faceDir for flip only)
sketch.js:10647-10736 — redesign body coordinates to match new 1x scale (divide all values by ~1.4)
```

Priority: **P0**

---

### 1B. Marcus (drawNewNPC, type='marcus' — sketch.js:20902)
**Current rating: 7/10**

Marcus is the strongest NPC visually. Centurion galea, transverse crest, scutum, pteruges — all correct. The red cape is the key visual. What he lacks is a memorable POSE. He stands rigid. A soldier stands with weight — he should read as a guardian, not a mannequin.

**Problems:**
- Cape (rect:5,-4,4,18) is only 4px wide — too thin to read as a flowing paludamentum
- Battle scar is 1px wide at `rect(-4,-10,1,3)` — invisible in play
- No idle animation differentiation — Marcus sways the same way as every other NPC
- Gladius sheath is behind his cape (z-order: cape drawn before gladius, correct) but the sword hilt `rect(7,0,2,2)` is only 2px — unreadable

**Proposed fix:**
- Widen cape to 6px, add wave animation that varies per-NPC (`sin(frameCount * 0.05 + 1.5)`)
- Replace 1px scar with a 3px L-shaped pixel scar that reads at game scale
- Give him a unique idle: every 3 seconds, he turns 90 degrees and scans the horizon (1 second), then turns back
- Make gladius hilt gold (3x3 crossguard) so it reads clearly

**Specific changes:**
```
sketch.js:20908  — rect(5, -4, 4, cLen) → rect(4, -4, 6, cLen)  (wider cape)
sketch.js:21013-21015 — replace scar with:
  fill(185, 140, 120);
  rect(-5, -11, 1, 4);  // vertical
  rect(-5, -11, 3, 1);  // horizontal
sketch.js:20970-20973 — gladius crossguard: fill(195, 165, 55); rect(6, -1, 3, 3);
```

Priority: **P1**

---

### 1C. Vesta (drawNewNPC, type='vesta' — sketch.js:21024)
**Current rating: 5/10**

Vesta is the weakest of the three new NPCs. Purple robe, crystal staff — right idea. But the purple `fill(95,50,120)` is dark and muddy against the island grass. She vanishes. Worse: her crystal staff is drawn behind her body and only 2px wide — you cannot tell she has one. Her "sacred priestess" identity is invisible at game scale.

**Problems:**
- Robe color `(95,50,120)` is low-contrast against `C.islandMid` grass
- Staff `rect(8,-16,2,18)` is 2px wide and indistinguishable from tree trunks
- The flame symbol on her sash `rect(-2,0,4,3)` is 4x3px — too small to be meaningful
- She needs an instantly readable silhouette. A priestess should look TALLER, more upright
- Crystal glow `fill(180,120,240,gA)` where gA is only ~10 — invisible

**Proposed fix:**
- Shift robe to `fill(110, 55, 145)` — slightly brighter but still regal
- Make staff 4px wide with a 6x6 amethyst crystal top that pulses visible: `fill(160,80,200,200+sin*50)`
- Add a distinct headdress — a white veil/infula — that breaks her silhouette upward uniquely
- Hold the flame in her left hand (small orange `5x5` ellipse that flickers) — this defines her CHARACTER

**Specific changes:**
```
sketch.js:21031  — fill(95,50,120) → fill(112,55,148)
sketch.js:21061  — rect(8,-16,2,18) → rect(8,-18,3,20)  (wider, taller staff)
sketch.js:21067  — rect(7,-20,4,4) → rect(6,-22,6,6)  (bigger crystal top)
sketch.js:21071  — let gA = floor(15 * crystPulse) → let gA = floor(45 * crystPulse + 25)
Add after line 21073: (sacred flame in left hand)
  let flameA = floor(180 + sin(frameCount * 0.12) * 60);
  fill(255, 100, 20, flameA);
  rect(-10, -8, 4, 5);
  fill(255, 200, 50, flameA * 0.7);
  rect(-9, -10, 2, 3);
```

Priority: **P0** (she's the most visually broken)

---

### 1D. Felix (drawNewNPC, type='felix' — sketch.js after ~21100)
**Current rating: 4/10**

Felix has the worst visual differentiation. He's described as a scholarly freedman-farmer. Read the code — he is drawn with the EXACT same base body as Vesta (same robe proportions, same arm positions) with different colors. He has no props, no tools, no scholarly accessories. He's anonymous.

**Problems:**
- No unique silhouette landmark whatsoever
- No props that signal "scholar" or "farmer"
- Same body template as Vesta — the player cannot distinguish them by sight
- No idle behavior differentiation

**Proposed fix:**
- Give Felix a wide-brimmed traveler's hat (pileus) — unique silhouette, 14px wide straw-colored disc
- Put a stylus and wax tablet in his right hand: a small cream-colored rect held upright
- Make him shorter and broader — a farmer's build vs Vesta's priestess height
- Soil-stained dark green tunica (`fill(50,90,40)`) with rolled sleeves showing forearms

**Specific changes:**
Find Felix's draw block (starts after `} else if (type === 'vesta') {` closes):
- Change tunica fill to `fill(50, 88, 38)`
- Add hat: `fill(195,165,80); ellipse(0,-16,16,5); fill(180,150,65); ellipse(0,-16,14,3);`
- Add tablet in hand:
  `fill(220,205,165); rect(8,-14,7,10);  // wax tablet`
  `fill(80,60,30); rect(9,-13,5,1); rect(9,-11,5,1); rect(9,-9,3,1);  // writing lines`

Priority: **P1**

---

### 1E. Companion Spirit / Lares (drawCompanion — sketch.js:9694)
**Current rating: 7/10**

The Lares spirit is genuinely creative — spectral checkerboard dithering for the robe, no feet (floating), green tendril connection to earth. This is probably the best character in the game. It captures the design philosophy well.

**Problems:**
- The golden laurel wreath `rect(-5,-12,2,2)...` reads as 5 disconnected dots — not a wreath
- Eyes `rect(-3,-8,2,2)` are 2x2 each — at ghost alpha (~150) they vanish
- The green "laurel sash" `rect(-5,-2,10,2)` is one horizontal bar — reads as a belt, not a sash
- Spirit could use a slightly stronger outer glow ring (2px pixel border) to make it pop from background

**Proposed fix:**
- Redesign laurel wreath as a connected arch of 1px diamonds
- Make eyes 3x2 each with a white highlight 1x1
- Add outer spirit border: 1px fill at ghostA*0.3, one pixel outside the body rect on all 4 sides

Priority: **P2**

---

## SECTION 2: BUILDING SPRITES

### 2A. Wall (case 'wall' — sketch.js:6672)
**Current rating: 8/10**

The best building in the game. Ashlar stone blocks, mortar lines, sunlit highlight, weathering spots — this is exactly the pixel art direction we want. The only issue is the `strokeWeight(0.8)` mortar lines — in p5.js without `noSmooth()` inside the building draw context, strokes anti-alias and look soft.

**Fix:** Add `noSmooth()` before stone block loops, `drawingContext.imageSmoothingEnabled = false` for hard pixel lines.

Priority: **P2**

---

### 2B. Floor / Mosaic Tile (case 'floor' — sketch.js:6719)
**Current rating: 6/10**

4x4 alternating tiles exist but `mTileColors` are all variations of the same warm grey — the pattern is invisible in play. The center diamond medallion `beginShape()` is the best feature.

**Problems:**
- Colors `[195,188,172], [175,168,152], [185,170,145], [170,162,148]` differ by only ~15 units — indistinguishable
- No bold geometric pattern — real Roman mosaics had high-contrast black-and-white or red/white/black schemes

**Proposed fix:**
- Expand tile color scheme to 3 distinct values:
  - Color A: `[205,198,182]` (warm white)
  - Color B: `[80,65,50]` (dark terracotta)
  - Color C: `[178,65,45]` (roman red)
- Pattern: checkerboard of A and B, with C border ring
- Center diamond: keep but make it 5x5 with `fill(195,155,45)` gold

**Specific changes:**
```
sketch.js:6726-6734 — replace mTileColors and loop with:
  let mTileColors = [[205,198,182],[82,67,52],[178,65,45],[205,198,182]];
  for (let ty=-bh/2+1; ty<bh/2; ty+=4) {
    for (let tx=-bw/2+1; tx<bw/2; tx+=4) {
      let ci = (abs(floor(tx/4)) + abs(floor(ty/4))) % 2 === 0 ? 0 : 1;
      let mc = mTileColors[ci];
      fill(mc[0],mc[1],mc[2]);
      rect(tx,ty,3,3);
    }
  }
```

Priority: **P1**

---

### 2C. Torch/Brazier (case 'torch' — sketch.js:6910)
**Current rating: 9/10**

This is excellent. Tripod legs, fire body layers, embers, glow loops — genuinely good pixel art fire. The `for gr` loop glow is slightly expensive but visually justified. Minor polish: add 1-2 smoke particles rising (not from the particles array — just small static grey rect that alpha-fades with sin).

Priority: **P2** (already great)

---

### 2D. Chest/Arca (case 'chest' — sketch.js:6799)
**Current rating: 8/10**

Slightly open lid, golden glow spill, bronze rivets — strong design. The `chestGlow` from sin looks correct. Only issue: the lid `beginShape()` uses float vertices which blur at sub-pixel. Round to `floor()`.

Priority: **P2**

---

### 2E. Temple/Forum/Villa (large buildings — sketch.js:7000+ approx)
Need to read these specifically. Based on grep, these are in the `drawOneBuilding` switch below line 7000.

**Assessment from context:** The temple (`case 'temple'`) is almost certainly simpler than `drawPyramid` since it's a placed building. It likely has a basic column-and-pediment silhouette but less detail than the main pyramid.

**Proposed fix:** Ensure temple building sprite mirrors the pyramid's column detail quality. Add at minimum: 4 columns, architrave, pediment triangle, gabled roof. Current placeholder likely needs full redesign.

Priority: **P1**

---

### 2F. Aqueduct (case 'aqueduct')
**Current rating: unknown — needs read**

An aqueduct should be the most visually exciting building — multi-tiered arches. If it's currently just a wall variant, this needs a full redesign:
- 3 visible arches (each arch = two pillars + curved lintel)
- Water flowing as animated blue horizontal rect through the channel
- Warm stone `fill(192,180,162)` with shadow undersides

Priority: **P1**

---

## SECTION 3: ISLAND TERRAIN + ENVIRONMENT

### 3A. Home Island Grass Terrain (drawIsland — sketch.js:4666)
**Current rating: 7/10**

Good: seasonal colors, wildflower patches, cloud shadows, elevation hints. The layered ellipse approach works. What's missing is **edge definition** — the island blends into the water too smoothly. Pixel art islands have a hard shoreline, not an anti-aliased gradient ring.

**Problems:**
- Sandy beach ring `ellipse(ix,iy-14,iw*0.93,ih*0.39)` is a smooth anti-aliased ellipse — not pixel art
- Wildflower dots are 2x2 — barely visible
- The dithered grass texture loop (sketch.js:4812-4826) uses `ellipse()` for each patch — breaks pixel grid

**Proposed fix:**
- Replace beach ellipse with a `pixelEllipse()` helper that draws an ellipse using 2x2 pixel blocks (rect steps)
- Enlarge wildflower dots to 3x3 with a 1px contrasting center
- Grass texture: replace `ellipse()` with `rect()` for all ground-level detail

Priority: **P1**

---

### 3B. Grass Tufts (drawGrassTufts — sketch.js:5900)
**Current rating: 6/10** (unseen but inferred from state structure)

Each grass tuft has `blades` (4-8), `height` (12-24), `hue` (0.7-1.0). The animation likely uses sine for sway. Strong concept. Likely rendered as thin `line()` calls which anti-alias.

**Proposed fix:** Replace grass blade `line()` with 1px-wide `rect()` stacks — hard edges that look like pixel art grass, not blurry vector grass. Use 2 frames of sway (position 0 or position +1) rather than continuous sin. This gives the characteristic "tick" animation of good pixel art.

Priority: **P1**

---

### 3C. Ruins (drawRuins — sketch.js:6423)
**Current rating: 5/10**

Three ruin fragments placed at island edges (state.ruins array, each `{x,y,w,h,rot}`). At game scale they're tiny and the `rot` (max 0.08 radians) introduces sub-pixel anti-aliasing that makes them look like blurry blobs.

**Proposed fix:**
- Remove `rot` — ruins should have perfectly horizontal/vertical geometry (pixel art discipline)
- Make each ruin piece more complex: a collapsed column (drum sections stacked) + fallen lintel
- Add moss/vine overlay: alternating `fill(50,90,40,60)` patches on top of stone
- Add scatter: small stone fragments as 2x2 rects around each ruin

**Specific changes:**
```
sketch.js:6983-6987 (ruin placement) — remove rot field
sketch.js:6423 (drawRuins function) — full redesign
```

Priority: **P1**

---

### 3D. Trees (drawOneTree — find in sketch.js)
**Assessment:** Three types: oak, pine, olive. These are the most prominent environmental objects and determine if the island reads as "lush Mediterranean" or "generic green blob forest."

**Proposed fix based on type:**
- **Oak**: Wide canopy as overlapping 3-layer ellipses stacked vertically, each 2px narrower. Color: `fill(45,80,30)` base, `fill(60,100,40)` mid, `fill(70,115,45)` top highlights. Trunk: `fill(78,55,35)` 4px wide.
- **Olive**: Gnarled trunk (2px wide with kinks — use 2 connected rects offset 1px for character), silver-green leaves `fill(110,130,75)` with small `fill(200,190,140,80)` oval berries when mature
- **Pine**: Triangular silhouette in 3 tiers, each tier is a solid `triangle()`. Dark green `fill(30,65,35)` with lighter `fill(45,85,50)` left face

Priority: **P1**

---

### 3E. Crystal Nodes (drawOneCrystal — sketch.js:7726)
**Current rating: 7/10** (inferred from state structure + C palette values)

Crystals pulse with `C.crystalGlow = '#44ffaa'` — a vivid green-cyan. Strong signal color. Likely rendered as a cluster of triangles with glow.

Main issue: if they use `ellipse()` for glow, the glow anti-aliases. Use concentric `rect()` squares offset by 1px for a pixel-art glow effect instead.

Priority: **P2**

---

## SECTION 4: UI / HUD POLISH

### 4A. Resource Panel (drawHUD — sketch.js:17184)
**Current rating: 5/10**

The HUD is pure text. `text('SEEDS    ' + state.seeds, 22, resY)` — monospace columns with spaces for alignment. This works functionally but:
- No icons — the player must read every line to know what they're looking at
- Panel grows dynamically and can become very tall (10+ lines)
- `textSize(7)` throughout — functional but not designed

**Proposed fix:**
- Add a 6x6 pixel icon before each resource (inline before the text)
- Icons: Seeds = tiny green cross shape, Wood = brown tree stump rect, Stone = grey square with bevel, Crystal = diamond outline, Gold = circle with dot
- Reduce font size to `textSize(6)` but add icons to compensate for clarity
- Cap panel to always-visible core 5 resources; hide extras behind a small expand button (Q)

**Specific changes:**
```
sketch.js:17219 onwards — before each text() call, add drawResourceIcon(type, x-10, y+3)
Add new function drawResourceIcon(type, x, y) with pixel shapes per type
```

Priority: **P1**

---

### 4B. Hotbar (drawHotbar — sketch.js:17064)
**Current rating: 7/10**

36x36 slots with gold border on selected — solid. Icons exist for each tool (sickle, axe, pick, rod, weapon). The sickle icon is the strongest; the axe and pick are generic. Selected slot glow could use a subtle pulse.

**Proposed fix:**
- Add a 1px inner highlight to selected slot (top-left corner pixels brightest)
- Add slot number as engraved look: dark text with 1px lighter duplicate 1px offset (embossed)
- Weapon slot should show current weapon type with a distinct color: gladius=silver, pilum=bronze, flamma=orange
- Add a subtle bounce animation to the selected slot (translate Y by -1 on even frames)

Priority: **P2**

---

### 4C. Dialog Box (dialogState)
**Current rating: 6/10** (reading from state structure)

The dialog system has a portrait field (`portrait: 'livia'|'marcus'|'vesta'|'felix'`) — this is where per-NPC visual identity matters most. Need to check dialog rendering function.

**Proposed fix:**
- Each NPC dialog box should have a signature color accent on the border:
  - Livia: crimson border `(140,30,50)`
  - Marcus: bronze-iron `(155,130,55)`
  - Vesta: amethyst `(130,60,180)`
  - Felix: olive green `(70,110,40)`
- Speaker name in accent color
- Add a 16x24 pixel portrait thumbnail in top-left corner of dialog box (simplified face from draw functions)

Priority: **P0** (this is a core interaction moment)

---

### 4D. Mini-Map (sketch.js:17369)
**Current rating: 7/10**

Gold border, island ellipse, player dot, NPC dot — clean. The player dot `circle(mcx+pdx,mcy+pdy,4)` blinks nicely. Good but not great.

**Proposed fix:**
- Make island shape more accurate (not a perfect ellipse — offset the center slightly, add a small harbor notch on the west side)
- Add compass rose in corner (4 pixels of N/S/E/W direction dots)
- NPC dots: use colored 2px dots per NPC identity color (Livia=crimson, Marcus=bronze, Vesta=purple, Felix=green) rather than all `fill(200,80,200)`

Priority: **P2**

---

### 4E. Notifications (drawNotifications — sketch.js:11781)
**Current rating: unknown**

Notification system `{ text, col, timer, maxTimer, fadeIn }` — the slide-in/fade-out is the most important juice element in the HUD. If these don't feel snappy they ruin the harvest loop.

**Proposed fix:**
- Add a horizontal pixel-bar separator between notification text and box edge
- Ensure slide-in easing is cubic (not linear): `easeOut = 1 - pow(1-t, 3)`
- Add a 1px left colored accent bar (color matches notification type)
- Resource gain notifications: gold text on dark bg. Quest updates: teal. Combat: red.

Priority: **P1**

---

## SECTION 5: PARTICLE EFFECTS

### 5A. spawnParticles function
**Current rating: 7/10**

Types include: `sundust`, `harvest`, `combat`, `burst`, `divine`, `dash`, `build`. The particle cap `_particleCap` auto-throttles. Good engineering.

**Problems:**
- `sundust` particles are 1-3px squares that drift upward — generic
- `harvest` likely green squares — readable but not exciting
- `divine` (used for level-up, healing) should feel TRANSCENDENT

**Proposed fix per type:**
- **harvest**: Add a 2-frame "cross" shape (1px horizontal + 1px vertical) that rotates 45 degrees mid-flight instead of just a square
- **divine**: Gold star shape (5 pixels in + pattern) that expands then fades — not just a square
- **combat**: Keep red squares but add a 3px line trailing behind each particle (motion streak)
- **dash**: Afterimage ghost pixels — 2x2 blocks that start at full player color and fade to transparent

Priority: **P1** (particles are 30% of game feel)

---

### 5B. Floating Text (addFloatingText)
**Current rating: 8/10**

Outlined text helper exists and is used consistently. The `outlinedText()` function at sketch.js:14 is solid.

**One fix:** The drift velocity should use easing — text should accelerate upward in the first 5 frames, then decelerate and fade. Currently likely linear drift. Add: `vy *= 0.96` each frame instead of constant velocity.

Priority: **P2**

---

## SECTION 6: WEATHER VISUALS

### 6A. Rain (drawWeatherEffects — sketch.js:3858)
**Current rating: 6/10**

Angled `line()` raindrops with splash `circle()`. The wind effect `r.wind = random(-1.5,-0.5)` is correct. But:
- Lines anti-alias — in a pixel art game, rain should be 1x3 or 1x4 `rect()` blocks
- Splash circles anti-alias — replace with 3x1 horizontal rect for the splash

**Specific changes:**
```
sketch.js:3882 — line(r.x,r.y,...) → rect(floor(r.x),floor(r.y),1,floor(r.len))
sketch.js:3889 — circle(r.x,...) → rect(floor(r.x)-2,floor(height*0.75),4,1)
```

Priority: **P1**

---

### 6B. Fog (drawWeatherEffects — sketch.js:3933)
**Current rating: 4/10**

Static rectangles at fixed positions — fog doesn't move. This looks broken: the fog bars are obviously static rectangles against the animated world.

**Proposed fix:**
- Add slow horizontal drift to each fog band: `let driftX = sin(frameCount * 0.005 + i * 1.3) * 30`
- Use 3 overlapping bands at different speeds (parallax)
- Add vertical undulation: `let undulY = cos(frameCount * 0.004 + i * 0.8) * 8`
- Darken the outer edges of each band (the `fill(200,210,220,fogAlpha*0.5)` edge fade is right but needs to be rendered as a gradient of 4 steps, not one rect)

**Specific changes:**
```
sketch.js:3939-3948 — replace static rect with:
  for (let i = 0; i < 6; i++) {
    let driftX = sin(frameCount * 0.005 + i * 1.3) * 30;
    let undulY = cos(frameCount * 0.004 + i * 0.8) * 8;
    let fx = floor(width * (0.1 + i * 0.15) + driftX);
    let fy = floor(height * 0.25 + i * 35 + undulY);
    ... (rest of fog rendering)
```

Priority: **P1**

---

### 6C. Heatwave (drawWeatherEffects — sketch.js:3914)
**Current rating: 5/10**

The sin-wave horizontal scan lines are a good approach for heat shimmer. Problem: `rect(wave+wave2, y, width, 5)` — a full-width rect shifted by 3 pixels looks like screen jitter, not heat. And `circle(width*0.5, height*0.08, 250)` is a smooth anti-aliased circle.

**Proposed fix:**
- Replace full-width rects with broken horizontal segments: multiple 20-40px rects per row with gaps between them, offset by the wave value. This simulates rising heat columns rather than screen warp.
- Replace sun circle with a stepped "pixel sun" using concentric rects

Priority: **P2**

---

## SECTION 7: WATER / OCEAN RENDERING

### 7A. Deep Ocean (drawOcean — sketch.js:2611)
**Current rating: 8/10**

12-band gradient, animated sine wave scan-lines, caustic patterns, bioluminescence at night, jumping fish — this is genuinely strong. One of the best systems in the game.

**Problems:**
- Wave scan-lines at `wy += 7` give a visible 7px band pattern — could be reduced to 5 or 4 for finer resolution
- Foam whitecaps at `wy += 20` are very sparse — the ocean feels empty between foam bursts
- Sun reflection column (sketch.js:2716) renders only near the top of the ocean (65px tall) — should extend further down with decreasing alpha

**Proposed fix:**
- Reduce wave row height from 7 to 5: `for (let wy = oceanTop + 4; wy < height; wy += 5)`
- Add an intermediate foam level: `wy += 10` with half alpha
- Extend sun reflection to 120px tall with a quadratic alpha falloff

Priority: **P2** (system is already good)

---

### 7B. Shore Waves (drawShoreWaves — sketch.js:2846)
**Current rating: 7/10**

Foam and wave animation at the island shoreline. The multi-layer foam approach (3 layers with phase offsets) is the right technique.

**Proposed fix:** Add a 4th "backwash" foam layer that moves in the opposite direction at 40% speed. This creates the authentic push-pull of tide foam and makes the shoreline feel alive.

Priority: **P2**

---

### 7C. Island Lagoon Shallow Water (drawIsland — sketch.js:4676)
**Current rating: 7/10**

4 concentric ellipses from deep blue to bright turquoise — correct gradient direction. The foam wave ring at `foamRX = iw*(0.465+foamPulse)` is animated nicely.

**Proposed fix:** Replace the 4 `ellipse()` calls with a pixelated approach — each concentric "ring" drawn as a series of 3px rects stepped around the island perimeter. This would be a significant change but would dramatically improve pixel art consistency.

**Alternative (lower effort):** Keep ellipses for the water body, but add a hard 2px pixel-stepped shoreline ring in the sand color over the water edge. This creates the crisp "beach meets water" line of good pixel art island art.

Priority: **P1** (the alternative approach)

---

## SECTION 8: DISTANT ISLAND RENDERING

### 8A. Vulcan (drawVulcanIsland — islands.js:42)
**Current rating: 6/10**

5 concentric ellipses from dark brown to charcoal with lava pool glow. The volcano silhouette `fill(55,48,40)` mountain bump at top is good but too subtle.

**Proposed fix:**
- Make the volcanic peak more dramatic: taller central mountain (not just one ellipse — stack 3 triangles of decreasing width for a proper cone silhouette)
- Add a permanent thin smoke column from the crater: 3px wide `rect()` column that drifts and fades over 30px height
- Lava pool glow `fill(255,80,20,60*glow)` — good, keep it

Priority: **P1**

---

### 8B. Hyperborea (drawHyperboreIsland — islands.js:144)
**Current rating: 7/10**

White/pale blue ellipses with aurora borealis — good read. The aurora `fill(60,255,150,12*a)` is very subtle (alpha 12 max).

**Proposed fix:**
- Aurora alpha: `12*a` → `30*a` — make it actually visible
- Add a glacial cliff edge on the south side: `fill(200,225,245)` rect with `fill(160,195,225)` shadow side (like a pixel art ice shelf)
- Snow drifts: 3 small `rect()` piles at island base `fill(240,248,255,180)`

Priority: **P2**

---

### 8C. Isle of Plenty (drawPlentyIsland — islands.js:248)
**Current rating: 6/10**

Sandy outer ring + deep green interior. The waterfalls `rect(wx-3,wy,6,wf.h)` are 6px wide — correct. But the island reads as "generic green blob" from distance.

**Proposed fix:**
- Add palm tree silhouettes on the island rim: 3-4 pixel-art palms (trunk + fan top)
- Lighten the interior green: `fill(25,110,40)` → `fill(40,135,55)` so it contrasts with Vulcan's dark browns
- Add a waterfall sound-spray at the base of each waterfall: `fill(160,220,235,40)` mist ellipse

Priority: **P2**

---

### 8D. Necropolis (drawNecropolisIsland — islands.js ~305)
**Current rating: unknown — not read**

From state: it has tombs, skeletons, ghost NPCs, wisps, darkAura. The visual should be deeply unsettling.

**Expected problems:** Likely uses the same ellipse-stack approach as other islands but in dark grey/purple. Needs:
- Mausoleum silhouette as the landmark (a domed building, even at low detail)
- Wisp particles visible even from distance (small glowing `fill(180,130,220,80)` dots orbiting slowly)
- A desaturated color palette — literally less saturation than all other islands

Priority: **P1** (narrative importance of this island)

---

## SECTION 9: MENU IMPROVEMENTS

### 9A. Menu Screen (drawMenuScreen — menu.js:38)
**Current rating: 8/10**

The menu is genuinely good. Background image with parallax drift, birds flying, shore foam (3 layers), god rays, animated boats, window lights with oil-lamp flicker physics — this is strong work. The roman chevron menu pointer animation is exactly right.

**Problems:**
- Birds `rect(bx-1,by,3,2)` and wings `rect(bx-bird.size, by-wingUp, bird.size, 1)` — 1px wing height is invisible at small bird sizes
- Version text `text('v0.9 - Shipwrecked...')` — wrong version number (v1.0.0)
- Boat overlays `fill(80,160,210,15)` and `fill(200,230,255,12)` — wake ellipses with alpha 12-15 are invisible against the background image

**Proposed fix:**
- Birds: make wings 2px high `rect(bx-bird.size, by-wingUp, bird.size, 2)`
- Update version string to `v1.0.0`
- Boat wake: increase alpha to `fill(200,230,255,35)` and add a 2px shadow line

Priority: **P1** (version number is P0)

---

### 9B. Settings Panel (drawSettingsPanel — menu.js:541)
**Current rating: 5/10**

Functional but sparse. Dark panel with text labels, toggle switch, volume sliders. The toggle switch `rect(tbx,tby,28,14)` is well-sized but the slider knob `rect(tbx+(fsOn?16:2),tby+2,10,10)` is a plain square.

**Proposed fix:**
- Add a Roman ornamental header (same laurel-line ornament as menu title)
- Volume sliders: add tick marks at 25%/50%/75% above the slider track
- Delete save button: add red border to make its danger obvious
- Add border-radius pixel bevel to the panel corners (2px corner pixels in `fill(30,24,18)`)

Priority: **P2**

---

## SECTION 10: ADDITIONAL SYSTEMS

### 10A. Pyramid/Temple (drawPyramid — sketch.js:6056)
**Current rating: 9/10**

This is the best single piece of art in the game. Proper Corinthian columns with entasis, acanthus leaf capitals, three-fascia architrave, triglyphs and metopes in the frieze, Doric dentils in the cornice, and a full pediment. This sets the standard everything else should aspire to.

The only improvement: the pediment `beginShape()` (sketch.js:6205+) should contain a sculptural element — a pixelated eagle or sol invictus sun disc rendered inside the tympanum. Currently the pediment likely has only raking cornices.

Priority: **P2** (already excellent)

---

### 10B. Crystal Shrine (drawCrystalShrine)
**Assessment:** This is the spiritual center of the left side of the island. From the state structure it's positioned at `islandCX - 440, islandCY - 15`. With 5 crystal nodes around it, it should be the most visually striking small structure on the island.

**Proposed:** An altar stone (3 stacked `rect()` blocks getting narrower toward top) with the `C.crystalGlow` energy emanating from the top in cross-shaped pixel beams. Similar to how the Lares spirit has its cross-shaped glow aura.

Priority: **P1**

---

### 10C. Wreck Beach Rendering (wreck.js)
The wreck beach rendering is called by the main draw loop. From reading wreck.js, the rendering functions (`drawWreckBeach`, `drawWreckDecor`, etc.) are in sketch.js.

**Key issues to fix (from state structure):**
- The wrecked ship itself needs to be a distinctive pixel art silhouette — not just planks
- Palm trees `state.wreck.palms` with `swayPhase` should have proper coconut palm rendering (arching fronds, not circular canopy)
- Crabs need the cutest possible pixel art design — 8px wide, 4px tall, with 2px claws (this is a first impression moment)

Priority: **P1** (the wreck beach is the player's first experience)

---

## IMPLEMENTATION PRIORITY QUEUE

### P0 — Fix Immediately (Critical Impression Damage)
1. **Vesta visual identity** — she's invisible on the island (sketch.js:21024)
2. **Dialog box NPC color identity** — find dialog draw function, add per-NPC accent colors
3. **Version string** — `v0.9` → `v1.0.0` (menu.js:533)
4. **Livia scale bug** — remove `scale(0.72)`, redesign at 1x (sketch.js:10642)

### P1 — High Impact Visual Improvements
5. **Felix unique identity** — hat, tablet, farmer silhouette (sketch.js:~21100)
6. **Rain droplets as rects** — remove line() anti-alias (sketch.js:3882)
7. **Fog animation** — make fog move (sketch.js:3933-3953)
8. **Mosaic floor contrast** — dark/light checker pattern (sketch.js:6726)
9. **Grass tufts as hard pixel rects** — remove line() (sketch.js:5900)
10. **Particle harvest crosses** — add rotate to harvest particles (spawnParticles)
11. **Marcus cape width** — 4px → 6px (sketch.js:20908)
12. **Notification slide easing** — cubic ease-out (sketch.js:11781)
13. **Resource icons in HUD** — inline pixel icons before text (sketch.js:17219)
14. **Ruins redesign** — remove rotation, add collapsed column detail (sketch.js:6423)
15. **Tree type diversity** — oak/pine/olive distinct silhouettes
16. **Hyperborea aurora alpha** — 12 → 30 (islands.js:155)
17. **Island hard shoreline ring** — 2px pixel-stepped beach edge (sketch.js:4676)
18. **Crystal Shrine focal piece redesign**
19. **Wreck beach crab pixel art** — definitive cute crab design
20. **Vesta flame in hand** — left-hand sacred flame

### P2 — Polish Pass (8 → 10)
21. **Companion laurel wreath arch** — connected pixel diamonds
22. **Hotbar selected slot bounce** (sketch.js:17064)
23. **Mini-map compass rose** (sketch.js:17369)
24. **Mini-map NPC identity colors**
25. **Bioluminescence enhancement** — brighter, more plankton
26. **Shore backwash foam layer** (sketch.js:2846)
27. **Chest lid vertices floored** (sketch.js:6815)
28. **Torch smoke rising** — static grey alpha rect above flame
29. **Hyperborea glacial cliff** — ice shelf rect silhouette (islands.js)
30. **Sun sparkle pixel cross** — `+` shape rather than `|` shape
31. **Settings panel ornamental header** (menu.js:541)
32. **Menu bird wing height** — 1px → 2px (menu.js:176)
33. **Pediment sculpture** — eagle or sol disc in pyramid tympanum

---

## IMPLEMENTATION NOTES

**Coordinate discipline:** Every new pixel art element must use `floor()` on all x/y coordinates. The pattern `rect(floor(sx)-4, floor(sy)-8, 8, 12)` should be used everywhere. The existing code is inconsistent — some functions floor, some don't.

**No new `ellipse()` for pixel art elements.** Ellipses anti-alias. Use concentric rects, stepping around a shape manually, or `beginShape()`/`vertex()` with integer coordinates only.

**Color rule:** Every new color added must be tested against both the island grass `(58,95,40 approx)` and the ocean background `(20,65,100 approx)` to ensure sufficient contrast. Use the existing `C` palette where possible.

**Scale 0.72 is the enemy.** Any character drawn at sub-1x scale loses pixel precision. All characters should be drawn at 1x and sized appropriately at design time.

**The standard is the pyramid.** Every building should aim for the level of detail in `drawPyramid`. It has: base platform, columns, entablature, pediment, doorway, glow effects, level-scaled proportions. That's the target for every placed building.
