---
name: Test Patterns — Mare Nostrum
description: Effective testing approaches discovered for this codebase
type: project
---

# Test Patterns

## 1. Missing Function Detection
Collect all ^function NAME definitions from all files, then grep for direct calls (not typeof-guarded) in sketch.js's drawInner. Any not in the definition set and not p5.js builtins are likely runtime crashes.

Key command:
```bash
grep -rh "^function " *.js | sed 's/function \([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/' | sort -u
```
Then check sketch.js drawInner for non-guarded calls.

## 2. Draw Pipeline Break Detection
If any unguarded function call in drawInner() throws, everything after it is skipped (caught by draw()'s try/catch). Check browser console for "draw error:" messages. This is the BUG-101 pattern.

## 3. Cross-File Access Verification
In plain script mode (not ES modules), let/const at top scope IS accessible from all other script files. But files loaded earlier cannot access values from files loaded later AT PARSE TIME. At runtime (inside functions called after all scripts load), everything is accessible. Risk: top-level non-function code that references globals from other files.

## 4. Duplicate Function Detection
After modularization:
```bash
grep -rh "^function " *.js | sed 's/(.*$/()/' | sort | uniq -d
```
As of 2026-03-19 audit: no duplicates found.

## 5. Syntax Check First
```bash
npm run check
```
All 19 files must pass. Syntax errors prevent the whole game from loading.

## 6. keyPressed Multi-Binding Check
Always grep for duplicate key bindings: `grep -n "'v'\|'V'" sketch.js | grep "key ==="`
The V key pattern (3 separate if-blocks, BUG-105) is the template for what to watch.

## 7. Save/Load Safety Checklist
For each saved field, verify:
1. Saved in saveGame() with correct property name
2. Loaded in loadGame() with || default fallback
3. Array fields have || [] guard on ALL access sites (not just save/load)
4. Version migration handles old saves without the field

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
