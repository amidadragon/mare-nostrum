// world-state.js — Unified World State Manager
// Replaces the swapToIsland/swapBack hack with proper per-island state isolation.
// Each island owns its own state object. Systems that need to operate on a specific
// island receive that island's state directly — no globals are overwritten.
//
// PHASE 1: Provides a safe wrapper around the existing swap mechanism while
//          exposing a clean API. Existing code can migrate incrementally.
// PHASE 2: Direct access replaces swap entirely.

// ═══════════════════════════════════════════════════════════════════════════
// WORLD STATE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

const WorldState = {
  // All island states keyed by island ID (faction key or world island key)
  islands: {},

  // The player's home island ID
  playerIslandId: null,

  // Currently "active" island (the one the player is physically on)
  activeIslandId: null,

  // Swap stack — allows nested swaps safely (guards against the re-entrant bug)
  _swapStack: [],

  // Whether WorldState has been initialized
  initialized: false,

  // ─── INITIALIZATION ──────────────────────────────────────────────────

  /**
   * Initialize WorldState from the existing game state.
   * Call this AFTER initNations() and after the player's home island is set up.
   * It snapshots each nation's islandState into WorldState.islands.
   */
  init(playerFaction) {
    this.playerIslandId = playerFaction || state.faction || 'rome';
    this.activeIslandId = this.playerIslandId;
    this.islands = {};

    // Register player's home island — this IS the global `state` fields
    // We store a reference marker, not a copy, because the player's island
    // is still the "live" global state during Phase 1
    this.islands[this.playerIslandId] = {
      id: this.playerIslandId,
      type: 'home',
      faction: this.playerIslandId,
      cx: WORLD.islandCX,
      cy: WORLD.islandCY,
      rx: state.islandRX || 500,
      ry: state.islandRY || 320,
      isPlayer: true,
      // In Phase 1, the player island state lives in global `state`
      // We don't duplicate it — we just track metadata
      _usesGlobalState: true,
    };

    // Register all nation islands
    if (state.nations) {
      let nationKeys = Object.keys(state.nations);
      for (let k of nationKeys) {
        let nation = state.nations[k];
        if (!nation) continue;
        this.islands[k] = {
          id: k,
          type: 'nation',
          faction: k,
          cx: nation.isleX,
          cy: nation.isleY,
          rx: nation.isleRX || 400,
          ry: nation.isleRY || 280,
          isPlayer: false,
          defeated: !!nation.defeated,
          // The nation's own island state (buildings, resources, etc.)
          islandState: nation.islandState || null,
          // Reference to the nation data
          nationRef: nation,
        };
      }
    }

    // Register WORLD_ISLANDS (neutral/special islands)
    if (typeof WORLD_ISLANDS !== 'undefined') {
      for (let isle of WORLD_ISLANDS) {
        // Skip capitals already registered as nation islands
        if (isle.faction && this.islands[isle.faction]) continue;
        let pos = typeof getIslandWorldPos === 'function'
          ? getIslandWorldPos(isle)
          : { x: 600 + Math.cos(isle.angle) * isle.dist, y: 400 + Math.sin(isle.angle) * isle.dist };
        this.islands[isle.key] = {
          id: isle.key,
          type: isle.type || 'neutral',
          faction: isle.faction || null,
          cx: pos.x,
          cy: pos.y,
          rx: isle.isleRX || 300,
          ry: isle.isleRY || 200,
          isPlayer: false,
          defense: isle.defense || 0,
          benefit: isle.benefit || null,
          worldIslandRef: isle,
          // Neutral islands get their own mini-state for buildings/resources
          islandState: isle._islandState || createNeutralIslandState(isle),
        };
      }
    }

    this.initialized = true;
    console.log('[WorldState] Initialized:', Object.keys(this.islands).length, 'islands registered');
  },

  // ─── ISLAND ACCESS ───────────────────────────────────────────────────

  /** Get an island's metadata + state by ID */
  getIsland(id) {
    return this.islands[id] || null;
  },

  /** Get the island the player is currently on */
  getActiveIsland() {
    return this.islands[this.activeIslandId] || null;
  },

  /** Get the player's home island */
  getHomeIsland() {
    return this.islands[this.playerIslandId] || null;
  },

  /** Get all island IDs */
  getAllIslandIds() {
    return Object.keys(this.islands);
  },

  /** Get all islands belonging to a faction */
  getFactionIslands(factionId) {
    let result = [];
    for (let id in this.islands) {
      if (this.islands[id].faction === factionId) result.push(this.islands[id]);
    }
    return result;
  },

  /** Get island at world coordinates (nearest within radius) */
  getIslandAt(wx, wy, maxDist) {
    maxDist = maxDist || 500;
    let closest = null;
    let closestDist = maxDist * maxDist;
    for (let id in this.islands) {
      let isle = this.islands[id];
      if (isle.defeated) continue;
      let dx = wx - isle.cx;
      let dy = wy - isle.cy;
      let d2 = dx * dx + dy * dy;
      if (d2 < closestDist) {
        closestDist = d2;
        closest = isle;
      }
    }
    return closest;
  },

  // ─── SAFE ISLAND STATE ACCESS ─────────────────────────────────────────
  // These methods let systems read/write island state WITHOUT swapping globals.

  /**
   * Read a field from an island's state.
   * For the player's home island, reads from global `state`.
   * For other islands, reads from their islandState object.
   */
  readField(islandId, field) {
    let isle = this.islands[islandId];
    if (!isle) return undefined;
    if (isle._usesGlobalState) return state[field];
    if (isle.islandState) return isle.islandState[field];
    return undefined;
  },

  /**
   * Write a field to an island's state.
   */
  writeField(islandId, field, value) {
    let isle = this.islands[islandId];
    if (!isle) return;
    if (isle._usesGlobalState) {
      state[field] = value;
    } else if (isle.islandState) {
      isle.islandState[field] = value;
    }
  },

  /**
   * Get an island's full state object (for read-only queries).
   * Returns the actual object — mutations are allowed but should be careful.
   */
  getIslandState(islandId) {
    let isle = this.islands[islandId];
    if (!isle) return null;
    if (isle._usesGlobalState) return state; // player home = global state
    return isle.islandState;
  },

  // ─── SAFE SWAP (Phase 1 compatibility) ──────────────────────────────
  // Wraps the old swapToIsland/swapBack with a stack-based guard.
  // This prevents the re-entrant swap bug that causes the "weird instance".

  /**
   * Safely swap to an island's context for legacy code that still reads global `state`.
   * Returns true if swap succeeded, false if already in a swap (nested).
   * ALWAYS call safeSwapBack() when done, even in error paths.
   */
  safeSwap(islandId) {
    let isle = this.islands[islandId];
    if (!isle) {
      console.warn('[WorldState] safeSwap: unknown island', islandId);
      return false;
    }
    if (isle._usesGlobalState) return true; // already "swapped" to home

    // Push current state onto stack
    let snapshot = {
      islandId: this.activeIslandId,
      cx: WORLD.islandCX,
      cy: WORLD.islandCY,
    };
    // Save all island fields from current global state
    for (let f of _islandFields) {
      snapshot[f] = state[f];
    }
    this._swapStack.push(snapshot);

    // Apply the target island's state to globals
    let is = isle.islandState;
    if (is) {
      for (let f of _islandFields) {
        state[f] = is[f] != null ? is[f] : state[f];
      }
    }
    WORLD.islandCX = isle.cx;
    WORLD.islandCY = isle.cy;
    this.activeIslandId = islandId;

    return true;
  },

  /**
   * Restore the previous swap context from the stack.
   */
  safeSwapBack() {
    if (this._swapStack.length === 0) {
      // console.warn('[WorldState] safeSwapBack: nothing on stack');
      return;
    }

    // Save current island's state back to its islandState object
    let currentIsle = this.islands[this.activeIslandId];
    if (currentIsle && currentIsle.islandState && !currentIsle._usesGlobalState) {
      for (let f of _islandFields) {
        currentIsle.islandState[f] = state[f];
      }
    }

    // Pop and restore
    let snapshot = this._swapStack.pop();
    for (let f of _islandFields) {
      state[f] = snapshot[f];
    }
    WORLD.islandCX = snapshot.cx;
    WORLD.islandCY = snapshot.cy;
    this.activeIslandId = snapshot.islandId;
  },

  /**
   * Execute a function in the context of a specific island.
   * Handles swap/swapBack automatically, even on error.
   * This is the preferred way to run legacy code on another island.
   *
   * Usage: WorldState.withIsland('carthage', (islandState) => { ... });
   */
  withIsland(islandId, fn) {
    let isle = this.islands[islandId];
    if (!isle) return undefined;

    // If it's the home island, just run directly
    if (isle._usesGlobalState) {
      return fn(state);
    }

    let swapped = this.safeSwap(islandId);
    try {
      return fn(isle.islandState || state);
    } finally {
      if (swapped && this._swapStack.length > 0) {
        this.safeSwapBack();
      }
    }
  },

  // ─── PLAYER MOVEMENT ──────────────────────────────────────────────────

  /**
   * Player arrives at an island (docking).
   * Sets the active island and swaps context so the existing
   * rendering pipeline draws the correct island.
   */
  playerArriveAt(islandId) {
    let isle = this.islands[islandId];
    if (!isle) {
      console.warn('[WorldState] playerArriveAt: unknown island', islandId);
      return false;
    }

    // If arriving at home, just clear any active visit
    if (islandId === this.playerIslandId) {
      this.playerLeaveIsland();
      return true;
    }

    this.activeIslandId = islandId;

    // Set the game state flags that sketch.js checks
    if (isle.type === 'nation') {
      state._activeNation = islandId;
      state._activeWorldIsland = null;
    } else {
      state._activeWorldIsland = islandId;
      state._activeNation = null;
      state._worldIslePos = {
        x: isle.cx, y: isle.cy,
        rx: isle.rx, ry: isle.ry,
      };
    }

    console.log('[WorldState] Player arrived at', islandId);
    return true;
  },

  /**
   * Player leaves the current island (returns to sea or home).
   */
  playerLeaveIsland() {
    let prevIsland = this.activeIslandId;
    this.activeIslandId = this.playerIslandId;
    state._activeNation = null;
    state._activeWorldIsland = null;
    state._worldIslePos = null;

    // Clear any lingering swap state
    while (this._swapStack.length > 0) {
      this.safeSwapBack();
    }

    if (prevIsland !== this.playerIslandId) {
      console.log('[WorldState] Player left', prevIsland);
    }
  },

  // ─── DISTANCE & LOD ──────────────────────────────────────────────────

  /**
   * Get distance from a world position to an island center.
   */
  distanceTo(islandId, wx, wy) {
    let isle = this.islands[islandId];
    if (!isle) return Infinity;
    let dx = wx - isle.cx;
    let dy = wy - isle.cy;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Get LOD level for an island based on camera/player distance.
   * 3 = full detail, 2 = medium, 1 = far silhouette, 0 = not visible
   */
  getLOD(islandId, cameraX, cameraY) {
    let dist = this.distanceTo(islandId, cameraX, cameraY);
    if (dist < 800) return 3;
    if (dist < 2000) return 2;
    if (dist < 4000) return 1;
    return 0;
  },

  /**
   * Get all islands sorted by distance from a point, with LOD levels.
   * Useful for the rendering pipeline to draw far → near.
   */
  getVisibleIslands(cameraX, cameraY, maxDist) {
    maxDist = maxDist || 5000;
    let visible = [];
    for (let id in this.islands) {
      let isle = this.islands[id];
      if (isle.defeated) continue;
      let dist = this.distanceTo(id, cameraX, cameraY);
      if (dist > maxDist) continue;
      visible.push({
        id: id,
        island: isle,
        dist: dist,
        lod: this.getLOD(id, cameraX, cameraY),
      });
    }
    // Sort far to near (painter's algorithm — draw distant first)
    visible.sort((a, b) => b.dist - a.dist);
    return visible;
  },

  // ─── ECONOMY QUERIES (for swarm agents) ──────────────────────────────

  /** Get total gold for an island */
  getGold(islandId) {
    return this.readField(islandId, 'gold') || 0;
  },

  /** Get army size for an island */
  getArmySize(islandId) {
    let legia = this.readField(islandId, 'legia');
    if (!legia || !legia.army) return 0;
    return legia.army.filter(u => u.hp > 0).length;
  },

  /** Get building count for an island */
  getBuildingCount(islandId) {
    let buildings = this.readField(islandId, 'buildings');
    return buildings ? buildings.length : 0;
  },

  /** Get population for an island */
  getPopulation(islandId) {
    let citizens = this.readField(islandId, 'citizens');
    return citizens ? citizens.length : 0;
  },

  // ─── SYNC ────────────────────────────────────────────────────────────

  /**
   * Sync WorldState metadata from live game state.
   * Call periodically (e.g., every few seconds) to keep island positions,
   * defeated status, etc. up to date.
   */
  sync() {
    // Sync home island position (in case of expansion)
    let home = this.islands[this.playerIslandId];
    if (home) {
      home.cx = WORLD.islandCX;
      home.cy = WORLD.islandCY;
      home.rx = state.islandRX || home.rx;
      home.ry = state.islandRY || home.ry;
    }

    // Sync nation data
    if (state.nations) {
      for (let k in state.nations) {
        let nation = state.nations[k];
        let isle = this.islands[k];
        if (isle && nation) {
          isle.defeated = !!nation.defeated;
          isle.cx = nation.isleX;
          isle.cy = nation.isleY;
          isle.islandState = nation.islandState;
        }
      }
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Create a minimal island state for neutral/world islands
// ═══════════════════════════════════════════════════════════════════════════

function createNeutralIslandState(isle) {
  let cx = 0, cy = 0;
  if (typeof getIslandWorldPos === 'function') {
    let pos = getIslandWorldPos(isle);
    cx = pos.x; cy = pos.y;
  }
  return {
    faction: isle.faction || null,
    islandLevel: 1,
    islandRX: isle.isleRX || 300,
    islandRY: isle.isleRY || 200,
    buildings: [],
    plots: [],
    trees: [],
    crystalNodes: [],
    citizens: [],
    wood: 0, stone: 0, gold: isle.defense ? 20 : 5, crystals: 0,
    ironOre: 0, harvest: 0, fish: 0,
    seeds: 0, meals: 0, wine: 0, oil: 0,
    pyramid: null, ruins: [], resources: [],
    factionFlora: [], factionWildlife: [],
    chickens: [], crystalShrine: null,
    workers: [],
    player: {
      x: cx, y: cy, vx: 0, vy: 0, speed: 3.2, size: 16,
      facing: 'down', moving: false, hp: 50, maxHp: 50,
      anim: { emotion: 'determined', emotionTimer: 0, blinkTimer: 240, blinkFrame: 0,
              bounceY: 0, bounceTimer: 0, walkFrame: 0, walkTimer: 0, helmetOff: false },
      level: 1, xp: 0, weapon: 0, armor: 0, skills: {},
    },
    legia: { army: [], castrumLevel: 0, morale: 80 },
    companion: null,
    npc: [], marcus: null, vesta: null, felix: null,
    progression: { gameStarted: true, villaCleared: true,
                   companionsAwakened: {}, tutorialsSeen: {} },
    weather: { type: 'clear', timer: 0 },
    time: { hours: 8, minutes: 0 },
    day: 1,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCHED swapToIsland / swapBack — route through WorldState when available
// ═══════════════════════════════════════════════════════════════════════════
// These override the originals in expansion.js. Because world-state.js loads
// BEFORE expansion.js (we'll adjust index.html), the originals will overwrite
// these. So instead, we patch AFTER load via a deferred hook.

let _worldStatePatched = false;

function patchSwapFunctions() {
  if (_worldStatePatched) return;
  if (!WorldState.initialized) return;

  // Save originals
  const _origSwap = window.swapToIsland;
  const _origSwapBack = window.swapBack;

  // Replace with stack-safe versions
  window.swapToIsland = function(islandState, cx, cy) {
    // Find which island this belongs to
    let islandId = null;
    for (let id in WorldState.islands) {
      let isle = WorldState.islands[id];
      if (isle.islandState === islandState) { islandId = id; break; }
      if (isle.cx === cx && isle.cy === cy) { islandId = id; break; }
    }

    if (islandId) {
      WorldState.safeSwap(islandId);
    } else {
      // Fallback to original for unknown islands
      if (_origSwap) _origSwap(islandState, cx, cy);
    }
  };

  window.swapBack = function() {
    if (WorldState._swapStack.length > 0) {
      WorldState.safeSwapBack();
    } else if (_origSwapBack) {
      _origSwapBack();
    }
  };

  _worldStatePatched = true;
  console.log('[WorldState] Patched swapToIsland/swapBack with stack-safe versions');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-INIT HOOK — patches into the game's setup flow
// ═══════════════════════════════════════════════════════════════════════════

// We hook into the game after state.isInitialized is set to true.
// This runs once per game start (new game or load).
let _worldStateInitCheck = null;

function startWorldStateInitWatch() {
  if (_worldStateInitCheck) return;
  _worldStateInitCheck = setInterval(function() {
    if (typeof state !== 'undefined' && state && state.isInitialized && !WorldState.initialized) {
      WorldState.init(state.faction);
      patchSwapFunctions();
      // Sync every 5 seconds
      setInterval(function() {
        if (WorldState.initialized) WorldState.sync();
      }, 5000);
      clearInterval(_worldStateInitCheck);
      _worldStateInitCheck = null;
    }
  }, 500);
}

// Start watching as soon as this script loads
if (typeof window !== 'undefined') {
  startWorldStateInitWatch();
}
