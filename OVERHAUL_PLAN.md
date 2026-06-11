# Mare Nostrum — Clean Core Overhaul Plan

**Date:** 2026-05-31
**Decisions (locked with Amidevs):**
- **Approach:** Fresh clean core. New, small, well-structured project that **reuses the art + sound**, rebuilds the code, then ports features back one at a time.
- **First milestone (v0.1):** the **home island only** — walk, day/night, a few buildings, basic resources. Nothing else.
- **Direction:** cozy life-sim is the core; conquest is an optional light voyage added later.
- **Feature re-add order:** Claude's call (proposed in §6).

---

## 1. Why a fresh core, not a refactor

The legacy code can't be cleanly salvaged in place:

- **63 files, ~3.3 MB**, with `sketch.js` at ~9,000 lines.
- **One shared global `state` object** that any system mutates freely. This is the root rot — e.g. the bot AI's `executeTask` set `state.player.targetX` (walking *your* avatar off-map) and spent `state.crystals` (your resources). Combat, economy, and AI all reach into the same globals.
- Patch overlays, a swarm subsystem nobody uses, multiplayer, social — layers on layers.

We keep what's good (the **art, sound, and the cozy look**) and rebuild the **code** with boundaries that make this class of bug impossible.

## 2. Invariants — the rules that prevent the rot returning

These are non-negotiable in the new core:

1. **The player is moved ONLY by the input layer.** No AI, no system, no entity ever writes `player.*` movement or the player's resources. Ever.
2. **One owner per concern.** Each domain (player, world, buildings, resources) owns its state and exposes a small API. Nothing reaches across to mutate another domain's data directly.
3. **Small files.** Target < ~400 lines each. If a file grows past that, split it.
4. **Data-driven content.** Buildings, crops, items live in data tables, not `switch` branches scattered through logic.
5. **Save-safe from day one.** Versioned save schema; every field has a default.
6. **No background automation.** No auto-commit daemons, no boot scripts. Manual git; deploy by tag.
7. **Every phase ends shippable and verified** in the Electron dev app before moving on.

## 3. Reuse vs rebuild

**Reuse as-is (copy over):** sprite art, sounds, fonts, the p5 libs in `libs/`, the title-screen pixel art, and island silhouette/render math where it's clean.

**Rebuild clean:** state, input, player, camera, world/island, day-night, buildings, resources, HUD, save/load.

**Do NOT port (until rebuilt cleanly, behind a flag):** bots / swarm / strategy AI, multiplayer, social, the entangled conquest + economy, the 27-island world.

## 4. v0.1 — the clean core (home island only)

**Done means:** boot → you are on your island → walk (WASD **and** click-to-move) → camera follows → day/night cycle runs → place and upgrade a few buildings → one or two basic resources tick → save and reload to the exact state. No factions, no combat, no NPCs. A calm ~10-minute loop with **zero known bugs**.

## 5. Architecture & file map

The clean core lives in a new `v3/` folder so the legacy files stay available to port from. Once v0.1 ships, `play.command` points at `v3/`.

```
v3/
  index.html              # loads libs/ + the src files below, nothing else
  src/
    main.js               # setup(), draw(), scene router (title | play)
    state.js              # GameState schema + versioned save/load
    input.js              # THE ONLY writer of player movement intent
    camera.js             # follow + world<->screen conversion
    player.js             # player update (reads input only) + draw
    world/
      island.js           # island geometry, walkable area, coastline
      daynight.js         # time, season, light tint
    build/
      buildings.js        # placement, upgrade, render
      buildings.data.js   # building definitions (data table)
    sim/
      resources.js        # resource model + per-tick income
    ui/
      hud.js              # minimal HUD (resources, clock)
    assets.js             # loads reused sprites / sounds / fonts
```

**Hard boundary:** `input.js` is the only module that sets the player's movement target. `player.js` reads that intent and moves — it never receives a target from anywhere else. Other systems communicate through small explicit calls or a tiny event bus, never by reaching into `state.player`.

## 6. Roadmap

| Phase | Work | Done when |
|---|---|---|
| **0 — Scaffold** | `v3/` project, assets loader, game loop at 60fps, empty island renders. No gameplay. | Window opens to a rendered island, stable framerate, clean console. |
| **1 — Move & look** | Player walks (WASD + click-to-move, with a near-player target guard built in from the start), camera follows, island-edge collision. Day/night cycle. | You can stroll your island through a day/night cycle; nothing moves on its own. |
| **2 — Build & resources** | Place/upgrade 3–4 buildings from the data table; 1–2 resources tick over time. | You can build and watch resources grow. |
| **3 — Polish & ship v0.1** | Versioned save/load, settings, audio, title screen. | Save → reload → identical state. Shippable cozy core. |
| **4+ — Port features back** | One at a time, each cleaned to obey §2. **Proposed order:** (a) building depth, (b) farming & fishing, (c) companions & NPCs, (d) conquest voyage. | Each ported feature is self-contained and never touches the player/resources from outside its own module. |

## 7. Legacy code

The old files stay in the repo (optionally moved to `legacy/`) purely as a **reference to port from**. They are never loaded by the new `v3/index.html`. Nothing from legacy enters the clean core without being read, understood, and rewritten to fit the invariants.

## 8. Quantum / Blender (unchanged from before)

- **Blender:** later, a 2D sprite pipeline — model assets, render flat sheets the clean core blits. Not part of v0.1.
- **Quantum:** the existing QRNG/Grover bits stay out of the core; at most a cosmetic "world seed of the day" flourish much later. Never on a gameplay-critical path.

## 9. Immediate next step

Scaffold **Phase 0**: create `v3/`, wire the assets loader and game loop, render the empty island at a stable framerate. One focused session, verified live in the Electron dev app.
