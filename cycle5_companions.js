// ═══════════════════════════════════════════════════════════════════════════
// CYCLE5 COMPANIONS — Enhanced Pet System
// Pet following, idle animations, buff display, interaction
// IIFE Pattern
// ═══════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─── PET TYPE DEFINITIONS ──────────────────────────────────────────────────
  const PET_TYPES = {
    cat: {
      name: 'Cat',
      speed: 2.2,
      distance: 35,
      buff: { type: 'fishing', value: 0.05, label: '+5% Fishing Luck' },
      size: 8,
    },
    dog: {
      name: 'Dog',
      speed: 2.5,
      distance: 40,
      buff: { type: 'exploration', value: 0.10, label: '+10% Exploration Speed' },
      size: 12,
    },
    hawk: {
      name: 'Hawk',
      speed: 3.5,
      distance: 60,
      buff: { type: 'vision', value: 0.15, label: '+15% Vision Range' },
      size: 10,
    },
    wolf: {
      name: 'Wolf',
      speed: 2.8,
      distance: 45,
      buff: { type: 'combat', value: 0.10, label: '+10% Combat Damage' },
      size: 14,
    },
  };

  // ─── PET STATE MANAGEMENT ──────────────────────────────────────────────────
  function initializePetSystem() {
    if (!state.petSystem) {
      state.petSystem = {
        activePet: null,        // 'cat' | 'dog' | 'hawk' | 'wolf' | null
        petData: {},            // per-pet state: { position, animation, bond }
        lastInteractionTime: 0, // frameCount of last P press
        interactionCooldown: 30, // frames between interactions
      };

      // Initialize data for each pet type
      Object.keys(PET_TYPES).forEach(petType => {
        state.petSystem.petData[petType] = {
          x: state.player.x,
          y: state.player.y,
          vx: 0,
          vy: 0,
          bond: 0,              // 0-100, increases with interaction
          animFrame: 0,
          animTimer: 0,
          idleState: 'sit',     // sit | look | walk
          idleTimer: 0,
          tailWag: 0,           // for dog
          hawkPhase: 0,         // for hawk circling
          wolfProwl: 0,         // for wolf prowling
        };
      });
    }
  }

  // ─── UPDATE PET FOLLOWING & ANIMATION ──────────────────────────────────────
  function updatePetSystem(dt) {
    initializePetSystem();

    if (!state.petSystem.activePet || state.rowing.active) {
      return; // No active pet, or player is rowing (pet stays behind)
    }

    const petType = state.petSystem.activePet;
    const petDef = PET_TYPES[petType];
    const petData = state.petSystem.petData[petType];
    const player = state.player;

    if (!petDef || !petData) return;

    // Calculate distance to player
    const dx = player.x - petData.x;
    const dy = player.y - petData.y;
    const dist = sqrt(dx * dx + dy * dy);

    const targetDist = petDef.distance;
    const speed = petDef.speed;

    // Pet follows if too far away
    if (dist > targetDist) {
      const moveSpeed = speed * 1.0;
      if (dist > 0) {
        petData.vx = (dx / dist) * moveSpeed;
        petData.vy = (dy / dist) * moveSpeed;
      }
    } else {
      // Slow lerp to maintain distance, with wiggle
      petData.vx *= 0.85;
      petData.vy *= 0.85;

      // Idle animations
      updatePetIdleAnimation(petData, petType, dt);
    }

    // Update position with easing
    const newX = petData.x + petData.vx * dt;
    const newY = petData.y + petData.vy * dt;

    // Keep on island
    if (isWalkable(newX, newY)) {
      petData.x = newX;
      petData.y = newY;
    }

    // Friction
    petData.vx *= 0.8;
    petData.vy *= 0.8;

    // Update type-specific animation values
    if (petType === 'dog') {
      petData.tailWag = sin(frameCount * 0.15) * 3;
    } else if (petType === 'hawk') {
      petData.hawkPhase += 0.02;
    } else if (petType === 'wolf') {
      petData.wolfProwl += 0.01;
    }
  }

  function updatePetIdleAnimation(petData, petType, dt) {
    petData.idleTimer -= dt;
    if (petData.idleTimer <= 0) {
      // Cycle through idle states
      const states = ['sit', 'look', 'sit'];
      const currentIndex = states.indexOf(petData.idleState);
      const nextIndex = (currentIndex + 1) % states.length;
      petData.idleState = states[nextIndex];
      petData.idleTimer = random(60, 150);
    }

    // Animation frame
    petData.animTimer += dt;
    if (petData.animTimer > 8) {
      petData.animFrame = (petData.animFrame + 1) % 4;
      petData.animTimer = 0;
    }
  }

  // ─── RENDER PET ────────────────────────────────────────────────────────────
  function drawActivePet() {
    initializePetSystem();

    if (!state.petSystem.activePet) return;

    const petType = state.petSystem.activePet;
    const petDef = PET_TYPES[petType];
    const petData = state.petSystem.petData[petType];

    if (!petDef || !petData) return;

    const sx = w2sX(petData.x);
    const sy = w2sY(petData.y);
    const size = petDef.size;

    push();
    translate(sx, sy);

    // Bob animation
    const bob = sin(frameCount * 0.08) * 2;
    translate(0, bob);

    noStroke();

    switch (petType) {
      case 'cat':
        drawCatPet(size, petData);
        break;
      case 'dog':
        drawDogPet(size, petData);
        break;
      case 'hawk':
        drawHawkPet(size, petData);
        break;
      case 'wolf':
        drawWolfPet(size, petData);
        break;
    }

    // Draw pet buff icon above pet
    drawPetBuffIcon(petDef, size);

    // Draw bond indicator
    drawBondIndicator(petData.bond, size);

    pop();
  }

  function drawCatPet(size, petData) {
    // Body
    fill(180, 140, 100);
    rect(-size / 2, -size / 4, size, size * 0.6);

    // Head
    fill(190, 150, 110);
    arc(size / 3, -size / 3, size * 0.7, size * 0.7, PI, TWO_PI);

    // Ears
    fill(180, 140, 100);
    triangle(size / 6, -size * 0.6, size / 4, -size * 0.9, size / 3, -size * 0.6);
    triangle(size * 0.4, -size * 0.6, size * 0.5, -size * 0.9, size * 0.6, -size * 0.6);

    // Eyes
    fill(50, 200, 100);
    ellipse(size / 5, -size / 3, 2, 3);
    ellipse(size / 2, -size / 3, 2, 3);

    // Purr animation
    if (petData.idleState === 'sit') {
      fill(255, 255, 0, 80);
      arc(size / 3, -size / 4, size * 0.4, size * 0.3, 0, PI);
    }
  }

  function drawDogPet(size, petData) {
    // Body
    fill(139, 90, 50);
    ellipse(0, 0, size * 1.2, size * 0.7);

    // Head
    fill(150, 100, 60);
    arc(size * 0.4, -size * 0.3, size * 0.8, size * 0.8, PI, TWO_PI);

    // Ears
    fill(130, 80, 40);
    triangle(size * 0.1, -size * 0.5, size * 0.05, -size * 0.95, size * 0.25, -size * 0.6);
    triangle(size * 0.65, -size * 0.5, size * 0.75, -size * 0.95, size * 0.55, -size * 0.6);

    // Eyes
    fill(0, 0, 0);
    ellipse(size * 0.25, -size * 0.25, 2, 2);
    ellipse(size * 0.5, -size * 0.25, 2, 2);

    // Tongue
    if (petData.idleState === 'look') {
      fill(255, 100, 120);
      ellipse(size * 0.35, -size * 0.05, 3, 4);
    }

    // Tail (wags)
    const tailWag = petData.tailWag || 0;
    stroke(120, 70, 30);
    strokeWeight(2);
    noFill();
    arc(-size * 0.5, 0, size * 0.4, size * 0.4, -PI / 4 + tailWag * 0.1, PI / 4 + tailWag * 0.1);
  }

  function drawHawkPet(size, petData) {
    // Offset for circling
    const circleOffset = sin(petData.hawkPhase) * size * 0.3;
    translate(circleOffset, cos(petData.hawkPhase) * size * 0.2);

    // Body
    fill(120, 90, 60);
    ellipse(0, 0, size * 0.6, size * 0.8);

    // Head
    fill(140, 110, 80);
    ellipse(0, -size * 0.4, size * 0.5, size * 0.5);

    // Eye
    fill(255, 200, 0);
    ellipse(size * 0.15, -size * 0.4, 2, 2);

    // Beak
    fill(200, 150, 50);
    triangle(size * 0.2, -size * 0.35, size * 0.4, -size * 0.35, size * 0.25, -size * 0.25);

    // Wings
    fill(100, 70, 40);
    arc(-size * 0.2, 0, size * 0.6, size * 0.5, -PI / 2, PI / 2);
    arc(size * 0.2, 0, size * 0.6, size * 0.5, PI / 2, PI * 1.5);
  }

  function drawWolfPet(size, petData) {
    // Body
    fill(80, 80, 90);
    ellipse(0, 0, size * 1.3, size * 0.8);

    // Head
    fill(90, 90, 100);
    arc(size * 0.4, -size * 0.3, size * 0.9, size * 0.8, PI, TWO_PI);

    // Ears (pointed)
    fill(70, 70, 80);
    triangle(size * 0.15, -size * 0.6, size * 0.05, -size * 1.0, size * 0.35, -size * 0.65);
    triangle(size * 0.65, -size * 0.6, size * 0.8, -size * 1.0, size * 0.55, -size * 0.65);

    // Eyes (amber)
    fill(255, 200, 0);
    ellipse(size * 0.25, -size * 0.25, 2.5, 2.5);
    ellipse(size * 0.5, -size * 0.25, 2.5, 2.5);

    // Snout
    fill(100, 100, 110);
    ellipse(size * 0.4, -size * 0.1, size * 0.3, size * 0.2);

    // Tail (prowling)
    stroke(80, 80, 90);
    strokeWeight(2.5);
    noFill();
    const tailCurve = cos(petData.wolfProwl) * size * 0.2;
    arc(-size * 0.6, size * 0.1, size * 0.5, size * 0.4, -PI / 3, PI / 3);
  }

  function drawPetBuffIcon(petDef, size) {
    const buff = petDef.buff;
    const iconSize = size * 0.5;

    push();
    translate(0, -size - 10);

    // Background circle
    fill(0, 0, 0, 100);
    ellipse(0, 0, iconSize + 4, iconSize + 4);

    // Buff icon color based on type
    let iconColor;
    switch (buff.type) {
      case 'fishing':
        iconColor = [100, 150, 200];
        break;
      case 'exploration':
        iconColor = [200, 150, 100];
        break;
      case 'vision':
        iconColor = [200, 100, 200];
        break;
      case 'combat':
        iconColor = [200, 100, 100];
        break;
      default:
        iconColor = [150, 150, 150];
    }

    fill(...iconColor);
    ellipse(0, 0, iconSize, iconSize);

    // Glow
    fill(...iconColor, 60);
    ellipse(0, 0, iconSize + 8, iconSize + 8);

    pop();
  }

  function drawBondIndicator(bond, size) {
    if (bond <= 0) return;

    const bondPercent = min(100, bond) / 100;
    const barWidth = size * 0.8;
    const barHeight = 2;

    push();
    translate(0, size + 2);

    // Background
    fill(50, 50, 50, 150);
    rect(-barWidth / 2, -barHeight / 2, barWidth, barHeight);

    // Bond fill (red to gold gradient)
    const r = 255;
    const g = floor(100 + 155 * bondPercent);
    const b = 100;
    fill(r, g, b);
    rect(-barWidth / 2, -barHeight / 2, barWidth * bondPercent, barHeight);

    pop();
  }

  // ─── PET INTERACTION ────────────────────────────────────────────────────────
  function handlePetInteraction() {
    initializePetSystem();

    if (!state.petSystem.activePet) return;

    // Cooldown check
    if (frameCount - state.petSystem.lastInteractionTime < state.petSystem.interactionCooldown) {
      return;
    }

    const petType = state.petSystem.activePet;
    const petData = state.petSystem.petData[petType];

    // Check if player is close enough to pet
    const dx = state.player.x - petData.x;
    const dy = state.player.y - petData.y;
    const dist = sqrt(dx * dx + dy * dy);

    if (dist > 60) return; // Too far

    // Increase bond
    petData.bond = min(100, petData.bond + 10);
    state.petSystem.lastInteractionTime = frameCount;

    // Heart particle effect
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: petData.x + random(-5, 5),
        y: petData.y - 15 + random(-5, 5),
        vx: random(-0.8, 0.8),
        vy: random(-1.0, -0.3),
        life: 50,
        maxLife: 50,
        type: 'heart',
        size: 4,
        r: 255,
        g: 100,
        b: 120,
        world: true,
      });
    }

    if (snd) snd.playSFX('build'); // Use build sound for interaction
    addFloatingText(w2sX(petData.x), w2sY(petData.y) - 25, '❤ Bond +10', color(255, 150, 150));
  }

  // ─── ACTIVATE PET BY TYPE ──────────────────────────────────────────────────
  function activatePet(petType) {
    initializePetSystem();

    if (!PET_TYPES[petType]) {
      console.warn('[Pet] Unknown pet type: ' + petType);
      return;
    }

    state.petSystem.activePet = petType;
    const petData = state.petSystem.petData[petType];

    // Position pet near player
    petData.x = state.player.x + random(-20, 20);
    petData.y = state.player.y + random(-20, 20);
    petData.vx = 0;
    petData.vy = 0;
  }

  function deactivatePet() {
    initializePetSystem();
    state.petSystem.activePet = null;
  }

  // ─── HOOK INTO KEYPRESS ────────────────────────────────────────────────────
  const _orig_keyPressed = typeof window.keyPressed_custom !== 'undefined' ? window.keyPressed_custom : null;
  window.keyPressed_custom = function() {
    // P key for pet interaction
    if (key && key.toUpperCase() === 'P') {
      handlePetInteraction();
    }

    if (_orig_keyPressed) {
      return _orig_keyPressed();
    }
  };

  // ─── EXPORTS (attach to window for global access) ────────────────────────
  window.PET_TYPES = PET_TYPES;
  window.updatePetSystem = updatePetSystem;
  window.drawActivePet = drawActivePet;
  window.initializePetSystem = initializePetSystem;
  window.activatePet = activatePet;
  window.deactivatePet = deactivatePet;
  window.handlePetInteraction = handlePetInteraction;

})();
