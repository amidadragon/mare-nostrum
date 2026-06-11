# Mare Nostrum — The Tide Calendar (v3 reimagining)

**Date:** 2026-06-12 · **Status:** vertical slice in `v3/`

## The one-line pitch

A cozy systems-poem where **time is the terrain**: every mechanic hangs off three
interlocking natural cycles — the tide (minutes), the wind (hours), the season (days) —
so a day is a puzzle of timing windows, not a checklist of chores.

## Why this reimagining

The legacy game (and most farm-sims) run on *timers*: click crop → wait → collect.
Nothing asks the player to **be somewhere at the right moment**. The Mediterranean's
actual soul — diurnal winds, tides, salt, sailing rhythms — was cosmetic. Here it IS
the game. Every system below reads the same three clocks, so mastery of one teaches
the others.

## The three clocks

| Cycle | Period | What it drives |
|---|---|---|
| **Tide** | 2× per day | Waterline moves ~80px. Low tide exposes tidal flats (foraging), a **sandbar to the Shrine Islet**, and dries the **salt pans**. High tide floods the pans (brine) and lets the merchant ship dock. Fish bite best at slack water. |
| **Wind** | diurnal | Historically real: offshore breeze at night/morning, onshore in the afternoon. Drives **cross-pollination** (golden hybrid crops grow downwind of mixed flowers), wind-streak visuals, and the merchant's arrival. |
| **Season** | 6 days | Crop sets, fish runs, storm odds (next slice), the Horologium's rim color. |

## The economy is a chain, not a faucet

`tide floods pan → sun dries it → SALT` + `slack-water FISH` → **GARUM** (ferments ~1 day)
→ sell to the merchant ship — *which can only dock at high water*. The player's gold
literally flows through the tide cycle. Farming feeds in via fertility rotation
(same crop −20, rotate +10) and wind-made **Goldbloom** hybrids.

## The UI overhaul — one instrument instead of four widgets

- **The Horologium** (bottom-right): a single bronze-and-parchment dial. Sun marker
  rides the 24h ring, the inner gauge fills with the tide, a needle shows wind
  direction/strength, the rim is tinted by season. Everything the old HUD said in
  four boxes, readable at a glance, diegetic.
- **Resource strip** (top-left): marble panel, procedural icons, only non-zero items.
- **Contextual prompt** (bottom-center): one pill — "E · Sow Wheat" / "F · Cast".
- **Toasts + day banner**: quiet, serif, no chrome.
- Palette: parchment `#e8d5ae`, bronze `#b08d57`, terracotta `#c96f4a`, lapis `#2e5e8c`, gold `#e3b341`, ink `#2b1d12`. Font: Cinzel.

## Slice contents (this build)

Walkable island + tide-aware shoreline · 6 farm plots, 3 crops + hybrid ·
fertility/rotation · wind pollination w/ visible pollen · fishing w/ bite windows ·
2 salt pans · garum vat · merchant ship (tide-gated docking) · Shrine Islet over the
low-tide sandbar (daily laurel + lore) · full new HUD + Horologium · wind/pollen/splash FX.

## Deliberately NOT in the slice

Building placement, combat, factions, voyages, save/load (stubbed, schema reserved),
sound. Each ports in later per OVERHAUL_PLAN.md phases — this slice defines the
mechanical spine they attach to.

## Architecture notes

Same invariants as OVERHAUL_PLAN.md §2 — input layer owns the player; one owner per
concern; data-driven content (`src/data/`); files < 400 lines. New modules:
`world/clock|tide|wind`, `sim/farming|fishing|saltworks|merchant|inventory`,
`ui/horologium|hud`, `fx.js`, `interact.js` (single dispatcher so only one system
consumes a keypress).
