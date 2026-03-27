// ═══════════════════════════════════════════════════════════════════════════
// PETS & COMPANIONS — Animated, aesthetic faction pets
// Each pet has idle breathing, walk cycles, blinking, and environmental FX
// ═══════════════════════════════════════════════════════════════════════════

const PET_DATA = {
  eagle:      { name: 'Imperial Eagle', faction: 'rome',      bonus: 'scout',    bonusVal: 0.1, land: true,  sea: true,  desc: '+10% scouting range' },
  lion_cub:   { name: 'Lion Cub',       faction: 'carthage',  bonus: 'morale',   bonusVal: 0.1, land: true,  sea: false, desc: '+10% morale' },
  cat:        { name: 'Temple Cat',     faction: 'egypt',     bonus: 'fishing',  bonusVal: 0.1, land: true,  sea: false, desc: '+10% fishing' },
  dolphin:    { name: 'Sacred Dolphin', faction: 'greece',    bonus: 'speed',    bonusVal: 0.1, land: false, sea: true,  desc: '+10% ship speed' },
  horse:      { name: 'War Horse',      faction: 'persia',    bonus: 'cavalry',  bonusVal: 0.1, land: true,  sea: false, desc: '+10% cavalry' },
  wolf:       { name: 'Spirit Wolf',    faction: 'gaul',      bonus: 'combat',   bonusVal: 0.1, land: true,  sea: false, desc: '+10% combat' },
  falcon:     { name: 'Trade Falcon',   faction: 'phoenicia', bonus: 'trade',    bonusVal: 0.1, land: true,  sea: true,  desc: '+10% trade' },
  serpent:    { name: 'Sea Serpent',     faction: 'seapeople', bonus: 'naval',    bonusVal: 0.2, land: false, sea: true,  desc: '+20% naval combat' },
  crab:       { name: 'Ancient Crab',   faction: 'seapeople', bonus: 'defense',  bonusVal: 0.1, land: true,  sea: false, desc: '+10% defense' },
  monkey:     { name: 'Punic Monkey',   faction: 'carthage',  bonus: 'gather',   bonusVal: 0.1, land: true,  sea: false, desc: '+10% gathering' },
  owl:        { name: 'Wisdom Owl',     faction: 'greece',    bonus: 'research', bonusVal: 0.1, land: true,  sea: false, desc: '+10% research' },
  boar:       { name: 'War Boar',       faction: 'gaul',      bonus: 'charge',   bonusVal: 0.15,land: true,  sea: false, desc: '+15% charge dmg' },
  parrot:     { name: 'Trade Parrot',   faction: 'phoenicia', bonus: 'barter',   bonusVal: 0.1, land: true,  sea: true,  desc: '+10% barter' }
};

// Pet animation state (persists across frames)
let _petAnim = {
  blinkTimer: 0, blinkDur: 0, isBlinking: false,
  tailPhase: 0, breathPhase: 0, walkPhase: 0,
  pawPhase: 0, earTwitch: 0
};

function initPets() {
  if (!state._pets) state._pets = [];
  if (!state._activePet) state._activePet = null;
}

function hasPet(key) {
  initPets();
  return state._pets.includes(key);
}

function acquirePet(key) {
  initPets();
  if (hasPet(key)) return false;
  let pet = PET_DATA[key];
  if (!pet) return false;
  state._pets.push(key);
  if (!state._activePet) state._activePet = key;
  if (typeof addNotification === 'function') addNotification('New pet: ' + pet.name + '! ' + pet.desc, '#ffdd44');
  return true;
}

function setActivePet(key) {
  if (!hasPet(key)) return;
  state._activePet = key;
}

function getPetBonus(bonusType) {
  initPets();
  if (!state._activePet) return 0;
  let pet = PET_DATA[state._activePet];
  if (!pet || pet.bonus !== bonusType) return 0;
  return pet.bonusVal;
}

function updatePet(dt) {
  initPets();
  if (!state._activePet) return;
  // Auto-discover faction pet when visiting capital
  if (state._activeNation && !hasPet(getFactionPetKey(state._activeNation))) {
    let pk = getFactionPetKey(state._activeNation);
    if (pk && Math.random() < 0.002) acquirePet(pk);
  }
  // Advance animation timers
  _petAnim.breathPhase += dt * 0.04;
  _petAnim.tailPhase += dt * 0.06;
  _petAnim.walkPhase += dt * 0.08;
  _petAnim.pawPhase += dt * 0.05;
  _petAnim.blinkTimer -= dt;
  if (_petAnim.blinkTimer <= 0) {
    _petAnim.isBlinking = true;
    _petAnim.blinkDur = 6;
    _petAnim.blinkTimer = 120 + Math.random() * 180; // blink every 2-5s
  }
  if (_petAnim.isBlinking) {
    _petAnim.blinkDur -= dt;
    if (_petAnim.blinkDur <= 0) _petAnim.isBlinking = false;
  }
  if (Math.random() < 0.005) _petAnim.earTwitch = 8;
  if (_petAnim.earTwitch > 0) _petAnim.earTwitch -= dt;
}

function getFactionPetKey(faction) {
  for (let k in PET_DATA) {
    if (PET_DATA[k].faction === faction) return k;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED PET DRAWING — used everywhere (overworld, temple, castrum, deck)
// ═══════════════════════════════════════════════════════════════════════════

// Main outdoor draw (follows player)
function drawPet() {
  initPets();
  if (!state._activePet) return;
  let pet = PET_DATA[state._activePet];
  if (!pet) return;
  let isOnSea = state.rowing && state.rowing.active;
  if (isOnSea && !pet.sea) return;
  if (!isOnSea && !pet.land) return;
  let px = typeof w2sX === 'function' ? w2sX(state.player.x) : state.player.x;
  let py = typeof w2sY === 'function' ? w2sY(state.player.y) : state.player.y;
  push(); noStroke();
  _drawAnimatedPet(state._activePet, px + 18, py + 6, 1.0, state.player.moving);
  pop();
}

// Draw a specific pet type at screen coordinates (reusable for all interiors)
// key: pet key from PET_DATA or temple hall pet name
// sx, sy: screen coords  |  sc: scale  |  moving: whether to play walk anim
function _drawAnimatedPet(key, sx, sy, sc, moving) {
  let t = typeof frameCount !== 'undefined' ? frameCount : 0;
  let breathY = sin(_petAnim.breathPhase) * 0.8 * sc;
  let blink = _petAnim.isBlinking;
  sc = sc || 1.0;

  push();
  translate(sx, sy + breathY);
  scale(sc);

  switch(key) {
    // ─── EAGLE (Rome) — soaring with detailed feathers ─────────────────
    case 'eagle': {
      let wingAng = sin(t * 0.08) * 0.4;
      let glide = sin(t * 0.02) * 3;
      translate(cos(t * 0.025) * 20, -35 + sin(t * 0.04) * 6);
      // Shadow on ground
      fill(0, 0, 0, 20); noStroke();
      ellipse(0, 38 - sin(t * 0.04) * 6, 16, 4);
      // Body
      fill(100, 65, 25);
      ellipse(0, 0, 12, 6);
      // Head
      fill(235, 225, 200); // white head
      ellipse(5, -2, 6, 5);
      // Beak
      fill(220, 170, 40);
      triangle(8, -2, 11, -1, 8, 0);
      // Eye
      fill(blink ? 100 : 30, blink ? 60 : 20, 10);
      circle(6.5, -2.5, blink ? 0.5 : 1.5);
      // Wings
      push(); translate(-2, 0); rotate(wingAng);
      fill(80, 55, 22);
      beginShape();
      vertex(0, 0); vertex(-12, -4); vertex(-14, -2); vertex(-11, 1); vertex(-6, 2);
      endShape(CLOSE);
      // Feather tips
      fill(60, 40, 15);
      triangle(-11, -3, -15, -5, -13, -1);
      triangle(-9, -2, -13, -3, -11, 0);
      pop();
      push(); translate(-2, 0); rotate(-wingAng);
      fill(80, 55, 22);
      beginShape();
      vertex(0, 0); vertex(-12, 4); vertex(-14, 2); vertex(-11, -1); vertex(-6, -2);
      endShape(CLOSE);
      fill(60, 40, 15);
      triangle(-11, 3, -15, 5, -13, 1);
      pop();
      // Tail feathers
      fill(70, 45, 18);
      triangle(-6, 0, -10, 2, -9, -2);
      triangle(-6, 0, -11, 1, -10, -1);
      break;
    }

    // ─── FALCON (Phoenicia) — sleek diving bird ────────────────────────
    case 'falcon': {
      let wingF = sin(t * 0.1) * 0.5;
      translate(cos(t * 0.03) * 18, -30 + sin(t * 0.05) * 5);
      fill(0, 0, 0, 15); noStroke();
      ellipse(0, 33, 12, 3);
      fill(85, 65, 50);
      ellipse(0, 0, 10, 5); // body
      fill(60, 45, 35);
      ellipse(4, -1.5, 5, 4); // head
      fill(40, 30, 25); // dark hood markings
      arc(4, -2, 5, 3, PI, TWO_PI);
      fill(220, 170, 40);
      triangle(7, -1.5, 9.5, -1, 7, -0.5); // beak
      fill(blink ? 60 : 15);
      circle(5, -2, blink ? 0.4 : 1.2);
      // Wings (swept back)
      push(); rotate(wingF);
      fill(75, 55, 40);
      beginShape(); vertex(0, 0); vertex(-10, -3); vertex(-12, -1); vertex(-8, 1); endShape(CLOSE);
      pop();
      push(); rotate(-wingF);
      fill(75, 55, 40);
      beginShape(); vertex(0, 0); vertex(-10, 3); vertex(-12, 1); vertex(-8, -1); endShape(CLOSE);
      pop();
      break;
    }

    // ─── WOLF (Gaul) — detailed with fur texture ───────────────────────
    case 'wolf': {
      let legPhase = moving ? sin(_petAnim.walkPhase) * 3 : 0;
      let tailWag = sin(_petAnim.tailPhase) * (moving ? 0.4 : 0.15);
      // Shadow
      fill(0, 0, 0, 15); ellipse(0, 5, 14, 4);
      // Tail
      push(); translate(-7, -1); rotate(tailWag - 0.3);
      noFill(); stroke(100, 95, 88); strokeWeight(2);
      bezier(0, 0, -3, -4, -5, -6, -3, -9);
      noStroke();
      fill(110, 105, 95); circle(-3, -9, 2.5);
      pop();
      // Back legs
      fill(85, 80, 72);
      rect(-4, 2 - legPhase, 2.5, 5, 1);
      rect(2, 2 + legPhase, 2.5, 5, 1);
      // Body
      fill(105, 100, 90);
      ellipse(0, 0, 14, 9);
      // Fur highlight
      fill(120, 115, 105, 120);
      ellipse(1, -1.5, 8, 4);
      // Chest/belly lighter
      fill(130, 125, 115);
      ellipse(4, 1, 5, 4);
      // Front legs
      fill(95, 90, 80);
      rect(3, 2 + legPhase, 2.5, 5, 1);
      rect(6, 2 - legPhase, 2.5, 5, 1);
      // Paws
      fill(80, 75, 65);
      ellipse(4.2, 7 + legPhase, 3, 2);
      ellipse(7.2, 7 - legPhase, 3, 2);
      // Head
      fill(110, 105, 95);
      ellipse(8, -2, 8, 7);
      // Snout
      fill(120, 115, 105);
      ellipse(11, -1, 5, 3.5);
      fill(30, 25, 20);
      circle(12.5, -1.5, 1.5); // nose
      // Eyes
      fill(blink ? 90 : 180, blink ? 80 : 160, blink ? 70 : 40);
      ellipse(8.5, -3.5, blink ? 2 : 2.5, blink ? 0.5 : 2);
      if (!blink) { fill(30); circle(8.5, -3.5, 1); }
      // Ears
      let earT = _petAnim.earTwitch > 0 ? sin(_petAnim.earTwitch * 0.8) * 2 : 0;
      fill(95, 90, 80);
      triangle(6, -5, 5 + earT, -10, 8, -6);
      triangle(9, -5, 10 + earT, -10, 11, -5);
      // Inner ear
      fill(140, 110, 90);
      triangle(6.5, -5.5, 5.8 + earT, -8.5, 7.5, -6);
      triangle(9.3, -5.2, 10.2 + earT, -8.5, 10.5, -5.3);
      break;
    }

    // ─── LION CUB (Carthage) — playful with mane tuft ──────────────────
    case 'lion_cub': {
      let legP = moving ? sin(_petAnim.walkPhase) * 2.5 : 0;
      let tailSwish = sin(_petAnim.tailPhase * 1.2) * 0.5;
      fill(0, 0, 0, 12); ellipse(0, 6, 14, 4);
      // Tail
      push(); translate(-7, 0); rotate(tailSwish);
      noFill(); stroke(190, 155, 85); strokeWeight(1.5);
      bezier(0, 0, -4, -2, -7, 1, -6, -5);
      noStroke(); fill(170, 130, 60); circle(-6, -5, 2.5);
      pop();
      // Body
      fill(195, 160, 90);
      ellipse(0, 0, 13, 8);
      fill(210, 175, 105, 100);
      ellipse(1, -1, 8, 4); // belly highlight
      // Legs
      fill(180, 145, 80);
      rect(-3, 2 - legP, 2.5, 4.5, 1); rect(1, 2 + legP, 2.5, 4.5, 1);
      rect(4, 2 - legP, 2.5, 4.5, 1);
      fill(165, 130, 70);
      ellipse(-1.8, 6.5 - legP, 3, 1.8); ellipse(5.2, 6.5 - legP, 3, 1.8);
      // Head
      fill(200, 165, 95);
      ellipse(7, -1, 8, 7);
      // Baby mane tuft
      fill(175, 135, 65);
      for (let m = 0; m < 5; m++) {
        let ang = -PI * 0.7 + m * 0.35;
        let mx = 7 + cos(ang) * 5, my = -1 + sin(ang) * 4.5;
        ellipse(mx, my, 2.5, 3.5);
      }
      // Face
      fill(215, 185, 120);
      ellipse(9.5, 0, 4, 3); // muzzle
      fill(50, 35, 20);
      circle(10.5, -0.5, 1.5); // nose
      // Eyes
      fill(blink ? 170 : 80, blink ? 140 : 55, blink ? 80 : 20);
      ellipse(7.5, -2.5, blink ? 2 : 2.5, blink ? 0.5 : 2.2);
      if (!blink) { fill(30); circle(7.5, -2.5, 1); fill(255, 255, 255, 180); circle(7, -3, 0.5); }
      // Ears
      fill(190, 155, 85);
      ellipse(5, -5.5, 3.5, 4); ellipse(9, -5.5, 3.5, 4);
      fill(160, 110, 80);
      ellipse(5, -5, 2, 2.5); ellipse(9, -5, 2, 2.5);
      break;
    }

    // ─── CAT (Egypt) — sleek temple cat with markings ──────────────────
    case 'cat': {
      let tailCurl = sin(_petAnim.tailPhase * 0.8) * 0.3;
      let legC = moving ? sin(_petAnim.walkPhase * 1.1) * 2 : 0;
      fill(0, 0, 0, 12); ellipse(0, 5, 10, 3);
      // Tail
      push(); translate(-6, -1); rotate(tailCurl);
      noFill(); stroke(55, 50, 42); strokeWeight(1.5);
      bezier(0, 0, -5, -3, -8, -1, -9, -6);
      noStroke(); fill(55, 50, 42); circle(-9, -6, 1.5);
      pop();
      // Body
      fill(65, 58, 48);
      ellipse(0, 0, 11, 7);
      // Belly (lighter)
      fill(80, 72, 58, 100);
      ellipse(0, 1, 6, 3);
      // Legs
      fill(58, 52, 42);
      rect(-2, 2 - legC, 2, 4, 1); rect(1, 2 + legC, 2, 4, 1);
      rect(3, 2 - legC, 2, 4, 1);
      fill(50, 44, 36);
      ellipse(-1, 6 - legC, 2.5, 1.5); ellipse(4, 6 - legC, 2.5, 1.5);
      // Head
      fill(68, 62, 50);
      ellipse(6, -2, 7, 6);
      // Egyptian eye markings (kohl lines)
      stroke(30, 25, 18); strokeWeight(0.5);
      line(4.5, -2, 3, -1.5); line(8, -2, 9.5, -1.5);
      noStroke();
      // Eyes (golden Egyptian cat eyes)
      fill(blink ? 60 : 200, blink ? 55 : 175, blink ? 45 : 40);
      ellipse(5, -2.5, blink ? 2 : 2.5, blink ? 0.3 : 2);
      ellipse(7.5, -2.5, blink ? 2 : 2.5, blink ? 0.3 : 2);
      if (!blink) {
        fill(20); // vertical slit pupils
        ellipse(5, -2.5, 0.6, 1.8); ellipse(7.5, -2.5, 0.6, 1.8);
        fill(200, 175, 40, 60); circle(5.3, -2.8, 0.4); circle(7.8, -2.8, 0.4);
      }
      // Nose
      fill(180, 130, 110);
      triangle(6, -1, 6.5, -0.3, 6.8, -1);
      // Ears (tall pointed)
      fill(65, 58, 48);
      triangle(3.5, -4, 2.5, -9, 5.5, -5);
      triangle(8, -4, 9.5, -9, 7, -5);
      fill(140, 110, 90);
      triangle(3.8, -4.5, 3, -7.5, 5, -5);
      triangle(7.8, -4.5, 9, -7.5, 7.3, -5);
      // Whiskers
      stroke(120, 110, 90, 120); strokeWeight(0.3);
      line(3.5, -1, 0, -2); line(3.5, -0.5, 0, 0);
      line(9, -1, 12, -2); line(9, -0.5, 12, 0);
      noStroke();
      break;
    }

    // ─── OWL (Greece) — wise perching owl with head rotation ───────────
    case 'owl': {
      let headTilt = sin(t * 0.015) * 0.15;
      let bodyBob = sin(_petAnim.breathPhase * 0.7) * 0.5;
      fill(0, 0, 0, 12); ellipse(0, 7, 10, 3);
      // Talons
      fill(140, 120, 70);
      rect(-2, 4, 1.5, 3); rect(1, 4, 1.5, 3);
      fill(120, 100, 55);
      ellipse(-1.5, 7, 3, 1.5); ellipse(1.5, 7, 3, 1.5);
      // Body
      fill(150, 130, 95);
      ellipse(0, 0 + bodyBob, 10, 12);
      // Chest feather pattern (V marks)
      fill(170, 150, 110);
      for (let fy = -2; fy < 4; fy += 2.5) {
        for (let fx = -2; fx < 3; fx += 2.5) {
          triangle(fx, fy + bodyBob, fx - 0.8, fy + 1.5 + bodyBob, fx + 0.8, fy + 1.5 + bodyBob);
        }
      }
      // Wings (folded)
      fill(135, 115, 80);
      ellipse(-5, 1 + bodyBob, 4, 8);
      ellipse(5, 1 + bodyBob, 4, 8);
      // Head
      push(); translate(0, -6 + bodyBob); rotate(headTilt);
      fill(160, 140, 100);
      ellipse(0, 0, 9, 8);
      // Facial disc
      fill(180, 165, 130);
      ellipse(0, 0, 8, 7);
      // Eye rings
      fill(200, 185, 150);
      circle(-2, -0.5, 3.5); circle(2, -0.5, 3.5);
      // Eyes
      fill(blink ? 140 : 255, blink ? 120 : 200, blink ? 80 : 0);
      circle(-2, -0.5, blink ? 0.5 : 2.5);
      circle(2, -0.5, blink ? 0.5 : 2.5);
      if (!blink) { fill(20); circle(-2, -0.5, 1.2); circle(2, -0.5, 1.2); }
      // Beak
      fill(140, 110, 50);
      triangle(-0.8, 1, 0, 3, 0.8, 1);
      // Ear tufts
      let eTwitch = _petAnim.earTwitch > 0 ? sin(_petAnim.earTwitch) * 1.5 : 0;
      fill(145, 125, 85);
      triangle(-3, -3, -4 + eTwitch, -7, -1, -4);
      triangle(3, -3, 4 + eTwitch, -7, 1, -4);
      pop();
      break;
    }

    // ─── DOLPHIN (Greece) — leaping from waves ─────────────────────────
    case 'dolphin': {
      let jumpArc = sin(t * 0.05);
      let jumpY = jumpArc > 0.3 ? -(jumpArc - 0.3) * 20 : 0;
      translate(cos(t * 0.03) * 15, jumpY);
      if (jumpY < -2) {
        // Splash droplets
        fill(150, 190, 220, 80);
        for (let d = 0; d < 3; d++) {
          circle(cos(t + d * 2) * 8, 6 + d * 2, 1.5);
        }
      }
      // Body
      fill(110, 140, 165);
      beginShape();
      vertex(-8, 0); bezierVertex(-6, -4, 4, -5, 8, -1);
      bezierVertex(9, 1, 4, 4, -2, 3);
      bezierVertex(-6, 3, -9, 1, -8, 0);
      endShape(CLOSE);
      // Belly
      fill(160, 185, 205);
      ellipse(1, 1.5, 10, 3);
      // Dorsal fin
      fill(95, 120, 145);
      triangle(0, -4, 1, -8, 3, -3);
      // Tail
      fill(100, 130, 155);
      triangle(-8, 0, -13, -3, -11, 2);
      triangle(-8, 0, -13, 3, -11, -1);
      // Eye
      fill(blink ? 100 : 30);
      circle(5.5, -1.5, blink ? 0.4 : 1.2);
      // Smile
      noFill(); stroke(80, 100, 120); strokeWeight(0.4);
      arc(7, 0, 4, 2, 0, PI * 0.6);
      noStroke();
      break;
    }

    // ─── SERPENT (Sea People) — coiled sea serpent ──────────────────────
    case 'serpent': {
      let serpWave = t * 0.04;
      // Body coils
      noFill(); stroke(45, 85, 65); strokeWeight(4);
      beginShape();
      for (let s = 0; s < 8; s++) {
        let sx2 = -12 + s * 3.5;
        let sy2 = sin(serpWave + s * 0.8) * 3;
        curveVertex(sx2, sy2);
      }
      endShape();
      // Scales highlight
      stroke(65, 110, 85); strokeWeight(2.5);
      beginShape();
      for (let s = 0; s < 8; s++) {
        let sx2 = -12 + s * 3.5;
        let sy2 = sin(serpWave + s * 0.8) * 3 - 0.5;
        curveVertex(sx2, sy2);
      }
      endShape();
      noStroke();
      // Head
      fill(50, 95, 70);
      ellipse(14, sin(serpWave + 5.6) * 3, 7, 5);
      // Eyes (menacing)
      fill(blink ? 50 : 220, blink ? 80 : 200, blink ? 60 : 40);
      circle(15.5, sin(serpWave + 5.6) * 3 - 1.5, blink ? 0.3 : 1.5);
      if (!blink) { fill(20); ellipse(15.5, sin(serpWave + 5.6) * 3 - 1.5, 0.5, 1.3); }
      // Forked tongue
      if (sin(t * 0.06) > 0.7) {
        stroke(180, 50, 40); strokeWeight(0.5);
        let tx = 17.5, ty = sin(serpWave + 5.6) * 3;
        line(tx, ty, tx + 3, ty - 1); line(tx, ty, tx + 3, ty + 1);
        noStroke();
      }
      // Fin crest
      fill(40, 75, 55, 150);
      for (let f = 2; f < 7; f++) {
        let fx2 = -12 + f * 3.5;
        let fy2 = sin(serpWave + f * 0.8) * 3;
        triangle(fx2, fy2 - 2, fx2 + 1.5, fy2 - 5, fx2 + 3, fy2 - 2);
      }
      break;
    }

    // ─── CRAB (Sea People interior) — scuttling with pincers ───────────
    case 'crab': {
      let scuttle = moving ? sin(_petAnim.walkPhase * 1.5) * 2 : 0;
      let pincerSnap = sin(t * 0.04) > 0.8 ? 0.3 : 0;
      fill(0, 0, 0, 10); ellipse(0, 4, 14, 3);
      // Legs (4 per side)
      stroke(170, 65, 45); strokeWeight(1);
      for (let l = 0; l < 4; l++) {
        let lOff = sin(_petAnim.walkPhase + l * 0.8) * 1.5;
        let lx = -3 + l * 2, ly = 2;
        line(lx, ly, lx - 5, ly + 3 + lOff);
        line(lx - 5, ly + 3 + lOff, lx - 6, ly + 5 + lOff);
        line(-lx, ly, -lx + 5, ly + 3 - lOff);
        line(-lx + 5, ly + 3 - lOff, -lx + 6, ly + 5 - lOff);
      }
      noStroke();
      // Shell
      fill(195, 75, 55);
      ellipse(0, 0, 14, 9);
      // Shell pattern
      fill(215, 95, 70, 100);
      ellipse(0, -1, 9, 5);
      fill(180, 60, 40);
      ellipse(-3, 0, 3, 4); ellipse(3, 0, 3, 4);
      // Pincers
      fill(200, 80, 55);
      push(); translate(-7, -1); rotate(-0.4 - pincerSnap);
      ellipse(0, 0, 5, 3);
      rect(-4, -1, 3, 1.5); rect(-4, 0, 3, 1.5);
      pop();
      push(); translate(7, -1); rotate(0.4 + pincerSnap);
      ellipse(0, 0, 5, 3);
      rect(1, -1, 3, 1.5); rect(1, 0, 3, 1.5);
      pop();
      // Eye stalks
      fill(195, 75, 55);
      rect(-2.5, -4, 1.5, 3); rect(1, -4, 1.5, 3);
      fill(blink ? 160 : 20);
      circle(-1.8, -5, blink ? 0.8 : 1.5); circle(1.8, -5, blink ? 0.8 : 1.5);
      break;
    }

    // ─── MONKEY (Carthage temple) — playful seated monkey ──────────────
    case 'monkey': {
      let armSwing = sin(t * 0.05) * 0.3;
      fill(0, 0, 0, 10); ellipse(0, 7, 10, 3);
      // Tail (curled)
      noFill(); stroke(145, 100, 55); strokeWeight(1.5);
      bezier(-5, 2, -10, 0, -12, -5, -8, -8);
      noStroke();
      // Body
      fill(155, 108, 60);
      ellipse(0, 0, 10, 10);
      // Belly
      fill(190, 155, 110);
      ellipse(0, 1, 6, 6);
      // Arms
      push(); translate(-5, -2); rotate(armSwing);
      fill(145, 100, 55);
      rect(-1, 0, 2.5, 7, 1);
      fill(180, 140, 100);
      circle(0.3, 7, 2);
      pop();
      push(); translate(5, -2); rotate(-armSwing);
      fill(145, 100, 55);
      rect(-1, 0, 2.5, 7, 1);
      fill(180, 140, 100);
      circle(0.3, 7, 2);
      pop();
      // Head
      fill(160, 115, 65);
      ellipse(0, -7, 9, 8);
      // Face
      fill(195, 160, 120);
      ellipse(0, -6, 6.5, 5.5);
      // Eyes
      fill(blink ? 130 : 40, blink ? 95 : 25, blink ? 55 : 10);
      circle(-1.5, -7, blink ? 0.5 : 1.5);
      circle(1.5, -7, blink ? 0.5 : 1.5);
      if (!blink) { fill(255, 255, 255, 200); circle(-1.2, -7.3, 0.4); circle(1.8, -7.3, 0.4); }
      // Nose + mouth
      fill(130, 90, 55);
      ellipse(0, -5.5, 2, 1.5);
      // Ears
      fill(155, 108, 60);
      circle(-4.5, -7, 2.5); circle(4.5, -7, 2.5);
      fill(180, 140, 100);
      circle(-4.5, -7, 1.5); circle(4.5, -7, 1.5);
      break;
    }

    // ─── HORSE (Persia) — standing with mane ───────────────────────────
    case 'horse': {
      let legH = moving ? sin(_petAnim.walkPhase) * 3 : 0;
      let tailFlow = sin(_petAnim.tailPhase * 0.7) * 0.2;
      fill(0, 0, 0, 12); ellipse(0, 8, 18, 4);
      // Tail
      push(); translate(-9, -1); rotate(tailFlow);
      noFill(); stroke(80, 50, 25); strokeWeight(2);
      bezier(0, 0, -4, 2, -6, 5, -4, 9);
      noStroke();
      pop();
      // Back legs
      fill(120, 82, 45);
      rect(-5, 2 - legH, 3, 7, 1); rect(-1, 2 + legH, 3, 7, 1);
      fill(100, 65, 35);
      ellipse(-3.5, 9 - legH, 3.5, 2); ellipse(0.5, 9 + legH, 3.5, 2);
      // Body
      fill(145, 100, 55);
      ellipse(0, 0, 18, 10);
      fill(160, 115, 65, 80);
      ellipse(2, -1, 10, 5);
      // Front legs
      fill(130, 90, 50);
      rect(4, 2 + legH, 3, 7, 1); rect(8, 2 - legH, 3, 7, 1);
      fill(110, 75, 40);
      ellipse(5.5, 9 + legH, 3.5, 2); ellipse(9.5, 9 - legH, 3.5, 2);
      // Neck
      fill(140, 95, 52);
      beginShape();
      vertex(7, -2); vertex(10, -10); vertex(14, -10); vertex(11, -1);
      endShape(CLOSE);
      // Head
      fill(145, 100, 55);
      ellipse(13, -12, 6, 8);
      ellipse(15, -10, 5, 4); // muzzle
      fill(60, 40, 20);
      circle(16, -10, 1.2); // nostril
      // Eye
      fill(blink ? 120 : 50, blink ? 80 : 30, blink ? 40 : 15);
      circle(12, -12.5, blink ? 0.5 : 1.5);
      // Mane
      fill(90, 55, 25);
      for (let m2 = 0; m2 < 5; m2++) {
        let mx = 8 + m2 * 1.2, my = -4 - m2 * 2;
        ellipse(mx, my, 3, 4);
      }
      // Ears
      fill(140, 95, 52);
      triangle(11, -15, 10, -19, 13, -15);
      triangle(14, -14, 15, -18, 16, -14);
      break;
    }

    // ─── BOAR (Gaul) — stocky war boar with tusks ─────────────────────
    case 'boar': {
      let legB = moving ? sin(_petAnim.walkPhase) * 2 : 0;
      fill(0, 0, 0, 12); ellipse(0, 6, 16, 4);
      // Body
      fill(105, 75, 50);
      ellipse(0, 0, 16, 10);
      // Bristle ridge
      fill(80, 55, 35);
      for (let b = -4; b < 5; b += 2) {
        triangle(b, -4, b + 0.5, -7, b + 1, -4);
      }
      // Legs
      fill(90, 65, 42);
      rect(-4, 2 - legB, 3, 5, 1); rect(0, 2 + legB, 3, 5, 1);
      rect(3, 2 - legB, 3, 5, 1);
      // Hooves
      fill(50, 35, 20);
      rect(-3.5, 6.5 - legB, 2.5, 1.5); rect(0.5, 6.5 + legB, 2.5, 1.5);
      rect(3.5, 6.5 - legB, 2.5, 1.5);
      // Head
      fill(115, 82, 55);
      ellipse(8, -1, 9, 7);
      // Snout
      fill(130, 95, 65);
      ellipse(12, 0, 5, 4);
      fill(70, 45, 30);
      circle(13.5, -0.5, 1); circle(13.5, 0.8, 1);
      // Tusks
      fill(240, 235, 215);
      beginShape(); vertex(10, 1); vertex(9, 3.5); vertex(10.5, 2.5); endShape(CLOSE);
      beginShape(); vertex(11, 1); vertex(12, 3.5); vertex(11, 2.5); endShape(CLOSE);
      // Eye
      fill(blink ? 90 : 180, blink ? 65 : 100, blink ? 40 : 30);
      circle(7, -2.5, blink ? 0.5 : 1.5);
      if (!blink) { fill(30); circle(7, -2.5, 0.8); }
      // Ears
      fill(100, 70, 45);
      ellipse(5, -4, 3, 4); ellipse(9, -4, 3, 4);
      break;
    }

    // ─── PARROT (Phoenicia) — colorful perching bird ───────────────────
    case 'parrot': {
      let headBob = sin(t * 0.06) * 1.5;
      let wingFluff = sin(t * 0.04) * 0.5;
      fill(0, 0, 0, 10); ellipse(0, 7, 8, 3);
      // Tail feathers (long)
      fill(50, 140, 200);
      rect(-2, 3, 1.5, 8, 1);
      fill(40, 120, 180);
      rect(0, 3, 1.5, 7, 1);
      fill(200, 50, 50);
      rect(-0.5, 3, 1.5, 6, 1);
      // Feet
      fill(100, 90, 75);
      rect(-2, 4, 1.5, 2); rect(1, 4, 1.5, 2);
      // Body
      fill(55, 175, 60);
      ellipse(0, 0, 9, 10);
      // Wing
      fill(45 + wingFluff * 10, 155, 50);
      ellipse(-4, 0, 4, 7);
      fill(200, 50, 50, 120);
      ellipse(-4, -1, 3, 3);
      // Chest
      fill(255, 220, 50);
      ellipse(1, 2, 5, 4);
      // Head
      push(); translate(1, -6 + headBob);
      fill(60, 185, 65);
      ellipse(0, 0, 7, 7);
      // Eye patch (white ring)
      fill(245, 240, 230);
      circle(2, -0.5, 3);
      fill(blink ? 50 : 20);
      circle(2, -0.5, blink ? 0.3 : 1.3);
      if (!blink) { fill(50, 40, 30); circle(2, -0.5, 0.7); }
      // Beak (hooked)
      fill(40, 35, 30);
      beginShape();
      vertex(4, -1); vertex(6.5, 0); vertex(5.5, 1.5); vertex(3.5, 1);
      endShape(CLOSE);
      fill(55, 48, 38);
      line(3.5, 0.3, 6, 0.3);
      // Crown feathers
      fill(255, 60, 40);
      ellipse(-1.5, -3, 2, 3);
      fill(255, 180, 30);
      ellipse(0, -3.5, 2, 2.5);
      pop();
      break;
    }

    default:
      // Fallback: generic dot
      fill(150, 130, 100);
      circle(0, 0, 8);
      break;
  }
  pop();
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERIOR PET — for temple, castrum, below deck
// Draws the faction-appropriate pet at given screen coords
// ═══════════════════════════════════════════════════════════════════════════
function drawInteriorPet(sx, sy, faction, sc, moving) {
  // Map faction to the appropriate temple pet key
  let petMap = {
    rome: 'wolf', carthage: 'monkey', egypt: 'cat', greece: 'owl',
    seapeople: 'crab', persia: 'falcon', phoenicia: 'parrot', gaul: 'boar'
  };
  let key = petMap[faction] || 'cat';
  push(); noStroke();
  _drawAnimatedPet(key, sx, sy, sc || 1.0, moving || false);
  pop();
}
