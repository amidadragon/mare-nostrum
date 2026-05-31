# MARE NOSTRUM — Master Prompt & Workflow

This is the **single source of truth** for how Mare Nostrum development is run.
Claude (and the user) read this document at the start of every session.
If this document and any other note disagree, THIS DOCUMENT WINS.

Last updated: 2026-04-24
Owner: Amidevs (amidadragon@gmail.com)

---

## 1. The One True Version

There is exactly **ONE** working copy of Mare Nostrum. Everything else is archived.

| Key | Value |
|---|---|
| Canonical folder | `~/Desktop/_CODE/mare-nostrum/` |
| Canonical GitHub repo | `github.com/amidadragon/mare-nostrum` |
| Canonical branch | `lod-world` → will be renamed to `main` once smoke passes |
| Game concept | **Strategy** — "Mare Nostrum — Roman Mediterranean Strategy" |
| Local dev URL | `http://localhost:8888/` |
| Dev server command | `cd ~/Desktop/_CODE/mare-nostrum && python3 -m http.server 8888` |

Archived copies live in `~/Desktop/_ARCHIVE/mare-nostrum-*`. They are read-only
reference material. **Never edit anything inside `_ARCHIVE/`.** Never open a
second copy of the game in a second folder "just to try something."

If you need to try something risky: create a git branch, not a second folder.

---

## 2. Branch Strategy (ruthlessly simple)

Only two branches exist at any time:

- **`main`** — always runs. Always. If you can't load the game on `main`, that's a P0 incident and nothing else matters until fixed.
- **`dev`** — where new work happens. Merges into `main` only after smoke-test passes.

**Rules:**
- Delete every other branch. `lod-world`, feature branches, experiments — gone.
- `main` is the launch branch. `dev` is the working branch.
- No `patches/` folder. No "hotfix" sidecars. Fixes go into the real file they fix, get committed, and merge.
- If you have "patches" right now, fold them into their target files and delete `patches/`.

---

## 3. Workflow for Every Change

```
┌─────────────────────────────────────────────────────────┐
│  1. Checkout dev        git checkout dev && git pull    │
│  2. Edit the real file  (NOT a patches/ sidecar)        │
│  3. Reload localhost    Hard reload, read console       │
│  4. Smoke test          Checklist in §5 passes          │
│  5. Commit              git commit -m "fix/feat/polish:"│
│  6. Push dev            git push origin dev             │
│  7. Merge to main       git checkout main &&            │
│                         git merge dev --no-ff           │
│  8. Tag if milestone    git tag alpha-0.x               │
│  9. Push main + tags    git push origin main --tags     │
└─────────────────────────────────────────────────────────┘
```

There is **no autosync daemon** touching this workflow. If autopush exists and
reverts tracked files — disable it. Git is the source of truth.

---

## 4. Commit Message Format

```
<type>: <imperative summary under 60 chars>

- bullet 1
- bullet 2
```

Types: `fix`, `feat`, `polish`, `refactor`, `docs`, `chore`.
Example: `fix: legion recruitment button not triggering enlistment`

---

## 5. Smoke Test (runs before every commit)

The game passes smoke test if ALL of these are true after a hard reload:

- [ ] `http://localhost:8888/` loads, canvas visible, no console errors in red
- [ ] Title screen renders; clicking NEW GAME advances to next state
- [ ] World map draws; at least one island is visible
- [ ] Keyboard input (movement or menu keys) responds
- [ ] Save → reload → Load returns to same state
- [ ] No `undefined is not a function` errors in console

If any check fails, fix before committing. No "just this once."

---

## 6. Alpha Release Gate (v0.1.0-alpha)

The game is alpha-ready when ALL of these are true:

**Core loop**
- [ ] Player can start a new game (faction + scenario select)
- [ ] Player can play for 10 uninterrupted minutes without a crash
- [ ] Save + load works end-to-end

**Feature floor (drop anything not in this list until post-alpha):**
- [ ] World map with at least N islands rendered
- [ ] At least one meaningful decision per turn/round
- [ ] At least one victory condition and one loss condition, both reachable
- [ ] Basic sound: title music + one sfx on primary action

**Polish floor:**
- [ ] Title screen does not embarrass us
- [ ] Menus are clickable where they appear (hitboxes align)
- [ ] No placeholder text visible (no "TODO", "FIXME", "Lorem ipsum")

**Ship prep:**
- [ ] `README.md` with screenshot + one-line pitch + play URL
- [ ] itch.io page draft written
- [ ] Version bumped to `0.1.0-alpha` and tagged in git

Anything outside this list is v0.2.

---

## 7. The "No Second Folder" Rule

The most common way this project breaks is opening a second copy of the code.
From now on:

- Only one folder. Only one localhost server. Only one GitHub repo.
- If Claude suggests creating a patch file, helper folder, or "v2" anything that duplicates existing code — push back.
- If a session starts and Claude is confused about which folder to use, Claude reads this file first and works in the canonical folder only.

---

## 8. Claude's Session Opening Protocol

At the start of every new Mare Nostrum session, Claude must:

1. Read this document first.
2. Confirm canonical folder and branch with the user in one sentence.
3. `git status` the canonical folder; if dirty, ask what to do with the changes before editing anything.
4. `git log -5 --oneline` to see what's new since last session.
5. Open `localhost:8888` and read console — report green or red.
6. Only then start the requested task.

If any of 1-5 fails or looks wrong: STOP and ask the user before making changes.

---

## 9. Escape Hatches

- **"Roll everything back"** → `git reset --hard origin/main` in the canonical folder
- **"Start fresh from alpha"** → `git checkout alpha-0.1`
- **"Kill all game servers"** → `pkill -f "http.server 8888"; pkill -f "python3 -m http"`
- **"Disable autosync"** → `launchctl unload ~/Library/LaunchAgents/*autopush*` (if it exists)

---

## 10. Out of Scope (until alpha ships)

No more of these until alpha is live on itch.io:

- New factions beyond the starting set
- Multiplayer, networking, accounts
- Mobile/touch controls
- Localization
- Steam, store page work, marketing
- AI bot improvements beyond "doesn't do obviously broken things"
- Cosmetic variations (skins, emotes, flags for non-existent factions)

These are fine v0.2 ideas. They are not allowed to block v0.1.

---

## Appendix A — Decisions to make RIGHT NOW (before resuming dev)

Decisions from 2026-04-24 discovery:

1. **Canonical folder path:** `~/Desktop/_CODE/mare-nostrum/`
2. **Game concept:** **strategy** (Roman Mediterranean Strategy per og:title)
3. **Canonical branch:** `lod-world` (to be renamed `main` after baseline smoke passes)
4. **Archived to `~/Desktop/_ARCHIVE/<timestamp>/`:**
   - `~/Downloads/mare-nostrum-v2-lod-world/` (644 MB, Mar 24 snapshot)
   - `~/Desktop/_GAME DEV/Mare Nostrum/`
   - `~/Desktop/_GAME DEV/mare-nostrum-v2-dev/`
   - `~/Desktop/_CODE/MareNostrum_v3_Source/` (misleading skill reference)
   - `~/Desktop/_CODE/mare-nostrum/dist/mare-nostrum-v1.0.0.zip`
5. **Autosync daemon status:** killed + LaunchAgent unloaded (was `bash ./autosync.sh`, the culprit that reverted tracked files)
6. **Alpha target date:** _set after smoke-test of baseline_

Once Appendix A is filled in, save this file back to the canonical folder as
`/MASTERPROMPT.md` and commit it. It travels with the repo from now on.
