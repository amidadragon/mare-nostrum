---
name: Player Character Redesign Spec
description: Visual design spec for the Mare Nostrum player character — signature elements, color palette, state system, pixel-scale reads
type: project
---

# Player Character Redesign v1.0

## The Signature Element
A **living crown of vines and wildflowers** woven into dark hair — the island claimed this person. This is the Link's-cap equivalent. Every other design decision supports this identity.

**Character concept in one line:** The exile who became part of the island.

## The 3 Pixel-Scale Reads (22px)
1. **Crown extension** — hair + vines push 2px above normal head height. Unique silhouette shape.
2. **Asymmetric shoulders** — right side: bronze pauldron. Left side: forest green cape. Asymmetry = instant personality.
3. **Terracotta-on-green color signature** — warm earth tunica + cool plant cape. No other character has this pair.

## Color Palette (14 total — reduced from ~22)
- Skin base: RGB(195, 145, 105)
- Skin shadow: RGB(155, 108, 75)
- Skin highlight: RGB(225, 180, 140)
- Hair: RGB(45, 30, 20)
- Hair highlight: RGB(85, 60, 40)
- Vine: RGB(60, 120, 50)
- Flower A (yellow): RGB(255, 210, 80)
- Flower B (pink): RGB(220, 100, 120)
- Tunica (terracotta): RGB(210, 140, 90)
- Tunica shadow: RGB(170, 105, 65)
- Pauldron (aged bronze): RGB(160, 120, 70)
- Belt (dark leather): RGB(80, 55, 35)
- Cape (forest green): RGB(45, 80, 55)
- Cape trim (faded gold): RGB(180, 150, 80)
- Scar: RGB(175, 120, 90)

## Key Design Changes from Previous Version
- Crimson tunica → terracotta linen (less military, more "lived in Roman")
- Lorica segmentata → single right-shoulder pauldron with plant-cord wrap (illegible at 22px → readable asymmetric shape)
- Red cape → forest green cape (left shoulder only, asymmetric — was both shoulders)
- Laurel wreath → living vine crown with flower pixels (generic → unique)
- Red plume on helmet → green feather RGB(80, 160, 80)

## State System Notes
- **Helmet ON:** Hair tucks in but one vine pixel curls out at cheekguard. Green feather crest replaces red plume. Signature preserved.
- **Swimming:** Cape + pauldron disappear. Vine crown compressed — no flowers, just green thread pixels in hair.
- **Diving:** Same as swimming but arms extended, flower/vine pixels shifted 1px back (trailing).
- **Emotions:** Carried by eyebrow + eye pixel system + scar context. No separate body poses needed.
  - Happy: eyebrows up, eye highlight pixel, flower pixel brightens
  - Sad: eyebrows angled down-inward, no highlights, flowers dimmed
  - Determined: single-pixel brow bar, 1px forward lean on whole sprite

## p5.js Implementation Note
Flower pixels should use sin() oscillation on Y (±0.5px over time) — gives "breathing" feel, not bounce. 2 lines of code, major impact on character feeling alive.

Tool handles should include vine-wrap pixels (1px green dots spiraling up) to tie tool to character identity.

**Why:** Previous design was a Roman soldier with a solarpunk label. This design communicates the character's arc — cast out by Rome, claimed by the island — through visual elements alone.
