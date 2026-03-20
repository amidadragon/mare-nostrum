# QA Tester Memory — Mare Nostrum (Sunlit Isles)

## Memory Files

- [project_overview.md](project_overview.md) — game architecture, file roles, load order, key systems
- [known_bugs.md](known_bugs.md) — confirmed bugs and their status (last audit 2026-03-20)
- [fragile_systems.md](fragile_systems.md) — high-risk areas prone to regression
- [test_patterns.md](test_patterns.md) — effective test approaches discovered

## Critical Open Bugs (updated 2026-03-20)
- BUG-109: ESC in build mode exits to main menu — `state.buildMode` missing from ESC handler chain (sketch.js:15602)
- BUG-110: CONTINUE VOYAGE unclickable during menu fade-in animation (menu.js:475–477, 954)
- BUG-030: ESC still doesn't close build mode (related to BUG-109)
- BUG-106, BUG-107: FIXED — verified clean 2026-03-20
