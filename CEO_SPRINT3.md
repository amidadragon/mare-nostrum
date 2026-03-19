# CEO_SPRINT3.md — Visual Impact Review
*Aurelian Forge Studio — Sprint 3 Priorities*
*Code read: sketch.js (21k+ lines), direct audit of drawOneTree, drawRuins, drawHUD, drawHUDPanel*

---

## TOP 3 HIGHEST-IMPACT VISUAL FIXES

These are ranked by player-visible improvement per line changed. All three can be implemented in a single session.

---

## #1 — Tree Sway Pixel Jitter (EASIEST / HIGHEST VISIBLE PAYOFF)

**File:** `sketch.js`
**Lines:** 11902, 11934, 11941, 11944, 11947, 11961

**Root cause — confirmed in code:**

Line 11902:
```js
let sway = floor(sin(frameCount * 0.01 + t.swayPhase) * 2 * s);
```

`sway` is floored to ±0, ±1, or ±2. Good. But on line 11934:
```js
let layerSway = sway * t_frac;
```

`t_frac = layer / 7` = 0.0, 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1.0. When `sway` jumps from 1 to 2 (a 1px integer step), `layerSway` for layer 4 jumps from `0.57` to `1.14` — a 0.57px non-integer delta. The downstream `floor(-layerW + layerSway)` produces a different rounding result on alternating frames, making the layer edge blink 1px left/right independently from adjacent layers. The column appears to stutter because each of the 8 layers snaps to pixel boundaries at different frame counts.

The same unfloors sway propagates to line 11961:
```js
rect(floor(sin(li * 2.1 + t.swayPhase) * 3 * s + lsway), ...)
```

`lsway = sway * (0.3 + li * 0.14)` — same non-integer multiply pattern.

**Fix — 2 lines changed:**

Line 11934, change:
```js
let layerSway = sway * t_frac;
```
to:
```js
let layerSway = floor(sway * t_frac);
```

Line 11961, change:
```js
rect(floor(sin(li * 2.1 + t.swayPhase) * 3 * s + lsway), ly, 2 * s, 2 * s);
```
to:
```js
rect(floor(sin(li * 2.1 + t.swayPhase) * 3 * s) + floor(sway * (0.3 + li * 0.14)), ly, 2 * s, 2 * s);
```

This ensures every pixel coordinate is integer, every frame, for every layer. The sway animation still works — now it advances in synchronized integer steps across all layers instead of independently snapping. The tree will read as a single object swaying rather than a layered accordion vibrating.

**Olive and stone pine trees** — check lines 11964 onward for the same pattern if they use a similar layer sway multiply. Apply the same `floor()` treatment.

**Impact/Effort:** 2 lines. Immediately visible. Every tree on the island stops flickering.

---

## #2 — HUD Panels Visible During Dialogue (HIGH / AESTHETIC PROBLEM)

**File:** `sketch.js`
**Line:** 16927-16928

**Root cause — confirmed in code:**

`drawHUD()` at line 16927 has exactly one guard:
```js
if (photoMode) return;
```

It does not check `dialogState.active`. When an NPC dialogue fires, the full resource panel (top-left), the control hints (bottom-right), and the mini-map (top-right) all render underneath the dialogue box. The dialogue box itself is drawn with a parchment panel background, but the HUD translucent boxes are still visible around it — the top-left resource list sits in the corner through the entire conversation.

This reads as unpolished. Dialogue is the moment the player is most focused on narrative. Having "SEEDS: 14 / HARVEST: 8 / WOOD: 22" in the corner while Livia speaks kills the mood.

**Fix — 2 lines added at line 16928:**

```js
function drawHUD() {
  if (photoMode) return;
  if (dialogState.active) return;   // ADD THIS LINE
  // ... rest of function unchanged
```

That's it. One line. When dialogue is active, the HUD completely hides. The dialogue box takes over the screen with no visual noise.

**Optional enhancement (3 more lines):** Fade the HUD out rather than snap-cutting. Add a `state.hudAlpha` that lerps toward 0 when `dialogState.active` and back to 1 otherwise. Apply it as `drawingContext.globalAlpha = state.hudAlpha` at the top of `drawHUD()`. But the single-line fix already eliminates the complaint.

**Also check:** `drawHUD()` is called at line 1943. Verify it's not inside any sub-island draw path that would need the guard separately. The call site is in the main `draw()` → `drawInner()` path — single guard at the function top is sufficient.

**Impact/Effort:** 1 line. Every dialogue scene becomes visually clean immediately.

---

## #3 — Ruins Look Generic (MEDIUM EFFORT / HIGH NARRATIVE PAYOFF)

**File:** `sketch.js`
**Function:** `drawRuins()` at line 6423–6538

**Root cause — confirmed in code:**

Current ruins contain: stone base, 3 columns with fluting and cracks, a lintel with triglyph marks, one fallen column piece, two vine lines with 2 leaf pixels, three rubble pixel squares, and a faint golden glow. That's it. No statue. No altar. No ceramic vessel. No mosaic tile. No inscription.

The result: ruins read as "generic ancient ruin" not "Roman ruin on a Roman exile's island." They are architecturally correct but narratively silent. A player could drop this same ruin into any fantasy game and it would fit without modification. That is a failure of art direction.

The ruins are one of the three locations the narrative directs players to in Chapter 2 (`state.ruins[0]` is used as the quest destination for `livia_scroll`). Players are directed there for story reasons — they arrive, they see three identical columns, and nothing suggests the Ninth Legion was here.

**Fix — add these three detail elements inside the `forEach` loop in `drawRuins()`, after line 6529 (after the rubble), before line 6531 (before the golden glow):**

**Element 1: A headless statue torso on the base, left side**
```js
// Headless statue — weathered marble torso
fill(185, 178, 168);
rect(-r.w * 0.38, -18, 7, 16, 1);  // torso
rect(-r.w * 0.38 - 2, -4, 11, 5, 1);  // toga drape at waist
fill(170, 163, 153);
rect(-r.w * 0.38 + 1, -16, 2, 10);  // fold line
// Neck stub — decapitated
fill(160, 152, 140);
rect(-r.w * 0.38 + 1, -19, 5, 3, 1);
// Arm fragment on ground beside it
fill(180, 172, 158, 160);
push(); rotate(0.4);
rect(-r.w * 0.32, -2, 9, 3, 2);
pop();
```

**Element 2: A ceramic amphora, right side, against the fallen column**
```js
// Amphora — two-handled storage vessel
let ax = r.w * 0.28, ay = -2;
fill(165, 108, 62);   // terracotta
beginShape();
vertex(ax - 3, ay);
vertex(ax - 5, ay - 8);
vertex(ax - 3, ay - 18);
vertex(ax + 3, ay - 18);
vertex(ax + 5, ay - 8);
vertex(ax + 3, ay);
endShape(CLOSE);
// Narrow neck
fill(155, 98, 52);
rect(ax - 2, ay - 22, 4, 5, 1);
// Handles — pixel arcs
fill(148, 92, 48);
rect(ax - 6, ay - 15, 2, 6);
rect(ax + 4, ay - 15, 2, 6);
// Painted band — decorative stripe
fill(120, 65, 30, 180);
rect(ax - 5, ay - 10, 10, 2);
```

**Element 3: A mosaic tile fragment on the base platform (only when `r.w > 28`)**
```js
// Mosaic fragment — colored tile pattern on base
if (r.w > 28) {
  let mx = -r.w * 0.05, my = 0;
  fill(80, 60, 40);
  rect(mx - 5, my, 10, 4, 1);   // dark grout
  // Individual tesserae
  fill(210, 190, 140); rect(mx - 4, my, 2, 2);  // cream
  fill(160, 80, 40);  rect(mx - 2, my, 2, 2);   // red
  fill(50, 90, 140);  rect(mx, my, 2, 2);        // blue
  fill(210, 190, 140); rect(mx + 2, my, 2, 2);  // cream
  fill(60, 120, 50);  rect(mx - 4, my + 2, 2, 2); // green
  fill(160, 80, 40);  rect(mx - 2, my + 2, 2, 2); // red
  fill(210, 170, 80); rect(mx, my + 2, 2, 2);   // gold
  fill(50, 90, 140);  rect(mx + 2, my + 2, 2, 2); // blue
}
```

**Why these three details specifically:**

- The headless statue is instantly legible as Roman (unlike generic columns). "Someone was here. They were powerful enough to commission marble. Someone later knocked the head off." That's a story in 8 pixels.
- The amphora marks this as a habitation site, not just a ceremonial one. It anchors the Ninth Legion lore (they needed to eat and store wine). Players familiar with the narrative who read the journal tablet about the Ninth will recognize it.
- The mosaic confirms Roman civilian life — only Romans made mosaics. It's also visually distinctive: the color contrast of tesserae on a dark grout ground will catch the eye in a way that three marble columns don't.

**Total lines added:** ~30 lines of drawing code inside an existing loop iteration. No new state, no new functions, no save/load changes.

**Impact/Effort:** 30 lines. Ruins go from "generic ruin asset" to "Roman ruin with a story." Every screenshot of the island now has a recognizable landmark instead of three beige rectangles.

---

## Implementation Order

Do them in this order:

1. **Tree flicker** (2 lines) — fastest win, affects every tree on screen every frame.
2. **HUD during dialogue** (1 line) — every dialogue scene cleans up instantly.
3. **Ruins detail** (30 lines) — visual upgrade to a narrative anchor point.

Combined: ~33 lines changed or added across 2 functions. The island will look materially better at the end of a single focused session.

---

## What This Doesn't Fix

The user also flagged: **island still empty at high levels** and **port visuals wrong after save-clear**.

- Island emptiness at high levels is a content/density problem, not a detail problem. The `expandIsland()` procedural path (line 21474+) adds trees and resources at each level but the island grows faster than content fills it. This needs a separate pass: ambient props (scattered pottery, fire pits, market stalls as decorative non-interactive objects). Out of scope for this sprint.
- Port position after save-clear: the previous review (CEO_REVIEW.md item #4) already diagnosed the exact fix — remove portLeft/portRight from saveGame() and call `updatePortPositions()` after load. This is a confirmed bug with a known fix. Should be shipped immediately but is a separate code path from the three visual priorities above.

---

*Review completed by Aurelian Forge Studio CEO*
*Code read: March 2026*
*Next review trigger: after tree flicker, HUD dialogue guard, and ruins detail are shipped*
