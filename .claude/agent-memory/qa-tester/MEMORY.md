# QA Tester Memory — Mare Nostrum (Sunlit Isles)

## Memory Files

- [project_overview.md](project_overview.md) — game architecture, file roles, load order, key systems
- [known_bugs.md](known_bugs.md) — confirmed bugs and their status (last audit 2026-03-19)
- [fragile_systems.md](fragile_systems.md) — high-risk areas prone to regression
- [test_patterns.md](test_patterns.md) — effective test approaches discovered

## Critical Open Bug
BUG-101: drawNightLighting() missing — breaks all home island rendering every frame. Fix: add stub to sketch.js.
