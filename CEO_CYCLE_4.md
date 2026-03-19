# CEO_CYCLE_4.md — Playtest Bug Fix Review
*Aurelian Forge Studio — Cycle 4*
*Scope: 4 bugs from PLAYTEST_REPORT.md. Pick the 3 a player notices most.*

---

## Ranking: What a Player Sees First

The 4 bugs from the playtest:
1. Arena Isle label renders twice
2. Quest tracker clips right edge
3. Cloud shapes repetitive
4. Menu click targets imprecise

Clouds (#3) are an atmosphere issue — background polish, low moment-to-moment visibility.
Menu clicks (#4) are a 1-in-4-sessions problem — only when you don't have a save yet.
Label doubling (#1) happens every time the player looks at the horizon.
Quest clipping (#2) happens every time the player reads their active objective.

**Fix order: #1, #2, #4. Cut #3 for now.**

---

## Fix 1 — Duplicate "Arena Isle" Label

**What the player sees:** Two "Arena Isle" labels stacked on the horizon, offset vertically. Looks like a rendering bug. Immediately breaks trust in the visual quality.

**Root cause:** Two functions both draw the label independently and both are called every frame.

- `drawArenaIsleDistant()` at line 13061 draws `text('Arena Isle', sx, sy + 14)` using the horizon-pinned `sy`.
- `drawArenaDistantLabel()` at line 12968 draws `text('Arena Isle', sx, sy + a.isleRY + 18)` using a separately computed `sy` from `w2sY(a.isleY)`.

Both are called sequentially at lines 1716-1717. The island silhouette is in `drawArenaIsleDistant`. The label belongs there. `drawArenaDistantLabel` was likely added as a separate pass and never cleaned up.

**File:** `sketch.js`, line 13058-13068 (in `drawArenaIsleDistant`) and line 12955-12976 (`drawArenaDistantLabel`)

**Fix:** Remove the label block from `drawArenaIsleDistant`. It already lives in `drawArenaDistantLabel` with the correct alpha and positioning. Delete lines 13058-13068 from `drawArenaIsleDistant`:

```js
// DELETE these lines from drawArenaIsleDistant() (currently lines 13058-13068):
  // Label
  fill(200, 185, 150, hazeA + 60);
  textSize(7); textAlign(CENTER); textStyle(ITALIC);
  text('Arena Isle', sx, sy + 14);
  textStyle(NORMAL);
  if (a.bestWave > 0) {
    fill(180, 160, 120, hazeA + 40);
    textSize(6);
    text('Best: Wave ' + a.bestWave, sx, sy + 22);
  }
```

After deletion, `drawArenaDistantLabel()` is the single source of truth for the label. Its positioning (`sy + a.isleRY + 18`) places it just below the island body, which is correct.

**Lines changed:** 10 deletions, 0 additions.
**Effort:** 2 minutes.

---

## Fix 2 — Quest Tracker Clips Right Edge

**What the player sees:** Active objective text like "REPAIR THE TRIREME ENOUGH TO SAIL" is cut off at the right screen edge. The player can't read their goal. This is a content-delivery failure — the HUD's entire job is to show this text.

**Root cause:** In `narrative.js` line 796, the panel is positioned at:
```js
let rx = width - 220, ry = 12, rw = 208, rh = ...
```

Text is drawn at `rx + 10` = `width - 210`. With `textAlign(LEFT, TOP)`, text renders rightward from that x. Long objective strings (e.g., "REPAIR THE TRIREME ENOUGH TO SAIL" at `textSize(7)`) are ~190px wide in Cinzel — they hit `width` and clip.

The fix is two-part: widen the panel, and truncate strings that would still overflow.

**File:** `narrative.js`, line 796 and line 809

**Fix part A** — widen the panel by increasing `rw` and shifting `rx` left to match:

```js
// Line 796 — change:
let rx = width - 220, ry = 12, rw = 208, rh = 18 + chapter.objectives.length * 13;
// to:
let rx = width - 240, ry = 12, rw = 228, rh = 18 + chapter.objectives.length * 13;
```

This gives 18 more pixels of runway. Handles most objectives.

**Fix part B** — truncate objective text to prevent overflow on any future long string:

```js
// Line 809 — change:
text((done ? '[x] ' : '[ ] ') + obj.desc + pt, rx + 10, oy); oy += 13;
// to:
let objStr = (done ? '[x] ' : '[ ] ') + obj.desc + pt;
let maxW = rw - 20;
while (objStr.length > 10 && textWidth(objStr) > maxW) objStr = objStr.slice(0, -1);
text(objStr, rx + 10, oy); oy += 13;
```

The `while` loop trims characters until the string fits. `textWidth()` is accurate at the current `textSize(7)`. The `maxW = rw - 20` leaves 10px padding on each side.

Apply the same pattern to NPC side-quest objectives at line 832.

**Lines changed:** 1 changed + 3 added (+ 1 more for NPC quests).
**Effort:** 5 minutes.

---

## Fix 3 — Menu Button Click Targets Imprecise

**What the player sees:** Clicking the visual center of "NEW VOYAGE" fires "CONTINUE VOYAGE" instead. On a first impression, this is immediately disorienting — the game feels broken before it has started.

**Root cause:** The hitbox is computed using live `textWidth()` of each item label against the canvas-center x. When a saved game exists, "CONTINUE VOYAGE" is item 0 and "NEW VOYAGE" is item 1. Their `iy` positions are `menuStartY` and `menuStartY + itemGap` respectively. The hitbox `hitPad = 16` vertical padding is only 32px total hit height at a font size that may render 13-18px tall. That's marginal.

The actual failure reported ("clicking estimated center hit the wrong button") happens because the tester estimated Y positions as percentages and the gap between items is `max(28, floor(h * 0.048))`. At 1080px height, that's 51px gap. At 768px, it's 36px. The label Y position also uses `textAlign(CENTER)` with baseline at `iy` — so the visual text sits above `iy`, but the hitbox is symmetric around `iy`. The visual center of the text is at `iy - itemSize * 0.5`, not `iy`. Clicks aimed at the visual center of the text land below the hot center of the hitbox, which can alias to the item above.

**File:** `menu.js`, line 482-483

**Fix:** Shift the hitbox up by `itemSize * 0.4` to align with where the text actually renders:

```js
// Lines 482-483 — change:
let hovered = mouseX > w / 2 - iw / 2 - hitPad && mouseX < w / 2 + iw / 2 + hitPad &&
              mouseY > iy - hitPad && mouseY < iy + hitPad;
// to:
let textTop = iy - itemSize * 0.8;
let hovered = mouseX > w / 2 - iw / 2 - hitPad && mouseX < w / 2 + iw / 2 + hitPad &&
              mouseY > textTop - 8 && mouseY < textTop + itemSize + 8;
```

`textTop` is the actual top edge of the rendered text. The hitbox now covers `[textTop - 8, textTop + itemSize + 8]` — 16px padding around the actual glyph bounds instead of around an abstract center point. This makes the click target match what the eye sees.

Also increase `hitPad` from 16 to 20 on the X axis for wider horizontal tap area:

```js
// Line 481 — change:
let hitPad = 16;
// to:
let hitPad = 20;
```

**Lines changed:** 3 lines.
**Effort:** 5 minutes.

---

## Why Cloud Variety Was Cut

Cloud repetition (#3 from the playtest) is real but it is background atmosphere — not a mission-critical HUD element. A player might subconsciously notice the sameness after 20 minutes; they will immediately notice a label that renders twice, a quest they can't read, or a menu button they can't click. The three fixes above address moment-zero player trust. Cloud variety is a polish item for the next cycle after these ship.

---

## Execution Order

1. Fix 1 (10 deletions in `drawArenaIsleDistant`) — zero risk, pure subtraction
2. Fix 2 (panel width + text truncation in `narrative.js`) — affects quest readability, test with the longest objective string
3. Fix 3 (hitbox alignment in `menu.js`) — test with and without a saved game to verify both button orderings

Combined estimated time: 15 minutes of code, 10 minutes of browser verification.

---

*Review completed by Aurelian Forge Studio CEO*
*Code read: March 2026*
*Next review trigger: after label dedup, quest clip fix, and menu hitbox ship*
