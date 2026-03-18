---
name: Sound system architecture
description: SoundManager class location, SFX types, island ambient layers, lyre modes, and audio routing for Mare Nostrum / Sunlit Isles
type: project
---

SoundManager class is in sketch.js (around line 22263). All audio is procedural via p5.sound.

**Why:** Single-file game architecture, no build step. Sound system must coexist with 22k+ lines of game code.

**How to apply:**
- SFX are added as cases in the `playSFX()` switch statement
- Combat SFX calls go in combat.js, diving SFX in diving.js, using pattern: `if (typeof snd !== 'undefined' && snd) snd.playSFX('name')`
- In sketch.js, shorter guard: `if (snd) snd.playSFX('name')`
- Island ambient detection checks `state.vulcan.active`, `state.hyperborea.active`, `state.plenty.active`, `state.necropolis.active`
- Lyre has 3 modes: peaceful (Dorian), tense (Phrygian, for conquest), eerie (sparse low Dorian, for Necropolis)
- Auto-detection in updateLyre() switches mode based on game state
- File gets auto-modified by linter between reads -- use Python-based line replacement or Bash for atomic edits when Edit tool fails repeatedly
