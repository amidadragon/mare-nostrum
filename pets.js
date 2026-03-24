// ═══ PETS & COMPANIONS ═══
const PET_DATA = {
  eagle:      { name: 'Imperial Eagle', faction: 'rome',      bonus: 'scout',    bonusVal: 0.1, land: true,  sea: true,  desc: '+10% scouting range' },
  lion_cub:   { name: 'Lion Cub',       faction: 'carthage',  bonus: 'morale',   bonusVal: 0.1, land: true,  sea: false, desc: '+10% morale' },
  cat:        { name: 'Temple Cat',     faction: 'egypt',     bonus: 'fishing',  bonusVal: 0.1, land: true,  sea: false, desc: '+10% fishing' },
  dolphin:    { name: 'Sacred Dolphin', faction: 'greece',    bonus: 'speed',    bonusVal: 0.1, land: false, sea: true,  desc: '+10% ship speed' },
  horse:      { name: 'War Horse',      faction: 'persia',    bonus: 'cavalry',  bonusVal: 0.1, land: true,  sea: false, desc: '+10% cavalry' },
  wolf:       { name: 'Spirit Wolf',    faction: 'gaul',      bonus: 'combat',   bonusVal: 0.1, land: true,  sea: false, desc: '+10% combat' },
  falcon:     { name: 'Trade Falcon',   faction: 'phoenicia', bonus: 'trade',    bonusVal: 0.1, land: true,  sea: true,  desc: '+10% trade' },
  serpent:    { name: 'Sea Serpent',     faction: 'seapeople', bonus: 'naval',    bonusVal: 0.2, land: false, sea: true,  desc: '+20% naval combat' }
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
  let pet = PET_DATA[state._activePet];
  if (!pet) return;
  // Auto-discover faction pet when visiting capital
  if (state._activeNation && !hasPet(getFactionPetKey(state._activeNation))) {
    let pk = getFactionPetKey(state._activeNation);
    if (pk && Math.random() < 0.002) acquirePet(pk); // ~0.2% per frame near capital
  }
}

function getFactionPetKey(faction) {
  for (let k in PET_DATA) {
    if (PET_DATA[k].faction === faction) return k;
  }
  return null;
}

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

  push();
  noStroke();
  let t = typeof frameCount !== 'undefined' ? frameCount : 0;

  switch(state._activePet) {
    case 'eagle':
    case 'falcon':
      // Bird circling above
      let bx = px + cos(t * 0.03) * 25;
      let by = py - 40 + sin(t * 0.05) * 8;
      fill(state._activePet === 'eagle' ? color(120, 80, 30) : color(100, 90, 70));
      // Body
      ellipse(bx, by, 8, 4);
      // Wings
      let wingSpread = sin(t * 0.1) * 6;
      triangle(bx - 3, by, bx - 8 - wingSpread, by - 2, bx - 5, by + 1);
      triangle(bx + 3, by, bx + 8 + wingSpread, by - 2, bx + 5, by + 1);
      break;
    case 'lion_cub':
    case 'wolf':
      // Quadruped following
      let fx = px + 18 + sin(t * 0.02) * 4;
      let fy = py + 5;
      let fc = state._activePet === 'wolf' ? [100, 100, 105] : [180, 150, 80];
      fill(fc[0], fc[1], fc[2]);
      ellipse(fx, fy, 10, 6); // body
      ellipse(fx + 5, fy - 3, 5, 4); // head
      fill(fc[0] - 20, fc[1] - 20, fc[2] - 20);
      rect(fx - 3, fy + 2, 2, 3); rect(fx + 2, fy + 2, 2, 3); // legs
      break;
    case 'cat':
      let cx = px - 15 + sin(t * 0.015) * 3;
      let cy = py + 3;
      fill(60, 60, 55);
      ellipse(cx, cy, 7, 5);
      ellipse(cx + 3, cy - 2, 4, 3);
      // Ears
      triangle(cx + 2, cy - 4, cx + 4, cy - 6, cx + 5, cy - 3);
      triangle(cx + 1, cy - 4, cx - 1, cy - 6, cx + 0, cy - 3);
      // Tail
      noFill(); stroke(60, 60, 55); strokeWeight(1);
      bezier(cx - 3, cy, cx - 8, cy - 2, cx - 10, cy + 2, cx - 8, cy + 5);
      noStroke();
      break;
    case 'dolphin':
    case 'serpent':
      if (!isOnSea) break;
      let dx = px + cos(t * 0.04) * 30;
      let dy = py + 15 + sin(t * 0.06) * 10;
      let dc = state._activePet === 'dolphin' ? [120, 140, 160] : [40, 80, 60];
      fill(dc[0], dc[1], dc[2]);
      ellipse(dx, dy, 14, 6);
      triangle(dx + 7, dy, dx + 11, dy - 3, dx + 10, dy + 2);
      if (sin(t * 0.06) > 0.5) { // Jumping
        fill(dc[0] + 20, dc[1] + 20, dc[2] + 20);
        ellipse(dx, dy - 2, 12, 5);
      }
      break;
    case 'horse':
      let hx = px + 20;
      let hy = py;
      fill(140, 100, 60);
      ellipse(hx, hy, 14, 8);
      rect(hx + 5, hy - 6, 4, 7); // neck/head
      fill(100, 70, 40);
      rect(hx - 4, hy + 3, 2, 5); rect(hx + 3, hy + 3, 2, 5); // legs
      break;
  }
  pop();
}
