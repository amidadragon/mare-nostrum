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
    let arr = this._listeners[event];
    if (!arr) return;
    for (let i = 0, len = arr.length; i < len; i++) {
      arr[i].fn(data);
    }
  },

  // Batch remove all listeners for a given event
  offAll(event) {
    if (event) { delete this._listeners[event]; }
    else { this._listeners = {}; }
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

  // ─── SCREEN SHAKE PRESETS ───────────────────────────────────────────────
  // Convenience methods wrapping triggerScreenShake (defined in sketch.js)
  shakePresets: {
    light:    { intensity: 1.5, duration: 6 },   // footstep, soft land
    medium:   { intensity: 3,   duration: 10 },   // hit taken, harvest
    heavy:    { intensity: 5,   duration: 15 },   // tree fall, explosion
    boss:     { intensity: 8,   duration: 25, mode: 'circular' },
    impact:   { intensity: 4,   duration: 8,  mode: 'directional' },
    rumble:   { intensity: 2,   duration: 40, mode: 'circular' },  // earthquake / island expand
  },

  triggerShakePreset(presetName, dirX, dirY) {
    let p = this.shakePresets[presetName];
    if (!p) return;
    if (typeof triggerScreenShake === 'function') {
      triggerScreenShake(p.intensity, p.duration, dirX || 0, dirY || 0, p.mode || 'random');
    }
  },

  // ─── SMOOTH CAMERA TRANSITIONS ────────────────────────────────────────
  _camTransition: {
    active: false,
    fromX: 0, fromY: 0,
    toX: 0, toY: 0,
    progress: 0,
    duration: 0, // frames
    easing: 'smoothstep', // 'linear' | 'smoothstep' | 'ease_out'
    onComplete: null,
  },

  startCameraTransition(toX, toY, durationFrames, easing, onComplete) {
    let ct = this._camTransition;
    ct.active = true;
    ct.fromX = typeof camSmooth !== 'undefined' ? camSmooth.x : 0;
    ct.fromY = typeof camSmooth !== 'undefined' ? camSmooth.y : 0;
    ct.toX = toX;
    ct.toY = toY;
    ct.progress = 0;
    ct.duration = durationFrames || 60;
    ct.easing = easing || 'smoothstep';
    ct.onComplete = onComplete || null;
  },

  updateCameraTransition() {
    let ct = this._camTransition;
    if (!ct.active) return false;
    ct.progress = min(1, ct.progress + 1 / ct.duration);
    let t = ct.progress;
    // Apply easing
    if (ct.easing === 'smoothstep') {
      t = t * t * (3 - 2 * t);
    } else if (ct.easing === 'ease_out') {
      t = 1 - (1 - t) * (1 - t);
    }
    if (typeof camSmooth !== 'undefined') {
      camSmooth.x = ct.fromX + (ct.toX - ct.fromX) * t;
      camSmooth.y = ct.fromY + (ct.toY - ct.fromY) * t;
    }
    if (ct.progress >= 1) {
      ct.active = false;
      if (ct.onComplete) ct.onComplete();
    }
    return ct.active;
  },

  isCameraTransitioning() {
    return this._camTransition.active;
  },

  // ─── PARTICLE PRESETS — common particle configurations ────────────────
  particlePresets: {
    dust_puff: { count: 4, vxRange: [-0.4, 0.4], vyRange: [-0.5, -0.1], life: 18, size: [2, 3], r: 140, g: 125, b: 100, type: 'dust' },
    leaf_burst: { count: 6, vxRange: [-1.5, 1.5], vyRange: [-2.5, -0.5], life: 40, size: [2, 4], r: 70, g: 130, b: 40, type: 'burst', gravity: 0.06 },
    spark_shower: { count: 8, vxRange: [-2, 2], vyRange: [-3, -1], life: 25, size: [1, 3], r: 255, g: 200, b: 60, type: 'burst', gravity: 0.08 },
    water_splash: { count: 5, vxRange: [-1, 1], vyRange: [-2.5, -1], life: 20, size: [2, 3], r: 140, g: 190, b: 220, type: 'burst', gravity: 0.1 },
    smoke_puff: { count: 3, vxRange: [-0.3, 0.3], vyRange: [-0.8, -0.3], life: 35, size: [3, 5], r: 80, g: 80, b: 80, type: 'dust' },
    gold_coins: { count: 4, vxRange: [-1, 1], vyRange: [-2.5, -1.5], life: 30, size: [2, 3], r: 255, g: 200, b: 50, type: 'burst', gravity: 0.07 },
    teal_shimmer: { count: 6, vxRange: [-1, 1], vyRange: [-1.5, -0.5], life: 35, size: [2, 3], r: 80, g: 220, b: 200, type: 'burst' },
    blood_splat: { count: 5, vxRange: [-2, 2], vyRange: [-2, 0], life: 20, size: [2, 4], r: 180, g: 30, b: 30, type: 'burst', gravity: 0.12 },
  },

  spawnPreset(presetName, wx, wy) {
    if (typeof particles === 'undefined') return;
    let p = this.particlePresets[presetName];
    if (!p) return;
    let cnt = p.count || 4;
    for (let i = 0; i < cnt; i++) {
      let sz = Array.isArray(p.size) ? (p.size[0] + Math.random() * (p.size[1] - p.size[0])) : (p.size || 3);
      particles.push({
        x: wx + (Math.random() - 0.5) * 6,
        y: wy + (Math.random() - 0.5) * 4,
        vx: p.vxRange[0] + Math.random() * (p.vxRange[1] - p.vxRange[0]),
        vy: p.vyRange[0] + Math.random() * (p.vyRange[1] - p.vyRange[0]),
        life: p.life + Math.floor(Math.random() * 10 - 5),
        maxLife: p.life,
        type: p.type || 'burst',
        size: sz,
        r: p.r, g: p.g, b: p.b,
        gravity: p.gravity || 0,
        world: true,
      });
    }
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

  // ─── NETWORKING STUBS — plug in WebRTC/WebSocket later ────────────────
  _netHandlers: {},
  _netQueue: [],
  _netLastPosBroadcast: 0,
  _netConnection: null, // will hold WebRTC DataChannel or WebSocket

  netSend(type, data) {
    let msg = { t: type, d: data, seq: Date.now() };
    if (this._netConnection && this._netConnection.send) {
      this._netConnection.send(JSON.stringify(msg));
    } else {
      console.log('[net:stub] send', type, data);
    }
  },

  netReceive(type, callback) {
    if (!this._netHandlers[type]) this._netHandlers[type] = [];
    this._netHandlers[type].push(callback);
  },

  _netDispatch(msg) {
    let handlers = this._netHandlers[msg.t];
    if (!handlers) return;
    for (let i = 0; i < handlers.length; i++) handlers[i](msg.d);
  },

  netBroadcastPosition(x, y, anim) {
    let now = performance.now();
    if (now - this._netLastPosBroadcast < 100) return; // 10Hz throttle
    this._netLastPosBroadcast = now;
    this.netSend('pos', { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, f: anim });
  },

  netTick() {
    // Flush queued incoming messages (called once per frame from draw())
    for (let i = 0; i < this._netQueue.length; i++) {
      this._netDispatch(this._netQueue[i]);
    }
    this._netQueue.length = 0;
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

// ─── ERROR TRACKING — catch runtime errors, show toast, log to localStorage ──
(function() {
  var ERROR_KEY = 'mare_nostrum_errors';
  var MAX_ERRORS = 50;

  function logError(msg, source, line, col) {
    try {
      var errors = JSON.parse(localStorage.getItem(ERROR_KEY) || '[]');
      errors.push({
        msg: msg,
        source: source || '',
        line: line || 0,
        col: col || 0,
        time: new Date().toISOString()
      });
      if (errors.length > MAX_ERRORS) errors = errors.slice(-MAX_ERRORS);
      localStorage.setItem(ERROR_KEY, JSON.stringify(errors));
    } catch(e) { /* storage full or unavailable */ }
  }

  function showToast(msg) {
    var el = document.createElement('div');
    el.textContent = '[Error] ' + msg;
    el.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9999;' +
      'background:rgba(120,30,30,0.85);color:#ffa;padding:8px 14px;' +
      'font:12px/1.4 monospace;border-radius:4px;max-width:80vw;' +
      'pointer-events:none;opacity:1;transition:opacity 0.6s ease;';
    document.body.appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; }, 4000);
    setTimeout(function() { el.remove(); }, 4800);
  }

  window.onerror = function(msg, source, line, col, err) {
    var short = String(msg).slice(0, 200);
    logError(short, source, line, col);
    showToast(short);
    return false; // don't suppress default console error
  };

  window.addEventListener('unhandledrejection', function(e) {
    var msg = e.reason ? String(e.reason).slice(0, 200) : 'Unhandled promise rejection';
    logError(msg, '', 0, 0);
    showToast(msg);
  });
})();

// Engine v0.9 loaded
