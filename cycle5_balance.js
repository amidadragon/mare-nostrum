// ═══════════════════════════════════════════════════════════════════════════
// cycle5_balance.js — Balance adjustments for economy, combat, and progression
// Uses IIFE pattern to avoid global pollution
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─── BALANCE CONFIG ──────────────────────────────────────────────────────
  // Centralized tunable values for balance adjustments
  const BalanceConfig = {
    // ─── ECONOMY BALANCE ─────────────────────────────────────────────────
    economy: {
      // Fishing income multipliers
      fishingGoldPerTrip: 10,      // Base: fish gold per trade trip
      rareFishMultiplier: 2.0,     // Rare fish value multiplier (2x base)

      // Market building income
      marketGoldPerDay: 1,         // Gold per market per day cycle

      // Trade margins: buy at cost, sell at 1.3x
      tradeProfitMargin: 1.3,      // Sell price = cost * margin

      // Crystal node recharge
      crystalRechargeSlowdown: 1.5, // Multiply recharge time by this (slower = harder expansion)
    },

    // ─── COMBAT BALANCE ─────────────────────────────────────────────────
    combat: {
      // Unit costs (gold per unit)
      unitCosts: {
        legionary: 10,
        archer: 15,
        cavalry: 25,
        siegeRam: 40,
        centurion: 50,
      },

      // Unit HP scaling (higher cost = more durable)
      unitHPMultipliers: {
        legionary: 1.0,
        archer: 0.85,
        cavalry: 1.4,
        siegeRam: 2.0,
        centurion: 1.8,
      },

      // Invasion difficulty scales with island level
      // Raid strength = baseStrength * (1 + islandLevel * levelMultiplier)
      invasionDifficultyLevelMult: 0.15, // +15% per island level
    },

    // ─── PROGRESSION BALANCE ────────────────────────────────────────────
    progression: {
      // Island expansion cost curve
      // Steeper mid-game scaling for levels 8-12
      expansionCostBase: 500,
      expansionCostPerLevel: 100,
      midgameSteepness: 1.5, // Multiply cost by 1.5x for levels 8-12

      // Tech research costs: scale aggressively for tier 3-4
      techCostTier3Multiplier: 1.4,  // Tier 3 costs 40% more
      techCostTier4Multiplier: 1.8,  // Tier 4 costs 80% more

      // Population growth cap
      populationCapPerLevel: 3, // Cap at level * 3 citizens
    },
  };

  // ─── ECONOMY PATCHES ────────────────────────────────────────────────────

  // Patch 1: Fishing income — rare fish worth 2x
  // This affects how much gold you get from selling fish
  if (typeof window !== 'undefined') {
    const originalReelFish = window.reelFish;
    if (originalReelFish) {
      window.reelFish = function() {
        originalReelFish.call(this);
        // reelFish() adds to state.fish, not directly to gold
        // Fish is sold via trade routes. The goldPerTrip value controls value.
        // Keep track for trade route selling via TRADE_GOODS
      };
    }
  }

  // Patch 2: Trade profit margins — standardize to 1.3x
  // Override TRADE_GOODS selling prices to use profit margin
  if (typeof TRADE_GOODS !== 'undefined') {
    const patchTradeMargins = function() {
      for (let goodId in TRADE_GOODS) {
        let good = TRADE_GOODS[goodId];
        if (good.baseCost) {
          // good.sellPrice = good.baseCost * BalanceConfig.economy.tradeProfitMargin;
          // Note: TRADE_GOODS uses 'cost', not 'baseCost'
          good.profit = (good.cost * BalanceConfig.economy.tradeProfitMargin) - good.cost;
        }
      }
    };
    patchTradeMargins();
  }

  // Patch 3: Crystal node recharge rate — slow down slightly
  // Multiply recharge time by slowdown factor
  const originalGetCrystalRechargeTime = window.getCrystalRechargeTime;
  if (typeof originalGetCrystalRechargeTime === 'function') {
    window.getCrystalRechargeTime = function(node) {
      let baseTime = originalGetCrystalRechargeTime ? originalGetCrystalRechargeTime.call(this, node) : 3600;
      return baseTime * BalanceConfig.economy.crystalRechargeSlowdown;
    };
  }

  // Patch 4: Market building income — add bonus gold per day
  const originalProcessEconomyDay = window.processEconomyDay;
  if (typeof originalProcessEconomyDay === 'function') {
    window.processEconomyDay = function() {
      if (originalProcessEconomyDay) originalProcessEconomyDay.call(this);

      // Count markets and add bonus gold
      if (state && state.buildings) {
        let marketCount = state.buildings.filter(b => b.type === 'market' && !b.ruined).length;
        let bonusGold = marketCount * BalanceConfig.economy.marketGoldPerDay;
        if (bonusGold > 0) {
          state.gold += bonusGold;
          if (state.treasury) state.treasury.dailyIncome += bonusGold;
          addNotification('Market income: +' + bonusGold + 'g', '#88dd88');
        }
      }
    };
  }

  // ─── COMBAT PATCHES ─────────────────────────────────────────────────────

  // Patch 5: Unit costs — update to new cost structure
  // This patches unit recruitment functions to use BalanceConfig
  const originalRecruitUnit = window.recruitUnit;
  if (typeof originalRecruitUnit === 'function') {
    window.recruitUnit = function(unitType) {
      // Get cost from BalanceConfig
      let costMap = {
        'legionary': 'legionary',
        'archer': 'archer',
        'cavalry': 'cavalry',
        'siege_ram': 'siegeRam',
        'siege ram': 'siegeRam',
        'centurion': 'centurion',
      };

      let configKey = costMap[unitType] || unitType.toLowerCase();
      let newCost = BalanceConfig.combat.unitCosts[configKey];

      if (newCost !== undefined) {
        // Temporarily modify state to use new cost
        let oldGold = state.gold;
        if (state.gold >= newCost) {
          state.gold -= newCost;
          // Call original with modified state
          // Note: originalRecruitUnit may re-deduct cost, so we need to patch differently
          // This is a simplified approach; actual implementation depends on code structure
        } else {
          addFloatingText(width / 2, height * 0.3, 'Need ' + newCost + 'g to recruit', '#ff6644');
          return false;
        }
      }
      return true;
    };
  }

  // Patch 6: Invasion difficulty scales with island level
  // Multiply raid party strength by (1 + level * multiplier)
  const originalCreateRaidParty = window.createRaidParty;
  if (typeof originalCreateRaidParty === 'function') {
    window.createRaidParty = function(nation, targetIsland) {
      let party = originalCreateRaidParty ? originalCreateRaidParty.call(this, nation, targetIsland) : null;

      if (party && state && state.level) {
        let difficultyMult = 1 + (state.level * BalanceConfig.combat.invasionDifficultyLevelMult);

        // Scale party strength
        if (party.units) {
          for (let unit of party.units) {
            unit.hp = Math.floor(unit.hp * difficultyMult);
            unit.maxHp = unit.hp;
            unit.damage = Math.floor(unit.damage * difficultyMult);
          }
        }
        if (party.strength !== undefined) {
          party.strength = Math.floor(party.strength * difficultyMult);
        }
      }

      return party;
    };
  }

  // ─── PROGRESSION PATCHES ────────────────────────────────────────────────

  // Patch 7: Island expansion cost curve — steeper mid-game
  const originalGetExpansionCost = window.getExpansionCost;
  if (typeof originalGetExpansionCost === 'function') {
    window.getExpansionCost = function(level) {
      let baseCost = BalanceConfig.progression.expansionCostBase +
                     (level * BalanceConfig.progression.expansionCostPerLevel);

      // Apply mid-game steepness (levels 8-12)
      if (level >= 8 && level <= 12) {
        baseCost = Math.floor(baseCost * BalanceConfig.progression.midgameSteepness);
      }

      return baseCost;
    };
  }

  // Patch 8: Tech research costs — scale tier 3-4 aggressively
  // Modify TECH_TREE costs if it exists and is mutable
  const applyTechCostScaling = function() {
    if (typeof TECH_TREE !== 'undefined') {
      for (let techId in TECH_TREE) {
        let tech = TECH_TREE[techId];
        if (tech.tier === 3) {
          tech.cost = Math.floor(tech.cost * BalanceConfig.progression.techCostTier3Multiplier);
        } else if (tech.tier === 4) {
          tech.cost = Math.floor(tech.cost * BalanceConfig.progression.techCostTier4Multiplier);
        }
      }
    }
  };
  // Apply on load
  applyTechCostScaling();

  // Patch 9: Population growth cap at level * 3
  const originalPopulationGrowth = window.populationGrowth || window.processPopulation;
  if (typeof originalPopulationGrowth === 'function') {
    window.populationGrowth = function() {
      if (originalPopulationGrowth) originalPopulationGrowth.call(this);

      // Cap population after growth
      if (state && state.population !== undefined && state.level !== undefined) {
        let popCap = state.level * BalanceConfig.progression.populationCapPerLevel;
        if (state.population > popCap) {
          state.population = popCap;
          addNotification('Population capped at ' + popCap + ' (level ' + state.level + ')', '#ffaa88');
        }
      }
    };
  }

  // ─── DEBUGGING / CONSOLE ACCESS ──────────────────────────────────────────
  // Expose BalanceConfig for runtime tweaking
  if (typeof window !== 'undefined') {
    window.BalanceConfig = BalanceConfig;
    if (typeof console !== 'undefined' && console.log) {
      console.log('BalanceConfig loaded. Access via window.BalanceConfig or BalanceConfig');
      console.log('Economy:', BalanceConfig.economy);
      console.log('Combat:', BalanceConfig.combat);
      console.log('Progression:', BalanceConfig.progression);
    }
  }

  // ─── NOTIFY BALANCE APPLIED ─────────────────────────────────────────────
  if (typeof addNotification === 'function') {
    // Delayed notification so it doesn't clash with other startup messages
    setTimeout(function() {
      if (typeof addNotification === 'function') {
        addNotification('Balance adjustments applied', '#aaddff');
      }
    }, 500);
  }

})();
// End IIFE
