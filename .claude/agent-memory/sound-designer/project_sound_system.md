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
- Imperial Bridge ambient: `onBridge` flag in updateAmbient() boosts wave vol to 0.10, lowers wave filter to ~220Hz, boosts wind to 0.07 at ~280Hz, mutes birds
- Lyre has 4 modes: peaceful (Dorian), tense (Phrygian, for conquest), eerie (sparse low Dorian, for Necropolis), menu (slow contemplative Dorian, very quiet)
- Auto-detection in updateLyre() switches mode based on gameScreen (menu first) then game state
- Menu mode uses 0.06 vol multiplier (vs 0.14 normal), long inter-phrase pauses (180-360 frames)
- SFX inventory includes: harvest, chop, build, equip, click, ding, step_sand, step_stone, dash, fish_cast, fish_catch, crystal, heart, fanfare, crab_catch, heartbeat, whoosh, sail, repair, scavenge, hit, whirlwind, dodge, shield_bash, player_hurt, skill_unlock, water, bubble_pop, stone_mine, thunder, seagull, oar_splash, chicken_cluck, cat_meow
- Intro cinematic has audio cues: storm wind (0-240), thunder at frame 180, calm transition (240+), D4 lyre note at wake (360)
- Sailing cutscene has audio cues: steady wind at ~300Hz, oar_splash every 120 frames, seagull every 200 frames
- 'fanfare' plays on chapter completion (narrative.js) and NPC quest completion (narrative.js)
- 'stone_mine' used for quarrier mining and player stone resource gathering; 'crystal' kept for crystal/magical items
- Combat SFX: whirlwind has sub-bass 60Hz layer, dodge has 1200Hz crack layer, shield_bash has 800Hz metallic ring layer
- player_hurt: 150Hz sine + 120Hz triangle pitch-drop, triggered at 3 damage locations in sketch.js
- skill_unlock: 600->800->1000Hz ascending chime, triggered on level-up (grantXP) and skill tree spending (handleSkillTreeClick)
- Ambient animals: chicken_cluck (~800Hz two-part) every ~400 frames, cat_meow (~700Hz descending) every ~600 frames, home island only
- Skill tree UI exists in combat.js with SKILL_DEFS, handleSkillTreeClick(), drawSkillTree()
- File gets auto-modified by linter between reads -- use Python-based line replacement or Bash for atomic edits when Edit tool fails repeatedly
