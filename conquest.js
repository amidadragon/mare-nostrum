// ═══════════════════════════════════════════════════════════════════════════
// conquest.js — Conquest / Expedition / Terra Nova system
// Extracted from sketch.js
// ═══════════════════════════════════════════════════════════════════════════

// ─── DISTANT ISLAND LABELS & ENTITIES ────────────────────────────────────

const _ARENA_REMOVED = true; // arena system removed — rebuild later

function drawConquestDistantLabel() {
  if (state.conquest.active) return;
  let c = state.conquest;
  let sx = w2sX(c.isleX);
  let sy = w2sY(c.isleY);
  let minY = max(height * 0.06, height * 0.25 - horizonOffset) + 10;
  sy = max(sy, minY);
  if (sx < -400 || sx > width + 400 || sy > height + 400) return;
  let baseY = sy + c.isleRY + 12;
  push();
  noStroke(); textAlign(CENTER);
  // Sword icon
  fill(170, 160, 130, 180); textSize(14);
  text('\u2694', sx, baseY - 2);
  // Name
  fill(170, 160, 130, 180); textSize(11); textStyle(ITALIC);
  let label = c.colonized ? 'Terra Nova (Colony LV.' + c.colonyLevel + ')' :
              c.phase === 'settled' ? 'Terra Nova (Settled)' :
              c.phase === 'unexplored' ? 'Terra Nova' : 'Terra Nova';
  text(label, sx, baseY + 12); textStyle(NORMAL);
  // Status
  let status = c.colonized ? 'Colonized' : c.phase === 'settled' ? 'Settled' : c.phase === 'unexplored' ? 'Unexplored' : 'Discovered';
  let _di = c.colonized ? '\u262E ' : '\u2694 ';
  fill(c.colonized ? color(100, 200, 100, 160) : color(200, 180, 130, 160)); textSize(9);
  text(_di + status, sx, baseY + 24);
  if (c.colonized) {
    fill(160, 200, 130, 140); textSize(9);
    text(c.colonyWorkers + ' colonists  +' + c.colonyIncome + 'g/day', sx, baseY + 34);
    if (state.imperialBridge.built) {
      fill(200, 180, 100, 120); textSize(8);
      text('BRIDGE CONNECTED', sx, baseY + 44);
    }
  } else if (c.buildings.length > 0) {
    fill(160, 150, 115, 110); textSize(9);
    text(c.buildings.length + ' buildings, ' + c.workers.length + ' workers', sx, baseY + 34);
  }
  // Distance
  if (typeof _getIslandDist === 'function') {
    let _yOff = c.colonized ? (state.imperialBridge.built ? 54 : 44) : c.buildings.length > 0 ? 44 : 34;
    let _d = _getIslandDist(c.isleX, c.isleY);
    fill(180, 170, 140, 110); textSize(8);
    text(_d, sx, baseY + _yOff);
  }
  pop();
}

function drawConquestDistantEntities() {
  // Draw persistent soldiers + workers on Terra Nova when viewing from afar
  if (state.conquest.active) return;
  let c = state.conquest;
  let items = [];
  for (let s of c.soldiers) {
    if (s.hp > 0) items.push({ y: s.y, draw: () => drawConquestSoldier(s) });
  }
  for (let w of c.workers) {
    items.push({ y: w.y, draw: () => drawConquestWorker(w) });
  }
  items.sort((a, b) => a.y - b.y);
  for (let it of items) it.draw();
}

function drawOneEnemy(e) {
  let sx = w2sX(e.x);
  let sy = w2sY(e.y);
  let dying = e.state === 'dying';
  let sc = dying ? (e.stateTimer / 20) : 1;
  let alpha = dying ? map(e.stateTimer, 0, 20, 0, 255) : 255;

  push();
  translate(sx, sy);
  scale(sc);

  let f = e.flashTimer > 0;
  let fc = f ? 255 : 0; // flash component
  // Breathing animation
  let breathe = sin(frameCount * 0.06 + e.x) * 0.5;
  // Walk bob
  let walkBob = (e.state === 'chase') ? sin(frameCount * 0.15 + e.y) * 1.5 : 0;

  switch (e.type) {
    case 'wolf': {
      let wb = floor(walkBob);
      let ef = e.facing;
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-10, 5, 22, 2);
      // Pixel hind legs
      fill(f ? 255 : 115, f ? 255 : 80, f ? 255 : 45);
      let lp = floor(sin(frameCount * 0.15) * 2);
      rect(-ef * 6 - 2, 2 + lp, 3, 6);
      rect(-ef * 2 - 2, 2 - lp, 3, 6);
      // Pixel body
      fill(f ? 255 : 130, f ? 255 : 95, f ? 255 : 55);
      rect(-10, -6 + wb, 22, 12);
      // Fur stripe
      fill(f ? 255 : 120, f ? 255 : 85, f ? 255 : 45);
      rect(-6, -4 + wb, 12, 4);
      // Pixel head
      fill(f ? 255 : 145, f ? 255 : 105, f ? 255 : 65);
      rect(ef * 6, -8 + wb, 10 * ef, 10);
      // Pixel snout
      fill(f ? 255 : 155, f ? 255 : 115, f ? 255 : 75);
      rect(ef * 14, -4 + wb, 4 * ef, 4);
      // Pixel ears
      fill(f ? 255 : 100, f ? 255 : 70, f ? 255 : 35);
      rect(ef * 8, -12 + wb, 3, 4);
      rect(ef * 12, -11 + wb, 3, 3);
      // Inner ear
      fill(f ? 255 : 160, f ? 255 : 100, f ? 255 : 80);
      rect(ef * 9, -11 + wb, 1, 2);
      // Pixel red eyes
      fill(240, 40, 30);
      rect(ef * 12, -6 + wb, 2, 2);
      fill(255, 100, 80);
      rect(ef * 12, -6 + wb, 1, 1);
      // Teeth when attacking
      if (e.state === 'attack') {
        fill(240, 235, 220);
        rect(ef * 16, -2 + wb, 2, 1);
        rect(ef * 14, 0 + wb, 2, 1);
      }
      // Pixel nose
      fill(40, 30, 20);
      rect(ef * 17, -4 + wb, 2, 2);
      // Pixel tail
      fill(f ? 255 : 120, f ? 255 : 85, f ? 255 : 45);
      let tw = floor(sin(frameCount * 0.12 + e.x) * 3);
      rect(-ef * 12, -2, 3, 2);
      rect(-ef * 14, -4 + tw, 2, 2);
      rect(-ef * 16, -6 + tw, 2, 2);
      break;
    }
    case 'bandit': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-8, 7, 16, 2);
      // Pixel legs
      fill(f ? 255 : 80, f ? 255 : 60, f ? 255 : 40);
      let bleg = floor(sin(frameCount * 0.12) * 2);
      rect(-4, 6 + bleg, 3, 7);
      rect(1, 6 - bleg, 3, 7);
      // Pixel sandals
      fill(f ? 255 : 120, f ? 255 : 90, f ? 255 : 50);
      rect(-5, 12 + bleg, 4, 2);
      rect(0, 12 - bleg, 4, 2);
      // Pixel body (ragged tunic)
      fill(f ? 255 : 105, f ? 255 : 80, f ? 255 : 55);
      rect(-8, -6 + wb, 16, 14);
      // Pixel belt
      fill(f ? 255 : 70, f ? 255 : 50, f ? 255 : 30);
      rect(-7, 3 + wb, 14, 2);
      fill(f ? 255 : 160, f ? 255 : 140, f ? 255 : 60);
      rect(-1, 3 + wb, 2, 2); // buckle
      // Pixel arm
      fill(f ? 255 : 195, f ? 255 : 165, f ? 255 : 125);
      rect(e.facing * 8, -2 + wb, 3, 6);
      // Pixel club
      fill(f ? 255 : 75, f ? 255 : 50, f ? 255 : 25);
      rect(e.facing * 9, -16 + wb, 2, 14);
      // Club head
      fill(f ? 255 : 65, f ? 255 : 42, f ? 255 : 20);
      rect(e.facing * 8, -18 + wb, 4, 4);
      // Studs
      fill(f ? 255 : 160, f ? 255 : 155, f ? 255 : 150);
      rect(e.facing * 8, -17 + wb, 1, 1);
      rect(e.facing * 10, -16 + wb, 1, 1);
      // Pixel head
      fill(f ? 255 : 210, f ? 255 : 180, f ? 255 : 140);
      rect(-5, -14 + wb, 10, 8);
      // Pixel scruffy hair
      fill(f ? 255 : 70, f ? 255 : 50, f ? 255 : 30);
      rect(-6, -16 + wb, 12, 4);
      // Pixel headband
      fill(f ? 255 : 165, f ? 255 : 35, f ? 255 : 25);
      rect(-6, -14 + wb, 12, 2);
      // Headband knot
      fill(f ? 255 : 140, f ? 255 : 25, f ? 255 : 20);
      rect(5, -15 + wb, 2, 3);
      // Pixel eyes
      fill(40);
      rect(-4, -11 + wb, 2, 2);
      rect(2, -11 + wb, 2, 2);
      // Pixel angry brows
      fill(50);
      rect(-5, -13 + wb, 3, 1);
      rect(3, -13 + wb, 3, 1);
      // Pixel scar
      fill(180, 140, 110, 150);
      rect(3, -9 + wb, 1, 3);
      break;
    }
    case 'harpy': {
      let wf = floor(sin(frameCount * 0.14) * 8);
      let hv = floor(sin(frameCount * 0.07 + e.x) * 3);
      // Pixel shadow
      fill(0, 0, 0, 25);
      rect(-8, 16, 16, 2);
      // Pixel talons
      noStroke();
      fill(f ? 255 : 180, f ? 255 : 150, f ? 255 : 60);
      rect(-4, 8 + hv, 2, 4);
      rect(-1, 8 + hv, 2, 4);
      rect(2, 8 + hv, 2, 4);
      rect(4, 8 + hv, 2, 4);
      // Pixel wings
      fill(f ? 255 : 85, f ? 255 : 125, f ? 255 : 75);
      // Left wing
      rect(-20, -8 + wf + hv, 14, 4);
      rect(-16, -4 + wf + hv, 10, 4);
      // Right wing
      rect(6, -8 + wf + hv, 14, 4);
      rect(6, -4 + wf + hv, 10, 4);
      // Inner wing
      fill(f ? 255 : 110, f ? 255 : 155, f ? 255 : 95);
      rect(-12, -4 + wf + hv, 6, 6);
      rect(6, -4 + wf + hv, 6, 6);
      // Pixel body
      fill(f ? 255 : 125, f ? 255 : 165, f ? 255 : 105);
      rect(-6, -8 + hv, 12, 16);
      // Chest pattern
      fill(f ? 255 : 140, f ? 255 : 180, f ? 255 : 120, 150);
      rect(-4, -4 + hv, 8, 10);
      // Pixel head
      fill(f ? 255 : 205, f ? 255 : 185, f ? 255 : 145);
      rect(-5, -16 + hv, 10, 8);
      // Pixel crest/hair
      fill(f ? 255 : 100, f ? 255 : 60, f ? 255 : 120);
      rect(-3, -20 + hv, 6, 4);
      rect(-1, -22 + hv, 2, 2);
      // Pixel beak
      fill(f ? 255 : 210, f ? 255 : 170, f ? 255 : 40);
      rect(e.facing * 4, -13 + hv, 4 * e.facing, 3);
      // Pixel eyes (purple)
      fill(200, 50, 200);
      rect(-4, -14 + hv, 2, 2);
      rect(2, -14 + hv, 2, 2);
      fill(255, 150, 255);
      rect(-4, -14 + hv, 1, 1);
      rect(2, -14 + hv, 1, 1);
      break;
    }
    case 'secutor': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 35);
      rect(-10, 9, 22, 2);
      // Pixel legs
      fill(f ? 255 : 130, f ? 255 : 120, f ? 255 : 100);
      let sleg = floor(sin(frameCount * 0.1) * 1.5);
      rect(-5, 6 + sleg + wb, 4, 8);
      rect(2, 6 - sleg + wb, 4, 8);
      // Pixel boots
      fill(f ? 255 : 100, f ? 255 : 80, f ? 255 : 55);
      rect(-6, 13 + sleg + wb, 5, 3);
      rect(1, 13 - sleg + wb, 5, 3);
      // Pixel body (armor)
      fill(f ? 255 : 145, f ? 255 : 135, f ? 255 : 115);
      rect(-10, -8 + wb, 20, 16);
      // Pixel chest plate
      fill(f ? 255 : 175, f ? 255 : 165, f ? 255 : 145);
      rect(-7, -6 + wb, 14, 12);
      // Cross detail
      fill(f ? 255 : 155, f ? 255 : 145, f ? 255 : 125);
      rect(-6, -1 + wb, 12, 1);
      rect(-1, -5 + wb, 1, 10);
      // Pixel rivets
      fill(f ? 255 : 190, f ? 255 : 180, f ? 255 : 160);
      rect(-5, -5 + wb, 1, 1);
      rect(4, -5 + wb, 1, 1);
      rect(-5, 4 + wb, 1, 1);
      rect(4, 4 + wb, 1, 1);
      // Pixel shield
      fill(f ? 255 : 130, f ? 255 : 120, f ? 255 : 90);
      rect(-e.facing * 14, -8 + wb, 8, 16);
      fill(f ? 255 : 155, f ? 255 : 145, f ? 255 : 115);
      rect(-e.facing * 13, -5 + wb, 6, 10);
      fill(f ? 255 : 170, f ? 255 : 160, f ? 255 : 130);
      rect(-e.facing * 12, -2 + wb, 4, 4);
      // Pixel sword arm
      fill(f ? 255 : 195, f ? 255 : 165, f ? 255 : 125);
      rect(e.facing * 9, -3 + wb, 3, 6);
      // Pixel gladius
      fill(f ? 255 : 200, f ? 255 : 200, f ? 255 : 210);
      rect(e.facing * 11, -16 + wb, 2, 14);
      fill(f ? 255 : 170, f ? 255 : 150, f ? 255 : 80);
      rect(e.facing * 10, -2 + wb, 4, 2); // guard
      // Pixel helmet
      fill(f ? 255 : 165, f ? 255 : 155, f ? 255 : 135);
      rect(-7, -20 + wb, 14, 12);
      // Pixel face guard
      fill(f ? 255 : 145, f ? 255 : 135, f ? 255 : 115);
      rect(-5, -16 + wb, 10, 6);
      // Pixel red plume
      fill(f ? 255 : 185, f ? 255 : 35, f ? 255 : 25);
      rect(-4, -26 + wb, 8, 6);
      rect(-2, -28 + wb, 4, 2);
      // Pixel eye slits
      fill(30);
      rect(-4, -15 + wb, 3, 2);
      rect(1, -15 + wb, 3, 2);
      // Eye glow
      fill(200, 180, 140, 80);
      rect(-3, -15 + wb, 2, 1);
      rect(2, -15 + wb, 2, 1);
      break;
    }
    case 'minotaur': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 45);
      rect(-18, 16, 36, 3);
      // Pixel legs
      fill(f ? 255 : 95, f ? 255 : 60, f ? 255 : 35);
      let mleg = floor(sin(frameCount * 0.08) * 2);
      rect(-10, 10 + mleg + wb, 7, 12);
      rect(3, 10 - mleg + wb, 7, 12);
      // Pixel hooves
      fill(f ? 255 : 60, f ? 255 : 40, f ? 255 : 20);
      rect(-11, 20 + mleg + wb, 9, 3);
      rect(2, 20 - mleg + wb, 9, 3);
      // Pixel body
      fill(f ? 255 : 110, f ? 255 : 70, f ? 255 : 45);
      rect(-16, -16 + wb, 32, 28);
      // Chest detail
      fill(f ? 255 : 125, f ? 255 : 82, f ? 255 : 52);
      rect(-10, -12 + wb, 8, 14);
      rect(2, -12 + wb, 8, 14);
      // Pixel arms
      fill(f ? 255 : 115, f ? 255 : 75, f ? 255 : 48);
      rect(-20, -10 + wb, 4, 14);
      rect(16, -10 + wb, 4, 14);
      // Pixel fists
      fill(f ? 255 : 100, f ? 255 : 65, f ? 255 : 40);
      rect(-21, 4 + wb, 6, 6);
      rect(15, 4 + wb, 6, 6);
      // Pixel head
      fill(f ? 255 : 100, f ? 255 : 65, f ? 255 : 40);
      rect(-10, -30 + wb, 20, 16);
      // Brow ridge
      fill(f ? 255 : 85, f ? 255 : 52, f ? 255 : 30);
      rect(-10, -32 + wb, 20, 4);
      // Pixel horns
      fill(f ? 255 : 230, f ? 255 : 220, f ? 255 : 190);
      rect(-14, -38 + wb, 4, 8);
      rect(-16, -42 + wb, 4, 6);
      rect(10, -38 + wb, 4, 8);
      rect(12, -42 + wb, 4, 6);
      // Pixel snout
      fill(f ? 255 : 85, f ? 255 : 55, f ? 255 : 32);
      rect(-6, -22 + wb, 12, 6);
      // Pixel nostrils
      fill(35, 20, 10);
      rect(-4, -20 + wb, 2, 2);
      rect(2, -20 + wb, 2, 2);
      // Pixel nose ring
      fill(f ? 255 : 200, f ? 255 : 170, f ? 255 : 60);
      rect(-2, -18 + wb, 4, 2);
      rect(-3, -18 + wb, 1, 1);
      rect(2, -18 + wb, 1, 1);
      // Pixel eyes (red)
      fill(255, 50, 20);
      rect(-8, -28 + wb, 4, 3);
      rect(4, -28 + wb, 4, 3);
      fill(180, 20, 10);
      rect(-7, -28 + wb, 2, 2);
      rect(5, -28 + wb, 2, 2);
      // Snort when winding up
      if (e.state === 'windup') {
        fill(200, 180, 160, 100);
        for (let s = 0; s < 3; s++) {
          rect(-6 - s * 3, -19 + wb, 2, 2);
          rect(6 + s * 3, -19 + wb, 2, 2);
        }
      }
      // Charging aura
      if (e.state === 'charging') {
        fill(255, 40, 20, 25);
        rect(-20, -16, 40, 2);
        rect(-1, -32, 2, 40);
      }
      break;
    }
    case 'shield_bearer': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 35);
      rect(-12, 9, 24, 2);
      // Pixel legs
      fill(f ? 255 : 120, f ? 255 : 110, f ? 255 : 90);
      let sbleg = floor(sin(frameCount * 0.09) * 1.5);
      rect(-5, 6 + sbleg + wb, 4, 8);
      rect(2, 6 - sbleg + wb, 4, 8);
      // Pixel boots
      fill(f ? 255 : 90, f ? 255 : 75, f ? 255 : 50);
      rect(-6, 13 + sbleg + wb, 5, 3);
      rect(1, 13 - sbleg + wb, 5, 3);
      // Pixel body (heavy armor)
      fill(f ? 255 : 140, f ? 255 : 130, f ? 255 : 115);
      rect(-10, -8 + wb, 20, 16);
      // Armor plate detail
      fill(f ? 255 : 160, f ? 255 : 150, f ? 255 : 130);
      rect(-8, -6 + wb, 16, 12);
      // Cross rivets
      fill(f ? 255 : 180, f ? 255 : 170, f ? 255 : 140);
      rect(-1, -5 + wb, 2, 10);
      rect(-6, 0 + wb, 12, 2);
      // Large shield (held in front)
      fill(f ? 255 : 120, f ? 255 : 105, f ? 255 : 75);
      rect(-e.facing * 12, -12 + wb, 10, 22);
      fill(f ? 255 : 145, f ? 255 : 130, f ? 255 : 95);
      rect(-e.facing * 11, -9 + wb, 8, 16);
      // Shield boss (center)
      fill(f ? 255 : 180, f ? 255 : 160, f ? 255 : 100);
      rect(-e.facing * 9, -2 + wb, 4, 4);
      // Pixel arm + short sword
      fill(f ? 255 : 185, f ? 255 : 155, f ? 255 : 115);
      rect(e.facing * 9, -2 + wb, 3, 6);
      fill(f ? 255 : 190, f ? 255 : 190, f ? 255 : 200);
      rect(e.facing * 10, -10 + wb, 2, 8);
      // Pixel helmet
      fill(f ? 255 : 150, f ? 255 : 140, f ? 255 : 120);
      rect(-6, -20 + wb, 12, 12);
      // Face guard
      fill(f ? 255 : 130, f ? 255 : 120, f ? 255 : 100);
      rect(-4, -16 + wb, 8, 6);
      // Eye slits
      fill(30);
      rect(-3, -14 + wb, 3, 2);
      rect(1, -14 + wb, 3, 2);
      break;
    }
    case 'archer': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-7, 7, 14, 2);
      // Pixel legs
      fill(f ? 255 : 100, f ? 255 : 80, f ? 255 : 50);
      let aleg = floor(sin(frameCount * 0.12) * 2);
      rect(-3, 5 + aleg + wb, 3, 7);
      rect(1, 5 - aleg + wb, 3, 7);
      // Pixel sandals
      fill(f ? 255 : 80, f ? 255 : 65, f ? 255 : 35);
      rect(-4, 11 + aleg + wb, 4, 2);
      rect(0, 11 - aleg + wb, 4, 2);
      // Pixel body (light tunic)
      fill(f ? 255 : 120, f ? 255 : 100, f ? 255 : 70);
      rect(-6, -5 + wb, 12, 12);
      // Pixel belt + quiver strap
      fill(f ? 255 : 80, f ? 255 : 60, f ? 255 : 30);
      rect(-5, 3 + wb, 10, 2);
      rect(-e.facing * 4, -4 + wb, 1, 8);
      // Pixel quiver on back
      fill(f ? 255 : 90, f ? 255 : 70, f ? 255 : 40);
      rect(-e.facing * 6, -6 + wb, 3, 10);
      // Arrow tips
      fill(f ? 255 : 180, f ? 255 : 180, f ? 255 : 190);
      rect(-e.facing * 6, -8 + wb, 1, 2);
      rect(-e.facing * 5, -7 + wb, 1, 2);
      // Pixel arms + bow
      fill(f ? 255 : 175, f ? 255 : 145, f ? 255 : 105);
      rect(e.facing * 6, -2 + wb, 3, 5);
      // Bow
      fill(f ? 255 : 100, f ? 255 : 70, f ? 255 : 30);
      rect(e.facing * 8, -10 + wb, 2, 16);
      // Bowstring
      stroke(f ? 255 : 180, f ? 255 : 170, f ? 255 : 150);
      strokeWeight(0.5);
      line(e.facing * 9, -10 + wb, e.facing * 9, 6 + wb);
      noStroke();
      // Pixel head
      fill(f ? 255 : 190, f ? 255 : 160, f ? 255 : 120);
      rect(-4, -13 + wb, 8, 8);
      // Pixel hood
      fill(f ? 255 : 90, f ? 255 : 75, f ? 255 : 45);
      rect(-5, -15 + wb, 10, 6);
      rect(-4, -16 + wb, 8, 2);
      // Pixel eyes
      fill(40);
      rect(-3, -10 + wb, 2, 2);
      rect(1, -10 + wb, 2, 2);
      break;
    }
    case 'centurion': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 45);
      rect(-16, 12, 32, 3);
      // Pixel legs
      fill(f ? 255 : 160, f ? 255 : 45, f ? 255 : 35);
      let cleg = floor(sin(frameCount * 0.09) * 2);
      rect(-7, 8 + cleg + wb, 5, 10);
      rect(2, 8 - cleg + wb, 5, 10);
      // Pixel boots
      fill(f ? 255 : 100, f ? 255 : 30, f ? 255 : 20);
      rect(-8, 17 + cleg + wb, 7, 3);
      rect(1, 17 - cleg + wb, 7, 3);
      // Pixel body (red + gold armor)
      fill(f ? 255 : 180, f ? 255 : 50, f ? 255 : 40);
      rect(-14, -12 + wb, 28, 22);
      // Gold trim
      fill(f ? 255 : 220, f ? 255 : 185, f ? 255 : 60);
      rect(-14, -12 + wb, 28, 2);
      rect(-14, 8 + wb, 28, 2);
      rect(-14, -12 + wb, 2, 22);
      rect(12, -12 + wb, 2, 22);
      // Center emblem
      fill(f ? 255 : 240, f ? 255 : 200, f ? 255 : 80);
      rect(-3, -6 + wb, 6, 6);
      rect(-1, -8 + wb, 2, 10);
      // Pixel arms
      fill(f ? 255 : 170, f ? 255 : 45, f ? 255 : 35);
      rect(-18, -6 + wb, 4, 12);
      rect(14, -6 + wb, 4, 12);
      // Pixel sword (large)
      fill(f ? 255 : 210, f ? 255 : 210, f ? 255 : 220);
      rect(e.facing * 16, -24 + wb, 3, 20);
      fill(f ? 255 : 200, f ? 255 : 170, f ? 255 : 60);
      rect(e.facing * 14, -4 + wb, 7, 3);
      // Pixel head
      fill(f ? 255 : 200, f ? 255 : 170, f ? 255 : 130);
      rect(-8, -24 + wb, 16, 12);
      // Pixel helmet (transverse crest)
      fill(f ? 255 : 190, f ? 255 : 55, f ? 255 : 40);
      rect(-10, -30 + wb, 20, 8);
      // Red crest
      fill(f ? 255 : 200, f ? 255 : 30, f ? 255 : 20);
      rect(-12, -34 + wb, 24, 4);
      rect(-10, -36 + wb, 20, 2);
      // Eye slits
      fill(30);
      rect(-5, -20 + wb, 3, 2);
      rect(2, -20 + wb, 3, 2);
      // Glowing eyes
      fill(255, 200, 60, 120);
      rect(-4, -20 + wb, 2, 1);
      rect(3, -20 + wb, 2, 1);
      // Charging aura
      if (e.state === 'charging') {
        fill(255, 40, 20, 30);
        rect(-20, -12, 40, 2);
        rect(-1, -36, 2, 50);
      }
      if (e.state === 'windup') {
        fill(255, 200, 60, floor(sin(frameCount * 0.2) * 40 + 40));
        rect(-16, -14 + wb, 32, 26);
      }
      break;
    }
    case 'bear': {
      let wb = floor(walkBob);
      let ef = e.facing;
      // Pixel shadow
      fill(0, 0, 0, 35);
      rect(-12, 7, 24, 2);
      // Pixel body
      fill(f ? 255 : 90, f ? 255 : 60, f ? 255 : 30);
      rect(-12, -8 + wb, 24, 16);
      // Fur highlight
      fill(f ? 255 : 110, f ? 255 : 75, f ? 255 : 40);
      rect(-8, -6 + wb, 14, 8);
      // Pixel head
      fill(f ? 255 : 100, f ? 255 : 68, f ? 255 : 35);
      rect(ef * 8, -12 + wb, 12 * ef, 10);
      // Pixel snout
      fill(f ? 255 : 120, f ? 255 : 90, f ? 255 : 60);
      rect(ef * 16, -6 + wb, 4 * ef, 4);
      // Pixel nose
      fill(30, 20, 15);
      rect(ef * 19, -6 + wb, 2, 2);
      // Pixel ears
      fill(f ? 255 : 80, f ? 255 : 50, f ? 255 : 25);
      rect(ef * 10, -14 + wb, 3, 3);
      rect(ef * 15, -14 + wb, 3, 3);
      // Pixel eyes
      fill(200, 50, 30);
      rect(ef * 15, -10 + wb, 2, 2);
      // Pixel paws
      fill(f ? 255 : 80, f ? 255 : 52, f ? 255 : 28);
      let pb = floor(sin(frameCount * 0.12) * 2);
      rect(-8, 6 + pb, 5, 4);
      rect(3, 6 - pb, 5, 4);
      break;
    }
    case 'dire_wolf': {
      let wb = floor(walkBob);
      let ef = e.facing;
      // Pixel shadow
      fill(0, 0, 0, 30);
      rect(-10, 4, 20, 2);
      // Pixel body (dark)
      fill(f ? 255 : 60, f ? 255 : 55, f ? 255 : 70);
      rect(-10, -5 + wb, 20, 10);
      // Dark stripe
      fill(f ? 255 : 45, f ? 255 : 40, f ? 255 : 55);
      rect(-6, -3 + wb, 12, 4);
      // Pixel head
      fill(f ? 255 : 70, f ? 255 : 65, f ? 255 : 80);
      rect(ef * 5, -8 + wb, 10 * ef, 8);
      // Pixel snout
      fill(f ? 255 : 80, f ? 255 : 75, f ? 255 : 90);
      rect(ef * 13, -4 + wb, 4 * ef, 4);
      // Pixel ears
      fill(f ? 255 : 50, f ? 255 : 45, f ? 255 : 60);
      rect(ef * 7, -12 + wb, 3, 4);
      rect(ef * 11, -11 + wb, 3, 3);
      // Pixel purple eyes
      fill(180, 60, 255);
      rect(ef * 11, -6 + wb, 2, 2);
      fill(220, 120, 255);
      rect(ef * 11, -6 + wb, 1, 1);
      // Pixel speed streaks
      if (e.state === 'chase') {
        fill(100, 80, 160, 40);
        for (let s = 1; s <= 3; s++) {
          rect(-ef * (10 + s * 6), -2 + wb, 4, 1);
        }
      }
      break;
    }
    case 'guardian': {
      let wb = floor(walkBob);
      // Pixel shadow
      fill(0, 0, 0, 40);
      rect(-16, 10, 32, 3);
      // Pixel body (stone golem)
      fill(f ? 255 : 100, f ? 255 : 95, f ? 255 : 110);
      rect(-14, -12 + wb, 28, 24);
      // Stone texture
      fill(f ? 255 : 85, f ? 255 : 80, f ? 255 : 95);
      rect(-10, -8 + wb, 10, 10);
      rect(4, -4 + wb, 8, 8);
      // Pixel head
      fill(f ? 255 : 120, f ? 255 : 115, f ? 255 : 130);
      rect(-7, -24 + wb, 14, 12);
      // Pixel visor
      fill(f ? 255 : 50, f ? 255 : 45, f ? 255 : 60);
      rect(-5, -22 + wb, 10, 3);
      // Pixel glowing eyes
      fill(0, 255, 136);
      rect(-4, -21 + wb, 2, 2);
      rect(2, -21 + wb, 2, 2);
      // Pixel arms
      fill(f ? 255 : 90, f ? 255 : 85, f ? 255 : 100);
      let armOff = e.state === 'attack' ? floor(sin(e.stateTimer * 0.2) * 4) : 0;
      rect(-18, -4 + wb + armOff, 4, 14);
      rect(14, -4 + wb - armOff, 4, 14);
      // Pixel runes (glowing)
      let runeGlow = floor(sin(frameCount * 0.04) * 30);
      fill(0, 200 + runeGlow, 100 + runeGlow, 150);
      rect(-1, -7 + wb, 2, 2);
      rect(-8, 0 + wb, 2, 2);
      rect(6, 0 + wb, 2, 2);
      // Pixel aura — cross
      fill(0, 255, 136, 12);
      rect(-18, -1, 36, 2);
      rect(-1, -18, 2, 36);
      break;
    }
  }

  // HP bar above enemy (polished)
  if (e.hp < e.maxHp && e.state !== 'dying') {
    let barW = max(e.size * 2.2, 24);
    let barH = 3;
    let barY = -e.size - (e.type === 'minotaur' || e.type === 'guardian' ? 50 : 16);
    // Bar background
    fill(30, 10, 10, 180);
    rect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2, 2);
    // Empty bar
    fill(70, 25, 20);
    rect(-barW / 2, barY, barW, barH, 1);
    // Filled bar (color shifts red→yellow at low HP)
    let hpFrac = e.hp / e.maxHp;
    let r = hpFrac > 0.4 ? 200 : 240;
    let g = hpFrac > 0.4 ? 45 : 180;
    fill(r, g, 25);
    rect(-barW / 2, barY, barW * hpFrac, barH, 1);
    // Name label for boss
    if (e.type === 'minotaur' || e.type === 'guardian') {
      fill(255, 220, 180, 200);
      textSize(11);
      textAlign(CENTER);
      text('MINOTAURUS', 0, barY - 5);
    }
  }

  pop();
}

// ─── EXPEDITION UPGRADES ─────────────────────────────────────────────────
const EXPEDITION_UPGRADES = {
  workerSpeed:    { name: 'Swift Workers',    tiers: [{ gold: 50, wood: 20 },  { gold: 150, ironOre: 8 },  { gold: 300, ironOre: 15, rareHide: 5 }],  desc: 'Workers chop/build 25% faster' },
  workerCap:      { name: 'Worker Barracks',  tiers: [{ gold: 60, wood: 25 },  { gold: 180, ironOre: 12 }, { gold: 350, rareHide: 8, ancientRelic: 1 }], desc: '+1 max worker per tier' },
  dangerResist:   { name: 'Scout Network',    tiers: [{ gold: 40, wood: 15 },  { gold: 120, rareHide: 5 }, { gold: 250, ancientRelic: 2 }],             desc: 'Danger escalates slower' },
  lootBonus:      { name: 'Plunder Expertise',tiers: [{ gold: 60, wood: 20 },  { gold: 200, ironOre: 10 }, { gold: 400, titanBone: 2 }],                 desc: '+15% loot per tier' },
  soldierHP:      { name: 'Veteran Training', tiers: [{ gold: 50, ironOre: 5 },{ gold: 160, rareHide: 6 }, { gold: 320, ancientRelic: 3, titanBone: 1 }],desc: 'Soldiers start tougher' },
  expeditionTier: { name: 'Cartographer',     tiers: [{ gold: 100, ancientRelic: 2 }, { gold: 250, titanBone: 3, ancientRelic: 3 }],                      desc: 'Harder but richer expeditions' },
};


function canAffordUpgrade(cost) {
  for (let [key, val] of Object.entries(cost)) {
    if (key === 'gold' && state.gold < val) return false;
    if (key === 'wood' && state.wood < val) return false;
    if (key === 'ironOre' && state.ironOre < val) return false;
    if (key === 'rareHide' && state.rareHide < val) return false;
    if (key === 'ancientRelic' && state.ancientRelic < val) return false;
    if (key === 'titanBone' && state.titanBone < val) return false;
  }
  return true;
}

function buyExpeditionUpgrade(key) {
  let upg = EXPEDITION_UPGRADES[key];
  let tier = state.expeditionUpgrades[key] || 0;
  if (tier >= upg.tiers.length) return false;
  let cost = upg.tiers[tier];
  if (!canAffordUpgrade(cost)) return false;

  // Deduct costs
  for (let [k, v] of Object.entries(cost)) {
    if (k === 'gold') state.gold = max(0, state.gold - v);
    if (k === 'wood') state.wood -= v;
    if (k === 'ironOre') state.ironOre -= v;
    if (k === 'rareHide') state.rareHide -= v;
    if (k === 'ancientRelic') state.ancientRelic -= v;
    if (k === 'titanBone') state.titanBone -= v;
  }
  state.expeditionUpgrades[key] = tier + 1;
  addFloatingText(width / 2, height * 0.35, upg.name + ' upgraded!', '#88ccff');
  triggerScreenShake(2, 5);
  return true;
}

// ─── BOUNTY BOARD ───────────────────────────────────────────────────────
const BOUNTY_TEMPLATES = [
  { type: 'kills',     desc: 'Slay {n} wolves',        target: 3,  reward: { gold: 30 },               enemy: 'wolf' },
  { type: 'kills',     desc: 'Slay {n} boars',         target: 2,  reward: { gold: 40, ironOre: 2 },   enemy: 'boar' },
  { type: 'kills',     desc: 'Slay {n} bears',         target: 2,  reward: { gold: 50, rareHide: 2 },  enemy: 'bear' },
  { type: 'kills',     desc: 'Slay {n} dire wolves',   target: 3,  reward: { gold: 45, ironOre: 3 },   enemy: 'dire_wolf' },
  { type: 'danger',    desc: 'Reach danger level {n}',  target: 4,  reward: { gold: 60 } },
  { type: 'danger',    desc: 'Reach danger level {n}',  target: 7,  reward: { gold: 100, ancientRelic: 1 } },
  { type: 'survive',   desc: 'Survive {n} seconds',     target: 45, reward: { gold: 50, ironOre: 3 } },
  { type: 'survive',   desc: 'Survive {n} seconds',     target: 90, reward: { gold: 80, rareHide: 3 } },
  { type: 'loot',      desc: 'Collect {n} iron ore',    target: 3,  reward: { gold: 60 } },
  { type: 'loot',      desc: 'Collect {n} rare hides',  target: 2,  reward: { gold: 70 } },
  { type: 'chop',      desc: 'Chop {n} trees',          target: 8,  reward: { gold: 25, wood: 50 } },
  { type: 'build',     desc: 'Build {n} structures',    target: 2,  reward: { gold: 40, ironOre: 2 } },
  { type: 'nokill',    desc: 'Return alive (no death)',  target: 1,  reward: { gold: 35 } },
];

function generateBounties() {
  let bb = state.bountyBoard;
  if (bb.day === state.day) return; // already generated today
  bb.day = state.day;
  bb.bounties = [];
  // Pick 3 unique bounties
  let pool = [...BOUNTY_TEMPLATES];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    let idx = floor(random(pool.length));
    let tmpl = pool.splice(idx, 1)[0];
    bb.bounties.push({
      id: i,
      desc: tmpl.desc.replace('{n}', tmpl.target),
      type: tmpl.type,
      target: tmpl.target,
      enemy: tmpl.enemy || null,
      progress: 0,
      reward: { ...tmpl.reward },
      completed: false,
    });
  }
}

function updateBountyProgress(type, value, enemyType) {
  let bb = state.bountyBoard;
  for (let b of bb.bounties) {
    if (b.completed) continue;
    if (b.type === type) {
      if (type === 'kills' && b.enemy && b.enemy !== enemyType) continue;
      if (type === 'danger' || type === 'survive') {
        b.progress = max(b.progress, value); // track max reached
      } else {
        b.progress += value;
      }
      if (b.progress >= b.target && !b.completed) {
        b.completed = true;
        // Grant reward
        for (let [k, v] of Object.entries(b.reward)) {
          if (k === 'gold') state.gold += v;
          if (k === 'wood') state.wood += v;
          if (k === 'ironOre') state.ironOre += v;
          if (k === 'rareHide') state.rareHide += v;
          if (k === 'ancientRelic') state.ancientRelic += v;
          if (k === 'titanBone') state.titanBone += v;
        }
        let rewardStr = Object.entries(b.reward).map(([k, v]) => '+' + v + ' ' + k).join('  ');
        addFloatingText(width / 2, height * 0.15, 'BOUNTY COMPLETE!', '#ffdd44');
        addFloatingText(width / 2, height * 0.2, rewardStr, '#aaddff');
        triggerScreenShake(4, 10);
      }
    }
  }
}

// ─── FOG OF WAR ─────────────────────────────────────────────────────────
const FOG_GRID = 20; // grid cell size in world units
const FOG_REVEAL_R = 5; // reveal radius in cells (~100px)

function initFogOfWar() {
  let c = state.conquest;
  let cols = ceil(c.isleRX * 2 / FOG_GRID) + 2;
  let rows = ceil(c.isleRY * 2 / FOG_GRID) + 2;
  state.fogOfWar = new Array(cols * rows).fill(0);
  state._fogCols = cols;
  state._fogRows = rows;
  state._fogOX = c.isleX - c.isleRX - FOG_GRID;
  state._fogOY = c.isleY - c.isleRY - FOG_GRID;
}

function revealFog(wx, wy) {
  if (!state._fogCols) return;
  let gx = floor((wx - state._fogOX) / FOG_GRID);
  let gy = floor((wy - state._fogOY) / FOG_GRID);
  let r = FOG_REVEAL_R;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      let cx = gx + dx, cy = gy + dy;
      if (cx < 0 || cy < 0 || cx >= state._fogCols || cy >= state._fogRows) continue;
      state.fogOfWar[cy * state._fogCols + cx] = 1;
    }
  }
}

function drawFogOfWar() {
  if (!state._fogCols || !state.fogOfWar.length) return;
  let c = state.conquest;
  // Only draw fog if foggy modifier or always show partial
  let fogAlpha = state.expeditionModifier === 'foggy' ? 220 : 140;
  push();
  noStroke();
  for (let gy = 0; gy < state._fogRows; gy++) {
    for (let gx = 0; gx < state._fogCols; gx++) {
      if (state.fogOfWar[gy * state._fogCols + gx] === 1) continue;
      let wx = state._fogOX + gx * FOG_GRID;
      let wy = state._fogOY + gy * FOG_GRID;
      // Skip if outside island ellipse
      let ex = (wx + FOG_GRID / 2 - c.isleX) / c.isleRX;
      let ey = (wy + FOG_GRID / 2 - c.isleY) / c.isleRY;
      if (ex * ex + ey * ey > 1.1) continue;
      let sx = w2sX(wx), sy = w2sY(wy);
      fill(15, 20, 15, fogAlpha);
      rect(sx, sy, FOG_GRID + 1, FOG_GRID + 1);
    }
  }
  pop();
}

function drawModifierAtmosphere() {
  let mod = state.expeditionModifier;
  if (!mod || mod === 'normal') return;
  let c = state.conquest;
  let ix = w2sX(c.isleX), iy = w2sY(c.isleY);
  push();
  noStroke();
  if (mod === 'blood_moon') {
    // Red tint over everything
    fill(120, 20, 10, 25 + sin(frameCount * 0.03) * 10);
    ellipse(ix, iy, c.isleRX * 2.2, c.isleRY * 2.2);
    // Blood moon in sky
    fill(180, 40, 20, 60);
    ellipse(width * 0.8, 40, 30, 30);
    fill(200, 60, 30, 80);
    ellipse(width * 0.8, 40, 24, 24);
  } else if (mod === 'foggy') {
    // Thick fog patches
    for (let i = 0; i < 6; i++) {
      let fx = ix + sin(frameCount * 0.005 + i * 2) * c.isleRX * 0.6;
      let fy = iy + cos(frameCount * 0.004 + i * 1.7) * c.isleRY * 0.4;
      fill(160, 180, 170, 30 + sin(frameCount * 0.02 + i) * 12);
      ellipse(fx, fy, 200 + sin(i) * 60, 100 + cos(i) * 30);
    }
  } else if (mod === 'sacred') {
    // Gentle blue-white glow
    fill(100, 160, 220, 12 + sin(frameCount * 0.02) * 6);
    ellipse(ix, iy, c.isleRX * 1.8, c.isleRY * 1.8);
    // Sparkles
    if (frameCount % 20 === 0) {
      let sx = c.isleX + random(-c.isleRX * 0.7, c.isleRX * 0.7);
      let sy = c.isleY + random(-c.isleRY * 0.7, c.isleRY * 0.7);
      spawnParticles(sx, sy, 'collect', 1);
    }
  } else if (mod === 'golden') {
    // Golden shimmer
    fill(200, 170, 50, 10 + sin(frameCount * 0.04) * 8);
    ellipse(ix, iy, c.isleRX * 2, c.isleRY * 2);
  }
  pop();
}


// ─── CONQUEST ISLAND ─────────────────────────────────────────────────────

const CONQUEST_BUILDINGS = {
  campfire:   { name: 'Campfire',    cost: 4,  key: '1', desc: 'Light + morale',   soldiers: 0, workerType: null },
  palisade:   { name: 'Palisade',    cost: 6,  key: '2', desc: 'Wall defense',     soldiers: 0, workerType: null },
  hut:        { name: 'Shelter',     cost: 8,  key: '3', desc: '+1 Chopper',       soldiers: 1, workerType: 'chopper' },
  watchtower: { name: 'Watchtower',  cost: 10, key: '4', desc: 'Auto-fire tower',  soldiers: 0, workerType: null },
  barracks:   { name: 'Barracks',    cost: 14, key: '5', desc: 'Auto-gen soldiers', soldiers: 0, workerType: 'builder' },
};

// ─── V1.2 RTS EXPEDITION COMBAT ─────────────────────────────────────────

const EXPEDITION_BARRACKS = {
  levels: [
    { maxSoldiers: 4,  genTime: 1800, genCount: 2, units: ['swordsman'], upgradeCost: { wood: 15, stone: 10 } },
    { maxSoldiers: 6,  genTime: 1500, genCount: 3, units: ['swordsman'], upgradeCost: { wood: 25, stone: 20 } },
    { maxSoldiers: 8,  genTime: 1200, genCount: 3, units: ['swordsman'], upgradeCost: { wood: 40, stone: 30, gold: 20 } },
    { maxSoldiers: 10, genTime: 1200, genCount: 4, units: ['swordsman', 'archer'], upgradeCost: { wood: 60, stone: 40, gold: 40 } },
    { maxSoldiers: 14, genTime: 1000, genCount: 4, units: ['swordsman', 'archer'], upgradeCost: { wood: 80, stone: 60, gold: 60 } },
    { maxSoldiers: 18, genTime: 900,  genCount: 5, units: ['swordsman', 'archer'], upgradeCost: { wood: 100, stone: 80, gold: 80 } },
    { maxSoldiers: 22, genTime: 900,  genCount: 5, units: ['swordsman', 'archer'], upgradeCost: { wood: 120, stone: 100, gold: 100 } },
    { maxSoldiers: 26, genTime: 800,  genCount: 6, units: ['swordsman', 'archer'], upgradeCost: { wood: 150, stone: 120, gold: 120 } },
    { maxSoldiers: 30, genTime: 700,  genCount: 6, units: ['swordsman', 'archer'], upgradeCost: { wood: 200, stone: 150, gold: 150 } },
    { maxSoldiers: 36, genTime: 600,  genCount: 7, units: ['swordsman', 'archer', 'cavalry'], upgradeCost: null }
  ]
};

const EXPEDITION_UNITS = {
  swordsman: { hp: 25, damage: 5, speed: 1.2, range: 25, cost: 0, color: [160, 140, 120] },
  archer:    { hp: 15, damage: 8, speed: 1.0, range: 180, cost: 0, color: [120, 160, 100] },
  cavalry:   { hp: 40, damage: 7, speed: 2.2, range: 25, cost: 0, color: [180, 160, 100] }
};

const EXPEDITION_TOWER = {
  levels: [
    { damage: 5, speed: 60, range: 150, upgradeCost: { wood: 10, stone: 5 } },
    { damage: 8, speed: 50, range: 180, upgradeCost: { wood: 20, stone: 15 } },
    { damage: 12, speed: 40, range: 210, upgradeCost: { wood: 35, stone: 25, gold: 15 } },
    { damage: 18, speed: 30, range: 250, upgradeCost: null }
  ]
};

var _conquestProjectiles = [];

function isOnConquestIsland(wx, wy) {
  let c = state.conquest;
  let ex = (wx - c.isleX) / (c.isleRX - 25);
  let ey = (wy - c.isleY) / (c.isleRY - 25);
  return ex * ex + ey * ey < 1;
}

function initConquestIsland() {
  let c = state.conquest;
  // Migrate: if trees exist but are centered on old island position, regenerate
  if (c.trees.length > 5) {
    let avgX = 0, avgY = 0;
    for (let t of c.trees) { avgX += t.x; avgY += t.y; }
    avgX /= c.trees.length; avgY /= c.trees.length;
    let d = dist(avgX, avgY, c.isleX, c.isleY);
    if (d > c.isleRX * 0.3) {
      c.trees = [];
      c.buildings = [];
      c.soldiers = [];
      c.workers = [];
    }
  }
  if (c.trees.length > 0) return;
  // Dense forest — more trees for bigger island
  for (let i = 0; i < 110; i++) {
    let angle = random(TWO_PI);
    let r = random(0.15, 0.88);
    let tx = c.isleX + cos(angle) * c.isleRX * r;
    let ty = c.isleY + sin(angle) * c.isleRY * r;
    // Leave a clearing at south where player lands
    let landDist = dist(tx, ty, c.isleX, c.isleY + c.isleRY * 0.5);
    if (landDist < 70) continue;
    c.trees.push({ x: tx, y: ty, hp: 3, maxHp: 3, alive: true, size: random(0.8, 1.2) });
  }
  // Crystal nodes — scattered across the island
  c.crystalNodes = [];
  for (let i = 0; i < 4; i++) {
    let angle = random(TWO_PI);
    let r = random(0.3, 0.75);
    let cx = c.isleX + cos(angle) * c.isleRX * r;
    let cy = c.isleY + sin(angle) * c.isleRY * r;
    c.crystalNodes.push({ x: cx, y: cy, collected: false });
  }
  // Resource deposits — iron ore and stone
  c.resourceDeposits = [];
  for (let i = 0; i < 5; i++) {
    let angle = random(TWO_PI);
    let r = random(0.25, 0.8);
    let rx = c.isleX + cos(angle) * c.isleRX * r;
    let ry = c.isleY + sin(angle) * c.isleRY * r;
    let landDist = dist(rx, ry, c.isleX, c.isleY + c.isleRY * 0.5);
    if (landDist < 60) continue;
    c.resourceDeposits.push({ x: rx, y: ry, type: random() < 0.6 ? 'iron' : 'stone', hp: 3, maxHp: 3, depleted: false });
  }
  // Fishing spots — along the coast edges
  c.fishingSpots = [];
  let fishAngles = [PI * 0.2, PI * 0.8, PI * 1.3, PI * 1.7];
  for (let fa of fishAngles) {
    let fx = c.isleX + cos(fa) * c.isleRX * 0.92;
    let fy = c.isleY + sin(fa) * c.isleRY * 0.92;
    c.fishingSpots.push({ x: fx, y: fy, cooldown: 0 });
  }
  // Wildlife — ambient birds and rabbits
  c.wildlife = [];
  for (let i = 0; i < 8; i++) {
    let angle = random(TWO_PI);
    let r = random(0.15, 0.7);
    let wx = c.isleX + cos(angle) * c.isleRX * r;
    let wy = c.isleY + sin(angle) * c.isleRY * r;
    c.wildlife.push({ x: wx, y: wy, type: random() < 0.5 ? 'bird' : 'rabbit', vx: 0, vy: 0, timer: floor(random(60, 300)), facing: random() > 0.5 ? 1 : -1 });
  }
}

function enterConquest() { console.warn('enterConquest deprecated -- openworld mode'); }

function exitConquest(isDeath) { console.warn('exitConquest deprecated -- openworld mode'); }

// Legacy expedition loot/summary code preserved as dead code after deprecation
function _exitConquest_legacy(isDeath) {
  let c = state.conquest;
  let p = state.player;
  c.active = false;
  c.buildMode = false;
  _combatLastEnemyCount = 0;
  c.enemies = [];
  _conquestProjectiles = [];
  let dockX = c.isleX;
  let dockY = c.isleY + c.isleRY * 1.05;
  p.x = dockX;
  p.y = dockY;
  p.vx = 0; p.vy = 0;
  state.rowing.active = true;
  state.rowing.docked = false;
  state.rowing.x = dockX;
  state.rowing.y = dockY;
  state.rowing.speed = 0;
  state.rowing.angle = HALF_PI;
  state.centurion.x = p.x + 20;
  state.centurion.y = p.y + 10;
  if (p.hp < p.maxHp * 0.5) p.hp = floor(p.maxHp * 0.5);
  cam.x = p.x; cam.y = p.y;
  camSmooth.x = p.x; camSmooth.y = p.y;

  if (!isDeath) updateBountyProgress('nokill', 1);
  if (typeof advanceMainQuestCounter === 'function') {
    advanceMainQuestCounter('mq_expeditions', 1);
  }
  trackMilestone('first_expedition');

  let lg = state.legia;
  let soldiersAtStart = c._soldiersAtStart || 0;
  let soldiersLost = 0;
  if (lg) {
    let aliveSoldiers = c.soldiers.filter(s => s.hp > 0);
    if (isDeath) {
      soldiersLost = soldiersAtStart;
      lg.soldiers = [];
    } else {
      soldiersLost = soldiersAtStart - aliveSoldiers.length;
      let cx = lg.castrumX || WORLD.islandCX + 200;
      let cy = lg.castrumY || WORLD.islandCY + 100;
      lg.soldiers = aliveSoldiers.map(s => ({
        x: cx + random(-30, 30), y: cy + random(-20, 20),
        hp: s.hp, maxHp: s.maxHp,
        facing: random() > 0.5 ? 1 : -1,
        state: 'patrol',
        patrolTimer: floor(random(60, 200)),
        targetX: cx, targetY: cy,
      }));
      lg.recruits = lg.soldiers.length;
    }
    lg.deployed = 0;
    lg.marching = false;
    c.soldiers = [];
  }

  let lootMult = isDeath ? 0.5 : 1.0;
  let lootBonusMult = 1 + state.expeditionUpgrades.lootBonus * 0.15;
  if (!isDeath && soldiersAtStart > 0) lootBonusMult *= (1 + soldiersAtStart * 0.10);
  let modGoldMult = getModifier().goldMult || 1.0;
  let baseGold = floor((50 + c.dangerLevel * 20 + c.expeditionNum * 5) * lootMult * modGoldMult);
  let goldEarned = isDeath ? baseGold : floor(baseGold * (1 + soldiersAtStart * 0.15));
  state.gold += goldEarned; if (typeof trackStat === 'function') trackStat('totalGoldEarned', goldEarned); if (typeof trackStat === 'function') trackStat('expeditionsCompleted', 1);

  let lootSummary = {};
  for (let loot of c.lootBag) {
    let name = {wood:'Wood', iron_ore:'Iron', rare_hide:'Hide', ancient_relic:'Relic', titan_bone:'Bone'}[loot.type] || loot.type;
    lootSummary[name] = (lootSummary[name] || 0) + max(1, floor(loot.qty * lootMult * lootBonusMult));
  }

  for (let loot of c.lootBag) {
    let qty = max(1, floor(loot.qty * lootMult * lootBonusMult));
    switch (loot.type) {
      case 'wood': state.wood += qty; break;
      case 'iron_ore': state.ironOre += qty; break;
      case 'rare_hide': state.rareHide += qty; break;
      case 'ancient_relic': state.ancientRelic += qty; break;
      case 'titan_bone': state.titanBone += qty; break;
    }
  }

  state.expeditionLog.unshift({
    num: c.expeditionNum, danger: c.dangerLevel,
    kills: c.totalKills, gold: goldEarned, died: !!isDeath,
    loot: c.lootBag.length,
  });
  if (state.expeditionLog.length > 5) state.expeditionLog.pop();

  state._expedSummary = {
    timer: 300,
    kills: c.totalKills,
    gold: goldEarned,
    loot: lootSummary,
    soldiersStart: soldiersAtStart,
    soldiersLost: soldiersLost,
    isDeath: !!isDeath,
  };

  if (!isDeath) spawnLootCascade(c.lootBag, goldEarned);

  c.totalKills = 0;
  c.lootBag = [];
  c._soldiersAtStart = 0;
}

function getPhaseObjective(phase) {
  switch (phase) {
    case 'landing': return 'Chop trees to gather wood [CLICK trees]';
    case 'clearing': return 'Build defenses [B] — wolves prowl the forest';
    case 'building': return 'Place a Barracks to begin the defense';
    case 'defending': return 'Survive the beast waves!';
    case 'settled': return 'Terra Nova is yours! Colonize at home pyramid [C]';
    case 'colonized': return 'Your colony thrives!';
    default: return '';
  }
}

function advanceConquestPhase(c) {
  let oldPhase = c.phase;
  let livingTrees = c.trees.filter(t => t.alive).length;
  let totalTrees = c.trees.length;
  let numBuildings = c.buildings.length;
  let hasBarracks = c.buildings.some(b => b.type === 'barracks');

  switch (c.phase) {
    case 'landing':
      // Advance when 8+ trees chopped or campfire placed
      if ((totalTrees - livingTrees >= 8) || c.buildings.some(b => b.type === 'campfire')) {
        c.phase = 'clearing';
      }
      break;
    case 'clearing':
      // Advance when 3+ buildings placed
      if (numBuildings >= 3) {
        c.phase = 'building';
      }
      break;
    case 'building':
      // Advance when barracks placed
      if (hasBarracks) {
        c.phase = 'defending';
        c.waveCount = 0;
        c.waveTimer = 180; // 3 second grace before first wave
      }
      break;
    case 'defending':
      // Advance when all 3 waves cleared
      if (c.waveCount >= 3 && c.enemies.length === 0) {
        c.phase = 'settled';
        unlockJournal('conquest_settled');
        addFloatingText(width / 2, height * 0.2, 'TERRA NOVA SETTLED', '#ffdd66');
        addFloatingText(width / 2, height * 0.3, '+50 Gold  +20 Max HP', '#aaddff');
        state.gold += 50;
        state.player.maxHp += 20;
        state.player.hp = state.player.maxHp;
        triggerScreenShake(8, 20);
      }
      break;
  }

  if (c.phase !== oldPhase) {
    addFloatingText(width / 2, height * 0.22, getPhaseObjective(c.phase), '#ccbb88');
    triggerScreenShake(4, 10);
  }
}

// ─── COLONY SYSTEM — After settling Terra Nova ────────────────────────────

function canColonize() {
  return state.conquest.phase === 'settled' && !state.conquest.colonized && state.islandLevel >= 10;
}

function getColonizeCost() {
  return { gold: 150, wood: 60, stone: 40, ironOre: 10, ancientRelic: 3 };
}

function colonizeTerraNovaAction() {
  if (!canColonize()) return;
  let cost = getColonizeCost();
  if (state.gold < cost.gold || state.wood < cost.wood || state.stone < cost.stone ||
      state.ironOre < cost.ironOre || state.ancientRelic < cost.ancientRelic) {
    addFloatingText(width / 2, height * 0.4, 'Need: ' + cost.gold + 'g, ' + cost.wood + ' wood, ' + cost.stone + ' stone, ' + cost.ironOre + ' iron, ' + cost.ancientRelic + ' relics', C.buildInvalid);
    return;
  }
  state.gold = max(0, state.gold - cost.gold);
  state.wood -= cost.wood;
  state.stone -= cost.stone;
  state.ironOre -= cost.ironOre;
  state.ancientRelic -= cost.ancientRelic;

  let c = state.conquest;
  c.colonized = true;
  c.colonyLevel = 1;
  c.phase = 'colonized';
  c.colonyWorkers = 3;
  c.colonyIncome = 10; // gold per game-day

  // Initialize colony farms — 3x2 grid near center
  c.colonyPlots = [];
  let farmX = c.isleX - 80, farmY = c.isleY - 30;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      c.colonyPlots.push({
        x: farmX + col * 30, y: farmY + row * 28,
        w: 26, h: 24, planted: false, stage: 0, timer: 0, ripe: false, cropType: 'grain'
      });
    }
  }

  // Colony buildings — start with forum
  c.colonyBuildings = [
    { x: c.isleX, y: c.isleY - 80, type: 'forum', built: true },
  ];

  // Colony grass
  c.colonyGrassTufts = [];
  for (let i = 0; i < 20; i++) {
    let a = random(TWO_PI), r = random(0.3, 0.75);
    c.colonyGrassTufts.push({
      x: c.isleX + cos(a) * c.isleRX * r,
      y: c.isleY + sin(a) * c.isleRY * r,
      blades: floor(random(4, 8)), height: random(10, 20),
      hue: random(0.7, 1.0), sway: random(TWO_PI),
    });
  }

  // Clear remaining enemies and make island peaceful
  c.enemies = [];
  c.soldiers = [];

  unlockJournal('terra_nova_colonized');
  if (snd) snd.playSFX('fanfare');
  addFloatingText(width / 2, height * 0.15, 'TERRA NOVA COLONIZED!', '#ffdd66');
  addFloatingText(width / 2, height * 0.22, 'Colony Level 1 — Income: +5g/day', '#aaddff');
  addFloatingText(width / 2, height * 0.29, 'Workers: 3 — Farms: 6', '#88cc88');
  triggerScreenShake(10, 25);
  spawnLootCascade([], 200);
}

function getColonyUpgradeCost(colLvl) {
  let base = 50;
  return {
    gold: base + colLvl * 80,
    wood: 20 + colLvl * 15,
    stone: 15 + colLvl * 12,
    ironOre: colLvl >= 3 ? 5 + (colLvl - 3) * 5 : 0,
  };
}

function upgradeColony() {
  let c = state.conquest;
  if (!c.colonized || c.colonyLevel >= 10) return;
  let cost = getColonyUpgradeCost(c.colonyLevel);
  if (state.gold < cost.gold || state.wood < cost.wood || state.stone < cost.stone ||
      (cost.ironOre > 0 && state.ironOre < cost.ironOre)) {
    addFloatingText(width / 2, height * 0.4, 'Need more resources to upgrade colony!', C.buildInvalid);
    return;
  }
  state.gold = max(0, state.gold - cost.gold);
  state.wood -= cost.wood;
  state.stone -= cost.stone;
  if (cost.ironOre > 0) state.ironOre -= cost.ironOre;

  c.colonyLevel++;
  c.colonyWorkers += 2;
  c.colonyIncome += 5 + c.colonyLevel * 2;

  // Add more farm plots
  let newPlots = 2 + floor(c.colonyLevel / 2);
  let farmX = c.isleX - 80 + (c.colonyLevel % 3) * 100 - 100;
  let farmY = c.isleY + 20 + floor(c.colonyLevel / 3) * 40;
  for (let i = 0; i < newPlots; i++) {
    c.colonyPlots.push({
      x: farmX + (i % 3) * 30, y: farmY + floor(i / 3) * 28,
      w: 26, h: 24, planted: false, stage: 0, timer: 0, ripe: false, cropType: 'grain'
    });
  }

  // Add colony building per level
  let buildingTypes = ['granary', 'barracks', 'market', 'temple', 'aqueduct', 'bathhouse', 'villa', 'lighthouse', 'colosseum', 'palace'];
  let btype = buildingTypes[min(c.colonyLevel - 1, buildingTypes.length - 1)];
  let ba = ((c.colonyLevel - 1) / 10) * TWO_PI;
  c.colonyBuildings.push({
    x: c.isleX + cos(ba) * c.isleRX * 0.45,
    y: c.isleY + sin(ba) * c.isleRY * 0.35,
    type: btype, built: true,
  });

  // Grow island slightly
  c.isleRX += 20;
  c.isleRY += 15;

  // More grass
  for (let i = 0; i < 8; i++) {
    let a = random(TWO_PI), r = random(0.4, 0.8);
    c.colonyGrassTufts.push({
      x: c.isleX + cos(a) * c.isleRX * r,
      y: c.isleY + sin(a) * c.isleRY * r,
      blades: floor(random(4, 8)), height: random(10, 20),
      hue: random(0.7, 1.0), sway: random(TWO_PI),
    });
  }

  if (snd) snd.playSFX('fanfare');
  addFloatingText(width / 2, height * 0.15, 'COLONY LEVEL ' + c.colonyLevel + '!', '#ffdd66');
  addFloatingText(width / 2, height * 0.22, 'Income: +' + c.colonyIncome + 'g/day  Workers: ' + c.colonyWorkers, '#aaddff');
  triggerScreenShake(6, 15);
}

// ─── COLONY BASE SYSTEM ─────────────────────────────────────────────────

function createColony(key, opts) {
  if (state.colonies[key]) return state.colonies[key];
  let col = {
    level: opts.level || 1, buildings: opts.buildings || [],
    population: opts.population || 5, gold: 0,
    income: opts.income || 10, military: opts.military || 0,
    resources: { wood: 0, stone: 0 },
    governor: opts.governor || null, autoHarvest: false, autoTrade: false,
    name: opts.name || key,
    isleX: opts.isleX || 0, isleY: opts.isleY || 0,
    isleRX: opts.isleRX || 300, isleRY: opts.isleRY || 200,
    uniqueResource: opts.uniqueResource || null,
    daysOwned: 0, troopsStationed: 0,
  };
  state.colonies[key] = col;
  addNotification('New colony: ' + col.name + '!', '#88cc88');
  addFloatingText(width / 2, height * 0.15, 'COLONY ESTABLISHED: ' + col.name, '#88cc88');
  if (snd) snd.playSFX('fanfare');
  return col;
}

function ensureConquestColony() {
  if (!state.conquest.colonized) return;
  if (state.colonies['conquest']) return;
  let c = state.conquest;
  createColony('conquest', {
    level: c.colonyLevel || 1, buildings: (c.colonyBuildings || []).map(function(b) { return b.type; }),
    population: c.colonyWorkers || 5, income: c.colonyIncome || 10,
    name: 'Terra Nova', isleX: c.isleX, isleY: c.isleY, isleRX: c.isleRX, isleRY: c.isleRY,
  });
}

// [MOVED TO nations.js] createNationColony

function updateAllColoniesDaily() {
  let keys = Object.keys(state.colonies);
  let totalIncome = 0;
  for (let k of keys) {
    let col = state.colonies[k];
    col.daysOwned = (col.daysOwned || 0) + 1;
    let dayIncome = col.income + floor(col.population * 0.5);
    col.gold += dayIncome;
    state.gold += dayIncome;
    totalIncome += dayIncome;
    if (col.daysOwned % 5 === 0 && col.population < 10 + col.level * 5) col.population += 1;
    if (col.governor && col.daysOwned % 10 === 0 && col.level < 10) {
      col.level += 1; col.income += 3;
      addNotification(col.name + ' grew to level ' + col.level + '!', '#88cc88');
    }
    if (col.uniqueResource && col.level >= 2 && col.daysOwned % 3 === 0) {
      let amt = floor(col.level * 0.5) + 1;
      state[col.uniqueResource] = (state[col.uniqueResource] || 0) + amt;
    }
    if (col.autoTrade && col.gold >= 20) {
      let exported = floor(col.gold * 0.5);
      col.gold -= exported; state.gold += exported; totalIncome += exported;
    }
  }
  if (totalIncome > 0) {
    addNotification('Colony income: +' + totalIncome + 'g from ' + keys.length + ' colonies', '#ddcc66');
  }
}

function getTotalColonyIncome() {
  let total = 0;
  for (let k of Object.keys(state.colonies)) {
    let col = state.colonies[k];
    total += col.income + floor(col.population * 0.5);
  }
  return total;
}

function getColonyCount() { return Object.keys(state.colonies).length; }

// Colony income — called from updateTime
function updateColonyIncome() {
  let c = state.conquest;
  if (c.colonized && c.colonyIncome > 0 && !state.colonies['conquest']) {
    state.gold += c.colonyIncome;
    addNotification('+' + c.colonyIncome + 'g from Terra Nova colony', '#ddcc66');
    // Auto-harvest colony farms
    let harvested = 0;
    for (let p of c.colonyPlots) {
      if (!p.planted) {
        p.planted = true; p.stage = 0; p.timer = 0; p.ripe = false;
      }
      p.timer += 60; // colonies advance crops faster
      if (p.timer >= 300 && p.stage < 3) { p.stage++; p.timer = 0; }
      if (p.stage >= 3 && !p.ripe) { p.ripe = true; }
      if (p.ripe) {
        p.ripe = false; p.stage = 0; p.timer = 0;
        harvested++;
      }
    }
    if (harvested > 0) {
      state.harvest += floor(harvested * 0.5);
      state.seeds += floor(harvested * 0.3);
    }
  }
  // Migrate legacy conquest colony to new system
  ensureConquestColony();
  // Create colonies for vassalized nations
  if (state.nations) {
    for (let nk of Object.keys(state.nations)) {
      let rv = state.nations[nk];
      if (rv && rv.vassal && !state.colonies[nk]) createNationColony(nk);
    }
  }
  // All colonies daily update
  updateAllColoniesDaily();
}


// [MOVED TO nations.js] Nation/Diplomacy/Raid system (lines 15429-18063)
// [MOVED TO building.js] imperial bridge

function updateConquest(dt) {
  let c = state.conquest;
  let p = state.player;
  // Sanity: ensure arrays exist
  if (!Array.isArray(c.enemies)) c.enemies = [];
  if (!Array.isArray(c.soldiers)) c.soldiers = [];
  if (!Array.isArray(c.workers)) c.workers = [];
  if (!Array.isArray(c.trees)) c.trees = [];
  if (!Array.isArray(c.buildings)) c.buildings = [];
  if (!Array.isArray(c.blueprintQueue)) c.blueprintQueue = [];
  if (!Array.isArray(c.lootBag)) c.lootBag = [];
  // Sanity: player position must be a number
  if (isNaN(p.x) || isNaN(p.y)) { p.x = c.isleX; p.y = c.isleY; }
  // Player combat timers
  if (p.attackTimer > 0) p.attackTimer -= dt;
  if (p.invincTimer > 0) p.invincTimer -= dt;
  if (p.slashPhase > 0) p.slashPhase -= dt;
  c.phaseTimer += dt;

  // Player chopping
  if (c.chopTarget) {
    let t = c.chopTarget;
    if (!t.alive) { c.chopTarget = null; c.chopTimer = 0; }
    else {
      let d = dist(p.x, p.y, t.x, t.y);
      if (d > 35) { c.chopTarget = null; c.chopTimer = 0; } // walked away
      else {
        c.chopTimer += dt;
        if (c.chopTimer >= 25) {
          c.chopTimer = 0;
          t.hp--;
          spawnParticles(t.x, t.y, 'chop', 3);
          if (t.hp <= 0) {
            t.alive = false;
            let woodGain = floor(random(2, 4));
            c.woodPile += woodGain;
            addFloatingText(w2sX(t.x), w2sY(t.y) - 10, '+' + woodGain + ' Wood', '#bb8844');
            updateBountyProgress('chop', 1);
            c.chopTarget = null;
            c.chopTimer = 0;
          }
        }
      }
    }
  }

  // Colonized mode — peaceful, no enemies or danger
  if (c.colonized) {
    // Auto-advance colony farms
    for (let p of c.colonyPlots) {
      if (!p.planted) { p.planted = true; p.stage = 0; p.timer = 0; }
      p.timer += dt;
      if (p.timer >= 120 && p.stage < 3) { p.stage++; p.timer = 0; }
      if (p.stage >= 3 && !p.ripe) p.ripe = true;
    }
    // No combat update — skip rest of conquest combat logic
    advanceConquestPhase(c);
    return;
  }

  // Expedition timer + danger escalation
  c.expeditionTimer += dt;
  let dangerMult = (getModifier().dangerMult || 1.0);
  let dangerInterval = (600 + state.expeditionUpgrades.dangerResist * 200) / dangerMult;
  c.dangerLevel = min(10, floor(c.expeditionTimer / dangerInterval));
  let tierMult = state.expeditionUpgrades.expeditionTier;

  // Enemy spawning based on danger level + modifier
  let mod = getModifier();
  if (c.phase !== 'unexplored' && mod.enemyMult > 0) {
    c.spawnTimer -= dt;
    let spawnInterval = max(120, 480 - c.dangerLevel * 40) * (mod.spawnMult || 1.0);
    let maxEnemies = floor((3 + c.dangerLevel) * mod.enemyMult);
    // Scale difficulty when army is deployed (Terra Nova upgrade)
    let armyOnIsland = c.soldiers ? c.soldiers.length : 0;
    if (armyOnIsland > 5) {
      maxEnemies += floor(armyOnIsland * 0.5);
      spawnInterval *= 0.8; // faster spawns
    }
    // Nightfall (danger 10+): constant spawns
    if (c.expeditionTimer > c.expeditionTimeLimit) {
      spawnInterval = max(60, spawnInterval * 0.5);
      maxEnemies += 3;
    }
    if (c.spawnTimer <= 0 && c.enemies.length < maxEnemies && c.enemies.length < 20) {
      // Pick enemy type based on danger
      let types = ['wolf'];
      if (c.dangerLevel >= 3) types.push('boar');
      if (c.dangerLevel >= 5) types.push('bear');
      if (c.dangerLevel >= 7) types.push('dire_wolf');
      let type = types[floor(random(types.length))];
      spawnConquestEnemy(c, type);
      c.spawnTimer = spawnInterval + random(spawnInterval * 0.3);
    }
  }

  // Rare events
  c.rareSpawnTimer += dt;
  if (c.rareSpawnTimer >= 3600) { // check every ~60s
    c.rareSpawnTimer = 0;
    if (c.dangerLevel >= 3 && random() < 0.35) {
      // Treasure cache — drop lots of loot
      let tx = c.isleX + random(-c.isleRX * 0.5, c.isleRX * 0.5);
      let ty = c.isleY + random(-c.isleRY * 0.5, c.isleRY * 0.5);
      dropExpeditionLoot(tx, ty, 'treasure');
      addFloatingText(w2sX(tx), w2sY(ty) - 20, 'TREASURE!', '#ffdd44');
      triggerScreenShake(4, 8);
    }
    if (c.dangerLevel >= 6 && random() < 0.2) {
      // Spawn guardian mini-boss
      spawnConquestEnemy(c, 'guardian');
      addFloatingText(width / 2, height * 0.15, 'ANCIENT GUARDIAN APPEARS!', '#ff4444');
      triggerScreenShake(6, 15);
    }
  }

  // Phase-based advancement still applies for structure
  switch (c.phase) {
    case 'landing':
      break;
    case 'clearing':
    case 'building':
    case 'defending':
      break;
    case 'settled':
      break;
  }

  // Update enemies — purge stuck/corrupt entries
  for (let i = c.enemies.length - 1; i >= 0; i--) {
    let e = c.enemies[i];
    if (!e || !e.state) { c.enemies.splice(i, 1); continue; }
    updateConquestEnemy(e, dt, p, c);
    // Force dead if stuck in dying for too long (>120 frames)
    if (e.state === 'dying' && e.stateTimer < -100) e.state = 'dead';
    if (e.state === 'dead') {
      spawnParticles(e.x, e.y, 'combat', 6);
      if (typeof spawnKillBurst === 'function') {
        let _bc = { wolf: [130, 95, 55], bandit: [105, 80, 55], harpy: [85, 125, 75], secutor: [145, 135, 115],
          minotaur: [110, 70, 45], shield_bearer: [140, 130, 115], archer: [120, 100, 70], centurion: [180, 50, 40] }[e.type] || [150, 150, 150];
        spawnKillBurst(e.x, e.y, _bc);
      }
      if (typeof _killCombo !== 'undefined') { _killCombo++; _killComboDisplay = _killCombo; _killComboDisplayTimer = 90; }
      c.totalKills++;
      if (state.score) state.score.enemiesDefeated++;
      if (typeof advanceNPCQuestCounter === 'function') advanceNPCQuestCounter('nq_marcus_kills', 1);
      updateBountyProgress('kills', 1, e.type);
      dropExpeditionLoot(e.x, e.y, e.type);
      // V1.2: Unit XP from kills
      if (e._killedByUnitType && c.unitXP) {
        let uType = e._killedByUnitType;
        if (c.unitXP[uType] !== undefined) {
          c.unitXP[uType] += 10;
          let xpNeeded = (c.unitLevels[uType] || 1) * 50;
          if (c.unitXP[uType] >= xpNeeded && c.unitLevels[uType] < 5) {
            c.unitLevels[uType]++;
            c.unitXP[uType] = 0;
            addFloatingText(w2sX(e.x), w2sY(e.y) - 40, uType.charAt(0).toUpperCase() + uType.slice(1) + ' Lv' + c.unitLevels[uType] + '!', '#ffdd44');
            if (snd) snd.playSFX('upgrade');
          }
        }
      }
      c.enemies.splice(i, 1);
    }
  }

  // Remove dead soldiers
  c.soldiers = c.soldiers.filter(s => s.hp > 0 || s.state !== 'dead');

  // Update soldiers (pass index for formation)
  for (let i = 0; i < c.soldiers.length; i++) {
    updateConquestSoldier(c.soldiers[i], dt, p, c, i, c.soldiers.length);
  }

  // Update workers
  updateConquestWorkers(dt);

  // V1.2: Barracks auto-generation
  updateConquestBarracks(c, dt);
  // V1.2: Tower auto-fire
  updateConquestTowers(c, dt);
  // V1.2: Update projectiles
  updateConquestProjectiles(c, dt);
  // V1.2: Enemy targeting workers
  updateEnemyWorkerTargeting(c, dt);

  // Phase advancement
  advanceConquestPhase(c);

  // Bounty tracking: danger level + survive time
  updateBountyProgress('danger', c.dangerLevel);
  updateBountyProgress('survive', floor(c.expeditionTimer / 60)); // seconds

  // Fog of war — reveal around player + soldiers every 10 frames
  if (frameCount % 10 === 0) {
    revealFog(p.x, p.y);
    for (let s of c.soldiers) {
      if (s.hp > 0) revealFog(s.x, s.y);
    }
  }

  // Update fishing spot cooldowns
  if (c.fishingSpots) for (let fs of c.fishingSpots) { if (fs.cooldown > 0) fs.cooldown -= dt; }

  // Update wildlife (ambient movement)
  if (c.wildlife) {
    for (let w of c.wildlife) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = floor(random(120, 400));
        let angle = random(TWO_PI);
        w.vx = cos(angle) * (w.type === 'bird' ? 1.2 : 0.6);
        w.vy = sin(angle) * (w.type === 'bird' ? 1.2 : 0.6);
        w.facing = w.vx > 0 ? 1 : -1;
      }
      w.x += w.vx * dt * 0.3;
      w.y += w.vy * dt * 0.3;
      // Slow down
      w.vx *= 0.98; w.vy *= 0.98;
      // Flee from player
      let dw = dist(p.x, p.y, w.x, w.y);
      if (dw < 60) {
        let fa = atan2(w.y - p.y, w.x - p.x);
        w.vx += cos(fa) * 0.8;
        w.vy += sin(fa) * 0.8;
        w.facing = w.vx > 0 ? 1 : -1;
      }
      // Keep on island
      if (!isOnConquestIsland(w.x, w.y)) {
        let toCenter = atan2(c.isleY - w.y, c.isleX - w.x);
        w.vx = cos(toCenter) * 1.5;
        w.vy = sin(toCenter) * 1.5;
      }
    }
  }

  // Player death — retreat with 50% loot
  if (p.hp <= 0) {
    p.hp = floor(p.maxHp * 0.5);
    triggerScreenShake(8, 20);
    exitConquest(true);
  }
}

function spawnConquestEnemy(c, type) {
  let sa = random(TWO_PI);
  let sx = c.isleX + cos(sa) * c.isleRX * 0.85;
  let sy = c.isleY + sin(sa) * c.isleRY * 0.85;
  let statMap = {
    wolf:      { hp: 25,  damage: 6,  speed: 2.0, size: 12 },
    boar:      { hp: 50,  damage: 10, speed: 1.2, size: 16 },
    bear:      { hp: 80,  damage: 15, speed: 1.0, size: 18 },
    dire_wolf: { hp: 40,  damage: 12, speed: 2.8, size: 14 },
    guardian:  { hp: 300, damage: 20, speed: 0.8, size: 22 },
  };
  let stats = statMap[type] || statMap.wolf;
  // Scale HP with danger + expedition tier
  let dangerScale = 1 + c.dangerLevel * 0.15;
  let tierScale = 1 + state.expeditionUpgrades.expeditionTier * 0.2;
  let scaledHp = floor(stats.hp * dangerScale * tierScale);
  // Nightfall speed boost
  let speedMult = (c.expeditionTimer > c.expeditionTimeLimit) ? 1.5 : 1.0;
  c.enemies.push({
    type: type, x: sx, y: sy, vx: 0, vy: 0,
    hp: scaledHp, maxHp: scaledHp, damage: stats.damage,
    speed: stats.speed * speedMult, size: stats.size,
    state: 'chase', stateTimer: 0, attackCooldown: 0,
    facing: 1, flashTimer: 0,
  });
}

function dropExpeditionLoot(x, y, sourceType) {
  let c = state.conquest;
  let lootBonus = (1 + state.expeditionUpgrades.lootBonus * 0.15) * (getModifier().lootMult || 1.0);
  let drops = [];

  if (sourceType === 'treasure') {
    // Treasure cache — guaranteed rare drops
    drops.push({ type: 'iron_ore', qty: floor(random(4, 10) * lootBonus) });
    drops.push({ type: 'rare_hide', qty: floor(random(2, 6) * lootBonus) });
    if (c.dangerLevel >= 5) drops.push({ type: 'titan_bone', qty: floor(random(1, 3)) });
    if (random() < 0.5) drops.push({ type: 'ancient_relic', qty: floor(random(1, 3)) });
    state.gold += floor(40 * lootBonus);
    addFloatingText(w2sX(x), w2sY(y) - 30, '+40 Gold', '#ffcc44');
  } else if (sourceType === 'guardian') {
    // Boss drops
    drops.push({ type: 'ancient_relic', qty: 1 });
    state.gold += 150;
    addFloatingText(w2sX(x), w2sY(y) - 15, '+150 Gold', '#ffcc44');
    if (random() < 0.7) drops.push({ type: 'titan_bone', qty: 1 });
  } else {
    // Normal enemy drops
    state.gold += floor(random(8, 15));
    addFloatingText(w2sX(x), w2sY(y) - 15, '+Gold', '#ffcc44');
    // Common: wood
    if (random() < 0.6) drops.push({ type: 'wood', qty: floor(random(2, 5) * lootBonus) });
    // Uncommon: iron/hide
    if (random() < 0.35 + c.dangerLevel * 0.04) drops.push({ type: 'iron_ore', qty: 1 });
    if (random() < 0.25 + c.dangerLevel * 0.02) drops.push({ type: 'rare_hide', qty: 1 });
    // Rare: relic (danger 5+)
    if (c.dangerLevel >= 4 && random() < 0.12) drops.push({ type: 'ancient_relic', qty: 1 });
    // Very rare: titan bone (danger 7+)
    if (c.dangerLevel >= 6 && random() < 0.08) drops.push({ type: 'titan_bone', qty: 1 });
    // Legion standard — rare quest drop (Chapter 4, danger level 5+)
    if (typeof advanceMainQuestCounter === 'function' && state.mainQuest && state.mainQuest.chapter === 3 &&
        c.dangerLevel >= 5 && random() < 0.08 &&
        (state.mainQuest.counters['mq_standard_found'] || 0) < 1) {
      advanceMainQuestCounter('mq_standard_found', 1);
      addFloatingText(w2sX(x), w2sY(y) - 40, 'LEGION STANDARD FOUND!', '#ffd700');
      spawnParticles(x, y, 'divine', 12);
    }
  }

  // Add to loot bag and show floating text
  for (let d of drops) {
    c.lootBag.push(d);
    // Track loot bounties
    if (d.type === 'iron_ore') updateBountyProgress('loot', d.qty);
    if (d.type === 'rare_hide') updateBountyProgress('loot', d.qty);
    let labels = { wood: 'Wood', iron_ore: 'Iron', rare_hide: 'Hide', ancient_relic: 'Relic!', titan_bone: 'Titan Bone!' };
    let colors = { wood: '#bb8844', iron_ore: '#aabbcc', rare_hide: '#cc9966', ancient_relic: '#ff88ff', titan_bone: '#ffdd88' };
    addFloatingText(w2sX(x) + random(-15, 15), w2sY(y) - 25 - random(10), '+' + d.qty + ' ' + (labels[d.type] || d.type), colors[d.type] || '#ffffff');
  }
}

function updateConquestEnemy(e, dt, p, c) {
  // Safety: corrupted enemy -> mark dead immediately
  if (!e || isNaN(e.x) || isNaN(e.y) || !e.state) { e.state = 'dead'; return; }
  if (e.flashTimer > 0) e.flashTimer -= dt;
  if (e.attackCooldown > 0) e.attackCooldown -= dt;
  // Safety: force dying if hp <= 0 but not already dying/dead
  if (e.hp <= 0 && e.state !== 'dying' && e.state !== 'dead') {
    e.state = 'dying'; e.stateTimer = 15;
  }
  // Safety: stuck in unknown state
  if (!['chase','attack','stagger','dying','dead'].includes(e.state)) {
    e.state = 'chase'; e.stateTimer = 0;
  }

  // Find nearest target (player, soldier, or worker)
  let nearestD = dist(e.x, e.y, p.x, p.y);
  let targetX = p.x, targetY = p.y;
  for (let s of c.soldiers) {
    if (s.hp <= 0) continue;
    let sd = dist(e.x, e.y, s.x, s.y);
    if (sd < nearestD) { nearestD = sd; targetX = s.x; targetY = s.y; }
  }
  // V1.2: Workers are also targets
  for (let w of c.workers) {
    if (!w || w._dead) continue;
    let wd = dist(e.x, e.y, w.x, w.y);
    if (wd < nearestD) { nearestD = wd; targetX = w.x; targetY = w.y; }
  }

  // Palisade blocking — slow enemies near palisades
  for (let b of c.buildings) {
    if (b.type === 'palisade') {
      let bd = dist(e.x, e.y, b.x, b.y);
      if (bd < 30) {
        let pushAng = atan2(e.y - b.y, e.x - b.x);
        e.x += cos(pushAng) * 0.8;
        e.y += sin(pushAng) * 0.8;
      }
    }
  }

  switch (e.state) {
    case 'chase': {
      let dx = targetX - e.x, dy = targetY - e.y;
      let d = sqrt(dx * dx + dy * dy);
      if (d > 0) { e.vx = (dx / d) * e.speed; e.vy = (dy / d) * e.speed; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.facing = dx > 0 ? 1 : -1;
      if (d < e.size + 18 && e.attackCooldown <= 0) {
        e.state = 'attack'; e.stateTimer = 15;
      }
      break;
    }
    case 'attack': {
      e.stateTimer -= dt; e.vx = 0; e.vy = 0;
      if (e.stateTimer <= 0) {
        if (nearestD < e.size + 25) {
          let hitPlayer = dist(e.x, e.y, p.x, p.y) < e.size + 25;
          if (hitPlayer && p.invincTimer <= 0) {
            let armorR = (typeof getPlayerDefenseReduction === 'function') ? getPlayerDefenseReduction() : ([0, 3, 6, 10][p.armor] || 0);
            let dmg = max(1, e.damage - armorR);
            if (typeof getFortifyReduction === 'function') {
              dmg = max(1, floor(dmg * (1 - getFortifyReduction())));
            }
            if (typeof getFactionDamageReduction === 'function') {
              dmg = max(1, floor(dmg * (1 - getFactionDamageReduction())));
            }
            p.hp = max(0, p.hp - dmg);
            p.invincTimer = 30;
            addFloatingText(w2sX(p.x), w2sY(p.y) - 25, '-' + dmg, '#ff6644');
            { let _hda = atan2(p.y - e.y, p.x - e.x); triggerScreenShake(3, 6, cos(_hda), sin(_hda), 'directional'); }
            if (snd) snd.playSFX('player_hurt');
            if (typeof getFortifyReflect === 'function') {
              let reflDmg = getFortifyReflect();
              if (reflDmg > 0) { e.hp -= reflDmg; e.flashTimer = 6; if (typeof _spawnDamageNumber === 'function') _spawnDamageNumber(e.x, e.y, reflDmg, '#aaaaff'); }
            }
            if (typeof _killCombo !== 'undefined') _killCombo = 0;
          } else {
            for (let s of c.soldiers) {
              if (s.hp <= 0) continue;
              if (dist(e.x, e.y, s.x, s.y) < e.size + 20) {
                s.hp -= e.damage;
                s.flashTimer = 6;
                addFloatingText(w2sX(s.x), w2sY(s.y) - 15, '-' + e.damage, '#ff8844');
                break;
              }
            }
          }
        }
        e.state = 'chase';
        e.attackCooldown = 50;
      }
      break;
    }
    case 'stagger': {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        if (e.hp <= 0) { e.state = 'dying'; e.stateTimer = 15; }
        else e.state = 'chase';
      }
      break;
    }
    case 'dying': {
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.state = 'dead';
      break;
    }
  }

  // Clamp to island
  let bex = (e.x - c.isleX) / (c.isleRX - 10);
  let bey = (e.y - c.isleY) / (c.isleRY - 10);
  if (bex * bex + bey * bey > 1) {
    let ba = atan2(e.y - c.isleY, e.x - c.isleX);
    e.x = c.isleX + cos(ba) * (c.isleRX - 12);
    e.y = c.isleY + sin(ba) * (c.isleRY - 12);
  }
}

function getUnitLevelMult(c, unitType) {
  let lv = (c.unitLevels && c.unitLevels[unitType]) ? c.unitLevels[unitType] : 1;
  return { hp: 1 + (lv - 1) * 0.10, damage: 1 + (lv - 1) * 0.10, speed: 1 + (lv - 1) * 0.05, level: lv };
}

function updateConquestSoldier(s, dt, p, c, idx, total) {
  if (!s || isNaN(s.x) || isNaN(s.y)) { if (s) s.hp = 0; return; }
  if (s.hp <= 0) { s.state = 'dead'; return; }
  if (s.flashTimer > 0) s.flashTimer -= dt;
  if (s.attackTimer > 0) s.attackTimer -= dt;
  idx = idx || 0;
  total = total || 1;

  let uType = s._unitType || 'swordsman';
  let uDef = EXPEDITION_UNITS[uType] || EXPEDITION_UNITS.swordsman;
  let lvMult = getUnitLevelMult(c, uType);
  let attackRange = uDef.range;
  let moveSpeed = uDef.speed * lvMult.speed;
  let dmg = floor(uDef.damage * lvMult.damage);
  let detectionRange = uType === 'archer' ? 200 : 140;

  // Find nearest enemy
  let nearestE = null, nearestD = detectionRange;
  for (let e of c.enemies) {
    if (e.state === 'dying' || e.state === 'dead') continue;
    let d = dist(s.x, s.y, e.x, e.y);
    if (d < nearestD) { nearestD = d; nearestE = e; }
  }

  if (nearestE && nearestD < detectionRange) {
    let dx = nearestE.x - s.x, dy = nearestE.y - s.y;
    let d = sqrt(dx * dx + dy * dy);
    s.facing = dx > 0 ? 1 : -1;

    if (uType === 'archer') {
      // Archers: keep distance, fire projectiles
      if (d < 60) {
        s.x -= (dx / d) * moveSpeed * dt;
        s.y -= (dy / d) * moveSpeed * dt;
      } else if (d > attackRange) {
        s.x += (dx / d) * moveSpeed * dt;
        s.y += (dy / d) * moveSpeed * dt;
      }
      if (d <= attackRange && s.attackTimer <= 0) {
        let ad = max(1, d);
        _conquestProjectiles.push({
          x: s.x, y: s.y,
          vx: (dx / ad) * 4, vy: (dy / ad) * 4,
          damage: dmg, life: 60, _unitType: uType
        });
        s.attackTimer = 40;
      }
    } else if (uType === 'cavalry') {
      // Cavalry: charge with speed bonus, extra first-hit damage
      if (d > 25) {
        let chargeSpeed = moveSpeed * (d > 80 ? 1.8 : 1.0);
        s.x += (dx / d) * chargeSpeed * dt;
        s.y += (dy / d) * chargeSpeed * dt;
      } else if (s.attackTimer <= 0) {
        let chargeDmg = s._charging ? floor(dmg * 1.5) : dmg;
        nearestE.hp -= chargeDmg;
        nearestE._killedByUnitType = uType;
        nearestE.flashTimer = 5;
        nearestE.state = 'stagger'; nearestE.stateTimer = 6;
        s.attackTimer = 25;
        s._charging = false;
        let kba = atan2(nearestE.y - s.y, nearestE.x - s.x);
        nearestE.x += cos(kba) * 5;
        nearestE.y += sin(kba) * 5;
        spawnParticles(nearestE.x, nearestE.y, 'combat', 3);
      }
      if (d > 100) s._charging = true;
    } else {
      // Swordsman: melee charge
      if (d > 22) {
        s.x += (dx / d) * moveSpeed * 2 * dt;
        s.y += (dy / d) * moveSpeed * 2 * dt;
      } else if (s.attackTimer <= 0) {
        nearestE.hp -= dmg;
        nearestE._killedByUnitType = uType;
        nearestE.flashTimer = 5;
        nearestE.state = 'stagger'; nearestE.stateTimer = 6;
        s.attackTimer = 30;
        let kba = atan2(nearestE.y - s.y, nearestE.x - s.x);
        nearestE.x += cos(kba) * 3;
        nearestE.y += sin(kba) * 3;
        spawnParticles(nearestE.x, nearestE.y, 'combat', 2);
      }
    }
  } else {
    // FORMATION — form up behind player
    let ftx, fty;
    let facingAngle = atan2(p.vy || 0, p.vx || 0);
    if (abs(p.vx || 0) < 0.1 && abs(p.vy || 0) < 0.1) {
      facingAngle = p.facing > 0 ? 0 : PI;
    }
    let cols = min(5, total);
    let row = floor(idx / cols);
    let col = idx % cols;
    let centerCol = (cols - 1) / 2;
    let perpAngle = facingAngle + HALF_PI;
    let backAngle = facingAngle + PI;
    let spacing = 28;
    let rowDist = 35 + row * 28;
    let lateral = (col - centerCol) * spacing;
    ftx = p.x + cos(backAngle) * rowDist + cos(perpAngle) * lateral;
    fty = p.y + sin(backAngle) * rowDist + sin(perpAngle) * lateral;
    let dx = ftx - s.x, dy = fty - s.y;
    let d = sqrt(dx * dx + dy * dy);
    let spd = d > 60 ? 3.0 : (d > 20 ? 1.8 : 1.0);
    if (d > 6) {
      s.x += (dx / d) * spd * dt;
      s.y += (dy / d) * spd * dt;
    }
    s.facing = dx > 0 ? 1 : (dx < 0 ? -1 : s.facing);
    if (uType === 'cavalry') s._charging = true;
  }

  // Separation
  for (let i = 0; i < c.soldiers.length; i++) {
    let o = c.soldiers[i];
    if (o === s || o.hp <= 0) continue;
    let sdx = s.x - o.x, sdy = s.y - o.y;
    let sd = sdx * sdx + sdy * sdy;
    if (sd < 400 && sd > 0) {
      let sdd = sqrt(sd);
      s.x += (sdx / sdd) * 0.8;
      s.y += (sdy / sdd) * 0.8;
    }
  }

  // Clamp to island
  let bex = (s.x - c.isleX) / (c.isleRX - 15);
  let bey = (s.y - c.isleY) / (c.isleRY - 15);
  if (bex * bex + bey * bey > 1) {
    let ba = atan2(s.y - c.isleY, s.x - c.isleX);
    s.x = c.isleX + cos(ba) * (c.isleRX - 17);
    s.y = c.isleY + sin(ba) * (c.isleRY - 17);
  }
}

// ─── V1.2 RTS SYSTEM FUNCTIONS ──────────────────────────────────────────

function updateConquestBarracks(c, dt) {
  if (c.barracksLevel < 1) return;
  let lvIdx = min(c.barracksLevel - 1, EXPEDITION_BARRACKS.levels.length - 1);
  let lvData = EXPEDITION_BARRACKS.levels[lvIdx];
  let aliveSoldiers = c.soldiers.filter(s => s.hp > 0).length;
  if (aliveSoldiers >= lvData.maxSoldiers) return;
  c.barracksGenTimer -= dt;
  if (c.barracksGenTimer <= 0) {
    c.barracksGenTimer = lvData.genTime;
    let barr = c.buildings.find(b => b.type === 'barracks');
    if (!barr) return;
    let toSpawn = min(lvData.genCount, lvData.maxSoldiers - aliveSoldiers);
    let unitPool = lvData.units;
    for (let i = 0; i < toSpawn; i++) {
      let uType = unitPool[floor(random(unitPool.length))];
      let uDef = EXPEDITION_UNITS[uType] || EXPEDITION_UNITS.swordsman;
      let lvMult = getUnitLevelMult(c, uType);
      let hp = floor(uDef.hp * lvMult.hp);
      let ang = random(TWO_PI);
      c.soldiers.push({
        x: barr.x + cos(ang) * 20, y: barr.y + sin(ang) * 20,
        vx: 0, vy: 0, hp: hp, maxHp: hp,
        state: 'follow', target: null,
        attackTimer: 0, facing: 1, flashTimer: 0,
        _unitType: uType, _charging: uType === 'cavalry',
      });
    }
    addFloatingText(w2sX(barr.x), w2sY(barr.y) - 40, '+' + toSpawn + ' soldiers', '#88cc88');
    if (snd) snd.playSFX('build');
  }
}

function updateConquestTowers(c, dt) {
  if (!c.towerLevels) c.towerLevels = {};
  if (!c.towerTimers) c.towerTimers = {};
  for (let b of c.buildings) {
    if (b.type !== 'watchtower') continue;
    let tKey = floor(b.x) + ',' + floor(b.y);
    if (c.towerLevels[tKey] === undefined) c.towerLevels[tKey] = 0;
    if (c.towerTimers[tKey] === undefined) c.towerTimers[tKey] = 0;
    let tLv = c.towerLevels[tKey];
    let tData = EXPEDITION_TOWER.levels[min(tLv, EXPEDITION_TOWER.levels.length - 1)];
    c.towerTimers[tKey] -= dt;
    if (c.towerTimers[tKey] > 0) continue;
    // Find nearest enemy in range
    let nearE = null, nearD = tData.range;
    for (let e of c.enemies) {
      if (e.state === 'dying' || e.state === 'dead') continue;
      let d = dist(b.x, b.y, e.x, e.y);
      if (d < nearD) { nearD = d; nearE = e; }
    }
    if (nearE) {
      c.towerTimers[tKey] = tData.speed;
      let dx = nearE.x - b.x, dy = nearE.y - b.y;
      let d = max(1, sqrt(dx * dx + dy * dy));
      _conquestProjectiles.push({
        x: b.x, y: b.y - 30,
        vx: (dx / d) * 5, vy: (dy / d) * 5,
        damage: tData.damage, life: 50, _unitType: 'tower'
      });
    }
  }
}

function updateConquestProjectiles(c, dt) {
  for (let i = _conquestProjectiles.length - 1; i >= 0; i--) {
    let pr = _conquestProjectiles[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) { _conquestProjectiles.splice(i, 1); continue; }
    for (let e of c.enemies) {
      if (e.state === 'dying' || e.state === 'dead') continue;
      if (dist(pr.x, pr.y, e.x, e.y) < e.size + 8) {
        e.hp -= pr.damage;
        e.flashTimer = 5;
        e._killedByUnitType = pr._unitType || 'swordsman';
        if (e.hp > 0) { e.state = 'stagger'; e.stateTimer = 4; }
        _conquestProjectiles.splice(i, 1);
        spawnParticles(e.x, e.y, 'combat', 2);
        break;
      }
    }
  }
}

function updateEnemyWorkerTargeting(c, dt) {
  for (let e of c.enemies) {
    if (e.state !== 'chase' || e.hp <= 0) continue;
    for (let w of c.workers) {
      if (!w || w._dead) continue;
      if (!w._hp) { w._hp = 20; w._maxHp = 20; }
      if (dist(e.x, e.y, w.x, w.y) < e.size + 15) {
        w._hp -= e.damage;
        addFloatingText(w2sX(w.x), w2sY(w.y) - 15, '-' + e.damage, '#ff4444');
        if (w._hp <= 0) {
          w._dead = true;
          w._respawnTimer = 1800; // 30s at 60fps
          addFloatingText(w2sX(w.x), w2sY(w.y) - 25, 'Worker killed!', '#ff2222');
        }
        break; // one hit per frame per enemy
      }
    }
  }
  // Handle dead worker respawns
  for (let w of c.workers) {
    if (w && w._dead) {
      w._respawnTimer -= dt;
      if (w._respawnTimer <= 0) {
        w._dead = false;
        w._hp = w._maxHp || 20;
        w.task = 'idle';
        w.taskTarget = null;
        // Respawn near barracks or island center
        let barr = c.buildings.find(b => b.type === 'barracks');
        w.x = barr ? barr.x + random(-20, 20) : c.isleX;
        w.y = barr ? barr.y + random(-20, 20) : c.isleY;
        addFloatingText(w2sX(w.x), w2sY(w.y) - 20, 'Worker respawned', '#77bbaa');
      }
    }
  }
}

function conquestPlayerChop() {
  let c = state.conquest;
  let p = state.player;
  if (c.buildMode) return;
  // Find nearest tree in front of player
  let fAngle = getFacingAngle();
  let best = null, bestD = 40;
  for (let t of c.trees) {
    if (!t.alive) continue;
    let d = dist(p.x, p.y, t.x, t.y);
    if (d > bestD) continue;
    let a = atan2(t.y - p.y, t.x - p.x);
    let diff = a - fAngle;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    if (abs(diff) < PI * 0.5) { best = t; bestD = d; }
  }
  if (best) {
    c.chopTarget = best;
    c.chopTimer = 0;
  }
}

function placeConquestBuilding(wx, wy) {
  let c = state.conquest;
  let type = c.buildType;
  let bp = CONQUEST_BUILDINGS[type];
  if (!bp) return;
  if (c.woodPile < bp.cost) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Need ' + bp.cost + ' wood', '#ff6644');
    return;
  }
  if (!isOnConquestIsland(wx, wy)) {
    addFloatingText(w2sX(wx), w2sY(wy) - 20, "Can't build here", '#ff6644');
    return;
  }
  // Check not too close to another building
  for (let b of c.buildings) {
    if (dist(wx, wy, b.x, b.y) < 28) {
      addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Too close', '#ff6644');
      return;
    }
  }
  // Check not on a tree
  for (let t of c.trees) {
    if (t.alive && dist(wx, wy, t.x, t.y) < 18) {
      addFloatingText(w2sX(wx), w2sY(wy) - 20, 'Clear trees first', '#ff6644');
      return;
    }
  }

  c.woodPile -= bp.cost;

  // If builders available, queue as blueprint; otherwise instant build
  let hasBuilder = c.workers.some(w => w.type === 'builder' && w.task !== 'dead');
  if (hasBuilder && type !== 'campfire') {
    c.blueprintQueue.push({ x: wx, y: wy, type: type, progress: 0, maxProgress: bp.cost * 8 });
    addFloatingText(w2sX(wx), w2sY(wy) - 25, bp.name + ' blueprint placed!', '#aaddff');
  } else {
    completeConquestBuilding(c, wx, wy, type);
  }
  triggerScreenShake(2, 5);
  spawnParticles(wx, wy, 'build', 5);
}

function completeConquestBuilding(c, wx, wy, type) {
  let bp = CONQUEST_BUILDINGS[type];
  c.buildings.push({ x: wx, y: wy, type: type });
  updateBountyProgress('build', 1);
  addFloatingText(w2sX(wx), w2sY(wy) - 25, bp.name + ' built!', '#aaddff');

  // Barracks: initialize auto-gen (no instant soldiers)
  if (type === 'barracks') {
    if (c.barracksLevel < 1) {
      c.barracksLevel = 1;
      c.barracksGenTimer = EXPEDITION_BARRACKS.levels[0].genTime;
      addFloatingText(w2sX(wx), w2sY(wy) - 40, 'Barracks active! Soldiers auto-generate.', '#88cc88');
    }
  }

  // Watchtower: initialize tower level tracking
  if (type === 'watchtower') {
    let tKey = floor(wx) + ',' + floor(wy);
    if (!c.towerLevels) c.towerLevels = {};
    if (!c.towerTimers) c.towerTimers = {};
    c.towerLevels[tKey] = 0;
    c.towerTimers[tKey] = 0;
    addFloatingText(w2sX(wx), w2sY(wy) - 40, 'Tower armed!', '#88aadd');
  }

  // Spawn worker
  let wCap = 2 + state.expeditionUpgrades.workerCap;
  if (bp.workerType && c.workers.length < wCap) {
    spawnConquestWorker(c, wx, wy, bp.workerType);
  }
}

function spawnConquestWorker(c, wx, wy, type) {
  let ang = random(TWO_PI);
  let spd = 1.4 * (1 + state.expeditionUpgrades.workerSpeed * 0.25);
  c.workers.push({
    x: wx + cos(ang) * 15, y: wy + sin(ang) * 15,
    vx: 0, vy: 0, task: 'idle', taskTarget: null, timer: 0,
    type: type, speed: spd, facing: 1,
  });
  addFloatingText(w2sX(wx), w2sY(wy) - 55, '+1 ' + (type === 'chopper' ? 'Chopper' : 'Builder'), '#77bbaa');
}

function updateConquestWorkers(dt) {
  let c = state.conquest;
  let spd = 1.4 * (1 + state.expeditionUpgrades.workerSpeed * 0.25);

  // Purge corrupted workers
  c.workers = c.workers.filter(w => w && !isNaN(w.x) && !isNaN(w.y) && w.type);
  for (let w of c.workers) {
    if (w._dead) continue; // V1.2: skip dead workers awaiting respawn
    w.speed = spd;
    // Safety: unknown task state
    if (!['idle','walking','working'].includes(w.task)) w.task = 'idle';
    switch (w.task) {
      case 'idle': {
        if (w.type === 'chopper') {
          // Find nearest alive tree
          let best = null, bestD = 9999;
          for (let t of c.trees) {
            if (!t.alive) continue;
            let d = dist(w.x, w.y, t.x, t.y);
            if (d < bestD) { bestD = d; best = t; }
          }
          if (best) { w.task = 'walking'; w.taskTarget = best; }
        } else if (w.type === 'builder') {
          // Find nearest unfinished blueprint
          let best = null, bestD = 9999;
          for (let bp of c.blueprintQueue) {
            if (bp.progress >= bp.maxProgress) continue;
            // Skip if another builder is already on it
            let taken = c.workers.some(ow => ow !== w && ow.taskTarget === bp && ow.task !== 'idle');
            if (taken) continue;
            let d = dist(w.x, w.y, bp.x, bp.y);
            if (d < bestD) { bestD = d; best = bp; }
          }
          if (best) { w.task = 'walking'; w.taskTarget = best; }
        }
        break;
      }
      case 'walking': {
        let t = w.taskTarget;
        if (!t || (t.alive === false && w.type === 'chopper')) { w.task = 'idle'; w.taskTarget = null; break; }
        let ddx = t.x - w.x, ddy = t.y - w.y;
        let dd = sqrt(ddx * ddx + ddy * ddy);
        if (dd > 0) {
          w.vx = (ddx / dd) * w.speed;
          w.vy = (ddy / dd) * w.speed;
          w.x += w.vx * dt; w.y += w.vy * dt;
          w.facing = ddx > 0 ? 1 : -1;
        }
        if (dd < 20) { w.task = 'working'; w.timer = 0; }
        break;
      }
      case 'working': {
        w.timer += dt;
        w.vx = 0; w.vy = 0;
        if (w.type === 'chopper') {
          let t = w.taskTarget;
          if (!t || !t.alive) { w.task = 'idle'; w.taskTarget = null; break; }
          if (w.timer >= 50) { // slower than player
            w.timer = 0;
            t.hp--;
            spawnParticles(t.x, t.y, 'chop', 2);
            if (t.hp <= 0) {
              t.alive = false;
              let woodGain = floor(random(2, 4));
              c.woodPile += woodGain;
              addFloatingText(w2sX(t.x), w2sY(t.y) - 10, '+' + woodGain + ' Wood', '#bb8844');
              w.task = 'idle'; w.taskTarget = null;
            }
          }
        } else if (w.type === 'builder') {
          let bp = w.taskTarget;
          if (!bp || bp.progress >= bp.maxProgress) { w.task = 'idle'; w.taskTarget = null; break; }
          bp.progress += dt;
          if (frameCount % 30 === 0) spawnParticles(bp.x, bp.y, 'build', 1);
          if (bp.progress >= bp.maxProgress) {
            completeConquestBuilding(c, bp.x, bp.y, bp.type);
            // Remove from queue
            let idx = c.blueprintQueue.indexOf(bp);
            if (idx >= 0) c.blueprintQueue.splice(idx, 1);
            w.task = 'idle'; w.taskTarget = null;
          }
        }
        break;
      }
    }

    // Clamp to island
    let bex = (w.x - c.isleX) / (c.isleRX - 20);
    let bey = (w.y - c.isleY) / (c.isleRY - 20);
    if (bex * bex + bey * bey > 1) {
      let ba = atan2(w.y - c.isleY, w.x - c.isleX);
      w.x = c.isleX + cos(ba) * (c.isleRX - 22);
      w.y = c.isleY + sin(ba) * (c.isleRY - 22);
    }
  }
}

function drawConquestWorker(w) {
  let sx = w2sX(w.x), sy = w2sY(w.y);
  push();
  translate(floor(sx), floor(sy));
  let sc = w.facing;
  noStroke();

  // Pixel shadow
  fill(0, 0, 0, 30);
  rect(-6, 5, 12, 2);

  // Pixel body (brown tunic)
  fill(140, 110, 70);
  rect(-4, -10, 8, 10);
  // Pixel head
  fill(200, 170, 130);
  rect(-3, -16, 6, 6);
  // Pixel hat
  if (w.type === 'chopper') {
    fill(200, 180, 100);
    rect(-5, -18, 10, 2); // brim
    rect(-2, -20, 4, 2);  // top
  } else {
    fill(120, 90, 50);
    rect(-3, -20, 6, 4);
  }
  // Pixel tool
  if (w.type === 'chopper') {
    fill(100, 80, 50);
    rect(5 * sc, -16, 2, 10); // handle
    fill(160, 160, 170);
    rect(4 * sc, -18, 4, 4); // axe head
  } else {
    fill(100, 80, 50);
    rect(5 * sc, -15, 2, 8); // handle
    fill(140, 130, 120);
    rect(4 * sc, -17, 4, 3); // hammer head
  }
  // Pixel working animation
  if (w.task === 'working') {
    let bob = floor(sin(frameCount * 0.15) * 2);
    fill(255, 220, 100, 100);
    rect(-1, -5 + bob, 2, 2);
    // Pixel sparks
    for (let i = 0; i < 2; i++) {
      let sx2 = floor(sin(frameCount * 0.2 + i * 3) * 6);
      let sy2 = floor(-12 - abs(cos(frameCount * 0.15 + i * 2)) * 4);
      fill(255, 200, 80, 150 - i * 50);
      rect(sx2, sy2, 2, 2);
    }
  }
  // Pixel eyes
  fill(40, 30, 20);
  rect(-2, -14, 1, 1);
  rect(1, -14, 1, 1);
  // Task label
  if (w.task !== 'idle') {
    fill(200, 180, 130, 120); textSize(5); textAlign(CENTER);
    let label = w.task === 'walking' ? (w.type === 'chopper' ? 'to tree' : 'to site') : (w.type === 'chopper' ? 'chopping' : 'building');
    text(label, 0, -22);
  }
  // V1.2: Worker HP bar when damaged
  if (w._hp !== undefined && w._hp < (w._maxHp || 20)) {
    fill(40, 15, 15, 160);
    rect(-8, -25, 16, 2);
    fill(200, 80, 50);
    rect(-8, -25, floor(16 * (w._hp / (w._maxHp || 20))), 2);
  }
  pop();
}

function conquestPlayerAttack() {
  // Route through faction combat system
  if (typeof factionPlayerAttack === 'function') {
    factionPlayerAttack();
    return;
  }
  // Fallback: original attack
  let p = state.player;
  let c = state.conquest;
  if (p.attackTimer > 0) return;
  p.attackTimer = p.attackCooldown;
  p.slashPhase = 10;
  let fAngle = getFacingAngle();
  let arcHalf = PI * 0.3;
  let range = p.attackRange + (p.weapon === 1 ? 12 : 0);
  let dmg = floor(([15, 20, 25][p.weapon] || 15) * (typeof getNatBestiaryBonus === 'function' ? getNatBestiaryBonus() : 1));
  dmg = floor(dmg * (getFactionData().combatDamageMult || 1));
  let lg = state.legia;
  if (lg && lg.deployed > 0) dmg = floor(dmg * (1 + lg.deployed * 0.15));
  if (c.buildings.some(b => b.type === 'campfire')) dmg += 3;
  if (typeof hasTech === 'function' && hasTech('siege_weapons')) dmg = floor(dmg * 1.3);
  for (let e of c.enemies) {
    if (e.state === 'dying' || e.state === 'dead') continue;
    let d = dist(p.x, p.y, e.x, e.y);
    if (d > range + e.size) continue;
    let angle = atan2(e.y - p.y, e.x - p.x);
    let diff = angle - fAngle;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    if (abs(diff) > arcHalf) continue;
    e.hp -= dmg; e.flashTimer = 6; e.state = 'stagger'; e.stateTimer = 8;
    let kba = atan2(e.y - p.y, e.x - p.x);
    e.x += cos(kba) * 5; e.y += sin(kba) * 5;
    addFloatingText(w2sX(e.x), w2sY(e.y) - 20, '-' + dmg, '#ff4444');
    spawnParticles(e.x, e.y, 'combat', 4);
    triggerScreenShake(2, 4, cos(kba), sin(kba), 'directional');
  }
}

// ─── CONQUEST DRAWING ────────────────────────────────────────────────────

let _cqVerts = null;
function _getCqVerts(rx, ry) {
  if (!_cqVerts) _cqVerts = generateIslandCoastline(42, 64, rx, ry, [{angle: PI*0.3, strength: 0.07, width: 0.4, type: 'headland'}, {angle: PI*1.4, strength: 0.05, width: 0.3, type: 'bay'}]);
  return _cqVerts;
}

function drawConquestIsleDistant() {
  if (state.conquest.active) return;
  let c = state.conquest;
  let sx = w2sX(c.isleX);
  let sy = w2sY(c.isleY);
  // Clamp to horizon — never float above water
  let _horizY = max(height * 0.06, height * 0.25 - horizonOffset) + 10;
  sy = max(sy, _horizY);
  // Distance-based scaling
  let _dScale = null;
  if (typeof _getDistantScale === 'function') {
    _dScale = _getDistantScale(c.isleX, c.isleY, c.isleRX);
    if (_dScale.dist > (typeof _getMaxViewDist === 'function' ? _getMaxViewDist() : 4000)) return;
  }
  if (sx < -350 || sx > width + 350 || sy < -350 || sy > height + 350) return;
  push();
  noStroke();
  if (_dScale && _dScale.scale < 0.98) {
    translate(sx, sy); scale(_dScale.scale); translate(-sx, -sy);
  }
  let _cBright = getSkyBrightness();

  let _cqSeed = 42;
  if (c.colonized) {
    // Colonized: organic coastline terrain
    let rx = c.isleRX, ry = c.isleRY;
    let cqV = _getCqVerts(rx, ry);
    drawIslandBase(sx, sy, rx, ry, cqV, ISLAND_PALETTES.default, 'medium');
    // Golden colony glow
    fill(255, 220, 100, 8);
    drawIslandCoastShape(sx, sy, cqV, 0.75, rx, ry, -5);
    // Dock indicator at south shore
    fill(120, 90, 50);
    rect(floor(sx - 4), floor(sy + ry * 0.88), 8, 14);
    fill(100, 75, 40);
    rect(floor(sx - 6), floor(sy + ry * 0.86), 12, 3);
  } else {
    // Unexplored / in-progress: organic coastline terrain (wild)
    let rx = c.isleRX, ry = c.isleRY;
    let ct = frameCount * 0.01;
    let cqV = _getCqVerts(rx, ry);
    drawIslandBase(sx, sy, rx, ry, cqV, ISLAND_PALETTES.default, 'medium');
    // Dense forest interior on top
    fill(28, 62, 25);
    drawIslandCoastShape(sx, sy, cqV, 0.7, rx, ry, -4);
    // Hills / ridgeline
    fill(22, 55, 20); drawIslandShape(sx - 15, sy - 8, 50, 32, -6, _cqSeed + 2);
    fill(28, 68, 25); drawIslandShape(sx + 10, sy - 14, 37, 24, -6, _cqSeed + 3);
    fill(35, 78, 32); drawIslandShape(sx - 5, sy - 18, 26, 16, -6, _cqSeed + 4);
    // Tree canopy clusters
    for (let i = 0; i < 14; i++) {
      let ta = (i * 2.39996) % TWO_PI;
      let tr = ((i * 17 + 5) % 70) / 100 * 0.65;
      let tpx = sx + cos(ta) * rx * tr;
      let tpy = sy + sin(ta) * ry * tr * 0.69;
      fill(20, 50 + (i % 4) * 5, 18, 120);
      ellipse(tpx, tpy, 16 + (i % 3) * 4, 10 + (i % 3) * 3);
      fill(30, 65 + (i % 3) * 6, 28, 80);
      ellipse(tpx - 2, tpy - 2, 10 + (i % 2) * 3, 6 + (i % 2) * 2);
    }
    // Mist over wild island
    fill(160, 180, 160, 18 + sin(frameCount * 0.015) * 10);
    drawIslandCoastShape(sx, sy, cqV, 0.65, rx, ry, -2);
    // Enemy camp fires visible from distance (if explored)
    if (c.phase !== 'unexplored' && c.phase !== 'locked') {
      for (let i = 0; i < 3; i++) {
        let fa = (i / 3) * TWO_PI + 0.8;
        let fr = rx * 0.35;
        let fx = sx + cos(fa) * fr;
        let fy = sy + sin(fa) * fr * 0.6;
        let fl = sin(frameCount * 0.12 + i * 2) * 2;
        fill(255, 140, 30, 120); rect(floor(fx - 2), floor(fy - 6 + fl), 4, 5);
        fill(255, 80, 15, 60); rect(floor(fx - 1), floor(fy - 8 + fl), 2, 3);
        fill(120, 110, 100, 20); ellipse(fx, fy - 12 + fl, 8, 4);
      }
    }
    // Resource deposits (wood piles, ore veins)
    fill(100, 70, 35, 80);
    rect(floor(sx + rx * 0.3), floor(sy + ry * 0.2), 8, 5);
    rect(floor(sx + rx * 0.32), floor(sy + ry * 0.18), 6, 4);
    fill(120, 110, 95, 60);
    rect(floor(sx - rx * 0.35), floor(sy - ry * 0.15), 6, 4);
    rect(floor(sx - rx * 0.33), floor(sy - ry * 0.17), 4, 3);
    // Beacon fire on settled islands
    if (c.phase === 'settled' || c.buildings.length > 0) {
      let fl = floor(sin(frameCount * 0.12) * 2);
      fill(255, 160, 40, 140);
      rect(floor(sx - 2), floor(sy - 22 + fl), 5, 7);
      fill(255, 100, 20, 80);
      rect(floor(sx - 1), floor(sy - 24 + fl), 3, 4);
    }
    // Dock indicator
    fill(100, 75, 40);
    rect(floor(sx - 3), floor(sy + ry * 0.88), 6, 12);
    fill(120, 90, 50);
    rect(floor(sx - 5), floor(sy + ry * 0.86), 10, 3);
  }
  // Final atmospheric wash over entire island — stronger with distance
  let _cRX = c.isleRX, _cRY = c.isleRY;
  let _horizHaze = max(0, 1 - (sy - _horizY) / 200) * 25;
  let _cHazeA = _dScale ? max(10, floor(_dScale.haze * 0.5 + _horizHaze)) : floor(10 * _cBright + _horizHaze);
  fill(160, 185, 210, _cHazeA);
  let _cqHV = _getCqVerts(_cRX, _cRY);
  drawIslandCoastShape(sx, sy, _cqHV, 1.1, _cRX, _cRY, -2);
  pop();
}

function drawConquestIsland() {
  let c = state.conquest;
  let ix = w2sX(c.isleX);
  let iy = w2sY(c.isleY);
  push();
  noStroke();

  // Organic coastline base (close LOD)
  let cqV = _getCqVerts(c.isleRX, c.isleRY);
  drawIslandBase(ix, iy, c.isleRX, c.isleRY, cqV, ISLAND_PALETTES.default, 'close');

  // Lighter meadow center (cleared area)
  let clearRadius = map(c.trees.filter(t => !t.alive).length, 0, c.trees.length, 0.3, 1.2);
  fill(70, 120, 48, 60);
  drawIslandCoastShape(ix, iy, cqV, clearRadius * 0.5, c.isleRX, c.isleRY, -5);

  // Phase atmosphere
  if (c.phase === 'landing' || c.phase === 'unexplored') {
    // Edge mist
    fill(140, 160, 140, 18 + sin(frameCount * 0.02) * 8);
    drawIslandCoastShape(ix, iy, cqV, 1.0, c.isleRX, c.isleRY, -2);
  } else if (c.phase === 'defending') {
    // Red danger tinge at edges
    fill(180, 40, 30, 10 + sin(frameCount * 0.05) * 6);
    drawIslandCoastShape(ix, iy, cqV, 1.05, c.isleRX, c.isleRY, -2);
  } else if (c.phase === 'settled') {
    // Golden glow
    fill(255, 220, 100, 8);
    drawIslandCoastShape(ix, iy, cqV, 0.75, c.isleRX, c.isleRY, -5);
  }

  // Grass tufts
  fill(75, 130, 50, 70);
  for (let i = 0; i < 25; i++) {
    let ga = (i / 25) * TWO_PI + i * 2.3;
    let gr = (i % 5 + 1.5) * c.isleRX * 0.11;
    ellipse(ix + cos(ga) * gr, iy + sin(ga) * gr * 0.69, 7, 3);
  }

  // Crystal nodes ground glow
  for (let cn of (c.crystalNodes || [])) {
    if (cn.collected) continue;
    let csx = w2sX(cn.x), csy = w2sY(cn.y);
    fill(80, 180, 220, 30 + sin(frameCount * 0.06 + cn.x) * 15);
    ellipse(csx, csy, 20, 10);
  }
  // Fishing spots water ripples
  for (let fs of (c.fishingSpots || [])) {
    let fsx = w2sX(fs.x), fsy = w2sY(fs.y);
    let rp = sin(frameCount * 0.04 + fs.x) * 3;
    noFill(); stroke(180, 220, 240, fs.cooldown > 0 ? 40 : 80); strokeWeight(1);
    ellipse(fsx, fsy, 18 + rp, 10 + rp * 0.5);
    noStroke();
    if (fs.cooldown <= 0) { fill(200, 230, 250, 60 + sin(frameCount * 0.08) * 20); ellipse(fsx, fsy, 6, 4); }
  }

  // Y-sorted: trees + buildings + resources + wildlife
  let sortItems = [];
  for (let t of (c.trees || [])) {
    if (!t || isNaN(t.y)) continue;
    sortItems.push({ y: t.y, draw: () => { try { drawConquestTree(t); } catch(e) { /* skip */ } } });
  }
  for (let b of (c.buildings || [])) {
    if (!b || isNaN(b.y)) continue;
    sortItems.push({ y: b.y + 8, draw: () => { try { drawConquestBuilding(b); } catch(e) { /* skip */ } } });
  }
  for (let cn of (c.crystalNodes || [])) {
    if (cn.collected) continue;
    sortItems.push({ y: cn.y, draw: () => {
      let sx2 = w2sX(cn.x), sy2 = w2sY(cn.y);
      push(); noStroke();
      fill(60, 80, 100); ellipse(sx2, sy2 + 2, 10, 5);
      let sh = sin(frameCount * 0.08 + cn.x * 0.1) * 20;
      fill(100+sh, 190+sh, 230); triangle(sx2-4, sy2, sx2-2, sy2-12, sx2, sy2);
      fill(120+sh, 200+sh, 240); triangle(sx2-1, sy2, sx2+1, sy2-16, sx2+3, sy2);
      fill(90+sh, 170+sh, 220); triangle(sx2+2, sy2, sx2+4, sy2-10, sx2+6, sy2);
      if (frameCount % 30 < 5) { fill(255,255,255,200); ellipse(sx2+1, sy2-14, 3, 3); }
      let dp = dist(state.player.x, state.player.y, cn.x, cn.y);
      if (dp < 50) { fill(200,230,255,180); textSize(9); textAlign(CENTER); text('[E] Mine', sx2, sy2-20); }
      pop();
    }});
  }
  for (let rd of (c.resourceDeposits || [])) {
    if (rd.depleted) continue;
    sortItems.push({ y: rd.y, draw: () => {
      let rx2 = w2sX(rd.x), ry2 = w2sY(rd.y);
      push(); noStroke();
      if (rd.type === 'iron') {
        fill(90,80,70); ellipse(rx2, ry2+2, 14, 8);
        beginShape(); vertex(rx2-7, ry2+1); vertex(rx2-4, ry2-7); vertex(rx2+2, ry2-9); vertex(rx2+7, ry2-4); vertex(rx2+6, ry2+1); endShape(CLOSE);
        stroke(160,140,100,150); strokeWeight(0.8); line(rx2-3, ry2-4, rx2+1, ry2-6); line(rx2+2, ry2-2, rx2+5, ry2-5); noStroke();
      } else {
        fill(130,125,115); ellipse(rx2, ry2+2, 14, 8);
        fill(120,115,105); ellipse(rx2-3, ry2-2, 10, 8);
        fill(140,135,125); ellipse(rx2+3, ry2-1, 8, 7);
      }
      if (rd.hp < rd.maxHp) { let pr = rd.hp / rd.maxHp; fill(40,40,40,140); rect(rx2-8, ry2+6, 16, 2, 1); fill(200,160,60); rect(rx2-8, ry2+6, 16*pr, 2, 1); }
      let dp = dist(state.player.x, state.player.y, rd.x, rd.y);
      if (dp < 50) { fill(200,200,180,180); textSize(9); textAlign(CENTER); text('[E] Mine ' + (rd.type === 'iron' ? 'Iron' : 'Stone'), rx2, ry2-14); }
      pop();
    }});
  }
  for (let fs of (c.fishingSpots || [])) {
    sortItems.push({ y: fs.y, draw: () => {
      let fx2 = w2sX(fs.x), fy2 = w2sY(fs.y);
      let dp = dist(state.player.x, state.player.y, fs.x, fs.y);
      if (dp < 60) { push(); fill(fs.cooldown > 0 ? color(150,150,150,140) : color(100,200,230,200)); textSize(9); textAlign(CENTER); text(fs.cooldown > 0 ? 'Fished recently...' : '[E] Fish', fx2, fy2-12); pop(); }
    }});
  }
  for (let wl of (c.wildlife || [])) {
    sortItems.push({ y: wl.y, draw: () => {
      let wx2 = w2sX(wl.x), wy2 = w2sY(wl.y);
      push(); noStroke();
      if (wl.type === 'bird') {
        let fl = sin(frameCount * 0.15 + wl.x) * 3;
        fill(80,70,50); ellipse(wx2, wy2, 6, 4);
        fill(100,90,65); ellipse(wx2 - 3*wl.facing, wy2-1+fl, 5, 2);
        fill(200,150,50); ellipse(wx2 + 3*wl.facing, wy2-1, 2, 1.5);
      } else {
        fill(170,150,120); ellipse(wx2, wy2, 7, 5);
        fill(180,160,130); ellipse(wx2 + 3*wl.facing, wy2-2, 5, 4);
        fill(190,170,140); ellipse(wx2 + 3*wl.facing-1, wy2-5, 2, 4); ellipse(wx2 + 3*wl.facing+1, wy2-5, 2, 4);
        fill(210,200,180); ellipse(wx2 - 3*wl.facing, wy2, 3, 3);
      }
      pop();
    }});
  }
  sortItems.sort((a, b) => a.y - b.y);
  for (let it of sortItems) it.draw();

  // Build ghost (if in build mode)
  if (c.buildMode) drawConquestBuildGhost();

  // Parked ship at south shore dock — only when player is on the island
  if (!c.active) { pop(); return; }
  let shipX = c.shipX || c.isleX;
  let shipY = c.shipY || (c.isleY + c.isleRY * 0.92 + 15);
  let bsx = w2sX(shipX);
  let bsy = w2sY(shipY);
  let bob = sin(frameCount * 0.03) * 1.5;
  // Docked warship — side-view trireme matching sailing ship style
  push();
  translate(bsx, bsy + bob);
  noStroke();

  // Water around hull — gentle lapping
  let wt = frameCount * 0.03;
  for (let i = 0; i < 4; i++) {
    let wakeX = -55 - i * 8 + sin(wt + i) * 2;
    fill(180, 210, 230, 30 - i * 5);
    ellipse(wakeX, 8, 14 - i, 3);
  }
  fill(200, 225, 240, 20 + sin(wt * 1.5) * 10);
  ellipse(60, 3, 10, 4);
  // Hull reflection
  fill(40, 70, 100, 20);
  ellipse(0, 16, 110, 12);

  // --- TRIREME HULL ---
  fill(75, 45, 20);
  beginShape();
  vertex(-55, 0);
  vertex(-50, 10);
  vertex(40, 10);
  vertex(55, 4);
  vertex(60, -2);
  vertex(50, -4);
  vertex(-45, -4);
  vertex(-52, -2);
  endShape(CLOSE);

  // Hull planking
  stroke(90, 55, 25, 80);
  strokeWeight(0.6);
  line(-48, 2, 50, 2);
  line(-46, 6, 45, 6);
  noStroke();

  // Bronze ram
  fill(160, 120, 40);
  beginShape();
  vertex(50, -3); vertex(65, -1); vertex(50, 3);
  endShape(CLOSE);
  fill(180, 140, 50, 150);
  triangle(52, -2, 62, -1, 52, 1);

  // Oar bank (resting — angled down)
  stroke(100, 70, 35);
  strokeWeight(1.2);
  for (let i = 0; i < 8; i++) {
    let ox = -38 + i * 10;
    let oarLen = 12;
    line(ox, 8, ox - 2, 8 + oarLen);
  }
  noStroke();

  // Deck
  fill(100, 68, 32);
  rect(-48, -6, 96, 5, 1);
  // Deck rail
  fill(85, 55, 25);
  rect(-48, -8, 96, 2, 1);

  // Shields along rail
  for (let i = 0; i < 8; i++) {
    let shx = -40 + i * 11;
    fill(140, 30, 25);
    ellipse(shx, -8, 6, 6);
    fill(180, 160, 60);
    ellipse(shx, -8, 2.5, 2.5);
  }

  // --- MAST + FURLED SAIL ---
  // Mast
  fill(90, 60, 28);
  rect(-2, -45, 4, 39, 1);
  // Yard arm
  fill(80, 52, 24);
  rect(-24, -43, 48, 3, 1);
  // Furled sail on yard
  fill(220, 205, 175, 200);
  rect(-22, -41, 44, 5, 2);
  // Red stripe on furled sail
  fill(160, 40, 30, 160);
  rect(-22, -39, 44, 2, 1);

  // Rigging
  stroke(100, 80, 50, 80);
  strokeWeight(0.8);
  line(0, -45, -48, -6);
  line(0, -45, 48, -6);
  line(0, -45, 0, -6);
  noStroke();

  // Stern post (curved)
  noFill();
  stroke(120, 80, 30);
  strokeWeight(2.5);
  beginShape();
  vertex(-50, -4);
  quadraticVertex(-56, -18, -48, -28);
  endShape();
  noStroke();
  // Eagle standard
  fill(180, 140, 50);
  ellipse(-48, -30, 6, 6);
  fill(200, 160, 60);
  triangle(-51, -30, -45, -30, -48, -35);

  // Stern cabin
  fill(80, 50, 22);
  rect(-52, -6, 12, 8, 1);
  fill(95, 65, 30);
  rect(-51, -5, 10, 6, 1);
  // Cabin window
  fill(140, 170, 180, 80);
  rect(-48, -3, 4, 2, 0.5);

  // Flag at mast top — faction color
  let flagWave = sin(frameCount * 0.04) * 3;
  let _cmf = getFactionMilitary();
  fill(_cmf.conquestFlag[0], _cmf.conquestFlag[1], _cmf.conquestFlag[2]);
  beginShape();
  vertex(0, -45);
  vertex(0, -53);
  vertex(12 + flagWave, -49);
  endShape(CLOSE);

  // Anchor hanging from bow
  stroke(120, 120, 120);
  strokeWeight(1.5);
  line(45, 4, 45, 14);
  noStroke();
  fill(100, 100, 100);
  ellipse(45, 15, 4, 4);
  // Anchor arms
  stroke(100, 100, 100);
  strokeWeight(1);
  line(43, 14, 40, 18);
  line(47, 14, 50, 18);
  noStroke();

  pop();
  // Board ship prompt when player is near
  let p = state.player;
  let dShip = dist(p.x, p.y, shipX, shipY);
  if (dShip < 70) {
    fill(220, 210, 170, 200 + sin(frameCount * 0.08) * 30);
    textSize(10); textAlign(CENTER);
    text('[E] Board Ship', bsx, bsy - 22);
  }

  pop();
}

function drawConquestTree(t) {
  let sx = w2sX(t.x);
  let sy = w2sY(t.y);
  let sz = t.size || 1;
  push();
  noStroke();
  if (t.alive) {
    // Highlight if this is the chop target
    let isTarget = state.conquest.chopTarget === t;
    // Shadow
    fill(0, 0, 0, 25);
    ellipse(sx + 2, sy + 4, 18 * sz, 7 * sz);
    // Trunk
    fill(isTarget ? 140 : 85, isTarget ? 100 : 60, isTarget ? 60 : 32);
    rect(sx - 2 * sz, sy - 14 * sz, 4 * sz, 18 * sz);
    // Foliage layers
    fill(35 + (isTarget ? 20 : 0), 90, 28);
    triangle(sx - 11 * sz, sy - 9 * sz, sx + 11 * sz, sy - 9 * sz, sx, sy - 30 * sz);
    fill(45 + (isTarget ? 20 : 0), 108, 33);
    triangle(sx - 9 * sz, sy - 16 * sz, sx + 9 * sz, sy - 16 * sz, sx, sy - 33 * sz);
    fill(55 + (isTarget ? 20 : 0), 118, 38);
    triangle(sx - 6 * sz, sy - 22 * sz, sx + 6 * sz, sy - 22 * sz, sx, sy - 35 * sz);
    // Damage marks
    if (t.hp < t.maxHp) {
      stroke(200, 150, 80, 180);
      strokeWeight(1.2);
      for (let ch = 0; ch < (t.maxHp - t.hp); ch++) {
        line(sx - 1 + ch * 3, sy - 6 + ch * 2, sx + 2 + ch * 3, sy - 2 + ch * 2);
      }
      noStroke();
    }
    // Chop progress indicator
    if (isTarget) {
      let prog = state.conquest.chopTimer / 25;
      fill(40, 40, 40, 140);
      rect(sx - 10, sy + 8, 20, 3, 1);
      fill(200, 160, 60);
      rect(sx - 10, sy + 8, 20 * prog, 3, 1);
    }
    // E key prompt when nearby
    if (!isTarget) {
      let dp = dist(state.player.x, state.player.y, t.x, t.y);
      if (dp < 40) { fill(200, 180, 130, 180); textSize(9); textAlign(CENTER); text('[E] Chop', sx, sy - 38 * sz); }
    }
  } else {
    // Stump
    fill(75, 50, 28);
    ellipse(sx, sy, 9 * sz, 6 * sz);
    rect(sx - 4 * sz, sy - 5 * sz, 8 * sz, 6 * sz, 1);
    // Rings on stump top
    noFill(); stroke(100, 75, 45, 80); strokeWeight(0.5);
    ellipse(sx, sy - 3 * sz, 4 * sz, 3 * sz);
    noStroke();
    // Scattered chips
    fill(110, 80, 45, 60);
    ellipse(sx - 6, sy + 2, 3, 2);
    ellipse(sx + 5, sy + 1, 2, 3);
    ellipse(sx - 3, sy + 4, 2, 2);
  }
  pop();
}

function drawConquestBuilding(b) {
  let sx = w2sX(b.x);
  let sy = w2sY(b.y);
  push();
  noStroke();
  // Shadow
  fill(0, 0, 0, 20);
  ellipse(sx + 2, sy + 4, 30, 10);

  switch (b.type) {
    case 'campfire': {
      // Stone ring
      fill(120, 110, 95);
      for (let i = 0; i < 8; i++) {
        let a = (i / 8) * TWO_PI;
        ellipse(sx + cos(a) * 9, sy + sin(a) * 6, 6, 5);
      }
      // Logs
      fill(90, 65, 35);
      push(); translate(sx, sy); rotate(0.3);
      rect(-8, -1, 16, 3, 1);
      rotate(-0.6);
      rect(-7, -1, 14, 3, 1);
      pop();
      // Fire
      let fl = sin(frameCount * 0.15) * 2;
      fill(255, 180, 40, 200);
      ellipse(sx, sy - 5 + fl, 12, 16);
      fill(255, 100, 20, 160);
      ellipse(sx + sin(frameCount * 0.2) * 1, sy - 8 + fl, 7, 11);
      fill(255, 60, 10, 100);
      ellipse(sx, sy - 10 + fl, 3, 6);
      // Embers
      if (frameCount % 12 < 6) {
        fill(255, 200, 80, 100);
        ellipse(sx + sin(frameCount * 0.08) * 4, sy - 14 + fl, 2, 2);
      }
      // Ground glow
      fill(255, 140, 40, 15);
      ellipse(sx, sy, 60, 40);
      break;
    }
    case 'palisade': {
      // Posts with variation
      for (let i = -3; i <= 3; i++) {
        let h = 20 + (i % 2) * 3;
        fill(95 + i * 3, 65 + i * 2, 32);
        rect(sx + i * 6 - 2, sy - h, 5, h + 4);
        // Pointed top
        fill(85, 58, 28);
        triangle(sx + i * 6 - 2, sy - h, sx + i * 6 + 3, sy - h, sx + i * 6 + 0.5, sy - h - 5);
      }
      // Cross beams
      fill(80, 55, 28);
      rect(sx - 20, sy - 12, 40, 3, 1);
      rect(sx - 19, sy - 6, 38, 2, 1);
      break;
    }
    case 'hut': {
      // Warm limestone walls
      fill(195, 178, 148);
      rect(sx - 16, sy - 10, 32, 18);
      // Wall stone texture — pixel blocks
      fill(180, 162, 132, 80);
      for (let i = 0; i < 3; i++) rect(sx - 14 + i * 11, sy - 8, 8, 14);
      fill(205, 188, 158, 40);
      rect(sx - 12, sy - 6, 6, 4); // light stone highlight
      // Door — warm wood
      fill(95, 68, 38);
      rect(sx - 4, sy - 4, 9, 12);
      fill(75, 52, 28);
      rect(sx - 2, sy - 2, 2, 10); // plank line
      fill(180, 150, 70);
      rect(sx + 3, sy + 1, 2, 2); // handle
      // Terracotta tile roof
      fill(185, 88, 48);
      beginShape();
      vertex(sx - 20, sy - 10);
      vertex(sx, sy - 26);
      vertex(sx + 20, sy - 10);
      endShape(CLOSE);
      // Roof tile rows — pixel terracotta
      fill(170, 78, 42);
      for (let ri = 0; ri < 3; ri++) {
        let ry2 = sy - 10 - ri * 5;
        let rw = 18 - ri * 5;
        rect(sx - rw, ry2, rw * 2, 2);
      }
      // Roof ridge — darker
      fill(155, 68, 35);
      rect(sx - 3, sy - 27, 6, 3);
      // Window with warm light
      fill(235, 200, 130, 160);
      rect(sx + 8, sy - 6, 6, 6);
      fill(250, 220, 150, 70);
      rect(sx + 6, sy - 8, 10, 10); // window glow
      break;
    }
    case 'watchtower': {
      // Base — warm sandstone
      fill(165, 148, 115);
      rect(sx - 9, sy - 8, 18, 16);
      // Tower body
      fill(178, 160, 125);
      rect(sx - 7, sy - 36, 14, 30);
      // Stone block texture
      fill(155, 138, 105, 70);
      for (let i = 0; i < 4; i++) {
        rect(sx - 5, sy - 30 + i * 7, 10, 5);
      }
      // Platform
      fill(148, 132, 100);
      rect(sx - 12, sy - 38, 24, 4);
      // Crenellations
      fill(138, 122, 92);
      for (let i = -1; i <= 1; i++) {
        rect(sx + i * 8 - 3, sy - 43, 5, 5);
      }
      // Flag — faction color
      let _cfm = getFactionMilitary();
      fill(_cfm.conquestFlag[0], _cfm.conquestFlag[1], _cfm.conquestFlag[2], 210);
      let fw = sin(frameCount * 0.05) * 2.5;
      rect(sx + 8, sy - 50, 2, 14);
      triangle(sx + 10, sy - 50, sx + 20 + fw, sy - 47, sx + 10, sy - 44);
      break;
    }
    case 'barracks': {
      // Large building — warm limestone
      fill(175, 155, 118);
      rect(sx - 22, sy - 12, 44, 22);
      // Stone foundation — darker
      fill(148, 135, 108);
      rect(sx - 23, sy + 8, 46, 4);
      // Door (wide)
      fill(80, 55, 30);
      rect(sx - 6, sy - 6, 12, 16, 1);
      // Barracks emblem — faction
      let _bfm = getFactionMilitary();
      fill(_bfm.conquestFlag[0], _bfm.conquestFlag[1], _bfm.conquestFlag[2]);
      ellipse(sx, sy - 10, 6, 6);
      fill(200, 180, 80);
      rect(sx - 0.5, sy - 13, 1, 6);
      // Roof
      fill(105, 75, 38);
      beginShape();
      vertex(sx - 26, sy - 12);
      vertex(sx, sy - 30);
      vertex(sx + 26, sy - 12);
      endShape(CLOSE);
      // Windows
      fill(200, 180, 120, 130);
      rect(sx - 16, sy - 6, 5, 5, 1);
      rect(sx + 12, sy - 6, 5, 5, 1);
      // Weapon rack detail
      fill(150, 140, 120);
      rect(sx + 16, sy - 4, 2, 10);
      rect(sx + 19, sy - 2, 2, 8);
      break;
    }
  }
  pop();
}

function drawConquestBuildGhost() {
  let c = state.conquest;
  let bp = CONQUEST_BUILDINGS[c.buildType];
  if (!bp) return;
  let wx = s2wX(mouseX);
  let wy = s2wY(mouseY);
  let sx = w2sX(wx);
  let sy = w2sY(wy);
  let valid = isOnConquestIsland(wx, wy) && c.woodPile >= bp.cost;
  // Check tree/building proximity
  if (valid) {
    for (let t of c.trees) { if (t.alive && dist(wx, wy, t.x, t.y) < 18) { valid = false; break; } }
  }
  if (valid) {
    for (let b of c.buildings) { if (dist(wx, wy, b.x, b.y) < 28) { valid = false; break; } }
  }
  push();
  drawingContext.globalAlpha = valid ? 0.5 : 0.25;
  drawConquestBuilding({ x: wx, y: wy, type: c.buildType });
  drawingContext.globalAlpha = 1;
  // Ring
  noFill();
  if (valid) {
    stroke(0, 255, 136, 90 + sin(frameCount * 0.1) * 40);
    let pulse = 1 + sin(frameCount * 0.08) * 0.04;
    strokeWeight(1.5);
    ellipse(sx, sy, 36 * pulse, 24 * pulse);
  } else {
    stroke(255, 60, 60, 70);
    strokeWeight(1.5);
    ellipse(sx, sy, 36, 24);
    stroke(255, 60, 60, 120);
    strokeWeight(2);
    line(sx - 6, sy - 4, sx + 6, sy + 4);
    line(sx + 6, sy - 4, sx - 6, sy + 4);
  }
  noStroke();
  pop();
}

function drawConquestSoldier(s) {
  let sx = w2sX(s.x);
  let sy = w2sY(s.y);
  if (s.hp <= 0) return;
  let mil = getFactionMilitary();
  let uType = s._unitType || 'swordsman';
  let uDef = EXPEDITION_UNITS[uType] || EXPEDITION_UNITS.swordsman;
  let c = state.conquest;
  let uLv = (c && c.unitLevels && c.unitLevels[uType]) ? c.unitLevels[uType] : 1;
  push();
  translate(floor(sx), floor(sy));
  noStroke();
  let f = s.flashTimer > 0;
  // Pixel shadow
  fill(0, 0, 0, 25);
  rect(-7, 6, 14, 2);
  // Pixel legs
  fill(f ? 255 : mil.legs[0], f ? 255 : mil.legs[1], f ? 255 : mil.legs[2]);
  let leg = floor(sin(frameCount * 0.12 + s.x) * 1.5);
  rect(-3, 4 + leg, 2, 6);
  rect(1, 4 - leg, 2, 6);
  // Pixel body — tinted by unit type
  let bc = uDef.color;
  fill(f ? 255 : bc[0], f ? 255 : bc[1], f ? 255 : bc[2]);
  rect(-6, -6, 12, 12);
  // Pixel armor plate
  fill(f ? 255 : mil.armor[0], f ? 255 : mil.armor[1], f ? 255 : mil.armor[2]);
  if (uLv >= 5) {
    // Level 5: full armor detail
    rect(-5, -6, 10, 10);
    fill(f ? 255 : mil.armor[0] + 20, f ? 255 : mil.armor[1] + 20, f ? 255 : mil.armor[2] + 20);
    rect(-3, -4, 6, 2);
  } else {
    rect(-4, -5, 8, 8);
  }
  // Pixel head
  fill(f ? 255 : 200, f ? 255 : 175, f ? 255 : 135);
  rect(-4, -12, 8, 6);
  // Pixel helmet — level 3+ gets extra detail
  fill(f ? 255 : mil.helm[0], f ? 255 : mil.helm[1], f ? 255 : mil.helm[2]);
  rect(-5, -14, 10, 4);
  if (uLv >= 3) {
    fill(f ? 255 : mil.helm[0] - 20, f ? 255 : mil.helm[1] - 20, f ? 255 : mil.helm[2] - 20);
    rect(-6, -15, 12, 2); // wider helmet brim
  }
  // Pixel plume
  fill(f ? 255 : mil.plume[0], f ? 255 : mil.plume[1], f ? 255 : mil.plume[2]);
  rect(-1, -18, 2, 4);

  if (uType === 'archer') {
    // Bow instead of shield
    fill(f ? 255 : 120, f ? 255 : 80, f ? 255 : 40);
    rect(-s.facing * 7, -8, 2, 14);
    // Quiver
    fill(f ? 255 : 100, f ? 255 : 70, f ? 255 : 35);
    rect(s.facing * 5, -8, 3, 8);
  } else if (uType === 'cavalry') {
    // Horse body underneath
    fill(f ? 255 : 140, f ? 255 : 110, f ? 255 : 70);
    rect(-8, 2, 16, 6, 2);
    // Horse legs
    fill(f ? 255 : 120, f ? 255 : 90, f ? 255 : 50);
    rect(-6, 8, 2, 4); rect(4, 8, 2, 4);
    // Lance
    fill(f ? 255 : 195, f ? 255 : 195, f ? 255 : 205);
    rect(s.facing * 6, -16, 2, 18);
  } else {
    // Swordsman — shield + sword
    fill(f ? 255 : mil.shield[0], f ? 255 : mil.shield[1], f ? 255 : mil.shield[2]);
    if (mil.shieldShape === 'round') ellipse(-s.facing * 8, 0, 9, 9);
    else rect(-s.facing * 8 - 3, -4, 6, 10);
    fill(f ? 255 : mil.shieldBoss[0], f ? 255 : mil.shieldBoss[1], f ? 255 : mil.shieldBoss[2]);
    rect(-s.facing * 8 - 1, -1, 2, 4);
    fill(f ? 255 : 195, f ? 255 : 195, f ? 255 : 205);
    rect(s.facing * 6, -10, 2, 12);
  }
  // Pixel eyes
  fill(30);
  rect(-3, -11, 2, 2);
  rect(1, -11, 2, 2);
  // HP bar
  if (s.hp < s.maxHp) {
    fill(40, 15, 15, 160);
    rect(-10, -20, 20, 3);
    fill(80, 180, 50);
    rect(-10, -20, floor(20 * (s.hp / s.maxHp)), 3);
  }
  // Level dots above head
  if (uLv > 1) {
    fill(255, 220, 80);
    for (let li = 0; li < uLv - 1; li++) {
      rect(-4 + li * 3, -22, 2, 2);
    }
  }
  pop();
}

function drawConquestEntities() {
  let c = state.conquest;
  let p = state.player;
  if (!c) return;
  let items = [];
  for (let e of (c.enemies || [])) {
    if (!e || isNaN(e.y)) continue;
    items.push({ y: e.y, draw: () => { try { drawOneEnemy(e); } catch(err) { /* skip */ } } });
  }
  for (let s of (c.soldiers || [])) {
    if (!s || s.hp <= 0 || isNaN(s.y)) continue;
    items.push({ y: s.y, draw: () => { try { drawConquestSoldier(s); } catch(err) { /* skip */ } } });
  }
  for (let w of (c.workers || [])) {
    if (!w || isNaN(w.y) || w._dead) continue;
    items.push({ y: w.y, draw: () => { try { drawConquestWorker(w); } catch(err) { /* skip */ } } });
  }
  // Centurion on conquest island
  items.push({ y: state.centurion.y, draw: drawCenturion });
  // Draw blueprint ghosts
  for (let bp of c.blueprintQueue) {
    let bpx = w2sX(bp.x), bpy = w2sY(bp.y);
    items.push({ y: bp.y, draw: () => {
      push();
      let prog = bp.progress / bp.maxProgress;
      tint(255, 100 + 155 * prog);
      // Translucent outline of building
      fill(200, 180, 120, 60 + 120 * prog);
      stroke(255, 200, 100, 80);
      strokeWeight(1);
      rect(bpx - 12, bpy - 12, 24, 24, 3);
      noStroke();
      // Progress bar
      let barW = 20;
      fill(40, 40, 40, 150);
      rect(bpx - barW/2, bpy + 14, barW, 3, 1);
      fill(100, 220, 100);
      rect(bpx - barW/2, bpy + 14, barW * prog, 3, 1);
      // Label
      fill(200, 180, 120, 160);
      textSize(9); textAlign(CENTER);
      let bpDef = CONQUEST_BUILDINGS[bp.type];
      text(bpDef ? bpDef.name : bp.type, bpx, bpy + 22);
      pop();
    }});
  }
  items.push({ y: p.y, draw: () => {
    if (p.invincTimer > 0 && frameCount % 4 < 2) return;
    drawPlayer();
  }});
  items.sort((a, b) => a.y - b.y);
  for (let it of items) it.draw();
  drawSlashArc();

  // V1.2: Draw projectiles (arrows)
  push();
  noStroke();
  for (let pr of _conquestProjectiles) {
    let px = w2sX(pr.x), py = w2sY(pr.y);
    let a = atan2(pr.vy, pr.vx);
    push();
    translate(px, py);
    rotate(a);
    fill(pr._unitType === 'tower' ? color(200, 180, 100) : color(160, 140, 80));
    rect(-6, -1, 12, 2);
    fill(220, 200, 160);
    triangle(6, -2, 10, 0, 6, 2);
    pop();
  }
  pop();

  // V1.2: Barracks progress bar
  if (c.barracksLevel > 0) {
    let barr = c.buildings.find(b => b.type === 'barracks');
    if (barr) {
      let bx = w2sX(barr.x), by = w2sY(barr.y);
      let lvIdx = min(c.barracksLevel - 1, EXPEDITION_BARRACKS.levels.length - 1);
      let lvData = EXPEDITION_BARRACKS.levels[lvIdx];
      let prog = 1 - (c.barracksGenTimer / lvData.genTime);
      push(); noStroke();
      fill(30, 30, 30, 150);
      rect(bx - 15, by - 28, 30, 4, 1);
      fill(100, 200, 100);
      rect(bx - 15, by - 28, floor(30 * prog), 4, 1);
      // Soldier count
      let alive = c.soldiers.filter(s => s.hp > 0).length;
      fill(220, 200, 160); textSize(8); textAlign(CENTER);
      text(alive + '/' + lvData.maxSoldiers, bx, by - 32);
      pop();
    }
  }

  // V1.2: Tower range circle when player near
  for (let b of c.buildings) {
    if (b.type !== 'watchtower') continue;
    let pd = dist(state.player.x, state.player.y, b.x, b.y);
    if (pd > 80) continue;
    let tKey = floor(b.x) + ',' + floor(b.y);
    let tLv = (c.towerLevels && c.towerLevels[tKey]) || 0;
    let tData = EXPEDITION_TOWER.levels[min(tLv, EXPEDITION_TOWER.levels.length - 1)];
    push();
    noFill();
    stroke(100, 180, 255, 40);
    strokeWeight(1);
    let bsx = w2sX(b.x), bsy = w2sY(b.y);
    ellipse(bsx, bsy, tData.range * 2, tData.range * 2);
    // Tower level label
    fill(180, 200, 255, 180); noStroke(); textSize(8); textAlign(CENTER);
    text('Lv' + (tLv + 1), bsx, bsy - 50);
    // Upgrade prompt
    if (pd < 45 && tData.upgradeCost) {
      let cost = tData.upgradeCost;
      fill(220, 220, 200, 200); textSize(9);
      text('[E] Upgrade (' + (cost.wood || 0) + 'w ' + (cost.stone || 0) + 's' + (cost.gold ? ' ' + cost.gold + 'g' : '') + ')', bsx, bsy + 20);
    }
    pop();
  }

  // V1.2: Barracks upgrade prompt when player near
  for (let b of c.buildings) {
    if (b.type !== 'barracks') continue;
    let pd = dist(state.player.x, state.player.y, b.x, b.y);
    if (pd > 45) continue;
    let lvIdx = c.barracksLevel - 1;
    if (lvIdx < 0) lvIdx = 0;
    if (lvIdx < EXPEDITION_BARRACKS.levels.length - 1) {
      let lvData = EXPEDITION_BARRACKS.levels[lvIdx];
      if (lvData.upgradeCost) {
        let cost = lvData.upgradeCost;
        let bsx = w2sX(b.x), bsy = w2sY(b.y);
        push(); fill(220, 220, 200, 200); noStroke(); textSize(9); textAlign(CENTER);
        text('[E] Upgrade Barracks (' + (cost.wood || 0) + 'w ' + (cost.stone || 0) + 's' + (cost.gold ? ' ' + cost.gold + 'g' : '') + ')', bsx, bsy + 26);
        pop();
      }
    }
  }
}

function drawConquestHUD() {
  let p = state.player;
  let c = state.conquest;
  push();

  // HP Bar (top center)
  let barW = 200, barH = 14;
  let barX = width / 2 - barW / 2, barY = 12;
  fill(30, 10, 10, 200);
  rect(barX - 2, barY - 2, barW + 4, barH + 4, 5);
  fill(60, 20, 15);
  rect(barX, barY, barW, barH, 4);
  let hpFrac = max(0, p.hp / p.maxHp);
  let hpCol = hpFrac > 0.5 ? color(180, 50, 30) : (hpFrac > 0.25 ? color(200, 120, 20) : color(220, 40, 40));
  fill(hpCol);
  rect(barX, barY, barW * hpFrac, barH, 4);
  fill(255); textSize(9); textAlign(CENTER, CENTER);
  text('HP ' + max(0, floor(p.hp)) + ' / ' + p.maxHp, width / 2, barY + barH / 2);

  // Danger bar (top center, below HP)
  let dangerY = barY + barH + 6;
  let dangerW = 160, dangerH = 8;
  let dangerX = width / 2 - dangerW / 2;
  let dangerFrac = min(1, c.expeditionTimer / c.expeditionTimeLimit);
  fill(20, 15, 10, 180);
  rect(dangerX - 1, dangerY - 1, dangerW + 2, dangerH + 2, 3);
  // Gradient: green->yellow->red
  let dr = dangerFrac < 0.5 ? lerp(60, 220, dangerFrac * 2) : lerp(220, 255, (dangerFrac - 0.5) * 2);
  let dg = dangerFrac < 0.5 ? lerp(180, 180, dangerFrac * 2) : lerp(180, 40, (dangerFrac - 0.5) * 2);
  fill(dr, dg, 30);
  rect(dangerX, dangerY, dangerW * dangerFrac, dangerH, 2);
  fill(255, 240, 200, 200); textSize(10); textAlign(CENTER, CENTER);
  text('DANGER ' + c.dangerLevel, width / 2, dangerY + dangerH / 2);

  // Danger warning effects
  if (dangerFrac > 0.75) {
    // Red pulsing border
    let pa = sin(frameCount * 0.08) * 40 + 40;
    noFill();
    stroke(255, 40, 20, pa);
    strokeWeight(3);
    rect(0, 0, width, height);
    noStroke();
  }
  if (dangerFrac >= 1.0) {
    // NIGHTFALL text
    fill(255, 60, 30, 180 + sin(frameCount * 0.1) * 50);
    textSize(14); textAlign(CENTER);
    text('NIGHTFALL', width / 2, dangerY + dangerH + 16);
  } else if (dangerFrac > 0.5) {
    fill(220, 180, 80, 140); textSize(11); textAlign(CENTER);
    text('Danger rising...', width / 2, dangerY + dangerH + 12);
  }

  // Phase objective
  let phaseY = dangerY + dangerH + 22;
  fill(180, 170, 140, 140); textSize(9); textAlign(CENTER);
  if (c.colonized) {
    fill(130, 200, 130, 180);
    text('Colony LV.' + c.colonyLevel + ' — Peaceful', width / 2, phaseY);
    if (state.imperialBridge.built) {
      fill(200, 180, 100, 150); textSize(11);
      text('[E] near east shore to return via bridge', width / 2, phaseY + 14);
    }
  } else {
    text(getPhaseObjective(c.phase), width / 2, phaseY);
  }

  // Expedition number + modifier
  let modInfo = getModifier();
  fill(200, 190, 160, 100); textSize(10);
  let expLabel = 'Expedition #' + c.expeditionNum;
  if (state.expeditionModifier && state.expeditionModifier !== 'normal') {
    expLabel += '  [' + modInfo.name + ']';
  }
  fill(modInfo.color || '#bbbbbb');
  text(expLabel, width / 2, phaseY + 12);

  // Left panel — resources
  let lx = 12, ly = 12;
  fill(20, 20, 20, 160);
  rect(lx - 4, ly - 4, 140, 140, 5);
  fill(200, 180, 130); textSize(9); textAlign(LEFT, TOP);
  // Wood
  fill(160, 120, 60); rect(lx, ly, 8, 8, 1);
  fill(220, 200, 150); text('Wood: ' + c.woodPile, lx + 12, ly);
  // Stone
  fill(160, 160, 160); rect(lx, ly + 13, 8, 8, 1);
  fill(220, 200, 150); text('Stone: ' + (c.stonePile || 0), lx + 12, ly + 13);
  // Soldiers — show count/max
  let maxSol = 0;
  if (c.barracksLevel > 0) {
    let lvIdx = min(c.barracksLevel - 1, EXPEDITION_BARRACKS.levels.length - 1);
    maxSol = EXPEDITION_BARRACKS.levels[lvIdx].maxSoldiers;
  }
  { let _fc3 = (typeof getFactionData === 'function' ) ? getFactionData() : null; let _sc = _fc3 ? _fc3.bannerColor : [180, 50, 40]; fill(_sc[0], _sc[1], _sc[2]); }; rect(lx, ly + 26, 8, 8, 1);
  fill(220, 200, 150);
  let aliveSoldiers = c.soldiers.filter(s => s.hp > 0).length;
  text('Soldiers: ' + aliveSoldiers + (maxSol > 0 ? '/' + maxSol : ''), lx + 12, ly + 26);
  // Barracks level
  if (c.barracksLevel > 0) {
    fill(180, 160, 120); text('Barracks Lv' + c.barracksLevel, lx + 12, ly + 39);
  }
  // Workers
  fill(140, 110, 70); rect(lx, ly + 52, 8, 8, 1);
  fill(220, 200, 150);
  let aliveWorkers = c.workers.filter(w => !w._dead).length;
  text('Workers: ' + aliveWorkers + '/' + c.workers.length, lx + 12, ly + 52);
  // Trees
  let livingTrees = c.trees.filter(t => t.alive).length;
  fill(50, 100, 35); rect(lx, ly + 65, 8, 8, 1);
  fill(220, 200, 150); text('Trees: ' + livingTrees, lx + 12, ly + 65);
  // Buildings
  fill(140, 120, 80); rect(lx, ly + 78, 8, 8, 1);
  fill(220, 200, 150); text('Built: ' + c.buildings.length + ' | Queue: ' + c.blueprintQueue.length, lx + 12, ly + 78);
  // Gold
  fill(200, 180, 60); rect(lx, ly + 91, 8, 8, 1);
  fill(220, 200, 150); text('Gold: ' + state.gold, lx + 12, ly + 91);
  // Loot bag count
  fill(180, 140, 200); rect(lx, ly + 104, 8, 8, 1);
  fill(220, 200, 150); text('Loot: ' + c.lootBag.length + ' items', lx + 12, ly + 104);
  // Unit levels
  if (c.unitLevels) {
    let ulY = ly + 117;
    fill(255, 220, 80, 180); textSize(8);
    let ulText = '';
    for (let ut of ['swordsman', 'archer', 'cavalry']) {
      let lv = c.unitLevels[ut] || 1;
      if (lv > 1 || c.barracksLevel >= 4) {
        ulText += ut.charAt(0).toUpperCase() + ':' + lv + ' ';
      }
    }
    if (ulText) text(ulText.trim(), lx, ulY);
  }

  // Potion
  if (p.potions > 0) {
    fill(100, 220, 100, 180); textSize(11);
    text('Potions: ' + p.potions + ' [Q]', lx, ly + 130);
  }

  // Bottom bar — equipment + controls
  fill(20, 20, 20, 120);
  rect(0, height - 26, width, 26);
  fill(160, 150, 130, 140); textSize(11); textAlign(RIGHT, BOTTOM);
  text(WEAPONS[p.weapon].name + ' | ' + ARMORS[p.armor].name, width - 10, height - 14);
  fill(130, 120, 100, 120);
  text('WASD move | SPACE attack | SHIFT sprint | ALT dodge | B build | Q potion | E interact/chop/mine/fish/board', width - 10, height - 3);

  // Build mode UI
  if (c.buildMode) drawConquestBuildUI();

  pop();
}

function drawConquestBuildUI() {
  let c = state.conquest;
  let types = Object.keys(CONQUEST_BUILDINGS);
  let slotW = 80, slotH = 50;
  let totalW = types.length * slotW + (types.length - 1) * 4;
  let startX = width / 2 - totalW / 2;
  let startY = height - 85;

  // Background
  push();
  fill(20, 20, 20, 180);
  rect(startX - 8, startY - 6, totalW + 16, slotH + 12, 6);

  for (let i = 0; i < types.length; i++) {
    let t = types[i];
    let bp = CONQUEST_BUILDINGS[t];
    let tx = startX + i * (slotW + 4);
    let selected = c.buildType === t;
    let canAfford = c.woodPile >= bp.cost;

    // Slot bg
    fill(selected ? color(60, 80, 50, 200) : color(40, 40, 40, 160));
    stroke(selected ? color(120, 200, 100, 180) : color(80, 70, 60, 80));
    strokeWeight(selected ? 2 : 1);
    rect(tx, startY, slotW, slotH, 4);
    noStroke();

    // Key hint
    fill(selected ? 255 : 160); textSize(11); textAlign(CENTER, TOP);
    text('[' + bp.key + ']', tx + slotW / 2, startY + 2);
    // Name
    fill(canAfford ? (selected ? 255 : 200) : color(120, 80, 80));
    textSize(11);
    text(bp.name, tx + slotW / 2, startY + 12);
    // Cost
    fill(canAfford ? color(180, 160, 100) : color(160, 60, 50));
    textSize(10);
    text(bp.cost + ' wood', tx + slotW / 2, startY + 23);
    // Desc
    fill(140, 130, 110, 140); textSize(9);
    text(bp.desc, tx + slotW / 2, startY + 33);
    // Soldiers bonus
    if (bp.soldiers > 0) {
      fill(100, 200, 100, 160); textSize(9);
      text('+' + bp.soldiers + ' soldier' + (bp.soldiers > 1 ? 's' : ''), tx + slotW / 2, startY + 41);
    }
  }
  pop();
}

