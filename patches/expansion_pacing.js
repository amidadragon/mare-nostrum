// ═══════════════════════════════════════════════════════════════════════
// EXPANSION PACING — early game is now a bootstrapping arc (Grok design).
// ZERO core file edits; wraps getExpandCost / canAffordExpand /
// getExpandCostString / generateQuest / onHarvestCombo / reelFish /
// _templeRoomInteractE. Save-safe: new fields default lazily.
//
// Design (deviations from spec noted):
//  · L1→2 raised to 10c/20w/12s — spec's 8c/12w/8s was instantly affordable
//    with starting resources (8c/15w/10s), defeating its own goal.
//  · Iron enters at L5 (8) not L4 (15) — iron is scarce pre-quarry; a hard
//    L4 iron wall risked bricking progression. Tune upward if too soft.
//  · Milestones from L3: gates POWER, never activities.
//  · Daily-quest crystal rewards capped at 1 before L3 / day 6.
//  · New cozy faucet: tidepool shimmer at slack water (+1 crystal, max
//    2/day) — teaches the tide and replaces nerfed quest crystals.
//  · Bots: conquest bots do NOT use getExpandCost/expandIsland (verified),
//    so their pacing is untouched.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  // ─── milestone state (lazy, save-compatible) ──────────────────────────
  function MS() {
    if (!state.expansionMilestones) {
      state.expansionMilestones = {
        crops: 0, fish: 0, blessed: false, tideSlacks: 0,
        poolDay: -1, poolTaken: 0, firstSlackSeen: false,
      };
    }
    return state.expansionMilestones;
  }

  // milestone definitions per CURRENT islandLevel (gate to reach lvl+1)
  const GATES = {
    3: {
      id: 'provisioned', label: 'Provision the isle',
      done: () => MS().crops >= 12 && MS().fish >= 6,
      progress: () => 'crops ' + Math.min(MS().crops, 12) + '/12, fish ' + Math.min(MS().fish, 6) + '/6',
    },
    4: {
      id: 'blessed', label: 'Receive the shrine blessing',
      done: () => MS().blessed,
      progress: () => 'offer 5 crystals at the temple altar',
    },
    5: {
      id: 'firstGoal', label: 'Fulfil a Compass goal',
      done: () => (state._compass && state._compass.completed >= 1) ||
                  (state.narrativeFlags && state.narrativeFlags.chapter1Done),
      progress: () => 'complete 1 compass goal',
    },
    6: {
      id: 'tides', label: 'Witness the tides',
      done: () => MS().tideSlacks >= 4, // 4 slacks = 2 full cycles
      progress: () => 'tide turns seen ' + Math.min(MS().tideSlacks, 4) + '/4',
    },
  };

  function gateFor(lvl) { return GATES[lvl] || null; }

  // ─── 1. cost curve ─────────────────────────────────────────────────────
  const _origCost = window.getExpandCost;
  window.getExpandCost = function (lvl) {
    const table = {
      1: { crystals: 10, wood: 20, stone: 12 },
      2: { crystals: 14, wood: 18, stone: 12 },
      3: { crystals: 20, wood: 25, stone: 18 },
      4: { crystals: 28, wood: 30, stone: 20 },
      5: { crystals: 38, wood: 35, stone: 25, ironOre: 8 },
      6: { crystals: 48, wood: 30, stone: 10, ironOre: 10 },
    };
    if (table[lvl]) return table[lvl];
    // L7+: original shape, crystal cap reached slightly earlier (~L12)
    const c = _origCost(lvl);
    if (lvl >= 7 && lvl <= 14) c.crystals = Math.min(200, Math.floor(c.crystals * 1.12));
    if (lvl === 9 || lvl === 10) c.ancientRelic = Math.max(c.ancientRelic || 0, 1); // light hybrid touch
    return c;
  };

  // ─── 2. affordability = resources + milestone ──────────────────────────
  window.canAffordExpand = function () {
    const cost = getExpandCost(state.islandLevel);
    if (state.crystals < cost.crystals) return false;
    if (cost.wood && state.wood < cost.wood) return false;
    if (cost.stone && state.stone < cost.stone) return false;
    if (cost.ironOre && state.ironOre < cost.ironOre) return false;
    if (cost.ancientRelic && state.ancientRelic < cost.ancientRelic) return false;
    if (cost.titanBone && state.titanBone < cost.titanBone) return false;
    const g = gateFor(state.islandLevel);
    if (g && !g.done()) return false;
    return true;
  };

  window.getExpandCostString = function () {
    const cost = getExpandCost(state.islandLevel);
    const parts = [cost.crystals + ' crystals'];
    if (cost.wood) parts.push(cost.wood + ' wood');
    if (cost.stone) parts.push(cost.stone + ' stone');
    if (cost.ironOre) parts.push(cost.ironOre + ' iron');
    if (cost.ancientRelic) parts.push(cost.ancientRelic + ' relics');
    if (cost.titanBone) parts.push(cost.titanBone + ' bone');
    let s = parts.join(', ');
    const g = gateFor(state.islandLevel);
    if (g && !g.done()) s += ' + ' + g.label + ' (' + g.progress() + ')';
    return s;
  };

  // NOTE: expandIsland() only spends crystals/stone/iron/relic/bone — wood
  // cost must be spent by us. Wrap it: pre-check, then deduct wood after.
  const _wireExpand = setInterval(function () {
    if (typeof window.expandIsland !== 'function') return;
    clearInterval(_wireExpand);
    const orig = window.expandIsland;
    window.expandIsland = function () {
      const lvlBefore = state.islandLevel;
      const cost = getExpandCost(lvlBefore);
      orig.apply(this, arguments);
      if (state.islandLevel > lvlBefore && cost.wood) {
        state.wood = Math.max(0, state.wood - cost.wood);
      }
    };
  }, 400);

  // ─── 3. milestone tracking via wrappers ────────────────────────────────
  const _wireTrackers = setInterval(function () {
    if (typeof window.onHarvestCombo !== 'function' ||
        typeof window.reelFish !== 'function' ||
        typeof window._templeRoomInteractE !== 'function' ||
        typeof window.generateQuest !== 'function') return;
    clearInterval(_wireTrackers);

    const origHarvest = window.onHarvestCombo;
    window.onHarvestCombo = function () {
      MS().crops++;
      return origHarvest.apply(this, arguments);
    };

    const origReel = window.reelFish;
    window.reelFish = function () {
      const before = state.fish || 0;
      const r = origReel.apply(this, arguments);
      if ((state.fish || 0) > before) MS().fish++;
      return r;
    };

    const origTemple = window._templeRoomInteractE;
    window._templeRoomInteractE = function () {
      const cBefore = state.crystals, sBefore = state.solar;
      const r = origTemple.apply(this, arguments);
      if (state.crystals === cBefore - 5 && state.solar > sBefore && !MS().blessed) {
        MS().blessed = true;
        if (typeof addNotification === 'function')
          addNotification('The gods smile — shrine blessing earned', '#ffd966');
      }
      return r;
    };

    // 4. daily-quest crystal cap (early game)
    const origQuest = window.generateQuest;
    window.generateQuest = function () {
      const q = origQuest.apply(this, arguments);
      if (q && q.reward && q.reward.crystals &&
          ((state.day || 0) <= 5 || (state.islandLevel || 1) < 3)) {
        q.reward.crystals = 1;
      }
      return q;
    };

    console.log('[Expansion Pacing] ✓ gates, trackers, quest cap active');
  }, 400);

  // ─── 5. tidepool shimmer — cozy crystal faucet at slack water ──────────
  const Pools = {
    spots: [],
    update() {
      if (typeof TideMN === 'undefined' || gameScreen !== 'game') return;
      const m = MS();
      if (TideMN.isSlack()) {
        m.tideSlacks === 0 && 0; // touch
        if (!this._inSlack) {
          this._inSlack = true;
          m.tideSlacks++;
          // first-ever slack: teaching moment
          if (!m.firstSlackSeen) {
            m.firstSlackSeen = true;
            if (typeof addNotification === 'function')
              addNotification('Slack water — the sea rests. Tidepools glitter on the shore…', '#7fc8e6');
          }
          this._spawn();
        }
        // pickup check
        const px = state.player.x, py = state.player.y;
        for (let i = this.spots.length - 1; i >= 0; i--) {
          const s = this.spots[i];
          if (Math.hypot(s.x - px, s.y - py) < 34) {
            this.spots.splice(i, 1);
            if (m.poolDay !== state.day) { m.poolDay = state.day; m.poolTaken = 0; }
            if (m.poolTaken < 2) {
              m.poolTaken++;
              state.crystals += 1;
              if (typeof addFloatingText === 'function')
                addFloatingText(w2sX(s.x), w2sY(s.y) - 16, '+1 Crystal (tidepool)', '#7fe6d0');
              if (typeof spawnParticles === 'function') spawnParticles(s.x, s.y, 'build', 6);
            }
          }
        }
      } else {
        this._inSlack = false;
        this.spots = []; // the sea takes them back
      }
    },
    _spawn() {
      this.spots = [];
      const cx = WORLD.islandCX, cy = WORLD.islandCY;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spots.push({
          x: cx + Math.cos(a) * (state.islandRX + 18),
          y: cy + Math.sin(a) * (state.islandRY + 14),
        });
      }
    },
    draw() {
      if (!this.spots.length || gameScreen !== 'game') return;
      push();
      noStroke();
      for (const s of this.spots) {
        const sx = w2sX(s.x), sy = w2sY(s.y);
        const tw = 0.6 + 0.4 * Math.sin(frameCount * 0.15 + s.x);
        fill(127, 230, 208, 150 * tw);
        ellipse(sx, sy, 10, 6);
        fill(255, 255, 255, 180 * tw);
        ellipse(sx + Math.sin(frameCount * 0.1) * 3, sy - 2, 2.5, 2.5);
      }
      pop();
    },
  };

  const _wireDraw = setInterval(function () {
    if (typeof window.draw !== 'function' || typeof state === 'undefined') return;
    clearInterval(_wireDraw);
    const orig = window.draw;
    window.draw = function () {
      orig.apply(this, arguments);
      try { Pools.update(); Pools.draw(); } catch (e) { /* silent */ }
    };
    console.log('[Expansion Pacing] ✓ tidepool faucet active');
  }, 400);
})();
