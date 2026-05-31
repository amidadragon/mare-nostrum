# Mare Nostrum — Overhaul Plan

**Date:** 2026-05-31
**Owner:** Amidevs
**Direction (decided):** Tight hybrid · audit-first · 2D Blender sprite pipeline · git hygiene first
**Builds on:** `AUDIT_REPORT.md` (runtime audit, Apr 24) + `ALPHA_SCOPE.md` — this doc completes the static audit those left open and adapts the scope to a *tight hybrid* rather than war-only.

---

## 0. The one-paragraph diagnosis

Mare Nostrum isn't broken because of bugs — it's broken because it is **three or four games stacked in one repo with no director**, continuously auto-committed into chaos by a background daemon. The fix is mostly *subtraction*: kill the daemon, pick one narrow loop, cut or quarantine the rest, fold the patch overlays back into core, and collapse 63 sprawling files into ~15 clean modules. No engine change. No rewrite from zero.

---

## 1. Root causes (what actually makes it feel like chaos)

| # | Root cause | Evidence | Consequence |
|---|---|---|---|
| 1 | **`autosync.sh` daemon** runs every 20s: `git add -A` → commit `"autosync: <ts>"` → push to `lod-world` | `autosync.sh`; 614 KB `autosync.log`; stale `index.lock` mtime mid-session | Backups, logs, every half-edit are committed; history is meaningless; working tree never stabilizes |
| 2 | **Scope fusion** — strategy + life-sim + ship-interior + swarm all live at once | Runtime audit §3; `farming.js` 1241, `diving.js` 1400, `companions.js` 1896, `swarm-integration.js` 1245 LOC | ~60% of runtime is out-of-scope for any single coherent game |
| 3 | **Patch overlays** — 11 `patches/*.js` loaded *after* core, monkey-patching globals (`window.text`, `window.draw`) | `index.html` lines 231–241 | Overlays mask core bugs; load order is fragile; `hotfix_missing_fns.js` exists only to stop crashes |
| 4 | **No scene/state machine** — game state scattered across ~40 `is*` booleans | Runtime audit §1.5 | Root cause of the CONQUEST-click and world-init P0 bugs |
| 5 | **Doc sprawl & identity drift** — 43 markdown docs; `CLAUDE.md` says "cozy solarpunk life-sim", `og:title` says "Roman Mediterranean Strategy", subtitle says "Cozy Roman Survival" | repo root | Nobody (human or agent) has a single source of truth |
| 6 | **File obesity** — `sketch.js` 9,120 LOC, `combat.js` 6,292, `ui.js` 4,906 | line counts | Only one file can be edited at a time; merge pain; impossible to reason about |

**Static audit note:** the TODO/FIXME sweep is clean (~13 markers total). The entropy is *architectural*, not littered placeholders — exactly as the April audit predicted. Genuinely dead files on disk: `bot_worker.js`, `electron.js`, `test-positions.js`, `test-swarm.js`, `test-world-state.js`.

---

## 2. The vision: Cozy-Forward Hybrid

**Decided 2026-05-31: cozy life-sim is the core; light conquest is the spice — not the other way around.**

One sentence: **You are a shipwrecked Roman rebuilding life on a sunlit island — farm, fish, build, and tend companions in a calm daily loop — and when you choose to, sail out on a small, optional campaign to take a few neighboring islands before returning home.** The cozy loop is the headline and the thing we polish first; conquest is an opt-in feature that adds stakes, not the genre we compete in.

Design rules that keep it tight:

- **Home island is the heart.** The calm build/farm/fish/tend loop is what players come back for. It must feel good before anything else.
- **Conquest is a side voyage, not the spine.** A small map (~7 islands), a short optional campaign. Losing it never ends the cozy game.
- **Lead with the vibe.** The art, light, sound, and texture are the differentiator — protect them.
- **One meaningful choice per session**, cozy or martial. If a system creates no choice and no charm, gate or cut it.
- **Minimalist UI**: one HUD, one build menu, one light voyage panel. No codex bloat, no tidal HUD, no 9-skill combat tree.
- **Linear, gentle onramp**: shipwreck → rebuild basics → *then* the option to sail. No free-roam overwhelm at start.

---

## 3. Keep / Gate / Cut

"Gate" = code stays in the tree but is disabled behind a flag (`?lab=1`) and early-returns on load, so it can't contaminate the core. "Cut" = removed from the tree (recoverable via git/tag).

### KEEP (the cozy-forward core)
- Scene/state machine (to be *built* — §5), built on the existing `gameScreen` var
- **Home island life-sim — the heart:** building (`building.js`, trimmed), farming (`farming.js`), fishing (`fishing.js`)
- **Companions** (`companions.js`, trimmed) + pets (`pets.js`) — charm, low complexity
- Player avatar + walking on the home island (`player.js`)
- Day/night, seasons, weather, ambient (`environment.js`, parts of `world.js`)
- NPCs + light narrative/daily wants (`npc.js`, trimmed `narrative.js`)
- Save/load — `save.js`
- Audio — `sound.js` (lyre modes, ambient, SFX) — a core part of the vibe, keep generous
- **Light voyage (the spice):** a small ~7-island map, sail out (`sailing.js`), simple combat resolution (`combat.js`, trimmed hard), take an island, sail home. Optional, never game-ending.

### GATE behind `?lab=1` (alive, invisible, opt-in) — the heavy strategy machinery
- Full faction strategy AI / turn economy — `strategy.js`, `progression.js` territory systems, `bot.js`
- 8-faction diplomacy depth — `diplomacy.js` beyond ally/trade basics
- Naval combat depth — `naval.js`
- 27-island world map — `islands.js`/`conquest.js` beyond the ~7 we keep
- Diving (`diving.js`), tavern (`tavern.js`), ship-interior walking (`ship_home.js`)
- Cinematics (`cinematics.js`) until the core loop feels good
- **Quantum minigame** (`patches/quantum_rng.js`, `patches/grover_hunt.js`) — see §7

### CUT (remove from tree)
- **Swarm mode** entirely — `agent.js`, `swarm-integration.js`, `bot.js`/`bot_worker.js`, swarm hooks in `sketch.js` (~3,000+ LOC of the worst confusion; "active by default" per audit)
- **Multiplayer** — `multiplayer.js`, `lobby.js`, the remote `peerjs` CDN load, MULTIPLAYER button
- **Social** — `social.js`
- Dead files: `electron.js`, `test-positions.js`, `test-swarm.js`, `test-world-state.js`, `bot_worker.js`
- The `patches/` folder as a *concept* — fold each into core (§5), then delete the folder
- 38 of the 43 markdown docs → archive to `_docs_archive/`; keep only `CLAUDE.md`, `OVERHAUL_PLAN.md` (this), `ALPHA_SCOPE.md`, `AUDIT_REPORT.md`, `CHANGELOG.md`

---

## 4. Patch-folding plan (kill `patches/`)

| Patch | Action |
|---|---|
| `hotfix_missing_fns.js` | Delete once real functions exist (its only job is crash-prevention) |
| `cycle4_fixes.js` | Fold quest-tracker + menu-hitbox fix into `ui.js`, delete |
| `safe_init.js` | Replace with a core `__mnTry(name, fn)` helper each subsystem calls; delete |
| `patch_health.js` | Delete (it only exists to track `safe_init`'s drifting subsystem list) |
| `bugtest.js` | Gate behind `?debug=1`, move to `debug.js`; off by default |
| `faction_army_banners.js`, `faction_ship_flags.js` | Fold into `nations.js` / rendering; delete |
| `quest_tracker_fix.js` | Replace `window.text` shim with a 10-line bounded-`text()` fix inside the quest draw; delete |
| `grover_hunt.js`, `quantum_rng.js` | Move under the `?lab=1` gate as the diving flavor minigame (§7) |
| `sandbox_compass.js` | Review — fold useful bits, delete the rest |

---

## 5. Target architecture

From 63 files → ~15 focused modules, plus a real scene machine.

```
index.html          # loads ~15 local scripts, NO remote CDNs, NO patches/
core/
  state.js          # window.scene machine + single source of truth + __mnTry helper
  main.js           # setup() + draw() dispatcher routing on scene
  save.js
ui/
  hud.js            # one HUD
  menus.js          # title, faction select, build menu, diplomacy panel, settings
world/
  map.js            # ~7 islands, camera, pan/zoom, tooltips  (from islands+world+mediterranean)
  render.js         # island/ship/unit sprite drawing (consumes Blender sheets — §6)
play/
  armies.js         # recruit + move + engage      (from military)
  sailing.js        # ship build + dispatch + naval (from sailing+naval)
  combat.js         # trimmed resolution
  diplomacy.js
  turn.js           # end-turn cycle + AI + victory/defeat (from progression+strategy)
  peace.js          # thin build/harvest/income reward layer (from building+economy)
audio/
  sound.js
lab/                # everything gated behind ?lab=1
  farming.js fishing.js diving.js companions.js cinematics.js narrative.js quantum.js
```

Scaffolding to land first (from `ALPHA_SCOPE` §6, still valid):

```js
window.scene = 'title'|'factionSelect'|'world'|'combat'|'diplomacy'|'victory'|'defeat';
const LAB = new URLSearchParams(location.search).get('lab') === '1';
// every lab handler starts:  if (!LAB) return;
function startNewGame(factionId, difficulty){ /* the ONE init path */ }
```

---

## 6. Blender → 2D sprite pipeline

Goal: one consistent art style across ships, units, buildings, and island tiles — rendered from 3D in Blender, baked to flat PNG sprite sheets the p5 game blits. No 3D engine in the browser.

Pipeline:
1. **Model** low-poly assets in Blender (one ship per faction, a legionary, 3–4 buildings, island tile variants).
2. **Light & camera**: fixed orthographic camera, consistent sun angle, so every sprite shares lighting. For units that face directions, render N rotations (e.g. 8) into a sheet.
3. **Render** to transparent PNGs at 2× target size (for retina), pack into atlases with a JSON frame map.
4. **Wire**: `world/render.js` loads each atlas in `preload()` and draws frames by name — replacing the current procedural `draw*` functions one asset type at a time.
5. **Repeatable**: keep the `.blend` files + a `render_assets.py` headless script in `art/` so re-rendering is one command. (You already have per-faction `render_*.py` to cannibalize.)

Order of attack: ships first (highest visual payoff), then unit, then buildings, then island tiles. Each is an independent, low-risk swap.

I can drive Blender directly to model and render these when we get to this phase.

---

## 7. The quantum question — honest recommendation

You already have `patches/quantum_rng.js` + `grover_hunt.js`: a QRNG "oracle" and a Grover-style chest-pick for wreck diving. Keep that as **optional flavor under `?lab=1`** — it's a charming gimmick and a marketing line ("seeded by a real quantum RNG").

What I'd **not** do: put IBM Quantum on any gameplay-critical path. Everything the game computes — combat odds, economy, map gen, pathfinding — is trivial classical math that runs in microseconds locally. Quantum hardware adds network round-trips and job-queue latency (seconds to minutes), needs credentials, and gives players nothing they can perceive vs. a local PRNG. The sane uses are both *cosmetic*:
- **World-seed-of-the-day** fetched once from a quantum RNG (offline fallback to local PRNG).
- The existing **Grover diving minigame** as a themed easter egg.

Net: quantum stays a flourish, never load-bearing. If you want, I'll wire the world-seed call as a clean optional module that no-ops without network.

---

## 8. Roadmap (phased, each phase independently shippable)

| Phase | Work | Done when |
|---|---|---|
| **0 — Stabilize** | Run `cleanup-git.command`: kill autosync, fix .gitignore, untrack cruft, one clean commit. Pick branch strategy. Fix the service worker (done — network-first). | Working tree clean; daemon dead; reloads show fresh code; one sane commit |
| **1 — De-clutter** | Add scene machine (on `gameScreen`) + `?lab=1` gate. Cut swarm + multiplayer + social + dead files (done). Gate the heavy strategy machinery so default load is the cozy game. | Default load boots into the cozy home loop; no swarm/heavy-AI draws; clean console |
| **2 — Make the home loop sing** | Polish the core: walk the island, build, farm, fish, tend companions, day/night. This is the headline — it must feel good. | A calm 10-min session on the home island that feels cozy and bug-free |
| **3 — The optional voyage** | Wire the *small* conquest spice: sail to ~7 islands, simple combat, take one, sail home. Opt-in, never game-ending. | Player can choose to sail out, win/lose a short voyage, and return to the cozy loop |
| **4 — Unbreak the entry path** | Fix the start P0s (faction/new-game init, dead menu buttons, faction-select layout) so the onramp is smooth. | Title → new game → on your island, gently onboarded |
| **5 — Patch fold + file split** | Fold `patches/` into core; split `sketch.js`/`combat.js`/`ui.js` per §5 architecture; archive 38 docs. | `patches/` gone; no file > ~2k LOC; ~15 modules |
| **6 — Art pass** | Blender sprite pipeline: home buildings → companions/player → ships → island tiles. | Unified cozy art replaces procedural draws |
| **7 — Polish + ship** | Audio, settings, save/load verified, README, itch page, tag. | Shippable alpha |

Phases 0–1 unblock; 2 makes the cozy core *good*; 3 adds the optional stakes; 4 smooths entry; 5–7 clean and pretty.

---

## 9. How we'll work (given the tooling constraints)

- **Filesystem:** I can read and *create/edit* files in your repo, but the mount **blocks deletions** and git writes (it couldn't remove `index.lock`). So: I do all the *editing*; **deletions, commits, branch ops, and pushes happen on your machine** via scripts I hand you (like `cleanup-git.command`) or commands you run.
- **Testing:** I run the game at `localhost:8888`, read the console, take screenshots, and inject test calls via the Chrome MCP. Verification step every phase.
- **Cadence:** small, reviewable changes per phase. Each phase ends with a screenshot + a one-line status, and a clean commit you trigger.
- **Source of truth:** this doc + `CLAUDE.md`. If they ever disagree with the code, we fix the doc in the same change.

---

## 10. Immediate next actions

1. **You:** double-click `cleanup-git.command` (Phase 0). It's non-destructive — kills the daemon, fixes ignores, untracks cruft, makes one commit. Nothing is pushed.
2. **You:** tell me the branch call — merge `lod-world` → `main`, or keep developing on `lod-world`.
3. **Me:** start Phase 1 — scene machine + `LAB` gate + swarm/multiplayer/social removal (I edit; you commit).
