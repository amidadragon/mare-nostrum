# Faction Music System Guide

## Overview

Mare Nostrum V2 includes a sophisticated faction-specific music system that automatically plays unique themes based on the player's chosen faction. This guide explains how the system works and how to generate or add faction music.

## How It Works

### 1. Faction Selection
When a player selects a faction in `faction_select.js`, the game stores `state.faction` with the faction key:
- `rome`
- `carthage`
- `egypt`
- `greece`
- `persia`
- `phoenicia`
- `gaul`
- `seapeople`

### 2. Music Track Selection
In `sound.js`, the `updateMusic()` function determines which track to play based on game state:
- Base tracks: `music_peaceful`, `music_night`, `music_sailing`, `music_combat`, etc.

### 3. Faction Music Routing
After the base track is selected, the system checks for a faction-specific variant:
```javascript
// Apply faction-specific music variant if player has chosen a faction
if (typeof state !== 'undefined' && state.faction && target !== 'music_menu' && target !== 'music_lobby') {
  let factionTrack = target + '_' + state.faction;
  if (this._samples[factionTrack]) {
    target = factionTrack;  // Use faction variant
  }
}
```

### 4. Fallback Behavior
If a faction variant doesn't exist, the game automatically falls back to the base track. This means:
- You can implement faction music incrementally
- Partial implementation is safe (some tracks per faction)
- Missing tracks won't break the game

## Audio File Naming Convention

Faction-specific tracks follow this pattern:
```
sounds/music_<base-track>_<faction>.mp3
```

### Base Tracks

These are the core tracks that get faction variants:
- `music_peaceful` - Idle, exploration, base gameplay
- `music_night` - Night time, below deck, moody atmosphere
- `music_sailing` - Sailing, rowing, on ship deck
- `music_combat` - Combat mode, conquest battles
- `music_raid` - Raiding/sea people raids
- `music_festival` - Festival atmosphere
- `music_temple` - Temple/spiritual locations
- `music_vulcan` - Special island exploration
- `music_hyperborea` - Special island exploration
- `music_necropolis` - Special island exploration

### Faction Variants

For each base track and faction combination:
```
music_peaceful_rome.mp3
music_peaceful_carthage.mp3
music_peaceful_egypt.mp3
music_peaceful_greece.mp3
music_peaceful_persia.mp3
music_peaceful_phoenicia.mp3
music_peaceful_gaul.mp3
music_peaceful_seapeople.mp3
```

## Recommended Faction Music Styles

### Rome
**Style**: Martial, imperial power, military might
- Brass and horns (trumpet, tuba fanfares)
- Steady march rhythm (113-120 BPM)
- Militaristic snare drums
- Powerful, authoritative tone
- **Key**: D minor or C major
- **Example instruments**: Brass section, timpani, military drums

### Carthage
**Style**: Mediterranean trading port, merchant republic, prosperity
- Flutes and wooden instruments
- Rhythmic drums (hand drums, frame drums)
- Exotic percussion
- Energetic, entrepreneurial feeling
- **Key**: G major or A major
- **Example instruments**: Ney flute, darbuka, oud, temple blocks

### Egypt
**Style**: Mysterious, ancient wisdom, sacred geometry
- Harps and lyres (ethereal, floating)
- Minor or unusual scales (Phrygian, Dorian)
- Desert wind sounds (occasional)
- Mystical, meditative quality
- **Key**: E minor or D minor
- **Example instruments**: Harp, lyre, mysterious drones, sitar

### Greece
**Style**: Lyrical, philosophical, classical civilization
- Lyre and lyrical melodies
- Arpeggios and scales
- Gentle, contemplative rhythm
- Harmonious, balanced tone
- **Key**: G major or F major
- **Example instruments**: Lyre, bouzouki, pan pipes, cithara

### Persia
**Style**: Rich ornamental scales, royal grandeur, divine power
- Oud (pear-shaped lute) with intricate melodies
- Complex, ornamented scales (Persian modes)
- Rich, warm tones
- Sophisticated, luxurious feeling
- **Key**: D minor or E minor
- **Example instruments**: Oud, ney, dum-back, setar

### Phoenicia
**Style**: Seafaring merchants, maritime mastery, exploration
- Chanty-style rhythms (seafaring songs)
- Wave sounds and water percussion
- Energetic but flowing
- Adventure and trade atmosphere
- **Key**: D major or G major
- **Example instruments**: Boatswain's whistle, sea drums, shanty vocals, water drops

### Gaul
**Style**: Celtic wild power, warrior culture, nature affinity
- Celtic pipes (tin whistle, uillean pipes)
- Driving war drums (bodhran, war percussion)
- Energetic, primal rhythms
- Fierce but earthy feeling
- **Key**: A minor or D minor
- **Example instruments**: Tin whistle, bagpipes, bodhran, Celtic harp

### Sea People
**Style**: Mysterious chaos, dark droning, ominous threat
- Dark, sustained drones (low frequencies)
- Ominous ambient tones
- Crashing wave/storm sounds
- Unsettling, mysterious atmosphere
- **Key**: Very low E or droning pad
- **Example instruments**: Low drones, distorted strings, storm sounds, deep FM synthesis

## Integration Steps

### 1. Audio Generation (STEP 1)
Generate faction-specific music using:
- AI music generation (Suno, AIVA, etc.)
- DAW composition (Logic, Ableton, FL Studio)
- Music libraries with stems
- Procedural synthesis

### 2. File Organization (STEP 2)
Place generated files in the sounds directory:
```
mare-nostrum/sounds/
├── music_peaceful_rome.mp3
├── music_peaceful_carthage.mp3
├── music_peaceful_egypt.mp3
├── music_peaceful_greece.mp3
├── music_peaceful_persia.mp3
├── music_peaceful_phoenicia.mp3
├── music_peaceful_gaul.mp3
├── music_peaceful_seapeople.mp3
├── music_night_rome.mp3
├── music_night_carthage.mp3
... (repeat for all base tracks and factions)
```

### 3. Code Integration (STEP 3)
The code is already integrated! No changes needed in `sound.js` or `faction_emblems.js`.
The routing logic at line 1251-1256 in `sound.js` automatically detects and plays faction variants.

### 4. Testing (STEP 4)
1. Start the game and select a faction
2. Listen for faction-specific music when:
   - Exploring peacefully during daytime
   - Playing at night
   - Sailing/rowing
   - Entering combat
3. Verify fallback: If a faction variant is missing, base track plays

## Audio Specifications

### Recommended Format
- **Format**: MP3 or WAV
- **Sample Rate**: 44.1 kHz or 48 kHz
- **Bit Depth**: 16-bit or 24-bit
- **Channels**: Stereo (2 channels)
- **Bit Rate**: 128-320 kbps (MP3) or uncompressed (WAV)

### Track Length
- **Minimum**: 60 seconds
- **Recommended**: 120-180 seconds (tracks repeat with crossfade)
- **Maximum**: No hard limit (storage permitting)

### Key Properties
- **Fade out**: Include 2-3 second fade at end for smooth looping
- **No clicks**: Ensure clean loop points
- **Consistent volume**: Normalize to -3dB to -6dB for safe playback
- **Centered stereo**: Avoid extreme panning to maximize compatibility

## Implementation Example

### Adding Rome Faction Music

1. Generate a martial brass theme (e.g., using AIVA with "Roman" preset)
2. Export as `music_peaceful_rome.mp3` with 5-second fade-out
3. Place in `sounds/music_peaceful_rome.mp3`
4. Test: Start game, select Rome faction
5. During peaceful gameplay, Roman brass theme plays automatically
6. Repeat for other base tracks: `music_night_rome.mp3`, `music_sailing_rome.mp3`, etc.

## Troubleshooting

### Music Not Playing (Faction Variant)
1. Check filename matches convention: `music_<track>_<faction>.mp3`
2. Verify file is in `sounds/` directory
3. Check browser console for load errors
4. Ensure audio format is supported (MP3, WAV, OGG)
5. Verify faction name is correct spelling

### Fallback to Base Track
- This is normal behavior if faction variant missing
- Check `updateMusic()` in sound.js line 1251-1256
- Faction variants are optional, not required

### Audio Quality Issues
- Check bit rate is adequate (128+ kbps MP3)
- Verify no distortion in generation
- Ensure proper normalization (-3dB to -6dB)
- Test on target devices (mobile may have limits)

## Faction Music Generation Prompts

### Using AI Music Generation (Suno, AIVA, etc.)

#### Rome - Peaceful Theme
> "Roman march theme with brass section (trumpet, horn, tuba). Steady marching rhythm at 115 BPM in D minor. Professional orchestral quality. 2 minutes long with fade-out ending."

#### Carthage - Peaceful Theme
> "Mediterranean trading port music with ney flute, darbuka drums, and oud. Energetic 6/8 rhythm suggesting commerce and seafaring. G major, 120 BPM. Exotic, worldly feel. 2 minutes."

#### Egypt - Peaceful Theme
> "Ancient Egyptian mystery music. Harp and string drones in E minor. Occasional desert wind sounds. Mystical, meditative, timeless quality. 2 minutes with slow fade."

#### Greece - Peaceful Theme
> "Classical Greek lyre music with philosophical arpeggios. F major, gentle 90 BPM. Harmonious, balanced, contemplative mood. Bouzouki accompaniment. 2 minutes."

#### Persia - Peaceful Theme
> "Persian royal court music. Complex oud melodies with intricate ornamental scales. Sophisticated, warm D minor. 120 BPM. Opulent, majestic tone. 2 minutes."

#### Phoenicia - Peaceful Theme
> "Seafaring shanty with maritime drums and wave sounds. D major, energetic 125 BPM. Adventure and trade atmosphere. Boatswain's whistle and sea percussion. 2 minutes."

#### Gaul - Peaceful Theme
> "Celtic war theme with tin whistle and driving bodhran drums. A minor, fierce 130 BPM. Primal, earthy energy. Bagpipe undertones. 2 minutes."

#### Sea People - Peaceful Theme
> "Dark, ominous ambient with droning deep bass. Low E drone, unsettling tones. Crashing waves, mysterious atmosphere. 2 minutes with sustained fade."

## Performance Considerations

- **Crossfading**: The system uses 1-second crossfades between tracks
- **Memory**: Each faction variant loads into memory when accessed
- **Bandwidth**: For web deployment, consider pre-loading frequently-used tracks
- **Mobile**: Test audio playback on mobile devices (may have restrictions)

## Version History

- **Version 1.0** (March 2026)
  - Faction emblem system implemented
  - Music routing framework integrated
  - Support for 8 factions and all base tracks
  - Automatic fallback to base tracks
  - Documented implementation guide
