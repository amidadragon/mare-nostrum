# Mare Nostrum — Definitive Island City Map

**Master reference for all building placement. All code decisions defer to this document.**

---

## Coordinate System

```
cx = WORLD.islandCX = 600   (island center X)
cy = WORLD.islandCY = 400   (island center Y)

getSurfaceRX() = state.islandRX * 0.90   (walkable radius X)
getSurfaceRY() = state.islandRY * 0.36   (walkable radius Y)

Positions in code: cx + rx * factor,  cy + ry * factor
  where rx = getSurfaceRX(), ry = getSurfaceRY()
```

### Island Growth by Level

| Level | islandRX | islandRY | srx  | sry |
|-------|----------|----------|------|-----|
| 1     | 500      | 320      | 450  | 115 |
| 5     | 740      | 480      | 666  | 173 |
| 8     | 875      | 570      | 788  | 205 |
| 10    | 965      | 630      | 869  | 227 |
| 15    | 1140     | 740      | 1026 | 266 |
| 18    | 1215     | 788      | 1094 | 284 |
| 20    | 1265     | 820      | 1139 | 295 |
| 25    | 1355     | 880      | 1220 | 317 |

Growth rate: +60rx/+40ry per level (Lv 1-5), +45/+30 (Lv 6-10), +35/+22 (Lv 11-15), +25/+16 (Lv 16-20), +18/+12 (Lv 21-25)

---

## Island Zone Map

```
                         NORTH  cy - ry*0.7+
                    ┌──────────────────────────┐
                    │       SACRED HILL         │
                    │   PYRAMID / TEMPLE        │
                    │    (cx, cy-15)            │
                    │  Lv24: IMPERIAL PALACE    │
                    │     (cx, cy-ry*0.5)       │
        NW          │      AQUEDUCT ROW         │         NE
   ┌──────────┐     │   (cx±ry*0.25 to 0.5)    │    ┌──────────┐
   │RESIDENTIAL│    │                            │   │  CIVIC    │
   │ Domus ×6  │    │                            │   │  Library  │
   │ Villa     │    │                            │   │  Shrine   │
   │cx-rx*0.2  │    │                            │   │cx+rx*0.3  │
   │cy-ry*0.35 │    │                            │   │cy-ry*0.35 │
   └──────────┘     │         CENTER             │   └──────────┘
                    │    FORUM  CAMPFIRE         │
  WEST              │  (cx-rx*0.05, cy+ry*0.15) │              EAST
┌──────────┐        │  Via Principalis runs E-W  │       ┌──────────┐
│  FARM    │        │                            │       │  MARKET  │
│ Plots    │        │                            │       │cx+rx*0.5 │
│ Granary  │        │                            │       │cy+ry*0.1 │
│ Crystal  │        │                            │       └──────────┘
│ Shrine   │        │                            │
│cx-rx*0.45│        │                            │
└──────────┘        │                            │
        SW          │                            │         SE
   ┌──────────┐     │                            │    ┌──────────┐
   │  PORT    │     │                            │    │ MILITARY │
   │ portLeft │     │                            │    │ Castrum  │
   │cx-srx-20 │     │                            │    │ Arena    │
   │cy+sry*0.15     │                            │    │cx+rx*0.35│
   └──────────┘     └──────────────────────────┘    │cy+ry*0.35│
                         SOUTH  cy + ry*0.6+         └──────────┘
```

---

## District Definitions

### SACRED HILL — Center-North  (cx, cy-15 to cy-ry*0.7)
The spiritual and political axis of the island. Everything radiates outward from here.

- **Pyramid / Crystal Beacon**: `cx, cy-15` — always present, grows every level
- **Aqueduct Row** (Lv 9): `cx-rx*0.1` to `cx+rx*0.3`, `cy-ry*0.55` — three segments spanning north
- **Aqueduct Extension** (Lv 14): `cx-rx*0.3`, `cx-rx*0.5`, `cy-ry*0.55` — westward extension
- **Grand Aqueduct** (Lv 23): `cx-rx*0.5` to `cx+rx*0.5`, `cy-ry*0.6` — five segments, full span
- **Temple** (Lv 10): `cx+rx*0.55, cy-ry*0.35` — east of sacred hill, civic zone border
- **Grand Temple** (Lv 25): `cx, cy-ry*0.7` — island peak, ultimate monument
- **Imperial Palace** (Lv 24): `cx, cy-ry*0.5` — villa + garden + lanterns
- **Bridge** (Lv 9): `cx, cy-ry*0.3` — residential NW to civic NE crossing
- **Bridges** (Lv 23): `cx-rx*0.35`, `cx+rx*0.15`, `cy-ry*0.45` — grand aqueduct-level crossings

Lighting: lanterns along palace approach (Lv 24), torches flanking temple (Lv 10), mosaic processional (Lv 25)

---

### RESIDENTIAL — Northwest  (cx-rx*0.15 to cx-rx*0.45, cy-ry*0.2 to cy-ry*0.45)
Citizens arrive in two waves. Dense housing street with torchlight.

- **First Domus × 2** (Lv 6): `cx-rx*0.2` and `cx-rx*0.2+44`, `cy-ry*0.2` — side by side, torch between
- **Housing Row × 4** (Lv 16): `cx-rx*0.25` through `cx-rx*0.25+132`, `cy-ry*0.35` — four domus + 3 torches
- **Villa** (Lv 20): `cx-rx*0.3, cy-ry*0.55` — north prominence, flowers on all sides
- **Well** (Lv 12): `cx-rx*0.2, cy+ry*0.4` — SW of district, water access
- **Fence** (Lv 4): `cx-rx*0.35`, `cy-ry*0.1` and `cy+ry*0.05` — farm entrance border
- **Bridge** (Lv 14): `cx+rx*0.1, cy+ry*0.1` — market to residential crossing

Lighting: torches at first domus (Lv 6), torches along housing street (Lv 16), flowers flanking villa (Lv 20)
Ground: floor tiles along path from farm to granary (Lv 5)

---

### FARM — West  (cx-rx*0.45 center, cy~)
The economic foundation. Grows every even level.

- **Farm Center**: `WORLD.islandCX - 220, WORLD.islandCY - 5` (fixed, pre-srx)
  = approximately `cx - rx*0.49` at Lv1, shifts as island grows
  (`getFarmCenterX() = cx - srx*0.45`, `getFarmCenterY() = cy - sry*0.04`)
- **Farm Plots**: `rebuildFarmGrid(1)` at start, `addFarmPlots()` at even levels 2-24
- **Chickens × 3**: scatter around farmCX±60, farmCY±30
- **Fence × 2** (Lv 2): `farmCX+60, farmCY-30` and `farmCY+10` — east side of farm
- **Granary** (Lv 5): `getFarmCenterX(), getFarmCenterY() - ry*0.7` — north of farm center
  - Torches flanking entrance: `farmCX ± 28`
- **Crystal Shrine**: `cx - 440, cy - 15` (hardcoded, far west)
  - Crystal nodes orbit the shrine: dx ±30-60, dy ±15-45
  - Additional crystals added at Lv 2, 3, 4, 5 (one each), then even levels 6-24

Ground: floor tiles along farm path (Lv 5), fence segments mark perimeter

---

### CIVIC — Northeast  (cx+rx*0.25 to cx+rx*0.65, cy-ry*0.55 to cy+ry*0.05)
Knowledge, religion, and culture cluster here.

- **Shrine** (Lv 3): `cx+rx*0.4, cy-ry*0.35` — 3 floor tiles + shrine building
- **Temple** (Lv 10): `cx+rx*0.55, cy-ry*0.35` — flanked by torches at ±32
- **Temple Gardens** (Lv 11): flowers at `cx+rx*0.45/0.55/0.65, cy-ry*0.15`, mosaic above
- **Library** (Lv 17): `cx+rx*0.3, cy-ry*0.35` — 3 floor tiles + 2 lanterns
- **Watchtower** (Lv 13): `cx+rx*0.7, cy` — eastern edge sentinel
- **Watchtower** (Lv 15): `cx+rx*0.8, cy-ry*0.1` — far edge tower
- **Lanterns** (Lv 10): `cx+rx*0.3`, `cy-ry*0.15` and `cy+ry*0.05` — civic district entry
- **Lanterns** (Lv 11): `cx+rx*0.5, cy-ry*0.25` — temple garden lantern
- **Floor tiles** (Lv 10): `cx+rx*0.4`, `cy-ry*0.1` and `cy` — east road paving

Lighting: temple torches (Lv 10), garden lanterns (Lv 11), library lanterns (Lv 17)
Ground: floor tiles approach (Lv 3 plaza, Lv 10 road paving, Lv 17 library forecourt)

---

### CENTER — Town Core  (cx-rx*0.15 to cx+rx*0.2, cy-ry*0.1 to cy+ry*0.3)
The civic heart. Forum, plaza, campfire, and the Via Principalis crossing.

- **Campfire**: spawned at init, near center
- **Town Center Plaza** (Lv 10): 6 floor tiles at cx±0/±20, cy+10 and cy+30
- **Well** (Lv 4): `cx+rx*0.1, cy+ry*0.3` — central water access
- **Forum** (Lv 15): `cx+rx*0.05, cy+ry*0.15` — forum + 3 mosaic tiles below
- **Senate Forum** (Lv 21): `cx-rx*0.15, cy+ry*0.15` — larger forum, 4 floor tiles + 2 torches
- **Mosaic Processional** (Lv 25): `cx-30/0/+30, cy-ry*0.1` — 3 mosaics + 2 lanterns
- **Lanterns Along Via** (Lv 12): `cx+rx*0.15`, `cx+rx*0.3`, `cx+rx*0.45`, `cy` — east road

Ground: plaza tiles (Lv 10), mosaic forum approach (Lv 15, Lv 21), grand processional (Lv 25)
Lighting: town torch (Lv 2), well torch (Lv 5), via lanterns (Lv 12), processional lanterns (Lv 25)

---

### MARKET — East  (cx+rx*0.4 to cx+rx*0.75, cy-ry*0.05 to cy+ry*0.2)
Trade quarter. Two market buildings, harbor arch, lantern road.

- **Market Stall 1** (Lv 7): `cx+rx*0.5, cy+ry*0.1` — 2 torches flanking
- **Market Stall 2** (Lv 10): near port, `port.x+80, port.y-30`
- **Triumphal Arch** (Lv 15): `cx+rx*0.65, cy` — east road arch
- **Harbor Arch Gate** (Lv 22): `cx+rx*0.72, cy+ry*0.1` — harbor entrance
- **Lanterns** (Lv 22): `cx+rx*0.4/0.5/0.6, cy+ry*0.1` — harbor road lighting

Lighting: market torches (Lv 7), harbor lanterns (Lv 22)

---

### MILITARY — Southeast  (cx+rx*0.3 to cx+rx*0.55, cy+ry*0.3 to cy+ry*0.55)
Castrum, arena, walls. Rome's fist.

- **Castrum** (Lv 8): `cx+rx*0.45, cy+ry*0.5` — flanked by torches at ±34
- **Via Militaris floor tiles** (Lv 8): `cx+rx*0.35`, cy+ry*0.2/0.3/0.4` — approach road
- **Wall segment** (Lv 8): `cx+rx*0.4, cy+ry*0.5`
- **Wall segments** (Lv 13): `cx+rx*0.25` and `cx+rx*0.45`, `cy+ry*0.35`
- **Watchtower** (Lv 13): `cx-rx*0.1, cy+ry*0.35` — visible from farm zone
- **Arena** (Lv 18): `cx+rx*0.35, cy+ry*0.35` — 2 torches flanking entrance
- **Arena Mosaics** (Lv 19): `cx+rx*0.35±20, cy+ry*0.35+52` — 2 mosaics
- **Arena Lanterns** (Lv 19): `cx+rx*0.35±50, cy+ry*0.35+30` — approach lighting
- **Arch** (Lv 25): `cx+rx*0.4, cy+ry*0.3` — southern triumphal arch
- **Villa** (Lv 25): `cx-rx*0.4, cy+ry*0.3` — southwest villa counterpoint

Lighting: castrum torches (Lv 8), arena torches (Lv 18), arena lanterns (Lv 19)
Ground: via militaris floor tiles (Lv 8), arena mosaics (Lv 19)

---

### BATH HOUSES — Southwest  (cx-rx*0.3, cy+ry*0.3 to cy+ry*0.45)
Civic comfort. Two bathhouses, one for common folk, one for the growing city.

- **Bath House 1** (Lv 8): `cx-rx*0.3, cy+ry*0.35` — first civic amenity
- **Bath House 2** (Lv 14): `cx+rx*0.3, cy+ry*0.35` — second, serves east district

---

### PORT — West Shore
Entry point to the island. Dock and merchant quay.

- **portLeft** (rowboat dock): `cx - srx - 20, cy + sry*0.15` — dynamic, follows island edge
- **portRight** (merchant dock): `cx + srx + 10, cy - sry*0.05` — east shore
- **Arch near Port** (Lv 20): `port.x + 120, port.y - 15` — triumphal gate
- **Market near Port** (Lv 10): `port.x + 80, port.y - 30`

---

### AMBIENT / EDGE ELEMENTS (all levels)
Not zoned — scattered at island perimeter.

- **Trees**: `cx+100 to cx+360`, flanking `avenueY = cy-8` (east grove, init)
  Additional trees scattered: cx+150 to cx+360, various Y (Lv 2-5), random perimeter (Lv 6+)
- **Ruins**: `cx+260, cy-70` (Lv 3), `cx, cy+80` (Lv 5), procedural every 3rd level
- **Resources (stone/vine/leaf)**: south strip, east grove edge, west of farm (init)
  Additional rings at Lv 2 (south), Lv 3 (NE), Lv 4 (NW), Lv 5 (grand ring), procedural Lv 6+
- **Cats × 2**: `cx+200, cy-30` (dark tabby) and `cx-250, cy+10` (orange tabby)
- **Grass Tufts**: rim ring, 0.72-0.92 of surface radius, avoiding farm/center

---

## Road Network

### Via Principalis (Main Road)
Runs W-E through the island center at `y ≈ cy-8` (avenueY).
- Trees line both sides from `cx+100` to `cx+360`
- Floor tiles paved from center east from Lv 3 onward
- Lanterns installed Lv 12: `cx+rx*0.15/0.3/0.45, cy`
- Triumphal arch crosses it at Lv 15: `cx+rx*0.65, cy`
- Harbor arch at far east end Lv 22: `cx+rx*0.72, cy+ry*0.1`

### Via Militaris (Military Road)
Runs center south-east to castrum.
- Floor tiles: `cx+rx*0.35`, `cy+ry*0.2/0.3/0.4` (Lv 8)
- Wall boundary at `cx+rx*0.4, cy+ry*0.5`
- Leads directly to Castrum at `cx+rx*0.45, cy+ry*0.5`

### Sacred Way (Temple Approach)
Floor tiles approach the temple from the west.
- Lv 3 plaza: `cx+rx*0.35±20, cy-ry*0.3` — three tiles + shrine
- Lv 10 paving: `cx+rx*0.4`, `cy-ry*0.1` and `cy`
- Temple entry lanterns: `cx+rx*0.3`, `cy-ry*0.15` and `cy+ry*0.05`

### Via Granaria (Farm Road)
Floor tiles from farm to granary.
- Lv 5: `cx-rx*0.1`, `cy-ry*0.3/0.15/0` — three tiles north toward granary

### Forum Plaza Processional
From Via Principalis south to Forum, then grand processional at max level.
- Lv 15 forum mosaic: `cx+rx*0.05±30, cy+ry*0.15+30`
- Lv 21 senate tiles: `cx-rx*0.15±20/+40, cy+ry*0.15+32`
- Lv 25 grand processional: `cx±30/0, cy-ry*0.1` mosaics + lanterns

---

## Level-by-Level Spawn Schedule

### Era 1: Village (Lv 1-8)

**Level 1 — Shipwreck**
- Pyramid: `cx, cy-15`
- Crystal Shrine: `cx-440, cy-15`
- Crystal Nodes × 5: orbiting shrine (dx ±0-40, dy ±15-35)
- Farm plots (grid): `cx-220, cy-5` core
- Trees: east grove flanking `cy-8` road
- Resources: south strip + east grove + west farm (10 positions)
- Cats × 2, Chickens × 3

**Level 2 — Farm Fenced**
- Fence × 2: `farmCX+60, farmCY-30/+10`
- Torch: `cx+rx*0.05, cy+ry*0.05` (town center)
- Resources: south quarter (cx-120 to cx+100, cy+70)
- Crystal Node added: `shrine+50, shrine+30`
- Trees: `cx+180/230/300, cy+30-40`
- Farm plots: row added

**Level 3 — Shrine Consecrated**
- Floor tiles × 3 + Shrine: `cx+rx*0.35±20, cy-ry*0.3` + `cx+rx*0.4, cy-ry*0.35`
- Resources: NE quarter (cx+160-300, cy-30 to cy-80)
- Crystal Node added: `shrine-50, shrine+30`
- Trees: `cx+150/280/320, cy-25 to cy-60`
- Ruin: `cx+260, cy-70`
- Farm plots: row added

**Level 4 — Well Dug**
- Well: `cx+rx*0.1, cy+ry*0.3`
- Fence × 2: `cx-rx*0.35, cy-ry*0.1` and `cy+ry*0.05`
- Resources: NW quarter (cx-200 to cx-340, cy-20 to cy-70)
- Crystal Node added: `shrine, shrine-45`
- Trees: `cx+200/250/340, cy+15 to cy+50`
- Farm plots: row added

**Level 5 — Granary Built**
- Granary: `getFarmCenterX(), getFarmCenterY()-ry*0.7`
- Torches × 2 flanking granary
- Well: `cx+rx*0.35, cy+ry*0.55`
- Torch near well
- Floor tiles × 3: `cx-rx*0.1`, `cy-ry*0.3/0.15/0`
- Resources: grand ring (cx±350, cx±150, cx, cy+30-90)
- Crystal Nodes × 2: `shrine±60, shrine-10`
- Trees: `cx+180/240/300/350/360, cy-70 to cy+60`
- Ruin: `cx, cy+80`
- Farm plots: row added

**Level 6 — Domus Rise**
- House × 2: `cx-rx*0.2` and `cx-rx*0.2+44`, `cy-ry*0.2`
- Torch between domus: `cx-rx*0.2+22, cy-ry*0.2+16`
- Procedural resources ring, crystal (even), trees, ruin (every 3rd)

**Level 7 — Market Opens**
- Market: `cx+rx*0.5, cy+ry*0.1` + torches ±26
- Procedural additions

**Level 8 — Baths & Castrum**
- Bath House: `cx-rx*0.3, cy+ry*0.35`
- Castrum: `cx+rx*0.45, cy+ry*0.5` + torches ±34
- Via Militaris floor tiles × 3: `cx+rx*0.35`, `cy+ry*0.2/0.3/0.4`
- Wall: `cx+rx*0.4, cy+ry*0.5`

---

### Era 2: City (Lv 9-17)

**Level 9 — Aqueduct Spans**
- Aqueduct × 3: `cx-rx*0.1`, `cx+rx*0.1`, `cx+rx*0.3`, `cy-ry*0.55`
- Bridge: `cx, cy-ry*0.3`

**Level 10 — Temple & Market**
- Temple: `cx+rx*0.55, cy-ry*0.35` + torches ±32
- Market (near port): `port.x+80, port.y-30`
- Plaza tiles × 6: `cx±0/±20`, `cy+10` and `cy+30`
- Lanterns × 2: `cx+rx*0.3`, `cy-ry*0.15` and `cy+ry*0.05`
- Floor tiles × 2: `cx+rx*0.4`, `cy-ry*0.1` and `cy`
- Unlocks: imperial_governor journal

**Level 11 — Temple Gardens**
- Flowers × 3: `cx+rx*0.45/0.55/0.65, cy-ry*0.15`
- Mosaic: `cx+rx*0.55, cy-ry*0.55`
- Lantern: `cx+rx*0.5, cy-ry*0.25`

**Level 12 — Lanterns & Well**
- Lanterns × 3: `cx+rx*0.15/0.3/0.45, cy` — Via Principalis lit
- Well: `cx-rx*0.2, cy+ry*0.4`

**Level 13 — Watchtowers & Walls**
- Watchtower: `cx+rx*0.7, cy`
- Walls × 2: `cx+rx*0.25` and `cx+rx*0.45`, `cy+ry*0.35`
- Watchtower (farm view): `cx-rx*0.1, cy+ry*0.35`

**Level 14 — Extended Aqueduct & Second Baths**
- Aqueduct × 2: `cx-rx*0.3` and `cx-rx*0.5`, `cy-ry*0.55`
- Bath House: `cx+rx*0.3, cy+ry*0.35`
- Bridge: `cx+rx*0.1, cy+ry*0.1`

**Level 15 — Forum & Watchtower**
- Forum: `cx+rx*0.05, cy+ry*0.15` + mosaics × 3 below
- Watchtower: `cx+rx*0.8, cy-ry*0.1`
- Triumphal Arch: `cx+rx*0.65, cy`
- Unlocks: imperial_senator journal

**Level 16 — Housing Expansion**
- House × 4: `cx-rx*0.25` through `cx-rx*0.25+132`, `cy-ry*0.35`
- Torches × 3 along housing street

**Level 17 — Great Library**
- Library: `cx+rx*0.3, cy-ry*0.35` + floor tiles × 3 + lanterns × 2
- Unlocks: end of City era

---

### Era 3: Atlantis (Lv 18-25)

**Level 18 — Arena Rises**
- Arena: `cx+rx*0.35, cy+ry*0.35` + torches ±36

**Level 19 — Arena Complete**
- Mosaics × 2: `cx+rx*0.35±20, cy+ry*0.35+52`
- Lanterns × 2: `cx+rx*0.35±50, cy+ry*0.35+30`

**Level 20 — Villa & Arch**
- Arch (port gate): `port.x+120, port.y-15`
- Villa (north): `cx-rx*0.3, cy-ry*0.55`
- Flowers × 4 flanking villa
- Unlocks: imperial_consul journal, Imperial Bridge

**Level 21 — Senate Forum**
- Forum: `cx-rx*0.15, cy+ry*0.15` + torches × 2 + floor tiles × 4

**Level 22 — Harbor Gate**
- Arch: `cx+rx*0.72, cy+ry*0.1`
- Lanterns × 3: `cx+rx*0.4/0.5/0.6, cy+ry*0.1`

**Level 23 — Grand Aqueduct**
- Aqueduct × 5: `cx-rx*0.5` to `cx+rx*0.5`, `cy-ry*0.6`
- Bridges × 2: `cx-rx*0.35` and `cx+rx*0.15`, `cy-ry*0.45`

**Level 24 — Imperial Palace**
- Villa: `cx, cy-ry*0.5` + mosaics × 2 below + flowers × 4 + lanterns × 2

**Level 25 — Imperium Maximum**
- Arch: `cx+rx*0.4, cy+ry*0.3`
- Villa: `cx-rx*0.4, cy+ry*0.3`
- Grand Temple: `cx, cy-ry*0.7`
- Mosaic processional × 3: `cx±30/0, cy-ry*0.1`
- Lanterns × 2: `cx±50, cy-ry*0.1`
- Flowers × 2 flanking grand temple
- Unlocks: imperator journal, Imperator Victory

---

## District Visual Identity

### Farm (West)
- Warm earthy tones: tan soil, green crops, wood fence
- Chickens roaming, cats nearby
- Dirt path leading east to center
- Crystal shrine glows blue-purple at far left edge

### Residential NW
- Domus in rows with narrow alleys
- Torchlight on pillars between buildings
- Flower gardens appear at Lv 20 around the villa
- Densest NPC foot traffic

### Civic NE
- Marble-white temple gleaming north
- Flower beds frame temple approach
- Mosaic tiles on approach paths
- Lanterns mark entry from Via Principalis
- Library occupies corner slot at Lv 17

### Center / Forum
- Wide open plaza with floor tiles
- Forum building dominates south-center from Lv 15
- Campfire anchor point for early game
- Processional mosaics lead to pyramid at Lv 25
- Busiest citizen crossing point

### Military SE
- Castrum in fortified SE, walls on perimeter
- Arena rises as a mass landmark at Lv 18
- Mosaic forecourt marks arena approach
- Watchtower on east edge visible from entire island
- Torchlight is warmer/redder here (combat association)

### Sacred Hill North
- Pyramid grows from modest to towering over 25 levels
- Aqueduct row marks northern boundary visually
- Imperial Palace sits between aqueducts and pyramid at Lv 24
- Grand Temple at island peak Lv 25 — final visual anchor
- Bridges cross under aqueduct at Lv 23 (pilgrimage route)

---

## Key Constants (Quick Reference)

```javascript
cx = 600, cy = 400
// Level 1
srx ≈ 450, sry ≈ 115
// Level 10
srx ≈ 869, sry ≈ 227
// Level 25
srx ≈ 1220, sry ≈ 317

// Named positions
pyramid:       cx, cy - 15
crystalShrine: cx - 440, cy - 15  (hardcoded, not relative)
farmCenter:    cx - srx*0.45, cy - sry*0.04
portLeft:      cx - srx - 20, cy + sry*0.15
portRight:     cx + srx + 10, cy - sry*0.05
```

---

## Design Principles

1. **West = Nature, East = Civilization.** Farm and shrine anchor the primitive west. Market, temple, arena push east.
2. **North = Sacred, South = Functional.** Temple, palace, aqueducts crown the north. Castrum, baths, forum fill the south.
3. **Center = Crossroads.** Every major road passes through or near cx, cy. The forum and plaza are the meeting point.
4. **Growth is readable.** A player at Lv 5 sees wilderness with a granary. At Lv 17 they see a proper city. At Lv 25 the entire island is covered — every patch has meaning.
5. **Landmarks anchor navigation.** Pyramid (always visible), aqueduct (north wall), arena (SE mass), library (NE corner), watchtower (east edge). You always know where you are.
