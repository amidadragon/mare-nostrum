// ═══════════════════════════════════════════════════════════════
// CYCLE 5: SOUND HOOKS — Enhanced SFX & Ambient Integration
// ═══════════════════════════════════════════════════════════════
// Hooks into existing game systems to add missing sound effects
// and atmospheric ambience. Lightweight and non-destructive.

(function() {
  'use strict';

  // ───────────────────────────────────────────────────────────────
  // AMBIENT SOUND MANAGER
  // ───────────────────────────────────────────────────────────────

  class AmbientSoundHooks {
    constructor() {
      this._lastAmbientCheck = 0;
      this._ambientCheckInterval = 1000; // ms
      this._oceanActive = false;
      this._windActive = false;
      this._marketActive = false;
      this._campfireActive = false;
      this._proximityRadius = 250; // detection radius
    }

    update(dt) {
      if (!snd || typeof state === 'undefined') return;

      let now = millis();
      if (now - this._lastAmbientCheck < this._ambientCheckInterval) return;
      this._lastAmbientCheck = now;

      // Ocean waves near coast
      this._updateOceanAmbience();
      // Marketplace chatter near market
      this._updateMarketplaceAmbience();
      // Campfire crackling near tavern
      this._updateCampfireAmbience();
      // Wind during sailing
      this._updateWindAmbience();
    }

    _updateOceanAmbience() {
      if (!state.player) return;

      let px = state.player.x;
      let py = state.player.y;

      // Check if near water/coast (simple proximity check)
      let nearWater = false;
      if (typeof isOnWater === 'function') {
        nearWater = isOnWater(px, py);
      } else {
        // Fallback: check if near map edges or known water areas
        nearWater = (py > state.mapHeight - 300) || (px < 300 && py > state.mapHeight * 0.6);
      }

      if (nearWater && !this._oceanActive) {
        this._oceanActive = true;
        if (snd.ambient) snd.ambient._oceanGain.gain.setValueAtTime(0.3, snd.ctx.currentTime);
      } else if (!nearWater && this._oceanActive) {
        this._oceanActive = false;
        if (snd.ambient) snd.ambient._oceanGain.gain.setValueAtTime(0, snd.ctx.currentTime);
      }
    }

    _updateMarketplaceAmbience() {
      if (!state.buildings || !state.player) return;

      let marketplace = state.buildings.find(b => b.type === 'market' &&
        dist(b.x, b.y, state.player.x, state.player.y) < this._proximityRadius);

      if (marketplace && !this._marketActive) {
        this._marketActive = true;
        // Marketplace chatter — use ambient crowd voices
        if (snd) snd.playSFX('crowd'); // fallback to generic crowd
      } else if (!marketplace && this._marketActive) {
        this._marketActive = false;
      }
    }

    _updateCampfireAmbience() {
      if (!state.buildings || !state.player) return;

      let tavern = state.buildings.find(b => b.type === 'tavern' &&
        dist(b.x, b.y, state.player.x, state.player.y) < this._proximityRadius);

      if (tavern && !this._campfireActive) {
        this._campfireActive = true;
        // Fire crackling looped
        if (snd) snd.playSFX('fire_crackling');
      } else if (!tavern && this._campfireActive) {
        this._campfireActive = false;
      }
    }

    _updateWindAmbience() {
      if (!state.player || typeof isInShip === 'undefined') return;

      let sailing = isInShip();
      if (sailing && !this._windActive) {
        this._windActive = true;
        if (snd) snd.playSFX('wind_gust');
      } else if (!sailing && this._windActive) {
        this._windActive = false;
      }
    }
  }

  let ambientHooks = null;

  // ───────────────────────────────────────────────────────────────
  // SFX HOOK PATCHES
  // ───────────────────────────────────────────────────────────────

  // Patch placeBuilding() to add build SFX
  const _origPlaceBuilding = window.placeBuilding;
  window.placeBuilding = function(wx, wy) {
    if (snd) snd.playSFX('build');
    return _origPlaceBuilding.call(this, wx, wy);
  };

  // Patch reelFish() to add splash SFX on catch
  const _origReelFish = window.reelFish;
  window.reelFish = function() {
    let result = _origReelFish.call(this);
    // Note: reelFish already calls snd.playSFX('fish_catch') internally,
    // but we can enhance with additional feedback
    if (snd && result) snd.playSFX('splash');
    return result;
  };

  // Patch grantXP() to add levelup fanfare when leveling
  const _origGrantXP = window.grantXP;
  window.grantXP = function(xp) {
    let oldLevel = state.level || 1;
    let result = _origGrantXP.call(this, xp);
    let newLevel = state.level || 1;

    if (newLevel > oldLevel && snd) {
      snd.playSFX('fanfare');
      snd.playSFX('skill_unlock');
    }
    return result;
  };

  // Hook island expansion to play fanfare
  const _origExpandIsland = window.expandIsland;
  if (typeof _origExpandIsland === 'function') {
    window.expandIsland = function(direction) {
      let result = _origExpandIsland.call(this, direction);
      if (snd) snd.playSFX('fanfare');
      return result;
    };
  }

  // Patch createTradeRoute() to add coins SFX
  const _origCreateTradeRoute = window.createTradeRoute;
  window.createTradeRoute = function(good) {
    if (snd) snd.playSFX('coin');
    return _origCreateTradeRoute.call(this, good);
  };

  // Hook trade income events to play coins sfx
  const _origUpdateTradeRoutes = window.updateTradeRoutes;
  window.updateTradeRoutes = function(dt) {
    // Only trigger coins SFX if state changes (income event)
    let oldGold = state.gold || 0;
    let result = _origUpdateTradeRoutes.call(this, dt);
    let newGold = state.gold || 0;

    if (newGold > oldGold && snd) {
      snd.playSFX('coin_clink');
    }
    return result;
  };

  // Hook unlockAchievement() to play victory fanfare
  const _origUnlockAchievement = window.unlockAchievement;
  if (typeof _origUnlockAchievement === 'function') {
    window.unlockAchievement = function(key) {
      if (snd) snd.playSFX('achievement');
      return _origUnlockAchievement.call(this, key);
    };
  }

  // Hook pet interactions to play soft chime
  const _origPetInteraction = window.interactWithPet;
  if (typeof _origPetInteraction === 'function') {
    window.interactWithPet = function(pet) {
      if (snd) snd.playSFX('ding');
      return _origPetInteraction.call(this, pet);
    };
  }

  // Hook unit recruitment (legia.recruits)
  const _origRecruitUnit = window.recruitUnit;
  if (typeof _origRecruitUnit === 'function') {
    window.recruitUnit = function(count) {
      if (snd) snd.playSFX('battle_cry');
      return _origRecruitUnit.call(this, count);
    };
  }

  // ───────────────────────────────────────────────────────────────
  // MUSIC TRANSITION HOOKS
  // ───────────────────────────────────────────────────────────────

  // Hook day/night transition for smooth music crossfade
  const _origOnDayTransition = window.onDayTransition;
  window.onDayTransition = function() {
    if (snd) {
      // Fade out current music
      if (snd.fadeOutMusic) {
        snd.fadeOutMusic(500); // 500ms fade
      }
    }
    let result = _origOnDayTransition.call(this);

    if (snd) {
      // Fade in new music
      if (snd.fadeInMusic) {
        snd.fadeInMusic(500);
      }
    }
    return result;
  };

  // Hook invasion start to trigger combat music
  const _origStartInvasion = window.startInvasion;
  if (typeof _origStartInvasion === 'function') {
    window.startInvasion = function() {
      if (snd && snd.playMusic) {
        snd.playMusic('battle');
      }
      return _origStartInvasion.call(this);
    };
  }

  // Hook victory condition to play fanfare
  const _origCheckVictory = window.checkVictory;
  if (typeof _origCheckVictory === 'function') {
    window.checkVictory = function() {
      let result = _origCheckVictory.call(this);

      // If victory was just achieved
      if (result && snd) {
        snd.playMusic('victory');
        snd.playSFX('fanfare');
      }
      return result;
    };
  }

  // ───────────────────────────────────────────────────────────────
  // INITIALIZATION & CLEANUP
  // ───────────────────────────────────────────────────────────────

  // Initialize ambient hooks after sound system is ready
  window._initCycle5SoundHooks = function() {
    if (typeof snd === 'undefined' || !snd) {
      // Sound system not ready, retry in 500ms
      setTimeout(window._initCycle5SoundHooks, 500);
      return;
    }

    if (!ambientHooks) {
      ambientHooks = new AmbientSoundHooks();
      console.log('[Cycle5 Sound Hooks] Ambient sound manager initialized');
    }
  };

  // Hook into game's update loop
  window._updateCycle5SoundHooks = function(dt) {
    if (ambientHooks) {
      ambientHooks.update(dt);
    }
  };

  // Call init on script load
  window._initCycle5SoundHooks();

  // ───────────────────────────────────────────────────────────────
  // PUBLIC API (for debugging/testing)
  // ───────────────────────────────────────────────────────────────

  window.Cycle5SoundHooks = {
    isOceanActive: () => ambientHooks ? ambientHooks._oceanActive : false,
    isMarketActive: () => ambientHooks ? ambientHooks._marketActive : false,
    isCampfireActive: () => ambientHooks ? ambientHooks._campfireActive : false,
    isWindActive: () => ambientHooks ? ambientHooks._windActive : false,
    toggle: (slot) => {
      if (!ambientHooks) return;
      switch(slot) {
        case 'ocean': ambientHooks._oceanActive = !ambientHooks._oceanActive; break;
        case 'market': ambientHooks._marketActive = !ambientHooks._marketActive; break;
        case 'campfire': ambientHooks._campfireActive = !ambientHooks._campfireActive; break;
        case 'wind': ambientHooks._windActive = !ambientHooks._windActive; break;
      }
    }
  };

})();
