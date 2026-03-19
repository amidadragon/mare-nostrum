---
name: Visual Redesign Plan
description: Full visual audit of Mare Nostrum — NPC ratings, building grades, critical fixes, and the pixel art discipline rules
type: project
---

A full visual redesign plan was written to /Users/ioio/mare-nostrum/VISUAL_REDESIGN_PLAN.md.

## Key findings

**The pyramid (drawPyramid, sketch.js:6056) is the gold standard.** Everything else should match that quality: platforms, columns with entasis, entablature with triglyphs, pediment. It is 9/10.

**The biggest visual problem is Vesta (drawNewNPC, type='vesta', sketch.js:21024).** Her robe color (95,50,120) is near-invisible against island grass. Her crystal staff is 2px wide. Her glow alpha is ~10. She is the lowest-rated character (5/10) and the P0 fix.

**Livia's `scale(0.72)` at sketch.js:10642 destroys pixel detail.** All her carefully drawn hair strands, earrings, and eyeliner vanish at sub-pixel scale. Fix: remove scale, redesign at 1x.

**Felix has zero visual identity.** He uses the same body template as Vesta. Rating: 4/10. Fix: pileus hat, wax tablet, soil-stained tunica.

## Pixel art discipline rules (apply to all future art)
- No `ellipse()` for pixel art elements — use concentric rects or manual vertex shapes
- Always `floor()` all x/y coordinates in draw calls
- No `scale()` below 1x — design characters at native 1x instead
- No `rot` on building or ruin placement — ruins should have axis-aligned geometry
- Grass tufts and rain use `rect()` not `line()` — lines anti-alias

## NPC ratings (1-10)
- Livia: 6/10 (scale bug degrades all detail)
- Marcus: 7/10 (strong but stiff, cape too thin)
- Vesta: 5/10 (color invisible, staff invisible, flame missing)
- Felix: 4/10 (no visual identity)
- Lares companion spirit: 7/10 (best character conceptually, minor wreath fix needed)
- Centurion: 8/10 (well designed, correct rank insignia)

## Priority queue
P0: Vesta identity, dialog NPC accent colors, version string (v0.9 → v1.0.0), Livia scale bug
P1: Felix identity, rain as rects, fog animation, mosaic contrast, grass tufts, particle shapes, Marcus cape, ruin redesign, tree diversity, aurora alpha, shoreline hard edge, crystal shrine
P2: Hotbar polish, mini-map identity colors, shore foam backwash, bioluminescence, settings ornament, bird wings, pediment sculpture

**Why:** Player's first impression of each NPC defines the entire relationship. If they can't read who Vesta is at a glance, the narrative investment fails. These fixes are the difference between a 7/10 and a 9/10 game.
