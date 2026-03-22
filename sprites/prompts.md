# Mare Nostrum Sprite Generation Prompts

## Base Style
All prompts should include this base style prefix:
> pixel art sprite sheet, 32x32 tiles, top-down RPG style, ancient Mediterranean theme, clean outlines, limited color palette, transparent background, game asset

**Model**: v1-5-pruned-emaonly (SD 1.5) or CyberRealistic_V4.2
**Recommended settings**: Steps 25-30, CFG 7-8, Sampler: euler_a, Size: 512x512 (scale down after)
**Negative prompt**: blurry, 3d render, realistic, photo, watermark, text, signature, low quality, deformed

---

## Characters (32x32 per frame, 4 directions x 3 walk frames + idle + attack)

### Rome Player
pixel art sprite sheet, Roman soldier, red tunic, lorica segmentata armor, gladius sword, galea helmet with red plume, 4 directions (down/up/left/right), 3 frames walk cycle, idle pose, attack pose, 32x32 per frame, transparent background
**Output**: characters/rome_player.png

### Carthage Player
pixel art sprite sheet, Carthaginian warrior, purple cloak, bronze cuirass, curved sword, crescent shield, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/carthage_player.png

### Egypt Player
pixel art sprite sheet, Egyptian warrior, white linen kilt, gold collar necklace, khopesh sword, nemes headdress blue-gold stripes, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/egypt_player.png

### Greece Player
pixel art sprite sheet, Greek hoplite, blue cloak, bronze muscled cuirass, corinthian helmet with blue crest, round aspis shield, spear, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/greece_player.png

### Sea People Player
pixel art sprite sheet, barbarian sea raider, bare chest with tribal tattoos, horned helmet, battle axe, fur pants, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/sea_people_player.png

### Persia Player
pixel art sprite sheet, Persian immortal warrior, ornate blue-gold scale armor, tall tiara hat, scimitar, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/persia_player.png

### Phoenicia Player
pixel art sprite sheet, Phoenician sailor warrior, purple Tyrian tunic, naval cap, short sword, merchant sash, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/phoenicia_player.png

### Gaul Player
pixel art sprite sheet, Gallic warrior, plaid checkered tunic, gold torque necklace, iron helmet with wings, longsword, long mustache, 4 directions, 3 frames walk, idle, attack, 32x32, transparent background
**Output**: characters/gaul_player.png

---

## Buildings (64x64, isometric top-down)

### Roman Temple
pixel art, isometric top-down view, white marble Roman temple, 6 columns, triangular pediment, red tile roof, stone steps, 64x64, transparent background
**Output**: buildings/roman_temple.png

### Egyptian Temple
pixel art, isometric top-down, Egyptian temple of Ra, two obelisks, sloped walls, gold sun disk, hieroglyphs, papyrus columns, 64x64, transparent background
**Output**: buildings/egyptian_temple.png

### Greek Parthenon
pixel art, isometric top-down, Greek parthenon, 8 ionic columns, white marble, blue accents, olive wreath, 64x64, transparent background
**Output**: buildings/greek_parthenon.png

### Roman Villa
pixel art, isometric top-down, Roman villa, red tile roof, white walls, garden courtyard, fountain, 64x64, transparent background
**Output**: buildings/roman_villa.png

### Market Stall
pixel art, isometric top-down, ancient Mediterranean market stall, wooden frame, cloth awning, goods on display, amphora jars, 48x48, transparent background
**Output**: buildings/market_stall.png

### Harbor Dock
pixel art, isometric top-down, ancient wooden harbor dock, mooring posts, ropes, crates, water edge, 64x32, transparent background
**Output**: buildings/harbor_dock.png

---

## Military Units (32x32, 4 directions, walk/attack/idle)

### Roman Legionary
pixel art sprite sheet, Roman legionary soldier, lorica segmentata, rectangular red scutum shield, gladius, galea helmet, walk/attack/idle, 4 directions, 32x32
**Output**: military/roman_legionary.png

### Carthaginian Soldier
pixel art sprite sheet, Carthaginian infantry, bronze armor, round shield, curved sword, purple cape, walk/attack/idle, 4 directions, 32x32
**Output**: military/carthaginian_soldier.png

### War Elephant
pixel art sprite sheet, Carthaginian war elephant, armored howdah, trunk raised, tusks, 2 directions (left/right), walk/attack/idle, 48x48
**Output**: military/war_elephant.png

### Greek Phalanx
pixel art sprite sheet, Greek phalanx hoplite, overlapping shields, long sarissa spear, bronze armor, corinthian helmet, walk/attack/idle, 4 directions, 32x32
**Output**: military/greek_phalanx.png

### Egyptian Chariot
pixel art sprite sheet, Egyptian war chariot, two horses, archer, golden decorations, 2 directions (left/right), move/attack/idle, 48x32
**Output**: military/egyptian_chariot.png

---

## Items (16x16 icons)

### Weapons
pixel art icon set, ancient weapons, gladius sword, spear, khopesh, battle axe, bow and arrows, scimitar, trident, 16x16 each, transparent background, clean pixel art
**Output**: items/weapons.png

### Armor
pixel art icon set, ancient armor pieces, lorica segmentata, bronze cuirass, leather armor, shield round, shield rectangular, helmet, greaves, 16x16 each, transparent background
**Output**: items/armor.png

### Trade Goods
pixel art icon set, ancient trade goods, amphora wine, olive oil jar, grain sack, gold coins, purple dye bottle, papyrus scroll, spices bag, silk cloth, 16x16 each, transparent background
**Output**: items/trade_goods.png

---

## Environment (32x32 tiles)

### Terrain Tiles
pixel art tileset, ancient Mediterranean terrain, grass, sand, water, stone road, dirt path, cliff edge, shallow water, deep water, 32x32 each tile, seamless edges, top-down view
**Output**: environment/terrain_tiles.png

### Vegetation
pixel art tileset, Mediterranean vegetation, olive tree, cypress tree, palm tree, grape vine, wheat field, flowers, bush, 32x32 each, transparent background, top-down
**Output**: environment/vegetation.png

### Water Features
pixel art tileset, water features, river straight, river bend, river fork, fountain, well, pond, waterfall top, 32x32 each, seamless, top-down
**Output**: environment/water_features.png

---

## UI Elements

### Health/Resource Bars
pixel art UI elements, ancient Roman themed, health bar red, mana bar blue, stamina bar green, experience bar gold, ornate frame, 128x16 each, transparent background
**Output**: ui/resource_bars.png

### Menu Frame
pixel art UI frame, ancient Roman style border, marble texture, gold trim, laurel wreath corners, scalable 9-slice, transparent center, 128x128
**Output**: ui/menu_frame.png
