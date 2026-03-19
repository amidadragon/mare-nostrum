---
name: Sprint V1.1 Status
description: Current completion status of Sprint V1.1 items as of 2026-03-19 audit round 3
type: project
---

Sprint V1.1 audit round 3 completed 2026-03-19. Full status at /Users/ioio/mare-nostrum/STATUS_SPRINT3.md

**Why:** Track what's done vs what still blocks itch.io launch.

**How to apply:** Fix the 4 blockers before any new feature work. Cook/fisherman save is the newest bug.

Completed (7): P1-1 (NPC dialogue), P1-2 (diving save), P1-3 (D-key), P1-4 (skill tree), P2-3 (centurion), P2-8 (oracle), P3-5 (night sky)
Partial (4): P1-6 (storm), P2-5 (ag spec), P3-3 (fishing), P2-1 (cypress improved but not per-sprint-spec)
New additions (not in sprint): Cook NPC, Fisherman NPC, Olive tree, Pine tree

Critical blockers:
1. Cook/Fisherman NOT in saveGame/loadGame — data loss on reload (NEW BUG)
2. Port positions fail levels 4-25 (CARRYOVER)
3. ESC during dialogue opens menu (CARRYOVER, P2-7 never implemented)
4. 11 hardcoded farm positions (CARRYOVER)

Position tests: 3/25 pass, 22 fail (levels 4-25)
New regressions this round: 0
