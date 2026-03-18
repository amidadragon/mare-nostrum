// ═══ MARE NOSTRUM ENGINE — Event Bus + Plugin System ═══════════════════════
// Loaded BEFORE all other modules. Provides decoupled communication.

const Engine = {
  // ─── EVENT BUS ──────────────────────────────────────────────────────────
  _listeners: {},

  on(event, fn, priority) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push({ fn, priority: priority || 0 });
    this._listeners[event].sort((a, b) => b.priority - a.priority);
    return fn; // return for easy removal
  },

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l.fn !== fn);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    for (let l of this._listeners[event]) {
      l.fn(data);
    }
  },

  // ─── PLUGIN SYSTEM — modules register update/draw hooks ─────────────────
  _updateHooks: [],  // { name, fn, order }
  _drawHooks: [],    // { name, fn, order, layer }
  _drawLayers: ['background', 'world', 'entities', 'effects', 'ui', 'overlay'],

  registerUpdate(name, fn, order) {
    this._updateHooks.push({ name, fn, order: order || 0 });
    this._updateHooks.sort((a, b) => a.order - b.order);
  },

  registerDraw(name, fn, layer, order) {
    let layerIdx = this._drawLayers.indexOf(layer || 'world');
    if (layerIdx < 0) layerIdx = 1;
    this._drawHooks.push({ name, fn, order: layerIdx * 1000 + (order || 0) });
    this._drawHooks.sort((a, b) => a.order - b.order);
  },

  runUpdates(dt) {
    for (let h of this._updateHooks) h.fn(dt);
  },

  runDraws() {
    for (let h of this._drawHooks) h.fn();
  },

  // ─── PERFORMANCE — camera culling helpers ───────────────────────────────
  _camBounds: { x1: 0, y1: 0, x2: 800, y2: 600 },

  updateCamBounds(cx, cy, w, h, margin) {
    margin = margin || 200;
    this._camBounds.x1 = cx - w / 2 - margin;
    this._camBounds.y1 = cy - h / 2 - margin;
    this._camBounds.x2 = cx + w / 2 + margin;
    this._camBounds.y2 = cy + h / 2 + margin;
  },

  isVisible(wx, wy, radius) {
    radius = radius || 50;
    let b = this._camBounds;
    return wx + radius > b.x1 && wx - radius < b.x2 &&
           wy + radius > b.y1 && wy - radius < b.y2;
  },

  isIslandVisible(ix, iy, rx, ry) {
    let b = this._camBounds;
    return ix + rx > b.x1 && ix - rx < b.x2 &&
           iy + ry > b.y1 && iy - ry < b.y2;
  },

  // ─── OBJECT POOL — reusable particle/entity pools ──────────────────────
  _pools: {},

  getPool(name, factory, maxSize) {
    if (!this._pools[name]) {
      this._pools[name] = {
        items: [],
        factory: factory,
        maxSize: maxSize || 200,
        idx: 0,
      };
    }
    let pool = this._pools[name];
    // Find a dead item to reuse
    for (let i = 0; i < pool.items.length; i++) {
      let idx = (pool.idx + i) % pool.items.length;
      if (!pool.items[idx].alive) {
        pool.idx = (idx + 1) % pool.items.length;
        return pool.items[idx];
      }
    }
    // No dead items — create new if under limit
    if (pool.items.length < pool.maxSize) {
      let item = pool.factory();
      pool.items.push(item);
      return item;
    }
    // Over limit — steal oldest
    let item = pool.items[pool.idx];
    pool.idx = (pool.idx + 1) % pool.items.length;
    return item;
  },

  // ─── SAVE VERSION ───────────────────────────────────────────────────────
  SAVE_VERSION: 7,

  // ─── STATE NAMESPACE HELPER ─────────────────────────────────────────────
  // Ensures a state namespace exists without overwriting
  ensureState(path, defaults) {
    let parts = path.split('.');
    let obj = state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    let key = parts[parts.length - 1];
    if (!obj[key]) obj[key] = defaults;
    return obj[key];
  },
};

// Common events:
// 'day_start'        — new day begins, data: { day, season }
// 'harvest'          — crop harvested, data: { type, amount, x, y }
// 'enemy_killed'     — enemy died, data: { type, x, y, loot }
// 'boss_killed'      — boss defeated, data: { bossId, loot }
// 'island_discovered'— new island found, data: { islandId }
// 'colony_upgraded'  — colony leveled up, data: { islandId, level }
// 'quest_complete'   — quest finished, data: { questId, reward }
// 'build_complete'   — building placed, data: { type, x, y }
// 'npc_hearts'       — NPC hearts changed, data: { npcId, hearts }
// 'level_up'         — island expanded, data: { level }
// 'trade_complete'   — trade route delivered, data: { route, gold }

console.log('[Engine] Mare Nostrum Engine v0.9 loaded');
