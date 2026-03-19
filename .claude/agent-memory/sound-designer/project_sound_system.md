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
- Lyre has 7 modes: peaceful (Dorian), tense (Phrygian, for conquest), eerie (Aeolian, for Necropolis), menu (slow contemplative Dorian, very quiet), celebration (fast festival with trills), night (very sparse sustained notes with bass drone), sailing (adventurous ascending pentatonic, when state.rowing.active)
- Each mode has 8-12 unique melodic phrases with proper harmony (thirds, fifths, parallel motion)
- Auto-detection in updateLyre() switches mode based on gameScreen (menu first) then game state: necropolis > conquest > festival > rowing > night > peaceful
- Smooth crossfade between modes: _lyreVolMult fades out (0.04/frame), switches, fades in (0.03/frame)
- Bass drone oscillator (triangle, D3=146.8Hz) provides harmonic foundation, amplitude-modulated for breathing feel
- Rhythmic pulse oscillator (sine, D3) creates subtle heartbeat underneath, rate varies by mode (tense=fastest, night=slowest)
- Dynamic context system (_lyreContext): rain dampens high freq and volume, farming slightly quieter, ocean shifts pulse pitch
- Menu mode uses 0.06 vol multiplier (vs 0.14 normal), long inter-phrase pauses (180-360 frames)
- Night mode inter-phrase pause: 140-280 frames (spacious)
- Sailing mode inter-phrase pause: 35-70 frames (moderate momentum)
- Dorian scale was corrected from Bb(466.2) to B-natural(493.9) — true D Dorian is D E F G A B C
- Aeolian scale used for eerie mode: D E F G A Bb C (natural minor on D)
- SFX inventory includes: harvest (3-note triad), chop, build (layered thunk), equip, click, ding, step_sand, step_stone, step_grass, step_water, dash, fish_cast, fish_catch, crystal, heart, fanfare, crab_catch, heartbeat, whoosh, sail, repair, scavenge, hit (layered with sub-bass), whirlwind, dodge, shield_bash, player_hurt, skill_unlock, water, bubble_pop, stone_mine, thunder, seagull, oar_splash, chicken_cluck, cat_meow, skeleton_death, season_change, festival_start, purchase, quest_progress, upgrade, hover, level_up, achievement, era_transition, crystal_resonance, legion_march
- New SFX (2026-03-19): level_up (4-note D major ascending fanfare), achievement (fast sparkle arpeggio to A6), era_transition (dramatic bass swell to bright chord), crystal_resonance (detuned beating sines shimmer), legion_march (4 rhythmic low triangle stomps)
- `playTwo` helper exists inside playSFX() for two-note musical intervals; multi-layer SFX should get new slots via _getSfxSlot() in setTimeout callbacks
- updateLyre() is called once in draw() for all screens; updateAmbient() called separately inside drawInner()
- Ambient animals: chicken_cluck (~800Hz two-part) every ~400 frames, cat_meow (~700Hz descending) every ~600 frames, home island only
- Underwater ambient: triangle oscillator rumble at ~55Hz + sine whale-call sweep (120-200Hz down to 80-140Hz, every 300-600 frames while diving). Both use dedicated gain nodes (`_uwRumbleGain`, `_whaleGain`).
- Footstep terrain: shallows=step_water, bridge/pier/imperial_bridge=step_stone, default=step_sand (logic in sketch.js updatePlayerAnim)
