---
name: Island City Map Reference
description: Master building placement map at /Users/ioio/mare-nostrum/ISLAND_MAP.md — authoritative zone layout, level-by-level schedule, road network, coordinate constants
type: project
---

The definitive city map is written to `/Users/ioio/mare-nostrum/ISLAND_MAP.md`.

All building placement decisions should reference this document first.

**Why:** Needed a single source of truth so agents working on expansion, visual, and design tasks don't contradict each other's coordinate assumptions.

**How to apply:** When any task involves placing a building, checking where something should be, or defining a new zone, read ISLAND_MAP.md first. Do not deviate without updating the map document.

Key facts:
- Crystal Shrine is hardcoded at `cx-440, cy-15` (NOT relative to srx)
- Farm center is `cx-srx*0.45, cy-sry*0.04` (dynamic helper functions)
- Port positions are dynamic: `portLeft = cx-srx-20, cy+sry*0.15`
- Sacred Hill (north), Residential (NW), Farm (W), Port (W shore), Civic (NE), Market (E), Military (SE), Bath (SW), Center (core), Forum (center-south)
- Three eras: Village Lv1-8, City Lv9-17, Atlantis Lv18-25
