---
name: Sound system architecture
description: SoundManager class location, SFX types, island ambient layers, lyre modes, underwater audio, and audio routing for Mare Nostrum
type: project
---

SoundManager class is in sound.js (extracted from sketch.js). All audio is procedural via p5.sound.

**Why:** Modularized for maintainability. sound.js loaded via script tag in index.html.

**How to apply:**
- SFX are added as cases in the `playSFX()` switch statement
- Combat SFX calls go in combat.js, diving SFX in diving.js, using pattern: `if (typeof snd !== 'undefined' && snd) snd.playSFX('name')`
- In sketch.js, shorter guard: `if (snd) snd.playSFX('name')`
- Island ambient detection checks `state.vulcan.active`, `state.hyperborea.active`, `state.plenty.active`, `state.necropolis.active`
- Imperial Bridge ambient: `onBridge` flag in updateAmbient() boosts wave vol to 0.10, lowers wave filter to ~220Hz, boosts wind to 0.07 at ~280Hz, mutes birds
- Lyre has 7 modes: peaceful (Dorian), tense (Phrygian, for conquest), eerie (sparse low Dorian, for Necropolis), menu (slow contemplative Dorian, very quiet), celebration (fast festival with trills), night (very sparse sustained notes with bass drone), sailing (adventurous ascending pentatonic, when state.rowing.active)
- Auto-detection in updateLyre() switches mode based on gameScreen (menu first) then game state: necropolis > conquest > festival > rowing > night > peaceful
- Menu mode uses 0.06 vol multiplier (vs 0.14 normal), long inter-phrase pauses (180-360 frames)
- Night mode inter-phrase pause: 160-300 frames (very spacious)
- Sailing mode inter-phrase pause: 40-80 frames (moderate momentum)
- SFX inventory includes: harvest, chop, build, equip, click, ding, step_sand, step_stone, dash, fish_cast, fish_catch, crystal, heart, fanfare, crab_catch, heartbeat, whoosh, sail, repair, scavenge, hit, whirlwind, dodge, shield_bash, player_hurt, skill_unlock, water, bubble_pop, stone_mine, thunder, seagull, oar_splash, chicken_cluck, cat_meow, skeleton_death, season_change, festival_start, purchase, quest_progress
- `playTwo` helper exists inside playSFX() for two-note musical intervals; multi-layer SFX should get new slots via _getSfxSlot() in setTimeout callbacks
- updateLyre() is called once in draw() at line 1332 for all screens; updateAmbient() called separately inside drawInner()
- Ambient animals: chicken_cluck (~800Hz two-part) every ~400 frames, cat_meow (~700Hz descending) every ~600 frames, home island only
- Underwater ambient: triangle oscillator rumble at ~55Hz + sine whale-call sweep (120-200Hz down to 80-140Hz, every 300-600 frames while diving). Both use dedicated gain nodes (`_uwRumbleGain`, `_whaleGain`).
