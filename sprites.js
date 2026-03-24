// ═══ SPRITE MANAGER ═══
const SPRITE_REGISTRY = {
  // Ships
  'ship_rome': 'sprites/ships/ship_rome.png',
  'ship_carthage': 'sprites/ships/ship_carthage.png',
  'ship_egypt': 'sprites/ships/ship_egypt.png',
  'ship_greece': 'sprites/ships/ship_greece.png',
  'ship_persia': 'sprites/ships/ship_persia.png',
  'ship_gaul': 'sprites/ships/ship_gaul.png',
  'ship_phoenicia': 'sprites/ships/ship_phoenicia.png',
  'ship_seapeople': 'sprites/ships/ship_seapeople.png',
  // Critters
  'critter_wolf': 'sprites/critters/wolf.png',
  'critter_eagle': 'sprites/critters/eagle.png',
  'critter_lion': 'sprites/critters/lion.png',
  'critter_crocodile': 'sprites/critters/crocodile.png',
  'critter_dolphin': 'sprites/critters/dolphin.png',
  'critter_boar': 'sprites/critters/boar.png',
  'critter_shark': 'sprites/critters/shark.png',
  'critter_owl': 'sprites/critters/owl.png',
  // Buildings per faction
  'building_pyramid_rome': 'sprites/buildings/rome/pyramid.png',
  'building_castrum_rome': 'sprites/buildings/rome/castrum.png',
  'building_house_rome': 'sprites/buildings/rome/house.png',
  // Crops
  'crop_wheat_1': 'sprites/crops/wheat_stage1.png',
  'crop_wheat_2': 'sprites/crops/wheat_stage2.png',
  'crop_wheat_3': 'sprites/crops/wheat_stage3.png',
  'crop_wheat_4': 'sprites/crops/wheat_stage4.png',
  'crop_olive': 'sprites/crops/olive.png',
  'crop_grape': 'sprites/crops/grape.png',
  // UI icons
  'icon_gold': 'sprites/ui/gold.png',
  'icon_food': 'sprites/ui/food.png',
  'icon_wood': 'sprites/ui/wood.png',
  'icon_stone': 'sprites/ui/stone.png',
};

const _spriteCache = {};
let _spritesLoading = 0;
let _spritesLoaded = 0;

function loadSprite(key) {
  if (_spriteCache[key]) return _spriteCache[key];
  let path = SPRITE_REGISTRY[key];
  if (!path) return null;
  _spritesLoading++;
  let img = loadImage(path,
    () => { _spritesLoaded++; },
    () => { _spritesLoaded++; _spriteCache[key] = null; } // fail silently
  );
  _spriteCache[key] = img;
  return img;
}

function getSprite(key) {
  return _spriteCache[key] || null;
}

function drawSprite(key, x, y, w, h) {
  let spr = getSprite(key);
  if (spr) {
    image(spr, x - w/2, y - h/2, w, h);
    return true;
  }
  return false; // fallback to procedural
}

function preloadAllSprites() {
  for (let key in SPRITE_REGISTRY) {
    loadSprite(key);
  }
}

// MARE NOSTRUM — Sprite System
// Loads PNG sprite sheets, provides animated sprite rendering
// Falls back to rect-based drawing if sprites not available

const SpriteManager = {
  sheets: {},
  loaded: false,
  _loadCount: 0,
  _totalCount: 0,

  register(name, path, frameW, frameH) {
    this.sheets[name] = {
      img: null, path: path,
      frameW: frameW, frameH: frameH,
      cols: 0, rows: 0, loaded: false
    };
    this._totalCount++;
  },

  loadAll() {
    if (this._totalCount === 0) { this.loaded = true; return; }
    for (let name in this.sheets) {
      let s = this.sheets[name];
      let self = this;
      try {
        s.img = loadImage(s.path, () => {
          // Validate: image must be exact multiple of frame size and have at least 2 frames
          s.cols = Math.floor(s.img.width / s.frameW);
          s.rows = Math.floor(s.img.height / s.frameH);
          if (s.cols < 2 || s.rows < 1 || s.img.width % s.frameW !== 0 || s.img.height % s.frameH !== 0) {
            console.warn('Sprite invalid (not a proper sheet): ' + s.path + ' (' + s.img.width + 'x' + s.img.height + ')');
            s.loaded = false;
          } else {
            s.loaded = true;
          }
          self._loadCount++;
          if (self._loadCount >= self._totalCount) self.loaded = true;
        });
      } catch(e) {
        console.warn('Sprite not found: ' + s.path);
        s.loaded = false;
        self._loadCount++;
        if (self._loadCount >= self._totalCount) self.loaded = true;
      }
    }
  },

  has(name) {
    return this.sheets[name] && this.sheets[name].loaded;
  },

  drawFrame(name, col, row, x, y, w, h) {
    let s = this.sheets[name];
    if (!s || !s.loaded) return false;
    let sx = col * s.frameW;
    let sy = row * s.frameH;
    image(s.img, x, y, w || s.frameW, h || s.frameH, sx, sy, s.frameW, s.frameH);
    return true;
  },

  drawAnimated(name, row, x, y, w, h, speed) {
    let s = this.sheets[name];
    if (!s || !s.loaded) return false;
    speed = speed || 8;
    let col = Math.floor(frameCount / speed) % s.cols;
    return this.drawFrame(name, col, row, x, y, w, h);
  },

  generatePlaceholder(name, frameW, frameH, cols, rows, drawFunc) {
    let w = frameW * cols, h = frameH * rows;
    let g = createGraphics(w, h);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        g.push();
        g.translate(c * frameW, r * frameH);
        drawFunc(g, c, r, frameW, frameH);
        g.pop();
      }
    }
    this.sheets[name] = {
      img: g, frameW, frameH, cols, rows, loaded: true, path: 'generated'
    };
  }
};

// ─── SPRITE SHEET REGISTRATIONS ─────────────────────────────────────────
// DISABLED: Current sprites are Blender primitives (basic 3D shapes).
// Re-enable when proper pixel art or high-quality 3D-rendered sprites are ready.
// The rect-based drawing (fallback) looks better than these placeholder renders.
/*
SpriteManager.register('player_rome', 'sprites/characters/rome_player.png', 32, 32);
SpriteManager.register('player_carthage', 'sprites/characters/carthage_player.png', 32, 32);
SpriteManager.register('player_egypt', 'sprites/characters/egypt_player.png', 32, 32);
SpriteManager.register('player_greece', 'sprites/characters/greece_player.png', 32, 32);
SpriteManager.register('player_persia', 'sprites/characters/persia_player.png', 32, 32);
SpriteManager.register('player_gaul', 'sprites/characters/gaul_player.png', 32, 32);
SpriteManager.register('player_phoenicia', 'sprites/characters/phoenicia_player.png', 32, 32);
SpriteManager.register('player_seapeople', 'sprites/characters/seapeople_player.png', 32, 32);

// Buildings (64x64 single frame)
SpriteManager.register('building_temple', 'sprites/buildings/temple.png', 64, 64);
SpriteManager.register('building_villa', 'sprites/buildings/villa.png', 64, 64);
SpriteManager.register('building_market', 'sprites/buildings/market.png', 64, 64);
SpriteManager.register('building_forge', 'sprites/buildings/forge.png', 64, 64);
SpriteManager.register('building_barracks', 'sprites/buildings/barracks.png', 64, 64);

// Military (32x32 per frame)
SpriteManager.register('soldier_rome', 'sprites/military/roman_legionary.png', 32, 32);
SpriteManager.register('soldier_carthage', 'sprites/military/carthage_warrior.png', 32, 32);
*/

// ─── SPRITE-AWARE DRAW WRAPPERS ────────────────────────────────────────

function drawPlayerSprite(x, y, faction, facing, anim, frame) {
  let sheetName = 'player_' + faction;
  if (!SpriteManager.has(sheetName)) return false;
  let row = { down: 0, up: 1, left: 2, right: 3 }[facing] || 0;
  let baseCol = { idle: 0, walk: 0, attack: 4, roll: 8 }[anim] || 0;
  let col = baseCol + (frame || 0);
  SpriteManager.drawFrame(sheetName, col, row, x - 16, y - 24, 32, 32);
  return true;
}

function drawBuildingSprite(x, y, type, faction) {
  // DISABLED: sprites are WIP (V2.2) — use rect-based rendering for all buildings
  // Sprites were causing invisible buildings (temple, forum, etc.)
  return false;
}

// Props & Items (64x64 per frame, generated from 3D pipeline)
SpriteManager.register('item_olive_tree', 'sprites/items/olive_tree.png', 64, 64);
SpriteManager.register('item_cypress_tree', 'sprites/items/cypress_tree.png', 64, 64);
SpriteManager.register('item_palm_tree', 'sprites/items/palm_tree.png', 64, 64);
SpriteManager.register('item_marble_column', 'sprites/items/marble_column.png', 64, 64);
SpriteManager.register('item_fountain', 'sprites/items/fountain.png', 64, 64);
SpriteManager.register('item_amphora', 'sprites/items/amphora.png', 32, 32);
SpriteManager.register('item_wooden_cart', 'sprites/items/wooden_cart.png', 64, 64);

// Buildings - additional (64x64 per frame)
SpriteManager.register('building_harbor', 'sprites/buildings/harbor_dock.png', 64, 64);

// Environment (64x64 per frame)
SpriteManager.register('env_harbor_dock', 'sprites/environment/harbor_dock.png', 64, 64);
