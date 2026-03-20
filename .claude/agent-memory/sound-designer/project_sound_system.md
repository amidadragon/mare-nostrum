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
- Each mode has 8-15 unique melodic phrases with proper harmony (thirds, fifths, parallel motion)
- Auto-detection in updateLyre() switches mode based on gameScreen (menu first) then game state: necropolis > conquest > festival > rowing > night > peaceful
- Smooth crossfade between modes: _lyreVolMult fades out (0.04/frame), switches, fades in (0.03/frame)
- Bass drone oscillator (triangle, D3=146.8Hz) provides harmonic foundation, amplitude-modulated for breathing feel
- Rhythmic pulse oscillator (sine, D3) creates subtle heartbeat underneath, rate varies by mode (tense=fastest, night=slowest)
- Dynamic context system (_lyreContext): combat > rain > ocean > night > dawn > farming > default. Priority order in detection.
- Context effects: combat boosts bass/tempo, rain dampens highs + detunes + adds echo + longer pauses, dawn softens volume, farming brightens tone
- Harmony oscillator (_harmOsc): sine that auto-doubles melody at perfect 5th (1.5x) or minor 3rd (1.2x for night/eerie) or major 3rd (1.25x for farming) at 35% volume
- Grace notes: 10% chance of quick ornamental note before main note (not in eerie/menu)
- Rain echo: 40% chance of delayed quiet repeat on a different voice for reverb-like depth
- Tempo multiplier (_tempoMult): smoothly transitions — combat=0.7x (faster), rain=1.3x (slower), night=1.2x, dawn=1.1x, farming=0.95x
- Rain ambient layer: filtered white noise (bandpass ~2000Hz, res 2), activated by stormActive or state.weather.type==='rain', modulated filter sweep
- Menu mode uses 0.06 vol multiplier (vs 0.14 normal), long inter-phrase pauses (180-360 frames)
- Night mode inter-phrase pause: 140-280 frames (spacious)
- Sailing mode inter-phrase pause: 35-70 frames (moderate momentum)
- Dorian scale was corrected from Bb(466.2) to B-natural(493.9) — true D Dorian is D E F G A B C
- Aeolian scale used for eerie mode: D E F G A Bb C (natural minor on D)
- SFX inventory includes: harvest (3-note triad), chop, build (layered thunk), equip, click, ding, step_sand, step_stone, step_grass, step_water, dash, fish_cast, fish_catch, crystal, heart, fanfare, crab_catch, heartbeat, whoosh, sail, repair, scavenge, hit (layered with sub-bass), whirlwind, dodge, shield_bash, player_hurt, skill_unlock, water, bubble_pop, stone_mine, thunder, seagull, oar_splash, chicken_cluck, cat_meow, skeleton_death, season_change, festival_start, purchase, quest_progress, upgrade, hover, level_up, achievement, era_transition, crystal_resonance, legion_march, door_creak, coin_clink, milestone
- Shore lap ambient: pink noise → bandpass ~280Hz, rhythmic amplitude swell (sin^2.5 phase), active when player is 0.85-1.05 normalized distance from island center. Uses proximity falloff. Vol capped at 0.04 * masterVol.
- Ambient seagulls: daytime home island only (bright>0.4), every 1200-2400 frames (20-40s). Custom sweep 800→1200→600Hz with 5Hz vibrato, distant volume (0.04-0.07 * masterVol). Uses SFX pool slot with manual envelope.
- Wind is now weather-reactive: clear=0.015 base, rain=0.04+intensity*0.03, storm=0.09. LFO on filter cutoff (two sine waves at different rates) for organic movement. Storm lowers filter to ~320Hz for howling character.
- `playTwo` helper exists inside playSFX() for two-note musical intervals; multi-layer SFX should get new slots via _getSfxSlot() in setTimeout callbacks
- updateLyre() is called once in draw() for all screens; updateAmbient() called separately inside drawInner()
- Ambient animals: chicken_cluck (~800Hz two-part) every ~400 frames, cat_meow (~700Hz descending) every ~600 frames, home island only
- Underwater ambient: triangle oscillator rumble at ~55Hz + sine whale-call sweep (120-200Hz down to 80-140Hz, every 300-600 frames while diving). Both use dedicated gain nodes (`_uwRumbleGain`, `_whaleGain`).
- Footstep terrain: shallows=step_water, bridge/pier/imperial_bridge=step_stone, default=step_sand (logic in sketch.js updatePlayerAnim)
- Weather state in sketch.js: state.weather = { type: 'clear'|'rain'|'heatwave'|'fog', timer, intensity }. stormActive is a separate global for drift storms.
