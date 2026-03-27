// ═══════════════════════════════════════════════════════════════
// FACTION EMBLEMS & MUSIC SYSTEM — Mare Nostrum V2
// ═══════════════════════════════════════════════════════════════
// This module provides:
// 1. FACTION EMBLEMS: Unique p5.js-drawn symbols for each faction
// 2. FACTION MUSIC: Framework for faction-specific music themes
//
// FACTION EMBLEMS
// ───────────────
// Each faction has a distinctive visual emblem that can be drawn at any size.
// Emblems use only p5.js primitives (no images) for maximum compatibility.
// Usage: drawFactionEmblem('rome', x, y, size)
//
// Factions:
//   - Rome: Eagle with spread wings (SPQR aquila) — martial, imperial
//   - Carthage: Tanit symbol (crescent + circle + triangle) — sacred geometry
//   - Egypt: Eye of Horus (Wedjat Eye) — mystical, protective
//   - Greece: Corinthian helmet in profile — classical warrior
//   - Persia: Faravahar (winged disc) — divine majesty
//   - Phoenicia: Cedar tree — seafaring commerce
//   - Gaul: Celtic war boar — fierce wild power
//   - Sea People: Kraken/octopus tentacles — chaos and mystery
//
// FACTION MUSIC SYSTEM
// ────────────────────
// The game supports faction-specific music variants. When a player selects a faction,
// the sound system will automatically use faction-specific music themes if available.
//
// HOW IT WORKS:
// 1. Base tracks exist: music_peaceful, music_night, music_sailing, etc.
// 2. Faction variants are loaded as: music_peaceful_rome, music_peaceful_carthage, etc.
// 3. In sound.js updateMusic(), if a faction variant exists, it plays instead of base
// 4. If variant doesn't exist, it falls back to the base track
//
// GENERATING FACTION MUSIC:
// To add faction-specific music, generate audio files and place them in sounds/ folder:
//   - music_peaceful_rome.mp3        (Martial brass/horns, steady march rhythm)
//   - music_peaceful_carthage.mp3    (Mediterranean flutes, trading port feel)
//   - music_peaceful_egypt.mp3       (Mysterious harps, desert wind, minor scales)
//   - music_peaceful_greece.mp3      (Lyrical lyre-like arpeggios, philosophical)
//   - music_peaceful_persia.mp3      (Rich oud-like plucked strings, ornamental scales)
//   - music_peaceful_phoenicia.mp3   (Seafaring chanty rhythm, wave sounds)
//   - music_peaceful_gaul.mp3        (Celtic pipes, driving war drums)
//   - music_peaceful_seapeople.mp3   (Dark droning, ominous deep tones, crashing)
//
// SAME PATTERN for all base tracks:
//   - music_night_<faction>.mp3
//   - music_sailing_<faction>.mp3
//   - music_combat_<faction>.mp3
//   - etc.
//
// ═══════════════════════════════════════════════════════════════

/**
 * Master function to draw any faction emblem
 * @param {string} faction - Faction key ('rome', 'carthage', 'egypt', 'greece', 'persia', 'phoenicia', 'gaul', 'seapeople')
 * @param {number} x - Center X coordinate
 * @param {number} y - Center Y coordinate
 * @param {number} size - Emblem size (base scale)
 */
function drawFactionEmblem(faction, x, y, size) {
  switch(faction) {
    case 'rome': drawEmblemRome(x, y, size); break;
    case 'carthage': drawEmblemCarthage(x, y, size); break;
    case 'egypt': drawEmblemEgypt(x, y, size); break;
    case 'greece': drawEmblemGreece(x, y, size); break;
    case 'persia': drawEmblemPersia(x, y, size); break;
    case 'phoenicia': drawEmblemPhoenicia(x, y, size); break;
    case 'gaul': drawEmblemGaul(x, y, size); break;
    case 'seapeople': drawEmblemSeaPeople(x, y, size); break;
  }
}

/**
 * ROME — Eagle with spread wings (SPQR aquila)
 * Symbol of Roman military might and imperial power
 */
function drawEmblemRome(x, y, size) {
  push();
  let s = size;
  let goldColor = color(200, 170, 50);
  let brownColor = color(80, 50, 20);

  // Eagle body (centered)
  fill(brownColor);
  ellipse(x, y, s * 0.25, s * 0.35);

  // Head
  fill(brownColor);
  ellipse(x, y - s * 0.15, s * 0.18, s * 0.22);

  // Eye (gold)
  fill(goldColor);
  ellipse(x + s * 0.05, y - s * 0.15, s * 0.05, s * 0.06);

  // Beak
  fill(goldColor);
  triangle(x + s * 0.08, y - s * 0.12, x + s * 0.15, y - s * 0.10, x + s * 0.08, y - s * 0.08);

  // Left wing (spread outward)
  fill(brownColor);
  stroke(goldColor);
  strokeWeight(s * 0.02);
  beginShape();
  vertex(x - s * 0.08, y - s * 0.05);
  vertex(x - s * 0.25, y - s * 0.15);
  vertex(x - s * 0.32, y - s * 0.08);
  vertex(x - s * 0.28, y + s * 0.05);
  endShape(CLOSE);

  // Right wing (spread outward, mirror)
  beginShape();
  vertex(x + s * 0.08, y - s * 0.05);
  vertex(x + s * 0.25, y - s * 0.15);
  vertex(x + s * 0.32, y - s * 0.08);
  vertex(x + s * 0.28, y + s * 0.05);
  endShape(CLOSE);

  // Wing feather details
  stroke(goldColor);
  strokeWeight(s * 0.015);
  for (let i = 0; i < 4; i++) {
    line(x - s * (0.12 + i * 0.04), y - s * (0.08 + i * 0.02),
         x - s * (0.10 + i * 0.04), y + s * (0.02 - i * 0.01));
    line(x + s * (0.12 + i * 0.04), y - s * (0.08 + i * 0.02),
         x + s * (0.10 + i * 0.04), y + s * (0.02 - i * 0.01));
  }

  // Tail feathers
  noStroke();
  fill(brownColor);
  triangle(x - s * 0.1, y + s * 0.15, x, y + s * 0.25, x + s * 0.1, y + s * 0.15);

  // Shield base under eagle
  stroke(goldColor);
  strokeWeight(s * 0.025);
  noFill();
  rect(x - s * 0.2, y + s * 0.1, s * 0.4, s * 0.25, s * 0.05);

  pop();
}

/**
 * CARTHAGE — Tanit symbol (triangle body with crescent moon and circle head)
 * Sacred symbol representing the Carthaginian goddess
 */
function drawEmblemCarthage(x, y, size) {
  push();
  let s = size;
  let purpleColor = color(180, 140, 220);
  let goldColor = color(220, 180, 60);
  let darkColor = color(60, 20, 80);

  // Crescent moon (upper center)
  fill(purpleColor);
  ellipse(x, y - s * 0.15, s * 0.25, s * 0.25);
  fill(10, 18, 35); // background color
  ellipse(x + s * 0.05, y - s * 0.15, s * 0.2, s * 0.2);

  // Star inside crescent (Tanit star)
  fill(goldColor);
  beginShape();
  for (let i = 0; i < 5; i++) {
    let angle = TWO_PI * i / 5 - PI / 2;
    let outerRad = s * 0.06;
    let px = x + cos(angle) * outerRad;
    let py = y - s * 0.15 + sin(angle) * outerRad;
    vertex(px, py);
    angle = TWO_PI * (i + 0.5) / 5 - PI / 2;
    outerRad = s * 0.03;
    px = x + cos(angle) * outerRad;
    py = y - s * 0.15 + sin(angle) * outerRad;
    vertex(px, py);
  }
  endShape(CLOSE);

  // Circle (disk) at bottom
  fill(purpleColor);
  stroke(goldColor);
  strokeWeight(s * 0.02);
  ellipse(x, y + s * 0.05, s * 0.22, s * 0.22);

  // Triangle body (Tanit triangle)
  fill(darkColor);
  stroke(goldColor);
  strokeWeight(s * 0.025);
  triangle(x - s * 0.18, y + s * 0.12,
           x + s * 0.18, y + s * 0.12,
           x, y + s * 0.28);

  // Connection lines from circle to triangle
  stroke(goldColor);
  strokeWeight(s * 0.015);
  line(x - s * 0.08, y + s * 0.13, x - s * 0.14, y + s * 0.14);
  line(x + s * 0.08, y + s * 0.13, x + s * 0.14, y + s * 0.14);

  pop();
}

/**
 * EGYPT — Eye of Horus (Wedjat Eye)
 * Ancient Egyptian symbol of protection, royal power, and completeness
 */
function drawEmblemEgypt(x, y, size) {
  push();
  let s = size;
  let goldColor = color(200, 170, 40);
  let tealColor = color(64, 176, 160);
  let darkColor = color(30, 25, 20);

  // Upper eyelid (almond shape)
  fill(goldColor);
  stroke(goldColor);
  strokeWeight(s * 0.02);
  arc(x, y - s * 0.08, s * 0.32, s * 0.20, PI, TWO_PI);

  // Lower eyelid
  arc(x, y + s * 0.08, s * 0.32, s * 0.20, 0, PI);

  // Eye white
  fill(tealColor);
  noStroke();
  ellipse(x, y, s * 0.18, s * 0.24);

  // Iris (dark inner circle)
  fill(darkColor);
  ellipse(x, y, s * 0.12, s * 0.15);

  // Pupil (gold highlight)
  fill(goldColor);
  ellipse(x + s * 0.03, y - s * 0.04, s * 0.05, s * 0.06);

  // Eyebrow line
  noFill();
  stroke(goldColor);
  strokeWeight(s * 0.025);
  arc(x, y, s * 0.40, s * 0.30, PI - 0.3, TWO_PI - 0.3);

  // Teardrop (Horus tear mark below)
  fill(goldColor);
  noStroke();
  beginShape();
  vertex(x, y + s * 0.15);
  vertex(x - s * 0.05, y + s * 0.28);
  vertex(x + s * 0.05, y + s * 0.28);
  endShape(CLOSE);

  // Inner tear curve
  fill(tealColor);
  arc(x, y + s * 0.22, s * 0.08, s * 0.10, 0, PI);

  // Lotus leaf flourish on sides
  stroke(goldColor);
  strokeWeight(s * 0.015);
  noFill();
  arc(x - s * 0.22, y, s * 0.12, s * 0.20, PI * 0.3, PI * 1.7);
  arc(x + s * 0.22, y, s * 0.12, s * 0.20, PI * 0.3, PI * 1.7);

  pop();
}

/**
 * GREECE — Corinthian helmet in profile
 * Symbol of Greek warrior culture and classical civilization
 */
function drawEmblemGreece(x, y, size) {
  push();
  let s = size;
  let bronzeColor = color(220, 220, 230);
  let accentColor = color(80, 144, 192);
  let darkColor = color(30, 30, 40);

  // Helmet top (dome)
  fill(bronzeColor);
  stroke(accentColor);
  strokeWeight(s * 0.02);
  arc(x + s * 0.02, y - s * 0.10, s * 0.22, s * 0.20, PI, TWO_PI);

  // Face guard (front plate)
  fill(bronzeColor);
  noStroke();
  rect(x - s * 0.08, y - s * 0.06, s * 0.20, s * 0.18, s * 0.03);

  // Eye opening (diamond/slit)
  fill(darkColor);
  stroke(accentColor);
  strokeWeight(s * 0.015);
  beginShape();
  vertex(x + s * 0.02, y - s * 0.02);
  vertex(x + s * 0.05, y);
  vertex(x + s * 0.02, y + s * 0.02);
  vertex(x - s * 0.01, y);
  endShape(CLOSE);

  // Nose guard (vertical bar down center)
  fill(bronzeColor);
  noStroke();
  rect(x, y - s * 0.02, s * 0.02, s * 0.10);

  // Cheek guard curve
  noFill();
  stroke(accentColor);
  strokeWeight(s * 0.018);
  arc(x - s * 0.08, y + s * 0.02, s * 0.10, s * 0.14, 0, PI / 2);
  arc(x + s * 0.12, y + s * 0.02, s * 0.10, s * 0.14, PI / 2, PI);

  // Neck guard (flared bottom)
  fill(bronzeColor);
  stroke(accentColor);
  strokeWeight(s * 0.02);
  beginShape();
  vertex(x - s * 0.10, y + s * 0.12);
  vertex(x + s * 0.14, y + s * 0.12);
  vertex(x + s * 0.16, y + s * 0.18);
  vertex(x - s * 0.12, y + s * 0.18);
  endShape(CLOSE);

  // Crest holder slots (on top of helmet)
  stroke(accentColor);
  strokeWeight(s * 0.012);
  line(x - s * 0.05, y - s * 0.10, x - s * 0.05, y - s * 0.15);
  line(x + s * 0.09, y - s * 0.10, x + s * 0.09, y - s * 0.15);

  // Decorative patterns
  noStroke();
  fill(accentColor);
  ellipse(x, y - s * 0.02, s * 0.03, s * 0.03);
  ellipse(x + s * 0.06, y + s * 0.03, s * 0.025, s * 0.025);

  pop();
}

/**
 * PERSIA — Faravahar (winged disc with human figure)
 * Sacred Zoroastrian symbol representing the divine
 */
function drawEmblemPersia(x, y, size) {
  push();
  let s = size;
  let goldColor = color(212, 160, 48);
  let purpleColor = color(106, 42, 138);
  let darkColor = color(30, 25, 20);

  // Central disc
  fill(goldColor);
  stroke(purpleColor);
  strokeWeight(s * 0.025);
  ellipse(x, y, s * 0.22, s * 0.22);

  // Inner circle (darker)
  fill(purpleColor);
  noStroke();
  ellipse(x, y, s * 0.16, s * 0.16);

  // Human figure (silhouette inside disc)
  fill(goldColor);
  ellipse(x, y - s * 0.04, s * 0.06, s * 0.08); // head
  rect(x - s * 0.04, y + s * 0.02, s * 0.08, s * 0.08); // torso

  // Left wing (spread)
  fill(goldColor);
  stroke(purpleColor);
  strokeWeight(s * 0.02);
  beginShape();
  vertex(x - s * 0.12, y - s * 0.05);
  vertex(x - s * 0.32, y - s * 0.15);
  vertex(x - s * 0.28, y + s * 0.02);
  vertex(x - s * 0.15, y + s * 0.08);
  endShape(CLOSE);

  // Right wing (mirror)
  beginShape();
  vertex(x + s * 0.12, y - s * 0.05);
  vertex(x + s * 0.32, y - s * 0.15);
  vertex(x + s * 0.28, y + s * 0.02);
  vertex(x + s * 0.15, y + s * 0.08);
  endShape(CLOSE);

  // Wing feather details
  stroke(purpleColor);
  strokeWeight(s * 0.012);
  for (let i = 0; i < 3; i++) {
    line(x - s * (0.18 + i * 0.05), y - s * (0.08 + i * 0.02),
         x - s * (0.16 + i * 0.05), y + s * (0.03 - i * 0.01));
    line(x + s * (0.18 + i * 0.05), y - s * (0.08 + i * 0.02),
         x + s * (0.16 + i * 0.05), y + s * (0.03 - i * 0.01));
  }

  // Tail (extending downward)
  fill(goldColor);
  noStroke();
  beginShape();
  vertex(x - s * 0.06, y + s * 0.12);
  vertex(x + s * 0.06, y + s * 0.12);
  vertex(x, y + s * 0.22);
  endShape(CLOSE);

  pop();
}

/**
 * PHOENICIA — Cedar tree (symbol of trade and seafaring mastery)
 * Sacred tree representing Phoenician maritime commerce
 */
function drawEmblemPhoenicia(x, y, size) {
  push();
  let s = size;
  let brownColor = color(106, 74, 42);
  let greenColor = color(42, 106, 48);
  let lightGreen = color(80, 140, 60);
  let waterColor = color(48, 112, 176);

  // Water/waves at base
  fill(waterColor);
  stroke(waterColor);
  strokeWeight(s * 0.01);
  for (let i = -2; i <= 2; i++) {
    arc(x + i * s * 0.08, y + s * 0.20, s * 0.12, s * 0.06, 0, PI);
  }

  // Trunk
  fill(brownColor);
  stroke(brownColor);
  strokeWeight(s * 0.02);
  rect(x - s * 0.04, y + s * 0.05, s * 0.08, s * 0.18);

  // Bark texture on trunk
  stroke(color(80, 55, 30));
  strokeWeight(s * 0.01);
  for (let i = 0; i < 5; i++) {
    line(x - s * 0.02, y + s * 0.08 + i * s * 0.03,
         x + s * 0.02, y + s * 0.08 + i * s * 0.03);
  }

  // Canopy (three tiers, classic cedar shape)
  // Top tier
  fill(greenColor);
  stroke(lightGreen);
  strokeWeight(s * 0.015);
  beginShape();
  vertex(x, y - s * 0.16);
  vertex(x - s * 0.16, y - s * 0.04);
  vertex(x + s * 0.16, y - s * 0.04);
  endShape(CLOSE);

  // Middle tier
  beginShape();
  vertex(x, y - s * 0.02);
  vertex(x - s * 0.18, y + s * 0.08);
  vertex(x + s * 0.18, y + s * 0.08);
  endShape(CLOSE);

  // Bottom tier
  fill(lightGreen);
  beginShape();
  vertex(x, y + s * 0.10);
  vertex(x - s * 0.18, y + s * 0.20);
  vertex(x + s * 0.18, y + s * 0.20);
  endShape(CLOSE);

  // Overlapping highlights on canopy
  fill(lightGreen);
  noStroke();
  ellipse(x - s * 0.10, y - s * 0.10, s * 0.12, s * 0.10);
  ellipse(x + s * 0.10, y - s * 0.08, s * 0.12, s * 0.10);

  pop();
}

/**
 * GAUL — Boar (Celtic war symbol)
 * Fierce wild boar representing Celtic warrior strength
 */
function drawEmblemGaul(x, y, size) {
  push();
  let s = size;
  let brownColor = color(90, 64, 32);
  let darkBrown = color(70, 50, 25);
  let goldColor = color(200, 160, 32);
  let greenColor = color(42, 106, 48);

  // Body (ellipse)
  fill(brownColor);
  stroke(darkBrown);
  strokeWeight(s * 0.02);
  ellipse(x - s * 0.05, y, s * 0.24, s * 0.18);

  // Head
  fill(darkBrown);
  noStroke();
  ellipse(x + s * 0.10, y - s * 0.02, s * 0.14, s * 0.12);

  // Snout
  fill(brownColor);
  ellipse(x + s * 0.16, y + s * 0.02, s * 0.08, s * 0.07);

  // Nose
  fill(color(30, 25, 20));
  ellipse(x + s * 0.19, y + s * 0.02, s * 0.03, s * 0.03);

  // Tusks (curved)
  stroke(goldColor);
  strokeWeight(s * 0.025);
  noFill();
  // Left tusk
  arc(x + s * 0.12, y + s * 0.06, s * 0.10, s * 0.08, -PI / 2, 0);
  // Right tusk
  arc(x + s * 0.12, y - s * 0.02, s * 0.10, s * 0.08, 0, PI / 2);

  // Eye
  fill(color(30, 25, 20));
  ellipse(x + s * 0.08, y - s * 0.04, s * 0.04, s * 0.04);
  fill(goldColor);
  ellipse(x + s * 0.09, y - s * 0.04, s * 0.015, s * 0.015);

  // Mane/bristles (top of head)
  stroke(greenColor);
  strokeWeight(s * 0.018);
  for (let i = -3; i <= 3; i++) {
    line(x + s * (0.05 + i * 0.03), y - s * 0.10,
         x + s * (0.07 + i * 0.03), y - s * 0.16);
  }

  // Back bristles
  stroke(greenColor);
  strokeWeight(s * 0.015);
  for (let i = -2; i <= 2; i++) {
    line(x + s * (-0.08 + i * 0.05), y - s * 0.09,
         x + s * (-0.06 + i * 0.05), y - s * 0.15);
  }

  // Legs (four small cylinders)
  fill(darkBrown);
  noStroke();
  rect(x - s * 0.15, y + s * 0.12, s * 0.05, s * 0.12);
  rect(x - s * 0.05, y + s * 0.12, s * 0.05, s * 0.12);
  rect(x + s * 0.02, y + s * 0.12, s * 0.05, s * 0.12);
  rect(x + s * 0.12, y + s * 0.12, s * 0.05, s * 0.12);

  // Tail
  stroke(greenColor);
  strokeWeight(s * 0.012);
  noFill();
  arc(x - s * 0.15, y + s * 0.05, s * 0.10, s * 0.10, 0, PI);

  pop();
}

/**
 * SEA PEOPLE — Kraken/Octopus tentacles (dark ominous symbol)
 * Chaotic sea power representing the mysterious Sea People raiders
 */
function drawEmblemSeaPeople(x, y, size) {
  push();
  let s = size;
  let darkColor = color(35, 30, 45);
  let orangeColor = color(140, 45, 30);
  let accentColor = color(180, 100, 80);

  // Central body (circles nested)
  fill(darkColor);
  stroke(orangeColor);
  strokeWeight(s * 0.025);
  ellipse(x, y, s * 0.16, s * 0.16);

  fill(orangeColor);
  noStroke();
  ellipse(x, y, s * 0.10, s * 0.10);

  // Eye (white with red pupil)
  fill(240, 240, 240);
  ellipse(x - s * 0.03, y - s * 0.03, s * 0.05, s * 0.05);
  fill(orangeColor);
  ellipse(x - s * 0.03, y - s * 0.03, s * 0.02, s * 0.02);

  // Eight tentacles radiating outward
  stroke(darkColor);
  strokeWeight(s * 0.018);
  let tentacleOffsets = [];
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI * i / 8) - PI / 2;
    let tipX = x + cos(angle) * s * 0.28;
    let tipY = y + sin(angle) * s * 0.28;

    // Main tentacle curve
    noFill();
    beginShape();
    vertex(x + cos(angle) * s * 0.10, y + sin(angle) * s * 0.10);
    // Control point for curve
    let cx = x + cos(angle) * s * 0.15;
    let cy = y + sin(angle) * s * 0.15;
    vertex(cx, cy);
    vertex(tipX, tipY);
    endShape();

    // Suction cups along tentacle
    fill(orangeColor);
    noStroke();
    for (let j = 1; j <= 4; j++) {
      let cupX = x + cos(angle) * s * (0.10 + j * 0.04);
      let cupY = y + sin(angle) * s * (0.10 + j * 0.04);
      ellipse(cupX, cupY, s * 0.03, s * 0.03);
    }
  }

  // Wavy water/dripping effect at bottom
  stroke(darkColor);
  strokeWeight(s * 0.012);
  noFill();
  arc(x - s * 0.12, y + s * 0.20, s * 0.10, s * 0.08, 0, PI);
  arc(x, y + s * 0.22, s * 0.10, s * 0.08, 0, PI);
  arc(x + s * 0.12, y + s * 0.20, s * 0.10, s * 0.08, 0, PI);

  pop();
}
