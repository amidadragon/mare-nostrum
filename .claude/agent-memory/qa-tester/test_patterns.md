---
name: test_patterns
description: Effective test approaches and patterns discovered during Mare Nostrum QA
type: project
---

# Test Patterns

## Syntax Check
`node -c <file>.js` — zero output means pass. Run on all 7 game JS files after any change. Catches structural errors that would silently fail in browser.

## Narrative Flag Audit Pattern
For any new `interact:` objective in narrative.js, grep for the flag string across ALL files:
`grep -rn "'flag_name'" islands.js sketch.js`
If no assignment (`= true`) found in the handler function, flag will never be set.

## Save/Load Field Parity Check
Compare fields in `saveData` object (sketch.js:saveGame) against state init (sketch.js:initState). Any field in initState that is NOT in saveData resets to default on reload. High-value fields to always check: narrative flags, companion positions, island level, resource counts.

## expandIsland Variable Scope Check
Before any edit to `expandIsland()`, verify `let cx`/`cy` declarations come BEFORE any usage. JS `let` has temporal dead zone — using before declaration throws ReferenceError. This broke landmark buildings (BUG-017).

## Chapter Objective Consistency Check
For `check:` objectives in narrative.js that involve hearts/flags, cross-reference:
- The `check:` lambda threshold
- The actual setter code threshold
These must match. Mismatch = chapter never advances (BUG-018: rite at 8 hearts, check at 10).

## Island State Save Coverage
After any addition to `state.vulcan`, `state.hyperborea`, `state.plenty`, or `state.necropolis`, check if the new field is added to saveData. Currently none of these island states are saved — exploration resets on reload.

## Quarrier Unlock Notification (legacy save behavior)
On first load of a save from before quarrier was added, if islandLevel >= 5, the "Quarrier joined!" notification fires on the first update frame. This is expected behavior but should not loop. Guard is `if (!q.unlocked)` which sets `q.unlocked = true` — fires exactly once.
