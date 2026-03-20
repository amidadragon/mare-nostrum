---
name: City Alive Sprint — Landmark Sizes + Life Signals
description: Building size upgrades, rendering overhauls for 5 landmark types, and 6 new city life signals added to sketch.js
type: project
---

## New BLUEPRINT sizes (post-sprint)
- castrum: 80x60 (was 64x50)
- library: 72x52 (was 58x44)
- arena: 84x64 (was 68x54)
- bath: 70x52 (was 58x44)
- watchtower: 24x56 (was 20x44)

CITY_SLOTS entries must match BLUEPRINTS sizes. A loadState() migration normalizes b.w/b.h from BLUEPRINTS on load.

## Rendering overhauls (drawOneBuilding)
- castrum: crenellations, portcullis gate with iron bars, waving banner (sin wave), darker military smoke, barracks night glow
- library: scroll niches (arched recesses with papyrus rolls), 4 fluted columns, owl on pediment, entrance night glow + reading lamp windows
- arena: 3 concentric seating tier ellipses, sand pit, crowd dots (28 spectators), N+S gates, velarium poles+ropes, red pennants, night torchlight ring
- bath: large blue pool with shimmer, 4 entrance columns, 4-column steam particles, steps, night pool glow
- watchtower: 3rd arrow slit added (existing rendering auto-scales from bw/bh)
- house: ALREADY had night window glow (getSkyBrightness < 0.5)

## New life signal functions (all in sketch.js, called from draw pipeline after drawLaundryLines)
Draw order (call sequence):
1. drawStreetWear() — dark ellipses on Decumanus, level 8+, ground-level, drawn FIRST
2. drawGranaryArea() — 2 grain carts with sacks + wheels near each granary, level 5+
3. drawAmphoraStacks() — stacked clay amphoras (2 rows) left of each market, level 10+
4. drawTempleIncense() — purple-tinted wispy particles from temple doorway, level 10+
5. drawForumBanner() — animated red SPQR banner on pole above forum, level 15+
6. drawWindowGlow() — warm yellow window rects on forum/temple/granary/market/shrine/villa/arch at night (bright < 0.35)

## Smoke color distinctions
- Residential (houses/villas): fill(195, 190, 182) — warm grey-white
- Military (castrum): fill(120, 115, 108) — darker, cooler grey
- Temple incense: fill(165, 148, 175) — purple-tinted
These are intentionally distinct so districts read differently at a glance.

## NOT done in this sprint (cut for scope)
- Harbor boats bobbing at dock
- Garden patches between villas (deferred — flower CITY_SLOTS already cover this partially)
- Fountain in forum plaza (existing drawFountain() is near the wreck beach area, not the forum — separate concern)

**Why:** Scope kept to one agent on sketch.js. Harbor and garden patches require world.js coordinate knowledge.

**How to apply:** When planning follow-up work, the 3 cut items above are the next "city alive" targets.
